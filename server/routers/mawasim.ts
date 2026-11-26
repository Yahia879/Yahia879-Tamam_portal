import { TRPCError } from "@trpc/server";
import { and, desc, eq, getTableColumns, inArray, isNull, like, ne, or, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/mysql-core";
import { z } from "zod";
import { mawasimExceptions, mawasimGrants, mawasimRequests, mawasimSeasons } from "../../drizzle/mawasim";
import { employees, mosques, roles, userRoleAssignments, users } from "../../drizzle/schema";
import {
  carpetArea, evaluateMawasimExceptionState, filterAndSortSeasonalRequests,
  getSeasonalCity, getSeasonalGovernorate, isActiveSeasonalRequestStatus,
  MAWASIM_PERMISSION_IDS, mayApplyForSeason, seasonalMosqueLimit,
  seasonalMosqueSnapshotSchema, seasonalQuantitiesSchema, seasonalServiceIds, seasonalServices,
  seasonalSettingsSchema, summarizeSeasonalByGovernorateCity, summarizeSeasonalCapacity,
  type SeasonalRequestLimits,
} from "../../shared/mawasim";
import { protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { checkPermission } from "../permissions";
import { createNotification, sendEmailNotification } from "./notifications";
import type { TrpcContext } from "../_core/context";

const id = z.number().int().positive();
const seasonInput = z.object({ seasonId: id });
const staffQueryInput = z.object({
  seasonId: id.optional(),
  search: z.string().trim().max(120).optional(),
  status: z.enum(["all", "submitted", "scheduled", "approved", "rejected"]).optional(),
  governorate: z.string().trim().max(120).optional(),
  city: z.string().trim().max(120).optional(),
  sortBy: z.enum(["newest", "governorate_asc", "governorate_desc", "city_asc", "city_desc"]).optional(),
  page: z.number().int().min(1).optional(),
  limit: z.number().int().min(1).max(100).optional(),
}).optional();
const requestInput = z.object({ seasonId: id, requestId: id });
const approvedMosque = eq(mosques.approvalStatus, "approved");
const mosqueFields = {
  id: mosques.id, name: mosques.name, city: mosques.city, district: mosques.district,
  address: mosques.address, capacity: mosques.capacity, area: mosques.area, hasPrayerHall: mosques.hasPrayerHall,
  menLengthCm: mosques.menLengthCm, menWidthCm: mosques.menWidthCm,
  womenLengthCm: mosques.womenLengthCm, womenWidthCm: mosques.womenWidthCm,
};
const { menPhoto, womenPhoto, ...requestFields } = getTableColumns(mawasimRequests);
const usageFields = {
  status: mawasimRequests.status, requested: mawasimRequests.requested,
  approved: mawasimRequests.approved, execution: mawasimRequests.execution,
};

async function database() {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "قاعدة البيانات غير متاحة." });
  return db;
}
type Db = Awaited<ReturnType<typeof database>>;
type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];

function denied(): never {
  throw new TRPCError({ code: "FORBIDDEN", message: "ليس لديك صلاحية لهذا الإجراء في برنامج مواسم." });
}
function invalid(message: string): never {
  throw new TRPCError({ code: "BAD_REQUEST", message });
}
function notFound(): never {
  throw new TRPCError({ code: "NOT_FOUND", message: "لم يُعثر على السجل في برنامج مواسم." });
}

async function userCanCreate(user: NonNullable<TrpcContext["user"]>): Promise<boolean> {
  return checkPermission(user.id, "mawasim.create").catch(() => false);
}

async function userCanManage(user: NonNullable<TrpcContext["user"]>): Promise<boolean> {
  return checkPermission(user.id, "mawasim.manage").catch(() => false);
}

async function userCanViewRequests(user: NonNullable<TrpcContext["user"]>): Promise<boolean> {
  const [viewReqs, approveReqs] = await Promise.all([
    checkPermission(user.id, "mawasim.view_requests").catch(() => false),
    checkPermission(user.id, "mawasim.approve_requests").catch(() => false),
  ]);
  return viewReqs || approveReqs;
}

async function userCanApproveRequests(user: NonNullable<TrpcContext["user"]>): Promise<boolean> {
  return checkPermission(user.id, "mawasim.approve_requests").catch(() => false);
}

async function userCanCreateSeasonalRequest(user: NonNullable<TrpcContext["user"]>): Promise<boolean> {
  return checkPermission(user.id, "requests.create_seasonal_request").catch(() => false);
}

async function userCanView(user: NonNullable<TrpcContext["user"]>): Promise<boolean> {
  const results = await Promise.all(
    MAWASIM_PERMISSION_IDS.map(permission => checkPermission(user.id, permission).catch(() => false)),
  );
  return results.some(Boolean);
}

async function userCanCreateOrView(user: NonNullable<TrpcContext["user"]>): Promise<boolean> {
  return (await userCanView(user)) || (await userCanCreateSeasonalRequest(user));
}

async function userCanViewAllSeasons(user: NonNullable<TrpcContext["user"]>): Promise<boolean> {
  return checkPermission(user.id, "mawasim.view").catch(() => false);
}

async function userCanViewAssignedSeasons(user: NonNullable<TrpcContext["user"]>): Promise<boolean> {
  return checkPermission(user.id, "mawasim.view_assigned").catch(() => false);
}

async function filterAccessibleSeasons<T extends { managerId: number | null; isOpen: boolean }>(
  user: NonNullable<TrpcContext["user"]>,
  allSeasons: T[],
): Promise<T[]> {
  if (await userCanViewAllSeasons(user)) return allSeasons;
  if (await userCanViewAssignedSeasons(user)) {
    return allSeasons.filter(season => season.managerId === user.id);
  }
  if (await userCanCreateSeasonalRequest(user)) {
    return allSeasons.filter(season => season.isOpen);
  }
  return [];
}

async function assertSeasonAccess(user: NonNullable<TrpcContext["user"]>, season: { managerId: number | null }) {
  if (await userCanViewAllSeasons(user)) return;
  if ((await userCanViewAssignedSeasons(user)) && season.managerId === user.id) return;
  denied();
}

const excludedEmployeeRoles = ["service_requester", "imam", "muezzin"] as const;
const excludedEmployeeRoleSet = new Set<string>(excludedEmployeeRoles);

export interface CompanyEmployeeOption {
  id: number;
  name: string;
  email: string | null;
  role: string;
  roleNameAr: string | null;
  position: string | null;
  department: string | null;
}

async function listSeasonsWithManager(db: Db) {
  const managerUsers = alias(users, "seasonManager");
  const rows = await db.select({
    ...getTableColumns(mawasimSeasons),
    managerName: managerUsers.name,
  }).from(mawasimSeasons)
    .leftJoin(managerUsers, eq(managerUsers.id, mawasimSeasons.managerId))
    .orderBy(desc(mawasimSeasons.hijriYear), desc(mawasimSeasons.id));
  return rows.map(row => ({
    ...row,
    managerId: row.managerId ?? null,
    managerName: row.managerName ?? null,
  }));
}

