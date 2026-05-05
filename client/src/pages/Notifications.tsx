import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Bell, CheckCheck, FileText, Building2, User, AlertCircle, Loader2 } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { ar } from "date-fns/locale";

const notificationIcons: Record<string, any> = {
  request_update: FileText,
  mosque: Building2,
  user: User,
  system: Bell,
  info: Bell,
};

export default function Notifications() {
  const utils = trpc.useContext();
  
  const { data, isLoading, error } = trpc.notifications.getMyNotifications.useQuery({
    limit: 50,
  });

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
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">الإشعارات</h1>
            <p className="text-muted-foreground">جميع الإشعارات والتنبيهات</p>
          </div>
          <Button 
            variant="outline" 
            className="flex items-center gap-2"
            onClick={() => markAllAsReadMutation.mutate()}
            disabled={markAllAsReadMutation.isPending || notifications.every(n => n.isRead)}
          >
            <CheckCheck className="w-4 h-4" />
            تحديد الكل كمقروء
          </Button>
        </div>

        {error && (
          <div className="bg-destructive/10 text-destructive p-4 rounded-lg flex items-center gap-3">
            <AlertCircle className="w-5 h-5" />
            <p>{error.message}</p>
          </div>
        )}

        <Card className="border-0 shadow-sm">
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-12 text-center">
                <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
                <p className="text-muted-foreground">جاري تحميل الإشعارات...</p>
              </div>
            ) : notifications.length > 0 ? (
              <div className="divide-y divide-border">
                {notifications.map((notification) => {
                  const Icon = notificationIcons[notification.type || "info"] || Bell;
                  return (
                    <div 
                      key={notification.id} 
                      className={`flex items-start gap-4 p-4 hover:bg-muted/50 transition-colors cursor-pointer ${!notification.isRead ? "bg-primary/5" : ""}`}
                      onClick={() => handleMarkAsRead(notification.id, !!notification.isRead)}
                    >
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${!notification.isRead ? "bg-primary/10" : "bg-muted"}`}>
                        <Icon className={`w-5 h-5 ${!notification.isRead ? "text-primary" : "text-muted-foreground"}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className={`font-medium ${!notification.isRead ? "text-foreground" : "text-muted-foreground"}`}>
                            {notification.title}
                          </p>
                          <span className="text-xs text-muted-foreground">
                            {notification.createdAt ? formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true, locale: ar }) : ""}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">{notification.message}</p>
                      </div>
                      {!notification.isRead && (
                        <div className="w-2 h-2 rounded-full bg-primary mt-2" />
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-8 text-center">
                <Bell className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">لا توجد إشعارات</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
