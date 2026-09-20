import { eq } from 'drizzle-orm';
import { EmptyState } from '@/components/ui/EmptyState';
import { db } from '@/lib/db/client';
import { sessions } from '@/lib/db/schema';
import { EssayPrompt } from '@/lib/content/schemas';
import { loadItems } from '@/lib/content/select';
import { pickPrompt } from '@/lib/comm/pick';
import { EssayComposer, type EssayDraft, type EssayItem } from '@/components/comm/EssayComposer';
import shell from '@/components/shell/Shell.module.css';

export const dynamic = 'force-dynamic';

/**
 * Resuming is the whole reason this page takes a `session` parameter. The
 * composer rewrites the URL as soon as a session exists, so a refresh — or a
 * closed laptop — lands back here with the draft intact.
 */
export default async function EssayPage({
  searchParams,
}: {
  searchParams: Promise<{ session?: string; item?: string }>;
}) {
  const { session, item: requestedId } = await searchParams;

  let resumeDraft: EssayDraft | null = null;
  let resumeSessionId: string | null = null;
  let itemId = requestedId;

  if (session) {
    const row = db.select().from(sessions).where(eq(sessions.id, session)).get();
    // A finished essay is not resumable; falling through hands you a new prompt
    // rather than a dead page.
    if (row && !row.finishedAt) {
      resumeSessionId = session;
      resumeDraft = (row.meta as EssayDraft | null) ?? null;
      itemId = (row.config as { itemId: string }).itemId;
    }
  }

  const row = resumeSessionId && itemId ? loadItems([itemId])[0] : pickPrompt('essay', itemId);

  if (!row) {
    return (
      <div className={shell.stack} data-stage="english">
        <h1>Timed Essay</h1>
        <EmptyState icon="comm" title="No essay prompts seeded" meta="content/comm/essay.json">
          Run <code>npm run db:seed</code> to load the prompt bank, then reload this page.
        </EmptyState>
      </div>
    );
  }

  const parsed = EssayPrompt.parse({ ...(row.payload as object), id: row.id });
  const essayItem: EssayItem = {
    id: row.id,
    prompt: parsed.prompt,
    minutes: parsed.minutes,
    targetWords: parsed.targetWords as [number, number],
    rubric: parsed.rubric,
    subtopic: row.subtopic ?? undefined,
    difficulty: row.difficulty,
  };

  return (
    <EssayComposer item={essayItem} resumeSessionId={resumeSessionId} resumeDraft={resumeDraft} />
  );
}
