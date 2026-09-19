import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { z } from 'zod';
import { db } from '@/lib/db/client';
import { sessions } from '@/lib/db/schema';

/**
 * Essay session lifecycle: create, autosave, recover.
 *
 * The draft is written to the database as well as localStorage. Losing twenty
 * minutes of writing to a stray refresh on day four of a seven-day plan is
 * unrecoverable morale damage, and one of those two stores will always survive.
 */

interface EssayDraft {
  itemId: string;
  text: string;
  elapsedMs: number;
  savedAt: number;
}

const Start = z.object({ itemId: z.string().min(1) });

const Save = z.object({
  sessionId: z.string().min(1),
  text: z.string().max(60_000),
  elapsedMs: z.number().min(0).transform(Math.round),
});

export async function POST(request: Request) {
  const parsed = Start.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: 'Invalid request' }, { status: 400 });

  const id = nanoid();
  const draft: EssayDraft = { itemId: parsed.data.itemId, text: '', elapsedMs: 0, savedAt: Date.now() };
  db.insert(sessions).values({
    id,
    mode: 'comm',
    stage: 'english',
    profile: null,
    config: { kind: 'essay', itemId: parsed.data.itemId },
    startedAt: new Date(),
    meta: draft,
  }).run();

  return NextResponse.json({ sessionId: id });
}

export async function PATCH(request: Request) {
  const parsed = Save.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  const { sessionId, text, elapsedMs } = parsed.data;

  const row = db.select().from(sessions).where(eq(sessions.id, sessionId)).get();
  if (!row) return NextResponse.json({ error: 'No such session' }, { status: 404 });

  const config = row.config as { itemId: string };
  const draft: EssayDraft = { itemId: config.itemId, text, elapsedMs, savedAt: Date.now() };
  db.update(sessions).set({ meta: draft }).where(eq(sessions.id, sessionId)).run();

  return NextResponse.json({ savedAt: draft.savedAt, words: text.trim() ? text.trim().split(/\s+/).length : 0 });
}

export async function GET(request: Request) {
  const sessionId = new URL(request.url).searchParams.get('session');
  if (!sessionId) return NextResponse.json({ error: 'session is required' }, { status: 400 });

  const row = db.select().from(sessions).where(eq(sessions.id, sessionId)).get();
  if (!row) return NextResponse.json({ error: 'No such session' }, { status: 404 });

  return NextResponse.json({
    draft: row.meta as EssayDraft | null,
    finishedAt: row.finishedAt?.getTime() ?? null,
  });
}
