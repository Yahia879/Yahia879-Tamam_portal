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
  Play,
  Globe,
  UserPlus,
  AlertCircle,
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
  const hasSuspendPermission = usePermission("suppliers.suspend");
  const hasViewDetailsPermission = usePermission("suppliers.view_details");
  const hasViewPermission = usePermission("suppliers.view") || usePermission("suppliers");
  const canSuspend = hasSuspendPermission;
  const canViewDetails = hasViewDetailsPermission;
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("all");
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



  // تم نقل تعديل المورد إلى صفحة منفصلة لتعديل كافة الحقول والبيانات والمرفقات

  // إحصائيات سريعة
  const suppliersList = suppliers?.suppliers || [];
  const stats = suppliers?.stats || {
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
  };

  if (!hasViewPermission) {
    return (
      <DashboardLayout tabletNavigation>
        <div className="flex flex-col items-center justify-center min-h-[50vh] text-center p-4 sm:p-6 space-y-4 font-sans" dir="rtl">
          <div className="p-4 rounded-full bg-rose-50 text-rose-600 border border-rose-100 dark:bg-rose-950/30 dark:border-rose-900">
            <AlertCircle className="h-10 w-10 text-rose-600" />
          </div>
          <h2 className="text-lg sm:text-xl font-bold text-slate-800 dark:text-slate-200">عذراً، ليس لديك صلاحية لعرض صفحة الموردين</h2>
          <p className="text-xs sm:text-sm text-muted-foreground max-w-md">يرجى التواصل مع مسؤول النظام لمنحك صلاحية "عرض الموردين".</p>
          <Button onClick={() => navigate("/dashboard")} className="mt-2 min-h-10 max-lg:min-h-11 bg-[#1a5f4a] hover:bg-[#154d3c] text-white font-bold text-xs sm:text-sm">
            العودة للوحة التحكم
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout tabletNavigation>
      <div className="w-full min-w-0 max-w-full overflow-x-hidden space-y-4 sm:space-y-6" dir="rtl">
        {/* العنوان */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
          <div className="min-w-0">
            <h1 className="text-lg sm:text-2xl font-bold">إدارة الموردين</h1>
            <p className="text-xs sm:text-sm md:text-base text-muted-foreground">مراجعة واعتماد طلبات تسجيل الموردين</p>
          </div>
          <div className="grid grid-cols-2 sm:flex gap-2 w-full sm:w-auto shrink-0">
            <PermissionGuard permission="suppliers.add">
              <Button onClick={() => navigate("/supplier/register")} className="w-full sm:w-auto min-h-10 max-lg:min-h-11">
                <Plus className="h-4 w-4 ml-2 shrink-0" />
                إضافة مورد
              </Button>
            </PermissionGuard>
            <Button variant="outline" onClick={() => refetch()} className="w-full sm:w-auto min-h-10 max-lg:min-h-11">
              <RefreshCw className="h-4 w-4 ml-2 shrink-0" />
              تحديث
            </Button>
          </div>
        </div>

        {/* الإحصائيات */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
          <Card className="py-0 gap-0">
            <CardContent className="p-3.5 sm:p-5">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm text-muted-foreground truncate">إجمالي الموردين</p>
                  <p className="text-xl sm:text-2xl font-bold mt-0.5">{stats.total}</p>
                </div>
                <Building2 className="h-7 w-7 sm:h-8 sm:w-8 text-primary/25 shrink-0" />
              </div>
            </CardContent>
          </Card>
          <Card className="border-yellow-200 bg-yellow-50/50 py-0 gap-0">
            <CardContent className="p-3.5 sm:p-5">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm text-yellow-700 truncate">قيد المراجعة</p>
                  <p className="text-xl sm:text-2xl font-bold text-yellow-700 mt-0.5">{stats.pending}</p>
                </div>
                <Clock className="h-7 w-7 sm:h-8 sm:w-8 text-yellow-400 shrink-0" />
              </div>
            </CardContent>
          </Card>
          <Card className="border-green-200 bg-green-50/50 py-0 gap-0">
            <CardContent className="p-3.5 sm:p-5">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm text-green-700 truncate">معتمدين</p>
                  <p className="text-xl sm:text-2xl font-bold text-green-700 mt-0.5">{stats.approved}</p>
                </div>
                <CheckCircle2 className="h-7 w-7 sm:h-8 sm:w-8 text-green-400 shrink-0" />
              </div>
            </CardContent>
          </Card>
          <Card className="border-red-200 bg-red-50/50 py-0 gap-0">
            <CardContent className="p-3.5 sm:p-5">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm text-red-700 truncate">مرفوضين</p>
                  <p className="text-xl sm:text-2xl font-bold text-red-700 mt-0.5">{stats.rejected}</p>
                </div>
                <XCircle className="h-7 w-7 sm:h-8 sm:w-8 text-red-400 shrink-0" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* البحث والتصفية */}
        <Card className="py-0 gap-0 overflow-hidden">
          <CardHeader className="p-3.5 sm:p-5 border-b border-border/60">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
              <div className="relative flex-1 lg:max-w-md w-full">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <Input
                  placeholder="بحث باسم المورد أو السجل التجاري..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pr-10 h-10 max-lg:min-h-11 max-md:text-base"
                />
              </div>
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full lg:w-auto">
                <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 lg:inline-flex h-auto p-1 gap-1">
                  <TabsTrigger value="all" className="min-h-9 max-lg:min-h-10 text-xs sm:text-sm">الكل</TabsTrigger>
                  <TabsTrigger value="pending" className="min-h-9 max-lg:min-h-10 text-xs sm:text-sm">قيد المراجعة</TabsTrigger>
                  <TabsTrigger value="approved" className="min-h-9 max-lg:min-h-10 text-xs sm:text-sm">معتمدين</TabsTrigger>
                  <TabsTrigger value="rejected" className="min-h-9 max-lg:min-h-10 text-xs sm:text-sm">مرفوضين</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : suppliersList.length === 0 ? (
              <div className="text-center py-12 px-4">
                <Building2 className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                <p className="text-muted-foreground">لا يوجد موردين</p>
              </div>
            ) : (
              <>
                {/* عرض البطاقات للموبايل والآيباد */}
                <div className="xl:hidden p-3 sm:p-4 bg-muted/15 grid grid-cols-1 md:grid-cols-2 gap-3">
                  {suppliersList.map((supplier) => {
                    const statusConfig = STATUS_CONFIG[supplier.approvalStatus as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.pending;
                    const StatusIcon = statusConfig.icon;
                    const fieldsArr = getWorkFieldsArray(supplier.workFields);
                    const canApproveReject = supplier.approvalStatus === "pending" && hasApprovePermission;
                    const canSuspendSupplier = supplier.approvalStatus === "approved" && canSuspend;
                    const canReactivateSupplier = supplier.approvalStatus === "suspended" && canSuspend;

                    return (
                      <div
                        key={supplier.id}
                        className="rounded-xl border border-border/80 bg-card p-3.5 sm:p-4 shadow-2xs flex flex-col justify-between gap-3"
                      >
                        <div className="space-y-2.5">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              {canViewDetails ? (
                                <button
                                  type="button"
                                  onClick={() => openSupplierDetails(supplier)}
                                  className="font-bold text-sm sm:text-base text-slate-800 dark:text-slate-100 hover:text-teal-600 hover:underline text-right transition-colors break-words"
                                >
                                  {supplier.name}
                                </button>
                              ) : (
                                <p className="font-bold text-sm sm:text-base text-slate-800 dark:text-slate-100 break-words">
                                  {supplier.name}
                                </p>
                              )}
                              <p className="text-xs text-muted-foreground mt-0.5">
                                {supplier.entityType === "company" ? "شركة" : "مؤسسة"}
                              </p>
                            </div>
                            <Badge className={`${statusConfig.color} shrink-0 text-[11px]`}>
                              <StatusIcon className="h-3 w-3 ml-1" />
                              {statusConfig.label}
                            </Badge>
                          </div>

                          <div className="grid grid-cols-2 gap-2 text-xs bg-muted/30 rounded-lg p-2.5 border border-border/50">
                            <div className="min-w-0">
                              <span className="text-[11px] text-muted-foreground block">السجل التجاري</span>
                              <span className="font-mono font-semibold text-foreground block truncate" dir="ltr">
                                {supplier.commercialRegister || "—"}
                              </span>
                            </div>
                            <div className="min-w-0">
                              <span className="text-[11px] text-muted-foreground block">تاريخ التسجيل</span>
                              <span className="font-medium text-foreground block">
                                {new Date(supplier.createdAt).toLocaleDateString("ar-SA")}
                              </span>
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center gap-1.5">
                            {supplier.registrationSource === "portal" ? (
                              <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800 gap-1 inline-flex items-center text-[11px] font-medium px-2 py-0.5">
                                <Globe className="h-3 w-3 text-emerald-600 dark:text-emerald-400 shrink-0" />
                                سجل بالمنصة
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700 gap-1 inline-flex items-center text-[11px] font-medium px-2 py-0.5">
                                <UserPlus className="h-3 w-3 text-slate-500 shrink-0" />
                                إدخال يدوي
                              </Badge>
                            )}
                            {fieldsArr.slice(0, 3).map((field) => (
                              <Badge key={field} variant="secondary" className="text-[11px]">
                                {WORK_FIELD_LABELS[field] || field}
                              </Badge>
                            ))}
                            {fieldsArr.length > 3 && (
                              <Badge variant="outline" className="text-[11px]">
                                +{fieldsArr.length - 3}
                              </Badge>
                            )}
                          </div>
                        </div>

                        {(canViewDetails || hasEditPermission || canApproveReject || canSuspendSupplier || canReactivateSupplier) && (
                          <div className="pt-2.5 border-t border-border/60 flex flex-wrap gap-2">
                            {canViewDetails && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => openSupplierDetails(supplier)}
                                className="flex-1 min-h-10 text-xs font-semibold"
                              >
                                <Eye className="h-3.5 w-3.5 ml-1.5 shrink-0" />
                                التفاصيل
                              </Button>
                            )}
                            {hasEditPermission && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => navigate(`/suppliers/${supplier.id}/edit`)}
                                className="flex-1 min-h-10 text-xs font-semibold"
                              >
                                <Pencil className="h-3.5 w-3.5 ml-1.5 shrink-0" />
                                تعديل
                              </Button>
                            )}
                            {canApproveReject && (
                              <>
                                <Button
                                  size="sm"
                                  onClick={() => handleApprove(supplier.id)}
                                  className="flex-1 min-h-10 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white"
                                >
                                  <CheckCircle2 className="h-3.5 w-3.5 ml-1.5 shrink-0" />
                                  اعتماد
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setSelectedSupplier(supplier);
                                    setShowRejectDialog(true);
                                  }}
                                  className="flex-1 min-h-10 text-xs font-bold text-red-600 border-red-200 hover:bg-red-50"
                                >
                                  <XCircle className="h-3.5 w-3.5 ml-1.5 shrink-0" />
                                  رفض
                                </Button>
                              </>
                            )}
                            {canSuspendSupplier && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleSuspend(supplier.id)}
                                className="flex-1 min-h-10 text-xs font-semibold text-orange-600 border-orange-200 hover:bg-orange-50"
                              >
                                <Ban className="h-3.5 w-3.5 ml-1.5 shrink-0" />
                                إيقاف
                              </Button>
                            )}
                            {canReactivateSupplier && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleApprove(supplier.id)}
                                className="flex-1 min-h-10 text-xs font-bold text-green-600 border-green-200 hover:bg-green-50"
                              >
                                <Play className="h-3.5 w-3.5 ml-1.5 shrink-0" />
                                إعادة تنشيط
                              </Button>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* عرض الجدول لسطح المكتب */}
                <div className="hidden xl:block overflow-x-auto p-4 pt-2">
                  <Table className="not-italic">
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-right">اسم الكيان</TableHead>
                        <TableHead className="text-right">النوع</TableHead>
                        <TableHead className="text-right">السجل التجاري</TableHead>
                        <TableHead className="text-right">مجالات العمل</TableHead>
                        <TableHead className="text-right">الحالة</TableHead>
                        <TableHead className="text-right">طريقة التسجيل</TableHead>
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
                              {supplier.registrationSource === "portal" ? (
                                <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800 gap-1.5 inline-flex items-center text-xs font-medium px-2 py-0.5">
                                  <Globe className="h-3 w-3 text-emerald-600 dark:text-emerald-400 shrink-0" />
                                  سجل بالمنصة
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700 gap-1.5 inline-flex items-center text-xs font-medium px-2 py-0.5">
                                  <UserPlus className="h-3 w-3 text-slate-500 shrink-0" />
                                  إدخال يدوي
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              {new Date(supplier.createdAt).toLocaleDateString("ar-SA")}
                            </TableCell>
                            <TableCell className="text-left">
                              {(() => {
                                const canApproveReject = supplier.approvalStatus === "pending" && hasApprovePermission;
                                const canSuspendSupplier = supplier.approvalStatus === "approved" && canSuspend;
                                const canReactivateSupplier = supplier.approvalStatus === "suspended" && canSuspend;
                                const hasAnyMenuAction = canViewDetails || hasEditPermission || canApproveReject || canSuspendSupplier || canReactivateSupplier;

                                if (!hasAnyMenuAction) {
                                  return <span className="text-muted-foreground text-xs">—</span>;
                                }

                                return (
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button variant="ghost" size="icon" className="pointer-coarse:min-h-10 pointer-coarse:min-w-10">
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
                                        <DropdownMenuItem onClick={() => navigate(`/suppliers/${supplier.id}/edit`)}>
                                          <Pencil className="h-4 w-4 ml-2" />
                                          تعديل البيانات
                                        </DropdownMenuItem>
                                      )}
                                      {canApproveReject && (
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
                                      {canSuspendSupplier && (
                                        <DropdownMenuItem
                                          onClick={() => handleSuspend(supplier.id)}
                                          className="text-orange-600"
                                        >
                                          <Ban className="h-4 w-4 ml-2" />
                                          إيقاف
                                        </DropdownMenuItem>
                                      )}
                                      {canReactivateSupplier && (
                                        <DropdownMenuItem
                                          onClick={() => handleApprove(supplier.id)}
                                          className="text-green-600 font-bold"
                                        >
                                          <Play className="h-4.5 w-4.5 ml-2 text-green-600" />
                                          إعادة تنشيط
                                        </DropdownMenuItem>
                                      )}
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                );
                              })()}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* نافذة رفض المورد */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent className="w-[calc(100vw-1rem)] sm:w-[90vw] max-w-md max-h-[calc(100dvh-2rem)] overflow-y-auto rounded-2xl p-4 sm:p-6" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-right text-base sm:text-lg font-bold">تأكيد رفض المورد</DialogTitle>
            <DialogDescription className="text-right text-xs sm:text-sm mt-2">
              يرجى إدخال سبب رفض طلب تسجيل المورد "{selectedSupplier?.name}":
            </DialogDescription>
          </DialogHeader>
          <div className="my-3 sm:my-4">
            <Textarea
              placeholder="اكتب سبب الرفض هنا..."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              className="w-full text-right max-md:text-base"
              rows={3}
            />
          </div>
          <DialogFooter className="flex flex-col-reverse sm:flex-row-reverse gap-2 mt-4 sm:mt-6">
            <Button
              onClick={handleReject}
              disabled={rejectMutation.isPending || !rejectReason.trim()}
              className="w-full sm:w-auto min-h-10 max-lg:min-h-11 bg-red-600 hover:bg-red-700 text-white font-bold"
            >
              {rejectMutation.isPending ? "جاري الرفض..." : "تأكيد الرفض"}
            </Button>
            <Button variant="outline" onClick={() => setShowRejectDialog(false)} className="w-full sm:w-auto min-h-10 max-lg:min-h-11">
              إلغاء
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* تم نقل تعديل المورد إلى صفحة تعديل منفصلة */}
    </DashboardLayout>
  );
}
