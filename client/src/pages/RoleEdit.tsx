import { useState, useEffect } from "react";
import { useRoute, useLocation } from "wouter";
import { trpc } from "../lib/trpc";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Checkbox } from "../components/ui/checkbox";
import { Shield, Save, ArrowRight, CheckSquare, Square, Mosque, FileText, Users, Settings } from "lucide-react";
import { toast } from "sonner";
import DashboardLayout from "../components/DashboardLayout";

// ==================== الهيكل الثابت للصلاحيات ====================
const PERMISSIONS_STRUCTURE = [
  {
    title: "المساجد والطلبات",
    icon: "🕌",
    subsections: [
      { id: "mosques", nameAr: "المساجد" },
      { id: "mosques_map", nameAr: "خريطة المساجد" },
      { id: "requests", nameAr: "الطلبات" },
      { id: "appointments_calendar", nameAr: "تقويم المواعيد" },
      { id: "projects", nameAr: "المشاريع" },
      { id: "service_requester_accounts", nameAr: "حسابات طالبي الخدمة" },
    ],
  },
  {
    title: "المالية والعقود",
    icon: "💰",
    subsections: [
      { id: "suppliers", nameAr: "الموردون" },
      { id: "quotations", nameAr: "عروض الأسعار" },
      { id: "financial_approval", nameAr: "الاعتماد المالي" },
      { id: "contracts", nameAr: "العقود" },
      { id: "disbursement_requests", nameAr: "طلبات الصرف" },
      { id: "disbursement_orders", nameAr: "أوامر الصرف" },
      { id: "progress_reports", nameAr: "تقارير الإنجاز" },
      { id: "financial_report", nameAr: "التقرير المالي" },
    ],
  },
  {
    title: "إدارة الكادر",
    icon: "👥",
    subsections: [
      { id: "staff_management", nameAr: "إدارة الكادر" },
    ],
  },
  {
    title: "الإعدادات",
    icon: "⚙️",
    subsections: [
      { id: "settings_center", nameAr: "مركز الإعدادات" },
      { id: "programs_services", nameAr: "البرامج والخدمات" },
    ],
  },
];

// استخراج جميع معرّفات الصلاحيات من الهيكل الثابت
const ALL_PERMISSION_IDS = PERMISSIONS_STRUCTURE.flatMap(s => s.subsections.map(sub => sub.id));

