import React, { useState, useEffect, useMemo } from "react";
import { Link, useLocation } from "wouter";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Send, History, ArrowRight, AlertCircle, Loader2 } from "lucide-react";
import { trpc } from "@/lib/trpc";
import DirectNotificationTab from "@/components/DirectNotificationTab";
import NotificationLogsTab from "@/components/NotificationLogsTab";
import { useAuth } from "@/_core/hooks/useAuth";
import { useDocumentTitle } from "@/contexts/DocumentTitleContext";

export default function NotificationCenter() {
  useDocumentTitle("مركز الإشعارات");
  const [, setLocation] = useLocation();
  const { user, loading: authLoading } = useAuth();

  // جلب صلاحيات المستخدم بشكل فوري ومباشر لضمان التزامن اللحظي مع أي سحب أو تعديل للصلاحيات
  const { data: directPerms, isLoading: permsLoading } = trpc.permissions.getUserPermissions.useQuery(
    { userId: user?.id ?? 0 },
    { enabled: !!user, staleTime: 0 }
  );

  const isAuthOrPermsLoading = authLoading || (!!user && permsLoading);

  const userPerms: string[] = useMemo(() => {
    const set = new Set<string>();
    if (Array.isArray(directPerms)) {
      directPerms.forEach((p: string) => set.add(p));
    } else if (Array.isArray((user as any)?.permissions)) {
      (user as any).permissions.forEach((p: string) => set.add(p));
    }
    return Array.from(set);
  }, [user, directPerms]);

  const hasWildcard = userPerms.includes("*");

  const hasStaffPerm = userPerms.includes("notification_center.direct_send_staff");
  const hasBeneficiaryPerm = userPerms.includes("notification_center.direct_send_beneficiary");

  const canSendStaff = hasStaffPerm || (hasWildcard && !hasBeneficiaryPerm && !userPerms.some(p => p.startsWith("notification_center.")));
  const canSendBeneficiary = hasBeneficiaryPerm || (hasWildcard && !hasStaffPerm && !userPerms.some(p => p.startsWith("notification_center.")));
  const canDirectSend = canSendStaff || canSendBeneficiary;
  const canSendLogs = hasWildcard || userPerms.includes("notification_center.view") || userPerms.includes("notification_center.send_logs");

  const availableTabs = [
    ...(canDirectSend ? [{ value: "direct_send", label: "إرسال إشعار مباشر", icon: Send }] : []),
    ...(canSendLogs ? [{ value: "logs", label: "سجل إرسال الإشعارات", icon: History }] : []),
  ];

  const [activeTab, setActiveTab] = useState<string>(() => {
    if (canDirectSend) return "direct_send";
    if (canSendLogs) return "logs";
    return "direct_send";
  });

  useEffect(() => {
    if (availableTabs.length > 0 && !availableTabs.some((t) => t.value === activeTab)) {
      setActiveTab(availableTabs[0].value);
    }
  }, [availableTabs, activeTab]);

  const { data: dbRoles } = trpc.permissions.getRoles.useQuery();

  if (isAuthOrPermsLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-24" dir="rtl">
          <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
        </div>
      </DashboardLayout>
    );
  }

  // إذا لم يملك المستخدم أي صلاحية من صلاحيات مركز الإشعارات، يتم حجب الصفحة وإظهار رسالة عدم التصريح
  if (!canDirectSend && !canSendLogs) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center py-20 text-center space-y-4" dir="rtl">
          <AlertCircle className="h-14 w-14 text-rose-500" />
          <h2 className="text-xl font-bold">عذراً، الوصول غير مصرح به</h2>
          <p className="text-muted-foreground max-w-md">
            مركز الإشعارات متاح حصراً لمن يملكون صلاحيات إرسال الإشعارات أو مراجعة سجلات الإرسال.
          </p>
          <Button onClick={() => setLocation("/settings")} variant="outline" className="mt-2">
            العودة للإعدادات
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6" dir="rtl">
        {/* رأس الصفحة مع زر العودة للإعدادات */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border/40">
          <div className="flex items-center gap-3">
            <Link href="/settings">
              <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer" title="العودة للإعدادات">
                <ArrowRight className="h-5 w-5 text-muted-foreground" />
              </Button>
            </Link>
            <div>
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shadow-xs">
                  <Send className="w-4 h-4" />
                </div>
                <h1 className="text-xl sm:text-2xl font-black text-foreground tracking-tight">
                  مركز الإشعارات
                </h1>
              </div>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                إرسال إشعارات مباشرة للمستفيدين والموظفين ومتابعة سجلات التسليم وحالات الإرسال
              </p>
            </div>
          </div>
        </div>

        {/* التبويبات الرئيسية مع التوسيط */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full space-y-6">
          <div className="flex justify-center w-full">
            <TabsList className="bg-slate-100/80 dark:bg-slate-900/50 p-1.5 rounded-2xl h-auto flex flex-wrap justify-center gap-1.5 border border-border/50 shadow-xs max-w-fit">
              {availableTabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <TabsTrigger
                    key={tab.value}
                    value={tab.value}
                    className="data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 data-[state=active]:text-blue-600 dark:data-[state=active]:text-blue-400 data-[state=active]:shadow-xs rounded-xl px-5 py-2.5 text-xs sm:text-sm font-bold flex items-center gap-2 transition-all cursor-pointer"
                  >
                    <Icon className="w-4 h-4" />
                    <span>{tab.label}</span>
                  </TabsTrigger>
                );
              })}
            </TabsList>
          </div>

          {canDirectSend && (
            <TabsContent value="direct_send" className="space-y-6 focus-visible:outline-none mt-0">
              <DirectNotificationTab 
                dbRoles={dbRoles} 
                canSendStaff={canSendStaff}
                canSendBeneficiary={canSendBeneficiary}
              />
            </TabsContent>
          )}

          {canSendLogs && (
            <TabsContent value="logs" className="space-y-6 focus-visible:outline-none mt-0">
              <NotificationLogsTab dbRoles={dbRoles} />
            </TabsContent>
          )}
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
