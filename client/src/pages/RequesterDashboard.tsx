import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Building2, 
  FileText, 
  Plus,
  Clock,
  CheckCircle2,
  AlertCircle,
  ChevronLeft,
  LogOut,
  User,
  Bell,
  Percent,
  ArrowLeft,
  ArrowRight,
  Star,
  Sparkles,
  HeartHandshake,
  Loader2,
} from "lucide-react";
import { Link, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { PROGRAM_LABELS, STAGE_LABELS, STATUS_LABELS } from "@shared/constants";
import { ProgramIcon } from "@/components/ProgramIcon";
import { useTheme } from "@/contexts/ThemeContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { useState } from "react";
import { toast } from "sonner";

const statusColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
  in_progress: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  completed: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  rejected: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
  cancelled: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300",
};

// تسميات التقييم وتعبيرات الرضا
const RATING_LABELS: Record<number, { label: string; description: string; emoji: string; color: string }> = {
  1: { label: "غير راضي جداً", description: "تجربة غير مرضية", emoji: "😞", color: "text-red-500 bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-900/40" },
  2: { label: "غير راضي", description: "هناك ملاحظات على جودة الخدمة", emoji: "🙁", color: "text-amber-600 bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900/40" },
  3: { label: "محايد", description: "الخدمة مقبولة وتحتاج لتحسين", emoji: "😐", color: "text-yellow-600 bg-yellow-50 dark:bg-yellow-950/30 border-yellow-200 dark:border-yellow-900/40" },
  4: { label: "راضي", description: "خدمة ممتازة وتم إنجاز العمل بالشكل المناسب", emoji: "🙂", color: "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900/40" },
  5: { label: "راضي جداً", description: "تجربة استثنائية وجودة عالية تفوق التوقعات", emoji: "😍", color: "text-teal-600 bg-teal-50 dark:bg-teal-950/30 border-teal-200 dark:border-teal-900/40" },
};

// حساب نسبة التقدم بناءً على المرحلة
const getProgressPercentage = (stage: string): number => {
  const stageProgress: Record<string, number> = {
    submitted: 10,
    initial_review: 25,
    field_visit: 40,
    technical_eval: 55,
    financial_eval: 70,
    execution: 85,
    closed: 100,
  };
  return stageProgress[stage] || 0;
};

