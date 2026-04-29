import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
  BarChart3,
  TrendingUp,
  TrendingDown,
  DollarSign,
  FileText,
  Calendar,
  Building2,
  Wallet,
  Download,
  Printer,
  ScrollText,
  Percent,
} from "lucide-react";

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  draft: { label: "مسودة", color: "bg-gray-100 text-gray-800" },
  pending: { label: "قيد الاعتماد", color: "bg-yellow-100 text-yellow-800" },
  approved: { label: "معتمد", color: "bg-blue-100 text-blue-800" },
  rejected: { label: "مرفوض", color: "bg-red-100 text-red-800" },
  executed: { label: "منفذ", color: "bg-green-100 text-green-800" },
  paid: { label: "مدفوع", color: "bg-emerald-100 text-emerald-800" },
  cancelled: { label: "ملغي", color: "bg-gray-100 text-gray-800" },
};

export default function FinancialReport() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("overview");

  // جلب بيانات التقرير المالي
  const { data: reportData, isLoading } = trpc.disbursements.getFinancialReport.useQuery({});

  // تنسيق المبالغ
  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat("ar-SA", {
      style: "decimal",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // طباعة التقرير
  const handlePrint = () => {
    window.print();
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-muted-foreground">جاري تحميل التقرير...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  const summary = reportData?.summary;

  return (
    <DashboardLayout>
      <div className="space-y-6 print:space-y-4">
        {/* العنوان */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between print:hidden">
          <div>
            <h1 className="text-2xl font-bold">التقرير المالي الشامل</h1>
            <p className="text-muted-foreground">ملخص المصروفات وأوامر الصرف</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handlePrint}>
              <Printer className="ml-2 h-4 w-4" />
              طباعة
            </Button>
          </div>
        </div>

        {/* عنوان الطباعة */}
        <div className="hidden print:block text-center mb-6">
          <h1 className="text-2xl font-bold">التقرير المالي الشامل</h1>
          <p className="text-sm text-gray-600">تاريخ التقرير: {new Date().toLocaleDateString("ar-SA")}</p>
        </div>

        {/* بطاقات الإحصائيات الرئيسية */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">إجمالي طلبات الصرف</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary?.totalRequests || 0}</div>
              <p className="text-xs text-muted-foreground">
                بقيمة {formatAmount(summary?.totalRequestedAmount || 0)} ريال
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">المبالغ المدفوعة</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {formatAmount(summary?.totalPaidAmount || 0)} ريال
              </div>
              <p className="text-xs text-muted-foreground">
                {summary?.totalRequestedAmount ? 
                  `${((summary.totalPaidAmount / summary.totalRequestedAmount) * 100).toFixed(1)}% من الإجمالي` 
                  : "0%"}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">المبالغ المعلقة</CardTitle>
              <TrendingDown className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">
                {formatAmount(summary?.pendingAmount || 0)} ريال
              </div>
              <p className="text-xs text-muted-foreground">قيد المراجعة أو الاعتماد</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">أوامر الصرف</CardTitle>
              <Wallet className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary?.totalOrders || 0}</div>
              <p className="text-xs text-muted-foreground">
                منفذ: {formatAmount(summary?.executedAmount || 0)} ريال
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">إجمالي العقود</CardTitle>
              <ScrollText className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary?.totalContracts || 0}</div>
              <p className="text-xs text-muted-foreground">
                {formatAmount(summary?.totalContractAmount || 0)} ريال
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">نسبة الصرف من العقود</CardTitle>
              <Percent className="h-4 w-4 text-purple-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">
                {summary?.totalContractAmount ? 
                  `${((( summary.totalPaidAmount) / summary.totalContractAmount) * 100).toFixed(1)}%`
                  : "0%"}
              </div>
              <p className="text-xs text-muted-foreground">
                متبقي: {formatAmount((summary?.totalContractAmount || 0) - (summary?.totalPaidAmount || 0))} ريال
              </p>
            </CardContent>
          </Card>
        </div>

        {/* التبويبات */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="print:hidden">
          <TabsList>
            <TabsTrigger value="overview">نظرة عامة</TabsTrigger>
            <TabsTrigger value="contracts">العقود ونسبة الصرف</TabsTrigger>
            <TabsTrigger value="byProject">حسب المشروع</TabsTrigger>
            <TabsTrigger value="byMonth">حسب الشهر</TabsTrigger>
            <TabsTrigger value="byFunding">حسب مصدر الدعم</TabsTrigger>
            <TabsTrigger value="orders">أوامر الصرف</TabsTrigger>
          </TabsList>

          {/* تبويب العقود ونسبة الصرف */}
          <TabsContent value="contracts">
            <Card>
              <CardHeader>
                <CardTitle>ملخص العقود ونسبة الصرف</CardTitle>
                <CardDescription>مقارنة قيمة العقود بالمبالغ المصروفة فعلياً</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>رقم العقد</TableHead>
                        <TableHead>عنوان العقد</TableHead>
                        <TableHead>المشروع</TableHead>
                        <TableHead>المورد / المقاول</TableHead>
                        <TableHead>قيمة العقد</TableHead>
                        <TableHead>المصروف</TableHead>
                        <TableHead>المتبقي</TableHead>
                        <TableHead>نسبة الصرف</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {reportData?.contractsSummary?.map((contract) => (
                        <TableRow key={contract.contractId}>
                          <TableCell className="font-mono text-sm">{contract.contractNumber}</TableCell>
                          <TableCell className="font-medium">{contract.contractTitle}</TableCell>
                          <TableCell>{contract.projectName || "-"}</TableCell>
                          <TableCell>{contract.supplierName || "-"}</TableCell>
                          <TableCell>{formatAmount(contract.contractAmount)} ريال</TableCell>
                          <TableCell className="text-green-600">{formatAmount(contract.totalPaid)} ريال</TableCell>
                          <TableCell className="text-orange-600">{formatAmount(contract.remainingAmount)} ريال</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div className="flex-1 bg-gray-200 rounded-full h-2 min-w-16">
                                <div
                                  className="bg-primary h-2 rounded-full"
                                  style={{ width: `${Math.min(contract.disbursementPercentage, 100)}%` }}
                                />
                              </div>
                              <span className="text-sm font-medium w-10">{contract.disbursementPercentage}%</span>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                      {(!reportData?.contractsSummary || reportData.contractsSummary.length === 0) && (
                        <TableRow>
                          <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                            لا توجد عقود مسجلة
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* نظرة عامة */}
          <TabsContent value="overview" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              {/* أعلى المشاريع إنفاقاً */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">أعلى المشاريع إنفاقاً</CardTitle>
                  <CardDescription>المشاريع الأكثر طلباً للصرف</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {reportData?.byProject?.slice(0, 5).map((project, index) => (
                      <div key={project.projectId} className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-sm font-medium">
                            {index + 1}
                          </span>
                          <div>
                            <p className="font-medium">{project.projectName}</p>
                            <p className="text-xs text-muted-foreground">{project.projectNumber}</p>
                          </div>
                        </div>
                        <div className="text-left">
                          <p className="font-medium">{formatAmount(Number(project.totalRequested))} ريال</p>
                          <p className="text-xs text-green-600">
                            مدفوع: {formatAmount(Number(project.totalPaid))} ريال
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* حالة أوامر الصرف */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">حالة أوامر الصرف</CardTitle>
                  <CardDescription>توزيع الأوامر حسب الحالة</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {reportData?.ordersByStatus?.map((item) => (
                      <div key={item.status} className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Badge className={STATUS_MAP[item.status || "draft"]?.color}>
                            {STATUS_MAP[item.status || "draft"]?.label}
                          </Badge>
                        </div>
                        <div className="text-left">
                          <p className="font-medium">{item.count} أمر</p>
                          <p className="text-xs text-muted-foreground">
                            {formatAmount(Number(item.totalAmount))} ريال
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* حسب المشروع */}
          <TabsContent value="byProject">
            <Card>
              <CardHeader>
                <CardTitle>المصروفات حسب المشروع</CardTitle>
                <CardDescription>تفصيل طلبات الصرف لكل مشروع</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>المشروع</TableHead>
                        <TableHead>رقم المشروع</TableHead>
                        <TableHead>عدد الطلبات المعتمدة</TableHead>
                        <TableHead>إجمالي المطلوب</TableHead>
                        <TableHead>إجمالي المدفوع</TableHead>
                        <TableHead>المتبقي</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {reportData?.byProject?.map((project) => (
                        <TableRow key={project.projectId}>
                          <TableCell className="font-medium">{project.projectName}</TableCell>
                          <TableCell>{project.projectNumber}</TableCell>
                          <TableCell>{project.approvedCount}</TableCell>
                          <TableCell>{formatAmount(Number(project.totalRequested))} ريال</TableCell>
                          <TableCell className="text-green-600">
                            {formatAmount(Number(project.totalPaid))} ريال
                          </TableCell>
                          <TableCell className="text-yellow-600">
                            {formatAmount(Number(project.totalRequested) - Number(project.totalPaid))} ريال
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* حسب الشهر */}
          <TabsContent value="byMonth">
            <Card>
              <CardHeader>
                <CardTitle>المصروفات حسب الشهر</CardTitle>
                <CardDescription>تفصيل طلبات الصرف الشهرية</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>الشهر</TableHead>
                        <TableHead>عدد الطلبات</TableHead>
                        <TableHead>إجمالي المطلوب</TableHead>
                        <TableHead>إجمالي المدفوع</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {reportData?.byMonth?.map((item) => (
                        <TableRow key={item.month}>
                          <TableCell className="font-medium">{item.month}</TableCell>
                          <TableCell>{item.requestCount}</TableCell>
                          <TableCell>{formatAmount(Number(item.totalRequested))} ريال</TableCell>
                          <TableCell className="text-green-600">
                            {formatAmount(Number(item.totalPaid))} ريال
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* حسب مصدر الدعم */}
          <TabsContent value="byFunding">
            <Card>
              <CardHeader>
                <CardTitle>المصروفات حسب مصدر الدعم</CardTitle>
                <CardDescription>تفصيل طلبات الصرف حسب الجهة الداعمة</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>مصدر الدعم</TableHead>
                        <TableHead>عدد الطلبات</TableHead>
                        <TableHead>إجمالي المطلوب</TableHead>
                        <TableHead>إجمالي المدفوع</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {reportData?.byFundingSource?.map((item, index) => (
                        <TableRow key={index}>
                          <TableCell className="font-medium">
                            {item.fundingSource || "غير محدد"}
                          </TableCell>
                          <TableCell>{item.requestCount}</TableCell>
                          <TableCell>{formatAmount(Number(item.totalRequested))} ريال</TableCell>
                          <TableCell className="text-green-600">
                            {formatAmount(Number(item.totalPaid))} ريال
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* أوامر الصرف */}
          <TabsContent value="orders">
            <Card>
              <CardHeader>
                <CardTitle>ملخص أوامر الصرف</CardTitle>
                <CardDescription>توزيع أوامر الصرف حسب الحالة</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>الحالة</TableHead>
                        <TableHead>عدد الأوامر</TableHead>
                        <TableHead>إجمالي المبالغ</TableHead>
                        <TableHead>النسبة</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {reportData?.ordersByStatus?.map((item) => (
                        <TableRow key={item.status}>
                          <TableCell>
                            <Badge className={STATUS_MAP[item.status || "draft"]?.color}>
                              {STATUS_MAP[item.status || "draft"]?.label}
                            </Badge>
                          </TableCell>
                          <TableCell>{item.count}</TableCell>
                          <TableCell>{formatAmount(Number(item.totalAmount))} ريال</TableCell>
                          <TableCell>
                            {summary?.totalOrderAmount ? 
                              `${((Number(item.totalAmount) / summary.totalOrderAmount) * 100).toFixed(1)}%` 
                              : "0%"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* قسم الطباعة */}
        <div className="hidden print:block space-y-6">
          {/* المصروفات حسب المشروع */}
          <div>
            <h2 className="text-lg font-bold mb-2">المصروفات حسب المشروع</h2>
            <table className="w-full border-collapse border text-sm">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border p-2 text-right">المشروع</th>
                  <th className="border p-2 text-right">إجمالي المطلوب</th>
                  <th className="border p-2 text-right">إجمالي المدفوع</th>
                </tr>
              </thead>
              <tbody>
                {reportData?.byProject?.map((project) => (
                  <tr key={project.projectId}>
                    <td className="border p-2">{project.projectName}</td>
                    <td className="border p-2">{formatAmount(Number(project.totalRequested))} ريال</td>
                    <td className="border p-2">{formatAmount(Number(project.totalPaid))} ريال</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* حالة أوامر الصرف */}
          <div>
            <h2 className="text-lg font-bold mb-2">حالة أوامر الصرف</h2>
            <table className="w-full border-collapse border text-sm">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border p-2 text-right">الحالة</th>
                  <th className="border p-2 text-right">العدد</th>
                  <th className="border p-2 text-right">المبلغ</th>
                </tr>
              </thead>
              <tbody>
                {reportData?.ordersByStatus?.map((item) => (
                  <tr key={item.status}>
                    <td className="border p-2">{STATUS_MAP[item.status || "draft"]?.label}</td>
                    <td className="border p-2">{item.count}</td>
                    <td className="border p-2">{formatAmount(Number(item.totalAmount))} ريال</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