async function listCompanyEmployees(db: Db): Promise<CompanyEmployeeOption[]> {
  const rows = await db.select({
    id: users.id,
    name: users.name,
    email: users.email,
    role: sql<string>`coalesce(${userRoleAssignments.roleId}, ${users.role})`,
    roleNameAr: roles.nameAr,
    position: employees.position,
    department: employees.department,
  }).from(users)
    .leftJoin(userRoleAssignments, eq(users.id, userRoleAssignments.userId))
    .leftJoin(roles, eq(roles.id, sql`coalesce(${userRoleAssignments.roleId}, ${users.role})`))
    .leftJoin(employees, eq(employees.userId, users.id))
    .where(and(
      eq(users.status, "active"),
      isNull(users.deletedAt),
      ne(users.role, "service_requester"),
    ))
    .orderBy(users.name);

  const unique = new Map<number, CompanyEmployeeOption>();
  for (const row of rows) {
    if (unique.has(row.id)) continue;
    const effectiveRole = row.role ?? "";
    if (excludedEmployeeRoleSet.has(effectiveRole)) continue;
    unique.set(row.id, {
      id: row.id,
      name: row.name ?? "",
      email: row.email ?? null,
      role: effectiveRole,
      roleNameAr: row.roleNameAr ?? null,
      position: row.position ?? null,
      department: row.department ?? null,
    });
  }
  return Array.from(unique.values()).sort((a, b) => a.name.localeCompare(b.name, "ar"));
}

async function querySeasonRequestsWithDetails(db: Db, seasonId: number, requestId?: number) {
  const applicantUsers = alias(users, "applicantUser");
  const whereClause = requestId != null
    ? and(eq(mawasimRequests.seasonId, seasonId), eq(mawasimRequests.id, requestId))
    : eq(mawasimRequests.seasonId, seasonId);
  const rawRows = await db.select({
    ...requestFields,
    assignee: users.name,
    applicantName: applicantUsers.name,
    applicantPhone: applicantUsers.phone,
    applicantEmail: applicantUsers.email,
    applicantNationalId: applicantUsers.nationalId,
    applicantCity: applicantUsers.city,
    applicantRequesterType: applicantUsers.requesterType,
    governorate: mosques.governorate,
    mosqueCity: mosques.city,
    imamName: mosques.imamName,
    imamPhone: mosques.imamPhone,
    imamEmail: mosques.imamEmail,
    mosqueRegisteredBy: mosques.registeredBy,
    hasPhotos: sql<boolean>`(${mawasimRequests.menPhoto} IS NOT NULL OR ${mawasimRequests.womenPhoto} IS NOT NULL)`,
  }).from(mawasimRequests)
    .leftJoin(users, eq(users.id, mawasimRequests.assignedTo))
    .leftJoin(applicantUsers, eq(applicantUsers.id, mawasimRequests.applicantId))
    .leftJoin(mosques, eq(mosques.id, mawasimRequests.mosqueId))
    .where(whereClause).orderBy(desc(mawasimRequests.id));

  const unresolvedMosques: MosqueLinkInfo[] = rawRows
    .filter(row => !row.applicantName && row.mosqueId != null && (row.mosqueRegisteredBy != null || row.imamEmail || row.imamPhone))
    .map(row => ({
      id: row.mosqueId!,
      registeredBy: row.mosqueRegisteredBy ?? null,
      imamEmail: row.imamEmail ?? null,
      imamPhone: row.imamPhone ?? null,
    }));

  const candidates = unresolvedMosques.length
    ? await queryMosqueRequesterCandidates(db, unresolvedMosques)
    : [];

  return rawRows.map(({ mosqueRegisteredBy: _mrb, ...row }) => {
    const linked = !row.applicantName && row.mosqueId != null && candidates.length
      ? pickLinkedRequesterForMosque({
        id: row.mosqueId,
        registeredBy: _mrb ?? null,
        imamEmail: row.imamEmail ?? null,
        imamPhone: row.imamPhone ?? null,
      }, candidates)
      : null;
    return {
      ...row,
      applicantName: row.applicantName ?? linked?.name ?? null,
      applicantPhone: row.applicantPhone ?? linked?.phone ?? null,
      applicantEmail: row.applicantEmail ?? linked?.email ?? null,
      applicantNationalId: row.applicantNationalId ?? linked?.nationalId ?? null,
      applicantCity: row.applicantCity ?? linked?.city ?? null,
      applicantRequesterType: row.applicantRequesterType ?? linked?.requesterType ?? null,
    };
  });
}

function buildSeasonRequestStats(rows: Array<{ status: string }>) {
  return {
    total: rows.length,
    submitted: rows.filter(row => row.status === "submitted").length,
    scheduled: rows.filter(row => row.status === "scheduled").length,
    approved: rows.filter(row => row.status === "approved" || row.status === "completed").length,
    rejected: rows.filter(row => row.status === "rejected").length,
  };
}

function linkedMosquesCondition(user: NonNullable<TrpcContext["user"]>) {
  const conditions = [eq(mosques.registeredBy, user.id)];
  if (user.email?.trim()) conditions.push(eq(mosques.imamEmail, user.email.trim()));
  if (user.phone?.trim()) conditions.push(eq(mosques.imamPhone, user.phone.trim()));
  return or(...conditions);
}

function mosqueLinkedToUser(
  mosque: { registeredBy: number | null; imamEmail: string | null; imamPhone: string | null },
  user: NonNullable<TrpcContext["user"]>,
): boolean {
  if (mosque.registeredBy === user.id) return true;
  const email = user.email?.trim().toLowerCase();
  if (email && mosque.imamEmail?.trim().toLowerCase() === email) return true;
  const phone = user.phone?.trim();
  if (phone && mosque.imamPhone?.trim() === phone) return true;
  return false;
}

const requesterFields = {
  id: users.id,
  name: users.name,
  email: users.email,
  phone: users.phone,
  nationalId: users.nationalId,
  city: users.city,
  requesterType: users.requesterType,
};

type MosqueLinkInfo = {
  id: number;
  registeredBy: number | null;
  imamEmail: string | null;
  imamPhone: string | null;
};

type LinkedRequesterSummary = {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  nationalId: string | null;
  city: string | null;
  requesterType: string | null;
};

function isImamOrMuezzin(requesterType: string | null | undefined): boolean {
  return ["imam", "muezzin", "إمام", "مؤذن"].includes(requesterType ?? "");
}

function pickLinkedRequesterForMosque(
  mosque: MosqueLinkInfo,
  candidates: LinkedRequesterSummary[],
): LinkedRequesterSummary | null {
  const email = mosque.imamEmail?.trim().toLowerCase();
  const phone = mosque.imamPhone?.trim();
  let best: LinkedRequesterSummary | null = null;
  let bestScore = 0;

  for (const user of candidates) {
    const matchesImamContact = Boolean(
      (email && user.email?.trim().toLowerCase() === email) ||
      (phone && user.phone?.trim() === phone),
    );
    const matchesRegistrant = mosque.registeredBy !== null && user.id === mosque.registeredBy;
    if (!matchesImamContact && !matchesRegistrant) continue;

    // Prefer the mosque's imam/muezzin over a donor registrant when both exist.
    const imamPriority = isImamOrMuezzin(user.requesterType) ? 2 : 0;
    const contactPriority = matchesImamContact ? 2 : 1;
    const score = imamPriority * 10 + contactPriority;
    if (score > bestScore) {
      bestScore = score;
      best = user;
    }
  }
  return best;
}

