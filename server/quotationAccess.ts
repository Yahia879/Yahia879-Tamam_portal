import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { mosqueRequests, projects, quotations } from "../drizzle/schema";
import { isSedanaQuotationRequest } from "../shared/quotationPermissions";
import { getDb } from "./db";
import { calculateUserPermissions, checkPermissions } from "./permissions";

type Db = NonNullable<Awaited<ReturnType<typeof getDb>>>;

export async function quotationRequest(db: Db, target: { requestId?: number | null; projectId?: number | null }) {
  let requestId = target.requestId;
  if (target.projectId) {
    const [project] = await db.select({ requestId: projects.requestId }).from(projects).where(eq(projects.id, target.projectId)).limit(1);
    if (!project || (requestId && requestId !== project.requestId)) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "المشروع لا يتطابق مع الطلب" });
    }
    requestId ??= project.requestId;
  }
  if (!requestId) throw new TRPCError({ code: "BAD_REQUEST", message: "رقم الطلب مطلوب" });
  const [request] = await db.select({ id: mosqueRequests.id, programType: mosqueRequests.programType, requestNumber: mosqueRequests.requestNumber })
    .from(mosqueRequests).where(eq(mosqueRequests.id, requestId)).limit(1);
  if (!request) throw new TRPCError({ code: "NOT_FOUND", message: "الطلب غير موجود" });
  return request;
}

export async function requireQuotationAccess(db: Db, userId: number, target: { requestId?: number | null; projectId?: number | null }, generalAction: string, sedanaAction = generalAction) {
  const request = await quotationRequest(db, target);
  const prefix = isSedanaQuotationRequest(request) ? "sedana_quotations" : "quotations";
  const action = prefix === "sedana_quotations" ? sedanaAction : generalAction;
  const required = [`${prefix}.view`, `${prefix}.${action}`];
  if (!await checkPermissions(userId, required)) {
    throw new TRPCError({ code: "FORBIDDEN", message: `ليس لديك صلاحية: ${prefix}.${action}` });
  }
  return request;
}

export async function requireQuotationRecordAccess(db: Db, userId: number, id: number, generalAction: string, sedanaAction = generalAction) {
  const [quotation] = await db.select().from(quotations).where(eq(quotations.id, id)).limit(1);
  if (!quotation) throw new TRPCError({ code: "NOT_FOUND", message: "عرض السعر غير موجود" });
  await requireQuotationAccess(db, userId, quotation, generalAction, sedanaAction);
  return quotation;
}

// Related request/project/contract screens retain their own authorized read access.
export async function requireRelatedQuotationRead(db: Db, userId: number, target: { requestId: number }) {
  const request = await quotationRequest(db, target);
  const view = isSedanaQuotationRequest(request) ? "sedana_quotations.view" : "quotations.view";
  const permissions = await calculateUserPermissions(userId);
  if ([view, "requests.view_details", "projects.view_details", "projects.financials", "contracts.view", "boq.view"].some(p => permissions.includes(p))) return;
  throw new TRPCError({ code: "FORBIDDEN", message: "ليس لديك صلاحية عرض عروض الأسعار المرتبطة بهذا الطلب" });
}
