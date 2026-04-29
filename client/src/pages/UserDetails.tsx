import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ArrowRight, User, Mail, Phone, Shield, Calendar, MapPin, FileText, Loader2, Building2, Plus, Minus, Edit, Trash2, UserCheck, UserX } from "lucide-react";
import { Link, useParams } from "wouter";
import { ROLE_LABELS } from "@shared/constants";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { useAuth } from "@/_core/hooks/useAuth";

// ترجمة صفة طالب الخدمة
const getRequesterTypeLabel = (type: string | null | undefined) => {
  const types: Record<string, string> = {
    imam: "إمام المسجد",
    muezzin: "مؤذن المسجد",
    board_member: "عضو مجلس إدارة",
    committee_member: "عضو لجنة",
    volunteer: "متطوع",
    donor: "متبرع",
  };
  return types[type || ""] || type || "غير محدد";
};

export default function UserDetails() {
  const params = useParams<{ id: string }>();
  const userId = parseInt(params.id || "0");
  const { user: currentUser } = useAuth();
  const utils = trpc.useUtils();

  // حالة Dialog منح الاستثناء
  const [exemptionDialogOpen, setExemptionDialogOpen] = useState(false);
  const [exemptionCount, setExemptionCount] = useState(1);
  const [exemptionReason, setExemptionReason] = useState("");

  // جلب بيانات المستخدم من قاعدة البيانات
  const { data: user, isLoading, error } = trpc.auth.getUserById.useQuery(
    { userId },
    { enabled: userId > 0 }
  );

  // جلب مساجد المستخدم
  const { data: userMosques } = trpc.mosques.search.useQuery(
    { page: 1, limit: 100 },
    { enabled: userId > 0 && user?.role === "service_requester" }
  );

  // mutation لمنح الاستثناء
  const grantExemptionMutation = trpc.auth.grantMosqueExemption.useMutation({
    onSuccess: (data) => {
      toast.success(data.message);
      setExemptionDialogOpen(false);
      setExemptionCount(1);
      setExemptionReason("");
      utils.auth.getUserById.invalidate({ userId });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  // mutation لإلغاء الاستثناء
  const revokeExemptionMutation = trpc.auth.revokeMosqueExemption.useMutation({
    onSuccess: (data) => {
      toast.success(data.message);
      utils.auth.getUserById.invalidate({ userId });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  // mutation لتغيير حالة المستخدم
  const toggleStatus = trpc.users.toggleStatus.useMutation({
    onSuccess: () => {
      toast.success("تم تحديث حالة المستخدم بنجاح");
      utils.auth.getUserById.invalidate({ userId });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  // mutation لحذف المستخدم
  const deleteUser = trpc.users.delete.useMutation({
    onSuccess: () => {
      toast.success("تم حذف المستخدم بنجاح");
      window.location.href = "/users";
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleGrantExemption = () => {
    grantExemptionMutation.mutate({
      userId,
      exemptions: exemptionCount,
      reason: exemptionReason || undefined,
    });
  };

  const handleRevokeExemption = () => {
    if (confirm("هل أنت متأكد من إلغاء استثناء واحد؟")) {
      revokeExemptionMutation.mutate({
        userId,
        exemptions: 1,
      });
    }
  };

  const handleToggleStatus = () => {
    const newStatus = user?.status === "active" ? "suspended" : "active";
    toggleStatus.mutate({ userId, status: newStatus });
  };

  const handleDelete = () => {
    if (confirm(`هل أنت متأكد من حذف المستخدم "${user?.name}"؟`)) {
      deleteUser.mutate({ userId });
    }
  };

  // التحقق من صلاحية منح الاستثناء
  const canManageExemptions = currentUser && ["super_admin", "system_admin", "projects_office"].includes(currentUser.role);

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
            <p className="text-muted-foreground">جاري تحميل البيانات...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (error || !user) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-screen">
          <Card className="border-0 shadow-sm max-w-md w-full">
            <CardContent className="p-6 text-center">
              <p className="text-destructive mb-4">حدث خطأ في تحميل بيانات المستخدم</p>
              <Link href="/users">
                <Button variant="outline" className="w-full">
                  العودة إلى قائمة المستخدمين
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  // حساب عدد المساجد المسجلة من قبل المستخدم
  const registeredMosquesCount = userMosques?.mosques?.filter(m => m.registeredBy === user.id).length || 0;
  const exemptionsRemaining = (user.mosqueExemptions || 0) - Math.max(0, registeredMosquesCount - 1);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* العنوان والأزرار */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/users">
              <Button variant="ghost" size="icon">
                <ArrowRight className="w-5 h-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-foreground">تفاصيل المستخدم</h1>
              <p className="text-muted-foreground">عرض وإدارة بيانات المستخدم</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Link href={`/users/${userId}/permissions`}>
              <Button variant="outline">
                <Shield className="w-4 h-4 ml-2" />
                إدارة الصلاحيات
              </Button>
            </Link>
            <Link href={`/users/${userId}/edit`}>
              <Button variant="outline">
                <Edit className="w-4 h-4 ml-2" />
                تعديل
              </Button>
            </Link>
            <Button 
              variant="outline"
              onClick={handleToggleStatus}
              disabled={toggleStatus.isPending}
            >
              {user?.status === "active" ? (
                <>
                  <UserX className="w-4 h-4 ml-2" />
                  إيقاف
                </>
              ) : (
                <>
                  <UserCheck className="w-4 h-4 ml-2" />
                  تنشيط
                </>
              )}
            </Button>
            <Button 
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteUser.isPending}
            >
              <Trash2 className="w-4 h-4 ml-2" />
              حذف
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* البطاقة الرئيسية */}
          <Card className="border-0 shadow-sm">
            <CardContent className="p-6">
              <div className="text-center">
                <Avatar className="h-24 w-24 mx-auto border-2">
                  <AvatarFallback className="text-3xl bg-primary/10 text-primary">
                    {user.name?.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <h2 className="text-xl font-bold mt-4">{user.name}</h2>
                <p className="text-muted-foreground flex items-center justify-center gap-1 mt-1">
                  <Shield className="w-4 h-4" />
                  {ROLE_LABELS[user.role] || user.role}
                </p>
                {user.role === "service_requester" && user.requesterType && (
                  <p className="text-sm text-muted-foreground mt-1">
                    ({getRequesterTypeLabel(user.requesterType)})
                  </p>
                )}
                <span className={`inline-block mt-3 px-3 py-1 rounded-full text-sm font-medium ${
                  user.status === "active" 
                    ? "bg-green-100 text-green-800" 
                    : user.status === "pending"
                    ? "bg-yellow-100 text-yellow-800"
                    : "bg-red-100 text-red-800"
                }`}>
                  {user.status === "active" ? "نشط" : user.status === "pending" ? "قيد الانتظار" : "معلق"}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* معلومات الاتصال */}
          <Card className="lg:col-span-2 border-0 shadow-sm">
            <CardHeader>
              <CardTitle>معلومات الاتصال</CardTitle>
              <CardDescription>بيانات التواصل مع المستخدم</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                  <Mail className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">البريد الإلكتروني</p>
                    <p className="font-medium">{user.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                  <Phone className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">رقم الجوال</p>
                    <p className="font-medium">{user.phone || "-"}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                  <MapPin className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">المدينة</p>
                    <p className="font-medium">{user.city || "-"}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                  <Calendar className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">تاريخ التسجيل</p>
                    <p className="font-medium">
                      {user.createdAt ? new Date(user.createdAt).toLocaleDateString("ar-SA") : "-"}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* استثناءات تسجيل المساجد - لطالبي الخدمة فقط */}
        {user.role === "service_requester" && (
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="w-5 h-5" />
                استثناءات تسجيل المساجد
              </CardTitle>
              <CardDescription>
                إدارة استثناءات تسجيل مساجد إضافية لهذا المستخدم
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="p-4 bg-muted/50 rounded-lg text-center">
                  <p className="text-3xl font-bold text-primary">{registeredMosquesCount}</p>
                  <p className="text-sm text-muted-foreground">مساجد مسجلة</p>
                </div>
                <div className="p-4 bg-muted/50 rounded-lg text-center">
                  <p className="text-3xl font-bold text-amber-600">{user.mosqueExemptions || 0}</p>
                  <p className="text-sm text-muted-foreground">استثناءات ممنوحة</p>
                </div>
                <div className="p-4 bg-muted/50 rounded-lg text-center">
                  <p className="text-3xl font-bold text-green-600">{Math.max(0, exemptionsRemaining)}</p>
                  <p className="text-sm text-muted-foreground">استثناءات متبقية</p>
                </div>
              </div>

              {canManageExemptions && (
                <div className="flex gap-3 justify-end">
                  {(user.mosqueExemptions || 0) > 0 && (
                    <Button 
                      variant="outline" 
                      onClick={handleRevokeExemption}
                      disabled={revokeExemptionMutation.isPending}
                    >
                      <Minus className="w-4 h-4 ml-2" />
                      إلغاء استثناء
                    </Button>
                  )}
                  <Button 
                    onClick={() => setExemptionDialogOpen(true)}
                    className="gradient-primary text-white"
                  >
                    <Plus className="w-4 h-4 ml-2" />
                    منح استثناء
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* طلبات المستخدم */}
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              طلبات المستخدم
            </CardTitle>
            <CardDescription>الطلبات المقدمة من هذا المستخدم</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-center py-8">
              لا توجد طلبات لهذا المستخدم حالياً
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Dialog منح الاستثناء */}
      <Dialog open={exemptionDialogOpen} onOpenChange={setExemptionDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>منح استثناء لتسجيل مسجد إضافي</DialogTitle>
            <DialogDescription>
              سيسمح هذا الاستثناء للمستخدم بتسجيل مسجد إضافي بجانب المسجد الأول
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>عدد الاستثناءات</Label>
              <Input
                type="number"
                min={1}
                max={10}
                value={exemptionCount}
                onChange={(e) => setExemptionCount(parseInt(e.target.value) || 1)}
              />
              <p className="text-sm text-muted-foreground mt-1">
                الحد الأقصى: 10 استثناءات
              </p>
            </div>
            <div>
              <Label>سبب منح الاستثناء (اختياري)</Label>
              <Textarea
                value={exemptionReason}
                onChange={(e) => setExemptionReason(e.target.value)}
                placeholder="أدخل سبب منح الاستثناء..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setExemptionDialogOpen(false)}>
              إلغاء
            </Button>
            <Button 
              onClick={handleGrantExemption}
              disabled={grantExemptionMutation.isPending}
              className="gradient-primary text-white"
            >
              {grantExemptionMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                  جاري المنح...
                </>
              ) : (
                "منح الاستثناء"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
