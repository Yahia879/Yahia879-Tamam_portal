import { useEffect, useMemo } from "react";
import { useLocation } from "wouter";
import DashboardLayout from "@/components/DashboardLayout";
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
} from "lucide-react";
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

export default function FundPage() {
  const [, navigate] = useLocation();
  const query = window.location.search;
  const showAllMovements = new URLSearchParams(query).get("view") === "movements";

  useEffect(() => {
    const params = new URLSearchParams(query);
    if (params.has("projectId") && params.has("source")) {
      navigate(`/fund/transfers/new${query}`);
    }
  }, [navigate, query]);

  const { data: summary, isLoading } = trpc.fund.summary.useQuery();
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
      summary?.buckets.find((b) => b.restrictionType === "general") || {
        restrictionType: "general" as const,
        posted: 0,
        reserved: 0,
        available: 0,
      },
    [summary]
  );

  const purposeBuckets = useMemo(
    () => (summary?.buckets || []).filter((b) => b.restrictionType === "purpose"),
    [summary]
  );

  const projectBuckets = useMemo(
    () => (summary?.buckets || []).filter((b) => b.restrictionType === "project"),
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
        {movement.notes && <p className="mt-0.5 text-xs text-muted-foreground">{movement.notes}</p>}
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
          <span className="font-sans text-xs font-bold">ريال</span>
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
            <Button variant="outline" size="sm" onClick={() => navigate("/fund?view=movements")}>عرض الكل</Button>
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

          <div className="flex items-center gap-2 flex-wrap">
            <Button onClick={() => navigate("/fund/transfers/new")} className="bg-indigo-700 hover:bg-indigo-800 text-white font-bold">
              <ArrowRightLeft className="w-4 h-4 ml-2" />
              تحويل من مشروع
            </Button>
          </div>
        </div>

        {/* 1. الحساب العام (الرصيد غير المقيد) - الأوضح والأبرز */}
        <div className="rounded-2xl border-2 border-emerald-500/50 bg-gradient-to-br from-emerald-50 via-teal-50/30 to-white p-5 sm:p-6 shadow-sm relative overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-emerald-100">
            <div className="flex items-start sm:items-center">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-xl sm:text-2xl font-black text-emerald-950">
                    الحساب العام (الرصيد غير المقيد)
                  </h2>
                </div>
                <p className="text-xs sm:text-sm text-emerald-800/80 mt-1">
                  رصيد التبرعات العامة غير المشروطة، متاح للصرف المباشر على جميع المشاريع والأنشطة الإدارية والتشغيلية.
                </p>
              </div>
            </div>

          </div>

          {/* تفاصيل أرقام الحساب العام */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 pt-4">
            <div className="p-4 rounded-xl bg-white/95 border-2 border-emerald-300 shadow-xs">
              <span className="text-xs font-bold text-emerald-900 block">الرصيد المتاح الفعلي للصرف</span>
              <span className="text-2xl sm:text-3xl font-black text-emerald-700 mt-1 block font-sans">
                {isLoading ? "..." : format(generalBucket.available)}{" "}
                <span className="text-sm font-bold font-sans">ريال</span>
              </span>
              <span className="text-[11px] text-emerald-800/70 block mt-1">متاح للصرف المباشر فوراً</span>
            </div>

            <div className="p-4 rounded-xl bg-white/80 border border-emerald-100 shadow-xs">
              <span className="text-xs font-semibold text-slate-600 block">إجمالي المقبوض المسجل</span>
              <span className="text-lg sm:text-xl font-bold text-slate-800 mt-1 block font-sans">
                {isLoading ? "..." : format(generalBucket.posted)}{" "}
                <span className="text-xs font-medium font-sans">ريال</span>
              </span>
              <span className="text-[11px] text-muted-foreground block mt-1">إجمالي الإيداعات غير المقيدة</span>
            </div>

            <div className="p-4 rounded-xl bg-white/80 border border-emerald-100 shadow-xs">
              <span className="text-xs font-semibold text-slate-600 block">المحجوز لطلبات الصرف</span>
              <span className="text-lg sm:text-xl font-bold text-amber-700 mt-1 block font-sans">
                {isLoading ? "..." : format(generalBucket.reserved)}{" "}
                <span className="text-xs font-medium font-sans">ريال</span>
              </span>
              <span className="text-[11px] text-muted-foreground block mt-1">طلبات قيد المراجعة والاعتماد</span>
            </div>
          </div>
        </div>

        {/* 2. تحته: التصنيفات والأرصدة المقيدة */}
        <Card className="shadow-xs border-slate-200 bg-slate-50">
          <CardHeader className="border-b border-slate-200 bg-transparent pb-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0">
                  <Layers className="w-5 h-5" />
                </div>
                <div>
                  <CardTitle className="text-base sm:text-lg font-bold text-slate-900">
                    التصنيفات ومصارف التبرع (الأرصدة المقيدة)
                  </CardTitle>
                  <CardDescription className="text-xs mt-0.5">
                    أرصدة تبرعات مقيدة بشروط الداعمين لمصارف محددة أو فوائض مشاريع مخصصة ولا يمكن صرفها خارج قيدها
                  </CardDescription>
                </div>
              </div>
              <Badge variant="outline" className="text-indigo-800 border-indigo-200 bg-indigo-50 font-bold self-start sm:self-auto text-xs py-1 px-2.5">
                {purposeBuckets.length + projectBuckets.length} تصنيف / قيد مقيد
              </Badge>
            </div>
          </CardHeader>

          <CardContent className="pt-5 space-y-6">
            {/* مصارف التبرع المقيدة */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Tag className="w-4 h-4 text-indigo-600" />
                <h3 className="text-sm font-bold text-slate-800">أرصدة مصارف التبرع المسجلة</h3>
              </div>

              {purposeBuckets.length === 0 ? (
                <div className="p-4 rounded-xl bg-slate-50 border border-dashed text-center text-xs text-muted-foreground">
                  لا توجد أرصدة مقيدة بمصارف تبرع حالياً (جميع التبرعات مقبوضة في الحساب العام أو المشاريع مباشرة).
                </div>
              ) : (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                  {purposeBuckets.map((bucket, index) => (
                    <div
                      key={index}
                      className="rounded-xl border border-indigo-100 bg-indigo-50/20 p-4 hover:border-indigo-300 transition-all shadow-2xs flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2 pb-2 border-b border-indigo-100/60">
                          <span className="font-bold text-sm text-indigo-950 flex items-center gap-1.5 truncate">
                            <span className="w-2 h-2 rounded-full bg-indigo-600 shrink-0"></span>
                            <span className="truncate">{bucket.donationPurposeName || "مصرف تبرع"}</span>
                          </span>
                          <Badge className="bg-indigo-100 text-indigo-800 hover:bg-indigo-100 border-indigo-200 text-[10px] font-bold shrink-0">
                            مقيد بمصرف
                          </Badge>
                        </div>

                        <div className="mt-3 space-y-1.5">
                          <div className="flex items-baseline justify-between">
                            <span className="text-xs text-muted-foreground">الرصيد المتاح:</span>
                            <span className="text-lg font-black text-indigo-950 font-sans">
                              {format(bucket.available)}{" "}
                              <span className="text-xs font-normal">ريال</span>
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1 border-t border-indigo-50">
                            <span>الإجمالي: {format(bucket.posted)} ريال</span>
                            <span>المحجوز: {format(bucket.reserved)} ريال</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* فوائض المشاريع المقيدة بالصندوق */}
            {projectBuckets.length > 0 && (
              <div className="pt-4 border-t">
                <div className="flex items-center gap-2 mb-3">
                  <Building2 className="w-4 h-4 text-purple-600" />
                  <h3 className="text-sm font-bold text-slate-800">فوائض المشاريع المقيدة بالصندوق</h3>
                </div>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                  {projectBuckets.map((bucket, index) => {
                    const proj = projects.find((p) => p.id === bucket.restrictedProjectId);
                    return (
                      <div
                        key={index}
                        className="rounded-xl border border-purple-100 bg-purple-50/20 p-4 hover:border-purple-300 transition-all shadow-2xs flex flex-col justify-between"
                      >
                        <div>
                          <div className="flex items-center justify-between gap-2 pb-2 border-b border-purple-100/60">
                            <span className="font-bold text-sm text-purple-950 truncate">
                              {proj
                                ? `${proj.projectNumber} - ${proj.name}`
                                : `مشروع #${bucket.restrictedProjectId}`}
                            </span>
                            <Badge className="bg-purple-100 text-purple-800 hover:bg-purple-100 border-purple-200 text-[10px] font-bold shrink-0">
                              مقيد بالمشروع
                            </Badge>
                          </div>

                          <div className="mt-3 space-y-1.5">
                            <div className="flex items-baseline justify-between">
                              <span className="text-xs text-muted-foreground">الرصيد المتاح:</span>
                              <span className="text-lg font-black text-purple-950 font-sans">
                                {format(bucket.available)}{" "}
                                <span className="text-xs font-normal">ريال</span>
                              </span>
                            </div>
                            <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1 border-t border-purple-50">
                              <span>الإجمالي: {format(bucket.posted)} ريال</span>
                              <span>المحجوز: {format(bucket.reserved)} ريال</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {movementHistoryCard}
      </div>
    </DashboardLayout>
  );
}
