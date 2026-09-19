# Exceller Trainer

A local-first practice app for the Capgemini Exceller 2026 assessment.
Design and rationale live in [`../plan/`](../plan/).

## Run it

```bash
npm install
cp .env.example .env.local     # every value is optional
npm run db:migrate
npm run db:seed
npm run dev                    # http://localhost:3000
```

## Scripts

| Command | Does |
| --- | --- |
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

Every other route is a stub naming the phase that builds it.

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
