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
  HeartHandshake,
  ArrowRight,
  ArrowLeft,
  Building2,
  Package,
  CheckCircle,
  FileText,
  User,
  Check,
  Loader2,
  AlertCircle,
  Plus,
  Store,
} from "lucide-react";
import { toast } from "sonner";
import { useDocumentTitle } from "@/contexts/DocumentTitleContext";

export default function CreateCsrLetterPage() {
  useDocumentTitle("إنشاء خطاب مسؤولية مجتمعية - سدانة");
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const params = useParams<{ id?: string }>();
  const initialRequestId = params.id ? parseInt(params.id, 10) : null;

  // الخطوة الحالية في المعالج (1 أو 2 أو 3)
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // جلب طلبات سدانة المتاحة لخطابات المسؤولية المجتمعية
  const {
    data: sedanaRequests = [],
    isLoading: isLoadingRequests,
  } = trpc.procurement.getAvailableRequestsForCSR.useQuery();

  // جلب المفوضين بالتوقيع
  const { data: signatoriesData = [] } = trpc.organization.getSignatories.useQuery(undefined, {
    staleTime: 10 * 60 * 1000,
  });

  // الحالة للطلب المختار
  const [selectedRequestId, setSelectedRequestId] = useState<number | null>(initialRequestId);

  // استخراج الطلب المحدد
  const currentRequest = useMemo(() => {
    return sedanaRequests.find((r: any) => r.id === selectedRequestId) || null;
  }, [sedanaRequests, selectedRequestId]);

  // الموردين المعتمدين للمسؤولية المجتمعية لهذا الطلب
  const availableSuppliers = useMemo(() => {
    return currentRequest?.suppliers || currentRequest?.partners || [];
  }, [currentRequest]);

  // المورد / الشريك المجتمعي المختار
  const [selectedSupplierKey, setSelectedSupplierKey] = useState<string>("");

  const currentSupplier = useMemo(() => {
    if (!availableSuppliers.length) return null;
    return (
      availableSuppliers.find(
        (s: any) => String(s.id) === selectedSupplierKey || s.supplierName === selectedSupplierKey
      ) || availableSuppliers[0]
    );
  }, [availableSuppliers, selectedSupplierKey]);

  // اسم الجهة المانحة / المورد
  const [recipientName, setRecipientName] = useState("");

  // تفاصيل الخطاب الرسمي
  const [letterNumber, setLetterNumber] = useState("");
  const [letterDate, setLetterDate] = useState(new Date().toISOString().split("T")[0]);
  const [salutation, setSalutation] = useState("السادة");
  const [honorific, setHonorific] = useState("المحترمون");
  const [projectName, setProjectName] = useState("");
  const [signatoryTitle, setSignatoryTitle] = useState("المدير التنفيذي");
  const [signatoryName, setSignatoryName] = useState("");
  const [notes, setNotes] = useState("");

  // الكميات والبنود المحددة
  const [itemsQuantities, setItemsQuantities] = useState<Record<string, number>>({});
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);

  // تهيئة المفوض بالتوقيع الافتراضي
  useEffect(() => {
    if (!signatoryName) {
      const execSignatory = signatoriesData.find(
        (s: any) => s.roleTitle?.includes("تنفيذي") || s.roleTitle?.includes("مدير")
      ) || signatoriesData[0];
      if (execSignatory?.name) {
        setSignatoryName(execSignatory.name);
      } else if (user?.name) {
        setSignatoryName(user.name);
      }
    }
  }, [signatoriesData, user, signatoryName]);

  // التعامل مع اختيار المورد المعتمد
  const handleSelectSupplier = (supplier: any, parentReq?: any) => {
    const sKey = String(supplier.id || supplier.supplierName);
    setSelectedSupplierKey(sKey);
    setRecipientName(supplier.supplierName || supplier.recipientName || "");

    const req = parentReq || currentRequest;
    const year = new Date().getFullYear();
    const existingCSRs: any[] = Array.isArray(req?.csrLetters) ? req.csrLetters : [];

    // جمع كافة أرقام الخطابات المسجلة مسبقاً لهذا الطلب
    const usedNumbers = new Set<string>();
    existingCSRs.forEach((c: any) => {
      if (c.letterNumber) usedNumbers.add(c.letterNumber.trim());
    });
    if (req?.activeCSR?.letterNumber) {
      usedNumbers.add(req.activeCSR.letterNumber.trim());
    }

    // توليد رقم تسلسلي جديد فريد تماماً يضمن إنشاء خطاب جديد ومستقل
    const basePrefix = `CSR-${req?.id || 1}-${year}`;
    let csrNum = "";
    if (!usedNumbers.has(basePrefix)) {
      csrNum = basePrefix;
    } else {
      let seq = usedNumbers.size + 1;
      let candidate = `${basePrefix}-${String(seq).padStart(2, "0")}`;
      while (usedNumbers.has(candidate)) {
        seq++;
        candidate = `${basePrefix}-${String(seq).padStart(2, "0")}`;
      }
      csrNum = candidate;
    }

    setLetterNumber(csrNum);

    // تهيئة البنود والكميات الخاصة بهذا المورد حصراً
    const initialQtys: Record<string, number> = {};
    const itemIds: string[] = [];

    const items = supplier.items || req?.eligibleItems || [];
    items.forEach((it: any) => {
      itemIds.push(it.id);
      initialQtys[it.id] = Number(it.quantity || 1);
    });

    setItemsQuantities(initialQtys);
    setSelectedItemIds(itemIds);
  };

  // التعامل مع اختيار الطلب
  const handleSelectRequest = (reqId: number) => {
    setSelectedRequestId(reqId);
    const req = sedanaRequests.find((r: any) => r.id === reqId);
    if (!req) return;

    setProjectName(`مشروع جامع ${req.mosqueName || req.descriptiveName || `طلب #${req.id}`}`);

    const suppList = req.suppliers || req.partners || [];
    if (suppList.length > 0) {
      handleSelectSupplier(suppList[0], req);
    } else {
      setRecipientName("");
      setLetterNumber(`CSR-${req.id}-${new Date().getFullYear()}`);
      setSelectedItemIds([]);
      setItemsQuantities({});
    }
  };

  // عند تحميل الطلبات لأول مرة أو تغيير initialRequestId
  useEffect(() => {
    if (sedanaRequests.length > 0) {
      if (initialRequestId && sedanaRequests.some((r: any) => r.id === initialRequestId)) {
        handleSelectRequest(initialRequestId);
      } else if (initialRequestId && !sedanaRequests.some((r: any) => r.id === initialRequestId)) {
        toast.error("هذا الطلب لم ينتقل بعد لمرحلة التشغيل والتنفيذ أو لا يتضمن مسار مسؤولية مجتمعية");
        handleSelectRequest(sedanaRequests[0].id);
      } else if (!selectedRequestId) {
        handleSelectRequest(sedanaRequests[0].id);
      }
    }
  }, [sedanaRequests, initialRequestId]);

  // تحديث المورد التلقائي عند تبديل الطلب إذا لم يكن محدداً
  useEffect(() => {
    if (availableSuppliers.length > 0) {
      const exists = availableSuppliers.some(
        (s: any) => String(s.id) === selectedSupplierKey || s.supplierName === selectedSupplierKey
      );
      if (!exists) {
        handleSelectSupplier(availableSuppliers[0], currentRequest);
      }
    }
  }, [availableSuppliers, currentRequest, selectedSupplierKey]);

  // Mutation: إنشاء خطاب المسؤولية المجتمعية
  const utils = trpc.useUtils();
  const createCsrMutation = trpc.procurement.createOrUpdateCsrLetter.useMutation({
    onSuccess: (res) => {
      toast.success(res.message || "تم حفظ خطاب المسؤولية المجتمعية بنجاح");
      utils.procurement.listCsrLetters.invalidate();
      utils.procurement.getAvailableRequestsForCSR.invalidate();

      // الانتقال إلى قائمة خطابات المسؤولية المجتمعية
      navigate("/csr-letters");
    },
    onError: (err) => {
      toast.error(err.message || "حدث خطأ أثناء حفظ خطاب المسؤولية المجتمعية");
    },
  });

  const handleSubmit = () => {
    if (!selectedRequestId || !currentRequest) {
      toast.error("يرجى اختيار طلب سدانة أولاً");
      setStep(1);
      return;
    }

    if (!recipientName.trim()) {
      toast.error("يرجى تحديد أو إدخال اسم الجهة المانحة أو الشريك المجتمعي");
      setStep(2);
      return;
    }

    const availableItems = currentSupplier?.items || currentRequest?.eligibleItems || [];
    const itemsToSubmit = availableItems
      .filter((it: any) => selectedItemIds.includes(it.id))
      .map((it: any) => ({
        id: it.id,
        itemName: it.itemName,
        description: it.description || "",
        quantity: itemsQuantities[it.id] ?? it.quantity ?? 1,
        unit: it.unit || "وحدة",
      }));

    if (itemsToSubmit.length === 0) {
      toast.error("يرجى تضمين صنف واحد على الأقل وتحديد كميته");
      return;
    }

    createCsrMutation.mutate({
      requestId: selectedRequestId,
      recipientName: recipientName.trim(),
      recipientContactPerson: currentSupplier?.contactPerson || currentSupplier?.recipientContactPerson || "",
      recipientPhone: currentSupplier?.phone || "",
      recipientEmail: currentSupplier?.email || "",
      recipientCity: currentSupplier?.city || currentRequest.mosqueCity || "",
      letterNumber: letterNumber || `CSR-${selectedRequestId}-${new Date().getFullYear()}`,
      letterDate,
      salutation,
      honorific,
      projectName: projectName || `مشروع جامع ${currentRequest.mosqueName}`,
      signatoryTitle: signatoryTitle || "المدير التنفيذي",
      signatoryName: signatoryName || user?.name || "المهندس المفوض بالتوقيع",
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
                    navigate("/csr-letters");
                  }
                }}
                className="h-8 w-8 sm:h-9 sm:w-9 rounded-full hover:bg-muted text-muted-foreground shrink-0 cursor-pointer"
              >
                <ArrowRight className="h-4 w-4 sm:h-5 sm:w-5" />
              </Button>
              <div className="text-right">
                <div className="flex items-center gap-2">
                  <h1 className="text-lg sm:text-2xl font-bold text-foreground font-display">
                    إصدار خطاب مسؤولية مجتمعية جديد
                  </h1>
                  <Badge variant="outline" className="text-sky-700 bg-sky-50 dark:bg-sky-950/40 border-sky-300 dark:border-sky-800 text-xs">
                    برنامج سدانة
                  </Badge>
                </div>
                <p className="text-[10px] sm:text-xs text-muted-foreground text-right font-medium mt-0.5 hidden sm:block">
                  إنشاء خطاب مسؤولية مجتمعية رسمي وتحديد الأصناف والكميات الموجهة للجهة المانحة
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
                className="absolute right-0 top-1/2 -translate-y-1/2 h-0.5 bg-sky-600 rounded-full z-0 transition-all duration-500"
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
                      ? "bg-sky-600 border-sky-600 text-white shadow-sm"
                      : "bg-background border-border text-muted-foreground"
                  }`}
                >
                  {step > 1 ? <Check className="w-4 h-4" /> : "١"}
                </div>
                <span className={`text-xs font-semibold ${step >= 1 ? "text-sky-600 dark:text-sky-400" : "text-muted-foreground"}`}>
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
                      ? "bg-sky-600 border-sky-600 text-white shadow-sm"
                      : "bg-background border-border text-muted-foreground"
                  }`}
                >
                  {step > 2 ? <Check className="w-4 h-4" /> : "٢"}
                </div>
                <span className={`text-xs font-semibold ${step >= 2 ? "text-sky-600 dark:text-sky-400" : "text-muted-foreground"}`}>
                  الجهة وتحديد الكميات
                </span>
              </div>

              {/* Step 3 Node */}
              <div
                className="flex flex-col items-center gap-1.5 z-10 cursor-pointer"
                onClick={() => selectedRequestId && recipientName && selectedItemIds.length > 0 && setStep(3)}
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs transition-all duration-300 border ${
                    step === 3
                      ? "bg-sky-600 border-sky-600 text-white shadow-sm"
                      : "bg-background border-border text-muted-foreground"
                  }`}
                >
                  ٣
                </div>
                <span className={`text-xs font-semibold ${step === 3 ? "text-sky-600 dark:text-sky-400" : "text-muted-foreground"}`}>
                  مراجعة وتأكيد الخطاب
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* فحص حالة التحميل أو عدم وجود طلبات */}
        {isLoadingRequests ? (
          <div className="p-12 flex flex-col items-center justify-center gap-3 text-center">
            <Loader2 className="w-8 h-8 animate-spin text-sky-600" />
            <p className="text-xs text-muted-foreground">جاري جلب طلبات سدانة والشركاء المعتمدين...</p>
          </div>
        ) : sedanaRequests.length === 0 ? (
          <Card className="border-dashed p-10 text-center space-y-3 bg-white dark:bg-slate-900 rounded-xl">
            <AlertCircle className="w-10 h-10 text-amber-500 mx-auto" />
            <h3 className="text-base font-bold text-foreground">لا توجد طلبات سدانة متاحة</h3>
            <p className="text-xs text-muted-foreground max-w-md mx-auto leading-relaxed">
              تظهر هنا طلبات برنامج سدانة التي تم اعتماد موردين/شركاء لها على مسار "المسؤولية المجتمعية" وانتقلت لمرحلة "التشغيل والتنفيذ".
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
                      <Building2 className="h-4.5 w-4.5 text-sky-600" />
                      الخطوة 1: اختيار طلب سدانة
                    </CardTitle>
                    <CardDescription className="text-right text-xs text-muted-foreground">
                      يتم هنا استعراض طلبات سدانة المعتمدة للمسؤولية المجتمعية في مرحلة "التشغيل والتنفيذ"
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
                          className="text-right border-border focus:ring-sky-600 rounded-xl h-11 bg-background w-full text-xs sm:text-sm"
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
                          <span className="font-mono font-bold text-sky-700 dark:text-sky-300">#{currentRequest.requestNumber}</span>
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
                            <span className="font-bold text-foreground">{currentRequest.suppliers?.length || 0} موردين معتمدين</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground text-[11px] block">خطابات CSR الحالية</span>
                            <span className="font-bold text-sky-700 dark:text-sky-300">
                              {currentRequest.csrLetters?.length || 0} خطاب مسجل
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>

                  <CardFooter className="border-t border-border/40 pt-4 flex justify-between items-center px-6">
                    <Button
                      variant="outline"
                      onClick={() => navigate("/csr-letters")}
                      className="font-bold px-5 h-11 rounded-xl flex items-center gap-2 text-slate-700 border-border hover:bg-muted text-xs cursor-pointer"
                    >
                      <ArrowRight className="h-4 w-4" />
                      <span>إلغاء والعودة</span>
                    </Button>
                    <Button
                      onClick={() => setStep(2)}
                      disabled={!selectedRequestId}
                      className="bg-sky-600 hover:bg-sky-700 text-white font-bold px-6 h-11 rounded-xl shadow-sm flex items-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      <span>التالي: المورد المعتمد والكميات</span>
                      <ArrowLeft className="h-4 w-4" />
                    </Button>
                  </CardFooter>
                </Card>
              </div>
            )}

            {/* ======================= الخطوة 2: اختيار المورد / الشريك المجتمعي وتحديد الكميات ======================= */}
            {step === 2 && (
              <div className="space-y-6">
                <Card className="border-border/60 shadow-sm rounded-xl overflow-hidden bg-white dark:bg-slate-900">
                  <CardHeader className="bg-muted/30 border-b border-border/40 py-4 px-6 text-right">
                    <CardTitle className="flex items-center gap-2 text-foreground text-base font-bold">
                      <HeartHandshake className="h-4.5 w-4.5 text-sky-600" />
                      الخطوة 2: اختيار المورد / الشريك المجتمعي وتحديد الكميات
                    </CardTitle>
                    <CardDescription className="text-right text-xs text-muted-foreground">
                      {availableSuppliers.length > 1
                        ? `يوجد ${availableSuppliers.length} موردين معتمدين كمسؤولية مجتمعية لهذا الطلب. اختر المورد لإصدار الخطاب له.`
                        : "تم تحديد المورد المعتمد للمسؤولية المجتمعية لهذا الطلب وتوثيق بياناته."}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6 pt-6 px-6 text-right">
                    {/* حقل اختيار المورد المعتمد كمسؤولية مجتمعية */}
                    <div className="space-y-2 text-right pb-4 border-b border-border/40">
                      <div className="flex items-center justify-between">
                        <Label className="text-right text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                          <HeartHandshake className="w-4 h-4 text-sky-600" />
                          المورد المعتمد على المسؤولية المجتمعية *
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
                          className="text-right border-border focus:ring-sky-600 rounded-xl h-11 bg-background w-full text-xs sm:text-sm"
                          dir="rtl"
                        >
                          <SelectValue placeholder="اختر المورد أو الشريك المجتمعي المعتمد..." />
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

                    {/* بطاقة تفاصيل المورد / الشريك المجتمعي المعتمد */}
                    {currentSupplier && (
                      <div className="bg-slate-50 dark:bg-slate-900/40 p-5 rounded-xl border border-slate-100 dark:border-slate-800/40 space-y-4 text-right animate-in fade-in duration-200">
                        <div className="flex items-center justify-between border-b border-border/40 pb-3">
                          <span className="font-bold text-xs sm:text-sm text-slate-800 dark:text-slate-200 flex items-center gap-2">
                            <Building2 className="w-4 h-4 text-sky-600" />
                            بيانات الشريك المجتمعي / المورد المعتمد:
                          </span>
                          <Badge variant="outline" className="text-sky-700 bg-sky-50 dark:bg-sky-950/40 border-sky-300 text-xs">
                            مسؤولية مجتمعية معتمدة
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
                        </div>

                        {/* إمكانية تعديل صيغة اسم الجهة في الخطاب إن لزم */}
                        <div className="pt-2 border-t border-border/40 space-y-1.5">
                          <Label className="text-right text-xs font-bold text-slate-700 dark:text-slate-300">
                            صيغة اسم الجهة الموجه إليها الخطاب *
                          </Label>
                          <Input
                            value={recipientName}
                            onChange={(e) => setRecipientName(e.target.value)}
                            placeholder="اسم الجهة أو الشركة كما سيظهر في الخطاب الرسمي..."
                            className="text-right border-border focus:ring-sky-600 rounded-xl h-10 bg-background font-bold text-xs"
                          />
                        </div>
                      </div>
                    )}

                    {/* جدول أصناف الطلب وتحديد الكميات */}
                    <div className="space-y-3 pt-2">
                      <div className="flex items-center justify-between pb-2 border-b border-border/40">
                        <Label className="text-right text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                          <Package className="w-4 h-4 text-sky-600" />
                          أصناف الطلب وتحديد الكميات *
                        </Label>
                        <div className="flex items-center gap-2">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedItemIds((currentSupplier?.items || currentRequest?.eligibleItems || []).map((it: any) => it.id))}
                            className="h-8 text-xs text-sky-600 hover:bg-sky-50 dark:hover:bg-sky-950/40 px-2.5 rounded-lg cursor-pointer font-bold"
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
                              <th className="p-3 text-center w-28">الوحدة</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border/40">
                            {(currentSupplier?.items || currentRequest?.eligibleItems || []).map((it: any) => {
                              const isChecked = selectedItemIds.includes(it.id);
                              const currentQty = itemsQuantities[it.id] ?? it.quantity ?? 1;

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
                                      className="h-10 text-xs text-center font-mono w-32 mx-auto rounded-xl border-border bg-background focus:ring-sky-600"
                                    />
                                  </td>
                                  <td className="p-3 text-center text-muted-foreground font-mono">
                                    {it.unit || "وحدة"}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
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
                      onClick={() => {
                        if (!recipientName.trim()) {
                          toast.error("يرجى اختيار المورد أو إدخال اسم الجهة أو المؤسسة المانحة");
                          return;
                        }
                        if (selectedItemIds.length === 0) {
                          toast.error("يرجى اختيار صنف واحد على الأقل وتحديد كميته");
                          return;
                        }
                        setStep(3);
                      }}
                      disabled={!recipientName.trim() || selectedItemIds.length === 0}
                      className="bg-sky-600 hover:bg-sky-700 text-white font-bold px-6 h-11 rounded-xl shadow-sm flex items-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      <span>التالي: بيانات وتوثيق الخطاب</span>
                      <ArrowLeft className="h-4 w-4" />
                    </Button>
                  </CardFooter>
                </Card>
              </div>
            )}

            {/* ======================= الخطوة 3: تحديد البنود وتفاصيل الخطاب ======================= */}
            {step === 3 && (
              <div className="space-y-6">
                <Card className="border-border/60 shadow-sm rounded-xl overflow-hidden bg-white dark:bg-slate-900">
                  <CardHeader className="bg-muted/30 border-b border-border/40 py-4 px-6 text-right">
                    <CardTitle className="flex items-center gap-2 text-foreground text-base font-bold">
                      <FileText className="h-4.5 w-4.5 text-sky-600" />
                      الخطوة 3: مراجعة وتأكيد بيانات الخطاب
                    </CardTitle>
                    <CardDescription className="text-right text-xs text-muted-foreground">
                      مراجعة البيانات المدخلة قبل الحفظ النهائي (للعرض والمراجعة فقط)
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6 pt-6 px-6 text-right">
                    {/* بطاقة معلومات التوجيه والخطاب الرسمي - عرض فقط */}
                    <div className="bg-slate-50/70 dark:bg-slate-800/40 rounded-xl p-5 border border-border/60 space-y-4">
                      <div className="flex items-center justify-between pb-3 border-b border-border/40">
                        <span className="font-bold text-xs sm:text-sm text-foreground flex items-center gap-2">
                          <FileText className="w-4 h-4 text-sky-600" />
                          بيانات وتوجيه الخطاب الرسمي
                        </span>
                        <Badge variant="outline" className="text-[11px] font-mono font-bold text-sky-700 bg-sky-50 dark:bg-sky-950/40 border-sky-300 dark:border-sky-800 px-2.5 py-0.5">
                          {letterNumber}
                        </Badge>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
                        <div className="space-y-1 bg-white dark:bg-slate-900 p-3 rounded-lg border border-border/40">
                          <span className="text-[11px] text-muted-foreground block font-medium">الجهة الموجه إليها الخطاب</span>
                          <p className="font-bold text-foreground text-sm">
                            {salutation || "السادة"} / {recipientName} {honorific || "المحترمون"}
                          </p>
                        </div>

                        <div className="space-y-1 bg-white dark:bg-slate-900 p-3 rounded-lg border border-border/40">
                          <span className="text-[11px] text-muted-foreground block font-medium">المسجد والمشروع المستفيد</span>
                          <p className="font-bold text-foreground">
                            {projectName || `مسجد ${currentRequest?.mosqueName}`}
                          </p>
                        </div>

                        <div className="space-y-1 bg-white dark:bg-slate-900 p-3 rounded-lg border border-border/40">
                          <span className="text-[11px] text-muted-foreground block font-medium">رقم الطلب المرتبط والموقع</span>
                          <p className="font-mono font-bold text-foreground">
                            طلب #{currentRequest?.requestNumber} • {currentRequest?.mosqueCity || "الموقع المعتمد"}
                          </p>
                        </div>

                        <div className="space-y-1 bg-white dark:bg-slate-900 p-3 rounded-lg border border-border/40">
                          <span className="text-[11px] text-muted-foreground block font-medium">تاريخ إصدار الخطاب</span>
                          <p className="font-mono font-semibold text-foreground">
                            {letterDate || "-"}
                          </p>
                        </div>

                        <div className="space-y-1 bg-white dark:bg-slate-900 p-3 rounded-lg border border-border/40">
                          <span className="text-[11px] text-muted-foreground block font-medium">المفوض بالتوقيع والاعتماد</span>
                          <p className="font-bold text-foreground">
                            {signatoryName} <span className="text-xs font-normal text-muted-foreground">({signatoryTitle || "المدير التنفيذي"})</span>
                          </p>
                        </div>

                        <div className="space-y-1 bg-white dark:bg-slate-900 p-3 rounded-lg border border-border/40">
                          <span className="text-[11px] text-muted-foreground block font-medium">حالة الخطاب</span>
                          <Badge variant="outline" className="text-amber-700 bg-amber-50 dark:bg-amber-950/30 border-amber-300 dark:border-amber-800 text-[11px] font-bold">
                            مسودة جاهزة للحفظ
                          </Badge>
                        </div>
                      </div>

                      {notes && (
                        <div className="pt-3 border-t border-border/40 text-xs">
                          <span className="text-[11px] text-muted-foreground block font-bold mb-1">ملاحظات / ديباجة خاصة:</span>
                          <p className="text-foreground bg-white dark:bg-slate-900 p-3 rounded-lg border border-border/40 whitespace-pre-wrap">
                            {notes}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* جدول الأصناف والكميات المحددة - عرض فقط */}
                    <div className="space-y-3 pt-2">
                      <div className="flex items-center justify-between pb-2 border-b border-border/40">
                        <Label className="text-right text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                          <Package className="w-4 h-4 text-sky-600" />
                          الأصناف والكميات المعتمدة للخطاب ({selectedItemIds.length} صنف)
                        </Label>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setStep(2)}
                          className="h-7 text-xs text-sky-600 hover:bg-sky-50 dark:hover:bg-sky-950/40 px-2 rounded-lg cursor-pointer font-bold"
                        >
                          تعديل الأصناف في الخطوة السابقة
                        </Button>
                      </div>

                      <div className="border border-border/60 rounded-xl overflow-hidden bg-background">
                        <table className="w-full text-xs text-right divide-y divide-border/60">
                          <thead className="bg-muted/40 font-bold text-muted-foreground">
                            <tr>
                              <th className="p-3 w-12 text-center">#</th>
                              <th className="p-3">الصنف والبيان</th>
                              <th className="p-3">الوصف والمواصفات</th>
                              <th className="p-3 text-center w-32">الكمية المعتمدة</th>
                              <th className="p-3 text-center w-24">الوحدة</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border/40">
                            {(currentSupplier?.items || currentRequest?.eligibleItems || [])
                              .filter((it: any) => selectedItemIds.includes(it.id))
                              .map((it: any, idx: number) => (
                                <tr key={it.id} className="hover:bg-muted/10 transition-colors">
                                  <td className="p-3 text-center font-mono text-muted-foreground">{idx + 1}</td>
                                  <td className="p-3 font-bold text-foreground">{it.itemName}</td>
                                  <td className="p-3 text-muted-foreground">{it.description || "-"}</td>
                                  <td className="p-3 text-center font-mono font-bold text-sky-700 dark:text-sky-300 bg-sky-50/40 dark:bg-sky-950/20">
                                    {itemsQuantities[it.id] ?? it.quantity ?? 1}
                                  </td>
                                  <td className="p-3 text-center text-muted-foreground">{it.unit || "وحدة"}</td>
                                </tr>
                              ))}
                          </tbody>
                        </table>
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
                      <span>السابق (تعديل البيانات)</span>
                    </Button>

                    <Button
                      disabled={createCsrMutation.isPending || selectedItemIds.length === 0}
                      onClick={() => handleSubmit()}
                      className="bg-sky-600 hover:bg-sky-700 text-white font-bold px-7 h-11 rounded-xl shadow-sm flex items-center gap-2 cursor-pointer text-xs w-full sm:w-auto"
                    >
                      <CheckCircle className="w-4 h-4" />
                      <span>
                        {createCsrMutation.isPending
                          ? "جاري حفظ خطاب المسؤولية..."
                          : "حفظ خطاب المسؤولية المجتمعية (مسودة)"}
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
