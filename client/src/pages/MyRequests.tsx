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
  XCircle,
  AlertCircle,
  TrendingUp,
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
      return <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 font-bold text-[10px] sm:text-xs">مكتمل</Badge>;
    case "in_progress":
      return <Badge className="bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20 font-bold text-[10px] sm:text-xs">قيد التنفيذ</Badge>;
    case "pending":
    case "under_review":
      return <Badge className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 font-bold text-[10px] sm:text-xs">قيد المراجعة</Badge>;
    case "rejected":
      return <Badge className="bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20 font-bold text-[10px] sm:text-xs">مرفوض</Badge>;
    case "cancelled":
      return <Badge className="bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20 font-bold text-[10px] sm:text-xs">ملغى</Badge>;
    default:
      return <Badge variant="outline" className="font-bold text-[10px] sm:text-xs">{status}</Badge>;
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
      backUrl="/requester"
      backLabel="العودة للوحة التحكم"
      headerActions={
        <Link href="/request-form-dynamic">
          <Button className="rounded-xl sm:rounded-2xl gradient-primary text-white font-bold gap-1.5 sm:gap-2 shadow-md hover:opacity-95 cursor-pointer text-[11px] sm:text-xs h-8.5 sm:h-10 px-3 sm:px-4">
            <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span>تقديم طلب جديد</span>
          </Button>
        </Link>
      }
    >
      {/* KPI Stats Overview Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-6 mb-4 sm:mb-8">
        <Card
          onClick={() => setStatusTab("all")}
          className={`border shadow-xs hover:shadow-md transition-all rounded-xl sm:rounded-2xl cursor-pointer group bg-card ${
            statusTab === "all" ? "border-primary ring-1 ring-primary/30" : "border-border/60 hover:border-primary/40"
          }`}
        >
          <CardContent className="p-2.5 sm:p-5 flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="text-[10px] sm:text-xs font-medium text-muted-foreground truncate">إجمالي الطلبات</p>
              <p className="text-lg sm:text-3xl font-extrabold text-foreground mt-0.5 sm:mt-1">{stats.total}</p>
            </div>
            <div className="w-8 h-8 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-primary/10 dark:bg-primary/20 flex items-center justify-center text-primary shrink-0 group-hover:scale-110 transition-transform">
              <FileText className="w-4 h-4 sm:w-6 sm:h-6" />
            </div>
          </CardContent>
        </Card>

        <Card
          onClick={() => setStatusTab("pending")}
          className={`border shadow-xs hover:shadow-md transition-all rounded-xl sm:rounded-2xl cursor-pointer group bg-card ${
            statusTab === "pending" ? "border-amber-500 ring-1 ring-amber-500/30" : "border-border/60 hover:border-amber-500/40"
          }`}
        >
          <CardContent className="p-2.5 sm:p-5 flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="text-[10px] sm:text-xs font-medium text-muted-foreground truncate">قيد المراجعة</p>
              <p className="text-lg sm:text-3xl font-extrabold text-amber-600 dark:text-amber-400 mt-0.5 sm:mt-1">{stats.pending}</p>
            </div>
            <div className="w-8 h-8 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-amber-500/10 dark:bg-amber-500/20 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0 group-hover:scale-110 transition-transform">
              <Clock className="w-4 h-4 sm:w-6 sm:h-6" />
            </div>
          </CardContent>
        </Card>

        <Card
          onClick={() => setStatusTab("in_progress")}
          className={`border shadow-xs hover:shadow-md transition-all rounded-xl sm:rounded-2xl cursor-pointer group bg-card ${
            statusTab === "in_progress" ? "border-blue-500 ring-1 ring-blue-500/30" : "border-border/60 hover:border-blue-500/40"
          }`}
        >
          <CardContent className="p-2.5 sm:p-5 flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="text-[10px] sm:text-xs font-medium text-muted-foreground truncate">قيد التنفيذ</p>
              <p className="text-lg sm:text-3xl font-extrabold text-blue-600 dark:text-blue-400 mt-0.5 sm:mt-1">{stats.inProgress}</p>
            </div>
            <div className="w-8 h-8 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-blue-500/10 dark:bg-blue-500/20 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0 group-hover:scale-110 transition-transform">
              <TrendingUp className="w-4 h-4 sm:w-6 sm:h-6" />
            </div>
          </CardContent>
        </Card>

        <Card
          onClick={() => setStatusTab("completed")}
          className={`border shadow-xs hover:shadow-md transition-all rounded-xl sm:rounded-2xl cursor-pointer group bg-card ${
            statusTab === "completed" ? "border-emerald-500 ring-1 ring-emerald-500/30" : "border-border/60 hover:border-emerald-500/40"
          }`}
        >
          <CardContent className="p-2.5 sm:p-5 flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="text-[10px] sm:text-xs font-medium text-muted-foreground truncate">مكتملة</p>
              <p className="text-lg sm:text-3xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-0.5 sm:mt-1">{stats.completed}</p>
            </div>
            <div className="w-8 h-8 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-emerald-500/10 dark:bg-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0 group-hover:scale-110 transition-transform">
              <CheckCircle2 className="w-4 h-4 sm:w-6 sm:h-6" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-3 sm:gap-4 mb-4 sm:mb-6">
        {/* Status Tabs Pills */}
        <div className="w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
          <div className="flex items-center gap-1 sm:gap-1.5 bg-muted/60 dark:bg-muted/30 p-1 sm:p-1.5 rounded-xl sm:rounded-2xl border border-border/50 shrink-0">
            <button
              onClick={() => setStatusTab("all")}
              className={`px-2.5 sm:px-3.5 py-1 sm:py-1.5 rounded-lg sm:rounded-xl text-[11px] sm:text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                statusTab === "all"
                  ? "bg-background dark:bg-card text-primary shadow-xs border border-border/60"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              الكل ({stats.total})
            </button>
            <button
              onClick={() => setStatusTab("pending")}
              className={`px-2.5 sm:px-3.5 py-1 sm:py-1.5 rounded-lg sm:rounded-xl text-[11px] sm:text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                statusTab === "pending"
                  ? "bg-background dark:bg-card text-amber-600 dark:text-amber-400 shadow-xs border border-border/60"
                  : "text-muted-foreground hover:text-amber-600 dark:hover:text-amber-400"
              }`}
            >
              قيد المراجعة ({stats.pending})
            </button>
            <button
              onClick={() => setStatusTab("in_progress")}
              className={`px-2.5 sm:px-3.5 py-1 sm:py-1.5 rounded-lg sm:rounded-xl text-[11px] sm:text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                statusTab === "in_progress"
                  ? "bg-background dark:bg-card text-blue-600 dark:text-blue-400 shadow-xs border border-border/60"
                  : "text-muted-foreground hover:text-blue-600 dark:hover:text-blue-400"
              }`}
            >
              قيد التنفيذ ({stats.inProgress})
            </button>
            <button
              onClick={() => setStatusTab("completed")}
              className={`px-2.5 sm:px-3.5 py-1 sm:py-1.5 rounded-lg sm:rounded-xl text-[11px] sm:text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                statusTab === "completed"
                  ? "bg-background dark:bg-card text-emerald-600 dark:text-emerald-400 shadow-xs border border-border/60"
                  : "text-muted-foreground hover:text-emerald-600 dark:hover:text-emerald-400"
              }`}
            >
              مكتملة ({stats.completed})
            </button>
            <button
              onClick={() => setStatusTab("rejected")}
              className={`px-2.5 sm:px-3.5 py-1 sm:py-1.5 rounded-lg sm:rounded-xl text-[11px] sm:text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                statusTab === "rejected"
                  ? "bg-background dark:bg-card text-rose-600 dark:text-rose-400 shadow-xs border border-border/60"
                  : "text-muted-foreground hover:text-rose-600 dark:hover:text-rose-400"
              }`}
            >
              مرفوضة ({stats.rejected})
            </button>
          </div>
        </div>

        {/* Search Input & Program Filter */}
        <div className="flex items-center gap-2 sm:gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              placeholder="ابحث برقم الطلب أو المسجد..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pr-8 pl-7 rounded-xl sm:rounded-2xl h-8.5 sm:h-10 border-border/60 bg-background text-[11px] sm:text-xs"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm("")}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5 rounded-full cursor-pointer"
                title="مسح البحث"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          <Select value={programFilter} onValueChange={setProgramFilter}>
            <SelectTrigger className="w-[130px] sm:w-[150px] rounded-xl sm:rounded-2xl h-8.5 sm:h-10 border-border/60 bg-background text-[11px] sm:text-xs cursor-pointer">
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
              className="h-8.5 w-8.5 sm:h-10 sm:w-10 rounded-xl sm:rounded-2xl text-muted-foreground hover:text-destructive shrink-0 cursor-pointer"
              title="إعادة تعيين الفلاتر"
            >
              <RotateCcw className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Requests List */}
      {isLoading ? (
        <div className="space-y-3 sm:space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 sm:h-32 bg-muted/40 animate-pulse rounded-2xl sm:rounded-3xl" />
          ))}
        </div>
      ) : requests.length > 0 ? (
        <div className="space-y-4 sm:space-y-6">
          <div className="grid grid-cols-1 gap-3 sm:gap-4">
            {requests.map((request) => {
              const isRejected = request.status === "rejected" || request.technicalEvalDecision === "apologize" || request.requestTrack === "rejected";
              const progress = isRejected ? 0 : getProgressPercentage(request.currentStage);
              const stageLabel = isRejected ? "تم رفض الطلب" : getStageLabelAr(request.currentStage);
              const rejectionReason = request.technicalEvalJustification || (request as any).rejectionReason || (request as any).reviewNotes;
              const requestDate = request.createdAt 
                ? new Date(request.createdAt).toLocaleDateString("ar-SA", { year: "numeric", month: "short", day: "numeric" })
                : null;

              return (
                <Card
                  key={request.id}
                  className={`border shadow-xs hover:shadow-md transition-all rounded-2xl sm:rounded-3xl overflow-hidden group ${
                    isRejected 
                      ? "border-rose-200/80 dark:border-rose-900/40 bg-rose-50/20 dark:bg-rose-950/10 hover:border-rose-300"
                      : "border-border/60 bg-card hover:border-primary/40"
                  }`}
                >
                  <CardContent className="p-3.5 sm:p-6">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4">
                      {/* Program & Main Info */}
                      <div className="flex items-start sm:items-center gap-2.5 sm:gap-4 min-w-0">
                        <ProgramIcon program={request.programType} size="md" showBackground />
                        <div className="min-w-0 space-y-0.5 sm:space-y-1">
                          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                            <h3 className={`font-bold sm:font-extrabold text-xs sm:text-base transition-colors ${
                              isRejected ? "text-rose-950 dark:text-rose-200 group-hover:text-rose-600 dark:group-hover:text-rose-400" : "text-foreground group-hover:text-primary"
                            }`}>
                              {request.programName || PROGRAM_LABELS[request.programType] || request.programType}
                            </h3>
                            {getStatusBadge(isRejected ? "rejected" : request.status)}
                          </div>
                          <p className="text-[10px] sm:text-xs text-muted-foreground font-medium flex flex-wrap items-center gap-1.5 sm:gap-2">
                            <span className="font-mono bg-muted/60 px-1.5 py-0.5 rounded-md text-foreground font-bold">{request.requestNumber}</span>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              <Building2 className="w-3 h-3 text-primary/70 shrink-0" />
                              <span className="truncate">{request.programType === "bunyan" ? "غير مرتبط بمسجد (بنيان)" : (request.mosqueName || "المسجد المحدد")}</span>
                            </span>
                            {requestDate && (
                              <>
                                <span className="hidden sm:inline">•</span>
                                <span className="hidden sm:flex items-center gap-1 text-[11px] text-muted-foreground">
                                  <Calendar className="w-3 h-3 text-muted-foreground/70" />
                                  {requestDate}
                                </span>
                              </>
                            )}
                          </p>
                        </div>
                      </div>

                      {/* Progress Info & CTA */}
                      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2.5 sm:gap-4 shrink-0 border-t md:border-t-0 border-border/40 pt-2.5 md:pt-0">
                        <div className="w-full sm:w-44 lg:w-48 space-y-1">
                          <div className="flex justify-between items-center text-[10px] sm:text-xs">
                            <span className={`font-bold ${isRejected ? "text-rose-600 dark:text-rose-400" : "text-foreground"}`}>
                              {stageLabel}
                            </span>
                            <span className={`font-mono font-extrabold ${isRejected ? "text-rose-600 dark:text-rose-400" : "text-primary"}`}>
                              {isRejected ? "مرفوض" : `${progress}%`}
                            </span>
                          </div>
                          {isRejected ? (
                            <div className="h-1.5 sm:h-2 rounded-full bg-rose-200 dark:bg-rose-950/60 overflow-hidden">
                              <div className="h-full bg-rose-500 rounded-full w-full" />
                            </div>
                          ) : (
                            <Progress value={progress} className="h-1.5 sm:h-2 rounded-full" />
                          )}
                        </div>

                        <Link href={`/requests/${request.id}`} className="w-full sm:w-auto">
                          <Button className={`w-full sm:w-auto rounded-xl sm:rounded-2xl font-bold text-[11px] sm:text-xs gap-1.5 transition-all h-8 sm:h-10 px-3 sm:px-4 cursor-pointer ${
                            isRejected 
                              ? "bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 hover:bg-rose-600 hover:text-white"
                              : "bg-muted/80 text-foreground hover:bg-primary hover:text-white"
                          }`}>
                            <Eye className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                            <span>عرض التفاصيل</span>
                          </Button>
                        </Link>
                      </div>
                    </div>

                    {/* Rejection Justification Notice */}
                    {isRejected && rejectionReason && (
                      <div className="mt-3 p-2.5 sm:p-3.5 rounded-xl sm:rounded-2xl bg-rose-100/70 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900/40 text-[10px] sm:text-xs flex items-start gap-2">
                        <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0 mt-0.5" />
                        <div className="min-w-0 flex-1 leading-relaxed">
                          <p className="font-bold text-rose-900 dark:text-rose-200">مبررات الاعتذار والرفض:</p>
                          <p className="text-rose-800 dark:text-rose-300 font-medium mt-0.5 whitespace-pre-wrap">{rejectionReason}</p>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Pagination Footer */}
          <div className="p-3 sm:p-4 bg-muted/20 border border-border/60 rounded-2xl sm:rounded-3xl flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4">
            <div className="text-[10px] sm:text-xs text-muted-foreground text-center sm:text-right font-medium">
              عرض {(page - 1) * PAGE_SIZE + 1} - {Math.min(page * PAGE_SIZE, total)} من أصل {total} طلب
            </div>

            {totalPages > 1 && (
              <div className="flex items-center gap-1 overflow-x-auto max-w-full py-0.5">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-7.5 w-7.5 sm:h-8.5 sm:w-8.5 rounded-lg sm:rounded-xl shrink-0 cursor-pointer disabled:opacity-40"
                  onClick={() => handlePageChange(page - 1)}
                  disabled={page === 1 || isFetching}
                  title="الصفحة السابقة"
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                </Button>

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
                        className={`h-7.5 min-w-[30px] sm:h-8.5 sm:min-w-[34px] px-2 text-[10px] sm:text-xs font-bold rounded-lg sm:rounded-xl shrink-0 transition-all cursor-pointer ${
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
                      <span key={p} className="text-muted-foreground text-[10px] sm:text-xs px-1">
                        ...
                      </span>
                    );
                  }
                  return null;
                })}

                <Button
                  variant="outline"
                  size="icon"
                  className="h-7.5 w-7.5 sm:h-8.5 sm:w-8.5 rounded-lg sm:rounded-xl shrink-0 cursor-pointer disabled:opacity-40"
                  onClick={() => handlePageChange(page + 1)}
                  disabled={page === totalPages || isFetching}
                  title="الصفحة التالية"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                </Button>
              </div>
            )}
          </div>
        </div>
      ) : (
        <Card className="border border-border/60 shadow-xs rounded-2xl sm:rounded-3xl p-8 sm:p-12 text-center bg-card">
          <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-primary/10 dark:bg-primary/20 text-primary flex items-center justify-center mx-auto mb-3 sm:mb-4">
            <FileText className="w-6 h-6 sm:w-8 sm:h-8" />
          </div>
          <h3 className="font-bold text-base sm:text-lg text-foreground mb-1">
            {isFiltering ? "لا توجد نتائج مطابقة لبحثك" : "لا توجد طلبات سابقة"}
          </h3>
          <p className="text-[11px] sm:text-xs text-muted-foreground mb-4 sm:mb-6 max-w-md mx-auto">
            {isFiltering
              ? "لم يتم العثور على أي طلبات تطابق خيارات الفلترة أو البحث المحددة. جرب تغيير المعايير أو إعادة التعيين."
              : "لم تقم بتقديم أي طلب خدمة حتى الآن. يمكنك تقديم طلب جديد لمسجدك بضغط زر واحدة."}
          </p>
          {isFiltering ? (
            <Button
              onClick={handleClearFilters}
              variant="outline"
              className="rounded-xl sm:rounded-2xl font-bold gap-1.5 sm:gap-2 px-4 sm:px-6 h-9 sm:h-10 text-[11px] sm:text-xs cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span>إعادة تعيين الفلاتر</span>
            </Button>
          ) : (
            <Link href="/request-form-dynamic">
              <Button className="gradient-primary text-white font-bold rounded-xl sm:rounded-2xl shadow-md gap-1.5 sm:gap-2 px-4 sm:px-6 h-9 sm:h-10 text-[11px] sm:text-xs cursor-pointer">
                <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span>تقديم طلب جديد</span>
              </Button>
            </Link>
          )}
        </Card>
      )}
    </BeneficiaryLayout>
  );
}
