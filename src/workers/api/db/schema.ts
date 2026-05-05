// src/workers/api/db/schema.ts
// Full Drizzle ORM schema for v2.0 — all 10 tables.
// FTS5 virtual table is NOT defined here (Drizzle-kit cannot manage virtual tables);
// it lives in src/workers/api/db/migrations/0002_fts5.sql, owned by Plan 04.
import {
  sqliteTable, text, integer, primaryKey, index, check
} from 'drizzle-orm/sqlite-core'
import { sql } from 'drizzle-orm'
import { ulid } from 'ulid'

const tsNow = sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`

export const users = sqliteTable('users', {
  id:           text('id').primaryKey().$defaultFn(() => ulid()),
  github_id:    integer('github_id').notNull().unique(),
  github_login: text('github_login').notNull().unique(),
  name:         text('name'),
  avatar_url:   text('avatar_url'),
  role:         text('role', { enum: ['user', 'maintainer'] }).notNull().default('user'),
  created_at:   text('created_at').notNull().default(tsNow),
}, (t) => [
  check('users_role_check', sql`${t.role} IN ('user', 'maintainer')`),
  index('users_github_id_idx').on(t.github_id),
])

export const prompts = sqliteTable('prompts', {
  id:         text('id').primaryKey().$defaultFn(() => ulid()),
  author_id:  text('author_id').notNull().references(() => users.id),
  title:      text('title').notNull(),
  body:       text('body').notNull(),
  category:   text('category'),
  model:      text('model'),
  difficulty: text('difficulty'),
  status:     text('status', { enum: ['published', 'flagged', 'hidden', 'draft'] }).notNull().default('draft'),
  created_at: text('created_at').notNull().default(tsNow),
  updated_at: text('updated_at').notNull().default(tsNow),
}, (t) => [
  check('prompts_status_check', sql`${t.status} IN ('published', 'flagged', 'hidden', 'draft')`),
  index('prompts_author_id_idx').on(t.author_id),
  index('prompts_status_idx').on(t.status),
  index('prompts_created_at_idx').on(t.created_at),
])

export const prompt_tags = sqliteTable('prompt_tags', {
  prompt_id: text('prompt_id').notNull().references(() => prompts.id, { onDelete: 'cascade' }),
  tag:       text('tag').notNull(),
}, (t) => [
  primaryKey({ columns: [t.prompt_id, t.tag] }),
])

export const prompt_versions = sqliteTable('prompt_versions', {
  id:             text('id').primaryKey().$defaultFn(() => ulid()),
  prompt_id:      text('prompt_id').notNull().references(() => prompts.id, { onDelete: 'cascade' }),
  version_number: integer('version_number').notNull(),
  body:           text('body').notNull(),
  changelog:      text('changelog'),
  author_id:      text('author_id').notNull().references(() => users.id),
  created_at:     text('created_at').notNull().default(tsNow),
}, (t) => [
  index('prompt_versions_prompt_id_idx').on(t.prompt_id),
])

export const comments = sqliteTable('comments', {
  id:         text('id').primaryKey().$defaultFn(() => ulid()),
  prompt_id:  text('prompt_id').notNull().references(() => prompts.id, { onDelete: 'cascade' }),
  author_id:  text('author_id').notNull().references(() => users.id),
  body:       text('body').notNull(),
  created_at: text('created_at').notNull().default(tsNow),
  deleted_at: text('deleted_at'),
}, (t) => [
  index('comments_prompt_id_idx').on(t.prompt_id),
])

export const reactions = sqliteTable('reactions', {
  prompt_id:  text('prompt_id').notNull().references(() => prompts.id, { onDelete: 'cascade' }),
  user_id:    text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  emoji:      text('emoji', { enum: ['thumbs_up', 'heart', 'rocket'] }).notNull(),
  created_at: text('created_at').notNull().default(tsNow),
}, (t) => [
  primaryKey({ columns: [t.prompt_id, t.user_id, t.emoji] }),
  check('reactions_emoji_check', sql`${t.emoji} IN ('thumbs_up', 'heart', 'rocket')`),
])

export const bookmarks = sqliteTable('bookmarks', {
  user_id:    text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  prompt_id:  text('prompt_id').notNull().references(() => prompts.id, { onDelete: 'cascade' }),
  created_at: text('created_at').notNull().default(tsNow),
}, (t) => [
  primaryKey({ columns: [t.user_id, t.prompt_id] }),
])

export const moderation_log = sqliteTable('moderation_log', {
  id:         text('id').primaryKey().$defaultFn(() => ulid()),
  prompt_id:  text('prompt_id').notNull().references(() => prompts.id),
  actor_id:   text('actor_id').notNull().references(() => users.id),
  action:     text('action').notNull(),
  reason:     text('reason'),
  created_at: text('created_at').notNull().default(tsNow),
})

export const labels = sqliteTable('labels', {
  id:          text('id').primaryKey().$defaultFn(() => ulid()),
  prefix:      text('prefix').notNull(),
  value:       text('value').notNull(),
  color:       text('color'),
  description: text('description'),
}, (t) => [
  index('labels_prefix_idx').on(t.prefix),
])

export const notifications = sqliteTable('notifications', {
  id:         text('id').primaryKey().$defaultFn(() => ulid()),
  user_id:    text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  type:       text('type').notNull(),
  prompt_id:  text('prompt_id').references(() => prompts.id),
  comment_id: text('comment_id').references(() => comments.id),
  read_at:    text('read_at'),
  created_at: text('created_at').notNull().default(tsNow),
}, (t) => [
  index('notifications_user_id_idx').on(t.user_id),
])
