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
  contractsEnhanced,
  disbursementRequests,
  disbursementOrders,
} from "../../drizzle/schema";
import { eq, desc, asc, and, inArray, isNull, sql } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { createNotification } from "./notifications";

// تحويل مدة العقد إلى أيام وفق وحدة المدة المعتمدة
export function convertContractDurationToDays(duration: number, durationUnit?: string | null): number {
  if (!duration || duration <= 0) return 90;
  const unit = (durationUnit || "months").trim().toLowerCase();
  switch (unit) {
    case "days":
      return duration;
    case "weeks":
      return duration * 7;
    case "months":
      return duration * 30;
    case "years":
      return duration * 365;
    default:
      return duration * 30;
  }
}

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
    durationDays: 0, 
    warningDays: 5, 
    description: "تنفيذ الأعمال ورفع تقارير الإنجاز وطلبات الصرف (تحدد تلقائياً وفق مدة العقد المعتمد مع المورد)" 
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

const escalationProcedure = protectedProcedure.use(async ({ ctx, next }) => {
  const { checkPermission } = await import("../permissions");
  const hasPerm = await checkPermission(ctx.user.id, "escalation.view");
  if (!hasPerm) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "ليس لديك صلاحية عرض قسم التصعيد الإداري",
    });
  }
  return next({ ctx });
});

const delaySettingsProcedure = protectedProcedure.use(async ({ ctx, next }) => {
  const { checkPermission } = await import("../permissions");
  const hasPerm = (await checkPermission(ctx.user.id, "settings_escalation.view")) || (await checkPermission(ctx.user.id, "escalation.view"));
  if (!hasPerm) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "ليس لديك صلاحية تعيين وقت التأخير ومدد المراحل",
    });
  }
  return next({ ctx });
});

