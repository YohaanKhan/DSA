# 05 — Architecture

## Stack decision

| Layer | Choice | Why this and not the alternative |
| --- | --- | --- |
| Framework | **Next.js 15 (App Router) + TypeScript** | One process serves UI *and* API routes. You need server-side code (compile/run, LLM calls with a secret key) but not a second service. Alternative (Vite SPA + Express) = two things to run, no benefit. |
| Styling | **Tailwind CSS v4** + a few shadcn/ui primitives | Fast, no design system to invent. Copy-in components, no runtime dependency. |
| State | **React state + TanStack Query** for server data; **Zustand** only for the live-timer/game state | Timers and games need a store outside React re-render cycles; everything else is server data. Redux is overkill. |
| Database | **SQLite via better-sqlite3 + Drizzle ORM** | Local-first, zero setup, synchronous (simplifies API routes), real SQL for the analytics queries. Alternative (IndexedDB) makes cross-module analytics painful and loses the data if you clear the browser. |
| Code editor | **Monaco** (`@monaco-editor/react`) | Needed for the Debugging Lab. Has C/C++/Java syntax + diffing built in. |
| Code execution | **Pluggable `CodeRunner`**: `LocalRunner` (gcc/g++/javac) ‖ `PistonRunner` (remote) | Local is fast and offline; remote is the fallback if you lack toolchains. See below. |
| LLM | **Anthropic SDK**, model `claude-sonnet-5` (drills) / `claude-opus-5` (grading) | Needed for the AI-assisted round and essay/speech grading. Key stays server-side in `.env.local`. |
| Speech | **Web Speech API** (recognition) + **MediaRecorder** (capture) + **SpeechSynthesis** (TTS for listening) | Browser-native, free, no API cost. Chrome required for recognition — documented as such. |
| Charts | **Recharts** | Readiness trends. Small, declarative. |
| Validation | **Zod** | One schema definition used for both content validation and API input. |
| Testing | **Vitest** + **Playwright** (smoke only) | Content validation and scoring logic need real tests; UI does not, given the timeline. |

### Why not a simpler static site?
Three modules can't be static: Debugging Lab needs to *compile and run* code; AI-Assisted
Simulator needs a *server-held API key*; analytics needs *cross-session SQL*. Once you need a
server for one, you should use it for all.

---

## Repository layout

```
app/                                  # the Next.js app (created in PHASE-00)
├── src/
│   ├── app/                          # App Router
│   │   ├── layout.tsx
│   │   ├── page.tsx                  # Dashboard
│   │   ├── drill/
│   │   │   ├── page.tsx              # builder
│   │   │   └── [sessionId]/
│   │   │       ├── page.tsx          # runner
│   │   │       └── review/page.tsx
│   │   ├── trace/page.tsx
│   │   ├── debug/page.tsx
│   │   ├── aic/page.tsx
│   │   ├── games/
│   │   │   ├── page.tsx
│   │   │   └── [game]/page.tsx
│   │   ├── comm/page.tsx
│   │   ├── mock/page.tsx
│   │   ├── review/page.tsx
│   │   ├── log/page.tsx
│   │   ├── content/page.tsx
│   │   ├── settings/page.tsx
│   │   └── api/
│   │       ├── sessions/route.ts
│   │       ├── sessions/[id]/answer/route.ts
│   │       ├── sessions/[id]/finish/route.ts
│   │       ├── questions/route.ts
│   │       ├── run/route.ts          # CodeRunner endpoint
│   │       ├── aic/[step]/route.ts   # AI-assisted scoring per step
│   │       ├── grade/essay/route.ts
│   │       ├── grade/speech/route.ts
│   │       ├── readiness/route.ts
│   │       └── content/validate/route.ts
│   ├── components/
│   │   ├── ui/                       # shadcn primitives
│   │   ├── drill/                    # QuestionCard, OptionList, Timer, ProgressBar
│   │   ├── trace/                    # VariableTable, Stepper
│   │   ├── debug/                    # CodeEditor, TestResults, HintLadder
│   │   ├── aic/                      # StepWizard, AssistantPane, RubricScore
│   │   ├── games/                    # GridGame, SwitchGame, DigitGame, MotionGame, GameShell
│   │   ├── comm/                     # EssayEditor, Recorder, RubricReport
│   │   └── dashboard/                # ReadinessCard, TrendChart, TodayCard
│   ├── lib/
│   │   ├── db/
│   │   │   ├── schema.ts             # Drizzle schema
│   │   │   ├── client.ts
│   │   │   ├── migrate.ts
│   │   │   └── seed.ts
│   │   ├── content/
│   │   │   ├── schemas.ts            # Zod schemas for every content type
│   │   │   ├── loader.ts             # read + validate content/*.json
│   │   │   ├── validate.ts           # self-check rules (see below)
│   │   │   └── generate.ts           # LLM generation harness
│   │   ├── scoring/
│   │   │   ├── mcq.ts
│   │   │   ├── debug.ts
│   │   │   ├── aic.ts                # the 5-step rubric
│   │   │   ├── essay.ts
│   │   │   ├── speech.ts
│   │   │   └── readiness.ts
│   │   ├── srs/sm2.ts                # spaced repetition
│   │   ├── runner/
│   │   │   ├── index.ts              # CodeRunner interface
│   │   │   ├── local.ts
│   │   │   └── piston.ts
│   │   ├── mutation/                 # bug injection for Debugging Lab
│   │   │   ├── index.ts
│   │   │   └── mutators.ts
│   │   ├── llm/
│   │   │   ├── client.ts             # Anthropic SDK wrapper
│   │   │   └── prompts.ts            # all system prompts, one place
│   │   └── config/
│   │       └── exam-profiles.ts      # drive presets
│   └── types/
├── content/                          # the question banks (JSON, git-tracked)
│   ├── mcq/
│   │   ├── ai-literacy.json
│   │   ├── technical-dsa.json
│   │   ├── technical-oop.json
│   │   ├── technical-dbms.json
│   │   ├── technical-os.json
│   │   ├── technical-networks.json
│   │   ├── technical-git-se.json
│   │   └── english.json
│   ├── trace/pseudocode.json
│   ├── debug/                        # one folder per problem
│   ├── aic/problems.json
│   ├── comm/{essay,speak,listen,read}.json
│   └── behavioural/adept.json
├── data/exceller.sqlite              # gitignored
├── scripts/
│   ├── generate-content.ts
│   ├── validate-content.ts
│   └── inject-bugs.ts
├── drizzle/                          # migrations
├── .env.example
└── package.json
```

