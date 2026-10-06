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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { usePermission } from "@/hooks/usePermission";
import { cn } from "@/lib/utils";
import {
  CheckSquare,
  Loader2,
  FileText,
  Receipt,
  ClipboardList,
  Sparkles,
  Check,
  X,
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
} from "lucide-react";
import { SaudiRiyal } from "@/components/SaudiRiyal";

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

  // التحقق من الصلاحيات والوصول
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

  const hasApprovalPerm =
    usePermission("financial_approval.approve") ||
    usePermission("financial_approval.view") ||
    isSuperOrSystem ||
    isExecDirector ||
    isFinancialRole;

  // تبويبات الصفحة
  const [activeTab, setActiveTab] = useState<"hub" | "quotations">(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("tab") === "quotations" || (params.get("requestId") && params.get("mode") === "quotations")) {
        return "quotations";
      }
    }
    return "hub";
  });

  // حالة التصفية لمركز الاعتمادات
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
    refetch: refetchApprovals,
    isRefetching: approvalsRefetching,
  } = trpc.approvals.getPendingApprovals.useQuery(
    {
      category: categoryFilter !== "all" ? categoryFilter : undefined,
      approver: approverFilter !== "all" ? approverFilter : undefined,
      search: debouncedSearch || undefined,
      onlyMine: onlyMine || undefined,
    },
    {
      refetchInterval: 15000,
    }
  );

  // تقسيم صفحات جدول الاعتمادات
  const items = approvalsData?.items || [];
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const paginatedItems = useMemo(() => {
    const start = (page - 1) * pageSize;
    return items.slice(start, start + pageSize);
  }, [items, page, pageSize]);

  // حالة الطلب المحدد لمقارنة عروض الأسعار
  const [selectedRequestId, setSelectedRequestId] = useState<string>(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      return params.get("requestId") || "";
    }
    return "";
  });

  const { data: requests } = trpc.requests.search.useQuery(
    { currentStage: "financial_eval_and_approval" },
    { enabled: activeTab === "quotations" }
  );

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
              مركز موحد لمتابعة واعتماد كافة الطلبات والمعاملات المعلقة عبر مختلف أقسام البوابة
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Tabs
              value={activeTab}
              onValueChange={(val) => setActiveTab(val as "hub" | "quotations")}
              className="w-auto"
            >
              <TabsList className="bg-muted p-1">
                <TabsTrigger value="hub" className="gap-1.5 text-xs font-bold">
                  <CheckSquare className="h-3.5 w-3.5" />
                  مركز الاعتمادات
                </TabsTrigger>
                <TabsTrigger value="quotations" className="gap-1.5 text-xs font-bold">
                  <ClipboardList className="h-3.5 w-3.5" />
                  مقارنة عروض الأسعار
                </TabsTrigger>
              </TabsList>
            </Tabs>

            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                refetchApprovals();
                toast.success("تم تحديث قائمة الاعتمادات");
              }}
              disabled={approvalsRefetching}
              className="gap-1 text-xs h-9"
            >
              <RotateCcw className={cn("h-3.5 w-3.5", approvalsRefetching && "animate-spin text-primary")} />
              تحديث
            </Button>
          </div>
        </div>

        {/* ==================== التبويب الأول: مركز الاعتمادات الموحد ==================== */}
        {activeTab === "hub" && (
          <div className="space-y-6">
            {/* بطاقات المؤشرات الإحصائية */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="border-border/60 shadow-xs hover:border-primary/40 transition-colors">
                <CardContent className="p-4 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">إجمالي المعاملات المعلقة</p>
                    <p className="text-2xl font-black mt-1 text-foreground">
                      {approvalsLoading ? (
                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                      ) : (
                        approvalsData?.counts?.total ?? 0
                      )}
                    </p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">طلب ومعاملة بانتظار الاعتماد</p>
                  </div>
                  <div className="h-11 w-11 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                    <Clock className="h-5.5 w-5.5" />
                  </div>
                </CardContent>
              </Card>

              <Card className="border-rose-200/60 dark:border-rose-900/40 shadow-xs hover:border-rose-300 transition-colors">
                <CardContent className="p-4 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-rose-700 dark:text-rose-400">بانتظار المدير التنفيذي</p>
                    <p className="text-2xl font-black mt-1 text-rose-700 dark:text-rose-300">
                      {approvalsLoading ? (
                        <Loader2 className="h-6 w-6 animate-spin text-rose-400" />
                      ) : (
                        approvalsData?.counts?.pendingExecutive ?? 0
                      )}
                    </p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">أوامر شراء، عهد، وتقارير</p>
                  </div>
                  <div className="h-11 w-11 rounded-xl bg-rose-50 dark:bg-rose-950/50 flex items-center justify-center text-rose-600 dark:text-rose-400">
                    <ShieldCheck className="h-5.5 w-5.5" />
                  </div>
                </CardContent>
              </Card>

              <Card className="border-amber-200/60 dark:border-amber-900/40 shadow-xs hover:border-amber-300 transition-colors">
                <CardContent className="p-4 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-amber-700 dark:text-amber-400">بانتظار المسؤول المالي</p>
                    <p className="text-2xl font-black mt-1 text-amber-700 dark:text-amber-300">
                      {approvalsLoading ? (
                        <Loader2 className="h-6 w-6 animate-spin text-amber-400" />
                      ) : (
                        approvalsData?.counts?.pendingFinancial ?? 0
                      )}
                    </p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">أوامر صرف وسندات قبض</p>
                  </div>
                  <div className="h-11 w-11 rounded-xl bg-amber-50 dark:bg-amber-950/50 flex items-center justify-center text-amber-600 dark:text-amber-400">
                    <Banknote className="h-5.5 w-5.5" />
                  </div>
                </CardContent>
              </Card>

              <Card className="border-blue-200/60 dark:border-blue-900/40 shadow-xs hover:border-blue-300 transition-colors">
                <CardContent className="p-4 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-blue-700 dark:text-blue-400">جهات اعتماد أخرى</p>
                    <p className="text-2xl font-black mt-1 text-blue-700 dark:text-blue-300">
                      {approvalsLoading ? (
                        <Loader2 className="h-6 w-6 animate-spin text-blue-400" />
                      ) : (
                        approvalsData?.counts?.pendingOther ?? 0
                      )}
                    </p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">مدراء المشاريع وأصحاب الصلاحية</p>
                  </div>
                  <div className="h-11 w-11 rounded-xl bg-blue-50 dark:bg-blue-950/50 flex items-center justify-center text-blue-600 dark:text-blue-400">
                    <FileText className="h-5.5 w-5.5" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* أدوات البحث والفلترة */}
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
                        className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        <X className="h-3.5 w-3.5" />
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
                        className="w-full text-xs h-9 font-bold gap-1"
                      >
                        <ShieldCheck className="h-3.5 w-3.5" />
                        اعتماداتي فقط
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
                        className="text-xs h-9 text-muted-foreground hover:text-foreground"
                        title="إعادة ضبط الفلاتر"
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* جدول المعاملات المعلقة */}
            <Card className="border-border/60 shadow-xs">
              <CardHeader className="pb-3 border-b border-border/40">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <CheckSquare className="h-5 w-5 text-primary" />
                    <CardTitle className="text-base font-bold text-foreground">
                      قائمة الطلبات بانتظار الاعتماد
                    </CardTitle>
                    <Badge variant="outline" className="text-xs font-semibold px-2">
                      {approvalsData?.totalFiltered ?? 0} نتيجة
                    </Badge>
                  </div>
                  <CardDescription className="text-xs">
                    انقر على رقم الطلب أو زر "معاينة واعتماد" للانتقال المباشر للطلب وإتمام الإجراء
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
                          <TableHead className="text-right text-xs font-bold text-foreground w-[240px]">الطلب / المعاملة</TableHead>
                          <TableHead className="text-right text-xs font-bold text-foreground w-[150px]">التصنيف داخل البوابة</TableHead>
                          <TableHead className="text-right text-xs font-bold text-foreground w-[180px]">مقدم الطلب</TableHead>
                          <TableHead className="text-right text-xs font-bold text-foreground w-[170px]">المسؤول عن الاعتماد</TableHead>
                          <TableHead className="text-right text-xs font-bold text-foreground w-[130px]">القيمة / المبلغ</TableHead>
                          <TableHead className="text-right text-xs font-bold text-foreground w-[160px]">الحالة الحالية</TableHead>
                          <TableHead className="text-center text-xs font-bold text-foreground w-[130px]">الإجراء</TableHead>
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
                                    className="text-xs font-bold text-primary hover:underline block text-right font-mono"
                                  >
                                    {item.itemNumber}
                                  </button>
                                  <p className="text-xs font-medium text-foreground line-clamp-2" title={item.title}>
                                    {item.title}
                                  </p>
                                  <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                                    <Clock className="h-3 w-3 text-muted-foreground/70" />
                                    {item.createdAt ? new Date(item.createdAt).toLocaleDateString("ar-SA") : "—"}
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
                                    <SaudiRiyal amount={item.amount} />
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

                              <TableCell className="align-top py-3 text-center">
                                <Button
                                  size="sm"
                                  onClick={() => navigate(item.link)}
                                  className="h-8 text-xs font-bold gap-1 bg-primary hover:bg-primary/90 text-primary-foreground shadow-xs"
                                >
                                  <span>معاينة واعتماد</span>
                                  <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                                </Button>
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
                        className="h-8 px-2.5 text-xs"
                      >
                        <ChevronRight className="h-3.5 w-3.5 ml-1" />
                        السابق
                      </Button>
                      <span className="px-2 font-bold text-foreground">
                        {page} / {totalPages}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                        disabled={page === totalPages}
                        className="h-8 px-2.5 text-xs"
                      >
                        التالي
                        <ChevronLeft className="h-3.5 w-3.5 mr-1" />
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* ==================== التبويب الثاني: مقارنة عروض أسعار المشاريع ==================== */}
        {activeTab === "quotations" && (
          <QuotationComparisonTab
            selectedRequestId={selectedRequestId}
            setSelectedRequestId={setSelectedRequestId}
            requests={requests}
          />
        )}
      </div>
    </DashboardLayout>
  );
}

