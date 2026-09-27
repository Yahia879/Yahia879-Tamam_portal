import { useState, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import BeneficiaryLayout from "@/components/BeneficiaryLayout";
import EnhancedPagination, { usePersistedPage } from "@/components/EnhancedPagination";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Bell, 
  CheckCheck, 
  FileText, 
  Building2, 
  User, 
  AlertCircle, 
  Loader2, 
  ArrowRight, 
  ArrowLeft, 
  Star,
  Boxes,
  Package,
  Truck,
  PackageCheck,
  ShoppingCart,
  FileSignature,
  Sparkles,
  SlidersHorizontal,
} from "lucide-react";
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
  sedana: Boxes,
  sedana_execution: Truck,
  sedana_procurement: ShoppingCart,
  sedana_inquiry: FileSignature,
};

export default function Notifications() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();
  const [page, setPage] = usePersistedPage("notifications_page");
  const [category, setCategory] = useState<"all" | "sedana" | "requests" | "financial" | "unread">("all");
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
    category,
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
        {/* شريط العنوان وزر تحديد الكل كمقروء */}
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
                {isEn ? "All notifications, warehouse alerts and system updates" : "جميع الإشعارات والتنبيهات وحركات سدانة والمشاريع"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            {user?.role !== "service_requester" && (
              <Link href="/notifications/customization">
                <Button 
                  variant="outline" 
                  className="flex items-center gap-1.5 h-9 sm:h-10 text-xs sm:text-sm text-muted-foreground hover:text-foreground border-border bg-card cursor-pointer"
                >
                  <SlidersHorizontal className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                  <span>{isEn ? "Customize" : "تخصيص الإشعارات"}</span>
                </Button>
              </Link>
            )}
            <Button 
              variant="outline" 
              className="flex items-center gap-2 flex-1 sm:flex-initial h-9 sm:h-10 text-xs sm:text-sm"
              onClick={() => markAllAsReadMutation.mutate()}
              disabled={markAllAsReadMutation.isPending || !unreadCountData || unreadCountData === 0}
            >
              <CheckCheck className="w-4 h-4" />
              {isEn ? "Mark all as read" : "تحديد الكل كمقروء"}
            </Button>
          </div>
        </div>

        {/* شريط التصنيفات والفلترة السريعة */}
        <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto pb-1 no-scrollbar border-b border-border/40">
          {[
            { id: "all", labelAr: "جميع الإشعارات", labelEn: "All", count: data?.total },
            { 
              id: "sedana", 
              labelAr: "برنامج سدانة", 
              labelEn: "Sedana Program", 
              count: data?.sedanaCount, 
              badgeColor: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400" 
            },
            { id: "requests", labelAr: "الطلبات والمشاريع", labelEn: "Requests & Mosques" },
            { id: "financial", labelAr: "المالية والعقود", labelEn: "Financial" },
            { 
              id: "unread", 
              labelAr: "غير مقروءة", 
              labelEn: "Unread", 
              count: unreadCountData, 
              badgeColor: "bg-amber-500/15 text-amber-700 dark:text-amber-400" 
            },
          ].map((tab) => {
            const isActive = category === tab.id;
            return (
              <Button
                key={tab.id}
                variant={isActive ? "default" : "ghost"}
                size="sm"
                onClick={() => {
                  setCategory(tab.id as any);
                  setPage(1);
                }}
                className={`h-8 sm:h-9 text-xs font-semibold rounded-lg shrink-0 gap-1.5 transition-all ${
                  isActive 
                    ? "shadow-xs" 
                    : "hover:bg-muted text-muted-foreground hover:text-foreground"
                }`}
              >
                <span>{isEn ? tab.labelEn : tab.labelAr}</span>
                {tab.count !== undefined && tab.count !== null && tab.count > 0 && (
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                    isActive 
                      ? "bg-primary-foreground/20 text-primary-foreground" 
                      : tab.badgeColor || "bg-muted text-muted-foreground"
                  }`}>
                    {tab.count}
                  </span>
                )}
              </Button>
            );
          })}
        </div>

        {error && (
          <div className="bg-destructive/10 text-destructive p-3 sm:p-4 rounded-lg flex items-center gap-2 sm:gap-3">
            <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
            <p className="text-xs sm:text-sm">{error.message}</p>
          </div>
        )}

        <Card className="border-0 shadow-xs overflow-hidden">
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
                    const isSedanaNotif = 
                      Boolean(notification.relatedType && notification.relatedType.startsWith("sedana")) || 
                      notification.title.includes("سدانة") || 
                      notification.message.includes("سدانة");

                    // اختيار الأيقونة الأنسب لنوع الإشعار
                    let SedanaIcon = Boxes;
                    if (
                      notification.relatedType === "sedana_procurement" || 
                      notification.title.includes("أمر شراء") || 
                      notification.title.includes("تأمين")
                    ) {
                      SedanaIcon = ShoppingCart;
                    } else if (
                      notification.relatedType === "sedana_inquiry" || 
                      notification.title.includes("استبيان")
                    ) {
                      SedanaIcon = FileSignature;
                    } else if (
                      notification.title.includes("شحنة") || 
                      notification.title.includes("صرف وتوزيع") || 
                      notification.title.includes("توريد")
                    ) {
                      SedanaIcon = Truck;
                    } else if (
                      notification.title.includes("تأكيد استلام") || 
                      notification.title.includes("توثيق")
                    ) {
                      SedanaIcon = PackageCheck;
                    }

                    const Icon = isEvalNotif 
                      ? Star 
                      : isSedanaNotif 
                      ? SedanaIcon 
                      : (notificationIcons[notification.type || "info"] || Bell);

                    // تخصيص الحدود والتلوين بناءً على القراءة وتصنيف سدانة
                    const unreadBorderClass = !notification.isRead 
                      ? (isSedanaNotif
                          ? (isEn ? "bg-emerald-50/40 dark:bg-emerald-950/15 border-l-4 border-l-emerald-600" : "bg-emerald-50/40 dark:bg-emerald-950/15 border-r-4 border-r-emerald-600")
                          : (isEn ? "bg-primary/5 border-l-4 border-l-primary" : "bg-primary/5 border-r-4 border-r-primary")) 
                      : "";

                    const iconBoxClass = isEvalNotif 
                      ? "bg-amber-500/20 text-amber-500" 
                      : isSedanaNotif 
                      ? (!notification.isRead 
                          ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400" 
                          : "bg-emerald-500/10 text-emerald-600/70 dark:text-emerald-400/70")
                      : !notification.isRead 
                      ? "bg-primary/10 text-primary" 
                      : "bg-muted text-muted-foreground";

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
                          } else if (notification.relatedType === "sedana_inquiry") {
                            setLocation(isRequester ? "/sedana-request" : "/sedana/inquiries");
                          } else if (notification.relatedType === "sedana_procurement" && notification.relatedId) {
                            setLocation(`/sedana/procurement/${notification.relatedId}`);
                          } else if (
                            (notification.relatedType === "sedana" || notification.relatedType === "sedana_execution") && 
                            notification.relatedId
                          ) {
                            setLocation(isRequester ? `/requests/${notification.relatedId}` : `/sedana/execution?requestId=${notification.relatedId}`);
                          } else if (notification.relatedType === "request" && notification.relatedId) {
                            setLocation(`/requests/${notification.relatedId}`);
                          }
                        }}
                      >
                        <div className="flex items-start gap-3 sm:gap-4 flex-1 min-w-0">
                          <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center shrink-0 ${iconBoxClass}`}>
                            <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className={`text-sm sm:text-base font-medium truncate ${!notification.isRead ? "text-foreground font-bold" : "text-muted-foreground"}`} title={notification.title}>
                                  {notification.title}
                                </p>
                                {isSedanaNotif && (
                                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
                                    <Sparkles className="w-2.5 h-2.5" />
                                    {isEn ? "Sedana" : "برنامج سدانة"}
                                  </span>
                                )}
                              </div>
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
                              <Button size="sm" className="gap-1.5 bg-amber-500 hover:bg-amber-600 text-white font-bold shadow-xs text-xs">
                                <Star className="w-3.5 h-3.5 fill-current" />
                                {isEn ? "Evaluate Service" : "تقييم الخدمة"}
                              </Button>
                            </Link>
                          </div>
                        )}

                        {/* زر العمل المباشر الخاص بإشعارات سدانة */}
                        {isSedanaNotif && (
                          <div className="shrink-0 pt-2 sm:pt-0 self-end sm:self-center flex items-center gap-2">
                            {notification.relatedType === "sedana_inquiry" ? (
                              <Link href={isRequester ? "/sedana-request" : "/sedana/inquiries"} onClick={(e) => e.stopPropagation()}>
                                <Button size="sm" variant="outline" className="gap-1.5 text-xs text-cyan-700 dark:text-cyan-300 border-cyan-300 dark:border-cyan-800 hover:bg-cyan-50 dark:hover:bg-cyan-950/40">
                                  <FileSignature className="w-3.5 h-3.5" />
                                  {isEn ? "View Inquiry" : "عرض الاستبيان"}
                                </Button>
                              </Link>
                            ) : notification.relatedType === "sedana_procurement" && notification.relatedId ? (
                              <Link href={`/sedana/procurement/${notification.relatedId}`} onClick={(e) => e.stopPropagation()}>
                                <Button size="sm" variant="outline" className="gap-1.5 text-xs text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-800 hover:bg-amber-50 dark:hover:bg-amber-950/40">
                                  <ShoppingCart className="w-3.5 h-3.5" />
                                  {isEn ? "Procurement" : "أمر الشراء والتأمين"}
                                </Button>
                              </Link>
                            ) : notification.relatedId ? (
                              <Link href={isRequester ? `/requests/${notification.relatedId}` : `/sedana/execution?requestId=${notification.relatedId}`} onClick={(e) => e.stopPropagation()}>
                                <Button size="sm" className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-xs text-xs">
                                  <PackageCheck className="w-3.5 h-3.5" />
                                  {notification.title.includes("شحنة") || notification.title.includes("استلام")
                                    ? (isRequester ? (isEn ? "Confirm Receipt" : "تأكيد الاستلام") : (isEn ? "Track Shipment" : "متابعة الشحنة"))
                                    : (isEn ? "View Details" : "عرض التفاصيل")}
                                </Button>
                              </Link>
                            ) : null}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
                {data && data.totalPages > 1 && (
                  <EnhancedPagination
                    page={page}
                    totalPages={data.totalPages}
                    onPageChange={(p) => {
                      setPage(p);
                    }}
                    totalItems={data.total}
                    itemsPerPage={limit}
                    itemName={isEn ? "notification" : "إشعار"}
                    itemNamePlural={isEn ? "notifications" : "إشعارات"}
                    isEn={isEn}
                  />
                )}
              </div>
            ) : (
              <div className="p-8 sm:p-12 text-center">
                {category === "sedana" ? (
                  <>
                    <Boxes className="w-10 h-10 sm:w-12 sm:h-12 text-emerald-500/40 mx-auto mb-3 sm:mb-4" />
                    <p className="text-sm font-medium text-foreground">لا توجد إشعارات لبرنامج سدانة حالياً</p>
                    <p className="text-xs text-muted-foreground mt-1">ستظهر هنا تنبيهات أوامر التوريد، التوزيع، وإثباتات الاستلام للمساجد</p>
                  </>
                ) : (
                  <>
                    <Bell className="w-10 h-10 sm:w-12 sm:h-12 text-muted-foreground mx-auto mb-3 sm:mb-4" />
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      {isEn ? "No notifications" : "لا توجد إشعارات"}
                    </p>
                  </>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
