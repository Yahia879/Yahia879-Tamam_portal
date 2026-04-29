import { z } from "zod";
import { eq, and, gte, lte, count, avg, sum, desc, isNotNull, sql } from "drizzle-orm";
import { router, protectedProcedure } from "../_core/trpc";
import { getDb } from "../db";
import {
  mosqueRequests,
  finalReports,
  projects,
  mosques,
  fieldVisitReports,
  contracts,
} from "../../drizzle/schema";

export const analyticsRouter = router({
  // مؤشرات الأداء الرئيسية KPI
  getKPIs: protectedProcedure
    .input(
      z.object({
        fromDate: z.string().optional(),
        toDate: z.string().optional(),
        programType: z.string().optional(),
      }).optional()
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return null;

      const fromDate = input?.fromDate ? new Date(input.fromDate) : undefined;
      const toDate = input?.toDate ? new Date(input.toDate) : undefined;

      // إجمالي الطلبات
      const totalRequestsResult = await db
        .select({ count: count() })
        .from(mosqueRequests);
      const totalRequests = totalRequestsResult[0]?.count || 0;

      // الطلبات المغلقة
      const closedRequestsResult = await db
        .select({ count: count() })
        .from(mosqueRequests)
        .where(eq(mosqueRequests.currentStage, "closed"));
      const closedRequests = closedRequestsResult[0]?.count || 0;

      // الطلبات قيد التنفيذ
      const activeRequestsResult = await db
        .select({ count: count() })
        .from(mosqueRequests)
        .where(
          sql`${mosqueRequests.currentStage} NOT IN ('closed', 'submitted', 'initial_review')`
        );
      const activeRequests = activeRequestsResult[0]?.count || 0;

      // الطلبات الجديدة (في مرحلة المراجعة الأولية)
      const newRequestsResult = await db
        .select({ count: count() })
        .from(mosqueRequests)
        .where(
          sql`${mosqueRequests.currentStage} IN ('submitted', 'initial_review')`
        );
      const newRequests = newRequestsResult[0]?.count || 0;

      // متوسط تقييم الجودة
      const avgRatingResult = await db
        .select({ avg: avg(finalReports.satisfactionRating) })
        .from(finalReports)
        .where(isNotNull(finalReports.satisfactionRating));
      const avgRating = Number(avgRatingResult[0]?.avg || 0);

      // إجمالي التكاليف من التقارير الختامية
      const totalCostResult = await db
        .select({ total: sum(finalReports.totalCost) })
        .from(finalReports)
        .where(isNotNull(finalReports.totalCost));
      const totalCost = Number(totalCostResult[0]?.total || 0);

      // إجمالي المساجد المستفيدة
      const benefitedMosquesResult = await db
        .select({ count: sql<number>`COUNT(DISTINCT ${mosqueRequests.mosqueId})` })
        .from(mosqueRequests)
        .where(eq(mosqueRequests.currentStage, "closed"));
      const benefitedMosques = Number(benefitedMosquesResult[0]?.count || 0);

      // المشاريع المكتملة
      const completedProjectsResult = await db
        .select({ count: count() })
        .from(projects)
        .where(eq(projects.status, "completed"));
      const completedProjects = completedProjectsResult[0]?.count || 0;

      // توزيع الطلبات حسب البرنامج
      const byProgramResult = await db
        .select({
          programType: mosqueRequests.programType,
          count: count(),
        })
        .from(mosqueRequests)
        .groupBy(mosqueRequests.programType);

      // توزيع الطلبات حسب المرحلة
      const byStageResult = await db
        .select({
          stage: mosqueRequests.currentStage,
          count: count(),
        })
        .from(mosqueRequests)
        .groupBy(mosqueRequests.currentStage);

      // آخر 6 تقارير ختامية
      const recentReports = await db
        .select({
          id: finalReports.id,
          requestId: finalReports.requestId,
          satisfactionRating: finalReports.satisfactionRating,
          totalCost: finalReports.totalCost,
          completionDate: finalReports.completionDate,
          createdAt: finalReports.createdAt,
        })
        .from(finalReports)
        .orderBy(desc(finalReports.createdAt))
        .limit(6);

      // توزيع الطلبات حسب الشهر (آخر 12 شهر)
      const monthlyTrend = await db
        .select({
          month: sql<string>`DATE_FORMAT(${mosqueRequests.createdAt}, '%Y-%m')`,
          count: count(),
        })
        .from(mosqueRequests)
        .where(
          gte(mosqueRequests.createdAt, new Date(Date.now() - 365 * 24 * 60 * 60 * 1000))
        )
        .groupBy(sql`DATE_FORMAT(${mosqueRequests.createdAt}, '%Y-%m')`)
        .orderBy(sql`DATE_FORMAT(${mosqueRequests.createdAt}, '%Y-%m')`);

      return {
        summary: {
          totalRequests,
          closedRequests,
          activeRequests,
          newRequests,
          avgRating: Math.round(avgRating * 10) / 10,
          totalCost,
          benefitedMosques,
          completedProjects,
          completionRate: totalRequests > 0 ? Math.round((closedRequests / totalRequests) * 100) : 0,
        },
        byProgram: byProgramResult,
        byStage: byStageResult,
        recentReports,
        monthlyTrend,
      };
    }),
});
