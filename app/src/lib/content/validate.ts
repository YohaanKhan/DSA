import { ContentItem } from './schemas';
import { priorityOf, subtopicExists, topicExists } from './topics';

/**
 * The 15 self-check rules from plan/phases/PHASE-00-foundation.md.
 *
 * A bank with a 5% error rate is worse than no bank, because you confidently
 * learn five wrong things and never find out which. V8 and V10 are the two that
 * make the app trustworthy: a trace question cannot claim an answer its own
 * trace contradicts, and a debug exercise cannot be unfixable.
 */

export interface Violation {
  rule: string;
  itemId: string;
  file?: string;
  message: string;
}

const norm = (s: string) => s.toLowerCase().replace(/\s+/g, ' ').trim();

/** Trigram Jaccard similarity — used for near-duplicate detection (V14). */
export function similarity(a: string, b: string): number {
  const grams = (s: string) => {
    const t = norm(s);
    const set = new Set<string>();
    for (let i = 0; i < Math.max(0, t.length - 2); i++) set.add(t.slice(i, i + 3));
    return set;
  };
  const ga = grams(a);
  const gb = grams(b);
  if (ga.size === 0 || gb.size === 0) return 0;
  let inter = 0;
  for (const g of ga) if (gb.has(g)) inter++;
  return inter / (ga.size + gb.size - inter);
}

/** Whitespace-normalised comparison, matching how trace answers are graded. */
export function normaliseOutput(s: string): string {
  return s.replace(/\r\n/g, '\n').split('\n').map((l) => l.trim()).join('\n').trim();
}

export interface ValidateOptions {
  /** Skip the per-bank distribution checks when validating a single item. */
  skipBankRules?: boolean;
}

/**
 * Validates a whole set of items together, because several rules (uniqueness,
 * answer-key distribution, near-duplicates) are only meaningful across a bank.
 */
export function validateItems(
  raw: { item: unknown; file?: string }[],
  options: ValidateOptions = {},
): { items: ContentItem[]; violations: Violation[] } {
  const violations: Violation[] = [];
  const items: ContentItem[] = [];
  const seenIds = new Map<string, string | undefined>();

  for (const { item, file } of raw) {
    const idGuess =
      typeof item === 'object' && item !== null && 'id' in item
        ? String((item as { id: unknown }).id)
        : '<unknown>';

    // V1 — schema parses
    const parsed = ContentItem.safeParse(item);
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        violations.push({
          rule: 'V1',
          itemId: idGuess,
          file,
          message: `${issue.path.join('.') || '(root)'}: ${issue.message}`,
        });
      }
      continue;
    }
    const it = parsed.data;

    // V2 — id unique across all banks
    if (seenIds.has(it.id)) {
      violations.push({
        rule: 'V2',
        itemId: it.id,
        file,
        message: `duplicate id, already defined in ${seenIds.get(it.id) ?? 'another bank'}`,
      });
      continue;
    }
    seenIds.set(it.id, file);

    // V3 — topic/subtopic exist in the registry
    if (!topicExists(it.stage, it.topic)) {
      violations.push({ rule: 'V3', itemId: it.id, file, message: `topic "${it.topic}" is not registered for stage "${it.stage}"` });
    } else if (it.subtopic && !subtopicExists(it.stage, it.topic, it.subtopic)) {
      violations.push({ rule: 'V3', itemId: it.id, file, message: `subtopic "${it.subtopic}" is not registered under ${it.stage}/${it.topic}` });
    } else {
      const registryPriority = priorityOf(it.stage, it.topic);
      if (registryPriority && registryPriority !== it.priority) {
        violations.push({ rule: 'V3', itemId: it.id, file, message: `priority ${it.priority} disagrees with the registry (${registryPriority}) for ${it.stage}/${it.topic}` });
      }
    }

    if (it.kind === 'mcq') {
      // V4 — answer matches an option id (option count is enforced by V1)
      if (!it.options.some((o) => o.id === it.answer)) {
        violations.push({ rule: 'V4', itemId: it.id, file, message: `answer "${it.answer}" does not match any option id` });
      }
      // V5 — no two options textually identical
      const texts = it.options.map((o) => norm(o.text));
      if (new Set(texts).size !== texts.length) {
        violations.push({ rule: 'V5', itemId: it.id, file, message: 'two options are textually identical' });
      }
      // V6 — explanation is not a restatement of the correct option
      const correct = it.options.find((o) => o.id === it.answer);
      if (correct && similarity(it.explanation, correct.text) > 0.6) {
        violations.push({ rule: 'V6', itemId: it.id, file, message: 'explanation merely restates the correct option; it must state the rule' });
      }
      // Banned option text — tests test-taking, not knowledge
      if (texts.some((t) => /^(all|none) of the above$/.test(t))) {
        violations.push({ rule: 'V5', itemId: it.id, file, message: '"All/None of the above" options are not allowed' });
      }
    }

    if (it.kind === 'trace') {
      const lastWithOutput = [...it.executionTrace].reverse().find((s) => s.output !== undefined);
      // V8 — the trace proves the answer
      if (it.answerMode === 'exact') {
        if (!lastWithOutput) {
          violations.push({ rule: 'V8', itemId: it.id, file, message: 'no step in executionTrace produces output, so the trace cannot prove the answer' });
        } else if (normaliseOutput(lastWithOutput.output!) !== normaliseOutput(it.answer)) {
          violations.push({
            rule: 'V8',
            itemId: it.id,
            file,
            message: `trace output ${JSON.stringify(lastWithOutput.output)} contradicts the stated answer ${JSON.stringify(it.answer)}`,
          });
        }
      }
      // V9 — every traced line exists in the source
      const lineCount = it.sourceCode.replace(/\n$/, '').split('\n').length;
      for (const step of it.executionTrace) {
        if (step.line > lineCount) {
          violations.push({ rule: 'V9', itemId: it.id, file, message: `trace step ${step.step} references line ${step.line}, but the source has ${lineCount} lines` });
          break;
        }
      }
      if (it.answerMode === 'mcq' && (!it.options || it.options.length < 2)) {
        violations.push({ rule: 'V1', itemId: it.id, file, message: 'answerMode "mcq" requires at least two options' });
      }
    }

    if (it.kind === 'debug') {
      // V11 — test coverage and hint ladder (V10 needs a compiler; see checkDebugItemCompiles)
      if (!it.tests.some((t) => t.edgeCase)) {
        violations.push({ rule: 'V11', itemId: it.id, file, message: 'needs at least one test marked edgeCase' });
      }
      if (!it.tests.some((t) => t.hidden)) {
        violations.push({ rule: 'V11', itemId: it.id, file, message: 'needs at least one hidden test, or Submit adds nothing over Run' });
      }
      if (norm(it.brokenSource) === norm(it.referenceSource)) {
        violations.push({ rule: 'V10', itemId: it.id, file, message: 'brokenSource is identical to referenceSource — the exercise is not broken' });
      }
      const refLines = it.referenceSource.split('\n').length;
      for (const bug of it.bugs) {
        if (bug.line > Math.max(refLines, it.brokenSource.split('\n').length)) {
          violations.push({ rule: 'V10', itemId: it.id, file, message: `bug references line ${bug.line}, beyond the source length` });
          break;
        }
      }
    }

    if (it.kind === 'aic') {
      // V13 — rubric arrays non-empty (length is enforced by V1; this catches blank strings)
      for (const [key, arr] of Object.entries(it.rubric)) {
        if ((arr as string[]).some((entry) => entry.trim().length === 0)) {
          violations.push({ rule: 'V13', itemId: it.id, file, message: `rubric.${key} contains an empty requirement` });
        }
      }
    }

    items.push(it);
  }

  if (!options.skipBankRules) {
    violations.push(...bankRules(items));
  }

  return { items, violations };
}

