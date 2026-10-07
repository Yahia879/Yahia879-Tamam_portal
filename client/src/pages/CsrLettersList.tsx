import { useState, useMemo, useEffect } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { usePermission, useAnyPermission } from "@/hooks/usePermission";
import DashboardLayout from "@/components/DashboardLayout";
import EnhancedPagination, { usePersistedPage } from "@/components/EnhancedPagination";
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
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
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

export interface CsrLettersViewProps {
  requestId?: number;
  projectId?: number;
  isEmbedded?: boolean;
}

export function CsrLettersView({ requestId, projectId, isEmbedded = false }: CsrLettersViewProps) {
  useDocumentTitle(isEmbedded ? null : "خطابات المسؤولية المجتمعية - سدانة");
  const { user } = useAuth();
  const [, navigate] = useLocation();

  // التحقق من صلاحية المدير التنفيذي حصراً: دوره مدير تنفيذي وايميله ceo@manarah.org.sa
  const isExecutiveDirectorCeo =
    (user?.role === "general_manager" ||
      user?.role === "executive_director" ||
      (user as any)?.customRole?.nameAr === "المدير العام" ||
      (user as any)?.customRole?.nameAr === "المدير التنفيذي" ||
      (user as any)?.customRole?.nameAr === "الرئيس التنفيذي") &&
    user?.email?.toLowerCase().trim() === "ceo@manarah.org.sa";

  const isSuperAdmin = user?.role === "super_admin" || user?.role === "system_admin";
  const isExec = isExecutiveDirectorCeo;
  const canApprove = isExecutiveDirectorCeo;
  const showGreenHighlight = isExecutiveDirectorCeo || isSuperAdmin;
  const canAdd = usePermission("csr_letters.add");
  const canExport = useAnyPermission(["csr_letters.export", "orders_and_letters.export"]);

  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [currentPage, setCurrentPage, resetCurrentPage] = usePersistedPage("csr_letters_page", 1);
  const limit = 10;

  // Debounce للبحث
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      if (searchTerm) {
        resetCurrentPage();
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm, resetCurrentPage]);

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
    requestId: requestId || undefined,
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
      utils.procurement.getPendingActionCounts.invalidate();
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

  const orgName = orgSettings?.officialReportsName || orgSettings?.organizationName || "جمعية عمارة المساجد";



  const content = (
    <div className="space-y-6 text-right font-sans" dir="rtl">
      {/* العنوان والإجراءات العلوية */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300">
              <HeartHandshake className="w-5 h-5" />
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-foreground">
              {requestId ? "الخطابات المجتمعية الخاصة بالطلب" : (isEmbedded ? "الخطاب المجتمعي" : "خطابات المسؤولية المجتمعية")}
            </h1>
            <Badge variant="outline" className="text-sky-700 bg-sky-50 dark:bg-sky-950/40 border-sky-200 dark:border-sky-800 text-xs">
              برنامج سدانة
            </Badge>
            {requestId && (
              <Badge variant="secondary" className="font-mono text-xs">
                طلب #{requestId}
              </Badge>
            )}
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            {requestId
              ? "استعراض وإدارة وطباعة الخطابات الرسمية الموجهة للشركات والجهات المانحة لهذا المشروع والطلب"
              : "إدارة واستعراض وطباعة الخطابات الرسمية الموجهة للشركات والجهات المانحة لتوريد احتياجات المساجد"}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {canAdd && (
            <Button
              size="sm"
              onClick={() => {
                const qParts = [];
                if (requestId) qParts.push(`requestId=${requestId}`);
                if (projectId) qParts.push(`projectId=${projectId}`);
                if (isEmbedded) {
                  qParts.push(`from=orders-and-letters`);
                  if (requestId) {
                    qParts.push(`returnUrl=${encodeURIComponent(`/orders-and-letters?tab=disbursement_orders&requestId=${requestId}`)}`);
                  }
                }
                const qStr = qParts.length > 0 ? `?${qParts.join("&")}` : "";
                navigate(`/csr-letters/new${qStr}`);
              }}
              className="text-xs font-bold gap-1.5 bg-sky-600 hover:bg-sky-700 text-white shadow-xs cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>إضافة خطاب مسؤولية مجتمعية جديد</span>
            </Button>
          )}
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
                    resetCurrentPage();
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
                    : "لم يتم إصدار أي خطابات مسؤولية مجتمعية بعد. يمكنك تخصيص بنود الطلبات من صفحة توريد الطلب والتعاقد."}
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
                      <th className="p-3 font-bold text-center">تاريخ الخطاب</th>
                      <th className="p-3 font-bold text-center w-16">الإجراءات</th>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="divide-y divide-border">
                    {letters.map((letter, idx) => {
                      const statusInfo = STATUS_MAP[letter.status] || STATUS_MAP.approved;
                      const isPendingMyAction = showGreenHighlight && letter.status === "draft";
                      return (
                        <TableRow 
                          key={letter.id} 
                          className={
                            isPendingMyAction 
                              ? "bg-emerald-100/75 dark:bg-emerald-950/60 hover:bg-emerald-200/70 dark:hover:bg-emerald-900/70 border-r-4 border-r-emerald-700 dark:border-r-emerald-400 transition-all shadow-xs" 
                              : "hover:bg-muted/10 transition-colors"
                          }
                        >
                          <td className="p-3 text-center font-mono text-muted-foreground">
                            {(currentPage - 1) * limit + idx + 1}
                          </td>

                          {/* رقم الخطاب */}
                          <td className="p-3">
                            <div className="flex items-center gap-2 justify-start">
                              {isPendingMyAction && (
                                <TooltipProvider>
                                  <Tooltip delayDuration={50}>
                                    <TooltipTrigger asChild>
                                      <div className="relative inline-flex items-center justify-center shrink-0 cursor-pointer">
                                        <div className="relative flex items-center justify-center w-6 h-6 rounded-full bg-gradient-to-tr from-[#1a5f4a] via-emerald-600 to-teal-500 text-white shadow-sm border border-emerald-400/40 transition-transform duration-200 hover:scale-110">
                                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60"></span>
                                          <Clock className="w-3.5 h-3.5 text-amber-200 animate-spin relative z-10" style={{ animationDuration: '4s' }} />
                                        </div>
                                      </div>
                                    </TooltipTrigger>
                                    <TooltipContent side="top" className="bg-slate-900 text-white text-[11px] font-bold px-2.5 py-1 rounded-md shadow-xl border border-slate-700/60 flex items-center gap-1.5 z-50">
                                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></span>
                                      <span>{isExecutiveDirectorCeo ? "بانتظار اعتمادك (المدير التنفيذي)" : "بانتظار اعتماد المدير التنفيذي"}</span>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              )}
                              <span className="font-mono font-bold text-foreground bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded border border-border">
                                {letter.letterNumber}
                              </span>
                            </div>
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
                            {letter.status === "draft" ? (
                              isExec ? (
                                <Badge variant="outline" className="text-[10px] font-bold px-2 py-0.5 border-amber-300 text-amber-800 bg-amber-50 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800 flex items-center gap-1 w-fit mx-auto">
                                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                                  <span>بانتظار اعتمادك (المدير التنفيذي)</span>
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="text-[10px] font-bold px-2 py-0.5 border-amber-300 text-amber-800 bg-amber-50 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800 flex items-center gap-1 w-fit mx-auto">
                                  <span>بانتظار اعتماد المدير التنفيذي</span>
                                </Badge>
                              )
                            ) : (
                              <Badge variant="outline" className={`text-[10px] font-bold px-2 py-0.5 ${statusInfo.className}`}>
                                {statusInfo.label}
                              </Badge>
                            )}
                          </td>

                          {/* تاريخ الخطاب */}
                          <td className="p-3 text-center font-mono text-muted-foreground">
                            {letter.letterDate || "-"}
                          </td>

                          {/* الإجراءات عبر قائمة 3 نقاط */}
                          <td className="p-3 text-center">
                            <div className="flex items-center justify-center gap-1">
                              {canApprove && letter.status === "draft" && (
                                <Button
                                  variant="default"
                                  size="sm"
                                  onClick={() => {
                                    approveLetterMutation.mutate({
                                      requestId: letter.requestId,
                                      letterNumber: letter.letterNumber,
                                    });
                                  }}
                                  disabled={approveLetterMutation.isPending}
                                  className="h-8 px-2.5 text-xs font-bold gap-1 bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs cursor-pointer"
                                  title="اعتماد خطاب المسؤولية المجتمعية الآن"
                                >
                                  <CheckCircle className="w-3.5 h-3.5" />
                                  <span>اعتماد</span>
                                </Button>
                              )}
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
                                {canApprove && letter.status === "draft" && (
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
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </td>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}

            {/* عناصر التنقل بين الصفحات */}
            <EnhancedPagination
              page={currentPage}
              totalPages={totalPages}
              onPageChange={(p) => {
                setCurrentPage(p);
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
              totalItems={total}
              itemsPerPage={limit}
              itemName="خطاب مسؤولية مجتمعية"
              itemNamePlural="خطابات مسؤولية مجتمعية"
              className="bg-muted/10 border-t p-3.5"
            />
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
  );

  if (isEmbedded) {
    return content;
  }

  return <DashboardLayout>{content}</DashboardLayout>;
}

export default function CsrLettersList() {
  return <CsrLettersView isEmbedded={false} />;
}
