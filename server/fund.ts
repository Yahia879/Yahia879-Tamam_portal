import { and, desc, eq, inArray, notInArray, sql } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import {
  contractsEnhanced,
  disbursementOrders,
  disbursementRequests,
  fundMovements,
  mosqueRequests,
  projectFinancialDetails,
  projects,
  quotations,
  receiptVouchers,
} from "../drizzle/schema";

export type FundBucket = {
  restrictionType: "general" | "purpose" | "project";
  donationPurposeId?: number | null;
  donationPurposeName?: string | null;
  restrictedProjectId?: number | null;
};

export const money = (value: unknown) => Math.round(Number(value || 0) * 100) / 100;
const cents = (value: unknown) => Math.round(Number(value || 0) * 100);

export function computeProjectFundable(input: {
  received: number; projectCost: number; adminFee: number; operationalFee: number;
  surplusTransferred: number; adminTransferred: number; operationalTransferred: number;
}) {
  const supplierShare = Math.max(0, input.projectCost - input.adminFee);
  const adminRealized = Math.max(0, Math.min(input.adminFee,
    input.received - input.surplusTransferred - supplierShare));
  return {
    surplusAvailable: Math.max(0, money(input.received - input.projectCost - input.operationalFee - input.surplusTransferred)),
    administrativeAvailable: Math.max(0, money(adminRealized - input.adminTransferred)),
    operationalAvailable: Math.max(0, money(Math.min(input.operationalFee,
      input.received - input.projectCost - input.surplusTransferred) - input.operationalTransferred)),
  };
}

export function bucketCondition(bucket: FundBucket) {
  return and(
    eq(fundMovements.restrictionType, bucket.restrictionType),
    bucket.restrictionType === "purpose"
      ? eq(fundMovements.donationPurposeId, bucket.donationPurposeId!)
      : bucket.restrictionType === "project"
        ? eq(fundMovements.restrictedProjectId, bucket.restrictedProjectId!)
        : sql`${fundMovements.donationPurposeId} IS NULL AND ${fundMovements.restrictedProjectId} IS NULL`,
  );
}

export function requestBucketCondition(bucket: FundBucket) {
  return and(
    eq(disbursementRequests.fundRestrictionType, bucket.restrictionType),
    bucket.restrictionType === "purpose"
      ? eq(disbursementRequests.fundPurposeId, bucket.donationPurposeId!)
      : bucket.restrictionType === "project"
        ? eq(disbursementRequests.fundRestrictedProjectId, bucket.restrictedProjectId!)
        : sql`${disbursementRequests.fundPurposeId} IS NULL AND ${disbursementRequests.fundRestrictedProjectId} IS NULL`,
  );
}

export async function getFundAvailable(db: any, bucket: FundBucket, excludeRequestId?: number) {
  const [posted] = await db.select({ amount: sql<string>`COALESCE(SUM(${fundMovements.amount}), 0)` })
    .from(fundMovements).where(bucketCondition(bucket));
  const [reserved] = await db.select({ amount: sql<string>`COALESCE(SUM(${disbursementRequests.amount}), 0)` })
    .from(disbursementRequests).where(and(
      requestBucketCondition(bucket),
      notInArray(disbursementRequests.status, ["rejected", "paid"]),
      excludeRequestId ? sql`${disbursementRequests.id} <> ${excludeRequestId}` : undefined,
    ));
  return {
    posted: money(posted?.amount),
    reserved: money(reserved?.amount),
    available: money((cents(posted?.amount) - cents(reserved?.amount)) / 100),
  };
}

export async function lockFund(db: any) {
  await db.execute(sql`SELECT id FROM fund_lock WHERE id = 1 FOR UPDATE`);
}

export function voucherBucket(voucher: typeof receiptVouchers.$inferSelect): FundBucket | null {
  if (voucher.projectId) return null;
  const legacyPurpose = voucher.notes?.startsWith("مصرف التبرع:")
    ? voucher.notes.slice("مصرف التبرع:".length).split("|")[0].trim() : null;
  const category = voucher.category === "project_linked"
    ? (legacyPurpose ? "restricted" : "unrestricted") : voucher.category;
  return category === "restricted"
    ? { restrictionType: "purpose", donationPurposeId: voucher.donationPurposeId, donationPurposeName: voucher.donationPurposeName || legacyPurpose }
    : { restrictionType: "general" };
}

