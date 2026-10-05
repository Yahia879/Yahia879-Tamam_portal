import { useState, useMemo } from "react";
import { useParams, useLocation, Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useDocumentTitle } from "@/contexts/DocumentTitleContext";
import { Button } from "@/components/ui/button";
import { SaudiRiyal } from "@/components/SaudiRiyal";
import { numberToArabicText } from "@shared/tafqeet";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  ArrowRight,
  Printer,
  CheckCircle,
  XCircle,
  ShieldCheck,
  ArrowUpRight,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";

function formatGregorianDate(date: Date): string {
  return `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()} م`;
}

export default function CustodyRequestPrint() {
  const params = useParams<{ id: string }>();
  const requestId = parseInt(params.id || "0", 10);
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const utils = trpc.useUtils();

  const [approveDialogOpen, setApproveDialogOpen] = useState(false);
  const [approvalNotes, setApprovalNotes] = useState("");
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");

  const { data: request, isLoading } = trpc.custody.getById.useQuery(
    { id: requestId },
    { enabled: requestId > 0 }
  );

  const { data: orgSettings } = trpc.organization.getSettings.useQuery();

  useDocumentTitle(
    request?.requestNumber ? `طلب صرف عهدة مالية رقم ${request.requestNumber}` : "طلب صرف عهدة مالية"
  );

  // صلاحية الاعتماد محصورة بالمدير التنفيذي فقط
  const canApprove = useMemo(() => {
    if (!user) return false;
    return (
      user.role === "executive_director" ||
      user.role === "general_manager" ||
      (user as any)?.customRole?.nameAr === "المدير التنفيذي" ||
      user.name === "المدير التنفيذي" ||
      user.email === "ceo@manarah.org.sa"
    );
  }, [user]);

  const approveMutation = trpc.custody.approve.useMutation({
    onSuccess: (data) => {
      toast.success(data.message);
      setApproveDialogOpen(false);
      setApprovalNotes("");
      utils.custody.getById.invalidate({ id: requestId });
      utils.custody.getAll.invalidate();
      utils.custody.getStats.invalidate();
    },
    onError: (err) => {
      toast.error(err.message || "حدث خطأ أثناء اعتماد الطلب");
    },
  });

  const rejectMutation = trpc.custody.reject.useMutation({
    onSuccess: (data) => {
      toast.success(data.message);
      setRejectDialogOpen(false);
      setRejectionReason("");
      utils.custody.getById.invalidate({ id: requestId });
      utils.custody.getAll.invalidate();
      utils.custody.getStats.invalidate();
    },
    onError: (err) => {
      toast.error(err.message || "حدث خطأ أثناء رفض الطلب");
    },
  });

  const handlePrint = () => {
    const prevTitle = document.title;
    if (request?.requestNumber) {
      document.title = `طلب صرف عهدة مالية رقم ${request.requestNumber}`;
    }
    window.print();
    setTimeout(() => {
      document.title = prevTitle;
    }, 1000);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!request) {
    return (
      <div className="flex items-center justify-center min-h-screen" dir="rtl">
        <div className="text-center">
          <h2 className="text-xl font-bold mb-2">طلب العهدة غير موجود</h2>
          <Button onClick={() => {
            if (window.history.length > 1) {
              window.history.back();
            } else {
              setLocation("/custody-requests");
            }
          }}>
            العودة لقائمة العهد المالية
          </Button>
        </div>
      </div>
    );
  }

  const numAmount = parseFloat(request.amount) || 0;
  const tafqeet = numberToArabicText(numAmount);
  const reqDate = request.createdAt ? new Date(request.createdAt) : new Date();

  const ROLE_NAMES: Record<string, string> = {
    super_admin: "المدير العام",
    system_admin: "مدير النظام",
    board_chairman: "رئيس مجلس الإدارة",
    board_member: "عضو مجلس الإدارة",
    general_manager: "المدير التنفيذي",
    executive_director: "المدير التنفيذي",
    financial_manager: "المدير المالي",
    financial: "الإدارة المالية",
    projects_office: "مكتب المشاريع",
    field_team: "الفريق الميداني",
    quick_response: "فريق الاستجابة السريعة",
    project_manager: "مدير المشروع",
    corporate_comm: "الاتصال المؤسسي",
    service_requester: "طالب الخدمة",
    procurement_officer: "مسؤول المشتريات",
  };

  // 1. بيانات مقدم الطلب الحية والمستندة إلى الملف الشخصي (/profile) بدون أي قيم نصية ثابتة
  const applicantSignatureName = 
    (request as any).applicantLiveSignatureName?.trim() ||
    request.applicantSignatureName?.trim() ||
    request.applicantName?.trim() ||
    "";

  const applicantSignatureDepartment =
    (request as any).applicantLiveSignatureDepartment?.trim() ||
    request.applicantSignatureDepartment?.trim() ||
    (request.applicantRole ? (ROLE_NAMES[request.applicantRole] || request.applicantRole) : "") ||
    "";

  const showApplicantSig = 
    (request as any).applicantShowSignatureInDocuments !== false &&
    (request as any).applicantShowSignatureInDocuments !== 0;

  const applicantSignatureUrl = showApplicantSig
    ? ((request as any).applicantLiveSignatureUrl || request.applicantSignatureUrl || null)
    : null;

  const applicantRoleName = (request.applicantRole && ROLE_NAMES[request.applicantRole]) || request.applicantRole || "—";

  // 2. بيانات المدير التنفيذي المستندة إلى الملف الشخصي (/profile) تظهر حتى قبل الاعتماد
  const isExecutiveApproved = request.status === "approved" || request.status === "converted_to_order";
  const execUser = (request as any).executiveUser;

  const executiveDepartment =
    request.executiveSignatureDepartment?.trim() ||
    execUser?.signatureDepartment?.trim() ||
    "المدير التنفيذي";

  const executiveName =
    request.executiveSignatureName?.trim() ||
    execUser?.signatureName?.trim() ||
    execUser?.name?.trim() ||
    "";

  const executiveSignatureUrl = isExecutiveApproved
    ? (request.executiveSignatureUrl || execUser?.signatureUrl || null)
    : null;

  return (
    <div className="min-h-screen bg-gray-100 py-3 sm:py-8 print:py-0 print:bg-white" dir="rtl">
      {/* أزرار التحكم والخيارات العلوية */}
      <div className="print:hidden w-full bg-white/95 dark:bg-slate-900/95 backdrop-blur border-b border-border/70 p-2 sm:p-3 sticky top-0 z-50 shadow-xs sm:fixed sm:top-4 sm:right-4 sm:w-auto sm:bg-transparent sm:backdrop-blur-none sm:border-0 sm:p-0 sm:shadow-none">
        <div className="flex flex-wrap items-center justify-between sm:justify-end gap-1.5 sm:gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              if (window.history.length > 1) {
                window.history.back();
              } else {
                setLocation("/custody-requests");
              }
            }}
            className="h-8 sm:h-9 bg-white dark:bg-slate-800 border shadow-xs sm:bg-white/90 font-bold text-xs sm:text-sm gap-1"
          >
            <ArrowRight className="h-3.5 w-3.5 ml-1" />
            رجوع
          </Button>

          <Button 
            size="sm"
            onClick={handlePrint} 
            className="h-8 sm:h-9 shadow-md gradient-primary text-white font-bold text-xs sm:text-sm gap-1.5"
          >
            <Printer className="h-3.5 w-3.5 ml-1" />
            <span>تنزيل PDF / طباعة</span>
          </Button>

          {/* أزرار الاعتماد للمدير التنفيذي / الإدارة العليا */}
          {canApprove && request.status === "pending_executive" && (
            <>
              <Button
                size="sm"
                onClick={() => setApproveDialogOpen(true)}
                className="h-8 sm:h-9 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm gap-1 animate-pulse"
              >
                <CheckCircle className="h-3.5 w-3.5 ml-1" />
                اعتماد وتحويل لأمر صرف
              </Button>

              <Button
                size="sm"
                variant="outline"
                onClick={() => setRejectDialogOpen(true)}
                className="h-8 sm:h-9 bg-white dark:bg-slate-800 border-rose-300 text-rose-600 hover:bg-rose-50 font-bold text-xs sm:text-sm gap-1"
              >
                <XCircle className="h-3.5 w-3.5 ml-1" />
                رفض الطلب
              </Button>
            </>
          )}

          {request.disbursementOrderId && (
            <Link href={`/disbursements/orders/${request.disbursementOrderId}/print`}>
              <Button
                size="sm"
                variant="outline"
                className="h-8 sm:h-9 bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100 font-bold text-xs sm:text-sm gap-1"
              >
                <span>عرض أمر الصرف</span>
                <ArrowUpRight className="h-3.5 w-3.5 ml-1" />
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* صفحة الطباعة - تصميم متوازن لصفحة A4 مع الإطار الأخضر والذهبي الفاخر المعتمد */}
      <div className="print-container w-full max-w-full sm:max-w-[210mm] mx-auto bg-white shadow-lg print:shadow-none p-2 sm:p-8 min-h-auto sm:min-h-[297mm] relative flex flex-col justify-start overflow-hidden">
        {/* إطار مزدوج فاخر للمستند */}
        <div className="print-inner border-[2px] sm:border-[3px] border-[#1a5f4a] p-2.5 sm:p-6 rounded-lg relative bg-white print:border-[2px] h-full flex-1 flex flex-col justify-between min-h-auto sm:min-h-[277mm]">
          {/* خط ذهبي داخلي رفيع للإطار */}
          <div className="absolute inset-1 border border-[#d4a574] rounded pointer-events-none"></div>

          {/* محتوى المستند */}
          <div className="relative z-10 flex-1 flex flex-col justify-between h-full space-y-3 sm:space-y-4">
            <div className="space-y-2.5 sm:space-y-3.5">
              {/* الترويسة - الشعار والتاريخ ورقم الطلب */}
              <div className="flex flex-row justify-between items-start gap-2 mb-3 sm:mb-4">
                <div className="flex items-center gap-2 sm:gap-3">
                  {orgSettings?.logoUrl ? (
                    <img src={orgSettings.logoUrl} alt="شعار الجمعية" className="h-10 sm:h-14 w-auto" />
                  ) : (
                    <div className="w-10 h-10 sm:w-12 sm:h-12 bg-primary/10 rounded flex items-center justify-center">
                      <span className="text-primary font-bold text-base sm:text-lg">تمام</span>
                    </div>
                  )}
                  <div>
                    <div className="text-xs sm:text-sm font-bold text-gray-800 leading-tight">
                      {orgSettings?.officialReportsName || (orgSettings as any)?.nameAr || "جمعية عمارة وتطوير المساجد (تمام)"}
                    </div>
                  </div>
                </div>

                <div className="text-[10.5px] sm:text-xs space-y-0.5 sm:space-y-1 text-left shrink-0">
                  <div className="flex gap-1 justify-end">
                    <span className="font-bold text-gray-600 hidden xs:inline sm:inline">التاريخ:</span>
                    <span className="border-b border-dotted border-gray-400 px-1">{formatGregorianDate(reqDate)}</span>
                  </div>
                  <div className="flex gap-1 justify-end">
                    <span className="font-bold text-gray-600 hidden xs:inline sm:inline">رقم الطلب:</span>
                    <span className="border-b border-dotted border-gray-400 px-1 font-mono text-gray-900 font-bold">{request.requestNumber}</span>
                  </div>
                  {request.disbursementOrderNumber && (
                    <div className="flex gap-1 justify-end">
                      <span className="font-bold text-emerald-700 hidden xs:inline sm:inline">أمر الصرف:</span>
                      <span className="border-b border-dotted border-emerald-400 px-1 font-mono text-emerald-800 font-bold">{request.disbursementOrderNumber}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* عنوان النموذج الفاخر */}
              <div className="text-center mb-3 sm:mb-5">
                <h1 className="text-base sm:text-2xl font-black text-gray-800 pb-1 inline-block px-2 sm:px-4 tracking-wide">
                  طلب صرف عهدة مالية رقم {request.requestNumber}
                </h1>
              </div>

              {/* 1. بيانات الموظف طالب العهدة */}
              <div className="mb-2.5 sm:mb-3.5 border border-gray-300 rounded-lg overflow-hidden bg-white text-[10.5px] sm:text-xs sm:text-sm">
                <div className="bg-gray-100/80 p-1.5 sm:p-2 font-bold text-xs sm:text-sm border-b text-gray-800">
                  بيانات الموظف طالب العهدة
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2">
                  <div className="flex border-b sm:border-l border-gray-200">
                    <span className="p-1.5 sm:p-2.5 bg-gray-50/50 font-bold w-28 sm:w-36 border-l border-gray-200 text-gray-750 shrink-0">اسم الموظف:</span>
                    <span className="p-1.5 sm:p-2.5 text-gray-800 font-bold flex-1">{request.applicantName || "—"}</span>
                  </div>
                  <div className="flex border-b border-gray-200">
                    <span className="p-1.5 sm:p-2.5 bg-gray-50/50 font-bold w-24 sm:w-32 border-l border-gray-200 text-gray-750 shrink-0">الدور:</span>
                    <span className="p-1.5 sm:p-2.5 text-gray-800 font-bold flex-1">{applicantRoleName}</span>
                  </div>
                  <div className="flex border-b sm:border-b-0 sm:border-l border-gray-200">
                    <span className="p-1.5 sm:p-2.5 bg-gray-50/50 font-bold w-28 sm:w-36 border-l border-gray-200 text-gray-750 shrink-0">رقم الجوال:</span>
                    <span className="p-1.5 sm:p-2.5 text-gray-800 font-mono font-bold flex-1 text-right" dir="ltr">{request.applicantPhone || "—"}</span>
                  </div>
                  <div className="flex">
                    <span className="p-1.5 sm:p-2.5 bg-gray-50/50 font-bold w-24 sm:w-32 border-l border-gray-200 text-gray-750 shrink-0">البريد الإلكتروني:</span>
                    <span className="p-1.5 sm:p-2.5 text-gray-800 font-mono font-bold flex-1 text-right">{request.applicantEmail || "—"}</span>
                  </div>
                </div>
              </div>

              {/* 2. موضوع وبيان العهدة المالية */}
              <div className="mb-2.5 sm:mb-3.5 border border-gray-300 rounded-lg overflow-hidden bg-white text-[10.5px] sm:text-xs sm:text-sm">
                <div className="flex border-b border-gray-200">
                  <span className="p-1.5 sm:p-2.5 bg-gray-50/50 font-bold w-28 sm:w-36 border-l border-gray-200 text-gray-750 shrink-0">عنوان العهدة:</span>
                  <span className="p-1.5 sm:p-2.5 text-gray-900 font-bold flex-1">{request.title}</span>
                </div>
                <div className="bg-gray-100/80 p-1.5 sm:p-2 font-bold text-xs sm:text-sm border-b text-gray-800">
                  البيان التفصيلي وأسباب الاحتياج للعهدة
                </div>
                <div className="bg-white text-gray-800 leading-relaxed whitespace-pre-wrap break-words font-semibold p-2 sm:p-3 text-[11px] sm:text-sm min-h-[50px] sm:min-h-[65px]">
                  {request.description}
                </div>
              </div>

              {/* 3. جدول المبلغ المالي المطلوب */}
              <div className="mb-2.5 sm:mb-3.5 border border-gray-300 rounded-lg overflow-hidden bg-white">
                <div className="bg-gray-100/80 p-1.5 sm:p-2 font-bold text-xs sm:text-sm border-b text-center text-gray-800">
                  المبلغ المالي المطلوب صرفه
                </div>
                <table className="w-full text-[10.5px] sm:text-xs sm:text-sm text-center border-collapse">
                  <tbody>
                    <tr className="border-b border-gray-200">
                      <td className="p-1.5 sm:p-2.5 bg-gray-50/50 font-bold text-gray-750 border-l border-gray-200 w-1/4">المبلغ بالأرقام</td>
                      <td className="p-1.5 sm:p-2.5 font-bold font-mono text-emerald-800 border-l border-gray-200 text-sm sm:base w-1/4">
                        <span className="inline-flex items-center gap-1">
                          {numAmount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          <SaudiRiyal className="w-3.5 h-3.5 inline" />
                        </span>
                      </td>
                      <td className="p-1.5 sm:p-2.5 bg-gray-50/50 font-bold text-gray-750 border-l border-gray-200 w-1/6">المبلغ كتابةً</td>
                      <td className="p-1.5 sm:p-2.5 font-bold text-gray-800 text-right pr-3">
                        فقط {tafqeet} لا غير.
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* 4. الحساب البنكي المعتمد للصرف */}
              <div className="mb-2.5 sm:mb-3.5 border border-gray-300 rounded-lg overflow-hidden bg-white">
                <div className="bg-gray-100/80 p-1.5 sm:p-2 font-bold text-xs sm:text-sm border-b text-center text-gray-800">
                  المعلومات البنكية المعتمدة لصرف العهدة
                </div>
                <div className="flex flex-col text-[10.5px] sm:text-xs sm:text-sm">
                  <div className="flex border-b border-gray-200">
                    <span className="p-1.5 sm:p-2.5 bg-gray-50/50 font-bold w-24 sm:w-36 border-l border-gray-200 text-gray-750 shrink-0">اسم الحساب:</span>
                    <span className="p-1.5 sm:p-2.5 text-gray-800 font-bold flex-1 truncate">{request.bankAccountName || "—"}</span>
                  </div>
                  <div className="flex border-b border-gray-200">
                    <span className="p-1.5 sm:p-2.5 bg-gray-50/50 font-bold w-24 sm:w-36 border-l border-gray-200 text-gray-750 shrink-0">اسم البنك:</span>
                    <span className="p-1.5 sm:p-2.5 text-gray-800 font-bold flex-1">{request.bankName || "—"}</span>
                  </div>
                  <div className="flex">
                    <span className="p-1.5 sm:p-2.5 bg-gray-50/50 font-bold w-24 sm:w-36 border-l border-gray-200 text-gray-750 shrink-0">الآيبان (IBAN):</span>
                    <span className="p-1.5 sm:p-2.5 text-slate-800 font-mono font-bold flex-1 text-[10px] sm:text-xs tracking-wider break-all text-right" dir="ltr">{request.bankIban || "—"}</span>
                  </div>
                </div>
              </div>

              {/* توجيه الإدارة المالية عند صدور أمر الصرف */}
              {request.disbursementOrderNumber && (
                <div className="mb-2.5 sm:mb-3.5 p-2.5 bg-emerald-50/80 border border-emerald-300 rounded-lg text-emerald-800 text-[10.5px] sm:text-xs leading-relaxed">
                  <span className="font-bold">توجيه الإدارة المالية: </span>
                  تم اعتماد هذا الطلب نظامياً، وأُحيل إلى الإدارة المالية بموجب أمر الصرف المالي رقم 
                  <span className="font-bold font-mono px-1">({request.disbursementOrderNumber})</span>
                  لتنفيذ التحويل البنكي لحساب المستفيد الموضح أعلاه وفق الإجراءات واللوائح المعتمدة.
                </div>
              )}
            </div>

            {/* 5. التوقيعات والاعتماد */}
            <div className="break-inside-avoid pt-2 sm:pt-4">
              <div className="grid grid-cols-2 gap-3 sm:gap-6 text-center">
                {/* مُعدّ الطلب (الموظف طالب العهدة) */}
                <div className="p-1 sm:p-2">
                  <div className="font-bold text-gray-800 text-[11px] sm:text-sm mb-2 sm:mb-4 min-h-[1.25rem]">
                    {applicantSignatureDepartment}
                  </div>
                  <div className="space-y-1 text-xs flex flex-col items-center justify-center">
                    {applicantSignatureUrl ? (
                      <div className="h-9 sm:h-12 flex items-center justify-center mx-auto w-24 sm:w-36 overflow-hidden my-0.5 sm:my-1">
                        <img 
                          src={applicantSignatureUrl} 
                          alt="توقيع مقدم الطلب" 
                          className="max-h-9 sm:max-h-12 max-w-full object-contain" 
                        />
                      </div>
                    ) : (
                      <div className="h-8 sm:h-10 border-b border-dashed border-gray-300 mx-auto w-24 sm:w-36"></div>
                    )}
                    <div className="text-gray-900 font-bold text-[10px] sm:text-xs min-h-[1rem]">
                      {applicantSignatureName}
                    </div>
                  </div>
                </div>

                {/* المدير التنفيذي */}
                <div className="p-1 sm:p-2">
                  <div className="font-bold text-gray-800 text-[11px] sm:text-sm mb-2 sm:mb-4 min-h-[1.25rem]">
                    {executiveDepartment}
                  </div>
                  <div className="space-y-1 text-xs flex flex-col items-center justify-center">
                    {executiveSignatureUrl ? (
                      <div className="h-9 sm:h-12 flex items-center justify-center mx-auto w-24 sm:w-36 overflow-hidden my-0.5 sm:my-1">
                        <img
                          src={executiveSignatureUrl}
                          alt="توقيع المدير التنفيذي"
                          className="max-h-9 sm:max-h-12 max-w-full object-contain"
                        />
                      </div>
                    ) : isExecutiveApproved ? (
                      <div className="h-9 sm:h-12 flex items-center justify-center mx-auto w-24 sm:w-36 overflow-hidden my-0.5 sm:my-1 text-emerald-700 font-bold text-[11px]">
                        <ShieldCheck className="w-4 h-4 ml-1 inline text-emerald-600" />
                        معتمد نظامياً
                      </div>
                    ) : (
                      <div className="h-8 sm:h-10 border-b border-dashed border-gray-300 mx-auto w-24 sm:w-36"></div>
                    )}
                    <div className="text-gray-900 font-bold text-[10px] sm:text-xs min-h-[1rem]">
                      {executiveName}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* تذييل المستند الفاخر المطابق لتقارير الجمعية */}
            <div className="mt-3 sm:mt-5 pt-2 sm:pt-2.5 border-t border-gray-100 text-center text-slate-400 text-[9px] sm:text-[10px] flex flex-col sm:flex-row justify-between items-center px-1 sm:px-2 gap-1 sm:gap-0">
              <span className="font-medium">تم إنشاء هذا المستند آلياً من نظام {orgSettings?.officialReportsName || (orgSettings as any)?.nameAr || "جمعية عمارة وتطوير المساجد (تمام)"}</span>
              <span className="font-mono text-gray-500">تاريخ الطباعة: {new Date().toLocaleDateString("ar-SA")} - صفحة 1 من 1</span>
            </div>
          </div>
        </div>
      </div>

      {/* أنماط الطباعة المتقدمة للجمعية المتطابقة مع أوامر الصرف */}
      <style>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 0 !important;
          }
          body {
            background-color: white !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
            height: 100%;
            overflow: hidden;
          }
          .print\\:hidden {
            display: none !important;
          }
          .min-h-screen {
            background-color: white !important;
            padding: 0 !important;
            margin: 0 !important;
            min-height: 0 !important;
            height: 100% !important;
          }
          .print-container {
            max-width: 100% !important;
            width: 100% !important;
            box-shadow: none !important;
            padding: 10mm 12mm !important;
            margin: 0 auto !important;
            min-height: 277mm !important;
            height: 100% !important;
            box-sizing: border-box !important;
          }
          .print-inner {
            min-height: 257mm !important;
            height: 100% !important;
            box-sizing: border-box !important;
            padding: 14px 16px !important;
            border-width: 2px !important;
            display: flex !important;
            flex-direction: column !important;
            justify-content: space-between !important;
          }
          .relative.z-10 {
            display: flex !important;
            flex-direction: column !important;
            justify-content: space-between !important;
            flex: 1 1 0% !important;
            height: 100% !important;
          }
          /* تقليص الفراغات للحفاظ على الصفحة الواحدة مع وجود مسافات متوازنة من الأطراف */
          .mb-4, .mb-6 {
            margin-bottom: 6px !important;
          }
          .mb-3\\.5, .mb-3 {
            margin-bottom: 5px !important;
          }
          .space-y-4 > :not([hidden]) ~ :not([hidden]) {
            margin-top: 5px !important;
            margin-bottom: 5px !important;
          }
          .space-y-3 > :not([hidden]) ~ :not([hidden]) {
            margin-top: 4px !important;
            margin-bottom: 4px !important;
          }
          table td {
            padding: 5px 8px !important;
            font-size: 11.5px !important;
          }
          .p-2\\.5 {
            padding: 5px !important;
          }
          .p-2 {
            padding: 4px !important;
          }
          .py-4 {
            padding-top: 5px !important;
            padding-bottom: 5px !important;
          }
          .h-14 {
            height: 38px !important;
          }
          .mt-6 {
            margin-top: 8px !important;
          }
        }
      `}</style>

      {/* حوار الاعتماد للمدير التنفيذي */}
      <Dialog open={approveDialogOpen} onOpenChange={setApproveDialogOpen}>
        <DialogContent className="max-w-md rounded-2xl" dir="rtl">
          <DialogHeader>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 mx-auto flex items-center justify-center mb-2">
              <CheckCircle className="w-6 h-6" />
            </div>
            <DialogTitle className="text-center text-lg font-black text-foreground">
              اعتماد طلب العهدة المالية
            </DialogTitle>
            <DialogDescription className="text-center text-xs text-muted-foreground">
              سيتم توقيع واعتماد الطلب وتحويله تلقائياً لأمر صرف مالي وتوجيهه للإدارة المالية.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div className="p-3 bg-muted/40 rounded-xl space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">المبلغ:</span>
                <span className="font-bold text-emerald-600 font-mono">{numAmount.toLocaleString()} ر.س</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">المستفيد:</span>
                <span className="font-bold">{request.bankAccountName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">البنك:</span>
                <span className="font-bold">{request.bankName}</span>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">ملاحظات الاعتماد (اختياري)</Label>
              <Textarea
                value={approvalNotes}
                onChange={(e) => setApprovalNotes(e.target.value)}
                placeholder="أدخل أي ملاحظات للإدارة المالية..."
                className="text-xs min-h-[70px] rounded-xl"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setApproveDialogOpen(false)}
              className="rounded-xl text-xs h-9 font-semibold"
            >
              إلغاء
            </Button>
            <Button
              onClick={() => approveMutation.mutate({ id: request.id, notes: approvalNotes.trim() || undefined })}
              disabled={approveMutation.isPending}
              className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs h-9 font-bold gap-1.5"
            >
              {approveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
              <span>تأكيد الاعتماد والتحويل</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* حوار رفض الطلب */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent className="max-w-md rounded-2xl" dir="rtl">
          <DialogHeader>
            <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 dark:bg-rose-950/40 mx-auto flex items-center justify-center mb-2">
              <XCircle className="w-6 h-6" />
            </div>
            <DialogTitle className="text-center text-lg font-black text-foreground">
              رفض طلب العهدة المالية
            </DialogTitle>
            <DialogDescription className="text-center text-xs text-muted-foreground">
              يرجى توضيح سبب الرفض ليتم إشعار الموظف به.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 py-2">
            <Label className="text-xs font-semibold">سبب الرفض *</Label>
            <Textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="اكتب أسباب عدم الموافقة على طلب العهدة..."
              className="text-xs min-h-[90px] rounded-xl"
            />
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setRejectDialogOpen(false)}
              className="rounded-xl text-xs h-9 font-semibold"
            >
              إلغاء
            </Button>
            <Button
              onClick={() => {
                if (!rejectionReason.trim()) {
                  toast.error("يرجى كتابة سبب الرفض");
                  return;
                }
                rejectMutation.mutate({ id: request.id, reason: rejectionReason.trim() });
              }}
              disabled={rejectMutation.isPending || !rejectionReason.trim()}
              className="bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs h-9 font-bold gap-1.5"
            >
              {rejectMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
              <span>تأكيد الرفض</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
