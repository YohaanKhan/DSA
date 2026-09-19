# 09 — The Python Bridge

**For a candidate whose working language is Python.** Read this before anything else in the
build plan; it changes what you should spend the week on.

---

## The problem, stated plainly

**Python is not accepted in the code-writing rounds.** C, C++ and Java are. `High` confidence,
corroborated across independent sources — see
[the dossier](01-RESEARCH-DOSSIER.md#-if-you-write-python-read-this-first).

Two stages are affected, and they are the two that matter most:

| Stage | What it needs from you | Why it hurts |
| --- | --- | --- |
| **Debugging** (elimination gate) | **Read** unfamiliar C/C++/Java under a 20-minute clock and make a surgical fix | Fail it and the process ends, whatever else you scored |
| **Coding problems** (tier-deciding) | **Write** working C/C++/Java from scratch | Worth ₹3.25 LPA between the bottom and top band |

The AI-assisted coding round may let you name the language in your prompt — but if the grader
compiles the result, the same restriction applies. **Assume it does.**

## The good news, and the honest news

**Good:** the *syntax* gap is genuinely small. Loops, conditionals, arrays and functions map
almost one to one, and you already know the algorithms — that is the hard part, and you have it.
Four focused hours closes most of the gap.

**Honest:** the *reflex* gap is not small, and reflexes are what a 20-minute clock tests. You
will reach for `len(x)`, write `arr[-1]`, forget a `;`, and assume `/` gives you a float. None of
those are hard to know; all of them cost minutes you do not have. The fix is reps, not reading.

**The lowest bar that still clears the gate:** you must *read* C/C++/Java fluently, and *write*
one of them adequately. Reading is much easier than writing, and the debugging gate only needs
reading plus a one-line edit. Prioritise reading.

## Pick one language and commit

Do not spread across three. Pick one to **write** in, and learn to **read** all three (which
comes free — they are C-family and look alike).

| If… | Write in | Why |
| --- | --- | --- |
| You want the shortest path from Python | **Java** | Closest semantics: garbage collected, real strings, `ArrayList`, bounds-checked arrays that throw instead of corrupting memory. No pointers, no manual allocation. |
| You already know some C | **C++** | You get C's speed with `std::vector` and `std::string`, so you avoid manual memory and fixed arrays. |
| Neither | **Java** | Its errors are loud. C's are silent, and silent errors are what kill you under time pressure. |

**Recommendation: Java.** The single biggest risk for a Python programmer in C is that mistakes
do not announce themselves — an out-of-bounds read prints garbage instead of raising. Java
throws, which turns a mystery into a message.

## The twelve differences that will actually bite you

Drilled as a dedicated set in the app: **Debug → `python-bridge`** (10 items, all P0).

| # | Python | C / Java | Why it bites |
| --- | --- | --- | --- |
| 1 | `7 / 2` → `3.5` | `7 / 2` → `3` (int division) | Silent wrong answer. **The single most common one.** |
| 2 | `-7 % 3` → `2` | `-7 % 3` → `-1` | Silent negative index when wrapping or hashing. Fix: `((a % n) + n) % n` |
| 3 | `arr[-1]` | `arr[n-1]` | C: undefined behaviour, often *appears* to work. Java: throws. |
| 4 | `len(x)` | `arr.length` · `s.length()` · `list.size()` | Three different spellings, and Java is inconsistent on purpose |
| 5 | `s[1:4]` | `s.substring(1, 4)` (also end-exclusive) | Java matches Python's convention — but C has no slicing at all |
| 6 | `s += c` in a loop | `StringBuilder.append(c)` | `+=` is O(n²) in Java and will time out |
| 7 | `a == b` for strings | `a.equals(b)` (Java) · `strcmp(a,b) == 0` (C) | `==` compiles and is silently wrong |
| 8 | `if arr:` | `if (arr.length > 0)` | Java: compile error. C: compiles, always true, silently wrong. |
| 9 | `a, b = b, a` | `int t = a; a = b; b = t;` | The two-statement version destroys a value |
| 10 | `ord(c) - ord('a')` | `c - 'a'` | `char` *is* an integer type; watch `'a'` vs `"a"` |
| 11 | `result = []` then `.append()` | Fixed array + your own count, or `ArrayList` / `std::vector` | C arrays do not know their own length |
| 12 | Names always exist or raise | `int count;` holds garbage in C | Passes locally, fails in the grader |

> **Two of these fail silently and will cost you a correct-looking wrong answer: #1 and #2.**
> Everything else either crashes or refuses to compile, which is survivable. Learn those two first.

## Your existing work is the asset

You have 19 files of Python DSA solutions in `dsa-notes/`. They are not wasted — they are the
best source material available, because **you already understand them**, so when a translation
looks wrong you will notice.

The build converts them automatically:

```bash
# 1. Put a C/C++/Java translation in app/content/solutions/ with a .tests.json
# 2. The injector verifies it against the tests, then breaks it eight ways
npm run content:inject
npm run content:validate && npm run db:seed
```

The injector **refuses to proceed if your translation fails its own tests**, so it doubles as a
correctness check on the translation. Two already done and verified:

| Your Python | Translated to | Becomes |
| --- | --- | --- |
| `TwoPointers/MoveZeroes.py` | `move-zeroes.c` | 4 debugging exercises |
| `TwoPointers/BackspaceStringCompare.py` | `backspace-compare.java` | 3 debugging exercises |

**Translate one solution a day.** Writing the translation is the practice; the exercises it
generates are the revision. One file gives you both.

## A four-hour closing plan

Do this before anything else in the week.

| Time | Do this |
| --- | --- |
| **45 min** | Work the `python-bridge` drill set in the app until you get 10/10 twice. These are the traps, not the syntax. |
| **60 min** | Translate two of your own `dsa-notes` solutions to Java by hand. Do **not** look up syntax first — get it wrong, compile, read the errors. The errors teach faster than a reference. |
| **45 min** | Run `npm run content:inject`, then debug the exercises your own translations produced. You know the algorithm cold, so you are training *reading the language*, not solving the problem. |
| **60 min** | Write two fresh easy problems in Java from scratch, no reference: two-sum, reverse a string. Time yourself. |
| **30 min** | The `language-traps` drill set (the general C/C++/Java gotchas, separate from the Python ones). |

**Then, daily for the rest of the week:** one translation (20 min) + two debugging exercises
(30 min). By exam day you will have translated ~7 solutions and debugged ~15 exercises in the
languages that count.

## The boilerplate you should be able to type without thinking

**Java** — memorise this shape; you will start every problem with it.

```java
import java.util.*;

public class Main {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        int n = sc.nextInt();
        int[] arr = new int[n];
        for (int i = 0; i < n; i++) {
            arr[i] = sc.nextInt();
        }
        // solve
        System.out.println(result);
    }
}
```

**C** — if you choose it instead.

```c
#include <stdio.h>

int main(void) {
    int n;
    scanf("%d", &n);          /* the & is not optional */
    int arr[1000];            /* fixed size; track your own count */
    for (int i = 0; i < n; i++) {
        scanf("%d", &arr[i]);
    }
    /* solve */
    printf("%d\n", result);
    return 0;
}
```

Reading a line of text differs and is worth drilling separately: `sc.nextLine()` in Java after
`nextInt()` needs an extra `nextLine()` to consume the newline — a classic that silently reads
an empty string.

## What this changes in the 7-day plan

Insert the four-hour bridge on **Day 1**, before AI Literacy. It is the only item that gates two
other stages, and every debugging rep afterwards is worth more once the syntax stops costing you
attention.

Cut from elsewhere: skip the Cognitive Arcade build (Phase 04) and use public practice sites for
the games instead. The games are down-weighted anyway once they plateau; the language gap is not.
