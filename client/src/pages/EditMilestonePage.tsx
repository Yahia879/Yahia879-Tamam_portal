import { useState, useEffect } from "react";
import { useLocation, useParams } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { numberToArabicText as baseNumberToArabicText } from "@shared/tafqeet";
import DashboardLayout from "@/components/DashboardLayout";
import { SaudiRiyal } from "@/components/SaudiRiyal";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  ArrowRight,
  Send,
  FileSpreadsheet,
  FileText,
  Loader2,
  Lock,
} from "lucide-react";
import { toast } from "sonner";

function numberToArabicText(num: number): string {
  return baseNumberToArabicText(num, { prefix: "", suffix: " فقط لا غير", currency: "ريال سعودي" });
}

export default function EditMilestonePage() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const params = useParams<{ id: string }>();
  const paymentId = params.id ? String(params.id) : "";
  const utils = trpc.useUtils();

  const [formData, setFormData] = useState<{
    projectId: number;
    contractId: number;
    title: string;
    description: string;
    completionPercentage: number | "";
    amount: number | "";
    dateMiladi: string;
  }>({
    projectId: 0,
    contractId: 0,
    title: "",
    description: "",
    completionPercentage: "",
    amount: "",
    dateMiladi: "",
  });

  // جلب تفاصيل المستخلص / الدفعة
  const { data: payment, isLoading: isPaymentLoading } = trpc.projects.getUnifiedPayment.useQuery(
    { id: paymentId },
    { 
      enabled: !!paymentId,
      refetchOnWindowFocus: false,
    }
  );

  const isPaid = Boolean(payment?.isPaid || payment?.status === "paid" || Number(payment?.paidAmount || 0) > 0);

  // جلب تفاصيل المشروع
  const { data: projectDetails } = trpc.projects.getById.useQuery(
    { id: formData.projectId },
    { enabled: formData.projectId > 0 }
  );

  const isRequestClosed = Boolean(
    (projectDetails as any)?.isRequestClosed ||
    projectDetails?.request?.currentStage === "closed" ||
    (projectDetails as any)?.request?.status === "completed" ||
    (projectDetails as any)?.request?.closureStatus === "confirmed"
  );

  // تعبئة البيانات الأساسية
  useEffect(() => {
    if (payment) {
      const origComp = (payment.completionPercentage !== null && payment.completionPercentage !== undefined) 
        ? Number(payment.completionPercentage) 
        : "";
      const pAny = payment as any;
      const rawAmt = parseFloat(String(pAny.amount || pAny.agreedAmount || 0).replace(/,/g, ""));
      const origDate = pAny.dateMiladi || pAny.date || (pAny.paidAt ? String(pAny.paidAt).split('T')[0] : "");

      setFormData({
        projectId: pAny.projectId || 0,
        contractId: pAny.contractId || 0,
        title: pAny.title || pAny.description || "",
        description: pAny.description || pAny.workDescription || "",
        completionPercentage: origComp !== "" ? origComp : "",
        amount: !isNaN(rawAmt) && rawAmt > 0 ? rawAmt : "",
        dateMiladi: origDate ? (String(origDate).includes('T') ? String(origDate).split('T')[0] : String(origDate).split(' ')[0]) : "",
      });
    }
  }, [payment]);

  // إدارة أصناف سدانة
  const isSedanaProgram = projectDetails?.programType === "sedana" || projectDetails?.request?.programType === "sedana";
  const [sedanaItems, setSedanaItems] = useState<any[]>([]);

  useEffect(() => {
    if (payment && Array.isArray((payment as any).items)) {
      setSedanaItems((payment as any).items);
    }
  }, [payment]);

  // طفرة تحديث المستخلص
  const updateMutation = trpc.projects.updateUnifiedPayment.useMutation({
    onSuccess: () => {
      toast.success("تم تحديث المستخلص بنجاح");
      utils.projects.invalidate();
      utils.disbursements.invalidate();
      if (formData.projectId) {
        navigate(`/projects/${formData.projectId}`);
      } else {
        window.history.back();
      }
    },
    onError: (error) => {
      toast.error(error.message || "حدث خطأ أثناء تحديث المستخلص");
    },
  });

  const handleSubmit = () => {
    if (isPaid) {
      toast.error("لا يمكن تعديل مستخلص مسدد نهائياً");
      return;
    }
    if (isRequestClosed) {
      toast.error("لا يمكن تعديل المستخلص لأن الطلب المرتبط بالمشروع مغلق نهائياً");
      return;
    }
    if (!formData.title.trim()) {
      toast.error("يرجى إدخال عنوان المستخلص");
      return;
    }
    if (!formData.dateMiladi) {
      toast.error("يرجى تحديد التاريخ الميلادي");
      return;
    }
    if (formData.completionPercentage === "" || isNaN(Number(formData.completionPercentage)) || Number(formData.completionPercentage) < 0 || Number(formData.completionPercentage) > 100) {
      toast.error("يرجى إدخال نسبة إنجاز صحيحة (من 0 إلى 100)");
      return;
    }
    if (!formData.description.trim()) {
      toast.error("يرجى إدخال وصف أعمال المستخلص");
      return;
    }

    updateMutation.mutate({
      id: paymentId,
      title: formData.title,
      description: formData.description,
      amount: Number(formData.amount) || 0,
      dateMiladi: formData.dateMiladi,
      completionPercentage: Number(formData.completionPercentage),
      items: isSedanaProgram && sedanaItems.length > 0 ? sedanaItems : undefined,
    });
  };

  const numAmount = formData.amount !== "" ? Number(formData.amount) : 0;

  if (isPaymentLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-full min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-6 pb-20" dir="rtl">
        {/* ترويسة الصفحة */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-border/40 pb-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => window.history.back()} className="h-9 w-9">
              <ArrowRight className="h-5 w-5" />
            </Button>
            <div>
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
                <h1 className="text-xl sm:text-2xl font-bold text-foreground">تعديل المستخلص</h1>
              </div>
              <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                تعديل بيانات طلب الصرف والمستخلص المالي المحدد
              </p>
            </div>
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            <Button 
              onClick={handleSubmit} 
              disabled={updateMutation.isPending || isPaid || isRequestClosed} 
              className="w-full sm:w-auto shadow-sm gradient-primary text-white font-bold"
            >
              {updateMutation.isPending ? <Loader2 className="h-4 w-4 ml-2 animate-spin" /> : <Send className="h-4 w-4 ml-2" />}
              حفظ تعديلات المستخلص
            </Button>
          </div>
        </div>

        {isPaid && (
          <Alert className="bg-amber-500/10 border-amber-500/30 text-amber-800 dark:text-amber-300">
            <Lock className="h-4 w-4 text-amber-600" />
            <AlertTitle className="font-bold">تنبيه: هذا المستخلص مسدد ومقفل</AlertTitle>
            <AlertDescription>
              تم سداد هذا المستخلص (أو تم تنفيذ أوامر صرف عليه). لا يمكن تعديل بياناته أو مبالغه حفاظاً على السلامة المالية والمحاسبية.
            </AlertDescription>
          </Alert>
        )}

        {isRequestClosed && (
          <Alert className="bg-amber-500/10 border-amber-500/30 text-amber-800 dark:text-amber-300">
            <Lock className="h-4 w-4 text-amber-600" />
            <AlertTitle className="font-bold">تنبيه: الطلب المرتبط بالمشروع مغلق</AlertTitle>
            <AlertDescription>
              تم إغلاق الطلب المرتبط بهذا المشروع نهائياً، وتم إيقاف أي تعديلات على المستخلصات.
            </AlertDescription>
          </Alert>
        )}

        {/* نموذج بيانات المستخلص */}
        <Card className="border-border/60 shadow-xs">
          <CardHeader className="py-4 border-b border-border/40 bg-muted/20">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              بيانات المستخلص
            </CardTitle>
            <CardDescription className="text-xs">
              تعديل بيانات المستخلص ونسبة الإنجاز
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6 space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* التاريخ الميلادي */}
              <div className="space-y-2">
                <Label className="font-semibold text-xs text-foreground">التاريخ الميلادي *</Label>
                <Input
                  type="date"
                  value={formData.dateMiladi}
                  onChange={(e) => setFormData({ ...formData, dateMiladi: e.target.value })}
                  disabled={isPaid || isRequestClosed}
                  className="rounded-xl h-10 bg-background"
                  required
                />
              </div>

              {/* عنوان المستخلص */}
              <div className="space-y-2">
                <Label className="font-semibold text-xs text-foreground">عنوان المستخلص *</Label>
                <Input
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="عنوان المستخلص..."
                  disabled={isPaid || isRequestClosed}
                  className="rounded-xl h-10 bg-background"
                  required
                />
              </div>

              {/* نسبة الإنجاز */}
              <div className="space-y-2">
                <Label className="font-semibold text-xs text-foreground">نسبة الإنجاز (%) *</Label>
                <div className="relative">
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    value={formData.completionPercentage}
                    onChange={(e) => {
                      const val = e.target.value === "" ? "" : Number(e.target.value);
                      setFormData({ ...formData, completionPercentage: val });
                    }}
                    placeholder="مثال: 50"
                    disabled={isPaid || isRequestClosed}
                    className="rounded-xl h-10 pl-8 bg-background font-mono font-bold text-emerald-700 text-sm"
                    required
                  />
                  <span className="absolute left-3 top-2.5 text-xs text-muted-foreground font-bold">%</span>
                </div>
              </div>
            </div>

            {/* وصف أعمال المستخلص */}
            <div className="space-y-2">
              <Label className="font-semibold text-xs text-foreground">وصف أعمال ومراحل المستخلص *</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="اكتب وصفاً مفصلاً للأعمال المنجزة خلال هذا المستخلص..."
                rows={4}
                disabled={isPaid || isRequestClosed}
                className="rounded-xl bg-background resize-none"
                required
              />
            </div>
          </CardContent>
        </Card>

        {/* أزرار الحفظ بالأسفل */}
        <div className="flex justify-end gap-3 pt-2">
          <Button variant="outline" onClick={() => window.history.back()} className="rounded-xl">
            إلغاء
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={updateMutation.isPending || isPaid || isRequestClosed} 
            className="rounded-xl gradient-primary text-white font-bold px-6"
          >
            {updateMutation.isPending ? <Loader2 className="h-4 w-4 ml-2 animate-spin" /> : <Send className="h-4 w-4 ml-2" />}
            حفظ تعديلات المستخلص
          </Button>
        </div>
      </div>
    </DashboardLayout>
  );
}
