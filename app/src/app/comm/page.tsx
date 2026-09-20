import Link from 'next/link';
import { clsx } from 'clsx';
import { and, desc, eq, sql } from 'drizzle-orm';
import { Badge } from '@/components/ui/Badge';
import { Icon } from '@/components/ui/Icon';
import { db } from '@/lib/db/client';
import { items, submissions } from '@/lib/db/schema';
import shell from '@/components/shell/Shell.module.css';
import styles from '@/components/comm/Comm.module.css';

export const dynamic = 'force-dynamic';

function bankSize(kind: string): number {
  return db
    .select({ n: sql<number>`count(*)` })
    .from(items)
    .where(and(eq(items.kind, kind), eq(items.stage, 'english')))
    .get()?.n ?? 0;
}

function recent(kind: string) {
  return db
    .select({ id: submissions.id, score: submissions.score, createdAt: submissions.createdAt })
    .from(submissions)
    .where(eq(submissions.kind, kind))
    .orderBy(desc(submissions.createdAt))
    .limit(5)
    .all();
}

export default function CommPage() {
  const essays = recent('essay');
  const speeches = recent('speak');
  const mcqBank = bankSize('mcq');

  return (
    <div className={clsx(shell.stack, styles.page)} data-stage="english">
      <h1>Communication</h1>

      <p className="reading">
        This stage is an elimination gate, and it is the one people under-prepare because it feels
        less technical than the rest. The two things that move it in a week are both habits rather
        than knowledge: writing to a length under a clock, and speaking for ninety seconds without
        filling the gaps with noise. Both are below, and both are measured on this machine with no
        API key and nothing uploaded.
      </p>

      <div className={styles.doors}>
        <Link href="/comm/essay" className={clsx('press', styles.door)}>
          <span className={styles.doorTitle}>Timed essay</span>
          <p className={styles.doorBody}>
            Twenty-five minutes, 250–350 words, five bands. Autosaves continuously, nudges you to
            stop planning at three minutes and to start proofreading with four left.
          </p>
          <span className={styles.doorMeta}>
            <Badge tone="stage">{bankSize('essay')} prompts</Badge>{' '}
            {essays.length > 0 ? <Badge tone="neutral">{essays.length} written</Badge> : null}
          </span>
        </Link>

        <Link href="/comm/speak" className={clsx('press', styles.door)}>
          <span className={styles.doorTitle}>Speaking</span>
          <p className={styles.doorBody}>
            Forty-five seconds to think, ninety to speak. Pace, filler rate, pause profile, point
            coverage and sentence completion — all computed locally from the transcript.
          </p>
          <span className={styles.doorMeta}>
            <Badge tone="stage">{bankSize('speak')} prompts</Badge>{' '}
            {speeches.length > 0 ? <Badge tone="neutral">{speeches.length} recorded</Badge> : null}
          </span>
        </Link>

        <Link href={{ pathname: '/drill', query: { stage: 'english' } }} className={clsx('press', styles.door)}>
          <span className={styles.doorTitle}>Grammar &amp; vocabulary</span>
          <p className={styles.doorBody}>
            Subject–verb agreement, prepositions, tenses, modifiers, parallelism, confused pairs —
            the highest-yield subtopics, through the standard drill engine with spaced repetition.
          </p>
          <span className={styles.doorMeta}>
            <Badge tone="stage">{mcqBank} questions</Badge>
          </span>
        </Link>
      </div>

      {essays.length > 0 || speeches.length > 0 ? (
        <div className={styles.card}>
          <span className={clsx('microlabel', styles.sectionLabel)}>Recent</span>
          <div className={styles.metricGrid}>
            {[...essays.map((r) => ({ ...r, kind: 'Essay' })), ...speeches.map((r) => ({ ...r, kind: 'Speaking' }))]
              .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
              .slice(0, 6)
              .map((row) => (
                <span key={row.id} className={styles.metric}>
                  <span className={clsx('tabular', styles.metricValue)}>
                    {row.score === null ? '—' : `${(row.score * 5).toFixed(1)}`}
                  </span>
                  <span className={clsx('microlabel', styles.metricLabel)}>
                    {row.kind} · {row.createdAt.toISOString().slice(5, 10)}
                  </span>
                </span>
              ))}
          </div>
          <p className={styles.cardNote}>
            Every essay and recording is kept in the <Link href="/log">submission log</Link> with the
            text, the transcript and the measurements, so you can see what changed across the week.
          </p>
        </div>
      ) : null}

      <div className={styles.card}>
        <span className={clsx('microlabel', styles.sectionLabel)}>The daily dose</span>
        <p className={styles.cardNote}>
          One essay and three speaking prompts. Thirty-five minutes total, non-negotiable. Frequency
          beats duration for both: seven essays and twenty-one spoken answers across the week will
          move you further than one marathon session, and filler rate in particular drops visibly
          within three days once you can see it counted.
        </p>
        <p className={styles.cardNote}>
          <Icon name="flag" size={16} style={{ verticalAlign: '-3px' }} /> Listening and reading
          modules are deliberately not built. They are the least-reported components, and text-to-speech
          is a poor stand-in for real exam audio — the time is better spent on the three doors above.
        </p>
      </div>
    </div>
  );
}
