import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { SaudiRiyal } from "@/components/SaudiRiyal";
import { numberToArabicText } from "@shared/tafqeet";
import {
  Wallet,
  ArrowRight,
  Landmark,
  Building2,
  CreditCard,
  User,
  Phone,
  Mail,
  PenTool,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Loader2,
  Send,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";

export default function NewCustodyRequest() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const utils = trpc.useUtils();

  // نموذج الطلب
  const [title, setTitle] = useState("");
  const [amountStr, setAmountStr] = useState("");
  const [description, setDescription] = useState("");

  // البيانات البنكية
  const [isCustomBank, setIsCustomBank] = useState(false);
  const [bankName, setBankName] = useState("");
  const [bankAccountName, setBankAccountName] = useState("");
  const [bankIban, setBankIban] = useState("");

  // تعبئة البيانات البنكية الافتراضية من ملف المستخدم
  useEffect(() => {
    if (user && !isCustomBank) {
      setBankName((user as any).bankName || "");
      setBankAccountName((user as any).bankAccountName || user.name || "");
      setBankIban((user as any).bankIban || "");
    }
  }, [user, isCustomBank]);

  const numAmount = parseFloat(amountStr) || 0;
  const tafqeetText = numAmount > 0 ? numberToArabicText(numAmount) : "";

  const createMutation = trpc.custody.create.useMutation({
    onSuccess: (data) => {
      toast.success(data.message);
      utils.custody.getAll.invalidate();
      utils.custody.getStats.invalidate();
      setLocation(`/custody-requests/${data.id}`);
    },
    onError: (err) => {
      toast.error(err.message || "حدث خطأ أثناء رفع طلب العهدة المالية");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      toast.error("يرجى إدخال عنوان العهدة المالية");
      return;
    }

    if (numAmount <= 0) {
      toast.error("يرجى إدخال مبلغ صحيح للعهدة المالية");
      return;
    }

    if (!description.trim() || description.trim().length < 5) {
      toast.error("يرجى كتابة بيان تفصيلي لأوجه استخدام العهدة وأسباب الاحتياج");
      return;
    }

    if (!bankName.trim()) {
      toast.error("اسم البنك مطلوب");
      return;
    }

    if (!bankAccountName.trim()) {
      toast.error("اسم صاحب الحساب البنكي مطلوب");
      return;
    }

    if (!bankIban.trim() || bankIban.trim().length < 10) {
      toast.error("رقم الآيبان البنكي غير مكتمل أو غير صالح");
      return;
    }

    createMutation.mutate({
      title: title.trim(),
      amount: numAmount,
      description: description.trim(),
      isCustomBank,
      bankName: bankName.trim(),
      bankAccountName: bankAccountName.trim(),
      bankIban: bankIban.trim().toUpperCase(),
    });
  };

  const hasDefaultBankInfo = !!((user as any)?.bankName && (user as any)?.bankIban);

  return (
    <DashboardLayout>
      <div className="space-y-6 pb-16 max-w-4xl mx-auto" dir="rtl">
        {/* Top Header */}
        <div className="flex items-center justify-between gap-4 border-b border-border/40 pb-4">
          <div className="flex items-center gap-3">
            <Link href="/custody-requests">
              <Button variant="ghost" size="icon" className="rounded-xl hover:bg-muted/80 cursor-pointer">
                <ArrowRight className="w-5 h-5 text-foreground" />
              </Button>
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <span className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold">
                  <Wallet className="w-4 h-4" />
                </span>
                <h1 className="text-xl sm:text-2xl font-black text-foreground">
                  طلب صرف عهدة مالية
                </h1>
              </div>
              <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                تعبئة بيانات العهدة المالية وتفاصيل الحساب البنكي لتحويلها للاعتماد
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* تفاصيل العهدة المالية والمبلغ */}
          <Card className="rounded-2xl border-border/70 shadow-xs bg-card">
            <CardHeader className="p-4 sm:p-5 pb-3 border-b border-border/40">
              <div className="flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-primary" />
                <CardTitle className="text-sm font-bold text-foreground">تفاصيل ومبلغ العهدة</CardTitle>
              </div>
              <CardDescription className="text-xs text-muted-foreground">
                حدد الغرض من العهدة والمبلغ المطلوب بدقة
              </CardDescription>
            </CardHeader>

            <CardContent className="p-4 sm:p-5 space-y-4">
              {/* عنوان العهدة والمبلغ في سطر واحد */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* عنوان العهدة */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-foreground">
                    عنوان العهدة المالية <span className="text-rose-500">*</span>
                  </Label>
                  <Input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="عهدة مالية لمصاريف ....."
                    className="h-11 rounded-xl border-border/70 text-xs sm:text-sm bg-background"
                    required
                  />
                </div>

                {/* المبلغ المطلوب */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-foreground">
                    المبلغ المطلوب (ريال سعودي) <span className="text-rose-500">*</span>
                  </Label>
                  <div className="relative">
                    <Input
                      type="number"
                      step="0.01"
                      min="1"
                      value={amountStr}
                      onChange={(e) => setAmountStr(e.target.value)}
                      placeholder="0.00"
                      dir="rtl"
                      className="h-11 rounded-xl border-border/70 text-base font-bold font-mono pl-14 pr-3.5 text-right bg-background focus:ring-primary/20"
                      required
                    />
                    <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground pointer-events-none select-none">
                      ر.س
                    </div>
                  </div>
                </div>

                {/* تفقيط المبلغ التلقائي */}
                {tafqeetText && (
                  <div className="col-span-1 md:col-span-2 p-2.5 bg-primary/5 rounded-xl border border-primary/20 text-xs text-primary font-bold flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-primary shrink-0" />
                    <span>فقط {tafqeetText} لا غير.</span>
                  </div>
                )}
              </div>

              {/* البيان التفصيلي */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-foreground">
                  البيان التفصيلي وأسباب الاحتياج للعهدة <span className="text-rose-500">*</span>
                </Label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="اكتب بياناً شاملاً ومفصلاً يوضح أسباب طلب العهدة وأي تفاصيل داعمة للطلب..."
                  className="min-h-[120px] rounded-xl border-border/70 text-xs sm:text-sm bg-background leading-relaxed"
                  required
                />
              </div>
            </CardContent>
          </Card>

          {/* الحساب البنكي المعتمد للصرف */}
          <Card className="rounded-2xl border-border/70 shadow-xs bg-card">
            <CardHeader className="p-4 sm:p-5 pb-3 border-b border-border/40">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Landmark className="w-4 h-4 text-primary" />
                  <CardTitle className="text-sm font-bold text-foreground">بيانات الحساب البنكي لصرف العهدة</CardTitle>
                </div>
                {!isCustomBank && hasDefaultBankInfo && (
                  <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/40 text-[11px] font-semibold w-fit">
                    مستورد تلقائياً من ملفك الشخصي
                  </Badge>
                )}
              </div>
              <CardDescription className="text-xs text-muted-foreground">
                الحساب المصرفي الذي سيتم تحويل مبلغ العهدة إليه عند تنفيذ أمر الصرف
              </CardDescription>
            </CardHeader>

            <CardContent className="p-4 sm:p-5 space-y-4">
              {/* تنبيه إذا لم يكن لدى الموظف حساب بنكي محفوظ في الملف */}
              {!hasDefaultBankInfo && !isCustomBank && (
                <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl text-xs text-amber-800 dark:text-amber-300 flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold">لم تقم بتسجيل بيانات بنكية في ملفك الشخصي بعد</p>
                    <p className="text-[11px] text-amber-700/80 dark:text-amber-400 mt-0.5">
                      يمكنك إدخال بيانات الحساب أدناه، أو حفظها بشكل دائم في <Link href="/profile" className="underline font-bold">الملف الشخصي</Link> لتظهر تلقائياً بكل طلب قادم.
                    </p>
                  </div>
                </div>
              )}

              {/* خيار صرف العهدة على حساب بنكي آخر */}
              <div className="flex items-center gap-2.5 p-3 rounded-xl bg-muted/40 border border-border/50">
                <Checkbox
                  id="customBankCheckbox"
                  checked={isCustomBank}
                  onCheckedChange={(checked) => {
                    const isChecked = !!checked;
                    setIsCustomBank(isChecked);
                    if (!isChecked && user) {
                      // إعادة التعيين لبيانات الملف الشخصي
                      setBankName((user as any).bankName || "");
                      setBankAccountName((user as any).bankAccountName || user.name || "");
                      setBankIban((user as any).bankIban || "");
                    } else if (isChecked) {
                      setBankName("");
                      setBankAccountName("");
                      setBankIban("");
                    }
                  }}
                  className="rounded-md"
                />
                <Label htmlFor="customBankCheckbox" className="text-xs sm:text-sm font-bold text-foreground cursor-pointer select-none">
                  في حال رغبتكم صرف العهدة على حساب بنكي آخر
                </Label>
              </div>

              {/* حقول الحساب البنكي */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
                {/* اسم البنك */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-primary" />
                    اسم البنك / المصرف <span className="text-rose-500">*</span>
                  </Label>
                  <Input
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    placeholder="مثال: مصرف الراجحي"
                    className="h-10 rounded-xl border-border/70 text-xs sm:text-sm bg-background"
                    required
                  />
                </div>

                {/* اسم صاحب الحساب */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-primary" />
                    اسم صاحب الحساب المعتمد <span className="text-rose-500">*</span>
                  </Label>
                  <Input
                    value={bankAccountName}
                    onChange={(e) => setBankAccountName(e.target.value)}
                    placeholder="الاسم الرباعي كما في البنك"
                    className="h-10 rounded-xl border-border/70 text-xs sm:text-sm bg-background"
                    required
                  />
                </div>

                {/* رقم الآيبان */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded text-foreground font-bold">IBAN</span>
                    رقم الآيبان (IBAN) <span className="text-rose-500">*</span>
                  </Label>
                  <Input
                    value={bankIban}
                    onChange={(e) => setBankIban(e.target.value.toUpperCase())}
                    placeholder="SA0000000000000000000000"
                    dir="ltr"
                    maxLength={34}
                    className="h-10 rounded-xl border-border/70 text-xs sm:text-sm font-mono tracking-wider text-left bg-background"
                    required
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* أزرار الإجراءات */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
            <Link href="/custody-requests">
              <Button type="button" variant="outline" className="w-full sm:w-auto h-11 px-5 rounded-xl text-xs font-bold border-border/70">
                إلغاء والعودة
              </Button>
            </Link>

            <Button
              type="submit"
              disabled={createMutation.isPending}
              className="w-full sm:w-auto gradient-primary text-white font-bold h-11 px-8 rounded-xl text-xs sm:text-sm shadow-md gap-2 cursor-pointer"
            >
              {createMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>جاري رفع الطلب...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>إرسال طلب العهدة للمدير التنفيذي</span>
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
}
