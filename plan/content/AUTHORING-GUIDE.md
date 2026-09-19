# Content Authoring Guide

How to write (or generate) practice content that is worth practising on. The schemas live in
[`../06-DATA-MODEL.md`](../06-DATA-MODEL.md); this document is the **quality bar** they can't enforce.

> **The premise.** A question bank with a 5% error rate is worse than no bank, because you will
> confidently learn five wrong things and never find out which. Everything below exists to
> drive that rate toward zero.

---

## The three laws

1. **A wrong answer key is worse than no question.** Every item must be verifiable — by an
   execution trace, by a compiler, or by a citable rule. If you can't verify it, don't ship it.
2. **The explanation is the product.** The question is just the delivery mechanism. An item
   whose explanation is "The answer is B" has taught you nothing and wasted the rep.
3. **Distractors must be *tempting*.** Four options where three are obviously absurd trains
   nothing. Each wrong option should be what you'd pick if you held a specific, nameable
   misconception.

---

## MCQ quality bar

### Stem
- Self-contained: no "as discussed above", no reference to a prior question
- One question, one concept. Compound stems ("which is true about X and Y?") measure two things
  and diagnose neither
- Realistic framing beats abstract: *"A developer asks a model for citations and gets three
  plausible but non-existent papers"* beats *"What is hallucination?"*
- Code in stems goes in a fenced block with a language tag, and is ≤ 20 lines

### Options
- Exactly 4, mutually exclusive, similar length (a conspicuously longer option is a tell —
  and your brain *will* learn the tell instead of the content)
- Parallel grammatical structure
- **No "All of the above" / "None of the above".** They test test-taking, not knowledge
- No overlapping options where two can both be right
- Answer letter distribution across a bank: 15–35% per letter (enforced by rule V7)

### Explanation — the non-negotiable part
Must answer **three** questions:
1. *Why is the correct answer correct?* — state the rule or mechanism, not just the conclusion
2. *Why is each wrong option tempting?* — the `distractorRationale` field
3. *What's the general pattern?* — what should you recognise next time you see this shape

**Bad:**
> "The answer is B, hallucination."

**Good:**
> "Hallucination is when a model produces output that is fluent and plausible but factually
> unsupported or fabricated. The citations are well-formed yet non-existent, which is the
> defining signature. **Pattern:** if the model *invented* something, it's hallucination; if it
> merely *doesn't know* something recent, it's knowledge cutoff."

---

## Trace item quality bar

- **The `executionTrace` is the proof.** Rule V8 checks that the final step's output equals the
  stated answer. Write the trace first, derive the answer from it — never the reverse.
- Trace **every** iteration for short loops; for long ones, trace the first two, the last two,
  and mark the middle `… (n−4 more iterations)` with an explicit note
- 6–20 lines of source. Shorter is trivially traceable; longer becomes an endurance test
- Line numbers in the trace must match the source exactly (rule V9)
- **Always include a `note` on the non-obvious steps.** `{"x": 12, "note": "13 & 12 = 1100b"}`
  is where the learning is; a bare variable value is not
- Vary the shapes: don't produce twelve loop-counter questions. Cover loops, nested loops,
  recursion, bitwise, integer division, string/char arithmetic, in-place array mutation

**Difficulty calibration:**
| Level | Shape |
| --- | --- |
| easy | Single loop, simple accumulator, ≤ 8 lines |
| medium | Nested loops, or a bitwise trick, or simple recursion |
| hard | Recursion with multiple return paths, bitwise + loop combined, or pointer/reference aliasing |

---

## Debug item quality bar

- **The exercise must be provably broken and provably fixable** (rule V10): the reference passes
  all tests, the broken version fails ≥ 1. Never ship an unverified pair
- **One primary bug.** Multi-bug exercises are realistic but undiagnosable — you can't tell
  whether you found the bug or just fixed something
- The bug must be **findable by reading**, not only by running. If it requires a debugger to
  see, it's the wrong exercise for a 20-minute round
- ≥ 3 tests, at least one of {empty input, single element, boundary value} (rule V11)
- **Hidden tests must probe the bug's edge**, not just repeat a visible test — otherwise Submit
  adds no information over Run
