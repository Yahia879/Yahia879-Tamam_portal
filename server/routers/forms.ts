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

export const registrationFormSettingsSchema = z.object({
  formId: z.string(),
  formName: z.string().optional(),
  description: z.string().optional(),
  fields: z.array(serviceFieldSchema),
});

export type EvaluationFormSettings = z.infer<typeof evaluationFormSettingsSchema>;
export type ServiceField = z.infer<typeof serviceFieldSchema>;
export type RegistrationFormSettings = z.infer<typeof registrationFormSettingsSchema>;

const REGISTRATION_SETTING_PREFIX = "registration_form_customization_";

export const REGISTRATION_FORMS_METADATA = [
  {
    id: "donor_land",
    name: "مسار المتبرع بأرض",
    track: "land",
    role: "donor",
    description: "استمارة تقديم بيانات قطعة أرض للتبرع بها لبناء أو توسعة مسجد",
    icon: "LandPlot",
    color: "bg-emerald-600",
    badge: "متبرع بأرض",
  },
  {
    id: "donor_inkind",
    name: "مسار المتبرع بتبرع عيني",
    track: "in_kind",
    role: "donor",
    description: "استمارة تقديم التبرعات العينية من مواد بناء، أجهزة تكييف، فرش، صوتيات",
    icon: "Package",
    color: "bg-teal-600",
    badge: "تبرع عيني",
  },
  {
    id: "donor_other",
    name: "مسار المتبرع (تبرع آخر)",
    track: "other",
    role: "donor",
    description: "استمارة تقديم مقترحات ومبادرات التبرع والأوقاف والمساهمات الأخرى",
    icon: "Sparkles",
    color: "bg-blue-600",
    badge: "تبرع آخر",
  },
  {
    id: "other",
    name: "مسار أخرى (استفسارات وطلبات عامة)",
    track: "other",
    role: "other",
    description: "استمارة الاستفسارات العامة وطلبات جيران وجماعة المساجد والجهات",
    icon: "HelpCircle",
    color: "bg-sky-600",
    badge: "استفسارات عامة",
  },
];

