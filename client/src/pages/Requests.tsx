import { useState } from "react";
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
import { Link, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { PROGRAM_LABELS, STAGE_LABELS, STATUS_LABELS } from "@shared/constants";
import { ProgramIcon } from "@/components/ProgramIcon";
import { PermissionGuard } from "@/components/PermissionGuard";

const statusConfig: Record<string, { color: string; bg: string; icon: React.ReactNode }> = {
  pending: {
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

export default function Requests() {
  const [, navigate] = useLocation();
  const [search, setSearch] = useState("");
  const [programFilter, setProgramFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const { data: requestsData, isLoading } = trpc.requests.search.useQuery({
    search: search || undefined,
    programType: programFilter !== "all" ? programFilter as any : undefined,
    status: statusFilter !== "all" ? statusFilter as any : undefined,
  });

  const requests = requestsData?.requests || [];

  const stats = {
    total: requestsData?.total || 0,
    pending: requests.filter((r: any) => r.status === "pending").length,
    inProgress: requests.filter((r: any) => r.status === "in_progress").length,
    completed: requests.filter((r: any) => r.status === "completed").length,
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">إدارة الطلبات</h1>
            <p className="text-sm text-muted-foreground mt-1">
              عرض ومتابعة جميع طلبات الخدمة
            </p>
          </div>
          <PermissionGuard permission="requests.create">
            <Link href="/service-request">
              <Button className="gradient-primary text-white gap-2">
                <Plus className="w-4 h-4" />
                طلب جديد
              </Button>
            </Link>
          </PermissionGuard>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            {
              label: "إجمالي الطلبات",
              value: stats.total,
              icon: <FileText className="w-5 h-5" />,
              iconBg: "bg-primary/10 text-primary",
            },
            {
              label: "قيد الانتظار",
              value: stats.pending,
              icon: <Clock className="w-5 h-5" />,
              iconBg: "bg-amber-100 dark:bg-amber-950/40 text-amber-600",
            },
            {
              label: "قيد التنفيذ",
              value: stats.inProgress,
              icon: <TrendingUp className="w-5 h-5" />,
              iconBg: "bg-blue-100 dark:bg-blue-950/40 text-blue-600",
            },
            {
              label: "مكتملة",
              value: stats.completed,
              icon: <CheckCircle className="w-5 h-5" />,
              iconBg: "bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600",
            },
          ].map((stat) => (
            <Card key={stat.label} className="border shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${stat.iconBg}`}>
                    {stat.icon}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground truncate">{stat.label}</p>
                    <p className="text-xl font-bold text-foreground">{stat.value}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Filters */}
        <Card className="border shadow-sm">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
              <div className="flex items-center gap-2 text-sm text-muted-foreground flex-shrink-0">
                <Filter className="w-4 h-4" />
                <span>تصفية:</span>
              </div>
              <div className="flex-1 relative">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="البحث برقم الطلب أو اسم المسجد..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pr-10 h-9"
                />
              </div>
              <div className="flex gap-2 flex-wrap">
                <Select value={programFilter} onValueChange={setProgramFilter}>
                  <SelectTrigger className="w-40 h-9 text-sm">
                    <SelectValue placeholder="البرنامج" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">جميع البرامج</SelectItem>
                    {Object.entries(PROGRAM_LABELS).map(([key, label]) => (
                      <SelectItem key={key} value={key}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-36 h-9 text-sm">
                    <SelectValue placeholder="الحالة" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">جميع الحالات</SelectItem>
                    {Object.entries(STATUS_LABELS).map(([key, label]) => (
                      <SelectItem key={key} value={key}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Requests List */}
        <Card className="border shadow-sm overflow-hidden">
          {isLoading ? (
            <div className="p-12 text-center">
              <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-muted-foreground mt-4 text-sm">جاري التحميل...</p>
            </div>
          ) : requests.length > 0 ? (
            <div>
              {/* Table Header */}
              <div className="hidden md:grid grid-cols-[auto_1fr_1fr_1fr_1fr_auto] gap-4 px-4 py-3 bg-muted/40 border-b text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                <div className="w-8"></div>
                <div>الطلب</div>
                <div>المسجد</div>
                <div>المرحلة</div>
                <div>الحالة</div>
                <div className="w-20 text-center">عرض</div>
              </div>

              {/* Rows */}
              <div className="divide-y divide-border">
                {requests.map((request: any) => {
                  const status = statusConfig[request.status] || statusConfig.pending;
                  return (
                    <div
                      key={request.id}
                      className="grid grid-cols-1 md:grid-cols-[auto_1fr_1fr_1fr_1fr_auto] gap-3 md:gap-4 px-4 py-4 hover:bg-muted/30 transition-colors cursor-pointer items-center"
                      onClick={() => navigate(`/requests/${request.id}`)}
                    >
                      {/* Program Icon */}
                      <div className="hidden md:flex w-8 justify-center">
                        <ProgramIcon program={request.programType} size="md" />
                      </div>

                      {/* Request Info */}
                      <div className="flex items-center gap-3 md:block">
                        <div className="md:hidden">
                          <ProgramIcon program={request.programType} size="md" />
                        </div>
                        <div>
                          <p className="font-semibold text-foreground text-sm">{request.requestNumber}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {PROGRAM_LABELS[request.programType] || request.programType}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(request.createdAt).toLocaleDateString("ar-SA")}
                          </p>
                        </div>
                      </div>

                      {/* Mosque */}
                      <div className="hidden md:flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                        <span className="text-sm text-foreground truncate">{request.mosqueName || "—"}</span>
                      </div>

                      {/* Stage */}
                      <div className="hidden md:block">
                        <Badge variant="outline" className="text-xs font-medium">
                          {STAGE_LABELS[request.currentStage] || request.currentStage}
                        </Badge>
                        {request.currentResponsibleDepartment && (
                          <p className="text-xs text-muted-foreground mt-1 truncate">
                            {request.currentResponsibleDepartment}
                          </p>
                        )}
                      </div>

                      {/* Status */}
                      <div className="hidden md:block">
                        <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border ${status.bg} ${status.color}`}>
                          {status.icon}
                          {STATUS_LABELS[request.status]}
                        </span>
                      </div>

                      {/* Mobile: Stage + Status row */}
                      <div className="md:hidden flex items-center gap-2 flex-wrap">
                        <Badge variant="outline" className="text-xs">
                          {STAGE_LABELS[request.currentStage] || request.currentStage}
                        </Badge>
                        <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full border ${status.bg} ${status.color}`}>
                          {status.icon}
                          {STATUS_LABELS[request.status]}
                        </span>
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Building2 className="w-3 h-3" />
                          {request.mosqueName || "—"}
                        </span>
                      </div>

                      {/* Action */}
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

              {/* Footer */}
              <div className="px-4 py-3 bg-muted/20 border-t text-xs text-muted-foreground text-center">
                يعرض {requests.length} من أصل {stats.total} طلب
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
              <PermissionGuard permission="requests.create">
                <Link href="/service-request">
                  <Button className="gradient-primary text-white gap-2">
                    <Plus className="w-4 h-4" />
                    تقديم طلب جديد
                  </Button>
                </Link>
              </PermissionGuard>
            </div>
          )}
        </Card>
      </div>
    </DashboardLayout>
  );
}
