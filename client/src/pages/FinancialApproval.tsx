import { useState, useMemo, useEffect } from "react";
import { useLocation } from "wouter";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useAnyPermission } from "@/hooks/usePermission";
import { cn } from "@/lib/utils";
import {
  CheckSquare,
  Loader2,
  FileText,
  Search,
  RotateCcw,
  Clock,
  ShieldCheck,
  Banknote,
  Coins,
  ShoppingCart,
  Wallet,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  User,
  AlertCircle,
  Layers,
  CheckCircle,
  Filter,
} from "lucide-react";
import { useDocumentTitle } from "@/contexts/DocumentTitleContext";

const CATEGORY_CONFIG: Record<
  string,
  { label: string; icon: any; colorClass: string }
> = {
  disbursement_request: {
    label: "طلب صرف",
    icon: Banknote,
    colorClass:
      "bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800",
  },
  disbursement_order: {
    label: "أمر صرف",
    icon: FileText,
    colorClass:
      "bg-blue-50 text-blue-800 border-blue-300 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800",
  },
  progress_report: {
    label: "تقرير إنجاز",
    icon: Layers,
    colorClass:
      "bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800",
  },
  purchase_order: {
    label: "أمر شراء",
    icon: ShoppingCart,
    colorClass:
      "bg-teal-50 text-teal-800 border-teal-300 dark:bg-teal-950/40 dark:text-teal-300 dark:border-teal-800",
  },
  receipt_voucher: {
    label: "سند قبض",
    icon: Coins,
    colorClass:
      "bg-indigo-50 text-indigo-800 border-indigo-300 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800",
  },
  custody_request: {
    label: "عهدة مالية",
    icon: Wallet,
    colorClass:
      "bg-cyan-50 text-cyan-800 border-cyan-300 dark:bg-cyan-950/40 dark:text-cyan-300 dark:border-cyan-800",
  },
  contract: {
    label: "عقد",
    icon: FileText,
    colorClass:
      "bg-slate-100 text-slate-800 border-slate-300 dark:bg-slate-900/40 dark:text-slate-300 dark:border-slate-800",
  },
  project_quotation: {
    label: "اعتماد مالي للطلب",
    icon: CheckSquare,
    colorClass:
      "bg-purple-50 text-purple-800 border-purple-300 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800",
  },
};

const APPROVER_CONFIG: Record<string, { label: string; badgeClass: string }> = {
  executive_director: {
    label: "المدير التنفيذي",
    badgeClass:
      "bg-rose-50 text-rose-800 border-rose-300 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800 font-bold",
  },
  financial: {
    label: "المسؤول المالي",
    badgeClass:
      "bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800 font-bold",
  },
  project_manager: {
    label: "مدير المشروع",
    badgeClass:
      "bg-blue-50 text-blue-800 border-blue-300 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800 font-bold",
  },
  board_chairman: {
    label: "صاحب الصلاحية / المجلس",
    badgeClass:
      "bg-purple-50 text-purple-800 border-purple-300 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800 font-bold",
  },
};

