# Phase 06 — Full Mock + Readiness Dashboard

| | |
| --- | --- |
| **Goal** | Tie all six modules into a single exam-condition run with elimination rules enforced, and make the dashboard tell you what to do each morning. |
| **Time budget** | **2.5 hours** |
| **Prerequisites** | Phases 00–05 (works with whatever subset you built) |
| **Unlocks** | Exam-condition rehearsal + the diagnostic loop that directs the whole week |
| **Skippable?** | **No.** Without this, the app is six disconnected drills. |
| **Status** | ✅ **Built.** See `app/src/lib/config/exam-profiles.ts`, `app/src/lib/mock/`, `app/src/components/mock/`, `app/src/app/api/mock/`. |

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

- [x] A full mock runs every configured section in order — verified end to end via the API
- [x] Sections cannot be revisited; the instructions screen says so before you start
- [x] A failed gate shows the verdict banner and **the mock continues** (browser-verified)
- [x] No confidence toggle inside a mock — realism beats telemetry there (browser-verified)
- [x] Remaining time is recomputed from wall-clock timestamps, so a crash cannot buy time back
- [x] Report shows the verdict, per-section bars with pass-mark lines, rushed / over-dwelt counts, the topic heatmap and the top-three fixes
- [x] The verdict names the **first** failed gate, since that is where the real process would end
- [x] Dashboard shows ⬜ Untested (not 0) below ten attempts, and counts mocks and due cards for real
- [x] Readiness snapshots are written on every finish path, idempotent per day
- [x] Review queue is interleaved, never grouped by topic
- [x] `/log` exports Markdown

### Verified run

A `short-diagnostic` mock: AI Literacy 33% (gate failed), Technical 63% (cleared), Pseudocode
33% (failed), Debugging 72% (failed — that section's pass mark is a full fix), AI-Assisted
57% (not eliminatory). Verdict correctly reported **"Your process would have ended at AI
Literacy"** — the first gate, not the last. Fixes ranked: pseudocode, language-traps,
prompt-engineering.

### Bugs this phase's verification caught

| Bug | How it was found |
| --- | --- |
| A mock's sections share one session id, so the drill finish endpoint would tally earlier sections **and mark the whole mock finished** | Reading the integration before wiring it. `DrillRunner` now reports its own tally and the mock never calls that endpoint. |
| The mock recorded **hardcoded** scores for the debugging (1.0) and AI-assisted (0.6) sections | Spotted while writing the browser walkthrough. Both components now report their real score. |
| Dashboard showed "Mocks completed: 0" and "Due for review: 0" — both literals | Screenshot review, after real data existed. |
| The dashboard called an **untested** stage "your weakest gate" | Screenshot review. Untested now gets its own wording, and non-eliminatory stages are not called gates. |
| Two `setState`-in-effect cascades in the mock runner | `react-hooks` lint. The skipped-section advance is now derived, and the initial fetch uses a cancellable effect. |

### Deviation from the plan

The report is **addressable at `/mock/[id]/report`**, not only a POST response. The plan had it
as a screen inside the runner; making it a URL means you can revisit a past mock, which matters
because the three fixes are meant to drive the next day's study.

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
