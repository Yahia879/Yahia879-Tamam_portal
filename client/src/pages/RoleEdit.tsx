import { useState, useEffect, useMemo } from "react";
import { useRoute, useLocation } from "wouter";
import { trpc } from "../lib/trpc";
import { Button } from "../components/ui/button";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { 
  Shield, 
  ArrowRight, 
  Loader2, 
  CheckCircle2, 
  LayoutDashboard, 
  Handshake, 
  Palette, 
  FileText,
  AlertCircle,
  MapPin,
  CalendarDays,
  ClipboardList,
  Users,
  Receipt,
  CheckSquare,
  Wallet,
  Banknote,
  FileBarChart,
  LayoutGrid,
  Zap,
  Map,
  Calendar,
  ClipboardCheck,
  Building2,
  FileSignature,
  Settings,
  Briefcase,
  Layers,
  Tag,
  Save,
  Bell,
  FileSpreadsheet,
  LifeBuoy,
  PenLine
} from "lucide-react";
import DashboardLayout from "../components/DashboardLayout";

// ==================== الهيكل التفصيلي للصلاحيات الموحد ====================
// مأخوذ من superAdminGroups في RolePermissions.tsx لتوحيد الواجهات بالكامل
const superAdminGroups = [
  {
    title: "المساجد والطلبات",
    modules: [
      { id: "mosques", nameAr: "المساجد", icon: Building2, perms: ["view", "create", "edit", "delete", "approve"] },
      { id: "mosque_map", nameAr: "خريطة المساجد", icon: Map, perms: ["view"] },
      { id: "requests", nameAr: "الطلبات", icon: Zap, perms: ["view", "create", "view_details", "manage_as_field_team", "manage_as_quick_response", "upload_final_report"] },
      { id: "pending_reports", nameAr: "تقارير الطلبات", icon: FileText, perms: ["view", "intervene"] },
      { id: "appointments", nameAr: "تقويم المواعيد", icon: Calendar, perms: ["view_all", "view_own"] },
    ]
  },
  {
    title: "الهندسة والمشاريع",
    modules: [
      { id: "projects", nameAr: "المشاريع", icon: LayoutGrid, perms: ["view", "view_details", "assign_as_manager"] },
      { id: "progress_reports", nameAr: "تقارير الإنجاز", icon: ClipboardCheck, perms: ["view", "add", "edit", "approve"] },
      { id: "reports", nameAr: "التقارير الفنية", icon: FileBarChart, perms: ["view_stats", "export_data"] },
    ]
  },
  {
    title: "المشتريات والمالية",
    modules: [
      { id: "suppliers", nameAr: "الموردون", icon: Users, perms: ["view", "view_details", "add", "edit", "approve"] },
      { id: "boq", nameAr: "إعداد جداول الكميات", icon: FileSpreadsheet, perms: ["add", "edit", "delete"] },
      { id: "quotations", nameAr: "عروض الأسعار", icon: Receipt, perms: ["view", "add", "approve"] },
      { id: "financial_approval", nameAr: "الاعتماد المالي", icon: CheckSquare, perms: ["view", "approve"] },
      { id: "contracts", nameAr: "العقود", icon: FileSignature, perms: ["view", "create", "approve", "edit_approved", "template_add", "template_edit", "template_delete", "clause_add"] },
      { id: "disbursements", nameAr: "طلبات الصرف", icon: Wallet, perms: ["view", "add", "edit", "delete", "approve", "create_custom"] },
      { id: "disbursement_orders", nameAr: "أوامر الصرف", icon: Banknote, perms: ["view", "approve", "reject", "create_direct"] },
    ]
  },
  {
    title: "التوقيع",
    modules: [
      {
        id: "signing",
        nameAr: "صلاحيات التوقيع",
        icon: PenLine,
        perms: ["disbursements_sign", "disbursement_orders_sign", "final_reports_sign"]
      }
    ]
  },
  {
    title: "الدعم الفني",
    modules: [
      { id: "technical_support", nameAr: "الدعم الفني", icon: LifeBuoy, perms: ["view", "create"] }
    ]
  },
  {
    title: "إدارة المستخدمين",
    modules: [
      { id: "staff_users", nameAr: "إدارة المستخدمين", icon: Users, perms: ["view", "add", "edit", "suspend", "delete"] },
      { id: "staff_roles", nameAr: "الأدوار والصلاحيات", icon: Shield, perms: ["view", "customize", "suspend"] },
      { id: "staff_custom_roles", nameAr: "الأدوار المخصصة", icon: Briefcase, perms: ["view", "add", "edit", "delete"] },
      { id: "requesters", nameAr: "إدارة المستفيدين", icon: Users, perms: ["view", "approve"] },
    ]
  },
  {
    title: "الإعدادات",
    modules: [
      { 
        id: "settings_org", 
        nameAr: "إعدادات الجمعية", 
        icon: Building2, 
        perms: ["view", "edit_basic", "edit_signers", "edit_banks", "edit_contracts"] 
      },
      { id: "settings_branding", nameAr: "الهوية البصرية", icon: Palette, perms: ["edit"] },
      { id: "settings_categories", nameAr: "إدارة التصنيفات", icon: Tag, perms: ["view", "add", "edit", "delete"] },
      { id: "services", nameAr: "البرامج والخدمات", icon: LayoutGrid, perms: ["view", "add", "edit", "delete"] },
      { id: "staff_notifications", nameAr: "تخصيص الإشعارات", icon: Bell, perms: ["edit"] },
    ]
  }
];

