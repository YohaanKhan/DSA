# 02 — Syllabus Map

Exhaustive topic list per stage, each mapped to a **drill type** in the app and a **priority**.

**Priority key**
- 🔴 **P0** — appears in almost every drive; failing it is likely fatal. Must be solid.
- 🟠 **P1** — commonly appears; costs you marks. Should be solid.
- 🟡 **P2** — occasional; learn if time permits.

**Drill type key** (these map 1:1 to app modules — see [`04-PRODUCT-SPEC.md`](04-PRODUCT-SPEC.md))
`MCQ` · `TRACE` (pseudocode output tracing) · `FIX` (debugging) · `AIC` (AI-assisted coding) ·
`GAME` · `SPEAK` · `WRITE` · `LISTEN` · `READ`

---

## Stage 1 — English Communication

### 1.1 Grammar (🔴 P0) → `MCQ`
| Topic | Notes |
| --- | --- |
| Subject–verb agreement | Collective nouns, "each/every", inverted sentences, "neither…nor" |
| Tenses | Perfect vs. perfect continuous; sequence of tenses in reported speech |
| Articles | a/an/the; zero article; "the" with superlatives/uniques |
| Prepositions | Verb+preposition collocations (the highest-frequency trap) |
| Pronouns & antecedents | Ambiguous reference, case (who/whom), reflexives |
| Conditionals | Zero/1st/2nd/3rd, mixed conditionals |
| Active ↔ passive voice | Conversion with modals and perfect tenses |
| Direct ↔ indirect speech | Backshift rules, questions, imperatives |
| Modifiers | Dangling & misplaced modifiers |
| Parallelism | Lists, correlative conjunctions |
| Conjunctions & connectors | however / therefore / moreover / nevertheless usage |
| Error spotting | "Find the incorrect segment" — very common format |
| Sentence correction | Pick the best rewrite |

