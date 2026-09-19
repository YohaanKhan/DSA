import { describe, expect, it } from 'vitest';
import { normaliseOutput, similarity, validateItems } from './validate';

const goodMcq = {
  id: 'test-mcq-001',
  kind: 'mcq',
  stage: 'ai-literacy',
  topic: 'llm-limitations',
  subtopic: 'hallucination',
  difficulty: 'easy',
  priority: 'P0',
  tags: [],
  source: 'authored',
  targetSeconds: 45,
  stem: 'Which limitation produces fluent but fabricated citations?',
  options: [
    { id: 'a', text: 'Context window overflow' },
    { id: 'b', text: 'Hallucination' },
    { id: 'c', text: 'Knowledge cutoff' },
    { id: 'd', text: 'Prompt injection' },
  ],
  answer: 'b',
  explanation:
    'Hallucination is fluent output that is factually unsupported. The citations are well-formed but non-existent, which is the signature of fabrication rather than staleness.',
};

const goodTrace = {
  id: 'test-trace-001',
  kind: 'trace',
  stage: 'technical',
  topic: 'pseudocode',
  subtopic: 'loops',
  difficulty: 'easy',
  priority: 'P0',
  tags: [],
  source: 'authored',
  targetSeconds: 60,
  language: 'pseudocode',
  sourceCode: 'Integer s = 0\nFor i = 1 to 3\n    s = s + i\nEnd For\nPrint s',
  question: 'What is printed?',
  answerMode: 'exact',
  answer: '6',
  explanation: 'The loop accumulates 1 + 2 + 3, so the printed value is 6. Count the actual loop values rather than assuming.',
  executionTrace: [
    { step: 1, line: 1, vars: { s: 0 } },
    { step: 2, line: 3, vars: { i: 1, s: 1 } },
    { step: 3, line: 3, vars: { i: 2, s: 3 } },
    { step: 4, line: 3, vars: { i: 3, s: 6 } },
    { step: 5, line: 5, vars: { s: 6 }, output: '6' },
  ],
};

const rulesFor = (item: unknown) =>
  validateItems([{ item, file: 'fixture.json' }]).violations.map((v) => v.rule);

