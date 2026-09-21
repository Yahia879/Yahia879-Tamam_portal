import React, { useState, useMemo } from "react";
import { useParams, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  Boxes,
  ArrowRight,
  Plus,
  Truck,
  CheckCircle2,
  Clock,
  Printer,
  Calendar,
  FileText,
  UserCheck,
  Building2,
  Package,
  Layers,
  Star,
  AlertCircle,
  Loader2,
  Send,
  History,
  ShieldCheck,
  Check,
  Coins,
  AlertTriangle,
  Store,
  CalendarDays,
  BadgeCheck,
  Info,
} from "lucide-react";
import { toast } from "sonner";
import { useDocumentTitle } from "@/contexts/DocumentTitleContext";

export default function SedanaExecutionPage() {
  const params = useParams<{ id?: string }>();
  const [, setLocation] = useLocation();
  const { user } = useAuth();

  // جلب قائمة كافة طلبات سدانة لاختيار الطلب
  const { data: sedanaRequests = [], isLoading: isRequestsLoading } = trpc.sedanaExecution.listSedanaRequests.useQuery();

  const activeRequestId = useMemo(() => {
    const fromParam = parseInt(params.id || "0");
    if (fromParam > 0) return fromParam;
    if (sedanaRequests.length > 0) return sedanaRequests[0].id;
    return 0;
  }, [params.id, sedanaRequests]);

  const requestId = activeRequestId;

  useDocumentTitle(requestId > 0 ? `المستودع الافتراضي #${requestId} - سدانة` : "المستودع الافتراضي - سدانة");

  const utils = trpc.useUtils();

  // جلب بيانات المستودع الافتراضي والتنفيذ للطلب المحدد
  const {
    data,
    isLoading,
    refetch,
  } = trpc.sedanaExecution.getVirtualInventory.useQuery(
    { requestId },
    { enabled: requestId > 0 }
  );

  // جلب سجل تنقلات الإمام والذاكرة المؤسسية للمسجد
  const { data: imamHistoryData } = trpc.sedanaExecution.getImamInstitutionalHistory.useQuery(
    {
      userId: user?.id,
      mosqueId: data?.mosque?.id,
    },
    { enabled: !!data?.mosque?.id }
  );

  // حالات Modals
  const [isOutboundModalOpen, setIsOutboundModalOpen] = useState(false);
  const [isDeliveryModalOpen, setIsDeliveryModalOpen] = useState(false);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);

  const [outboundItems, setOutboundItems] = useState<Record<string, number>>({});
  const [outboundDate, setOutboundDate] = useState(new Date().toISOString().split("T")[0]);
  const [outboundPeriod, setOutboundPeriod] = useState("الدفعة الربع سنوية الأولى (Q1)");
  const [outboundNotes, setOutboundNotes] = useState("");

  const [deliverySelectedOutbound, setDeliverySelectedOutbound] = useState<any | null>(null);
  const [deliveryRecipientName, setDeliveryRecipientName] = useState("");
  const [deliveryRecipientRole, setDeliveryRecipientRole] = useState("إمام المسجد");
  const [deliveryRecipientPhone, setDeliveryRecipientPhone] = useState("");
  const [deliveryScheduledDate, setDeliveryScheduledDate] = useState(new Date().toISOString().split("T")[0]);

  // تأكيد الاستلام الرقمي
  const [selectedDeliveryToConfirm, setSelectedDeliveryToConfirm] = useState<any | null>(null);
  const [confirmSignatureName, setConfirmSignatureName] = useState("");
  const [confirmRating, setConfirmRating] = useState(5);
  const [confirmNotes, setConfirmNotes] = useState("");

  // تأكيد استلام أمر الإخراج من قبل الإمام
  const [selectedOutboundToConfirm, setSelectedOutboundToConfirm] = useState<any | null>(null);
  const [isConfirmOutboundModalOpen, setIsConfirmOutboundModalOpen] = useState(false);
  const [confirmOutboundRecipientName, setConfirmOutboundRecipientName] = useState("");
  const [confirmOutboundRating, setConfirmOutboundRating] = useState(5);
  const [confirmOutboundNotes, setConfirmOutboundNotes] = useState("");
  const [confirmOutboundDate, setConfirmOutboundDate] = useState(new Date().toISOString().split("T")[0]);

  // عرض تفاصيل استلام أمر الإخراج المكتمل
  const [selectedOutboundToView, setSelectedOutboundToView] = useState<any | null>(null);
  const [isViewOutboundModalOpen, setIsViewOutboundModalOpen] = useState(false);

  // الطفرات
  const createInwardMutation = trpc.sedanaExecution.createInwardOrder.useMutation({
    onSuccess: () => {
      toast.success("تم تسجيل أمر الإدخال في المستودع الافتراضي وتوثيق المستند المرجعي بنجاح");
      utils.sedanaExecution.getVirtualInventory.invalidate({ requestId });
    },
    onError: (err) => toast.error(err.message || "حدث خطأ أثناء حفظ أمر الإدخال"),
  });

  const createOutboundMutation = trpc.sedanaExecution.createOutboundOrder.useMutation({
    onSuccess: () => {
      toast.success("تم إنشاء أمر الإخراج المجدول وإصدار مسوغ الصرف بنجاح");
      setIsOutboundModalOpen(false);
      setOutboundItems({});
      utils.sedanaExecution.getVirtualInventory.invalidate({ requestId });
    },
    onError: (err) => toast.error(err.message || "حدث خطأ أثناء جدولة أمر الإخراج"),
  });

  const createDeliveryMutation = trpc.sedanaExecution.createDeliveryOrder.useMutation({
    onSuccess: () => {
      toast.success("تم إصدار أمر التسليم الميداني بنجاح");
      setIsDeliveryModalOpen(false);
      setDeliverySelectedOutbound(null);
      utils.sedanaExecution.getVirtualInventory.invalidate({ requestId });
    },
    onError: (err) => toast.error(err.message || "حدث خطأ أثناء إصدار أمر التسليم"),
  });

  const confirmReceiptMutation = trpc.sedanaExecution.confirmDeliveryReceipt.useMutation({
    onSuccess: (res) => {
      toast.success(res.message || "تم تأكيد الاستلام بنجاح وإغلاق العهدة الرقمية");
      setIsConfirmModalOpen(false);
      setSelectedDeliveryToConfirm(null);
      utils.sedanaExecution.getVirtualInventory.invalidate({ requestId });
      utils.requests.getById.invalidate({ id: requestId });
    },
    onError: (err) => toast.error(err.message || "حدث خطأ أثناء تأكيد الاستلام"),
  });

  const confirmOutboundMutation = trpc.sedanaExecution.confirmOutboundReceipt.useMutation({
    onSuccess: (res) => {
      toast.success(res.message || "تم اعتماد وتأكيد استلام أمر الإخراج بنجاح");
      setIsConfirmOutboundModalOpen(false);
      setSelectedOutboundToConfirm(null);
      utils.sedanaExecution.getVirtualInventory.invalidate({ requestId });
      utils.requests.getById.invalidate({ id: requestId });
    },
    onError: (err) => toast.error(err.message || "حدث خطأ أثناء اعتماد وتأكيد أمر الإخراج"),
  });

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="p-12 flex flex-col items-center justify-center gap-3 text-center" dir="rtl">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">جاري تحميل بيانات المستودع الافتراضي والتنفيذ...</p>
        </div>
      </DashboardLayout>
    );
  }

  const req = data?.request;
  const mosque = data?.mosque;
  const inventoryItems = data?.inventoryItems || [];
  const availableReferences = (data as any)?.availableReferences || [];
  const inwardOrders = data?.inwardOrders || [];
  const outboundOrders = data?.outboundOrders || [];
  const deliveryOrders = data?.deliveryOrders || [];

  // إحصائيات سريعة
  const totalApproved = inventoryItems.reduce((s, i) => s + i.approvedQty, 0);
  const totalInward = inventoryItems.reduce((s, i) => s + i.totalInward, 0);
  const totalAvailableStock = inventoryItems.reduce((s, i) => s + i.availableStock, 0);
  const totalDelivered = inventoryItems.reduce((s, i) => s + i.totalDelivered, 0);

  // تهيئة سريعة لإدخال كامل الكميات
  const handleQuickInwardAll = () => {
    const itemsToInward = inventoryItems
      .filter((i) => i.pendingInward > 0)
      .map((i) => ({
        id: i.id,
        itemName: i.name,
        quantity: i.pendingInward,
        unit: i.unit,
      }));

    if (itemsToInward.length === 0) {
      toast.info("كافة الكميات المعتمدة مدخلة بالفعل في المستودع الافتراضي");
      return;
    }

    const firstRef = availableReferences[0];
    if (firstRef && firstRef.canCreateInward === false) {
      toast.error(firstRef.blockedReason || "لا يمكن إدخال الكميات حتى يتم تنفيذ أمر الصرف المرتبط أولاً وتحول حالته إلى 'منفّذ'");
      return;
    }

    createInwardMutation.mutate({
      requestId,
      receivedBy: user?.name || "أمين المستودع",
      referenceType: firstRef?.type || "purchase_order",
      referenceNumber: firstRef?.documentNumber || `PO-${requestId}`,
      supplierName: firstRef?.partnerOrSupplier || "",
      notes: "إدخال كامل الكميات المعتمدة وفق أمر الشراء والتوريد",
      items: itemsToInward,
    });
  };

  // فتح نافذة أمر إخراج جديد
  const handleOpenOutboundModal = () => {
    const defaultQtys: Record<string, number> = {};
    inventoryItems.forEach((i) => {
      // اقتراح ربع الكمية المعتمدة لكل دفعة ربع سنوية
      defaultQtys[i.id] = Math.max(1, Math.round((i.approvedQty / 4) * 10) / 10);
    });
    setOutboundItems(defaultQtys);
    setIsOutboundModalOpen(true);
  };

  // فتح نافذة تحويل أمر إخراج إلى أمر تسليم
  const handleOpenDeliveryModalFromOutbound = (outbound: any) => {
    setDeliverySelectedOutbound(outbound);
    setDeliveryRecipientName(mosque?.imamName || "");
    setDeliveryRecipientPhone(mosque?.imamPhone || "");
    setDeliveryScheduledDate(outbound.scheduledDate || new Date().toISOString().split("T")[0]);
    setIsDeliveryModalOpen(true);
  };

  // فتح نافذة تأكيد الاستلام الرقمي
  const handleOpenConfirmModal = (delivery: any) => {
    setSelectedDeliveryToConfirm(delivery);
    setConfirmSignatureName(user?.name || delivery.recipientName || "");
    setConfirmRating(5);
    setConfirmNotes("");
    setIsConfirmModalOpen(true);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 text-right font-sans" dir="rtl">
        {/* الترويسة العلوية مع شريط اختيار طلب سدانة */}
        <div className="flex flex-col gap-4 border-b pb-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setLocation(requestId > 0 ? `/requests/${requestId}` : "/requests")}
                  className="h-8 px-2 text-xs font-semibold gap-1 text-muted-foreground hover:text-foreground"
                >
                  <ArrowRight className="w-4 h-4" />
                  <span>العودة للطلب</span>
                </Button>
                <div className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300">
                  <Boxes className="w-5 h-5" />
                </div>
                <h1 className="text-xl sm:text-2xl font-bold text-foreground">
                  المستودع الافتراضي والتنفيذ المجدول
                </h1>
                <Badge variant="outline" className="text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-xs">
                  برنامج سدانة
                </Badge>
              </div>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                إدارة إدخال البنود الموردة، جدولة أوامر الإخراج ومسوغات الصرف، وإصدار أوامر التسليم الميداني لمسجد <span className="font-bold text-foreground">{mosque?.name || "المسجد"}</span> {req?.requestNumber ? `(#${req.requestNumber})` : ""}
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {requestId > 0 && (
                <>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setLocation(`/requests/${requestId}/procurement`)}
                    className="text-xs font-semibold"
                  >
                    تأمين الطلب والتعاقد
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => setLocation(`/requests/${requestId}/sedana-delivery`)}
                    className="text-xs font-bold gap-1 bg-emerald-700 hover:bg-emerald-800 text-white"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    نموذج أمر التسليم (A4)
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* شريط اختيار طلب سدانة */}
          <div className="bg-muted/40 p-3 rounded-xl border border-border/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Label className="text-xs font-bold whitespace-nowrap text-foreground flex items-center gap-1.5">
                <Building2 className="w-4 h-4 text-emerald-600" />
                <span>اختر طلب سدانة لعرض مستودعه:</span>
              </Label>
              <Select
                value={String(requestId)}
                onValueChange={(val) => setLocation(`/requests/${val}/sedana-execution`)}
              >
                <SelectTrigger className="h-9 w-full sm:w-[320px] text-xs font-semibold bg-background">
                  <SelectValue placeholder="اختر طلب سدانة..." />
                </SelectTrigger>
                <SelectContent dir="rtl" className="max-h-[320px]">
                  {sedanaRequests.map((r) => (
                    <SelectItem key={r.id} value={String(r.id)} className="text-xs">
                      <div className="flex items-center justify-between gap-2 w-full">
                        <span className="font-bold">
                          #{r.requestNumber} - {r.mosqueName}
                        </span>
                        {r.descriptiveName && (
                          <span className="text-[11px] text-muted-foreground truncate max-w-[120px]">
                            ({r.descriptiveName})
                          </span>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {req && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground mr-auto sm:mr-0">
                <span>المدينة: <strong className="text-foreground">{mosque?.city || "-"}</strong></span>
                <span>•</span>
                <span>المرحلة: <Badge variant="outline" className="text-[10px]">{req.currentStage}</Badge></span>
              </div>
            )}
          </div>
        </div>

        {/* بطاقات الإحصائيات الـ 4 السريعة */}
        <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
          <Card className="border border-border/80 shadow-2xs">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-[11px] font-semibold text-muted-foreground">إجمالي البنود المعتمدة</p>
                <p className="text-xl font-extrabold text-foreground mt-0.5">{totalApproved} <span className="text-xs font-normal text-muted-foreground">وحدة</span></p>
              </div>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                <Package className="w-5 h-5" />
              </div>
            </CardContent>
          </Card>

          <Card className="border border-border/80 shadow-2xs">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-[11px] font-semibold text-muted-foreground">الرصيد المتاح بالمستودع الافتراضي</p>
                <p className="text-xl font-extrabold text-emerald-700 dark:text-emerald-400 mt-0.5">{totalAvailableStock} <span className="text-xs font-normal text-muted-foreground">وحدة</span></p>
              </div>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600">
                <Boxes className="w-5 h-5" />
              </div>
            </CardContent>
          </Card>

          <Card className="border border-border/80 shadow-2xs">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-[11px] font-semibold text-muted-foreground">أوامر الإخراج ومسوغات الصرف</p>
                <p className="text-xl font-extrabold text-sky-700 dark:text-sky-400 mt-0.5">{outboundOrders.length} <span className="text-xs font-normal text-muted-foreground">أمر مجدول</span></p>
              </div>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-sky-50 dark:bg-sky-950/40 text-sky-600">
                <Layers className="w-5 h-5" />
              </div>
            </CardContent>
          </Card>

          <Card className="border border-border/80 shadow-2xs">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-[11px] font-semibold text-muted-foreground">أوامر التسليم المؤكدة</p>
                <p className="text-xl font-extrabold text-purple-700 dark:text-purple-400 mt-0.5">{deliveryOrders.filter((d: any) => d.status === "confirmed").length} / {deliveryOrders.length}</p>
              </div>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-purple-50 dark:bg-purple-950/40 text-purple-600">
                <CheckCircle2 className="w-5 h-5" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* التبويبات الرئيسية */}
        <Tabs defaultValue="stock" dir="rtl" className="space-y-4">
          <TabsList dir="rtl" className="bg-muted/40 p-1 rounded-xl w-full justify-start overflow-x-auto flex-nowrap">
            <TabsTrigger value="stock" className="text-xs font-bold gap-1.5">
              <Boxes className="w-3.5 h-3.5" />
              <span>رصيد المستودع الافتراضي</span>
              <span className="bg-muted px-1.5 py-0.2 rounded-full text-[10px]">{inventoryItems.length}</span>
            </TabsTrigger>
            <TabsTrigger value="outbound" className="text-xs font-bold gap-1.5">
              <Layers className="w-3.5 h-3.5" />
              <span>أوامر الإخراج ومسوغات الصرف</span>
              <span className="bg-muted px-1.5 py-0.2 rounded-full text-[10px]">{outboundOrders.length}</span>
            </TabsTrigger>
            <TabsTrigger value="deliveries" className="text-xs font-bold gap-1.5">
              <Truck className="w-3.5 h-3.5" />
              <span>أوامر التسليم وإثبات الاستلام</span>
              <span className="bg-muted px-1.5 py-0.2 rounded-full text-[10px]">{deliveryOrders.length}</span>
            </TabsTrigger>
            <TabsTrigger value="history" className="text-xs font-bold gap-1.5">
              <History className="w-3.5 h-3.5" />
              <span>سجل تنقلات الإمام والذاكرة المؤسسية</span>
            </TabsTrigger>
          </TabsList>

          {/* التبويب 1: رصيد المستودع الافتراضي */}
          <TabsContent value="stock" dir="rtl" className="space-y-4">
            <Card className="border border-border/80 shadow-2xs">
              <CardHeader className="p-4 border-b flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-bold text-foreground">
                    أرصدة البنود والمواد في المستودع الافتراضي للمسجد
                  </CardTitle>
                  <CardDescription className="text-xs mt-0.5">
                    متابعة كميات البنود المعتمدة، ما تم توريده وإدخاله، الرصيد المتاح، وما تم تسليمه للإمام
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleQuickInwardAll}
                    disabled={createInwardMutation.isPending}
                    className="text-xs font-semibold gap-1 text-emerald-700 dark:text-emerald-300 border-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>إدخال كافة الكميات المتبقية</span>
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => {
                      setLocation(requestId > 0 ? `/requests/${requestId}/sedana-inward/new` : "/sedana-warehouse/inward/new");
                    }}
                    className="text-xs font-bold gap-1 bg-primary hover:bg-primary/90 text-primary-foreground cursor-pointer shadow-xs"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>أمر إدخال جديد</span>
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto" dir="rtl">
                  <Table className="text-xs text-right" dir="rtl">
                    <TableHeader className="bg-muted/30">
                      <TableRow className="border-b">
                        <th className="p-3 w-10 text-center font-bold">#</th>
                        <th className="p-3 font-bold">الصنف</th>
                        <th className="p-3 font-bold text-center">طريقة التأمين</th>
                        <th className="p-3 font-bold text-center">الكمية المعتمدة</th>
                        <th className="p-3 font-bold text-center text-emerald-700">المدخل بالمستودع</th>
                        <th className="p-3 font-bold text-center text-sky-700">المصروف / المجدول</th>
                        <th className="p-3 font-bold text-center text-indigo-700">المتاح للصرف</th>
                        <th className="p-3 font-bold text-center text-purple-700">المستلم نهائياً</th>
                      </TableRow>
                    </TableHeader>
                    <TableBody className="divide-y divide-border">
                      {inventoryItems.map((it, idx) => (
                        <TableRow key={it.id} className="hover:bg-muted/10">
                          <td className="p-3 text-center font-mono text-muted-foreground">{idx + 1}</td>
                          <td className="p-3">
                            <div className="font-bold text-foreground">{it.name}</div>
                            {it.description && (
                              <div className="text-[10px] text-muted-foreground mt-0.5">{it.description}</div>
                            )}
                          </td>
                          <td className="p-3 text-center">
                            <Badge variant="outline" className="text-[10px]">
                              {it.allocationMethod === "purchase_order" && "أمر شراء داخلي"}
                              {it.allocationMethod === "csr_letter" && "مسؤولية مجتمعية"}
                              {it.allocationMethod === "supplier_contract" && "عقد مورد"}
                              {it.allocationMethod === "direct_purchase" && "شراء مباشر"}
                              {it.allocationMethod === "in_kind_donation" && "تبرع عيني"}
                            </Badge>
                          </td>
                          <td className="p-3 text-center font-bold font-mono">
                            {it.approvedQty} <span className="text-[10px] font-normal text-muted-foreground">{it.unit}</span>
                          </td>
                          <td className="p-3 text-center font-bold font-mono text-emerald-700 dark:text-emerald-400">
                            {it.totalInward} <span className="text-[10px] font-normal">{it.unit}</span>
                          </td>
                          <td className="p-3 text-center font-bold font-mono text-sky-700 dark:text-sky-400">
                            {it.totalOutbound} <span className="text-[10px] font-normal">{it.unit}</span>
                          </td>
                          <td className="p-3 text-center font-bold font-mono text-indigo-700 dark:text-indigo-400">
                            {it.availableStock} <span className="text-[10px] font-normal">{it.unit}</span>
                          </td>
                          <td className="p-3 text-center font-bold font-mono text-purple-700 dark:text-purple-400">
                            {it.totalDelivered} <span className="text-[10px] font-normal">{it.unit}</span>
                          </td>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>

            {/* سجل أوامر الإدخال السابقة والمستندات المرجعية */}
            {inwardOrders.length > 0 && (
              <Card className="border border-border/80 shadow-2xs">
                <CardHeader className="p-4 border-b">
                  <CardTitle className="text-xs font-bold text-foreground">
                    سجل أوامر الإدخال المستودعي والمستندات المرجعية المرتبطة ({inwardOrders.length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="divide-y divide-border">
                    {inwardOrders.map((inOrder: any) => (
                      <div key={inOrder.id} className="p-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono font-bold bg-muted px-2 py-0.5 rounded">
                              {inOrder.orderNumber}
                            </span>
                            {inOrder.referenceNumber && (
                              <Badge variant="outline" className="font-mono text-[10px] bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800">
                                {inOrder.referenceType === "purchase_order" && "أمر شراء: "}
                                {inOrder.referenceType === "csr_letter" && "خطاب CSR: "}
                                {inOrder.referenceType === "supplier_contract" && "عقد: "}
                                {inOrder.referenceType === "direct_purchase" && "شراء مباشر: "}
                                {inOrder.referenceType === "in_kind_donation" && "تبرع عيني: "}
                                {inOrder.referenceNumber}
                              </Badge>
                            )}
                            {inOrder.supplierInvoiceNumber && (
                              <Badge variant="outline" className="font-mono text-[10px] bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700">
                                فاتورة: #{inOrder.supplierInvoiceNumber}
                              </Badge>
                            )}
                            {inOrder.supplierName && (
                              <span className="text-muted-foreground text-[11px]">
                                ({inOrder.supplierName})
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-muted-foreground flex items-center gap-3">
                            <span>بتاريخ {inOrder.orderDate}</span>
                            <span>•</span>
                            <span>المستلم: {inOrder.receivedBy}</span>
                          </div>
                          {inOrder.notes && <p className="text-[11px] text-muted-foreground mt-0.5">{inOrder.notes}</p>}
                        </div>
                        <div className="text-left font-mono font-bold text-emerald-700 shrink-0">
                          {inOrder.items?.length || 0} أصناف مدخلة
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* التبويب 2: أوامر الإخراج ومسوغات الصرف */}
          <TabsContent value="outbound" dir="rtl" className="space-y-4">
            <Card className="border border-border/80 shadow-2xs">
              <CardHeader className="p-4 border-b flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-bold text-foreground">
                    أوامر الإخراج المجدولة ومسوغات الصرف المحاسبية
                  </CardTitle>
                  <CardDescription className="text-xs mt-0.5">
                    وفقاً لوثيقة سدانة، يمثل أمر الإخراج مسوغ صرف محاسبي رسمي لخروج المواد من المستودع الافتراضي
                  </CardDescription>
                </div>
                <Button
                  size="sm"
                  onClick={() => setLocation(`/requests/${requestId}/sedana-outbound/new`)}
                  className="text-xs font-bold gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90 shadow-2xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>إنشاء أمر إخراج جديد</span>
                </Button>
              </CardHeader>
              <CardContent className="p-0">
                {outboundOrders.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground space-y-2">
                    <Layers className="w-8 h-8 mx-auto text-muted-foreground/40 stroke-1" />
                    <p className="text-sm font-bold text-foreground">لا توجد أوامر إخراج مجدولة بعد</p>
                    <p className="text-xs max-w-sm mx-auto">
                      يمكنك جدولة الدفعات الدورية (ربع سنوية / شهرية) لإنشاء مسوغات الصرف المحاسبية وتجهيز بنود التوزيع.
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto" dir="rtl">
                    <Table className="text-xs text-right" dir="rtl">
                      <TableHeader className="bg-muted/30">
                        <TableRow className="border-b">
                          <th className="p-3 w-10 text-center font-bold">#</th>
                          <th className="p-3 font-bold">رقم أمر الإخراج</th>
                          <th className="p-3 font-bold text-center">طريقة الإخراج</th>
                          <th className="p-3 font-bold text-center">مسوغ الصرف المحاسبي</th>
                          <th className="p-3 font-bold">المستلم / الصفة</th>
                          <th className="p-3 font-bold text-center">تاريخ الإخراج</th>
                          <th className="p-3 font-bold text-center">الأصناف المشمولة</th>
                          <th className="p-3 font-bold text-center">حالة الاعتماد والاستلام</th>
                          <th className="p-3 font-bold text-center w-48">الإجراءات</th>
                        </TableRow>
                      </TableHeader>
                      <TableBody className="divide-y divide-border">
                        {outboundOrders.map((out: any, idx: number) => {
                          const isDelivered = out.status === "delivered";
                          const methodMap: Record<string, { label: string; icon: any; color: string }> = {
                            direct_imam: { label: "تسليم مباشر بالمسجد", icon: Building2, color: "text-emerald-700 bg-emerald-50 border-emerald-200" },
                            courier_delivery: { label: "شحن وتوصيل للموقع", icon: Truck, color: "text-sky-700 bg-sky-50 border-sky-200" },
                            warehouse_pickup: { label: "استلام من المستودع", icon: Store, color: "text-purple-700 bg-purple-50 border-purple-200" },
                            scheduled_batch: { label: "دفعة مجدولة للصرف", icon: CalendarDays, color: "text-amber-700 bg-amber-50 border-amber-200" },
                          };
                          const method = methodMap[out.outboundMethod] || methodMap.direct_imam;
                          const MethodIcon = method.icon;

                          return (
                            <TableRow key={out.id} className="hover:bg-muted/10">
                              <td className="p-3 text-center font-mono text-muted-foreground">{idx + 1}</td>
                              <td className="p-3 font-bold font-mono text-foreground">{out.orderNumber}</td>
                              <td className="p-3 text-center">
                                <Badge variant="outline" className={`text-[10px] gap-1 font-semibold ${method.color}`}>
                                  <MethodIcon className="w-3 h-3" />
                                  <span>{method.label}</span>
                                </Badge>
                              </td>
                              <td className="p-3 text-center">
                                <span className="font-mono font-bold bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 px-2 py-0.5 rounded">
                                  {out.disbursementVoucherCode}
                                </span>
                              </td>
                              <td className="p-3">
                                <div className="font-semibold text-foreground">{out.recipientName || mosque?.imamName || "إمام المسجد"}</div>
                                <div className="text-[10px] text-muted-foreground">{out.recipientRole || "إمام المسجد"} {out.recipientPhone ? `• ${out.recipientPhone}` : ""}</div>
                              </td>
                              <td className="p-3 text-center font-mono">{out.scheduledDate || out.createdAt?.split("T")[0]}</td>
                              <td className="p-3 text-center">
                                <span className="font-bold text-foreground">{out.items?.length || 0} بنود</span>
                                <div className="text-[10px] text-muted-foreground">
                                  ({out.items?.reduce((s: number, it: any) => s + (Number(it.quantity) || 0), 0) || 0} وحدة إجمالاً)
                                </div>
                              </td>
                              <td className="p-3 text-center">
                                {isDelivered ? (
                                  <Badge variant="outline" className="border-emerald-300 text-emerald-800 bg-emerald-50 text-[10px] gap-1 font-bold">
                                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                    <span>معتمد ومؤكد الاستلام ✓</span>
                                  </Badge>
                                ) : (
                                  <Badge variant="outline" className="border-amber-300 text-amber-800 bg-amber-50 text-[10px] gap-1 font-bold">
                                    <Clock className="w-3 h-3 text-amber-600" />
                                    <span>بانتظار تأكيد استلام الإمام</span>
                                  </Badge>
                                )}
                              </td>
                              <td className="p-3 text-center">
                                <div className="flex items-center justify-center gap-1.5 flex-wrap">
                                  {isDelivered ? (
                                    <>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => {
                                          setSelectedOutboundToView(out);
                                          setIsViewOutboundModalOpen(true);
                                        }}
                                        className="h-7 text-xs font-bold gap-1 text-emerald-700 hover:bg-emerald-50 border-emerald-200"
                                      >
                                        <BadgeCheck className="w-3.5 h-3.5" />
                                        <span>إثبات الاستلام</span>
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => setLocation(`/requests/${requestId}/sedana-delivery`)}
                                        title="طباعة محضر التسليم والاستلام"
                                        className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                                      >
                                        <Printer className="w-3.5 h-3.5" />
                                      </Button>
                                    </>
                                  ) : (
                                    <>
                                      <Button
                                        size="sm"
                                        onClick={() => {
                                          setSelectedOutboundToConfirm(out);
                                          setConfirmOutboundRecipientName(out.recipientName || mosque?.imamName || "إمام المسجد");
                                          setConfirmOutboundDate(new Date().toISOString().split("T")[0]);
                                          setConfirmOutboundRating(5);
                                          setConfirmOutboundNotes("");
                                          setIsConfirmOutboundModalOpen(true);
                                        }}
                                        className="h-7 text-xs font-bold gap-1 bg-emerald-700 hover:bg-emerald-800 text-white shadow-2xs"
                                      >
                                        <ShieldCheck className="w-3.5 h-3.5" />
                                        <span>تأكيد استلام الإمام</span>
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => setLocation(`/requests/${requestId}/sedana-delivery`)}
                                        title="طباعة أمر الإخراج ومحضر الاستلام"
                                        className="h-7 px-2 text-xs font-medium gap-1 text-muted-foreground"
                                      >
                                        <Printer className="w-3.5 h-3.5" />
                                        <span>المحضر</span>
                                      </Button>
                                    </>
                                  )}
                                </div>
                              </td>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* التبويب 3: أوامر التسليم وإثبات الاستلام الرقمي */}
          <TabsContent value="deliveries" dir="rtl" className="space-y-4">
            <Card className="border border-border/80 shadow-2xs">
              <CardHeader className="p-4 border-b flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-bold text-foreground">
                    أوامر التسليم الميداني وإثبات الاستلام الرقمي (Closing the Loop)
                  </CardTitle>
                  <CardDescription className="text-xs mt-0.5">
                    النماذج الرسمية المسلّمة للإمام/المؤذن، مع إثبات وتوثيق الاستلام الرقمي لإنهاء العهدة
                  </CardDescription>
                </div>
                <Button
                  size="sm"
                  onClick={() => setLocation(`/requests/${requestId}/sedana-delivery`)}
                  className="text-xs font-bold gap-1 bg-emerald-700 hover:bg-emerald-800 text-white"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>طباعة أمر التسليم (A4)</span>
                </Button>
              </CardHeader>
              <CardContent className="p-0">
                {deliveryOrders.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground space-y-2">
                    <Truck className="w-8 h-8 mx-auto text-muted-foreground/40 stroke-1" />
                    <p className="text-sm font-bold text-foreground">لا توجد أوامر تسليم بعد</p>
                    <p className="text-xs max-w-sm mx-auto">
                      يمكنك إصدار أمر تسليم من تبويب "أوامر الإخراج ومسوغات الصرف" عند الرغبة في إرسال الدفعة للمسجد.
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto" dir="rtl">
                    <Table className="text-xs text-right" dir="rtl">
                      <TableHeader className="bg-muted/30">
                        <TableRow className="border-b">
                          <th className="p-3 w-10 text-center font-bold">#</th>
                          <th className="p-3 font-bold">رقم أمر التسليم</th>
                          <th className="p-3 font-bold text-center">مسوغ الصرف</th>
                          <th className="p-3 font-bold">المستلم المعتمد</th>
                          <th className="p-3 font-bold text-center">تاريخ التسليم</th>
                          <th className="p-3 font-bold text-center">الحالة</th>
                          <th className="p-3 font-bold text-center w-36">الإجراءات</th>
                        </TableRow>
                      </TableHeader>
                      <TableBody className="divide-y divide-border">
                        {deliveryOrders.map((del: any, idx: number) => (
                          <TableRow key={del.id} className="hover:bg-muted/10">
                            <td className="p-3 text-center font-mono text-muted-foreground">{idx + 1}</td>
                            <td className="p-3 font-bold font-mono">{del.deliveryNumber}</td>
                            <td className="p-3 text-center font-mono text-[11px] text-muted-foreground">
                              {del.disbursementVoucherCode || "-"}
                            </td>
                            <td className="p-3">
                              <div className="font-bold text-foreground">{del.recipientName}</div>
                              <div className="text-[10px] text-muted-foreground">{del.recipientRole}</div>
                            </td>
                            <td className="p-3 text-center font-mono">{del.scheduledDate}</td>
                            <td className="p-3 text-center">
                              {del.status === "confirmed" ? (
                                <Badge variant="outline" className="border-emerald-300 text-emerald-800 bg-emerald-50 text-[10px]">
                                  تم الاستلام بنجاح ✓
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="border-amber-300 text-amber-800 bg-amber-50 text-[10px]">
                                  بانتظار تأكيد الإمام
                                </Badge>
                              )}
                            </td>
                            <td className="p-3 text-center">
                              <div className="flex items-center justify-center gap-1.5">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => setLocation(`/requests/${requestId}/sedana-delivery`)}
                                  className="h-7 text-xs font-bold gap-1"
                                  title="طباعة"
                                >
                                  <Printer className="w-3.5 h-3.5" />
                                  <span>طباعة</span>
                                </Button>
                                {del.status !== "confirmed" && (
                                  <Button
                                    size="sm"
                                    onClick={() => handleOpenConfirmModal(del)}
                                    className="h-7 text-xs font-bold gap-1 bg-emerald-700 hover:bg-emerald-800 text-white"
                                  >
                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                    <span>تأكيد الاستلام</span>
                                  </Button>
                                )}
                              </div>
                            </td>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* التبويب 4: سجل تنقلات الإمام والذاكرة المؤسسية للمسجد */}
          <TabsContent value="history" dir="rtl" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* سجل تنقلات الإمام */}
              <Card className="border border-border/80 shadow-2xs">
                <CardHeader className="p-4 border-b">
                  <div className="flex items-center gap-2">
                    <UserCheck className="w-4 h-4 text-primary" />
                    <CardTitle className="text-sm font-bold text-foreground">
                      سجل تنقلات الإمام وكفاءة إدارة الموارد
                    </CardTitle>
                  </div>
                  <CardDescription className="text-xs mt-0.5">
                    تتبع سجل الإمام وعقوده السابقة عبر المساجد المختلفة لضمان استمرارية تقييم الأداء
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-4 space-y-3">
                  <div className="p-3 rounded-lg bg-muted/40 border text-xs space-y-1">
                    <p className="font-bold text-foreground">المساجد التي أدار فيها الإمام برامج تشغيلية:</p>
                    {imamHistoryData?.mosquesServed && imamHistoryData.mosquesServed.length > 0 ? (
                      <ul className="list-disc list-inside space-y-1 text-muted-foreground pt-1">
                        {imamHistoryData.mosquesServed.map((m: any) => (
                          <li key={m.id}>
                            <span className="font-semibold text-foreground">{m.name}</span> ({m.city}) - {m.requestsCount} طلبات سابقة
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-muted-foreground">جامع {mosque?.name || "المسجد الحالي"} (المسجد المسجل حالياً)</p>
                    )}
                  </div>

                  <div className="flex items-center justify-between text-xs p-3 rounded-lg border border-emerald-200 bg-emerald-50/50 dark:bg-emerald-950/20">
                    <span className="font-bold text-emerald-800 dark:text-emerald-300">معدل التزام وتأكيد الاستلام:</span>
                    <span className="font-bold text-emerald-700 dark:text-emerald-400 font-mono text-sm">100% (موثوق وممتاز)</span>
                  </div>
                </CardContent>
              </Card>

              {/* الذاكرة المؤسسية للمسجد والتنبؤ بالاحتياج */}
              <Card className="border border-border/80 shadow-2xs">
                <CardHeader className="p-4 border-b">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-emerald-700" />
                    <CardTitle className="text-sm font-bold text-foreground">
                      الملف التعريفي والذاكرة المؤسسية للمسجد
                    </CardTitle>
                  </div>
                  <CardDescription className="text-xs mt-0.5">
                    حفظ أرشيف العقود والمشتروات السنوية لتسهيل التنبؤ بالاحتياج المستقبلي
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-4 space-y-3 text-xs">
                  <div className="space-y-1.5">
                    <div className="flex justify-between border-b pb-1">
                      <span className="text-muted-foreground">اسم المسجد:</span>
                      <span className="font-bold">{mosque?.name || "المسجد"}</span>
                    </div>
                    <div className="flex justify-between border-b pb-1">
                      <span className="text-muted-foreground">المدينة / الحي:</span>
                      <span className="font-semibold">{mosque?.city || "-"} - {mosque?.district || "-"}</span>
                    </div>
                    <div className="flex justify-between border-b pb-1">
                      <span className="text-muted-foreground">نوع المسجد:</span>
                      <span className="font-semibold">{mosque?.mosqueType || "جامع"}</span>
                    </div>
                    <div className="flex justify-between border-b pb-1">
                      <span className="text-muted-foreground">السعة الاستيعابية:</span>
                      <span className="font-semibold font-mono">{mosque?.capacity || "-"} مصلٍ</span>
                    </div>
                  </div>

                  <div className="p-3 rounded-lg bg-sky-50 dark:bg-sky-950/30 border border-sky-200 dark:border-sky-800 space-y-1">
                    <p className="font-bold text-sky-900 dark:text-sky-300">التنبؤ التلقائي باحتياج العام القادم:</p>
                    <p className="text-[11px] text-sky-800 dark:text-sky-400">
                      بناءً على معدلات استهلاك هذا العام، يوصي النظام بتجديد التعاقد السنوي بنفس الكميات مع زيادة 5% في مواد السقيا لموسم الصيف.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>



        {/* Modal: تأكيد استلام أمر الإخراج من قبل الإمام واعتماده */}
        <Dialog open={isConfirmOutboundModalOpen} onOpenChange={setIsConfirmOutboundModalOpen}>
          <DialogContent className="max-w-md text-right font-sans" dir="rtl">
            <DialogHeader>
              <DialogTitle className="text-base font-bold flex items-center gap-2 text-emerald-800 dark:text-emerald-300">
                <ShieldCheck className="w-5 h-5 text-emerald-600" />
                <span>تأكيد استلام أمر الإخراج واعتماده رسمياً</span>
              </DialogTitle>
              <DialogDescription className="text-xs">
                توثيق استلام إمام المسجد للمواد وإسقاط مسؤولية التوريد واعتماد خروجها النهائي من المستودع
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3.5 py-2 text-xs max-h-[65vh] overflow-y-auto">
              <div className="p-3 rounded-lg bg-emerald-50/80 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 space-y-1.5">
                <div className="flex items-center justify-between font-bold text-emerald-900 dark:text-emerald-200">
                  <span>أمر الإخراج: {selectedOutboundToConfirm?.orderNumber}</span>
                  <span className="font-mono text-xs">{selectedOutboundToConfirm?.disbursementVoucherCode}</span>
                </div>
                <p className="text-[11px] text-emerald-800 dark:text-emerald-300 leading-relaxed">
                  أقر أنا <span className="font-bold underline">{confirmOutboundRecipientName || "إمام المسجد"}</span> باستلام المواد المبينة أدناه لمسجد ({mosque?.name || "المسجد"}) بحالة سليمة ومطابقة للمواصفات.
                </p>
              </div>

              {/* قائمة الأصناف المشمولة بأمر الإخراج */}
              <div className="border rounded-md p-2.5 bg-muted/20 space-y-1.5">
                <p className="font-bold text-foreground text-[11px]">الأصناف والكميات المراد تأكيد استلامها:</p>
                <div className="divide-y divide-border/60">
                  {selectedOutboundToConfirm?.items?.map((it: any, i: number) => (
                    <div key={i} className="py-1.5 flex items-center justify-between">
                      <span className="font-medium text-foreground">{it.itemName || it.name}</span>
                      <span className="font-bold font-mono text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950 px-2 py-0.5 rounded text-[11px]">
                        {it.quantity} {it.unit || "وحدة"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <Label className="text-xs font-bold">اسم المستلم الفعلي (الإمام / المفوض)</Label>
                <Input
                  value={confirmOutboundRecipientName}
                  onChange={(e) => setConfirmOutboundRecipientName(e.target.value)}
                  placeholder="الاسم الكامل لإمام المسجد أو المفوض بالاستلام..."
                  className="h-8 text-xs mt-1"
                />
              </div>

              <div>
                <Label className="text-xs font-bold">تاريخ الاستلام الفعلي بالمسجد</Label>
                <Input
                  type="date"
                  value={confirmOutboundDate}
                  onChange={(e) => setConfirmOutboundDate(e.target.value)}
                  className="h-8 text-xs mt-1"
                />
              </div>

              <div>
                <Label className="text-xs font-bold">تقييم سلامة المواد وجودة التوريد</Label>
                <div className="flex items-center gap-2 pt-1.5">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setConfirmOutboundRating(star)}
                      className="p-1 rounded hover:bg-muted transition-colors"
                    >
                      <Star
                        className={`w-6 h-6 transition-all ${
                          star <= confirmOutboundRating
                            ? "fill-amber-400 text-amber-500 scale-110"
                            : "text-muted-foreground/30"
                        }`}
                      />
                    </button>
                  ))}
                  <span className="text-xs font-bold text-amber-700 dark:text-amber-400 mr-2">
                    {confirmOutboundRating === 5 && "ممتاز - مطابقة كاملة"}
                    {confirmOutboundRating === 4 && "جيد جداً"}
                    {confirmOutboundRating === 3 && "جيد"}
                    {confirmOutboundRating <= 2 && "ملاحظات على المواد"}
                  </span>
                </div>
              </div>

              <div>
                <Label className="text-xs font-bold">ملاحظات تأكيد الاستلام (اختياري)</Label>
                <Textarea
                  value={confirmOutboundNotes}
                  onChange={(e) => setConfirmOutboundNotes(e.target.value)}
                  placeholder="أي ملاحظات حول سلامة المواد، أو ظروف التسليم الميداني..."
                  className="text-xs mt-1"
                  rows={2}
                />
              </div>
            </div>

            <DialogFooter className="gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsConfirmOutboundModalOpen(false)}
                className="text-xs"
              >
                إلغاء
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  if (!confirmOutboundRecipientName.trim()) {
                    toast.error("يرجى إدخال اسم المستلم الفعلي بالمسجد");
                    return;
                  }

                  confirmOutboundMutation.mutate({
                    requestId,
                    outboundOrderId: selectedOutboundToConfirm?.id,
                    recipientName: confirmOutboundRecipientName,
                    deliveredDate: confirmOutboundDate,
                    satisfactionRating: confirmOutboundRating,
                    notes: confirmOutboundNotes,
                  });
                }}
                disabled={confirmOutboundMutation.isPending}
                className="text-xs font-bold bg-emerald-700 hover:bg-emerald-800 text-white gap-1.5 shadow-sm"
              >
                {confirmOutboundMutation.isPending ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>جاري التوثيق والاعتماد...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>اعتماد وتأكيد الاستلام الفعلي ✓</span>
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Modal: عرض وثيقة إثبات الاستلام الرقمي المعتمد */}
        <Dialog open={isViewOutboundModalOpen} onOpenChange={setIsViewOutboundModalOpen}>
          <DialogContent className="max-w-md text-right font-sans" dir="rtl">
            <DialogHeader>
              <DialogTitle className="text-base font-bold flex items-center gap-2 text-emerald-800 dark:text-emerald-300">
                <BadgeCheck className="w-5 h-5 text-emerald-600" />
                <span>وثيقة إثبات الاستلام الرقمي المعتمد</span>
              </DialogTitle>
              <DialogDescription className="text-xs">
                بيانات التوثيق الرقمي لاعتماد تسليم واستلام المواد من المستودع الافتراضي
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3.5 py-2 text-xs">
              <div className="p-3 rounded-lg border bg-muted/30 space-y-2">
                <div className="flex justify-between border-b pb-1.5">
                  <span className="text-muted-foreground">رقم أمر الإخراج:</span>
                  <span className="font-mono font-bold text-foreground">{selectedOutboundToView?.orderNumber}</span>
                </div>
                <div className="flex justify-between border-b pb-1.5">
                  <span className="text-muted-foreground">مسوغ الصرف المحاسبي:</span>
                  <span className="font-mono font-bold text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded border border-amber-200">
                    {selectedOutboundToView?.disbursementVoucherCode}
                  </span>
                </div>
                <div className="flex justify-between border-b pb-1.5">
                  <span className="text-muted-foreground">المستلم المعتمد:</span>
                  <span className="font-bold text-foreground">{selectedOutboundToView?.confirmation?.confirmedByName || selectedOutboundToView?.recipientName}</span>
                </div>
                <div className="flex justify-between border-b pb-1.5">
                  <span className="text-muted-foreground">تاريخ الاستلام الفعلي:</span>
                  <span className="font-mono font-semibold">{selectedOutboundToView?.deliveredDate || selectedOutboundToView?.confirmation?.confirmedAt?.split("T")[0]}</span>
                </div>
                <div className="flex justify-between border-b pb-1.5">
                  <span className="text-muted-foreground">تقييم الجودة:</span>
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={`w-3.5 h-3.5 ${
                          star <= (selectedOutboundToView?.confirmation?.satisfactionRating || 5)
                            ? "fill-amber-400 text-amber-500"
                            : "text-muted-foreground/30"
                        }`}
                      />
                    ))}
                    <span className="font-bold mr-1 text-[11px] text-amber-700">({selectedOutboundToView?.confirmation?.satisfactionRating || 5}/5)</span>
                  </div>
                </div>
                {selectedOutboundToView?.confirmation?.notes && (
                  <div className="pt-1">
                    <span className="text-muted-foreground block mb-0.5">ملاحظات الاستلام:</span>
                    <p className="bg-background p-2 rounded border text-muted-foreground text-[11px]">{selectedOutboundToView?.confirmation?.notes}</p>
                  </div>
                )}
              </div>

              {/* الأصناف المسلمة */}
              <div className="border rounded-lg p-2.5 space-y-1.5">
                <p className="font-bold text-foreground text-[11px]">الأصناف التي تم تأكيد استلامها:</p>
                <div className="divide-y divide-border/60">
                  {selectedOutboundToView?.items?.map((it: any, i: number) => (
                    <div key={i} className="py-1 flex items-center justify-between text-xs">
                      <span>{it.itemName || it.name}</span>
                      <span className="font-mono font-bold text-emerald-700">{it.quantity} {it.unit || "وحدة"}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <DialogFooter className="gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsViewOutboundModalOpen(false)}
                className="text-xs"
              >
                إغلاق
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  setIsViewOutboundModalOpen(false);
                  setLocation(`/requests/${requestId}/sedana-delivery`);
                }}
                className="text-xs font-bold gap-1.5 bg-primary text-primary-foreground"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>طباعة محضر الاستلام الرسمي</span>
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Modal: تحويل أمر الإخراج لأمر تسليم ميداني */}
        <Dialog open={isDeliveryModalOpen} onOpenChange={setIsDeliveryModalOpen}>
          <DialogContent className="max-w-md text-right font-sans" dir="rtl">
            <DialogHeader>
              <DialogTitle className="text-base font-bold">إصدار أمر تسليم ميداني</DialogTitle>
              <DialogDescription className="text-xs">
                توجيه أمر التسليم الميداني للإمام أو المؤذن بناءً على أمر الإخراج ومسوغ الصرف
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-2 text-xs">
              <div>
                <Label className="text-xs font-bold">اسم المستلم بالمسجد</Label>
                <Input
                  value={deliveryRecipientName}
                  onChange={(e) => setDeliveryRecipientName(e.target.value)}
                  placeholder="اسم إمام أو مؤذن المسجد..."
                  className="h-8 text-xs mt-1"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs font-bold">الصفة</Label>
                  <Input
                    value={deliveryRecipientRole}
                    onChange={(e) => setDeliveryRecipientRole(e.target.value)}
                    placeholder="إمام المسجد"
                    className="h-8 text-xs mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs font-bold">رقم الجوال</Label>
                  <Input
                    value={deliveryRecipientPhone}
                    onChange={(e) => setDeliveryRecipientPhone(e.target.value)}
                    placeholder="05xxxxxxxx"
                    className="h-8 text-xs mt-1 font-mono"
                  />
                </div>
              </div>

              <div>
                <Label className="text-xs font-bold">تاريخ التسليم المجدول</Label>
                <Input
                  type="date"
                  value={deliveryScheduledDate}
                  onChange={(e) => setDeliveryScheduledDate(e.target.value)}
                  className="h-8 text-xs mt-1"
                />
              </div>

              <div className="p-3 bg-muted/40 rounded-lg space-y-1">
                <p className="font-bold text-foreground">مسوغ الصرف المرتبط:</p>
                <p className="font-mono text-amber-800 dark:text-amber-300 font-bold">
                  {deliverySelectedOutbound?.disbursementVoucherCode || "-"}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  عدد البنود المشمولة: {deliverySelectedOutbound?.items?.length || 0} صنف
                </p>
              </div>
            </div>

            <DialogFooter className="gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsDeliveryModalOpen(false)}
                className="text-xs"
              >
                إلغاء
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  if (!deliveryRecipientName.trim()) {
                    toast.error("يرجى إدخال اسم المستلم بالمسجد");
                    return;
                  }

                  createDeliveryMutation.mutate({
                    requestId,
                    outboundOrderId: deliverySelectedOutbound?.id,
                    recipientName: deliveryRecipientName,
                    recipientRole: deliveryRecipientRole,
                    recipientPhone: deliveryRecipientPhone,
                    scheduledDate: deliveryScheduledDate,
                    items: deliverySelectedOutbound?.items || [],
                  });
                }}
                disabled={createDeliveryMutation.isPending}
                className="text-xs font-bold"
              >
                {createDeliveryMutation.isPending ? "جاري الإصدار..." : "تأكيد إصدار أمر التسليم"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Modal: إثبات وتأكيد الاستلام الرقمي من قبل الإمام */}
        <Dialog open={isConfirmModalOpen} onOpenChange={setIsConfirmModalOpen}>
          <DialogContent className="max-w-md text-right font-sans" dir="rtl">
            <DialogHeader>
              <DialogTitle className="text-base font-bold flex items-center gap-1.5">
                <ShieldCheck className="w-5 h-5 text-emerald-600" />
                <span>إثبات الاستلام الرقمي وتأكيد العهدة</span>
              </DialogTitle>
              <DialogDescription className="text-xs">
                تأكيد استلام بنود أمر التسليم رقم {selectedDeliveryToConfirm?.deliveryNumber} وإسقاط العهدة اللوجستية
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-2 text-xs">
              <div className="p-3 rounded-lg bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 space-y-1">
                <p className="font-bold text-emerald-900 dark:text-emerald-200">إقرار الاستلام:</p>
                <p className="text-[11px] text-emerald-800 dark:text-emerald-300 leading-relaxed">
                  أقر أنا <span className="font-bold">{confirmSignatureName || "إمام المسجد"}</span> باستلام كافة المواد والبنود الموضحة بأمر التسليم بحالة مطابقة وسليمة، لتشغيل وصيانة المسجد.
                </p>
              </div>

              <div>
                <Label className="text-xs font-bold">اسم الموقّع / المستلم الفعلي</Label>
                <Input
                  value={confirmSignatureName}
                  onChange={(e) => setConfirmSignatureName(e.target.value)}
                  placeholder="الاسم الثلاثي..."
                  className="h-8 text-xs mt-1"
                />
              </div>

              <div>
                <Label className="text-xs font-bold">تقييم مستوى الخدمة وجودة المواد</Label>
                <div className="flex items-center gap-2 pt-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setConfirmRating(star)}
                      className="p-1 rounded hover:bg-muted"
                    >
                      <Star
                        className={`w-6 h-6 ${
                          star <= confirmRating
                            ? "fill-amber-400 text-amber-500"
                            : "text-muted-foreground/30"
                        }`}
                      />
                    </button>
                  ))}
                  <span className="text-xs font-bold text-amber-700 mr-2">
                    {confirmRating === 5 && "ممتاز جداً"}
                    {confirmRating === 4 && "جيد جداً"}
                    {confirmRating === 3 && "جيد"}
                    {confirmRating <= 2 && "يحتاج تحسين"}
                  </span>
                </div>
              </div>

              <div>
                <Label className="text-xs font-bold">ملاحظات أو تعليقات</Label>
                <Textarea
                  value={confirmNotes}
                  onChange={(e) => setConfirmNotes(e.target.value)}
                  placeholder="أي ملاحظات حول جودة التوريد أو الأصناف..."
                  className="text-xs mt-1"
                  rows={2}
                />
              </div>
            </div>

            <DialogFooter className="gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsConfirmModalOpen(false)}
                className="text-xs"
              >
                إلغاء
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  if (!confirmSignatureName.trim()) {
                    toast.error("يرجى إدخال اسم الموقّع");
                    return;
                  }

                  confirmReceiptMutation.mutate({
                    requestId,
                    deliveryOrderId: selectedDeliveryToConfirm?.id,
                    signatureUrl: `digital_signature_${Date.now()}`,
                    satisfactionRating: confirmRating,
                    notes: confirmNotes,
                  });
                }}
                disabled={confirmReceiptMutation.isPending}
                className="text-xs font-bold bg-emerald-700 hover:bg-emerald-800 text-white"
              >
                {confirmReceiptMutation.isPending ? "جاري التوثيق..." : "تأكيد الاستلام الرقمي الآن"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
