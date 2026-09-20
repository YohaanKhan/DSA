# Exceller Trainer

A local-first practice app for the Capgemini Exceller 2026 assessment.
Design and rationale live in [`../plan/`](../plan/).

## Run it

From a fresh clone, two commands:

```bash
npm install
npm run setup                  # .env.local, migrations, content, and a report
npm run dev                    # http://localhost:3000
```

`npm run setup` applies the migrations, seeds every content bank, validates them,
and then prints what it found — including which optional pieces are missing and
exactly what each one costs you. Nothing it reports as missing stops the app
running; the features concerned fall back to deterministic scoring.

Re-running it is safe: the seeder is idempotent, and an existing `.env.local` is
left alone.

## Scripts

| Command | Does |
| --- | --- |
| `npm run setup` | Migrations, seed, validate, and a readiness report |
| `npm run dev` | Dev server (Turbopack) |
| `npm run build` | Production build |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint |
| `npm test` | Vitest — content validation, timer, design tokens |
| `npm run content:validate` | Runs the 15 content rules; exits non-zero on any violation |
| `npm run db:generate` | Generate a Drizzle migration from the schema |
| `npm run db:migrate` | Apply migrations |
| `npm run db:seed` | Load `content/` into the database (idempotent) |
| `npm run content:inject` | Turn `content/solutions/*` into debugging exercises (free — no LLM) |
| `npm run content:verify-aic` | Compile each AIC reference solution and check each fallback genuinely fails |
| `npm run screenshot` | Visual smoke check across themes and phone width |

## What exists today

**Phase 00 — foundation**
- Design system: tokens, custom icon set, hand-built primitives, no UI library
- SQLite schema (10 tables) via Drizzle
- Content pipeline: Zod schemas, topic registry, 15 validation rules, idempotent seeder
- `useExamTimer` — the shared, drift-free timer
- App shell, readiness dashboard, settings

**Phase 01 — drill engine**
- Session API with **server-side grading**; the answer key and execution trace never
  reach the browser before you answer
- Four selection strategies: `weakest` (the default), `unseen`, `due`, `random`
- Keyboard-first runner with confidence capture, per-question budget and instant explanations
- Trace Lab with a variable-table stepper that replays execution line by line
- SM-2 spaced repetition, capped at a 3-day interval so nothing goes stale before the exam
- Content generator using structured outputs, with validation and answer-key rebalancing

**Phase 02 — debugging lab**
- Pluggable code runner for C, C++ and Java: process-group kill, separate
  compile/run timeouts, output caps, toolchain detection, remote Piston fallback
- Bug-injection engine with a validity loop, so every generated exercise is
  **provably broken** (fails a test) and **provably fixable** (the reference passes)
- Read → hypothesise → fix → validate flow with a locked editor, scored hint
  ladder, minimal-diff feedback and an edge-case checklist
- Language-trap MCQ set for the classic C/C++/Java gotchas

**Phase 03 — AI-assisted coding**
- Forward-only Frame / Plan / Prompt / Review / Refine wizard, weighted 20/15/30/25/10
- **The anti-paste rule**: a prompt that is ≥70% lifted from the problem statement is
  rejected, so you cannot practise the behaviour the round penalises
- The assistant is deliberately literal — a vague prompt produces visibly deficient code
- Review is penalised 0.5 per invented issue, so ticking everything backfires
- Works with no API key: all five steps still score, and a scripted flawed reply gives the
  review step something real to catch

**Phase 06 — mock, dashboard, review and log**
- Drive profiles as data in `src/lib/config/exam-profiles.ts` — **the one file to edit** when
  you learn your own drive's pattern
- Sequential mock with per-section clocks, no going back, and gate verdicts shown without
  stopping the run
- Crash-safe: remaining time is recomputed from wall-clock timestamps, so resuming gives
  nothing back
- Report at `/mock/[id]/report`: verdict, per-section bars, rushed / over-dwelt analysis,
  topic heatmap and the three things to fix next
- Interleaved SM-2 review queue, and a submission log that exports to Markdown for the
  technical interview

