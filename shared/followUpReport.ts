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

export const followUpSourceReportSchema = z.object({
  id: z.number().int().positive(),
  reportNumber: z.string().trim().min(1),
  reportDate: z.string().trim().optional(),
  reportPeriodStart: z.string().trim().optional(),
  reportPeriodEnd: z.string().trim().optional(),
  plannedProgress: z.number().min(0).max(100).nullable().optional(),
  actualProgress: z.number().min(0).max(100).nullable().optional(),
});

export type FollowUpSourceReport = z.infer<typeof followUpSourceReportSchema>;

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
  sourceReports: z.array(followUpSourceReportSchema).optional(),
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

export function parseFollowUpDetails(value: unknown): FollowUpReportDetails | null {
  if (value === null || value === undefined || value === "") return null;
  try {
    const raw = typeof value === "string" ? JSON.parse(value) : value;
    const parsed = followUpReportDetailsSchema.safeParse(raw);
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

export interface MergedFollowUpAttachment {
  fileName: string;
  fileData: string;
  mimeType: string;
  size: number;
  preview?: string;
  status?: "pending" | "uploading" | "success" | "error";
  errorMessage?: string;
}

export interface MergeableFollowUpReport {
  id: number;
  reportNumber: string;
  projectId: number;
  title?: string | null;
  status?: string | null;
  reportDate?: string | Date | null;
  reportPeriodStart?: string | Date | null;
  reportPeriodEnd?: string | Date | null;
  plannedProgress?: number | null;
  actualProgress?: number | null;
  followUpDetails?: FollowUpReportDetails | string | null;
  attachments?: string | null;
}

export interface MergedFollowUpDraft {
  projectId: number;
  reportDate: string;
  reportPeriodStart: string;
  reportPeriodEnd: string;
  plannedProgress?: number;
  actualProgress?: number;
  followUpDetails: FollowUpReportDetails;
  attachments: MergedFollowUpAttachment[];
}

export function toFollowUpIsoDate(value?: string | Date | null): string {
  if (!value) return "";
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) return trimmed.slice(0, 10);
    const parsed = new Date(trimmed);
    return Number.isNaN(parsed.getTime()) ? "" : parsed.toISOString().slice(0, 10);
  }
  return Number.isNaN(value.getTime()) ? "" : value.toISOString().slice(0, 10);
}

function formatArabicShortDate(isoDate: string): string {
  if (!isoDate || !/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) return isoDate;
  const [year, month, day] = isoDate.split("-");
  return `${Number(day)}/${Number(month)}/${year}`;
}

function normalizeTextKey(value?: string | null): string {
  return (value ?? "").trim().replace(/\s+/g, " ").toLowerCase();
}

function cleanRecordRow(row: Record<string, string | undefined>): Record<string, string> {
  const cleaned: Record<string, string> = {};
  for (const [key, val] of Object.entries(row)) {
    const trimmed = val?.trim();
    if (trimmed) cleaned[key] = trimmed;
  }
  return cleaned;
}

function rowSignature(row: Record<string, string>): string {
  return JSON.stringify(
    Object.keys(row)
      .sort()
      .map(key => [key, normalizeTextKey(row[key])])
  );
}

function parseAttachmentList(value?: string | null): MergedFollowUpAttachment[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item): item is MergedFollowUpAttachment =>
        Boolean(item && typeof item === "object" && typeof item.fileName === "string")
    );
  } catch {
    return [];
  }
}

