import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { Link } from "wouter";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  MapPin,
  Clock,
  KeyRound,
  Sparkles,
  AlertCircle,
  FileCheck2,
  Save,
  Check,
  Building,
  UserCheck,
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
  const [city, setCity] = useState("");
  const [signatureName, setSignatureName] = useState("");
  const [signatureDepartment, setSignatureDepartment] = useState("");
  const [signatureUrl, setSignatureUrl] = useState<string | null>(null);
  const [showSignatureInDocuments, setShowSignatureInDocuments] = useState<boolean>(true);
  const [uploadingSignature, setUploadingSignature] = useState(false);

  const [activeTab, setActiveTab] = useState("personal");

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
      setCity((user as any).city || "");
      setSignatureName((user as any).signatureName || "");
      setSignatureDepartment((user as any).signatureDepartment || "");
      setSignatureUrl((user as any).signatureUrl || null);
      setShowSignatureInDocuments((user as any).showSignatureInDocuments ?? true);
    }
  }, [user]);

  const isDirty = useMemo(() => {
    if (!user) return false;
    return (
      name !== (user.name || "") ||
      phone !== (user.phone || "") ||
      city !== ((user as any).city || "") ||
      signatureName !== ((user as any).signatureName || "") ||
      signatureDepartment !== ((user as any).signatureDepartment || "") ||
      showSignatureInDocuments !== ((user as any).showSignatureInDocuments ?? true)
    );
  }, [user, name, phone, city, signatureName, signatureDepartment, showSignatureInDocuments]);

  // Password strength helper
  const passwordStrength = useMemo(() => {
    if (!newPassword) return { score: 0, text: "", color: "" };
    let score = 0;
    if (newPassword.length >= 8) score += 1;
    if (/[A-Z]/.test(newPassword) || /[a-z]/.test(newPassword)) score += 1;
    if (/[0-9]/.test(newPassword)) score += 1;
    if (/[^A-Za-z0-9]/.test(newPassword)) score += 1;

    switch (score) {
      case 1:
        return { score: 25, text: "ضعيفة", color: "bg-rose-500 text-rose-600" };
      case 2:
        return { score: 50, text: "متوسطة", color: "bg-amber-500 text-amber-600" };
      case 3:
        return { score: 75, text: "جيدة", color: "bg-blue-500 text-blue-600" };
      case 4:
        return { score: 100, text: "قوية جداً", color: "bg-emerald-500 text-emerald-600" };
      default:
        return { score: 10, text: "قصيرة جداً", color: "bg-rose-500 text-rose-600" };
    }
  }, [newPassword]);

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
      city: city || undefined,
      signatureName: hasSignaturePermission ? signatureName : undefined,
      signatureDepartment: hasSignaturePermission ? signatureDepartment : undefined,
      showSignatureInDocuments: hasSignaturePermission ? showSignatureInDocuments : undefined,
    });
  };

  return (
    <DashboardLayout>
      <div className="space-y-4 sm:space-y-6 max-w-4xl mx-auto pb-10">
        {/* Navigation & Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-card p-4 sm:p-5 rounded-2xl border border-border/60 shadow-xs">
          <div className="flex items-center gap-3">
            <Link href={user?.role === "service_requester" ? "/requester" : "/dashboard"}>
              <Button variant="ghost" size="icon" className="rounded-xl hover:bg-muted/80 shrink-0 cursor-pointer">
                <ArrowRight className="w-5 h-5 text-foreground" />
              </Button>
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg sm:text-xl font-black text-foreground">الملف الشخصي</h1>
                <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 text-[10px] sm:text-xs font-bold px-2 py-0.5">
                  حسابي
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">إدارة معلومات الحساب، إعدادات الأمان، وبيانات التوقيع المعتمدة</p>
            </div>
          </div>

          <div className="flex items-center gap-2 mr-auto sm:mr-0">
            {isDirty && (
              <Badge variant="outline" className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30 text-[11px] font-bold animate-pulse">
                تغييرات غير محفوظة
              </Badge>
            )}
            <Button
              onClick={handleSave}
              disabled={updateProfileMutation.isPending || !isDirty}
              className="gradient-primary text-white font-bold text-xs sm:text-sm h-9 sm:h-10 px-4 rounded-xl gap-2 shadow-xs hover:opacity-95 cursor-pointer"
            >
              {updateProfileMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>جاري الحفظ...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>حفظ التعديلات</span>
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Hero User Banner Card */}
        <Card className="border border-border/60 shadow-xs rounded-2xl overflow-hidden relative bg-card">
          <div className="h-24 sm:h-28 bg-gradient-to-r from-primary/20 via-primary/10 to-primary/5 border-b border-border/40" />
          <CardContent className="p-4 sm:p-6 pt-0 relative">
            <div className="flex flex-col sm:flex-row items-center sm:items-end justify-between gap-4 -mt-12 sm:-mt-14 mb-4">
              <div className="flex flex-col sm:flex-row items-center sm:items-end gap-4 text-center sm:text-right">
                <Avatar className="h-20 w-20 sm:h-24 sm:w-24 border-4 border-background shadow-md ring-4 ring-primary/15 shrink-0 bg-primary/10">
                  <AvatarFallback className="text-2xl sm:text-3xl font-black bg-primary/10 text-primary">
                    {user?.name?.charAt(0).toUpperCase() || "U"}
                  </AvatarFallback>
                </Avatar>
                <div className="space-y-1">
                  <div className="flex items-center justify-center sm:justify-start gap-2 flex-wrap">
                    <h2 className="text-lg sm:text-2xl font-black text-foreground">{user?.name}</h2>
                    <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-[10px] sm:text-xs font-bold gap-1 px-2 py-0.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      مفعل
                    </Badge>
                  </div>
                  <div className="flex items-center justify-center sm:justify-start gap-2 flex-wrap text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1 font-medium bg-muted/60 px-2 py-0.5 rounded-md">
                      <Shield className="w-3 h-3 text-primary" />
                      {ROLE_LABELS[user?.role || ""] || user?.role}
                    </span>
                    <span className="inline-flex items-center gap-1 font-medium">
                      <Mail className="w-3 h-3 text-muted-foreground" />
                      {user?.email}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsChangePasswordOpen(true)}
                  className="rounded-xl border-border/70 hover:bg-muted/80 text-xs font-bold gap-1.5 h-9 cursor-pointer"
                >
                  <Lock className="w-3.5 h-3.5 text-primary" />
                  تغيير كلمة المرور
                </Button>
              </div>
            </div>

            {/* Quick Profile Summary Chips */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-4 border-t border-border/40 text-center sm:text-right">
              <div className="p-2.5 rounded-xl bg-muted/40 border border-border/40">
                <p className="text-[10px] text-muted-foreground">البريد الإلكتروني</p>
                <p className="text-xs font-bold text-foreground truncate mt-0.5">{user?.email || "-"}</p>
              </div>
              <div className="p-2.5 rounded-xl bg-muted/40 border border-border/40">
                <p className="text-[10px] text-muted-foreground">رقم الجوال</p>
                <p className="text-xs font-bold text-foreground truncate mt-0.5" dir="ltr">{user?.phone || "-"}</p>
              </div>
              <div className="p-2.5 rounded-xl bg-muted/40 border border-border/40">
                <p className="text-[10px] text-muted-foreground">تاريخ الانضمام</p>
                <p className="text-xs font-bold text-foreground truncate mt-0.5">
                  {user?.createdAt ? new Date(user.createdAt).toLocaleDateString("ar-SA") : "-"}
                </p>
              </div>
              <div className="p-2.5 rounded-xl bg-muted/40 border border-border/40">
                <p className="text-[10px] text-muted-foreground">طريقة تسجيل الدخول</p>
                <p className="text-xs font-bold text-foreground truncate mt-0.5">
                  {user?.loginMethod === "local" ? "حساب محلي (كلمة مرور)" : (user?.loginMethod || "محلي")}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Main Content Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid grid-cols-2 sm:grid-cols-3 w-full bg-muted/60 p-1 rounded-2xl border border-border/60">
            <TabsTrigger value="personal" className="rounded-xl text-xs font-bold gap-1.5 py-2 cursor-pointer">
              <User className="w-3.5 h-3.5" />
              البيانات الشخصية
            </TabsTrigger>
            {hasSignaturePermission && (
              <TabsTrigger value="signature" className="rounded-xl text-xs font-bold gap-1.5 py-2 cursor-pointer">
                <PenTool className="w-3.5 h-3.5" />
                التوقيع والاعتمادات
              </TabsTrigger>
            )}
            <TabsTrigger value="security" className="rounded-xl text-xs font-bold gap-1.5 py-2 cursor-pointer">
              <Lock className="w-3.5 h-3.5" />
              الأمان والوصول
            </TabsTrigger>
          </TabsList>

          {/* Tab 1: Personal Info */}
          <TabsContent value="personal" className="space-y-4">
            <Card className="border border-border/60 shadow-xs rounded-2xl bg-card">
              <CardHeader className="p-4 sm:p-6 pb-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-primary/10 text-primary">
                    <User className="w-4 h-4" />
                  </div>
                  <div>
                    <CardTitle className="text-base font-bold">المعلومات الشخصية والاتصال</CardTitle>
                    <CardDescription className="text-xs">تعديل بياناتك المسجلة في النظام لتسهيل التواصل</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-4 sm:p-6 pt-0 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="flex items-center justify-between text-xs font-semibold text-foreground">
                      <span className="flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-primary" />
                        الاسم الكامل *
                      </span>
                      <span className="text-[10px] text-muted-foreground">{name.length}/60</span>
                    </Label>
                    <Input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      maxLength={60}
                      placeholder="أدخل اسمك الكامل"
                      className="rounded-xl h-10 border-border/70 text-xs sm:text-sm bg-background"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="flex items-center justify-between text-xs font-semibold text-foreground">
                      <span className="flex items-center gap-1.5">
                        <Mail className="w-3.5 h-3.5 text-primary" />
                        البريد الإلكتروني
                      </span>
                      <Badge variant="outline" className="text-[9px] bg-emerald-500/10 text-emerald-600 border-emerald-500/20 py-0">
                        معرّف الدخول
                      </Badge>
                    </Label>
                    <Input
                      type="email"
                      defaultValue={user?.email || ""}
                      disabled
                      className="rounded-xl h-10 border-border/40 text-xs sm:text-sm bg-muted/60 text-muted-foreground opacity-90 cursor-not-allowed"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                      <Phone className="w-3.5 h-3.5 text-primary" />
                      رقم الجوال
                    </Label>
                    <Input
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="05xxxxxxxx"
                      dir="ltr"
                      className="rounded-xl h-10 border-border/70 text-xs sm:text-sm bg-background text-right"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                      <MapPin className="w-3.5 h-3.5 text-primary" />
                      المدينة / المنطقة
                    </Label>
                    <Input
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder="مثال: أبها، خميس مشيط، الرياض"
                      className="rounded-xl h-10 border-border/70 text-xs sm:text-sm bg-background"
                    />
                  </div>
                </div>

                {/* Account Role & Access Overview */}
                <div className="p-4 rounded-xl bg-muted/30 border border-border/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mt-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-primary/10 text-primary shrink-0">
                      <Shield className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-foreground">مستوى الصلاحية الممنوحة</p>
                      <p className="text-[11px] text-muted-foreground">
                        دورك الحالي هو: <strong className="text-foreground font-semibold">{ROLE_LABELS[user?.role || ""] || user?.role}</strong>. يتم تعديل الأدوار بواسطة الإدارة العامة.
                      </p>
                    </div>
                  </div>
                  <Badge variant="outline" className="bg-background text-primary border-primary/30 font-bold text-xs shrink-0">
                    {ROLE_LABELS[user?.role || ""] || user?.role}
                  </Badge>
                </div>
              </CardContent>
              <CardFooter className="p-4 sm:p-6 pt-0 border-t border-border/40 flex justify-end">
                <Button
                  onClick={handleSave}
                  disabled={updateProfileMutation.isPending || !isDirty}
                  className="gradient-primary text-white font-bold text-xs sm:text-sm h-10 px-5 rounded-xl gap-2 shadow-xs cursor-pointer"
                >
                  {updateProfileMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      جاري الحفظ...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      حفظ التغييرات
                    </>
                  )}
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>

          {/* Tab 2: Signature Settings (If Applicable) */}
          {hasSignaturePermission && (
            <TabsContent value="signature" className="space-y-4">
              <Card className="border border-border/60 shadow-xs rounded-2xl bg-card">
                <CardHeader className="p-4 sm:p-6 pb-3">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <div className="p-2 rounded-xl bg-primary/10 text-primary">
                        <PenTool className="w-4 h-4" />
                      </div>
                      <div>
                        <CardTitle className="text-base font-bold">التوقيع الرقمي والاعتمادات الرسمية</CardTitle>
                        <CardDescription className="text-xs">إدارة صورة التوقيع والبيانات الرسمية المرفقة بالتقارير والمستندات</CardDescription>
                      </div>
                    </div>
                    <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-xs font-bold">
                      مصرّح للتوقيع الرسمي
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="p-4 sm:p-6 pt-0 space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-foreground">
                        الاسم الظاهر في المستندات المعتمدة
                      </Label>
                      <Input
                        value={signatureName}
                        onChange={(e) => setSignatureName(e.target.value)}
                        placeholder="مثال: د. عبدالعزيز بن محمد"
                        className="rounded-xl h-10 border-border/70 text-xs sm:text-sm bg-background"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-foreground">
                        المسمى الوظيفي / الإدارة
                      </Label>
                      <Input
                        value={signatureDepartment}
                        onChange={(e) => setSignatureDepartment(e.target.value)}
                        placeholder="مثال: المدير التنفيذي / مكتب المشاريع"
                        className="rounded-xl h-10 border-border/70 text-xs sm:text-sm bg-background"
                      />
                    </div>
                  </div>

                  {/* Upload Signature & Preview Section */}
                  <div className="space-y-3 pt-2">
                    <Label className="text-xs font-bold text-foreground flex items-center gap-2">
                      <Upload className="w-4 h-4 text-primary" />
                      صورة التوقيع الإلكتروني المعتمدة
                    </Label>

                    {signatureUrl ? (
                      <div className="p-4 sm:p-5 border border-border/80 rounded-2xl bg-muted/20 flex flex-col md:flex-row items-center justify-between gap-4">
                        <div className="flex flex-col sm:flex-row items-center gap-4 text-center sm:text-right">
                          <div className="bg-white dark:bg-slate-950 p-3 rounded-xl border border-border/80 shadow-xs max-w-[200px] h-[90px] flex items-center justify-center overflow-hidden">
                            <img
                              src={signatureUrl}
                              alt="التوقيع الرقمي"
                              className="max-h-[75px] max-w-full object-contain"
                            />
                          </div>
                          <div className="space-y-1">
                            <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center justify-center sm:justify-start gap-1">
                              <CheckCircle2 className="w-4 h-4" />
                              تم رفع التوقيع الرقمي وتفعيله بنجاح
                            </p>
                            <p className="text-[11px] text-muted-foreground">
                              الاسم المعتمد: <strong className="text-foreground">{signatureName || user?.name}</strong> ({signatureDepartment || "المخول بالتوقيع"})
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <label className="cursor-pointer">
                            <input
                              type="file"
                              accept="image/*,image/png,image/jpeg,image/jpg,image/webp,image/heic,image/heif,image/svg+xml"
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
                      <div className="p-6 sm:p-8 border-2 border-dashed border-border/80 rounded-2xl bg-muted/20 text-center space-y-3 hover:border-primary/50 transition-colors">
                        <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary mx-auto flex items-center justify-center shadow-xs">
                          {uploadingSignature ? (
                            <Loader2 className="w-6 h-6 animate-spin" />
                          ) : (
                            <ImageIcon className="w-6 h-6" />
                          )}
                        </div>
                        <div className="max-w-md mx-auto">
                          <p className="text-xs sm:text-sm font-bold text-foreground">
                            {uploadingSignature ? "جاري رفع صورة التوقيع الرقمي..." : "قم برفع صورة التوقيع الرقمي الخاصة بك"}
                          </p>
                          <p className="text-[11px] text-muted-foreground mt-1">
                            يُفضل استخدام صورة مفرغة بصيغة PNG وبخلفية شفافة بدقة واضحة وبحجم أقل من 5MB لتظهر بجودة عالية على المستندات الرسمية.
                          </p>
                        </div>
                        <div>
                          <label className="cursor-pointer inline-block">
                            <input
                              type="file"
                              accept="image/*,image/png,image/jpeg,image/jpg,image/webp,image/heic,image/heif,image/svg+xml"
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
                                    اختيار ملف التوقيع
                                  </>
                                )}
                              </span>
                            </Button>
                          </label>
                        </div>
                      </div>
                    )}

                    {/* Official Document Inclusion Toggle Switch */}
                    <div className="p-4 rounded-xl bg-muted/30 border border-border/50 flex items-center justify-between gap-3">
                      <div className="space-y-0.5">
                        <Label htmlFor="showSignatureInDocuments" className="text-xs font-bold text-foreground cursor-pointer">
                          تضمين التوقيع الرسمي في المستندات والتقارير المعتمدة
                        </Label>
                        <p className="text-[11px] text-muted-foreground">
                          عند التفعيل، سيظهر اسمك وتوقيعك في خانة الاعتماد في المستندات التي تقوم بالموافقة عليها.
                        </p>
                      </div>
                      <Switch
                        id="showSignatureInDocuments"
                        checked={showSignatureInDocuments}
                        onCheckedChange={(checked) => {
                          const val = !!checked;
                          setShowSignatureInDocuments(val);
                        }}
                      />
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="p-4 sm:p-6 pt-0 border-t border-border/40 flex justify-end">
                  <Button
                    onClick={handleSave}
                    disabled={updateProfileMutation.isPending || !isDirty}
                    className="gradient-primary text-white font-bold text-xs sm:text-sm h-10 px-5 rounded-xl gap-2 shadow-xs cursor-pointer"
                  >
                    {updateProfileMutation.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        جاري الحفظ...
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4" />
                        حفظ بيانات التوقيع
                      </>
                    )}
                  </Button>
                </CardFooter>
              </Card>
            </TabsContent>
          )}

          {/* Tab 3: Security & Access */}
          <TabsContent value="security" className="space-y-4">
            <Card className="border border-border/60 shadow-xs rounded-2xl bg-card">
              <CardHeader className="p-4 sm:p-6 pb-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-primary/10 text-primary">
                    <Lock className="w-4 h-4" />
                  </div>
                  <div>
                    <CardTitle className="text-base font-bold">الأمان وكلمة المرور</CardTitle>
                    <CardDescription className="text-xs">إدارة خيارات أمان الحساب وتغيير كلمة المرور</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-4 sm:p-6 pt-0 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl bg-muted/30 border border-border/50 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                        <KeyRound className="w-4 h-4 text-primary" />
                        كلمة المرور
                      </span>
                      <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[10px] font-bold">
                        محمية
                      </Badge>
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      يتم تخزين كلمة المرور بتشفير متقدم (PBKDF2/SHA-512) لضمان حماية بياناتك.
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setCurrentPassword("");
                        setNewPassword("");
                        setConfirmPassword("");
                        setIsChangePasswordOpen(true);
                      }}
                      className="w-full rounded-xl text-xs font-bold h-9 mt-2 gap-1.5 cursor-pointer"
                    >
                      <Lock className="w-3.5 h-3.5 text-primary" />
                      تغيير كلمة المرور الآن
                    </Button>
                  </div>

                  <div className="p-4 rounded-xl bg-muted/30 border border-border/50 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                        <UserCheck className="w-4 h-4 text-primary" />
                        حالة الجلسة
                      </span>
                      <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/20 text-[10px] font-bold">
                        جلسة نشطة
                      </Badge>
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      أنت مسجل الدخول حالياً كـ <strong className="text-foreground">{ROLE_LABELS[user?.role || ""] || user?.role}</strong> عبر البريد الإلكتروني المعتمد.
                    </p>
                    <div className="pt-2 text-[11px] text-muted-foreground flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      تاريخ آخر نشاط: {new Date().toLocaleDateString("ar-SA")}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Modern Change Password Dialog */}
      <Dialog open={isChangePasswordOpen} onOpenChange={setIsChangePasswordOpen}>
        <DialogContent className="sm:max-w-[480px] w-[95vw] p-5 sm:p-6 rounded-2xl" dir="rtl">
          <DialogHeader className="text-right flex flex-col gap-1 pb-2 border-b border-border/60">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-primary/10 text-primary">
                <Lock className="w-4 h-4" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold text-foreground">تغيير كلمة المرور</DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                  أدخل كلمة المرور الحالية ثم عين كلمة مرور جديدة قوية
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
                  placeholder="أدخل كلمة المرور الحالية"
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
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold text-foreground">كلمة المرور الجديدة *</Label>
                {newPassword && (
                  <span className={`text-[10px] font-bold ${passwordStrength.color}`}>
                    القوة: {passwordStrength.text}
                  </span>
                )}
              </div>
              <div className="relative">
                <Input
                  type={showNewPassword ? "text" : "password"}
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="أدخل 8 خانات على الأقل"
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
              {newPassword && (
                <div className="w-full bg-muted/60 h-1.5 rounded-full overflow-hidden mt-1">
                  <div
                    className={`h-full transition-all duration-300 ${passwordStrength.color.split(" ")[0]}`}
                    style={{ width: `${passwordStrength.score}%` }}
                  />
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold text-foreground">تأكيد كلمة المرور الجديدة *</Label>
                {confirmPassword && (
                  <span className={`text-[10px] font-bold ${newPassword === confirmPassword ? "text-emerald-600" : "text-rose-600"}`}>
                    {newPassword === confirmPassword ? "✓ متطابقة" : "✗ غير متطابقة"}
                  </span>
                )}
              </div>
              <div className="relative">
                <Input
                  type={showConfirmPassword ? "text" : "password"}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="أعد إدخال كلمة المرور الجديدة"
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
                disabled={changePasswordMutation.isPending || newPassword.length < 8 || newPassword !== confirmPassword}
                className="gradient-primary text-white font-bold text-xs sm:text-sm h-10 px-5 rounded-xl shadow-xs cursor-pointer"
              >
                {changePasswordMutation.isPending ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    جاري التحديث...
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
    </DashboardLayout>
  );
}
