# Phase 03 — AI-Assisted Coding Simulator ⭐

| | |
| --- | --- |
| **Goal** | A scored, five-step simulator for the stage that decides your **package tier** and that essentially nobody else will have practised. |
| **Time budget** | **3 hours** |
| **Prerequisites** | Phase 00; Phase 02's runner (to execute the final code) |
| **Unlocks** | Stage 4 — the ₹3.25 LPA multiplier |
| **Skippable?** | No. This is the differentiator. |
| **Status** | ✅ **Built.** See `app/src/lib/scoring/aic.ts`, `app/src/components/aic/`, `app/src/app/api/aic/`, `app/content/aic/problems.json`. |

> **The strategic case for this phase.** Every other stage is a gate: clearing it gets you to
> the next one. This stage (with the coding problems) is the *multiplier* — it's what separates
> ₹4.25 LPA from ₹7.50 LPA. It is also brand new, unique to Exceller among India IT recruiters,
> and has no public practice resource. Highest marginal return in the entire plan.

---

## Step 3.1 — LLM client with metering (30 min)

`src/lib/llm/client.ts`

```ts
export async function complete(opts: {
  purpose: 'aic-assistant' | 'aic-score' | 'essay-grade' | 'speech-feedback' | 'generate';
  model: 'claude-sonnet-5' | 'claude-opus-5';
  system: string;
  messages: Message[];
  maxTokens?: number;
}): Promise<{ text: string; usage: Usage }>
```

Responsibilities:
- Read `ANTHROPIC_API_KEY` **server-side only**
- Log every call to `llm_calls` with token counts and computed cost
- **Enforce `LLM_DAILY_CAP_USD`**: if today's spend exceeds it, throw `LlmCapExceeded`, which
  every caller catches and degrades to the deterministic fallback. Never silently burn money,
  and never hard-fail a drill because of a budget.
- Cache on `sha256(purpose + model + system + messages)` in a `llm_cache` table — re-running
  the same scoring during development shouldn't cost anything.

`src/lib/llm/prompts.ts` — **every system prompt in one file.** You will iterate on these
constantly; scattered prompt strings are unmaintainable.

---

## Step 3.2 — The five-step wizard (70 min)

`src/app/aic/page.tsx` — a step machine. **You cannot go back.** The exam is scaffolded, so the
simulator is too; and irreversibility is what makes you frame properly the first time.

### Step 1 — Frame (4 min)
> *"Restate the problem in your own words. What are the inputs, the outputs, the constraints,
> and the edge cases?"*

Textarea. On submit, scored against `rubric.frame` — a checklist of required elements
(e.g. `["input type and range", "output type", "duplicates handled", "empty array", "returns what when fewer than 2 distinct"]`).

Scoring: LLM-judged presence of each element (with a keyword fallback). Shown as a checklist
with ✓/✗ — you see exactly what you forgot to consider. **Missing edge cases here is the single
most common failure, and this screen makes it visible immediately.**

### Step 2 — Plan (3 min)
> *"What's your approach, and what time and space complexity are you targeting?"*

Scored against `rubric.plan`. Complexity is parsed out with a regex (`O(n)`, `O(n log n)`, …)
and compared to the reference.

### Step 3 — Prompt (5 min) ⭐ the heart of the module
> *"Write the prompt you'd give an AI assistant to produce this solution."*

**The anti-paste rule.** Before sending, compute normalised trigram overlap between your prompt
and the problem statement. **If ≥70%, the prompt is rejected** with:

> *"This is mostly the problem statement copied. Frame it in your own words: name the language,
> state the exact behaviour, list the constraints and edge cases, and say what you want back."*

This one rule is the majority of the module's training value. It makes it impossible to
practise the wrong behaviour.

Your prompt is then **actually sent** to `claude-sonnet-5` with a system prompt that makes it
behave like an exam assistant:

```
You are a coding assistant inside a timed assessment. Answer exactly what the
user's prompt asks for — no more. Do not volunteer edge cases, complexity
analysis, or improvements the user did not request. If the request is ambiguous,
make a reasonable assumption and state it in one line. Return code in a single
fenced block.
```

**That system prompt is the pedagogy.** A helpful assistant papers over a vague prompt and you
learn nothing. A literal one makes a vague prompt produce visibly deficient code — which is
exactly the feedback you need.

Your prompt is scored against `rubric.prompt`: names the language · states exact behaviour ·
states constraints · names edge cases · specifies output format or asks for complexity.

### Step 4 — Review (5 min)
The generated code is shown. You get a checklist plus a free-text box:
> *"What's wrong, risky, or missing in this code?"*

Checklist items: edge cases handled · off-by-one · null/empty input · overflow · stated
complexity matches · variables initialised · compiles as written · solves the *stated* problem.

Scored against `rubric.review` — the issues a good reviewer would catch — **minus 0.5 per false
positive**, so you can't game it by ticking everything.

**Most candidates skip review entirely. This step is 25% of the score.**

### Step 5 — Refine (5 min)
One follow-up prompt. Scored on whether it's **targeted** (references the specific defect) vs.
a **restart** (re-states the whole problem — detected by overlap with your step-3 prompt).
Final code is then compiled and run against the problem's tests via the Phase 02 runner.

### Result screen
- Per-step 0–5 with the rubric checklist ✓/✗
- **Your prompt vs. the exemplar prompt, side by side** — the most instructive single screen
  in the app
- The generated code, your review, what you missed
- Everything written to `submissions` for interview prep

---

## Step 3.3 — Problem bank (30 min)

