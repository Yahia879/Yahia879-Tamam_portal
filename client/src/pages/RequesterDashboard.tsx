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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { useState, useEffect } from "react";
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
  
  // حالة استبيان تقييم رضا المستفيدين
  const [evaluatingRequest, setEvaluatingRequest] = useState<any | null>(null);
  const [beneficiaryName, setBeneficiaryName] = useState<string>("");
  const [beneficiaryPhone, setBeneficiaryPhone] = useState<string>("");
  const [serviceName, setServiceName] = useState<string>("");
  const [beneficiaryEmail, setBeneficiaryEmail] = useState<string>("");

  const [servicesRating, setServicesRating] = useState<number>(0);
  const [hoverServicesRating, setHoverServicesRating] = useState<number>(0);

  const [speedRating, setSpeedRating] = useState<number>(0);
  const [hoverSpeedRating, setHoverSpeedRating] = useState<number>(0);

  const [communicationRating, setCommunicationRating] = useState<number>(0);
  const [hoverCommunicationRating, setHoverCommunicationRating] = useState<number>(0);

  const [overallSatisfaction, setOverallSatisfaction] = useState<number>(0);
  const [hoverOverallSatisfaction, setHoverOverallSatisfaction] = useState<number>(0);

  const [comments, setComments] = useState<string>("");

  const utils = trpc.useUtils();

  // دالة فتح نافذة التقييم وتهيئة البيانات الأولية
  const openEvaluationModal = (req: any) => {
    setEvaluatingRequest(req);
    setBeneficiaryName(user?.name || "");
    setBeneficiaryPhone(user?.phone || (user as any)?.mobileNumber || "");
    const initialServiceName = req.mosqueName 
      ? `مسجد ${req.mosqueName}` 
      : (req.descriptiveName || req.programType || `طلب خدمة رقم #${req.requestNumber || req.id}`);
    setServiceName(initialServiceName);
    setBeneficiaryEmail(user?.email || "");
    setServicesRating(0);
    setSpeedRating(0);
    setCommunicationRating(0);
    setOverallSatisfaction(0);
    setComments("");
  };

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
    onSuccess: (res: any) => {
      toast.success(res.message || "تم استلام استبيان التقييم بنجاح، شكراً لمشاركتك!");
      setEvaluatingRequest(null);
      utils.requests.getMyRequests.invalidate();
    },
    onError: (err: any) => {
      toast.error(err.message || "حدث خطأ أثناء إرسال التقييم");
    },
  });

  const handleSubmitSurvey = () => {
    if (!evaluatingRequest) return;
    if (!serviceName.trim()) {
      toast.error("يرجى إدخال اسم المسجد/المشروع/الخدمة");
      return;
    }
    if (speedRating === 0) {
      toast.error("يرجى الإجابة على: ما مدى تقييمك لسرعة تلبية طلبك؟");
      return;
    }
    if (communicationRating === 0) {
      toast.error("يرجى الإجابة على: ما مدى سرعة تواصل موظفي الجمعية معك؟");
      return;
    }
    if (overallSatisfaction === 0) {
      toast.error("يرجى الإجابة على: ما مدى رضاك بشكل عام عن الجمعية؟");
      return;
    }

    submitEvaluationMutation.mutate({
      requestId: evaluatingRequest.id,
      beneficiaryName: beneficiaryName.trim() || undefined,
      beneficiaryPhone: beneficiaryPhone.trim() || undefined,
      serviceName: serviceName.trim(),
      beneficiaryEmail: beneficiaryEmail.trim() || undefined,
      servicesRating: servicesRating > 0 ? servicesRating : undefined,
      speedRating,
      communicationRating,
      overallSatisfaction,
      comments: comments.trim() || undefined,
    });
  };

  const mainLogoSrc = orgSettings?.logoUrl || '/logo.svg';
  const orgName = orgSettings?.organizationName || 'بوابة تمام';
  const orgNameShort = orgSettings?.organizationNameShort || 'للعناية بالمساجد';

  const pendingRequests = myRequests?.filter((r: any) => r.status === "pending") || [];
  const inProgressRequests = myRequests?.filter((r: any) => r.status === "in_progress") || [];
  const completedRequests = myRequests?.filter((r: any) => r.status === "completed" || r.currentStage === "closed") || [];
  const unreadNotifications = notifications?.notifications?.filter((n: any) => !n.isRead) || [];

  // تصفية الطلبات المكتملة/المغلقة التي لم يتم تقييمها بعد
  const unEvaluatedClosedRequests = myRequests?.filter(
    (r: any) => (r.currentStage === "closed" || r.status === "completed") && !r.isEvaluated
  ) || [];

  // فتح نافذة الـ Modal تلقائياً لمرة واحدة فقط لكل طلب عند إغلاقه
  useEffect(() => {
    if (!isLoading && myRequests && unEvaluatedClosedRequests.length > 0 && !evaluatingRequest && user?.id) {
      // البحث عن أول طلب مغلق لم يسبق إظهار النافذة التلقائية له للمستخدم
      const targetReq = unEvaluatedClosedRequests.find((req: any) => {
        const storageKey = `eval_modal_shown_${user.id}_${req.id}`;
        return !localStorage.getItem(storageKey);
      });

      if (targetReq) {
        openEvaluationModal(targetReq);
        // تسجيل أن المودال قد ظهر لهذا الطلب لكي لا يتكرر ظهوره التلقائي مجدداً
        const storageKey = `eval_modal_shown_${user.id}_${targetReq.id}`;
        localStorage.setItem(storageKey, "true");
      }
    }
  }, [isLoading, myRequests, unEvaluatedClosedRequests, evaluatingRequest, user?.id]);

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
                                    openEvaluationModal(request);
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

      {/* نافذة استبيان قياس رضا المستفيدين (Modal Dialog) */}
      <Dialog 
        open={!!evaluatingRequest} 
        onOpenChange={(open) => {
          if (!submitEvaluationMutation.isPending && !open) {
            setEvaluatingRequest(null);
          }
        }}
      >
        <DialogContent className="w-[95vw] max-w-2xl max-h-[90vh] overflow-y-auto p-0 rounded-2xl border border-slate-200/80 shadow-2xl bg-white text-slate-900 font-sans" dir="rtl">
          {/* 1. Header Banner مع الشعار */}
          <div className="bg-[#14707a] text-white p-6 sm:p-7 flex flex-col items-center justify-center rounded-t-2xl relative shadow-inner">
            <img 
              src={mainLogoSrc} 
              alt="شعار الجمعية" 
              className="h-14 sm:h-16 w-auto object-contain brightness-0 invert"
            />
          </div>

          <div className="p-5 sm:p-7 space-y-6">
            {/* 2. العنوان والنص الترحيبي */}
            <div className="text-center space-y-2">
              <h2 className="text-xl sm:text-2xl font-bold text-slate-800">
                قياس رضا المستفيدين من خدمات الجمعية
              </h2>
              <p className="text-xs sm:text-[13px] text-slate-600 leading-relaxed max-w-xl mx-auto">
                نرحب بكم في استبيان قياس رضا المستفيدين لجمعية عمارة المساجد (منارة). نسعى من خلال هذا الاستبيان إلى فهم آرائكم واقتراحاتكم، حيث إن مشاركتكم تساعدنا في تحسين وتطوير خدماتنا لتلبية تطلعاتكم بشكل أفضل. نؤكد لكم أن إكمال الاستبيان لن يستغرق أكثر من دقيقتين من وقتكم. شكرًا لكم على وقتكم وتعاونكم
              </p>
            </div>

            <hr className="border-t border-dotted border-slate-300" />

            {/* 3. الحقول النصية */}
            <div className="space-y-4">
              {/* الاسم (اختياري) */}
              <div className="space-y-1.5 text-right">
                <Label className="text-xs sm:text-sm font-bold text-slate-800">الاسم (اختياري)</Label>
                <Input
                  value={beneficiaryName}
                  onChange={(e) => setBeneficiaryName(e.target.value)}
                  placeholder=""
                  className="bg-[#fcfbf7] border-slate-200 focus:border-[#14707a] rounded-md h-10 text-right"
                />
              </div>

              {/* رقم الجوال (اختياري) */}
              <div className="space-y-1.5 text-right">
                <Label className="text-xs sm:text-sm font-bold text-slate-800">رقم الجوال (اختياري)</Label>
                <Input
                  value={beneficiaryPhone}
                  onChange={(e) => setBeneficiaryPhone(e.target.value)}
                  placeholder=""
                  className="bg-[#fcfbf7] border-slate-200 focus:border-[#14707a] rounded-md h-10 text-right"
                  dir="ltr"
                />
              </div>

              {/* اسم المسجد/المشروع/الخدمة * */}
              <div className="space-y-1.5 text-right">
                <Label className="text-xs sm:text-sm font-bold text-slate-800">
                  اسم المسجد/المشروع/الخدمة <span className="text-rose-600">*</span>
                </Label>
                <Input
                  value={serviceName}
                  onChange={(e) => setServiceName(e.target.value)}
                  placeholder=""
                  required
                  className="bg-[#fcfbf7] border-slate-200 focus:border-[#14707a] rounded-md h-10 text-right font-medium"
                />
              </div>

              {/* البريد الإلكتروني (اختياري) */}
              <div className="space-y-1.5 text-right">
                <Label className="text-xs sm:text-sm font-bold text-slate-800">البريد الإلكتروني (اختياري)</Label>
                <Input
                  value={beneficiaryEmail}
                  onChange={(e) => setBeneficiaryEmail(e.target.value)}
                  type="email"
                  placeholder=""
                  className="bg-[#fcfbf7] border-slate-200 focus:border-[#14707a] rounded-md h-10 text-right"
                  dir="ltr"
                />
              </div>
            </div>

            {/* 4. أسئلة التقييم بالنجوم */}
            <div className="space-y-4 pt-1">
              {/* ما مدى تقييمك لخدمات الجمعية؟ */}
              <div className="space-y-1.5 text-right">
                <Label className="text-xs sm:text-sm font-bold text-slate-800 block">
                  ما مدى تقييمك لخدمات الجمعية؟
                </Label>
                <div className="flex items-center gap-1.5 py-1 justify-end" dir="ltr">
                  {[1, 2, 3, 4, 5].map((star) => {
                    const active = (hoverServicesRating || servicesRating) >= star;
                    return (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setServicesRating(star)}
                        onMouseEnter={() => setHoverServicesRating(star)}
                        onMouseLeave={() => setHoverServicesRating(0)}
                        className="p-1 transition-transform hover:scale-125 focus:outline-none cursor-pointer"
                      >
                        <Star
                          className={`w-8 h-8 transition-all ${
                            active
                              ? "text-amber-400 fill-amber-400 drop-shadow-[0_1px_3px_rgba(251,191,36,0.5)]"
                              : "text-slate-300 fill-none stroke-[1.2]"
                          }`}
                        />
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* ما مدى تقييمك لسرعة تلبية طلبك؟ * */}
              <div className="space-y-1.5 text-right">
                <Label className="text-xs sm:text-sm font-bold text-slate-800 block">
                  ما مدى تقييمك لسرعة تلبية طلبك؟ <span className="text-rose-600">*</span>
                </Label>
                <div className="flex items-center gap-1.5 py-1 justify-end" dir="ltr">
                  {[1, 2, 3, 4, 5].map((star) => {
                    const active = (hoverSpeedRating || speedRating) >= star;
                    return (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setSpeedRating(star)}
                        onMouseEnter={() => setHoverSpeedRating(star)}
                        onMouseLeave={() => setHoverSpeedRating(0)}
                        className="p-1 transition-transform hover:scale-125 focus:outline-none cursor-pointer"
                      >
                        <Star
                          className={`w-8 h-8 transition-all ${
                            active
                              ? "text-amber-400 fill-amber-400 drop-shadow-[0_1px_3px_rgba(251,191,36,0.5)]"
                              : "text-slate-300 fill-none stroke-[1.2]"
                          }`}
                        />
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* ما مدى سرعة تواصل موظفي الجمعية معك؟ * */}
              <div className="space-y-1.5 text-right">
                <Label className="text-xs sm:text-sm font-bold text-slate-800 block">
                  ما مدى سرعة تواصل موظفي الجمعية معك؟ <span className="text-rose-600">*</span>
                </Label>
                <div className="flex items-center gap-1.5 py-1 justify-end" dir="ltr">
                  {[1, 2, 3, 4, 5].map((star) => {
                    const active = (hoverCommunicationRating || communicationRating) >= star;
                    return (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setCommunicationRating(star)}
                        onMouseEnter={() => setHoverCommunicationRating(star)}
                        onMouseLeave={() => setHoverCommunicationRating(0)}
                        className="p-1 transition-transform hover:scale-125 focus:outline-none cursor-pointer"
                      >
                        <Star
                          className={`w-8 h-8 transition-all ${
                            active
                              ? "text-amber-400 fill-amber-400 drop-shadow-[0_1px_3px_rgba(251,191,36,0.5)]"
                              : "text-slate-300 fill-none stroke-[1.2]"
                          }`}
                        />
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* ما مدى رضاك بشكل عام عن الجمعية؟ * */}
              <div className="space-y-1.5 text-right">
                <Label className="text-xs sm:text-sm font-bold text-slate-800 block">
                  ما مدى رضاك بشكل عام عن الجمعية؟ <span className="text-rose-600">*</span>
                </Label>
                <div className="flex items-center gap-1.5 py-1 justify-end" dir="ltr">
                  {[1, 2, 3, 4, 5].map((star) => {
                    const active = (hoverOverallSatisfaction || overallSatisfaction) >= star;
                    return (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setOverallSatisfaction(star)}
                        onMouseEnter={() => setHoverOverallSatisfaction(star)}
                        onMouseLeave={() => setHoverOverallSatisfaction(0)}
                        className="p-1 transition-transform hover:scale-125 focus:outline-none cursor-pointer"
                      >
                        <Star
                          className={`w-8 h-8 transition-all ${
                            active
                              ? "text-amber-400 fill-amber-400 drop-shadow-[0_1px_3px_rgba(251,191,36,0.5)]"
                              : "text-slate-300 fill-none stroke-[1.2]"
                          }`}
                        />
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* 5. مساحة حرة */}
            <div className="space-y-1.5 text-right">
              <Label className="block text-xs sm:text-sm font-bold text-slate-800">مساحة حرة</Label>
              <span className="block text-xs font-semibold text-slate-700">
                (اكتب لنا ما تريد: رأي-نصيحة-اقتراح-أخرى)
              </span>
              <Textarea
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                rows={4}
                placeholder=""
                className="bg-[#fcfbf7] border-slate-200 focus:border-[#14707a] rounded-md text-sm text-right leading-relaxed"
              />
            </div>

            {/* 6. زر إرسال */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
              <Button
                variant="ghost"
                type="button"
                disabled={submitEvaluationMutation.isPending}
                onClick={() => setEvaluatingRequest(null)}
                className="text-muted-foreground text-xs hover:text-foreground"
              >
                إغلاق
              </Button>
              <Button
                type="button"
                disabled={submitEvaluationMutation.isPending}
                onClick={handleSubmitSurvey}
                className="bg-[#2a68a5] hover:bg-[#205386] text-white font-bold text-sm px-8 py-2.5 rounded-md shadow-sm transition-all"
              >
                {submitEvaluationMutation.isPending ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>جاري الإرسال...</span>
                  </div>
                ) : (
                  "إرسال"
                )}
              </Button>
            </div>
          </div>
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