export const escalationRouter = router({
  // جلب إعدادات مدد المراحل ومهلة المستفيدين (متاح لجميع الموظفين المصرح لهم لحساب الـ SLA بدقة)
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
        durationDays: def.stageCode === "execution" ? (found?.durationDays && found.durationDays > 0 ? found.durationDays : 30) : (found?.durationDays ?? def.durationDays),
        warningDays: found?.warningDays ?? def.warningDays,
        description: found?.description || def.description,
        isActive: found?.isActive ?? true,
        isDynamicContractDuration: def.stageCode === "execution",
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
  updateSettings: delaySettingsProcedure
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
        if (s.stageCode === "execution") {
          // مرحلة التنفيذ: للمشاريع محكومة تلقائياً بمدة العقد المعتمد، ولفرص التبرع تُحسب بعد إنشاء طلب الصرف
          const existing = await db.select().from(stageSettings).where(eq(stageSettings.stageCode, "execution")).limit(1);
          if (existing.length > 0) {
            await db.update(stageSettings)
              .set({
                durationDays: s.durationDays,
                description: "مدة التنفيذ للمشاريع تُحدد وفق العقد المعتمد، ولفرص التبرع تُحسب بعد إنشاء طلب الصرف",
                updatedAt: now,
              })
              .where(eq(stageSettings.stageCode, "execution"));
          } else {
            await db.insert(stageSettings).values({
              stageCode: "execution",
              stageName: "التنفيذ",
              stageOrder: 8,
              durationDays: s.durationDays,
              warningDays: 1,
              description: "مدة التنفيذ للمشاريع تُحدد وفق العقد المعتمد، ولفرص التبرع تُحسب بعد إنشاء طلب الصرف",
              isActive: true,
              createdAt: now,
              updatedAt: now,
            });
          }
          continue;
        }

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
  resetSettings: delaySettingsProcedure.mutation(async () => {
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
  getStats: escalationProcedure.query(async () => {
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
      technicalEvalDecision: mosqueRequests.technicalEvalDecision,
      projectId: projects.id,
      createdAt: mosqueRequests.createdAt,
      updatedAt: mosqueRequests.updatedAt,
      submittedAt: mosqueRequests.submittedAt,
    }).from(mosqueRequests)
      .leftJoin(projects, eq(mosqueRequests.id, projects.requestId));

    // جلب العقود لتحديد مدة التنفيذ تلقائياً وفق مدة العقد المعتمد مع المورد
    const contractsList = await db.select({
      id: contractsEnhanced.id,
      contractNumber: contractsEnhanced.contractNumber,
      requestId: contractsEnhanced.requestId,
      projectId: contractsEnhanced.projectId,
      duration: contractsEnhanced.duration,
      durationUnit: contractsEnhanced.durationUnit,
      status: contractsEnhanced.status,
    }).from(contractsEnhanced);

    const approvedContractByReqId = new Map<number, typeof contractsList[0]>();
    const approvedContractByProjId = new Map<number, typeof contractsList[0]>();
    const anyContractByReqId = new Map<number, typeof contractsList[0]>();
    const anyContractByProjId = new Map<number, typeof contractsList[0]>();

    for (const c of contractsList) {
      if (c.requestId) {
        if (c.status === "approved" && !approvedContractByReqId.has(c.requestId)) {
          approvedContractByReqId.set(c.requestId, c);
        }
        if (!anyContractByReqId.has(c.requestId)) {
          anyContractByReqId.set(c.requestId, c);
        }
      }
      if (c.projectId) {
        if (c.status === "approved" && !approvedContractByProjId.has(c.projectId)) {
          approvedContractByProjId.set(c.projectId, c);
        }
        if (!anyContractByProjId.has(c.projectId)) {
          anyContractByProjId.set(c.projectId, c);
        }
      }
    }

    // جلب طلبات الصرف لربطها بفرص التبرع
    const allDisbursementsStats = await db.select({
      id: disbursementRequests.id,
      requestNumber: disbursementRequests.requestNumber,
      projectId: disbursementRequests.projectId,
      amount: disbursementRequests.amount,
      status: disbursementRequests.status,
      requestedAt: disbursementRequests.requestedAt,
      attachmentsJson: disbursementRequests.attachmentsJson,
      orderStatus: disbursementOrders.status,
    })
    .from(disbursementRequests)
    .leftJoin(disbursementOrders, eq(disbursementRequests.id, disbursementOrders.disbursementRequestId));

    const disbursementByReqId = new Map<number, {
      id: number;
      requestNumber: string;
      requestedAt: Date;
      amount: string | null;
      status: string | null;
      orderStatus?: string | null;
    }>();

    for (const d of allDisbursementsStats) {
      if (d.attachmentsJson) {
        try {
          const attachments = typeof d.attachmentsJson === "string" ? JSON.parse(d.attachmentsJson) : d.attachmentsJson;
          if (Array.isArray(attachments)) {
            const metaObj = attachments.find((a: any) => a.name === "custom_supplier_info" && a.type === "metadata");
            if (metaObj && metaObj.url) {
              const meta = typeof metaObj.url === "string" ? JSON.parse(metaObj.url) : metaObj.url;
              const reqId = meta.mosqueRequestId ? Number(meta.mosqueRequestId) : null;
              if (reqId && !disbursementByReqId.has(reqId)) {
                disbursementByReqId.set(reqId, {
                  id: d.id,
                  requestNumber: d.requestNumber,
                  requestedAt: new Date(d.requestedAt),
                  amount: d.amount,
                  status: d.status,
                  orderStatus: d.orderStatus,
                });
              }
            }
          }
        } catch (e) {
          // ignore
        }
      }
    }

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
      let allowedDays = slaMap.get(stageKey) ?? slaMap.get(req.currentStage) ?? 5;
      const isDonation = req.technicalEvalDecision === "convert_to_donation";
      let stageEntryDate: Date | null = null;

      // مرحلة التنفيذ:
      if (stageKey === "execution" || req.currentStage === "execution") {
        if (isDonation) {
          const linkedDisbursement = req.id ? disbursementByReqId.get(req.id) : null;
          if (!linkedDisbursement) {
            // فرصة تبرع ولم يُرفع لها طلب صرف بعد (لا تزال قيد جمع التبرعات) -> استثناء تام من عداد التأخير
            continue;
          }
          // وُجد طلب صرف -> يبدأ العداد من تاريخ إنشاء طلب الصرف
          const donationSla = slaMap.get("execution");
          allowedDays = (donationSla && donationSla > 0) ? donationSla : 30;
          stageEntryDate = linkedDisbursement.requestedAt;
        } else {
          // للمشاريع: تؤخذ المدة تلقائياً من العقد المعتمد مع المورد
          const contract = (req.id ? approvedContractByReqId.get(req.id) : null)
            || (req.projectId ? approvedContractByProjId.get(req.projectId) : null)
            || (req.id ? anyContractByReqId.get(req.id) : null)
            || (req.projectId ? anyContractByProjId.get(req.projectId) : null);

          if (contract) {
            allowedDays = convertContractDurationToDays(contract.duration, contract.durationUnit);
          } else {
            allowedDays = slaMap.get("execution") || 90;
          }
        }
      }

      if (allowedDays <= 0) continue;

      if (!stageEntryDate) {
        stageEntryDate = req.currentStage === "submitted"
          ? new Date(req.submittedAt || req.createdAt)
          : (latestTransitionByReqStage.get(`${req.id}_${req.currentStage}`) || 
             latestTransitionByReqStage.get(`${req.id}_${stageKey}`) ||
             new Date(req.updatedAt || req.createdAt));
      }

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
  getDelayedRequests: escalationProcedure
    .input(z.object({
      stageCode: z.string().optional(),
      programType: z.string().optional(),
      severity: z.enum(["all", "warning", "medium", "critical"]).optional(),
      search: z.string().optional(),
      sortBy: z.enum(["delay_desc", "delay_asc", "created_desc"]).optional(),
      page: z.number().min(1).default(1).optional(),
      limit: z.number().min(1).max(100).default(10).optional(),
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

      // جلب العقود لتحديد مدة التنفيذ تلقائياً وفق مدة العقد المعتمد مع المورد
      const contractsList = await db.select({
        id: contractsEnhanced.id,
        contractNumber: contractsEnhanced.contractNumber,
        requestId: contractsEnhanced.requestId,
        projectId: contractsEnhanced.projectId,
        duration: contractsEnhanced.duration,
        durationUnit: contractsEnhanced.durationUnit,
        status: contractsEnhanced.status,
      }).from(contractsEnhanced);

      const approvedContractByReqId = new Map<number, typeof contractsList[0]>();
      const approvedContractByProjId = new Map<number, typeof contractsList[0]>();
      const anyContractByReqId = new Map<number, typeof contractsList[0]>();
      const anyContractByProjId = new Map<number, typeof contractsList[0]>();

      for (const c of contractsList) {
        if (c.requestId) {
          if (c.status === "approved" && !approvedContractByReqId.has(c.requestId)) {
            approvedContractByReqId.set(c.requestId, c);
          }
          if (!anyContractByReqId.has(c.requestId)) {
            anyContractByReqId.set(c.requestId, c);
          }
        }
        if (c.projectId) {
          if (c.status === "approved" && !approvedContractByProjId.has(c.projectId)) {
            approvedContractByProjId.set(c.projectId, c);
          }
          if (!anyContractByProjId.has(c.projectId)) {
            anyContractByProjId.set(c.projectId, c);
          }
        }
      }

      // جلب طلبات الصرف لربطها بفرص التبرع
      const allDisbursements = await db.select({
        id: disbursementRequests.id,
        requestNumber: disbursementRequests.requestNumber,
        projectId: disbursementRequests.projectId,
        amount: disbursementRequests.amount,
        status: disbursementRequests.status,
        requestedAt: disbursementRequests.requestedAt,
        attachmentsJson: disbursementRequests.attachmentsJson,
        orderStatus: disbursementOrders.status,
      })
      .from(disbursementRequests)
      .leftJoin(disbursementOrders, eq(disbursementRequests.id, disbursementOrders.disbursementRequestId));

      const disbursementByReqId = new Map<number, {
        id: number;
        requestNumber: string;
        requestedAt: Date;
        amount: string | null;
        status: string | null;
        orderStatus?: string | null;
      }>();

      for (const d of allDisbursements) {
        if (d.attachmentsJson) {
          try {
            const attachments = typeof d.attachmentsJson === "string" ? JSON.parse(d.attachmentsJson) : d.attachmentsJson;
            if (Array.isArray(attachments)) {
              const metaObj = attachments.find((a: any) => a.name === "custom_supplier_info" && a.type === "metadata");
              if (metaObj && metaObj.url) {
                const meta = typeof metaObj.url === "string" ? JSON.parse(metaObj.url) : metaObj.url;
                const reqId = meta.mosqueRequestId ? Number(meta.mosqueRequestId) : null;
                if (reqId && !disbursementByReqId.has(reqId)) {
                  disbursementByReqId.set(reqId, {
                    id: d.id,
                    requestNumber: d.requestNumber,
                    requestedAt: new Date(d.requestedAt),
                    amount: d.amount,
                    status: d.status,
                    orderStatus: d.orderStatus,
                  });
                }
              }
            }
          } catch (e) {
            // ignore
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
        let allowedDays = slaMap.get(normalizedStage) ?? slaMap.get(req.currentStage) ?? 5;
        let matchedContract: typeof contractsList[0] | null = null;
        const isDonation = req.technicalEvalDecision === "convert_to_donation";
        let linkedDisbursement = null;
        let stageEntryDate: Date | null = null;

        // مرحلة التنفيذ:
        if (normalizedStage === "execution" || req.currentStage === "execution") {
          if (isDonation) {
            linkedDisbursement = req.id ? disbursementByReqId.get(req.id) : null;
            if (!linkedDisbursement) {
              // فرصة تبرع ولم يُرفع لها طلب صرف بعد (لا تزال قيد جمع التبرعات) -> استثناء تام من عداد التأخير
              continue;
            }
            // وُجد طلب صرف -> يبدأ العداد من تاريخ إنشاء طلب الصرف
            const donationSla = slaMap.get("execution");
            allowedDays = (donationSla && donationSla > 0) ? donationSla : 30;
            stageEntryDate = linkedDisbursement.requestedAt;
          } else {
            // مدة التأخير للمشاريع تؤخذ تلقائياً من مدة العقد المعتمد مع المورد
            matchedContract = (req.id ? approvedContractByReqId.get(req.id) : null)
              || (row.projectId ? approvedContractByProjId.get(row.projectId) : null)
              || (req.id ? anyContractByReqId.get(req.id) : null)
              || (row.projectId ? anyContractByProjId.get(row.projectId) : null)
              || null;

            if (matchedContract) {
              allowedDays = convertContractDurationToDays(matchedContract.duration, matchedContract.durationUnit);
            } else {
              allowedDays = slaMap.get("execution") || 90;
            }
          }
        }

        if (allowedDays <= 0) continue;

        if (!stageEntryDate) {
          stageEntryDate = req.currentStage === "submitted"
            ? new Date(req.submittedAt || req.createdAt)
            : (latestTransitionByReqStage.get(`${req.id}_${req.currentStage}`) || 
               latestTransitionByReqStage.get(`${req.id}_${normalizedStage}`) ||
               new Date(req.updatedAt || req.createdAt));
        }

        const diffMs = now.getTime() - stageEntryDate.getTime();
        const allowedMs = allowedDays * 24 * 60 * 60 * 1000;

        if (diffMs > allowedMs) {
          const delayMs = diffMs - allowedMs;
          const delayDays = Math.max(1, Math.ceil(delayMs / (1000 * 60 * 60 * 24)));
          const totalDelayHours = Math.floor(delayMs / (1000 * 60 * 60));
          const delayDaysOnly = Math.floor(totalDelayHours / 24);
          const delayHoursOnly = totalDelayHours % 24;

          const totalElapsedHours = Math.floor(diffMs / (1000 * 60 * 60));
          const elapsedDaysOnly = Math.floor(totalElapsedHours / 24);
          const elapsedHoursOnly = totalElapsedHours % 24;
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
            elapsedDaysOnly,
            elapsedHoursOnly,
            totalElapsedHours,
            delayDays,
            delayDaysOnly,
            delayHoursOnly,
            totalDelayHours,
            severity,
            isDonation,
            disbursementInfo: linkedDisbursement ? {
              id: linkedDisbursement.id,
              requestNumber: linkedDisbursement.requestNumber,
              requestedAt: linkedDisbursement.requestedAt,
              amount: linkedDisbursement.amount,
              status: linkedDisbursement.status,
              orderStatus: linkedDisbursement.orderStatus,
            } : null,
            contractInfo: matchedContract ? {
              id: matchedContract.id,
              contractNumber: matchedContract.contractNumber,
              duration: matchedContract.duration,
              durationUnit: matchedContract.durationUnit,
              durationDays: allowedDays,
            } : null,
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

      const total = delayedList.length;
      const page = input?.page || 1;
      const limit = input?.limit || 10;
      const offset = (page - 1) * limit;
      const paginatedRequests = delayedList.slice(offset, offset + limit);

      return {
        requests: paginatedRequests,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      };
    }),

  // جلب قائمة المستفيدين المعلقين المتأخرين في القبول
  getDelayedBeneficiaries: escalationProcedure
    .input(z.object({
      severity: z.enum(["all", "warning", "medium", "critical"]).optional(),
      requesterType: z.string().optional(),
      search: z.string().optional(),
      sortBy: z.enum(["delay_desc", "delay_asc", "created_desc"]).optional(),
      page: z.number().min(1).default(1).optional(),
      limit: z.number().min(1).max(100).default(10).optional(),
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

          const totalDelayHours = Math.floor(delayMs / (1000 * 60 * 60));
          const delayDaysOnly = Math.floor(totalDelayHours / 24);
          const delayHoursOnly = totalDelayHours % 24;

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
            delayDaysOnly,
            delayHoursOnly,
            totalDelayHours,
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

      const total = delayedBeneficiaries.length;
      const page = input?.page || 1;
      const limit = input?.limit || 10;
      const offset = (page - 1) * limit;
      const paginatedBeneficiaries = delayedBeneficiaries.slice(offset, offset + limit);

      return {
        beneficiaries: paginatedBeneficiaries,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      };
    }),

  // إرسال تذكير أو تنبيه تصعيدي للطلب أو المستفيد
  sendEscalationAlert: escalationProcedure
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
