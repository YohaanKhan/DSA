import { sql } from 'drizzle-orm';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { db } from '@/lib/db/client';
import { items } from '@/lib/db/schema';
import { hasApiKey } from '@/lib/llm/client';
import shell from '@/components/shell/Shell.module.css';
import { AicLauncher } from './AicLauncher';

export const dynamic = 'force-dynamic';

export default async function AicPage() {
  const rows = db
    .select({ id: items.id, payload: items.payload })
    .from(items)
    .where(sql`${items.kind} = 'aic'`)
    .all();

  const problems = rows.map((r) => {
    const p = r.payload as { title: string; language: string; difficulty: string };
    return { id: r.id, title: p.title, language: p.language };
  });

  return (
    <div className={shell.stack} data-stage="aic">
      <h1>AI-Assisted Coding</h1>

      <p className="reading">
        You solve the problem by directing an assistant, not by writing it all yourself. Five
        steps: frame the problem, plan the approach, write the prompt, review what comes back,
        then refine. The round scores the collaboration — and this is the stage that decides
        your package tier.
      </p>

      <div style={{ display: 'flex', gap: 'var(--s-2)', flexWrap: 'wrap' }}>
        <Badge tone="stage">{problems.length} problems</Badge>
        <Badge tone={hasApiKey() ? 'ok' : 'warn'} icon={hasApiKey() ? 'check' : 'cross'}>
          {hasApiKey() ? 'live assistant' : 'offline — scripted assistant'}
        </Badge>
      </div>

      {!hasApiKey() ? (
        <p className="reading" style={{ fontSize: 'var(--t-sm)', color: 'var(--ink-muted)' }}>
          Without <code>ANTHROPIC_API_KEY</code> the module still scores all five steps and the
          anti-paste rule still runs. In place of a live reply you get a scripted one that is
          deliberately flawed, so the review step has something real to catch.
        </p>
      ) : null}

      {problems.length === 0 ? (
        <EmptyState icon="aic" title="No problems seeded" meta="Content">
          Add problems to <code>content/aic/problems.json</code>, then run{' '}
          <code>npm run content:verify-aic</code> to check the reference solution passes and the
          fallback output genuinely fails, and <code>npm run db:seed</code>.
        </EmptyState>
      ) : (
        <AicLauncher problems={problems} />
      )}
    </div>
  );
}
