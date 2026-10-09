import { useState, useEffect, useRef } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import EnhancedPagination, { usePersistedPage } from "@/components/EnhancedPagination";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { cn, formatErrorMessage } from "@/lib/utils";
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
  Briefcase,
  Tag,
  StickyNote,
  Sparkles,
  User,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  ShieldAlert,
} from "lucide-react";
import { Link, useLocation, useSearch } from "wouter";
import { trpc } from "@/lib/trpc";
import { PROGRAM_LABELS, STAGE_LABELS, STATUS_LABELS, getStageLabel } from "@shared/constants";
import { ProgramIcon } from "@/components/ProgramIcon";
import { MultiMosquesIcon } from "@/components/MultiMosquesIcon";
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
  
  const utils = trpc.useUtils();
  const [search, setSearch] = useState("");
  const [programFilter, setProgramFilter] = useState<string>("all");
  const [creatorTypeFilter, setCreatorTypeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [stageFilter, setStageFilter] = useState<string>(initialStage || "all");
  const [closureFilter, setClosureFilter] = useState<"all" | "pending_confirmation">("all");
  const [page, setPage, resetPage] = usePersistedPage("requests_table_page", 1);
  const limit = 20;
  const isFirstMount = useRef(true);

  const isEn = user?.role === "quick_response" && lang === "en";
  const userPermissions = (user as any)?.permissions ?? [];
  const isAdmin = ["super_admin", "system_admin"].includes(user?.role || "");
  const isExecutiveDirector = ["executive_director", "general_manager"].includes(user?.role || "");
  const canViewDetails = isAdmin || 
                         userPermissions.includes("requests.view_details") || 
                         userPermissions.includes("requests.manage_as_field_team") ||
                         userPermissions.includes("requests.manage_as_quick_response") ||
                         userPermissions.includes("requests.upload_final_report");

  // عدد الطلبات التي بانتظار تأكيد الإغلاق من المدير التنفيذي
  const { data: pendingClosureData } = trpc.requests.getPendingClosureCount.useQuery(undefined, {
    enabled: isExecutiveDirector,
    refetchInterval: 15000,
  });
  const pendingClosureCount = isExecutiveDirector ? (pendingClosureData?.count || 0) : 0;

  // حالات نافذة تأكيد أو رفض الإغلاق
  const [selectedClosureRequest, setSelectedClosureRequest] = useState<any | null>(null);
  const [showClosureModal, setShowClosureModal] = useState(false);
  const [closureRejectionReason, setCloseRejectionReason] = useState("");
  const [isRejecting, setIsRejecting] = useState(false);

  const confirmCloseMutation = trpc.requests.confirmClose.useMutation({
    onSuccess: (data) => {
      toast.success(data.message);
      setShowClosureModal(false);
      setSelectedClosureRequest(null);
      utils.requests.search.invalidate();
      utils.requests.getPendingClosureCount.invalidate();
      utils.projects.getAll.invalidate();
      utils.disbursements.getActiveDonations.invalidate();
    },
    onError: (error) => {
      toast.error(formatErrorMessage(error, "فشل تأكيد إغلاق الطلب"));
    },
  });

  const rejectCloseMutation = trpc.requests.rejectClose.useMutation({
    onSuccess: (data) => {
      toast.success(data.message);
      setShowClosureModal(false);
      setSelectedClosureRequest(null);
      setCloseRejectionReason("");
      setIsRejecting(false);
      utils.requests.search.invalidate();
      utils.requests.getPendingClosureCount.invalidate();
      utils.projects.getAll.invalidate();
      utils.disbursements.getActiveDonations.invalidate();
    },
    onError: (error) => {
      toast.error(formatErrorMessage(error, "يرجى كتابة سبب وتوجيه واضح لرفض الإغلاق (3 أحرف على الأقل)"));
    },
  });

  // تحديث الفلاتر عند تغيير Query Params (مثلاً عند الانتقال من لوحة التحكم)
  useEffect(() => {
    const params = new URLSearchParams(searchParamsStr);
    const hasFilterParam = params.has("program") || params.has("status") || params.has("stage");
    
    const program = params.get("program");
    if (program && (PROGRAM_LABELS[program] || program === "all")) {
      if (program === "sedana" && !isAdmin) {
        setProgramFilter("all");
      } else {
        setProgramFilter(program);
      }
    }

    const status = params.get("status");
    if (status && (STATUS_LABELS[status] || status === "all")) {
      setStatusFilter(status);
    }

    const stage = params.get("stage");
    if (stage && (STAGE_LABELS[stage] || stage === "all")) {
      setStageFilter(stage);
    }

    const pageParam = params.get("page");
    if (pageParam) {
      const parsedPage = parseInt(pageParam, 10);
      if (!isNaN(parsedPage) && parsedPage >= 1) {
        setPage(parsedPage);
        return;
      }
    }

    // لا نقوم بإعادة تعيين الصفحة إلى 1 عند أول تحميل إلا إذا كان هناك فلتر صريح في الـ URL
    if (!isFirstMount.current && hasFilterParam) {
      resetPage();
    }
    isFirstMount.current = false;
  }, [searchParamsStr, isAdmin, resetPage, setPage]);

  const { data: requestsData, isLoading } = trpc.requests.search.useQuery({
    search: search || undefined,
    programType: (!isAdmin && programFilter === "sedana") ? undefined : (programFilter !== "all" ? programFilter as any : undefined),
    excludeSedana: !isAdmin,
    status: statusFilter !== "all" ? statusFilter as any : undefined,
    currentStage: stageFilter !== "all" ? stageFilter as any : undefined,
    closureStatusFilter: closureFilter !== "all" ? closureFilter : undefined,
    assignedTo: initialAssignedToMe ? user?.id : undefined,
    creatorType: creatorTypeFilter !== "all" ? creatorTypeFilter as any : undefined,
    page,
    limit,
  });

  const rawRequests = requestsData?.requests || [];
  const requests = isAdmin ? rawRequests : rawRequests.filter((r: any) => (r.request?.programType || r.programType) !== "sedana");
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
              {isAdmin && (
              <PermissionGuard permission="requests.create">
                <Link href="/service-request?service=sedana">
                  <Button className="bg-cyan-600 hover:bg-cyan-700 text-white gap-2 w-full sm:w-auto h-10 shadow-sm font-bold border-0 transition-all">
                    <Sparkles className="w-4 h-4 text-cyan-200" />
                    <span>{isEn ? "Operation Services (Sedana)" : "خدمات التشغيل (سدانة)"}</span>
                  </Button>
                </Link>
              </PermissionGuard>
              )}
              {(user?.role === "quick_response" || userPermissions.includes("requests.create_quick_request")) && (
                <>
                  <Link href="/requests/quick-create">
                    <Button 
                      className="bg-amber-600 hover:bg-amber-700 text-white gap-2 w-full sm:w-auto h-10 shadow-sm transition-all font-semibold"
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

        {/* بنر التنبيه للطلبات التي بانتظار تأكيد الإغلاق من المدير التنفيذي */}
        {isExecutiveDirector && pendingClosureCount > 0 && (
          <div className="p-4 bg-gradient-to-l from-amber-500/15 via-amber-500/10 to-orange-500/10 border-2 border-amber-400 dark:border-amber-600 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-xs">
                <AlertTriangle className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <h4 className="font-bold text-sm sm:text-base text-foreground">
                  يوجد {pendingClosureCount} {pendingClosureCount === 1 ? "طلب بحاجة" : "طلبات بحاجة"} إلى تأكيد الإغلاق من قِبل المدير التنفيذي
                </h4>
                <p className="text-xs text-muted-foreground mt-0.5">
                  قام مدير النظام بطلب إغلاق هذه الطلبات، ولا تُغلق نهائياً إلا بعد تأكيد واعتماد المدير التنفيذي
                </p>
              </div>
            </div>
            <Button
              variant={closureFilter === "pending_confirmation" ? "default" : "outline"}
              size="sm"
              className={cn(
                "font-bold text-xs shrink-0 rounded-xl px-4 h-9 cursor-pointer",
                closureFilter === "pending_confirmation" 
                  ? "bg-amber-600 hover:bg-amber-700 text-white" 
                  : "border-amber-400 text-amber-900 hover:bg-amber-100 dark:text-amber-200 dark:border-amber-700"
              )}
              onClick={() => {
                setClosureFilter(closureFilter === "pending_confirmation" ? "all" : "pending_confirmation");
                resetPage();
              }}
            >
              {closureFilter === "pending_confirmation" ? "عرض جميع الطلبات" : "فلترة الطلبات بانتظار التأكيد"}
            </Button>
          </div>
        )}

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
                      resetPage();
                    }}
                    className={`h-10 w-full ${isEn ? "pl-10 pr-3" : "pr-10"}`}
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 sm:col-span-2">
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">{isEn ? "Program" : "البرنامج"}</label>
                  <Select value={programFilter} onValueChange={(v) => {
                    setProgramFilter(v);
                    resetPage();
                  }}>
                    <SelectTrigger className="w-full h-10 text-xs md:text-sm">
                      <SelectValue placeholder={isEn ? "Program" : "البرنامج"} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{isEn ? "All Programs" : "جميع البرامج"}</SelectItem>
                      {Object.entries(PROGRAM_LABELS)
                        .filter(([key]) => isAdmin || key !== "sedana")
                        .map(([key]) => (
                        <SelectItem key={key} value={key}>{translateProgram(key)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">{isEn ? "Created By" : "منشئ الطلب"}</label>
                  <Select value={creatorTypeFilter} onValueChange={(v) => {
                    setCreatorTypeFilter(v);
                    resetPage();
                  }}>
                    <SelectTrigger className="w-full h-10 text-xs md:text-sm">
                      <SelectValue placeholder={isEn ? "Created By" : "منشئ الطلب"} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{isEn ? "All" : "الكل"}</SelectItem>
                      <SelectItem value="beneficiary">{isEn ? "Beneficiaries" : "طلبات المستفيدين"}</SelectItem>
                      <SelectItem value="officer">{isEn ? "Officers" : "طلبات المسؤولين"}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">{isEn ? "Status" : "الحالة"}</label>
                  <Select value={statusFilter} onValueChange={(v) => {
                    setStatusFilter(v);
                    resetPage();
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
              {/* Table Container with Horizontal Scroll support on desktop */}
              <div className="overflow-x-auto">
                <div className="min-w-0 md:min-w-[1100px]">
                  {/* Table Header (Desktop Only) */}
                  <div className={cn(
                    "hidden md:grid grid-cols-[36px_minmax(180px,1.4fr)_minmax(120px,0.9fr)_minmax(130px,1fr)_minmax(115px,0.85fr)_minmax(130px,1fr)_minmax(140px,1.1fr)_minmax(110px,0.8fr)_44px] gap-3.5 px-4 py-3 bg-muted/40 border-b text-[11px] font-bold text-muted-foreground uppercase tracking-wider items-center",
                    isEn ? "border-l-4 border-l-transparent" : "border-r-4 border-r-transparent"
                  )}>
                    <div className="w-9"></div>
                    <div className="truncate">{isEn ? "Request" : "الطلب"}</div>
                    <div className="truncate">{isEn ? "Caption" : "التسمية التوضيحية"}</div>
                    <div className="truncate">{isEn ? "Mosque" : "المسجد"}</div>
                    <div className="truncate">{isEn ? "Stage" : "المرحلة"}</div>
                    <div className="truncate">{isEn ? "Officer" : "اسم المسؤول"}</div>
                    <div className="truncate">{isEn ? "Project" : "المشروع"}</div>
                    <div className="truncate">{isEn ? "Status" : "الحالة"}</div>
                    <div className="w-11 text-center">{isEn ? "View" : "عرض"}</div>
                  </div>

                  {/* Rows / Cards */}
                  <div className="divide-y divide-border">
                    {requests.map((request: any) => {
                      const status = statusConfig[request.status] || statusConfig.pending;
                      const isSedana = request.programType?.toLowerCase() === "sedana";
                      return (
                        <div
                          key={request.id}
                          className={cn(
                            "grid grid-cols-1 md:grid-cols-[36px_minmax(180px,1.4fr)_minmax(120px,0.9fr)_minmax(130px,1fr)_minmax(115px,0.85fr)_minmax(130px,1fr)_minmax(140px,1.1fr)_minmax(110px,0.8fr)_44px] gap-3 md:gap-3.5 px-4 py-3.5 transition-colors items-center",
                            canViewDetails ? "cursor-pointer" : "cursor-default",
                            request.closureStatus === "pending_confirmation" && isExecutiveDirector
                              ? cn(
                                  "bg-amber-50/80 hover:bg-amber-100/80 dark:bg-amber-950/40 dark:hover:bg-amber-950/60 shadow-xs",
                                  isEn ? "border-l-4 border-l-amber-500" : "border-r-4 border-r-amber-500"
                                )
                              : isSedana 
                              ? cn(
                                  "bg-cyan-50/60 hover:bg-cyan-100/60 dark:bg-cyan-950/25 dark:hover:bg-cyan-950/45",
                                  isEn ? "border-l-4 border-l-cyan-600 dark:border-l-cyan-400" : "border-r-4 border-r-cyan-600 dark:border-r-cyan-400"
                                )
                              : cn(
                                  "hover:bg-muted/30",
                                  isEn ? "border-l-4 border-l-transparent" : "border-r-4 border-r-transparent"
                                )
                          )}
                          onClick={() => canViewDetails && navigate(`/requests/${request.id}`)}
                        >
                          {/* Desktop: Program Icon */}
                          <div className="hidden md:flex w-9 justify-center shrink-0">
                            {request.isMultiMosque || request.programData?.isMultiMosque ? (
                              <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-200/60 dark:border-indigo-800/60 shadow-xs" title="مشروع مباشر لعدة مساجد">
                                <MultiMosquesIcon className="w-4.5 h-4.5" />
                              </div>
                            ) : isSedana ? (
                              <div className="w-8 h-8 rounded-lg bg-cyan-100 dark:bg-cyan-950/70 text-cyan-600 dark:text-cyan-400 flex items-center justify-center border border-cyan-300 dark:border-cyan-700 shadow-xs" title={isEn ? "Sedana Program" : "برنامج سدانة"}>
                                <Sparkles className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                              </div>
                            ) : (
                              <ProgramIcon program={request.programType} size="md" />
                            )}
                          </div>

                          {/* Request Info (Mobile & Desktop) */}
                          <div className="flex items-start justify-between md:block gap-3 min-w-0">
                            <div className="flex items-center gap-3 md:block min-w-0">
                              <div className="md:hidden shrink-0">
                                {request.isMultiMosque || request.programData?.isMultiMosque ? (
                                  <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-200/60 dark:border-indigo-800/60 shadow-xs">
                                    <MultiMosquesIcon className="w-4.5 h-4.5" />
                                  </div>
                                ) : isSedana ? (
                                  <div className="w-8 h-8 rounded-lg bg-cyan-100 dark:bg-cyan-950/70 text-cyan-600 dark:text-cyan-400 flex items-center justify-center border border-cyan-300 dark:border-cyan-700 shadow-xs" title={isEn ? "Sedana Program" : "برنامج سدانة"}>
                                    <Sparkles className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                                  </div>
                                ) : (
                                  <ProgramIcon program={request.programType} size="md" />
                                )}
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <p className="font-bold text-foreground text-sm truncate max-w-full" title={
                                    request.isMultiMosque || request.programData?.isMultiMosque
                                      ? (request.projectName || request.descriptiveName || "مشروع لعدة مساجد")
                                      : request.programType === "bunyan" 
                                        ? (isEn ? `Request ${request.requesterName || ""}` : `طلب ${request.requesterName || ""}`)
                                        : (isEn 
                                            ? (request.mosqueName?.trim().toLowerCase().startsWith("mosque") ? `Request ${request.mosqueName}` : `Mosque Request ${request.mosqueName || ""}`)
                                            : (request.mosqueName?.trim().startsWith("مسجد") ? `طلب ${request.mosqueName}` : `طلب مسجد ${request.mosqueName || ""}`))
                                  }>
                                    {request.isMultiMosque || request.programData?.isMultiMosque
                                      ? (request.projectName || request.descriptiveName || "مشروع لعدة مساجد")
                                      : request.programType === "bunyan" 
                                        ? (isEn ? `Request ${request.requesterName || ""}` : `طلب ${request.requesterName || ""}`)
                                        : (isEn 
                                            ? (request.mosqueName?.trim().toLowerCase().startsWith("mosque") ? `Request ${request.mosqueName}` : `Mosque Request ${request.mosqueName || ""}`)
                                            : (request.mosqueName?.trim().startsWith("مسجد") ? `طلب ${request.mosqueName}` : `طلب مسجد ${request.mosqueName || ""}`))}
                                  </p>
                                  {isSedana && (
                                    <Badge variant="outline" className="bg-cyan-100 dark:bg-cyan-950/70 text-cyan-700 dark:text-cyan-300 border-cyan-300 dark:border-cyan-700 text-[10px] py-0 px-1.5 font-bold inline-flex items-center gap-1 shadow-2xs shrink-0">
                                      <Sparkles className="w-2.5 h-2.5 text-cyan-600 dark:text-cyan-400" />
                                      <span>{isEn ? "Sedana" : "سدانة"}</span>
                                    </Badge>
                                  )}
                                  {request.closureStatus === "pending_confirmation" && isExecutiveDirector && (
                                    <Badge 
                                      variant="outline" 
                                      className="bg-amber-100 text-amber-900 border-amber-400 dark:bg-amber-950/70 dark:text-amber-200 dark:border-amber-600 text-[10px] py-0 px-2 font-bold inline-flex items-center gap-1 shadow-2xs shrink-0 animate-pulse"
                                      title="طلب إغلاق بانتظار تأكيد واعتماد المدير التنفيذي"
                                    >
                                      <AlertTriangle className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                                      <span>⚠️ بانتظار تأكيد الإغلاق</span>
                                    </Badge>
                                  )}
                                  {Boolean(request.reviewNotes) && (
                                    <span 
                                      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-amber-50 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60 shrink-0" 
                                      title="يوجد ملاحظات مسجلة على هذا الطلب"
                                    >
                                      <StickyNote className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                                      <span>{isEn ? "Notes" : "ملاحظات"}</span>
                                    </span>
                                  )}
                                </div>
                                <p className="text-xs text-muted-foreground mt-0.5 truncate break-words line-clamp-1">
                                  {request.isMultiMosque || request.programData?.isMultiMosque
                                    ? `مشروع مباشر لعدة مساجد (${request.requestNumber})`
                                    : `${request.programName && !isEn ? request.programName : translateProgram(request.programType)} (${request.requestNumber})`}
                                </p>
                              </div>
                            </div>
                            <div className={`${isEn ? "text-right md:text-left" : "text-left md:text-right"} shrink-0 md:hidden`}>
                              <p className="text-[10px] text-muted-foreground">
                                {new Date(request.createdAt).toLocaleDateString(isEn ? "en-US" : "ar-SA")}
                              </p>
                            </div>
                          </div>

                          {/* Descriptive Name / التسمية التوضيحية */}
                          <div className="hidden md:flex items-center min-w-0">
                            {request.descriptiveName && (!request.isMultiMosque || request.descriptiveName !== request.projectName) ? (
                              <span className="inline-flex items-center gap-1 text-xs font-semibold text-purple-800 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/40 px-2.5 py-1 rounded-md border border-purple-200/60 dark:border-purple-800/60 max-w-full min-w-0" title={request.descriptiveName}>
                                <Tag className="w-3 h-3 text-purple-600 dark:text-purple-400 shrink-0 ml-0.5" />
                                <span className="truncate">{request.descriptiveName}</span>
                              </span>
                            ) : (
                              <span className="text-xs text-muted-foreground">—</span>
                            )}
                          </div>

                          {/* Mosque (Desktop & Tablet) */}
                          <div className="hidden md:flex items-center gap-1.5 min-w-0">
                            <Building2 className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                            <span className="text-xs font-medium text-foreground truncate" title={request.multiMosqueNames || request.mosqueName || "—"}>
                              {request.multiMosqueNames || request.mosqueName || "—"}
                            </span>
                          </div>

                          {/* Stage (Desktop) */}
                          <div className="hidden md:block min-w-0">
                            <Badge variant="outline" className="text-[10px] md:text-[11px] font-medium py-0.5 px-2 h-auto max-w-full truncate inline-block" title={translateStage(request.currentStage, request.requestTrack)}>
                              <span className="truncate">{translateStage(request.currentStage, request.requestTrack)}</span>
                            </Badge>
                            {request.currentResponsibleDepartment && (
                              <p className="text-[10px] text-muted-foreground mt-0.5 truncate" title={translateDepartment(request.currentResponsibleDepartment)}>
                                {translateDepartment(request.currentResponsibleDepartment)}
                              </p>
                            )}
                          </div>

                          {/* Officer / Admin Name (Desktop) */}
                          <div className="hidden md:flex items-center min-w-0">
                            {request.adminName ? (
                              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-800 dark:text-slate-200 bg-slate-100 dark:bg-slate-800/80 px-2.5 py-1 rounded-md border border-slate-200/80 dark:border-slate-700/80 max-w-full min-w-0" title={request.adminName}>
                                <User className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                                <span className="truncate">{request.adminName}</span>
                              </span>
                            ) : (
                              <span className="text-xs text-muted-foreground font-medium">—</span>
                            )}
                          </div>

                          {/* Project (Desktop) */}
                          <div className="hidden md:flex items-center min-w-0">
                            {request.projectId ? (
                              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary bg-primary/5 px-2.5 py-1 rounded-md border border-primary/10 max-w-full min-w-0" title={request.projectName}>
                                <Briefcase className="w-3.5 h-3.5 shrink-0 text-primary" />
                                <span className="truncate">{request.projectName}</span>
                              </span>
                            ) : (
                              <span className="text-xs text-muted-foreground">—</span>
                            )}
                          </div>

                          {/* Status (Desktop) */}
                          <div className="hidden md:flex flex-col items-start gap-1 min-w-0">
                            <span className={`inline-flex items-center gap-1.5 text-[10px] md:text-xs font-medium px-2.5 py-0.5 rounded-full border ${status.bg} ${status.color} shrink-0`}>
                              {status.icon}
                              <span>{translateStatus(request.status)}</span>
                            </span>
                            {request.closureStatus === "pending_confirmation" && isExecutiveDirector && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-6 px-2 text-[10px] bg-amber-500/15 border-amber-500/40 text-amber-900 dark:text-amber-200 hover:bg-amber-500/25 font-bold shadow-2xs"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedClosureRequest(request);
                                  setShowClosureModal(true);
                                }}
                              >
                                <ShieldAlert className="w-3 h-3 ml-1 text-amber-600 dark:text-amber-400" />
                                {isEn ? "Confirm/Reject" : "تأكيد/رفض"}
                              </Button>
                            )}
                          </div>

                          {/* Mobile Card Row: Location + Officer + Project + Stage + Status */}
                          <div className="md:hidden flex flex-col gap-2.5">
                            <div className={cn(
                              "flex items-center gap-1.5 text-xs text-foreground p-2 rounded-md",
                              isSedana ? "bg-white/80 dark:bg-cyan-900/30 border border-cyan-200/60 dark:border-cyan-800/40" : "bg-muted/50"
                            )}>
                              <Building2 className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                              <span className="truncate">{request.multiMosqueNames || request.mosqueName || "—"}</span>
                            </div>

                            <div className={cn(
                              "flex items-center justify-between text-xs px-2.5 py-1.5 rounded-md",
                              isSedana ? "bg-white/60 dark:bg-cyan-900/20 border border-cyan-200/40 dark:border-cyan-800/30" : "bg-muted/30"
                            )}>
                              <span className="flex items-center gap-1 text-muted-foreground">
                                <User className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                                <span>{isEn ? "Officer:" : "اسم المسؤول:"}</span>
                              </span>
                              <span className="font-semibold text-foreground truncate max-w-[180px]">
                                {request.adminName || "—"}
                              </span>
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

                            {request.closureStatus === "pending_confirmation" && isExecutiveDirector && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="w-full mt-1 bg-amber-500/10 border-amber-500/30 text-amber-800 hover:bg-amber-500/20 font-bold text-xs flex items-center justify-center gap-1.5"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedClosureRequest(request);
                                  setShowClosureModal(true);
                                }}
                              >
                                <ShieldAlert className="w-3.5 h-3.5 text-amber-600" />
                                <span>{isEn ? "Closure Confirmation Decision" : "اتخاذ قرار بشأن إغلاق الطلب"}</span>
                              </Button>
                            )}
                          </div>

                          {/* Desktop Action */}
                          <div className="hidden md:flex justify-center w-11 shrink-0" onClick={(e) => e.stopPropagation()}>
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
                </div>
              </div>

              {/* Footer with Enhanced Pagination */}
              <EnhancedPagination
                page={page}
                totalPages={totalPages}
                onPageChange={handlePageChange}
                totalItems={total}
                itemsPerPage={limit}
                itemName={isEn ? "request" : "طلب"}
                itemNamePlural={isEn ? "requests" : "طلبات"}
                isEn={isEn}
                className="bg-muted/20 border-t"
              />
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

        {/* نافذة تأكيد أو رفض إغلاق الطلب (للمدير التنفيذي) */}
        <Dialog open={showClosureModal} onOpenChange={(open) => {
          if (!open) {
            setShowClosureModal(false);
            setSelectedClosureRequest(null);
            setCloseRejectionReason("");
            setIsRejecting(false);
          }
        }}>
          <DialogContent className="max-w-lg" dir={isEn ? "ltr" : "rtl"}>
            <DialogHeader>
              <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
                <ShieldAlert className="w-5 h-5" />
                <DialogTitle className="text-lg font-bold">
                  {isEn ? "Request Closure Decision" : "قرار تأكيد أو رفض إغلاق الطلب"}
                </DialogTitle>
              </div>
            </DialogHeader>

            {selectedClosureRequest && (
              <div className="space-y-4 pt-2">
                {/* معلومات الطلب */}
                <div className="p-3 bg-muted/50 rounded-lg space-y-1.5 text-sm border">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{isEn ? "Request #:" : "رقم الطلب:"}</span>
                    <span className="font-bold">{selectedClosureRequest.requestNumber}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{isEn ? "Mosque:" : "المسجد:"}</span>
                    <span className="font-semibold">{selectedClosureRequest.mosqueName || selectedClosureRequest.projectName || "—"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{isEn ? "Current Stage:" : "المرحلة الحالية:"}</span>
                    <Badge variant="outline" className="text-xs">
                      {translateStage(selectedClosureRequest.currentStage, selectedClosureRequest.requestTrack)}
                    </Badge>
                  </div>
                  {selectedClosureRequest.closureReason && (
                    <div className="pt-2 border-t border-border mt-2">
                      <span className="text-muted-foreground block text-xs mb-1 font-medium">
                        {isEn ? "Closure Reason from Admin:" : "سبب طلب الإغلاق المقدم من مدير النظام:"}
                      </span>
                      <p className="text-xs bg-amber-500/10 text-amber-900 dark:text-amber-200 p-2 rounded border border-amber-500/20 whitespace-pre-wrap">
                        {selectedClosureRequest.closureReason}
                      </p>
                    </div>
                  )}
                </div>

                {/* تنبيه بالصلاحية */}
                <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-lg text-xs text-amber-800 dark:text-amber-300">
                  <p className="font-semibold mb-1">
                    {isEn ? "Executive Director Confirmation Required" : "مطلوب تأكيد المدير التنفيذي:"}
                  </p>
                  <p>
                    {isEn 
                      ? "Confirming closure will mark this request as closed and completed immediately. Rejecting closure will keep the request in its current stage without closing."
                      : "تأكيد الإغلاق سينقل الطلب نهائياً إلى حالة مكتمل ومغلق. رفض الإغلاق سيبقي الطلب في مرحلته الحالية دون أي إغلاق."}
                  </p>
                </div>

                {/* وضع الرفض مع كتابة السبب */}
                {isRejecting ? (
                  <div className="space-y-3 p-3 bg-red-50/50 dark:bg-red-950/20 border border-red-200 dark:border-red-800/50 rounded-lg">
                    <Label className="text-xs font-bold text-red-700 dark:text-red-400">
                      {isEn ? "Reason for rejecting closure (Required):" : "سبب رفض الإغلاق (مطلوب):"}
                    </Label>
                    <Textarea
                      placeholder={isEn ? "Please specify why the request should not be closed..." : "اكتب سبب رفض إغلاق الطلب واستمراره..."}
                      value={closureRejectionReason}
                      onChange={(e) => setCloseRejectionReason(e.target.value)}
                      className="text-xs min-h-[80px]"
                    />
                    <div className="flex gap-2 justify-end">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setIsRejecting(false);
                          setCloseRejectionReason("");
                        }}
                      >
                        {isEn ? "Cancel" : "إلغاء"}
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        disabled={closureRejectionReason.trim().length < 3 || rejectCloseMutation.isPending}
                        onClick={() => {
                          const reason = closureRejectionReason.trim();
                          if (reason.length < 3) {
                            toast.error("يرجى كتابة سبب وتوجيه واضح لرفض الإغلاق (3 أحرف على الأقل)");
                            return;
                          }
                          rejectCloseMutation.mutate({
                            requestId: selectedClosureRequest.id,
                            reason,
                          });
                        }}
                      >
                        {rejectCloseMutation.isPending ? (isEn ? "Rejecting..." : "جاري الرفض...") : (isEn ? "Confirm Rejection" : "تأكيد رفض الإغلاق")}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col sm:flex-row gap-2.5 justify-end pt-2">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setShowClosureModal(false);
                        setSelectedClosureRequest(null);
                      }}
                    >
                      {isEn ? "Close Window" : "إغلاق النافذة"}
                    </Button>
                    
                    <Button
                      variant="outline"
                      className="border-red-300 text-red-700 hover:bg-red-50 hover:text-red-800 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950/50 gap-1.5"
                      onClick={() => setIsRejecting(true)}
                      disabled={confirmCloseMutation.isPending}
                    >
                      <XCircle className="w-4 h-4" />
                      <span>{isEn ? "Reject Closure" : "رفض الإغلاق"}</span>
                    </Button>

                    <Button
                      className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 font-bold"
                      disabled={confirmCloseMutation.isPending}
                      onClick={() => {
                        confirmCloseMutation.mutate({
                          requestId: selectedClosureRequest.id,
                        });
                      }}
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>{confirmCloseMutation.isPending ? (isEn ? "Confirming..." : "جاري التأكيد...") : (isEn ? "Confirm Final Closure" : "تأكيد الإغلاق النهائي")}</span>
                    </Button>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
