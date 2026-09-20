# 04 — Product Spec: "Exceller Trainer"

## One-line definition

A local-first web app that gives you unlimited, timed, scored reps of all six Exceller
assessment surfaces, and tells you each morning **which stage is most likely to eliminate you**.

## Design principles

1. **Diagnose before drill.** The app's job is to point at your weakest gate, not to be a
   content library. Anything that doesn't feed the readiness signal is cut.
2. **Everything is timed.** The exam's difficulty is mostly time pressure. Untimed practice
   teaches the wrong reflex. Every drill has a clock, visible, by default.
3. **Configuration is data.** Section counts and timings vary by drive, so they live in one
   JSON file, not in code.
4. **Fail loudly on content quality.** A wrong answer key is worse than no question. Every
   content item is schema-validated and self-checked before it can be served.
5. **No feature that requires the internet to *practise*.** LLM features (AI-assisted coding,
   essay/speech grading) degrade gracefully to rubric-based self-scoring when offline.

---

## The six modules

| # | Module | Trains stage | Core loop | Phase |
| --- | --- | --- | --- | --- |
| 1 | **MCQ Engine** | 2a + 2b + 1 (grammar/vocab) | Question → answer → instant explanation → spaced repetition | 1 |
| 2 | **Trace Lab** | 2b pseudocode | Code shown → predict output → step-by-step variable-table reveal | 1 |
| 3 | **Debugging Lab** | 3 | Broken code → fix in editor → compile & run against tests → diff vs. reference | 2 |
| 4 | **AI-Assisted Coding Simulator** | 4 | 5-step scaffold: Frame → Plan → Prompt → Review → Refine, each scored | 3 |
| 5 | **Cognitive Arcade** | 5 | Grid / Switch / Digit / Motion, with levels, timers, and score curve | 4 |
| 6 | **Communication Studio** | 1 | Essay (timed, rubric-graded) + Speak (record, transcribe, score fluency) + Listen/Read | 5 |

Plus two cross-cutting surfaces:

| Surface | Purpose | Phase |
| --- | --- | --- |
| **Full Mock** | Runs all stages back-to-back under exam conditions, with elimination rules enforced | 6 |
| **Readiness Dashboard** | Per-stage readiness, trend, and "what to do today" | 6 |

---

## User journeys

### J1 — "I have 45 minutes, what should I do?"
Home → Dashboard shows the weakest stage with a red badge → one click starts a
15-question targeted drill on the weakest *topic within* that stage → results update readiness.
**This is the primary journey.** It must be ≤2 clicks from launch.

### J2 — "Simulate the real thing"
Full Mock → pick a drive profile (config preset) → all stages run in order with real timers →
elimination is enforced (fail a gate, the mock tells you and continues for data) →
detailed post-mock report with per-stage percentile-vs-your-own-history.

### J3 — "Drill one stage hard"
Module → choose topic filters + difficulty + count + timer → run → review every wrong answer
with explanation → wrong answers auto-enqueue into spaced repetition.

### J4 — "Review my mistakes"
Review queue → items due today (SM-2 scheduling) → mixed across all modules.

### J5 — "Prepare for the interview"
Submission log → every AI-assisted prompt, every debugging fix, with your stated reasoning,
exportable to Markdown. Because the technical interview may ask you to explain them.

---

## Screen inventory

| Route | Screen | Contents |
| --- | --- | --- |
| `/` | Dashboard | Readiness per stage, today's recommendation, streak, due-review count, days-to-exam countdown |
| `/drill` | Drill builder | Module, topic, difficulty, count, timer; "Surprise me" = weakest-topic autopick |
| `/drill/[sessionId]` | Runner | Question surface + timer + progress + flag-for-review |
| `/drill/[sessionId]/review` | Results | Per-question correct/incorrect, explanation, time spent, add-to-review |
| `/trace` | Trace Lab | Pseudocode + answer box + "step through" reveal |
| `/debug` | Debugging Lab | Problem + broken code editor + Run/Test + attempts + hint ladder |
| `/aic` | AI-Assisted Sim | 5-step wizard with per-step scoring and a live assistant pane |
| `/games` | Cognitive Arcade | Game picker + per-game stats + plateau indicator |
| `/games/[game]` | Game runner | Full-screen game, level, timer, score |
| `/comm` | Communication Studio | Essay / Speak / Listen / Read tabs |
| `/mock` | Full Mock | Profile picker → sequential stage runner → report |
| `/review` | Spaced repetition | Due items across all modules |
| `/log` | Submission log | Interview-prep export |
| `/content` | Content admin | Bank sizes, validation status, generate-more button |
| `/settings` | Settings | Exam date, drive profile, API key, timers, theme |

---

## Module specs

### Module 1 — MCQ Engine
**Input:** question bank filtered by `stage`, `topic`, `difficulty`, `tags`.
**Surface:** stem (markdown + optional code block), 4 options, timer, flag button.
**Behaviours:**
- No negative marking (matches reported exam), but the app records *confidence* (High/Low tap)
  so it can distinguish "knew it" from "guessed right" — guessed-right still enters review.
