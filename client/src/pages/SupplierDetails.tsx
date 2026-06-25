import { useState } from "react";
import { useParams, useLocation } from "wouter";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { PermissionGuard } from "@/components/PermissionGuard";
import { LeafletMap } from "@/components/LeafletMap";
import {
  Building2,
  Phone,
  Mail,
  MapPin,
  CreditCard,
  FileText,
  ExternalLink,
  Download,
  Loader2,
  Clock,
  CheckCircle2,
  XCircle,
  X,
  Ban,
  ArrowRight,
  Copy,
  Calendar,
  Shield,
  Eye,
  Check,
  User,
  Info,
  Play,
} from "lucide-react";

// تسميات مجالات العمل
const WORK_FIELD_LABELS: Record<string, string> = {
  construction: "بناء وتشييد",
  engineering_consulting: "استشارات هندسية",
  electrical: "أعمال كهربائية",
  plumbing: "أعمال سباكة",
  hvac: "تكييف وتبريد",
  finishing: "تشطيبات",
  carpentry: "نجارة",
  aluminum: "ألمنيوم",
  painting: "دهانات",
  flooring: "أرضيات",
  landscaping: "تنسيق حدائق",
  cleaning: "نظافة",
  maintenance: "صيانة",
  security_systems: "أنظمة أمنية",
  sound_systems: "أنظمة صوتية",
  solar_energy: "طاقة شمسية",
  water_systems: "أنظمة مياه",
  furniture: "أثاث",
  carpets: "سجاد",
  supplies: "توريدات",
  other: "أخرى",
};

