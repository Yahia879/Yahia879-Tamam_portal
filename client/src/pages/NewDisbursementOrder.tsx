import { useState, useEffect } from "react";
import { useLocation, useParams } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
  ArrowRight,
  Save,
  Printer,
  FileText,
  Building2,
  CreditCard,
  User,
  Banknote,
  CheckCircle,
  AlertCircle,
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
    else if (thousands >= 3 && thousands <= 10) result = `${ones[thousands]} آلاف`;
    else result = `${convertHundreds(thousands)} ألف`;
    return rest ? `${result} و${convertHundreds(rest)}` : result;
  }

  function convertMillions(n: number): string {
    if (n < 1000000) return convertThousands(n);
    const millions = Math.floor(n / 1000000);
    const rest = n % 1000000;
    let result = "";
    if (millions === 1) result = "مليون";
    else if (millions === 2) result = "مليونان";
    else if (millions >= 3 && millions <= 10) result = `${ones[millions]} ملايين`;
    else result = `${convertThousands(millions)} مليون`;
    return rest ? `${result} و${convertThousands(rest)}` : result;
  }

  return `فقط ${convertMillions(Math.floor(num))} ريال سعودي لا غير`;
}

const PAYMENT_METHOD_MAP: Record<string, string> = {
  bank_transfer: "تحويل بنكي",
  check: "إصدار شيك",
  custody: "صرف من العهدة",
  sadad: "سداد",
};

