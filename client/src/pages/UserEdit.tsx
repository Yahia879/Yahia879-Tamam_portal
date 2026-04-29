import { useState, useEffect } from "react";
import { useParams, Link, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowRight, Save, Loader2 } from "lucide-react";
import { toast } from "sonner";
import DashboardLayout from "@/components/DashboardLayout";

const ROLE_OPTIONS = [
  { value: "super_admin", label: "المدير العام" },
  { value: "system_admin", label: "مدير النظام" },
  { value: "projects_office", label: "مكتب المشاريع" },
  { value: "field_team", label: "الفريق الميداني" },
  { value: "quick_response", label: "فريق الاستجابة السريعة" },
  { value: "financial", label: "الإدارة المالية" },
  { value: "project_manager", label: "مدير المشروع" },
  { value: "corporate_comm", label: "الاتصال المؤسسي" },
  { value: "service_requester", label: "طالب الخدمة" },
];

const STATUS_OPTIONS = [
  { value: "active", label: "نشط" },
  { value: "pending", label: "قيد المراجعة" },
  { value: "suspended", label: "معطل" },
  { value: "blocked", label: "محظور" },
];

export default function UserEdit() {
  const params = useParams<{ id: string }>();
  const userId = parseInt(params.id || "0");
  const [, setLocation] = useLocation();

  const { data: user, isLoading } = trpc.users.getById.useQuery({ id: userId });
  const utils = trpc.useUtils();

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    role: "",
    status: "",
  });

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || "",
        email: user.email || "",
        phone: user.phone || "",
        role: user.role || "",
        status: user.status || "active",
      });
    }
  }, [user]);

  const updateMutation = trpc.users.update.useMutation({
    onSuccess: () => {
      toast.success("تم تحديث بيانات المستخدم بنجاح");
      utils.users.getById.invalidate({ id: userId });
      utils.users.getAll.invalidate();
      setLocation(`/users/${userId}`);
    },
    onError: (error: any) => {
      toast.error(`خطأ: ${error.message}`);
    },
  });

  const updateRoleMutation = trpc.users.updateRole.useMutation({
    onSuccess: () => {
      utils.users.getById.invalidate({ id: userId });
      utils.users.getAll.invalidate();
    },
    onError: (error: any) => {
      toast.error(`خطأ في تحديث الدور: ${error.message}`);
    },
  });

  const updateStatusMutation = trpc.users.toggleStatus.useMutation({
    onSuccess: () => {
      utils.users.getById.invalidate({ id: userId });
      utils.users.getAll.invalidate();
    },
    onError: (error: any) => {
      toast.error(`خطأ في تحديث الحالة: ${error.message}`);
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // تحديث البيانات الأساسية
    updateMutation.mutate({
      id: userId,
      name: formData.name,
      email: formData.email,
      phone: formData.phone || undefined,
    });

    // تحديث الدور إذا تغيّر
    if (user && formData.role !== user.role && formData.role) {
      updateRoleMutation.mutate({ userId, role: formData.role as any });
    }

    // تحديث الحالة إذا تغيّرت
    if (user && formData.status !== user.status && formData.status) {
      updateStatusMutation.mutate({ userId, status: formData.status as any });
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  if (!user) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <p className="text-muted-foreground">المستخدم غير موجود</p>
          <Link href="/users">
            <Button variant="outline" className="mt-4">العودة لإدارة المستخدمين</Button>
          </Link>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="container max-w-2xl mx-auto py-8">
        {/* رأس الصفحة */}
        <div className="flex items-center gap-4 mb-6">
          <Link href={`/users/${userId}`}>
            <Button variant="ghost" size="icon">
              <ArrowRight className="w-5 h-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">تعديل بيانات المستخدم</h1>
            <p className="text-muted-foreground text-sm">{user.name}</p>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <Card>
            <CardHeader>
              <CardTitle>البيانات الأساسية</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="name">الاسم الكامل</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="أدخل الاسم الكامل"
                  className="mt-1"
                  required
                />
              </div>

              <div>
                <Label htmlFor="email">البريد الإلكتروني</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="example@domain.com"
                  className="mt-1"
                  required
                />
              </div>

              <div>
                <Label htmlFor="phone">رقم الجوال</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                  placeholder="05xxxxxxxx"
                  className="mt-1"
                  dir="ltr"
                />
              </div>

              <div>
                <Label htmlFor="role">الدور الوظيفي</Label>
                <Select
                  value={formData.role}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, role: value }))}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="اختر الدور" />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLE_OPTIONS.map(option => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="status">حالة الحساب</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, status: value }))}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="اختر الحالة" />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map(option => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <div className="flex gap-3 mt-6">
            <Button
              type="submit"
              className="gradient-primary text-white"
              disabled={updateMutation.isPending}
            >
              {updateMutation.isPending ? (
                <Loader2 className="w-4 h-4 ml-2 animate-spin" />
              ) : (
                <Save className="w-4 h-4 ml-2" />
              )}
              حفظ التغييرات
            </Button>
            <Link href={`/users/${userId}`}>
              <Button type="button" variant="outline">إلغاء</Button>
            </Link>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
}
