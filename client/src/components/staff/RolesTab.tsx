import { useState, useEffect } from "react";
import { useLocation, Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Shield, Plus, Edit, Trash2, Users, Loader2 } from "lucide-react";
import { PermissionGuard } from "@/components/PermissionGuard";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";

export interface RolesTabProps {
  openAddModal: boolean;
  setOpenAddModal: (open: boolean) => void;
}

export default function RolesTab({ openAddModal, setOpenAddModal }: RolesTabProps) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [, setLocation] = useLocation();

  const { data: roles, isLoading, refetch } = trpc.permissions.getRoles.useQuery();
  
  const deleteRole = trpc.permissions.deleteRole.useMutation({
    onSuccess: () => {
      toast.success("تم حذف الدور بنجاح");
      refetch();
      setDeleteDialogOpen(false);
    },
    onError: (error) => {
      toast.error(error.message || "فشل حذف الدور");
    },
  });

  useEffect(() => {
    if (openAddModal) {
      setLocation("/roles/new");
      setOpenAddModal(false);
    }
  }, [openAddModal, setLocation, setOpenAddModal]);

  const handleDelete = (roleId: string) => {
    setSelectedRole(roleId);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (selectedRole) {
      deleteRole.mutate({ roleId: selectedRole });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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

      {/* Roles Table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-right">الدور</TableHead>
              <TableHead className="text-right">الوصف</TableHead>
              <TableHead className="text-right">النوع</TableHead>
              <TableHead className="text-right">الحالة</TableHead>
              <TableHead className="text-right">تاريخ الإنشاء</TableHead>
              <TableHead className="text-left">إجراءات</TableHead>
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
                  <TableCell className="text-muted-foreground text-right">
                    {role.description || "-"}
                  </TableCell>
                  <TableCell className="text-right">
                    {role.isSystem ? (
                      <Badge variant="secondary">افتراضي</Badge>
                    ) : (
                      <Badge variant="outline">مخصص</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {role.isActive ? (
                      <Badge variant="default" className="bg-green-600">
                        نشط
                      </Badge>
                    ) : (
                      <Badge variant="secondary">غير نشط</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {new Date(role.createdAt).toLocaleDateString("ar-SA")}
                  </TableCell>
                  <TableCell className="text-left">
                    <div className="flex items-center gap-2">
                      <PermissionGuard permission="permissions.edit">
                        <Link href={`/roles/${role.id}`}>
                          <Button variant="ghost" size="sm">
                            <Edit className="h-4 w-4" />
                          </Button>
                        </Link>
                      </PermissionGuard>

                      <PermissionGuard permission="permissions.delete">
                        {!role.isSystem && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(role.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        )}
                      </PermissionGuard>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8">
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

      {/* Delete Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>تأكيد الحذف</AlertDialogTitle>
            <AlertDialogDescription>
              هل أنت متأكد من حذف هذا الدور؟ سيتم إزالة جميع الصلاحيات المرتبطة به من
              المستخدمين.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive hover:bg-destructive/90"
            >
              حذف
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
