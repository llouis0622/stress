import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
export const loginLimits = sqliteTable('login_limits', {
  key: text('key').primaryKey(), count: integer('count').notNull().default(0), resetAt: integer('reset_at').notNull(),
});
