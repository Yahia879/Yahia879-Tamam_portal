import { useMemo, useRef, useState, type FormEvent, type ReactNode } from "react";
import { Link, useLocation, useSearch } from "wouter";
import { format } from "date-fns";
import { ArrowRight, CheckCircle2, GitMerge, Info, Loader2, Save, X } from "lucide-react";
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

function FollowUpForm({ existing, initialMergeMode = false }: { existing?: SavedReport; initialMergeMode?: boolean }) {
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

  const [mergeOpen, setMergeOpen] = useState(initialMergeMode && !existing);
  const [selectedSourceIds, setSelectedSourceIds] = useState<number[]>([]);
  const [mergeFilterFrom, setMergeFilterFrom] = useState("");
  const [mergeFilterTo, setMergeFilterTo] = useState("");

  const numericProjectId = Number(projectId) || 0;
  const { data: approvedFollowUps = [], isLoading: loadingApproved } =
    trpc.progressReports.listApprovedFollowUps.useQuery(
      { projectId: numericProjectId },
      { enabled: !existing && numericProjectId > 0 }
    );

  const filteredApprovedFollowUps = useMemo(() => {
    return approvedFollowUps.filter(item => {
      const itemStart = item.reportPeriodStart || item.reportDate;
      const itemEnd = item.reportPeriodEnd || item.reportDate;
      if (mergeFilterFrom && itemEnd && itemEnd < mergeFilterFrom) return false;
      if (mergeFilterTo && itemStart && itemStart > mergeFilterTo) return false;
      return true;
    });
  }, [approvedFollowUps, mergeFilterFrom, mergeFilterTo]);

  const allFilteredSelected =
    filteredApprovedFollowUps.length > 0 &&
    filteredApprovedFollowUps.every(item => selectedSourceIds.includes(item.id));

  function handleProjectChange(nextProjectId: string) {
    if (busy || mergeInFlight.current || draftBeforeMerge.current || nextProjectId === projectId) return;
    setProjectId(nextProjectId);
    setSelectedSourceIds([]);
    setMergeFilterFrom("");
    setMergeFilterTo("");
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

  function cancelMerge() {
    if (busy || mergeInFlight.current || !draftBeforeMerge.current) return;
    applyDraft(draftBeforeMerge.current);
    draftBeforeMerge.current = null;
    setSelectedSourceIds([]);
  }

  function toggleSourceSelection(id: number) {
    setSelectedSourceIds(current =>
      current.includes(id) ? current.filter(item => item !== id) : [...current, id]
    );
  }

  function toggleSelectAllFiltered() {
    if (allFilteredSelected) {
      const visibleIds = new Set(filteredApprovedFollowUps.map(item => item.id));
      setSelectedSourceIds(current => current.filter(id => !visibleIds.has(id)));
    } else {
      setSelectedSourceIds(current => {
        const merged = new Set(current);
        filteredApprovedFollowUps.forEach(item => merged.add(item.id));
        return Array.from(merged);
      });
    }
  }

  async function handleReadAndMerge() {
    if (busy || mergeInFlight.current) return;
    if (!numericProjectId) {
      toast.error("يرجى اختيار المشروع أولاً.");
      return;
    }
    if (selectedSourceIds.length < 2) {
      toast.error("يرجى اختيار تقريري متابعة معتمدين على الأقل للدمج.");
      return;
    }
    mergeInFlight.current = true;
    try {
      const merged = await previewMerge.mutateAsync({
        projectId: numericProjectId,
        reportIds: selectedSourceIds,
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
      const count = merged.followUpDetails.sourceReports?.length ?? selectedSourceIds.length;
      toast.success(`تمت قراءة ودمج ${count} تقارير متابعة معتمدة. يمكنك المراجعة والتعديل قبل الحفظ.`);
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

  return (
    <form onSubmit={save} dir="rtl" className="min-w-0 space-y-4 sm:space-y-6">
      <ReportFormCard title="بيانات التقرير والمشروع">
        {!projectId && (
          <p className="flex items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-50 p-3 text-xs font-semibold text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
            <Info className="size-4 shrink-0" />
            اختر المشروع لتعبئة اسم المدير ومرحلة المشروع تلقائيًا.
          </p>
        )}
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

      {!existing && (
        <Card className="min-w-0 gap-0 border-teal-600/30 bg-teal-50/30 dark:bg-teal-950/15 shadow-xs">
          <CardHeader className="border-b border-border/60 px-4 pb-3 sm:px-6">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle className="flex items-center gap-2 text-base font-bold text-foreground">
                <GitMerge className="size-4 shrink-0 text-teal-600" />
                قراءة ودمج من تقارير متابعة معتمدة
              </CardTitle>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setMergeOpen(current => !current)}
                className="h-8 text-xs font-semibold"
              >
                {mergeOpen ? "إخفاء قائمة الدمج" : "اختيار تقارير للدمج"}
              </Button>
            </div>
          </CardHeader>
          {mergeOpen && (
            <CardContent className="min-w-0 space-y-4 px-4 pt-4 sm:px-6">
              {!numericProjectId ? (
                <p className="flex items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-50 p-3 text-xs font-semibold text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
                  <Info className="size-4 shrink-0" />
                  اختر المشروع أعلاه لعرض تقارير المتابعة المعتمدة المتاحة للدمج.
                </p>
              ) : loadingApproved ? (
                <div className="flex items-center gap-2 py-4 text-xs text-muted-foreground">
                  <Loader2 className="size-4 animate-spin text-teal-600" />
                  جارٍ جلب تقارير المتابعة المعتمدة لهذا المشروع…
                </div>
              ) : approvedFollowUps.length === 0 ? (
                <p className="rounded-xl border border-border/70 bg-background p-3 text-xs text-muted-foreground">
                  لا توجد تقارير متابعة معتمدة لهذا المشروع حالياً. يُسمح بدمج تقارير المتابعة المعتمدة فقط.
                </p>
              ) : (
                <>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 items-end">
                    <ReportField id="merge-filter-from" label="تصفية من تاريخ">
                      <Input
                        id="merge-filter-from"
                        type="date"
                        value={mergeFilterFrom}
                        onChange={event => setMergeFilterFrom(event.target.value)}
                        className="h-9 bg-background text-xs"
                      />
                    </ReportField>
                    <ReportField id="merge-filter-to" label="تصفية إلى تاريخ">
                      <Input
                        id="merge-filter-to"
                        type="date"
                        value={mergeFilterTo}
                        min={mergeFilterFrom || undefined}
                        onChange={event => setMergeFilterTo(event.target.value)}
                        className="h-9 bg-background text-xs"
                      />
                    </ReportField>
                    <div className="flex flex-wrap items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={toggleSelectAllFiltered}
                        disabled={busy || filteredApprovedFollowUps.length === 0}
                        className="h-9 text-xs font-semibold"
                      >
                        {allFilteredSelected ? "إلغاء تحديد الكل" : `تحديد الكل (${filteredApprovedFollowUps.length})`}
                      </Button>
                      {(mergeFilterFrom || mergeFilterTo) && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setMergeFilterFrom("");
                            setMergeFilterTo("");
                          }}
                          className="h-9 text-xs text-muted-foreground"
                        >
                          مسح الفلتر
                        </Button>
                      )}
                    </div>
                  </div>

                  {filteredApprovedFollowUps.length === 0 ? (
                    <p className="rounded-xl border border-border/70 bg-background p-3 text-xs text-muted-foreground">
                      لا توجد تقارير متابعة معتمدة ضمن نطاق التاريخ المحدد.
                    </p>
                  ) : (
                    <div className="max-h-72 space-y-2 overflow-y-auto rounded-xl border border-border/70 bg-background p-2.5">
                      {filteredApprovedFollowUps.map(item => {
                        const checked = selectedSourceIds.includes(item.id);
                        return (
                          <label
                            key={item.id}
                            className={`flex cursor-pointer flex-wrap items-center justify-between gap-2 rounded-lg border p-2.5 text-xs transition-colors ${
                              checked
                                ? "border-teal-600/60 bg-teal-50/70 dark:bg-teal-950/30"
                                : "border-border/60 hover:bg-muted/40"
                            }`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => toggleSourceSelection(item.id)}
                                disabled={busy}
                                className="size-4 shrink-0 accent-teal-600 rounded"
                              />
                              <div className="min-w-0 space-y-0.5">
                                <div className="flex flex-wrap items-center gap-1.5">
                                  <span className="font-mono font-bold text-teal-700 dark:text-teal-300">
                                    <bdi>{item.reportNumber}</bdi>
                                  </span>
                                  <Badge variant="outline" className="border-emerald-500/40 text-emerald-700 dark:text-emerald-300 text-[10px]">
                                    معتمد
                                  </Badge>
                                  {item.isMerged && (
                                    <Badge variant="secondary" className="gap-1 bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-200 text-[10px]">
                                      <GitMerge className="size-3 shrink-0" />
                                      مدمج ({item.sourceReportsCount})
                                    </Badge>
                                  )}
                                </div>
                                <div className="text-[11px] text-muted-foreground">
                                  الفترة: {formatShortDateAr(item.reportPeriodStart)} إلى {formatShortDateAr(item.reportPeriodEnd)} — بتاريخ {formatShortDateAr(item.reportDate)}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 text-[11px] font-semibold">
                              {item.plannedProgress != null && (
                                <span className="rounded bg-muted px-2 py-0.5">مخطط: {item.plannedProgress}٪</span>
                              )}
                              {item.actualProgress != null && (
                                <span className="rounded bg-teal-600/10 px-2 py-0.5 text-teal-800 dark:text-teal-200">
                                  فعلي: {item.actualProgress}٪
                                </span>
                              )}
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  )}

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1">
                    <span className="text-xs text-muted-foreground">
                      المحدد حالياً: <strong className="text-foreground">{selectedSourceIds.length}</strong> تقرير (الحد الأدنى تقريرين)
                    </span>
                    <Button
                      type="button"
                      onClick={handleReadAndMerge}
                      disabled={selectedSourceIds.length < 2 || busy}
                      className="gap-2 bg-teal-600 text-xs font-bold text-white hover:bg-teal-700"
                    >
                      {previewMerge.isPending ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <GitMerge className="size-4" />
                      )}
                      {previewMerge.isPending
                        ? "جارٍ القراءة والدمج…"
                        : `قراءة ودمج التقارير المحددة (${selectedSourceIds.length})`}
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          )}
        </Card>
      )}

      {details.sourceReports && details.sourceReports.length > 0 && (
        <div className="rounded-xl border border-teal-600/30 bg-teal-50/50 dark:bg-teal-950/20 p-3.5 sm:p-4 space-y-2.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-xs sm:text-sm font-bold text-teal-900 dark:text-teal-200">
              <CheckCircle2 className="size-4 shrink-0 text-teal-600" />
              <span>تم الدمج من {details.sourceReports.length} تقارير متابعة معتمدة</span>
            </div>
            {!existing && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={cancelMerge}
                disabled={busy}
                className="h-7 gap-1 text-xs text-muted-foreground hover:text-destructive"
              >
                <X className="size-3.5" />
                إلغاء الدمج واستعادة المسودة
              </Button>
            )}
          </div>
          {!existing && (
            <p className="text-xs text-muted-foreground">لتغيير المشروع، ألغِ الدمج أولاً.</p>
          )}
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

export default function FollowUpReportPage({ showLayout = true }: { showLayout?: boolean }) {
  const search = useSearch();
  const params = new URLSearchParams(search);
  const editId = showLayout ? Number(params.get("editId")) : 0;
  const initialMergeMode = showLayout && editId === 0 && params.get("mode") === "merge";
  const { data: report, isPending } = trpc.progressReports.getById.useQuery({ id: editId }, { enabled: editId > 0 });

  if (!showLayout) return <FollowUpForm />;

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
          : <FollowUpForm key={report?.id ?? (initialMergeMode ? "merge" : "new")} existing={report ?? undefined} initialMergeMode={initialMergeMode} />}
      </div>
    </DashboardLayout>
  );
}
