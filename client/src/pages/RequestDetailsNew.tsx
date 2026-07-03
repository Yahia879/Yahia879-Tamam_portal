import { useState, useEffect } from "react";
import { useParams, Link, useLocation } from "wouter";
import { ArrowRight, FileText, Clock, Users, Paperclip, MessageSquare, Building2, Calendar, User, XCircle, Zap, PauseCircle, CheckCircle, AlertCircle, Calculator, RotateCcw, Download, ChevronDown, ChevronUp, Eye, X, Star, Camera, FolderKanban, Play, Loader2, HeartHandshake } from "lucide-react";
import { Input } from "@/components/ui/input";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { ActiveActionCard } from "@/components/ActiveActionCard";
import { ColoredDialog } from "@/components/ColoredDialog";
import { ProgressStepper } from "@/components/ProgressStepper";
import { RequestDetailsModal } from "@/components/RequestDetailsModal";
import { getActiveAction, getCompletedSteps, getProgressPercentage } from "@/lib/requestActions";
import { BASE_ROLE_PERMISSIONS, hasRouteAccess } from "@/lib/routePermissions";
import { WORKFLOW_STEPS, PROGRAM_LABELS, STATUS_LABELS, STAGE_LABELS, getStageLabel, AUDIT_ACTION_LABELS, TECHNICAL_EVAL_OPTIONS, TECHNICAL_EVAL_OPTION_LABELS, getWorkflowForRequest, canTransitionStage } from "../../../shared/constants";
import { ProgramIcon } from "@/components/ProgramIcon";
import BoqTab from "@/components/BoqTab";
import { toast } from "sonner";
import { getAllFieldsForProgram } from "@/lib/programFields";

function ProgressiveImage({ src, alt, className }: { src: string; alt: string; className?: string }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  return (
    <div className="relative w-full h-full">
      {loading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-900/60 p-2 border border-dashed rounded-xl z-10">
          <Loader2 className="w-6 h-6 animate-spin text-indigo-500 mb-1.5" />
          <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400">
            جاري التحميل...
          </span>
        </div>
      )}
      <img
        src={src}
        alt={alt}
        className={`${className || ''} ${loading ? 'opacity-0' : 'opacity-100 transition-opacity duration-300'}`}
        onLoad={() => setLoading(false)}
        onError={() => {
          setLoading(false);
          setError(true);
        }}
      />
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-100 dark:bg-slate-800 text-xs text-red-500 rounded-xl border border-dashed">
          فشل تحميل الصورة
        </div>
      )}
    </div>
  );
}

