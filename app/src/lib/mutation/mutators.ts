import { lineOf, maskCode } from './mask';
import type { Language } from '@/lib/runner/types';

/**
 * One mutator per bug family from the syllabus map.
 *
 * Each returns every site it could mutate, so the validity loop can try
 * alternatives when the first one happens to produce a program that still
 * passes all the tests.
 */

export type BugFamily =
  | 'off-by-one' | 'inverted-condition' | 'wrong-variable' | 'missing-return'
  | 'bad-init' | 'boundary-overflow' | 'assign-in-condition' | 'wrong-operator';

export interface MutationSite {
  family: BugFamily;
  /** Character offset in the ORIGINAL source. */
  start: number;
  end: number;
  replacement: string;
  line: number;
  description: string;
}

type Finder = (source: string, mask: string, language: Language) => MutationSite[];

/** Collects every regex match against the mask, mapped back to the original. */
function scan(
  source: string,
  mask: string,
  pattern: RegExp,
  build: (m: RegExpExecArray) => { start: number; end: number; replacement: string; description: string } | null,
  family: BugFamily,
): MutationSite[] {
  const sites: MutationSite[] = [];
  const re = new RegExp(pattern.source, pattern.flags.includes('g') ? pattern.flags : `${pattern.flags}g`);
  let m: RegExpExecArray | null;
  while ((m = re.exec(mask)) !== null) {
    const built = build(m);
    if (built) sites.push({ family, line: lineOf(source, built.start), ...built });
    if (m.index === re.lastIndex) re.lastIndex++;
  }
  return sites;
}

const offByOne: Finder = (source, mask) => [
  ...scan(source, mask, /([^<>=!])<=/g, (m) => ({
    start: m.index + 1, end: m.index + 3, replacement: '<',
    description: 'comparison boundary narrowed from <= to <',
  }), 'off-by-one'),
  ...scan(source, mask, /([^<>=!])<([^<=])/g, (m) => ({
    start: m.index + 1, end: m.index + 2, replacement: '<=',
    description: 'comparison boundary widened from < to <=',
  }), 'off-by-one'),
  ...scan(source, mask, /([^<>=!])>=/g, (m) => ({
    start: m.index + 1, end: m.index + 3, replacement: '>',
    description: 'comparison narrowed from >= to >',
  }), 'off-by-one'),
];

const invertCondition: Finder = (source, mask) => [
  ...scan(source, mask, /==/g, (m) => ({
    start: m.index, end: m.index + 2, replacement: '!=',
    description: 'equality test inverted to !=',
  }), 'inverted-condition'),
  ...scan(source, mask, /!=/g, (m) => ({
    start: m.index, end: m.index + 2, replacement: '==',
    description: 'inequality test inverted to ==',
  }), 'inverted-condition'),
  ...scan(source, mask, /&&/g, (m) => ({
    start: m.index, end: m.index + 2, replacement: '||',
    description: 'logical AND swapped for OR',
  }), 'inverted-condition'),
  ...scan(source, mask, /\|\|/g, (m) => ({
    start: m.index, end: m.index + 2, replacement: '&&',
    description: 'logical OR swapped for AND',
  }), 'inverted-condition'),
];

/**
 * Swaps two loop-index identifiers inside an array subscript — the classic
 * "used j where you meant i" bug, and one that always still compiles.
 */
