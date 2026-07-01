import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
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
  Plus,
  Trash2,
  Building2,
  FileText,
  AlertCircle,
  CheckCircle,
  ArrowLeft,
  Info,
  Eye,
  Check,
  Coins,
  Wallet,
  Banknote,
  Upload,
} from "lucide-react";
import { toast } from "sonner";

// دالة تحويل الأرقام إلى نص عربي
function numberToArabicText(num: number): string {
  if (num === 0) return "صفر ريال";
  
  const ones = ["", "واحد", "اثنان", "ثلاثة", "أربعة", "خمسة", "ستة", "سبعة", "ثمانية", "تسعة"];
  const tens = ["", "عشر", "عشرون", "ثلاثون", "أربعون", "خمسون", "ستون", "سبعون", "ثمانون", "تسعون"];
  const teens = ["عشرة", "أحد عشر", "اثنا عشر", "ثلاثة عشر", "أربعة عشر", "خمسة عشر", "ستة عشر", "سبعة عشر", "ثمانية عشر", "تسعة عشر"];
  const hundreds = ["", "مائة", "مائتان", "ثلاثمائة", "أربعمائة", "خمسمائة", "ستمائة", "سبعمائة", "ثمانمائة", "تسعمائة"];

  function convertHundreds(n: number): string {
    if (n === 0) return "";
    if (n < 10) return ones[n];
    if (n < 20) return teens[n - 10];
    if (n < 100) {
      const t = Math.floor(n / 10);
      const o = n % 10;
      return o ? `${ones[o]} و${tens[t]}` : tens[t];
    }
    const h = Math.floor(n / 100);
    const rest = n % 100;
    return rest ? `${hundreds[h]} و${convertHundreds(rest)}` : hundreds[h];
  }

  function convertThousands(n: number): string {
    if (n < 1000) return convertHundreds(n);
    const thousands = Math.floor(n / 1000);
    const rest = n % 1000;
    let result = "";
    if (thousands === 1) result = "ألف";
    else if (thousands === 2) result = "ألفان";
    else if (thousands <= 10) result = `${ones[thousands]} آلاف`;
    else result = `${convertHundreds(thousands)} ألف`;
    return rest ? `${result} و${convertHundreds(rest)}` : result;
  }

  const intPart = Math.floor(num);
  return `${convertThousands(intPart)} ريال سعودي فقط لا غير`;
}

interface AttachmentEntry {
  name: string;
  url: string;
  type: string;
}

