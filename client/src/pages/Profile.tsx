import { useState, useEffect } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { Link } from "wouter";
import DashboardLayout from "@/components/DashboardLayout";
import BeneficiaryLayout from "@/components/BeneficiaryLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  User,
  Mail,
  Phone,
  Shield,
  Calendar,
  ArrowRight,
  Lock,
  Eye,
  EyeOff,
  Upload,
  Trash2,
  Image as ImageIcon,
  Loader2,
  PenTool,
  CheckCircle2,
  Save,
} from "lucide-react";
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

  const handleSignatureFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error("حجم صورة التوقيع يجب أن يكون أقل من 5MB");
      return;
    }

    const allowedTypes = [
      "image/png", "image/jpeg", "image/jpg", "image/webp", "image/svg+xml",
      "image/heic", "image/heif", "image/heic-sequence", "image/heif-sequence", "image/x-heic",
      "application/heic", "application/octet-stream", ""
    ];
    const ext = file.name.split('.').pop()?.toLowerCase() || '';
    const isHeic = ["heic", "heif"].includes(ext);

    if (!allowedTypes.includes(file.type) && !isHeic) {
      toast.error("يرجى اختيار صورة صالحة (PNG, JPG, WEBP, SVG, HEIC, HEIF)");
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
        mimeType: file.type || "image/png",
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

  const hasDisbursementSignPermission = useAnyPermission([
    "disbursements.sign",
    "disbursements_sign",
    "signing.disbursements_sign",
  ]);

  const hasDisbursementOrderSignPermission = useAnyPermission([
    "disbursement_orders.sign",
    "disbursement_orders_sign",
    "signing.disbursement_orders_sign",
  ]);

  const hasFinalReportSignPermission = useAnyPermission([
    "requests.sign_final_report",
    "final_reports.sign",
    "final_reports_sign",
    "signing.final_reports_sign",
  ]);

  const hasReceiptVoucherSignPermission = useAnyPermission([
    "receipt_vouchers.sign",
    "vouchers.sign_receipt",
    "receipt_vouchers_sign",
    "signing.receipt_vouchers_sign",
  ]);

  const hasSignaturePermission =
    user?.role === "super_admin" ||
    user?.role === "system_admin" ||
    hasDisbursementSignPermission ||
    hasDisbursementOrderSignPermission ||
    hasFinalReportSignPermission ||
    hasReceiptVoucherSignPermission;

  const handleSave = () => {
    updateProfileMutation.mutate({
      name,
      phone,
      signatureName: hasSignaturePermission ? signatureName : undefined,
      signatureDepartment: hasSignaturePermission ? signatureDepartment : undefined,
      showSignatureInDocuments: hasSignaturePermission ? showSignatureInDocuments : undefined,
    });
  };

  const isRequester = user?.role === "service_requester";
  const Layout = isRequester ? BeneficiaryLayout : DashboardLayout;

  return (
    <Layout>
      <div className="space-y-4 sm:space-y-6 max-w-4xl mx-auto pb-10">
        {/* Top Header */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link href={user?.role === "service_requester" ? "/requester" : "/dashboard"}>
              <Button variant="ghost" size="icon" type="button" className="rounded-xl hover:bg-muted/80 shrink-0 cursor-pointer">
                <ArrowRight className="w-5 h-5 text-foreground" />
              </Button>
            </Link>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-foreground">الملف الشخصي</h1>
              <p className="text-xs sm:text-sm text-muted-foreground">إدارة معلوماتك الشخصية وإعدادات الحساب</p>
            </div>
          </div>
        </div>

        {/* Profile Card */}
        <Card className="border border-border/70 shadow-xs rounded-2xl overflow-hidden bg-card">
          {/* Header Banner */}
          <div className="h-16 sm:h-20 bg-gradient-to-r from-primary/20 via-primary/10 to-primary/5 border-b border-border/40" />

          {/* User Info Header */}
          <CardHeader className="p-4 sm:p-6 pt-0 pb-4 border-b border-border/40 relative">
            <div className="flex flex-col sm:flex-row items-center sm:items-end justify-between gap-4 -mt-10 sm:-mt-12">
              <div className="flex flex-col sm:flex-row items-center sm:items-end gap-4 text-center sm:text-right">
                <Avatar className="h-18 w-18 sm:h-22 sm:w-22 border-4 border-background ring-4 ring-primary/15 shadow-sm rounded-2xl shrink-0 bg-primary/10">
                  <AvatarFallback className="text-2xl sm:text-3xl font-black bg-primary/10 text-primary rounded-2xl">
                    {user?.name?.charAt(0).toUpperCase() || "U"}
                  </AvatarFallback>
                </Avatar>
                <div className="space-y-1">
                  <CardTitle className="text-lg sm:text-xl font-black text-foreground" title={user?.name}>
                    {user?.name}
                  </CardTitle>
                  <CardDescription className="flex items-center justify-center sm:justify-start gap-1.5 text-xs text-muted-foreground">
                    <Shield className="w-3.5 h-3.5 text-primary shrink-0" />
                    <span className="font-semibold">{ROLE_LABELS[user?.role || ""] || user?.role}</span>
                  </CardDescription>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-xs font-bold gap-1 px-2.5 py-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  حساب نشط
                </Badge>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-4 sm:p-6 space-y-6">
            {/* 4 Main Information Fields */}
            <div>
              <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">
                البيانات الأساسية
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="flex items-center gap-2 text-xs sm:text-sm font-semibold text-foreground">
                    <User className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary" />
                    الاسم الكامل
                  </Label>
                  <Input 
                    value={name} 
                    onChange={(e) => setName(e.target.value)} 
                    maxLength={60} 
                    placeholder="أدخل اسمك الكامل"
                    className="h-10 rounded-xl border-border/70 text-xs sm:text-sm bg-background focus:ring-primary/20" 
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="flex items-center gap-2 text-xs sm:text-sm font-semibold text-foreground">
                    <Mail className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary" />
                    البريد الإلكتروني
                  </Label>
                  <Input 
                    type="email" 
                    defaultValue={user?.email || ""} 
                    disabled 
                    className="bg-muted/60 h-10 rounded-xl text-xs sm:text-sm border-border/40 text-muted-foreground opacity-90 cursor-not-allowed" 
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="flex items-center gap-2 text-xs sm:text-sm font-semibold text-foreground">
                    <Phone className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary" />
                    رقم الجوال
                  </Label>
                  <Input 
                    value={phone} 
                    onChange={(e) => setPhone(e.target.value)} 
                    placeholder="05xxxxxxxx" 
                    dir="ltr"
                    className="h-10 rounded-xl border-border/70 text-xs sm:text-sm bg-background text-right focus:ring-primary/20" 
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="flex items-center gap-2 text-xs sm:text-sm font-semibold text-foreground">
                    <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary" />
                    تاريخ التسجيل
                  </Label>
                  <Input 
                    value={user?.createdAt ? new Date(user.createdAt).toLocaleDateString("ar-SA") : "-"} 
                    disabled 
                    className="bg-muted/60 h-10 rounded-xl text-xs sm:text-sm border-border/40 text-muted-foreground opacity-90 cursor-not-allowed"
                  />
                </div>
              </div>
            </div>

            {/* Signature Section (If user has permission) */}
            {hasSignaturePermission && (
              <div className="pt-5 border-t border-border/50 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                    <PenTool className="w-4 h-4 text-primary" />
                    الخاص بالتواقيع
                  </h3>
                  <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 text-[10px] sm:text-xs font-bold">
                    معتمد للتوقيع الرسمي
                  </Badge>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs sm:text-sm font-semibold text-foreground">
                      الاسم الذي يظهر في المستند
                    </Label>
                    <Input 
                      value={signatureName} 
                      onChange={(e) => setSignatureName(e.target.value)} 
                      placeholder="مثال: محمد بن علي العتيبي" 
                      className="h-10 rounded-xl border-border/70 text-xs sm:text-sm bg-background" 
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs sm:text-sm font-semibold text-foreground">
                      اسم الادارة الذي يظهر في المستند
                    </Label>
                    <Input 
                      value={signatureDepartment} 
                      onChange={(e) => setSignatureDepartment(e.target.value)} 
                      placeholder="مثال: مكتب إدارة المشاريع PMO" 
                      className="h-10 rounded-xl border-border/70 text-xs sm:text-sm bg-background" 
                    />
                  </div>
                </div>

                {/* Upload & Preview Signature */}
                <div className="space-y-2 pt-1">
                  <Label className="text-xs sm:text-sm font-semibold text-foreground flex items-center gap-2">
                    <Upload className="w-4 h-4 text-primary" />
                    التوقيع الرقمي (صورة التوقيع)
                  </Label>
                  
                  {signatureUrl ? (
                    <div className="p-4 sm:p-5 border border-border/80 rounded-2xl bg-muted/20 flex flex-col sm:flex-row items-center justify-between gap-4">
                      <div className="flex flex-col sm:flex-row items-center gap-4 text-center sm:text-right">
                        <div className="bg-white dark:bg-slate-950 p-2.5 rounded-xl border border-border/80 shadow-xs max-w-[180px] h-[85px] flex items-center justify-center overflow-hidden">
                          <img 
                            src={signatureUrl} 
                            alt="التوقيع الرقمي" 
                            className="max-h-[68px] w-auto object-contain" 
                          />
                        </div>
                        <div className="space-y-0.5">
                          <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center justify-center sm:justify-start gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            تم رفع التوقيع الرقمي وحفظه
                          </p>
                          <p className="text-[11px] text-muted-foreground">
                            سيتم استخدام صورة هذا التوقيع في التوقيع الإلكتروني على المستندات.
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <label className="cursor-pointer">
                          <input 
                            type="file" 
                            accept="image/*,image/png,image/jpeg,image/jpg,image/webp,image/heic,image/heif,image/svg+xml,.heic,.heif,.jpg,.jpeg,.png" 
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
                            className="h-9 text-xs font-bold rounded-xl gap-1.5 cursor-pointer"
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
                          className="h-9 text-xs font-bold rounded-xl text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/20 gap-1.5 cursor-pointer"
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
                    <div className="p-6 border-2 border-dashed border-border/80 rounded-2xl bg-muted/20 text-center space-y-3 hover:border-primary/50 transition-colors">
                      <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary mx-auto flex items-center justify-center shadow-xs">
                        {uploadingSignature ? (
                          <Loader2 className="w-6 h-6 animate-spin" />
                        ) : (
                          <ImageIcon className="w-6 h-6" />
                        )}
                      </div>
                      <div className="max-w-md mx-auto">
                        <p className="text-xs sm:text-sm font-bold text-foreground">
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
                            accept="image/*,image/png,image/jpeg,image/jpg,image/webp,image/heic,image/heif,image/svg+xml,.heic,.heif,.jpg,.jpeg,.png" 
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
                            className="gradient-primary text-white h-9 px-4 text-xs font-bold gap-2 rounded-xl shadow-xs cursor-pointer"
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
                  <div className="flex items-center gap-2 pt-3 border-t border-border/40 mt-3">
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
                    <Label htmlFor="showSignatureInDocuments" className="text-xs sm:text-sm font-medium text-foreground cursor-pointer">
                      اظهار التوقيع الرسمي في المستندات الموكلة لك
                    </Label>
                  </div>
                </div>
              </div>
            )}

            {/* Actions Bar */}
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 pt-4 border-t border-border/50">
              <Button 
                onClick={handleSave} 
                disabled={updateProfileMutation.isPending} 
                className="gradient-primary text-white font-bold h-10 px-5 rounded-xl text-xs sm:text-sm gap-2 shadow-xs cursor-pointer"
              >
                {updateProfileMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>جاري الحفظ...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>حفظ التغييرات</span>
                  </>
                )}
              </Button>
              <Button 
                variant="outline" 
                onClick={() => {
                  setCurrentPassword("");
                  setNewPassword("");
                  setConfirmPassword("");
                  setIsChangePasswordOpen(true);
                }} 
                className="h-10 px-4 rounded-xl text-xs sm:text-sm font-bold border-border/70 hover:bg-muted/80 gap-1.5 cursor-pointer"
              >
                <Lock className="w-3.5 h-3.5 text-primary" />
                تغيير كلمة المرور
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Dialog تغيير كلمة المرور */}
      <Dialog open={isChangePasswordOpen} onOpenChange={setIsChangePasswordOpen}>
        <DialogContent className="sm:max-w-[500px] w-[95vw] p-5 sm:p-6 rounded-2xl" dir="rtl">
          <DialogHeader className="text-right flex flex-col gap-1 pb-2 border-b border-border/60">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-primary/10 text-primary">
                <Lock className="w-4 h-4" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold text-foreground">تغيير كلمة المرور</DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                  يرجى إدخال كلمة المرور الحالية لتأكيد هويتك، ثم تعيين كلمة مرور جديدة قوية.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <form onSubmit={handleChangePassword} className="space-y-4 py-2 text-right">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-foreground">كلمة المرور الحالية *</Label>
              <div className="relative">
                <Input
                  type={showCurrentPassword ? "text" : "password"}
                  required
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="أدخل كلمة المرور السابقة"
                  className="rounded-xl h-10 border-border/70 text-xs sm:text-sm pl-10 pr-3 bg-background"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  className="absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-foreground">كلمة المرور الجديدة *</Label>
              <div className="relative">
                <Input
                  type={showNewPassword ? "text" : "password"}
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="أدخل كلمة المرور الجديدة (8 أحرف على الأقل)"
                  className="rounded-xl h-10 border-border/70 text-xs sm:text-sm pl-10 pr-3 bg-background"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-foreground">تأكيد كلمة المرور الجديدة *</Label>
              <div className="relative">
                <Input
                  type={showConfirmPassword ? "text" : "password"}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="أعد إدخال كلمة المرور الجديدة لتأكيدها"
                  className="rounded-xl h-10 border-border/70 text-xs sm:text-sm pl-10 pr-3 bg-background"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <DialogFooter className="flex flex-row-reverse gap-2 pt-3 border-t border-border/60">
              <Button
                type="submit"
                disabled={changePasswordMutation.isPending}
                className="gradient-primary text-white font-bold text-xs sm:text-sm h-10 px-5 rounded-xl shadow-xs cursor-pointer"
              >
                {changePasswordMutation.isPending ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>جاري التغيير...</span>
                  </>
                ) : (
                  "تحديث كلمة المرور"
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsChangePasswordOpen(false)}
                className="h-10 text-xs sm:text-sm px-4 rounded-xl border-border/70 cursor-pointer"
              >
                إلغاء
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
