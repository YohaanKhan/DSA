/**
 * Content generation CLI.
 *
 *   npx tsx scripts/generate-content.ts --stage ai-literacy --topic llm-limitations \
 *       --subtopic hallucination --count 12 --difficulty medium
 *
 * Or work through a whole stage using the coverage targets in the seed plan:
 *   npx tsx scripts/generate-content.ts --plan ai-literacy
 *
 * Nothing the model returns is trusted. Every item is schema-parsed, run through
 * the V1-V15 rules and answer-key-rebalanced. Rejects land in content/.rejected/
 * with the rule that failed, so a systematically bad generator is visible.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import Database from 'better-sqlite3';
import { nanoid } from 'nanoid';
import { generateBatch } from '../src/lib/content/generate';
import { loadContent } from '../src/lib/content/loader';
import { TOPICS } from '../src/lib/content/topics';
import { LlmUnavailableError, hasApiKey, type Usage } from '../src/lib/llm/client';
import { dbFileName } from '../src/lib/db/path';

type Difficulty = 'easy' | 'medium' | 'hard';

/** 30% easy / 50% medium / 20% hard, per the seed plan. */
const MIX: Difficulty[] = [
  'easy', 'easy', 'easy',
  'medium', 'medium', 'medium', 'medium', 'medium',
  'hard', 'hard',
];

const TARGET_SECONDS: Record<string, number> = {
  'ai-literacy': 50,
  english: 45,
  technical: 75,
};

function arg(name: string, fallback?: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : fallback;
}

function recordUsage(usage: Usage) {
  const dbPath = join(process.cwd(), 'data', dbFileName());
  if (!existsSync(dbPath)) return; // migrations not run yet; accounting is best-effort
  const sqlite = new Database(dbPath);
  try {
    sqlite
      .prepare(
        'insert into llm_calls (id, purpose, model, input_tokens, output_tokens, cost_usd, created_at) values (?,?,?,?,?,?,?)',
      )
      .run(nanoid(), usage.purpose, usage.model, usage.inputTokens, usage.outputTokens, usage.costUsd, Math.floor(Date.now() / 1000));
  } finally {
    sqlite.close();
  }
}

async function main() {
  if (!hasApiKey()) {
    console.error(
      'ANTHROPIC_API_KEY is not set, so nothing can be generated.\n\n' +
        'The app still works without it. To fill banks by hand instead, see\n' +
        '  plan/content/AUTHORING-GUIDE.md  (the quality bar)\n' +
        '  plan/content/SEED-PLAN.md        (what to write, in what order)\n',
    );
    process.exit(1);
  }

  const stage = arg('stage');
  const topic = arg('topic');
  const subtopic = arg('subtopic');
  const count = Number(arg('count', '10'));
  const kind = (arg('kind', stage === 'technical' && topic === 'pseudocode' ? 'trace' : 'mcq')) as 'mcq' | 'trace';
  const difficulty = arg('difficulty') as Difficulty | undefined;
  const dryRun = process.argv.includes('--dry-run');

  if (!stage || !topic || !subtopic) {
    console.error('Usage: --stage <s> --topic <t> --subtopic <st> [--count N] [--difficulty easy|medium|hard] [--kind mcq|trace] [--dry-run]');
    process.exit(1);
  }

  const def = TOPICS[stage]?.[topic];
  if (!def) { console.error(`Unknown topic ${stage}/${topic}. See content/topics.json.`); process.exit(1); }
  if (!def.subtopics.includes(subtopic)) {
    console.error(`Unknown subtopic "${subtopic}". Valid: ${def.subtopics.join(', ')}`);
    process.exit(1);
  }

  // Existing stems in this subtopic become the "do not repeat" list. This is
  // what stops a bank filling with twelve rephrasings of one question.
  const existing = loadContent();
  const avoidStems = existing.items
    .filter((i) => i.stage === stage && i.topic === topic)
    .map((i) => (i.kind === 'mcq' ? i.stem : i.kind === 'trace' ? i.question + ' ' + i.sourceCode : ''))
    .filter(Boolean);

  let spent = 0;
  const onUsage = (u: Usage) => {
    spent += u.costUsd;
    recordUsage(u);
  };

  console.log(`Generating ${count} ${kind} item(s) for ${stage}/${topic}/${subtopic}…`);
  if (avoidStems.length) console.log(`  avoiding ${avoidStems.length} existing stem(s) in this topic`);

  const accepted = [];
  const rejected = [];

  // Small batches: large ones degrade and repeat themselves.
  const BATCH = 6;
  for (let done = 0; done < count; done += BATCH) {
    const batchSize = Math.min(BATCH, count - done);
    const diff = difficulty ?? MIX[(done / BATCH) % MIX.length | 0];
    try {
      const result = await generateBatch({
        kind,
        stage,
        topic,
        subtopic,
        subtopicBrief: `one of the ${def.subtopics.length} subtopics of ${topic}`,
        difficulty: diff,
        priority: def.priority,
        count: batchSize,
        targetSeconds: TARGET_SECONDS[stage] ?? 60,
        idPrefix: `${stage.slice(0, 3)}-${subtopic}-${Date.now().toString(36).slice(-4)}`,
        avoidStems: [...avoidStems, ...accepted.map((a) => ('stem' in a ? String(a.stem) : ''))].filter(Boolean),
        spentTodayUsd: spent,
        onUsage,
      });
      accepted.push(...result.accepted);
      rejected.push(...result.rejected);
      console.log(`  batch ${done / BATCH + 1}: ${result.accepted.length} accepted, ${result.rejected.length} rejected (${diff})`);
    } catch (err) {
      if (err instanceof LlmUnavailableError) { console.error(`\n${err.message}`); break; }
      throw err;
    }
  }

  if (rejected.length) {
    const rejectPath = join(process.cwd(), 'content', '.rejected', `${stage}-${subtopic}-${Date.now()}.json`);
    mkdirSync(dirname(rejectPath), { recursive: true });
    writeFileSync(rejectPath, JSON.stringify(rejected, null, 2));
    console.log(`\n${rejected.length} rejected item(s) written to ${rejectPath}`);
    const rules = new Set(rejected.flatMap((r) => r.violations.map((v) => v.rule)));
    console.log(`  rules violated: ${[...rules].sort().join(', ')}`);
  }

  console.log(`\nAccepted ${accepted.length} item(s). Estimated cost: $${spent.toFixed(3)}`);

  if (dryRun) { console.log('Dry run — nothing written.'); return; }
  if (accepted.length === 0) { console.log('Nothing to write.'); return; }

  const bankPath = join(
    process.cwd(),
    'content',
    kind === 'trace' ? 'trace' : 'mcq',
    kind === 'trace' ? 'pseudocode.json' : `${stage === 'technical' ? `technical-${topic}` : stage}.json`,
  );
  mkdirSync(dirname(bankPath), { recursive: true });
  const current = existsSync(bankPath) ? JSON.parse(readFileSync(bankPath, 'utf8')) : [];
  writeFileSync(bankPath, JSON.stringify([...current, ...accepted], null, 2) + '\n');
  console.log(`Appended to ${bankPath}. Now run: npm run content:validate && npm run db:seed`);
}

main().catch((err) => { console.error(err); process.exit(1); });
