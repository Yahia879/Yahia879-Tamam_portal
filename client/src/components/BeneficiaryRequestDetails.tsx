import React, { useState } from "react";
import { Link } from "wouter";
import BeneficiaryLayout from "@/components/BeneficiaryLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { ProgramIcon } from "@/components/ProgramIcon";
import {
  Building2,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileText,
  Paperclip,
  Printer,
  Star,
  Send,
  Loader2,
  Download,
  Eye,
  Tag,
  MapPin,
  Users,
  Ruler,
  Compass,
  HeartHandshake,
  MessageSquare,
  ShieldCheck,
  Check,
  Sparkles,
  ExternalLink,
} from "lucide-react";
import { PROGRAM_LABELS, STATUS_LABELS } from "@shared/constants";
import { trpc } from "@/lib/trpc";

// المراحل السبعة للمستفيد
const BENEFICIARY_STAGES = [
  { key: "submitted", label: "تقديم الطلب", desc: "تم استلام الطلب وتسجيله بنجاح في النظام" },
  { key: "initial_review", label: "الفرز والمراجعة", desc: "جاري مراجعة وتدقيق بيانات الطلب والمرفقات" },
  { key: "field_visit", label: "الزيارة الميدانية", desc: "التنسيق للمعاينة الميدانية ورفع التقرير الهندسي" },
  { key: "technical_eval", label: "الدراسة الفنية", desc: "إعداد المواصفات الفنية وجداول الكميات المعتمدة" },
  { key: "financial_eval_and_approval", label: "الاعتماد المالي", desc: "استدراج العروض واعتماد التمويل المخصص للمشروع" },
  { key: "execution", label: "مرحلة التنفيذ", desc: "بدء تنفيذ الأعمال بالمسجد ومتابعة الإنجاز" },
  { key: "closed", label: "الاستلام والإغلاق", desc: "اكتمال الأعمال واستلام المشروع بنجاح" },
];

const getStageIndex = (stage: string): number => {
  const map: Record<string, number> = {
    submitted: 0,
    initial_review: 1,
    field_visit: 2,
    technical_eval: 3,
    boq_preparation: 3,
    financial_eval_and_approval: 4,
    quotation_approval: 4,
    contracting: 4,
    execution: 5,
    handover: 6,
    closed: 6,
  };
  return map[stage] ?? 0;
};

const getStatusBadge = (status: string) => {
  switch (status) {
    case "completed":
      return (
        <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 font-bold px-3 py-1 text-xs gap-1.5">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
          <span>مكتمل</span>
        </Badge>
      );
    case "in_progress":
      return (
        <Badge className="bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30 font-bold px-3 py-1 text-xs gap-1.5">
          <Clock className="w-3.5 h-3.5 text-blue-600" />
          <span>قيد التنفيذ</span>
        </Badge>
      );
    case "pending":
    case "under_review":
      return (
        <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30 font-bold px-3 py-1 text-xs gap-1.5">
          <Clock className="w-3.5 h-3.5 text-amber-600" />
          <span>قيد المراجعة</span>
        </Badge>
      );
    case "rejected":
      return (
        <Badge className="bg-red-500/15 text-red-700 dark:text-red-300 border-red-500/30 font-bold px-3 py-1 text-xs gap-1.5">
          <AlertCircle className="w-3.5 h-3.5 text-red-600" />
          <span>تم الاعتذار</span>
        </Badge>
      );
    default:
      return (
        <Badge variant="outline" className="font-bold px-3 py-1 text-xs">
          {STATUS_LABELS[status] || status}
        </Badge>
      );
  }
};

interface BeneficiaryRequestDetailsProps {
  request: any;
  attachments?: any[];
  isLoading?: boolean;
  comment: string;
  setComment: (val: string) => void;
  addCommentMutation: any;
}

