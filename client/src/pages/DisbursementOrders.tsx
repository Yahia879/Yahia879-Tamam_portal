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
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">قيد الاعتماد</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{pendingCount}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">معتمدة</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{approvedCount}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">منفذة</CardTitle>
              <Banknote className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{executedCount}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">إجمالي المبالغ</CardTitle>
              <Banknote className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalAmount.toLocaleString()} ريال</div>
            </CardContent>
          </Card>
        </div>

        {/* أدوات البحث والتصفية */}
        <Card>
          <CardHeader>
            <CardTitle>قائمة أوامر الصرف</CardTitle>
            <CardDescription>عرض وإدارة جميع أوامر الصرف</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-4 md:flex-row md:items-center mb-4">
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
                <SelectTrigger className="w-[180px]">
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
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>رقم الأمر</TableHead>
                      <TableHead>المشروع</TableHead>
                      <TableHead>المستفيد</TableHead>
                      <TableHead>المبلغ</TableHead>
                      <TableHead>طريقة الدفع</TableHead>
                      <TableHead>الحالة</TableHead>
                      <TableHead>التاريخ</TableHead>
                      <TableHead>الإجراءات</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredOrders?.map((order) => (
                      <TableRow key={order.id}>
                        <TableCell className="font-medium">{order.orderNumber}</TableCell>
                        <TableCell>{order.projectName || "-"}</TableCell>
                        <TableCell>{order.beneficiaryName}</TableCell>
                        <TableCell>{Number(order.amount).toLocaleString()} ريال</TableCell>
                        <TableCell>{PAYMENT_METHOD_MAP[order.paymentMethod || "bank_transfer"]}</TableCell>
                        <TableCell>
                          <Badge variant={STATUS_MAP[order.status || "draft"]?.variant}>
                            {STATUS_MAP[order.status || "draft"]?.label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {order.createdAt ? new Date(order.createdAt).toLocaleDateString("ar-SA") : "-"}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => navigate(`/disbursement-orders/${order.id}/print`)}
                              title="طباعة"
                            >
                              <Printer className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
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
                                  className="text-green-600"
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
                                  className="text-red-600"
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
                                className="text-blue-600"
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
