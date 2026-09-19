/**
 * Essay analysis that runs with NO API key.
 *
 * Everything here is mechanical: counts, ratios and pattern matches over your
 * own text. That matters more than it sounds — structure, length discipline and
 * lexical variety are most of what a band-descriptor rubric rewards, and they
 * are exactly the parts you can fix by seeing a number. Grammar and prose
 * quality genuinely need a reader, so those come from the model when a key is
 * set and are reported as "not scored" when it is not, rather than guessed at.
 *
 * Every heuristic below is named and its threshold is a constant, because a
 * rubric you cannot inspect is a rubric you cannot argue with.
 * See plan/07-SCORING-AND-ANALYTICS.md §5.
 */

export const RUN_ON_WORDS = 45;
export const MATTR_WINDOW = 50;
export const REPEAT_MIN_COUNT = 4;
export const REPEAT_MIN_SHARE = 0.015;

const SUBORDINATORS = [
  'because', 'although', 'though', 'while', 'whereas', 'since', 'unless', 'until',
  'whenever', 'wherever', 'after', 'before', 'if', 'when', 'where', 'which', 'who', 'that',
];

const CONNECTORS = [
  'however', 'therefore', 'moreover', 'furthermore', 'consequently', 'nevertheless',
  'nonetheless', 'in addition', 'for example', 'for instance', 'on the other hand',
  'as a result', 'in contrast', 'similarly', 'firstly', 'secondly', 'thirdly', 'finally',
  'in conclusion', 'to conclude', 'overall', 'in summary', 'because', 'although',
  'while', 'whereas', 'thus', 'hence', 'meanwhile', 'by comparison',
];

const CONCLUSION_MARKERS = [
  'in conclusion', 'to conclude', 'to sum up', 'in summary', 'overall', 'ultimately',
  'all things considered', 'on balance', 'in short',
];

const THESIS_MARKERS = [
  'this essay', 'i believe', 'in my view', 'in my opinion', 'i argue', 'i will argue',
  'this piece', 'the question of', 'it is often', 'few would', 'this raises',
];

/**
 * Function words only. Nouns and verbs stay out of this list on purpose — a
 * repetition check that ignores "work" or "system" would miss precisely the
 * repetition that costs vocabulary marks.
 */
const STOPWORDS = new Set([
  'the', 'and', 'that', 'have', 'for', 'not', 'with', 'you', 'this', 'but', 'his', 'her',
  'they', 'she', 'will', 'one', 'all', 'would', 'there', 'their', 'what', 'out', 'about',
  'who', 'which', 'when', 'can', 'just', 'him', 'into', 'your', 'some', 'could', 'them',
  'than', 'then', 'now', 'only', 'its', 'over', 'also', 'after', 'two', 'how', 'our',
  'even', 'because', 'any', 'these', 'most', 'are', 'was', 'were', 'has', 'had', 'been',
  'from', 'more', 'such', 'very', 'many', 'much', 'own', 'same', 'other', 'while',
  'should', 'must', 'may', 'might', 'shall', 'does', 'did', 'both', 'each', 'every',
  'being', 'those', 'where', 'here', 'once', 'upon', 'with', 'without', 'under',
]);

export interface RunOn {
  index: number;
  words: number;
  excerpt: string;
}

export interface EssayMetrics {
  words: number;
  targetWords: [number, number];
  inBand: boolean;
  characters: number;
  paragraphs: number;
  sentences: number;
  meanSentenceWords: number;
  sentenceStdev: number;
  hasIntro: boolean;
  hasConclusion: boolean;
  runOns: RunOn[];
  /** Moving-average type-token ratio — length-stable, unlike plain TTR. */
  mattr: number;
  meanWordLength: number;
  /** Connectors per hundred words. */
  connectorDensity: number;
  /** Fraction of sentences in the passive voice. */
  passiveRatio: number;
  repeatedWords: { word: string; count: number }[];
  /** Fraction of the prompt's content words the essay actually touches. */
  promptCoverage: number;
  missedPromptWords: string[];
}

