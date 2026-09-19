import { describe, expect, it } from 'vitest';
import { LONG_PAUSE_MS, analyseSpeech, fillerSpans, type SpeechSegment } from './speech';

const POINTS = [
  'Name a concrete example of automation',
  'Explain the cost of retraining staff',
  'State a clear recommendation',
];

/** Builds segments at a chosen pace with a chosen gap between them. */
function say(texts: string[], { wordsPerSecond = 2.3, gapMs = 300 } = {}): SpeechSegment[] {
  let cursor = 0;
  return texts.map((text) => {
    const words = text.split(/\s+/).filter(Boolean).length;
    const duration = (words / wordsPerSecond) * 1000;
    const segment = { text, startMs: cursor, endMs: cursor + duration };
    cursor += duration + gapMs;
    return segment;
  });
}

describe('analyseSpeech', () => {
  it('measures pace against time actually spoken, not the window', () => {
    // Forty words at roughly two and a half a second is about 150 wpm, even
    // though only half the ninety-second window was used.
    const m = analyseSpeech({
      segments: say(['one two three four five six seven eight nine ten'.repeat(1)], { wordsPerSecond: 2.5, gapMs: 0 }),
      allottedSeconds: 90, usedSeconds: 45, expectedPoints: POINTS,
    });
    expect(m.wpm).toBeCloseTo(150, 0);
    expect(m.timeUsedRatio).toBeCloseTo(0.5);
    expect(m.verdicts.find((v) => v.id === 'time')!.ok).toBe(false);
  });

  it('counts unambiguous fillers and guards the ambiguous ones', () => {
    const m = analyseSpeech({
      segments: say(['um so I would basically um say that you know automation is uh here']),
      allottedSeconds: 90, usedSeconds: 80, expectedPoints: POINTS,
    });
    const words = Object.fromEntries(m.fillers.map((f) => [f.word, f.count]));
    expect(words.um).toBe(2);
    expect(words.uh).toBe(1);
    expect(words.basically).toBe(1);
    expect(words['you know']).toBe(1);
  });

  it('does not count "like" used as a real word', () => {
    const m = analyseSpeech({
      segments: say(['I would like to explain this and it does not look like a problem']),
      allottedSeconds: 90, usedSeconds: 80, expectedPoints: POINTS,
    });
    expect(m.fillers.find((f) => f.word === 'like')).toBeUndefined();
  });

  it('does count "like" used as filler', () => {
    const m = analyseSpeech({
      segments: say(['it was like fifty percent of the team and like most of the work']),
      allottedSeconds: 90, usedSeconds: 80, expectedPoints: POINTS,
    });
    expect(m.fillers.find((f) => f.word === 'like')!.count).toBe(2);
  });

  it('finds gaps over the long-pause threshold and the longest one', () => {
    const m = analyseSpeech({
      segments: say(['first point here', 'second point here', 'third point here'], { gapMs: 4000 }),
      allottedSeconds: 90, usedSeconds: 80, expectedPoints: POINTS,
    });
    expect(m.pauses).toHaveLength(2);
    expect(m.pauses.every((p) => p.ms >= LONG_PAUSE_MS)).toBe(true);
    expect(m.pauses.every((p) => p.veryLong)).toBe(true);
    expect(m.longestPauseMs).toBeGreaterThanOrEqual(4000);
    expect(m.verdicts.find((v) => v.id === 'pauses')!.ok).toBe(false);
  });

  it('scores coverage from the point keywords, not exact wording', () => {
    const m = analyseSpeech({
      segments: say([
        'A concrete example is automated invoice processing.',
        'Retraining existing staff costs money and time up front.',
        'My recommendation is to retrain broadly and hire narrowly.',
      ]),
      allottedSeconds: 90, usedSeconds: 78, expectedPoints: POINTS,
    });
    expect(m.coverageRatio).toBe(1);
    expect(m.coverage.every((c) => c.hit)).toBe(true);
  });

  it('marks points that were never touched', () => {
    const m = analyseSpeech({
      segments: say(['I think the weather today is quite pleasant and I enjoyed my lunch.']),
      allottedSeconds: 90, usedSeconds: 30, expectedPoints: POINTS,
    });
    expect(m.coverageRatio).toBe(0);
    expect(m.verdicts.find((v) => v.id === 'coverage')!.ok).toBe(false);
  });

  it('counts an utterance as complete only when it has a clause and some length', () => {
    const m = analyseSpeech({
      segments: say(['this is a complete sentence', 'and then', 'the answer is clearly yes']),
      allottedSeconds: 90, usedSeconds: 80, expectedPoints: POINTS,
    });
    expect(m.completeUtterances).toBe(2);
    expect(m.completionRatio).toBeCloseTo(2 / 3);
  });

  it('never scores accent, and says what it does score', () => {
    const m = analyseSpeech({
      segments: say(['a short answer that is complete']),
      allottedSeconds: 90, usedSeconds: 80, expectedPoints: POINTS,
    });
    expect(m.verdicts.map((v) => v.id)).toEqual(
      ['wpm', 'filler', 'pauses', 'coverage', 'completion', 'time'],
    );
  });

  it('survives an empty recording', () => {
    const m = analyseSpeech({ segments: [], allottedSeconds: 90, usedSeconds: 0, expectedPoints: POINTS });
    expect(m.words).toBe(0);
    expect(Number.isFinite(m.wpm)).toBe(true);
    expect(m.fillerRate).toBe(0);
    expect(m.completionRatio).toBe(0);
  });

  it('gives at most three fixes, and none when everything is in band', () => {
    const good = analyseSpeech({
      segments: say([
        'A concrete example is automated invoice processing in finance teams.',
        'Retraining existing staff costs money and time before it pays back.',
        'My recommendation is that companies retrain broadly and hire narrowly.',
      ], { wordsPerSecond: 2.33, gapMs: 400 }),
      allottedSeconds: 90, usedSeconds: 76, expectedPoints: POINTS,
    });
    expect(good.fixes).toEqual([]);

    const bad = analyseSpeech({
      segments: say(['um uh basically um'], { wordsPerSecond: 1, gapMs: 5000 }),
      allottedSeconds: 90, usedSeconds: 10, expectedPoints: POINTS,
    });
    expect(bad.fixes.length).toBeGreaterThan(0);
    expect(bad.fixes.length).toBeLessThanOrEqual(3);
  });
});

describe('fillerSpans', () => {
  it('locates fillers so they can be highlighted in place', () => {
    const text = 'um I think basically it works';
    const spans = fillerSpans(text);
    expect(spans.map((s) => text.slice(s.start, s.end))).toEqual(['um', 'basically']);
  });

  it('returns nothing for clean speech', () => {
    expect(fillerSpans('I think it works well enough')).toEqual([]);
  });

  it('trims the sentence-start guard off a "so"', () => {
    const text = 'That is done. So the next step is testing.';
    const spans = fillerSpans(text);
    expect(spans.map((s) => text.slice(s.start, s.end))).toEqual(['So']);
  });
});
