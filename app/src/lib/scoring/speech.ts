/**
 * Speech analysis from a Web Speech transcript plus its timings.
 *
 * Every number here is computed locally. No audio and no transcript leaves the
 * machine, and none of it needs an API key — which is the point, because the
 * fastest-improving thing in spoken English is filler rate, and you only fix
 * that by seeing it counted after every attempt.
 *
 * Explicitly NOT measured: accent. The reported rubric is pronunciation,
 * fluency and clarity. Fluency (pace, pauses) and clarity (complete sentences,
 * point coverage) are measured directly. Attempting accent classification would
 * train exactly the wrong thing and would be scoring something the assessment
 * says it is not testing.
 *
 * See plan/07-SCORING-AND-ANALYTICS.md §6.
 */

export const LONG_PAUSE_MS = 1500;
export const VERY_LONG_PAUSE_MS = 3000;

export interface SpeechSegment {
  text: string;
  /** Milliseconds from the start of the speaking window. */
  startMs: number;
  endMs: number;
}

export interface SpeechInput {
  segments: SpeechSegment[];
  /** The window you were given. */
  allottedSeconds: number;
  /** The window you actually used, wall-clock. */
  usedSeconds: number;
  expectedPoints: string[];
}

export interface Pause {
  atMs: number;
  ms: number;
  veryLong: boolean;
}

export interface MetricVerdict {
  id: string;
  label: string;
  value: string;
  target: string;
  ok: boolean;
  note: string;
}

export interface SpeechMetrics {
  words: number;
  speakingSeconds: number;
  wpm: number;
  fillers: { word: string; count: number }[];
  fillerCount: number;
  /** Fillers per hundred words. */
  fillerRate: number;
  pauses: Pause[];
  longestPauseMs: number;
  coverage: { point: string; hit: boolean }[];
  coverageRatio: number;
  completeUtterances: number;
  completionRatio: number;
  timeUsedRatio: number;
  verdicts: MetricVerdict[];
  fixes: string[];
}

/**
 * Filler patterns. "um" and "uh" are unambiguous; "like", "so" and "actually"
 * are real words, so each carries a guard against its legitimate use. The
 * guards are deliberately loose — over-counting by one is a nudge, while
 * under-counting means you never notice the habit at all.
 */
