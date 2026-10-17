import { useState, useEffect, useMemo, useRef } from "react";
import { useLocation, useParams } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { numberToArabicText as baseNumberToArabicText } from "@shared/tafqeet";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowRight,
  FileSpreadsheet,
  FileText,
  Upload,
  X,
  Building2,
  Lock,
  ShieldCheck,
  Check,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";

function numberToArabicText(num: number): string {
  return baseNumberToArabicText(num, { prefix: "", suffix: " فقط لا غير", currency: "ريال سعودي" });
}

const compressImage = (
  base64: string,
  maxImageDimension = 800,
  imageQuality = 0.5
): Promise<{ base64: string; size: number }> => {
  return new Promise((resolve) => {
    const img = new window.Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      let width = img.width;
      let height = img.height;
      const maxDimension = maxImageDimension;

      if (width > maxDimension || height > maxDimension) {
        if (width > height) {
          height = Math.round((height * maxDimension) / width);
          width = maxDimension;
        } else {
          width = Math.round((width * maxDimension) / height);
          height = maxDimension;
        }
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.fillStyle = "#FFFFFF";
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);
      }
      const compressed = canvas.toDataURL("image/jpeg", imageQuality);
      const head = "data:image/jpeg;base64,";
      const sizeInBytes = Math.round(((compressed.length - head.length) * 3) / 4);
      resolve({ base64: compressed, size: sizeInBytes });
    };
    img.onerror = () => {
      const head = base64.indexOf(",");
      const sizeInBytes = head > -1 ? Math.round(((base64.length - head) * 3) / 4) : base64.length;
      resolve({ base64, size: sizeInBytes });
    };
    img.src = base64;
  });
};

const uploadFile = async (fileObj: { name: string; size: number; base64: string; type: string }): Promise<string> => {
  try {
    const byteString = atob(fileObj.base64.split(",")[1]);
    const mimeString = fileObj.base64.split(",")[0].split(":")[1].split(";")[0];
    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);
    for (let i = 0; i < byteString.length; i++) {
      ia[i] = byteString.charCodeAt(i);
    }
    const blob = new Blob([ab], { type: mimeString });
    const file = new File([blob], fileObj.name, { type: mimeString });

    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch("/api/upload", {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`فشل رفع الملف: ${errText}`);
    }

    const data = await response.json();
    return data.url;
  } catch (err: any) {
    throw new Error(err.message || `حدث خطأ أثناء معالجة الملف ${fileObj.name}`);
  }
};

