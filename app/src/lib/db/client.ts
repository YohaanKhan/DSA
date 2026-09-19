import 'server-only';

import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import * as schema from './schema';
import { dbFileName } from './path';

// Statically scoped to data/ on purpose: a fully dynamic path makes Turbopack
// trace the entire project into the server bundle, and lets the database escape
// to an arbitrary location.
// The literal 'data' segment is what lets Turbopack scope the trace to that
// folder instead of pulling the whole project into the server bundle.
const dbPath = join(process.cwd(), 'data', dbFileName());
const dir = dirname(dbPath);
if (!existsSync(dir)) mkdirSync(dir, { recursive: true });

/**
 * Next dev reloads modules on every edit; without this the process would open a
 * new SQLite handle each time and eventually exhaust file descriptors.
 */
const globalForDb = globalThis as unknown as { __excellerSqlite?: Database.Database };

const sqlite = globalForDb.__excellerSqlite ?? new Database(dbPath);
if (!globalForDb.__excellerSqlite) {
  sqlite.pragma('journal_mode = WAL');
  sqlite.pragma('foreign_keys = ON');
  globalForDb.__excellerSqlite = sqlite;
}

export const db = drizzle(sqlite, { schema });
export { sqlite, dbPath };
