# Phase 04 — Cognitive Arcade

| | |
| --- | --- |
| **Goal** | Faithful, procedurally-generated re-implementations of the four most-reported games, with level progression, timing, scoring, and **plateau detection**. |
| **Time budget** | **3 hours** (45 min per game) |
| **Prerequisites** | Phase 00 (the timer) |
| **Unlocks** | Stage 5 |
| **Skippable?** | **Partially — see below.** |

> **The honest framing.** Cognitive games measure a trait more than a skill. You cannot grind
> your working memory up two standard deviations in a week. What you *can* do, and what is worth
> exactly three hours, is:
> 1. **Remove all surprise** — never read a rule on the clock (the #1 cited avoidable loss)
> 2. **Learn each game's optimal strategy** — which is learnable and does move the score
> 3. **Find your plateau and stop** — protecting the rest of your week
>
> **If you are behind schedule, build only Grid and Digit** (the two most-reported, and the two
> with the most learnable strategy), watch the YouTube playlists for the other two, and move on.

---

## Shared: `GameShell` (30 min)

`src/components/games/GameShell.tsx` handles everything common:

- **Rules screen shown before every run, always, with a "Start" button.** Never auto-start.
  This mirrors the discipline you need in the exam: read the rules, *then* start the timer.
- Level indicator, per-level timer (using `useExamTimer`), total-run timer
- Score = `Σ level² / secondsAtLevel` per [`../07-SCORING-AND-ANALYTICS.md`](../07-SCORING-AND-ANALYTICS.md#7-game-scoring-libscoring-per-game)
- **Live "next level is worth X, you have Y seconds left" indicator** — teaches the squared-reward
  intuition that depth beats speed-at-shallow-levels
- Writes a `game_runs` row with `levelTimings`
- Post-run: score, max level, per-level times, trend vs. last 10 runs, plateau verdict

A `GameEngine` interface each game implements:
```ts
interface GameEngine<S> {
  generate(level: number, rng: Rng): S;         // seeded → reproducible for debugging
  render(state: S, onAnswer: (a: unknown) => void): ReactNode;
  check(state: S, answer: unknown): boolean;
  secondsFor(level: number): number;
}
```
Seeded RNG (`mulberry32`) so a bad level can be reproduced from its seed.

---

## Game 1 — Grid Challenge (45 min) 🔴

**Reported mechanic:** remember dot locations on a grid while solving a symmetry or rotation
challenge between displays.

**Implementation:**
```
Phase A (memorise, 2–4 s): N×N grid, K dots lit
Phase B (interference, 3–5 s): a symmetry/rotation task —
        "is this shape symmetric about the vertical axis?" or
        "is shape B a rotation of shape A?" — answer yes/no
Phase C (recall): blank N×N grid; click the K cells that were lit
```
Correct = **all K** cells exactly right. Partial credit teaches sloppiness; the real thing
doesn't give it.

**Level curve:**

| Level | N | K | Memorise | Interference |
| --- | --- | --- | --- | --- |
| 1–2 | 4 | 3 | 4.0 s | 3 s |
| 3–4 | 4 | 4 | 3.5 s | 3 s |
| 5–6 | 5 | 4 | 3.0 s | 4 s |
| 7–8 | 5 | 5 | 3.0 s | 4 s |
| 9–10 | 6 | 5 | 2.5 s | 5 s |
| 11+ | 6 | 6 | 2.0 s | 5 s |

**Strategy the app should teach** (shown on the rules screen, then in post-run tips):
chunk dots into shapes rather than storing coordinates ("an L in the top-left") · verbalise the
row numbers · use the interference task's own rhythm to rehearse · always answer the
interference task, even by guessing, because dwelling on it destroys the memory trace.

---

## Game 2 — Switch Challenge (45 min) 🔴

**Reported mechanic:** an initial sequence of 4 geometric symbols and an altered result; deduce
which numerical operator code produced the change.

**Implementation:**
```
Operators (each a code, e.g. 1..6):
  1 swap positions 1↔2      2 swap positions 3↔4
  3 rotate sequence right   4 reverse the whole sequence
  5 replace shape at 2 with the next shape in the cycle
  6 swap positions 1↔4
Level L applies L' operators (L' = 1 for L≤2, 2 for L≤5, 3 for L≤9, 4 beyond)
Show before + after; ask which operator code(s), in order, were applied
```

**Level curve:** 1 operator from a pool of 3 → 1 from 6 → 2 from 6 → 3 from 6, with the time
allowance shrinking from 30 s to 15 s.

**Strategy to teach:** work **backwards from the result** · find the one position that didn't
move and eliminate every operator that would have moved it · for multi-operator levels, identify
the *last* operator first (it explains the most visible difference) · maintain an
operator-effect table mentally rather than re-deriving each time.

---

## Game 3 — Digit Challenge (45 min) 🔴

**Reported mechanic:** an equation with missing operators and digits; select from a keypad to
balance it. Each digit usable once. Rapid countdown.

**Implementation:**
```
Generate a true equation, blank out cells, offer a digit/operator bank
e.g.  _ + _ = 12   with bank {3,4,5,7,9}, each usable once  → 3+9 or 5+7
Validate: the filled equation evaluates true AND respects use-once
```
**Level curve:** two-term addition → mixed +/− → three terms → include ×/÷ → two equations
sharing a bank. Time per level 20 s → 8 s.

**Strategy to teach:** scan the bank for the target **complement** first (for `_+_=12` with
`{3,4,5,7,9}`, look for pairs summing to 12) · use parity to eliminate (odd+odd=even) ·
for multiplication, factorise the target before scanning · **don't compute exhaustively —
constrain, then check**.

This game is pure trained speed, and it is the one where practice genuinely moves the number.
Pair it with [zetamac](https://arithmetic.zetamac.com/) for raw arithmetic reps.

---

## Game 4 — Motion Challenge (45 min) 🟠

**Reported mechanic:** sliding-block puzzle; get the target block to the exit in the **minimum**
number of moves.

**Implementation:** a Rush-Hour-style board. Generate by running BFS **backwards** from a solved
state for exactly `D` moves, where `D` is the level's target depth — this guarantees a solvable
puzzle with a *known* optimal solution, which is what lets you score minimality.

**Level curve:** D = 3, 4, 5, 6, 8, 10, 12…
**Scoring:** solved-in-optimal = full credit; each extra move −10%; failure to solve = 0.

**Strategy to teach:** identify the blocking chain to the exit and work backwards from it ·
plan ≥2 moves ahead before touching anything · **don't take the first solution you see** —
the score is minimum moves, not any solution · count your planned moves before executing.

---

## Plateau detection (20 min)

Per [`../07-SCORING-AND-ANALYTICS.md`](../07-SCORING-AND-ANALYTICS.md#plateau-detection):
linear fit over the last 10 runs; plateau when slope `< 0.02 × mean` and n ≥ 8.

When a game plateaus:
- The arcade page marks it **"Plateaued — stop grinding"**
- Its dashboard `stageWeight` drops to 0.3 so "today's recommendation" stops sending you here
- A banner names where to spend the time instead

**This is a real feature, not decoration.** The most common way to waste a prep week is to keep
playing the fun module. The app should actively stop you.

---

## Acceptance tests

- [ ] Rules screen precedes every run; nothing auto-starts
- [ ] Grid: all-K-correct required; level curve advances as specified
- [ ] Switch: puzzles are uniquely determined (no two operator sequences produce the same result — verify by brute force at generation time)
- [ ] Digit: every generated equation has ≥1 valid solution under the use-once rule
- [ ] Motion: every puzzle is solvable and its optimal depth is known (BFS-backwards construction)
- [ ] Score uses `level²/seconds`; per-level timings are persisted
- [ ] Plateau fires after 8 flat runs and changes the dashboard recommendation
- [ ] A seed reproduces a level exactly

## Done when

You've played each game enough to know its rules cold and have hit a measurable plateau on at
least two of them.

## Commit
```
feat(games): cognitive arcade with four games and plateau detection

Grid, Switch, Digit and Motion challenges with seeded procedural
generation, level curves, level-squared-over-time scoring, strategy
coaching, and plateau detection that down-weights the stage once
further practice stops paying.
```

## What this unlocks for studying

**Cap this at 20 minutes a day.** The goals are: know every rule cold, internalise each game's
strategy, hit your plateau. Once the app says plateaued, stop — and believe it.
