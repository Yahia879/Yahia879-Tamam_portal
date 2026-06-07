import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Bell, Shield, Smartphone, MessageSquare, Mail, Users, Info } from "lucide-react";
import { toast } from "sonner";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { trpc } from "@/lib/trpc";

const RequestNotificationsTooltip = () => (
  <div className="space-y-3 text-right max-w-sm sm:max-w-md text-foreground" dir="rtl">
    <h4 className="font-bold text-xs sm:text-sm border-b border-border pb-1.5 text-teal-600 dark:text-teal-400">
      إشعارات قسم الطلبات والمساجد وتشمل:
    </h4>
    
    <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1 text-[11px] sm:text-xs">
      <div className="space-y-1">
        <span className="font-bold text-muted-foreground block text-[10px] sm:text-[11px]">
          إشعارات الاستجابة السريعة:
        </span>
        <p className="bg-muted/50 p-2 rounded-lg border-r-4 border-cyan-500 leading-relaxed font-medium">
          تم تكليفك بالطلب رقم REQ-2026-DAA-0140 للاستجابة السريعة
        </p>
      </div>
      
      <div className="space-y-2">
        <span className="font-bold text-muted-foreground block text-[10px] sm:text-[11px]">
          إشعارات الفريق الميداني:
        </span>
        <div className="space-y-1.5">
          <div className="bg-muted/50 p-2 rounded-lg border-r-4 border-emerald-500">
            <span className="font-semibold block text-emerald-600 dark:text-emerald-400 mb-0.5">إسناد زيارة ميدانية له:</span>
            تم جدولة زيارة ميدانية للطلب رقم REQ-2026-DAA-0140 بتاريخ ٢٥/٦/٢٠٢٦
          </div>
          <div className="bg-muted/50 p-2 rounded-lg border-r-4 border-teal-500">
            <span className="font-semibold block text-teal-600 dark:text-teal-400 mb-0.5">إنشاء طلب من مسؤول آخر:</span>
            قام المدير العام عبدالإله المرزوق بإنشاء طلب جديد رقم REQ-2026-DAA-0142
          </div>
          <div className="bg-muted/50 p-2 rounded-lg border-r-4 border-blue-500">
            <span className="font-semibold block text-blue-600 dark:text-blue-400 mb-0.5">إنشاء طلب من قبل المستفيد:</span>
            تم إنشاء طلب جديد رقم REQ-2026-BUN-0143 وهو بانتظار المعالجة
          </div>
          <div className="bg-muted/50 p-2 rounded-lg border-r-4 border-purple-500">
            <span className="font-semibold block text-purple-600 dark:text-purple-400 mb-0.5">تغيير حالة الطلب للمراجعة الأولية:</span>
            قام المدير العام عبدالإله المرزوق بنقل الطلب رقم REQ-2026-DAA-0142 إلى مرحلة: المراجعة الأولية
          </div>
          <div className="bg-muted/50 p-2 rounded-lg border-r-4 border-amber-500">
            <span className="font-semibold block text-amber-600 dark:text-amber-400 mb-0.5">تغيير حالة الطلب للزيارة الميدانية:</span>
            قام المدير العام عبدالإله المرزوق بنقل الطلب رقم REQ-2026-DAA-0142 إلى مرحلة: الزيارة الميدانية
          </div>
          <div className="bg-muted/50 p-2 rounded-lg border-r-4 border-indigo-500">
            <span className="font-semibold block text-indigo-600 dark:text-indigo-400 mb-0.5">رفع تقرير الزيارة الميدانية:</span>
            تم رفع تقرير زيارة ميدانية من قبل فريق ميداني جديد للطلب رقم REQ-2026-DAA-0142
          </div>
          <div className="bg-muted/50 p-2 rounded-lg border-r-4 border-pink-500">
            <span className="font-semibold block text-pink-600 dark:text-pink-400 mb-0.5">رفع تقرير الاستجابة السريعة:</span>
            تم رفع تقرير الاستجابة السريعة من قبل استجابة سريعة سريعة للطلب رقم REQ-2026-DAA-0142
          </div>
          <div className="bg-muted/50 p-2 rounded-lg border-r-4 border-violet-500">
            <span className="font-semibold block text-violet-600 dark:text-violet-400 mb-0.5">تحويل الطلب لمشروع:</span>
            تم تحويل الطلب رقم REQ-2026-DAA-0142 إلى مشروع ويحتاج للتقييم المالي
          </div>
          <div className="bg-muted/50 p-2 rounded-lg border-r-4 border-yellow-600">
            <span className="font-semibold block text-yellow-600 dark:text-yellow-400 mb-0.5">تغيير حالة الطلب للتقييم المالي واعتماد العرض:</span>
            قام المدير العام عبدالإله المرزوق بنقل الطلب رقم REQ-2026-DAA-0142 إلى مرحلة: التقييم المالي واعتماد العرض
          </div>
          <div className="bg-muted/50 p-2 rounded-lg border-r-4 border-orange-500">
            <span className="font-semibold block text-orange-600 dark:text-orange-400 mb-0.5">تغيير حالة الطلب للتعاقد:</span>
            قام المدير العام عبدالإله المرزوق بنقل الطلب رقم REQ-2026-DAA-0142 إلى مرحلة: التعاقد
          </div>
          <div className="bg-muted/50 p-2 rounded-lg border-r-4 border-emerald-600">
            <span className="font-semibold block text-emerald-600 dark:text-emerald-400 mb-0.5">تغيير حالة الطلب للتنفيذ:</span>
            قام المدير العام عبدالإله المرزوق بنقل الطلب رقم REQ-2026-DAA-0142 إلى مرحلة: التنفيذ
          </div>
          <div className="bg-muted/50 p-2 rounded-lg border-r-4 border-red-500">
            <span className="font-semibold block text-red-600 dark:text-red-400 mb-0.5">تغيير حالة الطلب للإغلاق:</span>
            قام المدير العام عبدالإله المرزوق بنقل الطلب رقم REQ-2026-DAA-0142 إلى مرحلة: الإغلاق
          </div>
        </div>
      </div>
    </div>
  </div>
);

