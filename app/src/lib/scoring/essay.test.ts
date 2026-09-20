import { describe, expect, it } from 'vitest';
import { RUN_ON_WORDS, analyseEssay, scoreEssayMechanically, splitParagraphs, splitSentences } from './essay';

const PROMPT = 'Automation is reshaping entry-level work. Should companies retrain existing staff or hire new specialists?';
const TARGET: [number, number] = [250, 350];

/** A deliberately competent essay: five paragraphs, signposted, varied. */
const GOOD = `Automation has changed what an entry-level job looks like, and companies now face a choice
that used to be theoretical. Should they retrain the staff they already employ, or hire specialists who
already know the new tools? In my view retraining should be the default, and hiring the exception.

The first argument is institutional knowledge. A person who has spent three years in a company knows
which customers complain, which processes are fragile and which shortcuts are load-bearing. A specialist
arrives with the tool but without any of that context, and spends months acquiring it. Retraining
preserves something that cannot be recruited.

However, retraining is not free, and it is not always sufficient. Some capabilities, particularly in
machine learning infrastructure, take years rather than months to build. Where the gap is that wide, a
company that insists on retraining is choosing a slower result for the sake of a principle. Hiring is
the honest answer in those cases.

The practical position is therefore a mixed one. Retrain broadly, because most automation displaces
tasks rather than whole roles, and the tasks that remain are the ones your existing staff already
understand. Hire narrowly, for the two or three capabilities that genuinely cannot be grown in time.
This is also cheaper than it looks, because a small number of specialists can teach.

In conclusion, the question is badly framed as a choice. Companies that retrain everyone move too
slowly, and companies that only hire lose the knowledge that made them worth automating. The
defensible policy is to retrain as the rule and to hire deliberately where the gap is genuinely
structural, rather than merely inconvenient.`;

/** One block, one enormous sentence, repetitive, off-prompt. */
const BAD = `I think work is good and work is important and work is something that people do every day and it is a thing that everyone does because work is how you earn and work is what makes a person feel useful and so work matters a lot to me personally and I think it matters to other people as well in the same way.`;

describe('splitting', () => {
  it('splits sentences on terminal punctuation', () => {
    expect(splitSentences('One. Two! Three? Four')).toHaveLength(4);
  });

  it('splits paragraphs on blank lines', () => {
    expect(splitParagraphs('a\n\nb\n\n\nc')).toEqual(['a', 'b', 'c']);
    expect(splitParagraphs('   ')).toEqual([]);
  });
});

describe('analyseEssay', () => {
  const good = analyseEssay(GOOD, { prompt: PROMPT, targetWords: TARGET });
  const bad = analyseEssay(BAD, { prompt: PROMPT, targetWords: TARGET });

  it('counts words, sentences and paragraphs', () => {
    expect(good.paragraphs).toBe(5);
    expect(good.words).toBeGreaterThan(250);
    expect(good.sentences).toBeGreaterThan(12);
    expect(bad.paragraphs).toBe(1);
  });

  it('detects an introduction and a conclusion when they are there', () => {
    expect(good.hasIntro).toBe(true);
    expect(good.hasConclusion).toBe(true);
    expect(bad.hasIntro).toBe(false);
    expect(bad.hasConclusion).toBe(false);
  });

  it('flags a run-on and leaves long-but-subordinated sentences alone', () => {
    expect(bad.runOns).toHaveLength(1);
    expect(bad.runOns[0].words).toBeGreaterThan(RUN_ON_WORDS);
    expect(good.runOns).toHaveLength(0);
  });

  it('measures lexical variety in a way length does not distort', () => {
    expect(good.mattr).toBeGreaterThan(bad.mattr);
    // MATTR is a window average, so it cannot drift simply because the text is long.
    expect(good.mattr).toBeLessThanOrEqual(1);
    expect(good.mattr).toBeGreaterThan(0.6);
  });

  it('counts connectors per hundred words', () => {
    expect(good.connectorDensity).toBeGreaterThan(1);
    expect(bad.connectorDensity).toBeLessThan(good.connectorDensity);
  });

  it('measures how much of the prompt was actually addressed', () => {
    expect(good.promptCoverage).toBeGreaterThan(0.7);
    expect(bad.promptCoverage).toBeLessThan(0.4);
    expect(bad.missedPromptWords).toContain('automation');
  });

  it('surfaces repeated words', () => {
    expect(bad.repeatedWords.map((r) => r.word)).toContain('work');
    expect(good.repeatedWords.length).toBeLessThan(bad.repeatedWords.length + 1);
  });

  it('handles an empty essay without dividing by zero', () => {
    const empty = analyseEssay('', { prompt: PROMPT, targetWords: TARGET });
    expect(empty.words).toBe(0);
    expect(Number.isFinite(empty.mattr)).toBe(true);
    expect(Number.isFinite(empty.meanSentenceWords)).toBe(true);
    expect(empty.connectorDensity).toBe(0);
  });
});

describe('scoreEssayMechanically', () => {
  const good = scoreEssayMechanically(analyseEssay(GOOD, { prompt: PROMPT, targetWords: TARGET }));
  const bad = scoreEssayMechanically(analyseEssay(BAD, { prompt: PROMPT, targetWords: TARGET }));

  it('scores the competent essay above the bad one', () => {
    expect(good.overall!).toBeGreaterThan(bad.overall!);
    expect(good.overall!).toBeGreaterThan(3);
    expect(bad.overall!).toBeLessThan(2.5);
  });

  it('leaves grammar explicitly unscored rather than guessing it', () => {
    const grammar = good.criteria.find((c) => c.id === 'grammar')!;
    expect(grammar.score).toBeNull();
    expect(grammar.why).toContain('ANTHROPIC_API_KEY');
  });

  it('keeps every band inside nought to five', () => {
    for (const c of [...good.criteria, ...bad.criteria]) {
      if (c.score === null) continue;
      expect(c.score).toBeGreaterThanOrEqual(0);
      expect(c.score).toBeLessThanOrEqual(5);
    }
  });

  it('gives at most three fixes, worst first', () => {
    expect(bad.fixes.length).toBeGreaterThan(0);
    expect(bad.fixes.length).toBeLessThanOrEqual(3);
    // Under-length is the cheapest mark to lose, so it leads.
    expect(bad.fixes[0]).toMatch(/word/i);
  });

  it('explains each band with the number it was derived from', () => {
    const structure = good.criteria.find((c) => c.id === 'structure')!;
    expect(structure.why).toContain('5 paragraphs');
  });
});
