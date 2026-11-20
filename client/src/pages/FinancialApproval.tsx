import { useState, useEffect, useMemo } from "react";
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
import { SaudiRiyal } from "@/components/SaudiRiyal";
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
  Receipt,
  Eye,
} from "lucide-react";
import { useDocumentTitle } from "@/contexts/DocumentTitleContext";

const CATEGORY_CONFIG: Record<
  string,
  {
    label: string;
    pluralLabel: string;
    icon: any;
    badgeClass: string;
    borderRClass: string;
    rowBgClass: string;
    iconContainerClass: string;
    dotClass: string;
    pillClass: string;
  }
> = {
  progress_invoice: {
    label: "مستخلص",
    pluralLabel: "المستخلصات",
    icon: Receipt,
    badgeClass:
      "bg-emerald-100/90 text-emerald-900 border-emerald-300 dark:bg-emerald-950/70 dark:text-emerald-300 dark:border-emerald-700",
    borderRClass: "border-r-4 border-r-emerald-500 dark:border-r-emerald-400",
    rowBgClass:
      "bg-emerald-50/70 hover:bg-emerald-100/80 dark:bg-emerald-950/30 dark:hover:bg-emerald-900/40",
    iconContainerClass:
      "bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700 shadow-xs",
    dotClass: "bg-emerald-500 dark:bg-emerald-400",
    pillClass:
      "bg-emerald-100/90 text-emerald-900 dark:bg-emerald-950/70 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700",
  },
  disbursement_request: {
    label: "طلب صرف",
    pluralLabel: "طلبات الصرف",
    icon: Banknote,
    badgeClass:
      "bg-teal-100/90 text-teal-900 border-teal-300 dark:bg-teal-950/70 dark:text-teal-300 dark:border-teal-700",
    borderRClass: "border-r-4 border-r-teal-500 dark:border-r-teal-400",
    rowBgClass:
      "bg-teal-50/70 hover:bg-teal-100/80 dark:bg-teal-950/30 dark:hover:bg-teal-900/40",
    iconContainerClass:
      "bg-teal-100 dark:bg-teal-950/70 text-teal-700 dark:text-teal-300 border border-teal-300 dark:border-teal-700 shadow-xs",
    dotClass: "bg-teal-500 dark:bg-teal-400",
    pillClass:
      "bg-teal-100/90 text-teal-900 dark:bg-teal-950/70 dark:text-teal-300 border-teal-300 dark:border-teal-700",
  },
  disbursement_order: {
    label: "أمر صرف",
    pluralLabel: "أوامر الصرف",
    icon: FileText,
    badgeClass:
      "bg-blue-100/90 text-blue-900 border-blue-300 dark:bg-blue-950/70 dark:text-blue-300 dark:border-blue-700",
    borderRClass: "border-r-4 border-r-blue-500 dark:border-r-blue-400",
    rowBgClass:
      "bg-blue-50/70 hover:bg-blue-100/80 dark:bg-blue-950/30 dark:hover:bg-blue-900/40",
    iconContainerClass:
      "bg-blue-100 dark:bg-blue-950/70 text-blue-700 dark:text-blue-300 border border-blue-300 dark:border-blue-700 shadow-xs",
    dotClass: "bg-blue-500 dark:bg-blue-400",
    pillClass:
      "bg-blue-100/90 text-blue-900 dark:bg-blue-950/70 dark:text-blue-300 border-blue-300 dark:border-blue-700",
  },
  receipt_voucher: {
    label: "سند قبض",
    pluralLabel: "سندات القبض",
    icon: Coins,
    badgeClass:
      "bg-indigo-100/90 text-indigo-900 border-indigo-300 dark:bg-indigo-950/70 dark:text-indigo-300 dark:border-indigo-700",
    borderRClass: "border-r-4 border-r-indigo-500 dark:border-r-indigo-400",
    rowBgClass:
      "bg-indigo-50/70 hover:bg-indigo-100/80 dark:bg-indigo-950/30 dark:hover:bg-indigo-900/40",
    iconContainerClass:
      "bg-indigo-100 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 border border-indigo-300 dark:border-indigo-700 shadow-xs",
    dotClass: "bg-indigo-500 dark:bg-indigo-400",
    pillClass:
      "bg-indigo-100/90 text-indigo-900 dark:bg-indigo-950/70 dark:text-indigo-300 border-indigo-300 dark:border-indigo-700",
  },
  custody_request: {
    label: "عهدة مالية",
    pluralLabel: "العهد المالية",
    icon: Wallet,
    badgeClass:
      "bg-sky-100/90 text-sky-900 border-sky-300 dark:bg-sky-950/70 dark:text-sky-300 dark:border-sky-700",
    borderRClass: "border-r-4 border-r-sky-500 dark:border-r-sky-400",
    rowBgClass:
      "bg-sky-50/70 hover:bg-sky-100/80 dark:bg-sky-950/30 dark:hover:bg-sky-900/40",
    iconContainerClass:
      "bg-sky-100 dark:bg-sky-950/70 text-sky-700 dark:text-sky-300 border border-sky-300 dark:border-sky-700 shadow-xs",
    dotClass: "bg-sky-500 dark:bg-sky-400",
    pillClass:
      "bg-sky-100/90 text-sky-900 dark:bg-sky-950/70 dark:text-sky-300 border-sky-300 dark:border-sky-700",
  },
  contract: {
    label: "عقد",
    pluralLabel: "العقود",
    icon: FileText,
    badgeClass:
      "bg-purple-100/90 text-purple-900 border-purple-300 dark:bg-purple-950/70 dark:text-purple-300 dark:border-purple-700",
    borderRClass: "border-r-4 border-r-purple-500 dark:border-r-purple-400",
    rowBgClass:
      "bg-purple-50/70 hover:bg-purple-100/80 dark:bg-purple-950/30 dark:hover:bg-purple-900/40",
    iconContainerClass:
      "bg-purple-100 dark:bg-purple-950/70 text-purple-700 dark:text-purple-300 border border-purple-300 dark:border-purple-700 shadow-xs",
    dotClass: "bg-purple-500 dark:bg-purple-400",
    pillClass:
      "bg-purple-100/90 text-purple-900 dark:bg-purple-950/70 dark:text-purple-300 border-purple-300 dark:border-purple-700",
  },
  purchase_order: {
    label: "أمر شراء",
    pluralLabel: "أوامر الشراء",
    icon: ShoppingCart,
    badgeClass:
      "bg-rose-100/90 text-rose-900 border-rose-300 dark:bg-rose-950/70 dark:text-rose-300 dark:border-rose-700",
    borderRClass: "border-r-4 border-r-rose-500 dark:border-r-rose-400",
    rowBgClass:
      "bg-rose-50/70 hover:bg-rose-100/80 dark:bg-rose-950/30 dark:hover:bg-rose-900/40",
    iconContainerClass:
      "bg-rose-100 dark:bg-rose-950/70 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-700 shadow-xs",
    dotClass: "bg-rose-500 dark:bg-rose-400",
    pillClass:
      "bg-rose-100/90 text-rose-900 dark:bg-rose-950/70 dark:text-rose-300 border-rose-300 dark:border-rose-700",
  },
  progress_report: {
    label: "تقرير إنجاز",
    pluralLabel: "تقارير الإنجاز",
    icon: Layers,
    badgeClass:
      "bg-amber-100/90 text-amber-900 border-amber-300 dark:bg-amber-950/70 dark:text-amber-300 dark:border-amber-700",
    borderRClass: "border-r-4 border-r-amber-500 dark:border-r-amber-400",
    rowBgClass:
      "bg-amber-50/70 hover:bg-amber-100/80 dark:bg-amber-950/30 dark:hover:bg-amber-900/40",
    iconContainerClass:
      "bg-amber-100 dark:bg-amber-950/70 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-700 shadow-xs",
    dotClass: "bg-amber-500 dark:bg-amber-400",
    pillClass:
      "bg-amber-100/90 text-amber-900 dark:bg-amber-950/70 dark:text-amber-300 border-amber-300 dark:border-amber-700",
  },
  project_quotation: {
    label: "اعتماد مالي للطلب",
    pluralLabel: "اعتمادات الطلبات",
    icon: CheckSquare,
    badgeClass:
      "bg-purple-100/90 text-purple-900 border-purple-300 dark:bg-purple-950/70 dark:text-purple-300 dark:border-purple-700",
    borderRClass: "border-r-4 border-r-purple-500 dark:border-r-purple-400",
    rowBgClass:
      "bg-purple-50/70 hover:bg-purple-100/80 dark:bg-purple-950/30 dark:hover:bg-purple-900/40",
    iconContainerClass:
      "bg-purple-100 dark:bg-purple-950/70 text-purple-700 dark:text-purple-300 border border-purple-300 dark:border-purple-700 shadow-xs",
    dotClass: "bg-purple-500 dark:bg-purple-400",
    pillClass:
      "bg-purple-100/90 text-purple-900 dark:bg-purple-950/70 dark:text-purple-300 border-purple-300 dark:border-purple-700",
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
    label: "صاحب الصلاحية",
    badgeClass:
      "bg-purple-50 text-purple-800 border-purple-300 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800 font-bold",
  },
};