20 problems from [`../02-SYLLABUS-MAP.md`](../02-SYLLABUS-MAP.md#45-problem-bank-shapes-to-practise-on),
each with a full `rubric`, `referenceSolution`, tests, and `modelPromptExample`.

**Worked example — `aic-second-largest`:**

```json
{
  "id": "aic-second-largest",
  "kind": "aic",
  "stage": "aic",
  "topic": "arrays",
  "difficulty": "easy",
  "priority": "P0",
  "targetSeconds": 1200,
  "source": "authored",
  "title": "Second largest distinct value",
  "language": "java",
  "problem": "Given an integer array, return the second largest DISTINCT value. If fewer than two distinct values exist, return Integer.MIN_VALUE.",
  "rubric": {
    "frame": ["input is an int array", "output is an int", "distinct means duplicates collapse", "fewer than 2 distinct returns MIN_VALUE", "array may be empty", "values may be negative"],
    "plan": ["single pass", "track largest and second largest", "O(n) time", "O(1) space"],
    "prompt": ["names Java", "says second largest", "says distinct", "states the fewer-than-two fallback", "asks for complexity or states O(n)/O(1)"],
    "review": ["handles duplicates of the maximum", "handles all-equal arrays", "handles length 0 and 1", "initialisation does not break on all-negative input", "does not sort when a single pass suffices"]
  },
  "modelPromptExample": "Write a Java method `int secondLargest(int[] nums)` that returns the second largest DISTINCT value in the array.\n\nInput: int array, length 0..10^5, values may be negative and may repeat.\nOutput: the second largest distinct value; return Integer.MIN_VALUE if there are fewer than two distinct values.\n\nRequirements:\n- Handle: empty array, single element, all elements equal, duplicated maximum, all-negative values.\n- Target O(n) time and O(1) extra space; do not sort.\n\nAlso state the time and space complexity.",
  "referenceSolution": "…",
  "tests": [
    { "stdin": "5\n1 2 3 4 5", "expectedStdout": "4" },
    { "stdin": "4\n7 7 7 7",   "expectedStdout": "-2147483648" },
    { "stdin": "0\n",          "expectedStdout": "-2147483648" },
    { "stdin": "3\n-5 -2 -2",  "expectedStdout": "-5" }
  ]
}
```

Note how the `modelPromptExample` maps 1:1 onto `rubric.prompt`. That's the template you're
drilling: **language + exact behaviour + input/output contract + edge cases + complexity + a
"do not" constraint**.

---

## Step 3.4 — Offline / no-key mode (20 min)

Without `ANTHROPIC_API_KEY`, or when the daily cap trips:
- Steps 1, 2, 4, 5 score deterministically via keyword/pattern matching over the rubric arrays
- Step 3's anti-paste check still runs (it's pure string maths)
- Instead of a live response, a **pre-generated "literal assistant" output** stored with each
  problem is shown — deliberately containing the flaws a vague prompt would produce, so the
  review step still has something real to catch
- The exemplar prompt is revealed for self-comparison

**This matters:** on exam eve you may be on hotel wifi. The module must still work.

---

## Acceptance tests

- [x] Wizard enforces forward-only progression
- [x] Pasting the problem statement into step 3 is **rejected** — verified in a browser, reported as "100% of this is the problem statement"
- [x] Step 4 subtracts 0.5 per invented issue; verified by claiming a thread-safety problem that is not there
- [x] Step 5 distinguishes a targeted follow-up from a restart (trigram containment against the original prompt)
- [x] Final code is compiled and run against the tests; failures are named
- [x] Every run is recorded in `submissions` for interview prep
- [x] **With no API key, all five steps still score** and the scripted flawed output is shown
- [x] A stated complexity that misses the target costs a mark and says so

### Verified scoring behaviour

A deliberately mediocre run scored **57/100**: Frame 1.7/5 (missed the empty-array and
negative cases), Plan 0/5 (proposed sorting, stated O(n log n) against a target of O(n)),
Prompt 5/5, Review 2/5 (caught two real issues, invented one), Refine 5/5.

### Bugs this phase's verification caught

| Bug | How it was found |
| --- | --- |
| `RubricElement` was exported only as a Zod value, not a type | Typecheck, when the API route tried to use it as a type. |
| The submit button read "Submit write" | Screenshot review — the label was being sliced out of the step title. |
| Result screenshot fired before the finish call returned | The finish route compiles and runs Java (~4.7s). The test now waits for the result, not a fixed duration. |

### Deviations from the plan

1. **The rubric carries matchable patterns, not just prose.** The plan had
   `rubric.frame: string[]`. That cannot be scored without an LLM, which would have made the
   whole module unusable with no API key. Each element is now
   `{ id, requirement, patterns[] }`, so it scores offline and the LLM is an upgrade rather
   than a dependency.
2. **The exemplar prompt must pass its own rubric**, enforced by rule V13. Otherwise the app
   could show a "model answer" it would itself mark down.
3. **`npm run content:verify-aic`** compiles each reference solution (must pass every test)
   and each fallback assistant output (must FAIL at least one). Without the second check the
   offline review step could have nothing real to catch.
4. **Python is excluded from the AIC language enum** — it is not accepted in the exam's
   code-writing rounds.

## Done when

You can run a full 20-minute AIC simulation and get a per-step breakdown showing exactly which
of the five behaviours you're weakest at.

## Commit
```
feat(aic): AI-assisted coding simulator

Five-step Frame/Plan/Prompt/Review/Refine wizard with per-step rubric
scoring, a literal exam-style assistant, an anti-paste rule on the prompt
step, false-positive-penalised review scoring, and a deterministic
offline fallback.
```

## What this unlocks for studying

Target: **20+ runs across the week**, ending with the 5-step protocol as muscle memory and a
prompt score ≥4/5 consistently. Twenty reps is enough to make this automatic — and automatic is
the whole game, because the round is short and you won't have time to think about *how* to work
with the assistant while also solving the problem.
