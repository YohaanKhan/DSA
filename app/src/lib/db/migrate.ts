import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { existsSync, mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { dbFileName } from './path';

const dir = join(process.cwd(), 'data');
if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
const dbPath = join(dir, dbFileName());

const sqlite = new Database(dbPath);
sqlite.pragma('journal_mode = WAL');
sqlite.pragma('foreign_keys = ON');

migrate(drizzle(sqlite), { migrationsFolder: resolve(process.cwd(), 'drizzle') });
sqlite.close();

console.log(`Migrated ${dbPath}`);
