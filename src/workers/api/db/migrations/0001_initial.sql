-- Initial schema migration for prompt-community v2.0
-- Generated from src/workers/api/db/schema.ts
-- Phase 09-backend-foundation Plan 04

CREATE TABLE IF NOT EXISTS `users` (
  `id` text PRIMARY KEY NOT NULL,
  `github_id` integer NOT NULL UNIQUE,
  `github_login` text NOT NULL UNIQUE,
  `name` text,
  `avatar_url` text,
  `role` text DEFAULT 'user' NOT NULL,
  `created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  CHECK(`role` IN ('user', 'maintainer'))
);

CREATE INDEX IF NOT EXISTS `users_github_id_idx` ON `users` (`github_id`);

CREATE TABLE IF NOT EXISTS `prompts` (
  `id` text PRIMARY KEY NOT NULL,
  `author_id` text NOT NULL REFERENCES `users`(`id`),
  `title` text NOT NULL,
  `body` text NOT NULL,
  `category` text,
  `model` text,
  `difficulty` text,
  `status` text DEFAULT 'draft' NOT NULL,
  `created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  `updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  CHECK(`status` IN ('published', 'flagged', 'hidden', 'draft'))
);

CREATE INDEX IF NOT EXISTS `prompts_author_id_idx` ON `prompts` (`author_id`);
CREATE INDEX IF NOT EXISTS `prompts_status_idx` ON `prompts` (`status`);
CREATE INDEX IF NOT EXISTS `prompts_created_at_idx` ON `prompts` (`created_at`);

CREATE TABLE IF NOT EXISTS `prompt_tags` (
  `prompt_id` text NOT NULL REFERENCES `prompts`(`id`) ON DELETE CASCADE,
  `tag` text NOT NULL,
  PRIMARY KEY (`prompt_id`, `tag`)
);

CREATE TABLE IF NOT EXISTS `prompt_versions` (
  `id` text PRIMARY KEY NOT NULL,
  `prompt_id` text NOT NULL REFERENCES `prompts`(`id`) ON DELETE CASCADE,
  `version_number` integer NOT NULL,
  `body` text NOT NULL,
  `changelog` text,
  `author_id` text NOT NULL REFERENCES `users`(`id`),
  `created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL
);

CREATE INDEX IF NOT EXISTS `prompt_versions_prompt_id_idx` ON `prompt_versions` (`prompt_id`);

CREATE TABLE IF NOT EXISTS `comments` (
  `id` text PRIMARY KEY NOT NULL,
  `prompt_id` text NOT NULL REFERENCES `prompts`(`id`) ON DELETE CASCADE,
  `author_id` text NOT NULL REFERENCES `users`(`id`),
  `body` text NOT NULL,
  `created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  `deleted_at` text
);

CREATE INDEX IF NOT EXISTS `comments_prompt_id_idx` ON `comments` (`prompt_id`);

CREATE TABLE IF NOT EXISTS `reactions` (
  `prompt_id` text NOT NULL REFERENCES `prompts`(`id`) ON DELETE CASCADE,
  `user_id` text NOT NULL REFERENCES `users`(`id`) ON DELETE CASCADE,
  `emoji` text NOT NULL,
  `created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  PRIMARY KEY (`prompt_id`, `user_id`, `emoji`),
  CHECK(`emoji` IN ('thumbs_up', 'heart', 'rocket'))
);

CREATE TABLE IF NOT EXISTS `bookmarks` (
  `user_id` text NOT NULL REFERENCES `users`(`id`) ON DELETE CASCADE,
  `prompt_id` text NOT NULL REFERENCES `prompts`(`id`) ON DELETE CASCADE,
  `created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  PRIMARY KEY (`user_id`, `prompt_id`)
);

CREATE TABLE IF NOT EXISTS `moderation_log` (
  `id` text PRIMARY KEY NOT NULL,
  `prompt_id` text NOT NULL REFERENCES `prompts`(`id`),
  `actor_id` text NOT NULL REFERENCES `users`(`id`),
  `action` text NOT NULL,
  `reason` text,
  `created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL
);

CREATE TABLE IF NOT EXISTS `labels` (
  `id` text PRIMARY KEY NOT NULL,
  `prefix` text NOT NULL,
  `value` text NOT NULL,
  `color` text,
  `description` text
);

CREATE INDEX IF NOT EXISTS `labels_prefix_idx` ON `labels` (`prefix`);

CREATE TABLE IF NOT EXISTS `notifications` (
  `id` text PRIMARY KEY NOT NULL,
  `user_id` text NOT NULL REFERENCES `users`(`id`) ON DELETE CASCADE,
  `type` text NOT NULL,
  `prompt_id` text REFERENCES `prompts`(`id`),
  `comment_id` text REFERENCES `comments`(`id`),
  `read_at` text,
  `created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL
);

CREATE INDEX IF NOT EXISTS `notifications_user_id_idx` ON `notifications` (`user_id`);
