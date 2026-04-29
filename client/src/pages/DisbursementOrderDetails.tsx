import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { trpc } from "@/lib/trpc";
import { ArrowRight, Printer, CheckCircle, XCircle, Clock, Banknote, Building2, CreditCard, FileText } from "lucide-react";
import { useLocation, useParams } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";

const statusConfig: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  pending: { label: "قيد المراجعة", color: "bg-yellow-100 text-yellow-800", icon: <Clock className="h-4 w-4" /> },
  approved: { label: "معتمد", color: "bg-blue-100 text-blue-800", icon: <CheckCircle className="h-4 w-4" /> },
  executed: { label: "منفذ", color: "bg-green-100 text-green-800", icon: <CheckCircle className="h-4 w-4" /> },
  rejected: { label: "مرفوض", color: "bg-red-100 text-red-800", icon: <XCircle className="h-4 w-4" /> },
  cancelled: { label: "ملغي", color: "bg-gray-100 text-gray-800", icon: <XCircle className="h-4 w-4" /> },
};

const paymentMethodLabels: Record<string, string> = {
  bank_transfer: "تحويل بنكي",
  check: "شيك",
  custody: "عهدة",
};

export default function DisbursementOrderDetails() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const utils = trpc.useUtils();

  const { data: order, isLoading, error } = trpc.disbursements.getOrderById.useQuery(
    { id: Number(id) },
    { enabled: !!id }
  );

  const approveOrder = trpc.disbursements.approveOrder.useMutation({
    onSuccess: () => {
      toast.success("تم اعتماد أمر الصرف بنجاح");
      utils.disbursements.getOrderById.invalidate({ id: Number(id) });
    },
    onError: (error) => {
      toast.error(error.message || "حدث خطأ أثناء اعتماد أمر الصرف");
    },
  });

  const executeOrder = trpc.disbursements.executeOrder.useMutation({
    onSuccess: () => {
      toast.success("تم تنفيذ أمر الصرف بنجاح");
      utils.disbursements.getOrderById.invalidate({ id: Number(id) });
    },
    onError: (error) => {
      toast.error(error.message || "حدث خطأ أثناء تنفيذ أمر الصرف");
    },
  });

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="p-6 space-y-6">
          <Skeleton className="h-8 w-64" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Skeleton className="h-48" />
            <Skeleton className="h-48" />
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (error || !order) {
    return (
      <DashboardLayout>
        <div className="p-6">
          <Card className="border-red-200 bg-red-50">
            <CardContent className="p-6 text-center">
              <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <h2 className="text-xl font-bold text-red-800 mb-2">أمر الصرف غير موجود</h2>
              <p className="text-red-600 mb-4">{error?.message || "لم يتم العثور على أمر الصرف المطلوب"}</p>
              <Button onClick={() => navigate("/disbursement-orders")}>
                <ArrowRight className="ml-2 h-4 w-4" />
                العودة لقائمة أوامر الصرف
              </Button>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  const status = statusConfig[order.status as keyof typeof statusConfig] || statusConfig.pending;

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button variant="outline" size="icon" onClick={() => navigate("/disbursement-orders")}>
              <ArrowRight className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">أمر الصرف رقم {order.orderNumber}</h1>
              <p className="text-muted-foreground">تفاصيل أمر الصرف</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge className={status.color}>
              {status.icon}
              <span className="mr-1">{status.label}</span>
            </Badge>
            <Button variant="outline" onClick={() => navigate(`/disbursement-orders/${id}/print`)}>
              <Printer className="ml-2 h-4 w-4" />
              طباعة
            </Button>
            {order.status === "pending" && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button className="bg-blue-600 hover:bg-blue-700">
                    <CheckCircle className="ml-2 h-4 w-4" />
                    اعتماد
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>تأكيد اعتماد أمر الصرف</AlertDialogTitle>
                    <AlertDialogDescription>
                      هل أنت متأكد من اعتماد أمر الصرف رقم {order.orderNumber}؟
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>إلغاء</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => approveOrder.mutate({ id: Number(id) })}
                      disabled={approveOrder.isPending}
                    >
                      {approveOrder.isPending ? "جاري الاعتماد..." : "اعتماد"}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
            {order.status === "approved" && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button className="bg-green-600 hover:bg-green-700">
                    <Banknote className="ml-2 h-4 w-4" />
                    تنفيذ الدفع
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>تأكيد تنفيذ أمر الصرف</AlertDialogTitle>
                    <AlertDialogDescription>
                      هل أنت متأكد من تنفيذ أمر الصرف رقم {order.orderNumber} بمبلغ {Number(order.amount).toLocaleString("ar-SA")} ريال؟
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>إلغاء</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => executeOrder.mutate({ id: Number(id) })}
                      disabled={executeOrder.isPending}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      {executeOrder.isPending ? "جاري التنفيذ..." : "تنفيذ"}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* بيانات أمر الصرف */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                بيانات أمر الصرف
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">رقم أمر الصرف</p>
                  <p className="font-semibold">{order.orderNumber}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">المبلغ</p>
                  <p className="font-semibold text-primary text-lg">
                    {Number(order.amount).toLocaleString("ar-SA")} ريال
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">تاريخ الإنشاء</p>
                  <p className="font-semibold">
                    {order.createdAt ? new Date(order.createdAt).toLocaleDateString("ar-SA") : "-"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">الحالة</p>
                  <Badge className={status.color}>
                    {status.icon}
                    <span className="mr-1">{status.label}</span>
                  </Badge>
                </div>
              </div>

              {order.approvedAt && (
                <>
                  <Separator />
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">تاريخ الاعتماد</p>
                      <p className="font-semibold">
                        {new Date(order.approvedAt).toLocaleDateString("ar-SA")}
                      </p>
                    </div>
                    {order.approvalNotes && (
                      <div className="col-span-2">
                        <p className="text-sm text-muted-foreground">ملاحظات الاعتماد</p>
                        <p className="font-semibold">{order.approvalNotes}</p>
                      </div>
                    )}
                  </div>
                </>
              )}

              {order.executedAt && (
                <>
                  <Separator />
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">تاريخ التنفيذ</p>
                      <p className="font-semibold">
                        {new Date(order.executedAt).toLocaleDateString("ar-SA")}
                      </p>
                    </div>
                    {order.transactionReference && (
                      <div>
                        <p className="text-sm text-muted-foreground">رقم العملية</p>
                        <p className="font-semibold">{order.transactionReference}</p>
                      </div>
                    )}
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* بيانات المستفيد */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-primary" />
                بيانات المستفيد
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">اسم المستفيد</p>
                  <p className="font-semibold text-lg">{order.beneficiaryName}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">طريقة الدفع</p>
                  <Badge variant="outline" className="flex items-center gap-1 w-fit">
                    <CreditCard className="h-3 w-3" />
                    {paymentMethodLabels[order.paymentMethod as keyof typeof paymentMethodLabels] || order.paymentMethod}
                  </Badge>
                </div>
                {order.beneficiaryBank && (
                  <div>
                    <p className="text-sm text-muted-foreground">البنك</p>
                    <p className="font-semibold">{order.beneficiaryBank}</p>
                  </div>
                )}
                {order.beneficiaryIban && (
                  <div>
                    <p className="text-sm text-muted-foreground">رقم الآيبان</p>
                    <p className="font-semibold font-mono text-sm" dir="ltr">{order.beneficiaryIban}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* بيانات طلب الصرف */}
          {order.disbursementRequest && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Banknote className="h-5 w-5 text-primary" />
                  طلب الصرف المرتبط
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">رقم الطلب</p>
                    <p className="font-semibold">{order.disbursementRequest.requestNumber}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">المبلغ المطلوب</p>
                    <p className="font-semibold">
                      {Number(order.disbursementRequest.amount).toLocaleString("ar-SA")} ريال
                    </p>
                  </div>
                  {order.disbursementRequest.description && (
                    <div className="col-span-2">
                      <p className="text-sm text-muted-foreground">الوصف</p>
                      <p className="font-semibold">{order.disbursementRequest.description}</p>
                    </div>
                  )}
                </div>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => navigate(`/disbursements/requests/${order.disbursementRequest?.id}/print`)}
                >
                  <Printer className="ml-2 h-4 w-4" />
                  طباعة طلب الصرف
                </Button>
              </CardContent>
            </Card>
          )}

          {/* بيانات المشروع */}
          {order.project && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-primary" />
                  المشروع
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <p className="text-sm text-muted-foreground">اسم المشروع</p>
                    <p className="font-semibold text-lg">{order.project.name}</p>
                  </div>
                  {order.project.budget && (
                    <div>
                      <p className="text-sm text-muted-foreground">ميزانية المشروع</p>
                      <p className="font-semibold">
                        {Number(order.project.budget).toLocaleString("ar-SA")} ريال
                      </p>
                    </div>
                  )}
                </div>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => navigate(`/projects/${order.project?.id}`)}
                >
                  عرض تفاصيل المشروع
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
