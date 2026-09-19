# 01 — Research Dossier: Capgemini Exceller 2026

Everything I could establish about the assessment, with sources and confidence labels.

**Research date:** September 2026
**Method:** web search across placement-prep publishers, campus-report aggregators, and
Capgemini-adjacent sources.

> ### ⚠️ Read this first — a hard caveat
> **Capgemini does not publish an official, universal spec** for Exceller section counts,
> timings, or cutoffs. The pattern is configured **per campus drive**. Multiple reputable
> publishers report *different* numbers for the same section, and both can be right for
> different drives.
>
> Therefore: **trust the shape, not the numbers.** Build and train for the structure; treat
> every "25 questions in 25 minutes" as *indicative of the pressure level*, not a guarantee.
> The app must make section length/timing **configurable** for exactly this reason.

> ### Access limitation, stated plainly
> This session's network egress policy blocked direct page fetches to `faceprep.in`,
> `prepinsta.com`, `guvi.in`, `placementpreparation.io`, `capgemini.com`, and `youtube.com`.
> I could not open those pages myself. The content below is drawn from **search-engine
> extractions** of those pages, which return page content but are one step removed from the
> source. Resource links are listed with real titles and URLs from the search index; I could
> not open the videos to verify their current contents. Where a claim rests only on this,
> it is labelled `Medium` or `Low`.

---

## 1. The program

| Fact | Detail | Confidence |
| --- | --- | --- |
| Program name | **Exceller** — Capgemini's India campus hiring program for technical graduates | High |
| Application route | Placement cell, or **Superset** (`app.joinsuperset.com`); some drives are off-campus | High |
| Extra verification | Several drives require **Aadhaar verification** and an active **DigiLocker** account | Medium |
| Proctoring | AI-proctored online assessment | Medium |
| Result turnaround | ~1–3 weeks for assessment results; interviews scheduled in waves after | Medium |
| Re-application cooldown | ~6 months if you've already appeared in a Capgemini process | Medium |

### Eligibility (commonly reported bar)

| Criterion | Reported value | Confidence |
| --- | --- | --- |
| Degrees | B.E / B.Tech / M.E / M.Tech / MCA; M.Sc (CS or IT) often eligible | High |
| Academics | ~**60%** or **6.0 CGPA** throughout (10th, 12th, UG) | High |
| Backlogs | **No active backlog** at the time of the process | High |
| Education gap | Varies by drive, commonly capped near **2 years** | Medium |

### Package tiers — decided by coding performance

| Track | Grade | Package | Trigger | Confidence |
| --- | --- | --- | --- | --- |
| Analyst | A4 | **₹4.25 LPA** | Clears the process; coding bar not met | High |
| Analyst Star | A4(P) | **₹5.75 LPA** | Solves **1** coding problem | High |
| Senior Analyst | A5 | **₹7.50 LPA** | Solves **both** coding problems | High |

> **The single most important strategic fact in this document.** You do not choose your track.
> The delta between the bottom and top tier is **₹3.25 LPA**, and it is decided almost entirely
> by the coding-heavy stages. Everything else is a *gate*; coding is the *multiplier*.
> Reported coding round: **2 problems / 45 minutes**, medium difficulty. `Medium` confidence.

---

## 2. The five-stage framework

| # | Stage | What it tests | Format | Eliminatory? |
| --- | --- | --- | --- | --- |
| 1 | **English Communication** | Listening, speaking, reading, writing | AI-scored language tasks + MCQ | Yes |
| 2 | **Technical Module** | AI Literacy + DSA/pseudocode + SE fundamentals | MCQ | Yes |
| 3 | **Debugging Assessment** | Find and fix bugs in given code | Code editor; C / C++ / Java | Yes |
| 4 | **AI-Assisted Coding** | Directing an AI assistant to a solution | Guided, step-by-step | Tier-deciding |
| 5 | **Cognitive Assessment** | Working memory, reasoning, behaviour | Game-based + adaptive | Partly |

**The progression rule:** most stages are elimination gates. A brilliant score in one stage
cannot rescue a failed gate in another. Consistency beats a spike. `High` confidence.

