import { useState, useRef, useEffect, useCallback } from "react";
import { Link } from "wouter";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Bell, Shield, Smartphone, MessageSquare, Mail, Users, Info, ArrowRight, Pencil, X } from "lucide-react";
import { toast } from "sonner";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { trpc } from "@/lib/trpc";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogClose } from "@/components/ui/dialog";

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
          <div className="bg-muted/50 p-2 rounded-lg border-r-4 border-teal-650">
            <span className="font-semibold block text-teal-600 dark:text-teal-400 mb-0.5">تذاكر الدعم الفني:</span>
            وصول تذكرة دعم فني جديدة، تغيير حالة تذكرة الدعم، أو إضافة رد جديد على تذاكر الدعم.
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
              }`}
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
              }`}
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
              }`}
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
              }`}
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



  // المشغلات/الأحداث التفصيلية التي ترسل إشعارات مع القوالب والمتغيرات
  const NOTIFICATION_TRIGGERS = [
    {
      id: "notes_response_submitted",
      category: "request",
      nameAr: "تقديم رد من المستفيد على الملاحظات/الرفض",
      description: "قام المستفيد بتقديم رد كتابي أو رفع المرفق المطلوب لحسابه",
      defaultTemplate: "قام المستفيد {اسم_المستفيد} بتقديم رد على الملاحظات للطلب رقم {رقم_الطلب}",
      variables: [
        { placeholder: "{اسم_المستفيد}", nameAr: "اسم المستفيد" },
        { placeholder: "{رقم_الطلب}", nameAr: "رقم الطلب" }
      ]
    },
    {
      id: "exception_request_submitted",
      category: "request",
      nameAr: "تقديم طلب استثناء جديد من الإمام",
      description: "قام الإمام بتقديم طلب استثناء لتقديم طلب جديد بالرغم من وجود طلب معلق",
      defaultTemplate: "قام الإمام {اسم_الإمام} بتقديم طلب استثناء للطلب رقم {رقم_الطلب}",
      variables: [
        { placeholder: "{اسم_الإمام}", nameAr: "اسم الإمام" },
        { placeholder: "{رقم_الطلب}", nameAr: "رقم الطلب" }
      ]
    },
    {
      id: "mosque_created",
      category: "request",
      nameAr: "إضافة مسجد جديد بانتظار الموافقة",
      description: "تم إضافة مسجد جديد وهو بانتظار الموافقة",
      defaultTemplate: "تم إضافة مسجد جديد {اسم_المسجد} وهو بانتظار الموافقة",
      variables: [
        { placeholder: "{اسم_المسجد}", nameAr: "اسم المسجد" }
      ]
    },
    {
      id: "mosque_approved",
      category: "request",
      nameAr: "قبول طلب تسجيل مسجد",
      description: "تم قبول طلب تسجيل المسجد الخاص بك: مسجد رحمان",
      defaultTemplate: "تم قبول طلب تسجيل المسجد الخاص بك: {اسم_المسجد}",
      variables: [
        { placeholder: "{اسم_المسجد}", nameAr: "اسم المسجد" }
      ]
    },
    {
      id: "request_created_admin",
      category: "request",
      nameAr: "إنشاء طلب من مسؤول آخر",
      description: "قام المدير العام عبدالإله المرزوق بإنشاء طلب جديد رقم...",
      defaultTemplate: "قام المسؤول {اسم_المسؤول} بإنشاء طلب جديد رقم {رقم_الطلب}",
      variables: [
        { placeholder: "{اسم_المسؤول}", nameAr: "اسم المسؤول" },
        { placeholder: "{رقم_الطلب}", nameAr: "رقم الطلب" }
      ]
    },
    {
      id: "request_created_beneficiary",
      category: "request",
      nameAr: "إنشاء طلب من قبل المستفيد",
      description: "تم إنشاء طلب جديد وهو بانتظار المعالجة",
      defaultTemplate: "تم إنشاء طلب جديد رقم {رقم_الطلب} وهو بانتظار المعالجة",
      variables: [
        { placeholder: "{رقم_الطلب}", nameAr: "رقم الطلب" }
      ]
    },
    {
      id: "stage_initial_review",
      category: "request",
      nameAr: "تغير حالة الطلب لـ المراجعة الأولية",
      description: "قام المسؤول بنقل الطلب إلى مرحلة: المراجعة الأولية",
      defaultTemplate: "قام المسؤول {اسم_المسؤول} بنقل الطلب رقم {رقم_الطلب} إلى مرحلة: المراجعة الأولية",
      variables: [
        { placeholder: "{اسم_المسؤول}", nameAr: "اسم المسؤول" },
        { placeholder: "{رقم_الطلب}", nameAr: "رقم الطلب" }
      ]
    },
    {
      id: "stage_field_visit",
      category: "request",
      nameAr: "تغير حالة الطلب لـ الزيارة الميدانية",
      description: "قام المسؤول بنقل الطلب إلى مرحلة: الزيارة الميدانية",
      defaultTemplate: "قام المسؤول {اسم_المسؤول} بنقل الطلب رقم {رقم_الطلب} إلى مرحلة: الزيارة الميدانية",
      variables: [
        { placeholder: "{اسم_المسؤول}", nameAr: "اسم المسؤول" },
        { placeholder: "{رقم_الطلب}", nameAr: "رقم الطلب" }
      ]
    },
    {
      id: "field_visit_report_submitted",
      category: "request",
      nameAr: "رفع تقرير الزيارة الميدانية من قبل فريق الزيارة الميدانية",
      description: "تم رفع تقرير زيارة ميدانية من قبل فريق ميداني جديد",
      defaultTemplate: "تم رفع تقرير زيارة ميدانية من قبل الفريق الميداني للطلب رقم {رقم_الطلب}",
      variables: [
        { placeholder: "{رقم_الطلب}", nameAr: "رقم الطلب" }
      ]
    },
    {
      id: "quick_report_submitted",
      category: "request",
      nameAr: "رفع تقرير الاستجابة السريعة من قبل فريق الاستجابة السريعة",
      description: "تم رفع تقرير الاستجابة السريعة من قبل فريق الاستجابة السريعة",
      defaultTemplate: "تم رفع تقرير الاستجابة السريعة للطلب رقم {رقم_الطلب}",
      variables: [
        { placeholder: "{رقم_الطلب}", nameAr: "رقم الطلب" }
      ]
    },
    {
      id: "converted_to_project",
      category: "request",
      nameAr: "تحويل الطلب لمشروع",
      description: "تم تحويل الطلب إلى مشروع ويحتاج للتقييم المالي",
      defaultTemplate: "تم تحويل الطلب رقم {رقم_الطلب} إلى مشروع ويحتاج للتقييم المالي",
      variables: [
        { placeholder: "{رقم_الطلب}", nameAr: "رقم الطلب" }
      ]
    },
    {
      id: "stage_financial_eval",
      category: "request",
      nameAr: "تغير حالة الطلب لـ التقييم المالي واعتماد العرض",
      description: "قام المسؤول بنقل الطلب إلى مرحلة: التقييم المالي واعتماد العرض",
      defaultTemplate: "قام المسؤول {اسم_المسؤول} بنقل الطلب رقم {رقم_الطلب} إلى مرحلة: التقييم المالي واعتماد العرض",
      variables: [
        { placeholder: "{اسم_المسؤول}", nameAr: "اسم المسؤول" },
        { placeholder: "{رقم_الطلب}", nameAr: "رقم الطلب" }
      ]
    },
    {
      id: "stage_contracting",
      category: "request",
      nameAr: "تغير حالة الطلب لـ التعاقد",
      description: "قام المسؤول بنقل الطلب إلى مرحلة: التعاقد",
      defaultTemplate: "قام المسؤول {اسم_المسؤول} بنقل الطلب رقم {رقم_الطلب} إلى مرحلة: التعاقد",
      variables: [
        { placeholder: "{اسم_المسؤول}", nameAr: "اسم المسؤول" },
        { placeholder: "{رقم_الطلب}", nameAr: "رقم الطلب" }
      ]
    },
    {
      id: "stage_execution",
      category: "request",
      nameAr: "تغير حالة الطلب لـ التنفيذ",
      description: "قام المسؤول بنقل الطلب إلى مرحلة: التنفيذ",
      defaultTemplate: "قام المسؤول {اسم_المسؤول} بنقل الطلب رقم {رقم_الطلب} إلى مرحلة: التنفيذ",
      variables: [
        { placeholder: "{اسم_المسؤول}", nameAr: "اسم المسؤول" },
        { placeholder: "{رقم_الطلب}", nameAr: "رقم الطلب" }
      ]
    },
    {
      id: "stage_closed",
      category: "request",
      nameAr: "تغير حالة الطلب لـ الإغلاق",
      description: "قام المسؤول بنقل الطلب إلى مرحلة: الإغلاق",
      defaultTemplate: "قام المسؤول {اسم_المسؤول} بنقل الطلب رقم {رقم_الطلب} إلى مرحلة: الإغلاق",
      variables: [
        { placeholder: "{اسم_المسؤول}", nameAr: "اسم المسؤول" },
        { placeholder: "{رقم_الطلب}", nameAr: "رقم الطلب" }
      ]
    },
    {
      id: "support_ticket_created",
      category: "request",
      nameAr: "اشعار وصول تذكرة دعم",
      description: "قام المسؤول محمد بإضافة رد جديد على تذكرة الدعم رقم #7",
      defaultTemplate: "تم إنشاء تذكرة دعم فني جديدة رقم #{رقم_التذكرة}",
      variables: [
        { placeholder: "{رقم_التذكرة}", nameAr: "رقم التذكرة" }
      ]
    },
    {
      id: "support_ticket_status_changed",
      category: "request",
      nameAr: "اشعار تغير حالة التذكرة",
      description: "تم تغيير حالة تذكرة الدعم رقم #7 إلى: تحتاج توضيح",
      defaultTemplate: "تم تغيير حالة تذكرة الدعم رقم #{رقم_التذكرة} إلى: {الحالة_الجديدة}",
      variables: [
        { placeholder: "{رقم_التذكرة}", nameAr: "رقم التذكرة" },
        { placeholder: "{الحالة_الجديدة}", nameAr: "الحالة الجديدة" }
      ]
    },
    {
      id: "support_ticket_reply_added",
      category: "request",
      nameAr: "اشعار رد عالتذكرة",
      description: "قام مدير النظام بإضافة رد جديد على تذكرة الدعم الخاصة بك رقم #7",
      defaultTemplate: "قام المسؤول {اسم_المرسل} بإضافة رد جديد على تذكرة الدعم رقم #{رقم_التذكرة}",
      variables: [
        { placeholder: "{اسم_المرسل}", nameAr: "اسم المرسل" },
        { placeholder: "{رقم_التذكرة}", nameAr: "رقم التذكرة" }
      ]
    },
    {
      id: "supplier_created",
      category: "financial",
      nameAr: "إضافة مورد جديد",
      description: 'تم تسجيل مورد جديد في البوابة: "محمد الأشعري" وهو بانتظار المراجعة والاعتماد',
      defaultTemplate: "تم تسجيل مورد جديد في البوابة: \"{اسم_المورد}\" وهو بانتظار المراجعة والاعتماد",
      variables: [
        { placeholder: "{اسم_المورد}", nameAr: "اسم المورد" }
      ]
    },
    {
      id: "supplier_approved",
      category: "financial",
      nameAr: "اعتماد مورد",
      description: 'قام المسؤول عبدالإله المرزوق باعتماد المورد: "محمد الأشعري" بنجاح',
      defaultTemplate: "قام المسؤول {اسم_المسؤول} باعتماد المورد: \"{اسم_المورد}\" بنجاح",
      variables: [
        { placeholder: "{اسم_المسؤول}", nameAr: "اسم المسؤول" },
        { placeholder: "{اسم_المورد}", nameAr: "اسم المورد" }
      ]
    },
    {
      id: "supplier_rejected",
      category: "financial",
      nameAr: "رفض مورد",
      description: 'قام المسؤول عبدالإله المرزوق برفض المورد: "محمد الأشعري" بسبب: عدم الالتزام',
      defaultTemplate: "قام المسؤول {اسم_المسؤول} برفض المورد: \"{اسم_المورد}\" بسبب: {السبب}",
      variables: [
        { placeholder: "{اسم_المسؤول}", nameAr: "اسم المسؤول" },
        { placeholder: "{اسم_المورد}", nameAr: "اسم المورد" },
        { placeholder: "{السبب}", nameAr: "السبب" }
      ]
    },
    {
      id: "quotation_created",
      category: "financial",
      nameAr: "إضافة عرض سعر جديد",
      description: 'تم إضافة عرض سعر جديد رقم "PW9R-QJAUT2MQ-QUO" من قبل المورد "محمد الأشعري" للطلب رقم REQ-2026-DAA-0124',
      defaultTemplate: "تم إضافة عرض سعر جديد رقم \"{رقم_العرض}\" من قبل المورد \"{اسم_المورد}\" للطلب رقم {رقم_الطلب}",
      variables: [
        { placeholder: "{رقم_العرض}", nameAr: "رقم العرض" },
        { placeholder: "{اسم_المورد}", nameAr: "اسم المورد" },
        { placeholder: "{رقم_الطلب}", nameAr: "رقم الطلب" }
      ]
    },
    {
      id: "quotation_approved",
      category: "financial",
      nameAr: "اعتماد عرض سعر",
      description: 'تم اعتماد عرض السعر رقم "17DF-OC08MPTC-QUO" للمورد "محمد الأشعري" للطلب رقم REQ-2026-DAA-0124 بقيمة 119951.00 ريال',
      defaultTemplate: "تم اعتماد عرض السعر رقم \"{رقم_العرض}\" للمورد \"{اسم_المورد}\" للطلب رقم {رقم_الطلب} بقيمة {القيمة} ريال",
      variables: [
        { placeholder: "{رقم_العرض}", nameAr: "رقم العرض" },
        { placeholder: "{اسم_المورد}", nameAr: "اسم المورد" },
        { placeholder: "{رقم_الطلب}", nameAr: "رقم الطلب" },
        { placeholder: "{القيمة}", nameAr: "القيمة" }
      ]
    },
    {
      id: "contract_created",
      category: "financial",
      nameAr: "إنشاء عقد جديد",
      description: 'تم إنشاء عقد جديد رقم "CNT-2026-0068" مع المورد "محمد" للطلب رقم REQ-2026-DAA-0151 بقيمة 300000 ريال',
      defaultTemplate: "تم إنشاء عقد جديد رقم \"{رقم_العقد}\" مع المورد \"{اسم_المورد}\" للطلب رقم {رقم_الطلب} بقيمة {القيمة} ريال",
      variables: [
        { placeholder: "{رقم_العقد}", nameAr: "رقم العقد" },
        { placeholder: "{اسم_المورد}", nameAr: "اسم المورد" },
        { placeholder: "{رقم_الطلب}", nameAr: "رقم الطلب" },
        { placeholder: "{القيمة}", nameAr: "القيمة" }
      ]
    },
    {
      id: "contract_approved",
      category: "financial",
      nameAr: "اعتماد عقد",
      description: 'تم اعتماد العقد رقم "CNT-2026-0068" للمورد "محمد" للطلب رقم REQ-2026-DAA-0151 بقيمة 300000.00 ريال',
      defaultTemplate: "تم اعتماد العقد رقم \"{رقم_العقد}\" للمورد \"{اسم_المورد}\" للطلب رقم {رقم_الطلب} بقيمة {القيمة} ريال",
      variables: [
        { placeholder: "{رقم_العقد}", nameAr: "رقم العقد" },
        { placeholder: "{اسم_المورد}", nameAr: "اسم المورد" },
        { placeholder: "{رقم_الطلب}", nameAr: "رقم الطلب" },
        { placeholder: "{القيمة}", nameAr: "القيمة" }
      ]
    },
    {
      id: "progress_report_created",
      category: "financial",
      nameAr: "إنشاء تقرير إنجاز",
      description: 'تم إنشاء تقرير إنجاز جديد رقم "RPT-2026-0030" للمشروع "مشروع تجريبي" للطلب رقم REQ-2026-DAA-014',
      defaultTemplate: "تم إنشاء تقرير إنجاز جديد رقم \"{رقم_التقرير}\" للمشروع \"{اسم_المشروع}\" للطلب رقم {رقم_الطلب}",
      variables: [
        { placeholder: "{رقم_التقرير}", nameAr: "رقم التقرير" },
        { placeholder: "{اسم_المشروع}", nameAr: "اسم المشروع" },
        { placeholder: "{رقم_الطلب}", nameAr: "رقم الطلب" }
      ]
    },
    {
      id: "progress_report_approved",
      category: "financial",
      nameAr: "اعتماد تقرير إنجاز",
      description: 'تم اعتماد تقرير الإنجاز رقم "RPT-2026-0030" للمشروع "مشروع تجريبي" للطلب رقم REQ-2026-DAA-014',
      defaultTemplate: "تم اعتماد تقرير الإنجاز رقم \"{رقم_التقرير}\" للمشروع \"{اسم_المشروع}\" للطلب رقم {رقم_الطلب}",
      variables: [
        { placeholder: "{رقم_التقرير}", nameAr: "رقم التقرير" },
        { placeholder: "{اسم_المشروع}", nameAr: "اسم المشروع" },
        { placeholder: "{رقم_الطلب}", nameAr: "رقم الطلب" }
      ]
    },
    {
      id: "disbursement_request_created",
      category: "financial",
      nameAr: "إنشاء طلب صرف",
      description: 'تم إنشاء طلب صرف جديد رقم "DR-2026-0051" للمشروع "ترميم جامع النور" بقيمة 50,000 ريال',
      defaultTemplate: "تم إنشاء طلب صرف جديد رقم \"{رقم_طلب_الصرف}\" للمشروع \"{اسم_المشروع}\" بقيمة {القيمة} ريال",
      variables: [
        { placeholder: "{رقم_طلب_الصرف}", nameAr: "رقم طلب الصرف" },
        { placeholder: "{اسم_المشروع}", nameAr: "اسم المشروع" },
        { placeholder: "{القيمة}", nameAr: "القيمة" }
      ]
    },
    {
      id: "disbursement_converted_to_order",
      category: "financial",
      nameAr: "تحويل طلب الصرف إلى أمر صرف",
      description: 'تم تحويل طلب الصرف رقم "DR-2026-0051" إلى أمر صرف رقم "DO-2026-0023" للمشروع "ترميم جامع النور" بقيمة 50,000 ريال',
      defaultTemplate: "تم تحويل طلب الصرف رقم \"{رقم_طلب_الصرف}\" إلى أمر صرف رقم \"{رقم_أمر_الصرف}\" للمشروع \"{اسم_المشروع}\" بقيمة {القيمة} ريال",
      variables: [
        { placeholder: "{رقم_طلب_الصرف}", nameAr: "رقم طلب الصرف" },
        { placeholder: "{رقم_أمر_الصرف}", nameAr: "رقم أمر الصرف" },
        { placeholder: "{اسم_المشروع}", nameAr: "اسم المشروع" },
        { placeholder: "{القيمة}", nameAr: "القيمة" }
      ]
    },
    {
      id: "disbursement_order_pending_board_executive",
      category: "financial",
      nameAr: "تحويل أمر الصرف للاعتماد المالي (مرتبط بمشروع وطلب صرف)",
      description: 'تم تحويل أمر الصرف رقم "DO-2026-0023" (طلب رقم DR-2026-0051) للمشروع "ترميم جامع النور" للاعتماد المالي بقيمة 50,000 ريال',
      defaultTemplate: "تم تحويل أمر الصرف رقم \"{رقم_أمر_الصرف}\" (طلب رقم {رقم_طلب_الصرف}) للمشروع \"{اسم_المشروع}\" للاعتماد المالي بقيمة {القيمة} ريال",
      variables: [
        { placeholder: "{رقم_أمر_الصرف}", nameAr: "رقم أمر الصرف" },
        { placeholder: "{رقم_طلب_الصرف}", nameAr: "رقم طلب الصرف" },
        { placeholder: "{اسم_المشروع}", nameAr: "اسم المشروع" },
        { placeholder: "{القيمة}", nameAr: "القيمة" }
      ]
    },
    {
      id: "disbursement_order_pending_board_executive_general",
      category: "financial",
      nameAr: "تحويل أمر الصرف للاعتماد المالي (أمر صرف مخصص - غير مرتبط بمشروع وطلب صرف)",
      description: 'تم تحويل أمر الصرف رقم "DO-2026-0023" للاعتماد المالي بقيمة 50,000 ريال',
      defaultTemplate: "تم تحويل أمر الصرف رقم \"{رقم_أمر_الصرف}\" للاعتماد المالي بقيمة {القيمة} ريال",
      variables: [
        { placeholder: "{رقم_أمر_الصرف}", nameAr: "رقم أمر الصرف" },
        { placeholder: "{القيمة}", nameAr: "القيمة" }
      ]
    },
    {
      id: "disbursement_order_approved",
      category: "financial",
      nameAr: "الاعتماد المالي (مرتبط بمشروع وطلب صرف)",
      description: 'تم الاعتماد المالي لأمر الصرف رقم "DO-2026-0023" (طلب رقم DR-2026-0051) للمشروع "ترميم جامع النور" بقيمة 50,000 ريال',
      defaultTemplate: "تم الاعتماد المالي لأمر الصرف رقم \"{رقم_أمر_الصرف}\" (طلب رقم {رقم_طلب_الصرف}) للمشروع \"{اسم_المشروع}\" بقيمة {القيمة} ريال",
      variables: [
        { placeholder: "{رقم_أمر_الصرف}", nameAr: "رقم أمر الصرف" },
        { placeholder: "{رقم_طلب_الصرف}", nameAr: "رقم طلب الصرف" },
        { placeholder: "{اسم_المشروع}", nameAr: "اسم المشروع" },
        { placeholder: "{القيمة}", nameAr: "القيمة" }
      ]
    },
    {
      id: "disbursement_order_approved_general",
      category: "financial",
      nameAr: "الاعتماد المالي (غير مرتبط بمشروع وغير مرتبط بطلب صرف)",
      description: 'تم الاعتماد المالي لأمر الصرف رقم "DO-2026-0023" بقيمة 50,000 ريال',
      defaultTemplate: "تم الاعتماد المالي لأمر الصرف رقم \"{رقم_أمر_الصرف}\" بقيمة {القيمة} ريال",
      variables: [
        { placeholder: "{رقم_أمر_الصرف}", nameAr: "رقم أمر الصرف" },
        { placeholder: "{القيمة}", nameAr: "القيمة" }
      ]
    },
    {
      id: "disbursement_order_rejected",
      category: "financial",
      nameAr: "رفض أمر صرف",
      description: 'تم رفض أمر الصرف رقم "DO-2026-0023" للمشروع "ترميم جامع النور" بقيمة 50,000 ريال بسبب: عدم اكتمال المرفقات',
      defaultTemplate: "تم رفض أمر الصرف رقم \"{رقم_أمر_الصرف}\" للمشروع \"{اسم_المشروع}\" بقيمة {القيمة} ريال بسبب: {السبب}",
      variables: [
        { placeholder: "{رقم_أمر_الصرف}", nameAr: "رقم أمر الصرف" },
        { placeholder: "{اسم_المشروع}", nameAr: "اسم المشروع" },
        { placeholder: "{القيمة}", nameAr: "القيمة" },
        { placeholder: "{السبب}", nameAr: "السبب" },
        { placeholder: "{رقم_طلب_الصرف}", nameAr: "رقم طلب الصرف (اختياري عند الارتباط بطلب)" }
      ]
    }
  ];

  const [selectedTriggerRoleId, setSelectedTriggerRoleId] = useState("field_team");

  // حاله المودال وتعديل القوالب
  const [selectedTriggerForEdit, setSelectedTriggerForEdit] = useState<any>(null);
  const [editingTemplateMessage, setEditingTemplateMessage] = useState("");
  const [isEditTemplateOpen, setIsEditTemplateOpen] = useState(false);

  const editorRef = useRef<HTMLDivElement>(null);
  const lastInitializedTriggerId = useRef<string | null>(null);
  const debounceTimerRef = useRef<any>(null);

  // تحويل القالب من نص عادي إلى HTML يحتوي على أزرار المتغيرات كـ spans غير قابلة للتعديل
  const convertTemplateToHtml = (template: string, variables: { placeholder: string; nameAr: string }[]) => {
    let html = template;
    // ترميز الرموز الخاصة لتجنب مشاكل HTML
    html = html
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");

    // استبدال المتغيرات بعناصر Span تفاعلية
    variables.forEach(v => {
      const escapedPlaceholder = v.placeholder.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
      const regex = new RegExp(escapedPlaceholder, 'g');
      html = html.replace(
        regex,
        `<span data-placeholder="${v.placeholder}" contenteditable="false" class="relative inline-flex items-center bg-[#09707e]/10 dark:bg-[#09707e]/20 text-[#09707e] dark:text-teal-350 pr-6 pl-2.5 py-0.5 rounded-lg border border-[#09707e]/25 dark:border-[#09707e]/40 text-[11px] sm:text-xs font-bold mx-1.5 select-all cursor-grab active:cursor-grabbing align-middle" draggable="true" data-type="variable-chip">${v.placeholder}<button type="button" class="absolute -top-1.5 -right-1.5 inline-flex items-center justify-center w-4.5 h-4.5 min-w-[18px] min-h-[18px] bg-red-50 hover:bg-red-500 text-red-600 hover:text-white rounded-full text-[10px] font-extrabold transition-all duration-150 select-none shadow-xs border border-red-200/80 dark:bg-red-950/60 dark:border-red-900/60 leading-none cursor-pointer">×</button></span>`
      );
    });
    return html;
  };

  // تحويل محتوى الـ HTML من المحرر إلى قالب نصي يحتوي على المتغيرات بصيغة {placeholder}
  const convertHtmlToTemplate = (html: string) => {
    const tempDiv = document.createElement("div");
    tempDiv.innerHTML = html;
    
    // استبدال كل span متغير بنصه الافتراضي
    const chips = tempDiv.querySelectorAll('[data-type="variable-chip"]');
    chips.forEach(chip => {
      const placeholder = chip.getAttribute('data-placeholder');
      if (placeholder) {
        chip.replaceWith(document.createTextNode(placeholder));
      }
    });
    
    return tempDiv.innerText || tempDiv.textContent || "";
  };

  // معرفة المتغيرات المستخدمة حالياً في النص
  const getUsedVariables = (text: string, variables: { placeholder: string; nameAr: string }[]) => {
    const used: Record<string, boolean> = {};
    variables.forEach(v => {
      if (text.includes(v.placeholder)) {
        used[v.placeholder] = true;
      }
    });
    return used;
  };

  // مزامنة محتوى المحرر مع الحالة
  const syncContent = () => {
    if (editorRef.current && selectedTriggerForEdit) {
      const html = editorRef.current.innerHTML;
      const templateText = convertHtmlToTemplate(html);
      setEditingTemplateMessage(templateText);
    }
  };

  // مزامنة مؤجلة أثناء الكتابة لتفادي بطء الاستجابة ولتمكين الكتابة اللحظية السلسة
  const debouncedSyncContent = () => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    debounceTimerRef.current = setTimeout(() => {
      syncContent();
    }, 350);
  };

  const editorRefCallback = useCallback((node: HTMLDivElement | null) => {
    if (node) {
      (editorRef as any).current = node;
      if (selectedTriggerForEdit && lastInitializedTriggerId.current !== selectedTriggerForEdit.id) {
        lastInitializedTriggerId.current = selectedTriggerForEdit.id;
        const initialHtml = convertTemplateToHtml(
          getTemplateMessage(selectedTriggerForEdit.id),
          selectedTriggerForEdit.variables || []
        );
        node.innerHTML = initialHtml;
      }
    }
  }, [selectedTriggerForEdit]);

  // جلب إعدادات مشغلات الإشعارات التفصيلية من الباكيند
  const { data: triggerSettings, refetch: refetchTriggerSettings } = trpc.notifications.getTriggerSettings.useQuery();

  // جلب قوالب رسائل الإشعارات المخصصة
  const { data: customTemplates, refetch: refetchTemplates } = trpc.notifications.getNotificationTemplates.useQuery();

  const updateTriggerSettingMutation = trpc.notifications.updateTriggerSetting.useMutation({
    onSuccess: () => {
      refetchTriggerSettings();
      toast.success("تم تحديث إعدادات الحدث بنجاح");
    },
    onError: (err) => {
      toast.error(err.message || "حدث خطأ أثناء حفظ التحديث");
    }
  });

  const updateTemplateMutation = trpc.notifications.updateNotificationTemplate.useMutation({
    onSuccess: () => {
      refetchTemplates();
      toast.success("تم تحديث قالب الإشعار بنجاح");
      setIsEditTemplateOpen(false);
    },
    onError: (err) => {
      toast.error(err.message || "حدث خطأ أثناء حفظ القالب");
    }
  });

  const handleToggleTriggerSetting = (
    triggerId: string,
    channel: 'in_app' | 'email' | 'whatsapp' | 'sms',
    val: boolean
  ) => {
    updateTriggerSettingMutation.mutate({
      triggerId,
      roleId: selectedTriggerRoleId,
      channel,
      enabled: val
    });
  };

  const getTemplateMessage = (triggerId: string) => {
    const custom = customTemplates?.find(t => t.triggerId === triggerId);
    if (custom) return custom.templateMessage;
    const trigger = NOTIFICATION_TRIGGERS.find(t => t.id === triggerId);
    return trigger?.defaultTemplate || "";
  };

  const DUMMY_SAMPLES: Record<string, string> = {
    "{رقم_الطلب}": "REQ-2026-DAA-0124",
    "{اسم_المستفيد}": "أحمد علي",
    "{اسم_الإمام}": "الشيخ خالد",
    "{اسم_المسجد}": "مسجد التقوى",
    "{اسم_المسؤول}": "عبد الله محمد",
    "{رقم_التذكرة}": "7",
    "{الحالة_الجديدة}": "تحتاج توضيح",
    "{اسم_المرسل}": "سعد الغامدي",
    "{اسم_المورد}": "شركة المقاولات الحديثة",
    "{رقم_العرض}": "PW9R-QUO",
    "{رقم_العقد}": "CNT-2026-0068",
    "{رقم_التقرير}": "RPT-2026-0030",
    "{اسم_المشروع}": "ترميم جامع النور",
    "{رقم_طلب_الصرف}": "DR-2026-0051",
    "{رقم_أمر_الصرف}": "DO-2026-0023",
    "{السبب}": "عدم اكتمال المرفقات",
    "{القيمة}": "50,000"
  };

  const getTemplatePreview = (triggerId: string) => {
    let template = getTemplateMessage(triggerId);
    if (!template) return "";
    Object.entries(DUMMY_SAMPLES).forEach(([placeholder, sample]) => {
      template = template.replace(new RegExp(placeholder, 'g'), sample);
    });
    return template;
  };

  const handleOpenEditTemplateModal = (trigger: any) => {
    lastInitializedTriggerId.current = null;
    setSelectedTriggerForEdit(trigger);
    setEditingTemplateMessage(getTemplateMessage(trigger.id));
    setIsEditTemplateOpen(true);
  };

  const handleInsertVariable = (placeholder: string) => {
    if (!editorRef.current || !selectedTriggerForEdit) return;

    const chipHtml = `<span data-placeholder="${placeholder}" contenteditable="false" class="relative inline-flex items-center bg-[#09707e]/10 dark:bg-[#09707e]/20 text-[#09707e] dark:text-teal-350 pr-6 pl-2.5 py-0.5 rounded-lg border border-[#09707e]/25 dark:border-[#09707e]/40 text-[11px] sm:text-xs font-bold mx-1.5 select-all cursor-grab active:cursor-grabbing align-middle" draggable="true" data-type="variable-chip">${placeholder}<button type="button" class="absolute -top-1.5 -right-1.5 inline-flex items-center justify-center w-4.5 h-4.5 min-w-[18px] min-h-[18px] bg-red-50 hover:bg-red-500 text-red-600 hover:text-white rounded-full text-[10px] font-extrabold transition-all duration-150 select-none shadow-xs border border-red-200/80 dark:bg-red-950/60 dark:border-red-900/60 leading-none cursor-pointer">×</button></span> `;

    editorRef.current.focus();

    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);

      if (editorRef.current.contains(range.startContainer)) {
        range.deleteContents();

        const tempDiv = document.createElement("div");
        tempDiv.innerHTML = chipHtml;

        const fragment = document.createDocumentFragment();
        let node;
        while ((node = tempDiv.firstChild)) {
          fragment.appendChild(node);
        }

        range.insertNode(fragment);
        range.collapse(false);
        selection.removeAllRanges();
        selection.addRange(range);
      } else {
        editorRef.current.innerHTML += chipHtml;
      }
    } else {
      editorRef.current.innerHTML += chipHtml;
    }

    syncContent();
  };

  const handleContentEditableClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    if (target.tagName === 'BUTTON' && target.parentElement?.getAttribute('data-type') === 'variable-chip') {
      target.parentElement.remove();
      syncContent();
    }
  };

  const dragCaretRef = useRef<{ container: Node | null; offset: number }>({ container: null, offset: -1 });

  // مساعد لتقريب مؤشر السحب لأقرب فراغ بين الكلمات فقط (Word Boundary Snapping)
  const snapRangeToWordBoundary = (range: Range) => {
    const container = range.startContainer;
    if (container.nodeType === Node.TEXT_NODE) {
      const text = container.textContent || "";
      const offset = range.startOffset;
      
      // إذا كنا في الفراغ أو بداية/نهاية النص، فلا داعي للتغيير
      if (offset === 0 || offset === text.length || /\s/.test(text[offset - 1]) || /\s/.test(text[offset])) {
        return range;
      }
      
      // البحث عن أقرب فراغ قبل المؤشر
      let spaceBefore = -1;
      for (let i = offset - 1; i >= 0; i--) {
        if (/\s/.test(text[i])) {
          spaceBefore = i + 1; // الموقع بعد الفراغ
          break;
        }
      }
      if (spaceBefore === -1) spaceBefore = 0;
      
      // البحث عن أقرب فراغ بعد المؤشر
      let spaceAfter = -1;
      for (let i = offset; i < text.length; i++) {
        if (/\s/.test(text[i])) {
          spaceAfter = i; // الموقع قبل الفراغ
          break;
        }
      }
      if (spaceAfter === -1) spaceAfter = text.length;
      
      // اختيار الفراغ الأقرب رقمياً للمؤشر الفعلي
      const distBefore = offset - spaceBefore;
      const distAfter = spaceAfter - offset;
      
      const newOffset = distBefore <= distAfter ? spaceBefore : spaceAfter;
      range.setStart(container, newOffset);
      range.setEnd(container, newOffset);
    }
    return range;
  };

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    if (target.getAttribute('data-type') === 'variable-chip') {
      target.classList.add('is-dragging');
      e.dataTransfer.setData('text/plain', target.getAttribute('data-placeholder') || '');
      
      // إخفاء العنصر الأصلي بعد التقاط صورته من قبل المتصفح لتبدو وكأنها سُحبت بالكامل
      setTimeout(() => {
        target.style.display = 'none';
      }, 0);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    let range: Range | null = null;
    if ((document as any).caretRangeFromPoint) {
      range = (document as any).caretRangeFromPoint(e.clientX, e.clientY);
    }
    if (range && editorRef.current?.contains(range.startContainer)) {
      // تقريب المؤشر للمسافات بين الكلمات فقط
      range = snapRangeToWordBoundary(range);
      
      const container = range.startContainer;
      const offset = range.startOffset;

      if (container !== dragCaretRef.current.container || offset !== dragCaretRef.current.offset) {
        dragCaretRef.current = { container, offset };

        const existing = editorRef.current.querySelector('[data-type="drop-placeholder"]');
        if (existing) {
          existing.remove();
        }

        const placeholder = document.createElement('span');
        placeholder.setAttribute('data-type', 'drop-placeholder');
        placeholder.setAttribute('contenteditable', 'false');
        placeholder.className = "inline-block w-24 h-6 border-2 border-dashed border-teal-405 bg-teal-50/20 dark:bg-teal-950/20 rounded-lg mx-1 align-middle pointer-events-none transition-all duration-300 animate-pulse";
        
        try {
          range.insertNode(placeholder);
        } catch (err) {
          console.error("Error inserting placeholder", err);
        }
      }
    }
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    if (!editorRef.current?.contains(e.relatedTarget as Node)) {
      const existing = editorRef.current?.querySelector('[data-type="drop-placeholder"]');
      if (existing) {
        existing.remove();
      }
      dragCaretRef.current = { container: null, offset: -1 };
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    
    const placeholder = editorRef.current?.querySelector('[data-type="drop-placeholder"]');
    if (placeholder) {
      const data = e.dataTransfer.getData('text/plain');
      if (data && selectedTriggerForEdit) {
        // إزالة العنصر الأصلي المسحوب لتفادي التكرار
        const draggedElement = editorRef.current?.querySelector('.is-dragging');
        if (draggedElement) {
          draggedElement.remove();
        }

        const chipHtml = `<span data-placeholder="${data}" contenteditable="false" class="relative inline-flex items-center bg-[#09707e]/10 dark:bg-[#09707e]/20 text-[#09707e] dark:text-teal-350 pr-6 pl-2.5 py-0.5 rounded-lg border border-[#09707e]/25 dark:border-[#09707e]/40 text-[11px] sm:text-xs font-bold mx-1.5 select-all cursor-grab active:cursor-grabbing align-middle" draggable="true" data-type="variable-chip">${data}<button type="button" class="absolute -top-1.5 -right-1.5 inline-flex items-center justify-center w-4.5 h-4.5 min-w-[18px] min-h-[18px] bg-red-50 hover:bg-red-500 text-red-600 hover:text-white rounded-full text-[10px] font-extrabold transition-all duration-150 select-none shadow-xs border border-red-200/80 dark:bg-red-950/60 dark:border-red-900/60 leading-none cursor-pointer">×</button></span> `;
        
        const tempDiv = document.createElement("div");
        tempDiv.innerHTML = chipHtml;
        
        const fragment = document.createDocumentFragment();
        let node;
        while ((node = tempDiv.firstChild)) {
          fragment.appendChild(node);
        }
        
        placeholder.replaceWith(fragment);
      } else {
        placeholder.remove();
      }
    }
    
    dragCaretRef.current = { container: null, offset: -1 };
    syncContent();
  };

  const handleDragEnd = (e: React.DragEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    if (target.getAttribute('data-type') === 'variable-chip') {
      target.classList.remove('is-dragging');
      if (e.dataTransfer.dropEffect === 'none') {
        // إذا تم إفلات العنصر خارج المحرر (إلغاء السحب أو سحبه للخارج)، نقوم بحذفه تماماً كأنه نقر زر الإلغاء
        target.remove();
      } else {
        target.style.display = ''; // استعادة ظهور العنصر الأصلي في حالة إلغاء السحب
      }
    }
    const placeholder = editorRef.current?.querySelector('[data-type="drop-placeholder"]');
    if (placeholder) {
      placeholder.remove();
    }
    dragCaretRef.current = { container: null, offset: -1 };
    setTimeout(() => {
      syncContent();
    }, 50);
  };

  const handleSaveTemplate = () => {
    if (!selectedTriggerForEdit) return;
    
    // قراءة النص النهائي من الـ DOM مباشرة لضمان حفظ التعديلات اللحظية غير المتزامنة بعد
    const finalMessage = editorRef.current 
      ? convertHtmlToTemplate(editorRef.current.innerHTML)
      : editingTemplateMessage;

    updateTemplateMutation.mutate({
      triggerId: selectedTriggerForEdit.id,
      templateMessage: finalMessage
    });
  };

  const getTriggerChannelState = (triggerId: string, channel: 'in_app' | 'email' | 'whatsapp' | 'sms') => {
    // 1. التحقق من وجود تخصيص مخزن في قاعدة البيانات
    const override = triggerSettings?.find(
      ts => ts.triggerId === triggerId && 
            ts.roleId === selectedTriggerRoleId && 
            ts.channel === channel
    );
    if (override !== undefined) {
      return { enabled: !!override.enabled, isInherited: false };
    }

    // 2. إذا لم يوجد تخصيص، نرث القيمة الافتراضية من إعدادات الدور العامة
    const roleObj = dbRoles?.find(r => r.id === selectedTriggerRoleId);
    const financialTriggers = [
      "supplier_created",
      "supplier_approved",
      "supplier_rejected",
      "quotation_created",
      "quotation_approved",
      "contract_created",
      "contract_approved",
      "progress_report_created",
      "progress_report_approved",
      "disbursement_request_created",
      "disbursement_converted_to_order",
      "disbursement_order_pending_board_executive",
      "disbursement_order_pending_board_executive_general",
      "disbursement_order_approved",
      "disbursement_order_approved_general",
      "disbursement_order_rejected"
    ];
    const isFinancial = financialTriggers.includes(triggerId);
    
    let inherited = false;
    if (isFinancial) {
      if (channel === 'in_app') inherited = !!roleObj?.receiveFinancialAndContractNotifications;
      if (channel === 'email') inherited = !!roleObj?.receiveFinancialEmail;
      if (channel === 'whatsapp') inherited = !!roleObj?.receiveFinancialWhatsapp;
      if (channel === 'sms') inherited = !!roleObj?.receiveFinancialSms;
    } else {
      if (channel === 'in_app') inherited = !!roleObj?.receiveRequestNotifications;
      if (channel === 'email') inherited = !!roleObj?.receiveRequestEmail;
      if (channel === 'whatsapp') inherited = !!roleObj?.receiveRequestWhatsapp;
      if (channel === 'sms') inherited = !!roleObj?.receiveRequestSms;
    }

    return { enabled: inherited, isInherited: true };
  };



  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4">
        {/* رأس الصفحة مع زر الرجوع */}
        <div className="flex items-center gap-4 mb-6" dir="rtl">
          <Link href="/settings">
            <Button variant="ghost" size="icon" type="button">
              <ArrowRight className="w-5 h-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-foreground">تخصيص الإشعارات</h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">تخصيص استقبال إشعارات النظام للأدوار والمستخدمين</p>
          </div>
        </div>

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

            <Card className="border border-border/50 shadow-sm overflow-hidden rounded-xl mt-6">
              <CardHeader className="bg-slate-50/50 dark:bg-slate-900/10 border-b border-border/50 p-4 sm:p-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <CardTitle className="text-sm sm:text-base md:text-lg font-bold text-foreground">تخصيص تفصيلي للإشعارات حسب نوع الحدث</CardTitle>
                    <CardDescription className="text-[11px] sm:text-xs md:text-sm mt-1 leading-relaxed">
                      اختر دوراً وظيفياً وخصص بدقة الأحداث التي يرغب في استلام إشعاراتها والقنوات المستخدمة لكل حدث.
                    </CardDescription>
                  </div>
                  <div className="w-full sm:w-64">
                    <select
                      value={selectedTriggerRoleId}
                      onChange={(e) => setSelectedTriggerRoleId(e.target.value)}
                      className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs sm:text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                    >
                      {dbRoles?.filter(role => role.id !== "service_requester").map(role => (
                        <option key={role.id} value={role.id}>
                          {role.nameAr}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="w-full overflow-x-auto scrollbar-thin">
                  <Table className="min-w-[600px]">
                    <TableHeader>
                      <TableRow className="hover:bg-transparent bg-slate-50/30 dark:bg-slate-950/10 border-b border-border/40">
                        <TableHead className="text-right font-bold py-3 sm:py-4 text-xs sm:text-sm text-foreground pr-4 sm:pr-6">الحدث / المشغل</TableHead>
                        <TableHead className="text-center font-bold py-3 sm:py-4 text-xs sm:text-sm text-foreground">تعديل الصياغة</TableHead>
                        <TableHead className="text-center font-bold py-3 sm:py-4 text-xs sm:text-sm text-foreground pl-4 sm:pl-6">قنوات الإرسال المحددة للحدث</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody className="divide-y divide-border/40">
                      {/* === قسم الطلبات والمساجد === */}
                      <TableRow className="bg-slate-50/50 dark:bg-slate-900/30 hover:bg-transparent">
                        <TableCell colSpan={3} className="py-3 pr-4 sm:pr-6 text-right font-bold text-teal-600 dark:text-teal-400 text-xs sm:text-sm border-b border-border/40">
                          قسم الطلبات والمساجد
                        </TableCell>
                      </TableRow>
                      {NOTIFICATION_TRIGGERS.filter(t => t.category === "request").map(trig => {
                        const inAppState = getTriggerChannelState(trig.id, 'in_app');
                        const emailState = getTriggerChannelState(trig.id, 'email');
                        const whatsappState = getTriggerChannelState(trig.id, 'whatsapp');
                        const smsState = getTriggerChannelState(trig.id, 'sms');

                        return (
                          <TableRow key={trig.id} className="hover:bg-muted/20 transition-colors">
                            <TableCell className="py-3 sm:py-4 pr-4 sm:pr-6 text-right">
                              <div className="font-semibold text-xs sm:text-sm text-foreground">{trig.nameAr}</div>
                              <div className="text-[10px] sm:text-xs text-muted-foreground mt-1">{getTemplatePreview(trig.id)}</div>
                            </TableCell>
                            <TableCell className="text-center py-3 sm:py-4">
                              <TooltipProvider delayDuration={200}>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="outline"
                                      size="icon"
                                      className="h-7 w-7 text-teal-650 dark:text-teal-400 bg-teal-50/70 hover:bg-teal-100/90 hover:text-teal-700 dark:bg-teal-950/20 dark:hover:bg-teal-950/40 border border-teal-100/30 dark:border-teal-900/30 rounded-lg shadow-xs transition-all duration-200 active:scale-95 mx-auto"
                                      onClick={() => handleOpenEditTemplateModal(trig)}
                                      type="button"
                                    >
                                      <Pencil className="w-3.5 h-3.5" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent side="top">
                                    <span className="text-[10px] sm:text-xs font-semibold">تعديل صيغة الرسالة</span>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </TableCell>
                            <TableCell className="text-center py-3 sm:py-4 pl-4 sm:pl-6">
                              <ChannelToggles
                                inApp={inAppState.enabled}
                                whatsapp={whatsappState.enabled}
                                sms={smsState.enabled}
                                email={emailState.enabled}
                                onToggle={(channel, val) => handleToggleTriggerSetting(trig.id, channel, val)}
                                inherited={{
                                  inApp: inAppState.isInherited,
                                  whatsapp: whatsappState.isInherited,
                                  sms: smsState.isInherited,
                                  email: emailState.isInherited,
                                }}
                              />
                            </TableCell>
                          </TableRow>
                        );
                      })}

                      {/* === قسم المالية والعقود === */}
                      <TableRow className="bg-slate-50/50 dark:bg-slate-900/30 hover:bg-transparent">
                        <TableCell colSpan={3} className="py-3 pr-4 sm:pr-6 text-right font-bold text-teal-600 dark:text-teal-400 text-xs sm:text-sm border-b border-border/40 border-t">
                          قسم المالية والعقود
                        </TableCell>
                      </TableRow>
                      {NOTIFICATION_TRIGGERS.filter(t => t.category === "financial").map(trig => {
                        const inAppState = getTriggerChannelState(trig.id, 'in_app');
                        const emailState = getTriggerChannelState(trig.id, 'email');
                        const whatsappState = getTriggerChannelState(trig.id, 'whatsapp');
                        const smsState = getTriggerChannelState(trig.id, 'sms');

                        return (
                          <TableRow key={trig.id} className="hover:bg-muted/20 transition-colors">
                            <TableCell className="py-3 sm:py-4 pr-4 sm:pr-6 text-right">
                              <div className="font-semibold text-xs sm:text-sm text-foreground">{trig.nameAr}</div>
                              <div className="text-[10px] sm:text-xs text-muted-foreground mt-1">{getTemplatePreview(trig.id)}</div>
                            </TableCell>
                            <TableCell className="text-center py-3 sm:py-4">
                              <TooltipProvider delayDuration={200}>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="outline"
                                      size="icon"
                                      className="h-7 w-7 text-teal-650 dark:text-teal-400 bg-teal-50/70 hover:bg-teal-100/90 hover:text-teal-700 dark:bg-teal-950/20 dark:hover:bg-teal-950/40 border border-teal-100/30 dark:border-teal-900/30 rounded-lg shadow-xs transition-all duration-200 active:scale-95 mx-auto"
                                      onClick={() => handleOpenEditTemplateModal(trig)}
                                      type="button"
                                    >
                                      <Pencil className="w-3.5 h-3.5" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent side="top">
                                    <span className="text-[10px] sm:text-xs font-semibold">تعديل صيغة الرسالة</span>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </TableCell>
                            <TableCell className="text-center py-3 sm:py-4 pl-4 sm:pl-6">
                              <ChannelToggles
                                inApp={inAppState.enabled}
                                whatsapp={whatsappState.enabled}
                                sms={smsState.enabled}
                                email={emailState.enabled}
                                onToggle={(channel, val) => handleToggleTriggerSetting(trig.id, channel, val)}
                                inherited={{
                                  inApp: inAppState.isInherited,
                                  whatsapp: whatsappState.isInherited,
                                  sms: smsState.isInherited,
                                  email: emailState.isInherited,
                                }}
                              />
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
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

        {/* مودال تخصيص رسالة الإشعار */}
        <Dialog open={isEditTemplateOpen} onOpenChange={setIsEditTemplateOpen}>
          <DialogContent className="max-w-xl text-right" dir="rtl" showCloseButton={false}>
            {/* زر إغلاق مخصص لتفادي تداخله جهة اليمين مع العناوين العربية */}
            <DialogClose className="absolute top-4 sm:top-5 left-4 sm:left-5 text-muted-foreground hover:text-foreground opacity-75 hover:opacity-100 transition-all rounded-lg p-1.5 hover:bg-slate-100 dark:hover:bg-slate-900 border border-transparent hover:border-border/40 focus:outline-none select-none active:scale-95 shadow-sm">
              <X className="h-4 w-4 sm:h-5 sm:w-5" />
              <span className="sr-only">إغلاق</span>
            </DialogClose>
            <DialogHeader className="text-right">
              <DialogTitle className="text-base sm:text-lg font-bold text-foreground flex items-center justify-start gap-2">
                <Pencil className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                <span>تخصيص نص رسالة الإشعار</span>
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-1 text-right">
                قم بتخصيص صياغة الإشعار للحدث: <strong className="text-foreground">{selectedTriggerForEdit?.nameAr}</strong>
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 my-4 text-right">
              <div className="space-y-2">
                <label className="text-xs sm:text-sm font-bold text-foreground block text-right">
                  نص رسالة الإشعار:
                </label>
                <div
                  ref={editorRefCallback}
                  id="template-editor"
                  contentEditable
                  suppressContentEditableWarning
                  onInput={debouncedSyncContent}
                  onClick={handleContentEditableClick}
                  onDragStart={handleDragStart}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onDragEnd={handleDragEnd}
                  className="w-full min-h-[120px] max-h-[250px] overflow-y-auto rounded-xl border border-border bg-background p-3 text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-teal-500/20 leading-relaxed text-right rtl cursor-text scrollbar-thin"
                  style={{ direction: 'rtl' }}
                />
              </div>

              {selectedTriggerForEdit?.variables && selectedTriggerForEdit.variables.length > 0 ? (
                (() => {
                  const usedVars = getUsedVariables(editingTemplateMessage, selectedTriggerForEdit.variables);
                  return (
                    <div className="space-y-2 bg-slate-50 dark:bg-slate-900/30 p-3.5 rounded-xl border border-border/40 text-right">
                      <span className="text-[11px] sm:text-xs font-bold text-slate-700 dark:text-slate-300 block text-right">
                        المتغيرات المتاحة (انقر على المتغير أو اسحبه لإدراجه في النص):
                      </span>
                      <div className="flex flex-wrap gap-2 mt-1.5 justify-start" dir="rtl">
                        {selectedTriggerForEdit.variables.map((variable: any) => {
                          const isUsed = usedVars[variable.placeholder];
                          return (
                            <button
                              key={variable.placeholder}
                              onClick={() => !isUsed && handleInsertVariable(variable.placeholder)}
                              draggable={!isUsed}
                              onDragStart={(e) => {
                                if (!isUsed) {
                                  e.dataTransfer.setData("text/plain", variable.placeholder);
                                }
                              }}
                              className={`inline-flex items-center gap-1.5 text-[11px] sm:text-xs py-1.5 px-3 rounded-lg border transition-all duration-250 select-none shadow-xs ${
                                 isUsed
                                   ? "opacity-65 cursor-not-allowed pointer-events-none bg-slate-100/80 dark:bg-slate-900/50 text-slate-400 dark:text-slate-500 border-slate-200 dark:border-slate-800"
                                   : "border-transparent bg-sidebar text-sidebar-foreground hover:bg-white hover:text-sidebar hover:border-sidebar-border dark:hover:bg-slate-950 dark:hover:text-teal-350 hover:-translate-y-0.5 cursor-pointer active:scale-95 transition-all"
                               }`}
                              title={isUsed ? "تم إدراج هذا المتغير بالفعل" : `إدراج ${variable.nameAr}`}
                              type="button"
                              disabled={isUsed}
                            >
                              <span className="font-semibold">{variable.placeholder}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()
              ) : (
                <div className="text-[11px] text-muted-foreground bg-slate-50 dark:bg-slate-900/30 p-3 rounded-lg border border-border/40 text-center">
                  لا توجد متغيرات ديناميكية متاحة لهذا الإشعار.
                </div>
              )}
            </div>

            <DialogFooter className="flex sm:justify-start gap-2 border-t border-border/40 pt-4 mt-2">
              <Button
                onClick={handleSaveTemplate}
                className="bg-teal-600 hover:bg-teal-700 dark:bg-teal-700 dark:hover:bg-teal-600 text-white font-bold px-5 py-2 text-xs sm:text-sm rounded-xl transition-all shadow-sm"
                disabled={updateTemplateMutation.isPending}
              >
                {updateTemplateMutation.isPending ? "جاري الحفظ..." : "حفظ"}
              </Button>
              <Button
                variant="outline"
                onClick={() => setIsEditTemplateOpen(false)}
                className="font-semibold px-5 py-2 text-xs sm:text-sm rounded-xl"
                type="button"
              >
                إلغاء
              </Button>
            </DialogFooter>
            <style dangerouslySetInnerHTML={{__html: `
              @keyframes wiggle {
                0% { transform: scale(1.08) rotate(-3deg); }
                50% { transform: scale(1.08) rotate(3deg); }
                100% { transform: scale(1.08) rotate(-3deg); }
              }
              [data-type="variable-chip"] {
                transition: transform 0.25s cubic-bezier(0.175, 0.885, 0.32, 1.275), box-shadow 0.2s, opacity 0.2s;
              }
              [data-type="variable-chip"]:hover {
                transform: translateY(-1.5px) rotate(0.5deg);
                box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.15), 0 2px 4px -2px rgb(0 0 0 / 0.15);
              }
              [data-type="variable-chip"]:active {
                cursor: grabbing !important;
                transform: scale(1.08) rotate(-3deg) !important;
                box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.2), 0 4px 6px -4px rgb(0 0 0 / 0.2) !important;
                opacity: 0.9;
              }
              [data-type="variable-chip"].is-dragging {
                animation: wiggle 0.5s ease-in-out infinite !important;
                opacity: 0.85;
              }
            `}} />
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
