import { useState, useEffect, useMemo } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { numberToArabicText as baseNumberToArabicText } from "@shared/tafqeet";
import DashboardLayout from "@/components/DashboardLayout";
import { SaudiRiyal } from "@/components/SaudiRiyal";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
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
  Send,
  Building2,
  CheckCircle,
  ArrowLeft,
  Check,
  Coins,
  ShoppingCart,
  FileText,
  Package,
  AlertCircle,
  Calculator,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";

function numberToArabicText(num: number): string {
  return baseNumberToArabicText(num, { prefix: "", suffix: " فقط لا غير", currency: "ريال سعودي" });
}



const SADAD_BILLERS: Record<string, string> = {
  "001": "شركة الاتصالات السعودية (STC)",
  "002": "الشركة السعودية للكهرباء",
  "003": "شركة المياه الوطنية",
  "050": "وزارة الداخلية - المرور",
  "085": "وزارة الموارد البشرية والتنمية الاجتماعية",
  "101": "وزارة التجارة",
  "144": "الهيئة السعودية للمواصفات والمقاييس والجودة",
  "166": "المؤسسة العامة للتأمينات الاجتماعية",
  "017": "موبايلي",
  "044": "زين",
  "022": "الخطوط السعودية",
  "090": "الشركة الوطنية للغاز والتصنيع (غازكو)"
};

