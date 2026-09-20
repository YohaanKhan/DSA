# Phase 01 — MCQ Engine + Trace Lab + Content Generation

| | |
| --- | --- |
| **Goal** | Timed, scored, explained practice for the **two biggest MCQ surfaces** (AI Literacy, Technical) plus pseudocode tracing — and a generator that fills the banks. |
| **Time budget** | **3.5 hours** build + **1 hour** supervised generation |
| **Prerequisites** | Phase 00 |
| **Unlocks** | Stage 2a (AI Literacy), Stage 2b (Technical + pseudocode), Stage 1 grammar/vocab |
| **Skippable?** | **No — this is the highest-value phase in the plan.** |
| **Status** | ✅ **Built.** See `app/src/components/drill/`, `app/src/app/api/sessions/`, `app/src/lib/content/{select,generate}.ts`, `app/src/lib/srs/sm2.ts`. |

> This phase covers the two eliminatory stages with the largest surface area and, in AI Literacy,
> the single highest-ROI topic in the exam. If you build only two phases, build 01 and 02.

---

## Step 1.1 — Question runner API (40 min)

### `POST /api/sessions`
```ts
// body: { mode, stage?, topics?: string[], subtopics?: string[],
//         difficulty?: ('easy'|'medium'|'hard')[], count: number,
//         timerMode: 'per-question'|'section'|'none', seconds?: number,
//         strategy: 'random'|'weakest'|'due'|'unseen' }
// → { sessionId, itemIds }
```

**Selection strategies — the interesting part:**

| Strategy | SQL sketch | When it's right |
| --- | --- | --- |
| `random` | `ORDER BY RANDOM()` within filters | Mock realism |
| `unseen` | items with no row in `attempts` | Early in the week, maximising coverage |
| `due` | join `review_cards WHERE due_at <= now` ORDER BY `due_at` | Daily review block |
| `weakest` ⭐ | rank topics by recent accuracy asc, then sample proportional to `(1 - accuracy) × priorityWeight`, excluding items answered correctly with `confidence='high'` in the last 2 days | The default. This is the engine of the whole app. |

`weakest` in words: *spend your next 20 questions where your accuracy is worst, weighted by
how much the exam cares, and don't re-ask what you demonstrably know.*

### `POST /api/sessions/[id]/answer`
Body `{ itemId, response, timeMs, confidence, flagged }` → grades, writes an `attempts` row,
updates the SM-2 `review_cards` row, returns `{ correct, answer, explanation, distractorRationale }`.

**Grade server-side.** Never ship the answer key to the client before the answer is submitted —
not for security, but because you will absolutely look at the network tab at 2am.

### `POST /api/sessions/[id]/finish`
Computes session score, writes `sessions.score`, triggers a readiness recompute for that stage.

---

## Step 1.2 — Runner UI (50 min)

`src/app/drill/[sessionId]/page.tsx`

Layout: section timer top-right · per-question budget bar under it · `Q 7 / 20` ·
stem (markdown + syntax-highlighted code) · 4 options · **confidence toggle** ·
Flag · Skip · Submit.

**Interaction decisions that matter:**
- Keyboard first: `1–4` select, `Enter` submit, `F` flag, `Space` next. You will do
  thousands of these; a mouse round-trip per question costs you real minutes.
- **Confidence toggle is mandatory before submit** in drill mode (skipped in mock mode, where
  realism wins). Two buttons: *Sure* / *Guess*. This single field is what makes the
  `trueKnown` metric and the review queue honest.
- After submit: explanation always shown, including on correct answers, with the
  distractor rationale expandable. Then `Space` to advance.
- Per-question budget bar turns red past `targetSeconds` — trains pace, doesn't force it.

`src/app/drill/[sessionId]/review/page.tsx` — every question, your answer, correct answer,
time, explanation; "Add all wrong to review queue" button.

---

## Step 1.3 — Trace Lab (50 min) ⭐

`src/app/trace/page.tsx`

1. Show numbered source in a monospace block
2. Ask "What is printed?" — free text (exact match, whitespace-normalised) or MCQ
3. On submit, reveal the **variable-table stepper**

### The stepper component
`src/components/trace/VariableTable.tsx` — renders `executionTrace` as a table where
each row is a step, columns are variable names, and the current source line is highlighted.
Controls: `←` `→` step, `Home`/`End`, and an auto-play at 1 step/sec.

**Why this is the whole point of the module.** Tracing is a *procedure*, not a fact. Being told
"the answer was 3" teaches nothing. Watching `x` go `13 → 12 → 8 → 0` while the highlighted
line sits on `x = x & (x-1)` teaches the procedure. This single component is why Trace Lab is
worth building rather than folding into the MCQ engine.

### Divergence capture
After a wrong answer, before revealing the stepper, ask: *"At which step do you think it first
went wrong?"* Record as `divergenceStep`. Aggregated, this tells you whether loops, recursion,
or bitwise is your actual weakness — a far more actionable signal than "you got 6/10".

---

## Step 1.4 — Content generation harness (40 min)

`scripts/generate-content.ts` + `src/lib/content/generate.ts`

