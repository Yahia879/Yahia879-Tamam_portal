import { boolean, customType, date, index, int, longtext, mysqlEnum, mysqlTable, text, timestamp, unique, varchar } from "drizzle-orm/mysql-core";
import { seasonalRequestStatuses, type SeasonalExecution, type SeasonalMosqueSnapshot, type SeasonalQuantities, type SeasonalSettings } from "../shared/mawasim";
import { mosques, users } from "./schema";

// MariaDB exposes JSON columns as text, while MySQL can return decoded values.
function seasonalJson<T>(name: string) {
  return customType<{ data: T; driverData: unknown }>({
    dataType: () => "json",
    toDriver: value => JSON.stringify(value),
    fromDriver: value => (typeof value === "string" ? JSON.parse(value) : value) as T,
  })(name);
}

export const mawasimSeasons = mysqlTable("mawasim_seasons", {
  id: int("id").autoincrement().primaryKey(),
  hijriYear: int("hijriYear").notNull(),
  title: varchar("title", { length: 160 }).notNull(),
  isOpen: boolean("isOpen").notNull().default(false),
  settings: seasonalJson<SeasonalSettings>("settings").notNull(),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
});

export const mawasimRequests = mysqlTable("mawasim_requests", {
  id: int("id").autoincrement().primaryKey(),
  seasonId: int("seasonId").notNull().references(() => mawasimSeasons.id),
  mosqueId: int("mosqueId").references(() => mosques.id, { onDelete: "set null" }),
  applicantId: int("applicantId").references(() => users.id, { onDelete: "set null" }),
  submittedBy: int("submittedBy").references(() => users.id, { onDelete: "set null" }),
  mosqueName: varchar("mosqueName", { length: 255 }).notNull(),
  snapshot: seasonalJson<SeasonalMosqueSnapshot>("snapshot").notNull(),
  contact: seasonalJson<{ name: string; phone: string; email?: string | null; reason?: string }>("contact").notNull(),
  menPhoto: longtext("menPhoto"),
  womenPhoto: longtext("womenPhoto"),
  requested: seasonalJson<SeasonalQuantities>("requested").notNull(),
  specialRequest: text("specialRequest"),
  status: mysqlEnum("status", seasonalRequestStatuses).notNull().default("submitted"),
  approved: seasonalJson<SeasonalQuantities>("approved"),
  reviewNote: text("reviewNote"),
  reviewedBy: int("reviewedBy").references(() => users.id, { onDelete: "set null" }),
  scheduledFor: date("scheduledFor", { mode: "string" }),
  assignedTo: int("assignedTo").references(() => users.id, { onDelete: "set null" }),
  execution: seasonalJson<SeasonalExecution>("execution"),
  executedBy: int("executedBy").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
}, table => [
  index("mawasim_season_mosque_idx").on(table.seasonId, table.mosqueId),
  index("mawasim_assigned").on(table.assignedTo, table.seasonId),
]);

export const mawasimExceptions = mysqlTable("mawasim_exceptions", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  activeRequestId: int("activeRequestId").references(() => mawasimRequests.id, { onDelete: "set null" }),
  consumedByRequestId: int("consumedByRequestId").references(() => mawasimRequests.id, { onDelete: "set null" }),
  reason: text("reason").notNull(),
  attachment: varchar("attachment", { length: 500 }),
  status: mysqlEnum("status", ["pending", "approved", "rejected"]).default("pending").notNull(),
  reviewedBy: int("reviewedBy").references(() => users.id, { onDelete: "set null" }),
  reviewedAt: timestamp("reviewedAt"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow().onUpdateNow(),
}, table => [
  index("mawasim_exception_user").on(table.userId, table.status),
]);

export const mawasimGrants = mysqlTable("mawasim_grants", {
  id: int("id").autoincrement().primaryKey(),
  seasonId: int("seasonId").notNull().references(() => mawasimSeasons.id),
  mosqueId: int("mosqueId").notNull().references(() => mosques.id, { onDelete: "cascade" }),
  userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  grantedBy: int("grantedBy").references(() => users.id, { onDelete: "set null" }),
  reason: varchar("reason", { length: 500 }).notNull(),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
}, table => [
  unique("mawasim_grant_scope").on(table.seasonId, table.mosqueId, table.userId),
  index("mawasim_grant_user").on(table.userId, table.seasonId),
]);
