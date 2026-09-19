import { NextResponse } from 'next/server';
import { nanoid } from 'nanoid';
import { z } from 'zod';
import { db } from '@/lib/db/client';
import { sessions } from '@/lib/db/schema';
import { loadItems, selectItems } from '@/lib/content/select';

const Body = z.object({
  mode: z.enum(['drill', 'mock', 'review', 'trace']).default('drill'),
  kinds: z.array(z.string()).optional(),
  stage: z.string().optional(),
  topics: z.array(z.string()).optional(),
  difficulty: z.array(z.enum(['easy', 'medium', 'hard'])).optional(),
  count: z.number().int().min(1).max(100).default(20),
  strategy: z.enum(['random', 'unseen', 'due', 'weakest']).default('weakest'),
  timerMode: z.enum(['per-question', 'section', 'none']).default('per-question'),
  seconds: z.number().int().positive().optional(),
});

export async function POST(request: Request) {
  const parsed = Body.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request', issues: parsed.error.issues }, { status: 400 });
  }
  const config = parsed.data;

  let itemIds = selectItems(config);

  // A strategy can legitimately come up empty — no cards due, nothing unseen
  // left. Falling back is better than showing an empty runner, but the caller
  // is told what happened so the UI can say so.
  let fallbackFrom: string | null = null;
  if (itemIds.length === 0 && config.strategy !== 'random') {
    fallbackFrom = config.strategy;
    itemIds = selectItems({ ...config, strategy: 'random' });
  }

  if (itemIds.length === 0) {
    return NextResponse.json(
      { error: 'No items match those filters. Seed more content or widen the filters.' },
      { status: 409 },
    );
  }

  const id = nanoid();
  db.insert(sessions)
    .values({
      id,
      mode: config.mode,
      stage: config.stage ?? null,
      profile: null,
      config: { ...config, itemIds },
      startedAt: new Date(),
    })
    .run();

  return NextResponse.json({
    sessionId: id,
    itemIds,
    fallbackFrom,
    requested: config.count,
    // Fewer items than asked for means the bank is thin here, not a bug.
    short: itemIds.length < config.count,
  });
}

/** The runner fetches items without answers — grading is server-side only. */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const ids = url.searchParams.get('ids')?.split(',').filter(Boolean) ?? [];
  if (ids.length === 0) return NextResponse.json({ items: [] });

  const rows = loadItems(ids);
  const safe = rows.map((row) => {
    const payload = row.payload as Record<string, unknown>;
    // Strip everything that would give the answer away. Not a security measure
    // — you will absolutely open the network tab at 2am otherwise.
    const {
      answer, explanation, distractorRationale, executionTrace,
      referenceSource, referenceSolution, bugs, hints, modelPromptExample,
      ...rest
    } = payload;
    void answer; void explanation; void distractorRationale; void executionTrace;
    void referenceSource; void referenceSolution; void bugs; void hints; void modelPromptExample;
    return rest;
  });

  return NextResponse.json({ items: safe });
}
