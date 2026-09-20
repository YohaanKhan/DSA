/**
 * Masks string literals, char literals and comments with spaces, preserving
 * length and offsets. Mutators match against the mask and edit the original, so
 * a `<` inside "a < b" or a `//` comment is never mutated.
 */
export function maskCode(source: string): string {
  const out = source.split('');
  let i = 0;
  const n = source.length;
  const blank = (from: number, to: number) => {
    for (let k = from; k < to && k < n; k++) if (out[k] !== '\n') out[k] = ' ';
  };

  while (i < n) {
    const c = source[i];
    const next = source[i + 1];

    if (c === '/' && next === '/') {
      let j = i + 2;
      while (j < n && source[j] !== '\n') j++;
      blank(i, j);
      i = j;
      continue;
    }
    if (c === '/' && next === '*') {
      let j = i + 2;
      while (j < n && !(source[j] === '*' && source[j + 1] === '/')) j++;
      blank(i, Math.min(j + 2, n));
      i = j + 2;
      continue;
    }
    if (c === '"' || c === "'") {
      const quote = c;
      let j = i + 1;
      while (j < n && source[j] !== quote) {
        if (source[j] === '\\') j++;
        j++;
      }
      blank(i, Math.min(j + 1, n));
      i = j + 1;
      continue;
    }
    // Preprocessor directives: mutating an #include or #define is never the
    // bug family we asked for.
    if (c === '#' && (i === 0 || source[i - 1] === '\n')) {
      let j = i;
      while (j < n && source[j] !== '\n') j++;
      blank(i, j);
      i = j;
      continue;
    }
    i++;
  }
  return out.join('');
}

/** 1-based line number for a character offset. */
export function lineOf(source: string, offset: number): number {
  let line = 1;
  for (let i = 0; i < offset && i < source.length; i++) if (source[i] === '\n') line++;
  return line;
}