export async function postVoucherDeposit(db: any, voucher: typeof receiptVouchers.$inferSelect, userId?: number) {
  const bucket = voucherBucket(voucher);
  if (!bucket || voucher.status !== "approved") return;
  if (bucket.restrictionType === "purpose" && !bucket.donationPurposeId) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "يجب ربط مصرف التبرع بتصنيف مسجل قبل إيداعه في الصندوق" });
  }
  const [current] = await db.select({ amount: sql<string>`COALESCE(SUM(${fundMovements.amount}), 0)` })
    .from(fundMovements).where(and(
      eq(fundMovements.voucherId, voucher.id),
      inArray(fundMovements.movementType, ["receipt", "receipt_reversal"]),
    ));
  const difference = money((cents(voucher.amount) - cents(current?.amount)) / 100);
  if (difference <= 0) return;
  const [firstDeposit] = await db.select({ id: fundMovements.id }).from(fundMovements)
    .where(eq(fundMovements.eventKey, `receipt:${voucher.id}:deposit`)).limit(1);
  const eventKey = firstDeposit
    ? `receipt:${voucher.id}:reapproval:${crypto.randomUUID()}` : `receipt:${voucher.id}:deposit`;
  await db.insert(fundMovements).values({
    eventKey, movementType: "receipt", amount: difference.toFixed(2),
    restrictionType: bucket.restrictionType, donationPurposeId: bucket.donationPurposeId || null,
    donationPurposeName: bucket.donationPurposeName || null,
    voucherId: voucher.id, notes: `إيداع من سند القبض ${voucher.voucherNumber}`,
    createdById: userId || voucher.createdById,
  }).onDuplicateKeyUpdate({ set: { eventKey } });
}

export async function reverseVoucherDeposit(db: any, voucher: typeof receiptVouchers.$inferSelect, userId: number, reason: string) {
  const [deposit] = await db.select().from(fundMovements)
    .where(and(eq(fundMovements.voucherId, voucher.id), eq(fundMovements.movementType, "receipt"))).limit(1);
  if (!deposit) return;
  const [current] = await db.select({ amount: sql<string>`COALESCE(SUM(${fundMovements.amount}), 0)` })
    .from(fundMovements).where(and(
      eq(fundMovements.voucherId, voucher.id),
      inArray(fundMovements.movementType, ["receipt", "receipt_reversal"]),
    ));
  if (cents(current?.amount) <= 0) return;
  const bucket: FundBucket = {
    restrictionType: deposit.restrictionType,
    donationPurposeId: deposit.donationPurposeId,
    donationPurposeName: deposit.donationPurposeName,
    restrictedProjectId: deposit.restrictedProjectId,
  };
  const balance = await getFundAvailable(db, bucket);
  if (cents(balance.available) < cents(current?.amount)) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "لا يمكن إلغاء اعتماد السند بعد استخدام رصيده من الصندوق. عالج طلبات الصرف المرتبطة أولاً" });
  }
  await db.insert(fundMovements).values({
    eventKey: `receipt:${voucher.id}:reversal:${crypto.randomUUID()}`, movementType: "receipt_reversal",
    amount: (-money(current?.amount)).toFixed(2), restrictionType: deposit.restrictionType,
    donationPurposeId: deposit.donationPurposeId, donationPurposeName: deposit.donationPurposeName,
    restrictedProjectId: deposit.restrictedProjectId, voucherId: voucher.id,
    notes: reason, createdById: userId,
  });
}

