/**
 * A small C-family tokenizer for syntax highlighting.
 *
 * Deliberately not Monaco: that is ~5 MB, loads from a CDN by default (so it
 * breaks the offline requirement), and would need fighting to match the design
 * system. This covers C, C++ and Java well enough to read unfamiliar code,
 * which is the only thing the debugging round needs.
 */

export type TokenKind = 'keyword' | 'type' | 'string' | 'comment' | 'number' | 'punct' | 'plain';

export interface Token {
  kind: TokenKind;
  text: string;
}

const KEYWORDS = new Set([
  'if', 'else', 'for', 'while', 'do', 'switch', 'case', 'default', 'break', 'continue',
  'return', 'goto', 'new', 'delete', 'try', 'catch', 'finally', 'throw', 'throws',
  'class', 'struct', 'union', 'enum', 'public', 'private', 'protected', 'static',
  'final', 'const', 'extends', 'implements', 'interface', 'package', 'import',
  'include', 'namespace', 'using', 'template', 'typename', 'virtual', 'override',
  'sizeof', 'typedef', 'this', 'super', 'null', 'nullptr', 'true', 'false', 'NULL',
]);

const TYPES = new Set([
  'int', 'long', 'short', 'char', 'float', 'double', 'void', 'bool', 'boolean',
  'unsigned', 'signed', 'size_t', 'String', 'StringBuilder', 'Scanner', 'auto',
  'string', 'vector', 'map', 'set', 'Integer', 'Double', 'Boolean', 'Character',
]);

export function tokenize(source: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  const n = source.length;
  let plain = '';

  const flush = () => {
    if (plain) { tokens.push({ kind: 'plain', text: plain }); plain = ''; }
  };
  const push = (kind: TokenKind, text: string) => { flush(); tokens.push({ kind, text }); };

  while (i < n) {
    const c = source[i];
    const next = source[i + 1];

    if (c === '/' && next === '/') {
      let j = i + 2;
      while (j < n && source[j] !== '\n') j++;
      push('comment', source.slice(i, j));
      i = j;
      continue;
    }
    if (c === '/' && next === '*') {
      let j = i + 2;
      while (j < n && !(source[j] === '*' && source[j + 1] === '/')) j++;
      push('comment', source.slice(i, Math.min(j + 2, n)));
      i = j + 2;
      continue;
    }
    if (c === '"' || c === "'") {
      let j = i + 1;
      while (j < n && source[j] !== c) { if (source[j] === '\\') j++; j++; }
      push('string', source.slice(i, Math.min(j + 1, n)));
      i = j + 1;
      continue;
    }
    if (c === '#' && (i === 0 || source[i - 1] === '\n')) {
      let j = i;
      while (j < n && source[j] !== '\n') j++;
      push('keyword', source.slice(i, j));
      i = j;
      continue;
    }
    if (/[0-9]/.test(c) && !/[A-Za-z_]/.test(source[i - 1] ?? '')) {
      let j = i;
      while (j < n && /[0-9a-fA-FxX._]/.test(source[j])) j++;
      push('number', source.slice(i, j));
      i = j;
      continue;
    }
    if (/[A-Za-z_]/.test(c)) {
      let j = i;
      while (j < n && /[A-Za-z0-9_]/.test(source[j])) j++;
      const word = source.slice(i, j);
      if (KEYWORDS.has(word)) push('keyword', word);
      else if (TYPES.has(word)) push('type', word);
      else plain += word;
      i = j;
      continue;
    }
    if (/[{}()[\];,<>=!+\-*/%&|^~?:.]/.test(c)) {
      push('punct', c);
      i++;
      continue;
    }
    plain += c;
    i++;
  }
  flush();
  return tokens;
}

/** Tokens grouped per line, so each line can be rendered and numbered. */
export function tokenizeLines(source: string): Token[][] {
  const lines: Token[][] = [[]];
  for (const token of tokenize(source)) {
    const parts = token.text.split('\n');
    parts.forEach((part, index) => {
      if (index > 0) lines.push([]);
      if (part) lines[lines.length - 1].push({ kind: token.kind, text: part });
    });
  }
  return lines;
}
