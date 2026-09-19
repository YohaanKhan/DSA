import { clsx } from 'clsx';
import { desc } from 'drizzle-orm';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { db } from '@/lib/db/client';
import { submissions } from '@/lib/db/schema';
import shell from '@/components/shell/Shell.module.css';
import styles from './page.module.css';
import { ExportButton } from './ExportButton';

export const dynamic = 'force-dynamic';

interface DebugArtifacts {
  language: string; hypothesis: string | null; actualFamily: string;
  submitted: string; changedLines: number; edgeCasesChecked: string[];
}
interface AicArtifacts {
  language: string;
  steps: { step: string; outOfFive: number; text: string }[];
  finalCode: string; codePasses: boolean;
}

export default async function LogPage() {
  const rows = db.select().from(submissions).orderBy(desc(submissions.createdAt)).limit(100).all();

  return (
    <div className={shell.stack} data-stage="aic">
      <h1>Submission Log</h1>

      <p className="reading">
        Every debugging fix and AI-assisted run, with the reasoning you gave at the time.
        The technical interview may ask you to explain code you wrote in an earlier round, so
        this is the record to skim the night before — and the only place you can see how your
        thinking changed across the week.
      </p>

      {rows.length === 0 ? (
        <EmptyState icon="log" title="Nothing logged yet" meta="Interview prep">
          Debugging fixes and AI-assisted runs are recorded here automatically, with your
          hypothesis, your prompts and your review notes.
        </EmptyState>
      ) : (
        <>
          <div style={{ display: 'flex', gap: 'var(--s-3)', flexWrap: 'wrap', alignItems: 'center' }}>
            <Badge tone="stage">{rows.length} entries</Badge>
            <ExportButton />
          </div>

          <div className={styles.list}>
            {rows.map((row) => {
              const isDebug = row.kind === 'debug';
              const a = row.artifacts as unknown as DebugArtifacts & AicArtifacts;
              return (
                <div
                  key={row.id}
                  className={styles.entry}
                  data-stage={isDebug ? 'debugging' : 'aic'}
                >
                  <div className={styles.head}>
                    <Badge tone="stage">{isDebug ? 'Debugging' : 'AI-assisted'}</Badge>
                    <Badge tone="neutral">{a.language?.toUpperCase()}</Badge>
                    <Badge tone={(row.score ?? 0) >= 0.7 ? 'ok' : (row.score ?? 0) >= 0.4 ? 'warn' : 'bad'}>
                      {Math.round((row.score ?? 0) * 100)}%
                    </Badge>
                    <span className={styles.spacer} />
                    <span className={clsx('microlabel', styles.when)}>
                      {row.createdAt.toISOString().slice(0, 16).replace('T', ' ')}
                    </span>
                  </div>

                  <span className={clsx('microlabel', styles.itemId)}>{row.itemId}</span>

                  {isDebug ? (
                    <div className={styles.body}>
                      <p className={styles.field}>
                        <strong>Your hypothesis:</strong> {a.hypothesis?.replace(/-/g, ' ') ?? 'none given'}
                        {' · '}
                        <strong>Actual:</strong> {a.actualFamily?.replace(/-/g, ' ')}
                        {a.hypothesis === a.actualFamily ? ' — diagnosed correctly before editing' : ''}
                      </p>
                      <p className={styles.field}>
                        <strong>Lines changed:</strong> {a.changedLines}
                        {a.edgeCasesChecked?.length ? ` · checked: ${a.edgeCasesChecked.join(', ')}` : ''}
                      </p>
                      <details>
                        <summary className={clsx('microlabel', styles.summary)}>Your fix</summary>
                        <pre className={styles.code}>{a.submitted}</pre>
                      </details>
                    </div>
                  ) : (
                    <div className={styles.body}>
                      {(a.steps ?? []).map((s) => (
                        <details key={s.step}>
                          <summary className={clsx('microlabel', styles.summary)}>
                            {s.step} — {s.outOfFive}/5
                          </summary>
                          <p className={styles.quoted}>{s.text}</p>
                        </details>
                      ))}
                      <details>
                        <summary className={clsx('microlabel', styles.summary)}>
                          Final code {a.codePasses ? '(passes)' : '(fails)'}
                        </summary>
                        <pre className={styles.code}>{a.finalCode}</pre>
                      </details>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
