import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { projects, projectPhases, contracts, contractsEnhanced, payments, quantitySchedules, quotations, suppliers, mosqueRequests, users, mosques, projectNumberSequence } from "../../drizzle/schema";
import { eq, desc, and, sql, inArray } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

// توليد رقم مشروع بمنهجية سنوية
async function generateProjectNumber(db: NonNullable<Awaited<ReturnType<typeof getDb>>>): Promise<string> {
  const currentYear = new Date().getFullYear();
  const [existing] = await db.select().from(projectNumberSequence).where(eq(projectNumberSequence.year, currentYear));
  let sequence: number;
  if (existing) {
    sequence = existing.lastSequence + 1;
    await db.update(projectNumberSequence).set({ lastSequence: sequence }).where(eq(projectNumberSequence.year, currentYear));
  } else {
    sequence = 1;
    await db.insert(projectNumberSequence).values({ year: currentYear, lastSequence: sequence });
  }
  return `PRJ-${currentYear}-${String(sequence).padStart(4, "0")}`;
}

// توليد رقم عقد فريد
function generateContractNumber(): string {
  const prefix = "CON";
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix}-${timestamp}-${random}`;
}

// توليد رقم دفعة فريد
function generatePaymentNumber(): string {
  const prefix = "PAY";
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix}-${timestamp}-${random}`;
}

