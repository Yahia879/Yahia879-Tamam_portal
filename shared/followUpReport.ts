import { z } from "zod";

export const FOLLOW_UP_REPORT_TITLE = "تقارير متابعة";

export const followUpTextFields = [
  ["summary", "ملخص الأعمال المنجزة"],
  ["challenges", "التحديات والعقبات"],
  ["support", "الدعم المطلوب"],
  ["recommendations", "التوصيات والإجراءات القادمة"],
  ["strategicAlignment", "المواءمة مع الأهداف الاستراتيجية"],
  ["realizedImpact", "القيمة والأثر المتحقق على المستفيد"],
  ["lessonsLearned", "الدروس المستفادة"],
  ["continuationDecision", "قرار الاستمرار أو التعديل"],
] as const;

export const followUpIndicators = [
  ["timeIndicator", "مؤشر الوقت"],
  ["costIndicator", "مؤشر التكلفة"],
  ["changeIndicator", "مؤشر التغيير"],
] as const;

const optionalText = z.string().trim().optional();
const rows = z.array(z.record(z.string(), z.string())).optional();
const amount = z.string().regex(/^\d+(?:\.\d{1,2})?$/).optional();

export const followUpReportDetailsSchema = z.object({
  summary: optionalText,
  challenges: optionalText,
  support: optionalText,
  recommendations: optionalText,
  strategicAlignment: optionalText,
  realizedImpact: optionalText,
  lessonsLearned: optionalText,
  continuationDecision: optionalText,
  timeIndicator: optionalText,
  costIndicator: optionalText,
  changeIndicator: optionalText,
  overallTrend: optionalText,
  amountSpent: amount,
  approvedBudget: amount,
  escalation: z.boolean().optional(),
  milestones: rows,
  deviations: rows,
  risks: rows,
  correctiveActions: rows,
  links: z.array(z.object({
    title: z.string().trim().optional(),
    url: z.url({ protocol: /^https?$/ }).optional(),
  })).optional(),
});

export type FollowUpReportDetails = z.infer<typeof followUpReportDetailsSchema>;

export const followUpTables = {
  milestones: {
    title: "المعالم الرئيسية",
    columns: [
      { key: "title", label: "المعلم", type: "text" },
      { key: "dueDate", label: "التاريخ المستهدف", type: "date" },
      { key: "completionDate", label: "تاريخ الإنجاز", type: "date" },
      { key: "status", label: "الحالة", type: "text" },
    ],
  },
  deviations: {
    title: "الانحرافات",
    columns: [
      { key: "description", label: "وصف الانحراف", type: "text" },
      { key: "cause", label: "السبب", type: "text" },
      { key: "impact", label: "الأثر", type: "text" },
    ],
  },
  risks: {
    title: "المخاطر",
    columns: [
      { key: "description", label: "وصف الخطر", type: "text" },
      { key: "plan", label: "إجراءات التخفيف", type: "text" },
      { key: "assignee", label: "المسؤول", type: "text" },
    ],
  },
  correctiveActions: {
    title: "الإجراءات التصحيحية",
    columns: [
      { key: "issue", label: "القضية المرصودة", type: "text" },
      { key: "action", label: "الإجراء التصحيحي", type: "text" },
      { key: "assignee", label: "المسؤول", type: "text" },
      { key: "status", label: "الحالة", type: "text" },
    ],
  },
  links: {
    title: "الروابط الخارجية",
    columns: [
      { key: "title", label: "عنوان الرابط", type: "text" },
      { key: "url", label: "الرابط", type: "text" },
    ],
  },
} as const;

export const followUpTableKeys = Object.keys(followUpTables) as (keyof typeof followUpTables)[];

export function isFollowUpReport(report: { title?: string | null }) {
  return report.title === FOLLOW_UP_REPORT_TITLE;
}
