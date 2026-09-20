CREATE TABLE `attempts` (
	`id` text PRIMARY KEY NOT NULL,
	`session_id` text NOT NULL,
	`item_id` text NOT NULL,
	`stage` text NOT NULL,
	`topic` text NOT NULL,
	`response` text,
	`correct` integer,
	`partial_score` real,
	`confidence` text,
	`time_ms` integer NOT NULL,
	`hints_used` integer DEFAULT 0,
	`flagged` integer DEFAULT false,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`session_id`) REFERENCES `sessions`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_attempts_stage_created` ON `attempts` (`stage`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_attempts_topic_created` ON `attempts` (`topic`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_attempts_item` ON `attempts` (`item_id`);--> statement-breakpoint
CREATE TABLE `content_issues` (
	`id` text PRIMARY KEY NOT NULL,
	`item_id` text NOT NULL,
	`reason` text NOT NULL,
	`resolved` integer DEFAULT false NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `game_runs` (
	`id` text PRIMARY KEY NOT NULL,
	`game` text NOT NULL,
	`max_level` integer NOT NULL,
	`score` real NOT NULL,
	`duration_ms` integer NOT NULL,
	`level_timings` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `items` (
	`id` text PRIMARY KEY NOT NULL,
	`kind` text NOT NULL,
	`stage` text NOT NULL,
	`topic` text NOT NULL,
	`subtopic` text,
	`difficulty` text NOT NULL,
	`priority` text NOT NULL,
	`target_seconds` integer NOT NULL,
	`payload` text NOT NULL,
	`content_hash` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_items_stage_topic_diff` ON `items` (`stage`,`topic`,`difficulty`);--> statement-breakpoint
CREATE TABLE `llm_cache` (
	`key` text PRIMARY KEY NOT NULL,
	`response` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `llm_calls` (
	`id` text PRIMARY KEY NOT NULL,
	`purpose` text NOT NULL,
	`model` text NOT NULL,
	`input_tokens` integer NOT NULL,
	`output_tokens` integer NOT NULL,
	`cost_usd` real NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `readiness_snapshots` (
	`id` text PRIMARY KEY NOT NULL,
	`stage` text NOT NULL,
	`readiness` real NOT NULL,
	`accuracy` real NOT NULL,
	`speed_factor` real NOT NULL,
	`coverage` real NOT NULL,
	`consistency` real NOT NULL,
	`computed_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `review_cards` (
	`item_id` text PRIMARY KEY NOT NULL,
	`ease_factor` real DEFAULT 2.5 NOT NULL,
	`interval_days` integer DEFAULT 0 NOT NULL,
	`repetitions` integer DEFAULT 0 NOT NULL,
	`due_at` integer NOT NULL,
	`lapses` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_review_due` ON `review_cards` (`due_at`);--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`mode` text NOT NULL,
	`stage` text,
	`profile` text,
	`config` text NOT NULL,
	`started_at` integer NOT NULL,
	`finished_at` integer,
	`score` real,
	`max_score` real,
	`meta` text
);
--> statement-breakpoint
CREATE TABLE `submissions` (
	`id` text PRIMARY KEY NOT NULL,
	`session_id` text NOT NULL,
	`item_id` text NOT NULL,
	`kind` text NOT NULL,
	`artifacts` text NOT NULL,
	`score` real,
	`created_at` integer NOT NULL
);
