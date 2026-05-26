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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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

interface SupplierEntry {
  id: string;
  name: string;
  work: string;
  amount: number;
  iban: string;
  bank: string;
}

export default function NewLinkedDisbursementRequest() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  
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
  const [showReportReviewDialog, setShowReportReviewDialog] = useState(false);

  // قائمة الموردين
  const [suppliers, setSuppliers] = useState<SupplierEntry[]>([
    { id: crypto.randomUUID(), name: "", work: "", amount: 0, iban: "", bank: "" }
  ]);
  
  // جلب المشاريع
  const { data: projects } = trpc.projects.getAll.useQuery({});
  
  // جلب الموردين النشطين
  const { data: allSuppliers } = trpc.suppliers.getActiveSuppliers.useQuery({ includeUnapproved: true });

  // جلب التصنيفات
  const { data: banksData } = trpc.categories.getCategoryByType.useQuery({ type: "banks" });
  const banks = banksData?.values;
  
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

  const selectedReport = approvedReports?.find((r: any) => r.id === selectedReportId);
  const paymentIdMatch = selectedReport ? (selectedReport.workSummary || "").match(/\[معرف الدفعة:\s*([^\]]+)\]/) : null;
  const paymentId = paymentIdMatch ? parseInt(paymentIdMatch[1]) : 0;
  const paymentInfo = projectDetails?.payments?.find((p: any) => p.id === paymentId);

  // الملء التلقائي بناءً على تقرير الإنجاز المختار
  useEffect(() => {
    if (selectedReport) {
      const workSummaryText = selectedReport.workSummary || "";
      const actualMatch = workSummaryText.match(/الأعمال المنفذة فعلياً:\r?\n([\s\S]*?)(?:\r?\n\r?\[معرف الدفعة:|$)/);
      const actual = actualMatch ? actualMatch[1].trim() : workSummaryText.replace(/\[معرف الدفعة:\s*[^\]]+\]/g, "").trim();

      setFormData(prev => ({
        ...prev,
        title: `طلب صرف لـ ${selectedReport.title}`,
        description: `تقرير إنجاز ${selectedReport.reportNumber} - الأعمال المنفذة فعلياً:\n${actual}`,
        completionPercentage: selectedReport.actualProgress || 0,
        contractPaymentId: paymentId,
      }));

      if (paymentInfo) {
        setSuppliers(prev => prev.map(s => ({
          ...s,
          amount: parseFloat(paymentInfo.amount || "0"),
          work: paymentInfo.description || "",
        })));
      }
    }
  }, [selectedReportId, projectDetails]);
  
  // جلب تفاصيل العقد
  const { data: contractDetails } = trpc.contracts.getById.useQuery(
    { id: formData.contractId },
    { enabled: formData.contractId > 0 }
  );
  
  // mutation لإنشاء طلب الصرف
  const createMutation = trpc.disbursements.createRequest.useMutation({
    onSuccess: (data) => {
      toast.success("تم إنشاء طلب الصرف بنجاح");
      navigate("/disbursements");
    },
    onError: (error) => {
      toast.error(`خطأ: ${error.message}`);
    },
  });
  
  // تحديث بيانات المورد من العقد تلقائياً
  useEffect(() => {
    if (contractDetails) {
      const supplierFromContract: SupplierEntry = {
        id: crypto.randomUUID(),
        name: contractDetails.contract.secondPartyName || "",
        work: contractDetails.contract.contractTitle || "",
        amount: paymentInfo ? parseFloat(paymentInfo.amount || "0") : parseFloat(String(contractDetails.contract.contractAmount || "0")),
        iban: contractDetails.contract.secondPartyIban || "",
        bank: contractDetails.contract.secondPartyBankName || "",
      };
      setSuppliers([supplierFromContract]);
    }
  }, [contractDetails]);

  // اختيار العقد تلقائياً إذا كان هناك عقد واحد فقط للمشروع
  useEffect(() => {
    if (projectContracts && projectContracts.contracts && projectContracts.contracts.length === 1) {
      if (formData.contractId === 0) {
        setFormData(prev => ({ ...prev, contractId: projectContracts.contracts[0].id }));
      }
    }
  }, [projectContracts]);
  
  // حساب الإجمالي
  const totalAmount = suppliers.reduce((sum, s) => sum + (s.amount || 0), 0);
  
  // حساب المتبقي للصرف
  const totalPaymentsSum = projectDetails?.payments?.reduce((sum, p) => sum + parseFloat(p.amount || "0"), 0) || 0;
  const contractAmount = parseFloat(contractDetails?.contract?.contractAmount || "0");
  const remainingAmount = contractAmount - totalPaymentsSum;

  // إضافة مورد جديد
  const addSupplier = () => {
    setSuppliers([...suppliers, { id: crypto.randomUUID(), name: "", work: "", amount: 0, iban: "", bank: "" }]);
  };
  
  // حذف مورد
  const removeSupplier = (id: string) => {
    if (suppliers.length > 1) {
      setSuppliers(suppliers.filter(s => s.id !== id));
    }
  };
  
  // تحديث بيانات المورد
  const updateSupplier = (id: string, field: keyof SupplierEntry, value: string | number) => {
    setSuppliers(suppliers.map(s => s.id === id ? { ...s, [field]: value } : s));
  };

  // اختيار مورد من القائمة
  const handleSelectSupplier = (id: string, supplierName: string) => {
    const selectedSupplier = allSuppliers?.find(s => s.name === supplierName);
    if (selectedSupplier) {
      setSuppliers(suppliers.map(s => s.id === id ? { 
        ...s, 
        name: selectedSupplier.name,
        iban: selectedSupplier.iban || s.iban,
        bank: selectedSupplier.bankName || s.bank
      } : s));
    } else {
      updateSupplier(id, "name", supplierName);
    }
  };
  
  // إرسال للاعتماد
  const handleSubmit = () => {
    if (!formData.projectId) {
      toast.error("يرجى اختيار المشروع");
      return;
    }
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
    if (totalAmount <= 0) {
      toast.error("يرجى إدخال مبلغ صحيح");
      return;
    }
    if (suppliers.some(s => !s.name)) {
      toast.error("يرجى اختيار المورد المستفيد");
      return;
    }

    // التحقق من تجاوز قيمة العقد أو المبلغ المتبقي
    if (contractDetails && totalAmount > contractAmount) {
      toast.error(`المبلغ لا يمكن أن يتجاوز قيمة العقد (${contractAmount.toLocaleString()} ريال)`);
      return;
    }

    if (contractDetails && totalAmount > remainingAmount) {
      toast.error(`المبلغ لا يمكن أن يتجاوز الإجمالي المتبقي للصرف (${remainingAmount.toLocaleString()} ريال)`);
      return;
    }
    
    createMutation.mutate({
      projectId: formData.projectId,
      contractId: formData.contractId || undefined,
      contractPaymentId: formData.contractPaymentId || undefined,
      title: formData.title,
      description: formData.description,
      amount: totalAmount,
      paymentType: "progress",
      dateMiladi: formData.dateMiladi,
      completionPercentage: formData.completionPercentage,
    });
  };
  
  return (
    <DashboardLayout>
      <div className="space-y-8 animate-fade-in pb-24 px-4 md:px-0" dir="rtl">
        {/* Header and Visual Step Timeline */}
        <div className="flex flex-col gap-6 border-b border-emerald-100/30 pb-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3 flex-row-reverse">
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => window.history.back()} 
                className="h-9 w-9 rounded-full hover:bg-emerald-50 dark:hover:bg-slate-900 text-emerald-800 dark:text-emerald-400"
              >
                <ArrowRight className="h-5 w-5 rotate-180" />
              </Button>
              <div className="text-right">
                <h1 className="text-xl sm:text-2xl font-black text-right bg-gradient-to-r from-emerald-800 to-teal-700 dark:from-emerald-400 dark:to-teal-500 bg-clip-text text-transparent font-display">
                  طلب صرف مرتبط بتقرير إنجاز
                </h1>
                <p className="text-[11px] sm:text-xs text-muted-foreground text-right font-semibold mt-0.5">
                  إنشاء طلب صرف معتمد على تقارير الإنجاز المدققة ومطابقتها مالياً بنظام تمام
                </p>
              </div>
            </div>
          </div>

          {/* Timeline Indicators */}
          <div className="max-w-md mx-auto w-full px-4 py-2" dir="rtl">
            <div className="relative flex items-center justify-between">
              {/* Connecting Line background */}
              <div className="absolute right-0 left-0 top-1/2 -translate-y-1/2 h-1 bg-slate-100 dark:bg-slate-800 rounded-full z-0" />
              {/* Connecting Active Line progress */}
              <div 
                className="absolute right-0 top-1/2 -translate-y-1/2 h-1 bg-gradient-to-l from-emerald-600 to-emerald-400 rounded-full z-0 transition-all duration-500 shadow-[0_0_8px_rgba(16,185,129,0.3)]"
                style={{ width: step === 1 ? '50%' : '100%' }}
              />

              {/* Step 1 Node */}
              <div className="flex flex-col items-center gap-2 z-10">
                <div 
                  className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs transition-all duration-300 ${
                    step >= 1 
                      ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/35 ring-4 ring-emerald-50 dark:ring-emerald-950/40' 
                      : 'bg-white border border-slate-200 text-slate-400'
                  }`}
                >
                  {step > 1 ? <CheckCircle className="w-5 h-5" /> : "١"}
                </div>
                <span className={`text-[10px] sm:text-xs font-bold transition-colors ${step >= 1 ? 'text-emerald-700 dark:text-emerald-400' : 'text-muted-foreground'}`}>
                  المشروع والتقرير
                </span>
              </div>

              {/* Step 2 Node */}
              <div className="flex flex-col items-center gap-2 z-10">
                <div 
                  className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs transition-all duration-300 ${
                    step === 2 
                      ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/35 ring-4 ring-emerald-50 dark:ring-emerald-950/40' 
                      : 'bg-slate-100 border border-slate-200 text-slate-400 dark:bg-slate-900 dark:border-slate-800'
                  }`}
                >
                  ٢
                </div>
                <span className={`text-[10px] sm:text-xs font-bold transition-colors ${step === 2 ? 'text-emerald-700 dark:text-emerald-400' : 'text-muted-foreground'}`}>
                  المطابقة والبيانات المالية
                </span>
              </div>
            </div>
          </div>
        </div>
        
        {step === 1 ? (
          /* الخطوة الأولى: اختيار المشروع وتقرير الإنجاز */
          <div className="max-w-3xl mx-auto space-y-6">
            <Card className="border-0 shadow-lg shadow-emerald-950/5 ring-1 ring-emerald-100/30 bg-white/70 backdrop-blur-md rounded-2xl overflow-hidden">
              <CardHeader className="text-right border-b border-emerald-50/50 dark:border-emerald-900/20 pb-4">
                <CardTitle className="flex items-center gap-2 justify-start flex-row-reverse text-right text-emerald-800 dark:text-emerald-400 text-lg font-bold">
                  <FileText className="h-5 w-5 text-emerald-600 dark:text-emerald-500" />
                  الخطوة 1: اختيار المشروع والتقرير المرتبط
                </CardTitle>
                <CardDescription className="text-right text-xs text-muted-foreground">اختر المشروع أولاً لعرض تقارير الإنجاز المعتمدة المرتبطة به</CardDescription>
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
                    <SelectTrigger className="text-right border-emerald-100/80 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 rounded-xl h-11 bg-background" dir="rtl">
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
                        <SelectTrigger className="text-right border-emerald-100/80 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 rounded-xl h-11 bg-background" dir="rtl">
                          <SelectValue placeholder="اختر تقرير إنجاز الدفعة لمراجعته" />
                        </SelectTrigger>
                        <SelectContent dir="rtl">
                          {approvedReports?.length === 0 ? (
                            <div className="p-2 text-center text-xs text-muted-foreground">لا توجد تقارير إنجاز معتمدة لهذا المشروع</div>
                          ) : (
                            approvedReports?.map((report: any) => (
                              <SelectItem key={report.id} value={report.id.toString()} className="text-right">
                                {report.reportNumber} - {report.title} ({report.actualProgress}%)
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                    </div>

                    {selectedReport && (
                      <div className="space-y-4 animate-slide-up text-right">
                        {/* Premium Glassmorphic Report Card */}
                        <div className="bg-gradient-to-br from-emerald-50/50 to-teal-50/30 dark:from-slate-900/60 dark:to-emerald-950/20 border border-emerald-100/60 dark:border-emerald-900/40 rounded-2xl p-5 shadow-sm space-y-4">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-emerald-100/30 dark:border-emerald-900/20 pb-3">
                            <div className="flex items-center gap-2.5 justify-start flex-row-reverse">
                              <div className="w-9 h-9 rounded-xl bg-emerald-500/10 dark:bg-emerald-400/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                                <FileText className="w-5 h-5" />
                              </div>
                              <div className="text-right">
                                <p className="text-xs text-muted-foreground font-semibold">تقرير إنجاز مرتبط</p>
                                <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200 mt-0.5">
                                  {selectedReport.reportNumber} — {selectedReport.title}
                                </h4>
                              </div>
                            </div>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="text-emerald-700 border-emerald-200 hover:bg-emerald-50 dark:text-emerald-400 dark:border-emerald-900 dark:hover:bg-emerald-950/30 font-bold h-9 text-xs px-3 rounded-xl mr-auto sm:mr-0 shrink-0"
                              onClick={() => setShowReportReviewDialog(true)}
                            >
                              <Eye className="ml-1.5 h-3.5 w-3.5" />
                              مراجعة وتدقيق التقرير
                            </Button>
                          </div>

                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-center sm:text-right">
                            <div className="bg-white/60 dark:bg-slate-900/40 p-3 rounded-xl border border-emerald-100/30 dark:border-emerald-900/10">
                              <span className="text-[10px] text-muted-foreground block font-semibold">تاريخ التقرير</span>
                              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 mt-1 block">
                                {new Date(selectedReport.reportDate).toLocaleDateString("ar-SA")}
                              </span>
                            </div>
                            <div className="bg-white/60 dark:bg-slate-900/40 p-3 rounded-xl border border-emerald-100/30 dark:border-emerald-900/10">
                              <span className="text-[10px] text-muted-foreground block font-semibold">الإنجاز الفعلي بالتقرير</span>
                              <span className="text-xs font-black text-emerald-600 dark:text-emerald-400 mt-1 block">
                                {selectedReport.actualProgress}%
                              </span>
                            </div>
                            <div className="bg-white/60 dark:bg-slate-900/40 p-3 rounded-xl border border-emerald-100/30 dark:border-emerald-900/10 col-span-2 sm:col-span-1">
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

                          <div className="p-3 bg-amber-50/40 dark:bg-amber-950/20 border border-amber-200/40 rounded-xl flex items-start gap-2.5">
                            <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-500 mt-0.5 shrink-0" />
                            <div className="space-y-0.5">
                              <p className="text-[10px] font-black text-amber-800 dark:text-amber-400">ملاحظة تنظيمية هامة</p>
                              <p className="text-[10px] leading-relaxed text-amber-700/90 dark:text-amber-300/80 font-medium">
                                يجب تدقيق ومطابقة المبالغ المطروحة بالخطوة التالية مع المنجزات الفعلية لضمان توافق دفعات العقد مع واقع العمل.
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
              <CardFooter className="border-t border-emerald-50/50 dark:border-emerald-900/20 pt-4 flex justify-end gap-2">
                <Button
                  onClick={() => setStep(2)}
                  disabled={!selectedReportId}
                  className="gradient-primary text-white font-bold px-6 h-11 rounded-xl shadow-md shadow-emerald-600/15"
                >
                  التالي
                  <ArrowLeft className="mr-2 h-4 w-4" />
                </Button>
              </CardFooter>
            </Card>
          </div>
        ) : (
          /* الخطوة الثانية: البيانات المالية وتحديد مبالغ الموردين */
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* البيانات المالية الأساسية */}
            <div className="lg:col-span-2 space-y-6 text-right">
              <Card className="border-0 shadow-lg shadow-emerald-950/5 ring-1 ring-emerald-100/30 rounded-2xl overflow-hidden bg-white/70 backdrop-blur-md">
                <CardHeader className="text-right border-b border-emerald-50/50 dark:border-emerald-900/20 pb-4">
                  <CardTitle className="flex items-center gap-2 justify-start flex-row-reverse text-right text-emerald-800 dark:text-emerald-400 text-lg font-bold">
                    <FileText className="h-5 w-5 text-emerald-600 dark:text-emerald-500" />
                    الخطوة 2: مراجعة الدفعات والمعلومات المالية
                  </CardTitle>
                  <CardDescription className="text-right text-xs">راجع تفاصيل المبالغ المحددة وحدد الدفعة الفعلية التي سوف تصرف</CardDescription>
                </CardHeader>
                <CardContent className="space-y-5 pt-6 text-right">
                  {/* عرض الدفعة المتفق عليها */}
                  {paymentInfo && (
                    <div className="p-5 rounded-2xl bg-gradient-to-br from-emerald-500/10 via-emerald-600/5 to-transparent border border-emerald-200/40 dark:border-emerald-900/30 text-right space-y-3 shadow-inner">
                      <div className="flex items-center gap-1.5 justify-start flex-row-reverse">
                        <div className="w-5 h-5 rounded-md bg-emerald-500/10 dark:bg-emerald-500/20 flex items-center justify-center text-emerald-700 dark:text-emerald-400">
                          <Info className="w-3.5 h-3.5" />
                        </div>
                        <Label className="text-xs font-black text-emerald-800 dark:text-emerald-400">الدفعة المتفق عليها مجدولة في العقد *</Label>
                      </div>
                      <div className="flex items-baseline gap-1.5 justify-start flex-row-reverse">
                        <span className="text-3xl font-black text-emerald-600 dark:text-emerald-400 leading-none">
                          {parseFloat(paymentInfo.amount || "0").toLocaleString()}
                        </span>
                        <span className="text-[10px] text-muted-foreground font-bold">ريال سعودي</span>
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold bg-white/40 dark:bg-slate-900/40 p-2.5 rounded-xl border border-emerald-100/10 mt-1">
                        <span className="text-muted-foreground block text-[9px] mb-0.5">وصف الدفعة المعتمد بملحق العقد:</span>
                        {paymentInfo.description}
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2 text-right">
                      <Label className="text-right text-xs font-bold text-slate-700 dark:text-slate-300">التاريخ الميلادي *</Label>
                      <Input
                        type="date"
                        value={formData.dateMiladi}
                        onChange={(e) => setFormData({ ...formData, dateMiladi: e.target.value })}
                        required
                        className="text-right border-emerald-100/80 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 rounded-xl h-10 font-medium"
                      />
                    </div>
                    
                    <div className="space-y-2 text-right">
                      <Label className="text-right text-xs font-bold text-slate-700 dark:text-slate-300">نسبة الإنجاز المرتبطة بالطلب (%) *</Label>
                      <Input
                        type="number"
                        min="1"
                        max="100"
                        required
                        value={formData.completionPercentage}
                        onChange={(e) => setFormData({ ...formData, completionPercentage: parseInt(e.target.value) || 0 })}
                        className="text-right border-emerald-100/80 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 rounded-xl h-10 font-bold text-emerald-700 dark:text-emerald-400"
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
                      className="text-right border-emerald-100/80 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 rounded-xl h-10 font-medium"
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
                      className="text-right border-emerald-100/80 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 rounded-xl text-xs leading-relaxed"
                    />
                  </div>
                </CardContent>
              </Card>

              {/* الموردون المستحقون للصرف الفعلي */}
              <Card className="border-0 shadow-lg shadow-emerald-950/5 ring-1 ring-emerald-100/30 rounded-2xl overflow-hidden bg-white/70 backdrop-blur-md">
                <CardHeader className="text-right border-b border-emerald-50/50 dark:border-emerald-900/20 pb-4">
                  <div className="flex items-center justify-between flex-row-reverse gap-4">
                    <div className="text-right">
                      <CardTitle className="flex items-center gap-2 justify-start flex-row-reverse text-right text-emerald-800 dark:text-emerald-400 text-lg font-bold">
                        <Building2 className="h-5 w-5 text-emerald-600 dark:text-emerald-500" />
                        الدفعة التي سوف تصرف (المستفيدين والمبالغ الفعلية)
                      </CardTitle>
                      <CardDescription className="text-right text-xs">حدد المبالغ الفعلية التي سوف تصرف وبيانات المستفيدين</CardDescription>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addSupplier}
                      className="text-emerald-700 border-emerald-300 hover:bg-emerald-50 dark:text-emerald-400 dark:border-emerald-900 dark:hover:bg-emerald-950/30 font-bold h-9 text-xs px-3 rounded-xl shrink-0"
                    >
                      <Plus className="ml-1.5 h-3.5 w-3.5" />
                      إضافة مستفيد آخر
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="space-y-6">
                    {suppliers.map((supplier, index) => (
                      <div key={supplier.id} className="p-5 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-900/20 relative space-y-5 text-right animate-slide-up hover:border-emerald-200/50 dark:hover:border-emerald-950/50 hover:shadow-sm transition-all duration-300">
                        {suppliers.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="absolute top-3 left-3 text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/20 h-8 w-8 rounded-full transition-colors"
                            onClick={() => removeSupplier(supplier.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                        
                        <div className="flex items-center gap-2 text-xs font-bold text-emerald-800 dark:text-emerald-400 justify-start flex-row-reverse border-b border-dashed border-slate-200/50 dark:border-slate-800 pb-2">
                          <Building2 className="w-4 h-4 text-emerald-600 dark:text-emerald-500" />
                          <span>المستفيد #{index + 1} (توزيع مستحقات الدفعة)</span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                          {/* اسم المورد */}
                          <div className="space-y-2 text-right">
                            <Label className="text-right text-xs font-bold text-slate-700 dark:text-slate-300">اسم المستفيد (المقاول/المورد) *</Label>
                            <Select
                              value={supplier.name}
                              onValueChange={(value) => handleSelectSupplier(supplier.id, value)}
                            >
                              <SelectTrigger className="text-right border-emerald-100/80 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 rounded-xl h-10 bg-background" dir="rtl">
                                <SelectValue placeholder="اختر المورد من القائمة" />
                              </SelectTrigger>
                              <SelectContent dir="rtl">
                                {allSuppliers?.map((s) => (
                                  <SelectItem key={s.id} value={s.name} className="text-right">
                                    {s.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          {/* الأعمال */}
                          <div className="space-y-2 text-right">
                            <Label className="text-right text-xs font-bold text-slate-700 dark:text-slate-300">بيان الأعمال / الدفعة *</Label>
                            <Input
                              value={supplier.work}
                              onChange={(e) => updateSupplier(supplier.id, "work", e.target.value)}
                              placeholder="مثال: الدفعة الأولى أو أعمال الخرسانة..."
                              required
                              className="text-right border-emerald-100/80 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 rounded-xl h-10 font-medium"
                            />
                          </div>

                          {/* البنك */}
                          <div className="space-y-2 text-right">
                            <Label className="text-right text-xs font-bold text-slate-700 dark:text-slate-300">اسم البنك *</Label>
                            <Select
                              value={supplier.bank}
                              onValueChange={(value) => updateSupplier(supplier.id, "bank", value)}
                            >
                              <SelectTrigger className="text-right border-emerald-100/80 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 rounded-xl h-10 bg-background" dir="rtl">
                                <SelectValue placeholder="اختر البنك" />
                              </SelectTrigger>
                              <SelectContent dir="rtl">
                                {banks?.map((b: any) => (
                                  <SelectItem key={b.id} value={b.valueAr || b.value} className="text-right">
                                    {b.valueAr || b.value}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          {/* الآيبان */}
                          <div className="space-y-2 text-right sm:col-span-2 lg:col-span-1">
                            <Label className="text-right text-xs font-bold text-slate-700 dark:text-slate-300">رقم الحساب أو الآيبان (IBAN) *</Label>
                            <Input
                              value={supplier.iban}
                              onChange={(e) => updateSupplier(supplier.id, "iban", e.target.value)}
                              placeholder="SA0000000000000000000000"
                              required
                              className="text-right border-emerald-100/80 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 rounded-xl h-10 font-mono"
                              dir="ltr"
                            />
                          </div>

                          {/* النسبة (%) */}
                          <div className="space-y-2 text-right">
                            <Label className="text-right text-xs font-bold text-slate-700 dark:text-slate-300 text-center block">النسبة من إجمالي العقد (%)</Label>
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
                              placeholder="0"
                              className="text-center font-bold text-emerald-700 dark:text-emerald-400 border-emerald-100/80 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 rounded-xl h-10 bg-background"
                            />
                          </div>

                          {/* المبلغ */}
                          <div className="space-y-2 text-right">
                            <Label className="text-right text-xs font-bold text-slate-700 dark:text-slate-300 text-center block">المبلغ الفعلي المصروف (ريال) *</Label>
                            <Input
                              type="number"
                              value={supplier.amount || ""}
                              onChange={(e) => updateSupplier(supplier.id, "amount", parseFloat(e.target.value) || 0)}
                              placeholder="0.00"
                              required
                              className="text-center font-black text-emerald-600 dark:text-emerald-400 border-emerald-100/80 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 rounded-xl h-10 bg-background"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Navigation Actions */}
              <div className="flex items-center justify-between border-t border-emerald-100/30 pt-4 flex-row-reverse">
                <Button
                  onClick={handleSubmit}
                  disabled={createMutation.isPending}
                  className="gradient-primary text-white font-bold px-8 h-11 rounded-xl shadow-md shadow-emerald-600/15"
                >
                  <Send className="ml-2 h-4 w-4" />
                  إرسال طلب الصرف للاعتماد
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setStep(1)}
                  className="text-emerald-700 border-emerald-200 hover:bg-emerald-50 dark:text-emerald-400 dark:border-emerald-900 dark:hover:bg-emerald-950/30 font-bold px-6 h-11 text-xs rounded-xl"
                >
                  <ArrowRight className="ml-2 h-4 w-4" />
                  السابق
                </Button>
              </div>
            </div>

            {/* Sidebar Summary */}
            <div className="space-y-6">
              <Card className="border-0 shadow-lg shadow-emerald-950/5 ring-1 ring-emerald-100/30 bg-white/70 backdrop-blur-md rounded-2xl overflow-hidden sticky top-6">
                <CardHeader className="text-right border-b border-emerald-50/50 dark:border-emerald-900/20 pb-4">
                  <CardTitle className="text-emerald-800 dark:text-emerald-400 text-base font-bold">ملخص الدفعة والتقرير</CardTitle>
                  <CardDescription className="text-xs text-muted-foreground">تفاصيل مالية مراجعة</CardDescription>
                </CardHeader>
                <CardContent className="pt-6 space-y-4 text-right">
                  <div className="space-y-1">
                    <p className="text-[10px] text-muted-foreground font-semibold">المشروع</p>
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-200 leading-snug">{projectDetails?.name || "المشروع المحدد"}</p>
                  </div>
                  
                  <Separator className="bg-emerald-50/30 dark:bg-emerald-900/20" />
                  
                  <div className="space-y-1">
                    <p className="text-[10px] text-muted-foreground font-semibold">رقم تقرير الإنجاز</p>
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-200">{selectedReport?.reportNumber || "لا يوجد"}</p>
                  </div>

                  <Separator className="bg-emerald-50/30 dark:bg-emerald-900/20" />

                  <div className="space-y-1">
                    <p className="text-[10px] text-muted-foreground font-semibold">الدفعة المتفق عليها (العقد)</p>
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      {paymentInfo ? `${parseFloat(paymentInfo.amount || "0").toLocaleString()} ريال` : "غير محدد"}
                    </p>
                  </div>

                  <Separator className="bg-emerald-50/30 dark:bg-emerald-900/20" />

                  {/* Stunning Total Paid Badge */}
                  <div className="space-y-1 p-4 bg-gradient-to-br from-emerald-600 to-teal-600 text-white rounded-2xl shadow-md shadow-emerald-600/15 relative overflow-hidden">
                    <div className="absolute -right-6 -bottom-6 w-20 h-20 bg-white/5 rounded-full blur-xl animate-pulse" />
                    <div className="absolute -left-4 -top-4 w-12 h-12 bg-white/10 rounded-full blur-lg" />
                    <p className="text-[10px] text-white/80 font-bold relative z-10">إجمالي الدفعة الفعلية المصروفة</p>
                    <p className="text-2xl font-black mt-1 leading-none relative z-10">
                      {totalAmount.toLocaleString()} <span className="text-xs font-bold">ريال</span>
                    </p>
                  </div>

                  {contractDetails && (
                    <>
                      <Separator className="bg-emerald-50/30 dark:bg-emerald-900/20" />
                      <div className="space-y-2 pt-1">
                        <div className="flex justify-between flex-row-reverse text-xs">
                          <span className="text-muted-foreground font-semibold">مبلغ العقد الإجمالي</span>
                          <span className="font-bold text-slate-700 dark:text-slate-300">{contractAmount.toLocaleString()} ريال</span>
                        </div>
                        <div className="flex justify-between flex-row-reverse text-xs">
                          <span className="text-rose-600 dark:text-rose-400 font-semibold">إجمالي المصروف سابقاً</span>
                          <span className="font-bold text-rose-600 dark:text-rose-400">{totalPaymentsSum.toLocaleString()} ريال</span>
                        </div>
                        <div className="flex justify-between flex-row-reverse text-xs pt-1.5 border-t border-dashed border-slate-200 dark:border-slate-800">
                          <span className="text-emerald-700 dark:text-emerald-400 font-black">المتبقي للصرف</span>
                          <span className="font-black text-emerald-700 dark:text-emerald-400">{remainingAmount.toLocaleString()} ريال</span>
                        </div>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>

      {/* نافذة مراجعة تقرير الإنجاز */}
      <Dialog open={showReportReviewDialog} onOpenChange={setShowReportReviewDialog}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto" dir="rtl">
          <DialogHeader className="text-right">
            <DialogTitle className="text-right text-emerald-800 font-bold">مراجعة تقرير الإنجاز المعتمد</DialogTitle>
            <DialogDescription className="text-right text-xs">
              {selectedReport?.reportNumber} - {selectedReport?.title}
            </DialogDescription>
          </DialogHeader>
          
          {selectedReport && (
            <div className="space-y-6 py-4 text-right">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">تاريخ التقرير</p>
                  <p className="text-sm font-semibold">{new Date(selectedReport.reportDate).toLocaleDateString("ar-SA")}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">معد التقرير</p>
                  <p className="text-sm font-semibold">{selectedReport.createdByName}</p>
                </div>
              </div>
              
              <Separator />
              
              <div className="space-y-3">
                <h3 className="font-bold text-sm text-slate-800">نسب الإنجاز</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div className="p-3 bg-muted rounded-lg text-center">
                    <p className="text-2xl font-bold">{selectedReport.overallProgress}%</p>
                    <p className="text-xs text-muted-foreground">الإجمالي</p>
                  </div>
                  <div className="p-3 bg-blue-50 rounded-lg text-center">
                    <p className="text-2xl font-bold text-blue-700">{selectedReport.plannedProgress}%</p>
                    <p className="text-xs text-blue-600">المخطط</p>
                  </div>
                  <div className="p-3 bg-green-50 rounded-lg text-center">
                    <p className="text-2xl font-bold text-green-700">{selectedReport.actualProgress}%</p>
                    <p className="text-xs text-green-600">الفعلي</p>
                  </div>
                </div>
              </div>
              
              <Separator />
              
              {!!selectedReport.workSummary && (
                <div className="space-y-1.5">
                  <h3 className="font-bold text-sm text-slate-800">الأعمال المنجزة</h3>
                  <p className="text-xs text-muted-foreground whitespace-pre-wrap leading-relaxed">
                    {selectedReport.workSummary as string}
                  </p>
                </div>
              )}
              
              {!!selectedReport.challenges && (
                <div className="space-y-1.5">
                  <h3 className="font-bold text-sm text-slate-800">التحديات والمعوقات</h3>
                  <p className="text-xs text-muted-foreground whitespace-pre-wrap leading-relaxed">
                    {selectedReport.challenges as string}
                  </p>
                </div>
              )}

              {!!selectedReport.photos && (() => {
                try {
                  let photosArr = selectedReport.photos;
                  while (typeof photosArr === 'string') {
                    photosArr = JSON.parse(photosArr);
                  }
                  
                  if (Array.isArray(photosArr) && photosArr.length > 0) {
                    return (
                      <div className="space-y-3">
                        <Separator />
                        <h3 className="font-bold text-sm flex items-center gap-2">
                          <FileText className="w-4 h-4 text-emerald-600" />
                          مرفقات التقرير
                        </h3>
                        <div className="grid grid-cols-3 gap-3">
                          {photosArr.map((photo: string, index: number) => {
                            const isImage = photo.startsWith("data:image/") || photo.startsWith("http") && (photo.endsWith(".png") || photo.endsWith(".jpg") || photo.endsWith(".jpeg") || photo.endsWith(".webp"));
                            return (
                              <div key={index} className="border rounded-lg p-2 flex flex-col items-center justify-center bg-muted/20 relative group">
                                {isImage ? (
                                  <img src={photo} alt={`مرفق ${index + 1}`} className="w-full h-20 object-cover rounded-md mb-2" />
                                ) : (
                                  <div className="w-full h-20 flex items-center justify-center rounded-md bg-background border border-dashed mb-2 text-emerald-800 font-bold text-xs">
                                    مستند PDF
                                  </div>
                                )}
                                <a href={photo} download={`مرفق_${index + 1}`} className="text-[10px] text-emerald-700 font-semibold hover:underline">
                                  تحميل المرفق
                                </a>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  }
                } catch (e) {
                  console.error(e);
                }
                return null;
              })()}
            </div>
          )}
          
          <DialogFooter className="text-right border-t pt-4">
            <Button variant="outline" onClick={() => setShowReportReviewDialog(false)} className="text-xs h-9">
              إغلاق
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
