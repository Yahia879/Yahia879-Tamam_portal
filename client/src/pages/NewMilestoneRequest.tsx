import { useState, useEffect, useMemo, useRef } from "react";
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
  Upload,
  X,
  Building2,
  Lock,
  ShieldCheck,
  CheckCircle2,
  Loader2,
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
      ctx?.drawImage(img, 0, 0, width, height);

      const compressedBase64 = canvas.toDataURL("image/webp", imageQuality);
      const justBase64 = compressedBase64.split(",")[1];
      const approxSize = Math.round((justBase64.length * 3) / 4);

      resolve({
        base64: compressedBase64,
        size: approxSize,
      });
    };
    img.onerror = () => {
      resolve({
        base64,
        size: Math.round((base64.split(",")[1]?.length * 3) / 4 || 0),
      });
    };
    img.src = base64;
  });
};

const uploadFile = async (fileObj: { name: string; base64: string }): Promise<string> => {
  if (!fileObj.base64.startsWith("data:")) {
    return fileObj.base64;
  }

  try {
    const parts = fileObj.base64.split(",");
    const mime = parts[0].match(/:(.*?);/)?.[1] || "application/octet-stream";
    const bstr = atob(parts[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);

    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }

    const file = new File([u8arr], fileObj.name, { type: mime });
    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch("/api/upload?folder=progress-reports", {
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
  const { data: projectDetails, isLoading: isProjectLoading } = trpc.projects.getById.useQuery(
    { id: effectiveProjectId },
    { enabled: effectiveProjectId > 0 }
  );

  // جلب عقود المشروع
  const { data: projectContractsData, isLoading: isContractsLoading } = trpc.contracts.list.useQuery(
    { projectId: effectiveProjectId },
    { enabled: effectiveProjectId > 0 }
  );

  const contractsList = projectContractsData?.contracts || [];

  // حالة حقول نموذج المستخلص
  const [selectedContractId, setSelectedContractId] = useState<number | null>(null);
  const [invoiceTitle, setInvoiceTitle] = useState("");
  const [invoicePercentage, setInvoicePercentage] = useState<number>(0);
  const [invoiceWorkDone, setInvoiceWorkDone] = useState("");
  const [invoiceRecommendations, setInvoiceRecommendations] = useState("");
  const [uploadedFiles, setUploadedFiles] = useState<{ name: string; size: number; base64: string; type: string }[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // التحديد التلقائي للعقد المالي عند تحميل العقود
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

  // التحديد التلقائي لعنوان المستخلص بناءً على اسم المشروع
  useEffect(() => {
    if (projectDetails?.name && !invoiceTitle) {
      setInvoiceTitle(`مستخلص إنجاز - ${projectDetails.name}`);
    }
  }, [projectDetails, invoiceTitle]);

  // إدارة قيمة العقد والميزانية المعتمدة
  const projectBudget = parseFloat(String(projectDetails?.budget || projectDetails?.actualCost || (projectDetails as any)?.request?.approvedBudget || "0").replace(/,/g, "")) || 0;
  const [customContractAmount, setCustomContractAmount] = useState<number>(0);

  useEffect(() => {
    if (projectBudget > 0 && customContractAmount === 0) {
      setCustomContractAmount(projectBudget);
    }
  }, [projectBudget, customContractAmount]);

  const fallbackContract = useMemo(() => {
    if (contractsList.length > 0) return null;
    return {
      id: 0,
      contractNumber: `CNT-PRJ-${effectiveProjectId}`,
      secondPartyName: "المقاول المنفذ للمشروع",
      contractAmount: String(customContractAmount || projectBudget || 0),
    };
  }, [contractsList, effectiveProjectId, customContractAmount, projectBudget]);

  // العقد المحدد وحساب الدفعة المالية
  const selectedContract = useMemo(() => {
    if (contractsList.length > 0) {
      if (selectedContractId) {
        const found = contractsList.find((c: any) => c.id === selectedContractId);
        if (found) return found;
      }
      return contractsList[0];
    }
    return fallbackContract;
  }, [contractsList, selectedContractId, fallbackContract]);

  const selectedContractAmount = contractsList.length > 0
    ? (parseFloat(String(selectedContract?.contractAmount || (selectedContract as any)?.amount || "0").replace(/,/g, "")) || 0)
    : (customContractAmount || projectBudget || 0);

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
          toast.error(`عذراً، صيغة الملف HEIC/HEIF (الخاصة بأجهزة آيفون) غير مدعومة.`);
          continue;
        }

        const forbiddenExts = ['exe', 'bat', 'cmd', 'sh', 'msi', 'scr', 'pif', 'com', 'hta', 'vbs', 'js', 'jar', 'vbe', 'jse', 'wsf', 'wsh', 'ps1'];
        if (forbiddenExts.includes(ext || '')) {
          toast.error(`عذراً، لا يُسمح برفع الملفات التنفيذية (${fileName}) لحماية خوادم النظام.`);
          continue;
        }

        const base64Data = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });

        let finalBase64 = base64Data;
        let finalSize = file.size;
        let finalType = file.type;
        let finalName = file.name;

        if (file.type.startsWith("image/") && file.type !== "image/gif") {
          try {
            const compressed = await compressImage(base64Data, 800, 0.5);
            finalBase64 = compressed.base64;
            finalSize = compressed.size;
            finalType = "image/webp";
            finalName = file.name.replace(/\.[^/.]+$/, "") + ".webp";
          } catch (compressErr) {
            console.error("خطأ أثناء ضغط الصورة:", compressErr);
          }
        }

        if (runningTotalSize + finalSize > maxTotalSizeBytes) {
          toast.error(`إجمالي حجم الملفات المرفقة يتجاوز الحد الأقصى المسموح به (10 ميجابايت).`);
          break;
        }

        runningTotalSize += finalSize;

        setUploadedFiles(prev => {
          if (prev.some(f => f.name === finalName)) return prev;
          return [...prev, {
            name: finalName,
            size: finalSize,
            base64: finalBase64,
            type: finalType
          }];
        });
      }
    } catch (err) {
      console.error("خطأ أثناء قراءة الملفات:", err);
      toast.error("حدث خطأ أثناء تحميل الملفات.");
    } finally {
      setIsSubmitting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
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

  const handleSubmit = async () => {
    if (!effectiveProjectId) {
      toast.error("معرف المشروع غير محدد");
      return;
    }
    if (!selectedContract && selectedContractAmount <= 0) {
      toast.error("يرجى تحديد القيمة المالية للعقد أو ميزانية المشروع");
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
      <div className="space-y-6 max-w-5xl mx-auto pb-16 text-right font-sans" dir="rtl">
        {/* شريط المسار والرجوع */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border/40">
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleReturnToProject}
              className="gap-1.5 rounded-xl border-border hover:bg-muted/60 text-xs font-bold"
            >
              <ArrowRight className="w-4 h-4 ml-1" />
              <span>العودة لصفحة المشروع</span>
            </Button>
            <span className="text-muted-foreground text-xs">/</span>
            <span className="text-xs font-bold text-foreground truncate max-w-xs sm:max-w-md">
              {projectDetails?.name || `مشروع #${effectiveProjectId}`}
            </span>
            <span className="text-muted-foreground text-xs">/</span>
            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
              رفع مستخلص مالي جديد
            </span>
          </div>

          <Badge variant="outline" className="bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300 font-bold text-xs w-fit">
            نظام المستخلصات المالية للمشروع
          </Badge>
        </div>

        {/* رأس الصفحة وبطاقة المشروع */}
        <Card className="border-border/60 shadow-sm rounded-2xl overflow-hidden bg-card">
          <div className="p-5 sm:p-6 bg-gradient-to-l from-emerald-500/10 via-primary/5 to-transparent border-b border-border/40">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs">
                    <FileSpreadsheet className="w-5 h-5" />
                  </div>
                  <div>
                    <h1 className="text-lg sm:text-xl font-bold text-foreground">
                      رفع مستخلص مالي جديد للمشروع
                    </h1>
                    <p className="text-xs text-muted-foreground">
                      رفع وتوثيق مستخلص مالي معتمد بناءً على نسب الإنجاز ومراحل العقد
                    </p>
                  </div>
                </div>
              </div>

              {projectDetails && (
                <div className="flex items-center gap-2 bg-background/80 backdrop-blur-xs px-3.5 py-2 rounded-xl border border-border/60 shadow-xs">
                  <Building2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <div className="text-right">
                    <span className="text-[10px] text-muted-foreground block font-semibold">المشروع المحدد</span>
                    <span className="text-xs font-bold text-foreground">{projectDetails.name}</span>
                  </div>
                  <Badge variant="secondary" className="font-mono text-[10px] mr-1">
                    {projectDetails.projectNumber || `PRJ-${projectDetails.id}`}
                  </Badge>
                </div>
              )}
            </div>
          </div>

          <CardContent className="p-5 sm:p-6 space-y-6">
            {/* بطاقة العقد المالي */}
            <div className="space-y-3 p-4 rounded-xl bg-muted/20 border border-border/50">
              <div className="flex items-center justify-between">
                <Label className="font-bold text-foreground text-xs flex items-center gap-2">
                  <Lock className="w-3.5 h-3.5 text-primary" />
                  <span>العقد المالي المرتبط بالمستخلص</span>
                  <span className="text-red-500">*</span>
                </Label>
                {contractsList.length > 1 && (
                  <Badge variant="outline" className="text-[10px] font-semibold">
                    {contractsList.length} عقود متاحة
                  </Badge>
                )}
              </div>

              {contractsList.length === 0 ? (
                <div className="space-y-3">
                  <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-300 text-xs font-medium flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
                    <div>
                      <p className="font-bold">لا يوجد عقد مالي مسجل في قسم العقود لهذا المشروع حالياً.</p>
                      <p className="text-[11px] opacity-90 mt-0.5">
                        يمكنك تحديد القيمة المالية المعتمدة للتعاقد/الميزانية مباشرة أدناه لاحتساب قيمة المستخلص بناءً على نسبة الإنجاز:
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row items-center gap-3">
                    <div className="w-full sm:w-1/2 space-y-1">
                      <Label className="text-[11px] font-semibold text-foreground">قيمة التعاقد / الميزانية المعتمدة (ر.س) *</Label>
                      <div className="relative">
                        <Input
                          type="number"
                          min={0}
                          value={customContractAmount || ""}
                          onChange={(e) => setCustomContractAmount(parseFloat(e.target.value) || 0)}
                          placeholder="أدخل قيمة العقد بالريال..."
                          className="h-10 text-xs pl-8 font-mono text-left"
                        />
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground">ر.س</span>
                      </div>
                    </div>
                  </div>
                </div>
              ) : contractsList.length === 1 ? (
                <div className="p-3.5 rounded-xl bg-background border border-border/70 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <span className="text-xs font-bold text-foreground block">
                      رقم العقد: {selectedContract?.contractNumber || selectedContract?.id}
                    </span>
                    <span className="text-[11px] text-muted-foreground block mt-0.5">
                      الطرف الثاني: {(selectedContract as any)?.secondPartyName || "المقاول المنفذ"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">قيمة العقد:</span>
                    <span className="text-sm font-bold font-mono text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                      <SaudiRiyal className="w-3.5 h-3.5" />
                      {selectedContractAmount.toLocaleString("en-US")}
                    </span>
                  </div>
                </div>
              ) : (
                <Select
                  value={selectedContractId ? String(selectedContractId) : ""}
                  onValueChange={(val) => setSelectedContractId(parseInt(val) || null)}
                >
                  <SelectTrigger className="w-full text-right text-xs bg-background h-10">
                    <SelectValue placeholder="اختر العقد المالي المرتبط..." />
                  </SelectTrigger>
                  <SelectContent className="max-h-56">
                    {contractsList.map((c: any) => {
                      const cAmt = parseFloat(String(c.contractAmount || (c as any).amount || "0").replace(/,/g, "")) || 0;
                      return (
                        <SelectItem key={c.id} value={String(c.id)}>
                          رقم العقد: {c.contractNumber || c.id} — {c.secondPartyName || "المقاول"} ({cAmt.toLocaleString("en-US")} ر.س)
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              )}
            </div>

            {/* الحقول الأساسية: العنوان ونسبة الإنجاز */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="font-semibold text-foreground text-xs">
                  عنوان المستخلص <span className="text-red-500">*</span>
                </Label>
                <Input
                  placeholder="مثال: مستخلص الأعمال الترابية والهيكلية - المرحلة الأولى"
                  value={invoiceTitle}
                  onChange={(e) => setInvoiceTitle(e.target.value)}
                  className="h-10 text-xs"
                />
              </div>

              <div className="space-y-2">
                <Label className="font-semibold text-foreground text-xs">
                  نسبة الإنجاز الفعلي للمستخلص (%) <span className="text-red-500">*</span>
                </Label>
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
                    className="pl-8 text-left font-mono h-10 text-xs"
                  />
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xs font-bold">%</span>
                </div>
              </div>
            </div>

            {/* بطاقة الحسبة المالية المستحقة للمستخلص */}
            <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-transparent border border-emerald-500/20 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-950 dark:text-emerald-200 flex items-center gap-1.5">
                  <SaudiRiyal className="w-4 h-4 text-emerald-600" />
                  معاينة الاستحقاق المالي للمستخلص
                </span>
                <Badge variant="outline" className="bg-emerald-100/60 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border-emerald-300 font-bold text-[10px]">
                  حساب تلقائي
                </Badge>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                <div className="bg-background/80 p-3 rounded-xl border border-emerald-200/40 dark:border-emerald-900/30">
                  <span className="text-[10px] text-muted-foreground block font-semibold">قيمة العقد الإجمالية</span>
                  <span className="text-sm font-bold font-mono text-foreground flex items-center gap-1 mt-0.5">
                    <SaudiRiyal className="w-3.5 h-3.5 text-muted-foreground" />
                    {selectedContractAmount.toLocaleString("en-US")}
                  </span>
                </div>

                <div className="bg-background/80 p-3 rounded-xl border border-emerald-200/40 dark:border-emerald-900/30">
                  <span className="text-[10px] text-muted-foreground block font-semibold">نسبة الإنجاز المحتسبة</span>
                  <span className="text-sm font-bold font-mono text-emerald-700 dark:text-emerald-400 mt-0.5 block">
                    {invoicePercentage || 0}%
                  </span>
                </div>

                <div className="bg-emerald-600 text-white p-3 rounded-xl shadow-xs">
                  <span className="text-[10px] text-emerald-100 block font-semibold">المبلغ المستحق للصرف</span>
                  <span className="text-base font-bold font-mono flex items-center gap-1 mt-0.5">
                    <SaudiRiyal className="w-4 h-4" />
                    {calculatedInvoicePayout.toLocaleString("en-US")}
                  </span>
                </div>
              </div>

              {calculatedInvoicePayout > 0 && (
                <p className="text-[11px] text-emerald-800 dark:text-emerald-300 font-medium pt-1 text-right">
                  المبلغ كتابةً: <strong>{numberToArabicText(calculatedInvoicePayout)}</strong>
                </p>
              )}
            </div>

            {/* وصف الأعمال المنجزة */}
            <div className="space-y-2">
              <Label className="font-semibold text-foreground text-xs">
                وصف الأعمال والمنجزات الفعلية <span className="text-red-500">*</span>
              </Label>
              <Textarea
                rows={4}
                placeholder="اكتب وصفاً مفصلاً لكافة الأعمال والبنود والمواصفات التي تم إنجازها على أرض الواقع خلال هذه المرحلة من العقد..."
                value={invoiceWorkDone}
                onChange={(e) => setInvoiceWorkDone(e.target.value)}
                className="resize-none leading-relaxed text-xs"
              />
            </div>

            {/* المرفقات والمستندات الثبوتية */}
            <div className="space-y-3 pt-2">
              <Label className="font-semibold text-foreground text-xs flex items-center gap-1.5">
                <Upload className="w-3.5 h-3.5 text-primary" />
                <span>المرفقات والمستندات الثبوتية (صور الإنجاز، الفواتير، تقارير الفحص)</span>
              </Label>

              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-border/80 hover:border-emerald-500/60 rounded-xl p-5 text-center cursor-pointer transition-all hover:bg-muted/20"
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  multiple
                  accept="image/*,application/pdf"
                  className="hidden"
                />
                <div className="flex flex-col items-center gap-1.5">
                  <div className="w-10 h-10 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                    <Upload className="w-5 h-5" />
                  </div>
                  <p className="font-bold text-xs text-foreground">اضغط هنا لرفع الملفات أو اسحبها وأفلتها</p>
                  <p className="text-[10px] text-muted-foreground">يدعم الصور (PNG, JPG, WEBP) وملفات PDF بحد أقصى 10 ميجابايت إجمالي</p>
                </div>
              </div>

              {uploadedFiles.length > 0 && (
                <div className="space-y-2 pt-1">
                  <span className="text-[11px] text-muted-foreground font-semibold block">الملفات المرفوعة ({uploadedFiles.length}):</span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {uploadedFiles.map((file, idx) => (
                      <div key={idx} className="flex items-center justify-between p-2.5 rounded-lg border bg-muted/30 text-xs">
                        <div className="flex items-center gap-2 truncate">
                          <FileText className="w-4 h-4 text-emerald-600 flex-shrink-0" />
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
            </div>

            {/* توصية إدارة المشاريع */}
            <div className="space-y-2 p-4 rounded-xl border border-emerald-500/30 bg-emerald-50/15 dark:bg-emerald-950/10">
              <Label className="font-semibold text-foreground text-xs flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>توصية إدارة المشاريع والمهندس المشرف</span>
              </Label>
              <Textarea
                value={invoiceRecommendations}
                onChange={(e) => setInvoiceRecommendations(e.target.value)}
                placeholder="اكتب هنا توصية إدارة المشاريع بالتفصيل (مثال: نوصي بصرف المستخلص المالي نظراً لمطابقة الأعمال المنفذة على أرض الواقع للمواصفات الفنية المعتمدة وبنسبة إنجاز مستحقة...)"
                rows={3}
                className="w-full resize-none leading-relaxed text-xs bg-background"
              />
              <p className="text-[10px] text-muted-foreground">
                ملاحظة: تُنقل هذه التوصية تلقائياً لطلب الصرف لتظهر لصناع القرار والمدير التنفيذي أثناء الاعتماد.
              </p>
            </div>

            {/* أزرار الإجراءات */}
            <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-3 pt-4 border-t border-border/40">
              <Button
                type="button"
                variant="outline"
                onClick={handleReturnToProject}
                className="w-full sm:w-auto text-xs font-bold rounded-xl h-10 px-5"
                disabled={isSubmitting || createMutation.isPending}
              >
                إلغاء والعودة للمشروع
              </Button>
              <Button
                type="button"
                onClick={handleSubmit}
                className="w-full sm:w-auto gradient-primary text-white text-xs font-bold rounded-xl h-10 px-6 gap-2 shadow-xs"
                disabled={isSubmitting || createMutation.isPending}
              >
                {(isSubmitting || createMutation.isPending) ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>جاري حفظ وإرسال المستخلص...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 ml-1" />
                    <span>إرسال المستخلص للاعتماد</span>
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
