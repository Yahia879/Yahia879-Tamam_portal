import { useRoute, useLocation } from "wouter";
import { trpc } from "../lib/trpc";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Shield, ArrowRight, CheckCircle2, XCircle, User, LayoutGrid, Award, FileCheck } from "lucide-react";
import DashboardLayout from "../components/DashboardLayout";

/**
 * منطق تصفية الوحدات (Modules) بناءً على النطاق الوظيفي للدور
 * يهدف هذا الفلتر إلى عرض الوحدات ذات الصلة بكل إدارة فقط لتبسيط عملية المراجعة
 */
const getVisibleModules = (role: string) => {
  switch (role) {
    case "project_manager":
      // مدير المشاريع: المساجد، الطلبات، المشاريع، المالية، العقود، والتقارير
      return ["mosques", "requests", "projects", "financial", "contracts", "reports"];

    case "financial_manager":
    case "financial":
      // الإدارة المالية: المالية، الصرف، العقود، الطلبات، والتقارير
      return ["financial", "disbursements", "contracts", "requests", "reports"];

    case "projects_office":
      // مكتب المشاريع: المساجد، الطلبات، المشاريع، العقود، التقارير، والزيارات الميدانية
      return ["mosques", "requests", "projects", "contracts", "reports", "field_visits"];

    case "field_team":
    case "quick_response":
      // الفريق الميداني / الاستجابة السريعة: المساجد، الزيارات الميدانية، التقارير، والطلبات
      return ["mosques", "field_visits", "reports", "requests"];

    case "corporate_comm":
      // الاتصال المؤسسي: المساجد، الطلبات، والتقارير
      return ["mosques", "requests", "reports"];

    case "super_admin":
    case "system_admin":
      // المدير العام ومدير النظام: رؤية كاملة لكافة موديولات النظام
      return null;

    default:
      // الأدوار الأخرى ترى نطاقاً محدوداً افتراضياً
      return ["mosques", "requests"];
  }
};

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

  // جلب بيانات المستخدم الأساسية
  const { data: userData, isLoading: userDataLoading } = trpc.users.getById.useQuery(
    { id: userId! },
    { enabled: !!userId }
  );

  // جلب الصلاحيات النهائية (المدمجة) الممنوحة فعلياً للمستخدم
  const { data: finalPermissions, isLoading: finalPermissionsLoading } = trpc.permissions.getUserPermissions.useQuery(
    { userId: userId! },
    { enabled: !!userId }
  );

  // جلب الهيكل الهرمي للوحدات والصلاحيات المتوفرة في النظام
  const { data: structure, isLoading: structureLoading } = trpc.permissions.getStructure.useQuery();

  const isLoading = userDataLoading || finalPermissionsLoading || structureLoading;

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
          <p className="text-muted-foreground font-medium animate-pulse text-lg">جاري استخراج "ملف الصلاحيات الموثق"...</p>
        </div>
      </DashboardLayout>
    );
  }

  const userRole = userData?.role || "";
  const visibleModuleIds = getVisibleModules(userRole);
  
  // تصفية هيكل الصلاحيات بناءً على النطاق الوظيفي المعتمد لهذا الدور
  const filteredStructure = structure?.filter(module => {
    if (visibleModuleIds === null) return true; // عرض الكل للمسؤولين
    return visibleModuleIds.includes(module.id);
  });

  return (
    <DashboardLayout>
      <div className="container py-8 max-w-5xl mx-auto">
        {/* Header - Verified Profile UI */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12 pb-8 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-5">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => setLocation("/users")} 
              className="rounded-full h-11 w-11 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <ArrowRight className="h-6 w-6" />
            </Button>
            <div className="p-3.5 bg-primary/10 rounded-2xl shadow-inner ring-1 ring-primary/5">
              <Shield className="h-8 w-8 text-primary" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">ملف الصلاحيات الموثق</h1>
                <FileCheck className="w-6 h-6 text-emerald-500" />
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5 px-2.5 py-0.5 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-800 rounded-lg text-[10px] font-bold uppercase tracking-widest">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  حالة معتمدة
                </div>
                <span className="text-slate-500 dark:text-slate-400 text-sm font-semibold flex items-center gap-1.5">
                  <User className="w-4 h-4" />
                  {userData?.name}
                </span>
              </div>
            </div>
          </div>
          
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl px-6 py-4 shadow-sm flex items-center gap-5 min-w-[280px]">
            <div className="p-3 rounded-xl bg-primary/5 text-primary border border-primary/10">
              <Award className="w-6 h-6" />
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] text-slate-400 uppercase font-black tracking-tighter mb-0.5">المسمى الوظيفي المعتمد</span>
              <span className="font-extrabold text-slate-800 dark:text-slate-100 text-lg leading-none">{getRoleLabelAr(userRole)}</span>
            </div>
          </div>
        </div>

        {/* Permissions Content Grid */}
        <div className="space-y-10">
          {filteredStructure && filteredStructure.length > 0 ? (
            filteredStructure.map((module) => (
              <section key={module.id} className="space-y-5">
                <div className="flex items-center gap-4 px-2">
                  <div className="w-2 h-8 bg-primary rounded-full shadow-[0_0_12px_rgba(var(--primary),0.3)]" />
                  <h3 className="font-black text-2xl text-slate-800 dark:text-slate-100 tracking-tight">{module.nameAr}</h3>
                  <Badge variant="outline" className="text-[10px] font-bold text-slate-400 border-slate-200 dark:border-slate-800 px-3 py-0.5 rounded-full uppercase">
                    نطاق الوصول المعتمد
                  </Badge>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {module.permissions.map((permission) => {
                    // الصلاحية ممنوحة إذا كانت في القائمة النهائية أو إذا كان المستخدم مدير عام
                    const isGranted = finalPermissions?.includes(permission.id) || userRole === 'super_admin';

                    return (
                      <div
                        key={permission.id}
                        className={`group relative flex items-center justify-between p-5 rounded-2xl border transition-all duration-300 ${
                          isGranted 
                            ? 'bg-white dark:bg-slate-900 border-emerald-100 dark:border-emerald-900/30 shadow-md ring-1 ring-emerald-50 dark:ring-emerald-900/10' 
                            : 'bg-slate-50/50 dark:bg-slate-950/20 border-slate-100 dark:border-slate-900 opacity-50 grayscale-[0.4]'
                        }`}
                      >
                        <div className="flex flex-col gap-1">
                          <span className={`text-sm font-black tracking-tight ${isGranted ? 'text-slate-900 dark:text-white' : 'text-slate-500'}`}>
                            {permission.nameAr}
                          </span>
                          <span className="text-[9px] text-slate-400 font-mono tracking-tighter opacity-0 group-hover:opacity-100 transition-opacity">
                            ID: {permission.id.toUpperCase()}
                          </span>
                        </div>
                        
                        <div className="transition-transform group-hover:scale-110 duration-300">
                          {isGranted ? (
                            <div className="flex items-center justify-center w-9 h-9 rounded-full bg-emerald-500 text-white shadow-lg shadow-emerald-200 dark:shadow-none ring-4 ring-emerald-50 dark:ring-emerald-900/20">
                              <CheckCircle2 className="h-5 w-5" />
                            </div>
                          ) : (
                            <div className="flex items-center justify-center w-9 h-9 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-400 border border-slate-300/30 dark:border-slate-700/50">
                              <XCircle className="h-5 w-5" />
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            ))
          ) : (
            <div className="text-center py-24 bg-white dark:bg-slate-900 rounded-[2.5rem] border-2 border-dashed border-slate-200 dark:border-slate-800 shadow-inner">
              <div className="w-20 h-20 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-6 border">
                <Shield className="h-10 w-10 text-slate-300" />
              </div>
              <h3 className="text-2xl font-black text-slate-800 dark:text-slate-100">لا يوجد نطاق متاح حالياً</h3>
              <p className="text-slate-500 dark:text-slate-400 mt-3 max-w-md mx-auto font-medium leading-relaxed">
                لم يتم العثور على وحدات برمجية مسندة لهذا النطاق الوظيفي في قاعدة بيانات الصلاحيات المعتمدة للمنصة.
              </p>
              <Button variant="outline" className="mt-8 font-bold rounded-xl border-2 px-6" onClick={() => setLocation("/users")}>
                العودة لقائمة الموظفين
              </Button>
            </div>
          )}
        </div>

        {/* Footer Audit Stamp */}
        <div className="mt-20 pt-10 border-t border-slate-200 dark:border-slate-800 border-dashed flex flex-col items-center">
          <div className="flex items-center gap-2.5 py-2 px-5 bg-slate-50 dark:bg-slate-900 rounded-full border border-slate-100 dark:border-slate-800 shadow-sm mb-4">
            <Shield className="w-4 h-4 text-primary" />
            <span className="text-xs font-black text-slate-600 dark:text-slate-400 tracking-tight uppercase italic">Digital Verification Stamp - Tamam Portal</span>
          </div>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em] text-center leading-relaxed">
            تمت المطابقة والتدقيق في: {new Date().toLocaleString("ar-SA", { dateStyle: "full", timeStyle: "medium" })}
            <br />
            المستند صادر آلياً ولا يتطلب توقيعاً
          </p>
        </div>
      </div>
    </DashboardLayout>
  );
}
