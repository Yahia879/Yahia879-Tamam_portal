import { useState, useMemo } from "react";
import { Link } from "wouter";
import { 
  HeartHandshake, 
  Star, 
  Search, 
  Filter, 
  Calendar, 
  User, 
  Phone, 
  Mail, 
  Building2, 
  MessageSquare, 
  Eye, 
  ExternalLink, 
  TrendingUp, 
  CheckCircle2, 
  Layers, 
  ArrowUpDown, 
  RefreshCw,
  Clock,
  Sparkles,
  SlidersHorizontal,
  X
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { PROGRAM_LABELS } from "@shared/constants";

const translateProgram = (type?: string) => {
  if (!type) return "طلب خدمة";
  return PROGRAM_LABELS[type as keyof typeof PROGRAM_LABELS] || type;
};

export default function BeneficiarySatisfaction() {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRating, setSelectedRating] = useState<string>("all");
  const [selectedProgram, setSelectedProgram] = useState<string>("all");
  const [selectedEval, setSelectedEval] = useState<any | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  // استرجاع كافة التقييمات المسجلة
  const { data, isLoading, refetch, isFetching } = trpc.requests.getAllBeneficiaryEvaluations.useQuery();
  const { data: evalFormConfig } = trpc.forms.getEvaluationFormConfig.useQuery();

  const allItems = data?.items || [];
  const stats = data?.stats || {
    totalEvaluations: 0,
    avgRating: 0,
    positivePercent: 0,
    withCommentsCount: 0,
    ratingCounts: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
  };

  // تصفية النتائج
  const filteredItems = useMemo(() => {
    return allItems.filter((item) => {
      // بحث نصي
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchReq = item.requestNumber?.toLowerCase().includes(q);
        const matchName = item.requesterName?.toLowerCase().includes(q);
        const matchPhone = item.requesterPhone?.toLowerCase().includes(q);
        const matchService = item.serviceName?.toLowerCase().includes(q);
        const matchMosque = item.mosqueName?.toLowerCase().includes(q);
        const matchComments = item.comments?.toLowerCase().includes(q);

        if (!matchReq && !matchName && !matchPhone && !matchService && !matchMosque && !matchComments) {
          return false;
        }
      }

      // فلترة بالنجوم
      if (selectedRating !== "all") {
        const ratingNum = parseInt(selectedRating, 10);
        if (Math.round(item.rating) !== ratingNum) {
          return false;
        }
      }

      // فلترة بالبرنامج
      if (selectedProgram !== "all") {
        if (item.programType !== selectedProgram) {
          return false;
        }
      }

      return true;
    });
  }, [allItems, searchQuery, selectedRating, selectedProgram]);

  const handleOpenDetails = (evalItem: any) => {
    setSelectedEval(evalItem);
    setIsDetailModalOpen(true);
  };

  return (
    <div className="space-y-6 pb-12" dir="rtl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card p-5 sm:p-6 rounded-2xl border border-border/80 shadow-xs">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/15 dark:bg-amber-500/25 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/30 shadow-xs">
            <HeartHandshake className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-foreground">
              رضا المستفيدين
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
              متابعة استبيانات قياس رضا المستفيدين، تقييمات الخدمات، والآراء والمقترحات الواردة
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-center">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
            className="h-9 px-3 text-xs font-bold gap-1.5 rounded-xl"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? "animate-spin" : ""}`} />
            <span>تحديث</span>
          </Button>
          <Link href="/forms-customization/evaluation">
            <Button
              size="sm"
              className="h-9 px-3.5 text-xs font-bold bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl shadow-xs gap-1.5"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>تخصيص الاستمارة</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* إجمالي التقييمات */}
        <Card className="rounded-2xl border border-border/80 shadow-xs bg-card overflow-hidden">
          <CardContent className="p-4 sm:p-5 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs font-semibold text-muted-foreground block">إجمالي التقييمات</span>
              <span className="text-2xl sm:text-3xl font-black text-foreground block">
                {stats.totalEvaluations}
              </span>
              <span className="text-[11px] text-muted-foreground block">
                استبيان مكتمل من المستفيدين
              </span>
            </div>
            <div className="w-11 h-11 rounded-2xl bg-blue-500/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 border border-blue-500/20">
              <Layers className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        {/* متوسط الرضا العام */}
        <Card className="rounded-2xl border border-border/80 shadow-xs bg-card overflow-hidden">
          <CardContent className="p-4 sm:p-5 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs font-semibold text-muted-foreground block">متوسط الرضا العام</span>
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl sm:text-3xl font-black text-amber-500">
                  {stats.avgRating || "0.0"}
                </span>
                <span className="text-xs font-bold text-muted-foreground">/ 5.0</span>
              </div>
              <div className="flex items-center gap-1 pt-0.5" dir="ltr">
                {[1, 2, 3, 4, 5].map((s) => (
                  <Star
                    key={s}
                    className={`w-3 h-3 ${
                      s <= Math.round(stats.avgRating || 0)
                        ? "text-amber-500 fill-amber-500"
                        : "text-muted-foreground/20 fill-none"
                    }`}
                  />
                ))}
              </div>
            </div>
            <div className="w-11 h-11 rounded-2xl bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/20">
              <Star className="w-5 h-5 fill-amber-500 text-amber-500" />
            </div>
          </CardContent>
        </Card>

        {/* نسبة الرضا الإيجابي */}
        <Card className="rounded-2xl border border-border/80 shadow-xs bg-card overflow-hidden">
          <CardContent className="p-4 sm:p-5 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs font-semibold text-muted-foreground block">نسبة الرضا الإيجابي</span>
              <span className="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400 block">
                %{stats.positivePercent}
              </span>
              <span className="text-[11px] text-muted-foreground block">
                تقييمات 4 و 5 نجوم
              </span>
            </div>
            <div className="w-11 h-11 rounded-2xl bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/20">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        {/* الآراء والمقترحات */}
        <Card className="rounded-2xl border border-border/80 shadow-xs bg-card overflow-hidden">
          <CardContent className="p-4 sm:p-5 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs font-semibold text-muted-foreground block">الملاحظات والمقترحات</span>
              <span className="text-2xl sm:text-3xl font-black text-purple-600 dark:text-purple-400 block">
                {stats.withCommentsCount}
              </span>
              <span className="text-[11px] text-muted-foreground block">
                مستفيد قدّم ملاحظات تفصيلية
              </span>
            </div>
            <div className="w-11 h-11 rounded-2xl bg-purple-500/10 dark:bg-purple-500/20 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0 border border-purple-500/20">
              <MessageSquare className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter and Search Bar */}
      <Card className="rounded-2xl border border-border/80 shadow-xs bg-card">
        <CardContent className="p-4 space-y-3">
          <div className="flex flex-col md:flex-row items-center gap-3">
            {/* بحث نصي */}
            <div className="relative w-full md:flex-1">
              <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="ابحث برقم الطلب، اسم المستفيد، الجوال، المسجد، أو الملاحظات..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pr-9 h-10 rounded-xl text-xs"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* فلتر النجوم */}
            <div className="w-full sm:w-48">
              <Select value={selectedRating} onValueChange={setSelectedRating}>
                <SelectTrigger className="h-10 rounded-xl text-xs font-bold">
                  <SelectValue placeholder="تصفية حسب النجوم" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">كل التقييمات</SelectItem>
                  <SelectItem value="5">5 نجوم ★★★★★</SelectItem>
                  <SelectItem value="4">4 نجوم ★★★★</SelectItem>
                  <SelectItem value="3">3 نجوم ★★★</SelectItem>
                  <SelectItem value="2">نجمتان ★★</SelectItem>
                  <SelectItem value="1">نجمة واحدة ★</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* فلتر البرنامج */}
            <div className="w-full sm:w-48">
              <Select value={selectedProgram} onValueChange={setSelectedProgram}>
                <SelectTrigger className="h-10 rounded-xl text-xs font-bold">
                  <SelectValue placeholder="تصفية حسب البرنامج" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">كل البرامج</SelectItem>
                  <SelectItem value="bunyan">بنيان</SelectItem>
                  <SelectItem value="enaya">عناية</SelectItem>
                  <SelectItem value="kasswa">كسوة</SelectItem>
                  <SelectItem value="tathir">تطهير</SelectItem>
                  <SelectItem value="sakina">سكينة</SelectItem>
                  <SelectItem value="fursh">فرش</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Evaluations List Table */}
      <Card className="rounded-2xl border border-border/80 shadow-xs bg-card overflow-hidden">
        <CardHeader className="p-4 sm:p-5 border-b border-border/80 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base font-bold text-foreground">
              سجل استبيانات التقييم
            </CardTitle>
            <CardDescription className="text-xs">
              عرض {filteredItems.length} من أصل {allItems.length} تقييم
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-12 text-center text-muted-foreground text-xs">
              جاري تحميل تقييمات رضا المستفيدين...
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="p-12 text-center space-y-2">
              <HeartHandshake className="w-12 h-12 mx-auto text-muted-foreground/40" />
              <p className="text-sm font-bold text-foreground">لا توجد تقييمات مطابقة</p>
              <p className="text-xs text-muted-foreground">
                لم يتم العثور على أي استبيان تقييم وفق معايير البحث والفلترة المحددة.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="border-b border-border bg-muted/40 text-muted-foreground font-semibold">
                    <th className="p-3.5 px-4">رقم الطلب</th>
                    <th className="p-3.5 px-4">المستفيد</th>
                    <th className="p-3.5 px-4">الخدمة / المسجد</th>
                    <th className="p-3.5 px-4 text-center">التقييم</th>
                    <th className="p-3.5 px-4">الآراء والملاحظات</th>
                    <th className="p-3.5 px-4">تاريخ التقييم</th>
                    <th className="p-3.5 px-4 text-center">الإجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {filteredItems.map((item) => {
                    const ratingNum = Math.max(1, Math.min(5, Math.round(item.rating || 5)));
                    return (
                      <tr key={item.id} className="hover:bg-muted/30 transition-colors">
                        {/* رقم الطلب */}
                        <td className="p-3.5 px-4 font-mono font-bold text-foreground">
                          <Link href={`/requests/${item.requestId}`}>
                            <span className="text-primary hover:underline cursor-pointer flex items-center gap-1">
                              <span>{item.requestNumber}</span>
                              <ExternalLink className="w-3 h-3 inline" />
                            </span>
                          </Link>
                          <span className="text-[10px] text-muted-foreground font-normal block font-sans">
                            {translateProgram(item.programType)}
                          </span>
                        </td>

                        {/* المستفيد */}
                        <td className="p-3.5 px-4">
                          <div className="space-y-0.5">
                            <span className="font-bold text-foreground block truncate max-w-[150px]">
                              {item.requesterName}
                            </span>
                            {item.requesterPhone && (
                              <span className="text-[11px] text-muted-foreground font-mono block" dir="ltr">
                                {item.requesterPhone}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* الخدمة / المسجد */}
                        <td className="p-3.5 px-4">
                          <span className="font-medium text-foreground block truncate max-w-[180px]">
                            {item.serviceName}
                          </span>
                        </td>

                        {/* التقييم */}
                        <td className="p-3.5 px-4 text-center">
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-300 font-bold">
                            <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                            <span>{ratingNum} / 5</span>
                          </div>
                        </td>

                        {/* الآراء والملاحظات */}
                        <td className="p-3.5 px-4 max-w-xs">
                          {item.comments ? (
                            <p className="text-muted-foreground italic truncate text-xs">
                              "{item.comments}"
                            </p>
                          ) : (
                            <span className="text-muted-foreground/50 text-[11px]">لا توجد ملاحظات</span>
                          )}
                        </td>

                        {/* التاريخ */}
                        <td className="p-3.5 px-4 text-muted-foreground text-[11px] whitespace-nowrap">
                          {new Date(item.evaluatedAt).toLocaleDateString("ar-SA")}
                        </td>

                        {/* الإجراءات */}
                        <td className="p-3.5 px-4 text-center whitespace-nowrap">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenDetails(item)}
                            className="h-8 px-2.5 text-xs font-bold gap-1 rounded-lg"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>عرض الاستبيان</span>
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal: Full Survey Details */}
      <Dialog open={isDetailModalOpen} onOpenChange={setIsDetailModalOpen}>
        <DialogContent className="max-w-2xl text-right p-6 rounded-2xl" dir="rtl">
          <DialogHeader className="text-right pb-3 border-b border-border">
            <div className="flex items-center justify-between gap-2">
              <DialogTitle className="text-lg font-black text-foreground flex items-center gap-2">
                <HeartHandshake className="w-5 h-5 text-amber-500" />
                <span>تفاصيل تقييم رضا المستفيد</span>
              </DialogTitle>
              {selectedEval && (
                <div className="flex items-center gap-1 bg-amber-50 dark:bg-amber-950/40 p-1.5 px-3 rounded-xl border border-amber-200 dark:border-amber-800" dir="ltr">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star
                      key={s}
                      className={`w-4 h-4 ${
                        s <= Math.round(selectedEval.rating || 5)
                          ? "text-amber-500 fill-amber-500"
                          : "text-muted-foreground/20 fill-none"
                      }`}
                    />
                  ))}
                  <span className="text-xs font-bold text-amber-800 dark:text-amber-300 mr-1.5">
                    {selectedEval.rating}/5
                  </span>
                </div>
              )}
            </div>
            <DialogDescription className="text-xs text-muted-foreground pt-1">
              طلب رقم: {selectedEval?.requestNumber} ({translateProgram(selectedEval?.programType)})
            </DialogDescription>
          </DialogHeader>

          {selectedEval && (
            <div className="space-y-4 py-2 text-xs max-h-[65vh] overflow-y-auto pl-1">
              {/* بيانات مقدم التقييم */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div className="p-2.5 rounded-xl bg-muted/40 border border-border/70 space-y-0.5">
                  <span className="text-[11px] text-muted-foreground font-medium block">اسم المستفيد:</span>
                  <span className="font-bold text-foreground block">{selectedEval.requesterName}</span>
                </div>
                <div className="p-2.5 rounded-xl bg-muted/40 border border-border/70 space-y-0.5">
                  <span className="text-[11px] text-muted-foreground font-medium block">رقم الجوال:</span>
                  <span className="font-bold text-foreground block font-mono" dir="ltr">
                    {selectedEval.requesterPhone || "—"}
                  </span>
                </div>
                <div className="p-2.5 rounded-xl bg-muted/40 border border-border/70 space-y-0.5">
                  <span className="text-[11px] text-muted-foreground font-medium block">البريد الإلكتروني:</span>
                  <span className="font-bold text-foreground block font-mono" dir="ltr">
                    {selectedEval.requesterEmail || "—"}
                  </span>
                </div>
                <div className="p-2.5 rounded-xl bg-muted/40 border border-border/70 space-y-0.5">
                  <span className="text-[11px] text-muted-foreground font-medium block">الخدمة / المسجد:</span>
                  <span className="font-bold text-foreground block">{selectedEval.serviceName}</span>
                </div>
              </div>

              {/* محاور التقييم التفصيلية */}
              {(() => {
                const metrics = [
                  { label: "جودة ومستوى الخدمة", val: selectedEval.servicesRating },
                  { label: "سرعة الاستجابة والتنفيذ", val: selectedEval.speedRating },
                  { label: "سهولة التواصل والتعامل", val: selectedEval.communicationRating },
                  { label: "الرضا العام عن الجمعية", val: selectedEval.overallSatisfaction },
                ].filter((m) => typeof m.val === "number" && m.val > 0);

                if (metrics.length === 0) return null;

                return (
                  <div className="space-y-1.5 pt-2 border-t border-border">
                    <span className="font-bold text-foreground block">تقييم المحاور الرئيسية:</span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {metrics.map((m, idx) => (
                        <div key={idx} className="p-2.5 rounded-xl bg-amber-500/5 border border-amber-500/20 flex items-center justify-between">
                          <span className="text-[11px] font-medium text-foreground">{m.label}</span>
                          <div className="flex items-center gap-1" dir="ltr">
                            {[1, 2, 3, 4, 5].map((s) => (
                              <Star
                                key={s}
                                className={`w-3 h-3 ${
                                  s <= Number(m.val)
                                    ? "text-amber-500 fill-amber-500"
                                    : "text-muted-foreground/20 fill-none"
                                }`}
                              />
                            ))}
                            <span className="text-xs font-bold text-amber-700 dark:text-amber-300 mr-1">
                              {m.val}/5
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}

              {/* جميع الأسئلة والإجابات المخصصة */}
              {(() => {
                const answers = selectedEval.answers || {};
                const standardKeys = ["beneficiaryName", "beneficiaryPhone", "beneficiaryEmail", "serviceName", "servicesRating", "speedRating", "communicationRating", "overallSatisfaction", "comments", "notes", "answers"];
                const fieldsDef = evalFormConfig?.fields || [];
                const customAnswerEntries = Object.entries(answers).filter(([k, v]) => !standardKeys.includes(k) && v !== undefined && v !== null && v !== "");

                if (customAnswerEntries.length === 0) return null;

                return (
                  <div className="space-y-2 pt-2 border-t border-border">
                    <span className="font-bold text-foreground block">إجابات استبيان التقييم:</span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {customAnswerEntries.map(([k, v]) => {
                        const fDef = fieldsDef.find((f) => f.id === k);
                        const qLabel = fDef?.label || k;

                        if (fDef?.type === "rating" || (typeof v === "number" && v >= 1 && v <= 5 && (k.includes("rating") || k.includes("eval")))) {
                          return (
                            <div key={k} className="p-2.5 rounded-xl bg-background border border-border/80 space-y-1">
                              <span className="text-[11px] text-muted-foreground block">{qLabel}</span>
                              <div className="flex items-center gap-1" dir="ltr">
                                {Array.from({ length: fDef?.maxRating || 5 }).map((_, i) => (
                                  <Star
                                    key={i}
                                    className={`w-3.5 h-3.5 ${
                                      i < Number(v) ? "text-amber-500 fill-amber-500" : "text-muted-foreground/20 fill-none"
                                    }`}
                                  />
                                ))}
                                <span className="text-xs font-bold text-foreground mr-1">{String(v)}</span>
                              </div>
                            </div>
                          );
                        }

                        if (fDef?.options && fDef.options.length > 0) {
                          const matchedOpt = fDef.options.find((o) => o.value === v);
                          const displayVal = matchedOpt?.label || String(v);
                          return (
                            <div key={k} className="p-2.5 rounded-xl bg-background border border-border/80 space-y-1">
                              <span className="text-[11px] text-muted-foreground block">{qLabel}</span>
                              <span className="font-bold text-foreground block">{displayVal}</span>
                            </div>
                          );
                        }

                        return (
                          <div key={k} className="p-2.5 rounded-xl bg-background border border-border/80 space-y-1">
                            <span className="text-[11px] text-muted-foreground block">{qLabel}</span>
                            <span className="font-bold text-foreground block">
                              {typeof v === "boolean" ? (v ? "نعم / أوافق" : "لا") : String(v)}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}

              {/* الملاحظات والآراء */}
              {selectedEval.comments && (
                <div className="pt-2 border-t border-border">
                  <div className="p-3.5 rounded-xl bg-amber-500/5 dark:bg-amber-500/10 border border-amber-500/20 space-y-1">
                    <span className="font-bold text-amber-800 dark:text-amber-300 block flex items-center gap-1.5">
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>آراء ومقترحات المستفيد:</span>
                    </span>
                    <p className="text-foreground italic leading-relaxed text-xs sm:text-sm">
                      "{selectedEval.comments}"
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          <DialogFooter className="pt-3 border-t border-border flex justify-between sm:justify-between">
            {selectedEval && (
              <Link href={`/requests/${selectedEval.requestId}`}>
                <Button variant="outline" size="sm" className="gap-1.5 text-xs font-bold rounded-xl">
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>الذهاب لصفحة الطلب</span>
                </Button>
              </Link>
            )}
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setIsDetailModalOpen(false)}
              className="text-xs font-bold rounded-xl"
            >
              إغلاق
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
