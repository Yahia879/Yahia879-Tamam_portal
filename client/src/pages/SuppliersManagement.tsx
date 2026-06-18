import { useState } from "react";
import { useLocation } from "wouter";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { usePermission } from "@/hooks/usePermission";
import { PermissionGuard } from "@/components/PermissionGuard";
import { FileUpload } from "@/components/FileUpload";
import { LocationPicker } from "@/components/LocationPicker";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Building2,
  Search,
  MoreHorizontal,
  CheckCircle2,
  XCircle,
  Eye,
  Clock,
  Ban,
  FileText,
  Phone,
  Mail,
  MapPin,
  CreditCard,
  Loader2,
  RefreshCw,
  ExternalLink,
  Plus,
  Download,
  Pencil,
  Trash2,
  Save,
} from "lucide-react";

// تسميات مجالات العمل
const WORK_FIELD_LABELS: Record<string, string> = {
  construction: "بناء وتشييد",
  engineering_consulting: "استشارات هندسية",
  electrical: "أعمال كهربائية",
  plumbing: "أعمال سباكة",
  hvac: "تكييف وتبريد",
  finishing: "تشطيبات",
  carpentry: "نجارة",
  aluminum: "ألمنيوم",
  painting: "دهانات",
  flooring: "أرضيات",
  landscaping: "تنسيق حدائق",
  cleaning: "نظافة",
  maintenance: "صيانة",
  security_systems: "أنظمة أمنية",
  sound_systems: "أنظمة صوتية",
  solar_energy: "طاقة شمسية",
  water_systems: "أنظمة مياه",
  furniture: "أثاث",
  carpets: "سجاد",
  supplies: "توريدات",
  other: "أخرى",
};

// مجالات العمل المتاحة (مطابق لصفحة التسجيل)
const WORK_FIELDS = [
  { key: "construction", label: "بناء وتشييد" },
  { key: "engineering_consulting", label: "استشارات هندسية" },
  { key: "electrical", label: "أعمال كهربائية" },
  { key: "plumbing", label: "أعمال سباكة" },
  { key: "hvac", label: "تكييف وتبريد" },
  { key: "finishing", label: "تشطيبات" },
  { key: "carpentry", label: "نجارة" },
  { key: "aluminum", label: "ألمنيوم" },
  { key: "painting", label: "دهانات" },
  { key: "flooring", label: "أرضيات" },
  { key: "landscaping", label: "تنسيق حدائق" },
  { key: "cleaning", label: "نظافة" },
  { key: "maintenance", label: "صيانة" },
  { key: "security_systems", label: "أنظمة أمنية" },
  { key: "sound_systems", label: "أنظمة صوتية" },
  { key: "solar_energy", label: "طاقة شمسية" },
  { key: "water_systems", label: "أنظمة مياه" },
  { key: "furniture", label: "أثاث" },
  { key: "carpets", label: "سجاد" },
  { key: "supplies", label: "توريدات" },
  { key: "other", label: "أخرى" },
];

// ألوان حالات الاعتماد
const STATUS_CONFIG = {
  pending: { label: "قيد المراجعة", color: "bg-yellow-100 text-yellow-800", icon: Clock },
  approved: { label: "معتمد", color: "bg-green-100 text-green-800", icon: CheckCircle2 },
  rejected: { label: "مرفوض", color: "bg-red-100 text-red-800", icon: XCircle },
  suspended: { label: "موقوف", color: "bg-gray-100 text-gray-800", icon: Ban },
};

