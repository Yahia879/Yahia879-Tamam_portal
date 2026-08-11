import { useState, useEffect, useRef } from "react";
import { Link } from "wouter";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Building2,
  User,
  Phone,
  Mail,
  MapPin,
  CreditCard,
  Save,
  Loader2,
  FileText,
  Settings,
  Plus,
  Trash2,
  Star,
  Edit2,
  Users,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  PenTool,
  FileCheck,
  Shield,
  Upload,
  ImageIcon,
  Search,
  X,
  UserCheck,
  ChevronDown,
  Lock,
  Globe,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

// مكون إدارة المفوضين
function SignatoriesSection() {
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingSignatory, setEditingSignatory] = useState<any>(null);
  const [uploadingSignature, setUploadingSignature] = useState(false);
  const [userSearchQuery, setUserSearchQuery] = useState("");
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const userSelectRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userSelectRef.current && !userSelectRef.current.contains(event.target as Node)) {
        setShowUserDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const [formData, setFormData] = useState({
    name: "",
    title: "",
    nationalId: "",
    phone: "",
    email: "",
    address: "",
    signatureUrl: "",
    isDefault: false,
    userId: null as number | null,
    grantContractSignPermission: false,
  });

  const utils = trpc.useUtils();

  // جلب المفوضين
  const { data: signatories, isLoading, refetch: refetchSignatories } = trpc.organization.getSignatories.useQuery();

  // جلب مستخدمي النظام (لخيارات الربط الاختياري)
  const { data: systemUsers } = trpc.organization.getSystemUsers.useQuery();

  const getRoleArabicName = (u: any) => {
    if (!u) return "";
    if (u.customRoles && u.customRoles.length > 0) {
      return u.customRoles.join("، ");
    }

    const roleMap: Record<string, string> = {
      super_admin: "المدير العام",
      system_admin: "مدير النظام",
      admin: "مدير النظام",
      general_manager: "المدير التنفيذي",
      projects_office: "مكتب المشاريع",
      field_team: "الفريق الميداني",
      quick_response: "فريق الاستجابة السريعة",
      financial: "الإدارة المالية",
      project_manager: "مدير المشروع",
      corporate_comm: "الاتصال المؤسسي",
      service_requester: "طالب الخدمة",
    };

    if (u.role && roleMap[u.role]) {
      return roleMap[u.role];
    }

    if (u.role && u.role.startsWith("custom_role_")) {
      return "دور مخصص";
    }

    return u.role || "مستخدم للنظام";
  };

  const filteredSystemUsers = systemUsers?.filter((u: any) => {
    if (u.role === "service_requester") return false;
    if (!userSearchQuery.trim()) return true;
    const q = userSearchQuery.toLowerCase();
    const roleTitle = getRoleArabicName(u).toLowerCase();
    return (
      u.name?.toLowerCase().includes(q) ||
      u.email?.toLowerCase().includes(q) ||
      roleTitle.includes(q) ||
      (u.phone && u.phone.includes(q))
    );
  });

  const selectedUser = systemUsers?.find((u: any) => u.id === formData.userId);

  // إضافة مفوض
  const addMutation = trpc.organization.addSignatory.useMutation({
    onSuccess: () => {
      toast.success("تم إضافة المفوض بنجاح");
      setShowAddDialog(false);
      resetForm();
      refetchSignatories();
      utils.auth.me.invalidate();
      utils.organization.getSettings.invalidate();
    },
    onError: (error: any) => {
      toast.error(error.message || "حدث خطأ أثناء إضافة المفوض");
    },
  });

  // تحديث مفوض
  const updateMutation = trpc.organization.updateSignatory.useMutation({
    onSuccess: () => {
      toast.success("تم تحديث بيانات المفوض بنجاح");
      setEditingSignatory(null);
      resetForm();
      refetchSignatories();
      utils.auth.me.invalidate();
      utils.organization.getSettings.invalidate();
    },
    onError: (error: any) => {
      toast.error(error.message || "حدث خطأ أثناء تحديث المفوض");
    },
  });

  // حذف مفوض
  const deleteMutation = trpc.organization.deleteSignatory.useMutation({
    onSuccess: () => {
      toast.success("تم حذف المفوض بنجاح");
      refetchSignatories();
    },
    onError: (error: any) => {
      toast.error(error.message || "حدث خطأ أثناء حذف المفوض");
    },
  });

  // تعيين افتراضي
  const setDefaultMutation = trpc.organization.setDefaultSignatory.useMutation({
    onSuccess: () => {
      toast.success("تم تعيين المفوض الافتراضي بنجاح");
      refetchSignatories();
    },
    onError: (error: any) => {
      toast.error(error.message || "حدث خطأ");
    },
  });

  const resetForm = () => {
    setUserSearchQuery("");
    setShowUserDropdown(false);
    setFormData({
      name: "",
      title: "",
      nationalId: "",
      phone: "",
      email: "",
      address: "",
      signatureUrl: "",
      isDefault: false,
      userId: null,
      grantContractSignPermission: false,
    });
  };

  const openEditDialog = (signatory: any) => {
    setUserSearchQuery("");
    setShowUserDropdown(false);
    setEditingSignatory(signatory);

    setFormData({
      name: signatory.name,
      title: signatory.title,
      nationalId: signatory.nationalId || "",
      phone: signatory.phone || "",
      email: signatory.email || "",
      address: signatory.address || "",
      signatureUrl: signatory.signatureUrl || "",
      isDefault: signatory.isDefault || false,
      userId: null,
      grantContractSignPermission: false,
    });
  };

  const uploadSignatureMutation = trpc.organization.uploadSignatorySignature.useMutation({
    onSuccess: (data) => {
      setFormData((prev) => ({ ...prev, signatureUrl: data.url }));
      toast.success("تم رفع صورة التوقيع الرقمي بنجاح");
    },
    onError: (error: any) => {
      toast.error(error.message || "حدث خطأ أثناء رفع التوقيع الرقمي");
    },
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
          resolve(reader.result as string);
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
      console.error("[uploadSignature] Error:", error);
    } finally {
      setUploadingSignature(false);
      e.target.value = "";
    }
  };

  const handleUserSelect = (val: string) => {
    if (!val || val === "none") {
      setFormData((prev) => ({
        ...prev,
        userId: null,
        grantContractSignPermission: false,
      }));
      return;
    }

    const uId = parseInt(val, 10);
    const targetUser = systemUsers?.find((u: any) => u.id === uId);
    if (targetUser) {
      setFormData((prev) => ({
        ...prev,
        userId: targetUser.id,
        name: targetUser.name || "",
        email: targetUser.email || "",
        phone: targetUser.phone || prev.phone || "",
        signatureUrl: targetUser.signatureUrl || prev.signatureUrl || "",
        grantContractSignPermission: targetUser.hasContractSignPermission,
      }));
    }
  };

  const handleSubmit = () => {
    if (!formData.name || !formData.title) {
      toast.error("يرجى إدخال الحقول المطلوبة (اسم المفوض والمنصب)");
      return;
    }

    if (editingSignatory) {
      updateMutation.mutate({
        id: editingSignatory.id,
        ...formData,
      });
    } else {
      addMutation.mutate(formData);
    }
  };

  return (
    <Card className="border-0 shadow-sm overflow-hidden" dir="rtl">
      <CardHeader className="p-4 sm:p-6 pb-2">
        <div className="flex flex-row items-center justify-between gap-4">
          <div className="text-right">
            <CardTitle className="flex items-center gap-2 text-lg justify-start">
              <Users className="h-5 w-5 text-primary" />
              مفوضو التوقيع الرسميون
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm mt-1">
              إدارة الأشخاص المفوضين بالتوقيع على العقود نيابة عن الجمعية وتخصيص صور التوقيع الرقمي
            </CardDescription>
          </div>
          <Button onClick={() => setShowAddDialog(true)} className="gradient-primary text-white shrink-0">
            <Plus className="h-4 w-4 sm:mr-0 ml-1 sm:ml-2" />
            <span className="hidden sm:inline">إضافة مفوض</span>
            <span className="sm:hidden">إضافة</span>
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-0 sm:p-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : signatories && signatories.length > 0 ? (
          <>
            {/* Desktop Table */}
            <div className="hidden md:block">
              <Table>
                <TableHeader className="bg-muted/30">
                  <TableRow>
                    <TableHead className="text-right">الاسم</TableHead>
                    <TableHead className="text-right">المنصب</TableHead>
                    <TableHead className="text-right whitespace-nowrap">رقم الهوية</TableHead>
                    <TableHead className="text-right">الجوال</TableHead>
                    <TableHead className="text-right">البريد الإلكتروني</TableHead>
                    <TableHead className="text-center">التوقيع الرقمي</TableHead>
                    <TableHead className="text-right">الحالة</TableHead>
                    <TableHead className="text-left">الإجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {signatories.map((signatory: any) => (
                    <TableRow key={signatory.id} className="hover:bg-muted/20 transition-colors">
                      <TableCell className="font-bold text-right">{signatory.name}</TableCell>
                      <TableCell className="text-right">{signatory.title}</TableCell>
                      <TableCell className="text-right">{signatory.nationalId || "-"}</TableCell>
                      <TableCell className="text-right">{signatory.phone || "-"}</TableCell>
                      <TableCell className="text-right">{signatory.email || "-"}</TableCell>
                      <TableCell className="text-center">
                        {signatory.signatureUrl ? (
                          <div className="flex items-center justify-center">
                            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-xs">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {signatory.isDefault ? (
                          <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 font-bold border-0">
                            <Star className="h-3 w-3 ml-1 fill-current" />
                            افتراضي
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="font-medium">نشط</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-left">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-primary"
                            onClick={() => openEditDialog(signatory)}
                            title="تعديل المفوض والتوقيع"
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          {!signatory.isDefault && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-amber-500 hover:text-amber-600"
                              onClick={() => setDefaultMutation.mutate({ id: signatory.id })}
                              title="تعيين كافتراضي"
                            >
                              <Star className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-red-500 hover:text-red-600"
                            onClick={() => deleteMutation.mutate({ id: signatory.id })}
                            title="حذف"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Mobile Cards View */}
            <div className="md:hidden divide-y divide-sidebar-border/10">
              {signatories.map((signatory: any) => (
                <div key={signatory.id} className="p-4 space-y-3">
                  <div className="flex justify-between items-start">
                    <div className="min-w-0 flex-1">
                      <h4 className="font-bold text-foreground">{signatory.name}</h4>
                      <p className="text-xs text-muted-foreground">{signatory.title}</p>
                    </div>
                    {signatory.isDefault ? (
                      <Badge className="bg-amber-100 text-amber-800 font-bold border-0 text-[10px] h-5 px-1.5">
                        <Star className="h-2.5 w-2.5 ml-1 fill-current" />
                        افتراضي
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-[10px] h-5 px-1.5 font-medium">نشط</Badge>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2 text-[11px] py-2 border-y border-dashed">
                    <div className="space-y-0.5">
                      <p className="text-muted-foreground text-[9px] font-bold tracking-wider">رقم الهوية</p>
                      <p>{signatory.nationalId || "—"}</p>
                    </div>
                    <div className="space-y-0.5">
                      <p className="text-muted-foreground text-[9px] font-bold tracking-wider">الجوال</p>
                      <p>{signatory.phone || "—"}</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-900/50 p-2.5 rounded-lg border text-xs">
                    <div className="flex items-center gap-1.5">
                      <span className="text-muted-foreground">التوقيع الرقمي:</span>
                      {signatory.signatureUrl ? (
                        <span className="text-emerald-600 font-bold flex items-center gap-1">
                          <CheckCircle2 className="w-4 h-4" /> مرفوع
                        </span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-2 pt-1">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 h-8 text-xs font-bold"
                      onClick={() => openEditDialog(signatory)}
                    >
                      <Edit2 className="h-3.5 w-3.5 ml-1.5" />
                      تعديل والتوقيع
                    </Button>
                    {!signatory.isDefault && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 w-10 text-amber-600 border-amber-200 bg-amber-50/50 p-0 flex items-center justify-center"
                        onClick={() => setDefaultMutation.mutate({ id: signatory.id })}
                        title="افتراضي"
                      >
                        <Star className="h-3.5 w-3.5 fill-current" />
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 w-10 text-red-500 border-red-200 p-0 flex items-center justify-center"
                      onClick={() => deleteMutation.mutate({ id: signatory.id })}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="text-center py-12 px-6 text-muted-foreground">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
              <Users className="h-8 w-8 opacity-30" />
            </div>
            <p className="font-semibold text-foreground">لا يوجد مفوضون مسجلون</p>
            <p className="text-xs sm:text-sm mt-1">اضغط على "إضافة مفوض" لإضافة مفوض جديد وتحديد توقيعه الرقمي</p>
          </div>
        )}

        <div className="m-4 sm:m-0 sm:mt-6 bg-blue-50/50 dark:bg-blue-900/10 border border-blue-200/50 dark:border-blue-800/50 rounded-xl p-4 flex gap-3">
          <Settings className="h-5 w-5 text-blue-600 flex-shrink-0" />
          <p className="text-xs sm:text-sm text-blue-800 dark:text-blue-300 leading-relaxed">
            <strong>ملاحظة:</strong> يمكن إضافة التوقيع الرقمي لكل مفوض مباشرةً أثناء الإضافة أو التعديل. المفوض الافتراضي يظهر تلقائياً في العقود الجديدة.
          </p>
        </div>
      </CardContent>

      {/* نافذة إضافة/تعديل مفوض - تكبير الحجم ومظهر مخصص للبحث والربط */}
      <Dialog open={showAddDialog || !!editingSignatory} onOpenChange={(open) => {
        if (!open) {
          setShowAddDialog(false);
          setEditingSignatory(null);
          resetForm();
        }
      }}>
        <DialogContent className="w-[95vw] max-w-2xl sm:max-w-3xl rounded-2xl p-6 sm:p-8 overflow-y-auto max-h-[92vh]" dir="rtl">
          <DialogHeader className="pb-2 border-b">
            <DialogTitle className="text-right text-lg sm:text-xl font-bold flex items-center gap-2">
              <Users className="w-6 h-6 text-primary" />
              {editingSignatory ? "تعديل بيانات المفوض والتوقيع الرقمي" : "إضافة مفوض جديد وتخصيص التوقيع"}
            </DialogTitle>
            <DialogDescription className="text-right text-xs sm:text-sm text-muted-foreground mt-1">
              قم بأدخال بيانات الشخص المفوض بالتوقيع على العقود، وإرفاق التوقيع الرقمي الرسمي.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">

            {/* الحقول الأساسية للمفوض مرتبة في شبكة واسعة */}
            {/* الحقول الأساسية للمفوض مرتبة في شبكة واسعة */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs sm:text-sm font-semibold">اسم المفوض *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="الاسم الكامل للمفوض"
                  className="h-11 text-sm rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs sm:text-sm font-semibold">المنصب الوظيفي *</Label>
                <Input
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="مثال: رئيس مجلس الإدارة، المدير التنفيذي"
                  className="h-11 text-sm rounded-xl"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs sm:text-sm font-semibold">رقم الهوية الوطنية</Label>
                <Input
                  value={formData.nationalId}
                  onChange={(e) => setFormData({ ...formData, nationalId: e.target.value })}
                  placeholder="رقم الهوية الوطنية"
                  className="h-11 text-sm rounded-xl text-right"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs sm:text-sm font-semibold">رقم الجوال</Label>
                <Input
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="05XXXXXXXX"
                  className="h-11 text-sm rounded-xl text-right"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs sm:text-sm font-semibold">البريد الإلكتروني</Label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="email@example.com"
                  className="h-11 text-sm rounded-xl text-right"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs sm:text-sm font-semibold">العنوان التفصيلي</Label>
                <Input
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="العنوان التفصيلي للمفوض"
                  className="h-11 text-sm rounded-xl"
                />
              </div>
            </div>

            {/* قسم رفع وتغيير التوقيع الرقمي للمفوض (مطابق لصفحة Profile) */}
            <div className="space-y-3 border-t pt-5">
              <Label className="text-sm font-bold flex items-center gap-2 text-foreground">
                <Upload className="w-4 h-4 text-primary" />
                التوقيع الرقمي (صورة التوقيع الرسمية للمفوض)
              </Label>
              
              {formData.signatureUrl ? (
                <div className="p-4 border border-dashed rounded-xl bg-slate-50 dark:bg-slate-900/50 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="bg-white dark:bg-slate-950 p-2 rounded-lg border shadow-sm max-w-[200px] max-h-[100px] flex items-center justify-center overflow-hidden">
                      <img 
                        src={formData.signatureUrl} 
                        alt="التوقيع الرقمي" 
                        className="max-h-[75px] w-auto object-contain" 
                      />
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                        <CheckCircle2 className="w-4 h-4" />
                        تم إرفاق صورة التوقيع الرقمي بنجاح
                      </p>
                      <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">
                        سيتم استخدام صورة التوقيع هذه تلقائياً في العقود التي يوقعها هذا المفوض.
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
                        disabled={uploadingSignature}
                      />
                      <Button 
                        variant="outline" 
                        size="sm" 
                        type="button"
                        asChild
                        disabled={uploadingSignature}
                        className="h-9 text-xs font-semibold gap-1.5 rounded-xl"
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
                        setFormData((prev) => ({ ...prev, signatureUrl: "" }));
                      }}
                      disabled={uploadingSignature}
                      className="h-9 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20 gap-1.5 rounded-xl"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
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
                      {uploadingSignature ? "جاري رفع صورة التوقيع الرقمي..." : "قم برفع صورة التوقيع الرقمي للمفوض"}
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
                        className="h-9 text-xs font-bold gap-2 shadow-sm rounded-xl"
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
            </div>
          </div>

          <DialogFooter className="flex flex-col-reverse sm:flex-row gap-3 pt-4 border-t mt-2">
            <Button variant="outline" className="w-full sm:w-auto rounded-xl" onClick={() => {
              setShowAddDialog(false);
              setEditingSignatory(null);
              resetForm();
            }}>
              إلغاء
            </Button>
            <Button
              className="w-full sm:w-auto gradient-primary text-white font-bold rounded-xl"
              onClick={handleSubmit}
              disabled={addMutation.isPending || updateMutation.isPending || uploadingSignature}
            >
              {(addMutation.isPending || updateMutation.isPending) && (
                <Loader2 className="h-4 w-4 ml-2 animate-spin" />
              )}
              {editingSignatory ? "حفظ التعديلات" : "إضافة المفوض"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

export default function OrganizationSettings() {
  const { user } = useAuth();
  
  const isAdmin = ["super_admin", "system_admin"].includes(user?.role || "");
  const userPermissions: string[] = (user as any)?.permissions ?? [];
  const hasPerm = (p: string) => 
    isAdmin || 
    userPermissions.includes(p);

  const canShowBasic = hasPerm("settings_org.edit_basic");
  const canShowSigners = hasPerm("settings_org.edit_signers");
  const canShowBanks = hasPerm("settings_org.edit_banks");
  const canShowContracts = hasPerm("settings_org.edit_contracts");

  const defaultTab = canShowBasic 
    ? "basic" 
    : canShowSigners 
      ? "signatory" 
      : canShowBanks 
        ? "bank" 
        : "contracts";
  
  // بيانات الجمعية
  const [orgSettings, setOrgSettings] = useState({
    // معلومات الجمعية الأساسية
    name: "جمعية تمام للعناية بالمساجد",
    officialReportsName: "",
    licenseNumber: "",
    metaTitle: "",
    address: "",
    city: "",
    phone: "",
    email: "",
    website: "",
    
    // جهات الإشراف
    administrativeSupervisor: "",
    technicalSupervisor: "",
    
    // أسماء المسؤولين
    boardChairmanName: "",
    executiveDirectorName: "",
    accountantName: "",
    pmoManagerName: "",
    csrManagerName: "",
    
    // معلومات مفوض التوقيع
    authorizedSignatory: "",
    signatoryTitle: "",
    signatoryPhone: "",
    signatoryEmail: "",
    
    // معلومات البنك
    bankName: "",
    bankAccountName: "",
    iban: "",
    
    // إعدادات العقود
    contractPrefix: "CON",
    contractFooterText: "",
    contractTermsAndConditions: "",
  });

  // جلب إعدادات الجمعية
  const { data: settings, isLoading, refetch } = trpc.organization.getSettings.useQuery();

  const utils = trpc.useUtils();
  const updateMutation = trpc.organization.updateSettings.useMutation({
    onSuccess: () => {
      toast.success("تم حفظ الإعدادات بنجاح");
      refetch();
      utils.auth.me.invalidate();
      utils.organization.getSignatories.invalidate();
    },
    onError: (error: any) => {
      toast.error(error.message || "حدث خطأ أثناء حفظ الإعدادات");
    },
  });

  // تحميل الإعدادات عند الجلب
  useEffect(() => {
    if (settings) {
      setOrgSettings({
        name: settings.organizationName || "جمعية تمام للعناية بالمساجد",
        officialReportsName: settings.officialReportsName || "",
        licenseNumber: settings.licenseNumber || "",
        metaTitle: (settings as any)?.metaTitle || "",
        address: settings.address || "",
        city: settings.city || "",
        phone: settings.phone || "",
        email: settings.email || "",
        website: settings.website || "",
        administrativeSupervisor: settings.administrativeSupervisor || "",
        technicalSupervisor: settings.technicalSupervisor || "",
        boardChairmanName: settings.boardChairmanName || "",
        executiveDirectorName: settings.executiveDirectorName || "",
        accountantName: settings.accountantName || "",
        pmoManagerName: (settings as any).pmoManagerName || "",
        csrManagerName: (settings as any).csrManagerName || "",
        authorizedSignatory: settings.authorizedSignatory || "",
        signatoryTitle: settings.signatoryTitle || "",
        signatoryPhone: settings.signatoryPhone || "",
        signatoryEmail: settings.signatoryEmail || "",
        bankName: settings.bankName || "",
        bankAccountName: settings.bankAccountName || "",
        iban: settings.iban || "",
        contractPrefix: settings.contractPrefix || "CON",
        contractFooterText: settings.contractFooterText || "",
        contractTermsAndConditions: settings.contractTermsAndConditions || "",
      });
    }
  }, [settings]);

  // حفظ الإعدادات
  const handleSave = () => {
    updateMutation.mutate({
      organizationName: orgSettings.name,
      officialReportsName: orgSettings.officialReportsName || undefined,
      licenseNumber: orgSettings.licenseNumber || undefined,
      metaTitle: orgSettings.metaTitle || undefined,
      address: orgSettings.address || undefined,
      city: orgSettings.city || undefined,
      phone: orgSettings.phone || undefined,
      email: orgSettings.email || undefined,
      website: orgSettings.website || undefined,
      administrativeSupervisor: orgSettings.administrativeSupervisor || undefined,
      technicalSupervisor: orgSettings.technicalSupervisor || undefined,
      boardChairmanName: orgSettings.boardChairmanName || undefined,
      executiveDirectorName: orgSettings.executiveDirectorName || undefined,
      accountantName: orgSettings.accountantName || undefined,
      pmoManagerName: orgSettings.pmoManagerName || undefined,
      csrManagerName: orgSettings.csrManagerName || undefined,
      authorizedSignatory: orgSettings.authorizedSignatory || undefined,
      signatoryTitle: orgSettings.signatoryTitle || undefined,
      signatoryPhone: orgSettings.signatoryPhone || undefined,
      signatoryEmail: orgSettings.signatoryEmail || undefined,
      bankName: orgSettings.bankName || undefined,
      bankAccountName: orgSettings.bankAccountName || undefined,
      iban: orgSettings.iban || undefined,
      contractPrefix: orgSettings.contractPrefix || undefined,
      contractFooterText: orgSettings.contractFooterText || undefined,
      contractTermsAndConditions: orgSettings.contractTermsAndConditions || undefined,
    });
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center min-h-[400px] gap-3">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="text-muted-foreground text-sm animate-pulse">جاري تحميل الإعدادات...</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-6xl px-4 sm:px-0" dir="rtl">
        {/* العنوان */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link href="/settings">
              <Button variant="ghost" size="icon" type="button">
                <ArrowRight className="w-5 h-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold">إعدادات الجمعية</h1>
              <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                إدارة بيانات الجمعية الثابتة المستخدمة في العقود والمستندات الرسمية
              </p>
            </div>
          </div>
          <Button onClick={handleSave} disabled={updateMutation.isPending} className="w-full sm:w-auto gradient-primary text-white order-first sm:order-last">
            {updateMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin ml-2" />
            ) : (
              <Save className="h-4 w-4 ml-2" />
            )}
            حفظ الإعدادات
          </Button>
        </div>

        <Tabs key={defaultTab} defaultValue={defaultTab} className="space-y-6">
          <div className="w-full overflow-x-auto overflow-y-hidden pb-3 scrollbar-thin">
            <TabsList 
              className="bg-muted/60 p-1 inline-flex md:grid w-auto md:w-full border shadow-sm rounded-xl h-auto"
              style={{ gridTemplateColumns: `repeat(${[canShowBasic, canShowSigners, canShowBanks, canShowContracts].filter(Boolean).length}, minmax(0, 1fr))` }}
            >
              {canShowBasic && (
                <TabsTrigger 
                  value="basic" 
                  className="px-6 py-2.5 rounded-lg data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-sm whitespace-nowrap focus:outline-none focus-visible:ring-0 focus-visible:ring-offset-0"
                >
                  معلومات أساسية
                </TabsTrigger>
              )}
              {canShowSigners && (
                <TabsTrigger 
                  value="signatory" 
                  className="px-6 py-2.5 rounded-lg data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-sm whitespace-nowrap focus:outline-none focus-visible:ring-0 focus-visible:ring-offset-0"
                >
                  مفوضو التوقيع
                </TabsTrigger>
              )}
              {canShowBanks && (
                <TabsTrigger 
                  value="bank" 
                  className="px-6 py-2.5 rounded-lg data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-sm whitespace-nowrap focus:outline-none focus-visible:ring-0 focus-visible:ring-offset-0"
                >
                  البيانات البنكية
                </TabsTrigger>
              )}
              {canShowContracts && (
                <TabsTrigger 
                  value="contracts" 
                  className="px-6 py-2.5 rounded-lg data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-sm whitespace-nowrap focus:outline-none focus-visible:ring-0 focus-visible:ring-offset-0"
                >
                  إعدادات العقود
                </TabsTrigger>
              )}
            </TabsList>
          </div>

          {/* معلومات الجمعية الأساسية */}
          {canShowBasic && (
            <TabsContent value="basic" className="space-y-6">
            <Card className="border-0 shadow-sm overflow-hidden" dir="rtl">
              <CardHeader className="p-4 sm:p-6 pb-2">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Building2 className="h-5 w-5 text-primary" />
                  معلومات الجمعية الأساسية
                </CardTitle>
                <CardDescription className="text-xs sm:text-sm">
                  البيانات الأساسية للجمعية التي تظهر في العقود والمستندات الرسمية
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 sm:p-6 space-y-6" dir="rtl">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="name" className="text-xs sm:text-sm font-bold">اسم الجمعية</Label>
                    <Input
                      id="name"
                      value={orgSettings.name}
                      onChange={(e) => setOrgSettings({ ...orgSettings, name: e.target.value })}
                      placeholder="اسم الجمعية الرسمي"
                      className="h-10 sm:h-11"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="metaTitle" className="text-xs sm:text-sm font-bold flex items-center gap-1.5">
                      <Globe className="w-4 h-4 text-primary" />
                      عنوان تبويب المتصفح
                    </Label>
                    <Input
                      id="metaTitle"
                      value={orgSettings.metaTitle}
                      onChange={(e) => setOrgSettings({ ...orgSettings, metaTitle: e.target.value })}
                      placeholder="مثال: بوابة تمام | نظام إدارة برامج ومشاريع الجمعية"
                      className="h-10 sm:h-11 font-medium"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="officialReportsName" className="text-xs sm:text-sm font-bold">اسم الجمعية للتقارير الرسمية</Label>
                    <Input
                      id="officialReportsName"
                      value={orgSettings.officialReportsName}
                      onChange={(e) => setOrgSettings({ ...orgSettings, officialReportsName: e.target.value })}
                      placeholder="يظهر في ترويسة التقارير المطبوعة"
                      className="h-10 sm:h-11"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="licenseNumber" className="text-xs sm:text-sm font-bold">رقم الترخيص</Label>
                    <Input
                      id="licenseNumber"
                      value={orgSettings.licenseNumber}
                      onChange={(e) => setOrgSettings({ ...orgSettings, licenseNumber: e.target.value })}
                      placeholder="رقم ترخيص الجمعية"
                      className="h-10 sm:h-11"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="address" className="text-xs sm:text-sm font-bold">العنوان</Label>
                  <Textarea
                    id="address"
                    value={orgSettings.address}
                    onChange={(e) => setOrgSettings({ ...orgSettings, address: e.target.value })}
                    placeholder="العنوان التفصيلي للجمعية"
                    rows={2}
                    className="resize-none"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="city" className="text-xs sm:text-sm font-bold">المدينة</Label>
                    <Input
                      id="city"
                      value={orgSettings.city}
                      onChange={(e) => setOrgSettings({ ...orgSettings, city: e.target.value })}
                      placeholder="المدينة"
                      className="h-10 sm:h-11"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone" className="text-xs sm:text-sm font-bold">رقم الهاتف</Label>
                    <Input
                      id="phone"
                      value={orgSettings.phone}
                      onChange={(e) => setOrgSettings({ ...orgSettings, phone: e.target.value })}
                      placeholder="رقم الهاتف"
                      className="h-10 sm:h-11 text-right"
                    />
                  </div>
                  <div className="space-y-2 sm:col-span-2 lg:col-span-1">
                    <Label htmlFor="email" className="text-xs sm:text-sm font-bold">البريد الإلكتروني</Label>
                    <Input
                      id="email"
                      type="email"
                      value={orgSettings.email}
                      onChange={(e) => setOrgSettings({ ...orgSettings, email: e.target.value })}
                      placeholder="البريد الإلكتروني"
                      className="h-10 sm:h-11 text-right"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="website" className="text-xs sm:text-sm font-bold">الموقع الإلكتروني</Label>
                  <Input
                    id="website"
                    value={orgSettings.website}
                    onChange={(e) => setOrgSettings({ ...orgSettings, website: e.target.value })}
                    placeholder="https://www.example.com"
                    className="h-10 sm:h-11 text-right"
                  />
                </div>

                {/* جهات الإشراف */}
                <div className="border-t border-dashed pt-6 mt-2">
                  <h3 className="font-bold text-sm sm:text-base mb-4 flex items-center gap-2">
                    <div className="w-1.5 h-4 bg-primary rounded-full" />
                    جهات الإشراف
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="administrativeSupervisor" className="text-xs sm:text-sm font-bold text-muted-foreground">جهة الإشراف الإداري</Label>
                      <Input
                        id="administrativeSupervisor"
                        value={orgSettings.administrativeSupervisor}
                        onChange={(e) => setOrgSettings({ ...orgSettings, administrativeSupervisor: e.target.value })}
                        placeholder="وزارة الموارد البشرية..."
                        className="h-10 sm:h-11"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="technicalSupervisor" className="text-xs sm:text-sm font-bold text-muted-foreground">جهة الإشراف الفني</Label>
                      <Input
                        id="technicalSupervisor"
                        value={orgSettings.technicalSupervisor}
                        onChange={(e) => setOrgSettings({ ...orgSettings, technicalSupervisor: e.target.value })}
                        placeholder="وزارة الشؤون الإسلامية..."
                        className="h-10 sm:h-11"
                      />
                    </div>
                  </div>
                </div>

                {/* أسماء المسؤولين */}
                <div className="border-t border-dashed pt-6">
                  <h3 className="font-bold text-sm sm:text-base mb-4 flex items-center gap-2">
                    <div className="w-1.5 h-4 bg-primary rounded-full" />
                    أسماء المسؤولين
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="boardChairmanName" className="text-xs sm:text-sm font-bold text-muted-foreground">رئيس مجلس الإدارة</Label>
                      <Input
                        id="boardChairmanName"
                        value={orgSettings.boardChairmanName}
                        onChange={(e) => setOrgSettings({ ...orgSettings, boardChairmanName: e.target.value })}
                        placeholder="اسم رئيس مجلس الإدارة"
                        className="h-10 sm:h-11"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="executiveDirectorName" className="text-xs sm:text-sm font-bold text-muted-foreground">المدير التنفيذي</Label>
                      <Input
                        id="executiveDirectorName"
                        value={orgSettings.executiveDirectorName}
                        onChange={(e) => setOrgSettings({ ...orgSettings, executiveDirectorName: e.target.value })}
                        placeholder="اسم المدير التنفيذي"
                        className="h-10 sm:h-11"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="accountantName" className="text-xs sm:text-sm font-bold text-muted-foreground">المحاسب</Label>
                      <Input
                        id="accountantName"
                        value={orgSettings.accountantName}
                        onChange={(e) => setOrgSettings({ ...orgSettings, accountantName: e.target.value })}
                        placeholder="اسم المحاسب"
                        className="h-10 sm:h-11"
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
            </TabsContent>
          )}

          {/* مفوضو التوقيع */}
          {canShowSigners && (
            <TabsContent value="signatory">
              <SignatoriesSection />
            </TabsContent>
          )}

          {/* البيانات البنكية */}
          {canShowBanks && (
            <TabsContent value="bank">
            <Card className="border-0 shadow-sm overflow-hidden" dir="rtl">
              <CardHeader className="p-4 sm:p-6 pb-2">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <CreditCard className="h-5 w-5 text-primary" />
                  البيانات البنكية
                </CardTitle>
                <CardDescription className="text-xs sm:text-sm">
                  معلومات الحساب البنكي للجمعية المستخدمة في العقود والتحويلات
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 sm:p-6 space-y-6" dir="rtl">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="bankName" className="text-xs sm:text-sm font-bold">اسم البنك</Label>
                    <Input
                      id="bankName"
                      value={orgSettings.bankName}
                      onChange={(e) => setOrgSettings({ ...orgSettings, bankName: e.target.value })}
                      placeholder="اسم البنك"
                      className="h-10 sm:h-11"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="bankAccountName" className="text-xs sm:text-sm font-bold">اسم الحساب</Label>
                    <Input
                      id="bankAccountName"
                      value={orgSettings.bankAccountName}
                      onChange={(e) => setOrgSettings({ ...orgSettings, bankAccountName: e.target.value })}
                      placeholder="اسم صاحب الحساب"
                      className="h-10 sm:h-11"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="iban" className="text-xs sm:text-sm font-bold">رقم الآيبان (IBAN)</Label>
                  <Input
                    id="iban"
                    value={orgSettings.iban}
                    onChange={(e) => {
                      let value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "");
                      if (!value.startsWith("SA")) {
                        value = "SA" + value.replace(/^SA/i, "");
                      }
                      if (value.length > 24) value = value.slice(0, 24);
                      setOrgSettings({ ...orgSettings, iban: value });
                    }}
                    placeholder="SA0000000000000000000000"
                    dir="ltr"
                    maxLength={24}
                    className="h-10 sm:h-11 font-mono tracking-wider"
                  />
                  <p className="text-[10px] sm:text-xs text-muted-foreground flex items-center gap-1.5">
                    <Star className="h-3 w-3 fill-current text-amber-500" />
                    يجب أن يبدأ بـ SA متبوعاً بـ 22 رقم
                  </p>
                </div>
              </CardContent>
            </Card>
            </TabsContent>
          )}

          {/* إعدادات العقود */}
          {canShowContracts && (
            <TabsContent value="contracts" className="space-y-6">
            <Card className="border-0 shadow-sm overflow-hidden" dir="rtl">
              <CardHeader className="p-4 sm:p-6 pb-2">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <FileText className="h-5 w-5 text-primary" />
                  إعدادات العقود
                </CardTitle>
                <CardDescription className="text-xs sm:text-sm">
                  تخصيص إعدادات العقود والنصوص الافتراضية
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 sm:p-6 space-y-6" dir="rtl">
                <div className="space-y-3">
                  <Label htmlFor="contractPrefix" className="text-xs sm:text-sm font-bold">بادئة رقم العقد</Label>
                  <Input
                    id="contractPrefix"
                    value={orgSettings.contractPrefix}
                    onChange={(e) => setOrgSettings({ ...orgSettings, contractPrefix: e.target.value })}
                    placeholder="CON"
                    className="max-w-xs h-10 sm:h-11 font-mono"
                  />
                  <p className="text-[10px] sm:text-xs text-muted-foreground bg-muted/50 p-2 rounded-lg border inline-block">
                    مثال: <span className="font-bold text-foreground">{orgSettings.contractPrefix}-2024-0001</span>
                  </p>
                </div>

                <div className="space-y-3">
                  <Label htmlFor="contractFooterText" className="text-xs sm:text-sm font-bold">نص تذييل العقد</Label>
                  <Textarea
                    id="contractFooterText"
                    value={orgSettings.contractFooterText}
                    onChange={(e) => setOrgSettings({ ...orgSettings, contractFooterText: e.target.value })}
                    placeholder="النص الذي يظهر في نهاية كل عقد..."
                    rows={3}
                    className="resize-none"
                  />
                </div>

                <div className="space-y-3">
                  <Label htmlFor="contractTermsAndConditions" className="text-xs sm:text-sm font-bold">الشروط والأحكام الافتراضية</Label>
                  <Textarea
                    id="contractTermsAndConditions"
                    value={orgSettings.contractTermsAndConditions}
                    onChange={(e) => setOrgSettings({ ...orgSettings, contractTermsAndConditions: e.target.value })}
                    placeholder="الشروط والأحكام الافتراضية للعقود..."
                    rows={8}
                    className="resize-none"
                  />
                </div>
              </CardContent>
            </Card>
            </TabsContent>
          )}
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