interface NotificationTrigger {
  id: string;
  nameAr: string;
  description: string;
  roles: Record<string, boolean>; // roleId -> active
}

const ChannelToggles = ({
  inApp,
  whatsapp,
  sms,
  email,
  onToggle,
  inherited = { inApp: false, whatsapp: false, sms: false, email: false }
}: {
  inApp: boolean;
  whatsapp: boolean;
  sms: boolean;
  email: boolean;
  onToggle: (channel: "in_app" | "whatsapp" | "sms" | "email", val: boolean) => void;
  inherited?: { inApp: boolean; whatsapp: boolean; sms: boolean; email: boolean }
}) => {
  return (
    <div className="flex items-center justify-center gap-1 sm:gap-1.5 bg-muted/30 p-1 sm:p-1.5 rounded-lg border border-border/30 w-fit mx-auto">
      <TooltipProvider delayDuration={200}>
        {/* إشعارات الموقع */}
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={() => onToggle("in_app", !inApp)}
              className={`p-1 sm:p-1.5 rounded-md transition-all active:scale-95 ${
                inApp
                  ? "bg-teal-500/10 text-teal-600 dark:text-teal-400 font-semibold"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              } ${inherited.inApp ? "ring-2 ring-teal-500/50" : ""}`}
            >
              <Bell className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="top" className="text-[10px] sm:text-xs">
            <span>إشعارات الموقع (In-App){inherited.inApp ? " (مورث من الدور)" : ""}</span>
          </TooltipContent>
        </Tooltip>

        {/* واتساب */}
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={() => onToggle("whatsapp", !whatsapp)}
              className={`p-1 sm:p-1.5 rounded-md transition-all active:scale-95 ${
                whatsapp
                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              } ${inherited.whatsapp ? "ring-2 ring-emerald-500/50" : ""}`}
            >
              <MessageSquare className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="top" className="text-[10px] sm:text-xs">
            <span>رسائل الواتساب (WhatsApp){inherited.whatsapp ? " (مورث من الدور)" : ""}</span>
          </TooltipContent>
        </Tooltip>

        {/* البريد الإلكتروني */}
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={() => onToggle("email", !email)}
              className={`p-1 sm:p-1.5 rounded-md transition-all active:scale-95 ${
                email
                  ? "bg-blue-500/10 text-blue-600 dark:text-blue-400 font-semibold"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              } ${inherited.email ? "ring-2 ring-blue-500/50" : ""}`}
            >
              <Mail className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="top" className="text-[10px] sm:text-xs">
            <span>البريد الإلكتروني (Email){inherited.email ? " (مورث من الدور)" : ""}</span>
          </TooltipContent>
        </Tooltip>

        {/* الرسائل النصية */}
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={() => onToggle("sms", !sms)}
              className={`p-1 sm:p-1.5 rounded-md transition-all active:scale-95 ${
                sms
                  ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 font-semibold"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              } ${inherited.sms ? "ring-2 ring-amber-500/50" : ""}`}
            >
              <Smartphone className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="top" className="text-[10px] sm:text-xs">
            <span>الرسائل النصية (SMS){inherited.sms ? " (مورث من الدور)" : ""}</span>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
};

const Pagination = ({
  currentPage,
  totalPages,
  onPageChange
}: {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}) => {
  if (totalPages <= 1) return null;
  
  return (
    <div className="flex items-center justify-between border-t border-border/40 px-4 py-3.5 bg-slate-50/30 dark:bg-slate-900/5 sm:px-6">
      <div className="flex flex-1 justify-between sm:hidden">
        <button
          onClick={() => onPageChange(Math.max(currentPage - 1, 1))}
          disabled={currentPage === 1}
          className="relative inline-flex items-center rounded-md border border-border bg-background px-4 py-2 text-xs font-medium text-foreground hover:bg-muted disabled:opacity-50 transition-colors"
        >
          السابق
        </button>
        <button
          onClick={() => onPageChange(Math.min(currentPage + 1, totalPages))}
          disabled={currentPage === totalPages}
          className="relative ml-3 inline-flex items-center rounded-md border border-border bg-background px-4 py-2 text-xs font-medium text-foreground hover:bg-muted disabled:opacity-50 transition-colors"
        >
          التالي
        </button>
      </div>
      <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between" dir="rtl">
        <div>
          <p className="text-xs sm:text-sm text-muted-foreground">
            عرض الصفحة <span className="font-semibold text-foreground">{currentPage}</span> من{" "}
            <span className="font-semibold text-foreground">{totalPages}</span>
          </p>
        </div>
        <div>
          <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm gap-1" aria-label="Pagination">
            <button
              onClick={() => onPageChange(Math.max(currentPage - 1, 1))}
              disabled={currentPage === 1}
              className="relative inline-flex items-center rounded-lg border border-border/60 bg-background p-2 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-50 transition-colors"
            >
              السابق
            </button>
            {Array.from({ length: totalPages }).map((_, idx) => {
              const pageNum = idx + 1;
              const isActive = pageNum === currentPage;
              return (
                <button
                  key={pageNum}
                  onClick={() => onPageChange(pageNum)}
                  className={`relative inline-flex items-center rounded-lg px-3.5 py-2 text-xs font-semibold transition-all duration-200 ${
                    isActive
                      ? "bg-teal-600 text-white shadow-sm"
                      : "border border-border/60 bg-background text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  {pageNum}
                </button>
              );
            })}
            <button
              onClick={() => onPageChange(Math.min(currentPage + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="relative inline-flex items-center rounded-lg border border-border/60 bg-background p-2 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-50 transition-colors"
            >
              التالي
            </button>
          </nav>
        </div>
      </div>
    </div>
  );
};

export default function NotificationCustomization() {

  // جلب قائمة الموظفين وتخصيص إشعاراتهم
  const { data: staffUsers, isLoading: isLoadingStaff, refetch: refetchStaff } = trpc.users.getStaffUsers.useQuery();
  // جلب قائمة الأدوار وتخصيص إشعاراتها
  const { data: dbRoles, isLoading: isLoadingRoles, refetch: refetchRoles } = trpc.permissions.getRoles.useQuery();

  const [rolesPage, setRolesPage] = useState(1);
  const [usersPage, setUsersPage] = useState(1);
  const itemsPerPage = 8;

  // الأدوار المفلترة والمصنفة والمقسمة
  const filteredRoles = dbRoles
    ? dbRoles
        .filter(role => role.id !== "service_requester")
        .sort((a, b) => {
          if (a.isSystem && !b.isSystem) return -1;
          if (!a.isSystem && b.isSystem) return 1;
          return 0;
        })
    : [];
  
  const rolesTotalPages = Math.ceil(filteredRoles.length / itemsPerPage);
  const paginatedRoles = filteredRoles.slice(
    (rolesPage - 1) * itemsPerPage,
    rolesPage * itemsPerPage
  );

  // الموظفون المقسمون
  const filteredStaffUsers = staffUsers || [];
  const usersTotalPages = Math.ceil(filteredStaffUsers.length / itemsPerPage);
  const paginatedStaffUsers = filteredStaffUsers.slice(
    (usersPage - 1) * itemsPerPage,
    usersPage * itemsPerPage
  );

  const getRoleChannelState = (roleId: string, category: 'beneficiary' | 'request' | 'financial') => {
    const roleObj = dbRoles?.find(r => r.id === roleId);
    if (!roleObj) return { whatsapp: false, sms: false, email: false };
    
    if (category === 'beneficiary') {
      return {
        whatsapp: !!roleObj.receiveBeneficiaryWhatsapp,
        sms: !!roleObj.receiveBeneficiarySms,
        email: !!roleObj.receiveBeneficiaryEmail,
      };
    }
    if (category === 'request') {
      return {
        whatsapp: !!roleObj.receiveRequestWhatsapp,
        sms: !!roleObj.receiveRequestSms,
        email: !!roleObj.receiveRequestEmail,
      };
    }
    // category === 'financial'
    return {
      whatsapp: !!roleObj.receiveFinancialWhatsapp,
      sms: !!roleObj.receiveFinancialSms,
      email: !!roleObj.receiveFinancialEmail,
    };
  };

  const getUserChannelState = (userId: number, category: 'beneficiary' | 'request' | 'financial') => {
    const userObj = staffUsers?.find(u => u.id === userId);
    const defaultVal = { whatsapp: false, sms: false, email: false, inApp: false, isInherited: { whatsapp: false, sms: false, email: false, inApp: false } };
    if (!userObj) return defaultVal;
    
    const roleObj = dbRoles?.find(r => r.id === userObj.role);
    
    if (category === 'beneficiary') {
      const roleInApp = !!roleObj?.receiveBeneficiaryNotifications;
      const roleWhatsapp = !!roleObj?.receiveBeneficiaryWhatsapp;
      const roleSms = !!roleObj?.receiveBeneficiarySms;
      const roleEmail = !!roleObj?.receiveBeneficiaryEmail;
      
      return {
        inApp: !!userObj.receiveBeneficiaryNotifications || roleInApp,
        whatsapp: !!userObj.receiveBeneficiaryWhatsapp || roleWhatsapp,
        sms: !!userObj.receiveBeneficiarySms || roleSms,
        email: !!userObj.receiveBeneficiaryEmail || roleEmail,
        isInherited: {
          inApp: roleInApp,
          whatsapp: roleWhatsapp,
          sms: roleSms,
          email: roleEmail
        }
      };
    }
    if (category === 'request') {
      const roleInApp = !!roleObj?.receiveRequestNotifications;
      const roleWhatsapp = !!roleObj?.receiveRequestWhatsapp;
      const roleSms = !!roleObj?.receiveRequestSms;
      const roleEmail = !!roleObj?.receiveRequestEmail;
      
      return {
        inApp: !!userObj.receiveRequestNotifications || roleInApp,
        whatsapp: !!userObj.receiveRequestWhatsapp || roleWhatsapp,
        sms: !!userObj.receiveRequestSms || roleSms,
        email: !!userObj.receiveRequestEmail || roleEmail,
        isInherited: {
          inApp: roleInApp,
          whatsapp: roleWhatsapp,
          sms: roleSms,
          email: roleEmail
        }
      };
    }
    // category === 'financial'
    const roleInApp = !!roleObj?.receiveFinancialAndContractNotifications;
    const roleWhatsapp = !!roleObj?.receiveFinancialWhatsapp;
    const roleSms = !!roleObj?.receiveFinancialSms;
    const roleEmail = !!roleObj?.receiveFinancialEmail;
    
    return {
      inApp: !!userObj.receiveFinancialAndContractNotifications || roleInApp,
      whatsapp: !!userObj.receiveFinancialWhatsapp || roleWhatsapp,
      sms: !!userObj.receiveFinancialSms || roleSms,
      email: !!userObj.receiveFinancialEmail || roleEmail,
      isInherited: {
        inApp: roleInApp,
        whatsapp: roleWhatsapp,
        sms: roleSms,
        email: roleEmail
      }
    };
  };

  const updateRoleChannelSettingMutation = trpc.permissions.updateRoleChannelSetting.useMutation({
    onSuccess: () => {
      refetchRoles();
      toast.success("تم تحديث إعدادات استقبال الإشعارات بنجاح");
    },
    onError: (err) => {
      toast.error(err.message || "حدث خطأ أثناء حفظ التحديث");
    }
  });

  const updateUserChannelSettingMutation = trpc.users.updateUserChannelSetting.useMutation({
    onSuccess: () => {
      refetchStaff();
      toast.success("تم تحديث إعدادات استقبال الإشعارات بنجاح");
    },
    onError: (err) => {
      toast.error(err.message || "حدث خطأ أثناء حفظ التحديث");
    }
  });

  const handleToggleRoleChannel = (
    roleId: string,
    category: 'beneficiary' | 'request' | 'financial',
    channel: 'in_app' | 'whatsapp' | 'sms' | 'email',
    val: boolean
  ) => {
    updateRoleChannelSettingMutation.mutate({
      roleId,
      category,
      channel,
      enabled: val
    });
  };

  const handleToggleUserChannel = (
    userId: number,
    category: 'beneficiary' | 'request' | 'financial',
    channel: 'in_app' | 'whatsapp' | 'sms' | 'email',
    val: boolean
  ) => {
    updateUserChannelSettingMutation.mutate({
      userId,
      category,
      channel,
      enabled: val
    });
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



  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4">
        {/* علامات تبويب التخصيص */}
        <Tabs defaultValue="roles" className="w-full space-y-6" dir="rtl">
          <div className="flex justify-center w-full mb-8">
            <TabsList className="bg-slate-100/80 dark:bg-slate-900/60 p-2 rounded-2xl border border-slate-200/50 dark:border-slate-800/50 flex gap-3 w-full max-w-xl shadow-inner backdrop-blur-md">
              <TabsTrigger 
                value="roles" 
                className="flex-1 rounded-xl py-3.5 px-6 sm:px-10 text-xs sm:text-sm font-bold flex items-center justify-center gap-2 text-muted-foreground hover:text-foreground data-[state=active]:bg-white dark:data-[state=active]:bg-slate-950 data-[state=active]:text-teal-600 dark:data-[state=active]:text-teal-400 data-[state=active]:shadow-lg hover:bg-slate-200/50 dark:hover:bg-slate-800/50 transition-all duration-300"
              >
                <Shield className="w-4 h-4 sm:w-4.5 sm:h-4.5 text-teal-600 dark:text-teal-400" />
                <span>تخصيص حسب الأدوار</span>
              </TabsTrigger>
              <TabsTrigger 
                value="users" 
                className="flex-1 rounded-xl py-3.5 px-6 sm:px-10 text-xs sm:text-sm font-bold flex items-center justify-center gap-2 text-muted-foreground hover:text-foreground data-[state=active]:bg-white dark:data-[state=active]:bg-slate-950 data-[state=active]:text-teal-600 dark:data-[state=active]:text-teal-400 data-[state=active]:shadow-lg hover:bg-slate-200/50 dark:hover:bg-slate-800/50 transition-all duration-300"
              >
                <Users className="w-4 h-4 sm:w-4.5 sm:h-4.5 text-teal-600 dark:text-teal-400" />
                <span>تخصيص حسب الأشخاص</span>
              </TabsTrigger>
            </TabsList>
          </div>

          {/* تبويب: التخصيص حسب الأدوار */}
          <TabsContent value="roles" className="space-y-6 focus-visible:outline-none">
            <Card className="border border-border/50 shadow-sm overflow-hidden rounded-xl">
              <CardHeader className="bg-slate-50/50 dark:bg-slate-900/10 border-b border-border/50 p-4 sm:p-6">
                <CardTitle className="text-sm sm:text-base md:text-lg font-bold text-foreground">تخصيص استقبال إشعارات الطلبات والمالية للأدوار</CardTitle>
                <CardDescription className="text-[11px] sm:text-xs md:text-sm mt-1 leading-relaxed">
                  حدد الأدوار الأساسية والمخصصة في النظام التي تتلقى إشعارات تلقائية عند إنشاء وتغيير حالة وتحديث طلبات المستفيدين والمساجد (بما في ذلك إسناد الزيارات الميدانية وتقارير الاستجابة السريعة)، أو عند تحديثات الشؤون المالية والعقود والمشاريع.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                {isLoadingRoles ? (
                  <div className="p-8 text-center text-muted-foreground flex flex-col items-center justify-center gap-3">
                    <div className="w-8 h-8 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
                    <span>جاري تحميل قائمة الأدوار...</span>
                  </div>
                ) : paginatedRoles && paginatedRoles.length > 0 ? (
                  <>
                    <div className="w-full overflow-x-auto scrollbar-thin">
                      <Table className="min-w-[700px]">
                        <TableHeader>
                          <TableRow className="hover:bg-transparent bg-slate-50/30 dark:bg-slate-950/10 border-b border-border/40">
                            <TableHead className="text-right font-bold py-3 sm:py-4 text-xs sm:text-sm text-foreground pr-4 sm:pr-6">الدور الوظيفي</TableHead>
                            <TableHead className="text-right font-bold py-3 sm:py-4 text-xs sm:text-sm text-foreground">نوع الدور</TableHead>
                            <TableHead className="text-center py-3 sm:py-4 text-xs sm:text-sm">
                              <div className="flex items-center justify-center gap-1">
                                <span className="font-bold text-foreground">وصول إشعارات الطلبات والمساجد</span>
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <button className="text-muted-foreground hover:text-foreground focus:outline-none transition-colors">
                                        <Info className="w-3.5 h-3.5" />
                                      </button>
                                    </TooltipTrigger>
                                    <TooltipContent className="max-w-[340px] sm:max-w-md p-3 sm:p-4 bg-popover text-popover-foreground border border-border/50 rounded-xl shadow-lg" side="bottom">
                                      <RequestNotificationsTooltip />
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              </div>
                            </TableHead>
                            <TableHead className="text-center font-bold py-3 sm:py-4 text-xs sm:text-sm text-foreground pl-4 sm:pl-6">وصول إشعارات المالية والعقود</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody className="divide-y divide-border/40">
                          {paginatedRoles.map(role => {
                            const roleStyle = roles.find(r => r.id === role.id) || { color: "bg-purple-500/10 text-purple-600 border-purple-500/20" };
                            
                            return (
                              <TableRow key={role.id} className="hover:bg-muted/20 transition-colors">
                                <TableCell className="py-3 sm:py-4 pr-4 sm:pr-6 font-semibold text-xs sm:text-sm text-foreground">
                                  {role.nameAr}
                                </TableCell>
                                <TableCell className="py-3 sm:py-4 text-xs sm:text-sm">
                                  <Badge variant="secondary" className={`text-[10px] py-0.5 px-2 rounded font-bold ${role.isSystem ? "bg-blue-500/10 text-blue-600 border border-blue-500/20" : "bg-purple-500/10 text-purple-600 border border-purple-500/20"}`}>
                                    {role.isSystem ? "أساسي" : "مخصص"}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-center py-3 sm:py-4">
                                  <ChannelToggles
                                    inApp={role.receiveRequestNotifications || false}
                                    whatsapp={getRoleChannelState(role.id, 'request').whatsapp}
                                    sms={getRoleChannelState(role.id, 'request').sms}
                                    email={getRoleChannelState(role.id, 'request').email}
                                    onToggle={(channel, val) => handleToggleRoleChannel(role.id, 'request', channel, val)}
                                  />
                                </TableCell>
                                <TableCell className="text-center py-3 sm:py-4 pl-4 sm:pl-6">
                                  <ChannelToggles
                                    inApp={role.receiveFinancialAndContractNotifications || false}
                                    whatsapp={getRoleChannelState(role.id, 'financial').whatsapp}
                                    sms={getRoleChannelState(role.id, 'financial').sms}
                                    email={getRoleChannelState(role.id, 'financial').email}
                                    onToggle={(channel, val) => handleToggleRoleChannel(role.id, 'financial', channel, val)}
                                  />
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                    <Pagination
                      currentPage={rolesPage}
                      totalPages={rolesTotalPages}
                      onPageChange={setRolesPage}
                    />
                  </>
                ) : (
                  <div className="p-8 text-center text-muted-foreground">لا توجد أدوار متاحة حالياً.</div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* تبويب: التخصيص حسب الأشخاص */}
          <TabsContent value="users" className="space-y-6 focus-visible:outline-none">
            <Card className="border border-border/50 shadow-sm overflow-hidden rounded-xl">
              <CardHeader className="bg-slate-50/50 dark:bg-slate-900/10 border-b border-border/50 p-4 sm:p-6">
                <CardTitle className="text-sm sm:text-base md:text-lg font-bold text-foreground">تخصيص استقبال إشعارات الطلبات والمالية للأشخاص</CardTitle>
                <CardDescription className="text-[11px] sm:text-xs md:text-sm mt-1 leading-relaxed">
                  حدد الموظفين الذين يتلقون إشعارات عند إنشاء وتغيير حالة وتحديث طلبات المستفيدين والمساجد (بما في ذلك إسناد الزيارات الميدانية وتقارير الاستجابة السريعة)، أو عند تحديثات الشؤون المالية والعقود والمشاريع.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                {isLoadingStaff ? (
                  <div className="p-8 text-center text-muted-foreground flex flex-col items-center justify-center gap-3">
                    <div className="w-8 h-8 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
                    <span>جاري تحميل قائمة الموظفين...</span>
                  </div>
                ) : paginatedStaffUsers && paginatedStaffUsers.length > 0 ? (
                  <>
                    <div className="w-full overflow-x-auto scrollbar-thin">
                      <Table className="min-w-[700px]">
                        <TableHeader>
                          <TableRow className="hover:bg-transparent bg-slate-50/30 dark:bg-slate-950/10 border-b border-border/40">
                            <TableHead className="text-right font-bold py-3 sm:py-4 text-xs sm:text-sm text-foreground pr-4 sm:pr-6">الموظف</TableHead>
                            <TableHead className="text-right font-bold py-3 sm:py-4 text-xs sm:text-sm text-foreground">البريد الإلكتروني</TableHead>
                            <TableHead className="text-right font-bold py-3 sm:py-4 text-xs sm:text-sm text-foreground">الدور الأساسي</TableHead>
                            <TableHead className="text-center py-3 sm:py-4 text-xs sm:text-sm">
                              <div className="flex items-center justify-center gap-1">
                                <span className="font-bold text-foreground">وصول إشعارات الطلبات والمساجد</span>
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <button className="text-muted-foreground hover:text-foreground focus:outline-none transition-colors">
                                        <Info className="w-3.5 h-3.5" />
                                      </button>
                                    </TooltipTrigger>
                                    <TooltipContent className="max-w-[340px] sm:max-w-md p-3 sm:p-4 bg-popover text-popover-foreground border border-border/50 rounded-xl shadow-lg" side="bottom">
                                      <RequestNotificationsTooltip />
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              </div>
                            </TableHead>
                            <TableHead className="text-center font-bold py-3 sm:py-4 text-xs sm:text-sm text-foreground pl-4 sm:pl-6">وصول إشعارات المالية والعقود</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody className="divide-y divide-border/40">
                          {paginatedStaffUsers.map(user => {
                            const roleColor = roles.find(r => r.id === user.role)?.color || "bg-slate-500/10 text-slate-600 border-slate-500/20";
                            const roleLabel = dbRoles?.find(r => r.id === user.role)?.nameAr || user.role;
                            
                            return (
                              <TableRow key={user.id} className="hover:bg-muted/20 transition-colors">
                                <TableCell className="py-3 sm:py-4 pr-4 sm:pr-6 font-semibold text-xs sm:text-sm text-foreground">{user.name}</TableCell>
                                <TableCell className="py-3 sm:py-4 text-xs sm:text-sm text-muted-foreground">{user.email}</TableCell>
                                <TableCell className="py-3 sm:py-4">
                                  <Badge variant="outline" className={`text-[10px] sm:text-xs py-0.5 px-2 sm:px-2.5 rounded-full border font-medium ${roleColor}`}>
                                    {roleLabel}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-center py-3 sm:py-4">
                                  <ChannelToggles
                                    inApp={getUserChannelState(user.id, 'request').inApp}
                                    whatsapp={getUserChannelState(user.id, 'request').whatsapp}
                                    sms={getUserChannelState(user.id, 'request').sms}
                                    email={getUserChannelState(user.id, 'request').email}
                                    onToggle={(channel, val) => handleToggleUserChannel(user.id, 'request', channel, val)}
                                    inherited={{
                                      inApp: getUserChannelState(user.id, 'request').isInherited.inApp,
                                      whatsapp: getUserChannelState(user.id, 'request').isInherited.whatsapp,
                                      sms: getUserChannelState(user.id, 'request').isInherited.sms,
                                      email: getUserChannelState(user.id, 'request').isInherited.email,
                                    }}
                                  />
                                </TableCell>
                                <TableCell className="text-center py-3 sm:py-4 pl-4 sm:pl-6">
                                  <ChannelToggles
                                    inApp={getUserChannelState(user.id, 'financial').inApp}
                                    whatsapp={getUserChannelState(user.id, 'financial').whatsapp}
                                    sms={getUserChannelState(user.id, 'financial').sms}
                                    email={getUserChannelState(user.id, 'financial').email}
                                    onToggle={(channel, val) => handleToggleUserChannel(user.id, 'financial', channel, val)}
                                    inherited={{
                                      inApp: getUserChannelState(user.id, 'financial').isInherited.inApp,
                                      whatsapp: getUserChannelState(user.id, 'financial').isInherited.whatsapp,
                                      sms: getUserChannelState(user.id, 'financial').isInherited.sms,
                                      email: getUserChannelState(user.id, 'financial').isInherited.email,
                                    }}
                                  />
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                    <Pagination
                      currentPage={usersPage}
                      totalPages={usersTotalPages}
                      onPageChange={setUsersPage}
                    />
                  </>
                ) : (
                  <div className="p-8 text-center text-muted-foreground">لا يوجد موظفون متاحون حالياً.</div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

        </Tabs>
      </div>
    </DashboardLayout>
  );
}
