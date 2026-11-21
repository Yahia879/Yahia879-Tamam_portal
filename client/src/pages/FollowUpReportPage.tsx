import { useState, type FormEvent } from "react";
import { useLocation, useSearch } from "wouter";
import { format } from "date-fns";
import { toast } from "sonner";
import type { inferRouterOutputs } from "@trpc/server";
import type { AppRouter } from "../../../server/routers";
import {
  FOLLOW_UP_REPORT_TITLE, followUpIndicators, followUpReportDetailsSchema,
  followUpTableKeys, followUpTables, followUpTextFields, isFollowUpReport,
  type FollowUpReportDetails,
} from "@shared/followUpReport";
import { STAGE_LABELS } from "@shared/constants";
import DashboardLayout from "@/components/DashboardLayout";
import { ProjectSearchSelect } from "@/components/ProjectSearchSelect";
import { FileUpload, type UploadedFile } from "@/components/FileUpload";
import { DynamicArrayTable } from "@/components/project-reports/DynamicArrayTable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";

export type SavedReport = NonNullable<inferRouterOutputs<AppRouter>["progressReports"]["getById"]>;

export function followUpDateValue(value?: string | Date | null) {
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return value?.slice(0, 10) || "";
}

export function followUpAttachments(value?: string | null): UploadedFile[] {
  try {
    const files = JSON.parse(value || "[]");
    return Array.isArray(files) ? files : [];
  } catch {
    return [];
  }
}

