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
  const [isInwardModalOpen, setIsInwardModalOpen] = useState(false);
  const [isOutboundModalOpen, setIsOutboundModalOpen] = useState(false);
  const [isDeliveryModalOpen, setIsDeliveryModalOpen] = useState(false);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);

  // عناصر النموذج
  const [inwardItems, setInwardItems] = useState<Record<string, number>>({});
  const [inwardNotes, setInwardNotes] = useState("");
  const [inwardReceivedBy, setInwardReceivedBy] = useState("");
  // الربط بالمستند المرجعي لأمر الإدخال (أمر شراء، خطاب مسؤولية مجتمعية، عقد مورد)
  const [inwardRefType, setInwardRefType] = useState<string>("purchase_order");
  const [inwardRefNumber, setInwardRefNumber] = useState<string>("");
  const [inwardSupplierInvoice, setInwardSupplierInvoice] = useState<string>("");
  const [inwardSupplierName, setInwardSupplierName] = useState<string>("");

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

  // الطفرات
  const createInwardMutation = trpc.sedanaExecution.createInwardOrder.useMutation({
    onSuccess: () => {
      toast.success("تم تسجيل أمر الإدخال في المستودع الافتراضي وتوثيق المستند المرجعي بنجاح");
      setIsInwardModalOpen(false);
      setInwardItems({});
      setInwardNotes("");
      setInwardSupplierInvoice("");
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

  // المستند المرجعي المختار لأمر الإدخال والتحقق من تنفيذ أمر الصرف
  const currentInwardRef = availableReferences.find((r: any) => r.type === inwardRefType) || availableReferences[0];

  const isInwardBlocked = currentInwardRef && currentInwardRef.canCreateInward === false;

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
                      const initial: Record<string, number> = {};
                      inventoryItems.forEach((i) => {
                        if (i.pendingInward > 0) initial[i.id] = i.pendingInward;
                      });
                      setInwardItems(initial);
                      // تعيين المستند المرجعي الافتراضي
                      const firstRef = availableReferences[0];
                      if (firstRef) {
                        setInwardRefType(firstRef.type);
                        setInwardRefNumber(firstRef.documentNumber);
                        setInwardSupplierName(firstRef.partnerOrSupplier || "");
                      } else {
                        setInwardRefType("purchase_order");
                        setInwardRefNumber(requestId > 0 ? `PO-${requestId}` : "");
                        setInwardSupplierName("");
                      }
                      setInwardSupplierInvoice("");
                      setIsInwardModalOpen(true);
                    }}
                    className="text-xs font-bold gap-1 bg-primary text-primary-foreground"
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
                  onClick={handleOpenOutboundModal}
                  className="text-xs font-bold gap-1 bg-primary text-primary-foreground"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>جدولة أمر إخراج جديد</span>
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
                          <th className="p-3 font-bold text-center">مسوغ الصرف المحاسبي</th>
                          <th className="p-3 font-bold">الدفعة / الفترة</th>
                          <th className="p-3 font-bold text-center">تاريخ الجدولة</th>
                          <th className="p-3 font-bold text-center">الأصناف المشمولة</th>
                          <th className="p-3 font-bold text-center">الحالة</th>
                          <th className="p-3 font-bold text-center w-28">الإجراءات</th>
                        </TableRow>
                      </TableHeader>
                      <TableBody className="divide-y divide-border">
                        {outboundOrders.map((out: any, idx: number) => (
                          <TableRow key={out.id} className="hover:bg-muted/10">
                            <td className="p-3 text-center font-mono text-muted-foreground">{idx + 1}</td>
                            <td className="p-3 font-bold font-mono">{out.orderNumber}</td>
                            <td className="p-3 text-center">
                              <span className="font-mono font-bold bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 px-2 py-0.5 rounded">
                                {out.disbursementVoucherCode}
                              </span>
                            </td>
                            <td className="p-3 font-semibold">{out.periodLabel}</td>
                            <td className="p-3 text-center font-mono">{out.scheduledDate}</td>
                            <td className="p-3 text-center font-bold">{out.items?.length || 0} بنود</td>
                            <td className="p-3 text-center">
                              <Badge variant="outline" className={`text-[10px] ${
                                out.status === "delivered"
                                  ? "border-emerald-300 text-emerald-800 bg-emerald-50"
                                  : out.status === "dispatched"
                                  ? "border-sky-300 text-sky-800 bg-sky-50"
                                  : "border-amber-300 text-amber-800 bg-amber-50"
                              }`}>
                                {out.status === "delivered" && "تم التسليم"}
                                {out.status === "dispatched" && "قيد التسليم"}
                                {out.status === "scheduled" && "مجدول للصرف"}
                              </Badge>
                            </td>
                            <td className="p-3 text-center">
                              {out.status === "scheduled" ? (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleOpenDeliveryModalFromOutbound(out)}
                                  className="h-7 text-xs font-bold gap-1 text-sky-700 hover:bg-sky-50"
                                >
                                  <Truck className="w-3.5 h-3.5" />
                                  <span>إصدار أمر تسليم</span>
                                </Button>
                              ) : (
                                <span className="text-[11px] text-muted-foreground">تم التحويل للتسليم</span>
                              )}
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

        {/* Modal: أمر إدخال جديد مع الربط بالمستند المرجعي للتأمين */}
        <Dialog open={isInwardModalOpen} onOpenChange={setIsInwardModalOpen}>
          <DialogContent className="max-w-lg text-right font-sans" dir="rtl">
            <DialogHeader>
              <DialogTitle className="text-base font-bold flex items-center gap-2">
                <Boxes className="w-5 h-5 text-emerald-600" />
                <span>إصدار أمر إدخال مستودعي والربط بالمستند المرجعي</span>
              </DialogTitle>
              <DialogDescription className="text-xs">
                تسجيل الكميات الموردة وربطها بأمر الشراء أو عقد المورد أو خطاب المسؤولية المجتمعية وفاتورة التوريد
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-2 text-xs max-h-[65vh] overflow-y-auto pr-1">
              {/* اختيار وتوثيق المستند المرجعي للتأمين والتعاقد */}
              <div className="p-3 bg-muted/40 rounded-xl border border-border/80 space-y-2.5">
                <div className="flex items-center gap-1.5 font-bold text-foreground">
                  <FileText className="w-4 h-4 text-emerald-600" />
                  <span>المستند المرجعي للتأمين / التعاقد:</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <Label className="text-[11px] font-semibold text-muted-foreground">نوع مستند التأمين</Label>
                    <Select
                      value={inwardRefType}
                      onValueChange={(val) => {
                        setInwardRefType(val);
                        const found = availableReferences.find((r: any) => r.type === val);
                        if (found) {
                          setInwardRefNumber(found.documentNumber);
                          if (found.partnerOrSupplier) setInwardSupplierName(found.partnerOrSupplier);
                        }
                      }}
                    >
                      <SelectTrigger className="h-8 text-xs mt-1 bg-background">
                        <SelectValue placeholder="اختر نوع المستند..." />
                      </SelectTrigger>
                      <SelectContent dir="rtl">
                        {availableReferences.map((ref: any) => (
                          <SelectItem key={ref.type} value={ref.type} className="text-xs">
                            {ref.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-[11px] font-semibold text-muted-foreground">رقم المستند المرجعي</Label>
                    <Input
                      value={inwardRefNumber}
                      onChange={(e) => setInwardRefNumber(e.target.value)}
                      placeholder="مثال: PO-87-2026 أو CSR-87"
                      className="h-8 text-xs font-mono mt-1 bg-background"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 border-t border-border/60">
                  <div>
                    <Label className="text-[11px] font-semibold text-muted-foreground">اسم المورد / الشريك المانح</Label>
                    <Input
                      value={inwardSupplierName}
                      onChange={(e) => setInwardSupplierName(e.target.value)}
                      placeholder="اسم المورد أو الجهة المانحة..."
                      className="h-8 text-xs mt-1 bg-background"
                    />
                  </div>
                  <div>
                    <Label className="text-[11px] font-semibold text-muted-foreground">رقم فاتورة المورد / بوليصة الشحن</Label>
                    <Input
                      value={inwardSupplierInvoice}
                      onChange={(e) => setInwardSupplierInvoice(e.target.value)}
                      placeholder="رقم الفاتورة أو البوليصة..."
                      className="h-8 text-xs font-mono mt-1 bg-background"
                    />
                  </div>
                </div>
              </div>

              {/* تنبيه حالة أمر الصرف المرتبط */}
              {isInwardBlocked && (
                <div className="p-3 rounded-xl bg-amber-500/10 border-2 border-amber-500/30 text-amber-900 dark:text-amber-200 space-y-2">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <p className="font-bold text-xs">لا يمكن عمل أمر إدخال مستودعي حالياً</p>
                      <p className="text-[11px] leading-relaxed">
                        {currentInwardRef?.blockedReason || "لا يمكن عمل أمر إدخال إلا بعد تنفيذ أمر الصرف وتحول حالته إلى 'منفّذ'."}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center justify-end gap-2 pt-1 border-t border-amber-500/20">
                    {currentInwardRef?.hasDisbursementOrder ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setLocation("/disbursement-orders")}
                        className="h-7 text-xs font-bold gap-1 text-amber-800 dark:text-amber-300 border-amber-400 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/40 cursor-pointer"
                      >
                        <span>متابعة أمر الصرف (#{currentInwardRef.disbursementOrderNumber})</span>
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        onClick={() => setLocation(`/disbursement-orders/new-direct?source=${inwardRefType}&orderNumber=${encodeURIComponent(inwardRefNumber || currentInwardRef?.documentNumber || "")}&requestId=${requestId}`)}
                        className="h-7 text-xs font-bold gap-1 bg-amber-600 hover:bg-amber-700 text-white cursor-pointer"
                      >
                        <Coins className="w-3.5 h-3.5" />
                        <span>إنشاء أمر صرف الآن</span>
                      </Button>
                    )}
                  </div>
                </div>
              )}

              {currentInwardRef?.isExecuted && (
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-900 dark:text-emerald-200 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>
                      أمر الصرف مرتبط ومنفّذ بنجاح (رقم أمر الصرف: <strong>{currentInwardRef.disbursementOrderNumber}</strong> بمبلغ <strong>{currentInwardRef.disbursementAmount}</strong> ر.س)
                    </span>
                  </div>
                  <Badge variant="outline" className="text-[10px] font-bold border-emerald-500 text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40">
                    منفّذ
                  </Badge>
                </div>
              )}

              <div>
                <Label className="text-xs font-bold">اسم المستلم (أمين المستودع / المنسق)</Label>
                <Input
                  value={inwardReceivedBy}
                  onChange={(e) => setInwardReceivedBy(e.target.value)}
                  placeholder="أمين المستودع"
                  className="h-8 text-xs mt-1"
                />
              </div>

              <div className="space-y-2 border-t pt-2">
                <Label className="text-xs font-bold">الكميات الموردة لكل صنف:</Label>
                {inventoryItems.map((it) => (
                  <div key={it.id} className="flex items-center justify-between gap-2 border-b pb-1">
                    <div>
                      <span className="font-medium text-foreground">{it.name} ({it.unit}):</span>
                      <span className="text-[10px] text-muted-foreground mr-2 font-mono">
                        (المتبقي: {it.pendingInward})
                      </span>
                    </div>
                    <Input
                      type="number"
                      step="any"
                      min="0"
                      value={inwardItems[it.id] ?? 0}
                      onChange={(e) =>
                        setInwardItems((prev) => ({
                          ...prev,
                          [it.id]: parseFloat(e.target.value) || 0,
                        }))
                      }
                      className="w-24 h-7 text-xs text-center font-mono"
                    />
                  </div>
                ))}
              </div>

              <div>
                <Label className="text-xs font-bold">ملاحظات الإدخال</Label>
                <Textarea
                  value={inwardNotes}
                  onChange={(e) => setInwardNotes(e.target.value)}
                  placeholder="ملاحظات حول حالة المواد أو مطابقتها للمواصفات..."
                  className="text-xs mt-1"
                  rows={2}
                />
              </div>
            </div>

            <DialogFooter className="gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsInwardModalOpen(false)}
                className="text-xs"
              >
                إلغاء
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  const items = Object.keys(inwardItems)
                    .filter((k) => (inwardItems[k] || 0) > 0)
                    .map((k) => {
                      const found = inventoryItems.find((i) => i.id === k);
                      return {
                        id: k,
                        itemName: found?.name || `بند ${k}`,
                        quantity: inwardItems[k],
                        unit: found?.unit || "وحدة",
                      };
                    });

                  if (items.length === 0) {
                    toast.error("يرجى إدخال كمية موجبة لصنف واحد على الأقل");
                    return;
                  }

                  createInwardMutation.mutate({
                    requestId,
                    receivedBy: inwardReceivedBy || user?.name || "أمين المستودع",
                    referenceType: inwardRefType,
                    referenceNumber: inwardRefNumber,
                    supplierInvoiceNumber: inwardSupplierInvoice,
                    supplierName: inwardSupplierName,
                    notes: inwardNotes,
                    items,
                  });
                }}
                disabled={createInwardMutation.isPending || isInwardBlocked}
                className={`text-xs font-bold ${
                  isInwardBlocked
                    ? "bg-muted text-muted-foreground cursor-not-allowed"
                    : "bg-emerald-700 hover:bg-emerald-800 text-white cursor-pointer"
                }`}
              >
                {createInwardMutation.isPending
                  ? "جاري الحفظ..."
                  : isInwardBlocked
                  ? "بانتظار تنفيذ أمر الصرف"
                  : "تأكيد وتوثيق أمر الإدخال"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Modal: جدولة أمر إخراج جديد */}
        <Dialog open={isOutboundModalOpen} onOpenChange={setIsOutboundModalOpen}>
          <DialogContent className="max-w-md text-right font-sans" dir="rtl">
            <DialogHeader>
              <DialogTitle className="text-base font-bold">جدولة أمر إخراج ومسوغ صرف</DialogTitle>
              <DialogDescription className="text-xs">
                تحديد كميات الدفعة المجدولة وتوليد مسوغ صرف محاسبي رسمي
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-2 text-xs max-h-[60vh] overflow-y-auto">
              <div>
                <Label className="text-xs font-bold">مسمى الدفعة / الفترة</Label>
                <Input
                  value={outboundPeriod}
                  onChange={(e) => setOutboundPeriod(e.target.value)}
                  placeholder="مثال: الدفعة الربع سنوية الأولى (Q1)"
                  className="h-8 text-xs mt-1"
                />
              </div>

              <div>
                <Label className="text-xs font-bold">تاريخ الجدولة والتوزيع</Label>
                <Input
                  type="date"
                  value={outboundDate}
                  onChange={(e) => setOutboundDate(e.target.value)}
                  className="h-8 text-xs mt-1"
                />
              </div>

              <div className="space-y-2 border-t pt-2">
                <Label className="text-xs font-bold">الكميات المجدولة للصرف في هذه الدفعة:</Label>
                {inventoryItems.map((it) => (
                  <div key={it.id} className="flex items-center justify-between gap-2 border-b pb-1">
                    <div>
                      <p className="font-medium text-foreground">{it.name}:</p>
                      <p className="text-[10px] text-muted-foreground">المتاح بالمستودع: {it.availableStock} {it.unit}</p>
                    </div>
                    <Input
                      type="number"
                      step="any"
                      min="0"
                      value={outboundItems[it.id] ?? 0}
                      onChange={(e) =>
                        setOutboundItems((prev) => ({
                          ...prev,
                          [it.id]: parseFloat(e.target.value) || 0,
                        }))
                      }
                      className="w-24 h-7 text-xs text-center font-mono"
                    />
                  </div>
                ))}
              </div>

              <div>
                <Label className="text-xs font-bold">ملاحظات أمر الإخراج</Label>
                <Textarea
                  value={outboundNotes}
                  onChange={(e) => setOutboundNotes(e.target.value)}
                  placeholder="ملاحظات توجيهية لفريق التوزيع..."
                  className="text-xs mt-1"
                  rows={2}
                />
              </div>
            </div>

            <DialogFooter className="gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsOutboundModalOpen(false)}
                className="text-xs"
              >
                إلغاء
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  const items = Object.keys(outboundItems)
                    .filter((k) => (outboundItems[k] || 0) > 0)
                    .map((k) => {
                      const found = inventoryItems.find((i) => i.id === k);
                      return {
                        id: k,
                        itemName: found?.name || `بند ${k}`,
                        quantity: outboundItems[k],
                        unit: found?.unit || "وحدة",
                      };
                    });

                  if (items.length === 0) {
                    toast.error("يرجى إدخال كمية موجبة لصنف واحد على الأقل");
                    return;
                  }

                  createOutboundMutation.mutate({
                    requestId,
                    scheduledDate: outboundDate,
                    periodLabel: outboundPeriod,
                    notes: outboundNotes,
                    items,
                  });
                }}
                disabled={createOutboundMutation.isPending}
                className="text-xs font-bold"
              >
                {createOutboundMutation.isPending ? "جاري الحفظ..." : "إصدار أمر الإخراج ومسوغ الصرف"}
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
