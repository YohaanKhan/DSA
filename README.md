# Capgemini Exceller 2026 — Prep Workspace

This repository holds two things:

1. **`plan/`** — a complete, phase-wise implementation guide for **Exceller Trainer**, a local
   web app for practising every stage of the Capgemini Exceller 2026 assessment.
2. **`dsa-notes/`** — pre-existing DSA notes and solutions (Binary Search, Two Pointers).
   These are kept because arrays / strings / two-pointers / binary search are exactly the
   DSA surface the Exceller technical module tests.

## Start here

| If you want to… | Read |
| --- | --- |
| Understand the whole thing in 5 minutes | [`plan/README.md`](plan/README.md) |
| See the refined scope & success criteria | [`plan/00-BRIEF.md`](plan/00-BRIEF.md) |
| Know what the exam actually is | [`plan/01-RESEARCH-DOSSIER.md`](plan/01-RESEARCH-DOSSIER.md) |
| Get the exhaustive syllabus | [`plan/02-SYLLABUS-MAP.md`](plan/02-SYLLABUS-MAP.md) |
| Get study links (YouTube, courses, docs) | [`plan/03-RESOURCE-LIBRARY.md`](plan/03-RESOURCE-LIBRARY.md) |
| Build the app | [`plan/phases/`](plan/phases/) |
| Just study for a week | [`plan/study/7-DAY-PLAN.md`](plan/study/7-DAY-PLAN.md) |

## Repository layout

```
.
├── plan/                 # research + product + architecture + phase guides
│   ├── phases/           # PHASE-00 … PHASE-07 build guides
│   ├── content/          # content authoring guide, seed plan, JSON schemas
│   └── study/            # the 7-day study plan
├── dsa-notes/            # existing DSA practice (preserved)
│   ├── BinarySearch/
│   └── TwoPointers/
└── app/                  # (created in PHASE-00) the Exceller Trainer web app
```

## A note on accuracy

Capgemini does not publish an official, universal section/question/timing spec for Exceller,
and the pattern varies by campus drive. Every factual claim in `plan/` carries a
**confidence label** and a source. Treat structure as reliable, exact counts as indicative.
See [`plan/01-RESEARCH-DOSSIER.md`](plan/01-RESEARCH-DOSSIER.md) for the full evidence table.
