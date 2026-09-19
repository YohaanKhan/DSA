import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/lib/db/client';
import { items } from '@/lib/db/schema';
import { DebugItem } from '@/lib/content/schemas';
import { runTests } from '@/lib/mutation/inject';

const Body = z.object({ source: z.string().min(1).max(100_000) });

/** Run = visible tests only, unlimited, unscored. */
export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const parsed = Body.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: 'Invalid request' }, { status: 400 });

  const row = db.select().from(items).where(eq(items.id, id)).get();
  if (!row) return NextResponse.json({ error: 'No such exercise' }, { status: 404 });

  const item = DebugItem.parse(row.payload);
  const visible = item.tests.filter((t) => !t.hidden);
  const { outcomes, compileError } = await runTests(item.language, parsed.data.source, visible);

  return NextResponse.json({
    outcomes: outcomes.map((o, i) => ({ ...o, hidden: false, edgeCase: visible[i]?.edgeCase })),
    compileError,
  });
}
