import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { trpc } from "@/lib/trpc";
import {
  Coins,
  Receipt,
  Building2,
  Search,
  Eye,
  CheckCircle,
  Clock,
  RotateCcw,
  XCircle,
  FolderOpen,
  ArrowRight,
  Loader2,
  Printer,
  Filter,
} from "lucide-react";
import ProjectFinancialsTab from "@/components/ProjectFinancialsTab";

export default function ReceiptVouchers() {
  const [, navigate] = useLocation();

  // الحصول على البارامترات من URL إن وجدت
  const urlParams = new URLSearchParams(window.location.search);
  const initialProjectId = urlParams.get("projectId") || "all";

  const [selectedProjectId, setSelectedProjectId] = useState<string>(initialProjectId);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // تحديث حالة المشروع عند تغير البارامتر بالرابط
  useEffect(() => {
    const pId = urlParams.get("projectId");
    if (pId) {
      setSelectedProjectId(pId);
    }
  }, [window.location.search]);

  // جلب قائمة المشاريع للاختيار من القائمة المنسدلة
  const { data: projectsList = [] } = trpc.projects.getAll.useQuery({
    limit: 200,
  });

  // جلب سندات القبض مع الفلترة
  const { data: allVouchers = [], isLoading: isLoadingVouchers } = trpc.projects.getAllReceiptVouchers.useQuery({
    projectId: selectedProjectId !== "all" ? parseInt(selectedProjectId) : undefined,
    status: statusFilter !== "all" ? statusFilter : undefined,
    search: searchQuery,
  });

  // حساب الإحصائيات السريعة
  const totalAmountReceived = allVouchers
    .filter(v => v.status === "approved" || v.status === "pending_approval")
    .reduce((sum, v) => sum + parseFloat((v.amount || "0").toString()), 0);
  const totalApprovedCount = allVouchers.filter(v => v.status === "approved").length;
  const totalPendingCount = allVouchers.filter(v => v.status === "pending_approval").length;

  const currentProject = projectsList.find(p => p.id.toString() === selectedProjectId);

  const handleSelectProject = (val: string) => {
    setSelectedProjectId(val);
    const newUrl = val === "all" ? "/receipt-vouchers" : `/receipt-vouchers?projectId=${val}`;
    window.history.replaceState(null, "", newUrl);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 dir-rtl text-right p-4 sm:p-6">
        
        {/* هيدر الصفحة القياسي والمبسط */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              <Coins className="h-6 w-6 text-primary" />
              سندات القبض
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              إدارة وتوثيق سندات القبض والدفعات المقبوضة فعلياً من الجهات الداعمة
            </p>
          </div>
        </div>

        {/* شريط البحث والفلترة القياسي */}
        <Card className="border-slate-200 shadow-2xs">
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row items-center gap-3">
              
              {/* حقل البحث */}
              <div className="relative flex-1 w-full">
                <Search className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="بحث برقم السند، الجهة الداعمة، اسم المشروع..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pr-9 h-10 text-xs bg-white"
                />
              </div>

              {/* منسدلة اختيار المشروع */}
              <div className="w-full md:w-72">
                <Select value={selectedProjectId} onValueChange={handleSelectProject}>
                  <SelectTrigger className="h-10 text-xs bg-white border-slate-200">
                    <div className="flex items-center gap-2 truncate">
                      <FolderOpen className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <SelectValue placeholder="اختر المشروع..." />
                    </div>
                  </SelectTrigger>
                  <SelectContent dir="rtl" className="max-h-72">
                    <SelectItem value="all" className="font-bold">
                      🌐 جميع المشاريع
                    </SelectItem>
                    {projectsList.map((p) => (
                      <SelectItem key={p.id} value={p.id.toString()}>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[11px] text-muted-foreground">{p.projectNumber}</span>
                          <span className="font-medium truncate">{p.name}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* منسدلة فلترة الحالة */}
              <div className="w-full md:w-44">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="h-10 text-xs bg-white border-slate-200">
                    <div className="flex items-center gap-2">
                      <Filter className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <SelectValue placeholder="الحالة" />
                    </div>
                  </SelectTrigger>
                  <SelectContent dir="rtl">
                    <SelectItem value="all">جميع الحالات</SelectItem>
                    <SelectItem value="approved">معتمد</SelectItem>
                    <SelectItem value="pending_approval">قيد الاعتماد</SelectItem>
                    <SelectItem value="approval_revoked">ملغى الاعتماد</SelectItem>
                    <SelectItem value="rejected">مرفوض</SelectItem>
                  </SelectContent>
                </Select>
              </div>

            </div>
          </CardContent>
        </Card>

        {/* إحصائيات سريعة ملخصة */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between">
            <div>
              <span className="text-xs text-muted-foreground block font-medium">إجمالي المقبوضات المعروضة</span>
              <span className="text-xl font-bold text-emerald-700 mt-0.5 block">
                {totalAmountReceived.toLocaleString("ar-SA", { minimumFractionDigits: 2 })} <span className="text-xs font-normal text-muted-foreground">ريال</span>
              </span>
            </div>
            <div className="p-2.5 bg-emerald-50 rounded-lg text-emerald-600">
              <Coins className="h-5 w-5" />
            </div>
          </div>

          <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between">
            <div>
              <span className="text-xs text-muted-foreground block font-medium">سندات معتمدة</span>
              <span className="text-xl font-bold text-blue-700 mt-0.5 block">
                {totalApprovedCount} <span className="text-xs font-normal text-muted-foreground">سند</span>
              </span>
            </div>
            <div className="p-2.5 bg-blue-50 rounded-lg text-blue-600">
              <CheckCircle className="h-5 w-5" />
            </div>
          </div>

          <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between">
            <div>
              <span className="text-xs text-muted-foreground block font-medium">سندات قيد الاعتماد</span>
              <span className="text-xl font-bold text-amber-700 mt-0.5 block">
                {totalPendingCount} <span className="text-xs font-normal text-muted-foreground">سند</span>
              </span>
            </div>
            <div className="p-2.5 bg-amber-50 rounded-lg text-amber-600">
              <Clock className="h-5 w-5" />
            </div>
          </div>
        </div>

        {/* عرض المحتوى: عند اختيار مشروع محدد */}
        {selectedProjectId !== "all" ? (
          <div className="space-y-6">
            
            {/* شريط معلومات المشروع المحدد */}
            <Card className="border-emerald-200 bg-emerald-50/40">
              <CardContent className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleSelectProject("all")}
                    className="gap-1.5 text-xs font-bold border-emerald-300 hover:bg-emerald-100"
                  >
                    <ArrowRight className="h-4 w-4" />
                    عرض جميع المشاريع
                  </Button>
                  <div>
                    <h2 className="text-base font-bold text-emerald-950 flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-emerald-700" />
                      مشروع: {currentProject?.name || `مشروع #${selectedProjectId}`}
                    </h2>
                    <p className="text-xs text-muted-foreground font-mono">
                      رقم المشروع: {currentProject?.projectNumber || selectedProjectId}
                    </p>
                  </div>
                </div>

                {currentProject && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate(`/projects/${selectedProjectId}`)}
                    className="text-xs text-primary font-bold hover:bg-white border gap-1"
                  >
                    <Eye className="h-3.5 w-3.5" />
                    تفاصيل المشروع
                  </Button>
                )}
              </CardContent>
            </Card>

            {/* عرض التاب المالي وسندات القبض الخاصة بالمشروع */}
            <ProjectFinancialsTab projectId={parseInt(selectedProjectId)} />

          </div>
        ) : (
          /* عرض كشف سندات القبض لجميع المشاريع عند عدم اختيار مشروع */
          <Card className="border-slate-200 shadow-2xs">
            <CardHeader className="pb-3 border-b bg-slate-50/50">
              <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Receipt className="h-5 w-5 text-emerald-600" />
                سجل كافة سندات القبض ({allVouchers.length})
              </CardTitle>
              <CardDescription className="text-xs">
                جدول مجمع لجميع سندات القبض المسجلة في النظام. اختر مشروعاً من القائمة أعلاه لتسجيل أو تعديل سندات مشروع محدد.
              </CardDescription>
            </CardHeader>

            <CardContent className="p-0">
              {isLoadingVouchers ? (
                <div className="flex items-center justify-center py-12 gap-2 text-muted-foreground text-sm">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  جاري تحميل سندات القبض...
                </div>
              ) : allVouchers.length === 0 ? (
                <div className="text-center py-12 space-y-2">
                  <Receipt className="h-10 w-10 mx-auto text-muted-foreground/30" />
                  <p className="text-sm font-semibold text-slate-700">لم يتم العثور على أي سندات قبض</p>
                  <p className="text-xs text-muted-foreground">اختر مشروعاً من الفلتر أعلاه لتسجيل سند قبض جديد</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table dir="rtl">
                    <TableHeader className="bg-slate-50">
                      <TableRow>
                        <TableHead className="text-right text-xs font-bold">رقم السند</TableHead>
                        <TableHead className="text-right text-xs font-bold">المشروع</TableHead>
                        <TableHead className="text-right text-xs font-bold">تاريخ القبض</TableHead>
                        <TableHead className="text-right text-xs font-bold">الجهة الداعمة (المسدد)</TableHead>
                        <TableHead className="text-right text-xs font-bold">المبلغ المقبوض</TableHead>
                        <TableHead className="text-right text-xs font-bold">البيان / ملاحظات</TableHead>
                        <TableHead className="text-center text-xs font-bold">الحالة</TableHead>
                        <TableHead className="text-center text-xs font-bold">الإجراءات</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {allVouchers.map((voucher) => (
                        <TableRow key={voucher.id} className="hover:bg-slate-50/70">
                          <TableCell className="font-bold text-primary text-xs font-mono">
                            {voucher.voucherNumber}
                          </TableCell>

                          <TableCell className="text-xs">
                            <button
                              onClick={() => handleSelectProject(voucher.projectId.toString())}
                              className="text-right hover:text-emerald-700 transition-colors font-medium group cursor-pointer block"
                            >
                              <span className="font-bold text-slate-800 block line-clamp-1 group-hover:underline">
                                {voucher.projectName || `مشروع #${voucher.projectId}`}
                              </span>
                              {voucher.projectNumber && (
                                <span className="text-[10px] text-muted-foreground font-mono block">
                                  {voucher.projectNumber}
                                </span>
                              )}
                            </button>
                          </TableCell>

                          <TableCell className="text-xs font-mono">
                            {voucher.receiptDate
                              ? new Date(voucher.receiptDate).toLocaleDateString("ar-SA")
                              : "-"}
                          </TableCell>

                          <TableCell className="text-xs font-semibold text-slate-800">
                            <Badge variant="outline" className="bg-blue-50 text-blue-900 border-blue-200 text-[11px] font-semibold">
                              {voucher.payerName || "جهة غير محددة"}
                            </Badge>
                          </TableCell>

                          <TableCell className="font-bold text-emerald-700 text-xs">
                            {parseFloat(voucher.amount.toString()).toLocaleString("ar-SA", { minimumFractionDigits: 2 })} ريال
                          </TableCell>

                          <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate" title={voucher.notes || "-"}>
                            {voucher.notes || "-"}
                          </TableCell>

                          <TableCell className="text-center text-xs">
                            {voucher.status === "approved" ? (
                              <Badge variant="outline" className="bg-emerald-50 text-emerald-800 border-emerald-300 font-bold text-[10px] px-2 py-0.5">
                                معتمد
                              </Badge>
                            ) : voucher.status === "approval_revoked" ? (
                              <Badge variant="outline" className="bg-amber-50 text-amber-900 border-amber-300 font-bold text-[10px] px-2 py-0.5 gap-1 inline-flex items-center">
                                <RotateCcw className="h-3 w-3 text-amber-600" />
                                ملغى الاعتماد
                              </Badge>
                            ) : voucher.status === "rejected" ? (
                              <Badge variant="outline" className="bg-rose-50 text-rose-800 border-rose-300 font-bold text-[10px] px-2 py-0.5">
                                مرفوض
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="bg-blue-50 text-blue-800 border-blue-300 font-bold text-[10px] px-2 py-0.5">
                                قيد الاعتماد
                              </Badge>
                            )}
                          </TableCell>

                          <TableCell className="text-center">
                            <div className="flex items-center justify-center gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleSelectProject(voucher.projectId.toString())}
                                className="h-7 px-2 text-[11px] text-emerald-700 hover:bg-emerald-50 font-bold gap-1"
                                title="إدارة وتفاصيل سندات المشروع"
                              >
                                <Eye className="h-3.5 w-3.5" />
                                إدارة السندات
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => navigate(`/receipt-vouchers/${voucher.id}/print`)}
                                className="h-7 w-7 text-slate-600 hover:text-emerald-800 hover:bg-emerald-50"
                                title="معاينة وطباعة سند القبض"
                              >
                                <Printer className="h-3.5 w-3.5" />
                              </Button>
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
        )}

      </div>
    </DashboardLayout>
  );
}
