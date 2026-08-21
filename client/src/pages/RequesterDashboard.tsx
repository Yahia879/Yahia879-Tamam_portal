import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Building2, 
  FileText, 
  Plus,
  Clock,
  CheckCircle2,
  ChevronLeft,
  Bell,
  Star,
  TrendingUp,
  Eye,
  XCircle,
  AlertCircle,
} from "lucide-react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { PROGRAM_LABELS } from "@shared/constants";
import { ProgramIcon } from "@/components/ProgramIcon";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import BeneficiaryLayout from "@/components/BeneficiaryLayout";

// حساب نسبة التقدم بناءً على المراحل العشر (زيادة 10% في كل مرحلة)
const getProgressPercentage = (stage: string): number => {
  const stageProgress: Record<string, number> = {
    submitted: 10,
    initial_review: 20,
    field_visit: 30,
    technical_eval: 40,
    boq_preparation: 50,
    financial_eval: 60,
    financial_eval_and_approval: 60,
    quotation_approval: 65,
    contracting: 70,
    execution: 80,
    handover: 90,
    closed: 100,
  };
  return stageProgress[stage] || 10;
};

const getStageLabelAr = (stage: string): string => {
  const stageLabels: Record<string, string> = {
    submitted: "تقديم الطلب",
    initial_review: "المراجعة الأولية",
    field_visit: "الزيارة الميدانية",
    technical_eval: "التقييم والدراسة الفنية",
    boq_preparation: "إعداد جدول الكميات",
    financial_eval: "التقييم المالي",
    financial_eval_and_approval: "الاعتماد المالي",
    quotation_approval: "اعتماد العرض",
    contracting: "مرحلة التعاقد",
    execution: "مرحلة التنفيذ",
    handover: "مرحلة الاستلام",
    closed: "مكتمل ومغلق",
  };
  return stageLabels[stage] || "قيد المعالجة";
};