export function getDefaultFieldsForRegistrationForm(formId: string): ServiceField[] {
  switch (formId) {
    case "donor_land":
      return [
        { id: "name", type: "text", label: "الاسم الكامل", placeholder: "أدخل اسمك الكريم", required: true, isActive: true, order: 1, isSystem: true },
        { id: "phone", type: "phone", label: "رقم الجوال", placeholder: "05XXXXXXXX", required: true, isActive: true, order: 2, isSystem: true },
        { id: "email", type: "email", label: "البريد الإلكتروني", placeholder: "name@example.com", required: true, isActive: true, order: 3, isSystem: true },
        { id: "customRoleTitle", type: "text", label: "الصفة أو العلاقة بالمسجد", placeholder: "مثال: مالك الأرض، فاعل خير، وكيل المالك...", required: true, isActive: true, order: 4, isSystem: true },
        { id: "landArea", type: "text", label: "مساحة الأرض (م²)", placeholder: "مثال: 900 م²", required: true, isActive: true, order: 5, isSystem: true },
        { id: "landDimensions", type: "text", label: "أبعاد وأطوال الأرض", placeholder: "مثال: 30م × 30م، على شارعين", required: true, isActive: true, order: 6, isSystem: true },
        { id: "landLocation", type: "text", label: "موقع الأرض / الحي", placeholder: "مثال: حي الروابي، بالقرب من...", required: true, isActive: true, order: 7, isSystem: true },
        { id: "landOwner", type: "text", label: "المالك الحالي للأرض", placeholder: "اسم المالك أو صفة الواقف", required: true, isActive: true, order: 8, isSystem: true },
        { id: "landDetails", type: "textarea", label: "معلومات وملاحظات إضافية تساعد الجمعية على دراسة التبرع", placeholder: "اكتب هنا أي معلومات إضافية تساعد الجمعية على دراسة وتقييم التبرع...", required: true, isActive: true, order: 9, isSystem: true },
      ];
    case "donor_inkind":
      return [
        { id: "name", type: "text", label: "الاسم الكامل", placeholder: "أدخل اسمك الكريم", required: true, isActive: true, order: 1, isSystem: true },
        { id: "phone", type: "phone", label: "رقم الجوال", placeholder: "05XXXXXXXX", required: true, isActive: true, order: 2, isSystem: true },
        { id: "email", type: "email", label: "البريد الإلكتروني", placeholder: "name@example.com", required: true, isActive: true, order: 3, isSystem: true },
        { id: "customRoleTitle", type: "text", label: "الصفة أو العلاقة بالمسجد", placeholder: "مثال: متبرع، مورد، فاعل خير، جار المسجد...", required: true, isActive: true, order: 4, isSystem: true },
        { id: "inKindItemType", type: "text", label: "نوع التبرع العيني", placeholder: "مثال: مكيفات، سجاد، إنارة، مواد بناء...", required: true, isActive: true, order: 5, isSystem: true },
        { id: "inKindQuantity", type: "text", label: "الكميات المتاحة", placeholder: "مثال: 5 أجهزة، 200 م²...", required: true, isActive: true, order: 6, isSystem: true },
        { id: "inKindCondition", type: "text", label: "حالة المواد", placeholder: "مثال: جديدة، مستعملة بحالة ممتازة...", required: true, isActive: true, order: 7, isSystem: true },
        { id: "inKindLocation", type: "text", label: "موقع المواد / الاستلام", placeholder: "مثال: مستودع في حي الروابي، أبها...", required: true, isActive: true, order: 8, isSystem: true },
        { id: "inKindDeliveryAvailable", type: "checkbox", label: "هل يوجد إمكانية لنقل وتوصيل التبرع العيني؟", helpText: "حدد إذا كانت إمكانية النقل والتوصيل متوفرة من طرفكم", required: false, isActive: true, order: 9, isSystem: true },
        { id: "inKindDetails", type: "textarea", label: "معلومات وملاحظات إضافية عن التبرع العيني (اختياري)", placeholder: "اكتب هنا أي تفاصيل أو مواصفات إضافية عن المواد أو التجهيزات...", required: false, isActive: true, order: 10, isSystem: true },
      ];
    case "donor_financial":
      return [
        { id: "name", type: "text", label: "الاسم الكامل", placeholder: "أدخل اسمك الكريم", required: false, isActive: true, order: 1, isSystem: true },
        { id: "phone", type: "phone", label: "رقم الجوال", placeholder: "05XXXXXXXX", required: false, isActive: true, order: 2, isSystem: true },
        { id: "financialAmount", type: "number", label: "مبلغ التبرع (ريال سعودي)", placeholder: "مثال: 5000", required: false, isActive: true, order: 3, isSystem: true },
        { id: "financialBankName", type: "text", label: "اسم البنك المحول منه", placeholder: "مثال: مصرف الراجحي، البنك الأهلي...", required: false, isActive: true, order: 4, isSystem: true },
        { id: "notes", type: "textarea", label: "ملاحظات وتوجيه التبرع", placeholder: "حدد رغبتك في توجيه التبرع (مسجد محدد، مشروع محدد، عام)...", required: false, isActive: true, order: 5, isSystem: true },
      ];
    case "donor_other":
      return [
        { id: "name", type: "text", label: "الاسم الكامل", placeholder: "أدخل اسمك الكريم", required: true, isActive: true, order: 1, isSystem: true },
        { id: "phone", type: "phone", label: "رقم الجوال", placeholder: "05XXXXXXXX", required: true, isActive: true, order: 2, isSystem: true },
        { id: "email", type: "email", label: "البريد الإلكتروني", placeholder: "name@example.com", required: true, isActive: true, order: 3, isSystem: true },
        { id: "customRoleTitle", type: "text", label: "الصفة أو العلاقة بالمسجد", placeholder: "مثال: فاعل خير، رجل أعمال، ممثل جهة أو شركة، جار المسجد...", required: true, isActive: true, order: 4, isSystem: true },
        { id: "donorOtherDetails", type: "textarea", label: "تفاصيل التبرع المقترح", placeholder: "اكتب هنا تفاصيل نوع التبرع أو المبادرة أو الشراكة المقترحة للجمعية...", required: true, isActive: true, order: 5, isSystem: true },
      ];
    case "other":
    case "general_inquiry":
    default:
      return [
        { id: "name", type: "text", label: "الاسم الكامل", placeholder: "أدخل اسمك الكريم", required: true, isActive: true, order: 1, isSystem: true },
        { id: "phone", type: "phone", label: "رقم الجوال", placeholder: "05XXXXXXXX", required: true, isActive: true, order: 2, isSystem: true },
        { id: "email", type: "email", label: "البريد الإلكتروني", placeholder: "name@example.com", required: true, isActive: true, order: 3, isSystem: true },
        { id: "customRoleTitle", type: "text", label: "الصفة أو العلاقة بالمسجد", placeholder: "مثال: جار المسجد، أحد جماعة المسجد، ممثل جهة، صاحب استفسار...", required: true, isActive: true, order: 4, isSystem: true },
        { id: "requestDetails", type: "textarea", label: "تفاصيل الطلب أو الاستفسار", placeholder: "اكتب هنا تفاصيل طلبك، الاستفسار، أو الخدمة المطلوبة للمسجد...", required: true, isActive: true, order: 5, isSystem: true },
      ];
  }
}

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
      { id: "hasPrayerHall", type: "checkbox", label: "هل يتضمن المشروع مصلى للنساء؟", placeholder: "", helpText: "حدد إذا المسجد يشمل قسماً مخصصاً لمصلى النساء", required: false, isActive: true, order: 4, isSystem: true },
      { id: "hasDonorForMaintenance", type: "radio", label: "هل يوجد متبرع للقيام بتكاليف الصيانة المطلوبة؟", required: false, isActive: true, order: 5, options: [{ label: "نعم", value: "yes" }, { label: "لا", value: "no" }], isSystem: true },
      { id: "willingToVolunteer", type: "radio", label: "هل لديكم استعداد لتأسيس فريق تطوعي بقيادتكم لتسويق الفرصة؟", required: true, isActive: true, order: 6, options: [{ label: "نعم", value: "yes" }, { label: "لا", value: "no" }], isSystem: true },
      { id: "neighborhoodName", type: "text", label: "اسم الحي", placeholder: "مثال: حي النسيم", required: true, isActive: true, order: 7, isSystem: true },
      { id: "hasLand", type: "radio", label: "هل لديكم أرض مخصصة للبناء؟", required: true, isActive: true, order: 8, options: [{ label: "نعم", value: "yes" }, { label: "لا", value: "no" }], isSystem: true },
      { id: "landOwnership", type: "select", label: "ملكية الأرض", required: true, isActive: true, order: 9, options: [{ label: "ملك خاص", value: "owned" }, { label: "وقف", value: "waqf" }, { label: "حكومية", value: "government" }, { label: "أخرى", value: "other" }], isSystem: true },
      { id: "landArea", type: "number", label: "مساحة الأرض بالمتر المربع", placeholder: "مثال: 500", required: false, isActive: true, order: 10, isSystem: true },
      { id: "landProposal", type: "textarea", label: "مقترحات بخصوص الأرض", placeholder: "أي مقترحات أو ملاحظات بخصوص الأرض...", required: false, isActive: true, order: 11, isSystem: true },
      { id: "hasDonor", type: "radio", label: "هل لديكم متبرع للقيام بتكاليف البناء؟", required: true, isActive: true, order: 12, options: [{ label: "نعم", value: "yes" }, { label: "لا", value: "no" }], isSystem: true },
      { id: "donationAmount", type: "number", label: "مبلغ التبرع (بالريال السعودي)", placeholder: "مثال: 100000", required: false, isActive: true, order: 13, isSystem: true },
      { id: "fundingProposal", type: "textarea", label: "مقترحات التمويل", placeholder: "أي مقترحات بخصوص التمويل والتبرعات...", required: true, isActive: true, order: 14, isSystem: true },
      { id: "nearestMosque", type: "text", label: "أقرب مسجد موجود", placeholder: "اسم أقرب مسجد للموقع المقترح", required: false, isActive: true, order: 15, isSystem: true },
      { id: "distanceToMosque", type: "number", label: "المسافة من أقرب مسجد (بالكيلومتر)", placeholder: "مثال: 2.5", required: false, isActive: true, order: 16, isSystem: true },
      { id: "attachment", type: "file", label: "المرفقات والوثائق الداعمة (اختياري)", placeholder: "ملفات PDF أو صور أو مستندات Word", helpText: "يدعم ملفات PDF، الصور، ومستندات Word (الحد الأقصى 10 ميجابايت)", required: false, isActive: true, order: 17, isSystem: true },
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
export const ANALYTICS_CUSTOMIZATION_SETTING_KEY = "analytics_dashboard_customization";