export default function FinancialApproval() {
  const [, navigate] = useLocation();
  const { user } = useAuth();
  useDocumentTitle("الاعتمادات");

  // التحقق من الصلاحيات والوصول (مدير النظام، المدير التنفيذي، الإدارة المالية، أو صلاحية الاعتماد)
  const isSuperOrSystem = ["super_admin", "system_admin"].includes(user?.role || "");
  const isExecDirector =
    ["general_manager", "executive_director"].includes(user?.role || "") ||
    user?.email?.toLowerCase().trim() === "ceo@manarah.org.sa" ||
    user?.email?.toLowerCase().trim() === "test10@gmail.com" ||
    (user as any)?.customRole?.nameAr === "المدير التنفيذي" ||
    (user as any)?.customRole?.nameAr === "الرئيس التنفيذي";
  const isFinancialRole =
    ["financial", "financial_manager"].includes(user?.role || "") ||
    user?.email?.toLowerCase().trim() === "solayani@manarah.org.sa" ||
    (user as any)?.customRole?.nameAr === "الإدارة المالية" ||
    (user as any)?.customRole?.nameAr === "المدير المالي";

  const hasSpecificPerm = useAnyPermission([
    "financial_approval.approve",
    "financial_approval.view",
    "financial_approval",
  ]);

  const hasApprovalPerm =
    hasSpecificPerm ||
    isSuperOrSystem ||
    isExecDirector ||
    isFinancialRole;

  // حالة التصفية والبحث لمركز الاعتمادات
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [approverFilter, setApproverFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [onlyMine, setOnlyMine] = useState(false);
  const [page, setPage] = useState(1);
  const pageSize = 12;

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setPage(1);
    }, 250);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // استعلام مركز الاعتمادات الموحد
  const {
    data: approvalsData,
    isLoading: approvalsLoading,
  } = trpc.approvals.getPendingApprovals.useQuery(
    {
      category: categoryFilter !== "all" && categoryFilter !== "other" ? categoryFilter : undefined,
      approver: approverFilter !== "all" ? approverFilter : undefined,
      search: debouncedSearch || undefined,
      onlyMine: onlyMine || undefined,
    },
    {
      refetchInterval: 15000,
    }
  );

  // تقسيم صفحات وتصفية جدول الاعتمادات
  const rawItems = approvalsData?.items || [];
  const items = useMemo(() => {
    if (categoryFilter === "other") {
      return rawItems.filter(
        (i) => !["disbursement_request", "disbursement_order", "receipt_voucher"].includes(i.categoryKey)
      );
    }
    return rawItems;
  }, [rawItems, categoryFilter]);

  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const paginatedItems = useMemo(() => {
    const start = (page - 1) * pageSize;
    return items.slice(start, start + pageSize);
  }, [items, page, pageSize]);

  // إحصائيات المعاملات حسب التصنيف
  const totalCount = approvalsData?.counts?.total ?? 0;
  const disbReqCount = approvalsData?.counts?.byCategory?.["disbursement_request"] ?? 0;
  const disbOrderCount = approvalsData?.counts?.byCategory?.["disbursement_order"] ?? 0;
  const receiptVoucherCount = approvalsData?.counts?.byCategory?.["receipt_voucher"] ?? 0;
  const otherCount = Math.max(0, totalCount - disbReqCount - disbOrderCount - receiptVoucherCount);

  // حظر المستخدمين غير المصرح لهم
  if (!hasApprovalPerm && !isSuperOrSystem && !isExecDirector) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center py-20 text-center space-y-4" dir="rtl">
          <AlertCircle className="h-14 w-14 text-rose-500" />
          <h2 className="text-xl font-bold">عذراً، الوصول غير مصرح به</h2>
          <p className="text-muted-foreground max-w-md">
            شاشة الاعتمادات متاحة حصراً لمدير النظام، المدير التنفيذي، والإدارة المالية.
          </p>
          <Button onClick={() => navigate("/dashboard")} variant="outline" className="mt-2">
            العودة للرئيسية
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6" dir="rtl">
        {/* ==================== رأس الصفحة ==================== */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-foreground">الاعتمادات</h1>
              {approvalsData?.counts?.total !== undefined && (
                <Badge className="bg-primary/10 text-primary border-primary/20 text-sm px-2.5 py-0.5 font-bold">
                  {approvalsData.counts.total} معلق
                </Badge>
              )}
            </div>
            <p className="text-muted-foreground text-sm mt-1">
              مركز موحد لمتابعة واعتماد كافة المعاملات والطلبات المعلقة عبر مختلف أقسام البوابة
            </p>
          </div>
        </div>

        {/* ==================== بطاقات المؤشرات الإحصائية بحسب نوع المعاملة ==================== */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
          {/* 1. إجمالي المعاملات المعلقة */}
          <Card
            onClick={() => {
              setCategoryFilter("all");
              setApproverFilter("all");
              setOnlyMine(false);
              setPage(1);
            }}
            className={cn(
              "border-border/60 shadow-xs hover:border-primary/50 transition-all cursor-pointer",
              categoryFilter === "all" && !onlyMine && "ring-2 ring-primary/20 border-primary/60 bg-primary/[0.02]"
            )}
          >
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground">إجمالي المعاملات المعلقة</p>
                <p className="text-2xl font-black mt-1 text-foreground">
                  {approvalsLoading ? (
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  ) : (
                    totalCount
                  )}
                </p>
                <p className="text-[11px] text-muted-foreground mt-0.5">طلب ومعاملة بانتظار الاعتماد</p>
              </div>
              <div className="h-11 w-11 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
                <Clock className="h-5.5 w-5.5" />
              </div>
            </CardContent>
          </Card>

          {/* 2. طلبات الصرف */}
          <Card
            onClick={() => {
              setCategoryFilter(categoryFilter === "disbursement_request" ? "all" : "disbursement_request");
              setPage(1);
            }}
            className={cn(
              "border-emerald-200/60 dark:border-emerald-900/40 shadow-xs hover:border-emerald-400 transition-all cursor-pointer",
              categoryFilter === "disbursement_request" && "ring-2 ring-emerald-500/20 border-emerald-500 bg-emerald-50/20 dark:bg-emerald-950/20"
            )}
          >
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-emerald-700 dark:text-emerald-400">طلبات الصرف</p>
                <p className="text-2xl font-black mt-1 text-emerald-700 dark:text-emerald-300">
                  {approvalsLoading ? (
                    <Loader2 className="h-6 w-6 animate-spin text-emerald-400" />
                  ) : (
                    disbReqCount
                  )}
                </p>
                <p className="text-[11px] text-muted-foreground mt-0.5">قيد المراجعة والاعتماد</p>
              </div>
              <div className="h-11 w-11 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
                <Banknote className="h-5.5 w-5.5" />
              </div>
            </CardContent>
          </Card>

          {/* 3. أوامر الصرف */}
          <Card
            onClick={() => {
              setCategoryFilter(categoryFilter === "disbursement_order" ? "all" : "disbursement_order");
              setPage(1);
            }}
            className={cn(
              "border-blue-200/60 dark:border-blue-900/40 shadow-xs hover:border-blue-400 transition-all cursor-pointer",
              categoryFilter === "disbursement_order" && "ring-2 ring-blue-500/20 border-blue-500 bg-blue-50/20 dark:bg-blue-950/20"
            )}
          >
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-blue-700 dark:text-blue-400">أوامر الصرف</p>
                <p className="text-2xl font-black mt-1 text-blue-700 dark:text-blue-300">
                  {approvalsLoading ? (
                    <Loader2 className="h-6 w-6 animate-spin text-blue-400" />
                  ) : (
                    disbOrderCount
                  )}
                </p>
                <p className="text-[11px] text-muted-foreground mt-0.5">بانتظار تدقيق واعتماد الصرف</p>
              </div>
              <div className="h-11 w-11 rounded-xl bg-blue-50 dark:bg-blue-950/50 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
                <FileText className="h-5.5 w-5.5" />
              </div>
            </CardContent>
          </Card>

          {/* 4. سندات القبض */}
          <Card
            onClick={() => {
              setCategoryFilter(categoryFilter === "receipt_voucher" ? "all" : "receipt_voucher");
              setPage(1);
            }}
            className={cn(
              "border-indigo-200/60 dark:border-indigo-900/40 shadow-xs hover:border-indigo-400 transition-all cursor-pointer",
              categoryFilter === "receipt_voucher" && "ring-2 ring-indigo-500/20 border-indigo-500 bg-indigo-50/20 dark:bg-indigo-950/20"
            )}
          >
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-indigo-700 dark:text-indigo-400">سندات القبض</p>
                <p className="text-2xl font-black mt-1 text-indigo-700 dark:text-indigo-300">
                  {approvalsLoading ? (
                    <Loader2 className="h-6 w-6 animate-spin text-indigo-400" />
                  ) : (
                    receiptVoucherCount
                  )}
                </p>
                <p className="text-[11px] text-muted-foreground mt-0.5">بانتظار الاعتماد المالي</p>
              </div>
              <div className="h-11 w-11 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
                <Coins className="h-5.5 w-5.5" />
              </div>
            </CardContent>
          </Card>

          {/* 5. عهد وعقود ومعاملات أخرى */}
          <Card
            onClick={() => {
              setCategoryFilter(categoryFilter === "other" ? "all" : "other");
              setPage(1);
            }}
            className={cn(
              "border-amber-200/60 dark:border-amber-900/40 shadow-xs hover:border-amber-400 transition-all cursor-pointer",
              categoryFilter === "other" && "ring-2 ring-amber-500/20 border-amber-500 bg-amber-50/20 dark:bg-amber-950/20"
            )}
          >
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-amber-700 dark:text-amber-400">عهد وعقود وأخرى</p>
                <p className="text-2xl font-black mt-1 text-amber-700 dark:text-amber-300">
                  {approvalsLoading ? (
                    <Loader2 className="h-6 w-6 animate-spin text-amber-400" />
                  ) : (
                    otherCount
                  )}
                </p>
                <p className="text-[11px] text-muted-foreground mt-0.5">عهد، عقود، تقارير، وأوامر شراء</p>
              </div>
              <div className="h-11 w-11 rounded-xl bg-amber-50 dark:bg-amber-950/50 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0">
                <Layers className="h-5.5 w-5.5" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ==================== أدوات البحث والفلترة ==================== */}
        <Card className="border-border/60 shadow-xs">
          <CardContent className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
              <div className="md:col-span-4 relative">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="ابحث برقم المعاملة، العنوان، أو مقدم الطلب..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pr-9 pl-8 text-xs h-9 text-right"
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm("")}
                    className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                  >
                    ×
                  </button>
                )}
              </div>

              <div className="md:col-span-3">
                <Select value={categoryFilter} onValueChange={(val) => { setCategoryFilter(val); setPage(1); }}>
                  <SelectTrigger className="text-xs h-9 text-right">
                    <SelectValue placeholder="كافة التصنيفات" />
                  </SelectTrigger>
                  <SelectContent dir="rtl">
                    <SelectItem value="all">كافة التصنيفات داخل البوابة</SelectItem>
                    <SelectItem value="disbursement_request">طلبات الصرف</SelectItem>
                    <SelectItem value="disbursement_order">أوامر الصرف</SelectItem>
                    <SelectItem value="progress_report">تقارير الإنجاز</SelectItem>
                    <SelectItem value="purchase_order">أوامر الشراء</SelectItem>
                    <SelectItem value="receipt_voucher">سندات القبض</SelectItem>
                    <SelectItem value="custody_request">العهد المالية</SelectItem>
                    <SelectItem value="contract">العقود</SelectItem>
                    <SelectItem value="project_quotation">اعتمادات المشاريع</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="md:col-span-3">
                <Select value={approverFilter} onValueChange={(val) => { setApproverFilter(val); setPage(1); }}>
                  <SelectTrigger className="text-xs h-9 text-right">
                    <SelectValue placeholder="كافة جهات الاعتماد" />
                  </SelectTrigger>
                  <SelectContent dir="rtl">
                    <SelectItem value="all">كافة جهات الاعتماد</SelectItem>
                    <SelectItem value="executive_director">المدير التنفيذي</SelectItem>
                    <SelectItem value="financial">المسؤول المالي</SelectItem>
                    <SelectItem value="project_manager">مدير المشروع</SelectItem>
                    <SelectItem value="board_chairman">صاحب الصلاحية / المجلس</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="md:col-span-2 flex items-center gap-2">
                {(isExecDirector || isFinancialRole) && (
                  <Button
                    variant={onlyMine ? "default" : "outline"}
                    size="sm"
                    onClick={() => {
                      setOnlyMine(!onlyMine);
                      setPage(1);
                    }}
                    className="w-full text-xs h-9 font-bold gap-1 cursor-pointer"
                  >
                    <ShieldCheck className="h-3.5 w-3.5" />
                    <span>اعتماداتي فقط</span>
                  </Button>
                )}

                {(categoryFilter !== "all" || approverFilter !== "all" || searchTerm || onlyMine) && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setCategoryFilter("all");
                      setApproverFilter("all");
                      setSearchTerm("");
                      setOnlyMine(false);
                      setPage(1);
                    }}
                    className="text-xs h-9 text-muted-foreground hover:text-foreground cursor-pointer"
                    title="إعادة ضبط الفلاتر"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ==================== جدول المعاملات المعلقة ==================== */}
        <Card className="border-border/60 shadow-xs">
          <CardHeader className="pb-3 border-b border-border/40">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <CheckSquare className="h-5 w-5 text-primary" />
                <CardTitle className="text-base font-bold text-foreground">
                  قائمة الطلبات بانتظار الاعتماد
                </CardTitle>
                <Badge variant="outline" className="text-xs font-semibold px-2">
                  {items.length} نتيجة
                </Badge>
              </div>
              <CardDescription className="text-xs">
                انقر على رقم المعاملة أو عنوانها للانتقال المباشر للطلب وإتمام الإجراء
              </CardDescription>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            {approvalsLoading ? (
              <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-3">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-xs">جاري تحميل قائمة الاعتمادات من كافة أقسام النظام...</p>
              </div>
            ) : paginatedItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground gap-2">
                <div className="h-12 w-12 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 flex items-center justify-center mb-1">
                  <CheckCircle className="h-6 w-6" />
                </div>
                <p className="font-bold text-sm text-foreground">لا توجد طلبات بانتظار الاعتماد</p>
                <p className="text-xs max-w-sm">
                  {searchTerm || categoryFilter !== "all" || approverFilter !== "all" || onlyMine
                    ? "لم يتم العثور على نتائج تطابق معايير البحث والفلترة المحددة"
                    : "تمت مراجعة واعتماد كافة المعاملات المعلقة بنجاح"}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-muted/40">
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="text-right text-xs font-bold text-foreground w-[280px]">الطلب / المعاملة</TableHead>
                      <TableHead className="text-right text-xs font-bold text-foreground w-[160px]">التصنيف داخل البوابة</TableHead>
                      <TableHead className="text-right text-xs font-bold text-foreground w-[190px]">مقدم الطلب</TableHead>
                      <TableHead className="text-right text-xs font-bold text-foreground w-[180px]">المسؤول عن الاعتماد</TableHead>
                      <TableHead className="text-right text-xs font-bold text-foreground w-[150px]">القيمة / المبلغ</TableHead>
                      <TableHead className="text-right text-xs font-bold text-foreground w-[180px]">الحالة الحالية</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedItems.map((item) => {
                      const catConf = CATEGORY_CONFIG[item.categoryKey] || {
                        label: item.category,
                        icon: FileText,
                        colorClass: "bg-slate-100 text-slate-800 border-slate-300",
                      };
                      const CatIcon = catConf.icon;

                      const appConf = APPROVER_CONFIG[item.requiredApproverKey] || {
                        label: item.requiredApprover,
                        badgeClass: "bg-amber-50 text-amber-800 border-amber-300 font-bold",
                      };

                      return (
                        <TableRow key={item.id} className="hover:bg-muted/30 transition-colors">
                          <TableCell className="align-top py-3 text-right">
                            <div className="space-y-1">
                              <button
                                onClick={() => navigate(item.link)}
                                className="text-xs font-bold text-primary hover:underline block text-right font-mono cursor-pointer"
                              >
                                {item.itemNumber}
                              </button>
                              <button
                                onClick={() => navigate(item.link)}
                                className="text-xs font-medium text-foreground hover:text-primary transition-colors text-right line-clamp-2 block cursor-pointer"
                                title={item.title}
                              >
                                {item.title}
                              </button>
                              <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                                <Clock className="h-3 w-3 text-muted-foreground/70" />
                                <span>{item.createdAt ? new Date(item.createdAt).toLocaleDateString("ar-SA") : "—"}</span>
                              </p>
                            </div>
                          </TableCell>

                          <TableCell className="align-top py-3 text-right">
                            <Badge
                              variant="outline"
                              className={cn("gap-1 text-[11px] font-semibold py-1 px-2.5", catConf.colorClass)}
                            >
                              <CatIcon className="h-3 w-3 shrink-0" />
                              <span>{catConf.label}</span>
                            </Badge>
                          </TableCell>

                          <TableCell className="align-top py-3 text-right">
                            <div className="space-y-0.5">
                              <p className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                                <User className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                                <span>{item.requesterName}</span>
                              </p>
                              {item.requesterRole && (
                                <p className="text-[10px] text-muted-foreground pr-5">
                                  {item.requesterRole}
                                </p>
                              )}
                            </div>
                          </TableCell>

                          <TableCell className="align-top py-3 text-right">
                            <Badge
                              variant="outline"
                              className={cn("text-[11px] py-1 px-2.5", appConf.badgeClass)}
                            >
                              {item.requiredApprover}
                            </Badge>
                          </TableCell>

                          <TableCell className="align-top py-3 text-right">
                            {item.amount !== null && item.amount !== undefined ? (
                              <div className="font-semibold text-xs text-foreground font-mono">
                                {Number(item.amount).toLocaleString()} <span className="text-[10px] text-muted-foreground font-sans">ر.س</span>
                              </div>
                            ) : (
                              <span className="text-xs text-muted-foreground">—</span>
                            )}
                          </TableCell>

                          <TableCell className="align-top py-3 text-right">
                            <Badge
                              variant="outline"
                              className="border-amber-300 text-amber-800 bg-amber-50/70 dark:bg-amber-950/30 dark:text-amber-300 dark:border-amber-800 text-[11px] font-medium"
                            >
                              {item.statusLabel}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}

            {items.length > pageSize && (
              <div className="flex items-center justify-between p-4 border-t border-border/40 text-xs text-muted-foreground">
                <div>
                  عرض {((page - 1) * pageSize) + 1} إلى {Math.min(page * pageSize, items.length)} من أصل {items.length} معاملة
                </div>
                <div className="flex items-center gap-1.5">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="h-8 px-2.5 text-xs cursor-pointer"
                  >
                    <ChevronRight className="h-3.5 w-3.5 ml-1" />
                    <span>السابق</span>
                  </Button>
                  <span className="px-2 font-bold text-foreground">
                    {page} / {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="h-8 px-2.5 text-xs cursor-pointer"
                  >
                    <span>التالي</span>
                    <ChevronLeft className="h-3.5 w-3.5 mr-1" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