export default function NewMilestoneRequest({ params: propParams }: { params?: { id?: string; projectId?: string } } = {}) {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const routeParams = useParams<{ id?: string; projectId?: string }>();
  const utils = trpc.useUtils();

  const effectiveProjectId = parseInt(propParams?.id || propParams?.projectId || routeParams.id || routeParams.projectId || "0") || 0;

  // جلب تفاصيل المشروع
  const { data: projectDetails } = trpc.projects.getById.useQuery(
    { id: effectiveProjectId },
    { enabled: effectiveProjectId > 0 }
  );

  // جلب عقود المشروع
  const { data: projectContractsData } = trpc.contracts.list.useQuery(
    { projectId: effectiveProjectId },
    { enabled: effectiveProjectId > 0 }
  );

  const contractsList = projectContractsData?.contracts || [];

  // حالة حقول نموذج المستخلص (مطابقة لـ ProgressReports)
  const [selectedContractId, setSelectedContractId] = useState<number | null>(null);
  const [invoiceTitle, setInvoiceTitle] = useState("");
  const [invoicePercentage, setInvoicePercentage] = useState<number>(0);
  const [invoiceWorkDone, setInvoiceWorkDone] = useState("");
  const [invoiceRecommendations, setInvoiceRecommendations] = useState("");
  const [uploadedFiles, setUploadedFiles] = useState<{ name: string; size: number; base64: string; type: string }[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const invoiceFileInputRef = useRef<HTMLInputElement>(null);

  // التحديد التلقائي للعقد
  useEffect(() => {
    if (contractsList.length > 0 && !selectedContractId) {
      const milestoneContract = contractsList.find((c: any) => {
        if (c.paymentSystem === "milestones") return true;
        if (c.paymentScheduleJson) {
          try {
            const p = typeof c.paymentScheduleJson === "string" ? JSON.parse(c.paymentScheduleJson) : c.paymentScheduleJson;
            if (p?.paymentSystem === "milestones") return true;
          } catch (e) {}
        }
        return false;
      });
      setSelectedContractId(milestoneContract ? milestoneContract.id : contractsList[0].id);
    }
  }, [contractsList, selectedContractId]);

  // التحديد التلقائي لعنوان المستخلص
  useEffect(() => {
    if (!invoiceTitle && projectDetails?.name) {
      setInvoiceTitle(`مستخلص إنجاز - ${projectDetails.name}`);
    }
  }, [projectDetails, invoiceTitle]);

  const projectBudget = useMemo(() => {
    if (!projectDetails?.budget) return 0;
    return parseFloat(String(projectDetails.budget).replace(/,/g, "")) || 0;
  }, [projectDetails]);

  const selectedContract = useMemo(() => {
    if (contractsList.length > 0) {
      if (selectedContractId) {
        const found = contractsList.find((c: any) => c.id === selectedContractId);
        if (found) return found;
      }
      return contractsList[0];
    }
    return {
      id: 0,
      contractNumber: `CNT-PRJ-${effectiveProjectId}`,
      secondPartyName: "المقاول المنفذ للمشروع",
      contractAmount: String(projectBudget || 0),
    };
  }, [contractsList, selectedContractId, effectiveProjectId, projectBudget]);

  const selectedContractAmount = contractsList.length > 0
    ? (parseFloat(String(selectedContract?.contractAmount || (selectedContract as any)?.amount || "0").replace(/,/g, "")) || 0)
    : (projectBudget || 0);

  const paidPaymentsSum = useMemo(() => {
    return (projectDetails?.payments || []).reduce((sum: number, p: any) => {
      const amt = parseFloat(String(p.paidAmount !== undefined && p.paidAmount !== null ? p.paidAmount : ((p.status === "paid" || p.status === "executed" || !!p.paidAt) ? p.amount : 0)).replace(/,/g, ""));
      return sum + (isNaN(amt) ? 0 : amt);
    }, 0);
  }, [projectDetails?.payments]);

  const isProjectFullyPaid = selectedContractAmount > 0 && paidPaymentsSum >= (selectedContractAmount - 0.05);

  const calculatedInvoicePayout = selectedContractAmount > 0 && invoicePercentage > 0
    ? (selectedContractAmount * invoicePercentage) / 100
    : 0;

  // رفع الملفات وضغطها والتحقق منها
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const filesList = e.target.files;
    if (!filesList) return;

    const currentTotalSize = uploadedFiles.reduce((sum, f) => sum + f.size, 0);
    let runningTotalSize = currentTotalSize;
    const maxTotalSizeBytes = 10 * 1024 * 1024; // 10MB

    const newFiles = Array.from(filesList);
    setIsSubmitting(true);

    try {
      for (const file of newFiles) {
        const fileName = file.name;
        const ext = fileName.split('.').pop()?.toLowerCase();

        const isHeic = ext === "heic" || ext === "heif" || file.type === "image/heic" || file.type === "image/heif";
        if (isHeic) {
          toast.error(`عذراً، صيغة الملف HEIC/HEIF غير مدعومة.`);
          continue;
        }

        const forbiddenExts = ['exe', 'bat', 'cmd', 'sh', 'msi', 'scr', 'pif', 'com', 'hta', 'vbs', 'js', 'jar', 'vbe', 'jse', 'wsf', 'wsh', 'ps1'];
        if (forbiddenExts.includes(ext || '')) {
          toast.error(`امتداد الملف .${ext} غير مسموح به لأسباب أمنية.`);
          continue;
        }

        const isImage = file.type.startsWith("image/");
        const isPdf = file.type === "application/pdf" || ext === "pdf";

        if (!isImage && !isPdf) {
          toast.error(`الملف ${fileName} غير مدعوم، يرجى رفع صور أو ملفات PDF فقط.`);
          continue;
        }

        const reader = new FileReader();
        const base64Data = await new Promise<string>((resolve, reject) => {
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });

        let finalBase64 = base64Data;
        let finalSize = file.size;

        if (isImage) {
          const comp = await compressImage(base64Data, 1000, 0.6);
          finalBase64 = comp.base64;
          finalSize = comp.size;
        }

        if (runningTotalSize + finalSize > maxTotalSizeBytes) {
          toast.error(`تجاوز الحجم الإجمالي المسموح للمرفقات (10 ميجابايت).`);
          break;
        }

        runningTotalSize += finalSize;
        setUploadedFiles(prev => [
          ...prev,
          {
            name: fileName,
            size: finalSize,
            base64: finalBase64,
            type: file.type || (isPdf ? "application/pdf" : "image/jpeg"),
          }
        ]);
      }
    } catch (err: any) {
      toast.error(err.message || "حدث خطأ أثناء معالجة المرفقات");
    } finally {
      setIsSubmitting(false);
      if (invoiceFileInputRef.current) {
        invoiceFileInputRef.current.value = "";
      }
    }
  };

  // طفرة إنشاء تقرير المستخلص
  const createMutation = trpc.progressReports.create.useMutation({
    onSuccess: () => {
      toast.success("تم رفع المستخلص المالي بنجاح وإرساله للاعتماد");
      utils.progressReports.invalidate();
      utils.projects.invalidate();
      navigate(`/projects/${effectiveProjectId}`);
    },
    onError: (error) => {
      toast.error(error.message || "حدث خطأ أثناء رفع المستخلص");
    },
  });

  const handleCreateInvoice = async () => {
    if (!effectiveProjectId) {
      toast.error("معرف المشروع غير محدد");
      return;
    }
    if (!invoiceTitle.trim()) {
      toast.error("يرجى إدخال عنوان المستخلص");
      return;
    }
    if (!invoicePercentage || invoicePercentage <= 0 || invoicePercentage > 100) {
      toast.error("يرجى إدخال نسبة إنجاز صحيحة بين 1% و 100%");
      return;
    }
    if (!invoiceWorkDone.trim()) {
      toast.error("يرجى إدخال وصف الأعمال المنجزة");
      return;
    }

    setIsSubmitting(true);
    try {
      const uploadedUrls: string[] = [];
      for (const fileObj of uploadedFiles) {
        if (fileObj.base64.startsWith("data:")) {
          try {
            const url = await uploadFile(fileObj);
            uploadedUrls.push(url);
          } catch (uploadErr: any) {
            toast.error(uploadErr.message || `حدث خطأ أثناء رفع الملف ${fileObj.name}`);
            setIsSubmitting(false);
            return;
          }
        } else {
          uploadedUrls.push(fileObj.base64);
        }
      }

      const combinedWorkSummary = [
        `[نوع: مستخلص إنجاز مالي]`,
        `[معرف العقد: ${selectedContract?.id || 0}]`,
        `[رقم العقد: ${selectedContract?.contractNumber || selectedContract?.id || `CNT-PRJ-${effectiveProjectId}`}]`,
        `[قيمة العقد: ${selectedContractAmount}]`,
        `[نسبة الإنجاز: ${invoicePercentage}%]`,
        `[المبلغ المستحق: ${calculatedInvoicePayout}]`,
        invoiceWorkDone.trim() ? `\nوصف الأعمال المنجزة:\n${invoiceWorkDone.trim()}` : ""
      ].filter(Boolean).join("\n");

      await createMutation.mutateAsync({
        projectId: effectiveProjectId,
        title: invoiceTitle.trim(),
        reportDate: new Intl.DateTimeFormat('en-CA', { year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date()),
        overallProgress: invoicePercentage,
        plannedProgress: invoicePercentage,
        actualProgress: invoicePercentage,
        workSummary: combinedWorkSummary,
        recommendations: invoiceRecommendations.trim(),
        budgetSpent: String(calculatedInvoicePayout),
        budgetRemaining: String(Math.max(0, selectedContractAmount - calculatedInvoicePayout)),
        photos: uploadedUrls,
      });
    } catch (err: any) {
      console.error("Error creating project invoice:", err);
      toast.error(err.message || "حدث خطأ أثناء حفظ المستخلص");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReturnToProject = () => {
    navigate(`/projects/${effectiveProjectId}`);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-4xl mx-auto text-right font-sans" dir="rtl">
        {/* Page Header - مطابق تماماً لـ ProgressReports */}
        <div className="flex items-center justify-between border-b pb-4">
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="icon"
              onClick={handleReturnToProject}
              className="rounded-full hover:bg-muted"
              title="العودة لصفحة المشروع"
            >
              <ArrowRight className="w-4 h-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                <FileSpreadsheet className="w-6 h-6 text-emerald-600" />
                إنشاء مستخلص إنجاز مالي جديد
              </h1>
              <p className="text-sm text-muted-foreground">
                رفع مستخلص مرتبط بعقد بنظام المستخلصات وفق نسبة الإنجاز الفعلي لإصدار أمر الصرف
              </p>
            </div>
          </div>
        </div>

        {isProjectFullyPaid && (
          <div className="bg-amber-500/10 border-2 border-amber-500/30 rounded-2xl p-5 flex items-start gap-3.5 text-amber-900 dark:text-amber-200">
            <AlertCircle className="w-6 h-6 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h4 className="font-bold text-sm">تم سداد كامل قيمة العقد للمشروع</h4>
              <p className="text-xs text-amber-800 dark:text-amber-300 leading-relaxed">
                تم سداد كامل مستحقات العقد المالي لهذا المشروع بقيمة إجمالية مسددة بلغت ({paidPaymentsSum.toLocaleString()} ر.س) من أصل ({selectedContractAmount.toLocaleString()} ر.س). لذلك لا يمكن رفع مستخلصات جديدة.
              </p>
            </div>
          </div>
        )}

        {/* Form Body - مطابق تماماً لبطاقات ProgressReports */}
        <div className="grid grid-cols-1 gap-6">
          {/* Card 1: المشروع المرتبط */}
          <Card className="border-border/60 shadow-sm">
            <CardHeader className="bg-muted/30 border-b border-border/40 py-4">
              <CardTitle className="text-base font-bold flex items-center gap-2 text-foreground">
                <Building2 className="w-4.5 h-4.5 text-primary" />
                المشروع والعقد المرتبط بالمستخلص
              </CardTitle>
              <CardDescription>
                المشروع المحدد لإنشاء المستخلص المالي والعقد المرتبط به
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label className="font-semibold text-foreground flex items-center justify-between">
                    <span>المشروع <span className="text-red-500">*</span></span>
                    <span className="text-xs text-amber-700 dark:text-amber-400 flex items-center gap-1 font-normal">
                      <Lock className="w-3 h-3" />
                      مرتبط بصفحة المشروع الحالي
                    </span>
                  </Label>
                  <Input
                    readOnly
                    disabled
                    value={
                      projectDetails
                        ? `${projectDetails.name} (${projectDetails.projectNumber || `PRJ-${projectDetails.id}`})`
                        : `مشروع #${effectiveProjectId}`
                    }
                    className="bg-muted/40 font-bold text-foreground cursor-not-allowed"
                  />
                </div>

                {/* في حال وجود أكثر من عقد للمشروع */}
                {contractsList.length > 1 && (
                  <div className="space-y-2 pt-2">
                    <Label className="font-semibold text-foreground text-xs flex items-center justify-between">
                      <span>العقد المالي المرتبط بالمشروع</span>
                    </Label>
                    <Select
                      value={selectedContractId ? String(selectedContractId) : ""}
                      onValueChange={(val) => setSelectedContractId(parseInt(val) || null)}
                    >
                      <SelectTrigger className="w-full text-right text-xs">
                        <SelectValue placeholder="اختر العقد المرتبط..." />
                      </SelectTrigger>
                      <SelectContent className="max-h-56">
                        {contractsList.map((c: any) => (
                          <SelectItem key={c.id} value={String(c.id)}>
                            رقم العقد: {c.contractNumber || c.id} - الطرف الثاني: {c.secondPartyName || "غير محدد"} ({(parseFloat(String(c.contractAmount || "0").replace(/,/g, "")) || 0).toLocaleString("en-US")} ر.س)
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Card 2: بيانات المستخلص ونسبة الإنجاز */}
          <Card className="border-border/60 shadow-sm">
            <CardHeader className="bg-muted/30 border-b border-border/40 py-4">
              <CardTitle className="text-base font-bold flex items-center gap-2 text-foreground">
                <FileSpreadsheet className="w-4.5 h-4.5 text-emerald-600" />
                بيانات المستخلص ونسبة الإنجاز
              </CardTitle>
              <CardDescription>
                أدخل عنوان المستخلص ونسبة الإنجاز الفعلي ووصف الأعمال المنجزة
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="font-semibold text-foreground">عنوان المستخلص <span className="text-red-500">*</span></Label>
                  <Input
                    placeholder="مثال: مستخلص الأعمال الترابية والهيكلية - الدفعة الأولى"
                    value={invoiceTitle}
                    onChange={(e) => setInvoiceTitle(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label className="font-semibold text-foreground">نسبة الإنجاز الفعلي (%) <span className="text-red-500">*</span></Label>
                  <div className="relative">
                    <Input
                      type="number"
                      min={1}
                      max={100}
                      step={1}
                      placeholder="مثال: 50"
                      value={invoicePercentage || ""}
                      onChange={(e) => {
                        const val = Math.min(100, Math.max(0, parseFloat(e.target.value) || 0));
                        setInvoicePercentage(val);
                      }}
                      className="pl-8 text-left font-mono"
                    />
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-bold">%</span>
                  </div>
                </div>
              </div>

              {/* وصف الأعمال المنجزة */}
              <div className="space-y-2">
                <Label className="font-semibold text-foreground">وصف الأعمال المنجزة <span className="text-red-500">*</span></Label>
                <Textarea
                  rows={4}
                  placeholder="اكتب وصفاً مفصلاً لكافة الأعمال والبنود والمواصفات التي تم إنجازها على أرض الواقع خلال هذه المرحلة..."
                  value={invoiceWorkDone}
                  onChange={(e) => setInvoiceWorkDone(e.target.value)}
                  className="resize-none leading-relaxed"
                />
              </div>
            </CardContent>
          </Card>

          {/* Card 3: المرفقات والمستندات الثبوتية */}
          <Card className="border-border/60 shadow-sm">
            <CardHeader className="bg-muted/30 border-b border-border/40 py-4">
              <CardTitle className="text-base font-bold flex items-center gap-2 text-foreground">
                <Upload className="w-4.5 h-4.5 text-primary" />
                المرفقات والمستندات الثبوتية
              </CardTitle>
              <CardDescription>
                ارفق صور التوثيق الميداني للأعمال المنجزة أو تقارير الفحص أو فواتير المقاول (حتى 10 ميجابايت)
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              <div
                onClick={() => invoiceFileInputRef.current?.click()}
                className="border-2 border-dashed border-border/80 hover:border-primary/60 rounded-xl p-6 text-center cursor-pointer transition-all hover:bg-muted/20"
              >
                <input
                  type="file"
                  ref={invoiceFileInputRef}
                  onChange={handleFileChange}
                  multiple
                  accept="image/*,application/pdf"
                  className="hidden"
                />
                <div className="flex flex-col items-center gap-2">
                  <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                    <Upload className="w-6 h-6" />
                  </div>
                  <p className="font-bold text-sm text-foreground">اضغط هنا لرفع الملفات أو اسحبها وأفلتها</p>
                  <p className="text-xs text-muted-foreground">يدعم الصور (PNG, JPG, WEBP) وملفات PDF بحد أقصى 10 ميجابايت إجمالي</p>
                </div>
              </div>

              {uploadedFiles.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground font-semibold">الملفات المرفوعة ({uploadedFiles.length}):</Label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {uploadedFiles.map((file, idx) => (
                      <div key={idx} className="flex items-center justify-between p-2.5 rounded-lg border bg-muted/30 text-xs">
                        <div className="flex items-center gap-2 truncate">
                          <FileText className="w-4 h-4 text-primary flex-shrink-0" />
                          <span className="truncate font-medium">{file.name}</span>
                          <span className="text-muted-foreground text-[10px]">({(file.size / 1024).toFixed(1)} ك.ب)</span>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="w-6 h-6 text-destructive hover:bg-destructive/10 rounded-full"
                          onClick={() => setUploadedFiles(prev => prev.filter((_, i) => i !== idx))}
                        >
                          <X className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>


          {/* Actions bar - مطابق تماماً لـ ProgressReports */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={handleReturnToProject}
            >
              إلغاء
            </Button>
            <Button
              type="button"
              onClick={handleCreateInvoice}
              disabled={
                isSubmitting ||
                createMutation.isPending ||
                isProjectFullyPaid ||
                !effectiveProjectId ||
                !invoiceTitle.trim() ||
                !invoicePercentage ||
                invoicePercentage <= 0 ||
                invoicePercentage > 100 ||
                !invoiceWorkDone.trim()
              }
              className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold px-8 shadow-sm"
            >
              {isSubmitting || createMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                  جاري حفظ وإنشاء المستخلص...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4 ml-2" />
                  حفظ وإنشاء المستخلص
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