export default function RequesterDashboard() {
  const { user, logout } = useAuth();
  const [, setLocation] = useLocation();
  const { theme, toggleTheme, switchable } = useTheme();
  
  // حالة نافذة التقييم المنبثقة
  const [evaluatingRequest, setEvaluatingRequest] = useState<any | null>(null);
  const [evalRating, setEvalRating] = useState<number>(5);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [evalNotes, setEvalNotes] = useState<string>("");

  const utils = trpc.useUtils();

  // جلب طلبات المستخدم
  const { data: myRequests, isLoading } = trpc.requests.getMyRequests.useQuery();
  // جلب مساجد المستخدم
  const { data: myMosques } = trpc.mosques.getMyMosques.useQuery();
  // جلب الإشعارات
  const { data: notifications } = trpc.notifications.getMyNotifications.useQuery({ limit: 10 });
  // جلب إعدادات الجمعية (الشعار والاسم)
  const { data: orgSettings } = trpc.organization.getSettings.useQuery();

  // إجراء إرسال التقييم
  const submitEvaluationMutation = trpc.requests.submitBeneficiaryEvaluation.useMutation({
    onSuccess: (res) => {
      toast.success(res.message || "تم استلام تقييمك بنجاح، شكراً لمشاركتك!");
      setEvaluatingRequest(null);
      setEvalNotes("");
      setEvalRating(5);
      utils.requests.getMyRequests.invalidate();
    },
    onError: (err) => {
      toast.error(err.message || "حدث خطأ أثناء إرسال التقييم");
    },
  });

  const mainLogoSrc = orgSettings?.logoUrl || '/logo.svg';
  const orgName = orgSettings?.organizationName || 'بوابة تمام';
  const orgNameShort = orgSettings?.organizationNameShort || 'للعناية بالمساجد';

  const pendingRequests = myRequests?.filter(r => r.status === "pending") || [];
  const inProgressRequests = myRequests?.filter(r => r.status === "in_progress") || [];
  const completedRequests = myRequests?.filter(r => r.status === "completed" || r.currentStage === "closed") || [];
  const unreadNotifications = notifications?.notifications?.filter((n: any) => !n.isRead) || [];

  // تصفية الطلبات المكتملة/المغلقة التي لم يتم تقييمها بعد
  const unEvaluatedClosedRequests = myRequests?.filter(
    (r: any) => (r.currentStage === "closed" || r.status === "completed") && !r.isEvaluated
  ) || [];

  return (
    <div className="min-h-screen bg-background">
      {/* شريط التنقل */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b border-border shadow-sm">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-14 sm:h-16">
            <Link href="/" className="flex items-center gap-2 sm:gap-3 min-w-0">
              <img 
                src={mainLogoSrc} 
                alt="شعار بوابة تمام" 
                className="h-8 w-8 sm:h-10 sm:w-auto shrink-0 object-contain"
              />
              <div className="min-w-0">
                <h1 className="font-bold text-sm sm:text-lg text-foreground truncate">{orgName}</h1>
                <p className="hidden sm:block text-[10px] text-muted-foreground truncate">{orgNameShort}</p>
              </div>
            </Link>

            <div className="flex items-center gap-2 sm:gap-4">
              <Link href="/notifications">
                <Button variant="ghost" size="icon" className="relative h-8 w-8 sm:h-10 sm:w-10">
                  <Bell className="w-4 h-4 sm:w-5 sm:h-5" />
                  {unreadNotifications.length > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 w-4 h-4 sm:w-5 sm:h-5 bg-destructive text-white text-[10px] rounded-full flex items-center justify-center">
                      {unreadNotifications.length}
                    </span>
                  )}
                </Button>
              </Link>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-1.5 sm:gap-2 hover:bg-muted rounded-lg px-1.5 py-1 transition-colors min-w-0">
                    <Avatar className="h-7 w-7 sm:h-8 sm:w-8 border shrink-0">
                      <AvatarFallback className="text-[10px] sm:text-xs bg-primary/10 text-primary">
                        {user?.name?.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-xs sm:text-sm font-medium hidden sm:block truncate max-w-[120px] lg:max-w-[180px]">{user?.name}</span>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem className="cursor-pointer" onClick={() => setLocation("/profile")}>
                    <User className="ml-2 h-4 w-4" />
                    <span className="truncate">{user?.name || 'الملف الشخصي'}</span>
                  </DropdownMenuItem>
                  {switchable && toggleTheme && (
                    <DropdownMenuItem onClick={toggleTheme} className="cursor-pointer">
                      {theme === 'dark' ? (
                        <><svg xmlns="http://www.w3.org/2000/svg" className="ml-2 h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg><span>الوضع الفاتح</span></>
                      ) : (
                        <><svg xmlns="http://www.w3.org/2000/svg" className="ml-2 h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg><span>الوضع الداكن</span></>
                      )}
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={logout} className="cursor-pointer text-destructive">
                    <LogOut className="ml-2 h-4 w-4" />
                    <span>تسجيل الخروج</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 sm:py-8">
        {/* رسالة الترحيب */}
        <div className="mb-8 text-center max-w-full overflow-hidden px-2 sm:px-4">
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2 break-words line-clamp-2" title={user?.name}>
            مرحباً، {user?.name}
          </h1>
          <p className="text-muted-foreground text-base sm:text-lg">
            نسعد بخدمتك في بوابة تمام للعناية بالمساجد
          </p>
        </div>

        {/* بانر تقييم الخدمة للطلبات المكتملة في مرحلة الإغلاق */}
        {unEvaluatedClosedRequests.length > 0 && (
          <div className="mb-8 max-w-4xl mx-auto text-right animate-in fade-in slide-in-from-top-3 duration-300" dir="rtl">
            {unEvaluatedClosedRequests.map((req: any) => (
              <div 
                key={req.id}
                className="relative overflow-hidden rounded-2xl p-5 sm:p-6 bg-gradient-to-r from-amber-500/15 via-emerald-500/10 to-teal-500/15 dark:from-amber-950/40 dark:via-emerald-950/20 dark:to-teal-950/40 border-2 border-amber-400/40 dark:border-amber-500/30 shadow-lg shadow-amber-500/5 mb-4 transition-all hover:shadow-xl"
              >
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex items-start gap-3 sm:gap-4 min-w-0 flex-1">
                    <div className="w-12 h-12 rounded-2xl bg-amber-500/20 dark:bg-amber-500/30 flex items-center justify-center shrink-0 shadow-inner">
                      <Sparkles className="w-6 h-6 text-amber-600 dark:text-amber-400 animate-pulse" />
                    </div>
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-bold text-base sm:text-lg text-foreground">
                          طلبك مكتمل وبانتظار تقييمك للخدمة ⭐
                        </h3>
                        <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs">
                          مكتمل ومغلق
                        </Badge>
                      </div>
                      <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                        تم إغلاق طلب الخدمة رقم <span className="font-bold text-foreground font-mono">{req.requestNumber}</span> {req.mosqueName ? `لمسجد (${req.mosqueName})` : ''} بنجاح. نرجو مشاركتنا تقييمك لمساعدتنا في تطوير الخدمة.
                      </p>
                    </div>
                  </div>
                  
                  <Button
                    onClick={() => {
                      setEvaluatingRequest(req);
                      setEvalRating(5);
                      setEvalNotes("");
                    }}
                    className="w-full sm:w-auto bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white font-bold px-6 py-2.5 rounded-xl shadow-md gap-2 shrink-0 transition-all hover:scale-105"
                  >
                    <Star className="w-4 h-4 fill-white" />
                    <span>تقييم الخدمة الآن</span>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {user?.status === "pending" && (
          <div className="mb-8 max-w-2xl mx-auto text-right" dir="rtl">
            <Alert className="border-yellow-250 bg-yellow-50/40 dark:bg-yellow-950/15 dark:border-yellow-900/30 text-yellow-800 dark:text-yellow-300 rounded-2xl flex items-center gap-3">
              <Clock className="w-5 h-5 text-yellow-600 dark:text-yellow-500 shrink-0" />
              <div>
                <AlertTitle className="font-bold text-sm">حسابك قيد المراجعة حالياً</AlertTitle>
                <AlertDescription className="text-xs sm:text-sm mt-0.5">
                  طلب تسجيلك قيد التدقيق والمراجعة من قبل إدارة الجمعية. سنقوم بإشعارك عبر البريد الإلكتروني فور اعتماد الحساب وتفعيله.
                </AlertDescription>
              </div>
            </Alert>
          </div>
        )}

        {/* أزرار الإجراءات الرئيسية */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8 max-w-2xl mx-auto">
          <Link href="/request-form-dynamic">
            <Card className="border-0 shadow-lg hover:shadow-xl transition-all cursor-pointer group bg-gradient-to-br from-primary to-primary/80 text-white">
              <CardContent className="p-4 sm:p-6 flex items-center gap-3 sm:gap-4">
                <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-white/20 flex items-center justify-center group-hover:scale-110 transition-transform flex-shrink-0">
                  <Plus className="w-6 h-6 sm:w-8 sm:h-8" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-bold text-base sm:text-lg truncate">تقديم طلب جديد</h3>
                  <p className="text-white/80 text-xs sm:text-sm truncate">اطلب خدمة لمسجدك</p>
                </div>
                <ArrowLeft className="w-5 h-5 mr-auto opacity-50 group-hover:opacity-100 group-hover:-translate-x-1 transition-all flex-shrink-0" />
              </CardContent>
            </Card>
          </Link>

          <Link href="/requester/mosques/new">
            <Card className="border-0 shadow-lg hover:shadow-xl transition-all cursor-pointer group">
              <CardContent className="p-4 sm:p-6 flex items-center gap-3 sm:gap-4">
                <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform flex-shrink-0">
                  <Building2 className="w-6 h-6 sm:w-8 sm:h-8 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-bold text-base sm:text-lg text-foreground truncate">تسجيل مسجد</h3>
                  <p className="text-muted-foreground text-xs sm:text-sm truncate">أضف مسجداً جديداً</p>
                </div>
                <ArrowLeft className="w-5 h-5 mr-auto text-muted-foreground opacity-50 group-hover:opacity-100 group-hover:-translate-x-1 transition-all flex-shrink-0" />
              </CardContent>
            </Card>
          </Link>
        </div>

        {/* بطاقات الإحصائيات */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-8">
          <Card className="border-0 shadow-sm">
            <CardContent className="p-3 sm:p-4 text-center">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-2">
                <FileText className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
              </div>
              <p className="text-xl sm:text-2xl font-bold text-foreground">{myRequests?.length || 0}</p>
              <p className="text-[10px] sm:text-xs text-muted-foreground">إجمالي الطلبات</p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardContent className="p-3 sm:p-4 text-center">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center mx-auto mb-2">
                <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-600 dark:text-yellow-400" />
              </div>
              <p className="text-xl sm:text-2xl font-bold text-foreground">{pendingRequests.length}</p>
              <p className="text-[10px] sm:text-xs text-muted-foreground">قيد الانتظار</p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardContent className="p-3 sm:p-4 text-center">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mx-auto mb-2">
                <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <p className="text-xl sm:text-2xl font-bold text-foreground">{inProgressRequests.length}</p>
              <p className="text-[10px] sm:text-xs text-muted-foreground">قيد التنفيذ</p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardContent className="p-3 sm:p-4 text-center">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto mb-2">
                <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-green-600 dark:text-green-400" />
              </div>
              <p className="text-xl sm:text-2xl font-bold text-foreground">{completedRequests.length}</p>
              <p className="text-[10px] sm:text-xs text-muted-foreground">مكتملة</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* طلباتي مع نسبة التقدم */}
          <Card className="lg:col-span-2 border-0 shadow-sm">
            <CardHeader className="p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                    <FileText className="w-5 h-5 text-primary" />
                    طلباتي
                  </CardTitle>
                  <CardDescription className="text-xs sm:text-sm">متابعة تقدم طلباتك</CardDescription>
                </div>
                <Link href="/my-requests">
                  <Button variant="ghost" size="sm" className="w-full sm:w-auto">
                    عرض الكل
                    <ChevronLeft className="w-4 h-4 mr-1" />
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0">
              {isLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-20 bg-muted animate-pulse rounded-lg" />
                  ))}
                </div>
              ) : myRequests && myRequests.length > 0 ? (
                <div className="space-y-3 sm:space-y-4">
                  {myRequests.slice(0, 5).map((request: any) => {
                    const isClosed = request.currentStage === "closed" || request.status === "completed";
                    const progress = isClosed ? 100 : getProgressPercentage(request.currentStage);
                    
                    return (
                      <div 
                        key={request.id}
                        className="p-3 sm:p-4 bg-muted/30 rounded-xl hover:bg-muted/50 transition-colors border border-transparent hover:border-primary/20"
                      >
                        <div className="flex items-center justify-between mb-3">
                          <Link href={`/requests/${request.id}`} className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1 cursor-pointer">
                            <ProgramIcon program={request.programType} size="md" showBackground />
                            <div className="min-w-0">
                              <p className="font-medium text-sm sm:text-base text-foreground truncate hover:text-primary transition-colors">
                                {request.programName || PROGRAM_LABELS[request.programType] || request.programType}
                              </p>
                              <p className="text-[10px] sm:text-xs text-muted-foreground truncate font-mono">
                                {request.requestNumber} {request.mosqueName ? `• ${request.mosqueName}` : ''}
                              </p>
                            </div>
                          </Link>

                          <div className="flex items-center gap-2 flex-shrink-0">
                            {/* زر التقييم إذا كان الطلب مغلقاً */}
                            {isClosed && (
                              request.isEvaluated ? (
                                <Badge variant="outline" className="border-emerald-500/40 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 font-bold text-[11px] gap-1 px-2.5 py-1">
                                  <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                                  <span>تم التقييم ({request.satisfactionRating || 5}/5)</span>
                                </Badge>
                              ) : (
                                <Button
                                  size="sm"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    setEvaluatingRequest(request);
                                    setEvalRating(5);
                                    setEvalNotes("");
                                  }}
                                  className="bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold px-3 py-1.5 rounded-lg shadow-sm gap-1.5 transition-all hover:scale-105"
                                >
                                  <Star className="w-3.5 h-3.5 fill-white" />
                                  <span>قيّم الخدمة</span>
                                </Button>
                              )
                            )}

                            <div className="flex items-center gap-1 flex-shrink-0">
                              <Percent className="w-3 h-3 sm:w-4 sm:h-4 text-primary" />
                              <span className="text-base sm:text-lg font-bold text-primary">{progress}%</span>
                            </div>
                          </div>
                        </div>

                        <div className="space-y-1">
                          <Progress value={progress} className="h-1.5 sm:h-2" />
                          <div className="flex items-center justify-between text-[10px] sm:text-xs text-muted-foreground">
                            <span>
                              المرحلة: <strong className="text-foreground">{STAGE_LABELS[request.currentStage] || request.currentStage}</strong>
                            </span>
                            <span>{progress === 100 ? "مكتمل" : "جاري المعالجة..."}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8 sm:py-12">
                  <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-3 sm:mb-4">
                    <FileText className="w-6 h-6 sm:w-8 sm:h-8 text-muted-foreground" />
                  </div>
                  <p className="text-sm sm:text-base text-muted-foreground mb-4">لا توجد طلبات حتى الآن</p>
                  <Link href="/request-form-dynamic">
                    <Button className="gradient-primary text-white w-full sm:w-auto">
                      <Plus className="w-4 h-4 ml-2" />
                      تقديم طلب جديد
                    </Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>

          {/* الإشعارات */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                    <Bell className="w-5 h-5 text-primary" />
                    الإشعارات
                  </CardTitle>
                  <CardDescription className="text-xs sm:text-sm">آخر التحديثات</CardDescription>
                </div>
                <Link href="/notifications">
                  <Button variant="ghost" size="sm" className="w-full sm:w-auto">
                    عرض الكل
                    <ChevronLeft className="w-4 h-4 mr-1" />
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0">
              {notifications?.notifications && notifications.notifications.length > 0 ? (
                <div className="space-y-3">
                  {notifications.notifications.slice(0, 5).map((notification: any) => (
                    <div 
                      key={notification.id} 
                      className={`p-3 rounded-lg transition-colors ${
                        notification.isRead ? 'bg-muted/30' : 'bg-primary/5 border border-primary/20'
                      }`}
                    >
                      <p className="text-sm font-medium text-foreground line-clamp-1">
                        {notification.title}
                      </p>
                      <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                        {notification.message}
                      </p>
                      {!notification.isRead && (
                        <Badge variant="secondary" className="mt-2 text-[10px] h-5">
                          جديد
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 sm:py-8">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
                    <Bell className="w-5 h-5 sm:w-6 sm:h-6 text-muted-foreground" />
                  </div>
                  <p className="text-xs sm:text-sm text-muted-foreground">لا توجد إشعارات</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* مساجدي */}
        <Card className="mt-6 border-0 shadow-sm">
          <CardHeader className="p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                  <Building2 className="w-5 h-5 text-primary" />
                  مساجدي
                </CardTitle>
                <CardDescription className="text-xs sm:text-sm">المساجد المسجلة باسمك</CardDescription>
              </div>
              <Link href="/my-mosques">
                <Button variant="ghost" size="sm" className="w-full sm:w-auto">
                  عرض الكل
                  <ChevronLeft className="w-4 h-4 mr-1" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0">
            {myMosques && myMosques.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                {myMosques.slice(0, 4).map((mosque) => (
                  <Link key={mosque.id} href={`/mosques/${mosque.id}`}>
                    <div className="p-3 sm:p-4 bg-muted/30 rounded-xl hover:bg-muted/50 transition-colors cursor-pointer border border-transparent hover:border-primary/20">
                      <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-3">
                        <Building2 className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
                      </div>
                      <p className="font-medium text-sm sm:text-base text-foreground truncate">{mosque.name}</p>
                      <p className="text-xs sm:text-sm text-muted-foreground truncate">{mosque.city}</p>
                      <Badge 
                        variant={mosque.approvalStatus === 'approved' ? 'default' : 'secondary'} 
                        className="mt-2 text-[10px] h-5"
                      >
                        {mosque.approvalStatus === 'approved' ? 'معتمد' : 
                         mosque.approvalStatus === 'pending' ? 'قيد المراجعة' : 'مرفوض'}
                      </Badge>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 sm:py-8">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
                  <Building2 className="w-5 h-5 sm:w-6 sm:h-6 text-muted-foreground" />
                </div>
                <p className="text-xs sm:text-sm text-muted-foreground mb-4">لا توجد مساجد مسجلة</p>
                <Link href="/requester/mosques/new">
                  <Button variant="outline" className="w-full sm:w-auto">
                    <Plus className="w-4 h-4 ml-2" />
                    تسجيل مسجد
                  </Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      {/* نافذة تقييم رضا المستفيد السريعة (Modal Dialog) */}
      <Dialog 
        open={!!evaluatingRequest} 
        onOpenChange={(open) => {
          if (!submitEvaluationMutation.isPending && !open) {
            setEvaluatingRequest(null);
          }
        }}
      >
        <DialogContent className="w-[92vw] max-w-lg rounded-2xl p-6 sm:p-7 text-right" dir="rtl">
          <DialogHeader className="text-right">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/15 text-amber-600 flex items-center justify-center mb-2 mx-auto sm:mr-0">
              <HeartHandshake className="w-6 h-6" />
            </div>
            <DialogTitle className="text-xl font-bold text-foreground">
              تقييم رضا المستفيد عن الخدمة
            </DialogTitle>
            <DialogDescription className="text-xs sm:text-sm text-muted-foreground mt-1">
              طلب رقم <span className="font-bold text-foreground font-mono">{evaluatingRequest?.requestNumber}</span> {evaluatingRequest?.mosqueName ? `— مسجد (${evaluatingRequest?.mosqueName})` : ''}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* اختيار النجوم التفاعلي */}
            <div className="text-center space-y-3">
              <span className="text-xs sm:text-sm font-semibold text-foreground block">
                ما هو مستوى رضاك عن جودة الخدمة وسرعة الإنجاز؟
              </span>
              <div className="flex items-center justify-center gap-2 sm:gap-3 py-2" dir="ltr">
                {[1, 2, 3, 4, 5].map((star) => {
                  const active = (hoverRating || evalRating) >= star;
                  return (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setEvalRating(star)}
                      onMouseEnter={() => setHoverRating(star)}
                      onMouseLeave={() => setHoverRating(0)}
                      className="p-1 transition-transform hover:scale-125 focus:outline-none cursor-pointer"
                    >
                      <Star
                        className={`w-8 h-8 sm:w-10 sm:h-10 transition-colors ${
                          active
                            ? "text-amber-500 fill-amber-500 drop-shadow-[0_2px_8px_rgba(245,158,11,0.4)]"
                            : "text-muted-foreground/30 hover:text-amber-300"
                        }`}
                      />
                    </button>
                  );
                })}
              </div>

              {/* بطاقة التعبير عن التقييم المختار */}
              {(() => {
                const activeVal = hoverRating || evalRating;
                const detail = RATING_LABELS[activeVal];
                if (!detail) return null;
                return (
                  <div className={`p-3 rounded-xl border text-center transition-all ${detail.color}`}>
                    <div className="text-2xl mb-1">{detail.emoji}</div>
                    <p className="font-bold text-sm">{detail.label}</p>
                    <p className="text-xs opacity-90">{detail.description}</p>
                  </div>
                );
              })()}
            </div>

            {/* ملاحظات إضافية */}
            <div className="space-y-2 text-right">
              <label className="text-xs sm:text-sm font-semibold text-foreground block">
                ملاحظات أو مقترحات إضافية (اختياري)
              </label>
              <Textarea
                value={evalNotes}
                onChange={(e) => setEvalNotes(e.target.value)}
                placeholder="شاركنا رأيك أو أي ملاحظات تسهم في الارتقاء بخدماتنا مستقبلاً..."
                className="rounded-xl min-h-[90px] text-sm resize-none"
                maxLength={500}
              />
            </div>
          </div>

          <DialogFooter className="flex flex-col-reverse sm:flex-row-reverse gap-2 sm:gap-2">
            <Button
              disabled={submitEvaluationMutation.isPending || evalRating === 0}
              onClick={() => {
                if (!evaluatingRequest) return;
                submitEvaluationMutation.mutate({
                  requestId: evaluatingRequest.id,
                  rating: evalRating,
                  notes: evalNotes.trim() || undefined,
                });
              }}
              className="w-full sm:w-auto bg-primary hover:bg-primary/95 text-white font-bold gap-2 rounded-xl px-6"
            >
              {submitEvaluationMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>جاري إرسال التقييم...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>إرسال التقييم</span>
                </>
              )}
            </Button>
            <Button
              variant="outline"
              disabled={submitEvaluationMutation.isPending}
              onClick={() => setEvaluatingRequest(null)}
              className="w-full sm:w-auto rounded-xl font-medium"
            >
              إلغاء
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Footer */}
      <footer className="mt-12 py-6 border-t bg-white/50 dark:bg-card/50">
        <div className="container mx-auto px-4 text-center">
          <p className="text-sm text-muted-foreground">
            جمعية عمارة المساجد بمنطقة عسير - بوابة تمام للعناية بالمساجد
          </p>
        </div>
      </footer>
    </div>
  );
}
