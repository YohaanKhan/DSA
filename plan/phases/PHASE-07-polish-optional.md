# Phase 07 — Polish & Hardening (optional)

| | |
| --- | --- |
| **Goal** | Quality-of-life work that makes the app pleasant rather than merely functional. |
| **Time budget** | **0–3 hours, entirely discretionary** |
| **Prerequisites** | Phases 00–06 |
| **Skippable?** | **Yes, completely.** |

> **Read this first.** If you are inside your exam week and have any stage below 70 readiness,
> **do not build this phase.** Every hour here is an hour not drilling. This document exists so
> that "I could polish it" is a decision you make deliberately rather than drift into.
>
> Build from this list only if: all six stages are ≥70, you've done three mocks, and you have
> genuine slack. Otherwise close this file.

---

## Ordered by value-per-hour

### 1. Keyboard-only operation (20 min) — *the one genuinely worth doing*
Extend Phase 01's shortcuts everywhere: `G D` dashboard, `G R` review, `G M` mock,
`?` shortcut sheet, `Esc` closes any modal. At 300+ questions a day the mouse round-trips are
real minutes, and the friction is what makes you stop early.

### 2. Question-quality feedback loop (30 min)
A "this question is wrong / ambiguous" button that writes to a `content_issues` table and
excludes the item from selection pending review. Generated banks *will* contain a few bad
items; the failure mode is you silently learning something false. This is the cheapest
insurance in the plan and arguably belongs in Phase 01 if you have the time.

### 3. Export / import progress (20 min)
Dump `attempts`, `sessions`, `review_cards`, `game_runs` to a JSON file and restore. Insurance
against a corrupted SQLite file on day 5. Also lets you move to another machine.

### 4. Printable revision sheet (30 min)
One-page PDF/print view per stage: the topics you're weakest at, your most-missed questions, and
the key formulas/rules. For the 20 minutes before the exam when you shouldn't be on a screen.

### 5. Dark mode + typography pass (20 min)
You'll be reading code and prose for hours. Proper monospace, comfortable line height, and a
dark theme that doesn't have you squinting at 1am is not vanity — it's endurance.

### 6. Mobile-responsive read-only views (45 min)
Review queue and MCQ drills on a phone, for commute reps. Explicitly **not** the editor, games,
mock, or speaking modules — those need a desktop and pretending otherwise creates bad practice
conditions.

### 7. Sound and haptics (15 min)
Timer warnings at 25% and 10%; a soft tick in the last 10 seconds. Trains time-awareness without
you watching the clock — which is the actual skill.

### 8. Content stats page (25 min)
Bank sizes per topic, coverage gaps against the topic registry, answer-key distribution, duplicate
warnings, rejected-item reasons. Tells you where to point the generator next.

### 9. Session replay for games (30 min)
Since generation is seeded, store the seed and replay a run move-by-move. Useful once for
understanding *why* you fail Motion Challenge at depth 8; not useful twice.

### 10. Anthropic API cost dashboard (15 min)
You have the `llm_calls` data already; a chart of spend by purpose over time. Nice to have,
affects nothing.

---

## Things deliberately left off this list

| Not doing | Why |
| --- | --- |
| Authentication | Single user, local machine |
| Deployment / hosting | Adds ops burden, zero practice value, and exposes the code runner |
| Multi-user / sharing | Out of scope per the brief |
| Native mobile app | Days of work for commute reps you can get from a responsive page |
| Fancy animations | Pure cost |
| A second LLM provider | One works |
| Comprehensive UI test suite | The app has a 1-week lifespan; Vitest on scoring + timer is the right amount of testing |

---

## Post-exam (if the app outlives the week)

Worth doing only if you decide to keep or share it:

- **Sandbox the code runner** (Docker, seccomp, or make Piston the default) — mandatory before
  anyone else runs it
- Extract content banks into a separate repo so others can contribute questions
- Add remaining stages/topics you skipped
- Write up what the assessment was *actually* like vs. this dossier, and correct
  [`../01-RESEARCH-DOSSIER.md`](../01-RESEARCH-DOSSIER.md). Publicly reported patterns are how
  everyone here got their information; contributing an accurate first-hand account back is the
  decent thing to do.

## Commit
```
chore(polish): keyboard navigation, content feedback and export
```
