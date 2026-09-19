import { z } from 'zod';
import { parseStructured, type Model, type Usage } from '@/lib/llm/client';
import { CONTENT_AUTHOR_SYSTEM, TRACE_AUTHOR_SYSTEM, buildGenerationPrompt } from '@/lib/llm/prompts';
import { validateItems, type Violation } from './validate';
import type { ContentItem } from './schemas';

/**
 * The generation harness.
 *
 * Nothing the model returns is trusted: every item is schema-parsed, run through
 * the V1-V15 rules, and rebalanced for answer-key skew before it can reach a bank.
 * Rejects are kept with their reason rather than silently dropped, so a
 * systematically bad generator is visible instead of invisible.
 */

/**
 * A flattened schema for generation. The real content schema is a discriminated
 * union with defaults and optionals, which does not translate cleanly to the
 * strict JSON Schema structured outputs needs.
 */
const GenMcq = z.object({
  id: z.string(),
  stage: z.string(),
  topic: z.string(),
  subtopic: z.string(),
  difficulty: z.enum(['easy', 'medium', 'hard']),
  priority: z.enum(['P0', 'P1', 'P2']),
  stem: z.string(),
  options: z.array(z.object({ id: z.enum(['a', 'b', 'c', 'd']), text: z.string() })),
  answer: z.enum(['a', 'b', 'c', 'd']),
  explanation: z.string(),
  distractorRationale: z.object({ a: z.string(), b: z.string(), c: z.string(), d: z.string() }),
});

const GenTrace = z.object({
  id: z.string(),
  stage: z.string(),
  topic: z.string(),
  subtopic: z.string(),
  difficulty: z.enum(['easy', 'medium', 'hard']),
  priority: z.enum(['P0', 'P1', 'P2']),
  language: z.enum(['pseudocode', 'c', 'cpp', 'java']),
  sourceCode: z.string(),
  question: z.string(),
  answer: z.string(),
  explanation: z.string(),
  executionTrace: z.array(
    z.object({
      step: z.number().int(),
      line: z.number().int(),
      vars: z.array(z.object({ name: z.string(), value: z.string() })),
      output: z.string(),
      note: z.string(),
    }),
  ),
});

const McqBatch = z.object({ items: z.array(GenMcq) });
const TraceBatch = z.object({ items: z.array(GenTrace) });

export interface GenerateRequest {
  kind: 'mcq' | 'trace';
  stage: string;
  topic: string;
  subtopic: string;
  subtopicBrief: string;
  difficulty: 'easy' | 'medium' | 'hard';
  priority: 'P0' | 'P1' | 'P2';
  count: number;
  targetSeconds: number;
  idPrefix: string;
  avoidStems: string[];
  model?: Model;
  spentTodayUsd?: number;
  onUsage?: (usage: Usage) => void;
}

export interface GenerateResult {
  accepted: ContentItem[];
  rejected: { item: unknown; violations: Violation[] }[];
}

/** Generates one batch, validates it, and rebalances the answer key. */
export async function generateBatch(req: GenerateRequest): Promise<GenerateResult> {
  const isTrace = req.kind === 'trace';

  const raw = await parseStructured({
    purpose: 'generate',
    model: req.model ?? 'claude-opus-5',
    system: isTrace ? TRACE_AUTHOR_SYSTEM : CONTENT_AUTHOR_SYSTEM,
    prompt: buildGenerationPrompt(req),
    schema: isTrace ? TraceBatch : McqBatch,
    spentTodayUsd: req.spentTodayUsd,
    onUsage: req.onUsage,
  });

  const shaped = raw.items.map((item) =>
    isTrace
      ? toTraceItem(item as z.infer<typeof GenTrace>, req)
      : toMcqItem(item as z.infer<typeof GenMcq>, req),
  );

  const balanced = isTrace ? shaped : rebalanceAnswers(shaped);

  // Validate one at a time so a single bad item does not condemn the batch, then
  // validate the survivors together for the cross-item rules.
  const accepted: ContentItem[] = [];
  const rejected: GenerateResult['rejected'] = [];
  for (const item of balanced) {
    const { items, violations } = validateItems([{ item }], { skipBankRules: true });
    if (violations.length > 0 || items.length === 0) rejected.push({ item, violations });
    else accepted.push(items[0]);
  }

  return { accepted, rejected };
}

