# Phase 02 — Debugging Lab

| | |
| --- | --- |
| **Goal** | Unlimited, on-distribution debugging reps in C / C++ / Java, with real compilation, real tests, a hint ladder, and a bug-injection engine that generates exercises from correct solutions. |
| **Time budget** | **3 hours** |
| **Prerequisites** | Phase 00 (Phase 01 optional) |
| **Unlocks** | Stage 3 — an eliminatory gate that almost nobody practises |
| **Skippable?** | **No.** |
| **Status** | ✅ **Built.** See `app/src/lib/runner/`, `app/src/lib/mutation/`, `app/src/components/debug/`, `app/scripts/inject-bugs.ts`. |

> **Why this is phase 2 and not phase 5.** Debugging is (a) eliminatory, (b) a skill distinct
> from writing code, (c) the one with no good free practice source, and (d) trainable to a high
> level in a few days. Highest elimination-risk-reduction per build hour after Phase 01.

---

## Step 2.1 — CodeRunner (50 min)

Implement the interface from [`../05-ARCHITECTURE.md`](../05-ARCHITECTURE.md#coderunner-debugging-lab).

### `src/lib/runner/local.ts`

```
run(req):
  dir = mkdtemp(app/.scratch/run-)
  try:
    c    → write main.c;    gcc -O0 -std=c11   main.c   -o prog  → ./prog
    cpp  → write main.cpp;  g++ -O0 -std=c++17 main.cpp -o prog  → ./prog
    java → write Main.java; javac Main.java                      → java -cp . Main
    each spawn: timeout (default 5s), stdin piped, stdout/stderr capped at 64 KB
    on timeout: SIGKILL the process group, return { timedOut: true }
  finally:
    rm -rf dir
```

**Details that will bite you if skipped:**
- Kill the **process group** (`detached: true` + `process.kill(-pid)`), not just the child —
  a runaway `a.out` spawned by a shell survives a plain kill and eats your CPU for the rest
  of the week.
- Separate compile timeout (10 s) from run timeout (5 s); `javac` is slow on first run.
- Cap output. An infinite `printf` loop will otherwise buffer gigabytes into your Node process.
- Java requires the public class to be named `Main` — enforce it in the schema and say so in
  the editor placeholder, or every Java exercise fails with a confusing error.
- Detect toolchains once at startup (`which gcc g++ javac`) and cache; show the detected runner
  in Settings so a fallback is never silent.

### `src/lib/runner/piston.ts`
POST `{language, version, files:[{content}], stdin}` to `${PISTON_BASE_URL}/execute`.
Map the response to `RunResult`. Handle 429 with one retry + backoff, then surface a clear
"remote runner rate-limited" message rather than a generic failure.

### `POST /api/run`
`{ language, source, stdin, timeoutMs }` → `RunResult`. Selects the runner by
`CODE_RUNNER` env (`auto` = local if available, else piston).

**Security note, stated plainly:** this executes code on your machine with a timeout and an
output cap, and nothing else. That is fine for a single-user local tool where you are the only
author of the code. **Do not expose this app to a network.** If you want isolation, set
`CODE_RUNNER=piston`, or run the app in a container. Put this in the app README.

**Acceptance:** all three languages compile+run hello-world; an infinite loop returns
`timedOut: true` within ~5 s and leaves no orphan process (`pgrep` is clean afterwards).

---

## Step 2.2 — Bug injection engine (60 min) ⭐ the reason this phase is worth it

`src/lib/mutation/mutators.ts` — one function per bug family, each:
`(source: string, language: Lang) => { mutated: string, line: number, family: Family } | null`

| Mutator | Rule | Example |
| --- | --- | --- |
| `offByOne` | flip `<`↔`<=` / `>`↔`>=` in a loop condition, or `±1` a bound | `i < n` → `i <= n` |
| `invertCondition` | `==`↔`!=`, negate a boolean sub-expr, swap `&&`↔`\|\|` | `if (a == b)` → `if (a != b)` |
| `wrongVariable` | swap two same-scope, same-type identifiers in one expression | `sum += arr[i]` → `sum += arr[j]` |
| `dropReturn` | delete a `return` inside a conditional branch | |
| `badInit` | change an accumulator's init | `int max = INT_MIN` → `int max = 0` |
| `boundaryOverflow` | extend a loop bound by one | `i < n` → `i < n + 1` |
| `assignInCondition` | `==` → `=` inside `if` (C/C++ only) | `if (x == 1)` → `if (x = 1)` |
| `wrongOperator` | `+`↔`-`, `*`↔`/`, `++`↔`--` | |

### The validity loop — non-negotiable
```
inject(source, family, tests):
  for each candidate site (shuffled, max 10 tries):
    mutated = mutator(source, site)
    if mutated is null: continue
    compileResult = runner.run(mutated)                 // must still COMPILE for logic families
    if family is a logic/runtime family and compileResult.compileError: continue
    if all tests pass on mutated: continue              // ← not actually broken, reject
    return { mutated, line, family }
  return null   // this source can't host this bug family; try another
```

Two guarantees fall out, and they are what make the module trustworthy:
1. **Every generated exercise is genuinely broken** (fails ≥1 test)
2. **Every generated exercise is genuinely fixable** (the reference passes, and you know the
   exact line changed)

And for free: the **hint ladder** (family → function → line range → diff) and the post-hoc
"here's the one line you needed" diff, with zero extra authoring.

**Source material:** your own `dsa-notes/TwoPointers/*.py` translated to C/C++/Java, plus the
`referenceSolution` of every AIC problem, plus any correct solution you write during the week.
Every correct solution you produce becomes ~8 debugging exercises. That compounding is the
whole point.

`scripts/inject-bugs.ts` — CLI: `tsx scripts/inject-bugs.ts --source X --families all --count 8`.

---

## Step 2.3 — Debugging Lab UI (50 min)

`src/app/debug/page.tsx`

Layout: problem statement (left) · Monaco editor with the broken source (centre) ·
tests + output (right) · 20-minute timer.

**The flow, which enforces the four-step method:**

1. **Read phase (90 s, timer visible, editor locked).** You may read but not type.
   *Forcing a read-before-type phase is the highest-value UI decision in this module* — the
   most common failure in this round is editing before understanding.
2. **Hypothesis prompt.** Before unlocking, pick the bug family from a dropdown and optionally
   name a line. Recorded as `hypothesisCorrect`.
3. **Fix phase.** Editor unlocks. Run (visible tests) is unlimited; Submit (all tests incl.
   hidden) is what scores.
4. **Validate prompt.** Before Submit, a checklist appears: empty input · single element ·
   duplicates · negatives · boundaries. Tick what you actually tested. Untickable ones are
   pre-disabled based on the problem's declared edge cases.
5. **Result.** Score per [`../07-SCORING-AND-ANALYTICS.md`](../07-SCORING-AND-ANALYTICS.md#3-debugging-scoring-libscoringdebugts),
   plus a **diff of your fix vs. the minimal fix**, plus your hypothesis accuracy.

**Hint ladder** — 4 levels, each −0.10:
1. "The bug family is: off-by-one"
2. "It's in function `findMax`"
3. "It's between lines 12 and 18"
4. The exact diff

Hints are behind a confirm dialog showing the score cost. Available from minute 8, not before —
struggling for eight minutes *is* the training.

**Monaco config:** read-only during the read phase, `renderWhitespace: 'boundary'` (catches
whitespace-sensitive Python if you add it later), and the **diff editor** for the result screen.

---

## Step 2.4 — Language-trap drill set (20 min)

A special mode: 20 short snippets, 60 s each, each containing exactly one classic
language-specific trap from [`../02-SYLLABUS-MAP.md`](../02-SYLLABUS-MAP.md#33-language-specific-traps--fix)
(`==` on Java Strings, `scanf` missing `&`, `sizeof` after array decay, `int` overflow,
`length` vs `length()` vs `size()`, integer division, unbraced if-body, `strcmp` vs `==`).

Pure pattern recognition, no compilation needed — just "what's wrong here?" MCQ over a snippet.
Cheap to build (it's the Phase 01 MCQ engine with a code block), and it converts the traps from
knowledge into reflex. Do this set once a day; it takes 20 minutes and it is the fastest way to
raise your debugging speed.

---

## Acceptance tests

- [x] All three languages compile and run; an infinite loop times out cleanly and leaves **no orphan processes**; runaway output is truncated at the cap
- [x] `inject-bugs` produced **11 exercises from 3 solutions**, every one compiling and failing ≥1 test
- [x] An exercise whose mutation still passes every test is rejected, not served (the validity loop)
- [x] Read phase locks the editor; a bug-family hypothesis is required before it unlocks
- [x] Hints are unavailable before minute 8 and each costs 0.10
- [x] Result screen shows the minimal diff, the real bug family and the marked line
- [x] Scoring discriminates: minimal fix **98**, same fix with needless edits **78**, minimal with 3 hints **68**, unfixed **0**
- [x] Submissions are recorded for interview prep

### Bugs this phase's verification actually caught

| Bug | How it was found |
| --- | --- |
| `targetSeconds` was capped at 600s, but a debugging round is 1200s | The content validator rejected every injected exercise. Cap raised to 1800s (the AI-assisted round is 30 min). |
| The content loader treated `content/solutions/*.tests.json` as question banks | Validator reported "a content bank must be a JSON array". Solutions are inputs to the injector, not content. |
| Rule V14 (near-duplicate) fired on every debug item | Exercises injected into one solution *share* a problem statement by design. V14 now excludes debug items and instead rejects two identical broken programs. |
| Submit returned 400 for every attempt | `performance.now()` deltas are fractional; the schema demanded an integer. Found by driving the real UI. |
| Read phase transitioned via `setState` inside an effect | `react-hooks` lint. The phase is now derived from the clock. |
| Hints still said "locked for the first 8 minutes" after the exercise ended | Screenshot review. |

### Deviation from the plan

The plan specified **Monaco** for the editor. Rejected during the build: it is ~5 MB, loads
from a CDN by default (which breaks the "must work offline on exam eve" requirement), and
would need fighting to match the design system. Replaced with a **custom ~100-line editor** —
a textarea layered over a syntax-highlighted `<pre>` with a line gutter, using a small
C-family tokenizer (`src/lib/highlight.ts`). No dependency, works offline, styled from the
design tokens.

## Done when

You can be handed a broken C/C++/Java program you've never seen, diagnose the bug family before
editing, fix it, and see how your fix compares to the minimal one — repeatedly, with new
exercises generated on demand.

## Commit
```
feat(debug): debugging lab with code runner and bug injection

Pluggable local/remote code runner for C, C++ and Java; eight bug-family
mutators with a validity loop guaranteeing every generated exercise is
broken and fixable; read-then-hypothesise-then-fix flow with a scored
hint ladder and minimal-diff feedback.
```

## What this unlocks for studying

Target: **≥80% fix rate within 20 minutes on unseen exercises**, and — the better metric —
**hypothesis-correct-before-editing ≥70%**. The second number is what actually transfers to
the exam, because it means you're diagnosing rather than flailing.
