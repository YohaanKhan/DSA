# Seed Plan — filling the banks

Where ~870 practice items come from, in what order, and how your existing `dsa-notes/`
multiply into four modules.

---

## Priority order (build the banks in this sequence)

| Order | Bank | Items | Why first |
| --- | --- | --- | --- |
| 1 | `mcq/ai-literacy.json` | 150 | Highest ROI in the exam: new, small, closed syllabus, weak field |
| 2 | `trace/pseudocode.json` | 120 | Most under-prepared eliminatory section |
| 3 | `debug/` (injected) | ∞ | Generated from correct solutions; no authoring needed |
| 4 | `aic/problems.json` | 20 | Package-tier multiplier |
| 5 | `mcq/technical-dbms.json` | 80 | Heaviest of the CS-fundamentals topics |
| 6 | `mcq/technical-dsa.json` | 120 | Broad, and feeds the coding round |
| 7 | `mcq/english.json` | 120 | Eliminatory gate |
| 8 | `mcq/technical-oop.json` | 60 | |
| 9 | `mcq/technical-os.json` | 60 | |
| 10 | `mcq/technical-networks.json` | 60 | |
| 11 | `mcq/technical-git-se.json` | 40 | |
| 12 | `comm/{essay,speak,read,listen}.json` | 30/30/15/15 | |
| 13 | `behavioural/adept.json` | 60 | Cheapest, least important |

**Stop rule:** if generation is eating your study time, ship banks 1–4 and drill. Those four
cover the two highest-ROI stages and the one that decides your package. Everything after is
depth you may not need.

---

## Your `dsa-notes/` as seed material ⭐

You already have 19 files of correct, well-commented DSA work. Each one multiplies:

| Source file | Produces |
| --- | --- |
| `TwoPointers/PartitionLabels.py` | 1 trace item (the last-occurrence scan) · 1 complexity MCQ · 8 debug exercises (bug injection on a C/Java translation) · 1 AIC problem |
| `TwoPointers/MoveZeroes.py` | 1 trace · 1 in-place-vs-copy MCQ · 8 debug · 1 AIC |
| `TwoPointers/BackspaceStringCompare.py` | 1 trace (reverse traversal) · 1 MCQ on the O(1)-space insight · 8 debug |
| `TwoPointers/CompareVersions.py` | 1 trace (string→int parsing) · 8 debug (off-by-one heaven) |
| `TwoPointers/NextPermutation.py` | 1 hard trace · 1 algorithm-steps MCQ · 8 debug |
| `TwoPointers/RotateArray.py` | 1 trace (reversal algorithm) · 1 MCQ comparing the three approaches · 8 debug |
| `TwoPointers/StringCompression.py` | 1 trace · 8 debug (boundary bugs abound) |
| `TwoPointers/MergeStringsAlternatively.py` | 1 trace · 8 debug · 1 AIC |
| `TwoPointers/IntersectionOfTwoLinkedList.py` | 1 trace · 1 MCQ on the two-pointer trick · 8 debug |
| `BinarySearch/Introduction.md` + 9 variations | **10 trace items** (each template) · **20 MCQs** (invariants, mid overflow, when each variation applies) · **80 debug exercises** — binary search is the richest off-by-one source in all of DSA |

**Total from material you already own: ~30 trace items, ~25 MCQs, ~150 debug exercises,
5 AIC problems.** That's roughly a fifth of the whole bank, from files already in the repo,
and it has a property generated content doesn't: **you already understand it**, so when a
generated variant disagrees with you, you'll notice.

### The pipeline
```bash
# 1. Translate each Python solution to C / C++ / Java (LLM-assisted, then compile to verify)
tsx scripts/translate-solutions.ts --in ../dsa-notes/TwoPointers --out content/solutions

# 2. Every verified solution becomes debug exercises
tsx scripts/inject-bugs.ts --dir content/solutions --families all --count 8

# 3. And trace items + MCQs
tsx scripts/generate-content.ts --from-solutions content/solutions --kinds trace,mcq
```

Step 1's compile check matters: a translation that doesn't compile poisons every exercise
derived from it.

---

## Coverage targets per subtopic

Don't generate 150 AI Literacy questions in a lump — distribute against the syllabus map's
priorities, or you'll end up with 90 hallucination questions and nothing on RAG:

| Subtopic | Items | Priority |
| --- | --- | --- |
| `llm-limitations` | 30 | P0 — hallucination alone deserves 10 |
| `prompt-engineering` | 30 | P0 |
| `responsible-ai` | 25 | P0 |
| `genai-foundations` | 25 | P0 |
| `rag` | 18 | P1 |
| `agentic-ai` | 14 | P1 |
| `ai-assisted-dev` | 8 | P1 |

Same principle everywhere: **items ∝ priority × exam frequency**, not ∝ how easy the topic is
to generate questions about. The generator will happily give you a hundred easy definition
questions; that's the failure mode to guard against.

Difficulty mix per bank: **30% easy / 50% medium / 20% hard**. Too many easy items inflate your
readiness score and you'll walk in over-confident.

---

## Quality gates before a bank is "done"

- [ ] All items pass V1–V15
- [ ] Answer-letter distribution 15–35% per letter
- [ ] Every P0 subtopic in the registry has ≥ 10 items
- [ ] You have personally read 3 random items per 50 and they meet the authoring bar
- [ ] No two stems exceed 85% trigram similarity
- [ ] Difficulty mix within ±10% of 30/50/20

---

## Budget estimate

| Bank set | Approx. generation cost |
| --- | --- |
| AI Literacy (150) | ~$0.60 |
| Pseudocode traces (120) | ~$0.90 (longer outputs — traces are verbose) |
| Technical MCQs (420) | ~$1.80 |
| English (120) | ~$0.45 |
| AIC problems (20) | ~$0.40 (long, rubric-heavy) |
| Communication prompts (90) | ~$0.25 |
| Behavioural (60) | ~$0.10 |
| **Total** | **~$4.50**, one-time |

Debug exercises cost **nothing** — bug injection is mechanical. That's a large part of why the
injection engine is worth its build hour.

Set `LLM_DAILY_CAP_USD=10` for generation day, then drop it back to 2 for practice days (where
the only recurring cost is AIC assistant calls and essay grading, roughly $0.10–0.30/day).

---

## If you have no API key

Everything still works; you author less. In priority order:

1. **Author the 20 AIC problems by hand** — highest value per item, and writing the rubric
   *is* the learning. Two hours well spent.
2. **Bug injection needs no LLM at all** — translate your `dsa-notes` solutions by hand and
   generate hundreds of debug exercises mechanically.
3. **Trace items:** write the code, hand-trace it, record the trace. Slow, but hand-tracing is
   literally the skill the section tests, so the authoring *is* the practice.
4. **MCQs:** work through the public banks in [`../03-RESOURCE-LIBRARY.md`](../03-RESOURCE-LIBRARY.md)
   directly, and use the app only for trace, debug, AIC, games and communication.

The app degrades to "four excellent modules instead of six", which is still far more than you'd
have otherwise.
