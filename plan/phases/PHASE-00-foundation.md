# Phase 00 — Foundation

| | |
| --- | --- |
| **Goal** | A running Next.js app with a database, content pipeline, shared timer, and a dashboard shell. Nothing practises yet — but every later phase plugs into a socket that already exists. |
| **Time budget** | **2.5 hours** |
| **Prerequisites** | Node 20+, optionally `gcc`/`g++`/`javac` |
| **Unlocks** | Every other phase |
| **Skippable?** | No |

---

## Why this phase exists

The three things that kill projects like this are: (1) a timer that drifts or double-fires,
(2) content that silently contains wrong answers, (3) a schema you outgrow in phase 3. This
phase solves all three up front, cheaply, before there's anything to migrate.

---

## Step 0.1 — Scaffold (20 min)

```bash
cd /path/to/DSA
npx create-next-app@latest app --typescript --tailwind --eslint --app \
    --src-dir --import-alias "@/*" --no-turbopack
cd app
npm i better-sqlite3 drizzle-orm zod @tanstack/react-query zustand \
      recharts nanoid clsx date-fns
npm i -D drizzle-kit @types/better-sqlite3 vitest tsx
```

Add to `package.json`:
```json
"scripts": {
  "dev": "next dev",
  "build": "next build",
  "db:generate": "drizzle-kit generate",
  "db:migrate": "tsx src/lib/db/migrate.ts",
  "db:seed": "tsx src/lib/db/seed.ts",
  "content:validate": "tsx scripts/validate-content.ts",
  "content:generate": "tsx scripts/generate-content.ts",
  "test": "vitest run"
}
```

