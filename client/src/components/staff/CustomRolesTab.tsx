import { useEffect, useState } from "react";
import { useLocation, Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { formatErrorMessage } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { usePermission } from "@/hooks/usePermission";
import { PermissionGuard } from "@/components/PermissionGuard";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { Shield, Loader2, Power, MoreVertical, Plus, Trash2, Pencil, ChevronLeft } from "lucide-react";
import { toast } from "sonner";

export interface CustomRolesTabProps {
  openAddModal: boolean;
  setOpenAddModal: (open: boolean) => void;
}

export default function CustomRolesTab({ openAddModal, setOpenAddModal }: CustomRolesTabProps) {
  const [, setLocation] = useLocation();
  const canCustomize = usePermission("staff_roles.customize");
  const [roleToDelete, setRoleToDelete] = useState<{ id: string; nameAr: string } | null>(null);

  const utils = trpc.useContext();
  const { data: allRoles, isLoading } = trpc.permissions.getRoles.useQuery();

  const toggleMutation = trpc.permissions.toggleRoleStatus.useMutation({
    onSuccess: () => {
      utils.permissions.getRoles.invalidate();
      toast.success("تم تحديث حالة الدور بنجاح");
    },
    onError: (error) => {
      toast.error(formatErrorMessage(error, "فشل تحديث حالة الدور، يرجى المحاولة مرة أخرى بعد قليل"));
    }
  });

  const deleteMutation = trpc.permissions.deleteRole.useMutation({
    onSuccess: () => {
      utils.permissions.getRoles.invalidate();
      toast.success("تم حذف الدور بنجاح");
      setRoleToDelete(null);
    },
    onError: (error) => {
      toast.error(formatErrorMessage(error, "فشل حذف الدور، يرجى المحاولة مرة أخرى بعد قليل"));
      setRoleToDelete(null);
    }
  });

  const handleToggleStatus = (roleId: string, isActive: boolean) => {
    toggleMutation.mutate({ roleId, isActive });
  };

  const handleDeleteRole = () => {
    if (roleToDelete) {
      deleteMutation.mutate({ roleId: roleToDelete.id });
    }
  };
  
  // تصفية الأدوار لإظهار الأدوار المخصصة فقط (isSystem === false)
  const roles = allRoles?.filter(role => role.id !== 'service_requester' && !role.isSystem);

  useEffect(() => {
    if (openAddModal) {
      setLocation("/roles/new");
      setOpenAddModal(false);
    }
  }, [openAddModal, setLocation, setOpenAddModal]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Custom Roles View (Table for desktop, Cards for mobile) */}
      <div className="space-y-4">
        {/* Desktop Table */}
        <Card className="hidden md:block overflow-hidden border-sidebar-border/10">
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow>
                <TableHead className="text-right">الدور المخصص</TableHead>
                <TableHead className="text-right">النوع</TableHead>
                <TableHead className="text-right">الحالة</TableHead>
                <TableHead className="text-left">الإجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {roles && roles.length > 0 ? (
                roles.map((role) => (
                  <TableRow 
                    key={role.id}
                    onClick={() => canCustomize && setLocation(`/staff/roles/${role.id}`)}
                    className={`${canCustomize ? "cursor-pointer" : "cursor-default"} hover:bg-muted/50 transition-colors`}
                  >
                    <TableCell className="font-medium text-right">
                      {role.nameAr}
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge variant="outline">مخصص</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {role.isActive ? (
                        <Badge variant="default" className="bg-green-600">
                          نشط
                        </Badge>
                      ) : (
                        <Badge variant="destructive">موقوف</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-left" onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">فتح القائمة</span>
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          <PermissionGuard permission="staff_custom_roles.edit">
                            <DropdownMenuItem
                              onClick={() => setLocation(`/roles/${role.id}/edit`)}
                              className="cursor-pointer"
                            >
                              <Pencil className="h-4 w-4 ml-2" />
                              تعديل الدور
                            </DropdownMenuItem>
                          </PermissionGuard>
                          <PermissionGuard permission="staff_custom_roles.delete">
                            <DropdownMenuItem
                              onClick={() => setRoleToDelete({ id: role.id, nameAr: role.nameAr })}
                              className="text-destructive focus:text-destructive cursor-pointer"
                            >
                              <Trash2 className="h-4 w-4 ml-2" />
                              حذف الدور
                            </DropdownMenuItem>
                          </PermissionGuard>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-16">
                    <div className="flex flex-col items-center justify-center gap-4">
                      <div className="p-4 bg-muted/30 rounded-full">
                        <Shield className="h-12 w-12 text-muted-foreground/40" />
                      </div>
                      <div className="space-y-1">
                        <h3 className="font-medium text-lg">لا توجد أدوار مخصصة</h3>
                        <p className="text-muted-foreground max-w-sm mx-auto">
                          تُستخدم هذه المساحة لإدارة الأدوار التي تقوم بإنشائها خصيصاً لمنظمتك، وهي منفصلة عن الأدوار الأساسية للنظام.
                        </p>
                      </div>
                      <PermissionGuard permission="staff_custom_roles.add">
                        <Button 
                          className="mt-4 gap-2"
                          onClick={() => setLocation("/roles/new")}
                        >
                          <Plus className="h-4 w-4" />
                          إضافة دور مخصص
                        </Button>
                      </PermissionGuard>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Card>

        {/* Mobile Cards View */}
        <div className="md:hidden space-y-4">
          {!roles || roles.length === 0 ? (
            <Card className="p-8 text-center text-muted-foreground border-dashed">
              <div className="flex flex-col items-center justify-center gap-4">
                <div className="p-4 bg-muted/30 rounded-full">
                  <Shield className="h-10 w-10 text-muted-foreground/40" />
                </div>
                <div className="space-y-1">
                  <h3 className="font-medium">لا توجد أدوار مخصصة</h3>
                  <p className="text-xs text-muted-foreground max-w-[250px] mx-auto">
                    إدارة الأدوار التي تقوم بإنشائها خصيصاً لمنظمتك.
                  </p>
                </div>
                <PermissionGuard permission="staff_custom_roles.add">
                  <Button 
                    size="sm"
                    className="mt-2 gap-2"
                    onClick={() => setLocation("/roles/new")}
                  >
                    <Plus className="h-4 w-4" />
                    إضافة دور مخصص
                  </Button>
                </PermissionGuard>
              </div>
            </Card>
          ) : (
            roles.map((role) => (
              <Card 
                key={role.id} 
                className={`p-4 space-y-4 border-sidebar-border/10 hover:shadow-md transition-all ${canCustomize ? "cursor-pointer" : "cursor-default"}`}
                onClick={() => canCustomize && setLocation(`/staff/roles/${role.id}`)}
              >
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                      <Shield className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-bold">{role.nameAr}</h3>
                      <div className="text-xs text-muted-foreground">دور مخصص</div>
                    </div>
                  </div>
                  
                  <div onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        <PermissionGuard permission="staff_custom_roles.edit">
                          <DropdownMenuItem
                            onClick={() => setLocation(`/roles/${role.id}/edit`)}
                            className="cursor-pointer"
                          >
                            <Pencil className="h-4 w-4 ml-2" />
                            تعديل الدور
                          </DropdownMenuItem>
                        </PermissionGuard>
                        <PermissionGuard permission="staff_custom_roles.delete">
                          <DropdownMenuItem
                            onClick={() => setRoleToDelete({ id: role.id, nameAr: role.nameAr })}
                            className="text-destructive focus:text-destructive cursor-pointer"
                          >
                            <Trash2 className="h-4 w-4 ml-2" />
                            حذف الدور
                          </DropdownMenuItem>
                        </PermissionGuard>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>

                <div className="flex justify-between items-center pt-2 border-t border-dashed">
                  <div className="flex gap-2">
                    <Badge variant="outline" className="text-[10px] px-2 py-0">مخصص</Badge>
                    {role.isActive ? (
                      <Badge variant="default" className="bg-green-600 text-[10px] px-2 py-0">نشط</Badge>
                    ) : (
                      <Badge variant="destructive" className="text-[10px] px-2 py-0">موقوف</Badge>
                    )}
                  </div>
                  <div className="text-xs text-primary font-medium flex items-center gap-1">
                    عرض التفاصيل
                    <ChevronLeft className="h-3 w-3" />
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      </div>

      {/* Confirmation Dialog */}
      <AlertDialog open={!!roleToDelete} onOpenChange={(open) => !open && setRoleToDelete(null)}>
        <AlertDialogContent className="w-[90vw] max-w-md rounded-xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-right">تأكيد الحذف</AlertDialogTitle>
            <AlertDialogDescription className="text-right">
              هل أنت متأكد من حذف دور "<strong>{roleToDelete?.nameAr}</strong>" بشكل نهائي؟ لا يمكن التراجع عن هذا الإجراء.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex flex-col-reverse sm:flex-row-reverse gap-2 mt-4">
            <AlertDialogAction
              onClick={handleDeleteRole}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 w-full sm:w-auto"
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? (
                <>
                  <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                  جاري الحذف...
                </>
              ) : (
                "حذف الدور"
              )}
            </AlertDialogAction>
            <AlertDialogCancel disabled={deleteMutation.isPending} className="w-full sm:w-auto">إلغاء</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
