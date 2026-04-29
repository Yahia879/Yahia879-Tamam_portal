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
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
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
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("pending");
  const [selectedSupplier, setSelectedSupplier] = useState<any>(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [showAddSupplierDialog, setShowAddSupplierDialog] = useState(false);
  const [newSupplier, setNewSupplier] = useState({
    name: "",
    contactPerson: "",
    phone: "",
    email: "",
    address: "",
    workFields: [] as string[],
  });

  // جلب الموردين
  const { data: suppliers, isLoading, refetch } = trpc.suppliers.list.useQuery({
    approvalStatus: activeTab === "all" ? undefined : activeTab as any,
    search: searchQuery || undefined,
  });

  // Mutations
  const approveMutation = trpc.suppliers.approve.useMutation({
    onSuccess: () => {
      toast.success("تم اعتماد المورد بنجاح");
      refetch();
      setShowDetailsDialog(false);
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
      setShowDetailsDialog(false);
      setRejectReason("");
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

  // فتح تفاصيل المورد
  const openSupplierDetails = (supplier: any) => {
    setSelectedSupplier(supplier);
    setShowDetailsDialog(true);
  };

  // اعتماد المورد
  const handleApprove = () => {
    if (!selectedSupplier) return;
    approveMutation.mutate({ id: selectedSupplier.id });
  };

  // رفض المورد
  const handleReject = () => {
    if (!selectedSupplier || !rejectReason.trim()) {
      toast.error("يرجى إدخال سبب الرفض");
      return;
    }
    rejectMutation.mutate({ id: selectedSupplier.id, reason: rejectReason });
  };

  // إيقاف المورد
  const handleSuspend = (supplierId: number) => {
    suspendMutation.mutate({ id: supplierId, reason: "تم الإيقاف بواسطة الإدارة" });
  };

  // إحصائيات سريعة
  const suppliersList = suppliers?.suppliers || [];
  const stats = {
    total: suppliers?.total || 0,
    pending: suppliersList.filter((s) => s.approvalStatus === "pending").length,
    approved: suppliersList.filter((s) => s.approvalStatus === "approved").length,
    rejected: suppliersList.filter((s) => s.approvalStatus === "rejected").length,
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* العنوان */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">إدارة الموردين</h1>
            <p className="text-muted-foreground">مراجعة واعتماد طلبات تسجيل الموردين</p>
          </div>
          <div className="flex gap-2">
            <PermissionGuard permission="suppliers.create">
              <Button onClick={() => setShowAddSupplierDialog(true)}>
                <Plus className="h-4 w-4 ml-2" />
                إضافة مورد
              </Button>
            </PermissionGuard>
            <Button variant="outline" onClick={() => refetch()}>
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
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList>
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
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>اسم الكيان</TableHead>
                    <TableHead>النوع</TableHead>
                    <TableHead>السجل التجاري</TableHead>
                    <TableHead>مجالات العمل</TableHead>
                    <TableHead>الحالة</TableHead>
                    <TableHead>تاريخ التسجيل</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {suppliersList.map((supplier) => {
                    const statusConfig = STATUS_CONFIG[supplier.approvalStatus as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.pending;
                    const StatusIcon = statusConfig.icon;
                    
                    return (
                      <TableRow key={supplier.id}>
                        <TableCell className="font-medium">{supplier.name}</TableCell>
                        <TableCell>
                          {supplier.entityType === "company" ? "شركة" : "مؤسسة"}
                        </TableCell>
                        <TableCell dir="ltr">{supplier.commercialRegister}</TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {(supplier.workFields as string[] || []).slice(0, 2).map((field) => (
                              <Badge key={field} variant="secondary" className="text-xs">
                                {WORK_FIELD_LABELS[field] || field}
                              </Badge>
                            ))}
                            {(supplier.workFields as string[] || []).length > 2 && (
                              <Badge variant="outline" className="text-xs">
                                +{(supplier.workFields as string[]).length - 2}
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={statusConfig.color}>
                            <StatusIcon className="h-3 w-3 ml-1" />
                            {statusConfig.label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {new Date(supplier.createdAt).toLocaleDateString("ar-SA")}
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => openSupplierDetails(supplier)}>
                                <Eye className="h-4 w-4 ml-2" />
                                عرض التفاصيل
                              </DropdownMenuItem>
                              {supplier.approvalStatus === "pending" && (
                                <>
                                  <DropdownMenuItem
                                    onClick={() => {
                                      setSelectedSupplier(supplier);
                                      handleApprove();
                                    }}
                                    className="text-green-600"
                                  >
                                    <CheckCircle2 className="h-4 w-4 ml-2" />
                                    اعتماد
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => {
                                      setSelectedSupplier(supplier);
                                      setShowRejectDialog(true);
                                    }}
                                    className="text-red-600"
                                  >
                                    <XCircle className="h-4 w-4 ml-2" />
                                    رفض
                                  </DropdownMenuItem>
                                </>
                              )}
                              {supplier.approvalStatus === "approved" && (
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

      {/* نافذة تفاصيل المورد */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>تفاصيل المورد</DialogTitle>
            <DialogDescription>
              معلومات المورد كاملة للمراجعة والاعتماد
            </DialogDescription>
          </DialogHeader>

          {selectedSupplier && (
            <div className="space-y-6">
              {/* معلومات الكيان */}
              <div className="border rounded-lg p-4">
                <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-primary" />
                  معلومات الكيان
                </h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">اسم الكيان:</span>
                    <p className="font-medium">{selectedSupplier.name}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">نوع الكيان:</span>
                    <p className="font-medium">
                      {selectedSupplier.entityType === "company" ? "شركة" : "مؤسسة"}
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">السجل التجاري:</span>
                    <p className="font-medium" dir="ltr">{selectedSupplier.commercialRegister}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">سنوات الخبرة:</span>
                    <p className="font-medium">{selectedSupplier.yearsOfExperience} سنة</p>
                  </div>
                  <div className="col-span-2">
                    <span className="text-muted-foreground">النشاط التجاري:</span>
                    <p className="font-medium">{selectedSupplier.commercialActivity}</p>
                  </div>
                  <div className="col-span-2">
                    <span className="text-muted-foreground">مجالات العمل:</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {(selectedSupplier.workFields as string[] || []).map((field: string) => (
                        <Badge key={field} variant="secondary">
                          {WORK_FIELD_LABELS[field] || field}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* معلومات التواصل */}
              <div className="border rounded-lg p-4">
                <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                  <Phone className="h-5 w-5 text-primary" />
                  معلومات التواصل
                </h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="col-span-2">
                    <span className="text-muted-foreground">العنوان:</span>
                    <p className="font-medium">{selectedSupplier.address}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">المدينة:</span>
                    <p className="font-medium">{selectedSupplier.city || "-"}</p>
                  </div>
                  {selectedSupplier.googleMapsUrl && (
                    <div>
                      <span className="text-muted-foreground">الموقع:</span>
                      <a
                        href={selectedSupplier.googleMapsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-primary hover:underline"
                      >
                        <MapPin className="h-4 w-4" />
                        عرض على الخريطة
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  )}
                  <div>
                    <span className="text-muted-foreground">البريد الإلكتروني:</span>
                    <p className="font-medium flex items-center gap-1" dir="ltr">
                      <Mail className="h-4 w-4" />
                      {selectedSupplier.email}
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">رقم التواصل:</span>
                    <p className="font-medium" dir="ltr">{selectedSupplier.phone}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">مسؤول التواصل:</span>
                    <p className="font-medium">{selectedSupplier.contactPerson}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">الوظيفة:</span>
                    <p className="font-medium">{selectedSupplier.contactPersonTitle}</p>
                  </div>
                </div>
              </div>

              {/* معلومات البنك */}
              <div className="border rounded-lg p-4">
                <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                  <CreditCard className="h-5 w-5 text-primary" />
                  معلومات الحساب البنكي
                </h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">اسم الحساب:</span>
                    <p className="font-medium">{selectedSupplier.bankAccountName}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">البنك:</span>
                    <p className="font-medium">{selectedSupplier.bankName}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">الآيبان:</span>
                    <p className="font-medium" dir="ltr">{selectedSupplier.iban}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">الرقم الضريبي:</span>
                    <p className="font-medium" dir="ltr">{selectedSupplier.taxNumber}</p>
                  </div>
                </div>
              </div>

              {/* المرفقات */}
              <div className="border rounded-lg p-4">
                <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" />
                  المرفقات
                </h3>
                <div className="grid grid-cols-3 gap-4">
                  {selectedSupplier.commercialRegisterDoc && (
                    <a
                      href={selectedSupplier.commercialRegisterDoc}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 p-3 border rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <FileText className="h-5 w-5 text-primary" />
                      <span className="text-sm">السجل التجاري</span>
                      <ExternalLink className="h-3 w-3 mr-auto" />
                    </a>
                  )}
                  {selectedSupplier.vatCertificateDoc && (
                    <a
                      href={selectedSupplier.vatCertificateDoc}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 p-3 border rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <FileText className="h-5 w-5 text-primary" />
                      <span className="text-sm">شهادة الضريبة</span>
                      <ExternalLink className="h-3 w-3 mr-auto" />
                    </a>
                  )}
                  {selectedSupplier.nationalAddressDoc && (
                    <a
                      href={selectedSupplier.nationalAddressDoc}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 p-3 border rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <FileText className="h-5 w-5 text-primary" />
                      <span className="text-sm">العنوان الوطني</span>
                      <ExternalLink className="h-3 w-3 mr-auto" />
                    </a>
                  )}
                </div>
              </div>

              {/* سبب الرفض (إذا كان مرفوضاً) */}
              {selectedSupplier.approvalStatus === "rejected" && selectedSupplier.rejectionReason && (
                <div className="border border-red-200 bg-red-50 rounded-lg p-4">
                  <h3 className="font-semibold text-red-800 mb-2">سبب الرفض</h3>
                  <p className="text-red-700">{selectedSupplier.rejectionReason}</p>
                </div>
              )}
            </div>
          )}

          <DialogFooter className="gap-2">
            {selectedSupplier?.approvalStatus === "pending" && (
              <>
                <PermissionGuard permission="suppliers.reject">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowRejectDialog(true);
                    }}
                    className="text-red-600 border-red-200 hover:bg-red-50"
                  >
                    <XCircle className="h-4 w-4 ml-2" />
                    رفض
                  </Button>
                </PermissionGuard>
                <PermissionGuard permission="suppliers.approve">
                  <Button
                    onClick={handleApprove}
                    disabled={approveMutation.isPending}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    {approveMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin ml-2" />
                    ) : (
                      <CheckCircle2 className="h-4 w-4 ml-2" />
                    )}
                    اعتماد المورد
                  </Button>
                </PermissionGuard>
              </>
            )}
            <Button variant="outline" onClick={() => setShowDetailsDialog(false)}>
              إغلاق
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* نافذة الرفض */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>رفض المورد</DialogTitle>
            <DialogDescription>
              يرجى إدخال سبب رفض طلب تسجيل المورد
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>سبب الرفض *</Label>
              <Textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="أدخل سبب رفض طلب التسجيل..."
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRejectDialog(false)}>
              إلغاء
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={rejectMutation.isPending || !rejectReason.trim()}
            >
              {rejectMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin ml-2" />
              ) : (
                <XCircle className="h-4 w-4 ml-2" />
              )}
              تأكيد الرفض
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog إضافة مورد - يفتح صفحة التسجيل الكاملة */}
      <Dialog open={showAddSupplierDialog} onOpenChange={setShowAddSupplierDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>إضافة مورد جديد</DialogTitle>
            <DialogDescription>
              لإضافة مورد جديد، يجب تعبئة نموذج التسجيل الكامل الذي يتضمن:
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-4">
            <div className="flex items-center gap-3 p-3 bg-teal-50 rounded-lg">
              <Building2 className="h-5 w-5 text-teal-600" />
              <div>
                <p className="font-medium text-teal-800">معلومات الكيان</p>
                <p className="text-xs text-teal-600">اسم، نوع، سجل تجاري، نشاط، خبرة، مجالات عمل</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
              <Phone className="h-5 w-5 text-blue-600" />
              <div>
                <p className="font-medium text-blue-800">معلومات التواصل</p>
                <p className="text-xs text-blue-600">عنوان، خريطة، بريد، هاتف، مسؤول التواصل</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-purple-50 rounded-lg">
              <CreditCard className="h-5 w-5 text-purple-600" />
              <div>
                <p className="font-medium text-purple-800">معلومات الحساب البنكي</p>
                <p className="text-xs text-purple-600">حساب، بنك، IBAN، رقم ضريبي</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-orange-50 rounded-lg">
              <FileText className="h-5 w-5 text-orange-600" />
              <div>
                <p className="font-medium text-orange-800">المرفقات</p>
                <p className="text-xs text-orange-600">سجل تجاري، شهادة ضريبية، عنوان وطني</p>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddSupplierDialog(false)}>إلغاء</Button>
            <Button onClick={() => {
              setShowAddSupplierDialog(false);
              navigate("/supplier/register");
            }}>
              <Plus className="h-4 w-4 ml-2" />
              الانتقال لنموذج التسجيل
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
