import { describe, expect, it } from 'vitest';
import { maskCode } from './mask';
import { applySite, findSites } from './mutators';

/**
 * Mutator unit tests. These run without a compiler, so they are fast; the
 * broken-and-compiling guarantee itself is enforced by the validity loop in
 * inject.ts, which does need one.
 */

describe('maskCode', () => {
  it('blanks string literals so their contents are never mutated', () => {
    const src = 'printf("i < n && x == y");';
    const masked = maskCode(src);
    expect(masked).toHaveLength(src.length);
    expect(masked).not.toContain('<');
    expect(masked).not.toContain('==');
    expect(masked.startsWith('printf(')).toBe(true);
  });

  it('blanks line and block comments', () => {
    const masked = maskCode('int a = 1; // i <= n\n/* x == y */ int b;');
    expect(masked).not.toContain('<=');
    expect(masked).not.toContain('==');
    expect(masked).toContain('int a = 1;');
    expect(masked).toContain('int b;');
  });

  it('preserves newlines so line numbers stay correct', () => {
    const src = 'a\n// comment\nb';
    expect(maskCode(src).split('\n')).toHaveLength(3);
  });

  it('blanks preprocessor directives', () => {
    expect(maskCode('#include <stdio.h>\nint x;')).not.toContain('<');
  });

  it('handles escaped quotes inside strings', () => {
    const masked = maskCode(String.raw`char *s = "a\"b < c"; int i = 0;`);
    expect(masked).not.toContain('<');
    expect(masked).toContain('int i = 0;');
  });
});

describe('findSites', () => {
  const forLoop = 'int main(){int s=0;for(int i=0;i<n;i++){s=s+i;}return s;}';

  it('off-by-one finds the loop comparison and reports its line', () => {
    const sites = findSites('line1\n' + forLoop, 'off-by-one', 'c');
    expect(sites.length).toBeGreaterThan(0);
    expect(sites[0].line).toBe(2);
    expect(sites.some((s) => s.replacement === '<=')).toBe(true);
  });

  it('does not mutate inside a string literal', () => {
    const sites = findSites('int main(){ printf("i < n"); return 0; }', 'off-by-one', 'c');
    expect(sites).toHaveLength(0);
  });

  it('inverted-condition flips equality and the logical operators', () => {
    const src = 'if (a == b && c != d) {}';
    const families = findSites(src, 'inverted-condition', 'c').map((s) => s.replacement);
    expect(families).toContain('!=');
    expect(families).toContain('==');
    expect(families).toContain('||');
  });

  it('assign-in-condition applies to C but never to Java', () => {
    const src = 'if (x == 1) { y = 2; }';
    expect(findSites(src, 'assign-in-condition', 'c').length).toBeGreaterThan(0);
    // Java rejects `if (x = 1)` at compile time, so it is the wrong bug there.
    expect(findSites(src, 'assign-in-condition', 'java')).toHaveLength(0);
  });

  it('wrong-variable needs two loop indices to have anything to swap', () => {
    const single = 'for(int i=0;i<n;i++){ a[i] = 0; }';
    expect(findSites(single, 'wrong-variable', 'c')).toHaveLength(0);

    const nested = 'for(int i=0;i<n;i++){ for(int j=0;j<m;j++){ a[i] = b[j]; } }';
    const sites = findSites(nested, 'wrong-variable', 'c');
    expect(sites.length).toBeGreaterThan(0);
    expect(['i', 'j']).toContain(sites[0].replacement);
  });

  it('bad-init targets a maximum tracker', () => {
    const sites = findSites('int best = INT_MIN;', 'bad-init', 'c');
    expect(sites).toHaveLength(1);
    expect(sites[0].replacement).toBe('= 0');
  });

  it('applySite produces a different program and preserves the rest verbatim', () => {
    const src = 'int main(){for(int i=0;i<n;i++){}return 0;}';
    const site = findSites(src, 'off-by-one', 'c')[0];
    const mutated = applySite(src, site);
    expect(mutated).not.toBe(src);
    expect(mutated.startsWith('int main(){for(int i=0;')).toBe(true);
    expect(mutated.endsWith('return 0;}')).toBe(true);
  });

  it('every site maps to a real line within the source', () => {
    const src = 'int main(){\n  for(int i=0;i<=n;i++){\n    if(a==b) return 1;\n  }\n  return 0;\n}';
    const lineCount = src.split('\n').length;
    for (const family of ['off-by-one', 'inverted-condition', 'missing-return'] as const) {
      for (const site of findSites(src, family, 'c')) {
        expect(site.line).toBeGreaterThanOrEqual(1);
        expect(site.line).toBeLessThanOrEqual(lineCount);
      }
    }
  });
});
