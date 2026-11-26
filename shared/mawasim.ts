import { z } from "zod";

export const seasonalServices = {
  carpet: { label: "غسيل الفرش", unit: "م²", scale: 100 },
  water: { label: "سقيا الماء", unit: "كرتون", scale: 1 },
  maintenance: { label: "صيانة دورات المياه والكهرباء", unit: "مسجد", scale: 1 },
  audio: { label: "ضبط الصوتيات", unit: "مسجد", scale: 1 },
  fragrance: { label: "تعطير المسجد", unit: "مسجد", scale: 1 },
} as const;
export type SeasonalService = keyof typeof seasonalServices;
export const seasonalServiceIds = Object.keys(seasonalServices) as SeasonalService[];
export const seasonalRequestStatuses = ["submitted", "approved", "scheduled", "completed", "rejected"] as const;
export const seasonalStatusLabels: Record<typeof seasonalRequestStatuses[number], string> = {
  submitted: "قيد المراجعة", approved: "معتمد", scheduled: "مجدول", completed: "منفّذ", rejected: "معتذر عنه",
};

export * from "./mawasimPermissions";

export function mayApplyForSeason(user: { role: string; status: string; requesterType: string | null }, ownsMosque: boolean, delegated: boolean) {
  return user.role === "service_requester" && user.status === "active" &&
    (delegated || (ownsMosque && ["imam", "muezzin", "إمام", "مؤذن"].includes(user.requesterType ?? "")));
}

const quantity = z.number().int().min(0).max(100_000_000);
export const seasonalQuantitiesSchema = z.partialRecord(z.enum(seasonalServiceIds), quantity);
export type SeasonalQuantities = z.infer<typeof seasonalQuantitiesSchema>;
const serviceLimits = z.object({
  enabled: z.boolean(),
  capacity: quantity,
  perMosqueLimit: quantity,
  budgetHalalas: z.number().int().min(0).max(100_000_000_000),
  unitPriceHalalas: z.number().int().min(0).max(100_000_000),
});
export const seasonalSettingsSchema = z.object({
  services: z.record(z.enum(seasonalServiceIds), serviceLimits),
  largeMosqueWorshippers: z.number().int().min(0).max(100_000),
  largeMosqueWaterLimit: quantity,
}).superRefine((settings, ctx) => {
  for (const key of seasonalServiceIds) {
    const service = settings.services[key];
    if (service.budgetHalalas > 0 && service.unitPriceHalalas === 0) {
      ctx.addIssue({ code: "custom", path: ["services", key, "unitPriceHalalas"], message: "أدخل تكلفة الوحدة عند تحديد ميزانية." });
    }
    if (service.enabled && seasonalCapacity(key, service) === 0) {
      ctx.addIssue({ code: "custom", path: ["services", key, "capacity"], message: "حدد سعة موجبة للخدمة المفعّلة." });
    }
  }
});
export type SeasonalSettings = z.infer<typeof seasonalSettingsSchema>;
export function defaultSeasonalSettings(): SeasonalSettings {
  return {
    services: Object.fromEntries(seasonalServiceIds.map(key => [key, {
      enabled: false, capacity: 0, perMosqueLimit: 0, budgetHalalas: 0, unitPriceHalalas: 0,
    }])) as SeasonalSettings["services"],
    largeMosqueWorshippers: 0,
    largeMosqueWaterLimit: 0,
  };
}

export function seasonalCapacity(service: SeasonalService, limits: SeasonalSettings["services"][SeasonalService]) {
  const funded = limits.budgetHalalas > 0 && limits.unitPriceHalalas > 0
    ? Math.floor(limits.budgetHalalas * seasonalServices[service].scale / limits.unitPriceHalalas)
    : Number.POSITIVE_INFINITY;
  if (limits.capacity === 0 && !Number.isFinite(funded)) return 0;
  return Math.min(limits.capacity || funded, funded, 100_000_000);
}

export type SeasonalRequestLimits = Pick<SeasonalSettings, "largeMosqueWorshippers" | "largeMosqueWaterLimit"> & {
  services: Record<SeasonalService, Pick<SeasonalSettings["services"][SeasonalService], "enabled" | "perMosqueLimit">>;
};

