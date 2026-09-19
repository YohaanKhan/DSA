# 00 — The Refined Brief

> You asked me to improve your prompt before executing it. This document is that improved
> prompt, restated as a working brief. It is the contract the rest of `plan/` is built against.

---

## Your original ask (paraphrased)

> "I have a week. Deep-research the Capgemini Exceller 2026 assessment and its syllabus, find
> official/allied resources, then create a plan folder with a detailed phase-wise guide to build
> a web app that lets me practise every part of the test. Don't be shallow. Add YouTube and other
> resources. Also clean up the DSA repo."

## What was under-specified, and how I resolved it

| Gap in the original prompt | Resolution baked into this plan |
| --- | --- |
| "Web app" — for whom, running where? | **Single-user, local-first**. Runs on your machine via `npm run dev`. No auth, no multi-tenancy, no deployment. This removes ~40% of the build cost and none of the practice value. |
| No time budget split between *building* and *studying* | **~1.5 days building, ~5.5 days studying.** The phases are ordered so each one ships something usable the same day. A "fast path" (Phases 0→2 only, ~6h) is defined for if you fall behind. |
| "Practice the different parts" — practise *what*, exactly? | Six practice surfaces, one per assessment stage, each with a defined drill loop, scoring rule, and content bank size. See [`04-PRODUCT-SPEC.md`](04-PRODUCT-SPEC.md). |
| Content — where do thousands of practice questions come from? | **LLM-generated against a strict JSON schema, then validated.** A generator harness (Phase 1) plus hand-authored seed exemplars. Content authoring is the real bulk of the work, so it gets its own guide: [`content/AUTHORING-GUIDE.md`](content/AUTHORING-GUIDE.md). |
| The AI-assisted coding round can't be practised with static content | It needs a **live LLM**. Phase 3 builds a proctored simulator that scores your *prompts*, not just your output. This is the highest-leverage, least-covered stage in the whole exam. |
| Debugging round needs to actually compile C/C++/Java | Pluggable `CodeRunner` with two adapters (local toolchain, remote Piston). Defined in [`05-ARCHITECTURE.md`](05-ARCHITECTURE.md). |
| "Clean up the repo" — delete or reorganise? | **Reorganise, not delete.** Your Binary Search / Two Pointers notes are directly on-syllabus. Moved to `dsa-notes/`. Nothing was destroyed. |
| Success criteria absent | Defined below. |

## Scope

### In scope
- A local web app ("**Exceller Trainer**") with six practice modules + a full-mock mode.
- A readiness dashboard that tells you *which stage will eliminate you* and what to do today.
- A curated, sourced resource library and a 7-day study plan that interleaves with the app.

### Explicitly out of scope
- Deployment, hosting, accounts, payments, mobile apps, sharing with other candidates.
- Replicating Capgemini's exact proprietary game mechanics pixel-for-pixel (impossible and
  unnecessary — we train the *underlying cognitive skill* under the same time pressure).
- Any attempt to obtain, leak, or reproduce live/confidential exam content. Everything here is
  built from publicly reported patterns and original practice material.

## Success criteria

The plan has succeeded if, by exam day:

1. **No unknown stages.** You have sat at least one timed rep of all six stages.
2. **≥3 full mocks completed** end-to-end under time pressure, scores trending up.
3. **Debugging: ≥80% fix rate** on unseen broken snippets within 20 minutes each.
4. **AI-assisted coding: you have a repeatable 5-step protocol** you can execute without thinking.
5. **Technical MCQ: ≥75%** on a fresh 40-question mixed set (pseudocode + CS fundamentals + AI literacy).
6. **Cognitive games: plateau reached** — your score stops improving with practice, meaning you're
   at your ceiling and further grinding is wasted time.
7. The dashboard shows **no red stage**.

## The honest trade-off

Building this app costs you prep time. That is a real cost, and you should know it going in.

The plan is structured so you never spend a day building without also practising, and so the
build order matches the *elimination risk* order — you build the module for the stage most
likely to end your process first. If at any point you are behind, **stop building and start
drilling**; the fast path in [`plan/README.md`](README.md) tells you exactly what to keep.

## Non-negotiables for this plan's quality

Applied to every document in `plan/`:

- Every exam-fact claim carries a **confidence label** (`High` / `Medium` / `Low`) and a source.
- Every phase has: goal → deliverable → file-by-file work → acceptance tests → "done when".
- No phase says "implement the scoring logic" without saying *what the logic is*.
- Every content type has a JSON schema and at least one worked exemplar.
