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
  Zap,
  MapPin,
  ClipboardList,
  Languages,
  Briefcase
} from "lucide-react";
import { Link, useLocation, useSearch } from "wouter";
import { trpc } from "@/lib/trpc";
import { PROGRAM_LABELS, STAGE_LABELS, STATUS_LABELS, getStageLabel } from "@shared/constants";
import { ProgramIcon } from "@/components/ProgramIcon";
import { PermissionGuard } from "@/components/PermissionGuard";
import { useAuth } from "@/_core/hooks/useAuth";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { FileUpload, type UploadedFile } from "@/components/FileUpload";
import { toast } from "sonner";

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
  
  const [lang, setLang] = useState<"ar" | "en">(() => {
    return (localStorage.getItem("quick-response-lang") as "ar" | "en") || "ar";
  });

  const handleLangToggle = () => {
    const nextLang = lang === "ar" ? "en" : "ar";
    setLang(nextLang);
    localStorage.setItem("quick-response-lang", nextLang);
  };

  const translateProgram = (type: string) => {
    if (user?.role === "quick_response" && lang === "en") {
      const enLabels: Record<string, string> = {
        bunyan: "Bunyan",
        daaem: "Daaem",
        enaya: "Enaya",
        emdad: "Emdad",
        ethraa: "Ethraa",
        sedana: "Sedana",
        taqa: "Taqa",
        miyah: "Miyah",
        suqya: "Suqya",
        // support legacy keys if any exist in the database
        bina: "Building",
        tarmeem: "Restoration",
        taathath: "Furnishing",
        hifz: "Preservation",
        other: "Other",
      };
      return enLabels[type] || type;
    }
    return PROGRAM_LABELS[type as keyof typeof PROGRAM_LABELS] || type;
  };

  const translateStage = (stage: string, track?: string) => {
    if (user?.role === "quick_response" && lang === "en") {
      const enStages: Record<string, string> = {
        submitted: "Submitted",
        initial_review: "Initial Review",
        field_visit: "Field Visit",
        technical_eval: "Technical Evaluation",
        boq_preparation: "BOQ Preparation",
        financial_eval_and_approval: "Financial Evaluation",
        quotation_approval: "Quotation Approval",
        contracting: "Contracting",
        execution: "Execution",
        handover: "Handover",
        closed: "Closed",
      };
      return enStages[stage] || stage;
    }
    return getStageLabel(stage, track);
  };

  const translateStatus = (status: string) => {
    if (user?.role === "quick_response" && lang === "en") {
      const enStatuses: Record<string, string> = {
        pending: "Pending",
        under_review: "Under Review",
        in_progress: "In Progress",
        completed: "Completed",
        rejected: "Rejected",
        cancelled: "Cancelled",
      };
      return enStatuses[status] || status;
    }
    return STATUS_LABELS[status as keyof typeof STATUS_LABELS] || status;
  };

  const translateDepartment = (dept: string) => {
    if (user?.role === "quick_response" && lang === "en" && dept) {
      const depts: Record<string, string> = {
        "فريق الاستجابة السريعة": "Quick Response Team",
        "اللجنة الفنية": "Technical Committee",
        "الإدارة المالية": "Financial Department",
        "المقاول": "Contractor",
        "المستشار الفني": "Technical Consultant",
      };
      return depts[dept] || dept;
    }
    return dept;
  };
  
  const [search, setSearch] = useState("");
  const [programFilter, setProgramFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [stageFilter, setStageFilter] = useState<string>(initialStage || "all");
  const [page, setPage] = useState(1);
  const limit = 20;



  const isEn = user?.role === "quick_response" && lang === "en";
  const userPermissions = (user as any)?.permissions ?? [];
  const isAdmin = ["super_admin", "system_admin"].includes(user?.role || "");
  const canViewDetails = isAdmin || 
                         userPermissions.includes("requests.view_details") || 
                         userPermissions.includes("requests.manage_as_field_team") ||
                         userPermissions.includes("requests.manage_as_quick_response") ||
                         userPermissions.includes("requests.upload_final_report");

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
      <div className="space-y-6 max-w-full overflow-x-hidden" dir={isEn ? "ltr" : "rtl"}>
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-xl md:text-2xl font-bold text-foreground truncate">
              {isEn ? "Quick Response Requests" :
               (initialStage === "field_visit" ? "الزيارات الميدانية" : 
                initialAssignedToMe ? "طلباتي" : "إدارة الطلبات")}
            </h1>
            <p className="text-xs md:text-sm text-muted-foreground mt-1 break-words">
              {isEn ? "View and track active and completed quick response requests" :
               (initialStage === "field_visit" ? "عرض ومتابعة الطلبات في مرحلة الزيارة الميدانية" :
                initialAssignedToMe ? "عرض ومتابعة الطلبات المسندة إليك" : "عرض ومتابعة جميع طلبات الخدمة")}
            </p>
          </div>
          {!initialAssignedToMe && (
            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto items-center">
              {user?.role === "quick_response" && (
                <>
                  <Link href="/requests/quick-create">
                    <Button 
                      className="bg-amber-600 hover:bg-amber-700 text-white gap-2 w-full sm:w-auto h-10 shadow-sm transition-all"
                    >
                      <Zap className="w-4 h-4" />
                      {lang === "en" ? "Quick Request" : "طلب سريع"}
                    </Button>
                  </Link>
                </>
              )}
              <PermissionGuard permission="requests.create">
                <Link href="/service-request">
                  <Button className="gradient-primary text-white gap-2 w-full sm:w-auto h-10">
                    <Plus className="w-4 h-4" />
                    {isEn ? "New Request" : "طلب جديد"}
                  </Button>
                </Link>
              </PermissionGuard>
            </div>
          )}
        </div>

        {/* Stats Row */}
        <div className={`grid grid-cols-2 ${initialStage === "field_visit" || user?.role === "quick_response" ? "lg:grid-cols-3" : "lg:grid-cols-4"} gap-3 md:gap-4`}>
          {[
            {
              label: isEn ? "Total Requests" : "إجمالي الطلبات",
              value: stats.total,
              icon: <FileText className="w-4 h-4 md:w-5 md:h-5" />,
              iconBg: "bg-primary/10 text-primary",
            },
            {
              label: isEn ? "Under Review" : "قيد المراجعة",
              value: stats.underReview,
              icon: <Clock className="w-4 h-4 md:w-5 md:h-5" />,
              iconBg: "bg-amber-100 dark:bg-amber-950/40 text-amber-600",
            },
            {
              label: isEn ? "In Progress" : "قيد التنفيذ",
              value: stats.inProgress,
              icon: <TrendingUp className="w-4 h-4 md:w-5 md:h-5" />,
              iconBg: "bg-blue-100 dark:bg-blue-950/40 text-blue-600",
            },
            {
              label: isEn ? "Completed" : "مكتملة",
              value: stats.completed,
              icon: <CheckCircle className="w-4 h-4 md:w-5 md:h-5" />,
              iconBg: "bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600",
            },
          ].filter(stat => !((initialStage === "field_visit" || user?.role === "quick_response") && stat.label === (isEn ? "Under Review" : "قيد المراجعة"))).map((stat) => (
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
                  {isEn ? "Search" : "البحث"}
                </label>
                <div className="relative">
                  <Search className={`absolute ${isEn ? "left-3" : "right-3"} top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground`} />
                  <Input
                    placeholder={isEn ? "Request ID or Mosque Name..." : "رقم الطلب أو اسم المسجد..."}
                    value={search}
                    onChange={(e) => {
                      setSearch(e.target.value);
                      setPage(1);
                    }}
                    className={`h-10 w-full ${isEn ? "pl-10 pr-3" : "pr-10"}`}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 sm:col-span-2">
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">{isEn ? "Program" : "البرنامج"}</label>
                  <Select value={programFilter} onValueChange={(v) => {
                    setProgramFilter(v);
                    setPage(1);
                  }}>
                    <SelectTrigger className="w-full h-10 text-xs md:text-sm">
                      <SelectValue placeholder={isEn ? "Program" : "البرنامج"} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{isEn ? "All Programs" : "جميع البرامج"}</SelectItem>
                      {Object.entries(PROGRAM_LABELS).map(([key]) => (
                        <SelectItem key={key} value={key}>{translateProgram(key)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">{isEn ? "Status" : "الحالة"}</label>
                  <Select value={statusFilter} onValueChange={(v) => {
                    setStatusFilter(v);
                    setPage(1);
                  }}>
                    <SelectTrigger className="w-full h-10 text-xs md:text-sm">
                      <SelectValue placeholder={isEn ? "Status" : "الحالة"} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{isEn ? "All" : "الكل"}</SelectItem>
                      {initialStage !== "field_visit" && user?.role !== "quick_response" && (
                        <SelectItem value="under_review">{isEn ? "Under Review" : "قيد المراجعة"}</SelectItem>
                      )}
                      <SelectItem value="in_progress">{isEn ? "In Progress" : "قيد التنفيذ"}</SelectItem>
                      <SelectItem value="completed">{isEn ? "Completed" : "مكتملة"}</SelectItem>
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
              <p className="text-muted-foreground mt-4 text-sm">{isEn ? "Loading..." : "جاري التحميل..."}</p>
            </div>
          ) : requests.length > 0 ? (
            <div>
              {/* Table Header (Desktop Only) */}
              <div className="hidden md:grid grid-cols-[auto_1.2fr_1.2fr_1.2fr_1fr_1fr_auto] gap-4 px-4 py-3 bg-muted/40 border-b text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                <div className="w-8"></div>
                <div>{isEn ? "Request" : "الطلب"}</div>
                <div>{isEn ? "Mosque" : "المسجد"}</div>
                <div>{isEn ? "Stage" : "المرحلة"}</div>
                <div>{isEn ? "Project" : "المشروع"}</div>
                <div>{isEn ? "Status" : "الحالة"}</div>
                <div className="w-20 text-center">{isEn ? "View" : "عرض"}</div>
              </div>

              {/* Rows / Cards */}
              <div className="divide-y divide-border">
                {requests.map((request: any) => {
                  const status = statusConfig[request.status] || statusConfig.pending;
                  return (
                    <div
                      key={request.id}
                      className={`grid grid-cols-1 md:grid-cols-[auto_1.2fr_1.2fr_1.2fr_1fr_1fr_auto] gap-3 md:gap-4 px-4 py-4 hover:bg-muted/30 transition-colors items-center ${canViewDetails ? "cursor-pointer" : "cursor-default"}`}
                      onClick={() => canViewDetails && navigate(`/requests/${request.id}`)}
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
                            <p className="font-bold text-foreground text-sm md:text-sm">
                              {request.programType === "bunyan" 
                                ? (isEn ? `Request ${request.requesterName || ""}` : `طلب ${request.requesterName || ""}`)
                                : (isEn ? `Mosque Request ${request.mosqueName || ""}` : `طلب مسجد ${request.mosqueName || ""}`)}
                            </p>
                            <p className="text-xs text-muted-foreground mt-0.5 truncate md:truncate break-words line-clamp-1">
                              {request.programName && !isEn ? request.programName : translateProgram(request.programType)} ({request.requestNumber})
                            </p>
                          </div>
                        </div>
                        <div className={`${isEn ? "text-right md:text-left" : "text-left md:text-right"} shrink-0`}>
                           <p className="text-[10px] md:text-xs text-muted-foreground">
                            {new Date(request.createdAt).toLocaleDateString(isEn ? "en-US" : "ar-SA")}
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
                          {translateStage(request.currentStage, request.requestTrack)}
                        </Badge>
                        {request.currentResponsibleDepartment && (
                          <p className="text-[10px] md:text-xs text-muted-foreground mt-1 truncate">
                            {translateDepartment(request.currentResponsibleDepartment)}
                          </p>
                        )}
                      </div>

                      {/* Project (Desktop) */}
                      <div className="hidden md:flex items-center gap-1.5 min-w-0">
                        {request.projectId ? (
                          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary bg-primary/5 px-2 py-1 rounded-md border border-primary/10">
                            <Briefcase className="w-3.5 h-3.5" />
                            <span className="truncate max-w-[180px]">{request.projectName}</span>
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </div>

                      {/* Status (Desktop) */}
                      <div className="hidden md:block shrink-0">
                        <span className={`inline-flex items-center gap-1.5 text-[10px] md:text-xs font-medium px-2.5 py-0.5 rounded-full border ${status.bg} ${status.color}`}>
                          {status.icon}
                          {translateStatus(request.status)}
                        </span>
                      </div>

                      {/* Mobile Card Row: Location + Stage + Status */}
                      <div className="md:hidden flex flex-col gap-3">
                        <div className="flex items-center gap-1.5 text-xs text-foreground bg-muted/50 p-2 rounded-md">
                          <Building2 className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                          <span className="truncate">{request.mosqueName || "—"}</span>
                        </div>
                        {request.projectId && (
                          <div className="flex items-center gap-1.5 text-xs text-foreground bg-primary/5 border border-primary/10 p-2 rounded-md">
                            <Briefcase className="w-3.5 h-3.5 text-primary shrink-0" />
                            <span className="font-semibold text-primary truncate">
                              {isEn ? "Linked Project:" : "المشروع المرتبط:"} {request.projectName}
                            </span>
                          </div>
                        )}
                        <div className="flex items-center justify-between gap-2">
                           <Badge variant="outline" className="text-[10px] py-0.5">
                            {translateStage(request.currentStage, request.requestTrack)}
                          </Badge>
                          <span className={`inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full border ${status.bg} ${status.color}`}>
                            {status.icon}
                            {translateStatus(request.status)}
                          </span>
                        </div>
                      </div>

                      {/* Desktop Action */}
                      <div className="hidden md:flex justify-center w-20" onClick={(e) => e.stopPropagation()}>
                        {canViewDetails && (
                          <Link href={`/requests/${request.id}`}>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-muted-foreground hover:text-primary">
                              <ChevronLeft className={`w-4 h-4 ${isEn ? "rotate-180" : ""}`} />
                            </Button>
                          </Link>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Footer with Pagination */}
              <div className="px-4 py-4 bg-muted/20 border-t flex flex-col items-center justify-center gap-4">
                <div className="text-[11px] md:text-xs text-muted-foreground text-center">
                  {isEn ? (
                    `Showing ${(page - 1) * limit + 1} - ${Math.min(page * limit, total)} of ${total} requests`
                  ) : (
                    `يعرض ${(page - 1) * limit + 1} - ${Math.min(page * limit, total)} من أصل ${total} طلب`
                  )}
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
                      <ChevronLeft className={`h-4 w-4 ${isEn ? "" : "rotate-180"}`} />
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
                      <ChevronLeft className={`h-4 w-4 ${isEn ? "rotate-180" : ""}`} />
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
              <p className="text-foreground font-medium mb-1">{isEn ? "No requests found" : "لا توجد طلبات"}</p>
              <p className="text-muted-foreground text-sm mb-4">
                {search || programFilter !== "all" || statusFilter !== "all"
                  ? (isEn ? "No results match the search criteria" : "لا توجد نتائج تطابق معايير البحث")
                  : (isEn ? "No requests have been submitted yet" : "لم يتم تقديم أي طلبات بعد")}
              </p>
              {!initialAssignedToMe && (
                <PermissionGuard permission="requests.create">
                  <Link href="/service-request">
                    <Button className="gradient-primary text-white gap-2">
                      <Plus className="w-4 h-4" />
                      {isEn ? "New Request" : "تقديم طلب جديد"}
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
