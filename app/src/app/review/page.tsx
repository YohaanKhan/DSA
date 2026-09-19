import Link from 'next/link';
import { clsx } from 'clsx';
import { lte } from 'drizzle-orm';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { db } from '@/lib/db/client';
import { items, reviewCards } from '@/lib/db/schema';
import { MAX_INTERVAL_DAYS } from '@/lib/srs/sm2';
import shell from '@/components/shell/Shell.module.css';
import styles from './page.module.css';
import { ReviewLauncher } from './ReviewLauncher';

export const dynamic = 'force-dynamic';

export default async function ReviewPage() {
  const due = db
    .select({
      itemId: reviewCards.itemId,
      dueAt: reviewCards.dueAt,
      lapses: reviewCards.lapses,
      repetitions: reviewCards.repetitions,
    })
    .from(reviewCards)
    .where(lte(reviewCards.dueAt, new Date()))
    .orderBy(reviewCards.dueAt)
    .all();

  const all = db.select({ id: items.id, stage: items.stage, topic: items.topic, kind: items.kind }).from(items).all();
  const byId = new Map(all.map((r) => [r.id, r]));

  // Interleaved, deliberately not grouped: mixing topics beats blocking them
  // for retention, and the exam will not group them either.
  const byStage = new Map<string, number>();
  for (const card of due) {
    const stage = byId.get(card.itemId)?.stage;
    if (stage) byStage.set(stage, (byStage.get(stage) ?? 0) + 1);
  }

  const upcoming = db.select().from(reviewCards).all().filter((c) => c.dueAt > new Date()).length;
  const struggling = due.filter((c) => c.lapses >= 2).length;

  return (
    <div className={shell.stack} data-stage="ai-literacy">
      <h1>Review Queue</h1>

      <p className="reading">
        Spaced repetition across every module, interleaved rather than grouped by topic.
        Intervals are capped at {MAX_INTERVAL_DAYS} days, so nothing you learn early goes
        unreviewed before the exam — a deliberate break from textbook SM-2, which would happily
        schedule a card past exam day.
      </p>

      {due.length === 0 ? (
        <EmptyState icon="review" title="Nothing due right now" meta="Spaced repetition">
          {upcoming > 0
            ? `${upcoming} card${upcoming === 1 ? '' : 's'} scheduled for later. Answer more questions — anything you get wrong, or mark as a guess, lands here.`
            : 'Run a drill first. Every wrong answer, and every correct one you flagged as a guess, is queued here automatically.'}
        </EmptyState>
      ) : (
        <>
          <div className={styles.stats}>
            <span className={styles.stat}>
              <span className={clsx('tabular', styles.statValue)}>{due.length}</span>
              <span className={clsx('microlabel', styles.statLabel)}>Due now</span>
            </span>
            <span className={styles.stat}>
              <span className={clsx('tabular', styles.statValue)}>{struggling}</span>
              <span className={clsx('microlabel', styles.statLabel)}>Lapsed twice or more</span>
            </span>
            <span className={styles.stat}>
              <span className={clsx('tabular', styles.statValue)}>{upcoming}</span>
              <span className={clsx('microlabel', styles.statLabel)}>Scheduled later</span>
            </span>
          </div>

          <div className={styles.chips}>
            {[...byStage.entries()].sort((a, b) => b[1] - a[1]).map(([stage, n]) => (
              <span key={stage} data-stage={stage}>
                <Badge tone="stage">{stage} · {n}</Badge>
              </span>
            ))}
          </div>

          <ReviewLauncher dueCount={due.length} />
        </>
      )}

      <p className={styles.note}>
        Prefer a targeted session? <Link href="/drill">The drill builder</Link> has a
        &ldquo;Due for review&rdquo; option with topic filters.
      </p>
    </div>
  );
}
