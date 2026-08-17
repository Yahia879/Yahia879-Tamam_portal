import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle
} from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import { toast } from "sonner";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area
} from "recharts";
import {
  Building2, CheckCircle2, Clock, Crown, Wallet, TrendingUp,
  FileText, Activity, RefreshCw, ShieldCheck,
  AlertCircle, Banknote, Receipt, MapPin, Layers,
  Check, Sparkles, PieChart as PieIcon, ClipboardList, Truck, Link2, FileSpreadsheet,
  MoreVertical, Eye, XCircle, FileCode, CheckCircle, ArrowUpRight, Search, Filter,
  ChevronLeft, ChevronRight, Info, Printer, ExternalLink
} from "lucide-react";

const CHART_COLORS = ["#10b981", "#3b82f6", "#f59e0b", "#8b5cf6", "#ec4899", "#06b6d4", "#f97316"];

const STATUS_BADGES: Record<string, { label: string; className: string }> = {
  // بانتظار اعتماد صاحب الصلاحية
  approved: { label: "بانتظار اعتماد صاحب الصلاحية", className: "bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800 font-extrabold" },
  pending_executive: { label: "بانتظار اعتماد صاحب الصلاحية", className: "bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800 font-extrabold" },
  pending: { label: "بانتظار اعتماد صاحب الصلاحية", className: "bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800 font-extrabold" },
  edited: { label: "بانتظار اعتماد صاحب الصلاحية", className: "bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800 font-extrabold" },
  draft: { label: "بانتظار اعتماد صاحب الصلاحية", className: "bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800 font-extrabold" },

  // معتمد
  executed: { label: "معتمد", className: "bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800 font-extrabold" },

  // مرفوض (باللون الأحمر المعتمد)
  rejected: { label: "مرفوض", className: "bg-rose-50 text-rose-700 border-rose-300 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-800 font-extrabold" },
};

const PAYMENT_METHOD_MAP: Record<string, string> = {
  bank_transfer: "تحويل بنكي",
  cash: "نقداً / كاش",
  cheque: "شيك بنكي",
  credit_card: "بطاقة ائتمان",
};

const TOOLTIP_CONTENT_STYLE = {
  borderRadius: "14px",
  backgroundColor: "#ffffff",
  borderColor: "#cbd5e1",
  boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.15)",
  color: "#0f172a",
  padding: "10px 14px",
  textAlign: "right" as const,
  direction: "rtl" as const,
};

const TOOLTIP_ITEM_STYLE = {
  color: "#0f172a",
  fontWeight: "bold",
  fontSize: "13px",
};

const TOOLTIP_LABEL_STYLE = {
  color: "#475569",
  fontWeight: "bold",
  fontSize: "12px",
  marginBottom: "4px",
};

