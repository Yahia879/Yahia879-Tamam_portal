import React, { useState, useMemo, useEffect, useCallback } from "react";
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
  Timer,
  TimerReset,
  Hourglass,
  RotateCcw,
  BadgeCheck,
  PackageCheck,
  Info,
  Search,
  ArrowLeft,
  Sparkles,
  Filter,
  Lock,
  FileSpreadsheet,
} from "lucide-react";
import { toast } from "sonner";
import { usePermission } from "@/hooks/usePermission";
import { exportStyledExcel } from "@/lib/excelExportHelper";
import { useDocumentTitle } from "@/contexts/DocumentTitleContext";
import { STAGE_LABELS } from "@shared/constants";

export default function SedanaExecutionPage() {
  const params = useParams<{ id?: string }>();
  const [, setLocation] = useLocation();
  const { user } = useAuth();

  // صلاحيات المستودع الافتراضي (نفس طريقة أوامر الشراء بدون تعقيد)
  const canInward = usePermission("sedana_warehouse.inward");
  const canOutbound = usePermission("sedana_warehouse.outbound");
  const canConfirmReceipt = usePermission("sedana_warehouse.confirm_receipt");
  const canPrint = usePermission("sedana_warehouse.print");
  const canExport = usePermission("sedana_warehouse.export");

  const [isExporting, setIsExporting] = useState(false);

  // عداد تنازلي حي - يُحدَّث كل ثانية
  const [countdownTick, setCountdownTick] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => {
      setCountdownTick((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // دالة حساب الفارق الزمني من nextDueDate
  const getCountdown = useCallback((nextDueDate: string | null | undefined) => {
    if (!nextDueDate) return null;
    const now = Date.now();
    const due = new Date(nextDueDate).getTime();
    const diffMs = due - now;
    if (diffMs <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0, totalMs: diffMs, isOverdue: true };
    const totalSec = Math.floor(diffMs / 1000);
    const days = Math.floor(totalSec / 86400);
    const hours = Math.floor((totalSec % 86400) / 3600);
    const minutes = Math.floor((totalSec % 3600) / 60);
    const seconds = totalSec % 60;
    return { days, hours, minutes, seconds, totalMs: diffMs, isOverdue: false };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [countdownTick]);

  // جلب قائمة كافة طلبات سدانة لاختيار الطلب
  const { data: sedanaRequests = [], isLoading: isRequestsLoading } = trpc.sedanaExecution.listSedanaRequests.useQuery();

  const [listSearch, setListSearch] = useState("");
  const [listStageFilter, setListStageFilter] = useState<"all" | "execution" | "others">("all");

  const activeRequestId = useMemo(() => {
    const fromParam = parseInt(params.id || "0");
    if (fromParam > 0) return fromParam;
    if (typeof window !== "undefined") {
      const sp = new URLSearchParams(window.location.search);
      const q = sp.get("requestId");
      if (q) return parseInt(q);
    }
    return 0;
  }, [params.id]);

  const requestId = activeRequestId;

  useDocumentTitle(requestId > 0 ? `المستودع الافتراضي #${requestId} - سدانة` : "المستودع الافتراضي - طلبات سدانة");

  const executionStageCount = useMemo(() => {
    return sedanaRequests.filter((r: any) => r.currentStage === "execution").length;
  }, [sedanaRequests]);

  const otherStagesCount = useMemo(() => {
    return sedanaRequests.length - executionStageCount;
  }, [sedanaRequests, executionStageCount]);

  const filteredRequests = useMemo(() => {
    let result = sedanaRequests;
    if (listStageFilter === "execution") {
      result = result.filter((r: any) => r.currentStage === "execution");
    } else if (listStageFilter === "others") {
      result = result.filter((r: any) => r.currentStage !== "execution");
    }

    if (listSearch.trim()) {
      const q = listSearch.trim().toLowerCase();
      result = result.filter((r: any) =>
        r.requestNumber?.toLowerCase().includes(q) ||
        r.mosqueName?.toLowerCase().includes(q) ||
        r.mosqueCity?.toLowerCase().includes(q) ||
        r.descriptiveName?.toLowerCase().includes(q)
      );
    }
    return result;
  }, [sedanaRequests, listStageFilter, listSearch]);

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
  const [isDeliveryModalOpen, setIsDeliveryModalOpen] = useState(false);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);

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

  // تأكيد إخراج المواد واعتماد الصرف من قبل المسؤول
  const [selectedOutboundForSupervisor, setSelectedOutboundForSupervisor] = useState<any | null>(null);
  const [isConfirmSupervisorModalOpen, setIsConfirmSupervisorModalOpen] = useState(false);
  const [supervisorOutboundDate, setSupervisorOutboundDate] = useState(new Date().toISOString().split("T")[0]);
  const [supervisorOutboundMethod, setSupervisorOutboundMethod] = useState<"direct_imam" | "courier_delivery" | "warehouse_pickup" | "scheduled_batch">("direct_imam");
  const [supervisorOutboundRecipient, setSupervisorOutboundRecipient] = useState("");
  const [supervisorOutboundRole, setSupervisorOutboundRole] = useState("إمام المسجد");
  const [supervisorOutboundPhone, setSupervisorOutboundPhone] = useState("");
  const [supervisorOutboundLocation, setSupervisorOutboundLocation] = useState("");
  const [supervisorOutboundNotes, setSupervisorOutboundNotes] = useState("");
  const [supervisorOutboundItems, setSupervisorOutboundItems] = useState<Record<string, number>>({});

  const confirmSupervisorOutboundMutation = trpc.sedanaExecution.confirmSupervisorOutbound.useMutation({
    onSuccess: () => {
      toast.success("تم تأكيد واعتماد إخراج المواد وإصدار مسوغ الصرف وأمر التسليم الميداني بنجاح");
      setIsConfirmSupervisorModalOpen(false);
      setSelectedOutboundForSupervisor(null);
      utils.sedanaExecution.getVirtualInventory.invalidate({ requestId });
      utils.requests.getById.invalidate({ id: requestId });
    },
    onError: (err) => toast.error(err.message || "حدث خطأ أثناء اعتماد أمر الإخراج"),
  });

  const handleOpenSupervisorConfirmModal = (out: any) => {
    setSelectedOutboundForSupervisor(out);
    setSupervisorOutboundDate(out.scheduledDate || new Date().toISOString().split("T")[0]);
    setSupervisorOutboundMethod(out.outboundMethod || "direct_imam");
    setSupervisorOutboundRecipient(out.recipientName || mosque?.imamName || "إمام المسجد");
    setSupervisorOutboundRole(out.recipientRole || "إمام المسجد");
    setSupervisorOutboundPhone(out.recipientPhone || mosque?.imamPhone || "");
    setSupervisorOutboundLocation(out.deliveryLocation || [mosque?.name, mosque?.district, mosque?.city].filter(Boolean).join(" - "));
    setSupervisorOutboundNotes(out.notes || "");
    const itemQtys: Record<string, number> = {};
    (out.items || []).forEach((it: any) => {
      itemQtys[it.id] = Number(it.quantity || 0);
    });
    setSupervisorOutboundItems(itemQtys);
    setIsConfirmSupervisorModalOpen(true);
  };

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

  // تسليم الطلب (مرحلة الاستلام - Handover) المحمي بكلمة تأكيد
  const [isHandoverModalOpen, setIsHandoverModalOpen] = useState(false);
  const [confirmationWord, setConfirmationWord] = useState("");
  const [handoverNotes, setHandoverNotes] = useState("");

  const handoverMutation = trpc.sedanaExecution.handoverSedanaRequest.useMutation({
    onSuccess: (res) => {
      toast.success(res.message || "تم تسليم الطلب وتحويله إلى مرحلة التسليم بنجاح");
      setIsHandoverModalOpen(false);
      setConfirmationWord("");
      setHandoverNotes("");
      utils.sedanaExecution.getVirtualInventory.invalidate({ requestId });
      utils.requests.getById.invalidate({ id: requestId });
    },
    onError: (err) => {
      toast.error(err.message || "حدث خطأ أثناء تسليم الطلب");
    },
  });

  const req = data?.request;
  const mosque = data?.mosque;
  const inventoryItems = data?.inventoryItems || [];
  const availableReferences = (data as any)?.availableReferences || [];
  const disbursementOrders: any[] = (data as any)?.disbursementOrders || [];
  const inwardOrders = data?.inwardOrders || [];
  const outboundOrders = data?.outboundOrders || [];
  const deliveryOrders = data?.deliveryOrders || [];
  const handoverValidation = (data as any)?.handoverValidation;



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

  // الانتقال إلى صفحة إصدار أمر إخراج جديد المنفصلة
  const handleOpenOutboundModal = () => {
    setLocation(`/requests/${requestId}/sedana-outbound/new`);
  };

  // تصدير بيانات المستودع الافتراضي إلى Excel
  const handleExportExcel = async () => {
    try {
      setIsExporting(true);
      if (filteredRequests.length === 0) {
        toast.info("لا توجد بيانات لتصديرها");
        return;
      }
      const columns = [
        { header: "رقم الطلب", align: "center" as const, minWidth: 14 },
        { header: "اسم المسجد", align: "right" as const, minWidth: 26 },
        { header: "المدينة", align: "center" as const, minWidth: 16 },
        { header: "المرحلة الحالية", align: "center" as const, minWidth: 20 },
        { header: "الحالة", align: "center" as const, minWidth: 16 },
        { header: "عدد البنود", align: "center" as const, minWidth: 14 },
        { header: "أوامر الإدخال", align: "center" as const, minWidth: 14 },
        { header: "أوامر الإخراج", align: "center" as const, minWidth: 14 },
        { header: "أوامر التسليم", align: "center" as const, minWidth: 14 },
      ];
      const rows = filteredRequests.map((r: any) => [
        `#${r.requestNumber || r.id}`,
        r.mosqueName || "",
        r.mosqueCity || "",
        STAGE_LABELS[r.currentStage] || r.currentStage || "",
        r.status || "",
        r.itemsCount || 0,
        r.inwardCount || 0,
        r.outboundCount || 0,
        r.deliveryCount || 0,
      ]);
      await exportStyledExcel({
        sheetName: "طلبات المستودع الافتراضي",
        columns,
        rows,
        fileName: `Sedana_Warehouse_${new Date().toISOString().split("T")[0]}.xlsx`,
      });
      toast.success("تم تصدير بيانات المستودع الافتراضي بنجاح");
    } catch (e: any) {
      toast.error(e?.message || "حدث خطأ أثناء تصدير البيانات");
    } finally {
      setIsExporting(false);
    }
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
        {requestId === 0 ? (
          <div className="space-y-6">
            {/* الترويسة الرئيسية */}
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between bg-card p-4 sm:p-6 rounded-2xl border border-border/80 shadow-xs">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 border border-emerald-200 dark:border-emerald-800">
                    <Boxes className="w-6 h-6" />
                  </div>
                  <h1 className="text-xl sm:text-2xl font-black text-foreground">
                    المستودع الافتراضي لطلبات سدانة
                  </h1>
                  <Badge variant="outline" className="text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 text-xs font-bold">
                    برنامج سدانة
                  </Badge>
                </div>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  اختر أحد طلبات سدانة في مرحلة التشغيل والتنفيذ لإدارة المخزون الافتراضي، أوامر الإدخال، الإخراج، ومحاضر التسليم
                </p>
              </div>

              <div className="flex items-center gap-2">
                {canExport && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleExportExcel}
                    disabled={isExporting}
                    className="text-xs font-bold gap-1.5 h-9"
                  >
                    {isExporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />}
                    <span>{isExporting ? "جاري التصدير..." : "تصدير إلى Excel"}</span>
                  </Button>
                )}
                <Badge className="bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border-emerald-200 px-3 py-1.5 font-bold text-xs gap-1.5 shadow-2xs">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                  <span>{executionStageCount} طلبات في مرحلة التشغيل والتنفيذ</span>
                </Badge>
              </div>
            </div>

            {/* بطاقات الإحصائيات السريعة */}
            <div className="grid gap-3 grid-cols-1 sm:grid-cols-3">
              <Card className="border border-border/80 shadow-2xs hover:shadow-xs transition-shadow">
                <CardContent className="p-4 flex items-center justify-between">
                  <div>
                    <p className="text-[11px] font-semibold text-muted-foreground">إجمالي طلبات المستودع</p>
                    <p className="text-2xl font-black text-foreground mt-0.5">{sedanaRequests.length}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">في مرحلة التنفيذ وما بعدها</p>
                  </div>
                  <div className="w-11 h-11 rounded-xl flex items-center justify-center bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                    <Building2 className="w-5 h-5" />
                  </div>
                </CardContent>
              </Card>

              <Card className="border-2 border-emerald-500/30 dark:border-emerald-700/40 bg-emerald-50/20 dark:bg-emerald-950/10 shadow-2xs hover:shadow-xs transition-shadow">
                <CardContent className="p-4 flex items-center justify-between">
                  <div>
                    <p className="text-[11px] font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1">
                      <span>مرحلة التشغيل والتنفيذ</span>
                      <span className="text-[10px] bg-emerald-200/60 dark:bg-emerald-900/60 px-1.5 py-0.2 rounded font-normal">نشط</span>
                    </p>
                    <p className="text-2xl font-black text-emerald-700 dark:text-emerald-400 mt-0.5">{executionStageCount}</p>
                    <p className="text-[10px] text-emerald-600/80 dark:text-emerald-400/80 mt-0.5">جاهزة لإدارة المستودع والإخراج</p>
                  </div>
                  <div className="w-11 h-11 rounded-xl flex items-center justify-center bg-emerald-100 dark:bg-emerald-950 text-emerald-600 border border-emerald-200 dark:border-emerald-800">
                    <Sparkles className="w-5 h-5" />
                  </div>
                </CardContent>
              </Card>

              <Card className="border border-border/80 shadow-2xs hover:shadow-xs transition-shadow">
                <CardContent className="p-4 flex items-center justify-between">
                  <div>
                    <p className="text-[11px] font-semibold text-muted-foreground">التسليم والإغلاق</p>
                    <p className="text-2xl font-black text-foreground mt-0.5">{otherStagesCount}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">مكتملة الصرف أو الاستلام</p>
                  </div>
                  <div className="w-11 h-11 rounded-xl flex items-center justify-center bg-purple-50 dark:bg-purple-950/30 text-purple-600">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* شريط البحث والتصفية */}
            <div className="flex flex-col sm:flex-row items-center gap-3 bg-card p-3 sm:p-4 rounded-xl border border-border/80 shadow-2xs">
              <div className="relative flex-1 w-full">
                <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="البحث برقم الطلب، اسم المسجد، المدينة، أو الوصف..."
                  value={listSearch}
                  onChange={(e) => setListSearch(e.target.value)}
                  className="pr-9 pl-9 h-10 text-xs"
                />
                {listSearch && (
                  <button
                    type="button"
                    onClick={() => setListSearch("")}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5 rounded cursor-pointer"
                  >
                    ×
                  </button>
                )}
              </div>

              <div className="flex items-center gap-1.5 w-full sm:w-auto shrink-0 overflow-x-auto pb-1 sm:pb-0">
                <Button
                  size="sm"
                  variant={listStageFilter === "all" ? "default" : "outline"}
                  onClick={() => setListStageFilter("all")}
                  className={`text-xs font-bold h-9 px-3 cursor-pointer ${listStageFilter === "all" ? "bg-emerald-600 hover:bg-emerald-700 text-white" : ""}`}
                >
                  الكل ({sedanaRequests.length})
                </Button>
                <Button
                  size="sm"
                  variant={listStageFilter === "execution" ? "default" : "outline"}
                  onClick={() => setListStageFilter("execution")}
                  className={`text-xs font-bold h-9 px-3 gap-1.5 cursor-pointer ${listStageFilter === "execution" ? "bg-emerald-600 hover:bg-emerald-700 text-white" : "text-emerald-700 border-emerald-300"}`}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>التشغيل والتنفيذ ({executionStageCount})</span>
                </Button>
                <Button
                  size="sm"
                  variant={listStageFilter === "others" ? "default" : "outline"}
                  onClick={() => setListStageFilter("others")}
                  className={`text-xs font-bold h-9 px-3 cursor-pointer ${listStageFilter === "others" ? "bg-emerald-600 hover:bg-emerald-700 text-white" : ""}`}
                >
                  التسليم والإغلاق ({otherStagesCount})
                </Button>
              </div>
            </div>

            {/* شبكة كروت الطلبات */}
            {isRequestsLoading ? (
              <div className="p-12 text-center text-muted-foreground space-y-2">
                <Loader2 className="w-8 h-8 animate-spin mx-auto text-emerald-600" />
                <p className="text-xs">جاري تحميل طلبات سدانة...</p>
              </div>
            ) : filteredRequests.length === 0 ? (
              <div className="p-12 text-center bg-card rounded-2xl border border-dashed border-border text-muted-foreground space-y-3">
                <Boxes className="w-12 h-12 mx-auto text-muted-foreground/40" />
                <p className="text-sm font-bold text-foreground">لا توجد طلبات سدانة مطابقة للبحث أو التصفية</p>
                <p className="text-xs text-muted-foreground">جرب مسح البحث أو تغيير فلتر المرحلة</p>
              </div>
            ) : (
              <div className="rounded-xl border border-border/80 bg-card overflow-hidden shadow-xs">
                <div className="overflow-x-auto">
                  <Table className="w-full text-right text-xs">
                    <TableHeader className="bg-muted/60">
                      <TableRow className="hover:bg-transparent border-b border-border/80">
                        <TableHead className="text-right font-bold py-3 text-foreground w-[130px]">رقم الطلب</TableHead>
                        <TableHead className="text-right font-bold py-3 text-foreground min-w-[220px]">المسجد والموقع</TableHead>
                        <TableHead className="text-right font-bold py-3 text-foreground min-w-[150px]">مرحلة الطلب</TableHead>
                        <TableHead className="text-center font-bold py-3 text-foreground w-[100px]">البنود</TableHead>
                        <TableHead className="text-center font-bold py-3 text-foreground w-[110px]">أوامر الإدخال</TableHead>
                        <TableHead className="text-center font-bold py-3 text-foreground w-[110px]">أوامر الإخراج</TableHead>
                        <TableHead className="text-center font-bold py-3 text-foreground w-[110px]">محاضر التسليم</TableHead>
                        <TableHead className="text-left font-bold py-3 text-foreground w-[140px] pl-4">الإجراء</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredRequests.map((r: any) => {
                        const isExec = r.currentStage === "execution";
                        return (
                          <TableRow
                            key={r.id}
                            onClick={() => setLocation(`/requests/${r.id}/sedana-execution`)}
                            className={`cursor-pointer transition-colors border-b border-border/60 ${
                              isExec
                                ? "bg-emerald-500/[0.04] hover:bg-emerald-500/[0.09] dark:bg-emerald-950/20 dark:hover:bg-emerald-950/35 border-r-4 border-r-emerald-500 font-medium"
                                : "hover:bg-muted/50"
                            }`}
                          >
                            {/* رقم الطلب */}
                            <TableCell className="py-3 font-mono font-black text-xs text-foreground">
                              <span className="inline-block bg-muted/80 px-2.5 py-1 rounded-md border border-border/60">
                                #{r.requestNumber}
                              </span>
                            </TableCell>

                            {/* المسجد والموقع */}
                            <TableCell className="py-3">
                              <div className="space-y-0.5">
                                <div className="font-bold text-sm text-foreground flex items-center gap-1.5">
                                  <span>{r.mosqueName}</span>
                                </div>
                                <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                                  <Building2 className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                                  <span>{r.mosqueCity || "المدينة غير محددة"}</span>
                                  {r.descriptiveName && (
                                    <>
                                      <span>•</span>
                                      <span className="truncate max-w-[200px] text-foreground/80 font-medium">
                                        {r.descriptiveName}
                                      </span>
                                    </>
                                  )}
                                </div>
                              </div>
                            </TableCell>

                            {/* مرحلة الطلب */}
                            <TableCell className="py-3">
                              {isExec ? (
                                <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-300 font-bold text-xs gap-1 shadow-2xs">
                                  <Sparkles className="w-3 h-3 text-emerald-600" />
                                  <span>التشغيل والتنفيذ</span>
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="text-xs text-muted-foreground font-normal">
                                  {STAGE_LABELS[r.currentStage] || r.currentStage}
                                </Badge>
                              )}
                            </TableCell>

                            {/* عدد البنود */}
                            <TableCell className="py-3 text-center">
                              <span className="font-bold text-xs text-foreground">{r.itemsCount || 0}</span>
                              <span className="text-[10px] text-muted-foreground mr-1">صنف</span>
                            </TableCell>

                            {/* أوامر الإدخال */}
                            <TableCell className="py-3 text-center">
                              <span className={`inline-flex items-center justify-center min-w-[26px] h-6 px-1.5 rounded-md text-xs font-bold ${
                                (r.inwardCount || 0) > 0
                                  ? "bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800"
                                  : "text-muted-foreground bg-muted/40"
                              }`}>
                                {r.inwardCount || 0}
                              </span>
                            </TableCell>

                            {/* أوامر الإخراج */}
                            <TableCell className="py-3 text-center">
                              <span className={`inline-flex items-center justify-center min-w-[26px] h-6 px-1.5 rounded-md text-xs font-bold ${
                                (r.outboundCount || 0) > 0
                                  ? "bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800"
                                  : "text-muted-foreground bg-muted/40"
                              }`}>
                                {r.outboundCount || 0}
                              </span>
                            </TableCell>

                            {/* محاضر التسليم */}
                            <TableCell className="py-3 text-center">
                              <span className={`inline-flex items-center justify-center min-w-[26px] h-6 px-1.5 rounded-md text-xs font-bold ${
                                (r.deliveryCount || 0) > 0
                                  ? "bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800"
                                  : "text-muted-foreground bg-muted/40"
                              }`}>
                                {r.deliveryCount || 0}
                              </span>
                            </TableCell>

                            {/* زر الإجراء */}
                            <TableCell className="py-3 text-left pl-4">
                              <Button
                                size="sm"
                                className={`h-8 px-3 text-xs font-bold gap-1.5 cursor-pointer shadow-xs whitespace-nowrap ${
                                  isExec
                                    ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                                    : "bg-primary hover:bg-primary/90 text-primary-foreground"
                                }`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setLocation(`/requests/${r.id}/sedana-execution`);
                                }}
                              >
                                <Boxes className="w-3.5 h-3.5" />
                                <span>دخول المستودع</span>
                                <ArrowLeft className="w-3.5 h-3.5 mr-auto" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}
          </div>
        ) : (
          <>
            {/* الترويسة العلوية مع شريط اختيار طلب سدانة */}
            <div className="flex flex-col gap-4 border-b pb-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setLocation("/sedana-warehouse")}
                      className="h-8 px-2.5 text-xs font-bold gap-1.5 text-muted-foreground hover:text-foreground border-border bg-card cursor-pointer"
                    >
                      <ArrowRight className="w-4 h-4" />
                      <span>العودة لقائمة الطلبات</span>
                    </Button>
                    <div className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300">
                      <Boxes className="w-5 h-5" />
                    </div>
                    <h1 className="text-xl sm:text-2xl font-bold text-foreground">
                      المستودع الافتراضي والتنفيذ المجدول
                    </h1>
                    <Badge variant="outline" className="text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-xs font-bold">
                      برنامج سدانة
                    </Badge>
                  </div>
                  <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                    إدارة إدخال البنود الموردة، جدولة أوامر الإخراج ومسوغات الصرف، وإصدار أوامر التسليم الميداني لمسجد <span className="font-bold text-foreground">{mosque?.name || "المسجد"}</span> {req?.requestNumber ? `(#${req.requestNumber})` : ""}
                  </p>
                </div>
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
                <p className="text-[11px] font-semibold text-muted-foreground">سجلات وحركات المستودع</p>
                <p className="text-xl font-extrabold text-purple-700 dark:text-purple-400 mt-0.5">
                  {inwardOrders.length + outboundOrders.length} <span className="text-xs font-normal text-muted-foreground">حركة</span>
                </p>
              </div>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-purple-50 dark:bg-purple-950/40 text-purple-600">
                <History className="w-5 h-5" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* التبويبات الرئيسية */}
        <Tabs defaultValue="stock" dir="rtl" className="space-y-4">
          <TabsList dir="rtl" className="bg-muted/40 p-1 rounded-xl w-full grid grid-cols-1 sm:grid-cols-3 gap-1 h-auto">
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
            <TabsTrigger value="records" className="text-xs font-bold gap-1.5">
              <History className="w-3.5 h-3.5" />
              <span>سجلات المستودع</span>
              <span className="bg-muted px-1.5 py-0.2 rounded-full text-[10px]">{inwardOrders.length + outboundOrders.length}</span>
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
                {canInward && (
                  <div className="flex items-center gap-2">
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
                )}
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto" dir="rtl">
                  <Table className="text-xs text-right" dir="rtl">
                    <TableHeader className="bg-muted/30">
                      <TableRow className="border-b">
                        <th className="p-3 w-10 text-center font-bold">#</th>
                        <th className="p-3 font-bold min-w-[170px]">الصنف والتصنيف</th>
                        <th className="p-3 font-bold text-center min-w-[120px]">الكمية المعتمدة</th>
                        <th className="p-3 font-bold text-center min-w-[130px] text-emerald-700 dark:text-emerald-400">المدخل بالمستودع</th>
                        <th className="p-3 font-bold text-center min-w-[130px] text-sky-700 dark:text-sky-400">المصروف / المجدول</th>
                        <th className="p-3 font-bold text-center min-w-[130px] text-indigo-700 dark:text-indigo-400">المتاح للصرف</th>
                        <th className="p-3 font-bold text-center min-w-[130px] text-purple-700 dark:text-purple-400">المستلم نهائياً</th>
                      </TableRow>
                    </TableHeader>
                    <TableBody className="divide-y divide-border">
                      {inventoryItems.map((it: any, idx: number) => (
                        <TableRow key={it.id} className="hover:bg-muted/10 transition-colors">
                          <td className="p-3 text-center">
                            <span className="font-mono text-xs font-bold text-muted-foreground bg-muted/50 px-2 py-1 rounded">
                              {idx + 1}
                            </span>
                          </td>
                          <td className="p-3">
                            <div className="font-bold text-foreground text-sm">{it.name}</div>
                            <div className="text-[11px] text-muted-foreground flex items-center gap-1.5 mt-1">
                              <span className="bg-muted px-2 py-0.5 rounded font-medium">{it.category || "مواد وتجهيزات"}</span>
                              {it.description && (
                                <span className="truncate max-w-[160px]">({it.description})</span>
                              )}
                            </div>
                          </td>
                          <td className="p-3 text-center">
                            <div className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 shadow-2xs">
                              <span className="font-mono text-base font-black text-slate-900 dark:text-slate-100">{it.approvedQty}</span>
                              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">{it.unit}</span>
                            </div>
                          </td>
                          <td className="p-3 text-center">
                            <div className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 shadow-2xs">
                              <span className="font-mono text-base font-black">{it.totalInward}</span>
                              <span className="text-xs font-semibold">{it.unit}</span>
                            </div>
                          </td>
                          <td className="p-3 text-center">
                            <div className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800 text-sky-800 dark:text-sky-300 shadow-2xs">
                              <span className="font-mono text-base font-black">{it.totalOutbound}</span>
                              <span className="text-xs font-semibold">{it.unit}</span>
                            </div>
                          </td>
                          <td className="p-3 text-center">
                            <div className="inline-flex flex-col items-center justify-center">
                              <div
                                className={`inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg border shadow-2xs transition-colors ${
                                  it.availableStock <= 0
                                    ? "bg-red-50 text-red-700 border-red-300 dark:bg-red-950/50 dark:text-red-300 dark:border-red-800"
                                    : "bg-indigo-50 text-indigo-800 border-indigo-200 dark:bg-indigo-950/50 dark:text-indigo-300 dark:border-indigo-800"
                                }`}
                              >
                                <span className="font-mono text-base font-black">{it.availableStock}</span>
                                <span className="text-xs font-semibold">{it.unit}</span>
                              </div>
                              {it.availableStock <= 0 && (
                                <span className="text-[10px] font-bold text-red-600 dark:text-red-400 mt-1">
                                  نفد الرصيد
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="p-3 text-center">
                            <div className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 text-purple-800 dark:text-purple-300 shadow-2xs">
                              <span className="font-mono text-base font-black">{it.totalDelivered}</span>
                              <span className="text-xs font-semibold">{it.unit}</span>
                            </div>
                          </td>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* التبويب 2: أوامر الإخراج ومسوغات الصرف */}
          <TabsContent value="outbound" dir="rtl" className="space-y-4">
            {/* بطاقة: البنود المسجلة في الطلب وجدول الصرف الدوري */}
            <Card className="border border-border/80 shadow-2xs">
              <CardHeader className="p-4 border-b flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-muted/10">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-sky-50 dark:bg-sky-950/40 text-sky-600 border border-sky-200 dark:border-sky-800">
                      <CalendarDays className="w-4 h-4" />
                    </div>
                    <CardTitle className="text-sm font-bold text-foreground">
                      البنود المسجلة في الطلب وجدول الصرف الدوري
                    </CardTitle>
                  </div>
                  <CardDescription className="text-xs">
                    متابعة الأصناف المعتمدة بالطلب، فترات الصرف المقررة (شهرياً / ربع سنوياً)، رصيد المستودع، ومواعيد خروج الدفعات الدورية
                  </CardDescription>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto" dir="rtl">
                  <Table className="text-xs text-right" dir="rtl">
                    <TableHeader className="bg-muted/30">
                      <TableRow className="border-b">
                        <th className="p-3 w-10 text-center font-bold">#</th>
                        <th className="p-3 font-bold min-w-[170px]">اسم الصنف والتصنيف</th>
                        <th className="p-3 font-bold text-center min-w-[120px]">الكمية المقررة بالطلب</th>
                        <th className="p-3 font-bold text-center min-w-[110px]">فترة / دورية الصرف</th>
                        <th className="p-3 font-bold text-center min-w-[90px]">رقم الدفعة</th>
                        <th className="p-3 font-bold text-center min-w-[130px] bg-muted/40">الموجود بالمستودع</th>
                        <th className="p-3 font-bold text-center min-w-[220px]">⏱ العداد التنازلي للدفعة التالية</th>
                      </TableRow>
                    </TableHeader>
                    <TableBody className="divide-y divide-border">
                      {inventoryItems.map((it: any, idx: number) => {
                        const freq = it.frequency || it.period || "شهري";
                        const isMonthly = freq.includes("شهر") || freq === "شهري";
                        const isQuarterly = freq.includes("ربع") || freq === "ربع سنوي";

                        const countdown = getCountdown(it.nextDueDate);
                        const progressPct = it.nextDueDate && it.frequencyDays && countdown && !countdown.isOverdue
                          ? Math.min(100, Math.max(0, 100 - (countdown.totalMs / (it.frequencyDays * 86400000)) * 100))
                          : it.nextDueDate && countdown?.isOverdue ? 100 : 0;

                        const cycleQty = it.cycleQuantity || 1;
                        const availableStock = it.availableStock || 0;
                        const isStockAvailable = availableStock >= cycleQty;
                        const hasPendingConfirmation = (it.pendingConfirmationQty || 0) > 0;
                        const hasPendingReceipt = (it.pendingReceiptQty || 0) > 0;
                        const isCompleted = (it.totalOutbound || 0) >= it.approvedQty;

                        return (
                          <TableRow key={it.id || idx} className="hover:bg-muted/10 transition-colors">
                            <td className="p-3 text-center">
                              <span className="font-mono text-xs font-bold text-muted-foreground bg-muted/50 px-2 py-1 rounded">
                                {idx + 1}
                              </span>
                            </td>
                            <td className="p-3">
                              <div className="font-bold text-foreground text-sm">{it.name}</div>
                              <div className="text-[11px] text-muted-foreground flex items-center gap-1.5 mt-1">
                                <span className="bg-muted px-2 py-0.5 rounded font-medium">{it.category || "مواد وتجهيزات"}</span>
                                {it.description && <span className="truncate max-w-[160px]">({it.description})</span>}
                              </div>
                            </td>
                            <td className="p-3 text-center">
                              <div className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 shadow-2xs">
                                <span className="font-mono text-base font-black text-slate-900 dark:text-slate-100">{it.approvedQty}</span>
                                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">{it.unit}</span>
                              </div>
                            </td>
                            <td className="p-3 text-center">
                              <Badge
                                variant="outline"
                                className={`text-xs px-2.5 py-1 gap-1 font-bold ${
                                  isMonthly
                                    ? "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:border-blue-800"
                                    : isQuarterly
                                    ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:border-emerald-800"
                                    : "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:border-purple-800"
                                }`}
                              >
                                <Clock className="w-3.5 h-3.5" />
                                <span>{freq}</span>
                              </Badge>
                            </td>
                            <td className="p-3 text-center">
                              <div className="inline-flex flex-col items-center justify-center px-3 py-1.5 rounded-lg bg-muted/60 border border-border/80 shadow-2xs">
                                <span className="font-mono text-base font-black text-primary">
                                  {it.currentCycleNumber ?? 0}
                                </span>
                                <span className="text-[10px] text-muted-foreground font-medium">الدفعة الحالية</span>
                              </div>
                            </td>
                            <td className="p-3 text-center">
                              <div className="inline-flex flex-col items-center justify-center">
                                <div
                                  className={`inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg border shadow-2xs transition-colors ${
                                    !isStockAvailable
                                      ? "bg-red-50 text-red-700 border-red-300 dark:bg-red-950/50 dark:text-red-300 dark:border-red-800"
                                      : "bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800"
                                  }`}
                                >
                                  <span className="font-mono text-base font-black">{availableStock}</span>
                                  <span className="text-xs font-semibold">{it.unit}</span>
                                </div>
                                {!isStockAvailable ? (
                                  <span className="text-[10px] font-bold text-red-600 dark:text-red-400 mt-1 flex items-center gap-0.5">
                                    <AlertTriangle className="w-2.5 h-2.5" />
                                    <span>غير متوفر بالمستودع</span>
                                  </span>
                                ) : (
                                  <span className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400 mt-1">
                                    متوفر بالمستودع
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="p-3 text-center">
                              {hasPendingConfirmation ? (
                                <div className="flex flex-col items-center gap-1">
                                  <Badge variant="outline" className="border-amber-400 bg-amber-50 text-amber-900 text-[10px] font-bold gap-1 animate-pulse">
                                    <Clock className="w-3 h-3" />
                                    بانتظار تأكيد المسؤول
                                  </Badge>
                                  <span className="text-[9px] text-muted-foreground">العداد متوقف مؤقتاً</span>
                                </div>
                              ) : hasPendingReceipt ? (
                                <div className="flex flex-col items-center gap-1">
                                  <Badge variant="outline" className="border-sky-400 bg-sky-50 text-sky-900 text-[10px] font-bold gap-1 animate-pulse">
                                    <Clock className="w-3 h-3 text-sky-600" />
                                    بانتظار استلام الإمام
                                  </Badge>
                                  <span className="text-[9px] text-muted-foreground">العداد يبدأ بعد تأكيد الاستلام</span>
                                </div>
                              ) : !it.nextDueDate ? (
                                <div className="flex flex-col items-center gap-1">
                                  <Badge variant="outline" className="border-slate-300 text-slate-600 bg-slate-50 text-[10px] font-medium gap-1">
                                    <Hourglass className="w-3 h-3" />
                                    بانتظار التوريد
                                  </Badge>
                                  <span className="text-[9px] text-muted-foreground">العداد يبدأ بعد أول توريد</span>
                                </div>
                              ) : countdown ? (
                                <div className="flex flex-col items-center gap-1.5">
                                  {/* شريط التقدم الدائري */}
                                  <div className="relative w-12 h-12">
                                    <svg className="w-12 h-12 -rotate-90" viewBox="0 0 48 48">
                                      <circle cx="24" cy="24" r="20" fill="none" stroke="currentColor" className="text-muted/20" strokeWidth="3" />
                                      <circle
                                        cx="24" cy="24" r="20" fill="none"
                                        strokeWidth="3"
                                        strokeLinecap="round"
                                        strokeDasharray={`${(progressPct / 100) * 125.66} 125.66`}
                                        className={countdown.isOverdue ? "text-red-500 animate-pulse" : countdown.days < 3 ? "text-amber-500" : "text-sky-500"}
                                        stroke="currentColor"
                                      />
                                    </svg>
                                    <div className="absolute inset-0 flex items-center justify-center">
                                      {countdown.isOverdue ? (
                                        <span className="text-red-600 text-[10px] font-black">حان!</span>
                                      ) : (
                                        <span className={`font-black text-xs ${countdown.days < 3 ? "text-amber-700" : "text-sky-700"}`}>{countdown.days}</span>
                                      )}
                                    </div>
                                  </div>
                                  {/* العداد التفصيلي */}
                                  {countdown.isOverdue ? (
                                    <div className="flex flex-col items-center gap-0.5">
                                      <Badge variant="outline" className="border-red-400 bg-red-50 text-red-800 text-[10px] font-bold gap-1 animate-pulse">
                                        <AlertTriangle className="w-3 h-3" />
                                        حان موعد الإخراج!
                                      </Badge>
                                      <span className="text-[9px] text-muted-foreground font-medium">
                                        يجب إخراج {it.cycleQuantity || 1} {it.unit}
                                      </span>
                                    </div>
                                  ) : (
                                    <div className="flex flex-col items-center gap-0.5">
                                      <div className={`flex items-center gap-1 font-mono text-[11px] font-bold ${countdown.days < 3 ? (countdown.days < 1 ? "text-red-700 animate-pulse" : "text-amber-700") : "text-sky-800"}`} dir="ltr">
                                        <span>{String(countdown.days).padStart(2, "0")}d</span>
                                        <span className="text-muted-foreground/40">:</span>
                                        <span>{String(countdown.hours).padStart(2, "0")}h</span>
                                        <span className="text-muted-foreground/40">:</span>
                                        <span>{String(countdown.minutes).padStart(2, "0")}m</span>
                                        <span className="text-muted-foreground/40">:</span>
                                        <span className="text-muted-foreground/60">{String(countdown.seconds).padStart(2, "0")}s</span>
                                      </div>
                                      <span className="text-[9px] text-muted-foreground">
                                        {countdown.days < 1 ? "أقل من يوم!" : countdown.days < 3 ? "اقترب الموعد" : `${countdown.days} يوم متبقي`}
                                      </span>
                                      <span className="text-[8px] text-muted-foreground/60">
                                        يجب إخراج {it.cycleQuantity || 1} {it.unit}
                                      </span>
                                    </div>
                                  )}
                                  {!isStockAvailable && (
                                    <span className="text-[9px] text-red-600 font-bold bg-red-50 dark:bg-red-950/40 px-1.5 py-0.5 rounded border border-red-200 dark:border-red-900">
                                      المخزون بالمستودع غير كافٍ
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <Badge variant="outline" className="border-slate-300 text-slate-600 bg-slate-50 text-[10px] font-medium">
                                  —
                                </Badge>
                              )}
                            </td>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>

            {/* بطاقة: أوامر الإخراج ومسوغات الصرف المحاسبية */}
            <Card className="border border-border/80 shadow-2xs">
              <CardHeader className="p-4 border-b flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-muted/10">
                <div>
                  <CardTitle className="text-sm font-bold text-foreground">
                    أوامر الإخراج المجدولة ومسوغات الصرف المحاسبية
                  </CardTitle>
                  <CardDescription className="text-xs mt-0.5">
                    وفقاً لوثيقة سدانة، يمثل أمر الإخراج مسوغ صرف محاسبي رسمي لخروج المواد من المستودع الافتراضي
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2 self-start sm:self-auto">
                  <Button
                    size="sm"
                    onClick={handleOpenOutboundModal}
                    className="text-xs font-bold gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground shadow-2xs"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>إضافة أمر إخراج</span>
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {outboundOrders.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground space-y-3">
                    <Layers className="w-8 h-8 mx-auto text-muted-foreground/40 stroke-1" />
                    <p className="text-sm font-bold text-foreground">لا توجد أوامر إخراج مجدولة بعد</p>
                    <p className="text-xs max-w-sm mx-auto">
                      يمكنك إصدار أمر إخراج للبنود المستحقة للصرف بعد مرور الوقت وتحديد الكميات المراد إخراجها.
                    </p>
                    <Button
                      size="sm"
                      onClick={handleOpenOutboundModal}
                      className="text-xs font-bold gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground shadow-2xs mx-auto"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>إضافة أمر إخراج الآن</span>
                    </Button>
                  </div>
                ) : (
                  <div className="overflow-x-auto" dir="rtl">
                    <Table className="text-xs text-right" dir="rtl">
                      <TableHeader className="bg-muted/30">
                        <TableRow className="border-b">
                          <th className="p-3 w-10 text-center font-bold">#</th>
                          <th className="p-3 font-bold">رقم أمر الإخراج</th>
                          <th className="p-3 font-bold text-center">تاريخ الإخراج</th>
                          <th className="p-3 font-bold text-center">الأصناف المشمولة</th>
                          <th className="p-3 font-bold text-center">حالة الاعتماد والاستلام</th>
                        </TableRow>
                      </TableHeader>
                      <TableBody className="divide-y divide-border">
                        {outboundOrders.map((out: any, idx: number) => {
                          const isDelivered = out.status === "delivered";

                          return (
                            <TableRow key={out.id} className="hover:bg-muted/10">
                              <td className="p-3 text-center font-mono text-muted-foreground">{idx + 1}</td>
                              <td className="p-3 font-bold font-mono text-foreground">{out.orderNumber}</td>
                              <td className="p-3 text-center font-mono">{out.scheduledDate || out.createdAt?.split("T")[0]}</td>
                              <td className="p-3 text-center">
                                <span className="font-bold text-foreground">{out.items?.length || 0} بنود</span>
                                <div className="text-[10px] text-muted-foreground">
                                  ({out.items?.reduce((s: number, it: any) => s + (Number(it.quantity) || 0), 0) || 0} وحدة إجمالاً)
                                </div>
                              </td>
                              <td className="p-3 text-center">
                                {out.status === "pending_confirmation" ? (
                                  <Badge variant="outline" className="border-amber-400 text-amber-900 bg-amber-50 text-[10px] gap-1 font-bold">
                                    <Clock className="w-3 h-3 text-amber-600 animate-pulse" />
                                    <span>بانتظار تأكيد المسؤول</span>
                                  </Badge>
                                ) : isDelivered ? (
                                  <Badge variant="outline" className="border-emerald-300 text-emerald-800 bg-emerald-50 text-[10px] gap-1 font-bold">
                                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                    <span>معتمد ومؤكد الاستلام ✓</span>
                                  </Badge>
                                ) : (
                                  <Badge variant="outline" className="border-sky-300 text-sky-800 bg-sky-50 text-[10px] gap-1 font-bold">
                                    <Truck className="w-3 h-3 text-sky-600" />
                                    <span>معتمد ومُخرج - بانتظار استلام الإمام</span>
                                  </Badge>
                                )}
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

          {/* التبويب 3: سجلات المستودع (أوامر الإدخال وأوامر الإخراج) */}
          <TabsContent value="records" dir="rtl" className="space-y-4">
            {/* بطاقة إجراء تسليم الطلب وملاحظة وجود مورد */}
            <Card className="border border-border/80 shadow-2xs bg-card overflow-hidden">
              <div className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 border border-emerald-200 dark:border-emerald-800">
                      <PackageCheck className="w-4 h-4" />
                    </div>
                    <h3 className="text-sm font-bold text-foreground">
                      تسليم الطلب ونقله لمرحلة التسليم (Handover)
                    </h3>
                    {req?.currentStage === "handover" ? (
                      <Badge variant="outline" className="bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800 text-xs font-bold gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span>الطلب في مرحلة التسليم</span>
                      </Badge>
                    ) : req?.currentStage === "closed" ? (
                      <Badge variant="outline" className="bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300 border-slate-300 text-xs font-bold gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-slate-600" />
                        <span>الطلب مكتمل ومغلق</span>
                      </Badge>
                    ) : null}
                  </div>
                  
                  {/* ملاحظة وجود مورد وحالة السداد */}
                  <div className="text-xs text-muted-foreground flex flex-wrap items-center gap-2">
                    <span>
                      {handoverValidation?.hasContractInsurance
                        ? "ملاحظة التوريد: نوع التأمين معتمد بعقد لمورد معتمد"
                        : handoverValidation?.hasSupplierInsurance
                        ? "ملاحظة التوريد: نوع التأمين معتمد مع مورد (أمر شراء / مساهمة مجتمعية)"
                        : "ملاحظة التوريد: نوع التأمين مباشر / بدون مورد خارجي"}
                    </span>
                    {(handoverValidation?.hasSupplierInsurance || handoverValidation?.hasContractInsurance) && (
                      <>
                        <span className="text-border">•</span>
                        {handoverValidation?.canHandover ? (
                          <span className="text-emerald-700 dark:text-emerald-400 font-semibold inline-flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>
                              {handoverValidation?.hasContractInsurance && (handoverValidation?.scheduledBatchesTotal ?? 0) > 0
                                ? `كافة الدفعات المجدولة للعقد مسددة بنجاح (${handoverValidation.scheduledBatchesPaid}/${handoverValidation.scheduledBatchesTotal})`
                                : `كافة الدفعات مسددة بنجاح (${handoverValidation.totalPaymentsCount})`}
                            </span>
                          </span>
                        ) : (
                          <span className="text-amber-700 dark:text-amber-400 font-semibold inline-flex items-center gap-1">
                            <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                            <span>{handoverValidation?.blockedReason || "توجد دفعات غير مسددة"}</span>
                          </span>
                        )}
                      </>
                    )}
                  </div>
                </div>

                {/* زر تسليم الطلب */}
                {req?.currentStage !== "handover" && req?.currentStage !== "closed" && (
                  <div className="flex flex-col sm:items-end gap-1 shrink-0">
                    <Button
                      size="sm"
                      disabled={!handoverValidation?.canHandover || handoverMutation.isPending}
                      onClick={() => {
                        setConfirmationWord("");
                        setHandoverNotes("");
                        setIsHandoverModalOpen(true);
                      }}
                      className={`h-9 px-4 text-xs font-bold gap-2 shadow-xs cursor-pointer ${
                        handoverValidation?.canHandover
                          ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                          : "bg-muted text-muted-foreground cursor-not-allowed border border-border opacity-70"
                      }`}
                      title={handoverValidation?.blockedReason || "تسليم الطلب وتحويله لمرحلة التسليم"}
                    >
                      <PackageCheck className="w-4 h-4" />
                      <span>تسليم الطلب</span>
                    </Button>
                    {!handoverValidation?.canHandover && handoverValidation?.blockedReason && (
                      <span className="text-[11px] text-amber-700 dark:text-amber-400 font-medium flex items-center gap-1 max-w-xs text-right" dir="rtl">
                        <AlertTriangle className="w-3 h-3 text-amber-600 shrink-0" />
                        <span>{handoverValidation.blockedReason}</span>
                      </span>
                    )}
                  </div>
                )}
              </div>
            </Card>

            {/* بطاقة: سجلات أوامر الإدخال المستودعي */}
            <Card className="border border-border/80 shadow-2xs">
              <CardHeader className="p-4 border-b flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-muted/10">
                <div>
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 border border-emerald-200 dark:border-emerald-800">
                      <Boxes className="w-4 h-4" />
                    </div>
                    <CardTitle className="text-sm font-bold text-foreground">
                      سجلات أوامر الإدخال المستودعي
                    </CardTitle>
                  </div>
                  <CardDescription className="text-xs mt-0.5">
                    توثيق توريد واستلام المواد إلى المستودع الافتراضي وربطها بأوامر الشراء والصرف
                  </CardDescription>
                </div>
                {canInward && (
                  <Button
                    size="sm"
                    onClick={() => {
                      setLocation(requestId > 0 ? `/requests/${requestId}/sedana-inward/new` : "/sedana-warehouse/inward/new");
                    }}
                    className="text-xs font-bold gap-1 bg-emerald-700 hover:bg-emerald-800 text-white shadow-2xs"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>أمر إدخال جديد</span>
                  </Button>
                )}
              </CardHeader>
              <CardContent className="p-0">
                {inwardOrders.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground space-y-2">
                    <Boxes className="w-8 h-8 mx-auto text-muted-foreground/40 stroke-1" />
                    <p className="text-sm font-bold text-foreground">لا توجد أوامر إدخال مسجلة بعد</p>
                    <p className="text-xs max-w-sm mx-auto">
                      يمكنك تسجيل أمر إدخال جديد للمواد المعتمدة وتوثيق استلامها بالمستودع الافتراضي للمسجد.
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto" dir="rtl">
                    <Table className="text-xs text-right" dir="rtl">
                      <TableHeader className="bg-muted/30">
                        <TableRow className="border-b">
                          <th className="p-3 w-10 text-center font-bold">#</th>
                          <th className="p-3 font-bold">رقم أمر الإدخال</th>
                          <th className="p-3 font-bold">المورد / الجهة الموردة</th>
                          <th className="p-3 font-bold text-center">تاريخ الإدخال</th>
                          <th className="p-3 font-bold text-center">الأصناف المدخلة</th>
                          <th className="p-3 font-bold text-center">الحالة</th>
                        </TableRow>
                      </TableHeader>
                      <TableBody className="divide-y divide-border">
                        {inwardOrders.map((inw: any, idx: number) => (
                          <TableRow key={inw.id || idx} className="hover:bg-muted/10">
                            <td className="p-3 text-center font-mono text-muted-foreground">{idx + 1}</td>
                            <td className="p-3 font-bold font-mono text-foreground">{inw.orderNumber}</td>
                            <td className="p-3 font-semibold text-foreground">
                              {inw.supplierName || "المورد المعتمد"}
                            </td>
                            <td className="p-3 text-center font-mono">{inw.orderDate || inw.createdAt?.split("T")[0]}</td>
                            <td className="p-3 text-center">
                              <span className="font-bold text-emerald-700 dark:text-emerald-400">
                                {inw.items?.length || 0} أصناف
                              </span>
                              <div className="text-[10px] text-muted-foreground">
                                ({inw.items?.reduce((s: number, it: any) => s + (Number(it.quantity) || 0), 0) || 0} وحدة)
                              </div>
                            </td>
                            <td className="p-3 text-center">
                              <Badge variant="outline" className="border-emerald-300 text-emerald-800 bg-emerald-50 text-[10px] gap-1 font-bold">
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                <span>مُدخل ومثبت بالمستودع ✓</span>
                              </Badge>
                            </td>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* بطاقة: سجلات أوامر الإخراج ومسوغات الصرف */}
            <Card className="border border-border/80 shadow-2xs">
              <CardHeader className="p-4 border-b flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-muted/10">
                <div>
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-sky-50 dark:bg-sky-950/40 text-sky-600 border border-sky-200 dark:border-sky-800">
                      <Layers className="w-4 h-4" />
                    </div>
                    <CardTitle className="text-sm font-bold text-foreground">
                      سجلات أوامر الإخراج ومسوغات الصرف المحاسبية
                    </CardTitle>
                  </div>
                  <CardDescription className="text-xs mt-0.5">
                    توثيق خروج المواد المصروفة للمسجد ومسوغات الصرف وإثباتات الاستلام
                  </CardDescription>
                </div>
                <Button
                  size="sm"
                  onClick={handleOpenOutboundModal}
                  className="text-xs font-bold gap-1 bg-primary hover:bg-primary/90 text-primary-foreground shadow-2xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>إضافة أمر إخراج</span>
                </Button>
              </CardHeader>
              <CardContent className="p-0">
                {outboundOrders.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground space-y-2">
                    <Layers className="w-8 h-8 mx-auto text-muted-foreground/40 stroke-1" />
                    <p className="text-sm font-bold text-foreground">لا توجد أوامر إخراج مسجلة بعد</p>
                    <p className="text-xs max-w-sm mx-auto">
                      يمكنك إصدار أمر إخراج جديد وتحديد الكميات المراد صرفها للمسجد.
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto" dir="rtl">
                    <Table className="text-xs text-right" dir="rtl">
                      <TableHeader className="bg-muted/30">
                        <TableRow className="border-b">
                          <th className="p-3 w-10 text-center font-bold">#</th>
                          <th className="p-3 font-bold">رقم أمر الإخراج</th>
                          <th className="p-3 font-bold text-center">تاريخ الإخراج</th>
                          <th className="p-3 font-bold text-center">الأصناف المشمولة</th>
                          <th className="p-3 font-bold text-center">حالة الاعتماد والاستلام</th>
                        </TableRow>
                      </TableHeader>
                      <TableBody className="divide-y divide-border">
                        {outboundOrders.map((out: any, idx: number) => {
                          const isDelivered = out.status === "delivered";

                          return (
                            <TableRow key={out.id} className="hover:bg-muted/10">
                              <td className="p-3 text-center font-mono text-muted-foreground">{idx + 1}</td>
                              <td className="p-3 font-bold font-mono text-foreground">{out.orderNumber}</td>
                              <td className="p-3 text-center font-mono">{out.scheduledDate || out.createdAt?.split("T")[0]}</td>
                              <td className="p-3 text-center">
                                <span className="font-bold text-foreground">{out.items?.length || 0} بنود</span>
                                <div className="text-[10px] text-muted-foreground">
                                  ({out.items?.reduce((s: number, it: any) => s + (Number(it.quantity) || 0), 0) || 0} وحدة)
                                </div>
                              </td>
                              <td className="p-3 text-center">
                                {out.status === "pending_confirmation" ? (
                                  <Badge variant="outline" className="border-amber-400 text-amber-900 bg-amber-50 text-[10px] gap-1 font-bold">
                                    <Clock className="w-3 h-3 text-amber-600 animate-pulse" />
                                    <span>بانتظار تأكيد المسؤول</span>
                                  </Badge>
                                ) : isDelivered ? (
                                  <Badge variant="outline" className="border-emerald-300 text-emerald-800 bg-emerald-50 text-[10px] gap-1 font-bold">
                                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                    <span>معتمد ومؤكد الاستلام ✓</span>
                                  </Badge>
                                ) : (
                                  <Badge variant="outline" className="border-sky-300 text-sky-800 bg-sky-50 text-[10px] gap-1 font-bold">
                                    <Truck className="w-3 h-3 text-sky-600" />
                                    <span>معتمد ومُخرج - بانتظار استلام الإمام</span>
                                  </Badge>
                                )}
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
              {canPrint && (
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
              )}
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

        {/* نافذة تأكيد تسليم الطلب المحمية بكلمة تأكيد */}
        <Dialog open={isHandoverModalOpen} onOpenChange={setIsHandoverModalOpen}>
          <DialogContent className="sm:max-w-md text-right font-sans" dir="rtl">
            <DialogHeader className="text-right">
              <div className="flex items-center gap-2 mb-1">
                <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 border border-emerald-200 dark:border-emerald-800">
                  <PackageCheck className="w-5 h-5" />
                </div>
                <DialogTitle className="text-lg font-bold text-foreground">
                  تسليم الطلب ونقله لمرحلة التسليم
                </DialogTitle>
              </div>
              <DialogDescription className="text-xs text-muted-foreground leading-relaxed">
                أنت على وشك اعتماد تسليم طلب سدانة لمسجد <span className="font-semibold text-foreground">{mosque?.name || "المسجد"}</span> ونقله رسمياً إلى مرحلة <span className="font-bold text-emerald-700 dark:text-emerald-400">"التسليم"</span>.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-3">
              {/* ملخص التحقق المالي والتوريد */}
              <div className="p-3 rounded-xl bg-muted/40 border border-border/80 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">رقم الطلب:</span>
                  <span className="font-bold text-foreground">#{req?.requestNumber || req?.id}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">نوع التأمين:</span>
                  <span className="font-medium text-foreground">
                    {handoverValidation?.hasContractInsurance
                      ? "معتمد بعقد لمورد معتمد"
                      : handoverValidation?.hasSupplierInsurance
                      ? "معتمد مع مورد (أمر شراء / مساهمة مجتمعية)"
                      : "مباشر / بدون مورد خارجي"}
                  </span>
                </div>
                {(handoverValidation?.hasSupplierInsurance || handoverValidation?.hasContractInsurance) && (
                  <div className="flex items-center justify-between pt-1 border-t border-border/60">
                    <span className="text-muted-foreground">حالة دفعات المورد:</span>
                    <span className={`font-bold inline-flex items-center gap-1 ${
                      handoverValidation?.canHandover
                        ? "text-emerald-700 dark:text-emerald-400"
                        : "text-amber-600 dark:text-amber-400"
                    }`}>
                      {handoverValidation?.canHandover ? (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>
                            {handoverValidation?.hasContractInsurance && (handoverValidation?.scheduledBatchesTotal ?? 0) > 0
                              ? `كافة الدفعات المجدولة للعقد مسددة بنجاح (${handoverValidation.scheduledBatchesPaid}/${handoverValidation.scheduledBatchesTotal})`
                              : `كافة الدفعات مسددة بنجاح (${handoverValidation.totalPaymentsCount})`}
                          </span>
                        </>
                      ) : (
                        <>
                          <AlertTriangle className="w-3.5 h-3.5" />
                          <span>{handoverValidation?.blockedReason || "توجد دفعات غير مسددة"}</span>
                        </>
                      )}
                    </span>
                  </div>
                )}
              </div>

              {/* تنبيه أمان وتأكيد */}
              <div className="p-3 rounded-xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-800/60 space-y-2">
                <div className="flex items-start gap-2">
                  <Lock className="w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
                  <div className="text-xs space-y-1">
                    <p className="font-bold text-amber-900 dark:text-amber-200">
                      إجراء محمي يتطلب التأكيد
                    </p>
                    <p className="text-amber-700 dark:text-amber-300/90 leading-relaxed">
                      لتأكيد التسليم ومنع الإجراءات غير المقصودة، يرجى كتابة كلمة <span className="font-extrabold text-foreground underline decoration-emerald-500 underline-offset-4 select-all">تأكيد</span> في المربع أدناه:
                    </p>
                  </div>
                </div>

                <div className="pt-1">
                  <Input
                    placeholder='اكتب كلمة "تأكيد" هنا...'
                    value={confirmationWord}
                    onChange={(e) => setConfirmationWord(e.target.value)}
                    className="h-10 text-center font-bold text-sm tracking-wide bg-background border-amber-300 dark:border-amber-700 focus-visible:ring-emerald-500"
                    autoFocus
                  />
                  {confirmationWord.trim() && confirmationWord.trim() !== "تأكيد" && (
                    <p className="text-[11px] text-destructive mt-1 font-medium">
                      الكلمة المدخلة غير مطابقة. يجب كتابة "تأكيد" بدقة.
                    </p>
                  )}
                  {confirmationWord.trim() === "تأكيد" && (
                    <p className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-1 font-medium flex items-center gap-1">
                      <Check className="w-3.5 h-3.5" />
                      <span>تمت كتابة كلمة التأكيد بشكل صحيح</span>
                    </p>
                  )}
                </div>
              </div>

              {/* ملاحظات إضافية */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">
                  ملاحظات التسليم (اختياري):
                </label>
                <Textarea
                  placeholder="أي ملاحظات أو تفاصيل إضافية حول عملية التسليم..."
                  value={handoverNotes}
                  onChange={(e) => setHandoverNotes(e.target.value)}
                  className="text-xs min-h-[70px] resize-none"
                />
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setIsHandoverModalOpen(false);
                  setConfirmationWord("");
                  setHandoverNotes("");
                }}
                disabled={handoverMutation.isPending}
                className="text-xs cursor-pointer"
              >
                إلغاء
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  if (confirmationWord.trim() !== "تأكيد") {
                    toast.error('يرجى كتابة كلمة "تأكيد" بدقة لإتمام العملية');
                    return;
                  }
                  handoverMutation.mutate({
                    requestId,
                    confirmationWord: confirmationWord.trim(),
                    notes: handoverNotes.trim() || undefined,
                  });
                }}
                disabled={
                  confirmationWord.trim() !== "تأكيد" ||
                  handoverMutation.isPending ||
                  !handoverValidation?.canHandover
                }
                className="text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer gap-1.5 disabled:opacity-50"
              >
                {handoverMutation.isPending ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>جاري تسليم الطلب...</span>
                  </>
                ) : (
                  <>
                    <PackageCheck className="w-4 h-4" />
                    <span>تأكيد وتسليم الطلب الآن</span>
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
