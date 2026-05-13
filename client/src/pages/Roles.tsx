import { Link } from "wouter";
import { trpc } from "../lib/trpc";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table";
import { Badge } from "../components/ui/badge";
import { Shield, Plus, Users, ArrowRight } from "lucide-react";
import { PermissionGuard } from "../components/PermissionGuard";
import DashboardLayout from "../components/DashboardLayout";

export default function Roles() {
  const { data: allRoles, isLoading } = trpc.permissions.getRoles.useQuery();
  
  // تصفية الأدوار لإخفاء "طالب الخدمة" من واجهة الإدارة مع تطبيق ترتيب مخصص للأدوار الأساسية
  const rolePriority: Record<string, number> = {
    system_admin: 1,
    super_admin: 2,
    projects_office: 3,
    project_manager: 4,
    financial: 5,
    field_team: 6,
    quick_response: 7,
    corporate_comm: 8,
  };

  const roles = allRoles
    ?.filter(role => role.id !== 'service_requester')
    .sort((a, b) => {
      const priorityA = rolePriority[a.id] || 99;
      const priorityB = rolePriority[b.id] || 99;
      return priorityA - priorityB;
    });

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="container py-8">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">جاري التحميل...</p>
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="container py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <Link href="/settings">
              <Button variant="ghost" size="sm" className="gap-1 text-muted-foreground hover:text-foreground">
                <ArrowRight className="h-4 w-4" />
                رجوع
              </Button>
            </Link>
            <div className="p-2 bg-primary/10 rounded-lg">
              <Shield className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">إدارة الأدوار والصلاحيات</h1>
              <p className="text-muted-foreground">إنشاء وتعديل الأدوار وصلاحياتها</p>
            </div>
          </div>

          <PermissionGuard permission="permissions.create">
            <Link href="/roles/new">
              <Button className="gradient-primary text-white gap-2">
                <Plus className="h-4 w-4" />
                إنشاء دور جديد
              </Button>
            </Link>
          </PermissionGuard>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <Shield className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">إجمالي الأدوار</p>
                <p className="text-2xl font-bold">{roles?.length || 0}</p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
                <Users className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">الأدوار النشطة</p>
                <p className="text-2xl font-bold">
                  {roles?.filter((r) => r.isActive).length || 0}
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                <Shield className="h-6 w-6 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">الأدوار الافتراضية</p>
                <p className="text-2xl font-bold">
                  {roles?.filter((r) => r.isSystem).length || 0}
                </p>
              </div>
            </div>
          </Card>
        </div>

        {/* Table */}
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>الدور</TableHead>
                <TableHead>الوصف</TableHead>
                <TableHead>النوع</TableHead>
                <TableHead>الحالة</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {roles && roles.length > 0 ? (
                roles.map((role) => (
                  <TableRow key={role.id}>
                    <TableCell className="font-medium text-right">
                      <Link 
                        href={`/staff/roles/${role.id}`}
                        className="hover:text-primary hover:underline cursor-pointer transition-colors"
                      >
                        {role.nameAr}
                      </Link>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {role.description || "-"}
                    </TableCell>
                    <TableCell>
                      {role.isSystem ? (
                        <Badge variant="secondary">افتراضي</Badge>
                      ) : (
                        <Badge variant="outline">مخصص</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {role.isActive ? (
                        <Badge variant="default" className="bg-green-600">
                          نشط
                        </Badge>
                      ) : (
                        <Badge variant="secondary">غير نشط</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8">
                    <div className="flex flex-col items-center gap-2">
                      <Shield className="h-12 w-12 text-muted-foreground/50" />
                      <p className="text-muted-foreground">لا توجد أدوار</p>
                      <Link href="/roles/new">
                        <Button variant="outline" size="sm" className="mt-2 gap-1">
                          <Plus className="h-4 w-4" />
                          إنشاء أول دور
                        </Button>
                      </Link>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Card>
      </div>
    </DashboardLayout>
  );
}
