import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowRight, Printer, AlertTriangle, FileText, CheckCircle2, TrendingUp, TrendingDown, Minus, Eye, PenTool, Check, Loader2 } from "lucide-react";
import { useDocumentTitle } from "@/contexts/DocumentTitleContext";
import { numberToArabicText } from "@shared/tafqeet";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";


function toHijriDate(date: Date): string {
  const gregorianYear = date.getFullYear();
  const gregorianMonth = date.getMonth() + 1;
  const gregorianDay = date.getDate();
  
  const hijriYear = Math.floor((gregorianYear - 622) * (33 / 32));
  const hijriMonth = ((gregorianMonth + 9) % 12) + 1;
  const hijriDay = gregorianDay;
  
  return `${hijriDay}/${hijriMonth}/${hijriYear}`;
}

function formatGregorianDate(date: Date): string {
  return `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`;
}

const getFileSrc = (fileItem: any): string => {
  if (!fileItem) return "";
  
  if (typeof fileItem === "string") {
    const trimmed = fileItem.trim();
    if (trimmed.startsWith("data:") || trimmed.startsWith("http") || trimmed.startsWith("/")) {
      return trimmed;
    }
    if (trimmed.startsWith("UklGR") || trimmed.startsWith("iVBORw0KGgo") || trimmed.startsWith("/9j/")) {
      let mime = "image/png";
      if (trimmed.startsWith("UklGR")) mime = "image/webp";
      else if (trimmed.startsWith("/9j/")) mime = "image/jpeg";
      return `data:${mime};base64,${trimmed}`;
    }
    return `/uploads/${trimmed}`;
  }

  if (typeof fileItem === "object") {
    const b64 = fileItem.base64 || fileItem.fileData || fileItem.data;
    if (b64 && typeof b64 === "string" && b64.trim().length > 0) {
      const trimmedB64 = b64.trim();
      if (trimmedB64.startsWith("data:")) return trimmedB64;
      
      const name = (fileItem.fileName || fileItem.name || "").toLowerCase();
      let mime = "image/png";
      if (name.endsWith(".webp") || trimmedB64.startsWith("UklGR")) {
        mime = "image/webp";
      } else if (name.endsWith(".jpg") || name.endsWith(".jpeg") || trimmedB64.startsWith("/9j/")) {
        mime = "image/jpeg";
      } else if (name.endsWith(".pdf") || trimmedB64.startsWith("JVBERi0")) {
        mime = "application/pdf";
      } else if (name.endsWith(".gif")) {
        mime = "image/gif";
      } else if (name.endsWith(".svg")) {
        mime = "image/svg+xml";
      }
      return `data:${mime};base64,${trimmedB64}`;
    }

    if (fileItem.url && typeof fileItem.url === "string" && fileItem.url.trim().length > 0) {
      const u = fileItem.url.trim();
      return u.startsWith("http") || u.startsWith("/") || u.startsWith("data:") ? u : `/uploads/${u}`;
    }
    if (fileItem.path && typeof fileItem.path === "string" && fileItem.path.trim().length > 0) {
      const p = fileItem.path.trim();
      return p.startsWith("http") || p.startsWith("/") || p.startsWith("data:") ? p : `/uploads/${p}`;
    }

    const name = fileItem.fileName || fileItem.name;
    if (name && typeof name === "string" && name.trim().length > 0) {
      return `/uploads/${name.trim()}`;
    }
  }
  return "";
};

const checkIsImage = (fileItem: any): boolean => {
  if (!fileItem) return false;
  if (typeof fileItem === "object" && fileItem.type && typeof fileItem.type === "string" && fileItem.type.startsWith("image/")) {
    return true;
  }
  const src = getFileSrc(fileItem);
  const fileName = typeof fileItem === "object" ? (fileItem.name || fileItem.fileName || "") : (typeof fileItem === "string" ? fileItem : "");
  const combined = (src + " " + fileName).toLowerCase();

  return (
    combined.includes("data:image/") ||
    combined.includes("blob:") ||
    combined.includes(".png") ||
    combined.includes(".jpg") ||
    combined.includes(".jpeg") ||
    combined.includes(".webp") ||
    combined.includes(".gif") ||
    combined.includes(".svg") ||
    combined.includes(".bmp") ||
    combined.includes(".avif") ||
    combined.includes("site_photo") ||
    combined.includes("proof-documents") ||
    combined.includes("image") ||
    combined.includes("screenshot")
  );
};

const checkIsPdf = (fileItem: any): boolean => {
  if (!fileItem) return false;
  if (typeof fileItem === "object" && fileItem.type && typeof fileItem.type === "string" && fileItem.type.includes("pdf")) {
    return true;
  }
  const src = getFileSrc(fileItem);
  const fileName = typeof fileItem === "object" ? (fileItem.name || fileItem.fileName || "") : (typeof fileItem === "string" ? fileItem : "");
  const combined = (src + " " + fileName).toLowerCase();
  return combined.includes("data:application/pdf") || combined.includes(".pdf");
};

