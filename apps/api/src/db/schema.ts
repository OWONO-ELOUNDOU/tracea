import type { BuildingModel } from "@tracea/domain";
import { sql } from "drizzle-orm";
import {
  type AnyPgColumn,
  check,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export const userPlan = pgEnum("user_plan", ["free", "pro", "admin"]);
export const emailTokenPurpose = pgEnum("email_token_purpose", ["verify_email", "reset_password"]);
export const versionOrigin = pgEnum("version_origin", ["generated", "edited", "restored"]);

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    email: text("email").notNull(),
    passwordHash: text("password_hash").notNull(),
    displayName: text("display_name"),
    plan: userPlan("plan").notNull().default("free"),
    emailVerifiedAt: timestamp("email_verified_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => [uniqueIndex("users_email_lower_idx").on(sql`lower(${table.email})`)],
);

export const sessions = pgTable(
  "sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    ip: text("ip"),
    userAgent: text("user_agent"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("sessions_user_id_idx").on(table.userId)],
);

/** Single-use tokens sent by e-mail; only the SHA-256 of the token is stored. */
export const emailTokens = pgTable(
  "email_tokens",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    purpose: emailTokenPurpose("purpose").notNull(),
    tokenHash: text("token_hash").notNull().unique(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    usedAt: timestamp("used_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("email_tokens_user_purpose_idx").on(table.userId, table.purpose)],
);

export const auditLog = pgTable(
  "audit_log",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    actorId: uuid("actor_id").references(() => users.id, { onDelete: "set null" }),
    action: text("action").notNull(),
    targetType: text("target_type"),
    targetId: text("target_id"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("audit_log_actor_created_idx").on(table.actorId, table.createdAt)],
);

export const projects = pgTable(
  "projects",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ownerId: uuid("owner_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    descriptionText: text("description_text"),
    parameters: jsonb("parameters").$type<Record<string, unknown>>(),
    site: jsonb("site").$type<Record<string, unknown>>(),
    currentVersionId: uuid("current_version_id").references((): AnyPgColumn => versions.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    // Millisecond precision: the list cursor carries this value through a JavaScript Date,
    // which would truncate PostgreSQL's default microseconds and skip or repeat rows.
    updatedAt: timestamp("updated_at", { withTimezone: true, precision: 3 }).notNull().defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => [
    index("projects_owner_updated_idx")
      .on(table.ownerId, table.updatedAt, table.id)
      .where(sql`${table.deletedAt} is null`),
    index("projects_deleted_at_idx").on(table.deletedAt),
  ],
);

/** Immutable snapshot of a project; `model` holds a BuildingModel as defined by @tracea/domain. */
export const versions = pgTable(
  "versions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    number: integer("number").notNull(),
    model: jsonb("model").$type<BuildingModel>().notNull(),
    modelSchemaVersion: text("model_schema_version").notNull(),
    origin: versionOrigin("origin").notNull(),
    seed: integer("seed"),
    warnings: jsonb("warnings")
      .$type<unknown[]>()
      .notNull()
      .default(sql`'[]'::jsonb`),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    unique("versions_project_number_unique").on(table.projectId, table.number),
    check("versions_number_positive", sql`${table.number} >= 1`),
  ],
);

export type User = typeof users.$inferSelect;
export type Session = typeof sessions.$inferSelect;
export type EmailToken = typeof emailTokens.$inferSelect;
export type Project = typeof projects.$inferSelect;
export type Version = typeof versions.$inferSelect;
