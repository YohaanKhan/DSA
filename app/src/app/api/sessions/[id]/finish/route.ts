import { NextResponse } from 'next/server';
import { eq, inArray } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { attempts, items, sessions } from '@/lib/db/schema';
import { summarise } from '@/lib/scoring/mcq';
import { snapshotReadiness } from '@/lib/scoring/snapshot';

export async function POST(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;

  const session = db.select().from(sessions).where(eq(sessions.id, id)).get();
  if (!session) return NextResponse.json({ error: 'No such session' }, { status: 404 });

  const rows = db.select().from(attempts).where(eq(attempts.sessionId, id)).all();

  const targets = new Map<string, number>();
  if (rows.length) {
    const itemRows = db
      .select({ id: items.id, targetSeconds: items.targetSeconds })
      .from(items)
      .where(inArray(items.id, rows.map((r) => r.itemId)))
      .all();
    for (const it of itemRows) targets.set(it.id, it.targetSeconds);
  }

  const stats = summarise(
    rows.map((r) => ({
      correct: r.correct,
      confidence: r.confidence,
      timeMs: r.timeMs,
      targetSeconds: targets.get(r.itemId) ?? 60,
    })),
  );

  db.update(sessions)
    .set({ finishedAt: new Date(), score: stats.correct, maxScore: stats.attempted, meta: stats })
    .where(eq(sessions.id, id))
    .run();

  // Trends need history, and history needs writing. Idempotent per day.
  snapshotReadiness();

  return NextResponse.json(stats);
}
