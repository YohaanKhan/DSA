import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import type { ContentItem } from './schemas';
import { validateItems, type Violation } from './validate';

const CONTENT_ROOT = resolve(process.cwd(), 'content');

function walk(dir: string): string[] {
  const out: string[] = [];
  let entries: string[];
  try {
    entries = readdirSync(dir);
  } catch {
    return out;
  }
  for (const entry of entries) {
    if (entry.startsWith('.')) continue; // skips .rejected/
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...walk(full));
    else if (entry.endsWith('.json') && entry !== 'topics.json') out.push(full);
  }
  return out;
}

export interface LoadResult {
  items: ContentItem[];
  violations: Violation[];
  files: string[];
}

/**
 * Reads every content bank, validates the lot together, and reports ALL
 * failures rather than throwing on the first — a half-reported bank is a
 * debugging trap.
 */
export function loadContent(root: string = CONTENT_ROOT): LoadResult {
  const files = walk(root);
  const raw: { item: unknown; file: string }[] = [];
  const violations: Violation[] = [];

  for (const file of files) {
    const rel = relative(process.cwd(), file);
    let parsed: unknown;
    try {
      parsed = JSON.parse(readFileSync(file, 'utf8'));
    } catch (err) {
      violations.push({
        rule: 'V0',
        itemId: '<file>',
        file: rel,
        message: `not valid JSON: ${(err as Error).message}`,
      });
      continue;
    }
    if (!Array.isArray(parsed)) {
      violations.push({ rule: 'V0', itemId: '<file>', file: rel, message: 'a content bank must be a JSON array of items' });
      continue;
    }
    for (const item of parsed) raw.push({ item, file: rel });
  }

  const result = validateItems(raw);
  return {
    items: result.items,
    violations: [...violations, ...result.violations],
    files: files.map((f) => relative(process.cwd(), f)),
  };
}

export function formatViolations(violations: Violation[]): string {
  return violations
    .map((v) => `  [${v.rule}] ${v.file ? `${v.file} ` : ''}${v.itemId}: ${v.message}`)
    .join('\n');
}
