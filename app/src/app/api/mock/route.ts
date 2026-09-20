import { NextResponse } from 'next/server';
import { nanoid } from 'nanoid';
import { z } from 'zod';
import { db } from '@/lib/db/client';
import { sessions } from '@/lib/db/schema';
import { PROFILES, getProfile, isBuilt } from '@/lib/config/exam-profiles';
import { nextPaper, paperStatuses, sectionSlice, cleanPapers, limitingSection } from '@/lib/mock/papers';
import type { MockState, SectionState } from '@/lib/mock/state';

const Body = z.object({
  profileId: z.string(),
  /** 1-based. Omitted means "the next one I have not sat".*/
  paper: z.number().int().min(1).optional(),
});

export async function POST(request: Request) {
  const parsed = Body.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: 'Invalid request' }, { status: 400 });

  const profile = getProfile(parsed.data.profileId);
  if (!profile) return NextResponse.json({ error: 'No such profile' }, { status: 404 });

  const paper = parsed.data.paper ?? nextPaper(profile);

  // Items come from this paper's slice of each bank, not from a random draw, so
  // two papers cannot share a question. See lib/mock/papers.ts.
  const sectionState: SectionState[] = profile.sections.map((section) => {
    if (!isBuilt(section.kind)) {
      return {
        id: section.id, itemIds: [], startedAt: null, finishedAt: null, score: null,
        skipped: true, skipReason: `The ${section.kind} module is not built yet.`,
      };
    }

    const { itemIds } = sectionSlice(section, paper);
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
    paper,
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

  return NextResponse.json({ mockId: id, paper, state });
}

/** Any mock still in progress, plus the paper list for every profile. */
export async function GET() {
  const open = db.select().from(sessions).all()
    .filter((s) => s.mode === 'mock' && s.finishedAt === null)
    .sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime())[0];

  const papers = Object.fromEntries(
    PROFILES.map((p) => [p.id, {
      statuses: paperStatuses(p),
      clean: cleanPapers(p),
      limiting: limitingSection(p),
    }]),
  );

  if (!open) return NextResponse.json({ resumable: null, papers });

  const state = open.config as MockState;
  const section = state.sections[state.currentIndex];
  return NextResponse.json({
    papers,
    resumable: {
      mockId: open.id,
      profileId: state.profileId,
      paper: state.paper ?? 1,
      sectionLabel: section?.label ?? null,
      startedAt: open.startedAt.toISOString(),
    },
  });
}
