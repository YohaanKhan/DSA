# 07 — Scoring & Analytics

Every number the app shows you, defined precisely. No hand-waving: if the dashboard says
"readiness 62", this document says exactly where 62 came from.

---

## 1. MCQ scoring (`lib/scoring/mcq.ts`)

```
raw      = correct / attempted
netTime  = mean(timeMs) / targetMs        // <1 means you're faster than budget
guessed  = attempts where confidence='low' AND correct   // "lucky" answers
trueKnown= (correct - guessed*0.5) / attempted           // discount lucky hits
```

**No negative marking** (matches reported exam), so never leave a blank in practice either —
train the habit of always answering.

**The `guessed` discount matters.** Without it, a 70% score built on 20% guesses reads the same
as genuine 70%, and you'd stop studying a topic you don't actually know. Any question answered
with `confidence='low'` enters the spaced-repetition queue **even when correct**.

---

## 2. Trace scoring (`lib/scoring/mcq.ts`, exact-match mode)

Exact string match on the expected output, whitespace-normalised
(`trim`, collapse internal runs of spaces, normalise newlines).
Partial credit: none — the exam is MCQ, and "nearly right" output is wrong output.

**Diagnostic recorded:** where in the `executionTrace` your answer first diverges, inferred by
asking you (after a wrong answer) to step the variable table yourself. The step at which you
first disagree with the reference is logged as `divergenceStep` — this identifies *which
construct* breaks you (loops vs. recursion vs. bitwise) rather than just "you got it wrong".

---

## 3. Debugging scoring (`lib/scoring/debug.ts`)

```
passed      = all visible AND hidden tests pass
timeScore   = clamp(1 - elapsed / limit, 0, 1)
hintPenalty = 0.10 * hintsUsed                       // 4 hints max ⇒ max 0.40
minimality  = clamp(1 - (changedLines - idealLines) / 10, 0, 1)

score = passed ? clamp(0.60 + 0.20*timeScore + 0.20*minimality - hintPenalty, 0, 1) : 0
```

**Why minimality is scored:** the exam gives you working code with a defect. Rewriting the
function may pass tests but is the wrong reflex under a 20-minute clock, and in the interview
you'll be asked what you changed. Training minimal, surgical fixes is training the real skill.

**Recorded per attempt:** bug family, whether you correctly *named* the family before fixing
(the app asks first), time-to-first-correct-hypothesis. Accuracy of hypothesis-before-fix is
the metric that actually predicts exam performance — it separates "I found it by flailing" from
"I diagnosed it".

---

## 4. AI-assisted coding scoring (`lib/scoring/aic.ts`) ⭐

Five steps, 0–5 each, total 25, normalised to 100.

| Step | Weight | How scored |
| --- | --- | --- |
| 1 Frame | 20% | Fraction of `rubric.frame` elements present in your framing. LLM-judged against the checklist, with a deterministic keyword fallback. |
| 2 Plan | 15% | Approach correctness + complexity stated and correct. |
| 3 Prompt | 30% | Fraction of `rubric.prompt` elements present: names the language, states exact behaviour, states constraints, names edge cases, specifies output/complexity. |
| 4 Review | 25% | Fraction of `rubric.review` issues you identified, minus false positives × 0.5. |
| 5 Refine | 10% | Targeted follow-up (not a restart) **and** final code passes tests. |

**Weighting rationale:** prompt (30%) and review (25%) carry the most because the round scores
*collaboration*, and review is the step candidates skip. Framing (20%) is weighted third because
it's what makes steps 3–5 possible.

**The hard constraint that makes this work:** step 3 rejects a prompt that is ≥70% verbatim
overlap with the problem statement (normalised token overlap). You cannot paste the problem.
You must frame it yourself. This one rule is the majority of the training value in the module.

**Deterministic fallback (no API key):** each rubric element is a keyword/pattern set; scoring
becomes a checklist match, and the exemplar prompt is revealed for self-comparison. Less
nuanced, still directionally right, works offline.

---

## 5. Essay scoring (`lib/scoring/essay.ts`)

Five criteria, 0–5 each (band-descriptor rubric stored with the prompt):

| Criterion | Mechanical signal | LLM judgment |
| --- | --- | --- |
| Task response | Word count in range; prompt keywords addressed | Does it actually answer the question? |
| Structure | Paragraph count 4–5; intro & conclusion detected | Thesis present? One idea per paragraph? |
| Grammar | — | Error count and severity |
| Vocabulary | Type-token ratio; average word length | Range and precision |
| Mechanics | Sentence-length variance; run-on detection | Punctuation, capitalisation |

Mechanical signals compute with **no API key**, so you always get structure/length/variety
feedback. LLM adds the prose critique when available.

**Tracked over time:** words-per-minute of composition, and time spent in the final 5 minutes
(proxy for whether you're leaving time to proof — most people don't, and it costs marks).

---

## 6. Speech scoring (`lib/scoring/speech.ts`)

From the Web Speech API transcript + audio timings — **all computed locally, no API needed**:

