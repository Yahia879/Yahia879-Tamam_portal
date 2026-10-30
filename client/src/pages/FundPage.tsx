import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { usePermission } from "@/hooks/usePermission";
import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { SaudiRiyal } from "@/components/SaudiRiyal";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Coins,
  Wallet,
  Layers,
  Tag,
  Building2,
  ArrowRightLeft,
  Loader2,
  CheckCircle2,
  Sparkles,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

const format = (value: number) =>
  value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const movementName: Record<string, string> = {
  receipt: "إيداع سند قبض",
  receipt_reversal: "عكس إيداع",
  surplus: "تحويل فائض",
  administrative: "تحويل حصة إدارية",
  operational: "تحويل حصة تشغيلية",
  disbursement: "صرف",
  disbursement_reversal: "عكس صرف",
};

const automaticTransferNotes = new Set([
  "تحويل فائض المشروع إلى الصندوق",
  "تحويل الحصة الإدارية إلى الصندوق",
  "تحويل الحصة التشغيلية إلى الصندوق",
]);

export default function FundPage() {
  const [location, navigate] = useLocation();
  const { user } = useAuth();
  const canTransferToFund =
    usePermission("fund.transfer") ||
    ["financial", "financial_manager"].includes(user?.role || "");
  const query = window.location.search;
  const showAllMovements = location === "/fund/movements" || new URLSearchParams(query).get("view") === "movements";

  useEffect(() => {
    const params = new URLSearchParams(query);
    if (params.has("projectId") && params.has("source")) {
      navigate(`/fund/transfers/new${query}`);
    }
  }, [navigate, query]);

  const { data: summary, isLoading } = trpc.fund.summary.useQuery();
  const utils = trpc.useUtils();
  const { data: surplusProjects = [], isLoading: isLoadingSurplus } =
    trpc.fund.transferableProjects.useQuery({ source: "surplus" });

  const [selectedProjectForTransfer, setSelectedProjectForTransfer] = useState<any>(null);
  const [isTransferDialogOpen, setIsTransferDialogOpen] = useState(false);
  const [transferAmount, setTransferAmount] = useState("");
  const [transferDestination, setTransferDestination] = useState<"project" | "general">("project");
  const [transferReason, setTransferReason] = useState("");

  const transferMutation = trpc.fund.transferFromProject.useMutation({
    onSuccess: async () => {
      toast.success("تم تحويل الفائض إلى الصندوق بنجاح!");
      setIsTransferDialogOpen(false);
      setSelectedProjectForTransfer(null);
      await Promise.all([
        utils.fund.summary.invalidate(),
        utils.fund.movements.invalidate(),
        utils.fund.projectAvailability.invalidate(),
        utils.fund.transferableProjects.invalidate(),
        utils.projects.getAll.invalidate(),
      ]);
    },
    onError: (error) => toast.error(error.message),
  });

  const handleOpenTransferDialog = (proj: any) => {
    setSelectedProjectForTransfer(proj);
    setTransferAmount(proj.available?.toString() || "");
    setTransferDestination("project");
    setTransferReason(`تحويل فائض المشروع ${proj.projectNumber} إلى الصندوق`);
    setIsTransferDialogOpen(true);
  };

  const handleConfirmTransfer = () => {
    if (!selectedProjectForTransfer) return;
    const numAmount = Number(transferAmount);
    if (!numAmount || numAmount <= 0) {
      toast.error("يرجى إدخال مبلغ صحيح للتحويل");
      return;
    }
    if (numAmount > selectedProjectForTransfer.available) {
      toast.error("المبلغ المدخل يتجاوز الفائض المتاح");
      return;
    }

    transferMutation.mutate({
      projectId: selectedProjectForTransfer.id,
      source: "surplus",
      amount: numAmount,
      destination: {
        restrictionType: transferDestination === "general" ? "general" : "project",
        restrictedProjectId: transferDestination === "general" ? undefined : selectedProjectForTransfer.id,
      },
      releaseRestriction: transferDestination === "general",
      reason: transferReason.trim() || undefined,
    });
  };
  const { data: movements = [], isLoading: isLoadingMovements } = trpc.fund.movements.useQuery({
    limit: 6,
    all: showAllMovements,
  });
  const { data: projectsData } = trpc.projects.getAll.useQuery({ limit: 200 });
  const projects: any[] = Array.isArray(projectsData)
    ? projectsData
    : (projectsData as any)?.projects || [];
  const generalBucket = useMemo(
    () =>
      summary?.buckets.find((bucket) => bucket.restrictionType === "general") || {
        restrictionType: "general" as const,
        posted: 0,
        reserved: 0,
        available: 0,
      },
    [summary]
  );
  const purposeBuckets = useMemo(
    () => (summary?.buckets || []).filter((bucket) => bucket.restrictionType === "purpose"),
    [summary]
  );
  const projectBuckets = useMemo(
    () => (summary?.buckets || []).filter((bucket) => bucket.restrictionType === "project"),
    [summary]
  );
  const fundTotals = useMemo(
    () =>
      (summary?.buckets || []).reduce(
        (totals, bucket) => ({
          posted: totals.posted + bucket.posted,
          reserved: totals.reserved + bucket.reserved,
          available: totals.available + bucket.available,
        }),
        { posted: 0, reserved: 0, available: 0 }
      ),
    [summary]
  );

  const visibleMovements = showAllMovements ? movements : movements.slice(0, 5);
  const renderMovement = (movement: (typeof movements)[number]) => (
    <div key={movement.id} className="flex flex-col justify-between gap-2 py-3 text-sm sm:flex-row sm:items-center">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-bold text-slate-900">
            {movementName[movement.movementType] || movement.movementType}
          </span>
          <Badge
            variant="outline"
            className={`text-[10px] font-bold ${
              movement.restrictionType === "general"
                ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                : movement.restrictionType === "purpose"
                ? "border-indigo-200 bg-indigo-50 text-indigo-800"
                : "border-purple-200 bg-purple-50 text-purple-800"
            }`}
          >
            {movement.restrictionType === "general"
              ? "الحساب العام"
              : movement.restrictionType === "purpose"
              ? movement.donationPurposeName || "مصرف تبرع"
              : `مشروع #${movement.restrictedProjectId}`}
          </Badge>
        </div>
        {movement.notes?.trim() && !automaticTransferNotes.has(movement.notes.trim()) && (
          <div className="mt-1.5 flex min-w-0 items-center gap-1.5 text-xs">
            <span className="shrink-0 font-bold text-slate-700">
              {["surplus", "administrative", "operational"].includes(movement.movementType)
                ? "سبب التحويل:"
                : "البيان:"}
            </span>
            <span title={movement.notes} className="max-w-[18rem] truncate rounded-md border border-slate-200 bg-slate-100/90 px-2 py-0.5 font-medium text-slate-800 sm:max-w-[30rem]">
              {movement.notes}
            </span>
          </div>
        )}
        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span>{new Date(movement.createdAt).toLocaleString("ar-SA")}</span>
          {movement.voucherId ? (
            <>
              <span>•</span>
              <Button variant="link" className="h-auto cursor-pointer p-0 text-xs font-bold" onClick={() => navigate(`/receipt-vouchers/${movement.voucherId}`)}>
                سند القبض #{movement.voucherId}
              </Button>
            </>
          ) : movement.disbursementOrderId ? (
            <>
              <span>•</span>
              <Button variant="link" className="h-auto cursor-pointer p-0 text-xs font-bold" onClick={() => navigate(`/disbursement-orders/${movement.disbursementOrderId}`)}>
                أمر الصرف #{movement.disbursementOrderId}
              </Button>
            </>
          ) : movement.projectId ? (
            <>
              <span>•</span>
              <Button variant="link" className="h-auto cursor-pointer p-0 text-xs font-bold" onClick={() => navigate(`/projects/${movement.projectId}`)}>
                المشروع #{movement.projectId}
              </Button>
            </>
          ) : null}
        </div>
      </div>
      <div className="shrink-0 text-left sm:text-right">
        <span className={`font-sans text-base font-black ${Number(movement.amount) < 0 ? "text-rose-700" : "text-emerald-700"}`}>
          {Number(movement.amount) > 0 ? "+" : ""}{format(Number(movement.amount))}{" "}
          <SaudiRiyal className="h-3 w-3" />
        </span>
      </div>
    </div>
  );

  const movementHistoryCard = (
    <Card className="border-slate-200 bg-slate-50 shadow-xs">
      <CardHeader className="border-b border-slate-200 bg-transparent pb-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-base font-bold text-slate-900">
              <Coins className="h-5 w-5 text-amber-700" />
              سجل حركات الصندوق التراكمي
            </CardTitle>
            <CardDescription className="text-xs">
              {showAllMovements ? "جميع الحركات مرتبة من الأحدث إلى الأقدم" : "آخر خمس حركات مسجلة في الصندوق"}
            </CardDescription>
          </div>
          {showAllMovements ? (
            <Button variant="outline" size="sm" onClick={() => navigate("/fund")}>العودة إلى الصندوق</Button>
          ) : movements.length >= 6 ? (
            <Button variant="outline" size="sm" onClick={() => navigate("/fund/movements")}>عرض الكل</Button>
          ) : null}
        </div>
      </CardHeader>
      <CardContent className="bg-transparent pt-3">
        {isLoadingMovements ? (
          <div className="py-8 text-center text-sm text-muted-foreground">جاري تحميل الحركات...</div>
        ) : visibleMovements.length === 0 ? (
          <div className="py-8 text-center text-xs text-muted-foreground">لا توجد حركات مسجلة في الصندوق حتى الآن.</div>
        ) : (
          <div className="divide-y divide-slate-200">{visibleMovements.map(renderMovement)}</div>
        )}
      </CardContent>
    </Card>
  );

  if (showAllMovements) {
    return (
      <DashboardLayout>
        <div dir="rtl" className="mx-auto max-w-7xl space-y-6 p-4 font-sans sm:p-6">
          <div>
            <h1 className="text-2xl font-black text-slate-900">سجل حركات الصندوق</h1>
            <p className="mt-1 text-sm text-muted-foreground">جميع عمليات الإيداع والصرف والتحويل المسجلة</p>
          </div>
          {movementHistoryCard}
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div dir="rtl" className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
        {/* رأس الصفحة والمؤشرات الإجمالية */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-700 text-white flex items-center justify-center shadow-md shadow-emerald-700/20 shrink-0">
              <Wallet className="w-6 h-6 text-emerald-100" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900">الصندوق المركزي</h1>
              <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                إدارة أرصدة التبرعات العامة والقيود المحاسبية حسب مصارف التبرع وفوائض المشاريع
              </p>
            </div>
          </div>

          {canTransferToFund && (
            <div className="flex items-center gap-2 flex-wrap">
              <Button onClick={() => navigate("/fund/transfers/new")} className="bg-indigo-700 hover:bg-indigo-800 text-white font-bold">
                <ArrowRightLeft className="w-4 h-4 ml-2" />
                تحويل من مشروع
              </Button>
            </div>
          )}
        </div>

        {/* إجمالي أرصدة الصندوق من الحساب العام والتصنيفات وفوائض المشاريع */}
        <div className="rounded-2xl border border-slate-200 bg-slate-100/80 p-5 shadow-sm sm:p-6">
          <div className="flex flex-col gap-4 border-b border-slate-200 pb-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start sm:items-center">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-xl font-black text-slate-900 sm:text-2xl">
                    إجمالي أرصدة حساب الجمعية
                  </h2>
                </div>
                <p className="mt-1 text-xs text-slate-600 sm:text-sm">
                  يشمل رصيد الحساب العام وجميع التصنيفات وفوائض المشاريع.
                </p>
              </div>
            </div>

          </div>

          {/* إجماليات جميع أرصدة الصندوق */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 pt-4">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 shadow-xs">
              <span className="block text-xs font-bold text-slate-700">إجمالي الرصيد المتاح</span>
              <span className="mt-1 block font-sans text-2xl font-black text-slate-900 sm:text-3xl">
                {isLoading ? "..." : format(fundTotals.available)}{" "}
                <SaudiRiyal className="h-4 w-4" />
              </span>
              <span className="mt-1 block text-[11px] text-slate-500">من جميع الأرصدة والتصنيفات</span>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 shadow-xs">
              <span className="block text-xs font-semibold text-slate-600">إجمالي الرصيد المسجل</span>
              <span className="mt-1 block font-sans text-lg font-bold text-slate-800 sm:text-xl">
                {isLoading ? "..." : format(fundTotals.posted)}{" "}
                <SaudiRiyal className="h-3 w-3" />
              </span>
              <span className="mt-1 block text-[11px] text-slate-500">مجموع الرصيد المسجل في كل الأرصدة</span>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 shadow-xs">
              <span className="block text-xs font-semibold text-slate-600">إجمالي المحجوز لطلبات الصرف</span>
              <span className="mt-1 block font-sans text-lg font-bold text-slate-800 sm:text-xl">
                {isLoading ? "..." : format(fundTotals.reserved)}{" "}
                <SaudiRiyal className="h-3 w-3" />
              </span>
              <span className="mt-1 block text-[11px] text-slate-500">مجموع المحجوز في كل الأرصدة</span>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* قسم المشاريع التي بها فائض مالي متاح للتحويل إلى الصندوق */}
        {/* ========================================================================= */}
        <Card className="shadow-xs border-emerald-200/90 bg-gradient-to-b from-emerald-50/20 to-card overflow-hidden">
          <CardHeader className="border-b border-emerald-100/80 bg-transparent pb-3.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                  <Coins className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <CardTitle className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100">
                      مشاريع الجمعية التي بها فائض مالي متاح للتحويل
                    </CardTitle>
                    <Badge variant="outline" className="border-emerald-300 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 text-xs font-bold">
                      {surplusProjects.length} {surplusProjects.length === 1 ? "مشروع به فائض" : "مشاريع بها فائض"}
                    </Badge>
                  </div>
                  <CardDescription className="text-xs mt-0.5">
                    المشاريع التي تجاوزت مبالغ سندات قبضها التكلفة المعتمدة، مع إمكانية تحويل الفائض مباشرة إلى الصندوق
                  </CardDescription>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            {isLoadingSurplus ? (
              <div className="py-8 text-center text-xs text-muted-foreground flex items-center justify-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
                <span>جاري فحص وتحديث فوائض المشاريع...</span>
              </div>
            ) : surplusProjects.length === 0 ? (
              <div className="p-6 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-dashed border-slate-200 dark:border-slate-800 text-center space-y-1.5">
                <p className="text-sm font-bold text-slate-700 dark:text-slate-300">لا توجد مشاريع بها فائض مالي متاح للتحويل حالياً</p>
                <p className="text-xs text-muted-foreground">
                  عند تجاوز المقبوضات الفعلية لأي مشروع تكلفته المعتمدة، سيظهر تلقائياً هنا مع زر التحويل المباشر للصندوق.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {surplusProjects.map((proj: any) => (
                  <div
                    key={proj.id}
                    className="p-4 rounded-xl border border-emerald-200/70 bg-card hover:border-emerald-300 transition-all flex flex-col lg:flex-row lg:items-center justify-between gap-4 shadow-2xs"
                  >
                    <div className="space-y-1.5 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Button
                          variant="link"
                          onClick={() => navigate(`/projects/${proj.id}`)}
                          className="p-0 h-auto font-black text-sm sm:text-base text-foreground hover:text-emerald-700 hover:underline cursor-pointer"
                        >
                          {proj.name}
                        </Button>
                        <Badge variant="outline" className="text-[10px] font-bold border-slate-300 bg-slate-50 dark:bg-slate-900">
                          {proj.projectNumber}
                        </Badge>
                      </div>

                      <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap pt-0.5">
                        {proj.received !== undefined && (
                          <span className="inline-flex items-center gap-1">
                            المقبوضات المحصلة: <strong className="text-foreground font-sans font-bold">{format(proj.received)}</strong> <SaudiRiyal className="w-3 h-3" />
                          </span>
                        )}
                        {proj.projectCost !== undefined && (
                          <>
                            <span>•</span>
                            <span className="inline-flex items-center gap-1">
                              التكلفة المعتمدة: <strong className="text-foreground font-sans font-bold">{format(proj.projectCost)}</strong> <SaudiRiyal className="w-3 h-3" />
                            </span>
                          </>
                        )}
                        {proj.surplusTransferred > 0 && (
                          <>
                            <span>•</span>
                            <span className="inline-flex items-center gap-1 text-slate-500">
                              تم تحويله سابقاً: <span className="font-sans font-semibold">{format(proj.surplusTransferred)}</span> <SaudiRiyal className="w-2.5 h-2.5" />
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between lg:justify-end gap-4 shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-100">
                      <div className="text-right">
                        <span className="text-[10px] block font-semibold text-muted-foreground">الفائض المتاح للتحويل</span>
                        <span className="font-sans text-lg sm:text-xl font-black text-emerald-600 dark:text-emerald-400 inline-flex items-center gap-1">
                          +{format(proj.available)} <SaudiRiyal className="w-3.5 h-3.5" />
                        </span>
                      </div>

                      {canTransferToFund && (
                        <Button
                          onClick={() => handleOpenTransferDialog(proj)}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm h-9 sm:h-10 px-3 sm:px-4 rounded-xl shadow-xs gap-1.5 cursor-pointer shrink-0"
                        >
                          <ArrowRightLeft className="w-4 h-4" />
                          <span>تحويل المبلغ للصندوق</span>
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-xs border-slate-200 bg-slate-50">
          <CardHeader className="border-b border-slate-200 bg-transparent pb-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0">
                  <Layers className="w-5 h-5" />
                </div>
                <div>
                  <CardTitle className="text-base sm:text-lg font-bold text-slate-900">التصنيفات ومصارف التبرع (الأرصدة المقيدة)</CardTitle>
                  <CardDescription className="text-xs mt-0.5">تفاصيل الأرصدة الداخلة ضمن إجمالي حساب الجمعية أعلاه</CardDescription>
                </div>
              </div>
              <Badge variant="outline" className="text-indigo-800 border-indigo-200 bg-indigo-50 font-bold self-start sm:self-auto text-xs py-1 px-2.5">
                {purposeBuckets.length + projectBuckets.length} تصنيف / قيد مقيد
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="pt-5 space-y-6">
            <div>
              <div className="flex items-center gap-2 mb-3"><Tag className="w-4 h-4 text-indigo-600" /><h3 className="text-sm font-bold text-slate-800">أرصدة مصارف التبرع المسجلة</h3></div>
              {purposeBuckets.length === 0 ? (
                <div className="p-4 rounded-xl bg-slate-50 border border-dashed text-center text-xs text-muted-foreground">لا توجد أرصدة مقيدة بمصارف تبرع حالياً.</div>
              ) : (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                  {purposeBuckets.map((bucket, index) => (
                    <div key={index} className="rounded-xl border border-indigo-100 bg-indigo-50/20 p-4 hover:border-indigo-300 transition-all shadow-2xs flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between gap-2 pb-2 border-b border-indigo-100/60">
                          <span className="font-bold text-sm text-indigo-950 flex items-center gap-1.5 truncate"><span className="w-2 h-2 rounded-full bg-indigo-600 shrink-0" /><span className="truncate">{bucket.donationPurposeName || "مصرف تبرع"}</span></span>
                          <Badge className="bg-indigo-100 text-indigo-800 hover:bg-indigo-100 border-indigo-200 text-[10px] font-bold shrink-0">مقيد بمصرف</Badge>
                        </div>
                        <div className="mt-3 space-y-1.5">
                          <div className="flex items-baseline justify-between"><span className="text-xs text-muted-foreground">الرصيد المتاح:</span><span className="inline-flex items-center gap-1 text-lg font-black text-indigo-950 font-sans">{format(bucket.available)} <SaudiRiyal className="h-3.5 w-3.5" /></span></div>
                          <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1 border-t border-indigo-50"><span className="inline-flex items-center gap-1">الإجمالي: {format(bucket.posted)} <SaudiRiyal className="h-3 w-3" /></span><span className="inline-flex items-center gap-1">المحجوز: {format(bucket.reserved)} <SaudiRiyal className="h-3 w-3" /></span></div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            {projectBuckets.length > 0 && (
              <div className="pt-4 border-t">
                <div className="flex items-center gap-2 mb-3"><Building2 className="w-4 h-4 text-purple-600" /><h3 className="text-sm font-bold text-slate-800">فوائض المشاريع المقيدة بالصندوق</h3></div>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                  {projectBuckets.map((bucket, index) => {
                    const proj = projects.find((project) => project.id === bucket.restrictedProjectId);
                    return <div key={index} className="rounded-xl border border-purple-100 bg-purple-50/20 p-4 hover:border-purple-300 transition-all shadow-2xs flex flex-col justify-between"><div><div className="flex items-center justify-between gap-2 pb-2 border-b border-purple-100/60"><span className="font-bold text-sm text-purple-950 truncate">{proj ? `${proj.projectNumber} - ${proj.name}` : `مشروع #${bucket.restrictedProjectId}`}</span><Badge className="bg-purple-100 text-purple-800 hover:bg-purple-100 border-purple-200 text-[10px] font-bold shrink-0">مقيد بالمشروع</Badge></div><div className="mt-3 space-y-1.5"><div className="flex items-baseline justify-between"><span className="text-xs text-muted-foreground">الرصيد المتاح:</span><span className="inline-flex items-center gap-1 text-lg font-black text-purple-950 font-sans">{format(bucket.available)} <SaudiRiyal className="h-3.5 w-3.5" /></span></div><div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1 border-t border-purple-50"><span className="inline-flex items-center gap-1">الإجمالي: {format(bucket.posted)} <SaudiRiyal className="h-3 w-3" /></span><span className="inline-flex items-center gap-1">المحجوز: {format(bucket.reserved)} <SaudiRiyal className="h-3 w-3" /></span></div></div></div></div>;
                  })}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {movementHistoryCard}
        {/* نافذة تأكيد وتحويل الفائض للصندوق */}
        <Dialog open={isTransferDialogOpen} onOpenChange={setIsTransferDialogOpen}>
          <DialogContent className="max-w-lg font-sans" dir="rtl">
            <DialogHeader className="text-right border-b pb-3">
              <DialogTitle className="flex items-center gap-2 text-lg font-bold text-slate-900">
                <ArrowRightLeft className="w-5 h-5 text-emerald-600" />
                تحويل فائض المشروع إلى الصندوق
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-1">
                {selectedProjectForTransfer?.name} ({selectedProjectForTransfer?.projectNumber})
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-3">
              {/* بطاقة معلومات الفائض */}
              <div className="p-3.5 rounded-xl bg-emerald-50/60 border border-emerald-200/80 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">إجمالي الفائض المتاح للتحويل:</span>
                  <span className="font-bold text-emerald-700 font-sans text-sm inline-flex items-center gap-1">
                    {selectedProjectForTransfer ? format(selectedProjectForTransfer.available) : "0.00"} <SaudiRiyal className="w-3 h-3" />
                  </span>
                </div>
              </div>

              {/* حقل إدخال المبلغ */}
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700">المبلغ المراد تحويله (ريال):</Label>
                <div className="relative">
                  <Input
                    type="number"
                    step="0.01"
                    min="0.01"
                    max={selectedProjectForTransfer?.available || undefined}
                    value={transferAmount}
                    onChange={(e) => setTransferAmount(e.target.value)}
                    className="font-sans font-bold text-base h-10 pr-3 pl-10 rounded-xl"
                    placeholder="0.00"
                  />
                  <SaudiRiyal className="w-4 h-4 absolute left-3 top-3 text-muted-foreground pointer-events-none" />
                </div>
                <div className="flex justify-between items-center text-[11px] text-muted-foreground pt-0.5">
                  <span>يمكنك تحويل كامل المبلغ أو جزء منه</span>
                  <button
                    type="button"
                    onClick={() => setTransferAmount(selectedProjectForTransfer?.available?.toString() || "")}
                    className="text-emerald-600 font-bold hover:underline cursor-pointer"
                  >
                    تحويل كامل الفائض
                  </button>
                </div>
              </div>

              {/* تحديد وجهة التحويل في الصندوق */}
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700">وجهة قيد الرصيد في الصندوق:</Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div
                    onClick={() => setTransferDestination("project")}
                    className={`p-3 rounded-xl border text-xs cursor-pointer transition-all ${
                      transferDestination === "project"
                        ? "border-emerald-600 bg-emerald-50/50 font-bold text-emerald-950 ring-1 ring-emerald-600"
                        : "border-slate-200 hover:border-slate-300 text-slate-700"
                    }`}
                  >
                    <p className="font-bold">قيد بحساب المشروع</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">يبقى مقيداً للاستخدام بنفس المشروع</p>
                  </div>

                  <div
                    onClick={() => setTransferDestination("general")}
                    className={`p-3 rounded-xl border text-xs cursor-pointer transition-all ${
                      transferDestination === "general"
                        ? "border-emerald-600 bg-emerald-50/50 font-bold text-emerald-950 ring-1 ring-emerald-600"
                        : "border-slate-200 hover:border-slate-300 text-slate-700"
                    }`}
                  >
                    <p className="font-bold">الحساب العام للصندوق</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">تحرير القيد واستخدامه عموماً</p>
                  </div>
                </div>
              </div>

              {/* سبب التحويل / ملاحظات */}
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700">بيان / سبب التحويل (اختياري):</Label>
                <Input
                  value={transferReason}
                  onChange={(e) => setTransferReason(e.target.value)}
                  placeholder="تحويل فائض المشروع إلى الصندوق"
                  className="text-xs h-9 rounded-xl"
                />
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0 border-t pt-3 flex-row-reverse justify-start">
              <Button
                type="button"
                disabled={transferMutation.isPending || !Number(transferAmount) || Number(transferAmount) <= 0 || Number(transferAmount) > (selectedProjectForTransfer?.available || 0)}
                onClick={handleConfirmTransfer}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-9 rounded-xl gap-1.5 cursor-pointer"
              >
                {transferMutation.isPending ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>جاري التحويل...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>تأكيد تحويل المبلغ للصندوق</span>
                  </>
                )}
              </Button>

              <Button
                type="button"
                variant="outline"
                onClick={() => setIsTransferDialogOpen(false)}
                className="text-xs h-9 rounded-xl cursor-pointer"
              >
                إلغاء
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

      </div>
    </DashboardLayout>
  );
}
