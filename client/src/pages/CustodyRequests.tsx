import { useState, useMemo } from "react";
import { Link, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { SaudiRiyal } from "@/components/SaudiRiyal";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Wallet,
  PlusCircle,
  Search,
  Printer,
  CheckCircle,
  XCircle,
  Clock,
  ArrowRight,
  ArrowUpRight,
  FileText,
  Landmark,
  User,
  Users,
  ShieldCheck,
  AlertCircle,
  Eye,
  Loader2,
  Filter,
} from "lucide-react";
import { toast } from "sonner";

export default function CustodyRequests() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const utils = trpc.useUtils();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // حوار الاعتماد
  const [approveDialogOpen, setApproveDialogOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [approvalNotes, setApprovalNotes] = useState("");

  // حوار الرفض
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");

  // التحقق من الأدوار والصلاحيات
  const isExecutiveDirector = useMemo(() => {
    if (!user) return false;
    return (
      user.role === "executive_director" ||
      user.role === "general_manager" ||
      (user as any)?.customRole?.nameAr === "المدير التنفيذي" ||
      user.name === "المدير التنفيذي" ||
      user.email === "ceo@manarah.org.sa"
    );
  }, [user]);

  const isSuperAdmin = useMemo(() => {
    if (!user) return false;
    return user.role === "super_admin";
  }, [user]);

  // فقط super_admin والمدير التنفيذي يظهر لهم كل الطلبات
  const canSeeAll = isSuperAdmin || isExecutiveDirector;
  // فقط المدير التنفيذي هو من يعتمد طلبات العهدة
  const canApprove = isExecutiveDirector;

  // تبويب طلباتي وطلبات الموظفين للمدير التنفيذي والـ super_admin
  const [activeTab, setActiveTab] = useState<"staff" | "my">("staff");

  // جلب الطلبات
  const { data: requests = [], isLoading } = trpc.custody.getAll.useQuery({
    status: statusFilter === "all" ? undefined : (statusFilter as any),
    search: search.trim() || undefined,
    scope: canSeeAll ? activeTab : "my",
  });

  // جلب الإحصائيات
  const { data: stats } = trpc.custody.getStats.useQuery({
    scope: canSeeAll ? activeTab : "my",
  });

  // طفرة الاعتماد
  const approveMutation = trpc.custody.approve.useMutation({
    onSuccess: (data) => {
      toast.success(data.message);
      setApproveDialogOpen(false);
      setSelectedRequest(null);
      setApprovalNotes("");
      utils.custody.getAll.invalidate();
      utils.custody.getStats.invalidate();
      utils.custody.getPendingActionCounts.invalidate();
    },
    onError: (err) => {
      toast.error(err.message || "حدث خطأ أثناء اعتماد طلب العهدة");
    },
  });

  // طفرة الرفض
  const rejectMutation = trpc.custody.reject.useMutation({
    onSuccess: (data) => {
      toast.success(data.message);
      setRejectDialogOpen(false);
      setSelectedRequest(null);
      setRejectionReason("");
      utils.custody.getAll.invalidate();
      utils.custody.getStats.invalidate();
      utils.custody.getPendingActionCounts.invalidate();
    },
    onError: (err) => {
      toast.error(err.message || "حدث خطأ أثناء رفض الطلب");
    },
  });

  const handleApprove = () => {
    if (!selectedRequest) return;
    approveMutation.mutate({
      id: selectedRequest.id,
      notes: approvalNotes.trim() || undefined,
    });
  };

  const handleReject = () => {
    if (!selectedRequest) return;
    if (!rejectionReason.trim()) {
      toast.error("يرجى كتابة سبب الرفض");
      return;
    }
    rejectMutation.mutate({
      id: selectedRequest.id,
      reason: rejectionReason.trim(),
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending_executive":
        return (
          <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-700 gap-1 font-semibold text-xs py-1">
            <Clock className="w-3.5 h-3.5 animate-pulse text-amber-600" />
            بانتظار اعتماد المدير التنفيذي
          </Badge>
        );
      case "approved":
        return (
          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-300 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-700 gap-1 font-semibold text-xs py-1">
            <CheckCircle className="w-3.5 h-3.5 text-blue-600" />
            معتمد
          </Badge>
        );
      case "converted_to_order":
        return (
          <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-700 gap-1 font-semibold text-xs py-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            تم التحويل لأمر صرف
          </Badge>
        );
      case "rejected":
        return (
          <Badge variant="outline" className="bg-rose-50 text-rose-700 border-rose-300 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-700 gap-1 font-semibold text-xs py-1">
            <XCircle className="w-3.5 h-3.5 text-rose-600" />
            مرفوض
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 pb-12 max-w-7xl mx-auto" dir="rtl">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border/40 pb-5">
          <div>
            <div className="flex items-center gap-2.5 mb-1.5">
              <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold">
                <Wallet className="w-5 h-5" />
              </div>
              <h1 className="text-2xl font-black text-foreground">العهد المالية</h1>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground">
              تقديم وإدارة طلبات صرف العهد المالية للمشاريع والمهام التشغيلية واعتمادها وتحويلها تلقائياً لأوامر صرف
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Button
              onClick={() => setLocation("/custody-requests/new")}
              className="gradient-primary text-white font-bold rounded-xl shadow-md gap-2 h-11 px-5 cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              <span>طلب صرف عهدة مالية جديدة</span>
            </Button>
          </div>
        </div>

        {/* Two Tabs: طلباتي وطلبات الموظفين للمدير التنفيذي والـ super_admin */}
        {canSeeAll && (
          <div className="flex items-center gap-2 p-1.5 bg-muted/60 dark:bg-muted/30 rounded-2xl border border-border/70 w-fit">
            <button
              type="button"
              onClick={() => setActiveTab("staff")}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                activeTab === "staff"
                  ? "bg-card text-foreground shadow-xs border border-border/70"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Users className="w-4 h-4 text-primary" />
              <span>طلبات الموظفين</span>
              <Badge variant="secondary" className="text-[10px] px-2 py-0.5 rounded-full font-mono font-bold">
                {stats?.staffCount ?? 0}
              </Badge>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("my")}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                activeTab === "my"
                  ? "bg-card text-foreground shadow-xs border border-border/70"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <User className="w-4 h-4 text-primary" />
              <span>طلباتي</span>
              <Badge variant="secondary" className="text-[10px] px-2 py-0.5 rounded-full font-mono font-bold">
                {stats?.myCount ?? 0}
              </Badge>
            </button>
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="rounded-2xl border-border/70 shadow-xs bg-card hover:border-primary/40 transition-all">
            <CardHeader className="p-4 pb-2">
              <CardDescription className="text-xs font-bold text-muted-foreground flex items-center justify-between">
                <span>إجمالي الطلبات</span>
                <Wallet className="w-4 h-4 text-primary" />
              </CardDescription>
              <CardTitle className="text-2xl font-black text-foreground mt-1">
                {stats?.totalCount || 0}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-1">
              <div className="text-xs text-muted-foreground flex items-center gap-1 font-semibold">
                <span>إجمالي المبالغ:</span>
                <span className="font-bold text-foreground font-mono">{Number(stats?.totalAmount || 0).toLocaleString()}</span>
                <SaudiRiyal className="w-3.5 h-3.5 inline shrink-0" />
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-amber-200 dark:border-amber-900/40 shadow-xs bg-amber-50/30 dark:bg-amber-950/10">
            <CardHeader className="p-4 pb-2">
              <CardDescription className="text-xs font-bold text-amber-700 dark:text-amber-400 flex items-center justify-between">
                <span>قيد اعتماد المدير التنفيذي</span>
                <Clock className="w-4 h-4 text-amber-600" />
              </CardDescription>
              <CardTitle className="text-2xl font-black text-amber-800 dark:text-amber-300 mt-1">
                {stats?.pendingCount || 0}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-1">
              <p className="text-[11px] text-amber-700/80 dark:text-amber-400/80 font-medium">
                بانتظار توقيع واعتماد الإدارة التنفيذية
              </p>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-emerald-200 dark:border-emerald-900/40 shadow-xs bg-emerald-50/30 dark:bg-emerald-950/10">
            <CardHeader className="p-4 pb-2">
              <CardDescription className="text-xs font-bold text-emerald-700 dark:text-emerald-400 flex items-center justify-between">
                <span>تم التحويل لأمر صرف</span>
                <CheckCircle className="w-4 h-4 text-emerald-600" />
              </CardDescription>
              <CardTitle className="text-2xl font-black text-emerald-800 dark:text-emerald-300 mt-1">
                {stats?.convertedCount || 0}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-1">
              <div className="text-xs text-emerald-700 dark:text-emerald-300 flex items-center gap-1 font-semibold">
                <span>مبالغ أوامر الصرف:</span>
                <span className="font-bold font-mono">{Number(stats?.convertedAmount || 0).toLocaleString()}</span>
                <SaudiRiyal className="w-3.5 h-3.5 inline shrink-0" />
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-border/70 shadow-xs bg-card">
            <CardHeader className="p-4 pb-2">
              <CardDescription className="text-xs font-bold text-muted-foreground flex items-center justify-between">
                <span>الطلبات المرفوضة</span>
                <XCircle className="w-4 h-4 text-rose-500" />
              </CardDescription>
              <CardTitle className="text-2xl font-black text-foreground mt-1">
                {stats?.rejectedCount || 0}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-1">
              <p className="text-[11px] text-muted-foreground font-medium">
                طلبات معادة للموظف مع ذكر الأسباب
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Filter and Search Bar */}
        <Card className="rounded-2xl border-border/70 shadow-xs bg-card">
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row items-center gap-3 justify-between">
              {/* Tabs / Status Buttons */}
              <div className="flex flex-wrap items-center gap-1.5 w-full md:w-auto">
                <Button
                  size="sm"
                  variant={statusFilter === "all" ? "default" : "outline"}
                  onClick={() => setStatusFilter("all")}
                  className={`rounded-xl text-xs font-bold h-9 px-3 ${statusFilter === "all" ? "gradient-primary text-white" : ""}`}
                >
                  الكل ({stats?.totalCount || 0})
                </Button>
                <Button
                  size="sm"
                  variant={statusFilter === "pending_executive" ? "default" : "outline"}
                  onClick={() => setStatusFilter("pending_executive")}
                  className={`rounded-xl text-xs font-bold h-9 px-3 ${statusFilter === "pending_executive" ? "bg-amber-600 text-white" : ""}`}
                >
                  قيد الاعتماد ({stats?.pendingCount || 0})
                </Button>
                <Button
                  size="sm"
                  variant={statusFilter === "converted_to_order" ? "default" : "outline"}
                  onClick={() => setStatusFilter("converted_to_order")}
                  className={`rounded-xl text-xs font-bold h-9 px-3 ${statusFilter === "converted_to_order" ? "bg-emerald-600 text-white" : ""}`}
                >
                  محولة لأوامر صرف ({stats?.convertedCount || 0})
                </Button>
                <Button
                  size="sm"
                  variant={statusFilter === "rejected" ? "default" : "outline"}
                  onClick={() => setStatusFilter("rejected")}
                  className={`rounded-xl text-xs font-bold h-9 px-3 ${statusFilter === "rejected" ? "bg-rose-600 text-white" : ""}`}
                >
                  مرفوضة ({stats?.rejectedCount || 0})
                </Button>
              </div>

              {/* Search Box */}
              <div className="relative w-full md:w-80">
                <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="بحث برقم الطلب، الموضوع، أو الآيبان..."
                  className="pr-9 h-9 rounded-xl text-xs border-border/70 bg-background"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Requests Table */}
        <Card className="rounded-2xl border-border/70 shadow-xs bg-card overflow-hidden">
          <CardHeader className="p-5 pb-3 border-b border-border/50 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base font-bold text-foreground">
                {canSeeAll
                  ? activeTab === "staff"
                    ? "سجل طلبات الموظفين للعهد المالية"
                    : "سجل طلباتي للعهد المالية"
                  : "سجل طلباتي للعهد المالية"}
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground mt-0.5">
                {canSeeAll
                  ? activeTab === "staff"
                    ? "قائمة بكافة طلبات العهد المقدمة من الموظفين للمراجعة والاعتماد"
                    : "قائمة بكافة طلبات العهد المالية التي قمت بتقديمها"
                  : "قائمة بكافة طلبات العهد المالية التي قمت بتقديمها ومتابعة حالاتها"}
              </CardDescription>
            </div>
            <Badge variant="secondary" className="font-mono text-xs font-bold">
              {requests.length} طلب
            </Badge>
          </CardHeader>

          <CardContent className="p-0">
            {isLoading ? (
              <div className="py-16 text-center">
                <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-2" />
                <p className="text-xs text-muted-foreground font-semibold">جاري تحميل سجل العهد المالية...</p>
              </div>
            ) : requests.length === 0 ? (
              <div className="py-16 text-center px-4">
                <div className="w-14 h-14 rounded-2xl bg-muted/60 text-muted-foreground mx-auto flex items-center justify-center mb-3">
                  <Wallet className="w-7 h-7" />
                </div>
                <h3 className="text-sm font-bold text-foreground mb-1">لا توجد طلبات عهد مالية حتى الآن</h3>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto mb-4">
                  يمكنك البدء بتقديم طلب صرف عهدة مالية جديدة للمشاريع أو المهام التشغيلية بضغطة زر
                </p>
                <Button
                  onClick={() => setLocation("/custody-requests/new")}
                  className="gradient-primary text-white text-xs font-bold rounded-xl h-9 px-4 gap-1.5"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  <span>تقديم أول طلب عهدة</span>
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-muted/40">
                    <TableRow>
                      <TableHead className="text-right font-bold text-xs py-3.5">رقم الطلب</TableHead>
                      <TableHead className="text-right font-bold text-xs py-3.5">الموظف مقدم الطلب</TableHead>
                      <TableHead className="text-right font-bold text-xs py-3.5">عنوان العهدة</TableHead>
                      <TableHead className="text-right font-bold text-xs py-3.5">المبلغ المطلوب</TableHead>
                      <TableHead className="text-right font-bold text-xs py-3.5">تاريخ التقديم</TableHead>
                      <TableHead className="text-right font-bold text-xs py-3.5">الحالة</TableHead>
                      <TableHead className="text-center font-bold text-xs py-3.5">الإجراءات</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {requests.map((req) => {
                      const isPendingExecutiveApproval = req.status === "pending_executive";
                      const shouldHighlightGreen = isPendingExecutiveApproval && (isExecutiveDirector || isSuperAdmin);

                      return (
                        <TableRow 
                          key={req.id} 
                          className={
                            shouldHighlightGreen 
                              ? "bg-emerald-100/75 dark:bg-emerald-950/60 hover:bg-emerald-200/70 dark:hover:bg-emerald-900/70 border-r-4 border-r-emerald-700 dark:border-r-emerald-400 transition-all shadow-xs" 
                              : "hover:bg-muted/30 transition-colors"
                          }
                        >
                          <TableCell className="font-mono text-xs font-bold text-primary py-3.5 px-4 whitespace-nowrap">
                            <div className="flex items-center gap-2 justify-start">
                              {shouldHighlightGreen && (
                                <TooltipProvider>
                                  <Tooltip delayDuration={50}>
                                    <TooltipTrigger asChild>
                                      <div className="relative inline-flex items-center justify-center shrink-0 cursor-pointer">
                                        <div className="relative flex items-center justify-center w-6 h-6 rounded-full bg-gradient-to-tr from-[#1a5f4a] via-emerald-600 to-teal-500 text-white shadow-xs border border-emerald-400/40 transition-transform duration-200 hover:scale-110">
                                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60"></span>
                                          <Clock className="w-3.5 h-3.5 text-amber-200 animate-spin relative z-10" style={{ animationDuration: '4s' }} />
                                        </div>
                                      </div>
                                    </TooltipTrigger>
                                    <TooltipContent side="top" className="bg-slate-900 text-white text-[11px] font-bold px-2.5 py-1 rounded-md shadow-xl border border-slate-700/60 flex items-center gap-1.5 z-50">
                                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></span>
                                      <span>
                                        {isExecutiveDirector ? "بانتظار اعتمادك (المدير التنفيذي)" : "بانتظار اعتماد المدير التنفيذي"}
                                      </span>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              )}
                              <div className="flex flex-col gap-0.5">
                                <Link href={`/custody-requests/${req.id}`} className="hover:underline flex items-center gap-1 font-bold">
                                  {req.requestNumber}
                                </Link>
                                {req.disbursementOrderNumber && (
                                  <Link href={`/disbursements/orders/${req.disbursementOrderId}/print`} className="inline-flex items-center gap-1 text-[10px] text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.5 rounded font-mono hover:underline w-fit">
                                    <span>أمر: {req.disbursementOrderNumber}</span>
                                    <ArrowUpRight className="w-2.5 h-2.5" />
                                  </Link>
                                )}
                              </div>
                            </div>
                          </TableCell>

                        <TableCell>
                          <p className="text-xs font-bold text-foreground flex items-center gap-1.5">
                            <User className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                            <span>{req.applicantName || "موظف"}</span>
                          </p>
                        </TableCell>

                        <TableCell className="max-w-xs">
                          <p className="text-xs font-bold text-foreground line-clamp-2" title={req.title}>
                            {req.title}
                          </p>
                        </TableCell>

                        <TableCell>
                          <div className="inline-flex items-center gap-1">
                            <span className="text-xs font-black text-foreground font-mono">{Number(req.amount).toLocaleString()}</span>
                            <SaudiRiyal className="w-3.5 h-3.5 inline shrink-0" />
                          </div>
                        </TableCell>

                        <TableCell className="text-xs text-muted-foreground font-mono font-medium">
                          {req.createdAt ? (() => {
                            const d = new Date(req.createdAt);
                            return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`;
                          })() : "-"}
                        </TableCell>

                        <TableCell>{getStatusBadge(req.status)}</TableCell>

                        <TableCell>
                          <div className="flex items-center justify-center gap-1.5">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setLocation(`/custody-requests/${req.id}`)}
                              className="h-8 px-2.5 rounded-lg text-xs gap-1 font-semibold hover:bg-muted/80"
                              title="عرض التقرير وطباعة"
                            >
                              <Printer className="w-3.5 h-3.5 text-primary" />
                              <span>التقرير</span>
                            </Button>

                            {canApprove && req.status === "pending_executive" && (
                              <>
                                <Button
                                  size="sm"
                                  onClick={() => {
                                    setSelectedRequest(req);
                                    setApprovalNotes("");
                                    setApproveDialogOpen(true);
                                  }}
                                  className="h-8 px-2.5 rounded-lg text-xs gap-1 font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
                                  title="اعتماد الطلب وتحويله لأمر صرف"
                                >
                                  <CheckCircle className="w-3.5 h-3.5" />
                                  <span>اعتماد</span>
                                </Button>

                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    setSelectedRequest(req);
                                    setRejectionReason("");
                                    setRejectDialogOpen(true);
                                  }}
                                  className="h-8 px-2.5 rounded-lg text-xs gap-1 font-bold text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/20 border-rose-200"
                                  title="رفض الطلب"
                                >
                                  <XCircle className="w-3.5 h-3.5" />
                                  <span>رفض</span>
                                </Button>
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
            )}
          </CardContent>
        </Card>

        {/* حوار اعتماد الطلب وتحويله لأمر صرف */}
        <Dialog open={approveDialogOpen} onOpenChange={setApproveDialogOpen}>
          <DialogContent className="max-w-md rounded-2xl" dir="rtl">
            <DialogHeader>
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 mx-auto flex items-center justify-center mb-2">
                <CheckCircle className="w-6 h-6" />
              </div>
              <DialogTitle className="text-center text-lg font-black text-foreground">
                اعتماد طلب العهدة المالية وتحويله لأمر صرف
              </DialogTitle>
              <DialogDescription className="text-center text-xs text-muted-foreground">
                سيتم اعتماد طلب العهدة رقم ({selectedRequest?.requestNumber}) وتوليد أمر صرف مالي تلقائي وتوجيهه للإدارة المالية للصرف.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-2">
              <div className="p-3 bg-muted/40 rounded-xl space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">الموظف:</span>
                  <span className="font-bold">{selectedRequest?.applicantName}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">المبلغ:</span>
                  <div className="inline-flex items-center gap-1 font-bold text-emerald-600 font-mono">
                    <span>{Number(selectedRequest?.amount || 0).toLocaleString()}</span>
                    <SaudiRiyal className="w-3.5 h-3.5 inline shrink-0" />
                  </div>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">المستفيد والبنك:</span>
                  <span className="font-bold">{selectedRequest?.bankAccountName} - {selectedRequest?.bankName}</span>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">ملاحظات أو توجيهات المدير التنفيذي (اختياري)</Label>
                <Textarea
                  value={approvalNotes}
                  onChange={(e) => setApprovalNotes(e.target.value)}
                  placeholder="أدخل أي ملاحظات للتضمين في أمر الصرف..."
                  className="text-xs min-h-[70px] rounded-xl"
                />
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                variant="outline"
                onClick={() => setApproveDialogOpen(false)}
                className="rounded-xl text-xs h-9 font-semibold"
              >
                إلغاء
              </Button>
              <Button
                onClick={handleApprove}
                disabled={approveMutation.isPending}
                className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs h-9 font-bold gap-1.5"
              >
                {approveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                <span>تأكيد الاعتماد والتحويل لأمر صرف</span>
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* حوار رفض الطلب */}
        <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
          <DialogContent className="max-w-md rounded-2xl" dir="rtl">
            <DialogHeader>
              <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 dark:bg-rose-950/40 mx-auto flex items-center justify-center mb-2">
                <XCircle className="w-6 h-6" />
              </div>
              <DialogTitle className="text-center text-lg font-black text-foreground">
                رفض طلب العهدة المالية
              </DialogTitle>
              <DialogDescription className="text-center text-xs text-muted-foreground">
                يرجى توضيح سبب الرفض ليتم إشعار الموظف به رسمياً.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-2 py-2">
              <Label className="text-xs font-semibold">سبب الرفض *</Label>
              <Textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="اكتب أسباب عدم الموافقة على طلب العهدة..."
                className="text-xs min-h-[90px] rounded-xl"
              />
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                variant="outline"
                onClick={() => setRejectDialogOpen(false)}
                className="rounded-xl text-xs h-9 font-semibold"
              >
                إلغاء
              </Button>
              <Button
                onClick={handleReject}
                disabled={rejectMutation.isPending || !rejectionReason.trim()}
                className="bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs h-9 font-bold gap-1.5"
              >
                {rejectMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                <span>تأكيد الرفض</span>
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