export function seasonalMosqueLimit(service: SeasonalService, settings: SeasonalRequestLimits, worshippers: number) {
  if (service === "water" && settings.largeMosqueWorshippers > 0 &&
      settings.largeMosqueWaterLimit > 0 && worshippers >= settings.largeMosqueWorshippers) {
    return settings.largeMosqueWaterLimit;
  }
  return settings.services[service].perMosqueLimit || (seasonalServices[service].unit === "مسجد" ? 1 : Number.POSITIVE_INFINITY);
}

export const prayerMeasurementsSchema = z.object({
  lengthCm: z.number().int().min(1).max(100_000),
  widthCm: z.number().int().min(1).max(100_000),
});

export function carpetArea(men: z.infer<typeof prayerMeasurementsSchema>, women?: z.infer<typeof prayerMeasurementsSchema> | null) {
  return Math.round((men.lengthCm * men.widthCm + (women ? women.lengthCm * women.widthCm : 0)) / 100);
}

export const seasonalMosqueSnapshotSchema = z.object({
  city: z.string().trim().min(1).max(100),
  district: z.string().trim().min(1).max(100),
  address: z.string().trim().min(1).max(500),
  worshippers: z.number().int().min(1).max(100_000),
  men: prayerMeasurementsSchema.nullable().default(null),
  women: prayerMeasurementsSchema.nullable().default(null),
});
export type SeasonalMosqueSnapshot = z.infer<typeof seasonalMosqueSnapshotSchema>;

export const seasonalExecutionSchema = z.object({
  men: prayerMeasurementsSchema,
  women: prayerMeasurementsSchema.nullable(),
  performed: seasonalQuantitiesSchema,
  notes: z.string().trim().max(2000),
}).refine(result => (result.performed.carpet ?? 0) <= carpetArea(result.men, result.women), {
  path: ["performed", "carpet"], message: "المساحة المغسولة تتجاوز المساحة المقاسة.",
});
export type SeasonalExecution = z.infer<typeof seasonalExecutionSchema>;

export function summarizeSeasonalCapacity(
  settings: SeasonalSettings,
  requests: { status: string; requested: SeasonalQuantities; approved: SeasonalQuantities | null; execution: SeasonalExecution | null }[],
) {
  return seasonalServiceIds.map(service => {
    const limit = seasonalCapacity(service, settings.services[service]);
    let requested = 0;
    let approved = 0;
    let performed = 0;
    let reserved = 0;
    for (const request of requests) {
      if (request.status === "rejected") continue;
      requested += request.requested[service] ?? 0;
      approved += request.approved?.[service] ?? 0;
      performed += request.execution?.performed[service] ?? 0;
      reserved += (request.status === "completed" ? request.execution?.performed[service] : request.approved?.[service]) ?? 0;
    }
    return { service, limit, requested, approved, performed, reserved, available: Math.max(0, limit - reserved) };
  });
}

export function isActiveSeasonalRequestStatus(status: string): boolean {
  return status !== "completed" && status !== "rejected";
}

export interface MawasimActiveRequestSummary {
  id: number;
  status: string;
  createdAt: Date | string;
  mosqueName?: string | null;
  seasonTitle?: string | null;
}

export interface MawasimExceptionSummary {
  id: number;
  activeRequestId?: number | null;
  consumedByRequestId?: number | null;
  status: string;
  reason?: string;
  createdAt: Date | string;
  reviewedAt?: Date | string | null;
}

/**
 * Evaluates whether a service_requester is blocked from submitting a new Mawasim request
 * due to an active seasonal request, strictly isolated from regular service requests/exceptions.
 */
export function evaluateMawasimExceptionState<
  TReq extends MawasimActiveRequestSummary,
  TExc extends MawasimExceptionSummary,
