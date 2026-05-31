import { useState, lazy, Suspense, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Users, Shield, Briefcase, Loader2, ArrowRight } from "lucide-react";
import { Link } from "wouter";
import { usePermission } from "@/hooks/usePermission";
import { PermissionGuard } from "@/components/PermissionGuard";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";

// استخدام الاستدعاء الكسول (Lazy Loading) لتحسين الأداء
const UsersTab = lazy(() => import("@/components/staff/UsersTab"));
const RolesTab = lazy(() => import("@/components/staff/RolesTab"));
const CustomRolesTab = lazy(() => import("@/components/staff/CustomRolesTab"));

export default function StaffManagement() {
  const { user } = useAuth();
  const { isLoading: permissionsLoading } = trpc.permissions.getUserPermissions.useQuery(
    { userId: user?.id ?? 0 },
    { enabled: !!user, staleTime: 5 * 60 * 1000 }
  );

  const canViewUsers = usePermission("staff_users.view");
  const canViewRoles = usePermission("staff_roles.view");
  const canViewCustomRoles = usePermission("staff_custom_roles.view");

  const [activeTab, setActiveTab] = useState("");

  // تحديد التبويب النشط الافتراضي بناءً على الصلاحيات
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tab = params.get("tab");
    if (tab && ["users", "roles", "custom-roles"].includes(tab)) {
      if (tab === "users" && canViewUsers) setActiveTab(tab);
      else if (tab === "roles" && canViewRoles) setActiveTab(tab);
      else if (tab === "custom-roles" && canViewCustomRoles) setActiveTab(tab);
    } else {
      if (canViewUsers) setActiveTab("users");
      else if (canViewRoles) setActiveTab("roles");
      else if (canViewCustomRoles) setActiveTab("custom-roles");
    }
  }, [canViewUsers, canViewRoles, canViewCustomRoles]);
  
  // حالات للتحكم في فتح نوافذ الإضافة من المكون الأب
  const [openUsersAdd, setOpenUsersAdd] = useState(false);
  const [openRolesAdd, setOpenRolesAdd] = useState(false);
  const [openCustomRolesAdd, setOpenCustomRolesAdd] = useState(false);

  // تحديد نص زر الإضافة بناءً على التبويب النشط
  const getAddButtonLabel = () => {
    switch (activeTab) {
      case "users": return "إضافة مستخدم";
      case "roles": return "إنشاء دور مخصص";
      case "custom-roles": return "إضافة دور مخصص";
      default: return "إضافة";
    }
  };

  // معالجة النقر على زر الإضافة الديناميكي
  const handleAddClick = () => {
    switch (activeTab) {
      case "users": setOpenUsersAdd(true); break;
      case "roles": setOpenRolesAdd(true); break;
      case "custom-roles": setOpenCustomRolesAdd(true); break;
    }
  };

  if (permissionsLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  if (!canViewUsers && !canViewRoles && !canViewCustomRoles) {
    return (
      <DashboardLayout>
        <div className="container py-20 text-center">
          <Shield className="w-16 h-16 text-destructive mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-destructive">عذراً، لا تملك صلاحية للوصول لصفحة الإدارة</h2>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="container py-8">
        {/* رأس الصفحة مع زر الإضافة الديناميكي */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Users className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">إدارة المستخدمين</h1>
              <p className="text-muted-foreground">واجهة موحدة لإدارة المستخدمين والأدوار والهيكل التنظيمي</p>
            </div>
          </div>

          {activeTab !== "roles" && (
            <>
              {activeTab === "users" && canViewUsers && (
                <PermissionGuard permission="staff_users.add">
                  <Button 
                    className="gradient-primary text-white gap-2 h-11 px-6 shadow-md hover:shadow-lg transition-all"
                    onClick={handleAddClick}
                  >
                    <Plus className="h-5 w-5" />
                    {getAddButtonLabel()}
                  </Button>
                </PermissionGuard>
              )}
              {activeTab === "custom-roles" && canViewCustomRoles && (
                <PermissionGuard permission="staff_custom_roles.add">
                  <Button 
                    className="gradient-primary text-white gap-2 h-11 px-6 shadow-md hover:shadow-lg transition-all"
                    onClick={handleAddClick}
                  >
                    <Plus className="h-5 w-5" />
                    {getAddButtonLabel()}
                  </Button>
                </PermissionGuard>
              )}
            </>
          )}
        </div>

        {/* نظام التبويبات */}
        <Tabs value={activeTab} onValueChange={setActiveTab} dir="rtl" className="space-y-6">
          <div className="w-full overflow-x-auto overflow-y-hidden pb-3 scrollbar-thin">
            <TabsList className="bg-muted/60 p-1.5 inline-flex md:flex w-auto md:w-auto min-w-full md:min-w-0 justify-start h-auto border shadow-sm whitespace-nowrap">
              {canViewUsers && (
                <TabsTrigger 
                  value="users" 
                  className="gap-2 px-4 sm:px-8 py-3 data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-md transition-all rounded-md flex-shrink-0 focus:outline-none focus-visible:ring-0 focus-visible:ring-offset-0"
                >
                  <Users className="h-4 w-4" />
                  المستخدمين
                </TabsTrigger>
              )}
              {canViewRoles && (
                <TabsTrigger 
                  value="roles" 
                  className="gap-2 px-4 sm:px-8 py-3 data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-md transition-all rounded-md flex-shrink-0 focus:outline-none focus-visible:ring-0 focus-visible:ring-offset-0"
                >
                  <Shield className="h-4 w-4" />
                  الأدوار والصلاحيات
                </TabsTrigger>
              )}
              {canViewCustomRoles && (
                <TabsTrigger 
                  value="custom-roles" 
                  className="gap-2 px-4 sm:px-8 py-3 data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-sm transition-all rounded-md flex-shrink-0 focus:outline-none focus-visible:ring-0 focus-visible:ring-offset-0"
                >
                  <Briefcase className="h-4 w-4" />
                  الأدوار المخصصة
                </TabsTrigger>
              )}
            </TabsList>
          </div>

          {/* محتوى التبويبات مع Lazy Loading و Suspense */}
          <div className="mt-6">
            <Suspense fallback={
              <Card className="p-20 flex flex-col items-center justify-center border-dashed">
                <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
                <p className="text-muted-foreground animate-pulse">جاري تحميل المحتوى...</p>
              </Card>
            }>
              {canViewUsers && (
                <TabsContent value="users" className="mt-0 outline-none">
                  <UsersTab openAddModal={openUsersAdd} setOpenAddModal={setOpenUsersAdd} />
                </TabsContent>
              )}
              {canViewRoles && (
                <TabsContent value="roles" className="mt-0 outline-none">
                  <RolesTab openAddModal={openRolesAdd} setOpenAddModal={setOpenRolesAdd} />
                </TabsContent>
              )}
              {canViewCustomRoles && (
                <TabsContent value="custom-roles" className="mt-0 outline-none">
                  <CustomRolesTab openAddModal={openCustomRolesAdd} setOpenAddModal={setOpenCustomRolesAdd} />
                </TabsContent>
              )}
            </Suspense>
          </div>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
