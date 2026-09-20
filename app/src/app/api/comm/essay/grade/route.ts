import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { z } from 'zod';
import { db } from '@/lib/db/client';
import { attempts, sessions, submissions } from '@/lib/db/schema';
import { loadItems } from '@/lib/content/select';
import { EssayPrompt } from '@/lib/content/schemas';
import { gradeEssay, overallOf } from '@/lib/comm/grade';

const Body = z.object({
  sessionId: z.string().min(1),
  text: z.string().min(1).max(60_000),
  elapsedMs: z.number().min(0).transform(Math.round),
});

export async function POST(request: Request) {
  const parsed = Body.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  const { sessionId, text, elapsedMs } = parsed.data;

  const row = db.select().from(sessions).where(eq(sessions.id, sessionId)).get();
  if (!row) return NextResponse.json({ error: 'No such session' }, { status: 404 });

  const config = row.config as { itemId: string };
  const [item] = loadItems([config.itemId]);
  if (!item) return NextResponse.json({ error: 'The prompt is no longer in the bank' }, { status: 404 });

  const prompt = EssayPrompt.parse({ ...(item.payload as object), id: item.id });
  const result = await gradeEssay({
    text,
    prompt: prompt.prompt,
    rubric: prompt.rubric,
    targetWords: prompt.targetWords as [number, number],
  });

  const overall = overallOf(result);
  const fraction = overall === null ? null : overall / 5;
  const now = new Date();
  const minutes = elapsedMs / 60_000;

  db.update(sessions).set({
    finishedAt: now,
    score: fraction,
    maxScore: 1,
    meta: { itemId: config.itemId, text, elapsedMs, savedAt: Date.now() },
  }).where(eq(sessions.id, sessionId)).run();

  db.insert(submissions).values({
    id: nanoid(),
    sessionId,
    itemId: config.itemId,
    kind: 'essay',
    artifacts: {
      language: 'en',
      prompt: prompt.prompt,
      text,
      elapsedMs,
      // Composition speed and proofing behaviour are the habits being trained,
      // so they are stored with the essay rather than derived later.
      wordsPerMinute: minutes > 0 ? result.mechanical.metrics.words / minutes : 0,
      gradedBy: result.gradedBy,
      metrics: result.mechanical.metrics,
      criteria: result.mechanical.criteria,
      model: result.model,
    },
    score: fraction,
    createdAt: now,
  }).run();

  db.insert(attempts).values({
    id: nanoid(),
    sessionId,
    itemId: config.itemId,
    stage: 'english',
    topic: 'writing',
    response: { words: result.mechanical.metrics.words },
    correct: fraction !== null && fraction >= 0.6,
    partialScore: fraction,
    confidence: null,
    timeMs: elapsedMs,
    hintsUsed: 0,
    flagged: false,
    createdAt: now,
  }).run();

  return NextResponse.json({ result, overall, wordsPerMinute: minutes > 0 ? result.mechanical.metrics.words / minutes : 0 });
}