export default function BoardDashboard() {
  const [location, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState("mosques");
  const [approvingId, setApprovingId] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [orderTypeFilter, setOrderTypeFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 20;

  // مؤقت البحث الذكي مع إلغاء الارتداد
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setCurrentPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // حالات نافذة الرفض والمعاينة
  const [rejectingOrder, setRejectingOrder] = useState<{ id: number; orderNumber: string } | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [isRejecting, setIsRejecting] = useState(false);

  const [previewModal, setPreviewModal] = useState<{
    open: boolean;
    title: string;
    type: "order" | "request";
    data: any;
  }>({ open: false, title: "", type: "order", data: null });

  const [viewJustificationModal, setViewJustificationModal] = useState<{
    open: boolean;
    orderNumber: string;
    reason: string;
  }>({ open: false, orderNumber: "", reason: "" });

  const utils = trpc.useUtils();

  const { data: currentUser } = trpc.auth.me.useQuery();
  const { data: userPermissions = [] } = trpc.permissions.getUserPermissions.useQuery(
    currentUser?.id ? { userId: currentUser.id } : ({} as any)
  );

  const isChairmanRole = currentUser?.role === "board_chairman";
  const hasChairmanActionPerm = userPermissions.includes("board_chairman") || userPermissions.includes("board_leadership.board_chairman");

  // الصلاحيات التنفيذية والمعاينة الشاملة تظهر حصراً لمن لديه صلاحية رئيس مجلس الإدارة التنفيذية
  const canPerformActions = isChairmanRole || hasChairmanActionPerm;

  const { data, isLoading, isError, error, refetch, isRefetching } = trpc.board.getExecutiveStats.useQuery({
    page: currentPage,
    pageSize: ITEMS_PER_PAGE,
    search: debouncedSearch,
    status: selectedStatus,
    orderType: orderTypeFilter,
  }, {
    staleTime: 0,
    placeholderData: (prev) => prev,
  });

  const approveOrderMutation = trpc.disbursements.approveOrder.useMutation({
    onSuccess: () => {
      toast.success("تم الاعتماد والتحويل البنكي المباشر للمبلغ بنجاح");
      setApprovingId(null);
      refetch();
      utils.board.getExecutiveStats.invalidate();
      utils.disbursements.invalidate();
    },
    onError: (err) => {
      toast.error(err.message || "حدث خطأ أثناء الاعتماد البنكي");
      setApprovingId(null);
    },
  });

  const rejectOrderMutation = trpc.disbursements.rejectOrder.useMutation({
    onSuccess: () => {
      toast.success("تم رفض وتوجيه أمر الصرف بنجاح");
      setRejectingOrder(null);
      setRejectionReason("");
      setIsRejecting(false);
      refetch();
      utils.board.getExecutiveStats.invalidate();
      utils.disbursements.invalidate();
    },
    onError: (err) => {
      toast.error(err.message || "حدث خطأ أثناء رفض أمر الصرف");
      setIsRejecting(false);
    },
  });

  const handleDirectApprove = (id: number) => {
    setApprovingId(id);
    approveOrderMutation.mutate({ id });
  };

  const handleConfirmReject = () => {
    if (!rejectingOrder) return;
    if (!rejectionReason.trim()) {
      toast.warning("يرجى كتابة سبب الرفض أولاً");
      return;
    }
    setIsRejecting(true);
    rejectOrderMutation.mutate({
      id: rejectingOrder.id,
      reason: rejectionReason,
    });
  };

  // تحديد نوع الصفحات والتوجيه بناءً على المسار والصلاحيات
  const isExecutiveRoute = location === "/board-executive";
  const isAnalyticsRoute = location === "/board-analytics";

  // إذا دخل على المسار العام /board-dashboard نحدد الصفحة حسب صلاحياته
  const isChairmanView = isExecutiveRoute || (!isAnalyticsRoute && data?.isChairman);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("ar-SA", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(amount) + " ريال";
  };

  // حساب المبالغ الكلية للأوامر المعتمدة من الاستجابة المباشرة
  const totalApprovedAmount = data?.chairmanData?.totalApprovedAmount || 0;

  return (
    <DashboardLayout>
      <div className="container py-8 max-w-7xl mx-auto space-y-8 text-right" dir="rtl">
        {/* ==================== 👑 الهيدر التنفيذي والتمايز القيادي ==================== */}
        <div className="relative overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-r from-primary/5 via-background to-emerald-500/5 dark:from-primary/10 dark:via-background dark:to-emerald-950/20 p-6 sm:p-7 shadow-xs transition-all">
          <div className="absolute top-0 right-0 left-0 h-1 bg-gradient-to-r from-primary via-teal-500 to-emerald-600" />

          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 relative z-10">
            <div className="space-y-2.5 text-right">
              <div className="flex items-center gap-3 justify-start">
                {isChairmanView ? (
                  <Badge className="bg-primary/10 text-primary border border-primary/25 px-3 py-1 text-xs font-bold rounded-lg flex items-center gap-1.5 hover:bg-primary/15 transition-colors">
                    <Crown className="w-3.5 h-3.5 text-primary shrink-0" />
                    <span>رئيس مجلس الإدارة</span>
                  </Badge>
                ) : (
                  <Badge className="bg-muted text-muted-foreground border border-border px-3 py-1 text-xs font-bold rounded-lg flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-primary shrink-0" />
                    <span>عضو مجلس الإدارة</span>
                  </Badge>
                )}
                <span className="text-xs text-muted-foreground flex items-center gap-1 font-medium">
                  <Sparkles className="w-3.5 h-3.5 text-primary/70 shrink-0" />
                  محدّث تلقائياً
                </span>
              </div>

              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
                {isChairmanView ? "لوحة اعتماد أوامر الصرف المعتمدة (رئيس مجلس الإدارة)" : "اللوحة الإحصائية القيادية لمجلس الإدارة"}
              </h1>

              <p className="text-xs sm:text-sm text-muted-foreground max-w-3xl leading-relaxed">
                {isChairmanView
                  ? "صفحة تنفيذية خاصة برئيس مجلس الإدارة تُظهر جميع أوامر الصرف المعتمدة (سواءً المرتبطة بطلبات معتمدة أو المخصصة، وتتيح إجراء الاعتماد والتحويل البنكي المباشر والمعاينة."
                  : "صفحة إحصائية خاصة بأعضاء مجلس الإدارة توفر اطلاعاً شاملاً وعميقاً على مؤشرات المساجد والطلبات والمشاريع والمشتريات والمالية."}
              </p>
            </div>
          </div>
        </div>

        {/* ==================== 👑 1. صفحة رئيس مجلس الإدارة (جدول أوامر الصرف المعتمدة المطابق لـ /disbursement-orders) ==================== */}
        {isChairmanView && data?.chairmanData && (
          <div className="space-y-8 animate-in fade-in-50 duration-300">
            {/* كروت المؤشرات السريعة لأوامر رئيس مجلس الإدارة المطابقة لنمط المنظومة */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
              <Card className="rounded-2xl border-0 shadow-sm bg-background hover:shadow-md transition-shadow relative overflow-hidden">
                <CardContent className="p-5 flex items-center justify-between text-right">
                  <div className="space-y-1">
                    <p className="text-xs font-semibold text-muted-foreground">إجمالي الأوامر المعتمدة</p>
                    <h3 className="text-2xl sm:text-3xl font-black text-foreground">
                      {data.chairmanData.totalApprovedCount}
                    </h3>
                  </div>
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/50 text-emerald-600 shrink-0">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                </CardContent>
              </Card>

              <Card className="rounded-2xl border-0 shadow-sm bg-background hover:shadow-md transition-shadow relative overflow-hidden">
                <CardContent className="p-5 flex items-center justify-between text-right">
                  <div className="space-y-1">
                    <p className="text-xs font-semibold text-muted-foreground">أوامر مرتبطة بطلبات معتمدة</p>
                    <h3 className="text-2xl sm:text-3xl font-black text-blue-600 dark:text-blue-400">
                      {data.chairmanData.linkedApprovedOrders.length}
                    </h3>
                  </div>
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/50 text-blue-600 shrink-0">
                    <Link2 className="w-6 h-6" />
                  </div>
                </CardContent>
              </Card>

              <Card className="rounded-2xl border-0 shadow-sm bg-background hover:shadow-md transition-shadow relative overflow-hidden">
                <CardContent className="p-5 flex items-center justify-between text-right">
                  <div className="space-y-1">
                    <p className="text-xs font-semibold text-muted-foreground">أوامر صرف مخصصة</p>
                    <h3 className="text-2xl sm:text-3xl font-black text-purple-600 dark:text-purple-400">
                      {data.chairmanData.customApprovedOrders.length}
                    </h3>
                  </div>
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-900/50 text-purple-600 shrink-0">
                    <FileSpreadsheet className="w-6 h-6" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* أدوات البحث والتصفية المباشرة */}
            <Card className="border-0 shadow-sm rounded-2xl bg-card">
              <CardHeader className="p-4 sm:p-6 pb-2 text-right">
                <CardTitle className="text-lg sm:text-xl font-bold">قائمة أوامر الصرف المعتمدة للتحويل البنكي</CardTitle>
                <CardDescription className="text-xs sm:text-sm text-muted-foreground">
                  جدول موحد يضم كافة أوامر الصرف المعتمدة (المرتبطة بطلبات والمخصصة) للاعتماد والتنفيذ البنكي
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 sm:p-6 space-y-6">
                {/* الفلاتر */}
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
                  <div className="relative flex-1">
                    {isRefetching ? (
                      <RefreshCw className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-primary animate-spin" />
                    ) : (
                      <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    )}
                    <Input
                      placeholder="بحث برقم الأمر، رقم طلب الصرف، أو اسم المستفيد..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pr-10 text-right font-medium"
                      dir="rtl"
                    />
                  </div>

                  <div className="flex flex-wrap gap-2 w-full lg:w-auto">
                    <Select
                      value={orderTypeFilter}
                      onValueChange={(val) => {
                        setOrderTypeFilter(val);
                        setCurrentPage(1);
                      }}
                    >
                      <SelectTrigger className="w-full lg:w-[180px]">
                        <Filter className="ml-2 h-4 w-4" />
                        <SelectValue placeholder="نوع الأمر" />
                      </SelectTrigger>
                      <SelectContent dir="rtl">
                        <SelectItem value="all">جميع الأوامر</SelectItem>
                        <SelectItem value="linked">أمر مرتبط بطلب</SelectItem>
                        <SelectItem value="custom">أمر صرف مخصص</SelectItem>
                      </SelectContent>
                    </Select>

                    <Select
                      value={selectedStatus}
                      onValueChange={(val) => {
                        setSelectedStatus(val);
                        setCurrentPage(1);
                      }}
                    >
                      <SelectTrigger className="w-full lg:w-[220px]">
                        <Filter className="ml-2 h-4 w-4" />
                        <SelectValue placeholder="الحالة" />
                      </SelectTrigger>
                      <SelectContent dir="rtl">
                        <SelectItem value="all">
                          جميع الحالات
                          {data?.chairmanData?.statusCounts?.all !== undefined && (
                            <span className="mr-2 text-[11px] text-muted-foreground font-mono">
                              ({data.chairmanData.statusCounts.all})
                            </span>
                          )}
                        </SelectItem>
                        <SelectItem value="pending_approval">
                          بانتظار اعتماد صاحب الصلاحية
                          {data?.chairmanData?.statusCounts?.pending_approval !== undefined && (
                            <span className="mr-2 text-[11px] text-amber-600 font-mono font-bold">
                              ({data.chairmanData.statusCounts.pending_approval})
                            </span>
                          )}
                        </SelectItem>
                        <SelectItem value="executed">
                          معتمد
                          {data?.chairmanData?.statusCounts?.executed !== undefined && (
                            <span className="mr-2 text-[11px] text-emerald-600 font-mono font-bold">
                              ({data.chairmanData.statusCounts.executed})
                            </span>
                          )}
                        </SelectItem>
                        <SelectItem value="rejected">
                          مرفوض
                          {data?.chairmanData?.statusCounts?.rejected !== undefined && (
                            <span className="mr-2 text-[11px] text-rose-600 font-mono font-bold">
                              ({data.chairmanData.statusCounts.rejected})
                            </span>
                          )}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* 🎯 جدول موحد ومبسط لأوامر الصرف المعتمدة مع الترقيم والبحث من الخادم */}
                {(() => {
                  const paginatedOrders = data?.chairmanData?.orders || [];
                  const totalFilteredCount = data?.chairmanData?.totalFilteredCount || 0;
                  const totalPages = data?.chairmanData?.totalPages || 1;

                  return paginatedOrders.length > 0 ? (
                    <Card className="border-0 shadow-sm overflow-hidden p-0 space-y-0 rounded-xl">
                      <div className="overflow-x-auto">
                        <Table dir="rtl" className="w-full min-w-full">
                          <TableHeader className="bg-slate-50/80 dark:bg-slate-900/80 border-b border-border">
                            <TableRow className="hover:bg-transparent">
                              <TableHead className="py-3 px-4 text-right font-bold text-slate-700 dark:text-slate-200">رقم الأمر والنوع</TableHead>
                              <TableHead className="py-3 px-4 text-right font-bold text-slate-700 dark:text-slate-200">البيان والمستفيد</TableHead>
                              <TableHead className="py-3 px-4 text-right font-bold text-slate-700 dark:text-slate-200">المبلغ</TableHead>
                              <TableHead className="py-3 px-4 text-right font-bold text-slate-700 dark:text-slate-200">الحالة</TableHead>
                              <TableHead className="py-3 px-4 text-center font-bold text-slate-700 dark:text-slate-200">الإجراءات</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {paginatedOrders.map((order) => (
                              <TableRow key={order.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/50 transition-colors">
                                {/* رقم الأمر والنوع */}
                                <TableCell className="py-3.5 px-4 text-right whitespace-nowrap">
                                  <div className="flex items-center gap-2">
                                    <span className="font-mono text-xs font-bold text-foreground">{order.orderNumber}</span>
                                    {order.isCustom && (
                                      <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/30 dark:text-purple-300 dark:border-purple-800 font-bold text-[10px] px-2 py-0.5">
                                        أمر مخصص
                                      </Badge>
                                    )}
                                  </div>
                                </TableCell>

                                {/* البيان والمستفيد */}
                                <TableCell className="py-3.5 px-4 text-right">
                                  <div className="space-y-0.5">
                                    <div className="font-bold text-xs text-foreground max-w-[280px] truncate">
                                      {order.title}
                                    </div>
                                    <div className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                                      <span className="font-semibold text-slate-600 dark:text-slate-400">المستفيد:</span>
                                      <span className="font-bold text-foreground">{order.beneficiaryName}</span>
                                    </div>
                                  </div>
                                </TableCell>

                                {/* المبلغ */}
                                <TableCell className="py-3 px-4 text-right whitespace-nowrap font-mono font-bold text-xs sm:text-sm text-emerald-600 dark:text-emerald-400">
                                  {formatCurrency(order.amount)}
                                </TableCell>

                                {/* الحالة */}
                                <TableCell className="py-3.5 px-4 text-right whitespace-nowrap">
                                  {(() => {
                                    const statusKey = (order as any).orderStatus || (order as any).status || "approved";
                                    const statusInfo = STATUS_BADGES[statusKey] || { label: statusKey, className: "bg-slate-100 text-slate-700 border-slate-300" };
                                    return (
                                      <Badge variant="outline" className={`font-bold text-[11px] px-2.5 py-0.5 ${statusInfo.className}`}>
                                        {statusInfo.label}
                                      </Badge>
                                    );
                                  })()}
                                </TableCell>

                                {/* قائمة الإجراءات المتناسقة مع المنظومة */}
                                <TableCell className="py-3.5 px-4 text-center whitespace-nowrap">
                                  <DropdownMenu dir="rtl">
                                    <DropdownMenuTrigger asChild>
                                      <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground">
                                        <MoreVertical className="w-4 h-4" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="w-56 rounded-xl p-1.5 font-medium text-xs shadow-lg border border-border bg-popover text-popover-foreground space-y-0.5">
                                      {/* خيارات عرض التفاصيل للمخولين */}
                                      {canPerformActions && (
                                        <>
                                          <DropdownMenuItem
                                            onClick={() => setLocation(`/disbursement-orders/${order.orderId || order.id}/print`)}
                                            className="rounded-lg cursor-pointer flex items-center gap-2.5 px-3 py-2 text-xs font-semibold hover:bg-muted focus:bg-muted text-foreground transition-colors"
                                          >
                                            <Eye className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                                            <span>عرض أمر الصرف المعتمد</span>
                                          </DropdownMenuItem>

                                          {!order.isCustom && !!order.requestId && (
                                            <DropdownMenuItem
                                              onClick={() => setLocation(`/disbursements/requests/${order.requestId}/print`)}
                                              className="rounded-lg cursor-pointer flex items-center gap-2.5 px-3 py-2 text-xs font-semibold hover:bg-muted focus:bg-muted text-foreground transition-colors"
                                            >
                                              <FileText className="w-4 h-4 text-primary shrink-0" />
                                              <span>عرض طلب الصرف المعتمد</span>
                                            </DropdownMenuItem>
                                          )}
                                        </>
                                      )}

                                      {/* خيار 'عرض المبررات' عند وجود مبرر أو رفض */}
                                      {(order.rejectionReason || order.approvalNotes || (order as any).orderStatus === "rejected" || (order as any).status === "rejected") && (
                                        <DropdownMenuItem
                                          onClick={() => setViewJustificationModal({
                                            open: true,
                                            orderNumber: order.orderNumber,
                                            reason: order.rejectionReason || order.approvalNotes || "لا يوجد مبرر مدون",
                                          })}
                                          className="rounded-lg cursor-pointer flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/30 focus:bg-amber-50 dark:focus:bg-amber-950/30 transition-colors"
                                        >
                                          <Info className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                                          <span>عرض المبررات</span>
                                        </DropdownMenuItem>
                                      )}

                                      {/* خيارات الاعتماد والرفض المباشر للمخولين فقط (تختفي عندما يكون الطلب معتمداً بالفعل) */}
                                      {canPerformActions && order.orderStatus !== "executed" && (
                                        <>
                                          <DropdownMenuSeparator className="my-1 border-border/60" />

                                          <DropdownMenuItem
                                            onClick={() => handleDirectApprove(order.id)}
                                            disabled={approvingId === order.id}
                                            className="rounded-lg cursor-pointer flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 focus:bg-emerald-50 dark:focus:bg-emerald-950/30 transition-colors"
                                          >
                                            <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                                            <span>الاعتماد من صاحب الصلاحية</span>
                                          </DropdownMenuItem>

                                          <DropdownMenuItem
                                            onClick={() => setRejectingOrder({ id: order.id, orderNumber: order.orderNumber })}
                                            className="rounded-lg cursor-pointer flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-rose-700 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 focus:bg-rose-50 dark:focus:bg-rose-950/30 transition-colors"
                                          >
                                            <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
                                            <span>رفض الطلب</span>
                                          </DropdownMenuItem>
                                        </>
                                      )}
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>

                      {/* تذييل الصفحة للترقيم والتنقل (Pagination Controls) المطابق لـ /disbursement-orders */}
                      <div className="px-4 py-3 bg-slate-50/70 dark:bg-slate-900/70 border-t flex flex-col sm:flex-row items-center justify-between gap-4 font-semibold text-xs" dir="rtl">
                        <div className="text-[11px] sm:text-xs text-muted-foreground text-center sm:text-right font-medium">
                          يعرض {totalFilteredCount > 0 ? (currentPage - 1) * ITEMS_PER_PAGE + 1 : 0} - {Math.min(currentPage * ITEMS_PER_PAGE, totalFilteredCount)} من أصل {totalFilteredCount} أمر صرف
                        </div>

                        {totalPages > 1 && (
                          <div className="flex items-center gap-1.5 overflow-x-auto max-w-full py-1">
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-8 w-8 shrink-0 rounded-lg"
                              onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                              disabled={currentPage === 1}
                              title="الصفحة السابقة"
                            >
                              <ChevronRight className="h-4 w-4" />
                            </Button>

                            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => {
                              if (
                                totalPages <= 5 ||
                                p === 1 ||
                                p === totalPages ||
                                (p >= currentPage - 1 && p <= currentPage + 1)
                              ) {
                                return (
                                  <Button
                                    key={p}
                                    variant={currentPage === p ? "default" : "outline"}
                                    size="sm"
                                    className={`h-8 min-w-[32px] px-2 text-[11px] shrink-0 rounded-lg ${currentPage === p ? 'bg-emerald-600 hover:bg-emerald-700 text-white border-0 font-bold' : ''}`}
                                    onClick={() => setCurrentPage(p)}
                                  >
                                    {p}
                                  </Button>
                                );
                              }

                              if (p === 2 || p === totalPages - 1) {
                                return (
                                  <span key={p} className="text-muted-foreground text-xs px-1">
                                    ...
                                  </span>
                                );
                              }
                              return null;
                            })}

                            <Button
                              variant="outline"
                              size="icon"
                              className="h-8 w-8 shrink-0 rounded-lg"
                              onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                              disabled={currentPage === totalPages}
                              title="الصفحة التالية"
                            >
                              <ChevronLeft className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </Card>
                  ) : (
                    <div className="text-center py-10 text-muted-foreground text-sm bg-slate-50/50 dark:bg-slate-900/50 rounded-2xl border border-dashed">
                      لا توجد أوامر صرف معتمدة حالياً للتحويل البنكي
                    </div>
                  );
                })()}
              </CardContent>
            </Card>
          </div>
        )}

        {/* ==================== 📊 2. صفحة عضو مجلس الإدارة (التبويبات الـ 5 للإحصائيات) ==================== */}
        {!isChairmanView && data && (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8 w-full" dir="rtl">
            <div className="w-full" dir="rtl">
              <TabsList className="grid w-full grid-cols-2 sm:grid-cols-5 h-auto bg-slate-100/90 dark:bg-slate-800/90 p-1.5 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 gap-2 sm:gap-3">
                <TabsTrigger
                  value="mosques"
                  className="rounded-xl px-3 sm:px-4 py-2.5 font-bold text-xs sm:text-sm transition-all data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:text-primary data-[state=active]:shadow-sm flex items-center justify-center gap-2 whitespace-nowrap"
                >
                  <Building2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>إحصائيات المساجد</span>
                </TabsTrigger>

                <TabsTrigger
                  value="requests"
                  className="rounded-xl px-3 sm:px-4 py-2.5 font-bold text-xs sm:text-sm transition-all data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:text-primary data-[state=active]:shadow-sm flex items-center justify-center gap-2 whitespace-nowrap"
                >
                  <FileText className="w-4 h-4 text-blue-500 shrink-0" />
                  <span>إحصائيات الطلبات</span>
                </TabsTrigger>

                <TabsTrigger
                  value="projects"
                  className="rounded-xl px-3 sm:px-4 py-2.5 font-bold text-xs sm:text-sm transition-all data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:text-primary data-[state=active]:shadow-sm flex items-center justify-center gap-2 whitespace-nowrap"
                >
                  <ClipboardList className="w-4 h-4 text-indigo-500 shrink-0" />
                  <span>الهندسة والمشاريع</span>
                </TabsTrigger>

                <TabsTrigger
                  value="procurement"
                  className="rounded-xl px-3 sm:px-4 py-2.5 font-bold text-xs sm:text-sm transition-all data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:text-primary data-[state=active]:shadow-sm flex items-center justify-center gap-2 whitespace-nowrap"
                >
                  <Truck className="w-4 h-4 text-orange-500 shrink-0" />
                  <span>المشتريات والعقود</span>
                </TabsTrigger>

                <TabsTrigger
                  value="financials"
                  className="rounded-xl px-3 sm:px-4 py-2.5 font-bold text-xs sm:text-sm transition-all data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:text-primary data-[state=active]:shadow-sm flex items-center justify-center gap-2 whitespace-nowrap"
                >
                  <Wallet className="w-4 h-4 text-amber-500 shrink-0" />
                  <span>المالية والصرف</span>
                </TabsTrigger>
              </TabsList>
            </div>

            {/* 1️⃣ تبويب إحصائيات المساجد */}
            <TabsContent value="mosques" className="space-y-8 animate-in fade-in-50 duration-300">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card className="rounded-2xl border-slate-200/70 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 shadow-lg p-6">
                  <CardContent className="p-0 flex items-center justify-between text-right">
                    <div className="space-y-1">
                      <p className="text-xs font-semibold text-muted-foreground">إجمالي المساجد المسجلة</p>
                      <h3 className="text-3xl font-black tracking-tight text-slate-900 dark:text-slate-100">
                        {data.mosques.total.toLocaleString("ar-SA")}
                      </h3>
                      <p className="text-xs text-emerald-600 font-semibold flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 shrink-0" /> مسجلة رسمياً بالبوابة
                      </p>
                    </div>
                    <div className="p-3.5 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shrink-0">
                      <Building2 className="w-6 h-6" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="rounded-2xl border-slate-200/70 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 shadow-lg p-6">
                  <CardContent className="p-0 flex items-center justify-between text-right">
                    <div className="space-y-1">
                      <p className="text-xs font-semibold text-muted-foreground">المساجد النشطة</p>
                      <h3 className="text-3xl font-black tracking-tight text-emerald-600 dark:text-emerald-400">
                        {data.mosques.active.toLocaleString("ar-SA")}
                      </h3>
                      <p className="text-xs text-muted-foreground">تتلقى الخدمات والزيارات</p>
                    </div>
                    <div className="p-3.5 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400 shrink-0">
                      <Activity className="w-6 h-6" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="rounded-2xl border-slate-200/70 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 shadow-lg p-6">
                  <CardContent className="p-0 flex items-center justify-between text-right">
                    <div className="space-y-1">
                      <p className="text-xs font-semibold text-muted-foreground">المسجلة خلال آخر 30 يوماً</p>
                      <h3 className="text-3xl font-black tracking-tight text-blue-600 dark:text-blue-400">
                        +{data.mosques.recent.toLocaleString("ar-SA")}
                      </h3>
                      <p className="text-xs text-emerald-600 font-semibold flex items-center gap-1">
                        <TrendingUp className="w-3 h-3 shrink-0" /> نمو مستمر
                      </p>
                    </div>
                    <div className="p-3.5 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 shrink-0">
                      <Clock className="w-6 h-6" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="rounded-2xl border-slate-200/70 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 shadow-lg p-6">
                  <CardContent className="p-0 flex items-center justify-between text-right">
                    <div className="space-y-1">
                      <p className="text-xs font-semibold text-muted-foreground">نسبة التغطية الكلية</p>
                      <h3 className="text-3xl font-black tracking-tight text-purple-600 dark:text-purple-400">
                        {data.mosques.total > 0 ? Math.round((data.mosques.active / data.mosques.total) * 100) : 100}%
                      </h3>
                      <p className="text-xs text-muted-foreground">مساجد مفعّلة بالخدمات</p>
                    </div>
                    <div className="p-3.5 rounded-2xl bg-purple-500/10 text-purple-600 dark:text-purple-400 shrink-0">
                      <PieIcon className="w-6 h-6" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <Card className="rounded-3xl border-slate-200/70 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 shadow-lg p-6">
                  <CardHeader className="p-0 mb-6 text-right">
                    <CardTitle className="text-lg font-bold flex items-center gap-2">
                      <MapPin className="w-5 h-5 text-emerald-500 shrink-0" />
                      <span>توزيع المساجد حسب المدن</span>
                    </CardTitle>
                    <CardDescription>أبرز المناطق والمدن الأكثر تغطية وتسجيلاً للمساجد</CardDescription>
                  </CardHeader>
                  <CardContent className="p-0 h-72">
                    {data.mosques.byCity.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={data.mosques.byCity} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                          <XAxis dataKey="name" stroke="#64748b" fontSize={12} tickLine={false} />
                          <YAxis stroke="#64748b" fontSize={12} tickLine={false} />
                          <Tooltip
                            formatter={(value: any) => [`${value} مسجد`, "عدد المساجد"]}
                            contentStyle={TOOLTIP_CONTENT_STYLE}
                            itemStyle={TOOLTIP_ITEM_STYLE}
                            labelStyle={TOOLTIP_LABEL_STYLE}
                          />
                          <Bar dataKey="value" name="عدد المساجد" fill="#10b981" radius={[10, 10, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                        لا توجد بيانات مدن مسجلة حالياً
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card className="rounded-3xl border-slate-200/70 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 shadow-lg p-6">
                  <CardHeader className="p-0 mb-6 text-right">
                    <CardTitle className="text-lg font-bold flex items-center gap-2">
                      <PieIcon className="w-5 h-5 text-blue-500 shrink-0" />
                      <span>توزيع المساجد حسب الحالة التشغيلية</span>
                    </CardTitle>
                    <CardDescription>مقارنة المساجد النشطة بالغير نشطة</CardDescription>
                  </CardHeader>
                  <CardContent className="p-0 h-72 flex items-center justify-center">
                    {data.mosques.byStatus.length > 0 ? (
                      <div className="w-full flex flex-col sm:flex-row items-center gap-6">
                        <div className="w-full sm:w-1/2 h-56">
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie
                                data={data.mosques.byStatus}
                                cx="50%"
                                cy="50%"
                                innerRadius={55}
                                outerRadius={85}
                                paddingAngle={5}
                                dataKey="value"
                              >
                                {data.mosques.byStatus.map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                                ))}
                              </Pie>
                              <Tooltip
                                formatter={(value: any, name: any) => [`${value} مسجد`, name]}
                                contentStyle={TOOLTIP_CONTENT_STYLE}
                                itemStyle={TOOLTIP_ITEM_STYLE}
                                labelStyle={TOOLTIP_LABEL_STYLE}
                              />
                            </PieChart>
                          </ResponsiveContainer>
                        </div>
                        <div className="w-full sm:w-1/2 space-y-3 text-right">
                          {data.mosques.byStatus.map((item, index) => {
                            const total = data.mosques.total || 1;
                            const percent = Math.round((item.value / total) * 100);
                            return (
                              <div key={index} className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                                <div className="flex items-center gap-2.5">
                                  <div
                                    className="w-3.5 h-3.5 rounded-full shrink-0"
                                    style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }}
                                  />
                                  <span className="font-bold text-sm text-slate-800 dark:text-slate-200">
                                    {item.name}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="font-extrabold text-sm text-slate-900 dark:text-slate-100">
                                    {item.value}
                                  </span>
                                  <span className="text-xs text-muted-foreground font-semibold">
                                    ({percent}%)
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ) : (
                      <div className="text-muted-foreground text-sm">لا توجد بيانات حالات متاحة</div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* 2️⃣ تبويب إحصائيات الطلبات */}
            <TabsContent value="requests" className="space-y-8 animate-in fade-in-50 duration-300">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card className="rounded-2xl border-slate-200/70 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 shadow-lg p-6">
                  <CardContent className="p-0 flex items-center justify-between text-right">
                    <div className="space-y-1">
                      <p className="text-xs font-semibold text-muted-foreground">إجمالي الطلبات المقدمة</p>
                      <h3 className="text-3xl font-black tracking-tight text-slate-900 dark:text-slate-100">
                        {data.requests.total.toLocaleString("ar-SA")}
                      </h3>
                      <p className="text-xs text-muted-foreground">كافة طلبات الخدمات</p>
                    </div>
                    <div className="p-3.5 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400 shrink-0">
                      <FileText className="w-6 h-6" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="rounded-2xl border-slate-200/70 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 shadow-lg p-6">
                  <CardContent className="p-0 flex items-center justify-between text-right">
                    <div className="space-y-1">
                      <p className="text-xs font-semibold text-muted-foreground">الطلبات المعتمدة والمكتملة</p>
                      <h3 className="text-3xl font-black tracking-tight text-emerald-600 dark:text-emerald-400">
                        {data.requests.approved.toLocaleString("ar-SA")}
                      </h3>
                      <p className="text-xs text-emerald-600 font-semibold flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 shrink-0" /> نسبة اعتماد عالية
                      </p>
                    </div>
                    <div className="p-3.5 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shrink-0">
                      <CheckCircle2 className="w-6 h-6" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="rounded-2xl border-slate-200/70 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 shadow-lg p-6">
                  <CardContent className="p-0 flex items-center justify-between text-right">
                    <div className="space-y-1">
                      <p className="text-xs font-semibold text-muted-foreground">الطلبات قيد التنفيذ والمراجعة</p>
                      <h3 className="text-3xl font-black tracking-tight text-amber-600 dark:text-amber-400">
                        {(data.requests.inProgress + data.requests.pending).toLocaleString("ar-SA")}
                      </h3>
                      <p className="text-xs text-muted-foreground">مرحلية العمل جارية</p>
                    </div>
                    <div className="p-3.5 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 shrink-0">
                      <Clock className="w-6 h-6" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="rounded-2xl border-slate-200/70 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 shadow-lg p-6">
                  <CardContent className="p-0 flex items-center justify-between text-right">
                    <div className="space-y-1">
                      <p className="text-xs font-semibold text-muted-foreground">الطلبات المرفوضة</p>
                      <h3 className="text-3xl font-black tracking-tight text-rose-600 dark:text-rose-400">
                        {data.requests.rejected.toLocaleString("ar-SA")}
                      </h3>
                      <p className="text-xs text-muted-foreground">لعدم اكتمال المتطلبات</p>
                    </div>
                    <div className="p-3.5 rounded-2xl bg-rose-500/10 text-rose-600 dark:text-rose-400 shrink-0">
                      <AlertCircle className="w-6 h-6" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <Card className="lg:col-span-2 rounded-3xl border-slate-200/70 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 shadow-lg p-6">
                  <CardHeader className="p-0 mb-6 text-right">
                    <CardTitle className="text-lg font-bold flex items-center gap-2">
                      <Layers className="w-5 h-5 text-blue-500 shrink-0" />
                      <span>توزيع الطلبات حسب مراحل دورة العمل</span>
                    </CardTitle>
                    <CardDescription>موزعة على مراحل التقديم والمعاينة وجداول الكميات والتعاقد والتنفيذ</CardDescription>
                  </CardHeader>
                  <CardContent className="p-0 h-80">
                    {data.requests.byStage.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={data.requests.byStage} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                          <XAxis dataKey="label" stroke="#64748b" fontSize={11} tickLine={false} />
                          <YAxis stroke="#64748b" fontSize={12} tickLine={false} />
                          <Tooltip
                            formatter={(value: any) => [`${value} طلب`, "عدد الطلبات"]}
                            contentStyle={TOOLTIP_CONTENT_STYLE}
                            itemStyle={TOOLTIP_ITEM_STYLE}
                            labelStyle={TOOLTIP_LABEL_STYLE}
                          />
                          <Bar dataKey="value" name="عدد الطلبات" fill="#3b82f6" radius={[10, 10, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                        لا توجد طلبات مسجلة في المراحل
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card className="rounded-3xl border-slate-200/70 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 shadow-lg p-6">
                  <CardHeader className="p-0 mb-6 text-right">
                    <CardTitle className="text-lg font-bold flex items-center gap-2">
                      <Building2 className="w-5 h-5 text-purple-500 shrink-0" />
                      <span>أكثر المساجد طلباً للخدمات</span>
                    </CardTitle>
                    <CardDescription>المساجد الأكثر تفاعلاً وطلباً للصيانة والبرامج</CardDescription>
                  </CardHeader>
                  <CardContent className="p-0 space-y-4">
                    {data.requests.topMosques.length > 0 ? (
                      data.requests.topMosques.map((item, i) => (
                        <div key={i} className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 text-right">
                          <div className="flex items-center gap-3">
                            <span className="w-7 h-7 rounded-xl bg-purple-500/10 text-purple-600 font-bold text-xs flex items-center justify-center shrink-0">
                              {i + 1}
                            </span>
                            <span className="font-bold text-sm text-slate-800 dark:text-slate-200 truncate max-w-[160px]">
                              {item.name}
                            </span>
                          </div>
                          <Badge variant="outline" className="rounded-xl font-bold bg-white dark:bg-slate-900 shrink-0">
                            {item.count} طلبات
                          </Badge>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground text-center py-8">لا توجد بيانات متاحة</p>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* 3️⃣ تبويب الهندسة والمشاريع */}
            <TabsContent value="projects" className="space-y-8 animate-in fade-in-50 duration-300">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card className="rounded-2xl border-slate-200/70 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 shadow-lg p-6">
                  <CardContent className="p-0 flex items-center justify-between text-right">
                    <div className="space-y-1">
                      <p className="text-xs font-semibold text-muted-foreground">إجمالي المشاريع الهندسية</p>
                      <h3 className="text-3xl font-black tracking-tight text-slate-900 dark:text-slate-100">
                        {data.projects.total.toLocaleString("ar-SA")}
                      </h3>
                      <p className="text-xs text-muted-foreground">مشاريع مسجلة</p>
                    </div>
                    <div className="p-3.5 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 shrink-0">
                      <ClipboardList className="w-6 h-6" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="rounded-2xl border-slate-200/70 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 shadow-lg p-6">
                  <CardContent className="p-0 flex items-center justify-between text-right">
                    <div className="space-y-1">
                      <p className="text-xs font-semibold text-muted-foreground">المشاريع قيد التنفيذ</p>
                      <h3 className="text-3xl font-black tracking-tight text-emerald-600 dark:text-emerald-400">
                        {data.projects.active.toLocaleString("ar-SA")}
                      </h3>
                      <p className="text-xs text-emerald-600 font-semibold flex items-center gap-1">
                        <Activity className="w-3 h-3 shrink-0" /> أعمال إنشائية جارية
                      </p>
                    </div>
                    <div className="p-3.5 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shrink-0">
                      <Activity className="w-6 h-6" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="rounded-2xl border-slate-200/70 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 shadow-lg p-6">
                  <CardContent className="p-0 flex items-center justify-between text-right">
                    <div className="space-y-1">
                      <p className="text-xs font-semibold text-muted-foreground">المشاريع المكتملة</p>
                      <h3 className="text-3xl font-black tracking-tight text-blue-600 dark:text-blue-400">
                        {data.projects.completed.toLocaleString("ar-SA")}
                      </h3>
                      <p className="text-xs text-muted-foreground">تم الاستلام النهائي</p>
                    </div>
                    <div className="p-3.5 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400 shrink-0">
                      <CheckCircle2 className="w-6 h-6" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="rounded-2xl border-slate-200/70 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 shadow-lg p-6">
                  <CardContent className="p-0 flex items-center justify-between text-right">
                    <div className="space-y-1">
                      <p className="text-xs font-semibold text-muted-foreground">ميزانيات المشاريع</p>
                      <h3 className="text-2xl font-black tracking-tight text-purple-600 dark:text-purple-400">
                        {data.projects.totalBudget.toLocaleString("ar-SA")} <span className="text-xs font-normal text-muted-foreground">ريال</span>
                      </h3>
                      <p className="text-xs text-muted-foreground">ميزانية معتمدة للمشاريع</p>
                    </div>
                    <div className="p-3.5 rounded-2xl bg-purple-500/10 text-purple-600 dark:text-purple-400 shrink-0">
                      <Wallet className="w-6 h-6" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card className="rounded-3xl border-slate-200/70 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 shadow-lg p-6">
                <CardHeader className="p-0 mb-6 text-right">
                  <CardTitle className="text-lg font-bold flex items-center gap-2">
                    <ClipboardList className="w-5 h-5 text-indigo-500 shrink-0" />
                    <span>توزيع المشاريع الهندسية حسب الحالات التشغيلية</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0 h-72">
                  {data.projects.byStatus.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={data.projects.byStatus} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                        <XAxis dataKey="name" stroke="#64748b" fontSize={12} tickLine={false} />
                        <YAxis stroke="#64748b" fontSize={12} tickLine={false} />
                        <Tooltip
                          formatter={(value: any) => [`${value} مشروع`, "عدد المشاريع"]}
                          contentStyle={TOOLTIP_CONTENT_STYLE}
                          itemStyle={TOOLTIP_ITEM_STYLE}
                          labelStyle={TOOLTIP_LABEL_STYLE}
                        />
                        <Bar dataKey="value" name="عدد المشاريع" fill="#6366f1" radius={[10, 10, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                      لا توجد مشاريع مسجلة حالياً
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* 4️⃣ تبويب المشتريات والعقود والموردين */}
            <TabsContent value="procurement" className="space-y-8 animate-in fade-in-50 duration-300">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card className="rounded-2xl border-slate-200/70 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 shadow-lg p-6">
                  <CardContent className="p-0 flex items-center justify-between text-right">
                    <div className="space-y-1">
                      <p className="text-xs font-semibold text-muted-foreground">إجمالي الموردين المسجلين</p>
                      <h3 className="text-3xl font-black tracking-tight text-slate-900 dark:text-slate-100">
                        {data.procurement.totalSuppliers.toLocaleString("ar-SA")}
                      </h3>
                      <p className="text-xs text-muted-foreground">موردون بالشبكة</p>
                    </div>
                    <div className="p-3.5 rounded-2xl bg-orange-500/10 text-orange-600 dark:text-orange-400 shrink-0">
                      <Truck className="w-6 h-6" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="rounded-2xl border-slate-200/70 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 shadow-lg p-6">
                  <CardContent className="p-0 flex items-center justify-between text-right">
                    <div className="space-y-1">
                      <p className="text-xs font-semibold text-muted-foreground">الموردون المعتمدون</p>
                      <h3 className="text-3xl font-black tracking-tight text-emerald-600 dark:text-emerald-400">
                        {data.procurement.approvedSuppliers.toLocaleString("ar-SA")}
                      </h3>
                      <p className="text-xs text-emerald-600 font-semibold flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 shrink-0" /> منشآت مؤهلة رسمياً
                      </p>
                    </div>
                    <div className="p-3.5 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shrink-0">
                      <CheckCircle2 className="w-6 h-6" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="rounded-2xl border-slate-200/70 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 shadow-lg p-6">
                  <CardContent className="p-0 flex items-center justify-between text-right">
                    <div className="space-y-1">
                      <p className="text-xs font-semibold text-muted-foreground">إجمالي العقود المبرمة</p>
                      <h3 className="text-3xl font-black tracking-tight text-blue-600 dark:text-blue-400">
                        {data.procurement.totalContracts.toLocaleString("ar-SA")}
                      </h3>
                      <p className="text-xs text-muted-foreground">عقود رسمية نشطة</p>
                    </div>
                    <div className="p-3.5 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400 shrink-0">
                      <FileText className="w-6 h-6" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="rounded-2xl border-slate-200/70 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 shadow-lg p-6">
                  <CardContent className="p-0 flex items-center justify-between text-right">
                    <div className="space-y-1">
                      <p className="text-xs font-semibold text-muted-foreground">قيمة العقود المبرمة</p>
                      <h3 className="text-2xl font-black tracking-tight text-purple-600 dark:text-purple-400">
                        {data.procurement.totalContractsValue.toLocaleString("ar-SA")} <span className="text-xs font-normal text-muted-foreground">ريال</span>
                      </h3>
                      <p className="text-xs text-muted-foreground">إجمالي قيمة العقود</p>
                    </div>
                    <div className="p-3.5 rounded-2xl bg-purple-500/10 text-purple-600 dark:text-purple-400 shrink-0">
                      <Wallet className="w-6 h-6" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* 📊 تشارتات المشتريات والعقود والموردين */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* 1. تشارت حالات تأهيل الموردين */}
                <Card className="rounded-3xl border-slate-200/70 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 shadow-lg p-6">
                  <CardHeader className="p-0 mb-6 text-right">
                    <CardTitle className="text-lg font-bold flex items-center gap-2">
                      <PieIcon className="w-5 h-5 text-orange-500 shrink-0" />
                      <span>توزيع الموردين حسب حالة الاعتماد والتأهيل</span>
                    </CardTitle>
                    <CardDescription>نسب الموردين المعتمدين والمؤهلين مقابل الطلبات الجديدة</CardDescription>
                  </CardHeader>
                  <CardContent className="p-0 h-72 flex items-center justify-center">
                    {data.procurement.suppliersByStatus && data.procurement.suppliersByStatus.length > 0 ? (
                      <div className="w-full flex flex-col sm:flex-row items-center gap-6">
                        <div className="w-full sm:w-1/2 h-56">
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie
                                data={data.procurement.suppliersByStatus}
                                cx="50%"
                                cy="50%"
                                innerRadius={55}
                                outerRadius={85}
                                paddingAngle={5}
                                dataKey="value"
                              >
                                {data.procurement.suppliersByStatus.map((entry, index) => (
                                  <Cell key={`cell-proc-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                                ))}
                              </Pie>
                              <Tooltip
                                formatter={(value: any, name: any) => [`${value} مورد`, name]}
                                contentStyle={TOOLTIP_CONTENT_STYLE}
                                itemStyle={TOOLTIP_ITEM_STYLE}
                                labelStyle={TOOLTIP_LABEL_STYLE}
                              />
                            </PieChart>
                          </ResponsiveContainer>
                        </div>
                        <div className="w-full sm:w-1/2 space-y-3 text-right">
                          {data.procurement.suppliersByStatus.map((item, index) => {
                            const total = data.procurement.totalSuppliers || 1;
                            const percent = Math.round((item.value / total) * 100);
                            return (
                              <div key={index} className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                                <div className="flex items-center gap-2.5">
                                  <div
                                    className="w-3.5 h-3.5 rounded-full shrink-0"
                                    style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }}
                                  />
                                  <span className="font-bold text-xs sm:text-sm text-slate-800 dark:text-slate-200">
                                    {item.name}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="font-extrabold text-sm text-slate-900 dark:text-slate-100">
                                    {item.value}
                                  </span>
                                  <span className="text-xs text-muted-foreground font-semibold">
                                    ({percent}%)
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ) : (
                      <div className="text-muted-foreground text-sm">لا توجد بيانات موردين متاحة</div>
                    )}
                  </CardContent>
                </Card>

                {/* 2. تشارت توزيع العقود حسب الحالات التشغيلية */}
                <Card className="rounded-3xl border-slate-200/70 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 shadow-lg p-6">
                  <CardHeader className="p-0 mb-6 text-right">
                    <CardTitle className="text-lg font-bold flex items-center gap-2">
                      <FileText className="w-5 h-5 text-blue-500 shrink-0" />
                      <span>توزيع العقود المبرمة حسب الحالة</span>
                    </CardTitle>
                    <CardDescription>العقود السارية والمكتملة والمستقبلية بالمنظومة</CardDescription>
                  </CardHeader>
                  <CardContent className="p-0 h-72">
                    {data.procurement.contractsByStatus && data.procurement.contractsByStatus.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={data.procurement.contractsByStatus} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                          <XAxis dataKey="name" stroke="#64748b" fontSize={11} tickLine={false} />
                          <YAxis stroke="#64748b" fontSize={12} tickLine={false} />
                          <Tooltip
                            formatter={(value: any) => [`${value} عقد`, "عدد العقود"]}
                            contentStyle={TOOLTIP_CONTENT_STYLE}
                            itemStyle={TOOLTIP_ITEM_STYLE}
                            labelStyle={TOOLTIP_LABEL_STYLE}
                          />
                          <Bar dataKey="value" name="عدد العقود" fill="#3b82f6" radius={[10, 10, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                        لا توجد بيانات عقود مبرمة حالياً
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* 3. أكثر الموردين شراكة وتعاقداً */}
              {data.procurement.topSuppliers && data.procurement.topSuppliers.length > 0 && (
                <Card className="rounded-3xl border-slate-200/70 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 shadow-lg p-6">
                  <CardHeader className="p-0 mb-6 text-right">
                    <CardTitle className="text-lg font-bold flex items-center gap-2">
                      <Truck className="w-5 h-5 text-emerald-500 shrink-0" />
                      <span>أعلى الموردين والشركاء تعاقداً بالمنظومة</span>
                    </CardTitle>
                    <CardDescription>المنشآت الأكثر فوزاً بالعقود وأعلى قيمة ماليّة مُسندة</CardDescription>
                  </CardHeader>
                  <CardContent className="p-0 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {data.procurement.topSuppliers.map((supplier, i) => (
                      <div
                        key={i}
                        className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 flex items-center justify-between text-right"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="w-6 h-6 rounded-lg bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 font-bold text-xs flex items-center justify-center shrink-0">
                              {i + 1}
                            </span>
                            <h4 className="font-extrabold text-sm text-slate-900 dark:text-slate-100 truncate max-w-[160px]">
                              {supplier.name}
                            </h4>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            عدد العقود: <span className="font-bold text-slate-700 dark:text-slate-300">{supplier.count} عقود</span>
                          </p>
                        </div>
                        <div className="text-left">
                          <span className="text-xs font-black text-emerald-600 dark:text-emerald-400 block">
                            {formatCurrency(supplier.totalValue)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* 5️⃣ تبويب الأمور المالية والصرف */}
            <TabsContent value="financials" className="space-y-8 animate-in fade-in-50 duration-300">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card className="rounded-2xl border-slate-200/70 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 shadow-lg p-6">
                  <CardContent className="p-0 flex items-center justify-between text-right">
                    <div className="space-y-1">
                      <p className="text-xs font-semibold text-muted-foreground">إجمالي الميزانيات المعتمدة</p>
                      <h3 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-slate-100">
                        {data.financials.totalApprovedBudget.toLocaleString("ar-SA")} <span className="text-sm font-normal text-muted-foreground">ريال</span>
                      </h3>
                      <p className="text-xs text-muted-foreground">للمشاريع والعقود المعتمدة</p>
                    </div>
                    <div className="p-3.5 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 shrink-0">
                      <Wallet className="w-6 h-6" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="rounded-2xl border-slate-200/70 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 shadow-lg p-6">
                  <CardContent className="p-0 flex items-center justify-between text-right">
                    <div className="space-y-1">
                      <p className="text-xs font-semibold text-muted-foreground">إجمالي المصروفات الفعلية</p>
                      <h3 className="text-2xl sm:text-3xl font-black tracking-tight text-emerald-600 dark:text-emerald-400">
                        {data.financials.totalDisbursedAmount.toLocaleString("ar-SA")} <span className="text-sm font-normal text-muted-foreground">ريال</span>
                      </h3>
                      <p className="text-xs text-emerald-600 font-semibold flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 shrink-0" /> أوامر صرف منفذة
                      </p>
                    </div>
                    <div className="p-3.5 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shrink-0">
                      <Banknote className="w-6 h-6" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="rounded-2xl border-slate-200/70 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 shadow-lg p-6">
                  <CardContent className="p-0 flex items-center justify-between text-right">
                    <div className="space-y-1">
                      <p className="text-xs font-semibold text-muted-foreground">التحويلات البنكية المكتملة</p>
                      <h3 className="text-2xl sm:text-3xl font-black tracking-tight text-blue-600 dark:text-blue-400">
                        {data.financials.completedBankTransfersCount.toLocaleString("ar-SA")}
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        مبلغ: {data.financials.completedBankTransfersAmount.toLocaleString("ar-SA")} ريال
                      </p>
                    </div>
                    <div className="p-3.5 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400 shrink-0">
                      <ShieldCheck className="w-6 h-6" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="rounded-2xl border-slate-200/70 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 shadow-lg p-6">
                  <CardContent className="p-0 flex items-center justify-between text-right">
                    <div className="space-y-1">
                      <p className="text-xs font-semibold text-muted-foreground">إجمالي سندات القبض</p>
                      <h3 className="text-2xl sm:text-3xl font-black tracking-tight text-purple-600 dark:text-purple-400">
                        {data.financials.totalReceiptVouchersAmount.toLocaleString("ar-SA")} <span className="text-sm font-normal text-muted-foreground">ريال</span>
                      </h3>
                      <p className="text-xs text-muted-foreground">سندات قبض مسجلة</p>
                    </div>
                    <div className="p-3.5 rounded-2xl bg-purple-500/10 text-purple-600 dark:text-purple-400 shrink-0">
                      <Receipt className="w-6 h-6" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card className="rounded-3xl border-slate-200/70 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 shadow-lg p-6">
                <CardHeader className="p-0 mb-6 text-right">
                  <CardTitle className="text-lg font-bold flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-amber-500 shrink-0" />
                    <span>التدفق المالي وتطور الصرف الشهري المعتمد</span>
                  </CardTitle>
                  <CardDescription>التغيرات والمبالغ المصروفة عبر أوامر الصرف المعتمدة شهرياً</CardDescription>
                </CardHeader>
                <CardContent className="p-0 h-80">
                  {data.financials.monthlyFlow.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={data.financials.monthlyFlow} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
                        <defs>
                          <linearGradient id="colorDisbursed" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4} />
                            <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                        <XAxis dataKey="month" stroke="#64748b" fontSize={12} tickLine={false} />
                        <YAxis stroke="#64748b" fontSize={12} tickLine={false} />
                        <Tooltip
                          formatter={(val: any) => [`${Number(val).toLocaleString("ar-SA")} ريال`, "المبلغ المصروف"]}
                          contentStyle={TOOLTIP_CONTENT_STYLE}
                          itemStyle={TOOLTIP_ITEM_STYLE}
                          labelStyle={TOOLTIP_LABEL_STYLE}
                        />
                        <Area type="monotone" dataKey="disbursed" name="المصروفات" stroke="#f59e0b" strokeWidth={3} fillOpacity={1} fill="url(#colorDisbursed)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                      لا توجد بيانات تدفق شهري سابقة
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}

        {/* ==================== 💬 نافذة سبب ومبرر عدم اعتماد التحويل (باللون الأحمر المعتمد للمنصة) ==================== */}
        <Dialog open={!!rejectingOrder} onOpenChange={(open) => !open && setRejectingOrder(null)}>
          <DialogContent className="sm:max-w-lg rounded-3xl p-6 sm:p-7 text-right border-rose-100 dark:border-rose-900/40" dir="rtl">
            <DialogHeader className="text-right space-y-2 border-b border-rose-100 dark:border-rose-950/60 pb-4 pl-8">
              <div className="flex items-center gap-2 flex-wrap">
                <DialogTitle className="text-lg sm:text-xl font-extrabold text-rose-600 dark:text-rose-400 flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 shrink-0 text-rose-500" />
                  <span>مبرر عدم اعتماد التحويل البنكي</span>
                </DialogTitle>
                {rejectingOrder && (
                  <Badge variant="outline" className="bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 font-mono text-xs font-bold px-2.5 py-0.5 rounded-lg">
                    {rejectingOrder.orderNumber}
                  </Badge>
                )}
              </div>
            </DialogHeader>

            <div className="py-4 space-y-4">
              <div className="space-y-2 text-right">
                <label className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                  سبب عدم الاعتماد ومبرر الرفض: <span className="text-rose-600 font-bold">*</span>
                </label>
                <Textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="اكتب سبب عدم اعتماد التحويل بالتفصيل..."
                  rows={4}
                  className="rounded-2xl border-slate-200 dark:border-slate-800 text-xs sm:text-sm font-semibold p-3 focus-visible:ring-1 focus-visible:ring-rose-500/25 focus-visible:border-rose-400 dark:focus-visible:border-rose-500/60 transition-all"
                />
              </div>
            </div>

            <DialogFooter className="flex flex-row items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
              <Button
                variant="outline"
                onClick={() => setRejectingOrder(null)}
                className="rounded-xl font-bold text-xs px-4"
              >
                إلغاء
              </Button>
              <Button
                onClick={handleConfirmReject}
                disabled={isRejecting || !rejectionReason.trim()}
                className="rounded-xl font-bold text-xs gap-2 px-5 bg-rose-600 hover:bg-rose-700 text-white border-0 shadow-sm transition-all"
              >
                <XCircle className="w-4 h-4 shrink-0" />
                <span>{isRejecting ? "جاري الرفض..." : "تأكيد عدم الاعتماد والرفض"}</span>
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ==================== 👁️ نافذة المعاينة السريعة ==================== */}
        <Dialog open={previewModal.open} onOpenChange={(open) => setPreviewModal((prev) => ({ ...prev, open }))}>
          <DialogContent className="sm:max-w-xl rounded-3xl p-6 text-right" dir="rtl">
            <DialogHeader className="text-right space-y-2 border-b pb-4">
              <DialogTitle className="text-xl font-bold flex items-center gap-2 text-slate-900 dark:text-slate-100">
                <FileCode className="w-5 h-5 text-primary shrink-0" />
                <span>{previewModal.title}</span>
              </DialogTitle>
            </DialogHeader>

            {previewModal.data && (
              <div className="py-4 space-y-4 text-xs">
                {previewModal.type === "request" ? (
                  <div className="space-y-3">
                    <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border space-y-2">
                      <p><span className="font-bold text-slate-700 dark:text-slate-300">رقم طلب الصرف المعتمد:</span> {previewModal.data.requestNumber}</p>
                      <p><span className="font-bold text-slate-700 dark:text-slate-300">عنوان الطلب:</span> {previewModal.data.requestTitle}</p>
                      <p><span className="font-bold text-slate-700 dark:text-slate-300">المبلغ المعتمد للطلب:</span> <span className="font-black text-emerald-600">{formatCurrency(previewModal.data.requestAmount)}</span></p>
                      <p><span className="font-bold text-slate-700 dark:text-slate-300">حالة طلب الصرف:</span> <Badge className="bg-emerald-500/15 text-emerald-700 text-[10px] font-bold">معتمد</Badge></p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border space-y-2">
                      <p><span className="font-bold text-slate-700 dark:text-slate-300">رقم أمر الصرف:</span> {previewModal.data.orderNumber}</p>
                      <p><span className="font-bold text-slate-700 dark:text-slate-300">اسم المستفيد:</span> {previewModal.data.beneficiaryName}</p>
                      <p><span className="font-bold text-slate-700 dark:text-slate-300">المصرف المحول له:</span> {previewModal.data.beneficiaryBank}</p>
                      <p><span className="font-bold text-slate-700 dark:text-slate-300">رقم الآيبان (IBAN):</span> {previewModal.data.beneficiaryIban}</p>
                      <p><span className="font-bold text-slate-700 dark:text-slate-300">طريقة الدفع:</span> {PAYMENT_METHOD_MAP[previewModal.data.paymentMethod || "bank_transfer"]}</p>
                      <p><span className="font-bold text-slate-700 dark:text-slate-300">إجمالي مبلغ الصرف:</span> <span className="font-black text-amber-600">{formatCurrency(previewModal.data.amount)}</span></p>
                    </div>
                  </div>
                )}
              </div>
            )}

            <DialogFooter className="flex-row sm:justify-start gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => setPreviewModal((prev) => ({ ...prev, open: false }))}
                className="rounded-xl font-bold text-xs"
              >
                إغلاق
              </Button>
              {previewModal.type === "order" ? (
                <Button
                  onClick={() => {
                    setPreviewModal((prev) => ({ ...prev, open: false }));
                    setLocation("/disbursement-orders");
                  }}
                  className="rounded-xl font-bold text-xs gap-1"
                >
                  <span>شاشة أوامر الصرف الكلية</span>
                  <ArrowUpRight className="w-4 h-4" />
                </Button>
              ) : (
                <Button
                  onClick={() => {
                    setPreviewModal((prev) => ({ ...prev, open: false }));
                    setLocation("/disbursement-requests");
                  }}
                  className="rounded-xl font-bold text-xs gap-1"
                >
                  <span>شاشة طلبات الصرف الكلية</span>
                  <ArrowUpRight className="w-4 h-4" />
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ==================== 📋 نافذة عرض مبررات عدم الاعتماد (مطابقة لـ /disbursements) ==================== */}
        <Dialog open={viewJustificationModal.open} onOpenChange={(open) => setViewJustificationModal((prev) => ({ ...prev, open }))}>
          <DialogContent dir="rtl" className="sm:max-w-[480px] rounded-3xl p-6 text-right">
            <DialogHeader className="text-right border-b pb-4">
              <DialogTitle className="text-amber-800 dark:text-amber-400 flex items-center gap-2 text-lg font-bold">
                <Info className="w-5 h-5 text-amber-600 shrink-0" />
                <span>مبررات عدم اعتماد التحويل</span>
              </DialogTitle>
              <DialogDescription className="text-slate-600 dark:text-slate-400 text-xs mt-1">
                تفاصيل المبرر والسبب المدون لأمر الصرف رقم ({viewJustificationModal.orderNumber})
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-3 text-right">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">نص المبرر والسبب المدون:</label>
                <div className="p-4 bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-900/50 rounded-2xl text-xs sm:text-sm text-amber-950 dark:text-amber-200 leading-relaxed whitespace-pre-wrap font-medium">
                  {viewJustificationModal.reason || "لا يوجد مبرر مدون"}
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setViewJustificationModal({ open: false, orderNumber: "", reason: "" })} className="rounded-xl font-bold text-xs px-5">
                إغلاق
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