### 1.2 Vocabulary (🟠 P1) → `MCQ`
Synonyms · antonyms · one-word substitution · idioms & phrases · commonly confused pairs
(affect/effect, principal/principle, complement/compliment, its/it's, lose/loose, then/than) ·
word-formation (prefix/suffix) · contextual word meaning.

### 1.3 Reading (🟠 P1) → `READ`
Comprehension passages · main idea vs. detail · inference · tone & attitude · author's purpose ·
vocabulary-in-context · para-jumbles (sentence ordering) · cloze test (fill-in-the-passage).

### 1.4 Writing (🔴 P0) → `WRITE`
One essay, 20–30 minutes. Train:
- **Structure**: intro (thesis) → 2–3 body paragraphs (one idea each, evidence) → conclusion
- **Topic types**: technology & society, AI at work, remote work, education, sustainability, ethics
- **Mechanics**: paragraphing, connectors, sentence-length variety, no run-ons
- **Length discipline**: ~250–350 words in 25 minutes ⇒ plan 3 min, write 18, proof 4
- **Common killers**: no thesis, one giant paragraph, unfinished conclusion, tense drift

### 1.5 Speaking (🔴 P0) → `SPEAK`
Scored on **pronunciation, fluency, clarity — not accent**.
- **Prompt types**: describe a picture/situation · opinion on a statement · self-introduction ·
  explain a process · retell what you heard
- **Train**: steady pace (~130–150 wpm), no filler ("um", "like", "basically"), full word-endings,
  complete sentences, audible volume, 3-second think-then-speak habit
- **Anti-pattern**: rushing, imitating an accent, trailing off, long silences

### 1.6 Listening (🟡 P2) → `LISTEN`
Short audio → comprehension question · note-taking · dictation/repeat-what-you-heard.

---

## Stage 2a — AI Literacy ⭐ new, high-ROI

> **~20 questions. Small, closed, learnable in 3–4 hours. Most candidates will skip it.**

### 2a.1 Generative AI foundations (🔴 P0) → `MCQ`
| Concept | What to know |
| --- | --- |
| What generative AI is | Systems that produce new content (text/image/audio/video/code) from learned patterns + user input |
| Discriminative vs. generative | Classify/predict a label vs. produce new content |
| AI vs. ML vs. DL vs. GenAI | The nesting relationship — a classic MCQ |
| Training vs. inference | What happens when, and why cost/latency differ |
| Foundation models | Large pretrained models adapted to many tasks |
| Fine-tuning vs. prompting | When you'd change weights vs. change instructions |
| Modalities & multimodal | Text, image, audio, video, code |

### 2a.2 LLMs and their limitations (🔴 P0) → `MCQ`
| Concept | What to know |
| --- | --- |
| Tokens & tokenisation | Text → tokens; why counts matter for cost/limits |
| Context window | Finite input+output budget; what happens when exceeded |
| **Hallucination** | Plausible-sounding but incorrect/unsupported/fabricated output — **the single most examined concept** |
| Knowledge cutoff | Model doesn't know events after training; no live data without tools |
| Non-determinism | Same prompt can give different outputs; temperature |
| Bias from training data | Model reflects the data it was trained on |
| No true reasoning guarantee | Pattern completion ≠ verified logic; arithmetic/counting weakness |
| Prompt injection | Untrusted input can carry instructions |

> **Exam pattern to memorise:** "Which limitation does this scenario show?" Map:
> made-up citation → **hallucination**; doesn't know a recent event → **knowledge cutoff**;
> long document truncated → **context window**; skewed output about a group → **bias**;
> different answer on re-run → **non-determinism**.

### 2a.3 Prompt engineering (🔴 P0) → `MCQ` + `AIC`
| Technique | What to know |
| --- | --- |
| Specificity & constraints | Task + context + format + constraints beats a bare question |
| Role / persona prompting | "Act as a…" to set framing |
| Zero-shot vs. few-shot | Providing worked examples |
| Chain-of-thought | Asking for step-by-step reasoning |
| Output format specification | "Return JSON with keys x, y" |
| Delimiters & structure | Separating instruction from data |
| Iterative refinement | Follow-ups that narrow, not restart |
| Anti-patterns | Vague, multi-intent, no success criteria, no constraints |

> **The exam question is always:** "Which of these prompts is clearer/better?"
> **The answer is always** the one with: explicit task + explicit constraints + explicit output format.

### 2a.4 RAG — Retrieval-Augmented Generation (🟠 P1) → `MCQ`
Why it exists (ground answers in your own/current data, reduce hallucination) ·
pipeline: **chunk → embed → store in vector DB → retrieve top-k → augment prompt → generate** ·
embeddings & semantic similarity · vector database · why RAG ≠ fine-tuning ·
failure modes (bad chunking, poor retrieval, stale index) · citations/grounding.

### 2a.5 Agentic AI (🟠 P1) → `MCQ`
Agent = model + **tools** + **loop** + goal · tool/function calling · planning & decomposition ·
multi-step execution with observation between steps · multi-agent patterns ·
human-in-the-loop checkpoints · when an agent is/isn't appropriate · guardrails.

### 2a.6 Responsible AI (🔴 P0) → `MCQ`
Fairness & bias mitigation · transparency & explainability · privacy and **never putting
confidential/personal data into a public tool** · accountability & human oversight ·
safety/harm avoidance · **output validation before trusting** · intellectual property &
attribution · environmental cost · regulation awareness (EU AI Act at a headline level).

> **The Responsible-AI answer heuristic:** when unsure, pick the option that says
> *verify / validate / keep a human in the loop / don't share sensitive data*. It is almost
> always correct.

### 2a.7 AI-assisted development (🟠 P1) → `MCQ`
AI code assistants and what they're good/bad at · **always review generated code** ·
security review of generated code · tests as the verification layer · licensing concerns ·
productivity realism (assistants speed drafting, not judgment).

---

## Stage 2b — Technical

### 2b.1 Pseudocode & output tracing (🔴 P0) → `TRACE`
> **The most under-prepared section in the entire exam.**

| Topic | Notes |
| --- | --- |
| Reading pseudocode conventions | `Integer`, `Set`, `Print`, `End`, 1-based vs 0-based indexing |
| Loop tracing | for/while/do-while; off-by-one; loop-variable mutation inside the body |
| Nested loops | Inner/outer counts; total iteration math |
| Conditionals | Nested if/else, short-circuit evaluation |
| Recursion tracing | Call stack, base case, return-value propagation, tree recursion (Fibonacci) |
| **Bitwise operators** | `& \| ^ ~ << >>`; masks; `x & (x-1)`; `x & 1` parity; XOR swap & XOR-cancellation |
| Integer arithmetic | Integer division truncation, modulo with negatives, overflow |
| Arrays in pseudocode | Index arithmetic, in-place swaps, reversal |
| Strings in pseudocode | Char codes, ASCII arithmetic, length handling |
| Pointer/reference semantics | Pass-by-value vs. reference; aliasing |
| "Find the error" variant | Which line breaks it |
| "What line to insert" variant | Minimal fix |

**How to train:** trace by hand with a variable table, every iteration. Speed comes from
*recognising shapes*, not from reading faster. Budget ~60s/question.

### 2b.2 Data structures & algorithms (🔴 P0) → `MCQ` + `TRACE` + code
| Topic | Priority | Notes |
| --- | --- | --- |
| **Arrays** | 🔴 | Traversal, prefix sums, in-place ops, rotation, Kadane |
| **Strings** | 🔴 | Frequency counts, palindromes, reversal, anagrams, compression |
| **Two pointers** | 🔴 | Opposite-ends & fast/slow — *you already have notes on this* |
| **Hashing** | 🔴 | Maps/sets, frequency, seen-before, two-sum family |
| **Searching** | 🔴 | Linear, **binary search + variants** — *you already have notes on this* |
| **Sorting** | 🟠 | Bubble/selection/insertion/merge/quick: complexity, stability, when each is used |
| **Recursion** | 🔴 | Base case, recurrence, factorial/Fibonacci/GCD, backtracking basics |
| **Complexity** | 🔴 | Big-O of every common operation; space complexity |
| Sliding window | 🟠 | Fixed & variable size |
| Greedy | 🟠 | Interval scheduling, coin change (canonical), Partition Labels |
| Stacks & queues | 🟠 | Balanced parentheses, next-greater-element, queue via stacks |
| Linked lists | 🟠 | Reverse, cycle detection, middle, intersection |
| Trees | 🟡 | Traversals, height, BST property |
| Math/number theory | 🟠 | Primes, GCD/LCM, digits, factorial, Armstrong/perfect numbers |
| Matrices | 🟡 | Traversal, transpose, rotation, spiral |

### 2b.3 OOP (🔴 P0) → `MCQ`
Four pillars (encapsulation, abstraction, inheritance, polymorphism) · class vs. object ·
constructors & destructors · **overloading vs. overriding** (the #1 asked distinction) ·
static vs. instance · access modifiers · abstract class vs. interface · `this`/`super` ·
multiple inheritance & the diamond problem · composition vs. inheritance ·
Java specifics: `final`, `equals`/`hashCode`, exception hierarchy, checked vs. unchecked ·
C++ specifics: virtual functions & vtables, pointers vs. references.

### 2b.4 DBMS & SQL (🔴 P0) → `MCQ`
**DBMS theory:** DBMS vs. file system · ER model, keys (primary/foreign/candidate/composite/super) ·
**normalisation 1NF→2NF→3NF→BCNF** (and what anomaly each removes) · denormalisation ·
**ACID** · transactions, commit/rollback/savepoint · concurrency, locks, deadlock ·
indexing (clustered vs. non-clustered, B-tree) · views · stored procedures & triggers ·
SQL vs. NoSQL.

**SQL:** SELECT/WHERE/ORDER BY/LIMIT · **JOINs (inner, left, right, full, self, cross)** ·
GROUP BY + HAVING · aggregates · subqueries & correlated subqueries · set ops
(UNION/UNION ALL/INTERSECT/EXCEPT) · DDL vs. DML vs. DCL vs. TCL ·
constraints · **`NULL` behaviour** (the classic trap: `NULL != NULL`, `COUNT(col)` skips NULLs) ·
`DELETE` vs. `TRUNCATE` vs. `DROP` · window functions at a basic level.

### 2b.5 Operating systems (🟠 P1) → `MCQ`
Process vs. thread · process states & PCB · **scheduling algorithms** (FCFS, SJF, SRTF,
Round Robin, Priority) + computing waiting/turnaround time · context switching ·
**deadlock**: 4 necessary conditions, prevention/avoidance/detection, Banker's algorithm ·
synchronisation: race condition, critical section, mutex vs. semaphore, producer–consumer ·
memory: paging, segmentation, virtual memory, **page replacement (FIFO/LRU/Optimal)**,
thrashing, fragmentation · file systems · I/O basics.

### 2b.6 Computer networks (🟠 P1) → `MCQ`
**OSI 7 layers vs. TCP/IP 4 layers** — which protocol at which layer (asked constantly) ·
**TCP vs. UDP** · 3-way handshake · IP addressing, subnetting basics, IPv4 vs. IPv6 ·
public vs. private IP, NAT · DNS resolution flow · DHCP · **HTTP vs. HTTPS**, status codes,
methods · SSL/TLS at a high level · switch vs. router vs. hub · MAC vs. IP, ARP ·
common ports (20/21, 22, 25, 53, 80, 443, 3306) · topologies · firewall basics.

### 2b.7 Software engineering & version control (🟠 P1) → `MCQ`
SDLC models (waterfall, iterative, **agile/scrum**) · sprint, standup, backlog, retro ·
requirements vs. design vs. testing · testing levels (unit/integration/system/UAT),
black-box vs. white-box, regression, TDD · SOLID principles at headline level ·
**Git**: repo/commit/branch/merge/rebase/pull request, `git status/add/commit/push/pull/
branch/checkout/merge/log/stash/reset/revert`, merge conflicts, `.gitignore`,
centralised vs. distributed VCS · CI/CD concept.

### 2b.8 Programming language fundamentals (🟠 P1) → `MCQ`
**C**: data types & sizes, format specifiers, operator precedence, pointers & pointer arithmetic,
arrays vs. pointers, strings as char arrays, `malloc`/`free`, structs & unions, storage classes,
pre/post increment in expressions, `sizeof`.
**C++**: everything in C, plus references, classes, STL basics (`vector`, `map`, `set`),
constructors, virtual functions.
**Java**: JVM/JRE/JDK, primitives vs. wrappers, String immutability & string pool,
`==` vs. `.equals()`, collections (`ArrayList`, `HashMap`, `HashSet`), exception handling,
`static`, garbage collection, access modifiers.

---

## Stage 3 — Debugging

### 3.1 Bug taxonomy → `FIX`
| Family | Instances to drill |
| --- | --- |
| **Logic** 🔴 | Off-by-one (`<` vs `<=`), inverted condition, wrong variable, wrong operator (`=` vs `==`), misplaced accumulator init/reset, wrong loop bound, incorrect base case, wrong return point, `&&`/`\|\|` swap, integer division where float needed, wrong comparison in sort |
| **Syntax** 🟠 | Missing semicolon/brace, wrong type, undeclared variable, bad function signature, missing return type, mismatched format specifier |
| **Runtime** 🔴 | Array index out of bounds, null/dangling pointer deref, division by zero, infinite loop, stack overflow via bad recursion, uninitialised variable, memory leak, off-the-end string access |

### 3.2 The method (drill until automatic)
1. **Read the spec first.** Write down expected output for 2 inputs *before* reading the code.
2. **Read the code once, end to end.** Don't fix anything yet.
3. **Hypothesise.** Name the bug family before you name the line.
4. **Fix minimally.** Change the least that makes it correct. Never rewrite the function.
5. **Validate edge cases**: empty input, single element, all-same, negatives, zero,
   max/min, duplicates, boundaries (first/last index).

### 3.3 Language-specific traps → `FIX`
**C/C++:** `scanf` missing `&` · `%d` vs `%f` mismatch · `char[]` off-by-one for `\0` ·
`sizeof(arr)` after decay to pointer · `==` on strings instead of `strcmp` · returning a pointer
to a local · unbraced multi-statement if-body.
**Java:** `==` on Strings instead of `.equals()` · integer division · `ArrayList` mutation during
iteration · `int` overflow · `length` (array) vs `length()` (String) vs `size()` (collection) ·
uncaught `NullPointerException` · static/instance confusion.

---

## Stage 4 — AI-Assisted Coding

### 4.1 The 5-step protocol (🔴 P0) → `AIC`
> Drill this until it is muscle memory. The round scores the *process*.

| Step | What you do | What it earns |
| --- | --- | --- |
| **1. Frame** | Restate the problem in your own words: inputs, outputs, constraints, edge cases | Problem-solving marks; makes every later prompt land |
| **2. Plan** | State the approach + complexity target *before* asking for code | Problem-solving + AI-literacy marks |
| **3. Prompt** | Language + exact behaviour + constraints + edge cases + output format | Prompt-quality marks |
| **4. Review** | Read the generated code line by line; name what's wrong or risky | Review-and-adapt marks — most candidates skip this |
| **5. Refine** | One targeted follow-up prompt that fixes the specific gap; then verify | Review-and-adapt marks |

### 4.2 The prompt template
```
Write a <LANGUAGE> function named <NAME> that <EXACT BEHAVIOUR>.

Input:  <types, ranges, constraints>
Output: <type and exact semantics>

Requirements:
- Handle these edge cases: <empty, single, duplicates, negatives, ...>
- Target complexity: <O(n) time, O(1) space>
- <any disallowed library / in-place / stability requirement>

Also state the time and space complexity.
```

### 4.3 Prompt anti-patterns to unlearn
"Write code for second largest" (no language, no edge cases, no complexity) ·
asking for the whole problem in one shot without framing ·
accepting the first output without review ·
restarting from scratch instead of refining ·
not specifying what "distinct"/"sorted"/"in-place" means.

### 4.4 Review checklist (run on every generated snippet)
Edge cases actually handled? · off-by-one in loops/indices? · null/empty input? ·
overflow? · stated complexity matches the code? · variables initialised? ·
does it compile as written? · does it solve the *stated* problem or a similar one? ·
any unnecessary library/import that might not be allowed?

### 4.5 Problem bank shapes to practise on
Second largest distinct · first non-repeating character · two-sum · reverse words in a string ·
merge two sorted arrays · valid parentheses · majority element · move zeroes · rotate array ·
longest substring without repeats · anagram check · frequency of characters ·
missing number in 1..n · remove duplicates in-place · max subarray sum · palindrome check ·
count vowels/consonants · Fibonacci (iterative) · prime check · GCD.

---

## Stage 5 — Cognitive Assessment

### 5.1 Games → `GAME`
| Game | Skill | Drill focus |
| --- | --- | --- |
| **Grid Challenge** 🔴 | Working memory + spatial | Chunking dot positions; rehearsal under interference; grow 4×4 → 6×6 |
| **Switch Challenge** 🔴 | Deductive logic | Build an operator-effect table fast; eliminate candidates |
| **Digit Challenge** 🔴 | Numerical speed | Mental arithmetic under a countdown; digit-use-once constraint |
| **Motion Challenge** 🟠 | Planning/optimisation | Look ahead ≥2 moves; minimum-move discipline, not first-solution |
| **Geo-Sudo** 🟠 | Constraint reasoning | Row/column uniqueness of shapes; scan strategy |

### 5.2 Transferable skills worth training
N-back style working memory · symbol/number substitution speed · mental arithmetic ·
pattern & sequence completion · spatial rotation · sustained attention under time pressure.

### 5.3 The meta-skills that actually move the score
1. **Know every game's rules before the timer starts.** Reading instructions on the clock is
   the single most-cited avoidable loss.
2. **Calibrate speed vs. accuracy.** Errors usually cost more than slowness.
3. **Don't tilt.** One bad level is recoverable; spiralling is not.
4. **Practise to plateau, then stop.** These measure a trait; you cannot grind it far.

### 5.4 Behavioural / PowerSkills (ADEPT-15) → `MCQ` (consistency mode)
Not a test to beat. Train only for **consistency**: the app presents the same underlying trait
from several angles and flags contradictory answers, so you learn where you're
self-inconsistent. Answer honestly.

Traits typically probed: achievement drive · cooperativeness · adaptability · conscientiousness ·
stress tolerance · initiative · attention to detail · teamwork orientation · learning agility.

---

## Cross-stage: how this maps to your existing `dsa-notes/`

| Your existing notes | Feeds directly into |
| --- | --- |
| `BinarySearch/Introduction.md` + 9 variations | 2b.2 Searching (🔴), pseudocode tracing, debugging snippets |
| `TwoPointers/` (9 solutions) | 2b.2 Two pointers (🔴), strings, arrays; AI-assisted coding problem bank |

Both are **on-syllabus and P0**. They are reused as seed content in Phase 1 and Phase 3 —
see [`content/SEED-PLAN.md`](content/SEED-PLAN.md).