/** Rules that are only meaningful across a whole bank. */
function bankRules(items: ContentItem[]): Violation[] {
  const out: Violation[] = [];

  // V7 — answer-letter distribution, per stage+topic bank of MCQs
  const groups = new Map<string, { id: string; answer: string }[]>();
  for (const it of items) {
    if (it.kind !== 'mcq') continue;
    const key = `${it.stage}/${it.topic}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push({ id: it.id, answer: it.answer });
  }
  for (const [key, group] of groups) {
    if (group.length < 20) continue; // distribution is meaningless on a small bank
    const counts: Record<string, number> = { a: 0, b: 0, c: 0, d: 0 };
    for (const g of group) counts[g.answer]++;
    for (const letter of ['a', 'b', 'c', 'd']) {
      const share = counts[letter] / group.length;
      if (share < 0.15 || share > 0.35) {
        out.push({
          rule: 'V7',
          itemId: key,
          message: `answer "${letter}" is ${(share * 100).toFixed(0)}% of ${group.length} items in ${key} (must be 15-35%); rebalance by permuting options`,
        });
      }
    }
  }

  // V14 — near-duplicate stems within the same topic.
  //
  // Debug items are deliberately excluded: several exercises injected into the
  // same reference solution SHARE a problem statement by design, and differ by
  // one edit. Their real duplicate condition is an identical broken program,
  // checked separately below.
  const byTopic = new Map<string, { id: string; text: string }[]>();
  for (const it of items) {
    const text =
      it.kind === 'mcq' ? it.stem
      : it.kind === 'trace' ? `${it.question} ${it.sourceCode}`
      : it.kind === 'aic' ? it.problem
      : null;
    if (!text) continue;
    const key = `${it.stage}/${it.topic}`;
    if (!byTopic.has(key)) byTopic.set(key, []);
    byTopic.get(key)!.push({ id: it.id, text });
  }
  for (const group of byTopic.values()) {
    for (let i = 0; i < group.length; i++) {
      for (let j = i + 1; j < group.length; j++) {
        if (similarity(group[i].text, group[j].text) > 0.85) {
          out.push({
            rule: 'V14',
            itemId: group[j].id,
            message: `is >85% similar to "${group[i].id}" — near-duplicate content`,
          });
        }
      }
    }
  }

  // V14b — two debug exercises must not be the same broken program. Injection
  // can land two families on the same site, and solving one would give the other away.
  const seenBroken = new Map<string, string>();
  for (const it of items) {
    if (it.kind !== 'debug') continue;
    const key = norm(it.brokenSource);
    const first = seenBroken.get(key);
    if (first) {
      out.push({
        rule: 'V14',
        itemId: it.id,
        message: `has the same broken program as "${first}" — solving one gives the other away`,
      });
    } else {
      seenBroken.set(key, it.id);
    }
  }

  return out;
}
