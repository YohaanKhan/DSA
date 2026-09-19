/**
 * Scoring for the AI-assisted coding round.
 * See plan/07-SCORING-AND-ANALYTICS.md §4 and plan/phases/PHASE-03-ai-assisted-coding.md.
 *
 * The round scores the COLLABORATION, not the answer. Prompt (30%) and Review
 * (25%) carry the most because those are the steps candidates skip.
 */

export type StepId = 'frame' | 'plan' | 'prompt' | 'review' | 'refine';

export const STEP_WEIGHTS: Record<StepId, number> = {
  frame: 0.2,
  plan: 0.15,
  prompt: 0.3,
  review: 0.25,
  refine: 0.1,
};

export const STEP_ORDER: StepId[] = ['frame', 'plan', 'prompt', 'review', 'refine'];

export interface RubricElement {
  id: string;
  requirement: string;
  /** Any one matching counts the element as covered in deterministic mode. */
  patterns: string[];
}

export interface RubricResult {
  covered: string[];
  missed: string[];
  /** 0..1 — the fraction of required elements present. */
  fraction: number;
  /** 0..5, the per-step score shown in the UI. */
  outOfFive: number;
}

const normalise = (s: string) => s.toLowerCase().replace(/\s+/g, ' ').trim();

/** Trigram set, used by both the copy check and the restart check. */
function trigrams(text: string): Set<string> {
  const t = normalise(text);
  const set = new Set<string>();
  for (let i = 0; i + 3 <= t.length; i++) set.add(t.slice(i, i + 3));
  return set;
}

/**
 * How much of `candidate` is lifted from `source`, 0..1.
 *
 * Containment, not Jaccard: the question is "what fraction of what you wrote
 * came from the problem statement", which is asymmetric. Jaccard would let a
 * long verbatim paste score low simply because the problem is longer.
 */
export function containment(candidate: string, source: string): number {
  const a = trigrams(candidate);
  const b = trigrams(source);
  if (a.size === 0) return 0;
  let shared = 0;
  for (const g of a) if (b.has(g)) shared++;
  return shared / a.size;
}

export const PASTE_THRESHOLD = 0.7;

/**
 * The single rule that makes this module work.
 *
 * If you can paste the problem statement into the prompt box, you will — and
 * you will practise exactly the behaviour the round penalises. Rejecting it
 * forces you to frame the problem in your own words, which is what steps 3-5
 * are actually training.
 */
export function isMostlyCopied(prompt: string, problem: string, threshold = PASTE_THRESHOLD): boolean {
  // Very short prompts are bad for other reasons; the rubric handles those.
  if (normalise(prompt).length < 40) return false;
  return containment(prompt, problem) >= threshold;
}

/** Marks a rubric element covered if any of its patterns appears in the text. */
export function scoreRubric(text: string, elements: RubricElement[]): RubricResult {
  const haystack = normalise(text);
  const covered: string[] = [];
  const missed: string[] = [];

  for (const element of elements) {
    const hit = element.patterns.some((p) => haystack.includes(normalise(p)));
    (hit ? covered : missed).push(element.id);
  }

  const fraction = elements.length === 0 ? 0 : covered.length / elements.length;
  return { covered, missed, fraction, outOfFive: round1(fraction * 5) };
}

/**
 * Review is scored like the others, minus 0.5 per false positive, so you cannot
 * game it by claiming every possible flaw.
 */
export function scoreReview(
  text: string,
  realIssues: RubricElement[],
  decoys: RubricElement[] = [],
): RubricResult & { falsePositives: string[] } {
  const base = scoreRubric(text, realIssues);
  const haystack = normalise(text);
  const falsePositives = decoys
    .filter((d) => d.patterns.some((p) => haystack.includes(normalise(p))))
    .map((d) => d.id);

  const penalty = falsePositives.length * 0.5;
  const outOfFive = Math.max(0, round1(base.outOfFive - penalty));
  return {
    ...base,
    falsePositives,
    outOfFive,
    fraction: outOfFive / 5,
  };
}

/** Pulls a stated complexity out of free text, e.g. "O(n log n)". */
export function extractComplexity(text: string): string | null {
  const match = /O\s*\(\s*([^)]{1,24})\s*\)/i.exec(text);
  if (!match) return null;
  return `O(${match[1].replace(/\s+/g, ' ').trim().toLowerCase()})`;
}

export function complexityMatches(stated: string | null, expected: string): boolean {
  if (!stated) return false;
  const tidy = (s: string) => s.toLowerCase().replace(/[\s*·]/g, '');
  return tidy(stated) === tidy(expected);
}

/**
 * A refine step should be a targeted follow-up, not a restart. Restating the
 * whole problem is the behaviour the round is training you out of.
 */
export function isRestart(refinePrompt: string, originalPrompt: string): boolean {
  if (normalise(refinePrompt).length < 30) return false;
  return containment(refinePrompt, originalPrompt) >= 0.6;
}

export interface StepScore {
  step: StepId;
  outOfFive: number;
  covered: string[];
  missed: string[];
  falsePositives?: string[];
  note?: string;
}

export interface AicTotal {
  perStep: StepScore[];
  /** 0..100 */
  total: number;
  /** Which single step would gain you the most, by weighted headroom. */
  weakestStep: StepId | null;
}

export function aggregate(steps: StepScore[]): AicTotal {
  let total = 0;
  let worst: { step: StepId; headroom: number } | null = null;

  for (const step of steps) {
    const weight = STEP_WEIGHTS[step.step];
    total += (step.outOfFive / 5) * weight * 100;

    const headroom = (1 - step.outOfFive / 5) * weight;
    if (!worst || headroom > worst.headroom) worst = { step: step.step, headroom };
  }

  return {
    perStep: steps,
    total: round1(total),
    // Only call something the weakest step if there is real headroom there.
    weakestStep: worst && worst.headroom > 0.001 ? worst.step : null,
  };
}

const round1 = (n: number) => Math.round(n * 10) / 10;
