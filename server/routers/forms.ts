import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { protectedProcedure, publicProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { brandSettings, programs } from "../../drizzle/schema";
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
    "date",
    "file",
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

export const serviceFieldSchema = z.object({
  id: z.string(),
  type: z.enum([
    "text",
    "textarea",
    "number",
    "select",
    "radio",
    "checkbox",
    "date",
    "file",
    "phone",
    "email",
  ]),
  label: z.string().min(1, "عنوان الحقل مطلوب"),
  placeholder: z.string().optional(),
  helpText: z.string().optional(),
  required: z.boolean().default(false),
  isActive: z.boolean().default(true),
  order: z.number().default(0),
  options: z.array(formFieldOptionSchema).optional(),
  isSystem: z.boolean().optional(),
});

export const serviceFormSettingsSchema = z.object({
  serviceId: z.string(),
  serviceName: z.string().optional(),
  fields: z.array(serviceFieldSchema),
});

export type FormField = z.infer<typeof formFieldSchema>;
export type EvaluationFormSettings = z.infer<typeof evaluationFormSettingsSchema>;
export type ServiceField = z.infer<typeof serviceFieldSchema>;
export type ServiceFormSettings = z.infer<typeof serviceFormSettingsSchema>;

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

// الحقول الافتراضية لكل برنامج
function getDefaultFieldsForService(serviceId: string): ServiceField[] {
  if (serviceId === "bunyan") {
    return [
      { id: "workDescription", type: "textarea", label: "وصف الأعمال المطلوبة", placeholder: "اكتب وصفاً تفصيلياً للأعمال المطلوبة...", helpText: "قدم وصفاً مفصلاً لما تحتاجه المسجد", required: true, isActive: true, order: 1, isSystem: true },
      { id: "mosqueArea", type: "number", label: "مساحة المسجد بالمتر المربع", placeholder: "مثال: 300", required: false, isActive: true, order: 2, isSystem: true },
      { id: "actualWorshippers", type: "number", label: "عدد المصلين الفعلي", placeholder: "مثال: 200", required: false, isActive: true, order: 3, isSystem: true },
      { id: "hasDonorForMaintenance", type: "radio", label: "هل يوجد متبرع للقيام بتكاليف الصيانة المطلوبة؟", required: false, isActive: true, order: 4, options: [{ label: "نعم", value: "yes" }, { label: "لا", value: "no" }], isSystem: true },
      { id: "willingToVolunteer", type: "radio", label: "هل لديكم استعداد لتأسيس فريق تطوعي بقيادتكم لتسويق الفرصة؟", required: true, isActive: true, order: 5, options: [{ label: "نعم", value: "yes" }, { label: "لا", value: "no" }], isSystem: true },
      { id: "neighborhoodName", type: "text", label: "اسم الحي", placeholder: "مثال: حي النسيم", required: true, isActive: true, order: 6, isSystem: true },
      { id: "hasLand", type: "radio", label: "هل لديكم أرض مخصصة للبناء؟", required: true, isActive: true, order: 7, options: [{ label: "نعم", value: "yes" }, { label: "لا", value: "no" }], isSystem: true },
      { id: "landOwnership", type: "select", label: "ملكية الأرض", required: true, isActive: true, order: 8, options: [{ label: "ملك خاص", value: "owned" }, { label: "وقف", value: "waqf" }, { label: "حكومية", value: "government" }, { label: "أخرى", value: "other" }], isSystem: true },
      { id: "landArea", type: "number", label: "مساحة الأرض بالمتر المربع", placeholder: "مثال: 500", required: false, isActive: true, order: 9, isSystem: true },
      { id: "landProposal", type: "textarea", label: "مقترحات بخصوص الأرض", placeholder: "أي مقترحات أو ملاحظات بخصوص الأرض...", required: false, isActive: true, order: 10, isSystem: true },
      { id: "hasDonor", type: "radio", label: "هل لديكم متبرع للقيام بتكاليف البناء؟", required: true, isActive: true, order: 11, options: [{ label: "نعم", value: "yes" }, { label: "لا", value: "no" }], isSystem: true },
      { id: "donationAmount", type: "number", label: "مبلغ التبرع (بالريال السعودي)", placeholder: "مثال: 100000", required: false, isActive: true, order: 12, isSystem: true },
      { id: "fundingProposal", type: "textarea", label: "مقترحات التمويل", placeholder: "أي مقترحات بخصوص التمويل والتبرعات...", required: true, isActive: true, order: 13, isSystem: true },
      { id: "nearestMosque", type: "text", label: "أقرب مسجد موجود", placeholder: "اسم أقرب مسجد للموقع المقترح", required: false, isActive: true, order: 14, isSystem: true },
      { id: "distanceToMosque", type: "number", label: "المسافة من أقرب مسجد (بالكيلومتر)", placeholder: "مثال: 2.5", required: false, isActive: true, order: 15, isSystem: true },
      { id: "attachment", type: "file", label: "المرفقات والوثائق الداعمة (اختياري)", placeholder: "ملفات PDF أو صور أو مستندات Word", helpText: "يدعم ملفات PDF، الصور، ومستندات Word (الحد الأقصى 10 ميجابايت)", required: false, isActive: true, order: 16, isSystem: true },
    ];
  }

  // البرامج القياسية الأخرى (عناية، فرش، تكييف، استجابة سريعة، سقيا، إلخ)
  const commonFields: ServiceField[] = [
    { id: "mosqueId", type: "select", label: "اختر المسجد", placeholder: "اختر المسجد المراد تقديم الطلب له", required: true, isActive: true, order: 1, isSystem: true },
    { id: "workDescription", type: "textarea", label: "وصف الأعمال المطلوبة", placeholder: "اكتب وصفاً تفصيلياً للأعمال المطلوبة...", required: true, isActive: true, order: 2, isSystem: true },
    { id: "mosqueArea", type: "number", label: "مساحة المسجد بالمتر المربع", placeholder: "مثال: 300", required: false, isActive: true, order: 3, isSystem: true },
    { id: "actualWorshippers", type: "number", label: "عدد المصلين الفعلي", placeholder: "مثال: 200", required: false, isActive: true, order: 4, isSystem: true },
    { id: "hasDonorForMaintenance", type: "radio", label: "هل يوجد متبرع للقيام بتكاليف الصيانة المطلوبة؟", required: false, isActive: true, order: 5, options: [{ label: "نعم", value: "yes" }, { label: "لا", value: "no" }], isSystem: true },
  ];

  if (serviceId === "takeef") {
    commonFields.push({ id: "acCount", type: "number", label: "عدد المكيفات المطلوبة", placeholder: "مثال: 4", required: true, isActive: true, order: 6, isSystem: true });
  } else if (serviceId === "soqya" || serviceId === "suqya") {
    commonFields.push(
      { id: "cartonsNeeded", type: "number", label: "عدد الكراتين المطلوبة", placeholder: "مثال: 50", required: true, isActive: true, order: 6, isSystem: true },
      { id: "monthlyCartonNeed", type: "number", label: "احتياج المسجد الشهري بالكرتون", placeholder: "مثال: 20", required: false, isActive: true, order: 7, isSystem: true },
      { id: "hasWaterFridge", type: "radio", label: "هل لديكم ثلاجة مخصصة للماء بالمسجد؟", required: true, isActive: true, order: 8, options: [{ label: "نعم", value: "yes" }, { label: "لا", value: "no" }], isSystem: true }
    );
  } else if (serviceId === "quick_response") {
    commonFields.push({ id: "urgencyLevel", type: "select", label: "درجة الاستعجال", required: true, isActive: true, order: 6, options: [{ label: "طارئ جداً", value: "urgent" }, { label: "متوسط", value: "medium" }, { label: "عادي", value: "normal" }], isSystem: true });
  }

  const currentCount = commonFields.length;
  commonFields.push(
    {
      id: "willingToVolunteer",
      type: "radio",
      label: "هل لديكم استعداد لتأسيس فريق تطوعي لقيادة وتسويق الفرصة؟",
      required: true,
      isActive: true,
      order: currentCount + 1,
      options: [{ label: "نعم", value: "yes" }, { label: "لا", value: "no" }],
      isSystem: true,
    },
    {
      id: "attachment",
      type: "file",
      label: "المرفقات والوثائق الداعمة (اختياري)",
      placeholder: "ملفات PDF أو صور أو مستندات Word",
      required: false,
      isActive: true,
      order: currentCount + 2,
      isSystem: true,
    }
  );

  return commonFields;
}

const EVALUATION_SETTING_KEY = "evaluation_form_customization";
const SERVICE_SETTING_PREFIX = "service_form_customization_";

export const formsRouter = router({
  // ==================== استمارة التقييم ====================

  // جلب إعدادات استمارة التقييم
  getEvaluationFormConfig: publicProcedure.query(async () => {
    const db = await getDb();
    if (!db) return DEFAULT_EVALUATION_FORM_SETTINGS;

    try {
      const [setting] = await db
        .select()
        .from(brandSettings)
        .where(eq(brandSettings.settingKey, EVALUATION_SETTING_KEY))
        .limit(1);

      if (setting && setting.settingValue) {
        const parsed = JSON.parse(setting.settingValue);
        const validated = evaluationFormSettingsSchema.safeParse(parsed);
        if (validated.success) return validated.data;
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
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "قاعدة البيانات غير متاحة" });
      }

      const serializedValue = JSON.stringify(input);

      const [existing] = await db
        .select()
        .from(brandSettings)
        .where(eq(brandSettings.settingKey, EVALUATION_SETTING_KEY))
        .limit(1);

      if (existing) {
        await db
          .update(brandSettings)
          .set({
            settingValue: serializedValue,
            updatedBy: ctx.user.id,
            updatedAt: new Date(),
          })
          .where(eq(brandSettings.settingKey, EVALUATION_SETTING_KEY));
      } else {
        await db.insert(brandSettings).values({
          settingKey: EVALUATION_SETTING_KEY,
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

  // إعادة تعيين استمارة التقييم للافتراضي
  resetEvaluationFormConfig: protectedProcedure.mutation(async () => {
    const db = await getDb();
    if (!db) {
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "قاعدة البيانات غير متاحة" });
    }

    await db.delete(brandSettings).where(eq(brandSettings.settingKey, EVALUATION_SETTING_KEY));

    return {
      success: true,
      message: "تمت إعادة استمارة التقييم إلى الإعدادات الافتراضية بنجاح",
      data: DEFAULT_EVALUATION_FORM_SETTINGS,
    };
  }),

  // ==================== نماذج طلبات الخدمات ====================

  // جلب حقول نموذج خدمة محددة
  getServiceFormConfig: publicProcedure
    .input(z.object({ serviceId: z.string() }))
    .query(async ({ input }) => {
      const db = await getDb();
      const settingKey = `${SERVICE_SETTING_PREFIX}${input.serviceId}`;

      const defaultFields = getDefaultFieldsForService(input.serviceId);

      if (!db) {
        return { serviceId: input.serviceId, fields: defaultFields };
      }

      try {
        const [setting] = await db
          .select()
          .from(brandSettings)
          .where(eq(brandSettings.settingKey, settingKey))
          .limit(1);

        if (setting && setting.settingValue) {
          const parsed = JSON.parse(setting.settingValue);
          const validated = serviceFormSettingsSchema.safeParse(parsed);
          if (validated.success) {
            return validated.data;
          }
        }
      } catch (e) {
        console.error("Error reading service form config:", e);
      }

      return {
        serviceId: input.serviceId,
        fields: defaultFields,
      };
    }),

  // حفظ حقول نموذج خدمة محددة
  saveServiceFormConfig: protectedProcedure
    .input(serviceFormSettingsSchema)
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "قاعدة البيانات غير متاحة" });
      }

      const settingKey = `${SERVICE_SETTING_PREFIX}${input.serviceId}`;
      const serializedValue = JSON.stringify(input);

      const [existing] = await db
        .select()
        .from(brandSettings)
        .where(eq(brandSettings.settingKey, settingKey))
        .limit(1);

      if (existing) {
        await db
          .update(brandSettings)
          .set({
            settingValue: serializedValue,
            updatedBy: ctx.user.id,
            updatedAt: new Date(),
          })
          .where(eq(brandSettings.settingKey, settingKey));
      } else {
        await db.insert(brandSettings).values({
          settingKey,
          settingValue: serializedValue,
          settingType: "json",
          description: `تخصيص نموذج الخدمة: ${input.serviceName || input.serviceId}`,
          updatedBy: ctx.user.id,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }

      return {
        success: true,
        message: `تم حفظ نموذج ${input.serviceName || "الخدمة"} بنجاح وتطبيقه على الطلبات`,
        data: input,
      };
    }),

  // إعادة تعيين حقول نموذج خدمة للافتراضي
  resetServiceFormConfig: protectedProcedure
    .input(z.object({ serviceId: z.string() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "قاعدة البيانات غير متاحة" });
      }

      const settingKey = `${SERVICE_SETTING_PREFIX}${input.serviceId}`;
      await db.delete(brandSettings).where(eq(brandSettings.settingKey, settingKey));

      return {
        success: true,
        message: "تمت استعادة الحقول الافتراضية للخدمة بنجاح",
        data: {
          serviceId: input.serviceId,
          fields: getDefaultFieldsForService(input.serviceId),
        },
      };
    }),
});