export default function NewDirectDisbursementOrder() {
  const { user } = useAuth();
  const [, navigate] = useLocation();

  // الحالات والخطوات
  const [step, setStep] = useState<number>(1);
  const [requestType, setRequestType] = useState<string>("supplier_one_time");

  // بيانات النموذج
  const [formData, setFormData] = useState({
    projectId: undefined as number | undefined,
    fundingSupport: "",
    mainProjectName: "",
    customProjectName: "",
    title: "",
    description: "",
    amount: 0,
    dateMiladi: new Date().toISOString().split("T")[0],
    
    // بيانات المستفيد
    beneficiaryName: "",
    beneficiaryBank: "",
    beneficiaryIban: "",
    paymentMethod: "bank_transfer",
    sadadNumber: "",
    billerCode: "",
    billerName: "",
  });

  const [attachments, setAttachments] = useState<AttachmentEntry[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  // استعلامات TRPC
  const { data: projects } = trpc.projects.getAll.useQuery({});
  const { data: fundingSupportData } = trpc.categories.getCategoryByType.useQuery({ type: "funding_support" });
  const { data: mainProjectsData } = trpc.categories.getCategoryByType.useQuery({ type: "main_projects" });
  const { data: sadadBillersData } = trpc.categories.getCategoryByType.useQuery({ type: "sadad_billers" });

  const createDirectOrderMutation = trpc.disbursements.createDirectOrder.useMutation({
    onSuccess: (data) => {
      toast.success("تم إنشاء أمر الصرف المباشر بنجاح");
      navigate("/disbursement-orders");
    },
    onError: (error) => {
      toast.error(`خطأ: ${error.message}`);
    },
  });

  // تغيير نوع الصرف
  const handleRequestTypeChange = (value: string) => {
    setRequestType(value);
    setFormData(prev => ({
      ...prev,
      paymentMethod: value === "sadad_invoice" ? "sadad" : "bank_transfer",
      beneficiaryName: "",
      beneficiaryBank: "",
      beneficiaryIban: "",
      sadadNumber: "",
      billerCode: "",
      billerName: "",
    }));
  };

  // رفع الملفات
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    
    setIsUploading(true);
    const uploadData = new FormData();
    uploadData.append("file", file);

    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        body: uploadData,
      });

      if (!res.ok) {
        throw new Error("فشل رفع الملف");
      }

      const data = await res.json();
      setAttachments(prev => [
        ...prev,
        {
          name: file.name,
          url: data.url,
          type: file.type.startsWith("image/") ? "image" : file.type === "application/pdf" ? "pdf" : "other",
        }
      ]);
      toast.success("تم رفع الملف بنجاح");
    } catch (err: any) {
      toast.error(err.message || "حدث خطأ أثناء رفع الملف");
    } finally {
      setIsUploading(false);
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  // التحقق من صلاحية البيانات للخطوة التالية
  const isNextDisabled = () => {
    if (!formData.mainProjectName || !formData.fundingSupport) return true;
    if (!formData.title || formData.amount <= 0 || !formData.dateMiladi) return true;

    if (requestType === "sadad_invoice") {
      return !formData.billerName || !formData.billerCode || !formData.sadadNumber;
    } else {
      return !formData.beneficiaryName || !formData.beneficiaryBank || !formData.beneficiaryIban;
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
    const isSadad = requestType === "sadad_invoice";
    createDirectOrderMutation.mutate({
      projectId: formData.projectId || null,
      title: formData.title,
      description: formData.description,
      amount: formData.amount,
      dateMiladi: formData.dateMiladi,
      attachments: attachments.length > 0 ? attachments : undefined,
      
      // بيانات المستفيد
      beneficiaryName: isSadad ? formData.billerName : formData.beneficiaryName,
      beneficiaryBank: isSadad ? formData.billerCode : formData.beneficiaryBank,
      beneficiaryIban: isSadad ? formData.sadadNumber : formData.beneficiaryIban,
      paymentMethod: formData.paymentMethod,
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
            <span className={`text-xs sm:text-sm font-bold ${step === 2 ? 'text-primary' : 'text-muted-foreground'}`}>المراجعة والاعتماد</span>
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

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* اختيار المشروع التقني المرتبط (اختياري) */}
                  <div className="space-y-2 text-right">
                    <Label className="text-right text-xs font-bold text-slate-700 dark:text-slate-300">المشروع المرتبط بالنظام (اختياري)</Label>
                    <Select
                      value={formData.projectId ? String(formData.projectId) : ""}
                      onValueChange={(value) => setFormData({ ...formData, projectId: value ? (value === "none" ? undefined : parseInt(value)) : undefined })}
                    >
                      <SelectTrigger className="text-right border-border focus:ring-primary rounded-xl h-11 bg-background w-full" dir="rtl">
                        <SelectValue placeholder="اختر المشروع بالنظام إن وجد" />
                      </SelectTrigger>
                      <SelectContent dir="rtl">
                        <SelectItem value="none" className="text-right">لا يوجد مشروع مرتبط</SelectItem>
                        {projects?.map((proj: any) => (
                          <SelectItem key={proj.id} value={String(proj.id)} className="text-right">
                            {proj.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* الاسم الفرعي / المخصص للمشروع */}
                  <div className="space-y-2 text-right">
                    <Label className="text-right text-xs font-bold text-slate-700 dark:text-slate-300">الاسم الفرعي للمشروع *</Label>
                    <Input
                      placeholder="مثال: ترميم دورات المياه بمسجد الميقات"
                      value={formData.customProjectName}
                      onChange={(e) => setFormData({ ...formData, customProjectName: e.target.value })}
                      className="border-border rounded-xl h-11 text-right focus:ring-primary"
                    />
                  </div>
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

                <div className="space-y-2 text-right">
                  <Label className="text-right text-xs font-bold text-slate-700 dark:text-slate-300">وصف الأعمال والتفاصيل (اختياري)</Label>
                  <Textarea
                    placeholder="اكتب هنا تفاصيل الأعمال والجهة والبنود المخصصة..."
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="border-border rounded-xl text-right min-h-[90px]"
                  />
                </div>
              </CardContent>
            </Card>

            {/* تفاصيل الجهة المستفيدة ودفعات سداد */}
            <Card className="border-border/60 shadow-sm rounded-xl overflow-hidden bg-white dark:bg-slate-900">
              <CardHeader className="bg-muted/30 border-b border-border/40 py-4 text-right">
                <CardTitle className="flex items-center gap-2 text-foreground text-base font-bold">
                  <Building2 className="h-4.5 w-4.5 text-primary" />
                  بيانات المستفيد وطريقة الدفع
                </CardTitle>
                <CardDescription className="text-right text-xs text-muted-foreground">تفاصيل تحويل المبالغ المالية</CardDescription>
              </CardHeader>
              <CardContent className="pt-6 space-y-6 text-right" dir="rtl">
                {requestType === "sadad_invoice" ? (
                  /* واجهة فواتير نظام سداد */
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2 text-right">
                      <Label className="text-right text-xs font-bold text-slate-700 dark:text-slate-300">اسم الجهة المفوترة *</Label>
                      <Select
                        value={formData.billerName}
                        onValueChange={(val) => {
                          const biller = sadadBillersData?.values?.find((v: any) => v.valueAr === val);
                          setFormData({ 
                            ...formData, 
                            billerName: val, 
                            billerCode: biller ? biller.value : "" 
                          });
                        }}
                      >
                        <SelectTrigger className="text-right border-border rounded-xl h-11 bg-background w-full" dir="rtl">
                          <SelectValue placeholder="اختر المفوتر (مثل: شركة الكهرباء)" />
                        </SelectTrigger>
                        <SelectContent dir="rtl">
                          {sadadBillersData?.values?.map((val: any) => (
                            <SelectItem key={val.id} value={val.valueAr} className="text-right">
                              {val.valueAr} ({val.value})
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
                        onChange={(e) => setFormData({ ...formData, billerCode: e.target.value })}
                        className="border-border rounded-xl h-11 text-right font-mono"
                      />
                    </div>

                    <div className="space-y-2 text-right">
                      <Label className="text-right text-xs font-bold text-slate-700 dark:text-slate-300">رقم الحساب / رقم سداد الفاتورة *</Label>
                      <Input
                        placeholder="رقم الفاتورة للسداد"
                        value={formData.sadadNumber}
                        onChange={(e) => setFormData({ ...formData, sadadNumber: e.target.value })}
                        className="border-border rounded-xl h-11 text-right font-mono"
                      />
                    </div>
                  </div>
                ) : (
                  /* واجهة التحويل البنكي للموردين والجهات الأخرى */
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-2 text-right">
                        <Label className="text-right text-xs font-bold text-slate-700 dark:text-slate-300">اسم المستفيد / المورد *</Label>
                        <Input
                          placeholder="الاسم الثلاثي أو اسم الشركة"
                          value={formData.beneficiaryName}
                          onChange={(e) => setFormData({ ...formData, beneficiaryName: e.target.value })}
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

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2 text-right">
                        <Label className="text-right text-xs font-bold text-slate-700 dark:text-slate-300">طريقة الدفع *</Label>
                        <Select
                          value={formData.paymentMethod}
                          onValueChange={(val) => setFormData({ ...formData, paymentMethod: val })}
                        >
                          <SelectTrigger className="text-right border-border rounded-xl h-11 bg-background w-full" dir="rtl">
                            <SelectValue placeholder="اختر طريقة الدفع" />
                          </SelectTrigger>
                          <SelectContent dir="rtl">
                            <SelectItem value="bank_transfer" className="text-right">تحويل بنكي</SelectItem>
                            <SelectItem value="check" className="text-right">إصدار شيك رسمي</SelectItem>
                            <SelectItem value="custody" className="text-right">صرف عهدة مالية</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* المرفقات ومستندات الإثبات */}
            <Card className="border-border/60 shadow-sm rounded-xl overflow-hidden bg-white dark:bg-slate-900">
              <CardHeader className="bg-muted/30 border-b border-border/40 py-4 text-right">
                <CardTitle className="flex items-center gap-2 text-foreground text-base font-bold">
                  <Upload className="h-4.5 w-4.5 text-primary" />
                  المستندات والمرفقات الرسمية (فاتورة / إثبات)
                </CardTitle>
                <CardDescription className="text-right text-xs text-muted-foreground">قم برفع نسخة الفاتورة أو مستند إثبات الصرف لدعم العملية</CardDescription>
              </CardHeader>
              <CardContent className="pt-6 space-y-4 text-right" dir="rtl">
                <div className="flex flex-col items-center justify-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl p-8 bg-slate-50/50 dark:bg-slate-900/30">
                  <input
                    type="file"
                    id="file-upload"
                    className="hidden"
                    onChange={handleFileUpload}
                    disabled={isUploading}
                    accept="image/*,application/pdf"
                  />
                  <label 
                    htmlFor="file-upload" 
                    className={`flex flex-col items-center gap-2 cursor-pointer text-slate-500 hover:text-primary transition-colors ${isUploading ? 'opacity-50 pointer-events-none' : ''}`}
                  >
                    <Upload className="w-10 h-10 text-slate-400" />
                    <span className="text-xs sm:text-sm font-bold">
                      {isUploading ? "جاري الرفع..." : "انقر هنا لاختيار ملف الفاتورة أو المرفق"}
                    </span>
                    <span className="text-[10px] text-muted-foreground">يدعم ملفات PDF والصور حتى 10 ميجا</span>
                  </label>
                </div>

                {attachments.length > 0 && (
                  <div className="overflow-x-auto rounded-xl border border-border/40">
                    <Table dir="rtl">
                      <TableHeader className="bg-muted/40">
                        <TableRow>
                          <TableHead className="text-right">اسم الملف</TableHead>
                          <TableHead className="text-right">النوع</TableHead>
                          <TableHead className="text-left">الإجراءات</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {attachments.map((file, idx) => (
                          <TableRow key={idx}>
                            <TableCell className="text-right font-semibold text-xs sm:text-sm">{file.name}</TableCell>
                            <TableCell className="text-right text-xs text-muted-foreground">{file.type === "pdf" ? "PDF مستند" : "صورة"}</TableCell>
                            <TableCell className="text-left">
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => removeAttachment(idx)}
                                className="h-8 w-8 text-red-500 hover:bg-red-50 rounded-lg cursor-pointer"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
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
          /* الخطوة الثانية: المراجعة والاعتماد */
          <div className="space-y-6">
            <Card className="border-border/60 shadow-sm rounded-xl overflow-hidden bg-white dark:bg-slate-900">
              <CardHeader className="bg-muted/30 border-b border-border/40 py-4 text-right">
                <CardTitle className="flex items-center gap-2 text-foreground text-base font-bold">
                  <CheckCircle className="h-4.5 w-4.5 text-primary" />
                  مراجعة تفاصيل أمر الصرف قبل الإرسال
                </CardTitle>
                <CardDescription className="text-right text-xs text-muted-foreground">تأكد من صحة كافة تفاصيل البنود والتحويل المالي المعبأة</CardDescription>
              </CardHeader>
              <CardContent className="pt-6 space-y-6 text-right" dir="rtl">
                {/* 1. تفاصيل المشروع */}
                <div className="space-y-3">
                  <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 border-r-4 border-primary pr-2">بيانات المشروع والتمويل</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 dark:bg-slate-900/40 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
                    <div className="text-xs sm:text-sm"><span className="text-muted-foreground block text-[10px] sm:text-xs">المشروع الرئيسي</span><strong>{formData.mainProjectName}</strong></div>
                    <div className="text-xs sm:text-sm"><span className="text-muted-foreground block text-[10px] sm:text-xs">التمويل / الدعم</span><strong>{formData.fundingSupport}</strong></div>
                    <div className="text-xs sm:text-sm col-span-1 md:col-span-2"><span className="text-muted-foreground block text-[10px] sm:text-xs">الاسم الفرعي للمشروع</span><strong>{formData.customProjectName}</strong></div>
                  </div>
                </div>

                {/* 2. تفاصيل الصرف */}
                <div className="space-y-3">
                  <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 border-r-4 border-primary pr-2">معلومات الفاتورة والصرف</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 dark:bg-slate-900/40 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
                    <div className="text-xs sm:text-sm"><span className="text-muted-foreground block text-[10px] sm:text-xs">عنوان أمر الصرف</span><strong>{formData.title}</strong></div>
                    <div className="text-xs sm:text-sm"><span className="text-muted-foreground block text-[10px] sm:text-xs">تاريخ الصرف</span><strong>{formData.dateMiladi}</strong></div>
                    <div className="text-xs sm:text-sm col-span-1 md:col-span-2"><span className="text-muted-foreground block text-[10px] sm:text-xs">المبلغ الإجمالي</span><strong className="text-lg text-primary">{formData.amount.toLocaleString()} ريال سعودي ({numberToArabicText(formData.amount)})</strong></div>
                    {formData.description && (
                      <div className="text-xs sm:text-sm col-span-1 md:col-span-2"><span className="text-muted-foreground block text-[10px] sm:text-xs">الوصف والتفاصيل</span><p className="whitespace-pre-line bg-white dark:bg-slate-950 p-3 rounded-lg border border-slate-100 dark:border-slate-900 mt-1">{formData.description}</p></div>
                    )}
                  </div>
                </div>

                {/* 3. تفاصيل المستفيد */}
                <div className="space-y-3">
                  <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 border-r-4 border-primary pr-2">بيانات المستفيد المالي</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 dark:bg-slate-900/40 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
                    {requestType === "sadad_invoice" ? (
                      <>
                        <div className="text-xs sm:text-sm"><span className="text-muted-foreground block text-[10px] sm:text-xs">اسم الجهة المفوترة</span><strong>{formData.billerName}</strong></div>
                        <div className="text-xs sm:text-sm"><span className="text-muted-foreground block text-[10px] sm:text-xs">رمز المفوتر</span><strong>{formData.billerCode}</strong></div>
                        <div className="text-xs sm:text-sm col-span-1 md:col-span-2"><span className="text-muted-foreground block text-[10px] sm:text-xs">رقم الحساب / سداد الفاتورة</span><strong className="font-mono text-base">{formData.sadadNumber}</strong></div>
                      </>
                    ) : (
                      <>
                        <div className="text-xs sm:text-sm"><span className="text-muted-foreground block text-[10px] sm:text-xs">اسم المستفيد</span><strong>{formData.beneficiaryName}</strong></div>
                        <div className="text-xs sm:text-sm"><span className="text-muted-foreground block text-[10px] sm:text-xs">البنك المعتمد</span><strong>{formData.beneficiaryBank}</strong></div>
                        <div className="text-xs sm:text-sm col-span-1 md:col-span-2"><span className="text-muted-foreground block text-[10px] sm:text-xs">رقم الآيبان (IBAN)</span><strong className="font-mono text-base">{formData.beneficiaryIban}</strong></div>
                        <div className="text-xs sm:text-sm"><span className="text-muted-foreground block text-[10px] sm:text-xs">طريقة الدفع</span><strong>{formData.paymentMethod === "bank_transfer" ? "تحويل بنكي" : formData.paymentMethod === "check" ? "إصدار شيك" : "صرف من العهدة"}</strong></div>
                      </>
                    )}
                  </div>
                </div>

                {/* 4. قائمة المرفقات المعاينة */}
                {attachments.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 border-r-4 border-primary pr-2">المرفقات والوثائق الرسمية ({attachments.length})</h3>
                    <div className="border border-border/40 rounded-xl overflow-hidden">
                      <Table dir="rtl">
                        <TableBody>
                          {attachments.map((file, idx) => (
                            <TableRow key={idx}>
                              <TableCell className="text-right font-semibold text-xs sm:text-sm">
                                <span className="flex items-center gap-2">
                                  <FileText className="w-4 h-4 text-primary" />
                                  {file.name}
                                </span>
                              </TableCell>
                              <TableCell className="text-left">
                                <a 
                                  href={file.url} 
                                  target="_blank" 
                                  rel="noreferrer"
                                  className="text-xs font-bold text-primary hover:underline cursor-pointer"
                                >
                                  عرض الملف
                                </a>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                )}
              </CardContent>
              <CardFooter className="bg-muted/30 border-t border-border/40 p-4 sm:p-6 flex justify-between gap-3">
                <Button
                  variant="outline"
                  onClick={() => setStep(1)}
                  className="rounded-xl font-bold px-6 border-slate-200 dark:border-slate-855"
                >
                  العودة وتعديل البيانات
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={createDirectOrderMutation.isPending}
                  className="bg-green-600 hover:bg-green-700 text-white font-bold px-8 rounded-xl gap-2 shadow-sm transition-all"
                >
                  {createDirectOrderMutation.isPending ? "جاري الحفظ..." : "تأكيد وإنشاء أمر الصرف"}
                  <Send className="w-4 h-4" />
                </Button>
              </CardFooter>
            </Card>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
