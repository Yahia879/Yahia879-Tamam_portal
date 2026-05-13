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
  Briefcase
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
  const isSuperAdmin = roleId === "super_admin" || roleId === "system_admin";

  // مصفوفة الصلاحيات المخصصة لـ الاتصال المؤسسي
  const corporateCommModules = [
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
        { id: "reports.export", nameAr: "تصدير التقارير" },
        { id: "reports.print", nameAr: "طباعة التقارير" },
      ]
    },
    {
      id: "partners",
      nameAr: "الشركاء",
      icon: Handshake,
      permissions: [
        { id: "partners.view", nameAr: "عرض الشركاء" },
        { id: "partners.add", nameAr: "إضافة شريك جديد" },
        { id: "partners.edit", nameAr: "تعديل بيانات شريك" },
        { id: "partners.delete", nameAr: "حذف شريك" },
        { id: "partners.reports", nameAr: "عرض تقارير الشركاء" },
        { id: "partners.agreements", nameAr: "إدارة الاتفاقيات" },
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
  const fieldTeamModules = [
    {
      id: "field_visits",
      nameAr: "الزيارات الميدانية",
      icon: MapPin,
      permissions: [
        { id: "field_visits.view", nameAr: "عرض الزيارات الميدانية" },
        { id: "field_visits.create", nameAr: "إنشاء زيارة ميدانية" },
        { id: "field_visits.edit", nameAr: "تعديل بيانات الزيارة" },
        { id: "field_visits.report", nameAr: "رفع التقارير الفنية" },
      ]
    },
    {
      id: "appointments",
      nameAr: "تقويم المواعيد",
      icon: CalendarDays,
      permissions: [
        { id: "appointments.view", nameAr: "عرض تقويم المواعيد" },
        { id: "appointments.add", nameAr: "إضافة موعد جديد" },
        { id: "appointments.edit", nameAr: "تعديل موعد" },
        { id: "appointments.delete", nameAr: "حذف موعد" },
      ]
    },
    {
      id: "my_requests",
      nameAr: "طلباتي",
      icon: ClipboardList,
      permissions: [
        { id: "my_requests.view", nameAr: "عرض طلباتي" },
        { id: "my_requests.create", nameAr: "إنشاء طلب جديد" },
        { id: "my_requests.track", nameAr: "متابعة حالة الطلب" },
      ]
    }
  ];

  // مصفوفة الصلاحيات المخصصة لـ الإدارة المالية
  const financeModules = [
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
  ];

  // مصفوفة الصلاحيات المخصصة لـ مكتب المشاريع
  const projectsOfficeModules = [
    {
      id: "projects",
      nameAr: "المشاريع",
      icon: LayoutGrid,
      permissions: [
        { id: "projects.view", nameAr: "عرض المشاريع" },
        { id: "projects.create", nameAr: "إنشاء مشروع جديد" },
        { id: "projects.edit", nameAr: "تعديل بيانات المشروع" },
        { id: "projects.delete", nameAr: "حذف مشروع" },
        { id: "projects.export", nameAr: "تصدير بيانات المشاريع" },
      ]
    },
    {
      id: "reports",
      nameAr: "التقارير",
      icon: FileBarChart,
      permissions: [
        { id: "reports.view", nameAr: "عرض التقارير" },
        { id: "reports.add", nameAr: "إضافة تقارير جديدة" },
        { id: "reports.edit", nameAr: "تعديل التقارير" },
        { id: "reports.delete", nameAr: "حذف التقارير" },
        { id: "reports.export", nameAr: "تصدير التقارير" },
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

  // هيكل الصلاحيات الكامل لـ المدير العام (Categorized)
  const superAdminGroups = [
    {
      title: "العمليات (Operations)",
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
      title: "المالية والعقود (Finance & Contracts)",
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
      title: "الإدارة (Administration)",
      isHighlighted: true,
      modules: [
        { id: "staff", nameAr: "إدارة الكادر", icon: Briefcase, perms: ["view", "add", "edit", "delete", "manage_roles", "audit"] },
        { id: "settings", nameAr: "مركز الإعدادات", icon: Settings, perms: ["view", "edit_branding", "edit_organization", "edit_stages"] },
        { id: "services", nameAr: "البرامج والخدمات", icon: LayoutGrid, perms: ["view", "add", "edit", "delete"] },
      ]
    }
  ];

  // تحويل الهيكل المصنف لمدير النظام إلى مصفوفة مستوية للعرض المتوافق مع الكود الحالي
  const superAdminModulesFlat = superAdminGroups.flatMap(group => 
    group.modules.map(m => ({
      id: m.id,
      nameAr: m.nameAr,
      icon: m.icon,
      isHighlightedGroup: group.isHighlighted,
      groupTitle: group.title,
      permissions: m.perms.map(p => ({
        id: `${m.id}.${p}`,
        nameAr: p === "view" ? "عرض" : p === "create" || p === "add" ? "إضافة" : p === "edit" || p === "update" ? "تعديل" : p === "delete" ? "حذف" : p === "approve" ? "اعتماد" : p === "export" ? "تصدير" : p === "print" ? "طباعة" : p === "follow_up" ? "متابعة" : p === "suspend" ? "تعليق" : p === "sign" ? "توقيع" : p === "execute" ? "تنفيذ" : p === "cancel" ? "إلغاء" : p === "analytics" ? "تحليلات" : p === "manage_roles" ? "إدارة الأدوار" : p === "audit" ? "سجل التدقيق" : p,
      }))
    }))
  );

  // تحديد البيانات المراد عرضها
  const displayStructure = isCorporateComm 
    ? corporateCommModules 
    : isFieldTeam
    ? fieldTeamModules
    : isFinance
    ? financeModules
    : isProjectsOffice
    ? projectsOfficeModules
    : isQuickResponse
    ? quickResponseModules
    : isSuperAdmin
    ? superAdminModulesFlat
    : structure?.map(m => ({
        id: m.id,
        nameAr: m.nameAr,
        icon: Shield, // أيقونة افتراضية
        permissions: m.permissions.map(p => ({ id: p.id, nameAr: p.nameAr, description: p.description }))
      }));

  // منطق التحقق من الصلاحية
  const isPermissionGranted = (permId: string, moduleId: string) => {
    if (isCorporateComm || isFieldTeam || isFinance || isProjectsOffice || isQuickResponse || isSuperAdmin) return true;
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

        {(isCorporateComm || isFieldTeam || isFinance || isProjectsOffice || isQuickResponse || isSuperAdmin) && (
          <div className="border rounded-2xl p-5 mb-10 flex items-start gap-4 shadow-sm bg-primary/5 border-primary/10">
            <div className="p-2 rounded-lg bg-primary/10">
              <CheckCircle2 className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="font-semibold mb-1">{isSuperAdmin ? "صلاحيات الوصول المطلق (Master Access)" : "تم ضبط النطاق المهني النهائي"}</p>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {isCorporateComm 
                  ? "تم تحديد الوحدات الأساسية لقسم الاتصال المؤسسي مع منح كامل الصلاحيات لضمان الفعالية في إدارة الشركاء والهوية البصرية والتقارير."
                  : isFieldTeam
                  ? "تم تحديد الوحدات الأساسية للفريق الميداني مع منح الصلاحيات التشغيلية اللازمة لإدارة الزيارات والمواعيد ومتابعة الطلبات."
                  : isFinance
                  ? "تم تحديد الوحدات المالية الشاملة للإدارة المالية مع منح كامل صلاحيات المراجعة والاعتماد والتنفيذ المالي لضمان الانضباط والموثوقية."
                  : isProjectsOffice
                  ? "تم تحديد الوحدات الأساسية لمكتب المشاريع مع منح كامل الصلاحيات التشغيلية لإدارة دورة حياة المشاريع وتحليل الأداء العام."
                  : isQuickResponse
                  ? "تم تحديد وحدة الطلبات كمركز ثقل لعمل فريق الاستجابة السريعة، مع منح كامل الصلاحيات التشغيلية لضمان سرعة المعالجة والمتابعة."
                  : "يتمتع هذا الدور بصلاحيات كاملة وشاملة عبر كافة الأنظمة التشغيلية والمالية والإدارية، بما في ذلك التحكم المطلق في إعدادات النظام وإدارة الكادر."}
              </p>
            </div>
          </div>
        )}

        {/* Standard Grid for all roles */}
        <div className={`grid gap-8 ${isQuickResponse ? "grid-cols-1 max-w-2xl mx-auto" : "grid-cols-1 md:grid-cols-2"}`}>
          {displayStructure && displayStructure.length > 0 ? (
            displayStructure.map((module) => {
              const Icon = module.icon;
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
                    <div className="grid grid-cols-1 gap-3">
                      {modulePerms.map((perm) => (
                        <div 
                          key={perm.id} 
                          className="flex items-center justify-between p-3.5 rounded-xl border border-green-100 bg-green-50/40 dark:bg-green-900/10 dark:border-green-900/20 transition-all hover:bg-green-50/60"
                        >
                          <div className="flex flex-col">
                            <span className="text-sm font-bold text-green-900 dark:text-green-400">
                              {perm.nameAr}
                            </span>
                            {(perm as any).description && (
                              <span className="text-xs text-muted-foreground mt-0.5">{(perm as any).description}</span>
                            )}
                          </div>
                          <div className="p-1 bg-green-100 dark:bg-green-900/30 rounded-full">
                            <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400 shrink-0" />
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              );
            })
          ) : (
            <div className="col-span-full py-20 text-center">
              <Shield className="h-16 w-16 text-muted-foreground/20 mx-auto mb-4" />
              <p className="text-muted-foreground text-lg">لا توجد وحدات متاحة للعرض حالياً.</p>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
