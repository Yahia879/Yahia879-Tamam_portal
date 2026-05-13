import { useState, lazy, Suspense, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Users, Shield, Briefcase, Loader2, ArrowRight } from "lucide-react";
import { Link } from "wouter";

// استخدام الاستدعاء الكسول (Lazy Loading) لتحسين الأداء
const UsersTab = lazy(() => import("@/components/staff/UsersTab"));
const RolesTab = lazy(() => import("@/components/staff/RolesTab"));
const CustomRolesTab = lazy(() => import("@/components/staff/CustomRolesTab"));

export default function StaffManagement() {
  const [activeTab, setActiveTab] = useState("users");

  // قراءة التبويب من رابط URL عند التحميل
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tab = params.get("tab");
    if (tab && ["users", "roles", "custom-roles"].includes(tab)) {
      setActiveTab(tab);
    }
  }, []);
  
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

  return (
    <DashboardLayout>
      <div className="container py-8">
        {/* رأس الصفحة مع زر الإضافة الديناميكي */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-3">
             <Link href="/settings">
              <Button variant="ghost" size="sm" className="gap-1 text-muted-foreground hover:text-foreground">
                <ArrowRight className="h-4 w-4" />
                رجوع
              </Button>
            </Link>
            <div className="p-2 bg-primary/10 rounded-lg">
              <Users className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">إدارة الكادر</h1>
              <p className="text-muted-foreground">واجهة موحدة لإدارة المستخدمين والأدوار والهيكل التنظيمي</p>
            </div>
          </div>

          {activeTab !== "roles" && (
            <Button 
              className="gradient-primary text-white gap-2 h-11 px-6 shadow-md hover:shadow-lg transition-all"
              onClick={handleAddClick}
            >
              <Plus className="h-5 w-5" />
              {getAddButtonLabel()}
            </Button>
          )}
        </div>

        {/* نظام التبويبات */}
        <Tabs value={activeTab} onValueChange={setActiveTab} dir="rtl" className="space-y-6">
          <TabsList className="bg-muted/60 p-1.5 w-full md:w-auto overflow-x-auto justify-start h-auto border shadow-sm">
            <TabsTrigger 
              value="users" 
              className="gap-2 px-8 py-3 data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-md transition-all rounded-md"
            >
              <Users className="h-4 w-4" />
              المستخدمين
            </TabsTrigger>
            <TabsTrigger 
              value="roles" 
              className="gap-2 px-8 py-3 data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-md transition-all rounded-md"
            >
              <Shield className="h-4 w-4" />
              الأدوار والصلاحيات
            </TabsTrigger>
            <TabsTrigger 
              value="custom-roles" 
              className="gap-2 px-8 py-3 data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-md transition-all rounded-md"
            >
              <Briefcase className="h-4 w-4" />
              الأدوار المخصصة
            </TabsTrigger>
          </TabsList>

          {/* محتوى التبويبات مع Lazy Loading و Suspense */}
          <div className="mt-6">
            <Suspense fallback={
              <Card className="p-20 flex flex-col items-center justify-center border-dashed">
                <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
                <p className="text-muted-foreground animate-pulse">جاري تحميل المحتوى...</p>
              </Card>
            }>
              <TabsContent value="users" className="mt-0 outline-none">
                <UsersTab openAddModal={openUsersAdd} setOpenAddModal={setOpenUsersAdd} />
              </TabsContent>
              <TabsContent value="roles" className="mt-0 outline-none">
                <RolesTab openAddModal={openRolesAdd} setOpenAddModal={setOpenRolesAdd} />
              </TabsContent>
              <TabsContent value="custom-roles" className="mt-0 outline-none">
                <CustomRolesTab openAddModal={openCustomRolesAdd} setOpenAddModal={setOpenCustomRolesAdd} />
              </TabsContent>
            </Suspense>
          </div>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
