import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Banknote,
  TrendingUp,
  TrendingDown,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  FileText,
  CreditCard,
  Building2,
  ArrowRight,
  Eye,
} from "lucide-react";
import { toast } from "sonner";

const STATUS_COLORS = {
  draft: "bg-gray-100 text-gray-800",
  pending: "bg-blue-100 text-blue-800",
  approved: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800",
  paid: "bg-emerald-100 text-emerald-800",
  executed: "bg-emerald-100 text-emerald-800",
};

export default function FinancialDashboard() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [selectedProject, setSelectedProject] = useState<number | null>(null);

  // جلب ملخص الحركة المالية
  const { data: financialSummary, isLoading: summaryLoading } = trpc.disbursements.getFinancialSummary.useQuery(
    selectedProject ? { projectId: selectedProject } : undefined
  );

  // جلب قائمة المشاريع
  const { data: projects } = trpc.projects.getAll.useQuery({ limit: 100 });

  // جلب طلبات الصرف الأخيرة
  const { data: recentRequestsData } = trpc.disbursements.listRequests.useQuery({
    limit: 5,
    projectId: selectedProject || undefined,
  });
  const recentRequests = recentRequestsData?.requests || [];

  // جلب أوامر الصرف الأخيرة
  const { data: recentOrdersData } = trpc.disbursements.listOrders.useQuery({
    limit: 5,
  });
  const recentOrders = recentOrdersData?.orders || [];

  if (!user) {
    return null;
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("ar-SA", {
      style: "currency",
      currency: "SAR",
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; icon: any }> = {
      draft: { label: "مسودة", icon: FileText },
      pending: { label: "قيد المراجعة", icon: Clock },
      approved: { label: "معتمد", icon: CheckCircle },
      rejected: { label: "مرفوض", icon: XCircle },
      paid: { label: "مصروف", icon: CheckCircle },
      executed: { label: "منفذ", icon: CheckCircle },
    };

    const statusInfo = statusMap[status] || { label: status, icon: AlertCircle };
    const Icon = statusInfo.icon;

    return (
      <Badge className={`${STATUS_COLORS[status as keyof typeof STATUS_COLORS]} flex items-center gap-1`}>
        <Icon className="h-3 w-3" />
        {statusInfo.label}
      </Badge>
    );
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">لوحة التحكم المالية</h1>
            <p className="text-muted-foreground mt-1">
              متابعة شاملة للحركة المالية وطلبات وأوامر الصرف
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setLocation("/disbursement-requests")}
            >
              <FileText className="ml-2 h-4 w-4" />
              طلبات الصرف
            </Button>
            <Button
              variant="outline"
              onClick={() => setLocation("/disbursement-orders")}
            >
              <CreditCard className="ml-2 h-4 w-4" />
              أوامر الصرف
            </Button>
          </div>
        </div>

        {/* Project Filter */}
        {projects && projects.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">تصفية حسب المشروع</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2 flex-wrap">
                <Button
                  variant={selectedProject === null ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedProject(null)}
                >
                  جميع المشاريع
                </Button>
                {projects.map((project: any) => (
                  <Button
                    key={project.id}
                    variant={selectedProject === project.id ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedProject(project.id)}
                  >
                    <Building2 className="ml-2 h-4 w-4" />
                    {project.projectNumber}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Financial Summary Cards */}
        {summaryLoading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardHeader className="pb-2">
                  <div className="h-4 bg-muted rounded w-24"></div>
                </CardHeader>
                <CardContent>
                  <div className="h-8 bg-muted rounded w-32 mb-2"></div>
                  <div className="h-3 bg-muted rounded w-20"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : financialSummary ? (
          <>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {/* إجمالي المبلغ المعتمد */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <Banknote className="h-4 w-4" />
                    إجمالي المبلغ المعتمد
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-primary">
                    {formatCurrency(financialSummary.totalApproved)}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    من إجمالي العقد
                  </p>
                </CardContent>
              </Card>

              {/* المبلغ المصروف */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <TrendingDown className="h-4 w-4" />
                    المبلغ المصروف
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-emerald-600">
                    {formatCurrency(financialSummary.totalPaid)}
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <Progress value={financialSummary.paidPercentage} className="flex-1" />
                    <span className="text-sm font-medium">{financialSummary.paidPercentage.toFixed(1)}%</span>
                  </div>
                </CardContent>
              </Card>

              {/* المبلغ المتبقي */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" />
                    المبلغ المتبقي
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-blue-600">
                    {formatCurrency(financialSummary.totalRemaining)}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    متبقي للصرف
                  </p>
                </CardContent>
              </Card>

              {/* طلبات قيد المراجعة */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    طلبات قيد المراجعة
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-amber-600">
                    {financialSummary.pendingRequests}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    بقيمة {formatCurrency(financialSummary.pendingAmount)}
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Detailed Progress */}
            <Card>
              <CardHeader>
                <CardTitle>تفاصيل الحركة المالية</CardTitle>
                <CardDescription>
                  نظرة شاملة على مراحل الصرف المختلفة
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Advance Payment */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">الدفعة المقدمة</span>
                    <span className="text-sm text-muted-foreground">
                      {formatCurrency(financialSummary.advancePayment || 0)}
                    </span>
                  </div>
                  <Progress value={(financialSummary.advancePayment || 0) / financialSummary.totalApproved * 100} />
                </div>

                {/* Progress Payments */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">الدفعات المرحلية</span>
                    <span className="text-sm text-muted-foreground">
                      {formatCurrency(financialSummary.progressPayments || 0)}
                    </span>
                  </div>
                  <Progress value={(financialSummary.progressPayments || 0) / financialSummary.totalApproved * 100} />
                </div>

                {/* Final Payment */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">الدفعة الختامية</span>
                    <span className="text-sm text-muted-foreground">
                      {formatCurrency(financialSummary.finalPayment || 0)}
                    </span>
                  </div>
                  <Progress value={(financialSummary.finalPayment || 0) / financialSummary.totalApproved * 100} />
                </div>

                {/* Retention */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">ضمان حسن التنفيذ</span>
                    <span className="text-sm text-muted-foreground">
                      {formatCurrency(financialSummary.retentionAmount || 0)}
                    </span>
                  </div>
                  <Progress value={(financialSummary.retentionAmount || 0) / financialSummary.totalApproved * 100} className="bg-amber-100" />
                </div>
              </CardContent>
            </Card>
          </>
        ) : (
          <Card>
            <CardContent className="py-12 text-center">
              <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">لا توجد بيانات مالية متاحة</p>
            </CardContent>
          </Card>
        )}

        {/* Recent Activity Tabs */}
        <Tabs defaultValue="requests" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="requests">
              <FileText className="ml-2 h-4 w-4" />
              طلبات الصرف الأخيرة
            </TabsTrigger>
            <TabsTrigger value="orders">
              <CreditCard className="ml-2 h-4 w-4" />
              أوامر الصرف الأخيرة
            </TabsTrigger>
          </TabsList>

          <TabsContent value="requests">
            <Card>
              <CardHeader>
                <CardTitle>آخر طلبات الصرف</CardTitle>
                <CardDescription>
                  آخر 5 طلبات صرف تم إنشاؤها
                </CardDescription>
              </CardHeader>
              <CardContent>
                {recentRequests && recentRequests.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>رقم الطلب</TableHead>
                        <TableHead>المشروع</TableHead>
                        <TableHead>المبلغ</TableHead>
                        <TableHead>النوع</TableHead>
                        <TableHead>الحالة</TableHead>
                        <TableHead>التاريخ</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {recentRequests.map((request: any) => (
                        <TableRow key={request.id}>
                          <TableCell className="font-medium">{request.requestNumber}</TableCell>
                          <TableCell>{request.projectNumber}</TableCell>
                          <TableCell>{formatCurrency(Number(request.amount))}</TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {request.paymentType === "advance" && "دفعة مقدمة"}
                              {request.paymentType === "progress" && "دفعة مرحلية"}
                              {request.paymentType === "final" && "دفعة ختامية"}
                              {request.paymentType === "retention" && "ضمان"}
                            </Badge>
                          </TableCell>
                          <TableCell>{getStatusBadge(request.status)}</TableCell>
                          <TableCell>
                            {new Date(request.createdAt).toLocaleDateString("ar-SA")}
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setLocation(`/disbursement-requests`)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="py-12 text-center text-muted-foreground">
                    لا توجد طلبات صرف
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="orders">
            <Card>
              <CardHeader>
                <CardTitle>آخر أوامر الصرف</CardTitle>
                <CardDescription>
                  آخر 5 أوامر صرف تم إنشاؤها
                </CardDescription>
              </CardHeader>
              <CardContent>
                {recentOrders.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>رقم الأمر</TableHead>
                        <TableHead>رقم الطلب</TableHead>
                        <TableHead>المستفيد</TableHead>
                        <TableHead>المبلغ</TableHead>
                        <TableHead>الحالة</TableHead>
                        <TableHead>التاريخ</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {recentOrders.map((order: any) => (
                        <TableRow key={order.id}>
                          <TableCell className="font-medium">{order.orderNumber}</TableCell>
                          <TableCell>{order.disbursementRequest?.requestNumber}</TableCell>
                          <TableCell>{order.beneficiaryName}</TableCell>
                          <TableCell>{formatCurrency(Number(order.amount))}</TableCell>
                          <TableCell>{getStatusBadge(order.status)}</TableCell>
                          <TableCell>
                            {new Date(order.createdAt).toLocaleDateString("ar-SA")}
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setLocation(`/disbursement-orders/${order.id}`)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="py-12 text-center text-muted-foreground">
                    لا توجد أوامر صرف
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
