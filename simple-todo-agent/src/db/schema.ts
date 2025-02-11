import { pgTable, varchar, timestamp, integer } from "drizzle-orm/pg-core";

export const todos = pgTable("todos", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  title: varchar("title", { length: 255 }).notNull(),
  description: varchar("description", { length: 1000 }),
  // created_at: timestamp().defaultNow().notNull(),
});