// توليد رقم عرض سعر فريد
function generateQuotationNumber(): string {
  const prefix = "QUO";
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix}-${timestamp}-${random}`;
}

export const projectsRouter = router({
  // الحصول على جميع المشاريع
  getAll: protectedProcedure
    .input(z.object({
      status: z.enum(["planning", "in_progress", "on_hold", "completed", "cancelled"]).optional(),
      limit: z.number().min(1).max(100).default(50),
      offset: z.number().min(0).default(0),
    }).optional())
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "قاعدة البيانات غير متاحة" });

      const filters = [];
      if (input?.status) {
        filters.push(eq(projects.status, input.status));
      }

      const projectsList = await db
        .select({
          id: projects.id,
          projectNumber: projects.projectNumber,
          name: projects.name,
          description: projects.description,
          status: projects.status,
          budget: projects.budget,
          actualCost: projects.actualCost,
          startDate: projects.startDate,
          expectedEndDate: projects.expectedEndDate,
          completionPercentage: projects.completionPercentage,
          createdAt: projects.createdAt,
          requestId: projects.requestId,
          managerId: projects.managerId,
          managerName: users.name,
        })
        .from(projects)
        .leftJoin(users, eq(projects.managerId, users.id))
        .where(filters.length > 0 ? and(...filters) : undefined)
        .orderBy(desc(projects.createdAt))
        .limit(input?.limit || 50)
        .offset(input?.offset || 0);

      return projectsList;
    }),

  // الحصول على مشروع بالتفاصيل
  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "قاعدة البيانات غير متاحة" });

      const [project] = await db
        .select({
          id: projects.id,
          projectNumber: projects.projectNumber,
          name: projects.name,
          description: projects.description,
          status: projects.status,
          budget: projects.budget,
          actualCost: projects.actualCost,
          startDate: projects.startDate,
          expectedEndDate: projects.expectedEndDate,
          completionPercentage: projects.completionPercentage,
          createdAt: projects.createdAt,
          updatedAt: projects.updatedAt,
          requestId: projects.requestId,
          managerId: projects.managerId,
          managerName: users.name,
        })
        .from(projects)
        .leftJoin(users, eq(projects.managerId, users.id))
        .where(eq(projects.id, input.id));

      if (!project) {
        throw new TRPCError({ code: "NOT_FOUND", message: "المشروع غير موجود" });
      }

      // جلب الطلب المرتبط
      const [request] = await db
        .select({
          id: mosqueRequests.id,
          requestNumber: mosqueRequests.requestNumber,
          programType: mosqueRequests.programType,
          mosqueName: mosques.name,
          mosqueCity: mosques.city,
        })
        .from(mosqueRequests)
        .leftJoin(mosques, eq(mosqueRequests.mosqueId, mosques.id))
        .where(eq(mosqueRequests.id, project.requestId));

      // جلب مراحل المشروع
      const phases = await db
        .select()
        .from(projectPhases)
        .where(eq(projectPhases.projectId, input.id))
        .orderBy(projectPhases.phaseOrder);

      // جلب العقود (من جدول contracts_enhanced)
      const projectContracts = await db
        .select({
          id: contractsEnhanced.id,
          contractNumber: contractsEnhanced.contractNumber,
          contractType: contractsEnhanced.contractType,
          amount: contractsEnhanced.contractAmount,
          status: contractsEnhanced.status,
          startDate: contractsEnhanced.startDate,
          endDate: contractsEnhanced.endDate,
          supplierName: contractsEnhanced.secondPartyName,
        })
        .from(contractsEnhanced)
        .where(eq(contractsEnhanced.projectId, input.id));

      // جلب الدفعات
      const projectPayments = await db
        .select()
        .from(payments)
        .where(eq(payments.projectId, input.id))
        .orderBy(desc(payments.createdAt));

      // جلب جداول الكميات
      const boq = await db
        .select()
        .from(quantitySchedules)
        .where(eq(quantitySchedules.projectId, input.id));

      // جلب عروض الأسعار
      const projectQuotations = await db
        .select({
          id: quotations.id,
          quotationNumber: quotations.quotationNumber,
          totalAmount: quotations.totalAmount,
          status: quotations.status,
          validUntil: quotations.validUntil,
          supplierName: suppliers.name,
          createdAt: quotations.createdAt,
        })
        .from(quotations)
        .leftJoin(suppliers, eq(quotations.supplierId, suppliers.id))
        .where(eq(quotations.projectId, input.id));

      return {
        ...project,
        request,
        phases,
        contracts: projectContracts,
        payments: projectPayments,
        boq,
        quotations: projectQuotations,
      };
    }),

  // إنشاء مشروع من طلب معتمد
  createFromRequest: protectedProcedure
    .input(z.object({
      requestId: z.number(),
      name: z.string().min(1),
      description: z.string().optional(),
      budget: z.number().optional(),
      managerId: z.number().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "قاعدة البيانات غير متاحة" });

      // التحقق من وجود الطلب
      const [request] = await db
        .select()
        .from(mosqueRequests)
        .where(eq(mosqueRequests.id, input.requestId));

      if (!request) {
        throw new TRPCError({ code: "NOT_FOUND", message: "الطلب غير موجود" });
      }

      // التحقق من عدم وجود مشروع مرتبط بالطلب
      const [existingProject] = await db
        .select()
        .from(projects)
        .where(eq(projects.requestId, input.requestId));

      if (existingProject) {
        throw new TRPCError({ code: "CONFLICT", message: "يوجد مشروع مرتبط بهذا الطلب بالفعل" });
      }

      const projectNumber = await generateProjectNumber(db);

      const [newProject] = await db.insert(projects).values({
        projectNumber,
        requestId: input.requestId,
        name: input.name,
        description: input.description,
        budget: input.budget?.toString(),
        managerId: input.managerId,
        status: "planning",
      });

      // إنشاء المراحل الافتراضية
      const defaultPhases = [
        { phaseName: "التخطيط والتصميم", phaseOrder: 1 },
        { phaseName: "التعاقد", phaseOrder: 2 },
        { phaseName: "التنفيذ", phaseOrder: 3 },
        { phaseName: "المراجعة والاستلام", phaseOrder: 4 },
        { phaseName: "الإغلاق", phaseOrder: 5 },
      ];

      for (const phase of defaultPhases) {
        await db.insert(projectPhases).values({
          projectId: newProject.insertId,
          phaseName: phase.phaseName,
          phaseOrder: phase.phaseOrder,
          status: phase.phaseOrder === 1 ? "in_progress" : "pending",
        });
      }

      // تحديث حالة الطلب
      await db
        .update(mosqueRequests)
        .set({ status: "in_progress", currentStage: "execution" })
        .where(eq(mosqueRequests.id, input.requestId));

      return {
        projectId: newProject.insertId,
        projectNumber,
      };
    }),

  // تحديث مشروع
  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      name: z.string().optional(),
      description: z.string().optional(),
      status: z.enum(["planning", "in_progress", "on_hold", "completed", "cancelled"]).optional(),
      budget: z.number().optional(),
      actualCost: z.number().optional(),
      completionPercentage: z.number().min(0).max(100).optional(),
      managerId: z.number().optional(),
      startDate: z.date().optional(),
      endDate: z.date().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "قاعدة البيانات غير متاحة" });

      const { id, ...updateData } = input;
      
      const updateValues: any = {};
      if (updateData.name) updateValues.name = updateData.name;
      if (updateData.description) updateValues.description = updateData.description;
      if (updateData.status) updateValues.status = updateData.status;
      if (updateData.budget !== undefined) updateValues.budget = updateData.budget.toString();
      if (updateData.actualCost !== undefined) updateValues.actualCost = updateData.actualCost.toString();
      if (updateData.completionPercentage !== undefined) updateValues.completionPercentage = updateData.completionPercentage;
      if (updateData.managerId) updateValues.managerId = updateData.managerId;
      if (updateData.startDate) updateValues.startDate = updateData.startDate;
      if (updateData.endDate) updateValues.endDate = updateData.endDate;

      await db
        .update(projects)
        .set(updateValues)
        .where(eq(projects.id, id));

      return { success: true };
    }),

  // ==================== جداول الكميات (BOQ) ====================

  // إضافة بند في جدول الكميات
  addBOQItem: protectedProcedure
    .input(z.object({
      projectId: z.number().optional(),
      requestId: z.number(),
      boqCode: z.string().optional(),
      boqName: z.string().optional(),
      itemName: z.string().min(1),
      itemDescription: z.string().optional(),
      unit: z.string().min(1),
      quantity: z.number().positive(),
      unitPrice: z.number().optional(),
      category: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "قاعدة البيانات غير متاحة" });

      // البحث عن مشروع مرتبط بالطلب (إن وُجد)
      let projectId = input.projectId;
      
      if (!projectId) {
        const [existingProject] = await db
          .select()
          .from(projects)
          .where(eq(projects.requestId, input.requestId))
          .limit(1);
        
        if (existingProject) {
          projectId = existingProject.id;
        }
        // لا نُنشئ مشروعاً تلقائياً - يجب أن يتم التحويل صراحة
      }

      const totalPrice = input.unitPrice ? input.quantity * input.unitPrice : null;

      const [item] = await db.insert(quantitySchedules).values({
        projectId: projectId,
        requestId: input.requestId,
        boqCode: input.boqCode,
        boqName: input.boqName,
        itemName: input.itemName,
        itemDescription: input.itemDescription,
        unit: input.unit,
        quantity: input.quantity.toString(),
        unitPrice: input.unitPrice?.toString(),
        totalPrice: totalPrice?.toString(),
        category: input.category,
      });

      return { id: item.insertId, projectId };
    }),

  // تحديث بند في جدول الكميات
  updateBOQItem: protectedProcedure
    .input(z.object({
      id: z.number(),
      itemName: z.string().optional(),
      itemDescription: z.string().optional(),
      unit: z.string().optional(),
      quantity: z.number().positive().optional(),
      unitPrice: z.number().optional(),
      category: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "قاعدة البيانات غير متاحة" });

      const { id, ...updateData } = input;

      // جلب البند الحالي لحساب السعر الإجمالي
      const [currentItem] = await db
        .select()
        .from(quantitySchedules)
        .where(eq(quantitySchedules.id, id));

      if (!currentItem) {
        throw new TRPCError({ code: "NOT_FOUND", message: "البند غير موجود" });
      }

      const quantity = updateData.quantity ?? parseFloat(currentItem.quantity);
      const unitPrice = updateData.unitPrice ?? (currentItem.unitPrice ? parseFloat(currentItem.unitPrice) : null);
      const totalPrice = unitPrice ? quantity * unitPrice : null;

      const updateValues: any = {};
      if (updateData.itemName) updateValues.itemName = updateData.itemName;
      if (updateData.itemDescription) updateValues.itemDescription = updateData.itemDescription;
      if (updateData.unit) updateValues.unit = updateData.unit;
      if (updateData.quantity) updateValues.quantity = updateData.quantity.toString();
      if (updateData.unitPrice !== undefined) updateValues.unitPrice = updateData.unitPrice?.toString();
      if (totalPrice !== null) updateValues.totalPrice = totalPrice.toString();
      if (updateData.category) updateValues.category = updateData.category;

      await db
        .update(quantitySchedules)
        .set(updateValues)
        .where(eq(quantitySchedules.id, id));

      return { success: true };
    }),

  // حذف بند من جدول الكميات
  deleteBOQItem: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "قاعدة البيانات غير متاحة" });

      await db.delete(quantitySchedules).where(eq(quantitySchedules.id, input.id));
      return { success: true };
    }),

  // جلب جدول الكميات لمشروع
  getBOQ: protectedProcedure
    .input(z.object({ 
      projectId: z.number().optional(),
      requestId: z.number().optional()
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "قاعدة البيانات غير متاحة" });

      // البحث باستخدام requestId أو projectId
      const whereCondition = input.requestId 
        ? eq(quantitySchedules.requestId, input.requestId)
        : input.projectId 
          ? eq(quantitySchedules.projectId, input.projectId)
          : undefined;

      if (!whereCondition) {
        return { items: [], total: 0 };
      }

      const items = await db
        .select()
        .from(quantitySchedules)
        .where(whereCondition)
        .orderBy(quantitySchedules.category, quantitySchedules.itemName);

      // حساب الإجمالي
      const total = items.reduce((sum: number, item: typeof items[0]) => {
        return sum + (item.totalPrice ? parseFloat(item.totalPrice) : 0);
      }, 0);

      return { items, total };
    }),

  // ==================== العقود ====================

  // إنشاء عقد
  createContract: protectedProcedure
    .input(z.object({
      projectId: z.number(),
      supplierId: z.number(),
      contractType: z.string(),
      amount: z.number().positive(),
      startDate: z.date().optional(),
      endDate: z.date().optional(),
      terms: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "قاعدة البيانات غير متاحة" });

      const contractNumber = generateContractNumber();

      const [contract] = await db.insert(contracts).values({
        contractNumber,
        projectId: input.projectId,
        supplierId: input.supplierId,
        contractType: input.contractType,
        amount: input.amount.toString(),
        startDate: input.startDate,
        endDate: input.endDate,
        terms: input.terms,
        status: "draft",
      });

      return { id: contract.insertId, contractNumber };
    }),

  // تحديث عقد
  updateContract: protectedProcedure
    .input(z.object({
      id: z.number(),
      contractType: z.string().optional(),
      amount: z.number().positive().optional(),
      status: z.enum(["draft", "active", "completed", "terminated"]).optional(),
      startDate: z.date().optional(),
      endDate: z.date().optional(),
      terms: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "قاعدة البيانات غير متاحة" });

      const { id, ...updateData } = input;

      const updateValues: any = {};
      if (updateData.contractType) updateValues.contractType = updateData.contractType;
      if (updateData.amount) updateValues.amount = updateData.amount.toString();
      if (updateData.status) updateValues.status = updateData.status;
      if (updateData.startDate) updateValues.startDate = updateData.startDate;
      if (updateData.endDate) updateValues.endDate = updateData.endDate;
      if (updateData.terms) updateValues.terms = updateData.terms;

      await db
        .update(contracts)
        .set(updateValues)
        .where(eq(contracts.id, id));

      return { success: true };
    }),

  // ==================== الدفعات ====================

  // إنشاء دفعة
  createPayment: protectedProcedure
    .input(z.object({
      projectId: z.number(),
      contractId: z.number().optional(),
      amount: z.number().positive(),
      paymentType: z.enum(["advance", "progress", "final", "retention"]),
      description: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "قاعدة البيانات غير متاحة" });

      const paymentNumber = generatePaymentNumber();

      const [payment] = await db.insert(payments).values({
        paymentNumber,
        projectId: input.projectId,
        contractId: input.contractId,
        amount: input.amount.toString(),
        paymentType: input.paymentType,
        description: input.description,
        status: "pending",
      });

      return { id: payment.insertId, paymentNumber };
    }),

  // تحديث حالة الدفعة
  updatePaymentStatus: protectedProcedure
    .input(z.object({
      id: z.number(),
      status: z.enum(["pending", "approved", "paid", "rejected"]),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "قاعدة البيانات غير متاحة" });

      const updateValues: any = { status: input.status };
      
      if (input.status === "approved") {
        updateValues.approvedBy = ctx.user.id;
      }
      if (input.status === "paid") {
        updateValues.paidAt = new Date();
      }

      await db
        .update(payments)
        .set(updateValues)
        .where(eq(payments.id, input.id));

      return { success: true };
    }),

  // ==================== عروض الأسعار ====================

  // إنشاء عرض سعر
  createQuotation: protectedProcedure
    .input(z.object({
      projectId: z.number().optional(),
      requestId: z.number().optional(),
      supplierId: z.number(),
      totalAmount: z.number().positive(),
      finalAmount: z.number().positive().optional(),
      validUntil: z.date().optional(),
      items: z.array(z.object({
        boqItemId: z.number().optional(),
        itemName: z.string(),
        quantity: z.number(),
        unit: z.string().optional(),
        unitPrice: z.number(),
        totalPrice: z.number(),
      })).optional(),
      notes: z.string().optional(),
      // حقول الضريبة
      includesTax: z.boolean().optional(),
      taxRate: z.number().min(0).max(100).nullable().optional(),
      taxAmount: z.number().nullable().optional(),
      // حقول الخصم
      discountType: z.enum(["percentage", "fixed"]).nullable().optional(),
      discountValue: z.number().nullable().optional(),
      discountAmount: z.number().nullable().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "قاعدة البيانات غير متاحة" });

      const quotationNumber = generateQuotationNumber();

      const result = await db.insert(quotations).values({
        quotationNumber,
        projectId: input.projectId,
        requestId: input.requestId,
        supplierId: input.supplierId,
        totalAmount: input.totalAmount.toString(),
        finalAmount: input.finalAmount?.toString() || input.totalAmount.toString(),
        validUntil: input.validUntil,
        notes: input.notes,
        status: "pending" as const,
        includesTax: input.includesTax || false,
        taxRate: input.taxRate?.toString() || null,
        taxAmount: input.taxAmount?.toString() || null,
        discountType: input.discountType || null,
        discountValue: input.discountValue?.toString() || null,
        discountAmount: input.discountAmount?.toString() || null,
      } as any);

      return { id: result[0].insertId, quotationNumber };
    }),

  // جلب عروض الأسعار للطلب
  getQuotationsByRequest: protectedProcedure
    .input(z.object({ requestId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "قاعدة البيانات غير متاحة" });

      const quotationsList = await db
        .select({
          id: quotations.id,
          quotationNumber: quotations.quotationNumber,
          totalAmount: quotations.totalAmount,
          finalAmount: quotations.finalAmount,
          includesTax: quotations.includesTax,
          taxRate: quotations.taxRate,
          taxAmount: quotations.taxAmount,
          discountType: quotations.discountType,
          discountValue: quotations.discountValue,
          discountAmount: quotations.discountAmount,
          negotiatedAmount: quotations.negotiatedAmount,
          approvedAmount: quotations.approvedAmount,
          status: quotations.status,
          validUntil: quotations.validUntil,
          notes: quotations.notes,
          supplierName: suppliers.name,
          createdAt: quotations.createdAt,
        })
        .from(quotations)
        .leftJoin(suppliers, eq(quotations.supplierId, suppliers.id))
        .where(eq(quotations.requestId, input.requestId))
        .orderBy(desc(quotations.createdAt));

      return { quotations: quotationsList };
    }),

  // تحديث حالة عرض السعر
  updateQuotationStatus: protectedProcedure
    .input(z.object({
      id: z.number(),
      status: z.enum(["pending", "negotiating", "accepted", "rejected", "expired"]),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "قاعدة البيانات غير متاحة" });

      await db
        .update(quotations)
        .set({ status: input.status })
        .where(eq(quotations.id, input.id));

      return { success: true };
    }),

  // بدء التفاوض على عرض السعر
  startNegotiation: protectedProcedure
    .input(z.object({
      id: z.number(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "قاعدة البيانات غير متاحة" });

      await db
        .update(quotations)
        .set({ 
          status: "negotiating",
          negotiatedBy: ctx.user.id,
          negotiatedAt: new Date()
        })
        .where(eq(quotations.id, input.id));

      return { success: true };
    }),

  // حفظ نتيجة التفاوض
  saveNegotiationResult: protectedProcedure
    .input(z.object({
      id: z.number(),
      negotiatedAmount: z.number(),
      negotiationNotes: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "قاعدة البيانات غير متاحة" });

      await db
        .update(quotations)
        .set({ 
          negotiatedAmount: input.negotiatedAmount.toString(),
          negotiationNotes: input.negotiationNotes || null,
          negotiatedBy: ctx.user.id,
          negotiatedAt: new Date()
        })
        .where(eq(quotations.id, input.id));

      return { success: true };
    }),

  // اعتماد عرض السعر بعد التفاوض
  approveQuotationAfterNegotiation: protectedProcedure
    .input(z.object({
      id: z.number(),
      useNegotiatedAmount: z.boolean().default(true), // استخدام المبلغ بعد التفاوض
      notes: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "قاعدة البيانات غير متاحة" });

      // جلب بيانات العرض
      const [quotation] = await db
        .select()
        .from(quotations)
        .where(eq(quotations.id, input.id));

      if (!quotation) {
        throw new TRPCError({ code: "NOT_FOUND", message: "عرض السعر غير موجود" });
      }

      // تحديد المبلغ المعتمد
      let approvedAmount: string;
      if (input.useNegotiatedAmount && quotation.negotiatedAmount) {
        approvedAmount = quotation.negotiatedAmount;
      } else {
        approvedAmount = quotation.totalAmount;
      }

      await db
        .update(quotations)
        .set({ 
          status: "accepted",
          approvedAmount: approvedAmount,
          notes: input.notes || null
        })
        .where(eq(quotations.id, input.id));

      return { 
        success: true,
        approvedAmount: parseFloat(approvedAmount)
      };
    }),

  // ==================== الموردين ====================

  // جلب جميع الموردين
  getSuppliers: protectedProcedure
    .input(z.object({
      type: z.enum(["contractor", "supplier", "service_provider"]).optional(),
      status: z.enum(["active", "inactive", "blacklisted"]).optional(),
    }).optional())
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "قاعدة البيانات غير متاحة" });

      const filters = [];
      if (input?.type) {
        filters.push(eq(suppliers.type, input.type));
      }
      if (input?.status) {
        filters.push(eq(suppliers.status, input.status));
      }

      const suppliersList = await db
        .select()
        .from(suppliers)
        .where(filters.length > 0 ? and(...filters) : undefined)
        .orderBy(suppliers.name);

      return suppliersList;
    }),

  // إنشاء مورد
  createSupplier: protectedProcedure
    .input(z.object({
      name: z.string().min(1),
      type: z.enum(["contractor", "supplier", "service_provider"]),
      contactPerson: z.string().min(1),
      phone: z.string().min(1),
      email: z.string().email(),
      commercialRegister: z.string().min(1),
      address: z.string().optional(),
      taxNumber: z.string().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "قاعدة البيانات غير متاحة" });

      const [supplier] = await db.insert(suppliers).values({
        name: input.name,
        type: input.type,
        contactPerson: input.contactPerson,
        phone: input.phone,
        email: input.email,
        commercialRegister: input.commercialRegister,
        address: input.address,
        taxNumber: input.taxNumber,
        notes: input.notes,
        status: "active",
      });

      return { id: supplier.insertId };
    }),

  // تحديث مورد
  updateSupplier: protectedProcedure
    .input(z.object({
      id: z.number(),
      name: z.string().optional(),
      type: z.enum(["contractor", "supplier", "service_provider"]).optional(),
      contactPerson: z.string().optional(),
      phone: z.string().optional(),
      email: z.string().email().optional(),
      address: z.string().optional(),
      commercialRegister: z.string().optional(),
      taxNumber: z.string().optional(),
      rating: z.number().min(1).max(5).optional(),
      status: z.enum(["active", "inactive", "blacklisted"]).optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "قاعدة البيانات غير متاحة" });

      const { id, ...updateData } = input;

      await db
        .update(suppliers)
        .set(updateData)
        .where(eq(suppliers.id, id));

      return { success: true };
    }),

  // ==================== مراحل المشروع ====================

  // تحديث مرحلة
  updatePhase: protectedProcedure
    .input(z.object({
      id: z.number(),
      status: z.enum(["pending", "in_progress", "completed"]).optional(),
      completionPercentage: z.number().min(0).max(100).optional(),
      startDate: z.date().optional(),
      endDate: z.date().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "قاعدة البيانات غير متاحة" });

      const { id, ...updateData } = input;

      await db
        .update(projectPhases)
        .set(updateData)
        .where(eq(projectPhases.id, id));

      return { success: true };
    }),

  // ==================== الإحصائيات ====================

  // إحصائيات المشاريع
  getStats: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "قاعدة البيانات غير متاحة" });

    const [stats] = await db
      .select({
        total: sql<number>`COUNT(*)`,
        planning: sql<number>`SUM(CASE WHEN status = 'planning' THEN 1 ELSE 0 END)`,
        inProgress: sql<number>`SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END)`,
        completed: sql<number>`SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END)`,
        onHold: sql<number>`SUM(CASE WHEN status = 'on_hold' THEN 1 ELSE 0 END)`,
        totalBudget: sql<number>`SUM(CAST(budget AS DECIMAL(15,2)))`,
        totalActualCost: sql<number>`SUM(CAST(actualCost AS DECIMAL(15,2)))`,
      })
      .from(projects);

    return stats;
  }),

  // جلب المشروع المرتبط بطلب
  getByRequestId: protectedProcedure
    .input(z.object({ requestId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "قاعدة البيانات غير متاحة" });

      const project = await db
        .select()
        .from(projects)
        .where(eq(projects.requestId, input.requestId))
        .limit(1);

      return project[0] || null;
    }),
});
