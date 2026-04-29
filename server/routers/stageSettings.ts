import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { stageSettings, requestStageTracking, requestSubStageTracking, escalationLogs } from "../../drizzle/schema";
import { eq, desc, asc, and, isNull, gte, lte } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

// المراحل الرئيسية الـ 11 مع المدد الزمنية
const defaultStages = [
  { 
    stageCode: "submitted", 
    stageName: "تقديم الطلب", 
    stageOrder: 1, 
    durationDays: 1, 
    description: "تقديم الطلب من قبل طالب الخدمة" 
  },
  { 
    stageCode: "initial_review", 
    stageName: "المراجعة الأولية", 
    stageOrder: 2, 
    durationDays: 3, 
    description: "مراجعة البيانات والمستندات من مكتب المشاريع" 
  },
  { 
    stageCode: "field_visit", 
    stageName: "الزيارة الميدانية", 
    stageOrder: 3, 
    durationDays: 7, 
    description: "إسناد وجدولة وتنفيذ الزيارة ورفع التقرير" 
  },
  { 
    stageCode: "technical_eval", 
    stageName: "التقييم الفني", 
    stageOrder: 4, 
    durationDays: 5, 
    description: "اتخاذ القرار: اعتذار/تعليق/استجابة سريعة/تحويل لمشروع" 
  },
  { 
    stageCode: "boq_preparation", 
    stageName: "إعداد جدول الكميات", 
    stageOrder: 5, 
    durationDays: 5, 
    description: "إعداد جدول الكميات والمواصفات الفنية" 
  },
  { 
    stageCode: "financial_eval", 
    stageName: "التقييم المالي", 
    stageOrder: 6, 
    durationDays: 10, 
    description: "جمع عروض الأسعار والمقارنة" 
  },
  { 
    stageCode: "quotation_approval", 
    stageName: "اعتماد العرض", 
    stageOrder: 7, 
    durationDays: 3, 
    description: "اعتماد العرض الفائز" 
  },
  { 
    stageCode: "contracting", 
    stageName: "التعاقد", 
    stageOrder: 8, 
    durationDays: 5, 
    description: "إنشاء العقد وتوقيعه وتحويله لمشروع" 
  },
  { 
    stageCode: "execution", 
    stageName: "التنفيذ", 
    stageOrder: 9, 
    durationDays: 0, 
    description: "تنفيذ الأعمال: تقرير إنجاز → طلب صرف → أمر صرف" 
  },
  { 
    stageCode: "handover", 
    stageName: "الاستلام", 
    stageOrder: 10, 
    durationDays: 14, 
    description: "الاستلام الابتدائي → فترة الضمان → الاستلام النهائي → التقرير الختامي → الدفعة الختامية" 
  },
  { 
    stageCode: "closed", 
    stageName: "الإغلاق", 
    stageOrder: 11, 
    durationDays: 14, 
    description: "قياس رضا أصحاب المصلحة والمستفيدين والنشر والتغذية الراجعة والأرشفة" 
  },
];