export const ANALYTICS_CATEGORIES = [
  { id: "all", name: "كافة الأقسام" },
  { id: "kpi", name: "مؤشرات الأداء العامة (KPI)" },
  { id: "financial", name: "التقارير واللوحة المالية" },
  { id: "board", name: "تحليلات الإدارة العليا" },
  { id: "beneficiary", name: "رضا المستفيدين" },
  { id: "operations", name: "العمليات والمعاينات" },
  { id: "progress", name: "تقارير ونسب الإنجاز" },
];

export const ANALYTICS_CARD_DEFINITIONS = [
  // 1. مؤشرات الأداء العامة (KPIs)
  { id: "kpi_total_requests", title: "إجمالي الطلبات", category: "kpi", categoryName: "مؤشرات الأداء العامة", description: "إجمالي عدد الطلبات الواردة في النظام منذ البداية", defaultEnabled: true },
  { id: "kpi_completed_requests", title: "الطلبات المكتملة", category: "kpi", categoryName: "مؤشرات الأداء العامة", description: "عدد الطلبات المكتملة ونسبة الإنجاز الإجمالية", defaultEnabled: true },
  { id: "kpi_active_requests", title: "الطلبات قيد التنفيذ", category: "kpi", categoryName: "مؤشرات الأداء العامة", description: "عدد الطلبات الجارية في مختلف مراحل التنفيذ", defaultEnabled: true },
  { id: "kpi_new_requests", title: "الطلبات الجديدة", category: "kpi", categoryName: "مؤشرات الأداء العامة", description: "عدد الطلبات الجديدة بانتظار المراجعة والتدقيق", defaultEnabled: true },
  { id: "kpi_avg_rating", title: "متوسط تقييم الجودة", category: "kpi", categoryName: "مؤشرات الأداء العامة", description: "متوسط تقييمات الجودة من التقارير الختامية", defaultEnabled: true },
  { id: "kpi_total_spending", title: "إجمالي الإنفاق والمصروفات", category: "kpi", categoryName: "مؤشرات الأداء العامة", description: "إجمالي المبالغ المنفقة والتكاليف الفعلية المعتمدة", defaultEnabled: true },
  { id: "kpi_benefited_mosques", title: "المساجد المستفيدة", category: "kpi", categoryName: "مؤشرات الأداء العامة", description: "عدد المساجد التي تمت خدمتها وتغطيتها", defaultEnabled: true },
  { id: "kpi_completed_projects", title: "المشاريع المنجزة", category: "kpi", categoryName: "مؤشرات الأداء العامة", description: "إجمالي عدد المشاريع التي تم تسليمها وإغلاقها", defaultEnabled: true },
  { id: "kpi_completion_rate_bar", title: "مؤشر معدل إنجاز الطلبات", category: "kpi", categoryName: "مؤشرات الأداء العامة", description: "شريط نسبة الإنجاز والتقدم العام للطلبات", defaultEnabled: true },
  { id: "kpi_program_chart", title: "توزيع الطلبات حسب البرنامج", category: "kpi", categoryName: "مؤشرات الأداء العامة", description: "مخطط دائري يوضح حصة كل برنامج من البرامج التنفيذية", defaultEnabled: true },
  { id: "kpi_stage_chart", title: "توزيع الطلبات حسب المراحل", category: "kpi", categoryName: "مؤشرات الأداء العامة", description: "مخطط شريطي لتوزيع الطلبات على مراحل العمل", defaultEnabled: true },
  { id: "kpi_trend_chart", title: "حركة الطلبات الشهرية", category: "kpi", categoryName: "مؤشرات الأداء العامة", description: "مخطط بياني يوضح اتجاه الطلبات خلال الأشهر السابقة", defaultEnabled: true },

  // 2. التقارير المالية (Financials)
  { id: "fin_approved_orders", title: "أوامر الصرف المعتمدة", category: "financial", categoryName: "التقارير واللوحة المالية", description: "إجمالي مبالغ أوامر الصرف المعتمدة والمنفذة", defaultEnabled: true },
  { id: "fin_receipt_vouchers", title: "سندات القبض الواردة", category: "financial", categoryName: "التقارير واللوحة المالية", description: "إجمالي مبالغ سندات القبض والدفعات المستلمة", defaultEnabled: true },
  { id: "fin_remaining_budget", title: "الميزانية المتبقية", category: "financial", categoryName: "التقارير واللوحة المالية", description: "صافي الرصيد والمبالغ المتبقية من إجمالي المخصصات", defaultEnabled: true },
  { id: "fin_spending_by_category", title: "توزيع المصروفات حسب البنود", category: "financial", categoryName: "التقارير واللوحة المالية", description: "رسم بياني لتوزيع النفقات على البرامج ومجالات الصرف", defaultEnabled: false },
  { id: "fin_timeline_chart", title: "التدفقات المالية الشهرية", category: "financial", categoryName: "التقارير واللوحة المالية", description: "مخطط التدفق المالي للمصروفات وسندات القبض عبر الأشهر", defaultEnabled: false },
  { id: "fin_top_projects", title: "أعلى المشاريع استهلاكاً للميزانية", category: "financial", categoryName: "التقارير واللوحة المالية", description: "قائمة بأكبر المشاريع من حيث التكاليف المالية المصروفة", defaultEnabled: false },

  // 3. تحليلات الإدارة العليا (Board Analytics)
  { id: "board_exec_overview", title: "ملخص الأداء التنفيذي للإدارة العليا", category: "board", categoryName: "تحليلات الإدارة العليا", description: "مؤشرات القرارات والاعتمادات المالية المباشرة", defaultEnabled: false },
  { id: "board_mosques_overview", title: "النظرة الشاملة للمساجد والمشاريع", category: "board", categoryName: "تحليلات الإدارة العليا", description: "تغطية الجوامع والمساجد المعتمدة استراتيجياً", defaultEnabled: false },
  { id: "board_budget_performance", title: "مصفوفة كفاءة الإنفاق والموازنات", category: "board", categoryName: "تحليلات الإدارة العليا", description: "نسبة الصرف الفعلي مقارنة بالمستهدف الاستراتيجي", defaultEnabled: false },
  { id: "board_contractors_summary", title: "مؤشر التزام المقاولين والموردين", category: "board", categoryName: "تحليلات الإدارة العليا", description: "تقييم أداء المقاولين والموردين وسرعة تسليم الأعمال", defaultEnabled: false },

  // 4. رضا المستفيدين (Beneficiary Satisfaction)
  { id: "bene_overall_score", title: "معدل الرضا العام للمستفيدين", category: "beneficiary", categoryName: "رضا المستفيدين", description: "معدل درجات تقييم رضا المستفيدين من 5 نجوم", defaultEnabled: true },
  { id: "bene_total_responses", title: "إجمالي التقييمات المستلمة", category: "beneficiary", categoryName: "رضا المستفيدين", description: "عدد استمارات التقييم المكتملة والمرسلة من المستفيدين", defaultEnabled: true },
  { id: "bene_speed_rating", title: "تقييم سرعة الاستجابة", category: "beneficiary", categoryName: "رضا المستفيدين", description: "معدل رضا المستفيدين عن سرعة تلبية الطلبات والتواصل", defaultEnabled: false },
  { id: "bene_service_rating", title: "تقييم جودة الخدمة", category: "beneficiary", categoryName: "رضا المستفيدين", description: "معدل رضا المستفيدين عن جودة تنفيذ الخدمات والأعمال", defaultEnabled: false },
  { id: "bene_latest_feedback", title: "أحدث آراء ومقترحات المستفيدين", category: "beneficiary", categoryName: "رضا المستفيدين", description: "موجز الملاحظات والتعليقات المكتوبة من المستفيدين", defaultEnabled: false },

  // 5. العمليات والمعاينات (Operations & Field)
  { id: "ops_field_visits", title: "إحصائيات الزيارات والمعاينات", category: "operations", categoryName: "العمليات والمعاينات", description: "عدد الزيارات الميدانية المنفذة والمعاينات المعلقة", defaultEnabled: true },
  { id: "ops_quick_response", title: "مؤشرات الاستجابة السريعة", category: "operations", categoryName: "العمليات والمعاينات", description: "حالات الصيانة الطارئة وفرق الاستجابة السريعة", defaultEnabled: false },
  { id: "ops_handover_queue", title: "طابور استلام المواقع", category: "operations", categoryName: "العمليات والمعاينات", description: "المشاريع الجاهزة للاستلام ومحاضر التسليم المبدئي والنهائي", defaultEnabled: false },

  // 6. تقارير المشاريع ونسب الإنجاز (Projects & Progress)
  { id: "proj_periodic_reports", title: "إجمالي التقارير الدورية للمشاريع", category: "progress", categoryName: "تقارير المشاريع ونسب الإنجاز", description: "التقارير النصف شهرية والشهرية والربعية المرفوعة", defaultEnabled: false },
  { id: "proj_on_track_ratio", title: "نسبة الالتزام بالجدول الزمني", category: "progress", categoryName: "تقارير المشاريع ونسب الإنجاز", description: "المشاريع المنتظمة في المواعيد المحددة مقابل المتأخرة", defaultEnabled: true },
  { id: "proj_progress_average", title: "متوسط نسبة الإنجاز العام", category: "progress", categoryName: "تقارير المشاريع ونسب الإنجاز", description: "متوسط نسبة الإنجاز الفعلي لجميع المشاريع الجارية", defaultEnabled: true },
  { id: "proj_milestones_status", title: "حالة المعالم الإنشائية والفنية", category: "progress", categoryName: "تقارير المشاريع ونسب الإنجاز", description: "مؤشرات إتمام المعالم والمراحل الحرجة في المشاريع", defaultEnabled: false },
];