>(
  activeRequest: TReq | null | undefined,
  latestException: TExc | null | undefined,
) {
  if (!activeRequest || !isActiveSeasonalRequestStatus(activeRequest.status)) {
    return {
      isBlocked: false,
      activeRequest: null,
      exceptionForCycle: null as TExc | null,
    };
  }

  const activeTime = new Date(activeRequest.createdAt).getTime();
  const isForCurrentCycle = Boolean(
    latestException &&
    !latestException.consumedByRequestId &&
    (latestException.activeRequestId
      ? latestException.activeRequestId === activeRequest.id
      : new Date(latestException.createdAt).getTime() >= activeTime),
  );
  const exceptionForCycle = isForCurrentCycle && latestException ? latestException : null;

  return {
    isBlocked: exceptionForCycle?.status !== "approved",
    activeRequest,
    exceptionForCycle,
  };
}

export type SeasonalRequestSort =
  | "newest"
  | "governorate_asc"
  | "governorate_desc"
  | "city_asc"
  | "city_desc";

export interface SeasonalFilterableRequest {
  id: number;
  mosqueName: string;
  governorate: string | null;
  mosqueCity: string | null;
  status: string;
  snapshot: {
    city?: string | null;
    district?: string | null;
  };
}

export function normalizeSeasonalReviewStatus(status: string): "submitted" | "scheduled" | "approved" | "rejected" {
  return status === "completed" ? "approved" : (status as "submitted" | "scheduled" | "approved" | "rejected");
}

const SEASONAL_REQUESTER_TYPE_LABELS: Record<string, string> = {
  imam: "إمام",
  muezzin: "مؤذن",
  donor: "متبرع",
  board_member: "عضو مجلس إدارة",
  committee_member: "عضو لجنة",
  volunteer: "متطوع",
  other: "أخرى",
};

export function formatSeasonalRequesterType(type: string | null | undefined): string | null {
  const trimmed = type?.trim();
  if (!trimmed) return null;
  return SEASONAL_REQUESTER_TYPE_LABELS[trimmed] ?? trimmed;
}

export function getSeasonalGovernorate(request: Pick<SeasonalFilterableRequest, "governorate">): string {
  return request.governorate?.trim() || "";
}

export function getSeasonalCity(request: Pick<SeasonalFilterableRequest, "snapshot" | "mosqueCity">): string {
  return request.snapshot.city?.trim() || request.mosqueCity?.trim() || "";
}

function compareTextEmptyLast(a: string, b: string, dir: 1 | -1): number {
  if (!a && !b) return 0;
  if (!a) return 1;
  if (!b) return -1;
  return a.localeCompare(b, "ar") * dir;
}

export function filterAndSortSeasonalRequests<T extends SeasonalFilterableRequest>(
  list: ReadonlyArray<T>,
  options: {
    statusFilter: "all" | "submitted" | "scheduled" | "approved" | "rejected";
    governorateFilter: string;
    cityFilter: string;
    searchQuery: string;
    sortBy: SeasonalRequestSort;
  },
): T[] {
  const term = options.searchQuery.trim().toLowerCase();
  const filtered = list.filter(row => {
    if (options.statusFilter !== "all" && normalizeSeasonalReviewStatus(row.status) !== options.statusFilter) {
      return false;
    }
    const gov = getSeasonalGovernorate(row);
    const city = getSeasonalCity(row);
    if (options.governorateFilter !== "all" && gov !== options.governorateFilter) return false;
    if (options.cityFilter !== "all" && city !== options.cityFilter) return false;
    if (term) {
      const hay = `${row.id} ${row.mosqueName} ${gov} ${city} ${row.snapshot.district ?? ""}`.toLowerCase();
      if (!hay.includes(term)) return false;
    }
    return true;
  });

  if (options.sortBy === "newest") return filtered;
  const dir: 1 | -1 = options.sortBy.endsWith("_desc") ? -1 : 1;
  const primaryGov = options.sortBy.startsWith("governorate_");

  return [...filtered].sort((a, b) => {
    const first = primaryGov
      ? compareTextEmptyLast(getSeasonalGovernorate(a), getSeasonalGovernorate(b), dir)
      : compareTextEmptyLast(getSeasonalCity(a), getSeasonalCity(b), dir);
    if (first !== 0) return first;
    const second = primaryGov
      ? compareTextEmptyLast(getSeasonalCity(a), getSeasonalCity(b), dir)
      : compareTextEmptyLast(getSeasonalGovernorate(a), getSeasonalGovernorate(b), dir);
    if (second !== 0) return second;
    return b.id - a.id;
  });
}

