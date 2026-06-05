import { useState, useEffect, useMemo } from "react";
import { useRoute, useLocation } from "wouter";
import { trpc } from "../lib/trpc";
import { Button } from "../components/ui/button";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
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
  User,
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
  RotateCcw,
  X,
  Plus
} from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import DashboardLayout from "../components/DashboardLayout";

const getRoleLabelAr = (role: string) => {
  const rolesAr: Record<string, string> = {
    "super_admin": "مدير عام النظام",
    "system_admin": "مدير نظام",
    "project_manager": "مدير مشاريع",
    "financial_manager": "المدير المالي",
    "financial": "موظف مالي",
    "projects_office": "مكتب المشاريع",
    "field_team": "فريق ميداني",
    "quick_response": "استجابة سريعة",
    "corporate_comm": "الاتصال المؤسسي",
    "service_requester": "طالب خدمة",
  };
  return rolesAr[role] || role;
};

export default function UserPermissions() {
  const [, params] = useRoute("/users/:id/permissions");
  const [, setLocation] = useLocation();
  const userId = params?.id ? parseInt(params.id) : null;

  const utils = trpc.useUtils();
  const [overrides, setOverrides] = useState<Record<string, boolean>>({});

  // جلب بيانات المستخدم الأساسية
  const { data: userData, isLoading: userDataLoading } = trpc.users.getById.useQuery(
    { id: userId! },
    { enabled: !!userId }
  );

  // جلب أدوار المستخدم (لمعرفة الدور المخصص النشط)
  const { data: userRoles, isLoading: userRolesLoading } = trpc.permissions.getUserRoles.useQuery(
    { userId: userId! },
    { enabled: !!userId }
  );

  // تحديد الدور الفعال للمستخدم (مخصص أو أساسي)
  const activeRoleId = userRoles && userRoles.length > 0
    ? userRoles[0].roleId
    : userData?.role;
  
  const roleNameAr = userRoles && userRoles.length > 0
    ? userRoles[0].roleName
    : (userData?.role ? getRoleLabelAr(userData.role) : "");

  // جلب الصلاحيات الافتراضية المورثة من جميع أدوار المستخدم
  const { data: rolePermissions, isLoading: rolePermissionsLoading } = trpc.permissions.getUserRolePermissions.useQuery(
    { userId: userId! },
    { enabled: !!userId }
  );

  // جلب الصلاحيات النهائية (المدمجة) الممنوحة فعلياً للمستخدم
  const { data: finalPermissions, isLoading: finalPermissionsLoading, refetch: refetchFinal } = trpc.permissions.getUserPermissions.useQuery(
    { userId: userId! },
    { enabled: !!userId }
  );

  // جلب الصلاحيات الفردية (الاستثناءات المباشرة)
  const { data: directPermissions, isLoading: directPermissionsLoading, refetch: refetchDirect } = trpc.permissions.getUserDirectPermissions.useQuery(
    { userId: userId! },
    { enabled: !!userId }
  );

  // جلب الهيكل الهرمي للوحدات والصلاحيات المتوفرة في النظام
  const { data: structure, isLoading: structureLoading } = trpc.permissions.getStructure.useQuery();

  const isLoading = userDataLoading || 
                    userRolesLoading || 
                    rolePermissionsLoading || 
                    finalPermissionsLoading || 
                    directPermissionsLoading || 
                    structureLoading;

  useEffect(() => {
    if (directPermissions) {
      const initialOverrides: Record<string, boolean> = {};
      directPermissions.forEach(p => {
        initialOverrides[p.permissionId] = p.granted;
      });
      setOverrides(initialOverrides);
    }
  }, [directPermissions]);

  // التحقق من حالة الصلاحية المحددة (مدمجة)
  const isChecked = (permissionId: string) => {
    if (permissionId in overrides) {
      return overrides[permissionId];
    }
    return rolePermissions?.includes(permissionId) || false;
  };

  // الحصول على نوع حالة الاستثناء لبطاقة التلوين
  const getOverrideState = (permissionId: string) => {
    if (permissionId in overrides) {
      return overrides[permissionId] ? "granted" : "revoked";
    }
    return "inherited";
  };

  const hasChanges = useMemo(() => {
    if (!directPermissions) return false;
    // مقارنة التعديلات الحالية بالصلاحيات المباشرة المسجلة في الـ DB
    const currentOverridesEntries = Object.entries(overrides);
    if (currentOverridesEntries.length !== directPermissions.length) return true;
    
    return !directPermissions.every(p => overrides[p.permissionId] === p.granted);
  }, [overrides, directPermissions]);

  // معالجة النقر وتغيير الخيارات
  const handleTogglePermission = (permId: string) => {
    
    // منع تفعيل أي صلاحية فرعية للمساجد إذا كانت صلاحية العرض معطلة
    if (permId.startsWith("mosques.") && permId !== "mosques.view") {
      if (!isChecked("mosques.view")) {
        toast.warning("يجب تفعيل صلاحية 'عرض المساجد' أولاً");
        return;
      }
    }

    // منع تفعيل أي صلاحية فرعية للموردين إذا كانت صلاحية العرض معطلة
    if (permId.startsWith("suppliers.") && permId !== "suppliers.view") {
      if (!isChecked("suppliers.view")) {
        toast.warning("يجب تفعيل صلاحية 'عرض قائمة الموردين' أولاً");
        return;
      }
    }

    // منع تفعيل أي صلاحية فرعية لعروض الأسعار إذا كانت صلاحية العرض معطلة
    if (permId.startsWith("quotations.") && permId !== "quotations.view") {
      if (!isChecked("quotations.view")) {
        toast.warning("يجب تفعيل صلاحية 'عرض قائمة عروض الأسعار' أولاً");
        return;
      }
    }

    // منع تفعيل أي صلاحية فرعية للمستخدمين إذا كانت صلاحية العرض معطلة
    if (permId.startsWith("staff_users.") && permId !== "staff_users.view") {
      if (!isChecked("staff_users.view")) {
        toast.warning("يجب تفعيل صلاحية 'عرض قائمة المستخدمين' أولاً");
        return;
      }
    }

    // منع تفعيل أي صلاحية فرعية للأدوار والصلاحيات إذا كانت صلاحية العرض معطلة
    if (permId.startsWith("staff_roles.") && permId !== "staff_roles.view") {
      if (!isChecked("staff_roles.view")) {
        toast.warning("يجب تفعيل صلاحية 'عرض الأدوار والصلاحيات' أولاً");
        return;
      }
    }

    // منع تفعيل أي صلاحية فرعية للأدوار المخصصة إذا كانت صلاحية العرض معطلة
    if (permId.startsWith("staff_custom_roles.") && permId !== "staff_custom_roles.view") {
      if (!isChecked("staff_custom_roles.view")) {
        toast.warning("يجب تفعيل صلاحية 'عرض الأدوار المخصصة' أولاً");
        return;
      }
    }

    // منع تفعيل أي صلاحية فرعية للخدمات والبرامج إذا كانت صلاحية العرض معطلة
    if (permId.startsWith("services.") && permId !== "services.view") {
      if (!isChecked("services.view")) {
        toast.warning("يجب تفعيل صلاحية 'عرض البرامج' أولاً");
        return;
      }
    }

    // منع تفعيل أي صلاحية فرعية للطلبات إذا كانت صلاحية العرض معطلة
    if (permId.startsWith("requests.") && permId !== "requests.view") {
      if (!isChecked("requests.view")) {
        toast.warning("يجب تفعيل صلاحية 'عرض كافة الطلبات' أولاً");
        return;
      }
    }

     // منع تفعيل أي صلاحية فرعية للمشاريع إذا كانت صلاحية العرض معطلة
    if (permId.startsWith("projects.") && permId !== "projects.view") {
      if (!isChecked("projects.view")) {
        toast.warning("يجب تفعيل صلاحية 'عرض المشاريع' أولاً");
        return;
      }
    }

    // منع تفعيل أي صلاحية فرعية للتقارير المالية إذا كانت صلاحية العرض معطلة
    if (permId.startsWith("financial_reports.") && permId !== "financial_reports.view") {
      if (!isChecked("financial_reports.view")) {
        toast.warning("يجب تفعيل صلاحية 'عرض تقرير المالية والإحصائيات' أولاً");
        return;
      }
    }

    // منع تفعيل صلاحية الاعتماد المالي لعرض السعر إذا كانت مقارنة العروض معطلة
    if (permId === "financial_approval.approve") {
      if (!isChecked("financial_approval.view")) {
        toast.warning("يجب تفعيل صلاحية 'مقارنة عروض الاسعار من دون اعتماد' أولاً");
        return;
      }
    }

    const defaultState = rolePermissions?.includes(permId) || false;
    const currentState = isChecked(permId);
    const newState = !currentState;

    setOverrides(prev => {
      let updated = { ...prev };
      
      if (newState === defaultState) {
        delete updated[permId];
      } else {
        updated[permId] = newState;
      }

      // منع اختيار الصلاحيتين معاً لمواعيد تقويم المنشأة والمواعيد الخاصة
      if (newState) {
        if (permId === "appointments.view_all") {
          const defaultOwn = rolePermissions?.includes("appointments.view_own") || false;
          if (defaultOwn) {
            updated["appointments.view_own"] = false;
          } else {
            delete updated["appointments.view_own"];
          }
        } else if (permId === "appointments.view_own") {
          const defaultAll = rolePermissions?.includes("appointments.view_all") || false;
          if (defaultAll) {
            updated["appointments.view_all"] = false;
          } else {
            delete updated["appointments.view_all"];
          }
        } else if (permId === "requests.view_details") {
          const defaultField = rolePermissions?.includes("requests.manage_as_field_team") || false;
          if (defaultField) {
            updated["requests.manage_as_field_team"] = false;
          } else {
            delete updated["requests.manage_as_field_team"];
          }
        } else if (permId === "requests.manage_as_field_team") {
          const defaultDetails = rolePermissions?.includes("requests.view_details") || false;
          if (defaultDetails) {
            updated["requests.view_details"] = false;
          } else {
            delete updated["requests.view_details"];
          }
        }
      }

      // شلال الإلغاءات (Cascading Revokes)
      if (!newState) {
        const cascadeRevoke = (prefix: string) => {
          const allModulePerms = structure?.flatMap(g => g.permissions).filter(p => p.id.startsWith(prefix)) || [];
          allModulePerms.forEach(p => {
            if (p.id !== permId) {
              const defVal = rolePermissions?.includes(p.id) || false;
              if (defVal) {
                updated[p.id] = false;
              } else {
                delete updated[p.id];
              }
            }
          });
        };

        if (permId === "mosques.view") cascadeRevoke("mosques.");
        if (permId === "suppliers.view") cascadeRevoke("suppliers.");
        if (permId === "quotations.view") cascadeRevoke("quotations.");
        if (permId === "staff_users.view") cascadeRevoke("staff_users.");
        if (permId === "staff_roles.view") cascadeRevoke("staff_roles.");
        if (permId === "staff_custom_roles.view") cascadeRevoke("staff_custom_roles.");
        if (permId === "services.view") cascadeRevoke("services.");
        if (permId === "requests.view") cascadeRevoke("requests.");
        if (permId === "projects.view") cascadeRevoke("projects.");
        if (permId === "financial_reports.view") cascadeRevoke("financial_reports.");
        if (permId === "financial_approval.view") {
          const defVal = rolePermissions?.includes("financial_approval.approve") || false;
          if (defVal) {
            updated["financial_approval.approve"] = false;
          } else {
            delete updated["financial_approval.approve"];
          }
        }
      }

      return updated;
    });
  };

  // تحديد وتفعيل الكل لوحدة برمجية معينة
  const handleToggleModuleAll = (modulePerms: any[]) => {
    const permIds = modulePerms.map(p => p.id);
    const allSelected = permIds.every(id => isChecked(id));
    
    setOverrides(prev => {
      let updated = { ...prev };
      
      if (allSelected) {
        permIds.forEach(id => {
          const defVal = rolePermissions?.includes(id) || false;
          if (defVal) {
            updated[id] = false;
          } else {
            delete updated[id];
          }
        });
      } else {
        permIds.forEach(id => {
          if (id === "appointments.view_own" && permIds.includes("appointments.view_all")) {
            return;
          }
          const defVal = rolePermissions?.includes(id) || false;
          if (defVal) {
            delete updated[id];
          } else {
            updated[id] = true;
          }
        });
      }
      return updated;
    });
  };

  // إدارة الأدوار المخصصة للمستخدم
  const { data: allRoles } = trpc.permissions.getRoles.useQuery();
  const [selectedRoleId, setSelectedRoleId] = useState<string>("");

  const assignRoleMutation = trpc.permissions.assignRole.useMutation({
    onSuccess: () => {
      toast.success("تم إسناد الدور للمستخدم بنجاح");
      utils.permissions.getUserRoles.invalidate({ userId: userId! });
      utils.permissions.getUserRolePermissions.invalidate({ userId: userId! });
      utils.permissions.getUserPermissions.invalidate({ userId: userId! });
      utils.auth.me.invalidate();
      setSelectedRoleId("");
    },
    onError: (error: any) => {
      toast.error(`فشل إسناد الدور: ${error.message}`);
    }
  });

  const removeRoleMutation = trpc.permissions.removeRole.useMutation({
    onSuccess: () => {
      toast.success("تم إزالة الدور من المستخدم بنجاح");
      utils.permissions.getUserRoles.invalidate({ userId: userId! });
      utils.permissions.getUserRolePermissions.invalidate({ userId: userId! });
      utils.permissions.getUserPermissions.invalidate({ userId: userId! });
      utils.auth.me.invalidate();
    },
    onError: (error: any) => {
      toast.error(`فشل إزالة الدور: ${error.message}`);
    }
  });

  const handleAssignRole = () => {
    if (!selectedRoleId) return;
    assignRoleMutation.mutate({
      userId: userId!,
      roleId: selectedRoleId
    });
  };

  const handleRemoveRole = (roleId: string) => {
    if (confirm("هل أنت متأكد من إزالة هذا الدور من المستخدم؟")) {
      removeRoleMutation.mutate({
        userId: userId!,
        roleId
      });
    }
  };

  const assignableRoles = allRoles?.filter(role => {
    const isPrimary = role.id === userData?.role;
    const isAssigned = userRoles?.some(ur => ur.roleId === role.id);
    return !isPrimary && !isAssigned && role.isActive;
  }) || [];

  // حفظ الصلاحيات الفردية
  const syncMutation = trpc.permissions.setUserDirectPermissions.useMutation({
    onSuccess: () => {
      toast.success("تم تحديث صلاحيات المستخدم الفردية بنجاح");
      refetchFinal();
      refetchDirect();
      utils.permissions.getUserPermissions.invalidate({ userId: userId! });
      utils.permissions.getUserRolePermissions.invalidate({ userId: userId! });
      utils.auth.me.invalidate();
    },
    onError: (error: any) => {
      toast.error(`فشل تحديث الصلاحيات: ${error.message}`);
    }
  });

  const handleSaveChanges = () => {
    const payload = Object.entries(overrides).map(([permissionId, granted]) => ({
      permissionId,
      granted,
      reason: "تخصيص صلاحيات المستخدم المباشرة"
    }));

    syncMutation.mutate({
      userId: userId!,
      permissions: payload
    });
  };

  // إعادة تعيين لخيارات الدور
  const handleResetToDefault = () => {
    if (confirm("هل أنت متأكد من إلغاء كافة الاستثناءات المباشرة والعودة لخيارات الدور الافتراضية؟")) {
      setOverrides({});
    }
  };

  // مسمى الصلاحيات المهنية (نفس المخرجات المعتمدة لصفحة تخصيص الدور)
  const getDescriptiveLabel = (moduleId: string, action: string) => {
    const mapping: Record<string, Record<string, string>> = {
      mosques: {
        view: "عرض قائمة المساجد",
        create: "إضافة مسجد جديد",
        edit: "تعديل بيانات مسجد",
        delete: "حذف مسجد",
        approve: "الاعتمادات (رفض أو اعتماد المسجد)"
      },
      requests: {
        view: "عرض كافة الطلبات",
        create: "إضافة طلب",
        view_details: "عرض تفاصيل الطلب وإدارته",
        manage_as_field_team: "ادارة الطلبات كفريق ميداني"
      },
      projects: {
        view: "عرض المشاريع",
        view_details: "عرض تفاصيل المشروع وادارته"
      },
      requesters: {
        view: "عرض بيانات طالبي الخدمة",
        approve: "الاعتمادات (رفض أو اعتماد الحساب)"
      },
      suppliers: {
        view: "عرض قائمة الموردين",
        view_details: "عرض تفاصيل المورد",
        add: "إضافة مورد",
        approve: "الاعتمادات (اعتماد أو رفض مورد)"
      },
      quotations: {
        view: "عرض قائمة عروض الأسعار",
        add: "إضافة عرض سعر",
        approve: "الاعتمادات (اعتماد عروض الأسعار)"
      },
      financial_approval: {
        view: "مقارنة عروض الاسعار من دون اعتماد",
        approve: "الاعتماد المالي لعرض السعر"
      },
      contracts: {
        view: "عرض العقود وقالب العقود",
        create: "إنشاء عقود",
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
        approve: "اعتماد طلبات الصرف"
      },
      disbursement_orders: {
        view: "عرض أوامر الصرف",
        approve: "اعتماد أوامر الصرف",
        reject: "رفض أوامر الصرف"
      },
      progress_reports: {
        view: "عرض تقارير الإنجاز",
        add: "إضافة تقرير إنجاز",
        edit: "تعديل التقرير",
        approve: "اعتماد تقارير المتابعة"
      },
      financial_reports: {
        view: "عرض تقرير المالية والإحصائيات",
        export: "تصدير البيانات",
      },
      staff_users: {
        view: "عرض قائمة المستخدمين",
        add: "إضافة موظف جديد",
        edit: "تعديل البيانات الأساسية",
        suspend: "إيقاف الحساب",
        delete: "حذف الحساب"
      },
      staff_roles: {
        view: "عرض الأدوار والصلاحيات",
        customize: "تخصيص صلاحيات الدور الأساسي",
        suspend: "إيقاف الدور الأساسي"
      },
      staff_custom_roles: {
        view: "عرض الأدوار المخصصة",
        add: "إضافة دور مخصص جديد",
        edit: "تعديل الدور المخصص",
        delete: "حذف الدور المخصص"
      },
      settings_org: {
        view: "عرض إعدادات الجمعية",
        edit_basic: "تعديل معلومات الجمعية الأساسية",
        edit_signers: "تعديل المفوضين بالتوقيع",
        edit_banks: "تعديل الحسابات البنكية المعتمدة",
        edit_contracts: "تعديل إعدادات وصياغة العقود"
      },
      settings_branding: {
        edit: "تعديل الهوية البصرية وشعارات البوابة"
      },
      settings_categories: {
        view: "عرض وتحديث تصنيفات الخدمات",
        add: "إضافة تصنيف جديد للخدمات",
        edit: "تعديل وحفظ تصنيف الخدمات",
        delete: "حذف تصنيف الخدمات"
      },
      services: {
        view: "عرض قائمة البرامج والخدمات",
        add: "إضافة برنامج أو خدمة جديدة",
        edit: "تعديل مواصفات البرامج والخدمات",
        delete: "حذف برنامج أو خدمة"
      },
      mosque_map: {
        view: "عرض الخريطة الجغرافية للمساجد"
      },
      appointments: {
        view: "عرض تقويم المواعيد والزيارات",
        view_all: "عرض كافة المواعيد والزيارات للمنشأة",
        view_own: "عرض زياراتي الميدانية الخاصة بي فقط"
      }
    };
    return mapping[moduleId]?.[action] || action;
  };

  // هيكل الصلاحيات الكامل (Categorized) - مطابق تماماً للـ superAdminGroups في RolePermissions.tsx
  const permissionsGroups = [
    {
      title: "المساجد والطلبات",
      modules: [
        { id: "mosques", nameAr: "المساجد", icon: Building2, perms: ["view", "create", "edit", "delete", "approve"] },
        { id: "mosque_map", nameAr: "خريطة المساجد", icon: Map, perms: ["view"] },
        { 
          id: "requests", 
          nameAr: "الطلبات", 
          icon: Zap, 
          perms: activeRoleId === "field_team" 
            ? ["view", "create", "view_details", "manage_as_field_team"] 
            : ["view", "create", "view_details"] 
        },
        { id: "appointments", nameAr: "تقويم المواعيد", icon: Calendar, perms: ["view_all", "view_own"] },
        { id: "projects", nameAr: "المشاريع", icon: LayoutGrid, perms: ["view", "view_details"] },
        { id: "requesters", nameAr: "حسابات طالبي الخدمة", icon: Users, perms: ["view", "approve"] },
      ]
    },
    {
      title: "المالية والعقود",
      modules: [
        { id: "suppliers", nameAr: "الموردون", icon: Users, perms: ["view", "view_details", "add", "approve"] },
        { id: "quotations", nameAr: "عروض الأسعار", icon: Receipt, perms: ["view", "add", "approve"] },
        { id: "financial_approval", nameAr: "الاعتماد المالي", icon: CheckSquare, perms: ["view", "approve"] },
        { id: "contracts", nameAr: "العقود", icon: FileSignature, perms: ["view", "create", "template_add", "template_edit", "template_delete", "clause_add"] },
        { id: "disbursements", nameAr: "طلبات الصرف", icon: Wallet, perms: ["view", "add", "edit", "delete", "approve"] },
        { id: "disbursement_orders", nameAr: "أوامر الصرف", icon: Banknote, perms: ["view", "approve", "reject"] },
        { id: "progress_reports", nameAr: "تقارير الإنجاز", icon: ClipboardCheck, perms: ["view", "add", "edit", "approve"] },
        { id: "financial_reports", nameAr: "التقرير المالي", icon: FileBarChart, perms: ["view", "export"] },
      ]
    },
    {
      title: "إدارة المستخدمين",
      modules: [
        { id: "staff_users", nameAr: "المستخدمين", icon: Users, perms: ["view", "add", "edit", "suspend", "delete"] },
        { id: "staff_roles", nameAr: "الأدوار والصلاحيات", icon: Shield, perms: ["view", "customize", "suspend"] },
        { id: "staff_custom_roles", nameAr: "الأدوار المخصصة", icon: Briefcase, perms: ["view", "add", "edit", "delete"] }
      ]
    },
    {
      title: "الإعدادات والبرامج",
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
      ]
    }
  ];

  if (!userId) {
    return (
      <DashboardLayout>
        <div className="container py-20 text-center">
          <h2 className="text-2xl font-bold text-destructive">خطأ في معرف المستخدم</h2>
          <Button variant="outline" className="mt-4" onClick={() => setLocation("/users")}>العودة لقائمة المستخدمين</Button>
        </div>
      </DashboardLayout>
    );
  }

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="container py-24 flex flex-col items-center justify-center min-h-[500px]">
          <div className="relative mb-6">
            <div className="w-16 h-16 border-4 border-primary/10 border-t-primary rounded-full animate-spin" />
            <Shield className="w-6 h-6 text-primary absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
          </div>
          <p className="text-muted-foreground font-medium animate-pulse text-lg">جاري تحميل صلاحيات المستخدم...</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="container py-8 max-w-7xl mx-auto" dir="rtl text-right">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-10 text-right">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => setLocation(`/users/${userId}`)} 
              className="rounded-full hover:bg-slate-100 transition-colors shrink-0"
            >
              <ArrowRight className="h-6 w-6" />
            </Button>
            <div className="p-3.5 bg-primary/10 rounded-2xl shrink-0">
              <Shield className="h-8 w-8 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                تخصيص صلاحيات المستخدم
              </h1>
              <div className="flex flex-wrap items-center gap-2 mt-1">
                <span className="text-slate-500 dark:text-slate-400 text-sm font-semibold flex items-center gap-1.5">
                  <User className="w-4 h-4" />
                  {userData?.name}
                </span>
                <span className="text-slate-300 dark:text-slate-700">|</span>
                <span className="text-slate-500 dark:text-slate-400 text-xs font-semibold">
                  {userRoles && userRoles.length > 0 ? "الدور المخصص:" : "الدور الأساسي:"}
                </span>
                <Badge variant="secondary" className="bg-primary/10 text-primary font-bold">
                  {roleNameAr}
                </Badge>
                {userRoles && userRoles.length > 1 && (
                  <>
                    <span className="text-slate-300 dark:text-slate-700">|</span>
                    <span className="text-slate-500 dark:text-slate-400 text-xs font-semibold">الأدوار الإضافية:</span>
                    {userRoles.slice(1).map((ur) => (
                      <Badge key={ur.id} variant="secondary" className="bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300 font-medium">
                        {ur.roleName}
                      </Badge>
                    ))}
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="flex justify-end items-center gap-3">
            {hasChanges && (
              <span className="text-xs text-amber-600 dark:text-amber-400 font-bold animate-pulse">
                توجد تغييرات غير محفوظة *
              </span>
            )}
            <Button
              variant="outline"
              onClick={handleResetToDefault}
              disabled={Object.keys(overrides).length === 0 || syncMutation.isPending}
              className="rounded-xl h-11 px-5 font-semibold text-slate-600 dark:text-slate-300 gap-2 border-slate-200 hover:bg-slate-50 dark:border-slate-800"
            >
              <RotateCcw className="h-4.5 w-4.5" />
              إعادة تعيين الافتراضي
            </Button>
            <Button
              onClick={handleSaveChanges}
              disabled={syncMutation.isPending || !hasChanges}
              className={`px-6 font-bold rounded-xl shadow-md h-11 transition-all ${
                hasChanges 
                  ? "gradient-primary text-white scale-105 hover:scale-108" 
                  : "bg-slate-100 dark:bg-slate-800 text-slate-400 border border-slate-200 dark:border-slate-700 cursor-not-allowed"
              }`}
            >
              {syncMutation.isPending ? (
                <>
                  <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                  جاري الحفظ...
                </>
              ) : (
                "حفظ التغييرات"
              )}
            </Button>
          </div>
        </div>


        {/* Informative Tip */}
        <div className="border border-primary/10 bg-primary/5 rounded-2xl p-5 mb-10 flex items-start gap-4 text-right">
          <div className="p-2 rounded-lg bg-primary/10 shrink-0">
            <CheckCircle2 className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="font-semibold mb-1">
              تخصيص الصلاحيات للشخص
            </p>
            <p className="text-sm leading-relaxed text-muted-foreground">
              تظهر الصلاحيات موروثة من الدور تلقائياً. يمكنك النقر على أي صلاحية لمنحها كصلاحية استثنائية مباشرة للمستخدم (باللون الأخضر) أو حجبها تماماً عنه (باللون الأحمر)، ثم النقر على حفظ التغييرات.
            </p>
          </div>
        </div>

        {/* Grouped Rendering */}
        <div className="space-y-12 text-right">
          {permissionsGroups.map((group, groupIdx) => (
            <div key={groupIdx} className="space-y-6">
              <div className="flex items-center gap-3 px-2">
                <div className="w-1.5 h-8 rounded-full bg-primary shrink-0" />
                <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">{group.title}</h2>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {group.modules.map((module) => {
                  const Icon = module.icon || Shield;
                  const modulePerms = module.perms.map(p => ({
                    id: `${module.id}.${p}`,
                    nameAr: getDescriptiveLabel(module.id, p)
                  }));

                  const activePerms = modulePerms.filter((p) => isChecked(p.id));
                  const grantedCount = activePerms.length; 

                  return (
                    <Card key={module.id} className="overflow-hidden border-slate-200/60 dark:border-slate-800 shadow-lg shadow-slate-200/20 dark:shadow-none rounded-2xl transition-all hover:shadow-xl hover:shadow-slate-200/40">
                      <CardHeader className="bg-slate-50/80 dark:bg-slate-900/80 border-b border-slate-100 dark:border-slate-800 px-6 py-5">
                        <div className="flex items-center justify-between" dir="rtl">
                          <div className="flex items-center gap-4 text-right">
                            <div className="p-2.5 bg-white dark:bg-slate-800 rounded-xl shadow-sm">
                              <Icon className="h-5 w-5 text-primary" />
                            </div>
                            <CardTitle className="text-xl font-bold">{module.nameAr}</CardTitle>
                          </div>
                          <div className="flex items-center gap-4">
                            {modulePerms.length > 0 && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleToggleModuleAll(modulePerms);
                                }}
                                className="text-xs text-muted-foreground hover:text-primary hover:bg-primary/5 rounded-lg font-bold"
                              >
                                {modulePerms.every((p) => isChecked(p.id)) ? "إلغاء تحديد الكل" : "تحديد الكل"}
                              </Button>
                            )}
                            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 text-primary rounded-xl font-bold text-sm">
                              <span>{grantedCount}</span>
                              <span className="opacity-50">/</span>
                              <span>{modulePerms.length}</span>
                            </div>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="p-6">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3" dir="rtl">
                          {modulePerms.map((perm) => {
                            const isPermChecked = isChecked(perm.id);
                            const overrideState = getOverrideState(perm.id);

                            const isDisabled = 
                              (perm.id.startsWith("mosques.") && perm.id !== "mosques.view" && !isChecked("mosques.view")) ||
                              (perm.id.startsWith("suppliers.") && perm.id !== "suppliers.view" && !isChecked("suppliers.view")) ||
                              (perm.id.startsWith("quotations.") && perm.id !== "quotations.view" && !isChecked("quotations.view")) ||
                              (perm.id.startsWith("staff_users.") && perm.id !== "staff_users.view" && !isChecked("staff_users.view")) ||
                              (perm.id.startsWith("staff_roles.") && perm.id !== "staff_roles.view" && !isChecked("staff_roles.view")) ||
                              (perm.id.startsWith("staff_custom_roles.") && perm.id !== "staff_custom_roles.view" && !isChecked("staff_custom_roles.view")) ||
                              (perm.id.startsWith("services.") && perm.id !== "services.view" && !isChecked("services.view")) ||
                              (perm.id.startsWith("requests.") && perm.id !== "requests.view" && !isChecked("requests.view")) ||
                              (perm.id.startsWith("projects.") && perm.id !== "projects.view" && !isChecked("projects.view")) ||
                              (perm.id === "financial_approval.approve" && !isChecked("financial_approval.view"));

                            // تحديد نمط البطاقة بناءً على نوع حالة الصلاحية (موروثة، ممنوحة، مسحوبة)
                            let cardClass = "border-slate-200 dark:border-slate-800 bg-background hover:bg-slate-50 dark:hover:bg-slate-900/50 text-slate-600 dark:text-slate-400 cursor-pointer";
                            let badgeElement = null;

                            if (isDisabled) {
                              cardClass = "border-slate-100 dark:border-slate-900 bg-slate-50/50 dark:bg-slate-900/10 text-slate-300 dark:text-slate-600 cursor-not-allowed pointer-events-none opacity-50";
                            } else if (overrideState === "granted") {
                              cardClass = "border-green-200 bg-green-50/40 dark:bg-green-950/10 dark:border-green-900/30 text-green-950 dark:text-green-400 hover:bg-green-50/60 cursor-pointer";
                              badgeElement = <Badge variant="outline" className="text-[9px] bg-green-100 text-green-800 border-green-200 font-semibold py-0 shrink-0">منح خاص</Badge>;
                            } else if (overrideState === "revoked") {
                              cardClass = "border-red-200 bg-red-50/40 dark:bg-red-950/10 dark:border-red-900/30 text-red-950 dark:text-red-400 hover:bg-red-50/60 cursor-pointer";
                              badgeElement = <Badge variant="outline" className="text-[9px] bg-red-100 text-red-800 border-red-200 font-semibold py-0 shrink-0">حجب خاص</Badge>;
                            } else if (rolePermissions?.includes(perm.id)) {
                              badgeElement = <span className="text-[10px] text-slate-400 shrink-0">موروثة</span>;
                            }

                            return (
                              <div 
                                key={perm.id} 
                                onClick={() => !isDisabled && handleTogglePermission(perm.id)}
                                className={`flex items-center justify-between gap-2.5 px-3 py-2.5 rounded-xl border transition-all select-none text-right ${cardClass}`}
                              >
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <div className={`w-4.5 h-4.5 rounded flex items-center justify-center border shrink-0 transition-all ${
                                    isDisabled
                                      ? "border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900"
                                      : isPermChecked
                                        ? overrideState === "granted"
                                          ? "bg-green-600 border-green-600 text-white"
                                          : "bg-primary border-primary text-white"
                                        : "border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                                  }`}>
                                    {isPermChecked && (
                                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3.5} stroke="currentColor" className="w-3 h-3">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                                      </svg>
                                    )}
                                  </div>
                                  <span className="text-xs font-bold leading-tight truncate">{perm.nameAr}</span>
                                </div>
                                {badgeElement}
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
            variant="outline"
            onClick={() => setLocation(`/users/${userId}`)}
            className="rounded-xl h-11 px-6 font-semibold"
          >
            إلغاء
          </Button>
          <Button
            onClick={handleSaveChanges}
            disabled={syncMutation.isPending || !hasChanges}
            className={`px-8 font-bold rounded-xl shadow-md h-11 transition-all ${
              hasChanges 
                ? "gradient-primary text-white scale-105 hover:scale-108" 
                : "bg-slate-100 dark:bg-slate-800 text-slate-400 border border-slate-200 dark:border-slate-700 cursor-not-allowed"
            }`}
          >
            {syncMutation.isPending ? "جاري حفظ التغييرات..." : "حفظ التغييرات"}
          </Button>
        </div>
      </div>
    </DashboardLayout>
  );
}
