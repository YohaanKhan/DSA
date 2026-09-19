import { z } from 'zod';

/**
 * Content schemas — the single source of truth for both validation and types
 * (ADR-006). Everything in content/*.json must parse against these.
 * See plan/06-DATA-MODEL.md.
 */

export const STAGES = [
  'english', 'ai-literacy', 'technical', 'debugging', 'aic', 'cognitive', 'behavioural',
] as const;

export const Base = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/, 'id must be lowercase kebab-case'),
  stage: z.enum(STAGES),
  topic: z.string().min(1),
  subtopic: z.string().optional(),
  difficulty: z.enum(['easy', 'medium', 'hard']),
  priority: z.enum(['P0', 'P1', 'P2']),
  tags: z.array(z.string()).default([]),
  source: z.enum(['authored', 'generated', 'adapted']),
  // Up to 30 minutes: the debugging round is ~20 and AI-assisted coding ~30.
  targetSeconds: z.number().int().min(15).max(1800),
});

const Option = z.object({
  id: z.enum(['a', 'b', 'c', 'd']),
  text: z.string().min(1),
});

export const MCQItem = Base.extend({
  kind: z.literal('mcq'),
  stem: z.string().min(10),
  code: z.object({ language: z.string(), source: z.string() }).optional(),
  options: z.array(Option).length(4),
  answer: z.enum(['a', 'b', 'c', 'd']),
  explanation: z.string().min(40, 'explanation must state the rule, not just the answer'),
  distractorRationale: z.record(z.string(), z.string()).optional(),
});

export const TraceItem = Base.extend({
  kind: z.literal('trace'),
  language: z.enum(['pseudocode', 'c', 'cpp', 'java']),
  sourceCode: z.string().min(10),
  question: z.string().min(5),
  answerMode: z.enum(['exact', 'mcq']),
  answer: z.string(),
  options: z.array(z.object({ id: z.string(), text: z.string() })).optional(),
  explanation: z.string().min(40),
  executionTrace: z
    .array(
      z.object({
        step: z.number().int(),
        line: z.number().int().positive(),
        vars: z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.array(z.any()), z.null()])),
        output: z.string().optional(),
        note: z.string().optional(),
      }),
    )
    .min(1, 'a trace item must carry the execution trace that proves its answer'),
});

export const BUG_FAMILIES = [
  'off-by-one', 'inverted-condition', 'wrong-variable', 'missing-return', 'bad-init',
  'boundary-overflow', 'assign-in-condition', 'wrong-operator', 'syntax', 'runtime',
] as const;

export const DebugItem = Base.extend({
  kind: z.literal('debug'),
  language: z.enum(['c', 'cpp', 'java']),
  problem: z.string().min(40),
  brokenSource: z.string().min(10),
  referenceSource: z.string().min(10),
  bugs: z
    .array(
      z.object({
        family: z.enum(BUG_FAMILIES),
        line: z.number().int().positive(),
        description: z.string().min(5),
      }),
    )
    .min(1),
  tests: z
    .array(
      z.object({
        name: z.string(),
        stdin: z.string(),
        expectedStdout: z.string(),
        hidden: z.boolean().default(false),
        edgeCase: z.boolean().default(false),
      }),
    )
    .min(3, 'a debug item needs at least three tests'),
  hints: z.array(z.string()).length(4, 'the hint ladder is exactly four rungs'),
});

export const AICProblem = Base.extend({
  kind: z.literal('aic'),
  title: z.string().min(3),
  problem: z.string().min(40),
  language: z.enum(['c', 'cpp', 'java', 'python']),
  rubric: z.object({
    frame: z.array(z.string()).min(1),
    plan: z.array(z.string()).min(1),
    prompt: z.array(z.string()).min(1),
    review: z.array(z.string()).min(1),
  }),
  referenceSolution: z.string().min(10),
  modelPromptExample: z.string().min(40),
  fallbackAssistantOutput: z.string().optional(),
  tests: z.array(z.object({ stdin: z.string(), expectedStdout: z.string() })).min(3),
});

export const EssayPrompt = Base.extend({
  kind: z.literal('essay'),
  prompt: z.string().min(20),
  minutes: z.number().int().positive().default(25),
  targetWords: z.tuple([z.number().int(), z.number().int()]).default([250, 350]),
  rubric: z.object({
    taskResponse: z.string(),
    structure: z.string(),
    grammar: z.string(),
    vocabulary: z.string(),
    mechanics: z.string(),
  }),
  modelAnswer: z.string().optional(),
});

export const SpeakPrompt = Base.extend({
  kind: z.literal('speak'),
  prompt: z.string().min(10),
  thinkSeconds: z.number().int().positive().default(45),
  speakSeconds: z.number().int().positive().default(90),
  expectedPoints: z.array(z.string()).min(1),
});

export const ReadPassage = Base.extend({
  kind: z.literal('read'),
  passage: z.string().min(300),
  questions: z.array(MCQItem.partial({ stage: true, priority: true, targetSeconds: true, source: true, topic: true, difficulty: true })).min(1),
});

export const ListenItem = Base.extend({
  kind: z.literal('listen'),
  transcript: z.string().min(100),
  questions: z.array(MCQItem.partial({ stage: true, priority: true, targetSeconds: true, source: true, topic: true, difficulty: true })).min(1),
  playbacksAllowed: z.number().int().positive().default(1),
});

export const BehaviouralItem = Base.extend({
  kind: z.literal('behavioural'),
  trait: z.enum([
    'achievement', 'cooperativeness', 'adaptability', 'conscientiousness',
    'stress-tolerance', 'initiative', 'attention-to-detail', 'teamwork', 'learning-agility',
  ]),
  statement: z.string().min(10),
  scale: z.literal('likert-5'),
  reversed: z.boolean().default(false),
});

export const ContentItem = z.discriminatedUnion('kind', [
  MCQItem, TraceItem, DebugItem, AICProblem,
  EssayPrompt, SpeakPrompt, ReadPassage, ListenItem, BehaviouralItem,
]);

export type ContentItem = z.infer<typeof ContentItem>;
export type MCQItem = z.infer<typeof MCQItem>;
export type TraceItem = z.infer<typeof TraceItem>;
export type DebugItem = z.infer<typeof DebugItem>;
export type AICProblem = z.infer<typeof AICProblem>;
export type StageId = (typeof STAGES)[number];
