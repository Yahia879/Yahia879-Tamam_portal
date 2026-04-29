import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { eq, and, desc } from "drizzle-orm";
import { router, protectedProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { 
  handovers, 
  handoverTypes, 
  handoverStatuses,
  projects,
  mosqueRequests,
  users
} from "../../drizzle/schema";

export const handoversRouter = router({
  // إنشاء استلام جديد
  create: protectedProcedure
    .input(
      z.object({
        projectId: z.number(),
        requestId: z.number(),
        type: z.enum(handoverTypes),
        handoverDate: z.string().optional(),
        completionPercentage: z.string().optional(),
        notes: z.string().optional(),
        documentUrl: z.string().optional(),
        photosUrls: z.array(z.string()).optional(),
        warrantyDurationMonths: z.number().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "قاعدة البيانات غير متاحة" });

      const { projectId, requestId, type, ...rest } = input;

      // التحقق من وجود المشروع
      const projectResult = await db.select().from(projects).where(eq(projects.id, projectId)).limit(1);
      const project = projectResult.length > 0 ? projectResult[0] : null;

      if (!project) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "المشروع غير موجود",
        });
      }

      // إنشاء الاستلام
      const [handover] = await db.insert(handovers).values({
        projectId,
        requestId,
        type,
        handoverDate: rest.handoverDate ? new Date(rest.handoverDate) : null,
        completionPercentage: rest.completionPercentage || "0",
        notes: rest.notes || null,
        documentUrl: rest.documentUrl || null,
        photosUrls: rest.photosUrls || null,
        status: "pending",
        warrantyDurationMonths: rest.warrantyDurationMonths || null,
        createdBy: ctx.user.id,
      });

      return { success: true, handoverId: handover.insertId };
    }),

  // جلب استلامات مشروع معين
  list: protectedProcedure
    .input(
      z.object({
        projectId: z.number().optional(),
        type: z.enum(handoverTypes).optional(),
      }).optional().default({})
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];

      const { projectId, type } = input;

      const conditions = [];
      if (projectId) {
        conditions.push(eq(handovers.projectId, projectId));
      }
      if (type) {
        conditions.push(eq(handovers.type, type));
      }

      const results = await db
        .select({
          id: handovers.id,
          projectId: handovers.projectId,
          requestId: handovers.requestId,
          type: handovers.type,
          handoverDate: handovers.handoverDate,
          completionPercentage: handovers.completionPercentage,
          notes: handovers.notes,
          documentUrl: handovers.documentUrl,
          photosUrls: handovers.photosUrls,
          status: handovers.status,
          approvedBy: handovers.approvedBy,
          approvedAt: handovers.approvedAt,
          approvalNotes: handovers.approvalNotes,
          warrantyStartDate: handovers.warrantyStartDate,
          warrantyEndDate: handovers.warrantyEndDate,
          warrantyDurationMonths: handovers.warrantyDurationMonths,
          createdBy: handovers.createdBy,
          createdAt: handovers.createdAt,
          createdByName: users.name,
          projectNumber: projects.projectNumber,
        })
        .from(handovers)
        .leftJoin(users, eq(handovers.createdBy, users.id))
        .leftJoin(projects, eq(handovers.projectId, projects.id))
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(handovers.createdAt));

      return results;
    }),

  // جلب تفاصيل استلام
  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "قاعدة البيانات غير متاحة" });

      const handoverResult = await db.select().from(handovers).where(eq(handovers.id, input.id)).limit(1);
      const handover = handoverResult.length > 0 ? handoverResult[0] : null;

      if (!handover) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "الاستلام غير موجود",
        });
      }

      return handover;
    }),

  // اعتماد استلام
  approve: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        approvalNotes: z.string().optional(),
        warrantyStartDate: z.string().optional(),
        warrantyEndDate: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "قاعدة البيانات غير متاحة" });

      const { id, approvalNotes, warrantyStartDate, warrantyEndDate } = input;

      const handoverResult = await db.select().from(handovers).where(eq(handovers.id, id)).limit(1);
      const handover = handoverResult.length > 0 ? handoverResult[0] : null;

      if (!handover) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "الاستلام غير موجود",
        });
      }

      if (handover.status !== "pending") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "لا يمكن اعتماد استلام تم معالجته بالفعل",
        });
      }

      await db
        .update(handovers)
        .set({
          status: "approved",
          approvedBy: ctx.user.id,
          approvedAt: new Date(),
          approvalNotes: approvalNotes || null,
          warrantyStartDate: warrantyStartDate ? new Date(warrantyStartDate) : null,
          warrantyEndDate: warrantyEndDate ? new Date(warrantyEndDate) : null,
        })
        .where(eq(handovers.id, id));

      return { success: true };
    }),

  // رفض استلام
  reject: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        approvalNotes: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "قاعدة البيانات غير متاحة" });

      const { id, approvalNotes } = input;

      const handoverResult = await db.select().from(handovers).where(eq(handovers.id, id)).limit(1);
      const handover = handoverResult.length > 0 ? handoverResult[0] : null;

      if (!handover) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "الاستلام غير موجود",
        });
      }

      if (handover.status !== "pending") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "لا يمكن رفض استلام تم معالجته بالفعل",
        });
      }

      await db
        .update(handovers)
        .set({
          status: "rejected",
          approvedBy: ctx.user.id,
          approvedAt: new Date(),
          approvalNotes,
        })
        .where(eq(handovers.id, id));

      return { success: true };
    }),

  // تحديث حالة إلى "مكتمل"
  complete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "قاعدة البيانات غير متاحة" });

      const { id } = input;

      const handoverResult = await db.select().from(handovers).where(eq(handovers.id, id)).limit(1);
      const handover = handoverResult.length > 0 ? handoverResult[0] : null;

      if (!handover) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "الاستلام غير موجود",
        });
      }

      if (handover.status !== "approved") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "يجب أن يكون الاستلام معتمداً أولاً",
        });
      }

      await db
        .update(handovers)
        .set({
          status: "completed",
        })
        .where(eq(handovers.id, id));

      return { success: true };
    }),

  // التحقق من اكتمال الشروط المسبقة للدفعة الختامية
  checkFinalPaymentPrerequisites: protectedProcedure
    .input(z.object({ projectId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "قاعدة البيانات غير متاحة" });

      const { projectId } = input;

      // جلب جميع الاستلامات
      const allHandovers = await db
        .select()
        .from(handovers)
        .where(eq(handovers.projectId, projectId));

      // التحقق من الاستلام النهائي
      const finalHandover = allHandovers.find(
        (h: any) => h.type === "final" && h.status === "approved"
      );

      // التحقق من فترة الضمان
      const warrantyHandover = allHandovers.find(
        (h: any) => h.type === "warranty" && h.status === "completed"
      );

      return {
        finalHandoverCompleted: !!finalHandover,
        warrantyCompleted: !!warrantyHandover,
        finalHandoverId: finalHandover?.id,
        warrantyHandoverId: warrantyHandover?.id,
      };
    }),
});
