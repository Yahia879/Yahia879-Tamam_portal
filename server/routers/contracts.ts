import { z } from "zod";
import { router, publicProcedure, protectedProcedure } from "../_core/trpc";
import { getDb } from "../db";
import {
  organizationSettings,
  contractsEnhanced,
  contractPayments,
  contractNumberSequence,
  suppliers,
  projects,
  mosqueRequests,
  contractTypes,
  contractStatuses,
  durationUnits,
  contractTemplates,
  contractClauses,
  contractClauseValues,
  authorizedSignatories,
  quotations,
  contractModificationRequests,
  contractModificationLogs,
  requestHistory,
} from "../../drizzle/schema";
import { eq, desc, and, sql, asc, ne } from "drizzle-orm";

// دالة تحويل الرقم إلى نص عربي
function numberToArabicText(num: number): string {
  const ones = ["", "واحد", "اثنان", "ثلاثة", "أربعة", "خمسة", "ستة", "سبعة", "ثمانية", "تسعة"];
  const tens = ["", "عشرة", "عشرون", "ثلاثون", "أربعون", "خمسون", "ستون", "سبعون", "ثمانون", "تسعون"];
  const hundreds = ["", "مائة", "مائتان", "ثلاثمائة", "أربعمائة", "خمسمائة", "ستمائة", "سبعمائة", "ثمانمائة", "تسعمائة"];
  const thousands = ["", "ألف", "ألفان", "ثلاثة آلاف", "أربعة آلاف", "خمسة آلاف", "ستة آلاف", "سبعة آلاف", "ثمانية آلاف", "تسعة آلاف"];
  const tenThousands = ["", "عشرة آلاف", "عشرون ألف", "ثلاثون ألف", "أربعون ألف", "خمسون ألف", "ستون ألف", "سبعون ألف", "ثمانون ألف", "تسعون ألف"];
  const hundredThousands = ["", "مائة ألف", "مائتا ألف", "ثلاثمائة ألف", "أربعمائة ألف", "خمسمائة ألف", "ستمائة ألف", "سبعمائة ألف", "ثمانمائة ألف", "تسعمائة ألف"];
  
  if (num === 0) return "صفر";
  if (num >= 1000000) return `${Math.floor(num / 1000000)} مليون و${numberToArabicText(num % 1000000)}`;
  
  let result = "";
  
  // مئات الآلاف
  const hThousands = Math.floor(num / 100000);
  if (hThousands > 0) {
    result += hundredThousands[hThousands] + " ";
    num %= 100000;
  }
  
  // عشرات الآلاف
  const tThousands = Math.floor(num / 10000);
  if (tThousands > 0) {
    result += tenThousands[tThousands] + " ";
    num %= 10000;
  }
  
  // الآلاف
  const th = Math.floor(num / 1000);
  if (th > 0) {
    result += thousands[th] + " ";
    num %= 1000;
  }
  
  // المئات
  const h = Math.floor(num / 100);
  if (h > 0) {
    result += hundreds[h] + " ";
    num %= 100;
  }
  
  // العشرات والآحاد
  if (num >= 11 && num <= 19) {
    const special = ["أحد عشر", "اثنا عشر", "ثلاثة عشر", "أربعة عشر", "خمسة عشر", "ستة عشر", "سبعة عشر", "ثمانية عشر", "تسعة عشر"];
    result += special[num - 11] + " ";
  } else {
    const t = Math.floor(num / 10);
    const o = num % 10;
    if (o > 0 && t > 0) {
      result += ones[o] + " و" + tens[t] + " ";
    } else if (t > 0) {
      result += tens[t] + " ";
    } else if (o > 0) {
      result += ones[o] + " ";
    }
  }
  
  return result.trim() + " ريال";
}

// دالة توليد رقم العقد
async function generateContractNumber(db: NonNullable<Awaited<ReturnType<typeof getDb>>>): Promise<{ number: string; year: number; sequence: number }> {
  const currentYear = new Date().getFullYear();
  
  // البحث عن التسلسل الحالي للسنة
  const [existing] = await db
    .select()
    .from(contractNumberSequence)
    .where(eq(contractNumberSequence.year, currentYear));
  
  let sequence: number;
  
  if (existing) {
    sequence = existing.lastSequence + 1;
    await db
      .update(contractNumberSequence)
      .set({ lastSequence: sequence })
      .where(eq(contractNumberSequence.year, currentYear));
  } else {
    sequence = 1;
    await db.insert(contractNumberSequence).values({
      year: currentYear,
      lastSequence: sequence,
    });
  }
  
  // تنسيق الرقم: CNT-YYYY-XXXX
  const contractNumber = `CNT-${currentYear}-${String(sequence).padStart(4, "0")}`;
  
  return { number: contractNumber, year: currentYear, sequence };
}

