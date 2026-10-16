import { useState, useEffect, useMemo } from "react";
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
import { Badge } from "@/components/ui/badge";
import { ProjectSearchSelect } from "@/components/ProjectSearchSelect";
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
  FileSpreadsheet,
  FileText,
  AlertCircle,
  Package,
  Plus,
  Trash2,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";

function numberToArabicText(num: number): string {
  return baseNumberToArabicText(num, { prefix: "", suffix: " فقط لا غير", currency: "ريال سعودي" });
}

export default function NewMilestoneRequest() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const params = useParams<{ projectId?: string }>();
  const utils = trpc.useUtils();

  // إعادة التوجيه لصفحة إنشاء المستخلص الموحدة
  useEffect(() => {
    if (params.projectId) {
      navigate(`/progress-invoices?projectId=${params.projectId}`, { replace: true });
    } else {
      navigate(`/progress-invoices`, { replace: true });
    }
  }, [params.projectId, navigate]);

  const [formData, setFormData] = useState<{
    projectId: number;
    contractId: number;
    title: string;
    description: string;
    completionPercentage: number | "";
    amount: number | "";
    dateMiladi: string;
    contractPaymentId: number;
  }>({
    projectId: params.projectId ? parseInt(params.projectId) : 0,
    contractId: 0,
    title: "",
    description: "",
    completionPercentage: "",
    amount: "",
    dateMiladi: new Intl.DateTimeFormat('en-CA', { year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date()),
    contractPaymentId: 0,
  });

  // جلب تفاصيل المشروع
  const { data: projectDetails, isLoading: isProjectLoading } = trpc.projects.getById.useQuery(
    { id: formData.projectId },
    { enabled: formData.projectId > 0 }
  );

  // جلب عقود المشروع
  const { data: projectContracts } = trpc.contracts.list.useQuery(
    { projectId: formData.projectId },
    { enabled: formData.projectId > 0 }
  );

  // تعيين العقد تلقائياً عند تحميل المشروع
  useEffect(() => {
    const list = projectContracts?.contracts || [];
    if (list.length > 0 && formData.contractId === 0) {
      // البحث عن عقد المستخلصات أولاً
      const milestoneContract = list.find((c: any) => {
        if (c.paymentSystem === "milestones") return true;
        if (c.paymentScheduleJson) {
          try {
            const p = typeof c.paymentScheduleJson === "string" ? JSON.parse(c.paymentScheduleJson) : c.paymentScheduleJson;
            if (p?.paymentSystem === "milestones") return true;
          } catch (e) {}
        }
        return false;
      });
      const selected = milestoneContract || list[0];
      setFormData(prev => ({ ...prev, contractId: selected.id }));
    }
  }, [projectContracts, formData.contractId]);

  // جلب تفاصيل العقد
  const { data: contractDetails } = trpc.contracts.getById.useQuery(
    { id: formData.contractId },
    { enabled: formData.contractId > 0 }
  );

  // استخراج مراحل ومستخلصات العقد
  const contractMilestones = useMemo(() => {
    if (!contractDetails) return [];
    const c = contractDetails.contract as any;
    if (!c?.paymentScheduleJson) return [];
    try {
      let parsed = c.paymentScheduleJson;
      if (typeof parsed === "string") parsed = JSON.parse(parsed);
      if (typeof parsed === "string") parsed = JSON.parse(parsed);
      const isMilestones = parsed?.paymentSystem === "milestones" || c.paymentSystem === "milestones";
      const sched = Array.isArray(parsed) ? parsed : (parsed?.schedule || []);
      if (isMilestones && Array.isArray(sched)) {
        return sched;
      }
    } catch (e) {}
    return [];
  }, [contractDetails]);

  // إدارة أصناف سدانة إن وجدت
  const isSedanaProgram = projectDetails?.programType === "sedana" || projectDetails?.request?.programType === "sedana";
  const [sedanaItems, setSedanaItems] = useState<any[]>([]);

  // طفرة إنشاء طلب الصرف
  const createMutation = trpc.disbursements.createRequest.useMutation({
    onSuccess: () => {
      toast.success("تم رفع طلب المستخلص بنجاح");
      utils.disbursements.invalidate();
      utils.projects.invalidate();
      if (formData.projectId) {
        navigate(`/projects/${formData.projectId}`);
      } else {
        navigate("/disbursement-requests");
      }
    },
    onError: (error) => {
      toast.error(error.message || "حدث خطأ أثناء رفع طلب المستخلص");
    },
  });

  // اختيار مرحلة من العقد لتعبئة البيانات تلقائياً
  const handleSelectMilestone = (milestoneName: string) => {
    const found = contractMilestones.find((m: any) => (m.name || m.phaseName) === milestoneName);
    if (found) {
      const comp = (found.completionPercentage !== undefined && found.completionPercentage !== null && !isNaN(Number(found.completionPercentage)))
        ? Number(found.completionPercentage)
        : "";
      setFormData(prev => ({
        ...prev,
        title: found.name || found.phaseName || "",
        completionPercentage: comp,
        description: found.description || found.notes || prev.description,
      }));
    }
  };

  const handleSubmit = () => {
    if (!formData.projectId) {
      toast.error("يرجى اختيار المشروع");
      return;
    }
    if (!formData.dateMiladi) {
      toast.error("يرجى تحديد التاريخ الميلادي");
      return;
    }
    if (!formData.title.trim()) {
      toast.error("يرجى إدخال عنوان المستخلص");
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

    createMutation.mutate({
      projectId: formData.projectId,
      contractId: formData.contractId || undefined,
      contractPaymentId: formData.contractPaymentId || undefined,
      title: formData.title,
      description: formData.description,
      amount: 0,
      paymentType: "progress",
      completionPercentage: Number(formData.completionPercentage),
      dateMiladi: formData.dateMiladi,
    });
  };

  const numAmount = formData.amount !== "" ? Number(formData.amount) : 0;

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
                <h1 className="text-xl sm:text-2xl font-bold text-foreground">رفع مستخلص جديد</h1>
              </div>
              <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                إنشاء طلب صرف مستخلص مالي معتمد بحسب نسبة الإنجاز ومراحل العقد
              </p>
            </div>
          </div>
        </div>

        {/* اختيار المشروع */}
        {!params.projectId && (
          <Card className="border-border/60 shadow-xs">
            <CardHeader className="py-4 border-b border-border/40 bg-muted/20">
              <CardTitle className="text-sm font-bold">اختيار المشروع المرتبط</CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <ProjectSearchSelect
                value={formData.projectId ? String(formData.projectId) : ""}
                onValueChange={(val: string) => setFormData(prev => ({ ...prev, projectId: parseInt(val) || 0, contractId: 0 }))}
                placeholder="ابحث عن المشروع..."
              />
            </CardContent>
          </Card>
        )}

        {/* نموذج بيانات المستخلص */}
        <Card className="border-border/60 shadow-xs">
          <CardHeader className="py-4 border-b border-border/40 bg-muted/20">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              بيانات طلب المستخلص
            </CardTitle>
            <CardDescription className="text-xs">
              أدخل بيانات المستخلص المالي ونسبة الإنجاز
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
                  placeholder="مثال: مستخلص 1 - أعمال الأساسات والهيكل"
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
                    placeholder="مثال: 25"
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
                className="rounded-xl bg-background resize-none"
                required
              />
            </div>
          </CardContent>
        </Card>

        {/* أزرار الإرسال بالأسفل */}
        <div className="flex justify-end gap-3 pt-2">
          <Button variant="outline" onClick={() => window.history.back()} className="rounded-xl">
            إلغاء
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={createMutation.isPending} 
            className="rounded-xl gradient-primary text-white font-bold px-6"
          >
            {createMutation.isPending ? <Loader2 className="h-4 w-4 ml-2 animate-spin" /> : <Send className="h-4 w-4 ml-2" />}
            إرسال المستخلص للاعتماد
          </Button>
        </div>
      </div>
    </DashboardLayout>
  );
}
