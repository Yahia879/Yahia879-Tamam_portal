import { useState, useEffect } from "react";
import { useLocation, useParams } from "wouter";
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
  ArrowRight,
  FileText,
  AlertCircle,
  ArrowLeft,
  Eye,
  Check,
  Coins,
  Building2,
} from "lucide-react";
import { toast } from "sonner";

interface SupplierEntry {
  id: string;
  name: string;
  work: string;
  amount: number;
  iban: string;
  bank: string;
  agreedAmount: number;
}

export default function EditLinkedDisbursementRequest() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const params = useParams<{ id: string }>();
  const requestId = parseInt(params.id || "0");

  // التحكم بالخطوات
  const [step, setStep] = useState(1);

  // بيانات النموذج
  const [formData, setFormData] = useState({
    projectId: 0,
    contractId: 0,
    title: "",
    description: "",
    completionPercentage: 0,
    dateMiladi: new Date().toISOString().split('T')[0],
    contractPaymentId: 0,
  });

  const [selectedReportId, setSelectedReportId] = useState<number | null>(null);

  // قائمة الموردين
  const [suppliers, setSuppliers] = useState<SupplierEntry[]>([]);

  // استعلام جلب طلب الصرف الحالي
  const { data: request, isLoading: isRequestLoading } = trpc.disbursements.getRequestById.useQuery(
    { id: requestId },
    { enabled: !!requestId }
  );

  // جلب المشاريع
  const { data: projects } = trpc.projects.getAll.useQuery({});

  // جلب العقود للمشروع المحدد
  const { data: projectContracts } = trpc.contracts.list.useQuery(
    { projectId: formData.projectId },
    { enabled: formData.projectId > 0 }
  );

  // جلب تفاصيل المشروع
  const { data: projectDetails } = trpc.projects.getById.useQuery(
    { id: formData.projectId },
    { enabled: formData.projectId > 0 }
  );

  // جلب تقارير الإنجاز المعتمدة للمشروع المحدد
  const { data: approvedReports } = trpc.progressReports.list.useQuery(
    { projectId: formData.projectId || undefined, status: "approved" },
    { enabled: formData.projectId > 0 }
  );

  // جلب طلبات الصرف الحالية للمشروع للتحقق من عدم تكرار الدفعة
  const { data: projectRequests } = trpc.disbursements.getRequestsByProject.useQuery(
    { projectId: formData.projectId },
    { enabled: formData.projectId > 0 }
  );

  // دالة للتحقق مما إذا كان تقرير الإنجاز مرتبطاً بطلب صرف سابق
  const isReportLinked = (report: any) => {
    if (!projectRequests?.requests) return false;
    const match = (report.workSummary || "").match(/\[معرف الدفعة:\s*([^\]]+)\]/);
    if (!match) return false;
    const paymentIdRaw = match[1];
    const paymentIdNumeric = parseInt(paymentIdRaw.replace(/^(cp-|disb-|manual-)/i, "")) || 0;

    // يُسمح به إذا كان مرتبطاً بطلب الصرف الحالي الذي نقوم بتعديله
    if (paymentIdNumeric === request?.contractPaymentId) return false;

    return projectRequests.requests.some(
      (req: any) => req.contractPaymentId === paymentIdNumeric && req.status !== "rejected"
    );
  };

  const selectedReport = approvedReports?.find((r: any) => r.id === selectedReportId);
  const paymentIdMatch = selectedReport ? (selectedReport.workSummary || "").match(/\[معرف الدفعة:\s*([^\]]+)\]/) : null;
  const paymentIdRaw = paymentIdMatch ? paymentIdMatch[1] : "";
  const paymentIdNumeric = parseInt(paymentIdRaw.replace(/^(cp-|disb-|manual-)/i, "")) || 0;
  const paymentInfo = projectDetails?.payments?.find((p: any) => p.id === paymentIdRaw || p.id === paymentIdNumeric);

  // تعبئة البيانات الأساسية من طلب الصرف عند التحميل
  useEffect(() => {
    if (request) {
      setFormData({
        projectId: request.projectId,
        contractId: request.contractId || 0,
        title: request.title || "",
        description: request.description || "",
        completionPercentage: request.completionPercentage || 0,
        dateMiladi: request.dateMiladi ? new Date(request.dateMiladi).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        contractPaymentId: request.contractPaymentId || 0,
      });

      // تهيئة مبلغ المورد الأصلي من الطلب
      if (request.contract) {
        setSuppliers([
          {
            id: crypto.randomUUID(),
            name: request.contract.secondPartyName || "",
            work: request.title || "",
            amount: parseFloat(request.amount?.toString() || "0"),
            iban: request.contract.secondPartyIban || "",
            bank: request.contract.secondPartyBankName || "",
            agreedAmount: parseFloat(request.amount?.toString() || "0"),
          }
        ]);
      }
    }
  }, [request]);

  // تحديد تقرير الإنجاز المطابق تلقائياً عند تحميل تقارير المشروع
  useEffect(() => {
    if (request && approvedReports && selectedReportId === null) {
      const matchedReport = approvedReports.find((r: any) => {
        const match = (r.workSummary || "").match(/\[معرف الدفعة:\s*([^\]]+)\]/);
        if (!match) return false;
        const paymentIdRaw = match[1];
        const paymentIdNumeric = parseInt(paymentIdRaw.replace(/^(cp-|disb-|manual-)/i, "")) || 0;
        return paymentIdNumeric === request.contractPaymentId;
      });
      if (matchedReport) {
        setSelectedReportId(matchedReport.id);
      }
    }
  }, [request, approvedReports, selectedReportId]);

  // الملء التلقائي بناءً على تغيير تقرير الإنجاز المختار يدوياً
  useEffect(() => {
    if (selectedReport && selectedReportId !== null && request && selectedReport.id !== approvedReports?.find((r: any) => {
      const match = (r.workSummary || "").match(/\[معرف الدفعة:\s*([^\]]+)\]/);
      if (!match) return false;
      const paymentIdRaw = match[1];
      const paymentIdNumeric = parseInt(paymentIdRaw.replace(/^(cp-|disb-|manual-)/i, "")) || 0;
      return paymentIdNumeric === request.contractPaymentId;
    })?.id) {
      const workSummaryText = selectedReport.workSummary || "";
      const actualMatch = workSummaryText.match(/الأعمال المنفذة فعلياً:\r?\n([\s\S]*?)(?:\r?\n\r?\[معرف الدفعة:|$)/);
      const actual = actualMatch ? actualMatch[1].trim() : workSummaryText.replace(/\[معرف الدفعة:\s*[^\]]+\]/g, "").trim();

      const targetPaymentId = paymentInfo ? paymentIdNumeric : 0;

      setFormData(prev => ({
        ...prev,
        title: `تعديل طلب صرف لـ ${selectedReport.title}`,
        description: `تقرير إنجاز ${selectedReport.reportNumber} - الأعمال المنفذة فعلياً:\n${actual}`,
        completionPercentage: selectedReport.actualProgress || 0,
        contractPaymentId: targetPaymentId,
      }));
    }
  }, [selectedReportId, selectedReport, paymentInfo, request, approvedReports]);

  // جلب تفاصيل العقد
  const { data: contractDetails } = trpc.contracts.getById.useQuery(
    { id: formData.contractId },
    { enabled: formData.contractId > 0 }
  );

  // تحديث بيانات المورد من العقد وتقرير الإنجاز تلقائياً في حال تغيير التقرير
  useEffect(() => {
    if (contractDetails && contractDetails.contract) {
      const targetAmount = paymentInfo
        ? parseFloat(paymentInfo.amount || "0")
        : parseFloat(String(contractDetails.contract.contractAmount || "0"));

      const targetWork = paymentInfo
        ? paymentInfo.description || ""
        : contractDetails.contract.contractTitle || "";

      if (
        suppliers.length === 1 &&
        suppliers[0].name === contractDetails.contract.secondPartyName &&
        suppliers[0].iban === contractDetails.contract.secondPartyIban &&
        suppliers[0].agreedAmount === targetAmount &&
        suppliers[0].work === targetWork
      ) {
        return;
      }

      const supplierFromContract: SupplierEntry = {
        id: suppliers.length === 1 ? suppliers[0].id : crypto.randomUUID(),
        name: contractDetails.contract.secondPartyName || "",
        work: targetWork,
        amount: targetAmount,
        agreedAmount: targetAmount,
        iban: contractDetails.contract.secondPartyIban || "",
        bank: contractDetails.contract.secondPartyBankName || "",
      };
      setSuppliers([supplierFromContract]);
    }
  }, [contractDetails, paymentInfo]);

  // حساب الإجمالي والمبالغ
  const totalAmount = suppliers.reduce((sum, s) => sum + (s.amount || 0), 0);
  const contractAmount = parseFloat(contractDetails?.contract?.contractAmount || "0");

  const updateSupplier = (id: string, field: keyof SupplierEntry, value: string | number) => {
    setSuppliers(suppliers.map(s => s.id === id ? { ...s, [field]: value } : s));
  };

  // mutation لتحديث طلب الصرف
  const updateMutation = trpc.disbursements.updateRequest.useMutation({
    onSuccess: () => {
      toast.success("تم تحديث طلب الصرف بنجاح");
      navigate("/disbursements");
    },
    onError: (error) => {
      toast.error(`خطأ: ${error.message}`);
    },
  });

  // حفظ التعديلات
  const handleSubmit = () => {
    if (!formData.projectId) {
      toast.error("يرجى اختيار المشروع");
      return;
    }
    if (!formData.title) {
      toast.error("يرجى إدخال عنوان طلب الصرف");
      return;
    }
    if (!formData.description) {
      toast.error("يرجى إدخال وصف الأعمال");
      return;
    }
    if (formData.completionPercentage <= 0) {
      toast.error("يرجى إدخال نسبة الإنجاز");
      return;
    }
    if (totalAmount <= 0) {
      toast.error("يرجى إدخال مبلغ صحيح");
      return;
    }

    if (suppliers.some(s => s.amount > s.agreedAmount)) {
      toast.error("المبلغ الفعلي لا يمكن أن يتجاوز المبلغ المتفق عليه للدفعة");
      return;
    }

    updateMutation.mutate({
      id: requestId,
      title: formData.title,
      description: formData.description,
      amount: totalAmount,
      paymentType: "progress",
      dateMiladi: formData.dateMiladi,
      completionPercentage: formData.completionPercentage,
      contractPaymentId: formData.contractPaymentId || undefined,
    });
  };

  if (isRequestLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </DashboardLayout>
    );
  }

  if (!request) {
    return (
      <DashboardLayout>
        <div className="text-center py-12" dir="rtl">
          <h2 className="text-xl font-bold mb-4">طلب الصرف غير موجود</h2>
          <Button onClick={() => navigate("/disbursements")}>العودة لقائمة طلبات الصرف</Button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-4 sm:space-y-6 animate-fade-in pb-20 px-3 sm:px-4 md:px-0" dir="rtl">
        {/* Header and Visual Step Timeline */}
        <div className="flex flex-col gap-6 border-b border-border/40 pb-6">
          <div className="flex items-center justify-between pb-2">
            <div className="flex items-center gap-2 sm:gap-3">
              <Button 
                variant="outline" 
                size="icon" 
                onClick={() => navigate("/disbursements")} 
                className="h-8 w-8 sm:h-9 sm:w-9 rounded-full hover:bg-muted text-muted-foreground shrink-0"
              >
                <ArrowRight className="h-4 w-4 sm:h-5 sm:w-5 rotate-180" />
              </Button>
              <div className="text-right">
                <h1 className="text-lg sm:text-2xl font-bold text-foreground font-display">
                  تعديل طلب الصرف ({request.requestNumber})
                </h1>
                <p className="text-[10px] sm:text-xs text-muted-foreground text-right font-medium mt-0.5 hidden sm:block">
                  تعديل بيانات ومبالغ طلب الصرف المرتبط بتقرير الإنجاز بنظام تمام
                </p>
              </div>
            </div>
          </div>

          {/* Stepper Timeline */}
          <div className="max-w-md mx-auto w-full px-2 sm:px-4 py-2" dir="rtl">
            <div className="relative flex items-center justify-between">
              <div className="absolute right-0 left-0 top-1/2 -translate-y-1/2 h-0.5 bg-border rounded-full z-0" />
              <div 
                className="absolute right-0 top-1/2 -translate-y-1/2 h-0.5 bg-primary rounded-full z-0 transition-all duration-500"
                style={{ width: step === 1 ? '50%' : '100%' }}
              />

              <div className="flex flex-col items-center gap-1.5 z-10">
                <div 
                  className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs transition-all duration-300 border ${
                    step >= 1 
                      ? 'bg-primary border-primary text-primary-foreground shadow-sm' 
                      : 'bg-background border-border text-muted-foreground'
                  }`}
                >
                  {step > 1 ? <Check className="w-4 h-4" /> : "١"}
                </div>
                <span className={`text-xs font-semibold ${step >= 1 ? 'text-primary' : 'text-muted-foreground'}`}>
                  المشروع والتقرير
                </span>
              </div>

              <div className="flex flex-col items-center gap-1.5 z-10">
                <div 
                  className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs transition-all duration-300 border ${
                    step === 2 
                      ? 'bg-primary border-primary text-primary-foreground shadow-sm' 
                      : 'bg-background border-border text-muted-foreground'
                  }`}
                >
                  ٢
                </div>
                <span className={`text-xs font-semibold ${step === 2 ? 'text-primary' : 'text-muted-foreground'}`}>
                  المطابقة والبيانات المالية
                </span>
              </div>
            </div>
          </div>
        </div>
        
        {step === 1 ? (
          <div className="space-y-6">
            <Card className="border-border/60 shadow-sm rounded-xl overflow-hidden bg-white dark:bg-slate-900">
              <CardHeader className="bg-muted/30 border-b border-border/40 py-4 text-right">
                <CardTitle className="flex items-center gap-2 text-foreground text-base font-bold">
                  <FileText className="h-4.5 w-4.5 text-primary" />
                  الخطوة 1: تعديل المشروع والتقرير المرتبط
                </CardTitle>
                <CardDescription className="text-right text-xs text-muted-foreground">راجع المشروع والتقرير المرتبط بالطلب الحالي</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6 pt-6 text-right">
                <div className="space-y-2 text-right">
                  <Label className="text-right text-xs font-bold text-slate-700 dark:text-slate-300">المشروع *</Label>
                  <Select
                    value={formData.projectId.toString()}
                    onValueChange={(value) => {
                      setFormData({ ...formData, projectId: parseInt(value), contractId: 0 });
                      setSelectedReportId(null);
                    }}
                  >
                    <SelectTrigger className="text-right border-border focus:ring-primary rounded-xl h-11 bg-background" dir="rtl">
                      <SelectValue placeholder="اختر المشروع لتحديد تقرير الإنجاز" />
                    </SelectTrigger>
                    <SelectContent dir="rtl">
                      {projects?.map((project: { id: number; name: string; projectNumber: string }) => (
                        <SelectItem key={project.id} value={project.id.toString()} className="text-right">
                          {project.name} - {project.projectNumber}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {formData.projectId > 0 && (
                  <div className="space-y-4 text-right animate-slide-up">
                    <div className="space-y-2 text-right">
                      <Label className="text-right text-xs font-bold text-slate-700 dark:text-slate-300">تقرير الإنجاز المرتبط *</Label>
                      <Select
                        value={selectedReportId?.toString() || ""}
                        onValueChange={(value) => setSelectedReportId(parseInt(value))}
                      >
                        <SelectTrigger className="text-right border-border focus:ring-primary rounded-xl h-11 bg-background" dir="rtl">
                          <SelectValue placeholder="اختر تقرير إنجاز الدفعة لمراجعته" />
                        </SelectTrigger>
                        <SelectContent dir="rtl">
                          {approvedReports?.length === 0 ? (
                            <div className="p-2 text-center text-xs text-muted-foreground">لا توجد تقارير إنجاز معتمدة لهذا المشروع</div>
                          ) : (
                            approvedReports?.map((report: any) => {
                              const linked = isReportLinked(report);
                              return (
                                <SelectItem key={report.id} value={report.id.toString()} className="text-right" disabled={linked}>
                                  {report.reportNumber} - {report.title} ({report.actualProgress}%) {linked ? " (تم إنشاء طلب صرف له سابقاً)" : ""}
                                </SelectItem>
                              );
                            })
                          )}
                        </SelectContent>
                      </Select>
                    </div>

                    {selectedReport && (
                      <div className="space-y-4 animate-slide-up text-right">
                        <div className="p-5 rounded-xl border border-emerald-100 bg-emerald-50/10 dark:bg-emerald-950/5 text-right space-y-4 shadow-inner">
                          <div className="flex flex-col gap-3 sm:gap-4 sm:flex-row sm:items-center justify-between border-b border-emerald-100/30 dark:border-emerald-900/20 pb-3">
                            <div className="flex items-center gap-2 justify-start">
                              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-600">
                                <FileText className="w-4.5 h-4.5" />
                              </div>
                              <div className="text-right">
                                <span className="text-[10px] text-muted-foreground block font-bold">تقرير الإنجاز المرتبط بالطلب</span>
                                <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200 mt-0.5">
                                  {selectedReport.reportNumber} — {selectedReport.title}
                                </h4>
                              </div>
                            </div>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="text-emerald-700 border-emerald-300 bg-background hover:bg-emerald-50 dark:text-emerald-400 dark:border-emerald-900 dark:hover:bg-emerald-950/20 font-bold h-8 sm:h-9 text-[10px] sm:text-xs px-2.5 sm:px-3 rounded-lg shrink-0 shadow-sm w-full sm:w-auto"
                              onClick={() => window.open(`/progress-reports/${selectedReport.id}/print`, '_blank')}
                            >
                              <Eye className="ml-1.5 h-3.5 w-3.5" />
                              مراجعة وتدقيق التقرير المعتمد
                            </Button>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3 text-right">
                            <div className="bg-background/80 p-3 rounded-lg border border-emerald-100/60 dark:border-emerald-900/10 shadow-sm">
                              <span className="text-[10px] text-muted-foreground block font-semibold">تاريخ التقرير</span>
                              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 mt-1 block">
                                {new Date(selectedReport.reportDate).toLocaleDateString("ar-SA")}
                              </span>
                            </div>
                            <div className="bg-background/80 p-3 rounded-lg border border-emerald-100/60 dark:border-emerald-900/10 shadow-sm">
                              <span className="text-[10px] text-muted-foreground block font-semibold">الإنجاز الفعلي بالتقرير</span>
                              <span className="text-xs font-black text-emerald-600 dark:text-emerald-400 mt-1 block">
                                {selectedReport.actualProgress}%
                              </span>
                            </div>
                            <div className="bg-background/80 p-3 rounded-lg border border-emerald-100/60 dark:border-emerald-900/10 shadow-sm">
                              <span className="text-[10px] text-muted-foreground block font-semibold">الانحراف المجدول</span>
                              <span className={`text-xs font-black mt-1 block ${
                                ((selectedReport.actualProgress || 0) - (selectedReport.plannedProgress || 0)) >= 0 
                                  ? 'text-emerald-600 dark:text-emerald-400' 
                                  : 'text-rose-600 dark:text-rose-400'
                              }`}>
                                {((selectedReport.actualProgress || 0) - (selectedReport.plannedProgress || 0))}%
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
              <CardFooter className="border-t border-border/40 pt-4 flex justify-end gap-2">
                <Button
                  onClick={() => setStep(2)}
                  disabled={!selectedReportId}
                  className="gradient-primary text-white font-bold px-6 h-11 rounded-xl shadow-sm"
                >
                  التالي
                  <ArrowLeft className="mr-2 h-4 w-4" />
                </Button>
              </CardFooter>
            </Card>
          </div>
        ) : (
          <div className="space-y-6">
            <Card className="border-border/60 shadow-sm rounded-xl overflow-hidden bg-white dark:bg-slate-900">
              <CardHeader className="bg-muted/30 border-b border-border/40 py-4 text-right">
                <CardTitle className="flex items-center gap-2 text-foreground text-base font-bold">
                  <FileText className="h-4.5 w-4.5 text-primary" />
                  الخطوة 2: مراجعة الدفعات والمعلومات المالية
                </CardTitle>
                <CardDescription className="text-right text-xs">راجع تفاصيل المبالغ المحددة وحدد الدفعة الفعلية التي سوف تصرف</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5 pt-6 text-right">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2 text-right">
                    <Label className="text-right text-xs font-bold text-slate-700 dark:text-slate-300">التاريخ الميلادي *</Label>
                    <Input
                      type="date"
                      value={formData.dateMiladi}
                      onChange={(e) => setFormData({ ...formData, dateMiladi: e.target.value })}
                      required
                      className="text-right border-border focus:ring-primary rounded-xl h-10 font-bold text-slate-900 dark:text-slate-100 bg-background"
                    />
                  </div>
                  
                  <div className="space-y-2 text-right">
                    <Label className="text-right text-xs font-bold text-slate-700 dark:text-slate-300">نسبة الإنجاز الفعلية (%) *</Label>
                    <Input
                      type="number"
                      min="1"
                      max="100"
                      required
                      value={formData.completionPercentage}
                      onChange={(e) => setFormData({ ...formData, completionPercentage: parseInt(e.target.value) || 0 })}
                      className="text-right border-border focus:ring-primary rounded-xl h-10 font-black text-primary bg-background"
                    />
                  </div>
                </div>

                <div className="space-y-2 text-right">
                  <Label className="text-right text-xs font-bold text-slate-700 dark:text-slate-300">عنوان طلب الصرف *</Label>
                  <Input
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="عنوان طلب الصرف المالي"
                    required
                    className="text-right border-border focus:ring-primary rounded-xl h-10 font-bold text-slate-900 dark:text-slate-100 bg-background"
                  />
                </div>
                
                <div className="space-y-2 text-right">
                  <Label className="text-right text-xs font-bold text-slate-700 dark:text-slate-300">وصف الأعمال والمنجزات الفعلية *</Label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="وصف تفصيلي للأعمال والمنجزات الفعلية المصاحبة لتقرير الإنجاز المالي..."
                    rows={4}
                    required
                    className="text-right border-border focus:ring-primary rounded-xl text-xs leading-relaxed font-bold text-slate-900 dark:text-slate-100 bg-background"
                  />
                </div>
              </CardContent>
            </Card>

            {/* الموردون المستحقون للصرف الفعلي */}
            <Card className="border-border/60 shadow-sm rounded-xl overflow-hidden bg-white dark:bg-slate-900">
              <CardHeader className="bg-muted/30 border-b border-border/40 py-4 text-right">
                <div className="text-right space-y-1">
                  <CardTitle className="flex items-center gap-2 text-foreground text-base font-bold justify-start">
                    <Building2 className="h-4.5 w-4.5 text-primary" />
                    الدفعة التي سوف تصرف (المستفيدين والمبالغ الفعلية)
                  </CardTitle>
                  <CardDescription className="text-right text-xs">حدد المبالغ الفعلية التي سوف تصرف وبيانات المستفيدين</CardDescription>
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="space-y-6">
                  {suppliers.map((supplier, index) => (
                    <div key={supplier.id} className="p-5 rounded-xl border border-border bg-slate-50/20 dark:bg-slate-900/10 relative space-y-4 text-right hover:border-primary/30 transition-colors">
                      <div className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300 justify-start border-b border-dashed border-border/80 pb-2">
                        <Building2 className="w-4 h-4 text-primary" />
                        <span>المستفيد #{index + 1} (توزيع مستحقات الدفعة)</span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
                        <div className="space-y-2 text-right">
                          <Label className="text-right text-xs font-bold text-slate-700 dark:text-slate-300">اسم المستفيد *</Label>
                          <Input
                            value={supplier.name}
                            readOnly
                            className="text-right border-border rounded-xl h-10 font-bold text-slate-900 dark:text-slate-100 bg-slate-50/50 dark:bg-slate-900/30 cursor-default"
                          />
                        </div>

                        <div className="space-y-2 text-right">
                          <Label className="text-right text-xs font-bold text-slate-700 dark:text-slate-300">بيان الأعمال / الدفعة *</Label>
                          <Input
                            value={supplier.work}
                            onChange={(e) => updateSupplier(supplier.id, "work", e.target.value)}
                            className="text-right border-border rounded-xl h-10 font-bold text-slate-900 dark:text-slate-100 bg-background"
                          />
                        </div>

                        <div className="space-y-2 text-right">
                          <Label className="text-right text-xs font-bold text-slate-700 dark:text-slate-300">اسم البنك *</Label>
                          <Input
                            value={supplier.bank}
                            readOnly
                            className="text-right border-border rounded-xl h-10 font-bold text-slate-900 dark:text-slate-100 bg-slate-50/50 dark:bg-slate-900/30 cursor-default"
                          />
                        </div>

                        <div className="space-y-2 text-right sm:col-span-2 md:col-span-1">
                          <Label className="text-right text-xs font-bold text-slate-700 dark:text-slate-300">رقم الآيبان (IBAN) *</Label>
                          <Input
                            value={supplier.iban}
                            readOnly
                            className="text-right border-border rounded-xl h-10 font-mono font-bold text-slate-900 dark:text-slate-100 bg-slate-50/50 dark:bg-slate-900/30 cursor-default"
                            dir="ltr"
                          />
                        </div>

                        <div className="space-y-2 text-right">
                          <Label className="text-right text-xs font-bold text-slate-700 dark:text-slate-300 block">المبلغ المتفق عليه للدفعة *</Label>
                          <Input
                            type="number"
                            value={supplier.agreedAmount || ""}
                            readOnly
                            className="text-right font-bold text-slate-900 dark:text-slate-100 border-border focus:ring-0 rounded-xl h-10 bg-slate-50/50 dark:bg-slate-900/30 cursor-default"
                          />
                        </div>

                        <div className="space-y-2 text-right">
                          <Label className="text-right text-xs font-bold text-slate-700 dark:text-slate-300 block">النسبة (%)</Label>
                          <Input
                            type="number"
                            min="0"
                            max="100"
                            step="0.01"
                            value={contractAmount ? Number(((supplier.amount / contractAmount) * 100).toFixed(2)) : ""}
                            onChange={(e) => {
                              const pct = parseFloat(e.target.value) || 0;
                              const calculatedAmount = contractAmount ? (contractAmount * pct) / 100 : 0;
                              updateSupplier(supplier.id, "amount", Number(calculatedAmount.toFixed(2)));
                            }}
                            className="text-center font-bold text-primary border-border focus:ring-primary rounded-xl h-10 bg-background"
                          />
                        </div>

                        <div className="space-y-2 text-right">
                          <Label className="text-right text-xs font-bold text-slate-700 dark:text-slate-300 block">المبلغ الفعلي (ريال) *</Label>
                          <Input
                            type="number"
                            value={supplier.amount || ""}
                            onChange={(e) => updateSupplier(supplier.id, "amount", parseFloat(e.target.value) || 0)}
                            placeholder="0.00"
                            required
                            className="text-center font-black text-primary border-border focus:ring-primary rounded-xl h-10 bg-background"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* ملخص الدفعة والتقرير المالي */}
            <Card className="border-border/60 shadow-sm rounded-xl overflow-hidden bg-white dark:bg-slate-900">
              <CardHeader className="bg-muted/30 border-b border-border/40 py-4 text-right">
                <CardTitle className="text-base font-bold flex items-center gap-2 text-foreground">
                  <Coins className="w-4.5 h-4.5 text-primary" />
                  ملخص الدفعة والتقرير المالي
                </CardTitle>
                <CardDescription>تفاصيل التدقيق والمجاميع المالية لطلب الصرف الحالي</CardDescription>
              </CardHeader>
              <CardContent className="pt-6 space-y-6 text-right">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-right">
                  <div className="space-y-1">
                    <span className="text-[10px] text-muted-foreground block font-bold">اسم المشروع</span>
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200 leading-snug">{projectDetails?.name || "المشروع المحدد"}</span>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] text-muted-foreground block font-bold">رقم تقرير الإنجاز</span>
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200">{selectedReport?.reportNumber || "لا يوجد"}</span>
                  </div>
                </div>

                <Separator />

                <div className="p-3 sm:p-4 rounded-xl bg-primary/[0.03] border border-primary/20 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
                  <div className="space-y-1">
                    <span className="text-[10px] text-primary block font-black">إجمالي الدفعة الفعلية التي سوف تصرف</span>
                    <span className="text-xl sm:text-2xl font-black text-primary">
                      {totalAmount.toLocaleString()} <span className="text-xs font-semibold">ريال سعودي</span>
                    </span>
                  </div>
                  
                  {contractDetails && (
                    <div className="text-xs text-left">
                      <span className="text-muted-foreground block text-[9px]">قيمة العقد الإجمالي</span>
                      <span className="font-bold text-foreground">{contractAmount.toLocaleString()} ريال</span>
                    </div>
                  )}
                </div>
              </CardContent>
              <CardFooter className="border-t border-border/40 pt-4 flex justify-between gap-2">
                <Button
                  variant="outline"
                  onClick={() => setStep(1)}
                  className="border-border rounded-xl h-11 px-6 font-bold"
                >
                  <ArrowRight className="ml-2 h-4 w-4" />
                  السابق
                </Button>

                <Button
                  onClick={handleSubmit}
                  disabled={updateMutation.isPending}
                  className="gradient-primary text-white font-bold px-8 h-11 rounded-xl shadow-sm"
                >
                  {updateMutation.isPending ? "جاري الحفظ..." : "حفظ التعديلات"}
                </Button>
              </CardFooter>
            </Card>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