const getDescriptiveLabel = (moduleId: string, action: string) => {
  const mapping: Record<string, Record<string, string>> = {
    pending_reports: {
      view: "عرض التقارير",
      intervene: "تدخل لرفع التقرير"
    },
    signing: {
      disbursements_sign: "توقيع طلبات الصرف",
      disbursement_orders_sign: "توقيع أوامر الصرف",
      contracts_sign: "توقيع العقود",
      final_reports_sign: "توقيع التقارير الختامية",
    },
    mosques: {
      view: "عرض المساجد",
      create: "إضافة مسجد",
      add: "إضافة مسجد",
      edit: "تعديل المسجد",
      update: "تعديل المسجد",
      delete: "حذف المسجد",
      approve: "الاعتمادات (رفض أو اعتماد المسجد)"
    },
    requests: {
      view: "عرض كافة الطلبات",
      create: "إضافة طلب",
      view_details: "عرض تفاصيل الطلب وإدارته",
      manage_as_field_team: "ادارة الطلبات كفريق ميداني",
      manage_as_quick_response: "ادارة الطلبات كفريق استجابة سريعة",
      upload_final_report: "رفع التقرير الختامي"
    },

    projects: {
      view: "عرض المشاريع",
      view_details: "عرض تفاصيل المشروع وادارته",
      assign_as_manager: "تعيين كمدير للمشاريع"
    },
    boq: {
      add: "إضافة بند جديد",
      edit: "تعديل بنود",
      delete: "حذف بنود"
    },
    requesters: {
      view: "عرض بيانات طالبي الخدمة",
      approve: "الاعتمادات (رفض أو اعتماد الحساب)",
      edit: "تعديل بيانات الحساب",
      delete: "حذف الحساب",
      suspend: "تعليق حساب مستخدم"
    },
    suppliers: {
      view: "عرض قائمة الموردين",
      view_details: "عرض تفاصيل المورد",
      add: "إضافة مورد",
      approve: "الاعتمادات (اعتماد أو رفض مورد)",
      edit: "تعديل بيانات الموردين",
      delete: "حذف مورد"
    },
    quotations: {
      view: "عرض قائمة عروض الأسعار",
      add: "إضافة عرض سعر",
      approve: "الاعتمادات (اعتماد أو رفض طلب صرف)"
    },
    financial_approval: {
      view: "مقارنة عروض الاسعار من دون اعتماد",
      approve: "الاعتماد المالي لعرض السعر"
    },
    contracts: {
      view: "عرض العقود وقالب العقود",
      create: "إنشاء عقود",
      approve: "اعتماد العقود",
      edit_approved: "تعديل العقود المعتمدة",
      template_add: "إضافة قالب للعقود",
      template_edit: "تعديل قالب العقد",
      template_delete: "حذف قالب العقد",
      clause_add: "إضافة بند للعقد"
    },
    disbursements: {
      view: "عرض طلبات الصرف",
      add: "إنشاء طلب صرف",
      edit: "تعديل طلب الصرف",
      delete: "حذف طلب صرف",
      approve: "اعتماد طلبات الصرف",
      create_custom: "انشاء طلبات صرف مخصصة",
    },
    disbursement_orders: {
      view: "عرض أوامر الصرف",
      approve: "اعتماد أوامر الصرف",
      reject: "رفض أوامر الصرف",
      view_details: "عرض تفاصيل أوامر الصرف",
      create_direct: "انشاء امر صرف مخصص"
    },
    progress_reports: {
      view: "عرض تقارير الإنجاز",
      add: "إضافة تقرير إنجاز",
      edit: "تعديل التقرير",
      approve: "اعتماد التقارير"
    },
    financial_reports: {
      view: "عرض تقرير المالية والإحصائيات",
      export: "تصدير البيانات"
    },
    reports: {
      view_stats: "عرض احصائيات الطلبات",
      export_data: "تصدير البيانات"
    },
    staff_users: {
      view: "عرض قائمة المستخدمين",
      add: "إضافة موظف جديد",
      edit: "تعديل البيانات",
      suspend: "إيقاف الحساب",
      delete: "حذف"
    },
    staff_roles: {
      view: "عرض الأدوار والصلاحيات",
      customize: "تخصيص الدور",
      suspend: "إيقاف الدور"
    },
    staff_custom_roles: {
      view: "عرض الأدوار المخصصة",
      add: "إضافة دور",
      edit: "تعديل الدور",
      delete: "حذف الدور"
    },
    staff_notifications: {
      edit: "تعديل تخصيص الإشعارات"
    },
    roles: {
      view: "عرض قائمة الأدوار",
      create: "إنشاء دور جديد",
      edit: "تعديل صلاحيات الدور",
      delete: "حذف دور"
    },
    logs: {
      view: "عرض سجل العمليات",
      export: "تصدير سجل العمليات"
    },
    settings_org: {
      view: "عرض إعدادات الجمعية",
      edit_basic: "تعديل معلومات أساسية",
      edit_signers: "تعديل مفوضي التوقيع",
      edit_banks: "تعديل البيانات البنكية",
      edit_contracts: "تعديل إعدادات العقود"
    },
    settings_branding: {
      edit: "تعديل الهوية البصرية للمنصة"
    },
    settings_contracts: {
      view: "عرض قوالب العقود",
      edit: "تعديل قوالب العقود"
    },
    settings_categories: {
      view: "عرض التصنيفات",
      add: "إضافة تصنيف جديد",
      edit: "تعديل التصنيفات",
      delete: "حذف التصنيفات"
    },
    services: {
      view: "عرض البرامج",
      add: "اضافة برامج",
      edit: "تعديل برامج",
      delete: "حذف برامج"
    },
    mosque_map: {
      view: "عرض الخريطة التفاعلية"
    },
    appointments: {
      view: "عرض تقويم المواعيد",
      view_all: "عرض كافة مواعيد المنشأة",
      view_own: "عرض المواعيد الخاصة بي",
      add: "إضافة موعد جديد",
      edit: "تعديل موعد",
      delete: "حذف موعد"
    },
    technical_support: {
      view: "عرض التذاكر",
      create: "إرسال التذاكر"
    }
  };

  return mapping[moduleId]?.[action] || action;
};

