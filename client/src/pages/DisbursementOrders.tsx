import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { usePermission } from "@/hooks/usePermission";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Eye,
  CheckCircle,
  XCircle,
  Clock,
  Banknote,
  FileText,
  Search,
  Filter,
  Printer,
  PlayCircle,
  ChevronLeft,
  MoreVertical,
  Plus,
  Loader2,
  Download,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import ExcelJS from "exceljs";

const STATUS_MAP: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; className: string }> = {
  draft: { label: "مسودة", variant: "outline", className: "border-slate-300 text-slate-600 bg-slate-50 dark:bg-slate-900/20 dark:text-slate-400 dark:border-slate-800" },
  pending: { label: "قيد الاعتماد", variant: "outline", className: "border-amber-400 text-amber-700 bg-amber-50/50 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900/30" },
  approved: { label: "معتمد", variant: "outline", className: "border-emerald-500 text-emerald-700 bg-emerald-50 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/50" },
  rejected: { label: "مرفوض", variant: "outline", className: "border-red-500 text-red-700 bg-red-50 dark:bg-red-950/20 dark:text-red-400 dark:border-red-900/50" },
  edited: { label: "تم التعديل", variant: "outline", className: "border-purple-500 text-purple-700 bg-purple-50 dark:bg-purple-950/20 dark:text-purple-400 dark:border-purple-900/50" },
  executed: { label: "منفذ", variant: "outline", className: "border-blue-500 text-blue-700 bg-blue-50 dark:bg-blue-950/20 dark:text-blue-400 dark:border-blue-900/50" },
  paid: { label: "مدفوع", variant: "outline", className: "border-blue-500 text-blue-700 bg-blue-50 dark:bg-blue-950/20 dark:text-blue-400 dark:border-blue-900/50" },
  cancelled: { label: "ملغي", variant: "outline", className: "border-slate-500 text-slate-700 bg-slate-50 dark:bg-slate-900/20 dark:text-slate-400 dark:border-slate-800" },
};

const PAYMENT_METHOD_MAP: Record<string, string> = {
  bank_transfer: "تحويل بنكي",
  check: "إصدار شيك",
  custody: "صرف من العهدة",
  sadad: "سداد",
};