**Phase 04 — cognitive arcade**
- Grid, Switch, Digit and Motion challenges, procedurally generated from a seed, so the
  post-run screen prints a seed and `/games/<id>?seed=N` replays those exact levels
- Each generator **proves its own puzzles**: Switch brute-forces every operator sequence and
  keeps only uniquely determined ones; Digit re-derives a use-once solution; Motion
  enumerates the board's reachable component and walks a multi-source BFS backwards from
  every solved state, so the "optimal moves" it scores you against is a fact, not a guess
- The rules screen precedes every run, with no auto-start
- Scoring is level² / seconds, with the marginal value of the next level shown live
- **Plateau detection**: a flat slope over eight or more runs drops the stage's dashboard
  weight to 0.3, so the app stops sending you to the fun module and sends you to a gate

**Phase 05 — communication studio**
- Timed essay: autosaves to this machine *and* the database every ten seconds, survives a
  refresh, nudges you to stop planning and then to start proofreading, and auto-submits at zero
- Essay grading in two layers — the mechanical one (length, paragraphing, intro/conclusion
  detection, run-ons, lexical variety, connector density, passive ratio, prompt coverage)
  always runs with no key; the model layer adds the grammar band and rewrites of *your own*
  sentences when a key is set. Grammar is reported as **not scored** offline rather than guessed
- Speaking: 45-second think timer, 90-second window, and six metrics computed locally from the
  transcript — pace, filler rate, pause profile, point coverage, sentence completion, time used
- Accent is never scored, here or in the reported rubric
- Without the Web Speech API the studio still records and measures pauses and timing, and says
  plainly which metrics it could not take
- 30 essay prompts, 24 speaking prompts and 36 grammar/vocabulary questions, hand-authored

**Content — 926 items, all hand-authored and validated**
- technical 400, english 298, ai-literacy 162, debugging 58, AI-assisted coding 8
- **Eight numbered mock papers with no question shared between any two of them**
- Trace answers are verified by executing an equivalent program, not by the author's reasoning
- Debug exercises are mutated from solutions that compiled and passed first, so each is
  provably broken and provably fixable
- AIC reference solutions are compiled and run, and every offline fallback is proven to fail

Listening and reading drills are deliberately not built — they are the least-reported
components, and text-to-speech is a poor stand-in for real exam audio.

## Keyboard shortcuts (drill runner)

| Key | Does |
| --- | --- |
| `1`–`4` | Pick an option |
| `S` / `G` | Mark the answer as Sure / a Guess |
| `F` | Flag for later |
| `Enter` | Submit, or advance once answered. In Trace Lab it walks focus to the next required step. |
| `Space` | Next question, after answering |
| `←` `→` | Step the variable table |

## Requirements

- Node 20.9+
- Optional: `gcc`, `g++`, `javac` for the local code runner (Phase 02)
- Chrome or Edge for the speaking module (Phase 05) — it uses the Web Speech API

## Configuration

All optional; see `.env.example`.

- `ANTHROPIC_API_KEY` — enables AI-assisted coding scoring, essay grading and content
  generation. **Without it the app still runs**: those features fall back to deterministic
  rubric scoring.
- `LLM_DAILY_CAP_USD` — when exceeded, assisted features degrade rather than bill you.
- `CODE_RUNNER` — `auto` (default), `local`, or `piston`.
- `DB_FILE` — the database file name. It always lives under `app/data/`.
- `NEXT_PUBLIC_EXAM_DATE`, `NEXT_PUBLIC_EXAM_PROFILE`.

## Security

The local code runner compiles and executes code on this machine with a timeout and an
output cap, and nothing else. That is acceptable for a single-user local tool where you
write all the code it runs.

**Do not expose this app to a network.** If you need isolation, set `CODE_RUNNER=piston`
or run the app inside a container.

## Known issues

- `npm audit` reports a moderate advisory against `esbuild`, reached only through the
  `drizzle-kit` CLI (a dev-time tool). The advisory concerns esbuild's dev server, which
  this project never runs. `npm audit fix --force` would downgrade `drizzle-kit` to a
  breaking major, so it is left as-is deliberately.
