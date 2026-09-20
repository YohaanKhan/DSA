import 'server-only';

import { loadItems, selectItems } from '@/lib/content/select';

/**
 * Picks the prompt to serve. Unseen first, so you are not handed the same essay
 * question three days running; a specific id wins over everything, which is what
 * makes "retry this one" work.
 */
export function pickPrompt(kind: 'essay' | 'speak', requestedId?: string) {
  if (requestedId) {
    const [row] = loadItems([requestedId]);
    if (row && row.kind === kind) return row;
  }
  const unseen = selectItems({ kinds: [kind], stage: 'english', count: 1, strategy: 'unseen' });
  const ids = unseen.length > 0
    ? unseen
    : selectItems({ kinds: [kind], stage: 'english', count: 1, strategy: 'random' });
  return loadItems(ids)[0] ?? null;
}
