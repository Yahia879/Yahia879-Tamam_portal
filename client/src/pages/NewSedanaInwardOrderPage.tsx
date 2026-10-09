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
  Loader2,
  Check,
  Clock,
  Layers,
  ShieldCheck,
  Info,
  Lock,
  Plus,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { useDocumentTitle } from "@/contexts/DocumentTitleContext";
import { usePermission } from "@/hooks/usePermission";

interface ExtraInwardItem {
  id: string;
  originalItemId?: string;
  isCustom: boolean;
  itemName: string;
  quantity: number;
  unit: string;
}

export default function NewSedanaInwardOrderPage() {
  const params = useParams<{ id?: string }>();
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const canInward = usePermission("sedana_warehouse.inward");

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
  const approvedPurchaseOrders: any[] = (data as any)?.approvedPurchaseOrders || [];
  const approvedCsrLetters: any[] = (data as any)?.approvedCsrLetters || [];
  const disbursementOrders: any[] = useMemo(() => {
    const list: any[] = (data as any)?.disbursementOrders || [];
    return list.filter((d: any) => d.status === "executed" || d.isExecuted);
  }, [data]);

  // نوع مستند الإدخال المعتمد (أمر شراء معتمد بأمر صرف مالي أم خطاب مسؤولية مجتمعية معتمد)
  const [sourceCategory, setSourceCategory] = useState<"purchase_order" | "csr_letter">("purchase_order");

  // أمر الصرف المحدد
  const [selectedDisbOrderId, setSelectedDisbOrderId] = useState<number | null>(null);

  // خطاب المسؤولية المجتمعية المحدد
  const [selectedCsrNumber, setSelectedCsrNumber] = useState<string>("");

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
  const [extraCsrItems, setExtraCsrItems] = useState<ExtraInwardItem[]>([]);
  const [inwardNotes, setInwardNotes] = useState<string>("");

  // إدارة الأصناف الإضافية لخطاب المسؤولية المجتمعية
  const handleAddExtraItem = () => {
    const hasInventory = inventoryItems.length > 0;
    setExtraCsrItems((prev) => [
      ...prev,
      {
        id: `extra_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        originalItemId: "",
        isCustom: !hasInventory,
        itemName: "",
        quantity: 1,
        unit: "حبة",
      },
    ]);
  };

  const handleRemoveExtraItem = (id: string) => {
    setExtraCsrItems((prev) => prev.filter((item) => item.id !== id));
  };

  const handleUpdateExtraItem = (id: string, patch: Partial<ExtraInwardItem>) => {
    setExtraCsrItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...patch } : item))
    );
  };

  // تفريغ الأصناف الإضافية عند تغيير نوع المستند أو رقم الخطاب
  useEffect(() => {
    setExtraCsrItems([]);
  }, [sourceCategory, selectedCsrNumber]);

  // استخراج أمر الصرف أو الخطاب المجتمعي من الـ URL إن وُجد
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const disbParam = urlParams.get("disbursementOrderId");
    const sourceParam = urlParams.get("source") || urlParams.get("referenceType");
    const csrParam = urlParams.get("csrLetterNumber") || urlParams.get("csr");

    if (csrParam || sourceParam === "csr" || sourceParam === "csr_letter") {
      setSourceCategory("csr_letter");
      if (csrParam) setSelectedCsrNumber(csrParam);
    } else if (disbParam) {
      setSourceCategory("purchase_order");
      const parsedId = parseInt(disbParam);
      if (parsedId > 0) setSelectedDisbOrderId(parsedId);
    }
  }, [window.location.search]);

  // تعيين اسم المستلم الافتراضي
  useEffect(() => {
    if (user?.name && !inwardReceivedBy) {
      setInwardReceivedBy(user.name);
    }
  }, [user, inwardReceivedBy]);

  // التعيين التلقائي للمستند المتاح عند التبديل إذا لم يكن محدداً
  useEffect(() => {
    if (sourceCategory === "purchase_order") {
      if (!selectedDisbOrderId && disbursementOrders.length > 0) {
        setSelectedDisbOrderId(disbursementOrders[0].id);
      }
    } else if (sourceCategory === "csr_letter") {
      if (!selectedCsrNumber && approvedCsrLetters.length > 0) {
        setSelectedCsrNumber(approvedCsrLetters[0].letterNumber);
      }
    }
  }, [sourceCategory, disbursementOrders, approvedCsrLetters, selectedDisbOrderId, selectedCsrNumber]);

  // أمر الصرف النشط المختار حالياً
  const activeDisb = useMemo(() => {
    if (sourceCategory !== "purchase_order" || !selectedDisbOrderId) return null;
    return disbursementOrders.find((d: any) => d.id === selectedDisbOrderId) || null;
  }, [sourceCategory, disbursementOrders, selectedDisbOrderId]);

  // خطاب المسؤولية المجتمعية المختار حالياً
  const activeCsr = useMemo(() => {
    if (sourceCategory !== "csr_letter") return null;
    if (selectedCsrNumber) {
      return approvedCsrLetters.find((c: any) => c.letterNumber === selectedCsrNumber) || null;
    }
    return approvedCsrLetters.length > 0 ? approvedCsrLetters[0] : null;
  }, [sourceCategory, approvedCsrLetters, selectedCsrNumber]);

  // المستند المعتمد النشط
  const activeDoc = sourceCategory === "purchase_order" ? activeDisb : activeCsr;

  // قائمة الأصناف المعروضة للإدخال، مأخوذة حصراً من المستند المختار
  const displayItems = useMemo(() => {
    if (sourceCategory === "purchase_order") {
      if (activeDisb && Array.isArray(activeDisb.items) && activeDisb.items.length > 0) {
        return activeDisb.items;
      }
      return [];
    } else {
      if (activeCsr && Array.isArray(activeCsr.items) && activeCsr.items.length > 0) {
        return activeCsr.items;
      }
      return [];
    }
  }, [sourceCategory, activeDisb, activeCsr]);

  // عند تغيير المستند المختار: تحديث المرجع وتعبئة الكميات المتبقية تلقائياً
  useEffect(() => {
    if (sourceCategory === "purchase_order" && activeDisb) {
      setInwardRefType("purchase_order");
      setInwardRefNumber(activeDisb.referenceNumber || activeDisb.orderNumber || "");
      if (activeDisb.beneficiaryName) setInwardSupplierName(activeDisb.beneficiaryName);

      const initial: Record<string, number> = {};
      if (Array.isArray(activeDisb.items)) {
        activeDisb.items.forEach((it: any) => {
          const qty = it.remainingAllowedQty !== undefined ? it.remainingAllowedQty : (it.maxDisbursedQty ?? it.quantity ?? 0);
          if (qty > 0) {
            initial[it.id] = qty;
          }
        });
      }
      setInwardItems(initial);
    } else if (sourceCategory === "csr_letter" && activeCsr) {
      setInwardRefType("csr_letter");
      setInwardRefNumber(activeCsr.letterNumber || "");
      if (activeCsr.recipientName) setInwardSupplierName(activeCsr.recipientName);

      const initial: Record<string, number> = {};
      if (Array.isArray(activeCsr.items)) {
        activeCsr.items.forEach((it: any) => {
          const qty = it.remainingAllowedQty !== undefined ? it.remainingAllowedQty : (it.maxDisbursedQty ?? it.quantity ?? 0);
          if (qty > 0) {
            initial[it.id] = qty;
          }
        });
      }
      setInwardItems(initial);
    }
  }, [sourceCategory, activeDisb, activeCsr]);

  // التحقق من تعليق أو حظر أمر الإدخال
  const isInwardBlocked = useMemo(() => {
    if (sourceCategory === "purchase_order") {
      return !activeDisb || !activeDisb.canCreateInward;
    } else {
      return !activeCsr || !activeCsr.canCreateInward;
    }
  }, [sourceCategory, activeDisb, activeCsr]);

  const blockedReason = useMemo(() => {
    if (sourceCategory === "purchase_order") {
      if (disbursementOrders.length === 0) {
        return "لا يوجد أمر صرف مالي منفّذ لهذا الطلب حتى الآن";
      }
      if (!activeDisb) return "يرجى اختيار أمر الصرف المالي للمتابعة";
      return activeDisb.blockedReason || null;
    } else {
      if (approvedCsrLetters.length === 0) {
        return "لا توجد خطابات مسؤولية مجتمعية معتمدة لهذا الطلب حتى الآن";
      }
      if (!activeCsr) return "يرجى اختيار خطاب المسؤولية المجتمعية للمتابعة";
      return activeCsr.blockedReason || null;
    }
  }, [sourceCategory, disbursementOrders.length, approvedCsrLetters.length, activeDisb, activeCsr]);

  // الأصناف الإضافية الصالحة (المكتملة الاسم والكمية)
  const validExtraItems = useMemo(() => {
    if (sourceCategory !== "csr_letter") return [];
    return extraCsrItems.filter((item) => item.itemName.trim().length > 0 && item.quantity > 0);
  }, [sourceCategory, extraCsrItems]);

  // إحصائيات الإدخال الحالي (تشمل الأصناف المستوردة والأصناف الإضافية)
  const totalItemsToInwardCount = useMemo(() => {
    const regularCount = Object.keys(inwardItems).filter((k) => (inwardItems[k] || 0) > 0).length;
    return regularCount + validExtraItems.length;
  }, [inwardItems, validExtraItems]);

  const totalUnitsToInward = useMemo(() => {
    const regularUnits = Object.keys(inwardItems).reduce((sum, k) => sum + (inwardItems[k] || 0), 0);
    const extraUnits = validExtraItems.reduce((sum, it) => sum + (it.quantity || 0), 0);
    return regularUnits + extraUnits;
  }, [inwardItems, validExtraItems]);

  // هل يوجد أي تجاوز للحد الأقصى في أي صنف؟ (ينطبق حصراً على أوامر الشراء المقيدة بأسقف الصرف المالي)
  const hasExceededItems = sourceCategory === "purchase_order" && displayItems.some((it: any) => {
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
      toast.error(blockedReason || "لا يمكن إتمام أمر الإدخال حالياً");
      return;
    }

    // التحقق من اكتمال الأصناف الإضافية في حال وجودها
    if (sourceCategory === "csr_letter" && extraCsrItems.length > 0) {
      const emptyNameItem = extraCsrItems.find((it) => !it.itemName.trim());
      if (emptyNameItem) {
        toast.error("يرجى إدخال اسم الصنف لكل بند إضافي تمت إضافته");
        return;
      }
      const invalidQtyItem = extraCsrItems.find((it) => (it.quantity || 0) <= 0);
      if (invalidQtyItem) {
        toast.error(`يرجى تحديد كمية موجبة للصنف الإضافي (${invalidQtyItem.itemName || "صنف إضافي"})`);
        return;
      }
    }

    const regularItems = Object.keys(inwardItems)
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

    const extraItems = sourceCategory === "csr_letter"
      ? validExtraItems.map((it) => ({
          id: it.originalItemId || it.id,
          itemName: it.itemName.trim(),
          quantity: it.quantity,
          unit: it.unit.trim() || "وحدة",
        }))
      : [];

    const items = [...regularItems, ...extraItems];

    if (items.length === 0) {
      toast.error("يرجى إدخال كمية موجبة لصنف واحد على الأقل للمتابعة");
      return;
    }

    // التحقق المسبق من عدم تجاوز الحد الأقصى المتبقي (خاص بأمر الشراء المقيد بأسقف الصرف فقط)
    if (sourceCategory === "purchase_order") {
      for (const item of items) {
        const target = displayItems.find((di: any) => String(di.id) === String(item.id));
        if (target && target.remainingAllowedQty !== undefined) {
          if (item.quantity > target.remainingAllowedQty + 0.0001) {
            toast.error(
              `الكمية المدخلة للصنف (${item.itemName}) وقدرها ${item.quantity} تتجاوز الحد الأقصى المتبقي (الحد الأقصى المسموح الآن: ${target.remainingAllowedQty} ${item.unit})`
            );
            return;
          }
        }
      }
    }

    if (sourceCategory === "purchase_order") {
      createInwardMutation.mutate({
        requestId,
        receivedBy: inwardReceivedBy || user?.name || "أمين المستودع",
        disbursementOrderId: activeDisb?.id,
        disbursementOrderNumber: activeDisb?.orderNumber,
        referenceType: "purchase_order",
        referenceNumber: (activeDisb?.referenceNumber || activeDisb?.orderNumber || inwardRefNumber || "").trim(),
        supplierInvoiceNumber: inwardSupplierInvoice.trim() || undefined,
        supplierName: (activeDisb?.beneficiaryName || inwardSupplierName || "").trim() || undefined,
        notes: inwardNotes.trim() || undefined,
        items,
      });
    } else {
      createInwardMutation.mutate({
        requestId,
        receivedBy: inwardReceivedBy || user?.name || "أمين المستودع",
        disbursementOrderId: null,
        disbursementOrderNumber: null,
        referenceType: "csr_letter",
        referenceNumber: (activeCsr?.letterNumber || inwardRefNumber || "").trim(),
        supplierInvoiceNumber: inwardSupplierInvoice.trim() || undefined,
        supplierName: (activeCsr?.recipientName || inwardSupplierName || "").trim() || undefined,
        notes: inwardNotes.trim() || undefined,
        items,
      });
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="p-16 flex flex-col items-center justify-center gap-4 text-center" dir="rtl">
          <Loader2 className="w-10 h-10 animate-spin text-primary" />
          <p className="text-sm font-semibold text-muted-foreground">جاري تحميل بيانات المستودع وأوامر الاعتماد...</p>
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

        </div>

        {/* القسم الأول: اختيار مستند التوريد والاعتماد (أمر شراء معتمد أم خطاب مجتمعي معتمد) */}
        <Card className="border-border/80 shadow-xs rounded-xl overflow-hidden bg-white dark:bg-slate-900">
          <CardHeader className="bg-muted/30 border-b border-border/50 py-3.5 px-5 text-right">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div>
                <CardTitle className="text-sm font-bold flex items-center gap-2 text-foreground">
                  <Coins className="w-4 h-4 text-emerald-600" />
                  <span>مستند التوريد والاعتماد (المصدر المعتمد وسقف الكميات)</span>
                </CardTitle>
                <CardDescription className="text-xs mt-0.5">
                  حدد نوع ومستند التوريد المعتمد؛ كميات المستند تمثل الحد الأقصى (الماكسيموم) المسموح بإدخاله
                </CardDescription>
              </div>

              {sourceCategory === "purchase_order" && disbursementOrders.length > 0 && (
                <Badge variant="outline" className="text-xs bg-muted/60 self-start sm:self-auto text-emerald-700 dark:text-emerald-400 border-emerald-300 font-bold">
                  {disbursementOrders.length === 1 ? "أمر صرف منفّذ واحد مسجل" : `${disbursementOrders.length} أوامر صرف منفّذة مسجلة`}
                </Badge>
              )}
              {sourceCategory === "csr_letter" && approvedCsrLetters.length > 0 && (
                <Badge variant="outline" className="text-xs bg-muted/60 self-start sm:self-auto text-emerald-700 dark:text-emerald-400 border-emerald-300 font-bold">
                  {approvedCsrLetters.length === 1 ? "خطاب مجتمعي معتمد واحد" : `${approvedCsrLetters.length} خطابات مجتمعية معتمدة`}
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-5 space-y-5 text-right" dir="rtl">
            {/* 1. قائمة اختيار نوع المستند (أمر صرف منفذ أم خطاب مسؤولية مجتمعية منفذ) */}
            <div className="space-y-2">
              <Label className="text-xs font-bold text-foreground">
                نوع مستند الإدخال المعتمد:
              </Label>
              <div className="max-w-xl">
                <Select
                  value={sourceCategory}
                  onValueChange={(val: "purchase_order" | "csr_letter") => setSourceCategory(val)}
                >
                  <SelectTrigger className="h-11 text-xs font-bold bg-background border-border/80" dir="rtl">
                    <SelectValue placeholder="-- اختر نوع مستند الإدخال المعتمد --" />
                  </SelectTrigger>
                  <SelectContent dir="rtl">
                    <SelectItem value="purchase_order" className="text-xs font-semibold cursor-pointer">
                      أمر صرف منفذ
                    </SelectItem>
                    <SelectItem value="csr_letter" className="text-xs font-semibold cursor-pointer">
                      خطاب مسؤولية مجتمعية منفذ
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* 2. اختيار المستند المحدد بناءً على النوع المختار */}
            {sourceCategory === "purchase_order" ? (
              <div className="space-y-2 pt-2 border-t border-border/50">
                <Label className="text-xs font-bold text-foreground">
                  أمر الصرف المالي المنفّذ:
                </Label>
                {disbursementOrders.length === 0 ? (
                  <div className="p-5 rounded-xl border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 text-center space-y-2">
                    <AlertTriangle className="w-7 h-7 text-amber-600 mx-auto" />
                    <div>
                      <h4 className="font-bold text-sm text-amber-900 dark:text-amber-200">لا توجد أوامر صرف مالية منفّذة بالتحويل البنكي لهذا الطلب</h4>
                      <p className="text-xs text-amber-800/90 dark:text-amber-300/80 mt-1 max-w-md mx-auto">
                        وفق مسار العمل المعتمد، لا يمكن توريد وإدخال بضائع أمر الشراء إلا بموجب أمر صرف مالي منفّذ (حالة: منفّذ بالتحويل البنكي).
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="max-w-xl">
                    <Select
                      value={selectedDisbOrderId ? String(selectedDisbOrderId) : ""}
                      onValueChange={(val) => setSelectedDisbOrderId(Number(val))}
                    >
                      <SelectTrigger className="h-11 text-xs font-semibold bg-background border-border/80" dir="rtl">
                        <SelectValue placeholder="-- اختر أمر الصرف المالي المنفّذ للمتابعة --" />
                      </SelectTrigger>
                      <SelectContent dir="rtl">
                        {disbursementOrders.map((d: any) => (
                          <SelectItem key={d.id} value={String(d.id)} className="text-xs">
                            <span className="font-mono font-bold">{d.orderNumber}</span>
                            {" - "}
                            <span>{d.referenceNumber || (d.referenceType === "purchase_order" ? "أمر شراء" : "خطاب مسؤولية")}</span>
                            {" - المستفيد: "}
                            <span>{d.beneficiaryName}</span>
                            {" ("}
                            <span className="font-mono text-emerald-700 dark:text-emerald-400 font-semibold">{Number(d.amount).toLocaleString()} ر.س</span>
                            {")"}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* تنبيه حالة أمر الصرف المختار فقط في حال وجود مانع/تعليق */}
                {activeDisb && isInwardBlocked && (
                  <div className="mt-2">
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
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-2 pt-2 border-t border-border/50">
                <Label className="text-xs font-bold text-foreground">
                  خطاب المسؤولية المجتمعية المنفّذ (CSR):
                </Label>
                {approvedCsrLetters.length === 0 ? (
                  <div className="p-5 rounded-xl border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 text-center space-y-2">
                    <AlertTriangle className="w-7 h-7 text-amber-600 mx-auto" />
                    <div>
                      <h4 className="font-bold text-sm text-amber-900 dark:text-amber-200">لا توجد خطابات مسؤولية مجتمعية معتمدة لهذا الطلب</h4>
                      <p className="text-xs text-amber-800/90 dark:text-amber-300/80 mt-1 max-w-md mx-auto">
                        يجب اعتماد خطاب المسؤولية المجتمعية أولاً من قبل المدير التنفيذي ليتاح استخدامه في الإدخال المستودعي.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="max-w-xl">
                    <Select
                      value={selectedCsrNumber || ""}
                      onValueChange={(val) => setSelectedCsrNumber(val)}
                    >
                      <SelectTrigger className="h-11 text-xs font-semibold bg-background border-border/80" dir="rtl">
                        <SelectValue placeholder="-- اختر خطاب المسؤولية المجتمعية المنفّذ --" />
                      </SelectTrigger>
                      <SelectContent dir="rtl">
                        {approvedCsrLetters.map((c: any) => (
                          <SelectItem key={c.letterNumber} value={c.letterNumber} className="text-xs">
                            <span className="font-mono font-bold">{c.letterNumber}</span>
                            {" - الجهة المانحة: "}
                            <span>{c.recipientName || "شريك مجتمعي"}</span>
                            {" ("}
                            <span className="font-mono text-emerald-700 dark:text-emerald-400 font-semibold">{c.totalUnits} وحدة</span>
                            {")"}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* تنبيه حالة خطاب المسؤولية المجتمعية المختار فقط في حال وجود مانع/تعليق */}
                {activeCsr && isInwardBlocked && (
                  <div className="mt-2">
                    <div className="p-3.5 rounded-xl border border-amber-300 dark:border-amber-800 bg-amber-50/80 dark:bg-amber-950/30 flex items-start gap-3 text-xs">
                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      <div className="flex-1 space-y-1">
                        <p className="font-bold text-amber-900 dark:text-amber-200">
                          لا يمكن عمل أمر إدخال لهذا الخطاب حالياً:
                        </p>
                        <p className="text-amber-800 dark:text-amber-300 leading-relaxed">
                          {blockedReason}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>


        {/* القسم الثاني: جدول الأصناف والكميات (يظهر بعد تحديد المستند) */}
        {activeDoc && (
          <Card className="border-border/80 shadow-xs rounded-xl overflow-hidden bg-white dark:bg-slate-900">
            <CardHeader className="bg-muted/30 border-b border-border/50 py-3.5 px-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-right">
              <div>
                <CardTitle className="text-sm font-bold flex items-center gap-2 text-foreground">
                  <Package className="w-4 h-4 text-emerald-600" />
                  <span>
                    {sourceCategory === "purchase_order"
                      ? `أصناف وكميات أمر الصرف المنفّذ (${activeDisb?.orderNumber})`
                      : `أصناف وكميات خطاب المسؤولية المجتمعية المنفّذ (${activeCsr?.letterNumber})`}
                  </span>
                </CardTitle>
                <CardDescription className="text-xs mt-0.5">
                  {sourceCategory === "purchase_order"
                    ? "أصناف وكميات أمر الصرف المنفّذ المحددة للإدخال المستودعي"
                    : "أصناف وكميات خطاب المسؤولية المجتمعية المنفّذ المحددة للإدخال المستودعي (يمكن تعديل الكميات وإضافة بنود إضافية)"}
                </CardDescription>
              </div>

              {sourceCategory === "csr_letter" && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddExtraItem}
                  className="gap-1.5 h-8 text-xs font-semibold text-emerald-700 dark:text-emerald-400 border-emerald-300 dark:border-emerald-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 cursor-pointer self-start sm:self-auto"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>إضافة صنف إضافي</span>
                </Button>
              )}
            </CardHeader>
            <CardContent className="p-0 text-right" dir="rtl">
              <div className="overflow-x-auto">
                <Table className="w-full text-right text-xs">
                  <TableHeader className="bg-muted/40">
                    <TableRow className="border-b border-border/60 hover:bg-transparent">
                      <TableHead className="w-12 text-center font-bold">#</TableHead>
                      <TableHead className="min-w-[200px] font-bold text-foreground">الصنف والوصف</TableHead>
                      <TableHead className="w-32 text-center font-bold text-foreground">الكمية المعتمدة</TableHead>
                      <TableHead className="w-36 text-center font-bold text-primary">الكمية</TableHead>
                      {sourceCategory === "csr_letter" && (
                        <TableHead className="w-14 text-center font-bold text-muted-foreground">إجراء</TableHead>
                      )}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {displayItems.length === 0 && extraCsrItems.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={sourceCategory === "csr_letter" ? 5 : 4} className="h-28 text-center text-muted-foreground text-xs">
                          لا توجد أصناف مسجلة في هذا المستند
                        </TableCell>
                      </TableRow>
                    ) : (
                      <>
                        {displayItems.map((it: any, idx: number) => {
                          const enteredQty = inwardItems[it.id] !== undefined ? inwardItems[it.id] : (it.remainingAllowedQty ?? it.maxDisbursedQty ?? it.quantity ?? 0);

                          return (
                            <TableRow
                              key={it.id || idx}
                              className="border-b border-border/40 transition-colors hover:bg-muted/20"
                            >
                              {/* رقم البند */}
                              <TableCell className="text-center font-mono text-muted-foreground font-bold">
                                {idx + 1}
                              </TableCell>

                              {/* اسم الصنف والوصف */}
                              <TableCell>
                                <div className="space-y-0.5">
                                  <div className="font-bold text-foreground text-xs sm:text-sm">
                                    {it.itemName || it.name}
                                  </div>
                                  {it.description && (
                                    <div className="text-[11px] text-muted-foreground line-clamp-1">
                                      {it.description}
                                    </div>
                                  )}
                                </div>
                              </TableCell>

                              {/* الكمية المعتمدة */}
                              <TableCell className="text-center font-mono text-xs font-semibold">
                                <span className="text-foreground">{it.maxDisbursedQty ?? it.quantity ?? 0}</span>
                                <span className="text-muted-foreground mr-1 text-[11px]">{it.unit}</span>
                              </TableCell>

                              {/* خانة الكمية */}
                              <TableCell className="text-center">
                                <div className="flex items-center justify-center gap-1.5 max-w-[130px] mx-auto">
                                  <Input
                                    type="number"
                                    min={0}
                                    step="any"
                                    readOnly={sourceCategory === "purchase_order"}
                                    disabled={sourceCategory === "purchase_order"}
                                    value={enteredQty}
                                    onChange={(e) => {
                                      if (sourceCategory === "csr_letter") {
                                        const val = parseFloat(e.target.value);
                                        setInwardItems((prev) => ({
                                          ...prev,
                                          [it.id]: isNaN(val) ? 0 : Math.max(0, val),
                                        }));
                                      }
                                    }}
                                    className={`h-9 text-center font-mono font-bold text-xs rounded-lg text-foreground border-border ${
                                      sourceCategory === "purchase_order"
                                        ? "bg-muted/40 cursor-not-allowed"
                                        : "bg-background focus:ring-emerald-500"
                                    }`}
                                  />
                                  <span className="text-[11px] text-muted-foreground whitespace-nowrap">
                                    {it.unit}
                                  </span>
                                </div>
                              </TableCell>

                              {/* عمود الإجراء في حال كان الخطاب المجتمعي مفعلاً */}
                              {sourceCategory === "csr_letter" && (
                                <TableCell className="text-center text-muted-foreground text-[11px]">
                                  —
                                </TableCell>
                              )}
                            </TableRow>
                          );
                        })}

                        {/* صفوف الأصناف الإضافية لخطاب المسؤولية المجتمعية */}
                        {sourceCategory === "csr_letter" && extraCsrItems.map((extraItem, extraIdx) => (
                          <TableRow
                            key={extraItem.id}
                            className="border-b border-border/40 bg-emerald-50/20 dark:bg-emerald-950/10 transition-colors hover:bg-emerald-50/30"
                          >
                            {/* رقم البند */}
                            <TableCell className="text-center font-mono text-muted-foreground font-bold align-top pt-4">
                              {displayItems.length + extraIdx + 1}
                            </TableCell>

                            {/* اختيار الصنف والوصف */}
                            <TableCell className="min-w-[280px]">
                              <div className="space-y-2 py-1.5">
                                {/* محدد نوع الإضافة: من سلة المسجد أو صنف مخصص جديد */}
                                <div className="flex items-center gap-1 p-0.5 bg-muted/70 rounded-lg w-fit border border-border/60">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleUpdateExtraItem(extraItem.id, {
                                        isCustom: false,
                                      })
                                    }
                                    className={`px-2.5 py-1 text-[11px] font-bold rounded-md transition-all cursor-pointer ${
                                      !extraItem.isCustom
                                        ? "bg-white dark:bg-slate-800 text-emerald-700 dark:text-emerald-400 shadow-xs border border-border/50"
                                        : "text-muted-foreground hover:text-foreground"
                                    }`}
                                  >
                                    من سلة المسجد
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleUpdateExtraItem(extraItem.id, {
                                        isCustom: true,
                                        originalItemId: "",
                                      })
                                    }
                                    className={`px-2.5 py-1 text-[11px] font-bold rounded-md transition-all cursor-pointer ${
                                      extraItem.isCustom
                                        ? "bg-white dark:bg-slate-800 text-amber-700 dark:text-amber-400 shadow-xs border border-border/50"
                                        : "text-muted-foreground hover:text-foreground"
                                    }`}
                                  >
                                    صنف مخصص جديد
                                  </button>
                                </div>

                                {!extraItem.isCustom ? (
                                  <div className="space-y-1">
                                    <Select
                                      value={extraItem.originalItemId || ""}
                                      onValueChange={(val) => {
                                        const found = inventoryItems.find((inv: any) => String(inv.id) === val);
                                        if (found) {
                                          handleUpdateExtraItem(extraItem.id, {
                                            isCustom: false,
                                            originalItemId: String(found.id),
                                            itemName: found.name || found.itemName || "",
                                            unit: found.unit || "وحدة",
                                          });
                                        }
                                      }}
                                    >
                                      <SelectTrigger
                                        className="h-9 text-xs font-semibold bg-background border-border/80 focus:ring-emerald-500"
                                        dir="rtl"
                                      >
                                        <SelectValue placeholder="-- اختر الصنف من سلة المسجد --" />
                                      </SelectTrigger>
                                      <SelectContent dir="rtl" className="max-h-60">
                                        {inventoryItems.map((inv: any) => (
                                          <SelectItem
                                            key={inv.id}
                                            value={String(inv.id)}
                                            className="text-xs cursor-pointer py-1.5"
                                          >
                                            <div className="flex items-center justify-between gap-4 w-full">
                                              <span className="font-semibold text-foreground">
                                                {inv.name || inv.itemName}
                                              </span>
                                              <span className="text-[11px] text-muted-foreground font-mono">
                                                ({inv.unit || "وحدة"})
                                              </span>
                                            </div>
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                    {extraItem.itemName && (
                                      <div className="flex items-center gap-1.5 text-[11px] text-emerald-700 dark:text-emerald-400 font-medium">
                                        <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                                        <span>تم اختيار: <strong className="font-bold">{extraItem.itemName}</strong></span>
                                      </div>
                                    )}
                                  </div>
                                ) : (
                                  <div className="space-y-1">
                                    <Input
                                      type="text"
                                      placeholder="أدخل اسم الصنف الإضافي المخصص..."
                                      value={extraItem.itemName}
                                      onChange={(e) =>
                                        handleUpdateExtraItem(extraItem.id, {
                                          itemName: e.target.value,
                                        })
                                      }
                                      className="h-9 text-xs font-bold bg-background border-border/80 focus:ring-emerald-500"
                                      autoFocus
                                    />
                                    <p className="text-[10px] text-muted-foreground">
                                      سيتم إدراج هذا البند الجديد ورصيده ضمن بنود المستودع الافتراضي للمسجد.
                                    </p>
                                  </div>
                                )}
                              </div>
                            </TableCell>

                            {/* الكمية المعتمدة */}
                            <TableCell className="text-center font-mono text-xs text-muted-foreground align-top pt-4">
                              <span>— (إضافي)</span>
                            </TableCell>

                            {/* خانة الكمية والوحدة */}
                            <TableCell className="text-center align-top pt-3">
                              <div className="flex items-center justify-center gap-1.5 max-w-[160px] mx-auto">
                                <Input
                                  type="number"
                                  min={0.01}
                                  step="any"
                                  value={extraItem.quantity}
                                  onChange={(e) => {
                                    const val = parseFloat(e.target.value);
                                    handleUpdateExtraItem(extraItem.id, {
                                      quantity: isNaN(val) ? 0 : Math.max(0, val),
                                    });
                                  }}
                                  className="h-9 text-center font-mono font-bold text-xs rounded-lg text-foreground bg-background border-border focus:ring-emerald-500"
                                />
                                <Input
                                  type="text"
                                  placeholder="الوحدة"
                                  value={extraItem.unit}
                                  onChange={(e) =>
                                    handleUpdateExtraItem(extraItem.id, {
                                      unit: e.target.value,
                                    })
                                  }
                                  className="h-9 w-16 text-center text-xs font-semibold bg-background border-border focus:ring-emerald-500"
                                />
                              </div>
                            </TableCell>

                            {/* إجراء الحذف */}
                            <TableCell className="text-center align-top pt-3">
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => handleRemoveExtraItem(extraItem.id)}
                                className="h-8 w-8 text-destructive hover:bg-destructive/10 rounded-lg cursor-pointer"
                                title="حذف الصنف الإضافي"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </>
                    )}
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

                <div className="text-muted-foreground text-[11px]">
                  {sourceCategory === "purchase_order" && activeDisb ? (
                    <>أمر الصرف: <strong className="font-mono text-foreground">{activeDisb.orderNumber}</strong> ({activeDisb.referenceNumber || activeDisb.referenceType})</>
                  ) : activeCsr ? (
                    <>خطاب المسؤولية المجتمعية: <strong className="font-mono text-foreground">{activeCsr.letterNumber}</strong> ({activeCsr.recipientName})</>
                  ) : null}
                </div>
              </div>
            </CardContent>
          </Card>
        )}


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

          {activeDoc && (
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
                  <span>{sourceCategory === "purchase_order" ? "بانتظار تنفيذ أمر الصرف للمتابعة" : "لا يمكن إتمام الإدخال حالياً"}</span>
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
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