export const DEFAULT_ENABLED_ANALYTICS_CARD_IDS = ANALYTICS_CARD_DEFINITIONS.filter(c => c.defaultEnabled).map(c => c.id);

export const analyticsCustomizationSchema = z.object({
  enabledCardIds: z.array(z.string()).default(DEFAULT_ENABLED_ANALYTICS_CARD_IDS),
});

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
        if (validated.success) {
          return {
            ...validated.data,
            isCustomized: true,
          };
        }
      }
    } catch (e) {
      console.error("Error reading evaluation form config:", e);
    }

    return {
      ...DEFAULT_EVALUATION_FORM_SETTINGS,
      isCustomized: false,
    };
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
        return { serviceId: input.serviceId, fields: defaultFields, isCustomized: false };
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
            return {
              ...validated.data,
              isCustomized: true,
            };
          }
        }
      } catch (e) {
        console.error("Error reading service form config:", e);
      }

      return {
        serviceId: input.serviceId,
        fields: defaultFields,
        isCustomized: false,
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

  // ==================== نماذج التسجيل والتبرعات ====================

  // جلب قائمة كافة نماذج التسجيل المتاحة للتخصيص
  getRegistrationFormsList: publicProcedure.query(async () => {
    return REGISTRATION_FORMS_METADATA;
  }),

  // جلب حقول نموذج تسجيل/تبرع محدد
  getRegistrationFormConfig: publicProcedure
    .input(z.object({ formId: z.string() }))
    .query(async ({ input }) => {
      const db = await getDb();
      const settingKey = `${REGISTRATION_SETTING_PREFIX}${input.formId}`;
      const defaultFields = getDefaultFieldsForRegistrationForm(input.formId);

      const meta = REGISTRATION_FORMS_METADATA.find((f) => f.id === input.formId);

      if (!db) {
        return {
          formId: input.formId,
          formName: meta?.name || input.formId,
          fields: defaultFields,
          isCustomized: false,
        };
      }

      try {
        const [setting] = await db
          .select()
          .from(brandSettings)
          .where(eq(brandSettings.settingKey, settingKey))
          .limit(1);

        if (setting && setting.settingValue) {
          const parsed = JSON.parse(setting.settingValue);
          const validated = registrationFormSettingsSchema.safeParse(parsed);
          if (validated.success) {
            return {
              ...validated.data,
              formName: meta?.name || validated.data.formName || input.formId,
              isCustomized: true,
            };
          }
        }
      } catch (e) {
        console.error("Error reading registration form config:", e);
      }

      return {
        formId: input.formId,
        formName: meta?.name || input.formId,
        fields: defaultFields,
        isCustomized: false,
      };
    }),

  // حفظ حقول نموذج تسجيل/تبرع محدد
  saveRegistrationFormConfig: protectedProcedure
    .input(registrationFormSettingsSchema)
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "قاعدة البيانات غير متاحة" });
      }

      const settingKey = `${REGISTRATION_SETTING_PREFIX}${input.formId}`;
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
          description: `تخصيص استمارة التسجيل: ${input.formName || input.formId}`,
          updatedBy: ctx.user.id,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }

      return {
        success: true,
        message: `تم حفظ استمارة "${input.formName || input.formId}" بنجاح وتطبيقها على صفحة التسجيل`,
        data: input,
      };
    }),

  // إعادة تعيين حقول نموذج تسجيل/تبرع للافتراضي
  resetRegistrationFormConfig: protectedProcedure
    .input(z.object({ formId: z.string() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "قاعدة البيانات غير متاحة" });
      }

      const settingKey = `${REGISTRATION_SETTING_PREFIX}${input.formId}`;
      await db.delete(brandSettings).where(eq(brandSettings.settingKey, settingKey));

      const meta = REGISTRATION_FORMS_METADATA.find((f) => f.id === input.formId);

      return {
        success: true,
        message: `تمت استعادة الحقول الافتراضية لاستمارة "${meta?.name || input.formId}" بنجاح`,
        data: {
          formId: input.formId,
          formName: meta?.name || input.formId,
          fields: getDefaultFieldsForRegistrationForm(input.formId),
        },
      };
    }),

  // ==================== تخصيص لوحة الإحصائيات المخصصة ====================

  // جلب إعدادات اللوحة المخصصة
  getAnalyticsCustomizationConfig: publicProcedure.query(async () => {
    const db = await getDb();
    const defaultResponse = {
      enabledCardIds: DEFAULT_ENABLED_ANALYTICS_CARD_IDS,
      categories: ANALYTICS_CATEGORIES,
      cards: ANALYTICS_CARD_DEFINITIONS,
      isCustomized: false,
      updatedAt: null,
    };

    if (!db) return defaultResponse;

    try {
      const [setting] = await db
        .select()
        .from(brandSettings)
        .where(eq(brandSettings.settingKey, ANALYTICS_CUSTOMIZATION_SETTING_KEY))
        .limit(1);

      if (setting && setting.settingValue) {
        const parsed = JSON.parse(setting.settingValue);
        const validated = analyticsCustomizationSchema.safeParse(parsed);
        if (validated.success) {
          return {
            enabledCardIds: validated.data.enabledCardIds,
            categories: ANALYTICS_CATEGORIES,
            cards: ANALYTICS_CARD_DEFINITIONS,
            isCustomized: true,
            updatedAt: setting.updatedAt,
          };
        }
      }
    } catch (e) {
      console.error("Error reading analytics customization config:", e);
    }

    return defaultResponse;
  }),

  // حفظ إعدادات اللوحة المخصصة
  saveAnalyticsCustomizationConfig: protectedProcedure
    .input(analyticsCustomizationSchema)
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "قاعدة البيانات غير متاحة" });
      }

      const serializedValue = JSON.stringify(input);

      const [existing] = await db
        .select()
        .from(brandSettings)
        .where(eq(brandSettings.settingKey, ANALYTICS_CUSTOMIZATION_SETTING_KEY))
        .limit(1);

      if (existing) {
        await db
          .update(brandSettings)
          .set({
            settingValue: serializedValue,
            updatedBy: ctx.user.id,
            updatedAt: new Date(),
          })
          .where(eq(brandSettings.settingKey, ANALYTICS_CUSTOMIZATION_SETTING_KEY));
      } else {
        await db.insert(brandSettings).values({
          settingKey: ANALYTICS_CUSTOMIZATION_SETTING_KEY,
          settingValue: serializedValue,
          settingType: "json",
          description: "تخصيص كروت ومؤشرات اللوحة المخصصة في مركز الإحصائيات",
          updatedBy: ctx.user.id,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }

      return {
        success: true,
        message: "تم حفظ تخصيص لوحة الإحصائيات وتطبيقها بنجاح",
        data: input,
      };
    }),

  // إعادة ضبط اللوحة المخصصة للافتراضي
  resetAnalyticsCustomizationConfig: protectedProcedure.mutation(async ({ ctx }) => {
    const db = await getDb();
    if (!db) {
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "قاعدة البيانات غير متاحة" });
    }

    await db
      .delete(brandSettings)
      .where(eq(brandSettings.settingKey, ANALYTICS_CUSTOMIZATION_SETTING_KEY));

    return {
      success: true,
      message: "تمت استعادة الإعدادات الافتراضية للوحة الإحصائيات المخصصة بنجاح",
      data: {
        enabledCardIds: DEFAULT_ENABLED_ANALYTICS_CARD_IDS,
      },
    };
  }),
});

