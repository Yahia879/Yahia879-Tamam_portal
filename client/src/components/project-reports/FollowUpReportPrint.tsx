import { ArrowRight, Printer } from "lucide-react";
import { STAGE_LABELS } from "@shared/constants";
import {
  FOLLOW_UP_REPORT_TITLE, followUpIndicators, followUpTableKeys, followUpTables, followUpTextFields,
} from "@shared/followUpReport";
import { Button } from "@/components/ui/button";
import { followUpAttachments, followUpDateValue, type SavedReport } from "@/pages/FollowUpReportPage";

interface Props {
  report: SavedReport;
  organization?: { logoUrl?: string | null; officialReportsName?: string | null } | null;
  onBack: () => void;
  onPrint: () => void;
}

export function FollowUpReportPrint({ report, organization, onBack, onPrint }: Props) {
  const details = report.followUpDetails ?? {};
  const attachments = followUpAttachments(report.attachments);
  const phase = report.projectStage;
  const values = [
    ["المشروع", report.projectName],
    ["مدير المشروع", report.projectManagerName],
    ["مرحلة المشروع", phase ? STAGE_LABELS[phase] || phase : null],
    ["تاريخ التقرير", followUpDateValue(report.reportDate)],
    ["بداية الفترة (من)", followUpDateValue(report.reportPeriodStart)],
    ["نهاية الفترة (إلى)", followUpDateValue(report.reportPeriodEnd)],
    ["الإنجاز المخطط", report.plannedProgress == null ? null : `${report.plannedProgress}٪`],
    ["الإنجاز الفعلي", report.actualProgress == null ? null : `${report.actualProgress}٪`],
    ["فرق الإنجاز", report.variance == null ? null : `${report.variance}٪`],
    ...followUpIndicators.map(([key, label]) => [label, details[key]]),
    ["اتجاه الأداء", details.overallTrend],
    ["المصروف التراكمي", details.amountSpent],
    ["الميزانية المعتمدة", details.approvedBudget],
    ...followUpTextFields.map(([key, label]) => [label, details[key]]),
  ].filter(([, value]) => value?.trim());

  return (
    <main dir="rtl" className="min-h-screen bg-slate-100 p-4 text-slate-900 sm:p-8 print:bg-white print:p-0">
      <style>{`@media print { @page { size: A4 portrait; margin: 12mm; } }`}</style>
      <div className="mx-auto mb-4 flex max-w-3xl justify-between gap-3 print:hidden">
        <Button variant="outline" onClick={onBack}><ArrowRight className="size-4" /> العودة</Button>
        <Button onClick={onPrint}><Printer className="size-4" /> طباعة / حفظ PDF</Button>
      </div>
      <article className="mx-auto max-w-3xl space-y-5 rounded-lg bg-white p-5 shadow sm:p-8 print:max-w-none print:p-0 print:shadow-none">
        <header className="flex items-center gap-4 border-b border-slate-300 pb-4">
          {organization?.logoUrl && <img src={organization.logoUrl} alt="شعار الجمعية" className="h-14 w-auto max-w-28 object-contain" />}
          <div>
            <div className="text-sm text-slate-600">{organization?.officialReportsName || "جمعية عمارة المساجد (تمام)"}</div>
            <h1 className="text-2xl font-bold">{FOLLOW_UP_REPORT_TITLE}</h1>
            <div className="text-sm text-slate-600" dir="ltr">{report.reportNumber}</div>
            {report.status === "draft" && <div className="text-xs text-slate-600">مسودة</div>}
          </div>
        </header>
        <dl className="divide-y divide-slate-200">
          {values.map(([label, value]) => (
            <div key={label} className="grid gap-1 py-2 sm:grid-cols-[1fr_2fr]">
              <dt className="text-sm font-semibold">{label}</dt>
              <dd className="whitespace-pre-wrap break-words text-sm">{value}</dd>
            </div>
          ))}
        </dl>
        {followUpTableKeys.map(key => {
          const rows = details[key];
          if (!rows?.length) return null;
          const { title, columns } = followUpTables[key];
          const populatedColumns = columns.filter(column => rows.some(row => row[column.key as keyof typeof row]));
          if (!populatedColumns.length) return null;
          return (
            <div key={key}>
              <h2 className="mb-2 text-sm font-bold">{title}</h2>
              <table className="w-full table-fixed border-collapse text-sm">
                <thead><tr>{populatedColumns.map(column => <th key={column.key} className="border border-slate-200 px-2 py-1 text-right">{column.label}</th>)}</tr></thead>
                <tbody>
                  {rows.map((row, index) => (
                    <tr key={index} className="break-inside-avoid">
                      {populatedColumns.map(column => <td key={column.key} className="break-words border border-slate-200 px-2 py-1">{row[column.key as keyof typeof row]}</td>)}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        })}
        {details.escalation !== undefined && <p className="text-sm"><strong>التصعيد الإداري</strong> {details.escalation ? "نعم" : "لا"}</p>}
        {attachments.length > 0 && (
          <div>
            <h2 className="mb-2 text-sm font-bold">المرفقات والوثائق</h2>
            <ul className="space-y-3">
              {attachments.map((file, index) => (
                <li key={index} className="break-inside-avoid text-sm">
                  <div>{file.fileName}</div>
                  {/^image\/(?:png|jpeg|webp|gif)$/.test(file.mimeType) && file.fileData && (
                    <img src={`data:${file.mimeType};base64,${file.fileData}`} alt={file.fileName} className="mt-1 max-h-52 max-w-full object-contain" />
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}
      </article>
    </main>
  );
}
