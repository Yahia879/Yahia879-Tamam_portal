import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { protectedProcedure, publicProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { publicSubmissions, users } from "../../drizzle/schema";
import { eq, desc, sql } from "drizzle-orm";

const submitSchema = z.object({
  submissionType: z.enum([
    "donor_land",
    "donor_inkind",
    "donor_financial",
    "donor_other",
    "general_inquiry",
  ]),
  category: z.enum(["donor", "other"]),
  name: z.string().min(2, "الاسم يجب أن يكون حرفين على الأقل").max(100, "الاسم طويل جداً"),
  phone: z.string().regex(/^05[0-9]{8}$/, "رقم الجوال يجب أن يبدأ بـ 05 ويتكون من 10 أرقام"),
  email: z.string().email("البريد الإلكتروني غير صحيح").optional().or(z.literal("")),
  city: z.string().optional(),
  customRoleTitle: z.string().optional(),
  details: z.string().optional(),
  landArea: z.string().optional(),
  landDimensions: z.string().optional(),
  landLocation: z.string().optional(),
  landOwner: z.string().optional(),
  inKindType: z.string().optional(),
  inKindQuantity: z.string().optional(),
  inKindCondition: z.string().optional(),
  inKindDeliveryAvailable: z.boolean().optional(),
  financialAmount: z.number().optional(),
  financialBankName: z.string().optional(),
  attachmentUrl: z.string().optional(),
});

export const publicSubmissionsRouter = router({
  // إرسال طلب تبرع أو استفسار عام من النموذج الخارجي دون تسجيل حساب
  submit: publicProcedure
    .input(submitSchema)
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "قاعدة البيانات غير متاحة" });

      const [result] = await db.insert(publicSubmissions).values({
        submissionType: input.submissionType,
        category: input.category,
        name: input.name.trim(),
        phone: input.phone.trim(),
        email: input.email ? input.email.trim() : null,
        city: input.city ? input.city.trim() : null,
        customRoleTitle: input.customRoleTitle ? input.customRoleTitle.trim() : null,
        details: input.details ? input.details.trim() : null,
        landArea: input.landArea || null,
        landDimensions: input.landDimensions || null,
        landLocation: input.landLocation || null,
        landOwner: input.landOwner || null,
        inKindType: input.inKindType || null,
        inKindQuantity: input.inKindQuantity || null,
        inKindCondition: input.inKindCondition || null,
        inKindDeliveryAvailable: input.inKindDeliveryAvailable ?? false,
        financialAmount: input.financialAmount ? String(input.financialAmount) : null,
        financialBankName: input.financialBankName || null,
        attachmentUrl: input.attachmentUrl || null,
        status: "new",
      });

      return {
        success: true,
        message: "شكراً لكم، تم استلام بياناتكم بنجاح، وسيقوم فريق الجمعية بالتواصل معكم عند الحاجة لاستكمال المعلومات أو متابعة الطلب.",
        submissionId: (result as any).insertId,
      };
    }),

  // جلب كافة الطلبات والاستفسارات العامة مع دعم التصفية المتقدمة واستثناء التبرعات المالية
  getAll: protectedProcedure
    .input(
      z.object({
        category: z.enum(["donor", "other"]).optional(),
        submissionType: z.string().optional(),
        submissionTypes: z.array(z.string()).optional(),
        excludeTypes: z.array(z.string()).optional(),
        status: z.string().optional(),
        search: z.string().optional(),
      }).optional()
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "قاعدة البيانات غير متاحة" });

      const list = await db
        .select({
          id: publicSubmissions.id,
          submissionType: publicSubmissions.submissionType,
          category: publicSubmissions.category,
          name: publicSubmissions.name,
          phone: publicSubmissions.phone,
          email: publicSubmissions.email,
          city: publicSubmissions.city,
          customRoleTitle: publicSubmissions.customRoleTitle,
          details: publicSubmissions.details,
          landArea: publicSubmissions.landArea,
          landDimensions: publicSubmissions.landDimensions,
          landLocation: publicSubmissions.landLocation,
          landOwner: publicSubmissions.landOwner,
          inKindType: publicSubmissions.inKindType,
          inKindQuantity: publicSubmissions.inKindQuantity,
          inKindCondition: publicSubmissions.inKindCondition,
          inKindDeliveryAvailable: publicSubmissions.inKindDeliveryAvailable,
          financialAmount: publicSubmissions.financialAmount,
          financialBankName: publicSubmissions.financialBankName,
          attachmentUrl: publicSubmissions.attachmentUrl,
          status: publicSubmissions.status,
          adminNotes: publicSubmissions.adminNotes,
          assignedTo: publicSubmissions.assignedTo,
          assignedToName: users.name,
          createdAt: publicSubmissions.createdAt,
          updatedAt: publicSubmissions.updatedAt,
        })
        .from(publicSubmissions)
        .leftJoin(users, eq(publicSubmissions.assignedTo, users.id))
        .orderBy(desc(publicSubmissions.createdAt));

      const search = input?.search?.trim().toLowerCase() || "";

      return list.filter((item) => {
        if (input?.category && item.category !== input.category) return false;
        if (input?.submissionType && item.submissionType !== input.submissionType) return false;
        if (input?.submissionTypes && input.submissionTypes.length > 0 && !input.submissionTypes.includes(item.submissionType)) return false;
        if (input?.excludeTypes && input.excludeTypes.includes(item.submissionType)) return false;
        if (input?.status && input.status !== "all" && item.status !== input.status) return false;

        if (search) {
          const match = 
            item.name?.toLowerCase().includes(search) ||
            item.phone?.toLowerCase().includes(search) ||
            item.email?.toLowerCase().includes(search) ||
            item.city?.toLowerCase().includes(search) ||
            item.details?.toLowerCase().includes(search) ||
            item.landLocation?.toLowerCase().includes(search) ||
            item.inKindType?.toLowerCase().includes(search) ||
            item.customRoleTitle?.toLowerCase().includes(search);
          if (!match) return false;
        }

        return true;
      });
    }),

  // إحصائيات التبرعات غير المالية والاستفسارات العامة
  getStats: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "قاعدة البيانات غير متاحة" });

    const all = await db.select().from(publicSubmissions);

    const nonFinancialDonations = all.filter((s) => s.category === "donor" && s.submissionType !== "donor_financial");
    const inquiries = all.filter((s) => s.submissionType === "general_inquiry" || s.category === "other");

    return {
      donations: {
        total: nonFinancialDonations.length,
        pending: nonFinancialDonations.filter((s) => s.status === "new" || s.status === "under_review").length,
        contacted: nonFinancialDonations.filter((s) => s.status === "contacted").length,
        completed: nonFinancialDonations.filter((s) => s.status === "completed").length,
        land: nonFinancialDonations.filter((s) => s.submissionType === "donor_land").length,
        inKind: nonFinancialDonations.filter((s) => s.submissionType === "donor_inkind").length,
        other: nonFinancialDonations.filter((s) => s.submissionType === "donor_other").length,
      },
      inquiries: {
        total: inquiries.length,
        pending: inquiries.filter((s) => s.status === "new" || s.status === "under_review").length,
        contacted: inquiries.filter((s) => s.status === "contacted").length,
        completed: inquiries.filter((s) => s.status === "completed").length,
      },
    };
  }),

  // تحديث حالة الطلب والملاحظات الإدارية
  updateStatus: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        status: z.enum(["new", "under_review", "contacted", "completed", "archived"]),
        adminNotes: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "قاعدة البيانات غير متاحة" });

      await db
        .update(publicSubmissions)
        .set({
          status: input.status,
          adminNotes: input.adminNotes ?? undefined,
          assignedTo: ctx.user?.id ?? null,
        })
        .where(eq(publicSubmissions.id, input.id));

      return { success: true };
    }),

  // حذف طلب
  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "قاعدة البيانات غير متاحة" });

      await db.delete(publicSubmissions).where(eq(publicSubmissions.id, input.id));
      return { success: true };
    }),
});
