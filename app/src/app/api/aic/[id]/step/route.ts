import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/lib/db/client';
import { items } from '@/lib/db/schema';
import { AICProblem } from '@/lib/content/schemas';
import type { RubricElement } from '@/lib/content/schemas';
import {
  complexityMatches, extractComplexity, isMostlyCopied, isRestart,
  containment, scoreReview, scoreRubric, type StepId,
} from '@/lib/scoring/aic';
import { hasApiKey, parseStructured, LlmUnavailableError } from '@/lib/llm/client';
import { AIC_JUDGE_SYSTEM, EXAM_ASSISTANT_SYSTEM, buildJudgePrompt } from '@/lib/llm/prompts';

const Body = z.object({
  step: z.enum(['frame', 'plan', 'prompt', 'review', 'refine']),
  text: z.string().min(1).max(20_000),
  /** Needed on the refine step to tell a targeted follow-up from a restart. */
  previousPrompt: z.string().max(20_000).optional(),
});

const CoveredIds = z.object({ covered: z.array(z.string()) });

/**
 * LLM judging where available, deterministic pattern matching otherwise.
 *
 * The fallback is not a degraded afterthought: it is what runs on exam eve with
 * no internet, and it is what every test in this repo exercises.
 */
async function judge(
  step: StepId,
  text: string,
  elements: RubricElement[],
): Promise<{ covered: string[]; judgedBy: 'model' | 'patterns' }> {
  const deterministic = scoreRubric(text, elements);

  if (!hasApiKey()) return { covered: deterministic.covered, judgedBy: 'patterns' };

  try {
    const result = await parseStructured({
      purpose: 'aic-score',
      model: 'claude-opus-5',
      system: AIC_JUDGE_SYSTEM,
      prompt: buildJudgePrompt({
        step,
        requirements: elements.map((e) => ({ id: e.id, requirement: e.requirement })),
        text,
      }),
      schema: CoveredIds,
      maxTokens: 2_000,
    });
    const valid = new Set(elements.map((e) => e.id));
    return { covered: result.covered.filter((id) => valid.has(id)), judgedBy: 'model' };
  } catch (err) {
    // A cap or an outage must never block a drill.
    if (err instanceof LlmUnavailableError) return { covered: deterministic.covered, judgedBy: 'patterns' };
    throw err;
  }
}

/** Generates code from the candidate's prompt, or serves the flawed fallback. */
async function askAssistant(prompt: string, fallback: string): Promise<{ code: string; live: boolean }> {
  if (!hasApiKey()) return { code: fallback, live: false };
  try {
    const result = await parseStructured({
      purpose: 'aic-assistant',
      model: 'claude-sonnet-5',
      system: EXAM_ASSISTANT_SYSTEM,
      prompt,
      schema: z.object({ code: z.string() }),
      maxTokens: 4_000,
    });
    return { code: result.code, live: true };
  } catch (err) {
    if (err instanceof LlmUnavailableError) return { code: fallback, live: false };
    throw err;
  }
}

export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const parsed = Body.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request', issues: parsed.error.issues }, { status: 400 });
  }
  const { step, text, previousPrompt } = parsed.data;

  const row = db.select().from(items).where(eq(items.id, id)).get();
  if (!row) return NextResponse.json({ error: 'No such problem' }, { status: 404 });
  const problem = AICProblem.parse(row.payload);

  // ---- Prompt step: the anti-paste rule runs BEFORE anything is spent -------
  if (step === 'prompt') {
    if (isMostlyCopied(text, problem.problem)) {
      return NextResponse.json({
        rejected: true,
        overlap: Math.round(containment(text, problem.problem) * 100),
        message:
          'This is mostly the problem statement copied. Frame it in your own words: name the ' +
          'language, state the exact behaviour, list the constraints and edge cases, and say ' +
          'what you want back.',
      });
    }

    const [{ covered }, assistant] = await Promise.all([
      judge('prompt', text, problem.rubric.prompt),
      askAssistant(text, problem.fallbackAssistantOutput),
    ]);

    return NextResponse.json({
      rejected: false,
      outOfFive: round1((covered.length / problem.rubric.prompt.length) * 5),
      covered,
      missed: problem.rubric.prompt.filter((e) => !covered.includes(e.id)).map((e) => e.id),
      requirements: problem.rubric.prompt.map((e) => ({ id: e.id, requirement: e.requirement })),
      assistantOutput: assistant.code,
      liveAssistant: assistant.live,
    });
  }

  // ---- Review step: real issues, minus invented ones ------------------------
  if (step === 'review') {
    const { covered } = await judge('review', text, problem.rubric.review);
    const deterministic = scoreReview(text, problem.rubric.review, problem.reviewDecoys);
    const outOfFive = Math.max(0, round1((covered.length / problem.rubric.review.length) * 5 - deterministic.falsePositives.length * 0.5));

    return NextResponse.json({
      outOfFive,
      covered,
      missed: problem.rubric.review.filter((e) => !covered.includes(e.id)).map((e) => e.id),
      falsePositives: deterministic.falsePositives,
      requirements: problem.rubric.review.map((e) => ({ id: e.id, requirement: e.requirement })),
      decoysNamed: problem.reviewDecoys
        .filter((d) => deterministic.falsePositives.includes(d.id))
        .map((d) => ({ id: d.id, requirement: d.requirement })),
    });
  }

  // ---- Refine step: targeted follow-up, or a restart? ----------------------
  if (step === 'refine') {
    const restart = previousPrompt ? isRestart(text, previousPrompt) : false;
    const assistant = await askAssistant(text, problem.fallbackAssistantOutput);
    return NextResponse.json({
      // A restart is capped: re-stating the whole problem is the behaviour the
      // round trains you out of.
      outOfFive: restart ? 2 : 5,
      restart,
      covered: [], missed: [],
      requirements: [],
      assistantOutput: assistant.code,
      liveAssistant: assistant.live,
      message: restart
        ? 'That restates the original prompt rather than targeting the specific defect. A refine should name what is wrong and ask for that one thing.'
        : null,
    });
  }

  // ---- Frame and Plan ------------------------------------------------------
  const elements = step === 'frame' ? problem.rubric.frame : problem.rubric.plan;
  const { covered } = await judge(step, text, elements);
  let outOfFive = round1((covered.length / elements.length) * 5);

  let complexityNote: string | null = null;
  if (step === 'plan') {
    const stated = extractComplexity(text);
    if (!complexityMatches(stated, problem.expectedComplexity)) {
      complexityNote = stated
        ? `You stated ${stated}; the target here is ${problem.expectedComplexity}.`
        : `No complexity stated. The target here is ${problem.expectedComplexity}.`;
      outOfFive = round1(Math.max(0, outOfFive - 1));
    }
  }

  return NextResponse.json({
    outOfFive,
    covered,
    missed: elements.filter((e) => !covered.includes(e.id)).map((e) => e.id),
    requirements: elements.map((e) => ({ id: e.id, requirement: e.requirement })),
    complexityNote,
  });
}

const round1 = (n: number) => Math.round(n * 10) / 10;
