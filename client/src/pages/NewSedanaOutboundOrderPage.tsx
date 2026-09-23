import { useState, useMemo, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ArrowRight,
  Boxes,
  Building2,
  Calendar,
  User,
  Phone,
  MapPin,
  Truck,
  Sparkles,
  Loader2,
  Check,
  Package,
  Layers,
  FileSpreadsheet,
  AlertTriangle,
  Info,
  Clock,
  Store,
  CalendarDays,
  Lock,
} from "lucide-react";
import { toast } from "sonner";
import { useDocumentTitle } from "@/contexts/DocumentTitleContext";
import { usePermission } from "@/hooks/usePermission";

const OUTBOUND_METHODS = [
  {
    id: "direct_imam",
    label: "تسليم ميداني مباشر بالمسجد",
    description: "تسليم المواد يدوياً لإمام أو مؤذن المسجد في الموقع",
    icon: Building2,
    badgeColor: "bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/40 dark:border-emerald-800",
  },
  {
    id: "courier_delivery",
    label: "شحن وتوصيل عبر مندوب / متعهد",
    description: "شحن لوجستي عبر مندوب الجمعية أو شركة نقل للمسجد",
    icon: Truck,
    badgeColor: "bg-sky-50 text-sky-700 border-sky-300 dark:bg-sky-950/40 dark:border-sky-800",
  },
  {
    id: "warehouse_pickup",
    label: "استلام ذاتي من مستودع الجمعية",
    description: "حضور ممثل المسجد أو الإمام واستلام البنود من المستودع المركزي",
    icon: Store,
    badgeColor: "bg-purple-50 text-purple-700 border-purple-300 dark:bg-purple-950/40 dark:border-purple-800",
  },
  {
    id: "scheduled_batch",
    label: "دفعة دورية مجدولة (ربع سنوية)",
    description: "صرف دوري مجدول وفق خطة الصيانة السنوية لبرنامج سدانة",
    icon: CalendarDays,
    badgeColor: "bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950/40 dark:border-amber-800",
  },
];

