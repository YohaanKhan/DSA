import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { items } from '@/lib/db/schema';
import { AICProblem } from '@/lib/content/schemas';
import { hasApiKey } from '@/lib/llm/client';

/**
 * Serves a problem WITHOUT the rubric, the reference solution or the exemplar
 * prompt. Seeing the rubric before answering would turn every step into a
 * fill-in-the-blanks exercise.
 */
export async function GET(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;

  const row = db.select().from(items).where(eq(items.id, id)).get();
  if (!row) return NextResponse.json({ error: 'No such problem' }, { status: 404 });

  const problem = AICProblem.parse(row.payload);

  return NextResponse.json({
    id: problem.id,
    title: problem.title,
    language: problem.language,
    problem: problem.problem,
    targetSeconds: problem.targetSeconds,
    /** Counts only, so the UI can show "you covered 4 of 6" without leaking which. */
    rubricSizes: {
      frame: problem.rubric.frame.length,
      plan: problem.rubric.plan.length,
      prompt: problem.rubric.prompt.length,
      review: problem.rubric.review.length,
    },
    liveAssistant: hasApiKey(),
  });
}
