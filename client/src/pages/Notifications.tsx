import { useState, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import BeneficiaryLayout from "@/components/BeneficiaryLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Bell, CheckCheck, FileText, Building2, User, AlertCircle, Loader2, ChevronRight, ChevronLeft, ArrowRight, ArrowLeft, Star } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { useAuth } from "@/_core/hooks/useAuth";
import { Link, useLocation } from "wouter";

const notificationIcons: Record<string, any> = {
  request_update: FileText,
  request: FileText,
  mosque: Building2,
  user: User,
  system: Bell,
  info: Bell,
  request_evaluation: Star,
};

export default function Notifications() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();
  const [page, setPage] = useState(1);
  const limit = 10;

  // حالة اللغة الخاصة بدور الاستجابة السريعة (quick_response)
  const customRoleNameAr = (user as any)?.customRole?.nameAr || "";
  const customRoleNameEn = (user as any)?.customRole?.nameEn || "";
  const isQuickResponse = 
    user?.role === "quick_response" ||
    user?.name === "فريق الاستجابة السريعة" ||
    customRoleNameAr.includes("استجابة") ||
    customRoleNameEn.includes("quick_response") ||
    customRoleNameEn.toLowerCase().includes("quick");

  const [quickResponseLang, setQuickResponseLang] = useState<"ar" | "en">(() => {
    return (localStorage.getItem("quick-response-lang") as "ar" | "en") || "ar";
  });

  useEffect(() => {
    const handleStorageChange = () => {
      const stored = localStorage.getItem("quick-response-lang") as "ar" | "en";
      if (stored && (stored === "ar" || stored === "en")) {
        setQuickResponseLang(stored);
      }
    };
    window.addEventListener("storage", handleStorageChange);
    window.addEventListener("quick-response-lang-change", handleStorageChange);
    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("quick-response-lang-change", handleStorageChange);
    };
  }, []);

  const isEn = isQuickResponse && quickResponseLang === "en";
  
  const { data, isLoading, error } = trpc.notifications.getMyNotifications.useQuery({
    page,
    limit,
  });

  const { data: unreadCountData } = trpc.notifications.getUnreadCount.useQuery();

  const markAsReadMutation = trpc.notifications.markAsRead.useMutation({
    onSuccess: () => {
      utils.notifications.getMyNotifications.invalidate();
      utils.notifications.getUnreadCount.invalidate();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const markAllAsReadMutation = trpc.notifications.markAllAsRead.useMutation({
    onSuccess: () => {
      utils.notifications.getMyNotifications.invalidate();
      utils.notifications.getUnreadCount.invalidate();
      toast.success(isEn ? "All marked as read" : "تم تحديد الكل كمقروء");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleMarkAsRead = (id: number, isRead: boolean) => {
    if (!isRead) {
      markAsReadMutation.mutate({ id });
    }
  };

  const notifications = data?.notifications || [];
  const isRequester = user?.role === "service_requester";
  const Layout = isRequester ? BeneficiaryLayout : DashboardLayout;

  return (
    <Layout>
      <div className="space-y-4 sm:space-y-6" dir={isEn ? "ltr" : "rtl"}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3 sm:gap-4">
            <Link href={user?.role === "service_requester" ? "/requester" : "/dashboard"}>
              <Button variant="ghost" size="icon" className="flex-shrink-0">
                {isEn ? <ArrowLeft className="w-5 h-5" /> : <ArrowRight className="w-5 h-5" />}
              </Button>
            </Link>
            <div className="min-w-0">
              <h1 className="text-xl sm:text-2xl font-bold text-foreground">
                {isEn ? "Notifications" : "الإشعارات"}
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground">
                {isEn ? "All notifications and alerts" : "جميع الإشعارات والتنبيهات"}
              </p>
            </div>
          </div>
          <Button 
            variant="outline" 
            className="flex items-center gap-2 w-full sm:w-auto h-9 sm:h-10 text-xs sm:text-sm"
            onClick={() => markAllAsReadMutation.mutate()}
            disabled={markAllAsReadMutation.isPending || !unreadCountData || unreadCountData === 0}
          >
            <CheckCheck className="w-4 h-4" />
            {isEn ? "Mark all as read" : "تحديد الكل كمقروء"}
          </Button>
        </div>

        {error && (
          <div className="bg-destructive/10 text-destructive p-3 sm:p-4 rounded-lg flex items-center gap-2 sm:gap-3">
            <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
            <p className="text-xs sm:text-sm">{error.message}</p>
          </div>
        )}

        <Card className="border-0 shadow-sm overflow-hidden">
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-8 sm:p-12 text-center">
                <Loader2 className="w-6 h-6 sm:w-8 sm:h-8 animate-spin text-primary mx-auto mb-3 sm:mb-4" />
                <p className="text-xs sm:text-sm text-muted-foreground">
                  {isEn ? "Loading notifications..." : "جاري تحميل الإشعارات..."}
                </p>
              </div>
            ) : notifications.length > 0 ? (
              <div className="flex flex-col">
                <div className="divide-y divide-border">
                  {notifications.map((notification) => {
                    const isEvalNotif = notification.relatedType === "request_evaluation";
                    const Icon = isEvalNotif ? Star : (notificationIcons[notification.type || "info"] || Bell);
                    const unreadBorderClass = !notification.isRead 
                      ? (isEn ? "bg-primary/5 border-l-4 border-l-primary" : "bg-primary/5 border-r-4 border-r-primary") 
                      : "";
                    return (
                      <div 
                        key={notification.id} 
                        className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 p-3.5 sm:p-4 hover:bg-muted/50 transition-colors cursor-pointer ${unreadBorderClass}`}
                        onClick={() => {
                          if (!notification.isRead) {
                            handleMarkAsRead(notification.id, false);
                          }
                          if (isEvalNotif && notification.relatedId) {
                            setLocation(`/requests/${notification.relatedId}/evaluation`);
                          } else if (notification.relatedType === "request" && notification.relatedId) {
                            setLocation(`/requests/${notification.relatedId}`);
                          }
                        }}
                      >
                        <div className="flex items-start gap-3 sm:gap-4 flex-1 min-w-0">
                          <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center shrink-0 ${isEvalNotif ? "bg-amber-500/20 text-amber-500" : !notification.isRead ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
                            <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                              <p className={`text-sm sm:text-base font-medium truncate ${!notification.isRead ? "text-foreground font-bold" : "text-muted-foreground"}`} title={notification.title}>
                                {notification.title}
                              </p>
                              <span className="text-[10px] sm:text-xs text-muted-foreground shrink-0">
                                {notification.createdAt ? (() => {
                                  const d = new Date(notification.createdAt);
                                  return format(d, 'dd MMM yyyy, hh:mm a', isEn ? undefined : { locale: ar });
                                })() : ""}
                              </span>
                            </div>
                            <p className="text-xs sm:text-sm text-muted-foreground mt-1 leading-relaxed">
                              {notification.message}
                            </p>
                          </div>
                        </div>

                        {/* زر العمل المباشر للتقييم */}
                        {isEvalNotif && notification.relatedId && (
                          <div className="shrink-0 pt-2 sm:pt-0 self-end sm:self-center">
                            <Link href={`/requests/${notification.relatedId}/evaluation`} onClick={(e) => e.stopPropagation()}>
                              <Button size="sm" className="gap-1.5 bg-amber-500 hover:bg-amber-600 text-white font-bold shadow-sm text-xs">
                                <Star className="w-3.5 h-3.5 fill-current" />
                                {isEn ? "Evaluate Service" : "تقييم الخدمة"}
                              </Button>
                            </Link>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
                {data && data.total > limit && (
                  <div className="flex flex-col sm:flex-row items-center justify-between border-t border-border/60 p-4 gap-4 bg-slate-50/50 dark:bg-slate-900/20" dir={isEn ? "ltr" : "rtl"}>
                    <div className="text-xs text-muted-foreground font-semibold">
                      {isEn 
                        ? `Showing ${(page - 1) * limit + 1} - ${Math.min(page * limit, data.total)} of ${data.total} notifications`
                        : `يتم عرض ${(page - 1) * limit + 1} - ${Math.min(page * limit, data.total)} من أصل ${data.total} إشعار`
                      }
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage(p => Math.max(1, p - 1))}
                        disabled={page === 1}
                        className="h-8 flex items-center gap-1.5 hover:bg-muted/80 transition-colors rounded-lg text-xs font-semibold"
                      >
                        {isEn ? <ChevronLeft className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                        {isEn ? "Previous" : "السابق"}
                      </Button>
                      <div className="text-xs font-bold px-3 py-1.5 rounded-md bg-muted text-muted-foreground border border-border/40">
                        {isEn ? `Page ${page} of ${data.totalPages}` : `صفحة ${page} من ${data.totalPages}`}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage(p => Math.min(data.totalPages, p + 1))}
                        disabled={page >= data.totalPages}
                        className="h-8 flex items-center gap-1.5 hover:bg-muted/80 transition-colors rounded-lg text-xs font-semibold"
                      >
                        {isEn ? "Next" : "التالي"}
                        {isEn ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-6 sm:p-8 text-center">
                <Bell className="w-10 h-10 sm:w-12 sm:h-12 text-muted-foreground mx-auto mb-3 sm:mb-4" />
                <p className="text-xs sm:text-sm text-muted-foreground">
                  {isEn ? "No notifications" : "لا توجد إشعارات"}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