```
for each (stage, topic, subtopic, difficulty) in the requested matrix:
  1. build a prompt: role + the exact Zod schema as JSON Schema
       + 2 worked exemplars from this repo + the subtopic definition
       + an explicit "do not produce items similar to:" list of existing stems
  2. request N items as a JSON array (model: claude-opus-5)
  3. parse → validate against the Zod schema
  4. run the V1–V15 self-checks
  5. for trace items: independently verify by re-deriving the final output from executionTrace
  6. for debug/aic items: actually compile and run reference + broken sources (Phase 02's runner)
  7. write passing items to content/<bank>.json; write failures to content/.rejected/ with reasons
```

**Rules that keep the bank honest:**
- Generate in **small batches (10–15)** per subtopic. Large batches degrade and repeat.
- Always pass existing stems in the "avoid" list — this is what prevents the bank filling with
  twelve rephrasings of the same hallucination question.
- **Balance the answer key**: after each bank is generated, run V7; if a letter is over-represented,
  permute options (and the `answer`) to rebalance. Do this mechanically, not by re-prompting.
- Anything that fails validation is **never** silently dropped — it lands in `.rejected/` with
  the rule number, so you can see if the generator is systematically bad at something.

### Target bank sizes for a 7-day sprint

| Bank | Items | Rationale |
| --- | --- | --- |
| `ai-literacy.json` | **150** | ~20 asked; 150 gives 7× coverage of a small closed syllabus |
| `technical-dsa.json` | 120 | |
| `technical-oop.json` | 60 | |
| `technical-dbms.json` | 80 | DBMS+SQL is heavily asked |
| `technical-os.json` | 60 | |
| `technical-networks.json` | 60 | |
| `technical-git-se.json` | 40 | |
| `trace/pseudocode.json` | **120** | The under-prepared section; needs volume |
| `english.json` | 120 | grammar 70 / vocab 30 / RC 20 |
| `behavioural/adept.json` | 60 | 30 forward + 30 reverse-keyed pairs |
| **Total** | **~870** | ≈ 40–60 min of generation + validation |

> **Reuse your own notes.** `dsa-notes/BinarySearch/*` and `dsa-notes/TwoPointers/*` are seeds:
> feed each solution to the generator to produce (a) trace items from the algorithm's loop,
> (b) complexity MCQs, (c) Phase 02 debug exercises via bug injection, (d) Phase 03 AIC problems.
> One solution file yields ~6 practice items across four modules. See
> [`../content/SEED-PLAN.md`](../content/SEED-PLAN.md).

**If you have no API key:** the schemas and exemplars in
[`../06-DATA-MODEL.md`](../06-DATA-MODEL.md) are enough to author by hand, and the
[resource library](../03-RESOURCE-LIBRARY.md) lists public banks you can work through directly
in a notebook. The app still scores and schedules; you just author less content.

---

## Step 1.5 — Drill builder + "Surprise me" (20 min)

`src/app/drill/page.tsx` — module, topic multi-select (grouped by stage, P0 items pre-checked),
difficulty, count, timer mode. Plus one big button: **"Surprise me (weakest topics)"**, which
posts `strategy: 'weakest'` with count 20.

That button is journey J1 from the product spec, and it should be reachable from the dashboard
in **one** click. Everything else on this page is for when you already know what you want.

---

## Acceptance tests

- [x] Drill runs end-to-end through the real UI, keyboard-only, to the results page
- [x] Answering with `confidence='low'` and getting it **right** still enqueues a review card
      (`qualityFrom` returns 3 — covered by `sm2.test.ts`)
- [x] `strategy: 'weakest'` ranks by `(1 − accuracy) × priority weight` and excludes items
      answered confidently and correctly in the last two days
- [x] Trace stepper renders and steps; the answer key and execution trace are withheld from the
      client until after grading (verified over the wire)
- [x] Generator validates every item and writes rejects with their rule numbers
- [x] Answer-key rebalancing keeps every letter within 15–35% (`generate.test.ts`)
- [x] Review page lists every answer with explanations, plus lucky-guess accounting

### Bugs this phase's verification actually caught

| Bug | How it was found |
| --- | --- |
| Trace items dead-ended the keyboard flow: focus sits in the answer input, so `S`/`G` never reached the handler and Submit stayed permanently disabled | Driving the real UI, not unit tests. Fixed with an explicit Enter focus-chain: answer → confidence → submit. |
| `formatClock` was exported from a `'use client'` module and called from a server component | Browser console error on the results page. Extracted to `lib/format.ts`. |
| Per-question state reset via `setState` inside an effect (cascading renders) | `react-hooks` lint. Fixed by remounting the question with `key={item.id}`. |
| The "previous step" button rendered a right-pointing chevron | Screenshot review. |

## Done when

You can sit a timed 20-question AI Literacy drill, a 20-question technical drill, and a
10-question trace set, and see your wrong answers explained and queued for review.

## Commit
```
feat(drill): MCQ engine, trace lab and content generation

Timed question runner with confidence capture and server-side grading,
pseudocode trace lab with a variable-table stepper, weakest-topic
selection strategy, and a validated LLM content-generation harness.
```

## What this unlocks for studying — **start today**

The moment the banks are seeded you can begin the highest-ROI work in the whole week:
150 AI Literacy questions over ~3 hours takes you from cold to strong in the newest,
least-contested section of the exam. Do that the same evening you finish this phase.
