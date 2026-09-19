import { NextResponse } from 'next/server';
import { nanoid } from 'nanoid';
import { z } from 'zod';
import { db } from '@/lib/db/client';
import { attempts, gameRuns, sessions } from '@/lib/db/schema';
import { gameStats } from '@/lib/games/stats';
import { isGameId } from '@/lib/games';
import { gameScore } from '@/lib/scoring/games';

const Timing = z.object({
  level: z.number().int().min(1),
  seconds: z.number().min(0),
  credit: z.number().min(0).max(1),
  cleared: z.boolean(),
});

const Body = z.object({
  game: z.string().refine(isGameId, 'Unknown game'),
  seed: z.number().int(),
  // performance.now() deltas are fractional; the column is an integer.
  durationMs: z.number().min(0).transform(Math.round),
  timings: z.array(Timing).min(1),
});

/**
 * Records a run. The score is recomputed here from the timings rather than
 * trusted from the client — not for security (this app is yours alone) but
 * because one scoring implementation is the only way the number on the report
 * and the number in the trend can agree.
 */
export async function POST(request: Request) {
  const parsed = Body.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid run', issues: parsed.error.issues }, { status: 400 });
  }
  const { game, seed, durationMs, timings } = parsed.data;

  const cleared = timings.filter((t) => t.cleared);
  const score = gameScore(cleared);
  const maxLevel = cleared.length > 0 ? Math.max(...cleared.map((t) => t.level)) : 0;
  const now = new Date();

  const sessionId = nanoid();
  db.insert(sessions).values({
    id: sessionId,
    mode: 'game',
    stage: 'cognitive',
    profile: null,
    config: { game, seed },
    startedAt: new Date(now.getTime() - durationMs),
    finishedAt: now,
    score,
    maxScore: null,
    meta: { maxLevel },
  }).run();

  db.insert(gameRuns).values({
    id: nanoid(),
    game,
    maxLevel,
    score,
    durationMs,
    levelTimings: timings,
    createdAt: now,
  }).run();

  // One attempt per level, so the arcade shows up in stage readiness and in the
  // week's totals instead of being invisible to every other screen.
  for (const t of timings) {
    db.insert(attempts).values({
      id: nanoid(),
      sessionId,
      itemId: `${game}:L${t.level}`,
      stage: 'cognitive',
      topic: game,
      response: { seconds: t.seconds },
      correct: t.cleared,
      partialScore: t.credit,
      confidence: null,
      timeMs: Math.round(t.seconds * 1000),
      hintsUsed: 0,
      flagged: false,
      createdAt: now,
    }).run();
  }

  return NextResponse.json({ score, maxLevel, stats: gameStats(game) });
}

export async function GET(request: Request) {
  const game = new URL(request.url).searchParams.get('game');
  if (!game || !isGameId(game)) {
    return NextResponse.json({ error: 'Unknown game' }, { status: 400 });
  }
  return NextResponse.json({ stats: gameStats(game) });
}
