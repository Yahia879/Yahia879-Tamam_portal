import { useState, useMemo } from "react";
import { useLocation, Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
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
  Clock,
  ShoppingCart,
  Search,
  Printer,
  Download,
  Building2,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Package,
  Layers,
  FileText,
  Loader2,
  X,
  Edit,
  ArrowRight,
} from "lucide-react";
import { toast } from "sonner";
import { exportStyledExcel } from "@/lib/excelExportHelper";
import { useDocumentTitle } from "@/contexts/DocumentTitleContext";

const STATUS_MAP: Record<string, { label: string; className: string }> = {
  approved: {
    label: "معتمد وجاهز للطباعة",
    className: "border-sky-300 text-sky-800 bg-sky-50 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-800",
  },
  ready: {
    label: "معتمد وجاهز للطباعة",
    className: "border-sky-300 text-sky-800 bg-sky-50 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-800",
  },
  draft: {
    label: "قيد الإعداد (مسودة)",
    className: "border-amber-300 text-amber-800 bg-amber-50 dark:bg-amber-950/30 dark:text-amber-300 dark:border-amber-800",
  },
  executed: {
    label: "منفذ",
    className: "border-emerald-300 text-emerald-800 bg-emerald-50 dark:bg-emerald-950/30 dark:text-emerald-300 dark:border-emerald-800",
  },
};