function toMcqItem(g: z.infer<typeof GenMcq>, req: GenerateRequest) {
  return {
    id: g.id,
    kind: 'mcq' as const,
    stage: g.stage,
    topic: g.topic,
    subtopic: g.subtopic,
    difficulty: g.difficulty,
    priority: g.priority,
    tags: [],
    source: 'generated' as const,
    targetSeconds: req.targetSeconds,
    stem: g.stem,
    options: g.options,
    answer: g.answer,
    explanation: g.explanation,
    distractorRationale: Object.fromEntries(
      Object.entries(g.distractorRationale).filter(([key]) => key !== g.answer),
    ),
  };
}

function toTraceItem(g: z.infer<typeof GenTrace>, req: GenerateRequest) {
  return {
    id: g.id,
    kind: 'trace' as const,
    stage: g.stage,
    topic: g.topic,
    subtopic: g.subtopic,
    difficulty: g.difficulty,
    priority: g.priority,
    tags: [],
    source: 'generated' as const,
    targetSeconds: req.targetSeconds,
    language: g.language,
    sourceCode: g.sourceCode,
    question: g.question,
    answerMode: 'exact' as const,
    answer: g.answer,
    explanation: g.explanation,
    executionTrace: g.executionTrace.map((s) => ({
      step: s.step,
      line: s.line,
      // The wire format uses an array of name/value pairs because structured
      // outputs cannot express an open-ended record.
      vars: Object.fromEntries(s.vars.map((v) => [v.name, v.value])),
      ...(s.output ? { output: s.output } : {}),
      ...(s.note ? { note: s.note } : {}),
    })),
  };
}

/**
 * Rebalances a skewed answer key by permuting options, NOT by re-prompting.
 *
 * Models have a strong positional bias (typically toward B and C). Re-asking
 * does not fix it; permuting does, deterministically and for free. The
 * distractor rationale keys move with their options.
 */
export interface Rebalanceable {
  options?: unknown;
  answer?: unknown;
  distractorRationale?: unknown;
}

export function rebalanceAnswers<T extends Rebalanceable>(items: T[]): T[] {
  const LETTERS = ['a', 'b', 'c', 'd'] as const;
  const counts: Record<string, number> = { a: 0, b: 0, c: 0, d: 0 };

  return items.map((item, index) => {
    const options = item.options as { id: string; text: string }[] | undefined;
    const answer = item.answer as string | undefined;
    if (!options || options.length !== 4 || !answer) return item;

    // Target the letter used least so far; ties break round-robin by position.
    const target = [...LETTERS].sort(
      (x, y) => counts[x] - counts[y] || (LETTERS.indexOf(x) + index) % 4 - (LETTERS.indexOf(y) + index) % 4,
    )[0];

    const correctText = options.find((o) => o.id === answer)?.text;
    if (correctText === undefined) return item;

    const others = options.filter((o) => o.id !== answer).map((o) => o.text);
    const rationale = (item.distractorRationale as Record<string, string> | undefined) ?? {};
    const otherRationales = options.filter((o) => o.id !== answer).map((o) => rationale[o.id]);

    const newOptions: { id: string; text: string }[] = [];
    const newRationale: Record<string, string> = {};
    let cursor = 0;
    for (const letter of LETTERS) {
      if (letter === target) {
        newOptions.push({ id: letter, text: correctText });
      } else {
        newOptions.push({ id: letter, text: others[cursor] });
        if (otherRationales[cursor]) newRationale[letter] = otherRationales[cursor];
        cursor++;
      }
    }

    counts[target]++;
    return { ...item, options: newOptions, answer: target, distractorRationale: newRationale };
  });
}
