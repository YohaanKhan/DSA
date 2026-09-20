import { NextResponse } from 'next/server';
import { nanoid } from 'nanoid';
import { z } from 'zod';
import { db } from '@/lib/db/client';
import { attempts, sessions, submissions } from '@/lib/db/schema';
import { loadItems } from '@/lib/content/select';
import { SpeakPrompt } from '@/lib/content/schemas';
import { analyseSpeech } from '@/lib/scoring/speech';

const Body = z.object({
  itemId: z.string().min(1),
  segments: z.array(z.object({
    text: z.string(),
    startMs: z.number().min(0),
    endMs: z.number().min(0),
  })).max(500),
  usedSeconds: z.number().min(0),
  /** False when the browser has no speech recognition; only timing metrics apply. */
  transcriptAvailable: z.boolean(),
});

/**
 * Speaking metrics are recomputed here from the transcript rather than trusted
 * from the client. Nothing is sent to a model and no audio leaves the browser —
 * every number comes from `analyseSpeech`, which is the same pure function the
 * studio uses to show you the result instantly.
 */
export async function POST(request: Request) {
  const parsed = Body.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid submission', issues: parsed.error.issues }, { status: 400 });
  }
  const { itemId, segments, usedSeconds, transcriptAvailable } = parsed.data;

  const [item] = loadItems([itemId]);
  if (!item) return NextResponse.json({ error: 'No such prompt' }, { status: 404 });
  const speak = SpeakPrompt.parse({ ...(item.payload as object), id: item.id });

  const metrics = analyseSpeech({
    segments,
    allottedSeconds: speak.speakSeconds,
    usedSeconds,
    expectedPoints: speak.expectedPoints,
  });

  // Without a transcript only the timing metrics mean anything, so the score is
  // withheld rather than computed from half the evidence.
  const inBand = metrics.verdicts.filter((v) => v.ok).length;
  const score = transcriptAvailable ? inBand / metrics.verdicts.length : null;
  const now = new Date();

  const sessionId = nanoid();
  db.insert(sessions).values({
    id: sessionId,
    mode: 'comm',
    stage: 'english',
    profile: null,
    config: { kind: 'speak', itemId },
    startedAt: new Date(now.getTime() - usedSeconds * 1000),
    finishedAt: now,
    score,
    maxScore: 1,
    meta: { transcriptAvailable },
  }).run();

  db.insert(submissions).values({
    id: nanoid(),
    sessionId,
    itemId,
    kind: 'speak',
    artifacts: {
      language: 'en',
      prompt: speak.prompt,
      transcriptAvailable,
      transcript: segments.map((s) => s.text).join(' '),
      segments,
      usedSeconds,
      metrics,
    },
    score,
    createdAt: now,
  }).run();

  if (transcriptAvailable) {
    db.insert(attempts).values({
      id: nanoid(),
      sessionId,
      itemId,
      stage: 'english',
      topic: 'speaking',
      response: { words: metrics.words, wpm: Math.round(metrics.wpm) },
      correct: score !== null && score >= 0.6,
      partialScore: score,
      confidence: null,
      timeMs: Math.round(usedSeconds * 1000),
      hintsUsed: 0,
      flagged: false,
      createdAt: now,
    }).run();
  }

  return NextResponse.json({ metrics, score, expectedPoints: speak.expectedPoints });
}
