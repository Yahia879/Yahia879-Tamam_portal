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
  ArrowUpRight,
  Loader2,
  ShieldCheck,
  ShieldAlert,
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
      toast.success(data.message || "تم اعتماد طلب العهدة وتحويله لأمر صرف بنجاح");
      utils.custody.getById.invalidate({ id: requestId });
      utils.custody.getAll.invalidate();
      utils.custody.getStats.invalidate();
      utils.custody.getPendingActionCounts.invalidate();
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
      utils.custody.getPendingActionCounts.invalidate();
    },
    onError: (err) => {
      toast.error(err.message || "حدث خطأ أثناء رفض الطلب");
    },
  });

  const isFinancialOfficer = useMemo(() => {
    if (!user) return false;
    const userRoleStr = (user.role as string) || "";
    return (
      userRoleStr === "financial" ||
      userRoleStr === "financial_manager" ||
      userRoleStr === "accountant" ||
      (user as any)?.customRole?.nameAr === "المسؤول المالي" ||
      (user as any)?.customRole?.nameAr === "المدير المالي" ||
      (user as any)?.customRole?.nameAr === "محاسب" ||
      userRoleStr === "super_admin"
    );
  }, [user]);

  const [confirmExceptionDialogOpen, setConfirmExceptionDialogOpen] = useState(false);
  const [exceptionActionType, setExceptionActionType] = useState<"approve" | "reject">("approve");
  const [exceptionActionNotes, setExceptionActionNotes] = useState("");

  const reviewExceptionMutation = trpc.custody.reviewException.useMutation({
    onSuccess: (data) => {
      toast.success(data.message);
      setConfirmExceptionDialogOpen(false);
      setExceptionActionNotes("");
      utils.custody.getById.invalidate({ id: requestId });
      utils.custody.getAll.invalidate();
      utils.custody.getPendingActionCounts.invalidate();
      utils.custody.checkActiveCustody.invalidate();
    },
    onError: (err) => {
      toast.error(err.message || "حدث خطأ أثناء معالجة طلب الاستثناء");
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

  // تحليل البنود التفصيلية إذا كانت مخزنة كـ JSON
  let parsedItems: Array<{ description: string; details?: string; amount: number }> | null = null;
  if (request.description) {
    try {
      const parsed = JSON.parse(request.description);
      if (Array.isArray(parsed) && parsed.length > 0 && typeof parsed[0] === "object") {
        parsedItems = parsed.map((item: any) => ({
          description: String(item.description || ""),
          details: item.details ? String(item.details) : undefined,
          amount: parseFloat(item.amount) || 0,
        }));
      }
    } catch {
      // نص عادي للطلبات السابقة
    }
  }

  // حساب المبلغ الإجمالي من البنود أو من حقل المبلغ
  const numAmount = parsedItems && parsedItems.length > 0
    ? parsedItems.reduce((sum, it) => sum + (it.amount || 0), 0)
    : parseFloat(request.amount) || 0;

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

  // التحقق مما إذا كان مقدم الطلب هو المدير التنفيذي نفسه (حساب مباشر بدون useMemo لمنع تعارض خطافات ريفاكت)
  const isRequesterExecutiveDirector = Boolean(
    request.applicantRole === "executive_director" ||
    request.applicantRole === "general_manager" ||
    (request as any).applicantLiveSignatureDepartment?.trim() === "المدير التنفيذي" ||
    request.applicantSignatureDepartment?.trim() === "المدير التنفيذي" ||
    (Boolean(request.userId) && Boolean(execUser?.id) && request.userId === execUser.id) ||
    (Boolean(request.userId) && Boolean(request.executiveApprovedBy) && request.userId === request.executiveApprovedBy) ||
    (request as any).applicantEmail === "ceo@manarah.org.sa"
  );

  const fallbackExecName = orgSettings?.executiveDirectorName || "م. عبدالهادي آل فائق";
  const rawExecName = (isRequesterExecutiveDirector && !executiveName) ? applicantSignatureName : (executiveName || applicantSignatureName);
  const effectiveApprovalName = (rawExecName && !rawExecName.includes("@")) ? rawExecName : fallbackExecName;
  const effectiveApprovalDepartment = executiveDepartment || "المدير التنفيذي";
  const effectiveApprovalSigUrl = isExecutiveApproved
    ? (executiveSignatureUrl || applicantSignatureUrl || execUser?.signatureUrl || "/uploads/signatures/signatory-44-1785371854834-x3ez2x.png")
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
                disabled={approveMutation.isPending}
                onClick={() => {
                  approveMutation.mutate({ id: request.id });
                }}
                className="h-8 sm:h-9 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm gap-1.5 transition-transform active:scale-95"
                title="اعتماد الطلب وتحويله لأمر صرف مباشرة"
              >
                {approveMutation.isPending ? (
                  <Loader2 className="h-3.5 w-3.5 ml-1 animate-spin" />
                ) : (
                  <CheckCircle className="h-3.5 w-3.5 ml-1" />
                )}
                <span>اعتماد وتحويل لأمر صرف</span>
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

          {/* زر مراجعة طلب الاستثناء للمدير التنفيذي حصراً إن وجد طلب استثناء معلق لهذه العهدة */}
          {Boolean((request as any).pendingException) && canApprove && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setExceptionActionType("approve");
                setExceptionActionNotes("");
                setConfirmExceptionDialogOpen(true);
              }}
              className="h-8 sm:h-9 bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-700 text-amber-800 dark:text-amber-200 hover:bg-amber-100 font-bold text-xs sm:text-sm gap-1.5 shadow-xs"
              title="يوجد طلب استثناء معلق لهذه العهدة - اضغط للبت فيه"
            >
              <ShieldAlert className="h-3.5 w-3.5 ml-1 text-amber-600" />
              <span>مراجعة طلب الاستثناء</span>
            </Button>
          )}

        </div>
      </div>

      {/* صفحة الطباعة - تصميم متوازن لصفحة A4 مع الإطار الأخضر والذهبي الفاخر المعتمد */}
      <div className="print-container w-full max-w-full sm:max-w-[210mm] mx-auto bg-white shadow-lg print:shadow-none p-4 sm:p-8 min-h-auto sm:min-h-[297mm] relative flex flex-col justify-start overflow-hidden">
        {/* إطار مزدوج فاخر للمستند */}
        <div className="print-inner border-[2px] sm:border-[3px] border-[#1a5f4a] p-3 sm:p-6 rounded-lg relative bg-white h-full flex-1 flex flex-col justify-between min-h-auto sm:min-h-[277mm]">
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
                {parsedItems && parsedItems.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-[10px] sm:text-xs text-right border-collapse">
                      <thead>
                        <tr className="bg-gray-50/80 border-b border-gray-200 text-gray-700 font-bold">
                          <th className="p-1.5 sm:p-2 w-10 sm:w-12 text-center border-l border-gray-200">#</th>
                          <th className="p-1.5 sm:p-2 border-l border-gray-200">بيان البند وأسباب الاحتياج</th>
                          <th className="p-1.5 sm:p-2 w-28 sm:w-36 text-center">المبلغ المطلوب</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {parsedItems.map((item, idx) => (
                          <tr key={idx} className="hover:bg-gray-50/40">
                            <td className="p-1.5 sm:p-2 text-center font-mono font-bold text-gray-600 border-l border-gray-200">
                              {idx + 1}
                            </td>
                            <td className="p-1.5 sm:p-2 text-gray-800 font-medium border-l border-gray-200 leading-relaxed whitespace-pre-wrap break-words">
                              <div>{item.description}</div>
                              {item.details && (
                                <div className="text-[10px] text-gray-500 font-normal mt-0.5 whitespace-pre-wrap">
                                  {item.details}
                                </div>
                              )}
                            </td>
                            <td className="p-1.5 sm:p-2 text-center font-mono font-bold text-emerald-800 whitespace-nowrap">
                              <span className="inline-flex items-center justify-center gap-1">
                                {item.amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                <SaudiRiyal className="w-3 h-3 inline" />
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="bg-white text-gray-800 leading-relaxed whitespace-pre-wrap break-words font-semibold p-2 sm:p-3 text-[11px] sm:text-sm min-h-[50px] sm:min-h-[65px]">
                    {request.description}
                  </div>
                )}
              </div>

              {/* 3. جدول المبلغ الإجمالي المطلوب صرفه */}
              <div className="mb-2.5 sm:mb-3.5 border border-gray-300 rounded-lg overflow-hidden bg-white">
                <div className="bg-gray-100/80 p-1.5 sm:p-2 font-bold text-xs sm:text-sm border-b text-center text-gray-800">
                  المبلغ الإجمالي المطلوب صرفه
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
            </div>

            {/* 5. التوقيعات والاعتماد */}
            <div className="break-inside-avoid pt-2 sm:pt-4">
              <div className={`grid ${isRequesterExecutiveDirector ? "grid-cols-1 max-w-xs mx-auto" : "grid-cols-2"} gap-3 sm:gap-6 text-center`}>
                {/* مُعدّ الطلب (الموظف طالب العهدة) - يُحذف إذا كان مقدم الطلب هو المدير التنفيذي نفسه لمنع تكرار التوقيع */}
                {!isRequesterExecutiveDirector && (
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
                )}

                {/* الاعتماد / المدير التنفيذي */}
                <div className="p-1 sm:p-2">
                  <div className="font-bold text-gray-800 text-[11px] sm:text-sm mb-2 sm:mb-4 min-h-[1.25rem]">
                    {effectiveApprovalDepartment}
                  </div>
                  <div className="space-y-1 text-xs flex flex-col items-center justify-center">
                    {effectiveApprovalSigUrl ? (
                      <div className="h-9 sm:h-12 flex items-center justify-center mx-auto w-24 sm:w-36 overflow-hidden my-0.5 sm:my-1">
                        <img
                          src={effectiveApprovalSigUrl}
                          alt="توقيع الاعتماد"
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
                      {effectiveApprovalName}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* إشعار حالة التصفية أو الاستثناء إن وجد */}
            {request.isSettled ? (
              <div className="my-1.5 p-2 rounded-lg bg-emerald-50/80 border border-emerald-300 text-[10px] text-emerald-900 flex flex-wrap items-center justify-between gap-1 print:border-emerald-600">
                <div className="flex items-center gap-1.5 font-bold">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>تمت تصفية وإغلاق العهدة المالية بنجاح</span>
                  {(request as any).settledUser?.name && (
                    <span className="font-normal text-emerald-800">
                      (بواسطة المسؤول المالي: {(request as any).settledUser.name})
                    </span>
                  )}
                  {request.settledAt && (
                    <span className="font-mono text-emerald-700">
                      بتاريخ {new Date(request.settledAt).toLocaleDateString("ar-SA")}
                    </span>
                  )}
                </div>
                {request.settlementNotes && (
                  <span className="text-emerald-800 font-medium truncate max-w-xs">
                    ملاحظات: {request.settlementNotes}
                  </span>
                )}
              </div>
            ) : null}



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
            padding: 12mm 14mm !important;
            margin: 0 auto !important;
            min-height: 277mm !important;
            height: 100% !important;
            box-sizing: border-box !important;
          }
          .print-inner {
            min-height: 253mm !important;
            height: 100% !important;
            box-sizing: border-box !important;
            padding: 14px 18px !important;
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

      {/* حوار البت في طلب الاستثناء */}
      <Dialog open={confirmExceptionDialogOpen} onOpenChange={setConfirmExceptionDialogOpen}>
        <DialogContent className="max-w-md rounded-2xl" dir="rtl">
          <DialogHeader className="text-right">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-amber-500/15 text-amber-600 flex items-center justify-center font-bold">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold text-foreground">
                  {exceptionActionType === "approve" ? "اعتماد طلب استثناء العهدة" : "رفض طلب استثناء العهدة"}
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground pt-0.5">
                  {exceptionActionType === "approve"
                    ? "سيتمكن الموظف من رفع طلب عهدة جديدة استثناءً فور اعتماد هذا الطلب."
                    : "يرجى توضيح سبب رفض الاستثناء ليتم إشعار الموظف به."}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {(request as any)?.pendingException && (
            <div className="p-3 rounded-xl bg-muted/60 border border-border/70 text-xs space-y-1.5 my-1">
              <div className="flex justify-between items-center text-muted-foreground">
                <span>الموظف مقدم الطلب:</span>
                <span className="font-bold text-foreground">{request.applicantName || "موظف"}</span>
              </div>
              <div className="flex justify-between items-center text-muted-foreground">
                <span>العهدة السابقة:</span>
                <span className="font-mono font-bold text-primary">{request.requestNumber}</span>
              </div>
              <div className="text-muted-foreground pt-1 border-t border-border/50">
                <span className="font-semibold block mb-0.5 text-foreground">مبررات الاستثناء:</span>
                <span className="text-foreground/90 leading-relaxed font-sans">
                  {(request as any).pendingException.reason}
                </span>
              </div>
            </div>
          )}

          <div className="flex items-center gap-2 py-1">
            <Button
              type="button"
              size="sm"
              variant={exceptionActionType === "approve" ? "default" : "outline"}
              onClick={() => setExceptionActionType("approve")}
              className={`flex-1 rounded-xl text-xs font-bold h-8.5 gap-1.5 ${
                exceptionActionType === "approve" ? "bg-emerald-600 hover:bg-emerald-700 text-white" : ""
              }`}
            >
              <CheckCircle className="w-3.5 h-3.5" />
              <span>موافقة واعتماد</span>
            </Button>
            <Button
              type="button"
              size="sm"
              variant={exceptionActionType === "reject" ? "default" : "outline"}
              onClick={() => setExceptionActionType("reject")}
              className={`flex-1 rounded-xl text-xs font-bold h-8.5 gap-1.5 ${
                exceptionActionType === "reject" ? "bg-rose-600 hover:bg-rose-700 text-white border-rose-300" : "text-rose-600"
              }`}
            >
              <XCircle className="w-3.5 h-3.5" />
              <span>عدم الموافقة (رفض)</span>
            </Button>
          </div>

          <div className="space-y-1.5 py-1">
            <Label className="text-xs font-semibold text-foreground">
              {exceptionActionType === "approve" ? "ملاحظات وتوجيهات الاعتماد (اختياري)" : "سبب الرفض *"}
            </Label>
            <Textarea
              value={exceptionActionNotes}
              onChange={(e) => setExceptionActionNotes(e.target.value)}
              placeholder={
                exceptionActionType === "approve"
                  ? "أضف أي توجيهات للموظف بخصوص تسوية العهد..."
                  : "اكتب سبب رفض منح الاستثناء..."
              }
              rows={3}
              className="text-xs rounded-xl bg-background resize-none border-border/70"
            />
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setConfirmExceptionDialogOpen(false)}
              className="rounded-xl text-xs h-9 font-semibold"
            >
              إلغاء
            </Button>
            <Button
              disabled={
                reviewExceptionMutation.isPending ||
                (exceptionActionType === "reject" && !exceptionActionNotes.trim()) ||
                !(request as any)?.pendingException?.id
              }
              onClick={() => {
                if (!(request as any)?.pendingException?.id) return;
                reviewExceptionMutation.mutate({
                  id: (request as any).pendingException.id,
                  action: exceptionActionType,
                  notes: exceptionActionNotes.trim() || undefined,
                });
              }}
              className={`rounded-xl text-xs h-9 font-bold gap-1.5 text-white ${
                exceptionActionType === "approve"
                  ? "bg-emerald-600 hover:bg-emerald-700"
                  : "bg-rose-600 hover:bg-rose-700"
              }`}
            >
              {reviewExceptionMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : exceptionActionType === "approve" ? (
                <CheckCircle className="w-4 h-4" />
              ) : (
                <XCircle className="w-4 h-4" />
              )}
              <span>{exceptionActionType === "approve" ? "تأكيد الاعتماد" : "تأكيد الرفض"}</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
