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
  CheckCircle2,
  AlertTriangle,
  FileText,
  Package,
  Calendar,
  User,
  Coins,
  Receipt,
  Sparkles,
  Loader2,
  Check,
  RotateCcw,
  Clock,
  Layers,
  ShieldCheck,
  Info,
} from "lucide-react";
import { toast } from "sonner";
import { useDocumentTitle } from "@/contexts/DocumentTitleContext";

export default function NewSedanaInwardOrderPage() {
  const params = useParams<{ id?: string }>();
  const [, setLocation] = useLocation();
  const { user } = useAuth();

  // جلب قائمة كافة طلبات سدانة للاختيار في حال لم يتم تمرير id
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

  useDocumentTitle(requestId > 0 ? `أمر إدخال مستودعي #${requestId} - سدانة` : "أمر إدخال مستودعي جديد - سدانة");

  const utils = trpc.useUtils();

  // جلب بيانات المستودع الافتراضي والتنفيذ للطلب المحدد
  const { data, isLoading } = trpc.sedanaExecution.getVirtualInventory.useQuery(
    { requestId },
    { enabled: requestId > 0 }
  );

  const req = data?.request;
  const mosque = data?.mosque;
  const inventoryItems = data?.inventoryItems || [];
  const availableReferences = (data as any)?.availableReferences || [];
  const disbursementOrders: any[] = (data as any)?.disbursementOrders || [];

  // أمر الصرف المحدد
  const [selectedDisbOrderId, setSelectedDisbOrderId] = useState<number | null>(null);

  // بيانات النموذج
  const [inwardRefType, setInwardRefType] = useState<string>("purchase_order");
  const [inwardRefNumber, setInwardRefNumber] = useState<string>("");
  const [inwardSupplierName, setInwardSupplierName] = useState<string>("");
  const [inwardSupplierInvoice, setInwardSupplierInvoice] = useState<string>("");
  const [inwardReceivedBy, setInwardReceivedBy] = useState<string>("");
  const [inwardDate, setInwardDate] = useState<string>(
    new Intl.DateTimeFormat("en-CA", { year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date())
  );
  const [inwardItems, setInwardItems] = useState<Record<string, number>>({});
  const [inwardNotes, setInwardNotes] = useState<string>("");

  // استخراج أمر الصرف من الـ URL إن وُجد
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const disbParam = urlParams.get("disbursementOrderId");
    if (disbParam) {
      const parsedId = parseInt(disbParam);
      if (parsedId > 0) {
        setSelectedDisbOrderId(parsedId);
      }
    }
  }, [window.location.search]);

  // تحديد أمر الصرف الافتراضي عند تحميل البيانات
  useEffect(() => {
    if (disbursementOrders.length > 0 && !selectedDisbOrderId) {
      // اختر أمر الصرف المنفذ الذي به كميات متبقية أولاً، وإلا أول أمر صرف
      const eligible = disbursementOrders.find((d: any) => d.canCreateInward) || disbursementOrders[0];
      if (eligible) {
        setSelectedDisbOrderId(eligible.id);
      }
    }
  }, [disbursementOrders, selectedDisbOrderId]);

  // تعيين اسم المستلم الافتراضي
  useEffect(() => {
    if (user?.name && !inwardReceivedBy) {
      setInwardReceivedBy(user.name);
    }
  }, [user, inwardReceivedBy]);

  // أمر الصرف النشط المختار حالياً
  const activeDisb = useMemo(() => {
    if (!selectedDisbOrderId) return disbursementOrders[0] || null;
    return disbursementOrders.find((d: any) => d.id === selectedDisbOrderId) || disbursementOrders[0] || null;
  }, [disbursementOrders, selectedDisbOrderId]);

  // قائمة الأصناف المعروضة للإدخال، مأخوذة من أمر الصرف المختار
  const displayItems = useMemo(() => {
    if (activeDisb && Array.isArray(activeDisb.items) && activeDisb.items.length > 0) {
      return activeDisb.items;
    }
    return inventoryItems.map((it: any) => ({
      id: it.id,
      itemName: it.name,
      unit: it.unit,
      maxDisbursedQty: it.approvedQty,
      alreadyInwardQty: it.totalInward,
      remainingAllowedQty: it.pendingInward,
      isCompleted: it.pendingInward <= 0,
    }));
  }, [activeDisb, inventoryItems]);

  // عند تغيير أمر الصرف المختار: تحديث المرجع وتعبئة الكميات المتبقية تلقائياً
  useEffect(() => {
    if (activeDisb) {
      setInwardRefType(activeDisb.referenceType || "purchase_order");
      setInwardRefNumber(activeDisb.referenceNumber || activeDisb.orderNumber || "");
      if (activeDisb.beneficiaryName) setInwardSupplierName(activeDisb.beneficiaryName);

      // تعيين الكميات الافتراضية بالمتبقي المسموح
      const initial: Record<string, number> = {};
      if (Array.isArray(activeDisb.items)) {
        activeDisb.items.forEach((it: any) => {
          const remaining = it.remainingAllowedQty !== undefined ? it.remainingAllowedQty : 0;
          if (remaining > 0) {
            initial[it.id] = remaining;
          }
        });
      }
      setInwardItems(initial);
    }
  }, [activeDisb]);

  // التحقق من تعليق أو حظر أمر الإدخال
  const isInwardBlocked = activeDisb ? !activeDisb.canCreateInward : false;
  const blockedReason = activeDisb?.blockedReason || null;

  // تعبئة كامل الكميات المتبقية لكافة البنود
  const handleFillAllRemaining = () => {
    const updated: Record<string, number> = {};
    displayItems.forEach((i: any) => {
      const remaining = i.remainingAllowedQty !== undefined ? i.remainingAllowedQty : 0;
      if (remaining > 0) {
        updated[i.id] = remaining;
      }
    });
    setInwardItems(updated);
    toast.success("تمت تعبئة كامل الكميات المتبقية لهذا الصرف بنجاح");
  };

  // تصفير جميع الكميات المدخلة
  const handleResetAll = () => {
    const updated: Record<string, number> = {};
    displayItems.forEach((i: any) => {
      updated[i.id] = 0;
    });
    setInwardItems(updated);
    toast.info("تم تصفير جميع الكميات");
  };

  // تعيين الكمية لبند محدد بالمتبقي المسموح
  const handleFillSingleRemaining = (itemId: string, maxQty: number) => {
    setInwardItems((prev) => ({
      ...prev,
      [itemId]: maxQty,
    }));
  };

  // إحصائيات الإدخال الحالي
  const totalItemsToInwardCount = Object.keys(inwardItems).filter((k) => (inwardItems[k] || 0) > 0).length;
  const totalUnitsToInward = Object.keys(inwardItems).reduce((sum, k) => sum + (inwardItems[k] || 0), 0);

  // هل يوجد أي تجاوز للحد الأقصى في أي صنف؟
  const hasExceededItems = displayItems.some((it: any) => {
    const entered = inwardItems[it.id] || 0;
    const maxAllowed = it.remainingAllowedQty !== undefined ? it.remainingAllowedQty : 999999;
    return entered > maxAllowed + 0.0001;
  });

  // طفرة إنشاء أمر الإدخال
  const createInwardMutation = trpc.sedanaExecution.createInwardOrder.useMutation({
    onSuccess: () => {
      toast.success("تم تسجيل وتوثيق أمر الإدخال في المستودع الافتراضي بنجاح");
      utils.sedanaExecution.getVirtualInventory.invalidate({ requestId });
      setLocation(`/requests/${requestId}/sedana-execution`);
    },
    onError: (err) => {
      toast.error(err.message || "حدث خطأ أثناء حفظ أمر الإدخال");
    },
  });

  const handleSubmit = () => {
    if (isInwardBlocked) {
      toast.error(blockedReason || "لا يمكن إتمام أمر الإدخال حتى يتم تنفيذ أمر الصرف المرتبط أولاً وتحول حالته إلى 'منفّذ'");
      return;
    }

    const items = Object.keys(inwardItems)
      .filter((k) => (inwardItems[k] || 0) > 0)
      .map((k) => {
        const found = displayItems.find((i: any) => String(i.id) === String(k));
        return {
          id: k,
          itemName: found?.itemName || found?.name || `بند ${k}`,
          quantity: inwardItems[k],
          unit: found?.unit || "وحدة",
        };
      });

    if (items.length === 0) {
      toast.error("يرجى إدخال كمية موجبة لصنف واحد على الأقل للمتابعة");
      return;
    }

    // التحقق المسبق من عدم تجاوز الحد الأقصى المتبقي من أمر الصرف
    for (const item of items) {
      const target = displayItems.find((di: any) => String(di.id) === String(item.id));
      if (target && target.remainingAllowedQty !== undefined) {
        if (item.quantity > target.remainingAllowedQty + 0.0001) {
          toast.error(
            `الكمية المدخلة للصنف (${item.itemName}) وقدرها ${item.quantity} تتجاوز الحد الأقصى المتبقي من أمر الصرف (الحد الأقصى المسموح الآن: ${target.remainingAllowedQty} ${item.unit})`
          );
          return;
        }
      }
    }

    createInwardMutation.mutate({
      requestId,
      receivedBy: inwardReceivedBy || user?.name || "أمين المستودع",
      disbursementOrderId: activeDisb?.id,
      disbursementOrderNumber: activeDisb?.orderNumber,
      referenceType: inwardRefType,
      referenceNumber: inwardRefNumber.trim(),
      supplierInvoiceNumber: inwardSupplierInvoice.trim() || undefined,
      supplierName: inwardSupplierName.trim() || undefined,
      notes: inwardNotes.trim() || undefined,
      items,
    });
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="p-16 flex flex-col items-center justify-center gap-4 text-center" dir="rtl">
          <Loader2 className="w-10 h-10 animate-spin text-primary" />
          <p className="text-sm font-semibold text-muted-foreground">جاري تحميل بيانات المستودع وأوامر الصرف المنفذة...</p>
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
                <div className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300">
                  <Boxes className="w-5 h-5" />
                </div>
                <h1 className="text-xl sm:text-2xl font-bold text-foreground">
                  إصدار أمر إدخال مستودعي جديد
                </h1>
                <Badge variant="outline" className="text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-xs">
                  سدانة
                </Badge>
              </div>
              <p className="text-muted-foreground text-xs sm:text-sm mt-1">
                تسجيل المواد والبضائع الموردة في المستودع الافتراضي لمسجد <span className="font-bold text-foreground">{mosque?.name || "المسجد"}</span> {req?.requestNumber ? `(#${req.requestNumber})` : ""}
              </p>
            </div>
          </div>

          {/* محدد طلب سدانة في حال كان هناك أكثر من طلب */}
          {sedanaRequests.length > 1 && (
            <div className="flex items-center gap-2 shrink-0">
              <Label className="text-xs font-bold text-muted-foreground whitespace-nowrap">الطلب:</Label>
              <Select
                value={String(requestId)}
                onValueChange={(val) => setLocation(`/requests/${val}/sedana-inward/new`)}
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

        {/* القسم الأول: اختيار أمر الصرف المالي المنفّذ (المصدر المالي للتوريد والحد الأقصى) */}
        <Card className="border-border/80 shadow-xs rounded-xl overflow-hidden bg-white dark:bg-slate-900">
          <CardHeader className="bg-muted/30 border-b border-border/50 py-3.5 px-5 text-right">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div>
                <CardTitle className="text-sm font-bold flex items-center gap-2 text-foreground">
                  <Coins className="w-4 h-4 text-emerald-600" />
                  <span>أمر الصرف المالي المنفّذ (المصدر المالي وسقف الكميات)</span>
                </CardTitle>
                <CardDescription className="text-xs mt-0.5">
                  حدد أمر الصرف الذي تود توريد وإدخال بضائعه؛ كميات أمر الصرف تمثل الحد الأقصى (الماكسيموم) المسموح بإدخاله
                </CardDescription>
              </div>

              {disbursementOrders.length > 1 && (
                <Badge variant="outline" className="text-xs bg-muted/60 self-start sm:self-auto">
                  {disbursementOrders.length} أوامر صرف مسجلة لهذا الطلب
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-5 space-y-4 text-right" dir="rtl">
            {disbursementOrders.length === 0 ? (
              <div className="p-6 rounded-xl border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 text-center space-y-3">
                <AlertTriangle className="w-8 h-8 text-amber-600 mx-auto" />
                <div>
                  <h4 className="font-bold text-sm text-amber-900 dark:text-amber-200">لم يتم إنشاء أوامر صرف مالية لهذا الطلب بعد</h4>
                  <p className="text-xs text-amber-800/90 dark:text-amber-300/80 mt-1 max-w-md mx-auto">
                    وفق تدفق العمليات المعتمد، يجب أولاً إنشاء أمر الصرف المالي واعتماده وتنفيذه بالتحويل البنكي لتتمكن من إدخال المواد إلى المستودع الافتراضي.
                  </p>
                </div>
                <Button
                  size="sm"
                  onClick={() => setLocation(`/disbursement-orders/new-direct?requestId=${requestId}`)}
                  className="text-xs font-bold gap-1.5 bg-amber-600 hover:bg-amber-700 text-white"
                >
                  <Coins className="w-4 h-4" />
                  <span>إنشاء أمر صرف مباشر الآن</span>
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                {disbursementOrders.map((d: any) => {
                  const isSelected = selectedDisbOrderId === d.id;
                  const isExecuted = d.isExecuted;
                  const isCompleted = d.isFullyInwarded;

                  return (
                    <div
                      key={d.id}
                      onClick={() => setSelectedDisbOrderId(d.id)}
                      className={`p-4 rounded-xl border transition-all cursor-pointer text-right flex flex-col justify-between relative ${
                        isSelected
                          ? "border-emerald-600 bg-emerald-50/50 dark:bg-emerald-950/20 shadow-xs ring-1 ring-emerald-500"
                          : "border-border hover:border-emerald-300 hover:bg-muted/20 bg-background"
                      }`}
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                              isSelected ? "border-emerald-600 bg-emerald-600 text-white" : "border-muted-foreground/40"
                            }`}>
                              {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                            </div>
                            <span className="font-bold font-mono text-sm text-foreground">{d.orderNumber}</span>
                          </div>

                          {isExecuted ? (
                            <Badge variant="outline" className="text-[10px] border-emerald-300 text-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 gap-1 font-bold">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              <span>منفّذ بالتحويل</span>
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-[10px] border-amber-300 text-amber-800 bg-amber-50 dark:bg-amber-950/40 gap-1 font-semibold">
                              <Clock className="w-3 h-3 text-amber-600" />
                              <span>{d.statusLabel}</span>
                            </Badge>
                          )}
                        </div>

                        <div className="text-xs space-y-1">
                          <div className="text-muted-foreground flex justify-between">
                            <span>المرجع:</span>
                            <span className="font-semibold text-foreground font-mono">
                              {d.referenceNumber || (d.referenceType === "purchase_order" ? "أمر شراء" : "خطاب مسؤولية")}
                            </span>
                          </div>
                          <div className="text-muted-foreground flex justify-between">
                            <span>المستفيد:</span>
                            <span className="font-medium text-foreground truncate max-w-[150px]">{d.beneficiaryName}</span>
                          </div>
                          <div className="text-muted-foreground flex justify-between">
                            <span>المبلغ المصروف:</span>
                            <span className="font-bold text-emerald-700 dark:text-emerald-400 font-mono">
                              {Number(d.amount).toLocaleString()} ر.س
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* شريط حالة التوريد والكميات */}
                      <div className="mt-3 pt-2.5 border-t border-border/50 text-[11px] space-y-1">
                        <div className="flex justify-between font-semibold">
                          <span className="text-muted-foreground">حالة التوريد المستودعي:</span>
                          {isCompleted ? (
                            <span className="text-emerald-700 dark:text-emerald-400 font-bold flex items-center gap-1">
                              <Check className="w-3 h-3" />
                              <span>مكتمل 100%</span>
                            </span>
                          ) : (
                            <span className="text-amber-700 dark:text-amber-400 font-bold">
                              متبقي {d.totalRemainingUnits} وحدة
                            </span>
                          )}
                        </div>

                        <div className="w-full bg-muted/60 h-2 rounded-full overflow-hidden">
                          <div
                            className={`h-full transition-all ${
                              isCompleted ? "bg-emerald-600" : "bg-primary"
                            }`}
                            style={{
                              width: `${
                                d.totalDisbursedUnits > 0
                                  ? Math.min(100, Math.round((d.totalInwardUnits / d.totalDisbursedUnits) * 100))
                                  : 0
                              }%`,
                            }}
                          />
                        </div>

                        <div className="flex justify-between text-[10px] text-muted-foreground font-mono pt-0.5">
                          <span>المعتمد: {d.totalDisbursedUnits}</span>
                          <span>المدخل: {d.totalInwardUnits}</span>
                          <span>المتبقي: {d.totalRemainingUnits}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* تنبيه حالة أمر الصرف المختار */}
            {activeDisb && (
              <div className="mt-2">
                {isInwardBlocked ? (
                  <div className="p-3.5 rounded-xl border border-amber-300 dark:border-amber-800 bg-amber-50/80 dark:bg-amber-950/30 flex items-start gap-3 text-xs">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <div className="flex-1 space-y-1">
                      <p className="font-bold text-amber-900 dark:text-amber-200">
                        لا يمكن عمل أمر إدخال لهذا الصرف حالياً:
                      </p>
                      <p className="text-amber-800 dark:text-amber-300 leading-relaxed">
                        {blockedReason}
                      </p>
                    </div>
                    {!activeDisb.isExecuted && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setLocation("/disbursement-orders")}
                        className="text-xs h-7 gap-1 text-amber-900 border-amber-400 bg-amber-100 hover:bg-amber-200 shrink-0"
                      >
                        <Coins className="w-3.5 h-3.5" />
                        <span>متابعة الصرف</span>
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="p-3 rounded-xl border border-emerald-300 dark:border-emerald-800 bg-emerald-50/60 dark:bg-emerald-950/20 flex items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2">
                      <Info className="w-4 h-4 text-emerald-700 dark:text-emerald-400 shrink-0" />
                      <span className="text-emerald-900 dark:text-emerald-200 leading-relaxed">
                        أمر الصرف <strong>#{activeDisb.orderNumber}</strong> منفّذ بالكامل. يمكنك الآن إدخال الأصناف دفعة واحدة أو على دفعات جزئية حتى استيفاء كامل الكمية المعتمدة.
                      </span>
                    </div>
                    <Badge variant="outline" className="border-emerald-500 text-emerald-700 bg-emerald-50 text-[11px] shrink-0 font-bold">
                      جاهز للإدخال المستودعي
                    </Badge>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* القسم الثاني: بيانات المستند المرجعي والتوريد */}
        <Card className="border-border/80 shadow-xs rounded-xl overflow-hidden bg-white dark:bg-slate-900">
          <CardHeader className="bg-muted/30 border-b border-border/50 py-3.5 px-5 text-right">
            <CardTitle className="text-sm font-bold flex items-center gap-2 text-foreground">
              <FileText className="w-4 h-4 text-primary" />
              <span>بيانات المستند المرجعي ومسؤول الاستلام</span>
            </CardTitle>
            <CardDescription className="text-xs">
              توثيق بيانات التوريد والمورد المعتمد وأمين المستودع المستلم
            </CardDescription>
          </CardHeader>
          <CardContent className="p-5 space-y-4 text-right" dir="rtl">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* نوع مستند التأمين */}
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">نوع مستند التأمين *</Label>
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
                  <SelectTrigger className="h-10 text-xs rounded-xl bg-background" dir="rtl">
                    <SelectValue placeholder="اختر نوع المستند..." />
                  </SelectTrigger>
                  <SelectContent dir="rtl">
                    {availableReferences.length > 0 ? (
                      availableReferences.map((ref: any) => (
                        <SelectItem key={ref.type} value={ref.type} className="text-xs">
                          {ref.label}
                        </SelectItem>
                      ))
                    ) : (
                      <>
                        <SelectItem value="purchase_order" className="text-xs">أمر شراء معتمد (سدانة)</SelectItem>
                        <SelectItem value="csr_letter" className="text-xs">خطاب مسؤولية مجتمعية معتمد</SelectItem>
                        <SelectItem value="supplier_contract" className="text-xs">عقد مورد</SelectItem>
                        <SelectItem value="direct_purchase" className="text-xs">شراء مباشر</SelectItem>
                        <SelectItem value="in_kind_donation" className="text-xs">تبرع عيني</SelectItem>
                      </>
                    )}
                  </SelectContent>
                </Select>
              </div>

              {/* رقم المستند المرجعي */}
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">رقم المستند المرجعي *</Label>
                <Input
                  value={inwardRefNumber}
                  onChange={(e) => setInwardRefNumber(e.target.value)}
                  placeholder="مثال: PO-98-2026 أو CSR-98-2026"
                  className="h-10 text-xs font-mono rounded-xl bg-background"
                />
              </div>

              {/* اسم المورد أو الشريك المانح */}
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">اسم المورد / الشريك المانح</Label>
                <Input
                  value={inwardSupplierName}
                  onChange={(e) => setInwardSupplierName(e.target.value)}
                  placeholder="اسم المورد المعتمد..."
                  className="h-10 text-xs rounded-xl bg-background"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 border-t border-border/50">
              {/* رقم فاتورة المورد أو بوليصة الشحن */}
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                  <Receipt className="w-3.5 h-3.5 text-muted-foreground" />
                  <span>رقم فاتورة المورد / بوليصة الشحن (إن وجدت)</span>
                </Label>
                <Input
                  value={inwardSupplierInvoice}
                  onChange={(e) => setInwardSupplierInvoice(e.target.value)}
                  placeholder="مثال: INV-2026-0042 أو رقم بوليصة الشحن"
                  className="h-10 text-xs font-mono rounded-xl bg-background"
                />
              </div>

              {/* اسم المستلم */}
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                  <User className="w-3.5 h-3.5 text-muted-foreground" />
                  <span>اسم المستلم (أمين المستودع / المنسق) *</span>
                </Label>
                <Input
                  value={inwardReceivedBy}
                  onChange={(e) => setInwardReceivedBy(e.target.value)}
                  placeholder="أمين المستودع"
                  className="h-10 text-xs rounded-xl bg-background"
                />
              </div>

              {/* تاريخ الإدخال */}
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                  <span>تاريخ أمر الإدخال *</span>
                </Label>
                <Input
                  type="date"
                  value={inwardDate}
                  onChange={(e) => setInwardDate(e.target.value)}
                  className="h-10 text-xs rounded-xl bg-background text-right"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* القسم الثالث: جدول الأصناف والكميات (مقيدة بالماكسيموم الخاص بأمر الصرف) */}
        <Card className="border-border/80 shadow-xs rounded-xl overflow-hidden bg-white dark:bg-slate-900">
          <CardHeader className="bg-muted/30 border-b border-border/50 py-3.5 px-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-right">
            <div>
              <CardTitle className="text-sm font-bold flex items-center gap-2 text-foreground">
                <Package className="w-4 h-4 text-emerald-600" />
                <span>
                  أصناف وكميات أمر الصرف المعتمد
                  {activeDisb ? ` (${activeDisb.orderNumber})` : ""}
                </span>
              </CardTitle>
              <CardDescription className="text-xs mt-0.5">
                الكمية المحددة في أمر الصرف هي الحد الأقصى للإدخال؛ يمكنك إدخال جزء من الكمية الآن وإدخال المتبقي لاحقاً
              </CardDescription>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleFillAllRemaining}
                disabled={isInwardBlocked}
                className="text-xs font-bold gap-1 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 cursor-pointer h-8 rounded-lg"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>تعبئة كامل المتبقي</span>
              </Button>

              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleResetAll}
                className="text-xs gap-1 text-muted-foreground hover:text-foreground h-8 rounded-lg"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>تصفير</span>
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
                    <TableHead className="text-center font-bold w-28">الكمية بأمر الصرف</TableHead>
                    <TableHead className="text-center font-bold w-28 text-slate-600 dark:text-slate-400">المدخل سابقاً</TableHead>
                    <TableHead className="text-center font-bold w-32 text-emerald-700 dark:text-emerald-400">الحد الأقصى المتاح الآن</TableHead>
                    <TableHead className="text-center font-bold w-44 text-primary">الكمية المدخلة الآن</TableHead>
                    <TableHead className="text-center font-bold w-36">حالة التوريد</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-border">
                  {displayItems.map((it: any, idx: number) => {
                    const currentVal = inwardItems[it.id] ?? 0;
                    const maxDisbursed = it.maxDisbursedQty !== undefined ? it.maxDisbursedQty : (it.approvedQty || 0);
                    const alreadyIn = it.alreadyInwardQty !== undefined ? it.alreadyInwardQty : (it.totalInward || 0);
                    const maxAllowed = it.remainingAllowedQty !== undefined ? it.remainingAllowedQty : (it.pendingInward || 0);
                    const isOverLimit = currentVal > maxAllowed + 0.0001;
                    const isFullyCompletedNow = currentVal === maxAllowed && maxAllowed > 0;
                    const isPartiallyInward = currentVal > 0 && currentVal < maxAllowed;

                    return (
                      <TableRow key={it.id} className="hover:bg-muted/10 transition-colors">
                        <TableCell className="text-center font-mono text-muted-foreground font-bold">
                          {idx + 1}
                        </TableCell>
                        <TableCell>
                          <div className="font-bold text-foreground text-xs sm:text-sm">{it.itemName || it.name}</div>
                          {it.description && (
                            <div className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">{it.description}</div>
                          )}
                        </TableCell>

                        {/* الكمية المعتمدة بأمر الصرف */}
                        <TableCell className="text-center font-mono font-bold">
                          <span className="text-foreground">{maxDisbursed}</span>{" "}
                          <span className="text-[10px] font-normal text-muted-foreground">{it.unit}</span>
                        </TableCell>

                        {/* المدخل سابقاً من هذا الصرف */}
                        <TableCell className="text-center font-mono font-semibold text-slate-600 dark:text-slate-400">
                          <span>{alreadyIn}</span>{" "}
                          <span className="text-[10px] font-normal">{it.unit}</span>
                        </TableCell>

                        {/* الحد الأقصى المتاح الآن (الماكسيموم) */}
                        <TableCell className="text-center font-mono">
                          <span className={`px-2 py-0.5 rounded font-bold text-xs ${
                            maxAllowed > 0
                              ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                              : "bg-muted text-muted-foreground"
                          }`}>
                            {maxAllowed} {it.unit}
                          </span>
                        </TableCell>

                        {/* حقل كمية الإدخال الحالية مع زر المتبقي وتنبيه التجاوز */}
                        <TableCell className="text-center">
                          <div className="flex flex-col items-center gap-1">
                            <div className="flex items-center justify-center gap-1.5">
                              <Input
                                type="number"
                                step="any"
                                min="0"
                                max={maxAllowed}
                                value={currentVal === 0 ? "" : currentVal}
                                onChange={(e) => {
                                  const val = parseFloat(e.target.value) || 0;
                                  setInwardItems((prev) => ({
                                    ...prev,
                                    [it.id]: val,
                                  }));
                                }}
                                disabled={isInwardBlocked || maxAllowed <= 0}
                                placeholder="0"
                                className={`h-9 w-24 text-center font-mono font-bold text-xs rounded-lg transition-colors ${
                                  isOverLimit
                                    ? "border-rose-500 text-rose-700 bg-rose-50 dark:bg-rose-950/40 focus:ring-rose-500"
                                    : "bg-slate-50 dark:bg-slate-900 border-emerald-300 dark:border-emerald-800 focus:ring-emerald-500"
                                }`}
                              />
                              <span className="text-[10px] text-muted-foreground font-semibold shrink-0">{it.unit}</span>

                              {maxAllowed > 0 && currentVal !== maxAllowed && (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleFillSingleRemaining(it.id, maxAllowed)}
                                  className="h-7 text-[10px] px-1.5 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 cursor-pointer"
                                  title={`إدخال المتبقي كاملاً (${maxAllowed})`}
                                >
                                  المتبقي ({maxAllowed})
                                </Button>
                              )}
                            </div>

                            {/* تنبيه مرئي فوري عند تجاوز الحد الأقصى المسموح */}
                            {isOverLimit && (
                              <span className="text-[10px] text-rose-600 dark:text-rose-400 font-bold flex items-center gap-0.5">
                                <AlertTriangle className="w-3 h-3" />
                                <span>تجاوز الحد الأقصى (الماكسيموم: {maxAllowed})</span>
                              </span>
                            )}
                          </div>
                        </TableCell>

                        {/* حالة التوريد والتقدم */}
                        <TableCell className="text-center">
                          {maxAllowed <= 0 ? (
                            <Badge variant="outline" className="text-[10px] border-emerald-300 text-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 gap-1 font-bold">
                              <Check className="w-3 h-3 text-emerald-600" />
                              <span>مستوفى بالكامل</span>
                            </Badge>
                          ) : isFullyCompletedNow ? (
                            <Badge variant="outline" className="text-[10px] border-emerald-300 text-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 gap-1 font-bold">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              <span>اكتمال 100%</span>
                            </Badge>
                          ) : isPartiallyInward ? (
                            <Badge variant="outline" className="text-[10px] border-sky-300 text-sky-800 bg-sky-50 dark:bg-sky-950/40 gap-1 font-semibold">
                              <Clock className="w-3 h-3 text-sky-600" />
                              <span>دفعة جزئية (متبقي {maxAllowed - currentVal})</span>
                            </Badge>
                          ) : (
                            <span className="text-[11px] text-muted-foreground">مؤجل لدفعة قادمة</span>
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
                  الأصناف المشمولة بالإدخال: <strong className="font-mono text-foreground font-bold">{totalItemsToInwardCount}</strong> صنف
                </span>
                <span>•</span>
                <span className="text-muted-foreground">
                  إجمالي الوحدات الموردة في هذا الأمر: <strong className="font-mono text-emerald-700 dark:text-emerald-400 font-bold">{totalUnitsToInward}</strong> وحدة
                </span>
              </div>

              {activeDisb && (
                <div className="text-muted-foreground text-[11px]">
                  أمر الصرف: <strong className="font-mono text-foreground">{activeDisb.orderNumber}</strong> ({activeDisb.referenceNumber || activeDisb.referenceType})
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* القسم الرابع: ملاحظات التوريد والفحص */}
        <Card className="border-border/80 shadow-xs rounded-xl overflow-hidden bg-white dark:bg-slate-900">
          <CardHeader className="bg-muted/30 border-b border-border/50 py-3.5 px-5 text-right">
            <CardTitle className="text-sm font-bold text-foreground">
              ملاحظات الفحص والاستلام التوريدي
            </CardTitle>
            <CardDescription className="text-xs">
              توثيق حالة الأصناف المستلمة ومطابقتها للمواصفات المعتمدة وأي ملاحظات فنية
            </CardDescription>
          </CardHeader>
          <CardContent className="p-5 text-right" dir="rtl">
            <Textarea
              value={inwardNotes}
              onChange={(e) => setInwardNotes(e.target.value)}
              placeholder="مثال: تم استلام وفحص البنود ومطابقتها لأمر الصرف المعتمد، وسلامة المواد تامة وجاهزة للإيداع في رصيد المستودع الافتراضي..."
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
            disabled={createInwardMutation.isPending || isInwardBlocked || totalItemsToInwardCount === 0 || hasExceededItems}
            className={`h-11 px-8 rounded-xl text-xs sm:text-sm font-bold gap-2 shadow-sm transition-all cursor-pointer ${
              isInwardBlocked || hasExceededItems || totalItemsToInwardCount === 0
                ? "bg-muted text-muted-foreground cursor-not-allowed border border-border"
                : "bg-emerald-700 hover:bg-emerald-800 text-white"
            }`}
          >
            {createInwardMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>جاري حفظ وتوثيق أمر الإدخال...</span>
              </>
            ) : isInwardBlocked ? (
              <>
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                <span>بانتظار تنفيذ أمر الصرف للمتابعة</span>
              </>
            ) : hasExceededItems ? (
              <>
                <AlertTriangle className="w-4 h-4 text-rose-500" />
                <span>توجد كميات تتجاوز الحد الأقصى المسموح</span>
              </>
            ) : (
              <>
                <Check className="w-4 h-4" />
                <span>تأكيد وتوثيق أمر الإدخال بالمستودع</span>
              </>
            )}
          </Button>
        </div>
      </div>
    </DashboardLayout>
  );
}
