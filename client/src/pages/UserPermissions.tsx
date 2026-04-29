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
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);

  // عرض معرف المستخدم فقط
  const userName = `مستخدم #${userId}`;

  // جلب الأدوار المتاحة
  const { data: roles } = trpc.permissions.getRoles.useQuery();

  // جلب أدوار المستخدم
  const { data: userRoles, refetch: refetchUserRoles } =
    trpc.permissions.getUserRoles.useQuery(
      { userId: userId! },
      { enabled: !!userId }
    );

  // جلب الصلاحيات الفردية
  const { data: directPermissions, refetch: refetchDirectPermissions } =
    trpc.permissions.getUserDirectPermissions.useQuery(
      { userId: userId! },
      { enabled: !!userId }
    );

  // جلب الصلاحيات النهائية
  const { data: finalPermissions } = trpc.permissions.getUserPermissions.useQuery(
    { userId: userId! },
    { enabled: !!userId }
  );

  // جلب الهيكل الهرمي
  const { data: structure } = trpc.permissions.getStructure.useQuery();

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
    if (!userId) return;

    const isGranted = directPermissions?.some(p => p.permissionId === permissionId);
    if (isGranted) {
      revokePermission.mutate({ userId, permissionId, reason: "سحب يدوي" });
    } else {
      grantPermission.mutate({ userId, permissionId, reason: "منح يدوي" });
    }
  };

  if (!userId) {
    return <div className="container py-8">معرف المستخدم غير صحيح</div>;
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
            {userRoles && userRoles.length > 0 ? (
              userRoles.map((role) => (
                <div
                  key={role.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div>
                    <p className="font-medium">{role.roleName}</p>
                    <p className="text-sm text-muted-foreground">
                      تم الإسناد: {new Date(role.assignedAt).toLocaleDateString("ar-SA")}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveRole(role.roleId)}
                  >
                    <X className="h-4 w-4 text-destructive" />
                  </Button>
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
          <h2 className="text-lg font-semibold mb-4">الصلاحيات النهائية</h2>
          <div className="space-y-3">
            {structure?.map((module) => {
              const modulePermissions = module.permissions.filter((p) =>
                finalPermissions?.includes(p.id)
              );
              if (modulePermissions.length === 0) return null;

              return (
                <div key={module.id} className="border rounded-lg p-3">
                  <h3 className="font-medium mb-2 text-sm">{module.nameAr}</h3>
                  <div className="flex flex-wrap gap-2">
                    {modulePermissions.map((permission) => (
                      <Badge key={permission.id} variant="secondary">
                        {permission.nameAr}
                      </Badge>
                    ))}
                  </div>
                </div>
              );
            })}
            {!finalPermissions || finalPermissions.length === 0 ? (
              <p className="text-center text-muted-foreground py-4">
                لا توجد صلاحيات
              </p>
            ) : null}
          </div>
        </Card>
      </div>

      {/* الصلاحيات الفردية */}
      <Card className="p-6 mt-6">
        <h2 className="text-lg font-semibold mb-4">الصلاحيات الفردية</h2>
        <p className="text-sm text-muted-foreground mb-4">
          منح أو سحب صلاحيات محددة للمستخدم بشكل مباشر (بغض النظر عن الأدوار)
        </p>

        <div className="space-y-6">
          {structure?.map((module) => (
            <div key={module.id} className="border rounded-lg p-4">
              <h3 className="font-medium mb-3 flex items-center gap-2">
                {module.icon && <span>{module.icon}</span>}
                {module.nameAr}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {module.permissions.map((permission) => {
                  const isGranted = directPermissions?.some(p => p.permissionId === permission.id);
                  const isFromRole =
                    finalPermissions?.includes(permission.id) && !isGranted;

                  return (
                    <div
                      key={permission.id}
                      className="flex items-center space-x-2 space-x-reverse"
                    >
                      <Checkbox
                        id={permission.id}
                        checked={isGranted}
                        onCheckedChange={() =>
                          handlePermissionToggle(permission.id)
                        }
                        disabled={isFromRole}
                      />
                      <Label
                        htmlFor={permission.id}
                        className={`text-sm font-normal cursor-pointer ${
                          isFromRole ? "text-muted-foreground" : ""
                        }`}
                      >
                        {permission.nameAr}
                        {isFromRole && (
                          <span className="text-xs mr-2">(من الدور)</span>
                        )}
                      </Label>
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
