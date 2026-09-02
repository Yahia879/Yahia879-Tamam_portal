import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { 
  mosqueRequests, 
  stageSettings, 
  requestHistory, 
  mosques, 
  users, 
  notifications,
  programs,
  projects,
  projectMosques,
} from "../../drizzle/schema";
import { eq, desc, asc, and, inArray, isNull, sql } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { createNotification } from "./notifications";

// الإعدادات الافتراضية لمدد مراحل الطلبات (SLA)
export const DEFAULT_STAGE_SLAS = [
  { 
    stageCode: "submitted", 
    stageName: "تقديم الطلب", 
    stageOrder: 1, 
    durationDays: 1, 
    warningDays: 1, 
    description: "تقديم الطلب من قبل طالب الخدمة وبانتظار المراجعة" 
  },
  { 
    stageCode: "initial_review", 
    stageName: "المراجعة الأولية", 
    stageOrder: 2, 
    durationDays: 3, 
    warningDays: 1, 
    description: "مراجعة البيانات والمستندات من قبل مكتب المشاريع" 
  },
  { 
    stageCode: "field_visit", 
    stageName: "الزيارة الميدانية", 
    stageOrder: 3, 
    durationDays: 7, 
    warningDays: 2, 
    description: "إسناد وجدولة وتنفيذ الزيارة الميدانية ورفع التقرير" 
  },
  { 
    stageCode: "technical_eval", 
    stageName: "التقييم الفني", 
    stageOrder: 4, 
    durationDays: 5, 
    warningDays: 1, 
    description: "مراجعة التقرير الفني واتخاذ القرار المناسب (اعتذار/تعليق/استجابة/مشروع)" 
  },
  { 
    stageCode: "boq_preparation", 
    stageName: "إعداد جدول الكميات", 
    stageOrder: 5, 
    durationDays: 5, 
    warningDays: 1, 
    description: "إعداد جدول الكميات والمواصفات الفنية واعتماده" 
  },
  { 
    stageCode: "financial_eval_and_approval", 
    stageName: "التقييم المالي واعتماد العرض", 
    stageOrder: 6, 
    durationDays: 7, 
    warningDays: 2, 
    description: "طلب واستلام ومقارنة عروض الأسعار واعتماد العرض الفائز" 
  },
  { 
    stageCode: "contracting", 
    stageName: "التعاقد", 
    stageOrder: 7, 
    durationDays: 5, 
    warningDays: 1, 
    description: "إعداد العقد وتوقيعه وتحويله إلى مشروع تنفيذي" 
  },
  { 
    stageCode: "execution", 
    stageName: "التنفيذ", 
    stageOrder: 8, 
    durationDays: 30, 
    warningDays: 5, 
    description: "تنفيذ الأعمال ورفع تقارير الإنجاز وطلبات الصرف" 
  },
  { 
    stageCode: "handover", 
    stageName: "الاستلام", 
    stageOrder: 9, 
    durationDays: 14, 
    warningDays: 3, 
    description: "الاستلام الابتدائي والنهائي وفترة الضمان والتقرير الختامي" 
  },
  { 
    stageCode: "closed", 
    stageName: "الإغلاق", 
    stageOrder: 10, 
    durationDays: 14, 
    warningDays: 3, 
    description: "استطلاعات الرضا والأرشفة والإغلاق النهائي" 
  },
];

// الإعداد الافتراضي لمهلة قبول المستفيد
export const DEFAULT_BENEFICIARY_SLA = {
  stageCode: "beneficiary_approval",
  stageName: "قبول تسجيل المستفيد",
  stageOrder: 0,
  durationDays: 3,
  warningDays: 1,
  description: "المهلة المحددة لمراجعة واعتماد حساب طالب الخدمة الجديد بعد التسجيل قبل التصعيد الإداري",
};

// دالة مساعدة لتحديد مستوى التأخير
function getSeverityLevel(delayDays: number): "warning" | "medium" | "critical" {
  if (delayDays <= 3) return "warning";
  if (delayDays <= 7) return "medium";
  return "critical";
}