export default function PurchaseOrdersList() {
  useDocumentTitle("أوامر الشراء - سدانة");
  const { user } = useAuth();
  const [, navigate] = useLocation();

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const limit = 10;

  const [isExporting, setIsExporting] = useState(false);

  // أمر الشراء المحدد للمعاينة والطباعة المباشرة
  const [selectedOrderForPreview, setSelectedOrderForPreview] = useState<any | null>(null);

  // أمر الشراء المحدد لعرض قائمة بنوده بالتفصيل
  const [selectedOrderForItems, setSelectedOrderForItems] = useState<any | null>(null);

  // استعلام أوامر الشراء والإحصائيات
  const {
    data: ordersData,
    isLoading,
    refetch,
  } = trpc.procurement.listPurchaseOrders.useQuery({
    search: searchTerm || undefined,
    status: statusFilter !== "all" ? statusFilter : undefined,
    page: currentPage,
    limit,
  });

  // جلب إعدادات الجمعية للطباعة
  const { data: orgSettings } = trpc.organization.getSettings.useQuery();

  const orders = ordersData?.orders || [];
  const total = ordersData?.total || 0;
  const stats = ordersData?.stats || {
    totalOrders: 0,
    approvedCount: 0,
    draftCount: 0,
    executedCount: 0,
    totalItemsCount: 0,
    totalMosquesCount: 0,
  };

  const totalPages = Math.max(1, Math.ceil(total / limit));

  // تصدير البيانات إلى Excel
  const handleExportExcel = async () => {
    try {
      setIsExporting(true);
      if (orders.length === 0) {
        toast.info("لا توجد بيانات لتصديرها");
        return;
      }

      const columns = [
        { header: "رقم أمر الشراء", align: "center" as const, minWidth: 18 },
        { header: "رقم الطلب", align: "center" as const, minWidth: 14 },
        { header: "اسم المسجد", align: "right" as const, minWidth: 26 },
        { header: "المدينة", align: "center" as const, minWidth: 16 },
        { header: "تاريخ الأمر", align: "center" as const, minWidth: 16 },
        { header: "الموجه إليه", align: "right" as const, minWidth: 22 },
        { header: "طالب الشراء", align: "right" as const, minWidth: 22 },
        { header: "المعتمِد", align: "right" as const, minWidth: 22 },
        { header: "عدد البنود", align: "center" as const, minWidth: 14 },
        { header: "الحالة", align: "center" as const, minWidth: 18 },
      ];

      const rows = orders.map((o) => [
        o.orderNumber || "",
        `#${o.requestNumber}`,
        o.mosqueName || "",
        o.mosqueCity || "",
        o.orderDate || "",
        o.directedTo || "",
        o.requesterName || "",
        o.approverName || "",
        o.itemsCount || 0,
        STATUS_MAP[o.status]?.label || o.status || "",
      ]);

      await exportStyledExcel({
        title: "سجل أوامر الشراء الداخلية - برنامج سدانة",
        subtitle: `تاريخ التصدير: ${new Date().toLocaleDateString("ar-SA")}`,
        columns,
        data: rows,
        fileName: `Purchase_Orders_${new Date().toISOString().split("T")[0]}.xlsx`,
      });

      toast.success("تم تصدير ملف الإكسيل بنجاح");
    } catch (e) {
      console.error("Export error:", e);
      toast.error("حدث خطأ أثناء تصدير الملف");
    } finally {
      setIsExporting(false);
    }
  };

  const orgName = orgSettings?.officialReportsName || orgSettings?.organizationName || "جمعية عمارة المساجد";

  return (
    <DashboardLayout>
      <div className="space-y-6 text-right font-sans" dir="rtl">
        {/* العنوان والإجراءات العلوية */}
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300">
                <ShoppingCart className="w-5 h-5" />
              </div>
              <h1 className="text-xl sm:text-2xl font-bold text-foreground">أوامر الشراء الداخلية</h1>
              <Badge variant="outline" className="text-sky-700 bg-sky-50 dark:bg-sky-950/40 border-sky-200 dark:border-sky-800 text-xs">
                برنامج سدانة
              </Badge>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">
              إدارة واستعراض وطباعة أوامر الشراء الصادرة لتأمين احتياجات المساجد والمشاريع
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportExcel}
              disabled={isExporting || orders.length === 0}
              className="h-9 gap-1.5 text-xs font-semibold"
            >
              {isExporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5 text-sky-600" />}
              تصدير Excel
            </Button>
          </div>
        </div>

        {/* بطاقات الإحصائيات العلوية الـ 5 الأنيقة */}
        <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
          {/* إجمالي أوامر الشراء */}
          <Card className="border border-border/80 shadow-2xs hover:shadow-xs transition-shadow">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-[11px] font-semibold text-muted-foreground">إجمالي أوامر الشراء</p>
                <p className="text-xl font-extrabold text-foreground mt-0.5">{stats.totalOrders}</p>
              </div>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-sky-50 dark:bg-sky-950/40 text-sky-600 border border-sky-100 dark:border-sky-900/50">
                <ShoppingCart className="w-5 h-5" />
              </div>
            </CardContent>
          </Card>

          {/* أوامر جاهزة ومعتمدة */}
          <Card className="border border-border/80 shadow-2xs hover:shadow-xs transition-shadow">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-[11px] font-semibold text-muted-foreground">معتمدة وجاهزة</p>
                <p className="text-xl font-extrabold text-sky-700 dark:text-sky-300 mt-0.5">{stats.approvedCount}</p>
              </div>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-sky-50 dark:bg-sky-950/40 text-sky-600 border border-sky-100 dark:border-sky-900/50">
                <CheckCircle className="w-5 h-5" />
              </div>
            </CardContent>
          </Card>

          {/* قيد الإعداد / مسودة */}
          <Card className="border border-border/80 shadow-2xs hover:shadow-xs transition-shadow">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-[11px] font-semibold text-muted-foreground">قيد الإعداد (مسودة)</p>
                <p className="text-xl font-extrabold text-amber-700 dark:text-amber-400 mt-0.5">{stats.draftCount}</p>
              </div>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-amber-50 dark:bg-amber-950/30 text-amber-600 border border-amber-100 dark:border-amber-900/50">
                <Clock className="w-5 h-5" />
              </div>
            </CardContent>
          </Card>

          {/* إجمالي الأصناف والبنود الموردة */}
          <Card className="border border-border/80 shadow-2xs hover:shadow-xs transition-shadow">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-[11px] font-semibold text-muted-foreground">إجمالي البنود المشمولة</p>
                <p className="text-xl font-extrabold text-foreground mt-0.5">{stats.totalItemsCount} <span className="text-xs font-normal text-muted-foreground">بند</span></p>
              </div>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                <Package className="w-5 h-5" />
              </div>
            </CardContent>
          </Card>

          {/* المساجد المستفيدة */}
          <Card className="col-span-2 sm:col-span-1 border border-border/80 shadow-2xs hover:shadow-xs transition-shadow">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-[11px] font-semibold text-muted-foreground">المساجد المستفيدة</p>
                <p className="text-xl font-extrabold text-foreground mt-0.5">{stats.totalMosquesCount} <span className="text-xs font-normal text-muted-foreground">مسجد</span></p>
              </div>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-sky-50 dark:bg-sky-950/40 text-sky-600 border border-sky-100 dark:border-sky-900/50">
                <Building2 className="w-5 h-5" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* شريط البحث والتصفية */}
        <Card className="border border-border/80 shadow-2xs">
          <CardContent className="p-3 sm:p-4">
            <div className="flex flex-col sm:flex-row items-center gap-3">
              <div className="relative flex-1 w-full">
                <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="البحث برقم أمر الشراء، اسم المسجد، المدينة، رقم الطلب، أو طالب الشراء..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="pr-9 h-9 text-xs"
                />
              </div>

              <div className="w-full sm:w-56">
                <Select
                  value={statusFilter}
                  onValueChange={(val) => {
                    setStatusFilter(val);
                    setCurrentPage(1);
                  }}
                >
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="تصفية حسب الحالة" />
                  </SelectTrigger>
                  <SelectContent dir="rtl">
                    <SelectItem value="all">كافة الحالات</SelectItem>
                    <SelectItem value="approved">معتمد وجاهز للطباعة</SelectItem>
                    <SelectItem value="draft">قيد الإعداد (مسودة)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* جدول أوامر الشراء الشامل */}
        <Card className="border border-border/80 shadow-2xs overflow-hidden">
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-12 flex flex-col items-center justify-center gap-3 text-center">
                <Loader2 className="w-8 h-8 animate-spin text-sky-600" />
                <p className="text-xs text-muted-foreground">جاري تحميل أوامر الشراء...</p>
              </div>
            ) : orders.length === 0 ? (
              <div className="p-12 flex flex-col items-center justify-center gap-2 text-center text-muted-foreground">
                <ShoppingCart className="w-10 h-10 text-muted-foreground/40 stroke-1" />
                <p className="text-sm font-bold text-foreground">لا توجد أوامر شراء مطابقة</p>
                <p className="text-xs max-w-sm">
                  {searchTerm || statusFilter !== "all"
                    ? "لم نجد نتائج تطابق خيارات البحث والتصفية المحددة."
                    : "لم يتم إصدار أي أوامر شراء بعد. يمكنك تجزئة وتأمين بنود الطلبات من صفحة تأمين الطلب والتعاقد."}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table className="text-xs text-right">
                  <TableHeader className="bg-muted/30">
                    <TableRow className="hover:bg-transparent border-b">
                      <th className="p-3 w-12 text-center font-bold">#</th>
                      <th className="p-3 font-bold">رقم أمر الشراء</th>
                      <th className="p-3 font-bold">الطلب والمسجد المستفيد</th>
                      <th className="p-3 font-bold text-center">تاريخ الأمر</th>
                      <th className="p-3 font-bold">الموجه إليه</th>
                      <th className="p-3 font-bold">طالب الشراء / الاعتماد</th>
                      <th className="p-3 font-bold text-center">البنود المشمولة</th>
                      <th className="p-3 font-bold text-center">الحالة</th>
                      <th className="p-3 font-bold text-center w-32">الإجراءات</th>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="divide-y divide-border">
                    {orders.map((order, idx) => {
                      const statusInfo = STATUS_MAP[order.status] || STATUS_MAP.approved;
                      return (
                        <TableRow key={order.id} className="hover:bg-muted/10 transition-colors">
                          <td className="p-3 text-center font-mono text-muted-foreground">
                            {(currentPage - 1) * limit + idx + 1}
                          </td>

                          {/* رقم أمر الشراء */}
                          <td className="p-3">
                            <span className="font-mono font-bold text-foreground bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded border border-border">
                              {order.orderNumber}
                            </span>
                          </td>

                          {/* الطلب والمسجد المستفيد */}
                          <td className="p-3">
                            <div className="space-y-0.5">
                              <Link href={`/requests/${order.requestId}`} className="font-bold text-foreground hover:text-sky-600 transition-colors flex items-center gap-1.5">
                                <span>جامع {order.mosqueName}</span>
                                <ExternalLink className="w-3 h-3 text-muted-foreground" />
                              </Link>
                              <p className="text-[11px] text-muted-foreground">
                                طلب #{order.requestNumber} {order.mosqueCity ? `• ${order.mosqueCity}` : ""}
                              </p>
                            </div>
                          </td>

                          {/* تاريخ الأمر */}
                          <td className="p-3 text-center font-mono text-muted-foreground">
                            {order.orderDate || "-"}
                          </td>

                          {/* الموجه إليه */}
                          <td className="p-3 font-medium text-foreground">
                            {order.directedTo}
                          </td>

                          {/* طالب الشراء والاعتماد */}
                          <td className="p-3">
                            <div className="text-[11px] space-y-0.5">
                              <p className="text-foreground font-semibold">{order.requesterName}</p>
                              <p className="text-muted-foreground">الاعتماد: {order.approverName}</p>
                            </div>
                          </td>

                          {/* البنود المشمولة */}
                          <td className="p-3 text-center">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setSelectedOrderForItems(order)}
                              className="h-7 text-xs font-bold gap-1 text-sky-700 dark:text-sky-300 hover:bg-sky-50 dark:hover:bg-sky-950/40 px-2"
                            >
                              <Package className="w-3.5 h-3.5" />
                              <span>{order.itemsCount} أصناف</span>
                            </Button>
                          </td>

                          {/* الحالة */}
                          <td className="p-3 text-center">
                            <Badge variant="outline" className={`text-[10px] font-bold px-2 py-0.5 ${statusInfo.className}`}>
                              {statusInfo.label}
                            </Badge>
                          </td>

                          {/* الإجراءات */}
                          <td className="p-3 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setSelectedOrderForPreview(order)}
                                className="h-7 text-xs font-bold gap-1 text-sky-700 hover:bg-sky-50 dark:text-sky-300 dark:hover:bg-sky-950/40 border-sky-200 dark:border-sky-800"
                                title="معاينة وطباعة أمر الشراء"
                              >
                                <Eye className="w-3.5 h-3.5" />
                                <span>معاينة</span>
                              </Button>

                              <Link href={`/requests/${order.requestId}/procurement`}>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                                  title="تعديل وتخصيص التأمين"
                                >
                                  <Edit className="w-3.5 h-3.5" />
                                </Button>
                              </Link>
                            </div>
                          </td>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}

            {/* عناصر التنقل بين الصفحات */}
            {totalPages > 1 && (
              <div className="p-3 border-t flex items-center justify-between gap-2 text-xs text-muted-foreground bg-muted/10">
                <span>إجمالي النتائج: {total} أمر شراء</span>
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    className="h-7 w-7 p-0"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                  <span className="px-2 font-bold text-foreground">
                    صفحة {currentPage} من {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                    className="h-7 w-7 p-0"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* نافذة عرض تفاصيل الأصناف المشمولة */}
        <Dialog open={!!selectedOrderForItems} onOpenChange={() => setSelectedOrderForItems(null)}>
          <DialogContent className="max-w-lg text-right font-sans" dir="rtl">
            <DialogHeader className="text-right sm:text-right pb-2 border-b">
              <DialogTitle className="text-base font-bold flex items-center gap-2 text-foreground">
                <Package className="w-5 h-5 text-sky-600" />
                أصناف أمر الشراء ({selectedOrderForItems?.orderNumber})
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground text-right sm:text-right">
                مسجد {selectedOrderForItems?.mosqueName} • طلب #{selectedOrderForItems?.requestNumber}
              </DialogDescription>
            </DialogHeader>

            <div className="py-2">
              <table className="w-full text-xs text-right border-collapse border border-border">
                <thead className="bg-muted/40 font-bold border-b border-border">
                  <tr>
                    <th className="p-2 w-10 text-center">#</th>
                    <th className="p-2">الصنف والبيان</th>
                    <th className="p-2">الوصف</th>
                    <th className="p-2 text-center w-20">الكمية</th>
                    <th className="p-2 text-center w-16">الوحدة</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {selectedOrderForItems?.items && selectedOrderForItems.items.length > 0 ? (
                    selectedOrderForItems.items.map((it: any, i: number) => (
                      <tr key={i} className="hover:bg-muted/20">
                        <td className="p-2 text-center font-mono text-muted-foreground">{i + 1}</td>
                        <td className="p-2 font-bold text-foreground">{it.itemName}</td>
                        <td className="p-2 text-muted-foreground">{it.description || "-"}</td>
                        <td className="p-2 text-center font-bold text-foreground">{it.quantity}</td>
                        <td className="p-2 text-center text-muted-foreground">{it.unit}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="p-4 text-center text-muted-foreground">لا توجد أصناف مسجلة</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </DialogContent>
        </Dialog>

        {/* نافذة المعاينة والطباعة الفورية الرسمية A4 */}
        <Dialog open={!!selectedOrderForPreview} onOpenChange={() => setSelectedOrderForPreview(null)}>
          <DialogContent className="max-w-4xl p-0 overflow-hidden bg-slate-100 dark:bg-slate-950 font-sans border-0" dir="rtl">
            <div className="p-3 bg-white dark:bg-slate-900 border-b flex items-center justify-between gap-2 sticky top-0 z-20">
              <div className="flex items-center gap-2">
                <ShoppingCart className="w-4 h-4 text-sky-600" />
                <span className="font-bold text-sm text-foreground">معاينة أمر الشراء الداخلي A4</span>
                <Badge variant="outline" className="text-xs font-mono">{selectedOrderForPreview?.orderNumber}</Badge>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  onClick={() => window.print()}
                  className="h-8 text-xs font-bold gap-1.5 bg-sky-600 hover:bg-sky-700 text-white shadow-xs cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  طباعة A4
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedOrderForPreview(null)}
                  className="h-8 text-xs font-semibold"
                >
                  إغلاق
                </Button>
              </div>
            </div>

            {/* ورقة A4 الرسمية الفاخرة */}
            <div className="p-4 sm:p-6 overflow-y-auto max-h-[80vh] flex justify-center">
              <div className="w-full max-w-[210mm] bg-white text-slate-900 shadow-xl p-6 sm:p-10 min-h-[297mm] flex flex-col justify-between border-[2px] border-[#0284c7] rounded-lg relative leading-relaxed">
                <div className="absolute inset-1 border border-[#38bdf8]/40 rounded pointer-events-none" />

                <div className="relative z-10 space-y-6 flex-1">
                  {/* ترويسة التقرير الرسمية */}
                  <div className="flex justify-between items-start border-b border-slate-300 pb-4">
                    <div className="flex items-center gap-3">
                      {orgSettings?.logoUrl ? (
                        <img src={orgSettings.logoUrl} alt="شعار الجمعية" className="h-16 w-auto object-contain" />
                      ) : (
                        <div className="w-14 h-14 bg-sky-50 border border-sky-200 rounded-lg flex items-center justify-center text-sky-700 font-bold text-lg">
                          سدانة
                        </div>
                      )}
                      <div>
                        <h3 className="font-bold text-base text-sky-900">{orgName}</h3>
                        <p className="text-xs text-slate-500">إدارة المشاريع والمشتريات • برنامج سدانة</p>
                      </div>
                    </div>

                    <div className="text-xs space-y-1 text-left font-mono">
                      <div><span className="text-slate-500">رقم الأمر: </span><strong>{selectedOrderForPreview?.orderNumber}</strong></div>
                      <div><span className="text-slate-500">التاريخ: </span><strong>{selectedOrderForPreview?.orderDate}</strong></div>
                      <div><span className="text-slate-500">رقم الطلب: </span><strong>#{selectedOrderForPreview?.requestNumber}</strong></div>
                    </div>
                  </div>

                  {/* عنوان النموذج */}
                  <div className="bg-[#0284c7] text-white font-bold text-center py-2 px-4 rounded text-sm sm:text-base shadow-2xs">
                    أمر شراء داخلي (نموذج طلب شراء)
                  </div>

                  {/* الموجه إليه والمسجد */}
                  <div className="bg-slate-50 border border-slate-200 p-2.5 rounded text-xs flex items-center justify-between">
                    <div>
                      <span className="text-slate-500">موجه إلى: </span>
                      <strong className="text-slate-900">{selectedOrderForPreview?.directedTo}</strong>
                    </div>
                    <div>
                      <span className="text-slate-500">المشروع / المسجد: </span>
                      <strong className="text-slate-900">{selectedOrderForPreview?.mosqueName} {selectedOrderForPreview?.mosqueCity ? `(${selectedOrderForPreview.mosqueCity})` : ""}</strong>
                    </div>
                  </div>

                  {/* جدول الأصناف */}
                  <div className="space-y-1">
                    <p className="text-[11px] font-bold text-slate-700">
                      نأمل تأمين الأصناف والبنود الموضحة أدناه لصالح المشروع المذكور:
                    </p>

                    <table className="w-full border-collapse border border-slate-300 text-xs text-right">
                      <thead className="bg-slate-100 text-slate-800 font-bold border-b border-slate-300">
                        <tr>
                          <th className="p-2 border-l border-slate-300 text-center w-12">م</th>
                          <th className="p-2 border-l border-slate-300 w-1/3">الصنف المطلوب</th>
                          <th className="p-2 border-l border-slate-300">الوصف والمواصفات</th>
                          <th className="p-2 border-l border-slate-300 text-center w-20">الكمية</th>
                          <th className="p-2 text-center w-20">الوحدة</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-300">
                        {selectedOrderForPreview?.items && selectedOrderForPreview.items.length > 0 ? (
                          selectedOrderForPreview.items.map((it: any, idx: number) => (
                            <tr key={idx} className="h-9">
                              <td className="p-2 border-l border-slate-300 text-center font-mono text-slate-600">{idx + 1}</td>
                              <td className="p-2 border-l border-slate-300 font-bold text-slate-900">{it.itemName}</td>
                              <td className="p-2 border-l border-slate-300 text-slate-700">{it.description || "-"}</td>
                              <td className="p-2 border-l border-slate-300 text-center font-bold text-slate-900">{it.quantity}</td>
                              <td className="p-2 text-center text-slate-700">{it.unit}</td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={5} className="p-6 text-center text-slate-500">لا توجد أصناف مسجلة</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* جدول التوقيعات المطابق لأمر الصرف */}
                  <div className="pt-6">
                    <table className="w-full border-collapse border border-slate-300 text-xs text-center">
                      <thead>
                        <tr className="bg-slate-100 border-b border-slate-300 font-bold text-slate-800">
                          <th className="p-2 border-l border-slate-300 w-1/4">الوظيفة</th>
                          <th className="p-2 border-l border-slate-300 w-1/4">الاسم</th>
                          <th className="p-2 border-l border-slate-300 w-1/4">التوقيع</th>
                          <th className="p-2 w-1/4">التاريخ</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="border-b border-slate-300 h-14">
                          <td className="p-2 border-l border-slate-300 font-bold text-slate-700">{selectedOrderForPreview?.requesterRole || "طالب الشراء"}</td>
                          <td className="p-2 border-l border-slate-300 font-bold text-slate-900">{selectedOrderForPreview?.requesterName}</td>
                          <td className="p-2 border-l border-slate-300">
                            <div className="h-7 border-b border-dashed border-gray-300 mx-auto w-24"></div>
                          </td>
                          <td className="p-2 text-slate-600 font-medium text-[11px]">{selectedOrderForPreview?.orderDate}</td>
                        </tr>
                        <tr className="h-14">
                          <td className="p-2 border-l border-slate-300 font-bold text-slate-700">{selectedOrderForPreview?.approverRole || "المدير التنفيذي"}</td>
                          <td className="p-2 border-l border-slate-300 font-bold text-slate-900">{selectedOrderForPreview?.approverName}</td>
                          <td className="p-2 border-l border-slate-300">
                            {selectedOrderForPreview?.approverSignatureUrl ? (
                              <img src={selectedOrderForPreview.approverSignatureUrl} alt="التوقيع" className="max-h-10 mx-auto object-contain" />
                            ) : (
                              <div className="h-7 border-b border-dashed border-gray-300 mx-auto w-24"></div>
                            )}
                          </td>
                          <td className="p-2 text-slate-600 font-medium text-[11px]">{selectedOrderForPreview?.orderDate}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="mt-8 pt-4 border-t border-slate-200 text-center text-slate-400 text-[10px] flex justify-between items-center px-1">
                  <span>{orgName} - سدانة</span>
                  <span>الرمز المرجعي: #{selectedOrderForPreview?.requestNumber} • صفحة 1 من 1</span>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
