# 06 — Data Model

Two layers: **content** (git-tracked JSON, the question banks) and **state** (SQLite, your
attempts and progress). Content is regenerable; state is precious.

---

## Part A — Content schemas

All content is validated by Zod at load time. A bank with **any** invalid item fails loudly and
is not served. See [`content/AUTHORING-GUIDE.md`](content/AUTHORING-GUIDE.md) for the quality bar.

### Common fields (every content item)

```ts
const Base = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),        // stable, unique, human-readable
  stage: z.enum(['english','ai-literacy','technical','debugging','aic','cognitive','behavioural']),
  topic: z.string(),                            // must exist in the topic registry
  subtopic: z.string().optional(),
  difficulty: z.enum(['easy','medium','hard']),
  priority: z.enum(['P0','P1','P2']),
  tags: z.array(z.string()).default([]),
  source: z.enum(['authored','generated','adapted']),
  targetSeconds: z.number().int().positive(),   // per-item time budget
});
```

### A1 — MCQ item

```ts
const MCQItem = Base.extend({
  kind: z.literal('mcq'),
  stem: z.string().min(10),                     // markdown; may contain a fenced code block
  code: z.object({ language: z.string(), source: z.string() }).optional(),
  options: z.array(z.object({
    id: z.enum(['a','b','c','d']),
    text: z.string().min(1),
  })).length(4),
  answer: z.enum(['a','b','c','d']),
  explanation: z.string().min(40),              // WHY, not just "the answer is B"
  distractorRationale: z.record(z.string()).optional(),  // why each wrong option is tempting
});
```

**Worked exemplar — AI Literacy**

```json
{
  "id": "ail-hallucination-001",
  "kind": "mcq",
  "stage": "ai-literacy",
  "topic": "llm-limitations",
  "subtopic": "hallucination",
  "difficulty": "easy",
  "priority": "P0",
  "tags": ["hallucination", "validation"],
  "source": "authored",
  "targetSeconds": 45,
  "stem": "A developer asks an LLM for research papers on a niche topic. The model returns three citations with plausible titles, authors and years, but none of the papers exist. Which limitation does this demonstrate?",
  "options": [
    { "id": "a", "text": "Context window overflow" },
    { "id": "b", "text": "Hallucination" },
    { "id": "c", "text": "Knowledge cutoff" },
    { "id": "d", "text": "Prompt injection" }
  ],
  "answer": "b",
  "explanation": "Hallucination is when a model produces output that is fluent and plausible but factually unsupported or fabricated. The citations are well-formed yet non-existent, which is the defining signature. The mitigation is always to validate generated factual claims against a real source before relying on them.",
  "distractorRationale": {
    "a": "Context window overflow would truncate or lose earlier input, not invent new facts.",
    "c": "Knowledge cutoff explains not knowing RECENT things; here the model invented things that never existed at any time.",
    "d": "Prompt injection requires untrusted input carrying instructions; there is none here."
  }
}
```

### A2 — Trace item (pseudocode) ⭐ the important one

```ts
const TraceItem = Base.extend({
  kind: z.literal('trace'),
  language: z.enum(['pseudocode','c','cpp','java']),
  source: z.string(),                           // the code, with 1-based line numbers implied
  question: z.string(),                         // "What is the output?"
  answerMode: z.enum(['exact','mcq']),
  answer: z.string(),                           // exact expected output
  options: z.array(z.object({ id: z.string(), text: z.string() })).optional(),
  explanation: z.string().min(40),
  executionTrace: z.array(z.object({            // ← what makes this module worth building
    step: z.number().int(),
    line: z.number().int(),
    vars: z.record(z.union([z.string(), z.number(), z.array(z.any())])),
    output: z.string().optional(),
    note: z.string().optional(),
  })).min(1),
});
```

**Worked exemplar**

```json
{
  "id": "trace-bitwise-003",
  "kind": "trace",
  "stage": "technical",
  "topic": "pseudocode",
  "subtopic": "bitwise",
  "difficulty": "medium",
  "priority": "P0",
  "tags": ["bitwise", "loops", "brian-kernighan"],
  "source": "authored",
  "targetSeconds": 90,
  "language": "pseudocode",
  "source_code_note": "stored in `source`",
  "question": "What is printed?",
  "answerMode": "exact",
  "answer": "3",
  "explanation": "The loop clears the lowest set bit each iteration (x & (x-1)), so it runs once per set bit. 13 is 1101 in binary, which has 3 set bits, so count ends at 3.",
  "executionTrace": [
    { "step": 1, "line": 1, "vars": { "x": 13, "count": 0 }, "note": "13 = 1101b" },
    { "step": 2, "line": 3, "vars": { "x": 12, "count": 1 }, "note": "13 & 12 = 1100b" },
    { "step": 3, "line": 3, "vars": { "x": 8,  "count": 2 }, "note": "12 & 11 = 1000b" },
    { "step": 4, "line": 3, "vars": { "x": 0,  "count": 3 }, "note": "8 & 7 = 0000b" },
    { "step": 5, "line": 5, "vars": { "x": 0,  "count": 3 }, "output": "3", "note": "loop exits, x = 0" }
  ]
}
```

