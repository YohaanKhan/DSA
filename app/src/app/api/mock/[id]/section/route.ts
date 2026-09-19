import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/lib/db/client';
import { sessions } from '@/lib/db/schema';
import { evaluateGates, type MockState } from '@/lib/mock/state';

const Body = z.object({
  sectionId: z.string(),
  /** 0..1 for the section. */
  score: z.number().min(0).max(1),
});

/** Completes a section, evaluates the gate, and advances. */
export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const parsed = Body.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: 'Invalid request' }, { status: 400 });

  const row = db.select().from(sessions).where(eq(sessions.id, id)).get();
  if (!row || row.mode !== 'mock') return NextResponse.json({ error: 'No such mock' }, { status: 404 });

  const state = row.config as MockState;
  const index = state.sections.findIndex((s) => s.id === parsed.data.sectionId);
  if (index < 0) return NextResponse.json({ error: 'No such section' }, { status: 404 });

  state.sectionState[index].finishedAt = Date.now();
  state.sectionState[index].score = parsed.data.score;
  state.currentIndex = index + 1;
  db.update(sessions).set({ config: state }).where(eq(sessions.id, id)).run();

  const section = state.sections[index];
  const passed = !section.eliminatory || parsed.data.score >= section.passMark;

  return NextResponse.json({
    passed,
    eliminatory: section.eliminatory,
    passMark: section.passMark,
    score: parsed.data.score,
    // Shown, but the mock continues: the data from later stages is worth more
    // than stopping would be.
    verdict: evaluateGates(state.sections, state.sectionState),
    nextIndex: index + 1,
    done: index + 1 >= state.sections.length,
  });
}
