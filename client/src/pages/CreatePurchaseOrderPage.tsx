import React, { useState, useEffect, useMemo } from "react";
import { useLocation, useParams } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
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
  ShoppingCart,
  ArrowRight,
  ArrowLeft,
  Building2,
  Package,
  CheckCircle,
  Clock,
  Phone,
  FileText,
  CreditCard,
  Calendar,
  User,
  Check,
  Loader2,
  AlertCircle,
  Store,
  Layers,
  Plus,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { useDocumentTitle } from "@/contexts/DocumentTitleContext";

export default function CreatePurchaseOrderPage() {
  useDocumentTitle("إنشاء أمر شراء معتمد - سدانة");
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const params = useParams<{ id?: string }>();
  const initialRequestId = params.id ? parseInt(params.id, 10) : null;

  // الخطوة الحالية في المعالج (1 أو 2 أو 3)
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // جلب طلبات سدانة التي تحوي موردين معتمدين لأوامر الشراء
  const {
    data: sedanaRequests = [],
    isLoading: isLoadingRequests,
  } = trpc.procurement.getAvailableRequestsForPO.useQuery();

  // الحالة للطلب المختار والمورد المختار
  const [selectedRequestId, setSelectedRequestId] = useState<number | null>(initialRequestId);
  const [selectedSupplierKey, setSelectedSupplierKey] = useState<string>("");

  // تفاصيل أمر الشراء
  const [orderNumber, setOrderNumber] = useState("");
  const [orderDate, setOrderDate] = useState(new Date().toISOString().split("T")[0]);
  const [directedTo, setDirectedTo] = useState("");
  const [requesterName] = useState(user?.name || "طالب الشراء");
  const [requesterRole] = useState("طالب الشراء / إدارة المشاريع");
  const [approverName] = useState("المدير التنفيذي");
  const [approverRole] = useState("المدير التنفيذي");
  const [notes, setNotes] = useState("");

  // الكميات والبنود المحددة
  const [itemsQuantities, setItemsQuantities] = useState<Record<string, number>>({});
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);
  const [customItems, setCustomItems] = useState<Array<{ id: string; itemName: string; description: string; quantity: number; unit: string; unitPrice: number }>>([]);

  // استخراج الطلب المحدد
  const currentRequest = useMemo(() => {
    return sedanaRequests.find((r: any) => r.id === selectedRequestId) || null;
  }, [sedanaRequests, selectedRequestId]);

  // قائمة الموردين المعتمدين للطلب المختار
  const availableSuppliers = useMemo(() => {
    return currentRequest?.suppliers || [];
  }, [currentRequest]);

  // استخراج المورد المختار
  const currentSupplier = useMemo(() => {
    if (!availableSuppliers.length) return null;
    if (selectedSupplierKey) {
      return (
        availableSuppliers.find(
          (s: any) => String(s.id) === selectedSupplierKey || s.supplierName === selectedSupplierKey
        ) || availableSuppliers[0]
      );
    }
    return availableSuppliers[0];
  }, [availableSuppliers, selectedSupplierKey]);

  // عند تحميل الطلبات لأول مرة أو تغيير initialRequestId
  useEffect(() => {
    if (!selectedRequestId && sedanaRequests.length > 0) {
      if (initialRequestId && sedanaRequests.some((r: any) => r.id === initialRequestId)) {
        handleSelectRequest(initialRequestId);
      } else {
        handleSelectRequest(sedanaRequests[0].id);
      }
    }
  }, [sedanaRequests, initialRequestId]);

  // التعامل مع اختيار الطلب
  const handleSelectRequest = (reqId: number) => {
    setSelectedRequestId(reqId);
    const req = sedanaRequests.find((r: any) => r.id === reqId);
    if (!req) return;

    const firstSupplier = req.suppliers?.[0];
    if (firstSupplier) {
      handleSelectSupplier(firstSupplier, req);
    } else {
      setSelectedSupplierKey("");
      setSelectedItemIds([]);
      setItemsQuantities({});
      setDirectedTo("");
    }
  };

  // التعامل مع اختيار المورد
  const handleSelectSupplier = (supplier: any, req?: any) => {
    const parentReq = req || currentRequest;
    setSelectedSupplierKey(String(supplier.id || supplier.supplierName));
    setDirectedTo(supplier.supplierName);

    const year = new Date().getFullYear();
    const existingPOs: any[] = Array.isArray(parentReq?.purchaseOrders) ? parentReq.purchaseOrders : [];
    
    // جمع كافة أرقام أوامر الشراء المسجلة مسبقاً لهذا الطلب
    const usedNumbers = new Set<string>();
    existingPOs.forEach((p: any) => {
      if (p.orderNumber) usedNumbers.add(p.orderNumber.trim());
    });
    if (parentReq?.activePO?.orderNumber) {
      usedNumbers.add(parentReq.activePO.orderNumber.trim());
    }

    // توليد رقم تسلسلي جديد فريد تماماً يضمن إنشاء أمر شراء جديد ومستقل
    const basePrefix = `PO-${parentReq?.id || 1}-${year}`;
    let poNum = "";
    if (!usedNumbers.has(basePrefix)) {
      poNum = basePrefix;
    } else {
      let seq = usedNumbers.size + 1;
      let candidate = `${basePrefix}-${String(seq).padStart(2, "0")}`;
      while (usedNumbers.has(candidate)) {
        seq++;
        candidate = `${basePrefix}-${String(seq).padStart(2, "0")}`;
      }
      poNum = candidate;
    }

    setOrderNumber(poNum);

    // تهيئة البنود والكميات الخاصة بهذا المورد
    const initialQtys: Record<string, number> = {};
    const itemIds: string[] = [];

    (supplier.items || []).forEach((it: any) => {
      itemIds.push(it.id);
      initialQtys[it.id] = Number(it.quantity || 1);
    });

    setItemsQuantities(initialQtys);
    setSelectedItemIds(itemIds);
  };

  // Mutation: إنشاء أو اعتماد أمر الشراء
  const utils = trpc.useUtils();
  const createOrderMutation = trpc.procurement.createOrUpdatePurchaseOrder.useMutation({
    onSuccess: (res, vars) => {
      toast.success(res.message || "تم حفظ أمر الشراء بنجاح");
      utils.procurement.listPurchaseOrders.invalidate();
      utils.procurement.getAvailableRequestsForPO.invalidate();
      utils.sedanaExecution.getVirtualInventory.invalidate({ requestId: vars.requestId });

      // الانتقال إلى قائمة أوامر الشراء ليظهر الأمر المنشأ فوراً
      navigate("/purchase-orders");
    },
    onError: (err) => {
      toast.error(err.message || "حدث خطأ أثناء حفظ أمر الشراء");
    },
  });

  const handleSubmit = (overrideStatus?: "approved" | "draft") => {
    if (!selectedRequestId || !currentRequest) {
      toast.error("يرجى اختيار طلب سدانة أولاً");
      setStep(1);
      return;
    }

    if (!currentSupplier) {
      toast.error("يرجى اختيار المورد المعتمد");
      setStep(2);
      return;
    }

    const supplierItems = (currentSupplier.items || [])
      .filter((it: any) => selectedItemIds.includes(it.id))
      .map((it: any) => ({
        id: it.id,
        itemName: it.itemName,
        description: it.description || "",
        quantity: itemsQuantities[it.id] ?? it.quantity ?? 1,
        unit: it.unit || "وحدة",
        unitPrice: it.unitPrice || 0,
        totalPrice: (itemsQuantities[it.id] ?? it.quantity ?? 1) * (it.unitPrice || 0),
      }));

    const validCustomItems = customItems
      .filter((it) => it.itemName.trim() !== "")
      .map((it) => ({
        id: it.id,
        itemName: it.itemName,
        description: it.description || "",
        quantity: Number(it.quantity) || 1,
        unit: it.unit || "وحدة",
        unitPrice: Number(it.unitPrice) || 0,
        totalPrice: (Number(it.quantity) || 1) * (Number(it.unitPrice) || 0),
      }));

    const itemsToSubmit = [...supplierItems, ...validCustomItems];

    if (itemsToSubmit.length === 0) {
      toast.error("يرجى تضمين صنف واحد على الأقل وتحديد كميته");
      return;
    }

    createOrderMutation.mutate({
      requestId: selectedRequestId,
      supplierName: currentSupplier.supplierName,
      supplierId: currentSupplier.supplierId || null,
      supplierPhone: currentSupplier.phone || "",
      supplierCommercialRegister: currentSupplier.commercialRegister || "",
      orderNumber: orderNumber || `PO-${selectedRequestId}-${new Date().getFullYear()}`,
      orderDate,
      directedTo: directedTo || currentSupplier.supplierName,
      requesterName,
      requesterRole,
      approverName,
      approverRole,
      notes,
      status: "draft",
      items: itemsToSubmit,
    });
  };

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-4 sm:space-y-6 animate-fade-in pb-20 px-3 sm:px-4 md:px-0 text-right font-sans" dir="rtl">
        {/* Header and Visual Step Timeline */}
        <div className="flex flex-col gap-6 border-b border-border/40 pb-6">
          <div className="flex items-center justify-between pb-2">
            <div className="flex items-center gap-2 sm:gap-3">
              <Button
                variant="outline"
                size="icon"
                onClick={() => {
                  if (window.history.length > 1) {
                    window.history.back();
                  } else {
                    navigate("/purchase-orders");
                  }
                }}
                className="h-8 w-8 sm:h-9 sm:w-9 rounded-full hover:bg-muted text-muted-foreground shrink-0 cursor-pointer"
              >
                <ArrowRight className="h-4 w-4 sm:h-5 sm:w-5" />
              </Button>
              <div className="text-right">
                <div className="flex items-center gap-2">
                  <h1 className="text-lg sm:text-2xl font-bold text-foreground font-display">
                    إصدار أمر شراء جديد
                  </h1>
                  <Badge variant="outline" className="text-sky-700 bg-sky-50 dark:bg-sky-950/40 border-sky-300 dark:border-sky-800 text-xs">
                    برنامج سدانة
                  </Badge>
                </div>
                <p className="text-[10px] sm:text-xs text-muted-foreground text-right font-medium mt-0.5 hidden sm:block">
                  إنشاء أمر شراء لطلبات سدانة وتحديد كميات بنود المورد المعتمد
                </p>
              </div>
            </div>
          </div>

          {/* 3-Step Timeline Header */}
          <div className="max-w-xl mx-auto w-full px-2 sm:px-4 py-2" dir="rtl">
            <div className="relative flex items-center justify-between">
              {/* Connecting Line background */}
              <div className="absolute right-0 left-0 top-1/2 -translate-y-1/2 h-0.5 bg-border rounded-full z-0" />
              {/* Connecting Active Line progress */}
              <div
                className="absolute right-0 top-1/2 -translate-y-1/2 h-0.5 bg-primary rounded-full z-0 transition-all duration-500"
                style={{ width: step === 1 ? "0%" : step === 2 ? "50%" : "100%" }}
              />

              {/* Step 1 Node */}
              <div
                className="flex flex-col items-center gap-1.5 z-10 cursor-pointer"
                onClick={() => setStep(1)}
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs transition-all duration-300 border ${
                    step >= 1
                      ? "bg-primary border-primary text-primary-foreground shadow-sm"
                      : "bg-background border-border text-muted-foreground"
                  }`}
                >
                  {step > 1 ? <Check className="w-4 h-4" /> : "١"}
                </div>
                <span className={`text-xs font-semibold ${step >= 1 ? "text-primary" : "text-muted-foreground"}`}>
                  اختيار طلب سدانة
                </span>
              </div>

              {/* Step 2 Node */}
              <div
                className="flex flex-col items-center gap-1.5 z-10 cursor-pointer"
                onClick={() => selectedRequestId && setStep(2)}
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs transition-all duration-300 border ${
                    step >= 2
                      ? "bg-primary border-primary text-primary-foreground shadow-sm"
                      : "bg-background border-border text-muted-foreground"
                  }`}
                >
                  {step > 2 ? <Check className="w-4 h-4" /> : "٢"}
                </div>
                <span className={`text-xs font-semibold ${step >= 2 ? "text-primary" : "text-muted-foreground"}`}>
                  المورد وبياناته
                </span>
              </div>

              {/* Step 3 Node */}
              <div
                className="flex flex-col items-center gap-1.5 z-10 cursor-pointer"
                onClick={() => selectedRequestId && currentSupplier && setStep(3)}
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs transition-all duration-300 border ${
                    step === 3
                      ? "bg-primary border-primary text-primary-foreground shadow-sm"
                      : "bg-background border-border text-muted-foreground"
                  }`}
                >
                  ٣
                </div>
                <span className={`text-xs font-semibold ${step === 3 ? "text-primary" : "text-muted-foreground"}`}>
                  البنود والاعتماد
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* فحص حالة التحميل أو عدم وجود طلبات */}
        {isLoadingRequests ? (
          <div className="p-12 flex flex-col items-center justify-center gap-3 text-center">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <p className="text-xs text-muted-foreground">جاري جلب طلبات سدانة والموردين المعتمدين...</p>
          </div>
        ) : sedanaRequests.length === 0 ? (
          <Card className="border-dashed p-10 text-center space-y-3 bg-white dark:bg-slate-900 rounded-xl">
            <AlertCircle className="w-10 h-10 text-amber-500 mx-auto" />
            <h3 className="text-base font-bold text-foreground">لا توجد طلبات سدانة بانتظار أوامر شراء</h3>
            <p className="text-xs text-muted-foreground max-w-md mx-auto leading-relaxed">
              تظهر هنا فقط طلبات برنامج سدانة التي تم اعتماد موردين لها على مسار "أمر شراء داخلي".
              يمكنك اعتماد الموردين وتوزيع البنود من صفحة تأمين الطلب والتعاقد.
            </p>
            <Button
              size="sm"
              variant="outline"
              onClick={() => navigate("/requests")}
              className="text-xs font-bold rounded-xl h-10"
            >
              الذهاب إلى قائمة الطلبات
            </Button>
          </Card>
        ) : (
          <>
            {/* ======================= الخطوة 1: اختيار طلب سدانة ======================= */}
            {step === 1 && (
              <div className="space-y-6">
                <Card className="border-border/60 shadow-sm rounded-xl overflow-hidden bg-white dark:bg-slate-900">
                  <CardHeader className="bg-muted/30 border-b border-border/40 py-4 px-6 text-right">
                    <CardTitle className="flex items-center gap-2 text-foreground text-base font-bold">
                      <Building2 className="h-4.5 w-4.5 text-primary" />
                      الخطوة 1: اختيار طلب سدانة المعتمد
                    </CardTitle>
                    <CardDescription className="text-right text-xs text-muted-foreground">
                      يتم هنا استعراض طلبات سدانة التي تشتمل على موردين معتمدين لأمر الشراء فقط
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6 pt-6 px-6 text-right">
                    {/* اختيار الطلب عبر Select منسق h-11 rounded-xl */}
                    <div className="space-y-2 text-right">
                      <Label className="text-right text-xs font-bold text-slate-700 dark:text-slate-300">
                        اختر طلب سدانة *
                      </Label>
                      <Select
                        value={selectedRequestId ? String(selectedRequestId) : ""}
                        onValueChange={(val) => handleSelectRequest(Number(val))}
                      >
                        <SelectTrigger
                          className="text-right border-border focus:ring-primary rounded-xl h-11 bg-background w-full text-xs sm:text-sm"
                          dir="rtl"
                        >
                          <SelectValue placeholder="اختر طلب سدانة من القائمة..." />
                        </SelectTrigger>
                        <SelectContent dir="rtl" className="max-h-[300px]">
                          {sedanaRequests.map((req: any) => (
                            <SelectItem key={req.id} value={String(req.id)} className="text-right text-xs py-2">
                              #{req.requestNumber} - مسجد {req.mosqueName} ({req.mosqueCity}) - {req.suppliers?.length || 0} موردين معتمدين
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* ملخص الطلب المختار */}
                    {currentRequest && (
                      <div className="bg-slate-50 dark:bg-slate-900/40 p-4 rounded-xl border border-slate-100 dark:border-slate-800/40 mt-4 space-y-2 text-right animate-in fade-in duration-200">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                            <CheckCircle className="w-4 h-4 text-emerald-600" />
                            الطلب المحدد حالياً:
                          </span>
                          <span className="font-mono font-bold text-primary">#{currentRequest.requestNumber}</span>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs pt-2 border-t border-border/40">
                          <div>
                            <span className="text-muted-foreground text-[11px] block">اسم المسجد</span>
                            <span className="font-bold text-foreground">{currentRequest.mosqueName}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground text-[11px] block">المدينة والحي</span>
                            <span className="font-bold text-foreground">{currentRequest.mosqueCity}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground text-[11px] block">الموردين المتاحين</span>
                            <span className="font-bold text-foreground">{currentRequest.suppliers?.length || 0} موردين</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground text-[11px] block">أوامر الشراء الحالية</span>
                            <span className="font-bold text-sky-700 dark:text-sky-300">
                              {currentRequest.purchaseOrders?.length || 0} أمر شراء مسجل
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>

                  <CardFooter className="border-t border-border/40 pt-4 flex justify-between items-center px-6">
                    <Button
                      variant="outline"
                      onClick={() => navigate("/purchase-orders")}
                      className="font-bold px-5 h-11 rounded-xl text-slate-700 border-border hover:bg-muted text-xs cursor-pointer"
                    >
                      إلغاء والعودة
                    </Button>
                    <Button
                      onClick={() => setStep(2)}
                      disabled={!selectedRequestId}
                      className="gradient-primary text-white font-bold px-6 h-11 rounded-xl shadow-sm flex items-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      <span>التالي: المورد المعتمد</span>
                      <ArrowLeft className="h-4 w-4" />
                    </Button>
                  </CardFooter>
                </Card>
              </div>
            )}

            {/* ======================= الخطوة 2: اختيار المورد وبياناته ======================= */}
            {step === 2 && (
              <div className="space-y-6">
                <Card className="border-border/60 shadow-sm rounded-xl overflow-hidden bg-white dark:bg-slate-900">
                  <CardHeader className="bg-muted/30 border-b border-border/40 py-4 px-6 text-right">
                    <CardTitle className="flex items-center gap-2 text-foreground text-base font-bold">
                      <Store className="h-4.5 w-4.5 text-primary" />
                      الخطوة 2: اختيار المورد المعتمد واستعراض بياناته
                    </CardTitle>
                    <CardDescription className="text-right text-xs text-muted-foreground">
                      {availableSuppliers.length > 1
                        ? `يوجد ${availableSuppliers.length} موردين معتمدين على أمر الشراء لهذا الطلب. اختر المورد لإصدار أمر الشراء له.`
                        : "تم تحديد المورد المعتمد لهذا الطلب وتوثيق بياناته الرسمية."}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6 pt-6 px-6 text-right">
                    {/* اختيار المورد المعتمد عبر Select */}
                    <div className="space-y-2 text-right pb-4 border-b border-border/40">
                      <div className="flex items-center justify-between">
                        <Label className="text-right text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                          <Store className="w-4 h-4 text-primary" />
                          المورد المعتمد على أمر الشراء *
                        </Label>
                        {availableSuppliers.length > 1 && (
                          <Badge variant="secondary" className="text-xs font-bold">
                            تعدد الموردين ({availableSuppliers.length})
                          </Badge>
                        )}
                      </div>

                      <Select
                        value={selectedSupplierKey}
                        onValueChange={(val) => {
                          const supp = availableSuppliers.find(
                            (s: any) => String(s.id) === val || s.supplierName === val
                          );
                          if (supp) handleSelectSupplier(supp);
                        }}
                      >
                        <SelectTrigger
                          className="text-right border-border focus:ring-primary rounded-xl h-11 bg-background w-full text-xs sm:text-sm"
                          dir="rtl"
                        >
                          <SelectValue placeholder="اختر المورد المعتمد..." />
                        </SelectTrigger>
                        <SelectContent dir="rtl">
                          {availableSuppliers.map((supp: any) => (
                            <SelectItem
                              key={supp.id || supp.supplierName}
                              value={String(supp.id || supp.supplierName)}
                              className="text-right text-xs py-2"
                            >
                              {supp.supplierName} (السجل: {supp.commercialRegister || "مسجل"} • {supp.itemsCount || supp.items?.length || 0} أصناف)
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* بطاقة بيانات المورد الرسمية (بيانات التعميد) */}
                    {currentSupplier && (
                      <div className="bg-slate-50 dark:bg-slate-900/40 p-5 rounded-xl border border-slate-100 dark:border-slate-800/40 space-y-4 text-right animate-in fade-in duration-200">
                        <div className="flex items-center justify-between border-b border-border/40 pb-3">
                          <span className="font-bold text-xs sm:text-sm text-slate-800 dark:text-slate-200 flex items-center gap-2">
                            <FileText className="w-4 h-4 text-primary" />
                            بيانات التعميد والحساب البنكي للمورد:
                          </span>
                          <Badge variant="outline" className="text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 text-xs">
                            مورد معتمد
                          </Badge>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
                          <div className="space-y-1">
                            <span className="text-muted-foreground text-[11px] block">اسم الشركة / المؤسسة:</span>
                            <span className="font-bold text-foreground text-sm">{currentSupplier.supplierName}</span>
                          </div>
                          <div className="space-y-1">
                            <span className="text-muted-foreground text-[11px] block">رقم السجل التجاري:</span>
                            <span className="font-mono font-bold text-foreground">{currentSupplier.commercialRegister || "مسجل بالنظام"}</span>
                          </div>
                          <div className="space-y-1">
                            <span className="text-muted-foreground text-[11px] block">رقم التواصل / الجوال:</span>
                            <span className="font-mono font-bold text-foreground">{currentSupplier.phone || "-"}</span>
                          </div>
                          <div className="space-y-1">
                            <span className="text-muted-foreground text-[11px] block">المدينة / المقر:</span>
                            <span className="font-bold text-foreground">{currentSupplier.city || currentRequest?.mosqueCity || "-"}</span>
                          </div>
                          <div className="space-y-1">
                            <span className="text-muted-foreground text-[11px] block">البنك المعتمد:</span>
                            <span className="font-bold text-foreground">{currentSupplier.bankName || "مصرف الراجحي"}</span>
                          </div>
                          <div className="space-y-1 sm:col-span-2 lg:col-span-3">
                            <span className="text-muted-foreground text-[11px] block">رقم الآيبان (IBAN):</span>
                            <span className="font-mono font-bold text-foreground text-xs sm:text-sm tracking-wider">
                              {currentSupplier.iban || "SA0000000000000000000000"}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>

                  <CardFooter className="border-t border-border/40 pt-4 flex justify-between items-center px-6">
                    <Button
                      variant="outline"
                      onClick={() => setStep(1)}
                      className="font-bold px-5 h-11 rounded-xl flex items-center gap-2 text-slate-700 border-border hover:bg-muted text-xs cursor-pointer"
                    >
                      <ArrowRight className="h-4 w-4" />
                      <span>السابق</span>
                    </Button>
                    <Button
                      onClick={() => setStep(3)}
                      disabled={!currentSupplier}
                      className="gradient-primary text-white font-bold px-6 h-11 rounded-xl shadow-sm flex items-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      <span>التالي: تحديد البنود والاعتماد</span>
                      <ArrowLeft className="h-4 w-4" />
                    </Button>
                  </CardFooter>
                </Card>
              </div>
            )}

            {/* ======================= الخطوة 3: تحديد البنود والاعتماد ======================= */}
            {step === 3 && (
              <div className="space-y-6">
                <Card className="border-border/60 shadow-sm rounded-xl overflow-hidden bg-white dark:bg-slate-900">
                  <CardHeader className="bg-muted/30 border-b border-border/40 py-4 px-6 text-right">
                    <CardTitle className="flex items-center gap-2 text-foreground text-base font-bold">
                      <Package className="h-4.5 w-4.5 text-primary" />
                      الخطوة 3: تحديد بنود وكميات أمر الشراء للمورد ({currentSupplier?.supplierName})
                    </CardTitle>
                    <CardDescription className="text-right text-xs text-muted-foreground">
                      حدد الأصناف المطلوبة والكمية لكل صنف مع استكمال بيانات التوجيه والاعتماد
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6 pt-6 px-6 text-right">
                    {/* جدول بنود المورد */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between pb-2 border-b border-border/40">
                        <Label className="text-right text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                          <Package className="w-4 h-4 text-primary" />
                          أصناف المورد وتحديد الكميات *
                        </Label>
                        <div className="flex items-center gap-2">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedItemIds((currentSupplier?.items || []).map((it: any) => it.id))}
                            className="h-8 text-xs text-primary hover:bg-primary/10 px-2.5 rounded-lg cursor-pointer font-bold"
                          >
                            تحديد الكل
                          </Button>
                          <span className="text-muted-foreground text-xs">•</span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedItemIds([])}
                            className="h-8 text-xs text-muted-foreground hover:bg-muted px-2.5 rounded-lg cursor-pointer"
                          >
                            إلغاء التحديد
                          </Button>
                        </div>
                      </div>

                      <div className="border border-border/60 rounded-xl overflow-hidden bg-background">
                        <table className="w-full text-xs text-right divide-y divide-border/60">
                          <thead className="bg-muted/40 font-bold text-muted-foreground">
                            <tr>
                              <th className="p-3 w-12 text-center">تضمين</th>
                              <th className="p-3">الصنف والبيان والمواصفات</th>
                              <th className="p-3 text-center w-36">الكمية المطلوبة *</th>
                              <th className="p-3 text-center w-20">الوحدة</th>
                              <th className="p-3 text-left w-28">السعر التقديري</th>
                              <th className="p-3 text-left w-32">الإجمالي</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border/40">
                            {(currentSupplier?.items || []).map((it: any) => {
                              const isChecked = selectedItemIds.includes(it.id);
                              const currentQty = itemsQuantities[it.id] ?? it.quantity ?? 1;
                              const price = it.unitPrice || 0;
                              const itemTotal = currentQty * price;

                              return (
                                <tr
                                  key={it.id}
                                  className={`transition-colors ${
                                    isChecked ? "bg-sky-50/40 dark:bg-sky-950/20" : "opacity-50"
                                  }`}
                                >
                                  <td className="p-3 text-center">
                                    <Checkbox
                                      checked={isChecked}
                                      onCheckedChange={(checked) => {
                                        if (checked) {
                                          setSelectedItemIds((prev) => [...prev, it.id]);
                                        } else {
                                          setSelectedItemIds((prev) => prev.filter((id) => id !== it.id));
                                        }
                                      }}
                                      className="rounded-[4px]"
                                    />
                                  </td>
                                  <td className="p-3">
                                    <span className="font-bold text-foreground text-xs sm:text-sm block">
                                      {it.itemName}
                                    </span>
                                    {it.description && (
                                      <span className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5 block">
                                        {it.description}
                                      </span>
                                    )}
                                  </td>
                                  <td className="p-3 text-center">
                                    <Input
                                      type="number"
                                      min="0.01"
                                      step="any"
                                      disabled={!isChecked}
                                      value={currentQty}
                                      onChange={(e) => {
                                        const val = parseFloat(e.target.value) || 0;
                                        setItemsQuantities((prev) => ({
                                          ...prev,
                                          [it.id]: val,
                                        }));
                                      }}
                                      className="h-10 text-xs text-center font-mono w-32 mx-auto rounded-xl border-border bg-background focus:ring-primary"
                                    />
                                  </td>
                                  <td className="p-3 text-center text-muted-foreground font-mono">
                                    {it.unit || "وحدة"}
                                  </td>
                                  <td className="p-3 text-left font-mono text-muted-foreground">
                                    {price > 0 ? `${price.toLocaleString()} ر.س` : "-"}
                                  </td>
                                  <td className="p-3 text-left font-mono font-bold text-foreground">
                                    {itemTotal > 0 ? `${itemTotal.toLocaleString()} ر.س` : "-"}
                                  </td>
                                </tr>
                              );
                            })}
                            {customItems.map((it, cIdx) => {
                              const itemTotal = (Number(it.quantity) || 0) * (Number(it.unitPrice) || 0);
                              return (
                                <tr key={it.id} className="bg-amber-50/20 dark:bg-amber-950/10">
                                  <td className="p-3 text-center">
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => setCustomItems((prev) => prev.filter((item) => item.id !== it.id))}
                                      className="h-7 w-7 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded"
                                      title="حذف هذا البند"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </Button>
                                  </td>
                                  <td className="p-3">
                                    <Input
                                      placeholder="اسم الصنف الجديد..."
                                      value={it.itemName}
                                      onChange={(e) => {
                                        const val = e.target.value;
                                        setCustomItems((prev) =>
                                          prev.map((item) => (item.id === it.id ? { ...item, itemName: val } : item))
                                        );
                                      }}
                                      className="h-8 text-xs font-bold border-border bg-background"
                                    />
                                    <Input
                                      placeholder="المواصفات أو البيان..."
                                      value={it.description}
                                      onChange={(e) => {
                                        const val = e.target.value;
                                        setCustomItems((prev) =>
                                          prev.map((item) => (item.id === it.id ? { ...item, description: val } : item))
                                        );
                                      }}
                                      className="h-7 text-[11px] text-muted-foreground border-border bg-background mt-1"
                                    />
                                  </td>
                                  <td className="p-3 text-center">
                                    <Input
                                      type="number"
                                      min="0.01"
                                      step="any"
                                      value={it.quantity}
                                      onChange={(e) => {
                                        const val = parseFloat(e.target.value) || 0;
                                        setCustomItems((prev) =>
                                          prev.map((item) => (item.id === it.id ? { ...item, quantity: val } : item))
                                        );
                                      }}
                                      className="h-8 text-xs text-center font-mono w-28 mx-auto rounded-lg border-border bg-background"
                                    />
                                  </td>
                                  <td className="p-3 text-center">
                                    <Input
                                      value={it.unit}
                                      onChange={(e) => {
                                        const val = e.target.value;
                                        setCustomItems((prev) =>
                                          prev.map((item) => (item.id === it.id ? { ...item, unit: val } : item))
                                        );
                                      }}
                                      className="h-8 text-xs text-center font-mono w-16 mx-auto rounded-lg border-border bg-background"
                                    />
                                  </td>
                                  <td className="p-3 text-left">
                                    <Input
                                      type="number"
                                      min="0"
                                      step="any"
                                      value={it.unitPrice}
                                      onChange={(e) => {
                                        const val = parseFloat(e.target.value) || 0;
                                        setCustomItems((prev) =>
                                          prev.map((item) => (item.id === it.id ? { ...item, unitPrice: val } : item))
                                        );
                                      }}
                                      className="h-8 text-xs text-center font-mono w-24 rounded-lg border-border bg-background"
                                    />
                                  </td>
                                  <td className="p-3 text-left font-mono font-bold text-foreground">
                                    {itemTotal > 0 ? `${itemTotal.toLocaleString()} ر.س` : "-"}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>

                      <div className="flex justify-end pt-1">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setCustomItems((prev) => [
                              ...prev,
                              {
                                id: `custom-${Date.now()}`,
                                itemName: "",
                                description: "",
                                quantity: 1,
                                unit: "وحدة",
                                unitPrice: 0,
                              },
                            ]);
                          }}
                          className="h-8 text-xs font-bold gap-1.5 text-primary hover:bg-primary/10 border-primary/30 rounded-lg cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>إضافة بند إضافي لأمر الشراء</span>
                        </Button>
                      </div>
                    </div>

                    {/* بيانات التوجيه وتوثيق أمر الشراء */}
                    <div className="space-y-4 pt-4 border-t border-border/40">
                      <Label className="text-right text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                        <FileText className="w-4 h-4 text-primary" />
                        بيانات وتوجيه أمر الشراء *
                      </Label>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="space-y-1.5">
                          <Label className="text-right text-xs font-bold text-slate-700 dark:text-slate-300">
                            رقم أمر الشراء *
                          </Label>
                          <Input
                            value={orderNumber}
                            onChange={(e) => setOrderNumber(e.target.value)}
                            placeholder="PO-..."
                            className="text-right border-border focus:ring-primary rounded-xl h-11 bg-background font-mono"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <Label className="text-right text-xs font-bold text-slate-700 dark:text-slate-300">
                            تاريخ أمر الشراء *
                          </Label>
                          <Input
                            type="date"
                            value={orderDate}
                            onChange={(e) => setOrderDate(e.target.value)}
                            className="text-right border-border focus:ring-primary rounded-xl h-11 bg-background"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <Label className="text-right text-xs font-bold text-slate-700 dark:text-slate-300">
                            الموجه إليه *
                          </Label>
                          <Input
                            value={directedTo}
                            onChange={(e) => setDirectedTo(e.target.value)}
                            placeholder="اسم المورد المعتمد..."
                            className="text-right border-border focus:ring-primary rounded-xl h-11 bg-background font-medium"
                          />
                        </div>

                        <div className="space-y-1.5 sm:col-span-3">
                          <Label className="text-right text-xs font-bold text-slate-700 dark:text-slate-300">
                            ملاحظات وشروط التوريد
                          </Label>
                          <Textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="أي اشتراطات خاصة بالتوريد، مكان التسليم، أو الضمان..."
                            rows={2}
                            className="text-right border-border focus:ring-primary rounded-xl bg-background text-xs"
                          />
                        </div>
                      </div>

                    </div>
                  </CardContent>

                  <CardFooter className="border-t border-border/40 pt-4 flex flex-col sm:flex-row items-center justify-between gap-3 px-6">
                    <Button
                      variant="outline"
                      onClick={() => setStep(2)}
                      className="font-bold px-5 h-11 rounded-xl flex items-center gap-2 text-slate-700 border-border hover:bg-muted text-xs cursor-pointer w-full sm:w-auto"
                    >
                      <ArrowRight className="h-4 w-4" />
                      <span>السابق</span>
                    </Button>

                    <Button
                      disabled={createOrderMutation.isPending || selectedItemIds.length === 0}
                      onClick={() => handleSubmit()}
                      className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold px-7 h-11 rounded-xl shadow-sm flex items-center gap-2 cursor-pointer text-xs w-full sm:w-auto"
                    >
                      <CheckCircle className="w-4 h-4" />
                      <span>
                        {createOrderMutation.isPending
                          ? "جاري حفظ أمر الشراء..."
                          : "حفظ أمر الشراء (مسودة)"}
                      </span>
                    </Button>
                  </CardFooter>
                </Card>
              </div>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