// تعريف البطاقات الإحصائية المنفصلة لكافة الأصناف المعروضة في مركز الاعتمادات
const APPROVAL_CARDS = [
  {
    key: "all",
    label: "إجمالي المعاملات",
    subtitle: "كافة المعاملات المعلقة",
    icon: Clock,
    border: "border-border/60 hover:border-primary/50",
    activeRing: "ring-2 ring-primary/20 border-primary/60 bg-primary/[0.03]",
    textColor: "text-foreground",
    iconBg: "bg-primary/10 text-primary",
  },
  {
    key: "progress_invoice",
    label: "مستخلصات تحتاج اعتماد",
    subtitle: "بانتظار تدقيق وصرف المستخلص",
    icon: Receipt,
    border: "border-emerald-200/60 dark:border-emerald-900/40 hover:border-emerald-400",
    activeRing: "ring-2 ring-emerald-500/20 border-emerald-500 bg-emerald-50/20 dark:bg-emerald-950/20",
    textColor: "text-emerald-700 dark:text-emerald-300",
    iconBg: "bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400",
  },
  {
    key: "disbursement_request",
    label: "طلبات الصرف",
    subtitle: "قيد المراجعة والاعتماد",
    icon: Banknote,
    border: "border-teal-200/60 dark:border-teal-900/40 hover:border-teal-400",
    activeRing: "ring-2 ring-teal-500/20 border-teal-500 bg-teal-50/20 dark:bg-teal-950/20",
    textColor: "text-teal-700 dark:text-teal-300",
    iconBg: "bg-teal-50 dark:bg-teal-950/50 text-teal-600 dark:text-teal-400",
  },
  {
    key: "disbursement_order",
    label: "أوامر الصرف",
    subtitle: "بانتظار تدقيق الصرف",
    icon: FileText,
    border: "border-blue-200/60 dark:border-blue-900/40 hover:border-blue-400",
    activeRing: "ring-2 ring-blue-500/20 border-blue-500 bg-blue-50/20 dark:bg-blue-950/20",
    textColor: "text-blue-700 dark:text-blue-300",
    iconBg: "bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400",
  },
  {
    key: "receipt_voucher",
    label: "سندات القبض",
    subtitle: "بانتظار الاعتماد المالي",
    icon: Coins,
    border: "border-indigo-200/60 dark:border-indigo-900/40 hover:border-indigo-400",
    activeRing: "ring-2 ring-indigo-500/20 border-indigo-500 bg-indigo-50/20 dark:bg-indigo-950/20",
    textColor: "text-indigo-700 dark:text-indigo-300",
    iconBg: "bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400",
  },
  {
    key: "custody_request",
    label: "العهد المالية",
    subtitle: "بانتظار تدقيق العهدة",
    icon: Wallet,
    border: "border-cyan-200/60 dark:border-cyan-900/40 hover:border-cyan-400",
    activeRing: "ring-2 ring-cyan-500/20 border-cyan-500 bg-cyan-50/20 dark:bg-cyan-950/20",
    textColor: "text-cyan-700 dark:text-cyan-300",
    iconBg: "bg-cyan-50 dark:bg-cyan-950/50 text-cyan-600 dark:text-cyan-400",
  },
  {
    key: "contract",
    label: "العقود",
    subtitle: "بانتظار الاعتماد النهائي",
    icon: FileText,
    border: "border-purple-200/60 dark:border-purple-900/40 hover:border-purple-400",
    activeRing: "ring-2 ring-purple-500/20 border-purple-500 bg-purple-50/20 dark:bg-purple-950/20",
    textColor: "text-purple-700 dark:text-purple-300",
    iconBg: "bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400",
  },
  {
    key: "purchase_order",
    label: "أوامر الشراء",
    subtitle: "بانتظار اعتماد التوريد",
    icon: ShoppingCart,
    border: "border-rose-200/60 dark:border-rose-900/40 hover:border-rose-400",
    activeRing: "ring-2 ring-rose-500/20 border-rose-500 bg-rose-50/20 dark:bg-rose-950/20",
    textColor: "text-rose-700 dark:text-rose-300",
    iconBg: "bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400",
  },
  {
    key: "progress_report",
    label: "تقارير الإنجاز",
    subtitle: "بانتظار التدقيق والاعتماد",
    icon: Layers,
    border: "border-amber-200/60 dark:border-amber-900/40 hover:border-amber-400",
    activeRing: "ring-2 ring-amber-500/20 border-amber-500 bg-amber-50/20 dark:bg-amber-950/20",
    textColor: "text-amber-700 dark:text-amber-300",
    iconBg: "bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400",
  },
];

