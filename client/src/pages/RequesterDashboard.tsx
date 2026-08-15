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
  LogOut,
  User,
  Bell,
  Percent,
  ArrowLeft,
  Star,
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
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";

const statusColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
  in_progress: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  completed: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  rejected: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
  cancelled: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300",
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

  // جلب طلبات المستخدم
  const { data: myRequests, isLoading } = trpc.requests.getMyRequests.useQuery();
  // جلب مساجد المستخدم
  const { data: myMosques } = trpc.mosques.getMyMosques.useQuery();
  // جلب الإشعارات
  const { data: notifications } = trpc.notifications.getMyNotifications.useQuery({ limit: 10 });
  // جلب إعدادات الجمعية (الشعار والاسم)
  const { data: orgSettings } = trpc.organization.getSettings.useQuery();

  const mainLogoSrc = orgSettings?.logoUrl || '/logo.svg';
  const orgName = orgSettings?.organizationName || 'بوابة تمام';
  const orgNameShort = orgSettings?.organizationNameShort || 'للعناية بالمساجد';

  const pendingRequests = myRequests?.filter((r: any) => r.status === "pending") || [];
  const inProgressRequests = myRequests?.filter((r: any) => r.status === "in_progress") || [];
  const completedRequests = myRequests?.filter((r: any) => r.status === "completed" || r.currentStage === "closed") || [];
  const unreadNotifications = notifications?.notifications?.filter((n: any) => !n.isRead) || [];


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

            <div className="flex items-center gap-2 sm:gap-4 shrink-0">
              <Link href="/notifications">
                <Button variant="ghost" size="icon" className="relative h-8 w-8 sm:h-9 sm:w-9">
                  <Bell className="h-4 w-4 sm:h-5 sm:w-5" />
                  {unreadNotifications.length > 0 && (
                    <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-destructive text-[10px] font-medium text-destructive-foreground flex items-center justify-center">
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
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-8">
          <Card className="border-0 shadow-sm">
            <CardHeader className="p-3 sm:p-4 pb-1 sm:pb-2">
              <CardDescription className="flex items-center justify-between text-xs sm:text-sm">
                <span>إجمالي الطلبات</span>
                <FileText className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground" />
              </CardDescription>
              <CardTitle className="text-xl sm:text-2xl font-bold">{myRequests?.length || 0}</CardTitle>
            </CardHeader>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardHeader className="p-3 sm:p-4 pb-1 sm:pb-2">
              <CardDescription className="flex items-center justify-between text-xs sm:text-sm">
                <span>قيد المراجعة</span>
                <Clock className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-yellow-600" />
              </CardDescription>
              <CardTitle className="text-xl sm:text-2xl font-bold text-yellow-600">{pendingRequests.length}</CardTitle>
            </CardHeader>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardHeader className="p-3 sm:p-4 pb-1 sm:pb-2">
              <CardDescription className="flex items-center justify-between text-xs sm:text-sm">
                <span>قيد التنفيذ</span>
                <AlertCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-blue-600" />
              </CardDescription>
              <CardTitle className="text-xl sm:text-2xl font-bold text-blue-600">{inProgressRequests.length}</CardTitle>
            </CardHeader>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardHeader className="p-3 sm:p-4 pb-1 sm:pb-2">
              <CardDescription className="flex items-center justify-between text-xs sm:text-sm">
                <span>مكتملة</span>
                <CheckCircle2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-green-600" />
              </CardDescription>
              <CardTitle className="text-xl sm:text-2xl font-bold text-green-600">{completedRequests.length}</CardTitle>
            </CardHeader>
          </Card>
        </div>

        {/* قائمة الطلبات */}
        <Card className="border-0 shadow-sm mb-8">
          <CardHeader className="flex flex-row items-center justify-between p-4 sm:p-6 pb-2 sm:pb-4">
            <div>
              <CardTitle className="text-base sm:text-lg">طلباتي</CardTitle>
              <CardDescription className="text-xs sm:text-sm">متابعة حالة الطلبات المقدمة</CardDescription>
            </div>
            <Link href="/my-requests">
              <Button variant="ghost" size="sm" className="text-xs sm:text-sm h-8 sm:h-9">
                عرض الكل
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 pt-0">
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground text-sm">جاري التحميل...</div>
            ) : myRequests?.length === 0 ? (
              <div className="text-center py-8">
                <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-50" />
                <p className="text-muted-foreground mb-4 text-sm">لم تقدم أي طلبات بعد</p>
                <Link href="/request-form-dynamic">
                  <Button size="sm">تقديم طلب جديد</Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-3 sm:space-y-4">
                {myRequests?.slice(0, 5).map((request: any) => {
                  const progress = getProgressPercentage(request.currentStage);
                  const isClosed = request.currentStage === "closed" || request.status === "completed";
                  
                  return (
                    <div 
                      key={request.id}
                      className="p-3 sm:p-4 rounded-xl border border-border/50 hover:border-border hover:shadow-md transition-all space-y-3 bg-card"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4">
                        <Link href={`/requests/${request.id}`} className="block flex-1 min-w-0">
                          <div className="flex items-start gap-2.5 sm:gap-3 min-w-0">
                            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                              <ProgramIcon program={request.programType} className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                                <span className="font-bold text-xs sm:text-sm text-foreground truncate max-w-full">
                                  {request.mosqueName ? `مسجد ${request.mosqueName}` : request.requestNumber}
                                </span>
                                <Badge className={`text-[10px] sm:text-xs shrink-0 ${statusColors[request.status] || ""}`}>
                                  {STATUS_LABELS[request.status] || request.status}
                                </Badge>
                              </div>
                              <p className="text-[11px] sm:text-xs text-muted-foreground truncate mt-0.5">
                                {PROGRAM_LABELS[request.programType] || request.programType}
                              </p>
                            </div>
                          </div>
                        </Link>

                        <div className="flex items-center gap-2 flex-shrink-0 self-end sm:self-center">
                          {/* زر التقييم إذا كان الطلب مغلقاً */}
                          {isClosed && (
                            request.isEvaluated ? (
                              <Badge variant="outline" className="border-emerald-500/40 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 font-bold text-[11px] gap-1 px-2.5 py-1">
                                <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                                <span>تم التقييم ({request.satisfactionRating || 5}/5)</span>
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

                          <div className="flex items-center gap-1 flex-shrink-0">
                            <Percent className="w-3 h-3 sm:w-4 sm:h-4 text-primary" />
                            <span className="text-base sm:text-lg font-bold text-primary">{progress}%</span>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-[11px] sm:text-xs text-muted-foreground">
                          <span>المرحلة الحالية: {STAGE_LABELS[request.currentStage] || request.currentStage}</span>
                          <span>{progress}%</span>
                        </div>
                        <Progress value={progress} className="h-1.5 sm:h-2" />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* قائمة المساجد المسجلة */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between p-4 sm:p-6 pb-2 sm:pb-4">
            <div>
              <CardTitle className="text-base sm:text-lg">مساجدي</CardTitle>
              <CardDescription className="text-xs sm:text-sm">المساجد المسجلة تحت حسابك</CardDescription>
            </div>
            <Link href="/requester/mosques/new">
              <Button size="sm" variant="outline" className="text-xs sm:text-sm h-8 sm:h-9">
                <Plus className="h-3.5 w-3.5 sm:h-4 sm:w-4 ml-1" />
                إضافة مسجد
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 pt-0">
            {myMosques?.length === 0 ? (
              <div className="text-center py-8">
                <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-50" />
                <p className="text-muted-foreground mb-4 text-sm">لم تسجل أي مسجد بعد</p>
                <Link href="/requester/mosques/new">
                  <Button size="sm">تسجيل مسجد جديد</Button>
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                {myMosques?.map((mosque: any) => (
                  <div 
                    key={mosque.id}
                    className="p-3 sm:p-4 rounded-xl border border-border/50 hover:border-border hover:shadow-md transition-all bg-card flex flex-col justify-between"
                  >
                    <div className="flex items-start gap-2.5 sm:gap-3">
                      <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <Building2 className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h4 className="font-bold text-xs sm:text-sm text-foreground truncate">{mosque.name}</h4>
                        <p className="text-[11px] sm:text-xs text-muted-foreground truncate mt-0.5">
                          {mosque.city || mosque.region || 'غير محدد'}
                        </p>
                      </div>
                    </div>
                    <div className="mt-3 pt-3 border-t border-border/30 flex items-center justify-between">
                      <span className="text-[10px] sm:text-xs text-muted-foreground">
                        {mosque.neighborhood ? `حي ${mosque.neighborhood}` : 'مسجل في البوابة'}
                      </span>
                      <Link href={`/request-form-dynamic?mosqueId=${mosque.id}`}>
                        <Button size="sm" variant="ghost" className="text-xs h-7 px-2 text-primary hover:text-primary">
                          طلب خدمة
                        </Button>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>

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