const wordsOf = (text: string): string[] => text.toLowerCase().match(/[a-z']+/g) ?? [];

export function splitSentences(text: string): string[] {
  return text
    .replace(/\s+/g, ' ')
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

export const splitParagraphs = (text: string): string[] =>
  text.split(/\n\s*\n/).map((p) => p.trim()).filter((p) => p.length > 0);

const containsAny = (haystack: string, needles: string[]) =>
  needles.some((n) => haystack.includes(n));

/** Crude stemming: five-character prefixes. Enough to tie "technology" to "technological". */
const stem = (word: string) => word.slice(0, 5);

export function analyseEssay(
  text: string,
  { prompt, targetWords }: { prompt: string; targetWords: [number, number] },
): EssayMetrics {
  const all = wordsOf(text);
  const paragraphs = splitParagraphs(text);
  const sentences = splitSentences(text);
  const lower = text.toLowerCase();

  const sentenceLengths = sentences.map((s) => wordsOf(s).length);
  const mean = sentenceLengths.length
    ? sentenceLengths.reduce((a, b) => a + b, 0) / sentenceLengths.length
    : 0;
  const variance = sentenceLengths.length
    ? sentenceLengths.reduce((a, n) => a + (n - mean) ** 2, 0) / sentenceLengths.length
    : 0;

  // The plan's rule is "over 45 words with no subordinating conjunction". That
  // alone misses the commonest real run-on, which is a long chain of clauses
  // strung together with "and" and rescued by a single stray "because", so a
  // coordinator chain counts too.
  const runOns: RunOn[] = [];
  sentences.forEach((sentence, index) => {
    const count = wordsOf(sentence).length;
    if (count <= RUN_ON_WORDS) return;
    const s = sentence.toLowerCase();
    const subordinated =
      sentence.includes(';') || SUBORDINATORS.some((w) => new RegExp(`\\b${w}\\b`).test(s));
    const coordinatorChain = (s.match(/\b(?:and|but|or|so)\b/g) ?? []).length >= 3;
    if (subordinated && !coordinatorChain) return;
    runOns.push({ index, words: count, excerpt: `${sentence.slice(0, 90)}…` });
  });

  // MATTR: average unique-word ratio over a sliding window, so a long essay is
  // not penalised for the arithmetic inevitability of repeating "the".
  let mattr = 0;
  if (all.length === 0) {
    mattr = 0;
  } else if (all.length <= MATTR_WINDOW) {
    mattr = new Set(all).size / all.length;
  } else {
    let total = 0;
    for (let i = 0; i + MATTR_WINDOW <= all.length; i++) {
      total += new Set(all.slice(i, i + MATTR_WINDOW)).size / MATTR_WINDOW;
    }
    mattr = total / (all.length - MATTR_WINDOW + 1);
  }

  const connectorHits = CONNECTORS.reduce(
    (sum, c) => sum + (lower.match(new RegExp(`\\b${c}\\b`, 'g'))?.length ?? 0), 0,
  );

  const passive = sentences.filter((s) =>
    /\b(?:am|is|are|was|were|be|been|being)\s+(?:\w+ly\s+)?\w+(?:ed|en)\b/i.test(s)).length;

  const counts = new Map<string, number>();
  for (const word of all) {
    if (word.length < 4 || STOPWORDS.has(word)) continue;
    counts.set(word, (counts.get(word) ?? 0) + 1);
  }
  const repeatedWords = [...counts.entries()]
    .filter(([, n]) => n >= REPEAT_MIN_COUNT && n / Math.max(1, all.length) >= REPEAT_MIN_SHARE)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([word, count]) => ({ word, count }));

  const promptWords = [...new Set(wordsOf(prompt).filter((w) => w.length >= 4 && !STOPWORDS.has(w)))];
  const essayStems = new Set(all.map(stem));
  const missedPromptWords = promptWords.filter((w) => !essayStems.has(stem(w)));
  const promptCoverage = promptWords.length
    ? (promptWords.length - missedPromptWords.length) / promptWords.length
    : 1;

  const first = paragraphs[0]?.toLowerCase() ?? '';
  const last = paragraphs[paragraphs.length - 1]?.toLowerCase() ?? '';

  return {
    words: all.length,
    targetWords,
    inBand: all.length >= targetWords[0] && all.length <= targetWords[1],
    characters: text.length,
    paragraphs: paragraphs.length,
    sentences: sentences.length,
    meanSentenceWords: mean,
    sentenceStdev: Math.sqrt(variance),
    // An introduction is a paragraph that sets something up: long enough to say
    // more than one thing, and either signalling a thesis or naming the prompt.
    hasIntro:
      paragraphs.length >= 2 &&
      wordsOf(first).length >= 25 &&
      (containsAny(first, THESIS_MARKERS) || promptWords.some((w) => first.includes(w.slice(0, 5)))),
    hasConclusion:
      paragraphs.length >= 3 &&
      (containsAny(last, CONCLUSION_MARKERS) ||
        promptWords.filter((w) => last.includes(w.slice(0, 5))).length >= 2),
    runOns,
    mattr,
    meanWordLength: all.length ? all.reduce((a, w) => a + w.length, 0) / all.length : 0,
    connectorDensity: all.length ? (connectorHits / all.length) * 100 : 0,
    passiveRatio: sentences.length ? passive / sentences.length : 0,
    repeatedWords,
    promptCoverage,
    missedPromptWords: missedPromptWords.slice(0, 8),
  };
}

// ---- Bands ---------------------------------------------------------------

export type CriterionId = 'taskResponse' | 'structure' | 'grammar' | 'vocabulary' | 'mechanics';

export interface CriterionScore {
  id: CriterionId;
  label: string;
  /** null means "this needs a reader" — never a guessed zero. */
  score: number | null;
  outOf: 5;
  why: string;
}

export interface EssayScore {
  criteria: CriterionScore[];
  /** Mean of the scored criteria, 0..5. Null only if nothing could be scored. */
  overall: number | null;
  metrics: EssayMetrics;
  /** Ordered, concrete, and derived only from what was measured. */
  fixes: string[];
}

const clampBand = (n: number) => Math.max(0, Math.min(5, Math.round(n * 2) / 2));

/**
 * Four of the five criteria have a defensible mechanical proxy. Grammar does
 * not, and is left explicitly unscored offline: a spell-check masquerading as a
 * grammar band would be worse than an honest gap.
 */
export function scoreEssayMechanically(metrics: EssayMetrics): EssayScore {
  const m = metrics;

  const lengthPoints = m.inBand ? 2 : m.words >= m.targetWords[0] * 0.8 && m.words <= m.targetWords[1] * 1.2 ? 1 : 0;
  const taskResponse = clampBand(lengthPoints + m.promptCoverage * 3);

  const structure = clampBand(
    (m.paragraphs >= 4 && m.paragraphs <= 5 ? 2 : m.paragraphs === 3 || m.paragraphs === 6 ? 1 : 0) +
    (m.hasIntro ? 1 : 0) +
    (m.hasConclusion ? 1 : 0) +
    (m.connectorDensity >= 1.5 ? 1 : m.connectorDensity >= 0.8 ? 0.5 : 0),
  );

  const vocabulary = clampBand(
    (m.mattr >= 0.78 ? 3 : m.mattr >= 0.72 ? 2.5 : m.mattr >= 0.66 ? 2 : m.mattr >= 0.6 ? 1 : 0) +
    (m.meanWordLength >= 5.0 ? 2 : m.meanWordLength >= 4.6 ? 1.5 : m.meanWordLength >= 4.2 ? 1 : 0) -
    (m.repeatedWords.length >= 3 ? 0.5 : 0),
  );

  const mechanics = clampBand(
    (m.sentenceStdev >= 5 && m.sentenceStdev <= 12 ? 2 : m.sentenceStdev >= 3 ? 1 : 0) +
    (m.runOns.length === 0 ? 2 : m.runOns.length === 1 ? 1 : 0) +
    (m.passiveRatio <= 0.25 ? 1 : m.passiveRatio <= 0.4 ? 0.5 : 0),
  );

  const criteria: CriterionScore[] = [
    {
      id: 'taskResponse', label: 'Task response', score: taskResponse, outOf: 5,
      why: `${m.words} words against a ${m.targetWords[0]}–${m.targetWords[1]} target; ${Math.round(m.promptCoverage * 100)}% of the prompt's key terms addressed.`,
    },
    {
      id: 'structure', label: 'Structure', score: structure, outOf: 5,
      why: `${m.paragraphs} paragraphs, ${m.hasIntro ? 'an introduction' : 'no clear introduction'}, ${m.hasConclusion ? 'a conclusion' : 'no clear conclusion'}, ${m.connectorDensity.toFixed(1)} connectors per 100 words.`,
    },
    {
      id: 'grammar', label: 'Grammar', score: null, outOf: 5,
      why: 'Not scored offline. Grammar needs a reader, and a spell-check dressed up as a band score would be worse than an honest gap. Set ANTHROPIC_API_KEY for the full critique.',
    },
    {
      id: 'vocabulary', label: 'Vocabulary', score: vocabulary, outOf: 5,
      why: `Lexical variety ${(m.mattr * 100).toFixed(0)} (moving-window type-token ratio), mean word length ${m.meanWordLength.toFixed(1)}.`,
    },
    {
      id: 'mechanics', label: 'Mechanics', score: mechanics, outOf: 5,
      why: `Sentence length ${m.meanSentenceWords.toFixed(0)} ± ${m.sentenceStdev.toFixed(0)} words, ${m.runOns.length} run-on${m.runOns.length === 1 ? '' : 's'}, ${Math.round(m.passiveRatio * 100)}% passive.`,
    },
  ];

  const scored = criteria.filter((c) => c.score !== null).map((c) => c.score!);

  return {
    criteria,
    overall: scored.length ? scored.reduce((a, b) => a + b, 0) / scored.length : null,
    metrics: m,
    fixes: fixesFor(m),
  };
}

/** Ordered worst-first, capped at three. A list of nine gets ignored. */
function fixesFor(m: EssayMetrics): string[] {
  const candidates: { weight: number; text: string }[] = [];

  if (!m.inBand) {
    const short = m.words < m.targetWords[0];
    candidates.push({
      weight: 10,
      text: short
        ? `You wrote ${m.words} words against a ${m.targetWords[0]}-word floor. Under-length is the cheapest mark to lose: add one developed body paragraph with a concrete example.`
        : `You wrote ${m.words} words against a ${m.targetWords[1]}-word ceiling. Over-length costs marks for control — cut the weakest body paragraph rather than trimming every sentence.`,
    });
  }
  if (!m.hasConclusion) {
    candidates.push({ weight: 9, text: 'No conclusion was detected. Two sentences that restate your position and name its consequence are worth more than another body point.' });
  }
  if (!m.hasIntro) {
    candidates.push({ weight: 8, text: 'No introduction was detected. Open with the question restated in your own words and a one-sentence thesis, so the reader knows where you are going.' });
  }
  if (m.paragraphs < 4) {
    candidates.push({ weight: 7, text: `Only ${m.paragraphs} paragraph${m.paragraphs === 1 ? '' : 's'}. Aim for four or five: introduction, two or three developed points, conclusion.` });
  }
  if (m.runOns.length > 0) {
    candidates.push({ weight: 6, text: `${m.runOns.length} run-on sentence${m.runOns.length === 1 ? '' : 's'} over ${RUN_ON_WORDS} words with no subordinating clause. Split them — the first starts "${m.runOns[0].excerpt.slice(0, 50)}".` });
  }
  if (m.promptCoverage < 0.6) {
    candidates.push({ weight: 6, text: `You did not touch ${m.missedPromptWords.slice(0, 3).join(', ')} from the prompt. Task response is the criterion that caps every other band — answer the question that was asked.` });
  }
  if (m.connectorDensity < 1.0) {
    candidates.push({ weight: 5, text: 'Very few connectives. Signposting ("however", "as a result", "by contrast") is what makes an argument read as an argument rather than a list.' });
  }
  if (m.repeatedWords.length >= 3) {
    candidates.push({ weight: 4, text: `Repetition: ${m.repeatedWords.slice(0, 3).map((r) => `"${r.word}" ×${r.count}`).join(', ')}. Vary these, or vary the sentence so you do not need them.` });
  }
  if (m.sentenceStdev < 3 && m.sentences > 4) {
    candidates.push({ weight: 4, text: 'Every sentence is about the same length, which reads as flat. Put a short sentence after a long one deliberately.' });
  }
  if (m.passiveRatio > 0.4) {
    candidates.push({ weight: 3, text: `${Math.round(m.passiveRatio * 100)}% of your sentences are passive. Name the actor — it shortens the sentence and sharpens the claim.` });
  }

  return candidates.sort((a, b) => b.weight - a.weight).slice(0, 3).map((c) => c.text);
}
