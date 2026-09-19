import { NextResponse } from 'next/server';
import { nanoid } from 'nanoid';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/lib/db/client';
import { attempts, items, sessions, submissions } from '@/lib/db/schema';
import { AICProblem } from '@/lib/content/schemas';
import { runTests, type TestCase } from '@/lib/mutation/inject';
import { aggregate, type StepId, type StepScore } from '@/lib/scoring/aic';
import type { Language } from '@/lib/runner/types';

const Body = z.object({
  elapsedMs: z.number().min(0).transform((n) => Math.round(n)),
  steps: z.array(z.object({
    step: z.enum(['frame', 'plan', 'prompt', 'review', 'refine']),
    outOfFive: z.number().min(0).max(5),
    text: z.string(),
    covered: z.array(z.string()).default([]),
    missed: z.array(z.string()).default([]),
  })).min(1),
  /** The code you finally settled on, from the assistant or edited by you. */
  finalCode: z.string().max(100_000),
});

/** Pulls the code out of a fenced block, since the assistant returns markdown. */
function extractCode(text: string): string {
  const fence = /```[a-zA-Z]*\n([\s\S]*?)```/.exec(text);
  return (fence ? fence[1] : text).trim();
}

export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const parsed = Body.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request', issues: parsed.error.issues }, { status: 400 });
  }
  const body = parsed.data;

  const row = db.select().from(items).where(eq(items.id, id)).get();
  if (!row) return NextResponse.json({ error: 'No such problem' }, { status: 404 });
  const problem = AICProblem.parse(row.payload);

  // Does the code you settled on actually work? The round scores collaboration,
  // but shipping broken code still has to show up somewhere.
  const tests: TestCase[] = problem.tests.map((t, i) => ({
    name: `test-${i + 1}`, stdin: t.stdin, expectedStdout: t.expectedStdout,
  }));
  const code = extractCode(body.finalCode);
  const run = code.length > 0
    ? await runTests(problem.language as Language, code, tests)
    : { outcomes: [], allPassed: false, compileError: 'No code submitted.' };

  const stepScores: StepScore[] = body.steps.map((s) => ({
    step: s.step as StepId,
    outOfFive: s.outOfFive,
    covered: s.covered,
    missed: s.missed,
  }));
  const totals = aggregate(stepScores);

  const now = new Date();
  const sessionId = nanoid();
  db.insert(sessions).values({
    id: sessionId, mode: 'drill', stage: 'aic', profile: null,
    config: { problemId: problem.id },
    startedAt: new Date(now.getTime() - body.elapsedMs), finishedAt: now,
    score: totals.total, maxScore: 100,
    meta: { codePasses: run.allPassed, weakestStep: totals.weakestStep },
  }).run();

  db.insert(attempts).values({
    id: nanoid(), sessionId, itemId: problem.id, stage: 'aic', topic: problem.topic,
    response: { steps: body.steps.map((s) => ({ step: s.step, outOfFive: s.outOfFive })) },
    correct: run.allPassed, partialScore: totals.total / 100,
    confidence: null, timeMs: body.elapsedMs, hintsUsed: 0, flagged: false, createdAt: now,
  }).run();

  // Kept for interview prep: you may be asked to explain code from an earlier round.
  db.insert(submissions).values({
    id: nanoid(), sessionId, itemId: problem.id, kind: 'aic',
    artifacts: {
      language: problem.language,
      steps: body.steps,
      finalCode: code,
      codePasses: run.allPassed,
    },
    score: totals.total / 100, createdAt: now,
  }).run();

  return NextResponse.json({
    ...totals,
    codePasses: run.allPassed,
    compileError: run.compileError,
    failingTests: run.outcomes.filter((o) => !o.passed).map((o) => o.name),
    // Revealed only now: seeing it earlier would make every step fill-in-the-blanks.
    modelPromptExample: problem.modelPromptExample,
    expectedComplexity: problem.expectedComplexity,
    referenceSolution: problem.referenceSolution,
    rubric: {
      frame: problem.rubric.frame.map((e) => ({ id: e.id, requirement: e.requirement })),
      plan: problem.rubric.plan.map((e) => ({ id: e.id, requirement: e.requirement })),
      prompt: problem.rubric.prompt.map((e) => ({ id: e.id, requirement: e.requirement })),
      review: problem.rubric.review.map((e) => ({ id: e.id, requirement: e.requirement })),
    },
  });
}