export default function RequestDetailsNew() {
  const { id } = useParams();
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const requestId = parseInt(id!);

  const [lang] = useState<"ar" | "en">(() => {
    return (localStorage.getItem("quick-response-lang") as "ar" | "en") || "ar";
  });
  const isEn = user?.role === "quick_response" && lang === "en";

  const translateProgram = (type: string) => {
    if (isEn) {
      const enLabels: Record<string, string> = {
        bunyan: "Bunyan",
        daaem: "Daaem",
        enaya: "Enaya",
        emdad: "Emdad",
        ethraa: "Ethraa",
        sedana: "Sedana",
        taqa: "Taqa",
        miyah: "Miyah",
        suqya: "Suqya",
        bina: "Building",
        tarmeem: "Restoration",
        taathath: "Furnishing",
        hifz: "Preservation",
        other: "Other",
      };
      return enLabels[type] || type;
    }
    return PROGRAM_LABELS[type as keyof typeof PROGRAM_LABELS] || type;
  };

  const translateStage = (stage: string, track?: string) => {
    if (isEn) {
      const enStages: Record<string, string> = {
        submitted: "Submitted",
        initial_review: "Initial Review",
        field_visit: "Field Visit",
        technical_eval: "Technical Evaluation",
        boq_preparation: "BOQ Preparation",
        financial_eval_and_approval: "Financial Evaluation",
        quotation_approval: "Quotation Approval",
        contracting: "Contracting",
        execution: "Execution",
        handover: "Handover",
        closed: "Closed",
      };
      return enStages[stage] || stage;
    }
    return getStageLabel(stage, track);
  };

  const translateStatus = (status: string) => {
    if (isEn) {
      const enStatuses: Record<string, string> = {
        pending: "Pending",
        under_review: "Under Review",
        in_progress: "In Progress",
        completed: "Completed",
        rejected: "Rejected",
        cancelled: "Cancelled",
      };
      return enStatuses[status] || status;
    }
    return STATUS_LABELS[status as keyof typeof STATUS_LABELS] || status;
  };

  const translateDepartment = (dept: string) => {
    if (isEn && dept) {
      const depts: Record<string, string> = {
        "فريق الاستجابة السريعة": "Quick Response Team",
        "اللجنة الفنية": "Technical Committee",
        "الإدارة المالية": "Financial Department",
        "المقاول": "Contractor",
        "المستشار الفني": "Technical Consultant",
      };
      return depts[dept] || dept;
    }
    return dept;
  };

  const translateActiveAction = (action: any) => {
    if (!action || !isEn) return action;
    
    const titles: Record<string, string> = {
      "بانتظار الإجراء الفني": "Awaiting Technical Action",
      "تقديم تقرير الاستجابة السريعة": "Submit Quick Response Report",
      "تم تقديم تقرير الاستجابة السريعة": "Quick Response Report Submitted",
      "بانتظار المراجعة الفنية والقرار": "Awaiting Technical Review & Decision",
      "بانتظار إعداد جدول الكميات": "Awaiting BOQ Preparation",
      "بانتظار التقييم المالي والاعتماد": "Awaiting Financial Evaluation & Approval",
      "بانتظار اعتماد عرض السعر": "Awaiting Quotation Approval",
      "بانتظار توقيع العقد": "Awaiting Contract Signing",
      "المشروع قيد التنفيذ والمتابعة": "Project in Execution & Monitoring",
      "بانتظار استلام المشروع وإغلاقه": "Awaiting Project Handover & Closure",
      "تم إغلاق الطلب بنجاح": "Request Closed Successfully",
      "الطلب مغلق": "Request Closed",
      "تم إغلاق الطلب": "Request Closed",
    };

    const descriptions: Record<string, string> = {
      "تم تحويل هذا الطلب لمسار الاستجابة السريعة وهو قيد المتابعة والزيارة من قبل الشخص المسؤول. يرجى تعبئة ورفع تقرير الاستجابة السريعة لإكمال الخدمة.": "This request has been transferred to the quick response track and is under follow-up/visit by the assigned person. Please fill out and upload the quick response report to complete the service.",
      "تم تقديم واعتماد تقرير الاستجابة السريعة بنجاح. يمكنك استعراض التفاصيل بالضغط على الزر أدناه.": "The quick response report has been successfully submitted and approved. You can review the details by clicking the button below.",
      "تم تقديم واعتماد تقرير الاستجابة السريعة بنجاح وإغلاق الطلب. يمكنك استعراض التفاصيل بالضغط على الزر أدناه.": "The quick response report has been successfully submitted, approved, and the request closed. You can review the details by clicking the button below.",
      "تم تقديم ورفع تقرير الاستجابة السريعة بنجاح. يمكنك استعراض التفاصيل بالضغط على الزر أدناه.": "The quick response report has been successfully submitted and uploaded. You can review the details by clicking the button below.",
      "يرجى تعبئة ورفع تقرير الاستجابة السريعة لإكمال الخدمة.": "Please fill out and upload the quick response report to complete the service.",
    };

    const buttonLabels: Record<string, string> = {
      "رفع تقرير الاستجابة السريعة": "Upload Quick Response Report",
      "عرض تقرير الاستجابة السريعة": "View Quick Response Report",
      "إغلاق الطلب": "Close Request",
      "بدء المعاينة الميدانية": "Start Field Visit",
      "رفع تقرير المعاينة الميدانية": "Upload Field Visit Report",
      "عرض تقرير المعاينة": "View Field Visit Report",
      "اتخاذ القرار الفني": "Make Technical Decision",
      "إعداد جدول الكميات": "Prepare BOQ",
      "التقييم المالي": "Financial Evaluation",
      "اعتماد عرض السعر": "Approve Quotation",
      "توقيع العقد": "Sign Contract",
      "عرض العقد": "View Contract",
      "استلام المشروع": "Handover Project",
      "إضافة تقرير ختامي": "Add Final Report",
      "عرض التقرير الختامي": "View Final Report",
    };

    const translated = { ...action };
    if (titles[action.title]) {
      translated.title = titles[action.title];
    }
    if (descriptions[action.description]) {
      translated.description = descriptions[action.description];
    }
    if (action.actionButton && buttonLabels[action.actionButton.label]) {
      translated.actionButton = {
        ...action.actionButton,
        label: buttonLabels[action.actionButton.label]
      };
    }
    return translated;
  };

  // States for drawers
  const [projectInfoOpen, setProjectInfoOpen] = useState(false);
  const [timelineOpen, setTimelineOpen] = useState(false);
  const [attachmentsOpen, setAttachmentsOpen] = useState(false);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [boqOpen, setBoqOpen] = useState(false);
  const [showReviewInfo, setShowReviewInfo] = useState(false);
  const [previewImage, setPreviewImage] = useState<{ url: string; name: string } | null>(null);
  
  // States for add dialogs
  const [addCommentOpen, setAddCommentOpen] = useState(false);
  const [addAttachmentOpen, setAddAttachmentOpen] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Mark comments as read mutation
  const markAsReadMutation = trpc.requests.markCommentsAsRead.useMutation({
    onSuccess: () => {
      utils.requests.getUnreadCommentsCount.invalidate({ requestId });
    },
  });
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [quickResponseReportOpen, setQuickResponseReportOpen] = useState(false);
  const [fieldVisitReportOpen, setFieldVisitReportOpen] = useState(false);
  
  // States for technical evaluation
  const [showTechnicalEvalDialog, setShowTechnicalEvalDialog] = useState(false);
  const [selectedDecision, setSelectedDecision] = useState<string | null>(null);
  const [justification, setJustification] = useState("");
  const [projectName, setProjectName] = useState("");
  const [selectedManagerId, setSelectedManagerId] = useState<string | null>(null);
  const [startDate, setStartDate] = useState("");
  const [expectedEndDate, setExpectedEndDate] = useState("");
  const [durationDays, setDurationDays] = useState("");
  const [scheduledDate, setScheduledDate] = useState("");
  const [scheduledTime, setScheduledTime] = useState("");
  const [selectedQuickResponseMemberId, setSelectedQuickResponseMemberId] = useState<string | null>(null);
  const [showRejectionReportDialog, setShowRejectionReportDialog] = useState(false);

  // States for donation opportunity
  const [donationTitle, setDonationTitle] = useState("");
  const [donationTargetAmount, setDonationTargetAmount] = useState("");
  const [donationDescription, setDonationDescription] = useState("");





  const { data: quickResponseTeamMembers } = trpc.requests.getQuickResponseTeamMembers.useQuery(undefined, {
    enabled: selectedDecision === 'quick_response' && showTechnicalEvalDialog
  });

  const { data: busyHours } = trpc.requests.getTechnicianBusyHours.useQuery(
    {
      userId: selectedQuickResponseMemberId ? parseInt(selectedQuickResponseMemberId) : 0,
      date: scheduledDate,
    },
    {
      enabled: selectedDecision === 'quick_response' && !!selectedQuickResponseMemberId && !!scheduledDate,
      refetchOnWindowFocus: true,
    }
  );
  // Fetch project managers
  const { data: managersResult } = trpc.users.getAll.useQuery(
    {
      roles: ['project_manager'],
      permission: 'projects.assign_as_manager',
      limit: 100,
    },
    {
      enabled: selectedDecision === 'convert_to_project' && showTechnicalEvalDialog,
    }
  );
  const managers = managersResult?.items || [];
  // Fetch request data
  const { data: request, isLoading } = trpc.requests.getById.useQuery({ id: requestId });
  const history = request?.history || [];

  useEffect(() => {
    if (selectedDecision === 'convert_to_project' && request) {
      setProjectName(request.mosque?.name ? `مشروع مسجد ${request.mosque.name}` : `مشروع طلب رقم ${request.requestNumber}`);
    } else if (selectedDecision === 'convert_to_donation' && request) {
      setProjectName(request.mosque?.name ? `مشروع مسجد ${request.mosque.name}` : `مشروع طلب رقم ${request.requestNumber}`);
      setDonationTitle(request.mosque?.name ? `فرصة تبرع لمسجد ${request.mosque.name}` : `فرصة تبرع لطلب رقم ${request.requestNumber}`);
      setDonationTargetAmount(request.estimatedCost ? request.estimatedCost.toString() : "");
      setDonationDescription(request.mosque?.name ? `فرصة تبرع لتنفيذ الأعمال المطلوبة لمسجد ${request.mosque.name}` : "");
    }
  }, [selectedDecision, request]);
  const utils = trpc.useUtils();

  // Fetch unread comments count
  const { data: unreadData } = trpc.requests.getUnreadCommentsCount.useQuery({ requestId });
  const unreadCount = unreadData?.count || 0;

  // Fetch field visit data for field_visit stage
  const { data: fieldVisit } = trpc.fieldVisits.getVisit.useQuery(
    { requestId },
    { enabled: request?.currentStage === 'field_visit' }
  );

  // Fetch project data if request is converted to project
  const { data: linkedProject } = trpc.projects.getByRequestId.useQuery(
    { requestId },
    { enabled: !!requestId }
  );

  // Fetch contract linked to this request (for contracting stage)
  const { data: linkedContract } = trpc.contracts.getByRequestId.useQuery(
    { requestId },
    { enabled: request?.currentStage === 'contracting' }
  );
  const hasApprovedContract = (linkedContract as any)?.status === 'approved' || (linkedContract as any)?.status === 'active';

  // Fetch final report for this request
  const { data: finalReports } = trpc.finalReports.getByRequestId.useQuery(
    { requestId },
    { enabled: !!requestId }
  );
  const latestFinalReport = finalReports?.[0] || null;

  // Fetch BOQ data for validation
  const { data: boqResult } = trpc.projects.getBOQ.useQuery(
    { requestId },
    { enabled: request?.currentStage === 'boq_preparation' }
  );
  const hasBoqItems = boqResult?.items && boqResult.items.length > 0;

  // Fetch Quotations for validation
  const { data: quotationsResult } = trpc.projects.getQuotationsByRequest.useQuery(
    { requestId },
    { enabled: request?.currentStage === 'financial_eval_and_approval' }
  );
  const hasApprovedQuotation = quotationsResult?.quotations?.some((q: any) => q.status === 'accepted' || q.status === 'approved');

  // Mutations
  const updateStageMutation = trpc.requests.updateStage.useMutation({
    onSuccess: () => {
      utils.requests.getById.invalidate({ id: requestId });
      toast.success("تم الانتقال إلى المرحلة التالية بنجاح");
    },
    onError: (error) => {
      toast.error(error.message || "حدث خطأ أثناء الانتقال");
    },
  });


  const addCommentMutation = trpc.requests.addComment.useMutation({
    onSuccess: () => {
      utils.requests.getById.invalidate({ id: requestId });
      toast.success("تم إضافة التعليق بنجاح");
    },
    onError: (error) => {
      toast.error(error.message || "حدث خطأ أثناء إضافة التعليق");
    },
  });

  const addAttachmentMutation = trpc.requests.addAttachment.useMutation({
    onSuccess: () => {
      utils.requests.getById.invalidate({ id: requestId });
      toast.success("تم رفع المرفق بنجاح");
    },
    onError: (error: any) => {
      toast.error(error.message || "حدث خطأ أثناء رفع المرفق");
    },
  });

  const updateReviewCompletedMutation = trpc.requests.updateReviewCompleted.useMutation({
    onSuccess: () => {
      utils.requests.getById.invalidate({ id: requestId });
      toast.success("تم تحديث حالة المراجعة بنجاح");
    },
    onError: (error) => {
      toast.error(error.message || "حدث خطأ أثناء تحديث حالة المراجعة");
    },
  });
  
  const uploadAttachmentMutation = trpc.storage.uploadRequestAttachment.useMutation();

  const updateStatusMutation = trpc.requests.updateStatus.useMutation({
    onSuccess: (data) => {
      toast.success("تم تحديث حالة الطلب بنجاح");
      utils.requests.getById.invalidate({ id: requestId });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const technicalEvalMutation = trpc.requests.technicalEvalDecision.useMutation({
    onSuccess: (data) => {
      toast.success(data.message);
      setShowTechnicalEvalDialog(false);
      const wasConverting = selectedDecision === 'convert_to_project' || selectedDecision === 'convert_to_donation';
      setSelectedDecision(null);
      setJustification("");
      setProjectName("");
      setStartDate("");
      setExpectedEndDate("");
      setDurationDays("");
      setDonationTitle("");
      setDonationTargetAmount("");
      setDonationDescription("");
      utils.requests.getById.invalidate({ id: requestId });
      if (wasConverting) {
        setLocation(`/requests/${requestId}`);
      }    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  // تحديث تلقائي للمرحلة عند وجود عقد معتمد
  useEffect(() => {
    if (request?.currentStage === 'contracting' && linkedContract && !updateStageMutation.isPending) {
      const contract = linkedContract as any;
      if (contract.status === 'approved' || contract.status === 'active') {
        console.log('[Request Workflow] Approved contract detected, transitioning to execution stage');
        updateStageMutation.mutate({ requestId, newStage: 'execution' as any });
      }
    }
  }, [request?.currentStage, linkedContract, updateStageMutation.isPending, requestId]);

  // Handler for stage transition
  const handleStageTransition = () => {
    if (!request || !activeAction) return;
    
    // إذا كان هناك openModal أو كان المسار يحتوي على /boq، افتح نافذة منبثقة
    if ((activeAction.actionButton as any)?.openModal === 'boq' || activeAction.actionButton?.redirectUrl?.includes('/boq')) {
      setBoqOpen(true);
      return;
    }

    // إذا كان المطلوب فتح نافذة تقرير الاستجابة السريعة
    if (activeAction.actionButton?.openModal === 'quick_response_report') {
      setQuickResponseReportOpen(true);
      return;
    }

    // إذا كان المطلوب فتح نافذة تقرير الزيارة الميدانية
    if (activeAction.actionButton?.openModal === 'field_visit_report') {
      setFieldVisitReportOpen(true);
      return;
    }
    
    // إذا كان الطلب في مرحلة التقييم المالي، تحقق من اعتماد عرض سعر قبل الانتقال للتعاقد
    if (request.currentStage === 'financial_eval_and_approval') {
      const nextStage = getNextStage(request.currentStage);
      if (nextStage === 'contracting' && !hasApprovedQuotation) {
        toast.error("لا يمكن الانتقال إلى مرحلة التعاقد قبل اعتماد عرض سعر");
        return;
      }
    }

    // إذا كان هناك redirectUrl، انتقل إلى الصفحة المحددة
    if (activeAction.actionButton?.redirectUrl) {
      const url = activeAction.actionButton.redirectUrl
        .replace(':requestId', requestId.toString())
        .replace(':projectId', request.project?.id?.toString() || '')
        .replace(':reportId', latestFinalReport?.id?.toString() || '');
      setLocation(url);
      return;
    }
    
    // إذا لم يكن هناك redirectUrl، انتقل إلى المرحلة التالية
    const nextStage = getNextStage(request.currentStage);
    if (!nextStage) {
      toast.error("لا توجد مرحلة تالية");
      return;
    }
    
    // السماح بتجاوز شروط التعاقد عند وجود مسودة عقد لجميع الطلبات
    const skipPrerequisites = request.currentStage === 'contracting';
    
    updateStageMutation.mutate({ 
      requestId, 
      newStage: nextStage as any,
      skipPrerequisites
    });
  };

  // Get workflow based on request track
  const workflow = request ? getWorkflowForRequest(request.requestTrack || 'standard') : WORKFLOW_STEPS;

  // Get next stage
  const getNextStage = (currentStage: string) => {
    const currentIndex = workflow.findIndex((s) => s.id === currentStage);
    if (currentIndex === -1 || currentIndex === workflow.length - 1) return null;
    return workflow[currentIndex + 1].id;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">{isEn ? "Loading..." : "جاري التحميل..."}</p>
        </div>
      </div>
    );
  }

  if (!request) {
    return (
      <div className="flex items-center justify-center min-h-screen" dir={isEn ? "ltr" : "rtl"}>
        <Card className="p-8 text-center">
          <h2 className="text-2xl font-bold mb-4">{isEn ? "Request Not Found" : "الطلب غير موجود"}</h2>
          <p className="text-muted-foreground mb-6">{isEn ? "The requested service request could not be found." : "لم يتم العثور على الطلب المطلوب"}</p>
          <Link href={user?.role === "service_requester" ? "/my-requests" : "/requests"}>
            <Button>{isEn ? "Back to Requests" : "العودة إلى الطلبات"}</Button>
          </Link>
        </Card>
      </div>
    );
  }

  // تحديد ما إذا كان المستخدم مستفيداً
  const isRequester = user?.role === 'service_requester';

  const userRole = user?.role ?? "";
  const isBaseRole = Boolean(userRole && Object.prototype.hasOwnProperty.call(BASE_ROLE_PERMISSIONS, userRole));
  const hasCustomRole = !!(user as any)?.customRole || (!!userRole && !isBaseRole);
  const userPermissions: string[] = (user as any)?.permissions ?? [];
  const hasViewDetailsPermission = user?.role === 'super_admin' || user?.role === 'system_admin' || userPermissions.includes("requests.view_details");
  const isDirectQuickRequest = request?.requestTrack === 'quick_response' && request?.currentStage === 'closed';
  const showQuickRequestLayout = !!isDirectQuickRequest;
  const isFieldTeam = ((user?.role as string) === 'field_team' || userPermissions.includes("requests.manage_as_field_team")) && !userPermissions.includes("requests.view_details");
  const isQuickResponseUser = ((user?.role as string) === 'quick_response' || userPermissions.includes("requests.manage_as_quick_response")) && !userPermissions.includes("requests.view_details");

  const isQuickResponse = request.requestTrack === 'quick_response' || request.technicalEvalDecision === 'quick_response';

  // التحقق من صلاحية رفع التقرير الختامي (خاصة بالاتصال المؤسسي)
  const hasFinalReportPerm = userPermissions.includes("requests.upload_final_report");

  const isManagementUser = user && (
    ['super_admin', 'system_admin', 'projects_office'].includes(user.role) ||
    (user.role === 'project_manager' && request.assignedTo === user.id) ||
    (userPermissions.includes("requests.view_details") && !['financial', 'financial_manager', 'corporate_comm'].includes(user.role))
  );

  // Get active action - لا تُظهر الإجراءات الإدارية للمستفيد إلا إذا كان الطلب مغلقاً أو في مرحلة الاستلام
  let activeAction = (isRequester && !['handover', 'closed'].includes(request.currentStage))
    ? null
    : getActiveAction(request.currentStage, user?.role, {
        assignedTo: request.assignedTo,
        userId: user?.id,
        requestTrack: request.requestTrack,
        quickReports: request.quickReports,
        userPermissions,
      });

  // تخصيص الإجراء النشط للمشروع المغلق أو المرفوض
  if (activeAction && request.status === 'rejected') {
    activeAction = {
      ...activeAction,
      title: "تم رفض المشروع",
      description: "تم رفض طلب المشروع في مرحلة التقييم الفني. يمكنك مراجعة تفاصيل وسبب الرفض بالضغط على الزر أدناه.",
      icon: XCircle as any,
      iconColor: "text-red-600",
      actionButton: {
        label: "عرض التقرير النهائي",
        onClick: () => setShowRejectionReportDialog(true),
      } as any,
      canPerformAction: true,
    };
  } else if (activeAction && request.currentStage === 'closed') {
    activeAction = {
      ...activeAction,
      title: "المشروع مكتمل",
      description: "تم إغلاق المشروع بنجاح. يمكنك مراجعة التقارير النهائية والمستندات.",
      icon: CheckCircle as any,
      iconColor: "text-green-600",
      actionButton: latestFinalReport ? {
        label: "عرض التقرير النهائي",
        onClick: () => setLocation(`/final-report/${latestFinalReport.id}?requestId=${requestId}`),
      } as any : undefined,
      canPerformAction: !!latestFinalReport,
    };
  } else if (activeAction && ['technical_eval', 'execution'].includes(request.currentStage) && request.status === 'suspended' && isManagementUser) {
    activeAction = null;
  } else if (activeAction && request.currentStage === 'handover') {
    const isAdmin = user && ["super_admin", "system_admin"].includes(user.role);
    const isAssignedCorpComm = user && request.finalReportAssignedTo && user.id === request.finalReportAssignedTo;
    const isCorpCommFallback = user && !request.finalReportAssignedTo && (user.role === 'corporate_comm' || hasFinalReportPerm);
    const hasUploadPermission = user && (user.role === 'corporate_comm' || hasFinalReportPerm);
    const isCorpComm = !!hasUploadPermission && (request.finalReportAssignedTo ? (!!isAssignedCorpComm || hasFinalReportPerm) : isCorpCommFallback);

    if (!request.finalReportAssignedTo) {
      if (isManagementUser || (user?.role && canTransitionStage(user.role, 'handover'))) {
        activeAction = {
          ...activeAction,
          title: "تعيين المسؤول عن التقرير الختامي",
          description: "يرجى تعيين المسؤول عن إعداد ورفع التقرير الختامي للمشروع لبدء إجراءات الاستلام والتسليم.",
          actionButton: {
            label: "تعيين المسؤول",
            redirectUrl: "/requests/:requestId/assign-final-report",
          } as any,
          canPerformAction: true,
        };
      } else {
        activeAction = {
          ...activeAction,
          title: "بانتظار تعيين المسؤول",
          description: "بانتظار قيام مكتب المشاريع بتعيين المسؤول عن رفع التقرير الختامي للمشروع.",
          actionButton: {
            label: "بانتظار تعيين المسؤول",
            onClick: () => {},
            disabled: true,
          } as any,
          canPerformAction: false,
        };
      }
    } else {
      if (!latestFinalReport) {
        if (isCorpComm) {
          activeAction = {
            ...activeAction,
            title: "رفع التقرير الختامي للمشروع",
            description: "يرجى تعبئة ورفع التقرير الختامي للمشروع لإتمام مرحلة الاستلام والتسليم.",
            actionButton: {
              label: "رفع التقرير الختامي",
              onClick: () => setLocation(`/final-report/new?requestId=${requestId}`),
            } as any,
            canPerformAction: true,
          };
        } else {
          activeAction = {
            ...activeAction,
            title: "بانتظار التقرير الختامي",
            description: request.finalReportAssignedToUser
              ? `تم الانتهاء من أعمال الاستلام وفي انتظار قيام الموظف المعين (${request.finalReportAssignedToUser.name}) برفع التقرير الختامي للمشروع.`
              : "تم الانتهاء من أعمال الاستلام وفي انتظار قيام مسؤولي الاتصال المؤسسي برفع التقرير الختامي للمشروع.",
            actionButton: {
              label: request.finalReportAssignedToUser
                ? `بانتظار رفع التقرير الختامي من قبل ${request.finalReportAssignedToUser.name}`
                : "بانتظار رفع التقرير الختامي من قبل مسؤولي الاتصال المؤسسي",
              onClick: () => {},
              disabled: true,
            } as any,
            canPerformAction: false,
          };
        }
      } else {
        activeAction = {
          ...activeAction,
          title: "تم رفع التقرير الختامي",
          description: "تم تقديم التقرير الختامي للمشروع بنجاح. يمكنك استعراض التقرير بالضغط على الزر أدناه.",
          actionButton: {
            label: "عرض التقرير الختامي",
            onClick: () => setLocation(`/final-report/${latestFinalReport.id}?requestId=${requestId}`),
          } as any,
          canPerformAction: true,
        };
      }
    }
  }

  // Override active action for contracting stage based on contract status
  if (request.currentStage === 'contracting' && activeAction && linkedContract) {
    const contract = linkedContract as any;
    if (contract.status === 'approved' || contract.status === 'active') {
      activeAction = {
        ...activeAction,
        title: 'تم اعتماد العقد',
        description: 'تم اعتماد العقد بنجاح. يمكنك الآن الانتقال لمرحلة التنفيذ لبدء العمل الميداني.',
        icon: 'CheckCircle',
        iconColor: 'text-emerald-600',
        actionButton: {
          label: 'عرض العقد المعتمد',
          redirectUrl: `/contracts/view/${contract.id}`,
        },
      };
    } else {
      // الانتقال للمرحلة التالية مباشرة باستخدام مسودة العقد الحالية لجميع الطلبات
      activeAction = {
        ...activeAction,
        title: 'جاهز للانتقال للمرحلة التالية',
        description: 'يمكنك الآن الانتقال للمرحلة التالية مباشرة باستخدام مسودة العقد الحالية.',
        icon: 'ArrowRight',
        iconColor: 'text-emerald-600',
        actionButton: {
          label: 'الانتقال للمرحلة التالية',
          redirectUrl: undefined,
        },
      };
    }
  }

  // Override active action for field_visit stage based on field visit status
  if (request.currentStage === 'field_visit' && activeAction) {
    if (!fieldVisit?.scheduledDate && !request?.fieldVisitScheduledDate) {
      // لم يتم الجدولة بعد
      activeAction = {
        ...activeAction,
        title: 'جدولة الزيارة الميدانية',
        description: 'تحديد موعد الزيارة الميدانية',
        actionButton: {
          label: 'جدولة الزيارة الميدانية',
          redirectUrl: '/field-visits/schedule/:requestId',
        },
        canPerformAction: !isFieldTeam,
      };
    } else if (!fieldVisit?.reportSubmitted) {
      // تم الجدولة، الآن يجب رفع التقرير
      activeAction = {
        ...activeAction,
        title: 'رفع تقرير الزيارة الميدانية',
        description: 'رفع تقرير المعاينة الميدانية',
        actionButton: {
          label: 'رفع التقرير',
          redirectUrl: '/field-visits/report/:requestId',
        },
        canPerformAction: isFieldTeam || userPermissions.includes("requests.manage_as_field_team") || user?.role === 'field_team',
      };
    } else {
      if (isFieldTeam) {
        activeAction = {
          ...activeAction,
          title: 'تم تقديم تقرير الزيارة الميدانية',
          description: 'تم تقديم ورفع تقرير الزيارة الميدانية بنجاح. يمكنك استعراض التفاصيل بالضغط على الزر أدناه.',
          actionButton: {
            label: 'عرض تقرير الزيارة الميدانية',
            openModal: 'field_visit_report',
          },
          canPerformAction: true,
        };
      } else {
        // تم إكمال جميع الإجراءات، يمكن الانتقال للمرحلة التالية
        activeAction = {
          ...activeAction,
          title: 'الانتقال للمرحلة التالية',
          description: 'تم إكمال جميع إجراءات الزيارة الميدانية',
          actionButton: {
            label: 'الانتقال للتقييم الفني',
            redirectUrl: undefined, // سيستخدم handleStageTransition الافتراضي
          },
          canPerformAction: !isFieldTeam,
        };
      }
    }
  }

  // Override active action for field_team if they have submitted the report (regardless of currentStage)
  const hasFieldReport = request?.fieldReports && request.fieldReports.length > 0;
  if (isFieldTeam && (hasFieldReport || fieldVisit?.reportSubmitted)) {
    activeAction = {
      stage: request.currentStage,
      title: 'تم تقديم تقرير الزيارة الميدانية',
      description: 'تم تقديم ورفع تقرير الزيارة الميدانية بنجاح. يمكنك استعراض التفاصيل بالضغط على الزر أدناه.',
      icon: 'FileText',
      iconColor: 'text-indigo-600',
      actionButton: {
        label: 'عرض تقرير الزيارة الميدانية',
        openModal: 'field_visit_report',
      },
      allowedRoles: ['field_team', 'requests.manage_as_field_team'],
      canPerformAction: true,
    };
  }

  // تم نقل تعريف isManagementUser للأعلى للاستخدام في صلاحيات activeAction

  const latestQuickReport = request.quickReports && request.quickReports.length > 0
    ? request.quickReports[request.quickReports.length - 1]
    : null;

  const canPerformQuickResponse = (user?.role as string) === 'quick_response' || userPermissions.includes("requests.manage_as_quick_response");

  // Override active action for quick_response user if they have submitted the report (regardless of currentStage)
  if (canPerformQuickResponse && latestQuickReport) {
    if (!hasViewDetailsPermission) {
      activeAction = {
        stage: request.currentStage,
        title: 'تم تقديم تقرير الاستجابة السريعة',
        description: 'تم تقديم ورفع تقرير الاستجابة السريعة بنجاح. يمكنك استعراض التفاصيل بالضغط على الزر أدناه.',
        icon: 'Zap',
        iconColor: 'text-emerald-600',
        actionButton: {
          label: 'عرض تقرير الاستجابة السريعة',
          openModal: 'quick_response_report',
        },
        allowedRoles: ['quick_response', 'requests.manage_as_quick_response'],
        canPerformAction: true,
      };
    }
  } else if (canPerformQuickResponse) {
    // If they haven't submitted the report yet, they can only do it if the request is in execution stage and has quick_response track
    if (request.currentStage === 'execution' && request.requestTrack === 'quick_response') {
      activeAction = {
        stage: 'execution',
        title: 'تقديم تقرير الاستجابة السريعة',
        description: 'يرجى تعبئة ورفع تقرير الاستجابة السريعة لإكمال الخدمة.',
        icon: 'Zap',
        iconColor: 'text-purple-600',
        actionButton: {
          label: 'رفع تقرير الاستجابة السريعة',
          redirectUrl: `/requests/:requestId/quick-response`,
        },
        allowedRoles: ['quick_response', 'requests.manage_as_quick_response'],
        canPerformAction: true,
      };
    } else if (!hasViewDetailsPermission) {
      // In any other stage/track, they cannot perform any action (only if not admin/PM)
      activeAction = {
        stage: request.currentStage,
        title: 'بانتظار الإجراء الفني',
        description: 'هذا الطلب بانتظار استكمال الإجراءات الإدارية أو الفنية من قبل فريق العمل.',
        icon: 'Clock',
        iconColor: 'text-amber-500',
        allowedRoles: [],
        canPerformAction: false,
      };
    }
  }

  const canAccessRequestDetails = Boolean(
    user &&
    userRole !== "service_requester" &&
    hasRouteAccess(`/requests/${requestId}`, userRole, userPermissions, hasCustomRole)
  );
  const canViewQuickResponseReport = Boolean(
    latestQuickReport &&
    isQuickResponse &&
    (isRequester || canAccessRequestDetails)
  );
  const showQuickResponseReportShortcut = canViewQuickResponseReport && 
                                          userRole !== "quick_response" && 
                                          !userPermissions.includes("requests.manage_as_field_team") &&
                                          !userPermissions.includes("requests.manage_as_quick_response");

  // حسابات التحقق من شروط الدفعات للانتقال لمرحلة الاستلام
  const projectContracts = (linkedProject as any)?.contracts || [];
  const projectPayments = (linkedProject as any)?.payments || [];

  const totalPaymentsSum = projectPayments.reduce((sum: number, p: any) => sum + parseFloat(p.amount || "0"), 0);
  const totalContractsSum = projectContracts.reduce((sum: number, c: any) => sum + parseFloat(c.amount || "0"), 0);

  const hasPayments = projectPayments.length > 0;
  const allPaymentsPaid = hasPayments && projectPayments.every((p: any) => p.status === 'paid');
  const paymentsMatchContracts = hasPayments && Math.abs(totalPaymentsSum - totalContractsSum) < 0.01;
  const cannotTransitionToHandover = !allPaymentsPaid || !paymentsMatchContracts;

  const completedSteps = getCompletedSteps(request.currentStage, workflow);
  const progress = getProgressPercentage(request.currentStage, workflow);

  return (
    <div className="min-h-screen bg-background" dir={isEn ? "ltr" : "rtl"}>
      {/* Header */}
      <div className="bg-card border-b sticky top-0 z-10 sm:relative">
        <div className="container mx-auto px-4 py-4 sm:py-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start sm:items-center gap-3 sm:gap-4">
              <Link href={user?.role === "service_requester" ? "/my-requests" : "/requests"}>
                <Button variant="ghost" size="sm" className="h-8 w-8 sm:h-9 sm:w-auto p-0 sm:px-3">
                  <ArrowRight className={`w-4 h-4 ${isEn ? "rotate-180 mr-2" : "ml-2"}`} />
                  <span className="hidden sm:inline">{isEn ? "Back" : "رجوع"}</span>
                </Button>
              </Link>
              <div className="flex items-start sm:items-center gap-3 min-w-0">
                <ProgramIcon program={request.programType} className="w-8 h-8 sm:w-10 sm:h-10 flex-shrink-0" />
                <div className="min-w-0">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                    <h1 className="text-base sm:text-xl font-bold text-muted-foreground font-mono truncate">{request.requestNumber}</h1>
                    {linkedProject && (
                      <Link href={`/projects/${linkedProject.id}`}>
                        <Button variant="outline" size="sm" className="bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100 h-7 text-[10px] sm:text-xs px-2 truncate max-w-full">
                          <Building2 className={`w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0 ${isEn ? "mr-1" : "ml-1"}`} />
                          <span className="truncate">{isEn ? `Converted to Project (${linkedProject.projectNumber})` : `محول إلى مشروع (${linkedProject.projectNumber})`}</span>
                        </Button>
                      </Link>
                    )}
                  </div>
                  <p className="text-base sm:text-lg font-bold text-foreground truncate">
                    {request.mosque?.name || (isEn ? "Mosque not specified" : "مسجد غير محدد")}
                  </p>
                  <p className="text-xs sm:text-sm text-muted-foreground truncate">
                    {translateProgram(request.programType)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-4 sm:py-8">
        {showQuickRequestLayout ? (
          <div className="space-y-6 max-w-4xl mx-auto" dir={isEn ? "ltr" : "rtl"}>
            <ActiveActionCard
              title={isEn ? "Completed Quick Response Request" : "طلب استجابة سريعة مكتمل"}
              description={isEn ? "This request has been created and fully processed via the quick response track for immediate handling of the mosque's emergency situation." : "تم إنشاء هذا الطلب ومعالجته بالكامل عبر مسار الاستجابة السريعة للتعامل الفوري مع الحالة الطارئة للمسجد."}
              icon={Zap}
              iconColor="text-purple-600"
              progress={{
                current: 1,
                total: 1,
                percentage: 100,
              }}
              actionButton={
                request.quickReports && request.quickReports.length > 0 ? {
                  label: isEn ? "View Quick Response Report" : "عرض تقرير الاستجابة السريعة",
                  onClick: () => setQuickResponseReportOpen(true),
                } : undefined
              }
            />
          </div>
        ) : (
          <>
            {/* Progress Stepper */}
            <ProgressStepper
              steps={workflow.map((s) => ({ ...s, label: translateStage(s.id, request.requestTrack || undefined) }))}
              currentStep={request.currentStage}
              completedSteps={completedSteps}
            />

        {/* Active Action Card */}
        {request.status === 'suspended' && isManagementUser ? (
          <div className="bg-amber-50 dark:bg-amber-950/20 border-2 border-amber-200 dark:border-amber-900/50 p-6 rounded-xl text-center space-y-4 shadow-sm animate-fade-in mx-auto max-w-2xl" dir={isEn ? "ltr" : "rtl"}>
            <div className="inline-flex p-3 bg-amber-100 dark:bg-amber-900/50 rounded-full text-amber-600 dark:text-amber-400 mb-1">
              <PauseCircle className="w-8 h-8 animate-pulse" />
            </div>
            <h4 className="text-lg font-black text-amber-800 dark:text-amber-300">{isEn ? "Request Temporarily Suspended" : "الطلب معلق مؤقتاً"}</h4>
            
            {request.technicalEvalJustification && (
              <div className="text-right max-w-md mx-auto bg-white dark:bg-gray-800 p-4 rounded-lg border border-amber-100 dark:border-amber-900/30 text-sm space-y-1" dir={isEn ? "ltr" : "rtl"}>
                <span className="font-bold text-amber-800 dark:text-amber-400">{isEn ? "Suspension justifications:" : "مبررات التعليق:"}</span>
                <p className="text-gray-600 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">
                  {request.technicalEvalJustification}
                </p>
              </div>
            )}
            
            <div className="flex justify-center pt-2">
              <Button 
                onClick={() => updateStatusMutation.mutate({ requestId, newStatus: 'in_progress' })}
                disabled={updateStatusMutation.isPending}
                className="bg-amber-600 hover:bg-amber-700 text-white font-bold px-8 py-3 rounded-xl shadow-md hover:shadow-lg transition-all flex items-center gap-2 text-base"
              >
                <Play className="w-5 h-5" />
                {isEn ? "Resume Request" : "استئناف المشروع"}
              </Button>
            </div>
          </div>
        ) : request.requestTrack === 'quick_response' && request.currentStage === 'execution' && latestQuickReport && isManagementUser ? (
          <div className="mb-6 space-y-6">
            <ActiveActionCard
              title={isEn ? "Quick Response Report Submitted" : "تم تقديم تقرير الاستجابة السريعة"}
              description={isEn ? "The quick response report has been successfully submitted and approved. You can review the details by clicking the button below." : "تم تقديم واعتماد تقرير الاستجابة السريعة بنجاح. يمكنك استعراض التفاصيل بالضغط على الزر أدناه."}
              icon={Zap}
              iconColor="text-emerald-600"
              progress={{
                current: workflow.findIndex((s) => s.id === request.currentStage) + 1,
                total: workflow.length,
                percentage: progress,
              }}
              actionButton={{
                label: isEn ? "View Quick Response Report" : "عرض تقرير الاستجابة السريعة",
                onClick: () => setQuickResponseReportOpen(true),
              }}
              secondaryButton={{
                label: isEn ? "Close Request" : "إغلاق الطلب",
                onClick: () => updateStageMutation.mutate({ requestId, newStage: 'closed' as any }),
                variant: 'outline' as const,
              }}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4" dir={isEn ? "ltr" : "rtl"}>
              <button
                className="group p-4 rounded-xl border-2 border-green-200 bg-green-50 hover:bg-green-100 hover:border-green-400 transition-all text-right disabled:opacity-50 dark:bg-green-950/20 dark:border-green-900 dark:hover:bg-green-950/40 shadow-sm"
                onClick={() => {
                  setSelectedDecision('convert_to_project');
                  setShowTechnicalEvalDialog(true);
                }}
                disabled={technicalEvalMutation.isPending}
              >
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-lg bg-green-100 dark:bg-green-900 flex items-center justify-center shrink-0">
                    <FolderKanban className="w-6 h-6 text-green-600" />
                  </div>
                  <div className="min-w-0">
                    <h5 className="font-bold text-green-800 dark:text-green-200 text-sm sm:text-base mb-1">{isEn ? "Convert to Project" : "التحويل إلى مشروع"}</h5>
                    <p className="text-[11px] sm:text-sm text-green-600 dark:text-green-400 leading-tight">{isEn ? "Convert request to project and move to BOQ preparation" : "تحويل الطلب إلى مشروع والانتقال لإعداد جدول الكميات"}</p>
                  </div>
                </div>
              </button>

              {/* التعليق */}
              <button 
                className="group p-4 rounded-xl border-2 border-amber-200 bg-amber-50 hover:bg-amber-100 hover:border-amber-400 transition-all text-right disabled:opacity-50 dark:bg-amber-950/20 dark:border-amber-900/50 shadow-sm"
                onClick={() => {
                  setSelectedDecision('suspend');
                  setShowTechnicalEvalDialog(true);
                }}
                disabled={technicalEvalMutation.isPending}
              >
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-lg bg-amber-100 dark:bg-amber-900 flex items-center justify-center shrink-0">
                    <PauseCircle className="w-6 h-6 text-amber-600" />
                  </div>
                  <div className="min-w-0">
                    <h5 className="font-bold text-amber-800 dark:text-amber-200 text-sm sm:text-base mb-1">{isEn ? "Temporary Suspension" : "التعليق المؤقت"}</h5>
                    <p className="text-[11px] sm:text-sm text-amber-600 dark:text-amber-400 leading-tight">{isEn ? "Suspend the request temporarily until additional requirements are available" : "تعليق الطلب مؤقتاً لحين توفر متطلبات إضافية"}</p>
                  </div>
                </div>
              </button>
            </div>

            <Card className="hidden p-4 sm:p-6 md:p-8 shadow-lg border-2 border-purple-100 dark:border-purple-900/50">
              <div className="hidden flex-col sm:flex-row items-center sm:items-start text-center sm:text-right gap-3 sm:gap-4 mb-4 sm:mb-6">
                <div className="p-2 sm:p-3 rounded-lg bg-purple-50 dark:bg-purple-950/20 text-purple-600 shrink-0">
                  <Zap className="w-6 h-6 sm:w-8 sm:h-8" />
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-xl sm:text-2xl font-bold text-foreground break-words font-sans">مراجعة تقرير الاستجابة السريعة</h2>
                  <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 sm:mt-1">
                    المرحلة {workflow.findIndex((s) => s.id === request.currentStage) + 1} من {workflow.length} • {progress}% مكتمل
                  </p>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="hidden mb-4 sm:mb-6">
                <div className="w-full bg-secondary rounded-full h-1.5 sm:h-2 overflow-hidden">
                  <div className="bg-primary h-full rounded-full animate-pulse" style={{ width: `${progress}%` }} />
                </div>
              </div>

              <p className="hidden text-muted-foreground mb-6 text-sm sm:text-base leading-relaxed text-right">
                يرجى مراجعة تقرير الاستجابة السريعة المقدم أدناه واتخاذ الإجراء المناسب. نظراً لأن المشكلة لم تحل بالكامل، يمكنك تحويل الطلب إلى مشروع متكامل أو إغلاقه مؤقتاً.
              </p>

              {/* Inline Report Preview */}
              <div className="hidden mb-6">
                <Button
                  size="lg"
                  onClick={() => setQuickResponseReportOpen(true)}
                  className="w-full text-base sm:text-lg py-5 sm:py-6"
                >
                  عرض تقرير الاستجابة السريعة
                </Button>
              </div>

              <p className="text-muted-foreground mb-6 text-sm sm:text-base leading-relaxed text-right">
                يرجى مراجعة تقرير الاستجابة السريعة واتخاذ الإجراء المناسب. نظراً لأن المشكلة لم تحل بالكامل، يمكنك تحويل الطلب إلى مشروع متكامل أو إغلاقه مؤقتاً.
              </p>

              {/* Action Buttons styled like Stage 4 buttons */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 border-t pt-6 border-slate-100 dark:border-slate-800">
                {/* التحويل إلى مشروع */}
                <button 
                  className="group p-4 rounded-xl border-2 border-green-200 bg-green-50 hover:bg-green-100 hover:border-green-400 transition-all text-right disabled:opacity-50 dark:bg-green-950/20 dark:border-green-900 dark:hover:bg-green-950/40 shadow-sm"
                  onClick={() => {
                    setSelectedDecision('convert_to_project');
                    setShowTechnicalEvalDialog(true);
                  }}
                  disabled={technicalEvalMutation.isPending}
                >
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-lg bg-green-100 dark:bg-green-900 flex items-center justify-center shrink-0">
                      <FolderKanban className="w-6 h-6 text-green-600" />
                    </div>
                    <div className="min-w-0">
                      <h5 className="font-bold text-green-800 dark:text-green-200 text-sm sm:text-base mb-1">التحويل إلى مشروع</h5>
                      <p className="text-[11px] sm:text-sm text-green-600 dark:text-green-400 leading-tight">تحويل الطلب إلى مشروع والانتقال لإعداد جدول الكميات</p>
                    </div>
                  </div>
                </button>

                {/* الإغلاق مؤقتاً */}
                <button 
                  className="group p-4 rounded-xl border-2 border-amber-200 bg-amber-50 hover:bg-amber-100 hover:border-amber-400 transition-all text-right disabled:opacity-50 dark:bg-amber-950/20 dark:border-amber-900 dark:hover:bg-amber-950/40 shadow-sm"
                  onClick={() => {
                    updateStatusMutation.mutate({ requestId, newStatus: 'suspended' });
                  }}
                  disabled={updateStatusMutation.isPending}
                >
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-lg bg-amber-100 dark:bg-amber-900 flex items-center justify-center shrink-0">
                      <PauseCircle className="w-6 h-6 text-amber-600" />
                    </div>
                    <div className="min-w-0">
                      <h5 className="font-bold text-amber-800 dark:text-amber-200 text-sm sm:text-base mb-1">الإغلاق مؤقتاً</h5>
                      <p className="text-[11px] sm:text-sm text-amber-600 dark:text-amber-400 leading-tight">تعليق الطلب مؤقتاً لحين توفر متطلبات إضافية</p>
                    </div>
                  </div>
                </button>
              </div>
            </Card>
          </div>
        ) : (
          <div className="space-y-6">
            {/* عرض كرت التعليق الأصفر فقط لحساب الـ Admin والمسؤولين الآخرين */}
            {request.currentStage === 'technical_eval' && request.status === 'suspended' && isManagementUser ? (
              <div className="bg-amber-50 dark:bg-amber-950/20 border-2 border-amber-200 dark:border-amber-900/50 p-6 rounded-xl text-center space-y-4 shadow-sm animate-fade-in mx-auto max-w-2xl" dir="rtl">
                <div className="inline-flex p-3 bg-amber-100 dark:bg-amber-900/50 rounded-full text-amber-600 dark:text-amber-400 mb-1">
                  <PauseCircle className="w-8 h-8 animate-pulse" />
                </div>
                <h4 className="text-lg font-black text-amber-800 dark:text-amber-300">الطلب معلق مؤقتاً</h4>
                
                {request.technicalEvalJustification && (
                  <div className="text-right max-w-md mx-auto bg-white dark:bg-gray-800 p-4 rounded-lg border border-amber-100 dark:border-amber-900/30 text-sm space-y-1">
                    <span className="font-bold text-amber-800 dark:text-amber-400">مبررات التعليق:</span>
                    <p className="text-gray-600 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">
                      {request.technicalEvalJustification}
                    </p>
                  </div>
                )}
                
                <div className="flex justify-center pt-2">
                  <Button 
                    onClick={() => updateStatusMutation.mutate({ requestId, newStatus: 'in_progress' })}
                    disabled={updateStatusMutation.isPending}
                    className="bg-amber-600 hover:bg-amber-700 text-white font-bold px-8 py-3 rounded-xl shadow-md hover:shadow-lg transition-all flex items-center gap-2 text-base"
                  >
                    <Play className="w-5 h-5" />
                    استئناف المشروع
                  </Button>
                </div>
              </div>
            ) : activeAction && (
              <div className="space-y-6">
                {(() => {
                  const translatedAction = translateActiveAction(activeAction);
                  return (
                    <ActiveActionCard
                      title={translatedAction.title}
                      description={translatedAction.description}
                      icon={translatedAction.icon as any}
                      iconColor={translatedAction.iconColor}
                      progress={{
                        current: workflow.findIndex((s) => s.id === request.currentStage) + 1,
                        total: workflow.length,
                        percentage: progress,
                      }}
                      fieldReportButton={
                        !isFieldTeam && !isQuickResponseUser && hasFieldReport &&
                        !['boq_preparation', 'financial_eval_and_approval', 'contracting', 'execution', 'handover', 'closed'].includes(request.currentStage) &&
                        !(isQuickResponse && (
                          (user?.role as string) !== 'quick_response' ||
                          (request.quickReports && request.quickReports.length > 0)
                        ))
                          ? {
                              label: isEn ? 'View Field Visit Report' : 'عرض تقرير الزيارة الميدانية',
                              onClick: () => setFieldVisitReportOpen(true),
                            }
                          : undefined
                      }
                      actionButton={
                        translatedAction.canPerformAction &&
                        translatedAction.actionButton &&
                        !(showQuickResponseReportShortcut && translatedAction.actionButton.openModal === 'quick_response_report') &&
                        (
                          request.currentStage !== 'technical_eval' ||
                          translatedAction.actionButton.openModal === 'field_visit_report' ||
                          translatedAction.actionButton.openModal === 'quick_response_report'
                        )
                          ? {
                              label: translatedAction.actionButton.label,
                              onClick: (translatedAction.actionButton as any).onClick || handleStageTransition,
                              disabled: !translatedAction.canPerformAction || updateStageMutation.isPending,
                            }
                          : undefined
                      }
                      secondaryButton={
                        request.currentStage === 'boq_preparation' && translatedAction.canPerformAction && !isFieldTeam && !isQuickResponseUser
                          ? {
                              label: "الانتقال إلى التقييم المالي",
                              onClick: () => {
                                if (!hasBoqItems) {
                                  toast.error("لا يمكن الانتقال إلى التقييم المالي قبل تعبئة جدول الكميات");
                                  return;
                                }
                                updateStageMutation.mutate({ requestId, newStage: 'financial_eval_and_approval' as any });
                              },
                              variant: 'default' as const,
                              disabled: !hasBoqItems || updateStageMutation.isPending,
                            }
                        : request.currentStage === 'financial_eval_and_approval' && translatedAction.canPerformAction && !isFieldTeam && !isQuickResponseUser
                          ? {
                              label: "إدارة عروض الأسعار",
                              onClick: () => setLocation('/quotations'),
                              variant: 'outline' as const,
                            }
                          : request.currentStage === 'contracting' && hasApprovedContract && (canTransitionStage(user?.role || '', 'contracting') || userPermissions.includes("requests.view_details")) && !isQuickResponseUser
                          ? {
                              label: "الانتقال إلى مرحلة التنفيذ",
                              onClick: () => updateStageMutation.mutate({ requestId, newStage: 'execution' as any }),
                              variant: 'default' as const,
                            }
                          : request.currentStage === 'execution' && (canTransitionStage(user?.role || '', 'execution') || userPermissions.includes("requests.view_details")) && !isQuickResponseUser
                            ? request.requestTrack === 'quick_response'
                              ? (request.quickReports && request.quickReports.length > 0 && user?.role !== 'quick_response')
                                ? {
                                    label: isEn ? "Close Request" : "إغلاق الطلب",
                                    onClick: () => updateStageMutation.mutate({ requestId, newStage: 'closed' as any }),
                                    variant: 'default' as const,
                                  }
                                : undefined
                              : {
                                  label: "الانتقال إلى مرحلة الاستلام",
                                  onClick: () => updateStageMutation.mutate({ requestId, newStage: 'handover' as any }),
                                  variant: 'default' as const,
                                  disabled: cannotTransitionToHandover,
                                  title: cannotTransitionToHandover
                                    ? !hasPayments
                                      ? "لا يمكن الانتقال لمرحلة الاستلام: لا توجد دفعات مسجلة للمشروع"
                                      : !allPaymentsPaid
                                        ? "لا يمكن الانتقال لمرحلة الاستلام: يجب سداد جميع الدفعات أولاً"
                                        : "لا يمكن الانتقال لمرحلة الاستلام: إجمالي قيم المدفوعات لا يساوي إجمالي قيمة العقد"
                                    : undefined,
                                }
                          : request.currentStage === 'handover' &&
                            latestFinalReport &&
                            user?.role !== 'corporate_comm' &&
                            (canTransitionStage(user?.role || '', 'handover') || userPermissions.includes("requests.view_details")) &&
                            !isQuickResponseUser
                          ? {
                              label: "الانتقال إلى مرحلة الإغلاق",
                              onClick: () => updateStageMutation.mutate({ requestId, newStage: 'closed' as any }),
                              variant: 'default' as const,
                            }
                          : undefined
                      }
                      additionalActions={[]}
                    />
                  );
                })()}
              
              {/* قسم المراجعة الأولية */}
              {request.currentStage === 'initial_review' && (
                <div className="bg-blue-50 dark:bg-blue-950/20 p-4 sm:p-6 rounded-xl border-2 border-blue-200 dark:border-blue-800">
                  <div className="flex items-center gap-3 mb-4">
                    <FileText className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
                    <h4 className="font-bold text-blue-800 dark:text-blue-200 text-base sm:text-lg">المراجعة الأولية</h4>
                  </div>
                  <p className="text-xs sm:text-sm text-blue-600 dark:text-blue-400 mb-4">يجب إتمام المراجعة الأولية قبل الانتقال للزيارة الميدانية</p>
                  <div className="flex items-center gap-3 p-3 sm:p-4 bg-white dark:bg-gray-800 rounded-lg border shadow-sm">
                    <input
                      type="checkbox"
                      id="review-completed"
                      checked={request.reviewCompleted || false}
                      onChange={(e) => {
                        updateReviewCompletedMutation.mutate({
                          requestId,
                          reviewCompleted: e.target.checked
                        });
                      }}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <label htmlFor="review-completed" className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-350">
                      تمت المراجعة الأولية للطلب بنجاح
                    </label>
                  </div>
                </div>
              )}

              {/* خيارات التقييم الفني */}
              {request.currentStage === 'technical_eval' && activeAction.canPerformAction && !isFieldTeam && !isQuickResponseUser && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  {/* الاستجابة السريعة */}
                  <button 
                    className="group p-4 rounded-xl border-2 border-purple-200 bg-purple-50 hover:bg-purple-100 hover:border-purple-400 transition-all text-right disabled:opacity-50 dark:bg-purple-950/20 dark:border-purple-900 dark:hover:bg-purple-950/40 shadow-sm"
                    onClick={() => {
                      setSelectedDecision('quick_response');
                      setShowTechnicalEvalDialog(true);
                    }}
                    disabled={technicalEvalMutation.isPending}
                  >
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-900 flex items-center justify-center shrink-0">
                        <Zap className="w-6 h-6 text-purple-600" />
                      </div>
                      <div className="min-w-0">
                        <h5 className="font-bold text-purple-800 dark:text-purple-200 text-sm sm:text-base mb-1">الاستجابة السريعة</h5>
                        <p className="text-[11px] sm:text-sm text-purple-600 dark:text-purple-400 leading-tight">تحويل للحالات البسيطة التي تحتاج تدخل فوري مباشر</p>
                      </div>
                    </div>
                  </button>

                  {/* التحويل إلى مشروع */}
                  <button 
                    className="group p-4 rounded-xl border-2 border-green-200 bg-green-50 hover:bg-green-100 hover:border-green-400 transition-all text-right disabled:opacity-50 dark:bg-green-950/20 dark:border-green-900 dark:hover:bg-green-950/40 shadow-sm"
                    onClick={() => {
                      setSelectedDecision('convert_to_project');
                      setShowTechnicalEvalDialog(true);
                    }}
                    disabled={technicalEvalMutation.isPending}
                  >
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-lg bg-green-100 dark:bg-green-900 flex items-center justify-center shrink-0">
                        <CheckCircle className="w-6 h-6 text-green-600" />
                      </div>
                      <div className="min-w-0">
                        <h5 className="font-bold text-green-800 dark:text-green-200 text-sm sm:text-base mb-1">التحويل إلى مشروع</h5>
                        <p className="text-[11px] sm:text-sm text-green-600 dark:text-green-400 leading-tight">إكمال الطلب والموافقة عليه وتحويله لمشروع رسمي</p>
                      </div>
                    </div>
                  </button>

                  {/* تحويل إلى فرصة تبرع */}
                  <button 
                    className="group p-4 rounded-xl border-2 border-pink-200 bg-pink-50 hover:bg-pink-100 hover:border-pink-400 transition-all text-right disabled:opacity-50 dark:bg-pink-950/20 dark:border-pink-900/50 shadow-sm"
                    onClick={() => {
                      setSelectedDecision('convert_to_donation');
                      setShowTechnicalEvalDialog(true);
                    }}
                    disabled={technicalEvalMutation.isPending}
                  >
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-lg bg-pink-100 dark:bg-pink-900 flex items-center justify-center shrink-0">
                        <HeartHandshake className="w-6 h-6 text-pink-600" />
                      </div>
                      <div className="min-w-0">
                        <h5 className="font-bold text-pink-800 dark:text-pink-200 text-sm sm:text-base mb-1">التحويل إلى فرصة تبرع</h5>
                        <p className="text-[11px] sm:text-sm text-pink-600 dark:text-pink-400 leading-tight">تحويل الطلب لفرصة تبرع عامة لجمع المبالغ المطلوبة</p>
                      </div>
                    </div>
                  </button>

                  {/* التعليق المؤقت */}
                  <button 
                    className="group p-4 rounded-xl border-2 border-amber-200 bg-amber-50 hover:bg-amber-100 hover:border-amber-400 transition-all text-right disabled:opacity-50 dark:bg-amber-950/20 dark:border-amber-900 dark:hover:bg-amber-950/40 shadow-sm"
                    onClick={() => {
                      setSelectedDecision('suspend');
                      setShowTechnicalEvalDialog(true);
                    }}
                    disabled={technicalEvalMutation.isPending}
                  >
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-lg bg-amber-100 dark:bg-amber-900 flex items-center justify-center shrink-0">
                        <PauseCircle className="w-6 h-6 text-amber-600" />
                      </div>
                      <div className="min-w-0">
                        <h5 className="font-bold text-amber-800 dark:text-amber-200 text-sm sm:text-base mb-1">التعليق المؤقت</h5>
                        <p className="text-[11px] sm:text-sm text-amber-600 dark:text-amber-400 leading-tight">تعليق الطلب مؤقتاً لحين توفر متملبات إضافية</p>
                      </div>
                    </div>
                  </button>

                  {/* الاعتذار */}
                  <button 
                    className="group p-4 rounded-xl border-2 border-red-200 bg-red-50 hover:bg-red-100 hover:border-red-400 transition-all text-right disabled:opacity-50 dark:bg-red-950/20 dark:border-red-900 dark:hover:bg-red-950/40 shadow-sm"
                    onClick={() => {
                      setSelectedDecision('apologize');
                      setShowTechnicalEvalDialog(true);
                    }}
                    disabled={technicalEvalMutation.isPending}
                  >
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-lg bg-red-100 dark:bg-red-900 flex items-center justify-center shrink-0">
                        <XCircle className="w-6 h-6 text-red-600" />
                      </div>
                      <div className="min-w-0">
                        <h5 className="font-bold text-red-800 dark:text-red-200 text-sm sm:text-base mb-1">الاعتذار (الرفض)</h5>
                        <p className="text-[11px] sm:text-sm text-red-600 dark:text-red-400 leading-tight">رفض الطلب نهائياً مع توضيح أسباب الاعتذار</p>
                      </div>
                    </div>
                  </button>
                </div>
              )}
            </div>
          )}
      </div>
    )
  }
        {/* زر مراجعة المعلومات والمرفقات الجديد - يظهر للجميع */}
        <div className="mt-6">
          <Button 
            variant="outline" 
            className="w-full flex items-center justify-between p-4 sm:p-6 h-auto border-2 border-slate-200 hover:bg-slate-50 transition-all dark:border-slate-800 dark:hover:bg-slate-900 shadow-sm rounded-xl"
            onClick={() => setShowReviewInfo(!showReviewInfo)}
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
                <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="text-right min-w-0">
                <p className="font-bold text-sm sm:text-lg truncate">{isEn ? "Review Information & Attachments" : "مراجعة المعلومات والمرفقات"}</p>
                <p className="text-[10px] sm:text-sm text-muted-foreground truncate">{isEn ? "View request details and uploaded files" : "عرض تفاصيل الطلب والملفات المرفوعة"}</p>
              </div>
            </div>
            {showReviewInfo ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
          </Button>

          {showReviewInfo && (
            <div className="mt-4 space-y-6 animate-in fade-in slide-in-from-top-4 duration-300">
              {/* تفاصيل الطلب */}
              <div className="bg-slate-50 dark:bg-slate-900/50 p-4 sm:p-6 rounded-xl border-2 border-slate-200 dark:border-slate-800 shadow-sm">
                <h4 className="font-bold text-base sm:text-lg mb-4 flex items-center gap-2 text-slate-800 dark:text-slate-200 border-b pb-3 border-slate-200 dark:border-slate-800">
                  <FileText className="w-5 h-5 text-blue-600" />
                  {isEn ? "Basic Request Details" : "تفاصيل الطلب الأساسية"}
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {/* معلومات أساسية ثابته */}
                  <div className="space-y-1 bg-white dark:bg-slate-800/50 p-3 rounded-lg border shadow-xs">
                    <p className="text-[10px] sm:text-xs text-muted-foreground font-medium">{isEn ? "Program" : "البرنامج"}</p>
                    <p className="text-sm sm:text-base font-bold text-slate-800 dark:text-slate-200">{translateProgram(request.programType)}</p>
                  </div>
                  <div className="space-y-1 bg-white dark:bg-slate-800/50 p-3 rounded-lg border shadow-xs">
                    <p className="text-[10px] sm:text-xs text-muted-foreground font-medium">{isEn ? "Submission Date" : "تاريخ التقديم"}</p>
                    <p className="text-sm sm:text-base font-bold text-slate-800 dark:text-slate-200">{new Date(request.createdAt).toLocaleDateString(isEn ? "en-US" : "ar-SA")}</p>
                  </div>
                  {request.requestTrack === 'quick_response' && (
                    <>
                      {request.assignedToUser && (
                        <div className="space-y-1 bg-white dark:bg-slate-800/50 p-3 rounded-lg border shadow-xs">
                          <p className="text-[10px] sm:text-xs text-muted-foreground font-medium">{isEn ? "Quick Response Assigned To" : "المسؤول عن الاستجابة السريعة"}</p>
                          <p className="text-sm sm:text-base font-bold text-slate-800 dark:text-slate-200">{(request.assignedToUser as any).name}</p>
                        </div>
                      )}
                      {(request as any).quickResponseStartDate && (
                        <div className="space-y-1 bg-white dark:bg-slate-800/50 p-3 rounded-lg border shadow-xs">
                          <p className="text-[10px] sm:text-xs text-muted-foreground font-medium">{isEn ? "Quick Response Start Date" : "تاريخ بدء الاستجابة السريعة"}</p>
                          <p className="text-sm sm:text-base font-bold text-slate-800 dark:text-slate-200">
                            {new Date((request as any).quickResponseStartDate).toLocaleDateString(isEn ? "en-US" : "ar-SA")}
                          </p>
                        </div>
                      )}
                      {(request as any).quickResponseEndDate && (
                        <div className="space-y-1 bg-white dark:bg-slate-800/50 p-3 rounded-lg border shadow-xs">
                          <p className="text-[10px] sm:text-xs text-muted-foreground font-medium">{isEn ? "Expected Completion Date" : "تاريخ الانتهاء المتوقع"}</p>
                          <p className="text-sm sm:text-base font-bold text-slate-800 dark:text-slate-200">
                            {new Date((request as any).quickResponseEndDate).toLocaleDateString(isEn ? "en-US" : "ar-SA")}
                          </p>
                        </div>
                      )}
                    </>
                  )}
                  {request.mosque && (
                    <>
                      <div className="space-y-1 bg-white dark:bg-slate-800/50 p-3 rounded-lg border shadow-xs">
                        <p className="text-[10px] sm:text-xs text-muted-foreground font-medium">{isEn ? "Mosque" : "المسجد"}</p>
                        <p className="text-sm sm:text-base font-bold text-slate-800 dark:text-slate-200 truncate">{request.mosque.name}</p>
                      </div>
                      <div className="space-y-1 bg-white dark:bg-slate-800/50 p-3 rounded-lg border shadow-xs">
                        <p className="text-[10px] sm:text-xs text-muted-foreground font-medium">{isEn ? "Location" : "الموقع"}</p>
                        <p className="text-sm sm:text-base font-bold text-slate-800 dark:text-slate-200">{request.mosque.city || (isEn ? "Not specified" : "غير محدد")}</p>
                      </div>
                    </>
                  )}

                  {/* معلومات الحقول الديناميكية */}
                  {(() => {
                    const allFields = getAllFieldsForProgram(request.programType);
                    let programData: Record<string, any> = {};
                    
                    try {
                      if (typeof request.programData === 'string') {
                        programData = JSON.parse(request.programData);
                      } else {
                        programData = (request.programData as Record<string, any>) || {};
                      }
                    } catch (e) {
                      console.error("Error parsing programData:", e);
                      programData = {};
                    }
                    
                    return allFields
                      .filter(field => field.name !== 'mosqueId' && programData[field.name] !== undefined)
                      .map(field => {
                        let displayLabel = field.label;
                        if (isEn) {
                          const enFieldLabels: Record<string, string> = {
                            "حالة البناء": "Building Status",
                            "سعة المصلين": "Worshipers Capacity",
                            "نوع المبنى": "Building Type",
                            "ملاحظات وتفاصيل إضافية": "Additional Notes & Details",
                            "المنطقة": "Region",
                            "المدينة/القرية": "City/Village",
                            "هل توجد إحداثيات": "Are coordinates available?",
                            "الحاجة": "Need / Urgency",
                            "نوع التوريد": "Supply Type",
                            "الكمية المطلوبة": "Required Quantity",
                            "التفاصيل": "Details",
                            "الوصف": "Description",
                            "المستفيد": "Beneficiary",
                            "ملاحظات": "Notes",
                            "وصف الأعمال المطلوبة": "Description of required works",
                            "مساحة المسجد بالمتر المربع": "Mosque area in square meters",
                            "عدد المصلين الفعلي": "Actual number of worshipers",
                            "هل لديكم استعداد لتأسيس فريق تطوعي بقيادتكم لتسويق الفرصة؟": "Are you willing to establish a volunteer team under your leadership to market the opportunity?",
                          };
                          displayLabel = enFieldLabels[field.label] || field.label;
                        }

                        let displayValue = programData[field.name];
                        
                        // معالجة القيم الخاصة (مثل نعم/لا)
                        if (field.type === 'radio' || field.type === 'select') {
                          const option = field.options?.find(opt => opt.value === displayValue);
                          if (option) {
                            displayValue = option.label;
                            if (isEn) {
                              const enOptions: Record<string, string> = {
                                "نعم": "Yes",
                                "لا": "No",
                                "ممتاز": "Excellent",
                                "جيد جداً": "Very Good",
                                "جيد": "Good",
                                "مقبول": "Fair",
                                "ضعيف": "Poor",
                                "خرساني": "Concrete",
                                "مسبق الصنع": "Prefabricated",
                                "شعبي": "Traditional",
                                "أخرى": "Other",
                              };
                              displayValue = enOptions[option.label] || option.label;
                            }
                          } else if (displayValue === 'yes') {
                            displayValue = isEn ? 'Yes' : 'نعم';
                          } else if (displayValue === 'no') {
                            displayValue = isEn ? 'No' : 'لا';
                          }
                        }

                        return (
                          <div key={field.name} className="space-y-1 col-span-full bg-white dark:bg-slate-800/50 p-3 rounded-lg border shadow-xs" dir={isEn ? "ltr" : "rtl"}>
                            <p className="text-[10px] sm:text-xs text-muted-foreground font-medium">{displayLabel}</p>
                            <p className="text-sm sm:text-base font-bold text-slate-800 dark:text-slate-200 whitespace-pre-wrap break-words leading-relaxed">{String(displayValue)}</p>
                          </div>
                        );
                      });
                  })()}
                </div>
              </div>

              {/* المرفقات */}
              <div className="bg-slate-50 dark:bg-slate-900/50 p-4 sm:p-6 rounded-xl border-2 border-slate-200 dark:border-slate-800 shadow-sm" dir={isEn ? "ltr" : "rtl"}>
                <h4 className="font-bold text-base sm:text-lg mb-4 flex items-center gap-2 text-slate-800 dark:text-slate-200 border-b pb-3 border-slate-200 dark:border-slate-800">
                  <Paperclip className="w-5 h-5 text-orange-600" />
                  {isEn ? "Attachments Uploaded with Request" : "المرفقات المرفوعة مع الطلب"}
                </h4>
                {request?.attachments && request.attachments.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                    {request.attachments.map((attachment: any, index: number) => {
                      const ext = attachment.fileName.split('.').pop()?.toLowerCase();
                      const isImg = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'].includes(ext || '') ||
                        attachment.fileType?.toLowerCase() === 'image' ||
                        attachment.fileType?.toLowerCase().startsWith('image/') ||
                        ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'].includes(attachment.fileType?.toLowerCase() || '');
                      
                      return (
                        <div key={index} className="bg-white dark:bg-gray-800 p-3 rounded-xl shadow-xs border border-slate-200 dark:border-slate-700 hover:border-orange-300 transition-all flex flex-col justify-between gap-3 group relative overflow-hidden">
                          {isImg ? (
                            <div className="relative aspect-video w-full rounded-lg overflow-hidden border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex items-center justify-center group/img">
                              <img 
                                src={attachment.fileUrl} 
                                alt={attachment.fileName} 
                                className="w-full h-full object-cover cursor-pointer hover:scale-105 transition-transform duration-300"
                                onClick={() => setPreviewImage({ url: attachment.fileUrl, name: attachment.fileName })}
                              />
                              <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center gap-2 z-10">
                                <Button 
                                  type="button" 
                                  variant="secondary" 
                                  size="icon" 
                                  className="w-9 h-9 rounded-full bg-white dark:bg-slate-900 shadow-md hover:bg-orange-500 hover:text-white transition-colors"
                                  onClick={() => setPreviewImage({ url: attachment.fileUrl, name: attachment.fileName })}
                                  title={isEn ? "View image full screen" : "عرض الصورة ملء الشاشة"}
                                >
                                  <Eye className="w-4 h-4" />
                                </Button>
                                <Button 
                                  type="button" 
                                  variant="secondary" 
                                  size="icon" 
                                  className="w-9 h-9 rounded-full bg-white dark:bg-slate-900 shadow-md hover:bg-orange-500 hover:text-white transition-colors"
                                  asChild
                                  title={isEn ? "Download image" : "تنزيل الصورة"}
                                >
                                  <a href={attachment.fileUrl} target="_blank" rel="noopener noreferrer" download={attachment.fileName}>
                                    <Download className="w-4 h-4" />
                                  </a>
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <div className="aspect-video w-full rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 flex flex-col items-center justify-center text-slate-400 dark:text-slate-600 gap-2">
                              <FileText className="w-10 h-10 text-slate-300 dark:text-slate-700" />
                              <span className="text-[10px] bg-slate-200/50 dark:bg-slate-800 px-2 py-0.5 rounded-full text-slate-600 dark:text-slate-400 font-medium">
                                {isEn ? "Document" : "مستند"}
                              </span>
                            </div>
                          )}
                          <div className="min-w-0 flex-1 flex flex-col justify-end">
                            <p className="font-bold text-xs sm:text-sm text-slate-800 dark:text-slate-200 truncate" title={attachment.fileName}>
                              {attachment.fileName}
                            </p>
                            <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100 dark:border-slate-800/80">
                              <span className="text-[10px] text-muted-foreground font-medium bg-slate-50 dark:bg-slate-900/50 px-2 py-0.5 rounded-full inline-block">
                                {isEn ? (attachment.fileType || 'File') : (attachment.fileType || 'ملف')}
                              </span>
                              <div className="flex items-center gap-1.5">
                                {isImg && (
                                  <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    className="h-8 px-2 text-slate-500 hover:text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-950/20 font-bold text-[11px] rounded-lg gap-1"
                                    onClick={() => setPreviewImage({ url: attachment.fileUrl, name: attachment.fileName })}
                                  >
                                    <Eye className="w-3.5 h-3.5" />
                                    {isEn ? "View" : "عرض"}
                                  </Button>
                                )}
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  asChild 
                                  className="h-8 px-2 text-slate-500 hover:text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-950/20 font-bold text-[11px] rounded-lg gap-1"
                                >
                                  <a href={attachment.fileUrl} target="_blank" rel="noopener noreferrer" download={attachment.fileName}>
                                    <Download className="w-3.5 h-3.5" />
                                    {isEn ? "Download" : "تنزيل"}
                                  </a>
                                </Button>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-10 bg-white dark:bg-slate-800/50 rounded-lg border-2 border-dashed">
                    <Paperclip className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                    <p className="text-muted-foreground font-medium text-xs sm:text-sm">
                      {isEn ? "No files have been attached to this request" : "لم يتم إرفاق أي ملفات بهذا الطلب"}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
        </>)}
      </div>

      {/* Quick Response Report Dialog */}
      {request.quickReports && request.quickReports.length > 0 && (
        <ColoredDialog
          open={quickResponseReportOpen}
          onOpenChange={setQuickResponseReportOpen}
          title={isEn ? "Approved Quick Response Report" : "تقرير الاستجابة السريعة المعتمد"}
          color="purple"
          icon={<Zap className="w-6 h-6" />}
        >
          <div className="space-y-6">
            {request.quickReports.map((report: any) => {
              const evaluationLabels: Record<string, string> = {
                excellent: isEn ? "Excellent" : "ممتاز",
                good: isEn ? "Good" : "جيد",
                acceptable: isEn ? "Acceptable" : "مقبول",
                needs_improvement: isEn ? "Needs Improvement" : "يحتاج تحسين",
                poor: isEn ? "Poor" : "ضعيف"
              };
              const evaluationColors: Record<string, string> = {
                excellent: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-900",
                good: "bg-green-50 text-green-700 border-green-200 dark:bg-green-950/30 dark:text-green-400 dark:border-green-900",
                acceptable: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-900",
                needs_improvement: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-900",
                poor: "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-400 dark:border-red-900"
              };

              return (
                <div key={report.id} className={`space-y-6 bg-white dark:bg-slate-900/50 p-6 rounded-xl border border-purple-100 dark:border-purple-900/50 ${isEn ? "text-left" : "text-right"}`} style={{ direction: isEn ? "ltr" : "rtl" }}>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-4 border-slate-100 dark:border-slate-800">
                    <div>
                      <h4 className="font-bold text-purple-950 dark:text-purple-100 text-base sm:text-lg">
                        {isEn ? "Technical Report Details" : "تفاصيل التقرير الفني"}
                      </h4>
                      <p className="text-xs text-slate-500">
                        {isEn ? `Report submitted on: ${new Date(report.responseDate).toLocaleDateString('en-US')}` : `تم تقديم التقرير في: ${new Date(report.responseDate).toLocaleDateString('ar-SA')}`}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {report.finalEvaluation && (
                        <div className={`px-3 py-1 rounded-full border text-xs font-bold ${evaluationColors[report.finalEvaluation] || ''}`}>
                          {isEn ? "Evaluation: " : "التقييم: "}{evaluationLabels[report.finalEvaluation] || report.finalEvaluation}
                        </div>
                      )}
                      <div className={`px-3 py-1 rounded-full border text-xs font-bold ${report.resolved ? 'bg-green-50 text-green-700 border-green-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
                        {report.resolved 
                          ? (isEn ? 'Problem completely resolved' : 'تم حل المشكلة بالكامل') 
                          : (isEn ? 'Under follow-up' : 'قيد المتابعة')}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="p-4 rounded-xl border border-slate-100 dark:border-slate-800/80 bg-slate-50/30 dark:bg-slate-900/10">
                      <span className="text-xs font-bold text-slate-400 dark:text-slate-500 block mb-1">
                        {isEn ? "Assigned Technician" : "الفني المختص"}
                      </span>
                      <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                        {report.technicianName || (isEn ? "Not specified" : "غير محدد")}
                      </p>
                    </div>
                    
                    <div className="p-4 rounded-xl border border-slate-100 dark:border-slate-800/80 bg-slate-50/30 dark:bg-slate-900/10">
                      <span className="text-xs font-bold text-slate-400 dark:text-slate-500 block mb-1">
                        {isEn ? "Integrated Project Status" : "حالة المشروع المتكامل"}
                      </span>
                      <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                        {report.requiresProject 
                          ? (isEn ? "Yes, requires integrated project" : "نعم، يحتاج إلى مشروع متكامل") 
                          : (isEn ? "Does not require integrated project" : "لا يحتاج إلى مشروع متكامل")}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {report.technicalEvaluation && (
                      <div className="bg-slate-50/30 dark:bg-slate-900/10 p-4 rounded-xl border border-slate-100 dark:border-slate-800/50">
                        <span className="text-xs font-bold text-slate-400 dark:text-slate-500 block mb-2">
                          {isEn ? "Technical Evaluation of Completed Works" : "التقييم الفني للأعمال المنفذة"}
                        </span>
                        <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">
                          {report.technicalEvaluation}
                        </p>
                      </div>
                    )}

                    {report.unexecutedWorks && (
                      <div className="bg-red-50/30 dark:bg-red-950/10 p-4 rounded-xl border border-red-100 dark:border-red-900/50">
                        <span className="text-xs font-bold text-red-500 block mb-2">
                          {isEn ? "Unexecuted Works / Reasons for Non-Execution" : "الأعمال غير المنفذة / أسباب عدم التنفيذ"}
                        </span>
                        <p className="text-sm text-red-700 dark:text-red-300 whitespace-pre-wrap leading-relaxed">
                          {report.unexecutedWorks}
                        </p>
                      </div>
                    )}

                    {(() => {
                      const reportPhotos = request?.attachments?.filter((att: any) => {
                        const ext = att.fileName.split('.').pop()?.toLowerCase();
                        const isImg = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'].includes(ext || '') ||
                          att.fileType?.toLowerCase() === 'image' ||
                          att.fileType?.toLowerCase().startsWith('image/') ||
                          ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'].includes(att.fileType?.toLowerCase() || '');
                        
                        return isImg && att.fileUrl.includes('site_photo') && att.uploadedBy === report.respondedBy;
                      }).slice(0, 10) || [];

                      if (reportPhotos.length === 0) return null;

                      return (
                        <div className="space-y-3 pt-4 border-t border-slate-100 dark:border-slate-800/80">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-purple-50 dark:bg-purple-950/40 flex items-center justify-center border border-purple-100 dark:border-purple-900/50">
                              <Camera className="w-4.5 h-4.5 text-purple-600 dark:text-purple-400" />
                            </div>
                            <span className="font-bold text-slate-800 dark:text-slate-200 text-sm sm:text-base">
                              {isEn ? "Attachments" : "المرفقات"}
                            </span>
                            <span className="text-xs text-slate-400 dark:text-slate-500 font-normal">
                              ({reportPhotos.length} {isEn ? (reportPhotos.length === 1 ? "photo" : "photos") : (reportPhotos.length === 1 ? "صورة" : "صور")})
                            </span>
                          </div>

                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                            {reportPhotos.map((photo: any, index: number) => (
                              <div 
                                key={photo.id || index} 
                                className="group relative aspect-video rounded-xl overflow-hidden border border-slate-200/60 dark:border-slate-800 bg-slate-100 dark:bg-slate-950/40 shadow-xs hover:shadow-md hover:border-purple-300 dark:hover:border-purple-900/80 transition-all duration-300"
                              >
                                <img 
                                  src={photo.fileUrl} 
                                  alt={photo.fileName} 
                                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                                />
                                {/* Elegant dark overlay on hover */}
                                <div className="absolute inset-0 bg-slate-950/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center gap-2.5 backdrop-blur-xs">
                                  <Button 
                                    type="button" 
                                    variant="secondary" 
                                    size="icon" 
                                    className="w-9 h-9 rounded-full bg-white/95 dark:bg-slate-900/95 shadow-lg text-slate-700 dark:text-slate-200 hover:bg-purple-600 hover:text-white dark:hover:bg-purple-600 dark:hover:text-white transition-all transform scale-90 group-hover:scale-100 duration-300"
                                    onClick={() => setPreviewImage({ url: photo.fileUrl, name: photo.fileName })}
                                    title={isEn ? "View image" : "عرض الصورة"}
                                  >
                                    <Eye className="w-4 h-4" />
                                  </Button>
                                  <Button 
                                    type="button" 
                                    variant="secondary" 
                                    size="icon" 
                                    className="w-9 h-9 rounded-full bg-white/95 dark:bg-slate-900/95 shadow-lg text-slate-700 dark:text-slate-200 hover:bg-purple-600 hover:text-white dark:hover:bg-purple-600 dark:hover:text-white transition-all transform scale-90 group-hover:scale-100 duration-300 delay-75"
                                    asChild
                                    title={isEn ? "Download image" : "تنزيل الصورة"}
                                  >
                                    <a href={photo.fileUrl} target="_blank" rel="noopener noreferrer" download={photo.fileName}>
                                      <Download className="w-4 h-4" />
                                    </a>
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                </div>
              );
            })}
          </div>
        </ColoredDialog>
      )}

      {/* Field Visit Report Dialog */}
      {request?.fieldReports && request.fieldReports.length > 0 && (
        <ColoredDialog
          open={fieldVisitReportOpen}
          onOpenChange={setFieldVisitReportOpen}
          title="تقرير المعاينة الميدانية الرسمي"
          color="indigo"
          icon={<FileText className="w-6 h-6" />}
        >
          <div className="space-y-6 px-1">
            {request.fieldReports.map((report: any) => {
              const conditionLabels: Record<string, string> = {
                excellent: "ممتاز",
                good: "جيد",
                fair: "مقبول",
                poor: "سيء",
                critical: "حرج / إنشائي"
              };
              const conditionColors: Record<string, string> = {
                excellent: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-900",
                good: "bg-green-50 text-green-700 border-green-200 dark:bg-green-950/30 dark:text-green-400 dark:border-green-900",
                fair: "bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-950/30 dark:text-yellow-400 dark:border-yellow-900",
                poor: "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/30 dark:text-orange-400 dark:border-orange-900",
                critical: "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-400 dark:border-red-900"
              };

              const menLength = parseFloat(report.menPrayerLength || "0");
              const menWidth = parseFloat(report.menPrayerWidth || "0");
              const menArea = menLength * menWidth;

              const womenLength = parseFloat(report.womenPrayerLength || "0");
              const womenWidth = parseFloat(report.womenPrayerWidth || "0");
              const womenArea = womenLength * womenWidth;

              const teamMembers = [
                report.teamMember1,
                report.teamMember2,
                report.teamMember3,
                report.teamMember4,
                report.teamMember5
              ].filter(Boolean);

              const rating = report.beneficiaryInfoAccuracyRating;
              const ratingNotes = report.beneficiaryInfoAccuracyNotes;

              const ratingLabels: Record<number, string> = {
                1: "غير صحيحة تماماً (البيانات مخالفة للواقع كلياً)",
                2: "غير صحيحة غالباً (هناك اختلافات جوهرية كثيرة)",
                3: "مقبولة / صحيحة جزئياً (تتطابق في بعض الجوانب دون أخرى)",
                4: "صحيحة ودقيقة غالباً (تطابق شبه كامل مع اختلافات طفيفة)",
                5: "صحيحة ودقيقة بالكامل (مطابقة تامة وموثوقة 100%)"
              };

              return (
                <div key={report.id} className="space-y-6 bg-white dark:bg-slate-900/50 p-6 rounded-xl border border-indigo-100 dark:border-indigo-900/50 text-right" style={{ direction: "rtl" }}>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-4 border-slate-100 dark:border-slate-800">
                    <div>
                      <h4 className="font-bold text-indigo-950 dark:text-indigo-100 text-base sm:text-lg">تفاصيل التقرير الميداني</h4>
                      <p className="text-xs text-slate-500">تمت الزيارة في: {new Date(report.visitDate).toLocaleDateString('ar-SA')}</p>
                    </div>
                    {report.conditionRating && (
                      <div className={`px-3 py-1 rounded-full border text-xs font-bold ${conditionColors[report.conditionRating] || ''}`}>
                        الحالة: {conditionLabels[report.conditionRating] || report.conditionRating}
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {menArea > 0 && (
                      <div className="p-4 rounded-xl border border-slate-100 dark:border-slate-800/80 bg-slate-50/30 dark:bg-slate-900/10">
                        <span className="text-xs font-bold text-slate-400 dark:text-slate-500 block mb-2">أبعاد مصلى الرجال</span>
                        <div className="flex items-baseline gap-2">
                          <span className="text-xl sm:text-2xl font-extrabold text-slate-800 dark:text-slate-200">
                            {menArea.toLocaleString('ar-SA')} م²
                          </span>
                          <span className="text-xs text-slate-500">
                            ({menLength.toLocaleString('ar-SA')}م × {menWidth.toLocaleString('ar-SA')}م)
                          </span>
                        </div>
                        {report.menPrayerHeight && (
                          <p className="text-xs text-slate-500 mt-1">الارتفاع: {parseFloat(report.menPrayerHeight).toLocaleString('ar-SA')}م</p>
                        )}
                      </div>
                    )}

                    {report.womenPrayerExists && (
                      womenArea > 0 ? (
                        <div className="p-4 rounded-xl border border-slate-100 dark:border-slate-800/80 bg-slate-50/30 dark:bg-slate-900/10">
                          <span className="text-xs font-bold text-slate-400 dark:text-slate-500 block mb-2">أبعاد مصلى النساء</span>
                          <div className="flex items-baseline gap-2">
                            <span className="text-xl sm:text-2xl font-extrabold text-slate-800 dark:text-slate-200">
                              {womenArea.toLocaleString('ar-SA')} م²
                            </span>
                            <span className="text-xs text-slate-500">
                              ({womenLength.toLocaleString('ar-SA')}م × {womenWidth.toLocaleString('ar-SA')}م)
                            </span>
                          </div>
                          {report.womenPrayerHeight && (
                            <p className="text-xs text-slate-500 mt-1">الارتفاع: {parseFloat(report.womenPrayerHeight).toLocaleString('ar-SA')}م</p>
                          )}
                        </div>
                      ) : (
                        <div className="p-4 rounded-xl border border-slate-100 dark:border-slate-800/80 bg-slate-50/30 dark:bg-slate-900/10 flex items-center">
                          <div>
                            <span className="text-xs font-bold text-slate-400 dark:text-slate-500 block mb-1">مصلى النساء</span>
                            <p className="text-sm font-bold text-slate-700 dark:text-slate-300">موجود (لم تحدد الأبعاد)</p>
                          </div>
                        </div>
                      )
                    )}
                  </div>

                  <div className="space-y-4">
                    {report.generalDescription && (
                      <div className="bg-slate-50/30 dark:bg-slate-900/10 p-4 rounded-xl border border-slate-100 dark:border-slate-800/50">
                        <span className="text-xs font-bold text-slate-400 dark:text-slate-500 block mb-2">التوصيف العام للحالة الميدانية</span>
                        <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">
                          {report.generalDescription}
                        </p>
                      </div>
                    )}

                    {report.requiredNeeds && (
                      <div className="bg-slate-50/30 dark:bg-slate-900/10 p-4 rounded-xl border border-slate-100 dark:border-slate-800/50">
                        <span className="text-xs font-bold text-slate-400 dark:text-slate-500 block mb-2">الاحتياجات والملاحظات المطلوبة</span>
                        <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">
                          {report.requiredNeeds}
                        </p>
                      </div>
                    )}
                  </div>

                  {rating !== undefined && rating !== null && (
                    <div className="bg-gradient-to-br from-amber-500/[0.03] to-amber-600/[0.08] dark:from-amber-950/10 dark:to-amber-900/20 border border-amber-200/50 dark:border-amber-900/50 rounded-xl p-4 sm:p-5">
                      <div className="flex flex-col gap-4">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center">
                              <Star className="w-4.5 h-4.5 text-amber-500 fill-amber-500" />
                            </div>
                            <span className="font-bold text-slate-800 dark:text-slate-200 text-sm sm:text-base">
                              تقييم صحة ومطابقة معلومات المستفيد
                            </span>
                          </div>
                          
                          <div className="flex items-center gap-1.5" style={{ direction: "ltr" }}>
                            {[1, 2, 3, 4, 5].map((star) => (
                              <Star
                                key={star}
                                className={`w-5 h-5 ${
                                  star <= rating
                                    ? "text-amber-500 fill-amber-400"
                                    : "text-slate-200 dark:text-slate-800"
                                }`}
                              />
                            ))}
                          </div>
                          
                          <p className="text-xs sm:text-sm text-amber-600 dark:text-amber-400 font-bold">
                            {ratingLabels[rating] || `تقييم ${rating} من 5`}
                          </p>
                        </div>

                        {ratingNotes && (
                          <div className="bg-white/70 dark:bg-slate-900/60 p-3 sm:p-4 rounded-lg border border-amber-100/80 dark:border-amber-900/30">
                            <span className="text-[10px] sm:text-xs font-bold text-slate-400 dark:text-slate-500 block mb-1">
                              ملاحظات المعاين حول صحة البيانات:
                            </span>
                            <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed italic">
                              "{ratingNotes}"
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {(() => {
                    const sitePhotos = request?.attachments?.filter((att: any) => {
                      const ext = att.fileName.split('.').pop()?.toLowerCase();
                      const isImg = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'].includes(ext || '') ||
                        att.fileType?.toLowerCase() === 'image' ||
                        att.fileType?.toLowerCase().startsWith('image/') ||
                        ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'].includes(att.fileType?.toLowerCase() || '');
                      
                      return isImg && att.fileUrl.includes('site_photo');
                    }) || [];

                    return (
                      <div className="space-y-3 pt-4 border-t border-slate-100 dark:border-slate-800/80">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 flex items-center justify-center border border-indigo-100 dark:border-indigo-900/50">
                            <Camera className="w-4.5 h-4.5 text-indigo-600 dark:text-indigo-400" />
                          </div>
                          <span className="font-bold text-slate-800 dark:text-slate-200 text-sm sm:text-base">
                            الصور التوثيقية لحالة المسجد
                          </span>
                          <span className="text-xs text-slate-400 dark:text-slate-50 font-normal">
                            ({sitePhotos.length} {sitePhotos.length === 1 ? "صورة" : "صور"})
                          </span>
                        </div>

                        {sitePhotos.length > 0 ? (
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                            {sitePhotos.map((photo: any, index: number) => (
                              <div 
                                key={photo.id || index} 
                                className="group relative aspect-video rounded-xl overflow-hidden border border-slate-200/60 dark:border-slate-800 bg-slate-100 dark:bg-slate-950/40 shadow-xs hover:shadow-md hover:border-indigo-300 dark:hover:border-indigo-900/80 transition-all duration-300"
                              >
                                <ProgressiveImage 
                                  src={photo.fileUrl} 
                                  alt={photo.fileName} 
                                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                                />
                                {/* Elegant dark overlay on hover */}
                                <div className="absolute inset-0 bg-slate-950/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center gap-2.5 backdrop-blur-xs">
                                  <Button 
                                    type="button" 
                                    variant="secondary" 
                                    size="icon" 
                                    className="w-9 h-9 rounded-full bg-white/95 dark:bg-slate-900/95 shadow-lg text-slate-700 dark:text-slate-200 hover:bg-indigo-600 hover:text-white dark:hover:bg-indigo-600 dark:hover:text-white transition-all transform scale-90 group-hover:scale-100 duration-300"
                                    onClick={() => setPreviewImage({ url: photo.fileUrl, name: photo.fileName })}
                                    title="عرض الصورة"
                                  >
                                    <Eye className="w-4 h-4" />
                                  </Button>
                                  <Button 
                                    type="button" 
                                    variant="secondary" 
                                    size="icon" 
                                    className="w-9 h-9 rounded-full bg-white/95 dark:bg-slate-900/95 shadow-lg text-slate-700 dark:text-slate-200 hover:bg-indigo-600 hover:text-white dark:hover:bg-indigo-600 dark:hover:text-white transition-all transform scale-90 group-hover:scale-100 duration-300 delay-75"
                                    asChild
                                    title="تنزيل الصورة"
                                  >
                                    <a href={photo.fileUrl} target="_blank" rel="noopener noreferrer" download={photo.fileName}>
                                      <Download className="w-4 h-4" />
                                    </a>
                                  </Button>
                                </div>
                                
                                {/* Subtle bottom tag showing filename */}
                                <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-slate-950/80 via-slate-950/40 to-transparent p-2 pt-6 transform translate-y-2 group-hover:translate-y-0 opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none">
                                  <p className="text-[10px] text-white font-medium truncate text-right">
                                    {photo.fileName}
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="p-6 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/20 text-center flex flex-col items-center justify-center gap-2">
                            <Camera className="w-8 h-8 text-slate-300 dark:text-slate-700" />
                            <p className="text-xs text-slate-400 dark:text-slate-500 font-medium">لم يتم رفع أي صور توثيقية لحالة المسجد مع هذا التقرير</p>
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  {teamMembers.length > 0 && (
                    <div className="pt-4 border-t border-slate-100 dark:border-slate-800/80">
                      <span className="text-xs font-bold text-slate-400 dark:text-slate-500 block mb-2">فريق المعاينة الميدانية:</span>
                      <div className="flex flex-wrap gap-2">
                        {teamMembers.map((member, i) => (
                          <span key={i} className="text-xs bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-full text-slate-600 dark:text-slate-300 font-medium">
                            {member}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </ColoredDialog>
      )}

      {/* Colored Dialogs */}
      <ColoredDialog
        open={projectInfoOpen}
        onOpenChange={setProjectInfoOpen}
        title="معلومات المشروع"
        color="blue"
        icon={<Building2 className="w-6 h-6" />}
      >
        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm">
            <p className="text-sm font-medium text-muted-foreground mb-1">المسجد</p>
            <p className="text-lg font-semibold">{request.mosque?.name || "غير محدد"}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm">
            <p className="text-sm font-medium text-muted-foreground mb-1">الموقع</p>
            <p className="text-lg">{request.mosque?.city || "غير محدد"}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm">
            <p className="text-sm font-medium text-muted-foreground mb-1">البرنامج</p>
            <p className="text-lg">{PROGRAM_LABELS[request.programType as keyof typeof PROGRAM_LABELS]}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm">
            <p className="text-sm font-medium text-muted-foreground mb-1">تاريخ التقديم</p>
            <p className="text-lg">{new Date(request.createdAt).toLocaleDateString("ar-SA")}</p>
          </div>
        </div>
      </ColoredDialog>

      <ColoredDialog
        open={timelineOpen}
        onOpenChange={setTimelineOpen}
        title="السجل الزمني"
        color="green"
        icon={<Clock className="w-6 h-6" />}
      >
        <div className="space-y-4">
          {history && history.length > 0 ? (
            history.map((item: any, index: number) => (
              <div key={index} className="bg-white dark:bg-gray-800 border-r-4 border-green-500 pr-4 p-4 rounded-lg shadow-sm">
                <p className="font-semibold text-green-700 dark:text-green-300">{AUDIT_ACTION_LABELS[item.action] || item.action}</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {new Date(item.createdAt).toLocaleString("ar-SA")}
                </p>
                {item.comment && (
                  <p className="text-sm mt-2 text-muted-foreground bg-green-50 dark:bg-green-950/20 p-2 rounded">"{item.comment}"</p>
                )}
              </div>
            ))
          ) : (
            <p className="text-muted-foreground text-center py-8">لا توجد أحداث بعد</p>
          )}
        </div>
      </ColoredDialog>

      <ColoredDialog
        open={attachmentsOpen}
        onOpenChange={setAttachmentsOpen}
        title="المرفقات"
        color="orange"
        icon={<Paperclip className="w-6 h-6" />}
      >
        <div className="space-y-4">
          {request?.attachments && request.attachments.length > 0 ? (
            request.attachments.map((attachment: any, index: number) => (
              <div key={index} className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border-r-4 border-orange-500">
                <p className="font-semibold text-orange-700 dark:text-orange-300">{attachment.fileName}</p>
                <p className="text-sm text-muted-foreground mt-1">{attachment.fileType}</p>
                <Button variant="outline" size="sm" className="mt-2" asChild>
                  <a href={attachment.fileUrl} target="_blank" rel="noopener noreferrer">
                    عرض المرفق
                  </a>
                </Button>
              </div>
            ))
          ) : (
            <p className="text-muted-foreground text-center py-8">لم يتم إرفاق أي ملفات</p>
          )}
          <Button className="w-full bg-orange-600 hover:bg-orange-700">
            <Paperclip className="w-4 h-4 ml-2" />
            إضافة مرفق جديد
          </Button>
        </div>
      </ColoredDialog>

      <ColoredDialog
        open={commentsOpen}
        onOpenChange={setCommentsOpen}
        title="التعليقات"
        color="purple"
        icon={<MessageSquare className="w-6 h-6" />}
      >
        <div className="space-y-4">
          {request?.comments && request.comments.length > 0 ? (
            request.comments.map((comment: any, index: number) => (
              <div key={index} className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border-r-4 border-purple-500">
                <div className="flex items-start justify-between mb-2">
                  <p className="font-semibold text-purple-700 dark:text-purple-300">{comment.userName}</p>
                  <p className="text-xs text-muted-foreground">{new Date(comment.createdAt).toLocaleString("ar-SA")}</p>
                </div>
                <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{comment.comment}</p>
              </div>
            ))
          ) : (
            <p className="text-muted-foreground text-center py-8">لا توجد تعليقات بعد</p>
          )}
          <Button className="w-full bg-purple-600 hover:bg-purple-700">
            <MessageSquare className="w-4 h-4 ml-2" />
            إضافة تعليق جديد
          </Button>
        </div>
      </ColoredDialog>

      {/* Technical Evaluation Dialog */}
      {showTechnicalEvalDialog && selectedDecision && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className={`bg-white dark:bg-slate-900 rounded-lg p-6 w-full mx-4 shadow-xl border dark:border-slate-800 transition-all duration-200 ${selectedDecision === 'convert_to_donation' ? 'max-w-lg' : 'max-w-md'}`}>
            <h3 className="text-lg font-bold mb-4 text-foreground">
              {TECHNICAL_EVAL_OPTION_LABELS[selectedDecision]}
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              {TECHNICAL_EVAL_OPTIONS[selectedDecision as keyof typeof TECHNICAL_EVAL_OPTIONS]?.description}
            </p>

            {/* حقل المبررات (مطلوب للاعتذار والتعليق) */}
            {(selectedDecision === 'apologize' || selectedDecision === 'suspend') && (
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2 text-foreground">
                  المبررات <span className="text-red-500">*</span>
                </label>
                <Textarea
                  value={justification}
                  onChange={(e) => setJustification(e.target.value)}
                  placeholder="اكتب المبررات هنا..."
                  rows={4}
                />
              </div>
            )}

            {/* حقل اسم المشروع والفرصة (مطلوب عند التحويل لمشروع أو فرصة تبرع) */}
            {(selectedDecision === 'convert_to_project' || selectedDecision === 'convert_to_donation') && (
              <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1 text-right">
                <div className="mb-4">
                  <label className="block text-sm font-medium mb-2 text-foreground">
                    اسم المشروع <span className="text-red-500">*</span>
                  </label>
                  <Input
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                    placeholder="أدخل اسماً واضحاً للمشروع..."
                    className="w-full text-right"
                  />
                  <p className="text-xs text-muted-foreground mt-1">سيظهر هذا الاسم في صفحة الطلب وصفحة المشاريع</p>
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium mb-2 text-foreground">
                    المدة المتوقعة للانتهاء (بالأيام) <span className="text-red-500">*</span>
                  </label>
                  <div className="relative flex items-center">
                    <Input
                      type="number"
                      min="1"
                      value={durationDays}
                      onChange={(e) => setDurationDays(e.target.value)}
                      placeholder="مثال: 30"
                      className="w-full pl-12 text-right"
                    />
                    <span className="absolute left-3 text-sm text-muted-foreground font-medium pointer-events-none">
                      يوم
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">حدد عدد الأيام المتوقعة لإنجاز المشروع بالكامل</p>
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium mb-2 text-foreground">
                    مدير المشروع <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={selectedManagerId || ''}
                    onChange={(e) => setSelectedManagerId(e.target.value)}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 text-right"
                  >
                    <option value="" disabled>-- اختر مدير المشروع --</option>
                    {managers?.map((manager: any) => (
                      <option key={manager.id} value={manager.id.toString()}>
                        {manager.name}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-muted-foreground mt-1">سيتم إسناد الطلب وإدارة المشروع لهذا المستخدم</p>
                </div>

                {/* حقول إضافية لفرصة التبرع */}
                {selectedDecision === 'convert_to_donation' && (
                  <>
                    <div className="mb-4 border-t pt-4 border-slate-100 dark:border-slate-800">
                      <label className="block text-sm font-medium mb-2 text-foreground">
                        عنوان فرصة التبرع <span className="text-red-500">*</span>
                      </label>
                      <Input
                        value={donationTitle}
                        onChange={(e) => setDonationTitle(e.target.value)}
                        placeholder="مثال: فرصة تبرع لترميم مسجد الفتح"
                        className="w-full text-right"
                      />
                    </div>

                    <div className="mb-4">
                      <label className="block text-sm font-medium mb-2 text-foreground">
                        المبلغ المستهدف (ريال) <span className="text-red-500">*</span>
                      </label>
                      <Input
                        type="number"
                        min="1"
                        value={donationTargetAmount}
                        onChange={(e) => setDonationTargetAmount(e.target.value)}
                        placeholder="مثال: 50000"
                        className="w-full text-right"
                      />
                    </div>

                    <div className="mb-4">
                      <label className="block text-sm font-medium mb-2 text-foreground">
                        وصف فرصة التبرع
                      </label>
                      <Textarea
                        value={donationDescription}
                        onChange={(e) => setDonationDescription(e.target.value)}
                        placeholder="اكتب وصفاً مختصراً يوضح تفاصيل فرصة التبرع للداعمين..."
                        rows={3}
                        className="text-right"
                      />
                    </div>
                  </>
                )}
              </div>
            )}

            {/* تحديد المسؤول للاستجابة السريعة */}
            {selectedDecision === 'quick_response' && (
              <div className="space-y-4 text-right">
                <div className="mb-4">
                  <label className="block text-sm font-medium mb-2 text-foreground">
                    الشخص المسؤول <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={selectedQuickResponseMemberId || ''}
                    onChange={(e) => {
                      setSelectedQuickResponseMemberId(e.target.value);
                      setScheduledDate("");
                      setScheduledTime("");
                    }}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 text-right"
                  >
                    <option value="" disabled>-- اختر الشخص المسؤول --</option>
                    {quickResponseTeamMembers?.map((member) => (
                      <option key={member.id} value={member.id.toString()}>
                        {member.name}
                      </option>
                    ))}
                  </select>
                </div>

                {selectedQuickResponseMemberId && (
                  <div className="grid grid-cols-2 gap-3 mb-4 animate-in fade-in slide-in-from-top-1 duration-200">
                    <div>
                      <label className="block text-sm font-medium mb-2 text-foreground">
                        تاريخ الاستجابة السريعة <span className="text-red-500">*</span>
                      </label>
                      <Input
                        type="date"
                        value={scheduledDate}
                        onChange={(e) => {
                          setScheduledDate(e.target.value);
                          setScheduledTime("");
                        }}
                        className="w-full text-right"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2 text-foreground">
                        وقت الاستجابة السريعة <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={scheduledTime || ''}
                        onChange={(e) => setScheduledTime(e.target.value)}
                        disabled={!scheduledDate}
                        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed text-right"
                      >
                        <option value="" disabled>-- اختر الساعة --</option>
                        {Array.from({ length: 24 }, (_, i) => {
                          const hourStr = String(i).padStart(2, '0') + ":00";
                          const isBusy = busyHours?.includes(hourStr);
                          return (
                            <option key={hourStr} value={hourStr} disabled={isBusy}>
                              {hourStr} {isBusy ? "(محجوز)" : ""}
                            </option>
                          );
                        })}
                      </select>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ملاحظات إضافية (اختياري) */}
            {(selectedDecision === 'convert_to_project' || selectedDecision === 'quick_response') && (
              <div className="mb-4 text-right">
                <label className="block text-sm font-medium mb-2 text-foreground">ملاحظات (اختياري)</label>
                <Textarea
                  value={justification}
                  onChange={(e) => setJustification(e.target.value)}
                  placeholder="أضف ملاحظات إضافية..."
                  rows={3}
                  className="text-right"
                />
              </div>
            )}

            <div className="flex gap-3 justify-end mt-6">
              <Button
                variant="outline"
                onClick={() => {
                  setShowTechnicalEvalDialog(false);
                  setSelectedDecision(null);
                  setJustification("");
                  setProjectName("");
                  setSelectedQuickResponseMemberId(null);
                  setStartDate("");
                  setExpectedEndDate("");
                  setDurationDays("");
                  setScheduledDate("");
                  setScheduledTime("");
                  setDonationTitle("");
                  setDonationTargetAmount("");
                  setDonationDescription("");
                }}
              >
                إلغاء
              </Button>
              <Button
                onClick={() => {
                  if ((selectedDecision === 'convert_to_project' || selectedDecision === 'convert_to_donation') && !projectName.trim()) {
                    toast.error("يجب إدخال اسم المشروع");
                    return;
                  }
                  if ((selectedDecision === 'convert_to_project' || selectedDecision === 'convert_to_donation') && !selectedManagerId) {
                    toast.error("يجب تحديد مدير المشروع");
                    return;
                  }
                  if ((selectedDecision === 'convert_to_project' || selectedDecision === 'convert_to_donation') && (!durationDays || isNaN(parseInt(durationDays)) || parseInt(durationDays) <= 0)) {
                    toast.error("يجب إدخال المدة المتوقعة للانتهاء بالأيام");
                    return;
                  }
                  if (selectedDecision === 'convert_to_donation' && !donationTitle.trim()) {
                    toast.error("يجب إدخال عنوان فرصة التبرع");
                    return;
                  }
                  if (selectedDecision === 'convert_to_donation' && (!donationTargetAmount || isNaN(parseFloat(donationTargetAmount)) || parseFloat(donationTargetAmount) <= 0)) {
                    toast.error("يجب إدخال مبلغ صحيح مستهدف للتبرع");
                    return;
                  }
                  if (selectedDecision === 'quick_response' && !scheduledDate) {
                    toast.error("يجب تحديد تاريخ الاستجابة السريعة");
                    return;
                  }
                  if (selectedDecision === 'quick_response' && !scheduledTime) {
                    toast.error("يجب تحديد وقت الاستجابة السريعة");
                    return;
                  }
                  
                  let calculatedStartDate = undefined;
                  let calculatedEndDate = undefined;
                  if (selectedDecision === 'convert_to_project' || selectedDecision === 'convert_to_donation') {
                    const start = new Date();
                    const end = new Date();
                    const days = parseInt(durationDays || "0", 10);
                    end.setDate(start.getDate() + days);
                    calculatedStartDate = start.toISOString().split('T')[0];
                    calculatedEndDate = end.toISOString().split('T')[0];
                  }

                  technicalEvalMutation.mutate({
                    requestId,
                    decision: selectedDecision as any,
                    projectName: (selectedDecision === 'convert_to_project' || selectedDecision === 'convert_to_donation') ? projectName.trim() : undefined,
                    managerId: (selectedDecision === 'convert_to_project' || selectedDecision === 'convert_to_donation') && selectedManagerId ? parseInt(selectedManagerId) : undefined,
                    assignedToId: selectedDecision === 'quick_response' && selectedQuickResponseMemberId ? parseInt(selectedQuickResponseMemberId) : undefined,
                    startDate: selectedDecision === 'quick_response' ? scheduledDate : calculatedStartDate,
                    endDate: selectedDecision === 'quick_response' ? scheduledDate : calculatedEndDate,
                    scheduledDate: selectedDecision === 'quick_response' ? scheduledDate : undefined,
                    scheduledTime: selectedDecision === 'quick_response' ? scheduledTime : undefined,
                    donationTitle: selectedDecision === 'convert_to_donation' ? donationTitle.trim() : undefined,
                    donationTargetAmount: selectedDecision === 'convert_to_donation' ? parseFloat(donationTargetAmount) : undefined,
                    donationDescription: selectedDecision === 'convert_to_donation' ? donationDescription.trim() : undefined,
                    justification: justification || undefined,
                  });
                }}
                disabled={
                  technicalEvalMutation.isPending ||
                  ((selectedDecision === 'apologize' || selectedDecision === 'suspend') && !justification.trim()) ||
                  ((selectedDecision === 'convert_to_project' || selectedDecision === 'convert_to_donation') && (!projectName.trim() || !durationDays || isNaN(parseInt(durationDays)) || parseInt(durationDays) <= 0 || !selectedManagerId)) ||
                  (selectedDecision === 'convert_to_donation' && (!donationTitle.trim() || !donationTargetAmount || isNaN(parseFloat(donationTargetAmount)) || parseFloat(donationTargetAmount) <= 0)) ||
                  (selectedDecision === 'quick_response' && (!selectedQuickResponseMemberId || !scheduledDate || !scheduledTime))
                }
                className={
                  selectedDecision === 'convert_to_project' ? 'bg-green-600 hover:bg-green-700' :
                  selectedDecision === 'convert_to_donation' ? 'bg-pink-600 hover:bg-pink-700' :
                  selectedDecision === 'quick_response' ? 'bg-purple-600 hover:bg-purple-700' :
                  selectedDecision === 'suspend' ? 'bg-amber-500 hover:bg-amber-600' :
                  'bg-red-600 hover:bg-red-700'
                }
              >
                {technicalEvalMutation.isPending ? 'جاري...' : 'تأكيد'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Rejection Report Dialog */}
      <ColoredDialog
        open={showRejectionReportDialog}
        onOpenChange={setShowRejectionReportDialog}
        title="تقرير الاعتذار عن الطلب"
        color="red"
        icon={<AlertCircle className="w-6 h-6" />}
      >
        <div className="space-y-4 text-right" dir="rtl">
          <div className="bg-red-50/50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/30 p-5 rounded-xl text-center space-y-3">
            <div className="inline-flex p-3 bg-red-100 dark:bg-red-900/50 rounded-full text-red-600 dark:text-red-400 mb-2">
              <AlertCircle className="w-8 h-8" />
            </div>
            <h4 className="text-lg font-black text-red-800 dark:text-red-300">تم الاعتذار عن هذا الطلب</h4>
            <p className="text-sm text-muted-foreground">تم اتخاذ قرار بالاعتذار عن تلبية هذا الطلب في مرحلة التقييم الفني.</p>
          </div>
          
          <div className="border border-border/80 rounded-xl p-4 space-y-2 bg-background">
            <h5 className="text-sm font-bold text-foreground">مبررات الاعتذار / أسباب الرفض:</h5>
            <p className="text-sm text-slate-700 dark:text-slate-350 bg-muted/30 p-3 rounded-lg border leading-relaxed whitespace-pre-wrap">
              {request?.technicalEvalJustification || "لا توجد مبررات مسجلة"}
            </p>
          </div>
          
          <div className="flex justify-end pt-2">
            <Button onClick={() => setShowRejectionReportDialog(false)} className="bg-red-600 hover:bg-red-700 text-white font-semibold w-full sm:w-auto">
              إغلاق
            </Button>
          </div>
        </div>
      </ColoredDialog>

      {/* Request Details Modal */}
      <RequestDetailsModal
        requestId={requestId}
        open={detailsModalOpen}
        onOpenChange={setDetailsModalOpen}
      />
      
      {/* Add Comment Dialog */}
      <ColoredDialog
        open={addCommentOpen}
        onOpenChange={setAddCommentOpen}
        title="إضافة تعليق جديد"
        color="purple"
        icon={<MessageSquare className="w-6 h-6" />}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">التعليق</label>
            <Textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="اكتب تعليقك هنا..."
              rows={5}
              className="w-full"
            />
          </div>
          <Button
            onClick={() => {
              if (!newComment.trim()) {
                toast.error("يرجى كتابة التعليق");
                return;
              }
              addCommentMutation.mutate(
                { requestId, comment: newComment, isInternal: false },
                {
                  onSuccess: () => {
                    setNewComment("");
                    setAddCommentOpen(false);
                    toast.success("تم إضافة التعليق بنجاح");
                  },
                }
              );
            }}
            disabled={addCommentMutation.isPending}
            className="w-full bg-purple-600 hover:bg-purple-700"
          >
            <MessageSquare className="w-4 h-4 ml-2" />
            {addCommentMutation.isPending ? "جاري الإضافة..." : "إضافة التعليق"}
          </Button>
        </div>
      </ColoredDialog>
      
      {/* Add Attachment Dialog */}
      <ColoredDialog
        open={addAttachmentOpen}
        onOpenChange={setAddAttachmentOpen}
        title="رفع مرفق جديد"
        color="orange"
        icon={<Paperclip className="w-6 h-6" />}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">اختر ملف</label>
            <input
              type="file"
              onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
              className="w-full p-2 border rounded-md"
            />
            {selectedFile && (
              <p className="text-sm text-muted-foreground mt-2">
                الملف المختار: {selectedFile.name}
              </p>
            )}
          </div>
          <Button
            onClick={async () => {
              if (!selectedFile) {
                toast.error("يرجى اختيار ملف");
                return;
              }
              
              // Convert file to base64
              const reader = new FileReader();
              reader.onload = () => {
                const base64String = (reader.result as string).split(',')[1]; // Remove data:mime;base64, prefix
                uploadAttachmentMutation.mutate(
                  {
                    requestId,
                    fileName: selectedFile.name,
                    fileData: base64String,
                    mimeType: selectedFile.type,
                    category: "other" as const,
                  },
                  {
                    onSuccess: () => {
                      setSelectedFile(null);
                      setAddAttachmentOpen(false);
                      utils.requests.getById.invalidate({ id: requestId });
                      toast.success("تم رفع المرفق بنجاح");
                    },
                    onError: (error) => {
                      toast.error(error.message || "حدث خطأ أثناء رفع الملف");
                    },
                  }
                );
              };
              reader.readAsDataURL(selectedFile);
            }}
            disabled={uploadAttachmentMutation.isPending}
            className="w-full bg-orange-600 hover:bg-orange-700"
          >
            <Paperclip className="w-4 h-4 ml-2" />
            {uploadAttachmentMutation.isPending ? "جاري الرفع..." : "رفع المرفق"}
          </Button>
        </div>
      </ColoredDialog>

      {/* نافذة جداول الكميات - عريضة لعرض الجدول بشكل كامل */}
      <ColoredDialog
        open={boqOpen}
        onOpenChange={setBoqOpen}
        title="جداول الكميات (BOQ)"
        color="teal"
        fullScreen={true}
      >
        <BoqTab requestId={requestId} />
      </ColoredDialog>

      {/* نافذة معاينة الصور الفاخرة (Lightbox Modal) */}
      {previewImage && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 animate-in fade-in duration-200"
          onClick={() => setPreviewImage(null)}
        >
          <div 
            className="relative max-w-4xl w-full max-h-[90vh] flex flex-col items-center bg-slate-900/55 border border-slate-800 rounded-2xl p-2 sm:p-4 shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button 
              onClick={() => setPreviewImage(null)}
              className="absolute top-4 right-4 bg-slate-800/80 hover:bg-slate-700/80 text-white rounded-full p-2 transition-all z-10 shadow-lg"
              title="إغلاق"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Download button */}
            <a 
              href={previewImage.url} 
              download={previewImage.name}
              target="_blank"
              rel="noopener noreferrer"
              className="absolute top-4 left-4 bg-slate-800/80 hover:bg-orange-600/80 text-white rounded-full p-2 transition-all flex items-center gap-1.5 px-3 z-10 shadow-lg"
              title="تحميل"
            >
              <Download className="w-4 h-4" />
              <span className="text-xs font-bold hidden sm:inline">تحميل</span>
            </a>

            {/* Image container */}
            <div className="w-full flex-1 flex items-center justify-center p-2 overflow-auto mt-12 mb-2">
              <img 
                src={previewImage.url} 
                alt={previewImage.name} 
                className="max-w-full max-h-[70vh] object-contain rounded-lg shadow-md"
              />
            </div>

            {/* Caption/Name */}
            <div className="mt-2 text-center px-4 py-2 w-full border-t border-slate-800/60 bg-slate-900/30">
              <p className="text-sm font-bold text-slate-100 truncate">{previewImage.name}</p>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