- Exactly 4 hints, in the ladder order: family → function → line range → diff
- Problem statement must specify behaviour precisely enough that the bug is unambiguous. "Sort
  the array" leaves stability undefined; if the bug is a stability bug, say so in the spec

---

## AIC problem quality bar

- **Problem must have real edge cases.** "Reverse a string" has almost none and teaches nothing
  in the Frame step. "Second largest *distinct* value" has five, and that's why it's the exemplar
- `rubric.frame` lists **every** element a complete framing needs — that list is the feedback
- `rubric.prompt` maps 1:1 onto `modelPromptExample`. If your exemplar prompt contains something
  the rubric doesn't check, or vice versa, one of them is wrong
- `rubric.review` lists the issues a *literal* assistant's output would plausibly contain given
  a mediocre prompt — these are what the Review step is checking you catch
- Solvable in 15–20 minutes end to end, including all five steps
- Difficulty: **easy-to-medium**. The round tests collaboration, not algorithmic depth. A hard
  algorithm crowds out the behaviour you're training

---

## Essay & speaking prompts

**Essay:** answerable in 250–350 words by a final-year engineering student with no specialist
knowledge; genuinely two-sided (a prompt with one obvious answer produces no argument);
drawn from the reported topic areas. Store the rubric band descriptors *with* the prompt so
grading is consistent across the week.

**Speaking:** answerable in 60–90 seconds; concrete enough to have an obvious structure;
`expectedPoints` should be 3–5 content points a good answer would hit, used for coverage scoring.

---

## Behavioural items

- Pair every trait: one forward-keyed, one reverse-keyed statement. The pair is what detects
  inconsistency
- No socially-obvious answers ("I enjoy sabotaging my colleagues" measures nothing)
- Everyday workplace situations, not extremes
- **There is no correct answer and the app must never imply one.** The only output is a
  consistency report

---

## LLM generation: prompt recipe

```
SYSTEM
You are an assessment content author for a Capgemini Exceller 2026 practice app.
You produce rigorous, verifiable multiple-choice items. You never produce an item
whose answer you cannot justify from a stated rule or a traced execution.

USER
Topic: <topic> / <subtopic>       Difficulty: <level>
Stage: <stage>                    Count: 12

Schema (must validate exactly):
<the Zod schema rendered as JSON Schema>

Two exemplars of the required quality:
<exemplar 1>
<exemplar 2>

Rules:
- Every explanation must state the rule, why each distractor is tempting, and
  the general pattern to recognise next time.
- Distractors must each correspond to a specific, nameable misconception.
- Vary the answer letter. Do not use "All of the above" or "None of the above".
- Do NOT produce items similar to any of these existing stems:
<list of existing stems in this subtopic>

Return a JSON array of <count> items and nothing else.
```

**Then always:** validate → run V1–V15 → rebalance answer letters mechanically → write
rejections to `.rejected/` with the rule number. Never accept generated content unvalidated.

### Generation failure modes to watch for

| Symptom | Fix |
| --- | --- |
| All answers are B or C | Mechanical rebalance (permute options + answer), don't re-prompt |
| Twelve rephrasings of one question | Pass more existing stems in the "avoid" list; drop batch size |
| Explanations restate the option text | Tighten the exemplars; rule V6 catches it |
| Distractors are absurd | Add "each distractor must correspond to a named misconception" and give an example |
| Trace answer contradicts its own trace | Rule V8 rejects it; if frequent, ask for the trace first and the answer second |
| Debug exercise isn't actually broken | Rule V10 rejects it; the bug-injection engine avoids this entirely — prefer it |

---

## Review cadence

- After each generated batch: **read 3 random items in full.** If any fails the bar, discard the
  batch and fix the prompt. Ten minutes of spot-checking saves a day of learning wrong things.
- When you get a question wrong and believe the key is wrong, use the flag button (Phase 07 item
  #2) rather than arguing with the app. Check the explanation's stated rule against a real source.
- Any item flagged twice is excluded from selection until you've reviewed it.