export function summarizeSeasonalByGovernorateCity(
  rows: ReadonlyArray<Pick<SeasonalFilterableRequest, "governorate" | "mosqueCity" | "snapshot">>,
) {
  const map = new Map<string, number>();
  for (const row of rows) {
    const location = [getSeasonalGovernorate(row), getSeasonalCity(row)].filter(Boolean).join(" · ");
    if (!location) continue;
    map.set(location, (map.get(location) ?? 0) + 1);
  }
  return Array.from(map, ([name, value]) => ({ name, value })).sort(
    (a, b) => b.value - a.value || a.name.localeCompare(b.name, "ar"),
  );
}

export const seasonalExtraServiceCategoryIds = [
  "audio",
  "carpet",
  "water",
  "maintenance",
  "fragrance",
  "other",
] as const;

export type SeasonalExtraServiceCategory = (typeof seasonalExtraServiceCategoryIds)[number];

export const seasonalExtraServiceCategoryLabels: Record<SeasonalExtraServiceCategory, string> = {
  audio: "ضبط الصوتيات / صوتيات",
  carpet: "غسيل أو تأمين الفرش",
  water: "سقيا الماء",
  maintenance: "صيانة دورات المياه والكهرباء",
  fragrance: "تعطير المسجد",
  other: "خدمة أخرى",
};

export const seasonalExtraServiceItemSchema = z.object({
  id: z.string().trim().min(1).max(64),
  category: z.enum(seasonalExtraServiceCategoryIds),
  title: z.string().trim().min(2, "أدخل وصف أو اسم الخدمة الإضافية.").max(160),
  quantity: z.number().positive("أدخل كمية موجبة.").max(100_000),
  unit: z.string().trim().min(1, "أدخل وحدة القياس.").max(40),
  costHalalas: z.number().int().min(0, "المصرف لا يمكن أن يكون سالباً.").max(100_000_000),
  notes: z.string().trim().max(500).optional(),
});

export const seasonalExtraServicesSchema = z.array(seasonalExtraServiceItemSchema).max(20);

export type SeasonalExtraServiceItem = z.infer<typeof seasonalExtraServiceItemSchema>;

export interface SeasonalExtraExpenseEntry extends SeasonalExtraServiceItem {
  requestId: number;
  mosqueName: string;
  requestStatus: string;
  scheduledFor?: string | null;
  createdAt?: Date | string | null;
}

export interface SeasonalExtraExpensesSummary {
  totalHalalas: number;
  approvedHalalas: number;
  pendingHalalas: number;
  items: SeasonalExtraExpenseEntry[];
}

export function formatHalalasToSar(halalas: number): string {
  return (halalas / 100).toLocaleString("ar-SA", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

export function summarizeSeasonalExtraExpenses(
  rows: ReadonlyArray<{
    id: number;
    mosqueName: string;
    status: string;
    scheduledFor?: string | null;
    createdAt?: Date | string | null;
    extraServices?: ReadonlyArray<SeasonalExtraServiceItem> | null;
  }>,
): SeasonalExtraExpensesSummary {
  let totalHalalas = 0;
  let approvedHalalas = 0;
  let pendingHalalas = 0;
  const items: SeasonalExtraExpenseEntry[] = [];

  for (const row of rows) {
    if (row.status === "rejected") continue;
    const extras = row.extraServices;
    if (!Array.isArray(extras) || extras.length === 0) continue;
    const isApproved = row.status === "approved" || row.status === "completed";
    for (const item of extras) {
      const cost = Math.max(0, Math.round(Number(item.costHalalas) || 0));
      totalHalalas += cost;
      if (isApproved) {
        approvedHalalas += cost;
      } else {
        pendingHalalas += cost;
      }
      items.push({
        ...item,
        costHalalas: cost,
        requestId: row.id,
        mosqueName: row.mosqueName,
        requestStatus: row.status,
        scheduledFor: row.scheduledFor ?? null,
        createdAt: row.createdAt ?? null,
      });
    }
  }

  return {
    totalHalalas,
    approvedHalalas,
    pendingHalalas,
    items,
  };
}
