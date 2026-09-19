import { EmptyState } from '@/components/ui/EmptyState';
import { SpeakPrompt } from '@/lib/content/schemas';
import { pickPrompt } from '@/lib/comm/pick';
import { SpeakStudio, type SpeakItem } from '@/components/comm/SpeakStudio';
import shell from '@/components/shell/Shell.module.css';

export const dynamic = 'force-dynamic';

export default async function SpeakPage({
  searchParams,
}: {
  searchParams: Promise<{ item?: string }>;
}) {
  const { item: requestedId } = await searchParams;
  const row = pickPrompt('speak', requestedId);

  if (!row) {
    return (
      <div className={shell.stack} data-stage="english">
        <h1>Speaking</h1>
        <EmptyState icon="comm" title="No speaking prompts seeded" meta="content/comm/speak.json">
          Run <code>npm run db:seed</code> to load the prompt bank, then reload this page.
        </EmptyState>
      </div>
    );
  }

  const parsed = SpeakPrompt.parse({ ...(row.payload as object), id: row.id });
  const speakItem: SpeakItem = {
    id: row.id,
    prompt: parsed.prompt,
    thinkSeconds: parsed.thinkSeconds,
    speakSeconds: parsed.speakSeconds,
    expectedPoints: parsed.expectedPoints,
    difficulty: row.difficulty,
  };

  return <SpeakStudio item={speakItem} />;
}
