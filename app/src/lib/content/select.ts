import 'server-only';

import { and, eq, inArray, isNull, lte, notInArray, sql } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { attempts, contentIssues, items, reviewCards } from '@/lib/db/schema';
import { priorityOf } from './topics';

/**
 * Item selection. The strategy is what makes the app a diagnostic tool rather
 * than a pile of questions — `weakest` is the default for a reason.
 * See plan/phases/PHASE-01-mcq-and-trace.md step 1.1.
 */

export type Strategy = 'random' | 'unseen' | 'due' | 'weakest';

export interface SelectFilters {
  kinds?: string[];
  stage?: string;
  topics?: string[];
  difficulty?: ('easy' | 'medium' | 'hard')[];
  count: number;
  strategy: Strategy;
}

const PRIORITY_WEIGHT: Record<string, number> = { P0: 1.0, P1: 0.6, P2: 0.3 };

/** Items you flagged as wrong or ambiguous are never served until reviewed. */
function flaggedItemIds(): string[] {
  return db
    .select({ id: contentIssues.itemId })
    .from(contentIssues)
    .where(eq(contentIssues.resolved, false))
    .all()
    .map((r) => r.id);
}

function baseConditions(f: SelectFilters) {
  const conds = [];
  if (f.kinds?.length) conds.push(inArray(items.kind, f.kinds));
  if (f.stage) conds.push(eq(items.stage, f.stage));
  if (f.topics?.length) conds.push(inArray(items.topic, f.topics));
  if (f.difficulty?.length) conds.push(inArray(items.difficulty, f.difficulty));
  const excluded = flaggedItemIds();
  if (excluded.length) conds.push(notInArray(items.id, excluded));
  return conds;
}

export function selectItems(f: SelectFilters): string[] {
  switch (f.strategy) {
    case 'unseen':
      return selectUnseen(f);
    case 'due':
      return selectDue(f);
    case 'weakest':
      return selectWeakest(f);
    case 'random':
    default:
      return selectRandom(f);
  }
}

function selectRandom(f: SelectFilters): string[] {
  return db
    .select({ id: items.id })
    .from(items)
    .where(and(...baseConditions(f)))
    .orderBy(sql`random()`)
    .limit(f.count)
    .all()
    .map((r) => r.id);
}

/** Items never attempted. Maximises coverage early in the week. */
function selectUnseen(f: SelectFilters): string[] {
  const rows = db
    .select({ id: items.id })
    .from(items)
    .leftJoin(attempts, eq(attempts.itemId, items.id))
    .where(and(...baseConditions(f), isNull(attempts.id)))
    .orderBy(sql`random()`)
    .limit(f.count)
    .all();
  return rows.map((r) => r.id);
}

/** Cards the scheduler says are due. Ordered by how overdue they are. */
function selectDue(f: SelectFilters): string[] {
  return db
    .select({ id: items.id })
    .from(items)
    .innerJoin(reviewCards, eq(reviewCards.itemId, items.id))
    .where(and(...baseConditions(f), lte(reviewCards.dueAt, new Date())))
    .orderBy(reviewCards.dueAt)
    .limit(f.count)
    .all()
    .map((r) => r.id);
}

/**
 * The default. In words: spend your next N questions where your accuracy is
 * worst, weighted by how much the exam cares about that topic, and do not
 * re-ask what you have demonstrably already mastered.
 */
function selectWeakest(f: SelectFilters): string[] {
  // Per-topic accuracy over recent attempts.
  const stats = db
    .select({
      stage: attempts.stage,
      topic: attempts.topic,
      n: sql<number>`count(*)`,
      correct: sql<number>`sum(case when ${attempts.correct} then 1 else 0 end)`,
    })
    .from(attempts)
    .groupBy(attempts.stage, attempts.topic)
    .all();

  const accuracyByTopic = new Map<string, number>();
  for (const s of stats) {
    accuracyByTopic.set(`${s.stage}/${s.topic}`, s.n > 0 ? s.correct / s.n : 0);
  }

  // Candidate pool, minus anything answered correctly WITH high confidence
  // in the last two days — that is demonstrated knowledge, not a gap.
  const twoDaysAgo = new Date(Date.now() - 2 * 86_400_000);
  const mastered = db
    .select({ id: attempts.itemId })
    .from(attempts)
    .where(
      and(
        eq(attempts.correct, true),
        eq(attempts.confidence, 'high'),
        sql`${attempts.createdAt} >= ${Math.floor(twoDaysAgo.getTime() / 1000)}`,
      ),
    )
    .all()
    .map((r) => r.id);

  const conds = baseConditions(f);
  if (mastered.length) conds.push(notInArray(items.id, mastered));

  const pool = db
    .select({ id: items.id, stage: items.stage, topic: items.topic, priority: items.priority })
    .from(items)
    .where(and(...conds))
    .all();

  if (pool.length === 0) return [];

  // Score each item by how much attention its topic deserves, then take the top
  // N with a little jitter so repeated drills are not identical.
  const scored = pool.map((item) => {
    const key = `${item.stage}/${item.topic}`;
    // An untried topic scores as a total gap — it is the biggest unknown.
    const accuracy = accuracyByTopic.get(key) ?? 0;
    const weight = PRIORITY_WEIGHT[priorityOf(item.stage, item.topic) ?? item.priority] ?? 0.5;
    const need = (1 - accuracy) * weight;
    return { id: item.id, score: need + Math.random() * 0.15 };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, f.count).map((s) => s.id);
}

/** Loads full payloads for a set of ids, preserving the given order. */
export function loadItems(ids: string[]) {
  if (ids.length === 0) return [];
  const rows = db.select().from(items).where(inArray(items.id, ids)).all();
  const byId = new Map(rows.map((r) => [r.id, r]));
  return ids.map((id) => byId.get(id)).filter((r): r is NonNullable<typeof r> => Boolean(r));
}
