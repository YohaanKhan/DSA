import 'server-only';

import { and, eq, gte, sql } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { attempts, readinessSnapshots } from '@/lib/db/schema';
import { p0Topics } from '@/lib/content/topics';
import type { StageId } from '@/lib/config/stages';

/**
 * readiness = 100 * (0.50*accuracy + 0.20*speed + 0.20*coverage + 0.10*consistency)
 * See plan/07-SCORING-AND-ANALYTICS.md §9.
 *
 * Cold start returns null — NOT zero. An untested stage is not a failing stage,
 * and showing 0 would make the dashboard lie to you.
 */

export const MIN_ATTEMPTS_FOR_READINESS = 10;
const RECENT_WINDOW = 50;
const COVERAGE_ATTEMPTS_PER_TOPIC = 10;

export interface StageReadiness {
  stage: StageId;
  readiness: number | null;
  accuracy: number;
  speedFactor: number;
  coverage: number;
  consistency: number;
  attempts: number;
  history: (number | null)[];
}

export function computeReadiness(stage: StageId): StageReadiness {
  const rows = db
    .select({
      correct: attempts.correct,
      partialScore: attempts.partialScore,
      timeMs: attempts.timeMs,
      topic: attempts.topic,
      createdAt: attempts.createdAt,
      sessionId: attempts.sessionId,
    })
    .from(attempts)
    .where(eq(attempts.stage, stage))
    .orderBy(sql`${attempts.createdAt} desc`)
    .limit(RECENT_WINDOW)
    .all();

  const total = db
    .select({ n: sql<number>`count(*)` })
    .from(attempts)
    .where(eq(attempts.stage, stage))
    .get();

  const attemptCount = total?.n ?? 0;

  if (attemptCount < MIN_ATTEMPTS_FOR_READINESS) {
    return {
      stage,
      readiness: null,
      accuracy: 0,
      speedFactor: 0,
      coverage: 0,
      consistency: 0,
      attempts: attemptCount,
      history: readinessHistory(stage),
    };
  }

  // Accuracy — partial scores (debug, AIC, essay) count as fractional credit.
  const scored = rows.map((r) => r.partialScore ?? (r.correct ? 1 : 0));
  const accuracy = scored.reduce((a, b) => a + b, 0) / Math.max(1, scored.length);

  // Speed — target time comes from the item bank; approximated here by the
  // observed median, so the term is meaningful before targets are wired in.
  const times = rows.map((r) => r.timeMs).filter((t) => t > 0).sort((a, b) => a - b);
  const median = times.length ? times[Math.floor(times.length / 2)] : 0;
  const mean = times.length ? times.reduce((a, b) => a + b, 0) / times.length : 0;
  const speedFactor = mean > 0 && median > 0 ? clamp(median / mean, 0, 1) : 0;

  // Coverage — fraction of this stage's P0 topics with enough attempts.
  const p0 = p0Topics(stage);
  let covered = 0;
  for (const topic of p0) {
    const n = db
      .select({ n: sql<number>`count(*)` })
      .from(attempts)
      .where(and(eq(attempts.stage, stage), eq(attempts.topic, topic)))
      .get();
    if ((n?.n ?? 0) >= COVERAGE_ATTEMPTS_PER_TOPIC) covered++;
  }
  const coverage = p0.length > 0 ? covered / p0.length : 0;

  // Consistency — spread of the last five session scores.
  const bySession = new Map<string, number[]>();
  for (const r of rows) {
    const list = bySession.get(r.sessionId) ?? [];
    list.push(r.partialScore ?? (r.correct ? 1 : 0));
    bySession.set(r.sessionId, list);
  }
  const sessionScores = [...bySession.values()]
    .slice(0, 5)
    .map((list) => list.reduce((a, b) => a + b, 0) / list.length);
  const consistency =
    sessionScores.length < 2
      ? 0.5
      : clamp(1 - stdev(sessionScores) / Math.max(0.01, avg(sessionScores)), 0, 1);

  const readiness = 100 * (0.5 * accuracy + 0.2 * speedFactor + 0.2 * coverage + 0.1 * consistency);

  return {
    stage,
    readiness,
    accuracy,
    speedFactor,
    coverage,
    consistency,
    attempts: attemptCount,
    history: readinessHistory(stage),
  };
}

/** Last seven daily snapshots, oldest first, with gaps as null. */
function readinessHistory(stage: StageId): (number | null)[] {
  const sevenDaysAgo = new Date(Date.now() - 7 * 86_400_000);
  const rows = db
    .select({ readiness: readinessSnapshots.readiness, computedAt: readinessSnapshots.computedAt })
    .from(readinessSnapshots)
    .where(and(eq(readinessSnapshots.stage, stage), gte(readinessSnapshots.computedAt, sevenDaysAgo)))
    .orderBy(readinessSnapshots.computedAt)
    .all();

  const byDay = new Map<string, number>();
  for (const r of rows) byDay.set(r.computedAt.toISOString().slice(0, 10), r.readiness);

  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(Date.now() - (6 - i) * 86_400_000).toISOString().slice(0, 10);
    return byDay.get(d) ?? null;
  });
}

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));
const avg = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
const stdev = (xs: number[]) => {
  const m = avg(xs);
  return Math.sqrt(avg(xs.map((x) => (x - m) ** 2)));
};