export default function NewSedanaOutboundOrderPage() {
  const params = useParams<{ id?: string }>();
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const canOutbound = usePermission("sedana_warehouse.outbound");

  // جلب قائمة طلبات سدانة للاختيار
  const { data: sedanaRequests = [] } = trpc.sedanaExecution.listSedanaRequests.useQuery();

  const activeRequestId = useMemo(() => {
    const fromParam = parseInt(params.id || "0");
    if (fromParam > 0) return fromParam;
    const urlParams = new URLSearchParams(window.location.search);
    const fromQuery = parseInt(urlParams.get("requestId") || "0");
    if (fromQuery > 0) return fromQuery;
    if (sedanaRequests.length > 0) return sedanaRequests[0].id;
    return 0;
  }, [params.id, sedanaRequests]);

  const requestId = activeRequestId;

  useDocumentTitle(requestId > 0 ? `أمر إخراج مستودعي #${requestId} - سدانة` : "أمر إخراج مستودعي جديد - سدانة");

  const utils = trpc.useUtils();

  // جلب بيانات المستودع الافتراضي
  const { data, isLoading } = trpc.sedanaExecution.getVirtualInventory.useQuery(
    { requestId },
    { enabled: requestId > 0 }
  );

  const req = data?.request;
  const mosque = data?.mosque;
  const inventoryItems = data?.inventoryItems || [];

  // بيانات النموذج
  const [periodLabel, setPeriodLabel] = useState("الدفعة الربع سنوية الأولى (Q1)");
  const [scheduledDate, setScheduledDate] = useState(
    new Intl.DateTimeFormat('en-CA', { year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())
  );
  const [outboundMethod, setOutboundMethod] = useState<"direct_imam" | "courier_delivery" | "warehouse_pickup" | "scheduled_batch">("direct_imam");
  const [recipientName, setRecipientName] = useState("");
  const [recipientRole, setRecipientRole] = useState("إمام المسجد");
  const [recipientPhone, setRecipientPhone] = useState("");
  const [deliveryLocation, setDeliveryLocation] = useState("");
  const [outboundNotes, setOutboundNotes] = useState("");
  const [outboundItems, setOutboundItems] = useState<Record<string, number>>({});

  // تعبئة البيانات التلقائية للمسجد والمستلم
  useEffect(() => {
    if (mosque) {
      if (!recipientName && mosque.imamName) {
        setRecipientName(mosque.imamName);
      }
      if (!recipientPhone && mosque.imamPhone) {
        setRecipientPhone(mosque.imamPhone);
      }
      if (!deliveryLocation) {
        const locParts = [mosque.name, mosque.district, mosque.city].filter(Boolean);
        setDeliveryLocation(locParts.join(" - "));
      }
    }
  }, [mosque, recipientName, recipientPhone, deliveryLocation]);

  // اقتراح كميات أولية للدفعة المجدولة
  useEffect(() => {
    if (inventoryItems.length > 0 && Object.keys(outboundItems).length === 0) {
      const initial: Record<string, number> = {};
      inventoryItems.forEach((i) => {
        if (i.availableStock > 0) {
          initial[i.id] = i.availableStock;
        }
      });
      setOutboundItems(initial);
    }
  }, [inventoryItems]);

  // إجمالي المخزون المتاح للصرف
  const totalAvailableStockAll = inventoryItems.reduce((acc, i) => acc + (i.availableStock || 0), 0);

  // تعبئة كامل الكميات المتاحة
  const handleFillAllAvailable = () => {
    const updated: Record<string, number> = {};
    inventoryItems.forEach((i) => {
      if (i.availableStock > 0) {
        updated[i.id] = i.availableStock;
      }
    });
    setOutboundItems(updated);
    toast.success("تمت تعبئة كامل الأرصدة المتاحة للصرف");
  };

  // تعيين الكمية لبند واحد بكامل المتاح
  const handleFillSingleAvailable = (itemId: string, maxAvailable: number) => {
    setOutboundItems((prev) => ({
      ...prev,
      [itemId]: maxAvailable,
    }));
  };

  // إحصائيات الإخراج الحالي
  const totalSelectedItemsCount = Object.keys(outboundItems).filter((k) => (outboundItems[k] || 0) > 0).length;
  const totalUnitsToDispatch = Object.keys(outboundItems).reduce((sum, k) => sum + (outboundItems[k] || 0), 0);

  // طفرة إنشاء أمر الإخراج
  const createOutboundMutation = trpc.sedanaExecution.createOutboundOrder.useMutation({
    onSuccess: () => {
      toast.success("تم إصدار أمر الإخراج وتوليد مسوغ الصرف بنجاح، وهو الآن بانتظار تأكيد استلام الإمام");
      utils.sedanaExecution.getVirtualInventory.invalidate({ requestId });
      setLocation(`/requests/${requestId}/sedana-execution`);
    },
    onError: (err) => {
      toast.error(err.message || "حدث خطأ أثناء إصدار أمر الإخراج");
    },
  });

  const handleSubmit = () => {
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
      toast.error("يرجى تحديد كمية موجبة لصنف واحد على الأقل لإتمام أمر الإخراج");
      return;
    }

    // التحقق من تجاوز الرصيد المتاح
    for (const it of items) {
      const found = inventoryItems.find((i) => i.id === it.id);
      const avail = found?.availableStock || 0;
      if (it.quantity > avail) {
        toast.error(`الكمية المدخلة للصنف (${it.itemName}) وقدرها ${it.quantity} تتجاوز الرصيد المتوفر في المستودع (${avail} ${it.unit})`);
        return;
      }
    }

    if (!periodLabel.trim()) {
      toast.error("يرجى كتابة مسمى الدفعة أو الفترة أو غرض الإخراج");
      return;
    }

    createOutboundMutation.mutate({
      requestId,
      periodLabel: periodLabel.trim(),
      scheduledDate,
      outboundMethod,
      recipientName: recipientName.trim() || undefined,
      recipientRole: recipientRole.trim() || undefined,
      recipientPhone: recipientPhone.trim() || undefined,
      deliveryLocation: deliveryLocation.trim() || undefined,
      notes: outboundNotes.trim() || undefined,
      items,
    });
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="p-16 flex flex-col items-center justify-center gap-4 text-center" dir="rtl">
          <Loader2 className="w-10 h-10 animate-spin text-primary" />
          <p className="text-sm font-semibold text-muted-foreground">جاري تحميل بيانات المستودع الافتراضي والبنود المتاحة للصرف...</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-5xl mx-auto px-4 sm:px-0 text-right font-sans" dir="rtl">
        {/* رأس الصفحة */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border/60 pb-4">
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setLocation(requestId > 0 ? `/requests/${requestId}/sedana-execution` : "/sedana-warehouse")}
              className="rounded-xl shrink-0 cursor-pointer hover:bg-muted"
              title="العودة للمستودع الافتراضي"
            >
              <ArrowRight className="h-4 w-4" />
            </Button>
            <div className="text-right">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300">
                  <Truck className="w-5 h-5" />
                </div>
                <h1 className="text-xl sm:text-2xl font-bold text-foreground">
                  إصدار أمر إخراج مستودعي ومسوغ صرف
                </h1>
                <Badge variant="outline" className="text-sky-700 bg-sky-50 dark:bg-sky-950/40 border-sky-300 dark:border-sky-800 text-xs">
                  سدانة
                </Badge>
              </div>
              <p className="text-muted-foreground text-xs sm:text-sm mt-1">
                جدولة وصرف البنود من المستودع الافتراضي لمسجد <span className="font-bold text-foreground">{mosque?.name || "المسجد"}</span> {req?.requestNumber ? `(#${req.requestNumber})` : ""}
              </p>
            </div>
          </div>

          {/* محدد طلب سدانة في حال كان هناك أكثر من طلب */}
          {sedanaRequests.length > 1 && (
            <div className="flex items-center gap-2 shrink-0">
              <Label className="text-xs font-bold text-muted-foreground whitespace-nowrap">الطلب:</Label>
              <Select
                value={String(requestId)}
                onValueChange={(val) => setLocation(`/requests/${val}/sedana-outbound/new`)}
              >
                <SelectTrigger className="h-9 w-52 text-xs font-semibold bg-background" dir="rtl">
                  <SelectValue placeholder="اختر طلب سدانة..." />
                </SelectTrigger>
                <SelectContent dir="rtl" className="max-h-64">
                  {sedanaRequests.map((r) => (
                    <SelectItem key={r.id} value={String(r.id)} className="text-xs">
                      #{r.requestNumber} - {r.mosqueName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        {/* تنبيه في حال عدم توفر رصيد متاح في المستودع */}
        {totalAvailableStockAll === 0 && (
          <div className="p-4 rounded-xl bg-amber-500/10 border-2 border-amber-500/30 text-amber-900 dark:text-amber-200 flex items-start gap-3 text-xs">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-bold text-sm">تنبيه: لا يوجد رصيد متاح للصرف حالياً في المستودع الافتراضي</p>
              <p className="text-[11px] leading-relaxed">
                يجب أولاً تسجيل وإتمام <strong>«أمر إدخال مستودعي»</strong> لإدخال البنود والمواد في رصيد المستودع بعد تنفيذ أمر الصرف المالي، حتى تتمكن من إخراجها وصرفها للمسجد.
              </p>
              <div className="pt-2">
                <Button
                  size="sm"
                  onClick={() => setLocation(`/requests/${requestId}/sedana-inward/new`)}
                  className="h-8 text-xs font-bold gap-1 bg-amber-600 hover:bg-amber-700 text-white cursor-pointer"
                >
                  <Boxes className="w-3.5 h-3.5" />
                  <span>الانتقال لصفحة أمر الإدخال الجديد</span>
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* القسم الأول: بيانات أمر الإخراج وطريقة الإخراج */}
        <Card className="border-border/80 shadow-xs rounded-xl overflow-hidden bg-white dark:bg-slate-900">
          <CardHeader className="bg-muted/30 border-b border-border/50 py-3.5 px-5 text-right">
            <CardTitle className="text-sm font-bold flex items-center gap-2 text-foreground">
              <FileSpreadsheet className="w-4 h-4 text-primary" />
              <span>بيانات أمر الإخراج ومسوغ الصرف</span>
            </CardTitle>
            <CardDescription className="text-xs">
              تحديد طريقة إخراج البند، مسمى الدفعة، تاريخ الصرف، وبيانات المستلم بالمسجد
            </CardDescription>
          </CardHeader>
          <CardContent className="p-5 space-y-5 text-right" dir="rtl">
            {/* اختيار طريقة إخراج البند */}
            <div className="space-y-2">
              <Label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <span>طريقة إخراج البند والتسليم *</span>
                <span className="text-[11px] font-normal text-muted-foreground">(حدد المسار الميداني لإيصال المواد للمسجد)</span>
              </Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
                {OUTBOUND_METHODS.map((m) => {
                  const Icon = m.icon;
                  const isSelected = outboundMethod === m.id;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setOutboundMethod(m.id as any)}
                      className={`p-3.5 rounded-xl border text-right transition-all flex flex-col justify-between gap-2 cursor-pointer ${
                        isSelected
                          ? "border-primary bg-primary/5 ring-2 ring-primary/20 shadow-xs"
                          : "border-border/80 hover:border-border hover:bg-muted/30"
                      }`}
                    >
                      <div className="flex items-center justify-between w-full">
                        <div className={`p-2 rounded-lg ${isSelected ? "bg-primary text-white" : "bg-muted text-muted-foreground"}`}>
                          <Icon className="w-4 h-4" />
                        </div>
                        {isSelected && (
                          <Badge variant="outline" className="text-[10px] font-bold border-primary text-primary bg-primary/10">
                            محدد
                          </Badge>
                        )}
                      </div>
                      <div>
                        <div className="font-bold text-xs text-foreground">{m.label}</div>
                        <div className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">{m.description}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 border-t border-border/50">
              {/* مسمى الدفعة / مسوغ الصرف */}
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">مسمى الدفعة / العملية *</Label>
                <Input
                  value={periodLabel}
                  onChange={(e) => setPeriodLabel(e.target.value)}
                  placeholder="مثال: الدفعة الربع سنوية الأولى (Q1)"
                  className="h-10 text-xs rounded-xl bg-background"
                />
              </div>

              {/* تاريخ الإخراج المجدول */}
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                  <span>تاريخ أمر الإخراج والتوزيع *</span>
                </Label>
                <Input
                  type="date"
                  value={scheduledDate}
                  onChange={(e) => setScheduledDate(e.target.value)}
                  className="h-10 text-xs rounded-xl bg-background text-right"
                />
              </div>

              {/* موقع وعنوان التسليم */}
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-muted-foreground" />
                  <span>موقع التسليم المعتمد</span>
                </Label>
                <Input
                  value={deliveryLocation}
                  onChange={(e) => setDeliveryLocation(e.target.value)}
                  placeholder="موقع المسجد والحي..."
                  className="h-10 text-xs rounded-xl bg-background"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 border-t border-border/50">
              {/* اسم المستلم المعتمد */}
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                  <User className="w-3.5 h-3.5 text-muted-foreground" />
                  <span>اسم المستلم المعتمد (الإمام / المشرف)</span>
                </Label>
                <Input
                  value={recipientName}
                  onChange={(e) => setRecipientName(e.target.value)}
                  placeholder="اسم إمام المسجد أو المستلم..."
                  className="h-10 text-xs rounded-xl bg-background"
                />
              </div>

              {/* صفة المستلم */}
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">صفة المستلم بالمسجد</Label>
                <Select value={recipientRole} onValueChange={setRecipientRole}>
                  <SelectTrigger className="h-10 text-xs rounded-xl bg-background" dir="rtl">
                    <SelectValue placeholder="اختر صفة المستلم..." />
                  </SelectTrigger>
                  <SelectContent dir="rtl">
                    <SelectItem value="إمام المسجد" className="text-xs">إمام المسجد</SelectItem>
                    <SelectItem value="مؤذن المسجد" className="text-xs">مؤذن المسجد</SelectItem>
                    <SelectItem value="مشرف الصيانة بالمسجد" className="text-xs">مشرف الصيانة بالمسجد</SelectItem>
                    <SelectItem value="وكيل الوقف / المتعهد" className="text-xs">وكيل الوقف / المتعهد</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* رقم جوال المستلم */}
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5 text-muted-foreground" />
                  <span>رقم جوال المستلم للتنسيق والتسليم</span>
                </Label>
                <Input
                  value={recipientPhone}
                  onChange={(e) => setRecipientPhone(e.target.value)}
                  placeholder="05XXXXXXXX"
                  className="h-10 text-xs font-mono rounded-xl bg-background"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* القسم الثاني: جدول الأصناف والكميات المخرجة */}
        <Card className="border-border/80 shadow-xs rounded-xl overflow-hidden bg-white dark:bg-slate-900">
          <CardHeader className="bg-muted/30 border-b border-border/50 py-3.5 px-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-right">
            <div>
              <CardTitle className="text-sm font-bold flex items-center gap-2 text-foreground">
                <Package className="w-4 h-4 text-sky-600" />
                <span>أصناف وكميات أمر الإخراج ({inventoryItems.length} بنود معتمدة)</span>
              </CardTitle>
              <CardDescription className="text-xs">
                حدد كمية كل بند للصرف من الرصيد المتوفر بالمستودع الافتراضي وتوليد مسوغ الصرف
              </CardDescription>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleFillAllAvailable}
                disabled={totalAvailableStockAll === 0}
                className="text-xs font-bold gap-1 text-sky-700 dark:text-sky-300 border-sky-300 dark:border-sky-800 hover:bg-sky-50 dark:hover:bg-sky-950/30 cursor-pointer h-8 rounded-lg"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>صرف كامل الرصيد المتاح</span>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto" dir="rtl">
              <Table className="text-xs text-right" dir="rtl">
                <TableHeader className="bg-muted/40">
                  <TableRow className="border-b border-border/60">
                    <TableHead className="w-12 text-center font-bold">#</TableHead>
                    <TableHead className="font-bold min-w-[200px]">الصنف والوصف</TableHead>
                    <TableHead className="text-center font-bold w-24">الكمية المعتمدة</TableHead>
                    <TableHead className="text-center font-bold w-24 text-emerald-700 dark:text-emerald-400">المدخل بالمستودع</TableHead>
                    <TableHead className="text-center font-bold w-24 text-indigo-700 dark:text-indigo-400">المتاح للصرف</TableHead>
                    <TableHead className="text-center font-bold w-40 text-sky-700 dark:text-sky-400">الكمية المراد إخراجها</TableHead>
                    <TableHead className="w-20 text-center font-bold">إجراء</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-border">
                  {inventoryItems.map((it, idx) => {
                    const currentVal = outboundItems[it.id] ?? 0;
                    const isExceeding = currentVal > it.availableStock;
                    return (
                      <TableRow key={it.id} className="hover:bg-muted/10 transition-colors">
                        <TableCell className="text-center font-mono text-muted-foreground font-bold">
                          {idx + 1}
                        </TableCell>
                        <TableCell>
                          <div className="font-bold text-foreground text-xs sm:text-sm">{it.name}</div>
                          {it.description && (
                            <div className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">{it.description}</div>
                          )}
                        </TableCell>
                        <TableCell className="text-center font-mono font-bold">
                          {it.approvedQty} <span className="text-[10px] font-normal text-muted-foreground">{it.unit}</span>
                        </TableCell>
                        <TableCell className="text-center font-mono font-bold text-emerald-700 dark:text-emerald-400">
                          {it.totalInward} <span className="text-[10px] font-normal">{it.unit}</span>
                        </TableCell>
                        <TableCell className="text-center font-mono font-bold text-indigo-700 dark:text-indigo-400">
                          {it.availableStock} <span className="text-[10px] font-normal">{it.unit}</span>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <Input
                              type="number"
                              step="any"
                              min="0"
                              max={it.availableStock}
                              value={currentVal || ""}
                              onChange={(e) => {
                                const val = parseFloat(e.target.value) || 0;
                                setOutboundItems((prev) => ({
                                  ...prev,
                                  [it.id]: val,
                                }));
                              }}
                              placeholder="0"
                              className={`h-9 w-24 text-center font-mono font-bold text-xs bg-slate-50 dark:bg-slate-900 rounded-lg ${
                                isExceeding
                                  ? "border-red-500 text-red-600 focus:ring-red-500"
                                  : "border-sky-300 dark:border-sky-800 focus:ring-sky-500"
                              }`}
                            />
                            <span className="text-[10px] text-muted-foreground font-semibold shrink-0">{it.unit}</span>
                          </div>
                          {isExceeding && (
                            <p className="text-[10px] text-red-600 mt-1 font-semibold">
                              يتجاوز المتاح ({it.availableStock})
                            </p>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          {it.availableStock > 0 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => handleFillSingleAvailable(it.id, it.availableStock)}
                              className="h-7 text-[11px] px-2 text-sky-700 dark:text-sky-300 hover:bg-sky-50 dark:hover:bg-sky-950/40 cursor-pointer"
                              title="صرف كامل المتاح لهذا البند"
                            >
                              المتاح
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            {/* شريط ملخص الكميات */}
            <div className="p-4 bg-muted/20 border-t border-border/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-4 flex-wrap">
                <span className="text-muted-foreground">
                  الأصناف المشمولة بالإخراج: <strong className="font-mono text-foreground font-bold">{totalSelectedItemsCount}</strong> صنف
                </span>
                <span>•</span>
                <span className="text-muted-foreground">
                  إجمالي الوحدات المخرجة: <strong className="font-mono text-sky-700 dark:text-sky-400 font-bold">{totalUnitsToDispatch}</strong> وحدة
                </span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Info className="w-4 h-4 text-sky-600" />
                <span>سيتم إنشاء مسوغ صرف محاسبي رسمي مرتبط بهذا الأمر تلقائياً</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* القسم الثالث: ملاحظات وتوجيهات الإخراج والتوزيع */}
        <Card className="border-border/80 shadow-xs rounded-xl overflow-hidden bg-white dark:bg-slate-900">
          <CardHeader className="bg-muted/30 border-b border-border/50 py-3.5 px-5 text-right">
            <CardTitle className="text-sm font-bold text-foreground">
              ملاحظات وتوجيهات الإخراج الميداني
            </CardTitle>
            <CardDescription className="text-xs">
              أي تعليمات لفريق التوزيع الميداني أو شروط استلام خاصة بمسجد المستفيد
            </CardDescription>
          </CardHeader>
          <CardContent className="p-5 text-right" dir="rtl">
            <Textarea
              value={outboundNotes}
              onChange={(e) => setOutboundNotes(e.target.value)}
              placeholder="مثال: يرجى التنسيق هاتفياً مع إمام المسجد قبل التوصيل بساعتين، والتأكد من توقيع محضر الاستلام الرقمي..."
              rows={3}
              className="text-xs leading-relaxed bg-background rounded-xl border-border focus:ring-primary text-right"
            />
          </CardContent>
        </Card>

        {/* شريط أزرار الإجراءات */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2 pb-8 border-t border-border/60">
          <Button
            type="button"
            variant="outline"
            onClick={() => setLocation(requestId > 0 ? `/requests/${requestId}/sedana-execution` : "/sedana-warehouse")}
            className="h-11 px-6 rounded-xl text-xs font-bold border-border cursor-pointer hover:bg-muted"
          >
            إلغاء والعودة للمستودع
          </Button>

          <Button
            type="button"
            onClick={handleSubmit}
            disabled={createOutboundMutation.isPending || totalSelectedItemsCount === 0}
            className="h-11 px-8 rounded-xl text-xs sm:text-sm font-bold gap-2 shadow-sm transition-all cursor-pointer bg-sky-700 hover:bg-sky-800 text-white"
          >
            {createOutboundMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>جاري حفظ وتوثيق أمر الإخراج...</span>
              </>
            ) : (
              <>
                <Check className="w-4 h-4" />
                <span>إصدار وتوثيق أمر الإخراج المجدول</span>
              </>
            )}
          </Button>
        </div>
      </div>
    </DashboardLayout>
  );
}