| Metric | Definition | Target |
| --- | --- | --- |
| WPM | words / speaking seconds | **130–150** |
| Filler rate | fillers per 100 words (`um, uh, like, basically, actually, you know, so`) | **< 3** |
| Pause profile | count of gaps > 1.5s; longest gap | **< 3 long pauses**, none > 3s |
| Coverage | fraction of `expectedPoints` mentioned | **≥ 70%** |
| Sentence completion | fraction of utterances that parse as complete sentences | **≥ 80%** |
| Speaking time used | actual / allotted | **70–95%** |

**Explicitly not scored: accent.** The reported exam rubric is pronunciation, fluency, clarity.
The app measures fluency (WPM, pauses), clarity (completion, coverage) and flags filler. It
does not attempt accent classification — that would train exactly the wrong thing.

---

## 7. Game scoring (`lib/scoring/` per game)

Mirrors the **reported** formula (labelled `Low` confidence in the dossier, so treated as a
training target rather than truth):

```
levelReward = level^2 / secondsAtLevel
gameScore   = Σ levelReward over completed levels
```

**Strategic consequence, surfaced in the UI:** because the numerator is squared, depth beats
speed-at-shallow-levels. The game screen shows a live "marginal value of next level vs. time
cost" so you internalise pushing depth.

### Plateau detection
Over the last 10 runs of a game, fit `score ~ a + b·run`. Report plateau when
`b < 0.02 × mean(score)` **and** n ≥ 8. The dashboard then says:

> *"Grid Challenge has plateaued (last 10 runs, slope ≈ 0). Further practice here is low-value.
> Spend the time on [weakest stage] instead."*

This is the feature that protects your week. Cognitive games measure a trait; you can learn the
rules and remove the surprise, but you cannot grind the trait far. Knowing when to stop is worth
more than any extra rep.

---

## 8. Spaced repetition (`lib/srs/sm2.ts`)

Standard SM-2, with a quality score derived from performance:

```
q = correct
      ? (confidence === 'high' ? (timeMs <= targetMs ? 5 : 4) : 3)
      : (hintsUsed > 0 ? 2 : 1)

if q < 3:  repetitions = 0; intervalDays = 1; lapses += 1
else:      repetitions += 1
           intervalDays = repetitions === 1 ? 1
                        : repetitions === 2 ? 6
                        : round(intervalDays * easeFactor)
easeFactor = max(1.3, easeFactor + (0.1 - (5-q) * (0.08 + (5-q) * 0.02)))
dueAt = now + intervalDays days
```

**Week-long compression:** with only 7 days, cap `intervalDays` at 3. Nothing you learn on
Day 1 should be unreviewed by Day 7. This is a deliberate deviation from vanilla SM-2 and is
implemented as `MAX_INTERVAL_DAYS = 3` in config.

---

## 9. Readiness (`lib/scoring/readiness.ts`)

```ts
readiness(stage) = 100 * (
    0.50 * accuracyRecent      // last 50 attempts, or last 3 sessions, whichever is larger
  + 0.20 * speedFactor         // clamp(targetTime / meanTime, 0, 1)
  + 0.20 * coverage            // P0 topics in this stage with >= 10 attempts, as a fraction
  + 0.10 * consistency         // clamp(1 - stdev(last5SessionScores)/mean, 0, 1)
)
```

**Cold start:** with < 10 attempts in a stage, readiness reports `null` and the dashboard shows
**"Untested"** in grey — not 0, and not a fake number. An untested stage is the highest-priority
thing to do, and the dashboard ranks it first.

**Banding:** `<50` 🔴 · `50–69` 🟠 · `70–84` 🟢 · `≥85` ⭐ · `null` ⬜ Untested

### "What to do today"
```
candidates = all (stage, topic) pairs where priority = 'P0'
score(pair) = (readiness(pair) ?? -1)            // untested sorts first
            * (1 / stageWeight(stage))           // gates weighted by elimination risk
recommend = argmin score(pair)
```
`stageWeight`: debugging 1.2, technical 1.2, aic 1.15, english 1.0, cognitive 0.8, behavioural 0.3.
Cognitive is down-weighted **once it has plateaued** (weight drops to 0.3) — the app stops
recommending something you can't improve.

---

## 10. Full-mock report

After a mock, one page:

1. **Verdict banner** — under reported elimination rules, would you have progressed? Which gate
   failed first? (Shown even if later stages were completed, because the data is still useful.)
2. **Per-stage bars** — your score vs. your own best vs. your own average
3. **Time analysis** — per-section: time used, questions rushed (< 40% of target time),
   questions over-dwelt (> 200% of target). Over-dwelling is the more common killer.
4. **Topic heatmap** — accuracy per topic, coloured, sorted worst-first
5. **The three things to fix before the next mock** — auto-derived from the worst
   `(accuracy × priority × frequency)` triples
6. **Every wrong answer** with explanation, one click to add all to the review queue

---

## 11. Metrics that are deliberately *not* tracked

| Not tracked | Why |
| --- | --- |
| Total hours studied | Rewards presence, not progress. Encourages padding. |
| Streaks beyond a simple day counter | Guilt mechanics reduce output in a 7-day sprint |
| Percentile vs. other candidates | No data, and inventing it would be a lie |
| Accent similarity | Wrong thing to optimise; not what the exam rubric says |
| Questions "completed" as a headline number | Volume is not readiness; it's the classic vanity metric |
