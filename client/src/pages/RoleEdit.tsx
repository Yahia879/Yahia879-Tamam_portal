import { useState, useEffect } from "react";
import { useRoute, useLocation } from "wouter";
import { trpc } from "../lib/trpc";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { Checkbox } from "../components/ui/checkbox";
import { Shield, Save, ArrowRight, CheckSquare, Square } from "lucide-react";
import { toast } from "sonner";
import DashboardLayout from "../components/DashboardLayout";

export default function RoleEdit() {
  const [, params] = useRoute("/roles/:id");
  const [, setLocation] = useLocation();
  const roleId = params?.id;
  const isNew = roleId === "new";

  const [nameAr, setNameAr] = useState("");
  const [nameEn, setNameEn] = useState("");
  const [description, setDescription] = useState("");
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);

  const { data: structure } = trpc.permissions.getStructure.useQuery();
  const { data: rolePermissions } = trpc.permissions.getRolePermissions.useQuery(
    { roleId: roleId! },
    { enabled: !isNew && !!roleId }
  );

  const createRole = trpc.permissions.createRole.useMutation({
    onSuccess: () => {
      toast.success("تم إنشاء الدور بنجاح");
      setLocation("/roles");
    },
    onError: (error) => {
      toast.error(error.message || "فشل إنشاء الدور");
    },
  });

  const updatePermissions = trpc.permissions.updateRolePermissions.useMutation({
    onSuccess: () => {
      toast.success("تم تحديث الصلاحيات بنجاح");
      setLocation("/roles");
    },
    onError: (error) => {
      toast.error(error.message || "فشل تحديث الصلاحيات");
    },
  });

  useEffect(() => {
    if (rolePermissions) {
      setSelectedPermissions(rolePermissions);
    }
  }, [rolePermissions]);

  const handlePermissionToggle = (permissionId: string) => {
    setSelectedPermissions((prev) =>
      prev.includes(permissionId)
        ? prev.filter((p) => p !== permissionId)
        : [...prev, permissionId]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (isNew) {
      const id = nameEn.toLowerCase().replace(/\s+/g, "_");
      createRole.mutate({
        id,
        nameAr,
        nameEn,
        description,
        permissions: selectedPermissions,
      });
    } else if (roleId) {
      updatePermissions.mutate({
        roleId,
        permissions: selectedPermissions,
      });
    }
  };

  const handleSelectAllModule = (modulePermissions: { id: string }[]) => {
    const ids = modulePermissions.map((p) => p.id);
    const allSelected = ids.every((id) => selectedPermissions.includes(id));
    if (allSelected) {
      setSelectedPermissions((prev) => prev.filter((p) => !ids.includes(p)));
    } else {
      setSelectedPermissions((prev) => {
        const merged = [...prev];
        ids.forEach((id) => { if (!merged.includes(id)) merged.push(id); });
        return merged;
      });
    }
  };

  return (
    <DashboardLayout>
    <div className="container py-8 max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setLocation("/roles")}
          className="gap-1 text-muted-foreground hover:text-foreground"
        >
          <ArrowRight className="h-4 w-4" />
          رجوع
        </Button>
        <div className="p-2 bg-primary/10 rounded-lg">
          <Shield className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-3xl font-bold">
            {isNew ? "إنشاء دور جديد" : "تعديل الدور"}
          </h1>
          <p className="text-muted-foreground">
            {isNew
              ? "أضف دور جديد وحدد صلاحياته"
              : "عدّل صلاحيات الدور"}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Info */}
        {isNew && (
          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-4">المعلومات الأساسية</h2>
            <div className="space-y-4">
              <div>
                <Label htmlFor="nameAr">الاسم بالعربية *</Label>
                <Input
                  id="nameAr"
                  value={nameAr}
                  onChange={(e) => setNameAr(e.target.value)}
                  required
                  placeholder="مثال: مدير المشاريع"
                />
              </div>

              <div>
                <Label htmlFor="nameEn">الاسم بالإنجليزية *</Label>
                <Input
                  id="nameEn"
                  value={nameEn}
                  onChange={(e) => setNameEn(e.target.value)}
                  required
                  placeholder="Example: Project Manager"
                />
              </div>

              <div>
                <Label htmlFor="description">الوصف</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="وصف مختصر للدور ومسؤولياته"
                  rows={3}
                />
              </div>
            </div>
          </Card>
        )}

        {/* Permissions */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">الصلاحيات</h2>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                const allIds = structure?.flatMap((m) => m.permissions.map((p) => p.id)) || [];
                const allSelected = allIds.every((id) => selectedPermissions.includes(id));
                setSelectedPermissions(allSelected ? [] : allIds);
              }}
            >
              {structure && structure.flatMap((m) => m.permissions).every((p) => selectedPermissions.includes(p.id))
                ? <><Square className="h-4 w-4 ml-1" />إلغاء تحديد الكل</>
                : <><CheckSquare className="h-4 w-4 ml-1" />تحديد الكل</>}
            </Button>
          </div>
          <div className="space-y-6">
            {structure?.map((module) => {
              const moduleIds = module.permissions.map((p) => p.id);
              const allModuleSelected = moduleIds.every((id) => selectedPermissions.includes(id));
              return (
              <div key={module.id} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-medium flex items-center gap-2">
                    {module.icon && <span>{module.icon}</span>}
                    {module.nameAr}
                  </h3>
                  <button
                    type="button"
                    onClick={() => handleSelectAllModule(module.permissions)}
                    className="text-xs text-primary hover:underline"
                  >
                    {allModuleSelected ? "إلغاء تحديد الكل" : "تحديد الكل"}
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {module.permissions.map((permission) => (
                    <div
                      key={permission.id}
                      className="flex items-center space-x-2 space-x-reverse"
                    >
                      <Checkbox
                        id={permission.id}
                        checked={selectedPermissions.includes(permission.id)}
                        onCheckedChange={() =>
                          handlePermissionToggle(permission.id)
                        }
                      />
                      <Label
                        htmlFor={permission.id}
                        className="text-sm font-normal cursor-pointer"
                      >
                        {permission.nameAr}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
              );
            })}
          </div>
        </Card>

        {/* Actions */}
        <div className="flex justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => setLocation("/roles")}
          >
            إلغاء
          </Button>
          <Button type="submit" disabled={createRole.isPending || updatePermissions.isPending}>
            <Save className="h-4 w-4 ml-2" />
            {isNew ? "إنشاء الدور" : "حفظ التغييرات"}
          </Button>
        </div>
      </form>
    </div>
    </DashboardLayout>
  );
}