Post-assessment there is a **Technical Interview** and an **HR Interview**. The technical
interview may ask you to *explain code you wrote in earlier rounds* — so don't submit anything
in the debugging or AI-assisted rounds that you can't defend. `Medium` confidence.

---

## 3. Stage-by-stage detail

### Stage 1 — English Communication

| Aspect | Reported detail | Confidence |
| --- | --- | --- |
| Skills tested | Listening, speaking, reading, writing | High |
| Scoring | **AI-scored**, not a human panel | High |
| MCQ component | ~**30 questions / 30 minutes**, grammar + vocabulary, 4 options, no negative marking | Medium |
| Essay component | **1 essay in 20–30 minutes** | Medium |
| Speaking component | Speak on a prompt for a short window | Medium |
| Speaking rubric | **Pronunciation, fluency, clarity — not accent** | High |

**Key insight:** the AI rewards *intelligibility and flow*. Clear, steady, well-paced speech
beats a fast or imitated accent. Do not try to sound American. Do try to eliminate filler,
long pauses, and swallowed word-endings.

### Stage 2 — Technical Module ⭐ *biggest change from older guides*

Two MCQ sections. Reported as roughly **20 + 20**, or as a combined **40 questions / 40 minutes**.
Different drives, different splits. `Medium` confidence.

