import 'server-only';

import { desc, eq } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { gameRuns } from '@/lib/db/schema';
import { detectPlateau, type LevelTiming } from '@/lib/scoring/games';
import { GAMES } from './index';
import type { GameId, GameStats } from './types';

export type { GameStats };

const HISTORY = 10;

export function gameStats(game: GameId): GameStats {
  const rows = db
    .select()
    .from(gameRuns)
    .where(eq(gameRuns.game, game))
    .orderBy(desc(gameRuns.createdAt))
    .all();

  // Ten most recent, flipped back to oldest-first for the trend fit.
  const recent = rows.slice(0, HISTORY).map((r) => r.score).reverse();

  return {
    game,
    runs: rows.length,
    best: rows.length > 0 ? Math.max(...rows.map((r) => r.score)) : 0,
    bestLevel: rows.length > 0 ? Math.max(...rows.map((r) => r.maxLevel)) : 0,
    lastScore: rows[0]?.score ?? null,
    recent,
    plateau: detectPlateau(recent),
    lastPlayedAt: rows[0]?.createdAt.toISOString() ?? null,
  };
}

export const allGameStats = (): GameStats[] => GAMES.map((g) => gameStats(g.id));

/**
 * The dashboard asks this before recommending the arcade. A game that has
 * stopped paying should stop being suggested — that is the whole reason plateau
 * detection exists, and it only counts if something acts on it.
 */
export function cognitiveIsSpent(stats = allGameStats()): boolean {
  const judged = stats.filter((s) => s.plateau.runs >= 8);
  return judged.length > 0 && judged.every((s) => s.plateau.plateaued);
}

/** The per-level timings a run recorded, defensively typed on the way out of JSON. */
export const timingsOf = (value: unknown): LevelTiming[] =>
  Array.isArray(value) ? (value as LevelTiming[]) : [];
