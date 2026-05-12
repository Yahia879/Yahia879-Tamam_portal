import { useRoute, useLocation } from "wouter";
import { trpc } from "../lib/trpc";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { Shield, ArrowRight, Loader2, Lock } from "lucide-react";
import DashboardLayout from "../components/DashboardLayout";

export default function RolePermissions() {
  const [, params] = useRoute("/staff/roles/:id");
  const [, setLocation] = useLocation();
  const roleId = params?.id;

  const { data: roles, isLoading } = trpc.permissions.getRoles.useQuery();
  const role = roles?.find((r) => r.id === roleId);

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="container py-24 flex flex-col items-center justify-center">
          <Loader2 className="w-10 h-10 animate-spin text-primary mb-4" />
          <p className="text-muted-foreground animate-pulse">جاري تحميل بيانات الدور...</p>
        </div>
      </DashboardLayout>
    );
  }

  if (!role) {
    return (
      <DashboardLayout>
        <div className="container py-20 text-center">
          <h2 className="text-2xl font-bold text-destructive">عذراً، لم يتم العثور على الدور</h2>
          <Button variant="outline" className="mt-4" onClick={() => setLocation("/staff")}>
            العودة لصفحة الإدارة
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="container py-8 max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => setLocation("/staff")} 
            className="rounded-full"
          >
            <ArrowRight className="h-6 w-6" />
          </Button>
          <div className="p-3 bg-primary/10 rounded-xl">
            <Shield className="h-8 w-8 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white">إدارة صلاحيات الدور</h1>
            <p className="text-muted-foreground font-medium">{role.nameAr}</p>
          </div>
        </div>

        {/* Content Placeholder */}
        <Card className="p-12 border-dashed border-2 flex flex-col items-center justify-center text-center bg-muted/20">
          <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-6">
            <Lock className="h-8 w-8 text-muted-foreground" />
          </div>
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-2">الصلاحيات المسندة (Assigned Permissions)</h2>
          <p className="text-muted-foreground max-w-md mx-auto">
            سيتم عرض وتعديل قائمة الصلاحيات التفصيلية لهذا الدور هنا قريباً.
          </p>
          <div className="mt-8 flex gap-3">
             <Button variant="outline" onClick={() => setLocation("/staff")}>
              العودة
            </Button>
             <Button onClick={() => setLocation(`/roles/${role.id}`)}>
              تعديل الدور
            </Button>
          </div>
        </Card>
      </div>
    </DashboardLayout>
  );
}
