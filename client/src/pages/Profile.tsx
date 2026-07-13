import { useState, useEffect } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { Link } from "wouter";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { User, Mail, Phone, Shield, Calendar, ArrowRight, Lock, Eye, EyeOff } from "lucide-react";
import { ROLE_LABELS } from "@shared/constants";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function Profile() {
  const { user } = useAuth();
  const utils = trpc.useUtils();

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [signatureName, setSignatureName] = useState("");
  const [signatureDepartment, setSignatureDepartment] = useState("");

  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const changePasswordMutation = trpc.auth.changePassword.useMutation({
    onSuccess: () => {
      toast.success("تم تغيير كلمة المرور بنجاح");
      setIsChangePasswordOpen(false);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setShowCurrentPassword(false);
      setShowNewPassword(false);
      setShowConfirmPassword(false);
    },
    onError: (err) => {
      toast.error(err.message || "حدث خطأ أثناء تغيير كلمة المرور");
    }
  });

  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error("كلمة المرور الجديدة وتأكيدها غير متطابقين");
      return;
    }
    if (newPassword.length < 8) {
      toast.error("كلمة المرور الجديدة يجب أن تكون 8 أحرف على الأقل");
      return;
    }
    changePasswordMutation.mutate({
      currentPassword,
      newPassword,
    });
  };

  useEffect(() => {
    if (user) {
      setName(user.name || "");
      setPhone(user.phone || "");
      setSignatureName((user as any).signatureName || "");
      setSignatureDepartment((user as any).signatureDepartment || "");
    }
  }, [user]);

  const updateProfileMutation = trpc.auth.updateProfile.useMutation({
    onSuccess: () => {
      toast.success("تم حفظ التغييرات بنجاح");
      utils.auth.me.invalidate();
    },
    onError: (err) => {
      toast.error(err.message || "حدث خطأ أثناء حفظ التغييرات");
    }
  });

  const hasSignaturePermission = (user as any)?.permissions?.includes("disbursements.sign") || (user as any)?.permissions?.includes("requests.sign_final_report") || false;

  const handleSave = () => {
    updateProfileMutation.mutate({
      name,
      phone,
      signatureName: hasSignaturePermission ? signatureName : undefined,
      signatureDepartment: hasSignaturePermission ? signatureDepartment : undefined,
    });
  };

  return (
    <DashboardLayout>
      <div className="space-y-4 sm:space-y-6 max-w-3xl">
        <div className="flex items-center gap-4">
          <Link href={user?.role === "service_requester" ? "/requester" : "/dashboard"}>
            <Button variant="ghost" size="icon" type="button">
              <ArrowRight className="w-5 h-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-foreground">الملف الشخصي</h1>
            <p className="text-xs sm:text-sm text-muted-foreground">إدارة معلوماتك الشخصية</p>
          </div>
        </div>

        <Card className="border-0 shadow-sm overflow-hidden">
          <CardHeader className="p-4 sm:p-6 pb-2 sm:pb-4">
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-6 text-center sm:text-right">
              <Avatar className="h-16 w-16 sm:h-20 sm:w-20 border-2 shrink-0">
                <AvatarFallback className="text-xl sm:text-2xl bg-primary/10 text-primary">
                  {user?.name?.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <CardTitle className="text-lg sm:text-xl truncate" title={user?.name}>{user?.name}</CardTitle>
                <CardDescription className="flex items-center justify-center sm:justify-start gap-2 mt-1 text-xs sm:text-sm truncate">
                  <Shield className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                  <span className="truncate">{ROLE_LABELS[user?.role || ""] || user?.role}</span>
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 space-y-4 sm:space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5 sm:space-y-2">
                <Label className="flex items-center gap-2 text-xs sm:text-sm">
                  <User className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-muted-foreground" />
                  الاسم الكامل
                </Label>
                <Input 
                  value={name} 
                  onChange={(e) => setName(e.target.value)} 
                  maxLength={60} 
                  className="h-9 sm:h-10 text-xs sm:text-sm" 
                />
              </div>
              <div className="space-y-1.5 sm:space-y-2">
                <Label className="flex items-center gap-2 text-xs sm:text-sm">
                  <Mail className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-muted-foreground" />
                  البريد الإلكتروني
                </Label>
                <Input type="email" defaultValue={user?.email || ""} disabled className="bg-muted h-9 sm:h-10 text-xs sm:text-sm opacity-80" />
              </div>
              <div className="space-y-1.5 sm:space-y-2">
                <Label className="flex items-center gap-2 text-xs sm:text-sm">
                  <Phone className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-muted-foreground" />
                  رقم الجوال
                </Label>
                <Input 
                  value={phone} 
                  onChange={(e) => setPhone(e.target.value)} 
                  placeholder="05xxxxxxxx" 
                  className="h-9 sm:h-10 text-xs sm:text-sm" 
                />
              </div>
              <div className="space-y-1.5 sm:space-y-2">
                <Label className="flex items-center gap-2 text-xs sm:text-sm">
                  <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-muted-foreground" />
                  تاريخ التسجيل
                </Label>
                <Input 
                  value={user?.createdAt ? new Date(user.createdAt).toLocaleDateString("ar-SA") : "-"} 
                  disabled 
                  className="bg-muted h-9 sm:h-10 text-xs sm:text-sm opacity-80"
                />
              </div>
            </div>

            {hasSignaturePermission && (
              <div className="pt-4 border-t space-y-4">
                <h3 className="text-sm font-bold text-foreground">الخاص بالتواقيع</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5 sm:space-y-2">
                    <Label className="text-xs sm:text-sm font-semibold text-slate-700">
                      الاسم الذي يظهر في المستند
                    </Label>
                    <Input 
                      value={signatureName} 
                      onChange={(e) => setSignatureName(e.target.value)} 
                      placeholder="مثال: محمد بن علي العتيبي" 
                      className="h-9 sm:h-10 text-xs sm:text-sm" 
                    />
                  </div>
                  <div className="space-y-1.5 sm:space-y-2">
                    <Label className="text-xs sm:text-sm font-semibold text-slate-700">
                      اسم الادارة الذي يظهر في المستند
                    </Label>
                    <Input 
                      value={signatureDepartment} 
                      onChange={(e) => setSignatureDepartment(e.target.value)} 
                      placeholder="مثال: مكتب إدارة المشاريع PMO" 
                      className="h-9 sm:h-10 text-xs sm:text-sm" 
                    />
                  </div>
                </div>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 pt-2 sm:pt-4 border-t">
              <Button 
                onClick={handleSave} 
                disabled={updateProfileMutation.isPending} 
                className="h-9 sm:h-10 text-sm"
              >
                {updateProfileMutation.isPending ? "جاري الحفظ..." : "حفظ التغييرات"}
              </Button>
              <Button 
                variant="outline" 
                onClick={() => {
                  setCurrentPassword("");
                  setNewPassword("");
                  setConfirmPassword("");
                  setIsChangePasswordOpen(true);
                }} 
                className="h-9 sm:h-10 text-sm"
              >
                تغيير كلمة المرور
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Dialog تغيير كلمة المرور */}
      <Dialog open={isChangePasswordOpen} onOpenChange={setIsChangePasswordOpen}>
        <DialogContent className="sm:max-w-[650px] w-[95vw] p-6 sm:p-8" dir="rtl">
          <DialogHeader className="text-right sm:text-right flex flex-col gap-1">
            <DialogTitle className="flex items-center gap-2 text-lg text-right sm:text-right">
              <Lock className="w-5 h-5 text-primary" />
              تغيير كلمة المرور
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground text-right sm:text-right mt-1">
              يرجى إدخال كلمة المرور الحالية لتأكيد هويتك، ثم تعيين كلمة مرور جديدة قوية.
            </DialogDescription>
          </DialogHeader>

           <form onSubmit={handleChangePassword} className="space-y-4 py-2 text-right">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">كلمة المرور الحالية *</Label>
              <div className="relative">
                <Input
                  type={showCurrentPassword ? "text" : "password"}
                  required
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="أدخل كلمة المرور السابقة"
                  className="text-right border-border focus:ring-primary rounded-xl h-10 bg-background text-sm pl-10 pr-3"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 focus:outline-none"
                >
                  {showCurrentPassword ? <EyeOff className="w-4.5 h-4.5" /> : <Eye className="w-4.5 h-4.5" />}
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">كلمة المرور الجديدة *</Label>
              <div className="relative">
                <Input
                  type={showNewPassword ? "text" : "password"}
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="أدخل كلمة المرور الجديدة"
                  className="text-right border-border focus:ring-primary rounded-xl h-10 bg-background text-sm pl-10 pr-3"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 focus:outline-none"
                >
                  {showNewPassword ? <EyeOff className="w-4.5 h-4.5" /> : <Eye className="w-4.5 h-4.5" />}
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">تأكيد كلمة المرور الجديدة *</Label>
              <div className="relative">
                <Input
                  type={showConfirmPassword ? "text" : "password"}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="أعد إدخال كلمة المرور الجديدة لتأكيدها"
                  className="text-right border-border focus:ring-primary rounded-xl h-10 bg-background text-sm pl-10 pr-3"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 focus:outline-none"
                >
                  {showConfirmPassword ? <EyeOff className="w-4.5 h-4.5" /> : <Eye className="w-4.5 h-4.5" />}
                </button>
              </div>
            </div>

            <DialogFooter className="flex flex-row-reverse gap-2 pt-4">
              <Button
                type="submit"
                disabled={changePasswordMutation.isPending}
                className="h-10 text-sm px-5"
              >
                {changePasswordMutation.isPending ? "جاري التغيير..." : "تحديث كلمة المرور"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsChangePasswordOpen(false)}
                className="h-10 text-sm px-5"
              >
                إلغاء
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
