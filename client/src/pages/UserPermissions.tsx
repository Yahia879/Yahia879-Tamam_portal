import { useState } from "react";
import { useRoute, useLocation } from "wouter";
import { trpc } from "../lib/trpc";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { Label } from "../components/ui/label";
import { Checkbox } from "../components/ui/checkbox";
import { Badge } from "../components/ui/badge";
import { Shield, Save, ArrowRight, Plus, X } from "lucide-react";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog";

export default function UserPermissions() {
  const [, params] = useRoute("/users/:id/permissions");
  const [, setLocation] = useLocation();
  const userId = params?.id ? parseInt(params.id) : null;

  const [selectedRole, setSelectedRole] = useState("");
  const [assignRoleDialogOpen, setAssignRoleDialogOpen] = useState(false);

  // جلب بيانات المستخدم الأساسية
  const { data: userData, isLoading: userDataLoading } = trpc.users.getById.useQuery(
    { id: userId! },
    { enabled: !!userId }
  );

  const userName = userData?.name || `مستخدم #${userId}`;

  // جلب الأدوار المتاحة
  const { data: roles, isLoading: rolesLoading } = trpc.permissions.getRoles.useQuery();

  // جلب أدوار المستخدم (الإضافية)
  const { data: userRoles, isLoading: userRolesLoading, refetch: refetchUserRoles } =
    trpc.permissions.getUserRoles.useQuery(
      { userId: userId! },
      { enabled: !!userId }
    );

  // جلب الصلاحيات الفردية
  const { data: directPermissions, isLoading: directPermissionsLoading, refetch: refetchDirectPermissions } =
    trpc.permissions.getUserDirectPermissions.useQuery(
      { userId: userId! },
      { enabled: !!userId }
    );

  // جلب الصلاحيات النهائية (المدمجة)
  const { data: finalPermissions, isLoading: finalPermissionsLoading } = trpc.permissions.getUserPermissions.useQuery(
    { userId: userId! },
    { enabled: !!userId }
  );

  // جلب الهيكل الهرمي
  const { data: structure, isLoading: structureLoading } = trpc.permissions.getStructure.useQuery();

  const isLoading = userDataLoading || rolesLoading || userRolesLoading || directPermissionsLoading || finalPermissionsLoading || structureLoading;

  // قائمة جميع الأدوار (الأساسي + الإضافي)
  const allUserRoles = [
    ...(userData?.role ? [{
      id: 'primary',
      roleId: userData.role,
      roleName: roles?.find(r => r.id === userData.role)?.nameAr || userData.role,
      isPrimary: true,
      assignedAt: userData.createdAt || new Date()
    }] : []),
    ...(userRoles?.map(ur => ({ ...ur, isPrimary: false })) || [])
  ];

  const assignRole = trpc.permissions.assignRole.useMutation({
    onSuccess: () => {
      toast.success("تم إسناد الدور بنجاح");
      refetchUserRoles();
      setAssignRoleDialogOpen(false);
      setSelectedRole("");
    },
    onError: (error) => {
      toast.error(error.message || "فشل إسناد الدور");
    },
  });

  const removeRole = trpc.permissions.removeRole.useMutation({
    onSuccess: () => {
      toast.success("تم إزالة الدور بنجاح");
      refetchUserRoles();
    },
    onError: (error) => {
      toast.error(error.message || "فشل إزالة الدور");
    },
  });

  const grantPermission = trpc.permissions.grantPermission.useMutation({
    onSuccess: () => {
      toast.success("تم منح الصلاحية بنجاح");
      refetchDirectPermissions();
    },
    onError: (error) => {
      toast.error(error.message || "فشل منح الصلاحية");
    },
  });

  const revokePermission = trpc.permissions.revokePermission.useMutation({
    onSuccess: () => {
      toast.success("تم سحب الصلاحية بنجاح");
      refetchDirectPermissions();
    },
    onError: (error) => {
      toast.error(error.message || "فشل سحب الصلاحية");
    },
  });

  const handleAssignRole = () => {
    if (!userId || !selectedRole) return;
    assignRole.mutate({ userId, roleId: selectedRole });
  };

  const handleRemoveRole = (roleId: string) => {
    if (!userId) return;
    removeRole.mutate({ userId, roleId });
  };

  const handlePermissionToggle = (permissionId: string) => {
    if (!userId || userData?.role === 'super_admin') return;

    const directEntry = directPermissions?.find(p => p.permissionId === permissionId);
    const isInherited = finalPermissions?.includes(permissionId) && !directEntry;
    const isCurrentlyActive = finalPermissions?.includes(permissionId);

    if (isCurrentlyActive) {
      // الصلاحية نشطة حالياً، نريد سحبها
      if (directEntry?.granted === true) {
        // كانت ممنوحة يدوياً، نسحبها (بإضافة سجل سحب أو حذف سجل المنح)
        // حالياً السيرفر يضيف سجل جديد، لذا سنضيف سجل سحب
        revokePermission.mutate({ userId, permissionId, reason: "سحب يدوي لصلاحية كانت ممنوحة" });
      } else {
        // موروثة من الدور، نضيف سجل سحب يدوياً
        revokePermission.mutate({ userId, permissionId, reason: "سحب يدوي لصلاحية موروثة" });
      }
    } else {
      // الصلاحية غير نشطة حالياً، نريد منحها
      grantPermission.mutate({ userId, permissionId, reason: "منح يدوي" });
    }
  };

  if (!userId) {
    return <div className="container py-8">معرف المستخدم غير صحيح</div>;
  }

  if (isLoading) {
    return (
      <div className="container py-12 flex flex-col items-center justify-center min-h-[400px]">
        <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin mb-4" />
        <p className="text-muted-foreground animate-pulse">جاري تحميل بيانات الصلاحيات...</p>
      </div>
    );
  }

  return (
    <div className="container py-8 max-w-6xl">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <Button variant="ghost" size="sm" onClick={() => setLocation("/users")}>
          <ArrowRight className="h-4 w-4" />
        </Button>
        <div className="p-2 bg-primary/10 rounded-lg">
          <Shield className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-3xl font-bold">إدارة صلاحيات المستخدم</h1>
          <p className="text-muted-foreground">
            {userName}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* أدوار المستخدم */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">الأدوار المسندة</h2>
            <Button
              size="sm"
              onClick={() => setAssignRoleDialogOpen(true)}
            >
              <Plus className="h-4 w-4 ml-2" />
              إسناد دور
            </Button>
          </div>

          <div className="space-y-2">
            {allUserRoles.length > 0 ? (
              allUserRoles.map((role) => (
                <div
                  key={role.id}
                  className={`flex items-center justify-between p-3 border rounded-lg ${role.isPrimary ? 'bg-primary/5 border-primary/20' : ''}`}
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-foreground">{role.roleName}</p>
                      {role.isPrimary && (
                        <Badge variant="outline" className="text-[10px] h-4 bg-primary/10 text-primary border-primary/20">أساسي</Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {role.isPrimary ? 'تاريخ التعيين: ' : 'تم الإسناد: '}
                      {new Date(role.assignedAt).toLocaleDateString("ar-SA")}
                    </p>
                  </div>
                  {!role.isPrimary && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveRole(role.roleId)}
                      className="hover:bg-destructive/10 hover:text-destructive h-8 w-8 p-0"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))
            ) : (
              <p className="text-center text-muted-foreground py-4">
                لا توجد أدوار مسندة
              </p>
            )}
          </div>
        </Card>

        {/* الصلاحيات النهائية */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4">الصلاحيات النهائية المكتسبة</h2>
          <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
            {structure?.map((module) => {
              const modulePermissions = module.permissions.filter((p) =>
                finalPermissions?.includes(p.id)
              );
              if (modulePermissions.length === 0) return null;

              return (
                <div key={module.id} className="border border-border/60 rounded-xl p-4 bg-muted/30">
                  <h3 className="font-bold mb-3 text-sm flex items-center gap-2 text-primary">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                    {module.nameAr}
                  </h3>
                  <div className="flex flex-wrap gap-1.5">
                    {modulePermissions.map((permission) => (
                      <Badge 
                        key={permission.id} 
                        variant="secondary"
                        className="bg-white dark:bg-slate-800 border-primary/10 text-slate-700 dark:text-slate-300 font-normal px-2 py-0.5"
                      >
                        {permission.nameAr}
                      </Badge>
                    ))}
                  </div>
                </div>
              );
            })}
            {!finalPermissions || finalPermissions.length === 0 ? (
              <div className="text-center py-12 border-2 border-dashed rounded-xl">
                <p className="text-muted-foreground">لا توجد صلاحيات مسندة لهذا المستخدم</p>
              </div>
            ) : null}
          </div>
        </Card>
      </div>

      {/* الصلاحيات الفردية */}
      <Card className="p-6 mt-6">
        <div className="flex items-center gap-2 mb-2">
          <h2 className="text-xl font-bold">تعديل الصلاحيات الفردية</h2>
          <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">صلاحيات مخصصة</Badge>
        </div>
        <p className="text-sm text-muted-foreground mb-6">
          يمكنك منح أو سحب صلاحيات محددة للمستخدم بشكل مباشر لتجاوز الصلاحيات الموروثة من الأدوار.
        </p>

        <div className="space-y-6">
          {structure?.map((module) => (
            <div key={module.id} className="border border-border rounded-xl p-5 hover:border-primary/30 transition-colors">
              <h3 className="font-bold mb-4 flex items-center gap-3 text-lg text-slate-800 dark:text-slate-200">
                <div className="p-1.5 bg-primary/10 rounded-lg">
                  <Shield className="h-5 w-5 text-primary" />
                </div>
                {module.nameAr}
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {module.permissions.map((permission) => {
                  const directEntry = directPermissions?.find(p => p.permissionId === permission.id);
                  const isGrantedDirectly = directEntry?.granted === true;
                  const isRevokedDirectly = directEntry?.granted === false;
                  
                  // الصلاحية موروثة من الدور
                  const isInherited = finalPermissions?.includes(permission.id) && !isGrantedDirectly;

                  return (
                    <div
                      key={permission.id}
                      className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                        isInherited 
                          ? 'bg-primary/5 border-primary/10 shadow-sm' 
                          : isGrantedDirectly 
                            ? 'bg-emerald-50 border-emerald-200 ring-1 ring-emerald-100 shadow-sm'
                            : isRevokedDirectly
                              ? 'bg-red-50 border-red-200 ring-1 ring-red-100 shadow-sm'
                              : 'bg-white hover:border-primary/20 hover:shadow-sm'
                      } ${userData?.role === 'super_admin' ? 'cursor-default' : ''}`}
                    >
                      <Checkbox
                        id={permission.id}
                        checked={isInherited || isGrantedDirectly || userData?.role === 'super_admin'}
                        onCheckedChange={() => handlePermissionToggle(permission.id)}
                        disabled={userData?.role === 'super_admin'}
                        className={`${isInherited ? 'data-[state=checked]:bg-primary/60 data-[state=checked]:border-primary/60' : ''}`}
                      />
                      <div className="flex flex-col">
                        <Label
                          htmlFor={permission.id}
                          className={`text-sm font-semibold ${
                            userData?.role === 'super_admin' ? 'cursor-default' : 'cursor-pointer'
                          } ${
                            isInherited ? "text-primary/80" : "text-slate-800 dark:text-slate-200"
                          }`}
                        >
                          {permission.nameAr}
                        </Label>
                        {userData?.role === 'super_admin' ? (
                          <span className="text-[10px] text-primary font-medium flex items-center gap-1">
                            <Shield className="h-2 w-2" />
                            صلاحية كاملة للمدير العام
                          </span>
                        ) : (
                          <>
                            {isInherited && (
                              <span className="text-[10px] text-primary/60 font-medium">موروثة من الدور</span>
                            )}
                            {isGrantedDirectly && (
                              <span className="text-[10px] text-emerald-600 font-medium">ممنوحة يدوياً</span>
                            )}
                            {isRevokedDirectly && (
                              <span className="text-[10px] text-red-600 font-medium">مسحوبة يدوياً</span>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Dialog لإسناد دور */}
      <Dialog open={assignRoleDialogOpen} onOpenChange={setAssignRoleDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>إسناد دور جديد</DialogTitle>
            <DialogDescription>
              اختر الدور الذي تريد إسناده للمستخدم
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <Label htmlFor="role">الدور</Label>
            <Select value={selectedRole} onValueChange={setSelectedRole}>
              <SelectTrigger id="role">
                <SelectValue placeholder="اختر دور" />
              </SelectTrigger>
              <SelectContent>
                {roles
                  ?.filter(
                    (role) =>
                      !userRoles?.some((ur) => ur.roleId === role.id) &&
                      role.isActive
                  )
                  .map((role) => (
                    <SelectItem key={role.id} value={role.id}>
                      {role.nameAr}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setAssignRoleDialogOpen(false)}
            >
              إلغاء
            </Button>
            <Button
              onClick={handleAssignRole}
              disabled={!selectedRole || assignRole.isPending}
            >
              إسناد
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
