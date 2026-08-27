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

  // جلب كافة الطلبات والاستفسارات العامة (للموظفين والإدارة)
  getAll: protectedProcedure
    .input(
      z.object({
        category: z.enum(["donor", "other"]).optional(),
        status: z.string().optional(),
      }).optional()
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "قاعدة البيانات غير متاحة" });

      let query = db.select().from(publicSubmissions).orderBy(desc(publicSubmissions.createdAt));
      
      const list = await query;
      return list.filter((item) => {
        if (input?.category && item.category !== input.category) return false;
        if (input?.status && item.status !== input.status) return false;
        return true;
      });
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