---

## Key subsystem designs

### `CodeRunner` (Debugging Lab)

```ts
export interface RunRequest {
  language: 'c' | 'cpp' | 'java';
  source: string;
  stdin?: string;
  timeoutMs?: number;      // default 5000
}
export interface RunResult {
  ok: boolean;
  compileError?: string;
  stdout: string;
  stderr: string;
  exitCode: number;
  timedOut: boolean;
  durationMs: number;
}
export interface CodeRunner { run(req: RunRequest): Promise<RunResult>; }
```

**`LocalRunner`** — writes to a temp dir under `app/.scratch/`, invokes `gcc` / `g++` / `javac`+`java`,
kills on timeout, caps output size, deletes the dir in a `finally`. Detected at startup by
probing for the compilers; if absent, the app falls back automatically.

**Safety, stated honestly:** this executes code you wrote, on your machine, unsandboxed beyond a
timeout and an output cap. That is acceptable for a single-user local tool where you are the
only author, and is *not* acceptable if you ever expose this app to anyone else. If you want
real isolation, run `LocalRunner` inside a container or use `PistonRunner`. Documented in the
app's README.

**`PistonRunner`** — POSTs to a Piston-compatible endpoint (`/api/v2/execute`), configurable
base URL. No key needed for the public instance; rate-limited, so it's the fallback not the default.

### Bug injection (`lib/mutation`)

Takes a known-correct source + a target bug family, returns `{ mutated, answer }`.
Implemented as **regex/AST-guided textual mutators**, one per family:

| Mutator | Transformation |
| --- | --- |
| `offByOne` | `<` ↔ `<=`, `>` ↔ `>=`, `n` → `n-1` / `n+1` in a bound |
| `invertCondition` | `==` ↔ `!=`, negate a boolean sub-expression, swap `&&`/`\|\|` |
| `wrongVariable` | Swap two same-typed identifiers in one expression |
| `dropReturn` | Remove a `return` inside a branch |
| `badInit` | Change an accumulator's initial value (`0` ↔ `1`, `INT_MAX` ↔ `0`) |
| `boundaryOverflow` | Change a loop bound to touch `arr[n]` |
| `assignInCondition` | `==` → `=` inside an `if` (C/C++) |
| `wrongOperator` | `+` ↔ `-`, `*` ↔ `/`, `++` ↔ `--` |