export async function getProjectFundableAmounts(db: any, projectId: number) {
  const [project] = await db.select().from(projects).where(eq(projects.id, projectId)).limit(1);
  if (!project) throw new TRPCError({ code: "NOT_FOUND", message: "المشروع غير موجود" });
  const vouchers = await db.select().from(receiptVouchers).where(and(
    eq(receiptVouchers.projectId, projectId), eq(receiptVouchers.status, "approved"),
  ));
  const received = money(vouchers.reduce((sum: number, voucher: any) => sum + cents(voucher.amount), 0) / 100);
  const [financial] = await db.select().from(projectFinancialDetails)
    .where(eq(projectFinancialDetails.projectId, projectId)).limit(1);
  const [contract] = await db.select().from(contractsEnhanced)
    .where(eq(contractsEnhanced.projectId, projectId)).orderBy(desc(contractsEnhanced.createdAt)).limit(1);
  let projectCost = money(contract?.contractAmount);
  if (!projectCost && financial?.approvedQuotationId) {
    const [quote] = await db.select().from(quotations)
      .where(eq(quotations.id, financial.approvedQuotationId)).limit(1);
    projectCost = money(quote?.approvedAmount || quote?.negotiatedAmount || quote?.finalAmount || quote?.totalAmount);
  }
  if (!projectCost) projectCost = money(financial?.supportAmount);
  if (!projectCost) throw new TRPCError({ code: "BAD_REQUEST", message: "يجب تحديد تكلفة المشروع المعتمدة قبل تحويل الفائض" });
  const posted = await db.select({ movementType: fundMovements.movementType, amount: fundMovements.amount })
    .from(fundMovements).where(eq(fundMovements.projectId, projectId));
  const surplusTransferred = money(posted.filter((m: any) => m.movementType === "surplus")
    .reduce((sum: number, m: any) => sum + cents(m.amount), 0) / 100);
  const adminTransferred = money(posted.filter((m: any) => m.movementType === "administrative")
    .reduce((sum: number, m: any) => sum + cents(m.amount), 0) / 100);
  const savedAdminFee = money(financial?.adminFeeAmount);
  const adminFee = savedAdminFee > 0 ? savedAdminFee : money(
    financial?.adminFeeType === "fixed" ? financial?.adminFeeValue
      : projectCost * Number(financial?.adminFeeValue || 0) / 100,
  );
  let operationalFee = 0;
  if (project.requestId) {
    const [request] = await db.select({ programData: mosqueRequests.programData })
      .from(mosqueRequests).where(eq(mosqueRequests.id, project.requestId)).limit(1);
    try {
      let program: any = request?.programData;
      while (typeof program === "string") program = JSON.parse(program);
      const funding = program?.sedanaFundingDetails;
      if (funding) operationalFee = money(Number(funding.actualMosqueCost || 0) * Number(funding.operationalFeePercent || 0) / 100);
    } catch { /* Legacy request data may be malformed. */ }
  }
  const operationalTransferred = money(posted.filter((m: any) => m.movementType === "operational")
    .reduce((sum: number, m: any) => sum + cents(m.amount), 0) / 100);
  const fundable = computeProjectFundable({
    received, projectCost, adminFee, operationalFee,
    surplusTransferred, adminTransferred, operationalTransferred,
  });
  return {
    received, projectCost, surplusTransferred, adminTransferred, operationalTransferred,
    ...fundable,
    vouchers: vouchers.map((voucher: any) => ({ id: voucher.id, amount: voucher.amount, voucherNumber: voucher.voucherNumber })),
  };
}

export async function postFundDisbursement(
  db: any,
  order: typeof disbursementOrders.$inferSelect,
  request: typeof disbursementRequests.$inferSelect,
  userId: number,
) {
  if (!request.fundRestrictionType) return;
  const [prior] = await db.select({ amount: sql<string>`COALESCE(SUM(${fundMovements.amount}), 0)` })
    .from(fundMovements).where(and(
      eq(fundMovements.requestId, request.id),
      inArray(fundMovements.movementType, ["disbursement", "disbursement_reversal"]),
    ));
  if (request.status === "paid" || cents(prior?.amount) < 0) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "تم صرف هذا الطلب من الصندوق سابقاً" });
  }
  const bucket: FundBucket = {
    restrictionType: request.fundRestrictionType,
    donationPurposeId: request.fundPurposeId,
    donationPurposeName: request.fundPurposeName,
    restrictedProjectId: request.fundRestrictedProjectId,
  };
  const balance = await getFundAvailable(db, bucket, request.id);
  if (cents(order.amount) > cents(request.amount) || cents(order.amount) > cents(balance.available)) {
    throw new TRPCError({ code: "BAD_REQUEST", message: `رصيد الصندوق المتاح لهذا المصرف ${balance.available.toFixed(2)} ريال` });
  }
  const eventKey = `disbursement:${order.id}`;
  await db.insert(fundMovements).values({
    eventKey, movementType: "disbursement", amount: (-money(order.amount)).toFixed(2),
    restrictionType: bucket.restrictionType,
    donationPurposeId: bucket.donationPurposeId || null,
    donationPurposeName: bucket.donationPurposeName || null,
    restrictedProjectId: bucket.restrictedProjectId || null,
    projectId: request.projectId, requestId: request.id, disbursementOrderId: order.id,
    notes: `صرف بموجب أمر الصرف ${order.orderNumber}`, createdById: userId,
  });
}
