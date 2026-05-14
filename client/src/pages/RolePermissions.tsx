import { useRoute, useLocation } from "wouter";
import { trpc } from "../lib/trpc";
import { Button } from "../components/ui/button";
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

  const { data: roles, isLoading: rolesLoading } = trpc.permissions.getRoles.useQuery();
  const { data: rolePermissions, isLoading: permsLoading } = trpc.permissions.getRolePermissions.useQuery(
    { roleId: roleId || "" },
    { enabled: !!roleId }
  );
  const { data: structure, isLoading: structureLoading } = trpc.permissions.getStructure.useQuery();

  const role = roles?.find((r) => r.id === roleId);
  const isLoading = rolesLoading || permsLoading || structureLoading;

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
            { id: "financial_approval.view", nameAr: "عرض طلبات الاعتماد" },
            { id: "financial_approval.approve", nameAr: "منح الاعتماد المالي" },
            { id: "financial_approval.reject", nameAr: "رفض الاعتماد المالي" },
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
            { id: "financial_approval.view", nameAr: "عرض طلبات الاعتماد" },
            { id: "financial_approval.approve", nameAr: "منح الاعتماد المالي" },
            { id: "financial_approval.reject", nameAr: "رفض الاعتماد المالي" },
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
        { id: "appointments", nameAr: "تقويم المواعيد", icon: Calendar, perms: ["view", "add", "edit", "delete"] },
        { id: "projects", nameAr: "المشاريع", icon: LayoutGrid, perms: ["view", "create", "edit", "delete", "export"] },
      ]
    },
    {
      title: "المالية والعقود",
      modules: [
        { id: "suppliers", nameAr: "الموردون", icon: Users, perms: ["view", "add", "edit", "delete", "approve"] },
        { id: "quotations", nameAr: "عروض الأسعار", icon: Receipt, perms: ["view", "add", "edit", "delete", "approve"] },
        { id: "financial_approval", nameAr: "الاعتماد المالي", icon: CheckSquare, perms: ["view", "approve", "reject"] },
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
        { id: "appointments", nameAr: "تقويم المواعيد", icon: Calendar, perms: ["view", "add", "edit", "delete"] },
        { id: "projects", nameAr: "المشاريع", icon: LayoutGrid, perms: ["view", "create", "edit", "delete", "export"] },
        { id: "requesters", nameAr: "حسابات طالبي الخدمة", icon: Users, perms: ["view", "edit", "delete", "suspend"] },
      ]
    },
    {
      title: "المالية والعقود",
      modules: [
        { id: "suppliers", nameAr: "الموردون", icon: Users, perms: ["view", "add", "edit", "delete", "approve"] },
        { id: "quotations", nameAr: "عروض الأسعار", icon: Receipt, perms: ["view", "add", "edit", "delete", "approve"] },
        { id: "financial_approval", nameAr: "الاعتماد المالي", icon: CheckSquare, perms: ["view", "approve", "reject"] },
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
        view: "عرض قائمة المساجد",
        create: "إضافة مسجد جديد",
        add: "إضافة مسجد جديد",
        edit: "تعديل بيانات مسجد",
        update: "تعديل بيانات مسجد",
        delete: "حذف مسجد",
        approve: "اعتماد المساجد المضافة"
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
        view: "عرض بيانات المستخدمين",
        edit: "تعديل بيانات الحساب",
        delete: "حذف الحساب",
        suspend: "تعليق حساب مستخدم"
      },
      suppliers: {
        view: "عرض قائمة الموردين",
        add: "إضافة مورد جديد",
        edit: "تعديل بيانات مورد",
        delete: "حذف مورد",
        approve: "اعتماد الموردين"
      },
      quotations: {
        view: "عرض عروض الأسعار",
        add: "إضافة عرض سعر",
        edit: "تعديل عرض سعر",
        delete: "حذف عرض سعر",
        approve: "اعتماد عروض الأسعار"
      },
      financial_approval: {
        view: "عرض طلبات الاعتماد",
        approve: "منح الاعتماد المالي",
        reject: "مقارنة عروض الأسعار"
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

  // بناء displayGroups للأدوار المخصصة: تصفية الأقسام بحسب الصلاحيات المخزنة
  // استخراج الصلاحيات المخزنة في حقل الوصف للأدوار المخصصة
  let customPermissionIds: string[] = [];
  if (isCustomRole && role.description) {
    try {
      const parsed = JSON.parse(role.description);
      if (Array.isArray(parsed)) {
        customPermissionIds = parsed;
      }
    } catch {
      customPermissionIds = [];
    }
  }

  // بناء displayGroups للأدوار المخصصة: تصفية الأقسام بحسب الصلاحيات المخزنة
  const customRoleGroups = isCustomRole ? customRoleStructure
    .map(section => {
      const grantedSubs = section.subsections.filter(sub => customPermissionIds.includes(sub.id));
      if (grantedSubs.length === 0) return null;
      return {
        title: section.title,
        modules: grantedSubs.map(sub => ({
          id: sub.id,
          nameAr: sub.nameAr,
          icon: Shield,
          permissions: [{ id: sub.id, nameAr: sub.nameAr }]
        }))
      };
    })
    .filter(Boolean) as { title: string; modules: any[] }[]
  : [];

  const isSystemAdmin = roleId === "system_admin";

  // تحديد المجموعات المراد عرضها بناءً على الدور
  const displayGroups = isCustomRole
    ? customRoleGroups
    : isSystemAdmin
    ? systemAdminGroups.map(group => ({
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
      }))
    : isSuperAdmin 
    ? superAdminGroups.map(group => ({
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
      }))
    : isCorporateComm
    ? corporateCommGroups
    : [
        {
          title: isQuickResponse
            ? "المساجد والطلبات"
            : "",
          modules: isQuickResponse
            ? quickResponseModules
            : structure?.map(m => ({
                id: m.id,
                nameAr: m.nameAr,
                icon: Shield,
                permissions: m.permissions.map(p => ({ id: p.id, nameAr: p.nameAr, description: p.description }))
              })) || []
        }
      ];

  // Adjust displayGroups for roles with group-based structure
  const finalDisplayGroups = isProjectsOffice
    ? projectsOfficeGroups
    : isProjectManager
    ? projectManagerGroups
    : isFinance
    ? financeGroups
    : isFieldTeam
    ? fieldTeamGroups
    : displayGroups;

  // منطق التحقق من الصلاحية
  const isPermissionGranted = (permId: string, moduleId: string) => {
    if (isCustomRole || isCorporateComm || isFieldTeam || isFinance || isProjectsOffice || isQuickResponse || isSuperAdmin || isSystemAdmin || isProjectManager) return true;
    return rolePermissions?.includes(permId);
  };

  return (
    <DashboardLayout>
      <div className="container py-8 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-10">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => setLocation("/staff")} 
              className="rounded-full hover:bg-slate-100 transition-colors"
            >
              <ArrowRight className="h-6 w-6" />
            </Button>
            <div className="p-3.5 bg-primary/10 rounded-2xl">
              <Shield className="h-8 w-8 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">صلاحيات الدور</h1>
              <p className="text-muted-foreground font-medium text-lg">{role.nameAr}</p>
            </div>
          </div>
        </div>

        {(isCustomRole || isCorporateComm || isFieldTeam || isFinance || isProjectsOffice || isQuickResponse || isSuperAdmin || isProjectManager) && (
          <div className="border rounded-2xl p-5 mb-10 flex items-start gap-4 shadow-sm bg-primary/5 border-primary/10">
            <div className="p-2 rounded-lg bg-primary/10">
              <CheckCircle2 className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="font-semibold mb-1">{isSuperAdmin ? "صلاحيات الوصول المطلق" : isCustomRole ? `الصلاحيات المخصصة لدور: ${role.nameAr}` : "تم ضبط النطاق المهني النهائي"}</p>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {isCustomRole
                  ? "يعرض هذا القسم الأقسام والوحدات التي تم منح هذا الدور المخصص صلاحية الوصول إليها فقط."
                  : isCorporateComm 
                  ? "تم تحديد الوحدات الأساسية لقسم الاتصال المؤسسي مع منح كامل الصلاحيات لضمان الفعالية في إدارة الشركاء والهوية البصرية والتقارير."
                  : isFieldTeam
                  ? "تم تحديد الوحدات التشغيلية للفريق الميداني للتركيز على إدارة المساجد ومعالجة الطلبات الميدانية وتوثيق الإنجاز."
                  : isFinance
                  ? "تم تحديد الوحدات المالية الشاملة للإدارة المالية مع منح كامل صلاحيات المراجعة والاعتماد والتنفيذ المالي لضمان الانضباط والموثوقية."
                  : isProjectsOffice
                  ? "تم تحديد الوحدات الأساسية لمكتب المشاريع مع منح كامل الصلاحيات التشغيلية لإدارة دورة حياة المشاريع وتحليل الأداء العام."
                  : isQuickResponse
                  ? "تم تحديد وحدة الطلبات كمركز ثقل لعمل فريق الاستجابة السريعة، مع منح كامل الصلاحيات التشغيلية لضمان سرعة المعالجة والمتابعة."
                  : isProjectManager
                  ? "تم تحديد النطاق العملي لمدير المشاريع للتركيز حصرياً على إدارة المشاريع ومتابعة تقارير الإنجاز لضمان كفاءة التنفيذ."
                  : "يتمتع هذا الدور بصلاحيات كاملة وشاملة عبر كافة الأنظمة التشغيلية والمالية والإدارية، بما في ذلك التحكم المطلق في إعدادات النظام وإدارة المستخدمين."}
              </p>
            </div>
          </div>
        )}

        {/* Grouped Rendering */}
        <div className="space-y-12">
          {finalDisplayGroups && finalDisplayGroups.length > 0 ? (
            finalDisplayGroups.map((group, groupIdx) => (
              <div key={groupIdx} className="space-y-6">
                {group.title && (
                  <div className="flex items-center gap-3 px-2">
                    <div className="w-1.5 h-8 rounded-full bg-primary" />
                    <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">{group.title}</h2>
                  </div>
                )}
                
                <div className={`grid gap-8 ${isQuickResponse ? "grid-cols-1 max-w-2xl mx-auto" : "grid-cols-1 md:grid-cols-2"}`}>
                  {group.modules.map((module) => {
                    const Icon = (module as any).icon || Shield;
                    const modulePerms = module.permissions || [];
                    const grantedCount = modulePerms.length; 

                    return (
                      <Card key={module.id} className="overflow-hidden border-slate-200/60 dark:border-slate-800 shadow-lg shadow-slate-200/20 dark:shadow-none rounded-2xl transition-all hover:shadow-xl hover:shadow-slate-200/40">
                        <CardHeader className="bg-slate-50/80 dark:bg-slate-900/80 border-b border-slate-100 dark:border-slate-800 px-6 py-5">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                              <div className="p-2.5 bg-white dark:bg-slate-800 rounded-xl shadow-sm">
                                <Icon className="h-5 w-5 text-primary" />
                              </div>
                              <CardTitle className="text-xl font-bold">{module.nameAr}</CardTitle>
                            </div>
                            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 text-primary rounded-xl font-bold text-sm">
                              <span>{grantedCount}</span>
                              <span className="opacity-50">/</span>
                              <span>{modulePerms.length}</span>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent className="p-6">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {modulePerms.map((perm) => (
                              <div 
                                key={perm.id} 
                                className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl border border-green-100 bg-green-50/40 dark:bg-green-900/10 dark:border-green-900/20 transition-all hover:bg-green-50/60"
                              >
                                <div className="p-1 bg-green-100 dark:bg-green-900/30 rounded-full shrink-0">
                                  <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
                                </div>
                                <div className="flex flex-col min-w-0">
                                  <span className="text-xs font-bold text-green-900 dark:text-green-400">
                                    {perm.nameAr}
                                  </span>
                                </div>
                              </div>
                            ))}
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
