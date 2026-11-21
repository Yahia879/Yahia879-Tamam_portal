import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { Link, useLocation, useSearch } from "wouter";
import { format } from "date-fns";
import { ArrowRight, CheckCircle2, GitMerge, Info, Loader2, Save } from "lucide-react";
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
import { RagIndicatorSelect } from "@/components/project-reports/RagIndicatorSelect";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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

function ReportFormCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Card className="min-w-0 gap-0 border-border/80 shadow-xs">
      <CardHeader className="border-b border-border/60 px-4 pb-3 sm:px-6">
        <CardTitle className="flex items-center gap-2 text-base font-bold text-foreground">
          <span className="size-2.5 shrink-0 rounded-full bg-teal-600" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="min-w-0 space-y-5 px-4 pt-5 sm:px-6">{children}</CardContent>
    </Card>
  );
}

function ReportField({ id, label, required, children }: {
  id: string;
  label: string;
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="min-w-0 space-y-1.5">
      <Label htmlFor={id} className="text-xs font-semibold">
        {label}
        {required && <span aria-hidden="true" className="font-bold text-red-500">*</span>}
      </Label>
      {children}
    </div>
  );
}

function formatShortDateAr(value?: string | null) {
  if (!value) return "—";
  const iso = value.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return value;
  const [year, month, day] = iso.split("-");
  return `${Number(day)}/${Number(month)}/${year}`;
}

interface FollowUpDraftFields {
  reportDate: string;
  from: string;
  to: string;
  planned: string;
  actual: string;
  details: FollowUpReportDetails;
  attachments: UploadedFile[];
}

