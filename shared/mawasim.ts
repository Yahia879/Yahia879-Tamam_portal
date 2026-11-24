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

export function canManageMawasim(role: string | undefined) {
  return role === "super_admin";
}

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
