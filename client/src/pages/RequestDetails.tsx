import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { 
  ArrowRight, 
  FileText, 
  Building2, 
  Calendar, 
  CalendarDays,
  User,
  Users,
  MessageSquare,
  Paperclip,
  Clock,
  CheckCircle2,
  XCircle,
  Send,
  ClipboardList,
  Zap,
  Eye,
  PauseCircle,
  FolderKanban,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { Link, useParams, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { FinancialApprovalDetails } from "@/components/FinancialApprovalDetails";
import { RequestActionCard } from "@/components/RequestActionCard";
import { 
  PROGRAM_LABELS, 
  STAGE_LABELS, 
  STATUS_LABELS, 
  STAGE_TRANSITION_PERMISSIONS, 
  STATUS_CHANGE_PERMISSIONS, 
  ROLE_LABELS,
  TECHNICAL_EVAL_OPTIONS,
  TECHNICAL_EVAL_OPTION_LABELS,
} from "@shared/constants";
import { ProgramIcon } from "@/components/ProgramIcon";
import { RequestProgressCard } from "@/components/RequestProgressCard";

// ترجمة أنواع الأحداث في سجل الطلب
const ACTION_LABELS: Record<string, string> = {
  'created': 'تم إنشاء الطلب',
  'request_created': 'تم تقديم الطلب',
  'stage_updated': 'تم تحديث المرحلة',
  'status_updated': 'تم تحديث الحالة',
  'comment_added': 'تم إضافة تعليق',
  'attachment_added': 'تم إضافة مرفق',
  'field_visit_scheduled': 'تم جدولة زيارة ميدانية',
  'field_visit_completed': 'تم إكمال الزيارة الميدانية',
  'technical_eval_apologize': 'تم الاعتذار عن الطلب',
  'technical_eval_suspend': 'تم تعليق الطلب',
  'technical_eval_quick_response': 'تم التحويل للاستجابة السريعة',
  'technical_eval_convert_to_project': 'تم التحويل إلى مشروع',
  'approved': 'تم اعتماد الطلب',
  'rejected': 'تم رفض الطلب',
  'completed': 'تم إكمال الطلب',
  'quotation_submitted': 'تم تقديم عرض سعر',
  'quotation_approved': 'تم اعتماد عرض السعر',
  'quotation_rejected': 'تم رفض عرض السعر',
  'contract_created': 'تم إنشاء العقد',
  'contract_signed': 'تم توقيع العقد',
  'payment_made': 'تم الدفع',
  'project_started': 'تم بدء المشروع',
  'project_completed': 'تم إكمال المشروع',
};
import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { Image, Download, ExternalLink } from "lucide-react";
import { toast } from "sonner";

// تم استبدال programIcons بمكون ProgramIcon

const stageSteps = [
  { key: "submitted", label: "تقديم الطلب", order: 1 },
  { key: "initial_review", label: "المراجعة الأولية", order: 2 },
  { key: "field_visit", label: "الزيارة الميدانية", order: 3 },
  { key: "technical_eval", label: "التقييم الفني", order: 4 },
  { key: "boq_preparation", label: "إعداد جدول الكميات", order: 5 },
  { key: "financial_eval_and_approval", label: "التقييم المالي", order: 6 },
  { key: "quotation_approval", label: "اعتماد العرض", order: 7 },
  { key: "contracting", label: "التعاقد", order: 8 },
  { key: "execution", label: "التنفيذ", order: 9 },
  { key: "handover", label: "الاستلام", order: 10 },
  { key: "closed", label: "الإغلاق", order: 11 },
];

export default function RequestDetails() {
  const params = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const requestId = parseInt(params.id || "0");
  const [comment, setComment] = useState("");
  const { user } = useAuth();
  const [showTechnicalEvalDialog, setShowTechnicalEvalDialog] = useState(false);
  const [selectedDecision, setSelectedDecision] = useState<string | null>(null);
  const [justification, setJustification] = useState("");
  
  // حالات نافذة اعتماد عرض السعر
  const [showApproveQuotationDialog, setShowApproveQuotationDialog] = useState(false);
  const [selectedQuotationForApproval, setSelectedQuotationForApproval] = useState<any>(null);
  const [approvedAmount, setApprovedAmount] = useState("");
  const [approvalNotes, setApprovalNotes] = useState("");
  
  // حالات إسناد المهمة وجدولة الزيارة
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [showScheduleDialog, setShowScheduleDialog] = useState(false);
  const [selectedAssignee, setSelectedAssignee] = useState<number | null>(null);
  const [scheduledDate, setScheduledDate] = useState("");
  const [scheduledTime, setScheduledTime] = useState("");
  const [visitNotes, setVisitNotes] = useState("");
  const [visitContactName, setVisitContactName] = useState("");
  const [visitContactTitle, setVisitContactTitle] = useState("");
  const [visitContactPhone, setVisitContactPhone] = useState("");

  const { data: request, isLoading } = trpc.requests.getById.useQuery({ id: requestId });
  const { data: attachments } = trpc.storage.getRequestAttachments.useQuery({ requestId });
  // history and comments are included in the request data
  
  // جلب جدول الكميات وعروض الأسعار للتقييم المالي
  const { data: boqItems } = trpc.projects.getBOQ.useQuery(
    { requestId },
    { enabled: !!request && ['financial_eval_and_approval', 'execution', 'closed'].includes(request.currentStage) }
  );
  const { data: quotations } = trpc.projects.getQuotationsByRequest.useQuery(
    { requestId },
    { enabled: !!request && ['financial_eval_and_approval', 'execution', 'closed'].includes(request.currentStage) }
  );
  
  // جلب العقد المرتبط بالطلب
  const { data: existingContract } = trpc.contracts.getByRequestId.useQuery(
    { requestId },
    { enabled: !!request && ['financial_eval_and_approval', 'execution', 'closed'].includes(request.currentStage) }
  );
  
  // جلب موظفي الفريق الميداني
  const { data: fieldTeamMembers } = trpc.requests.getFieldTeamMembers.useQuery(
    undefined,
    { enabled: !!request && ['initial_review', 'field_visit'].includes(request.currentStage) }
  );

  const utils = trpc.useUtils();

  const addCommentMutation = trpc.requests.addComment.useMutation({
    onSuccess: () => {
      toast.success("تم إضافة التعليق");
      setComment("");
      utils.requests.getById.invalidate({ id: requestId });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const updateStageMutation = trpc.requests.updateStage.useMutation({
    onSuccess: () => {
      toast.success("تم تحديث مرحلة الطلب بنجاح");
      utils.requests.getById.invalidate({ id: requestId });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const updateStatusMutation = trpc.requests.updateStatus.useMutation({
    onSuccess: () => {
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
      setSelectedDecision(null);
      setJustification("");
      utils.requests.getById.invalidate({ id: requestId });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  // mutation لتحديث حالة عرض السعر
  const updateQuotationStatusMutation = trpc.projects.updateQuotationStatus.useMutation({
    onSuccess: () => {
      toast.success("تم تحديث حالة عرض السعر بنجاح");
      setShowApproveQuotationDialog(false);
      setSelectedQuotationForApproval(null);
      setApprovedAmount("");
      setApprovalNotes("");
      utils.projects.getQuotationsByRequest.invalidate({ requestId });
    },
    onError: (error: any) => {
      toast.error(error.message || "حدث خطأ أثناء تحديث حالة عرض السعر");
    },
  });

  // فتح نافذة اعتماد عرض السعر
  const openApproveQuotationDialog = (quotation: any) => {
    setSelectedQuotationForApproval(quotation);
    setApprovedAmount(quotation.totalAmount?.toString() || "");
    setApprovalNotes("");
    setShowApproveQuotationDialog(true);
  };

  // تنفيذ اعتماد عرض السعر
  const handleConfirmQuotationApproval = () => {
    if (!selectedQuotationForApproval) return;
    updateQuotationStatusMutation.mutate({
      id: selectedQuotationForApproval.id,
      status: "accepted",
      approvedAmount: parseFloat(approvedAmount) || undefined,
      notes: approvalNotes || undefined,
    } as any);
  };

  // رفض عرض السعر
  const handleRejectQuotation = (id: number) => {
    updateQuotationStatusMutation.mutate({ id, status: "rejected" });
  };

  // إلغاء اعتماد عرض السعر
  const handleCancelQuotationApproval = (id: number) => {
    updateQuotationStatusMutation.mutate({ id, status: "pending" });
  };

  // إعادة عرض مرفوض للمراجعة
  const handleReactivateQuotation = (id: number) => {
    updateQuotationStatusMutation.mutate({ id, status: "pending" });
  };

  // تصدير عرض السعر ك PDF
  const handleExportQuotationPDF = async (quotation: any) => {
    try {
      // استيراد jsPDF ديناميكياً
      const { default: jsPDF } = await import('jspdf');
      const { default: autoTable } = await import('jspdf-autotable');
      
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      // إعداد الخط العربي
      doc.setFont('helvetica');
      doc.setR2L(true);

      // العنوان
      doc.setFontSize(20);
      doc.text('عرض سعر', 105, 20, { align: 'center' });

      // معلومات العرض
      doc.setFontSize(12);
      let y = 40;
      doc.text(`رقم العرض: ${quotation.quotationNumber || '-'}`, 190, y, { align: 'right' });
      y += 8;
      doc.text(`المورد: ${quotation.supplier?.companyName || '-'}`, 190, y, { align: 'right' });
      y += 8;
      doc.text(`المبلغ الإجمالي: ${quotation.totalAmount?.toLocaleString() || 0} ريال`, 190, y, { align: 'right' });
      y += 8;
      if (quotation.approvedAmount) {
        doc.text(`المبلغ المعتمد: ${quotation.approvedAmount.toLocaleString()} ريال`, 190, y, { align: 'right' });
        y += 8;
      }
      doc.text(`صالح حتى: ${quotation.validUntil ? new Date(quotation.validUntil).toLocaleDateString('ar-SA') : '-'}`, 190, y, { align: 'right' });
      y += 8;
      const statusText = quotation.status === 'approved' || quotation.status === 'accepted' ? 'معتمد' : quotation.status === 'rejected' ? 'مرفوض' : 'قيد المراجعة';
      doc.text(`الحالة: ${statusText}`, 190, y, { align: 'right' });

      // حفظ الملف
      doc.save(`quotation-${quotation.quotationNumber || quotation.id}.pdf`);
      toast.success('تم تصدير عرض السعر بنجاح');
    } catch (error) {
      console.error('Error exporting PDF:', error);
      toast.error('حدث خطأ أثناء تصدير PDF');
    }
  };
  
  // mutation لإسناد الزيارة الميدانية
  const assignFieldVisitMutation = trpc.requests.assignFieldVisit.useMutation({
    onSuccess: (data) => {
      toast.success(data.message);
      setShowAssignDialog(false);
      setSelectedAssignee(null);
      setVisitNotes("");
      utils.requests.getById.invalidate({ id: requestId });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
  
  // mutation لجدولة الزيارة الميدانية
  const scheduleFieldVisitMutation = trpc.requests.scheduleFieldVisit.useMutation({
    onSuccess: () => {
      toast.success("تم جدولة الزيارة الميدانية بنجاح");
      setShowScheduleDialog(false);
      setScheduledDate("");
      setScheduledTime("");
      setVisitNotes("");
      utils.requests.getById.invalidate({ id: requestId });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
  
  // تنفيذ إسناد الزيارة الميدانية
  const handleAssignFieldVisit = () => {
    if (!selectedAssignee) {
      toast.error("يرجى اختيار الموظف");
      return;
    }
    assignFieldVisitMutation.mutate({
      requestId,
      assignedTo: selectedAssignee,
      notes: visitNotes || undefined,
    });
  };
  
  // تنفيذ جدولة الزيارة الميدانية
  const handleScheduleFieldVisit = () => {
    if (!scheduledDate) {
      toast.error("يرجى تحديد تاريخ الزيارة");
      return;
    }
    scheduleFieldVisitMutation.mutate({
      requestId,
      scheduledDate,
      scheduledTime: scheduledTime || undefined,
      notes: visitNotes || undefined,
      contactName: visitContactName || undefined,
      contactTitle: visitContactTitle || undefined,
      contactPhone: visitContactPhone || undefined,
    });
  };

  // دالة لتحويل الطلب للمرحلة التالية
  const handleAdvanceStage = () => {
    if (!request) return;
    // المراحل الـ 11 الجديدة
    const standardStages = ["submitted", "initial_review", "field_visit", "technical_eval", "boq_preparation", "financial_eval_and_approval", "quotation_approval", "contracting", "execution", "handover", "closed"];
    const quickResponseStages = ["submitted", "initial_review", "field_visit", "technical_eval", "execution", "closed"];
    
    // تحديد المسار بناءً على نوع الطلب
    const isQuickResponse = request.requestTrack === 'quick_response' || request.technicalEvalDecision === 'quick_response';
    const stages = isQuickResponse ? quickResponseStages : standardStages;
    
    const currentIndex = stages.indexOf(request.currentStage);
    if (currentIndex < stages.length - 1) {
      const nextStage = stages[currentIndex + 1] as any;
      updateStageMutation.mutate({
        requestId,
        newStage: nextStage,
        notes: `تم تحويل الطلب إلى مرحلة ${STAGE_LABELS[nextStage] || nextStage}`,
      });
    }
  };

  // دالة لاعتماد الطلب
  const handleApprove = () => {
    updateStatusMutation.mutate({
      requestId,
      newStatus: "approved",
      notes: "تم اعتماد الطلب",
    });
  };

  // دالة لرفض الطلب
  const handleReject = () => {
    updateStatusMutation.mutate({
      requestId,
      newStatus: "rejected",
      notes: "تم رفض الطلب",
    });
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </DashboardLayout>
    );
  }

  if (!request) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">الطلب غير موجود</p>
          <Link href="/requests">
            <Button variant="outline" className="mt-4">العودة للطلبات</Button>
          </Link>
        </div>
      </DashboardLayout>
    );
  }

  // تحديد المراحل بناءً على مسار الطلب
  const isQuickResponse = request.requestTrack === 'quick_response' || request.technicalEvalDecision === 'quick_response';
  const quickResponseSteps = [
    { key: "submitted", label: "تقديم الطلب", order: 1 },
    { key: "initial_review", label: "المراجعة الأولية", order: 2 },
    { key: "field_visit", label: "الزيارة الميدانية", order: 3 },
    { key: "technical_eval", label: "التقييم الفني", order: 4 },
    { key: "execution", label: "التنفيذ", order: 5 },
    { key: "closed", label: "الإغلاق", order: 6 },
  ];
  
  const activeSteps = isQuickResponse ? quickResponseSteps : stageSteps;
  const currentStageIndex = activeSteps.findIndex(s => s.key === request.currentStage);

  // تحديد الإجراءات المكتملة والمتبقية لكل مرحلة
  const getStageChecklist = () => {
    const checklist: Array<{ id: string; label: string; completed: boolean; required: boolean }> = [];

    switch (request.currentStage) {
      case 'submitted':
        checklist.push(
          { id: '1', label: 'تم تقديم الطلب', completed: true, required: true },
          { id: '2', label: 'بدء المراجعة الأولية', completed: false, required: true }
        );
        break;
      case 'initial_review':
        checklist.push(
          { id: '1', label: 'مراجعة بيانات الطلب', completed: true, required: true },
          { id: '2', label: 'جدولة الزيارة الميدانية', completed: !!request.fieldVisitScheduledDate, required: true }
        );
        break;
      case 'field_visit':
        const hasFieldVisit = !!request.fieldVisitScheduledDate;
        const hasFieldReport = request.history?.some((h: any) => h.action === 'field_visit_completed');
        checklist.push(
          { id: '1', label: 'جدولة الزيارة الميدانية', completed: hasFieldVisit, required: true },
          { id: '2', label: 'رفع تقرير الزيارة الميدانية', completed: hasFieldReport, required: true }
        );
        break;
      case 'technical_eval':
        const hasTechnicalDecision = !!request.technicalEvalDecision;
        checklist.push(
          { id: '1', label: 'مراجعة تقرير الزيارة', completed: true, required: true },
          { id: '2', label: 'اتخاذ قرار التقييم الفني', completed: hasTechnicalDecision, required: true }
        );
        break;
      case 'financial_eval_and_approval':
        const hasApprovedQuotation = request.history?.some((h: any) => h.action === 'quotation_approved');
        checklist.push(
          { id: '1', label: 'إعداد جدول الكميات', completed: true, required: true },
          { id: '2', label: 'تقييم عروض الأسعار', completed: false, required: true },
          { id: '3', label: 'اعتماد عرض السعر', completed: hasApprovedQuotation, required: true }
        );
        break;
      case 'contracting':
        const hasContract = !!existingContract;
        checklist.push(
          { id: '1', label: 'إنشاء العقد', completed: hasContract, required: true },
          { id: '2', label: 'توقيع العقد', completed: false, required: true }
        );
        break;
      case 'execution':
        checklist.push(
          { id: '1', label: 'بدء التنفيذ', completed: true, required: true },
          { id: '2', label: 'متابعة التنفيذ', completed: false, required: true },
          { id: '3', label: 'رفع التقرير الختامي', completed: false, required: true }
        );
        break;
      case 'closed':
        checklist.push(
          { id: '1', label: 'إغلاق الطلب', completed: true, required: true },
          { id: '2', label: 'قياس رضا المستفيد', completed: false, required: false }
        );
        break;
      default:
        checklist.push(
          { id: '1', label: 'لا توجد إجراءات محددة', completed: false, required: false }
        );
    }

    return checklist;
  };

  const stageChecklist = getStageChecklist();

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* العنوان */}
        <div className="flex items-center gap-4">
          <Link href="/requests">
            <Button variant="ghost" size="icon">
              <ArrowRight className="w-5 h-5" />
            </Button>
          </Link>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <ProgramIcon program={request.programType} size="xl" showBackground />
              <div>
                <h1 className="text-2xl font-bold text-foreground">{request.requestNumber}</h1>
                <p className="text-muted-foreground">
                  {PROGRAM_LABELS[request.programType]}
                  {request.mosque?.name && ` - ${request.mosque.name}`}
                  {isQuickResponse && <span className="mr-2 text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">استجابة سريعة</span>}
                </p>
              </div>
            </div>
          </div>
          <span className={`badge ${
            request.status === "completed" ? "bg-green-100 text-green-800" :
            request.status === "rejected" ? "bg-red-100 text-red-800" :
            request.status === "in_progress" ? "bg-blue-100 text-blue-800" :
            "bg-yellow-100 text-yellow-800"
          }`}>
            {STATUS_LABELS[request.status]}
          </span>
        </div>

        {/* شريط المراحل - للموظفين الداخليين فقط */}
        {user?.role !== "service_requester" ? (
          <Card className="border-0 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between overflow-x-auto pb-2">
                {activeSteps.map((stage, index) => {
                  const isCompleted = index < currentStageIndex;
                  const isCurrent = index === currentStageIndex;
                  return (
                    <div key={stage.key} className="flex items-center">
                      <div className="flex flex-col items-center">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          isCompleted ? "bg-green-500 text-white" :
                          isCurrent ? "bg-primary text-white" :
                          "bg-muted text-muted-foreground"
                        }`}>
                          {isCompleted ? (
                            <CheckCircle2 className="w-5 h-5" />
                          ) : (
                            <span>{index + 1}</span>
                          )}
                        </div>
                        <span className={`text-xs mt-2 whitespace-nowrap ${
                          isCurrent ? "text-primary font-medium" : "text-muted-foreground"
                        }`}>
                          {stage.label}
                        </span>
                      </div>
                      {index < activeSteps.length - 1 && (
                        <div className={`w-12 h-1 mx-2 ${
                          isCompleted ? "bg-green-500" : "bg-muted"
                        }`} />
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        ) : null}

        {/* بطاقة التقدم - للموظفين فقط */}
        {user?.role !== "service_requester" && (
          <RequestProgressCard stage={request.currentStage} checklist={stageChecklist} />
        )}

        {/* شريط التقدم بالنسبة المئوية - لطالب الخدمة */}
        {user?.role === "service_requester" && (
          <Card className="border-0 shadow-sm">
            <CardContent className="p-6">
              <div className="text-center mb-4">
                <h3 className="text-lg font-bold text-foreground mb-2">نسبة التقدم في الطلب</h3>
                <p className="text-muted-foreground text-sm">يتم معالجة طلبك حالياً</p>
              </div>
              <div className="relative">
                <div className="w-full bg-muted rounded-full h-6 overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-primary to-green-500 rounded-full transition-all duration-500 flex items-center justify-center"
                    style={{ width: `${request.progressPercentage || 0}%` }}
                  >
                    {(request.progressPercentage || 0) >= 20 && (
                      <span className="text-white text-xs font-bold">{request.progressPercentage}%</span>
                    )}
                  </div>
                </div>
                {(request.progressPercentage || 0) < 20 && (
                  <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-xs font-bold text-foreground">{request.progressPercentage || 0}%</span>
                )}
              </div>
              <div className="flex justify-between mt-3 text-sm">
                <span className="text-muted-foreground">تم التقديم</span>
                <span className="text-muted-foreground">مكتمل</span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* شريط الحالة الذكي */}
        <RequestActionCard 
          requestId={request.id}
          currentStage={request.currentStage}
          request={request}
        />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* التفاصيل الرئيسية */}
          <div className="lg:col-span-2 space-y-6">
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle>تفاصيل الطلب</CardTitle>
                <CardDescription>المعلومات الأساسية للطلب</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <p className="text-sm text-muted-foreground">البرنامج</p>
                    <p className="font-medium">{PROGRAM_LABELS[request.programType]}</p>
                  </div>
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <p className="text-sm text-muted-foreground">المرحلة الحالية</p>
                    <p className="font-medium">{STAGE_LABELS[request.currentStage]}</p>
                  </div>
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <p className="text-sm text-muted-foreground">الأولوية</p>
                    <p className="font-medium">{request.priority === "urgent" ? "عاجل" : request.priority === "medium" ? "متوسط" : "عادي"}</p>
                  </div>
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <p className="text-sm text-muted-foreground">تاريخ التقديم</p>
                    <p className="font-medium">{new Date(request.createdAt).toLocaleDateString("ar-SA")}</p>
                  </div>
                </div>
                
                

                {request.estimatedCost && (
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <p className="text-sm text-muted-foreground">التكلفة التقديرية</p>
                    <p className="font-bold text-lg">{Number(request.estimatedCost).toLocaleString()} ر.س</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* التبويبات */}
            <Tabs defaultValue={user?.role === "service_requester" ? "comments" : "history"} className="space-y-4">
              <TabsList className="flex-wrap h-auto gap-1">
                {/* سجل الطلب - للموظفين فقط */}
                {user?.role !== "service_requester" && (
                  <TabsTrigger value="history">سجل الطلب</TabsTrigger>
                )}
                <TabsTrigger value="comments">التعليقات</TabsTrigger>
                <TabsTrigger value="attachments">المرفقات</TabsTrigger>
                {/* التقييم المالي - للموظفين فقط */}
                {user?.role !== "service_requester" && (request.currentStage === 'financial_eval_and_approval' || request.currentStage === 'contracting' || request.currentStage === 'execution' || request.currentStage === 'closed') && (
                  <TabsTrigger value="financial">التقييم المالي</TabsTrigger>
                )}
              </TabsList>

              {/* سجل الطلب - للموظفين فقط */}
              {user?.role !== "service_requester" && (
                <TabsContent value="history">
                  <Card className="border-0 shadow-sm">
                    <CardContent className="p-4">
                      {request.history && request.history.length > 0 ? (
                        <div className="space-y-4">
                          {request.history.map((item: any) => {
                            // تحسين عرض الأحداث - VERSION 2
                            console.log('[RequestDetails] Processing history item:', item.action, item.fromStage, item.toStage);
                            let displayAction = ACTION_LABELS[item.action] || item.action;
                            let displayNotes = item.notes;
                            
                            // إذا كان الحدث "stage_updated" ويحتوي على fromStage/toStage، عرض المراحل بوضوح
                            if (item.action === 'stage_updated' && (item.fromStage || item.toStage)) {
                              console.log('[RequestDetails] Transforming stage_updated to readable format');
                              const fromStageLabel = item.fromStage ? STAGE_LABELS[item.fromStage] || item.fromStage : 'غير محدد';
                              const toStageLabel = item.toStage ? STAGE_LABELS[item.toStage] || item.toStage : 'غير محدد';
                              displayAction = 'تحديث المرحلة';
                              displayNotes = `من: ${fromStageLabel} ← إلى: ${toStageLabel}`;
                            }
                            
                            return (
                              <div key={item.id} className="flex gap-4">
                                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                                  <Clock className="w-5 h-5 text-primary" />
                                </div>
                                <div className="flex-1">
                                  <p className="font-medium">{displayAction}</p>
                                  {displayNotes && (
                                    <p className="text-sm text-muted-foreground">{displayNotes}</p>
                                  )}
                                  <p className="text-xs text-muted-foreground mt-1">
                                    {new Date(item.createdAt).toLocaleString("ar-SA")}
                                  </p>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="text-center py-8">
                          <Clock className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                          <p className="text-muted-foreground">لا يوجد سجل للطلب</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>
              )}

              <TabsContent value="comments">
                <Card className="border-0 shadow-sm">
                  <CardContent className="p-4 space-y-4">
                    {/* إضافة تعليق - للموظفين فقط */}
                    {user?.role !== "service_requester" && (
                      <div className="flex gap-3">
                        <Textarea
                          placeholder="أضف تعليقاً..."
                          value={comment}
                          onChange={(e) => setComment(e.target.value)}
                          className="flex-1"
                        />
                        <Button 
                          onClick={() => addCommentMutation.mutate({ requestId, comment: comment })}
                          disabled={!comment.trim() || addCommentMutation.isPending}
                        >
                          <Send className="w-4 h-4" />
                        </Button>
                      </div>
                    )}

                    {/* قائمة التعليقات - للموظفين فقط */}
                    {user?.role !== "service_requester" ? (
                      request.comments && request.comments.length > 0 ? (
                        <div className="space-y-4 pt-4 border-t">
                          {request.comments.map((c: any) => (
                            <div key={c.id} className="flex gap-3">
                              <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center shrink-0">
                                <User className="w-5 h-5 text-muted-foreground" />
                              </div>
                              <div className="flex-1 bg-muted/50 rounded-lg p-3">
                                <div className="flex items-center justify-between">
                                  <p className="font-medium text-sm">{c.userName || "مستخدم"}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {new Date(c.createdAt).toLocaleString("ar-SA")}
                                  </p>
                                </div>
                                <p className="text-sm mt-1">{c.content}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-8">
                          <MessageSquare className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                          <p className="text-muted-foreground">لا توجد تعليقات</p>
                        </div>
                      )
                    ) : (
                      <div className="text-center py-8">
                        <MessageSquare className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                        <p className="text-muted-foreground">التعليقات متاحة للموظفين فقط</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="attachments">
                <Card className="border-0 shadow-sm">
                  <CardContent className="p-4">
                    {user?.role === "service_requester" ? (
                      <div className="text-center py-8">
                        <Paperclip className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                        <p className="text-muted-foreground">المرفقات متاحة للموظفين فقط</p>
                      </div>
                    ) : attachments && attachments.length > 0 ? (
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {attachments.map((attachment: any) => (
                          <div key={attachment.id} className="border rounded-lg overflow-hidden">
                            {attachment.fileType === "image" ? (
                              <div className="relative aspect-video bg-muted">
                                <img
                                  src={attachment.fileUrl}
                                  alt={attachment.fileName}
                                  className="w-full h-full object-cover"
                                />
                                <div className="absolute inset-0 bg-black/50 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                  <a href={attachment.fileUrl} target="_blank" rel="noopener noreferrer">
                                    <Button size="icon" variant="secondary">
                                      <ExternalLink className="w-4 h-4" />
                                    </Button>
                                  </a>
                                  <a href={attachment.fileUrl} download={attachment.fileName}>
                                    <Button size="icon" variant="secondary">
                                      <Download className="w-4 h-4" />
                                    </Button>
                                  </a>
                                </div>
                              </div>
                            ) : (
                              <div className="aspect-video bg-muted flex items-center justify-center">
                                <FileText className="w-12 h-12 text-orange-500" />
                              </div>
                            )}
                            <div className="p-3">
                              <p className="text-sm font-medium truncate" title={attachment.fileName}>
                                {attachment.fileName}
                              </p>
                              <div className="flex items-center justify-between mt-2">
                                <span className="text-xs text-muted-foreground">
                                  {attachment.fileSize ? `${(attachment.fileSize / 1024).toFixed(1)} KB` : ''}
                                </span>
                                <a href={attachment.fileUrl} download={attachment.fileName}>
                                  <Button size="sm" variant="ghost">
                                    <Download className="w-3 h-3 ml-1" />
                                    تحميل
                                  </Button>
                                </a>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <Paperclip className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                        <p className="text-muted-foreground">لا توجد مرفقات</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* تبويب التقييم المالي - للموظفين فقط */}
              {user?.role !== "service_requester" && (request.currentStage === 'financial_eval_and_approval' || request.currentStage === 'contracting' || request.currentStage === 'execution' || request.currentStage === 'closed') && (
                <TabsContent value="financial">
                  <div className="space-y-6">
                    {/* تفاصيل الاعتماد المالي - يظهر فقط بعد الاعتماد */}
                    {request.selectedQuotationId && quotations?.quotations && (() => {
                      const selectedQuotation = quotations.quotations.find((q: any) => q.quotationNumber === request.selectedQuotationId);
                      if (selectedQuotation) {
                        return (
                          <FinancialApprovalDetails
                            quotationNumber={selectedQuotation.quotationNumber}
                            supplierName={(selectedQuotation as any).supplier?.companyName || "غير محدد"}
                            totalAmount={selectedQuotation.totalAmount}
                            finalAmount={selectedQuotation.finalAmount || selectedQuotation.totalAmount}
                            approvedAt={request.updatedAt?.toISOString()}
                            approvedBy={user?.name}
                            includesTax={selectedQuotation.includesTax || undefined}
                            taxRate={selectedQuotation.taxRate || undefined}
                            taxAmount={selectedQuotation.taxAmount || undefined}
                            discountType={selectedQuotation.discountType || undefined}
                            discountValue={selectedQuotation.discountValue || undefined}
                            discountAmount={selectedQuotation.discountAmount || undefined}
                          />
                        );
                      }
                      return null;
                    })()}

                    {/* جدول الكميات */}
                    <Card className="border-0 shadow-sm">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <ClipboardList className="w-5 h-5" />
                          جدول الكميات (BOQ)
                        </CardTitle>
                        <CardDescription>تفاصيل البنود والكميات المطلوبة</CardDescription>
                      </CardHeader>
                      <CardContent>
                        {boqItems?.items && boqItems.items.length > 0 ? (
                          <>
                            <div className="overflow-x-auto">
                              <table className="w-full text-sm">
                                <thead>
                                  <tr className="border-b bg-muted/50">
                                    <th className="text-right p-3 font-medium">#</th>
                                    <th className="text-right p-3 font-medium">البند</th>
                                    <th className="text-right p-3 font-medium">الوصف</th>
                                    <th className="text-right p-3 font-medium">الوحدة</th>
                                    <th className="text-right p-3 font-medium">الكمية</th>
                                    <th className="text-right p-3 font-medium">سعر الوحدة</th>
                                    <th className="text-right p-3 font-medium">الإجمالي</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {boqItems.items.map((item: any, index: number) => (
                                    <tr key={item.id} className="border-b hover:bg-muted/30">
                                      <td className="p-3">{index + 1}</td>
                                      <td className="p-3 font-medium">{item.itemName}</td>
                                      <td className="p-3 text-muted-foreground">{item.description || '-'}</td>
                                      <td className="p-3">{item.unit}</td>
                                      <td className="p-3">{item.quantity?.toLocaleString()}</td>
                                      <td className="p-3">{item.unitPrice?.toLocaleString()} ريال</td>
                                      <td className="p-3 font-medium">{item.totalPrice?.toLocaleString()} ريال</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                            <div className="mt-4 p-3 bg-primary/10 rounded-lg">
                              <p className="text-lg font-bold text-primary">
                                إجمالي جدول الكميات: {boqItems.items.reduce((sum: number, item: any) => sum + (parseFloat(item.totalPrice) || 0), 0).toLocaleString('ar-SA')} ريال
                              </p>
                            </div>
                          </>
                        ) : (
                          <div className="text-center py-8 bg-muted/30 rounded-lg border-2 border-dashed">
                            <ClipboardList className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                            <p className="text-muted-foreground mb-4">لم يتم إعداد جدول الكميات بعد</p>
                            <Link href="/boq">
                              <Button variant="outline">
                                <FileText className="w-4 h-4 ml-2" />
                                إعداد جدول الكميات
                              </Button>
                            </Link>
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    {/* عروض الأسعار */}
                    <Card className="border-0 shadow-sm">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <FileText className="w-5 h-5" />
                          عروض الأسعار
                        </CardTitle>
                        <CardDescription>العروض المقدمة من الموردين - اختر العرض الأنسب</CardDescription>
                      </CardHeader>
                      <CardContent>
                        {quotations?.quotations && quotations.quotations.length > 0 ? (
                          <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                              <thead>
                                <tr className="border-b bg-muted/50">
                                  <th className="text-right p-3 font-medium">رقم العرض</th>
                                  <th className="text-right p-3 font-medium">المورد</th>
                                  <th className="text-right p-3 font-medium">المبلغ الإجمالي</th>
                                  <th className="text-right p-3 font-medium">المبلغ المعتمد</th>
                                  <th className="text-right p-3 font-medium">صالح حتى</th>
                                  <th className="text-right p-3 font-medium">الحالة</th>
                                  <th className="text-right p-3 font-medium">الإجراءات</th>
                                </tr>
                              </thead>
                              <tbody>
                                {quotations.quotations.map((q: any) => (
                                  <tr key={q.id} className="border-b hover:bg-muted/30">
                                    <td className="p-3 font-mono text-xs">{q.quotationNumber}</td>
                                    <td className="p-3">{q.supplier?.companyName || '-'}</td>
                                    <td className="p-3">{q.totalAmount?.toLocaleString()} ريال</td>
                                    <td className="p-3">
                                      {q.approvedAmount ? (
                                        <span className="text-green-600 font-medium">{q.approvedAmount.toLocaleString()} ريال</span>
                                      ) : '-'}
                                    </td>
                                    <td className="p-3">{q.validUntil ? new Date(q.validUntil).toLocaleDateString('ar-SA') : '-'}</td>
                                    <td className="p-3">
                                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                        q.status === 'approved' || q.status === 'accepted' ? 'bg-green-100 text-green-800' :
                                        q.status === 'rejected' ? 'bg-red-100 text-red-800' :
                                        'bg-yellow-100 text-yellow-800'
                                      }`}>
                                        {q.status === 'approved' || q.status === 'accepted' ? 'معتمد' : q.status === 'rejected' ? 'مرفوض' : 'قيد المراجعة'}
                                      </span>
                                    </td>
                                    <td className="p-3">
                                      <div className="flex gap-1 flex-wrap">
                                        {(q.status === 'pending' || !q.status) && (
                                          <>
                                            <Button
                                              variant="ghost"
                                              size="sm"
                                              className="text-green-600 hover:text-green-700 hover:bg-green-50 h-7 px-2"
                                              onClick={() => openApproveQuotationDialog(q)}
                                            >
                                              <CheckCircle2 className="h-4 w-4 ml-1" />
                                              اعتماد
                                            </Button>
                                            <Button
                                              variant="ghost"
                                              size="sm"
                                              className="text-red-600 hover:text-red-700 hover:bg-red-50 h-7 px-2"
                                              onClick={() => handleRejectQuotation(q.id)}
                                            >
                                              <XCircle className="h-4 w-4 ml-1" />
                                              رفض
                                            </Button>
                                          </>
                                        )}
                                        {(q.status === 'approved' || q.status === 'accepted') && (
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            className="text-orange-600 hover:text-orange-700 hover:bg-orange-50 h-7 px-2"
                                            onClick={() => handleCancelQuotationApproval(q.id)}
                                          >
                                            <XCircle className="h-4 w-4 ml-1" />
                                            إلغاء الاعتماد
                                          </Button>
                                        )}
                                        {q.status === 'rejected' && (
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 h-7 px-2"
                                            onClick={() => handleReactivateQuotation(q.id)}
                                          >
                                            <Clock className="h-4 w-4 ml-1" />
                                            إعادة للمراجعة
                                          </Button>
                                        )}
                                        {/* زر تصدير PDF */}
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          className="text-purple-600 hover:text-purple-700 hover:bg-purple-50 h-7 px-2"
                                          onClick={() => handleExportQuotationPDF(q)}
                                        >
                                          <FileText className="h-4 w-4 ml-1" />
                                          PDF
                                        </Button>
                                      </div>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        ) : (
                          <div className="text-center py-8 bg-muted/30 rounded-lg border-2 border-dashed">
                            <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                            <p className="text-muted-foreground mb-4">لا توجد عروض أسعار حتى الآن</p>
                            <Link href="/quotations">
                              <Button variant="outline">
                                <Send className="w-4 h-4 ml-2" />
                                طلب عروض أسعار
                              </Button>
                            </Link>
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    {/* ملخص التكلفة */}
                    {(() => {
                      const approvedQuotation = quotations?.quotations?.find((q: any) => q.status === 'approved' || q.status === 'accepted');
                      const originalAmount = parseFloat(approvedQuotation?.totalAmount || '0');
                      const negotiatedAmount = approvedQuotation?.negotiatedAmount ? parseFloat(approvedQuotation.negotiatedAmount) : null;
                      const approvedAmount = approvedQuotation?.approvedAmount ? parseFloat(approvedQuotation.approvedAmount) : null;
                      const supplierCost = approvedAmount || negotiatedAmount || originalAmount;
                      const hasNegotiation = negotiatedAmount !== null && negotiatedAmount !== originalAmount;
                      const savingsAmount = hasNegotiation ? originalAmount - (negotiatedAmount || originalAmount) : 0;
                      const savingsPercentage = hasNegotiation && originalAmount > 0 ? ((savingsAmount / originalAmount) * 100).toFixed(1) : '0';
                      
                      return (
                        <Card className="border-0 shadow-sm bg-gradient-to-r from-green-50 to-emerald-50">
                          <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-green-800">
                              <CheckCircle2 className="w-5 h-5" />
                              ملخص التكلفة
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            {approvedQuotation ? (
                              <div className="space-y-4">
                                <div className={`grid gap-4 ${hasNegotiation ? 'grid-cols-1 md:grid-cols-3' : 'justify-center'}`}>
                                  {/* السعر الأصلي - يظهر فقط إذا كان هناك تفاوض */}
                                  {hasNegotiation && (
                                    <div className="p-4 bg-white rounded-lg text-center">
                                      <p className="text-sm text-muted-foreground">السعر الأصلي</p>
                                      <p className="text-xl font-bold line-through text-muted-foreground">{originalAmount.toLocaleString()} ريال</p>
                                    </div>
                                  )}
                                  {/* الوفر - يظهر فقط إذا كان هناك تفاوض */}
                                  {hasNegotiation && (
                                    <div className="p-4 bg-green-100 rounded-lg text-center border border-green-300">
                                      <p className="text-sm text-green-700">الوفر المحقق ({savingsPercentage}%)</p>
                                      <p className="text-xl font-bold text-green-700">{savingsAmount.toLocaleString()} ريال</p>
                                    </div>
                                  )}
                                  {/* التكلفة المعتمدة */}
                                  <div className={`p-6 bg-white rounded-lg text-center border-2 border-green-500 ${!hasNegotiation ? 'min-w-[250px] mx-auto' : ''}`}>
                                    <p className="text-sm text-muted-foreground">تكلفة المورد المعتمدة</p>
                                    <p className="text-2xl font-bold text-green-700">{supplierCost.toLocaleString()} ريال</p>
                                    <p className="text-xs text-muted-foreground mt-2">نسبة الإشراف تُضاف عند إنشاء العقد</p>
                                  </div>
                                </div>
                                {/* زر إنشاء العقد أو عرض العقد الموجود */}
                                <div className="flex justify-center pt-4 border-t border-green-200">
                                  {existingContract ? (
                                    <div className="flex flex-col items-center gap-3">
                                      <div className="flex items-center gap-2 text-green-700">
                                        <CheckCircle2 className="w-5 h-5" />
                                        <span className="font-medium">يوجد عقد مرتبط بهذا الطلب</span>
                                      </div>
                                      <div className="flex gap-2">
                                        <Link href={`/contracts/${existingContract.id}/preview`}>
                                          <Button variant="outline" className="border-green-600 text-green-700 hover:bg-green-50">
                                            <Eye className="w-4 h-4 ml-2" />
                                            عرض العقد
                                          </Button>
                                        </Link>
                                        {existingContract.status === 'approved' && request?.currentStage !== 'execution' && (
                                          <Button 
                                            className="bg-green-600 hover:bg-green-700 text-white"
                                            onClick={() => {
                                              updateStageMutation.mutate({ 
                                                requestId, 
                                                newStage: 'execution',
                                                notes: 'تم الانتقال لمرحلة التنفيذ بعد اعتماد العقد'
                                              });
                                            }}
                                          >
                                            <ArrowRight className="w-4 h-4 ml-2" />
                                            الانتقال لمرحلة التنفيذ
                                          </Button>
                                        )}
                                      </div>
                                    </div>
                                  ) : (
                                    <Link href={`/contracts/new/request/${requestId}`}>
                                      <Button className="bg-green-600 hover:bg-green-700 text-white px-8">
                                        <FileText className="w-4 h-4 ml-2" />
                                        إنشاء عقد للطلب
                                      </Button>
                                    </Link>
                                  )}
                                </div>
                              </div>
                            ) : (
                              <div className="text-center py-4 text-muted-foreground">
                                <AlertCircle className="w-8 h-8 mx-auto mb-2" />
                                <p>لم يتم اعتماد عرض سعر بعد</p>
                                <Link href="/quotations">
                                  <Button variant="link" className="mt-2">
                                    الذهاب لعروض الأسعار
                                  </Button>
                                </Link>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      );
                    })()}
                  </div>
                </TabsContent>
              )}
            </Tabs>
          </div>

          {/* الشريط الجانبي */}
          <div className="space-y-6">
            {/* معلومات المسجد أو البرنامج */}
            {request.programType === 'bunyan' ? (
              // برنامج بنيان: عرض معلومات البرنامج
              <Card className="border-0 shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="w-5 h-5" />
                    معلومات المشروع
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm text-muted-foreground">اسم المشروع</p>
                      <p className="font-medium">{(request.programData as any)?.projectName || "غير محدد"}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">الموقع</p>
                      <p className="font-medium">{(request.programData as any)?.projectLocation || "غير محدد"}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">البرنامج</p>
                      <p className="font-medium">{PROGRAM_LABELS[request.programType]}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">المساحة</p>
                      <p className="font-medium">{(request.programData as any)?.projectArea ? `${(request.programData as any).projectArea} م²` : "غير محدد"}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">السعة</p>
                      <p className="font-medium">{(request.programData as any)?.projectCapacity ? `${(request.programData as any).projectCapacity} مصلي` : "غير محدد"}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : (
              // البرامج الأخرى: عرض معلومات المسجد
              <Card className="border-0 shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="w-5 h-5" />
                    المسجد
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm text-muted-foreground">اسم المسجد</p>
                      <p className="font-medium">{request.mosque?.name || "-"}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">المدينة</p>
                      <p className="font-medium">{request.mosque?.city || "-"}</p>
                    </div>
                    {request.mosqueId && (
                      <Link href={`/mosques/${request.mosqueId}`}>
                        <Button variant="outline" className="w-full mt-2">
                          عرض تفاصيل المسجد
                        </Button>
                      </Link>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* الإجراءات - للموظفين فقط */}
            {user?.role !== "service_requester" && (
              <Card className="border-0 shadow-sm">
                <CardHeader>
                  <CardTitle>الإجراءات</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {/* أزرار إسناد المهمة وجدولة الزيارة */}
                  {(user?.role === "projects_office" || user?.role === "super_admin" || user?.role === "system_admin") && (
                  <>
                    {(request.currentStage === "initial_review" || request.currentStage === "field_visit") && (
                      <>
                        <Button 
                          className="w-full bg-purple-600 hover:bg-purple-700 text-white" 
                          onClick={() => setShowAssignDialog(true)}
                        >
                          <Users className="w-4 h-4 ml-2" />
                          إسناد الزيارة الميدانية
                        </Button>
                        <Button 
                          className="w-full bg-teal-600 hover:bg-teal-700 text-white" 
                          onClick={() => setShowScheduleDialog(true)}
                        >
                          <CalendarDays className="w-4 h-4 ml-2" />
                          جدولة الزيارة الميدانية
                        </Button>
                      </>
                    )}
                  </>
                )}
                
                {/* عرض معلومات الزيارة المجدولة */}
                {(request as any).fieldVisitScheduledDate && (
                  <div className="p-3 bg-teal-50 rounded-lg border border-teal-200">
                    <p className="text-sm font-medium text-teal-800 mb-2 flex items-center gap-2">
                      <CalendarDays className="w-4 h-4" />
                      زيارة مجدولة
                    </p>
                    <div className="space-y-1">
                      <p className="text-xs text-teal-700">
                        <span className="font-medium">التاريخ:</span> {new Date((request as any).fieldVisitScheduledDate).toLocaleDateString('ar-SA')}
                        {(request as any).fieldVisitScheduledTime && ` - الوقت: ${(request as any).fieldVisitScheduledTime}`}
                      </p>
                      {(request as any).fieldVisitContactName && (
                        <p className="text-xs text-teal-700">
                          <span className="font-medium">الشخص المسؤول:</span> {(request as any).fieldVisitContactName}
                          {(request as any).fieldVisitContactTitle && ` (${(request as any).fieldVisitContactTitle})`}
                        </p>
                      )}
                      {(request as any).fieldVisitContactPhone && (
                        <p className="text-xs text-teal-700">
                          <span className="font-medium">رقم الجوال:</span> <span dir="ltr">{(request as any).fieldVisitContactPhone}</span>
                        </p>
                      )}
                      {(request as any).fieldVisitNotes && (
                        <p className="text-xs text-teal-600">
                          <span className="font-medium">ملاحظات:</span> {(request as any).fieldVisitNotes}
                        </p>
                      )}
                    </div>
                  </div>
                )}
                
                {/* أزرار النماذج الميدانية */}
                  {(user?.role === "field_team" || user?.role === "super_admin" || user?.role === "system_admin" || user?.role === "projects_office") && (
                  <>
                    {(request.currentStage === "field_visit" || request.currentStage === "initial_review") && (
                      <Button 
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white" 
                        onClick={() => navigate(`/requests/${requestId}/field-inspection`)}
                      >
                        <ClipboardList className="w-4 h-4 ml-2" />
                        إنشاء تقرير المعاينة الميدانية
                      </Button>
                    )}
                  </>
                )}

                {/* زر تقرير الاستجابة السريعة - يظهر فقط في مسار الاستجابة السريعة */}
                {(user?.role === "quick_response" || user?.role === "super_admin" || user?.role === "system_admin" || user?.role === "projects_office" || user?.role === "field_team") && (
                  <>
                    {/* يظهر فقط إذا كان الطلب في مسار الاستجابة السريعة وفي مرحلة التنفيذ */}
                    {request.requestTrack === "quick_response" && request.currentStage === "execution" && (
                      <Button 
                        className="w-full bg-orange-600 hover:bg-orange-700 text-white" 
                        onClick={() => navigate(`/requests/${requestId}/quick-response`)}
                      >
                        <Zap className="w-4 h-4 ml-2" />
                        إنشاء تقرير الاستجابة السريعة
                      </Button>
                    )}
                    {/* رسالة توضيحية إذا كان الطلب في مسار الاستجابة السريعة ولكن ليس في مرحلة التنفيذ */}
                    {request.requestTrack === "quick_response" && request.currentStage !== "execution" && request.currentStage !== "closed" && (
                      <div className="p-3 bg-orange-50 rounded-lg border border-orange-200">
                        <p className="text-sm text-orange-700 flex items-center gap-2">
                          <Zap className="w-4 h-4" />
                          هذا الطلب في مسار الاستجابة السريعة
                        </p>
                        <p className="text-xs text-orange-600 mt-1">سيتم تفعيل زر التقرير عند الوصول لمرحلة التنفيذ</p>
                      </div>
                    )}
                  </>
                )}

                {/* عرض التقارير الموجودة */}
                {request.fieldReports && request.fieldReports.length > 0 && (
                  <div className="p-3 bg-blue-50 rounded-lg">
                    <p className="text-sm font-medium text-blue-800 mb-2">
                      <Eye className="w-4 h-4 inline ml-1" />
                      تقارير المعاينة ({request.fieldReports.length})
                    </p>
                    {request.fieldReports.map((report: any, index: number) => (
                      <p key={report.id} className="text-xs text-blue-600">
                        تقرير {index + 1}: {new Date(report.visitDate).toLocaleDateString("ar-SA")}
                      </p>
                    ))}
                  </div>
                )}

                {request.quickReports && request.quickReports.length > 0 && (
                  <div className="p-3 bg-orange-50 rounded-lg">
                    <p className="text-sm font-medium text-orange-800 mb-2">
                      <Eye className="w-4 h-4 inline ml-1" />
                      تقارير الاستجابة ({request.quickReports.length})
                    </p>
                    {request.quickReports.map((report: any, index: number) => (
                      <p key={report.id} className="text-xs text-orange-600">
                        تقرير {index + 1}: {new Date(report.responseDate).toLocaleDateString("ar-SA")} - {report.resolved ? "تم الحل" : "قيد المتابعة"}
                      </p>
                    ))}
                  </div>
                )}

                <hr className="my-2" />

                {/* أزرار الإجراءات حسب الصلاحيات */}
                {(() => {
                  const canTransition = user?.role && STAGE_TRANSITION_PERMISSIONS[request.currentStage]?.includes(user.role);
                  const canApprove = user?.role && STATUS_CHANGE_PERMISSIONS.approve?.includes(user.role);
                  const canReject = user?.role && STATUS_CHANGE_PERMISSIONS.reject?.includes(user.role);
                  const allowedRolesForStage = STAGE_TRANSITION_PERMISSIONS[request.currentStage] || [];
                  
                  return (
                    <>
                      {/* زر اعتماد الطلب */}
                      {canApprove ? (
                        <Button 
                          className="w-full gradient-primary text-white" 
                          onClick={handleApprove}
                          disabled={updateStatusMutation.isPending || request.status === "approved"}
                        >
                          <CheckCircle2 className="w-4 h-4 ml-2" />
                          {updateStatusMutation.isPending ? "جاري..." : "اعتماد الطلب"}
                        </Button>
                      ) : (
                        <div className="p-3 bg-gray-50 rounded-lg text-center">
                          <p className="text-sm text-muted-foreground">ليس لديك صلاحية اعتماد الطلب</p>
                        </div>
                      )}

                      {/* زر تحويل المرحلة أو الإجراء المطلوب */}
                      {request.currentStage !== "closed" && request.currentStage !== "technical_eval" && (
                        // إذا كان في مرحلة الزيارة الميدانية، عرض زر رفع التقرير دائماً (بغض النظر عن canTransition)
                        request.currentStage === "field_visit" ? (
                          canTransition ? (
                            <Link href={`/field-inspection/${requestId}`}>
                              <Button 
                                variant="default" 
                                className="w-full gradient-primary text-white"
                              >
                                <FileText className="w-4 h-4 ml-2" />
                                رفع تقرير الزيارة الميدانية
                              </Button>
                            </Link>
                          ) : (
                            <div className="p-3 bg-amber-50 rounded-lg">
                              <p className="text-sm text-amber-800 font-medium mb-1">لا يمكنك رفع التقرير</p>
                              <p className="text-xs text-amber-600">
                                الأدوار المسموح لها: {allowedRolesForStage.map(r => ROLE_LABELS[r] || r).join('، ')}
                              </p>
                            </div>
                          )
                        ) : (
                          // في المراحل الأخرى، عرض زر تحويل المرحلة أو رسالة عدم الصلاحية
                          canTransition ? (
                            <Button 
                              variant="outline" 
                              className="w-full" 
                              onClick={handleAdvanceStage}
                              disabled={updateStageMutation.isPending}
                            >
                              <ArrowRight className="w-4 h-4 ml-2" />
                              {updateStageMutation.isPending ? "جاري..." : "تحويل للمرحلة التالية"}
                            </Button>
                          ) : (
                            <div className="p-3 bg-amber-50 rounded-lg">
                              <p className="text-sm text-amber-800 font-medium mb-1">لا يمكنك تحويل الطلب من هذه المرحلة</p>
                              <p className="text-xs text-amber-600">
                                الأدوار المسموح لها: {allowedRolesForStage.map(r => ROLE_LABELS[r] || r).join('، ')}
                              </p>
                            </div>
                          )
                        )
                      )}

                      {/* الخيارات الأربعة للتقييم الفني */}
                      {request.currentStage === "technical_eval" && canTransition && (
                        <div className="space-y-4">
                          {/* عنوان القسم */}
                          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-lg border border-blue-100">
                            <h4 className="text-sm font-bold text-blue-800 mb-1 flex items-center">
                              <ClipboardList className="w-4 h-4 ml-2" />
                              قرار التقييم الفني
                            </h4>
                            <p className="text-xs text-blue-600">اختر أحد الخيارات التالية بناءً على نتائج الدراسة الفنية</p>
                          </div>

                          {/* الخيارات الإيجابية */}
                          <div className="grid grid-cols-1 gap-3">
                            {/* التحويل إلى مشروع */}
                            <button 
                              className="group relative p-4 rounded-lg border-2 border-green-200 bg-green-50 hover:bg-green-100 hover:border-green-400 transition-all text-right disabled:opacity-50" 
                              onClick={() => {
                                setSelectedDecision('convert_to_project');
                                setShowTechnicalEvalDialog(true);
                              }}
                              disabled={technicalEvalMutation.isPending}
                            >
                              <div className="flex items-start gap-3">
                                <div className="p-2 bg-green-500 rounded-lg text-white">
                                  <FolderKanban className="w-5 h-5" />
                                </div>
                                <div className="flex-1">
                                  <h5 className="font-bold text-green-800">التحويل إلى مشروع</h5>
                                  <p className="text-xs text-green-600 mt-1">للطلبات التي تحتاج تقييم مالي وعقود موردين</p>
                                </div>
                                <ArrowRight className="w-4 h-4 text-green-400 group-hover:translate-x-[-4px] transition-transform" />
                              </div>
                            </button>

                            {/* التحويل للاستجابة السريعة */}
                            <button 
                              className="group relative p-4 rounded-lg border-2 border-purple-200 bg-purple-50 hover:bg-purple-100 hover:border-purple-400 transition-all text-right disabled:opacity-50" 
                              onClick={() => {
                                setSelectedDecision('quick_response');
                                setShowTechnicalEvalDialog(true);
                              }}
                              disabled={technicalEvalMutation.isPending}
                            >
                              <div className="flex items-start gap-3">
                                <div className="p-2 bg-purple-500 rounded-lg text-white">
                                  <Zap className="w-5 h-5" />
                                </div>
                                <div className="flex-1">
                                  <h5 className="font-bold text-purple-800">التحويل إلى الاستجابة السريعة</h5>
                                  <p className="text-xs text-purple-600 mt-1">للحالات البسيطة التي يمكن تنفيذها مباشرة</p>
                                </div>
                                <ArrowRight className="w-4 h-4 text-purple-400 group-hover:translate-x-[-4px] transition-transform" />
                              </div>
                            </button>
                          </div>

                          {/* فاصل */}
                          <div className="relative">
                            <div className="absolute inset-0 flex items-center">
                              <span className="w-full border-t border-gray-200" />
                            </div>
                            <div className="relative flex justify-center text-xs">
                              <span className="bg-white px-2 text-gray-400">أو</span>
                            </div>
                          </div>

                          {/* الخيارات الأخرى */}
                          <div className="grid grid-cols-2 gap-3">
                            {/* تعليق الطلب */}
                            <button 
                              className="group p-3 rounded-lg border-2 border-amber-200 bg-amber-50 hover:bg-amber-100 hover:border-amber-400 transition-all text-right disabled:opacity-50" 
                              onClick={() => {
                                setSelectedDecision('suspend');
                                setShowTechnicalEvalDialog(true);
                              }}
                              disabled={technicalEvalMutation.isPending}
                            >
                              <div className="flex items-center gap-2">
                                <PauseCircle className="w-5 h-5 text-amber-600" />
                                <div>
                                  <h5 className="font-bold text-amber-800 text-sm">تعليق الطلب</h5>
                                  <p className="text-xs text-amber-600">مع ذكر المبررات</p>
                                </div>
                              </div>
                            </button>

                            {/* الاعتذار عن الطلب */}
                            <button 
                              className="group p-3 rounded-lg border-2 border-red-200 bg-red-50 hover:bg-red-100 hover:border-red-400 transition-all text-right disabled:opacity-50" 
                              onClick={() => {
                                setSelectedDecision('apologize');
                                setShowTechnicalEvalDialog(true);
                              }}
                              disabled={technicalEvalMutation.isPending}
                            >
                              <div className="flex items-center gap-2">
                                <XCircle className="w-5 h-5 text-red-600" />
                                <div>
                                  <h5 className="font-bold text-red-800 text-sm">الاعتذار</h5>
                                  <p className="text-xs text-red-600">رفض الطلب نهائياً</p>
                                </div>
                              </div>
                            </button>
                          </div>
                        </div>
                      )}

                      {/* زر رفض الطلب */}
                      {canReject ? (
                        <Button 
                          variant="destructive" 
                          className="w-full" 
                          onClick={handleReject}
                          disabled={updateStatusMutation.isPending || request.status === "rejected"}
                        >
                          <XCircle className="w-4 h-4 ml-2" />
                          {updateStatusMutation.isPending ? "جاري..." : "رفض الطلب"}
                        </Button>
                      ) : (
                        <div className="p-3 bg-gray-50 rounded-lg text-center">
                          <p className="text-sm text-muted-foreground">ليس لديك صلاحية رفض الطلب</p>
                        </div>
                      )}
                    </>
                  );
                })()}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* Dialog التقييم الفني */}
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
                  technicalEvalMutation.mutate({
                    requestId,
                    decision: selectedDecision as any,
                    justification: justification || undefined,
                  });
                }}
                disabled={
                  technicalEvalMutation.isPending ||
                  ((selectedDecision === 'apologize' || selectedDecision === 'suspend') && !justification.trim())
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

      {/* Dialog اعتماد عرض السعر */}
      <Dialog open={showApproveQuotationDialog} onOpenChange={setShowApproveQuotationDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>اعتماد عرض السعر</DialogTitle>
            <DialogDescription>
              يمكنك تعديل المبلغ المعتمد بعد التفاوض مع المورد
            </DialogDescription>
          </DialogHeader>
          {selectedQuotationForApproval && (
            <div className="space-y-4">
              {/* معلومات العرض */}
              <div className="bg-muted/50 p-4 rounded-lg space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">رقم العرض:</span>
                  <span className="font-medium">{selectedQuotationForApproval.quotationNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">المورد:</span>
                  <span className="font-medium">{selectedQuotationForApproval.supplier?.companyName || '-'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">المبلغ الأصلي:</span>
                  <span className="font-bold text-primary">
                    {parseFloat(selectedQuotationForApproval.totalAmount || 0).toLocaleString("ar-SA")} ريال
                  </span>
                </div>
              </div>

              {/* المبلغ المعتمد */}
              <div>
                <Label>المبلغ المعتمد (ريال) *</Label>
                <Input
                  type="number"
                  value={approvedAmount}
                  onChange={(e) => setApprovedAmount(e.target.value)}
                  placeholder="أدخل المبلغ المعتمد..."
                  className="mt-1"
                />
                {approvedAmount && parseFloat(approvedAmount) !== parseFloat(selectedQuotationForApproval.totalAmount || 0) && (
                  <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-yellow-800 text-sm flex items-center gap-2">
                    <AlertCircle className="h-4 w-4" />
                    <span>سيتم اعتماد مبلغ مختلف عن العرض الأصلي</span>
                  </div>
                )}
              </div>

              {/* المبرر/الملاحظات */}
              <div>
                <Label>مبرر الاعتماد / ملاحظات</Label>
                <Textarea
                  value={approvalNotes}
                  onChange={(e) => setApprovalNotes(e.target.value)}
                  placeholder="مثال: تم التفاوض مع المورد للوصول إلى هذا المبلغ..."
                  className="mt-1"
                  rows={3}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowApproveQuotationDialog(false)}>
              إلغاء
            </Button>
            <Button 
              onClick={handleConfirmQuotationApproval}
              disabled={!approvedAmount || updateQuotationStatusMutation.isPending}
              className="bg-green-600 hover:bg-green-700"
            >
              {updateQuotationStatusMutation.isPending && <Loader2 className="h-4 w-4 ml-2 animate-spin" />}
              اعتماد العرض
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Dialog إسناد الزيارة الميدانية */}
      <Dialog open={showAssignDialog} onOpenChange={setShowAssignDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>إسناد الزيارة الميدانية</DialogTitle>
            <DialogDescription>
              اختر الموظف المسؤول عن تنفيذ الزيارة الميدانية
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>الموظف المسؤول *</Label>
              <select
                className="w-full mt-1 p-2 border rounded-md"
                value={selectedAssignee || ''}
                onChange={(e) => setSelectedAssignee(parseInt(e.target.value) || null)}
              >
                <option value="">اختر الموظف...</option>
                {fieldTeamMembers?.map((member: any) => (
                  <option key={member.id} value={member.id}>
                    {member.name} - {member.role === 'field_team' ? 'فريق ميداني' : member.role}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label>ملاحظات (اختياري)</Label>
              <Textarea
                value={visitNotes}
                onChange={(e) => setVisitNotes(e.target.value)}
                placeholder="أي ملاحظات إضافية..."
                className="mt-1"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAssignDialog(false)}>
              إلغاء
            </Button>
            <Button 
              onClick={handleAssignFieldVisit}
              disabled={!selectedAssignee || assignFieldVisitMutation.isPending}
              className="bg-purple-600 hover:bg-purple-700"
            >
              {assignFieldVisitMutation.isPending && <Loader2 className="h-4 w-4 ml-2 animate-spin" />}
              إسناد المهمة
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Dialog جدولة الزيارة الميدانية */}
      <Dialog open={showScheduleDialog} onOpenChange={setShowScheduleDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>جدولة الزيارة الميدانية</DialogTitle>
            <DialogDescription>
              حدد تاريخ ووقت الزيارة وبيانات الشخص المسؤول
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {/* بيانات الشخص المسؤول */}
            <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-sm font-medium text-blue-800 mb-3">بيانات الشخص المسؤول للزيارة</p>
              <div className="grid grid-cols-1 gap-3">
                <div>
                  <Label>اسم الشخص المسؤول</Label>
                  <Input
                    type="text"
                    value={visitContactName}
                    onChange={(e) => setVisitContactName(e.target.value)}
                    placeholder="مثال: محمد أحمد"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>صفة الشخص</Label>
                  <Input
                    type="text"
                    value={visitContactTitle}
                    onChange={(e) => setVisitContactTitle(e.target.value)}
                    placeholder="مثال: إمام المسجد، مؤذن، جار المسجد"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>رقم الجوال</Label>
                  <Input
                    type="tel"
                    value={visitContactPhone}
                    onChange={(e) => setVisitContactPhone(e.target.value)}
                    placeholder="05XXXXXXXX"
                    className="mt-1"
                    dir="ltr"
                  />
                </div>
              </div>
            </div>
            
            {/* بيانات الزيارة */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>تاريخ الزيارة *</Label>
                <Input
                  type="date"
                  value={scheduledDate}
                  onChange={(e) => setScheduledDate(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label>وقت الزيارة</Label>
                <Input
                  type="time"
                  value={scheduledTime}
                  onChange={(e) => setScheduledTime(e.target.value)}
                  className="mt-1"
                />
              </div>
            </div>
            <div>
              <Label>ملاحظات (اختياري)</Label>
              <Textarea
                value={visitNotes}
                onChange={(e) => setVisitNotes(e.target.value)}
                placeholder="أي ملاحظات إضافية..."
                className="mt-1"
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowScheduleDialog(false)}>
              إلغاء
            </Button>
            <Button 
              onClick={handleScheduleFieldVisit}
              disabled={!scheduledDate || scheduleFieldVisitMutation.isPending}
              className="bg-teal-600 hover:bg-teal-700"
            >
              {scheduleFieldVisitMutation.isPending && <Loader2 className="h-4 w-4 ml-2 animate-spin" />}
              جدولة الزيارة
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