export function BeneficiaryRequestDetails({
  request,
  attachments = [],
  isLoading,
  comment,
  setComment,
  addCommentMutation,
}: BeneficiaryRequestDetailsProps) {
  const [activeTab, setActiveTab] = useState("details");
  const { data: orgSettings } = trpc.organization.getSettings.useQuery();

  if (isLoading || !request) {
    return (
      <BeneficiaryLayout activeTab="requests">
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="w-10 h-10 animate-spin text-primary mb-4" />
          <p className="text-muted-foreground text-sm font-medium">جاري تحميل تفاصيل الطلب...</p>
        </div>
      </BeneficiaryLayout>
    );
  }

  // استخراج البيانات المخصصة (programData)
  let programData: Record<string, any> = {};
  try {
    if (typeof request.programData === "string") {
      programData = JSON.parse(request.programData);
    } else if (typeof request.programData === "object" && request.programData !== null) {
      programData = request.programData;
    }
  } catch (e) {
    console.error("Failed to parse programData in BeneficiaryRequestDetails:", e);
  }

  const currentStageIdx = getStageIndex(request.currentStage);
  const currentStageObj = BENEFICIARY_STAGES[currentStageIdx] || BENEFICIARY_STAGES[0];
  const progressPercent = Math.round(((currentStageIdx + 1) / BENEFICIARY_STAGES.length) * 100);

  const isEvaluated = Boolean(request.isEvaluated);
  const canEvaluate = request.currentStage === "handover" || request.currentStage === "closed" || request.status === "completed";

  const handlePrint = () => {
    window.print();
  };

  return (
    <BeneficiaryLayout
      activeTab="requests"
      title={`طلب رقم: ${request.requestNumber}`}
      subtitle={request.programName || PROGRAM_LABELS[request.programType] || "متابعة الطلب"}
      backUrl="/my-requests"
      backLabel="العودة لطلباتي"
      headerActions={
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handlePrint}
            className="rounded-xl font-bold text-xs gap-1.5 h-9 bg-background border-border/80 hover:bg-muted"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>طباعة الاستمارة</span>
          </Button>
        </div>
      }
    >
      <div className="space-y-6 max-w-6xl mx-auto print:hidden">
        {/* بنر تقييم رضا المستفيد (عند إتمام الطلب أو في مرحلة الاستلام) */}
        {canEvaluate && (
          <div className="bg-gradient-to-r from-amber-500 via-amber-600 to-yellow-600 text-white p-5 sm:p-6 rounded-3xl shadow-lg flex flex-col sm:flex-row items-center justify-between gap-4 border border-amber-400/30">
            <div className="flex items-center gap-4">
              <div className="p-3.5 bg-white/20 backdrop-blur-md rounded-2xl shrink-0">
                <Star className="w-7 h-7 text-yellow-200 fill-yellow-200 animate-pulse" />
              </div>
              <div>
                <h3 className="font-extrabold text-base sm:text-lg text-white">تقييم رضا المستفيد</h3>
                <p className="text-amber-100 text-xs sm:text-sm mt-0.5">
                  {isEvaluated
                    ? `شكراً لمشاركتك! التقييم المسجل: ${request.satisfactionRating || 5} من 5 نجوم`
                    : "وصل طلبك للمرحلة النهائية، يسرنا جداً مشاركة رأيك ومستوى رضاك عن الخدمة المقدمة."}
                </p>
              </div>
            </div>
            <Link href={`/requests/${request.id}/evaluation`}>
              <Button className="bg-white hover:bg-amber-50 text-amber-950 font-bold px-6 py-2.5 rounded-2xl shadow-md gap-2 transition-all shrink-0">
                <Star className="w-4 h-4 fill-amber-500 text-amber-500" />
                <span>{isEvaluated ? "عرض التقييم" : "تقييم الخدمة الآن"}</span>
              </Button>
            </Link>
          </div>
        )}

        {/* بطاقة النظرة العامة على الطلب */}
        <Card className="border border-border/70 shadow-sm rounded-3xl overflow-hidden bg-background">
          <CardContent className="p-5 sm:p-7">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
              {/* أيقونة ومعلومات الخدمة */}
              <div className="flex items-start sm:items-center gap-4 min-w-0">
                <ProgramIcon program={request.programType} size="xl" showBackground />
                <div className="min-w-0 space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <h2 className="text-lg sm:text-2xl font-black text-foreground tracking-tight">
                      {request.programName || PROGRAM_LABELS[request.programType] || request.programType}
                    </h2>
                    {getStatusBadge(request.status)}
                  </div>

                  <p className="text-xs sm:text-sm text-muted-foreground font-medium flex flex-wrap items-center gap-2">
                    <span className="font-mono bg-muted px-2.5 py-1 rounded-xl text-foreground font-bold">
                      {request.requestNumber}
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1.5 text-foreground font-semibold">
                      <Building2 className="w-4 h-4 text-primary" />
                      {request.mosque?.name || programData.customMosqueName || "المسجد المحدد"}
                    </span>
                    {(request.mosque?.city || programData.customMosqueCity) && (
                      <>
                        <span>•</span>
                        <span className="flex items-center gap-1 text-muted-foreground">
                          <MapPin className="w-3.5 h-3.5" />
                          {request.mosque?.city || programData.customMosqueCity}
                        </span>
                      </>
                    )}
                  </p>
                </div>
              </div>

              {/* بيانات الميتا */}
              <div className="flex flex-wrap sm:flex-nowrap items-center gap-3 sm:gap-4 border-t lg:border-t-0 pt-4 lg:pt-0 border-border/60">
                <div className="bg-muted/40 p-3 sm:p-3.5 rounded-2xl border border-border/50 text-center min-w-[110px] flex-1 sm:flex-none">
                  <p className="text-[10px] text-muted-foreground font-semibold mb-0.5 flex items-center justify-center gap-1">
                    <Calendar className="w-3 h-3" />
                    <span>تاريخ التقديم</span>
                  </p>
                  <p className="text-xs sm:text-sm font-bold text-foreground font-mono">
                    {new Date(request.createdAt).toLocaleDateString("ar-SA")}
                  </p>
                </div>

                <div className="bg-muted/40 p-3 sm:p-3.5 rounded-2xl border border-border/50 text-center min-w-[110px] flex-1 sm:flex-none">
                  <p className="text-[10px] text-muted-foreground font-semibold mb-0.5 flex items-center justify-center gap-1">
                    <Sparkles className="w-3 h-3 text-amber-500" />
                    <span>الأولوية</span>
                  </p>
                  <p className="text-xs sm:text-sm font-bold text-foreground">
                    {request.priority === "urgent" ? "عاجل" : request.priority === "medium" ? "متوسط" : "عادي"}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* بطاقة متابعة مراحل الطلب (Timeline Tracker) */}
        <Card className="border border-border/70 shadow-sm rounded-3xl overflow-hidden bg-background">
          <CardHeader className="pb-3 border-b border-border/50 bg-muted/10">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <CardTitle className="text-base sm:text-lg font-bold">مراحل معالجة ومتابعة الطلب</CardTitle>
                <CardDescription className="text-xs mt-0.5">
                  المرحلة الحالية: <strong className="text-primary font-bold">{currentStageObj.label}</strong> — {currentStageObj.desc}
                </CardDescription>
              </div>
              <div className="flex items-center gap-2 self-start sm:self-center">
                <span className="text-xs font-semibold text-muted-foreground">نسبة الإنجاز:</span>
                <span className="font-mono text-sm font-black text-primary bg-primary/10 px-2.5 py-0.5 rounded-xl">
                  {progressPercent}%
                </span>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-5 sm:p-7">
            {/* شريط التقدم الرسومي */}
            <div className="mb-6">
              <Progress value={progressPercent} className="h-2.5 rounded-full" />
            </div>

            {/* المراحل بالتسلسل الأفقي */}
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 sm:gap-2">
              {BENEFICIARY_STAGES.map((stage, idx) => {
                const isDone = idx < currentStageIdx;
                const isCurrent = idx === currentStageIdx;

                return (
                  <div
                    key={stage.key}
                    className={`p-3 rounded-2xl border transition-all text-center flex flex-col items-center justify-start ${
                      isCurrent
                        ? "border-primary bg-primary/5 shadow-xs ring-2 ring-primary/20"
                        : isDone
                        ? "border-emerald-500/30 bg-emerald-50/40 dark:bg-emerald-950/15 text-foreground"
                        : "border-border/50 bg-muted/10 text-muted-foreground opacity-60"
                    }`}
                  >
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs mb-2 transition-all ${
                        isDone
                          ? "bg-emerald-600 text-white"
                          : isCurrent
                          ? "bg-primary text-primary-foreground scale-110 shadow-xs"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {isDone ? <Check className="w-4 h-4" /> : idx + 1}
                    </div>

                    <p className={`text-xs font-bold leading-tight ${isCurrent ? "text-primary" : "text-foreground"}`}>
                      {stage.label}
                    </p>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* التبويبات التفصيلية */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="bg-muted/60 p-1.5 rounded-2xl border border-border/50 h-auto flex flex-wrap gap-1">
            <TabsTrigger value="details" className="rounded-xl font-bold text-xs sm:text-sm py-2 px-4 gap-2">
              <FileText className="w-4 h-4" />
              <span>تفاصيل الطلب والمسجد</span>
            </TabsTrigger>
            <TabsTrigger value="attachments" className="rounded-xl font-bold text-xs sm:text-sm py-2 px-4 gap-2">
              <Paperclip className="w-4 h-4" />
              <span>المرفقات والوثائق ({attachments.length})</span>
            </TabsTrigger>
            <TabsTrigger value="comments" className="rounded-xl font-bold text-xs sm:text-sm py-2 px-4 gap-2">
              <MessageSquare className="w-4 h-4" />
              <span>المراسلات والاستفسارات ({(request.comments || []).length})</span>
            </TabsTrigger>
          </TabsList>

          {/* تبويب 1: تفاصيل الطلب وبيانات المسجد */}
          <TabsContent value="details" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* بطاقة المسجد والموقع */}
              <Card className="border border-border/70 shadow-xs rounded-3xl bg-background">
                <CardHeader className="pb-3 border-b border-border/50">
                  <CardTitle className="text-base font-bold flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-primary" />
                    <span>بيانات المسجد والموقع</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-5 space-y-3.5 text-xs sm:text-sm">
                  <div className="flex justify-between items-center py-1.5 border-b border-border/40">
                    <span className="text-muted-foreground font-medium">اسم المسجد:</span>
                    <span className="font-bold text-foreground">
                      {request.mosque?.name || programData.customMosqueName || "—"}
                    </span>
                  </div>

                  <div className="flex justify-between items-center py-1.5 border-b border-border/40">
                    <span className="text-muted-foreground font-medium">المدينة / المنطقة:</span>
                    <span className="font-bold text-foreground">
                      {request.mosque?.city || programData.customMosqueCity || "—"}
                    </span>
                  </div>

                  {programData.district && (
                    <div className="flex justify-between items-center py-1.5 border-b border-border/40">
                      <span className="text-muted-foreground font-medium">اسم الحي:</span>
                      <span className="font-bold text-foreground">{programData.district}</span>
                    </div>
                  )}

                  {programData.nearestMosque && (
                    <div className="flex justify-between items-center py-1.5 border-b border-border/40">
                      <span className="text-muted-foreground font-medium">أقرب مسجد:</span>
                      <span className="font-bold text-foreground">{programData.nearestMosque}</span>
                    </div>
                  )}

                  {programData.distanceToNearestMosque && (
                    <div className="flex justify-between items-center py-1.5">
                      <span className="text-muted-foreground font-medium">المسافة من أقرب مسجد:</span>
                      <span className="font-bold text-foreground">{programData.distanceToNearestMosque} كم</span>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* بطاقة المواصفات والنطاق الفني */}
              <Card className="border border-border/70 shadow-xs rounded-3xl bg-background">
                <CardHeader className="pb-3 border-b border-border/50">
                  <CardTitle className="text-base font-bold flex items-center gap-2">
                    <Ruler className="w-4 h-4 text-primary" />
                    <span>المواصفات الفنية للطلب</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-5 space-y-3.5 text-xs sm:text-sm">
                  {(request.mosque?.area || programData.mosqueArea) && (
                    <div className="flex justify-between items-center py-1.5 border-b border-border/40">
                      <span className="text-muted-foreground font-medium">مساحة المسجد:</span>
                      <span className="font-bold text-foreground">
                        {request.mosque?.area || programData.mosqueArea} م²
                      </span>
                    </div>
                  )}

                  {(request.mosque?.capacity || programData.actualWorshippers) && (
                    <div className="flex justify-between items-center py-1.5 border-b border-border/40">
                      <span className="text-muted-foreground font-medium">سعة المصلين:</span>
                      <span className="font-bold text-foreground">
                        {request.mosque?.capacity || programData.actualWorshippers} مصلي
                      </span>
                    </div>
                  )}

                  {programData.hasPrayerHall !== undefined && (
                    <div className="flex justify-between items-center py-1.5 border-b border-border/40">
                      <span className="text-muted-foreground font-medium">مصلى النساء:</span>
                      <span className="font-bold text-foreground">
                        {programData.hasPrayerHall
                          ? `متوفر (السعة: ${programData.womenPrayerCapacity || "—"} | المساحة: ${programData.womenPrayerArea || "—"} م²)`
                          : "غير متوفر"}
                      </span>
                    </div>
                  )}

                  {programData.landOwnership && (
                    <div className="flex justify-between items-center py-1.5 border-b border-border/40">
                      <span className="text-muted-foreground font-medium">ملكية الأرض:</span>
                      <span className="font-bold text-foreground">
                        {programData.landOwnership === "private"
                          ? "ملك خاص"
                          : programData.landOwnership === "waqf"
                          ? "وقف"
                          : programData.landOwnership === "government"
                          ? "حكومي"
                          : programData.landOwnership}
                      </span>
                    </div>
                  )}

                  {programData.hasDonor !== undefined && (
                    <div className="flex justify-between items-center py-1.5">
                      <span className="text-muted-foreground font-medium">توفر متبرع / داعم:</span>
                      <span className="font-bold text-foreground">
                        {programData.hasDonor === "yes" ? "نعم، يوجد متبرع" : "لا يوجد"}
                      </span>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* بطاقة وصف الأعمال والتفاصيل المطلوبة */}
            <Card className="border border-border/70 shadow-xs rounded-3xl bg-background">
              <CardHeader className="pb-3 border-b border-border/50">
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <FileText className="w-4 h-4 text-primary" />
                  <span>وصف الأعمال ونطاق الخدمة المطلوبة</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-5 sm:p-6">
                <p className="text-xs sm:text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                  {request.description || programData.workDescription || "لا يوجد وصف مدخل."}
                </p>

                {programData.fundingProposals && (
                  <div className="mt-4 pt-4 border-t border-border/40">
                    <p className="text-xs font-bold text-muted-foreground mb-1">مقترحات التمويل والمساندة:</p>
                    <p className="text-xs sm:text-sm text-foreground leading-relaxed">
                      {programData.fundingProposals}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* تبويب 2: المرفقات */}
          <TabsContent value="attachments" className="space-y-4">
            <Card className="border border-border/70 shadow-xs rounded-3xl bg-background">
              <CardHeader className="pb-3 border-b border-border/50">
                <CardTitle className="text-base font-bold">المرفقات والوثائق المرفوعة</CardTitle>
                <CardDescription className="text-xs">المستندات والصور التي تم إرفاقها مع الطلب</CardDescription>
              </CardHeader>
              <CardContent className="p-5 sm:p-6">
                {attachments && attachments.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {attachments.map((att: any) => (
                      <div
                        key={att.id}
                        className="p-4 rounded-2xl border border-border/70 bg-muted/20 hover:bg-muted/40 transition-all flex flex-col justify-between gap-3"
                      >
                        <div className="flex items-start gap-3 min-w-0">
                          <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                            <Paperclip className="w-5 h-5" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="font-bold text-xs sm:text-sm text-foreground truncate" title={att.fileName || att.name}>
                              {att.fileName || att.name || "مرفق"}
                            </p>
                            <p className="text-[11px] text-muted-foreground mt-0.5">
                              {att.fileSize ? `${(att.fileSize / (1024 * 1024)).toFixed(2)} MB` : "ملف مرفق"}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 pt-2 border-t border-border/40">
                          {att.fileUrl && (
                            <a
                              href={att.fileUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="flex-1"
                            >
                              <Button variant="outline" size="sm" className="w-full text-xs font-bold rounded-xl h-8 gap-1">
                                <Eye className="w-3.5 h-3.5" />
                                <span>معاينة</span>
                              </Button>
                            </a>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-10">
                    <Paperclip className="w-10 h-10 text-muted-foreground/40 mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground font-medium">لا توجد مرفقات مرتبطة بهذا الطلب.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* تبويب 3: المراسلات والاستفسارات */}
          <TabsContent value="comments" className="space-y-6">
            <Card className="border border-border/70 shadow-xs rounded-3xl bg-background">
              <CardHeader className="pb-3 border-b border-border/50">
                <CardTitle className="text-base font-bold">المراسلات مع فريق الجمعية</CardTitle>
                <CardDescription className="text-xs">
                  يمكنك إرسال أي استفسار أو ملاحظة بخصوص هذا الطلب وسيتم الرد عليك مباشرة
                </CardDescription>
              </CardHeader>
              <CardContent className="p-5 sm:p-6 space-y-6">
                {/* صندوق إضافة رسالة */}
                <div className="space-y-3 bg-muted/20 p-4 rounded-2xl border border-border/70">
                  <Textarea
                    placeholder="اكتب استفسارك أو ملاحظتك هنا..."
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    rows={3}
                    className="rounded-xl resize-none text-xs sm:text-sm bg-background"
                  />
                  <div className="flex justify-end">
                    <Button
                      onClick={() => {
                        if (!comment.trim()) return;
                        addCommentMutation.mutate({
                          requestId: request.id,
                          content: comment,
                          isInternal: false,
                        });
                      }}
                      disabled={addCommentMutation.isPending || !comment.trim()}
                      className="rounded-xl font-bold text-xs gap-1.5 gradient-primary text-white h-9 px-5"
                    >
                      {addCommentMutation.isPending ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Send className="w-3.5 h-3.5" />
                      )}
                      <span>إرسال الاستفسار</span>
                    </Button>
                  </div>
                </div>

                {/* قائمة الرسائل المتبادلة */}
                <div className="space-y-3">
                  {request.comments && request.comments.length > 0 ? (
                    request.comments.map((c: any) => (
                      <div
                        key={c.id}
                        className="p-4 rounded-2xl border border-border/60 bg-background space-y-1.5"
                      >
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-foreground">{c.userName || "فريق خدمة المساجد"}</span>
                          <span className="text-muted-foreground font-mono text-[11px]">
                            {new Date(c.createdAt).toLocaleDateString("ar-SA")} -{" "}
                            {new Date(c.createdAt).toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit" })}
                          </span>
                        </div>
                        <p className="text-xs sm:text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                          {c.content}
                        </p>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8">
                      <MessageSquare className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
                      <p className="text-xs text-muted-foreground">لا توجد مراسلات سابقة على هذا الطلب حتى الآن.</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* تقرير الطباعة الرسمي A4 في حالة الضغط على أمر الطباعة */}
      <div className="hidden print:block printable-report-container w-full max-w-[210mm] mx-auto p-0 bg-white font-sans text-slate-900" dir="rtl">
        <div className="flex justify-between items-center pb-3 mb-4 border-b border-slate-300">
          <div className="flex items-center gap-3">
            {orgSettings?.logoUrl ? (
              <img src={orgSettings.logoUrl} alt="شعار الجمعية" className="h-14 w-auto object-contain" />
            ) : (
              <div className="w-12 h-12 bg-emerald-50 rounded-lg flex items-center justify-center border border-emerald-200">
                <span className="text-[#1a5f4a] font-bold text-lg">منارة</span>
              </div>
            )}
            <div>
              <h2 className="text-base font-extrabold text-[#1a5f4a]">
                {orgSettings?.officialReportsName || "جمعية عمارة المساجد (منارة)"}
              </h2>
            </div>
          </div>

          <div className="text-xs space-y-1 text-left pl-1">
            <div className="flex items-center justify-end gap-2">
              <span className="font-bold text-slate-600">التاريخ:</span>
              <span className="font-bold text-slate-900">{new Date(request.createdAt).toLocaleDateString("ar-SA")}</span>
            </div>
          </div>
        </div>

        <div className="text-center py-2.5 px-4 mb-4 rounded-lg bg-[#1a5f4a] text-white">
          <h1 className="text-base font-bold">
            استمارة طلب خدمة: {request.programName || PROGRAM_LABELS[request.programType] || "خدمة مساجد"} (رقم {request.requestNumber})
          </h1>
        </div>

        {/* أولاً: بيانات مقدم الطلب */}
        <div className="mb-4 border border-slate-300 rounded-lg overflow-hidden bg-white">
          <div className="bg-slate-100/90 px-3 py-1.5 font-bold text-xs text-[#1a5f4a] border-b border-slate-300">
            أولاً: بيانات مقدم الطلب
          </div>
          <table className="w-full text-xs border-collapse">
            <tbody>
              <tr className="border-b border-slate-200">
                <td className="p-2.5 bg-slate-50 font-bold text-slate-600 w-1/4 border-l border-slate-200">الاسم الكامل:</td>
                <td className="p-2.5 font-bold text-slate-900 w-1/4 border-l border-slate-200">{request.user?.name || "—"}</td>
                <td className="p-2.5 bg-slate-50 font-bold text-slate-600 w-1/4 border-l border-slate-200">الصفة / نوع الحساب:</td>
                <td className="p-2.5 text-slate-900 w-1/4">طالب خدمة مساجد</td>
              </tr>
              <tr>
                <td className="p-2.5 bg-slate-50 font-bold text-slate-600 border-l border-slate-200">البريد الإلكتروني:</td>
                <td className="p-2.5 text-slate-900 border-l border-slate-200">{request.user?.email || "—"}</td>
                <td className="p-2.5 bg-slate-50 font-bold text-slate-600 border-l border-slate-200">رقم الجوال:</td>
                <td className="p-2.5 text-slate-900" dir="ltr" style={{ textAlign: "right" }}>{request.user?.phone || "—"}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* ثانياً: بيانات المسجد والموقع */}
        <div className="mb-4 border border-slate-300 rounded-lg overflow-hidden bg-white">
          <div className="bg-slate-100/90 px-3 py-1.5 font-bold text-xs text-[#1a5f4a] border-b border-slate-300">
            ثانياً: بيانات المسجد والموقع
          </div>
          <table className="w-full text-xs border-collapse">
            <tbody>
              <tr>
                <td className="p-2.5 bg-slate-50 font-bold text-slate-600 w-1/4 border-l border-slate-200">اسم المسجد:</td>
                <td className="p-2.5 font-bold text-slate-900 w-1/4 border-l border-slate-200">
                  {request.mosque?.name || programData.customMosqueName || "—"}
                </td>
                <td className="p-2.5 bg-slate-50 font-bold text-slate-600 w-1/4 border-l border-slate-200">المدينة / المنطقة:</td>
                <td className="p-2.5 text-slate-900 w-1/4">
                  {request.mosque?.city || programData.customMosqueCity || orgSettings?.city || "—"}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* ثالثاً: تفاصيل ونطاق الطلب */}
        <div className="mb-4 border border-slate-300 rounded-lg overflow-hidden bg-white">
          <div className="bg-slate-100/90 px-3 py-1.5 font-bold text-xs text-[#1a5f4a] border-b border-slate-300">
            ثانياً: تفاصيل ونطاق الطلب
          </div>
          <table className="w-full text-xs border-collapse">
            <tbody>
              <tr className="border-b border-slate-200">
                <td className="p-2.5 bg-slate-50 font-bold text-slate-600 w-1/3 border-l border-slate-200 align-top">وصف الأعمال:</td>
                <td className="p-2.5 text-slate-900 whitespace-pre-wrap leading-relaxed">
                  {request.description || programData.workDescription || "—"}
                </td>
              </tr>
              {programData.hasPrayerHall !== undefined && (
                <tr className="border-b border-slate-200">
                  <td className="p-2.5 bg-slate-50 font-bold text-slate-600 w-1/3 border-l border-slate-200">مصلى النساء:</td>
                  <td className="p-2.5 text-slate-900">
                    {programData.hasPrayerHall
                      ? `يتضمن مصلى للنساء (السعة: ${programData.womenPrayerCapacity || "—"} مصلي | المساحة: ${programData.womenPrayerArea || "—"} م²)`
                      : "لا يتضمن مصلى للنساء"}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <style>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 10mm 8mm !important;
          }
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            box-sizing: border-box !important;
            font-family: 'Cairo', system-ui, -apple-system, sans-serif !important;
          }
          html, body {
            background-color: white !important;
            color: #0f172a !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          .print\\:hidden, header, nav, aside, footer {
            display: none !important;
          }
          .printable-report-container {
            display: block !important;
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
          }
          tr, .break-inside-avoid {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
        }
      `}</style>
    </BeneficiaryLayout>
  );
}