async function queryMosqueRequesterCandidates(
  db: Db | Tx,
  mosqueRows: MosqueLinkInfo[],
): Promise<LinkedRequesterSummary[]> {
  const userIds = Array.from(new Set(mosqueRows.map(m => m.registeredBy).filter((v): v is number => v !== null)));
  const emails = Array.from(new Set(mosqueRows.map(m => m.imamEmail?.trim()).filter((v): v is string => Boolean(v))));
  const phones = Array.from(new Set(mosqueRows.map(m => m.imamPhone?.trim()).filter((v): v is string => Boolean(v))));
  const matchConditions = [
    ...(userIds.length ? [inArray(users.id, userIds)] : []),
    ...(emails.length ? [inArray(users.email, emails)] : []),
    ...(phones.length ? [inArray(users.phone, phones)] : []),
  ];
  if (!matchConditions.length) return [];

  return db.select(requesterFields).from(users).where(and(
    eq(users.role, "service_requester"),
    eq(users.status, "active"),
    isNull(users.deletedAt),
    or(...matchConditions),
  ));
}

async function resolveMosqueRequester(
  db: Db | Tx,
  mosque: MosqueLinkInfo,
): Promise<LinkedRequesterSummary | null> {
  const candidates = await queryMosqueRequesterCandidates(db, [mosque]);
  return pickLinkedRequesterForMosque(mosque, candidates);
}

async function attachPreviousSnapshots<T extends { id: number }>(db: Db, rows: T[]) {
  if (!rows.length) return rows.map(row => ({ ...row, previous: undefined }));
  const saved = await db.select({
    mosqueId: mawasimRequests.mosqueId,
    snapshot: mawasimRequests.snapshot,
  }).from(mawasimRequests).where(and(
    inArray(mawasimRequests.mosqueId, rows.map(mosque => mosque.id)),
    inArray(mawasimRequests.status, ["submitted", "approved", "scheduled", "completed"]),
  )).orderBy(desc(mawasimRequests.createdAt), desc(mawasimRequests.id));
  return rows.map(mosque => {
    const previous = saved.find(item => item.mosqueId === mosque.id)?.snapshot;
    if (!previous || previous.men) return { ...mosque, previous };
    const measurements = saved.find(item => item.mosqueId === mosque.id && item.snapshot.men)?.snapshot;
    return { ...mosque, previous: measurements ? { ...previous, men: measurements.men, women: measurements.women } : previous };
  });
}

const mawasimProcedure = protectedProcedure.use(async ({ ctx, next }) => {
  if (ctx.user.status !== "active" || ctx.user.deletedAt) denied();
  if (!(await userCanView(ctx.user))) denied();
  return next();
});

const mawasimCreateOrViewProcedure = protectedProcedure.use(async ({ ctx, next }) => {
  if (ctx.user.status !== "active" || ctx.user.deletedAt) denied();
  if (!(await userCanCreateOrView(ctx.user))) denied();
  return next();
});

async function lockedSeason(tx: Tx, seasonId: number) {
  // Every change to a season's reservations or limits takes this row lock first.
  const [season] = await tx.select().from(mawasimSeasons).where(eq(mawasimSeasons.id, seasonId)).for("update");
  return season ?? notFound();
}
async function lockedRequest(tx: Tx, input: z.infer<typeof requestInput>) {
  const season = await lockedSeason(tx, input.seasonId);
  const [request] = await tx.select(requestFields).from(mawasimRequests).where(and(
    eq(mawasimRequests.id, input.requestId), eq(mawasimRequests.seasonId, season.id),
  )).for("update");
  if (!request) notFound();
  return { season, request };
}
function usage(db: Db | Tx, seasonId: number) {
  return db.select(usageFields).from(mawasimRequests).where(eq(mawasimRequests.seasonId, seasonId));
}

const photo = z.string().max(4_194_330).regex(/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/]+={0,2}$/)
  .refine(value => {
    const [prefix, encoded] = value.split(",");
    const bytes = Buffer.from(encoded, "base64");
    if (bytes.length > 3 * 1024 * 1024) return false;
    if (prefix.includes("jpeg")) return bytes.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff]));
    if (prefix.includes("png")) return bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
    return bytes.subarray(0, 4).toString() === "RIFF" && bytes.subarray(8, 12).toString() === "WEBP";
  }, "أرفق صورة JPG أو PNG أو WebP بحجم لا يتجاوز 3 ميجابايت.");

