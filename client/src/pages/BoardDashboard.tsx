import { useState } from "react";
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
  MoreVertical, Eye, XCircle, FileCode, CheckCircle, ArrowUpRight, Search, Filter
} from "lucide-react";

const CHART_COLORS = ["#10b981", "#3b82f6", "#f59e0b", "#8b5cf6", "#ec4899", "#06b6d4", "#f97316"];

const STATUS_BADGES: Record<string, { label: string; className: string }> = {
  approved: { label: "معتمد وبانتظار التحويل", className: "bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800" },
  executed: { label: "منفذ ومحوّل بنكياً", className: "bg-blue-50 text-blue-700 border-blue-300 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-800" },
  pending_executive: { label: "بانتظار اعتماد المدير التنفيذي", className: "bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800" },
  edited: { label: "معتمد (معدّل)", className: "bg-purple-50 text-purple-700 border-purple-300 dark:bg-purple-950/30 dark:text-purple-400 dark:border-purple-800" },
  rejected: { label: "مرفوض", className: "bg-red-50 text-red-700 border-red-300 dark:bg-red-950/30 dark:text-red-400 dark:border-red-800" },
};

const PAYMENT_METHOD_MAP: Record<string, string> = {
  bank_transfer: "تحويل بنكي",
  check: "إصدار شيك",
  custody: "صرف من العهدة",
  sadad: "سداد",
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
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState("mosques");
  const [approvingId, setApprovingId] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

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

  const utils = trpc.useUtils();

  const { data, isLoading, isError, error, refetch, isRefetching } = trpc.board.getExecutiveStats.useQuery(undefined, {
    staleTime: 1000 * 60 * 5,
  });

  const approveOrderMutation = trpc.disbursements.approveOrder.useMutation({
    onSuccess: () => {
      toast.success("تم الاعتماد والتحويل البنكي المباشر للمبلغ بنجاح");
      setApprovingId(null);
      refetch();
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

  const isChairman = data?.isChairman ?? false;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("ar-SA", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(amount) + " ريال";
  };

  // فلترة أوامر رئيس مجلس الإدارة بحسب البحث
  const filteredLinkedOrders = (data?.chairmanData?.linkedApprovedOrders || []).filter((o) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return (
      o.orderNumber.toLowerCase().includes(term) ||
      o.requestNumber.toLowerCase().includes(term) ||
      o.beneficiaryName.toLowerCase().includes(term) ||
      o.requestTitle.toLowerCase().includes(term)
    );
  });

  const filteredCustomOrders = (data?.chairmanData?.customApprovedOrders || []).filter((o) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return (
      o.orderNumber.toLowerCase().includes(term) ||
      o.beneficiaryName.toLowerCase().includes(term)
    );
  });

  // حساب المبالغ الكلية للأوامر المعتمدة
  const totalApprovedAmount = [
    ...(data?.chairmanData?.linkedApprovedOrders || []),
    ...(data?.chairmanData?.customApprovedOrders || []),
  ].reduce((acc, curr) => acc + curr.amount, 0);

  return (
    <DashboardLayout>
      <div className="container py-8 max-w-7xl mx-auto space-y-8 text-right" dir="rtl">
        {/* ==================== 👑 الهيدر التنفيذي والتمايز القيادي ==================== */}
        <div className="relative overflow-hidden rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl p-6 sm:p-8 shadow-xl shadow-slate-200/50 dark:shadow-none transition-all">
          <div className="absolute top-0 right-0 left-0 h-1.5 bg-gradient-to-r from-amber-500 via-emerald-500 to-blue-600" />
          
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 relative z-10">
            <div className="space-y-3 text-right">
              <div className="flex items-center gap-3 justify-start">
                {isChairman ? (
                  <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-400/30 px-3.5 py-1.5 text-xs sm:text-sm font-bold rounded-xl flex items-center gap-2">
                    <Crown className="w-4 h-4 text-amber-500 animate-pulse shrink-0" />
                    <span>رئيس مجلس الإدارة</span>
                  </Badge>
                ) : (
                  <Badge className="bg-slate-500/15 text-slate-700 dark:text-slate-300 border-slate-400/30 px-3.5 py-1.5 text-xs sm:text-sm font-bold rounded-xl flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-slate-500 shrink-0" />
                    <span>عضو مجلس الإدارة</span>
                  </Badge>
                )}
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                  محدّث تلقائياً
                </span>
              </div>

              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
                {isChairman ? "جدول الاعتماد والتحويل البنكي المباشر" : "اللوحة الإحصائية القيادية لمجلس الإدارة"}
              </h1>
              
              <p className="text-sm sm:text-base text-muted-foreground max-w-3xl leading-relaxed">
                {isChairman
                  ? "مرحباً بك رئيس مجلس الإدارة. جدول تنفيذي متكامل يُظهر أوامر الصرف المعتمدة (سواءً المرتبطة بطلبات معتمدة أو المخصصة) بتنسيق جدول المنظومة لتمكينك من اتخاذ إجراءات الاعتماد البنكي والمعاينة المباشرة."
                  : "مرحباً بك عضو مجلس الإدارة. واجهة تنفيذية متكاملة توفر لك الاطلاع الشامل والعميق على كافة إحصائيات ومؤشرات المساجد والطلبات والمشاريع والمالية."}
              </p>
            </div>

            <div className="flex items-center gap-3 shrink-0 justify-start">
              <Button
                variant="outline"
                size="sm"
                onClick={() => refetch()}
                disabled={isRefetching || isLoading}
                className="rounded-xl border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors gap-2 font-bold"
              >
                <RefreshCw className={`w-4 h-4 ${isRefetching ? "animate-spin text-primary" : ""}`} />
                <span>تحديث البيانات</span>
              </Button>
            </div>
          </div>
        </div>

        {/* ==================== 👑 واجهة رئيس مجلس الإدارة (جدول أوامر الصرف المعتمدة) ==================== */}
        {isChairman && data?.chairmanData && (
          <div className="space-y-8 animate-in fade-in-50 duration-300">
            {/* كروت المؤشرات السريعة لأوامر رئيس مجلس الإدارة */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 shadow-md">
                <CardContent className="p-5 flex items-center justify-between text-right">
                  <div className="space-y-1">
                    <p className="text-xs font-semibold text-muted-foreground">إجمالي الأوامر المعتمدة</p>
                    <h3 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-slate-100">
                      {data.chairmanData.totalApprovedCount}
                    </h3>
                  </div>
                  <div className="p-3 rounded-2xl bg-emerald-500/10 text-emerald-600 shrink-0">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                </CardContent>
              </Card>

              <Card className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 shadow-md">
                <CardContent className="p-5 flex items-center justify-between text-right">
                  <div className="space-y-1">
                    <p className="text-xs font-semibold text-muted-foreground">أوامر مرتبطة بطلبات معتمدة</p>
                    <h3 className="text-2xl sm:text-3xl font-black text-blue-600 dark:text-blue-400">
                      {data.chairmanData.linkedApprovedOrders.length}
                    </h3>
                  </div>
                  <div className="p-3 rounded-2xl bg-blue-500/10 text-blue-600 shrink-0">
                    <Link2 className="w-6 h-6" />
                  </div>
                </CardContent>
              </Card>

              <Card className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 shadow-md">
                <CardContent className="p-5 flex items-center justify-between text-right">
                  <div className="space-y-1">
                    <p className="text-xs font-semibold text-muted-foreground">أوامر صرف مخصصة</p>
                    <h3 className="text-2xl sm:text-3xl font-black text-amber-600 dark:text-amber-400">
                      {data.chairmanData.customApprovedOrders.length}
                    </h3>
                  </div>
                  <div className="p-3 rounded-2xl bg-amber-500/10 text-amber-600 shrink-0">
                    <FileSpreadsheet className="w-6 h-6" />
                  </div>
                </CardContent>
              </Card>

              <Card className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 shadow-md">
                <CardContent className="p-5 flex items-center justify-between text-right">
                  <div className="space-y-1">
                    <p className="text-xs font-semibold text-muted-foreground">إجمالي مبالغ الصرف</p>
                    <h3 className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400">
                      {formatCurrency(totalApprovedAmount)}
                    </h3>
                  </div>
                  <div className="p-3 rounded-2xl bg-emerald-500/10 text-emerald-600 shrink-0">
                    <Banknote className="w-6 h-6" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* شريط البحث الموحد */}
            <div className="relative max-w-md">
              <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="بحث برقم الأمر، رقم طلب الصرف، أو اسم المستفيد..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pr-10 rounded-2xl border-slate-200 dark:border-slate-800 text-xs font-semibold"
              />
            </div>

            {/* 1️⃣ جدول أوامر الصرف المعتمدة المرتبطة بطلب صرف معتمد */}
            <Card className="rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 shadow-lg overflow-hidden p-6 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
                <div className="flex items-center gap-3 text-right">
                  <div className="p-2.5 rounded-2xl bg-emerald-500/10 text-emerald-600 shrink-0">
                    <Link2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-black text-slate-900 dark:text-slate-100">
                      أوامر الصرف المعتمدة المرتبطة بطلب صرف معتمد
                    </h2>
                    <p className="text-xs text-muted-foreground">
                      جدول أوامر الصرف الصادرة لطلبات صرف معتمدة وبانتظار قرار التحويل البنكي المباشر
                    </p>
                  </div>
                </div>

                <Badge className="bg-emerald-600 text-white rounded-xl font-bold px-3 py-1 text-xs shrink-0 self-start sm:self-auto">
                  {filteredLinkedOrders.length} أمر مرتبط
                </Badge>
              </div>

              {filteredLinkedOrders.length > 0 ? (
                <div className="overflow-x-auto rounded-2xl border border-slate-200/70 dark:border-slate-800">
                  <Table dir="rtl" className="w-full text-right">
                    <TableHeader className="bg-slate-50/80 dark:bg-slate-900/80">
                      <TableRow className="hover:bg-transparent">
                        <TableHead className="py-3 px-4 font-bold text-xs text-slate-700 dark:text-slate-200 text-right">رقم أمر الصرف</TableHead>
                        <TableHead className="py-3 px-4 font-bold text-xs text-slate-700 dark:text-slate-200 text-right">رقم طلب الصرف المعتمد</TableHead>
                        <TableHead className="py-3 px-4 font-bold text-xs text-slate-700 dark:text-slate-200 text-right">العنوان / البيان</TableHead>
                        <TableHead className="py-3 px-4 font-bold text-xs text-slate-700 dark:text-slate-200 text-right">المستفيد</TableHead>
                        <TableHead className="py-3 px-4 font-bold text-xs text-slate-700 dark:text-slate-200 text-right">المصرف والآيبان</TableHead>
                        <TableHead className="py-3 px-4 font-bold text-xs text-slate-700 dark:text-slate-200 text-right">المبلغ</TableHead>
                        <TableHead className="py-3 px-4 font-bold text-xs text-slate-700 dark:text-slate-200 text-right">طريقة الدفع</TableHead>
                        <TableHead className="py-3 px-4 font-bold text-xs text-slate-700 dark:text-slate-200 text-right">الحالة</TableHead>
                        <TableHead className="py-3 px-4 font-bold text-xs text-slate-700 dark:text-slate-200 text-center">الإجراءات</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredLinkedOrders.map((item) => {
                        const statusKey = item.orderStatus || "approved";
                        const statusInfo = STATUS_BADGES[statusKey] || { label: statusKey, className: "bg-slate-100 text-slate-700" };
                        return (
                          <TableRow key={item.orderId} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                            <TableCell className="py-3 px-4 font-mono font-bold text-xs text-slate-900 dark:text-slate-100 whitespace-nowrap">
                              {item.orderNumber}
                            </TableCell>

                            <TableCell className="py-3 px-4 font-mono font-bold text-xs text-emerald-700 dark:text-emerald-400 whitespace-nowrap">
                              {item.requestNumber}
                            </TableCell>

                            <TableCell className="py-3 px-4 text-xs font-semibold text-slate-800 dark:text-slate-200 max-w-[200px] truncate">
                              {item.requestTitle}
                            </TableCell>

                            <TableCell className="py-3 px-4 text-xs font-semibold text-slate-800 dark:text-slate-200 max-w-[160px] truncate">
                              {item.beneficiaryName}
                            </TableCell>

                            <TableCell className="py-3 px-4 text-xs text-muted-foreground whitespace-nowrap">
                              <span className="font-bold text-slate-700 dark:text-slate-300">{item.beneficiaryBank}</span>
                              <span className="block font-mono text-[11px] text-slate-500">{item.beneficiaryIban}</span>
                            </TableCell>

                            <TableCell className="py-3 px-4 font-mono font-bold text-xs text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                              {formatCurrency(item.amount)}
                            </TableCell>

                            <TableCell className="py-3 px-4 text-xs text-muted-foreground whitespace-nowrap font-medium">
                              {PAYMENT_METHOD_MAP[item.paymentMethod || "bank_transfer"]}
                            </TableCell>

                            <TableCell className="py-3 px-4 whitespace-nowrap">
                              <Badge variant="outline" className={`text-[11px] font-bold ${statusInfo.className}`}>
                                {statusInfo.label}
                              </Badge>
                            </TableCell>

                            {/* 🎯 قائمة الإجراءات الثلاث نقاط */}
                            <TableCell className="py-3 px-4 text-center whitespace-nowrap">
                              <DropdownMenu dir="rtl">
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600">
                                    <MoreVertical className="w-4 h-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-56 rounded-2xl p-2 font-bold text-xs space-y-1">
                                  <DropdownMenuItem
                                    onClick={() => setPreviewModal({
                                      open: true,
                                      title: `تفاصيل أمر الصرف (${item.orderNumber})`,
                                      type: "order",
                                      data: item,
                                    })}
                                    className="rounded-xl cursor-pointer gap-2 py-2 text-slate-700 dark:text-slate-200"
                                  >
                                    <Eye className="w-4 h-4 text-blue-500 shrink-0" />
                                    <span>عرض أمر الصرف</span>
                                  </DropdownMenuItem>

                                  {/* تظهر حصراً لأوامر الصرف المرتبطة بطلب صرف معتمد */}
                                  <DropdownMenuItem
                                    onClick={() => setPreviewModal({
                                      open: true,
                                      title: `تفاصيل طلب الصرف المعتمد (${item.requestNumber})`,
                                      type: "request",
                                      data: item,
                                    })}
                                    className="rounded-xl cursor-pointer gap-2 py-2 text-slate-700 dark:text-slate-200"
                                  >
                                    <FileText className="w-4 h-4 text-purple-500 shrink-0" />
                                    <span>عرض طلب الصرف المعتمد</span>
                                  </DropdownMenuItem>

                                  <DropdownMenuSeparator />

                                  <DropdownMenuItem
                                    onClick={() => handleDirectApprove(item.orderId)}
                                    disabled={approvingId === item.orderId}
                                    className="rounded-xl cursor-pointer gap-2 py-2 text-emerald-700 dark:text-emerald-400 focus:bg-emerald-50 dark:focus:bg-emerald-950/40"
                                  >
                                    <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
                                    <span>اعتماد وتحويل المبلغ</span>
                                  </DropdownMenuItem>

                                  <DropdownMenuItem
                                    onClick={() => setRejectingOrder({ id: item.orderId, orderNumber: item.orderNumber })}
                                    className="rounded-xl cursor-pointer gap-2 py-2 text-rose-700 dark:text-rose-400 focus:bg-rose-50 dark:focus:bg-rose-950/40"
                                  >
                                    <XCircle className="w-4 h-4 text-rose-500 shrink-0" />
                                    <span>رفض أمر الصرف</span>
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-10 text-muted-foreground text-sm bg-slate-50/50 dark:bg-slate-900/50 rounded-2xl border border-dashed">
                  لا توجد أوامر صرف مرتبطة بطلبات معتمدة حالياً
                </div>
              )}
            </Card>

            {/* 2️⃣ جدول أوامر الصرف المخصصة المعتمدة (غير المرتبطة بطلب صرف) */}
            <Card className="rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 shadow-lg overflow-hidden p-6 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
                <div className="flex items-center gap-3 text-right">
                  <div className="p-2.5 rounded-2xl bg-amber-500/10 text-amber-600 shrink-0">
                    <FileSpreadsheet className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-black text-slate-900 dark:text-slate-100">
                      أوامر الصرف المخصصة المعتمدة
                    </h2>
                    <p className="text-xs text-muted-foreground">
                      جدول أوامر الصرف المخصصة المعتمدة غير المرتبطة بطلب صرف وبانتظار قرار الاعتماد البنكي
                    </p>
                  </div>
                </div>

                <Badge className="bg-amber-600 text-white rounded-xl font-bold px-3 py-1 text-xs shrink-0 self-start sm:self-auto">
                  {filteredCustomOrders.length} أمر مخصص
                </Badge>
              </div>

              {filteredCustomOrders.length > 0 ? (
                <div className="overflow-x-auto rounded-2xl border border-slate-200/70 dark:border-slate-800">
                  <Table dir="rtl" className="w-full text-right">
                    <TableHeader className="bg-slate-50/80 dark:bg-slate-900/80">
                      <TableRow className="hover:bg-transparent">
                        <TableHead className="py-3 px-4 font-bold text-xs text-slate-700 dark:text-slate-200 text-right">رقم أمر الصرف</TableHead>
                        <TableHead className="py-3 px-4 font-bold text-xs text-slate-700 dark:text-slate-200 text-right">النوع</TableHead>
                        <TableHead className="py-3 px-4 font-bold text-xs text-slate-700 dark:text-slate-200 text-right">المستفيد</TableHead>
                        <TableHead className="py-3 px-4 font-bold text-xs text-slate-700 dark:text-slate-200 text-right">المصرف والآيبان</TableHead>
                        <TableHead className="py-3 px-4 font-bold text-xs text-slate-700 dark:text-slate-200 text-right">المبلغ</TableHead>
                        <TableHead className="py-3 px-4 font-bold text-xs text-slate-700 dark:text-slate-200 text-right">طريقة الدفع</TableHead>
                        <TableHead className="py-3 px-4 font-bold text-xs text-slate-700 dark:text-slate-200 text-right">الحالة</TableHead>
                        <TableHead className="py-3 px-4 font-bold text-xs text-slate-700 dark:text-slate-200 text-center">الإجراءات</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredCustomOrders.map((order) => {
                        const statusKey = order.status || "approved";
                        const statusInfo = STATUS_BADGES[statusKey] || { label: statusKey, className: "bg-slate-100 text-slate-700" };
                        return (
                          <TableRow key={order.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                            <TableCell className="py-3 px-4 font-mono font-bold text-xs text-slate-900 dark:text-slate-100 whitespace-nowrap">
                              {order.orderNumber}
                            </TableCell>

                            <TableCell className="py-3 px-4 whitespace-nowrap">
                              <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-300 font-bold text-[10px]">
                                أمر مخصص
                              </Badge>
                            </TableCell>

                            <TableCell className="py-3 px-4 text-xs font-semibold text-slate-800 dark:text-slate-200 max-w-[180px] truncate">
                              {order.beneficiaryName}
                            </TableCell>

                            <TableCell className="py-3 px-4 text-xs text-muted-foreground whitespace-nowrap">
                              <span className="font-bold text-slate-700 dark:text-slate-300">{order.beneficiaryBank}</span>
                              <span className="block font-mono text-[11px] text-slate-500">{order.beneficiaryIban}</span>
                            </TableCell>

                            <TableCell className="py-3 px-4 font-mono font-bold text-xs text-amber-600 dark:text-amber-400 whitespace-nowrap">
                              {formatCurrency(order.amount)}
                            </TableCell>

                            <TableCell className="py-3 px-4 text-xs text-muted-foreground whitespace-nowrap font-medium">
                              {PAYMENT_METHOD_MAP[order.paymentMethod || "bank_transfer"]}
                            </TableCell>

                            <TableCell className="py-3 px-4 whitespace-nowrap">
                              <Badge variant="outline" className={`text-[11px] font-bold ${statusInfo.className}`}>
                                {statusInfo.label}
                              </Badge>
                            </TableCell>

                            {/* 🎯 قائمة الإجراءات لأمر الصرف المخصص */}
                            <TableCell className="py-3 px-4 text-center whitespace-nowrap">
                              <DropdownMenu dir="rtl">
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600">
                                    <MoreVertical className="w-4 h-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-52 rounded-2xl p-2 font-bold text-xs space-y-1">
                                  <DropdownMenuItem
                                    onClick={() => setPreviewModal({
                                      open: true,
                                      title: `تفاصيل أمر الصرف المخصص (${order.orderNumber})`,
                                      type: "order",
                                      data: order,
                                    })}
                                    className="rounded-xl cursor-pointer gap-2 py-2 text-slate-700 dark:text-slate-200"
                                  >
                                    <Eye className="w-4 h-4 text-blue-500 shrink-0" />
                                    <span>عرض أمر الصرف</span>
                                  </DropdownMenuItem>

                                  <DropdownMenuSeparator />

                                  <DropdownMenuItem
                                    onClick={() => handleDirectApprove(order.id)}
                                    disabled={approvingId === order.id}
                                    className="rounded-xl cursor-pointer gap-2 py-2 text-emerald-700 dark:text-emerald-400 focus:bg-emerald-50 dark:focus:bg-emerald-950/40"
                                  >
                                    <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
                                    <span>اعتماد وتحويل المبلغ</span>
                                  </DropdownMenuItem>

                                  <DropdownMenuItem
                                    onClick={() => setRejectingOrder({ id: order.id, orderNumber: order.orderNumber })}
                                    className="rounded-xl cursor-pointer gap-2 py-2 text-rose-700 dark:text-rose-400 focus:bg-rose-50 dark:focus:bg-rose-950/40"
                                  >
                                    <XCircle className="w-4 h-4 text-rose-500 shrink-0" />
                                    <span>رفض أمر الصرف</span>
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-10 text-muted-foreground text-sm bg-slate-50/50 dark:bg-slate-900/50 rounded-2xl border border-dashed">
                  لا توجد أوامر صرف مخصصة معتمدة حالياً
                </div>
              )}
            </Card>
          </div>
        )}

        {/* ==================== 📊 واجهة عضو مجلس الإدارة (التبويبات الـ 5 للإحصائيات) ==================== */}
        {!isChairman && data && (
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

        {/* ==================== 💬 نافذة الرفض التفصيلية ==================== */}
        <Dialog open={!!rejectingOrder} onOpenChange={(open) => !open && setRejectingOrder(null)}>
          <DialogContent className="sm:max-w-lg rounded-3xl p-6 text-right" dir="rtl">
            <DialogHeader className="text-right space-y-2">
              <DialogTitle className="text-xl font-bold flex items-center gap-2 text-rose-600 dark:text-rose-400">
                <XCircle className="w-5 h-5 shrink-0" />
                <span>رفض أمر الصرف ({rejectingOrder?.orderNumber})</span>
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                يرجى تدوين سبب رفض أو إلغاء تحويل أمر الصرف ليتم تسجيله بالمنظومة وإشعار الإدارة المالية.
              </DialogDescription>
            </DialogHeader>

            <div className="py-3 space-y-3">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">سبب الرفض والتوثيق المالي:</label>
              <Textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="اكتب سبب الرفض التفصيلي هنا..."
                rows={4}
                className="rounded-xl border-slate-200 dark:border-slate-800 text-xs font-semibold"
              />
            </div>

            <DialogFooter className="flex-row sm:justify-start gap-2 pt-2">
              <Button
                variant="destructive"
                onClick={handleConfirmReject}
                disabled={isRejecting || !rejectionReason.trim()}
                className="rounded-xl font-bold text-xs gap-2"
              >
                <XCircle className="w-4 h-4 shrink-0" />
                <span>{isRejecting ? "جاري الرفض..." : "تأكيد رفض أمر الصرف"}</span>
              </Button>
              <Button
                variant="outline"
                onClick={() => setRejectingOrder(null)}
                className="rounded-xl font-bold text-xs"
              >
                إلغاء
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
      </div>
    </DashboardLayout>
  );
}
