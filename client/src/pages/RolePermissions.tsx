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
  Layers
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
      setSelectedPerms(rolePermissions);
    }
  }, [rolePermissions]);

  const hasChanges = useMemo(() => {
    if (!rolePermissions) return false;
    if (selectedPerms.length !== rolePermissions.length) return true;
    const setA = new Set(selectedPerms);
    return !rolePermissions.every(p => setA.has(p));
  }, [selectedPerms, rolePermissions]);

  const updateRoleMutation = trpc.permissions.updateRole.useMutation({
    onSuccess: () => {
      toast.success("تم حفظ وتحديث الصلاحيات بنجاح");
      utils.permissions.getRolePermissions.invalidate({ roleId: roleId || "" });
    },
    onError: (error) => {
      toast.error(error.message || "حدث خطأ أثناء حفظ الصلاحيات");
    }
  });

  const handleSaveChanges = () => {
    if (!roleId) return;
    updateRoleMutation.mutate({
      roleId,
      permissions: selectedPerms
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

    // منع تفعيل صلاحية الاعتماد المالي لعرض السعر إذا كانت مقارنة العروض معطلة
    if (permId === "financial_approval.approve") {
      if (!selectedPerms.includes("financial_approval.view")) {
        toast.warning("يجب تفعيل صلاحية 'مقارنة عروض الاسعار من دون اعتماد' أولاً");
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
        // عند إلغاء تفعيل صلاحية 'مقارنة عروض الاسعار من دون اعتماد'، نقوم تلقائياً بإلغاء تفعيل الاعتماد المالي
        if (permId === "financial_approval.view") {
          next = next.filter(id => id !== "financial_approval.approve");
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
            { id: "suppliers.edit", nameAr: "تعديل بيانات مورد" },
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
            { id: "contracts.view", nameAr: "عرض سجل العقود" },
            { id: "contracts.create", nameAr: "إنشاء عقد جديد" },
            { id: "contracts.edit", nameAr: "تعديل بيانات العقد" },
            { id: "contracts.sign", nameAr: "توقيع واعتماد العقد" },
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
          ]
        },
        {
          id: "disbursement_orders",
          nameAr: "أوامر الصرف",
          icon: Banknote,
          permissions: [
            { id: "disbursement_orders.view", nameAr: "عرض أوامر الصرف" },
            { id: "disbursement_orders.create", nameAr: "إنشاء أمر صرف" },
            { id: "disbursement_orders.execute", nameAr: "تنفيذ أمر الصرف" },
          ]
        },
        {
          id: "financial_report",
          nameAr: "التقرير المالي",
          icon: FileBarChart,
          permissions: [
            { id: "financial_report.view", nameAr: "عرض التقرير المالي" },
            { id: "financial_report.export", nameAr: "تصدير البيانات المالية" },
            { id: "financial_report.analytics", nameAr: "تحليل مؤشرات الأداء المالي" },
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
            { id: "suppliers.edit", nameAr: "تعديل بيانات مورد" },
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
            { id: "contracts.view", nameAr: "عرض سجل العقود" },
            { id: "contracts.create", nameAr: "إنشاء عقد جديد" },
            { id: "contracts.edit", nameAr: "تعديل بيانات العقد" },
            { id: "contracts.sign", nameAr: "توقيع واعتماد العقد" },
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
          ]
        },
        {
          id: "disbursement_orders",
          nameAr: "أوامر الصرف",
          icon: Banknote,
          permissions: [
            { id: "disbursement_orders.view", nameAr: "عرض أوامر الصرف" },
            { id: "disbursement_orders.create", nameAr: "إنشاء أمر صرف" },
            { id: "disbursement_orders.execute", nameAr: "تنفيذ أمر الصرف" },
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
            { id: "financial_reports.view", nameAr: "عرض التقارير المالية" },
            { id: "financial_reports.export", nameAr: "تصدير البيانات المالية" },
            { id: "financial_reports.analytics", nameAr: "تحليل مؤشرات الأداء" },
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
        { id: "requests", nameAr: "الطلبات", icon: Zap, perms: ["view", "create", "edit", "delete", "approve", "follow_up"] },
        { id: "appointments", nameAr: "تقويم المواعيد", icon: Calendar, perms: ["view_all", "view_own"] },
        { id: "projects", nameAr: "المشاريع", icon: LayoutGrid, perms: ["view", "create", "edit", "delete", "export"] },
      ]
    },
    {
      title: "المالية والعقود",
      modules: [
        { id: "suppliers", nameAr: "الموردون", icon: Users, perms: ["view", "view_details", "add", "approve"] },
        { id: "quotations", nameAr: "عروض الأسعار", icon: Receipt, perms: ["view", "add", "edit", "delete", "approve"] },
        { id: "financial_approval", nameAr: "الاعتماد المالي", icon: CheckSquare, perms: ["view", "approve"] },
        { id: "contracts", nameAr: "العقود", icon: FileSignature, perms: ["view", "create", "edit", "delete", "sign"] },
        { id: "disbursements", nameAr: "طلبات الصرف", icon: Wallet, perms: ["view", "add", "edit", "delete", "approve"] },
        { id: "disbursement_orders", nameAr: "أوامر الصرف", icon: Banknote, perms: ["view", "create", "execute", "cancel"] },
        { id: "progress_reports", nameAr: "تقارير الإنجاز", icon: ClipboardCheck, perms: ["view", "add", "edit", "approve"] },
        { id: "financial_reports", nameAr: "التقرير المالي", icon: FileBarChart, perms: ["view", "export", "analytics"] },
      ]
    },
    {
      title: "إدارة المستخدمين",
      modules: [
        { id: "staff", nameAr: "إدارة المستخدمين", icon: Briefcase, perms: ["view", "add", "edit", "delete", "manage_users"] }
      ]
    },
    {
      title: "الإعدادات",
      modules: [
        { id: "settings", nameAr: "مركز الإعدادات", icon: Settings, perms: ["view", "add", "edit", "delete"] },
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
        { id: "requests", nameAr: "الطلبات", icon: Zap, perms: ["view", "create", "edit", "delete", "approve", "follow_up"] },
        { id: "appointments", nameAr: "تقويم المواعيد", icon: Calendar, perms: ["view_all", "view_own"] },
        { id: "projects", nameAr: "المشاريع", icon: LayoutGrid, perms: ["view", "create", "edit", "delete", "export"] },
        { id: "requesters", nameAr: "حسابات طالبي الخدمة", icon: Users, perms: ["view", "approve"] },
      ]
    },
    {
      title: "المالية والعقود",
      modules: [
        { id: "suppliers", nameAr: "الموردون", icon: Users, perms: ["view", "view_details", "add", "approve"] },
        { id: "quotations", nameAr: "عروض الأسعار", icon: Receipt, perms: ["view", "add", "edit", "delete", "approve"] },
        { id: "financial_approval", nameAr: "الاعتماد المالي", icon: CheckSquare, perms: ["view", "approve"] },
        { id: "contracts", nameAr: "العقود", icon: FileSignature, perms: ["view", "create", "edit", "delete", "sign"] },
        { id: "disbursements", nameAr: "طلبات الصرف", icon: Wallet, perms: ["view", "add", "edit", "delete", "approve"] },
        { id: "disbursement_orders", nameAr: "أوامر الصرف", icon: Banknote, perms: ["view", "create", "execute", "cancel"] },
        { id: "progress_reports", nameAr: "تقارير الإنجاز", icon: ClipboardCheck, perms: ["view", "add", "edit", "approve"] },
        { id: "financial_reports", nameAr: "التقرير المالي", icon: FileBarChart, perms: ["view", "export", "analytics"] },
      ]
    },
    {
      title: "إدارة المستخدمين",
      modules: [
        { id: "staff", nameAr: "إدارة المستخدمين", icon: Briefcase, perms: ["view", "add", "edit", "delete", "manage_users", "manage_custom_roles"] }
      ]
    },
    {
      title: "الإعدادات",
      modules: [
        { id: "settings", nameAr: "مركز الإعدادات", icon: Settings, perms: ["view", "add", "edit", "delete"] },
        { id: "services", nameAr: "البرامج والخدمات", icon: LayoutGrid, perms: ["view", "add", "edit", "delete"] },
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
        view: "عرض قائمة الطلبات",
        create: "إنشاء طلب جديد",
        add: "إنشاء طلب جديد",
        edit: "تعديل بيانات الطلب",
        update: "تعديل بيانات الطلب",
        delete: "حذف الطلب",
        approve: "اعتماد الطلب",
        follow_up: "متابعة حالة الطلبات"
      },
      projects: {
        view: "عرض سجل المشاريع",
        create: "إضافة مشروع جديد",
        add: "إضافة مشروع جديد",
        edit: "تعديل بيانات المشروع",
        update: "تعديل بيانات المشروع",
        delete: "حذف مشروع",
        export: "تصدير سجل المشاريع"
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
        edit: "تعديل بيانات مورد",
        delete: "حذف مورد"
      },
      quotations: {
        view: "عرض عروض الأسعار",
        add: "إضافة عرض سعر",
        edit: "تعديل عرض سعر",
        delete: "حذف عرض سعر",
        approve: "اعتماد عروض الأسعار"
      },
      financial_approval: {
        view: "مقارنة عروض الاسعار من دون اعتماد",
        approve: "الاعتماد المالي لعرض السعر"
      },
      contracts: {
        view: "عرض سجل العقود",
        create: "إنشاء عقد جديد",
        edit: "تعديل بيانات العقد",
        delete: "حذف عقد",
        sign: "توقيع العقد"
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
        create: "إنشاء أمر صرف",
        execute: "تنفيذ أمر الصرف",
        cancel: "إلغاء أمر الصرف"
      },
      progress_reports: {
        view: "عرض تقارير الإنجاز",
        add: "إضافة تقرير إنجاز",
        edit: "تعديل التقرير",
        approve: "اعتماد التقارير"
      },
      financial_reports: {
        view: "عرض التقارير المالية",
        export: "تصدير البيانات المالية",
        analytics: "تحليل مؤشرات الأداء"
      },
      staff: {
        view: "عرض الكادر الإداري",
        add: "إضافة موظف جديد",
        edit: "تعديل بيانات موظف",
        delete: "حذف موظف",
        manage_users: "إدارة المستخدمين",
        manage_custom_roles: "إدارة الأدوار المخصصة"
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
      settings: {
        view: "عرض الإعدادات العامة",
        add: "إضافة إعداد جديد",
        edit: "تعديل الإعدادات",
        delete: "حذف إعداد"
      },
      services: {
        view: "عرض البرامج",
        add: "إضافة برنامج جديد",
        edit: "تعديل بيانات البرنامج",
        delete: "حذف البرامج"
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
    modules: group.modules.map(m => ({
      id: m.id,
      nameAr: m.nameAr,
      icon: m.icon,
      permissions: m.perms.map(p => ({
        id: `${m.id}.${p}`,
        nameAr: getDescriptiveLabel(m.id, p),
      }))
    }))
  }));

  const finalDisplayGroups = universalDisplayGroups;

  // منطق التحقق من الصلاحية
  const isPermissionGranted = (permId: string) => {
    if (isSuperAdmin) return true;
    return selectedPerms.includes(permId);
  };

  return (
    <DashboardLayout>
      <div className="container py-8 max-w-7xl mx-auto" dir="rtl">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-10">
          <div className="flex items-center gap-4 text-right">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => setLocation("/staff")} 
              className="rounded-full hover:bg-slate-100 transition-colors shrink-0"
            >
              <ArrowRight className="h-6 w-6" />
            </Button>
            <div className="p-3.5 bg-primary/10 rounded-2xl shrink-0">
              <Shield className="h-8 w-8 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">صلاحيات الدور</h1>
              <p className="text-muted-foreground font-medium text-lg">{role.nameAr}</p>
            </div>
          </div>

          {!isSuperAdmin && (
            <div className="flex justify-end items-center gap-3">
              {hasChanges && (
                <span className="text-xs text-amber-600 dark:text-amber-400 font-bold animate-pulse">
                  توجد تغييرات غير محفوظة *
                </span>
              )}
              <Button
                onClick={handleSaveChanges}
                disabled={updateRoleMutation.isPending || !hasChanges}
                className={`px-6 font-bold rounded-xl shadow-md h-11 transition-all ${
                  hasChanges 
                    ? "gradient-primary text-white scale-105 hover:scale-108" 
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
                
                <div className={`grid gap-8 ${isQuickResponse ? "grid-cols-1 max-w-2xl mx-auto" : "grid-cols-1 md:grid-cols-2"}`}>
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
                      ? modulePerms 
                      : modulePerms.filter((p: any) => selectedPerms.includes(p.id));
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
                              {!isSuperAdmin && modulePerms.length > 0 && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleToggleModuleAll(modulePerms);
                                  }}
                                  className="text-xs text-muted-foreground hover:text-primary hover:bg-primary/5 rounded-lg font-bold"
                                >
                                  {modulePerms.every((p: any) => selectedPerms.includes(p.id)) ? "إلغاء تحديد الكل" : "تحديد الكل"}
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
                            {modulePerms.map((perm: any) => {
                              const isChecked = isPermissionGranted(perm.id);
                               const isDisabled = 
                                 (perm.id.startsWith("mosques.") && perm.id !== "mosques.view" && !selectedPerms.includes("mosques.view")) ||
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
                                    <span className="text-xs font-bold leading-none">
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