const categoryPermMap: Record<string, string> = {
  progress_invoice: "financial_approval.progress_invoices",
  disbursement_request: "financial_approval.disbursement_requests",
  disbursement_order: "financial_approval.disbursement_orders",
  custody_request: "financial_approval.custody_requests",
  receipt_voucher: "financial_approval.receipt_vouchers",
  contract: "financial_approval.contracts",
  purchase_order: "financial_approval.purchase_orders",
  progress_report: "financial_approval.progress_reports",
};

export default function FinancialApproval() {
  const [, navigate] = useLocation();
  const { user, loading: authLoading } = useAuth();
  useDocumentTitle("الاعتمادات");

  // جلب صلاحيات المستخدم بشكل مباشر لضمان عدم حدوث أي وميض أو تأخير في التحقق
  const { data: directPerms, isLoading: permsLoading } = trpc.permissions.getUserPermissions.useQuery(
    { userId: user?.id ?? 0 },
    { enabled: !!user, staleTime: 0 }
  );

  const isAuthOrPermsLoading = authLoading || (!!user && permsLoading);

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

  const userPerms: string[] = useMemo(() => {
    const set = new Set<string>();
    if (Array.isArray(directPerms)) {
      directPerms.forEach((p: string) => set.add(p));
    } else if (Array.isArray((user as any)?.permissions)) {
      (user as any).permissions.forEach((p: string) => set.add(p));
    }
    return Array.from(set);
  }, [user, directPerms]);

  const APPROVAL_PERMISSION_KEYS = [
    "financial_approval.progress_invoices",
    "financial_approval.disbursement_requests",
    "financial_approval.disbursement_orders",
    "financial_approval.custody_requests",
    "financial_approval.receipt_vouchers",
    "financial_approval.contracts",
    "financial_approval.purchase_orders",
    "financial_approval.progress_reports",
  ];

  const hasSpecificPerm = APPROVAL_PERMISSION_KEYS.some((key) => userPerms.includes(key));
  const hasApprovalPerm = hasSpecificPerm || userPerms.includes("financial_approval");

  const allowedCategoryCards = useMemo(() => {
    return APPROVAL_CARDS.filter((card) => {
      if (card.key === "all") return false;
      const reqPerm = categoryPermMap[card.key];
      return reqPerm && userPerms.includes(reqPerm);
    });
  }, [userPerms]);

  const visibleCards = useMemo(() => {
    if (allowedCategoryCards.length > 1) {
      return [APPROVAL_CARDS[0], ...allowedCategoryCards];
    }
    return allowedCategoryCards;
  }, [allowedCategoryCards]);

  // حالة التصفية والبحث لمركز الاعتمادات
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [onlyMine, setOnlyMine] = useState(false);
  const [page, setPage] = useState(1);
  const pageSize = 12;

  const effectiveCategory = useMemo(() => {
    if (allowedCategoryCards.length === 1) {
      return allowedCategoryCards[0].key;
    }
    return categoryFilter !== "all" ? categoryFilter : undefined;
  }, [allowedCategoryCards, categoryFilter]);

  useEffect(() => {
    if (allowedCategoryCards.length === 1) {
      if (categoryFilter !== allowedCategoryCards[0].key) {
        setCategoryFilter(allowedCategoryCards[0].key);
      }
    }
  }, [allowedCategoryCards, categoryFilter]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setPage(1);
    }, 250);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // استعلام مركز الاعتمادات الموحد - البحث والفلترة والـ pagination من الـ backend مباشرة
  const {
    data: approvalsData,
    isLoading: approvalsLoading,
  } = trpc.approvals.getPendingApprovals.useQuery(
    {
      category: effectiveCategory,
      search: debouncedSearch || undefined,
      onlyMine: onlyMine || undefined,
      page,
      pageSize,
    },
    {
      refetchInterval: 15000,
    }
  );

  const items = approvalsData?.items || [];
  const totalFiltered = approvalsData?.totalFiltered ?? 0;
  const totalPages = approvalsData?.totalPages ?? 1;

  // عناصر دلالات الألوان التفاعلية
  const legendCategories = useMemo(() => {
    return allowedCategoryCards.map((card) => {
      const conf = CATEGORY_CONFIG[card.key];
      return {
        key: card.key,
        label: conf?.pluralLabel || card.label,
        dotClass: conf?.dotClass || "bg-primary",
        pillClass: conf?.pillClass || "bg-muted text-foreground border-border",
      };
    });
  }, [allowedCategoryCards]);

  // أثناء تحميل الجلسة أو الصلاحيات، عرض مؤشر تحميل أنيق لمنع وميض "عذراً، الوصول غير مصرح به"
  if (isAuthOrPermsLoading || (!user && authLoading)) {
    return (
      <DashboardLayout tabletNavigation>
        <div className="flex flex-col items-center justify-center py-28 gap-3 px-4 text-center" dir="rtl">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground font-medium">جاري التحقق من الصلاحيات وتحديث البيانات...</p>
        </div>
      </DashboardLayout>
    );
  }

  // حظر المستخدمين غير المصرح لهم بعد اكتمال التحقق
  if (!hasApprovalPerm) {
    return (
      <DashboardLayout tabletNavigation>
        <div className="flex flex-col items-center justify-center py-20 text-center space-y-4 px-4" dir="rtl">
          <AlertCircle className="h-14 w-14 text-rose-500" />
          <h2 className="text-lg sm:text-xl font-bold">عذراً، الوصول غير مصرح به</h2>
          <p className="text-xs sm:text-sm text-muted-foreground max-w-md">
            شاشة الاعتمادات متاحة حصراً لمن يملكون صلاحيات الاعتماد المالي أو إدارة النظام.
          </p>
          <Button onClick={() => navigate("/dashboard")} variant="outline" className="mt-2 min-h-10 max-lg:min-h-11">
            العودة للرئيسية
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout tabletNavigation>
      <div className="w-full min-w-0 max-w-full overflow-x-hidden space-y-4 sm:space-y-6" dir="rtl">
        {/* ==================== رأس الصفحة ==================== */}
        <div className="flex items-center justify-between flex-wrap gap-3 sm:gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <h1 className="text-lg sm:text-2xl font-bold text-foreground">الاعتمادات</h1>
              {approvalsData?.counts?.total !== undefined && (
                <Badge className="bg-primary/10 text-primary border-primary/20 text-xs sm:text-sm px-2.5 py-0.5 font-bold font-mono">
                  {Number(approvalsData.counts.total).toLocaleString("en-US")} معلق
                </Badge>
              )}
            </div>
            <p className="text-muted-foreground text-xs sm:text-sm mt-1">
              مركز موحد لمتابعة واعتماد كافة المعاملات والطلبات المعلقة عبر مختلف أقسام البوابة
            </p>
          </div>
        </div>

        {/* ==================== بطاقات المؤشرات الإحصائية بحسب نوع المعاملة ==================== */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2.5 sm:gap-3">
          {visibleCards.map((card) => {
            const Icon = card.icon;
            const count =
              card.key === "all"
                ? approvalsData?.counts?.total ?? 0
                : approvalsData?.counts?.byCategory?.[card.key] ?? 0;

            const isActive =
              card.key === "all"
                ? categoryFilter === "all" && !onlyMine
                : categoryFilter === card.key;

            return (
              <Card
                key={card.key}
                onClick={() => {
                  if (card.key === "all") {
                    setCategoryFilter("all");
                    setOnlyMine(false);
                  } else {
                    if (allowedCategoryCards.length === 1) {
                      setCategoryFilter(card.key);
                    } else {
                      setCategoryFilter(categoryFilter === card.key ? "all" : card.key);
                    }
                  }
                  setPage(1);
                }}
                className={cn(
                  "shadow-xs transition-all cursor-pointer border py-0 gap-0 min-w-0",
                  card.border,
                  isActive && card.activeRing
                )}
              >
                <CardContent className="p-3 sm:p-3.5 flex items-center justify-between gap-2">
                  <div className="min-w-0 pr-0.5">
                    <p className={cn("text-[11px] sm:text-xs font-semibold truncate", card.textColor)}>
                      {card.label}
                    </p>
                    <p className="text-xl sm:text-2xl font-black mt-1 text-foreground leading-none font-mono">
                      {approvalsLoading ? (
                        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                      ) : (
                        Number(count).toLocaleString("en-US")
                      )}
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-1 truncate" title={card.subtitle}>
                      {card.subtitle}
                    </p>
                  </div>
                  <div className={cn("h-9 w-9 sm:h-10 sm:w-10 rounded-xl flex items-center justify-center shrink-0", card.iconBg)}>
                    <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* ==================== أدوات البحث والفلترة ==================== */}
        <Card className="border-border/60 shadow-xs py-0 gap-0">
          <CardContent className="p-3.5 sm:p-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-2.5 sm:gap-3 items-center">
              <div className="sm:col-span-2 lg:col-span-6 relative">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <Input
                  placeholder="ابحث برقم المعاملة، العنوان، أو مقدم الطلب..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pr-9 pl-8 text-xs sm:text-sm max-md:text-base h-10 max-lg:min-h-11 text-right"
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm("")}
                    className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer p-1"
                  >
                    ×
                  </button>
                )}
              </div>

              <div className="lg:col-span-4">
                <Select value={categoryFilter} onValueChange={(val) => { setCategoryFilter(val); setPage(1); }}>
                  <SelectTrigger className="w-full text-xs sm:text-sm h-10 max-lg:min-h-11 pointer-coarse:min-h-11 text-right">
                    <SelectValue placeholder="كافة التصنيفات" />
                  </SelectTrigger>
                  <SelectContent dir="rtl">
                    {allowedCategoryCards.length > 1 && (
                      <SelectItem value="all">كافة التصنيفات المتاحة</SelectItem>
                    )}
                    {allowedCategoryCards.map((c) => (
                      <SelectItem key={c.key} value={c.key}>
                        {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="lg:col-span-2 flex items-center gap-2">
                {(isExecDirector || isFinancialRole) && (
                  <Button
                    variant={onlyMine ? "default" : "outline"}
                    size="sm"
                    onClick={() => {
                      setOnlyMine(!onlyMine);
                      setPage(1);
                    }}
                    className="flex-1 text-xs h-10 max-lg:min-h-11 font-bold gap-1.5 cursor-pointer"
                  >
                    <ShieldCheck className="h-4 w-4 shrink-0" />
                    <span>اعتماداتي فقط</span>
                  </Button>
                )}

                {(categoryFilter !== "all" || searchTerm || onlyMine) && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setCategoryFilter("all");
                      setSearchTerm("");
                      setOnlyMine(false);
                      setPage(1);
                    }}
                    className="text-xs h-10 max-lg:min-h-11 px-3 text-muted-foreground hover:text-foreground cursor-pointer shrink-0"
                    title="إعادة ضبط الفلاتر"
                  >
                    <RotateCcw className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ==================== دلالات ألوان المعاملات (Color Legend) ==================== */}
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2.5 text-xs font-medium px-1 py-0.5 text-muted-foreground">
          <span className="text-[11px] font-bold text-foreground flex items-center gap-1.5 ml-1">
            <Filter className="h-3.5 w-3.5 text-primary shrink-0" />
            دلالات ألوان المعاملات:
          </span>
          {legendCategories.map((item) => {
            const isSelected = categoryFilter === item.key;
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => {
                  setCategoryFilter((prev) => (prev === item.key ? "all" : item.key));
                  setPage(1);
                }}
                className={cn(
                  "inline-flex items-center gap-1.5 px-2.5 py-1.5 min-h-8 max-lg:min-h-9 rounded-full border text-[11px] font-semibold cursor-pointer transition-all",
                  item.pillClass,
                  isSelected
                    ? "ring-2 ring-primary ring-offset-1 font-bold shadow-xs"
                    : "opacity-85 hover:opacity-100"
                )}
                title={`تصفية حسب: ${item.label}`}
              >
                <span className={cn("w-2 h-2 rounded-full shrink-0", item.dotClass)} />
                <span>{item.label}</span>
              </button>
            );
          })}
          {categoryFilter !== "all" && (
            <button
              type="button"
              onClick={() => {
                setCategoryFilter("all");
                setPage(1);
              }}
              className="text-xs text-muted-foreground hover:text-foreground underline mr-1 cursor-pointer font-medium py-1"
            >
              عرض الكل
            </button>
          )}
        </div>

        {/* ==================== جدول المعاملات المعلقة ==================== */}
        <Card className="border-border/60 shadow-xs overflow-hidden py-0 gap-0">
          <CardHeader className="p-4 sm:p-5 pb-3 border-b border-border/40 bg-card">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <CheckSquare className="h-5 w-5 text-primary shrink-0" />
                <CardTitle className="text-sm sm:text-base font-bold text-foreground">
                  قائمة الطلبات بانتظار الاعتماد
                </CardTitle>
                <Badge variant="outline" className="text-xs font-semibold px-2 font-mono">
                  {Number(totalFiltered).toLocaleString("en-US")} نتيجة
                </Badge>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            {approvalsLoading ? (
              <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-3 px-4 text-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-xs">جاري تحميل قائمة الاعتمادات من كافة أقسام النظام...</p>
              </div>
            ) : items.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-14 sm:py-16 text-center text-muted-foreground gap-2 px-4">
                <div className="h-12 w-12 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 flex items-center justify-center mb-1">
                  <CheckCircle className="h-6 w-6" />
                </div>
                <p className="font-bold text-sm text-foreground">لا توجد طلبات بانتظار الاعتماد</p>
                <p className="text-xs max-w-sm">
                  {searchTerm || categoryFilter !== "all" || onlyMine
                    ? "لم يتم العثور على نتائج تطابق معايير البحث والفلترة المحددة"
                    : "تمت مراجعة واعتماد كافة المعاملات المعلقة بنجاح"}
                </p>
              </div>
            ) : (
              <>
                {/* عرض البطاقات للموبايل والآيباد العمودي */}
                <div className="lg:hidden p-3 sm:p-4 bg-muted/15 grid grid-cols-1 md:grid-cols-2 gap-3">
                  {items.map((item) => {
                    const catConf = CATEGORY_CONFIG[item.categoryKey] || {
                      label: item.category,
                      pluralLabel: item.category,
                      icon: FileText,
                      badgeClass: "bg-slate-100 text-slate-800 border-slate-300 dark:bg-slate-900/40 dark:text-slate-300 dark:border-slate-800",
                      borderRClass: "border-r-4 border-r-slate-400",
                      rowBgClass: "hover:bg-muted/30",
                      iconContainerClass: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-300 dark:border-slate-700 shadow-xs",
                      dotClass: "bg-slate-500",
                      pillClass: "bg-slate-100 text-slate-800 border-slate-300",
                    };
                    const CatIcon = catConf.icon;

                    const appConf = APPROVER_CONFIG[item.requiredApproverKey] || {
                      label: item.requiredApprover,
                      badgeClass: "bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800 font-bold",
                    };

                    return (
                      <div
                        key={item.id}
                        onClick={() => {
                          if (item.link) navigate(item.link);
                        }}
                        className={cn(
                          "rounded-xl border border-border/80 bg-card p-3.5 sm:p-4 shadow-2xs cursor-pointer transition-all hover:shadow-sm flex flex-col justify-between gap-3",
                          catConf.borderRClass
                        )}
                      >
                        <div className="space-y-2.5">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div
                                className={cn(
                                  "w-9 h-9 rounded-lg flex items-center justify-center shrink-0 border shadow-xs",
                                  catConf.iconContainerClass
                                )}
                              >
                                <CatIcon className="w-4 h-4" />
                              </div>
                              <div className="min-w-0">
                                <span className="text-xs font-bold text-foreground block font-mono truncate">
                                  {item.itemNumber}
                                </span>
                                <span className="text-[11px] text-muted-foreground flex items-center gap-1 font-mono">
                                  <Clock className="h-3 w-3 shrink-0" />
                                  {item.createdAt
                                    ? new Date(item.createdAt).toLocaleDateString("en-CA").replace(/-/g, "/")
                                    : "—"}
                                </span>
                              </div>
                            </div>
                            <Badge
                              variant="outline"
                              className={cn("gap-1 text-[10px] sm:text-[11px] font-semibold py-0.5 px-2 shrink-0", catConf.badgeClass)}
                            >
                              <CatIcon className="h-3 w-3 shrink-0" />
                              <span>{catConf.label}</span>
                            </Badge>
                          </div>

                          <p className="text-xs sm:text-sm font-bold text-foreground leading-snug line-clamp-2 break-words">
                            {item.title}
                          </p>
                        </div>

                        <div className="space-y-2 pt-2.5 border-t border-border/50 text-xs">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-muted-foreground flex items-center gap-1.5 min-w-0">
                              <User className="h-3.5 w-3.5 shrink-0" />
                              <span className="truncate font-medium text-foreground">{item.requesterName}</span>
                            </span>
                            {item.amount !== null && item.amount !== undefined ? (
                              <div className="font-bold text-xs sm:text-sm text-primary font-mono inline-flex items-center gap-1 shrink-0">
                                <span>{Number(item.amount).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                <SaudiRiyal className="h-3.5 w-3.5 opacity-80" />
                              </div>
                            ) : (
                              <span className="text-xs text-muted-foreground font-mono shrink-0">—</span>
                            )}
                          </div>
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[11px] text-muted-foreground shrink-0">المسؤول عن الاعتماد:</span>
                            <Badge
                              variant="outline"
                              className={cn("text-[11px] py-0.5 px-2 font-bold", appConf.badgeClass)}
                            >
                              {item.requiredApprover}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* عرض الجدول لسطح المكتب والآيباد الأفقي */}
                <div className="hidden lg:block overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-muted/40">
                      <TableRow className="hover:bg-transparent border-b border-border/60">
                        <TableHead className="text-right text-xs font-bold text-foreground w-[340px] pr-4">الطلب / المعاملة</TableHead>
                        <TableHead className="text-right text-xs font-bold text-foreground w-[160px]">التصنيف</TableHead>
                        <TableHead className="text-right text-xs font-bold text-foreground w-[200px]">مقدم الطلب</TableHead>
                        <TableHead className="text-right text-xs font-bold text-foreground w-[200px]">المسؤول عن الاعتماد</TableHead>
                        <TableHead className="text-right text-xs font-bold text-foreground w-[180px]">القيمة / المبلغ</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {items.map((item) => {
                        const catConf = CATEGORY_CONFIG[item.categoryKey] || {
                          label: item.category,
                          pluralLabel: item.category,
                          icon: FileText,
                          badgeClass: "bg-slate-100 text-slate-800 border-slate-300 dark:bg-slate-900/40 dark:text-slate-300 dark:border-slate-800",
                          borderRClass: "border-r-4 border-r-slate-400",
                          rowBgClass: "hover:bg-muted/30",
                          iconContainerClass: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-300 dark:border-slate-700 shadow-xs",
                          dotClass: "bg-slate-500",
                          pillClass: "bg-slate-100 text-slate-800 border-slate-300",
                        };
                        const CatIcon = catConf.icon;

                        const appConf = APPROVER_CONFIG[item.requiredApproverKey] || {
                          label: item.requiredApprover,
                          badgeClass: "bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800 font-bold",
                        };

                        return (
                          <TableRow
                            key={item.id}
                            onClick={() => {
                              if (item.link) navigate(item.link);
                            }}
                            className={cn(
                              "cursor-pointer transition-colors duration-150 border-b border-border/40",
                              catConf.borderRClass,
                              catConf.rowBgClass
                            )}
                          >
                            <TableCell className="align-middle py-3.5 pr-4 text-right">
                              <div className="flex items-center gap-3">
                                <div
                                  className={cn(
                                    "w-9 h-9 rounded-lg flex items-center justify-center shrink-0 border shadow-xs",
                                    catConf.iconContainerClass
                                  )}
                                  title={catConf.label}
                                >
                                  <CatIcon className="w-4.5 h-4.5" />
                                </div>
                                <div className="space-y-1 min-w-0">
                                  <span className="text-xs font-bold text-foreground block text-right font-mono select-text">
                                    {item.itemNumber}
                                  </span>
                                  <p
                                    className="text-xs font-semibold text-foreground text-right line-clamp-2 select-text"
                                    title={item.title}
                                  >
                                    {item.title}
                                  </p>
                                  <p className="text-[10px] text-muted-foreground flex items-center gap-1 font-mono">
                                    <Clock className="h-3 w-3 text-muted-foreground/70" />
                                    <span>
                                      {item.createdAt
                                        ? new Date(item.createdAt).toLocaleDateString("en-CA").replace(/-/g, "/")
                                        : "—"}
                                    </span>
                                  </p>
                                </div>
                              </div>
                            </TableCell>

                            <TableCell className="align-middle py-3.5 text-right">
                              <Badge
                                variant="outline"
                                className={cn("gap-1 text-[11px] font-semibold py-1 px-2.5 shadow-xs", catConf.badgeClass)}
                              >
                                <CatIcon className="h-3.5 w-3.5 shrink-0" />
                                <span>{catConf.label}</span>
                              </Badge>
                            </TableCell>

                            <TableCell className="align-middle py-3.5 text-right">
                              <p className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                                <User className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                                <span>{item.requesterName}</span>
                              </p>
                            </TableCell>

                            <TableCell className="align-middle py-3.5 text-right">
                              <Badge
                                variant="outline"
                                className={cn("text-[11px] py-1 px-2.5 font-bold shadow-xs", appConf.badgeClass)}
                              >
                                {item.requiredApprover}
                              </Badge>
                            </TableCell>

                            <TableCell className="align-middle py-3.5 text-right">
                              {item.amount !== null && item.amount !== undefined ? (
                                <div className="font-bold text-xs text-foreground font-mono inline-flex items-center gap-1.5">
                                  <span>{Number(item.amount).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                  <SaudiRiyal className="h-3.5 w-3.5 opacity-80" />
                                </div>
                              ) : (
                                <span className="text-xs text-muted-foreground font-mono">—</span>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </>
            )}

            {totalFiltered > pageSize && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3.5 sm:p-4 border-t border-border/40 text-xs text-muted-foreground">
                <div className="font-mono text-center sm:text-right">
                  عرض {(((page - 1) * pageSize) + 1).toLocaleString("en-US")} إلى {Math.min(page * pageSize, totalFiltered).toLocaleString("en-US")} من أصل {Number(totalFiltered).toLocaleString("en-US")} معاملة
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="h-9 max-lg:min-h-10 px-3 text-xs cursor-pointer"
                  >
                    <ChevronRight className="h-3.5 w-3.5 ml-1" />
                    <span>السابق</span>
                  </Button>
                  <span className="px-2 font-bold text-foreground font-mono">
                    {Number(page).toLocaleString("en-US")} / {Number(totalPages).toLocaleString("en-US")}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="h-9 max-lg:min-h-10 px-3 text-xs cursor-pointer"
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