export const mawasimRouter = router({
  portal: protectedProcedure.input(seasonInput.optional()).query(async ({ input, ctx }) => {
    const user = ctx.user;
    if (user.role !== "service_requester" || user.deletedAt) denied();
    const db = await database();
    const seasons = await db.select().from(mawasimSeasons)
      .orderBy(desc(mawasimSeasons.hijriYear), desc(mawasimSeasons.id));
    const seasonSummaries = seasons.map(({ settings: _settings, ...rest }) => rest);
    const hasOpenSeason = seasons.some(item => item.isOpen);
    const linkedMosques = user.status === "active"
      ? await db.select({ id: mosques.id }).from(mosques).where(and(approvedMosque, linkedMosquesCondition(user)))
      : [];
    const linkedMosqueIds = linkedMosques.map(item => item.id);
    const requestConditions = [
      eq(mawasimRequests.applicantId, user.id),
      eq(mawasimRequests.submittedBy, user.id),
      ...(linkedMosqueIds.length
        ? [and(isNull(mawasimRequests.applicantId), inArray(mawasimRequests.mosqueId, linkedMosqueIds))]
        : []),
    ];
    const allRequests = await db.select({
      ...requestFields,
      seasonTitle: mawasimSeasons.title,
      hijriYear: mawasimSeasons.hijriYear,
    }).from(mawasimRequests)
      .innerJoin(mawasimSeasons, eq(mawasimSeasons.id, mawasimRequests.seasonId))
      .where(or(...requestConditions))
      .orderBy(desc(mawasimRequests.id));
    const [latestException = null] = await db.select()
      .from(mawasimExceptions)
      .where(eq(mawasimExceptions.userId, user.id))
      .orderBy(desc(mawasimExceptions.id))
      .limit(1);
    const activeRequest = allRequests.find(req => isActiveSeasonalRequestStatus(req.status)) ?? null;
    const choice = input
      ? seasons.find(item => item.id === input.seasonId)
      : seasons.find(item => item.isOpen) ?? seasons[0];
    if (!choice) {
      return {
        hasOpenSeason,
        seasons: seasonSummaries,
        season: null,
        eligible: [],
        requests: [],
        allRequests,
        capacity: [],
        activeRequest,
        latestException,
      };
    }

    const activeGrants = user.status === "active"
      ? await db.select({ mosqueId: mawasimGrants.mosqueId }).from(mawasimGrants).where(and(
        eq(mawasimGrants.seasonId, choice.id),
        eq(mawasimGrants.userId, user.id),
        eq(mawasimGrants.active, true),
      ))
      : [];
    const canApplyViaOwnership = mayApplyForSeason(user, true, false);
    const ownershipFilter = canApplyViaOwnership ? linkedMosquesCondition(user) : undefined;
    const grantFilter = user.status === "active" && activeGrants.length > 0
      ? inArray(mosques.id, activeGrants.map(grant => grant.mosqueId))
      : undefined;
    const eligibilityFilter = ownershipFilter && grantFilter
      ? or(ownershipFilter, grantFilter)
      : (ownershipFilter ?? grantFilter);
    const registered = eligibilityFilter
      ? await db.select(mosqueFields).from(mosques).where(and(approvedMosque, eligibilityFilter)).orderBy(mosques.name)
      : [];
    const eligible = await attachPreviousSnapshots(db, registered);
    const requests = allRequests.filter(req => req.seasonId === choice.id);
    const capacity = summarizeSeasonalCapacity(choice.settings, await usage(db, choice.id))
      .map(({ service, available }) => ({ service, available }));
    const { settings, ...seasonInfo } = choice;
    const serviceLimits = Object.fromEntries(seasonalServiceIds.map(service => {
      const { enabled, perMosqueLimit } = settings.services[service];
      return [service, { enabled, perMosqueLimit }];
    })) as SeasonalRequestLimits["services"];

    return {
      hasOpenSeason,
      seasons: seasonSummaries,
      season: {
        ...seasonInfo,
        settings: {
          services: serviceLimits,
          largeMosqueWorshippers: settings.largeMosqueWorshippers,
          largeMosqueWaterLimit: settings.largeMosqueWaterLimit,
        },
      },
      eligible,
      requests,
      allRequests,
      capacity,
      activeRequest,
      latestException,
    };
  }),

  staff: mawasimCreateOrViewProcedure.input(staffQueryInput).query(async ({ input, ctx }) => {
    const db = await database();
    const [allSeasons, companyEmployees] = await Promise.all([
      listSeasonsWithManager(db),
      listCompanyEmployees(db),
    ]);
    const seasons = await filterAccessibleSeasons(ctx.user, allSeasons);
    const season = input?.seasonId ? seasons.find(item => item.id === input.seasonId) : seasons[0];
    const page = input?.page ?? 1;
    const limit = input?.limit ?? 10;
    if (!season) {
      return {
        seasons,
        season: null,
        employees: companyEmployees,
        requests: [],
        capacity: [],
        grants: [],
        stats: { total: 0, submitted: 0, scheduled: 0, approved: 0, rejected: 0 },
        locationDistribution: [],
        filterOptions: { governorates: [] as string[], cities: [] as string[] },
        pagination: { page: 1, limit, total: 0, totalPages: 1 },
      };
    }
    const canViewReqs = await userCanViewRequests(ctx.user);
    if (!canViewReqs) {
      const usageRows = await usage(db, season.id);
      const capacity = summarizeSeasonalCapacity(season.settings, usageRows);
      return {
        seasons,
        season,
        employees: companyEmployees,
        requests: [],
        capacity,
        grants: [],
        stats: buildSeasonRequestStats(usageRows),
        locationDistribution: [],
        filterOptions: { governorates: [] as string[], cities: [] as string[] },
        pagination: { page: 1, limit, total: 0, totalPages: 1 },
      };
    }
    const allRequests = await querySeasonRequestsWithDetails(db, season.id);
    const capacity = summarizeSeasonalCapacity(season.settings, allRequests);
    const grants = await db.select({
      id: mawasimGrants.id, reason: mawasimGrants.reason, active: mawasimGrants.active,
      mosque: mosques.name, applicant: users.name,
    }).from(mawasimGrants).innerJoin(mosques, eq(mosques.id, mawasimGrants.mosqueId))
      .innerJoin(users, eq(users.id, mawasimGrants.userId)).where(eq(mawasimGrants.seasonId, season.id))
      .orderBy(desc(mawasimGrants.id));

    const governorateSet = new Set<string>();
    for (const row of allRequests) {
      const gov = getSeasonalGovernorate(row);
      if (gov) governorateSet.add(gov);
    }
    const governorates = Array.from(governorateSet).sort((a, b) => a.localeCompare(b, "ar"));
    const effectiveGovernorate =
      input?.governorate && input.governorate !== "all" && governorateSet.has(input.governorate)
        ? input.governorate
        : "all";

    const citySet = new Set<string>();
    for (const row of allRequests) {
      if (effectiveGovernorate !== "all" && getSeasonalGovernorate(row) !== effectiveGovernorate) continue;
      const city = getSeasonalCity(row);
      if (city) citySet.add(city);
    }
    const cities = Array.from(citySet).sort((a, b) => a.localeCompare(b, "ar"));
    const effectiveCity =
      input?.city && input.city !== "all" && citySet.has(input.city)
        ? input.city
        : "all";

    const filtered = filterAndSortSeasonalRequests(allRequests, {
      statusFilter: input?.status ?? "all",
      governorateFilter: effectiveGovernorate,
      cityFilter: effectiveCity,
      searchQuery: input?.search ?? "",
      sortBy: input?.sortBy ?? "newest",
    });

    const total = filtered.length;
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const safePage = Math.min(Math.max(1, page), totalPages);
    const requests = filtered.slice((safePage - 1) * limit, safePage * limit);

    return {
      seasons,
      season,
      employees: companyEmployees,
      requests,
      capacity,
      grants,
      stats: buildSeasonRequestStats(allRequests),
      locationDistribution: summarizeSeasonalByGovernorateCity(allRequests),
      filterOptions: { governorates, cities },
      pagination: { page: safePage, limit, total, totalPages },
    };
  }),

  exportRequests: mawasimCreateOrViewProcedure.input(staffQueryInput).query(async ({ input, ctx }) => {
    if (!(await userCanViewRequests(ctx.user))) denied();
    const db = await database();
    const allSeasons = await listSeasonsWithManager(db);
    const seasons = await filterAccessibleSeasons(ctx.user, allSeasons);
    const season = input?.seasonId ? seasons.find(item => item.id === input.seasonId) : seasons[0];
    if (!season) return [];

    const allRequests = await querySeasonRequestsWithDetails(db, season.id);

    return filterAndSortSeasonalRequests(allRequests, {
      statusFilter: input?.status ?? "all",
      governorateFilter: input?.governorate || "all",
      cityFilter: input?.city || "all",
      searchQuery: input?.search ?? "",
      sortBy: input?.sortBy ?? "newest",
    });
  }),

  searchMosques: mawasimCreateOrViewProcedure.input(z.object({ search: z.string().trim().max(80).optional() }).optional()).query(async ({ input }) => {
    const db = await database();
    const term = input?.search?.trim() ?? "";
    const rows = await db.select({
      ...mosqueFields,
      registeredBy: mosques.registeredBy,
      imamEmail: mosques.imamEmail,
      imamPhone: mosques.imamPhone,
    }).from(mosques).where(and(
      approvedMosque,
      term ? or(
        like(mosques.name, "%" + term + "%"),
        like(mosques.city, "%" + term + "%"),
        like(mosques.district, "%" + term + "%"),
      ) : undefined,
    )).orderBy(mosques.name).limit(500);
    const withPrevious = await attachPreviousSnapshots(db, rows);
    const candidates = await queryMosqueRequesterCandidates(db, rows);
    return withPrevious.map(({ registeredBy: _rb, imamEmail: _ie, imamPhone: _ip, ...rest }, index) => ({
      ...rest,
      linkedRequester: pickLinkedRequesterForMosque(rows[index], candidates),
    }));
  }),

  photos: mawasimProcedure.input(requestInput).query(async ({ input, ctx }) => {
    if (!(await userCanViewRequests(ctx.user))) denied();
    const db = await database();
    const [season] = await db.select({ id: mawasimSeasons.id, managerId: mawasimSeasons.managerId })
      .from(mawasimSeasons).where(eq(mawasimSeasons.id, input.seasonId));
    if (!season) notFound();
    await assertSeasonAccess(ctx.user, season);
    const [request] = await db.select({ menPhoto, womenPhoto }).from(mawasimRequests).where(and(
      eq(mawasimRequests.id, input.requestId), eq(mawasimRequests.seasonId, input.seasonId),
    ));
    return request ?? notFound();
  }),

  workOrder: mawasimProcedure.input(requestInput).query(async ({ input, ctx }) => {
    if (!(await userCanViewRequests(ctx.user))) denied();
    const db = await database();
    const allSeasons = await listSeasonsWithManager(db);
    const season = allSeasons.find(item => item.id === input.seasonId);
    if (!season) notFound();
    await assertSeasonAccess(ctx.user, season);
    const [request] = await querySeasonRequestsWithDetails(db, season.id, input.requestId);
    if (!request) notFound();
    return { season, request };
  }),

  saveSeason: mawasimProcedure.input(z.object({
    id: id.optional(), hijriYear: z.number().int().min(1400).max(1600),
    title: z.string().trim().min(3).max(160), managerId: id.nullable().optional(),
    isOpen: z.boolean(), settings: seasonalSettingsSchema,
  })).mutation(async ({ input, ctx }) => {
    if (!input.id) {
      if (!(await userCanCreate(ctx.user))) denied();
    } else {
      if (!(await userCanManage(ctx.user))) denied();
    }
    if (input.isOpen && !seasonalServiceIds.some(service => input.settings.services[service].enabled)) {
      invalid("فعّل خدمة واحدة على الأقل قبل فتح التسجيل.");
    }
    const db = await database();
    if (input.managerId != null) {
      const [manager] = await db.select({
        id: users.id,
        role: sql<string>`coalesce(${userRoleAssignments.roleId}, ${users.role})`,
      }).from(users)
        .leftJoin(userRoleAssignments, eq(users.id, userRoleAssignments.userId))
        .where(and(
          eq(users.id, input.managerId),
          eq(users.status, "active"),
          isNull(users.deletedAt),
          ne(users.role, "service_requester"),
        ))
        .limit(1);
      if (!manager || excludedEmployeeRoleSet.has(manager.role ?? "")) {
        invalid("اختر مديراً صالحاً للموسم من قائمة موظفي الشركة.");
      }
    }
    const { id: seasonId, managerId, ...restValues } = input;
    const values = {
      ...restValues,
      ...(managerId !== undefined ? { managerId } : {}),
    };
    return db.transaction(async tx => {
      if (!seasonId) return (await tx.insert(mawasimSeasons).values(values).$returningId())[0];
      const existingSeason = await lockedSeason(tx, seasonId);
      await assertSeasonAccess(ctx.user, existingSeason);
      if (summarizeSeasonalCapacity(values.settings, await usage(tx, seasonId)).some(row => row.limit < row.reserved)) {
        invalid("السعة الجديدة أقل من الكميات المحجوزة أو المنفّذة.");
      }
      await tx.update(mawasimSeasons).set(values).where(eq(mawasimSeasons.id, seasonId));
      return { id: seasonId };
    });
  }),

  grant: mawasimProcedure.input(seasonInput.extend({
    mosqueId: id, email: z.email().max(320), reason: z.string().trim().min(3).max(500),
  })).mutation(async ({ input, ctx }) => {
    if (!(await userCanManage(ctx.user))) denied();
    const db = await database();
    await db.transaction(async tx => {
      const season = await lockedSeason(tx, input.seasonId);
      await assertSeasonAccess(ctx.user, season);
      const [mosque] = await tx.select({ id: mosques.id }).from(mosques).where(and(eq(mosques.id, input.mosqueId), approvedMosque));
      const [user] = await tx.select({ id: users.id }).from(users).where(and(
        eq(users.email, input.email), eq(users.role, "service_requester"), eq(users.status, "active"), isNull(users.deletedAt),
      ));
      if (!mosque || !user) invalid("اختر مسجدًا معتمدًا وحساب مستفيد نشطًا.");
      await tx.insert(mawasimGrants).values({
        seasonId: input.seasonId, mosqueId: input.mosqueId, userId: user.id, grantedBy: ctx.user.id, reason: input.reason,
      }).onDuplicateKeyUpdate({ set: { active: true, reason: input.reason, grantedBy: ctx.user.id } });
    });
  }),

  revokeGrant: mawasimProcedure.input(seasonInput.extend({ grantId: id })).mutation(async ({ input, ctx }) => {
    if (!(await userCanManage(ctx.user))) denied();
    const db = await database();
    await db.transaction(async tx => {
      const season = await lockedSeason(tx, input.seasonId);
      await assertSeasonAccess(ctx.user, season);
      await tx.update(mawasimGrants).set({ active: false }).where(and(
        eq(mawasimGrants.id, input.grantId), eq(mawasimGrants.seasonId, input.seasonId),
      ));
    });
  }),

  submit: protectedProcedure.input(seasonInput.extend({
    mosqueId: id, snapshot: seasonalMosqueSnapshotSchema, menPhoto: photo.optional(), womenPhoto: photo.optional(),
    requested: seasonalQuantitiesSchema, specialRequest: z.string().trim().max(2000).optional(),
    pledge: z.literal(true),
    onBehalf: z.object({
      name: z.string().trim().min(2).max(150), phone: z.string().trim().regex(/^\+?[0-9]{8,15}$/),
      reason: z.string().trim().min(3).max(500), email: z.email().max(320).optional(),
    }).optional(),
  })).mutation(async ({ input, ctx }) => {
    if (ctx.user.status !== "active" || ctx.user.deletedAt) denied();
    const isRequester = ctx.user.role === "service_requester";
    if (isRequester) {
      if (input.onBehalf) denied();
    } else if (!(await userCanCreateOrView(ctx.user))) {
      denied();
    }
    const { onBehalf, snapshot, menPhoto, womenPhoto } = input;
    const carpet = input.requested.carpet ?? 0;
    if (carpet > 0) {
      if (!snapshot.men) invalid("أدخل قياسات مصلى الرجال لطلب غسيل الفرش.");
      if (carpet !== carpetArea(snapshot.men, snapshot.women)) {
        invalid("مساحة الغسيل المطلوبة يجب أن تطابق أبعاد المصليات المسجلة.");
      }
    }

    const db = await database();
    try {
      return await db.transaction(async tx => {
        const season = await lockedSeason(tx, input.seasonId);
        if (!season.isOpen) invalid("التسجيل لهذا الموسم مغلق.");
        const [mosque] = await tx.select({
          id: mosques.id,
          name: mosques.name,
          city: mosques.city,
          district: mosques.district,
          address: mosques.address,
          capacity: mosques.capacity,
          area: mosques.area,
          hasPrayerHall: mosques.hasPrayerHall,
          menLengthCm: mosques.menLengthCm,
          menWidthCm: mosques.menWidthCm,
          womenLengthCm: mosques.womenLengthCm,
          womenWidthCm: mosques.womenWidthCm,
          registeredBy: mosques.registeredBy,
          imamName: mosques.imamName,
          imamEmail: mosques.imamEmail,
          imamPhone: mosques.imamPhone,
        }).from(mosques).where(and(eq(mosques.id, input.mosqueId), approvedMosque));
        if (!mosque) invalid("اختر مسجدًا معتمدًا.");
        let applicantId: number | null = isRequester ? ctx.user.id : null;
        let resolvedRequester: LinkedRequesterSummary | null = null;
        let exceptionToConsumeId: number | null = null;
        if (isRequester) {
          const ownsMosque = mosqueLinkedToUser(mosque, ctx.user);
          const [grant] = await tx.select({ id: mawasimGrants.id }).from(mawasimGrants).where(and(
            eq(mawasimGrants.seasonId, season.id),
            eq(mawasimGrants.mosqueId, mosque.id),
            eq(mawasimGrants.userId, ctx.user.id),
            eq(mawasimGrants.active, true),
          ));
          if (!mayApplyForSeason(ctx.user, ownsMosque, Boolean(grant))) denied();

          // منع تقديم أكثر من طلب مواسم فعال في نفس الوقت إلا باستثناء معتمد خاص ببرنامج مواسم
          const userLinkedMosques = await tx
            .select({ id: mosques.id })
            .from(mosques)
            .where(and(approvedMosque, linkedMosquesCondition(ctx.user)));
          const userLinkedMosqueIds = userLinkedMosques.map(m => m.id);
          const activeConditions = [
            eq(mawasimRequests.applicantId, ctx.user.id),
            eq(mawasimRequests.submittedBy, ctx.user.id),
            ...(userLinkedMosqueIds.length
              ? [and(isNull(mawasimRequests.applicantId), inArray(mawasimRequests.mosqueId, userLinkedMosqueIds))]
              : []),
          ];
          const existingUserRequests = await tx.select({
            id: mawasimRequests.id,
            status: mawasimRequests.status,
            createdAt: mawasimRequests.createdAt,
            mosqueName: mawasimRequests.mosqueName,
          }).from(mawasimRequests)
            .where(or(...activeConditions))
            .orderBy(desc(mawasimRequests.id));
          const latestActive = existingUserRequests.find(req => isActiveSeasonalRequestStatus(req.status)) ?? null;
          if (latestActive) {
            const [latestMawasimException = null] = await tx.select()
              .from(mawasimExceptions)
              .where(eq(mawasimExceptions.userId, ctx.user.id))
              .orderBy(desc(mawasimExceptions.id))
              .limit(1);
            const exceptionEval = evaluateMawasimExceptionState(latestActive, latestMawasimException);
            if (exceptionEval.isBlocked) {
              invalid("لا يمكن تقديم طلب جديد في برنامج مواسم لوجود طلب سابق فعال. يمكنك رفع طلب استثناء خاص ببرنامج مواسم للمراجعة.");
            }
            exceptionToConsumeId = exceptionEval.exceptionForCycle?.id ?? null;
          }
        } else if (onBehalf?.email) {
          const [applicant] = await tx.select({ id: users.id }).from(users).where(and(eq(users.email, onBehalf.email),
            eq(users.role, "service_requester"), eq(users.status, "active"), isNull(users.deletedAt)));
          if (!applicant) invalid("لم يُعثر على حساب مستفيد نشط بهذا البريد.");
          applicantId = applicant.id;
        } else {
          resolvedRequester = await resolveMosqueRequester(tx, mosque);
          applicantId = resolvedRequester?.id ?? null;
        }
        const capacity = summarizeSeasonalCapacity(season.settings, await usage(tx, season.id));
        let selected = 0;
        for (const row of capacity) {
          const amount = input.requested[row.service] ?? 0;
          if (amount === 0) continue;
          selected++;
          if (!season.settings.services[row.service].enabled) {
            invalid("الخدمة " + seasonalServices[row.service].label + " غير مفعّلة في هذا الموسم.");
          }
        }
        if (!selected) invalid("اختر خدمة واحدة على الأقل.");
        const fallbackContact = resolvedRequester
          ? {
            name: resolvedRequester.name,
            phone: resolvedRequester.phone ?? mosque.imamPhone ?? "",
            email: resolvedRequester.email ?? mosque.imamEmail,
          }
          : mosque.imamName?.trim() || mosque.imamPhone?.trim() || mosque.imamEmail?.trim()
            ? {
              name: mosque.imamName?.trim() || mosque.name,
              phone: mosque.imamPhone ?? "",
              email: mosque.imamEmail,
            }
            : { name: ctx.user.name, phone: ctx.user.phone ?? "", email: ctx.user.email };
        const [created] = await tx.insert(mawasimRequests).values({
          seasonId: season.id, mosqueId: mosque.id, applicantId, submittedBy: ctx.user.id, mosqueName: mosque.name,
          snapshot: carpet > 0 ? snapshot : { ...snapshot, men: null, women: null },
          menPhoto: carpet > 0 ? (menPhoto ?? null) : null, womenPhoto: carpet > 0 ? (womenPhoto ?? null) : null,
          requested: input.requested, specialRequest: input.specialRequest,
          contact: onBehalf ?? fallbackContact,
        }).$returningId();

        if (exceptionToConsumeId) {
          await tx.update(mawasimExceptions)
            .set({ consumedByRequestId: created.id })
            .where(eq(mawasimExceptions.id, exceptionToConsumeId));
        }

        // مزامنة الحقول المعدّلة فقط في بيانات المسجد الأساسية مع النموذج
        const mosqueUpdates: Partial<typeof mosques.$inferInsert> = {};
        const nextCity = snapshot.city.trim();
        const nextDistrict = snapshot.district.trim();
        const nextAddress = snapshot.address.trim();

        if (nextCity !== (mosque.city ?? "").trim()) mosqueUpdates.city = nextCity;
        if (nextDistrict !== (mosque.district ?? "").trim()) mosqueUpdates.district = nextDistrict;
        if (nextAddress !== (mosque.address ?? "").trim()) mosqueUpdates.address = nextAddress;
        if (snapshot.worshippers !== mosque.capacity) mosqueUpdates.capacity = snapshot.worshippers;

        if (carpet > 0) {
          if (snapshot.men) {
            const menLengthChanged = snapshot.men.lengthCm !== mosque.menLengthCm;
            const menWidthChanged = snapshot.men.widthCm !== mosque.menWidthCm;
            if (menLengthChanged) mosqueUpdates.menLengthCm = snapshot.men.lengthCm;
            if (menWidthChanged) mosqueUpdates.menWidthCm = snapshot.men.widthCm;

            if (menLengthChanged || menWidthChanged || !mosque.area) {
              const nextMenArea = ((snapshot.men.lengthCm * snapshot.men.widthCm) / 10000).toFixed(2);
              if (!mosque.area || Number(mosque.area) !== Number(nextMenArea)) {
                mosqueUpdates.area = nextMenArea;
              }
            }
          }
          if (snapshot.women) {
            if (!mosque.hasPrayerHall) mosqueUpdates.hasPrayerHall = true;
            if (snapshot.women.lengthCm !== mosque.womenLengthCm) {
              mosqueUpdates.womenLengthCm = snapshot.women.lengthCm;
            }
            if (snapshot.women.widthCm !== mosque.womenWidthCm) {
              mosqueUpdates.womenWidthCm = snapshot.women.widthCm;
            }
          }
        }
        if (Object.keys(mosqueUpdates).length > 0) {
          await tx.update(mosques).set(mosqueUpdates).where(eq(mosques.id, mosque.id));
        }

        return created;
      });
    } catch (error) {
      if (isDuplicate(error)) throw new TRPCError({ code: "CONFLICT", message: "يوجد طلب لهذا المسجد في الموسم نفسه." });
      throw error;
    }
  }),

  schedule: mawasimProcedure.input(requestInput.extend({
    scheduledFor: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "أدخل تاريخ تنفيذ صالحاً."),
    assignedTo: id.nullable().optional(),
  })).mutation(async ({ input, ctx }) => {
    if (!(await userCanApproveRequests(ctx.user))) denied();
    const db = await database();
    await db.transaction(async tx => {
      const { season, request } = await lockedRequest(tx, input);
      await assertSeasonAccess(ctx.user, season);
      if (!["submitted", "scheduled"].includes(request.status)) {
        invalid("لا يمكن جدولة طلب تم اعتماده أو إغلاقه مسبقاً.");
      }
      if (input.assignedTo != null) {
        const [assignee] = await tx.select({
          id: users.id,
          role: sql<string>`coalesce(${userRoleAssignments.roleId}, ${users.role})`,
        }).from(users)
          .leftJoin(userRoleAssignments, eq(users.id, userRoleAssignments.userId))
          .where(and(
            eq(users.id, input.assignedTo),
            eq(users.status, "active"),
            isNull(users.deletedAt),
            ne(users.role, "service_requester"),
          ))
          .limit(1);
        if (!assignee || excludedEmployeeRoleSet.has(assignee.role ?? "")) {
          invalid("اختر موظفاً صالحاً للتكليف بالتنفيذ.");
        }
      }
      await tx.update(mawasimRequests).set({
        scheduledFor: input.scheduledFor,
        assignedTo: input.assignedTo ?? null,
        status: "scheduled",
      }).where(eq(mawasimRequests.id, request.id));
    });
    return { success: true };
  }),

  review: mawasimProcedure.input(requestInput.extend({
    approved: seasonalQuantitiesSchema.nullable(),
    note: z.string().trim().max(2000),
    scheduledFor: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "أدخل تاريخ تنفيذ صالحاً.").optional(),
    assignedTo: id.nullable().optional(),
  })).mutation(async ({ input, ctx }) => {
    if (!(await userCanApproveRequests(ctx.user))) denied();
    const db = await database();
    await db.transaction(async tx => {
      const { season, request } = await lockedRequest(tx, input);
      await assertSeasonAccess(ctx.user, season);
      if (input.approved === null) {
        if (!["submitted", "scheduled"].includes(request.status) || !input.note) {
          invalid("أدخل سبب الاعتذار عن طلب قائم.");
        }
        await tx.update(mawasimRequests).set({ status: "rejected", approved: null, reviewNote: input.note, reviewedBy: ctx.user.id })
          .where(eq(mawasimRequests.id, request.id));
        return;
      }
      if (!["submitted", "scheduled"].includes(request.status)) invalid("الطلب سبق أن روجع.");
      const effectiveScheduledFor = input.scheduledFor ?? request.scheduledFor;
      if (!effectiveScheduledFor) {
        invalid("يجب جدولة موعد التنفيذ قبل اعتماد الطلب.");
      }
      if (input.assignedTo != null) {
        const [assignee] = await tx.select({
          id: users.id,
          role: sql<string>`coalesce(${userRoleAssignments.roleId}, ${users.role})`,
        }).from(users)
          .leftJoin(userRoleAssignments, eq(users.id, userRoleAssignments.userId))
          .where(and(
            eq(users.id, input.assignedTo),
            eq(users.status, "active"),
            isNull(users.deletedAt),
            ne(users.role, "service_requester"),
          ))
          .limit(1);
        if (!assignee || excludedEmployeeRoleSet.has(assignee.role ?? "")) {
          invalid("اختر موظفاً صالحاً للتكليف بالتنفيذ.");
        }
      }
      if (input.approved.carpet && !request.snapshot.men) invalid("اعتماد غسيل الفرش يتطلب تسجيل قياسات المصلى في الطلب.");
      if (!Object.values(input.approved).some(amount => amount > 0)) invalid("حدد كمية معتمدة لخدمة واحدة على الأقل.");
      for (const row of summarizeSeasonalCapacity(season.settings, await usage(tx, season.id))) {
        const amount = input.approved[row.service] ?? 0;
        if (amount === 0) continue;
        const requested = request.requested[row.service] ?? 0;
        if (!season.settings.services[row.service].enabled || amount > row.available) {
          invalid("السعة المتاحة لا تكفي لاعتماد " + seasonalServices[row.service].label + ".");
        }
        if (amount > requested && (!request.specialRequest || !input.note)) {
          invalid("الزيادة تحتاج إلى طلب خاص وملاحظة توضح سبب الاعتماد.");
        }
      }
      await tx.update(mawasimRequests).set({
        status: "approved",
        approved: input.approved,
        reviewNote: input.note,
        reviewedBy: ctx.user.id,
        scheduledFor: effectiveScheduledFor,
        assignedTo: input.assignedTo !== undefined ? input.assignedTo : request.assignedTo,
      }).where(eq(mawasimRequests.id, request.id));
    });
  }),

  // تقديم طلب استثناء خاص ببرنامج مواسم (منفصل تماماً عن استثناءات الطلبات العادية)
  submitException: protectedProcedure
    .input(z.object({
      reason: z.string().trim().min(5, "يرجى كتابة سبب طلب الاستثناء (5 أحرف على الأقل)"),
      attachment: z.string().trim().max(500).nullable().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      if (ctx.user.role !== "service_requester" || ctx.user.status !== "active" || ctx.user.deletedAt) {
        denied();
      }
      const db = await database();
      const linkedMosques = await db
        .select({ id: mosques.id })
        .from(mosques)
        .where(and(approvedMosque, linkedMosquesCondition(ctx.user)));
      const linkedMosqueIds = linkedMosques.map(item => item.id);
      const conditions = [
        eq(mawasimRequests.applicantId, ctx.user.id),
        eq(mawasimRequests.submittedBy, ctx.user.id),
        ...(linkedMosqueIds.length
          ? [and(isNull(mawasimRequests.applicantId), inArray(mawasimRequests.mosqueId, linkedMosqueIds))]
          : []),
      ];
      const userSeasonalRequests = await db
        .select({
          id: mawasimRequests.id,
          status: mawasimRequests.status,
          createdAt: mawasimRequests.createdAt,
          mosqueName: mawasimRequests.mosqueName,
        })
        .from(mawasimRequests)
        .where(or(...conditions))
        .orderBy(desc(mawasimRequests.id));
      const latestActive = userSeasonalRequests.find(req => isActiveSeasonalRequestStatus(req.status)) ?? null;
      if (!latestActive) {
        invalid("لا يوجد طلب فعال حالياً في برنامج مواسم يتطلب استثناءً.");
      }

      const [latestMawasimException = null] = await db
        .select()
        .from(mawasimExceptions)
        .where(eq(mawasimExceptions.userId, ctx.user.id))
        .orderBy(desc(mawasimExceptions.id))
        .limit(1);
      const evaluation = evaluateMawasimExceptionState(latestActive, latestMawasimException);
      if (evaluation.exceptionForCycle?.status === "pending") {
        invalid("لديك طلب استثناء في برنامج مواسم قيد المراجعة حالياً.");
      }
      if (evaluation.exceptionForCycle?.status === "approved") {
        invalid("لديك طلب استثناء مقبول بالفعل في برنامج مواسم، يمكنك تقديم طلبك الآن.");
      }
      if (evaluation.exceptionForCycle?.status === "rejected") {
        invalid("تم رفض طلب الاستثناء السابق في برنامج مواسم لهذا الطلب الفعال.");
      }

      await db.insert(mawasimExceptions).values({
        userId: ctx.user.id,
        activeRequestId: latestActive.id,
        reason: input.reason,
        attachment: input.attachment ?? null,
        status: "pending",
      });

      try {
        await createNotification({
          userId: ctx.user.id,
          type: "system",
          title: "تم تقديم طلب استثناء (برنامج مواسم)",
          message: "تم استلام طلب الاستثناء الخاص بك في برنامج مواسم وهو قيد المراجعة حالياً من قبل الإدارة.",
          relatedType: "user",
          relatedId: ctx.user.id,
          triggerId: "beneficiary_exception_submitted",
        });
      } catch (err) {
        console.error("Error sending self notification for mawasim exception:", err);
      }

      try {
        const admins = await db
          .select({ id: users.id })
          .from(users)
          .where(inArray(users.role, ["super_admin", "system_admin"]));
        for (const admin of admins) {
          await createNotification({
            userId: admin.id,
            type: "system",
            title: "طلب استثناء جديد (برنامج مواسم)",
            message: `قام المستفيد ${ctx.user.name} بتقديم طلب استثناء لتقديم طلب جديد في برنامج مواسم.`,
            relatedType: "user",
            relatedId: ctx.user.id,
          });
        }
      } catch (err) {
        console.error("Error sending admin notifications for mawasim exception:", err);
      }

      return { success: true };
    }),

  // جلب طلبات استثناء برنامج مواسم لقسم الاستثناءات في /requester-approvals
  getExceptionRequests: protectedProcedure.query(async ({ ctx }) => {
    const db = await database();
    const isAdmin = ["super_admin", "system_admin"].includes(ctx.user.role);
    const canView =
      isAdmin ||
      (await checkPermission(ctx.user.id, "requester_exceptions.view")) ||
      (await checkPermission(ctx.user.id, "requests.view"));
    if (!canView) return [];

    const results = await db
      .select({
        exception: mawasimExceptions,
        userName: users.name,
        userEmail: users.email,
        userPhone: users.phone,
        activeRequestMosqueName: mawasimRequests.mosqueName,
        activeRequestStatus: mawasimRequests.status,
      })
      .from(mawasimExceptions)
      .innerJoin(users, eq(mawasimExceptions.userId, users.id))
      .leftJoin(mawasimRequests, eq(mawasimExceptions.activeRequestId, mawasimRequests.id))
      .orderBy(desc(mawasimExceptions.createdAt), desc(mawasimExceptions.id));

    return results;
  }),

  // مراجعة وقبول/رفض طلب استثناء برنامج مواسم
  reviewException: protectedProcedure
    .input(z.object({
      id,
      status: z.enum(["approved", "rejected"]),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await database();
      const isAdmin = ["super_admin", "system_admin"].includes(ctx.user.role);
      const isApproved = input.status === "approved";
      const hasPermission = isApproved
        ? await checkPermission(ctx.user.id, "requester_exceptions.approve")
        : await checkPermission(ctx.user.id, "requester_exceptions.reject");
      if (!isAdmin && !hasPermission) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: isApproved
            ? "غير مصرح لك بقبول طلبات الاستثناء (تتطلب صلاحية قبول طلب الاستثناء)"
            : "غير مصرح لك برفض طلبات الاستثناء (تتطلب صلاحية رفض طلب الاستثناء)",
        });
      }

      await db
        .update(mawasimExceptions)
        .set({
          status: input.status,
          reviewedBy: ctx.user.id,
          reviewedAt: new Date(),
        })
        .where(eq(mawasimExceptions.id, input.id));

      const [exRow] = await db
        .select()
        .from(mawasimExceptions)
        .where(eq(mawasimExceptions.id, input.id))
        .limit(1);

      if (exRow) {
        try {
          const [targetUser] = await db.select().from(users).where(eq(users.id, exRow.userId)).limit(1);
          const emailTitle = "إشعار جديد من جمعية عمارة المساجد (منارة) - برنامج مواسم";
          const emailMessage = isApproved
            ? `بوابة تمام - قبول طلب استثناء برنامج مواسم\n\nالسلام عليكم ورحمة الله وبركاته،\n\nنفيدكم بأنه قد تم قبول طلب الاستثناء الخاص بكم رقم ${exRow.id} في برنامج مواسم. يمكنك الآن الدخول لبوابة مواسم وتقديم طلبك الجديد.\n\nجمعية عمارة المساجد`
            : `تم رفض طلب الاستثناء (برنامج مواسم)\n\nعذراً، تم رفض طلب الاستثناء الخاص بك في برنامج مواسم.`;

          await createNotification({
            userId: exRow.userId,
            type: "system",
            title: isApproved ? "تم قبول طلب استثناء برنامج مواسم" : "تم رفض طلب استثناء برنامج مواسم",
            message: isApproved
              ? "تم قبول طلب الاستثناء الخاص بك في برنامج مواسم، يمكنك الآن تقديم طلب مواسم جديد."
              : "عذراً، تم رفض طلب الاستثناء الخاص بك في برنامج مواسم.",
            relatedType: "user",
            relatedId: exRow.userId,
            triggerId: isApproved ? "beneficiary_exception_approved" : "beneficiary_exception_rejected",
          });

          if (targetUser?.email) {
            sendEmailNotification(targetUser.email, emailTitle, emailMessage).catch(e => {
              console.error("Failed to send mawasim exception email:", e);
            });
          }
        } catch (err) {
          console.error("Error sending user notification for mawasim exception review:", err);
        }
      }

      return { success: true };
    }),
});

function isDuplicate(error: unknown): boolean {
  if (typeof error !== "object" || error === null) return false;
  if ("code" in error && error.code === "ER_DUP_ENTRY") return true;
  return "cause" in error && isDuplicate(error.cause);
}
