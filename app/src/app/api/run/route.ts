import { NextResponse } from 'next/server';
import { z } from 'zod';
import { runCode } from '@/lib/runner';

const Body = z.object({
  language: z.enum(['c', 'cpp', 'java']),
  source: z.string().min(1).max(100_000),
  stdin: z.string().max(100_000).optional(),
  timeoutMs: z.number().int().min(100).max(15_000).optional(),
});

export async function POST(request: Request) {
  const parsed = Body.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request', issues: parsed.error.issues }, { status: 400 });
  }
  return NextResponse.json(await runCode(parsed.data));
}
