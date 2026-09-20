import { sql } from 'drizzle-orm';
import { index, integer, real, sqliteTable, text } from 'drizzle-orm/sqlite-core';

/**
 * The full schema from plan/06-DATA-MODEL.md. Deliberately NOT trimmed to what
 * Phase 00 needs — the whole thing is cheap now and expensive to retrofit later.
 */

/** Content mirror, seeded from content/*.json. Re-seedable and idempotent. */
export const items = sqliteTable(
  'items',
  {
    id: text('id').primaryKey(),
    kind: text('kind').notNull(),
    stage: text('stage').notNull(),
    topic: text('topic').notNull(),
    subtopic: text('subtopic'),
    difficulty: text('difficulty').notNull(),
    priority: text('priority').notNull(),
    targetSeconds: integer('target_seconds').notNull(),
    payload: text('payload', { mode: 'json' }).notNull(),
    contentHash: text('content_hash').notNull(),
  },
  (t) => [index('idx_items_stage_topic_diff').on(t.stage, t.topic, t.difficulty)],
);

/** A practice or mock session. */
export const sessions = sqliteTable('sessions', {
  id: text('id').primaryKey(),
  mode: text('mode').notNull(), // drill | mock | review | game | comm
  stage: text('stage'),
  profile: text('profile'),
  config: text('config', { mode: 'json' }).notNull(),
  startedAt: integer('started_at', { mode: 'timestamp' }).notNull(),
  finishedAt: integer('finished_at', { mode: 'timestamp' }),
  score: real('score'),
  maxScore: real('max_score'),
  meta: text('meta', { mode: 'json' }),
});

/** One row per question answered. */
export const attempts = sqliteTable(
  'attempts',
  {
    id: text('id').primaryKey(),
    sessionId: text('session_id').notNull().references(() => sessions.id),
    itemId: text('item_id').notNull(),
    stage: text('stage').notNull(),
    topic: text('topic').notNull(),
    response: text('response', { mode: 'json' }),
    correct: integer('correct', { mode: 'boolean' }),
    partialScore: real('partial_score'),
    confidence: text('confidence'), // high | low | null
    timeMs: integer('time_ms').notNull(),
    hintsUsed: integer('hints_used').default(0),
    flagged: integer('flagged', { mode: 'boolean' }).default(false),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  },
  (t) => [
    index('idx_attempts_stage_created').on(t.stage, t.createdAt),
    index('idx_attempts_topic_created').on(t.topic, t.createdAt),
    index('idx_attempts_item').on(t.itemId),
  ],
);

/** SM-2 spaced repetition state. */
export const reviewCards = sqliteTable(
  'review_cards',
  {
    itemId: text('item_id').primaryKey(),
    easeFactor: real('ease_factor').notNull().default(2.5),
    intervalDays: integer('interval_days').notNull().default(0),
    repetitions: integer('repetitions').notNull().default(0),
    dueAt: integer('due_at', { mode: 'timestamp' }).notNull(),
    lapses: integer('lapses').notNull().default(0),
  },
  (t) => [index('idx_review_due').on(t.dueAt)],
);

/** Debugging and AI-assisted submissions, kept for interview prep. */
export const submissions = sqliteTable('submissions', {
  id: text('id').primaryKey(),
  sessionId: text('session_id').notNull(),
  itemId: text('item_id').notNull(),
  kind: text('kind').notNull(), // debug | aic
  artifacts: text('artifacts', { mode: 'json' }).notNull(),
  score: real('score'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});

/** Cognitive game results. */
export const gameRuns = sqliteTable('game_runs', {
  id: text('id').primaryKey(),
  game: text('game').notNull(),
  maxLevel: integer('max_level').notNull(),
  score: real('score').notNull(),
  durationMs: integer('duration_ms').notNull(),
  levelTimings: text('level_timings', { mode: 'json' }).notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});

/** Derived readiness, recomputed on demand. Retained so trends exist. */
export const readinessSnapshots = sqliteTable('readiness_snapshots', {
  id: text('id').primaryKey(),
  stage: text('stage').notNull(),
  readiness: real('readiness').notNull(),
  accuracy: real('accuracy').notNull(),
  speedFactor: real('speed_factor').notNull(),
  coverage: real('coverage').notNull(),
  consistency: real('consistency').notNull(),
  computedAt: integer('computed_at', { mode: 'timestamp' }).notNull(),
});

/** LLM cost metering — the daily cap is enforced against this. */
export const llmCalls = sqliteTable('llm_calls', {
  id: text('id').primaryKey(),
  purpose: text('purpose').notNull(),
  model: text('model').notNull(),
  inputTokens: integer('input_tokens').notNull(),
  outputTokens: integer('output_tokens').notNull(),
  costUsd: real('cost_usd').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});

/** Response cache so re-running identical scoring during development is free. */
export const llmCache = sqliteTable('llm_cache', {
  key: text('key').primaryKey(),
  response: text('response').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
});

/** Items you flagged as wrong or ambiguous; excluded from selection until reviewed. */
export const contentIssues = sqliteTable('content_issues', {
  id: text('id').primaryKey(),
  itemId: text('item_id').notNull(),
  reason: text('reason').notNull(),
  resolved: integer('resolved', { mode: 'boolean' }).notNull().default(false),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});
