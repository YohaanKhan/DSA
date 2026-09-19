import { eq } from 'drizzle-orm';
import { notFound } from 'next/navigation';
import { db } from '@/lib/db/client';
import { sessions } from '@/lib/db/schema';
import { loadItems } from '@/lib/content/select';
import type { RunnerItem } from '@/components/drill/DrillRunner';
import { RunnerShell } from './RunnerShell';

export const dynamic = 'force-dynamic';

export default async function RunnerPage({ params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = await params;

  const session = db.select().from(sessions).where(eq(sessions.id, sessionId)).get();
  if (!session) notFound();

  const config = session.config as { itemIds?: string[]; mode?: string };
  const rows = loadItems(config.itemIds ?? []);

  // Strip the answer key before it reaches the client. Not a security control —
  // you will open the network tab at 2am otherwise.
  const runnerItems: RunnerItem[] = rows.map((row) => {
    const p = row.payload as Record<string, unknown>;
    return {
      id: row.id,
      kind: row.kind as 'mcq' | 'trace',
      stage: row.stage,
      topic: row.topic,
      subtopic: row.subtopic ?? undefined,
      difficulty: row.difficulty,
      targetSeconds: row.targetSeconds,
      stem: p.stem as string | undefined,
      code: p.code as { language: string; source: string } | undefined,
      options: p.options as { id: string; text: string }[] | undefined,
      language: p.language as string | undefined,
      sourceCode: p.sourceCode as string | undefined,
      question: p.question as string | undefined,
      answerMode: p.answerMode as 'exact' | 'mcq' | undefined,
    };
  });

  return <RunnerShell sessionId={sessionId} items={runnerItems} />;
}
