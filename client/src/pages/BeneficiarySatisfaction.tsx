import { useState, useMemo } from "react";
import { Link } from "wouter";
import DashboardLayout from "@/components/DashboardLayout";
import { 
  HeartHandshake, 
  Star, 
  Search, 
  Calendar, 
  Building2, 
  MessageSquare, 
  Eye, 
  ExternalLink, 
  CheckCircle2, 
  Layers, 
  X,
  FileText
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter } from "@/components/ui/dialog";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { PROGRAM_LABELS } from "@shared/constants";

export default function BeneficiarySatisfaction() {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRating, setSelectedRating] = useState<string>("all");
  const [selectedProgram, setSelectedProgram] = useState<string>("all");
  const [selectedEval, setSelectedEval] = useState<any | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  // استرجاع كافة التقييمات المسجلة والبرامج وتخصيص الاستمارة ديناميكياً
  const { data, isLoading } = trpc.requests.getAllBeneficiaryEvaluations.useQuery();
  const { data: evalFormConfig } = trpc.forms.getEvaluationFormConfig.useQuery();
  const { data: orgSettings } = trpc.organization.getSettings.useQuery();
  const { data: allPrograms = [] } = trpc.programs.getAll.useQuery();

  const mainLogoSrc = orgSettings?.logoUrl || '/logo.svg';

  // خريطة البرامج لجلب أسماء الخدمات ديناميكياً
  const programMap = useMemo(() => {
    const map = new Map<string, string>();
    allPrograms.forEach((p: any) => {
      map.set(p.code || String(p.id), p.nameAr || p.name);
    });
    return map;
  }, [allPrograms]);

  const getProgramLabel = (type?: string) => {
    if (!type) return "طلب خدمة";
    return programMap.get(type) || PROGRAM_LABELS[type as keyof typeof PROGRAM_LABELS] || type;
  };

  const allItems = data?.items || [];
  const stats = data?.stats || {
    totalEvaluations: 0,
    avgRating: 0,
    positivePercent: 0,
    withCommentsCount: 0,
    ratingCounts: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
  };

  // تصفية النتائج الحقيقية
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

  const activeFields = useMemo(() => {
    if (!evalFormConfig?.fields) return [];
    return [...evalFormConfig.fields]
      .filter((f) => f.isActive)
      .sort((a, b) => a.order - b.order);
  }, [evalFormConfig]);

  return (
    <DashboardLayout>
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


        </div>

        {/* KPI Cards - ديناميكية بالكامل بناءً على بيانات الاستبيانات الحقيقية */}
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
                    {stats.avgRating > 0 ? stats.avgRating : "0.0"}
                  </span>
                  <span className="text-xs font-bold text-muted-foreground">/ 5.0</span>
                </div>
                <div className="flex items-center gap-1 pt-0.5" dir="ltr">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star
                      key={s}
                      className={`w-3 h-3 ${
                        stats.avgRating > 0 && s <= Math.round(stats.avgRating)
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
                  %{stats.totalEvaluations > 0 ? stats.positivePercent : 0}
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
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
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

              {/* فلتر البرنامج - ديناميكي 100% من قاعدة البيانات */}
              <div className="w-full sm:w-48">
                <Select value={selectedProgram} onValueChange={setSelectedProgram}>
                  <SelectTrigger className="h-10 rounded-xl text-xs font-bold">
                    <SelectValue placeholder="تصفية حسب البرنامج" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">كل البرامج والخدمات</SelectItem>
                    {allPrograms.map((prog: any) => (
                      <SelectItem key={prog.code || String(prog.id)} value={prog.code || String(prog.id)}>
                        {prog.nameAr || prog.name}
                      </SelectItem>
                    ))}
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
                  {allItems.length === 0 
                    ? "لم يتم تسجيل أي استبيان تقييم بعد. ستظهر التقييمات هنا فور قيام المستفيدين بإرسال استبياناتهم." 
                    : "لم يتم العثور على أي استبيان تقييم وفق معايير البحث والفلترة المحددة."}
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
                              {getProgramLabel(item.programType)}
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
                            <div className="flex items-center justify-center gap-1.5">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleOpenDetails(item)}
                                className="h-8 px-2.5 text-xs font-bold gap-1 rounded-lg hover:bg-amber-500/10 hover:text-amber-700 hover:border-amber-500/30"
                              >
                                <Eye className="w-3.5 h-3.5" />
                                <span>عرض الاستبيان</span>
                              </Button>
                              <Link href={`/requests/${item.requestId}/evaluation`}>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-muted-foreground hover:text-primary rounded-lg"
                                  title="فتح صفحة الاستبيان كاملة"
                                >
                                  <ExternalLink className="w-3.5 h-3.5" />
                                </Button>
                              </Link>
                            </div>
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

        {/* Modal: Full Survey Details Styled Exactly Like RequestEvaluation */}
        <Dialog open={isDetailModalOpen} onOpenChange={setIsDetailModalOpen}>
          <DialogContent className="max-w-3xl sm:max-w-4xl w-[95vw] p-0 overflow-hidden rounded-2xl border border-border shadow-2xl" dir="rtl">
            {selectedEval && (
              <div className="font-sans">
                {/* 1. Header Banner مع الشعار مثل صفحة التقييم */}
                <div
                  className="text-white p-6 sm:p-8 flex flex-col items-center justify-center relative shadow-inner"
                  style={{ backgroundColor: evalFormConfig?.headerBgColor || "#14707a" }}
                >
                  <img 
                    src={mainLogoSrc} 
                    alt="شعار الجمعية" 
                    className="h-16 sm:h-20 w-auto object-contain brightness-0 invert"
                  />
                  <div className="absolute left-4 sm:left-6 top-4 sm:top-6">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs sm:text-sm font-bold bg-white/20 backdrop-blur-md text-white border border-white/30">
                      <Star className="w-4 h-4 fill-amber-300 text-amber-300" />
                      <span>{selectedEval.rating} من 5 نجوم</span>
                    </span>
                  </div>
                </div>

                {/* 2. العنوان والتفاصيل */}
                <div className="p-6 sm:p-8 space-y-6 max-h-[75vh] overflow-y-auto">
                  <div className="text-center space-y-2">
                    <h2 className="text-xl sm:text-2xl font-bold text-foreground">
                      {evalFormConfig?.title || "قياس رضا المستفيدين من خدمات الجمعية"}
                    </h2>
                    <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed max-w-2xl mx-auto">
                      {evalFormConfig?.description || "نرحب بكم في استبيان قياس رضا المستفيدين لجمعية عمارة المساجد (منارة). نسعى من خلال هذا الاستبيان إلى فهم آرائكم واقتراحاتكم، حيث إن مشاركتكم تساعدنا في تحسين وتطوير خدماتنا لتلبية تطلعاتكم بشكل أفضل. نؤكد لكم أن إكمال الاستبيان لن يستغرق أكثر من دقيقتين من وقتكم. شكرًا لكم على وقتكم وتعاونكم"}
                    </p>
                    <div className="pt-2 flex items-center justify-center gap-2.5 flex-wrap text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-muted border border-border font-mono font-bold text-foreground text-xs">
                        <FileText className="w-3.5 h-3.5 text-primary" />
                        {selectedEval.requestNumber}
                      </span>
                      <span>•</span>
                      <span className="inline-flex items-center gap-1.5 font-medium">
                        <Building2 className="w-3.5 h-3.5 text-primary" />
                        {selectedEval.serviceName}
                      </span>
                      <span>•</span>
                      <span className="inline-flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-primary" />
                        {new Date(selectedEval.evaluatedAt).toLocaleDateString("ar-SA")}
                      </span>
                    </div>
                  </div>

                  <hr className="border-t border-dotted border-border" />

                  {/* 3. عرض جميع الحقول المخصصة والنشطة كما في صفحة الاستبيان */}
                  <div className="space-y-4">
                    {activeFields.map((field) => {
                      // استخراج الإجابة
                      let value = selectedEval.answers?.[field.id];
                      if (value === undefined) {
                        if (field.id === "beneficiaryName") value = selectedEval.requesterName;
                        else if (field.id === "beneficiaryPhone") value = selectedEval.requesterPhone;
                        else if (field.id === "beneficiaryEmail") value = selectedEval.requesterEmail;
                        else if (field.id === "serviceName") value = selectedEval.serviceName;
                        else if (field.id === "servicesRating") value = selectedEval.servicesRating;
                        else if (field.id === "speedRating") value = selectedEval.speedRating;
                        else if (field.id === "communicationRating") value = selectedEval.communicationRating;
                        else if (field.id === "overallSatisfaction") value = selectedEval.overallSatisfaction || selectedEval.rating;
                        else if (field.id === "comments") value = selectedEval.comments;
                      }

                      if (value === undefined || value === null || value === "") return null;

                      return (
                        <div key={field.id} className="p-4 sm:p-5 rounded-2xl bg-muted/30 border border-border/70 space-y-2 text-right">
                          <span className="text-xs sm:text-sm font-bold text-foreground block">
                            {field.label}
                          </span>

                          {/* تقييم بالنجوم */}
                          {field.type === "rating" && (
                            <div className="flex items-center gap-1.5 py-1 justify-end" dir="ltr">
                              {Array.from({ length: field.maxRating || 5 }).map((_, sIdx) => {
                                const starVal = sIdx + 1;
                                const active = Number(value) >= starVal;
                                return (
                                  <Star
                                    key={starVal}
                                    className={`w-7 h-7 ${
                                      active
                                        ? "text-amber-400 fill-amber-400 drop-shadow-[0_1px_2px_rgba(251,191,36,0.5)]"
                                        : "text-muted-foreground/20 fill-none"
                                    }`}
                                  />
                                );
                              })}
                              <span className="text-xs sm:text-sm font-bold text-amber-700 dark:text-amber-300 mr-2">
                                {value} من {field.maxRating || 5}
                              </span>
                            </div>
                          )}

                          {/* خيارات أو قوائم */}
                          {["select", "radio"].includes(field.type) && (
                            <div className="font-bold text-xs sm:text-sm text-foreground bg-card p-3 rounded-xl border border-border/60">
                              {field.options?.find((o) => o.value === value)?.label || String(value)}
                            </div>
                          )}

                          {/* نصوص / هاتف / بريد / رقم */}
                          {["text", "phone", "email", "number"].includes(field.type) && (
                            <div className="font-bold text-xs sm:text-sm text-foreground bg-card p-3 rounded-xl border border-border/60" dir={field.type === "phone" || field.type === "email" ? "ltr" : "rtl"}>
                              {String(value)}
                            </div>
                          )}

                          {/* نص طويل / ملاحظات */}
                          {field.type === "textarea" && (
                            <div className="p-3.5 rounded-xl bg-amber-500/5 border border-amber-500/20 text-xs sm:text-sm italic text-foreground leading-relaxed">
                              "{String(value)}"
                            </div>
                          )}

                          {/* مربع اختيار */}
                          {field.type === "checkbox" && (
                            <div className="font-bold text-xs sm:text-sm text-foreground bg-card p-3 rounded-xl border border-border/60">
                              {value ? "نعم / أوافق" : "لا"}
                            </div>
                          )}
                        </div>
                      );
                    })}

                    {/* في حال وجود تعليقات إضافية غير مدرجة بالحقول */}
                    {selectedEval.comments && !activeFields.some((f) => f.id === "comments") && (
                      <div className="p-4 sm:p-5 rounded-2xl bg-amber-500/10 border border-amber-500/20 space-y-1.5 text-right">
                        <span className="text-xs sm:text-sm font-bold text-amber-800 dark:text-amber-300 block flex items-center gap-1.5">
                          <MessageSquare className="w-4 h-4" />
                          <span>آراء ومقترحات المستفيد:</span>
                        </span>
                        <p className="text-xs sm:text-sm text-foreground italic leading-relaxed">
                          "{selectedEval.comments}"
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                <DialogFooter className="p-4 bg-muted/20 border-t border-border flex justify-between sm:justify-between items-center">
                  <Link href={`/requests/${selectedEval.requestId}/evaluation`}>
                    <Button variant="outline" size="sm" className="gap-1.5 text-xs font-bold rounded-xl">
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>فتح صفحة الاستبيان</span>
                    </Button>
                  </Link>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setIsDetailModalOpen(false)}
                    className="text-xs font-bold rounded-xl"
                  >
                    إغلاق
                  </Button>
                </DialogFooter>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
