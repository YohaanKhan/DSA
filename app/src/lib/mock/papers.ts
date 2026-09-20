import 'server-only';

import { and, eq, sql } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { items, sessions } from '@/lib/db/schema';
import { mulberry32 } from '@/lib/games/rng';
import { GAMES } from '@/lib/games';
import type { ExamProfile, MockSection } from '@/lib/config/exam-profiles';
import { isBuilt } from '@/lib/config/exam-profiles';
import type { MockState } from './state';

/**
 * Numbered mock papers.
 *
 * The mock used to draw at random, which meant your second sitting could hand
 * back questions from your first while most of the bank went untouched. Random
 * sampling has no memory.
 *
 * Instead each section's eligible items are shuffled ONCE with a fixed seed and
 * then cut into consecutive slices. Paper 1 takes the first slice, paper 2 the
 * next, and so on, so two papers cannot share a question. The seed depends only
 * on the section id, so paper 3 is the same paper 3 tomorrow — which is what
 * makes "I have done papers 1 and 2" a meaningful statement.
 */

/** Stable across runs: the shuffle must not change when the process restarts. */
function seedFor(sectionId: string): number {
  let h = 2166136261;
  for (let i = 0; i < sectionId.length; i++) {
    h ^= sectionId.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function shuffled(ids: string[], seed: number): string[] {
  const rng = mulberry32(seed);
  const out = ids.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** Every item this section could serve, in a stable order. */
function eligible(section: MockSection): string[] {
  if (section.kind === 'game') return GAMES.map((g) => g.id);

  const conds = [eq(items.kind, section.kind === 'mcq' ? 'mcq' : section.kind), eq(items.stage, section.stage)];
  if (section.topics?.length) conds.push(sql`${items.topic} in ${section.topics}`);

  return db
    .select({ id: items.id })
    .from(items)
    .where(and(...conds))
    .orderBy(items.id)
    .all()
    .map((r) => r.id);
}

export interface SectionSlice {
  itemIds: string[];
  /** True once this section has started reusing items from an earlier paper. */
  recycled: boolean;
}

/**
 * The slice of a section's bank belonging to `paper` (1-based).
 *
 * Past the point where clean slices run out, papers wrap around with a new
 * shuffle. The combination is fresh but the questions are not, and the caller
 * is told so rather than being quietly handed repeats.
 */
export function sectionSlice(section: MockSection, paper: number): SectionSlice {
  const pool = eligible(section);
  if (pool.length === 0) return { itemIds: [], recycled: false };

  const perPaper = Math.min(section.count, pool.length);
  const clean = Math.max(1, Math.floor(pool.length / perPaper));
  const cycle = Math.floor((paper - 1) / clean);
  const indexInCycle = (paper - 1) % clean;

  const order = shuffled(pool, seedFor(section.id) + cycle * 0x9e3779b1);
  const start = indexInCycle * perPaper;
  return {
    itemIds: order.slice(start, start + perPaper),
    recycled: cycle > 0,
  };
}

/**
 * How many papers this profile can serve with no question repeated.
 *
 * The cognitive section is excluded: its puzzles are generated from a fresh
 * seed on every run, so it can never repeat and must not cap the count. Letting
 * it in clamped the whole profile to one paper, because four games drawn four
 * at a time divides to one.
 */
export function cleanPapers(profile: ExamProfile): number {
  let limit = Number.POSITIVE_INFINITY;
  for (const section of profile.sections) {
    if (!isBuilt(section.kind) || section.kind === 'game') continue;
    const pool = eligible(section);
    if (pool.length === 0) continue;
    limit = Math.min(limit, Math.floor(pool.length / Math.min(section.count, pool.length)));
  }
  return Number.isFinite(limit) ? Math.max(1, limit) : 1;
}

/** Which section is the bottleneck, so the UI can say what to author next. */
export function limitingSection(profile: ExamProfile): { label: string; papers: number } | null {
  let worst: { label: string; papers: number } | null = null;
  for (const section of profile.sections) {
    if (!isBuilt(section.kind) || section.kind === 'game') continue;
    const pool = eligible(section);
    if (pool.length === 0) continue;
    const papers = Math.floor(pool.length / Math.min(section.count, pool.length));
    if (!worst || papers < worst.papers) worst = { label: section.label, papers };
  }
  return worst;
}

export interface PaperStatus {
  paper: number;
  state: 'done' | 'in-progress' | 'fresh';
  /** True once this paper reuses questions from an earlier one. */
  recycled: boolean;
  score: number | null;
  mockId: string | null;
}

/**
 * The paper list for a profile: enough entries to cover every clean paper plus
 * one, so there is always a next thing to sit.
 */
export function paperStatuses(profile: ExamProfile): PaperStatus[] {
  const clean = cleanPapers(profile);
  const rows = db.select().from(sessions).where(eq(sessions.mode, 'mock')).all();

  const byPaper = new Map<number, { done: boolean; score: number | null; id: string }>();
  for (const row of rows) {
    const config = row.config as MockState & { paper?: number };
    if (config.profileId !== profile.id) continue;
    const paper = config.paper ?? 1;
    const done = row.finishedAt !== null;
    const prior = byPaper.get(paper);
    // A finished sitting outranks an abandoned one for the same paper.
    if (!prior || (done && !prior.done)) {
      byPaper.set(paper, { done, score: row.score, id: row.id });
    }
  }

  const highest = Math.max(clean, ...[...byPaper.keys(), 0]);
  return Array.from({ length: highest + 1 }, (_, i) => {
    const paper = i + 1;
    const seen = byPaper.get(paper);
    return {
      paper,
      state: seen ? (seen.done ? 'done' : 'in-progress') : 'fresh',
      recycled: paper > clean,
      score: seen?.score ?? null,
      mockId: seen?.id ?? null,
    };
  });
}

/** The lowest paper not yet sat, which is what the Start button should open. */
export function nextPaper(profile: ExamProfile): number {
  const statuses = paperStatuses(profile);
  return (statuses.find((s) => s.state === 'fresh') ?? statuses[statuses.length - 1]).paper;
}
