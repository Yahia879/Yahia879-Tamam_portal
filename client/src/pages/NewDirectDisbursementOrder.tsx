import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { numberToArabicText as baseNumberToArabicText } from "@shared/tafqeet";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  ArrowRight,
  Send,
  Building2,
  CheckCircle,
  ArrowLeft,
  Check,
  Coins,
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

  // بيانات النموذج
  const [formData, setFormData] = useState({
    fundingSupport: "",
    mainProjectName: "",
    customProjectName: "",
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
    setFormData(prev => ({
      ...prev,
      beneficiaryName: "",
      beneficiaryBank: "",
      beneficiaryIban: "",
      bankAccountName: "",
      sadadNumber: "",
      billerCode: "",
      billerName: "",
    }));
  };

  // التحقق من صلاحية البيانات للخطوة التالية
  const isNextDisabled = () => {
    if (!formData.mainProjectName || !formData.fundingSupport) return true;
    if (!formData.title || formData.amount <= 0 || !formData.dateMiladi || !formData.customProjectName) return true;

    if (requestType === "sadad_invoice") {
      return !formData.billerName || !formData.billerCode || !formData.sadadNumber;
    } else {
      return !formData.beneficiaryName || !formData.beneficiaryBank || !formData.beneficiaryIban || !formData.bankAccountName;
    }
  };

  const handleNextStep = () => {
    if (isNextDisabled()) {
      toast.error("يرجى إكمال جميع الحقول المطلوبة بشكل صحيح");
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
        billerName: isSadad ? formData.billerName : "",
        sadadNumber: isSadad ? formData.sadadNumber : "",
        billerCode: isSadad ? formData.billerCode : "",
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
                  >
                    <SelectTrigger className="text-right border-border focus:ring-primary rounded-xl h-11 bg-background w-full" dir="rtl">
                      <SelectValue placeholder="اختر نوع الصرف" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="supplier_one_time" className="text-right">سداد مورد لمرة واحدة بفاتورة</SelectItem>
                      <SelectItem value="sadad_invoice" className="text-right">فواتير نظام سداد</SelectItem>
                      <SelectItem value="misc_expenses" className="text-right">مصروفات منوعة</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

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
                    <Label className="text-right text-xs font-bold text-slate-700 dark:text-slate-300">المبلغ الإجمالي (ريال سعودي) *</Label>
                    <Input
                      type="number"
                      placeholder="0.00"
                      value={formData.amount || ""}
                      onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })}
                      className="border-border rounded-xl h-11 text-right"
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
            <div className="flex justify-end gap-3 pt-4">
              <Button
                onClick={handleNextStep}
                disabled={isNextDisabled()}
                className="bg-primary hover:bg-primary/95 text-white font-bold h-11 px-8 rounded-xl gap-2 shadow-sm transition-all"
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
                </div>

                <Separator />

                <div className="p-3 sm:p-4 rounded-xl bg-primary/[0.03] border border-primary/20 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
                  <div className="space-y-1">
                    <span className="text-[10px] text-primary block font-black">إجمالي الدفعة الفعلية التي سوف تصرف</span>
                    <span className="text-xl sm:text-2xl font-black text-primary">
                      {formData.amount.toLocaleString()} <span className="text-xs font-semibold">ريال سعودي</span>
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