const wrongVariable: Finder = (source, mask) => {
  const indices = new Set<string>();
  for (const m of mask.matchAll(/\bfor\s*\(\s*(?:int\s+)?([A-Za-z_]\w*)\s*=/g)) indices.add(m[1]);
  if (indices.size < 2) return [];
  const names = [...indices];

  const sites: MutationSite[] = [];
  for (const m of mask.matchAll(/\[\s*([A-Za-z_]\w*)\s*\]/g)) {
    const name = m[1];
    if (!indices.has(name)) continue;
    const other = names.find((n) => n !== name);
    if (!other) continue;
    const offset = (m.index ?? 0) + m[0].indexOf(name);
    sites.push({
      family: 'wrong-variable',
      start: offset,
      end: offset + name.length,
      replacement: other,
      line: lineOf(source, offset),
      description: `array indexed with ${other} where ${name} was meant`,
    });
  }
  return sites;
};

/** Deletes a `return` inside a branch, so one path silently falls through. */
const missingReturn: Finder = (source, mask) =>
  scan(source, mask, /\breturn\s+[^;]+;/g, (m) => {
    // Never remove the last return of the function — that is a compile error in
    // C/C++ only sometimes and a different (less interesting) bug.
    if (mask.slice(m.index + m[0].length).trim().startsWith('}') &&
        !mask.slice(m.index + m[0].length).trim().slice(1).includes('return')) return null;
    return {
      start: m.index, end: m.index + m[0].length,
      replacement: ';'.padStart(m[0].length, ' '),
      description: 'a return statement was removed from one branch',
    };
  }, 'missing-return');

/** Changes an accumulator's starting value — breaks all-negative inputs, empty arrays. */
const badInit: Finder = (source, mask) => [
  ...scan(source, mask, /=\s*INT_MIN\b/g, (m) => ({
    start: m.index, end: m.index + m[0].length, replacement: '= 0',
    description: 'maximum tracker initialised to 0 instead of INT_MIN',
  }), 'bad-init'),
  ...scan(source, mask, /=\s*Integer\.MIN_VALUE\b/g, (m) => ({
    start: m.index, end: m.index + m[0].length, replacement: '= 0',
    description: 'maximum tracker initialised to 0 instead of Integer.MIN_VALUE',
  }), 'bad-init'),
  ...scan(source, mask, /\b(sum|total|count|acc)\s*=\s*0\b/g, (m) => ({
    start: m.index, end: m.index + m[0].length, replacement: `${m[1]} = 1`,
    description: `accumulator ${m[1]} initialised to 1 instead of 0`,
  }), 'bad-init'),
];

/** Extends a loop bound so it touches arr[n]. */
const boundaryOverflow: Finder = (source, mask) =>
  scan(source, mask, /<\s*([A-Za-z_]\w*)\s*;/g, (m) => ({
    start: m.index, end: m.index + m[0].length, replacement: `<= ${m[1]};`,
    description: `loop runs one past the end of ${m[1]}`,
  }), 'boundary-overflow');

/** `if (x = 1)` instead of `if (x == 1)`. C and C++ only; Java rejects it. */
const assignInCondition: Finder = (source, mask, language) => {
  if (language === 'java') return [];
  return scan(source, mask, /\bif\s*\(\s*([A-Za-z_]\w*)\s*==/g, (m) => ({
    start: m.index + m[0].length - 2, end: m.index + m[0].length, replacement: '=',
    description: 'assignment used where comparison was meant',
  }), 'assign-in-condition');
};

const wrongOperator: Finder = (source, mask) => [
  ...scan(source, mask, /([A-Za-z_)\]\d])\s\+\s([A-Za-z_(\d])/g, (m) => ({
    start: m.index + 1, end: m.index + m[0].length - 1, replacement: ' - ',
    description: 'addition replaced with subtraction',
  }), 'wrong-operator'),
  ...scan(source, mask, /\+\+/g, (m) => ({
    start: m.index, end: m.index + 2, replacement: '--',
    description: 'increment replaced with decrement',
  }), 'wrong-operator'),
];

export const MUTATORS: Record<BugFamily, Finder> = {
  'off-by-one': offByOne,
  'inverted-condition': invertCondition,
  'wrong-variable': wrongVariable,
  'missing-return': missingReturn,
  'bad-init': badInit,
  'boundary-overflow': boundaryOverflow,
  'assign-in-condition': assignInCondition,
  'wrong-operator': wrongOperator,
};

export const ALL_FAMILIES = Object.keys(MUTATORS) as BugFamily[];

/** Every site this family could mutate, in source order. */
export function findSites(source: string, family: BugFamily, language: Language): MutationSite[] {
  const mask = maskCode(source);
  return MUTATORS[family](source, mask, language).sort((a, b) => a.start - b.start);
}

export function applySite(source: string, site: MutationSite): string {
  return source.slice(0, site.start) + site.replacement + source.slice(site.end);
}