export const contractsRouter = router({
  // ==================== إعدادات الجمعية ====================
  
  // جلب إعدادات الجمعية
  getOrganizationSettings: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new Error("قاعدة البيانات غير متاحة");
    const [settings] = await db.select().from(organizationSettings).limit(1);
    return settings || null;
  }),
  
  // حفظ/تحديث إعدادات الجمعية
  saveOrganizationSettings: protectedProcedure
    .input(
      z.object({
        organizationName: z.string().min(1, "اسم الجمعية مطلوب"),
        organizationNameShort: z.string().optional(),
        licenseNumber: z.string().optional(),
        authorizedSignatory: z.string().optional(),
        signatoryTitle: z.string().optional(),
        signatoryPhone: z.string().optional(),
        signatoryEmail: z.string().email().optional().or(z.literal("")),
        address: z.string().optional(),
        city: z.string().optional(),
        phone: z.string().optional(),
        email: z.string().email().optional().or(z.literal("")),
        website: z.string().optional(),
        logoUrl: z.string().optional(),
        stampUrl: z.string().optional(),
        // البيانات البنكية
        bankName: z.string().optional(),
        bankAccountName: z.string().optional(),
        iban: z.string().optional(),
        // إعدادات العقود
        contractPrefix: z.string().optional(),
        contractFooterText: z.string().optional(),
        contractTermsAndConditions: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
    if (!db) throw new Error("قاعدة البيانات غير متاحة");
      
      // التحقق من وجود إعدادات سابقة
      const [existing] = await db.select().from(organizationSettings).limit(1);
      
      if (existing) {
        // تحديث الإعدادات الموجودة
        await db
          .update(organizationSettings)
          .set({
            ...input,
            updatedBy: ctx.user.id,
          })
          .where(eq(organizationSettings.id, existing.id));
        
        return { success: true, id: existing.id };
      } else {
        // إنشاء إعدادات جديدة
        const [result] = await db.insert(organizationSettings).values({
          ...input,
          updatedBy: ctx.user.id,
        });
        
        return { success: true, id: result.insertId };
      }
    }),
  
  // ==================== العقود ====================
  
  // جلب قائمة العقود
  list: protectedProcedure
    .input(
      z.object({
        status: z.enum(contractStatuses).optional(),
        contractType: z.enum(contractTypes).optional(),
        projectId: z.number().optional(),
        page: z.number().default(1),
        limit: z.number().default(10),
      }).optional()
    )
    .query(async ({ input }) => {
      const db = await getDb();
    if (!db) throw new Error("قاعدة البيانات غير متاحة");
      const { status, contractType, projectId, page = 1, limit = 10 } = input || {};
      
      let query = db.select().from(contractsEnhanced);
      
      const conditions = [];
      if (status) conditions.push(eq(contractsEnhanced.status, status));
      if (contractType) conditions.push(eq(contractsEnhanced.contractType, contractType));
      if (projectId) conditions.push(eq(contractsEnhanced.projectId, projectId));
      
      if (conditions.length > 0) {
        query = query.where(and(...conditions)) as typeof query;
      }
      
      const contracts = await query
        .orderBy(desc(contractsEnhanced.createdAt))
        .limit(limit)
        .offset((page - 1) * limit);
      
      // جلب العدد الإجمالي
      const [countResult] = await db
        .select({ count: sql<number>`count(*)` })
        .from(contractsEnhanced);
      
      return {
        contracts,
        total: countResult?.count || 0,
        page,
        limit,
      };
    }),
  
  // جلب عقد بواسطة requestId
  getByRequestId: protectedProcedure
    .input(z.object({ requestId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("قاعدة البيانات غير متاحة");
      
      const [contract] = await db
        .select()
        .from(contractsEnhanced)
        .where(eq(contractsEnhanced.requestId, input.requestId))
        .limit(1);
      
      return contract || null;
    }),

  // جلب عقد بالتفصيل
  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
    if (!db) throw new Error("قاعدة البيانات غير متاحة");
      
      const [contract] = await db
        .select()
        .from(contractsEnhanced)
        .where(eq(contractsEnhanced.id, input.id));
      
      if (!contract) {
        throw new Error("العقد غير موجود");
      }
      
      // جلب الدفعات
      const payments = await db
        .select()
        .from(contractPayments)
        .where(eq(contractPayments.contractId, input.id))
        .orderBy(contractPayments.phaseOrder);
      
      // جلب إعدادات الجمعية
      const [orgSettings] = await db.select().from(organizationSettings).limit(1);
      
      return {
        contract,
        payments,
        organizationSettings: orgSettings,
      };
    }),
  
  // إنشاء عقد جديد
  create: protectedProcedure
    .input(
      z.object({
        contractType: z.enum(contractTypes),
        contractTitle: z.string().min(1, "عنوان العقد مطلوب"),
        projectId: z.number().optional(),
        requestId: z.number().optional(),
        supplierId: z.number().optional(),
        
        // بيانات الطرف الثاني
        secondPartyName: z.string().min(1, "اسم الطرف الثاني مطلوب"),
        secondPartyCommercialRegister: z.string().optional(),
        secondPartyRepresentative: z.string().optional(),
        secondPartyTitle: z.string().optional(),
        secondPartyAddress: z.string().optional(),
        secondPartyPhone: z.string().optional(),
        secondPartyEmail: z.string().email().optional().or(z.literal("")),
        secondPartyBankName: z.string().optional(),
        secondPartyIban: z.string().optional(),
        secondPartyAccountName: z.string().optional(),
        
        // بيانات المسجد
        mosqueName: z.string().optional(),
        mosqueNeighborhood: z.string().optional(),
        mosqueCity: z.string().optional(),
        
        // قيمة ومدة العقد
        contractAmount: z.number().min(0, "قيمة العقد يجب أن تكون أكبر من صفر"),
        duration: z.number().min(1, "مدة العقد مطلوبة"),
        durationUnit: z.enum(durationUnits).default("months"),
        
        // التواريخ
        contractDate: z.string().optional(),
        contractDateHijri: z.string().optional(),
        startDate: z.string().optional(),
        
        // القالب
        templateId: z.number().optional(),
        
        // مفوض التوقيع
        signatoryId: z.number().optional(),
        
        // البنود الإضافية
        customTerms: z.string().optional(),
        customNotifications: z.string().optional(),
        customGeneralTerms: z.string().optional(),
        
        // جدول الدفعات (JSON string)
        paymentSchedule: z.string().optional(),
        
        // بنود العقد المخصصة (JSON string)
        clauseValues: z.string().optional(),
        
        // الدفعات (للتوافق مع الكود القديم)
        payments: z.array(
          z.object({
            phaseName: z.string(),
            amount: z.number(),
            phaseOrder: z.number(),
          })
        ).optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
    if (!db) throw new Error("قاعدة البيانات غير متاحة");
      
      // توليد رقم العقد
      const { number: contractNumber, year, sequence } = await generateContractNumber(db);
      
      // تحويل المبلغ إلى نص عربي
      const contractAmountText = numberToArabicText(input.contractAmount);
      
      // إنشاء العقد
      const signatoryIdValue = (input.signatoryId && typeof input.signatoryId === 'number' && input.signatoryId > 0) ? input.signatoryId : undefined;
      console.log('signatoryId value:', signatoryIdValue);
      
      // تحذير عند إنشاء عقد بدون requestId
      if (input.projectId && !input.requestId) {
        console.warn('[Contract Create] ⚠️ Project provided without requestId - stage update will not work automatically');
        console.warn('[Contract Create] projectId:', input.projectId, 'requestId:', input.requestId);
      }
      
      const contractData: any = {
        contractNumber,
        contractYear: year,
        contractSequence: sequence,
        contractType: input.contractType,
        contractTitle: input.contractTitle,
        projectId: input.projectId ?? null,
        requestId: input.requestId ?? null,
        supplierId: input.supplierId,
        secondPartyName: input.secondPartyName,
        secondPartyCommercialRegister: input.secondPartyCommercialRegister ?? null,
        secondPartyRepresentative: input.secondPartyRepresentative ?? null,
        secondPartyTitle: input.secondPartyTitle ?? null,
        secondPartyAddress: input.secondPartyAddress ?? null,
        secondPartyPhone: input.secondPartyPhone ?? null,
        secondPartyEmail: input.secondPartyEmail ?? null,
        secondPartyBankName: input.secondPartyBankName ?? null,
        secondPartyIban: input.secondPartyIban ?? null,
        secondPartyAccountName: input.secondPartyAccountName ?? null,
        mosqueName: input.mosqueName ?? null,
        mosqueNeighborhood: input.mosqueNeighborhood ?? null,
        mosqueCity: input.mosqueCity ?? null,
        contractAmount: String(input.contractAmount),
        contractAmountText,
        duration: input.duration,
        durationUnit: input.durationUnit,
        contractDate: input.contractDate ? new Date(input.contractDate) : null,
        contractDateHijri: (input.contractDateHijri && input.contractDateHijri.trim() !== '') ? input.contractDateHijri : null,
        startDate: input.startDate ? new Date(input.startDate) : null,
        endDate: null,
        customTerms: input.customTerms ?? null,
        customNotifications: input.customNotifications ?? null,
        customGeneralTerms: input.customGeneralTerms ?? null,
        templateId: input.templateId ?? null,
        signatoryId: signatoryIdValue ? signatoryIdValue : null,
        paymentScheduleJson: input.paymentSchedule ?? null,
        clauseValuesJson: input.clauseValues ?? null,
        documentUrl: null,
        signedDocumentUrl: null,
        approvedBy: null,
        approvedAt: null,
        status: "draft",
        createdBy: ctx.user.id,
      };
      
      console.log('Contract data to insert:', JSON.stringify(contractData, null, 2));
      const [result] = await db.insert(contractsEnhanced).values(contractData);
      
      const contractId = result.insertId;
      
      // إضافة الدفعات من paymentSchedule JSON
      if (input.paymentSchedule) {
        try {
          const schedule = JSON.parse(input.paymentSchedule);
          if (Array.isArray(schedule) && schedule.length > 0) {
            await db.insert(contractPayments).values(
              schedule.map((p: any, index: number) => ({
                contractId,
                phaseName: p.name || `الدفعة ${index + 1}`,
                amount: String(p.amount || 0),
                phaseOrder: index,
                dueDate: p.dueDate ? new Date(p.dueDate) : null,
                status: "pending" as const,
              }))
            );
          }
        } catch (e) {
          console.error("خطأ في تحليل جدول الدفعات:", e);
        }
      } else if (input.payments && input.payments.length > 0) {
        // التوافق مع الكود القديم
        await db.insert(contractPayments).values(
          input.payments.map((p) => ({
            contractId,
            phaseName: p.phaseName,
            amount: String(p.amount),
            phaseOrder: p.phaseOrder,
            status: "pending" as const,
          }))
        );
      }
      
      // حفظ قيم البنود المخصصة
      if (input.clauseValues) {
        try {
          const clauses = JSON.parse(input.clauseValues);
          if (Array.isArray(clauses) && clauses.length > 0) {
            await db.insert(contractClauseValues).values(
              clauses.map((c: any) => ({
                contractId,
                clauseId: c.clauseId,
                customContent: c.customContent || null,
                isIncluded: c.isIncluded ?? true,
              }))
            );
          }
        } catch (e) {
          console.error("خطأ في تحليل بنود العقد:", e);
        }
      }
      
      // إضافة سجل في التاريخ إذا كان العقد مرتبط بطلب
      if (input.requestId) {
        try {
          await db.insert(requestHistory).values({
            requestId: input.requestId,
            userId: ctx.user.id,
            action: `تم إنشاء عقد جديد برقم ${contractNumber}`,
            notes: `عقد: ${input.contractTitle} - الطرف الثاني: ${input.secondPartyName} - القيمة: ${input.contractAmount.toLocaleString('ar-SA')} ريال`,
          });
        } catch (e) {
          console.error("خطأ في إضافة سجل التاريخ:", e);
        }
      }
      
      return { success: true, id: contractId, contractNumber };
    }),
  
  // تحديث عقد
  update: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        contractTitle: z.string().optional(),
        secondPartyName: z.string().optional(),
        secondPartyCommercialRegister: z.string().optional(),
        secondPartyRepresentative: z.string().optional(),
        secondPartyTitle: z.string().optional(),
        secondPartyAddress: z.string().optional(),
        secondPartyPhone: z.string().optional(),
        secondPartyEmail: z.string().email().optional().or(z.literal("")),
        secondPartyBankName: z.string().optional(),
        secondPartyIban: z.string().optional(),
        secondPartyAccountName: z.string().optional(),
        mosqueName: z.string().optional(),
        mosqueNeighborhood: z.string().optional(),
        mosqueCity: z.string().optional(),
        contractAmount: z.number().optional(),
        duration: z.number().optional(),
        durationUnit: z.enum(durationUnits).optional(),
        contractDate: z.string().optional(),
        contractDateHijri: z.string().optional(),
        customTerms: z.string().optional(),
        customNotifications: z.string().optional(),
        customGeneralTerms: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
    if (!db) throw new Error("قاعدة البيانات غير متاحة");
      const { id, ...updateData } = input;
      
      // التحقق من أن العقد في حالة مسودة
      const [contract] = await db
        .select()
        .from(contractsEnhanced)
        .where(eq(contractsEnhanced.id, id));
      
      if (!contract) {
        throw new Error("العقد غير موجود");
      }
      
      if (contract.status !== "draft") {
        throw new Error("لا يمكن تعديل العقد بعد اعتماده");
      }
      
      // تحديث المبلغ بالنص إذا تم تغيير المبلغ
      const updates: Record<string, unknown> = { ...updateData };
      if (updateData.contractAmount) {
        updates.contractAmount = String(updateData.contractAmount);
        updates.contractAmountText = numberToArabicText(updateData.contractAmount);
      }
      if (updateData.contractDate) {
        updates.contractDate = new Date(updateData.contractDate);
      }
      
      await db
        .update(contractsEnhanced)
        .set(updates)
        .where(eq(contractsEnhanced.id, id));
      
      return { success: true };
    }),
  
  // اعتماد العقد
  approve: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
    if (!db) throw new Error("قاعدة البيانات غير متاحة");
      
      const [contract] = await db
        .select()
        .from(contractsEnhanced)
        .where(eq(contractsEnhanced.id, input.id));
      
      if (!contract) {
        throw new Error("العقد غير موجود");
      }
      
      if (contract.status !== "draft" && contract.status !== "pending_approval") {
        throw new Error("لا يمكن اعتماد هذا العقد");
      }
      
      // التحقق من عدم وجود عقد معتمد آخر لنفس المشروع
      if (contract.projectId) {
        const existingApprovedContract = await db
          .select()
          .from(contractsEnhanced)
          .where(
            and(
              eq(contractsEnhanced.projectId, contract.projectId),
              eq(contractsEnhanced.status, "approved"),
              ne(contractsEnhanced.id, input.id)
            )
          );
        
        if (existingApprovedContract.length > 0) {
          throw new Error("يوجد عقد معتمد مسبقاً لهذا المشروع. لا يمكن اعتماد أكثر من عقد واحد لنفس المشروع.");
        }
      }
      
      await db
        .update(contractsEnhanced)
        .set({
          status: "approved",
          approvedBy: ctx.user.id,
          approvedAt: new Date(),
        })
        .where(eq(contractsEnhanced.id, input.id));
      
      // تحديث حالة المشروع إلى "قيد التنفيذ" عند اعتماد العقد
      console.log('[Contract Approve] Starting stage update - projectId:', contract.projectId, 'requestId:', contract.requestId);
      if (contract.projectId) {
        await db
          .update(projects)
          .set({
            status: "in_progress",
            updatedAt: new Date(),
          })
          .where(eq(projects.id, contract.projectId));
        console.log('[Contract Approve] Project status updated to in_progress');
        
        // تحديث مرحلة الطلب إلى "execution" عند اعتماد العقد
        if (contract.requestId) {
          console.log('[Contract Approve] Updating request stage to execution for requestId:', contract.requestId);
          await db
            .update(mosqueRequests)
            .set({
              currentStage: "execution",
              updatedAt: new Date(),
            })
            .where(eq(mosqueRequests.id, contract.requestId));
          
          console.log('[Contract Approve] Request stage updated successfully');
          
          // إضافة سجل في تاريخ الطلب
          await db.insert(requestHistory).values({
            requestId: contract.requestId,
            userId: ctx.user.id,
            action: "اعتماد العقد",
            notes: `تم اعتماد العقد رقم ${contract.contractNumber} وتحويل المشروع إلى مرحلة التنفيذ`,
          });
          console.log('[Contract Approve] Request history entry added');
        } else {
          console.log('[Contract Approve] No requestId found, skipping request stage update');
        }
      } else {
        console.log('[Contract Approve] No projectId found, skipping updates');
      }
      
      return { success: true, message: "تم اعتماد العقد وتحويل المشروع إلى مرحلة التنفيذ" };
    }),
  
  // تفعيل العقد
  activate: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        startDate: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
    if (!db) throw new Error("قاعدة البيانات غير متاحة");
      
      const [contract] = await db
        .select()
        .from(contractsEnhanced)
        .where(eq(contractsEnhanced.id, input.id));
      
      if (!contract) {
        throw new Error("العقد غير موجود");
      }
      
      if (contract.status !== "approved") {
        throw new Error("يجب اعتماد العقد أولاً");
      }
      
      // حساب تاريخ الانتهاء
      const startDate = new Date(input.startDate);
      const endDate = new Date(startDate);
      
      switch (contract.durationUnit) {
        case "days":
          endDate.setDate(endDate.getDate() + contract.duration);
          break;
        case "weeks":
          endDate.setDate(endDate.getDate() + contract.duration * 7);
          break;
        case "months":
        default:
          endDate.setMonth(endDate.getMonth() + contract.duration);
          break;
      }
      
      await db
        .update(contractsEnhanced)
        .set({
          status: "active",
          startDate,
          endDate,
        })
        .where(eq(contractsEnhanced.id, input.id));
      
      return { success: true };
    }),
  
  // تحويل العقد إلى مشروع
  convertToProject: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
    if (!db) throw new Error("قاعدة البيانات غير متاحة");
      
      const [contract] = await db
        .select()
        .from(contractsEnhanced)
        .where(eq(contractsEnhanced.id, input.id));
      
      if (!contract) {
        throw new Error("العقد غير موجود");
      }
      
      if (contract.status !== "approved" && contract.status !== "active") {
        throw new Error("يجب اعتماد العقد أولاً");
      }
      
      if (contract.projectId) {
        throw new Error("العقد مرتبط بمشروع بالفعل");
      }
      
      // إنشاء مشروع جديد
      const projectNumber = `PRJ-${contract.contractNumber}`;
      
      // التحقق من وجود requestId
      if (!contract.requestId) {
        throw new Error("العقد غير مرتبط بطلب");
      }
      
      const [projectResult] = await db.insert(projects).values({
        projectNumber,
        name: contract.contractTitle,
        requestId: contract.requestId,
        status: "planning",
        budget: contract.contractAmount,
      });
      
      // ربط العقد بالمشروع
      await db
        .update(contractsEnhanced)
        .set({ projectId: projectResult.insertId })
        .where(eq(contractsEnhanced.id, input.id));
      
      return { success: true, projectId: projectResult.insertId };
    }),
  
  // ==================== دفعات العقد ====================
  
  // تحديث دفعات العقد
  updatePayments: protectedProcedure
    .input(
      z.object({
        contractId: z.number(),
        payments: z.array(
          z.object({
            id: z.number().optional(),
            phaseName: z.string(),
            amount: z.number(),
            phaseOrder: z.number(),
            dueDate: z.string().optional(),
          })
        ),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
    if (!db) throw new Error("قاعدة البيانات غير متاحة");
      
      // حذف الدفعات القديمة
      await db
        .delete(contractPayments)
        .where(eq(contractPayments.contractId, input.contractId));
      
      // إضافة الدفعات الجديدة
      if (input.payments.length > 0) {
        await db.insert(contractPayments).values(
          input.payments.map((p) => ({
            contractId: input.contractId,
            phaseName: p.phaseName,
            amount: String(p.amount),
            phaseOrder: p.phaseOrder,
            dueDate: p.dueDate ? new Date(p.dueDate) : null,
            status: "pending" as const,
          }))
        );
      }
      
      return { success: true };
    }),
  
  // تسجيل دفعة
  recordPayment: protectedProcedure
    .input(
      z.object({
        paymentId: z.number(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
    if (!db) throw new Error("قاعدة البيانات غير متاحة");
      
      await db
        .update(contractPayments)
        .set({
          status: "paid",
          paidAt: new Date(),
          paidBy: ctx.user.id,
        })
        .where(eq(contractPayments.id, input.paymentId));
      
      return { success: true };
    }),
  
  // ==================== الموردين ====================
  
  // جلب قائمة الموردين
  getSuppliers: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new Error("قاعدة البيانات غير متاحة");
    const suppliersList = await db
      .select()
      .from(suppliers)
      .where(eq(suppliers.status, "active"))
      .orderBy(suppliers.name);
    
    return suppliersList;
  }),

  // ==================== قوالب العقود ====================

  // الحصول على جميع قوالب العقود
  getTemplates: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new Error("قاعدة البيانات غير متاحة");
    const templates = await db
      .select()
      .from(contractTemplates)
      .orderBy(desc(contractTemplates.createdAt));
    return templates;
  }),

  // الحصول على قالب واحد مع بنوده
  getTemplate: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("قاعدة البيانات غير متاحة");
      
      const [template] = await db
        .select()
        .from(contractTemplates)
        .where(eq(contractTemplates.id, input.id));

      if (!template) {
        throw new Error("القالب غير موجود");
      }

      const clauses = await db
        .select()
        .from(contractClauses)
        .where(eq(contractClauses.templateId, input.id))
        .orderBy(asc(contractClauses.orderIndex));

      return { ...template, clauses };
    }),

  // إنشاء قالب جديد
  createTemplate: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1),
        nameAr: z.string().min(1),
        type: z.string(),
        description: z.string().optional(),
        headerTemplate: z.string().optional(),
        introTemplate: z.string().optional(),
        footerTemplate: z.string().optional(),
        signatureTemplate: z.string().optional(),
        isDefault: z.boolean().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("قاعدة البيانات غير متاحة");

      // إذا كان القالب الافتراضي، إلغاء الافتراضي من القوالب الأخرى
      if (input.isDefault) {
        await db
          .update(contractTemplates)
          .set({ isDefault: false })
          .where(eq(contractTemplates.type, input.type as any));
      }

      const [result] = await db.insert(contractTemplates).values({
        ...input,
        type: input.type as any,
        createdBy: ctx.user.id,
      });

      return { id: result.insertId };
    }),

  // تحديث قالب
  updateTemplate: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        name: z.string().min(1).optional(),
        nameAr: z.string().min(1).optional(),
        type: z.string().optional(),
        description: z.string().optional(),
        headerTemplate: z.string().optional(),
        introTemplate: z.string().optional(),
        footerTemplate: z.string().optional(),
        signatureTemplate: z.string().optional(),
        isActive: z.boolean().optional(),
        isDefault: z.boolean().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("قاعدة البيانات غير متاحة");
      const { id, ...data } = input;

      // إذا كان القالب الافتراضي، إلغاء الافتراضي من القوالب الأخرى
      if (data.isDefault && data.type) {
        await db
          .update(contractTemplates)
          .set({ isDefault: false })
          .where(eq(contractTemplates.type, data.type as any));
      }

      await db
        .update(contractTemplates)
        .set(data as any)
        .where(eq(contractTemplates.id, id));

      return { success: true };
    }),

  // حذف قالب
  deleteTemplate: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("قاعدة البيانات غير متاحة");
      
      // حذف البنود المرتبطة أولاً
      await db
        .delete(contractClauses)
        .where(eq(contractClauses.templateId, input.id));

      // حذف القالب
      await db
        .delete(contractTemplates)
        .where(eq(contractTemplates.id, input.id));

      return { success: true };
    }),

  // ==================== بنود العقود ====================

  // الحصول على بنود قالب معين
  getTemplateClauses: protectedProcedure
    .input(z.object({ templateId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("قاعدة البيانات غير متاحة");
      const clauses = await db
        .select()
        .from(contractClauses)
        .where(eq(contractClauses.templateId, input.templateId))
        .orderBy(asc(contractClauses.orderIndex));
      return clauses;
    }),

  // الحصول على البنود العامة (غير مرتبطة بقالب)
  getGlobalClauses: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new Error("قاعدة البيانات غير متاحة");
    const clauses = await db
      .select()
      .from(contractClauses)
      .where(eq(contractClauses.isGlobal, true))
      .orderBy(asc(contractClauses.orderIndex));
    return clauses;
  }),

  // إضافة بند جديد
  createClause: protectedProcedure
    .input(
      z.object({
        templateId: z.number().optional(),
        title: z.string().min(1),
        titleAr: z.string().min(1),
        content: z.string().min(1),
        category: z.string().optional(),
        orderIndex: z.number().optional(),
        isRequired: z.boolean().optional(),
        isEditable: z.boolean().optional(),
        isGlobal: z.boolean().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("قاعدة البيانات غير متاحة");
      const [result] = await db.insert(contractClauses).values(input as any);
      return { id: result.insertId };
    }),

  // تحديث بند
  updateClause: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        title: z.string().min(1).optional(),
        titleAr: z.string().min(1).optional(),
        content: z.string().optional(),
        category: z.string().optional(),
        orderIndex: z.number().optional(),
        isRequired: z.boolean().optional(),
        isEditable: z.boolean().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("قاعدة البيانات غير متاحة");
      const { id, ...data } = input;
      await db.update(contractClauses).set(data as any).where(eq(contractClauses.id, id));
      return { success: true };
    }),

  // حذف بند
  deleteClause: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("قاعدة البيانات غير متاحة");
      await db.delete(contractClauses).where(eq(contractClauses.id, input.id));
      return { success: true };
    }),

  // إعادة ترتيب البنود
  reorderClauses: protectedProcedure
    .input(
      z.object({
        templateId: z.number(),
        clauseIds: z.array(z.number()),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("قاعدة البيانات غير متاحة");
      for (let i = 0; i < input.clauseIds.length; i++) {
        await db
          .update(contractClauses)
          .set({ orderIndex: i })
          .where(eq(contractClauses.id, input.clauseIds[i]));
      }
      return { success: true };
    }),

  // ==================== المفوضين بالتوقيع ====================

  // الحصول على جميع المفوضين
  getSignatories: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new Error("قاعدة البيانات غير متاحة");
    const signatories = await db
      .select()
      .from(authorizedSignatories)
      .orderBy(desc(authorizedSignatories.createdAt));
    return signatories;
  }),

  // إضافة مفوض جديد
  createSignatory: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1),
        title: z.string().min(1),
        nationalId: z.string().optional(),
        phone: z.string().optional(),
        email: z.string().email().optional().or(z.literal("")),
        address: z.string().optional(),
        signatureUrl: z.string().optional(),
        isDefault: z.boolean().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("قاعدة البيانات غير متاحة");

      // إذا كان المفوض الافتراضي، إلغاء الافتراضي من الآخرين
      if (input.isDefault) {
        await db.update(authorizedSignatories).set({ isDefault: false });
      }

      const [result] = await db.insert(authorizedSignatories).values({
        ...input,
        email: input.email || null,
      });
      return { id: result.insertId };
    }),

  // تحديث مفوض
  updateSignatory: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        name: z.string().min(1).optional(),
        title: z.string().min(1).optional(),
        nationalId: z.string().optional(),
        phone: z.string().optional(),
        email: z.string().email().optional().or(z.literal("")),
        address: z.string().optional(),
        signatureUrl: z.string().optional(),
        isActive: z.boolean().optional(),
        isDefault: z.boolean().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("قاعدة البيانات غير متاحة");
      const { id, ...data } = input;

      if (data.isDefault) {
        await db.update(authorizedSignatories).set({ isDefault: false });
      }

      await db
        .update(authorizedSignatories)
        .set({ ...data, email: data.email || null })
        .where(eq(authorizedSignatories.id, id));

      return { success: true };
    }),

  // حذف مفوض
  deleteSignatory: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("قاعدة البيانات غير متاحة");
      await db
        .delete(authorizedSignatories)
        .where(eq(authorizedSignatories.id, input.id));
      return { success: true };
    }),

  // الحصول على القوالب النشطة حسب النوع
  getActiveTemplatesByType: protectedProcedure
    .input(z.object({ type: z.string() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("قاعدة البيانات غير متاحة");
      const templates = await db
        .select()
        .from(contractTemplates)
        .where(
          and(
            eq(contractTemplates.type, input.type as any),
            eq(contractTemplates.isActive, true)
          )
        )
        .orderBy(desc(contractTemplates.isDefault), desc(contractTemplates.createdAt));

      return templates;
    }),

  // ==================== تكرار العقد ====================

  // تكرار عقد موجود
  duplicate: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("قاعدة البيانات غير متاحة");

      // جلب العقد الأصلي
      const [originalContract] = await db
        .select()
        .from(contractsEnhanced)
        .where(eq(contractsEnhanced.id, input.id));

      if (!originalContract) {
        throw new Error("العقد غير موجود");
      }

      // توليد رقم عقد جديد
      const { number: contractNumber, year, sequence } = await generateContractNumber(db);

      // إنشاء العقد المكرر
      const [result] = await db.insert(contractsEnhanced).values({
        contractNumber,
        contractYear: year,
        contractSequence: sequence,
        contractType: originalContract.contractType,
        contractTitle: `${originalContract.contractTitle} (نسخة)`,
        projectId: null, // لا نربط بنفس المشروع
        requestId: null, // لا نربط بنفس الطلب
        supplierId: originalContract.supplierId,
        secondPartyName: originalContract.secondPartyName,
        secondPartyCommercialRegister: originalContract.secondPartyCommercialRegister,
        secondPartyRepresentative: originalContract.secondPartyRepresentative,
        secondPartyTitle: originalContract.secondPartyTitle,
        secondPartyAddress: originalContract.secondPartyAddress,
        secondPartyPhone: originalContract.secondPartyPhone,
        secondPartyEmail: originalContract.secondPartyEmail,
        secondPartyBankName: originalContract.secondPartyBankName,
        secondPartyIban: originalContract.secondPartyIban,
        secondPartyAccountName: originalContract.secondPartyAccountName,
        mosqueName: originalContract.mosqueName,
        mosqueNeighborhood: originalContract.mosqueNeighborhood,
        mosqueCity: originalContract.mosqueCity,
        contractAmount: originalContract.contractAmount,
        contractAmountText: originalContract.contractAmountText,
        duration: originalContract.duration,
        durationUnit: originalContract.durationUnit,
        contractDate: null, // تاريخ جديد
        contractDateHijri: null,
        customTerms: originalContract.customTerms,
        customNotifications: originalContract.customNotifications,
        customGeneralTerms: originalContract.customGeneralTerms,
        templateId: originalContract.templateId,
        paymentScheduleJson: originalContract.paymentScheduleJson,
        clauseValuesJson: originalContract.clauseValuesJson,
        status: "draft", // النسخة تبدأ كمسودة
        createdBy: ctx.user.id,
      });

      const newContractId = result.insertId;

      // نسخ جدول الدفعات
      const originalPayments = await db
        .select()
        .from(contractPayments)
        .where(eq(contractPayments.contractId, input.id));

      if (originalPayments.length > 0) {
        await db.insert(contractPayments).values(
          originalPayments.map((p) => ({
            contractId: newContractId,
            phaseName: p.phaseName,
            amount: p.amount,
            phaseOrder: p.phaseOrder,
            dueDate: null, // تواريخ جديدة
            status: "pending" as const,
          }))
        );
      }

      // نسخ بنود العقد المخصصة
      const originalClauseValues = await db
        .select()
        .from(contractClauseValues)
        .where(eq(contractClauseValues.contractId, input.id));

      if (originalClauseValues.length > 0) {
        await db.insert(contractClauseValues).values(
          originalClauseValues.map((c) => ({
            contractId: newContractId,
            clauseId: c.clauseId,
            customContent: c.customContent,
            isIncluded: c.isIncluded,
          }))
        );
      }

      return { success: true, id: newContractId, contractNumber };
    }),

  // الحصول على عرض السعر المعتمد للطلب
  getApprovedQuotationForRequest: protectedProcedure
    .input(z.object({ requestId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("قاعدة البيانات غير متاحة");
      const [quotation] = await db
        .select({
          id: quotations.id,
          quotationNumber: quotations.quotationNumber,
          totalAmount: quotations.totalAmount,
          approvedAmount: quotations.approvedAmount,
          supplierId: quotations.supplierId,
          supplierName: suppliers.name,
        })
        .from(quotations)
        .leftJoin(suppliers, eq(quotations.supplierId, suppliers.id))
        .where(
          and(
            eq(quotations.requestId, input.requestId),
            eq(quotations.status, "accepted")
          )
        )
        .limit(1);

      return quotation;
    }),

  // ==================== طلبات تعديل العقود ====================

  // التحقق من إمكانية تعديل العقد
  canModifyContract: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("قاعدة البيانات غير متاحة");
      
      const [contract] = await db
        .select()
        .from(contractsEnhanced)
        .where(eq(contractsEnhanced.id, input.id));
      
      if (!contract) {
        return { canModify: false, reason: "العقد غير موجود" };
      }
      
      // التحقق من وجود دفعات مصروفة
      const paidPayments = await db
        .select()
        .from(contractPayments)
        .where(
          and(
            eq(contractPayments.contractId, input.id),
            eq(contractPayments.status, "paid")
          )
        );
      
      if (paidPayments.length > 0) {
        return { 
          canModify: false, 
          reason: "لا يمكن تعديل العقد لأنه تم صرف دفعات له",
          paidPaymentsCount: paidPayments.length
        };
      }
      
      // العقود المعتمدة تحتاج موافقة
      if (contract.status === "approved" || contract.status === "active") {
        return { 
          canModify: true, 
          requiresApproval: true,
          reason: "العقد معتمد - يحتاج التعديل إلى موافقة"
        };
      }
      
      // المسودات يمكن تعديلها مباشرة
      return { canModify: true, requiresApproval: false };
    }),

  // إنشاء طلب تعديل
  requestModification: protectedProcedure
    .input(
      z.object({
        contractId: z.number(),
        modificationType: z.string(),
        description: z.string().min(10, "يجب كتابة وصف للتعديل"),
        currentValue: z.string().optional(),
        newValue: z.string().optional(),
        justification: z.string().min(10, "يجب كتابة مبرر للتعديل"),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("قاعدة البيانات غير متاحة");
      
      // التحقق من وجود العقد
      const [contract] = await db
        .select()
        .from(contractsEnhanced)
        .where(eq(contractsEnhanced.id, input.contractId));
      
      if (!contract) {
        throw new Error("العقد غير موجود");
      }
      
      // التحقق من عدم وجود دفعات مصروفة
      const paidPayments = await db
        .select()
        .from(contractPayments)
        .where(
          and(
            eq(contractPayments.contractId, input.contractId),
            eq(contractPayments.status, "paid")
          )
        );
      
      if (paidPayments.length > 0) {
        throw new Error("لا يمكن تعديل العقد لأنه تم صرف دفعات له");
      }
      
      // إنشاء طلب التعديل
      const [result] = await db.insert(contractModificationRequests).values({
        contractId: input.contractId,
        modificationType: input.modificationType,
        description: input.description,
        currentValue: input.currentValue,
        newValue: input.newValue,
        justification: input.justification,
        requestedBy: ctx.user.id,
      });
      
      return { success: true, id: result.insertId };
    }),

  // الموافقة على طلب التعديل
  approveModification: protectedProcedure
    .input(
      z.object({
        requestId: z.number(),
        reviewNotes: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("قاعدة البيانات غير متاحة");
      
      // تحديث حالة الطلب
      await db
        .update(contractModificationRequests)
        .set({
          status: "approved",
          reviewedBy: ctx.user.id,
          reviewedAt: new Date(),
          reviewNotes: input.reviewNotes,
        })
        .where(eq(contractModificationRequests.id, input.requestId));
      
      return { success: true };
    }),

  // رفض طلب التعديل
  rejectModification: protectedProcedure
    .input(
      z.object({
        requestId: z.number(),
        reviewNotes: z.string().min(5, "يجب ذكر سبب الرفض"),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("قاعدة البيانات غير متاحة");
      
      await db
        .update(contractModificationRequests)
        .set({
          status: "rejected",
          reviewedBy: ctx.user.id,
          reviewedAt: new Date(),
          reviewNotes: input.reviewNotes,
        })
        .where(eq(contractModificationRequests.id, input.requestId));
      
      return { success: true };
    }),

  // جلب طلبات التعديل لعقد معين
  getModificationRequests: protectedProcedure
    .input(z.object({ contractId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("قاعدة البيانات غير متاحة");
      
      const requests = await db
        .select()
        .from(contractModificationRequests)
        .where(eq(contractModificationRequests.contractId, input.contractId))
        .orderBy(desc(contractModificationRequests.createdAt));
      
      return requests;
    }),

  // جلب سجل تعديلات العقد
  getModificationLogs: protectedProcedure
    .input(z.object({ contractId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("قاعدة البيانات غير متاحة");
      
      const logs = await db
        .select()
        .from(contractModificationLogs)
        .where(eq(contractModificationLogs.contractId, input.contractId))
        .orderBy(desc(contractModificationLogs.modifiedAt));
      
      return logs;
    }),
});