export default function RoleEdit() {
  const [, params] = useRoute("/roles/:id");
  const [, setLocation] = useLocation();
  const roleId = params?.id;
  const isNew = roleId === "new";

  const [nameAr, setNameAr] = useState("");
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);

  const { data: rolePermissions } = trpc.permissions.getRolePermissions.useQuery(
    { roleId: roleId! },
    { enabled: !isNew && !!roleId }
  );

  const utils = trpc.useUtils();

  const createRole = trpc.permissions.createRole.useMutation({
    onSuccess: () => {
      toast.success("تم إنشاء الدور بنجاح");
      utils.permissions.getRoles.invalidate();
      setLocation("/staff?tab=custom-roles");
    },
    onError: (error) => {
      toast.error(error.message || "فشل إنشاء الدور");
    },
  });

  const updatePermissions = trpc.permissions.updateRolePermissions.useMutation({
    onSuccess: () => {
      toast.success("تم تحديث الصلاحيات بنجاح");
      utils.permissions.getRoles.invalidate();
      setLocation("/staff");
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

    // التحقق من صحة البيانات
    if (isNew && !nameAr.trim()) {
      toast.error("يرجى إدخال اسم الدور المخصص");
      return;
    }
    if (selectedPermissions.length === 0) {
      toast.error("يرجى تحديد صلاحية واحدة على الأقل");
      return;
    }

    if (isNew) {
      const id = `custom_role_${Date.now()}`;
      createRole.mutate({
        id,
        nameAr: nameAr.trim(),
        nameEn: nameAr.trim(),
        description: "",
        permissions: selectedPermissions,
      });
    } else if (roleId) {
      updatePermissions.mutate({
        roleId,
        permissions: selectedPermissions,
      });
    }
  };

  // تحديد الكل / إلغاء تحديد الكل
  const allGlobalSelected = ALL_PERMISSION_IDS.every(id => selectedPermissions.includes(id));

  const handleToggleAll = () => {
    if (allGlobalSelected) {
      setSelectedPermissions([]);
    } else {
      setSelectedPermissions([...ALL_PERMISSION_IDS]);
    }
  };

  // تبديل قسم كامل
  const handleToggleSection = (sectionIds: string[]) => {
    const allSelected = sectionIds.every(id => selectedPermissions.includes(id));
    if (allSelected) {
      setSelectedPermissions(prev => prev.filter(id => !sectionIds.includes(id)));
    } else {
      setSelectedPermissions(prev => {
        const merged = [...prev];
        sectionIds.forEach(id => { if (!merged.includes(id)) merged.push(id); });
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
          onClick={() => setLocation("/staff")}
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
            {isNew ? "إنشاء دور مخصص" : "تعديل الدور"}
          </h1>
          <p className="text-muted-foreground">
            {isNew
              ? "حدد اسم الدور والصلاحيات المطلوبة"
              : "عدّل صلاحيات الدور"}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Info - Name Only */}
        {isNew && (
          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-4">المعلومات الأساسية</h2>
            <div>
              <Label htmlFor="nameAr" className="pb-2 block">اسم الدور المخصص *</Label>
              <Input
                id="nameAr"
                value={nameAr}
                onChange={(e) => setNameAr(e.target.value)}
                required
                placeholder="مثال: مسؤول المشاريع"
                className="text-lg py-6"
              />
            </div>
          </Card>
        )}

        {/* Permissions Tree - Hardcoded Structure */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-primary">تحديد الصلاحيات</h2>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleToggleAll}
            >
              {allGlobalSelected
                ? <><Square className="h-4 w-4 ml-1" />إلغاء تحديد الكل</>
                : <><CheckSquare className="h-4 w-4 ml-1" />تحديد الكل</>}
            </Button>
          </div>
          
          <div className="space-y-8">
            {PERMISSIONS_STRUCTURE.map(section => {
              const sectionIds = section.subsections.map(s => s.id);
              const allSectionSelected = sectionIds.every(id => selectedPermissions.includes(id));
              const someSectionSelected = sectionIds.some(id => selectedPermissions.includes(id)) && !allSectionSelected;

              return (
                <Card key={section.title} className="p-6 overflow-hidden border-2 border-muted/50 shadow-sm hover:shadow-md transition-shadow">
                  {/* Section Header with Master Checkbox */}
                  <div className="flex items-center justify-between mb-6 border-b pb-4">
                    <div className="flex items-center gap-3">
                      <Checkbox 
                        id={`section-${section.title}`}
                        checked={allSectionSelected}
                        onCheckedChange={() => handleToggleSection(sectionIds)}
                        className="w-5 h-5 data-[state=checked]:bg-primary"
                      />
                      <span className="text-2xl">{section.icon}</span>
                      <Label htmlFor={`section-${section.title}`} className="text-xl font-bold cursor-pointer text-primary">
                        {section.title}
                      </Label>
                      {someSectionSelected && (
                        <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">
                          جزئي
                        </span>
                      )}
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {sectionIds.filter(id => selectedPermissions.includes(id)).length} / {sectionIds.length}
                    </span>
                  </div>
                  
                  {/* Sub-sections Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {section.subsections.map(sub => {
                      const isChecked = selectedPermissions.includes(sub.id);
                      
                      return (
                        <label 
                          key={sub.id}
                          htmlFor={`perm-${sub.id}`}
                          className={`flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition-all select-none ${
                            isChecked 
                              ? "bg-primary/5 border-primary/30 shadow-sm" 
                              : "bg-muted/20 border-muted hover:bg-muted/40"
                          }`}
                        >
                          <Checkbox
                            id={`perm-${sub.id}`}
                            checked={isChecked}
                            onCheckedChange={() => handlePermissionToggle(sub.id)}
                            className="data-[state=checked]:bg-primary pointer-events-none"
                          />
                          <span 
                            className={`font-medium text-base transition-colors ${
                              isChecked ? "text-primary" : "text-muted-foreground"
                            }`}
                          >
                            {sub.nameAr}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </Card>
              );
            })}
          </div>
        </Card>

        {/* Actions */}
        <div className="flex justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => setLocation("/staff")}
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