export default function DisbursementOrders() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const utils = trpc.useUtils();
  const [isExporting, setIsExporting] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const handleExportExcel = async () => {
    try {
      setIsExporting(true);
      const allData = await utils.disbursements.listOrders.fetch({
        status: statusFilter !== "all" ? statusFilter as any : undefined,
        search: debouncedSearch || undefined,
        page: 1,
        limit: 5000,
      });

      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("أوامر الصرف", {
        views: [{ showGridLines: true, rightToLeft: true }]
      });

      // Add headers
      worksheet.addRow(["رقم الأمر", "رقم طلب الصرف", "المشروع", "المستفيد", "المبلغ (ريال)", "طريقة الدفع", "الحالة", "البنك / رقم السداد", "الآيبان / رقم المفوتر"]);

      // Add rows
      (allData?.orders || []).forEach((order: any) => {
        const paymentMethodText = order.paymentMethod === "bank_transfer" ? "تحويل بنكي" :
                                  order.paymentMethod === "check" ? "شيك" :
                                  order.paymentMethod === "custody" ? "عهدة" : 
                                  order.paymentMethod === "sadad" ? "سداد" : order.paymentMethod || "-";

        const statusText = order.status === "pending" ? "قيد الاعتماد" :
                           order.status === "approved" ? "معتمد" :
                           order.status === "executed" ? "منفذ" :
                           order.status === "rejected" ? "مرفوض" : order.status || "-";

        const bankOrSadad = order.paymentMethod === "sadad" ? (order.sadadNumber || "-") : (order.beneficiaryBank || "-");
        const ibanOrBiller = order.paymentMethod === "sadad" ? (order.billerCode || "-") : (order.beneficiaryIban || "-");

        worksheet.addRow([
          order.orderNumber || "-",
          order.requestNumber || "-",
          order.projectName || "-",
          order.beneficiaryName || "-",
          Number(order.amount) || 0,
          paymentMethodText,
          statusText,
          bankOrSadad,
          ibanOrBiller,
        ]);
      });

      // Set column widths to 30 for A through I
      ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I'].forEach(col => {
        worksheet.getColumn(col).width = 30;
      });

      // Write buffer and download
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `تقرير_أوامر_الصرف_${new Intl.DateTimeFormat('en-CA').format(new Date())}.xlsx`;
      a.click();
      window.URL.revokeObjectURL(url);

      toast.success("تم تصدير ملف Excel بنجاح");
    } catch (error) {
      console.error("Failed to export excel:", error);
      toast.error("حدث خطأ أثناء تصدير ملف Excel");
    } finally {
      setIsExporting(false);
    }
  };
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const limit = 10;

  const [showApproveDialog, setShowApproveDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [showExecuteDialog, setShowExecuteDialog] = useState(false);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [approvalNotes, setApprovalNotes] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");
  const [transactionReference, setTransactionReference] = useState("");

  // مؤقت لتأخير البحث (Debounce) لضمان أفضل أداء للاستعلامات
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setPage(1); // إعادة التعيين للصفحة الأولى عند البحث
    }, 400);

    return () => {
      clearTimeout(handler);
    };
  }, [searchTerm]);

  // جلب قائمة أوامر الصرف المفلترة والمسحوبة من الخادم
  const { data: ordersData, isLoading, refetch: refetchOrders } = trpc.disbursements.listOrders.useQuery({
    status: statusFilter !== "all" ? statusFilter as any : undefined,
    search: debouncedSearch || undefined,
    page,
    limit,
  });

  // Mutations
  const approveOrderMutation = trpc.disbursements.approveOrder.useMutation({
    onSuccess: () => {
      toast.success("تم اعتماد أمر الصرف بنجاح");
      setShowApproveDialog(false);
      setApprovalNotes("");
      refetchOrders();
    },
    onError: (error) => {
      toast.error(error.message || "حدث خطأ أثناء اعتماد أمر الصرف");
    },
  });

  const rejectOrderMutation = trpc.disbursements.rejectOrder.useMutation({
    onSuccess: () => {
      toast.success("تم رفض أمر الصرف");
      setShowRejectDialog(false);
      setRejectionReason("");
      refetchOrders();
    },
    onError: (error) => {
      toast.error(error.message || "حدث خطأ أثناء رفض أمر الصرف");
    },
  });

  const executeOrderMutation = trpc.disbursements.executeOrder.useMutation({
    onSuccess: () => {
      toast.success("تم تنفيذ أمر الصرف بنجاح");
      setShowExecuteDialog(false);
      setTransactionReference("");
      refetchOrders();
    },
    onError: (error) => {
      toast.error(error.message || "حدث خطأ أثناء تنفيذ أمر الصرف");
    },
  });

  // التحقق من الصلاحيات
  const canApproveOrder = usePermission("disbursement_orders.approve");
  const canRejectOrder = usePermission("disbursement_orders.reject");
  const canViewDetails = usePermission("disbursement_orders.view_details");
  const canCreateDirectOrder = usePermission("disbursement_orders.create_direct");

  // تعيين الأوامر مباشرة من استجابة الخادم
  const filteredOrders = ordersData?.orders || [];

  // إحصائيات عامة وعالمية دقيقة من الخادم
  const pendingCount = ordersData?.stats?.pendingCount || 0;
  const approvedCount = ordersData?.stats?.approvedCount || 0;
  const rejectedCount = ordersData?.stats?.rejectedCount || 0;
  const totalAmount = ordersData?.stats?.totalAmount || 0;

  const total = ordersData?.total || 0;
  const totalPages = Math.ceil(total / limit);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* العنوان والإحصائيات */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold">أوامر الصرف</h1>
            <p className="text-muted-foreground">إدارة واعتماد وتنفيذ أوامر الصرف المالية</p>
          </div>
          {canCreateDirectOrder && (
            <div className="w-full sm:w-auto flex justify-end">
              <Button 
                onClick={() => navigate("/disbursement-orders/new-direct")} 
                className="w-full sm:w-auto gradient-primary text-white font-bold"
              >
                <Plus className="ml-2 h-4 w-4" />
                إنشاء أمر صرف مخصص
              </Button>
            </div>
          )}
        </div>

        {/* بطاقات الإحصائيات المحدثة والأنيقة */}
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4" dir="rtl">
          <Card className="border-0 shadow-sm overflow-hidden bg-background hover:shadow-md transition-shadow relative">
            <CardContent className="p-4 sm:p-5 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 bg-amber-50 dark:bg-amber-950/30 border border-amber-100 dark:border-amber-900/50 text-amber-600 dark:text-amber-400">
                <Clock className="w-5 h-5" />
              </div>
              <div className="min-w-0 text-right">
                <p className="text-xs text-muted-foreground font-semibold">قيد الاعتماد</p>
                <p className="text-lg sm:text-2xl font-black text-foreground mt-0.5">{pendingCount}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm overflow-hidden bg-background hover:shadow-md transition-shadow relative">
            <CardContent className="p-4 sm:p-5 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 bg-green-50 dark:bg-green-950/30 border border-green-100 dark:border-green-900/50 text-green-600 dark:text-green-400">
                <CheckCircle className="w-5 h-5" />
              </div>
              <div className="min-w-0 text-right">
                <p className="text-xs text-muted-foreground font-semibold">معتمدة</p>
                <p className="text-lg sm:text-2xl font-black text-foreground mt-0.5">{approvedCount}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm overflow-hidden bg-background hover:shadow-md transition-shadow relative">
            <CardContent className="p-4 sm:p-5 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 bg-red-50 dark:bg-red-950/30 border border-red-100 dark:border-red-900/50 text-red-600 dark:text-red-400">
                <XCircle className="w-5 h-5" />
              </div>
              <div className="min-w-0 text-right">
                <p className="text-xs text-muted-foreground font-semibold">مرفوضة</p>
                <p className="text-lg sm:text-2xl font-black text-foreground mt-0.5">{rejectedCount}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm overflow-hidden bg-background hover:shadow-md transition-shadow relative">
            <CardContent className="p-4 sm:p-5 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/50 text-emerald-600 dark:text-emerald-400">
                <Banknote className="w-5 h-5" />
              </div>
              <div className="min-w-0 flex-1 text-right">
                <p className="text-xs text-muted-foreground font-semibold">إجمالي المبالغ</p>
                <p className="text-lg sm:text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-0.5 truncate leading-none">
                  {totalAmount.toLocaleString()} <span className="text-[10px] sm:text-xs font-normal text-muted-foreground">ريال</span>
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* أدوات البحث والتصفية */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="p-4 sm:p-6 pb-2">
            <CardTitle className="text-lg sm:text-xl">قائمة أوامر الصرف</CardTitle>
            <CardDescription className="text-xs sm:text-sm">عرض وإدارة جميع أوامر الصرف</CardDescription>
          </CardHeader>
          <CardContent className="p-4 sm:p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center mb-6">
              <div className="relative flex-1">
                <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="بحث برقم الأمر أو اسم المستفيد..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pr-10"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full lg:w-[180px]">
                  <Filter className="ml-2 h-4 w-4" />
                  <SelectValue placeholder="جميع الحالات" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">جميع الحالات</SelectItem>
                  <SelectItem value="pending">قيد الاعتماد</SelectItem>
                  <SelectItem value="approved">معتمد</SelectItem>
                  <SelectItem value="rejected">مرفوض</SelectItem>
                  <SelectItem value="edited">تم التعديل</SelectItem>
                </SelectContent>
              </Select>

              <Button 
                onClick={handleExportExcel} 
                disabled={isExporting}
                variant="outline"
                className="w-full lg:w-auto h-10 border-[#1a5f4a]/30 text-[#1a5f4a] bg-transparent hover:bg-[#1a5f4a]/5 hover:text-[#1a5f4a] font-bold rounded-lg shrink-0 flex items-center justify-center gap-1.5 transition-colors"
              >
                {isExporting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
                <span dir="rtl">تصدير إلى Excel</span>
              </Button>
            </div>

            {isLoading ? (
              <div className="text-center py-8">جاري التحميل...</div>
            ) : filteredOrders?.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                لا توجد أوامر صرف
              </div>
            ) : (
              <Card className="border-0 shadow-sm overflow-hidden p-0">
                {/* Desktop View Table */}
                <div className="hidden md:block overflow-x-auto">
                  <Table dir="rtl">
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-right">رقم الأمر</TableHead>
                        <TableHead className="text-right">المشروع</TableHead>
                        <TableHead className="text-right">المستفيد</TableHead>
                        <TableHead className="text-right">المبلغ</TableHead>
                        <TableHead className="text-right">طريقة الدفع</TableHead>
                        <TableHead className="text-right">الحالة</TableHead>
                        <TableHead className="text-right">التاريخ</TableHead>
                        <TableHead className="text-right">الإجراءات</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredOrders?.map((order) => (
                        <TableRow key={order.id}>
                          <TableCell className="font-mono text-xs text-right">{order.orderNumber}</TableCell>
                          <TableCell className="max-w-[150px] truncate text-right">{order.projectName || "-"}</TableCell>
                          <TableCell className="max-w-[150px] truncate text-right">{order.beneficiaryName}</TableCell>
                          <TableCell className="whitespace-nowrap text-right">{Number(order.amount).toLocaleString()} ريال</TableCell>
                          <TableCell className="text-right">{PAYMENT_METHOD_MAP[order.paymentMethod || "bank_transfer"]}</TableCell>
                          <TableCell className="text-right">
                            <Badge variant={STATUS_MAP[order.status || "draft"]?.variant} className={`whitespace-nowrap ${STATUS_MAP[order.status || "draft"]?.className}`}>
                              {STATUS_MAP[order.status || "draft"]?.label}
                            </Badge>
                          </TableCell>
                          <TableCell className="whitespace-nowrap text-right">
                            {order.createdAt ? new Date(order.createdAt).toLocaleDateString("ar-SA") : "-"}
                          </TableCell>
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-muted shrink-0">
                                  <MoreVertical className="h-4 w-4 text-muted-foreground" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="start" className="w-48 text-right font-medium">
                                {order.status === "approved" ? (
                                  <>
                                    {canViewDetails && (
                                      <DropdownMenuItem
                                        onClick={() => {
                                          setSelectedOrder(order);
                                          setShowDetailsDialog(true);
                                        }}
                                        className="flex items-center gap-2 cursor-pointer text-slate-700 hover:text-slate-900 focus:bg-muted/50 font-semibold"
                                      >
                                        <Eye className="h-4 w-4 text-blue-500" />
                                        <span>عرض التفاصيل</span>
                                      </DropdownMenuItem>
                                    )}
                                    <DropdownMenuItem
                                      onClick={() => {
                                        navigate(`/disbursement-orders/${order.id}/print`);
                                      }}
                                      className="flex items-center gap-2 cursor-pointer text-slate-700 hover:text-slate-900 focus:bg-muted/50 font-semibold"
                                    >
                                      <Printer className="h-4 w-4 text-emerald-600" />
                                      <span>عرض تقرير امر الصرف</span>
                                    </DropdownMenuItem>
                                  </>
                                ) : (
                                  <>
                                    {canApproveOrder && (order.status === "pending" || order.status === "edited") && (
                                      <DropdownMenuItem
                                        onClick={() => {
                                          setSelectedOrder(order);
                                          setShowApproveDialog(true);
                                        }}
                                        className="flex items-center gap-2 cursor-pointer text-slate-700 hover:text-green-600 focus:text-green-600 focus:bg-green-50 dark:focus:bg-green-950/30 font-bold"
                                      >
                                        <CheckCircle className="h-4 w-4 text-green-600" />
                                        <span>اعتماد أمر الصرف</span>
                                      </DropdownMenuItem>
                                    )}

                                    {canRejectOrder && (order.status === "pending" || order.status === "edited") && (
                                      <DropdownMenuItem
                                        onClick={() => {
                                          setSelectedOrder(order);
                                          setShowRejectDialog(true);
                                        }}
                                        className="flex items-center gap-2 cursor-pointer text-slate-700 hover:text-red-600 focus:text-red-600 focus:bg-red-50 dark:focus:bg-red-950/30 font-bold"
                                      >
                                        <XCircle className="h-4 w-4 text-red-600" />
                                        <span>رفض أمر الصرف</span>
                                      </DropdownMenuItem>
                                    )}

                                    {canViewDetails && (
                                      <DropdownMenuItem
                                        onClick={() => {
                                          setSelectedOrder(order);
                                          setShowDetailsDialog(true);
                                        }}
                                        className="flex items-center gap-2 cursor-pointer text-slate-700 hover:text-slate-900 focus:bg-muted/50 font-semibold"
                                      >
                                        <Eye className="h-4 w-4 text-blue-500" />
                                        <span>عرض التفاصيل</span>
                                      </DropdownMenuItem>
                                    )}
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

                {/* Modernized Mobile View Cards Grid */}
                <div className="md:hidden grid gap-4 p-4 bg-muted/5" dir="rtl">
                  {filteredOrders?.map((order) => (
                    <Card key={order.id} className="border border-border/80 shadow-sm overflow-hidden bg-background hover:shadow-md transition-shadow rounded-xl">
                      <div className="p-4 space-y-4">
                        {/* Card Header */}
                        <div className="flex items-center justify-between gap-2 border-b border-border/50 pb-3">
                          <span className="font-mono text-xs font-bold text-amber-700 bg-amber-50 dark:bg-amber-950/20 px-2.5 py-1 rounded-md">
                            {order.orderNumber}
                          </span>
                          <Badge variant={STATUS_MAP[order.status || "draft"]?.variant} className={`text-[10px] px-2.5 py-0.5 rounded-full font-semibold ${STATUS_MAP[order.status || "draft"]?.className}`}>
                            {STATUS_MAP[order.status || "draft"]?.label}
                          </Badge>
                        </div>

                        {/* Card Body */}
                        <div className="space-y-3">
                          <div>
                            <p className="text-[10px] text-muted-foreground mb-0.5 font-medium">المستفيد</p>
                            <h4 className="font-bold text-sm text-foreground leading-tight">{order.beneficiaryName}</h4>
                          </div>

                          <div className="flex items-start gap-2 bg-muted/30 p-2 rounded-lg">
                            <span className="w-1.5 h-1.5 bg-amber-500 rounded-full mt-1.5 shrink-0" />
                            <div className="min-w-0 text-right">
                              <p className="text-[9px] text-muted-foreground font-medium">المشروع</p>
                              <p className="text-xs text-foreground font-semibold truncate">{order.projectName || "—"}</p>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-3 text-right">
                            <div className="bg-emerald-50/20 dark:bg-emerald-950/10 border border-emerald-100/50 dark:border-emerald-900/30 p-2 rounded-lg">
                              <p className="text-[9px] text-emerald-800 dark:text-emerald-400 font-semibold mb-0.5">المبلغ</p>
                              <p className="text-sm font-bold text-emerald-700 dark:text-emerald-400 font-mono">
                                {Number(order.amount).toLocaleString()} <span className="text-[10px] font-normal">ريال</span>
                              </p>
                            </div>
                            <div className="bg-muted/40 p-2 rounded-lg">
                              <p className="text-[9px] text-muted-foreground font-medium mb-0.5">طريقة الدفع</p>
                              <p className="text-xs font-semibold text-foreground">{PAYMENT_METHOD_MAP[order.paymentMethod || "bank_transfer"]}</p>
                            </div>
                          </div>
                        </div>

                        {/* Card Actions Footer */}
                        <div className="flex items-center justify-between pt-3 border-t border-border/50">
                          <span className="text-[10px] text-muted-foreground font-medium">
                            {order.createdAt ? new Date(order.createdAt).toLocaleDateString("ar-SA") : "—"}
                          </span>
                          
                          <div className="flex gap-1.5">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="sm" className="h-8 w-8 p-0 hover:bg-muted rounded-full">
                                  <MoreVertical className="h-3.5 w-3.5 text-muted-foreground" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="start" className="w-48 text-right font-medium">
                                {order.status === "approved" ? (
                                  <>
                                    {canViewDetails && (
                                      <DropdownMenuItem
                                        onClick={() => {
                                          setSelectedOrder(order);
                                          setShowDetailsDialog(true);
                                        }}
                                        className="flex items-center gap-2 cursor-pointer text-slate-700 hover:text-slate-900 focus:bg-muted/50 font-semibold"
                                      >
                                        <Eye className="h-4 w-4 text-blue-500" />
                                        <span>عرض التفاصيل</span>
                                      </DropdownMenuItem>
                                    )}
                                    <DropdownMenuItem
                                      onClick={() => {
                                        navigate(`/disbursement-orders/${order.id}/print`);
                                      }}
                                      className="flex items-center gap-2 cursor-pointer text-slate-700 hover:text-slate-900 focus:bg-muted/50 font-semibold"
                                    >
                                      <Printer className="h-4 w-4 text-emerald-600" />
                                      <span>عرض تقرير امر الصرف</span>
                                    </DropdownMenuItem>
                                  </>
                                ) : (
                                  <>
                                    {canApproveOrder && (order.status === "pending" || order.status === "edited") && (
                                      <DropdownMenuItem
                                        onClick={() => {
                                          setSelectedOrder(order);
                                          setShowApproveDialog(true);
                                        }}
                                        className="flex items-center gap-2 cursor-pointer text-slate-700 hover:text-green-600 focus:text-green-600 focus:bg-green-50 dark:focus:bg-green-950/30 font-bold"
                                      >
                                        <CheckCircle className="h-4 w-4 text-green-600" />
                                        <span>اعتماد أمر الصرف</span>
                                      </DropdownMenuItem>
                                    )}

                                    {canRejectOrder && (order.status === "pending" || order.status === "edited") && (
                                      <DropdownMenuItem
                                        onClick={() => {
                                          setSelectedOrder(order);
                                          setShowRejectDialog(true);
                                        }}
                                        className="flex items-center gap-2 cursor-pointer text-slate-700 hover:text-red-600 focus:text-red-600 focus:bg-red-50 dark:focus:bg-red-950/30 font-bold"
                                      >
                                        <XCircle className="h-4 w-4 text-red-600" />
                                        <span>رفض أمر الصرف</span>
                                      </DropdownMenuItem>
                                    )}

                                    {canViewDetails && (
                                      <DropdownMenuItem
                                        onClick={() => {
                                          setSelectedOrder(order);
                                          setShowDetailsDialog(true);
                                        }}
                                        className="flex items-center gap-2 cursor-pointer text-slate-700 hover:text-slate-900 focus:bg-muted/50 font-semibold"
                                      >
                                        <Eye className="h-4 w-4 text-blue-500" />
                                        <span>عرض التفاصيل</span>
                                      </DropdownMenuItem>
                                    )}
                                  </>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>

                {/* تذييل الصفحة مع الترقيم وخادم البحث */}
                <div className="px-4 py-4 bg-muted/10 border-t flex flex-col items-center justify-center gap-4">
                  <div className="text-[11px] md:text-xs text-muted-foreground text-center font-medium">
                    يعرض {total > 0 ? (page - 1) * limit + 1 : 0} - {Math.min(page * limit, total)} من أصل {total} أمر صرف
                  </div>
                  
                  {totalPages > 1 && (
                    <div className="flex items-center gap-1.5 overflow-x-auto max-w-full py-1">
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8 shrink-0"
                        onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
                        disabled={page === 1}
                      >
                        <ChevronLeft className="h-4 w-4 text-right" />
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
                              onClick={() => setPage(p)}
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
                        className="h-8 w-8 shrink-0"
                        onClick={() => setPage((prev) => Math.min(prev + 1, totalPages))}
                        disabled={page === totalPages}
                      >
                        <ChevronLeft className="h-4 w-4 rotate-180" />
                      </Button>
                    </div>
                  )}
                </div>
              </Card>
            )}
          </CardContent>
        </Card>

        {/* نافذة اعتماد أمر الصرف */}
        <Dialog open={showApproveDialog} onOpenChange={setShowApproveDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>اعتماد أمر الصرف</DialogTitle>
              <DialogDescription>
                هل أنت متأكد من اعتماد أمر الصرف رقم {selectedOrder?.orderNumber}؟
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 text-right" dir="rtl">
              <div className="bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30 p-4 rounded-xl space-y-3 shadow-inner">
                <div className="flex justify-between items-center border-b border-emerald-100/30 pb-2">
                  <span className="text-xs text-muted-foreground font-semibold">المستفيد:</span>
                  <span className="text-sm font-bold text-foreground">{selectedOrder?.beneficiaryName}</span>
                </div>
                <div className="flex justify-between items-center border-b border-emerald-100/30 pb-2">
                  <span className="text-xs text-muted-foreground font-semibold">المبلغ الذي سوف يصرف:</span>
                  <span className="text-base font-black text-emerald-600 dark:text-emerald-400">
                    {Number(selectedOrder?.amount || 0).toLocaleString()} ريال
                  </span>
                </div>
                <div className="flex justify-between items-center border-b border-emerald-100/30 pb-2">
                  <span className="text-xs text-muted-foreground font-semibold">اسم البنك:</span>
                  <span className="text-sm font-bold text-foreground">{selectedOrder?.beneficiaryBank || "—"}</span>
                </div>
                <div className="flex flex-col gap-1 items-start justify-start pt-1">
                  <span className="text-xs text-muted-foreground font-semibold">رقم الآيبان (IBAN):</span>
                  <span className="text-xs font-mono font-bold text-slate-700 dark:text-slate-300 bg-background px-2.5 py-1.5 rounded border border-border/80 w-full mt-1 text-left select-all" dir="ltr">
                    {selectedOrder?.beneficiaryIban || "—"}
                  </span>
                </div>
              </div>
              <div className="space-y-2">
                <Label>ملاحظات (اختياري)</Label>
                <Textarea
                  value={approvalNotes}
                  onChange={(e) => setApprovalNotes(e.target.value)}
                  placeholder="أدخل ملاحظاتك..."
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowApproveDialog(false)}>
                إلغاء
              </Button>
              <Button
                onClick={() => {
                  if (selectedOrder) {
                    approveOrderMutation.mutate({
                      id: selectedOrder.id,
                      notes: approvalNotes,
                    });
                  }
                }}
                disabled={approveOrderMutation.isPending}
              >
                {approveOrderMutation.isPending ? "جاري الاعتماد..." : "اعتماد"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* نافذة رفض أمر الصرف */}
        <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>رفض أمر الصرف</DialogTitle>
              <DialogDescription>
                يرجى إدخال سبب رفض أمر الصرف رقم {selectedOrder?.orderNumber}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>سبب الرفض *</Label>
                <Textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="أدخل سبب الرفض..."
                  required
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowRejectDialog(false)}>
                إلغاء
              </Button>
              <Button
                variant="destructive"
                onClick={() => {
                  if (selectedOrder && rejectionReason) {
                    rejectOrderMutation.mutate({
                      id: selectedOrder.id,
                      reason: rejectionReason,
                    });
                  }
                }}
                disabled={!rejectionReason || rejectOrderMutation.isPending}
              >
                {rejectOrderMutation.isPending ? "جاري الرفض..." : "رفض"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* نافذة تنفيذ أمر الصرف */}
        <Dialog open={showExecuteDialog} onOpenChange={setShowExecuteDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>تنفيذ أمر الصرف</DialogTitle>
              <DialogDescription>
                تأكيد تنفيذ أمر الصرف رقم {selectedOrder?.orderNumber}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="bg-muted p-4 rounded-lg">
                <p><strong>المستفيد:</strong> {selectedOrder?.beneficiaryName}</p>
                <p><strong>المبلغ:</strong> {Number(selectedOrder?.amount || 0).toLocaleString()} ريال</p>
                <p><strong>طريقة الدفع:</strong> {PAYMENT_METHOD_MAP[selectedOrder?.paymentMethod || "bank_transfer"]}</p>
              </div>
              <div className="space-y-2">
                <Label>رقم العملية / المرجع (اختياري)</Label>
                <Input
                  value={transactionReference}
                  onChange={(e) => setTransactionReference(e.target.value)}
                  placeholder="أدخل رقم العملية البنكية..."
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowExecuteDialog(false)}>
                إلغاء
              </Button>
              <Button
                onClick={() => {
                  if (selectedOrder) {
                    executeOrderMutation.mutate({
                      id: selectedOrder.id,
                      transactionReference: transactionReference || undefined,
                    });
                  }
                }}
                disabled={executeOrderMutation.isPending}
              >
                {executeOrderMutation.isPending ? "جاري التنفيذ..." : "تنفيذ الصرف"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* نافذة تفاصيل أمر الصرف */}
        <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-[#1a5f4a]">
                <FileText className="h-5 w-5 text-[#1a5f4a]" />
                <span>تفاصيل أمر الصرف</span>
              </DialogTitle>
              <DialogDescription className="text-right">
                تفاصيل البيانات المالية والمعلومات البنكية للمورد الخاصة بأمر الصرف رقم {selectedOrder?.orderNumber}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 text-right py-2" dir="rtl">
              {/* قسم المبلغ */}
              <div className="bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-100/30 dark:border-emerald-900/30 p-4 rounded-xl flex flex-col items-center justify-center text-center space-y-1 shadow-sm">
                <span className="text-xs text-muted-foreground font-semibold">المبلغ المستحق للصرف</span>
                <span className="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400">
                  {Number(selectedOrder?.amount || 0).toLocaleString()} <span className="text-sm font-normal text-muted-foreground">ريال سعودي</span>
                </span>
              </div>

              {/* قسم تفاصيل المورد والبنك */}
              <div className="border border-border/80 rounded-xl overflow-hidden divide-y divide-border/60">
                <div className="p-3 flex justify-between items-center gap-2">
                  <span className="text-xs text-muted-foreground font-semibold shrink-0">اسم المستفيد (المورد):</span>
                  <span className="text-sm font-bold text-foreground text-left">{selectedOrder?.beneficiaryName || "—"}</span>
                </div>
                <div className="p-3 flex justify-between items-center gap-2">
                  <span className="text-xs text-muted-foreground font-semibold shrink-0">اسم البنك:</span>
                  <span className="text-sm font-bold text-foreground">{selectedOrder?.beneficiaryBank || "—"}</span>
                </div>
                <div className="p-3 flex justify-between items-center gap-2">
                  <span className="text-xs text-muted-foreground font-semibold shrink-0">رقم الآيبان (IBAN):</span>
                  <span className="text-sm font-mono font-bold text-foreground select-all text-left" dir="ltr">
                    {selectedOrder?.beneficiaryIban || "—"}
                  </span>
                </div>
                {selectedOrder?.beneficiaryAccountName && (
                  <div className="p-3 flex justify-between items-center gap-2">
                    <span className="text-xs text-muted-foreground font-semibold shrink-0">اسم صاحب الحساب:</span>
                    <span className="text-sm font-bold text-foreground text-left">{selectedOrder.beneficiaryAccountName}</span>
                  </div>
                )}
                <div className="p-3 flex justify-between items-center gap-2">
                  <span className="text-xs text-muted-foreground font-semibold shrink-0">طريقة الدفع:</span>
                  <span className="text-sm font-semibold text-foreground">
                    {PAYMENT_METHOD_MAP[selectedOrder?.paymentMethod || "bank_transfer"] || "—"}
                  </span>
                </div>
                <div className="p-3 flex justify-between items-center gap-2">
                  <span className="text-xs text-muted-foreground font-semibold shrink-0">حالة أمر الصرف:</span>
                  <Badge variant={STATUS_MAP[selectedOrder?.status || "draft"]?.variant} className={`text-[10px] px-2.5 py-0.5 rounded-full font-semibold ${STATUS_MAP[selectedOrder?.status || "draft"]?.className}`}>
                    {STATUS_MAP[selectedOrder?.status || "draft"]?.label}
                  </Badge>
                </div>
              </div>

              {(() => {
                const parsedAttachments = (() => {
                  if (!selectedOrder?.attachmentsJson) return [];
                  try {
                    return JSON.parse(selectedOrder.attachmentsJson);
                  } catch (e) {
                    return [];
                  }
                })();
                const linkAttachments = parsedAttachments.filter((att: any) => att.type === "link" || (att.url && att.url.startsWith("http")));

                if (linkAttachments.length === 0) return null;

                return (
                  <div className="bg-slate-50 dark:bg-slate-900/40 p-4 rounded-xl border border-slate-100 dark:border-slate-800/40 space-y-3 mt-4 text-right">
                    <span className="text-xs text-muted-foreground font-bold block">الروابط المرفقة:</span>
                    <div className="flex flex-col gap-2">
                      {linkAttachments.map((link: any, idx: number) => {
                        let hostname = "";
                        try {
                          hostname = new URL(link.url).hostname;
                        } catch (e) {}

                        return (
                          <a
                            key={idx}
                            href={link.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center justify-between p-2.5 bg-blue-50/40 hover:bg-blue-50/80 border border-blue-100/50 dark:bg-blue-950/20 dark:hover:bg-blue-950/30 dark:border-blue-900/30 rounded-xl transition-all group"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <ExternalLink className="h-4 w-4 text-blue-500 shrink-0 group-hover:text-blue-700 transition-colors" />
                              <span className="text-xs font-bold text-blue-700 dark:text-blue-400 truncate">{link.name || "رابط خارجي"}</span>
                            </div>
                            {hostname && (
                              <span className="text-[10px] text-muted-foreground font-mono bg-white dark:bg-slate-800 px-1.5 py-0.5 rounded border border-slate-100 dark:border-slate-800">
                                {hostname}
                              </span>
                            )}
                          </a>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}
            </div>

            <DialogFooter className="sm:justify-start">
              <Button variant="outline" onClick={() => setShowDetailsDialog(false)} className="w-full sm:w-auto font-semibold">
                إغلاق
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
