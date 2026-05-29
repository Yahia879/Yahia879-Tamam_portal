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
  Download,
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

  const suspendMutation = trpc.suppliers.suspend.useMutation({
    onSuccess: () => {
      toast.success("تم إيقاف المورد");
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || "حدث خطأ أثناء إيقاف المورد");
    },
  });

  // فتح تفاصيل المورد بالانتقال لصفحة التفاصيل المنفصلة
  const openSupplierDetails = (supplier: any) => {
    navigate(`/suppliers/${supplier.id}`);
  };

  // إيقاف المورد
  const handleSuspend = (supplierId: number) => {
    suspendMutation.mutate({ id: supplierId, reason: "تم الإيقاف بواسطة الإدارة" });
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
            <Button onClick={() => navigate("/supplier/register")} className="w-full sm:w-auto">
              <Plus className="h-4 w-4 ml-2" />
              إضافة مورد
            </Button>
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
                        <TableCell className="font-bold text-slate-800 dark:text-slate-200">
                          <button
                            onClick={() => openSupplierDetails(supplier)}
                            className="hover:text-teal-600 hover:underline text-right transition-colors"
                          >
                            {supplier.name}
                          </button>
                        </TableCell>
                        <TableCell>
                          {supplier.entityType === "company" ? "شركة" : "مؤسسة"}
                        </TableCell>
                        <TableCell dir="ltr">{supplier.commercialRegister}</TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
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
    </DashboardLayout>
  );
}