Create `.env.example` (copy to `.env.local`) exactly as listed in
[`../05-ARCHITECTURE.md`](../05-ARCHITECTURE.md#environment).

**Acceptance:** `npm run dev` serves a page at `localhost:3000`.

---

## Step 0.2 — Database (30 min)

Write `src/lib/db/schema.ts` verbatim from
[`../06-DATA-MODEL.md`](../06-DATA-MODEL.md#part-b--sqlite-schema-drizzle). Do not trim it down
to "what phase 1 needs" — the whole schema is cheap now and expensive to retrofit.

`src/lib/db/client.ts`:
```ts
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from './schema';

const sqlite = new Database(process.env.DB_PATH ?? 'data/exceller.sqlite');
sqlite.pragma('journal_mode = WAL');
sqlite.pragma('foreign_keys = ON');
export const db = drizzle(sqlite, { schema });
```

`drizzle.config.ts` → dialect `sqlite`, schema path, out `./drizzle`.

```bash
mkdir -p data && npm run db:generate && npm run db:migrate
```

**Acceptance:** `data/exceller.sqlite` exists and `sqlite3 data/exceller.sqlite ".tables"`
lists all nine tables. Add the indexes from the data-model doc in the same migration.

---

## Step 0.3 — Content pipeline (45 min) ⭐ the load-bearing part

### `src/lib/content/schemas.ts`
All Zod schemas from [`../06-DATA-MODEL.md`](../06-DATA-MODEL.md#part-a--content-schemas),
plus the discriminated union:
```ts
export const ContentItem = z.discriminatedUnion('kind', [
  MCQItem, TraceItem, DebugItem, AICProblem,
  EssayPrompt, SpeakPrompt, ReadPassage, ListenItem, BehaviouralItem,
]);
export type ContentItem = z.infer<typeof ContentItem>;
```

### `content/topics.json`
The topic registry, transcribed from [`../02-SYLLABUS-MAP.md`](../02-SYLLABUS-MAP.md):
```json
{
  "ai-literacy": {
    "genai-foundations": { "priority": "P0", "subtopics": ["what-is-genai","discriminative-vs-generative","ai-ml-dl-genai","training-vs-inference","foundation-models","finetune-vs-prompt","modalities"] },
    "llm-limitations":   { "priority": "P0", "subtopics": ["tokens","context-window","hallucination","knowledge-cutoff","non-determinism","bias","reasoning-limits","prompt-injection"] },
    "prompt-engineering":{ "priority": "P0", "subtopics": ["specificity","role-prompting","few-shot","chain-of-thought","output-format","delimiters","iteration","anti-patterns"] },
    "rag":               { "priority": "P1", "subtopics": ["why-rag","pipeline","embeddings","vector-db","rag-vs-finetune","failure-modes","grounding"] },
    "agentic-ai":        { "priority": "P1", "subtopics": ["agent-definition","tool-calling","planning","multi-agent","human-in-loop","guardrails"] },
    "responsible-ai":    { "priority": "P0", "subtopics": ["bias-fairness","transparency","privacy","accountability","safety","output-validation","ip","regulation"] },
    "ai-assisted-dev":   { "priority": "P1", "subtopics": ["assistant-strengths","review-discipline","security","testing","licensing"] }
  },
  "technical": { "pseudocode": { "priority": "P0", "subtopics": ["loops","nested-loops","conditionals","recursion","bitwise","integer-arithmetic","arrays","strings","pointers","find-error","insert-line"] }, "...": "…" },
  "english":   { "grammar": { "priority": "P0", "subtopics": ["subject-verb","tenses","articles","prepositions","pronouns","conditionals","voice","speech","modifiers","parallelism","connectors","error-spotting","sentence-correction"] }, "...": "…" },
  "debugging": { "...": "…" }, "aic": { "...": "…" }, "cognitive": { "...": "…" }, "behavioural": { "...": "…" }
}
```
*(Fill every stage from the syllabus map. This file is boring and essential: it is what keeps
the bank classifiable, which is what makes the readiness score mean anything.)*

### `src/lib/content/validate.ts` — the self-check rules

These run on every item at load and in `npm run content:validate`. **Any failure = bank rejected.**

| # | Rule | Rationale |
| --- | --- | --- |
| V1 | Schema parses | Baseline |
| V2 | `id` unique across all banks | Prevents silent overwrite |
| V3 | `topic`/`subtopic` exist in `topics.json` | Keeps analytics meaningful |
| V4 | MCQ: exactly 4 options, `answer` matches an option id | Catches the most common authoring bug |
| V5 | MCQ: no two options textually identical (normalised) | Duplicate options = broken question |
| V6 | MCQ: `explanation` ≥ 40 chars and does not merely restate the option text | Forces real explanations |
| V7 | MCQ: answer position distribution across a bank is within 15–35% per letter | Stops the LLM's "answer is always B/C" bias |
| V8 | Trace: `executionTrace` non-empty; final step's `output` equals `answer` | **Self-consistency: the trace proves the answer** |
| V9 | Trace: every `line` in the trace is within the source's line count | Catches drift between code and trace |
| V10 | Debug: `referenceSource` passes **all** tests; `brokenSource` fails **≥1** | **The exercise is provably broken and provably fixable** |
| V11 | Debug: ≥3 tests, ≥1 edge case tag, exactly 4 hints | Consistent hint ladder |
| V12 | AIC: `referenceSolution` passes all tests | Ditto |
| V13 | AIC: every rubric array non-empty | Scoring would silently return 0 otherwise |
| V14 | No item's `stem`/`problem` is >85% similar to another (trigram Jaccard) | Catches near-duplicate LLM output |
| V15 | `targetSeconds` between 15 and 600 | Sanity |

> **V8 and V10 are the two rules that make this app trustworthy.** They mean a trace question
> cannot claim an answer its own trace contradicts, and a debug exercise cannot be un-fixable.
> Most self-built question banks have neither check, and quietly teach you wrong things.

### `src/lib/content/loader.ts`
Reads `content/**/*.json`, validates, returns typed items, throws an aggregated error listing
**every** failure (not just the first) with file + id + rule number.

### `src/lib/db/seed.ts`
Loads validated content → upserts into `items` with a `contentHash` (sha256 of the payload) →
skips unchanged → reports `{ added, updated, unchanged, removed }`.

**Acceptance:** `npm run content:validate` on an intentionally broken fixture reports the exact
rule violated. `npm run db:seed` twice in a row reports `unchanged` the second time.

---

## Step 0.4 — The shared timer (25 min) ⭐ build once, use everywhere

ADR-005: one timer, six modules. Per-module timers drift and pause differently, and you will
not notice until a mock gives you a wrong score.

`src/lib/hooks/useExamTimer.ts`:
```ts
export function useExamTimer(opts: {
  totalMs: number;
  onExpire: () => void;
  autoStart?: boolean;
  tickMs?: number;              // default 200 — display cadence, NOT the time source
}) {
  // Time source is performance.now() deltas accumulated into elapsedMs.
  // NEVER decrement a counter on an interval — setInterval drifts, throttles in
  // background tabs, and pauses under heavy render. Read the clock; don't count ticks.
  // Exposes: { remainingMs, elapsedMs, isRunning, start, pause, resume, stop, addMs }
  // Guarantees:
  //   - onExpire fires exactly once, even across pause/resume and re-renders
  //   - pause/resume preserve elapsed precisely
  //   - a background tab that returns after 5 min shows the correct remaining time
}
```

Also `src/components/ui/Timer.tsx` — shows mm:ss, turns amber under 25% and red under 10%,
and exposes a **per-question budget bar** alongside the section clock (a question-level budget
is what actually stops over-dwelling; a section clock alone doesn't).

**Acceptance (write these as Vitest tests — this is the one place tests are non-negotiable):**
- 60 s timer, pause at 10 s, resume 5 min later (fake timers) → `remainingMs ≈ 50 000`
- `onExpire` called exactly once across 3 pause/resume cycles
- Unmount mid-run → no further callbacks

---

## Step 0.5 — App shell + dashboard skeleton (30 min)

- `src/app/layout.tsx` — nav (Dashboard / Drill / Trace / Debug / AI-Coding / Games /
  Communication / Mock / Review / Log / Settings), dark mode, TanStack Query provider
- `src/app/page.tsx` — dashboard with **six stage cards** reading from
  `/api/readiness`, which for now returns `null` readiness for every stage
  ⇒ all cards show ⬜ **Untested**. This is correct and honest on day one.
- Countdown to `EXAM_DATE` in the header — a permanent, slightly uncomfortable reminder
- `src/app/settings/page.tsx` — exam date, profile picker, API-key presence indicator
  (never display the key), LLM spend to date, runner mode

**Acceptance:** dashboard renders six Untested cards and a correct days-remaining count.

---

## Done when

- [ ] `npm run dev` serves the dashboard
- [ ] All nine tables exist with indexes
- [ ] `npm run content:validate` passes on a 3-item fixture and fails loudly on a broken one
- [ ] `npm run db:seed` is idempotent
- [ ] Timer tests pass (pause/resume, single-expire, unmount)
- [ ] Settings page reads and writes exam date + profile

## Commit

```
feat(app): scaffold Exceller Trainer foundation

Next.js + TypeScript + Tailwind app, SQLite/Drizzle schema, content
pipeline with 15 validation rules, shared drift-free exam timer, and a
dashboard shell reporting Untested for all six stages.
```

## What this unlocks for studying

Nothing yet — this is the only phase with no study payoff. That's why it's capped at 2.5 hours.
**If it runs over 3 hours, cut Step 0.5 to a bare nav and move on.**
