import { ArrowRight, Printer } from "lucide-react";
import type { ReactNode } from "react";
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

function printDate(value: string | Date | null) {
  const date = followUpDateValue(value);
  if (!date) return "";
  const [year, month, day] = date.split("-");
  return `${Number(day)}/${Number(month)}/${year}`;
}

function PrintSection({ title, children, projectDetails = false }: {
  title: string;
  children: ReactNode;
  projectDetails?: boolean;
}) {
  return (
    <section className="space-y-3">
      <h2 className={`break-after-avoid-page rounded px-4 py-2 text-sm font-bold sm:text-base ${
        projectDetails ? "bg-[#d4a574] text-[#5d4037]" : "bg-[#1a5f4a] text-white"
      }`}>{title}</h2>
      {children}
    </section>
  );
}

function PrintValues({ title, values, projectDetails }: {
  title: string;
  values: readonly (readonly [string, string | null | undefined])[];
  projectDetails?: boolean;
}) {
  const filled = values.filter(([, value]) => value?.trim());
  if (!filled.length) return null;
  return (
    <PrintSection title={title} projectDetails={projectDetails}>
      <table className="w-full table-fixed border-collapse text-xs sm:text-sm">
        <tbody>
          {filled.map(([label, value]) => (
            <tr key={label} className="break-inside-avoid border-b border-slate-200">
              <th scope="row" className="w-2/5 bg-slate-50 px-3 py-2.5 text-right align-top font-semibold text-slate-700 sm:w-52">
                {label}
              </th>
              <td className="whitespace-pre-wrap break-words px-3 py-2.5">{value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </PrintSection>
  );
}

export function FollowUpReportPrint({ report, organization, onBack, onPrint }: Props) {
  const details = report.followUpDetails ?? {};
  const attachments = followUpAttachments(report.attachments);
  const phase = report.projectStage;
  const statusLabel = report.status === "draft" ? "مسودة" : report.status === "approved" ? "معتمد" : null;

  return (
    <main dir="rtl" className="follow-up-print min-h-screen bg-slate-100 p-4 text-slate-900 sm:p-8 dark:bg-slate-950 print:bg-white print:p-0">
      <style>{`
        .follow-up-print { font-family: 'Cairo', system-ui, sans-serif; }
        @media print {
          @page { size: A4 portrait; margin: 10mm 8mm; }
          .follow-up-print { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .follow-up-print h2 { break-after: avoid; }
        }
      `}</style>
      <div className="mx-auto mb-4 flex w-full max-w-[210mm] gap-2 print:hidden">
        <Button variant="outline" onClick={onBack} className="gap-2 text-xs font-bold shadow-sm">
          <ArrowRight className="size-4" /> رجوع
        </Button>
        <Button onClick={onPrint} className="gap-2 bg-[#1a5f4a] text-xs font-bold text-white shadow-sm hover:bg-[#154d3c]">
          <Printer className="size-4" /> طباعة التقرير / PDF
        </Button>
      </div>
      <article className="mx-auto w-full max-w-[210mm] space-y-6 rounded-xl bg-white p-4 shadow-sm sm:p-8 print:max-w-none print:space-y-4 print:rounded-none print:p-0 print:shadow-none">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between print:flex-row print:justify-between">
          <div className="flex items-center gap-3">
            {organization?.logoUrl
              ? <img src={organization.logoUrl} alt="شعار الجمعية" className="h-14 w-auto max-w-28 object-contain" />
              : <span className="grid size-14 shrink-0 place-items-center rounded-lg bg-[#1a5f4a]/10 text-xl font-bold text-[#1a5f4a]">تمام</span>}
            <div>
              <div className="text-base font-bold text-[#1a5f4a]">{organization?.officialReportsName || "جمعية عمارة المساجد (تمام)"}</div>
              <div className="text-xs font-semibold text-slate-600">إدارة المشاريع والهندسة والصيانة</div>
            </div>
          </div>
          <dl className="space-y-1 text-xs">
            <div className="flex gap-2">
              <dt className="font-bold text-slate-600">تاريخ التقرير</dt>
              <dd className="border-b border-dotted border-slate-400 px-2 font-semibold"><bdi>{printDate(report.reportDate)}</bdi></dd>
            </div>
            <div className="flex gap-2">
              <dt className="font-bold text-slate-600">رقم التقرير</dt>
              <dd className="border-b border-dotted border-slate-400 px-2 font-mono font-bold text-[#1a5f4a]"><bdi>{report.reportNumber}</bdi></dd>
            </div>
          </dl>
        </header>
        <h1 className="rounded-lg bg-[#1a5f4a] px-6 py-4 text-center text-xl font-bold text-white sm:text-2xl">
          {FOLLOW_UP_REPORT_TITLE}
        </h1>
        <PrintValues title="بيانات المشروع العامة" projectDetails values={[
          ["المشروع", report.projectName],
          ["مدير المشروع", report.projectManagerName],
          ["مرحلة المشروع", phase ? STAGE_LABELS[phase] || phase : null],
          ["بداية الفترة (من)", printDate(report.reportPeriodStart)],
          ["نهاية الفترة (إلى)", printDate(report.reportPeriodEnd)],
          ["حالة التقرير", statusLabel],
          ["التقارير المدمجة", details.sourceReports?.length ? `مدمج من ${details.sourceReports.length} تقارير متابعة معتمدة` : null],
        ]} />
        {details.sourceReports && details.sourceReports.length > 0 && (
          <PrintSection title="التقارير المدمجة (المصادر وتطور الإنجاز)">
            <table className="w-full table-fixed border-collapse text-xs sm:text-sm">
              <thead className="bg-slate-100">
                <tr>
                  <th scope="col" className="border border-slate-200 px-3 py-2 text-right">رقم التقرير</th>
                  <th scope="col" className="border border-slate-200 px-3 py-2 text-right">بداية الفترة</th>
                  <th scope="col" className="border border-slate-200 px-3 py-2 text-right">نهاية الفترة</th>
                  <th scope="col" className="border border-slate-200 px-3 py-2 text-right">تاريخ التقرير</th>
                  <th scope="col" className="border border-slate-200 px-3 py-2 text-right">المخطط</th>
                  <th scope="col" className="border border-slate-200 px-3 py-2 text-right">الفعلي</th>
                </tr>
              </thead>
              <tbody>
                {details.sourceReports.map(source => (
                  <tr key={source.id} className="break-inside-avoid">
                    <td className="break-words border border-slate-200 px-3 py-2 font-mono font-bold text-[#1a5f4a]">
                      <bdi>{source.reportNumber}</bdi>
                    </td>
                    <td className="border border-slate-200 px-3 py-2">{printDate(source.reportPeriodStart ?? null) || "—"}</td>
                    <td className="border border-slate-200 px-3 py-2">{printDate(source.reportPeriodEnd ?? null) || "—"}</td>
                    <td className="border border-slate-200 px-3 py-2">{printDate(source.reportDate ?? null) || "—"}</td>
                    <td className="border border-slate-200 px-3 py-2">
                      {source.plannedProgress == null ? "—" : `${source.plannedProgress}٪`}
                    </td>
                    <td className="border border-slate-200 px-3 py-2">
                      {source.actualProgress == null ? "—" : `${source.actualProgress}٪`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </PrintSection>
        )}
        <PrintValues title="حالة التقدم ونسبة الإنجاز" values={[
          ["الإنجاز المخطط", report.plannedProgress == null ? null : `${report.plannedProgress}٪`],
          ["الإنجاز الفعلي", report.actualProgress == null ? null : `${report.actualProgress}٪`],
          ["فرق الإنجاز", report.variance == null ? null : `${report.variance}٪`],
        ]} />
        <PrintValues title="المؤشرات التشغيلية والمالية" values={[
          ...followUpIndicators.map(([key, label]) => [label, details[key]] as const),
          ["اتجاه الأداء", details.overallTrend],
          ["المصروف التراكمي", details.amountSpent],
          ["الميزانية المعتمدة", details.approvedBudget],
        ]} />
        <PrintValues title="ملخص الأعمال والتوصيات" values={followUpTextFields.map(([key, label]) => [label, details[key]])} />
        {followUpTableKeys.map(key => {
          const rows = details[key];
          if (!rows?.length) return null;
          const { title, columns } = followUpTables[key];
          const populatedColumns = columns.filter(column => rows.some(row => row[column.key as keyof typeof row]));
          if (!populatedColumns.length) return null;
          return (
            <PrintSection key={key} title={title}>
              <table className="w-full table-fixed border-collapse text-xs sm:text-sm">
                <thead className="bg-slate-100">
                  <tr>{populatedColumns.map(column => <th key={column.key} scope="col" className="border border-slate-200 px-3 py-2 text-right">{column.label}</th>)}</tr>
                </thead>
                <tbody>
                  {rows.map((row, index) => (
                    <tr key={index} className="break-inside-avoid">
                      {populatedColumns.map(column => <td key={column.key} className="break-words border border-slate-200 px-3 py-2">{row[column.key as keyof typeof row]}</td>)}
                    </tr>
                  ))}
                </tbody>
              </table>
            </PrintSection>
          );
        })}
        {attachments.length > 0 && (
          <PrintSection title="المرفقات والوثائق">
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
          </PrintSection>
        )}
      </article>
    </main>
  );
}
