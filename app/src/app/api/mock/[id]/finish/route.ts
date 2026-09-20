import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { sessions } from '@/lib/db/schema';
import { buildReport } from '@/lib/mock/report';
import { snapshotReadiness } from '@/lib/scoring/snapshot';

export async function POST(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;

  const report = buildReport(id);
  if (!report) return NextResponse.json({ error: 'No such mock' }, { status: 404 });

  if (!report.finished) {
    db.update(sessions)
      .set({
        finishedAt: new Date(),
        score: report.overall,
        maxScore: 1,
        meta: { verdict: report.verdict, rushed: report.timing.rushed, dwelt: report.timing.dwelt },
      })
      .where(eq(sessions.id, id))
      .run();
    snapshotReadiness();
  }

  return NextResponse.json(report);
}
