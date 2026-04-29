import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { 
  Building2, 
  Plus, 
  Search, 
  MapPin,
  Filter,
  MoreVertical,
  Eye,
  Edit,
  Trash2,
  Users,
  CheckCircle,
  XCircle,
  Clock,
} from "lucide-react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { PermissionGuard } from "@/components/PermissionGuard";

// حالات الاعتماد
const APPROVAL_STATUS = {
  pending: { label: "قيد المراجعة", color: "bg-yellow-100 text-yellow-800", icon: Clock },
  approved: { label: "معتمد", color: "bg-green-100 text-green-800", icon: CheckCircle },
  rejected: { label: "مرفوض", color: "bg-red-100 text-red-800", icon: XCircle },
};

export default function Mosques() {
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [cityFilter, setCityFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [selectedMosqueId, setSelectedMosqueId] = useState<number | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const utils = trpc.useUtils();

  const { data: mosquesData, isLoading } = trpc.mosques.search.useQuery({
    search: search || undefined,
    city: cityFilter !== "all" ? cityFilter : undefined,
    approvalStatus: statusFilter !== "all" ? statusFilter as "pending" | "approved" | "rejected" : undefined,
  });
  const mosques = mosquesData?.mosques || [];

  const { data: stats } = trpc.mosques.getStats.useQuery();

  // mutations للاعتماد والرفض
  const approveMutation = trpc.mosques.approve.useMutation({
    onSuccess: () => {
      toast.success("تم اعتماد المسجد بنجاح");
      utils.mosques.search.invalidate();
      utils.mosques.getStats.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || "حدث خطأ أثناء اعتماد المسجد");
    },
  });

  const rejectMutation = trpc.mosques.reject.useMutation({
    onSuccess: () => {
      toast.success("تم رفض المسجد");
      setRejectDialogOpen(false);
      setRejectReason("");
      setSelectedMosqueId(null);
      utils.mosques.search.invalidate();
      utils.mosques.getStats.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || "حدث خطأ أثناء رفض المسجد");
    },
  });

  // التحقق من صلاحيات الاعتماد - استبدل بـ PermissionGuard

  // استخراج المدن الفريدة
  const cities = Array.from(new Set(mosques.map((m: { city: string }) => m.city).filter(Boolean))) as string[];

  // عدد المساجد قيد المراجعة
  const pendingCount = stats?.byApprovalStatus?.pending || 0;

  const handleApprove = (mosqueId: number) => {
    approveMutation.mutate({ id: mosqueId });
  };

  const handleReject = () => {
    if (selectedMosqueId) {
      rejectMutation.mutate({ id: selectedMosqueId, reason: rejectReason });
    }
  };

  const openRejectDialog = (mosqueId: number) => {
    setSelectedMosqueId(mosqueId);
    setRejectDialogOpen(true);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* العنوان والإجراءات */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">المساجد</h1>
            <p className="text-muted-foreground">إدارة المساجد المسجلة في النظام</p>
          </div>
          <PermissionGuard permission="mosques.create">
            <Link href="/mosques/new">
              <Button className="gradient-primary text-white">
                <Plus className="w-4 h-4 ml-2" />
                إضافة مسجد
              </Button>
            </Link>
          </PermissionGuard>
        </div>

        {/* بطاقات الإحصائيات */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-0 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">إجمالي المساجد</p>
                  <p className="text-2xl font-bold text-foreground mt-1">{stats?.total || 0}</p>
                </div>
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Building2 className="w-6 h-6 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* بطاقة المساجد قيد المراجعة */}
          <PermissionGuard permission="mosques.approve">
            <Card className={`border-0 shadow-sm ${pendingCount > 0 ? 'ring-2 ring-yellow-400' : ''}`}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">قيد المراجعة</p>
                    <p className="text-2xl font-bold text-yellow-600 mt-1">{pendingCount}</p>
                  </div>
                  <div className="w-12 h-12 rounded-lg bg-yellow-100 flex items-center justify-center">
                    <Clock className="w-6 h-6 text-yellow-600" />
                  </div>
                </div>
                {pendingCount > 0 && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="mt-3 w-full text-yellow-600 border-yellow-300 hover:bg-yellow-50"
                    onClick={() => setStatusFilter("pending")}
                  >
                    عرض المساجد المعلقة
                  </Button>
                )}
              </CardContent>
            </Card>
          </PermissionGuard>

          <Card className="border-0 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">المدن</p>
                  <p className="text-2xl font-bold text-foreground mt-1">{Object.keys(stats?.byCity || {}).length}</p>
                </div>
                <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center">
                  <MapPin className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">المعتمدة</p>
                  <p className="text-2xl font-bold text-green-600 mt-1">{stats?.byApprovalStatus?.approved || 0}</p>
                </div>
                <div className="w-12 h-12 rounded-lg bg-green-100 flex items-center justify-center">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* فلاتر البحث */}
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="البحث عن مسجد..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pr-10"
                />
              </div>
              <Select value={cityFilter} onValueChange={setCityFilter}>
                <SelectTrigger className="w-full sm:w-48">
                  <SelectValue placeholder="المدينة" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">جميع المدن</SelectItem>
                  {cities.map((city) => (
                    <SelectItem key={city} value={city}>{city}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <PermissionGuard permission="mosques.approve">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full sm:w-48">
                    <SelectValue placeholder="حالة الاعتماد" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">جميع الحالات</SelectItem>
                    <SelectItem value="pending">قيد المراجعة</SelectItem>
                    <SelectItem value="approved">معتمد</SelectItem>
                    <SelectItem value="rejected">مرفوض</SelectItem>
                  </SelectContent>
                </Select>
              </PermissionGuard>
            </div>
          </CardContent>
        </Card>

        {/* جدول المساجد */}
        <Card className="border-0 shadow-sm">
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-8 text-center">
                <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="text-muted-foreground mt-4">جاري التحميل...</p>
              </div>
            ) : mosques.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-right">اسم المسجد</TableHead>
                      <TableHead className="text-right">المدينة</TableHead>
                      <TableHead className="text-right">المحافظة</TableHead>
                      <TableHead className="text-right">عدد المصلين</TableHead>
                      <PermissionGuard permission="mosques.approve">
                        <TableHead className="text-right">الحالة</TableHead>
                      </PermissionGuard>
                      <TableHead className="text-right">الإجراءات</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {mosques.map((mosque: any) => {
                      const status = APPROVAL_STATUS[mosque.approvalStatus as keyof typeof APPROVAL_STATUS] || APPROVAL_STATUS.pending;
                      const StatusIcon = status.icon;
                      
                      return (
                        <TableRow key={mosque.id} className={mosque.approvalStatus === "pending" ? "bg-yellow-50/50" : ""}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                                <Building2 className="w-5 h-5 text-primary" />
                              </div>
                              <div>
                                <p className="font-medium text-foreground">{mosque.name}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>{mosque.city}</TableCell>
                          <TableCell>{mosque.governorate || "-"}</TableCell>
                          <TableCell>
                            {mosque.capacity ? (
                              <div className="flex items-center gap-1">
                                <Users className="w-4 h-4 text-muted-foreground" />
                                <span>{mosque.capacity}</span>
                              </div>
                            ) : "-"}
                          </TableCell>
                          <PermissionGuard permission="mosques.approve">
                            <TableCell>
                              <Badge className={`${status.color} flex items-center gap-1 w-fit`}>
                                <StatusIcon className="w-3 h-3" />
                                {status.label}
                              </Badge>
                            </TableCell>
                          </PermissionGuard>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {/* أزرار الاعتماد والرفض للمساجد قيد المراجعة */}
                              {mosque.approvalStatus === "pending" && (
                                <>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="text-green-600 border-green-300 hover:bg-green-50"
                                    onClick={() => handleApprove(mosque.id)}
                                    disabled={approveMutation.isPending}
                                  >
                                    <CheckCircle className="w-4 h-4 ml-1" />
                                    اعتماد
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="text-red-600 border-red-300 hover:bg-red-50"
                                    onClick={() => openRejectDialog(mosque.id)}
                                    disabled={rejectMutation.isPending}
                                  >
                                    <XCircle className="w-4 h-4 ml-1" />
                                    رفض
                                  </Button>
                                </>
                              )}
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon">
                                    <MoreVertical className="w-4 h-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <Link href={`/mosques/${mosque.id}`}>
                                    <DropdownMenuItem className="cursor-pointer">
                                      <Eye className="w-4 h-4 ml-2" />
                                      عرض التفاصيل
                                    </DropdownMenuItem>
                                  </Link>
                                  <Link href={`/mosques/${mosque.id}/edit`}>
                                    <DropdownMenuItem className="cursor-pointer">
                                      <Edit className="w-4 h-4 ml-2" />
                                      تعديل
                                    </DropdownMenuItem>
                                  </Link>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem className="cursor-pointer text-destructive">
                                    <Trash2 className="w-4 h-4 ml-2" />
                                    حذف
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="p-8 text-center">
                <Building2 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">لا توجد مساجد مسجلة</p>
                <Link href="/mosques/new">
                  <Button className="mt-4 gradient-primary text-white">
                    إضافة مسجد جديد
                  </Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* نافذة سبب الرفض */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>رفض المسجد</DialogTitle>
            <DialogDescription>
              يرجى إدخال سبب رفض طلب تسجيل المسجد
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Textarea
              placeholder="سبب الرفض (اختياري)..."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={4}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>
              إلغاء
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleReject}
              disabled={rejectMutation.isPending}
            >
              {rejectMutation.isPending ? "جاري الرفض..." : "تأكيد الرفض"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
