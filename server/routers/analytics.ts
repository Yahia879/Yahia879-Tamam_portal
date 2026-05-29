import { z } from "zod";
import { eq, and, gte, lte, count, avg, sum, desc, isNotNull, sql } from "drizzle-orm";
import { router, protectedProcedure } from "../_core/trpc";
import { permissionProcedure } from "../permissions";
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
  getKPIs: permissionProcedure("reports.view")
    .input(
      z.object({
        fromDate: z.string().optional(),
        toDate: z.string().optional(),
        programType: z.string().optional(),
        status: z.string().optional(),
      }).optional()
    )
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) return null;

      // بناء الشروط الديناميكية
      const conditions: any[] = [];
      
      if (input?.fromDate) {
        conditions.push(gte(mosqueRequests.createdAt, new Date(input.fromDate)));
      }
      if (input?.toDate) {
        conditions.push(lte(mosqueRequests.createdAt, new Date(input.toDate)));
      }
      if (input?.programType && input.programType !== "all") {
        conditions.push(eq(mosqueRequests.programType, input.programType as any));
      }
      if (input?.status && input.status !== "all") {
        conditions.push(eq(mosqueRequests.status, input.status as any));
      }

      // احترام صلاحيات المستخدم (توحيد المنطق مع requests.search)
      if (ctx.user.role === "service_requester") {
        conditions.push(eq(mosqueRequests.userId, ctx.user.id));
      } else if (ctx.user.role === "field_team") {
        conditions.push(
          sql`(${mosqueRequests.assignedTo} = ${ctx.user.id} OR ${mosqueRequests.currentStage} = 'field_visit')`
        );
      } else if (ctx.user.role === "quick_response") {
        conditions.push(
          sql`(${mosqueRequests.assignedTo} = ${ctx.user.id} OR ${mosqueRequests.priority} = 'urgent')`
        );
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      // إجمالي الطلبات (مفلترة)
      const totalRequestsResult = await db
        .select({ count: count() })
        .from(mosqueRequests)
        .where(whereClause);
      const totalRequests = totalRequestsResult[0]?.count || 0;

      // الطلبات المغلقة (مفلترة)
      const closedRequestsResult = await db
        .select({ count: count() })
        .from(mosqueRequests)
        .where(and(whereClause, eq(mosqueRequests.currentStage, "closed")));
      const closedRequests = closedRequestsResult[0]?.count || 0;

      // الطلبات قيد التنفيذ (مفلترة)
      const activeRequestsResult = await db
        .select({ count: count() })
        .from(mosqueRequests)
        .where(
          and(
            whereClause,
            sql`${mosqueRequests.currentStage} NOT IN ('closed', 'submitted', 'initial_review')`
          )
        );
      const activeRequests = activeRequestsResult[0]?.count || 0;

      // إجمالي المساجد المستفيدة (مفلترة)
      const benefitedMosquesResult = await db
        .select({ count: sql<number>`COUNT(DISTINCT ${mosqueRequests.mosqueId})` })
        .from(mosqueRequests)
        .where(whereClause);
      const benefitedMosques = Number(benefitedMosquesResult[0]?.count || 0);

      // متوسط تقييم الجودة (مرتبط بالطلبات المفلترة)
      const avgRatingResult = await db
        .select({ avg: avg(finalReports.satisfactionRating) })
        .from(finalReports)
        .innerJoin(mosqueRequests, eq(finalReports.requestId, mosqueRequests.id))
        .where(and(whereClause, isNotNull(finalReports.satisfactionRating)));
      const avgRating = Number(avgRatingResult[0]?.avg || 0);

      // إجمالي التكاليف (مفلترة) - نستخدم التكلفة الفعلية من التقرير الختامي إذا وجدت، وإلا الميزانية المعتمدة
      const totalCostResult = await db
        .select({ 
          total: sql<number>`SUM(COALESCE(${finalReports.totalCost}, ${mosqueRequests.approvedBudget}, 0))` 
        })
        .from(mosqueRequests)
        .leftJoin(finalReports, eq(mosqueRequests.id, finalReports.requestId))
        .where(whereClause);
      const totalCost = Number(totalCostResult[0]?.total || 0);

      // توزيع الطلبات حسب البرنامج (مفلتر)
      const byProgramResult = await db
        .select({
          programType: mosqueRequests.programType,
          count: count(),
        })
        .from(mosqueRequests)
        .where(whereClause)
        .groupBy(mosqueRequests.programType);

      // توزيع الطلبات حسب المرحلة (مفلتر)
      const byStageResult = await db
        .select({
          stage: mosqueRequests.currentStage,
          count: count(),
        })
        .from(mosqueRequests)
        .where(whereClause)
        .groupBy(mosqueRequests.currentStage);

      // تحديد صيغة تجميع التاريخ بناءً على الفترة الزمنية (يومي للفترات القصيرة، شهري للفترات الطويلة)
      let dateFormat = '%Y-%m';
      if (input?.fromDate) {
        const from = new Date(input.fromDate);
        const to = input.toDate ? new Date(input.toDate) : new Date();
        const diffTime = Math.abs(to.getTime() - from.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        if (diffDays <= 31) {
          dateFormat = '%Y-%m-%d';
        }
      }

      // توزيع الطلبات حسب التاريخ (مفلتر)
      const monthlyTrend = await db
        .select({
          month: sql<string>`DATE_FORMAT(${mosqueRequests.createdAt}, ${dateFormat})`,
          count: count(),
        })
        .from(mosqueRequests)
        .where(whereClause)
        .groupBy(sql`DATE_FORMAT(${mosqueRequests.createdAt}, ${dateFormat})`)
        .orderBy(sql`DATE_FORMAT(${mosqueRequests.createdAt}, ${dateFormat})`);

      // الطلبات الجديدة (مفلترة)
      const newRequestsResult = await db
        .select({ count: count() })
        .from(mosqueRequests)
        .where(and(whereClause, eq(mosqueRequests.currentStage, "submitted")));
      const newRequests = newRequestsResult[0]?.count || 0;

      // المشاريع المكتملة
      const completedProjectsResult = await db
        .select({ count: count() })
        .from(projects)
        .where(eq(projects.status, "completed"));
      const completedProjects = completedProjectsResult[0]?.count || 0;

      // آخر التقارير الختامية
      const recentReports = await db
        .select()
        .from(finalReports)
        .orderBy(desc(finalReports.createdAt))
        .limit(5);

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
        monthlyTrend,
        recentReports,
      };
    }),

  /**
   * حساب نسبة النمو الشهري للمقاييس الرئيسية
   */
  getMonthlyGrowth: permissionProcedure("reports.view")
    .query(async ({ ctx }) => {
      // التأكد من أن المستخدم لديه الصلاحية
      if (!["super_admin", "system_admin", "projects_office", "financial_manager", "corporate_comm"].includes(ctx.user.role)) {
        return null;
      }
      
      const db = await getDb();
      if (!db) return null;

      const now = new Date();
      const firstDayCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const firstDayLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const firstDayTwoMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 2, 1);

      const calculateMetric = async (table: any, conditions: any[] = []) => {
        const currentMonthResult = await db
          .select({ count: count() })
          .from(table)
          .where(and(gte(table.createdAt, firstDayCurrentMonth), ...conditions));

        const lastMonthResult = await db
          .select({ count: count() })
          .from(table)
          .where(and(
            gte(table.createdAt, firstDayLastMonth),
            lte(table.createdAt, firstDayCurrentMonth),
            ...conditions
          ));

        const current = currentMonthResult[0]?.count || 0;
        const previous = lastMonthResult[0]?.count || 0;
        
        let percentage = 0;
        if (previous > 0) {
          percentage = ((current - previous) / previous) * 100;
        } else if (current > 0) {
          percentage = 100; // إذا كان السابق صفرًا والحالي أكبر من صفر
        }
        
        return {
          current,
          previous,
          percentage: Math.round(percentage),
        };
      };

      const totalRequests = await calculateMetric(mosqueRequests);
      const registeredMosques = await calculateMetric(mosques);
      const inProgressRequests = await calculateMetric(mosqueRequests, [eq(mosqueRequests.status, 'in_progress')]);
      const completedRequests = await calculateMetric(mosqueRequests, [eq(mosqueRequests.status, 'completed')]);

      return {
        totalRequests,
        registeredMosques,
        inProgressRequests,
        completedRequests,
      };
    }),
});