function FollowUpForm({ existing }: { existing?: SavedReport }) {
  const [, navigate] = useLocation();
  const utils = trpc.useUtils();
  const { data: projectData, isLoading: loadingProjects } = trpc.projects.getAll.useQuery();
  const create = trpc.progressReports.create.useMutation();
  const update = trpc.progressReports.update.useMutation();
  const saving = create.isPending || update.isPending;
  const [projectId, setProjectId] = useState(existing ? String(existing.projectId) : "");
  const [reportDate, setReportDate] = useState(followUpDateValue(existing?.reportDate) || format(new Date(), "yyyy-MM-dd"));
  const [from, setFrom] = useState(followUpDateValue(existing?.reportPeriodStart));
  const [to, setTo] = useState(followUpDateValue(existing?.reportPeriodEnd));
  const [planned, setPlanned] = useState(existing?.plannedProgress?.toString() ?? "");
  const [actual, setActual] = useState(existing?.actualProgress?.toString() ?? "");
  const [details, setDetails] = useState<FollowUpReportDetails>(existing?.followUpDetails ?? {});
  const [attachments, setAttachments] = useState(() => followUpAttachments(existing?.attachments));

  const projectOptions = (projectData ?? []).map(project => ({
    ...project,
    name: project.name || `مشروع رقم ${project.projectNumber}`,
  }));
  const project = projectOptions.find(item => String(item.id) === projectId);
  const manager = project?.managerName || existing?.projectManagerName;
  const stage = project?.requestStage || project?.status || existing?.projectStage;
  const phase = stage ? STAGE_LABELS[stage] || stage : "";
  const gap = planned !== "" && actual !== "" ? Number(actual) - Number(planned) : null;

  function changeDetail<K extends keyof FollowUpReportDetails>(key: K, value: FollowUpReportDetails[K]) {
    setDetails(current => ({ ...current, [key]: value }));
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    if (!projectId) {
      toast.error("يرجى اختيار المشروع.");
      return;
    }
    if (!reportDate || !from || !to || to < from) {
      toast.error("يرجى إدخال تاريخ التقرير وفترة صحيحة.");
      return;
    }
    const cleanDetails = {
      ...details,
      ...Object.fromEntries(followUpTableKeys.map(key => [
        key,
        (details[key] ?? [])
          .filter(row => Object.values(row).some(value => value?.trim()))
          .map(row => Object.fromEntries(Object.entries(row).filter(([, value]) => value?.trim()))),
      ])),
    };
    const parsed = followUpReportDetailsSchema.safeParse(cleanDetails);
    if (!parsed.success) {
      toast.error(parsed.error.issues.some(issue => issue.path[0] === "links")
        ? "يجب أن يبدأ الرابط بـ http:// أو https://."
        : "يرجى التحقق من القيم المدخلة.");
      return;
    }
    const payload = {
      reportDate,
      reportPeriodStart: from,
      reportPeriodEnd: to,
      plannedProgress: planned === "" ? undefined : Number(planned),
      actualProgress: actual === "" ? undefined : Number(actual),
      overallProgress: actual === "" ? undefined : Number(actual),
      followUpDetails: parsed.data,
      attachments: attachments.length ? JSON.stringify(attachments) : "",
    };
    try {
      if (existing) {
        await update.mutateAsync({ ...payload, id: existing.id });
      } else {
        await create.mutateAsync({ ...payload, projectId: Number(projectId) });
      }
      if (existing) void utils.progressReports.getById.invalidate({ id: existing.id });
      void utils.progressReports.list.invalidate();
      toast.success("تم حفظ تقرير المتابعة.");
      navigate("/project-reports");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "تعذّر حفظ التقرير.");
    }
  }

  return (
    <form onSubmit={save} dir="rtl" className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="space-y-1.5">
          <Label htmlFor="follow-up-project">المشروع *</Label>
          <ProjectSearchSelect
            id="follow-up-project"
            projects={projectOptions}
            value={projectId}
            onValueChange={setProjectId}
            disabled={Boolean(existing)}
            isLoading={loadingProjects}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="follow-up-manager">مدير المشروع</Label>
          <Input id="follow-up-manager" value={manager || ""} readOnly />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="follow-up-stage">مرحلة المشروع</Label>
          <Input id="follow-up-stage" value={phase} readOnly />
        </div>
        {([
          ["report-date", "تاريخ التقرير", reportDate, setReportDate],
          ["from", "بداية الفترة (من)", from, setFrom],
          ["to", "نهاية الفترة (إلى)", to, setTo],
        ] as const).map(([id, label, value, onChange]) => (
          <div key={id} className="space-y-1.5">
            <Label htmlFor={`follow-up-${id}`}>{label} *</Label>
            <Input id={`follow-up-${id}`} type="date" value={value}
              onChange={event => onChange(event.target.value)} min={id === "to" ? from : undefined} required />
          </div>
        ))}
        <div className="space-y-1.5">
          <Label htmlFor="follow-up-planned">الإنجاز المخطط %</Label>
          <Input id="follow-up-planned" type="number" min={0} max={100} value={planned} onChange={event => setPlanned(event.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="follow-up-actual">الإنجاز الفعلي %</Label>
          <Input id="follow-up-actual" type="number" min={0} max={100} value={actual} onChange={event => setActual(event.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="follow-up-gap">فرق الإنجاز</Label>
          <Input id="follow-up-gap" value={gap === null ? "" : `${gap}٪`} readOnly />
        </div>
        {followUpIndicators.map(([key, label]) => (
          <div key={key} className="space-y-1.5">
            <Label htmlFor={key}>{label}</Label>
            <select id={key} value={details[key] ?? ""} onChange={event => changeDetail(key, event.target.value)}
              className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm">
              <option value="">اختر مؤشرًا</option>
              <option>أخضر</option>
              <option>أصفر</option>
              <option>أحمر</option>
            </select>
          </div>
        ))}
        <div className="space-y-1.5">
          <Label htmlFor="overallTrend">اتجاه الأداء</Label>
          <select id="overallTrend" value={details.overallTrend ?? ""}
            onChange={event => changeDetail("overallTrend", event.target.value)}
            className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm">
            <option value="">اختر اتجاهًا</option>
            <option>متحسّن</option>
            <option>ثابت</option>
            <option>متراجع</option>
          </select>
        </div>
        {([["amountSpent", "المصروف التراكمي"], ["approvedBudget", "الميزانية المعتمدة"]] as const).map(([key, label]) => (
          <div key={key} className="space-y-1.5">
            <Label htmlFor={key}>{label}</Label>
            <Input id={key} type="number" min={0} step="0.01" value={details[key] ?? ""}
              onChange={event => changeDetail(key, event.target.value || undefined)} />
          </div>
        ))}
        {followUpTextFields.map(([key, label]) => (
          <div key={key} className="space-y-1.5 sm:col-span-2 lg:col-span-1">
            <Label htmlFor={key}>{label}</Label>
            <Textarea id={key} value={details[key] ?? ""} onChange={event => changeDetail(key, event.target.value)} />
          </div>
        ))}
      </div>
      {followUpTableKeys.map(key => (
        <DynamicArrayTable key={key} title={followUpTables[key].title}
          columns={[...followUpTables[key].columns]} rows={details[key] ?? []}
          onChange={rows => setDetails(current => ({ ...current, [key]: rows }))} />
      ))}
      <div className="space-y-1.5">
        <Label htmlFor="follow-up-escalation">التصعيد الإداري</Label>
        <select id="follow-up-escalation" value={details.escalation?.toString() ?? ""}
          onChange={event => changeDetail("escalation", event.target.value === "" ? undefined : event.target.value === "true")}
          className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm sm:w-auto">
          <option value="">اختر حالة التصعيد</option>
          <option value="true">نعم</option>
          <option value="false">لا</option>
        </select>
      </div>
      <FileUpload label="المرفقات والوثائق" existingFiles={attachments} onFilesSelected={setAttachments} disabled={saving} />
      <div className="flex justify-end border-t pt-4">
        <Button type="submit" disabled={saving}>{saving ? "جارٍ الحفظ…" : "حفظ تقرير المتابعة"}</Button>
      </div>
    </form>
  );
}

export default function FollowUpReportPage({ showLayout = true }: { showLayout?: boolean }) {
  const search = useSearch();
  const editId = showLayout ? Number(new URLSearchParams(search).get("editId")) : 0;
  const { data: report, isPending } = trpc.progressReports.getById.useQuery({ id: editId }, { enabled: editId > 0 });

  if (!showLayout) return <FollowUpForm />;

  return (
    <DashboardLayout tabletNavigation>
      <div className="space-y-5" dir="rtl">
        <h1 className="text-xl font-bold">{FOLLOW_UP_REPORT_TITLE}</h1>
        {editId > 0 && isPending ? <p>جارٍ تحميل التقرير…</p>
          : editId > 0 && (!report || !isFollowUpReport(report)) ? <p>تعذّر العثور على تقرير المتابعة.</p>
          : <FollowUpForm key={report?.id ?? "new"} existing={report ?? undefined} />}
      </div>
    </DashboardLayout>
  );
}
