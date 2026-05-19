import { useState, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { 
  FileText, 
  Plus, 
  Search, 
  Eye,
  CheckCircle,
  Clock,
  Building2,
  AlertCircle,
  TrendingUp,
  Filter,
  ChevronLeft,
} from "lucide-react";
import { Link, useLocation, useSearch } from "wouter";
import { trpc } from "@/lib/trpc";
import { PROGRAM_LABELS, STAGE_LABELS, STATUS_LABELS } from "@shared/constants";
import { ProgramIcon } from "@/components/ProgramIcon";
import { PermissionGuard } from "@/components/PermissionGuard";
import { useAuth } from "@/_core/hooks/useAuth";

const statusConfig: Record<string, { color: string; bg: string; icon: React.ReactNode }> = {
  pending: {
    color: "text-amber-700 dark:text-amber-400",
    bg: "bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800",
    icon: <Clock className="w-3 h-3" />,
  },
  under_review: {
    color: "text-amber-700 dark:text-amber-400",
    bg: "bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800",
    icon: <Clock className="w-3 h-3" />,
  },
  in_progress: {
    color: "text-blue-700 dark:text-blue-400",
    bg: "bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800",
    icon: <TrendingUp className="w-3 h-3" />,
  },
  completed: {
    color: "text-emerald-700 dark:text-emerald-400",
    bg: "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800",
    icon: <CheckCircle className="w-3 h-3" />,
  },
  rejected: {
    color: "text-red-700 dark:text-red-400",
    bg: "bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800",
    icon: <AlertCircle className="w-3 h-3" />,
  },
  cancelled: {
    color: "text-gray-600 dark:text-gray-400",
    bg: "bg-gray-50 dark:bg-gray-900/30 border-gray-200 dark:border-gray-700",
    icon: <AlertCircle className="w-3 h-3" />,
  },
};

export default function Requests({ 
  initialStage,
  initialAssignedToMe
}: { 
  initialStage?: string;
  initialAssignedToMe?: boolean;
}) {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const searchParamsStr = useSearch();
  
  const [search, setSearch] = useState("");
  const [programFilter, setProgramFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [stageFilter, setStageFilter] = useState<string>(initialStage || "all");
  const [page, setPage] = useState(1);
  const limit = 20;

  // تحديث الفلاتر عند تغيير Query Params (مثلاً عند الانتقال من لوحة التحكم)
  useEffect(() => {
    const params = new URLSearchParams(searchParamsStr);
    
    const program = params.get("program");
    if (program && (PROGRAM_LABELS[program] || program === "all")) {
      setProgramFilter(program);
    }

    const status = params.get("status");
    if (status && (STATUS_LABELS[status] || status === "all")) {
      setStatusFilter(status);
    }

    const stage = params.get("stage");
    if (stage && (STAGE_LABELS[stage] || stage === "all")) {
      setStageFilter(stage);
    }

    setPage(1);
  }, [searchParamsStr]);

  const { data: requestsData, isLoading } = trpc.requests.search.useQuery({
    search: search || undefined,
    programType: programFilter !== "all" ? programFilter as any : undefined,
    status: statusFilter !== "all" ? statusFilter as any : undefined,
    currentStage: stageFilter !== "all" ? stageFilter as any : undefined,
    assignedTo: initialAssignedToMe ? user?.id : undefined,
    page,
    limit,
  }, {
    keepPreviousData: true
  });

  const requests = requestsData?.requests || [];
  const total = requestsData?.total || 0;
  const totalPages = Math.ceil(total / limit);

  const stats = {
    total: requestsData?.total || 0,
    underReview: requestsData?.stats?.under_review || 0,
    inProgress: requestsData?.stats?.in_progress || 0,
    completed: requestsData?.stats?.completed || 0,
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-full overflow-x-hidden">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-xl md:text-2xl font-bold text-foreground truncate">
              {initialStage === "field_visit" ? "الزيارات الميدانية" : 
               initialAssignedToMe ? "طلباتي" : "إدارة الطلبات"}
            </h1>
            <p className="text-xs md:text-sm text-muted-foreground mt-1 break-words">
              {initialStage === "field_visit" ? "عرض ومتابعة الطلبات في مرحلة الزيارة الميدانية" :
               initialAssignedToMe ? "عرض ومتابعة الطلبات المسندة إليك" : "عرض ومتابعة جميع طلبات الخدمة"}
            </p>
          </div>
          {!initialAssignedToMe && (
            <PermissionGuard permission="requests.create">
              <Link href="/service-request">
                <Button className="gradient-primary text-white gap-2 w-full sm:w-auto h-10">
                  <Plus className="w-4 h-4" />
                  طلب جديد
                </Button>
              </Link>
            </PermissionGuard>
          )}
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          {[
            {
              label: "إجمالي الطلبات",
              value: stats.total,
              icon: <FileText className="w-4 h-4 md:w-5 md:h-5" />,
              iconBg: "bg-primary/10 text-primary",
            },
            {
              label: "قيد المراجعة",
              value: stats.underReview,
              icon: <Clock className="w-4 h-4 md:w-5 md:h-5" />,
              iconBg: "bg-amber-100 dark:bg-amber-950/40 text-amber-600",
            },
            {
              label: "قيد التنفيذ",
              value: stats.inProgress,
              icon: <TrendingUp className="w-4 h-4 md:w-5 md:h-5" />,
              iconBg: "bg-blue-100 dark:bg-blue-950/40 text-blue-600",
            },
            {
              label: "مكتملة",
              value: stats.completed,
              icon: <CheckCircle className="w-4 h-4 md:w-5 md:h-5" />,
              iconBg: "bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600",
            },
          ].map((stat) => (
            <Card key={stat.label} className="border-0 shadow-sm overflow-hidden">
              <CardContent className="p-3 md:p-4">
                <div className="flex items-center gap-2 md:gap-3">
                  <div className={`w-8 h-8 md:w-10 md:h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${stat.iconBg}`}>
                    {stat.icon}
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] md:text-xs text-muted-foreground truncate">{stat.label}</p>
                    <p className="text-lg md:text-xl font-bold text-foreground truncate">{stat.value}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Filters */}
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 items-end">
              <div className="sm:col-span-2 relative">
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block flex items-center gap-1">
                  <Search className="w-3 h-3" />
                  البحث
                </label>
                <div className="relative">
                  <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="رقم الطلب أو اسم المسجد..."
                    value={search}
                    onChange={(e) => {
                      setSearch(e.target.value);
                      setPage(1);
                    }}
                    className="pr-10 h-10 w-full"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 sm:col-span-2">
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">البرنامج</label>
                  <Select value={programFilter} onValueChange={(v) => {
                    setProgramFilter(v);
                    setPage(1);
                  }}>
                    <SelectTrigger className="w-full h-10 text-xs md:text-sm">
                      <SelectValue placeholder="البرنامج" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">جميع البرامج</SelectItem>
                      {Object.entries(PROGRAM_LABELS).map(([key, label]) => (
                        <SelectItem key={key} value={key}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">الحالة</label>
                  <Select value={statusFilter} onValueChange={(v) => {
                    setStatusFilter(v);
                    setPage(1);
                  }}>
                    <SelectTrigger className="w-full h-10 text-xs md:text-sm">
                      <SelectValue placeholder="الحالة" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">جميع الحالات</SelectItem>
                      <SelectItem value="under_review">قيد المراجعة</SelectItem>
                      <SelectItem value="in_progress">قيد التنفيذ</SelectItem>
                      <SelectItem value="completed">مكتملة</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Requests List */}
        <Card className="border-0 shadow-sm overflow-hidden">
          {isLoading ? (
            <div className="p-12 text-center">
              <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-muted-foreground mt-4 text-sm">جاري التحميل...</p>
            </div>
          ) : requests.length > 0 ? (
            <div>
              {/* Table Header (Desktop Only) */}
              <div className="hidden md:grid grid-cols-[auto_1fr_1fr_1fr_1fr_auto] gap-4 px-4 py-3 bg-muted/40 border-b text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                <div className="w-8"></div>
                <div>الطلب</div>
                <div>المسجد</div>
                <div>المرحلة</div>
                <div>الحالة</div>
                <div className="w-20 text-center">عرض</div>
              </div>

              {/* Rows / Cards */}
              <div className="divide-y divide-border">
                {requests.map((request: any) => {
                  const status = statusConfig[request.status] || statusConfig.pending;
                  return (
                    <div
                      key={request.id}
                      className="grid grid-cols-1 md:grid-cols-[auto_1fr_1fr_1fr_1fr_auto] gap-3 md:gap-4 px-4 py-4 hover:bg-muted/30 transition-colors cursor-pointer items-center"
                      onClick={() => navigate(`/requests/${request.id}`)}
                    >
                      {/* Desktop: Program Icon */}
                      <div className="hidden md:flex w-8 justify-center">
                        <ProgramIcon program={request.programType} size="md" />
                      </div>

                      {/* Request Info (Mobile & Desktop) */}
                      <div className="flex items-start justify-between md:block gap-3">
                        <div className="flex items-center gap-3 md:block min-w-0">
                          <div className="md:hidden shrink-0">
                            <ProgramIcon program={request.programType} size="md" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold text-foreground text-sm md:text-sm">{request.requestNumber}</p>
                            <p className="text-xs text-muted-foreground mt-0.5 truncate md:truncate break-words line-clamp-1">
                              {request.programName || PROGRAM_LABELS[request.programType] || request.programType}
                            </p>
                          </div>
                        </div>
                        <div className="text-left md:text-right shrink-0">
                           <p className="text-[10px] md:text-xs text-muted-foreground">
                            {new Date(request.createdAt).toLocaleDateString("ar-SA")}
                          </p>
                        </div>
                      </div>

                      {/* Mosque (Desktop & Tablet) */}
                      <div className="hidden md:flex items-center gap-2 min-w-0">
                        <Building2 className="w-4 h-4 text-muted-foreground shrink-0" />
                        <span className="text-sm text-foreground truncate">{request.mosqueName || "—"}</span>
                      </div>

                      {/* Stage (Desktop) */}
                      <div className="hidden md:block min-w-0">
                        <Badge variant="outline" className="text-[10px] md:text-xs font-medium py-0 h-auto">
                          {STAGE_LABELS[request.currentStage] || request.currentStage}
                        </Badge>
                        {request.currentResponsibleDepartment && (
                          <p className="text-[10px] md:text-xs text-muted-foreground mt-1 truncate">
                            {request.currentResponsibleDepartment}
                          </p>
                        )}
                      </div>

                      {/* Status (Desktop) */}
                      <div className="hidden md:block shrink-0">
                        <span className={`inline-flex items-center gap-1.5 text-[10px] md:text-xs font-medium px-2.5 py-0.5 rounded-full border ${status.bg} ${status.color}`}>
                          {status.icon}
                          {STATUS_LABELS[request.status]}
                        </span>
                      </div>

                      {/* Mobile Card Row: Location + Stage + Status */}
                      <div className="md:hidden flex flex-col gap-3">
                        <div className="flex items-center gap-1.5 text-xs text-foreground bg-muted/50 p-2 rounded-md">
                          <Building2 className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                          <span className="truncate">{request.mosqueName || "—"}</span>
                        </div>
                        <div className="flex items-center justify-between gap-2">
                           <Badge variant="outline" className="text-[10px] py-0.5">
                            {STAGE_LABELS[request.currentStage] || request.currentStage}
                          </Badge>
                          <span className={`inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full border ${status.bg} ${status.color}`}>
                            {status.icon}
                            {STATUS_LABELS[request.status]}
                          </span>
                        </div>
                      </div>

                      {/* Desktop Action */}
                      <div className="hidden md:flex justify-center" onClick={(e) => e.stopPropagation()}>
                        <Link href={`/requests/${request.id}`}>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-muted-foreground hover:text-primary">
                            <ChevronLeft className="w-4 h-4" />
                          </Button>
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Footer with Pagination */}
              <div className="px-4 py-4 bg-muted/20 border-t flex flex-col items-center justify-center gap-4">
                <div className="text-[11px] md:text-xs text-muted-foreground text-center">
                  يعرض {(page - 1) * limit + 1} - {Math.min(page * limit, total)} من أصل {total} طلب
                </div>
                
                {totalPages > 1 && (
                  <div className="flex items-center gap-1.5 overflow-x-auto max-w-full py-1">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8 shrink-0"
                      onClick={() => handlePageChange(page - 1)}
                      disabled={page === 1}
                    >
                      <ChevronLeft className="h-4 w-4 rotate-180" />
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
                            className={`h-8 min-w-[32px] px-2 text-[11px] shrink-0 ${page === p ? 'gradient-primary text-white border-0' : ''}`}
                            onClick={() => handlePageChange(p)}
                          >
                            {p}
                          </Button>
                        );
                      } else if (
                        (p === page - 2 && page > 3) ||
                        (p === page + 2 && page < totalPages - 2)
                      ) {
                        return <span key={p} className="px-0.5 text-muted-foreground">...</span>;
                      }
                      return null;
                    })}

                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8 shrink-0"
                      onClick={() => handlePageChange(page + 1)}
                      disabled={page === totalPages}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="p-12 text-center">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                <FileText className="w-8 h-8 text-muted-foreground" />
              </div>
              <p className="text-foreground font-medium mb-1">لا توجد طلبات</p>
              <p className="text-muted-foreground text-sm mb-4">
                {search || programFilter !== "all" || statusFilter !== "all"
                  ? "لا توجد نتائج تطابق معايير البحث"
                  : "لم يتم تقديم أي طلبات بعد"}
              </p>
              {!initialAssignedToMe && (
                <PermissionGuard permission="requests.create">
                  <Link href="/service-request">
                    <Button className="gradient-primary text-white gap-2">
                      <Plus className="w-4 h-4" />
                      تقديم طلب جديد
                    </Button>
                  </Link>
                </PermissionGuard>
              )}
            </div>
          )}
        </Card>
      </div>
    </DashboardLayout>
  );
}