export default function RequesterDashboard() {
  const { user } = useAuth();
  
  // جلب طلبات المستخدم
  const { data: myRequestsData, isLoading: isLoadingRequests } = trpc.requests.getMyRequests.useQuery();
  // جلب مساجد المستخدم
  const { data: myMosques, isLoading: isLoadingMosques } = trpc.mosques.getMyMosques.useQuery();
  // جلب الإشعارات
  const { data: notificationsData } = trpc.notifications.getMyNotifications.useQuery({ limit: 5 });

  const myRequests = Array.isArray(myRequestsData)
    ? myRequestsData
    : (Array.isArray(myRequestsData?.requests) ? myRequestsData.requests : []);
  const stats = myRequestsData?.stats || {
    total: myRequests.length,
    pending: myRequests.filter((r: any) => r.status === "pending" || r.status === "under_review").length,
    inProgress: myRequests.filter((r: any) => r.status === "in_progress").length,
    completed: myRequests.filter((r: any) => r.status === "completed" || r.currentStage === "closed").length,
  };

  return (
    <BeneficiaryLayout activeTab="dashboard">
      {/* Hero Welcome Banner */}
      <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-l from-primary/95 via-primary to-emerald-900 dark:from-teal-800/90 dark:via-emerald-800/80 dark:to-slate-800/90 text-white p-5 sm:p-8 lg:p-10 mb-6 sm:mb-8 shadow-xl border border-white/10 dark:border-teal-700/40">
        <div className="absolute -right-12 -top-12 w-64 h-64 rounded-full bg-white/10 blur-2xl pointer-events-none" />
        <div className="absolute -left-12 -bottom-12 w-64 h-64 rounded-full bg-emerald-400/20 blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-5 sm:gap-6">
          <div className="space-y-1.5 sm:space-y-2 max-w-2xl">
            <h1 className="text-xl sm:text-3xl lg:text-4xl font-black tracking-tight text-white">
              أهلاً بك، {user?.name} 👋
            </h1>
            <p className="text-white/85 text-xs sm:text-sm lg:text-base leading-relaxed font-normal">
              يسعدنا خدمتك في بوابة منارة لتطوير ورعاية بيوت الله. يمكنك من هنا متابعة طلباتك وتسجيل المساجد بكل سهولة.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3 w-full md:w-auto shrink-0 pt-2 sm:pt-0">
            <Link href="/request-form-dynamic" className="w-full">
              <Button size="lg" className="w-full rounded-xl sm:rounded-2xl bg-white dark:bg-slate-100 text-emerald-950 hover:bg-white/95 dark:hover:bg-white font-extrabold shadow-lg gap-2 h-11 sm:h-12 text-xs sm:text-sm cursor-pointer">
                <Plus className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                <span>تقديم طلب جديد</span>
              </Button>
            </Link>
            <Link href="/requester/mosques/new" className="w-full">
              <Button size="lg" variant="outline" className="w-full rounded-xl sm:rounded-2xl border-white/40 dark:border-white/30 bg-white/10 text-white hover:bg-white/20 font-bold backdrop-blur-md gap-2 h-11 sm:h-12 text-xs sm:text-sm cursor-pointer">
                <Building2 className="w-4 h-4 sm:w-5 sm:h-5" />
                <span>تسجيل مسجد</span>
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* تنبيه مراجعة الحساب إن كان قيد الانتظار */}
      {user?.status === "pending" && (
        <div className="mb-6 sm:mb-8 dir-rtl">
          <Alert className="border-amber-200 bg-amber-50/80 dark:bg-amber-950/40 dark:border-amber-900/50 text-amber-900 dark:text-amber-200 rounded-2xl p-4 shadow-xs flex items-start gap-3 sm:gap-4">
            <Clock className="w-5 h-5 sm:w-6 sm:h-6 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <AlertTitle className="font-bold text-sm sm:text-base text-amber-900 dark:text-amber-200">حسابك قيد المراجعة حالياً</AlertTitle>
              <AlertDescription className="text-xs sm:text-sm leading-relaxed text-amber-800/90 dark:text-amber-300/80">
                طلب تسجيل حسابك قيد التدقيق والمراجعة من قبل فريق الجمعية. يمكنك استعراض المنصة، وسنخطرك فور تفعيل كافة الصلاحيات.
              </AlertDescription>
            </div>
          </Alert>
        </div>
      )}

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6 mb-6 sm:mb-8">
        <Link href="/my-requests">
          <Card className="border border-border/60 dark:border-border/80 shadow-xs hover:shadow-md transition-all rounded-xl sm:rounded-2xl cursor-pointer group bg-card dark:bg-card/95 hover:border-primary/40 dark:hover:border-primary/40">
            <CardContent className="p-3 sm:p-5 flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-[11px] sm:text-xs font-medium text-muted-foreground truncate">إجمالي الطلبات</p>
                <p className="text-xl sm:text-3xl font-extrabold text-foreground mt-0.5 sm:mt-1">
                  {stats.total}
                </p>
              </div>
              <div className="w-9 h-9 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-primary/10 dark:bg-primary/20 flex items-center justify-center text-primary shrink-0 group-hover:scale-110 transition-transform">
                <FileText className="w-4 h-4 sm:w-6 sm:h-6" />
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/my-requests">
          <Card className="border border-border/60 dark:border-border/80 shadow-xs hover:shadow-md transition-all rounded-xl sm:rounded-2xl cursor-pointer group bg-card dark:bg-card/95 hover:border-amber-500/40 dark:hover:border-amber-500/40">
            <CardContent className="p-3 sm:p-5 flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-[11px] sm:text-xs font-medium text-muted-foreground truncate">قيد المراجعة</p>
                <p className="text-xl sm:text-3xl font-extrabold text-amber-600 dark:text-amber-400 mt-0.5 sm:mt-1">
                  {stats.pending}
                </p>
              </div>
              <div className="w-9 h-9 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-amber-500/10 dark:bg-amber-500/20 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0 group-hover:scale-110 transition-transform">
                <Clock className="w-4 h-4 sm:w-6 sm:h-6" />
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/my-requests">
          <Card className="border border-border/60 dark:border-border/80 shadow-xs hover:shadow-md transition-all rounded-xl sm:rounded-2xl cursor-pointer group bg-card dark:bg-card/95 hover:border-blue-500/40 dark:hover:border-blue-500/40">
            <CardContent className="p-3 sm:p-5 flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-[11px] sm:text-xs font-medium text-muted-foreground truncate">قيد التنفيذ</p>
                <p className="text-xl sm:text-3xl font-extrabold text-blue-600 dark:text-blue-400 mt-0.5 sm:mt-1">
                  {stats.inProgress}
                </p>
              </div>
              <div className="w-9 h-9 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-blue-500/10 dark:bg-blue-500/20 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0 group-hover:scale-110 transition-transform">
                <TrendingUp className="w-4 h-4 sm:w-6 sm:h-6" />
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/my-requests">
          <Card className="border border-border/60 dark:border-border/80 shadow-xs hover:shadow-md transition-all rounded-xl sm:rounded-2xl cursor-pointer group bg-card dark:bg-card/95 hover:border-emerald-500/40 dark:hover:border-emerald-500/40">
            <CardContent className="p-3 sm:p-5 flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-[11px] sm:text-xs font-medium text-muted-foreground truncate">مكتملة بنجاح</p>
                <p className="text-xl sm:text-3xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-0.5 sm:mt-1">
                  {stats.completed}
                </p>
              </div>
              <div className="w-9 h-9 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-emerald-500/10 dark:bg-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0 group-hover:scale-110 transition-transform">
                <CheckCircle2 className="w-4 h-4 sm:w-6 sm:h-6" />
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Main Content Sections Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
        {/* Active Requests Progress Timeline */}
        <Card className="lg:col-span-2 border border-border/60 dark:border-border/80 shadow-xs rounded-2xl sm:rounded-3xl overflow-hidden bg-card dark:bg-card/95">
          <CardHeader className="p-4 sm:p-6 border-b border-border/40 dark:border-border/60">
            <div className="flex items-center justify-between gap-2">
              <div>
                <CardTitle className="flex items-center gap-2 text-base sm:text-xl font-bold text-foreground">
                  <FileText className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                  <span>أحدث الطلبات وتطور الإنجاز</span>
                </CardTitle>
                <CardDescription className="text-[11px] sm:text-xs mt-0.5 text-muted-foreground">
                  متابعة خط سير وحالة خدماتك المقدمة
                </CardDescription>
              </div>
              <Link href="/my-requests">
                <Button variant="ghost" size="sm" className="rounded-xl text-xs gap-1 font-semibold px-2 sm:px-3 text-muted-foreground hover:text-foreground">
                  <span>سجل الطلبات</span>
                  <ChevronLeft className="w-3.5 h-3.5" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent className="p-4 sm:p-6">
            {isLoadingRequests ? (
              <div className="space-y-3 sm:space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-24 bg-muted/40 animate-pulse rounded-2xl" />
                ))}
              </div>
            ) : myRequests && myRequests.length > 0 ? (
              <div className="space-y-3 sm:space-y-4">
                {myRequests.slice(0, 4).map((request) => {
                  const isRejected = request.status === "rejected" || request.technicalEvalDecision === "apologize" || request.requestTrack === "rejected";
                  const isClosed = !isRejected && (request.currentStage === "closed" || request.status === "completed");
                  const progress = isRejected ? 0 : getProgressPercentage(request.currentStage);
                  const stageLabel = isRejected ? "تم رفض الطلب" : getStageLabelAr(request.currentStage);
                  const rejectionReason = request.technicalEvalJustification || (request as any).rejectionReason || (request as any).reviewNotes;

                  return (
                    <div key={request.id} className={`p-3.5 sm:p-5 rounded-2xl transition-all border group ${
                      isRejected 
                        ? "bg-rose-50/40 dark:bg-rose-950/20 border-rose-200/80 dark:border-rose-900/50 hover:border-rose-300 dark:hover:border-rose-800"
                        : "bg-muted/30 hover:bg-muted/60 dark:bg-muted/20 dark:hover:bg-muted/30 border-border/40 hover:border-primary/30 dark:border-border/60 dark:hover:border-primary/40"
                    }`}>
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                        <Link href={`/requests/${request.id}`} className="flex items-center gap-2.5 sm:gap-3 min-w-0 cursor-pointer flex-1">
                          <ProgramIcon program={request.programType} size="md" showBackground />
                          <div className="min-w-0">
                            <h4 className={`font-bold text-xs sm:text-base truncate transition-colors ${
                              isRejected ? "text-rose-950 dark:text-rose-200 group-hover:text-rose-600 dark:group-hover:text-rose-400" : "text-foreground group-hover:text-primary"
                            }`}>
                              {request.programName || PROGRAM_LABELS[request.programType] || request.programType}
                            </h4>
                            <p className="text-[11px] sm:text-xs text-muted-foreground font-mono mt-0.5 truncate">
                              {request.requestNumber} • {request.programType === "bunyan" ? "غير مرتبط بمسجد (بنيان)" : (request.mosqueName || "المسجد المحدد")}
                            </p>
                          </div>
                        </Link>
                        <div className="flex flex-wrap items-center gap-2 self-start sm:self-center shrink-0">
                          {isRejected ? (
                            <Badge variant="destructive" className="rounded-xl font-bold text-[10px] sm:text-xs bg-rose-600 hover:bg-rose-700 text-white gap-1 px-2 sm:px-2.5 py-0.5 sm:py-1 shadow-xs">
                              <XCircle className="w-3 h-3" />
                              <span>مرفوض</span>
                            </Badge>
                          ) : (
                            <>
                              {isClosed && (
                                (request as any).isEvaluated ? (
                                  <Badge variant="outline" className="border-emerald-500/40 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-bold text-[10px] sm:text-[11px] gap-1 px-2 py-0.5 sm:px-2.5 sm:py-1">
                                    <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                                    <span>تم التقييم ({(request as any).satisfactionRating || 5}/5)</span>
                                  </Badge>
                                ) : (
                                  <Link href={`/requests/${request.id}/evaluation`}>
                                    <Button
                                      size="sm"
                                      className="bg-amber-500 hover:bg-amber-600 dark:bg-amber-600 dark:hover:bg-amber-500 text-white text-[11px] sm:text-xs font-bold px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-lg shadow-sm gap-1 transition-all hover:scale-105 cursor-pointer h-7 sm:h-8"
                                    >
                                      <Star className="w-3 h-3 sm:w-3.5 sm:h-3.5 fill-white" />
                                      <span>قيّم الخدمة</span>
                                    </Button>
                                  </Link>
                                )
                              )}
                              <Badge variant="outline" className="rounded-xl bg-background dark:bg-muted/40 font-semibold text-[11px] sm:text-xs border-primary/20 dark:border-primary/40 text-primary">
                                {stageLabel}
                              </Badge>
                              <span className="text-xs sm:text-sm font-extrabold text-primary">{progress}%</span>
                            </>
                          )}
                          <Link href={`/requests/${request.id}`}>
                            <Button
                              variant="ghost"
                              size="icon"
                              className={`h-7 w-7 sm:h-8 sm:w-8 rounded-xl transition-all cursor-pointer shrink-0 ${
                                isRejected 
                                  ? "hover:bg-rose-100 dark:hover:bg-rose-900/40 text-rose-600 hover:text-rose-700 dark:text-rose-400" 
                                  : "hover:bg-primary/10 dark:hover:bg-primary/20 text-primary hover:text-primary"
                              }`}
                              title="عرض تفاصيل الطلب"
                            >
                              <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
                            </Button>
                          </Link>
                        </div>
                      </div>

                      {/* Progress Stepper Line or Rejection Notice */}
                      {isRejected ? (
                        <div className="space-y-2 mt-2 pt-2 border-t border-rose-200/60 dark:border-rose-900/40">
                          <div className="flex items-center justify-between text-[11px] text-rose-700 dark:text-rose-300 font-semibold">
                            <span className="flex items-center gap-1">
                              <XCircle className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
                              <span>حالة الطلب: تم الاعتذار والرفض</span>
                            </span>
                            <span className="font-mono text-rose-600 dark:text-rose-400 font-bold">مرفوض</span>
                          </div>
                          {rejectionReason && (
                            <div className="p-2.5 rounded-xl bg-rose-100/80 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900/50 text-[11px] sm:text-xs text-rose-900 dark:text-rose-200 flex items-start gap-2">
                              <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                              <div className="min-w-0 flex-1 leading-relaxed">
                                <span className="font-bold">مبررات الرفض: </span>
                                <span className="font-medium">{rejectionReason}</span>
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="space-y-1.5 mt-2">
                          <Progress value={progress} className="h-1.5 sm:h-2 rounded-full dark:bg-muted/60" />
                          <div className="flex justify-between text-[10px] sm:text-[11px] text-muted-foreground font-medium">
                            <span>تقديم الطلب</span>
                            <span>{progress === 100 ? "مكتمل" : "جاري المعالجة..."}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-12 px-4">
                <div className="w-16 h-16 rounded-full bg-primary/10 dark:bg-primary/20 text-primary flex items-center justify-center mx-auto mb-4">
                  <FileText className="w-8 h-8" />
                </div>
                <h3 className="font-bold text-base text-foreground mb-1">لا توجد طلبات سابقة</h3>
                <p className="text-xs text-muted-foreground mb-6 max-w-sm mx-auto">
                  لم تقم بتقديم أي طلب خدمة حتى الآن. يمكنك تقديم طلب جديد لمسجدك بضغط زر واحدة.
                </p>
                <Link href="/request-form-dynamic">
                  <Button className="gradient-primary text-white font-bold rounded-2xl shadow-md gap-2 px-6 cursor-pointer">
                    <Plus className="w-4 h-4" />
                    <span>تقديم طلب خدمة</span>
                  </Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Side Panel: Registered Mosques & Quick Notifications */}
        <div className="space-y-6 sm:space-y-8">
          {/* Registered Mosques Overview Card */}
          <Card className="border border-border/60 dark:border-border/80 shadow-xs rounded-2xl sm:rounded-3xl overflow-hidden bg-card dark:bg-card/95">
            <CardHeader className="p-4 sm:p-5 border-b border-border/40 dark:border-border/60">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg font-bold text-foreground">
                  <Building2 className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                  <span>مساجدي المسجلة</span>
                </CardTitle>
                <Link href="/my-mosques">
                  <Button variant="ghost" size="sm" className="rounded-xl text-xs font-semibold px-2.5 text-muted-foreground hover:text-foreground">
                    <span>الكل</span>
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent className="p-4 sm:p-5">
              {isLoadingMosques ? (
                <div className="space-y-3">
                  {[1, 2].map((i) => (
                    <div key={i} className="h-16 bg-muted/40 animate-pulse rounded-2xl" />
                  ))}
                </div>
              ) : myMosques && myMosques.length > 0 ? (
                <div className="space-y-3">
                  {myMosques.slice(0, 3).map((mosque) => (
                    <Link key={mosque.id} href={`/mosques/${mosque.id}`}>
                      <div className="p-3 sm:p-3.5 rounded-2xl bg-muted/30 hover:bg-muted/60 dark:bg-muted/20 dark:hover:bg-muted/30 transition-all cursor-pointer border border-border/40 dark:border-border/60 hover:border-primary/30 dark:hover:border-primary/40 flex items-center justify-between gap-3 group">
                        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-primary/10 dark:bg-primary/20 text-primary flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                            <Building2 className="w-4 h-4 sm:w-5 sm:h-5" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold text-xs sm:text-sm text-foreground truncate group-hover:text-primary transition-colors">
                              {mosque.name}
                            </p>
                            <p className="text-[10px] sm:text-[11px] text-muted-foreground truncate">
                              {mosque.city || "أبها"}
                            </p>
                          </div>
                        </div>
                        <Badge
                          variant="outline"
                          className={`rounded-lg text-[10px] px-2 py-0.5 shrink-0 font-bold ${
                            mosque.approvalStatus === "approved"
                              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 dark:border-emerald-500/30"
                              : mosque.approvalStatus === "pending"
                              ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 dark:border-amber-500/30"
                              : "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20 dark:border-rose-500/30"
                          }`}
                        >
                          {mosque.approvalStatus === "approved"
                            ? "معتمد"
                            : mosque.approvalStatus === "pending"
                            ? "قيد المراجعة"
                            : "مرفوض"}
                        </Badge>
                      </div>
                    </Link>
                  ))}

                  <Link href="/requester/mosques/new" className="block pt-2">
                    <Button variant="outline" className="w-full rounded-2xl text-xs font-semibold gap-2 border-dashed border-border/70 dark:border-border/60 hover:bg-muted/40 dark:hover:bg-muted/20 h-10 cursor-pointer text-foreground">
                      <Plus className="w-4 h-4" />
                      <span>إضافة مسجد جديد</span>
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="text-center py-6">
                  <Building2 className="w-10 h-10 text-muted-foreground/50 mx-auto mb-2" />
                  <p className="text-xs text-muted-foreground mb-3">لا توجد مساجد مسجلة بعد</p>
                  <Link href="/requester/mosques/new">
                    <Button variant="outline" size="sm" className="rounded-xl text-xs font-bold gap-1 cursor-pointer">
                      <Plus className="w-3.5 h-3.5" />
                      <span>تسجيل مسجد</span>
                    </Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Notifications Widget */}
          <Card className="border border-border/60 dark:border-border/80 shadow-xs rounded-2xl sm:rounded-3xl overflow-hidden bg-card dark:bg-card/95">
            <CardHeader className="p-4 sm:p-5 border-b border-border/40 dark:border-border/60">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg font-bold text-foreground">
                  <Bell className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                  <span>التحديثات والإشعارات</span>
                </CardTitle>
                <Link href="/notifications">
                  <Button variant="ghost" size="sm" className="rounded-xl text-xs font-semibold px-2.5 text-muted-foreground hover:text-foreground">
                    <span>عرض الكل</span>
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent className="p-4 sm:p-5">
              {notificationsData?.notifications && notificationsData.notifications.length > 0 ? (
                <div className="space-y-2.5 sm:space-y-3">
                  {notificationsData.notifications.slice(0, 3).map((notif: any) => (
                    <div
                      key={notif.id}
                      className={`p-3 rounded-2xl text-xs transition-all ${
                        notif.isRead
                          ? "bg-muted/30 dark:bg-muted/20 border border-transparent hover:border-border/40"
                          : "bg-primary/5 dark:bg-primary/10 border border-primary/20 dark:border-primary/30 font-medium"
                      }`}
                    >
                      <p className="font-bold text-foreground line-clamp-1">{notif.title}</p>
                      <p className="text-muted-foreground text-[10px] sm:text-[11px] line-clamp-2 mt-1">{notif.message}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6">
                  <Bell className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
                  <p className="text-xs text-muted-foreground">لا توجد إشعارات جديدة</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </BeneficiaryLayout>
  );
}