describe('content validation', () => {
  it('accepts well-formed items', () => {
    const { items, violations } = validateItems([
      { item: goodMcq, file: 'a.json' },
      { item: goodTrace, file: 'b.json' },
    ]);
    expect(violations).toEqual([]);
    expect(items).toHaveLength(2);
  });

  it('V1 rejects an item that does not match the schema', () => {
    const { options, ...noOptions } = goodMcq;
    void options;
    expect(rulesFor(noOptions)).toContain('V1');
  });

  it('V1 rejects an explanation that is too short to teach anything', () => {
    expect(rulesFor({ ...goodMcq, explanation: 'Answer is B.' })).toContain('V1');
  });

  it('V2 rejects a duplicate id across banks', () => {
    const { violations } = validateItems([
      { item: goodMcq, file: 'a.json' },
      { item: { ...goodMcq, stem: 'A different stem entirely about something else.' }, file: 'b.json' },
    ]);
    expect(violations.map((v) => v.rule)).toContain('V2');
  });

  it('V3 rejects a topic that is not in the registry', () => {
    expect(rulesFor({ ...goodMcq, topic: 'astrology', subtopic: undefined })).toContain('V3');
  });

  it('V3 rejects a subtopic that is not registered under its topic', () => {
    expect(rulesFor({ ...goodMcq, subtopic: 'not-a-real-subtopic' })).toContain('V3');
  });

  it('V3 rejects a priority that disagrees with the registry', () => {
    expect(rulesFor({ ...goodMcq, priority: 'P2' })).toContain('V3');
  });

  it('V4 rejects an answer that matches no option', () => {
    // 'd' exists as an id, so swap the option ids to orphan the answer.
    const orphaned = {
      ...goodMcq,
      options: [
        { id: 'a', text: 'One' },
        { id: 'b', text: 'Two' },
        { id: 'c', text: 'Three' },
        { id: 'a', text: 'Four' },
      ],
      answer: 'd',
    };
    expect(rulesFor(orphaned)).toContain('V4');
  });

  it('V5 rejects duplicate option text', () => {
    const dupe = {
      ...goodMcq,
      options: [
        { id: 'a', text: 'Hallucination' },
        { id: 'b', text: 'Hallucination' },
        { id: 'c', text: 'Knowledge cutoff' },
        { id: 'd', text: 'Prompt injection' },
      ],
    };
    expect(rulesFor(dupe)).toContain('V5');
  });

  it('V5 rejects "All of the above"', () => {
    const banned = {
      ...goodMcq,
      options: [
        { id: 'a', text: 'Context window overflow' },
        { id: 'b', text: 'Hallucination' },
        { id: 'c', text: 'Knowledge cutoff' },
        { id: 'd', text: 'All of the above' },
      ],
    };
    expect(rulesFor(banned)).toContain('V5');
  });

  it('V6 rejects an explanation that merely restates the correct option', () => {
    const restated = {
      ...goodMcq,
      options: [
        { id: 'a', text: 'Context window overflow' },
        { id: 'b', text: 'The answer here is hallucination, which means hallucination occurred' },
        { id: 'c', text: 'Knowledge cutoff' },
        { id: 'd', text: 'Prompt injection' },
      ],
      explanation: 'The answer here is hallucination, which means hallucination occurred in this case.',
    };
    expect(rulesFor(restated)).toContain('V6');
  });

  it('V7 flags a skewed answer-key distribution across a bank', () => {
    const bank = Array.from({ length: 24 }, (_, i) => ({
      item: {
        ...goodMcq,
        id: `test-mcq-skew-${i}`,
        stem: `Distinct stem number ${i} asking about a different scenario entirely ${'x'.repeat(i)}`,
        answer: 'b',
      },
      file: 'bank.json',
    }));
    const { violations } = validateItems(bank);
    expect(violations.map((v) => v.rule)).toContain('V7');
  });

  it('V8 rejects a trace whose own execution contradicts its stated answer', () => {
    const violations = rulesFor({ ...goodTrace, answer: '7' });
    expect(violations).toContain('V8');
  });

  it('V8 rejects a trace that never produces output', () => {
    const noOutput = {
      ...goodTrace,
      executionTrace: goodTrace.executionTrace.map(({ output, ...rest }) => {
        void output;
        return rest;
      }),
    };
    expect(rulesFor(noOutput)).toContain('V8');
  });

  it('V9 rejects a trace step referencing a line beyond the source', () => {
    const offEnd = {
      ...goodTrace,
      executionTrace: [...goodTrace.executionTrace, { step: 6, line: 99, vars: { s: 6 } }],
    };
    expect(rulesFor(offEnd)).toContain('V9');
  });

  it('V14 flags near-duplicate stems within a topic', () => {
    const { violations } = validateItems([
      { item: goodMcq, file: 'a.json' },
      { item: { ...goodMcq, id: 'test-mcq-002' }, file: 'a.json' },
    ]);
    expect(violations.map((v) => v.rule)).toContain('V14');
  });

  it('reports every violation, not just the first', () => {
    const { violations } = validateItems([
      { item: { ...goodTrace, answer: '7' }, file: 'a.json' },
      { item: { ...goodMcq, topic: 'astrology', subtopic: undefined }, file: 'b.json' },
    ]);
    const rules = new Set(violations.map((v) => v.rule));
    expect(rules.has('V8')).toBe(true);
    expect(rules.has('V3')).toBe(true);
  });
});

describe('helpers', () => {
  it('normaliseOutput trims and normalises line endings', () => {
    expect(normaliseOutput('  3  \r\n')).toBe('3');
    expect(normaliseOutput('a\r\n b \n')).toBe('a\nb');
  });

  it('similarity is 1 for identical text and low for unrelated text', () => {
    expect(similarity('hello world', 'hello world')).toBeCloseTo(1);
    expect(similarity('hello world', 'zebra quantum')).toBeLessThan(0.2);
  });
});