**2a. AI Literacy** — the genuinely new section:
- Generative AI foundations (what it is, what it can/can't do)
- LLM basics and their limitations (hallucination, context, knowledge cutoff)
- Prompt engineering basics (what makes a prompt clear/specific)
- **RAG** (retrieval-augmented generation) concepts
- **Agentic AI** basics (tools, multi-step task execution)
- **Responsible AI** — bias, privacy, transparency, human oversight
- **Output validation** — never trust generated output blindly

Question styles reported:
- *Concept*: "Which limitation of a language model does this scenario show?"
- *Prompt quality*: "Which of these is the clearer prompt for this task?"
- *Responsible AI*: "Which is the safe practice here?" (answer is usually *validate before trusting*)

**2b. Technical** — the classic Capgemini surface:
- **Pseudocode / output tracing** ← historically ~25 Q / 25 min as its own section
- Data structures & algorithms (arrays, strings, hashing, recursion, greedy)
- **OOP** concepts
- **DBMS + SQL**
- **Operating Systems**
- **Computer Networks**
- Software engineering fundamentals, **version control (git)** basics

> **The pseudocode trap.** It looks like a coding test but isn't. You read a block of
> pseudocode or C-style code and answer an MCQ: *what does this output / where is the error /
> what happens if this input changes / what line makes it work*. It gets hard where **loops,
> recursion, bitwise operators, and nested conditions combine**. This is the section freshers
> most under-prepare. `High` confidence.

> ### 🔴 If you write Python, read this first
>
> **Python is not accepted in the code-writing rounds.** Multiple independent sources report
> C, C++ and Java as the only options for the debugging round, and one states plainly that
> Python is prohibited in the coding benchmark. `High` confidence.
>
> This is not a minor inconvenience. Two stages — debugging (an elimination gate) and the
> coding problems (which set your package tier, worth ₹3.25 LPA) — require you to **read and
> write a language you may not use daily**. For a Python-first candidate this is the single
> largest risk to the outcome, and it is invisible until exam day.
>
> The syntax gap is small and learnable in a few hours; the *reflexes* take longer. See
> [`plan/09-PYTHON-BRIDGE.md`](09-PYTHON-BRIDGE.md).
>
> **Verify against your own drive's rules before exam day** — the language list is one of the
> things that varies by campus.

### Stage 3 — Debugging Assessment

| Aspect | Reported detail | Confidence |
| --- | --- | --- |
| Format | Problem statement + code containing one or more defects; fix so it runs correctly | High |
| Volume/time | ~**1 question / ~20 minutes** | Medium |
| Languages | **C, C++, Java only** | High |
| Bug families | **Logic**, **syntax**, **runtime** | High |

Common defect types reported: off-by-one, wrong loop/branch condition, missing return,
wrong variable used, array boundary violation, simple runtime faults.

**The four-step method** (reported, and genuinely good):
1. Read the problem **and** the code — understand intended behaviour *before* touching anything
2. Identify the errors
3. Fix them
4. Validate against **edge cases**

**Key insight:** the skill is *reading someone else's logic and spotting where it breaks* —
a different muscle from authoring. Practise by fixing broken snippets, not writing new ones.
If you write fast and skim, start with **logic-error drills** — that's the family this round
leans on most.

**If you write Python:** you will be handed C, C++ or Java. You need to *read* those fluently
under a 20-minute clock, which is a different and lower bar than writing them — but it is not
zero, and it is the bar this gate actually sets.

### Stage 4 — AI-Assisted Coding ⭐ *unique to Exceller*

Almost no other India IT recruiter runs this. That makes it the **lowest-competition** stage —
most candidates will walk in cold.

| Aspect | Reported detail | Confidence |
| --- | --- | --- |
| Format | Solve a coding problem by **directing an AI assistant**, not writing it all yourself | High |
| Flow | **Scaffolded** — clear, correct inputs at each step unlock the next, ending in code generation | Medium |
| Scored on | **AI literacy, prompt quality, problem-solving, review-and-adapt discipline** | Medium |

**The winning behaviour, reported explicitly:**
1. **Frame the problem first** — a clear problem statement is what makes every later prompt land
2. **Prompt with intent** — structured, specific, with constraints
3. **Always review the generated code before submitting**

A reported example of a good prompt shape:
> *"Write a Java function that returns the second largest distinct value in an integer array.
> Include time complexity."*

Note what that contains: **language + exact behaviour + the word "distinct" (edge case) +
an extra deliverable**. That's the template.

**Key insight:** it scores the *collaboration*, not the answer. Candidates who treat this like
a normal coding round and freeze when asked for step-by-step direction lose here.

### Stage 5 — Cognitive Assessment

| Aspect | Reported detail | Confidence |
| --- | --- | --- |
| Format | **4 games**, randomly drawn from a pool of ~**24** | Medium |
| Duration | ~**20–30 minutes** total (one report: 27 min) | Medium |
| Measures | Working memory, spatial attention/reasoning, pattern recognition, deductive logic, processing speed | High |
| Scoring | Level up on each correct solve; difficulty rises each level | Medium |
| Reported formula | **Level Reward = (Current Level)² / (Time taken at Level)** | Low |

**The four most-reported games:**

| Game | Cognitive target | Mechanic |
| --- | --- | --- |
| **Grid Challenge** | Working memory + spatial orientation | Remember dot locations on a 4×4/5×5/6×6 grid while solving symmetry/rotation challenges between displays |
| **Switch Challenge** | Deductive-logical reasoning | Given an initial 4-symbol sequence and an altered result, deduce which operator code caused the change |
| **Digit Challenge** | Mental numerical speed | Fill missing digits/operators to balance an equation; each digit usable once; rapid countdown |
| **Motion Challenge** | Planning + optimisation | Sliding-block puzzle: get the target block to the exit in the **minimum** number of moves |

Also reported: **Geo-Sudo**.

> **If the reward formula is even roughly right, it changes strategy:** the squared numerator
> means *reaching a higher level* dominates *being fast at a low level*. Push depth, don't
> farm easy levels. But this is `Low` confidence — treat as a hypothesis, not gospel.

**Behavioural / PowerSkills module** (sometimes inside Stage 5, sometimes separate):
- **Untimed**, ~20–25 minutes; reported to use the **ADEPT-15** psychometric framework
- Presents workplace situations, asks how you'd respond
- **No negative marking, no formal elimination** — used for personality/culture mapping
- **Answer honestly and consistently.** Inconsistency is detected. Do not construct a fake profile.
- `Medium` confidence; availability differs between on-campus and off-campus drives

---

## 4. Conflicting reports — logged honestly

| Question | Report A | Report B | How the app handles it |
| --- | --- | --- | --- |
| Technical module size | 20 AI + 20 technical | 40 combined MCQs in 40 min | Configurable section builder |
| English format | 30 MCQ / 30 min (grammar+vocab) | 4-skill AI-scored incl. speaking & essay | Build **both**; mock runs the union |
| Pseudocode placement | Its own 25Q/25min section | Folded into the 40Q technical module | Tag-based question pool, not fixed sections |
| Cognitive timing | 20–30 min | 27 min | Configurable, default 27 |
| Is behavioural eliminatory? | Part of the framework | "No formal elimination" | Practise for consistency, not score |

**Design consequence:** the app's exam config is **data, not code**. One JSON file defines
section composition and timings. When you learn your actual drive's pattern, you edit one file.

---

## 5. What older guides get wrong (and why this matters to you)

Older Capgemini guides describe: pseudocode + quant + English online test → coding round.
The 2026 framework keeps that spirit but **adds two things that did not exist**:

1. An explicit **AI Literacy** section inside the technical module
2. A standalone **AI-assisted coding** stage

These are the two **newest and lowest-competition** parts of the test. If your notes predate
this framework, you are missing precisely the parts where marginal effort buys the most.

**The five repeated mistakes** (reported, and worth internalising):
1. Studying only the old pseudocode-and-quant format; skipping AI Literacy
2. Treating AI-assisted coding like a normal coding round, then freezing at step-by-step direction
3. Practising writing code but never **debugging** it
4. Assuming a strong technical score offsets a weak stage — it does not; gates stand alone
5. Reading each game's instructions **after** the timer starts

---

## 6. Strategic reading of all of the above

1. **Gates vs. multiplier.** Stages 1, 2, 3, 5 are gates — you need *adequate*, not *excellent*.
   Stage 4 (and the coding problems) is the multiplier worth ₹3.25 LPA. Budget accordingly:
   enough to clear every gate, then everything else into coding.
2. **Asymmetric returns.** AI Literacy and AI-assisted coding are new, so the field is weak and
   the content is small and learnable in hours. Highest return per hour in the whole exam.
3. **Debugging is a distinct skill you probably haven't trained.** Reading broken code is not
   writing code. It needs its own reps.
4. **Cognitive games have a ceiling.** Practise to learn the *rules* (so you never read
   instructions on the clock) and to hit your plateau — then stop. Grinding past the plateau
   is the worst use of your remaining hours.
5. **Behavioural is not a test to beat.** Be consistent, be honest, move on.

---

## 7. Sources

Retrieved via web search, September 2026. Direct page access to several of these was blocked by
this session's egress policy; content was obtained through search-engine extraction.

**Framework and stage guides (FACE Prep)**
- [Capgemini Exceller Assessment 2026: Complete Framework Guide](https://faceprep.in/article/capgemini-exceller-assessment-framework-2026-complete-guide/)
- [Capgemini Exceller Eligibility Criteria 2026 & Journey](https://faceprep.in/article/capgemini-exceller-eligibility-criteria-and-assessment-journey-2026/)
- [Capgemini Exceller Technical Assessment 2026: AI + Technical](https://faceprep.in/article/capgemini-exceller-technical-assessment-ai-literacy-questions-2026/)
- [Capgemini Exceller Debugging Assessment 2026: How to Solve It](https://faceprep.in/article/capgemini-exceller-debugging-assessment-2026/)
- [Capgemini Exceller AI-Assisted Coding Round 2026: A Guide](https://faceprep.in/article/capgemini-exceller-ai-assisted-coding-round-2026/)
- [Capgemini Exceller Communication Assessment 2026: Prep Guide](https://faceprep.in/article/capgemini-exceller-communication-assessment-2026/)
- [Capgemini Game-Based Aptitude Test: 2026 Prep Guide](https://faceprep.in/article/capgemini-game-based-aptitude-test-guide-2026/)
- [Capgemini Exceller Previous Year Questions & Sample Paper](https://faceprep.in/article/capgemini-exceller-previous-year-questions-and-sample-paper-2026/)

**Syllabus, pattern and question banks**
- [PrepInsta — Capgemini Exceller Syllabus 2026](https://prepinsta.com/capgemini-syllabus/)
- [PrepInsta — Capgemini Exceller Recruitment Process 2026](https://prepinsta.com/capgemini-recruitment-process/)
- [PrepInsta — Eligibility Criteria](https://prepinsta.com/capgemini/eligibility-criteria/)
- [PrepInsta — Coding Questions](https://prepinsta.com/capgemini/coding-questions/)
- [PrepInsta — Pseudo Code Round MCQ](https://prepinsta.com/capgemini/capgemini-pseudo-code-round-mcq/)
- [PrepInsta — Game Based Aptitude Test Questions 2026](https://prepinsta.com/capgemini/capgemini-game-based-aptitude-test-questions/)
- [PrepInsta — Behavioral Competency Test](https://prepinsta.com/capgemini/behavioral-competency-test/)
- [PrepInsta — English Communication](https://prepinsta.com/capgemini/english-comunication/)
- [GUVI — Capgemini Exceller Technical Assessment 2026](https://www.guvi.in/blog/capgemini-exceller-technical-assessment/)
- [GUVI — Capgemini Exceller Placement Papers Guide 2026](https://www.guvi.in/blog/capgemini-exceller-placement-papers-guide/)
- [PlacementPreparation.io — Latest Syllabus & Test Pattern 2026](https://www.placementpreparation.io/capgemini/syllabus-and-test-pattern/)
- [PlacementPreparation.io — Recruitment & Hiring Process 2026](https://www.placementpreparation.io/capgemini/recruitment-process/)
- [Talent Battle — Capgemini Pseudocode Previous Year Questions](https://talentbattle.in/capgemini/pseudo-code)
- [Unstop — Capgemini Pseudocode Questions: Top 5 Sample MCQs](https://unstop.com/blog/capgemini-pseudo-code-questions)
- [Unstop — Capgemini Job Preparation: Exam Pattern and Syllabus](https://unstop.com/blog/capgemini-preparation)
- [PlacementPreps — Capgemini Exceller 2026 Preparation Guide](https://www.placementpreps.in/company-prep/capgemini-assessment)
- [FreshersHunt — Capgemini Recruitment Process 2026: Exceller Rounds and Salary Tracks](https://freshershunt.in/capgemini-recruitment-process/)
- [KnoffCampusJobs — Capgemini Technical Assessment Questions / AI Literacy](https://knoffcampusjobs.com/capgemini-technical-test-2026/)
- [JobsNet — Capgemini Selection Process 2026–2027](https://jobsnet.in/capgemini-campus-recruitment-interview-questions/)
- [TechnicalHub — Capgemini Cognitive Ability Games](https://technicalhub.io/capgemini/)

**Interview experience & questions**
- [GeeksforGeeks — Capgemini Interview Experience for Software Engineer (2026 On-Campus)](https://www.geeksforgeeks.org/interview-experiences/capgemini-interview-experience-for-software-engineer-2026-on-campus/)
- [PlacementPreparation.io — Sample Interview Questions and Answers 2026](https://www.placementpreparation.io/capgemini/interview-questions/)
- [Unstop — Capgemini Interview Questions for Technical & HR Round](https://unstop.com/blog/capgemini-interview-questions)
- [Foundit — 40+ Capgemini Interview Questions for Freshers 2026](https://www.foundit.in/career-advice/capgemini-interview-questions-for-freshers/)

**Capgemini / Superset first-party**
- [Capgemini India — Technical Graduates careers page](https://www.capgemini.com/in-en/careers/join-capgemini/technical-graduates/)
- [Superset — Capgemini Exceller AgentifAI Buildathon registration](https://app.joinsuperset.com/company/capgemini-buildathon/index.html)
- [Student Handbook — Capgemini Exceller AgentifAI Buildathon 2026 (Scribd)](https://www.scribd.com/document/1020945506/Student-Handbook-Capgemini-Exceller-AgentifAI-Buildathon-2026)

> **On "PPTs and official decks":** I found **no publicly available Capgemini-issued syllabus
> deck or PPT** for the Exceller assessment. The closest first-party artefact is the
> **AgentifAI Buildathon Student Handbook** — but note that the Buildathon is a *separate,
> invitation-only team competition* (teams of 5, 2026/27 batches, Pre-Qualifier → Elevator Pitch
> → Deep Dive → Leadership rounds), **not** the Exceller assessment. It is useful context for
> how seriously Capgemini is pushing agentic AI, and therefore *why* AI Literacy is now examined
> — but it is not a syllabus for your test. Do not mistake one for the other.
