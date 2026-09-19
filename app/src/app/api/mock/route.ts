import { NextResponse } from 'next/server';
import { nanoid } from 'nanoid';
import { z } from 'zod';
import { db } from '@/lib/db/client';
import { sessions } from '@/lib/db/schema';
import { getProfile, isBuilt } from '@/lib/config/exam-profiles';
import { selectItems } from '@/lib/content/select';
import { GAMES } from '@/lib/games';
import type { MockState, SectionState } from '@/lib/mock/state';

const Body = z.object({ profileId: z.string() });

export async function POST(request: Request) {
  const parsed = Body.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: 'Invalid request' }, { status: 400 });

  const profile = getProfile(parsed.data.profileId);
  if (!profile) return NextResponse.json({ error: 'No such profile' }, { status: 404 });

  // Items are chosen up front so a resume serves the same questions, and so a
  // thin bank is reported honestly rather than silently shortening a section.
  const sectionState: SectionState[] = profile.sections.map((section) => {
    if (!isBuilt(section.kind)) {
      return {
        id: section.id, itemIds: [], startedAt: null, finishedAt: null, score: null,
        skipped: true, skipReason: `The ${section.kind} module is not built yet.`,
      };
    }

    // A cognitive section has no content bank — the puzzles are generated. Its
    // "items" are the games it will run, picked fresh so two mocks differ.
    if (section.kind === 'game') {
      const picked = [...GAMES].sort(() => Math.random() - 0.5).slice(0, section.count).map((g) => g.id);
      return { id: section.id, itemIds: picked, startedAt: null, finishedAt: null, score: null, skipped: false };
    }

    const kinds = section.kind === 'mcq' ? ['mcq'] : [section.kind];
    const itemIds = selectItems({
      kinds,
      stage: section.kind === 'debug' || section.kind === 'aic' ? section.stage : section.stage,
      topics: section.topics,
      count: section.count,
      // Mock realism: a real exam does not serve you your weakest topics.
      strategy: 'random',
    });

    if (itemIds.length === 0) {
      return {
        id: section.id, itemIds: [], startedAt: null, finishedAt: null, score: null,
        skipped: true, skipReason: 'No content seeded for this section yet.',
      };
    }

    return { id: section.id, itemIds, startedAt: null, finishedAt: null, score: null, skipped: false };
  });

  if (sectionState.every((s) => s.skipped)) {
    return NextResponse.json(
      { error: 'Every section in this profile is empty or unbuilt. Seed content first.' },
      { status: 409 },
    );
  }

  const state: MockState = {
    profileId: profile.id,
    sections: profile.sections,
    sectionState,
    currentIndex: 0,
    createdAt: Date.now(),
  };

  const id = nanoid();
  db.insert(sessions).values({
    id, mode: 'mock', stage: null, profile: profile.id,
    config: state, startedAt: new Date(),
  }).run();

  return NextResponse.json({ mockId: id, state });
}

/** Any mock still in progress, so the runner can offer to resume it. */
export async function GET() {
  const open = db.select().from(sessions).all()
    .filter((s) => s.mode === 'mock' && s.finishedAt === null)
    .sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime())[0];

  if (!open) return NextResponse.json({ resumable: null });

  const state = open.config as MockState;
  const section = state.sections[state.currentIndex];
  return NextResponse.json({
    resumable: {
      mockId: open.id,
      profileId: state.profileId,
      sectionLabel: section?.label ?? null,
      startedAt: open.startedAt.toISOString(),
    },
  });
}
