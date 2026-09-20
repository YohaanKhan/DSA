# Phase 05 — Communication Studio

| | |
| --- | --- |
| **Goal** | Timed essay practice with rubric grading, recorded speaking practice with fluency metrics, plus listening and reading drills. |
| **Time budget** | **2.5 hours** |
| **Prerequisites** | Phase 00; Phase 01 (MCQ engine powers grammar/vocab/RC); Phase 03's LLM client for prose grading |
| **Unlocks** | Stage 1 — an eliminatory gate |
| **Skippable?** | **Partially.** Grammar/vocab MCQs come free with Phase 01. Build Essay + Speak; Listen and Read are optional. |

> **Calibrate your effort here honestly.** If your English is already comfortable, this stage is
> a gate you'll clear — build the Speak module (60 min), do three prompts a day, and move on.
> If English is genuinely your weak point, this is as eliminatory as the technical module and
> deserves the full 2.5 hours plus daily reps.

---

## Step 5.1 — Essay module (50 min)

`src/app/comm/page.tsx` → Essay tab

**Composition surface:**
- Prompt at the top, 25-minute timer, live word count with the target band (250–350) highlighted
- Autosave every 10 s to `localStorage` **and** the DB — losing 20 minutes of writing to a
  refresh is unrecoverable morale damage on day 4
- **A three-phase nudge**, non-blocking: at 3 min *"plan done? start writing"*, at 21 min
  *"stop writing, start proofreading"*. Leaving no proofing time is the most common avoidable
  mark loss, and most people don't self-correct without a prompt.

**Grading** — per [`../07-SCORING-AND-ANALYTICS.md`](../07-SCORING-AND-ANALYTICS.md#5-essay-scoring-libscoringessayts):

*Mechanical (always available, no API key):*
- word count vs. band · paragraph count (target 4–5) · intro & conclusion detection
  (first/last paragraph heuristics + connector words) · sentence-length mean and variance ·
  run-on detection (>45 words, no subordinating conjunction) · type-token ratio ·
  connector density · passive-voice ratio · repeated-word flagging

*LLM (when available):* the five band scores with one concrete sentence of justification each,
plus **three specific rewrites** of weak sentences from your own text. Concrete rewrites of
*your* sentences teach far more than generic advice.

**Progress view:** band scores over time, plus writing-speed (words/min) and
proofing-time-used. The second is the behaviour you're actually training.

**Prompt bank:** 30 prompts on the reported topic areas — technology & society, AI at work,
remote work, education, sustainability, ethics, career. Generated in Phase 01's harness with
`kind: 'essay'`.

---

## Step 5.2 — Speaking module (60 min) ⭐ build this one even if you skip the rest

`src/app/comm/page.tsx` → Speak tab

**Flow:**
1. Prompt shown, **45-second think timer** (matches the reported format and trains the habit of
   thinking *before* speaking rather than filling silence)
2. Record — `MediaRecorder` for audio + `SpeechRecognition` (`interimResults`, `continuous`) for
   a live transcript with timings
3. 90-second speaking window with a visible countdown
4. Stop → metrics computed **locally**

**Metrics** — per [`../07-SCORING-AND-ANALYTICS.md`](../07-SCORING-AND-ANALYTICS.md#6-speech-scoring-libscoringspeechts):

| Metric | Computed from | Target |
| --- | --- | --- |
| WPM | transcript words / speaking seconds | 130–150 |
| Filler rate | regex over a filler list, per 100 words | < 3 |
| Pause profile | gaps > 1.5 s between recognition results | < 3 long, none > 3 s |
| Coverage | `expectedPoints` matched (stem-matched keywords) | ≥ 70% |
| Sentence completion | fraction of utterances parsing as complete sentences | ≥ 80% |
| Time used | speaking / allotted | 70–95% |

**Playback with an annotated timeline:** the transcript rendered with fillers highlighted amber
and long pauses marked. Hearing your own 4-second silence with a marker on it changes behaviour
in a way a number never does.

**Explicitly not measured: accent.** The reported rubric is pronunciation, fluency, clarity.
We measure fluency and clarity directly. Attempting accent scoring would train the wrong thing
and would be measuring something the exam says it isn't testing.

**Browser support:** `SpeechRecognition` is Chrome/Edge. If unavailable, the module still
records audio and computes duration/pauses from the waveform, and you self-assess against the
rubric. Detect and say so in the UI — don't fail silently.

---

## Step 5.3 — Listening module (25 min, optional)

Text-to-speech via `SpeechSynthesis` over a stored transcript, then comprehension MCQs through
the Phase 01 engine.
- Default **one playback only** (`playbacksAllowed: 1`) — replay makes it a reading test
- Note-taking pad beside the player, visible during playback, submitted with the answers
- Rate control (0.9× / 1.0× / 1.1×) to train at slightly-above-comfortable speed

Genuinely optional — listening is the least-reported component and TTS is an imperfect stand-in
for real exam audio.

---

## Step 5.4 — Reading module (20 min, optional)

Passage + timed comprehension set via the Phase 01 engine, plus:
- **Reading speed measurement** (words / time-to-first-answer) — target 200–250 wpm for exam prose
- Question types tagged `main-idea` / `detail` / `inference` / `vocab-in-context` / `tone`,
  so the analytics tell you *which* comprehension skill is weak rather than just "RC: 60%"
- Para-jumbles and cloze as separate drill types

---

## Step 5.5 — Grammar & vocabulary (0 min — free)

Already built. It's Phase 01's MCQ engine over `content/mcq/english.json`. Just make sure the
English bank is generated (120 items: 70 grammar / 30 vocab / 20 RC) and that the drill builder
surfaces English topics.

The highest-yield grammar subtopics, from the syllabus map:
subject–verb agreement · prepositions (verb collocations) · tenses · error spotting ·
sentence correction · parallelism · modifiers. Weight generation toward these.

---

## Acceptance tests

- [ ] Essay autosaves and survives a mid-composition refresh
- [ ] Proofing nudge fires at 21 min and does not block typing
- [ ] Mechanical metrics compute with no API key
- [ ] Speaking records, transcribes, and reports all six metrics
- [ ] Filler and long-pause markers align with the audio timeline on playback
- [ ] Missing `SpeechRecognition` degrades to audio-only with a visible notice
- [ ] Listening allows exactly one playback
- [ ] Reading reports speed and per-question-type accuracy

## Done when

You can write a timed essay and get band scores plus rewrites of your own weak sentences, and
record a 90-second answer and see your WPM, fillers and pauses.

## Commit
```
feat(comm): communication studio

Timed essay composition with autosave, phase nudges and mechanical plus
LLM rubric grading; speaking practice with local transcript-based
fluency metrics and an annotated playback timeline; optional listening
and reading drills.
```

## What this unlocks for studying

**Daily, small, non-negotiable:** one essay (25 min) + three speaking prompts (10 min).
Frequency beats duration for both. Seven essays and twenty-one spoken answers across the week
will move you further than one marathon session, and the speaking metrics will visibly improve
within three days — fillers are the fastest thing to fix once you can see them counted.
