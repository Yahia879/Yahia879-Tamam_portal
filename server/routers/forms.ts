import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { protectedProcedure, publicProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { brandSettings } from "../../drizzle/schema";
import { eq } from "drizzle-orm";

export const formFieldOptionSchema = z.object({
  label: z.string(),
  value: z.string(),
});

export const formFieldSchema = z.object({
  id: z.string(),
  type: z.enum([
    "rating",
    "text",
    "textarea",
    "number",
    "select",
    "radio",
    "checkbox",
    "email",
    "phone",
  ]),
  label: z.string().min(1, "عنوان الحقل مطلوب"),
  placeholder: z.string().optional(),
  helpText: z.string().optional(),
  required: z.boolean().default(false),
  isActive: z.boolean().default(true),
  order: z.number().default(0),
  options: z.array(formFieldOptionSchema).optional(),
  maxRating: z.number().optional(),
  showLabels: z.boolean().optional(),
  isSystem: z.boolean().optional(),
});

export const evaluationFormSettingsSchema = z.object({
  title: z.string().default("قياس رضا المستفيدين من خدمات الجمعية"),
  description: z
    .string()
    .default(
      "نرحب بكم في استبيان قياس رضا المستفيدين لجمعية عمارة المساجد (منارة). نسعى من خلال هذا الاستبيان إلى فهم آرائكم واقتراحاتكم، حيث إن مشاركتكم تساعدنا في تحسين وتطوير خدماتنا لتلبية تطلعاتكم بشكل أفضل. نؤكد لكم أن إكمال الاستبيان لن يستغرق أكثر من دقيقتين من وقتكم. شكرًا لكم على وقتكم وتعاونكم"
    ),
  headerBgColor: z.string().default("#14707a"),
  submitButtonText: z.string().default("إرسال التقييم"),
  successTitle: z.string().default("تم تقييم الخدمة بنجاح"),
  successMessage: z
    .string()
    .default("شكراً لجهودكم ومشاركتكم القيمة. تم تسجيل استبيان تقييمكم لطلب الخدمة بنجاح."),
  fields: z.array(formFieldSchema),
});

export type FormField = z.infer<typeof formFieldSchema>;
export type EvaluationFormSettings = z.infer<typeof evaluationFormSettingsSchema>;

export const DEFAULT_EVALUATION_FORM_SETTINGS: EvaluationFormSettings = {
  title: "قياس رضا المستفيدين من خدمات الجمعية",
  description:
    "نرحب بكم في استبيان قياس رضا المستفيدين لجمعية عمارة المساجد (منارة). نسعى من خلال هذا الاستبيان إلى فهم آرائكم واقتراحاتكم، حيث إن مشاركتكم تساعدنا في تحسين وتطوير خدماتنا لتلبية تطلعاتكم بشكل أفضل. نؤكد لكم أن إكمال الاستبيان لن يستغرق أكثر من دقيقتين من وقتكم. شكرًا لكم على وقتكم وتعاونكم",
  headerBgColor: "#14707a",
  submitButtonText: "إرسال التقييم",
  successTitle: "تم تقييم الخدمة بنجاح",
  successMessage: "شكراً لجهودكم ومشاركتكم القيمة. تم تسجيل استبيان تقييمكم لطلب الخدمة بنجاح.",
  fields: [
    {
      id: "beneficiaryName",
      type: "text",
      label: "الاسم",
      placeholder: "أدخل اسمك الكريم",
      helpText: "",
      required: false,
      isActive: true,
      order: 1,
      options: [],
      isSystem: true,
    },
    {
      id: "beneficiaryPhone",
      type: "phone",
      label: "رقم الجوال",
      placeholder: "05xxxxxxxx",
      helpText: "",
      required: false,
      isActive: true,
      order: 2,
      options: [],
      isSystem: true,
    },
    {
      id: "serviceName",
      type: "text",
      label: "اسم المسجد / المشروع / الخدمة",
      placeholder: "اسم المسجد أو نوع الخدمة",
      helpText: "",
      required: true,
      isActive: true,
      order: 3,
      options: [],
      isSystem: true,
    },
    {
      id: "beneficiaryEmail",
      type: "email",
      label: "البريد الإلكتروني",
      placeholder: "example@domain.com",
      helpText: "",
      required: false,
      isActive: true,
      order: 4,
      options: [],
      isSystem: true,
    },
    {
      id: "servicesRating",
      type: "rating",
      label: "ما مدى تقييمك لخدمات الجمعية؟",
      placeholder: "",
      helpText: "",
      required: false,
      isActive: true,
      order: 5,
      options: [],
      maxRating: 5,
      showLabels: true,
      isSystem: true,
    },
    {
      id: "speedRating",
      type: "rating",
      label: "ما مدى تقييمك لسرعة تلبية طلبك؟",
      placeholder: "",
      helpText: "",
      required: true,
      isActive: true,
      order: 6,
      options: [],
      maxRating: 5,
      showLabels: true,
      isSystem: true,
    },
    {
      id: "communicationRating",
      type: "rating",
      label: "ما مدى سرعة تواصل موظفي الجمعية معك؟",
      placeholder: "",
      helpText: "",
      required: true,
      isActive: true,
      order: 7,
      options: [],
      maxRating: 5,
      showLabels: true,
      isSystem: true,
    },
    {
      id: "overallSatisfaction",
      type: "rating",
      label: "ما مدى رضاك بشكل عام عن الجمعية؟",
      placeholder: "",
      helpText: "",
      required: true,
      isActive: true,
      order: 8,
      options: [],
      maxRating: 5,
      showLabels: true,
      isSystem: true,
    },
    {
      id: "comments",
      type: "textarea",
      label: "مساحة حرة (اكتب لنا ما تريد: رأي - نصيحة - اقتراح - أخرى)",
      placeholder: "اكتب ملاحظاتك أو مقترحاتك هنا...",
      helpText: "",
      required: false,
      isActive: true,
      order: 9,
      options: [],
      isSystem: true,
    },
  ],
};

const SETTING_KEY = "evaluation_form_customization";

export const formsRouter = router({
  // جلب إعدادات استمارة التقييم
  getEvaluationFormConfig: publicProcedure.query(async () => {
    const db = await getDb();
    if (!db) {
      return DEFAULT_EVALUATION_FORM_SETTINGS;
    }

    try {
      const [setting] = await db
        .select()
        .from(brandSettings)
        .where(eq(brandSettings.settingKey, SETTING_KEY))
        .limit(1);

      if (setting && setting.settingValue) {
        const parsed = JSON.parse(setting.settingValue);
        // دمج الحقول والتأكد من صحتها
        const validated = evaluationFormSettingsSchema.safeParse(parsed);
        if (validated.success) {
          return validated.data;
        }
      }
    } catch (e) {
      console.error("Error reading evaluation form config:", e);
    }

    return DEFAULT_EVALUATION_FORM_SETTINGS;
  }),

  // حفظ إعدادات استمارة التقييم
  saveEvaluationFormConfig: protectedProcedure
    .input(evaluationFormSettingsSchema)
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "قاعدة البيانات غير متاحة",
        });
      }

      // التحقق من الصلاحيات (المدراء أو من لديه صلاحية الإعدادات)
      const allowedRoles = ["super_admin", "system_admin", "executive_director", "general_manager"];
      const userPermissions: string[] = (ctx.user as any)?.permissions || [];
      const hasSettingsPerm =
        userPermissions.includes("settings_center") ||
        userPermissions.includes("settings_categories.edit") ||
        userPermissions.includes("services.edit");

      if (!allowedRoles.includes(ctx.user.role) && !hasSettingsPerm) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "ليس لديك صلاحية لتعديل إعدادات النماذج",
        });
      }

      const serializedValue = JSON.stringify(input);

      // البحث عن الإعداد لتحديثه أو إنشائه
      const [existing] = await db
        .select()
        .from(brandSettings)
        .where(eq(brandSettings.settingKey, SETTING_KEY))
        .limit(1);

      if (existing) {
        await db
          .update(brandSettings)
          .set({
            settingValue: serializedValue,
            updatedBy: ctx.user.id,
            updatedAt: new Date(),
          })
          .where(eq(brandSettings.settingKey, SETTING_KEY));
      } else {
        await db.insert(brandSettings).values({
          settingKey: SETTING_KEY,
          settingValue: serializedValue,
          settingType: "json",
          description: "تخصيص استمارة تقييم رضا المستفيد",
          updatedBy: ctx.user.id,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }

      return {
        success: true,
        message: "تم حفظ تخصيص استمارة التقييم بنجاح وتطبيقها على المنصة",
        data: input,
      };
    }),

  // إعادة التعيين إلى الإعدادات الافتراضية
  resetEvaluationFormConfig: protectedProcedure.mutation(async ({ ctx }) => {
    const db = await getDb();
    if (!db) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "قاعدة البيانات غير متاحة",
      });
    }

    const allowedRoles = ["super_admin", "system_admin", "executive_director", "general_manager"];
    if (!allowedRoles.includes(ctx.user.role)) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "ليس لديك صلاحية لإعادة تعيين النموذج",
      });
    }

    await db
      .delete(brandSettings)
      .where(eq(brandSettings.settingKey, SETTING_KEY));

    return {
      success: true,
      message: "تمت إعادة استمارة التقييم إلى الإعدادات الافتراضية بنجاح",
      data: DEFAULT_EVALUATION_FORM_SETTINGS,
    };
  }),
});