Each mutator returns the exact line changed, so the **hint ladder** and the post-hoc diff are
free. Validity check: the mutated program must still compile (for syntax-preserving families)
**and** must fail at least one test. If not, retry with a different site. This guarantees every
generated exercise is genuinely broken and genuinely detectable.

### LLM usage (`lib/llm`)

All calls server-side. Key in `.env.local` (`ANTHROPIC_API_KEY`), never shipped to the client.

| Use | Model | Why |
| --- | --- | --- |
| Content generation (offline script) | `claude-opus-5` | Quality matters most; runs once |
| AI-assisted round: the assistant you prompt | `claude-sonnet-5` | Fast, realistic stand-in for the exam's assistant |
| AI-assisted round: scoring your steps | `claude-opus-5` | Judgment task against a rubric |
| Essay grading | `claude-opus-5` | Judgment task |
| Speech feedback (on transcript) | `claude-sonnet-5` | Mostly mechanical |

**Cost control:** every LLM route is metered and logged to the DB with token counts; the
settings page shows cumulative spend. Caching on identical inputs. A hard daily cap
(configurable, default ₹ equivalent of ~$2) that disables LLM features and falls back to
rubric-only mode rather than silently burning money.

**Graceful degradation:** if no API key is set, the app still runs. Modules 1, 2, 3, 5 are
fully functional. Module 4 runs in "rubric-only" mode (you self-score against the revealed
rubric, and a static model answer is shown). Module 6 essay/speech falls back to
mechanical metrics (word count, structure heuristics, filler count, WPM) with no LLM prose.

### Exam profiles (`lib/config/exam-profiles.ts`)

```ts
export const PROFILES = {
  'reported-2026-default': {
    label: 'Reported 2026 pattern (default)',
    sections: [
      { id: 'english-mcq',  count: 30, minutes: 30, pools: ['english'] },
      { id: 'essay',        count: 1,  minutes: 25, pools: ['essay'] },
      { id: 'speaking',     count: 3,  minutes: 8,  pools: ['speak'] },
      { id: 'ai-literacy',  count: 20, minutes: 20, pools: ['ai-literacy'] },
      { id: 'technical',    count: 20, minutes: 20, pools: ['technical-*', 'trace'] },
      { id: 'debugging',    count: 1,  minutes: 20, pools: ['debug'] },
      { id: 'aic',          count: 1,  minutes: 30, pools: ['aic'] },
      { id: 'games',        count: 4,  minutes: 27, pools: ['games'] },
      { id: 'behavioural',  count: 40, minutes: 0,  pools: ['adept'] }, // 0 = untimed
    ],
  },
  'combined-40': { /* 40 combined technical MCQs in 40 min */ },
  'pseudocode-heavy': { /* 25 pseudocode / 25 min as its own section */ },
} as const;
```

**This is the single file you edit when you learn your actual drive's pattern.** It is the
architectural answer to the conflicting reports in the research dossier.

---

## Architecture decision records (short form)

| ADR | Decision | Rejected alternative | Reason |
| --- | --- | --- | --- |
| 001 | SQLite on the server | IndexedDB in the browser | Cross-module analytics need SQL; browser storage is losable |
| 002 | Content as git-tracked JSON, seeded into DB | Content stored only in DB | Reviewable in diffs, regenerable, portable, survives a DB wipe |
| 003 | Pluggable code runner | Hard-wire Judge0 | You may not have Docker; you may not have internet |
| 004 | LLM optional, not required | LLM-first | The app must work on exam-eve with no internet |
| 005 | One timer implementation (`useExamTimer`) shared by all modules | Per-module timers | Timer drift and pause semantics are the #1 source of bugs in this kind of app |
| 006 | Zod schema is the single source of truth for content | Separate TS types + validation | Prevents the type/validator drift that lets bad questions through |
| 007 | Games re-implemented from reported mechanics, not copied | Attempt pixel-accurate clone | Legally clean and pedagogically equivalent — we train the skill, not the UI |

---

## Environment

`.env.example`:
```
ANTHROPIC_API_KEY=            # optional; enables Module 4 scoring + essay grading
LLM_DAILY_CAP_USD=2
CODE_RUNNER=auto              # auto | local | piston
PISTON_BASE_URL=https://emkc.org/api/v2/piston
EXAM_DATE=2026-09-26
EXAM_PROFILE=reported-2026-default
```

## Requirements
- Node 20+
- Optional: `gcc`, `g++`, `javac`/`java` for `LocalRunner`
- Chrome/Edge for the speaking module (Web Speech API)
