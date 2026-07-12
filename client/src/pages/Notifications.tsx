import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Bell, CheckCheck, FileText, Building2, User, AlertCircle, Loader2, ChevronRight, ChevronLeft, ArrowRight } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { useAuth } from "@/_core/hooks/useAuth";
import { Link } from "wouter";

const notificationIcons: Record<string, any> = {
  request_update: FileText,
  request: FileText,
  mosque: Building2,
  user: User,
  system: Bell,
  info: Bell,
};

export default function Notifications() {
  const { user } = useAuth();
  const utils = trpc.useContext();
  const [page, setPage] = useState(1);
  const limit = 10;
  
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
      toast.success("تم تحديد الكل كمقروء");
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

  return (
    <DashboardLayout>
      <div className="space-y-4 sm:space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3 sm:gap-4">
            <Link href={user?.role === "service_requester" ? "/requester" : "/dashboard"}>
              <Button variant="ghost" size="icon" className="flex-shrink-0">
                <ArrowRight className="w-5 h-5" />
              </Button>
            </Link>
            <div className="min-w-0">
              <h1 className="text-xl sm:text-2xl font-bold text-foreground">الإشعارات</h1>
              <p className="text-xs sm:text-sm text-muted-foreground">جميع الإشعارات والتنبيهات</p>
            </div>
          </div>
          <Button 
            variant="outline" 
            className="flex items-center gap-2 w-full sm:w-auto h-9 sm:h-10 text-xs sm:text-sm"
            onClick={() => markAllAsReadMutation.mutate()}
            disabled={markAllAsReadMutation.isPending || !unreadCountData || unreadCountData === 0}
          >
            <CheckCheck className="w-4 h-4" />
            تحديد الكل كمقروء
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
                <p className="text-xs sm:text-sm text-muted-foreground">جاري تحميل الإشعارات...</p>
              </div>
            ) : notifications.length > 0 ? (
              <div className="flex flex-col">
                <div className="divide-y divide-border">
                  {notifications.map((notification) => {
                    const Icon = notificationIcons[notification.type || "info"] || Bell;
                    return (
                      <div 
                        key={notification.id} 
                        className={`flex items-start gap-3 sm:gap-4 p-3 sm:p-4 hover:bg-muted/50 transition-colors cursor-pointer ${!notification.isRead ? "bg-primary/5" : ""}`}
                        onClick={() => handleMarkAsRead(notification.id, !!notification.isRead)}
                      >
                        <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center shrink-0 ${!notification.isRead ? "bg-primary/10" : "bg-muted"}`}>
                          <Icon className={`w-4 h-4 sm:w-5 sm:h-5 ${!notification.isRead ? "text-primary" : "text-muted-foreground"}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                            <p className={`text-sm sm:text-base font-medium truncate ${!notification.isRead ? "text-foreground" : "text-muted-foreground"}`} title={notification.title}>
                              {notification.title}
                            </p>
                            <span className="text-[10px] sm:text-xs text-muted-foreground shrink-0">
                              {notification.createdAt ? (() => {
                                const d = new Date(notification.createdAt);
                                return format(d, 'dd MMM yyyy, hh:mm a', { locale: ar });
                              })() : ""}
                            </span>
                          </div>
                          <p className="text-xs sm:text-sm text-muted-foreground mt-1 line-clamp-2 sm:line-clamp-none leading-relaxed">
                            {notification.message}
                          </p>
                        </div>
                        {!notification.isRead && (
                          <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-primary mt-1.5 sm:mt-2 shrink-0" />
                        )}
                      </div>
                    );
                  })}
                </div>
                {data && data.total > limit && (
                  <div className="flex flex-col sm:flex-row items-center justify-between border-t border-border/60 p-4 gap-4 bg-slate-50/50 dark:bg-slate-900/20" dir="rtl">
                    <div className="text-xs text-muted-foreground font-semibold">
                      يتم عرض {(page - 1) * limit + 1} - {Math.min(page * limit, data.total)} من أصل {data.total} إشعار
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage(p => Math.max(1, p - 1))}
                        disabled={page === 1}
                        className="h-8 flex items-center gap-1.5 hover:bg-muted/80 transition-colors rounded-lg text-xs font-semibold"
                      >
                        <ChevronRight className="w-3.5 h-3.5" />
                        السابق
                      </Button>
                      <div className="text-xs font-bold px-3 py-1.5 rounded-md bg-muted text-muted-foreground border border-border/40">
                        صفحة {page} من {data.totalPages}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage(p => Math.min(data.totalPages, p + 1))}
                        disabled={page >= data.totalPages}
                        className="h-8 flex items-center gap-1.5 hover:bg-muted/80 transition-colors rounded-lg text-xs font-semibold"
                      >
                        التالي
                        <ChevronLeft className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-6 sm:p-8 text-center">
                <Bell className="w-10 h-10 sm:w-12 sm:h-12 text-muted-foreground mx-auto mb-3 sm:mb-4" />
                <p className="text-xs sm:text-sm text-muted-foreground">لا توجد إشعارات</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
