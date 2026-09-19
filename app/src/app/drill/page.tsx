import { sql } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { items } from '@/lib/db/schema';
import { priorityOf } from '@/lib/content/topics';
import type { StageId } from '@/lib/config/stages';
import { DrillBuilder, type TopicOption } from './DrillBuilder';

export const dynamic = 'force-dynamic';

export default async function DrillPage({
  searchParams,
}: {
  searchParams: Promise<{ stage?: string }>;
}) {
  const { stage } = await searchParams;

  const rows = db
    .select({
      stage: items.stage,
      topic: items.topic,
      count: sql<number>`count(*)`,
    })
    .from(items)
    .where(sql`${items.kind} in ('mcq', 'trace')`)
    .groupBy(items.stage, items.topic)
    .all();

  const topics: TopicOption[] = rows
    .map((r) => ({
      stage: r.stage as StageId,
      topic: r.topic,
      priority: priorityOf(r.stage, r.topic) ?? 'P1',
      count: r.count,
    }))
    // P0 first, then by how much practice material exists.
    .sort((a, b) => a.priority.localeCompare(b.priority) || b.count - a.count);

  return <DrillBuilder topics={topics} initialStage={stage as StageId | undefined} />;
}