export default function SuppliersManagement() {
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const hasApprovePermission = usePermission("suppliers.approve");
  const hasEditPermission = usePermission("suppliers.edit");
  const hasViewDetailsPermission = usePermission("suppliers.view_details");
  const canSuspend = hasApprovePermission || hasEditPermission || ["super_admin", "system_admin"].includes(user?.role ?? "");
  const canViewDetails = hasViewDetailsPermission || ["super_admin", "system_admin"].includes(user?.role ?? "");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("pending");
  // دالة مساعدة لتحويل مجالات العمل إلى مصفوفة بشكل آمن
  const getWorkFieldsArray = (workFields: any): string[] => {
    if (!workFields) return [];
    if (Array.isArray(workFields)) return workFields;
    if (typeof workFields === "string") {
      try {
        // محاولة التحليل كـ JSON
        if (workFields.startsWith("[") && workFields.endsWith("]")) {
          return JSON.parse(workFields);
        }
        // محاولة الفصل بالفواصل
        if (workFields.includes(",")) {
          return workFields.split(",").map(s => s.trim());
        }
        // قيمة واحدة نصية
        return [workFields];
      } catch (e) {
        return [];
      }
    }
    return [];
  };

  // دالة مساعدة لتحويل المرفقات الإضافية إلى مصفوفة بشكل آمن
  const getOtherAttachmentsArray = (attachments: any): { name: string; fileData: string }[] => {
    if (!attachments) return [];
    if (Array.isArray(attachments)) return attachments;
    if (typeof attachments === "string") {
      try {
        return JSON.parse(attachments);
      } catch (e) {
        return [];
      }
    }
    return [];
  };

  // جلب الموردين
  const { data: suppliers, isLoading, refetch } = trpc.suppliers.list.useQuery({
    approvalStatus: activeTab === "all" ? undefined : activeTab as any,
    search: searchQuery || undefined,
  });

  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [selectedSupplier, setSelectedSupplier] = useState<any>(null);

  const approveMutation = trpc.suppliers.approve.useMutation({
    onSuccess: () => {
      toast.success("تم اعتماد المورد بنجاح");
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || "حدث خطأ أثناء اعتماد المورد");
    },
  });

  const rejectMutation = trpc.suppliers.reject.useMutation({
    onSuccess: () => {
      toast.success("تم رفض المورد");
      refetch();
      setShowRejectDialog(false);
      setRejectReason("");
      setSelectedSupplier(null);
    },
    onError: (error) => {
      toast.error(error.message || "حدث خطأ أثناء رفض المورد");
    },
  });

  const suspendMutation = trpc.suppliers.suspend.useMutation({
    onSuccess: () => {
      toast.success("تم إيقاف المورد");
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || "حدث خطأ أثناء إيقاف المورد");
    },
  });

  // اعتماد المورد
  const handleApprove = (supplierId: number) => {
    approveMutation.mutate({ id: supplierId });
  };

  // رفض المورد
  const handleReject = () => {
    if (!selectedSupplier || !rejectReason.trim()) return;
    rejectMutation.mutate({ id: selectedSupplier.id, reason: rejectReason });
  };

  // فتح تفاصيل المورد بالانتقال لصفحة التفاصيل المنفصلة
  const openSupplierDetails = (supplier: any) => {
    navigate(`/suppliers/${supplier.id}`);
  };

  // إيقاف المورد
  const handleSuspend = (supplierId: number) => {
    suspendMutation.mutate({ id: supplierId, reason: "تم الإيقاف بواسطة الإدارة" });
  };

  // جلب البنوك ديناميكياً من قاعدة البيانات (متطابق مع صفحة التسجيل)
  const { data: allCategories = [] } = trpc.categories.getAllCategories.useQuery();
  const banks = allCategories
    .filter((cat: any) => cat.type === "bank")
    .map((cat: any) => cat.nameAr || cat.name);

  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editForm, setEditForm] = useState({
    id: 0,
    name: "",
    entityType: "establishment" as "company" | "establishment",
    commercialRegister: "",
    commercialActivity: "",
    yearsOfExperience: 0,
    workFields: [] as string[],
    address: "",
    googleMapsUrl: "",
    email: "",
    phone: "",
    phoneSecondary: "",
    contactPerson: "",
    contactPersonTitle: "",
    bankAccountName: "",
    bankName: "",
    iban: "",
    taxNumber: "",
    commercialRegisterDoc: "",
    vatCertificateDoc: "",
    nationalAddressDoc: "",
    bankCertificateDoc: "",
    otherAttachments: [] as { name: string; fileData: string }[],
  });

  const handleOpenEdit = (supplier: any) => {
    setEditForm({
      id: supplier.id,
      name: supplier.name || "",
      entityType: supplier.entityType || "establishment",
      commercialRegister: supplier.commercialRegister || "",
      commercialActivity: supplier.commercialActivity || "",
      yearsOfExperience: supplier.yearsOfExperience || 0,
      workFields: getWorkFieldsArray(supplier.workFields),
      address: supplier.address || "",
      googleMapsUrl: supplier.googleMapsUrl || "",
      email: supplier.email || "",
      phone: supplier.phone || "",
      phoneSecondary: supplier.phoneSecondary || "",
      contactPerson: supplier.contactPerson || "",
      contactPersonTitle: supplier.contactPersonTitle || "",
      bankAccountName: supplier.bankAccountName || "",
      bankName: supplier.bankName || "",
      iban: supplier.iban || "",
      taxNumber: supplier.taxNumber || "",
      commercialRegisterDoc: supplier.commercialRegisterDoc || "",
      vatCertificateDoc: supplier.vatCertificateDoc || "",
      nationalAddressDoc: supplier.nationalAddressDoc || "",
      bankCertificateDoc: supplier.bankCertificateDoc || "",
      otherAttachments: getOtherAttachmentsArray(supplier.otherAttachments),
    });
    setShowEditDialog(true);
  };

  const editMutation = trpc.suppliers.update.useMutation({
    onSuccess: () => {
      toast.success("تم تحديث بيانات المورد بنجاح");
      setShowEditDialog(false);
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || "حدث خطأ أثناء تحديث بيانات المورد");
    },
  });

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editForm.name || !editForm.commercialRegister || !editForm.commercialActivity) {
      toast.error("يرجى ملء جميع حقول معلومات الكيان المطلوبة");
      return;
    }
    if (editForm.workFields.length === 0) {
      toast.error("يرجى اختيار مجال عمل واحد على الأقل");
      return;
    }
    if (!editForm.address || !editForm.googleMapsUrl || !editForm.email || !editForm.phone || !editForm.contactPerson || !editForm.contactPersonTitle) {
      toast.error("يرجى ملء جميع حقول معلومات التواصل المطلوبة");
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(editForm.email)) {
      toast.error("البريد الإلكتروني غير صحيح");
      return;
    }
    if (!editForm.bankAccountName || !editForm.bankName || !editForm.iban || !editForm.taxNumber) {
      toast.error("يرجى ملء جميع حقول معلومات الحساب البنكي المطلوبة");
      return;
    }
    if (!editForm.iban.match(/^SA\d{22}$/)) {
      toast.error("رقم الآيبان غير صحيح (يجب أن يبدأ بـ SA متبوعاً بـ 22 رقم)");
      return;
    }
    if (!editForm.commercialRegisterDoc || !editForm.vatCertificateDoc || !editForm.nationalAddressDoc || !editForm.bankCertificateDoc) {
      toast.error("يرجى رفع جميع المرفقات المطلوبة (بما في ذلك الشهادة البنكية)");
      return;
    }
    for (const attr of editForm.otherAttachments) {
      if (attr.fileData && !attr.name) {
        toast.error("يرجى إدخال اسم المرفق لكل ملف مرفوع في المرفقات الإضافية");
        return;
      }
    }

    editMutation.mutate({
      id: editForm.id,
      name: editForm.name,
      entityType: editForm.entityType,
      commercialRegister: editForm.commercialRegister,
      commercialActivity: editForm.commercialActivity,
      yearsOfExperience: editForm.yearsOfExperience,
      workFields: editForm.workFields as any,
      address: editForm.address,
      googleMapsUrl: editForm.googleMapsUrl,
      email: editForm.email,
      phone: editForm.phone,
      phoneSecondary: editForm.phoneSecondary || undefined,
      contactPerson: editForm.contactPerson,
      contactPersonTitle: editForm.contactPersonTitle,
      bankAccountName: editForm.bankAccountName,
      bankName: editForm.bankName,
      iban: editForm.iban,
      taxNumber: editForm.taxNumber,
      commercialRegisterDoc: editForm.commercialRegisterDoc,
      vatCertificateDoc: editForm.vatCertificateDoc,
      nationalAddressDoc: editForm.nationalAddressDoc,
      bankCertificateDoc: editForm.bankCertificateDoc,
      otherAttachments: editForm.otherAttachments,
    });
  };

  const toggleWorkField = (field: string) => {
    setEditForm((prev) => ({
      ...prev,
      workFields: prev.workFields.includes(field)
        ? prev.workFields.filter((f) => f !== field)
        : [...prev.workFields, field]
    }));
  };

  // إحصائيات سريعة
  const suppliersList = suppliers?.suppliers || [];
  const stats = suppliers?.stats || {
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* العنوان */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl md:text-2xl font-bold">إدارة الموردين</h1>
            <p className="text-sm md:text-base text-muted-foreground">مراجعة واعتماد طلبات تسجيل الموردين</p>
          </div>
          <div className="grid grid-cols-2 sm:flex gap-2 w-full sm:w-auto">
            <PermissionGuard permission="suppliers.add">
              <Button onClick={() => navigate("/supplier/register")} className="w-full sm:w-auto">
                <Plus className="h-4 w-4 ml-2" />
                إضافة مورد
              </Button>
            </PermissionGuard>
            <Button variant="outline" onClick={() => refetch()} className="w-full sm:w-auto">
              <RefreshCw className="h-4 w-4 ml-2" />
              تحديث
            </Button>
          </div>
        </div>

        {/* الإحصائيات */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">إجمالي الموردين</p>
                  <p className="text-2xl font-bold">{stats.total}</p>
                </div>
                <Building2 className="h-8 w-8 text-primary/20" />
              </div>
            </CardContent>
          </Card>
          <Card className="border-yellow-200 bg-yellow-50/50">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-yellow-700">قيد المراجعة</p>
                  <p className="text-2xl font-bold text-yellow-700">{stats.pending}</p>
                </div>
                <Clock className="h-8 w-8 text-yellow-300" />
              </div>
            </CardContent>
          </Card>
          <Card className="border-green-200 bg-green-50/50">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-green-700">معتمدين</p>
                  <p className="text-2xl font-bold text-green-700">{stats.approved}</p>
                </div>
                <CheckCircle2 className="h-8 w-8 text-green-300" />
              </div>
            </CardContent>
          </Card>
          <Card className="border-red-200 bg-red-50/50">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-red-700">مرفوضين</p>
                  <p className="text-2xl font-bold text-red-700">{stats.rejected}</p>
                </div>
                <XCircle className="h-8 w-8 text-red-300" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* البحث والتصفية */}
        <Card>
          <CardHeader>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="بحث باسم المورد أو السجل التجاري..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pr-10"
                />
              </div>
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full md:w-auto">
                <TabsList className="grid w-full grid-cols-2 md:inline-flex h-auto md:w-auto gap-1 md:gap-0">
                  <TabsTrigger value="all">الكل</TabsTrigger>
                  <TabsTrigger value="pending">قيد المراجعة</TabsTrigger>
                  <TabsTrigger value="approved">معتمدين</TabsTrigger>
                  <TabsTrigger value="rejected">مرفوضين</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : suppliersList.length === 0 ? (
              <div className="text-center py-12">
                <Building2 className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                <p className="text-muted-foreground">لا يوجد موردين</p>
              </div>
            ) : (
              <Table className="not-italic">
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-right">اسم الكيان</TableHead>
                    <TableHead className="text-right">النوع</TableHead>
                    <TableHead className="text-right">السجل التجاري</TableHead>
                    <TableHead className="text-right">مجالات العمل</TableHead>
                    <TableHead className="text-right">الحالة</TableHead>
                    <TableHead className="text-right">تاريخ التسجيل</TableHead>
                    <TableHead className="text-left">الإجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {suppliersList.map((supplier) => {
                    const statusConfig = STATUS_CONFIG[supplier.approvalStatus as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.pending;
                    const StatusIcon = statusConfig.icon;
                    
                    return (
                      <TableRow key={supplier.id}>
                        <TableCell className="font-bold text-slate-800 dark:text-slate-200 text-right">
                          {canViewDetails ? (
                            <button
                              onClick={() => openSupplierDetails(supplier)}
                              className="hover:text-teal-600 hover:underline text-right transition-colors"
                            >
                              {supplier.name}
                            </button>
                          ) : (
                            <span>{supplier.name}</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {supplier.entityType === "company" ? "شركة" : "مؤسسة"}
                        </TableCell>
                        <TableCell className="text-right" dir="ltr">{supplier.commercialRegister}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex flex-wrap gap-1 justify-start">
                            {getWorkFieldsArray(supplier.workFields).slice(0, 2).map((field) => (
                              <Badge key={field} variant="secondary" className="text-xs">
                                {WORK_FIELD_LABELS[field] || field}
                              </Badge>
                            ))}
                            {getWorkFieldsArray(supplier.workFields).length > 2 && (
                              <Badge variant="outline" className="text-xs">
                                +{getWorkFieldsArray(supplier.workFields).length - 2}
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge className={statusConfig.color}>
                            <StatusIcon className="h-3 w-3 ml-1" />
                            {statusConfig.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {new Date(supplier.createdAt).toLocaleDateString("ar-SA")}
                        </TableCell>
                        <TableCell className="text-left">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {canViewDetails && (
                                <DropdownMenuItem onClick={() => openSupplierDetails(supplier)}>
                                  <Eye className="h-4 w-4 ml-2" />
                                  عرض التفاصيل
                                </DropdownMenuItem>
                              )}
                              {hasEditPermission && (
                                <DropdownMenuItem onClick={() => handleOpenEdit(supplier)}>
                                  <Pencil className="h-4 w-4 ml-2" />
                                  تعديل البيانات
                                </DropdownMenuItem>
                              )}
                              {supplier.approvalStatus === "pending" && hasApprovePermission && (
                                <>
                                  <DropdownMenuItem
                                    onClick={() => handleApprove(supplier.id)}
                                    className="text-green-600 font-bold"
                                  >
                                    <CheckCircle2 className="h-4.5 w-4.5 ml-2 text-green-600" />
                                    اعتماد المورد
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => {
                                      setSelectedSupplier(supplier);
                                      setShowRejectDialog(true);
                                    }}
                                    className="text-red-600 font-bold"
                                  >
                                    <XCircle className="h-4.5 w-4.5 ml-2 text-red-600" />
                                    رفض المورد
                                  </DropdownMenuItem>
                                </>
                              )}
                              {supplier.approvalStatus === "approved" && canSuspend && (
                                <DropdownMenuItem
                                  onClick={() => handleSuspend(supplier.id)}
                                  className="text-orange-600"
                                >
                                  <Ban className="h-4 w-4 ml-2" />
                                  إيقاف
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* نافذة رفض المورد */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent className="w-[90vw] max-w-md rounded-2xl p-6" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-right text-lg font-bold">تأكيد رفض المورد</DialogTitle>
            <DialogDescription className="text-right text-sm mt-2">
              يرجى إدخال سبب رفض طلب تسجيل المورد "{selectedSupplier?.name}":
            </DialogDescription>
          </DialogHeader>
          <div className="my-4">
            <Textarea
              placeholder="اكتب سبب الرفض هنا..."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              className="w-full text-right"
              rows={3}
            />
          </div>
          <DialogFooter className="flex flex-col-reverse sm:flex-row-reverse gap-2 mt-6">
            <Button
              onClick={handleReject}
              disabled={rejectMutation.isPending || !rejectReason.trim()}
              className="bg-red-600 hover:bg-red-700 text-white font-bold"
            >
              {rejectMutation.isPending ? "جاري الرفض..." : "تأكيد الرفض"}
            </Button>
            <Button variant="outline" onClick={() => setShowRejectDialog(false)}>
              إلغاء
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* نافذة تعديل بيانات المورد */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="w-[95vw] max-w-4xl rounded-2xl p-6 max-h-[90vh] overflow-y-auto" dir="rtl">
          <DialogHeader dir="rtl">
            <DialogTitle className="text-right text-lg sm:text-xl font-bold">تعديل بيانات المورد</DialogTitle>
            <DialogDescription className="text-right text-xs sm:text-sm mt-1 text-muted-foreground">
              تحديث معلومات المورد والبيانات المالية وتفاصيل الاتصال والمرفقات.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleEditSubmit} className="space-y-6 my-4 text-right">
            {/* قسم معلومات الكيان */}
            <Card className="border-0 sm:border shadow-md">
              <CardHeader className="bg-gradient-to-l from-teal-500 to-teal-600 text-white rounded-t-lg p-4 sm:p-6">
                <CardTitle className="flex items-center gap-2 text-lg sm:text-xl justify-start">
                  <Building2 className="h-5 w-5" />
                  معلومات الكيان
                </CardTitle>
                <CardDescription className="text-teal-100 text-xs sm:text-sm">
                  البيانات الأساسية للتعريف بالمنشأة
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-4 sm:pt-6 px-4 sm:px-6 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="entityName" className="text-sm sm:text-base">اسم الكيان *</Label>
                    <Input
                      id="entityName"
                      value={editForm.name}
                      onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                      placeholder="اسم الشركة أو المؤسسة"
                      className="h-10 sm:h-11"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="entityType" className="text-sm sm:text-base">نوع الكيان *</Label>
                    <Select
                      value={editForm.entityType}
                      onValueChange={(value: "company" | "establishment") => setEditForm({ ...editForm, entityType: value })}
                    >
                      <SelectTrigger className="h-10 sm:h-11 text-right w-full" dir="rtl">
                        <SelectValue placeholder="اختر نوع الكيان" />
                      </SelectTrigger>
                      <SelectContent dir="rtl">
                        <SelectItem value="company" className="text-right">شركة</SelectItem>
                        <SelectItem value="establishment" className="text-right">مؤسسة</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="commercialRegister" className="text-sm sm:text-base">رقم السجل التجاري *</Label>
                    <Input
                      id="commercialRegister"
                      value={editForm.commercialRegister}
                      onChange={(e) => setEditForm({ ...editForm, commercialRegister: e.target.value })}
                      placeholder="أدخل رقم السجل التجاري"
                      className="h-10 sm:h-11"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="yearsOfExperience" className="text-sm sm:text-base">عدد سنوات الخبرة في النشاط *</Label>
                    <Input
                      id="yearsOfExperience"
                      type="number"
                      min="0"
                      value={editForm.yearsOfExperience}
                      onChange={(e) => setEditForm({ ...editForm, yearsOfExperience: parseInt(e.target.value) || 0 })}
                      className="h-10 sm:h-11"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="commercialActivity" className="text-sm sm:text-base">النشاط حسب السجل التجاري *</Label>
                  <Textarea
                    id="commercialActivity"
                    value={editForm.commercialActivity}
                    onChange={(e) => setEditForm({ ...editForm, commercialActivity: e.target.value })}
                    placeholder="أدخل النشاط كما هو مسجل في السجل التجاري"
                    rows={2}
                    className="min-h-[80px]"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-sm sm:text-base">مجالات العمل التي ينفذها الكيان *</Label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 p-3 sm:p-4 border rounded-lg bg-gray-50 dark:bg-slate-900/30">
                    {WORK_FIELDS.map((field) => (
                      <div key={field.key} className="flex items-center space-x-2 space-x-reverse justify-start">
                        <Checkbox
                          id={`edit-field-${field.key}`}
                          checked={editForm.workFields?.includes(field.key) || false}
                          onCheckedChange={() => toggleWorkField(field.key)}
                        />
                        <Label htmlFor={`edit-field-${field.key}`} className="text-xs sm:text-sm cursor-pointer leading-tight">
                          {field.label}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* قسم معلومات التواصل */}
            <Card className="border-0 sm:border shadow-md">
              <CardHeader className="bg-gradient-to-l from-blue-500 to-blue-600 text-white rounded-t-lg p-4 sm:p-6">
                <CardTitle className="flex items-center gap-2 text-lg sm:text-xl justify-start">
                  <Phone className="h-5 w-5" />
                  معلومات التواصل
                </CardTitle>
                <CardDescription className="text-blue-100 text-xs sm:text-sm">
                  بيانات الاتصال والموقع الجغرافي للكيان
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-4 sm:pt-6 px-4 sm:px-6 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="address" className="text-sm sm:text-base">عنوان الكيان *</Label>
                  <Textarea
                    id="address"
                    value={editForm.address}
                    onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                    placeholder="أدخل العنوان التفصيلي"
                    rows={2}
                    className="min-h-[80px]"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-sm sm:text-base font-bold">موقع الكيان على الخريطة *</Label>
                  <LocationPicker
                    value={(() => {
                      if (!editForm.googleMapsUrl) return undefined;
                      const match = editForm.googleMapsUrl.match(/q=(-?\d+\.\d+),(-?\d+\.\d+)/);
                      if (match) {
                        return { lat: parseFloat(match[1]), lng: parseFloat(match[2]) };
                      }
                      return undefined;
                    })()}
                    onChange={(loc) => {
                      setEditForm(prev => ({
                        ...prev,
                        googleMapsUrl: `https://www.google.com/maps?q=${loc.lat},${loc.lng}`,
                        address: loc.address || prev.address
                      }));
                    }}
                    className="w-full mt-1"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-sm sm:text-base">البريد الإلكتروني *</Label>
                    <Input
                      id="email"
                      type="email"
                      value={editForm.email}
                      onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                      placeholder="example@company.com"
                      className="h-10 sm:h-11 text-left font-mono"
                      dir="ltr"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone" className="text-sm sm:text-base">رقم التواصل *</Label>
                    <Input
                      id="phone"
                      value={editForm.phone}
                      onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                      placeholder="05XXXXXXXX"
                      className="h-10 sm:h-11 text-left font-mono"
                      dir="ltr"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phoneSecondary" className="text-sm sm:text-base">رقم تواصل آخر</Label>
                  <Input
                    id="phoneSecondary"
                    value={editForm.phoneSecondary}
                    onChange={(e) => setEditForm({ ...editForm, phoneSecondary: e.target.value })}
                    placeholder="رقم هاتف إضافي (اختياري)"
                    className="h-10 sm:h-11 text-left font-mono"
                    dir="ltr"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="contactPerson" className="text-sm sm:text-base">اسم مسؤول التواصل *</Label>
                    <Input
                      id="contactPerson"
                      value={editForm.contactPerson}
                      onChange={(e) => setEditForm({ ...editForm, contactPerson: e.target.value })}
                      placeholder="اسم الشخص المسؤول"
                      className="h-10 sm:h-11"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="contactPersonTitle" className="text-sm sm:text-base">وظيفته في الكيان *</Label>
                    <Input
                      id="contactPersonTitle"
                      value={editForm.contactPersonTitle}
                      onChange={(e) => setEditForm({ ...editForm, contactPersonTitle: e.target.value })}
                      placeholder="المسمى الوظيفي"
                      className="h-10 sm:h-11"
                      required
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* قسم معلومات الحساب البنكي */}
            <Card className="border-0 sm:border shadow-md">
              <CardHeader className="bg-gradient-to-l from-purple-500 to-purple-600 text-white rounded-t-lg p-4 sm:p-6">
                <CardTitle className="flex items-center gap-2 text-lg sm:text-xl justify-start">
                  <CreditCard className="h-5 w-5" />
                  معلومات الحساب البنكي
                </CardTitle>
                <CardDescription className="text-purple-100 text-xs sm:text-sm">
                  البيانات المالية الخاصة بالتحويلات
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-4 sm:pt-6 px-4 sm:px-6 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="bankAccountName" className="text-sm sm:text-base">اسم الحساب *</Label>
                    <Input
                      id="bankAccountName"
                      value={editForm.bankAccountName}
                      onChange={(e) => setEditForm({ ...editForm, bankAccountName: e.target.value })}
                      placeholder="اسم صاحب الحساب"
                      className="h-10 sm:h-11"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="bankName" className="text-sm sm:text-base">اسم البنك *</Label>
                    <Select
                      value={editForm.bankName}
                      onValueChange={(val) => setEditForm({ ...editForm, bankName: val })}
                    >
                      <SelectTrigger className="h-10 sm:h-11 text-right w-full" dir="rtl">
                        <SelectValue placeholder="اختر البنك" />
                      </SelectTrigger>
                      <SelectContent dir="rtl">
                        {banks.map((bank: string) => (
                          <SelectItem key={bank} value={bank} className="text-right">
                            {bank}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="iban" className="text-sm sm:text-base">رقم الآيبان (IBAN) *</Label>
                    <Input
                      id="iban"
                      value={editForm.iban}
                      onChange={(e) => setEditForm({ ...editForm, iban: e.target.value.toUpperCase() })}
                      placeholder="SA0000000000000000000000"
                      className="h-10 sm:h-11 text-left font-mono"
                      dir="ltr"
                      required
                    />
                    <p className="text-[10px] sm:text-xs text-gray-500">يجب أن يبدأ بـ SA متبوعاً بـ 22 رقم</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="taxNumber" className="text-sm sm:text-base">الرقم الضريبي *</Label>
                    <Input
                      id="taxNumber"
                      value={editForm.taxNumber}
                      onChange={(e) => setEditForm({ ...editForm, taxNumber: e.target.value })}
                      placeholder="أدخل الرقم الضريبي"
                      className="h-10 sm:h-11"
                      required
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* قسم المرفقات */}
            <Card className="border-0 sm:border shadow-md">
              <CardHeader className="bg-gradient-to-l from-orange-500 to-orange-600 text-white rounded-t-lg p-4 sm:p-6">
                <CardTitle className="flex items-center gap-2 text-lg sm:text-xl justify-start">
                  <FileText className="h-5 w-5" />
                  المرفقات
                </CardTitle>
                <CardDescription className="text-orange-100 text-xs sm:text-sm">
                  المستندات الرسمية الداعمة (سارية المفعول)
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-4 sm:pt-6 px-4 sm:px-6 space-y-4">
                <div className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs sm:text-sm font-medium">إرفاق السجل التجاري *</Label>
                    <FileUpload
                      onFilesSelected={(files) => {
                        if (files.length > 0) {
                          setEditForm(prev => ({ ...prev, commercialRegisterDoc: files[0].fileData }));
                        }
                      }}
                      maxFiles={1}
                      label="السجل التجاري"
                      description="ارفع صورة السجل التجاري"
                    />
                    {editForm.commercialRegisterDoc && <p className="text-[10px] sm:text-xs text-green-600 font-medium">✓ المستند متوفر</p>}
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs sm:text-sm font-medium">إرفاق شهادة الضريبة *</Label>
                    <FileUpload
                      onFilesSelected={(files) => {
                        if (files.length > 0) {
                          setEditForm(prev => ({ ...prev, vatCertificateDoc: files[0].fileData }));
                        }
                      }}
                      maxFiles={1}
                      label="شهادة الضريبة"
                      description="ارفع شهادة ضريبة القيمة المضافة"
                    />
                    {editForm.vatCertificateDoc && <p className="text-[10px] sm:text-xs text-green-600 font-medium">✓ المستند متوفر</p>}
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs sm:text-sm font-medium">العنوان الوطني *</Label>
                    <FileUpload
                      onFilesSelected={(files) => {
                        if (files.length > 0) {
                          setEditForm(prev => ({ ...prev, nationalAddressDoc: files[0].fileData }));
                        }
                      }}
                      maxFiles={1}
                      label="العنوان الوطني"
                      description="ارفع صورة العنوان الوطني"
                    />
                    {editForm.nationalAddressDoc && <p className="text-[10px] sm:text-xs text-green-600 font-medium">✓ المستند متوفر</p>}
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs sm:text-sm font-medium">الشهادة البنكية *</Label>
                    <FileUpload
                      onFilesSelected={(files) => {
                        if (files.length > 0) {
                          setEditForm(prev => ({ ...prev, bankCertificateDoc: files[0].fileData }));
                        }
                      }}
                      maxFiles={1}
                      label="الشهادة البنكية"
                      description="ارفع صورة الشهادة البنكية"
                    />
                    {editForm.bankCertificateDoc && <p className="text-[10px] sm:text-xs text-green-600 font-medium">✓ المستند متوفر</p>}
                  </div>
                </div>

                {/* المرفقات الإضافية */}
                <div className="pt-4 border-t mt-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                    <div>
                      <Label className="text-base sm:text-lg font-semibold">مرفقات أخرى (اختياري)</Label>
                      <p className="text-xs sm:text-sm text-muted-foreground mt-1">إضافة مستندات إضافية تدعم ملف المورد</p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setEditForm(prev => ({
                        ...prev,
                        otherAttachments: [...prev.otherAttachments, { name: "", fileData: "" }]
                      }))}
                      className="self-start sm:self-center h-9"
                    >
                      <Plus className="h-4 w-4 ml-2" />
                      إضافة مرفق آخر
                    </Button>
                  </div>

                  <div className="space-y-4">
                    {editForm.otherAttachments?.map((attr, index) => (
                      <div key={index} className="grid grid-cols-1 md:grid-cols-12 gap-3 sm:gap-4 p-3 sm:p-4 border rounded-xl bg-gray-50 dark:bg-slate-900/30 items-start sm:items-center shadow-sm">
                        <div className="md:col-span-5 space-y-2">
                          <Label className="text-xs sm:text-sm font-medium">اسم المرفق</Label>
                          <Input
                            value={attr.name}
                            onChange={(e) => {
                              const newAttrs = [...editForm.otherAttachments];
                              newAttrs[index].name = e.target.value;
                              setEditForm(prev => ({ ...prev, otherAttachments: newAttrs }));
                            }}
                            placeholder="مثال: شهادة تصنيف، سيرة ذاتية..."
                            className="h-9 sm:h-10"
                          />
                        </div>
                        <div className="md:col-span-6 space-y-2">
                          <Label className="text-xs sm:text-sm font-medium">الملف</Label>
                          <FileUpload
                            onFilesSelected={(files) => {
                              if (files.length > 0) {
                                const newAttrs = [...editForm.otherAttachments];
                                newAttrs[index].fileData = files[0].fileData;
                                setEditForm(prev => ({ ...prev, otherAttachments: newAttrs }));
                              }
                            }}
                            maxFiles={1}
                            label="اختر ملفاً"
                          />
                          {attr.fileData && <p className="text-[10px] sm:text-xs text-green-600 font-medium">✓ تم رفع الملف</p>}
                        </div>
                        <div className="md:col-span-1 flex justify-end sm:justify-center">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="text-red-500 hover:text-red-700 hover:bg-red-50 h-8 w-8 sm:h-10 sm:w-10"
                            onClick={() => setEditForm(prev => ({
                              ...prev,
                              otherAttachments: prev.otherAttachments.filter((_, i) => i !== index)
                            }))}
                          >
                            <Trash2 className="h-4 w-4 sm:h-5 sm:w-5" />
                          </Button>
                        </div>
                      </div>
                    ))}
                    {(!editForm.otherAttachments || editForm.otherAttachments.length === 0) && (
                      <div className="text-center py-6 sm:py-8 border-2 border-dashed rounded-xl bg-gray-50/50 dark:bg-slate-900/10">
                        <FileText className="h-6 w-6 sm:h-8 sm:w-8 text-gray-300 mx-auto mb-2" />
                        <p className="text-xs sm:text-sm text-gray-500">لا توجد مرفقات إضافية حالياً</p>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            <DialogFooter className="flex flex-col-reverse sm:flex-row-reverse justify-center gap-4 mt-6 border-t border-border pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowEditDialog(false)}
                className="w-full sm:w-auto px-8 py-5 sm:py-6 text-sm sm:text-base rounded-xl"
              >
                إلغاء
              </Button>
              <Button
                type="submit"
                disabled={editMutation.isPending}
                className="w-full sm:w-auto px-12 py-5 sm:py-6 text-base sm:text-lg gap-2 rounded-xl shadow-lg"
              >
                {editMutation.isPending ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    جاري حفظ التعديلات...
                  </>
                ) : (
                  <>
                    <Save className="h-5 w-5" />
                    حفظ التعديلات
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
