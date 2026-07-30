import { useState, useEffect } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { Link } from "wouter";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { User, Mail, Phone, Shield, Calendar, ArrowRight, Lock, Eye, EyeOff, Upload, Trash2, Image as ImageIcon, Loader2, PenTool, CheckCircle2 } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { ROLE_LABELS } from "@shared/constants";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { useAnyPermission } from "@/hooks/usePermission";
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
  const [signatureUrl, setSignatureUrl] = useState<string | null>(null);
  const [showSignatureInDocuments, setShowSignatureInDocuments] = useState<boolean>(true);
  const [uploadingSignature, setUploadingSignature] = useState(false);

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

  const uploadSignatureMutation = trpc.auth.uploadSignature.useMutation({
    onSuccess: (data) => {
      toast.success("تم رفع التوقيع الرقمي بنجاح");
      setSignatureUrl(data.url);
      utils.auth.me.invalidate();
      utils.organization.getSignatories.invalidate();
    },
    onError: (err) => {
      toast.error(err.message || "حدث خطأ أثناء رفع التوقيع الرقمي");
    }
  });

  const removeSignatureMutation = trpc.auth.removeSignature.useMutation({
    onSuccess: () => {
      toast.success("تم حذف التوقيع الرقمي بنجاح");
      setSignatureUrl(null);
      utils.auth.me.invalidate();
      utils.organization.getSignatories.invalidate();
    },
    onError: (err) => {
      toast.error(err.message || "حدث خطأ أثناء حذف التوقيع الرقمي");
    }
  });

  const handleSignatureFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error("حجم صورة التوقيع يجب أن يكون أقل من 5MB");
      return;
    }

    const allowedTypes = ["image/png", "image/jpeg", "image/jpg", "image/webp", "image/svg+xml"];
    if (!allowedTypes.includes(file.type)) {
      toast.error("يرجى اختيار صورة صالحة (PNG, JPG, WEBP, SVG)");
      return;
    }

    setUploadingSignature(true);
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          resolve(result.split(",")[1]);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      await uploadSignatureMutation.mutateAsync({
        fileData: base64,
        fileName: file.name,
        mimeType: file.type,
      });
    } catch (error: any) {
      console.error('[uploadSignature] Error:', error);
    } finally {
      setUploadingSignature(false);
      e.target.value = "";
    }
  };

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
      setSignatureUrl((user as any).signatureUrl || null);
      setShowSignatureInDocuments((user as any).showSignatureInDocuments ?? true);
    }
  }, [user]);

  const updateProfileMutation = trpc.auth.updateProfile.useMutation({
    onSuccess: () => {
      toast.success("تم حفظ التغييرات بنجاح");
      utils.auth.me.invalidate();
      utils.organization.getSignatories.invalidate();
      utils.organization.getSettings.invalidate();
    },
    onError: (err) => {
      toast.error(err.message || "حدث خطأ أثناء حفظ التغييرات");
    }
  });

  const hasDisbursementSignPermission = useAnyPermission([
    "disbursements.sign",
    "disbursement_orders.sign",
  ]);

  const hasFinalReportSignPermission = useAnyPermission([
    "requests.sign_final_report",
    "final_reports.sign",
  ]);

  const hasSignaturePermission =
    user?.role === "super_admin" ||
    user?.role === "system_admin" ||
    hasDisbursementSignPermission ||
    hasFinalReportSignPermission;

  const handleSave = () => {
    updateProfileMutation.mutate({
      name,
      phone,
      signatureName: hasSignaturePermission ? signatureName : undefined,
      signatureDepartment: hasSignaturePermission ? signatureDepartment : undefined,
      showSignatureInDocuments: hasSignaturePermission ? showSignatureInDocuments : undefined,
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
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                    <PenTool className="w-4 h-4 text-primary" />
                    الخاص بالتواقيع
                  </h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5 sm:space-y-2">
                    <Label className="text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300">
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
                    <Label className="text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300">
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

                {/* رفع صورة التوقيع الرقمي */}
                <div className="space-y-2 pt-2">
                  <Label className="text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                    <Upload className="w-4 h-4 text-primary" />
                    التوقيع الرقمي (صورة التوقيع)
                  </Label>
                  
                  {signatureUrl ? (
                    <div className="p-4 border border-dashed rounded-xl bg-slate-50 dark:bg-slate-900/50 flex flex-col sm:flex-row items-center justify-between gap-4">
                      <div className="flex items-center gap-4">
                        <div className="bg-white p-2 rounded-lg border shadow-sm max-w-[180px] max-h-[90px] flex items-center justify-center overflow-hidden">
                          <img 
                            src={signatureUrl} 
                            alt="التوقيع الرقمي" 
                            className="max-h-[70px] w-auto object-contain" 
                          />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            تم رفع التوقيع الرقمي وحفظه
                          </p>
                          <p className="text-[11px] text-muted-foreground mt-0.5">
                            سيتم استخدام صورة هذا التوقيع في التوقيع الإلكتروني على المستندات.
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <label className="cursor-pointer">
                          <input 
                            type="file" 
                            accept="image/png,image/jpeg,image/jpg,image/webp,image/svg+xml" 
                            className="hidden" 
                            onChange={handleSignatureFileUpload} 
                            disabled={uploadingSignature || removeSignatureMutation.isPending}
                          />
                          <Button 
                            variant="outline" 
                            size="sm" 
                            type="button"
                            asChild
                            disabled={uploadingSignature || removeSignatureMutation.isPending}
                            className="h-8 text-xs gap-1.5"
                          >
                            <span>
                              {uploadingSignature ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <Upload className="w-3.5 h-3.5 text-primary" />
                              )}
                              تغيير التوقيع
                            </span>
                          </Button>
                        </label>

                        <Button 
                          variant="ghost" 
                          size="sm" 
                          type="button"
                          onClick={() => {
                            if (confirm("هل أنت متأكد من حذف صورة التوقيع الرقمي؟")) {
                              removeSignatureMutation.mutate();
                            }
                          }}
                          disabled={uploadingSignature || removeSignatureMutation.isPending}
                          className="h-8 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20 gap-1.5"
                        >
                          {removeSignatureMutation.isPending ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="w-3.5 h-3.5" />
                          )}
                          حذف
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="p-6 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-900/20 text-center space-y-3">
                      <div className="w-12 h-12 rounded-full bg-primary/10 text-primary mx-auto flex items-center justify-center">
                        {uploadingSignature ? (
                          <Loader2 className="w-6 h-6 animate-spin" />
                        ) : (
                          <ImageIcon className="w-6 h-6" />
                        )}
                      </div>
                      <div>
                        <p className="text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-200">
                          {uploadingSignature ? "جاري رفع التوقيع الرقمي..." : "قم برفع صورة التوقيع الرقمي الخاصة بك"}
                        </p>
                        <p className="text-[11px] text-muted-foreground mt-1">
                          يُفضل صورة بصيغة PNG شفافة بحجم أقل من 5MB لتظهر بوضوح عند الاعتماد في المستندات.
                        </p>
                      </div>
                      <div>
                        <label className="cursor-pointer inline-block">
                          <input 
                            type="file" 
                            accept="image/png,image/jpeg,image/jpg,image/webp,image/svg+xml" 
                            className="hidden" 
                            onChange={handleSignatureFileUpload}
                            disabled={uploadingSignature}
                          />
                          <Button 
                            variant="default" 
                            size="sm" 
                            type="button"
                            asChild
                            disabled={uploadingSignature}
                            className="h-9 text-xs font-bold gap-2 shadow-sm"
                          >
                            <span>
                              {uploadingSignature ? (
                                <>
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                  جاري الرفع...
                                </>
                              ) : (
                                <>
                                  <Upload className="w-4 h-4" />
                                  اختيار صورة التوقيع
                                </>
                              )}
                            </span>
                          </Button>
                        </label>
                      </div>
                    </div>
                  )}

                  {/* خيار إظهار التوقيع الرسمي في المستندات الموكلة */}
                  <div className="flex items-center gap-2 pt-3 border-t mt-3">
                    <Checkbox 
                      id="showSignatureInDocuments" 
                      checked={showSignatureInDocuments} 
                      onCheckedChange={(checked) => {
                        const val = !!checked;
                        setShowSignatureInDocuments(val);
                        updateProfileMutation.mutate({
                          signatureName: hasSignaturePermission ? signatureName : undefined,
                          signatureDepartment: hasSignaturePermission ? signatureDepartment : undefined,
                          showSignatureInDocuments: val,
                        });
                      }} 
                    />
                    <Label htmlFor="showSignatureInDocuments" className="text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-300 cursor-pointer">
                      اظهار التوقيع الرسمي في المستندات الموكلة لك
                    </Label>
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
