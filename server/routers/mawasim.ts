import { TRPCError } from "@trpc/server";
import { and, desc, eq, getTableColumns, inArray, isNull, like, or } from "drizzle-orm";
import { z } from "zod";
import { mawasimGrants, mawasimRequests, mawasimSeasons } from "../../drizzle/mawasim";
import { mosques, users } from "../../drizzle/schema";
import {
  canManageMawasim, carpetArea, seasonalMosqueLimit,
  seasonalMosqueSnapshotSchema, seasonalQuantitiesSchema, seasonalServiceIds, seasonalServices,
  seasonalSettingsSchema, summarizeSeasonalCapacity,
} from "../../shared/mawasim";
import { protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";

const id = z.number().int().positive();
const seasonInput = z.object({ seasonId: id });
const requestInput = z.object({ seasonId: id, requestId: id });
const approvedMosque = eq(mosques.approvalStatus, "approved");
const mosqueFields = {
  id: mosques.id, name: mosques.name, city: mosques.city, district: mosques.district,
  address: mosques.address, capacity: mosques.capacity,
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
const mawasimProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.status !== "active" || ctx.user.deletedAt || !canManageMawasim(ctx.user.role)) denied();
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
  portal: protectedProcedure.input(seasonInput.optional()).query(async () => {
    denied();
  }),

  staff: mawasimProcedure.input(seasonInput.optional()).query(async ({ input }) => {
    const db = await database();
    const seasons = await db.select().from(mawasimSeasons)
      .orderBy(desc(mawasimSeasons.hijriYear), desc(mawasimSeasons.id));
    const season = input ? seasons.find(item => item.id === input.seasonId) : seasons[0];
    if (!season) return { seasons, season: null, requests: [], capacity: [], grants: [] };
    const requests = await db.select({
      ...requestFields, assignee: users.name,
    }).from(mawasimRequests).leftJoin(users, eq(users.id, mawasimRequests.assignedTo))
      .where(eq(mawasimRequests.seasonId, season.id)).orderBy(desc(mawasimRequests.id));
    const capacity = summarizeSeasonalCapacity(season.settings, requests);
    const grants = await db.select({
      id: mawasimGrants.id, reason: mawasimGrants.reason, active: mawasimGrants.active,
      mosque: mosques.name, applicant: users.name,
    }).from(mawasimGrants).innerJoin(mosques, eq(mosques.id, mawasimGrants.mosqueId))
      .innerJoin(users, eq(users.id, mawasimGrants.userId)).where(eq(mawasimGrants.seasonId, season.id))
      .orderBy(desc(mawasimGrants.id));
    return { seasons, season, requests, capacity, grants };
  }),

  searchMosques: mawasimProcedure.input(z.object({ search: z.string().trim().max(80).optional() }).optional()).query(async ({ input }) => {
    const db = await database();
    const term = input?.search?.trim() ?? "";
    const rows = await db.select(mosqueFields).from(mosques).where(and(
      approvedMosque,
      term ? or(
        like(mosques.name, "%" + term + "%"),
        like(mosques.city, "%" + term + "%"),
        like(mosques.district, "%" + term + "%"),
      ) : undefined,
    )).orderBy(mosques.name).limit(500);
    if (!rows.length) return [];
    const saved = await db.select({
      mosqueId: mawasimRequests.mosqueId, snapshot: mawasimRequests.snapshot,
    }).from(mawasimRequests).where(and(
      inArray(mawasimRequests.mosqueId, rows.map(mosque => mosque.id)),
      inArray(mawasimRequests.status, ["approved", "scheduled", "completed"]),
    )).orderBy(desc(mawasimRequests.createdAt), desc(mawasimRequests.id));
    return rows.map(mosque => {
      const previous = saved.find(item => item.mosqueId === mosque.id)?.snapshot;
      if (!previous || previous.men) return { ...mosque, previous };
      const measurements = saved.find(item => item.mosqueId === mosque.id && item.snapshot.men)?.snapshot;
      return { ...mosque, previous: measurements ? { ...previous, men: measurements.men, women: measurements.women } : previous };
    });
  }),

  photos: mawasimProcedure.input(requestInput).query(async ({ input }) => {
    const db = await database();
    const [request] = await db.select({ menPhoto, womenPhoto }).from(mawasimRequests).where(and(
      eq(mawasimRequests.id, input.requestId), eq(mawasimRequests.seasonId, input.seasonId),
    ));
    return request ?? notFound();
  }),

  saveSeason: mawasimProcedure.input(z.object({
    id: id.optional(), hijriYear: z.number().int().min(1400).max(1600),
    title: z.string().trim().min(3).max(160), isOpen: z.boolean(), settings: seasonalSettingsSchema,
  })).mutation(async ({ input }) => {
    if (input.isOpen && !seasonalServiceIds.some(service => input.settings.services[service].enabled)) {
      invalid("فعّل خدمة واحدة على الأقل قبل فتح التسجيل.");
    }
    const db = await database();
    const { id: seasonId, ...values } = input;
    return db.transaction(async tx => {
      if (!seasonId) return (await tx.insert(mawasimSeasons).values(values).$returningId())[0];
      await lockedSeason(tx, seasonId);
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
    const db = await database();
    await db.transaction(async tx => {
      await lockedSeason(tx, input.seasonId);
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

  revokeGrant: mawasimProcedure.input(seasonInput.extend({ grantId: id })).mutation(async ({ input }) => {
    const db = await database();
    await db.transaction(async tx => {
      await lockedSeason(tx, input.seasonId);
      await tx.update(mawasimGrants).set({ active: false }).where(and(
        eq(mawasimGrants.id, input.grantId), eq(mawasimGrants.seasonId, input.seasonId),
      ));
    });
  }),

  submit: mawasimProcedure.input(seasonInput.extend({
    mosqueId: id, snapshot: seasonalMosqueSnapshotSchema, menPhoto: photo.optional(), womenPhoto: photo.optional(),
    requested: seasonalQuantitiesSchema, specialRequest: z.string().trim().max(2000).optional(),
    pledge: z.literal(true),
    onBehalf: z.object({
      name: z.string().trim().min(2).max(150), phone: z.string().trim().regex(/^\+?[0-9]{8,15}$/),
      reason: z.string().trim().min(3).max(500), email: z.email().max(320).optional(),
    }).optional(),
  })).mutation(async ({ input, ctx }) => {
    const { onBehalf, snapshot, menPhoto, womenPhoto } = input;
    const carpet = input.requested.carpet ?? 0;
    if (carpet > 0) {
      if (!snapshot.men) invalid("أدخل قياسات مصلى الرجال لطلب غسيل الفرش.");
      if (!menPhoto) invalid("أرفق صورة مصلى الرجال لطلب غسيل الفرش.");
      if (!snapshot.women && womenPhoto) invalid("صورة مصلى النساء تتطلب تسجيل بياناته.");
      if (carpet !== carpetArea(snapshot.men, snapshot.women)) {
        invalid("مساحة الغسيل المطلوبة يجب أن تطابق أبعاد المصليات المسجلة.");
      }
    }

    const db = await database();
    try {
      return await db.transaction(async tx => {
        const season = await lockedSeason(tx, input.seasonId);
        if (!season.isOpen) invalid("التسجيل لهذا الموسم مغلق.");
        const [mosque] = await tx.select({ id: mosques.id, name: mosques.name })
          .from(mosques).where(and(eq(mosques.id, input.mosqueId), approvedMosque));
        if (!mosque) invalid("اختر مسجدًا معتمدًا.");
        let applicantId: number | null = null;
        if (onBehalf?.email) {
          const [applicant] = await tx.select({ id: users.id }).from(users).where(and(eq(users.email, onBehalf.email),
            eq(users.role, "service_requester"), eq(users.status, "active"), isNull(users.deletedAt)));
          if (!applicant) invalid("لم يُعثر على حساب مستفيد نشط بهذا البريد.");
          applicantId = applicant.id;
        }
        const capacity = summarizeSeasonalCapacity(season.settings, await usage(tx, season.id));
        let selected = 0;
        for (const row of capacity) {
          const amount = input.requested[row.service] ?? 0;
          if (amount === 0) continue;
          selected++;
          if (!season.settings.services[row.service].enabled || amount > row.available ||
              amount > seasonalMosqueLimit(row.service, season.settings, input.snapshot.worshippers)) {
            invalid("راجع السعة المتاحة والحد لكل مسجد لخدمة " + seasonalServices[row.service].label + ".");
          }
        }
        if (!selected) invalid("اختر خدمة واحدة على الأقل.");
        const [created] = await tx.insert(mawasimRequests).values({
          seasonId: season.id, mosqueId: mosque.id, applicantId, submittedBy: ctx.user.id, mosqueName: mosque.name,
          snapshot: carpet > 0 ? snapshot : { ...snapshot, men: null, women: null },
          menPhoto: carpet > 0 ? menPhoto : null, womenPhoto: carpet > 0 ? womenPhoto : null,
          requested: input.requested, specialRequest: input.specialRequest,
          contact: onBehalf ?? { name: ctx.user.name, phone: ctx.user.phone ?? "", email: ctx.user.email },
        }).$returningId();
        return created;
      });
    } catch (error) {
      if (isDuplicate(error)) throw new TRPCError({ code: "CONFLICT", message: "يوجد طلب لهذا المسجد في الموسم نفسه." });
      throw error;
    }
  }),

  review: mawasimProcedure.input(requestInput.extend({
    approved: seasonalQuantitiesSchema.nullable(), note: z.string().trim().max(2000),
  })).mutation(async ({ input, ctx }) => {
    const db = await database();
    await db.transaction(async tx => {
      const { season, request } = await lockedRequest(tx, input);
      if (input.approved === null) {
        if (request.status === "completed" || request.status === "rejected" || !input.note) invalid("أدخل سبب الاعتذار عن طلب قائم.");
        await tx.update(mawasimRequests).set({ status: "rejected", approved: null, reviewNote: input.note, reviewedBy: ctx.user.id })
          .where(eq(mawasimRequests.id, request.id));
        return;
      }
      if (request.status !== "submitted") invalid("الطلب سبق أن روجع.");
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
      await tx.update(mawasimRequests).set({ status: "approved", approved: input.approved, reviewNote: input.note, reviewedBy: ctx.user.id })
        .where(eq(mawasimRequests.id, request.id));
    });
  }),
});

function isDuplicate(error: unknown): boolean {
  if (typeof error !== "object" || error === null) return false;
  if ("code" in error && error.code === "ER_DUP_ENTRY") return true;
  return "cause" in error && isDuplicate(error.cause);
}