with `source`:
```
1  Integer x = 13, count = 0
2  While x != 0
3      x = x & (x - 1)
4      count = count + 1
5  End While
6  Print count
```

### A3 — Debug item

```ts
const DebugItem = Base.extend({
  kind: z.literal('debug'),
  language: z.enum(['c','cpp','java']),
  problem: z.string().min(40),                  // the spec
  brokenSource: z.string(),
  referenceSource: z.string(),                  // the correct version
  bugs: z.array(z.object({
    family: z.enum(['off-by-one','inverted-condition','wrong-variable','missing-return',
                    'bad-init','boundary-overflow','assign-in-condition','wrong-operator',
                    'syntax','runtime']),
    line: z.number().int(),
    description: z.string(),
  })).min(1),
  tests: z.array(z.object({
    name: z.string(),
    stdin: z.string(),
    expectedStdout: z.string(),
    hidden: z.boolean().default(false),         // hidden tests reveal only after submission
  })).min(3),                                   // must include ≥1 edge case
  hints: z.array(z.string()).length(4),         // family → function → line range → diff
});
```

**Test requirement:** every debug item needs ≥3 tests and at least one of
{empty input, single element, boundary value}. The validator enforces this.

### A4 — AI-assisted coding problem

```ts
const AICProblem = Base.extend({
  kind: z.literal('aic'),
  title: z.string(),
  problem: z.string().min(40),
  language: z.enum(['c','cpp','java','python']),
  rubric: z.object({
    frame: z.array(z.string()),      // required elements, e.g. ["input type","output type","duplicates handled","empty array"]
    plan: z.array(z.string()),       // e.g. ["single pass","O(n) time","O(1) space"]
    prompt: z.array(z.string()),     // e.g. ["names language","states distinct","states edge cases","asks for complexity"]
    review: z.array(z.string()),     // the issues a good review would catch
  }),
  referenceSolution: z.string(),
  modelPromptExample: z.string(),    // the exemplar prompt, shown after you submit
  tests: z.array(z.object({ stdin: z.string(), expectedStdout: z.string() })).min(3),
});
```

### A5 — Communication items

```ts
const EssayPrompt = Base.extend({
  kind: z.literal('essay'),
  prompt: z.string(),
  minutes: z.number().int().default(25),
  targetWords: z.tuple([z.number(), z.number()]).default([250, 350]),
  rubric: z.object({
    taskResponse: z.string(), structure: z.string(),
    grammar: z.string(), vocabulary: z.string(), mechanics: z.string(),
  }),
  modelAnswer: z.string().optional(),
});

const SpeakPrompt = Base.extend({
  kind: z.literal('speak'),
  prompt: z.string(),
  thinkSeconds: z.number().int().default(45),
  speakSeconds: z.number().int().default(90),
  expectedPoints: z.array(z.string()),          // content coverage check
});

const ReadPassage = Base.extend({
  kind: z.literal('read'),
  passage: z.string().min(300),
  questions: z.array(MCQItem.omit({ stage:true, topic:true, priority:true, targetSeconds:true, id:true })
                     .extend({ id: z.string() })),
});

const ListenItem = Base.extend({
  kind: z.literal('listen'),
  transcript: z.string(),                       // rendered to audio via SpeechSynthesis
  questions: z.array(z.any()),
  playbacksAllowed: z.number().int().default(1),
});
```

### A6 — Behavioural (ADEPT-style consistency)

```ts
const BehaviouralItem = Base.extend({
  kind: z.literal('behavioural'),
  trait: z.enum(['achievement','cooperativeness','adaptability','conscientiousness',
                 'stress-tolerance','initiative','attention-to-detail','teamwork','learning-agility']),
  statement: z.string(),
  scale: z.literal('likert-5'),
  reversed: z.boolean().default(false),          // reverse-keyed items detect inconsistency
});
```

No right answers. The app pairs forward and reverse items on the same trait and reports where
your responses contradict each other.

### A7 — Cognitive game config

```ts
const GameConfig = z.object({
  game: z.enum(['grid','switch','digit','motion']),
  levels: z.array(z.object({
    level: z.number().int(),
    params: z.record(z.any()),   // e.g. grid: {size:4, dots:3, interferenceMs:3000}
    seconds: z.number().int(),
  })),
});
```

Games are **procedurally generated** from level params, not authored — infinite reps, no bank.

---

## Part B — SQLite schema (Drizzle)

