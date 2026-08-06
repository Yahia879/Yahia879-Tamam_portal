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
  Sparkles,
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

  // جلب قائمة المشاريع لااختيار مشروع من القائمة المنسدلة
  const { data: projectsList = [], isLoading: isLoadingProjects } = trpc.projects.getAll.useQuery({
    limit: 100,
  });

  // جلب كافة سندات القبض عبر جميع المشاريع
  const { data: allVouchers = [], isLoading: isLoadingVouchers } = trpc.projects.getAllReceiptVouchers.useQuery({
    projectId: selectedProjectId !== "all" ? parseInt(selectedProjectId) : undefined,
    status: statusFilter !== "all" ? statusFilter : undefined,
    search: searchQuery,
  });

  // حساب الإحصائيات العامة السريعة
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
      <div className="space-y-6 dir-rtl text-right p-2 sm:p-4">
        
        {/* الهيدر الرئيسي */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-gradient-to-r from-emerald-900/90 via-teal-900/90 to-slate-900 text-white p-6 rounded-2xl shadow-lg border border-emerald-700/30">
          <div className="space-y-1.5">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-emerald-500/20 rounded-xl border border-emerald-400/30 text-emerald-300">
                <Coins className="h-7 w-7" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                  سندات القبض
                  <Badge className="bg-emerald-500/30 text-emerald-200 border-emerald-400/30 font-normal text-xs px-2.5">
                    القسم المالي
                  </Badge>
                </h1>
                <p className="text-sm text-emerald-100/80">
                  إدارة وتوثيق سندات القبض والدفعات المقبوضة فعلياً من الجهات الداعمة للمشاريع
                </p>
              </div>
            </div>
          </div>

          {/* محدد المشروع المنسدل السريع */}
          <div className="w-full md:w-80 space-y-1">
            <label className="text-xs font-semibold text-emerald-200 block flex items-center gap-1.5">
              <FolderOpen className="h-3.5 w-3.5" />
              اختر المشروع للتصفية والمعاينة:
            </label>
            <Select value={selectedProjectId} onValueChange={handleSelectProject}>
              <SelectTrigger className="bg-white/10 text-white border-emerald-400/30 hover:bg-white/20 transition-colors h-10 font-medium">
                <SelectValue placeholder="اختر مشروعاً..." />
              </SelectTrigger>
              <SelectContent dir="rtl" className="max-h-72">
                <SelectItem value="all" className="font-bold text-emerald-800">
                  🌐 جميع المشاريع (عرض كشف عام)
                </SelectItem>
                {projectsList.map((p) => (
                  <SelectItem key={p.id} value={p.id.toString()}>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-muted-foreground">{p.projectNumber}</span>
                      <span className="font-semibold">{p.name}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* عرض تفاصيل المشروع المحدد إن كان هناك مشروع مختار */}
        {selectedProjectId !== "all" ? (
          <div className="space-y-6">
            
            {/* شريط العودة ورأس المشروع المحدد */}
            <Card className="border-emerald-200 bg-emerald-50/30">
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
                    الانتقال لتفاصيل المشروع الكاملة
                  </Button>
                )}
              </CardContent>
            </Card>

            {/* تضمين مكون سندات القبض للمشروع المختار */}
            <ProjectFinancialsTab projectId={parseInt(selectedProjectId)} />

          </div>
        ) : (
          /* عرض الكشف العام لجميع سندات القبض والمشاريع */
          <div className="space-y-6">
            
            {/* كروت الإحصائيات العامة */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Card className="border-slate-200 bg-white shadow-2xs">
                <CardContent className="p-4 flex items-center justify-between">
                  <div>
                    <span className="text-xs text-muted-foreground block font-medium">إجمالي المقبوضات المسجلة</span>
                    <span className="text-2xl font-bold text-emerald-700 mt-1 block">
                      {totalAmountReceived.toLocaleString("ar-SA", { minimumFractionDigits: 2 })} <span className="text-xs font-normal text-muted-foreground">ريال</span>
                    </span>
                  </div>
                  <div className="p-3 bg-emerald-50 rounded-xl text-emerald-600">
                    <Coins className="h-6 w-6" />
                  </div>
                </CardContent>
              </Card>

              <Card className="border-slate-200 bg-white shadow-2xs">
                <CardContent className="p-4 flex items-center justify-between">
                  <div>
                    <span className="text-xs text-muted-foreground block font-medium">سندات معتمدة</span>
                    <span className="text-2xl font-bold text-blue-700 mt-1 block">
                      {totalApprovedCount} <span className="text-xs font-normal text-muted-foreground">سند</span>
                    </span>
                  </div>
                  <div className="p-3 bg-blue-50 rounded-xl text-blue-600">
                    <CheckCircle className="h-6 w-6" />
                  </div>
                </CardContent>
              </Card>

              <Card className="border-slate-200 bg-white shadow-2xs">
                <CardContent className="p-4 flex items-center justify-between">
                  <div>
                    <span className="text-xs text-muted-foreground block font-medium">سندات قيد الاعتماد</span>
                    <span className="text-2xl font-bold text-amber-700 mt-1 block">
                      {totalPendingCount} <span className="text-xs font-normal text-muted-foreground">سند</span>
                    </span>
                  </div>
                  <div className="p-3 bg-amber-50 rounded-xl text-amber-600">
                    <Clock className="h-6 w-6" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* كروت المشاريع السريعة للاختيار */}
            <Card className="border-slate-200 shadow-2xs">
              <CardHeader className="pb-3 border-b bg-slate-50/50">
                <CardTitle className="text-base font-bold flex items-center gap-2 text-slate-800">
                  <Building2 className="h-5 w-5 text-primary" />
                  اختر مشروعاً لمعاينة وتأكيد سندات القبض الخاصة به
                </CardTitle>
                <CardDescription className="text-xs">
                  يمكنك النقر على أي مشروع أدناه لفتح التاب المالي وسندات القبض المخصصة له مباشرة
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-4">
                {isLoadingProjects ? (
                  <div className="flex items-center justify-center py-8 gap-2 text-muted-foreground text-sm">
                    <Loader2 className="h-5 w-5 animate-spin text-primary" />
                    جاري تحميل المشاريع...
                  </div>
                ) : projectsList.length === 0 ? (
                  <p className="text-center py-6 text-xs text-muted-foreground">لا توجد مشاريع مسجلة حالياً</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                    {projectsList.map((p) => (
                      <button
                        key={p.id}
                        onClick={() => handleSelectProject(p.id.toString())}
                        className="p-3 bg-white border border-slate-200 hover:border-emerald-500 hover:shadow-xs rounded-xl text-right transition-all group flex flex-col justify-between space-y-2 cursor-pointer"
                      >
                        <div className="space-y-1">
                          <span className="font-mono text-[11px] text-muted-foreground font-semibold bg-slate-100 px-2 py-0.5 rounded-md inline-block">
                            {p.projectNumber}
                          </span>
                          <h4 className="text-xs font-bold text-slate-900 group-hover:text-emerald-700 transition-colors line-clamp-1">
                            {p.name}
                          </h4>
                        </div>
                        <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-[11px] text-slate-500">
                          <span>عرض سندات القبض</span>
                          <ArrowRight className="h-3.5 w-3.5 text-emerald-600 group-hover:translate-x-[-2px] transition-transform" />
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* جدول كافة سندات القبض بكل المشاريع */}
            <Card className="border-slate-200 shadow-2xs">
              <CardHeader className="pb-3 border-b bg-slate-50/50 flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-base font-bold flex items-center gap-2 text-slate-900">
                    <Receipt className="h-5 w-5 text-emerald-600" />
                    سجل كافة سندات القبض ({allVouchers.length})
                  </CardTitle>
                  <CardDescription className="text-xs mt-0.5">
                    جدول مجمع لجميع سندات القبض المسجلة في النظام عبر كافة المشاريع
                  </CardDescription>
                </div>

                {/* أدوات البحث والفلترة */}
                <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
                  <div className="relative flex-1 md:w-64">
                    <Search className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="بحث برقم السند، الداعم، اسم المشروع..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pr-9 h-9 text-xs"
                    />
                  </div>

                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-36 h-9 text-xs">
                      <SelectValue placeholder="الحالة" />
                    </SelectTrigger>
                    <SelectContent dir="rtl">
                      <SelectItem value="all">كل الحالات</SelectItem>
                      <SelectItem value="approved">معتمد</SelectItem>
                      <SelectItem value="pending_approval">قيد الاعتماد</SelectItem>
                      <SelectItem value="approval_revoked">ملغى الاعتماد</SelectItem>
                      <SelectItem value="rejected">مرفوض</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
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
                    <p className="text-xs text-muted-foreground">اختر مشروعاً أعلاه لتسجيل سند قبض جديد</p>
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

          </div>
        )}

      </div>
    </DashboardLayout>
  );
}
