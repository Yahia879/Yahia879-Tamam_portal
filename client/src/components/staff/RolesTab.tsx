import { useEffect } from "react";
import { useLocation, Link } from "wouter";
import { trpc } from "@/lib/trpc";
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
import { Shield, Plus, Users, Loader2, Power, MoreVertical, ShieldOff, ChevronLeft } from "lucide-react";

export interface RolesTabProps {
  openAddModal: boolean;
  setOpenAddModal: (open: boolean) => void;
}

export default function RolesTab({ openAddModal, setOpenAddModal }: RolesTabProps) {
  const [, setLocation] = useLocation();
  const canCustomize = usePermission("staff_roles.customize");

  const utils = trpc.useContext();
  const { data: allRoles, isLoading } = trpc.permissions.getRoles.useQuery();

  const toggleMutation = trpc.permissions.toggleRoleStatus.useMutation({
    onSuccess: () => {
      utils.permissions.getRoles.invalidate();
    }
  });

  const handleToggleStatus = (roleId: string, isActive: boolean) => {
    toggleMutation.mutate({ roleId, isActive });
  };
  
  // تصفية الأدوار لإخفاء "طالب الخدمة" ولإظهار الأدوار الافتراضية فقط مع ترتيب مخصص
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
    ?.filter(role => role.id !== 'service_requester' && role.id !== 'financial_manager' && role.isSystem)
    .sort((a, b) => (rolePriority[a.id] || 99) - (rolePriority[b.id] || 99));

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
      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        <Card className="p-4 sm:p-6 transition-all hover:shadow-md">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <Shield className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">إجمالي الأدوار</p>
              <p className="text-xl sm:text-2xl font-bold">{roles?.length || 0}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4 sm:p-6 transition-all hover:shadow-md">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <Users className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">الأدوار النشطة</p>
              <p className="text-xl sm:text-2xl font-bold">
                {roles?.filter((r) => r.isActive).length || 0}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-4 sm:p-6 transition-all hover:shadow-md sm:col-span-2 lg:col-span-1">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-lg">
              <ShieldOff className="h-6 w-6 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">الأدوار الموقوفة</p>
              <p className="text-xl sm:text-2xl font-bold">
                {roles?.filter((r) => !r.isActive).length || 0}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Roles View (Table for desktop, Cards for mobile) */}
      <div className="space-y-4">
        {/* Desktop Table */}
        <Card className="hidden md:block overflow-hidden border-sidebar-border/10">
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow>
                <TableHead className="text-right">الدور</TableHead>
                <TableHead className="text-right">الوصف</TableHead>
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
                    <TableCell className="text-muted-foreground text-right">
                      {role.description || "-"}
                    </TableCell>
                    <TableCell className="text-right">
                      {role.isSystem ? (
                        <Badge variant="secondary">أساسي</Badge>
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
                        <Badge variant="destructive">موقوف</Badge>
                      )}
                    </TableCell>
                     <TableCell className="text-left animate-fade-in" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-2 justify-end" dir="rtl">
                        {role.id !== 'super_admin' && role.id !== 'system_admin' ? (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" className="h-8 w-8 p-0 rounded-lg hover:bg-muted">
                                <span className="sr-only">فتح القائمة</span>
                                <MoreVertical className="h-4 w-4 text-muted-foreground" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48 text-right font-medium">
                              <PermissionGuard permission="staff_roles.customize">
                                <DropdownMenuItem
                                  onClick={() => setLocation(`/staff/roles/${role.id}`)}
                                  className="cursor-pointer flex items-center justify-end gap-2 hover:bg-primary/5 focus:bg-primary/5 text-slate-700 font-bold"
                                >
                                  <span>تخصيص الصلاحيات</span>
                                  <Shield className="h-4 w-4 text-primary" />
                                </DropdownMenuItem>
                              </PermissionGuard>
                              <PermissionGuard permission="staff_roles.suspend">
                                <DropdownMenuItem
                                  onClick={() => handleToggleStatus(role.id, !role.isActive)}
                                  disabled={toggleMutation.isPending}
                                  className={role.isActive ? "text-destructive focus:text-destructive cursor-pointer flex items-center justify-end gap-2" : "text-green-600 focus:text-green-600 cursor-pointer flex items-center justify-end gap-2"}
                                >
                                  <span>{role.isActive ? "إيقاف الدور" : "تفعيل الدور"}</span>
                                  <Power className="h-4 w-4" />
                                </DropdownMenuItem>
                              </PermissionGuard>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        ) : (
                          <span className="text-xs text-muted-foreground font-medium pl-2">-</span>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8">
                    <div className="flex flex-col items-center gap-2">
                      <Shield className="h-12 w-12 text-muted-foreground/50" />
                      <p className="text-muted-foreground">لا توجد أدوار</p>
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
              <Shield className="h-12 w-12 text-muted-foreground/50 mx-auto mb-2" />
              لا توجد أدوار
            </Card>
          ) : (
            roles.map((role) => (
              <Card 
                key={role.id} 
                className={`p-4 space-y-4 border-sidebar-border/10 hover:shadow-md transition-all ${canCustomize ? "cursor-pointer" : "cursor-default"}`}
                onClick={() => canCustomize && setLocation(`/staff/roles/${role.id}`)}
              >
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-3 text-right">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
                      <Shield className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 dark:text-white">{role.nameAr}</h3>
                      <div className="text-xs text-muted-foreground">{role.isSystem ? "دور أساسي" : "دور مخصص"}</div>
                    </div>
                  </div>
                  
                  <div onClick={(e) => e.stopPropagation()}>
                    {role.id !== 'super_admin' && role.id !== 'system_admin' ? (
                       <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0 rounded-lg hover:bg-muted">
                            <MoreVertical className="h-4 w-4 text-muted-foreground" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48 text-right font-medium">
                          <PermissionGuard permission="staff_roles.customize">
                            <DropdownMenuItem
                              onClick={() => setLocation(`/staff/roles/${role.id}`)}
                              className="cursor-pointer flex items-center justify-end gap-2 hover:bg-primary/5 focus:bg-primary/5 text-slate-700 font-bold"
                            >
                              <span>تخصيص الصلاحيات</span>
                              <Shield className="h-4 w-4 text-primary" />
                            </DropdownMenuItem>
                          </PermissionGuard>
                          <PermissionGuard permission="staff_roles.suspend">
                            <DropdownMenuItem
                              onClick={() => handleToggleStatus(role.id, !role.isActive)}
                              disabled={toggleMutation.isPending}
                              className={role.isActive ? "text-destructive focus:text-destructive cursor-pointer flex items-center justify-end gap-2" : "text-green-600 focus:text-green-600 cursor-pointer flex items-center justify-end gap-2"}
                            >
                              <span>{role.isActive ? "إيقاف الدور" : "تفعيل الدور"}</span>
                              <Power className="h-4 w-4" />
                            </DropdownMenuItem>
                          </PermissionGuard>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    ) : (
                      <span className="text-xs text-muted-foreground font-medium pl-2">-</span>
                    )}
                  </div>
                </div>

                {role.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2 text-right">
                    {role.description}
                  </p>
                )}

                <div className="flex justify-between items-center pt-2 border-t border-dashed">
                  <div className="flex gap-2">
                    {role.isSystem ? (
                      <Badge variant="secondary" className="text-[10px] px-2 py-0">أساسي</Badge>
                    ) : (
                      <Badge variant="outline" className="text-[10px] px-2 py-0">مخصص</Badge>
                    )}
                    {role.isActive ? (
                      <Badge variant="default" className="bg-green-600 text-[10px] px-2 py-0">نشط</Badge>
                    ) : (
                      <Badge variant="destructive" className="text-[10px] px-2 py-0">موقوف</Badge>
                    )}
                  </div>
                  <div className="text-xs text-primary font-medium flex items-center gap-1">
                    عرض الصلاحيات
                    <ChevronLeft className="h-3 w-3" />
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
