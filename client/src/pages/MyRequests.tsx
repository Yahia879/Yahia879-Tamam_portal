import { useState, useMemo, useEffect } from "react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Building2, 
  FileText, 
  Plus, 
  Clock, 
  CheckCircle2, 
  ChevronLeft, 
  ChevronRight,
  Search, 
  Eye, 
  Calendar,
  X,
  RotateCcw,
  Sparkles,
  Loader2,
} from "lucide-react";
import { PROGRAM_LABELS } from "@shared/constants";
import { ProgramIcon } from "@/components/ProgramIcon";
import BeneficiaryLayout from "@/components/BeneficiaryLayout";

const PAGE_SIZE = 10;

// حساب نسبة التقدم بناءً على المراحل العشر (زيادة 10% في كل مرحلة)
const getProgressPercentage = (stage: string): number => {
  const stageProgress: Record<string, number> = {
    submitted: 10,
    initial_review: 20,
    field_visit: 30,
    technical_eval: 40,
    boq_preparation: 50,
    financial_eval: 60,
    financial_eval_and_approval: 60,
    quotation_approval: 65,
    contracting: 70,
    execution: 80,
    handover: 90,
    closed: 100,
  };
  return stageProgress[stage] || 10;
};

const getStageLabelAr = (stage: string): string => {
  const stageLabels: Record<string, string> = {
    submitted: "تقديم الطلب",
    initial_review: "المراجعة الأولية",
    field_visit: "الزيارة الميدانية",
    technical_eval: "التقييم والدراسة الفنية",
    boq_preparation: "إعداد جدول الكميات",
    financial_eval: "التقييم المالي",
    financial_eval_and_approval: "الاعتماد المالي",
    quotation_approval: "اعتماد العرض",
    contracting: "مرحلة التعاقد",
    execution: "مرحلة التنفيذ",
    handover: "مرحلة الاستلام",
    closed: "مكتمل ومغلق",
  };
  return stageLabels[stage] || "قيد المعالجة";
};

const getStatusBadge = (status: string) => {
  switch (status) {
    case "completed":
      return <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 font-bold text-xs">مكتمل</Badge>;
    case "in_progress":
      return <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/20 font-bold text-xs">قيد التنفيذ</Badge>;
    case "pending":
    case "under_review":
      return <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20 font-bold text-xs">قيد المراجعة</Badge>;
    case "rejected":
      return <Badge className="bg-red-500/10 text-red-600 border-red-500/20 font-bold text-xs">مرفوض</Badge>;
    case "cancelled":
      return <Badge className="bg-slate-500/10 text-slate-600 border-slate-500/20 font-bold text-xs">ملغى</Badge>;
    default:
      return <Badge variant="outline" className="font-bold text-xs">{status}</Badge>;
  }
};