const FILLERS: { word: string; pattern: RegExp }[] = [
  { word: 'um', pattern: /\b(?:um+|umm+)\b/g },
  { word: 'uh', pattern: /\b(?:uh+|erm?|ah+)\b/g },
  { word: 'like', pattern: /\b(?<!would |'d |feel |look|sound|seem|just )like\b(?! this| that| a | the | to )/g },
  { word: 'you know', pattern: /\byou know\b/g },
  { word: 'I mean', pattern: /\bi mean\b/g },
  { word: 'basically', pattern: /\bbasically\b/g },
  { word: 'actually', pattern: /\bactually\b/g },
  { word: 'sort of', pattern: /\b(?:sort|kind) of\b/g },
  { word: 'so', pattern: /(?:^|[.!?]\s+)so\b(?! that| much| many| far)/g },
  { word: 'right', pattern: /\bright\?/g },
];

/**
 * Clause detection, as a proxy rather than a parser. An utterance counts as a
 * sentence if it is long enough to be one AND carries either an auxiliary or an
 * inflected verb form. Simple present and past ("costs", "pays") carry no
 * auxiliary at all, so the inflection test is what stops the metric flagging
 * perfectly good sentences as fragments.
 *
 * It errs towards counting things complete. The word floor does most of the
 * work — real spoken fragments are short ("and then", "so the", "it was") — and
 * a metric that cried fragment at ordinary sentences would be ignored within a
 * day, which is worse than one that occasionally lets a fragment through.
 */
const AUXILIARIES = /\b(?:is|are|was|were|am|be|been|has|have|had|do|does|did|can|could|will|would|shall|should|may|might|must)\b/i;
const INFLECTED = /^[a-z']{4,}(?:ed|ing|s)$/;
const MIN_WORDS_FOR_SENTENCE = 4;

const looksLikeSentence = (text: string): boolean => {
  const tokens = wordsOf(text);
  if (tokens.length < MIN_WORDS_FOR_SENTENCE) return false;
  if (AUXILIARIES.test(text)) return true;
  return tokens.slice(1).some((t) => INFLECTED.test(t));
};

const wordsOf = (text: string): string[] => text.toLowerCase().match(/[a-z']+/g) ?? [];
const stem = (word: string) => word.slice(0, 5);

const STOPWORDS = new Set([
  'the', 'and', 'that', 'have', 'for', 'not', 'with', 'you', 'this', 'but', 'they',
  'will', 'from', 'your', 'about', 'their', 'would', 'there', 'what', 'which', 'when',
  'been', 'were', 'more', 'some', 'such', 'than', 'then', 'them', 'also', 'into',
]);

/**
 * Expected points are written as instructions ("State a clear recommendation"),
 * so the instruction verb is not something the speaker has to say. Counting it
 * as a keyword would mark a perfectly good answer as having missed the point.
 */
const INSTRUCTION_VERBS = new Set([
  'name', 'state', 'give', 'list', 'explain', 'describe', 'discuss', 'mention',
  'identify', 'outline', 'offer', 'provide', 'suggest', 'compare', 'contrast',
  'say', 'tell', 'talk', 'about', 'your', 'clear', 'briefly', 'specific',
]);

export function analyseSpeech({
  segments, allottedSeconds, usedSeconds, expectedPoints,
}: SpeechInput): SpeechMetrics {
  const transcript = segments.map((s) => s.text).join(' ');
  const lower = ` ${transcript.toLowerCase()} `;
  const words = wordsOf(transcript);

  // Pace is measured against time actually spoken, not the window handed to
  // you — a 90-second window used for 40 seconds is a coverage problem, not a
  // pace problem, and conflating the two hides both.
  const spokenMs = segments.reduce((sum, s) => sum + Math.max(0, s.endMs - s.startMs), 0);
  const speakingSeconds = Math.max(0.5, spokenMs / 1000 || usedSeconds);
  const wpm = (words.length / speakingSeconds) * 60;

  const fillers = FILLERS
    .map(({ word, pattern }) => ({ word, count: lower.match(pattern)?.length ?? 0 }))
    .filter((f) => f.count > 0)
    .sort((a, b) => b.count - a.count);
  const fillerCount = fillers.reduce((sum, f) => sum + f.count, 0);

  const pauses: Pause[] = [];
  for (let i = 1; i < segments.length; i++) {
    const gap = segments[i].startMs - segments[i - 1].endMs;
    if (gap >= LONG_PAUSE_MS) {
      pauses.push({ atMs: segments[i - 1].endMs, ms: gap, veryLong: gap >= VERY_LONG_PAUSE_MS });
    }
  }

  const spokenStems = new Set(words.map(stem));
  const coverage = expectedPoints.map((point) => {
    const keys = wordsOf(point)
      .filter((w) => w.length >= 4 && !STOPWORDS.has(w) && !INSTRUCTION_VERBS.has(w));
    if (keys.length === 0) return { point, hit: false };
    const hits = keys.filter((k) => spokenStems.has(stem(k))).length;
    // Half the point's content words, or the only one there is.
    return { point, hit: hits >= Math.max(1, Math.ceil(keys.length / 2)) };
  });
  const coverageRatio = coverage.length ? coverage.filter((c) => c.hit).length / coverage.length : 1;

  const utterances = segments.filter((s) => wordsOf(s.text).length > 0);
  const completeUtterances = utterances.filter((s) => looksLikeSentence(s.text)).length;

  const metrics: Omit<SpeechMetrics, 'verdicts' | 'fixes'> = {
    words: words.length,
    speakingSeconds,
    wpm,
    fillers,
    fillerCount,
    fillerRate: words.length ? (fillerCount / words.length) * 100 : 0,
    pauses,
    longestPauseMs: pauses.reduce((max, p) => Math.max(max, p.ms), 0),
    coverage,
    coverageRatio,
    completeUtterances,
    completionRatio: utterances.length ? completeUtterances / utterances.length : 0,
    timeUsedRatio: allottedSeconds > 0 ? usedSeconds / allottedSeconds : 0,
  };

  return { ...metrics, verdicts: verdictsFor(metrics), fixes: fixesFor(metrics) };
}

type Bare = Omit<SpeechMetrics, 'verdicts' | 'fixes'>;

function verdictsFor(m: Bare): MetricVerdict[] {
  const longPauses = m.pauses.length;
  return [
    {
      id: 'wpm', label: 'Pace', value: `${Math.round(m.wpm)} wpm`, target: '130–150',
      ok: m.wpm >= 130 && m.wpm <= 150,
      note: m.wpm < 130
        ? 'Below the band. Slow usually means searching for the next word — plan two points during the think time and the pace follows.'
        : m.wpm > 150
          ? 'Above the band. Fast reads as nervous and swallows consonants; deliberately pause at commas.'
          : 'In the band that reads as confident without rushing.',
    },
    {
      id: 'filler', label: 'Filler rate', value: `${m.fillerRate.toFixed(1)} per 100 words`, target: 'under 3',
      ok: m.fillerRate < 3,
      note: m.fillerCount === 0
        ? 'No filler detected. That is the single most noticeable marker of fluency.'
        : `${m.fillerCount} filler${m.fillerCount === 1 ? '' : 's'}: ${m.fillers.slice(0, 3).map((f) => `"${f.word}" ×${f.count}`).join(', ')}. Replace each with a closed mouth — a half-second silence is invisible, an "um" is not.`,
    },
    {
      id: 'pauses', label: 'Long pauses', value: `${longPauses} over 1.5s`, target: 'under 3, none over 3s',
      ok: longPauses < 3 && m.longestPauseMs < VERY_LONG_PAUSE_MS,
      note: m.longestPauseMs >= VERY_LONG_PAUSE_MS
        ? `Longest gap ${(m.longestPauseMs / 1000).toFixed(1)}s. A pause that long reads as being stuck; finish the sentence you are in, then think.`
        : 'Pause profile is fine. Short pauses are structure, not hesitation.',
    },
    {
      id: 'coverage', label: 'Point coverage', value: `${Math.round(m.coverageRatio * 100)}%`, target: '70% or more',
      ok: m.coverageRatio >= 0.7,
      note: m.coverageRatio >= 0.7
        ? 'You covered the ground the prompt asked for.'
        : `Missed: ${m.coverage.filter((c) => !c.hit).map((c) => c.point).slice(0, 2).join('; ')}. Fluent but off-topic scores below halting but complete.`,
    },
    {
      id: 'completion', label: 'Complete sentences', value: `${Math.round(m.completionRatio * 100)}%`, target: '80% or more',
      ok: m.completionRatio >= 0.8,
      note: m.completionRatio >= 0.8
        ? 'Your sentences finish. That is most of what "clarity" means in this rubric.'
        : 'Too many fragments and restarts. Commit to the sentence you started — a clumsy finished sentence beats an elegant abandoned one.',
    },
    {
      id: 'time', label: 'Time used', value: `${Math.round(m.timeUsedRatio * 100)}%`, target: '70–95%',
      ok: m.timeUsedRatio >= 0.7 && m.timeUsedRatio <= 0.95,
      note: m.timeUsedRatio < 0.7
        ? 'You left time on the table. An unused third of the window is a third of the evidence the rubric never sees.'
        : m.timeUsedRatio > 0.95
          ? 'You ran to the buzzer. Aim to land the final sentence with a few seconds spare, so it does not get cut.'
          : 'Well judged — full but not cut off.',
    },
  ];
}

/** Worst first, capped at three. */
function fixesFor(m: Bare): string[] {
  return verdictsFor(m)
    .filter((v) => !v.ok)
    .slice(0, 3)
    .map((v) => `${v.label} — ${v.note}`);
}

/**
 * Character ranges of the fillers in a phrase, for the annotated playback view.
 * Seeing your own "um" highlighted in your own sentence changes behaviour in a
 * way a count never does.
 */
export function fillerSpans(text: string): { start: number; end: number }[] {
  const lower = text.toLowerCase();
  const spans: { start: number; end: number }[] = [];
  for (const { pattern } of FILLERS) {
    const scan = new RegExp(pattern.source, pattern.flags.includes('g') ? pattern.flags : `${pattern.flags}g`);
    for (const match of lower.matchAll(scan)) {
      if (match.index === undefined) continue;
      // The sentence-start guard on "so" swallows the preceding punctuation,
      // so the span is trimmed forward to where the word itself begins.
      const offset = match[0].length - match[0].replace(/^[^a-z]*/i, '').length;
      spans.push({ start: match.index + offset, end: match.index + match[0].length });
    }
  }
  return spans.sort((a, b) => a.start - b.start);
}
