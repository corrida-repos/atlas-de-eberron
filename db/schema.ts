import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const atlas = sqliteTable("atlas", {
  id: integer("id").primaryKey(),
  revision: integer("revision").notNull(),
  chronologyVersion: integer("chronology_version").notNull().default(0),
  events: text("events").notNull(),
});

export const slots = sqliteTable("atlas_slots", {
  role: text("role").primaryKey(),
  userId: text("user_id").unique(),
  inviteHash: text("invite_hash").unique(),
  expiresAt: integer("expires_at"),
});
