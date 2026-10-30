import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { checkPermission } from "../permissions";
import { categories, disbursementRequests, fundMovements, projects, receiptVouchers } from "../../drizzle/schema";
import { FundBucket, getFundAvailable, getProjectFundableAmounts, lockFund, money } from "../fund";
import { notifyDisbursementRequestCreation } from "./notifications";

const amountSchema = z.number().finite().positive().refine((value) => Math.abs(value * 100 - Math.round(value * 100)) < 1e-6, "المبلغ يجب أن يكون بدقة هللتين");
const destinationSchema = z.object({
  restrictionType: z.enum(["general", "purpose", "project"]),
  donationPurposeId: z.number().int().positive().optional(),
  restrictedProjectId: z.number().int().positive().optional(),
});

async function authorize(ctx: any, action: "view" | "transfer" | "disburse") {
  if (["financial", "financial_manager"].includes(ctx.user.role)) return;
  const permissionId = action === "disburse" ? "disbursements.create_from_fund" : `fund.${action}`;
  if (await checkPermission(ctx.user.id, permissionId)) return;
  if (action === "view" && await checkPermission(ctx.user.id, "fund.transfer")) return;
  throw new TRPCError({ code: "FORBIDDEN", message: "ليس لديك صلاحية لهذا الإجراء في الصندوق" });
}

async function resolveBucket(db: any, target: z.infer<typeof destinationSchema>, allowInactive = false): Promise<FundBucket> {
  if (target.restrictionType === "general") return { restrictionType: "general" };
  if (target.restrictionType === "purpose") {
    if (!target.donationPurposeId) throw new TRPCError({ code: "BAD_REQUEST", message: "اختر مصرف التبرع" });
    const [purpose] = await db.select().from(categories).where(and(
      eq(categories.id, target.donationPurposeId), eq(categories.type, "donation_purposes"),
      allowInactive ? undefined : eq(categories.isActive, true),
    )).limit(1);
    if (!purpose && allowInactive) {
      const [historical] = await db.select({ name: fundMovements.donationPurposeName })
        .from(fundMovements).where(eq(fundMovements.donationPurposeId, target.donationPurposeId))
        .orderBy(desc(fundMovements.id)).limit(1);
      if (historical) return { restrictionType: "purpose", donationPurposeId: target.donationPurposeId, donationPurposeName: historical.name };
    }
    if (!purpose) throw new TRPCError({ code: "BAD_REQUEST", message: "مصرف التبرع غير صالح" });
    return { restrictionType: "purpose", donationPurposeId: purpose.id, donationPurposeName: purpose.nameAr };
  }
  if (!target.restrictedProjectId) throw new TRPCError({ code: "BAD_REQUEST", message: "اختر المشروع المقيد" });
  const [project] = await db.select({ id: projects.id }).from(projects)
    .where(eq(projects.id, target.restrictedProjectId)).limit(1);
  if (!project) throw new TRPCError({ code: "NOT_FOUND", message: "المشروع المقيد غير موجود" });
  return { restrictionType: "project", restrictedProjectId: project.id };
}

type FundRequestInput = {
  title: string; description?: string; amount: number; projectId?: number;
  adminFees?: number;
  workDescription?: string;
  beneficiaryName: string; beneficiaryBank?: string; beneficiaryIban?: string;
};

async function insertFundRequest(tx: any, input: FundRequestInput, bucket: FundBucket, userId: number) {
  const year = new Date().getFullYear();
  const prefix = `DR-${year}-`;
  const [lastRequest] = await tx.select({ requestNumber: disbursementRequests.requestNumber })
    .from(disbursementRequests).where(sql`${disbursementRequests.requestNumber} LIKE ${`${prefix}%`}`)
    .orderBy(desc(disbursementRequests.requestNumber)).limit(1);
  const lastSequence = lastRequest?.requestNumber ? Number(lastRequest.requestNumber.split("-").pop()) : 0;
  const requestNumber = `${prefix}${(Number.isFinite(lastSequence) ? lastSequence + 1 : 1).toString().padStart(4, "0")}`;
  const [inserted] = await tx.insert(disbursementRequests).values({
    requestNumber, projectId: input.projectId || null, title: input.title,
    description: input.description || `طلب صرف من الصندوق (${bucket.donationPurposeName || bucket.restrictionType})`,
    amount: input.amount.toFixed(2), adminFees: (input.adminFees || 0).toFixed(2), status: "pending", requestedBy: userId,
    attachmentsJson: JSON.stringify([{ name: "custom_supplier_info", url: JSON.stringify({
      name: input.beneficiaryName, bank: input.beneficiaryBank || null,
      iban: input.beneficiaryIban || null, bankAccountName: input.beneficiaryName,
      requiredWorksDesc: input.workDescription?.trim() || undefined,
    }) }]),
    fundingSourceName: bucket.restrictionType === "purpose" ? `الصندوق - ${bucket.donationPurposeName}`
      : bucket.restrictionType === "project" ? "فائض المشروع في الصندوق" : "الصندوق",
    fundRestrictionType: bucket.restrictionType,
    fundPurposeId: bucket.donationPurposeId || null,
    fundPurposeName: bucket.donationPurposeName || null,
    fundRestrictedProjectId: bucket.restrictedProjectId || null,
  });
  return { id: inserted.insertId, requestNumber };
}

