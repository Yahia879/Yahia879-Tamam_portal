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
      deleteUser.mutate({ id: userId });
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
      <div className="space-y-4 sm:space-y-6">
        {/* العنوان والأزرار */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3 sm:gap-4">
            <Link href="/users">
              <Button variant="ghost" size="icon" className="shrink-0">
                <ArrowRight className="w-5 h-5" />
              </Button>
            </Link>
            <div className="min-w-0">
              <h1 className="text-xl sm:text-2xl font-bold text-foreground truncate">تفاصيل المستخدم</h1>
              <p className="text-xs sm:text-sm text-muted-foreground truncate">عرض وإدارة بيانات المستخدم</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 w-full sm:w-auto">
            <Link href={`/users/${userId}/edit`} className="flex-1 sm:flex-initial">
              <Button variant="outline" className="w-full text-xs sm:text-sm h-9 sm:h-10">
                <Edit className="w-4 h-4 ml-2" />
                تعديل
              </Button>
            </Link>
            {userId !== currentUser?.id && (
              <Button 
                variant="outline"
                onClick={handleToggleStatus}
                disabled={toggleStatus.isPending}
                className="flex-1 sm:flex-initial text-xs sm:text-sm h-9 sm:h-10"
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
            )}
            {userId !== currentUser?.id && (
              <Button 
                variant="destructive"
                onClick={handleDelete}
                disabled={deleteUser.isPending}
                className="flex-1 sm:flex-initial text-xs sm:text-sm h-9 sm:h-10"
              >
                <Trash2 className="w-4 h-4 ml-2" />
                حذف
              </Button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          {/* البطاقة الرئيسية */}
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4 sm:p-6">
              <div className="text-center">
                <Avatar className="h-20 w-20 sm:h-24 sm:w-24 mx-auto border-2">
                  <AvatarFallback className="text-2xl sm:text-3xl bg-primary/10 text-primary">
                    {user.name?.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <h2 className="text-lg sm:text-xl font-bold mt-4 truncate" title={user.name}>{user.name}</h2>
                <p className="text-xs sm:text-sm text-muted-foreground flex items-center justify-center gap-1 mt-1">
                  <Shield className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  {ROLE_LABELS[user.role] || user.role}
                </p>
                {user.role === "service_requester" && user.requesterType && (
                  <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">
                    ({getRequesterTypeLabel(user.requesterType)})
                  </p>
                )}
                <span className={`inline-block mt-3 px-3 py-1 rounded-full text-[10px] sm:text-xs font-medium ${
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
            <CardHeader className="p-4 sm:p-6 pb-2 sm:pb-3">
              <CardTitle className="text-base sm:text-lg">معلومات الاتصال</CardTitle>
              <CardDescription className="text-xs sm:text-sm">بيانات التواصل مع المستخدم</CardDescription>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg min-w-0">
                  <Mail className="w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground shrink-0" />
                  <div className="min-w-0">
                    <p className="text-[10px] sm:text-sm text-muted-foreground">البريد الإلكتروني</p>
                    <p className="font-medium text-xs sm:text-base truncate">{user.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg min-w-0">
                  <Phone className="w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground shrink-0" />
                  <div className="min-w-0">
                    <p className="text-[10px] sm:text-sm text-muted-foreground">رقم الجوال</p>
                    <p className="font-medium text-xs sm:text-base truncate">{user.phone || "-"}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg min-w-0">
                  <Calendar className="w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground shrink-0" />
                  <div className="min-w-0">
                    <p className="text-[10px] sm:text-sm text-muted-foreground">تاريخ التسجيل</p>
                    <p className="font-medium text-xs sm:text-base">
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
            <CardHeader className="p-4 sm:p-6 pb-2 sm:pb-3">
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <Building2 className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                استثناءات تسجيل المساجد
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                إدارة استثناءات تسجيل مساجد إضافية لهذا المستخدم
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4 mb-6">
                <div className="p-3 sm:p-4 bg-muted/50 rounded-lg text-center">
                  <p className="text-xl sm:text-3xl font-bold text-primary">{registeredMosquesCount}</p>
                  <p className="text-[10px] sm:text-sm text-muted-foreground">مساجد مسجلة</p>
                </div>
                <div className="p-3 sm:p-4 bg-muted/50 rounded-lg text-center">
                  <p className="text-xl sm:text-3xl font-bold text-amber-600">{user.mosqueExemptions || 0}</p>
                  <p className="text-[10px] sm:text-sm text-muted-foreground">استثناءات ممنوحة</p>
                </div>
                <div className="p-3 sm:p-4 bg-muted/50 rounded-lg text-center col-span-2 md:col-span-1">
                  <p className="text-xl sm:text-3xl font-bold text-green-600">{Math.max(0, exemptionsRemaining)}</p>
                  <p className="text-[10px] sm:text-sm text-muted-foreground">استثناءات متبقية</p>
                </div>
              </div>

              {canManageExemptions && (
                <div className="flex flex-col sm:flex-row gap-3 justify-end">
                  {(user.mosqueExemptions || 0) > 0 && (
                    <Button 
                      variant="outline" 
                      onClick={handleRevokeExemption}
                      disabled={revokeExemptionMutation.isPending}
                      className="w-full sm:w-auto h-9 sm:h-10 text-xs sm:text-sm"
                    >
                      <Minus className="w-4 h-4 ml-2" />
                      إلغاء استثناء
                    </Button>
                  )}
                  <Button 
                    onClick={() => setExemptionDialogOpen(true)}
                    className="gradient-primary text-white w-full sm:w-auto h-9 sm:h-10 text-xs sm:text-sm"
                  >
                    <Plus className="w-4 h-4 ml-2" />
                    منح استثناء
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Dialog منح الاستثناء */}
      <Dialog open={exemptionDialogOpen} onOpenChange={setExemptionDialogOpen}>
        <DialogContent className="w-[95vw] sm:max-w-md p-4 sm:p-6">
          <DialogHeader className="mb-4">
            <DialogTitle className="text-base sm:text-lg">منح استثناء لتسجيل مسجد إضافي</DialogTitle>
            <DialogDescription className="text-xs sm:text-sm leading-relaxed">
              سيسمح هذا الاستثناء للمستخدم بتسجيل مسجد إضافي بجانب المسجد الأول
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2 sm:py-4">
            <div className="space-y-1.5">
              <Label className="text-xs sm:text-sm">عدد الاستثناءات</Label>
              <Input
                type="number"
                min={1}
                max={10}
                value={exemptionCount}
                onChange={(e) => setExemptionCount(parseInt(e.target.value) || 1)}
                className="h-9 sm:h-10 text-xs sm:text-sm"
              />
              <p className="text-[10px] sm:text-xs text-muted-foreground">
                الحد الأقصى: 10 استثناءات
              </p>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs sm:text-sm">سبب منح الاستثناء (اختياري)</Label>
              <Textarea
                value={exemptionReason}
                onChange={(e) => setExemptionReason(e.target.value)}
                placeholder="أدخل سبب منح الاستثناء..."
                rows={3}
                className="text-xs sm:text-sm"
              />
            </div>
          </div>
          <DialogFooter className="flex flex-col sm:flex-row-reverse gap-2 mt-4">
            <Button 
              onClick={handleGrantExemption}
              disabled={grantExemptionMutation.isPending}
              className="gradient-primary text-white w-full sm:w-auto h-9 sm:h-10 text-xs sm:text-sm"
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
            <Button variant="outline" onClick={() => setExemptionDialogOpen(false)} className="w-full sm:w-auto h-9 sm:h-10 text-xs sm:text-sm">
              إلغاء
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
