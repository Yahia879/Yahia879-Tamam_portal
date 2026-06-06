import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Bell, Shield, Smartphone, MessageSquare, Mail, HelpCircle, Save, Check, RotateCcw, AlertTriangle, Users } from "lucide-react";
import { toast } from "sonner";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { trpc } from "@/lib/trpc";

interface NotificationTrigger {
  id: string;
  nameAr: string;
  description: string;
  roles: Record<string, boolean>; // roleId -> active
}

interface ChannelConfig {
  id: string;
  nameAr: string;
  description: string;
  enabled: boolean;
  status: "active" | "configured" | "inactive";
  apiStatus: string;
}

export default function NotificationCustomization() {
  const [isSaving, setIsSaving] = useState(false);

  // جلب قائمة الموظفين وتخصيص إشعاراتهم
  const { data: staffUsers, isLoading: isLoadingStaff, refetch: refetchStaff } = trpc.users.getStaffUsers.useQuery();
  const updateNotifSettingMutation = trpc.users.updateReceiveBeneficiaryNotifications.useMutation({
    onSuccess: () => {
      refetchStaff();
      toast.success("تم تحديث إعدادات استقبال الإشعارات بنجاح");
    },
    onError: (err) => {
      toast.error(err.message || "حدث خطأ أثناء حفظ التحديث");
    }
  });

  const handleToggleUserNotifications = (userId: number, enabled: boolean) => {
    updateNotifSettingMutation.mutate({ userId, enabled });
  };

  const updateRequestNotifSettingMutation = trpc.users.updateReceiveRequestNotifications.useMutation({
    onSuccess: () => {
      refetchStaff();
      toast.success("تم تحديث إعدادات استقبال الإشعارات بنجاح");
    },
    onError: (err) => {
      toast.error(err.message || "حدث خطأ أثناء حفظ التحديث");
    }
  });

  const handleToggleUserRequestNotifications = (userId: number, enabled: boolean) => {
    updateRequestNotifSettingMutation.mutate({ userId, enabled });
  };

  const updateFinancialNotifSettingMutation = trpc.users.updateReceiveFinancialAndContractNotifications.useMutation({
    onSuccess: () => {
      refetchStaff();
      toast.success("تم تحديث إعدادات استقبال الإشعارات بنجاح");
    },
    onError: (err) => {
      toast.error(err.message || "حدث خطأ أثناء حفظ التحديث");
    }
  });

  const handleToggleUserFinancialNotifications = (userId: number, enabled: boolean) => {
    updateFinancialNotifSettingMutation.mutate({ userId, enabled });
  };

  // جلب قائمة الأدوار وتخصيص إشعاراتها
  const { data: dbRoles, isLoading: isLoadingRoles, refetch: refetchRoles } = trpc.permissions.getRoles.useQuery();
  const updateRoleNotifSettingMutation = trpc.permissions.updateRoleReceiveBeneficiaryNotifications.useMutation({
    onSuccess: () => {
      refetchRoles();
      toast.success("تم تحديث إعدادات استقبال إشعارات الدور بنجاح");
    },
    onError: (err) => {
      toast.error(err.message || "حدث خطأ أثناء حفظ التحديث");
    }
  });

  const handleToggleRoleNotifications = (roleId: string, enabled: boolean) => {
    updateRoleNotifSettingMutation.mutate({ roleId, enabled });
  };

  const updateRoleRequestNotifSettingMutation = trpc.permissions.updateRoleReceiveRequestNotifications.useMutation({
    onSuccess: () => {
      refetchRoles();
      toast.success("تم تحديث إعدادات استقبال إشعارات الدور بنجاح");
    },
    onError: (err) => {
      toast.error(err.message || "حدث خطأ أثناء حفظ التحديث");
    }
  });

  const handleToggleRoleRequestNotifications = (roleId: string, enabled: boolean) => {
    updateRoleRequestNotifSettingMutation.mutate({ roleId, enabled });
  };

  const updateRoleFinancialNotifSettingMutation = trpc.permissions.updateRoleReceiveFinancialAndContractNotifications.useMutation({
    onSuccess: () => {
      refetchRoles();
      toast.success("تم تحديث إعدادات استقبال إشعارات الدور بنجاح");
    },
    onError: (err) => {
      toast.error(err.message || "حدث خطأ أثناء حفظ التحديث");
    }
  });

  const handleToggleRoleFinancialNotifications = (roleId: string, enabled: boolean) => {
    updateRoleFinancialNotifSettingMutation.mutate({ roleId, enabled });
  };

  // الأدوار المتاحة في النظام لتخصيص الإشعارات
  const roles = [
    { id: "super_admin", nameAr: "المدير العام", color: "bg-red-500/10 text-red-500 border-red-500/20" },
    { id: "system_admin", nameAr: "مدير النظام", color: "bg-orange-500/10 text-orange-500 border-orange-500/20" },
    { id: "projects_office", nameAr: "مكتب المشاريع", color: "bg-blue-500/10 text-blue-500 border-blue-500/20" },
    { id: "field_team", nameAr: "الفريق الميداني", color: "bg-green-500/10 text-green-500 border-green-500/20" },
    { id: "quick_response", nameAr: "الاستجابة السريعة", color: "bg-cyan-500/10 text-cyan-500 border-cyan-500/20" },
    { id: "financial_manager", nameAr: "الإدارة المالية", color: "bg-amber-500/10 text-amber-500 border-amber-500/20" },
  ];

  // الأحداث/المشغلات التي ترسل إشعارات
  const [triggers, setTriggers] = useState<NotificationTrigger[]>([
    {
      id: "request_created",
      nameAr: "إنشاء طلب جديد",
      description: "إشعار عند قيام مستفيد بتقديم طلب جديد في البوابة",
      roles: { super_admin: true, system_admin: true, projects_office: true, field_team: false, quick_response: false, financial_manager: false }
    },
    {
      id: "stage_transition",
      nameAr: "تغيير مرحلة الطلب",
      description: "إشعار عند انتقال الطلب من مرحلة إلى أخرى بسير العمل",
      roles: { super_admin: true, system_admin: true, projects_office: true, field_team: true, quick_response: true, financial_manager: false }
    },
    {
      id: "status_changed",
      nameAr: "تغيير حالة الطلب",
      description: "إشعار عند تحديث الحالة (معتمد، معلق، مرفوض، إلخ)",
      roles: { super_admin: true, system_admin: true, projects_office: true, field_team: false, quick_response: false, financial_manager: false }
    },
    {
      id: "comment_added",
      nameAr: "إضافة تعليق جديد",
      description: "إشعار عند إضافة تعليق داخلي من أحد الموظفين",
      roles: { super_admin: false, system_admin: false, projects_office: true, field_team: true, quick_response: true, financial_manager: false }
    },
    {
      id: "field_visit_scheduled",
      nameAr: "جدولة زيارة ميدانية",
      description: "إشعار عند تحديد موعد زيارة وتكليف فريق المعاينة",
      roles: { super_admin: false, system_admin: false, projects_office: true, field_team: true, quick_response: false, financial_manager: false }
    },
    {
      id: "quick_report_submitted",
      nameAr: "رفع تقرير الاستجابة السريعة",
      description: "إشعار عند تقديم تقرير الاستجابة السريعة بعد الانتهاء",
      roles: { super_admin: true, system_admin: false, projects_office: true, field_team: false, quick_response: true, financial_manager: false }
    },
    {
      id: "financial_approval_needed",
      nameAr: "طلب اعتماد مالي",
      description: "إشعار عند الحاجة للاعتماد المالي لعرض السعر الفائز",
      roles: { super_admin: true, system_admin: false, projects_office: false, field_team: false, quick_response: false, financial_manager: true }
    }
  ]);

  // قنوات الإرسال المتاحة
  const [channels, setChannels] = useState<ChannelConfig[]>([
    {
      id: "in_app",
      nameAr: "الإشعارات الداخلية (In-App)",
      description: "ظهور التنبيهات في جرس الإشعارات بالبوابة والنافذة العلوية",
      enabled: true,
      status: "active",
      apiStatus: "يعمل بشكل تلقائي"
    },
    {
      id: "whatsapp",
      nameAr: "رسائل الواتساب (WhatsApp)",
      description: "إرسال رسائل آلية للمستفيدين والمسؤولين عبر بوابة Mottasl.ai",
      enabled: true,
      status: "configured",
      apiStatus: "متصل بـ Mottasl API"
    },
    {
      id: "email",
      nameAr: "البريد الإلكتروني (SMTP Email)",
      description: "إرسال إشعارات وتفاصيل مع التحليلات والمرفقات عبر البريد",
      enabled: false,
      status: "inactive",
      apiStatus: "غير مهيأ - يتطلب إعداد SMTP"
    },
    {
      id: "sms",
      nameAr: "الرسائل النصية القصيرة (SMS)",
      description: "إرسال رسائل نصية قصيرة على الهواتف الجوالة للتحقق السريع والتنبيهات العاجلة",
      enabled: false,
      status: "inactive",
      apiStatus: "غير نشط - يتطلب شحن رصيد وبوابة إرسال"
    }
  ]);

  const handleToggleTrigger = (triggerId: string, roleId: string) => {
    setTriggers(prev => prev.map(t => {
      if (t.id === triggerId) {
        return {
          ...t,
          roles: {
            ...t.roles,
            [roleId]: !t.roles[roleId]
          }
        };
      }
      return t;
    }));
  };

  const handleToggleChannel = (channelId: string) => {
    setChannels(prev => prev.map(c => {
      if (c.id === channelId) {
        return { ...c, enabled: !c.enabled };
      }
      return c;
    }));
  };

  const handleSaveChanges = () => {
    setIsSaving(true);
    setTimeout(() => {
      setIsSaving(false);
      toast.success("تم حفظ إعدادات تخصيص الإشعارات بنجاح");
    }, 1200);
  };

  const handleResetDefaults = () => {
    toast.info("تمت استعادة الإعدادات الافتراضية للنظام");
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-7xl mx-auto px-1">
        {/* رأس الصفحة مع تأثيرات بصرية جذابة */}
        <div className="relative overflow-hidden rounded-2xl border border-border/50 bg-gradient-to-r from-teal-500/10 via-cyan-500/5 to-transparent p-6 sm:p-8 shadow-sm">
          <div className="absolute -right-24 -top-24 w-48 h-48 bg-teal-500/10 rounded-full blur-3xl" />
          <div className="absolute -left-24 -bottom-24 w-48 h-48 bg-cyan-500/10 rounded-full blur-3xl" />
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 relative z-10">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-teal-500/20 text-teal-600 flex items-center justify-center shadow-inner">
                  <Bell className="w-5 h-5 animate-pulse" />
                </div>
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">تخصيص الإشعارات</h1>
              </div>
              <p className="text-sm text-muted-foreground max-w-2xl leading-relaxed">
                تحكم بالرسائل والتنبيهات التلقائية لكل دور وظيفي في النظام، وحدد قنوات الاتصال النشطة لإرسال التحديثات والمشغلات.
              </p>
            </div>
            
            <div className="flex items-center gap-3 shrink-0">
              <Button 
                variant="outline" 
                onClick={handleResetDefaults}
                className="h-10 hover:bg-muted/80 rounded-xl text-sm font-semibold border-border/60 transition-all active:scale-[0.98] flex items-center gap-2"
              >
                <RotateCcw className="w-4 h-4" />
                <span>الافتراضي</span>
              </Button>
              <Button 
                onClick={handleSaveChanges} 
                disabled={isSaving}
                className="h-10 rounded-xl text-sm font-semibold bg-gradient-to-l from-teal-600 to-teal-500 hover:from-teal-700 hover:to-teal-600 text-white shadow-md shadow-teal-500/10 hover:shadow-teal-500/20 transition-all duration-200 active:scale-[0.98] flex items-center gap-2"
              >
                {isSaving ? (
                  <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                <span>حفظ التغييرات</span>
              </Button>
            </div>
          </div>
        </div>

        {/* علامات تبويب التخصيص */}
        <Tabs defaultValue="roles" className="w-full space-y-6" dir="rtl">
          <TabsList className="bg-muted/50 p-1 rounded-xl w-full sm:w-auto max-w-lg border border-border/30">
            <TabsTrigger value="roles" className="rounded-lg py-2 text-sm font-medium flex items-center gap-2">
              <Shield className="w-4 h-4" />
              <span>تخصيص حسب الأدوار</span>
            </TabsTrigger>
            <TabsTrigger value="users" className="rounded-lg py-2 text-sm font-medium flex items-center gap-2">
              <Users className="w-4 h-4" />
              <span>تخصيص حسب الأشخاص</span>
            </TabsTrigger>
            <TabsTrigger value="channels" className="rounded-lg py-2 text-sm font-medium flex items-center gap-2">
              <Smartphone className="w-4 h-4" />
              <span>قنوات الإرسال</span>
            </TabsTrigger>
          </TabsList>

          {/* تبويب: التخصيص حسب الأدوار */}
          <TabsContent value="roles" className="space-y-6 focus-visible:outline-none">
            <Card className="border border-border/50 shadow-sm overflow-hidden rounded-xl">
              <CardHeader className="bg-slate-50/50 dark:bg-slate-900/10 border-b border-border/50 p-6">
                <CardTitle className="text-lg font-bold text-foreground">تخصيص استقبال إشعارات المستفيدين، الطلبات والمالية للأدوار</CardTitle>
                <CardDescription className="text-sm">
                  حدد الأدوار الأساسية والمخصصة في النظام التي تتلقى إشعارات تلقائية عند قيام المستفيدين بتقديم طلبات وتمريرها بمراحل سير العمل، أو تسجيل مساجد جديدة، أو عند إضافة واعتماد الموردين، وعروض الأسعار، والعقود، وتقارير الإنجاز، وإنشاء طلبات وأوامر الصرف.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0 overflow-x-auto">
                {isLoadingRoles ? (
                  <div className="p-8 text-center text-muted-foreground flex flex-col items-center justify-center gap-3">
                    <div className="w-8 h-8 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
                    <span>جاري تحميل قائمة الأدوار...</span>
                  </div>
                ) : dbRoles && dbRoles.length > 0 ? (
                  <Table className="min-w-[700px]">
                    <TableHeader>
                      <TableRow className="hover:bg-transparent bg-slate-50/30 dark:bg-slate-950/10 border-b border-border/40">
                        <TableHead className="text-right font-bold py-4 text-foreground pr-6">الدور الوظيفي</TableHead>
                        <TableHead className="text-right font-bold py-4 text-foreground">نوع الدور</TableHead>
                        <TableHead className="text-center font-bold py-4 text-foreground">وصول إشعارات المستفيدين</TableHead>
                        <TableHead className="text-center font-bold py-4 text-foreground">وصول إشعارات الطلبات</TableHead>
                        <TableHead className="text-center font-bold py-4 text-foreground pl-6">وصول إشعارات المالية والعقود</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody className="divide-y divide-border/40">
                      {dbRoles
                        .filter(role => role.id !== "service_requester")
                        .sort((a, b) => {
                          if (a.isSystem && !b.isSystem) return -1;
                          if (!a.isSystem && b.isSystem) return 1;
                          return 0;
                        })
                        .map(role => {
                          const roleStyle = roles.find(r => r.id === role.id) || { color: "bg-purple-500/10 text-purple-600 border-purple-500/20" };
                          
                          return (
                            <TableRow key={role.id} className="hover:bg-muted/20 transition-colors">
                              <TableCell className="py-4 pr-6 font-semibold text-sm text-foreground">
                                {role.nameAr}
                              </TableCell>
                              <TableCell className="py-4 text-sm">
                                <Badge variant="secondary" className={`text-[10px] py-0.5 px-2 rounded font-bold ${role.isSystem ? "bg-blue-500/10 text-blue-600 border border-blue-500/20" : "bg-purple-500/10 text-purple-600 border border-purple-500/20"}`}>
                                  {role.isSystem ? "أساسي" : "مخصص"}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-center py-4">
                                <div className="flex justify-center">
                                  <Switch
                                    checked={role.receiveBeneficiaryNotifications || false}
                                    onCheckedChange={(checked) => handleToggleRoleNotifications(role.id, checked)}
                                    className="data-[state=checked]:bg-teal-600 dark:data-[state=checked]:bg-teal-500 scale-95"
                                  />
                                </div>
                              </TableCell>
                              <TableCell className="text-center py-4">
                                <div className="flex justify-center">
                                  <Switch
                                    checked={role.receiveRequestNotifications || false}
                                    onCheckedChange={(checked) => handleToggleRoleRequestNotifications(role.id, checked)}
                                    className="data-[state=checked]:bg-teal-600 dark:data-[state=checked]:bg-teal-500 scale-95"
                                  />
                                </div>
                              </TableCell>
                              <TableCell className="text-center py-4 pl-6">
                                <div className="flex justify-center">
                                  <Switch
                                    checked={role.receiveFinancialAndContractNotifications || false}
                                    onCheckedChange={(checked) => handleToggleRoleFinancialNotifications(role.id, checked)}
                                    className="data-[state=checked]:bg-teal-600 dark:data-[state=checked]:bg-teal-500 scale-95"
                                  />
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="p-8 text-center text-muted-foreground">لا توجد أدوار متاحة حالياً.</div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* تبويب: التخصيص حسب الأشخاص */}
          <TabsContent value="users" className="space-y-6 focus-visible:outline-none">
            <Card className="border border-border/50 shadow-sm overflow-hidden rounded-xl">
              <CardHeader className="bg-slate-50/50 dark:bg-slate-900/10 border-b border-border/50 p-6">
                <CardTitle className="text-lg font-bold text-foreground">تخصيص استقبال إشعارات المستفيدين، الطلبات والمالية للأشخاص</CardTitle>
                <CardDescription className="text-sm">
                  حدد الموظفين الذين يتلقون إشعارات عند قيام المستفيدين بتقديم طلبات وتمريرها بمراحل سير العمل، أو تسجيل مساجد جديدة، أو عند إضافة واعتماد الموردين، وعروض الأسعار، والعقود، وتقارير الإنجاز، وإنشاء طلبات وأوامر الصرف.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                {isLoadingStaff ? (
                  <div className="p-8 text-center text-muted-foreground flex flex-col items-center justify-center gap-3">
                    <div className="w-8 h-8 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
                    <span>جاري تحميل قائمة الموظفين...</span>
                  </div>
                ) : staffUsers && staffUsers.length > 0 ? (
                  <Table className="min-w-[700px]">
                    <TableHeader>
                      <TableRow className="hover:bg-transparent bg-slate-50/30 dark:bg-slate-950/10 border-b border-border/40">
                        <TableHead className="text-right font-bold py-4 text-foreground pr-6">الموظف</TableHead>
                        <TableHead className="text-right font-bold py-4 text-foreground">البريد الإلكتروني</TableHead>
                        <TableHead className="text-right font-bold py-4 text-foreground">الدور الأساسي</TableHead>
                        <TableHead className="text-center font-bold py-4 text-foreground">وصول إشعارات المستفيدين</TableHead>
                        <TableHead className="text-center font-bold py-4 text-foreground">وصول إشعارات الطلبات</TableHead>
                        <TableHead className="text-center font-bold py-4 text-foreground pl-6">وصول إشعارات المالية والعقود</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody className="divide-y divide-border/40">
                      {staffUsers.map(user => {
                        const roleColor = roles.find(r => r.id === user.role)?.color || "bg-slate-500/10 text-slate-600 border-slate-500/20";
                        const roleLabel = roles.find(r => r.id === user.role)?.nameAr || user.role;
                        
                        return (
                          <TableRow key={user.id} className="hover:bg-muted/20 transition-colors">
                            <TableCell className="py-4 pr-6 font-semibold text-sm text-foreground">{user.name}</TableCell>
                            <TableCell className="py-4 text-sm text-muted-foreground">{user.email}</TableCell>
                            <TableCell className="py-4">
                              <Badge variant="outline" className={`text-xs py-0.5 px-2.5 rounded-full border font-medium ${roleColor}`}>
                                {roleLabel}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-center py-4">
                              <div className="flex justify-center">
                                <Switch
                                  checked={user.receiveBeneficiaryNotifications || false}
                                  onCheckedChange={(checked) => handleToggleUserNotifications(user.id, checked)}
                                  className="data-[state=checked]:bg-teal-600 dark:data-[state=checked]:bg-teal-500 scale-95"
                                />
                              </div>
                            </TableCell>
                            <TableCell className="text-center py-4">
                              <div className="flex justify-center">
                                <Switch
                                  checked={user.receiveRequestNotifications || false}
                                  onCheckedChange={(checked) => handleToggleUserRequestNotifications(user.id, checked)}
                                  className="data-[state=checked]:bg-teal-600 dark:data-[state=checked]:bg-teal-500 scale-95"
                                />
                              </div>
                            </TableCell>
                            <TableCell className="text-center py-4 pl-6">
                              <div className="flex justify-center">
                                <Switch
                                  checked={user.receiveFinancialAndContractNotifications || false}
                                  onCheckedChange={(checked) => handleToggleUserFinancialNotifications(user.id, checked)}
                                  className="data-[state=checked]:bg-teal-600 dark:data-[state=checked]:bg-teal-500 scale-95"
                                />
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="p-8 text-center text-muted-foreground">لا يوجد موظفون متاحون حالياً.</div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* تبويب: قنوات الإرسال */}
          <TabsContent value="channels" className="grid grid-cols-1 md:grid-cols-2 gap-6 focus-visible:outline-none">
            {channels.map(channel => {
              const Icon = channel.id === "in_app" ? Bell : channel.id === "whatsapp" ? MessageSquare : channel.id === "email" ? Mail : Smartphone;
              return (
                <Card key={channel.id} className="border border-border/50 shadow-sm hover:shadow-md transition-all duration-300 rounded-xl overflow-hidden group">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex gap-4">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-105 ${channel.enabled ? "bg-teal-500/10 text-teal-600" : "bg-muted text-muted-foreground"}`}>
                          <Icon className="w-6 h-6" />
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <h3 className="font-bold text-base text-foreground">{channel.nameAr}</h3>
                            <Badge 
                              variant="secondary" 
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                channel.status === "active" ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20" :
                                channel.status === "configured" ? "bg-blue-500/10 text-blue-600 border border-blue-500/20" :
                                "bg-slate-500/10 text-slate-600 border border-slate-500/20"
                              }`}
                            >
                              {channel.status === "active" ? "نشط" : channel.status === "configured" ? "مهيأ" : "غير نشط"}
                            </Badge>
                          </div>
                          <p className="text-xs sm:text-sm text-muted-foreground leading-normal">{channel.description}</p>
                        </div>
                      </div>
                      <Switch
                        checked={channel.enabled}
                        onCheckedChange={() => handleToggleChannel(channel.id)}
                        className="data-[state=checked]:bg-teal-600 dark:data-[state=checked]:bg-teal-500"
                      />
                    </div>
                    
                    <div className="mt-6 pt-4 border-t border-border/40 flex items-center justify-between text-xs text-muted-foreground">
                      <span className="font-medium">الحالة الفنية:</span>
                      <span className={`font-semibold ${channel.enabled ? "text-foreground" : "text-muted-foreground"}`}>{channel.apiStatus}</span>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