// المراحل الفرعية
const defaultSubStages = [
  // الزيارة الميدانية
  { subStageCode: "field_visit_assign", subStageName: "إسناد الزيارة", parentStage: "field_visit", order: 1, durationDays: 1 },
  { subStageCode: "field_visit_schedule", subStageName: "جدولة الزيارة", parentStage: "field_visit", order: 2, durationDays: 2 },
  { subStageCode: "field_visit_execute", subStageName: "تنفيذ الزيارة", parentStage: "field_visit", order: 3, durationDays: 3 },
  { subStageCode: "field_visit_report", subStageName: "رفع التقرير", parentStage: "field_visit", order: 4, durationDays: 1 },
  
  // التقييم الفني
  { subStageCode: "technical_eval_review", subStageName: "مراجعة التقرير", parentStage: "technical_eval", order: 1, durationDays: 2 },
  { subStageCode: "technical_eval_decision", subStageName: "اتخاذ القرار", parentStage: "technical_eval", order: 2, durationDays: 3 },
  
  // إعداد جدول الكميات
  { subStageCode: "boq_items_add", subStageName: "إضافة البنود", parentStage: "boq_preparation", order: 1, durationDays: 3 },
  { subStageCode: "boq_review", subStageName: "مراجعة الكميات", parentStage: "boq_preparation", order: 2, durationDays: 1 },
  { subStageCode: "boq_approve", subStageName: "اعتماد الجدول", parentStage: "boq_preparation", order: 3, durationDays: 1 },
  
  // التقييم المالي
  { subStageCode: "financial_request_quotes", subStageName: "طلب عروض الأسعار", parentStage: "financial_eval", order: 1, durationDays: 3 },
  { subStageCode: "financial_receive_quotes", subStageName: "استلام العروض", parentStage: "financial_eval", order: 2, durationDays: 5 },
  { subStageCode: "financial_compare", subStageName: "مقارنة العروض", parentStage: "financial_eval", order: 3, durationDays: 2 },
  
  // التعاقد
  { subStageCode: "contract_prepare", subStageName: "إعداد العقد", parentStage: "contracting", order: 1, durationDays: 2 },
  { subStageCode: "contract_review", subStageName: "مراجعة العقد", parentStage: "contracting", order: 2, durationDays: 1 },
  { subStageCode: "contract_sign", subStageName: "توقيع العقد", parentStage: "contracting", order: 3, durationDays: 1 },
  { subStageCode: "contract_to_project", subStageName: "تحويل إلى مشروع", parentStage: "contracting", order: 4, durationDays: 1 },
  
  // التنفيذ (لكل مرحلة)
  { subStageCode: "execution_progress_report", subStageName: "تقرير إنجاز", parentStage: "execution", order: 1, durationDays: 0 },
  { subStageCode: "execution_payment_request", subStageName: "طلب صرف", parentStage: "execution", order: 2, durationDays: 3 },
  { subStageCode: "execution_payment_order", subStageName: "أمر صرف", parentStage: "execution", order: 3, durationDays: 2 },
  
  // الاستلام
  { subStageCode: "handover_preliminary", subStageName: "الاستلام الابتدائي", parentStage: "handover", order: 1, durationDays: 3 },
  { subStageCode: "handover_warranty", subStageName: "فترة الضمان", parentStage: "handover", order: 2, durationDays: 0 },
  { subStageCode: "handover_final", subStageName: "الاستلام النهائي", parentStage: "handover", order: 3, durationDays: 3 },
  { subStageCode: "handover_final_report", subStageName: "التقرير الختامي", parentStage: "handover", order: 4, durationDays: 3 },
  { subStageCode: "handover_final_payment", subStageName: "الدفعة الختامية", parentStage: "handover", order: 5, durationDays: 5 },
  
  // الإغلاق
  { subStageCode: "closure_stakeholder_satisfaction", subStageName: "قياس رضا أصحاب المصلحة", parentStage: "closed", order: 1, durationDays: 3 },
  { subStageCode: "closure_beneficiary_satisfaction", subStageName: "قياس رضا المستفيدين", parentStage: "closed", order: 2, durationDays: 3 },
  { subStageCode: "closure_publish", subStageName: "النشر", parentStage: "closed", order: 3, durationDays: 3 },
  { subStageCode: "closure_feedback", subStageName: "التغذية الراجعة", parentStage: "closed", order: 4, durationDays: 3 },
  { subStageCode: "closure_archive", subStageName: "أرشفة الملف", parentStage: "closed", order: 5, durationDays: 2 },
];