export default function NewDisbursementOrder() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const params = useParams<{ requestId?: string }>();
  
  const [formData, setFormData] = useState({
    // بيانات المستفيد
    beneficiaryName: "",
    beneficiaryBank: "",
    beneficiaryBankId: 0,
    beneficiaryIban: "",
    beneficiaryAccountName: "",
    // بيانات الدفع
    paymentMethod: "bank_transfer",
    sadadNumber: "",
    billerCode: "",
    checkNumber: "",
    // بيانات إضافية
    purpose: "",
    notes: "",
    // التوقيعات
    accountantSignature: "",
    financialManagerSignature: "",
    disbursementAuthoritySignature: "",
    bankAccountManagerSignature: "",
  });

  // جلب بيانات طلب الصرف
  const { data: requestData, isLoading: requestLoading } = trpc.disbursements.getRequestById.useQuery(
    { id: parseInt(params.requestId || "0") },
    { enabled: !!params.requestId }
  );

  // جلب قائمة البنوك من التصنيفات
  const { data: banksData } = trpc.categories.getCategoryByType.useQuery({ type: "banks" });

  // جلب أصحاب صلاحية التوقيع
  const { data: signatoriesData } = trpc.categories.getCategoryByType.useQuery({ type: "signatories" });

  // Mutation لإنشاء أمر الصرف
  const createOrderMutation = trpc.disbursements.createOrder.useMutation({
    onSuccess: (data) => {
      toast.success("تم إنشاء أمر الصرف بنجاح");
      navigate(`/disbursements/orders/${data.id}/print`);
    },
    onError: (error) => {
      toast.error(error.message || "حدث خطأ أثناء إنشاء أمر الصرف");
    },
  });

  // تعبئة البيانات من طلب الصرف
  useEffect(() => {
    if (requestData?.contract) {
      setFormData(prev => ({
        ...prev,
        beneficiaryName: requestData.contract?.secondPartyName || "",
        purpose: requestData.title || "",
      }));
    }
  }, [requestData]);

  // التحقق من الصلاحيات
  const canCreateOrder = ["super_admin", "system_admin", "financial"].includes(user?.role || "");

  if (!canCreateOrder) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-96">
          <Card className="max-w-md">
            <CardContent className="pt-6 text-center">
              <AlertCircle className="h-12 w-12 mx-auto text-destructive mb-4" />
              <h2 className="text-xl font-bold mb-2">غير مصرح</h2>
              <p className="text-muted-foreground">ليس لديك صلاحية إنشاء أوامر الصرف</p>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  const handleSubmit = () => {
    if (!params.requestId) {
      toast.error("يرجى تحديد طلب الصرف");
      return;
    }

    if (!formData.beneficiaryName || !formData.beneficiaryIban) {
      toast.error("يرجى ملء بيانات المستفيد");
      return;
    }

    createOrderMutation.mutate({
      disbursementRequestId: parseInt(params.requestId),
      beneficiaryName: formData.beneficiaryName,
      beneficiaryBank: formData.beneficiaryBank,
      beneficiaryIban: formData.beneficiaryIban,
      beneficiaryAccountName: formData.beneficiaryAccountName,
      paymentMethod: formData.paymentMethod as any,
      sadadNumber: formData.sadadNumber || undefined,
      billerCode: formData.billerCode || undefined,
    });
  };

  if (requestLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </DashboardLayout>
    );
  }

  if (!requestData) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-96">
          <Card className="max-w-md">
            <CardContent className="pt-6 text-center">
              <AlertCircle className="h-12 w-12 mx-auto text-destructive mb-4" />
              <h2 className="text-xl font-bold mb-2">طلب الصرف غير موجود</h2>
              <p className="text-muted-foreground">يرجى التأكد من رقم طلب الصرف</p>
              <Button className="mt-4" onClick={() => navigate("/disbursements")}>
                العودة لطلبات الصرف
              </Button>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  const amount = parseFloat(requestData.amount?.toString() || "0");

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* العنوان */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/disbursements")}>
            <ArrowRight className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">إنشاء أمر صرف</h1>
            <p className="text-muted-foreground">
              أمر صرف لطلب رقم {requestData.requestNumber}
            </p>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* النموذج الرئيسي */}
          <div className="lg:col-span-2 space-y-6">
            {/* بيانات طلب الصرف */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  بيانات طلب الصرف
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <Label className="text-muted-foreground">رقم طلب الصرف</Label>
                    <p className="font-mono font-medium">{requestData.requestNumber}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">المبلغ</Label>
                    <p className="font-bold text-lg text-primary">
                      {amount.toLocaleString()} ريال
                    </p>
                  </div>
                  <div className="md:col-span-2">
                    <Label className="text-muted-foreground">المبلغ كتابة</Label>
                    <p className="font-medium">{numberToArabicText(amount)}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">المشروع</Label>
                    <p className="font-medium">{requestData.project?.name}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">العقد</Label>
                    <p className="font-medium">{requestData.contract?.contractNumber || "-"}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* بيانات المستفيد */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  بيانات المستفيد
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="md:col-span-2">
                    <Label>اسم المستفيد *</Label>
                    <Input
                      value={formData.beneficiaryName}
                      onChange={(e) => setFormData({ ...formData, beneficiaryName: e.target.value })}
                      placeholder="اسم المستفيد أو الشركة"
                    />
                  </div>
                  <div>
                    <Label>البنك *</Label>
                    <Select
                      value={formData.beneficiaryBankId.toString()}
                      onValueChange={(v) => {
                        const bank = banksData?.values?.find((b: any) => b.id.toString() === v);
                        setFormData({
                          ...formData,
                          beneficiaryBankId: parseInt(v),
                          beneficiaryBank: bank?.valueAr || bank?.value || "",
                        });
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="اختر البنك" />
                      </SelectTrigger>
                      <SelectContent>
                        {banksData?.values?.map((bank: any) => (
                          <SelectItem key={bank.id} value={bank.id.toString()}>
                            {bank.valueAr || bank.value}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>اسم صاحب الحساب</Label>
                    <Input
                      value={formData.beneficiaryAccountName}
                      onChange={(e) => setFormData({ ...formData, beneficiaryAccountName: e.target.value })}
                      placeholder="اسم صاحب الحساب البنكي"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <Label>رقم الآيبان *</Label>
                    <Input
                      value={formData.beneficiaryIban}
                      onChange={(e) => setFormData({ ...formData, beneficiaryIban: e.target.value })}
                      placeholder="SA0000000000000000000000"
                      className="font-mono"
                      dir="ltr"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* طريقة الدفع */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  طريقة الدفع
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <Label>طريقة الدفع *</Label>
                    <Select
                      value={formData.paymentMethod}
                      onValueChange={(v) => setFormData({ ...formData, paymentMethod: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="bank_transfer">تحويل بنكي</SelectItem>
                        <SelectItem value="check">إصدار شيك</SelectItem>
                        <SelectItem value="sadad">سداد</SelectItem>
                        <SelectItem value="custody">صرف من العهدة</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {formData.paymentMethod === "check" && (
                    <div>
                      <Label>رقم الشيك</Label>
                      <Input
                        value={formData.checkNumber}
                        onChange={(e) => setFormData({ ...formData, checkNumber: e.target.value })}
                        placeholder="رقم الشيك"
                      />
                    </div>
                  )}

                  {formData.paymentMethod === "sadad" && (
                    <>
                      <div>
                        <Label>رقم سداد</Label>
                        <Input
                          value={formData.sadadNumber}
                          onChange={(e) => setFormData({ ...formData, sadadNumber: e.target.value })}
                          placeholder="رقم سداد"
                        />
                      </div>
                      <div>
                        <Label>رمز المفوتر</Label>
                        <Input
                          value={formData.billerCode}
                          onChange={(e) => setFormData({ ...formData, billerCode: e.target.value })}
                          placeholder="رمز المفوتر"
                        />
                      </div>
                    </>
                  )}
                </div>

                <div>
                  <Label>الغرض من الصرف</Label>
                  <Textarea
                    value={formData.purpose}
                    onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
                    placeholder="وصف الغرض من الصرف"
                    rows={3}
                  />
                </div>

                <div>
                  <Label>ملاحظات</Label>
                  <Textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="ملاحظات إضافية"
                    rows={2}
                  />
                </div>
              </CardContent>
            </Card>

            {/* التوقيعات */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5" />
                  التوقيعات والاعتمادات
                </CardTitle>
                <CardDescription>
                  سيتم طباعة هذه التوقيعات على أمر الصرف
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <Label>المحاسب</Label>
                    <Select
                      value={formData.accountantSignature}
                      onValueChange={(v) => setFormData({ ...formData, accountantSignature: v })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="اختر المحاسب" />
                      </SelectTrigger>
                      <SelectContent>
                        {signatoriesData?.values?.map((sig: any) => (
                          <SelectItem key={sig.id} value={sig.valueAr || sig.value}>
                            {sig.valueAr || sig.value}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>المدير المالي</Label>
                    <Select
                      value={formData.financialManagerSignature}
                      onValueChange={(v) => setFormData({ ...formData, financialManagerSignature: v })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="اختر المدير المالي" />
                      </SelectTrigger>
                      <SelectContent>
                        {signatoriesData?.values?.map((sig: any) => (
                          <SelectItem key={sig.id} value={sig.valueAr || sig.value}>
                            {sig.valueAr || sig.value}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>صاحب صلاحية الصرف</Label>
                    <Select
                      value={formData.disbursementAuthoritySignature}
                      onValueChange={(v) => setFormData({ ...formData, disbursementAuthoritySignature: v })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="اختر صاحب الصلاحية" />
                      </SelectTrigger>
                      <SelectContent>
                        {signatoriesData?.values?.map((sig: any) => (
                          <SelectItem key={sig.id} value={sig.valueAr || sig.value}>
                            {sig.valueAr || sig.value}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>مدير الحسابات البنكية</Label>
                    <Select
                      value={formData.bankAccountManagerSignature}
                      onValueChange={(v) => setFormData({ ...formData, bankAccountManagerSignature: v })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="اختر مدير الحسابات" />
                      </SelectTrigger>
                      <SelectContent>
                        {signatoriesData?.values?.map((sig: any) => (
                          <SelectItem key={sig.id} value={sig.valueAr || sig.value}>
                            {sig.valueAr || sig.value}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* الشريط الجانبي */}
          <div className="space-y-6">
            {/* ملخص أمر الصرف */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Banknote className="h-5 w-5" />
                  ملخص أمر الصرف
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">المبلغ</span>
                    <span className="font-bold">{amount.toLocaleString()} ريال</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">طريقة الدفع</span>
                    <span>{PAYMENT_METHOD_MAP[formData.paymentMethod]}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">المستفيد</span>
                    <span>{formData.beneficiaryName || "-"}</span>
                  </div>
                </div>

                <Separator />

                <div className="space-y-2">
                  <Button
                    className="w-full"
                    onClick={handleSubmit}
                    disabled={createOrderMutation.isPending}
                  >
                    <Save className="ml-2 h-4 w-4" />
                    {createOrderMutation.isPending ? "جاري الإنشاء..." : "إنشاء أمر الصرف"}
                  </Button>
                  <Button variant="outline" className="w-full" disabled>
                    <Printer className="ml-2 h-4 w-4" />
                    معاينة الطباعة
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* معلومات المشروع */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  معلومات المشروع
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <Label className="text-muted-foreground text-xs">اسم المشروع</Label>
                  <p className="font-medium">{requestData.project?.name}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">رقم المشروع</Label>
                  <p className="font-mono">{requestData.project?.projectNumber}</p>
                </div>
                {requestData.contract && (
                  <>
                    <Separator />
                    <div>
                      <Label className="text-muted-foreground text-xs">رقم العقد</Label>
                      <p className="font-mono">{requestData.contract.contractNumber}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground text-xs">المقاول</Label>
                      <p className="font-medium">{requestData.contract.secondPartyName}</p>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
