import { useState, useMemo, useEffect } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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
  DialogHeader,
  DialogTitle,
  DialogDescription,
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Eye,
  CheckCircle,
  Clock,
  HeartHandshake,
  Search,
  Printer,
  Download,
  Building2,
  ChevronLeft,
  ChevronRight,
  Package,
  FileText,
  Loader2,
  X,
  Landmark,
  ArrowRight,
  Plus,
  RotateCcw,
  Coins,
  MoreVertical,
} from "lucide-react";
import { toast } from "sonner";
import { exportStyledExcel } from "@/lib/excelExportHelper";
import { useDocumentTitle } from "@/contexts/DocumentTitleContext";

const STATUS_MAP: Record<string, { label: string; className: string }> = {
  approved: {
    label: "معتمد",
    className: "border-emerald-300 text-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800",
  },
  ready: {
    label: "معتمد",
    className: "border-emerald-300 text-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800",
  },
  draft: {
    label: "مسودة",
    className: "border-amber-300 text-amber-800 bg-amber-50 dark:bg-amber-950/30 dark:text-amber-300 dark:border-amber-800",
  },
};

export default function CsrLettersList() {
  useDocumentTitle("خطابات المسؤولية المجتمعية - سدانة");
  const { user } = useAuth();
  const [, navigate] = useLocation();

  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const limit = 10;

  const [isExporting, setIsExporting] = useState(false);

  // Debounce للبحث
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setCurrentPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const utils = trpc.useUtils();

  // الخطاب المحدد لعرض تفاصيل أصنافه
  const [selectedLetterForItems, setSelectedLetterForItems] = useState<any | null>(null);

  // استعلام خطابات المسؤولية المجتمعية
  const {
    data: lettersData,
    isLoading,
    isFetching,
    refetch,
  } = trpc.procurement.listCsrLetters.useQuery({
    search: debouncedSearch || undefined,
    status: statusFilter !== "all" ? statusFilter : undefined,
    page: currentPage,
    limit,
  });

  // اعتماد سريع لخطاب المسؤولية المجتمعية
  const approveLetterMutation = trpc.procurement.approveCsrLetter.useMutation({
    onSuccess: (res) => {
      toast.success(res.message || "تم اعتماد خطاب المسؤولية المجتمعية بنجاح");
      refetch();
    },
    onError: (err) => {
      toast.error(err.message || "حدث خطأ أثناء اعتماد الخطاب");
    },
  });

  // جلب إعدادات الجمعية
  const { data: orgSettings } = trpc.organization.getSettings.useQuery();

  const letters = lettersData?.letters || [];
  const total = lettersData?.total || 0;
  const stats = lettersData?.stats || {
    totalLetters: 0,
    approvedCount: 0,
    draftCount: 0,
    totalRecipients: 0,
    totalItemsCount: 0,
    totalMosquesCount: 0,
  };

  const totalPages = Math.max(1, Math.ceil(total / limit));

  // تصدير البيانات إلى Excel
  const handleExportExcel = async () => {
    try {
      setIsExporting(true);
      const allMatching = await utils.procurement.listCsrLetters.fetch({
        search: debouncedSearch || undefined,
        status: statusFilter !== "all" ? statusFilter : undefined,
        page: 1,
        limit: 10000,
      });
      const exportLetters = allMatching?.letters || letters;
      if (exportLetters.length === 0) {
        toast.info("لا توجد بيانات لتصديرها");
        return;
      }

      const columns = [
        { header: "رقم الخطاب", align: "center" as const, minWidth: 18 },
        { header: "رقم الطلب", align: "center" as const, minWidth: 14 },
        { header: "المسجد المستفيد", align: "right" as const, minWidth: 26 },
        { header: "المدينة", align: "center" as const, minWidth: 16 },
        { header: "تاريخ الخطاب", align: "center" as const, minWidth: 16 },
        { header: "الموجه إليه", align: "right" as const, minWidth: 28 },
        { header: "المفوض بالتوقيع", align: "right" as const, minWidth: 22 },
        { header: "عدد الأصناف", align: "center" as const, minWidth: 14 },
        { header: "الحالة", align: "center" as const, minWidth: 18 },
      ];

      const rows = exportLetters.map((l) => [
        l.letterNumber || "",
        `#${l.requestNumber}`,
        l.mosqueName || "",
        l.mosqueCity || "",
        l.letterDate || "",
        `${l.salutation || "السادة"} / ${l.recipientName || ""} ${l.honorific || "المحترمون"}`,
        l.signatoryName || "",
        l.itemsCount || 0,
        STATUS_MAP[l.status]?.label || l.status || "",
      ]);

      await exportStyledExcel({
        sheetName: "خطابات المسؤولية المجتمعية",
        columns,
        rows,
        fileName: `CSR_Letters_${new Date().toISOString().split("T")[0]}.xlsx`,
      });

      toast.success("تم تصدير ملف الإكسيل بنجاح");
    } catch (e) {
      console.error("Export error:", e);
      toast.error("حدث خطأ أثناء تصدير الملف");
    } finally {
      setIsExporting(false);
    }
  };

  const orgName = orgSettings?.officialReportsName || orgSettings?.organizationName || "جمعية عمارة المساجد";



  return (
    <DashboardLayout>
      <div className="space-y-6 text-right font-sans" dir="rtl">
        {/* العنوان والإجراءات العلوية */}
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300">
                <HeartHandshake className="w-5 h-5" />
              </div>
              <h1 className="text-xl sm:text-2xl font-bold text-foreground">خطابات المسؤولية المجتمعية</h1>
              <Badge variant="outline" className="text-sky-700 bg-sky-50 dark:bg-sky-950/40 border-sky-200 dark:border-sky-800 text-xs">
                برنامج سدانة
              </Badge>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">
              إدارة واستعراض وطباعة الخطابات الرسمية الموجهة للشركات والجهات المانحة لتأمين احتياجات المساجد
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Button
              size="sm"
              variant="outline"
              onClick={() => refetch()}
              disabled={isFetching}
              className="text-xs font-bold gap-1.5 border-border hover:bg-muted cursor-pointer"
              title="تحديث البيانات"
            >
              <RotateCcw className={`w-3.5 h-3.5 ${isFetching ? "animate-spin text-sky-600" : ""}`} />
              <span>تحديث</span>
            </Button>
            <Button
              size="sm"
              onClick={() => navigate("/csr-letters/new")}
              className="text-xs font-bold gap-1.5 bg-sky-600 hover:bg-sky-700 text-white shadow-xs cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>إضافة خطاب مسؤولية مجتمعية جديد</span>
            </Button>
          </div>
        </div>

        {/* بطاقات الإحصائيات العلوية الـ 5 الأنيقة */}
        <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
          {/* إجمالي الخطابات */}
          <Card className="border border-border/80 shadow-2xs hover:shadow-xs transition-shadow">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-[11px] font-semibold text-muted-foreground">إجمالي الخطابات</p>
                <p className="text-xl font-extrabold text-foreground mt-0.5">{stats.totalLetters}</p>
              </div>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-sky-50 dark:bg-sky-950/40 text-sky-600 border border-sky-100 dark:border-sky-900/50">
                <HeartHandshake className="w-5 h-5" />
              </div>
            </CardContent>
          </Card>

          {/* خطابات معتمدة */}
          <Card className="border border-border/80 shadow-2xs hover:shadow-xs transition-shadow">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-[11px] font-semibold text-muted-foreground">معتمدة</p>
                <p className="text-xl font-extrabold text-emerald-700 dark:text-emerald-300 mt-0.5">{stats.approvedCount}</p>
              </div>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 border border-emerald-100 dark:border-emerald-900/50">
                <CheckCircle className="w-5 h-5" />
              </div>
            </CardContent>
          </Card>

          {/* مسودة */}
          <Card className="border border-border/80 shadow-2xs hover:shadow-xs transition-shadow">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-[11px] font-semibold text-muted-foreground">مسودة</p>
                <p className="text-xl font-extrabold text-amber-700 dark:text-amber-400 mt-0.5">{stats.draftCount}</p>
              </div>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-amber-50 dark:bg-amber-950/30 text-amber-600 border border-amber-100 dark:border-amber-900/50">
                <Clock className="w-5 h-5" />
              </div>
            </CardContent>
          </Card>

          {/* الشركاء والجهات المانحة */}
          <Card className="border border-border/80 shadow-2xs hover:shadow-xs transition-shadow">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-[11px] font-semibold text-muted-foreground">الشركاء والجهات المستهدفة</p>
                <p className="text-xl font-extrabold text-foreground mt-0.5">{stats.totalRecipients} <span className="text-xs font-normal text-muted-foreground">جهة</span></p>
              </div>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                <Building2 className="w-5 h-5" />
              </div>
            </CardContent>
          </Card>

          {/* المساجد المستفيدة */}
          <Card className="col-span-2 sm:col-span-1 border border-border/80 shadow-2xs hover:shadow-xs transition-shadow">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-[11px] font-semibold text-muted-foreground">المساجد المستفيدة</p>
                <p className="text-xl font-extrabold text-foreground mt-0.5">{stats.totalMosquesCount} <span className="text-xs font-normal text-muted-foreground">مسجد</span></p>
              </div>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-sky-50 dark:bg-sky-950/40 text-sky-600 border border-sky-100 dark:border-sky-900/50">
                <Landmark className="w-5 h-5" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* شريط البحث والتصفية */}
        <Card className="border border-border/80 shadow-2xs">
          <CardContent className="p-3 sm:p-4">
            <div className="flex flex-col sm:flex-row items-center gap-3">
              <div className="relative flex-1 w-full">
                <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="البحث برقم الخطاب، اسم الجهة أو الشركة، التسمية التوضيحية، رقم الطلب، المسجد..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                  }}
                  className="pr-9 pl-9 h-9 text-xs"
                />
                {searchTerm && (
                  <button
                    type="button"
                    onClick={() => setSearchTerm("")}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-0.5 rounded"
                    title="مسح البحث"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <div className="w-full sm:w-56">
                <Select
                  value={statusFilter}
                  onValueChange={(val) => {
                    setStatusFilter(val);
                    setCurrentPage(1);
                  }}
                >
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="تصفية حسب الحالة" />
                  </SelectTrigger>
                  <SelectContent dir="rtl">
                    <SelectItem value="all">كافة الحالات</SelectItem>
                    <SelectItem value="approved">معتمد</SelectItem>
                    <SelectItem value="draft">مسودة</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* جدول خطابات المسؤولية المجتمعية */}
        <Card className="border border-border/80 shadow-2xs overflow-hidden">
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-12 flex flex-col items-center justify-center gap-3 text-center">
                <Loader2 className="w-8 h-8 animate-spin text-sky-600" />
                <p className="text-xs text-muted-foreground">جاري تحميل خطابات المسؤولية المجتمعية...</p>
              </div>
            ) : letters.length === 0 ? (
              <div className="p-12 flex flex-col items-center justify-center gap-2 text-center text-muted-foreground">
                <HeartHandshake className="w-10 h-10 text-muted-foreground/40 stroke-1" />
                <p className="text-sm font-bold text-foreground">لا توجد خطابات مطابقة</p>
                <p className="text-xs max-w-sm">
                  {searchTerm || statusFilter !== "all"
                    ? "لم نجد نتائج تطابق خيارات البحث والتصفية المحددة."
                    : "لم يتم إصدار أي خطابات مسؤولية مجتمعية بعد. يمكنك تخصيص بنود الطلبات من صفحة تأمين الطلب والتعاقد."}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table className="text-xs text-right">
                  <TableHeader className="bg-muted/30">
                    <TableRow className="hover:bg-transparent border-b">
                      <th className="p-3 w-12 text-center font-bold">#</th>
                      <th className="p-3 font-bold">رقم الخطاب</th>
                      <th className="p-3 font-bold">الطلب</th>
                      <th className="p-3 font-bold text-center">الأصناف المطلوبة</th>
                      <th className="p-3 font-bold text-center">الحالة</th>
                      <th className="p-3 font-bold text-center">أمر الصرف</th>
                      <th className="p-3 font-bold text-center">تاريخ الخطاب</th>
                      <th className="p-3 font-bold text-center w-16">الإجراءات</th>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="divide-y divide-border">
                    {letters.map((letter, idx) => {
                      const statusInfo = STATUS_MAP[letter.status] || STATUS_MAP.approved;
                      return (
                        <TableRow key={letter.id} className="hover:bg-muted/10 transition-colors">
                          <td className="p-3 text-center font-mono text-muted-foreground">
                            {(currentPage - 1) * limit + idx + 1}
                          </td>

                          {/* رقم الخطاب */}
                          <td className="p-3">
                            <span className="font-mono font-bold text-foreground bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded border border-border">
                              {letter.letterNumber}
                            </span>
                          </td>

                          {/* الطلب */}
                          <td className="p-3">
                            <div className="space-y-0.5">
                              <p className="font-bold text-foreground">
                                {letter.descriptiveName || `#${letter.requestNumber}`}
                              </p>
                              {letter.descriptiveName && (
                                <p className="text-[11px] text-muted-foreground font-mono">
                                  #{letter.requestNumber}
                                </p>
                              )}
                            </div>
                          </td>

                          {/* الأصناف المطلوبة */}
                          <td className="p-3 text-center">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setSelectedLetterForItems(letter)}
                              className="h-7 text-xs font-bold gap-1 text-sky-700 dark:text-sky-300 hover:bg-sky-50 dark:hover:bg-sky-950/40 px-2"
                            >
                              <Package className="w-3.5 h-3.5" />
                              <span>{letter.itemsCount} أصناف</span>
                            </Button>
                          </td>

                          {/* الحالة */}
                          <td className="p-3 text-center">
                            <Badge variant="outline" className={`text-[10px] font-bold px-2 py-0.5 ${statusInfo.className}`}>
                              {statusInfo.label}
                            </Badge>
                          </td>

                          {/* أمر الصرف المرتبط */}
                          <td className="p-3 text-center">
                            {letter.disbursementOrder ? (
                              <div className="space-y-0.5">
                                <Badge
                                  variant="outline"
                                  className={`text-[10px] font-bold px-2 py-0.5 ${
                                    letter.disbursementOrder.status === "executed"
                                      ? "border-emerald-500 text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40"
                                      : letter.disbursementOrder.status === "approved"
                                      ? "border-blue-500 text-blue-700 bg-blue-50 dark:bg-blue-950/40"
                                      : "border-amber-500 text-amber-700 bg-amber-50 dark:bg-amber-950/40"
                                  }`}
                                >
                                  {letter.disbursementOrder.status === "executed"
                                    ? "منفّذ"
                                    : letter.disbursementOrder.status === "approved"
                                    ? "معتمد"
                                    : "قيد المراجعة"}
                                </Badge>
                                <div className="text-[10px] font-mono text-muted-foreground">
                                  #{letter.disbursementOrder.orderNumber}
                                </div>
                              </div>
                            ) : letter.status === "approved" ? (
                              <Badge variant="outline" className="text-[10px] text-muted-foreground border-dashed">
                                لم يصدر بعد
                              </Badge>
                            ) : (
                              <span className="text-[11px] text-muted-foreground">-</span>
                            )}
                          </td>

                          {/* تاريخ الخطاب */}
                          <td className="p-3 text-center font-mono text-muted-foreground">
                            {letter.letterDate || "-"}
                          </td>

                          {/* الإجراءات عبر قائمة 3 نقاط */}
                          <td className="p-3 text-center">
                            <DropdownMenu dir="rtl">
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 rounded-full hover:bg-muted shrink-0"
                                  title="خيارات إضافية"
                                >
                                  <MoreVertical className="h-4 w-4 text-muted-foreground" />
                                  <span className="sr-only">قائمة الإجراءات</span>
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-56 text-right font-sans">
                                {/* معاينة وطباعة الخطاب الرسمي */}
                                <DropdownMenuItem
                                  onClick={() => navigate(`/requests/${letter.requestId}/csr-letter?letterNumber=${encodeURIComponent(letter.letterNumber)}`)}
                                  className="cursor-pointer flex items-center justify-start gap-2 py-2 text-xs"
                                >
                                  <Eye className="w-4 h-4 text-sky-600 shrink-0" />
                                  <span>معاينة وطباعة الخطاب الرسمي</span>
                                </DropdownMenuItem>

                                {/* استعراض الأصناف المطلوبة */}
                                <DropdownMenuItem
                                  onClick={() => setSelectedLetterForItems(letter)}
                                  className="cursor-pointer flex items-center justify-start gap-2 py-2 text-xs"
                                >
                                  <Package className="w-4 h-4 text-indigo-600 shrink-0" />
                                  <span>عرض الأصناف المطلوبة ({letter.itemsCount})</span>
                                </DropdownMenuItem>

                                {/* اعتماد خطاب المسؤولية المجتمعية فورياً إن كان مسودة */}
                                {letter.status === "draft" && (
                                  <>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                      onClick={() => {
                                        approveLetterMutation.mutate({
                                          requestId: letter.requestId,
                                          letterNumber: letter.letterNumber,
                                        });
                                      }}
                                      disabled={approveLetterMutation.isPending}
                                      className="cursor-pointer flex items-center justify-start gap-2 py-2 text-xs font-bold text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
                                    >
                                      <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                                      <span>اعتماد الخطاب فورياً</span>
                                    </DropdownMenuItem>
                                  </>
                                )}

                                {/* إنشاء أمر صرف لخطاب المسؤولية المجتمعية المعتمد */}
                                {letter.status === "approved" && !letter.disbursementOrder && (
                                  <>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                      onClick={() => navigate(`/disbursement-orders/new-direct?csr=${encodeURIComponent(letter.letterNumber)}`)}
                                      className="cursor-pointer flex items-center justify-start gap-2 py-2 text-xs font-bold text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40"
                                    >
                                      <Coins className="w-4 h-4 text-amber-600 shrink-0" />
                                      <span>إنشاء أمر صرف</span>
                                    </DropdownMenuItem>
                                  </>
                                )}

                                {/* متابعة أمر الصرف المرتبط إن وجد */}
                                {letter.disbursementOrder && (
                                  <>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                      onClick={() => navigate("/disbursement-orders")}
                                      className="cursor-pointer flex items-center justify-start gap-2 py-2 text-xs text-slate-700 dark:text-slate-300"
                                    >
                                      <Coins className="w-4 h-4 text-primary shrink-0" />
                                      <div className="flex flex-col text-right">
                                        <span className="font-semibold">متابعة أمر الصرف</span>
                                        <span className="text-[10px] text-muted-foreground font-mono">
                                          #{letter.disbursementOrder.orderNumber} ({letter.disbursementOrder.status === "executed" ? "منفّذ" : letter.disbursementOrder.status === "approved" ? "معتمد" : "قيد المراجعة"})
                                        </span>
                                      </div>
                                    </DropdownMenuItem>
                                  </>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </td>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}

            {/* عناصر التنقل بين الصفحات */}
            {totalPages > 1 && (
              <div className="p-3 border-t flex items-center justify-between gap-2 text-xs text-muted-foreground bg-muted/10">
                <span>إجمالي النتائج: {total} خطاب</span>
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    className="h-7 w-7 p-0"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                  <span className="px-2 font-bold text-foreground">
                    صفحة {currentPage} من {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                    className="h-7 w-7 p-0"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* نافذة عرض تفاصيل الأصناف المشمولة */}
        <Dialog open={!!selectedLetterForItems} onOpenChange={() => setSelectedLetterForItems(null)}>
          <DialogContent className="max-w-lg text-right font-sans" dir="rtl">
            <DialogHeader className="text-right sm:text-right pb-2 border-b">
              <DialogTitle className="text-base font-bold flex items-center gap-2 text-foreground">
                <Package className="w-5 h-5 text-sky-600" />
                أصناف خطاب المسؤولية المجتمعية ({selectedLetterForItems?.letterNumber})
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground text-right sm:text-right">
                مسجد {selectedLetterForItems?.mosqueName} • موجه إلى: {selectedLetterForItems?.recipientName}
              </DialogDescription>
            </DialogHeader>

            <div className="py-2">
              <table className="w-full text-xs text-right border-collapse border border-border">
                <thead className="bg-muted/40 font-bold border-b border-border">
                  <tr>
                    <th className="p-2 w-10 text-center">#</th>
                    <th className="p-2">الصنف والبيان</th>
                    <th className="p-2">الوصف</th>
                    <th className="p-2 text-center w-20">الكمية</th>
                    <th className="p-2 text-center w-16">الوحدة</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {selectedLetterForItems?.items && selectedLetterForItems.items.length > 0 ? (
                    selectedLetterForItems.items.map((it: any, i: number) => (
                      <tr key={i} className="hover:bg-muted/20">
                        <td className="p-2 text-center font-mono text-muted-foreground">{i + 1}</td>
                        <td className="p-2 font-bold text-foreground">{it.itemName}</td>
                        <td className="p-2 text-muted-foreground">{it.description || "-"}</td>
                        <td className="p-2 text-center font-bold text-foreground">{it.quantity}</td>
                        <td className="p-2 text-center text-muted-foreground">{it.unit}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="p-4 text-center text-muted-foreground">لا توجد أصناف مسجلة</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
