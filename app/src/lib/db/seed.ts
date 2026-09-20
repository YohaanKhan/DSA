import { createHash } from 'node:crypto';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { eq } from 'drizzle-orm';
import { join } from 'node:path';
import { formatViolations, loadContent } from '../content/loader';
import { items as itemsTable } from './schema';
import { dbFileName } from './path';

const dbPath = join(process.cwd(), 'data', dbFileName());
const sqlite = new Database(dbPath);
sqlite.pragma('foreign_keys = ON');
const db = drizzle(sqlite);

const { items, violations } = loadContent();

if (violations.length > 0) {
  console.error(`Refusing to seed: ${violations.length} violation(s).\n`);
  console.error(formatViolations(violations));
  process.exit(1);
}

let added = 0;
let updated = 0;
let unchanged = 0;

for (const item of items) {
  const payload = JSON.stringify(item);
  const contentHash = createHash('sha256').update(payload).digest('hex');

  const existing = db.select().from(itemsTable).where(eq(itemsTable.id, item.id)).get();

  const row = {
    id: item.id,
    kind: item.kind,
    stage: item.stage,
    topic: item.topic,
    subtopic: item.subtopic ?? null,
    difficulty: item.difficulty,
    priority: item.priority,
    targetSeconds: item.targetSeconds,
    payload: item,
    contentHash,
  };

  if (!existing) {
    db.insert(itemsTable).values(row).run();
    added++;
  } else if (existing.contentHash !== contentHash) {
    // Update in place. Attempt history survives, because attempts.item_id is a
    // plain text reference — a content edit never destroys your history.
    db.update(itemsTable).set(row).where(eq(itemsTable.id, item.id)).run();
    updated++;
  } else {
    unchanged++;
  }
}

console.log(`Seeded: ${added} added, ${updated} updated, ${unchanged} unchanged.`);
sqlite.close();