export default function MyRequests() {
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusTab, setStatusTab] = useState<string>("all");
  const [programFilter, setProgramFilter] = useState<string>("all");
  const [page, setPage] = useState<number>(1);

  // البحث المؤجل لتخفيف الاستعلامات على الخادم
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm.trim());
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // إعادة الصفحة إلى الأولى عند تغيير الفلاتر أو البحث
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, statusTab, programFilter]);

  // جلب البرامج الفعالة
  const { data: activePrograms = [] } = trpc.programs.getActive.useQuery();

  // جلب طلبات المستخدم مع الفلترة والصفحات من الباك اند مباشرة
  const { data: myRequestsData, isLoading, isFetching } = trpc.requests.getMyRequests.useQuery({
    search: debouncedSearch || undefined,
    status: statusTab !== "all" ? statusTab : undefined,
    programType: programFilter !== "all" ? programFilter : undefined,
    page,
    limit: PAGE_SIZE,
  });

  // استخراج البيانات مع حماية كاملة ضد أي هيكل استجابة
  const requests = Array.isArray(myRequestsData)
    ? myRequestsData
    : (Array.isArray(myRequestsData?.requests) ? myRequestsData.requests : []);
  
  const total = typeof myRequestsData?.total === "number" ? myRequestsData.total : requests.length;
  const totalPages = typeof myRequestsData?.totalPages === "number" ? myRequestsData.totalPages : (Math.ceil(total / PAGE_SIZE) || 1);
  
  const stats = myRequestsData?.stats || {
    total: requests.length,
    pending: requests.filter((r: any) => r.status === "pending" || r.status === "under_review").length,
    inProgress: requests.filter((r: any) => r.status === "in_progress").length,
    completed: requests.filter((r: any) => r.status === "completed").length,
    rejected: requests.filter((r: any) => r.status === "rejected").length,
  };

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages && newPage !== page) {
      setPage(newPage);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handleClearFilters = () => {
    setSearchTerm("");
    setDebouncedSearch("");
    setStatusTab("all");
    setProgramFilter("all");
    setPage(1);
  };

  const isFiltering = debouncedSearch !== "" || statusTab !== "all" || programFilter !== "all";

  return (
    <BeneficiaryLayout
      activeTab="requests"
      title="سجل طلباتي"
      subtitle="استعراض ومتابعة حالات وتطورات كافة الخدمات المطلوبة"
      headerActions={
        <Link href="/request-form-dynamic">
          <Button className="rounded-2xl gradient-primary text-white font-bold gap-2 shadow-md hover:opacity-95">
            <Plus className="w-4 h-4" />
            <span>تقديم طلب جديد</span>
          </Button>
        </Link>
      }
    >
      {/* Search & Filter Toolbar */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-6">
        {/* Status Tabs Pills */}
        <div className="w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
          <div className="flex items-center gap-1.5 bg-muted/60 p-1.5 rounded-2xl border border-border/50 shrink-0">
            <button
              onClick={() => setStatusTab("all")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                statusTab === "all"
                  ? "bg-background text-primary shadow-xs border border-border/60"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              الكل ({stats.total})
            </button>
            <button
              onClick={() => setStatusTab("pending")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                statusTab === "pending"
                  ? "bg-background text-amber-600 shadow-xs border border-border/60"
                  : "text-muted-foreground hover:text-amber-600"
              }`}
            >
              قيد المراجعة ({stats.pending})
            </button>
            <button
              onClick={() => setStatusTab("in_progress")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                statusTab === "in_progress"
                  ? "bg-background text-blue-600 shadow-xs border border-border/60"
                  : "text-muted-foreground hover:text-blue-600"
              }`}
            >
              قيد التنفيذ ({stats.inProgress})
            </button>
            <button
              onClick={() => setStatusTab("completed")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                statusTab === "completed"
                  ? "bg-background text-emerald-600 shadow-xs border border-border/60"
                  : "text-muted-foreground hover:text-emerald-600"
              }`}
            >
              مكتملة ({stats.completed})
            </button>
            <button
              onClick={() => setStatusTab("rejected")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                statusTab === "rejected"
                  ? "bg-background text-red-600 shadow-xs border border-border/60"
                  : "text-muted-foreground hover:text-red-600"
              }`}
            >
              مرفوضة ({stats.rejected})
            </button>
          </div>
        </div>

        {/* Search Input & Program Filter */}
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="ابحث برقم الطلب أو المسجد..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pr-9 pl-8 rounded-2xl h-10 border-border/60 bg-background text-xs"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm("")}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1 rounded-full"
                title="مسح البحث"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <Select value={programFilter} onValueChange={setProgramFilter}>
            <SelectTrigger className="w-[150px] rounded-2xl h-10 border-border/60 bg-background text-xs">
              <SelectValue placeholder="نوع الخدمة" />
            </SelectTrigger>
            <SelectContent className="rounded-2xl">
              <SelectItem value="all">كل الخدمات</SelectItem>
              {activePrograms.length > 0 ? (
                activePrograms.map((prog) => (
                  <SelectItem key={prog.id} value={prog.id}>
                    {prog.name}
                  </SelectItem>
                ))
              ) : (
                <>
                  <SelectItem value="bunyan">بنيان (عمارة)</SelectItem>
                  <SelectItem value="siyanah">صيانة وتشغيل</SelectItem>
                  <SelectItem value="siqaya">سقاية وتأثيث</SelectItem>
                  <SelectItem value="furnishing">فرش وتطوير</SelectItem>
                </>
              )}
            </SelectContent>
          </Select>

          {isFiltering && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={handleClearFilters}
              className="h-10 w-10 rounded-2xl text-muted-foreground hover:text-destructive shrink-0"
              title="إعادة تعيين الفلاتر"
            >
              <RotateCcw className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Requests List */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 bg-muted/60 animate-pulse rounded-3xl" />
          ))}
        </div>
      ) : requests.length > 0 ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-4">
            {requests.map((request) => {
              const progress = getProgressPercentage(request.currentStage);
              const stageLabel = getStageLabelAr(request.currentStage);
              const requestDate = request.createdAt 
                ? new Date(request.createdAt).toLocaleDateString("ar-SA", { year: "numeric", month: "short", day: "numeric" })
                : null;

              return (
                <Card
                  key={request.id}
                  className="border border-border/60 shadow-xs hover:shadow-md transition-all rounded-3xl overflow-hidden bg-background group"
                >
                  <CardContent className="p-5 sm:p-6">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      {/* Program & Main Info */}
                      <div className="flex items-start sm:items-center gap-4 min-w-0">
                        <ProgramIcon program={request.programType} size="lg" showBackground />
                        <div className="min-w-0 space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="font-extrabold text-base sm:text-lg text-foreground group-hover:text-primary transition-colors">
                              {request.programName || PROGRAM_LABELS[request.programType] || request.programType}
                            </h3>
                            {getStatusBadge(request.status)}
                          </div>
                          <p className="text-xs text-muted-foreground font-medium flex flex-wrap items-center gap-2">
                            <span className="font-mono bg-muted/60 px-2 py-0.5 rounded-lg text-foreground font-bold">{request.requestNumber}</span>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              <Building2 className="w-3.5 h-3.5 text-primary/70" />
                              {request.mosqueName || "المسجد المحدد"}
                            </span>
                            {requestDate && (
                              <>
                                <span>•</span>
                                <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                                  <Calendar className="w-3 h-3 text-muted-foreground/70" />
                                  {requestDate}
                                </span>
                              </>
                            )}
                          </p>
                        </div>
                      </div>

                      {/* Progress Info & CTA */}
                      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 shrink-0 border-t md:border-t-0 border-border/40 pt-3 md:pt-0">
                        <div className="w-full sm:w-48 space-y-1.5">
                          <div className="flex justify-between items-center text-xs">
                            <span className="font-bold text-foreground">{stageLabel}</span>
                            <span className="font-mono font-extrabold text-primary">{progress}%</span>
                          </div>
                          <Progress value={progress} className="h-2 rounded-full" />
                        </div>

                        <Link href={`/requests/${request.id}`}>
                          <Button className="w-full sm:w-auto rounded-2xl font-bold text-xs gap-1.5 bg-muted/80 text-foreground hover:bg-primary hover:text-white transition-all h-10 px-4">
                            <Eye className="w-4 h-4" />
                            <span>عرض التفاصيل</span>
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Pagination Footer */}
          <div className="p-4 bg-muted/20 border border-border/60 rounded-3xl flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-xs text-muted-foreground text-center sm:text-right font-medium">
              عرض {(page - 1) * PAGE_SIZE + 1} - {Math.min(page * PAGE_SIZE, total)} من أصل {total} طلب
            </div>

            {totalPages > 1 && (
              <div className="flex items-center gap-1.5 overflow-x-auto max-w-full py-1">
                {/* Previous button (RTL: right arrow) */}
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8.5 w-8.5 rounded-xl shrink-0"
                  onClick={() => handlePageChange(page - 1)}
                  disabled={page === 1 || isFetching}
                  title="الصفحة السابقة"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>

                {/* Numbered Page Buttons */}
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => {
                  if (
                    totalPages <= 5 ||
                    p === 1 ||
                    p === totalPages ||
                    (p >= page - 1 && p <= page + 1)
                  ) {
                    return (
                      <Button
                        key={p}
                        variant={page === p ? "default" : "outline"}
                        size="sm"
                        className={`h-8.5 min-w-[34px] px-2.5 text-xs font-bold rounded-xl shrink-0 transition-all ${
                          page === p
                            ? "gradient-primary text-white border-0 shadow-xs"
                            : "hover:bg-muted"
                        }`}
                        onClick={() => handlePageChange(p)}
                        disabled={isFetching}
                      >
                        {p}
                      </Button>
                    );
                  } else if (
                    (p === page - 2 && page > 3) ||
                    (p === page + 2 && page < totalPages - 2)
                  ) {
                    return (
                      <span key={p} className="px-1 text-xs text-muted-foreground font-bold">
                        ...
                      </span>
                    );
                  }
                  return null;
                })}

                {/* Next button (RTL: left arrow) */}
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8.5 w-8.5 rounded-xl shrink-0"
                  onClick={() => handlePageChange(page + 1)}
                  disabled={page === totalPages || isFetching}
                  title="الصفحة التالية"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        </div>
      ) : (
        <Card className="border border-border/60 shadow-xs rounded-3xl p-12 text-center bg-background">
          <div className="w-16 h-16 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto mb-4">
            <FileText className="w-8 h-8" />
          </div>
          <h3 className="font-bold text-lg text-foreground mb-1">لا توجد طلبات تطابق بحثك</h3>
          <p className="text-xs text-muted-foreground mb-6 max-w-md mx-auto leading-relaxed">
            {isFiltering
              ? "جرّب تغيير معايير البحث أو تصفية الحالة لعرض النتائج المناسبة."
              : "لم تقم بتقديم أي طلبات خدمة بعد. يسعدنا تقديم الخدمة لمسجدك بتقديم طلب جديد."}
          </p>
          <div className="flex items-center justify-center gap-3">
            {isFiltering ? (
              <Button 
                variant="outline"
                onClick={handleClearFilters}
                className="rounded-2xl font-bold gap-2 px-5 h-11"
              >
                <RotateCcw className="w-4 h-4" />
                <span>إعادة ضبط الفلاتر</span>
              </Button>
            ) : (
              <Link href="/request-form-dynamic">
                <Button className="gradient-primary text-white font-bold rounded-2xl shadow-md gap-2 px-6 h-11">
                  <Plus className="w-4 h-4" />
                  <span>تقديم طلب جديد</span>
                </Button>
              </Link>
            )}
          </div>
        </Card>
      )}
    </BeneficiaryLayout>
  );
}