export default function NewDirectDisbursementOrder() {
  const { user } = useAuth();
  const [, navigate] = useLocation();

  // الحالات والخطوات
  const [step, setStep] = useState<number>(1);
  const [requestType, setRequestType] = useState<string>("supplier_one_time");
  const [showAttachmentFields, setShowAttachmentFields] = useState<boolean>(false);

  // حالات أوامر الشراء وخطابات المسؤولية المجتمعية
  const [selectedOrderNumber, setSelectedOrderNumber] = useState<string>("");
  const [procurementItems, setProcurementItems] = useState<Array<{
    id: string;
    itemName: string;
    description: string;
    quantity: number;
    unit: string;
    unitPrice: number;
    totalPrice: number;
  }>>([]);
  const [adminFees, setAdminFees] = useState<number>(0);

  // بيانات النموذج
  const [formData, setFormData] = useState({
    fundingSupport: "",
    mainProjectName: "",
    customProjectName: "",
    requiredWorksDesc: "",
    title: "",
    amount: 0,
    dateMiladi: new Intl.DateTimeFormat('en-CA', { year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date()),
    linkName: "",
    linkUrl: "",
    
    // بيانات المستفيد
    beneficiaryName: "",
    beneficiaryBank: "",
    beneficiaryIban: "",
    bankAccountName: "",
    sadadNumber: "",
    billerCode: "",
    billerName: "",
  });

  // استعلامات TRPC
  const { data: fundingSupportData } = trpc.categories.getCategoryByType.useQuery({ type: "funding_support" });
  const { data: mainProjectsData } = trpc.categories.getCategoryByType.useQuery({ type: "main_projects" });
  const { data: sadadBillersData } = trpc.categories.getCategoryByType.useQuery({ type: "sadad_billers" });
  const { data: allSuppliers } = trpc.suppliers.getActiveSuppliers.useQuery({ includeUnapproved: true });
  const { data: approvedProcurement, isLoading: isLoadingProcurement } = trpc.disbursements.getApprovedProcurementOrders.useQuery();

  // تصفية الأوامر المعتمدة حسب نوع الصرف
  const filteredProcurementOrders = useMemo(() => {
    if (!approvedProcurement) return [];
    if (requestType === "purchase_order") {
      return approvedProcurement.filter((o: any) => o.type === "purchase_order");
    }
    if (requestType === "csr_letter") {
      return approvedProcurement.filter((o: any) => o.type === "csr_letter");
    }
    return [];
  }, [approvedProcurement, requestType]);

  // التحقق مما إذا كان المستند ممرراً عبر الرابط لتثبيته
  const hasUrlOrder = useMemo(() => {
    if (typeof window === "undefined") return false;
    const params = new URLSearchParams(window.location.search);
    return Boolean(params.get("po") || params.get("csr") || params.get("orderNumber") || params.get("letterNumber"));
  }, []);

  // استخراج معلمات URL إن وجدت (للربط المباشر من صفحات المشتريات)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const poNum = params.get("po");
    const csrNum = params.get("csr");
    const src = params.get("source");
    const ordNum = params.get("orderNumber") || params.get("letterNumber");

    if (poNum) {
      setRequestType("purchase_order");
      setSelectedOrderNumber(poNum.trim());
    } else if (csrNum) {
      setRequestType("csr_letter");
      setSelectedOrderNumber(csrNum.trim());
    } else if (src === "purchase_order" || src === "csr_letter") {
      setRequestType(src);
      if (ordNum) {
        setSelectedOrderNumber(ordNum.trim());
      }
    }
  }, [window.location.search]);

  // إذا تم اختيار نوع الصرف ولم يتم تحديد رقم المستند بعد، وكان هناك مستند واحد فقط متاح، حدده تلقائياً
  useEffect(() => {
    if ((requestType === "purchase_order" || requestType === "csr_letter") && !selectedOrderNumber && filteredProcurementOrders.length === 1) {
      setSelectedOrderNumber(filteredProcurementOrders[0].orderNumber);
    }
  }, [requestType, selectedOrderNumber, filteredProcurementOrders]);

  // عند اختيار أمر شراء أو خطاب مسؤولية مجتمعية: تعبئة البيانات والبنود تلقائياً
  useEffect(() => {
    if (!selectedOrderNumber || !approvedProcurement) return;
    const found = approvedProcurement.find((o: any) => 
      o.orderNumber?.trim().toLowerCase() === selectedOrderNumber?.trim().toLowerCase()
    );
    if (found) {
      const items = Array.isArray(found.items) ? found.items.map((it: any) => {
        const qty = parseFloat(it.quantity || "1");
        const price = parseFloat(it.unitPrice || "0");
        return {
          id: String(it.id),
          itemName: it.itemName || "صنف",
          description: it.description || "",
          quantity: qty,
          unit: it.unit || "وحدة",
          unitPrice: price,
          totalPrice: it.totalPrice ? parseFloat(it.totalPrice) : qty * price,
        };
      }) : [];
      setProcurementItems(items);

      const itemsSum = items.reduce((sum: number, it: any) => sum + (it.totalPrice || 0), 0);
      const totalAmt = itemsSum + (adminFees || 0);

      setFormData(prev => ({
        ...prev,
        mainProjectName: prev.mainProjectName || "برنامج سدانة لعمارة المساجد",
        fundingSupport: prev.fundingSupport || "دعم مخصص / سدانة",
        customProjectName: found.mosqueName ? `مشروع سدانة - ${found.mosqueName}` : `طلب سدانة #${found.requestNumber}`,
        title: `${found.typeLabel} رقم ${found.orderNumber} - ${found.supplierName}`,
        requiredWorksDesc: prev.requiredWorksDesc || "",
        amount: totalAmt,
        beneficiaryName: found.supplierName || prev.beneficiaryName,
        bankAccountName: found.supplierAccountName || found.supplierName || prev.bankAccountName,
        beneficiaryBank: found.supplierBank || prev.beneficiaryBank,
        beneficiaryIban: found.supplierIban || prev.beneficiaryIban,
      }));
    }
  }, [selectedOrderNumber, approvedProcurement]);

  // حساب مجموع البنود تلقائياً
  const itemsTotal = useMemo(() => {
    return procurementItems.reduce((sum, it) => sum + (it.totalPrice || 0), 0);
  }, [procurementItems]);

  // تحديث المبلغ الإجمالي عند تغير البنود أو الأجور الإدارية
  useEffect(() => {
    if (requestType === "purchase_order" || requestType === "csr_letter") {
      const total = itemsTotal + (Number(adminFees) || 0);
      setFormData(prev => ({ ...prev, amount: total }));
    }
  }, [itemsTotal, adminFees, requestType]);

  // تعديل كمية أو سعر بند
  const handleItemChange = (index: number, field: 'quantity' | 'unitPrice', val: number) => {
    setProcurementItems(prev => {
      const updated = [...prev];
      const it = { ...updated[index] };
      if (field === 'quantity') it.quantity = val;
      if (field === 'unitPrice') it.unitPrice = val;
      it.totalPrice = Math.round((it.quantity * it.unitPrice) * 100) / 100;
      updated[index] = it;
      return updated;
    });
  };

  const createDirectOrderMutation = trpc.disbursements.createDirectOrder.useMutation({
    onSuccess: (data) => {
      toast.success("تم إنشاء أمر الصرف المباشر بنجاح");
      navigate("/disbursement-orders");
    },
    onError: (error) => {
      toast.error(`خطأ: ${error.message}`);
    },
  });

  // معالجة تغيير اسم المستفيد والبحث عن مورد متطابق للتعبئة التلقائية
  const handleBeneficiaryNameChange = (val: string) => {
    setFormData(prev => {
      const matched = allSuppliers?.find(s => s.name.trim() === val.trim());
      if (matched) {
        return {
          ...prev,
          beneficiaryName: val,
          bankAccountName: matched.bankAccountName || prev.bankAccountName,
          beneficiaryBank: matched.bankName || prev.beneficiaryBank,
          beneficiaryIban: matched.iban || prev.beneficiaryIban
        };
      }
      return {
        ...prev,
        beneficiaryName: val
      };
    });
  };

  // معالجة تغيير رمز المفوتر للبحث التلقائي في سداد والتعبئة التلقائية
  const handleBillerCodeChange = (val: string) => {
    const matchedBiller = sadadBillersData?.values?.find((v: any) => v.value === val);
    const matchedName = matchedBiller ? matchedBiller.valueAr : SADAD_BILLERS[val];
    setFormData(prev => ({
      ...prev,
      billerCode: val,
      billerName: matchedName || prev.billerName
    }));
  };

  const handleBillerSelect = (billerValue: string) => {
    const matchedBiller = sadadBillersData?.values?.find((v: any) => v.value === billerValue);
    if (matchedBiller) {
      setFormData(prev => ({
        ...prev,
        billerCode: matchedBiller.value,
        billerName: matchedBiller.valueAr
      }));
    }
  };

  // تغيير نوع الصرف
  const handleRequestTypeChange = (value: string) => {
    setRequestType(value);
    setSelectedOrderNumber("");
    setProcurementItems([]);
    setAdminFees(0);
    setFormData(prev => ({
      ...prev,
      beneficiaryName: "",
      beneficiaryBank: "",
      beneficiaryIban: "",
      bankAccountName: "",
      sadadNumber: "",
      billerCode: "",
      billerName: "",
      amount: 0,
      title: "",
    }));
  };

  // استخراج الحقول الناقصة لإرشاد المستخدم بدقة
  const getMissingFields = () => {
    const missing: string[] = [];
    if (requestType === "purchase_order" || requestType === "csr_letter") {
      if (!selectedOrderNumber) missing.push(requestType === "purchase_order" ? "اختيار أمر الشراء المعتمد" : "اختيار خطاب المسؤولية المعتمد");
      if (procurementItems.length === 0) missing.push("بنود المشتريات المعتمدة");
      if (!formData.title) missing.push("عنوان أمر الصرف");
      if (formData.amount <= 0) missing.push("المبلغ الإجمالي المحسوب");
      if (!formData.dateMiladi) missing.push("تاريخ الصرف");
      if (!formData.beneficiaryName) missing.push("اسم المورد / المستفيد");
      if (!formData.beneficiaryBank) missing.push("اسم البنك للمستفيد");
      if (!formData.beneficiaryIban) missing.push("رقم الآيبان (IBAN)");
      return missing;
    }

    if (!formData.mainProjectName) missing.push("اسم المشروع الرئيسي");
    if (!formData.fundingSupport) missing.push("التمويل / الدعم");
    if (!formData.title) missing.push("عنوان أمر الصرف");
    if (formData.amount <= 0) missing.push("المبلغ الإجمالي");
    if (!formData.dateMiladi) missing.push("تاريخ الصرف");
    if (!formData.customProjectName) missing.push("اسم المشروع المخصص");
    if (!formData.requiredWorksDesc) missing.push("وصف الأعمال المطلوبة");

    if (requestType === "sadad_invoice") {
      if (!formData.billerName) missing.push("اسم المفوتر");
      if (!formData.billerCode) missing.push("رمز المفوتر");
      if (!formData.sadadNumber) missing.push("رقم سداد");
    } else {
      if (!formData.beneficiaryName) missing.push("اسم المستفيد");
      if (!formData.beneficiaryBank) missing.push("اسم البنك");
      if (!formData.beneficiaryIban) missing.push("رقم الآيبان");
      if (!formData.bankAccountName) missing.push("اسم الحساب البنكي");
    }
    return missing;
  };

  // التحقق من صلاحية البيانات للخطوة التالية
  const isNextDisabled = () => {
    return getMissingFields().length > 0;
  };

  const handleNextStep = () => {
    const missing = getMissingFields();
    if (missing.length > 0) {
      toast.error(`يرجى إكمال الحقول التالية للمتابعة: ${missing.join("، ")}`);
      return;
    }
    setStep(2);
  };

  const handleSubmit = () => {
    if (formData.linkUrl.trim()) {
      const url = formData.linkUrl.trim();
      if (!url.startsWith("http://") && !url.startsWith("https://")) {
        toast.error("يرجى إدخال رابط صحيح (يجب أن يبدأ بـ http:// أو https://)");
        return;
      }
    }

    const isSadad = requestType === "sadad_invoice";
    const isProcurement = requestType === "purchase_order" || requestType === "csr_letter";
    const selectedProcOrder = approvedProcurement?.find((o: any) => o.orderNumber === selectedOrderNumber);

    const customSupplierMetadata = [{
      name: "custom_supplier_info",
      url: JSON.stringify({
        name: isSadad ? formData.billerName : formData.beneficiaryName,
        bank: isSadad ? formData.billerCode : formData.beneficiaryBank,
        iban: isSadad ? formData.sadadNumber : formData.beneficiaryIban,
        work: formData.title,
        agreedAmount: formData.amount,
        bankAccountName: formData.bankAccountName || "",
        requestType: requestType,
        fundingSupport: formData.fundingSupport,
        mainProjectName: formData.mainProjectName,
        customProjectName: formData.customProjectName || "",
        requiredWorksDesc: formData.requiredWorksDesc || "",
        billerName: isSadad ? formData.billerName : "",
        sadadNumber: isSadad ? formData.sadadNumber : "",
        billerCode: isSadad ? formData.billerCode : "",
        purchaseOrderNumber: requestType === "purchase_order" ? selectedOrderNumber : undefined,
        csrLetterNumber: requestType === "csr_letter" ? selectedOrderNumber : undefined,
        itemsTotal: isProcurement ? itemsTotal : undefined,
        adminFees: isProcurement ? (Number(adminFees) || 0) : undefined,
      }),
      type: "metadata"
    }];

    const attachmentsList = [...customSupplierMetadata];
    if (formData.linkUrl.trim()) {
      attachmentsList.push({
        name: formData.linkName.trim() || "رابط خارجي",
        url: formData.linkUrl.trim(),
        type: "link"
      });
    }

    createDirectOrderMutation.mutate({
      projectId: null,
      requestId: selectedProcOrder?.requestId || null,
      purchaseOrderNumber: requestType === "purchase_order" ? selectedOrderNumber : undefined,
      csrLetterNumber: requestType === "csr_letter" ? selectedOrderNumber : undefined,
      sourceType: isProcurement ? requestType : "direct",
      itemsJson: isProcurement && procurementItems.length > 0 ? JSON.stringify(procurementItems) : undefined,
      itemsTotal: isProcurement ? itemsTotal : undefined,
      adminFees: isProcurement ? (Number(adminFees) || 0) : undefined,
      title: formData.title,
      amount: formData.amount,
      dateMiladi: formData.dateMiladi,
      attachments: attachmentsList,
      
      // بيانات المستفيد
      beneficiaryName: isSadad ? formData.billerName : formData.beneficiaryName,
      beneficiaryBank: isSadad ? formData.billerCode : formData.beneficiaryBank,
      beneficiaryIban: isSadad ? formData.sadadNumber : formData.beneficiaryIban,
      beneficiaryAccountName: isSadad ? undefined : formData.bankAccountName,
      paymentMethod: isSadad ? "sadad" : "bank_transfer",
      sadadNumber: isSadad ? formData.sadadNumber : undefined,
      billerCode: isSadad ? formData.billerCode : undefined,
    });
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-4xl mx-auto px-4 sm:px-0">
        {/* رأس الصفحة */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="icon"
              onClick={() => {
                if (step === 2) setStep(1);
                else navigate("/disbursement-orders");
              }}
              className="rounded-xl flex-shrink-0"
            >
              <ArrowRight className="h-4 w-4" />
            </Button>
            <div className="text-right">
              <h1 className="text-xl sm:text-2xl font-bold">إضافة أمر صرف مباشر</h1>
              <p className="text-muted-foreground text-xs sm:text-sm mt-0.5">إنشاء أمر صرف مباشر على الفور للبنود المدعومة</p>
            </div>
          </div>
        </div>

        {/* مؤشر الخطوات */}
        <div className="w-full bg-white dark:bg-slate-900 border border-border/40 p-4 rounded-xl flex items-center justify-between text-right">
          <div className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${step === 1 ? 'bg-primary text-white' : 'bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-400'}`}>
              {step === 1 ? "1" : <Check className="w-4 h-4" />}
            </div>
            <span className="text-xs sm:text-sm font-bold">تعبئة البيانات</span>
          </div>
          <div className="flex-1 border-t border-dashed border-slate-200 dark:border-slate-800 mx-4"></div>
          <div className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${step === 2 ? 'bg-primary text-white' : 'bg-slate-100 text-slate-500 dark:bg-slate-800'}`}>
              2
            </div>
            <span className={`text-xs sm:text-sm font-bold ${step === 2 ? 'text-primary' : 'text-muted-foreground'}`}>المطابقة والبيانات المالية</span>
          </div>
        </div>

        {step === 1 ? (
          /* الخطوة الأولى: تعبئة البيانات */
          <div className="space-y-6">
            <Card className="border-border/60 shadow-sm rounded-xl overflow-hidden bg-white dark:bg-slate-900">
              <CardHeader className="bg-muted/30 border-b border-border/40 py-4 text-right">
                <CardTitle className="flex items-center gap-2 text-foreground text-base font-bold">
                  <Coins className="h-4.5 w-4.5 text-primary" />
                  تفاصيل الصرف
                </CardTitle>
                <CardDescription className="text-right text-xs text-muted-foreground">حدد نوع الصرف والمشروع والمبلغ</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6 pt-6 text-right" dir="rtl">
                {/* خيار نوع طلب الصرف كقائمة منسدلة */}
                <div className="space-y-2 text-right">
                  <Label className="text-right text-xs font-bold text-slate-700 dark:text-slate-300">نوع الصرف *</Label>
                  <Select
                    value={requestType}
                    onValueChange={handleRequestTypeChange}
                    disabled={hasUrlOrder}
                  >
                    <SelectTrigger className="text-right border-border focus:ring-primary rounded-xl h-11 bg-background w-full disabled:opacity-75 disabled:cursor-not-allowed" dir="rtl">
                      <SelectValue placeholder="اختر نوع الصرف" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="supplier_one_time" className="text-right">سداد مورد لمرة واحدة بفاتورة</SelectItem>
                      <SelectItem value="sadad_invoice" className="text-right">فواتير نظام سداد</SelectItem>
                      <SelectItem value="misc_expenses" className="text-right">مصروفات منوعة</SelectItem>
                      <SelectItem value="purchase_order" className="text-right font-bold text-emerald-700 dark:text-emerald-400">أمر شراء معتمد (سدانة)</SelectItem>
                      <SelectItem value="csr_letter" className="text-right font-bold text-sky-700 dark:text-sky-400">خطاب مسؤولية مجتمعية معتمد (سدانة)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* بطاقة تحديد أمر الشراء أو خطاب المسؤولية المجتمعية والبنود */}
                {(requestType === "purchase_order" || requestType === "csr_letter") && (
                  <div className="space-y-4 p-4 rounded-xl bg-gradient-to-br from-emerald-500/5 via-primary/5 to-slate-500/5 border-2 border-primary/20">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {requestType === "purchase_order" ? (
                          <ShoppingCart className="w-5 h-5 text-emerald-600" />
                        ) : (
                          <FileText className="w-5 h-5 text-sky-600" />
                        )}
                        <span className="font-bold text-sm text-foreground">
                          {requestType === "purchase_order"
                            ? "اختيار أمر الشراء المعتمد (سدانة)"
                            : "اختيار خطاب المسؤولية المجتمعية المعتمد (سدانة)"}
                        </span>
                      </div>
                      <Badge variant="secondary" className="text-xs">
                        {filteredProcurementOrders.length} مستندات معتمدة متاحة
                      </Badge>
                    </div>

                    {/* اختيار المستند المعتمد */}
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold">
                        {requestType === "purchase_order" ? "أمر الشراء المعتمد *" : "خطاب المسؤولية المجتمعية المعتمد *"}
                      </Label>
                      <Select
                        value={selectedOrderNumber}
                        onValueChange={(val) => setSelectedOrderNumber(val)}
                        disabled={hasUrlOrder}
                      >
                        <SelectTrigger className="text-right border-border focus:ring-primary rounded-xl h-11 bg-background w-full disabled:opacity-75 disabled:cursor-not-allowed" dir="rtl">
                          <SelectValue placeholder={isLoadingProcurement ? "جاري جلب المستندات المعتمدة..." : "اختر المستند المعتمد للربط..."} />
                        </SelectTrigger>
                        <SelectContent dir="rtl" className="max-h-72">
                          {filteredProcurementOrders.map((ord: any) => (
                            <SelectItem key={ord.orderNumber} value={ord.orderNumber} className="text-right py-2.5">
                              <div className="flex flex-col gap-0.5 text-right">
                                <div className="flex items-center justify-between gap-3">
                                  <span className="font-mono font-bold text-foreground text-xs">{ord.orderNumber}</span>
                                  <span className="text-[11px] text-muted-foreground">{ord.mosqueName}</span>
                                </div>
                                <div className="flex items-center justify-between gap-3 text-[11px] text-muted-foreground">
                                  <span>المورد: {ord.supplierName}</span>
                                  <span className="font-bold text-emerald-700 dark:text-emerald-400">
                                    {ord.itemsCount} أصناف • {ord.itemsTotal.toLocaleString()} ريال
                                  </span>
                                </div>
                                {ord.disbursementOrder && (
                                  <div className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">
                                    ⚠️ مرتبط بأمر صرف سابق: {ord.disbursementOrder.orderNumber} ({ord.disbursementOrder.status})
                                  </div>
                                )}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {filteredProcurementOrders.length === 0 && !isLoadingProcurement && (
                        <p className="text-[11px] text-amber-600 dark:text-amber-400 flex items-center gap-1 mt-1">
                          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                          <span>لا توجد {requestType === "purchase_order" ? "أوامر شراء معتمدة" : "خطابات مسؤولية مجتمعية معتمدة"} متاحة حالياً. تأكد من اعتمادها أولاً من قسم المشتريات.</span>
                        </p>
                      )}
                    </div>

                    {/* جدول البنود المشتراة المحسوبة تلقائياً */}
                    {selectedOrderNumber && procurementItems.length > 0 && (
                      <div className="space-y-3 pt-3 border-t border-border/60">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                            <Package className="w-4 h-4 text-primary" />
                            <span>بنود التوريد والمشتريات المعتمدة ({procurementItems.length} بنود):</span>
                          </span>
                          <span className="text-[11px] text-muted-foreground">
                            بيانات البنود معتمدة رسمياً ولا يمكن تعديلها (تحديد الأجور الإدارية فقط متاح أدناه)
                          </span>
                        </div>

                        <div className="border border-border/80 rounded-xl overflow-hidden bg-background">
                          <Table className="text-xs text-right">
                            <TableHeader className="bg-muted/40">
                              <TableRow>
                                <TableHead className="w-8 text-center font-bold">#</TableHead>
                                <TableHead className="font-bold">اسم البند والوصف</TableHead>
                                <TableHead className="w-24 text-center font-bold">الكمية</TableHead>
                                <TableHead className="w-28 text-center font-bold">سعر الوحدة (ر.س)</TableHead>
                                <TableHead className="w-28 text-center font-bold">الإجمالي (ر.س)</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody className="divide-y divide-border">
                              {procurementItems.map((item, idx) => (
                                <TableRow key={item.id || idx}>
                                  <TableCell className="text-center font-mono text-muted-foreground">{idx + 1}</TableCell>
                                  <TableCell>
                                    <div className="font-bold text-foreground">{item.itemName}</div>
                                    {item.description && (
                                      <div className="text-[10px] text-muted-foreground">{item.description}</div>
                                    )}
                                  </TableCell>
                                  <TableCell className="text-center">
                                    <Input
                                      type="number"
                                      value={item.quantity}
                                      disabled
                                      className="h-8 text-center font-mono font-bold text-xs bg-muted/50 text-foreground cursor-not-allowed disabled:opacity-90 border-muted"
                                    />
                                  </TableCell>
                                  <TableCell className="text-center">
                                    <Input
                                      type="number"
                                      value={item.unitPrice}
                                      disabled
                                      className="h-8 text-center font-mono font-bold text-xs bg-muted/50 text-foreground cursor-not-allowed disabled:opacity-90 border-muted"
                                    />
                                  </TableCell>
                                  <TableCell className="text-center font-mono font-bold text-emerald-700 dark:text-emerald-400">
                                    {(item.totalPrice || 0).toLocaleString()} <SaudiRiyal className="w-3 h-3 inline" />
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>

                        {/* ملخص الحسابات وخانة الأجور الإدارية المخصصة */}
                        <div className="p-3.5 bg-background rounded-xl border border-border/80 space-y-3">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
                            <div className="space-y-1">
                              <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                                مجموع بنود المشتريات (تلقائي):
                              </Label>
                              <div className="text-lg font-black text-emerald-700 dark:text-emerald-400 font-mono">
                                {itemsTotal.toLocaleString()} <SaudiRiyal className="w-4 h-4 inline" />
                              </div>
                            </div>

                            <div className="space-y-1">
                              <Label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                                <span>الأجور الإدارية الإضافية</span>
                                <span className="text-[10px] text-muted-foreground font-normal">(ر.س)</span>
                              </Label>
                              <Input
                                type="number"
                                min="0"
                                step="any"
                                placeholder="0.00"
                                value={adminFees || ""}
                                onChange={(e) => setAdminFees(parseFloat(e.target.value) || 0)}
                                className="h-9 font-mono font-bold text-right text-xs bg-background border-primary/50 focus:border-primary focus:ring-1 focus:ring-primary"
                              />
                            </div>
                          </div>

                          <div className="pt-2.5 border-t border-border/60 flex items-center justify-between">
                            <div>
                              <span className="text-xs font-black text-foreground block">
                                المبلغ الإجمالي المحسوب لأمر الصرف:
                              </span>
                              <span className="text-[11px] text-muted-foreground">
                                (مجموع البنود {itemsTotal.toLocaleString()} + الأجور الإدارية {adminFees.toLocaleString()})
                              </span>
                            </div>
                            <div className="text-xl font-black text-primary font-mono flex items-center gap-1">
                              {formData.amount.toLocaleString()} <SaudiRiyal className="w-5 h-5 inline" />
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* اسم المشروع الرئيسي */}
                  <div className="space-y-2 text-right">
                    <Label className="text-right text-xs font-bold text-slate-700 dark:text-slate-300">اسم المشروع الرئيسي *</Label>
                    <Select
                      value={formData.mainProjectName || ""}
                      onValueChange={(value) => setFormData({ ...formData, mainProjectName: value })}
                    >
                      <SelectTrigger className="text-right border-border focus:ring-primary rounded-xl h-11 bg-background w-full" dir="rtl">
                        <SelectValue placeholder="اختر اسم المشروع الرئيسي" />
                      </SelectTrigger>
                      <SelectContent dir="rtl">
                        {mainProjectsData?.values?.map((val: any) => (
                          <SelectItem key={val.id} value={val.valueAr} className="text-right">
                            {val.valueAr}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* التمويل / الدعم */}
                  <div className="space-y-2 text-right">
                    <Label className="text-right text-xs font-bold text-slate-700 dark:text-slate-300">التمويل / الدعم *</Label>
                    <Select
                      value={formData.fundingSupport || ""}
                      onValueChange={(value) => setFormData({ ...formData, fundingSupport: value })}
                    >
                      <SelectTrigger className="text-right border-border focus:ring-primary rounded-xl h-11 bg-background w-full" dir="rtl">
                        <SelectValue placeholder="اختر التمويل / الدعم" />
                      </SelectTrigger>
                      <SelectContent dir="rtl">
                        {fundingSupportData?.values?.map((val: any) => (
                          <SelectItem key={val.id} value={val.valueAr} className="text-right">
                            {val.valueAr}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2 text-right">
                  <Label className="text-right text-xs font-bold text-slate-700 dark:text-slate-300">اسم المشروع المخصص *</Label>
                  <Input
                    placeholder="مثال: ترميم دورات المياه بمسجد الميقات"
                    value={formData.customProjectName}
                    onChange={(e) => setFormData({ ...formData, customProjectName: e.target.value })}
                    className="border-border rounded-xl h-11 text-right focus:ring-primary w-full"
                  />
                </div>

                <div className="space-y-2 text-right">
                  <Label className="text-right text-xs font-bold text-slate-700 dark:text-slate-300">وصف الأعمال المطلوبة *</Label>
                  <Textarea
                    placeholder="أدخل وصف الأعمال المطلوبة المصاحبة لأمر الصرف..."
                    value={formData.requiredWorksDesc}
                    onChange={(e) => setFormData({ ...formData, requiredWorksDesc: e.target.value })}
                    rows={3}
                    required
                    className="text-right border-border focus:ring-primary rounded-xl text-xs leading-relaxed bg-background"
                  />
                </div>

                <Separator className="my-2 border-border/40" />

                {/* تفاصيل المبلغ والبيانات المالية */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2 text-right">
                    <Label className="text-right text-xs font-bold text-slate-700 dark:text-slate-300">عنوان أمر الصرف *</Label>
                    <Input
                      placeholder="عنوان مختصر للعملية"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      className="border-border rounded-xl h-11 text-right"
                    />
                  </div>

                  <div className="space-y-2 text-right">
                    <Label className="text-right text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">المبلغ الإجمالي (<SaudiRiyal className="w-3.5 h-3.5" />) *</Label>
                    <Input
                      type="number"
                      placeholder="0.00"
                      value={formData.amount || ""}
                      readOnly={requestType === "purchase_order" || requestType === "csr_letter"}
                      onChange={(e) => {
                        if (requestType !== "purchase_order" && requestType !== "csr_letter") {
                          setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 });
                        }
                      }}
                      className={`border-border rounded-xl h-11 text-right ${
                        (requestType === "purchase_order" || requestType === "csr_letter")
                          ? "bg-muted/50 font-mono font-bold text-primary cursor-default"
                          : ""
                      }`}
                    />
                  </div>

                  <div className="space-y-2 text-right">
                    <Label className="text-right text-xs font-bold text-slate-700 dark:text-slate-300">تاريخ الصرف (الميلادي) *</Label>
                    <Input
                      type="date"
                      value={formData.dateMiladi}
                      onChange={(e) => setFormData({ ...formData, dateMiladi: e.target.value })}
                      className="border-border rounded-xl h-11 text-right"
                    />
                  </div>
                </div>

                <div className="bg-slate-50 dark:bg-slate-900/40 p-4 rounded-xl border border-slate-100 dark:border-slate-800/40 mt-4 space-y-4">
                  <div className="flex items-center gap-2 justify-start">
                    <Checkbox 
                      id="add-external-link" 
                      checked={showAttachmentFields}
                      onCheckedChange={(checked) => {
                        setShowAttachmentFields(!!checked);
                        if (!checked) {
                          setFormData(prev => ({ ...prev, linkName: "", linkUrl: "" }));
                        }
                      }}
                    />
                    <Label htmlFor="add-external-link" className="text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer">
                      إضافة رابط لأمر الصرف
                    </Label>
                  </div>

                  {showAttachmentFields && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-slate-200/60 dark:border-slate-800/50">
                      <div className="space-y-2 text-right">
                        <Label className="text-right text-xs font-bold text-slate-700 dark:text-slate-300">اسم الرابط (اختياري)</Label>
                        <Input
                          placeholder="مثال: عرض سعر شركة الأعمال"
                          value={formData.linkName}
                          onChange={(e) => setFormData({ ...formData, linkName: e.target.value })}
                          className="border-border rounded-xl h-11 text-right bg-background"
                        />
                      </div>

                      <div className="space-y-2 text-right">
                        <Label className="text-right text-xs font-bold text-slate-700 dark:text-slate-300">الرابط (اختياري)</Label>
                        <Input
                          placeholder="https://example.com/quotation"
                          value={formData.linkUrl}
                          onChange={(e) => setFormData({ ...formData, linkUrl: e.target.value })}
                          className="border-border rounded-xl h-11 text-left bg-background"
                          dir="ltr"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* تفاصيل الجهة المستفيدة ودفعات سداد */}
            <Card className="border-border/60 shadow-sm rounded-xl overflow-hidden bg-white dark:bg-slate-900">
              <CardHeader className="bg-muted/30 border-b border-border/40 py-4 text-right">
                <CardTitle className="flex items-center gap-2 text-foreground text-base font-bold">
                  <Building2 className="h-4.5 w-4.5 text-primary" />
                  بيانات المستفيد
                </CardTitle>
                <CardDescription className="text-right text-xs text-muted-foreground">تفاصيل تحويل المبالغ المالية</CardDescription>
              </CardHeader>
              <CardContent className="pt-6 space-y-6 text-right" dir="rtl">
                {requestType === "sadad_invoice" ? (
                  /* واجهة فواتير نظام سداد */
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2 text-right">
                      <Label className="text-right text-xs font-bold text-slate-700 dark:text-slate-300">اختر المفوتر (للتعبئة التلقائية)</Label>
                      <Select
                        value={formData.billerCode || ""}
                        onValueChange={handleBillerSelect}
                      >
                        <SelectTrigger className="text-right border-border focus:ring-primary rounded-xl h-11 bg-background w-full" dir="rtl">
                          <SelectValue placeholder="اختر المفوتر للتعبئة التلقائية" />
                        </SelectTrigger>
                        <SelectContent dir="rtl" className="max-h-64">
                          {sadadBillersData?.values?.map((val: any) => (
                            <SelectItem key={val.id} value={val.value} className="text-right cursor-pointer py-2.5">
                              <div className="flex items-center justify-between w-full gap-4 text-xs font-bold">
                                <span className="text-slate-800 dark:text-slate-200">{val.valueAr}</span>
                                <span className="text-[10px] font-mono text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded shrink-0">{val.value}</span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2 text-right">
                      <Label className="text-right text-xs font-bold text-slate-700 dark:text-slate-300">رمز المفوتر *</Label>
                      <Input
                        placeholder="رمز المفوتر بالنظام"
                        value={formData.billerCode}
                        onChange={(e) => handleBillerCodeChange(e.target.value)}
                        className="border-border rounded-xl h-11 text-right font-mono bg-background"
                      />
                    </div>

                    <div className="space-y-2 text-right">
                      <Label className="text-right text-xs font-bold text-slate-700 dark:text-slate-300">اسم المفوتر *</Label>
                      <Input
                        placeholder="أدخل اسم المفوتر"
                        value={formData.billerName}
                        onChange={(e) => setFormData({ ...formData, billerName: e.target.value })}
                        className="border-border rounded-xl h-11 text-right bg-background"
                      />
                    </div>

                    <div className="space-y-2 text-right">
                      <Label className="text-right text-xs font-bold text-slate-700 dark:text-slate-300">رقم سداد *</Label>
                      <Input
                        placeholder="رقم الفاتورة للسداد"
                        value={formData.sadadNumber}
                        onChange={(e) => setFormData({ ...formData, sadadNumber: e.target.value })}
                        className="border-border rounded-xl h-11 text-right font-mono bg-background"
                      />
                    </div>
                  </div>
                ) : (
                  /* واجهة التحويل البنكي للموردين والجهات الأخرى */
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2 text-right">
                        <Label className="text-right text-xs font-bold text-slate-700 dark:text-slate-300">اسم المستفيد / المورد *</Label>
                        <Input
                          placeholder="الاسم الثلاثي أو اسم الشركة"
                          list="suppliers-list"
                          value={formData.beneficiaryName}
                          onChange={(e) => handleBeneficiaryNameChange(e.target.value)}
                          className="border-border rounded-xl h-11 text-right"
                        />
                        <datalist id="suppliers-list">
                          {allSuppliers?.map((s: any) => (
                            <option key={s.id} value={s.name} />
                          ))}
                        </datalist>
                      </div>

                      <div className="space-y-2 text-right">
                        <Label className="text-right text-xs font-bold text-slate-700 dark:text-slate-300">اسم الحساب البنكي *</Label>
                        <Input
                          placeholder="أدخل اسم الحساب البنكي"
                          value={formData.bankAccountName}
                          onChange={(e) => setFormData({ ...formData, bankAccountName: e.target.value })}
                          className="border-border rounded-xl h-11 text-right"
                        />
                      </div>

                      <div className="space-y-2 text-right">
                        <Label className="text-right text-xs font-bold text-slate-700 dark:text-slate-300">اسم البنك للمستفيد *</Label>
                        <Input
                          placeholder="مثال: مصرف الراجحي"
                          value={formData.beneficiaryBank}
                          onChange={(e) => setFormData({ ...formData, beneficiaryBank: e.target.value })}
                          className="border-border rounded-xl h-11 text-right"
                        />
                      </div>

                      <div className="space-y-2 text-right">
                        <Label className="text-right text-xs font-bold text-slate-700 dark:text-slate-300">رقم الآيبان للمستفيد (IBAN) *</Label>
                        <Input
                          placeholder="SA..."
                          value={formData.beneficiaryIban}
                          onChange={(e) => setFormData({ ...formData, beneficiaryIban: e.target.value.toUpperCase() })}
                          className="border-border rounded-xl h-11 text-left font-mono"
                          dir="ltr"
                        />
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* أزرار الانتقال */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-4 border-t border-border/60">
              <div className="text-xs">
                {isNextDisabled() ? (
                  <span className="text-amber-600 dark:text-amber-400 flex items-center gap-1.5 font-medium">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>الحقول المتبقية للمتابعة: {getMissingFields().join(" • ")}</span>
                  </span>
                ) : (
                  <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5 font-bold">
                    <CheckCircle className="w-4 h-4 shrink-0" />
                    <span>كافة البيانات مكتملة، يمكنك المتابعة للخطوة التالية.</span>
                  </span>
                )}
              </div>
              <Button
                onClick={handleNextStep}
                disabled={isNextDisabled()}
                className="bg-primary hover:bg-primary/95 text-white font-bold h-11 px-8 rounded-xl gap-2 shadow-sm transition-all cursor-pointer"
              >
                <span>الخطوة التالية</span>
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </div>
          </div>
        ) : (
          /* الخطوة الثانية: المطابقة والبيانات المالية */
          <div className="space-y-6">
            <Card className="border-border/60 shadow-sm rounded-xl overflow-hidden bg-white dark:bg-slate-900">
              <CardHeader className="bg-muted/30 border-b border-border/40 py-4 text-right">
                <CardTitle className="flex items-center gap-2 text-foreground text-base font-bold">
                  <CheckCircle className="h-4.5 w-4.5 text-primary" />
                  الخطوة 2: المطابقة والبيانات المالية
                </CardTitle>
                <CardDescription className="text-right text-xs">تأكد من صحة كافة تفاصيل البنود والتحويل المالي المعبأة قبل الإرسال</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5 pt-6 text-right" dir="rtl">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2 text-right">
                    <Label className="text-right text-xs font-bold text-slate-700 dark:text-slate-300">تاريخ الصرف الميلادي *</Label>
                    <Input
                      type="date"
                      value={formData.dateMiladi}
                      readOnly
                      className="text-right border-border focus:ring-0 rounded-xl h-10 font-bold text-slate-900 dark:text-slate-100 bg-slate-50/50 dark:bg-slate-900/30 cursor-default"
                    />
                  </div>
                  
                  <div className="space-y-2 text-right">
                    <Label className="text-right text-xs font-bold text-slate-700 dark:text-slate-300">التمويل / الدعم *</Label>
                    <Input
                      value={formData.fundingSupport}
                      readOnly
                      className="text-right border-border focus:ring-0 rounded-xl h-10 font-bold text-slate-900 dark:text-slate-100 bg-slate-50/50 dark:bg-slate-900/30 cursor-default"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2 text-right">
                    <Label className="text-right text-xs font-bold text-slate-700 dark:text-slate-300">المشروع الرئيسي *</Label>
                    <Input
                      value={formData.mainProjectName}
                      readOnly
                      className="text-right border-border focus:ring-0 rounded-xl h-10 font-bold text-slate-900 dark:text-slate-100 bg-slate-50/50 dark:bg-slate-900/30 cursor-default"
                    />
                  </div>

                  <div className="space-y-2 text-right">
                    <Label className="text-right text-xs font-bold text-slate-700 dark:text-slate-300">اسم المشروع المخصص *</Label>
                    <Input
                      value={formData.customProjectName}
                      readOnly
                      className="text-right border-border focus:ring-0 rounded-xl h-10 font-bold text-slate-900 dark:text-slate-100 bg-slate-50/50 dark:bg-slate-900/30 cursor-default"
                    />
                  </div>
                </div>

                <div className="space-y-2 text-right">
                  <Label className="text-right text-xs font-bold text-slate-700 dark:text-slate-300">عنوان أمر الصرف *</Label>
                  <Input
                    value={formData.title}
                    readOnly
                    className="text-right border-border focus:ring-0 rounded-xl h-10 font-bold text-slate-900 dark:text-slate-100 bg-slate-50/50 dark:bg-slate-900/30 cursor-default"
                  />
                </div>
              </CardContent>
            </Card>

            {/* تفاصيل الجهة المستفيدة ودفعات سداد */}
            <Card className="border-border/60 shadow-sm rounded-xl overflow-hidden bg-white dark:bg-slate-900">
              <CardHeader className="bg-muted/30 border-b border-border/40 py-4 text-right">
                <div className="text-right space-y-1">
                  <CardTitle className="flex items-center gap-2 text-foreground text-base font-bold justify-start">
                    <Building2 className="h-4.5 w-4.5 text-primary" />
                    الدفعة التي سوف تصرف (المستفيد والمبالغ الفعلية)
                  </CardTitle>
                  <CardDescription className="text-right text-xs">تفاصيل تحويل المبالغ المالية الفعلية المستحقة</CardDescription>
                </div>
              </CardHeader>
              <CardContent className="pt-6 text-right" dir="rtl">
                <div className="p-5 rounded-xl border border-border bg-slate-50/20 dark:bg-slate-900/10 space-y-4 hover:border-primary/30 transition-colors">
                  {requestType === "sadad_invoice" ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
                      <div className="space-y-2 text-right">
                        <Label className="text-right text-xs font-bold text-slate-700 dark:text-slate-300">اسم الجهة المفوترة *</Label>
                        <Input
                          value={formData.billerName}
                          readOnly
                          className="text-right border-border rounded-xl h-10 font-bold text-slate-900 dark:text-slate-100 bg-slate-50/50 dark:bg-slate-900/30 cursor-default"
                        />
                      </div>
                      <div className="space-y-2 text-right">
                        <Label className="text-right text-xs font-bold text-slate-700 dark:text-slate-300">رمز المفوتر *</Label>
                        <Input
                          value={formData.billerCode}
                          readOnly
                          className="text-right border-border rounded-xl h-10 font-mono font-bold text-slate-900 dark:text-slate-100 bg-slate-50/50 dark:bg-slate-900/30 cursor-default"
                        />
                      </div>
                      <div className="space-y-2 text-right">
                        <Label className="text-right text-xs font-bold text-slate-700 dark:text-slate-300">رقم سداد *</Label>
                        <Input
                          value={formData.sadadNumber}
                          readOnly
                          className="text-right border-border rounded-xl h-10 font-mono font-bold text-slate-900 dark:text-slate-100 bg-slate-50/50 dark:bg-slate-900/30 cursor-default"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
                      <div className="space-y-2 text-right">
                        <Label className="text-right text-xs font-bold text-slate-700 dark:text-slate-300">اسم المستفيد / المورد *</Label>
                        <Input
                          value={formData.beneficiaryName}
                          readOnly
                          className="text-right border-border rounded-xl h-10 font-bold text-slate-900 dark:text-slate-100 bg-slate-50/50 dark:bg-slate-900/30 cursor-default"
                        />
                      </div>
                      <div className="space-y-2 text-right">
                        <Label className="text-right text-xs font-bold text-slate-700 dark:text-slate-300">اسم الحساب البنكي *</Label>
                        <Input
                          value={formData.bankAccountName}
                          readOnly
                          className="text-right border-border rounded-xl h-10 font-bold text-slate-900 dark:text-slate-100 bg-slate-50/50 dark:bg-slate-900/30 cursor-default"
                        />
                      </div>
                      <div className="space-y-2 text-right">
                        <Label className="text-right text-xs font-bold text-slate-700 dark:text-slate-300">اسم البنك *</Label>
                        <Input
                          value={formData.beneficiaryBank}
                          readOnly
                          className="text-right border-border rounded-xl h-10 font-bold text-slate-900 dark:text-slate-100 bg-slate-50/50 dark:bg-slate-900/30 cursor-default"
                        />
                      </div>
                      <div className="space-y-2 text-right">
                        <Label className="text-right text-xs font-bold text-slate-700 dark:text-slate-300">رقم الآيبان (IBAN) *</Label>
                        <Input
                          value={formData.beneficiaryIban}
                          readOnly
                          className="text-right border-border rounded-xl h-10 font-mono font-bold text-slate-900 dark:text-slate-100 bg-slate-50/50 dark:bg-slate-900/30 cursor-default"
                          dir="ltr"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>


            {/* ملخص الدفعة والتقرير المالي */}
            <Card className="border-border/60 shadow-sm rounded-xl overflow-hidden bg-white dark:bg-slate-900">
              <CardHeader className="bg-muted/30 border-b border-border/40 py-4 text-right">
                <CardTitle className="text-base font-bold flex items-center gap-2 text-foreground justify-start">
                  <Coins className="w-4.5 h-4.5 text-primary" />
                  ملخص الصرف والتقرير المالي
                </CardTitle>
                <CardDescription className="text-right text-xs">تفاصيل التدقيق والمجاميع المالية لأمر الصرف المالي</CardDescription>
              </CardHeader>
              <CardContent className="pt-6 space-y-6 text-right" dir="rtl">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-right">
                  <div className="space-y-1">
                    <span className="text-[10px] text-muted-foreground block font-bold">اسم المشروع</span>
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200 leading-snug">
                      {formData.customProjectName}
                    </span>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] text-muted-foreground block font-bold">وصف الأعمال المطلوبة</span>
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200 leading-snug whitespace-pre-wrap break-words">
                      {formData.requiredWorksDesc || "—"}
                    </span>
                  </div>
                </div>

                <Separator />

                <div className="p-3 sm:p-4 rounded-xl bg-primary/[0.03] border border-primary/20 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
                  <div className="space-y-1">
                    <span className="text-[10px] text-primary block font-black">إجمالي الدفعة الفعلية التي سوف تصرف</span>
                    <span className="text-xl sm:text-2xl font-black text-primary inline-flex items-center gap-1">
                      {formData.amount.toLocaleString()} <SaudiRiyal className="w-5 h-5 inline" />
                    </span>
                  </div>
                  <div className="text-xs text-left">
                    <span className="text-muted-foreground block text-[9px] text-left">تفقيط المبلغ</span>
                    <span className="font-bold text-foreground text-left block">{numberToArabicText(formData.amount)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Navigation Actions */}
            <div className="flex flex-col sm:flex-row-reverse items-stretch sm:items-center justify-between border-t border-border/60 pt-4 gap-3">
              <Button
                onClick={handleSubmit}
                disabled={createDirectOrderMutation.isPending}
                className="gradient-primary text-white font-bold px-6 sm:px-8 h-10 sm:h-11 rounded-xl shadow-sm text-xs sm:text-sm w-full sm:w-auto cursor-pointer"
              >
                {createDirectOrderMutation.isPending ? "جاري الحفظ..." : "تأكيد وإنشاء أمر الصرف"}
              </Button>
              <Button
                variant="outline"
                onClick={() => setStep(1)}
                className="text-slate-700 border-border hover:bg-muted font-bold px-4 sm:px-6 h-10 sm:h-11 text-xs rounded-xl w-full sm:w-auto cursor-pointer"
              >
                السابق
              </Button>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
