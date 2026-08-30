import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { usePermission } from "@/hooks/usePermission";
import { useAuth } from "@/_core/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  CheckSquare,
  Users,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  Filter,
  Eye,
  FileText,
  MapPin,
  User,
  Mail,
  Phone,
  Calendar,
  Shield,
  X,
  Download,
  Info,
  Loader2,
  Building2,
  Gift,
  Package,
  HelpCircle,
  MessageSquareQuote,
  PhoneCall,
  MessageCircle,
  ExternalLink,
  Edit3,
  Trash2,
  AlertCircle,
  Layers,
  Sparkles,
  Truck,
  FileCheck
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useLocation } from "wouter";

// ترجمة صفة طالب الخدمة
const getRequesterTypeLabel = (type: string | null | undefined) => {
  if (!type) return "غير محدد";
  const types: Record<string, string> = {
    imam: "إمام",
    muezzin: "مؤذن",
    donor: "متبرع",
    other: "أخرى",
  };
  return types[type] || type;
};

const statusConfig: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  pending: { label: "قيد المراجعة", color: "bg-amber-100 text-amber-900 dark:bg-amber-950/70 dark:text-amber-300 border border-amber-300 dark:border-amber-700/80 shadow-2xs font-bold", icon: Clock },
  active: { label: "مُعتمد", color: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border border-green-200 dark:border-green-800", icon: CheckCircle2 },
  suspended: { label: "موقوف", color: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 border border-red-200 dark:border-red-800", icon: XCircle },
  blocked: { label: "محظور", color: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400 border border-gray-200 dark:border-gray-800", icon: XCircle },
};

const submissionStatusConfig: Record<string, { label: string; color: string; dot: string }> = {
  new: { label: "جديد", color: "bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800", dot: "bg-amber-500" },
  under_review: { label: "قيد المراجعة", color: "bg-sky-50 text-sky-800 border-sky-200 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-800", dot: "bg-sky-500" },
  contacted: { label: "تم التواصل", color: "bg-purple-50 text-purple-800 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800", dot: "bg-purple-500" },
  completed: { label: "مكتمل ومغلق", color: "bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800", dot: "bg-emerald-500" },
  archived: { label: "مؤرشف", color: "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700", dot: "bg-slate-400" },
};

const formatSubmissionDate = (dateStr: string | Date | null | undefined) => {
  if (!dateStr) return "—";
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString("ar-EG", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return "—";
  }
};

const submissionTypeLabels: Record<string, { label: string; shortLabel: string; icon: string; badge: string }> = {
  donor_land: { 
    label: "تبرع بأرض مسجد", 
    shortLabel: "أرض مسجد", 
    icon: "🏞️", 
    badge: "bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300" 
  },
  donor_inkind: { 
    label: "تبرع عيني ومواد", 
    shortLabel: "تبرع عيني", 
    icon: "📦", 
    badge: "bg-teal-50 text-teal-800 border-teal-200 dark:bg-teal-950/40 dark:text-teal-300" 
  },
  donor_other: { 
    label: "مبادرات وتبرعات أخرى", 
    shortLabel: "مبادرة أخرى", 
    icon: "🤝", 
    badge: "bg-indigo-50 text-indigo-800 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300" 
  },
  general_inquiry: { 
    label: "استفسار عام وتواصل", 
    shortLabel: "استفسار", 
    icon: "💬", 
    badge: "bg-sky-50 text-sky-800 border-sky-200 dark:bg-sky-950/40 dark:text-sky-300" 
  },
};

export default function RequesterApprovals() {
  const { user: currentUser } = useAuth();
  const [, navigate] = useLocation();
  const hasApprovePermission = usePermission("requesters.approve");
  const hasViewPermission = usePermission("requesters.view");
  const canApprove = hasApprovePermission;

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [confirmAction, setConfirmAction] = useState<{
    userId: number;
    name: string;
    action: "active" | "suspended";
  } | null>(null);

  // التبويبات: حسابات | استثناءات | تبرعات غير مالية | استفسارات عامة
  const [activeTab, setActiveTab] = useState<'requests' | 'exceptions' | 'donations' | 'inquiries'>('requests');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // فلاتر التبرعات والاستفسارات
  const [donationTypeFilter, setDonationTypeFilter] = useState<string>("all");
  const [donationStatusFilter, setDonationStatusFilter] = useState<string>("all");
  const [inquiryStatusFilter, setInquiryStatusFilter] = useState<string>("all");
  const [submissionSearch, setSubmissionSearch] = useState<string>("");

  // نافذة تفاصيل ومراجعة الطلب الخارجي / الاستفسار
  const [selectedSubmission, setSelectedSubmission] = useState<any | null>(null);

  // طلبات الاستثناء
  const { data: exceptionRequests = [], refetch: refetchExceptions } = trpc.requests.getExceptionRequests.useQuery(undefined, {
    enabled: hasViewPermission || hasApprovePermission
  });

  const reviewExceptionMutation = trpc.requests.reviewException.useMutation({
    onSuccess: () => {
      toast.success("تم تحديث حالة طلب الاستثناء بنجاح");
      refetchExceptions();
    },
    onError: (err) => {
      toast.error(err.message || "حدث خطأ أثناء مراجعة طلب الاستثناء");
    }
  });

  const pendingExceptionsCount = exceptionRequests.filter(e => e.exception.status === "pending").length;

  const utils = trpc.useUtils();

  // جلب حسابات المستخدمين
  const { data: usersResponse, isLoading, refetch } = trpc.users.getAll.useQuery({
    role: "service_requester",
    limit: 100,
  });

  const toggleStatus = trpc.users.toggleStatus.useMutation({
    onSuccess: async (_, variables) => {
      toast.success(
        variables.status === "active"
          ? "تم اعتماد الحساب بنجاح"
          : "تم إيقاف الحساب بنجاح"
      );
      await Promise.all([
        utils.users.getAll.invalidate(),
        utils.users.getById.invalidate({ id: variables.userId }),
        refetch(),
      ]);
      setConfirmAction(null);
    },
    onError: (err: any) => {
      toast.error(err.message || "حدث خطأ أثناء تحديث الحساب");
    },
  });

  // جلب التبرعات غير المالية (أراضي + عيني + أخرى) - باستثناء التبرع المالي
  const { 
    data: donationSubmissions = [], 
    isLoading: isLoadingDonations, 
    refetch: refetchDonations 
  } = trpc.publicSubmissions.getAll.useQuery({
    category: "donor",
    excludeTypes: ["donor_financial"],
    submissionType: donationTypeFilter !== "all" ? donationTypeFilter : undefined,
    status: donationStatusFilter !== "all" ? donationStatusFilter : undefined,
    search: submissionSearch || undefined,
  });

  // جلب الاستفسارات العامة
  const { 
    data: inquirySubmissions = [], 
    isLoading: isLoadingInquiries, 
    refetch: refetchInquiries 
  } = trpc.publicSubmissions.getAll.useQuery({
    submissionType: "general_inquiry",
    status: inquiryStatusFilter !== "all" ? inquiryStatusFilter : undefined,
    search: submissionSearch || undefined,
  });

  // جلب إحصائيات التبرعات والاستفسارات
  const { data: submissionStats } = trpc.publicSubmissions.getStats.useQuery();

  // تحديث حالة الطلب الخارجي والملاحظات
  const updateSubmissionMutation = trpc.publicSubmissions.updateStatus.useMutation({
    onSuccess: () => {
      toast.success("تم تحديث حالة الطلب والملاحظات بنجاح");
      setSelectedSubmission(null);
      refetchDonations();
      refetchInquiries();
      utils.publicSubmissions.getStats.invalidate();
    },
    onError: (err) => {
      toast.error(err.message || "حدث خطأ أثناء تحديث الطلب");
    }
  });

  const deleteSubmissionMutation = trpc.publicSubmissions.delete.useMutation({
    onSuccess: () => {
      toast.success("تم حذف الطلب بنجاح");
      refetchDonations();
      refetchInquiries();
      utils.publicSubmissions.getStats.invalidate();
    },
    onError: (err) => {
      toast.error(err.message || "حدث خطأ أثناء حذف الطلب");
    }
  });

  // فلترة طالبي الخدمة
  const requesters = usersResponse?.items || [];
  const filtered = requesters.filter(u => {
    const matchSearch =
      !search ||
      u.name?.toLowerCase().includes(search.toLowerCase()) ||
      u.email?.toLowerCase().includes(search.toLowerCase()) ||
      u.phone?.includes(search);
    const matchStatus = statusFilter === "all" || u.status === statusFilter;
    return matchSearch && matchStatus;
  });

  // إحصائيات الحسابات
  const stats = {
    total: requesters.length,
    pending: requesters.filter(u => u.status === "pending").length,
    active: requesters.filter(u => u.status === "active").length,
    suspended: requesters.filter(u => u.status === "suspended").length,
  };

  const handleAction = (userId: number, name: string, action: "active" | "suspended") => {
    setConfirmAction({ userId, name, action });
  };

  const confirmToggle = () => {
    if (!confirmAction) return;
    toggleStatus.mutate({ userId: confirmAction.userId, status: confirmAction.action });
  };

  const handleOpenSubmissionDetails = (sub: any) => {
    setSelectedSubmission(sub);
  };

  // أعداد الإشعارات في التبويبات
  const pendingDonationsCount = submissionStats?.donations?.pending || 0;
  const pendingInquiriesCount = submissionStats?.inquiries?.pending || 0;

  return (
    <DashboardLayout>
      <div className="space-y-6 w-full max-w-full pb-12 font-['Cairo',sans-serif]">
        {/* رأس الصفحة */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card border border-border/70 p-5 sm:p-6 rounded-3xl shadow-xs">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center flex-shrink-0">
              <CheckSquare className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-foreground">إدارة المستفيدين والطلبات الواردة</h1>
              <p className="text-muted-foreground text-xs sm:text-sm mt-0.5">
                مراجعة حسابات طالبي الخدمة، طلبات الاستثناء، طلبات التبرعات العينية والأراضي، والاستفسارات العامة
              </p>
            </div>
          </div>
        </div>

        {/* بطاقات الإحصائيات المتغيرة بحسب التبويب النشط */}
        {activeTab === 'requests' && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
            <Card className="border border-border/70 shadow-xs rounded-2xl hover:shadow-sm transition-all">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200/60 flex items-center justify-center shrink-0">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-medium">إجمالي الحسابات</p>
                  <p className="text-xl font-black text-foreground">{stats.total}</p>
                </div>
              </CardContent>
            </Card>
            <Card className="border border-border/70 shadow-xs rounded-2xl hover:shadow-sm transition-all">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200/60 flex items-center justify-center shrink-0">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-medium">قيد المراجعة</p>
                  <p className="text-xl font-black text-amber-600">{stats.pending}</p>
                </div>
              </CardContent>
            </Card>
            <Card className="border border-border/70 shadow-xs rounded-2xl hover:shadow-sm transition-all">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200/60 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-medium">حسابات معتمدة</p>
                  <p className="text-xl font-black text-emerald-600">{stats.active}</p>
                </div>
              </CardContent>
            </Card>
            <Card className="border border-border/70 shadow-xs rounded-2xl hover:shadow-sm transition-all">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200/60 flex items-center justify-center shrink-0">
                  <XCircle className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-medium">موقوف / محظور</p>
                  <p className="text-xl font-black text-rose-600">{stats.suspended}</p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === 'donations' && (
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 sm:gap-4">
            <Card className="border border-border/70 shadow-xs rounded-2xl">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-700 dark:bg-teal-950/60 dark:text-teal-300 border border-teal-200/60 flex items-center justify-center shrink-0">
                  <Gift className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-medium">إجمالي التبرعات</p>
                  <p className="text-xl font-black text-teal-700 dark:text-teal-300">{submissionStats?.donations?.total ?? 0}</p>
                </div>
              </CardContent>
            </Card>
            <Card className="border border-border/70 shadow-xs rounded-2xl">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200/60 flex items-center justify-center shrink-0">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-medium">أراضي مساجد</p>
                  <p className="text-xl font-black text-emerald-600">{submissionStats?.donations?.land ?? 0}</p>
                </div>
              </CardContent>
            </Card>
            <Card className="border border-border/70 shadow-xs rounded-2xl">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300 border border-sky-200/60 flex items-center justify-center shrink-0">
                  <Package className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-medium">تبرعات عينية</p>
                  <p className="text-xl font-black text-sky-600">{submissionStats?.donations?.inKind ?? 0}</p>
                </div>
              </CardContent>
            </Card>
            <Card className="border border-border/70 shadow-xs rounded-2xl">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-200/60 flex items-center justify-center shrink-0">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-medium">مبادرات أخرى</p>
                  <p className="text-xl font-black text-indigo-600">{submissionStats?.donations?.other ?? 0}</p>
                </div>
              </CardContent>
            </Card>
            <Card className="border border-border/70 shadow-xs rounded-2xl col-span-2 sm:col-span-1 bg-amber-50/40 dark:bg-amber-950/20 border-amber-200/80">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300 flex items-center justify-center shrink-0">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-medium">جديد / قيد المراجعة</p>
                  <p className="text-xl font-black text-amber-700 dark:text-amber-300">{submissionStats?.donations?.pending ?? 0}</p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === 'inquiries' && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
            <Card className="border border-border/70 shadow-xs rounded-2xl">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300 border border-sky-200/60 flex items-center justify-center shrink-0">
                  <MessageSquareQuote className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-medium">إجمالي الاستفسارات</p>
                  <p className="text-xl font-black text-sky-700 dark:text-sky-300">{submissionStats?.inquiries?.total ?? 0}</p>
                </div>
              </CardContent>
            </Card>
            <Card className="border border-border/70 shadow-xs rounded-2xl bg-amber-50/40 dark:bg-amber-950/20 border-amber-200/80">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300 flex items-center justify-center shrink-0">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-medium">جديدة بانتظار الرد</p>
                  <p className="text-xl font-black text-amber-700 dark:text-amber-300">{submissionStats?.inquiries?.pending ?? 0}</p>
                </div>
              </CardContent>
            </Card>
            <Card className="border border-border/70 shadow-xs rounded-2xl">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200/60 flex items-center justify-center shrink-0">
                  <PhoneCall className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-medium">تم التواصل</p>
                  <p className="text-xl font-black text-purple-600">{submissionStats?.inquiries?.contacted ?? 0}</p>
                </div>
              </CardContent>
            </Card>
            <Card className="border border-border/70 shadow-xs rounded-2xl">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200/60 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-medium">مكتملة ومغلقة</p>
                  <p className="text-xl font-black text-emerald-600">{submissionStats?.inquiries?.completed ?? 0}</p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* التبويبات الأربعة المنظمة */}
        <Tabs value={activeTab} onValueChange={(val: any) => setActiveTab(val)} dir="rtl" className="w-full">
          <div className="flex justify-center w-full mb-6">
            <TabsList className="bg-muted/70 p-1.5 inline-flex w-fit h-auto border border-border/80 rounded-2xl shadow-xs whitespace-nowrap gap-1">
              <TabsTrigger 
                value="requests" 
                className="gap-2 px-4 sm:px-6 py-2.5 data-[state=active]:bg-card data-[state=active]:text-primary data-[state=active]:shadow-xs text-xs font-bold transition-all rounded-xl"
              >
                <CheckSquare className="h-4 w-4" />
                <span>حسابات طالبي الخدمة</span>
                {stats.pending > 0 && (
                  <span className="bg-amber-500 text-white font-black text-[10px] px-1.5 py-0.2 rounded-full">
                    {stats.pending}
                  </span>
                )}
              </TabsTrigger>

              <TabsTrigger 
                value="exceptions" 
                className="gap-2 px-4 sm:px-6 py-2.5 data-[state=active]:bg-card data-[state=active]:text-primary data-[state=active]:shadow-xs text-xs font-bold transition-all rounded-xl"
              >
                <FileText className="h-4 w-4" />
                <span>طلبات الاستثناء</span>
                {pendingExceptionsCount > 0 && (
                  <span className="bg-rose-500 text-white font-black text-[10px] px-1.5 py-0.2 rounded-full">
                    {pendingExceptionsCount}
                  </span>
                )}
              </TabsTrigger>

              <TabsTrigger 
                value="donations" 
                className="gap-2 px-4 sm:px-6 py-2.5 data-[state=active]:bg-card data-[state=active]:text-primary data-[state=active]:shadow-xs text-xs font-bold transition-all rounded-xl"
              >
                <Gift className="h-4 w-4 text-teal-600" />
                <span>طلبات التبرعات</span>
                {pendingDonationsCount > 0 && (
                  <span className="bg-teal-600 text-white font-black text-[10px] px-1.5 py-0.2 rounded-full">
                    {pendingDonationsCount}
                  </span>
                )}
              </TabsTrigger>

              <TabsTrigger 
                value="inquiries" 
                className="gap-2 px-4 sm:px-6 py-2.5 data-[state=active]:bg-card data-[state=active]:text-primary data-[state=active]:shadow-xs text-xs font-bold transition-all rounded-xl"
              >
                <MessageSquareQuote className="h-4 w-4 text-sky-600" />
                <span>الاستفسارات العامة</span>
                {pendingInquiriesCount > 0 && (
                  <span className="bg-sky-600 text-white font-black text-[10px] px-1.5 py-0.2 rounded-full">
                    {pendingInquiriesCount}
                  </span>
                )}
              </TabsTrigger>
            </TabsList>
          </div>
        </Tabs>

        {/* 1. تبويب حسابات طالبي الخدمة */}
        {activeTab === 'requests' && (
          <Card className="border border-border/70 shadow-xs rounded-3xl overflow-hidden">
            <CardHeader className="p-4 sm:p-6 pb-4 border-b border-border/60">
              <div className="flex flex-col lg:flex-row gap-4 lg:items-center justify-between">
                <div>
                  <CardTitle className="text-base sm:text-lg font-black text-foreground">قائمة الحسابات</CardTitle>
                  <CardDescription className="text-xs sm:text-sm mt-0.5">
                    {filtered.length} حساب {statusFilter !== "all" ? `(${statusConfig[statusFilter]?.label ?? statusFilter})` : ""}
                  </CardDescription>
                </div>
                <div className="flex flex-col sm:flex-row gap-2 w-full lg:w-auto">
                  <div className="relative flex-1 lg:w-72">
                    <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="بحث بالاسم أو البريد أو الهاتف..."
                      value={search}
                      onChange={e => setSearch(e.target.value)}
                      className="pr-9 text-xs sm:text-sm h-10 rounded-2xl border-border/70"
                    />
                  </div>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-full sm:w-40 text-xs sm:text-sm h-10 rounded-2xl border-border/70">
                      <div className="flex items-center gap-2">
                        <Filter className="w-4 h-4" />
                        <SelectValue placeholder="الحالة" />
                      </div>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">جميع الحالات</SelectItem>
                      <SelectItem value="pending">قيد المراجعة</SelectItem>
                      <SelectItem value="active">معتمد</SelectItem>
                      <SelectItem value="suspended">موقوف</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="flex flex-col items-center justify-center py-20 gap-3">
                  <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
                  <p className="text-muted-foreground text-sm animate-pulse">جاري تحميل البيانات...</p>
                </div>
              ) : filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 sm:py-24 gap-4 px-6 text-center">
                  <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center">
                    <Users className="w-8 h-8 text-muted-foreground/50" />
                  </div>
                  <div className="space-y-1">
                    <p className="font-semibold text-foreground">لا توجد حسابات مطابقة</p>
                    <p className="text-muted-foreground text-sm">حاول تغيير معايير البحث أو الفلترة</p>
                  </div>
                </div>
              ) : (
                <>
                  {/* Desktop View */}
                  <div className="hidden md:block">
                    <Table>
                      <TableHeader className="bg-muted/30">
                        <TableRow className="hover:bg-transparent">
                          <TableHead className="text-right">الاسم</TableHead>
                          <TableHead className="text-right">البريد الإلكتروني</TableHead>
                          <TableHead className="text-right">الهاتف</TableHead>
                          <TableHead className="text-right whitespace-nowrap">تاريخ التسجيل</TableHead>
                          <TableHead className="text-right">الحالة</TableHead>
                          <TableHead className="text-left">الإجراءات</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filtered.map(user => {
                          const isPending = (user.status ?? "pending") === "pending";
                          const statusInfo = statusConfig[user.status ?? "pending"];
                          const StatusIcon = statusInfo?.icon ?? Clock;
                          return (
                            <TableRow 
                              key={user.id} 
                              className={`transition-all ${
                                isPending 
                                  ? "bg-amber-50/80 dark:bg-amber-950/30 border-r-4 border-r-amber-500 hover:bg-amber-100/70 dark:hover:bg-amber-900/40" 
                                  : "hover:bg-muted/20"
                              }`}
                            >
                              <TableCell className="font-bold text-foreground">
                                <div className="flex items-center gap-2">
                                  {isPending && (
                                    <span className="w-2 h-2 rounded-full bg-amber-500 ring-2 ring-amber-300 dark:ring-amber-800 animate-pulse shrink-0" />
                                  )}
                                  <span>{user.name ?? "—"}</span>
                                </div>
                              </TableCell>
                              <TableCell className="text-muted-foreground text-sm">{user.email ?? "—"}</TableCell>
                              <TableCell className="text-muted-foreground text-sm">{user.phone ?? "—"}</TableCell>
                              <TableCell className="text-muted-foreground text-sm whitespace-nowrap">
                                {user.createdAt ? new Date(user.createdAt).toLocaleDateString("ar-SA") : "—"}
                              </TableCell>
                              <TableCell>
                                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold ${statusInfo?.color ?? ""}`}>
                                  <StatusIcon className={`w-3 h-3 ${isPending ? "animate-pulse text-amber-600 dark:text-amber-400" : ""}`} />
                                  {statusInfo?.label ?? user.status}
                                </span>
                              </TableCell>
                              <TableCell className="text-left">
                                <div className="flex gap-2 justify-end">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-8 text-xs font-bold gap-1 rounded-xl"
                                    onClick={() => navigate("/requester-approvals/" + user.id)}
                                  >
                                    <Eye className="w-3.5 h-3.5" />
                                    التفاصيل
                                  </Button>
                                  {canApprove && (
                                    <>
                                      {user.status !== "active" && (
                                        <Button
                                          size="sm"
                                          className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-1 rounded-xl shadow-xs"
                                          onClick={() => handleAction(user.id, user.name ?? "المستخدم", "active")}
                                        >
                                          <CheckCircle2 className="w-3.5 h-3.5 ml-1" />
                                          تمت المراجعة والاعتماد
                                        </Button>
                                      )}
                                      {user.status === "active" && (
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          className="h-8 text-xs text-red-600 border-red-200 hover:bg-red-50 dark:hover:bg-red-950/30 font-bold rounded-xl"
                                          onClick={() => handleAction(user.id, user.name ?? "المستخدم", "suspended")}
                                        >
                                          <XCircle className="w-3.5 h-3.5 ml-1" />
                                          إيقاف
                                        </Button>
                                      )}
                                    </>
                                  )}
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Mobile View */}
                  <div className="md:hidden divide-y">
                    {filtered.map(user => {
                      const isPending = (user.status ?? "pending") === "pending";
                      const statusInfo = statusConfig[user.status ?? "pending"];
                      const StatusIcon = statusInfo?.icon ?? Clock;
                      return (
                        <div 
                          key={user.id} 
                          className={`p-4 space-y-3 transition-all ${
                            isPending 
                              ? "bg-amber-50/80 dark:bg-amber-950/30 border-r-4 border-r-amber-500 border-y border-amber-200/80 dark:border-amber-900/60 shadow-xs" 
                              : ""
                          }`}
                        >
                          <div className="flex justify-between items-start gap-3">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                {isPending && (
                                  <span className="w-2 h-2 rounded-full bg-amber-500 ring-2 ring-amber-300 dark:ring-amber-800 animate-pulse shrink-0" />
                                )}
                                <p className="font-bold text-foreground truncate">{user.name ?? "—"}</p>
                              </div>
                              <p className="text-xs text-muted-foreground truncate">{user.email ?? "—"}</p>
                            </div>
                            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold flex-shrink-0 ${statusInfo?.color ?? ""}`}>
                              <StatusIcon className={`w-3 h-3 ${isPending ? "animate-pulse text-amber-600 dark:text-amber-400" : ""}`} />
                              {statusInfo?.label ?? user.status}
                            </span>
                          </div>
                          
                          <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted-foreground py-2 border-y border-dashed">
                            <div className="flex items-center gap-1.5">
                              <Users className="w-3 h-3" />
                              <span>{user.phone ?? "—"}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <Clock className="w-3 h-3" />
                              <span>{user.createdAt ? new Date(user.createdAt).toLocaleDateString("ar-SA") : "—"}</span>
                            </div>
                          </div>

                          <div className="pt-1 flex flex-col sm:flex-row gap-2">
                            <Button
                              variant="outline"
                              className="w-full h-9 font-bold gap-2 rounded-xl transition-all"
                              onClick={() => navigate("/requester-approvals/" + user.id)}
                            >
                              <Eye className="w-4 h-4" />
                              عرض التفاصيل
                            </Button>
                            {canApprove && (
                              <>
                                {user.status !== "active" && (
                                  <Button
                                    className="w-full h-9 bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-2 rounded-xl transition-all"
                                    onClick={() => handleAction(user.id, user.name ?? "المستخدم", "active")}
                                  >
                                    <CheckCircle2 className="w-4 h-4" />
                                    تمت المراجعة والاعتماد
                                  </Button>
                                )}
                                {user.status === "active" && (
                                  <Button
                                    variant="outline"
                                    className="w-full h-9 text-red-600 border-red-200 hover:bg-red-50 dark:hover:bg-red-950/30 font-bold gap-2 rounded-xl transition-all"
                                    onClick={() => handleAction(user.id, user.name ?? "المستخدم", "suspended")}
                                  >
                                    <XCircle className="w-4 h-4" />
                                    إيقاف الحساب
                                  </Button>
                                )}
                              </>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        )}

        {/* 2. تبويب طلبات الاستثناء */}
        {activeTab === 'exceptions' && (
          <Card className="border border-border/70 shadow-xs rounded-3xl overflow-hidden animate-in fade-in-50 duration-200">
            <CardHeader className="p-4 sm:p-6 pb-4 border-b border-border/60">
              <div>
                <CardTitle className="text-base sm:text-lg font-black text-foreground">طلبات الاستثناء المرفوعة</CardTitle>
                <CardDescription className="text-xs sm:text-sm mt-0.5">
                  مراجعة طلبات استثناء الأئمة لتقديم طلبات جديدة بالرغم من وجود طلبات سابقة معلقة.
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-muted/30">
                    <TableRow>
                      <TableHead className="text-right">اسم الإمام</TableHead>
                      <TableHead className="text-right">التاريخ</TableHead>
                      <TableHead className="text-right">سبب الاستثناء</TableHead>
                      <TableHead className="text-right">المرفق</TableHead>
                      <TableHead className="text-right">الحالة</TableHead>
                      <TableHead className="text-left pl-6">الإجراءات</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {exceptionRequests.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-12 text-muted-foreground text-sm">
                          لا توجد طلبات استثناء حالياً
                        </TableCell>
                      </TableRow>
                    ) : (
                      exceptionRequests.map((item: any) => {
                        const isPending = item.exception.status === "pending";
                        return (
                          <TableRow 
                            key={item.exception.id} 
                            className={`transition-all ${
                              isPending 
                                ? "bg-amber-50/80 dark:bg-amber-950/30 border-r-4 border-r-amber-500 hover:bg-amber-100/70 dark:hover:bg-amber-900/40" 
                                : "hover:bg-muted/20"
                            }`}
                          >
                            <TableCell className="font-bold text-foreground">
                              <div className="flex items-center gap-2">
                                {isPending && (
                                  <span className="w-2 h-2 rounded-full bg-amber-500 ring-2 ring-amber-300 dark:ring-amber-800 animate-pulse shrink-0" />
                                )}
                                <div>
                                  <span>{item.userName}</span>
                                  <span className="block text-xs font-normal text-muted-foreground mt-0.5">
                                    {item.userPhone}
                                  </span>
                                </div>
                              </div>
                            </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {new Date(item.exception.createdAt).toLocaleDateString("ar-SA")}
                          </TableCell>
                          <TableCell className="max-w-xs truncate text-xs" title={item.exception.reason}>
                            {item.exception.reason}
                          </TableCell>
                          <TableCell>
                            {item.exception.documentUrl ? (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs gap-1 border-primary/20 text-primary hover:bg-primary/5 rounded-xl"
                                onClick={() => setPreviewUrl(item.exception.documentUrl)}
                              >
                                <Eye className="w-3.5 h-3.5" />
                                معاينة المرفق
                              </Button>
                            ) : (
                              <span className="text-xs text-muted-foreground">لا يوجد</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge variant={
                              item.exception.status === "approved" ? "default" :
                              item.exception.status === "rejected" ? "destructive" : "secondary"
                            } className="text-[10px] font-bold">
                              {item.exception.status === "approved" ? "مقبول" :
                               item.exception.status === "rejected" ? "مرفوض" : "قيد المراجعة"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-left pl-6">
                            {item.exception.status === "pending" && canApprove ? (
                              <div className="flex items-center gap-1.5 justify-end">
                                <Button
                                  size="sm"
                                  className="h-8 text-xs font-bold bg-green-600 hover:bg-green-700 text-white rounded-xl"
                                  onClick={() => reviewExceptionMutation.mutate({ id: item.exception.id, status: "approved" })}
                                  disabled={reviewExceptionMutation.isPending}
                                >
                                  قبول
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  className="h-8 text-xs font-bold rounded-xl"
                                  onClick={() => {
                                    const reason = prompt("يرجى إدخال سبب الرفض:");
                                    if (reason !== null) {
                                      reviewExceptionMutation.mutate({ id: item.exception.id, status: "rejected" });
                                    }
                                  }}
                                  disabled={reviewExceptionMutation.isPending}
                                >
                                  رفض
                                </Button>
                              </div>
                            ) : (
                              <span className="text-xs text-muted-foreground">مكتمل</span>
                            )}
                          </TableCell>
                        </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* 3. تبويب طلبات التبرعات (الأراضي والعينية) - باستثناء التبرع المالي */}
        {activeTab === 'donations' && (
          <Card className="border border-border/70 shadow-xs rounded-3xl overflow-hidden animate-in fade-in-50 duration-200">
            <CardHeader className="p-4 sm:p-6 pb-4 border-b border-border/60">
              <div className="flex flex-col lg:flex-row gap-4 lg:items-center justify-between">
                <div>
                  <CardTitle className="text-base sm:text-lg font-black text-foreground flex items-center gap-2">
                    <Gift className="w-5 h-5 text-teal-600" />
                    طلبات التبرعات الواردة
                  </CardTitle>
                  <CardDescription className="text-xs sm:text-sm mt-0.5">
                    مراجعة طلبات التبرع بأراضي المساجد، التبرعات العينية والمواد، والمبادرات الخاصة
                  </CardDescription>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {/* فلتر النوع */}
                  <Select value={donationTypeFilter} onValueChange={setDonationTypeFilter}>
                    <SelectTrigger className="w-44 text-xs h-10 rounded-2xl border-border/70">
                      <SelectValue placeholder="نوع التبرع" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">كافة أنواع التبرعات</SelectItem>
                      <SelectItem value="donor_land">تبرع بأرض مسجد</SelectItem>
                      <SelectItem value="donor_inkind">تبرع عيني ومواد</SelectItem>
                      <SelectItem value="donor_other">مبادرات وتبرعات أخرى</SelectItem>
                    </SelectContent>
                  </Select>

                  {/* فلتر الحالة */}
                  <Select value={donationStatusFilter} onValueChange={setDonationStatusFilter}>
                    <SelectTrigger className="w-36 text-xs h-10 rounded-2xl border-border/70">
                      <SelectValue placeholder="الحالة" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">جميع الحالات</SelectItem>
                      <SelectItem value="new">جديد</SelectItem>
                      <SelectItem value="under_review">قيد المراجعة</SelectItem>
                      <SelectItem value="contacted">تم التواصل</SelectItem>
                      <SelectItem value="completed">مكتمل</SelectItem>
                      <SelectItem value="archived">مؤرشف</SelectItem>
                    </SelectContent>
                  </Select>

                  {/* بحث */}
                  <div className="relative w-full sm:w-56">
                    <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="بحث بالاسم أو الجوال..."
                      value={submissionSearch}
                      onChange={e => setSubmissionSearch(e.target.value)}
                      className="pr-9 text-xs h-10 rounded-2xl border-border/70"
                    />
                  </div>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-0">
              {isLoadingDonations ? (
                <div className="flex flex-col items-center justify-center py-20 gap-3">
                  <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
                  <p className="text-muted-foreground text-sm animate-pulse">جاري تحميل طلبات التبرعات...</p>
                </div>
              ) : donationSubmissions.length === 0 ? (
                <div className="py-16 text-center text-muted-foreground">
                  <Gift className="w-12 h-12 mx-auto opacity-30 mb-2" />
                  <p className="text-sm font-semibold text-foreground">لا توجد طلبات تبرع مطابقة</p>
                  <p className="text-xs text-muted-foreground mt-0.5">لم يتم العثور على طلبات تبرعات غير مالية في هذه الفئة</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-muted/30">
                      <TableRow>
                        <TableHead className="text-right">مقدم التبرع</TableHead>
                        <TableHead className="text-right">نوع التبرع</TableHead>
                        <TableHead className="text-right">تاريخ الإرسال</TableHead>
                        <TableHead className="text-right">الحالة</TableHead>
                        <TableHead className="text-left pl-6">الإجراءات</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {donationSubmissions.map((sub: any) => {
                        const isNew = sub.status === "new";
                        const typeInfo = submissionTypeLabels[sub.submissionType] || submissionTypeLabels.donor_other;
                        const statusObj = submissionStatusConfig[sub.status] || submissionStatusConfig.new;
                        const cleanPhone = sub.phone?.replace(/[^0-9]/g, "");
                        const waPhone = cleanPhone?.startsWith("05") ? `966${cleanPhone.slice(1)}` : cleanPhone;

                        return (
                          <TableRow 
                            key={sub.id} 
                            className={`transition-colors ${
                              isNew 
                                ? "bg-amber-50/80 dark:bg-amber-950/30 border-r-4 border-r-amber-500 hover:bg-amber-100/70 dark:hover:bg-amber-900/40" 
                                : "hover:bg-muted/20"
                            }`}
                          >
                            {/* المتبرع */}
                            <TableCell className="font-bold text-foreground">
                              <div className="flex items-center gap-2">
                                {isNew && (
                                  <span className="w-2 h-2 rounded-full bg-amber-500 ring-2 ring-amber-300 dark:ring-amber-800 animate-pulse shrink-0" />
                                )}
                                <div>
                                  <p className="text-sm">{sub.name}</p>
                                  <div className="flex items-center gap-2 text-xs font-normal text-muted-foreground mt-0.5">
                                    <span>{sub.phone}</span>
                                    {sub.city && <span>• {sub.city}</span>}
                                  </div>
                                </div>
                              </div>
                            </TableCell>

                            {/* نوع التبرع */}
                            <TableCell>
                              <span className={`inline-flex items-center px-2.5 py-1 rounded-xl text-xs font-bold border ${typeInfo.badge}`}>
                                <span>{typeInfo.shortLabel}</span>
                              </span>
                            </TableCell>

                            {/* تاريخ الإرسال */}
                            <TableCell className="whitespace-nowrap">
                              <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
                                <Calendar className="w-3.5 h-3.5 text-primary shrink-0" />
                                <span>{formatSubmissionDate(sub.createdAt)}</span>
                              </div>
                            </TableCell>

                            {/* الحالة */}
                            <TableCell>
                              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border ${statusObj.color}`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${statusObj.dot}`} />
                                {statusObj.label}
                              </span>
                            </TableCell>

                            {/* الإجراءات */}
                            <TableCell className="text-left pl-6">
                              <div className="flex items-center justify-end gap-1.5">
                                {/* زر تمت المراجعة السريع للطلبات الجديدة */}
                                {sub.status === "new" && (
                                  <Button
                                    size="sm"
                                    className="h-8 text-xs font-bold gap-1 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
                                    onClick={() => updateSubmissionMutation.mutate({ id: sub.id, status: "under_review" })}
                                    disabled={updateSubmissionMutation.isPending}
                                    title="تحديد الطلب كتمت المراجعة"
                                  >
                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                    تمت المراجعة
                                  </Button>
                                )}

                                {/* زر واتساب سريع */}
                                {waPhone && (
                                  <a 
                                    href={`https://wa.me/${waPhone}`} 
                                    target="_blank" 
                                    rel="noreferrer"
                                    className="p-1.5 rounded-xl text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition-colors"
                                    title="محادثة واتساب"
                                  >
                                    <MessageCircle className="w-4 h-4" />
                                  </a>
                                )}

                                {/* زر بريد إلكتروني سريع */}
                                {sub.email && (
                                  <a 
                                    href={`mailto:${sub.email}`} 
                                    className="p-1.5 rounded-xl text-sky-600 hover:bg-sky-50 dark:hover:bg-sky-950/40 transition-colors"
                                    title="إرسال بريد إلكتروني"
                                  >
                                    <Mail className="w-4 h-4" />
                                  </a>
                                )}

                                {/* زر عرض ومراجعة التفاصيل الكاملة */}
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleOpenSubmissionDetails(sub)}
                                  className="h-8 text-xs font-bold gap-1 rounded-xl border-border/70 hover:border-primary"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                  مراجعة الطلب
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* 4. تبويب الاستفسارات العامة */}
        {activeTab === 'inquiries' && (
          <Card className="border border-border/70 shadow-xs rounded-3xl overflow-hidden animate-in fade-in-50 duration-200">
            <CardHeader className="p-4 sm:p-6 pb-4 border-b border-border/60">
              <div className="flex flex-col lg:flex-row gap-4 lg:items-center justify-between">
                <div>
                  <CardTitle className="text-base sm:text-lg font-black text-foreground flex items-center gap-2">
                    <MessageSquareQuote className="w-5 h-5 text-sky-600" />
                    الاستفسارات العامة وطلبات التواصل
                  </CardTitle>
                  <CardDescription className="text-xs sm:text-sm mt-0.5">
                    الاستفسارات الواردة من عموم المستفيدين والزوار والمبادرات المجتمعية
                  </CardDescription>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Select value={inquiryStatusFilter} onValueChange={setInquiryStatusFilter}>
                    <SelectTrigger className="w-40 text-xs h-10 rounded-2xl border-border/70">
                      <SelectValue placeholder="الحالة" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">جميع الحالات</SelectItem>
                      <SelectItem value="new">جديد بانتظار الرد</SelectItem>
                      <SelectItem value="under_review">قيد المراجعة</SelectItem>
                      <SelectItem value="contacted">تم التواصل والرد</SelectItem>
                      <SelectItem value="completed">مكتمل ومغلق</SelectItem>
                    </SelectContent>
                  </Select>

                  <div className="relative w-full sm:w-60">
                    <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="بحث بالاسم أو الاستفسار..."
                      value={submissionSearch}
                      onChange={e => setSubmissionSearch(e.target.value)}
                      className="pr-9 text-xs h-10 rounded-2xl border-border/70"
                    />
                  </div>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-0">
              {isLoadingInquiries ? (
                <div className="flex flex-col items-center justify-center py-20 gap-3">
                  <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
                  <p className="text-muted-foreground text-sm animate-pulse">جاري تحميل الاستفسارات...</p>
                </div>
              ) : inquirySubmissions.length === 0 ? (
                <div className="py-16 text-center text-muted-foreground">
                  <MessageSquareQuote className="w-12 h-12 mx-auto opacity-30 mb-2" />
                  <p className="text-sm font-semibold text-foreground">لا توجد استفسارات عامة حالياً</p>
                  <p className="text-xs text-muted-foreground mt-0.5">ستظهر هنا أي استفسارات أو رسائل تواصل جديدة واردة من النماذج</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-muted/30">
                      <TableRow>
                        <TableHead className="text-right">مقدم الاستفسار</TableHead>
                        <TableHead className="text-right">الصفة / الجهة</TableHead>
                        <TableHead className="text-right">نص وتفاصيل الاستفسار</TableHead>
                        <TableHead className="text-right">تاريخ الإرسال</TableHead>
                        <TableHead className="text-right">الحالة</TableHead>
                        <TableHead className="text-left pl-6">الإجراءات</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {inquirySubmissions.map((sub: any) => {
                        const isNew = sub.status === "new";
                        const statusObj = submissionStatusConfig[sub.status] || submissionStatusConfig.new;
                        const cleanPhone = sub.phone?.replace(/[^0-9]/g, "");
                        const waPhone = cleanPhone?.startsWith("05") ? `966${cleanPhone.slice(1)}` : cleanPhone;

                        return (
                          <TableRow 
                            key={sub.id} 
                            className={`transition-colors ${
                              isNew 
                                ? "bg-amber-50/80 dark:bg-amber-950/30 border-r-4 border-r-amber-500 hover:bg-amber-100/70 dark:hover:bg-amber-900/40" 
                                : "hover:bg-muted/20"
                            }`}
                          >
                            <TableCell className="font-bold text-foreground">
                              <div className="flex items-center gap-2">
                                {isNew && (
                                  <span className="w-2 h-2 rounded-full bg-amber-500 ring-2 ring-amber-300 dark:ring-amber-800 animate-pulse shrink-0" />
                                )}
                                <div>
                                  <p className="text-sm">{sub.name}</p>
                                  <div className="flex items-center gap-2 text-xs font-normal text-muted-foreground mt-0.5">
                                    <span>{sub.phone}</span>
                                    {sub.city && <span>• {sub.city}</span>}
                                  </div>
                                </div>
                              </div>
                            </TableCell>

                            <TableCell className="text-xs text-muted-foreground font-medium">
                              {sub.customRoleTitle || "مستفيد عام"}
                            </TableCell>

                            <TableCell className="max-w-md">
                              <p className="text-xs text-foreground line-clamp-2 leading-relaxed" title={sub.details || ""}>
                                {sub.details || "—"}
                              </p>
                            </TableCell>

                            {/* تاريخ الإرسال */}
                            <TableCell className="whitespace-nowrap">
                              <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
                                <Calendar className="w-3.5 h-3.5 text-primary shrink-0" />
                                <span>{formatSubmissionDate(sub.createdAt)}</span>
                              </div>
                            </TableCell>

                            <TableCell>
                              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border ${statusObj.color}`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${statusObj.dot}`} />
                                {statusObj.label}
                              </span>
                            </TableCell>

                            <TableCell className="text-left pl-6">
                              <div className="flex items-center justify-end gap-1.5">
                                {/* زر تمت المراجعة السريع للاستفسارات الجديدة */}
                                {sub.status === "new" && (
                                  <Button
                                    size="sm"
                                    className="h-8 text-xs font-bold gap-1 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
                                    onClick={() => updateSubmissionMutation.mutate({ id: sub.id, status: "under_review" })}
                                    disabled={updateSubmissionMutation.isPending}
                                    title="تحديد الاستفسار كتمت المراجعة"
                                  >
                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                    تمت المراجعة
                                  </Button>
                                )}

                                {waPhone && (
                                  <a 
                                    href={`https://wa.me/${waPhone}`} 
                                    target="_blank" 
                                    rel="noreferrer"
                                    className="p-1.5 rounded-xl text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition-colors"
                                    title="محادثة واتساب"
                                  >
                                    <MessageCircle className="w-4 h-4" />
                                  </a>
                                )}

                                {sub.email && (
                                  <a 
                                    href={`mailto:${sub.email}`} 
                                    className="p-1.5 rounded-xl text-sky-600 hover:bg-sky-50 dark:hover:bg-sky-950/40 transition-colors"
                                    title="إرسال بريد إلكتروني"
                                  >
                                    <Mail className="w-4 h-4" />
                                  </a>
                                )}

                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleOpenSubmissionDetails(sub)}
                                  className="h-8 text-xs font-bold gap-1 rounded-xl border-border/70 hover:border-primary"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                  الرد والمراجعة
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* نافذة عرض ومراجعة تفاصيل التبرع / الاستفسار الكاملة */}
      <Dialog open={!!selectedSubmission} onOpenChange={(open) => !open && setSelectedSubmission(null)}>
        {selectedSubmission && (
          <DialogContent className="max-w-4xl sm:max-w-4xl w-full rounded-3xl p-7 sm:p-9 border border-border/80 shadow-2xl bg-card dark:bg-slate-900 max-h-[92vh] overflow-y-auto font-['Cairo',sans-serif]">
            {/* Modal Header */}
            <div className="flex items-center gap-4 text-right w-full pb-5 border-b border-border/60">
              <div className="p-3.5 rounded-2xl bg-primary/10 text-primary border border-primary/20 shrink-0">
                {selectedSubmission.category === 'donor' ? <Gift className="h-8 w-8" /> : <MessageSquareQuote className="h-8 w-8" />}
              </div>
              <div className="text-right flex-1 min-w-0">
                <div className="flex items-center gap-2.5">
                  <DialogTitle className="text-xl sm:text-2xl font-black text-foreground text-right m-0">
                    {submissionTypeLabels[selectedSubmission.submissionType]?.label || "تفاصيل الطلب"}
                  </DialogTitle>
                  <span className={`inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-bold border ${submissionStatusConfig[selectedSubmission.status]?.color || submissionStatusConfig.new.color}`}>
                    <span className={`w-2 h-2 rounded-full ${submissionStatusConfig[selectedSubmission.status]?.dot || submissionStatusConfig.new.dot}`} />
                    {submissionStatusConfig[selectedSubmission.status]?.label || "جديد"}
                  </span>
                </div>
                <DialogDescription className="text-sm text-muted-foreground mt-1 text-right">
                  تاريخ التقديم: {new Date(selectedSubmission.createdAt).toLocaleDateString("ar-SA")}
                </DialogDescription>
              </div>
            </div>

            <div className="space-y-5 my-4 text-right">
              {/* بيانات مقدم الطلب مع أزرار الاتصال المباشر */}
              <div className="p-5 sm:p-6 rounded-3xl bg-muted/30 dark:bg-muted/10 border border-border/60 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm sm:text-base font-black text-primary flex items-center gap-2">
                    <User className="h-4 w-4" />
                    بيانات مقدم الطلب والتواصل
                  </h4>
                  <div className="flex items-center gap-2">
                    {selectedSubmission.phone && (
                      <a 
                        href={`https://wa.me/${selectedSubmission.phone.replace(/[^0-9]/g, "").startsWith("05") ? `966${selectedSubmission.phone.slice(1)}` : selectedSubmission.phone}`} 
                        target="_blank" 
                        rel="noreferrer"
                        className="h-8 px-3.5 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800 text-xs font-bold flex items-center gap-1.5 hover:bg-emerald-100 transition-all shadow-2xs"
                        title="محادثة واتساب"
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                        واتساب
                      </a>
                    )}
                    {selectedSubmission.email && (
                      <a 
                        href={`mailto:${selectedSubmission.email}`} 
                        className="h-8 px-3.5 rounded-xl border border-sky-200 bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-800 text-xs font-bold flex items-center gap-1.5 hover:bg-sky-100 transition-all shadow-2xs"
                        title="إرسال بريد إلكتروني"
                      >
                        <Mail className="w-3.5 h-3.5" />
                        البريد الإلكتروني
                      </a>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <span className="text-xs text-muted-foreground block font-medium">الاسم الكامل:</span>
                    <span className="text-sm sm:text-base font-bold text-foreground mt-0.5 block">{selectedSubmission.name}</span>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground block font-medium">رقم الجوال:</span>
                    <span className="text-sm sm:text-base font-bold font-mono text-foreground mt-0.5 block">{selectedSubmission.phone}</span>
                  </div>
                  {selectedSubmission.email && (
                    <div>
                      <span className="text-xs text-muted-foreground block font-medium">البريد الإلكتروني:</span>
                      <span className="text-sm sm:text-base font-bold font-mono text-foreground mt-0.5 block">{selectedSubmission.email}</span>
                    </div>
                  )}
                  {selectedSubmission.customRoleTitle && (
                    <div>
                      <span className="text-xs text-muted-foreground block font-medium">الصفة / المنصب:</span>
                      <span className="text-sm sm:text-base font-bold text-foreground mt-0.5 block">{selectedSubmission.customRoleTitle}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* نص الرسالة / الاستفسار / الملاحظات المرفقة */}
              {selectedSubmission.details && (
                <div className="p-5 sm:p-6 rounded-3xl bg-muted/30 dark:bg-muted/10 border border-border/60 space-y-3">
                  <h4 className="text-sm sm:text-base font-black text-foreground flex items-center gap-2">
                    <FileText className="h-4 w-4 text-primary" />
                    نص الطلب والتفاصيل الإضافية
                  </h4>
                  <p className="text-sm sm:text-base text-foreground leading-relaxed whitespace-pre-wrap bg-background/60 p-4 sm:p-5 rounded-2xl border border-border/40 font-medium">
                    {selectedSubmission.details}
                  </p>
                </div>
              )}

              {/* المرفق إن وجد */}
              {selectedSubmission.attachmentUrl && (
                <div className="p-4 sm:p-5 rounded-2xl bg-muted/30 dark:bg-muted/10 border border-border/60 flex items-center justify-between">
                  <span className="text-sm sm:text-base font-bold text-foreground flex items-center gap-2">
                    <FileCheck className="h-5 w-5 text-primary" />
                    المستند / الصك المرفق مع الطلب
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setPreviewUrl(selectedSubmission.attachmentUrl)}
                    className="h-9 px-5 text-xs sm:text-sm font-bold gap-2 rounded-xl border-primary/30 text-primary hover:bg-primary/5 shadow-2xs"
                  >
                    <Eye className="w-4 h-4" />
                    معاينة المستند
                  </Button>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between pt-5 border-t border-border/60">
              <div className="flex items-center gap-2">
                {selectedSubmission.status === "new" && (
                  <Button
                    type="button"
                    onClick={() => {
                      updateSubmissionMutation.mutate({ 
                        id: selectedSubmission.id, 
                        status: "under_review" 
                      });
                    }}
                    disabled={updateSubmissionMutation.isPending}
                    className="rounded-2xl h-11 px-6 text-sm font-black bg-emerald-600 hover:bg-emerald-700 text-white gap-2 shadow-sm cursor-pointer"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    تمت المراجعة
                  </Button>
                )}
                {selectedSubmission.status !== "completed" && (
                  <Button
                    type="button"
                    onClick={() => {
                      updateSubmissionMutation.mutate({ 
                        id: selectedSubmission.id, 
                        status: "completed" 
                      });
                    }}
                    disabled={updateSubmissionMutation.isPending}
                    className="rounded-2xl h-11 px-6 text-sm font-black bg-primary hover:bg-primary/90 text-white gap-2 shadow-sm cursor-pointer"
                  >
                    <CheckSquare className="w-4 h-4" />
                    إكمال وإغلاق الطلب
                  </Button>
                )}
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={() => setSelectedSubmission(null)}
                className="rounded-2xl h-11 px-9 text-sm font-black border-border/70 hover:bg-muted/60 cursor-pointer"
              >
                إغلاق
              </Button>
            </div>
          </DialogContent>
        )}
      </Dialog>

      {/* تأكيد إيقاف / اعتماد الحساب */}
      <AlertDialog open={!!confirmAction} onOpenChange={() => setConfirmAction(null)}>
        <AlertDialogContent className="rounded-2xl max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-right font-bold text-base">
              {confirmAction?.action === "active" ? "تأكيد اعتماد الحساب" : "تأكيد إيقاف الحساب"}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-right text-xs text-muted-foreground">
              {confirmAction?.action === "active"
                ? `هل أنت متأكد من رغبتك في اعتماد حساب "${confirmAction?.name}"؟ سيتمكن من تسجيل المساجد وتقديم الطلبات.`
                : `هل أنت متأكد من رغبتك في إيقاف حساب "${confirmAction?.name}"؟ لن يتمكن من استخدام المنصة مؤقتاً.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex gap-2 justify-end">
            <AlertDialogCancel className="rounded-lg text-xs font-bold">إلغاء</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmToggle}
              className={`rounded-lg text-xs font-bold text-white ${
                confirmAction?.action === "active"
                  ? "bg-green-600 hover:bg-green-700"
                  : "bg-red-600 hover:bg-red-700"
              }`}
            >
              {confirmAction?.action === "active" ? "اعتماد الحساب" : "إيقاف الحساب"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* نافذة معاينة الصور الفاخرة (Lightbox Modal) */}
      {previewUrl && (() => {
        const getDocName = (url: string) => {
          if (!url) return "مرفق";
          try {
            const fileName = decodeURIComponent(url).split("/").pop() || "";
            const parts = fileName.split("-");
            if (parts.length > 1 && !isNaN(Number(parts[0]))) {
              return parts.slice(1).join("-").split(".")[0];
            }
            const cleanName = fileName.replace(/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}_?/, "").split(".")[0];
            return cleanName || "مرفق";
          } catch {
            return "مرفق";
          }
        };
        const docName = getDocName(previewUrl);

        return (
          <div 
            className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/90 backdrop-blur-md p-4 animate-in fade-in duration-200"
            onClick={() => setPreviewUrl(null)}
          >
            <div 
              className="relative max-w-5xl w-full h-[90vh] flex flex-col justify-between bg-[#0b0f19] border border-slate-800 rounded-2xl shadow-2xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close button */}
              <button 
                onClick={() => setPreviewUrl(null)}
                className="absolute top-4 right-4 bg-[#1e293b]/80 hover:bg-red-600 hover:text-white text-slate-300 rounded-full p-2 transition-all z-10 shadow-lg cursor-pointer"
                title="إغلاق"
              >
                <X className="w-5.5 h-5.5" />
              </button>

              {/* Download button */}
              <button 
                onClick={() => {
                  if (!previewUrl) return;
                  const link = document.createElement("a");
                  link.href = previewUrl;
                  link.download = previewUrl.split("/").pop() || "attachment";
                  document.body.appendChild(link);
                  link.click();
                  document.body.removeChild(link);
                }}
                className="absolute top-4 left-4 bg-[#1e293b]/80 hover:bg-[#334155] text-slate-200 rounded-full py-1.5 px-4 transition-all z-10 shadow-lg flex items-center gap-1.5 cursor-pointer text-xs font-bold"
                title="تحميل"
              >
                <Download className="w-3.5 h-3.5" />
                <span>تحميل</span>
              </button>

              {/* Document/Image container */}
              <div className="w-full flex-1 flex items-center justify-center p-4 overflow-hidden mt-14 mb-2">
                {/\.(pdf)$/i.test(previewUrl) ? (
                  <iframe 
                    src={previewUrl} 
                    title="معاينة المستند" 
                    className="w-full h-full border border-slate-800/80 rounded-lg bg-white shadow-lg"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center overflow-auto">
                    <img 
                      src={previewUrl} 
                      alt="معاينة المرفق" 
                      className="max-w-full max-h-[70vh] object-contain rounded-lg shadow-md border border-slate-800/80 bg-white"
                    />
                  </div>
                )}
              </div>

              {/* Footer bar */}
              <div className="w-full bg-[#070b13] border-t border-slate-800/80 px-5 py-3.5 flex items-center justify-between text-slate-400 text-xs font-bold z-10">
                <span className="text-slate-400">{docName}</span>
                <div className="flex items-center gap-2" dir="rtl">
                  <Info className="w-4 h-4 text-slate-500" />
                  <span>معاينة مستند - {docName}</span>
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </DashboardLayout>
  );
}