- Instant explanation after answer, always, including for correct answers.
- Per-question time budget shown (default 60s technical, 45s English, 60s AI literacy).
**Scoring:** `correct / attempted`, plus `mean_time`, plus `guess_rate`.

### Module 2 — Trace Lab
**Surface:** pseudocode block, "what is the output?" free-text or MCQ, then a **variable table
stepper** that replays execution line by line.
**Why the stepper matters:** tracing is a *procedure*. Seeing the correct variable table after
a wrong answer teaches the procedure; seeing only the right answer doesn't.
**Content requirement:** every trace item carries an `execution_trace` array (see
[`06-DATA-MODEL.md`](06-DATA-MODEL.md)) — this is non-negotiable and is what makes this module
worth building.

### Module 3 — Debugging Lab
**Surface:** problem statement, broken code in a Monaco editor, Run + Submit, test results.
**Two content sources:**
1. Hand/LLM-authored broken snippets
2. **Bug injection** — take a known-correct solution and mechanically apply one mutation from
   a chosen family (off-by-one, condition inversion, wrong variable, removed return, bad
   init, boundary overflow). Gives unlimited on-distribution reps. *Details in Phase 2.*
**Hint ladder** (costs score, but prevents a stuck 20 minutes): (1) bug family, (2) affected
function, (3) affected line range, (4) the diff.
**Scoring:** fixed-within-time (bool), attempts, time, hints used, minimality of diff.

### Module 4 — AI-Assisted Coding Simulator ⭐
The only module that *must* talk to an LLM. Five steps, each scored:

| Step | UI | Scored on (0–5 each) |
| --- | --- | --- |
| 1 Frame | Textarea: restate inputs/outputs/constraints/edge cases | Completeness vs. a hidden rubric of required elements |
| 2 Plan | Textarea: approach + target complexity | Correct approach, correct complexity |
| 3 Prompt | Textarea → sent to the real model; response shown | Presence of language, behaviour, constraints, edge cases, output format |
| 4 Review | Checklist + free text: what's wrong/risky in the output | Did you catch the planted/actual issues |
| 5 Refine | One follow-up prompt → final code | Targeted vs. restart; final correctness |

**Anti-cheat on yourself:** step 3 does not let you paste the problem statement verbatim —
it strips it, forcing you to *frame*. That single constraint is most of the training value.
**Offline fallback:** rubric-only self-scoring with a model answer revealed after submission.

### Module 5 — Cognitive Arcade
Four games, each faithful to the reported mechanic, all with: rules screen shown **before** the
timer, level progression, per-level timing, and a score curve.
- **Grid**: memorise dot positions on N×N, answer an interference task, then reproduce
- **Switch**: 4-symbol sequence → altered sequence → deduce the operator code
- **Digit**: fill missing digits/operators so LHS = RHS, each digit once, countdown
- **Motion**: sliding-block puzzle, minimum-move scoring
**Plateau detection:** fit a trend over last 10 sessions; when slope flattens, the dashboard
says *"plateau reached — stop grinding this, spend the time on X"*. This is a feature, not a
gimmick: it protects your scarcest resource.

### Module 6 — Communication Studio
- **Essay**: timed (25 min default), word count, autosave, then rubric grading
  (structure / grammar / vocabulary / task response / mechanics), LLM-assisted where available
- **Speak**: prompt → 45s think → record via MediaRecorder → transcribe via Web Speech API →
  score words-per-minute, filler-word count, pause distribution, sentence completeness
- **Listen**: TTS-generated audio → comprehension MCQ
- **Read**: passage → timed comprehension set, with reading-speed measurement

---

## Readiness model (what the dashboard actually computes)

Per stage, a 0–100 **readiness score**:

```
readiness = 100 * (0.50 * accuracy_recent
                 + 0.20 * speed_factor
                 + 0.20 * coverage
                 + 0.10 * consistency)
```

- `accuracy_recent` — accuracy over the last 50 attempts in that stage (or last 3 sessions)
- `speed_factor` — `clamp(target_time / your_mean_time, 0, 1)`
- `coverage` — fraction of that stage's P0 topics with ≥10 attempts
- `consistency` — `1 - (stdev of last 5 session scores / mean)`, clamped

**Banding:** `<50` 🔴 at risk · `50–69` 🟠 shaky · `70–84` 🟢 on track · `≥85` ⭐ safe.

**Today's recommendation** = the P0 topic with the lowest `readiness × topic_weight`, where
`topic_weight` comes from the syllabus map's priority. Simple, explainable, and it stops you
from doing the fun module instead of the needed one.

---

## Non-goals (stated so they don't creep in)

No accounts · no cloud sync · no leaderboards · no mobile-native app · no video hosting ·
no scraping of any prep site's question bank · no attempt to reproduce Capgemini's actual
proprietary items. All practice content is original or generated.
