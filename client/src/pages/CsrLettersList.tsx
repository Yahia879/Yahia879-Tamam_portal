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
} from "lucide-react";
import { toast } from "sonner";
import { exportStyledExcel } from "@/lib/excelExportHelper";
import { useDocumentTitle } from "@/contexts/DocumentTitleContext";

const STATUS_MAP: Record<string, { label: string; className: string }> = {
  approved: {
    label: "صادر وجاهز للطباعة",
    className: "border-sky-300 text-sky-800 bg-sky-50 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-800",
  },
  ready: {
    label: "صادر وجاهز للطباعة",
    className: "border-sky-300 text-sky-800 bg-sky-50 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-800",
  },
  draft: {
    label: "قيد الإعداد (مسودة)",
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

  // الخطاب المحدد للمعاينة والطباعة الفورية A4
  const [selectedLetterForPreview, setSelectedLetterForPreview] = useState<any | null>(null);

  // الخطاب المحدد لعرض تفاصيل أصنافه
  const [selectedLetterForItems, setSelectedLetterForItems] = useState<any | null>(null);

  // إغلاق المعاينة عند الضغط على زر Esc
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setSelectedLetterForPreview(null);
      }
    };
    if (selectedLetterForPreview) {
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedLetterForPreview]);

  // استعلام خطابات المسؤولية المجتمعية
  const {
    data: lettersData,
    isLoading,
    refetch,
  } = trpc.procurement.listCsrLetters.useQuery({
    search: debouncedSearch || undefined,
    status: statusFilter !== "all" ? statusFilter : undefined,
    page: currentPage,
    limit,
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

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportExcel}
              disabled={isExporting || letters.length === 0}
              className="h-9 gap-1.5 text-xs font-semibold"
            >
              {isExporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5 text-sky-600" />}
              تصدير Excel
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

          {/* خطابات صادرة وجاهزة */}
          <Card className="border border-border/80 shadow-2xs hover:shadow-xs transition-shadow">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-[11px] font-semibold text-muted-foreground">خطابات صادرة ومعتمدة</p>
                <p className="text-xl font-extrabold text-sky-700 dark:text-sky-300 mt-0.5">{stats.approvedCount}</p>
              </div>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-sky-50 dark:bg-sky-950/40 text-sky-600 border border-sky-100 dark:border-sky-900/50">
                <CheckCircle className="w-5 h-5" />
              </div>
            </CardContent>
          </Card>

          {/* قيد الإعداد / مسودة */}
          <Card className="border border-border/80 shadow-2xs hover:shadow-xs transition-shadow">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-[11px] font-semibold text-muted-foreground">قيد الإعداد (مسودة)</p>
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
                    <SelectItem value="approved">صادر وجاهز للطباعة</SelectItem>
                    <SelectItem value="draft">قيد الإعداد (مسودة)</SelectItem>
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
                      <th className="p-3 font-bold">الجهة الموجه إليها الخطاب</th>
                      <th className="p-3 font-bold">المفوض بالتوقيع</th>
                      <th className="p-3 font-bold text-center">الأصناف المطلوبة</th>
                      <th className="p-3 font-bold text-center">الحالة</th>
                      <th className="p-3 font-bold text-center">تاريخ الخطاب</th>
                      <th className="p-3 font-bold text-center w-24">الإجراءات</th>
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

                          {/* الجهة الموجه إليها الخطاب */}
                          <td className="p-3 font-semibold text-foreground">
                            <span>{letter.salutation} / </span>
                            <span className="text-sky-900 dark:text-sky-200">{letter.recipientName}</span>
                            <span className="text-muted-foreground mr-1">({letter.honorific})</span>
                          </td>

                          {/* المفوض بالتوقيع */}
                          <td className="p-3">
                            <div className="text-[11px] space-y-0.5">
                              <p className="text-foreground font-semibold">{letter.signatoryName}</p>
                              <p className="text-muted-foreground">{letter.signatoryTitle}</p>
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

                          {/* تاريخ الخطاب */}
                          <td className="p-3 text-center font-mono text-muted-foreground">
                            {letter.letterDate || "-"}
                          </td>

                          {/* الإجراءات */}
                          <td className="p-3 text-center">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setSelectedLetterForPreview(letter)}
                              className="h-7 text-xs font-bold gap-1 text-sky-700 hover:bg-sky-50 dark:text-sky-300 dark:hover:bg-sky-950/40 border-sky-200 dark:border-sky-800"
                              title="معاينة وطباعة الخطاب الرسمي"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>معاينة</span>
                            </Button>
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

        {/* شاشة المعاينة والطباعة الفورية الرسمية A4 كاملة الشاشة */}
        {selectedLetterForPreview && (
          <div className="fixed inset-0 z-50 flex flex-col bg-slate-100 dark:bg-slate-950 font-sans overflow-hidden" dir="rtl">
            <div className="print:hidden p-3 sm:px-6 bg-white dark:bg-slate-900 border-b border-border flex items-center justify-between gap-3 shadow-xs shrink-0 sticky top-0 z-20">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-sky-50 dark:bg-sky-950/40 flex items-center justify-center text-sky-600 border border-sky-200 dark:border-sky-800">
                  <HeartHandshake className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm sm:text-base text-foreground">معاينة الخطاب الرسمي للمسؤولية المجتمعية A4</span>
                    <Badge variant="outline" className="text-xs font-mono font-bold bg-slate-100 dark:bg-slate-800">{selectedLetterForPreview.letterNumber}</Badge>
                  </div>
                  <p className="text-[11px] text-muted-foreground">{selectedLetterForPreview.salutation} / {selectedLetterForPreview.recipientName} • جامع {selectedLetterForPreview.mosqueName}</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  onClick={() => window.print()}
                  className="h-8 text-xs font-bold gap-1.5 bg-sky-600 hover:bg-sky-700 text-white shadow-xs cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  طباعة A4
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedLetterForPreview(null)}
                  className="h-8 text-xs font-semibold gap-1.5 border-border hover:bg-muted"
                >
                  <X className="w-3.5 h-3.5" />
                  إغلاق
                </Button>
              </div>
            </div>

            {/* ورقة A4 الرسمية الفاخرة للخطاب كاملة الشاشة */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-8 flex justify-center bg-slate-200/70 dark:bg-slate-950 print:p-0 print:bg-white print:overflow-visible">
              <div className="w-full max-w-[210mm] bg-white text-slate-900 shadow-2xl p-6 sm:p-10 min-h-[297mm] flex flex-col justify-between border-[2px] border-[#0284c7] rounded-lg relative leading-relaxed print:shadow-none print:border-none print:m-0 print:p-6 print:rounded-none">
                <div className="absolute inset-1 border border-[#38bdf8]/40 rounded pointer-events-none print:hidden" />

                <div className="relative z-10 space-y-6 flex-1">
                  {/* ترويسة الخطاب الرسمية */}
                  <div className="flex justify-between items-start border-b border-slate-300 pb-4">
                    <div className="flex items-center gap-3">
                      {orgSettings?.logoUrl ? (
                        <img src={orgSettings.logoUrl} alt="شعار الجمعية" className="h-16 w-auto object-contain" />
                      ) : (
                        <div className="w-14 h-14 bg-sky-50 border border-sky-200 rounded-lg flex items-center justify-center text-sky-700 font-bold text-lg">
                          سدانة
                        </div>
                      )}
                      <div>
                        <h3 className="font-bold text-base text-sky-900">{orgName}</h3>
                        <p className="text-xs text-slate-500">إدارة المسؤولية المجتمعية والشراكات • برنامج سدانة</p>
                      </div>
                    </div>

                    <div className="text-xs space-y-1 text-left font-mono">
                      <div><span className="text-slate-500">الرقم: </span><strong>{selectedLetterForPreview.letterNumber}</strong></div>
                      <div><span className="text-slate-500">التاريخ: </span><strong>{selectedLetterForPreview.letterDate}</strong></div>
                    </div>
                  </div>

                  {/* المخاطبة: السادة / ... المحترمون (بدون أصحاب السعادة) */}
                  <div className="pt-2 text-sm sm:text-base font-bold text-slate-900">
                    <span>{selectedLetterForPreview.salutation} / </span>
                    <span className="border-b-2 border-dotted border-slate-400 px-2 text-sky-900">
                      {selectedLetterForPreview.recipientName}
                    </span>
                    <span className="mr-3">{selectedLetterForPreview.honorific}</span>
                  </div>

                  {/* الديباجة الحرفية المعتمدة */}
                  <div className="text-xs sm:text-sm text-slate-800 leading-loose space-y-2">
                    <p className="font-bold text-slate-900">السلام عليكم ورحمة الله وبركاته،،،</p>
                    <p>
                      تجدون برفقه البنود المراد تأمينها لمشروع <strong>({selectedLetterForPreview.projectName || `مشروع جامع ${selectedLetterForPreview.mosqueName}`})</strong>، وحيث إنكم من الجهات الحريصة على بذل الخير وخدمة المجتمع، عليه نرفع لكم المتطلبات التي يحتاجها المشروع:
                    </p>
                  </div>

                  {/* جدول الأصناف المرفقة (خالٍ تماماً من أي أسعار) */}
                  <div>
                    <table className="w-full border-collapse border border-slate-300 text-xs text-right">
                      <thead className="bg-slate-100 text-slate-800 font-bold border-b border-slate-300">
                        <tr>
                          <th className="p-2 border-l border-slate-300 text-center w-12">م</th>
                          <th className="p-2 border-l border-slate-300">الصنف والبيان</th>
                          <th className="p-2 border-l border-slate-300">الوصف والمواصفات</th>
                          <th className="p-2 border-l border-slate-300 text-center w-20">الكمية</th>
                          <th className="p-2 text-center w-20">الوحدة</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-300">
                        {selectedLetterForPreview.items && selectedLetterForPreview.items.length > 0 ? (
                          selectedLetterForPreview.items.map((it: any, idx: number) => (
                            <tr key={idx} className="h-9">
                              <td className="p-2 border-l border-slate-300 text-center font-mono text-slate-600">{idx + 1}</td>
                              <td className="p-2 border-l border-slate-300 font-bold text-slate-900">{it.itemName}</td>
                              <td className="p-2 border-l border-slate-300 text-slate-700">{it.description || "-"}</td>
                              <td className="p-2 border-l border-slate-300 text-center font-bold text-slate-900">{it.quantity}</td>
                              <td className="p-2 text-center text-slate-700">{it.unit}</td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={5} className="p-6 text-center text-slate-500">لا توجد أصناف مسجلة</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* عبارة الختام الحرفية */}
                  <div className="pt-3 text-xs sm:text-sm font-bold text-slate-900">
                    <p>وتقبلوا وافر التحية والتقدير،،،</p>
                  </div>

                  {/* خانة التوقيع والاعتماد الرسمي: توقيع المورد وتوقيع المدير التنفيذي */}
                  <div className="pt-8 grid grid-cols-2 gap-6 sm:gap-10 items-start break-inside-avoid">
                    {/* الطرف الأول: المورد / الشريك المجتمعي */}
                    <div className="text-center space-y-2 p-3 sm:p-4 rounded-lg bg-slate-50/70 border border-slate-200">
                      <p className="font-bold text-xs sm:text-sm text-slate-800">
                        المورد / ممثل الجهة والشريك المجتمعي
                      </p>
                      <div className="h-14 flex items-center justify-center">
                        <div className="border-b border-dashed border-slate-400 w-36 sm:w-44 mx-auto" />
                      </div>
                      <p className="font-bold text-xs sm:text-sm text-slate-900 truncate px-2">
                        {selectedLetterForPreview.recipientName || "الجهة المانحة / الشريك المجتمعي"}
                      </p>
                      <p className="text-[11px] text-slate-500 font-medium">التوقيع والختم الرسمي</p>
                    </div>

                    {/* الطرف الثاني: المدير التنفيذي */}
                    <div className="text-center space-y-2 p-3 sm:p-4 rounded-lg bg-slate-50/70 border border-slate-200">
                      <p className="font-bold text-xs sm:text-sm text-slate-800">
                        {selectedLetterForPreview.signatoryTitle || "المدير التنفيذي"}
                      </p>
                      <div className="h-14 flex items-center justify-center">
                        <div className="border-b border-dashed border-slate-400 w-36 sm:w-44 mx-auto" />
                      </div>
                      <p className="font-bold text-xs sm:text-sm text-slate-900 truncate px-2">
                        {selectedLetterForPreview.signatoryName || "المهندس المفوض بالتوقيع"}
                      </p>
                      <p className="text-[11px] text-slate-500 font-medium">الجمعية / إدارة المشاريع</p>
                    </div>
                  </div>
                </div>

                <div className="mt-8 pt-4 border-t border-slate-200 text-center text-slate-400 text-[10px] flex justify-between items-center px-1">
                  <span>{orgName} - سدانة</span>
                  <span>الرمز المرجعي: #{selectedLetterForPreview.requestNumber} • صفحة 1 من 1</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
