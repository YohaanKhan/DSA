import Link from 'next/link';
import { clsx } from 'clsx';
import { eq, inArray } from 'drizzle-orm';
import { notFound } from 'next/navigation';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { db } from '@/lib/db/client';
import { attempts, items, reviewCards, sessions } from '@/lib/db/schema';
import { summarise } from '@/lib/scoring/mcq';
import { formatClock } from '@/lib/format';
import styles from './page.module.css';

export const dynamic = 'force-dynamic';

export default async function ReviewPage({ params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = await params;

  const session = db.select().from(sessions).where(eq(sessions.id, sessionId)).get();
  if (!session) notFound();

  const rows = db.select().from(attempts).where(eq(attempts.sessionId, sessionId)).all();
  const itemRows = rows.length
    ? db.select().from(items).where(inArray(items.id, rows.map((r) => r.itemId))).all()
    : [];
  const byId = new Map(itemRows.map((r) => [r.id, r]));

  const stats = summarise(
    rows.map((r) => ({
      correct: r.correct,
      confidence: r.confidence,
      timeMs: r.timeMs,
      targetSeconds: byId.get(r.itemId)?.targetSeconds ?? 60,
    })),
  );

  const dueCount = db.select().from(reviewCards).all().filter((c) => c.dueAt <= new Date()).length;
  const wrong = rows.filter((r) => !r.correct);
  const lucky = rows.filter((r) => r.correct && r.confidence === 'low');

  return (
    <div className={styles.page} data-stage={session.stage ?? undefined}>
      <div>
        <span className={clsx('microlabel', styles.sectionLabel)}>Drill complete</span>
        <div className={styles.headline}>
          <span className={clsx('tabular', styles.score)}>{stats.correct}</span>
          <span className={clsx('tabular', styles.outOf)}>/ {stats.attempted}</span>
          <Badge tone={stats.accuracy >= 0.75 ? 'ok' : stats.accuracy >= 0.5 ? 'warn' : 'bad'}>
            {Math.round(stats.accuracy * 100)}% correct
          </Badge>
        </div>
      </div>

      <div className={styles.stats}>
        <div className={styles.stat}>
          <span className={clsx('tabular', styles.statValue)}>{Math.round(stats.trueKnown * 100)}%</span>
          <span className={clsx('microlabel', styles.statLabel)}>Actually known</span>
          <span className={styles.statNote}>
            Accuracy with lucky guesses discounted. This is the number that predicts the exam.
          </span>
        </div>
        <div className={styles.stat}>
          <span className={clsx('tabular', styles.statValue)}>{stats.luckyGuesses}</span>
          <span className={clsx('microlabel', styles.statLabel)}>Lucky guesses</span>
          <span className={styles.statNote}>
            Right, but you marked them a guess. All queued for review.
          </span>
        </div>
        <div className={styles.stat}>
          <span className={clsx('tabular', styles.statValue)}>{formatClock(stats.meanTimeMs)}</span>
          <span className={clsx('microlabel', styles.statLabel)}>Mean per question</span>
          <span className={styles.statNote}>
            {stats.paceFactor <= 1
              ? `Inside budget at ${Math.round(stats.paceFactor * 100)}% of the time allowed.`
              : `Over budget — ${Math.round(stats.paceFactor * 100)}% of the time allowed.`}
          </span>
        </div>
        <div className={styles.stat}>
          <span className={clsx('tabular', styles.statValue)}>{dueCount}</span>
          <span className={clsx('microlabel', styles.statLabel)}>Due for review</span>
          <span className={styles.statNote}>Across every module, capped at a three-day interval.</span>
        </div>
      </div>

      <div className={styles.actions}>
        <Button variant="solid" size="lg">
          <Link href="/drill" style={{ textDecoration: 'none', color: 'inherit' }}>Another drill</Link>
        </Button>
        <Button variant="outline">
          <Link href="/" style={{ textDecoration: 'none', color: 'inherit' }}>Dashboard</Link>
        </Button>
      </div>

      {lucky.length > 0 ? (
        <div>
          <span className={clsx('microlabel', styles.sectionLabel)}>
            Right, but guessed ({lucky.length})
          </span>
          <p className={styles.explain} style={{ marginTop: 'var(--s-2)' }}>
            These count as correct on the scoreboard and as gaps in your review queue. That is
            deliberate: a bank of lucky guesses would otherwise read as mastery.
          </p>
        </div>
      ) : null}

      <div>
        <span className={clsx('microlabel', styles.sectionLabel)}>
          {wrong.length === 0 ? 'Nothing wrong — every answer correct' : `Got wrong (${wrong.length})`}
        </span>
        <div className={styles.list} style={{ marginTop: 'var(--s-3)' }}>
          {rows.map((attempt) => {
            const row = byId.get(attempt.itemId);
            if (!row) return null;
            const payload = row.payload as Record<string, unknown>;
            const response = (attempt.response as { value?: unknown } | null)?.value;
            const options = (payload.options as { id: string; text: string }[] | undefined) ?? [];
            const label = (id: unknown) =>
              options.find((o) => o.id === id)?.text ?? (typeof id === 'string' ? id : '(blank)');

            return (
              <div
                key={attempt.id}
                className={clsx(styles.row, attempt.correct ? styles.rowOk : styles.rowBad)}
                data-stage={row.stage}
              >
                <div className={styles.rowHead}>
                  <Badge tone={attempt.correct ? 'ok' : 'bad'} icon={attempt.correct ? 'check' : 'cross'}>
                    {attempt.correct ? 'Correct' : 'Wrong'}
                  </Badge>
                  <Badge tone="stage">{row.subtopic ?? row.topic}</Badge>
                  {attempt.confidence === 'low' ? <Badge tone="warn">Guessed</Badge> : null}
                  {attempt.flagged ? <Badge tone="neutral" icon="flag">Flagged</Badge> : null}
                  <span className={styles.rowSpacer} />
                  <span className={clsx('tabular', 'microlabel', styles.statLabel)}>
                    {formatClock(attempt.timeMs)} / {formatClock(row.targetSeconds * 1000)}
                  </span>
                </div>

                <p className={styles.stem}>
                  {(payload.stem as string | undefined) ?? (payload.question as string | undefined)}
                </p>

                {!attempt.correct ? (
                  <div className={styles.answers}>
                    <span className={styles.answerBad}>
                      <Icon name="cross" size={14} /> You: {label(response)}
                    </span>
                    <span className={styles.answerOk}>
                      <Icon name="check" size={14} /> Correct: {label(payload.answer)}
                    </span>
                  </div>
                ) : null}

                <p className={styles.explain}>{payload.explanation as string}</p>
              </div>
            );
          })}
          {rows.length === 0 ? (
            <p className={styles.empty}>No answers recorded for this session.</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
