import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowRight, Printer, PenTool, ShieldAlert, Check, Loader2, Link2, X, ExternalLink, Copy } from "lucide-react";
import { usePermission } from "@/hooks/usePermission";
import { useAuth } from "@/_core/hooks/useAuth";
import { useDocumentTitle } from "@/contexts/DocumentTitleContext";
import { numberToArabicText } from "@shared/tafqeet";
import { toast } from "sonner";

function toHijriDate(date: Date): string {
  let formatted = "";
  try {
    formatted = new Intl.DateTimeFormat("ar-SA-u-ca-islamic", {
      day: "numeric",
      month: "numeric",
      year: "numeric"
    }).format(date);
  } catch (e) {
    const gregorianYear = date.getFullYear();
    const hijriYear = Math.floor((gregorianYear - 622) * (33 / 32));
    formatted = `${date.getDate()}/${date.getMonth() + 1}/${hijriYear}`;
  }
  
  // Remove any existing "هـ" or "ه" to avoid duplicates and ensure clean format
  formatted = formatted.replace(/هـ/g, "").replace(/ه/g, "").trim();
  // Remove any trailing direction marks or spaces
  formatted = formatted.replace(/[\s\u200e\u200f]+$/, "");
  return `${formatted} هـ`;
}

function formatGregorianDate(date: Date): string {
  return `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()} م`;
}

