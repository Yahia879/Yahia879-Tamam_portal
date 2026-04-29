import { useState } from "react";
import { useParams, Link, useLocation } from "wouter";
import { ArrowRight, FileText, Clock, Users, Paperclip, MessageSquare, Building2, Calendar, User, XCircle, Zap, PauseCircle, CheckCircle, Calculator, RotateCcw, Download } from "lucide-react";
import { Input } from "@/components/ui/input";
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
  // States for revert stage
  const [showRevertDialog, setShowRevertDialog] = useState(false);
  const [revertReason, setRevertReason] = useState("");

  // Fetch request data
  const { data: request, isLoading } = trpc.requests.getById.useQuery({ id: requestId });
  const history = request?.history || [];
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
      utils.requests.getById.invalidate({ id: requestId });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
  const revertStageMutation = trpc.requests.revertStage.useMutation({
    onSuccess: (data) => {
      toast.success(data.message);
      setShowRevertDialog(false);
      setRevertReason("");
      utils.requests.getById.invalidate({ id: requestId });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  // Handler for stage transition
  const handleStageTransition = () => {
    if (!request || !activeAction) return;
    
    // إذا كان هناك openModal أو كان المسار يحتوي على /boq، افتح نافذة منبثقة
    if ((activeAction.actionButton as any)?.openModal === 'boq' || activeAction.actionButton?.redirectUrl?.includes('/boq')) {
      setBoqOpen(true);
      return;
    }
    
    // إذا كان هناك redirectUrl، انتقل إلى الصفحة المحددة
    if (activeAction.actionButton?.redirectUrl) {
      const url = activeAction.actionButton.redirectUrl
        .replace(':requestId', requestId.toString())
        .replace(':projectId', request.project?.id?.toString() || '');
      setLocation(url);
      return;
    }
    
    // إذا لم يكن هناك redirectUrl، انتقل إلى المرحلة التالية
    const nextStage = getNextStage(request.currentStage);
    if (!nextStage) {
      toast.error("لا توجد مرحلة تالية");
      return;
    }
    updateStageMutation.mutate({ requestId, newStage: nextStage as any });
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
          <Link href="/requests">
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
      <div className="bg-card border-b">
        <div className="container py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/requests">
                <Button variant="ghost" size="sm">
                  ← رجوع
                </Button>
              </Link>
              <div className="flex items-center gap-3">
                <ProgramIcon program={request.programType} className="w-10 h-10" />
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="text-xl font-bold text-muted-foreground font-mono">{request.requestNumber}</h1>
                    {linkedProject && (
                      <Link href={`/projects/${linkedProject.id}`}>
                        <Button variant="outline" size="sm" className="bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100">
                          <Building2 className="w-4 h-4 ml-1" />
                          محول إلى مشروع ({linkedProject.projectNumber})
                        </Button>
                      </Link>
                    )}
                  </div>
                  <p className="text-lg font-bold text-foreground">
                    {request.mosque?.name || "مسجد غير محدد"}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {PROGRAM_LABELS[request.programType as keyof typeof PROGRAM_LABELS]}
                  </p>
                </div>
              </div>
            </div>

            {/* زر تصدير PDF - يظهر للجميع */}
            <div className="flex gap-2 flex-wrap">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const link = document.createElement('a');
                  link.href = `/api/request/${requestId}/pdf`;
                  link.download = `request-${request.requestNumber}.pdf`;
                  link.click();
                }}
                className="bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
              >
                <Download className="w-4 h-4 ml-2" />
                تصدير PDF
              </Button>
            </div>

            {/* Tabs - تظهر فقط للموظفين */}
            {user?.role !== 'service_requester' && (
              <div className="flex gap-2 flex-wrap">
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => setDetailsModalOpen(true)}
                >
                  <FileText className="w-4 h-4 ml-2" />
                  عرض التفاصيل الكاملة
                </Button>
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => setTimelineOpen(true)}
                  className="bg-green-600 hover:bg-green-700 text-white dark:bg-green-600 dark:hover:bg-green-700"
                >
                  <Clock className="w-4 h-4 ml-2" />
                  السجل الزمني
                </Button>
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => setAttachmentsOpen(true)}
                  className="bg-orange-600 hover:bg-orange-700 text-white dark:bg-orange-600 dark:hover:bg-orange-700"
                >
                  <Paperclip className="w-4 h-4 ml-2" />
                  المرفقات
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setCommentsOpen(true);
                    markAsReadMutation.mutate({ requestId });
                  }}
                  className="bg-purple-600 hover:bg-purple-700 text-white dark:bg-purple-600 dark:hover:bg-purple-700 relative"
                >
                  <MessageSquare className="w-4 h-4 ml-2" />
                  التعليقات
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
                      {unreadCount}
                    </span>
                  )}
                </Button>

              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container py-8">
        {/* بانر المشروع - يظهر عند وجود مشروع مرتبط */}
        {linkedProject && (
          <div className="mb-6 bg-emerald-50 dark:bg-emerald-950/30 border-2 border-emerald-200 dark:border-emerald-800 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-emerald-100 dark:bg-emerald-900 flex items-center justify-center">
                  <Building2 className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">مشروع مرتبط بهذا الطلب</p>
                  <p className="font-bold text-emerald-800 dark:text-emerald-200">{linkedProject.name || 'مشروع غير محدد'}</p>
                  <p className="text-sm text-emerald-600 dark:text-emerald-400 font-mono">{linkedProject.projectNumber}</p>
                </div>
              </div>
              <Link href={`/projects/${linkedProject.id}`}>
                <Button variant="outline" size="sm" className="bg-white dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300 border-emerald-300 hover:bg-emerald-50">
                  <Building2 className="w-4 h-4 ml-2" />
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
          <div>
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
                      onClick: () => updateStageMutation.mutate({ requestId, newStage: 'financial_eval' as any }),
                      variant: 'default' as const,
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
                      label: "الانتقال إلى مرحلة الاستلام",
                      onClick: () => setLocation(`/final-report/new?requestId=${requestId}`),
                      variant: 'default' as const,
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
                request.currentStage !== 'technical_eval' ? [
                  {
                    label: "إضافة تعليق",
                    onClick: () => setAddCommentOpen(true),
                  },
                  {
                    label: "رفع مرفق",
                    onClick: () => setAddAttachmentOpen(true),
                  },
                ] : []
              }
            />
            
            {/* زر الرجوع للمرحلة السابقة - يظهر أسفل بطاقة الإجراء النشط */}
            {['super_admin', 'system_admin', 'projects_office'].includes(user?.role || '') &&
              !['submitted', 'closed'].includes(request.currentStage) && (
              <div className="mt-3 flex justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowRevertDialog(true)}
                  className="text-amber-600 border-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950/20"
                >
                  <RotateCcw className="w-4 h-4 ml-2" />
                  رجوع للمرحلة السابقة
                </Button>
              </div>
            )}

            {/* قسم المراجعة الأولية */}
            {request.currentStage === 'initial_review' && (
              <div className="mt-6 bg-blue-50 dark:bg-blue-950/20 p-6 rounded-lg border-2 border-blue-200">
                <div className="flex items-center gap-3 mb-4">
                  <FileText className="w-6 h-6 text-blue-600" />
                  <h4 className="font-bold text-blue-800 text-lg">المراجعة الأولية</h4>
                </div>
                <p className="text-sm text-blue-600 mb-4">يجب إتمام المراجعة الأولية قبل الانتقال للزيارة الميدانية</p>
                <div className="flex items-center gap-3 p-4 bg-white dark:bg-gray-800 rounded-lg border">
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
                    className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500 disabled:opacity-50"
                  />
                  <label htmlFor="review-completed" className="text-sm font-medium cursor-pointer">
                    إتمام المراجعة الأولية
                  </label>
                </div>
              </div>
            )}
            
            {/* مؤشرات إجراءات الزيارة الميدانية */}
            {request.currentStage === 'field_visit' && (
              <div className="mt-6 p-4 bg-card rounded-lg border">
                <h3 className="text-lg font-semibold mb-4">حالة إجراءات الزيارة الميدانية</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* جدولة الزيارة */}
                  <div className={`p-4 rounded-lg border-2 ${
                    fieldVisit?.scheduledDate 
                      ? 'bg-green-50 border-green-200' 
                      : 'bg-gray-50 border-gray-200'
                  }`}>
                    <div className="flex items-center gap-3 mb-2">
                      {fieldVisit?.scheduledDate ? (
                        <CheckCircle className="w-5 h-5 text-green-600" />
                      ) : (
                        <Clock className="w-5 h-5 text-gray-400" />
                      )}
                      <h4 className={`font-semibold ${
                        fieldVisit?.scheduledDate ? 'text-green-800' : 'text-gray-600'
                      }`}>جدولة الزيارة</h4>
                    </div>
                    <p className={`text-sm ${
                      fieldVisit?.scheduledDate ? 'text-green-600' : 'text-gray-500'
                    }`}>
                      {fieldVisit?.scheduledDate 
                        ? `مجدولة: ${new Date(fieldVisit?.scheduledDate).toLocaleDateString('ar-SA')}`
                        : 'معلقة'
                      }
                    </p>
                  </div>


                  {/* رفع التقرير */}
                  <div className={`p-4 rounded-lg border-2 ${
                    fieldVisit?.reportSubmitted
                      ? 'bg-green-50 border-green-200'
                      : fieldVisit?.executionDate
                      ? 'bg-amber-50 border-amber-200'
                      : 'bg-gray-50 border-gray-200'
                  }`}>
                    <div className="flex items-center gap-3 mb-2">
                      {fieldVisit?.reportSubmitted ? (
                        <CheckCircle className="w-5 h-5 text-green-600" />
                      ) : fieldVisit?.executionDate ? (
                        <Clock className="w-5 h-5 text-amber-600" />
                      ) : (
                        <Clock className="w-5 h-5 text-gray-400" />
                      )}
                      <h4 className={`font-semibold ${
                        fieldVisit?.reportSubmitted
                          ? 'text-green-800'
                          : fieldVisit?.executionDate
                          ? 'text-amber-800'
                          : 'text-gray-600'
                      }`}>رفع التقرير</h4>
                    </div>
                    <p className={`text-sm ${
                      fieldVisit?.reportSubmitted
                        ? 'text-green-600'
                        : fieldVisit?.executionDate
                        ? 'text-amber-600'
                        : 'text-gray-500'
                    }`}>
                      {fieldVisit?.reportSubmitted
                        ? 'مكتمل'
                        : fieldVisit?.executionDate
                        ? 'قيد الرفع'
                        : 'معلق'
                      }
                    </p>
                  </div>
                </div>
              </div>
            )}
            
            {/* خيارات التقييم الفني */}
            {request.currentStage === 'technical_eval' && activeAction.canPerformAction && (
              <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* التحويل إلى مشروع */}
                <button 
                  className="group p-4 rounded-lg border-2 border-green-200 bg-green-50 hover:bg-green-100 hover:border-green-400 transition-all text-right disabled:opacity-50"
                  onClick={() => {
                    setSelectedDecision('convert_to_project');
                    setShowTechnicalEvalDialog(true);
                  }}
                  disabled={technicalEvalMutation.isPending}
                >
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-6 h-6 text-green-600" />
                    <div>
                      <h5 className="font-bold text-green-800 text-base">التحويل إلى مشروع</h5>
                      <p className="text-sm text-green-600">إكمال الطلب والانتقال للتقييم المالي</p>
                    </div>
                  </div>
                </button>

                {/* الاستجابة السريعة */}
                <button 
                  className="group p-4 rounded-lg border-2 border-purple-200 bg-purple-50 hover:bg-purple-100 hover:border-purple-400 transition-all text-right disabled:opacity-50"
                  onClick={() => {
                    setSelectedDecision('quick_response');
                    setShowTechnicalEvalDialog(true);
                  }}
                  disabled={technicalEvalMutation.isPending}
                >
                  <div className="flex items-center gap-3">
                    <Zap className="w-6 h-6 text-purple-600" />
                    <div>
                      <h5 className="font-bold text-purple-800 text-base">الاستجابة السريعة</h5>
                      <p className="text-sm text-purple-600">تحويل للحالات البسيطة التي تحتاج تدخل مباشر</p>
                    </div>
                  </div>
                </button>

                {/* التعليق */}
                <button 
                  className="group p-4 rounded-lg border-2 border-amber-200 bg-amber-50 hover:bg-amber-100 hover:border-amber-400 transition-all text-right disabled:opacity-50"
                  onClick={() => {
                    setSelectedDecision('suspend');
                    setShowTechnicalEvalDialog(true);
                  }}
                  disabled={technicalEvalMutation.isPending}
                >
                  <div className="flex items-center gap-3">
                    <PauseCircle className="w-6 h-6 text-amber-600" />
                    <div>
                      <h5 className="font-bold text-amber-800 text-base">التعليق</h5>
                      <p className="text-sm text-amber-600">تعليق الطلب مؤقتاً لحين توفر متطلبات</p>
                    </div>
                  </div>
                </button>

                {/* الاعتذار */}
                <button 
                  className="group p-4 rounded-lg border-2 border-red-200 bg-red-50 hover:bg-red-100 hover:border-red-400 transition-all text-right disabled:opacity-50"
                  onClick={() => {
                    setSelectedDecision('apologize');
                    setShowTechnicalEvalDialog(true);
                  }}
                  disabled={technicalEvalMutation.isPending}
                >
                  <div className="flex items-center gap-3">
                    <XCircle className="w-6 h-6 text-red-600" />
                    <div>
                      <h5 className="font-bold text-red-800 text-base">الاعتذار</h5>
                      <p className="text-sm text-red-600">رفض الطلب نهائياً</p>
                    </div>
                  </div>
                </button>
              </div>
            )}
            
            {/* قسم التقرير الختامي - يظهر في مرحلة الاستلام والمغلق */}
            {(request.currentStage === 'handover' || request.currentStage === 'closed') && (
              <div className="mt-6 bg-emerald-50 dark:bg-emerald-950/20 p-6 rounded-lg border-2 border-emerald-200">
                <div className="flex items-center gap-3 mb-4">
                  <FileText className="w-6 h-6 text-emerald-600" />
                  <h4 className="font-bold text-emerald-800 text-lg">التقرير الختامي</h4>
                </div>
                {latestFinalReport ? (
                  <div className="space-y-3">
                    <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-emerald-200">
                      <p className="text-sm text-emerald-700 font-medium mb-1">ملخص المشروع</p>
                      <p className="text-gray-700 text-sm line-clamp-3">{latestFinalReport.summary}</p>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <Calendar className="w-4 h-4" />
                        <span>تاريخ التقرير: {new Date(latestFinalReport.createdAt).toLocaleDateString('ar-SA')}</span>
                      </div>
                      <Button
                        variant="default"
                        size="sm"
                        className="bg-emerald-600 hover:bg-emerald-700 text-white"
                        onClick={() => setLocation(`/final-report/${latestFinalReport.id}`)}
                      >
                        <FileText className="w-4 h-4 ml-1" />
                        عرض التقرير الكامل
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <p className="text-emerald-600 text-sm mb-3">لم يتم رفع التقرير الختامي بعد</p>
                    {request.currentStage === 'handover' && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-emerald-500 text-emerald-700 hover:bg-emerald-50"
                        onClick={() => setLocation(`/final-report/new?requestId=${requestId}`)}
                      >
                        رفع التقرير الختامي
                      </Button>
                    )}
                  </div>
                )}
              </div>
            )}
            
            {/* قسم جدول الكميات - يُفتح من النافذة المنبثقة فقط */}
          </div>
        )}
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
            <p className="text-muted-foreground text-center py-8">لا توجد مرفقات بعد</p>
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
                  technicalEvalMutation.mutate({
                    requestId,
                    decision: selectedDecision as any,
                    projectName: selectedDecision === 'convert_to_project' ? projectName.trim() : undefined,
                    justification: justification || undefined,
                  });
                }}
                disabled={
                  technicalEvalMutation.isPending ||
                  ((selectedDecision === 'apologize' || selectedDecision === 'suspend') && !justification.trim()) ||
                  (selectedDecision === 'convert_to_project' && !projectName.trim())
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

      {/* نافذة الرجوع للمرحلة السابقة */}
      {showRevertDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-900 rounded-lg p-6 w-full max-w-md mx-4 shadow-xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
                <RotateCcw className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <h3 className="text-lg font-bold">الرجوع للمرحلة السابقة</h3>
                <p className="text-sm text-muted-foreground">تصحيح خطأ في المرحلة الحالية</p>
              </div>
            </div>
            <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 rounded-lg p-3 mb-4">
              <p className="text-sm text-amber-800 dark:text-amber-300">
                ⚠️ سيتم الرجوع من المرحلة الحالية إلى المرحلة السابقة. هذا الإجراء يُسجَّل في سجل الطلب.
              </p>
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">
                سبب الرجوع <span className="text-red-500">*</span>
              </label>
              <Textarea
                value={revertReason}
                onChange={(e) => setRevertReason(e.target.value)}
                placeholder="اذكر سبب الرجوع للمرحلة السابقة..."
                rows={3}
                className="w-full"
              />
            </div>
            <div className="flex gap-3 justify-end">
              <Button
                variant="outline"
                onClick={() => {
                  setShowRevertDialog(false);
                  setRevertReason("");
                }}
              >
                إلغاء
              </Button>
              <Button
                onClick={() => {
                  if (!revertReason.trim() || revertReason.trim().length < 5) {
                    toast.error("يجب ذكر سبب الرجوع (5 أحرف على الأقل)");
                    return;
                  }
                  revertStageMutation.mutate({ requestId, reason: revertReason });
                }}
                disabled={revertStageMutation.isPending}
                className="bg-amber-500 hover:bg-amber-600 text-white"
              >
                <RotateCcw className="w-4 h-4 ml-2" />
                {revertStageMutation.isPending ? 'جاري...' : 'تأكيد الرجوع'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