```ts
// Immutable content mirror (seeded from content/*.json, re-seedable)
export const items = sqliteTable('items', {
  id: text('id').primaryKey(),
  kind: text('kind').notNull(),
  stage: text('stage').notNull(),
  topic: text('topic').notNull(),
  subtopic: text('subtopic'),
  difficulty: text('difficulty').notNull(),
  priority: text('priority').notNull(),
  targetSeconds: integer('target_seconds').notNull(),
  payload: text('payload', { mode: 'json' }).notNull(),   // the full validated item
  contentHash: text('content_hash').notNull(),            // detects edits on re-seed
});

// A practice or mock session
export const sessions = sqliteTable('sessions', {
  id: text('id').primaryKey(),
  mode: text('mode').notNull(),          // 'drill' | 'mock' | 'review' | 'game' | 'comm'
  stage: text('stage'),
  profile: text('profile'),              // exam profile id, for mocks
  config: text('config', { mode: 'json' }).notNull(),
  startedAt: integer('started_at', { mode: 'timestamp' }).notNull(),
  finishedAt: integer('finished_at', { mode: 'timestamp' }),
  score: real('score'),
  maxScore: real('max_score'),
  meta: text('meta', { mode: 'json' }),
});

// One row per question answered
export const attempts = sqliteTable('attempts', {
  id: text('id').primaryKey(),
  sessionId: text('session_id').notNull().references(() => sessions.id),
  itemId: text('item_id').notNull(),
  stage: text('stage').notNull(),
  topic: text('topic').notNull(),
  response: text('response', { mode: 'json' }),
  correct: integer('correct', { mode: 'boolean' }),
  partialScore: real('partial_score'),     // for AIC / essay / debug
  confidence: text('confidence'),          // 'high' | 'low' | null
  timeMs: integer('time_ms').notNull(),
  hintsUsed: integer('hints_used').default(0),
  flagged: integer('flagged', { mode: 'boolean' }).default(false),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});

// Spaced repetition state (SM-2)
export const reviewCards = sqliteTable('review_cards', {
  itemId: text('item_id').primaryKey(),
  easeFactor: real('ease_factor').notNull().default(2.5),
  intervalDays: integer('interval_days').notNull().default(0),
  repetitions: integer('repetitions').notNull().default(0),
  dueAt: integer('due_at', { mode: 'timestamp' }).notNull(),
  lapses: integer('lapses').notNull().default(0),
});

// Debugging / AIC submissions, kept for interview prep
export const submissions = sqliteTable('submissions', {
  id: text('id').primaryKey(),
  sessionId: text('session_id').notNull(),
  itemId: text('item_id').notNull(),
  kind: text('kind').notNull(),            // 'debug' | 'aic'
  artifacts: text('artifacts', { mode: 'json' }).notNull(),  // code, prompts, reviews, reasoning
  score: real('score'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});

// Game results
export const gameRuns = sqliteTable('game_runs', {
  id: text('id').primaryKey(),
  game: text('game').notNull(),
  maxLevel: integer('max_level').notNull(),
  score: real('score').notNull(),
  durationMs: integer('duration_ms').notNull(),
  levelTimings: text('level_timings', { mode: 'json' }).notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});

// Derived, recomputed nightly / on demand
export const readinessSnapshots = sqliteTable('readiness_snapshots', {
  id: text('id').primaryKey(),
  stage: text('stage').notNull(),
  readiness: real('readiness').notNull(),
  accuracy: real('accuracy').notNull(),
  speedFactor: real('speed_factor').notNull(),
  coverage: real('coverage').notNull(),
  consistency: real('consistency').notNull(),
  computedAt: integer('computed_at', { mode: 'timestamp' }).notNull(),
});

// LLM cost metering
export const llmCalls = sqliteTable('llm_calls', {
  id: text('id').primaryKey(),
  purpose: text('purpose').notNull(),
  model: text('model').notNull(),
  inputTokens: integer('input_tokens').notNull(),
  outputTokens: integer('output_tokens').notNull(),
  costUsd: real('cost_usd').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});
```

### Indexes that matter
```sql
CREATE INDEX idx_attempts_stage_created ON attempts(stage, created_at DESC);
CREATE INDEX idx_attempts_topic_created ON attempts(topic, created_at DESC);
CREATE INDEX idx_attempts_item          ON attempts(item_id);
CREATE INDEX idx_review_due             ON review_cards(due_at);
CREATE INDEX idx_items_stage_topic_diff ON items(stage, topic, difficulty);
```

### Re-seeding rule
`contentHash` lets `seed.ts` be idempotent: unchanged items are skipped, edited items are
updated in place (attempt history is preserved because `attempts.item_id` is a plain text
reference, not a cascading FK). Deleting a content item does **not** delete its attempts —
history is never destroyed by a content change.

---

## Topic registry

A single `content/topics.json` maps every legal `topic` / `subtopic` string to its stage and
priority, generated from [`02-SYLLABUS-MAP.md`](02-SYLLABUS-MAP.md). The content validator
rejects any item whose topic isn't in the registry — this is what stops the bank drifting into
a pile of unclassifiable questions, which is the usual failure mode of self-built question banks.