export default function DisbursementRequestPrint() {
  const params = useParams<{ id: string }>();
  const requestId = parseInt(params.id || "0");
  const [, navigate] = useLocation();
  const hasApprovePermission = usePermission("disbursements.approve");
  const hasSignPermission = usePermission("disbursements.sign");
  const hasViewPermission = usePermission("disbursements.view");
  const hasChairmanPerm = usePermission("board_chairman");
  const hasChairmanViewPerm = usePermission("board_chairman_view");
  const hasLeadershipChairmanView = usePermission("board_leadership.board_chairman_view");
  const hasBoardChairmanView = usePermission("board.board_chairman_view");
  const { user: currentUser } = useAuth();
  const isChairmanRole = currentUser?.role === "board_chairman";
  const userPermissionsList = (currentUser as any)?.permissions || [];
  const hasChairmanInPerms = 
    isChairmanRole ||
    hasChairmanPerm || 
    hasChairmanViewPerm || 
    hasLeadershipChairmanView || 
    hasBoardChairmanView ||
    userPermissionsList.includes("board_chairman") || 
    userPermissionsList.includes("board_chairman_view") ||
    userPermissionsList.includes("board_leadership.board_chairman_view") ||
    userPermissionsList.includes("board.board_chairman_view");

  const hasRequestViewPermission = hasViewPermission || hasApprovePermission || hasSignPermission || hasChairmanInPerms;
  const { data: orgSettings } = trpc.organization.getSettings.useQuery();

  const [showExecutiveDirectorSignature, setShowExecutiveDirectorSignature] = useState<boolean>(true);
  const [showCreatorSignature, setShowCreatorSignature] = useState<boolean>(true);
  const [showLinksCard, setShowLinksCard] = useState<boolean>(false);

  const utils = trpc.useContext();
  const updateRequestSigVisibilityMutation = trpc.disbursements.updateRequestSignatureVisibility.useMutation({
    onSuccess: () => {
      utils.disbursements.getRequestById.invalidate({ id: requestId });
    },
  });

  const approveRequestMutation = trpc.disbursements.approveRequest.useMutation({
    onSuccess: async (data) => {
      toast.success(data?.message || "تم اعتماد طلب الصرف بنجاح");
      await refetchRequest();
      utils.disbursements.getRequestById.invalidate();
      utils.disbursements.invalidate();
    },
    onError: (err) => {
      toast.error(err.message || "حدث خطأ أثناء اعتماد طلب الصرف");
    },
  });

  // التحقق من أن المستخدم الحالي هو المدير التنفيذي ولديه توقيع رقمي
  const hasUserSignPerm = hasSignPermission || userPermissionsList.includes("disbursements.sign");
  const isExecutiveDirectorRole = 
    currentUser?.role === "general_manager" ||
    currentUser?.role === "executive_director" ||
    (currentUser as any)?.customRole?.nameAr === "المدير التنفيذي" ||
    currentUser?.name === "المدير التنفيذي" ||
    currentUser?.email === "ceo@manarah.org.sa";

  const currentUserShowSig = 
    (currentUser as any)?.showSignatureInDocuments === true || 
    (currentUser as any)?.showSignatureInDocuments === 1 || 
    (currentUser as any)?.showSignatureInDocuments === null || 
    (currentUser as any)?.showSignatureInDocuments === undefined || 
    String((currentUser as any)?.showSignatureInDocuments) === "true" ||
    String((currentUser as any)?.showSignatureInDocuments) === "1";

  const isExecutiveDirectorSigner = 
    hasUserSignPerm &&
    isExecutiveDirectorRole &&
    !!(currentUser as any)?.signatureUrl &&
    currentUserShowSig;

  const { data: request, isLoading, refetch: refetchRequest } = trpc.disbursements.getRequestById.useQuery(
    { id: parseInt(params.id || "0") },
    { enabled: !!params.id }
  );

  const isExceptionApproved = Boolean((request as any)?.isException);

  const resolvedSignatureName = isExceptionApproved
    ? (((request as any)?.liveExceptionApproverName || (request as any)?.creatorSignatureName || (request as any)?.requestedBySignatureName || (request as any)?.requestedByName || "").replace(/\s*\(استثناء اعتماد\)/g, ""))
    : ((request as any)?.requestedBySignatureName || (request as any)?.requestedByName);

  const resolvedSignatureDepartment = isExceptionApproved
    ? (((request as any)?.liveExceptionApproverDepartment || (request as any)?.creatorSignatureDepartment || (request as any)?.requestedBySignatureDepartment || "مُعدّ الطلب").replace(/\s*\(استثناء اعتماد\)/g, ""))
    : ((request as any)?.requestedBySignatureDepartment || "مُعدّ الطلب");

  const resolvedSignatureUrl = isExceptionApproved
    ? ((request as any)?.liveExceptionApproverSignatureUrl || (request as any)?.creatorSignatureUrl)
    : ((request as any)?.requestedByShowSignature === false ? null : (request as any)?.requestedBySignatureUrl);

  const executiveDirectorDepartment = 
    (request as any)?.executiveDirectorSignatureDepartment || 
    (hasUserSignPerm && isExecutiveDirectorRole ? (currentUser as any)?.signatureDepartment : null) || 
    "المدير التنفيذي";

  const executiveDirectorName = 
    (request as any)?.executiveDirectorName || 
    (hasUserSignPerm && isExecutiveDirectorRole ? ((currentUser as any)?.signatureName || currentUser?.name) : null) || 
    orgSettings?.executiveDirectorName || 
    "م. عبدالهادي آل فائق";

  const executiveDirectorSignatureUrl = 
    (request as any)?.executiveDirectorSignatureUrl ||
    (isExecutiveDirectorSigner ? (currentUser as any)?.signatureUrl : null);

  // تحديث عنوان الصفحة بسلاسة عبر سياق عناوين المستندات
  useDocumentTitle(request?.requestNumber ? `طباعة طلب صرف رقم ${request.requestNumber}` : "طباعة طلب الصرف");

  useEffect(() => {
    if (request) {
      if ((request as any).showCreatorSignature !== undefined && (request as any).showCreatorSignature !== null) {
        setShowCreatorSignature(Boolean((request as any).showCreatorSignature));
      }
      if ((request as any).showExecutiveDirectorSignature !== undefined && (request as any).showExecutiveDirectorSignature !== null) {
        setShowExecutiveDirectorSignature(Boolean((request as any).showExecutiveDirectorSignature));
      }
    }
  }, [request?.showCreatorSignature, request?.showExecutiveDirectorSignature]);

  // جلب تقارير الإنجاز للمشروع المحدد
  const { data: progressReports } = trpc.progressReports.list.useQuery(
    { projectId: request?.projectId || undefined },
    { enabled: !!request?.projectId }
  );

  // البحث عن تقرير الإنجاز المرتبط بناءً على معرف الدفعة
  const associatedReport = progressReports?.find((r: any) => {
    if (!r.workSummary || !request) return false;
    const match = r.workSummary.match(/\[معرف الدفعة:\s*([^\]]+)\]/);
    if (match) {
      const pId = match[1].trim();
      return pId === request.contractPaymentId?.toString() || 
             pId === `cp-${request.contractPaymentId}` ||
             pId === request.paymentId?.toString() ||
             pId === `manual-${request.paymentId}`;
    }
    return false;
  });

  // تحليل تفاصيل الأعمال المجدولة والمنفذة
  const parsedWorks = (() => {
    const combined = associatedReport?.workSummary || "";
    if (!combined) return { scheduled: "", actual: "" };

    const schedMatch = combined.match(/الأعمال المجدولة للدفعة:\r?\n([\s\S]*?)(?:\r?\n\r?الأعمال المنفذة فعلياً:|\r?\n\r?\[معرف الدفعة:|$)/);
    const actualMatch = combined.match(/الأعمال المنفذة فعلياً:\r?\n([\s\S]*?)(?:\r?\n\r?\[معرف الدفعة:|$)/);

    const schedMatchNoNL = schedMatch ? null : combined.match(/الأعمال المجدولة للدفعة:\s*([\s\S]*?)(?:الأعمال المنفذة فعلياً:|\[معرف الدفعة:|$)/);
    const actualMatchNoNL = actualMatch ? null : combined.match(/الأعمال المنفذة فعلياً:\s*([\s\S]*?)(?:\[معرف الدفعة:|$)/);

    const scheduled = schedMatch 
      ? schedMatch[1].trim() 
      : (schedMatchNoNL 
          ? schedMatchNoNL[1].trim() 
          : combined.replace(/\[معرف الدفعة:\s*[^\]]+\]/g, "").trim());

    const actual = actualMatch 
      ? actualMatch[1].trim() 
      : (actualMatchNoNL 
          ? actualMatchNoNL[1].trim() 
          : "");

    return { scheduled, actual };
  })();

  const handlePrint = () => {
    const prevTitle = document.title;
    if (request?.requestNumber) {
      document.title = `طلب صرف رقم ${request.requestNumber}`;
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

  if (!hasRequestViewPermission) {
    return (
      <div className="flex items-center justify-center min-h-screen text-red-500 font-bold" dir="rtl">
        عذراً، لا تملك صلاحية عرض تقرير طلب الصرف.
      </div>
    );
  }

  if (!request) {
    return (
      <div className="flex items-center justify-center min-h-screen" dir="rtl">
        <div className="text-center">
          <h2 className="text-xl font-bold mb-2">طلب الصرف غير موجود</h2>
          <Button onClick={() => {
            if (window.history.length > 1) {
              window.history.back();
            } else {
              navigate("/disbursements");
            }
          }}>
            العودة لطلبات الصرف
          </Button>
        </div>
      </div>
    );
  }

  const amount = parseFloat(request.amount?.toString() || "0");
  const project = request.project;
  const contract = request.contract;
  
  let customSupplier: any = null;
  let linkedRequestInfo: any = null;
  let rawAttachments: any[] = [];
  if (request?.attachmentsJson) {
    try {
      const attachments = typeof request.attachmentsJson === "string" ? JSON.parse(request.attachmentsJson) : request.attachmentsJson;
      if (Array.isArray(attachments)) {
        rawAttachments = attachments;
        const infoAttachment = attachments.find((a: any) => a.name === "custom_supplier_info");
        if (infoAttachment && infoAttachment.url) {
          customSupplier = typeof infoAttachment.url === "string" ? JSON.parse(infoAttachment.url) : infoAttachment.url;
        }
        const linkedAttachment = attachments.find((a: any) => a.name === "linked_request_info");
        if (linkedAttachment && linkedAttachment.url) {
          linkedRequestInfo = typeof linkedAttachment.url === "string" ? JSON.parse(linkedAttachment.url) : linkedAttachment.url;
        }
      }
    } catch (e) {
      console.error("Error parsing supplier/linked print metadata:", e);
    }
  }

  // تجميع كافة الروابط والمرفقات الخارجية لعرضها في زر الروابط المرفقة
  const documentationLinks: { name: string; url: string; type?: string }[] = [];

  rawAttachments.forEach((a: any) => {
    if (a && a.name !== "custom_supplier_info" && a.name !== "linked_request_info" && a.name !== "general_account_coverage" && a.type !== "metadata") {
      const urlStr = (a.url || a.link || "").trim();
      if (urlStr && (urlStr.startsWith("http://") || urlStr.startsWith("https://") || urlStr.startsWith("/") || urlStr.includes("."))) {
        const fullUrl = (urlStr.startsWith("http://") || urlStr.startsWith("https://") || urlStr.startsWith("/")) ? urlStr : `https://${urlStr}`;
        if (!documentationLinks.some(item => item.url === fullUrl)) {
          documentationLinks.push({
            name: a.name || "مستند / رابط خارجي",
            url: fullUrl,
            type: a.type || "link"
          });
        }
      }
    }
  });

  if (customSupplier?.linkUrl && typeof customSupplier.linkUrl === "string" && !documentationLinks.some(item => item.url === customSupplier.linkUrl)) {
    documentationLinks.push({
      name: customSupplier.linkName?.trim() || "رابط خارجي توثيقي",
      url: customSupplier.linkUrl.trim(),
      type: "link"
    });
  }

  if (linkedRequestInfo?.linkUrl && typeof linkedRequestInfo.linkUrl === "string" && !documentationLinks.some(item => item.url === linkedRequestInfo.linkUrl)) {
    documentationLinks.push({
      name: linkedRequestInfo.linkName?.trim() || "رابط خارجي توثيقي",
      url: linkedRequestInfo.linkUrl.trim(),
      type: "link"
    });
  }

  const isCustomType = !!customSupplier && ["supplier_one_time", "sadad_invoice", "misc_expenses"].includes(customSupplier.requestType);

  const resolvedSupplierName = customSupplier?.name || (request as any)?.supplierName || contract?.secondPartyName || "—";
  const resolvedSupplierAccountName = customSupplier?.name || (request as any)?.supplierAccountName || contract?.secondPartyAccountName || contract?.secondPartyName || "—";
  const resolvedSupplierIban = customSupplier?.iban || (request as any)?.supplierIban || contract?.secondPartyIban || "—";
  const resolvedSupplierBankName = customSupplier?.bank || (request as any)?.supplierBank || contract?.secondPartyBankName || "—";
  const resolvedMainProjectName = customSupplier?.mainProjectName || linkedRequestInfo?.mainProjectName || "—";

  const requestDate = new Date(request.requestedAt || new Date());

  const rawDescriptionText = isCustomType 
    ? (customSupplier?.requiredWorksDesc || customSupplier?.customProjectName || "—") 
    : (parsedWorks.scheduled || request.description || request.title || "—");

  // إزالة أي تنبيه مالي صفري من العرض ليكون الوصف نظيفاً ومرتباً
  const descriptionText = (rawDescriptionText || "—")
    .replace(/\r?\n?\[تنبيه مالـ?ي:\s*تم التوجيه بالصرف من الحساب العام للجمعية لتغطية العجز البالغ\s*\([٠0][٫.]?[٠0]*\s*ريال\)\s*عن مدفوعات الداعم الفعلية المقبوضة\]/g, "")
    .trim() || "—";

  const descLength = descriptionText.length;
  const descFontSizeClass = descLength > 200 ? "text-[10px] leading-tight p-1.5" : 
                            descLength > 100 ? "text-xs leading-snug p-2" : 
                            "";

  // حساب بيانات الدعم والأجور الإدارية
  const financialDetail = (request as any)?.financialDetail || (project as any)?.financialDetail;
  const supportingEntity = contract?.supportingEntity || "";
  let supportSources: { entity: string; customEntity?: string; amount: number }[] = [];
  
  if (supportingEntity && supportingEntity.trim().startsWith('[')) {
    try {
      const parsed = JSON.parse(supportingEntity);
      if (Array.isArray(parsed)) {
        supportSources = parsed.filter((s: any) => (s.entity && s.entity.trim() !== "") || (s.customEntity && s.customEntity.trim() !== ""));
      }
    } catch (e) {
      console.error("Failed to parse supportingEntity JSON", e);
    }
  }

  // إذا لم تكن هناك جهات دعم معرفة في العقد، نقرأ من قسم المالية في صفحة المشروع (financialDetail)
  if (supportSources.length === 0 && financialDetail?.supportSourcesJson && financialDetail.supportSourcesJson.trim().startsWith('[')) {
    try {
      const parsed = JSON.parse(financialDetail.supportSourcesJson);
      if (Array.isArray(parsed)) {
        supportSources = parsed.filter((s: any) => (s.entity && s.entity.trim() !== "") || (s.customEntity && s.customEntity.trim() !== ""));
      }
    } catch (e) {
      console.error("Failed to parse financialDetail supportSourcesJson", e);
    }
  }

  const hasContract = !!contract;
  const isTamamLinked = !!customSupplier?.isTamamLinked;
  const actualProjectCost = isTamamLinked 
    ? parseFloat(customSupplier?.actualProjectValue?.toString() || "0") 
    : (hasContract ? parseFloat(contract.contractAmount || "0") : (project?.budget ? parseFloat(project.budget.toString()) : amount));
  const managementPercentage = hasContract 
    ? parseFloat((contract as any).managementPercentage || "0") 
    : (financialDetail?.adminFeeValue ? parseFloat(financialDetail.adminFeeValue.toString()) : 0);
  const adminFees = request.adminFees 
    ? parseFloat(request.adminFees.toString()) 
    : (customSupplier?.adminFees 
        ? parseFloat(customSupplier.adminFees) 
        : (hasContract ? (actualProjectCost * managementPercentage) / 100 : (financialDetail?.adminFeeAmount ? parseFloat(financialDetail.adminFeeAmount.toString()) : 0)));
  const totalOpportunityValue = actualProjectCost + adminFees;

  if (supportSources.length === 0 && supportingEntity && supportingEntity.trim() !== "" && supportingEntity !== '[{"entity":"","customEntity":"","amount":0}]') {
    const isDonationShop = supportingEntity === "متجر التبرعات";
    const isEhsan = supportingEntity === "منصة احسان" || supportingEntity === "منصة إحسان";
    const isDirectDonation = supportingEntity === "تبرع مباشر";
    const isOther = !isDonationShop && !isEhsan && !isDirectDonation;
    const amt = contract?.supportedAmount ? parseFloat(contract.supportedAmount.toString()) : totalOpportunityValue;
    supportSources = [{
      entity: isDonationShop ? "متجر التبرعات" : isEhsan ? "منصة احسان" : isDirectDonation ? "تبرع مباشر" : "اخرى",
      customEntity: isOther ? supportingEntity : "",
      amount: amt
    }];
  }

  const resolvedSupportingEntitiesText = (supportSources.length > 0
    ? supportSources.map(s => {
        const name = s.entity === "other" || s.entity === "اخرى" ? (s.customEntity || "اخرى") : (s.entity || s.customEntity);
        if (supportSources.length > 1 && s.amount > 0) {
          return `${name} (${s.amount.toLocaleString()} ريال)`;
        }
        return name;
      }).filter(Boolean).join("، ")
    : (financialDetail?.customSupportEntity || financialDetail?.supportEntity || (request as any)?.fundingSourceName || (project as any)?.donorName || customSupplier?.fundingSupport || linkedRequestInfo?.fundingSupport || "")) || "—";

  const totalSupportedAmount = supportSources.length > 0 
    ? supportSources.reduce((sum, s) => sum + (s.amount || 0), 0)
    : (financialDetail?.supportAmount && parseFloat(financialDetail.supportAmount.toString()) > 0 ? parseFloat(financialDetail.supportAmount.toString()) : totalOpportunityValue);

  // محاولة الحصول على اسم الحي للطلبات المرتبطة ببرنامج بنيان
  const getNeighborhoodName = () => {
    if (project?.programType === "bunyan" && project?.programData) {
      try {
        const data = typeof project.programData === "string" 
          ? JSON.parse(project.programData) 
          : project.programData;
        return data?.neighborhoodName || "";
      } catch (e) {
        console.error("Failed to parse project programData for neighborhood name", e);
      }
    }
    return "";
  };

  const neighborhoodName = getNeighborhoodName();

  const projectAddress = customSupplier?.projectCity || contract?.mosqueCity || 
    [
      project?.city, 
      project?.district, 
      project?.address === "موقع محدد على الخريطة" ? "" : project?.address
    ].filter(Boolean).join(" - ") || 
    neighborhoodName ||
    "—";

  const isSuperAdmin = currentUser?.role === "super_admin" || currentUser?.role === "system_admin";
  const isPreparer = currentUser?.id === request?.requestedBy;
  const isExecDirector = 
    currentUser?.role === "general_manager" ||
    currentUser?.role === "executive_director" ||
    (currentUser as any)?.customRole?.nameAr === "المدير التنفيذي" ||
    currentUser?.email === "ceo@manarah.org.sa";

  const hasRequestApprovePerm = 
    hasApprovePermission || 
    userPermissionsList.includes("disbursements.approve") || 
    userPermissionsList.includes("disbursements.exception_approve");

  const canApproveRequest = (() => {
    if (!request || !currentUser) return false;
    if (request.status === "approved" || request.status === "paid" || request.status === "rejected") return false;

    // المرحلة الأولى: طلب الصرف بانتظار اعتماد مُعد الطلب
    if (request.status === "draft" || request.status === "pending") {
      return isPreparer || isSuperAdmin || hasChairmanInPerms;
    }

    // المرحلة الثانية: بانتظار اعتماد المدير التنفيذي حصراً
    if (request.status === "pending_executive") {
      return isExecDirector || (isSuperAdmin && !isPreparer);
    }

    return false;
  })();

  return (
    <div className="min-h-screen bg-gray-100 py-8 print:py-0 print:bg-white" dir="rtl">
      {/* أزرار التحكم والخيارات */}
      <div className="print:hidden w-full bg-white/90 backdrop-blur border-b p-3 sticky top-0 z-50 flex flex-wrap justify-between items-center gap-2 sm:fixed sm:top-4 sm:right-4 sm:w-auto sm:bg-transparent sm:backdrop-blur-none sm:border-0 sm:p-0 sm:justify-end">
        <Button
          variant="outline"
          onClick={() => {
            if (window.history.length > 1) {
              window.history.back();
            } else {
              navigate("/disbursements");
            }
          }}
          className="bg-white border shadow-sm sm:bg-white/90 font-semibold"
        >
          <ArrowRight className="ml-2 h-4 w-4" />
          رجوع
        </Button>

        <Button onClick={handlePrint} className="shadow-md gradient-primary text-white font-semibold">
          <Printer className="ml-2 h-4 w-4" />
          تنزيل PDF / طباعة
        </Button>

        {/* زر اعتماد طلب الصرف لصاحبي الاعتماد */}
        {canApproveRequest && (
          <Button
            onClick={() => approveRequestMutation.mutate({ id: requestId })}
            disabled={approveRequestMutation.isPending}
            className="flex-1 sm:flex-none bg-emerald-600 hover:bg-emerald-700 text-white animate-pulse"
          >
            {approveRequestMutation.isPending ? (
              <Loader2 className="h-4 w-4 ml-2 animate-spin" />
            ) : (
              <Check className="h-4 w-4 ml-2" />
            )}
            اعتماد طلب الصرف
          </Button>
        )}

        {/* تحديد صلاحية التحكم لكل زر توقيع - كل مستخدم يتحكم بتوقيعه فقط */}
        {(() => {
          const isCreator = currentUser?.id === request?.requestedBy;
          const isExecutiveDirector = 
            currentUser?.role === "general_manager" ||
            currentUser?.role === "executive_director" ||
            (currentUser as any)?.customRole?.nameAr === "المدير التنفيذي";

          const isRequestStage1Approved = request?.status === "pending_executive" || request?.status === "approved" || request?.status === "paid" || !!request?.approvedAt;
          const isRequestStage2Approved = request?.status === "approved" || request?.status === "paid" || !!request?.approvedAt;

          const isExceptionApprover = (request as any)?.exceptionApprovedBy
            ? currentUser?.id === (request as any)?.exceptionApprovedBy
            : (currentUser?.role === "super_admin" || userPermissionsList.includes("disbursements.exception_approve"));
          const canControlCreatorSig = (isExceptionApproved ? isExceptionApprover : isCreator) && !!resolvedSignatureUrl && isRequestStage1Approved;
          const canControlExecSig = isExecutiveDirector && !!executiveDirectorSignatureUrl && isRequestStage2Approved;

          return (
            <>
              {/* خيار إظهار/إخفاء توقيع مُعدّ الطلب - لمُعدّ الطلب فقط */}
              {canControlCreatorSig && (
                <label
                  htmlFor="show-creator-sig"
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white shadow-sm hover:bg-slate-50 transition-colors cursor-pointer select-none text-xs font-medium text-slate-700"
                >
                  <PenTool className={`w-3.5 h-3.5 ${showCreatorSignature ? "text-emerald-600" : "text-slate-400"}`} />
                  <span>توقيع مُعدّ الطلب</span>
                  <Checkbox
                    id="show-creator-sig"
                    checked={showCreatorSignature}
                    onCheckedChange={(checked) => {
                    const val = !!checked;
                    setShowCreatorSignature(val);
                    if (request?.id) {
                      updateRequestSigVisibilityMutation.mutate({ id: request.id, showCreatorSignature: val });
                    }
                  }}
                    className="scale-90"
                  />
                </label>
              )}

              {/* خيار إظهار/إخفاء توقيع المدير التنفيذي - للمدير التنفيذي والآدمن فقط */}
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
                    if (request?.id) {
                      updateRequestSigVisibilityMutation.mutate({ id: request.id, showExecutiveDirectorSignature: val });
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

      {/* صفحة الطباعة - تصميم متوازن لصفحة A4 */}
      <div className="print-container w-full max-w-[210mm] mx-auto bg-white shadow-lg print:shadow-none p-4 sm:p-8 print:p-0 min-h-[297mm] relative flex flex-col justify-start">
        {/* إطار مزدوج فاخر للمستند */}
        <div className="print-inner border-[3px] border-[#1a5f4a] p-4 sm:p-6 rounded-lg relative overflow-hidden bg-white print:border-[2px] print:p-5 h-full flex-1 flex flex-col justify-start">
          {/* خط ذهبي داخلي رفيع للإطار */}
          <div className="absolute inset-1.5 border border-[#d4a574] rounded pointer-events-none"></div>

          {/* محتوى المستند */}
          <div className="relative z-10 flex-1 flex flex-col justify-start space-y-8">
            <div>
              {/* الترويسة - الشعار والتاريخ ورقم الطلب */}
              <div className="flex flex-col gap-4 sm:flex-row sm:justify-between sm:items-start mb-4">
                <div className="flex items-center gap-3">
                  {orgSettings?.logoUrl ? (
                    <img src={orgSettings.logoUrl} alt="شعار الجمعية" className="h-14 w-auto" />
                  ) : (
                    <div className="w-12 h-12 bg-primary/10 rounded flex items-center justify-center">
                      <span className="text-primary font-bold text-lg">تمام</span>
                    </div>
                  )}
                  <div>
                    <div className="text-sm font-bold text-gray-800">
                      {orgSettings?.officialReportsName || ""}
                    </div>
                    <div className="text-[10px] text-gray-500">مكتب إدارة المشاريع</div>
                  </div>
                </div>

                <div className="text-xs space-y-1 text-right sm:text-left">
                  <div className="flex gap-1.5 justify-start sm:justify-end">
                    <span className="font-bold text-gray-600">التاريخ:</span>
                    <span className="border-b border-dotted border-gray-400 px-2">{formatGregorianDate(requestDate)} م</span>
                  </div>
                  <div className="flex gap-1.5 justify-start sm:justify-end">
                    <span className="font-bold text-gray-600">رقم الطلب:</span>
                    <span className="border-b border-dotted border-gray-400 px-2 font-mono text-gray-900 font-bold">{request.requestNumber}</span>
                  </div>
                </div>
              </div>

              {/* عنوان النموذج الفاخر */}
              <div className="text-center mb-6">
                <h1 className="text-xl sm:text-2xl font-black text-gray-800 pb-1 inline-block px-4 tracking-wide">
                  طلب صرف رقم {request.requestNumber}
                </h1>
              </div>

              {/* تم إزالة الخانات الأربعة المثبتة لعرض الجهات الداعمة ديناميكياً بالجدول أدناه */}

              {/* 2. خاص بدعم المؤسسات المانحة والمسؤولية المجتمعية */}
              <div className="mb-4 border border-gray-300 rounded-lg overflow-hidden bg-white">
                <div className="grid grid-cols-2 text-xs sm:text-sm">
                  <div className="flex border-l border-gray-200">
                    <span className="p-2.5 bg-gray-50/50 font-bold w-36 border-l border-gray-200 text-gray-750 shrink-0">اسم الجهة الداعمة:</span>
                    <span className="p-2.5 text-gray-800 font-bold flex-1">{resolvedSupportingEntitiesText || "—"}</span>
                  </div>
                  <div className="flex">
                    <span className="p-2.5 bg-gray-50/50 font-bold w-32 border-l border-gray-200 text-gray-750 shrink-0">مبلغ الدعم:</span>
                    <span className="p-2.5 text-gray-800 font-bold font-mono flex-1">
                      {totalSupportedAmount ? `${totalSupportedAmount.toLocaleString()} ريال` : `${totalOpportunityValue.toLocaleString()} ريال`}
                    </span>
                  </div>
                </div>
              </div>

              {/* 3. معلومات المشروع */}
              <div className="mb-4 border border-gray-300 rounded-lg overflow-hidden bg-white">
                <div className="grid grid-cols-2 text-xs sm:text-sm">
                  <div className="flex border-l border-b border-gray-200">
                    <span className="p-2.5 bg-gray-50/50 font-bold w-36 border-l border-gray-200 text-gray-750 shrink-0">المشروع الرئيسي:</span>
                    <span className="p-2.5 text-gray-800 font-bold flex-1">{resolvedMainProjectName}</span>
                  </div>
                  <div className="flex border-b border-gray-200">
                    <span className="p-2.5 bg-gray-50/50 font-bold w-32 border-l border-gray-200 text-gray-750 shrink-0">اسم المشروع:</span>
                    <span className="p-2.5 text-gray-800 font-bold flex-1">{isCustomType ? (customSupplier?.customProjectName || "—") : (project?.name || "—")}</span>
                  </div>
                  <div className="flex col-span-2">
                    <span className="p-2.5 bg-gray-50/50 font-bold w-36 border-l border-gray-200 text-gray-750 shrink-0">عنوان المشروع:</span>
                    <span className="p-2.5 text-gray-800 font-bold flex-1">{projectAddress}</span>
                  </div>
                </div>
              </div>

              {/* 4. وصف الأعمال المطلوبة */}
              <div className="mb-4 border border-gray-300 rounded-lg overflow-hidden bg-white">
                <div className="bg-gray-100/80 p-2 font-bold text-xs sm:text-sm border-b text-gray-800">
                  وصف الأعمال المطلوبة
                </div>
                <div className={`bg-white text-gray-800 leading-relaxed whitespace-pre-wrap break-words font-semibold min-h-[60px] ${descFontSizeClass ? descFontSizeClass : "p-3 text-xs sm:text-sm"}`}>
                  {descriptionText}
                </div>
              </div>

              {/* 5. جدول التكلفة والرسوم الإدارية */}
              <div className="mb-4 border border-gray-300 rounded-lg overflow-hidden bg-white">
                <table className="w-full text-xs sm:text-sm text-center border-collapse">
                  <tbody>
                    <tr className="border-b border-gray-200">
                      <td className="p-2.5 bg-gray-50/50 font-bold text-gray-750 border-l border-gray-200 w-1/3">تكلفة المشروع الفعلية</td>
                      <td className="p-2.5 font-bold font-mono text-gray-800 border-l border-gray-200 w-1/3">
                        {actualProjectCost.toLocaleString()}
                      </td>
                      <td className="p-2.5 bg-gray-50/50 font-bold text-gray-750 border-l border-gray-200 w-1/6">الأجور الإدارية</td>
                      <td className="p-2.5 font-bold font-mono text-gray-800 w-1/6">
                        {adminFees > 0 ? adminFees.toLocaleString() : "0"}
                      </td>
                    </tr>
                    <tr>
                      <td className="p-2.5 bg-gray-50/50 font-bold text-gray-750 border-l border-gray-200">إجمالي قيمة الفرصة</td>
                      <td className="p-2.5 font-bold font-mono text-emerald-800 border-l border-gray-200">
                        {totalOpportunityValue.toLocaleString()}
                      </td>
                      <td className="p-2.5 border-l border-gray-200" colSpan={2}></td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* 6. الموردون والمقاولون */}
              <div className="mb-4 border border-gray-300 rounded-lg overflow-hidden bg-white">
                <div className="bg-gray-100/80 p-2 font-bold text-xs sm:text-sm border-b text-center text-gray-800">
                  الموردون والمقاولون
                </div>
                <table className="w-full text-xs sm:text-sm text-center border-collapse">
                  <thead>
                    <tr className="bg-gray-55 border-b border-gray-200 text-gray-750">
                      <th className="p-2 font-bold border-l border-gray-200 w-1/2">اسم المورد</th>
                      <th className="p-2 font-bold w-1/2">المبلغ</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="p-2.5 border-l border-gray-200 font-bold text-gray-800 text-right pr-4">{resolvedSupplierName}</td>
                      <td className="p-2.5 font-bold font-mono text-emerald-700">{amount.toLocaleString()} ريال</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* المعلومات البنكية للمورد */}
              <div className="mb-4 border border-gray-300 rounded-lg overflow-hidden bg-white">
                <div className="bg-gray-100/80 p-2 font-bold text-xs sm:text-sm border-b text-center text-gray-800">
                  {customSupplier?.requestType === "sadad_invoice" ? "تفاصيل نظام سداد" : "المعلومات البنكية للمورد"}
                </div>
                <div className="flex flex-col text-xs sm:text-sm">
                  {customSupplier?.requestType === "sadad_invoice" ? (
                    <>
                      <div className="flex border-b border-gray-200">
                        <span className="p-2.5 bg-gray-50/50 font-bold w-36 border-l border-gray-200 text-gray-750 shrink-0">المفوتر:</span>
                        <span className="p-2.5 text-gray-800 font-bold flex-1 truncate">{customSupplier?.billerName || "—"}</span>
                      </div>
                      <div className="flex border-b border-gray-200">
                        <span className="p-2.5 bg-gray-50/50 font-bold w-36 border-l border-gray-200 text-gray-750 shrink-0">رمز المفوتر:</span>
                        <span className="p-2.5 text-gray-800 font-bold flex-1 font-mono">{customSupplier?.billerCode || "—"}</span>
                      </div>
                      <div className="flex">
                        <span className="p-2.5 bg-gray-50/50 font-bold w-36 border-l border-gray-200 text-gray-750 shrink-0">رقم سداد:</span>
                        <span className="p-2.5 text-gray-800 font-bold font-mono flex-1 text-[11px] sm:text-xs tracking-wider">{customSupplier?.sadadNumber || "—"}</span>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex border-b border-gray-200">
                        <span className="p-2.5 bg-gray-50/50 font-bold w-36 border-l border-gray-200 text-gray-750 shrink-0">اسم الحساب:</span>
                        <span className="p-2.5 text-gray-800 font-bold flex-1 truncate">{resolvedSupplierAccountName}</span>
                      </div>
                      <div className="flex border-b border-gray-200">
                        <span className="p-2.5 bg-gray-50/50 font-bold w-36 border-l border-gray-200 text-gray-750 shrink-0">اسم البنك:</span>
                        <span className="p-2.5 text-gray-800 font-bold flex-1">{resolvedSupplierBankName}</span>
                      </div>
                      <div className="flex">
                        <span className="p-2.5 bg-gray-50/50 font-bold w-36 border-l border-gray-200 text-gray-750 shrink-0">الآيبان:</span>
                        <span className="p-2.5 text-gray-800 font-bold font-mono flex-1 text-[11px] sm:text-xs tracking-wider">{resolvedSupplierIban}</span>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* 7. التوقيعات والاعتماد */}
            <div className="break-inside-avoid pt-4">
              <div className={`grid ${(resolvedSignatureName && resolvedSignatureDepartment) ? "grid-cols-2" : "grid-cols-1 max-w-xs mx-auto"} gap-6 text-center`}>
                {/* معد الطلب */}
                {(resolvedSignatureName && resolvedSignatureDepartment) && (
                  <div className="p-2">
                    <div className="font-bold text-gray-800 text-xs sm:text-sm mb-4">
                      {resolvedSignatureDepartment}
                    </div>
                    <div className="space-y-1 text-xs flex flex-col items-center justify-center">
                      {(showCreatorSignature && resolvedSignatureUrl && (request.status === "pending_executive" || request.status === "approved" || request.status === "paid" || !!request.approvedAt)) ? (
                        <div className="h-12 flex items-center justify-center mx-auto w-36 overflow-hidden my-1">
                          <img 
                            src={resolvedSignatureUrl} 
                            alt="التوقيع الرقمي" 
                            className="max-h-12 max-w-full object-contain" 
                          />
                        </div>
                      ) : (
                        <div className="h-10 border-b border-dashed border-gray-300 mx-auto w-36"></div>
                      )}
                      <div className="text-gray-900 font-bold">{resolvedSignatureName}</div>
                    </div>
                  </div>
                )}

                {/* المدير التنفيذي */}
                <div className="p-2">
                  <div className="font-bold text-gray-800 text-xs sm:text-sm mb-4">
                    {executiveDirectorDepartment}
                  </div>
                  <div className="space-y-1 text-xs flex flex-col items-center justify-center">
                    {(showExecutiveDirectorSignature && executiveDirectorSignatureUrl && (request.status === "approved" || request.status === "paid" || !!request.approvedAt)) ? (
                      <div className="h-12 flex items-center justify-center mx-auto w-36 overflow-hidden my-1">
                        <img
                          src={executiveDirectorSignatureUrl}
                          alt="توقيع المدير التنفيذي"
                          className="max-h-12 max-w-full object-contain"
                        />
                      </div>
                    ) : (
                      <div className="h-10 border-b border-dashed border-gray-300 mx-auto w-36"></div>
                    )}
                    <div className="text-gray-900 font-bold">{executiveDirectorName}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* نافذة / زر الروابط المرفقة العائم */}
      {documentationLinks.length > 0 && (
        <div className="fixed top-24 right-4 sm:right-6 z-30 print:hidden text-right" dir="rtl">
          {showLinksCard ? (
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/90 dark:border-slate-700 shadow-2xl p-4 space-y-3 w-64 max-w-[260px] animate-in fade-in-50 slide-in-from-top-2 duration-200">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700/80 pb-2.5">
                <div className="flex items-center gap-1.5 min-w-0">
                  <div className="p-1.5 rounded-lg bg-primary/10 text-primary shrink-0">
                    <Link2 className="w-3.5 h-3.5" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate block">
                      الروابط المرفقة
                    </span>
                  </div>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 shrink-0">
                    {documentationLinks.length}
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full shrink-0"
                  onClick={() => setShowLinksCard(false)}
                  title="إغلاق"
                >
                  <X className="w-3.5 h-3.5" />
                </Button>
              </div>

              <div className="space-y-2.5 max-h-64 overflow-y-auto pl-0.5">
                {documentationLinks.map((item, idx) => (
                  <div 
                    key={idx}
                    className="p-2.5 rounded-xl border border-slate-100 dark:border-slate-700/60 bg-slate-50/80 dark:bg-slate-900/60 space-y-1.5 text-right text-xs"
                  >
                    <div className="font-bold text-slate-800 dark:text-slate-200 text-[11px] truncate">
                      {item.name || `رابط مرفق #${idx + 1}`}
                    </div>

                    <div className="text-[10px] font-mono text-slate-500 dark:text-slate-400 truncate bg-white dark:bg-slate-800 p-1 rounded border border-slate-100 dark:border-slate-700/50 dir-ltr text-left" dir="ltr">
                      {item.url}
                    </div>

                    <div className="flex items-center gap-1.5 pt-0.5">
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noreferrer"
                        className="flex-1 inline-flex items-center justify-center gap-1 py-1 px-2 rounded-lg bg-primary hover:bg-primary/90 text-white text-[11px] font-medium transition-colors shadow-xs"
                      >
                        <span>فتح الرابط</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-6.5 w-6.5 p-0 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg shrink-0"
                        onClick={() => {
                          navigator.clipboard.writeText(item.url);
                          toast.success("تم نسخ الرابط للحافظة");
                        }}
                        title="نسخ الرابط"
                      >
                        <Copy className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowLinksCard(true)}
              className="bg-white dark:bg-slate-800 shadow-lg border border-slate-200/90 dark:border-slate-700 rounded-full px-3.5 py-1.5 flex items-center gap-2 text-xs font-bold text-primary hover:bg-primary/5 transition-all animate-in fade-in-50"
            >
              <Link2 className="w-3.5 h-3.5" />
              <span>الروابط المرفقة ({documentationLinks.length})</span>
            </Button>
          )}
        </div>
      )}

      {/* أنماط الطباعة المتقدمة */}
      <style>{`
        @media print {
          @page {
            size: A4;
            margin: 0 !important;
          }
          body {
            background-color: white !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .print\\:hidden {
            display: none !important;
          }
          .min-h-screen {
            background-color: white !important;
            padding: 0 !important;
          }
          .print-container {
            max-width: 100% !important;
            width: 100% !important;
            box-shadow: none !important;
            padding: 8mm !important;
            margin: 0 !important;
            min-height: 0 !important;
            height: auto !important;
          }
          .print-inner {
            min-height: 275mm !important;
            border-width: 2px !important;
            padding: 12px !important;
          }
          /* تقليص الفراغات والهوامش أثناء الطباعة لضمان ملاءمة الصفحة الواحدة */
          .mb-6 {
            margin-bottom: 8px !important;
          }
          .mb-4 {
            margin-bottom: 6px !important;
          }
          .p-2.5 {
            padding: 6px !important;
          }
          .p-2 {
            padding: 5px !important;
          }
          .py-4 {
            padding-top: 6px !important;
            padding-bottom: 6px !important;
          }
          .h-10 {
            height: 24px !important;
          }
        }
      `}</style>
    </div>
  );
}
