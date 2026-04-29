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
import { Progress } from "@/components/ui/progress";

// تم استبدال programIcons بمكون ProgramIcon

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

  const pendingRequests = myRequests?.filter(r => r.status === "pending") || [];
  const inProgressRequests = myRequests?.filter(r => r.status === "in_progress") || [];
  const completedRequests = myRequests?.filter(r => r.status === "completed") || [];
  const unreadNotifications = notifications?.notifications?.filter((n: any) => !n.isRead) || [];

  return (
    <div className="min-h-screen bg-background">
      {/* شريط التنقل */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b border-border shadow-sm">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="flex items-center gap-3">
              <img 
                src="/logo.svg" 
                alt="شعار بوابة تمام" 
                className="h-10 w-auto"
              />
              <div>
                <h1 className="font-bold text-lg text-foreground">بوابة تمام</h1>
                <p className="text-xs text-muted-foreground">للعناية بالمساجد</p>
              </div>
            </Link>

            <div className="flex items-center gap-4">
              <Link href="/notifications">
                <Button variant="ghost" size="icon" className="relative">
                  <Bell className="w-5 h-5" />
                  {unreadNotifications.length > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-destructive text-white text-xs rounded-full flex items-center justify-center">
                      {unreadNotifications.length}
                    </span>
                  )}
                </Button>
              </Link>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-2 hover:bg-muted rounded-lg px-2 py-1 transition-colors">
                    <Avatar className="h-8 w-8 border">
                      <AvatarFallback className="text-xs bg-primary/10 text-primary">
                        {user?.name?.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm font-medium hidden sm:block">{user?.name}</span>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem className="cursor-pointer">
                    <User className="ml-2 h-4 w-4" />
                    <span>الملف الشخصي</span>
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

      <main className="container mx-auto px-4 py-8">
        {/* رسالة الترحيب */}
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            مرحباً، {user?.name}
          </h1>
          <p className="text-muted-foreground text-lg">
            نسعد بخدمتك في بوابة تمام للعناية بالمساجد
          </p>
        </div>

        {/* أزرار الإجراءات الرئيسية */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8 max-w-2xl mx-auto">
          <Link href="/request-form-dynamic">
            <Card className="border-0 shadow-lg hover:shadow-xl transition-all cursor-pointer group bg-gradient-to-br from-primary to-primary/80 text-white">
              <CardContent className="p-6 flex items-center gap-4">
                <div className="w-14 h-14 rounded-xl bg-white/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Plus className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="font-bold text-lg">تقديم طلب جديد</h3>
                  <p className="text-white/80 text-sm">اطلب خدمة لمسجدك</p>
                </div>
                <ArrowLeft className="w-5 h-5 mr-auto opacity-50 group-hover:opacity-100 group-hover:-translate-x-1 transition-all" />
              </CardContent>
            </Card>
          </Link>

          <Link href="/requester/mosques/new">
            <Card className="border-0 shadow-lg hover:shadow-xl transition-all cursor-pointer group">
              <CardContent className="p-6 flex items-center gap-4">
                <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Building2 className="w-8 h-8 text-primary" />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-foreground">تسجيل مسجد</h3>
                  <p className="text-muted-foreground text-sm">أضف مسجداً جديداً</p>
                </div>
                <ArrowLeft className="w-5 h-5 mr-auto text-muted-foreground opacity-50 group-hover:opacity-100 group-hover:-translate-x-1 transition-all" />
              </CardContent>
            </Card>
          </Link>
        </div>

        {/* بطاقات الإحصائيات */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4 text-center">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-2">
                <FileText className="w-5 h-5 text-primary" />
              </div>
              <p className="text-2xl font-bold text-foreground">{myRequests?.length || 0}</p>
              <p className="text-xs text-muted-foreground">إجمالي الطلبات</p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardContent className="p-4 text-center">
              <div className="w-10 h-10 rounded-full bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center mx-auto mb-2">
                <Clock className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
              </div>
              <p className="text-2xl font-bold text-foreground">{pendingRequests.length}</p>
              <p className="text-xs text-muted-foreground">قيد الانتظار</p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardContent className="p-4 text-center">
              <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mx-auto mb-2">
                <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <p className="text-2xl font-bold text-foreground">{inProgressRequests.length}</p>
              <p className="text-xs text-muted-foreground">قيد التنفيذ</p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardContent className="p-4 text-center">
              <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto mb-2">
                <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
              <p className="text-2xl font-bold text-foreground">{completedRequests.length}</p>
              <p className="text-xs text-muted-foreground">مكتملة</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* طلباتي مع نسبة التقدم */}
          <Card className="lg:col-span-2 border-0 shadow-sm">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="w-5 h-5 text-primary" />
                    طلباتي
                  </CardTitle>
                  <CardDescription>متابعة تقدم طلباتك</CardDescription>
                </div>
                <Link href="/my-requests">
                  <Button variant="ghost" size="sm">
                    عرض الكل
                    <ChevronLeft className="w-4 h-4 mr-1" />
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-20 bg-muted animate-pulse rounded-lg" />
                  ))}
                </div>
              ) : myRequests && myRequests.length > 0 ? (
                <div className="space-y-4">
                  {myRequests.slice(0, 5).map((request) => {
                    const progress = getProgressPercentage(request.currentStage);
                    return (
                      <Link key={request.id} href={`/requests/${request.id}`}>
                        <div className="p-4 bg-muted/30 rounded-xl hover:bg-muted/50 transition-colors cursor-pointer border border-transparent hover:border-primary/20">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-3">
                              <ProgramIcon program={request.programType} size="lg" showBackground />
                              <div>
                                <p className="font-medium text-foreground">
                                  {PROGRAM_LABELS[request.programType]}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {request.requestNumber}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Percent className="w-4 h-4 text-primary" />
                              <span className="text-lg font-bold text-primary">{progress}%</span>
                            </div>
                          </div>
                          <div className="space-y-1">
                            <Progress value={progress} className="h-2" />
                            <p className="text-xs text-muted-foreground text-left">
                              {progress === 100 ? "مكتمل" : "جاري المعالجة..."}
                            </p>
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                    <FileText className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <p className="text-muted-foreground mb-4">لا توجد طلبات حتى الآن</p>
                  <Link href="/request-form-dynamic">
                    <Button className="gradient-primary text-white">
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
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Bell className="w-5 h-5 text-primary" />
                    الإشعارات
                  </CardTitle>
                  <CardDescription>آخر التحديثات</CardDescription>
                </div>
                <Link href="/notifications">
                  <Button variant="ghost" size="sm">
                    عرض الكل
                    <ChevronLeft className="w-4 h-4 mr-1" />
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
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
                        <Badge variant="secondary" className="mt-2 text-xs">
                          جديد
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
                    <Bell className="w-6 h-6 text-muted-foreground" />
                  </div>
                  <p className="text-sm text-muted-foreground">لا توجد إشعارات</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* مساجدي */}
        <Card className="mt-6 border-0 shadow-sm">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-primary" />
                  مساجدي
                </CardTitle>
                <CardDescription>المساجد المسجلة باسمك</CardDescription>
              </div>
              <Link href="/my-mosques">
                <Button variant="ghost" size="sm">
                  عرض الكل
                  <ChevronLeft className="w-4 h-4 mr-1" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {myMosques && myMosques.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {myMosques.slice(0, 4).map((mosque) => (
                  <Link key={mosque.id} href={`/mosques/${mosque.id}`}>
                    <div className="p-4 bg-muted/30 rounded-xl hover:bg-muted/50 transition-colors cursor-pointer border border-transparent hover:border-primary/20">
                      <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-3">
                        <Building2 className="w-6 h-6 text-primary" />
                      </div>
                      <p className="font-medium text-foreground truncate">{mosque.name}</p>
                      <p className="text-sm text-muted-foreground truncate">{mosque.city}</p>
                      <Badge 
                        variant={mosque.approvalStatus === 'approved' ? 'default' : 'secondary'} 
                        className="mt-2 text-xs"
                      >
                        {mosque.approvalStatus === 'approved' ? 'معتمد' : 
                         mosque.approvalStatus === 'pending' ? 'قيد المراجعة' : 'مرفوض'}
                      </Badge>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
                  <Building2 className="w-6 h-6 text-muted-foreground" />
                </div>
                <p className="text-sm text-muted-foreground mb-4">لا توجد مساجد مسجلة</p>
                <Link href="/requester/mosques/new">
                  <Button variant="outline">
                    <Plus className="w-4 h-4 ml-2" />
                    تسجيل مسجد
                  </Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      {/* Footer */}
      <footer className="mt-12 py-6 border-t bg-white/50">
        <div className="container mx-auto px-4 text-center">
          <p className="text-sm text-muted-foreground">
            جمعية عمارة المساجد بمنطقة عسير - بوابة تمام للعناية بالمساجد
          </p>
        </div>
      </footer>
    </div>
  );
}
