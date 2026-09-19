import 'server-only';

import { eq, inArray } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { attempts, items, sessions } from '@/lib/db/schema';
import { priorityOf } from '@/lib/content/topics';
import { evaluateGates, type MockState } from './state';

const PRIORITY_WEIGHT: Record<string, number> = { P0: 1, P1: 0.6, P2: 0.3 };

/** Under 40% of the budget: you skimmed it. */
const RUSHED = 0.4;
/** Over 200%: you over-dwelt, which costs more candidates than not knowing does. */
const DWELT = 2.0;

export function buildReport(mockId: string) {
  const row = db.select().from(sessions).where(eq(sessions.id, mockId)).get();
  if (!row || row.mode !== 'mock') return null;

  const state = row.config as MockState;
  const verdict = evaluateGates(state.sections, state.sectionState);

  const rows = db.select().from(attempts).where(eq(attempts.sessionId, mockId)).all();
  const itemRows = rows.length
    ? db.select().from(items).where(inArray(items.id, rows.map((r) => r.itemId))).all()
    : [];
  const byId = new Map(itemRows.map((r) => [r.id, r]));

  let rushed = 0;
  let dwelt = 0;
  let dweltAndWrong = 0;
  for (const attempt of rows) {
    const target = (byId.get(attempt.itemId)?.targetSeconds ?? 60) * 1000;
    const ratio = attempt.timeMs / target;
    if (ratio < RUSHED) rushed++;
    if (ratio > DWELT) {
      dwelt++;
      if (!attempt.correct) dweltAndWrong++;
    }
  }

  const byTopic = new Map<string, { n: number; correct: number }>();
  for (const attempt of rows) {
    const key = `${attempt.stage}/${attempt.topic}`;
    const entry = byTopic.get(key) ?? { n: 0, correct: 0 };
    entry.n++;
    if (attempt.correct) entry.correct++;
    byTopic.set(key, entry);
  }

  const heatmap = [...byTopic.entries()]
    .map(([key, v]) => {
      const [stage, topic] = key.split('/');
      return {
        stage, topic, attempts: v.n,
        accuracy: v.n > 0 ? v.correct / v.n : 0,
        priority: priorityOf(stage, topic) ?? 'P1',
      };
    })
    .sort((a, b) => a.accuracy - b.accuracy);

  // Ranked by how wrong you were, weighted by how much the exam cares and how
  // often it came up — so a weak P0 topic you saw repeatedly outranks a weak P2
  // topic you saw once.
  const fixes = heatmap
    .map((h) => ({
      ...h,
      urgency: (1 - h.accuracy) * (PRIORITY_WEIGHT[h.priority] ?? 0.5) * Math.log2(h.attempts + 1),
    }))
    .filter((h) => h.urgency > 0)
    .sort((a, b) => b.urgency - a.urgency)
    .slice(0, 3);

  const sections = state.sections.map((section, i) => {
    const s = state.sectionState[i];
    return {
      id: section.id, label: section.label, stage: section.stage, kind: section.kind,
      eliminatory: section.eliminatory, passMark: section.passMark,
      score: s.score, skipped: s.skipped, skipReason: s.skipReason,
      passed: s.score === null ? null : !section.eliminatory || s.score >= section.passMark,
      elapsedMs: s.startedAt && s.finishedAt ? s.finishedAt - s.startedAt : null,
      budgetMs: section.minutes * 60_000,
    };
  });

  const scored = sections.filter((s) => s.score !== null);
  const overall = scored.length ? scored.reduce((sum, s) => sum + (s.score ?? 0), 0) / scored.length : 0;

  return {
    mockId,
    profileId: state.profileId,
    finished: row.finishedAt !== null,
    verdict,
    overall,
    sections,
    timing: { rushed, dwelt, dweltAndWrong, total: rows.length },
    heatmap,
    fixes,
    wrong: rows
      .filter((a) => !a.correct)
      .map((a) => {
        const item = byId.get(a.itemId);
        const p = (item?.payload ?? {}) as Record<string, unknown>;
        return {
          itemId: a.itemId, stage: a.stage, topic: a.topic,
          stem: (p.stem as string | undefined) ?? (p.question as string | undefined) ?? (p.title as string | undefined) ?? '',
          explanation: (p.explanation as string | undefined) ?? '',
          timeMs: a.timeMs,
          targetMs: (item?.targetSeconds ?? 60) * 1000,
        };
      }),
  };
}

export type MockReportData = NonNullable<ReturnType<typeof buildReport>>;
