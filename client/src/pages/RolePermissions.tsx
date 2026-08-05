import { useState, useEffect, useMemo } from "react";
import { useRoute, useLocation } from "wouter";
import { trpc } from "../lib/trpc";
import { Button } from "../components/ui/button";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
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
  Bell,
  FileSpreadsheet,
  LifeBuoy,
  PenLine
} from "lucide-react";
import DashboardLayout from "../components/DashboardLayout";

export default function RolePermissions() {
  const [, params] = useRoute("/staff/roles/:id");
  const [, setLocation] = useLocation();
  const roleId = params?.id;

  const utils = trpc.useUtils();
  const [selectedPerms, setSelectedPerms] = useState<string[]>([]);

  const { data: roles, isLoading: rolesLoading } = trpc.permissions.getRoles.useQuery();
  const { data: rolePermissions, isLoading: permsLoading } = trpc.permissions.getRolePermissions.useQuery(
    { roleId: roleId || "" },
    { enabled: !!roleId }
  );
  const { data: structure, isLoading: structureLoading } = trpc.permissions.getStructure.useQuery();

  const role = roles?.find((r) => r.id === roleId);
  const isLoading = rolesLoading || permsLoading || structureLoading;

  useEffect(() => {
    if (rolePermissions) {
      if (roleId === "project_manager") {
        setSelectedPerms(rolePermissions.filter(p => !p.startsWith("financial_reports.") && !p.startsWith("settings_contracts.")));
      } else {
        setSelectedPerms(rolePermissions);
      }
    }
  }, [rolePermissions, roleId]);

  const hasChanges = useMemo(() => {
    if (!rolePermissions) return false;
    const initialPerms = roleId === "project_manager" 
      ? rolePermissions.filter(p => !p.startsWith("financial_reports.") && !p.startsWith("settings_contracts."))
      : rolePermissions;
    if (selectedPerms.length !== initialPerms.length) return true;
    const setA = new Set(selectedPerms);
    return !initialPerms.every(p => setA.has(p));
  }, [selectedPerms, rolePermissions, roleId]);

  const updateRoleMutation = trpc.permissions.updateRole.useMutation({
    onSuccess: () => {
      toast.success("تم حفظ وتحديث الصلاحيات بنجاح");
      utils.permissions.getRolePermissions.invalidate({ roleId: roleId || "" });
      utils.permissions.getUserPermissions.invalidate();
      utils.permissions.getUserRolePermissions.invalidate();
      utils.auth.me.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || "حدث خطأ أثناء حفظ الصلاحيات");
    }
  });

  const restoreDefaultMutation = trpc.permissions.restoreDefaultPermissions.useMutation({
    onSuccess: () => {
      toast.success("تم إعادة الصلاحيات الافتراضية للدور بنجاح");
      utils.permissions.getRolePermissions.invalidate({ roleId: roleId || "" });
      utils.permissions.getRoles.invalidate();
      utils.permissions.getUserPermissions.invalidate();
      utils.permissions.getUserRolePermissions.invalidate();
      utils.auth.me.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || "حدث خطأ أثناء استعادة الصلاحيات الافتراضية");
    }
  });

  const handleSaveChanges = () => {
    if (!roleId) return;
    let finalPerms = selectedPerms;
    if (roleId === "project_manager") {
      finalPerms = finalPerms.filter(p => !p.startsWith("financial_reports.") && !p.startsWith("settings_contracts."));
    }
    updateRoleMutation.mutate({
      roleId,
      permissions: finalPerms
    });
  };

  const handleTogglePermission = (permId: string) => {
    if (isSuperAdmin) return;
    
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


    // منع تفعيل أي صلاحية في قسم العقود إلا إذا كانت صلاحية العرض مفعلة
    if (permId.startsWith("contracts.") && permId !== "contracts.view") {
      if (!selectedPerms.includes("contracts.view")) {
        toast.warning("يجب تفعيل صلاحية 'عرض العقود وقالب العقود' أولاً");
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
        // عند إلغاء تفعيل صلاحية 'عرض المساجد'، نقوم تلقائياً بإلغاء تفعيل كافة صلاحيات المساجد الأخرى
        if (permId === "mosques.view") {
          next = next.filter(id => !id.startsWith("mosques."));
        }
        // عند إلغاء تفعيل صلاحية 'عرض قائمة الموردين'، نقوم تلقائياً بإلغاء تفعيل كافة صلاحيات الموردين الأخرى
        if (permId === "suppliers.view") {
          next = next.filter(id => !id.startsWith("suppliers."));
        }
        // عند إلغاء تفعيل صلاحية 'عرض قائمة عروض الأسعار'، نقوم تلقائياً بإلغاء تفعيل كافة صلاحيات عروض الأسعار الأخرى
        if (permId === "quotations.view") {
          next = next.filter(id => !id.startsWith("quotations."));
        }
        // عند إلغاء تفعيل صلاحية 'عرض قائمة المستخدمين'، نقوم تلقائياً بإلغاء تفعيل كافة صلاحيات المستخدمين الأخرى
        if (permId === "staff_users.view") {
          next = next.filter(id => !id.startsWith("staff_users."));
        }
        // عند إلغاء تفعيل صلاحية 'عرض الأدوار والصلاحيات'، نقوم تلقائياً بإلغاء تفعيل كافة صلاحيات الأدوار والصلاحيات الأخرى
        if (permId === "staff_roles.view") {
          next = next.filter(id => !id.startsWith("staff_roles."));
        }
        // عند إلغاء تفعيل صلاحية 'عرض الأدوار المخصصة'، نقوم تلقائياً بإلغاء تفعيل كافة صلاحيات الأدوار المخصصة الأخرى
        if (permId === "staff_custom_roles.view") {
          next = next.filter(id => !id.startsWith("staff_custom_roles."));
        }
        // عند إلغاء تفعيل صلاحية 'عرض البرامج'، نقوم تلقائياً بإلغاء تفعيل كافة صلاحيات البرامج الأخرى
        if (permId === "services.view") {
          next = next.filter(id => !id.startsWith("services."));
        }
        // عند إلغاء عرض الطلبات: cascade لكل صلاحياتها ما عدا توقيع التقرير الختامي (انتقلت لقسم التوقيع)
        if (permId === "requests.view") {
          next = next.filter(id => !id.startsWith("requests.") || id === "requests.sign_final_report");
        }
        // عند إلغاء تفعيل صلاحية 'عرض سجل المشاريع'، نقوم تلقائياً بإلغاء تفعيل كافة صلاحيات المشاريع الأخرى
        if (permId === "projects.view") {
          next = next.filter(id => !id.startsWith("projects."));
        }
        // عند إلغاء تفعيل صلاحية 'عرض بيانات طالبي الخدمة'، نقوم تلقائياً بإلغاء تفعيل كافة صلاحيات طالبي الخدمة الأخرى
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
        // عند إلغاء تفعيل صلاحية 'مقارنة عروض الاسعار من دون اعتماد'، نقوم تلقائياً بإلغاء تفعيل الاعتماد المالي
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
        // منع اختيار الصلاحيتين معاً لمواعيد تقويم المنشأة والمواعيد الخاصة
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
    if (isSuperAdmin) return;
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

  if (!role) {
    return (
      <DashboardLayout>
        <div className="container py-20 text-center">
          <AlertCircle className="w-16 h-16 text-destructive mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-destructive">عذراً، لم يتم العثور على الدور</h2>
          <Button variant="outline" className="mt-4" onClick={() => setLocation("/staff")}>
            العودة لصفحة الإدارة
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  const isCorporateComm = roleId === "corporate_comm";
  const isFieldTeam = roleId === "field_team";
  const isFinance = roleId === "financial";
  const isProjectsOffice = roleId === "projects_office";
  const isQuickResponse = roleId === "quick_response";
  const isProjectManager = roleId === "project_manager";
  const isSuperAdmin = roleId === "super_admin" || roleId === "system_admin";

  // مصفوفة الصلاحيات المخصصة لـ مدير المشاريع
  const projectManagerGroups = [
    {
      title: "المساجد والطلبات",
      modules: [
        {
          id: "projects",
          nameAr: "المشاريع",
          icon: LayoutGrid,
          permissions: [
            { id: "projects.view", nameAr: "عرض سجل المشاريع" },
            { id: "projects.create", nameAr: "إضافة مشروع جديد" },
            { id: "projects.edit", nameAr: "تعديل بيانات المشروع" },
            { id: "projects.delete", nameAr: "حذف مشروع" },
            { id: "projects.export", nameAr: "تصدير سجل المشاريع" },
          ]
        },
        {
          id: "reports",
          nameAr: "التقارير",
          icon: FileText,
          permissions: [
            { id: "reports.view", nameAr: "عرض التقارير" },
            { id: "reports.add", nameAr: "إضافة تقارير جديدة" },
            { id: "reports.edit", nameAr: "تعديل التقارير" },
            { id: "reports.delete", nameAr: "حذف التقارير" },
            { id: "reports.approve", nameAr: "اعتماد التقارير" },
          ]
        }
      ]
    }
  ];

  // مصفوفة الصلاحيات المخصصة لـ الاتصال المؤسسي
  const corporateCommModules = [
    {
      id: "partners",
      nameAr: "الشركاء",
      icon: Handshake,
      permissions: [
        { id: "partners.view", nameAr: "عرض الشركاء" },
        { id: "partners.add", nameAr: "إضافة شريك جديد" },
        { id: "partners.edit", nameAr: "تعديل بيانات شريك" },
        { id: "partners.delete", nameAr: "حذف شريك" },
      ]
    },
    {
      id: "reports",
      nameAr: "التقارير",
      icon: FileText,
      permissions: [
        { id: "reports.view", nameAr: "عرض التقارير" },
        { id: "reports.add", nameAr: "إضافة تقارير جديدة" },
        { id: "reports.edit", nameAr: "تعديل التقارير" },
        { id: "reports.delete", nameAr: "حذف التقارير" },
        { id: "reports.approve", nameAr: "اعتماد التقارير" },
      ]
    },
    {
      id: "branding",
      nameAr: "الهوية البصرية",
      icon: Palette,
      permissions: [
        { id: "branding.view", nameAr: "عرض عناصر الهوية" },
        { id: "branding.add", nameAr: "إضافة عنصر هوية" },
        { id: "branding.edit", nameAr: "تعديل عناصر الهوية" },
        { id: "branding.delete", nameAr: "حذف عنصر هوية" },
        { id: "branding.assets", nameAr: "إدارة أصول الهوية البصرية" },
      ]
    }
  ];

  // مصفوفة الصلاحيات المخصصة لـ الفريق الميداني
  const fieldTeamGroups = [
    {
      title: "المساجد والطلبات",
      modules: [
        {
          id: "mosques",
          nameAr: "الزيارات الميدانية",
          icon: MapPin,
          permissions: [
            { id: "mosques.view", nameAr: "عرض الزيارات الميدانية" },
          ]
        },
        {
          id: "mosque_map",
          nameAr: "التقويم",
          icon: Calendar,
          permissions: [
            { id: "mosque_map.schedule", nameAr: "معرفة موعد الزيارة الميدانية" },
            { id: "mosque_map.today", nameAr: "عرض الزيارات اليوم" },
          ]
        },
        {
          id: "requests",
          nameAr: "طلباتي",
          icon: ClipboardList,
          permissions: [
            { id: "requests.assigned", nameAr: "عرض الطلبات الموكلة لكم" },
            { id: "requests.follow_up", nameAr: "متابعة حالة الطلب" },
            { id: "requests.view", nameAr: "عرض قائمة الطلبات" },
          ]
        }
      ]
    }
  ];

  // مصفوفة الصلاحيات المخصصة لـ الإدارة المالية
  const financeGroups = [
    {
      title: "المالية والعقود",
      modules: [
        {
          id: "suppliers",
          nameAr: "الموردون",
          icon: Users,
          permissions: [
            { id: "suppliers.view", nameAr: "عرض الموردين" },
            { id: "suppliers.add", nameAr: "إضافة مورد جديد" },
            { id: "suppliers.edit", nameAr: "تعديل بيانات الموردين" },
            { id: "suppliers.approve", nameAr: "اعتماد الموردين" },
          ]
        },
        {
          id: "quotations",
          nameAr: "عروض الأسعار",
          icon: Receipt,
          permissions: [
            { id: "quotations.view", nameAr: "عرض عروض الأسعار" },
            { id: "quotations.add", nameAr: "إضافة عرض سعر" },
            { id: "quotations.edit", nameAr: "تعديل عرض سعر" },
            { id: "quotations.approve", nameAr: "اعتماد عروض الأسعار" },
          ]
        },
        {
          id: "financial_approval",
          nameAr: "الاعتماد المالي",
          icon: CheckSquare,
          permissions: [
            { id: "financial_approval.view", nameAr: "مقارنة عروض الاسعار من دون اعتماد" },
            { id: "financial_approval.approve", nameAr: "الاعتماد المالي لعرض السعر" },
          ]
        },
        {
          id: "contracts",
          nameAr: "العقود",
          icon: FileSignature,
          permissions: [
            { id: "contracts.view", nameAr: "عرض العقود وقالب العقود" },
            { id: "contracts.create", nameAr: "إنشاء عقود" },
            { id: "contracts.approve", nameAr: "اعتماد العقود" },
            { id: "contracts.edit_approved", nameAr: "تعديل العقود المعتمدة" },
            { id: "contracts.template_add", nameAr: "إضافة قالب للعقود" },
            { id: "contracts.template_edit", nameAr: "تعديل قالب العقد" },
            { id: "contracts.template_delete", nameAr: "حذف قالب العقد" },
            { id: "contracts.clause_add", nameAr: "إضافة بند للعقد" },
          ]
        },
        {
          id: "disbursement_requests",
          nameAr: "طلبات الصرف",
          icon: Wallet,
          permissions: [
            { id: "disbursements.view", nameAr: "عرض طلبات الصرف" },
            { id: "disbursements.add", nameAr: "إنشاء طلب صرف" },
            { id: "disbursements.approve", nameAr: "اعتماد طلبات الصرف" },
            { id: "disbursements.create_custom", nameAr: "انشاء طلبات صرف مخصصة" },
          ]
        },
        {
          id: "disbursement_orders",
          nameAr: "أوامر الصرف",
          icon: Banknote,
          permissions: [
            { id: "disbursement_orders.view", nameAr: "عرض أوامر الصرف" },
            { id: "disbursement_orders.create_direct", nameAr: "انشاء امر صرف مخصص" },
          ]
        },
        {
          id: "financial_report",
          nameAr: "التقرير المالي",
          icon: FileBarChart,
          permissions: [
            { id: "financial_report.view", nameAr: "عرض التقرير المالي" },
            { id: "financial_report.export", nameAr: "تصدير البيانات المالية" },
          ]
        }
      ]
    }
  ];

  // مصفوفة الصلاحيات المخصصة لـ مكتب المشاريع - الهيكل التنظيمي الجديد
  const projectsOfficeGroups = [
    {
      title: "المساجد والطلبات",
      modules: [
        {
          id: "mosques",
          nameAr: "المساجد",
          icon: Building2,
          permissions: [
            { id: "mosques.view", nameAr: "عرض قائمة المساجد" },
            { id: "mosques.create", nameAr: "إضافة مسجد جديد" },
            { id: "mosques.edit", nameAr: "تعديل بيانات مسجد" },
            { id: "mosques.approve", nameAr: "اعتماد المساجد" },
          ]
        },
        {
          id: "mosque_map",
          nameAr: "خريطة المساجد",
          icon: Map,
          permissions: [
            { id: "mosque_map.view", nameAr: "عرض الخريطة التفاعلية" },
          ]
        },
        {
          id: "requests",
          nameAr: "الطلبات",
          icon: Zap,
          permissions: [
            { id: "requests.view", nameAr: "عرض قائمة الطلبات" },
            { id: "requests.create", nameAr: "إنشاء طلب جديد" },
            { id: "requests.edit", nameAr: "تعديل بيانات الطلب" },
            { id: "requests.follow_up", nameAr: "متابعة حالة الطلبات" },
          ]
        },
        {
          id: "appointments",
          nameAr: "تقويم المواعيد",
          icon: Calendar,
          permissions: [
            { id: "appointments.view", nameAr: "عرض تقويم المواعيد" },
            { id: "appointments.add", nameAr: "إضافة موعد جديد" },
            { id: "appointments.edit", nameAr: "تعديل موعد" },
          ]
        },
        {
          id: "projects",
          nameAr: "المشاريع",
          icon: LayoutGrid,
          permissions: [
            { id: "projects.view", nameAr: "عرض سجل المشاريع" },
            { id: "projects.create", nameAr: "إضافة مشروع جديد" },
            { id: "projects.edit", nameAr: "تعديل بيانات المشروع" },
            { id: "projects.export", nameAr: "تصدير سجل المشاريع" },
          ]
        },
        {
          id: "reports",
          nameAr: "التقارير",
          icon: FileBarChart,
          permissions: [
            { id: "reports.view_stats", nameAr: "عرض احصائيات الطلبات" },
            { id: "reports.export_data", nameAr: "تصدير البيانات" },
          ]
        }
      ]
    },
    {
      title: "المالية والعقود",
      modules: [
        {
          id: "suppliers",
          nameAr: "الموردون",
          icon: Users,
          permissions: [
            { id: "suppliers.view", nameAr: "عرض قائمة الموردين" },
            { id: "suppliers.add", nameAr: "إضافة مورد جديد" },
            { id: "suppliers.edit", nameAr: "تعديل بيانات الموردين" },
            { id: "suppliers.approve", nameAr: "اعتماد الموردين" },
          ]
        },
        {
          id: "quotations",
          nameAr: "عروض الأسعار",
          icon: Receipt,
          permissions: [
            { id: "quotations.view", nameAr: "عرض عروض الأسعار" },
            { id: "quotations.add", nameAr: "إضافة عرض سعر" },
            { id: "quotations.edit", nameAr: "تعديل عرض سعر" },
            { id: "quotations.approve", nameAr: "اعتماد عروض الأسعار" },
          ]
        },
        {
          id: "financial_approval",
          nameAr: "الاعتماد المالي",
          icon: CheckSquare,
          permissions: [
            { id: "financial_approval.view", nameAr: "مقارنة عروض الاسعار من دون اعتماد" },
            { id: "financial_approval.approve", nameAr: "الاعتماد المالي لعرض السعر" },
          ]
        },
        {
          id: "contracts",
          nameAr: "العقود",
          icon: FileSignature,
          permissions: [
            { id: "contracts.view", nameAr: "عرض العقود وقالب العقود" },
            { id: "contracts.create", nameAr: "إنشاء عقود" },
            { id: "contracts.approve", nameAr: "اعتماد العقود" },
            { id: "contracts.edit_approved", nameAr: "تعديل العقود المعتمدة" },
            { id: "contracts.template_add", nameAr: "إضافة قالب للعقود" },
            { id: "contracts.template_edit", nameAr: "تعديل قالب العقد" },
            { id: "contracts.template_delete", nameAr: "حذف قالب العقد" },
            { id: "contracts.clause_add", nameAr: "إضافة بند للعقد" },
          ]
        },
        {
          id: "disbursements",
          nameAr: "طلبات الصرف",
          icon: Wallet,
          permissions: [
            { id: "disbursements.view", nameAr: "عرض طلبات الصرف" },
            { id: "disbursements.add", nameAr: "إنشاء طلب صرف" },
            { id: "disbursements.edit", nameAr: "تعديل طلب الصرف" },
            { id: "disbursements.approve", nameAr: "اعتماد طلبات الصرف" },
            { id: "disbursements.create_custom", nameAr: "انشاء طلبات صرف مخصصة" },
          ]
        },
        {
          id: "disbursement_orders",
          nameAr: "أوامر الصرف",
          icon: Banknote,
          permissions: [
            { id: "disbursement_orders.view", nameAr: "عرض أوامر الصرف" },
            { id: "disbursement_orders.create_direct", nameAr: "انشاء امر صرف مخصص" },
          ]
        },
        {
          id: "progress_reports",
          nameAr: "تقارير الإنجاز",
          icon: ClipboardCheck,
          permissions: [
            { id: "progress_reports.view", nameAr: "عرض تقارير الإنجاز" },
            { id: "progress_reports.add", nameAr: "إضافة تقرير متابعة" },
            { id: "progress_reports.edit", nameAr: "تعديل تقرير الإنجاز" },
            { id: "progress_reports.approve", nameAr: "اعتماد تقارير التنفيذ" },
          ]
        },
        {
          id: "financial_reports",
          nameAr: "التقرير المالي",
          icon: FileBarChart,
          permissions: [
            { id: "financial_reports.view", nameAr: "عرض تقرير المالية والإحصائيات" },
            { id: "financial_reports.export", nameAr: "تصدير البيانات" },
          ]
        }
      ]
    }
  ];

  // مصفوفة الصلاحيات المخصصة لـ فريق الاستجابة السريعة
  const quickResponseModules = [
    {
      id: "requests",
      nameAr: "الطلبات",
      icon: Zap,
      permissions: [
        { id: "requests.view", nameAr: "عرض الطلبات" },
        { id: "requests.create", nameAr: "إنشاء طلب جديد" },
        { id: "requests.edit", nameAr: "تعديل الطلب" },
        { id: "requests.follow_up", nameAr: "متابعة الطلب" },
      ]
    }
  ];

  // هيكل الصلاحيات الكامل لـ مدير النظام (System Admin) - الهيكل العالمي الجديد
  const systemAdminGroups = [
    {
      title: "المساجد والطلبات",
      modules: [
        { id: "mosques", nameAr: "المساجد", icon: Building2, perms: ["view", "create", "edit", "delete", "approve"] },
        { id: "mosque_map", nameAr: "خريطة المساجد", icon: Map, perms: ["view"] },
        { id: "requests", nameAr: "الطلبات", icon: Zap, perms: ["view", "create", "view_details", "manage_as_field_team", "requests.manage_as_quick_response", "upload_final_report"] },
        { id: "appointments", nameAr: "تقويم المواعيد", icon: Calendar, perms: ["view_all", "view_own"] },
        { id: "projects", nameAr: "المشاريع", icon: LayoutGrid, perms: ["view", "view_details", "assign_as_manager", "financials"] },
        { id: "reports", nameAr: "التقارير", icon: FileBarChart, perms: ["view_stats", "export_data"] },
        { id: "pending_reports", nameAr: "تقارير الطلبات", icon: FileText, perms: ["view", "intervene"] },
      ]
    },
    {
      title: "المالية والعقود",
      modules: [
        { id: "suppliers", nameAr: "الموردون", icon: Users, perms: ["view", "view_details", "add", "approve"] },
        { id: "quotations", nameAr: "عروض الأسعار", icon: Receipt, perms: ["view", "add", "approve"] },
        { id: "financial_approval", nameAr: "الاعتماد المالي", icon: CheckSquare, perms: ["view", "approve"] },
        { id: "contracts", nameAr: "العقود", icon: FileSignature, perms: ["view", "create", "approve", "edit_approved", "template_add", "template_edit", "template_delete", "clause_add"] },
        { id: "disbursements", nameAr: "طلبات الصرف", icon: Wallet, perms: ["view", "add", "edit", "delete", "approve", "create_custom"] },
        { id: "disbursement_orders", nameAr: "أوامر الصرف", icon: Banknote, perms: ["view", "create_direct"] },
        { id: "progress_reports", nameAr: "تقارير الإنجاز", icon: ClipboardCheck, perms: ["view", "add", "edit", "approve"] },
        { id: "financial_reports", nameAr: "التقرير المالي", icon: FileBarChart, perms: ["view", "export"] },
      ]
    },
    {
      title: "إدارة المستخدمين",
      modules: [
        { id: "staff_users", nameAr: "المستخدمين", icon: Users, perms: ["view", "add", "edit", "suspend", "delete"] },
        { id: "staff_roles", nameAr: "الأدوار والصلاحيات", icon: Shield, perms: ["view", "customize", "suspend"] },
        { id: "staff_custom_roles", nameAr: "الأدوار المخصصة", icon: Briefcase, perms: ["view", "add", "edit", "delete"] },
        { id: "staff_notifications", nameAr: "تخصيص الإشعارات", icon: Bell, perms: ["edit"] }
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
        { id: "settings_branding", nameAr: "الهوية البصرية", icon: Palette, perms: ["view", "edit"] },
        { id: "settings_categories", nameAr: "إدارة التصنيفات", icon: Tag, perms: ["view", "edit"] },
        { id: "services", nameAr: "البرامج والخدمات", icon: LayoutGrid, perms: ["view", "add", "edit", "delete"] },
      ]
    }
  ];

  // هيكل الصلاحيات الكامل لـ المدير العام (Categorized)
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
        { id: "projects", nameAr: "المشاريع", icon: LayoutGrid, perms: ["view", "view_details", "assign_as_manager", "financials"] },
        { id: "progress_reports", nameAr: "تقارير الإنجاز", icon: ClipboardCheck, perms: ["view", "add", "edit", "approve"] },
        { id: "reports", nameAr: "التقارير الفنية", icon: FileBarChart, perms: ["view_stats", "export_data"] },
      ]
    },
    {
      title: "المشتريات والمالية",
      modules: [
        { id: "suppliers", nameAr: "الموردون", icon: Users, perms: ["view", "view_details", "add", "approve"] },
        { id: "boq", nameAr: "إعداد جداول الكميات", icon: FileSpreadsheet, perms: ["add", "edit", "delete"] },
        { id: "quotations", nameAr: "عروض الأسعار", icon: Receipt, perms: ["view", "add", "approve"] },
        { id: "financial_approval", nameAr: "الاعتماد المالي", icon: CheckSquare, perms: ["view", "approve"] },
        { id: "contracts", nameAr: "العقود", icon: FileSignature, perms: ["view", "create", "approve", "edit_approved", "template_add", "template_edit", "template_delete", "clause_add"] },
        { id: "disbursements", nameAr: "طلبات الصرف", icon: Wallet, perms: ["view", "add", "edit", "delete", "approve", "create_custom"] },
        { id: "disbursement_orders", nameAr: "أوامر الصرف", icon: Banknote, perms: ["view", "create_direct"] },
        { id: "financial_reports", nameAr: "التقرير المالي", icon: FileBarChart, perms: ["view", "export"] },
      ]
    },
    {
      title: "الدعم الفني",
      modules: [
        { id: "technical_support", nameAr: "الدعم الفني", icon: LifeBuoy, perms: ["view", "create"] }
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

  // هيكل المجموعات لـ الاتصال المؤسسي
  const corporateCommGroups = [
    {
      title: "إدارة الاتصال والشركاء",
      modules: corporateCommModules
    }
  ];

  // دالة مساعدة لتحويل الأفعال العامة إلى مسميات مهنية وصفية
  const getDescriptiveLabel = (moduleId: string, action: string) => {
    const mapping: Record<string, Record<string, string>> = {
      pending_reports: {
        view: "عرض التقارير",
        intervene: "تدخل لرفع التقرير"
      },
      signing: {
        disbursements_sign: "توقيع طلبات الصرف",
        disbursement_orders_sign: "توقيع أوامر الصرف",
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
        upload_final_report: "رفع التقرير الختامي",
      },
      projects: {
        view: "عرض المشاريع",
        view_details: "عرض تفاصيل المشروع وادارته",
        assign_as_manager: "تعيين كمدير للمشاريع",
        financials: "مالية المشاريع"
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
        export: "تصدير البيانات",
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

  const isCustomRole = roleId?.startsWith("custom_role_") || (!isCorporateComm && !isFieldTeam && !isFinance && !isProjectsOffice && !isQuickResponse && !isSuperAdmin && !role.isSystem);

  // الهيكل الثابت للأدوار المخصصة (نفس المستخدم في صفحة الإنشاء)
  const customRoleStructure = [
    {
      title: "المساجد والطلبات",
      subsections: [
        { id: "mosques", nameAr: "المساجد" },
        { id: "mosques_map", nameAr: "خريطة المساجد" },
        { id: "requests", nameAr: "الطلبات" },
        { id: "appointments_calendar", nameAr: "تقويم المواعيد" },
        { id: "projects", nameAr: "المشاريع" },
        { id: "service_requester_accounts", nameAr: "حسابات طالبي الخدمة" },
      ],
    },
    {
      title: "المالية والعقود",
      subsections: [
        { id: "suppliers", nameAr: "الموردون" },
        { id: "quotations", nameAr: "عروض الأسعار" },
        { id: "financial_approval", nameAr: "الاعتماد المالي" },
        { id: "contracts", nameAr: "العقود" },
        { id: "disbursement_requests", nameAr: "طلبات الصرف" },
        { id: "disbursement_orders", nameAr: "أوامر الصرف" },
        { id: "progress_reports", nameAr: "تقارير الإنجاز" },
        { id: "financial_report", nameAr: "التقرير المالي" },
      ],
    },
    {
      title: "الدعم الفني",
      subsections: [
        { id: "technical_support", nameAr: "الدعم الفني" },
      ],
    },
    {
      title: "إدارة المستخدمين",
      subsections: [
        { id: "staff_management", nameAr: "إدارة المستخدمين" },
      ],
    },
    {
      title: "الإعدادات",
      subsections: [
        { id: "settings_center", nameAr: "مركز الإعدادات" },
        { id: "programs_services", nameAr: "البرامج والخدمات" },
      ],
    },
  ];

  // الهيكل الموحد الشامل لجميع الأدوار
  const universalDisplayGroups = superAdminGroups.map(group => ({
    title: group.title,
    modules: group.modules.map(m => {
      let perms = m.perms;
      return {
        id: m.id,
        nameAr: m.nameAr,
        icon: m.icon,
        permissions: perms.map(p => {
          let id = `${m.id}.${p}`;
          if (m.id === "technical_support") {
            id = p === "view" ? "View_Tickets" : "Create_Ticket";
          }
          // Signing module: use explicit full permission IDs
          if (m.id === "signing") {
            const signingIds: Record<string, string> = {
              disbursements_sign: "disbursements.sign",
              disbursement_orders_sign: "disbursement_orders.sign",
              final_reports_sign: "final_reports.sign",
            };
            id = signingIds[p] || id;
          }
          return {
            id,
            nameAr: getDescriptiveLabel(m.id, p),
          };
        })
      };
    })
  }));

  const finalDisplayGroups = universalDisplayGroups;

  // منطق التحقق من الصلاحية
  const isPermissionGranted = (permId: string) => {
    const excludedAdminPerms = [
      'requests.manage_as_field_team',
      'requests.manage_as_quick_response',
      'requests.upload_final_report'
    ];
    if (isSuperAdmin && !excludedAdminPerms.includes(permId)) return true;
    return selectedPerms.includes(permId);
  };

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
              <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight truncate">صلاحيات الدور</h1>
              <p className="text-muted-foreground font-medium text-sm sm:text-base md:text-lg truncate">{role.nameAr}</p>
            </div>
          </div>

          {!isSuperAdmin && (
            <div className="flex flex-wrap lg:flex-nowrap items-center justify-end gap-2.5 sm:gap-3 w-full lg:w-auto">
              {hasChanges && (
                <span className="text-xs text-amber-600 dark:text-amber-400 font-bold animate-pulse w-full lg:w-auto text-left lg:text-right mb-1 lg:mb-0">
                  توجد تغييرات غير محفوظة *
                </span>
              )}
              {role?.isSystem && (
                <Button
                  variant="outline"
                  onClick={() => {
                    if (confirm("هل أنت متأكد من رغبتك في إعادة الصلاحيات الافتراضية لهذا الدور؟ سيتم إلغاء أي تخصيص قمت به.")) {
                      restoreDefaultMutation.mutate({ roleId: roleId || "" });
                    }
                  }}
                  disabled={restoreDefaultMutation.isPending}
                  className="w-full sm:w-auto text-xs sm:text-sm px-4 sm:px-5 font-bold rounded-xl border-slate-200 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800 h-10 sm:h-11 text-slate-700 dark:text-slate-200 shrink-0"
                >
                  {restoreDefaultMutation.isPending ? (
                    <>
                      <Loader2 className="ml-2 h-4 w-4 animate-spin animate-fade-in" />
                      جاري الاستعادة...
                    </>
                  ) : (
                    "إعادة الصلاحيات الافتراضية"
                  )}
                </Button>
              )}
              <Button
                onClick={handleSaveChanges}
                disabled={updateRoleMutation.isPending || !hasChanges}
                className={`w-full sm:w-auto text-xs sm:text-sm px-5 sm:px-6 font-bold rounded-xl shadow-md h-10 sm:h-11 transition-all ${
                  hasChanges 
                    ? "gradient-primary text-white scale-102 hover:scale-105" 
                    : "bg-slate-100 dark:bg-slate-800 text-slate-400 border border-slate-200 dark:border-slate-700 cursor-not-allowed"
                }`}
              >
                {updateRoleMutation.isPending ? (
                  <>
                    <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                    جاري الحفظ...
                  </>
                ) : (
                  "حفظ التغييرات"
                )}
              </Button>
            </div>
          )}
        </div>

        <div className="border rounded-2xl p-5 mb-10 flex items-start gap-4 shadow-sm bg-primary/5 border-primary/10">
          <div className="p-2 rounded-lg bg-primary/10 shrink-0">
            <CheckCircle2 className="h-5 w-5 text-primary" />
          </div>
          <div className="text-right">
            <p className="font-semibold mb-1">
              {isSuperAdmin ? "صلاحيات الوصول المطلق" : `تخصيص صلاحيات دور: ${role.nameAr}`}
            </p>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {isSuperAdmin
                ? "يتمتع هذا الدور بصلاحيات كاملة وشاملة عبر كافة الأنظمة التشغيلية والمالية والإدارية بشكل تلقائي وثابت (حماية النظام)."
                : "يمكنك الآن التحكم الدقيق وتعديل صلاحيات الوصول لهذا الدور. حدد أو ألغِ تحديد الصلاحيات حسب الأقسام (عرض، إضافة، تعديل، حذف، اعتماد) ثم انقر على حفظ التغييرات."}
            </p>
          </div>
        </div>

        {/* Grouped Rendering */}
        <div className="space-y-12">
          {finalDisplayGroups && finalDisplayGroups.length > 0 ? (
            finalDisplayGroups.map((group, groupIdx) => (
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
                    const rawPerms = module.permissions || [];
                    const modulePerms = rawPerms.filter((p: any) => {
                      // إظهار خيار "مواعيد الخاصة بي" فقط عند تخصيص الفريق الميداني
                      if (p.id === "appointments.view_own" && roleId !== "field_team") {
                        return false;
                      }
                      return true;
                    });
                    const activePerms = isSuperAdmin 
                      ? modulePerms.filter((p: any) => {
                          const excludedAdminPerms = [
                            'requests.manage_as_field_team',
                            'requests.manage_as_quick_response',
                            'requests.upload_final_report'
                          ];
                          return !excludedAdminPerms.includes(p.id);
                        })
                      : modulePerms.filter((p: any) => selectedPerms.includes(p.id));
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
                              {!isSuperAdmin && modulePerms.length > 0 && (
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
                                    {isChecked && <CheckCircle2 className="h-3 w-3 stroke-[3]" />}
                                  </div>
                                  <div className="flex flex-col min-w-0">
                                    <span className="text-xs font-bold leading-snug">
                                      {perm.nameAr}
                                    </span>
                                  </div>
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
            ))
          ) : (
            <div className="py-20 text-center">
              <Shield className="h-16 w-16 text-muted-foreground/20 mx-auto mb-4" />
              <p className="text-muted-foreground text-lg">لا توجد وحدات متاحة للعرض حالياً.</p>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
