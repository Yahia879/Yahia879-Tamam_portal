import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { sedanaInquiries, users, mosques } from "../../drizzle/schema";
import { eq, desc, and, or, sql, like } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { createNotification } from "./notifications";

export const sedanaInquiriesRouter = router({
  // تقديم استبيان تأهيل سدانة من قبل الإمام
  submitInquiry: protectedProcedure
    .input(
      z.object({
        mosqueId: z.number(),
        specificNeeds: z.string().min(5, "يرجى توضيح الاحتياج بحد أدنى 5 أحرف"),
        hasCleaningWarehouse: z.enum(["yes", "no", "partial"]).default("yes"),
        warehouseDetails: z.string().optional().nullable(),
        hasOperationalPlan: z.enum(["yes", "no"]).default("yes"),
        operationalPlanDetails: z.string().optional().nullable(),
        additionalNotes: z.string().optional().nullable(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "تعذر الاتصال بقاعدة البيانات" });
      }

      // التحقق من أن المسجد معتمد إذا كان المستخدم service_requester
      if (ctx.user.role === "service_requester") {
        const [mosque] = await db
          .select({ id: mosques.id, approvalStatus: mosques.approvalStatus })
          .from(mosques)
          .where(eq(mosques.id, input.mosqueId))
          .limit(1);

        if (!mosque || mosque.approvalStatus !== "approved") {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "لا يمكن تقديم استبيان تأهيل سدانة إلا لمسجد معتمد رسمياً من قِبل الجمعية.",
          });
        }
      }

      // التحقق من وجود استبيان معلق مسبقاً لهذا المسجد من نفس المستخدم
      const [existingPending] = await db
        .select()
        .from(sedanaInquiries)
        .where(
          and(
            eq(sedanaInquiries.userId, ctx.user.id),
            eq(sedanaInquiries.mosqueId, input.mosqueId),
            eq(sedanaInquiries.status, "pending")
          )
        )
        .limit(1);

      if (existingPending) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "لديك استبيان تأهيل قيد المراجعة والتواصل بالفعل لهذا المسجد، سيتم التواصل معك قريباً من قِبل الفريق.",
        });
      }

      // إضافة الاستبيان الجديد
      const [result] = await db.insert(sedanaInquiries).values({
        userId: ctx.user.id,
        mosqueId: input.mosqueId,
        specificNeeds: input.specificNeeds,
        hasCleaningWarehouse: input.hasCleaningWarehouse,
        warehouseDetails: input.warehouseDetails || null,
        hasOperationalPlan: input.hasOperationalPlan,
        operationalPlanDetails: input.operationalPlanDetails || null,
        additionalNotes: input.additionalNotes || null,
        status: "pending",
      });

      return {
        success: true,
        message: "تم إرسال استبيان طلب سدانة بنجاح، وسيتم التواصل معك هاتفياً من قِبل فريق الجمعية.",
        inquiryId: (result as any)?.insertId,
      };
    }),

  // الحصول على أحدث حالة استبيان تأهيل للمستخدم الحالي (لمسجد محدد أو أحدث استبيان)
  getMyInquiryStatus: protectedProcedure
    .input(
      z.object({
        mosqueId: z.number().optional(),
      }).optional()
    )
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) return null;

      const conditions = [eq(sedanaInquiries.userId, ctx.user.id)];
      if (input?.mosqueId) {
        conditions.push(eq(sedanaInquiries.mosqueId, input.mosqueId));
      }

      const [inquiry] = await db
        .select({
          id: sedanaInquiries.id,
          mosqueId: sedanaInquiries.mosqueId,
          specificNeeds: sedanaInquiries.specificNeeds,
          hasCleaningWarehouse: sedanaInquiries.hasCleaningWarehouse,
          warehouseDetails: sedanaInquiries.warehouseDetails,
          hasOperationalPlan: sedanaInquiries.hasOperationalPlan,
          operationalPlanDetails: sedanaInquiries.operationalPlanDetails,
          additionalNotes: sedanaInquiries.additionalNotes,
          status: sedanaInquiries.status,
          actionType: sedanaInquiries.actionType,
          actionNotes: sedanaInquiries.actionNotes,
          redirectProgram: sedanaInquiries.redirectProgram,
          reviewedAt: sedanaInquiries.reviewedAt,
          completedRequestId: sedanaInquiries.completedRequestId,
          createdAt: sedanaInquiries.createdAt,
          mosqueName: mosques.name,
          mosqueCity: mosques.city,
        })
        .from(sedanaInquiries)
        .leftJoin(mosques, eq(sedanaInquiries.mosqueId, mosques.id))
        .where(and(...conditions))
        .orderBy(desc(sedanaInquiries.createdAt))
        .limit(1);

      return inquiry || null;
    }),

  // جلب كافة الاستبيانات للوحة الإدارة
  getAllInquiries: protectedProcedure
    .input(
      z.object({
        status: z.enum(["all", "pending", "approved", "rejected"]).optional().default("all"),
        search: z.string().optional(),
      }).optional()
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];

      let query = db
        .select({
          inquiry: sedanaInquiries,
          userName: users.name,
          userPhone: users.phone,
          userEmail: users.email,
          userRole: users.role,
          requesterType: users.requesterType,
          mosqueName: mosques.name,
          mosqueCity: mosques.city,
          mosqueDistrict: mosques.district,
          reviewerName: sql<string | null>`(SELECT name FROM users WHERE users.id = ${sedanaInquiries.reviewedBy})`,
        })
        .from(sedanaInquiries)
        .innerJoin(users, eq(sedanaInquiries.userId, users.id))
        .innerJoin(mosques, eq(sedanaInquiries.mosqueId, mosques.id))
        .$dynamic();

      const conditions = [];

      if (input?.status && input.status !== "all") {
        conditions.push(eq(sedanaInquiries.status, input.status));
      }

      if (input?.search && input.search.trim()) {
        const searchTerm = `%${input.search.trim()}%`;
        conditions.push(
          or(
            like(users.name, searchTerm),
            like(users.phone, searchTerm),
            like(mosques.name, searchTerm),
            like(sedanaInquiries.specificNeeds, searchTerm)
          )
        );
      }

      if (conditions.length > 0) {
        query = query.where(and(...conditions));
      }

      const results = await query.orderBy(desc(sedanaInquiries.createdAt));
      return results;
    }),

  // إحصائيات الاستبيانات لشارات التبويب
  getInquiriesStats: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) return { total: 0, pending: 0, approved: 0, rejected: 0 };

    const results = await db
      .select({
        status: sedanaInquiries.status,
        count: sql<number>`count(*)`,
      })
      .from(sedanaInquiries)
      .groupBy(sedanaInquiries.status);

    const stats = { total: 0, pending: 0, approved: 0, rejected: 0 };
    results.forEach(r => {
      const cnt = Number(r.count) || 0;
      stats.total += cnt;
      if (r.status === "pending") stats.pending = cnt;
      else if (r.status === "approved") stats.approved = cnt;
      else if (r.status === "rejected") stats.rejected = cnt;
    });

    return stats;
  }),

  // مراجعة الاستبيان واتخاذ إجراء (قبول وتمكين أو رفض/توجيه)
  reviewInquiry: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        status: z.enum(["approved", "rejected"]),
        actionType: z.enum(["enable_sedana", "redirect_alternative", "reject"]).default("enable_sedana"),
        actionNotes: z.string().min(1, "يرجى تسجيل ملاحظات المكالمة الهاتفية والتوجيه"),
        redirectProgram: z.string().optional().nullable(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "تعذر الاتصال بقاعدة البيانات" });
      }

      const [inquiry] = await db
        .select()
        .from(sedanaInquiries)
        .where(eq(sedanaInquiries.id, input.id))
        .limit(1);

      if (!inquiry) {
        throw new TRPCError({ code: "NOT_FOUND", message: "الاستبيان غير موجود" });
      }

      await db
        .update(sedanaInquiries)
        .set({
          status: input.status,
          actionType: input.actionType,
          actionNotes: input.actionNotes,
          redirectProgram: input.redirectProgram || null,
          reviewedBy: ctx.user.id,
          reviewedAt: new Date(),
        })
        .where(eq(sedanaInquiries.id, input.id));

      // إرسال إشعار للمستفيد
      try {
        if (input.status === "approved") {
          await createNotification({
            userId: inquiry.userId,
            type: "system",
            title: "الموافقة على تأهيل المسجد لبرنامج سدانة",
            message: `تم اعتماد تأهيل مسجدكم لبرنامج سدانة بعد مراجعة الفريق! يمكنك الآن الدخول وتوقيع الاتفاقية وإكمال رفع الطلب.`,
            relatedType: "sedana_inquiry",
            relatedId: inquiry.id,
          });
        } else {
          await createNotification({
            userId: inquiry.userId,
            type: "system",
            title: "تحديث بشأن استبيان برنامج سدانة",
            message: input.actionNotes || "تمت مراجعة استبيان سدانة، ويرجى الاطلاع على توجيه فريق المشاريع في صفحة الطلب.",
            relatedType: "sedana_inquiry",
            relatedId: inquiry.id,
          });
        }
      } catch (notifErr) {
        console.error("Error creating notification for sedana inquiry review:", notifErr);
      }

      return {
        success: true,
        message: input.status === "approved"
          ? "تم قبول وتأهيل المسجد بنجاح، وأصبح بإمكان الإمام رفع طلب سدانة وتوقيع الاتفاقية."
          : "تم حفظ الرفض / التوجيه بنجاح وإشعار الإمام.",
      };
    }),

  // ربط الاستبيان برقم الطلب المكتمل عند رفعه
  linkCompletedRequest: protectedProcedure
    .input(
      z.object({
        inquiryId: z.number(),
        requestId: z.number(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) return { success: false };

      await db
        .update(sedanaInquiries)
        .set({ completedRequestId: input.requestId })
        .where(eq(sedanaInquiries.id, input.inquiryId));

      return { success: true };
    }),
});