// مكوّن مقارنة عروض أسعار المشاريع وجدول الكميات (مفصول لضمان ثبات ترتيب الـ Hooks)
function QuotationComparisonTab({
  selectedRequestId,
  setSelectedRequestId,
  requests,
}: {
  selectedRequestId: string;
  setSelectedRequestId: (id: string) => void;
  requests: any;
}) {
  const [, navigate] = useLocation();
  const utils = trpc.useUtils();

  const [selectedQuotationId, setSelectedQuotationId] = useState<number | null>(null);
  const [selectedWinningVendors, setSelectedWinningVendors] = useState<Record<number, number>>({});
  const [showApprovalDialog, setShowApprovalDialog] = useState(false);
  const [approvalNotes, setApprovalNotes] = useState("");

  const { data: boqData, isLoading: boqLoading } = trpc.projects.getBOQ.useQuery(
    { requestId: parseInt(selectedRequestId) || 0 },
    { enabled: !!selectedRequestId }
  );

  const { data: quotationsData, isLoading: quotationsLoading } = trpc.projects.getQuotationsByRequest.useQuery(
    { requestId: parseInt(selectedRequestId) || 0 },
    { enabled: !!selectedRequestId }
  );

  const { data: requestDetails } = trpc.requests.getById.useQuery(
    { id: parseInt(selectedRequestId) || 0 },
    { enabled: !!selectedRequestId }
  );

  const requestList = useMemo(() => {
    const list = requests?.requests ? [...requests.requests] : [];
    if (selectedRequestId && requestDetails) {
      const exists = list.some((r: any) => String(r.id) === String(selectedRequestId));
      if (!exists) {
        list.unshift(requestDetails as any);
      }
    }
    return list;
  }, [requests?.requests, selectedRequestId, requestDetails]);

  const currentProgramType = (requestDetails as any)?.programType;
  const isSedanaProgram = currentProgramType === "sedana";

  const allQuotations = useMemo(() => {
    const list = quotationsData?.quotations ? [...quotationsData.quotations] : [];
    return list.sort((a: any, b: any) => {
      const aTotal = parseFloat(String(a.totalAmount || "0").replace(/,/g, ""));
      const bTotal = parseFloat(String(b.totalAmount || "0").replace(/,/g, ""));
      return aTotal - bTotal;
    });
  }, [quotationsData?.quotations]);

  useEffect(() => {
    setSelectedWinningVendors({});
    setSelectedQuotationId(null);
    setApprovalNotes("");
  }, [selectedRequestId]);

  const parseQuotationItems = (raw: any): any[] => {
    if (!raw) return [];
    if (Array.isArray(raw)) return raw;
    if (typeof raw === "string") {
      try {
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
      } catch (_) {
        return [];
      }
    }
    return [];
  };

  const getOfferForItem = (item: any, quotation: any, totalBoqItemsCount: number = 1) => {
    if (!item || !quotation) return null;
    const itemsArr = parseQuotationItems(quotation.items);
    const qty = parseFloat(String(item.quantity || 1).replace(/,/g, "")) || 1;

    if (itemsArr && itemsArr.length > 0) {
      const itemOffer = itemsArr.find((it: any) => {
        if (!it) return false;
        const itBoqId = it.boqItemId ?? it.boq_item_id ?? it.itemId ?? it.id;
        if (itBoqId !== undefined && String(itBoqId) === String(item.id)) return true;
        const itName = String(it.itemName ?? it.item_name ?? it.name ?? it.title ?? "").trim().toLowerCase();
        const targetName = String(item.itemName || "").trim().toLowerCase();
        return itName && targetName && (itName === targetName || targetName.includes(itName) || itName.includes(targetName));
      });

      if (itemOffer) {
        const rawUnitPrice = itemOffer.unitPrice ?? itemOffer.unit_price ?? itemOffer.price ?? itemOffer.rate ?? itemOffer.amount;
        const rawTotPrice = itemOffer.totalPrice ?? itemOffer.total_price;

        if (rawUnitPrice !== undefined && rawUnitPrice !== null && String(rawUnitPrice).trim() !== "") {
          const uPrice = parseFloat(String(rawUnitPrice).replace(/,/g, ""));
          if (!isNaN(uPrice) && uPrice >= 0) {
            let tPrice =
              rawTotPrice !== undefined && rawTotPrice !== null && String(rawTotPrice).trim() !== ""
                ? parseFloat(String(rawTotPrice).replace(/,/g, ""))
                : uPrice * qty;
            if (isNaN(tPrice) || tPrice < 0) tPrice = uPrice * qty;
            return { unitPrice: uPrice, totalPrice: tPrice };
          }
        } else if (rawTotPrice !== undefined && rawTotPrice !== null && String(rawTotPrice).trim() !== "") {
          const tPrice = parseFloat(String(rawTotPrice).replace(/,/g, ""));
          if (!isNaN(tPrice) && tPrice >= 0) {
            return { unitPrice: qty > 0 ? tPrice / qty : 0, totalPrice: tPrice };
          }
        }
      }
    }

    const qTotal = parseFloat(String(quotation.totalAmount || "0").replace(/,/g, ""));
    if (!isNaN(qTotal) && qTotal > 0 && totalBoqItemsCount > 0) {
      const approxTotPrice = qTotal / totalBoqItemsCount;
      return {
        unitPrice: qty > 0 ? approxTotPrice / qty : approxTotPrice,
        totalPrice: approxTotPrice,
        isApproximated: true,
      };
    }

    return null;
  };

  const boqItemsCount = (boqData?.items || []).length || 1;

  const lowestOffersByItem = useMemo(() => {
    const result: Record<number, { quotationId: number; offer: { unitPrice: number; totalPrice: number } }> = {};
    if (!boqData?.items || allQuotations.length === 0) return result;

    boqData.items.forEach((item: any) => {
      let lowestOffer: { quotationId: number; offer: { unitPrice: number; totalPrice: number } } | null = null;
      allQuotations.forEach((quotation: any) => {
        const offer = getOfferForItem(item, quotation, boqItemsCount);
        if (offer && offer.totalPrice > 0) {
          if (!lowestOffer || offer.totalPrice < lowestOffer.offer.totalPrice) {
            lowestOffer = { quotationId: quotation.id, offer };
          }
        }
      });
      if (lowestOffer) {
        result[item.id] = lowestOffer;
      }
    });

    return result;
  }, [boqData?.items, allQuotations, boqItemsCount]);

  const handleAutoSelectLowestPrices = () => {
    const newWinning: Record<number, number> = {};
    Object.entries(lowestOffersByItem).forEach(([itemId, data]) => {
      newWinning[parseInt(itemId)] = data.quotationId;
    });
    setSelectedWinningVendors(newWinning);
    toast.success("تم اختيار عروض الأسعار الأقل تكلفة لكافة البنود بنجاح");
  };

  const handleSelectVendorForEntireColumn = (quotationId: number) => {
    if (!boqData?.items) return;
    const newWinning: Record<number, number> = { ...selectedWinningVendors };
    boqData.items.forEach((item: any) => {
      newWinning[item.id] = quotationId;
    });
    setSelectedWinningVendors(newWinning);
    setSelectedQuotationId(quotationId);
    toast.success("تم تحديد هذا المورد لكافة بنود جدول الكميات");
  };

  const hasBoq = boqData?.items && boqData.items.length > 0;
  const hasQuotations = quotationsData?.quotations && quotationsData.quotations.length > 0;
  const isLoading = boqLoading || quotationsLoading;

  const approveMutation = trpc.requests.selectQuotationAndAdvanceStage.useMutation({
    onSuccess: () => {
      toast.success("تم الاعتماد المالي والانتقال لمرحلة التعاقد بنجاح");
      setShowApprovalDialog(false);
      utils.requests.search.invalidate();
      utils.requests.getById.invalidate();
      utils.approvals.getPendingApprovals.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || "حدث خطأ أثناء الاعتماد المالي");
    },
  });

  const approveMultiVendorMutation = trpc.requests.selectQuotationAndAdvanceStageMultiVendor.useMutation({
    onSuccess: () => {
      toast.success("تم اعتماد التكلفة واختيار الموردين الفائزين بنجاح والانتقال للتعاقد");
      setShowApprovalDialog(false);
      utils.requests.search.invalidate();
      utils.requests.getById.invalidate();
      utils.approvals.getPendingApprovals.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || "حدث خطأ أثناء الاعتماد المالي متعدد الموردين");
    },
  });

  const handleConfirmApproval = () => {
    if (isSedanaProgram && Object.keys(selectedWinningVendors).length > 0) {
      approveMultiVendorMutation.mutate({
        requestId: parseInt(selectedRequestId),
        winningVendors: selectedWinningVendors,
        approvalNotes,
        advanceStage: true,
      });
    } else {
      approveMutation.mutate({
        requestId: parseInt(selectedRequestId),
        approvalNotes,
      });
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            اختيار الطلب لمقارنة عروض الأسعار
          </CardTitle>
          <CardDescription>
            اختر الطلب لمراجعة بنود جدول الكميات ومقارنة عروض أسعار الموردين واعتماد التكلفة النهائية
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <Label>الطلب</Label>
              <Select
                value={selectedRequestId}
                onValueChange={(value) => {
                  setSelectedRequestId(value);
                }}
              >
                <SelectTrigger className="text-right">
                  <SelectValue placeholder="اختر الطلب..." />
                </SelectTrigger>
                <SelectContent dir="rtl">
                  {requestList.map((request: any) => (
                    <SelectItem key={request.id} value={request.id.toString()}>
                      {request.requestNumber} - {request.mosqueName || request.descriptiveName || request.programName || `طلب #${request.id}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {selectedRequestId && (
        <>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <>
              {!hasBoq && (
                <Card className="border-red-500">
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-4 text-red-600">
                      <ClipboardList className="h-8 w-8" />
                      <div>
                        <p className="font-medium">لا يوجد جدول كميات</p>
                        <p className="text-sm">يجب إعداد جدول الكميات أولاً قبل الاعتماد المالي</p>
                        <Button
                          variant="outline"
                          size="sm"
                          className="mt-2"
                          onClick={() => navigate(`/projects/boq?requestId=${selectedRequestId}`)}
                        >
                          إعداد جدول الكميات
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {hasBoq && !hasQuotations && (
                <Card className="border-yellow-500">
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-4 text-yellow-600">
                      <Receipt className="h-8 w-8" />
                      <div>
                        <p className="font-medium">لا توجد عروض أسعار</p>
                        <p className="text-sm">يجب إضافة عروض أسعار من الموردين قبل الاعتماد المالي</p>
                        <Button
                          variant="outline"
                          size="sm"
                          className="mt-2"
                          onClick={() => navigate(`/quotations?requestId=${selectedRequestId}`)}
                        >
                          إضافة عروض أسعار
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {hasQuotations && hasBoq && (
                <Card className="shadow-xs border-primary/20">
                  <CardHeader className="pb-4">
                    <div className="flex items-start justify-between gap-4 flex-wrap">
                      <div>
                        <CardTitle className="flex items-center gap-2 text-xl font-extrabold text-foreground">
                          <ClipboardList className="h-5.5 w-5.5 text-primary" />
                          جدول الكميات ومقارنة عروض أسعار الموردين
                          {requestDetails?.programName ? ` (${requestDetails.programName})` : ""}
                        </CardTitle>
                        <CardDescription className="mt-1">
                          انقر على زر <strong>"اختر"</strong> أعلى عمود المورد المطلوب لاعتماده لكافة البنود
                        </CardDescription>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          onClick={handleAutoSelectLowestPrices}
                          variant="outline"
                          size="sm"
                          className="text-emerald-700 dark:text-emerald-300 border-emerald-500/40 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 gap-1.5 h-8 text-xs font-bold"
                        >
                          <Sparkles className="h-3.5 w-3.5 text-emerald-600" />
                          اختيار الأقل سعراً تلقائياً
                        </Button>

                        <Button
                          onClick={() => setShowApprovalDialog(true)}
                          size="sm"
                          className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-8 text-xs gap-1.5 shadow-xs"
                        >
                          <Check className="h-3.5 w-3.5" />
                          اعتماد التكلفة والانتقال للتعاقد
                        </Button>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent>
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="text-right w-[60px]">م</TableHead>
                            <TableHead className="text-right min-w-[200px]">البند</TableHead>
                            <TableHead className="text-center w-[80px]">الكمية</TableHead>
                            <TableHead className="text-center w-[80px]">الوحدة</TableHead>
                            {allQuotations.map((quotation: any) => (
                              <TableHead key={quotation.id} className="text-center min-w-[140px]">
                                <div className="space-y-1 py-1">
                                  <p className="font-bold text-xs truncate">{quotation.supplierName || "مورد"}</p>
                                  <Button
                                    size="xs"
                                    variant="outline"
                                    onClick={() => handleSelectVendorForEntireColumn(quotation.id)}
                                    className="h-6 text-[11px] px-2"
                                  >
                                    اختر الكل
                                  </Button>
                                </div>
                              </TableHead>
                            ))}
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {(boqData?.items || []).map((item: any, idx: number) => (
                            <TableRow key={item.id}>
                              <TableCell className="text-right font-mono text-xs">{idx + 1}</TableCell>
                              <TableCell className="text-right font-medium text-xs">{item.itemName}</TableCell>
                              <TableCell className="text-center font-mono text-xs">{item.quantity}</TableCell>
                              <TableCell className="text-center text-xs">{item.unit || "وحدة"}</TableCell>
                              {allQuotations.map((quotation: any) => {
                                const offer = getOfferForItem(item, quotation, boqItemsCount);
                                const isWinner = selectedWinningVendors[item.id] === quotation.id;
                                return (
                                  <TableCell
                                    key={quotation.id}
                                    className={cn(
                                      "text-center text-xs font-mono",
                                      isWinner && "bg-emerald-50 dark:bg-emerald-950/30 font-bold text-emerald-700"
                                    )}
                                  >
                                    {offer ? (
                                      <div>
                                        <SaudiRiyal amount={offer.totalPrice} />
                                      </div>
                                    ) : (
                                      <span className="text-muted-foreground">—</span>
                                    )}
                                  </TableCell>
                                );
                              })}
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </>
      )}

      {/* حوار تأكيد اعتماد عرض السعر */}
      <Dialog open={showApprovalDialog} onOpenChange={setShowApprovalDialog}>
        <DialogContent dir="rtl" className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-right">تأكيد الاعتماد المالي</DialogTitle>
            <DialogDescription className="text-right">
              هل أنت متأكد من اعتماد التكلفة والانتقال لمرحلة التعاقد؟
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>ملاحظات الاعتماد (اختياري)</Label>
              <Textarea
                value={approvalNotes}
                onChange={(e) => setApprovalNotes(e.target.value)}
                placeholder="أدخل أي ملاحظات حول الاعتماد المالي..."
                className="text-right text-xs"
              />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setShowApprovalDialog(false)}>
              إلغاء
            </Button>
            <Button
              onClick={handleConfirmApproval}
              disabled={approveMultiVendorMutation.isPending || approveMutation.isPending}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {(approveMultiVendorMutation.isPending || approveMutation.isPending) && (
                <Loader2 className="h-4 w-4 ml-2 animate-spin" />
              )}
              تأكيد الاعتماد والانتقال للتعاقد
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
