import { NextResponse } from 'next/server';
import { nanoid } from 'nanoid';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/lib/db/client';
import { attempts, items, reviewCards, sessions } from '@/lib/db/schema';
import { ContentItem } from '@/lib/content/schemas';
import { gradeMcq, gradeTrace } from '@/lib/scoring/mcq';
import { NEW_CARD, qualityFrom, schedule } from '@/lib/srs/sm2';

const Body = z.object({
  itemId: z.string(),
  response: z.unknown(),
  timeMs: z.number().int().min(0),
  confidence: z.enum(['high', 'low']).nullable().default(null),
  flagged: z.boolean().default(false),
  hintsUsed: z.number().int().min(0).default(0),
  /** Trace Lab only: the step at which you think your trace diverged. */
  divergenceStep: z.number().int().positive().nullable().default(null),
});

export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id: sessionId } = await ctx.params;

  const parsed = Body.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request', issues: parsed.error.issues }, { status: 400 });
  }
  const body = parsed.data;

  const session = db.select().from(sessions).where(eq(sessions.id, sessionId)).get();
  if (!session) return NextResponse.json({ error: 'No such session' }, { status: 404 });

  const row = db.select().from(items).where(eq(items.id, body.itemId)).get();
  if (!row) return NextResponse.json({ error: 'No such item' }, { status: 404 });

  const item = ContentItem.parse(row.payload);

  const graded =
    item.kind === 'mcq' ? gradeMcq(item, body.response)
    : item.kind === 'trace' ? gradeTrace(item, body.response)
    : null;

  if (!graded) {
    return NextResponse.json({ error: `Cannot grade a "${item.kind}" item here` }, { status: 400 });
  }

  db.insert(attempts)
    .values({
      id: nanoid(),
      sessionId,
      itemId: item.id,
      stage: item.stage,
      topic: item.topic,
      response: { value: body.response, divergenceStep: body.divergenceStep },
      correct: graded.correct,
      partialScore: null,
      confidence: body.confidence,
      timeMs: body.timeMs,
      hintsUsed: body.hintsUsed,
      flagged: body.flagged,
      createdAt: new Date(),
    })
    .run();

  // Spaced repetition. Note a CORRECT answer given with low confidence still
  // schedules a review — see the quality mapping in lib/srs/sm2.ts.
  const existing = db.select().from(reviewCards).where(eq(reviewCards.itemId, item.id)).get();
  const card = existing
    ? {
        easeFactor: existing.easeFactor,
        intervalDays: existing.intervalDays,
        repetitions: existing.repetitions,
        lapses: existing.lapses,
      }
    : NEW_CARD;

  const quality = qualityFrom({
    correct: graded.correct,
    confidence: body.confidence,
    timeMs: body.timeMs,
    targetMs: item.targetSeconds * 1000,
    hintsUsed: body.hintsUsed,
  });
  const next = schedule(card, quality);

  const cardRow = {
    itemId: item.id,
    easeFactor: next.easeFactor,
    intervalDays: next.intervalDays,
    repetitions: next.repetitions,
    lapses: next.lapses,
    dueAt: next.dueAt,
  };
  if (existing) db.update(reviewCards).set(cardRow).where(eq(reviewCards.itemId, item.id)).run();
  else db.insert(reviewCards).values(cardRow).run();

  return NextResponse.json({
    correct: graded.correct,
    answer: graded.answer,
    explanation: graded.explanation,
    distractorRationale: graded.distractorRationale,
    // The trace is the teaching material, so it is only released after answering.
    executionTrace: item.kind === 'trace' ? item.executionTrace : undefined,
    nextReviewInDays: next.intervalDays,
  });
}