export const escalationRouter = router({
  // جلب إعدادات مدد المراحل ومهلة المستفيدين
  getSettings: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

    const rows = await db.select().from(stageSettings).orderBy(asc(stageSettings.stageOrder));
    
    // إعدادات المراحل
    const stages = DEFAULT_STAGE_SLAS.map(def => {
      const found = rows.find(r => 
        r.stageCode === def.stageCode || 
        (def.stageCode === "financial_eval_and_approval" && (r.stageCode === "financial_eval" || r.stageCode === "financial_eval_and_approval"))
      );
      return {
        stageCode: def.stageCode,
        stageName: found?.stageName || def.stageName,
        stageOrder: def.stageOrder,
        durationDays: found?.durationDays ?? def.durationDays,
        warningDays: found?.warningDays ?? def.warningDays,
        description: found?.description || def.description,
        isActive: found?.isActive ?? true,
      };
    });

    // إعداد مهلة المستفيد
    const benRow = rows.find(r => r.stageCode === "beneficiary_approval");
    const beneficiarySLA = {
      stageCode: "beneficiary_approval",
      stageName: benRow?.stageName || DEFAULT_BENEFICIARY_SLA.stageName,
      durationDays: benRow?.durationDays ?? DEFAULT_BENEFICIARY_SLA.durationDays,
      warningDays: benRow?.warningDays ?? DEFAULT_BENEFICIARY_SLA.warningDays,
      description: benRow?.description || DEFAULT_BENEFICIARY_SLA.description,
    };

    return { stages, beneficiarySLA };
  }),

  // تحديث إعدادات مدد المراحل ومهلة المستفيدين
  updateSettings: protectedProcedure
    .input(z.object({
      stages: z.array(z.object({
        stageCode: z.string(),
        stageName: z.string().optional(),
        durationDays: z.number().min(0),
        warningDays: z.number().min(0).optional(),
        description: z.string().optional(),
      })),
      beneficiaryDays: z.number().min(0),
      beneficiaryWarningDays: z.number().min(0).optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      const now = new Date();

      // تحديث أو إدخال كل مرحلة
      for (const s of input.stages) {
        const existing = await db.select().from(stageSettings).where(eq(stageSettings.stageCode, s.stageCode)).limit(1);
        if (existing.length > 0) {
          await db.update(stageSettings)
            .set({
              durationDays: s.durationDays,
              warningDays: s.warningDays ?? 1,
              description: s.description || existing[0].description,
              updatedAt: now,
            })
            .where(eq(stageSettings.stageCode, s.stageCode));
        } else {
          const def = DEFAULT_STAGE_SLAS.find(d => d.stageCode === s.stageCode);
          await db.insert(stageSettings).values({
            stageCode: s.stageCode,
            stageName: s.stageName || def?.stageName || s.stageCode,
            stageOrder: def?.stageOrder || 99,
            durationDays: s.durationDays,
            warningDays: s.warningDays ?? 1,
            description: s.description || def?.description || "",
            isActive: true,
            createdAt: now,
            updatedAt: now,
          });
        }
      }

      // تحديث أو إدخال مهلة قبول المستفيد
      const existingBen = await db.select().from(stageSettings).where(eq(stageSettings.stageCode, "beneficiary_approval")).limit(1);
      if (existingBen.length > 0) {
        await db.update(stageSettings)
          .set({
            durationDays: input.beneficiaryDays,
            warningDays: input.beneficiaryWarningDays ?? 1,
            updatedAt: now,
          })
          .where(eq(stageSettings.stageCode, "beneficiary_approval"));
      } else {
        await db.insert(stageSettings).values({
          stageCode: "beneficiary_approval",
          stageName: DEFAULT_BENEFICIARY_SLA.stageName,
          stageOrder: 0,
          durationDays: input.beneficiaryDays,
          warningDays: input.beneficiaryWarningDays ?? 1,
          description: DEFAULT_BENEFICIARY_SLA.description,
          isActive: true,
          createdAt: now,
          updatedAt: now,
        });
      }

      return { success: true, message: "تم حفظ إعدادات مدة التصعيد بنجاح" };
    }),

  // استعادة الإعدادات الافتراضية
  resetSettings: protectedProcedure.mutation(async () => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

    const now = new Date();

    for (const def of DEFAULT_STAGE_SLAS) {
      const existing = await db.select().from(stageSettings).where(eq(stageSettings.stageCode, def.stageCode)).limit(1);
      if (existing.length > 0) {
        await db.update(stageSettings)
          .set({
            stageName: def.stageName,
            stageOrder: def.stageOrder,
            durationDays: def.durationDays,
            warningDays: def.warningDays,
            description: def.description,
            updatedAt: now,
          })
          .where(eq(stageSettings.stageCode, def.stageCode));
      } else {
        await db.insert(stageSettings).values({
          stageCode: def.stageCode,
          stageName: def.stageName,
          stageOrder: def.stageOrder,
          durationDays: def.durationDays,
          warningDays: def.warningDays,
          description: def.description,
          isActive: true,
          createdAt: now,
          updatedAt: now,
        });
      }
    }

    // استعادة مهلة المستفيد
    const existingBen = await db.select().from(stageSettings).where(eq(stageSettings.stageCode, "beneficiary_approval")).limit(1);
    if (existingBen.length > 0) {
      await db.update(stageSettings)
        .set({
          stageName: DEFAULT_BENEFICIARY_SLA.stageName,
          durationDays: DEFAULT_BENEFICIARY_SLA.durationDays,
          warningDays: DEFAULT_BENEFICIARY_SLA.warningDays,
          description: DEFAULT_BENEFICIARY_SLA.description,
          updatedAt: now,
        })
        .where(eq(stageSettings.stageCode, "beneficiary_approval"));
    } else {
      await db.insert(stageSettings).values({
        stageCode: "beneficiary_approval",
        stageName: DEFAULT_BENEFICIARY_SLA.stageName,
        stageOrder: 0,
        durationDays: DEFAULT_BENEFICIARY_SLA.durationDays,
        warningDays: DEFAULT_BENEFICIARY_SLA.warningDays,
        description: DEFAULT_BENEFICIARY_SLA.description,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      });
    }

    return { success: true, message: "تمت استعادة الإعدادات الافتراضية بنجاح" };
  }),

  // جلب إحصائيات التصعيد العام
  getStats: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

    const now = new Date();

    // 1. جلب إعدادات الـ SLA
    const stageSettingsRows = await db.select().from(stageSettings);
    const slaMap = new Map<string, number>();
    for (const def of DEFAULT_STAGE_SLAS) {
      slaMap.set(def.stageCode, def.durationDays);
    }
    for (const row of stageSettingsRows) {
      if (row.stageCode && row.durationDays !== null && row.durationDays !== undefined) {
        slaMap.set(row.stageCode, row.durationDays);
        if (row.stageCode === "financial_eval") {
          slaMap.set("financial_eval_and_approval", row.durationDays);
        }
      }
    }

    let beneficiaryAllowedDays = DEFAULT_BENEFICIARY_SLA.durationDays;
    const benRow = stageSettingsRows.find(r => r.stageCode === "beneficiary_approval");
    if (benRow && benRow.durationDays !== null && benRow.durationDays !== undefined) {
      beneficiaryAllowedDays = benRow.durationDays;
    }

    // 2. جلب الطلبات النشطة
    const activeRequests = await db.select({
      id: mosqueRequests.id,
      requestNumber: mosqueRequests.requestNumber,
      currentStage: mosqueRequests.currentStage,
      status: mosqueRequests.status,
      programType: mosqueRequests.programType,
      createdAt: mosqueRequests.createdAt,
      updatedAt: mosqueRequests.updatedAt,
      submittedAt: mosqueRequests.submittedAt,
    }).from(mosqueRequests);

    // 3. جلب سجل التحولات لتحديد تاريخ دخول المرحلة
    const transitions = await db.select({
      requestId: requestHistory.requestId,
      toStage: requestHistory.toStage,
      createdAt: requestHistory.createdAt,
    }).from(requestHistory).orderBy(desc(requestHistory.createdAt));

    const latestTransitionByReqStage = new Map<string, Date>();
    for (const t of transitions) {
      if (t.requestId && t.toStage) {
        const key = `${t.requestId}_${t.toStage}`;
        if (!latestTransitionByReqStage.has(key)) {
          latestTransitionByReqStage.set(key, new Date(t.createdAt));
        }
      }
    }

    // حساب الطلبات المتأخرة
    let totalDelayedRequests = 0;
    let criticalDelayedRequests = 0;
    let sumDelayDays = 0;
    const stageCounts: Record<string, number> = {};
    const programCounts: Record<string, number> = {};
    const severityCounts = { warning: 0, medium: 0, critical: 0 };

    for (const req of activeRequests) {
      if (
        req.status === "completed" || 
        req.status === "rejected" || 
        req.currentStage === "closed" ||
        !req.currentStage
      ) {
        continue;
      }

      const stageKey = (req.currentStage as string) === "financial_eval" ? "financial_eval_and_approval" : req.currentStage;
      const allowedDays = slaMap.get(stageKey) ?? slaMap.get(req.currentStage) ?? 5;
      if (allowedDays <= 0) continue;

      const stageEntryDate = req.currentStage === "submitted"
        ? new Date(req.submittedAt || req.createdAt)
        : (latestTransitionByReqStage.get(`${req.id}_${req.currentStage}`) || 
           latestTransitionByReqStage.get(`${req.id}_${stageKey}`) ||
           new Date(req.updatedAt || req.createdAt));

      const diffMs = now.getTime() - stageEntryDate.getTime();
      const allowedMs = allowedDays * 24 * 60 * 60 * 1000;

      if (diffMs > allowedMs) {
        const delayMs = diffMs - allowedMs;
        const delayDays = Math.max(1, Math.ceil(delayMs / (1000 * 60 * 60 * 24)));
        totalDelayedRequests++;
        sumDelayDays += delayDays;

        const severity = getSeverityLevel(delayDays);
        severityCounts[severity]++;

        if (delayDays > 7) {
          criticalDelayedRequests++;
        }

        stageCounts[stageKey] = (stageCounts[stageKey] || 0) + 1;
        if (req.programType) {
          programCounts[req.programType] = (programCounts[req.programType] || 0) + 1;
        }
      }
    }

    // 4. جلب المستفيدين المعلقين
    const pendingRequesters = await db.select({
      id: users.id,
      createdAt: users.createdAt,
    }).from(users).where(and(
      eq(users.role, "service_requester"),
      eq(users.status, "pending"),
      isNull(users.deletedAt)
    ));

    let totalDelayedBeneficiaries = 0;
    let criticalDelayedBeneficiaries = 0;

    for (const ben of pendingRequesters) {
      const regDate = new Date(ben.createdAt);
      const diffMs = now.getTime() - regDate.getTime();
      const allowedMs = beneficiaryAllowedDays * 24 * 60 * 60 * 1000;

      if (diffMs > allowedMs) {
        const delayMs = diffMs - allowedMs;
        const delayDays = Math.max(1, Math.ceil(delayMs / (1000 * 60 * 60 * 24)));
        totalDelayedBeneficiaries++;
        if (delayDays > 7) {
          criticalDelayedBeneficiaries++;
        }
      }
    }

    const avgDelayDays = totalDelayedRequests > 0 ? Math.round((sumDelayDays / totalDelayedRequests) * 10) / 10 : 0;

    return {
      totalDelayedItems: totalDelayedRequests + totalDelayedBeneficiaries,
      totalDelayedRequests,
      totalDelayedBeneficiaries,
      criticalEscalations: criticalDelayedRequests + criticalDelayedBeneficiaries,
      avgDelayDays,
      severityCounts,
      stageCounts,
      programCounts,
    };
  }),

  // جلب قائمة الطلبات المتأخرة بالتفصيل
  getDelayedRequests: protectedProcedure
    .input(z.object({
      stageCode: z.string().optional(),
      programType: z.string().optional(),
      severity: z.enum(["all", "warning", "medium", "critical"]).optional(),
      search: z.string().optional(),
      sortBy: z.enum(["delay_desc", "delay_asc", "created_desc"]).optional(),
    }).optional())
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      const now = new Date();

      // جلب إعدادات الـ SLA
      const stageSettingsRows = await db.select().from(stageSettings);
      const slaMap = new Map<string, number>();
      for (const def of DEFAULT_STAGE_SLAS) {
        slaMap.set(def.stageCode, def.durationDays);
      }
      for (const row of stageSettingsRows) {
        if (row.stageCode && row.durationDays !== null && row.durationDays !== undefined) {
          slaMap.set(row.stageCode, row.durationDays);
          if (row.stageCode === "financial_eval") {
            slaMap.set("financial_eval_and_approval", row.durationDays);
          }
        }
      }

      // جلب الطلبات مع الربط الكامل بالمسجد ومقدم الطلب والبرنامج والمشروع المسند
      const allRows = await db.select({
        request: mosqueRequests,
        mosqueName: mosques.name,
        mosqueCity: mosques.city,
        mosqueDistrict: mosques.district,
        requesterName: users.name,
        requesterPhone: users.phone,
        requesterEmail: users.email,
        programName: programs.name,
        projectId: projects.id,
        projectNumber: projects.projectNumber,
        projectName: projects.name,
        isMultiMosque: projects.isMultiMosque,
        multiMosqueNames: sql<string | null>`(
          SELECT GROUP_CONCAT(m.name SEPARATOR '، ') 
          FROM project_mosques pm 
          JOIN mosques m ON pm.mosqueId = m.id 
          WHERE pm.projectId = projects.id
        )`,
        assigneeName: sql<string | null>`(SELECT name FROM users WHERE users.id = mosque_requests.assignedTo)`,
        assigneeEmail: sql<string | null>`(SELECT email FROM users WHERE users.id = mosque_requests.assignedTo)`,
      }).from(mosqueRequests)
        .leftJoin(mosques, eq(mosqueRequests.mosqueId, mosques.id))
        .leftJoin(users, eq(mosqueRequests.userId, users.id))
        .leftJoin(programs, eq(mosqueRequests.programType, programs.id))
        .leftJoin(projects, eq(mosqueRequests.id, projects.requestId));

      // جلب سجل التحولات لتحديد تاريخ دخول المرحلة
      const transitions = await db.select({
        requestId: requestHistory.requestId,
        toStage: requestHistory.toStage,
        createdAt: requestHistory.createdAt,
      }).from(requestHistory).orderBy(desc(requestHistory.createdAt));

      const latestTransitionByReqStage = new Map<string, Date>();
      for (const t of transitions) {
        if (t.requestId && t.toStage) {
          const key = `${t.requestId}_${t.toStage}`;
          if (!latestTransitionByReqStage.has(key)) {
            latestTransitionByReqStage.set(key, new Date(t.createdAt));
          }
        }
      }

      const delayedList = [];

      for (const row of allRows) {
        const req = row.request;
        if (
          req.status === "completed" || 
          req.status === "rejected" || 
          req.currentStage === "closed" ||
          !req.currentStage
        ) {
          continue;
        }

        const normalizedStage = (req.currentStage as string) === "financial_eval" ? "financial_eval_and_approval" : req.currentStage;
        const allowedDays = slaMap.get(normalizedStage) ?? slaMap.get(req.currentStage) ?? 5;
        if (allowedDays <= 0) continue;

        const stageEntryDate = req.currentStage === "submitted"
          ? new Date(req.submittedAt || req.createdAt)
          : (latestTransitionByReqStage.get(`${req.id}_${req.currentStage}`) || 
             latestTransitionByReqStage.get(`${req.id}_${normalizedStage}`) ||
             new Date(req.updatedAt || req.createdAt));

        const diffMs = now.getTime() - stageEntryDate.getTime();
        const allowedMs = allowedDays * 24 * 60 * 60 * 1000;

        if (diffMs > allowedMs) {
          const delayMs = diffMs - allowedMs;
          const delayDays = Math.max(1, Math.ceil(delayMs / (1000 * 60 * 60 * 24)));
          const elapsedDays = Math.max(allowedDays + 1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
          const severity = getSeverityLevel(delayDays);

          let parsedProgramData: any = null;
          if (req.programData) {
            try {
              parsedProgramData = typeof req.programData === 'string' ? JSON.parse(req.programData) : req.programData;
            } catch (e) {}
          }

          const isMultiMosque = Boolean(row.isMultiMosque || parsedProgramData?.isMultiMosque);
          let effectiveMosqueName = row.multiMosqueNames || row.mosqueName || "";
          let effectiveMosqueCity = row.mosqueCity || "";
          let effectiveMosqueDistrict = row.mosqueDistrict || "";

          if (!effectiveMosqueName && parsedProgramData) {
            if (parsedProgramData.customMosqueName) {
              effectiveMosqueName = parsedProgramData.customMosqueName;
              effectiveMosqueCity = parsedProgramData.customMosqueCity || "";
              effectiveMosqueDistrict = parsedProgramData.customMosqueDistrict || "";
            }
          }

          // فلاتر البحث
          if (input?.stageCode && input.stageCode !== "all") {
            const filterStage = input.stageCode === "financial_eval" ? "financial_eval_and_approval" : input.stageCode;
            if (normalizedStage !== filterStage && req.currentStage !== input.stageCode) continue;
          }

          if (input?.programType && input.programType !== "all" && req.programType !== input.programType) {
            continue;
          }

          if (input?.severity && input.severity !== "all" && severity !== input.severity) {
            continue;
          }

          if (input?.search && input.search.trim()) {
            const term = input.search.toLowerCase().trim();
            const matchNumber = req.requestNumber?.toLowerCase().includes(term);
            const matchMosque = effectiveMosqueName.toLowerCase().includes(term);
            const matchCity = effectiveMosqueCity.toLowerCase().includes(term);
            const matchDistrict = effectiveMosqueDistrict.toLowerCase().includes(term);
            const matchProject = row.projectName?.toLowerCase().includes(term);
            const matchUser = row.requesterName?.toLowerCase().includes(term);
            const matchPhone = row.requesterPhone?.toLowerCase().includes(term);
            const matchEmail = row.requesterEmail?.toLowerCase().includes(term);
            const matchDescriptive = req.descriptiveName?.toLowerCase().includes(term);
            if (!matchNumber && !matchMosque && !matchCity && !matchDistrict && !matchProject && !matchUser && !matchPhone && !matchEmail && !matchDescriptive) {
              continue;
            }
          }

          delayedList.push({
            id: req.id,
            requestNumber: req.requestNumber,
            currentStage: req.currentStage,
            normalizedStage,
            status: req.status,
            priority: req.priority || "medium",
            programType: req.programType,
            programName: row.programName || req.programType,
            descriptiveName: req.descriptiveName,
            projectId: row.projectId,
            projectName: row.projectName,
            isMultiMosque,
            multiMosqueNames: row.multiMosqueNames,
            mosque: {
              id: req.mosqueId,
              name: effectiveMosqueName || (req.programType === "bunyan" ? "مشروع بنيان" : "غير محدد"),
              city: effectiveMosqueCity,
              district: effectiveMosqueDistrict,
            },
            requester: {
              id: req.userId,
              name: row.requesterName || "طالب خدمة",
              phone: row.requesterPhone || "",
              email: row.requesterEmail || "",
            },
            assignee: row.assigneeName ? { id: req.assignedTo, name: row.assigneeName, email: row.assigneeEmail } : null,
            responsibleText: req.currentResponsible || row.assigneeName || req.currentResponsibleDepartment || "مكتب المشاريع",
            stageEntryDate,
            allowedDays,
            elapsedDays,
            delayDays,
            severity,
            createdAt: req.createdAt,
          });
        }
      }

      // فرز القائمة من الخادم بناءً على sortBy
      const sortBy = input?.sortBy || "delay_desc";
      if (sortBy === "delay_desc") {
        delayedList.sort((a, b) => b.delayDays - a.delayDays);
      } else if (sortBy === "delay_asc") {
        delayedList.sort((a, b) => a.delayDays - b.delayDays);
      } else if (sortBy === "created_desc") {
        delayedList.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      }

      return delayedList;
    }),

  // جلب قائمة المستفيدين المعلقين المتأخرين في القبول
  getDelayedBeneficiaries: protectedProcedure
    .input(z.object({
      severity: z.enum(["all", "warning", "medium", "critical"]).optional(),
      requesterType: z.string().optional(),
      search: z.string().optional(),
      sortBy: z.enum(["delay_desc", "delay_asc", "created_desc"]).optional(),
    }).optional())
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      const now = new Date();

      // جلب مهلة القبول المحددة
      const [benSetting] = await db.select().from(stageSettings)
        .where(eq(stageSettings.stageCode, "beneficiary_approval"))
        .limit(1);

      const allowedDays = benSetting?.durationDays ?? DEFAULT_BENEFICIARY_SLA.durationDays;

      // جلب طالبي الخدمة قيد المراجعة
      const pendingUsers = await db.select({
        id: users.id,
        name: users.name,
        email: users.email,
        phone: users.phone,
        nationalId: users.nationalId,
        city: users.city,
        requesterType: users.requesterType,
        proofDocument: users.proofDocument,
        status: users.status,
        createdAt: users.createdAt,
        adminNotes: users.adminNotes,
        remarksDocument: users.remarksDocument,
        notesRequiredType: users.notesRequiredType,
      })
      .from(users)
      .where(and(
        eq(users.role, "service_requester"),
        eq(users.status, "pending"),
        isNull(users.deletedAt)
      ))
      .orderBy(asc(users.createdAt));

      const delayedBeneficiaries = [];

      for (const u of pendingUsers) {
        const regDate = new Date(u.createdAt);
        const diffMs = now.getTime() - regDate.getTime();
        const allowedMs = allowedDays * 24 * 60 * 60 * 1000;

        if (diffMs > allowedMs) {
          const delayMs = diffMs - allowedMs;
          const delayDays = Math.max(1, Math.ceil(delayMs / (1000 * 60 * 60 * 24)));
          const elapsedDays = Math.max(allowedDays + 1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
          const severity = getSeverityLevel(delayDays);

          if (input?.severity && input.severity !== "all" && severity !== input.severity) {
            continue;
          }

          if (input?.requesterType && input.requesterType !== "all" && u.requesterType !== input.requesterType) {
            continue;
          }

          if (input?.search && input.search.trim()) {
            const term = input.search.toLowerCase().trim();
            const matchName = u.name?.toLowerCase().includes(term);
            const matchPhone = u.phone?.toLowerCase().includes(term);
            const matchNationalId = u.nationalId?.toLowerCase().includes(term);
            const matchEmail = u.email?.toLowerCase().includes(term);
            const matchCity = u.city?.toLowerCase().includes(term);
            const matchType = u.requesterType?.toLowerCase().includes(term);
            if (!matchName && !matchPhone && !matchNationalId && !matchEmail && !matchCity && !matchType) {
              continue;
            }
          }

          const totalElapsedHours = Math.floor(diffMs / (1000 * 60 * 60));
          const elapsedDaysOnly = Math.floor(totalElapsedHours / 24);
          const elapsedHoursOnly = totalElapsedHours % 24;

          delayedBeneficiaries.push({
            id: u.id,
            name: u.name,
            email: u.email,
            phone: u.phone,
            nationalId: u.nationalId,
            city: u.city,
            requesterType: u.requesterType,
            proofDocument: u.proofDocument,
            status: u.status,
            createdAt: u.createdAt,
            allowedDays,
            elapsedDays,
            elapsedDaysOnly,
            elapsedHoursOnly,
            totalElapsedHours,
            delayDays,
            severity,
            adminNotes: u.adminNotes,
            notesRequiredType: u.notesRequiredType,
          });
        }
      }

      // ترتيب قائمة المستفيدين بناءً على خيار الفرز
      const sortBy = input?.sortBy || "delay_desc";
      if (sortBy === "delay_desc") {
        delayedBeneficiaries.sort((a, b) => b.delayDays - a.delayDays);
      } else if (sortBy === "delay_asc") {
        delayedBeneficiaries.sort((a, b) => a.delayDays - b.delayDays);
      } else if (sortBy === "created_desc") {
        delayedBeneficiaries.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      }

      return delayedBeneficiaries;
    }),

  // إرسال تذكير أو تنبيه تصعيدي للطلب أو المستفيد
  sendEscalationAlert: protectedProcedure
    .input(z.object({
      targetType: z.enum(["request", "beneficiary"]),
      targetId: z.number(),
      customMessage: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      if (input.targetType === "request") {
        const [req] = await db.select().from(mosqueRequests).where(eq(mosqueRequests.id, input.targetId)).limit(1);
        if (!req) throw new TRPCError({ code: "NOT_FOUND", message: "الطلب غير موجود" });

        const targetUserId = req.assignedTo || ctx.user.id;
        const title = `⚠️ تنبيه تصعيد إداري - الطلب ${req.requestNumber}`;
        const message = input.customMessage || `نود التنويه بوجود تأخير في معالجة الطلب رقم ${req.requestNumber} في مرحلة (${req.currentStage}). يرجى اتخاذ الإجراء اللازم.`;

        await createNotification({
          userId: targetUserId,
          title,
          message,
          type: "warning",
          relatedType: "request",
          relatedId: req.id,
        });

        return { success: true, message: "تم إرسال التنبيه الإداري بنجاح" };
      } else {
        const [user] = await db.select().from(users).where(eq(users.id, input.targetId)).limit(1);
        if (!user) throw new TRPCError({ code: "NOT_FOUND", message: "المستفيد غير موجود" });

        const title = `⚠️ تنبيه تصعيد إداري - اعتماد المستفيد ${user.name}`;
        const message = input.customMessage || `طلب تسجيل المستفيد ${user.name} متأخر في مرحلة المراجعة والاعتماد. يرجى مراجعة بياناته واتخاذ القرار.`;

        await createNotification({
          userId: ctx.user.id,
          title,
          message,
          type: "warning",
          relatedType: "user",
          relatedId: user.id,
        });

        return { success: true, message: "تم تسجيل التنبيه الإداري بنجاح" };
      }
    }),
});
