import { useState, useEffect, useMemo } from "react";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  AlertTriangle,
  ShieldAlert,
  Clock,
  ExternalLink,
  HelpCircle,
  Loader2,
  Send,
  Sparkles,
  Plus,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

export default function NewCustodyRequest() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const utils = trpc.useUtils();

  // فحص وجود عهدة قائمة والاستثناء
  const { data: custodyCheck, isLoading: isCheckingCustody } = trpc.custody.checkActiveCustody.useQuery();
  const [isExceptionDialogOpen, setIsExceptionDialogOpen] = useState(false);
  const [exceptionReason, setExceptionReason] = useState("");

  const requestExceptionMutation = trpc.custody.requestException.useMutation({
    onSuccess: (res) => {
      toast.success(res.message);
      setIsExceptionDialogOpen(false);
      setExceptionReason("");
      utils.custody.checkActiveCustody.invalidate();
    },
    onError: (err) => {
      toast.error(err.message || "حدث خطأ أثناء رفع طلب الاستثناء");
    },
  });

  const isExecutiveDirector =
    user?.role === "executive_director" ||
    user?.role === "general_manager" ||
    user?.role === "super_admin" ||
    user?.role === "system_admin" ||
    (user as any)?.customRole?.nameAr === "المدير التنفيذي" ||
    (user as any)?.customRole?.nameAr === "الرئيس التنفيذي" ||
    user?.name === "المدير التنفيذي" ||
    user?.email === "ceo@manarah.org.sa";

  const hasActiveCustody = isExecutiveDirector ? false : !!custodyCheck?.hasActiveCustody;
  const activeCustody = isExecutiveDirector ? null : custodyCheck?.activeCustody;
  const hasApprovedException = isExecutiveDirector ? false : !!custodyCheck?.hasApprovedException;
  const hasPendingException = isExecutiveDirector ? false : !!custodyCheck?.hasPendingException;
  const latestException = isExecutiveDirector ? null : custodyCheck?.latestException;
  const hasExistingException = isExecutiveDirector ? false : !!custodyCheck?.hasExistingException;
  const canSubmit = isExecutiveDirector || !hasActiveCustody || hasApprovedException;

  // نموذج الطلب
  const [title, setTitle] = useState("");
  const [items, setItems] = useState<Array<{ id: string; description: string; details: string; amount: string }>>([
    { id: "1", description: "", details: "", amount: "" },
  ]);

  // إضافة وحذف وتعديل البنود
  const handleAddItem = () => {
    setItems((prev) => [
      ...prev,
      { id: Date.now().toString() + Math.random().toString(36).slice(2, 6), description: "", details: "", amount: "" },
    ]);
  };

  const handleRemoveItem = (id: string) => {
    if (items.length <= 1) {
      toast.error("يجب إبقاء بند واحد على الأقل في تفاصيل العهدة");
      return;
    }
    setItems((prev) => prev.filter((it) => it.id !== id));
  };

  const handleItemChange = (id: string, field: "description" | "details" | "amount", value: string) => {
    setItems((prev) =>
      prev.map((it) => (it.id === id ? { ...it, [field]: value } : it))
    );
  };

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

  // حساب إجمالي البنود والتفقيط آلياً
  const totalAmount = useMemo(() => {
    return items.reduce((sum, it) => {
      const val = parseFloat(it.amount);
      return sum + (isNaN(val) ? 0 : val);
    }, 0);
  }, [items]);

  const tafqeetText = totalAmount > 0 ? numberToArabicText(totalAmount) : "";

  const createMutation = trpc.custody.create.useMutation({
    onSuccess: (data) => {
      toast.success(data.message);
      utils.custody.getAll.invalidate();
      utils.custody.getStats.invalidate();
      utils.custody.getPendingActionCounts.invalidate();
      setLocation("/custody-requests");
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

    if (items.length === 0) {
      toast.error("يرجى إضافة بند واحد على الأقل في البيان التفصيلي");
      return;
    }

    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      if (!it.description.trim()) {
        toast.error(`يرجى كتابة بيان البند رقم ${i + 1}`);
        return;
      }
      const val = parseFloat(it.amount);
      if (isNaN(val) || val <= 0) {
        toast.error(`يرجى إدخال مبلغ صحيح للبند رقم ${i + 1}`);
        return;
      }
    }

    if (totalAmount <= 0) {
      toast.error("المبلغ الإجمالي للعهدة يجب أن يكون أكبر من الصفر");
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

    const cleanItems = items.map((it) => ({
      description: it.description.trim(),
      details: it.details ? it.details.trim() : "",
      amount: parseFloat(it.amount) || 0,
    }));

    if (hasActiveCustody && !hasApprovedException) {
      const reasonMsg = activeCustody?.status === "pending_executive"
        ? "لأن طلب العهدة السابقة ما زال بانتظار اعتماد المدير التنفيذي"
        : "لأن أمر الصرف المرتبط بالعهدة السابقة ما زال قيد الاعتماد";
      toast.error(
        `لا يمكن تقديم طلب عهدة جديد (${reasonMsg}) برقم (${activeCustody?.requestNumber || ""}). يمكنكم تقديم طلب استثناء للمدير التنفيذي.`
      );
      return;
    }

    createMutation.mutate({
      title: title.trim(),
      amount: totalAmount,
      description: JSON.stringify(cleanItems),
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

        {/* تنبيه وجود عهدة سابقة قائمة أو استثناء معتمد */}
        {hasActiveCustody && !hasApprovedException && (
          <div className="rounded-2xl border border-amber-300 dark:border-amber-800/60 bg-amber-50/70 dark:bg-amber-950/20 p-4 sm:p-4.5 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-start sm:items-center gap-3 flex-1 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-700 dark:text-amber-400 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="space-y-0.5 text-right flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-xs sm:text-sm font-black text-amber-900 dark:text-amber-200">
                    تنبيه: توجد عهدة مالية سابقة قائمة ({activeCustody?.requestNumber})
                  </h3>
                  <Badge variant="outline" className="text-[10px] font-bold border-amber-400/50 bg-amber-500/10 text-amber-800 dark:text-amber-300">
                    {activeCustody?.status === "pending_executive" ? "بانتظار اعتماد المدير التنفيذي" : "أمر الصرف قيد الاعتماد"}
                  </Badge>
                </div>
                <p className="text-[11px] sm:text-xs text-amber-800/90 dark:text-amber-300/90 leading-relaxed">
                  قيمة العهدة السابقة <span className="font-bold text-amber-950 dark:text-amber-100">{Number(activeCustody?.amount || 0).toLocaleString()} ر.س</span> {activeCustody?.status === "pending_executive" ? "(ما زالت بانتظار اعتماد المدير التنفيذي)" : "(أمر الصرف المرتبط بها قيد الاعتماد)"}. تنص اللائحة على عدم إمكانية تقديم طلب عهدة جديدة في هذه الحالة إلا برفع طلب استثناء لاعتماده من المدير التنفيذي (من قسم الإجراءات بالأسفل).
                </p>
              </div>
            </div>

            {activeCustody?.id && (
              <Link
                href={`/custody-requests/${activeCustody.id}/print`}
                target="_blank"
                className="text-xs font-bold text-amber-800 hover:text-amber-950 dark:text-amber-300 dark:hover:text-amber-100 underline flex items-center gap-1 shrink-0 mr-auto sm:mr-0"
              >
                <span>معاينة العهدة</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </Link>
            )}
          </div>
        )}


        {/* نافذة طلب الاستثناء */}
        <Dialog open={isExceptionDialogOpen} onOpenChange={setIsExceptionDialogOpen}>
          <DialogContent className="sm:max-w-xl md:max-w-2xl rounded-2xl p-6 text-right" dir="rtl">
            <DialogHeader className="text-right sm:text-right items-start space-y-1.5 pb-3 border-b border-border/40">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-500/15 text-amber-600 flex items-center justify-center font-bold shrink-0">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <DialogTitle className="text-base sm:text-lg font-bold text-foreground text-right">
                  طلب استثناء لصرف عهدة مالية جديدة
                </DialogTitle>
              </div>
              <DialogDescription className="text-xs sm:text-sm text-muted-foreground pt-1 text-right leading-relaxed">
                سيتم رفع هذا الطلب مباشرة للمدير التنفيذي للموافقة على التقديم استثناءً لوجود عهدة مالية سابقة قائمة.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2 text-right">
              {activeCustody && (
                <div className="p-4 rounded-xl bg-muted/50 border border-border/70 text-xs sm:text-sm space-y-2.5 text-right">
                  <div className="flex items-center justify-between text-muted-foreground">
                    <span className="font-semibold text-foreground">رقم العهدة السابقة:</span>
                    <span className="font-mono font-bold text-foreground">{activeCustody.requestNumber}</span>
                  </div>
                  <div className="flex items-center justify-between text-muted-foreground">
                    <span className="font-semibold text-foreground">مبلغ العهدة السابقة:</span>
                    <span className="font-bold text-foreground">{Number(activeCustody.amount).toLocaleString()} ر.س</span>
                  </div>
                  {activeCustody.title && (
                    <div className="flex items-center justify-between text-muted-foreground">
                      <span className="font-semibold text-foreground">عنوان العهدة:</span>
                      <span className="font-medium text-foreground truncate max-w-[280px]">{activeCustody.title}</span>
                    </div>
                  )}
                </div>
              )}

              <div className="space-y-2 text-right">
                <Label className="text-xs sm:text-sm font-bold text-foreground block text-right">
                  مبررات وأسباب طلب الاستثناء <span className="text-rose-500">*</span>
                </Label>
                <Textarea
                  value={exceptionReason}
                  onChange={(e) => setExceptionReason(e.target.value)}
                  placeholder="اكتب هنا مبررات الحاجة لصرف العهدة الجديدة وأسباب طلب الاستثناء..."
                  rows={4}
                  className="rounded-xl text-xs sm:text-sm bg-background resize-none border-border/70 p-3 leading-relaxed text-right"
                  dir="rtl"
                />
              </div>
            </div>

            <DialogFooter className="flex flex-row sm:flex-row justify-start items-center gap-2 pt-3 border-t border-border/40">
              <Button
                type="button"
                disabled={!exceptionReason.trim() || requestExceptionMutation.isPending || !activeCustody?.id}
                onClick={() => {
                  if (!activeCustody?.id) return;
                  requestExceptionMutation.mutate({
                    activeCustodyId: activeCustody.id,
                    reason: exceptionReason.trim(),
                  });
                }}
                className="rounded-xl text-xs sm:text-sm font-bold gradient-primary text-white gap-2 cursor-pointer h-10 px-5 shadow-xs"
              >
                {requestExceptionMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>جاري الرفع...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>إرسال طلب الاستثناء للمدير التنفيذي</span>
                  </>
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsExceptionDialogOpen(false)}
                className="rounded-xl text-xs sm:text-sm h-10 px-4 border-border/70"
              >
                إلغاء
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

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
              {/* عنوان العهدة */}
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-foreground">
                  عنوان العهدة المالية <span className="text-rose-500">*</span>
                </Label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="مثال: عهدة مالية لمصاريف صيانة وإصلاحات المسجد..."
                  className="h-11 rounded-xl border-border/70 text-xs sm:text-sm bg-background"
                  required
                />
              </div>

              {/* البيان التفصيلي وأسباب الاحتياج للعهدة */}
              <div className="space-y-2.5 pt-1">
                <div className="flex items-center justify-between gap-2">
                  <div className="space-y-0.5">
                    <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                      <span>البيان التفصيلي وأسباب الاحتياج للعهدة</span>
                      <span className="text-rose-500">*</span>
                      <Badge variant="outline" className="text-[10px] font-normal py-0 h-5 border-border/70 text-muted-foreground mr-1">
                        {items.length} {items.length === 1 ? "بند" : "بنود"}
                      </Badge>
                    </Label>
                    <p className="text-[11px] text-muted-foreground">
                      أضف البنود المطلوب صرفها مع بيان كل بند ومبلغه بالتفصيل
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAddItem}
                    className="h-8 rounded-xl text-xs font-bold gap-1 text-primary border-primary/30 hover:bg-primary/5 hover:border-primary/50 cursor-pointer shadow-2xs"
                  >
                    <Plus className="w-3.5 h-3.5 ml-0.5" />
                    <span>إضافة بند</span>
                  </Button>
                </div>

                {/* جدول بنود العهدة */}
                <div className="rounded-xl border border-border/70 overflow-hidden bg-background">
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-right border-collapse">
                      <thead>
                        <tr className="bg-muted/50 border-b border-border/60 text-muted-foreground font-semibold">
                          <th className="py-2.5 px-3 w-12 text-center font-bold">#</th>
                          <th className="py-2.5 px-3 min-w-[260px]">
                            اسم الصنف والمواصفات <span className="text-rose-500">*</span>
                          </th>
                          <th className="py-2.5 px-3 w-36 sm:w-44 text-right">
                            المبلغ المطلوب (ر.س) <span className="text-rose-500">*</span>
                          </th>
                          <th className="py-2.5 px-2 w-12 text-center">حذف</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/40">
                        {items.map((item, index) => (
                          <tr key={item.id} className="hover:bg-muted/20 transition-colors">
                            <td className="py-2.5 px-3 text-center font-mono font-bold text-muted-foreground align-top pt-3.5">
                              {index + 1}
                            </td>
                            <td className="p-2.5 align-top">
                              <div className="space-y-1.5">
                                <Input
                                  value={item.description}
                                  onChange={(e) => handleItemChange(item.id, "description", e.target.value)}
                                  placeholder="عنوان البند..."
                                  className="h-8.5 rounded-lg border-border/70 text-xs sm:text-sm bg-background font-medium"
                                  required
                                />
                                <Textarea
                                  value={item.details || ""}
                                  onChange={(e) => handleItemChange(item.id, "details", e.target.value)}
                                  placeholder="وصف البند..."
                                  rows={1}
                                  className="text-xs min-h-[36px] max-h-[90px] resize-y bg-muted/20 focus:bg-background border-input/80 py-1.5 px-2.5 leading-relaxed rounded-md transition-colors"
                                />
                              </div>
                            </td>
                            <td className="p-2.5 align-top pt-2.5">
                              <div className="relative">
                                <Input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  value={item.amount}
                                  onChange={(e) => handleItemChange(item.id, "amount", e.target.value)}
                                  placeholder="0.00"
                                  dir="ltr"
                                  className="h-8.5 rounded-lg border-border/70 text-xs sm:text-sm font-bold font-mono pl-10 pr-2.5 text-right bg-background focus:ring-primary/20"
                                  required
                                />
                                <div className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[11px] font-bold text-muted-foreground pointer-events-none select-none">
                                  ر.س
                                </div>
                              </div>
                            </td>
                            <td className="py-2.5 px-2 text-center align-top pt-2.5">
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => handleRemoveItem(item.id)}
                                disabled={items.length <= 1}
                                className="h-8 w-8 rounded-lg text-muted-foreground hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                                title={items.length <= 1 ? "لا يمكن حذف البند الوحيد" : "حذف هذا البند"}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* زر إضافة بند في أسفل الجدول */}
                  <div className="p-2 bg-muted/20 border-t border-border/40 flex justify-start">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleAddItem}
                      className="h-8 rounded-lg text-xs font-semibold gap-1.5 text-primary hover:bg-primary/10 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>إضافة بند آخر</span>
                    </Button>
                  </div>
                </div>
              </div>

              {/* المبلغ الإجمالي المطلوب صرفه - مبسط وغير بارز بشكل مبالغ فيه */}
              <div className="rounded-xl border border-border/70 bg-muted/20 p-3.5 space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-foreground">إجمالي المبلغ المطلوب:</span>
                    <div className="inline-flex items-center gap-1 font-mono text-base sm:text-lg font-bold text-foreground">
                      <span>
                        {totalAmount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                      <SaudiRiyal className="w-4 h-4 inline text-muted-foreground" />
                    </div>
                  </div>

                  <span className="text-[11px] text-muted-foreground">محسوب تلقائياً</span>
                </div>

                {/* المبلغ كتابة */}
                <div className="text-xs text-muted-foreground pt-1.5 border-t border-border/40 flex items-start gap-1.5">
                  <span className="font-semibold text-foreground shrink-0">المبلغ كتابة:</span>
                  {tafqeetText ? (
                    <span className="font-medium text-foreground">
                      فقط {tafqeetText} لا غير.
                    </span>
                  ) : (
                    <span className="text-muted-foreground/80 italic text-[11px]">
                      سيظهر المبلغ كتابةً تلقائياً عند إدخال مبالغ البنود
                    </span>
                  )}
                </div>
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

          {/* قسم الإجراءات */}
          <div className="space-y-3 pt-3 border-t border-border/60">
            {/* بطاقة إجراء الاستثناء في حال وجود عهدة سابقة قائمة */}
            {hasActiveCustody && !hasApprovedException && (
              <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-300 dark:border-amber-700/60 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2 text-amber-900 dark:text-amber-200">
                  <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>
                    {hasPendingException
                      ? "طلب الاستثناء مرفوع وقيد المراجعة لدى المدير التنفيذي حالياً. لا يمكن تقديم أكثر من استثناء."
                      : hasExistingException
                      ? "تم تقديم طلب استثناء مسبقاً لهذه العهدة، ولا يمكن تقديم أكثر من طلب استثناء."
                      : "لا يمكن إرسال الطلب لوجود عهدة مالية سابقة قائمة. يمكنك تقديم طلب استثناء للمدير التنفيذي."}
                  </span>
                </div>
                {hasPendingException ? (
                  <Badge variant="outline" className="bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-200 border-amber-300 gap-1 font-bold shrink-0">
                    <Clock className="w-3 h-3 animate-pulse" />
                    قيد المراجعة
                  </Badge>
                ) : hasExistingException ? (
                  <Badge variant="outline" className="bg-rose-100 dark:bg-rose-900/40 text-rose-800 dark:text-rose-200 border-rose-300 gap-1 font-bold shrink-0">
                    تم استخدام فرصة الاستثناء
                  </Badge>
                ) : (
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => setIsExceptionDialogOpen(true)}
                    className="bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold gap-1.5 h-8 shrink-0 cursor-pointer shadow-xs"
                  >
                    <ShieldAlert className="w-3.5 h-3.5" />
                    <span>طلب استثناء من المدير التنفيذي</span>
                  </Button>
                )}
              </div>
            )}

            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              <Link href="/custody-requests">
                <Button type="button" variant="outline" className="w-full sm:w-auto h-11 px-5 rounded-xl text-xs font-bold border-border/70">
                  إلغاء والعودة
                </Button>
              </Link>

              <Button
                type="submit"
                disabled={createMutation.isPending || !canSubmit}
                className={`w-full sm:w-auto font-bold h-11 px-8 rounded-xl text-xs sm:text-sm shadow-md gap-2 ${
                  !canSubmit
                    ? "bg-muted text-muted-foreground cursor-not-allowed border border-border/80 opacity-60"
                    : "gradient-primary text-white cursor-pointer"
                }`}
              >
                {createMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>جاري رفع الطلب...</span>
                  </>
                ) : hasApprovedException ? (
                  <>
                    <Send className="w-4 h-4" />
                    <span>إرسال طلب العهدة (باستثناء معتمد)</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>إرسال طلب العهدة للمدير التنفيذي</span>
                  </>
                )}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
}
