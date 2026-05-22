import { useState, useEffect } from "react";
import { useLocation, useParams } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ArrowRight, Send, FileText, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function EditPaymentPage() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const params = useParams<{ id?: string }>();
  
  const paymentId = params.id || "";
  
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    amount: "0",
    completionPercentage: 0,
    dateMiladi: "",
  });

  // Fetch payment data
  const { data: payment, isLoading } = trpc.projects.getUnifiedPayment.useQuery(
    { id: paymentId },
    { 
      enabled: !!paymentId,
      refetchOnWindowFocus: false,
    }
  );

  useEffect(() => {
    if (payment) {
      setFormData({
        title: payment.title || "",
        description: payment.description || "",
        amount: payment.amount.toString() || "0",
        completionPercentage: payment.completionPercentage || 0,
        dateMiladi: payment.dateMiladi || "",
      });
    }
  }, [payment]);

  const updateMutation = trpc.projects.updateUnifiedPayment.useMutation({
    onSuccess: () => {
      toast.success("تم تحديث الدفعة بنجاح");
      if (payment?.projectId) {
        navigate(`/projects/${payment.projectId}`);
      } else {
        navigate("/disbursements");
      }
    },
    onError: (error) => {
      toast.error(`خطأ: ${error.message}`);
    },
  });

  const handleSubmit = () => {
    if (!formData.dateMiladi) {
      toast.error("يرجى تحديد التاريخ الميلادي");
      return;
    }
    if (!formData.title) {
      toast.error("يرجى إدخال عنوان طلب الصرف");
      return;
    }
    if (!formData.description) {
      toast.error("يرجى إدخال وصف الأعمال التي سوف تنفذ");
      return;
    }
    if (formData.completionPercentage <= 0) {
      toast.error("يرجى إدخال نسبة الإنجاز");
      return;
    }
    if (parseFloat(formData.amount) <= 0) {
      toast.error("يرجى إدخال مبلغ صحيح");
      return;
    }

    updateMutation.mutate({
      id: paymentId,
      title: formData.title,
      description: formData.description,
      amount: parseFloat(formData.amount),
      dateMiladi: formData.dateMiladi,
      completionPercentage: formData.completionPercentage,
    });
  };

  if (isLoading) {
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
      <div className="space-y-6" dir="rtl">
        {/* Header */}
        <div className="flex items-center justify-between flex-row-reverse">
          <div className="flex items-center gap-4 flex-row-reverse">
            <Button variant="ghost" size="icon" onClick={() => navigate(payment?.projectId ? `/projects/${payment.projectId}` : "/disbursements")}>
              <ArrowRight className="h-5 w-5 rotate-180" />
            </Button>
            <div className="text-right">
              <h1 className="text-2xl font-bold text-right">تعديل الدفعة</h1>
              <p className="text-muted-foreground text-right">تحديث معلومات طلب الصرف / الدفعة</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleSubmit} disabled={updateMutation.isPending}>
              {updateMutation.isPending ? <Loader2 className="h-4 w-4 ml-2 animate-spin" /> : <Send className="h-4 w-4 ml-2" />}
              حفظ التعديلات
            </Button>
          </div>
        </div>
        
        {/* Form */}
        <div className="max-w-4xl mx-auto space-y-6 text-right">
          <Card className="text-right">
            <CardHeader className="text-right">
              <CardTitle className="flex items-center gap-2 justify-start flex-row-reverse text-right">
                <FileText className="h-5 w-5" />
                بيانات الدفعة
              </CardTitle>
              <CardDescription className="text-right">المعلومات الأساسية المرتبطة بالدفعة المحددة</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-right">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2 text-right">
                  <Label className="text-right">عنوان طلب الصرف *</Label>
                  <Input
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="مثال: صرف الدفعة الأولى لمشروع ترميم مسجد..."
                    required
                    className="text-right"
                  />
                </div>
                
                <div className="space-y-2 text-right">
                  <Label className="text-right">المبلغ (ريال) *</Label>
                  <Input
                    type="number"
                    min="1"
                    step="0.01"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    required
                    className="text-right font-bold text-primary"
                  />
                </div>
                
                <div className="space-y-2 text-right">
                  <Label className="text-right">التاريخ الميلادي *</Label>
                  <Input
                    type="date"
                    value={formData.dateMiladi}
                    onChange={(e) => setFormData({ ...formData, dateMiladi: e.target.value })}
                    required
                    className="text-right"
                  />
                </div>

                <div className="space-y-2 text-right">
                  <Label className="text-right">نسبة الإنجاز (%) *</Label>
                  <Input
                    type="number"
                    min="1"
                    max="100"
                    required
                    value={formData.completionPercentage}
                    onChange={(e) => setFormData({ ...formData, completionPercentage: parseInt(e.target.value) || 0 })}
                    className="text-right"
                  />
                </div>
              </div>

              <div className="space-y-2 text-right pt-4">
                <Label className="text-right">وصف الأعمال التي سوف تنفذ *</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="وصف تفصيلي للأعمال التي سوف تنفذ..."
                  rows={4}
                  required
                  className="text-right"
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