function FollowUpForm({ existing, mergeMode = false }: { existing?: SavedReport; mergeMode?: boolean }) {
  const [, navigate] = useLocation();
  const utils = trpc.useUtils();
  const { data: projectData, isLoading: loadingProjects } = trpc.projects.getAll.useQuery();
  const create = trpc.progressReports.create.useMutation();
  const update = trpc.progressReports.update.useMutation();
  const previewMerge = trpc.progressReports.previewFollowUpMerge.useMutation();
  const saving = create.isPending || update.isPending;
  const busy = saving || previewMerge.isPending;
  const mergeInFlight = useRef(false);
  const draftBeforeMerge = useRef<FollowUpDraftFields | null>(null);
  const reviewHeading = useRef<HTMLHeadingElement>(null);
  const [projectId, setProjectId] = useState(existing ? String(existing.projectId) : "");
  const [reportDate, setReportDate] = useState(followUpDateValue(existing?.reportDate) || format(new Date(), "yyyy-MM-dd"));
  const [from, setFrom] = useState(followUpDateValue(existing?.reportPeriodStart));
  const [to, setTo] = useState(followUpDateValue(existing?.reportPeriodEnd));
  const [planned, setPlanned] = useState(existing?.plannedProgress?.toString() ?? "");
  const [actual, setActual] = useState(existing?.actualProgress?.toString() ?? "");
  const [details, setDetails] = useState<FollowUpReportDetails>(existing?.followUpDetails ?? {});
  const [{ files: attachments, revision: attachmentRevision }, setAttachmentState] = useState(() => ({
    files: followUpAttachments(existing?.attachments),
    revision: 0,
  }));

  const [selectedSourceIds, setSelectedSourceIds] = useState<number[]>([]);
  const numericProjectId = Number(projectId) || 0;
  const selectingSources = mergeMode && !existing && !details.sourceReports?.length;
  const reviewingMerge = mergeMode && !selectingSources;
  const { data: approvedReports, isLoading: loadingApproved, isError: cannotLoadApproved } =
    trpc.progressReports.listApprovedFollowUps.useQuery(
      { projectId: numericProjectId },
      { enabled: selectingSources && numericProjectId > 0 }
    );
  const approvedFollowUps = approvedReports?.filter(item => item.projectId === numericProjectId) ?? [];
  const selectedApprovedIds = approvedFollowUps.filter(item => selectedSourceIds.includes(item.id)).map(item => item.id);

  useEffect(() => {
    if (reviewingMerge) reviewHeading.current?.focus();
  }, [reviewingMerge]);

  function handleProjectChange(nextProjectId: string) {
    if (busy || mergeInFlight.current || draftBeforeMerge.current || nextProjectId === projectId) return;
    setProjectId(nextProjectId);
    setSelectedSourceIds([]);
  }

  function applyDraft(draft: FollowUpDraftFields) {
    setReportDate(draft.reportDate);
    setFrom(draft.from);
    setTo(draft.to);
    setPlanned(draft.planned);
    setActual(draft.actual);
    setDetails(draft.details);
    setAttachmentState(current => ({ files: draft.attachments, revision: current.revision + 1 }));
  }

  function returnToSources() {
    if (busy || mergeInFlight.current || !draftBeforeMerge.current) return;
    applyDraft(draftBeforeMerge.current);
    draftBeforeMerge.current = null;
  }

  function toggleSourceSelection(id: number) {
    setSelectedSourceIds(current =>
      current.includes(id) ? current.filter(item => item !== id) : [...current, id]
    );
  }

  async function previewSelectedReports() {
    if (!selectingSources || busy || mergeInFlight.current || !numericProjectId || selectedApprovedIds.length < 2) return;
    mergeInFlight.current = true;
    try {
      const merged = await previewMerge.mutateAsync({
        projectId: numericProjectId,
        reportIds: selectedApprovedIds,
      });
      draftBeforeMerge.current ??= { reportDate, from, to, planned, actual, details, attachments };
      applyDraft({
        reportDate: merged.reportDate,
        from: merged.reportPeriodStart,
        to: merged.reportPeriodEnd,
        planned: merged.plannedProgress?.toString() ?? "",
        actual: merged.actualProgress?.toString() ?? "",
        details: merged.followUpDetails,
        attachments: merged.attachments,
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "تعذّر قراءة ودمج التقارير.");
    } finally {
      mergeInFlight.current = false;
    }
  }

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
    if (busy || mergeInFlight.current) return;
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

  function renderTable(key: keyof typeof followUpTables) {
    const { title, columns } = followUpTables[key];
    return (
      <DynamicArrayTable key={key} title={title}
        columns={[...columns]} rows={details[key] ?? []}
        onChange={rows => setDetails(current => ({ ...current, [key]: rows }))} />
    );
  }

  const projectField = (
    <ReportField id="follow-up-project" label="المشروع" required>
      <ProjectSearchSelect
        id="follow-up-project"
        projects={projectOptions}
        value={projectId}
        onValueChange={handleProjectChange}
        disabled={Boolean(existing || details.sourceReports?.length) || busy}
        isLoading={loadingProjects}
      />
    </ReportField>
  );

  if (selectingSources) {
    return (
      <ReportFormCard title="اختيار التقارير">
        {projectField}
        {numericProjectId > 0 && (
          <div className="space-y-3 border-t border-border/60 pt-4">
            <h3 className="text-sm font-bold">تقارير المتابعة المعتمدة</h3>
            {loadingApproved ? (
              <p role="status" className="text-sm text-muted-foreground">جارٍ تحميل تقارير المشروع…</p>
            ) : cannotLoadApproved ? (
              <p role="alert" className="text-sm text-destructive">تعذّر تحميل تقارير المشروع.</p>
            ) : approvedFollowUps.length === 0 ? (
              <p className="text-sm text-muted-foreground">لا توجد تقارير متابعة معتمدة لهذا المشروع.</p>
            ) : (
              <>
                <div role="group" aria-label="تقارير المتابعة المعتمدة" className="grid max-h-80 gap-2 overflow-y-auto p-1 sm:grid-cols-2">
                  {approvedFollowUps.map(item => {
                    const checked = selectedSourceIds.includes(item.id);
                    return (
                      <label key={item.id} className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 text-xs
                        ${checked ? "border-teal-600/50 bg-teal-50 dark:bg-teal-950/30" : "border-border/70 hover:bg-muted/40"}`}>
                        <input type="checkbox" checked={checked} disabled={busy}
                          onChange={() => toggleSourceSelection(item.id)} className="mt-0.5 size-4 shrink-0 accent-teal-600" />
                        <div className="min-w-0 space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <bdi className="font-mono font-bold">{item.reportNumber}</bdi>
                            {item.isMerged && <Badge variant="secondary">مدمج ({item.sourceReportsCount})</Badge>}
                          </div>
                          <p className="text-muted-foreground">
                            من {formatShortDateAr(item.reportPeriodStart || item.reportDate)} إلى {formatShortDateAr(item.reportPeriodEnd || item.reportDate)}
                          </p>
                        </div>
                      </label>
                    );
                  })}
                </div>
                <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                  <p className="text-xs text-muted-foreground">
                    {selectedApprovedIds.length < 2 ? "اختر تقريرين على الأقل." : `التقارير المحددة (${selectedApprovedIds.length})`}
                  </p>
                  <Button type="button" onClick={previewSelectedReports} disabled={busy || selectedApprovedIds.length < 2}
                    className="min-h-11 w-full gap-2 bg-teal-600 text-white hover:bg-teal-700 sm:w-auto">
                    {previewMerge.isPending ? <Loader2 className="size-4 animate-spin" /> : <GitMerge className="size-4" />}
                    {previewMerge.isPending ? "جارٍ إعداد المعاينة…" : "المعاينة والتعديل"}
                  </Button>
                </div>
              </>
            )}
          </div>
        )}
      </ReportFormCard>
    );
  }

  return (
    <form onSubmit={save} dir="rtl" className="min-w-0 space-y-4 sm:space-y-6">
      {reviewingMerge && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 ref={reviewHeading} tabIndex={-1} className="text-lg font-bold">المعاينة والتعديل</h2>
          <Button type="button" variant="outline" onClick={returnToSources} disabled={busy}>
            <ArrowRight className="size-4" />
            العودة إلى اختيار التقارير
          </Button>
        </div>
      )}
      <ReportFormCard title="بيانات التقرير والمشروع">
        {!projectId && (
          <p className="flex items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-50 p-3 text-xs font-semibold text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
            <Info className="size-4 shrink-0" />
            اختر المشروع لتعبئة اسم المدير ومرحلة المشروع تلقائيًا.
          </p>
        )}
        {projectField}
        <div className="grid gap-4 sm:grid-cols-2">
          <ReportField id="follow-up-manager" label="مدير المشروع">
            <Input id="follow-up-manager" value={manager || ""} readOnly className="h-10 bg-muted/40" />
          </ReportField>
          <ReportField id="follow-up-stage" label="مرحلة المشروع">
            <Input id="follow-up-stage" value={phase} readOnly className="h-10 bg-muted/40" />
          </ReportField>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {([
            ["report-date", "تاريخ التقرير", reportDate, setReportDate],
            ["from", "بداية الفترة (من)", from, setFrom],
            ["to", "نهاية الفترة (إلى)", to, setTo],
          ] as const).map(([id, label, value, onChange]) => (
            <ReportField key={id} id={`follow-up-${id}`} label={label} required>
              <Input id={`follow-up-${id}`} type="date" value={value} className="h-10 border-border/80"
                onChange={event => onChange(event.target.value)} min={id === "to" ? from : undefined} required />
            </ReportField>
          ))}
        </div>
      </ReportFormCard>

      {details.sourceReports && details.sourceReports.length > 0 && (
        <div className="rounded-xl border border-teal-600/30 bg-teal-50/50 dark:bg-teal-950/20 p-3.5 sm:p-4 space-y-2.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-xs sm:text-sm font-bold text-teal-900 dark:text-teal-200">
              <CheckCircle2 className="size-4 shrink-0 text-teal-600" />
              <span>تم الدمج من {details.sourceReports.length} تقارير متابعة معتمدة</span>
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {details.sourceReports.map(source => (
              <Badge
                key={source.id}
                variant="outline"
                className="bg-background font-mono text-[11px] font-semibold text-teal-800 dark:text-teal-200"
              >
                <bdi>{source.reportNumber}</bdi>
                {source.reportPeriodStart && source.reportPeriodEnd && (
                  <span className="mr-1 font-sans text-muted-foreground">
                    ({formatShortDateAr(source.reportPeriodStart)} - {formatShortDateAr(source.reportPeriodEnd)})
                  </span>
                )}
              </Badge>
            ))}
          </div>
        </div>
      )}

      <ReportFormCard title="حالة التقدم والمعالم الرئيسية">
        <div className="grid gap-4 md:grid-cols-3">
          <ReportField id="follow-up-planned" label="نسبة الإنجاز المخططة %">
            <Input id="follow-up-planned" type="number" min={0} max={100} value={planned}
              onChange={event => setPlanned(event.target.value)} className="h-10 border-border/80 font-bold" />
          </ReportField>
          <ReportField id="follow-up-actual" label="نسبة الإنجاز الفعلية %">
            <Input id="follow-up-actual" type="number" min={0} max={100} value={actual}
              onChange={event => setActual(event.target.value)} className="h-10 border-border/80 font-bold" />
          </ReportField>
          <ReportField id="follow-up-gap" label="فرق الإنجاز (الفعلي − المخطط)">
            <Input id="follow-up-gap" value={gap === null ? "" : `${gap}٪`} readOnly
              className="h-10 bg-teal-50 font-bold text-teal-800 dark:bg-teal-950/30 dark:text-teal-200" />
          </ReportField>
        </div>
        {renderTable("milestones")}
      </ReportFormCard>

      <ReportFormCard title="المؤشرات التشغيلية والمالية">
        <div className="grid gap-4 md:grid-cols-3">
          {followUpIndicators.map(([key, label]) => (
            <RagIndicatorSelect key={key} label={label} value={details[key] ?? ""}
              onChange={value => changeDetail(key, value)} allowClear />
          ))}
          <ReportField id="overallTrend" label="اتجاه الأداء">
            <Select value={details.overallTrend || "unset"}
              onValueChange={value => changeDetail("overallTrend", value === "unset" ? "" : value)}>
              <SelectTrigger id="overallTrend" className="h-10 w-full border-border/80">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="unset">غير محدد</SelectItem>
                <SelectItem value="متحسّن">متحسّن</SelectItem>
                <SelectItem value="ثابت">ثابت</SelectItem>
                <SelectItem value="متراجع">متراجع</SelectItem>
              </SelectContent>
            </Select>
          </ReportField>
          {([["amountSpent", "المصروف التراكمي"], ["approvedBudget", "الميزانية المعتمدة"]] as const).map(([key, label]) => (
            <ReportField key={key} id={key} label={label}>
              <Input id={key} type="number" min={0} step="0.01" value={details[key] ?? ""}
                onChange={event => changeDetail(key, event.target.value || undefined)} className="h-10 border-border/80" />
            </ReportField>
          ))}
        </div>
      </ReportFormCard>

      <ReportFormCard title="ملخص الأعمال والتوصيات">
        <div className="grid gap-5 sm:grid-cols-2">
          {followUpTextFields.map(([key, label]) => (
            <ReportField key={key} id={key} label={label}>
              <Textarea id={key} rows={3} value={details[key] ?? ""}
                onChange={event => changeDetail(key, event.target.value)} className="border-border/80" />
            </ReportField>
          ))}
        </div>
      </ReportFormCard>

      <ReportFormCard title="الانحرافات والمخاطر والإجراءات">
        {renderTable("deviations")}
        {renderTable("risks")}
        {renderTable("correctiveActions")}
      </ReportFormCard>

      <ReportFormCard title="المرفقات والروابط">
        {renderTable("links")}
        <FileUpload key={attachmentRevision} label="رفع المرفقات والوثائق" existingFiles={attachments} disabled={busy}
          onFilesSelected={files => setAttachmentState(current =>
            current.revision === attachmentRevision ? { ...current, files } : current
          )} />
      </ReportFormCard>

      <div className="flex justify-end rounded-xl border border-border/80 bg-card p-3.5 shadow-xs sm:p-4">
        <Button type="submit" disabled={busy}
          className="min-h-11 w-full gap-2 bg-[#1a5f4a] text-xs font-bold text-white hover:bg-[#154d3c] sm:w-auto">
          <Save className="size-4" />
          {saving ? "جارٍ الحفظ…" : "حفظ تقرير المتابعة"}
        </Button>
      </div>
    </form>
  );
}

export default function FollowUpReportPage({ showLayout = true, mergeMode = false }: { showLayout?: boolean; mergeMode?: boolean }) {
  const search = useSearch();
  const params = new URLSearchParams(search);
  const editId = showLayout ? Number(params.get("editId")) : 0;
  const initialMergeMode = showLayout && editId === 0 && params.get("mode") === "merge";
  const { data: report, isPending } = trpc.progressReports.getById.useQuery({ id: editId }, { enabled: editId > 0 });

  if (!showLayout) return <FollowUpForm mergeMode={mergeMode} />;

  return (
    <DashboardLayout tabletNavigation>
      <div className="space-y-5" dir="rtl">
        <div className="flex items-center gap-3">
          <Link href="/project-reports">
            <Button variant="ghost" size="icon" className="shrink-0 size-10 rounded-xl">
              <ArrowRight className="size-5 text-foreground" />
            </Button>
          </Link>
          <div>
            <h1 className="text-xl font-bold">
              {initialMergeMode ? "دمج تقارير متابعة" : FOLLOW_UP_REPORT_TITLE}
            </h1>
            {initialMergeMode && (
              <p className="text-xs text-muted-foreground">
                اختر المشروع وحدّد تقارير المتابعة المعتمدة لقراءتها ودمجها في تقرير متابعة جديد.
              </p>
            )}
          </div>
        </div>
        {editId > 0 && isPending ? <p>جارٍ تحميل التقرير…</p>
          : editId > 0 && (!report || !isFollowUpReport(report)) ? <p>تعذّر العثور على تقرير المتابعة.</p>
          : <FollowUpForm key={report?.id ?? (initialMergeMode ? "merge" : "new")} existing={report ?? undefined} mergeMode={initialMergeMode} />}
      </div>
    </DashboardLayout>
  );
}
