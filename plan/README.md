# Capgemini Exceller 2026 — Prep Plan

Research, product spec, architecture, and a phase-by-phase build guide for **Exceller Trainer**:
a local web app for practising every stage of the Capgemini Exceller 2026 assessment.

---

## Read in this order

| # | Document | What it gives you | Read time |
| --- | --- | --- | --- |
| 00 | [**The Refined Brief**](00-BRIEF.md) | Your prompt, sharpened into a scoped contract with success criteria | 4 min |
| 01 | [**Research Dossier**](01-RESEARCH-DOSSIER.md) | What the exam actually is — 5 stages, formats, packages, sources, confidence labels | 15 min |
| 02 | [**Syllabus Map**](02-SYLLABUS-MAP.md) | Every topic, prioritised P0/P1/P2, mapped to a drill type | 15 min |
| 03 | [**Resource Library**](03-RESOURCE-LIBRARY.md) | YouTube, courses, docs, question banks — with *when to use each* | 10 min |
| 04 | [**Product Spec**](04-PRODUCT-SPEC.md) | What the app is: 6 modules, user journeys, screens, readiness model | 10 min |
| 05 | [**Architecture**](05-ARCHITECTURE.md) | Stack + rationale, repo layout, code runner, LLM usage, 7 ADRs | 12 min |
| 06 | [**Data Model**](06-DATA-MODEL.md) | Content JSON schemas with worked exemplars + full SQLite schema | 12 min |
| 07 | [**Scoring & Analytics**](07-SCORING-AND-ANALYTICS.md) | Every number the app shows, defined precisely | 10 min |
| 08 | [**Design Guide**](08-DESIGN-GUIDE.md) | The Arcade Brutalist system: colour, type, motion, custom icons, full component inventory | 12 min |
| 09 | [**The Python Bridge**](09-PYTHON-BRIDGE.md) 🔴 | **Read first if you write Python.** Python is not accepted in the code-writing rounds; this is the four-hour fix. | 8 min |

### Then build
| Phase | Guide | Time | Skippable |
| --- | --- | --- | --- |
| 00 | [Foundation](phases/PHASE-00-foundation.md) ✅ built | 2.5 h | No |
| 01 | [MCQ Engine + Trace Lab + content generation](phases/PHASE-01-mcq-and-trace.md) ✅ built | 3.5 h | **No — highest value** |
| 02 | [Debugging Lab](phases/PHASE-02-debugging-lab.md) ✅ built | 3 h | No |
| 03 | [AI-Assisted Coding Simulator](phases/PHASE-03-ai-assisted-coding.md) ✅ built | 3 h | No |
| 04 | [Cognitive Arcade](phases/PHASE-04-cognitive-arcade.md) | 3 h | Partly |
| 05 | [Communication Studio](phases/PHASE-05-communication-studio.md) | 2.5 h | Partly |
| 06 | [Full Mock + Readiness Dashboard](phases/PHASE-06-mock-and-dashboard.md) | 2.5 h | No |
| 07 | [Polish](phases/PHASE-07-polish-optional.md) | 0–3 h | **Yes, entirely** |

### And study
- [**The 7-Day Plan**](study/7-DAY-PLAN.md) — hour by hour, building and studying interleaved
- [Content Authoring Guide](content/AUTHORING-GUIDE.md) — the quality bar for practice content
- [Seed Plan](content/SEED-PLAN.md) — where ~870 items come from; how `dsa-notes/` multiplies

---

## The five things that matter most

If you read nothing else in this folder:

0. **If you write Python: it is not accepted in the code-writing rounds.** C, C++ and Java only.
   That gates an elimination round *and* the tier-deciding one. Start at
   [`09-PYTHON-BRIDGE.md`](09-PYTHON-BRIDGE.md).

1. **Gates vs. multiplier.** Stages 1, 2, 3 and 5 are elimination gates — you need *adequate*.
   Stage 4 and the coding problems are the **multiplier**: ₹4.25 → ₹7.50 LPA. Clear every gate,
   then put everything else into coding.

2. **AI Literacy is the cheapest win in the exam.** New section, small closed syllabus, weak
   field. ~4 hours takes you from cold to strong. Most candidates will skip it entirely.

3. **Debugging and AI-assisted coding have no public practice resource.** That's precisely why
   Phases 02 and 03 exist, and why they're worth building rather than drilling from a website.

4. **Never read a game's rules on the clock.** The single most-cited avoidable loss in the whole
   assessment. Fixed by watching one 30-minute video tonight.

5. **The numbers in the research are indicative, not guaranteed.** Capgemini configures the
   pattern per campus drive and publishes no universal spec. Train the shape. `exam-profiles.ts`
   is one file you edit the moment you learn your actual drive's pattern.

---

## Honest notes on this plan

**On the time cost.** Building this app costs roughly 15 hours you could spend drilling. The
phases are ordered by elimination risk so you always build the most dangerous stage next, and
every phase ships something usable the same day. If you fall behind, the
[fast path](study/7-DAY-PLAN.md#the-fast-path-if-you-fall-behind) tells you exactly what to cut.
**Phases 00 + 01 alone, in one day, is a genuinely good week of preparation.**

**On research access.** This session's network egress policy blocked direct page fetches to
`faceprep.in`, `prepinsta.com`, `guvi.in`, `placementpreparation.io`, `capgemini.com` and
`youtube.com`. Research was done through search-engine extraction of those pages instead, so
every exam-fact claim carries a confidence label, and video links are listed unverified —
skim before committing time. Details in
[the dossier's caveats](01-RESEARCH-DOSSIER.md).

**On official materials.** There is **no publicly available Capgemini-issued syllabus deck or
PPT** for the Exceller assessment. The nearest first-party artefact is the *AgentifAI Buildathon
Student Handbook* — which is a separate, invitation-only team competition, **not** your test.
It's useful context for why AI Literacy is now examined; it is not a syllabus.

**On content quality.** Generated question banks are only useful if they're correct. The
[15 validation rules](phases/PHASE-00-foundation.md#srclibcontentvalidatets--the-self-check-rules)
exist because a bank with a 5% error rate teaches you five wrong things you'll never find. Rules
V8 (a trace must prove its own answer) and V10 (a debug exercise must be provably broken and
provably fixable) are the two that make the app trustworthy.

**On scope.** No deployment, no accounts, no sharing. All practice content is original or
generated — nothing here scrapes a prep site's bank or attempts to reproduce live exam items.
