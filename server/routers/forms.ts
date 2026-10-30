import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { protectedProcedure, publicProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { calculateUserPermissions } from "../permissions";
import { brandSettings, programs, evaluationTokens, mosqueRequests, mosques, users, roles, rolePermissions, userRoleAssignments, userPermissions } from "../../drizzle/schema";
import { eq, like, inArray, and, or, isNull, isNotNull, ne, gt } from "drizzle-orm";
import { randomBytes } from "crypto";

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
    name: "مسار الأسئلة والاستفسارات العامة",
    track: "other",
    role: "other",
    description: "استمارة طرح الأسئلة والاستفسارات أو تقديم الاقتراحات العامة للجمعية (دون طلبات المساجد)",
    icon: "HelpCircle",
    color: "bg-sky-600",
    badge: "أسئلة واستفسارات",
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
        { id: "requestDetails", type: "textarea", label: "تفاصيل الاستفسار", placeholder: "اكتب هنا تفاصيل سؤالك، استفسارك، أو اقتراحك للجمعية...", required: true, isActive: true, order: 4, isSystem: true },
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

export const DETAILED_DASHBOARD_SETTING_KEY = "detailed_dashboard_customization";

export const DETAILED_DASHBOARD_CATEGORIES = [
  { id: "all", name: "كافة العناصر والأقسام" },
  { id: "digital_screen_section", name: "قسم الشاشة الرقمية والمؤشرات الإجمالية" },
  { id: "mosque_section", name: "قسم المساجد والتغطية" },
  { id: "request_section", name: "قسم الطلبات وبرامج الخدمات" },
  { id: "procurement_section", name: "قسم المشاريع والعقود وشبكة الموردين" },
  { id: "financial_section", name: "قسم المالية والصرف والتدفقات" },
];

export const DETAILED_DASHBOARD_ELEMENT_DEFINITIONS = [
  // 1. قسم الشاشة الرقمية والمؤشرات الإجمالية
  { id: "section_digital_screen", title: "قسم الشاشة الرقمية بالكامل (والتبويب)", category: "digital_screen_section", categoryName: "قسم الشاشة الرقمية والمؤشرات الإجمالية", description: "إظهار أو إخفاء تبويب وقسم الشاشة الرقمية بالكامل من شريط التنقل", defaultEnabled: true },
  { id: "main_total_requests", title: "إجمالي الطلبات (الشاشة الرقمية)", category: "digital_screen_section", categoryName: "قسم الشاشة الرقمية والمؤشرات الإجمالية", description: "بطاقة إجمالي الطلبات المسجلة ونسبة التغير الشهري", defaultEnabled: true },
  { id: "main_registered_mosques", title: "المساجد المسجلة (الشاشة الرقمية)", category: "digital_screen_section", categoryName: "قسم الشاشة الرقمية والمؤشرات الإجمالية", description: "بطاقة المساجد المعتمدة ونسبة التغير", defaultEnabled: true },
  { id: "main_in_progress_requests", title: "الطلبات قيد التنفيذ (الشاشة الرقمية)", category: "digital_screen_section", categoryName: "قسم الشاشة الرقمية والمؤشرات الإجمالية", description: "بطاقة الطلبات الجارية بمختلف المراحل النشطة", defaultEnabled: true },
  { id: "main_completed_requests", title: "الطلبات المكتملة (الشاشة الرقمية)", category: "digital_screen_section", categoryName: "قسم الشاشة الرقمية والمؤشرات الإجمالية", description: "بطاقة الطلبات المنجزة ونسبة الإنجاز الكلية", defaultEnabled: true },
  { id: "main_approved_contracts", title: "العقود المعتمدة (الشاشة الرقمية)", category: "digital_screen_section", categoryName: "قسم الشاشة الرقمية والمؤشرات الإجمالية", description: "بطاقة العقود المعتمدة والمبالغ السارية", defaultEnabled: true },
  { id: "main_paid_amounts", title: "المبالغ المصروفة (الشاشة الرقمية)", category: "digital_screen_section", categoryName: "قسم الشاشة الرقمية والمؤشرات الإجمالية", description: "بطاقة المبالغ المصروفة من أوامر الصرف المنفذة", defaultEnabled: true },
  { id: "main_receipt_vouchers", title: "سندات القبض (الشاشة الرقمية)", category: "digital_screen_section", categoryName: "قسم الشاشة الرقمية والمؤشرات الإجمالية", description: "بطاقة سندات القبض ومبالغ التحصيل", defaultEnabled: true },
  { id: "main_active_projects", title: "المشاريع النشطة (الشاشة الرقمية)", category: "digital_screen_section", categoryName: "قسم الشاشة الرقمية والمؤشرات الإجمالية", description: "بطاقة المشاريع النشطة والميزانية الكلية المعتمدة", defaultEnabled: true },

  // 2. قسم المساجد والتغطية
  { id: "section_mosques", title: "قسم المساجد بالكامل (والتبويب)", category: "mosque_section", categoryName: "قسم المساجد والتغطية", description: "إظهار أو إخفاء قسم المساجد بالكامل مع تبويبه من شريط التنقل", defaultEnabled: true },
  { id: "mosque_total", title: "المساجد المسجلة", category: "mosque_section", categoryName: "قسم المساجد والتغطية", description: "بطاقة إجمالي المساجد المسجلة رسمياً بالبوابة", defaultEnabled: true },
  { id: "mosque_active", title: "المساجد النشطة", category: "mosque_section", categoryName: "قسم المساجد والتغطية", description: "بطاقة المساجد النشطة المستفيدة من الخدمات والزيارات", defaultEnabled: true },
  { id: "mosque_recent", title: "مساجد جديدة (30 يوم)", category: "mosque_section", categoryName: "قسم المساجد والتغطية", description: "بطاقة نمو تسجيل المساجد الجديدة خلال آخر شهر", defaultEnabled: true },
  { id: "mosque_coverage", title: "نسبة التغطية", category: "mosque_section", categoryName: "قسم المساجد والتغطية", description: "بطاقة نسبة المساجد المفعّلة والمستفيدة من الخدمات", defaultEnabled: true },
  { id: "mosques_charts", title: "مخططات وتوزيع المساجد الجغرافية", category: "mosque_section", categoryName: "قسم المساجد والتغطية", description: "المخططات البيانية لتوزيع المساجد حسب المدن وحالات الاعتماد", defaultEnabled: true },

  // 2. قسم الطلبات وبرامج الخدمات
  { id: "section_requests", title: "قسم الطلبات بالكامل (والتبويب)", category: "request_section", categoryName: "قسم الطلبات وبرامج الخدمات", description: "إظهار أو إخفاء قسم الطلبات بالكامل مع تبويبه من شريط التنقل", defaultEnabled: true },
  { id: "request_total", title: "إجمالي الطلبات", category: "request_section", categoryName: "قسم الطلبات وبرامج الخدمات", description: "بطاقة كافة طلبات الخدمات المسجلة بالبوابة", defaultEnabled: true },
  { id: "request_completed", title: "الطلبات المكتملة", category: "request_section", categoryName: "قسم الطلبات وبرامج الخدمات", description: "بطاقة الطلبات التي تم إنجازها بنجاح تام", defaultEnabled: true },
  { id: "request_in_progress", title: "الطلبات قيد التنفيذ", category: "request_section", categoryName: "قسم الطلبات وبرامج الخدمات", description: "بطاقة الطلبات الجارية بمختلف المراحل النشطة", defaultEnabled: true },
  { id: "request_rejected", title: "الطلبات المرفوضة", category: "request_section", categoryName: "قسم الطلبات وبرامج الخدمات", description: "بطاقة الطلبات المرفوضة لعدم اكتمال المتطلبات", defaultEnabled: true },
  { id: "requests_charts", title: "مخططات تقارير الطلبات الفنية", category: "request_section", categoryName: "قسم الطلبات وبرامج الخدمات", description: "المخططات الإحصائية لتوزيع الطلبات على البرامج والمنحنى الشهري للنمو", defaultEnabled: true },

  // 3. قسم المشاريع والعقود وشبكة الموردين
  { id: "section_procurement", title: "قسم المشاريع والعقود بالكامل (والتبويب)", category: "procurement_section", categoryName: "قسم المشاريع والعقود وشبكة الموردين", description: "إظهار أو إخفاء قسم المشاريع والعقود بالكامل مع تبويبه من شريط التنقل", defaultEnabled: true },
  { id: "procurement_suppliers_total", title: "إجمالي الموردين", category: "procurement_section", categoryName: "قسم المشاريع والعقود وشبكة الموردين", description: "بطاقة عدد الموردين والشركات المسجلة بالشبكة", defaultEnabled: true },
  { id: "procurement_suppliers_approved", title: "موردون معتمدون", category: "procurement_section", categoryName: "قسم المشاريع والعقود وشبكة الموردين", description: "بطاقة عدد المنشآت المؤهلة والمعتمدة رسمياً", defaultEnabled: true },
  { id: "procurement_contracts_count", title: "العقود المعتمدة", category: "procurement_section", categoryName: "قسم المشاريع والعقود وشبكة الموردين", description: "بطاقة عدد العقود الرسمية المبرمة", defaultEnabled: true },
  { id: "procurement_contracts_value", title: "قيمة العقود", category: "procurement_section", categoryName: "قسم المشاريع والعقود وشبكة الموردين", description: "بطاقة مجموع القيم المالية للعقود المعتمدة", defaultEnabled: true },
  { id: "project_vouchers_amount", title: "مبالغ سندات القبض", category: "procurement_section", categoryName: "قسم المشاريع والعقود وشبكة الموردين", description: "بطاقة إجمالي مبالغ سندات القبض المعتمدة للمشاريع", defaultEnabled: true },
  { id: "project_support_projects", title: "مشاريع الدعم", category: "procurement_section", categoryName: "قسم المشاريع والعقود وشبكة الموردين", description: "بطاقة عدد مشاريع الدعم الجارية والمكتملة", defaultEnabled: true },
  { id: "project_budget", title: "ميزانية المشاريع", category: "procurement_section", categoryName: "قسم المشاريع والعقود وشبكة الموردين", description: "بطاقة الموازنة الكلية المعتمدة للمشاريع بالريال", defaultEnabled: true },
  { id: "project_paid_amount", title: "المبالغ المصروفة للمشاريع", category: "procurement_section", categoryName: "قسم المشاريع والعقود وشبكة الموردين", description: "بطاقة المصروف الفعلي المنفذ على المشاريع", defaultEnabled: true },
  { id: "procurement_charts", title: "مخططات المشتريات والعقود والموردين", category: "procurement_section", categoryName: "قسم المشاريع والعقود وشبكة الموردين", description: "المخططات البيانية لتوزيع الموردين وحالات العقود التشغيلية", defaultEnabled: true },

  // 4. قسم المالية والصرف والتدفقات
  { id: "section_financial", title: "قسم المالية بالكامل (والتبويب)", category: "financial_section", categoryName: "قسم المالية والصرف والتدفقات", description: "إظهار أو إخفاء قسم المالية بالكامل مع تبويبه من شريط التنقل", defaultEnabled: true },
  { id: "financial_disb_requests", title: "طلبات الصرف", category: "financial_section", categoryName: "قسم المالية والصرف والتدفقات", description: "بطاقة عدد طلبات الصرف المعتمدة رسمياً", defaultEnabled: true },
  { id: "financial_disb_orders", title: "أوامر الصرف", category: "financial_section", categoryName: "قسم المالية والصرف والتدفقات", description: "بطاقة عدد أوامر الصرف المعتمدة للصرف والتحويل", defaultEnabled: true },
  { id: "financial_total_expenses", title: "إجمالي المصروفات", category: "financial_section", categoryName: "قسم المالية والصرف والتدفقات", description: "بطاقة إجمالي المبالغ المنفذة بنكياً من أوامر الصرف", defaultEnabled: true },
  { id: "financial_receipt_vouchers", title: "سندات القبض", category: "financial_section", categoryName: "قسم المالية والصرف والتدفقات", description: "بطاقة عدد وإجمالي مبالغ سندات القبض المعتمدة", defaultEnabled: true },
  { id: "financial_charts", title: "المخططات والتحليلات المالية الشاملة", category: "financial_section", categoryName: "قسم المالية والصرف والتدفقات", description: "الرسوم البيانية للتدفقات النقدية والمصروفات ومشاريع الدعم والتغطية", defaultEnabled: true },

  // 5. عام
];

export const DEFAULT_ENABLED_DETAILED_DASHBOARD_IDS = DETAILED_DASHBOARD_ELEMENT_DEFINITIONS.filter(e => e.defaultEnabled).map(e => e.id);

export const detailedDashboardCustomizationSchema = z.object({
  targetType: z.enum(["global", "role", "user"]).default("global"),
  targetId: z.string().optional(),
  enabledElementIds: z.array(z.string()).default(DEFAULT_ENABLED_DETAILED_DASHBOARD_IDS),
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

  // ==================== تخصيص لوحة القيادة المفصلة (مدير النظام) ====================

  // جلب إعدادات اللوحة المفصلة (يدعم الفلترة حسب المستخدم أو الدور أو النوع)
  getDetailedDashboardCustomizationConfig: publicProcedure
    .input(
      z.object({
        targetType: z.enum(["global", "role", "user"]).optional(),
        targetId: z.string().optional(),
        userId: z.number().optional(),
        roleId: z.string().optional(),
      }).optional()
    )
    .query(async ({ input }) => {
      const db = await getDb();
      const defaultResponse = {
        enabledElementIds: DEFAULT_ENABLED_DETAILED_DASHBOARD_IDS,
        categories: DETAILED_DASHBOARD_CATEGORIES,
        elements: DETAILED_DASHBOARD_ELEMENT_DEFINITIONS,
        isCustomized: false,
        targetType: input?.targetType || "global",
        targetId: input?.targetId,
        updatedAt: null,
      };

      if (!db) return defaultResponse;

      try {
        // 1. إذا كان الاستعلام مخصصاً لمستخدم (مثلاً أثناء فتح لوحة المعلومات)
        if (input?.userId || input?.roleId) {
          // فحص تخصيص المستخدم أولاً
          if (input.userId) {
            const userKey = `detailed_dashboard_user_${input.userId}`;
            const [userSetting] = await db
              .select()
              .from(brandSettings)
              .where(eq(brandSettings.settingKey, userKey))
              .limit(1);

            if (userSetting?.settingValue) {
              const parsed = JSON.parse(userSetting.settingValue);
              const validated = detailedDashboardCustomizationSchema.safeParse(parsed);
              if (validated.success) {
                return {
                  enabledElementIds: validated.data.enabledElementIds,
                  categories: DETAILED_DASHBOARD_CATEGORIES,
                  elements: DETAILED_DASHBOARD_ELEMENT_DEFINITIONS,
                  isCustomized: true,
                  targetType: "user" as const,
                  targetId: String(input.userId),
                  updatedAt: userSetting.updatedAt,
                };
              }
            }
          }

          // فحص تخصيص الدور ثانياً
          if (input.roleId) {
            const roleKey = `detailed_dashboard_role_${input.roleId}`;
            const [roleSetting] = await db
              .select()
              .from(brandSettings)
              .where(eq(brandSettings.settingKey, roleKey))
              .limit(1);

            if (roleSetting?.settingValue) {
              const parsed = JSON.parse(roleSetting.settingValue);
              const validated = detailedDashboardCustomizationSchema.safeParse(parsed);
              if (validated.success) {
                return {
                  enabledElementIds: validated.data.enabledElementIds,
                  categories: DETAILED_DASHBOARD_CATEGORIES,
                  elements: DETAILED_DASHBOARD_ELEMENT_DEFINITIONS,
                  isCustomized: true,
                  targetType: "role" as const,
                  targetId: input.roleId,
                  updatedAt: roleSetting.updatedAt,
                };
              }
            }
          }

          // فحص التخصيص العام الافتراضي ثالثاً
          const [globalSetting] = await db
            .select()
            .from(brandSettings)
            .where(eq(brandSettings.settingKey, DETAILED_DASHBOARD_SETTING_KEY))
            .limit(1);

          if (globalSetting?.settingValue) {
            const parsed = JSON.parse(globalSetting.settingValue);
            const validated = detailedDashboardCustomizationSchema.safeParse(parsed);
            if (validated.success) {
              return {
                enabledElementIds: validated.data.enabledElementIds,
                categories: DETAILED_DASHBOARD_CATEGORIES,
                elements: DETAILED_DASHBOARD_ELEMENT_DEFINITIONS,
                isCustomized: true,
                targetType: "global" as const,
                targetId: undefined,
                updatedAt: globalSetting.updatedAt,
              };
            }
          }

          return defaultResponse;
        }

        // 2. إذا كان الاستعلام من صفحة التخصيص لهدف محدد (global أو role أو user)
        let settingKey = DETAILED_DASHBOARD_SETTING_KEY;
        if (input?.targetType === "role" && input?.targetId) {
          settingKey = `detailed_dashboard_role_${input.targetId}`;
        } else if (input?.targetType === "user" && input?.targetId) {
          settingKey = `detailed_dashboard_user_${input.targetId}`;
        }

        const [setting] = await db
          .select()
          .from(brandSettings)
          .where(eq(brandSettings.settingKey, settingKey))
          .limit(1);

        if (setting?.settingValue) {
          const parsed = JSON.parse(setting.settingValue);
          const validated = detailedDashboardCustomizationSchema.safeParse(parsed);
          if (validated.success) {
            return {
              enabledElementIds: validated.data.enabledElementIds,
              categories: DETAILED_DASHBOARD_CATEGORIES,
              elements: DETAILED_DASHBOARD_ELEMENT_DEFINITIONS,
              isCustomized: true,
              targetType: input?.targetType || "global",
              targetId: input?.targetId,
              updatedAt: setting.updatedAt,
            };
          }
        }
      } catch (e) {
        console.error("Error reading detailed dashboard customization config:", e);
      }

      return defaultResponse;
    }),

  // معرفة الأهداف (الأدوار والمستخدمين) التي تم تخصيصها مسبقاً
  getCustomizedDashboardTargets: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) return { hasGlobal: false, roles: [], userIds: [] };

    try {
      const rows = await db
        .select({ key: brandSettings.settingKey })
        .from(brandSettings)
        .where(like(brandSettings.settingKey, "detailed_dashboard_%"));

      const roles: string[] = [];
      const userIds: string[] = [];
      let hasGlobal = false;

      for (const r of rows) {
        if (r.key === DETAILED_DASHBOARD_SETTING_KEY) {
          hasGlobal = true;
        } else if (r.key.startsWith("detailed_dashboard_role_")) {
          roles.push(r.key.replace("detailed_dashboard_role_", ""));
        } else if (r.key.startsWith("detailed_dashboard_user_")) {
          userIds.push(r.key.replace("detailed_dashboard_user_", ""));
        }
      }

      return { hasGlobal, roles, userIds };
    } catch {
      return { hasGlobal: false, roles: [], userIds: [] };
    }
  }),

  // جلب الأدوار والمستخدمين المؤهلين لتخصيص لوحة المعلومات (من يملكون صلاحية الوصول إليها فقط)
  getEligibleDashboardTargets: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) return { roles: [], users: [] };

    try {
      // 1. تحديد الأدوار التي تملك صلاحية لوحة المعلومات
      const allRoles = await db.select().from(roles);
      const rolePermRows = await db
        .select({ roleId: rolePermissions.roleId, permissionId: rolePermissions.permissionId })
        .from(rolePermissions)
        .where(inArray(rolePermissions.permissionId, ["information_dashboard", "information_dashboard.view", "*"]));

      const eligibleRoleIds = new Set<string>(["super_admin", "system_admin", "dashboard_viewer"]);
      rolePermRows.forEach((rp) => eligibleRoleIds.add(rp.roleId));

      for (const r of allRoles) {
        if (r.description) {
          try {
            const parsed = JSON.parse(r.description);
            if (
              Array.isArray(parsed) &&
              parsed.some((p: string) =>
                ["information_dashboard", "information_dashboard.view", "*"].includes(p)
              )
            ) {
              eligibleRoleIds.add(r.id);
            }
          } catch {}
        }
      }

      const eligibleRoles = allRoles
        .filter((r) => eligibleRoleIds.has(r.id) && (r.isActive === null || r.isActive === undefined || Boolean(r.isActive)))
        .map((r) => ({
          id: r.id,
          name: r.nameEn || r.id,
          nameAr: r.nameAr || r.nameEn || r.id,
          nameEn: r.nameEn || r.id,
          isSystem: Boolean(r.isSystem),
        }));

      // 2. تحديد المستخدمين الذين يملكون صلاحية لوحة المعلومات
      const allUsers = await db
        .select({
          id: users.id,
          name: users.name,
          email: users.email,
          role: users.role,
          status: users.status,
        })
        .from(users)
        .where(or(ne(users.status, "suspended"), isNull(users.status)));

      const userRoleRows = await db
        .select({ userId: userRoleAssignments.userId, roleId: userRoleAssignments.roleId })
        .from(userRoleAssignments)
        .where(
          and(
            isNotNull(userRoleAssignments.userId),
            or(isNull(userRoleAssignments.expiresAt), gt(userRoleAssignments.expiresAt, new Date()))
          )
        );

      const userPermRows = await db
        .select({
          userId: userPermissions.userId,
          permissionId: userPermissions.permissionId,
          granted: userPermissions.granted,
        })
        .from(userPermissions)
        .where(
          and(
            isNotNull(userPermissions.userId),
            inArray(userPermissions.permissionId, ["information_dashboard", "information_dashboard.view", "*"])
          )
        );

      const userAdditionalRolesMap = new Map<number, string[]>();
      userRoleRows.forEach((ur) => {
        if (ur.userId) {
          if (!userAdditionalRolesMap.has(ur.userId)) userAdditionalRolesMap.set(ur.userId, []);
          userAdditionalRolesMap.get(ur.userId)!.push(ur.roleId);
        }
      });

      const grantedPermUsers = new Set<number>();
      const revokedPermUsers = new Set<number>();
      userPermRows.forEach((up) => {
        if (up.userId) {
          if (up.granted === true || (up.granted as unknown) === 1) {
            grantedPermUsers.add(up.userId);
          } else if (up.granted === false || (up.granted as unknown) === 0) {
            revokedPermUsers.add(up.userId);
          }
        }
      });

      const eligibleUsers = allUsers
        .filter((u) => {
          if (revokedPermUsers.has(u.id)) return false;
          if (grantedPermUsers.has(u.id)) return true;
          if (u.role && eligibleRoleIds.has(u.role)) return true;
          const addRoles = userAdditionalRolesMap.get(u.id) || [];
          if (addRoles.some((r) => eligibleRoleIds.has(r))) return true;
          return false;
        })
        .map((u) => ({
          id: u.id,
          name: u.name,
          email: u.email,
          role: u.role,
        }));

      return { roles: eligibleRoles, users: eligibleUsers };
    } catch (err) {
      console.error("Error fetching eligible dashboard targets:", err);
      return { roles: [], users: [] };
    }
  }),

  // حفظ إعدادات اللوحة المفصلة (للإعداد العام أو لدور محدد أو لمستخدم محدد)
  saveDetailedDashboardCustomizationConfig: protectedProcedure
    .input(detailedDashboardCustomizationSchema)
    .mutation(async ({ input, ctx }) => {
      const userPerms = await calculateUserPermissions(ctx.user.id);
      const hasWildcard = userPerms.includes("*");
      if (input.targetType === "global") {
        if (!hasWildcard && !userPerms.includes("forms_customization.dashboard_global")) {
          throw new TRPCError({ code: "FORBIDDEN", message: "ليس لديك صلاحية تخصيص لوحة المعلومات للجميع" });
        }
      } else if (input.targetType === "role") {
        if (!hasWildcard && !userPerms.includes("forms_customization.dashboard_role")) {
          throw new TRPCError({ code: "FORBIDDEN", message: "ليس لديك صلاحية تخصيص لوحة المعلومات حسب الدور" });
        }
      } else if (input.targetType === "user") {
        if (!hasWildcard && !userPerms.includes("forms_customization.dashboard_user")) {
          throw new TRPCError({ code: "FORBIDDEN", message: "ليس لديك صلاحية تخصيص لوحة المعلومات حسب المستخدم" });
        }
      }

      const db = await getDb();
      if (!db) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "قاعدة البيانات غير متاحة" });
      }

      let settingKey = DETAILED_DASHBOARD_SETTING_KEY;
      let desc = "تخصيص عام للوحة المعلومات لجميع المستخدمين";

      if (input.targetType === "role" && input.targetId) {
        settingKey = `detailed_dashboard_role_${input.targetId}`;
        desc = `تخصيص لوحة المعلومات للدور الوظيفي: ${input.targetId}`;
      } else if (input.targetType === "user" && input.targetId) {
        settingKey = `detailed_dashboard_user_${input.targetId}`;
        desc = `تخصيص لوحة المعلومات للمستخدم رقم: ${input.targetId}`;
      }

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
          description: desc,
          updatedBy: ctx.user.id,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }

      return {
        success: true,
        message: "تم حفظ تخصيص لوحة المعلومات بنجاح",
        data: input,
      };
    }),

  // إعادة ضبط اللوحة المفصلة للافتراضي
  resetDetailedDashboardCustomizationConfig: protectedProcedure
    .input(
      z.object({
        targetType: z.enum(["global", "role", "user"]).default("global"),
        targetId: z.string().optional(),
      }).optional()
    )
    .mutation(async ({ input, ctx }) => {
      const userPerms = await calculateUserPermissions(ctx.user.id);
      const hasWildcard = userPerms.includes("*");
      const tType = input?.targetType || "global";
      if (tType === "global") {
        if (!hasWildcard && !userPerms.includes("forms_customization.dashboard_global")) {
          throw new TRPCError({ code: "FORBIDDEN", message: "ليس لديك صلاحية تخصيص لوحة المعلومات للجميع" });
        }
      } else if (tType === "role") {
        if (!hasWildcard && !userPerms.includes("forms_customization.dashboard_role")) {
          throw new TRPCError({ code: "FORBIDDEN", message: "ليس لديك صلاحية تخصيص لوحة المعلومات حسب الدور" });
        }
      } else if (tType === "user") {
        if (!hasWildcard && !userPerms.includes("forms_customization.dashboard_user")) {
          throw new TRPCError({ code: "FORBIDDEN", message: "ليس لديك صلاحية تخصيص لوحة المعلومات حسب المستخدم" });
        }
      }

      const db = await getDb();
      if (!db) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "قاعدة البيانات غير متاحة" });
      }

      let settingKey = DETAILED_DASHBOARD_SETTING_KEY;
      if (input?.targetType === "role" && input?.targetId) {
        settingKey = `detailed_dashboard_role_${input.targetId}`;
      } else if (input?.targetType === "user" && input?.targetId) {
        settingKey = `detailed_dashboard_user_${input.targetId}`;
      }

      await db
        .delete(brandSettings)
        .where(eq(brandSettings.settingKey, settingKey));

      return {
        success: true,
        message: "تمت إعادة ضبط التخصيص للافتراضي بنجاح",
      };
    }),

  // توليد رابط استبيان فريد ومخصص للاستخدام لمرة واحدة
  generateOneTimeEvaluationLink: protectedProcedure
    .input(
      z.object({
        requestId: z.number().optional().nullable(),
        metadata: z.record(z.string(), z.any()).optional(),
        expiresInDays: z.number().default(30),
      }).optional()
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "قاعدة البيانات غير متاحة" });

      const token = randomBytes(24).toString("hex");
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + (input?.expiresInDays || 30));

      await db.insert(evaluationTokens).values({
        token,
        requestId: input?.requestId || null,
        type: input?.requestId ? "request_closed" : "public_one_time",
        metadata: input?.metadata ? JSON.stringify(input.metadata) : null,
        used: false,
        expiresAt,
        createdBy: ctx.user.id,
        createdAt: new Date(),
      });

      return {
        success: true,
        token,
        relativeUrl: `/evaluation?token=${token}`,
        expiresAt,
        message: "تم إنشاء رابط استبيان فريد مخصص للاستخدام لمرة واحدة بنجاح",
      };
    }),

  // التحقق من صلاحية رابط الاستبيان ورمزه الفريد
  validateEvaluationToken: publicProcedure
    .input(
      z.object({
        token: z.string().min(1),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "قاعدة البيانات غير متاحة" });

      const [tokenRow] = await db
        .select()
        .from(evaluationTokens)
        .where(eq(evaluationTokens.token, input.token))
        .limit(1);

      if (!tokenRow) {
        return {
          valid: false,
          reason: "not_found" as const,
          message: "عفواً، رابط الاستبيان غير صالح أو تم إلغاؤه.",
        };
      }

      if (tokenRow.used) {
        return {
          valid: false,
          reason: "already_used" as const,
          usedAt: tokenRow.usedAt,
          message: "تم استخدام هذا الرابط مسبقاً لتقديم التقييم، شكراً لمشاركتكم القيمة!",
        };
      }

      if (tokenRow.expiresAt && new Date(tokenRow.expiresAt) < new Date()) {
        return {
          valid: false,
          reason: "expired" as const,
          message: "عفواً، انتهت صلاحية رابط هذا الاستبيان.",
        };
      }

      let requestInfo = null;
      if (tokenRow.requestId) {
        const [req] = await db
          .select({
            id: mosqueRequests.id,
            requestNumber: mosqueRequests.requestNumber,
            programType: mosqueRequests.programType,
            descriptiveName: mosqueRequests.descriptiveName,
            status: mosqueRequests.status,
            isEvaluated: mosqueRequests.isEvaluated,
            userId: mosqueRequests.userId,
            requesterName: users.name,
            requesterEmail: users.email,
            requesterPhone: users.phone,
            mosqueName: mosques.name,
            mosqueCity: mosques.city,
          })
          .from(mosqueRequests)
          .leftJoin(users, eq(mosqueRequests.userId, users.id))
          .leftJoin(mosques, eq(mosqueRequests.mosqueId, mosques.id))
          .where(eq(mosqueRequests.id, tokenRow.requestId))
          .limit(1);

        if (req) {
          if (req.isEvaluated) {
            await db
              .update(evaluationTokens)
              .set({ used: true, usedAt: new Date() })
              .where(eq(evaluationTokens.id, tokenRow.id));

            return {
              valid: false,
              reason: "already_used" as const,
              message: "تم تسجيل تقييم هذا الطلب مسبقاً، شكراً لمشاركتكم!",
            };
          }
          requestInfo = req;
        }
      }

      let parsedMeta: any = null;
      if (tokenRow.metadata) {
        try {
          parsedMeta = JSON.parse(tokenRow.metadata);
        } catch {}
      }

      return {
        valid: true,
        token: tokenRow.token,
        type: tokenRow.type,
        requestId: tokenRow.requestId,
        requestInfo,
        metadata: parsedMeta,
      };
    }),

});
