
import { sql } from 'drizzle-orm';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { db } from '@/lib/db/client';
import { items } from '@/lib/db/schema';
import shell from '@/components/shell/Shell.module.css';
import { TraceLauncher } from './TraceLauncher';

export const dynamic = 'force-dynamic';

export default async function TracePage() {
  const rows = db
    .select({ subtopic: items.subtopic, count: sql<number>`count(*)` })
    .from(items)
    .where(sql`${items.kind} = 'trace'`)
    .groupBy(items.subtopic)
    .all();

  const total = rows.reduce((sum, r) => sum + r.count, 0);

  return (
    <div className={shell.stack} data-stage="technical">
      <h1>Trace Lab</h1>

      <p className="reading">
        Read the pseudocode, predict the exact output, then step through the execution one line at
        a time. Tracing is a procedure, not a fact — the variable table after a wrong answer is
        where the learning is, so it is shown every time.
      </p>

      {total === 0 ? (
        <EmptyState icon="trace" title="No trace items seeded" meta="Content">
          Add items to <code>content/trace/</code> and run <code>npm run db:seed</code>. The
          validator refuses any trace whose own execution contradicts its stated answer.
        </EmptyState>
      ) : (
        <>
          <div style={{ display: 'flex', gap: 'var(--s-2)', flexWrap: 'wrap' }}>
            <Badge tone="stage">{total} items</Badge>
            {rows.map((r) => (
              <Badge key={r.subtopic ?? 'other'} tone="neutral">
                {r.subtopic ?? 'other'} · {r.count}
              </Badge>
            ))}
          </div>
          <TraceLauncher max={total} />
        </>
      )}
    </div>
  );
}
