import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Bell, CheckCheck, FileText, Building2, User } from "lucide-react";
import { trpc } from "@/lib/trpc";

const notificationIcons: Record<string, any> = {
  request: FileText,
  mosque: Building2,
  user: User,
  system: Bell,
};

export default function Notifications() {
  // يمكن إضافة استعلام للإشعارات هنا
  const notifications = [
    { id: 1, type: "request", title: "طلب جديد", message: "تم تقديم طلب جديد لبرنامج بنيان", time: "منذ 5 دقائق", read: false },
    { id: 2, type: "mosque", title: "مسجد جديد", message: "تم تسجيل مسجد جديد بانتظار الاعتماد", time: "منذ ساعة", read: false },
    { id: 3, type: "user", title: "مستخدم جديد", message: "تم تسجيل مستخدم جديد بانتظار الاعتماد", time: "منذ 3 ساعات", read: true },
    { id: 4, type: "system", title: "تحديث النظام", message: "تم تحديث النظام بنجاح", time: "أمس", read: true },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">الإشعارات</h1>
            <p className="text-muted-foreground">جميع الإشعارات والتنبيهات</p>
          </div>
          <Button variant="outline" className="flex items-center gap-2">
            <CheckCheck className="w-4 h-4" />
            تحديد الكل كمقروء
          </Button>
        </div>

        <Card className="border-0 shadow-sm">
          <CardContent className="p-0">
            {notifications.length > 0 ? (
              <div className="divide-y divide-border">
                {notifications.map((notification) => {
                  const Icon = notificationIcons[notification.type] || Bell;
                  return (
                    <div 
                      key={notification.id} 
                      className={`flex items-start gap-4 p-4 hover:bg-muted/50 transition-colors cursor-pointer ${!notification.read ? "bg-primary/5" : ""}`}
                    >
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${!notification.read ? "bg-primary/10" : "bg-muted"}`}>
                        <Icon className={`w-5 h-5 ${!notification.read ? "text-primary" : "text-muted-foreground"}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className={`font-medium ${!notification.read ? "text-foreground" : "text-muted-foreground"}`}>
                            {notification.title}
                          </p>
                          <span className="text-xs text-muted-foreground">{notification.time}</span>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">{notification.message}</p>
                      </div>
                      {!notification.read && (
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
