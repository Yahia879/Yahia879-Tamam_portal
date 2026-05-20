import { useState, useEffect } from "react";
import { useParams, Link, useLocation } from "wouter";
import { ArrowRight, FileText, Clock, Users, Paperclip, MessageSquare, Building2, Calendar, User, XCircle, Zap, PauseCircle, CheckCircle, Calculator, RotateCcw, Download, ChevronDown, ChevronUp, Eye, X, Star } from "lucide-react";
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
import { WORKFLOW_STEPS, PROGRAM_LABELS, AUDIT_ACTION_LABELS, TECHNICAL_EVAL_OPTIONS, TECHNICAL_EVAL_OPTION_LABELS, getWorkflowForRequest, canTransitionStage } from "../../../shared/constants";
import { ProgramIcon } from "@/components/ProgramIcon";
import BoqTab from "@/components/BoqTab";
import { toast } from "sonner";
import { getAllFieldsForProgram } from "@/lib/programFields";

export default function RequestDetailsNew() {
  const { id } = useParams();
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const requestId = parseInt(id!);

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
  
  // States for technical evaluation
  const [showTechnicalEvalDialog, setShowTechnicalEvalDialog] = useState(false);
  const [selectedDecision, setSelectedDecision] = useState<string | null>(null);
  const [justification, setJustification] = useState("");
  const [projectName, setProjectName] = useState("");
  const [selectedManagerId, setSelectedManagerId] = useState<string | null>(null);
  const [startDate, setStartDate] = useState("");
  const [expectedEndDate, setExpectedEndDate] = useState("");
  // Fetch request data
  const { data: request, isLoading } = trpc.requests.getById.useQuery({ id: requestId });
  const history = request?.history || [];
  const utils = trpc.useUtils();

  // Fetch managers for project creation
  const { data: managersResult } = trpc.users.getAll.useQuery({
    roles: ['super_admin', 'system_admin', 'projects_office', 'project_manager'],
    limit: 100,
  }, {
    enabled: selectedDecision === 'convert_to_project',
  });
  const managers = managersResult?.items || [];

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

  const technicalEvalMutation = trpc.requests.technicalEvalDecision.useMutation({
    onSuccess: (data) => {
      toast.success(data.message);
      setShowTechnicalEvalDialog(false);
      setSelectedDecision(null);
      setJustification("");
      setProjectName("");
      setSelectedManagerId(null);
      setStartDate("");
      setExpectedEndDate("");
      utils.requests.getById.invalidate({ id: requestId });
    },
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
          <p className="text-muted-foreground">جاري التحميل...</p>
        </div>
      </div>
    );
  }

  if (!request) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="p-8 text-center">
          <h2 className="text-2xl font-bold mb-4">الطلب غير موجود</h2>
          <p className="text-muted-foreground mb-6">لم يتم العثور على الطلب المطلوب</p>
          <Link href={user?.role === "service_requester" ? "/my-requests" : "/requests"}>
            <Button>العودة إلى الطلبات</Button>
          </Link>
        </Card>
      </div>
    );
  }

  // تحديد ما إذا كان المستخدم مستفيداً
  const isRequester = user?.role === 'service_requester';

  // Get active action - لا تُظهر الإجراءات الإدارية للمستفيد
  let activeAction = isRequester ? null : getActiveAction(request.currentStage, user?.role, {
    assignedTo: request.assignedTo,
    userId: user?.id,
  });

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
    if (!fieldVisit?.scheduledDate) {
      // لم يتم الجدولة بعد
      activeAction = {
        ...activeAction,
        title: 'جدولة الزيارة الميدانية',
        description: 'تحديد موعد الزيارة الميدانية',
        actionButton: {
          label: 'جدولة الزيارة الميدانية',
          redirectUrl: '/field-visits/schedule/:requestId',
        },
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
      };
    }
  }

  const completedSteps = getCompletedSteps(request.currentStage);
  const progress = getProgressPercentage(request.currentStage);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-card border-b sticky top-0 z-10 sm:relative">
        <div className="container mx-auto px-4 py-4 sm:py-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start sm:items-center gap-3 sm:gap-4">
              <Link href={user?.role === "service_requester" ? "/my-requests" : "/requests"}>
                <Button variant="ghost" size="sm" className="h-8 w-8 sm:h-9 sm:w-auto p-0 sm:px-3">
                  <ArrowRight className="w-4 h-4 sm:ml-2" />
                  <span className="hidden sm:inline">رجوع</span>
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
                          <Building2 className="w-3 h-3 sm:w-4 sm:h-4 ml-1 flex-shrink-0" />
                          <span className="truncate">محول إلى مشروع ({linkedProject.projectNumber})</span>
                        </Button>
                      </Link>
                    )}
                  </div>
                  <p className="text-base sm:text-lg font-bold text-foreground truncate">
                    {request.mosque?.name || "مسجد غير محدد"}
                  </p>
                  <p className="text-xs sm:text-sm text-muted-foreground truncate">
                    {PROGRAM_LABELS[request.programType as keyof typeof PROGRAM_LABELS]}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-4 sm:py-8">
        {/* بانر المشروع - يظهر عند وجود مشروع مرتبط */}
        {linkedProject && (
          <div className="mb-6 bg-emerald-50 dark:bg-emerald-950/30 border-2 border-emerald-200 dark:border-emerald-800 rounded-xl p-3 sm:p-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-lg bg-emerald-100 dark:bg-emerald-900 flex items-center justify-center flex-shrink-0">
                  <Building2 className="w-5 h-5 text-emerald-600" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] sm:text-xs text-emerald-600 dark:text-emerald-400 font-medium">مشروع مرتبط بهذا الطلب</p>
                  <p className="font-bold text-sm sm:text-base text-emerald-800 dark:text-emerald-200 truncate">{linkedProject.name || 'مشروع غير محدد'}</p>
                  <p className="text-xs sm:text-sm text-emerald-600 dark:text-emerald-400 font-mono">{linkedProject.projectNumber}</p>
                </div>
              </div>
              <Link href={`/projects/${linkedProject.id}`} className="w-full sm:w-auto">
                <Button variant="outline" size="sm" className="bg-white dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300 border-emerald-300 hover:bg-emerald-50 w-full font-bold">
                  <Building2 className="w-4 h-4 ml-2 shrink-0" />
                  عرض صفحة المشروع
                </Button>
              </Link>
            </div>
          </div>
        )}

        {/* Progress Stepper */}
        <ProgressStepper
          steps={workflow.map((s) => ({ ...s, label: s.label }))}
          currentStep={request.currentStage}
          completedSteps={completedSteps}
        />

        {/* Active Action Card */}
        {activeAction && (
          <div className="space-y-6">
            <ActiveActionCard
              title={activeAction.title}
              description={activeAction.description}
              icon={activeAction.icon as any}
              iconColor={activeAction.iconColor}
              progress={{
                current: workflow.findIndex((s) => s.id === request.currentStage) + 1,
                total: workflow.length,
                percentage: progress,
              }}
              actionButton={
                activeAction.canPerformAction && activeAction.actionButton && request.currentStage !== 'technical_eval'
                  ? {
                      label: activeAction.actionButton.label,
                      onClick: handleStageTransition,
                      disabled: !activeAction.canPerformAction || updateStageMutation.isPending,
                    }
                  : undefined
              }
              secondaryButton={
                request.currentStage === 'boq_preparation' && activeAction.canPerformAction
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
                : request.currentStage === 'financial_eval_and_approval' && activeAction.canPerformAction
                  ? {
                      label: "إدارة عروض الأسعار",
                      onClick: () => setLocation('/quotations'),
                      variant: 'outline' as const,
                    }
                  : request.currentStage === 'contracting' && hasApprovedContract && canTransitionStage(user?.role || '', 'contracting')
                  ? {
                      label: "الانتقال إلى مرحلة التنفيذ",
                      onClick: () => updateStageMutation.mutate({ requestId, newStage: 'execution' as any }),
                      variant: 'default' as const,
                    }
                  : request.currentStage === 'execution' && canTransitionStage(user?.role || '', 'execution')
                  ? {
                      label: latestFinalReport ? "تم رفع التقرير الختامي" : "الانتقال إلى مرحلة الاستلام",
                      onClick: () => setLocation(`/final-report/new?requestId=${requestId}`),
                      variant: 'default' as const,
                      disabled: !!latestFinalReport,
                    }
                  : request.currentStage === 'handover' && canTransitionStage(user?.role || '', 'handover')
                  ? {
                      label: "إغلاق الطلب رسمياً",
                      onClick: () => updateStageMutation.mutate({ requestId, newStage: 'closed' as any }),
                      variant: 'default' as const,
                    }
                  : undefined
              }
              additionalActions={
                (request.currentStage === 'handover' || request.currentStage === 'closed') && latestFinalReport
                  ? [{
                      label: "عرض التقرير النهائي",
                      onClick: () => setLocation(`/final-report/${latestFinalReport.id}?requestId=${requestId}`),
                    }]
                  : []
              }
            />
            
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
                    disabled={updateReviewCompletedMutation.isPending}
                    className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500 disabled:opacity-50 cursor-pointer"
                  />
                  <label htmlFor="review-completed" className="text-sm font-bold cursor-pointer">
                    إتمام المراجعة الأولية للطلب
                  </label>
                </div>
              </div>
            )}
            
            {/* مؤشرات إجراءات الزيارة الميدانية */}
            {request.currentStage === 'field_visit' && (
              <div className="p-4 sm:p-6 bg-card rounded-xl border-2 shadow-sm">
                <h3 className="text-base sm:text-lg font-bold mb-4">حالة إجراءات الزيارة الميدانية</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  {/* جدولة الزيارة */}
                  <div className={`p-3 sm:p-4 rounded-lg border-2 transition-all ${
                    fieldVisit?.scheduledDate 
                      ? 'bg-green-50 border-green-200 dark:bg-green-900/10 dark:border-green-800' 
                      : 'bg-gray-50 border-gray-200 dark:bg-gray-900/10 dark:border-gray-800'
                  }`}>
                    <div className="flex items-center gap-3 mb-2">
                      {fieldVisit?.scheduledDate ? (
                        <CheckCircle className="w-5 h-5 text-green-600" />
                      ) : (
                        <Clock className="w-5 h-5 text-gray-400" />
                      )}
                      <h4 className={`font-bold text-sm sm:text-base ${
                        fieldVisit?.scheduledDate ? 'text-green-800 dark:text-green-200' : 'text-gray-600 dark:text-gray-400'
                      }`}>جدولة الزيارة</h4>
                    </div>
                    <p className={`text-[11px] sm:text-sm font-medium ${
                      fieldVisit?.scheduledDate ? 'text-green-600 dark:text-green-400' : 'text-gray-500'
                    }`}>
                      {fieldVisit?.scheduledDate 
                        ? `مجدولة: ${new Date(fieldVisit?.scheduledDate).toLocaleDateString('ar-SA')}`
                        : 'معلقة (لم يتم التحديد)'
                      }
                    </p>
                  </div>

                  {/* رفع التقرير */}
                  <div className={`p-3 sm:p-4 rounded-lg border-2 transition-all ${
                    fieldVisit?.reportSubmitted
                      ? 'bg-green-50 border-green-200 dark:bg-green-900/10 dark:border-green-800'
                      : fieldVisit?.executionDate
                      ? 'bg-amber-50 border-amber-200 dark:bg-amber-900/10 dark:border-amber-800'
                      : 'bg-gray-50 border-gray-200 dark:bg-gray-900/10 dark:border-gray-800'
                  }`}>
                    <div className="flex items-center gap-3 mb-2">
                      {fieldVisit?.reportSubmitted ? (
                        <CheckCircle className="w-5 h-5 text-green-600" />
                      ) : fieldVisit?.executionDate ? (
                        <Clock className="w-5 h-5 text-amber-600" />
                      ) : (
                        <Clock className="w-5 h-5 text-gray-400" />
                      )}
                      <h4 className={`font-bold text-sm sm:text-base ${
                        fieldVisit?.reportSubmitted
                          ? 'text-green-800 dark:text-green-200'
                          : fieldVisit?.executionDate
                          ? 'text-amber-800 dark:text-amber-200'
                          : 'text-gray-600 dark:text-gray-400'
                      }`}>رفع التقرير</h4>
                    </div>
                    <p className={`text-[11px] sm:text-sm font-medium ${
                      fieldVisit?.reportSubmitted
                        ? 'text-green-600 dark:text-green-400'
                        : fieldVisit?.executionDate
                        ? 'text-amber-600 dark:text-amber-400'
                        : 'text-gray-500'
                    }`}>
                      {fieldVisit?.reportSubmitted
                        ? 'تم رفع التقرير بنجاح'
                        : fieldVisit?.executionDate
                        ? 'قيد الرفع (تمت الزيارة)'
                        : 'معلق (بانتظار الزيارة)'
                      }
                    </p>
                  </div>
                </div>
              </div>
            )}
            
            {/* خيارات التقييم الفني */}
            {request.currentStage === 'technical_eval' && activeAction.canPerformAction && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
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

                {/* التعليق */}
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
                      <p className="text-[11px] sm:text-sm text-amber-600 dark:text-amber-400 leading-tight">تعليق الطلب مؤقتاً لحين توفر متطلبات إضافية</p>
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

        {/* تقرير المعاينة الميدانية */}
        {request?.fieldReports && request.fieldReports.length > 0 && (
          <div className="mt-6 space-y-6">
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

              // حساب مساحة الرجال والنساء
              const menLength = parseFloat(report.menPrayerLength || "0");
              const menWidth = parseFloat(report.menPrayerWidth || "0");
              const menArea = menLength * menWidth;

              const womenLength = parseFloat(report.womenPrayerLength || "0");
              const womenWidth = parseFloat(report.womenPrayerWidth || "0");
              const womenArea = womenLength * womenWidth;

              // الحصول على أعضاء الفريق
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
                <Card key={report.id} className="border-0 shadow-md overflow-hidden bg-white dark:bg-slate-900 border-r-4 border-r-indigo-600">
                  <div className="p-4 sm:p-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/30 flex items-center justify-center shrink-0">
                          <FileText className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                        </div>
                        <div>
                          <h3 className="font-bold text-slate-800 dark:text-slate-100 text-base sm:text-lg">تقرير المعاينة الميدانية الرسمي</h3>
                          <p className="text-xs text-slate-500">تمت الزيارة في: {new Date(report.visitDate).toLocaleDateString('ar-SA')}</p>
                        </div>
                      </div>
                      {report.conditionRating && (
                        <div className={`px-3 py-1 rounded-full border text-xs font-bold ${conditionColors[report.conditionRating] || ''}`}>
                          الحالة: {conditionLabels[report.conditionRating] || report.conditionRating}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="p-4 sm:p-6 space-y-6">
                    {/* معلومات المساحة والقدرة الاستيعابية */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* مصلى الرجال */}
                      {menArea > 0 && (
                        <div className="p-4 rounded-xl border border-slate-100 dark:border-slate-800/80 bg-slate-50/30 dark:bg-slate-900/10">
                          <h4 className="text-xs font-bold text-slate-400 dark:text-slate-500 mb-2">أبعاد مصلى الرجال</h4>
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

                      {/* مصلى النساء */}
                      {report.womenPrayerExists ? (
                        womenArea > 0 ? (
                          <div className="p-4 rounded-xl border border-slate-100 dark:border-slate-800/80 bg-slate-50/30 dark:bg-slate-900/10">
                            <h4 className="text-xs font-bold text-slate-400 dark:text-slate-500 mb-2">أبعاد مصلى النساء</h4>
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
                              <h4 className="text-xs font-bold text-slate-400 dark:text-slate-500 mb-1">مصلى النساء</h4>
                              <p className="text-sm font-bold text-slate-700 dark:text-slate-300">موجود (لم تحدد الأبعاد)</p>
                            </div>
                          </div>
                        )
                      ) : (
                        <div className="p-4 rounded-xl border border-slate-100 dark:border-slate-800/80 bg-slate-50/30 dark:bg-slate-900/10 flex items-center">
                          <div>
                            <h4 className="text-xs font-bold text-slate-400 dark:text-slate-500 mb-1">مصلى النساء</h4>
                            <p className="text-sm font-bold text-slate-500">لا يوجد مصلى مخصص للنساء</p>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* التوصيف والاحتياجات */}
                    <div className="space-y-4">
                      {report.generalDescription && (
                        <div className="bg-slate-50/30 dark:bg-slate-900/10 p-4 rounded-xl border border-slate-100 dark:border-slate-800/50">
                          <h4 className="text-xs font-bold text-slate-400 dark:text-slate-500 mb-2">التوصيف العام للحالة الميدانية</h4>
                          <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">
                            {report.generalDescription}
                          </p>
                        </div>
                      )}

                      {report.requiredNeeds && (
                        <div className="bg-slate-50/30 dark:bg-slate-900/10 p-4 rounded-xl border border-slate-100 dark:border-slate-800/50">
                          <h4 className="text-xs font-bold text-slate-400 dark:text-slate-500 mb-2">الاحتياجات والملاحظات المطلوبة</h4>
                          <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">
                            {report.requiredNeeds}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* تقييم صحة معلومات المستفيد */}
                    {rating !== undefined && rating !== null && (
                      <div className="bg-gradient-to-br from-amber-500/[0.03] to-amber-600/[0.08] dark:from-amber-950/10 dark:to-amber-900/20 border border-amber-200/50 dark:border-amber-900/50 rounded-xl p-4 sm:p-5">
                        <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center">
                                <Star className="w-4.5 h-4.5 text-amber-500 fill-amber-500" />
                              </div>
                              <h4 className="font-bold text-slate-800 dark:text-slate-200 text-sm sm:text-base">
                                تقييم صحة ومطابقة معلومات المستفيد
                              </h4>
                            </div>
                            
                            <div className="flex items-center gap-1.5" style={{ direction: "ltr" }}>
                              {[1, 2, 3, 4, 5].map((star) => (
                                <Star
                                  key={star}
                                  className={`w-5 h-5 sm:w-6 sm:h-6 ${
                                    star <= rating
                                      ? "text-amber-500 fill-amber-400 drop-shadow-[0_0_5px_rgba(245,158,11,0.4)]"
                                      : "text-slate-200 dark:text-slate-800"
                                  }`}
                                />
                              ))}
                            </div>
                            
                            <p className="text-xs sm:text-sm text-amber-600 dark:text-amber-400 font-bold mt-1">
                              {ratingLabels[rating] || `تقييم ${rating} من 5`}
                            </p>
                          </div>

                          {ratingNotes ? (
                            <div className="flex-1 w-full md:max-w-md bg-white/70 dark:bg-slate-900/60 p-3 sm:p-4 rounded-lg border border-amber-100/80 dark:border-amber-900/30">
                              <span className="text-[10px] sm:text-xs font-bold text-slate-400 dark:text-slate-500 block mb-1">
                                ملاحظات المعاين حول صحة البيانات:
                              </span>
                              <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed italic">
                                "{ratingNotes}"
                              </p>
                            </div>
                          ) : (
                            <div className="text-xs sm:text-sm text-slate-400 dark:text-slate-500 italic">
                              لا توجد ملاحظات إضافية حول التقييم.
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* فريق المعاينة */}
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
                </Card>
              );
            })}
          </div>
        )}

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
                <p className="font-bold text-sm sm:text-lg truncate">مراجعة المعلومات والمرفقات</p>
                <p className="text-[10px] sm:text-sm text-muted-foreground truncate">عرض تفاصيل الطلب والملفات المرفوعة</p>
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
                  تفاصيل الطلب الأساسية
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {/* معلومات أساسية ثابته */}
                  <div className="space-y-1 bg-white dark:bg-slate-800/50 p-3 rounded-lg border shadow-xs">
                    <p className="text-[10px] sm:text-xs text-muted-foreground font-medium">البرنامج</p>
                    <p className="text-sm sm:text-base font-bold text-slate-800 dark:text-slate-200">{PROGRAM_LABELS[request.programType as keyof typeof PROGRAM_LABELS]}</p>
                  </div>
                  <div className="space-y-1 bg-white dark:bg-slate-800/50 p-3 rounded-lg border shadow-xs">
                    <p className="text-[10px] sm:text-xs text-muted-foreground font-medium">تاريخ التقديم</p>
                    <p className="text-sm sm:text-base font-bold text-slate-800 dark:text-slate-200">{new Date(request.createdAt).toLocaleDateString("ar-SA")}</p>
                  </div>
                  {request.mosque && (
                    <>
                      <div className="space-y-1 bg-white dark:bg-slate-800/50 p-3 rounded-lg border shadow-xs">
                        <p className="text-[10px] sm:text-xs text-muted-foreground font-medium">المسجد</p>
                        <p className="text-sm sm:text-base font-bold text-slate-800 dark:text-slate-200 truncate">{request.mosque.name}</p>
                      </div>
                      <div className="space-y-1 bg-white dark:bg-slate-800/50 p-3 rounded-lg border shadow-xs">
                        <p className="text-[10px] sm:text-xs text-muted-foreground font-medium">الموقع</p>
                        <p className="text-sm sm:text-base font-bold text-slate-800 dark:text-slate-200">{request.mosque.city || "غير محدد"}</p>
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
                        let displayValue = programData[field.name];
                        
                        // معالجة القيم الخاصة (مثل نعم/لا)
                        if (field.type === 'radio' || field.type === 'select') {
                          const option = field.options?.find(opt => opt.value === displayValue);
                          if (option) displayValue = option.label;
                          else if (displayValue === 'yes') displayValue = 'نعم';
                          else if (displayValue === 'no') displayValue = 'لا';
                        }

                        return (
                          <div key={field.name} className="space-y-1 col-span-full bg-white dark:bg-slate-800/50 p-3 rounded-lg border shadow-xs">
                            <p className="text-[10px] sm:text-xs text-muted-foreground font-medium">{field.label}</p>
                            <p className="text-sm sm:text-base font-bold text-slate-800 dark:text-slate-200 whitespace-pre-wrap break-words leading-relaxed">{String(displayValue)}</p>
                          </div>
                        );
                      });
                  })()}
                </div>
              </div>

              {/* المرفقات */}
              <div className="bg-slate-50 dark:bg-slate-900/50 p-4 sm:p-6 rounded-xl border-2 border-slate-200 dark:border-slate-800 shadow-sm">
                <h4 className="font-bold text-base sm:text-lg mb-4 flex items-center gap-2 text-slate-800 dark:text-slate-200 border-b pb-3 border-slate-200 dark:border-slate-800">
                  <Paperclip className="w-5 h-5 text-orange-600" />
                  المرفقات المرفوعة مع الطلب
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
                                  title="عرض الصورة ملء الشاشة"
                                >
                                  <Eye className="w-4 h-4" />
                                </Button>
                                <Button 
                                  type="button" 
                                  variant="secondary" 
                                  size="icon" 
                                  className="w-9 h-9 rounded-full bg-white dark:bg-slate-900 shadow-md hover:bg-orange-500 hover:text-white transition-colors"
                                  asChild
                                  title="تنزيل الصورة"
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
                              <span className="text-[10px] bg-slate-200/50 dark:bg-slate-800 px-2 py-0.5 rounded-full text-slate-600 dark:text-slate-400 font-medium">مستند</span>
                            </div>
                          )}
                          <div className="min-w-0 flex-1 flex flex-col justify-end">
                            <p className="font-bold text-xs sm:text-sm text-slate-800 dark:text-slate-200 truncate" title={attachment.fileName}>
                              {attachment.fileName}
                            </p>
                            <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100 dark:border-slate-800/80">
                              <span className="text-[10px] text-muted-foreground font-medium bg-slate-50 dark:bg-slate-900/50 px-2 py-0.5 rounded-full inline-block">
                                {attachment.fileType || 'ملف'}
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
                                    عرض
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
                                    تنزيل
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
                    <p className="text-muted-foreground font-medium text-xs sm:text-sm">لم يتم إرفاق أي ملفات بهذا الطلب</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

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
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-bold mb-4">
              {TECHNICAL_EVAL_OPTION_LABELS[selectedDecision]}
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              {TECHNICAL_EVAL_OPTIONS[selectedDecision as keyof typeof TECHNICAL_EVAL_OPTIONS]?.description}
            </p>

            {/* حقل المبررات (مطلوب للاعتذار والتعليق) */}
            {(selectedDecision === 'apologize' || selectedDecision === 'suspend') && (
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">
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

            {/* حقل اسم المشروع (مطلوب عند التحويل لمشروع) */}
            {selectedDecision === 'convert_to_project' && (
              <div className="space-y-4">
                <div className="mb-4">
                  <label className="block text-sm font-medium mb-2">
                    اسم المشروع <span className="text-red-500">*</span>
                  </label>
                  <Input
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                    placeholder="أدخل اسماً واضحاً للمشروع..."
                    className="w-full"
                  />
                  <p className="text-xs text-muted-foreground mt-1">سيظهر هذا الاسم في صفحة الطلب وصفحة المشاريع</p>
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium mb-2">
                    مدير المشروع <span className="text-red-500">*</span>
                  </label>
                  <Select
                    value={selectedManagerId || ""}
                    onValueChange={setSelectedManagerId}
                  >
                    <SelectTrigger className="w-full flex-row-reverse">
                      <SelectValue placeholder="اختر مديراً للمشروع..." />
                    </SelectTrigger>
                    <SelectContent>
                      {managers.map((manager) => (
                        <SelectItem key={manager.id} value={manager.id.toString()}>
                          {manager.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-1">سيتم إسناد المشروع لهذا المدير فور إنشائه</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="mb-4">
                    <label className="block text-sm font-medium mb-2">
                      تاريخ البدء <span className="text-red-500">*</span>
                    </label>
                    <Input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full"
                    />
                  </div>

                  <div className="mb-4">
                    <label className="block text-sm font-medium mb-2">
                      الانتهاء المتوقع <span className="text-red-500">*</span>
                    </label>
                    <Input
                      type="date"
                      value={expectedEndDate}
                      onChange={(e) => setExpectedEndDate(e.target.value)}
                      className="w-full"
                    />
                  </div>
                </div>
              </div>
            )}
            {/* ملاحظات إضافية (اختياري) */}
            {(selectedDecision === 'convert_to_project' || selectedDecision === 'quick_response') && (
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">ملاحظات (اختياري)</label>
                <Textarea
                  value={justification}
                  onChange={(e) => setJustification(e.target.value)}
                  placeholder="أضف ملاحظات إضافية..."
                  rows={3}
                />
              </div>
            )}

            <div className="flex gap-3 justify-end">
              <Button
                variant="outline"
                onClick={() => {
                  setShowTechnicalEvalDialog(false);
                  setSelectedDecision(null);
                  setJustification("");
                  setProjectName("");
                  setSelectedManagerId(null);
                  setStartDate("");
                  setExpectedEndDate("");
                }}
              >
                إلغاء
              </Button>
              <Button
                onClick={() => {
                  if (selectedDecision === 'convert_to_project' && !projectName.trim()) {
                    toast.error("يجب إدخال اسم المشروع");
                    return;
                  }
                  if (selectedDecision === 'convert_to_project' && !selectedManagerId) {
                    toast.error("يجب اختيار مدير للمشروع");
                    return;
                  }
                  if (selectedDecision === 'convert_to_project' && (!startDate || !expectedEndDate)) {
                    toast.error("يجب إدخال تاريخ البدء وتاريخ الانتهاء المتوقع");
                    return;
                  }
                  technicalEvalMutation.mutate({
                    requestId,
                    decision: selectedDecision as any,
                    projectName: selectedDecision === 'convert_to_project' ? projectName.trim() : undefined,
                    managerId: selectedDecision === 'convert_to_project' ? (selectedManagerId ? parseInt(selectedManagerId) : undefined) : undefined,
                    startDate: selectedDecision === 'convert_to_project' ? startDate : undefined,
                    endDate: selectedDecision === 'convert_to_project' ? expectedEndDate : undefined,
                    justification: justification || undefined,
                  });
                }}
                disabled={
                  technicalEvalMutation.isPending ||
                  ((selectedDecision === 'apologize' || selectedDecision === 'suspend') && !justification.trim()) ||
                  (selectedDecision === 'convert_to_project' && (!projectName.trim() || !selectedManagerId || !startDate || !expectedEndDate))
                }
                className={
                  selectedDecision === 'convert_to_project' ? 'bg-green-600 hover:bg-green-700' :
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
        wide={true}
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
