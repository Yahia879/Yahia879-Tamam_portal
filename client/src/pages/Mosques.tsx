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
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
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

  const deleteMutation = trpc.mosques.delete.useMutation({
    onSuccess: () => {
      toast.success("تم حذف المسجد بنجاح");
      setDeleteDialogOpen(false);
      setSelectedMosqueId(null);
      utils.mosques.search.invalidate();
      utils.mosques.getStats.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || "حدث خطأ أثناء حذف المسجد");
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

  const openDeleteDialog = (mosqueId: number) => {
    setSelectedMosqueId(mosqueId);
    setDeleteDialogOpen(true);
  };

  const handleDelete = () => {
    if (selectedMosqueId) {
      deleteMutation.mutate({ id: selectedMosqueId });
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* العنوان والإجراءات */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-foreground">المساجد</h1>
            <p className="text-sm md:text-base text-muted-foreground">إدارة المساجد المسجلة في النظام</p>
          </div>
          <PermissionGuard permission="mosques.create">
            <Link href="/mosques/new">
              <Button className="gradient-primary text-white w-full sm:w-auto">
                <Plus className="w-4 h-4 ml-2" />
                إضافة مسجد
              </Button>
            </Link>
          </PermissionGuard>
        </div>

        {/* بطاقات الإحصائيات */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4 md:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs md:text-sm text-muted-foreground">إجمالي المساجد</p>
                  <p className="text-xl md:text-2xl font-bold text-foreground mt-1">{stats?.total || 0}</p>
                </div>
                <div className="w-10 h-10 md:w-12 md:h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Building2 className="w-5 h-5 md:w-6 md:h-6 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* بطاقة المساجد قيد المراجعة */}
          <PermissionGuard permission="mosques.approve">
            <Card className={`border-0 shadow-sm ${pendingCount > 0 ? 'ring-2 ring-yellow-400' : ''}`}>
              <CardContent className="p-4 md:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs md:text-sm text-muted-foreground">قيد المراجعة</p>
                    <p className="text-xl md:text-2xl font-bold text-yellow-600 mt-1">{pendingCount}</p>
                  </div>
                  <div className="w-10 h-10 md:w-12 md:h-12 rounded-lg bg-yellow-100 flex items-center justify-center">
                    <Clock className="w-5 h-5 md:w-6 md:h-6 text-yellow-600" />
                  </div>
                </div>
                {pendingCount > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-3 w-full text-xs md:text-sm text-yellow-600 border-yellow-300 hover:bg-yellow-50"
                    onClick={() => setStatusFilter("pending")}
                  >
                    عرض المساجد المعلقة
                  </Button>
                )}
              </CardContent>
            </Card>
          </PermissionGuard>

          <Card className="border-0 shadow-sm">
            <CardContent className="p-4 md:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs md:text-sm text-muted-foreground">المدن</p>
                  <p className="text-xl md:text-2xl font-bold text-foreground mt-1">{Object.keys(stats?.byCity || {}).length}</p>
                </div>
                <div className="w-10 h-10 md:w-12 md:h-12 rounded-lg bg-blue-100 flex items-center justify-center">
                  <MapPin className="w-5 h-5 md:w-6 md:h-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardContent className="p-4 md:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs md:text-sm text-muted-foreground">المعتمدة</p>
                  <p className="text-xl md:text-2xl font-bold text-green-600 mt-1">{stats?.byApprovalStatus?.approved || 0}</p>
                </div>
                <div className="w-10 h-10 md:w-12 md:h-12 rounded-lg bg-green-100 flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 md:w-6 md:h-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* فلاتر البحث */}
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="md:col-span-2 relative">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="البحث عن مسجد..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pr-10 h-10"
                />
              </div>
              <Select value={cityFilter} onValueChange={setCityFilter}>
                <SelectTrigger className="w-full h-10">
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
                  <SelectTrigger className="w-full h-10">
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

        {/* جدول المساجد / عرض الكروت للموبايل */}
        <Card className="border-0 shadow-sm overflow-hidden">
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-8 text-center">
                <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="text-muted-foreground mt-4">جاري التحميل...</p>
              </div>
            ) : mosques.length > 0 ? (
              <>
                {/* عرض الجدول للشاشات الكبيرة */}
                <div className="hidden md:block overflow-x-auto">
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
                                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                                  <Building2 className="w-5 h-5 text-primary" />
                                </div>
                                <div className="min-w-0">
                                  <p className="font-medium text-foreground truncate">{mosque.name}</p>
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
                                <Badge className={`${status.color} flex items-center gap-1 w-fit whitespace-nowrap`}>
                                  <StatusIcon className="w-3 h-3" />
                                  {status.label}
                                </Badge>
                              </TableCell>
                            </PermissionGuard>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <PermissionGuard permission="mosques.approve">
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
                                </PermissionGuard>
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
                                    <PermissionGuard permission="mosques.edit">
                                      <Link href={`/mosques/${mosque.id}/edit`}>
                                        <DropdownMenuItem className="cursor-pointer">
                                          <Edit className="w-4 h-4 ml-2" />
                                          تعديل
                                        </DropdownMenuItem>
                                      </Link>
                                    </PermissionGuard>
                                    <PermissionGuard permission="mosques.delete">
                                      <DropdownMenuSeparator />
                                      <DropdownMenuItem
                                        className="cursor-pointer text-destructive focus:text-destructive"
                                        onClick={() => openDeleteDialog(mosque.id)}
                                      >
                                        <Trash2 className="w-4 h-4 ml-2" />
                                        حذف
                                      </DropdownMenuItem>
                                    </PermissionGuard>
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

                {/* عرض الكروت للموبايل */}
                <div className="md:hidden divide-y divide-border">
                  {mosques.map((mosque: any) => {
                    const status = APPROVAL_STATUS[mosque.approvalStatus as keyof typeof APPROVAL_STATUS] || APPROVAL_STATUS.pending;
                    const StatusIcon = status.icon;

                    return (
                      <div key={mosque.id} className={`p-4 ${mosque.approvalStatus === "pending" ? "bg-yellow-50/30" : ""}`}>
                        <div className="flex justify-between items-start gap-3 mb-3">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                              <Building2 className="w-5 h-5 text-primary" />
                            </div>
                            <div className="min-w-0">
                              <p className="font-bold text-foreground truncate">{mosque.name}</p>
                              <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
                                <span className="flex items-center gap-1">
                                  <MapPin className="w-3 h-3" />
                                  {mosque.city}
                                </span>
                                {mosque.capacity && (
                                  <span className="flex items-center gap-1">
                                    <Users className="w-3 h-3" />
                                    {mosque.capacity}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreVertical className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <Link href={`/mosques/${mosque.id}`}>
                                <DropdownMenuItem className="cursor-pointer text-sm">
                                  <Eye className="w-4 h-4 ml-2" />
                                  عرض التفاصيل
                                </DropdownMenuItem>
                              </Link>
                              <PermissionGuard permission="mosques.edit">
                                <Link href={`/mosques/${mosque.id}/edit`}>
                                  <DropdownMenuItem className="cursor-pointer text-sm">
                                    <Edit className="w-4 h-4 ml-2" />
                                    تعديل
                                  </DropdownMenuItem>
                                </Link>
                              </PermissionGuard>
                              <PermissionGuard permission="mosques.delete">
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  className="cursor-pointer text-destructive focus:text-destructive text-sm"
                                  onClick={() => openDeleteDialog(mosque.id)}
                                >
                                  <Trash2 className="w-4 h-4 ml-2" />
                                  حذف
                                </DropdownMenuItem>
                              </PermissionGuard>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>

                        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                          <PermissionGuard permission="mosques.approve">
                            <Badge className={`${status.color} flex items-center gap-1 text-[10px] md:text-xs py-0.5 h-auto`}>
                              <StatusIcon className="w-3 h-3" />
                              {status.label}
                            </Badge>
                          </PermissionGuard>

                          <PermissionGuard permission="mosques.approve">
                            {mosque.approvalStatus === "pending" && (
                              <div className="flex items-center gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-8 text-[11px] text-green-600 border-green-300 hover:bg-green-50 px-2"
                                  onClick={() => handleApprove(mosque.id)}
                                  disabled={approveMutation.isPending}
                                >
                                  <CheckCircle className="w-3 h-3 ml-1" />
                                  اعتماد
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-8 text-[11px] text-red-600 border-red-300 hover:bg-red-50 px-2"
                                  onClick={() => openRejectDialog(mosque.id)}
                                  disabled={rejectMutation.isPending}
                                >
                                  <XCircle className="w-3 h-3 ml-1" />
                                  رفض
                                </Button>
                              </div>
                            )}
                          </PermissionGuard>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
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

      {/* نافذة تأكيد الحذف */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-destructive flex items-center gap-2">
              <Trash2 className="w-5 h-5" />
              تأكيد حذف المسجد
            </DialogTitle>
            <DialogDescription>
              هل أنت متأكد من رغبتك في حذف هذا المسجد نهائياً؟ لا يمكن التراجع عن هذا الإجراء.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              إلغاء
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "جاري الحذف..." : "تأكيد الحذف"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
