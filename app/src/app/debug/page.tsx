import { sql } from 'drizzle-orm';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { db } from '@/lib/db/client';
import { items } from '@/lib/db/schema';
import { runnerStatus } from '@/lib/runner';
import shell from '@/components/shell/Shell.module.css';
import { DebugLauncher } from './DebugLauncher';

export const dynamic = 'force-dynamic';

export default async function DebugPage() {
  const rows = db
    .select({ id: items.id, subtopic: items.subtopic, payload: items.payload })
    .from(items)
    .where(sql`${items.kind} = 'debug'`)
    .all();

  const status = await runnerStatus();

  const exercises = rows.map((r) => {
    const p = r.payload as { language: string; problem: string };
    return { id: r.id, language: p.language, family: r.subtopic ?? 'unknown', problem: p.problem };
  });

  return (
    <div className={shell.stack} data-stage="debugging">
      <h1>Debugging Lab</h1>

      <p className="reading">
        You get a problem statement and a program that already contains one defect. Read it,
        name the bug family before you edit, fix it minimally, then validate the edge cases.
        Reading someone else&apos;s broken logic is a different muscle from writing your own code,
        and it is the one this round tests.
      </p>

      <div style={{ display: 'flex', gap: 'var(--s-2)', flexWrap: 'wrap' }}>
        <Badge tone="stage">{exercises.length} exercises</Badge>
        <Badge tone={status.active === 'local' ? 'ok' : 'warn'} icon={status.active === 'local' ? 'check' : 'cross'}>
          {status.active === 'local'
            ? `local runner · ${status.localLanguages.join(', ')}`
            : 'remote runner (Piston)'}
        </Badge>
      </div>

      {exercises.length === 0 ? (
        <EmptyState icon="debug" title="No exercises yet" meta="Content">
          Put a correct program in <code>content/solutions/</code> with a matching{' '}
          <code>.tests.json</code>, then run <code>npm run content:inject</code>. Every exercise it
          produces is provably broken and provably fixable — it will not ship one that still
          passes all the tests.
        </EmptyState>
      ) : (
        <DebugLauncher exercises={exercises} />
      )}
    </div>
  );
}