// ألوان حالات الاعتماد
const STATUS_CONFIG = {
  pending: { label: "قيد المراجعة", color: "bg-amber-100 text-amber-800 dark:bg-amber-950/30 dark:text-amber-400 border-amber-200", icon: Clock },
  approved: { label: "معتمد", color: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-400 border-emerald-200", icon: CheckCircle2 },
  rejected: { label: "مرفوض", color: "bg-red-100 text-red-800 dark:bg-red-950/30 dark:text-red-400 border-red-200", icon: XCircle },
  suspended: { label: "موقوف", color: "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-400 border-slate-300", icon: Ban },
};

export default function SupplierDetails() {
  const params = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { user } = useAuth();
  
  const supplierId = params.id ? Number(params.id) : NaN;

  // الحالات
  const [rejectReason, setRejectReason] = useState("");
  const [suspendReason, setSuspendReason] = useState("");
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [showSuspendDialog, setShowSuspendDialog] = useState(false);
  const [previewDoc, setPreviewDoc] = useState<{ data: string; title: string } | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // جلب بيانات المورد بالتفصيل
  const { data: supplier, isLoading, isError, refetch } = trpc.suppliers.getById.useQuery(
    { id: supplierId },
    { enabled: !isNaN(supplierId) }
  );

  // Mutations
  const approveMutation = trpc.suppliers.approve.useMutation({
    onSuccess: () => {
      toast.success("تم اعتماد المورد بنجاح");
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || "حدث خطأ أثناء اعتماد المورد");
    },
  });

  const rejectMutation = trpc.suppliers.reject.useMutation({
    onSuccess: () => {
      toast.success("تم رفض المورد بنجاح");
      setShowRejectDialog(false);
      setRejectReason("");
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || "حدث خطأ أثناء رفض المورد");
    },
  });

  const suspendMutation = trpc.suppliers.suspend.useMutation({
    onSuccess: () => {
      toast.success("تم إيقاف المورد بنجاح");
      setShowSuspendDialog(false);
      setSuspendReason("");
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || "حدث خطأ أثناء إيقاف المورد");
    },
  });

  // المساعدات
  const getWorkFieldsArray = (workFields: any): string[] => {
    if (!workFields) return [];
    if (Array.isArray(workFields)) return workFields;
    if (typeof workFields === "string") {
      try {
        if (workFields.startsWith("[") && workFields.endsWith("]")) {
          return JSON.parse(workFields);
        }
        if (workFields.includes(",")) {
          return workFields.split(",").map(s => s.trim());
        }
        return [workFields];
      } catch (e) {
        return [];
      }
    }
    return [];
  };

  const copyToClipboard = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    toast.success(`تم نسخ ${fieldName} إلى الحافظة`);
    setTimeout(() => setCopiedField(null), 2000);
  };

  // دالة لتخمين نوع ملف Base64 الخام
  const getMimeTypeFromBase64 = (base64: string): string => {
    if (base64.startsWith("JVBERi")) {
      return "application/pdf";
    }
    if (base64.startsWith("iVBORw")) {
      return "image/png";
    }
    if (base64.startsWith("/9j/") || base64.startsWith("/9j/4")) {
      return "image/jpeg";
    }
    if (base64.startsWith("UklGR")) {
      return "image/webp";
    }
    if (base64.startsWith("R0lG")) {
      return "image/gif";
    }
    return "";
  };

  // فتح المرفقات
  const handleViewAttachment = (base64Data: string, title: string) => {
    if (!base64Data) return;
    
    // إذا كان رابطاً عادياً
    if (base64Data.startsWith("http://") || base64Data.startsWith("https://") || base64Data.startsWith("/")) {
      window.open(base64Data, "_blank");
      return;
    }

    let fullData = base64Data;
    // إذا كان نص base64 خام بدون بادئة data:
    if (!base64Data.startsWith("data:")) {
      const mimeType = getMimeTypeFromBase64(base64Data);
      if (mimeType) {
        fullData = `data:${mimeType};base64,${base64Data}`;
      } else {
        // الافتراضي في حال لم يتمكن من تحديد الصيغة (نعتبره صورة أو pdf حسب عنوان الملف أو نعتبره pdf)
        const lowerTitle = title.toLowerCase();
        if (lowerTitle.includes("صورة") || lowerTitle.includes("مرفق") || lowerTitle.includes("شهادة")) {
          fullData = `data:image/webp;base64,${base64Data}`;
        } else {
          fullData = `data:application/pdf;base64,${base64Data}`;
        }
      }
    }

    setPreviewDoc({ data: fullData, title });
  };

  // تحميل المعاينة
  const handleDownloadPreview = () => {
    if (!previewDoc) return;
    try {
      const parts = previewDoc.data.split(";base64,");
      const contentType = parts[0].split(":")[1] || "application/octet-stream";
      
      // الحصول على اللاحقة مباشرة من الـ mimeType لتدعم كل الأنواع (مثل webp, pdf, png, jpeg, gif)
      const mimeSubtype = contentType.split("/")[1] || "bin";
      const ext = mimeSubtype === "jpeg" ? "jpg" : mimeSubtype;
      
      const link = document.createElement("a");
      link.href = previewDoc.data;
      link.download = `${previewDoc.title}.${ext}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success("تم تحميل الملف بنجاح");
    } catch (err) {
      console.error("Error downloading file:", err);
      toast.error("فشل تحميل الملف");
    }
  };

  // الإجراءات الإدارية
  const handleApprove = () => {
    if (isNaN(supplierId)) return;
    approveMutation.mutate({ id: supplierId });
  };

  const handleReject = () => {
    if (isNaN(supplierId) || !rejectReason.trim()) {
      toast.error("يرجى إدخال سبب الرفض");
      return;
    }
    rejectMutation.mutate({ id: supplierId, reason: rejectReason });
  };

  const handleSuspend = () => {
    if (isNaN(supplierId) || !suspendReason.trim()) {
      toast.error("يرجى إدخال سبب الإيقاف");
      return;
    }
    suspendMutation.mutate({ id: supplierId, reason: suspendReason });
  };

  // معالجة حالة التحميل والخطأ
  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground animate-pulse text-sm font-medium">جاري تحميل تفاصيل المورد...</p>
        </div>
      </DashboardLayout>
    );
  }

  if (isError || !supplier) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center min-h-[50vh] text-center p-6 border rounded-xl bg-slate-50 dark:bg-slate-900/50">
          <XCircle className="h-12 w-12 text-rose-500 mb-4" />
          <h2 className="text-lg font-bold mb-1">المورد غير موجود أو حدث خطأ أثناء التحميل</h2>
          <p className="text-sm text-muted-foreground max-w-md mb-6">يرجى التأكد من معرف المورد الصحيح أو المحاولة لاحقاً</p>
          <Button onClick={() => navigate("/suppliers")} className="gap-2" variant="outline">
            <ArrowRight className="h-4 w-4" />
            العودة لقائمة الموردين
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  const statusConfig = STATUS_CONFIG[supplier.approvalStatus as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.pending;
  const StatusIcon = statusConfig.icon;

  return (
    <DashboardLayout>
      <div className="space-y-6 pb-12" dir="rtl">
        
        {/* شريط المسار والتحكم العالي */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-5">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium">
              <button 
                onClick={() => navigate("/suppliers")} 
                className="hover:text-primary transition-colors hover:underline"
              >
                إدارة الموردين
              </button>
              <span className="text-slate-400">/</span>
              <span className="text-foreground">تفاصيل المورد</span>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-xl md:text-2xl font-bold text-slate-800 dark:text-slate-200 tracking-tight flex items-center gap-2">
                <Building2 className="h-6 w-6 text-primary shrink-0" />
                {supplier.name}
              </h1>
              <Badge className={`${statusConfig.color} border px-2.5 py-0.5 text-xs font-semibold flex items-center gap-1 rounded-full shadow-xs`}>
                <StatusIcon className="h-3.5 w-3.5" />
                {statusConfig.label}
              </Badge>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 self-start md:self-center">
            <Button 
              variant="outline" 
              onClick={() => navigate("/suppliers")} 
              className="gap-2 font-medium h-9"
            >
              <ArrowRight className="h-4 w-4 ml-1" />
              العودة
            </Button>
            
            {supplier.approvalStatus === "pending" && (
              <>
                <PermissionGuard permission="suppliers.reject">
                  <Button
                    variant="outline"
                    onClick={() => setShowRejectDialog(true)}
                    className="text-rose-600 border-rose-200 hover:bg-rose-50 dark:hover:bg-rose-950/20 font-medium h-9 gap-1.5"
                  >
                    <XCircle className="h-4 w-4" />
                    رفض الطلب
                  </Button>
                </PermissionGuard>
                
                <PermissionGuard permission="suppliers.approve">
                  <Button
                    onClick={handleApprove}
                    disabled={approveMutation.isPending}
                    className="bg-primary hover:bg-primary/95 text-primary-foreground font-medium h-9 gap-1.5"
                  >
                    {approveMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <CheckCircle2 className="h-4 w-4" />
                    )}
                    اعتماد المورد
                  </Button>
                </PermissionGuard>
              </>
            )}

            {supplier.approvalStatus === "approved" && (
              <PermissionGuard permission="suppliers.edit">
                <Button
                  variant="outline"
                  onClick={() => setShowSuspendDialog(true)}
                  className="text-amber-600 border-amber-200 hover:bg-amber-50 dark:hover:bg-amber-950/20 font-medium h-9 gap-1.5"
                >
                  <Ban className="h-4 w-4" />
                  إيقاف المورد
                </Button>
              </PermissionGuard>
            )}

            {supplier.approvalStatus === "suspended" && (
              <PermissionGuard permission="suppliers.approve">
                <Button
                  onClick={handleApprove}
                  disabled={approveMutation.isPending}
                  className="bg-green-600 hover:bg-green-700 text-white font-medium h-9 gap-1.5"
                >
                  {approveMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Play className="h-4 w-4" />
                  )}
                  إعادة تنشيط المورد
                </Button>
              </PermissionGuard>
            )}
          </div>
        </div>

        {/* سبب الرفض/الإيقاف المعروض في الأعلى كـ Banner مميز */}
        {supplier.rejectionReason && (supplier.approvalStatus === "rejected" || supplier.approvalStatus === "suspended") && (
          <div className={`p-4 rounded-xl border flex items-start gap-3 shadow-xs ${supplier.approvalStatus === "rejected" ? "border-rose-100 bg-rose-50/50 dark:bg-rose-950/10 dark:border-rose-950/30 text-rose-800 dark:text-rose-400" : "border-amber-100 bg-amber-50/50 dark:bg-amber-950/10 dark:border-amber-950/30 text-amber-800 dark:text-amber-400"}`}>
            <div className={`p-1.5 rounded-lg shrink-0 ${supplier.approvalStatus === "rejected" ? "bg-rose-100 dark:bg-rose-950/50 text-rose-600" : "bg-amber-100 dark:bg-amber-950/50 text-amber-600"}`}>
              {supplier.approvalStatus === "rejected" ? <XCircle className="h-5 w-5" /> : <Ban className="h-5 w-5" />}
            </div>
            <div>
              <h3 className="font-bold text-sm mb-0.5">
                {supplier.approvalStatus === "rejected" ? "طلب التسجيل مرفوض" : "تم إيقاف المورد"}
              </h3>
              <p className="text-xs leading-relaxed opacity-90">{supplier.rejectionReason}</p>
            </div>
          </div>
        )}

        {/* الشبكة الرئيسية للتفاصيل */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* العمود الجانبي (الأيمن في RTL) - يمتد 2/3 */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* بطاقة معلومات الكيان */}
            <Card className="border shadow-xs">
              <CardHeader className="pb-4">
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-primary" />
                  معلومات الكيان والنشاط التجاري
                </CardTitle>
                <CardDescription className="text-xs">البيانات الأساسية المسجلة بالسجل التجاري وتصنيف المورد</CardDescription>
              </CardHeader>
              <CardContent className="pt-2">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  
                  <div className="space-y-1 bg-slate-50 dark:bg-slate-900/50 p-3 rounded-lg border border-slate-100 dark:border-slate-800 shadow-2xs">
                    <span className="text-[10px] text-muted-foreground block font-bold">اسم المنشأة:</span>
                    <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">{supplier.name}</span>
                  </div>

                  <div className="space-y-1 bg-slate-50 dark:bg-slate-900/50 p-3 rounded-lg border border-slate-100 dark:border-slate-800 shadow-2xs">
                    <span className="text-[10px] text-muted-foreground block font-bold">نوع الكيان:</span>
                    <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                      {supplier.entityType === "company" ? "شركة تجارية" : "مؤسسة فردية"}
                    </span>
                  </div>

                  <div className="space-y-1 bg-slate-50 dark:bg-slate-900/50 p-3 rounded-lg border border-slate-100 dark:border-slate-800 shadow-2xs">
                    <span className="text-[10px] text-muted-foreground block font-bold">رقم السجل التجاري:</span>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-bold font-mono text-slate-800 dark:text-slate-200" dir="ltr">
                        {supplier.commercialRegister}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-muted-foreground hover:text-primary rounded-md"
                        onClick={() => copyToClipboard(supplier.commercialRegister, "رقم السجل التجاري")}
                      >
                        {copiedField === "CR" ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-1 bg-slate-50 dark:bg-slate-900/50 p-3 rounded-lg border border-slate-100 dark:border-slate-800 shadow-2xs">
                    <span className="text-[10px] text-muted-foreground block font-bold">سنوات الخبرة:</span>
                    <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                      {supplier.yearsOfExperience ?? 0} {(supplier.yearsOfExperience ?? 0) > 10 ? "عاماً" : "سنوات"} خبرة
                    </span>
                  </div>

                  <div className="col-span-1 md:col-span-2 space-y-1 bg-slate-50 dark:bg-slate-900/50 p-3 rounded-lg border border-slate-100 dark:border-slate-800 shadow-2xs">
                    <span className="text-[10px] text-muted-foreground block font-bold">النشاط التجاري (حسب السجل):</span>
                    <p className="text-xs sm:text-sm font-medium leading-relaxed text-slate-700 dark:text-slate-300">
                      {supplier.commercialActivity}
                    </p>
                  </div>

                  <div className="col-span-1 md:col-span-2 space-y-2 bg-slate-50 dark:bg-slate-900/50 p-3 rounded-lg border border-slate-100 dark:border-slate-800 shadow-2xs">
                    <span className="text-[10px] text-muted-foreground block font-bold">مجالات التخصص والعمل:</span>
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {getWorkFieldsArray(supplier.workFields).map((field) => (
                        <span 
                          key={field} 
                          className="text-[11px] font-semibold px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border shadow-2xs"
                        >
                          {WORK_FIELD_LABELS[field] || field}
                        </span>
                      ))}
                    </div>
                  </div>

                </div>
              </CardContent>
            </Card>

            {/* بطاقة الحسابات المالية والبنكية المتناسقة بالكامل مع ثيم التطبيق */}
            <Card className="border shadow-xs">
              <CardHeader className="pb-4">
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <CreditCard className="h-5 w-5 text-primary" />
                  معلومات الحساب البنكي والضرائب
                </CardTitle>
                <CardDescription className="text-xs">البيانات المالية المعتمدة لتحويل المستحقات وإصدار الفواتير</CardDescription>
              </CardHeader>
              <CardContent className="pt-2">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  
                  <div className="space-y-1 bg-slate-50 dark:bg-slate-900/50 p-3 rounded-lg border border-slate-100 dark:border-slate-800 shadow-2xs">
                    <span className="text-[10px] text-muted-foreground block font-bold">اسم الحساب البنكي:</span>
                    <span className="text-sm font-semibold text-slate-800 dark:text-slate-200 truncate block">
                      {supplier.bankAccountName || supplier.name}
                    </span>
                  </div>

                  <div className="space-y-1 bg-slate-50 dark:bg-slate-900/50 p-3 rounded-lg border border-slate-100 dark:border-slate-800 shadow-2xs">
                    <span className="text-[10px] text-muted-foreground block font-bold">البنك المعتمد:</span>
                    <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                      {supplier.bankName || "غير محدد"}
                    </span>
                  </div>

                  <div className="col-span-1 md:col-span-2 space-y-1 bg-slate-50 dark:bg-slate-900/50 p-3 rounded-lg border border-slate-100 dark:border-slate-800 shadow-2xs">
                    <span className="text-[10px] text-muted-foreground block font-bold">رقم الآيبان الدولي (IBAN):</span>
                    <div className="flex items-center justify-between gap-4 mt-0.5">
                      <p className="text-sm sm:text-base font-bold font-mono tracking-wider text-slate-800 dark:text-slate-200" dir="ltr">
                        {supplier.iban}
                      </p>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-primary rounded-md"
                        onClick={() => copyToClipboard(supplier.iban || "", "رقم الآيبان")}
                      >
                        {copiedField === "IBAN" ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-1 bg-slate-50 dark:bg-slate-900/50 p-3 rounded-lg border border-slate-100 dark:border-slate-800 shadow-2xs">
                    <span className="text-[10px] text-muted-foreground block font-bold">الرقم الضريبي (VAT):</span>
                    <div className="flex items-center justify-between gap-2 mt-0.5">
                      <span className="text-sm font-bold font-mono text-slate-800 dark:text-slate-200">
                        {supplier.taxNumber || "غير متوفر"}
                      </span>
                      {supplier.taxNumber && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-muted-foreground hover:text-primary rounded-md"
                          onClick={() => copyToClipboard(supplier.taxNumber || "", "الرقم الضريبي")}
                        >
                          {copiedField === "VAT" ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                        </Button>
                      )}
                    </div>
                  </div>

                </div>
              </CardContent>
            </Card>

            {/* بطاقة المرفقات الرسمية المتناسقة مع ثيم التطبيق */}
            <Card className="border shadow-xs">
              <CardHeader className="pb-4">
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" />
                  المستندات الرسمية والمرفقات
                </CardTitle>
                <CardDescription className="text-xs">المستندات الثبوتية المرفقة بطلب التسجيل لمطابقتها والتأكد من سريانها</CardDescription>
              </CardHeader>
              <CardContent className="pt-2">
                
                {/* قائمة المستندات الرسمية الموحدة */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  
                  {/* السجل التجاري */}
                  {supplier.commercialRegisterDoc && (
                    <div className="p-3 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-150 dark:border-slate-800 shadow-2xs flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                          <FileText className="h-5 w-5 text-primary" />
                        </div>
                        <div className="min-w-0 text-right">
                          <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">السجل التجاري</p>
                          <p className="text-[10px] text-muted-foreground">وثيقة السجل الرسمي</p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 text-xs text-primary hover:text-primary/80 font-semibold gap-1 shrink-0 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700"
                        onClick={() => handleViewAttachment(supplier.commercialRegisterDoc!, "السجل التجاري")}
                      >
                        <Eye className="h-3.5 w-3.5" />
                        معاينة
                      </Button>
                    </div>
                  )}

                  {/* شهادة ضريبة القيمة المضافة */}
                  {supplier.vatCertificateDoc && (
                    <div className="p-3 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-150 dark:border-slate-800 shadow-2xs flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                          <FileText className="h-5 w-5 text-primary" />
                        </div>
                        <div className="min-w-0 text-right">
                          <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">شهادة ضريبة القيمة المضافة</p>
                          <p className="text-[10px] text-muted-foreground">الرقم الضريبي للمنشأة</p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 text-xs text-primary hover:text-primary/80 font-semibold gap-1 shrink-0 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700"
                        onClick={() => handleViewAttachment(supplier.vatCertificateDoc!, "شهادة الضريبة")}
                      >
                        <Eye className="h-3.5 w-3.5" />
                        معاينة
                      </Button>
                    </div>
                  )}

                  {/* العنوان الوطني */}
                  {supplier.nationalAddressDoc && (
                    <div className="p-3 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-150 dark:border-slate-800 shadow-2xs flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                          <FileText className="h-5 w-5 text-primary" />
                        </div>
                        <div className="min-w-0 text-right">
                          <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">العنوان الوطني</p>
                          <p className="text-[10px] text-muted-foreground">تفاصيل المقر الرئيسي</p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 text-xs text-primary hover:text-primary/80 font-semibold gap-1 shrink-0 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700"
                        onClick={() => handleViewAttachment(supplier.nationalAddressDoc!, "العنوان الوطني")}
                      >
                        <Eye className="h-3.5 w-3.5" />
                        معاينة
                      </Button>
                    </div>
                  )}

                  {/* الشهادة البنكية */}
                  {supplier.bankCertificateDoc && (
                    <div className="p-3 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-150 dark:border-slate-800 shadow-2xs flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                          <FileText className="h-5 w-5 text-primary" />
                        </div>
                        <div className="min-w-0 text-right">
                          <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">الشهادة البنكية</p>
                          <p className="text-[10px] text-muted-foreground">خطاب ملكية رقم الآيبان</p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 text-xs text-primary hover:text-primary/80 font-semibold gap-1 shrink-0 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700"
                        onClick={() => handleViewAttachment(supplier.bankCertificateDoc!, "الشهادة البنكية")}
                      >
                        <Eye className="h-3.5 w-3.5" />
                        معاينة
                      </Button>
                    </div>
                  )}

                </div>

                {/* المرفقات الإضافية إن وجدت */}
                {supplier.otherAttachments && Array.isArray(supplier.otherAttachments) && supplier.otherAttachments.length > 0 && (
                  <div className="mt-6 pt-5 border-t border-slate-200 dark:border-slate-800">
                    <h4 className="font-semibold text-xs text-muted-foreground mb-3 flex items-center gap-1.5">
                      مستندات ومرفقات إضافية مضافة:
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {supplier.otherAttachments.map((attr: any, index: number) => (
                        <div
                          key={index}
                          className="p-3 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-150 dark:border-slate-800 shadow-2xs flex items-center justify-between gap-3"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                              <FileText className="h-5 w-5 text-primary" />
                            </div>
                            <div className="min-w-0 text-right">
                              <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate" title={attr.name}>
                                {attr.name || `مرفق إضافي ${index + 1}`}
                              </p>
                              <p className="text-[10px] text-muted-foreground">ملف تكميلي</p>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 text-xs text-primary hover:text-primary/80 font-semibold gap-1 shrink-0 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700"
                            onClick={() => handleViewAttachment(attr.fileData, attr.name || `مرفق ${index + 1}`)}
                          >
                            <Eye className="h-3.5 w-3.5" />
                            معاينة
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              </CardContent>
            </Card>

          </div>

          {/* العمود الجانبي (الأيسر في RTL) - يمتد 1/3 */}
          <div className="space-y-6">
            
            {/* بطاقة مسؤول التواصل والاتصال */}
            <Card className="border shadow-xs">
              <CardHeader className="pb-4">
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <User className="h-5 w-5 text-primary" />
                  مسؤول التواصل والاتصال
                </CardTitle>
                <CardDescription className="text-xs">بيانات الشخص المسؤول عن المنشأة للمتابعة</CardDescription>
              </CardHeader>
              <CardContent className="pt-2 space-y-4">
                
                {/* مصغر مسؤول التواصل الأنيق المتناسق */}
                <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-900/50 p-3 rounded-lg border border-slate-100 dark:border-slate-800">
                  <div className="h-10 w-10 rounded-full bg-primary/10 text-primary font-bold text-sm flex items-center justify-center shrink-0">
                    {supplier.contactPerson ? supplier.contactPerson.charAt(0) : "م"}
                  </div>
                  <div>
                    <h4 className="font-bold text-xs sm:text-sm text-slate-800 dark:text-slate-200">{supplier.contactPerson}</h4>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{supplier.contactPersonTitle || "مسؤول اتصال معتمد"}</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-3 p-2 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-100 dark:border-slate-800">
                    <Phone className="h-4 w-4 text-primary shrink-0" />
                    <div className="space-y-0.5 min-w-0">
                      <span className="text-[9px] text-muted-foreground block font-bold">الهاتف الجوال:</span>
                      <a href={`tel:${supplier.phone}`} className="text-xs font-bold text-slate-800 dark:text-slate-200 hover:text-primary hover:underline font-mono" dir="ltr">
                        {supplier.phone}
                      </a>
                    </div>
                  </div>

                  {supplier.phoneSecondary && (
                    <div className="flex items-center gap-3 p-2 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-100 dark:border-slate-800">
                      <Phone className="h-4 w-4 text-primary shrink-0" />
                      <div className="space-y-0.5 min-w-0">
                        <span className="text-[9px] text-muted-foreground block font-bold">هاتف إضافي:</span>
                        <a href={`tel:${supplier.phoneSecondary}`} className="text-xs font-bold text-slate-800 dark:text-slate-200 hover:text-primary hover:underline font-mono" dir="ltr">
                          {supplier.phoneSecondary}
                        </a>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center gap-3 p-2 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-100 dark:border-slate-800">
                    <Mail className="h-4 w-4 text-primary shrink-0" />
                    <div className="space-y-0.5 min-w-0 overflow-hidden">
                      <span className="text-[9px] text-muted-foreground block font-bold">البريد الإلكتروني:</span>
                      <a href={`mailto:${supplier.email}`} className="text-xs font-bold text-slate-800 dark:text-slate-200 hover:text-primary hover:underline block truncate font-mono" dir="ltr" title={supplier.email}>
                        {supplier.email}
                      </a>
                    </div>
                  </div>
                </div>

              </CardContent>
            </Card>

            {/* بطاقة العنوان والمقر */}
            <Card className="border shadow-xs">
              <CardHeader className="pb-4">
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-primary" />
                  المقر الجغرافي والعنوان
                </CardTitle>
                <CardDescription className="text-xs">العناوين الرسمية والموقع الجغرافي للمنشأة</CardDescription>
              </CardHeader>
              <CardContent className="pt-2 space-y-4">
                
                <div className="bg-slate-50 dark:bg-slate-900/50 p-3 rounded-lg border border-slate-100 dark:border-slate-800 text-xs">
                  <span className="text-[10px] text-muted-foreground block font-bold mb-1">العنوان بالتفصيل:</span>
                  <p className="font-semibold text-slate-800 dark:text-slate-200 leading-relaxed">
                    {supplier.address}
                  </p>
                  {supplier.city && (
                    <p className="text-[10px] text-slate-500 mt-2 font-bold flex items-center gap-1">
                      المدينة: {supplier.city}
                    </p>
                  )}
                </div>

                {(() => {
                  if (!supplier.googleMapsUrl) return null;
                  const match = supplier.googleMapsUrl.match(/q=(-?\d+\.\d+),(-?\d+\.\d+)/);
                  if (!match) return null;
                  const lat = parseFloat(match[1]);
                  const lng = parseFloat(match[2]);
                  return (
                    <div className="mt-4 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-800 h-[250px] relative z-0">
                      <LeafletMap
                        initialCenter={{ lat, lng }}
                        initialZoom={14}
                        markers={[
                          {
                            id: supplier.id,
                            position: { lat, lng },
                            title: supplier.name,
                            content: (
                              <div className="text-right font-semibold">
                                <p className="text-sm font-bold text-slate-800 dark:text-slate-200">{supplier.name}</p>
                                <p className="text-xs text-muted-foreground mt-1">{supplier.address}</p>
                              </div>
                            ),
                            status: supplier.approvalStatus === "approved" ? "approved" : "pending"
                          }
                        ]}
                        fitBounds={false}
                        className="h-full w-full"
                      />
                    </div>
                  );
                })()}


              </CardContent>
            </Card>

            {/* بطاقة الاعتماد والمدقق */}
            {supplier.approvedBy && (
              <Card className="border shadow-xs">
                <CardHeader className="pb-3">
                  <CardTitle className="text-xs font-bold flex items-center gap-1.5">
                    <Shield className="h-4 w-4 text-slate-500" />
                    توثيق وتدقيق الطلب
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-1 text-[11px] space-y-2 font-semibold text-slate-500 dark:text-slate-400">
                  <div className="flex justify-between items-center">
                    <span>المدقق المعتمد:</span>
                    <span className="text-slate-800 dark:text-slate-200 font-bold">{supplier.approver?.name || "مسؤول النظام"}</span>
                  </div>
                  {supplier.approvedAt && (
                    <div className="flex justify-between items-center">
                      <span>تاريخ الاعتماد:</span>
                      <span className="text-slate-800 dark:text-slate-200 font-bold" dir="ltr">
                        {new Date(supplier.approvedAt).toLocaleDateString("ar-SA")}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between items-center">
                    <span>تاريخ التسجيل:</span>
                    <span className="text-slate-800 dark:text-slate-200 font-bold" dir="ltr">
                      {new Date(supplier.createdAt).toLocaleDateString("ar-SA")}
                    </span>
                  </div>
                </CardContent>
              </Card>
            )}

          </div>

        </div>

      </div>

      {/* نافذة الرفض (Dialog) */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent className="max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2 text-rose-600">
              <XCircle className="h-5 w-5" />
              رفض طلب تسجيل المورد
            </DialogTitle>
            <DialogDescription className="text-xs">
              يرجى كتابة سبب رفض الطلب بالتفصيل ليتمكن المورد من معرفة النواقص وإصلاحها.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label className="font-semibold text-xs">سبب الرفض والتعليق الإداري *</Label>
              <Textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="مثال: يرجى إرفاق وثيقة سجل تجاري سارية المفعول، السجل المرفق منتهي الصلاحية..."
                rows={4}
                className="resize-none"
              />
            </div>
          </div>
          <DialogFooter className="gap-2 mt-4 flex justify-end">
            <Button variant="outline" onClick={() => setShowRejectDialog(false)} className="font-medium h-9">
              إلغاء
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={rejectMutation.isPending || !rejectReason.trim()}
              className="font-medium h-9 gap-1.5"
            >
              {rejectMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <XCircle className="h-4 w-4" />
              )}
              تأكيد الرفض
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* نافذة الإيقاف (Dialog) */}
      <Dialog open={showSuspendDialog} onOpenChange={setShowSuspendDialog}>
        <DialogContent className="max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2 text-amber-600">
              <Ban className="h-5 w-5" />
              إيقاف المورد مؤقتاً
            </DialogTitle>
            <DialogDescription className="text-xs">
              يرجى إدخال سبب تعليق وإيقاف حساب المورد في النظام.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label className="font-semibold text-xs">سبب إيقاف المنشأة *</Label>
              <Textarea
                value={suspendReason}
                onChange={(e) => setSuspendReason(e.target.value)}
                placeholder="أدخل سبب إيقاف التعامل مع المورد مؤقتاً..."
                rows={4}
                className="resize-none"
              />
            </div>
          </div>
          <DialogFooter className="gap-2 mt-4 flex justify-end">
            <Button variant="outline" onClick={() => setShowSuspendDialog(false)} className="font-medium h-9">
              إلغاء
            </Button>
            <Button
              variant="destructive"
              onClick={handleSuspend}
              disabled={suspendMutation.isPending || !suspendReason.trim()}
              className="bg-amber-600 hover:bg-amber-700 text-white font-medium h-9 gap-1.5"
            >
              {suspendMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Ban className="h-4 w-4" />
              )}
              إيقاف التعامل
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* نافذة معاينة الصور الفاخرة (Lightbox Modal) */}
      {previewDoc && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-955/90 backdrop-blur-md p-4 animate-in fade-in duration-200"
          onClick={() => setPreviewDoc(null)}
        >
          <div 
            className="relative max-w-5xl w-full max-h-[92vh] flex flex-col items-center bg-slate-900/70 border border-slate-800 rounded-2xl p-2 sm:p-4 shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button 
              onClick={() => setPreviewDoc(null)}
              className="absolute top-4 right-4 bg-slate-800/80 hover:bg-slate-700/80 text-white rounded-full p-2 transition-all z-10 shadow-lg"
              title="إغلاق"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Download button */}
            <button 
              onClick={handleDownloadPreview}
              className="absolute top-4 left-4 bg-slate-800/80 hover:bg-primary/80 text-white rounded-full p-2 transition-all flex items-center gap-1.5 px-3 z-10 shadow-lg"
              title="تحميل"
            >
              <Download className="w-4 h-4" />
              <span className="text-xs font-bold hidden sm:inline">تحميل</span>
            </button>

            {/* Image or PDF container */}
            <div className="w-full flex-1 flex items-center justify-center p-2 overflow-auto mt-12 mb-2 min-h-[60vh]">
              {previewDoc.data.startsWith("data:application/pdf") ? (
                <iframe 
                  src={previewDoc.data} 
                  title={previewDoc.title} 
                  className="w-full h-[65vh] border rounded-lg bg-white shadow-xs"
                />
              ) : (
                <img 
                  src={previewDoc.data} 
                  alt={previewDoc.title} 
                  className="max-w-full max-h-[65vh] object-contain rounded-lg shadow-md border bg-white"
                />
              )}
            </div>

            {/* Caption/Name */}
            <div className="mt-2 text-center px-4 py-2 w-full border-t border-slate-850/60 bg-slate-950/30 flex justify-between items-center text-slate-300">
              <p className="text-xs font-medium flex items-center gap-1">
                <Info className="h-3.5 w-3.5 text-slate-400" />
                معاينة مستند - {previewDoc.title}
              </p>
              <p className="text-xs font-bold">{previewDoc.title}</p>
            </div>
          </div>
        </div>
      )}

    </DashboardLayout>
  );
}
