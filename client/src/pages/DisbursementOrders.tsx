import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import {
  Eye,
  CheckCircle,
  XCircle,
  Clock,
  Banknote,
  FileText,
  Search,
  Filter,
  Printer,
  PlayCircle,
} from "lucide-react";
import { toast } from "sonner";

const STATUS_MAP: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  draft: { label: "مسودة", variant: "secondary" },
  pending: { label: "قيد الاعتماد", variant: "default" },
  approved: { label: "معتمد", variant: "outline" },
  rejected: { label: "مرفوض", variant: "destructive" },
  executed: { label: "منفذ", variant: "outline" },
  paid: { label: "مدفوع", variant: "outline" },
  cancelled: { label: "ملغي", variant: "destructive" },
};

const PAYMENT_METHOD_MAP: Record<string, string> = {
  bank_transfer: "تحويل بنكي",
  check: "إصدار شيك",
  custody: "صرف من العهدة",
  sadad: "سداد",
};

export default function DisbursementOrders() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [showApproveDialog, setShowApproveDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [showExecuteDialog, setShowExecuteDialog] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [approvalNotes, setApprovalNotes] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");
  const [transactionReference, setTransactionReference] = useState("");

  // جلب قائمة أوامر الصرف
  const { data: ordersData, isLoading, refetch: refetchOrders } = trpc.disbursements.listOrders.useQuery({
    status: statusFilter !== "all" ? statusFilter as any : undefined,
    limit: 100,
  });

  // Mutations
  const approveOrderMutation = trpc.disbursements.approveOrder.useMutation({
    onSuccess: () => {
      toast.success("تم اعتماد أمر الصرف بنجاح");
      setShowApproveDialog(false);
      setApprovalNotes("");
      refetchOrders();
    },
    onError: (error) => {
      toast.error(error.message || "حدث خطأ أثناء اعتماد أمر الصرف");
    },
  });

  const rejectOrderMutation = trpc.disbursements.rejectOrder.useMutation({
    onSuccess: () => {
      toast.success("تم رفض أمر الصرف");
      setShowRejectDialog(false);
      setRejectionReason("");
      refetchOrders();
    },
    onError: (error) => {
      toast.error(error.message || "حدث خطأ أثناء رفض أمر الصرف");
    },
  });

  const executeOrderMutation = trpc.disbursements.executeOrder.useMutation({
    onSuccess: () => {
      toast.success("تم تنفيذ أمر الصرف بنجاح");
      setShowExecuteDialog(false);
      setTransactionReference("");
      refetchOrders();
    },
    onError: (error) => {
      toast.error(error.message || "حدث خطأ أثناء تنفيذ أمر الصرف");
    },
  });

  // التحقق من الصلاحيات
  const canApproveOrder = ["super_admin", "system_admin", "general_manager"].includes(user?.role || "");
  const canExecuteOrder = ["super_admin", "system_admin", "financial"].includes(user?.role || "");

  // تصفية الأوامر
  const filteredOrders = ordersData?.orders?.filter((order) => {
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      return (
        order.orderNumber?.toLowerCase().includes(search) ||
        order.beneficiaryName?.toLowerCase().includes(search) ||
        order.projectName?.toLowerCase().includes(search)
      );
    }
    return true;
  });

  // إحصائيات
  const pendingCount = ordersData?.orders?.filter(o => o.status === "pending").length || 0;
  const approvedCount = ordersData?.orders?.filter(o => o.status === "approved").length || 0;
  const executedCount = ordersData?.orders?.filter(o => o.status === "executed" || (o.status as string) === "paid").length || 0;
  const totalAmount = ordersData?.orders?.reduce((sum, o) => sum + Number(o.amount || 0), 0) || 0;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* العنوان والإحصائيات */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold">أوامر الصرف</h1>
            <p className="text-muted-foreground">إدارة واعتماد وتنفيذ أوامر الصرف المالية</p>
          </div>
        </div>

        {/* بطاقات الإحصائيات */}
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          <Card className="border-0 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 sm:pb-2 p-3 sm:p-4">
              <CardTitle className="text-[10px] sm:text-xs font-medium">قيد الاعتماد</CardTitle>
              <Clock className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="p-3 sm:p-4 pt-0">
              <div className="text-lg sm:text-2xl font-bold">{pendingCount}</div>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 sm:pb-2 p-3 sm:p-4">
              <CardTitle className="text-[10px] sm:text-xs font-medium">معتمدة</CardTitle>
              <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4 text-green-500" />
            </CardHeader>
            <CardContent className="p-3 sm:p-4 pt-0">
              <div className="text-lg sm:text-2xl font-bold">{approvedCount}</div>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 sm:pb-2 p-3 sm:p-4">
              <CardTitle className="text-[10px] sm:text-xs font-medium">منفذة</CardTitle>
              <Banknote className="h-3 w-3 sm:h-4 sm:w-4 text-green-500" />
            </CardHeader>
            <CardContent className="p-3 sm:p-4 pt-0">
              <div className="text-lg sm:text-2xl font-bold">{executedCount}</div>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 sm:pb-2 p-3 sm:p-4">
              <CardTitle className="text-[10px] sm:text-xs font-medium">إجمالي المبالغ</CardTitle>
              <Banknote className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="p-3 sm:p-4 pt-0">
              <div className="text-sm sm:text-2xl font-bold truncate">{totalAmount.toLocaleString()} ريال</div>
            </CardContent>
          </Card>
        </div>

        {/* أدوات البحث والتصفية */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="p-4 sm:p-6 pb-2">
            <CardTitle className="text-lg sm:text-xl">قائمة أوامر الصرف</CardTitle>
            <CardDescription className="text-xs sm:text-sm">عرض وإدارة جميع أوامر الصرف</CardDescription>
          </CardHeader>
          <CardContent className="p-4 sm:p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center mb-6">
              <div className="relative flex-1">
                <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="بحث برقم الأمر أو اسم المستفيد..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pr-10"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full lg:w-[180px]">
                  <Filter className="ml-2 h-4 w-4" />
                  <SelectValue placeholder="جميع الحالات" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">جميع الحالات</SelectItem>
                  <SelectItem value="pending">قيد الاعتماد</SelectItem>
                  <SelectItem value="approved">معتمد</SelectItem>
                  <SelectItem value="executed">منفذ</SelectItem>
                  <SelectItem value="rejected">مرفوض</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {isLoading ? (
              <div className="text-center py-8">جاري التحميل...</div>
            ) : filteredOrders?.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                لا توجد أوامر صرف
              </div>
            ) : (
              <Card className="border-0 shadow-sm overflow-hidden p-0">
                {/* Desktop View Table */}
                <div className="hidden md:block overflow-x-auto">
                  <Table dir="rtl">
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-right">رقم الأمر</TableHead>
                        <TableHead className="text-right">المشروع</TableHead>
                        <TableHead className="text-right">المستفيد</TableHead>
                        <TableHead className="text-right">المبلغ</TableHead>
                        <TableHead className="text-right">طريقة الدفع</TableHead>
                        <TableHead className="text-right">الحالة</TableHead>
                        <TableHead className="text-right">التاريخ</TableHead>
                        <TableHead className="text-right">الإجراءات</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredOrders?.map((order) => (
                        <TableRow key={order.id}>
                          <TableCell className="font-mono text-xs text-right">{order.orderNumber}</TableCell>
                          <TableCell className="max-w-[150px] truncate text-right">{order.projectName || "-"}</TableCell>
                          <TableCell className="max-w-[150px] truncate text-right">{order.beneficiaryName}</TableCell>
                          <TableCell className="whitespace-nowrap text-right">{Number(order.amount).toLocaleString()} ريال</TableCell>
                          <TableCell className="text-right">{PAYMENT_METHOD_MAP[order.paymentMethod || "bank_transfer"]}</TableCell>
                          <TableCell className="text-right">
                            <Badge variant={STATUS_MAP[order.status || "draft"]?.variant} className="whitespace-nowrap">
                              {STATUS_MAP[order.status || "draft"]?.label}
                            </Badge>
                          </TableCell>
                          <TableCell className="whitespace-nowrap text-right">
                            {order.createdAt ? new Date(order.createdAt).toLocaleDateString("ar-SA") : "-"}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center gap-1 justify-start">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => navigate(`/disbursement-orders/${order.id}/print`)}
                                title="طباعة"
                              >
                                <Printer className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => navigate(`/disbursement-orders/${order.id}`)}
                                title="عرض التفاصيل"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              {canApproveOrder && order.status === "pending" && (
                                <>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-green-600"
                                    onClick={() => {
                                      setSelectedOrder(order);
                                      setShowApproveDialog(true);
                                    }}
                                    title="اعتماد"
                                  >
                                    <CheckCircle className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-red-600"
                                    onClick={() => {
                                      setSelectedOrder(order);
                                      setShowRejectDialog(true);
                                    }}
                                    title="رفض"
                                  >
                                    <XCircle className="h-4 w-4" />
                                  </Button>
                                </>
                              )}
                              {canExecuteOrder && order.status === "approved" && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-blue-600"
                                  onClick={() => {
                                    setSelectedOrder(order);
                                    setShowExecuteDialog(true);
                                  }}
                                  title="تنفيذ"
                                >
                                  <PlayCircle className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Mobile View Cards */}
                <div className="md:hidden divide-y divide-border" dir="rtl">
                  {filteredOrders?.map((order) => (
                    <div key={order.id} className="p-4 space-y-4">
                      <div className="flex items-start justify-between">
                        <div className="min-w-0 text-right">
                          <p className="font-mono text-[10px] text-muted-foreground">{order.orderNumber}</p>
                          <p className="font-bold text-sm truncate">{order.beneficiaryName}</p>
                          <p className="text-[10px] text-muted-foreground truncate">{order.projectName || "-"}</p>
                        </div>
                        <Badge variant={STATUS_MAP[order.status || "draft"]?.variant} className="text-[10px] px-2 py-0">
                          {STATUS_MAP[order.status || "draft"]?.label}
                        </Badge>
                      </div>

                      <div className="grid grid-cols-2 gap-4 text-right">
                        <div>
                          <p className="text-[10px] text-muted-foreground mb-1">المبلغ</p>
                          <p className="text-sm font-semibold">{Number(order.amount).toLocaleString()} ريال</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-muted-foreground mb-1">طريقة الدفع</p>
                          <p className="text-xs">{PAYMENT_METHOD_MAP[order.paymentMethod || "bank_transfer"]}</p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-border/50">
                        <span className="text-[10px] text-muted-foreground">
                          {order.createdAt ? new Date(order.createdAt).toLocaleDateString("ar-SA") : "-"}
                        </span>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={() => navigate(`/disbursement-orders/${order.id}/print`)}
                          >
                            <Printer className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={() => navigate(`/disbursement-orders/${order.id}`)}
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </Button>
                          {canApproveOrder && order.status === "pending" && (
                            <>
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-8 w-8 p-0 text-green-600 border-green-200"
                                onClick={() => {
                                  setSelectedOrder(order);
                                  setShowApproveDialog(true);
                                }}
                              >
                                <CheckCircle className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-8 w-8 p-0 text-red-600 border-red-200"
                                onClick={() => {
                                  setSelectedOrder(order);
                                  setShowRejectDialog(true);
                                }}
                              >
                                <XCircle className="h-3.5 w-3.5" />
                              </Button>
                            </>
                          )}
                          {canExecuteOrder && order.status === "approved" && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 w-8 p-0 text-blue-600 border-blue-200"
                              onClick={() => {
                                setSelectedOrder(order);
                                setShowExecuteDialog(true);
                              }}
                            >
                              <PlayCircle className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </CardContent>
        </Card>

        {/* نافذة اعتماد أمر الصرف */}
        <Dialog open={showApproveDialog} onOpenChange={setShowApproveDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>اعتماد أمر الصرف</DialogTitle>
              <DialogDescription>
                هل أنت متأكد من اعتماد أمر الصرف رقم {selectedOrder?.orderNumber}؟
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="bg-muted p-4 rounded-lg">
                <p><strong>المستفيد:</strong> {selectedOrder?.beneficiaryName}</p>
                <p><strong>المبلغ:</strong> {Number(selectedOrder?.amount || 0).toLocaleString()} ريال</p>
              </div>
              <div className="space-y-2">
                <Label>ملاحظات (اختياري)</Label>
                <Textarea
                  value={approvalNotes}
                  onChange={(e) => setApprovalNotes(e.target.value)}
                  placeholder="أدخل ملاحظاتك..."
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowApproveDialog(false)}>
                إلغاء
              </Button>
              <Button
                onClick={() => {
                  if (selectedOrder) {
                    approveOrderMutation.mutate({
                      id: selectedOrder.id,
                      notes: approvalNotes,
                    });
                  }
                }}
                disabled={approveOrderMutation.isPending}
              >
                {approveOrderMutation.isPending ? "جاري الاعتماد..." : "اعتماد"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* نافذة رفض أمر الصرف */}
        <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>رفض أمر الصرف</DialogTitle>
              <DialogDescription>
                يرجى إدخال سبب رفض أمر الصرف رقم {selectedOrder?.orderNumber}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>سبب الرفض *</Label>
                <Textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="أدخل سبب الرفض..."
                  required
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowRejectDialog(false)}>
                إلغاء
              </Button>
              <Button
                variant="destructive"
                onClick={() => {
                  if (selectedOrder && rejectionReason) {
                    rejectOrderMutation.mutate({
                      id: selectedOrder.id,
                      reason: rejectionReason,
                    });
                  }
                }}
                disabled={!rejectionReason || rejectOrderMutation.isPending}
              >
                {rejectOrderMutation.isPending ? "جاري الرفض..." : "رفض"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* نافذة تنفيذ أمر الصرف */}
        <Dialog open={showExecuteDialog} onOpenChange={setShowExecuteDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>تنفيذ أمر الصرف</DialogTitle>
              <DialogDescription>
                تأكيد تنفيذ أمر الصرف رقم {selectedOrder?.orderNumber}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="bg-muted p-4 rounded-lg">
                <p><strong>المستفيد:</strong> {selectedOrder?.beneficiaryName}</p>
                <p><strong>المبلغ:</strong> {Number(selectedOrder?.amount || 0).toLocaleString()} ريال</p>
                <p><strong>طريقة الدفع:</strong> {PAYMENT_METHOD_MAP[selectedOrder?.paymentMethod || "bank_transfer"]}</p>
              </div>
              <div className="space-y-2">
                <Label>رقم العملية / المرجع (اختياري)</Label>
                <Input
                  value={transactionReference}
                  onChange={(e) => setTransactionReference(e.target.value)}
                  placeholder="أدخل رقم العملية البنكية..."
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowExecuteDialog(false)}>
                إلغاء
              </Button>
              <Button
                onClick={() => {
                  if (selectedOrder) {
                    executeOrderMutation.mutate({
                      id: selectedOrder.id,
                      transactionReference: transactionReference || undefined,
                    });
                  }
                }}
                disabled={executeOrderMutation.isPending}
              >
                {executeOrderMutation.isPending ? "جاري التنفيذ..." : "تنفيذ الصرف"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