export default function RoleEdit() {
  const [match, params] = useRoute("/roles/:id/:action?");
  const [, setLocation] = useLocation();
  const roleId = params?.id;
  const isNew = roleId === "new";

  const [nameAr, setNameAr] = useState("");
  const [selectedPerms, setSelectedPerms] = useState<string[]>([]);

  // جلب بيانات الدور (الاسم والصلاحيات)
  const { data: roleData, isLoading: roleLoading } = trpc.permissions.getRole.useQuery(
    { roleId: roleId! },
    { enabled: !isNew && !!roleId }
  );

  const { data: rolePermissions, isLoading: permsLoading } = trpc.permissions.getRolePermissions.useQuery(
    { roleId: roleId! },
    { enabled: !isNew && !!roleId }
  );

  const utils = trpc.useUtils();

  useEffect(() => {
    if (roleData) {
      setNameAr(roleData.nameAr);
    }
  }, [roleData]);

  useEffect(() => {
    if (rolePermissions) {
      setSelectedPerms(rolePermissions);
    }
  }, [rolePermissions]);

  const createRoleMutation = trpc.permissions.createRole.useMutation({
    onSuccess: () => {
      toast.success("تم إنشاء الدور بنجاح");
      utils.permissions.getRoles.invalidate();
      utils.permissions.getUserPermissions.invalidate();
      utils.permissions.getUserRolePermissions.invalidate();
      utils.auth.me.invalidate();
      setLocation("/staff?tab=custom-roles");
    },
    onError: (error) => {
      toast.error(error.message || "فشل إنشاء الدور");
    },
  });

  const updateRoleMutation = trpc.permissions.updateRole.useMutation({
    onSuccess: () => {
      toast.success("تم تحديث الدور بنجاح");
      utils.permissions.getRoles.invalidate();
      utils.permissions.getUserPermissions.invalidate();
      utils.permissions.getUserRolePermissions.invalidate();
      utils.auth.me.invalidate();
      setLocation("/staff?tab=custom-roles");
    },
    onError: (error) => {
      toast.error(error.message || "فشل تحديث الدور");
    },
  });

  const handleSaveChanges = () => {
    if (!nameAr.trim()) {
      toast.error("يرجى إدخال اسم الدور المخصص");
      return;
    }

    let finalPerms = selectedPerms;

    if (finalPerms.length === 0) {
      toast.error("يرجى تحديد صلاحية واحدة على الأقل");
      return;
    }

    if (isNew) {
      const id = `custom_role_${Date.now()}`;
      createRoleMutation.mutate({
        id,
        nameAr: nameAr.trim(),
        nameEn: nameAr.trim(),
        description: JSON.stringify(finalPerms),
        permissions: finalPerms,
      });
    } else if (roleId) {
      updateRoleMutation.mutate({
        roleId,
        nameAr: nameAr.trim(),
        permissions: finalPerms,
      });
    }
  };

  const handleTogglePermission = (permId: string) => {

    // منع تفعيل أي صلاحية فرعية للمساجد إذا كانت صلاحية العرض معطلة
    if (permId.startsWith("mosques.") && permId !== "mosques.view") {
      if (!selectedPerms.includes("mosques.view")) {
        toast.warning("يجب تفعيل صلاحية 'عرض المساجد' أولاً");
        return;
      }
    }

    // منع تفعيل أي صلاحية فرعية للموردين إذا كانت صلاحية العرض معطلة
    if (permId.startsWith("suppliers.") && permId !== "suppliers.view") {
      if (!selectedPerms.includes("suppliers.view")) {
        toast.warning("يجب تفعيل صلاحية 'عرض قائمة الموردين' أولاً");
        return;
      }
    }

    // منع تفعيل أي صلاحية فرعية لعروض الأسعار إذا كانت صلاحية العرض معطلة
    if (permId.startsWith("quotations.") && permId !== "quotations.view") {
      if (!selectedPerms.includes("quotations.view")) {
        toast.warning("يجب تفعيل صلاحية 'عرض قائمة عروض الأسعار' أولاً");
        return;
      }
    }

    // منع تفعيل أي صلاحية فرعية للمستخدمين إذا كانت صلاحية العرض معطلة
    if (permId.startsWith("staff_users.") && permId !== "staff_users.view") {
      if (!selectedPerms.includes("staff_users.view")) {
        toast.warning("يجب تفعيل صلاحية 'عرض قائمة المستخدمين' أولاً");
        return;
      }
    }

    // منع تفعيل أي صلاحية فرعية للأدوار والصلاحيات إذا كانت صلاحية العرض معطلة
    if (permId.startsWith("staff_roles.") && permId !== "staff_roles.view") {
      if (!selectedPerms.includes("staff_roles.view")) {
        toast.warning("يجب تفعيل صلاحية 'عرض الأدوار والصلاحيات' أولاً");
        return;
      }
    }

    // منع تفعيل أي صلاحية فرعية للأدوار المخصصة إذا كانت صلاحية العرض معطلة
    if (permId.startsWith("staff_custom_roles.") && permId !== "staff_custom_roles.view") {
      if (!selectedPerms.includes("staff_custom_roles.view")) {
        toast.warning("يجب تفعيل صلاحية 'عرض الأدوار المخصصة' أولاً");
        return;
      }
    }

    // منع تفعيل أي صلاحية فرعية للخدمات والبرامج إذا كانت صلاحية العرض معطلة
    if (permId.startsWith("services.") && permId !== "services.view") {
      if (!selectedPerms.includes("services.view")) {
        toast.warning("يجب تفعيل صلاحية 'عرض البرامج' أولاً");
        return;
      }
    }

    // منع تفعيل أي صلاحية فرعية للطلبات إذا كانت صلاحية العرض معطلة
    if (permId.startsWith("requests.") && permId !== "requests.view" && permId !== "requests.sign_final_report") {
      if (!selectedPerms.includes("requests.view")) {
        toast.warning("يجب تفعيل صلاحية 'عرض كافة الطلبات' أولاً");
        return;
      }
    }

    // منع تفعيل أي صلاحية فرعية للمشاريع إذا كانت صلاحية العرض معطلة
    if (permId.startsWith("projects.") && permId !== "projects.view") {
      if (!selectedPerms.includes("projects.view")) {
        toast.warning("يجب تفعيل صلاحية 'عرض المشاريع' أولاً");
        return;
      }
    }

    // منع تفعيل أي صلاحية فرعية للتقارير المالية إذا كانت صلاحية العرض معطلة
    if (permId.startsWith("financial_reports.") && permId !== "financial_reports.view") {
      if (!selectedPerms.includes("financial_reports.view")) {
        toast.warning("يجب تفعيل صلاحية 'عرض تقرير المالية والإحصائيات' أولاً");
        return;
      }
    }

    // منع تفعيل أي صلاحية فرعية للعقود إذا كانت صلاحية العرض معطلة
    if (permId.startsWith("contracts.") && permId !== "contracts.view") {
      if (!selectedPerms.includes("contracts.view")) {
        toast.warning("يجب تفعيل صلاحية 'عرض العقود وقالب العقود' أولاً");
        return;
      }
    }

    // منع تفعيل أي صلاحية فرعية للتقارير إذا كانت صلاحية العرض معطلة
    if (permId.startsWith("reports.") && permId !== "reports.view_stats") {
      if (!selectedPerms.includes("reports.view_stats")) {
        toast.warning("يجب تفعيل صلاحية 'عرض احصائيات الطلبات' أولاً");
        return;
      }
    }

    // منع تفعيل أي صلاحية فرعية لطالبي الخدمة إذا كانت صلاحية العرض معطلة
    if (permId.startsWith("requesters.") && permId !== "requesters.view") {
      if (!selectedPerms.includes("requesters.view")) {
        toast.warning("يجب تفعيل صلاحية 'عرض بيانات طالبي الخدمة' أولاً");
        return;
      }
    }

    // منع تفعيل صلاحية الاعتماد المالي لعرض السعر إذا كانت مقارنة العروض معطلة
    if (permId === "financial_approval.approve") {
      if (!selectedPerms.includes("financial_approval.view")) {
        toast.warning("يجب تفعيل صلاحية 'مقارنة عروض الاسعار من دون اعتماد' أولاً");
        return;
      }
    }

    // منع تفعيل صلاحية إضافة طلبات الصرف المخصصة إلا إذا كانت صلاحية العرض مفعلة
    if (permId === "disbursements.create_custom") {
      if (!selectedPerms.includes("disbursements.view")) {
        toast.warning("يجب تفعيل صلاحية 'عرض طلبات الصرف' أولاً");
        return;
      }
    }


    // منع تفعيل أي صلاحية في قسم طلبات الصرف إلا إذا كانت صلاحية العرض مفعلة
    if (permId.startsWith("disbursements.") && permId !== "disbursements.view" && permId !== "disbursements.sign") {
      if (!selectedPerms.includes("disbursements.view")) {
        toast.warning("يجب تفعيل صلاحية 'عرض طلبات الصرف' أولاً");
        return;
      }
    }



    setSelectedPerms(prev => {
      const isAlreadySelected = prev.includes(permId);
      
      if (isAlreadySelected) {
        let next = prev.filter(id => id !== permId);
        if (permId === "mosques.view") {
          next = next.filter(id => !id.startsWith("mosques."));
        }
        if (permId === "suppliers.view") {
          next = next.filter(id => !id.startsWith("suppliers."));
        }
        if (permId === "quotations.view") {
          next = next.filter(id => !id.startsWith("quotations."));
        }
        if (permId === "staff_users.view") {
          next = next.filter(id => !id.startsWith("staff_users."));
        }
        if (permId === "staff_roles.view") {
          next = next.filter(id => !id.startsWith("staff_roles."));
        }
        if (permId === "staff_custom_roles.view") {
          next = next.filter(id => !id.startsWith("staff_custom_roles."));
        }
        if (permId === "services.view") {
          next = next.filter(id => !id.startsWith("services."));
        }
        if (permId === "requests.view") {
          // cascade لكل صلاحيات الطلبات ما عدا توقيع التقرير الختامي (انتقلت لقسم التوقيع)
          next = next.filter(id => !id.startsWith("requests.") || id === "requests.sign_final_report");
        }
        if (permId === "projects.view") {
          next = next.filter(id => !id.startsWith("projects."));
        }
        if (permId === "requesters.view") {
          next = next.filter(id => !id.startsWith("requesters."));
        }
        // عند إلغاء تفعيل صلاحية 'عرض تقرير المالية والإحصائيات'، نقوم تلقائياً بإلغاء تفعيل تصدير البيانات المالية
        if (permId === "financial_reports.view") {
          next = next.filter(id => !id.startsWith("financial_reports."));
        }
        if (permId === "reports.view_stats") {
          next = next.filter(id => !id.startsWith("reports."));
        }
        if (permId === "financial_approval.view") {
          next = next.filter(id => id !== "financial_approval.approve");
        }
        // عند إلغاء تفعيل صلاحية 'عرض طلبات الصرف'، نقوم تلقائياً بإلغاء تفعيل كافة صلاحيات طلبات الصرف الأخرى
        if (permId === "disbursements.view") {
          next = next.filter(id => !id.startsWith("disbursements."));
        }

        // عند إلغاء تفعيل صلاحية 'عرض أوامر الصرف'، نقوم تلقائياً بإلغاء تفعيل كافة صلاحيات أوامر الصرف الأخرى
        if (permId === "disbursement_orders.view") {
          next = next.filter(id => !id.startsWith("disbursement_orders."));
        }


        return next;
      } else {
        let next = [...prev, permId];
        if (permId === "appointments.view_all") {
          next = next.filter(id => id !== "appointments.view_own");
        } else if (permId === "appointments.view_own") {
          next = next.filter(id => id !== "appointments.view_all");

        }
        return next;
      }
    });
  };

  const handleToggleModuleAll = (modulePerms: any[]) => {
    const permIds = modulePerms.map(p => p.id);
    const allSelected = permIds.every(id => selectedPerms.includes(id));
    if (allSelected) {
      setSelectedPerms(prev => prev.filter(id => !permIds.includes(id)));
    } else {
      setSelectedPerms(prev => {
        let added = permIds.filter(id => !prev.includes(id));
        if (added.includes("appointments.view_all") && added.includes("appointments.view_own")) {
          added = added.filter(id => id !== "appointments.view_own");
        }
        let next = [...prev, ...added];
        if (added.includes("appointments.view_all")) {
          next = next.filter(id => id !== "appointments.view_own");
        } else if (added.includes("appointments.view_own")) {
          next = next.filter(id => id !== "appointments.view_all");
        }
        return next;
      });
    }
  };

  const isPermissionGranted = (permId: string) => {
    return selectedPerms.includes(permId);
  };

  const universalDisplayGroups = useMemo(() => {
    return superAdminGroups.map(group => ({
      title: group.title,
      modules: group.modules.map(m => ({
        id: m.id,
        nameAr: m.nameAr,
        icon: m.icon,
        permissions: m.perms.map(p => {
          let id = `${m.id}.${p}`;
          if (m.id === "technical_support") {
            id = p === "view" ? "View_Tickets" : "Create_Ticket";
          }
          // Signing module: use explicit full permission IDs
          if (m.id === "signing") {
            const signingIds: Record<string, string> = {
              disbursements_sign: "disbursements.sign",
              disbursement_orders_sign: "disbursement_orders.sign",
              contracts_sign: "contracts.sign",
              final_reports_sign: "final_reports.sign",
            };
            id = signingIds[p] || id;
          }
          return {
            id,
            nameAr: getDescriptiveLabel(m.id, p),
          };
        })
      }))
    }));
  }, []);

  const isLoading = (!isNew && roleLoading) || (!isNew && permsLoading);

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="container py-24 flex flex-col items-center justify-center">
          <Loader2 className="w-10 h-10 animate-spin text-primary mb-4" />
          <p className="text-muted-foreground animate-pulse">جاري تحميل بيانات الدور والصلاحيات...</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="container py-8 max-w-7xl mx-auto" dir="rtl">
        {/* Header */}
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between mb-8 sm:mb-10">
          <div className="flex items-center gap-3 sm:gap-4 text-right min-w-0">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => setLocation("/staff")} 
              className="rounded-full hover:bg-slate-100 transition-colors shrink-0 h-9 w-9 sm:h-10 sm:w-10"
            >
              <ArrowRight className="h-5.5 w-5.5 sm:h-6 sm:w-6" />
            </Button>
            <div className="p-2 sm:p-3 bg-primary/10 rounded-xl sm:rounded-2xl shrink-0">
              <Shield className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />
            </div>
            <div className="min-w-0">
              <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight truncate">
                {isNew ? "إنشاء دور مخصص جديد" : "تعديل الدور المخصص"}
              </h1>
              <p className="text-muted-foreground font-medium text-sm sm:text-base md:text-lg truncate">
                {isNew ? "قم بتعيين الصلاحيات التفصيلية للدور الجديد" : nameAr}
              </p>
            </div>
          </div>
        </div>

        {/* Basic Info Card */}
        <Card className="border-slate-200/60 dark:border-slate-800 shadow-md mb-8 rounded-2xl">
          <CardHeader className="bg-slate-50/80 dark:bg-slate-900/80 border-b border-slate-100 dark:border-slate-800 px-6 py-5">
            <CardTitle className="text-xl font-bold">المعلومات الأساسية</CardTitle>
          </CardHeader>
          <CardContent className="p-6 text-right">
            <div>
              <Label htmlFor="nameAr" className="pb-2 block font-semibold text-slate-700 dark:text-slate-300">اسم الدور المخصص *</Label>
              <Input
                id="nameAr"
                value={nameAr}
                onChange={(e) => setNameAr(e.target.value)}
                required
                placeholder="مثال: منسق المشاريع والمتابعة"
                className="text-lg py-5 px-4 rounded-xl border-slate-200 focus-visible:ring-primary"
              />
            </div>
          </CardContent>
        </Card>

        {/* Info Tip */}
        <div className="border rounded-2xl p-5 mb-10 flex items-start gap-4 shadow-sm bg-primary/5 border-primary/10">
          <div className="p-2 rounded-lg bg-primary/10 shrink-0">
            <CheckCircle2 className="h-5 w-5 text-primary" />
          </div>
          <div className="text-right">
            <p className="font-semibold mb-1">
              تخصيص الصلاحيات التفصيلية
            </p>
            <p className="text-sm leading-relaxed text-muted-foreground">
              تتيح لك هذه الصفحة إسناد صلاحيات تفصيلية ودقيقة لهذا الدور المخصص. اختر الصلاحيات المطلوبة من الأقسام التالية ثم انقر على حفظ التغييرات.
            </p>
          </div>
        </div>

        {/* Grouped Rendering */}
        <div className="space-y-12">
          {universalDisplayGroups.map((group, groupIdx) => (
            <div key={groupIdx} className="space-y-6">
              {group.title && (
                <div className="flex items-center gap-3 px-2 text-right">
                  <div className="w-1.5 h-8 rounded-full bg-primary shrink-0" />
                  <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">{group.title}</h2>
                </div>
              )}
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {group.modules.map((module) => {
                  const Icon = (module as any).icon || Shield;
                  const modulePerms = module.permissions || [];
                  const activePerms = modulePerms.filter((p: any) => selectedPerms.includes(p.id));
                  const grantedCount = activePerms.length; 

                  return (
                    <Card key={module.id} className="overflow-hidden border-slate-200/60 dark:border-slate-800 shadow-lg shadow-slate-200/20 dark:shadow-none rounded-2xl transition-all hover:shadow-xl hover:shadow-slate-200/40">
                      <CardHeader className="bg-slate-50/80 dark:bg-slate-900/80 border-b border-slate-100 dark:border-slate-800 px-4 py-4 sm:px-6 sm:py-5">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3" dir="rtl">
                          <div className="flex items-center gap-3 sm:gap-4 text-right">
                            <div className="p-2 bg-white dark:bg-slate-800 rounded-xl shadow-sm shrink-0">
                              <Icon className="h-5 w-5 text-primary" />
                            </div>
                            <CardTitle className="text-lg sm:text-xl font-bold truncate">{module.nameAr}</CardTitle>
                          </div>
                          <div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto mt-1 sm:mt-0">
                            {modulePerms.length > 0 && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleToggleModuleAll(modulePerms);
                                }}
                                className="text-[11px] sm:text-xs text-muted-foreground hover:text-primary hover:bg-primary/5 rounded-lg font-bold py-1 h-auto"
                              >
                                {modulePerms.every((p: any) => selectedPerms.includes(p.id)) ? "إلغاء تحديد الكل" : "تحديد الكل"}
                              </Button>
                            )}
                            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-primary/10 text-primary rounded-xl font-bold text-xs sm:text-sm">
                              <span>{grantedCount}</span>
                              <span className="opacity-50">/</span>
                              <span>{modulePerms.length}</span>
                            </div>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="p-6">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3" dir="rtl">
                          {modulePerms.map((perm: any) => {
                            const isChecked = isPermissionGranted(perm.id);
                            const isDisabled = 
                              (perm.id.startsWith("contracts.") && perm.id !== "contracts.view" && !selectedPerms.includes("contracts.view")) ||
                              (perm.id.startsWith("mosques.") && perm.id !== "mosques.view" && !selectedPerms.includes("mosques.view")) ||
                              (perm.id.startsWith("suppliers.") && perm.id !== "suppliers.view" && !selectedPerms.includes("suppliers.view")) ||
                              (perm.id.startsWith("quotations.") && perm.id !== "quotations.view" && !selectedPerms.includes("quotations.view")) ||
                              (perm.id.startsWith("staff_users.") && perm.id !== "staff_users.view" && !selectedPerms.includes("staff_users.view")) ||
                              (perm.id.startsWith("staff_roles.") && perm.id !== "staff_roles.view" && !selectedPerms.includes("staff_roles.view")) ||
                              (perm.id.startsWith("staff_custom_roles.") && perm.id !== "staff_custom_roles.view" && !selectedPerms.includes("staff_custom_roles.view")) ||
                              (perm.id.startsWith("services.") && perm.id !== "services.view" && !selectedPerms.includes("services.view")) ||
                              (perm.id.startsWith("requests.") && perm.id !== "requests.view" && perm.id !== "requests.sign_final_report" && !selectedPerms.includes("requests.view")) ||
                              (perm.id.startsWith("projects.") && perm.id !== "projects.view" && !selectedPerms.includes("projects.view")) ||
                              (perm.id.startsWith("requesters.") && perm.id !== "requesters.view" && !selectedPerms.includes("requesters.view")) ||
                              (perm.id.startsWith("reports.") && perm.id !== "reports.view_stats" && !selectedPerms.includes("reports.view_stats")) ||
                              (perm.id === "financial_approval.approve" && !selectedPerms.includes("financial_approval.view"));
                            return (
                              <div 
                                key={perm.id} 
                                onClick={() => !isDisabled && handleTogglePermission(perm.id)}
                                className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl border transition-all select-none text-right ${
                                  isDisabled
                                    ? "border-slate-100 dark:border-slate-900 bg-slate-50/50 dark:bg-slate-900/10 text-slate-300 dark:text-slate-600 cursor-not-allowed pointer-events-none opacity-50"
                                    : isChecked 
                                      ? "border-green-200 bg-green-50/40 dark:bg-green-900/10 dark:border-green-900/20 text-green-950 dark:text-green-400 hover:bg-green-50/60 cursor-pointer" 
                                      : "border-slate-200 dark:border-slate-800 bg-background hover:bg-slate-50 dark:hover:bg-slate-900/50 text-slate-600 dark:text-slate-400 cursor-pointer"
                                }`}
                              >
                                <div className={`w-4.5 h-4.5 rounded flex items-center justify-center border shrink-0 transition-all ${
                                  isDisabled
                                    ? "border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900"
                                    : isChecked
                                      ? "bg-green-600 border-green-600 text-white"
                                      : "border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                                }`}>
                                  {isChecked && (
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" className="w-3 h-3">
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                                    </svg>
                                  )}
                                </div>
                                <span className="text-xs sm:text-sm font-semibold select-none leading-snug">{perm.nameAr}</span>
                              </div>
                            );
                          })}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Footer Actions */}
        <div className="flex justify-end gap-3 mt-12 mb-8">
          <Button
            type="button"
            variant="outline"
            onClick={() => setLocation("/staff?tab=custom-roles")}
            className="px-6 rounded-xl h-11 font-semibold"
          >
            إلغاء
          </Button>
          <Button 
            onClick={handleSaveChanges} 
            disabled={createRoleMutation.isPending || updateRoleMutation.isPending}
            className="px-8 font-bold rounded-xl shadow-md h-11 transition-all gradient-primary text-white scale-105 hover:scale-108"
          >
            {createRoleMutation.isPending || updateRoleMutation.isPending ? (
              <>
                <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                جاري الحفظ...
              </>
            ) : (
              isNew ? "إنشاء الدور" : "حفظ التغييرات"
            )}
          </Button>
        </div>
      </div>
    </DashboardLayout>
  );
}
