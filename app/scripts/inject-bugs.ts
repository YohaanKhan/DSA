/**
 * Turns known-correct solutions into debugging exercises.
 *
 *   npx tsx scripts/inject-bugs.ts                       # every solution
 *   npx tsx scripts/inject-bugs.ts --file second-largest # just one
 *
 * Costs nothing: injection is mechanical, not generated. Every exercise it
 * writes is provably broken (fails a test) and provably fixable (the reference
 * passes, and the exact edit is recorded).
 */
import { readFileSync, readdirSync, writeFileSync, mkdirSync } from 'node:fs';
import { basename, join } from 'node:path';
import { inject, runTests, type TestCase } from '../src/lib/mutation/inject';
import type { Language } from '../src/lib/runner/types';
import type { BugFamily } from '../src/lib/mutation/mutators';

const SOLUTIONS = join(process.cwd(), 'content', 'solutions');
const OUT = join(process.cwd(), 'content', 'debug', 'injected.json');

const EXT: Record<string, Language> = { '.c': 'c', '.cpp': 'cpp', '.java': 'java' };

interface SolutionSpec {
  problem: string;
  language: Language;
  topic: string;
  tests: TestCase[];
}

/** The hint ladder, derived from the injection rather than authored. */
function hintsFor(family: BugFamily, line: number, description: string, diff: string): string[] {
  return [
    `The bug family is: ${family.replace(/-/g, ' ')}.`,
    `It is in the code around line ${Math.max(1, line - 2)}–${line + 2}.`,
    `It is on line ${line}: ${description}.`,
    `The fix is:\n${diff}`,
  ];
}

function diffLine(reference: string, broken: string, line: number): string {
  const ref = reference.split('\n')[line - 1] ?? '';
  const bad = broken.split('\n')[line - 1] ?? '';
  return `- ${bad.trim()}\n+ ${ref.trim()}`;
}

async function main() {
  const only = process.argv.includes('--file')
    ? process.argv[process.argv.indexOf('--file') + 1]
    : null;

  const files = readdirSync(SOLUTIONS).filter((f) => Object.keys(EXT).some((e) => f.endsWith(e)));
  const items: unknown[] = [];
  let skipped = 0;

  for (const file of files) {
    const stem = basename(file).replace(/\.[^.]+$/, '');
    if (only && stem !== only) continue;

    const ext = file.slice(file.lastIndexOf('.'));
    const language = EXT[ext];
    const source = readFileSync(join(SOLUTIONS, file), 'utf8');

    let spec: SolutionSpec;
    try {
      spec = JSON.parse(readFileSync(join(SOLUTIONS, `${stem}.tests.json`), 'utf8'));
    } catch {
      console.warn(`  ${stem}: no ${stem}.tests.json — skipped`);
      skipped++;
      continue;
    }

    process.stdout.write(`${stem} (${language}) … `);

    const baseline = await runTests(language, source, spec.tests);
    if (!baseline.allPassed) {
      console.log('REFERENCE FAILS ITS OWN TESTS — skipped');
      console.log(
        baseline.compileError
          ? `    ${baseline.compileError.split('\n')[0]}`
          : `    failing: ${baseline.outcomes.filter((o) => !o.passed).map((o) => o.name).join(', ')}`,
      );
      skipped++;
      continue;
    }

    const injected = await inject({ language, source, tests: spec.tests });
    console.log(`${injected.length} exercise(s)`);

    for (const result of injected) {
      const { site, mutated } = result;
      items.push({
        id: `dbg-${stem}-${site.family}`,
        kind: 'debug',
        stage: 'debugging',
        topic: spec.topic,
        subtopic: site.family === 'boundary-overflow' ? 'boundary-overflow' : site.family,
        difficulty: site.family === 'bad-init' || site.family === 'wrong-variable' ? 'hard' : 'medium',
        priority: 'P0',
        tags: [site.family, language],
        source: 'generated',
        targetSeconds: 1200,
        language,
        problem: spec.problem,
        brokenSource: mutated,
        referenceSource: source,
        bugs: [{ family: site.family, line: site.line, description: site.description }],
        tests: spec.tests,
        hints: hintsFor(site.family, site.line, site.description, diffLine(source, mutated, site.line)),
      });
    }
  }

  if (items.length === 0) {
    console.log(`\nNothing written (${skipped} skipped).`);
    return;
  }

  mkdirSync(join(process.cwd(), 'content', 'debug'), { recursive: true });
  writeFileSync(OUT, JSON.stringify(items, null, 2) + '\n');
  console.log(`\nWrote ${items.length} exercise(s) to ${OUT}`);
  console.log('Next: npm run content:validate && npm run db:seed');
}

main().catch((err) => { console.error(err); process.exit(1); });
