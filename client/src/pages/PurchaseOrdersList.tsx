import { useState, useMemo, useEffect } from "react";
import { useLocation } from "wouter";
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
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const limit = 10;

  const [isExporting, setIsExporting] = useState(false);

  // Debounce للبحث
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setCurrentPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const utils = trpc.useUtils();



  // أمر الشراء المحدد لعرض قائمة بنوده بالتفصيل
  const [selectedOrderForItems, setSelectedOrderForItems] = useState<any | null>(null);

  // استعلام أوامر الشراء والإحصائيات
  const {
    data: ordersData,
    isLoading,
    refetch,
  } = trpc.procurement.listPurchaseOrders.useQuery({
    search: debouncedSearch || undefined,
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
      const allMatching = await utils.procurement.listPurchaseOrders.fetch({
        search: debouncedSearch || undefined,
        status: statusFilter !== "all" ? statusFilter : undefined,
        page: 1,
        limit: 10000,
      });
      const exportOrders = allMatching?.orders || orders;
      if (exportOrders.length === 0) {
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

      const rows = exportOrders.map((o) => [
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
        sheetName: "أوامر الشراء الداخلية",
        columns,
        rows,
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
                  placeholder="البحث برقم أمر الشراء، التسمية التوضيحية، رقم الطلب، المسجد، أو طالب الشراء..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                  }}
                  className="pr-9 pl-9 h-9 text-xs"
                />
                {searchTerm && (
                  <button
                    type="button"
                    onClick={() => setSearchTerm("")}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-0.5 rounded"
                    title="مسح البحث"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
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
                    <SelectItem value="executed">منفذ</SelectItem>
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
                      <th className="p-3 font-bold">الطلب</th>
                      <th className="p-3 font-bold text-center">البنود المشمولة</th>
                      <th className="p-3 font-bold text-center">الحالة</th>
                      <th className="p-3 font-bold text-center">تاريخ الأمر</th>
                      <th className="p-3 font-bold text-center w-24">الإجراءات</th>
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

                          {/* الطلب */}
                          <td className="p-3">
                            <div className="space-y-0.5">
                              <p className="font-bold text-foreground">
                                {order.descriptiveName || `#${order.requestNumber}`}
                              </p>
                              {order.descriptiveName && (
                                <p className="text-[11px] text-muted-foreground font-mono">
                                  #{order.requestNumber}
                                </p>
                              )}
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

                          {/* تاريخ الأمر */}
                          <td className="p-3 text-center font-mono text-muted-foreground">
                            {order.orderDate || "-"}
                          </td>

                          {/* الإجراءات */}
                          <td className="p-3 text-center">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => navigate(`/requests/${order.requestId}/purchase-order`)}
                              className="h-7 text-xs font-bold gap-1 text-sky-700 hover:bg-sky-50 dark:text-sky-300 dark:hover:bg-sky-950/40 border-sky-200 dark:border-sky-800 cursor-pointer"
                              title="معاينة وطباعة أمر الشراء"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>معاينة</span>
                            </Button>
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
      </div>
    </DashboardLayout>
  );
}
