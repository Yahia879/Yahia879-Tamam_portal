import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { eq, desc } from "drizzle-orm";
import { router, protectedProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { finalReports, mosqueRequests, projects, mosques, users } from "../../drizzle/schema";

export const finalReportsRouter = router({
  // إنشاء تقرير ختامي جديد
  create: protectedProcedure
    .input(
      z.object({
        requestId: z.number(),
        projectId: z.number().optional(),
        summary: z.string().min(1, "الملخص مطلوب"),
        achievements: z.string().optional(),
        challenges: z.string().optional(),
        totalCost: z.string().optional(),
        completionDate: z.string().optional(),
        satisfactionRating: z.number().min(1).max(5).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "قاعدة البيانات غير متاحة" });

      // التحقق من وجود الطلب
      const requestResult = await db.select().from(mosqueRequests).where(eq(mosqueRequests.id, input.requestId)).limit(1);
      if (requestResult.length === 0) {
        throw new TRPCError({ code: "NOT_FOUND", message: "الطلب غير موجود" });
      }

      // التحقق من الصلاحية
      const allowedRoles = ["super_admin", "system_admin", "projects_office", "project_manager"];
      if (!allowedRoles.includes(ctx.user.role)) {
        throw new TRPCError({ code: "FORBIDDEN", message: "ليس لديك صلاحية لرفع التقرير الختامي" });
      }

      // البحث عن المشروع المرتبط إن لم يُحدد
      let projectId = input.projectId;
      if (!projectId) {
        const projectResult = await db.select({ id: projects.id }).from(projects)
          .where(eq(projects.requestId, input.requestId)).limit(1);
        if (projectResult.length > 0) {
          projectId = projectResult[0].id;
        }
      }

      // إنشاء التقرير
      const [result] = await db.insert(finalReports).values({
        requestId: input.requestId,
        projectId: projectId || null,
        preparedBy: ctx.user.id,
        summary: input.summary,
        achievements: input.achievements || null,
        challenges: input.challenges || null,
        totalCost: input.totalCost || null,
        completionDate: input.completionDate ? new Date(input.completionDate) : null,
        satisfactionRating: input.satisfactionRating || null,
      });

      // الانتقال للمرحلة handover تلقائياً
      const currentRequest = requestResult[0];
      if (currentRequest.currentStage === "execution") {
        await db.update(mosqueRequests).set({
          currentStage: "handover",
          currentResponsibleDepartment: "مكتب المشاريع",
        }).where(eq(mosqueRequests.id, input.requestId));
      }

      return { success: true, reportId: result.insertId };
    }),

  // جلب التقارير الختامية لطلب معين
  getByRequestId: protectedProcedure
    .input(z.object({ requestId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      return await db.select().from(finalReports)
        .where(eq(finalReports.requestId, input.requestId))
        .orderBy(desc(finalReports.createdAt));
    }),

  // جلب تقرير ختامي بالمعرف مع تفاصيل كاملة
  getWithDetails: protectedProcedure
    .input(z.object({ reportId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "قاعدة البيانات غير متاحة" });

      const reportResult = await db.select().from(finalReports)
        .where(eq(finalReports.id, input.reportId)).limit(1);
      if (reportResult.length === 0) {
        throw new TRPCError({ code: "NOT_FOUND", message: "التقرير غير موجود" });
      }
      const report = reportResult[0];

      // جلب بيانات الطلب
      const requestResult = await db.select().from(mosqueRequests)
        .where(eq(mosqueRequests.id, report.requestId)).limit(1);
      const request = requestResult[0] || null;

      // جلب بيانات المسجد
      let mosque = null;
      if (request?.mosqueId) {
        const mosqueResult = await db.select().from(mosques)
          .where(eq(mosques.id, request.mosqueId)).limit(1);
        mosque = mosqueResult[0] || null;
      }

      // جلب بيانات المشروع
      let project = null;
      if (report.projectId) {
        const projectResult = await db.select().from(projects)
          .where(eq(projects.id, report.projectId)).limit(1);
        project = projectResult[0] || null;
      }

      // جلب بيانات المُعِد
      const preparedByResult = await db.select({
        id: users.id,
        name: users.name,
        email: users.email,
      }).from(users).where(eq(users.id, report.preparedBy)).limit(1);
      const preparedBy = preparedByResult[0] || null;

      return { report, request, mosque, project, preparedBy };
    }),

  // جلب جميع التقارير الختامية
  list: protectedProcedure
    .query(async () => {
      const db = await getDb();
      if (!db) return [];
      return await db.select().from(finalReports)
        .orderBy(desc(finalReports.createdAt))
        .limit(100);
    }),
});
