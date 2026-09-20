import 'server-only';

import { z } from 'zod';
import { analyseEssay, scoreEssayMechanically, type EssayScore } from '@/lib/scoring/essay';
import { hasApiKey, parseStructured, LlmUnavailableError } from '@/lib/llm/client';
import { ESSAY_GRADER_SYSTEM, buildEssayPrompt } from '@/lib/llm/prompts';

/**
 * Essay grading in two layers.
 *
 * The mechanical layer always runs and never fails. The model layer adds the
 * grammar band and rewrites of the candidate's own sentences when a key is set.
 * The mechanical numbers stay visible either way, so when the two disagree you
 * can see it rather than being handed one number to trust.
 */

const Band = z.object({
  score: z.number().min(0).max(5),
  why: z.string().min(10),
});

const Critique = z.object({
  taskResponse: Band,
  structure: Band,
  grammar: Band,
  vocabulary: Band,
  mechanics: Band,
  rewrites: z.array(z.object({
    original: z.string().min(5),
    rewritten: z.string().min(5),
    why: z.string().min(5),
  })).max(3),
  strongest: z.string().min(10),
  weakest: z.string().min(10),
});

export type EssayCritique = z.infer<typeof Critique>;

export interface EssayResult {
  mechanical: EssayScore;
  model: EssayCritique | null;
  gradedBy: 'mechanical' | 'model';
  /** Why the model layer is absent, when it is. Always shown in the UI. */
  note: string | null;
}

export const CRITERION_LABELS = {
  taskResponse: 'Task response',
  structure: 'Structure',
  grammar: 'Grammar',
  vocabulary: 'Vocabulary',
  mechanics: 'Mechanics',
} as const;

function mechanicalSummary(score: EssayScore): string {
  const m = score.metrics;
  return [
    `${m.words} words (target ${m.targetWords[0]}-${m.targetWords[1]})`,
    `${m.paragraphs} paragraphs, ${m.sentences} sentences`,
    `intro ${m.hasIntro ? 'detected' : 'not detected'}, conclusion ${m.hasConclusion ? 'detected' : 'not detected'}`,
    `mean sentence ${m.meanSentenceWords.toFixed(0)} +/- ${m.sentenceStdev.toFixed(0)} words`,
    `${m.runOns.length} run-on sentences`,
    `lexical variety ${(m.mattr * 100).toFixed(0)}/100`,
    `${m.connectorDensity.toFixed(1)} connectors per 100 words`,
    `${Math.round(m.passiveRatio * 100)}% passive`,
    `${Math.round(m.promptCoverage * 100)}% of prompt key terms addressed`,
  ].join('; ');
}

export async function gradeEssay({
  text, prompt, rubric, targetWords,
}: {
  text: string;
  prompt: string;
  rubric: Record<string, string>;
  targetWords: [number, number];
}): Promise<EssayResult> {
  const mechanical = scoreEssayMechanically(analyseEssay(text, { prompt, targetWords }));

  if (!hasApiKey()) {
    return {
      mechanical,
      model: null,
      gradedBy: 'mechanical',
      note: 'Set ANTHROPIC_API_KEY to add the grammar band and rewrites of your own sentences. Everything else on this page was measured locally and needs no key.',
    };
  }

  try {
    const model = await parseStructured({
      purpose: 'essay-grade',
      model: 'claude-opus-5',
      system: ESSAY_GRADER_SYSTEM,
      prompt: buildEssayPrompt({ prompt, rubric, essay: text, mechanical: mechanicalSummary(mechanical) }),
      schema: Critique,
      maxTokens: 4_000,
    });
    // A rewrite of a sentence you did not write teaches nothing, so drop any
    // the model invented rather than quoted.
    const normalised = text.replace(/\s+/g, ' ').toLowerCase();
    const rewrites = model.rewrites.filter((r) =>
      normalised.includes(r.original.replace(/\s+/g, ' ').toLowerCase().slice(0, 40)));

    return { mechanical, model: { ...model, rewrites }, gradedBy: 'model', note: null };
  } catch (err) {
    if (err instanceof LlmUnavailableError) {
      return { mechanical, model: null, gradedBy: 'mechanical', note: err.message };
    }
    return {
      mechanical,
      model: null,
      gradedBy: 'mechanical',
      note: `The model critique failed (${(err as Error).message}). The mechanical measurements below are unaffected.`,
    };
  }
}

/** Overall out of five: the model's mean where it ran, the mechanical mean otherwise. */
export function overallOf(result: EssayResult): number | null {
  if (result.model) {
    const bands = [
      result.model.taskResponse.score, result.model.structure.score, result.model.grammar.score,
      result.model.vocabulary.score, result.model.mechanics.score,
    ];
    return bands.reduce((a, b) => a + b, 0) / bands.length;
  }
  return result.mechanical.overall;
}
