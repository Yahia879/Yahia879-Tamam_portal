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
} from "lucide-react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { PROGRAM_LABELS } from "@shared/constants";
import { ProgramIcon } from "@/components/ProgramIcon";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import BeneficiaryLayout from "@/components/BeneficiaryLayout";

// حساب نسبة التقدم بناءً على المرحلة
const getProgressPercentage = (stage: string): number => {
  const stageProgress: Record<string, number> = {
    submitted: 15,
    initial_review: 30,
    field_visit: 45,
    technical_eval: 60,
    financial_eval_and_approval: 75,
    execution: 90,
    closed: 100,
  };
  return stageProgress[stage] || 15;
};

const getStageLabelAr = (stage: string): string => {
  const stageLabels: Record<string, string> = {
    submitted: "تم تقديم الطلب",
    initial_review: "الفرز والأولي",
    field_visit: "الزيارة الميدانية",
    technical_eval: "الدراسة الفنية",
    financial_eval_and_approval: "الاعتماد المالي",
    execution: "مرحلة التنفيذ",
    closed: "تم إغلاق الطلب",
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
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-l from-primary/95 via-primary to-emerald-900 text-white p-6 sm:p-8 lg:p-10 mb-8 shadow-xl">
        <div className="absolute -right-12 -top-12 w-64 h-64 rounded-full bg-white/10 blur-2xl pointer-events-none" />
        <div className="absolute -left-12 -bottom-12 w-64 h-64 rounded-full bg-emerald-400/20 blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight">
              أهلاً بك، {user?.name} 👋
            </h1>
            <p className="text-white/85 text-xs sm:text-base leading-relaxed font-normal">
              يسعدنا خدمتك في بوابة منارة لتطوير ورعاية بيوت الله. يمكنك من هنا متابعة طلباتك وتسجيل المساجد بكل سهولة.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto shrink-0">
            <Link href="/request-form-dynamic" className="w-full sm:w-auto">
              <Button size="lg" className="w-full sm:w-auto rounded-2xl bg-white text-primary hover:bg-white/95 font-bold shadow-lg gap-2 h-12">
                <Plus className="w-5 h-5" />
                <span>تقديم طلب جديد</span>
              </Button>
            </Link>
            <Link href="/requester/mosques/new" className="w-full sm:w-auto">
              <Button size="lg" variant="outline" className="w-full sm:w-auto rounded-2xl border-white/40 bg-white/10 text-white hover:bg-white/20 font-bold backdrop-blur-md gap-2 h-12">
                <Building2 className="w-5 h-5" />
                <span>تسجيل مسجد</span>
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* تنبيه مراجعة الحساب إن كان قيد الانتظار */}
      {user?.status === "pending" && (
        <div className="mb-8 dir-rtl">
          <Alert className="border-amber-200 bg-amber-50/80 dark:bg-amber-950/30 dark:border-amber-900/40 text-amber-900 dark:text-amber-200 rounded-2xl p-4 shadow-xs flex items-start gap-4">
            <Clock className="w-6 h-6 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <AlertTitle className="font-bold text-base">حسابك قيد المراجعة حالياً</AlertTitle>
              <AlertDescription className="text-xs sm:text-sm leading-relaxed">
                طلب تسجيل حسابك قيد التدقيق والمراجعة من قبل فريق الجمعية. يمكنك استعراض المنصة، وسنخطرك فور تفعيل كافة الصلاحيات.
              </AlertDescription>
            </div>
          </Alert>
        </div>
      )}

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-8">
        <Link href="/my-requests">
          <Card className="border border-border/60 shadow-xs hover:shadow-md transition-all rounded-2xl cursor-pointer group bg-background">
            <CardContent className="p-4 sm:p-5 flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground">إجمالي الطلبات</p>
                <p className="text-2xl sm:text-3xl font-extrabold text-foreground mt-1">
                  {stats.total}
                </p>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                <FileText className="w-6 h-6" />
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/my-requests">
          <Card className="border border-border/60 shadow-xs hover:shadow-md transition-all rounded-2xl cursor-pointer group bg-background">
            <CardContent className="p-4 sm:p-5 flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground">قيد المراجعة</p>
                <p className="text-2xl sm:text-3xl font-extrabold text-amber-600 mt-1">
                  {stats.pending}
                </p>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-600 group-hover:scale-110 transition-transform">
                <Clock className="w-6 h-6" />
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/my-requests">
          <Card className="border border-border/60 shadow-xs hover:shadow-md transition-all rounded-2xl cursor-pointer group bg-background">
            <CardContent className="p-4 sm:p-5 flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground">قيد التنفيذ</p>
                <p className="text-2xl sm:text-3xl font-extrabold text-blue-600 mt-1">
                  {stats.inProgress}
                </p>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-600 group-hover:scale-110 transition-transform">
                <TrendingUp className="w-6 h-6" />
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/my-requests">
          <Card className="border border-border/60 shadow-xs hover:shadow-md transition-all rounded-2xl cursor-pointer group bg-background">
            <CardContent className="p-4 sm:p-5 flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground">مكتملة بنجاح</p>
                <p className="text-2xl sm:text-3xl font-extrabold text-emerald-600 mt-1">
                  {stats.completed}
                </p>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-600 group-hover:scale-110 transition-transform">
                <CheckCircle2 className="w-6 h-6" />
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Main Content Sections Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Active Requests Progress Timeline */}
        <Card className="lg:col-span-2 border border-border/60 shadow-xs rounded-3xl overflow-hidden bg-background">
          <CardHeader className="p-5 sm:p-6 border-b border-border/40">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-lg sm:text-xl font-bold">
                  <FileText className="w-5 h-5 text-primary" />
                  <span>أحدث الطلبات وتطور الإنجاز</span>
                </CardTitle>
                <CardDescription className="text-xs mt-0.5">
                  متابعة خط سير وحالة خدماتك المقدمة
                </CardDescription>
              </div>
              <Link href="/my-requests">
                <Button variant="ghost" size="sm" className="rounded-xl text-xs gap-1 font-semibold">
                  <span>سجل الطلبات الكامل</span>
                  <ChevronLeft className="w-4 h-4" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent className="p-5 sm:p-6">
            {isLoadingRequests ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-24 bg-muted/60 animate-pulse rounded-2xl" />
                ))}
              </div>
            ) : myRequests && myRequests.length > 0 ? (
              <div className="space-y-4">
                {myRequests.slice(0, 4).map((request) => {
                  const progress = getProgressPercentage(request.currentStage);
                  const stageLabel = getStageLabelAr(request.currentStage);
                  const isClosed = request.currentStage === "closed" || request.status === "completed";

                  return (
                    <div key={request.id} className="p-4 sm:p-5 rounded-2xl bg-muted/40 hover:bg-muted/70 transition-all border border-border/40 hover:border-primary/30 group">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                        <Link href={`/requests/${request.id}`} className="flex items-center gap-3 min-w-0 cursor-pointer flex-1">
                          <ProgramIcon program={request.programType} size="md" showBackground />
                          <div className="min-w-0">
                            <h4 className="font-bold text-sm sm:text-base text-foreground truncate group-hover:text-primary transition-colors">
                              {request.programName || PROGRAM_LABELS[request.programType] || request.programType}
                            </h4>
                            <p className="text-xs text-muted-foreground font-mono mt-0.5">
                              {request.requestNumber} • {request.mosqueName || "المسجد المحدد"}
                            </p>
                          </div>
                        </Link>
                        <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                          {isClosed && (
                            (request as any).isEvaluated ? (
                              <Badge variant="outline" className="border-emerald-500/40 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 font-bold text-[11px] gap-1 px-2.5 py-1">
                                <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                                <span>تم التقييم ({(request as any).satisfactionRating || 5}/5)</span>
                              </Badge>
                            ) : (
                              <Link href={`/requests/${request.id}/evaluation`}>
                                <Button
                                  size="sm"
                                  className="bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold px-3 py-1.5 rounded-lg shadow-sm gap-1.5 transition-all hover:scale-105"
                                >
                                  <Star className="w-3.5 h-3.5 fill-white" />
                                  <span>قيّم الخدمة</span>
                                </Button>
                              </Link>
                            )
                          )}
                          <Badge variant="outline" className="rounded-xl bg-background font-semibold text-xs border-primary/20 text-primary">
                            {stageLabel}
                          </Badge>
                          <span className="text-sm font-extrabold text-primary">{progress}%</span>
                        </div>
                      </div>

                      {/* Progress Stepper Line */}
                      <div className="space-y-1.5 mt-2">
                        <Progress value={progress} className="h-2 rounded-full" />
                        <div className="flex justify-between text-[11px] text-muted-foreground font-medium">
                          <span>تقديم الطلب</span>
                          <span>{progress === 100 ? "مكتمل" : "جاري المعالجة..."}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-12 px-4">
                <div className="w-16 h-16 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto mb-4">
                  <FileText className="w-8 h-8" />
                </div>
                <h3 className="font-bold text-base text-foreground mb-1">لا توجد طلبات سابقة</h3>
                <p className="text-xs text-muted-foreground mb-6 max-w-sm mx-auto">
                  لم تقم بتقديم أي طلب خدمة حتى الآن. يمكنك تقديم طلب جديد لمسجدك بضغط زر واحدة.
                </p>
                <Link href="/request-form-dynamic">
                  <Button className="gradient-primary text-white font-bold rounded-2xl shadow-md gap-2 px-6">
                    <Plus className="w-4 h-4" />
                    <span>تقديم طلب خدمة</span>
                  </Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Side Panel: Registered Mosques & Quick Notifications */}
        <div className="space-y-8">
          {/* Registered Mosques Overview Card */}
          <Card className="border border-border/60 shadow-xs rounded-3xl overflow-hidden bg-background">
            <CardHeader className="p-5 border-b border-border/40">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg font-bold">
                  <Building2 className="w-5 h-5 text-primary" />
                  <span>مساجدي المسجلة</span>
                </CardTitle>
                <Link href="/my-mosques">
                  <Button variant="ghost" size="sm" className="rounded-xl text-xs font-semibold">
                    <span>الكل</span>
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent className="p-5">
              {isLoadingMosques ? (
                <div className="space-y-3">
                  {[1, 2].map((i) => (
                    <div key={i} className="h-16 bg-muted/60 animate-pulse rounded-2xl" />
                  ))}
                </div>
              ) : myMosques && myMosques.length > 0 ? (
                <div className="space-y-3">
                  {myMosques.slice(0, 3).map((mosque) => (
                    <Link key={mosque.id} href={`/mosques/${mosque.id}`}>
                      <div className="p-3.5 rounded-2xl bg-muted/30 hover:bg-muted/60 transition-all cursor-pointer border border-border/40 flex items-center justify-between gap-3 group">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                            <Building2 className="w-5 h-5" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold text-xs sm:text-sm text-foreground truncate group-hover:text-primary transition-colors">
                              {mosque.name}
                            </p>
                            <p className="text-[11px] text-muted-foreground truncate">
                              {mosque.city || "أبها"}
                            </p>
                          </div>
                        </div>
                        <Badge
                          variant={mosque.approvalStatus === "approved" ? "default" : "secondary"}
                          className="rounded-lg text-[10px] px-2 py-0.5 shrink-0"
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
                    <Button variant="outline" className="w-full rounded-2xl text-xs font-semibold gap-2 border-dashed">
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
                    <Button variant="outline" size="sm" className="rounded-xl text-xs font-bold gap-1">
                      <Plus className="w-3.5 h-3.5" />
                      <span>تسجيل مسجد</span>
                    </Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Notifications Widget */}
          <Card className="border border-border/60 shadow-xs rounded-3xl overflow-hidden bg-background">
            <CardHeader className="p-5 border-b border-border/40">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg font-bold">
                  <Bell className="w-5 h-5 text-primary" />
                  <span>التحديثات والإشعارات</span>
                </CardTitle>
                <Link href="/notifications">
                  <Button variant="ghost" size="sm" className="rounded-xl text-xs font-semibold">
                    <span>عرض الكل</span>
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent className="p-5">
              {notificationsData?.notifications && notificationsData.notifications.length > 0 ? (
                <div className="space-y-3">
                  {notificationsData.notifications.slice(0, 3).map((notif: any) => (
                    <div
                      key={notif.id}
                      className={`p-3 rounded-2xl text-xs transition-all ${
                        notif.isRead
                          ? "bg-muted/30 border border-transparent"
                          : "bg-primary/5 border border-primary/20 font-medium"
                      }`}
                    >
                      <p className="font-bold text-foreground line-clamp-1">{notif.title}</p>
                      <p className="text-muted-foreground text-[11px] line-clamp-2 mt-1">{notif.message}</p>
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
