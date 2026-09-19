# Phase 06 — Full Mock + Readiness Dashboard

| | |
| --- | --- |
| **Goal** | Tie all six modules into a single exam-condition run with elimination rules enforced, and make the dashboard tell you what to do each morning. |
| **Time budget** | **2.5 hours** |
| **Prerequisites** | Phases 00–05 (works with whatever subset you built) |
| **Unlocks** | Exam-condition rehearsal + the diagnostic loop that directs the whole week |
| **Skippable?** | **No.** Without this, the app is six disconnected drills. |

> This phase is what converts a collection of practice tools into something that *answers the
> question you actually have*: **"am I going to clear this, and what should I do about it?"**

---

## Step 6.1 — Mock runner (60 min)

`src/app/mock/page.tsx`

**Profile picker** → an exam profile from
[`../05-ARCHITECTURE.md`](../05-ARCHITECTURE.md#exam-profiles-libconfigexam-profilests):
`reported-2026-default` · `combined-40` · `pseudocode-heavy` · `custom`.

**Sequential stage runner.** Each section, in order:
1. **Instructions screen** — section name, question count, time limit, and an explicit
   *"you cannot return to this section"* warning. Mirrors the real thing and removes
   in-exam surprise.
2. Section runs with the shared timer. **No pause. No back button. No confidence toggle**
   (realism wins over telemetry in mock mode).
3. Auto-submit on expiry.
4. Short break screen with a **60-second countdown** and a skip button — long enough to breathe,
   short enough to preserve fatigue realism.

**Elimination enforcement.** After each eliminatory section, evaluate against the profile's
`passMark` (default 60%). If failed, show:

> ⛔ **Gate failed: Technical Module (52%).** In the real assessment your process would end here.
> Continuing for diagnostic data — your later scores still count for your dashboard.

**Do not actually stop the mock.** You need the data from every stage far more than you need the
drama. But you must *see* the verdict, because the whole point of a gated exam is learning that
adequate-everywhere beats brilliant-somewhere.

**Persistence:** a mock survives a browser crash. Section state is written to the DB after every
answer; reopening `/mock` offers **"Resume mock in progress (Technical, 12:31 remaining)"**.
The remaining time is recomputed from wall-clock, not from a stored countdown, so you can't
gain time by crashing.

---

## Step 6.2 — Mock report (50 min)

`src/app/mock/[id]/report/page.tsx` — six blocks, in this order:

1. **Verdict banner.** Would you have progressed? Which gate failed *first*? One sentence.
2. **Per-stage bars.** This mock vs. your best vs. your average, with the pass line drawn.
3. **Time analysis.** Per section: time used; questions **rushed** (< 40% of `targetSeconds`);
   questions **over-dwelt** (> 200%). Over-dwelling is the more common killer — and note the
   questions you over-dwelt on *and still got wrong*, which is the pure-waste category.
4. **Topic heatmap.** Accuracy per topic, coloured, sorted worst-first, sized by question count.
5. **The three things to fix before the next mock.** Auto-derived: rank
   `(1 - accuracy) × priorityWeight × frequencyInExam` and take the top three, each with a
   one-click "drill this now" button.
6. **Every wrong answer** with explanation and "add all to review queue".

Blocks 3 and 5 are the ones you'll actually act on. Build those two properly even if you
shortcut the charts.

---

## Step 6.3 — Readiness dashboard (50 min)

`src/app/page.tsx` — the home screen, and the most-viewed page in the app.

**Above the fold:**

```
┌──────────────────────────────────────────────────────────┐
│  4 days to exam                            Streak: 3 🔥   │
├──────────────────────────────────────────────────────────┤
│  TODAY                                                    │
│  🔴 Debugging is your weakest gate (41, at risk)          │
│  → 45 min: 3 debugging exercises (logic errors)  [START]  │
│  → then:   20 AI Literacy questions (due review) [START]  │
└──────────────────────────────────────────────────────────┘

 English 72 🟢   AI-Lit 88 ⭐   Technical 65 🟠
 Debugging 41 🔴  AI-Coding 58 🟠  Cognitive ⬜ Untested
```

**The rules that make this useful rather than decorative:**
- **Untested is ⬜ grey, never 0.** An untested stage is not a failing stage, and displaying it
  as 0 makes the dashboard lie to you. Untested sorts *first* in recommendations.
- **At most two recommendations.** A dashboard that lists nine things gets ignored. Pick the
  worst P0 gap and the review queue, and stop.
- **One click to start.** J1 from the product spec. If the recommendation takes three clicks
  to act on, you'll open the fun module instead.
- **Trend sparkline per stage** (last 7 days). Direction matters more than level with four days
  left — a 55 trending up beats a 65 that's been flat since Monday.
- **Plateaued cognitive games are down-weighted** so the dashboard stops recommending them.

`GET /api/readiness` computes all six per
[`../07-SCORING-AND-ANALYTICS.md`](../07-SCORING-AND-ANALYTICS.md#9-readiness-libscoringreadinessts),
writes a `readiness_snapshots` row (so trends exist), and returns current + 7-day history.

---

## Step 6.4 — Review queue + submission log (20 min)

**`/review`** — SM-2 due items across every module, mixed. Interleaving beats blocking for
retention, so **do not** group by topic. Shows `N due today`; the dashboard surfaces the count.
With `MAX_INTERVAL_DAYS = 3`, nothing learned on Day 1 goes unreviewed before the exam.

**`/log`** — every debugging fix and AIC run with your prompts, review notes and reasoning, in
reverse-chronological order, exportable to Markdown.

**Why the log matters:** the technical interview may ask you to explain code from earlier
rounds. Skim this export the night before the interview. It's also the only record of *how your
thinking changed* across the week, which is worth more than the scores.

---

## Acceptance tests

- [ ] A full mock runs all configured sections in order with correct timings
- [ ] Sections cannot be revisited; expiry auto-submits
- [ ] A failed gate shows the verdict banner and the mock continues
- [ ] Killing the browser mid-mock and reopening offers resume with wall-clock-correct time
- [ ] Report shows verdict, per-stage bars, rushed/over-dwelt counts, heatmap, and top-3 fixes
- [ ] Dashboard shows ⬜ Untested (not 0) for stages with < 10 attempts
- [ ] "Today" recommends the lowest `readiness × stageWeight` P0 topic and starts it in one click
- [ ] Readiness snapshots accumulate and sparklines render
- [ ] Review queue interleaves modules
- [ ] `/log` exports Markdown

## Done when

You can sit a complete mock under exam conditions, get a verdict and a concrete three-item fix
list, and see a dashboard that tells you what to do tomorrow morning without you having to think
about it.

## Commit
```
feat(mock): full mock runner, report and readiness dashboard

Sequential exam-condition mock with per-section timing, gate
enforcement and crash-safe resume; diagnostic report with time analysis
and an auto-derived fix list; readiness dashboard with per-stage
banding, trends and a one-click daily recommendation.
```

## What this unlocks for studying

**Three mocks minimum**, spaced: one early (a brutal but honest baseline — expect to fail gates,
that's the point), one mid-week, one two days out. Never the day before — a bad mock on exam eve
costs you sleep and buys you nothing you can act on.

The mock report's "three things to fix" list should drive the following day's study entirely.
That loop — mock → three fixes → drill → mock — is the whole method.
