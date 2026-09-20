import { runCode, type Language, type RunResult } from '@/lib/runner';
import { normaliseOutput } from '@/lib/content/validate';
import { ALL_FAMILIES, applySite, findSites, type BugFamily, type MutationSite } from './mutators';

/**
 * The validity loop. This is what makes the Debugging Lab trustworthy.
 *
 * Two guarantees fall out of it, and neither is available from hand-authored
 * exercises without a lot of care:
 *   1. every generated exercise is GENUINELY BROKEN  (it fails at least one test)
 *   2. every generated exercise is GENUINELY FIXABLE (the reference passes, and
 *      we know the exact one-line edit that fixes it)
 *
 * And for free: the hint ladder and the minimal-diff feedback, with no authoring.
 */

export interface TestCase {
  name: string;
  stdin: string;
  expectedStdout: string;
  hidden?: boolean;
  edgeCase?: boolean;
}

export interface TestOutcome {
  name: string;
  passed: boolean;
  expected: string;
  actual: string;
  timedOut: boolean;
  compileError?: string;
}

export async function runTests(
  language: Language,
  source: string,
  tests: TestCase[],
): Promise<{ outcomes: TestOutcome[]; allPassed: boolean; compileError?: string }> {
  const outcomes: TestOutcome[] = [];
  let compileError: string | undefined;

  for (const test of tests) {
    const result: RunResult = await runCode({ language, source, stdin: test.stdin });
    if (result.compileError) {
      compileError = result.compileError;
      outcomes.push({
        name: test.name, passed: false, expected: test.expectedStdout,
        actual: '', timedOut: false, compileError: result.compileError,
      });
      // A compile error fails every test identically; no point running the rest.
      for (const rest of tests.slice(outcomes.length)) {
        outcomes.push({
          name: rest.name, passed: false, expected: rest.expectedStdout,
          actual: '', timedOut: false, compileError: result.compileError,
        });
      }
      break;
    }
    outcomes.push({
      name: test.name,
      passed: !result.timedOut && normaliseOutput(result.stdout) === normaliseOutput(test.expectedStdout),
      expected: test.expectedStdout,
      actual: result.stdout,
      timedOut: result.timedOut,
    });
  }

  return { outcomes, allPassed: outcomes.every((o) => o.passed), compileError };
}

export interface InjectionResult {
  mutated: string;
  site: MutationSite;
  /** Tests the broken version fails — used to write the hidden-test set. */
  failingTests: string[];
}

export interface InjectOptions {
  language: Language;
  /** A known-correct program that passes every test. */
  source: string;
  tests: TestCase[];
  families?: BugFamily[];
  /** Sites tried per family before giving up on it. */
  maxSitesPerFamily?: number;
  /** Deterministic ordering when set, so a bad exercise can be reproduced. */
  seed?: number;
}

/** Deterministic shuffle, so an injection run can be reproduced from its seed. */
function shuffle<T>(items: T[], seed: number): T[] {
  let state = seed || 1;
  const rand = () => {
    state = (state * 1_664_525 + 1_013_904_223) % 4_294_967_296;
    return state / 4_294_967_296;
  };
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/**
 * Produces one broken variant per requested family, or fewer when a family has
 * no site in this source that actually breaks it.
 */
export async function inject(options: InjectOptions): Promise<InjectionResult[]> {
  const {
    language, source, tests,
    families = ALL_FAMILIES,
    maxSitesPerFamily = 10,
    seed = 42,
  } = options;

  // The reference must pass everything, or nothing downstream means anything.
  const baseline = await runTests(language, source, tests);
  if (!baseline.allPassed) {
    throw new Error(
      `The reference solution does not pass its own tests, so no exercise built from it could be trusted. ` +
        (baseline.compileError
          ? `Compile error: ${baseline.compileError}`
          : `Failing: ${baseline.outcomes.filter((o) => !o.passed).map((o) => o.name).join(', ')}`),
    );
  }

  const results: InjectionResult[] = [];
  // Two families can land on the same site and produce the identical program
  // (off-by-one and boundary-overflow both rewrite `i < n`). Solving one would
  // give the other away, so the loop also guarantees distinctness.
  const producedPrograms = new Set<string>();

  for (const family of families) {
    const sites = shuffle(findSites(source, family, language), seed + family.length);
    let produced = false;

    for (const site of sites.slice(0, maxSitesPerFamily)) {
      const mutated = applySite(source, site);
      if (mutated === source) continue;
      if (producedPrograms.has(mutated)) continue;

      const outcome = await runTests(language, mutated, tests);

      // A syntax-preserving family that stops compiling is the wrong bug: the
      // learner would see a compiler message, not a logic defect to reason about.
      if (outcome.compileError) continue;

      // Still passes everything? Then it is not actually broken. Reject it —
      // this is the check that hand-authored exercise sets usually lack.
      if (outcome.allPassed) continue;

      producedPrograms.add(mutated);
      results.push({
        mutated,
        site,
        failingTests: outcome.outcomes.filter((o) => !o.passed).map((o) => o.name),
      });
      produced = true;
      break;
    }

    if (!produced) {
      // Not an error: plenty of sources simply cannot host a given bug family.
      continue;
    }
  }

  return results;
}