const openAttachment = (url: string) => {
  if (url.startsWith("data:")) {
    try {
      const parts = url.split(",");
      const mime = parts[0].match(/:(.*?);/)?.[1] || "application/octet-stream";
      const bstr = atob(parts[1]);
      let n = bstr.length;
      const u8arr = new Uint8Array(n);
      while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
      }
      const blob = new Blob([u8arr], { type: mime });
      const blobUrl = URL.createObjectURL(blob);
      window.open(blobUrl, "_blank");
    } catch (e) {
      console.error("Failed to open data URI in new tab", e);
      const link = document.createElement("a");
      link.href = url;
      link.download = "attachment";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  } else {
    window.open(url, "_blank");
  }
};

export default function ProgressReportPrint() {
  const params = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const handleBack = () => {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      navigate("/progress-reports");
    }
  };
  const reportId = params.id ? parseInt(params.id) : undefined;
  const [previewFile, setPreviewFile] = useState<string | null>(null);

  // جلب تفاصيل التقرير
  const { data: report, isLoading: isReportLoading, refetch: refetchReport } = trpc.progressReports.getById.useQuery(
    { id: reportId || 0 },
    { enabled: !!reportId }
  );

  const { user: currentUser } = useAuth();
  const userPermissionsList = currentUser?.permissions || [];
  const isExecutiveDirectorRole = 
    currentUser?.role === "general_manager" ||
    currentUser?.role === "executive_director" ||
    (currentUser as any)?.customRole?.nameAr === "المدير التنفيذي" ||
    (currentUser as any)?.customRole?.nameEn?.toLowerCase() === "executive director";

  const [showCreatorSignature, setShowCreatorSignature] = useState(true);
  const [showExecutiveDirectorSignature, setShowExecutiveDirectorSignature] = useState(true);

  useEffect(() => {
    if (report) {
      if ((report as any).showCreatorSignature !== undefined && (report as any).showCreatorSignature !== null) {
        setShowCreatorSignature(Boolean((report as any).showCreatorSignature));
      }
      if ((report as any).showExecutiveDirectorSignature !== undefined && (report as any).showExecutiveDirectorSignature !== null) {
        setShowExecutiveDirectorSignature(Boolean((report as any).showExecutiveDirectorSignature));
      }
    }
  }, [report?.showCreatorSignature, report?.showExecutiveDirectorSignature]);

  const updateSignatureVisibilityMutation = trpc.progressReports.updateSignatureVisibility.useMutation({
    onSuccess: () => {
      toast.success("تم تحديث إعدادات إظهار التوقيع");
    },
  });

  const approveReportMutation = trpc.progressReports.approve.useMutation({
    onSuccess: (data) => {
      toast.success(data?.message || "تم اعتماد التقرير بنجاح");
      refetchReport();
    },
    onError: (err) => {
      toast.error(err.message || "حدث خطأ أثناء اعتماد التقرير");
    },
  });

  // جلب تفاصيل المشروع
  const { data: project, isLoading: isProjectLoading } = trpc.projects.getById.useQuery(
    { id: report?.projectId || 0 },
    { enabled: !!report?.projectId }
  );

  // جلب إعدادات الجمعية
  const { data: orgSettings } = trpc.organization.getSettings.useQuery();

  // تغيير عنوان التوثيق ليتطابق مع اسم التقرير عند الطباعة والتنزيل (يحدد اسم ملف الـ PDF)
  useDocumentTitle(report ? `${report.reportNumber} - ${report.title}` : "طباعة تقرير الإنجاز");

  const handlePrint = () => {
    const prevTitle = document.title;
    if (report) {
      document.title = `${report.reportNumber} - ${report.title}`;
    }
    window.print();
    setTimeout(() => {
      document.title = prevTitle;
    }, 1000);
  };

  if (isReportLoading || isProjectLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="flex items-center justify-center min-h-screen" dir="rtl">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">تقرير الإنجاز غير موجود</h2>
          <Button onClick={handleBack}>
            العودة لتقارير الإنجاز
          </Button>
        </div>
      </div>
    );
  }

  const reportDate = new Date(report.reportDate || new Date());
  const contract = project?.contracts?.[0];
  const contractAmount = parseFloat(contract?.amount || "0");
  
  // استخلاص اسم الدفعة والمبالغ من محتوى التقرير
  const workSummaryText = report.workSummary || "";
  const paymentIdMatch = workSummaryText.match(/\[معرف الدفعة:\s*([^\]]+)\]/);
  const paymentId = paymentIdMatch ? paymentIdMatch[1] : null;

  const payment = project?.payments?.find((p: any) => 
    p.id?.toString() === paymentId || 
    paymentId?.toString().includes(p.id?.toString()) ||
    report.title.includes(p.description || p.paymentNumber)
  );

  const agreedPaymentAmount = payment ? parseFloat(payment.amount || "0") : 0;
  const actualBudgetSpent = parseFloat(report.budgetSpent || "0");
  const variance = report.variance ?? 0;
  const orgLocation = [orgSettings?.city, orgSettings?.address].filter(Boolean).join(" - ") || "—";

  // استخلاص الأعمال المنفذة فعلياً فقط لظهورها في هذا القسم
  const getActualWorkDone = (combined: string) => {
    if (!combined) return "";
    
    // البحث عن قسم الأعمال المنفذة فعلياً باستخدام تعبير نمطي يدعم كافة نهايات الأسطر
    const regex = /(?:الأعمال المنفذة فعلياً|المنفذة فعلياً):\r?\n([\s\S]*?)(?:\r?\n\r?\[معرف الدفعة:|$)/;
    const match = combined.match(regex);
    if (match && match[1].trim()) {
      return match[1].trim();
    }
    
    // حالة احتياطية إذا كان العنوان موجوداً بدون سطر جديد مباشر
    const regexNoNewline = /(?:الأعمال المنفذة فعلياً|المنفذة فعلياً):\s*([\s\S]*?)(?:\r?\n\r?\[معرف الدفعة:|$)/;
    const matchNoNewline = combined.match(regexNoNewline);
    if (matchNoNewline && matchNoNewline[1].trim()) {
      return matchNoNewline[1].trim();
    }

    // إذا كان النص يحتوي على ترويسة الأعمال المجدولة فقط، فلا نعرضها لأن المستخدم يطلب الأعمال المنجزة فعلياً فقط
    if (combined.includes("الأعمال المجدولة للدفعة:")) {
      return "لا يوجد تفاصيل أعمال منفذة فعلياً.";
    }

    return combined.replace(/\[معرف الدفعة:\s*[^\]]+\]/g, "").trim();
  };

  const cleanWorkSummary = getActualWorkDone(workSummaryText);

  const isReportStage1Approved = report?.status === "pending_executive" || report?.status === "approved" || !!report?.managerApprovedAt;
  const isReportStage2Approved = report?.status === "approved" || !!report?.approvedAt;
  const isExceptionApproved = Boolean(report?.isException);

  let rawCreatorName = report?.creatorSignatureName;
  if (isExceptionApproved && rawCreatorName) {
    rawCreatorName = rawCreatorName.replace(/^\[استثناء\]:\s*/, "");
  }

  const resolvedSignatureName = isReportStage1Approved
    ? (rawCreatorName || report?.projectManagerName || report?.createdByName || project?.managerName || "—")
    : (report?.projectManagerName || project?.managerName || "—");

  const resolvedSignatureDepartment = isReportStage1Approved 
    ? (report?.creatorSignatureDepartment || "مدير المشروع")
    : "مدير المشروع";

  const resolvedSignatureUrl = report?.creatorSignatureUrl || report?.projectManagerSignatureUrl || null;

  const executiveDirectorDepartment = isReportStage2Approved
    ? ((report as any)?.approvedBySignatureDepartment || "المدير التنفيذي")
    : "المدير التنفيذي";

  const executiveDirectorName = isReportStage2Approved
    ? ((report as any)?.approvedBySignatureName || report?.approvedByName || orgSettings?.authorizedSignatory || orgSettings?.executiveDirectorName || "م. عبدالهادي آل فائق")
    : (orgSettings?.authorizedSignatory || orgSettings?.executiveDirectorName || "م. عبدالهادي آل فائق");

  const executiveDirectorSignatureUrl = (report as any)?.approvedBySignatureUrl || (isExecutiveDirectorRole ? (currentUser as any)?.signatureUrl : null);

  const canApproveReport = (() => {
    if (!report || !currentUser) return false;
    if (report.status === "approved" || report.status === "rejected") return false;

    if (report.status === "draft" || report.status === "submitted" || report.status === "pending") {
      const isProjectManager = project?.managerId === currentUser.id;
      const isSuperAdmin = currentUser.role === "super_admin";
      return isProjectManager || isSuperAdmin;
    }

    if (report.status === "pending_executive") {
      return isExecutiveDirectorRole || currentUser.role === "super_admin";
    }

    return false;
  })();

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@200;300;400;500;600;700;800;900&display=swap');

        * {
          font-family: 'Cairo', system-ui, -apple-system, sans-serif !important;
        }

        @media print {
          @page {
            size: A4 portrait;
            margin: 8mm 6mm !important;
          }
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            box-sizing: border-box !important;
            font-family: 'Cairo', system-ui, -apple-system, sans-serif !important;
          }
          html, body {
            width: 100% !important;
            height: auto !important;
            min-height: 100% !important;
            background-color: white !important;
            color: black !important;
            margin: 0 !important;
            padding: 0 !important;
            overflow: visible !important;
          }
          .max-w-\\[210mm\\] {
            width: 100% !important;
            max-width: 100% !important;
            padding: 0 !important;
            margin: 0 auto !important;
          }
          .border-\\[3px\\] {
            border-width: 2px !important;
            padding: 12px !important;
            margin: 0 !important;
            box-shadow: none !important;
            height: auto !important;
          }
          .section-block, tr, .break-inside-avoid {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          h1, h2, h3, h4 {
            page-break-after: avoid !important;
            break-after: avoid !important;
          }
          .print\\:hidden {
            display: none !important;
          }
          .print\\:overflow-visible {
            overflow: visible !important;
          }
        }
      `}</style>

      {/* أزرار التحكم والخيارات */}
      <div className="print:hidden w-full bg-white/90 backdrop-blur border-b p-3 sticky top-0 z-50 flex flex-wrap justify-between items-center gap-2 sm:fixed sm:top-4 sm:right-4 sm:w-auto sm:bg-transparent sm:backdrop-blur-none sm:border-0 sm:p-0 sm:justify-end">
        <Button variant="outline" onClick={handleBack} className="bg-white border shadow-sm sm:bg-white/90 font-semibold">
          <ArrowRight className="ml-2 h-4 w-4" />
          رجوع
        </Button>
        <Button onClick={handlePrint} className="shadow-md gradient-primary text-white font-semibold">
          <Printer className="ml-2 h-4 w-4" />
          طباعة التقرير / PDF
        </Button>

        {/* زر اعتماد تقرير الإنجاز */}
        {canApproveReport && (
          <Button
            onClick={() => approveReportMutation.mutate({ id: report.id })}
            disabled={approveReportMutation.isPending}
            className="flex-1 sm:flex-none bg-emerald-600 hover:bg-emerald-700 text-white font-bold animate-pulse"
          >
            {approveReportMutation.isPending ? (
              <Loader2 className="h-4 w-4 ml-2 animate-spin" />
            ) : (
              <Check className="h-4 w-4 ml-2" />
            )}
            اعتماد تقرير الإنجاز
          </Button>
        )}

        {/* أدوات إظهار / إخفاء التواقيع */}
        {(() => {
          const isProjectManager = currentUser?.id === project?.managerId;
          const isReportStage1Approved = report?.status === "pending_executive" || report?.status === "approved" || !!report?.managerApprovedAt;
          const isReportStage2Approved = report?.status === "approved" || !!report?.approvedAt;

          const isExceptionApprover = report?.exceptionApprovedBy
            ? currentUser?.id === report?.exceptionApprovedBy
            : (currentUser?.role === "super_admin" || userPermissionsList.includes("progress_reports.exception_approve") || userPermissionsList.includes("disbursements.exception_approve"));

          const canControlCreatorSig = (isProjectManager || currentUser?.role === "super_admin" || (report?.isException && isExceptionApprover)) && !!resolvedSignatureUrl && isReportStage1Approved;
          const canControlExecSig = (isExecutiveDirectorRole || currentUser?.role === "super_admin") && !!executiveDirectorSignatureUrl && isReportStage2Approved;

          return (
            <>
              {canControlCreatorSig && (
                <label
                  htmlFor="show-creator-sig"
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white shadow-sm hover:bg-slate-50 transition-colors cursor-pointer select-none text-xs font-medium text-slate-700"
                >
                  <PenTool className={`w-3.5 h-3.5 ${showCreatorSignature ? "text-emerald-600" : "text-slate-400"}`} />
                  <span>توقيع مدير المشروع</span>
                  <Checkbox
                    id="show-creator-sig"
                    checked={showCreatorSignature}
                    onCheckedChange={(checked) => {
                      const val = !!checked;
                      setShowCreatorSignature(val);
                      if (report?.id) {
                        updateSignatureVisibilityMutation.mutate({ id: report.id, showCreatorSignature: val });
                      }
                    }}
                    className="scale-90"
                  />
                </label>
              )}

              {canControlExecSig && (
                <label
                  htmlFor="show-exec-sig"
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white shadow-sm hover:bg-slate-50 transition-colors cursor-pointer select-none text-xs font-medium text-slate-700"
                >
                  <PenTool className={`w-3.5 h-3.5 ${showExecutiveDirectorSignature ? "text-emerald-600" : "text-slate-400"}`} />
                  <span>توقيع المدير التنفيذي</span>
                  <Checkbox
                    id="show-exec-sig"
                    checked={showExecutiveDirectorSignature}
                    onCheckedChange={(checked) => {
                      const val = !!checked;
                      setShowExecutiveDirectorSignature(val);
                      if (report?.id) {
                        updateSignatureVisibilityMutation.mutate({ id: report.id, showExecutiveDirectorSignature: val });
                      }
                    }}
                    className="scale-90"
                  />
                </label>
              )}
            </>
          );
        })()}
      </div>

      {/* تصميم الصفحة المطبوعة A4 */}
      <div className="min-h-screen bg-white print:p-0 font-sans" dir="rtl">
        <div className="w-full max-w-[210mm] mx-auto p-4 sm:p-8 print:p-0 print:max-w-none">
          
          {/* إطار مزدوج فاخر للمستند يشبه قالب العقود */}
          <div className="w-full border-[3px] border-[#1a5f4a] p-4 sm:p-6 rounded-lg relative overflow-hidden bg-white shadow-lg print:shadow-none print:border-[2px] print:p-4 print:overflow-visible">
            {/* خط ذهبي داخلي رفيع للإطار */}
            <div className="absolute inset-1.5 border border-[#d4a574] rounded pointer-events-none print:hidden"></div>
            
            {/* محتوى المستند */}
            <div className="relative z-10 print:overflow-visible">
              
              {/* الترويسة - الشعار والتاريخ مثل قالب العقد */}
              <div className="flex flex-col sm:flex-row justify-between items-center sm:items-start gap-4 mb-6">
                <div className="flex items-center gap-3">
                  {orgSettings?.logoUrl ? (
                    <img src={orgSettings.logoUrl} alt="شعار الجمعية" className="h-16 w-auto print:h-14" />
                  ) : (
                    <div className="w-16 h-16 bg-primary/10 rounded-lg flex items-center justify-center print:w-14 print:h-14">
                      <span className="text-primary font-bold text-2xl">تمام</span>
                    </div>
                  )}
                  <div>
                    <div className="text-base font-bold text-primary print:text-sm">
                      {orgSettings?.officialReportsName || ""}
                    </div>
                    <div className="text-xs text-gray-500">إدارة المشاريع والصيانة</div>
                  </div>
                </div>

                <div className="text-xs space-y-1 text-center sm:text-left sm:pl-5 print:pl-5">
                  <div className="flex gap-2 justify-center sm:justify-end">
                    <span className="font-bold">التاريخ:</span>
                    <span className="border-b border-dotted border-gray-400 px-3">{formatGregorianDate(reportDate)} م</span>
                  </div>
                  <div className="flex gap-2 justify-center sm:justify-end">
                    <span className="font-bold">رقم التقرير:</span>
                    <span className="border-b border-dotted border-gray-400 px-3 font-mono">{report.reportNumber}</span>
                  </div>
                </div>
              </div>

              {/* البانر الرئيسي - مثل قالب العقد */}
              <div 
                className="text-center py-4 px-6 mb-6 rounded-lg"
                style={{ backgroundColor: '#1a5f4a', color: 'white' }}
              >
                <h1 className="text-xl sm:text-2xl font-bold">
                  تقرير إنجاز دفعة مالية
                </h1>
                <p className="text-xs sm:text-sm opacity-90 mt-1">
                  {report.title}
                </p>
              </div>

              {/* القسم الأول: بيانات المشروع والتقرير */}
              <div className="mb-6">
                <h3 
                  className="font-bold py-2 px-4 rounded mb-3 flex items-center leading-none text-sm sm:text-base"
                  style={{ backgroundColor: '#d4a574', color: '#5d4037' }}
                >
                  1. بيانات المشروع العامة:
                </h3>
                <div className="overflow-x-auto w-full scrollbar-hide">
                  <table className="w-full border-collapse text-xs sm:text-sm">
                  <tbody>
                    <tr className="border-b">
                      <td className="py-2.5 bg-gray-50/50 font-bold w-36 text-gray-600">اسم المشروع:</td>
                      <td className="py-2.5 px-3 font-semibold text-gray-900">{(report.projectName as string) || "-"}</td>
                      <td className="py-2.5 bg-gray-50/50 font-bold w-36 text-gray-600">قيمة العقد:</td>
                      <td className="py-2.5 px-3 font-semibold text-gray-900">
                        {contractAmount > 0 ? `${contractAmount.toLocaleString()} ريال` : "—"}
                      </td>
                    </tr>
                    <tr className="border-b">
                      <td className="py-2.5 bg-gray-50/50 font-bold text-gray-600">الموقع/المدينة:</td>
                      <td className="py-2.5 px-3 text-gray-900">{orgLocation}</td>
                      <td className="py-2.5 bg-gray-50/50 font-bold text-gray-600">الطرف الثاني (المقاول):</td>
                      <td className="py-2.5 px-3 text-gray-900">{contract?.supplierName || "—"}</td>
                    </tr>
                    <tr className="border-b">
                      <td className="py-2.5 bg-gray-50/50 font-bold text-gray-600">معد التقرير:</td>
                      <td className="py-2.5 px-3 text-gray-900">{(report.createdByName as string) || "—"}</td>
                      <td className="py-2.5 bg-gray-50/50 font-bold text-gray-600">حالة التقرير:</td>
                      <td className="py-2.5 px-3">
                        <span className="font-bold text-primary">
                          {report.status === "approved" ? "معتمد ومصادق عليه" : "قيد المراجعة والاعتماد"}
                        </span>
                      </td>
                    </tr>
                  </tbody>
                </table>
                </div>
              </div>

              {/* القسم الثاني: تفاصيل الدفعة المالية ونسب الإنجاز */}
              <div className="mb-6">
                <h3 
                  className="font-bold py-2 px-4 rounded mb-3 flex items-center leading-none text-sm sm:text-base"
                  style={{ backgroundColor: '#d4a574', color: '#5d4037' }}
                >
                  2. القيم المالية ونسب الإنجاز المحققة:
                </h3>
                <div className="overflow-x-auto w-full scrollbar-hide">
                  <table className="w-full border text-xs sm:text-sm mb-4">
                  <thead>
                    <tr className="bg-gray-100/80 border-b">
                      <th className="p-3 text-right font-bold w-1/3">البيان</th>
                      <th className="p-3 text-center font-bold w-1/3">المخطط / المتفق عليه</th>
                      <th className="p-3 text-center font-bold w-1/3">الفعلي / المصروف</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b">
                      <td className="p-3 font-semibold bg-gray-50/30">نسبة الإنجاز المحققة</td>
                      <td className="p-3 text-center font-mono text-blue-700">{report.plannedProgress}%</td>
                      <td className="p-3 text-center font-bold text-emerald-700 font-mono">{report.actualProgress}%</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-semibold bg-gray-50/30">الانحراف المعياري للنسبة</td>
                      <td className="p-3 text-center text-gray-500 font-medium">—</td>
                      <td className={`p-3 text-center font-bold font-mono ${variance >= 0 ? "text-green-700" : "text-red-700"}`}>
                        {variance > 0 ? `+${variance}%` : `${variance}%`}
                      </td>
                    </tr>
                  </tbody>
                </table>
                </div>

                {actualBudgetSpent > 0 && actualBudgetSpent < agreedPaymentAmount && (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-xs leading-relaxed">
                    <strong>تنويه مالي:</strong> تم صرف دفعة مالية بقيمة أقل من القيمة المتفقة عليها بفرق قدره <strong>{(agreedPaymentAmount - actualBudgetSpent).toLocaleString()} ريال</strong>. تم تعديل الحسابات المالية للمشروع آلياً لإتاحة جدولة دفعات إضافية لتغطية الفارق المتبقي من قيمة العقد.
                  </div>
                )}
              </div>

              {/* القسم الثالث: ملخص الأعمال المنفذة */}
              <div className="mb-6 break-inside-avoid">
                <h3 
                  className="font-bold py-2 px-4 rounded mb-3 flex items-center leading-none text-sm sm:text-base"
                  style={{ backgroundColor: '#1a5f4a', color: 'white' }}
                >
                  ملخص الأعمال المنجزة والخطوات:
                </h3>
                <div className="border rounded-lg p-4 bg-gray-50 text-xs sm:text-sm text-gray-800 leading-relaxed whitespace-pre-wrap break-words [word-break:break-word]">
                  {cleanWorkSummary || "لا يوجد تفاصيل أعمال مسجلة."}
                </div>
              </div>

              {/* القسم الرابع: التحديات والمعوقات والتوصيات */}
              {(report.challenges || report.nextSteps || report.recommendations) && (
                <div className="mb-6 break-inside-avoid">
                  <h3 
                    className="font-bold py-2 px-4 rounded mb-3 flex items-center leading-none text-sm sm:text-base"
                    style={{ backgroundColor: '#1a5f4a', color: 'white' }}
                  >
                    3. التحديات، الخطوات القادمة والتوصيات:
                  </h3>
                  <div className="space-y-4">
                    {report.challenges && (
                      <div>
                        <h4 className="font-bold text-xs sm:text-sm text-gray-700 mb-1">■ التحديات والمعوقات:</h4>
                        <p className="text-xs sm:text-sm text-gray-600 bg-gray-50/50 p-2 rounded-md border border-gray-100 whitespace-pre-wrap break-words [word-break:break-word]">{report.challenges}</p>
                      </div>
                    )}
                    {report.nextSteps && (
                      <div>
                        <h4 className="font-bold text-xs sm:text-sm text-gray-700 mb-1">■ الخطوات القادمة:</h4>
                        <p className="text-xs sm:text-sm text-gray-600 bg-gray-50/50 p-2 rounded-md border border-gray-100 whitespace-pre-wrap break-words [word-break:break-word]">{report.nextSteps}</p>
                      </div>
                    )}
                    {report.recommendations && (
                      <div>
                        <h4 className="font-bold text-xs sm:text-sm text-gray-700 mb-1">■ التوصيات والمقترحات:</h4>
                        <p className="text-xs sm:text-sm text-gray-600 bg-gray-50/50 p-2 rounded-md border border-gray-100 whitespace-pre-wrap break-words [word-break:break-word]">{report.recommendations}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {(() => {
                try {
                  const getFilesArray = (fieldVal: any) => {
                    if (!fieldVal) return [];
                    let arr = fieldVal;
                    while (typeof arr === 'string') {
                      arr = JSON.parse(arr);
                    }
                    return Array.isArray(arr) ? arr : [];
                  };

                  const photosArr = getFilesArray(report.photos);
                  const attachmentsArr = getFilesArray(report.attachments);
                  const allFiles = [...photosArr, ...attachmentsArr].filter(Boolean);

                  if (allFiles.length > 0) {
                    return (
                      <div className="mb-6 break-inside-avoid">
                        <h3 
                          className="font-bold py-2 px-4 rounded mb-3 flex items-center leading-none text-sm sm:text-base"
                          style={{ backgroundColor: '#1a5f4a', color: 'white' }}
                        >
                          4. مرفقات التقرير وصور الموقع المنجز:
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border rounded-lg p-4 bg-gray-50/50">
                          {allFiles.map((photoItem: any, index: number) => {
                            const fileSrc = getFileSrc(photoItem);
                            const fileName = typeof photoItem === "object" ? (photoItem.name || photoItem.fileName || `مرفق رقم ${index + 1}`) : (typeof photoItem === "string" ? photoItem : `مرفق رقم ${index + 1}`);
                            const isImage = checkIsImage(photoItem);
                            const isPdf = checkIsPdf(photoItem);
                            
                            if (isImage) {
                              return (
                                <div 
                                  key={index} 
                                  className="flex flex-col items-center justify-center bg-white border p-2.5 rounded-lg shadow-xs w-full cursor-pointer hover:border-primary/40 hover:shadow-md transition-all duration-200 group relative overflow-hidden"
                                  onClick={() => setPreviewFile(fileSrc)}
                                >
                                  <img src={fileSrc} alt={fileName} className="w-full max-h-64 object-contain rounded-md" />
                                  <span className="text-[10px] text-gray-500 mt-2 font-semibold">{fileName}</span>
                                  
                                  {/* Premium Hover Overlay Indicator */}
                                  <div className="absolute inset-0 bg-black/5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none print:hidden">
                                    <div className="bg-white/95 text-primary px-3 py-1.5 rounded-full shadow-sm flex items-center gap-1.5 text-xs font-bold transform translate-y-2 group-hover:translate-y-0 transition-all duration-200">
                                      <Eye className="w-3.5 h-3.5" />
                                      <span>تكبير وعرض الصورة</span>
                                    </div>
                                  </div>
                                </div>
                              );
                            }

                            const downloadUrl = fileSrc.startsWith("data:") ? fileSrc : (fileSrc.startsWith("http") ? fileSrc : `${window.location.origin}${fileSrc}`);
                            return (
                              <a 
                                key={index}
                                href={downloadUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex flex-col items-center justify-center bg-white border p-2.5 rounded-lg shadow-xs w-full cursor-pointer hover:border-primary/40 hover:shadow-md transition-all duration-200 group relative overflow-hidden text-center decoration-transparent"
                              >
                                <div className="w-full h-32 flex flex-col items-center justify-center rounded-md bg-muted/20 border border-dashed text-primary font-bold text-xs gap-1.5 p-3">
                                  <FileText className="w-8 h-8 text-primary" />
                                  <span className="text-gray-700 font-bold">{fileName || (isPdf ? "مستند PDF" : "مستند مرفق")}</span>
                                  <span className="text-[10px] text-primary underline print:hidden">انقر لعرض الملف في علامة تبويب جديدة</span>
                                </div>
                                <span className="text-[10px] text-gray-500 mt-2 font-semibold">{fileName}</span>
                              </a>
                            );
                          })}
                        </div>
                      </div>
                    );
                  }
                } catch (e) {
                  console.error("Error parsing photos for print view", e);
                }
                return null;
              })()}

              {/* القسم الخامس: التوقيعات والاعتماد (الشكل الأصلي المطور) */}
              <div className="mt-12 break-inside-avoid">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6 text-right">
                  {/* مُعِد الطلب / مدير المشروع */}
                  <div className="border border-[#1a5f4a]/20 rounded-lg p-4 bg-gray-50/50">
                    <div className="font-bold text-[#1a5f4a] border-b border-[#1a5f4a]/20 pb-2 mb-3 text-sm">
                      مُعِد التقرير :
                    </div>
                    <div className="space-y-2 text-xs">
                      <div>
                        <span className="font-semibold text-gray-600">الاسم: </span>
                        <span className="text-gray-900 font-bold">{resolvedSignatureName}</span>
                      </div>
                      <div>
                        <span className="font-semibold text-gray-600">الصفة: </span>
                        <span className="text-gray-900">{resolvedSignatureDepartment}</span>
                      </div>
                      <div className="pt-2 flex items-center gap-2">
                        <span className="font-semibold text-gray-600">التوقيع : </span>
                        {(showCreatorSignature && resolvedSignatureUrl && (report.status === "pending_executive" || report.status === "approved")) ? (
                          <div className="h-10 flex items-center justify-start overflow-hidden">
                            <img 
                              src={resolvedSignatureUrl} 
                              alt="توقيع مدير المشروع" 
                              className="max-h-10 max-w-[160px] object-contain" 
                            />
                          </div>
                        ) : (
                          <span className="text-gray-400 font-serif">..........................................</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* يُعتمد / المدير التنفيذي */}
                  <div className="border border-[#d4a574]/20 rounded-lg p-4 bg-gray-50/50">
                    <div className="font-bold text-[#5d4037] border-b border-[#d4a574]/20 pb-2 mb-3 text-sm">
                      يُعتمد :
                    </div>
                    <div className="space-y-2 text-xs">
                      <div>
                        <span className="font-semibold text-gray-600">الاسم: </span>
                        <span className="text-gray-900 font-bold">{executiveDirectorName}</span>
                      </div>
                      <div>
                        <span className="font-semibold text-gray-600">الصفة: </span>
                        <span className="text-gray-900">{executiveDirectorDepartment}</span>
                      </div>
                      <div className="pt-2 flex items-center gap-2">
                        <span className="font-semibold text-gray-600">التوقيع : </span>
                        {(showExecutiveDirectorSignature && executiveDirectorSignatureUrl && (report.status === "approved")) ? (
                          <div className="h-10 flex items-center justify-start overflow-hidden">
                            <img
                              src={executiveDirectorSignatureUrl}
                              alt="توقيع المدير التنفيذي"
                              className="max-h-10 max-w-[160px] object-contain"
                            />
                          </div>
                        ) : (
                          <span className="text-gray-400 font-serif">..........................................</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* تذييل المستند */}
              <div className="mt-12 pt-4 border-t text-center text-gray-400 text-[10px]">
                <p>تم توليد هذا التقرير آلياً من نظام بوابة تمام الإلكترونية للعناية بالمساجد.</p>
                <p className="mt-1">تاريخ الطباعة: {new Date().toLocaleDateString("ar-SA")} - صفحة 1 من 1</p>
              </div>

            </div> {/* نهاية محتوى المستند */}
          </div> {/* نهاية الإطار المزدوج الفاخر */}

        </div>
      </div>

      <Dialog open={!!previewFile} onOpenChange={(open) => !open && setPreviewFile(null)}>
        <DialogContent 
          className="w-[95vw] !max-w-[95vw] h-[95vh] !max-h-[95vh] !flex !flex-col p-2 sm:p-5 rounded-xl border bg-background/98 backdrop-blur-md z-50 shadow-2xl" 
          dir="rtl"
        >
          <DialogHeader className="text-right flex items-center justify-between flex-row pe-10 pb-2 border-b">
            <DialogTitle className="text-right text-base font-bold">معاينة المرفق - كامل الشاشة</DialogTitle>
          </DialogHeader>
          {previewFile && (
            <div className="flex-1 flex items-center justify-center p-1 sm:p-3 min-h-0 overflow-hidden w-full">
              {checkIsImage(previewFile) ? (
                <img src={previewFile} alt="معاينة المرفق" className="max-w-full max-h-full object-contain rounded-md shadow-sm" />
              ) : checkIsPdf(previewFile) ? (
                <iframe src={previewFile} className="w-full h-full border rounded-lg shadow-sm" title="معاينة مستند PDF" />
              ) : (
                <div className="flex flex-col items-center justify-center p-12 bg-muted/20 border border-dashed rounded-lg text-primary gap-4 w-full max-w-md">
                  <FileText className="w-16 h-16 text-muted-foreground" />
                  <span className="font-bold text-foreground">مستند غير مدعوم للمعاينة المباشرة</span>
                  <a href={previewFile} download="مرفق_تمام" className="text-sm underline font-semibold text-primary hover:text-primary/80">
                    تحميل وتنزيل الملف
                  </a>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

    </>
  );
}
