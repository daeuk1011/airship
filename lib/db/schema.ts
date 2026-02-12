import { sqliteTable, text, integer, real, uniqueIndex, index } from "drizzle-orm/sqlite-core";

export const apps = sqliteTable("apps", {
  id: text("id").primaryKey(),
  appKey: text("app_key").notNull().unique(),
  name: text("name").notNull(),
  createdAt: integer("created_at").notNull(),
});

export const channels = sqliteTable(
  "channels",
  {
    id: text("id").primaryKey(),
    appId: text("app_id")
      .notNull()
      .references(() => apps.id),
    name: text("name").notNull(),
    createdAt: integer("created_at").notNull(),
  },
  (table) => [
    uniqueIndex("channels_app_id_name_unique").on(table.appId, table.name),
  ]
);

export const updates = sqliteTable(
  "updates",
  {
    id: text("id").primaryKey(),
    appId: text("app_id")
      .notNull()
      .references(() => apps.id),
    updateGroupId: text("update_group_id").notNull(),
    runtimeVersion: text("runtime_version").notNull(),
    platform: text("platform").notNull(),
    bundleS3Key: text("bundle_s3_key").notNull(),
    bundleHash: text("bundle_hash").notNull(),
    bundleSize: integer("bundle_size"),
    enabled: integer("enabled").notNull().default(1),
    createdAt: integer("created_at").notNull(),
  },
  (table) => [
    index("updates_app_rv_platform_created").on(
      table.appId,
      table.runtimeVersion,
      table.platform,
      table.createdAt
    ),
    index("updates_update_group_id").on(table.updateGroupId),
  ]
);

export const assets = sqliteTable("assets", {
  id: text("id").primaryKey(),
  updateId: text("update_id")
    .notNull()
    .references(() => updates.id),
  s3Key: text("s3_key").notNull(),
  hash: text("hash").notNull(),
  key: text("key").notNull(),
  fileExtension: text("file_extension").notNull(),
  contentType: text("content_type"),
  size: integer("size"),
});

export const channelAssignments = sqliteTable(
  "channel_assignments",
  {
    id: text("id").primaryKey(),
    appId: text("app_id")
      .notNull()
      .references(() => apps.id),
    channelId: text("channel_id")
      .notNull()
      .references(() => channels.id),
    updateId: text("update_id")
      .notNull()
      .references(() => updates.id),
    runtimeVersion: text("runtime_version").notNull(),
    rolloutPercent: real("rollout_percent").notNull().default(100),
    updatedAt: integer("updated_at").notNull(),
  },
  (table) => [
    uniqueIndex("ca_app_channel_rv_unique").on(
      table.appId,
      table.channelId,
      table.runtimeVersion
    ),
  ]
);

export const rollbackHistory = sqliteTable("rollback_history", {
  id: text("id").primaryKey(),
  appId: text("app_id")
    .notNull()
    .references(() => apps.id),
  channelId: text("channel_id")
    .notNull()
    .references(() => channels.id),
  fromUpdateId: text("from_update_id")
    .notNull()
    .references(() => updates.id),
  toUpdateId: text("to_update_id")
    .notNull()
    .references(() => updates.id),
  reason: text("reason"),
  createdAt: integer("created_at").notNull(),
});