export const fundRouter = router({
  summary: protectedProcedure.query(async ({ ctx }) => {
    await authorize(ctx, "view");
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    const posted = await db.select({
      restrictionType: fundMovements.restrictionType,
      donationPurposeId: fundMovements.donationPurposeId,
      donationPurposeName: sql<string | null>`MAX(${fundMovements.donationPurposeName})`,
      restrictedProjectId: fundMovements.restrictedProjectId,
      amount: sql<string>`COALESCE(SUM(${fundMovements.amount}), 0)`,
    }).from(fundMovements).groupBy(
      fundMovements.restrictionType, fundMovements.donationPurposeId, fundMovements.restrictedProjectId,
    );
    const buckets = await Promise.all(posted.map(async (row) => {
      const bucket: FundBucket = {
        restrictionType: row.restrictionType, donationPurposeId: row.donationPurposeId,
        donationPurposeName: row.donationPurposeName, restrictedProjectId: row.restrictedProjectId,
      };
      const balance = await getFundAvailable(db, bucket);
      return { ...bucket, ...balance };
    }));
    return {
      total: money(buckets.reduce((sum, bucket) => sum + bucket.posted, 0)),
      available: money(buckets.reduce((sum, bucket) => sum + bucket.available, 0)),
      buckets,
    };
  }),

  movements: protectedProcedure.input(z.object({
    limit: z.number().int().min(1).max(500).default(100),
    all: z.boolean().optional(),
  }).optional())
    .query(async ({ input, ctx }) => {
      await authorize(ctx, "view");
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const query = db.select().from(fundMovements).orderBy(desc(fundMovements.id));
      return input?.all ? query : query.limit(input?.limit || 100);
    }),

  projectAvailability: protectedProcedure.input(z.object({ projectId: z.number().int().positive() }))
    .query(async ({ input, ctx }) => {
      if (!["projects_office", "project_manager", "general_manager", "executive_director"].includes(ctx.user.role) &&
          !await checkPermission(ctx.user.id, "projects.financials")) await authorize(ctx, "view");
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      return getProjectFundableAmounts(db, input.projectId);
    }),

  transferableProjects: protectedProcedure.input(z.object({
    source: z.enum(["surplus", "administrative", "operational"]).default("surplus"),
  })).query(async ({ input, ctx }) => {
    await authorize(ctx, "view");
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    const candidates = await db.select({
      id: projects.id, name: projects.name, projectNumber: projects.projectNumber,
    }).from(projects).innerJoin(receiptVouchers, and(
      eq(receiptVouchers.projectId, projects.id), eq(receiptVouchers.status, "approved"),
    )).groupBy(projects.id, projects.name, projects.projectNumber);
    const eligible = [];
    for (const project of candidates) {
      let available;
      try {
        available = await getProjectFundableAmounts(db, project.id);
      } catch (error) {
        // Projects without an approved cost cannot have a transferable balance.
        if (error instanceof TRPCError && error.code === "BAD_REQUEST") continue;
        throw error;
      }
      const amount = input.source === "surplus" ? available.surplusAvailable
        : input.source === "administrative" ? available.administrativeAvailable : available.operationalAvailable;
      if (amount > 0) eligible.push({ ...project, available: amount, received: available.received, projectCost: available.projectCost, surplusTransferred: available.surplusTransferred });
    }
    return eligible;
  }),

  transferFromProject: protectedProcedure.input(z.object({
    projectId: z.number().int().positive(),
    source: z.enum(["surplus", "administrative", "operational"]),
    amount: amountSchema,
    destination: destinationSchema,
    reason: z.string().trim().optional().default(""),
    releaseRestriction: z.boolean().default(false),
  })).mutation(async ({ input, ctx }) => {
    await authorize(ctx, "transfer");
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    return db.transaction(async (tx) => {
      await lockFund(tx);
      const available = await getProjectFundableAmounts(tx, input.projectId);
      const max = input.source === "surplus" ? available.surplusAvailable
        : input.source === "administrative" ? available.administrativeAvailable : available.operationalAvailable;
      if (Math.round(input.amount * 100) > Math.round(max * 100)) {
        throw new TRPCError({ code: "BAD_REQUEST", message: `المتاح للتحويل ${max.toFixed(2)} ريال فقط` });
      }
      const bucket = await resolveBucket(tx, input.destination);
      if (input.source === "surplus" && bucket.restrictionType === "project" && bucket.restrictedProjectId !== input.projectId) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "لا يمكن نقل فائض مشروع إلى رصيد مشروع آخر دون تحرير قيده" });
      }
      if (input.source === "surplus" && bucket.restrictionType !== "project" && !input.releaseRestriction) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "تحويل فائض المشروع خارج قيده يتطلب اختيار تحرير القيد وتوثيق السبب" });
      }
      const notes = input.reason?.trim() || null;

      const eventKey = `${input.source}:${input.projectId}:${crypto.randomUUID()}`;
      await tx.insert(fundMovements).values({
        eventKey, movementType: input.source, amount: input.amount.toFixed(2),
        restrictionType: bucket.restrictionType,
        donationPurposeId: bucket.donationPurposeId || null,
        donationPurposeName: bucket.donationPurposeName || null,
        restrictedProjectId: bucket.restrictedProjectId || null,
        projectId: input.projectId,
        sourceDetailsJson: JSON.stringify({ vouchers: available.vouchers, released: input.releaseRestriction }),
        notes, createdById: ctx.user.id,
      });
      return { success: true, eventKey, remaining: money(max - input.amount) };
    });
  }),

  createDisbursementRequest: protectedProcedure.input(z.object({
    title: z.string().trim().min(3), description: z.string().optional(),
    amount: amountSchema, projectId: z.number().int().positive().optional(),
    adminFees: z.number().finite().min(0).default(0),
    workDescription: z.string().trim().optional(),
    beneficiaryName: z.string().trim().min(2), beneficiaryBank: z.string().optional(),
    beneficiaryIban: z.string().optional(),
    source: destinationSchema,
  })).mutation(async ({ input, ctx }) => {
    await authorize(ctx, "disburse");
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    const result = await db.transaction(async (tx) => {
      await lockFund(tx);
      const bucket = await resolveBucket(tx, input.source, true);
      if (bucket.restrictionType === "project" && input.projectId !== bucket.restrictedProjectId) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "هذا الرصيد مخصص للمشروع المرتبط به فقط" });
      }
      const balance = await getFundAvailable(tx, bucket);
      const totalCharge = money(input.amount + input.adminFees);
      if (Math.round(totalCharge * 100) > Math.round(balance.spendable * 100)) {
        throw new TRPCError({ code: "BAD_REQUEST", message: `الرصيد المتاح لطلب صرف جديد من هذا المصرف ${balance.spendable.toFixed(2)} ريال` });
      }
      return insertFundRequest(tx, input, bucket, ctx.user.id);
    });
    try {
      await notifyDisbursementRequestCreation(result.id, result.requestNumber, input.title, input.amount.toFixed(2), input.projectId || null);
    } catch (error) { console.error("Fund request notification failed:", error); }
    return { success: true, ...result };
  }),

  createProjectSurplusRequest: protectedProcedure.input(z.object({
    projectId: z.number().int().positive(), title: z.string().trim().min(3),
    description: z.string().optional(), amount: amountSchema,
    beneficiaryName: z.string().trim().min(2), beneficiaryBank: z.string().optional(),
    beneficiaryIban: z.string().optional(),
  })).mutation(async ({ input, ctx }) => {
    await authorize(ctx, "disburse");
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    const result = await db.transaction(async (tx) => {
      await lockFund(tx);
      const available = await getProjectFundableAmounts(tx, input.projectId);
      if (Math.round(input.amount * 100) > Math.round(available.surplusAvailable * 100)) {
        throw new TRPCError({ code: "BAD_REQUEST", message: `الفائض المتاح للمشروع ${available.surplusAvailable.toFixed(2)} ريال` });
      }
      const eventKey = `surplus:${input.projectId}:direct:${crypto.randomUUID()}`;
      await tx.insert(fundMovements).values({
        eventKey, movementType: "surplus", amount: input.amount.toFixed(2),
        restrictionType: "project", restrictedProjectId: input.projectId,
        projectId: input.projectId, sourceDetailsJson: JSON.stringify({ vouchers: available.vouchers, directRequest: true }),
        notes: `تخصيص فائض المشروع لطلب صرف مباشر: ${input.title}`, createdById: ctx.user.id,
      });
      return insertFundRequest(tx, input, { restrictionType: "project", restrictedProjectId: input.projectId }, ctx.user.id);
    });
    try {
      await notifyDisbursementRequestCreation(result.id, result.requestNumber, input.title, input.amount.toFixed(2), input.projectId);
    } catch (error) { console.error("Project surplus request notification failed:", error); }
    return { success: true, ...result };
  }),
});
