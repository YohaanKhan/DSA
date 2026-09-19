import { NextResponse } from 'next/server';
import { nanoid } from 'nanoid';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/lib/db/client';
import { attempts, items, sessions, submissions } from '@/lib/db/schema';
import { DebugItem } from '@/lib/content/schemas';
import { runTests } from '@/lib/mutation/inject';
import { changedLineCount, scoreDebug } from '@/lib/scoring/debug';
import { snapshotReadiness } from '@/lib/scoring/snapshot';

const Body = z.object({
  source: z.string().min(1).max(100_000),
  // performance.now() deltas are fractional, so do not demand an integer here.
  elapsedMs: z.number().min(0).transform((n) => Math.round(n)),
  hintsUsed: z.number().int().min(0).max(4),
  hypothesis: z.string().nullable(),
  edgeCasesChecked: z.array(z.string()).default([]),
});

/** Submit = every test including hidden ones, scored and recorded. */
export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const parsed = Body.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request', issues: parsed.error.issues }, { status: 400 });
  }
  const body = parsed.data;

  const row = db.select().from(items).where(eq(items.id, id)).get();
  if (!row) return NextResponse.json({ error: 'No such exercise' }, { status: 404 });

  const item = DebugItem.parse(row.payload);
  const { outcomes, allPassed, compileError } = await runTests(item.language, body.source, item.tests);

  const bug = item.bugs[0];
  const changedLines = changedLineCount(item.brokenSource, body.source);
  const hypothesisCorrect = body.hypothesis === bug.family;

  const score = scoreDebug({
    passed: allPassed,
    elapsedMs: body.elapsedMs,
    limitMs: item.targetSeconds * 1000,
    hintsUsed: body.hintsUsed,
    changedLines,
    idealLines: item.bugs.length,
    hypothesisCorrect,
  });

  // A one-off session per exercise keeps the attempt attributable without
  // making the lab a multi-question flow it is not.
  const sessionId = nanoid();
  const now = new Date();
  db.insert(sessions).values({
    id: sessionId, mode: 'drill', stage: 'debugging', profile: null,
    config: { exerciseId: item.id }, startedAt: new Date(now.getTime() - body.elapsedMs),
    finishedAt: now, score: score.score, maxScore: 1, meta: { hypothesisCorrect },
  }).run();

  db.insert(attempts).values({
    id: nanoid(), sessionId, itemId: item.id, stage: 'debugging', topic: item.topic,
    response: { hypothesis: body.hypothesis, changedLines, edgeCasesChecked: body.edgeCasesChecked },
    correct: allPassed, partialScore: score.score,
    confidence: hypothesisCorrect ? 'high' : 'low',
    timeMs: body.elapsedMs, hintsUsed: body.hintsUsed, flagged: false, createdAt: now,
  }).run();

  // Kept for interview prep: the technical interview may ask you to explain a
  // fix you made in an earlier round.
  db.insert(submissions).values({
    id: nanoid(), sessionId, itemId: item.id, kind: 'debug',
    artifacts: {
      language: item.language,
      hypothesis: body.hypothesis,
      actualFamily: bug.family,
      submitted: body.source,
      changedLines,
      edgeCasesChecked: body.edgeCasesChecked,
    },
    score: score.score, createdAt: now,
  }).run();

  snapshotReadiness();

  const refLine = item.referenceSource.split('\n')[bug.line - 1] ?? '';
  const badLine = item.brokenSource.split('\n')[bug.line - 1] ?? '';

  return NextResponse.json({
    passed: allPassed,
    compileError,
    outcomes: outcomes.map((o, i) => ({
      ...o, hidden: item.tests[i]?.hidden, edgeCase: item.tests[i]?.edgeCase,
    })),
    ...score,
    changedLines,
    idealLines: item.bugs.length,
    bugLine: bug.line,
    bugFamily: bug.family,
    bugDescription: bug.description,
    minimalDiff: `- ${badLine.trim()}\n+ ${refLine.trim()}`,
    hypothesisCorrect,
  });
}
