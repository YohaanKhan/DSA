/**
 * Compiles and runs every AIC problem's reference solution and its fallback
 * assistant output. This is the V12 check that the pure validator cannot do,
 * because it needs a compiler.
 *
 * Two guarantees:
 *   - the reference solution passes every test (or the problem is unsolvable)
 *   - the fallback output FAILS at least one test (or the offline Review step
 *     has nothing real to catch, which would teach the wrong lesson)
 */
import { loadContent } from '../src/lib/content/loader';
import { runTests, type TestCase } from '../src/lib/mutation/inject';
import type { Language } from '../src/lib/runner/types';

/** Pulls the code out of a fenced block, or returns the text unchanged. */
function extractCode(markdown: string): string {
  const fence = /```[a-zA-Z]*\n([\s\S]*?)```/.exec(markdown);
  return fence ? fence[1] : markdown;
}

async function main() {
  const { items } = loadContent();
  const problems = items.filter((i) => i.kind === 'aic');

  if (problems.length === 0) {
    console.log('No AIC problems found.');
    return;
  }

  let failures = 0;

  for (const problem of problems) {
    if (problem.kind !== 'aic') continue;
    const tests: TestCase[] = problem.tests.map((t, i) => ({
      name: `test-${i + 1}`,
      stdin: t.stdin,
      expectedStdout: t.expectedStdout,
    }));

    process.stdout.write(`${problem.id} (${problem.language}) … `);

    const reference = await runTests(problem.language as Language, problem.referenceSolution, tests);
    if (!reference.allPassed) {
      failures++;
      console.log('REFERENCE FAILS');
      console.log(
        reference.compileError
          ? `    compile: ${reference.compileError.split('\n')[0]}`
          : `    failing: ${reference.outcomes.filter((o) => !o.passed).map((o) => `${o.name} expected ${JSON.stringify(o.expected)} got ${JSON.stringify(o.actual)}`).join('; ')}`,
      );
      continue;
    }

    const fallback = await runTests(
      problem.language as Language,
      extractCode(problem.fallbackAssistantOutput),
      tests,
    );
    if (fallback.compileError) {
      failures++;
      console.log('FALLBACK DOES NOT COMPILE');
      console.log(`    ${fallback.compileError.split('\n')[0]}`);
      continue;
    }
    if (fallback.allPassed) {
      failures++;
      console.log('FALLBACK PASSES EVERYTHING — the offline review step has nothing to catch');
      continue;
    }

    const caught = fallback.outcomes.filter((o) => !o.passed).map((o) => o.name);
    console.log(`reference passes ${tests.length}/${tests.length}; fallback fails ${caught.join(', ')}`);
  }

  console.log(failures ? `\n${failures} problem(s) INVALID` : '\nAll AIC problems verified.');
  if (failures) process.exitCode = 1;
}

main().catch((err) => { console.error(err); process.exit(1); });
