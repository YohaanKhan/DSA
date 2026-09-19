import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { items, sessions } from '@/lib/db/schema';
import { remainingMs, type MockState } from '@/lib/mock/state';

/** Current mock state, with remaining time recomputed from the clock. */
export async function GET(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;

  const row = db.select().from(sessions).where(eq(sessions.id, id)).get();
  if (!row || row.mode !== 'mock') return NextResponse.json({ error: 'No such mock' }, { status: 404 });

  const state = row.config as MockState;
  const now = Date.now();

  return NextResponse.json({
    mockId: id,
    profileId: state.profileId,
    currentIndex: state.currentIndex,
    finished: row.finishedAt !== null,
    sections: state.sections.map((section, i) => {
      const s = state.sectionState[i];
      return {
        ...section,
        itemIds: s.itemIds,
        startedAt: s.startedAt,
        finishedAt: s.finishedAt,
        score: s.score,
        skipped: s.skipped,
        skipReason: s.skipReason,
        remainingMs: remainingMs(section, s, now),
        // Fewer items than the profile asks for means a thin bank, not a bug.
        short: !s.skipped && s.itemIds.length < section.count,
      };
    }),
  });
}

/** Answer-free items for the current section. */
export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const { sectionId } = (await request.json()) as { sectionId: string };

  const row = db.select().from(sessions).where(eq(sessions.id, id)).get();
  if (!row || row.mode !== 'mock') return NextResponse.json({ error: 'No such mock' }, { status: 404 });

  const state = row.config as MockState;
  const index = state.sections.findIndex((s) => s.id === sectionId);
  if (index < 0) return NextResponse.json({ error: 'No such section' }, { status: 404 });

  // Opening a section starts its clock, once. A resume must not restart it.
  if (state.sectionState[index].startedAt === null && !state.sectionState[index].skipped) {
    state.sectionState[index].startedAt = Date.now();
    state.currentIndex = index;
    db.update(sessions).set({ config: state }).where(eq(sessions.id, id)).run();
  }

  const ids = state.sectionState[index].itemIds;
  const rows = ids.length
    ? db.select().from(items).all().filter((r) => ids.includes(r.id))
    : [];
  const ordered = ids.map((i) => rows.find((r) => r.id === i)).filter(Boolean);

  return NextResponse.json({
    startedAt: state.sectionState[index].startedAt,
    remainingMs: remainingMs(state.sections[index], state.sectionState[index]),
    items: ordered.map((r) => {
      const p = r!.payload as Record<string, unknown>;
      const {
        answer, explanation, distractorRationale, executionTrace, referenceSource,
        referenceSolution, bugs, modelPromptExample, rubric, reviewDecoys,
        fallbackAssistantOutput, expectedComplexity, ...safe
      } = p;
      void answer; void explanation; void distractorRationale; void executionTrace;
      void referenceSource; void referenceSolution; void bugs; void modelPromptExample;
      void rubric; void reviewDecoys; void fallbackAssistantOutput; void expectedComplexity;
      return { ...safe, id: r!.id, kind: r!.kind, stage: r!.stage, topic: r!.topic,
               subtopic: r!.subtopic, difficulty: r!.difficulty, targetSeconds: r!.targetSeconds };
    }),
  });
}