export function mergeFollowUpReports(
  reports: MergeableFollowUpReport[],
  options?: { reportDate?: string }
): MergedFollowUpDraft {
  if (reports.length < 2) {
    throw new Error("يرجى اختيار تقريري متابعة على الأقل للدمج.");
  }

  const sorted = [...reports].sort((a, b) => {
    const startA = toFollowUpIsoDate(a.reportPeriodStart) || toFollowUpIsoDate(a.reportDate);
    const startB = toFollowUpIsoDate(b.reportPeriodStart) || toFollowUpIsoDate(b.reportDate);
    if (startA !== startB) return startA.localeCompare(startB);

    const endA = toFollowUpIsoDate(a.reportPeriodEnd) || toFollowUpIsoDate(a.reportDate);
    const endB = toFollowUpIsoDate(b.reportPeriodEnd) || toFollowUpIsoDate(b.reportDate);
    if (endA !== endB) return endA.localeCompare(endB);

    const dateA = toFollowUpIsoDate(a.reportDate);
    const dateB = toFollowUpIsoDate(b.reportDate);
    if (dateA !== dateB) return dateA.localeCompare(dateB);

    return a.id - b.id;
  });

  const parsedEntries = sorted.map(report => ({
    report,
    details: parseFollowUpDetails(report.followUpDetails) ?? {},
    reportDate: toFollowUpIsoDate(report.reportDate),
    periodStart: toFollowUpIsoDate(report.reportPeriodStart),
    periodEnd: toFollowUpIsoDate(report.reportPeriodEnd),
  }));

  const startDates = parsedEntries.map(e => e.periodStart || e.reportDate).filter(Boolean).sort();
  const endDates = parsedEntries.map(e => e.periodEnd || e.reportDate).filter(Boolean).sort();

  const reportPeriodStart = startDates[0] || toFollowUpIsoDate(new Date());
  const reportPeriodEnd = endDates[endDates.length - 1] || reportPeriodStart;
  const reportDate = options?.reportDate || toFollowUpIsoDate(new Date());

  let plannedProgress: number | undefined;
  let actualProgress: number | undefined;
  for (const { report } of parsedEntries) {
    if (typeof report.plannedProgress === "number" && !Number.isNaN(report.plannedProgress)) {
      plannedProgress = report.plannedProgress;
    }
    if (typeof report.actualProgress === "number" && !Number.isNaN(report.actualProgress)) {
      actualProgress = report.actualProgress;
    }
  }

  const mergedDetails: FollowUpReportDetails = {};

  const scalarKeys = [
    "timeIndicator",
    "costIndicator",
    "changeIndicator",
    "overallTrend",
    "amountSpent",
    "approvedBudget",
  ] as const;

  for (const key of scalarKeys) {
    for (const { details } of parsedEntries) {
      const value = details[key]?.trim();
      if (value) mergedDetails[key] = value;
    }
  }

  if (parsedEntries.some(({ details }) => details.escalation === true)) {
    mergedDetails.escalation = true;
  }

  for (const [fieldKey] of followUpTextFields) {
    const blocks: string[] = [];
    for (const entry of parsedEntries) {
      const value = entry.details[fieldKey]?.trim();
      if (!value) continue;
      const periodLabel = entry.periodStart && entry.periodEnd
        ? `${formatArabicShortDate(entry.periodStart)} - ${formatArabicShortDate(entry.periodEnd)}`
        : formatArabicShortDate(entry.reportDate);
      const header = periodLabel
        ? `[${entry.report.reportNumber} | ${periodLabel}]`
        : `[${entry.report.reportNumber}]`;
      blocks.push(`${header}\n${value}`);
    }
    if (blocks.length > 0) {
      mergedDetails[fieldKey] = blocks.join("\n\n");
    }
  }

  // Merge milestones: deduplicate by title and keep the latest state while preserving non-empty fields
  const mergedMilestones: Record<string, string>[] = [];
  const milestoneIndexByTitle = new Map<string, number>();
  const untitledMilestoneSignatures = new Set<string>();

  for (const { details } of parsedEntries) {
    for (const rawRow of details.milestones ?? []) {
      const cleaned = cleanRecordRow(rawRow);
      if (Object.keys(cleaned).length === 0) continue;
      const titleKey = normalizeTextKey(cleaned.title);
      if (titleKey) {
        const existingIndex = milestoneIndexByTitle.get(titleKey);
        if (existingIndex === undefined) {
          milestoneIndexByTitle.set(titleKey, mergedMilestones.length);
          mergedMilestones.push(cleaned);
        } else {
          mergedMilestones[existingIndex] = {
            ...mergedMilestones[existingIndex],
            ...cleaned,
          };
        }
      } else {
        const sig = rowSignature(cleaned);
        if (!untitledMilestoneSignatures.has(sig)) {
          untitledMilestoneSignatures.add(sig);
          mergedMilestones.push(cleaned);
        }
      }
    }
  }
  if (mergedMilestones.length > 0) mergedDetails.milestones = mergedMilestones;

  // Merge deviations, risks, correctiveActions: append in chronological order with exact deduplication
  const simpleTableKeys = ["deviations", "risks", "correctiveActions"] as const;
  for (const tableKey of simpleTableKeys) {
    const mergedRows: Record<string, string>[] = [];
    const seen = new Set<string>();
    for (const { details } of parsedEntries) {
      for (const rawRow of details[tableKey] ?? []) {
        const cleaned = cleanRecordRow(rawRow);
        if (Object.keys(cleaned).length === 0) continue;
        const sig = rowSignature(cleaned);
        if (!seen.has(sig)) {
          seen.add(sig);
          mergedRows.push(cleaned);
        }
      }
    }
    if (mergedRows.length > 0) mergedDetails[tableKey] = mergedRows;
  }

  // Merge links: deduplicate by URL (keeping latest title) or title+url
  const mergedLinks: { title?: string; url?: string }[] = [];
  const linkIndexByUrl = new Map<string, number>();
  const seenLinkSignatures = new Set<string>();
  for (const { details } of parsedEntries) {
    for (const rawLink of details.links ?? []) {
      const title = rawLink.title?.trim() || undefined;
      const url = rawLink.url?.trim() || undefined;
      if (!title && !url) continue;
      if (url) {
        const urlKey = url.toLowerCase();
        const existingIndex = linkIndexByUrl.get(urlKey);
        if (existingIndex === undefined) {
          linkIndexByUrl.set(urlKey, mergedLinks.length);
          mergedLinks.push({ ...(title ? { title } : {}), url });
        } else if (title) {
          mergedLinks[existingIndex] = { ...mergedLinks[existingIndex], title, url };
        }
      } else {
        const sig = normalizeTextKey(title);
        if (!seenLinkSignatures.has(sig)) {
          seenLinkSignatures.add(sig);
          mergedLinks.push({ title });
        }
      }
    }
  }
  if (mergedLinks.length > 0) mergedDetails.links = mergedLinks;

  mergedDetails.sourceReports = parsedEntries.map(entry => ({
    id: entry.report.id,
    reportNumber: entry.report.reportNumber,
    ...(entry.reportDate ? { reportDate: entry.reportDate } : {}),
    ...(entry.periodStart ? { reportPeriodStart: entry.periodStart } : {}),
    ...(entry.periodEnd ? { reportPeriodEnd: entry.periodEnd } : {}),
    plannedProgress: entry.report.plannedProgress ?? null,
    actualProgress: entry.report.actualProgress ?? null,
  }));

  // Merge attachments without duplicates
  const mergedAttachments: MergedFollowUpAttachment[] = [];
  const seenAttachments = new Set<string>();
  for (const { report } of parsedEntries) {
    for (const file of parseAttachmentList(report.attachments)) {
      const dataHead = typeof file.fileData === "string" ? file.fileData.slice(0, 64) : "";
      const dataLen = typeof file.fileData === "string" ? file.fileData.length : 0;
      const key = `${file.mimeType || ""}|${normalizeTextKey(file.fileName)}|${file.size || 0}|${dataLen}|${dataHead}`;
      if (!seenAttachments.has(key)) {
        seenAttachments.add(key);
        mergedAttachments.push(file);
      }
    }
  }

  return {
    projectId: sorted[0].projectId,
    reportDate,
    reportPeriodStart,
    reportPeriodEnd,
    plannedProgress,
    actualProgress,
    followUpDetails: mergedDetails,
    attachments: mergedAttachments,
  };
}