export const stageSettingsRouter = router({
  // جلب جميع إعدادات المراحل
  getAll: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
    const settings = await db.select().from(stageSettings).orderBy(asc(stageSettings.stageOrder));
    return settings;
  }),

  // جلب إعداد مرحلة محددة
  getByCode: protectedProcedure
    .input(z.object({ stageCode: z.string() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      const [setting] = await db.select().from(stageSettings).where(eq(stageSettings.stageCode, input.stageCode));
      return setting;
    }),

  // تحديث إعداد مرحلة
  update: protectedProcedure
    .input(z.object({
      stageCode: z.string(),
      durationDays: z.number().min(0).optional(),
      warningDays: z.number().min(0).optional(),
      escalationLevel1Days: z.number().min(0).optional(),
      escalationLevel2Days: z.number().min(0).optional(),
      isActive: z.boolean().optional(),
      description: z.string().optional(),
      notificationTitle: z.string().optional(),
      notificationMessage: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      // التحقق من الصلاحيات (المدير العام أو مدير النظام فقط)
      if (!["super_admin", "system_admin"].includes(ctx.user.role)) {
        throw new TRPCError({ code: "FORBIDDEN", message: "ليس لديك صلاحية لتعديل إعدادات المراحل" });
      }

      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      const { stageCode, ...updateData } = input;
      await db.update(stageSettings)
        .set({ ...updateData, updatedAt: new Date() })
        .where(eq(stageSettings.stageCode, stageCode));

      return { success: true };
    }),

  // تهيئة المراحل الافتراضية (الـ 11 مرحلة)
  initializeDefaults: protectedProcedure.mutation(async ({ ctx }) => {
    // التحقق من الصلاحيات
    if (!["super_admin", "system_admin"].includes(ctx.user.role)) {
      throw new TRPCError({ code: "FORBIDDEN", message: "ليس لديك صلاحية لتهيئة المراحل" });
    }

    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

    // التحقق من وجود مراحل مسبقة
    const existing = await db.select().from(stageSettings);
    if (existing.length > 0) {
      // تحديث المراحل الموجودة وإضافة الجديدة
      for (const stage of defaultStages) {
        const existingStage = existing.find(s => s.stageCode === stage.stageCode);
        if (existingStage) {
          // تحديث المرحلة الموجودة
          await db.update(stageSettings)
            .set({
              stageName: stage.stageName,
              stageOrder: stage.stageOrder,
              description: stage.description,
              updatedAt: new Date(),
            })
            .where(eq(stageSettings.stageCode, stage.stageCode));
        } else {
          // إضافة مرحلة جديدة
          await db.insert(stageSettings).values({
            ...stage,
            warningDays: 1,
            escalationLevel1Days: 1,
            escalationLevel2Days: 3,
            isActive: true,
          });
        }
      }
      return { success: true, message: "تم تحديث المراحل بنجاح" };
    }

    // إضافة المراحل الافتراضية
    for (const stage of defaultStages) {
      await db.insert(stageSettings).values({
        ...stage,
        warningDays: 1,
        escalationLevel1Days: 1,
        escalationLevel2Days: 3,
        isActive: true,
      });
    }

    return { success: true, message: "تم تهيئة المراحل الافتراضية بنجاح (11 مرحلة)" };
  }),

  // جلب المراحل الفرعية لمرحلة معينة
  getSubStages: protectedProcedure
    .input(z.object({ parentStage: z.string() }))
    .query(async ({ input }) => {
      return defaultSubStages.filter(s => s.parentStage === input.parentStage);
    }),

  // جلب جميع المراحل الفرعية
  getAllSubStages: protectedProcedure.query(async () => {
    return defaultSubStages;
  }),

  // جلب الطلبات المتأخرة
  getDelayedRequests: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
    const delayed = await db.select()
      .from(requestStageTracking)
      .where(eq(requestStageTracking.isDelayed, true))
      .orderBy(desc(requestStageTracking.delayDays));
    return delayed;
  }),

  // جلب سجل التصعيدات
  getEscalationLogs: protectedProcedure
    .input(z.object({
      requestId: z.number().optional(),
      limit: z.number().default(50),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      
      if (input.requestId) {
        return await db.select().from(escalationLogs)
          .where(eq(escalationLogs.requestId, input.requestId))
          .orderBy(desc(escalationLogs.createdAt))
          .limit(input.limit);
      }
      
      return await db.select().from(escalationLogs).orderBy(desc(escalationLogs.createdAt)).limit(input.limit);
    }),

  // تتبع مرحلة طلب
  trackRequestStage: protectedProcedure
    .input(z.object({
      requestId: z.number(),
      stageCode: z.string(),
      subStageCode: z.string().optional(),
      assignedTo: z.number().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      // جلب إعدادات المرحلة
      const [stageSetting] = await db.select().from(stageSettings)
        .where(eq(stageSettings.stageCode, input.stageCode));

      const durationDays = stageSetting?.durationDays || 7;
      const dueAt = new Date();
      dueAt.setDate(dueAt.getDate() + durationDays);

      // إنشاء سجل تتبع
      await db.insert(requestStageTracking).values({
        requestId: input.requestId,
        stageCode: input.stageCode,
        subStageCode: input.subStageCode,
        startedAt: new Date(),
        dueAt,
        assignedTo: input.assignedTo,
        notes: input.notes,
      });

      return { success: true };
    }),

  // تتبع مرحلة فرعية
  trackSubStage: protectedProcedure
    .input(z.object({
      requestId: z.number(),
      parentStageCode: z.string(),
      subStageCode: z.string(),
      assignedTo: z.number().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      // جلب مدة المرحلة الفرعية
      const subStage = defaultSubStages.find(s => s.subStageCode === input.subStageCode);
      const durationDays = subStage?.durationDays || 3;
      const dueAt = new Date();
      dueAt.setDate(dueAt.getDate() + durationDays);

      await db.insert(requestSubStageTracking).values({
        requestId: input.requestId,
        parentStageCode: input.parentStageCode,
        subStageCode: input.subStageCode,
        startedAt: new Date(),
        dueAt,
        assignedTo: input.assignedTo,
        notes: input.notes,
      });

      return { success: true };
    }),

  // إكمال مرحلة فرعية
  completeSubStage: protectedProcedure
    .input(z.object({
      requestId: z.number(),
      subStageCode: z.string(),
      notes: z.string().optional(),
      actionData: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      // تحديث سجل المرحلة الفرعية
      await db.update(requestSubStageTracking)
        .set({
          completedAt: new Date(),
          completedBy: ctx.user.id,
          notes: input.notes,
          actionData: input.actionData,
          updatedAt: new Date(),
        })
        .where(and(
          eq(requestSubStageTracking.requestId, input.requestId),
          eq(requestSubStageTracking.subStageCode, input.subStageCode),
          isNull(requestSubStageTracking.completedAt)
        ));

      return { success: true };
    }),

  // جلب تتبع المراحل لطلب معين
  getRequestTracking: protectedProcedure
    .input(z.object({ requestId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      const mainTracking = await db.select()
        .from(requestStageTracking)
        .where(eq(requestStageTracking.requestId, input.requestId))
        .orderBy(asc(requestStageTracking.startedAt));

      const subTracking = await db.select()
        .from(requestSubStageTracking)
        .where(eq(requestSubStageTracking.requestId, input.requestId))
        .orderBy(asc(requestSubStageTracking.startedAt));

      return { mainTracking, subTracking };
    }),

  // فحص التأخيرات وإنشاء تصعيدات
  checkDelaysAndEscalate: protectedProcedure.mutation(async ({ ctx }) => {
    // التحقق من الصلاحيات
    if (!["super_admin", "system_admin"].includes(ctx.user.role)) {
      throw new TRPCError({ code: "FORBIDDEN", message: "ليس لديك صلاحية لتشغيل فحص التأخيرات" });
    }

    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

    const now = new Date();
    
    // جلب المراحل غير المكتملة والمتأخرة
    const trackings = await db.select()
      .from(requestStageTracking)
      .where(and(
        isNull(requestStageTracking.completedAt),
        lte(requestStageTracking.dueAt, now)
      ));

    let escalationsCreated = 0;

    for (const tracking of trackings) {
      // حساب أيام التأخير
      if (!tracking.dueAt) continue; // تخطي إذا لم يكن هناك تاريخ استحقاق
      const delayDays = Math.floor((now.getTime() - new Date(tracking.dueAt).getTime()) / (1000 * 60 * 60 * 24));
      
      // تحديث سجل التتبع
      await db.update(requestStageTracking)
        .set({
          isDelayed: true,
          delayDays,
          updatedAt: now,
        })
        .where(eq(requestStageTracking.id, tracking.id));

      // جلب إعدادات المرحلة
      const [stageSetting] = await db.select().from(stageSettings)
        .where(eq(stageSettings.stageCode, tracking.stageCode));

      if (stageSetting) {
        const level1Threshold = stageSetting.escalationLevel1Days || 1;
        const level2Threshold = (stageSetting.escalationLevel1Days || 1) + (stageSetting.escalationLevel2Days || 3);

        // تحديد مستوى التصعيد
        let newEscalationLevel = 0;
        if (delayDays >= level2Threshold) {
          newEscalationLevel = 2;
        } else if (delayDays >= level1Threshold) {
          newEscalationLevel = 1;
        }

        // إنشاء تصعيد إذا لزم الأمر
        if (newEscalationLevel > (tracking.escalationLevel || 0)) {
          await db.update(requestStageTracking)
            .set({ escalationLevel: newEscalationLevel, updatedAt: now })
            .where(eq(requestStageTracking.id, tracking.id));

          // إنشاء سجل تصعيد
          await db.insert(escalationLogs).values({
            requestId: tracking.requestId,
            stageCode: tracking.stageCode,
            escalationLevel: newEscalationLevel,
            escalatedTo: ctx.user.id, // سيتم تحديثه لاحقاً للمدير المناسب
            escalatedFrom: tracking.assignedTo,
            reason: `تأخير ${delayDays} يوم في مرحلة ${tracking.stageCode}`,
            delayDays,
          });

          escalationsCreated++;
        }
      }
    }

    return { 
      success: true, 
      message: `تم فحص ${trackings.length} مرحلة وإنشاء ${escalationsCreated} تصعيد` 
    };
  }),
});
