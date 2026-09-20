import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { items } from '@/lib/db/schema';
import { DebugItem } from '@/lib/content/schemas';
import { ALL_FAMILIES } from '@/lib/mutation/mutators';

/**
 * Serves an exercise WITHOUT the reference solution, the bug location or the
 * answer. The hint ladder is sent because it is revealed progressively and each
 * rung is scored; everything else that would give the fix away is withheld.
 */
export async function GET(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;

  const row = db.select().from(items).where(eq(items.id, id)).get();
  if (!row) return NextResponse.json({ error: 'No such exercise' }, { status: 404 });

  const item = DebugItem.parse(row.payload);

  return NextResponse.json({
    id: item.id,
    language: item.language,
    problem: item.problem,
    brokenSource: item.brokenSource,
    targetSeconds: item.targetSeconds,
    hints: item.hints,
    tests: item.tests.map((t) => ({ name: t.name, hidden: t.hidden, edgeCase: t.edgeCase })),
    // The full family list, so choosing one is a real diagnosis rather than a
    // guess between the two this exercise happens to contain.
    families: ALL_FAMILIES,
  });
}
