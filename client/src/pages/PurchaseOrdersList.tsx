import { useState, useMemo, useEffect } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
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
  DialogFooter,
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
  Plus,
} from "lucide-react";
import { toast } from "sonner";
import { exportStyledExcel } from "@/lib/excelExportHelper";
import { useDocumentTitle } from "@/contexts/DocumentTitleContext";

const STATUS_MAP: Record<string, { label: string; className: string }> = {
  approved: {
    label: "معتمد",
    className: "border-emerald-300 text-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800",
  },
  ready: {
    label: "معتمد",
    className: "border-emerald-300 text-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800",
  },
  draft: {
    label: "مسودة",
    className: "border-amber-300 text-amber-800 bg-amber-50 dark:bg-amber-950/30 dark:text-amber-300 dark:border-amber-800",
  },
  executed: {
    label: "معتمد",
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

  // استعلام الطلبات المتاحة لإنشاء أمر شراء
  const { data: availableRequests = [] } = trpc.procurement.getAvailableRequestsForPO.useQuery();

  // أمر الشراء المحدد لعرض قائمة بنوده بالتفصيل
  const [selectedOrderForItems, setSelectedOrderForItems] = useState<any | null>(null);

  // حالات نافذة إضافة / تعديل أمر الشراء
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedRequestId, setSelectedRequestId] = useState<number | null>(null);
  const [orderNumber, setOrderNumber] = useState("");
  const [orderDate, setOrderDate] = useState(new Date().toISOString().split("T")[0]);
  const [directedTo, setDirectedTo] = useState("إلى إدارة المشتريات");
  const [requesterName, setRequesterName] = useState(user?.name || "طالب الشراء");
  const [requesterRole, setRequesterRole] = useState("طالب الشراء / إدارة المشاريع");
  const [approverName, setApproverName] = useState("المدير التنفيذي");
  const [approverRole, setApproverRole] = useState("المدير التنفيذي");
  const [orderNotes, setOrderNotes] = useState("");
  const [itemsQuantities, setItemsQuantities] = useState<Record<string, number>>({});
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);

  // Mutation: إنشاء أو تحديث أمر الشراء
  const createOrderMutation = trpc.procurement.createOrUpdatePurchaseOrder.useMutation({
    onSuccess: (res) => {
      toast.success(res.message);
      setIsCreateModalOpen(false);
      resetCreateForm();
      utils.procurement.listPurchaseOrders.invalidate();
      utils.procurement.getAvailableRequestsForPO.invalidate();
    },
    onError: (err) => {
      toast.error(err.message || "حدث خطأ أثناء حفظ أمر الشراء");
    },
  });

  // Mutation: اعتماد فوري لأمر الشراء
  const approveOrderMutation = trpc.procurement.approvePurchaseOrder.useMutation({
    onSuccess: (res) => {
      toast.success(res.message);
      utils.procurement.listPurchaseOrders.invalidate();
      utils.procurement.getAvailableRequestsForPO.invalidate();
    },
    onError: (err) => {
      toast.error(err.message || "حدث خطأ أثناء اعتماد أمر الشراء");
    },
  });

  const resetCreateForm = () => {
    setSelectedRequestId(null);
    setOrderNumber("");
    setOrderDate(new Date().toISOString().split("T")[0]);
    setDirectedTo("إلى إدارة المشتريات");
    setOrderNotes("");
    setItemsQuantities({});
    setSelectedItemIds([]);
  };

  const handleSelectRequest = (reqId: number) => {
    setSelectedRequestId(reqId);
    const req = availableRequests.find((r) => r.id === reqId);
    if (!req) return;

    setOrderNumber(req.activePO?.orderNumber || `PO-${req.id}-${new Date().getFullYear()}`);
    setOrderDate(req.activePO?.orderDate || new Date().toISOString().split("T")[0]);
    setDirectedTo(req.activePO?.directedTo || "إلى إدارة المشتريات");
    setRequesterName(req.activePO?.requesterName || user?.name || "طالب الشراء");
    setApproverName(req.activePO?.approverName || "المدير التنفيذي");
    setOrderNotes(req.activePO?.notes || "");

    const initialQtys: Record<string, number> = {};
    const allIds: string[] = [];
    
    // إذا كان هناك بنود مسجلة في activePO نأخذ كمياتها
    const existingPoItems = req.activePO?.items;
    if (existingPoItems && Array.isArray(existingPoItems) && existingPoItems.length > 0) {
      req.items.forEach((it: any) => {
        allIds.push(it.id);
        const match = existingPoItems.find((p: any) => p.id === it.id);
        initialQtys[it.id] = match ? Number(match.quantity) : Number(it.quantity || 1);
      });
    } else {
      req.items.forEach((it: any) => {
        allIds.push(it.id);
        initialQtys[it.id] = Number(it.quantity || 1);
      });
    }

    setItemsQuantities(initialQtys);
    setSelectedItemIds(allIds);
  };

  const handleSubmitOrder = (status: "approved" | "draft") => {
    if (!selectedRequestId) {
      toast.error("يرجى اختيار الطلب أولاً");
      return;
    }

    const currentReq = availableRequests.find((r) => r.id === selectedRequestId);
    if (!currentReq) return;

    const chosenItems = currentReq.items
      .filter((it: any) => selectedItemIds.includes(it.id))
      .map((it: any) => ({
        id: it.id,
        itemName: it.name || it.itemName,
        description: it.description || "",
        quantity: itemsQuantities[it.id] ?? it.quantity ?? 1,
        unit: it.unit || "وحدة",
      }));

    if (chosenItems.length === 0) {
      toast.error("يرجى تحديد بند واحد على الأقل وتحديد كميته");
      return;
    }

    createOrderMutation.mutate({
      requestId: selectedRequestId,
      orderNumber,
      orderDate,
      directedTo,
      requesterName,
      requesterRole,
      approverName,
      approverRole,
      notes: orderNotes,
      status,
      items: chosenItems,
    });
  };

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

          <div className="flex items-center gap-2 flex-wrap">
            <Button
              size="sm"
              onClick={() => {
                resetCreateForm();
                setIsCreateModalOpen(true);
              }}
              className="text-xs font-bold gap-1.5 bg-primary text-primary-foreground shadow-xs cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>إضافة أمر شراء جديد</span>
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

          {/* أوامر معتمدة */}
          <Card className="border border-border/80 shadow-2xs hover:shadow-xs transition-shadow">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-[11px] font-semibold text-muted-foreground">معتمدة</p>
                <p className="text-xl font-extrabold text-emerald-700 dark:text-emerald-300 mt-0.5">{stats.approvedCount}</p>
              </div>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 border border-emerald-100 dark:border-emerald-900/50">
                <CheckCircle className="w-5 h-5" />
              </div>
            </CardContent>
          </Card>

          {/* مسودة */}
          <Card className="border border-border/80 shadow-2xs hover:shadow-xs transition-shadow">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-[11px] font-semibold text-muted-foreground">مسودة</p>
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
                    <SelectItem value="approved">معتمد</SelectItem>
                    <SelectItem value="draft">مسودة</SelectItem>
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
                      <th className="p-3 font-bold text-center w-36">الإجراءات</th>
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
                            <div className="flex items-center justify-center gap-1.5">
                              {order.status === "draft" && (
                                <Button
                                  size="sm"
                                  onClick={() => {
                                    approveOrderMutation.mutate({ requestId: order.requestId });
                                  }}
                                  disabled={approveOrderMutation.isPending}
                                  className="h-7 text-xs font-bold gap-1 bg-emerald-700 hover:bg-emerald-800 text-white cursor-pointer px-2"
                                  title="اعتماد أمر الشراء فورياً"
                                >
                                  <CheckCircle className="w-3.5 h-3.5" />
                                  <span>اعتماد</span>
                                </Button>
                              )}
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => navigate(`/requests/${order.requestId}/purchase-order`)}
                                className="h-7 text-xs font-bold gap-1 text-sky-700 hover:bg-sky-50 dark:text-sky-300 dark:hover:bg-sky-950/40 border-sky-200 dark:border-sky-800 cursor-pointer px-2"
                                title="معاينة وطباعة أمر الشراء"
                              >
                                <Eye className="w-3.5 h-3.5" />
                                <span>معاينة</span>
                              </Button>
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

        {/* نافذة إضافة أمر شراء جديد وتحديد الطلب والبنود والكميات والاعتماد */}
        <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
          <DialogContent className="max-w-2xl text-right font-sans max-h-[88vh] overflow-y-auto" dir="rtl">
            <DialogHeader className="text-right sm:text-right pb-3 border-b">
              <DialogTitle className="text-base font-bold flex items-center gap-2 text-foreground">
                <ShoppingCart className="w-5 h-5 text-sky-600" />
                <span>إضافة وتوثيق أمر شراء جديد</span>
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground text-right sm:text-right">
                اختر الطلب وحدد البنود والكمية المطلوبة لكل بند مع إمكانية الاعتماد الفوري
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2 text-xs">
              {/* خطوة 1: اختيار الطلب */}
              <div>
                <Label className="text-xs font-bold text-foreground mb-1 block">
                  1. اختر الطلب المراد إصدار أمر شراء له:
                </Label>
                <Select
                  value={selectedRequestId ? String(selectedRequestId) : ""}
                  onValueChange={(val) => handleSelectRequest(Number(val))}
                >
                  <SelectTrigger className="h-9 text-xs bg-background">
                    <SelectValue placeholder="اختر الطلب من القائمة..." />
                  </SelectTrigger>
                  <SelectContent dir="rtl" className="max-h-[300px]">
                    {availableRequests.map((r) => (
                      <SelectItem key={r.id} value={String(r.id)} className="text-xs">
                        <div className="flex items-center gap-2">
                          <span className="font-bold font-mono">#{r.requestNumber}</span>
                          <span>- {r.mosqueName}</span>
                          {r.descriptiveName && <span className="text-muted-foreground truncate max-w-[150px]">({r.descriptiveName})</span>}
                          <Badge variant="outline" className="text-[10px] mr-auto">
                            {r.items.length} أصناف
                          </Badge>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedRequestId && (
                <>
                  {/* خطوة 2: جدول تحديد البنود والكميات */}
                  <div className="space-y-2 border rounded-xl p-3 bg-muted/20">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                        <Package className="w-4 h-4 text-sky-600" />
                        <span>2. تحديد البنود والكميات المطلوبة لكل بند:</span>
                      </Label>
                      <div className="flex items-center gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            const req = availableRequests.find((r) => r.id === selectedRequestId);
                            if (req) setSelectedItemIds(req.items.map((it: any) => it.id));
                          }}
                          className="h-6 text-[10px] text-sky-700 hover:bg-sky-50 px-1.5"
                        >
                          تحديد الكل
                        </Button>
                        <span className="text-muted-foreground">•</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedItemIds([])}
                          className="h-6 text-[10px] text-muted-foreground hover:bg-muted px-1.5"
                        >
                          إلغاء التحديد
                        </Button>
                      </div>
                    </div>

                    {(() => {
                      const req = availableRequests.find((r) => r.id === selectedRequestId);
                      const items = req?.items || [];
                      if (items.length === 0) {
                        return (
                          <div className="p-4 text-center text-muted-foreground bg-background rounded border">
                            لا توجد بنود مسجلة لهذا الطلب.
                          </div>
                        );
                      }

                      return (
                        <div className="border rounded-lg overflow-hidden bg-background">
                          <table className="w-full text-xs text-right divide-y divide-border">
                            <thead className="bg-muted/40 font-bold">
                              <tr>
                                <th className="p-2 w-10 text-center">تضمين</th>
                                <th className="p-2">الصنف والبيان</th>
                                <th className="p-2 text-center w-28">الكمية المطلوبة</th>
                                <th className="p-2 text-center w-16">الوحدة</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                              {items.map((it: any) => {
                                const isChecked = selectedItemIds.includes(it.id);
                                return (
                                  <tr key={it.id} className={isChecked ? "bg-sky-50/30 dark:bg-sky-950/20" : "opacity-60"}>
                                    <td className="p-2 text-center">
                                      <Checkbox
                                        checked={isChecked}
                                        onCheckedChange={(checked) => {
                                          if (checked) {
                                            setSelectedItemIds((prev) => [...prev, it.id]);
                                          } else {
                                            setSelectedItemIds((prev) => prev.filter((id) => id !== it.id));
                                          }
                                        }}
                                      />
                                    </td>
                                    <td className="p-2">
                                      <div className="font-bold text-foreground">{it.name}</div>
                                      {it.description && (
                                        <div className="text-[10px] text-muted-foreground">{it.description}</div>
                                      )}
                                    </td>
                                    <td className="p-2 text-center">
                                      <Input
                                        type="number"
                                        min="0.01"
                                        step="any"
                                        disabled={!isChecked}
                                        value={itemsQuantities[it.id] ?? it.quantity ?? 1}
                                        onChange={(e) => {
                                          const val = parseFloat(e.target.value) || 0;
                                          setItemsQuantities((prev) => ({
                                            ...prev,
                                            [it.id]: val,
                                          }));
                                        }}
                                        className="h-7 text-xs text-center font-mono w-24 mx-auto"
                                      />
                                    </td>
                                    <td className="p-2 text-center text-muted-foreground font-mono">
                                      {it.unit || "وحدة"}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      );
                    })()}
                  </div>

                  {/* خطوة 3: بيانات التوجيه والاعتماد */}
                  <div className="space-y-2 border rounded-xl p-3 bg-muted/20">
                    <Label className="text-xs font-bold text-foreground block">
                      3. بيانات وتوجيه أمر الشراء:
                    </Label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div>
                        <Label className="text-[11px] text-muted-foreground">رقم أمر الشراء</Label>
                        <Input
                          value={orderNumber}
                          onChange={(e) => setOrderNumber(e.target.value)}
                          placeholder="PO-..."
                          className="h-8 text-xs font-mono mt-1 bg-background"
                        />
                      </div>
                      <div>
                        <Label className="text-[11px] text-muted-foreground">تاريخ أمر الشراء</Label>
                        <Input
                          type="date"
                          value={orderDate}
                          onChange={(e) => setOrderDate(e.target.value)}
                          className="h-8 text-xs mt-1 bg-background"
                        />
                      </div>
                      <div>
                        <Label className="text-[11px] text-muted-foreground">الموجه إليه (إدارة المشتريات / المورد)</Label>
                        <Input
                          value={directedTo}
                          onChange={(e) => setDirectedTo(e.target.value)}
                          placeholder="إلى إدارة المشتريات..."
                          className="h-8 text-xs mt-1 bg-background"
                        />
                      </div>
                      <div>
                        <Label className="text-[11px] text-muted-foreground">طالب الشراء</Label>
                        <Input
                          value={requesterName}
                          onChange={(e) => setRequesterName(e.target.value)}
                          placeholder="اسم طالب الشراء..."
                          className="h-8 text-xs mt-1 bg-background"
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <Label className="text-[11px] text-muted-foreground">اسم المعتمِد</Label>
                        <Input
                          value={approverName}
                          onChange={(e) => setApproverName(e.target.value)}
                          placeholder="المدير التنفيذي..."
                          className="h-8 text-xs mt-1 bg-background"
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <Label className="text-[11px] text-muted-foreground">ملاحظات أمر الشراء</Label>
                        <Textarea
                          value={orderNotes}
                          onChange={(e) => setOrderNotes(e.target.value)}
                          placeholder="أي شروط أو ملاحظات خاصة بالتوريد والتسليم..."
                          className="text-xs mt-1 bg-background"
                          rows={2}
                        />
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>

            <DialogFooter className="gap-2 pt-2 border-t flex flex-row items-center justify-between sm:justify-between">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsCreateModalOpen(false)}
                className="text-xs cursor-pointer"
              >
                إلغاء
              </Button>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={!selectedRequestId || createOrderMutation.isPending}
                  onClick={() => handleSubmitOrder("draft")}
                  className="text-xs font-bold cursor-pointer"
                >
                  {createOrderMutation.isPending ? "جاري الحفظ..." : "حفظ كمسودة"}
                </Button>
                <Button
                  size="sm"
                  disabled={!selectedRequestId || createOrderMutation.isPending}
                  onClick={() => handleSubmitOrder("approved")}
                  className="text-xs font-bold gap-1 bg-emerald-700 hover:bg-emerald-800 text-white cursor-pointer"
                >
                  <CheckCircle className="w-3.5 h-3.5" />
                  <span>{createOrderMutation.isPending ? "جاري الحفظ..." : "حفظ واعتماد أمر الشراء"}</span>
                </Button>
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
