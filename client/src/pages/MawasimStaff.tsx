import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "wouter";
import { usePermission } from "@/hooks/usePermission";
import DashboardLayout from "@/components/DashboardLayout";
import EnhancedPagination, { usePersistedPage } from "@/components/EnhancedPagination";
import { displayQuantity, MawasimField } from "@/components/MawasimRequestForm";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { exportStyledExcel, type ExcelColumnDef } from "@/lib/excelExportHelper";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import type { inferRouterOutputs } from "@trpc/server";
import type { AppRouter } from "../../../server/routers";
import {
  defaultSeasonalSettings,
  filterAndSortSeasonalRequests,
  formatSeasonalRequesterType,
  getSeasonalCity,
  getSeasonalGovernorate,
  normalizeSeasonalReviewStatus,
  seasonalCapacity,
  seasonalMosqueLimit,
  seasonalServiceIds,
  seasonalServices,
  seasonalStatusLabels,
  summarizeSeasonalByGovernorateCity,
  type SeasonalExtraServiceItem,
  type SeasonalQuantities,
  type SeasonalRequestSort,
  type SeasonalService,
  type SeasonalSettings,
} from "@shared/mawasim";
import {
  AlertCircle,
  ArrowUpDown,
  BarChart3,
  Building2,
  Calendar,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  Clock,
  Download,
  Droplets,
  FileText,
  Image as ImageIcon,
  Inbox,
  Loader2,
  MapPin,
  MoonStar,
  Phone,
  Plus,
  Ruler,
  Save,
  Search,
  Settings2,
  Sparkles,
  User,
  Users,
  Volume2,
  Wallet,
  Wind,
  Wrench,
  X,
  XCircle,
} from "lucide-react";

const PAGE_SIZE = 10;

type Dashboard = inferRouterOutputs<AppRouter>["mawasim"]["staff"];
type Season = NonNullable<Dashboard["season"]>;
type CompanyEmployee = Dashboard["employees"][number];
type SeasonRequest = Dashboard["requests"][number];
type RequestStatus = Exclude<SeasonRequest["status"], "completed">;
type RequestSort = SeasonalRequestSort;

const reviewStatus = normalizeSeasonalReviewStatus;
export const requestGovernorate = getSeasonalGovernorate;
export const requestCity = getSeasonalCity;
export const filterAndSortSeasonRequests = filterAndSortSeasonalRequests;

function formatExcelQuantities(quantities: SeasonalQuantities | null | undefined): string {
  if (!quantities) return "-";
  const parts = seasonalServiceIds
    .filter(service => (quantities[service] ?? 0) > 0)
    .map(service => `${seasonalServices[service].label}: ${displayQuantity(service, quantities[service] ?? 0)} ${seasonalServices[service].unit}`);
  return parts.length > 0 ? parts.join(" | ") : "-";
}

function formatExcelExtraServices(extraServices: SeasonalExtraServiceItem[] | null | undefined): string {
  if (!extraServices || extraServices.length === 0) return "-";
  return extraServices
    .map(item => `${item.title} (${item.quantity} ${item.unit})${item.notes ? ` - ${item.notes}` : ""}`)
    .join(" | ");
}

export function buildSeasonalExcelPayload(
  requests: SeasonRequest[],
  season?: Pick<Season, "title" | "hijriYear"> | null,
) {
  const columns: ExcelColumnDef[] = [
    { header: "رقم الطلب", align: "center", minWidth: 12 },
    { header: "تاريخ الطلب", align: "center", minWidth: 14 },
    { header: "اسم المسجد", align: "right", minWidth: 24 },
    { header: "المحافظة", align: "center", minWidth: 16 },
    { header: "المدينة", align: "center", minWidth: 16 },
    { header: "الحي", align: "center", minWidth: 16 },
    { header: "العنوان", align: "right", minWidth: 26 },
    { header: "اسم طالب الخدمة", align: "right", minWidth: 24 },
    { header: "صفة طالب الخدمة", align: "center", minWidth: 18 },
    { header: "رقم جوال طالب الخدمة", align: "center", minWidth: 18 },
    { header: "البريد الإلكتروني لطالب الخدمة", align: "center", minWidth: 26 },
    { header: "رقم الهوية الوطنية لطالب الخدمة", align: "center", minWidth: 20 },
    { header: "مدينة طالب الخدمة", align: "center", minWidth: 16 },
    { header: "الخدمات والكميات المطلوبة", align: "right", minWidth: 32 },
    { header: "الكميات المعتمدة", align: "right", minWidth: 28 },
    { header: "الخدمات الإضافية", align: "right", minWidth: 32 },
    { header: "حالة الطلب", align: "center", minWidth: 16 },
    { header: "الملاحظات", align: "right", minWidth: 30 },
  ];

  const rows = requests.map(req => {
    const requesterName = req.applicantName?.trim() || req.contact?.name?.trim() || req.imamName?.trim() || "-";
    const requesterTypeLabel = formatSeasonalRequesterType(req.applicantRequesterType) || "-";
    const requesterPhone = req.applicantPhone?.trim() || req.contact?.phone?.trim() || req.imamPhone?.trim() || "-";
    const requesterEmail = req.applicantEmail?.trim() || req.contact?.email?.trim() || req.imamEmail?.trim() || "-";
    const requesterNationalId = req.applicantNationalId?.trim() || "-";
    const requesterCity = req.applicantCity?.trim() || "-";
    const dateValue = req.createdAt ? new Intl.DateTimeFormat("en-CA").format(new Date(req.createdAt)) : "-";
    const notes = [
      req.specialRequest ? `طلب خاص: ${req.specialRequest}` : "",
      req.reviewNote ? `ملاحظة المراجعة: ${req.reviewNote}` : "",
      req.contact?.reason ? `ملاحظة التسجيل: ${req.contact.reason}` : "",
    ].filter(Boolean).join(" | ") || "-";

    return [
      `#${req.id}`,
      dateValue,
      req.mosqueName || "-",
      requestGovernorate(req) || "-",
      requestCity(req) || "-",
      req.snapshot.district?.trim() || "-",
      req.snapshot.address?.trim() || "-",
      requesterName,
      requesterTypeLabel,
      requesterPhone,
      requesterEmail,
      requesterNationalId,
      requesterCity,
      formatExcelQuantities(req.requested),
      formatExcelQuantities(req.approved),
      formatExcelExtraServices(req.extraServices),
      seasonalStatusLabels[req.status] ?? req.status,
      notes,
    ];
  });

  const dateTag = new Intl.DateTimeFormat("en-CA").format(new Date());
  const yearTag = season?.hijriYear ? `_${season.hijriYear}` : "";

  return {
    sheetName: "طلبات الموسم",
    fileName: `طلبات_برنامج_مواسم${yearTag}_${dateTag}.xlsx`,
    columns,
    rows,
  };
}

const SERVICE_VISUALS: Record<
  SeasonalService,
  {
    icon: typeof Sparkles;
    iconBg: string;
    activeBorder: string;
    activeBg: string;
    badgeBg: string;
    description: string;
  }
> = {
  carpet: {
    icon: Sparkles,
    iconBg: "bg-teal-500/12 text-teal-700 dark:text-teal-300",
    activeBorder: "border-teal-500/40 dark:border-teal-500/50",
    activeBg: "bg-teal-50/40 dark:bg-teal-950/20",
    badgeBg: "bg-teal-500/10 text-teal-700 dark:text-teal-300 border-teal-500/20",
    description: "غسيل وتعقيم سجاد مصليات الرجال والنساء بالمتر المربع",
  },
  water: {
    icon: Droplets,
    iconBg: "bg-sky-500/12 text-sky-700 dark:text-sky-300",
    activeBorder: "border-sky-500/40 dark:border-sky-500/50",
    activeBg: "bg-sky-50/40 dark:bg-sky-950/20",
    badgeBg: "bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-500/20",
    description: "تأمين كراتين المياه للمصلين خلال الشهر الكريم",
  },
  maintenance: {
    icon: Wrench,
    iconBg: "bg-amber-500/12 text-amber-700 dark:text-amber-300",
    activeBorder: "border-amber-500/40 dark:border-amber-500/50",
    activeBg: "bg-amber-50/40 dark:bg-amber-950/20",
    badgeBg: "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20",
    description: "صيانة وتهيئة دورات المياه والإنارة والأعمال الكهربائية",
  },
  audio: {
    icon: Volume2,
    iconBg: "bg-indigo-500/12 text-indigo-700 dark:text-indigo-300",
    activeBorder: "border-indigo-500/40 dark:border-indigo-500/50",
    activeBg: "bg-indigo-50/40 dark:bg-indigo-950/20",
    badgeBg: "bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-500/20",
    description: "فحص وضبط أنظمة الصوتيات والمكبرات والميكروفونات",
  },
  fragrance: {
    icon: Wind,
    iconBg: "bg-emerald-500/12 text-emerald-700 dark:text-emerald-300",
    activeBorder: "border-emerald-500/40 dark:border-emerald-500/50",
    activeBg: "bg-emerald-50/40 dark:bg-emerald-950/20",
    badgeBg: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20",
    description: "تطييب وتعطير المسجد وتهيئة أجواء رمضانية مريحة",
  },
};

const STATUS_STYLES: Record<RequestStatus, { badge: string; dot: string }> = {
  submitted: {
    badge: "bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800",
    dot: "bg-amber-500",
  },
  scheduled: {
    badge: "bg-indigo-50 text-indigo-800 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800",
    dot: "bg-indigo-500",
  },
  approved: {
    badge: "bg-sky-50 text-sky-800 border-sky-200 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-800",
    dot: "bg-sky-500",
  },
  rejected: {
    badge: "bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800",
    dot: "bg-rose-500",
  },
};

export default function MawasimStaff() {
  const hasViewPerm = usePermission("mawasim.view");
  const hasViewAssignedPerm = usePermission("mawasim.view_assigned");
  const hasCreatePerm = usePermission("mawasim.create");
  const hasManagePerm = usePermission("mawasim.manage");
  const hasViewRequestsPerm = usePermission("mawasim.view_requests");
  const hasApproveRequestsPerm = usePermission("mawasim.approve_requests");
  const canView = hasViewPerm || hasViewAssignedPerm || hasCreatePerm || hasManagePerm || hasViewRequestsPerm || hasApproveRequestsPerm;
  const canCreate = hasCreatePerm;
  const canManage = hasManagePerm;
  const canViewRequests = hasViewRequestsPerm || hasApproveRequestsPerm;
  const canApproveRequests = hasApproveRequestsPerm;
  const [seasonId, setSeasonId] = useState<number>();
  const [edit, setEdit] = useState<"new" | "saved">();
  const [expanded, setExpanded] = useState<number>();
  const [statusFilter, setStatusFilter] = useState<"all" | RequestStatus>("all");
  const [governorateFilter, setGovernorateFilter] = useState<string>("all");
  const [cityFilter, setCityFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [debouncedSearch, setDebouncedSearch] = useState<string>("");
  const [sortBy, setSortBy] = useState<RequestSort>("newest");
  const [page, setPage, resetPage] = usePersistedPage("mawasim_requests_page");
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery.trim());
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const isFirstFilterMount = useRef(true);
  useEffect(() => {
    if (isFirstFilterMount.current) {
      isFirstFilterMount.current = false;
      return;
    }
    resetPage();
  }, [seasonId, debouncedSearch, statusFilter, governorateFilter, cityFilter, sortBy, resetPage]);

  const utils = trpc.useUtils();
  const dashboard = trpc.mawasim.staff.useQuery(
    {
      seasonId,
      search: debouncedSearch || undefined,
      status: statusFilter,
      governorate: governorateFilter !== "all" ? governorateFilter : undefined,
      city: cityFilter !== "all" ? cityFilter : undefined,
      sortBy,
      page,
      limit: PAGE_SIZE,
    },
    { enabled: canView },
  );
  const data = dashboard.data;
  const season = data?.season;
  const refresh = () => { void dashboard.refetch(); };

  const governorateOptions = useMemo(() => {
    if (data?.filterOptions?.governorates) return data.filterOptions.governorates;
    const set = new Set<string>();
    for (const row of data?.requests ?? []) {
      const gov = requestGovernorate(row);
      if (gov) set.add(gov);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b, "ar"));
  }, [data?.filterOptions?.governorates, data?.requests]);

  const effectiveGovernorate = governorateFilter === "all" || governorateOptions.includes(governorateFilter)
    ? governorateFilter
    : "all";

  const cityOptions = useMemo(() => {
    if (data?.filterOptions?.cities) return data.filterOptions.cities;
    const set = new Set<string>();
    for (const row of data?.requests ?? []) {
      if (effectiveGovernorate !== "all" && requestGovernorate(row) !== effectiveGovernorate) continue;
      const city = requestCity(row);
      if (city) set.add(city);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b, "ar"));
  }, [data?.filterOptions?.cities, data?.requests, effectiveGovernorate]);

  const effectiveCity = cityFilter === "all" || cityOptions.includes(cityFilter)
    ? cityFilter
    : "all";

  const hasActiveFilters = statusFilter !== "all"
    || effectiveGovernorate !== "all"
    || effectiveCity !== "all"
    || searchQuery.trim() !== ""
    || sortBy !== "newest";

  const byLocation = useMemo(
    () => data?.locationDistribution ?? summarizeSeasonalByGovernorateCity(data?.requests ?? []),
    [data?.locationDistribution, data?.requests],
  );

  const requestStats = useMemo(() => {
    if (data?.stats) return data.stats;
    const list = data?.requests ?? [];
    return {
      total: list.length,
      submitted: list.filter(row => row.status === "submitted").length,
      scheduled: list.filter(row => row.status === "scheduled").length,
      approved: list.filter(row => reviewStatus(row.status) === "approved").length,
      rejected: list.filter(row => row.status === "rejected").length,
    };
  }, [data?.requests, data?.stats]);

  const localFilteredRequests = useMemo(
    () => filterAndSortSeasonRequests(data?.requests ?? [], {
      statusFilter,
      governorateFilter: effectiveGovernorate,
      cityFilter: effectiveCity,
      searchQuery,
      sortBy,
    }),
    [data?.requests, statusFilter, effectiveGovernorate, effectiveCity, searchQuery, sortBy],
  );

  const hasBackendPagination = Boolean(data?.pagination);
  const totalFilteredItems = data?.pagination?.total ?? localFilteredRequests.length;
  const totalPages = data?.pagination?.totalPages ?? Math.max(1, Math.ceil(totalFilteredItems / PAGE_SIZE));
  const currentPage = Math.min(data?.pagination?.page ?? page, totalPages);
  const filteredRequests = hasBackendPagination
    ? (data?.requests ?? [])
    : localFilteredRequests.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages && newPage !== currentPage) {
      setPage(newPage);
    }
  };

  const enabledServicesCount = season
    ? seasonalServiceIds.filter(service => season.settings.services[service].enabled).length
    : 0;

  async function handleExportExcel() {
    if (isExporting || totalFilteredItems === 0) return;
    setIsExporting(true);
    try {
      let rowsToExport = filteredRequests;
      if (hasBackendPagination && totalFilteredItems > filteredRequests.length) {
        const fetched = await utils.mawasim.exportRequests.fetch({
          seasonId: season?.id,
          search: debouncedSearch || undefined,
          status: statusFilter,
          governorate: effectiveGovernorate !== "all" ? effectiveGovernorate : undefined,
          city: effectiveCity !== "all" ? effectiveCity : undefined,
          sortBy,
        });
        if (Array.isArray(fetched) && fetched.length > 0) {
          rowsToExport = fetched;
        }
      }
      const payload = buildSeasonalExcelPayload(rowsToExport, season);
      await exportStyledExcel({
        ...payload,
        includeIndex: true,
        showTotalRow: false,
      });
      toast.success("تم تصدير ملف Excel بنجاح");
    } catch (error) {
      console.error("Failed to export seasonal requests:", error);
      toast.error("حدث خطأ أثناء تصدير ملف Excel");
    } finally {
      setIsExporting(false);
    }
  }

  if (!canView) {
    return (
      <DashboardLayout>
        <div dir="rtl" className="mx-auto max-w-2xl p-6">
          <Card className="border-destructive/30 bg-destructive/5">
            <CardContent className="flex items-center gap-3 p-6 text-destructive">
              <AlertCircle className="size-5 shrink-0" />
              <p className="text-sm font-medium">ليس لديك صلاحية إدارة برنامج مواسم.</p>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout tabletNavigation>
      <div dir="rtl" className="mx-auto min-w-0 max-w-7xl max-w-full overflow-x-hidden space-y-6 p-3 sm:p-6">
        {/* Hero Header */}
        <header className="relative overflow-hidden rounded-2xl border border-teal-700/20 bg-gradient-to-l from-teal-700 via-teal-600 to-emerald-700 p-4 text-white shadow-md sm:p-7">
          <div className="pointer-events-none absolute -left-12 -top-12 size-48 rounded-full bg-white/10 blur-2xl" />
          <div className="pointer-events-none absolute -bottom-16 left-24 size-56 rounded-full bg-amber-300/15 blur-3xl" />
          <div className="relative flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-start gap-3.5 sm:items-center">
              <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-white/25 backdrop-blur-sm sm:size-14">
                <MoonStar className="size-6 text-amber-200 sm:size-7" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-xl font-extrabold tracking-tight sm:text-2xl">برنامج مواسم</h1>
                  <Badge className="border-white/25 bg-white/15 text-xs font-semibold text-white hover:bg-white/20">
                    رمضان المبارك
                  </Badge>
                </div>
                <p className="mt-1 text-xs text-white/85 sm:text-sm">
                  فتح الموسم ← تقديم الطلب وتأكيد بيانات المسجد ← المراجعة والاعتماد وحجز السعة
                </p>
              </div>
            </div>
            {canCreate && (
              <Button
                onClick={() => setEdit(edit === "new" ? undefined : "new")}
                className={cn(
                  "h-10 w-full sm:w-auto justify-center gap-2 rounded-xl px-4 font-bold shadow-sm transition-all cursor-pointer",
                  edit === "new"
                    ? "bg-white/20 text-white hover:bg-white/30 border border-white/30"
                    : "bg-white text-teal-900 hover:bg-white/95"
                )}
              >
                {edit === "new" ? <X className="size-4" /> : <Plus className="size-4" />}
                <span>{edit === "new" ? "إغلاق النموذج" : "إضافة موسم"}</span>
              </Button>
            )}
          </div>
        </header>

        {/* Loading & Error States */}
        {dashboard.isLoading && (
          <Card className="border-border/60 shadow-xs">
            <CardContent className="flex items-center justify-center gap-3 py-12 text-muted-foreground" role="status">
              <Loader2 className="size-5 animate-spin text-primary" />
              <span className="text-sm font-medium">جارٍ تحميل بيانات المواسم…</span>
            </CardContent>
          </Card>
        )}

        {dashboard.error && (
          <Card className="border-destructive/40 bg-destructive/5" role="alert">
            <CardContent className="flex items-center gap-3 p-4 text-sm text-destructive">
              <AlertCircle className="size-5 shrink-0" />
              <span>{dashboard.error.message}</span>
            </CardContent>
          </Card>
        )}

        {/* New Season Form */}
        {canCreate && edit === "new" && (
          <SeasonEditor
            employees={data?.employees ?? []}
            onCancel={() => setEdit(undefined)}
            onSave={id => {
              setSeasonId(id);
              setEdit(undefined);
              refresh();
            }}
          />
        )}

        {/* No Seasons Empty State */}
        {data && !season && (!canCreate || edit !== "new") && (
          <Card className="border-dashed border-border/80 bg-card/60">
            <CardContent className="flex flex-col items-center justify-center py-14 text-center">
              <div className="mb-4 flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <CalendarDays className="size-7" />
              </div>
              <h2 className="text-base font-bold text-foreground">
                {!hasViewPerm && hasViewAssignedPerm ? "لا توجد مواسم مسندة لك كمدير بعد" : "لا توجد مواسم محفوظة بعد"}
              </h2>
              <p className="mt-1 max-w-md text-sm text-muted-foreground">
                {canCreate
                  ? "ابدأ بإنشاء موسم جديد وتحديد الخدمات والسعات المتاحة لتأهيل المساجد."
                  : !hasViewPerm && hasViewAssignedPerm
                    ? "لم يتم إسناد أي موسم لك كمدير حتى الآن."
                    : "لم يتم إنشاء أي موسم حتى الآن."}
              </p>
              {canCreate && (
                <Button className="mt-5 gap-2 rounded-xl" onClick={() => setEdit("new")}>
                  <Plus className="size-4" />
                  إضافة أول موسم
                </Button>
              )}
            </CardContent>
          </Card>
        )}

        {data && season && (
          <>
            {/* Season Control Toolbar */}
            <Card className="border-border/60 shadow-xs">
              <CardContent className="flex flex-col gap-4 p-4 sm:p-5 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:flex-wrap">
                  <div className="flex items-center gap-2.5 min-w-0 sm:min-w-[260px]">
                    <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <CalendarDays className="size-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="mb-1 block text-[11px] font-semibold text-muted-foreground">الموسم المحدد</span>
                      <Select
                        value={String(season.id)}
                        onValueChange={val => {
                          setSeasonId(Number(val));
                          setEdit(undefined);
                          setExpanded(undefined);
                          setStatusFilter("all");
                        }}
                      >
                        <SelectTrigger className="h-9 w-full rounded-lg bg-background font-semibold">
                          <SelectValue placeholder="اختر الموسم" />
                        </SelectTrigger>
                        <SelectContent>
                          {data.seasons.map(item => (
                            <SelectItem key={item.id} value={String(item.id)}>
                              {item.title} ({item.hijriYear} هـ)
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 pt-1 sm:pt-4">
                    <Badge
                      variant="outline"
                      className={cn(
                        "h-8 gap-1.5 rounded-lg px-3 text-xs font-semibold",
                        season.isOpen
                          ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"
                          : "border-slate-200 bg-slate-100 text-slate-700 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-300"
                      )}
                    >
                      <span
                        className={cn(
                          "size-2 rounded-full",
                          season.isOpen ? "bg-emerald-500 animate-pulse" : "bg-slate-400"
                        )}
                      />
                      {season.isOpen ? "التسجيل مفتوح" : "التسجيل مغلق"}
                    </Badge>

                    <Badge variant="outline" className="h-8 gap-1.5 rounded-lg px-3 text-xs font-medium text-muted-foreground">
                      <Calendar className="size-3.5 text-primary" />
                      عام {season.hijriYear} هـ
                    </Badge>

                    <Badge variant="outline" className="h-8 gap-1.5 rounded-lg px-3 text-xs font-medium text-muted-foreground">
                      <Sparkles className="size-3.5 text-amber-500" />
                      {enabledServicesCount} خدمات مفعّلة
                    </Badge>

                    {season.managerName && (
                      <Badge variant="outline" className="h-auto min-h-8 max-w-full gap-1.5 rounded-lg px-3 py-1 text-xs font-medium text-muted-foreground">
                        <User className="size-3.5 shrink-0 text-primary" />
                        <span className="truncate">مدير الموسم: {season.managerName}</span>
                      </Badge>
                    )}
                  </div>
                </div>

                {canManage && (
                  <div className="flex w-full flex-wrap items-center gap-2 border-t pt-3 lg:w-auto lg:border-t-0 lg:pt-0">
                    <Button
                      variant={edit === "saved" ? "default" : "outline"}
                      onClick={() => setEdit(edit === "saved" ? undefined : "saved")}
                      className="h-9 w-full sm:w-auto justify-center gap-2 rounded-xl font-semibold cursor-pointer"
                    >
                      {edit === "saved" ? <X className="size-4" /> : <Settings2 className="size-4" />}
                      <span>{edit === "saved" ? "إغلاق الإعدادات" : "إعدادات الموسم"}</span>
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Saved Season Editor */}
            {canManage && edit === "saved" && (
              <SeasonEditor
                key={season.id}
                season={season}
                employees={data?.employees ?? []}
                onCancel={() => setEdit(undefined)}
                onSave={() => {
                  setEdit(undefined);
                  refresh();
                }}
              />
            )}

            {/* KPI Overview Cards + Capacity Table */}
            <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
              <StatCard
                label="المساجد المسجّلة"
                value={requestStats.total}
                icon={Building2}
                iconClass="bg-teal-500/12 text-teal-700 dark:text-teal-300"
              />
              <StatCard
                label="طلبات قيد المراجعة"
                value={requestStats.submitted}
                icon={Clock}
                iconClass="bg-amber-500/12 text-amber-700 dark:text-amber-300"
                valueClass="text-amber-600 dark:text-amber-400"
              />
              <StatCard
                label="الطلبات المعتمدة"
                value={requestStats.approved}
                icon={CheckCircle2}
                iconClass="bg-sky-500/12 text-sky-700 dark:text-sky-300"
                valueClass="text-sky-600 dark:text-sky-400"
              />
              <StatCard
                label="الطلبات المعتذر عنها"
                value={requestStats.rejected}
                icon={XCircle}
                iconClass="bg-rose-500/12 text-rose-700 dark:text-rose-300"
                valueClass="text-rose-600 dark:text-rose-400"
              />
            </div>

            {/* Capacity & Tracking Table */}
            <Card className="overflow-hidden border-border/60 shadow-xs">
              <CardHeader className="border-b border-border/50 bg-muted/25 px-5 py-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <BarChart3 className="size-4" />
                    </div>
                    <div>
                      <CardTitle className="text-base font-bold">السعة والمتابعة</CardTitle>
                      <CardDescription className="text-xs">
                        متابعة السعة المتاحة والمحجوزة لكل خدمة في الموسم
                      </CardDescription>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {(() => {
                  const rows = data.capacity.filter(row => row.limit > 0 || row.requested > 0);
                  if (rows.length === 0) {
                    return (
                      <div className="flex flex-col items-center justify-center py-10 px-4 text-center text-sm text-muted-foreground">
                        <Sparkles className="mb-2 size-7 text-muted-foreground/50" />
                        {canManage
                          ? "لم يتم تفعيل سعات للخدمات في هذا الموسم بعد. افتح «إعدادات الموسم» لضبط السعات."
                          : "لم يتم تفعيل سعات للخدمات في هذا الموسم بعد."}
                      </div>
                    );
                  }
                  return (
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[44rem] text-start text-sm">
                        <thead>
                          <tr className="border-b bg-muted/30 text-xs font-semibold text-muted-foreground">
                            <th scope="col" className="px-5 py-3 text-start">الخدمة</th>
                            <th scope="col" className="px-3 py-3 text-start">السعة</th>
                            <th scope="col" className="px-3 py-3 text-start">المطلوب القائم</th>
                            <th scope="col" className="px-3 py-3 text-start">المعتمد</th>
                            <th scope="col" className="px-3 py-3 text-start">المتبقي</th>
                            <th scope="col" className="w-40 px-5 py-3 text-start">الاستهلاك</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border/50">
                          {rows.map(row => {
                            const meta = seasonalServices[row.service];
                            const visual = SERVICE_VISUALS[row.service];
                            const Icon = visual.icon;
                            const pct = row.limit > 0 ? Math.min(100, Math.round((row.reserved / row.limit) * 100)) : 0;
                            const remainingTone =
                              row.available === 0
                                ? "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800"
                                : pct >= 80
                                  ? "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800"
                                  : "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800";

                            return (
                              <tr key={row.service} className="transition-colors hover:bg-muted/25">
                                <th scope="row" className="px-5 py-3.5 text-start font-semibold">
                                  <div className="flex items-center gap-2.5">
                                    <span className={cn("flex size-8 shrink-0 items-center justify-center rounded-lg", visual.iconBg)}>
                                      <Icon className="size-4" />
                                    </span>
                                    <div>
                                      <span className="block text-foreground">{meta.label}</span>
                                      <span className="text-[11px] font-normal text-muted-foreground">الوحدة: {meta.unit}</span>
                                    </div>
                                  </div>
                                </th>
                                <td className="px-3 py-3.5 font-semibold tabular-nums text-foreground">
                                  {displayQuantity(row.service, row.limit)}
                                </td>
                                <td className="px-3 py-3.5 tabular-nums text-muted-foreground">
                                  {displayQuantity(row.service, row.requested)}
                                </td>
                                <td className="px-3 py-3.5 tabular-nums text-sky-700 dark:text-sky-400 font-medium">
                                  {displayQuantity(row.service, row.approved)}
                                </td>
                                <td className="px-3 py-3.5 tabular-nums">
                                  <Badge variant="outline" className={cn("rounded-lg font-bold", remainingTone)}>
                                    {displayQuantity(row.service, row.available)}
                                  </Badge>
                                </td>
                                <td className="px-5 py-3.5">
                                  <div className="space-y-1">
                                    <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                                      <span>محجوز</span>
                                      <span className="font-semibold tabular-nums text-foreground">{pct}%</span>
                                    </div>
                                    <Progress value={pct} className="h-1.5" />
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  );
                })()}
              </CardContent>
            </Card>

            {/* Season Extra Services Expenses Card */}
            {canViewRequests && (() => {
              const extraExpenses = data.extraExpenses ?? { totalHalalas: 0, approvedHalalas: 0, pendingHalalas: 0, items: [] };
              return (
                <Card className="overflow-hidden border-border/60 shadow-xs">
                  <CardHeader className="border-b border-border/50 bg-muted/25 px-5 py-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <div className="flex size-9 items-center justify-center rounded-xl bg-amber-500/15 text-amber-700 dark:text-amber-300">
                          <Wallet className="size-4" />
                        </div>
                        <div>
                          <CardTitle className="text-base font-bold">مصارف الموسم الإضافية</CardTitle>
                          <CardDescription className="text-xs">
                            الخدمات الإضافية المرفقة مع الطلبات (مثل الصوتيات أو الفرش أو الاحتياجات الخاصة) ومسجّلة كمصرف على الموسم
                          </CardDescription>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-0">
                    {extraExpenses.items.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-8 px-4 text-center text-sm text-muted-foreground">
                        <Wallet className="mb-2 size-6 text-muted-foreground/50" />
                        لا توجد خدمات إضافية مسجلة كمصرف على هذا الموسم حتى الآن.
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full min-w-[44rem] text-start text-sm">
                          <thead>
                            <tr className="border-b bg-muted/30 text-xs font-semibold text-muted-foreground">
                              <th scope="col" className="px-5 py-3 text-start">الخدمة الإضافية</th>
                              <th scope="col" className="px-3 py-3 text-start">الطلب والمسجد</th>
                              <th scope="col" className="px-3 py-3 text-start">الكمية</th>
                              <th scope="col" className="px-3 py-3 text-start">حالة الطلب</th>
                              <th scope="col" className="px-5 py-3 text-start">ملاحظات</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border/50">
                            {extraExpenses.items.map(entry => {
                              const st = reviewStatus(entry.requestStatus);
                              return (
                                <tr key={`${entry.requestId}-${entry.id}`} className="transition-colors hover:bg-muted/25">
                                  <th scope="row" className="px-5 py-3 text-start font-semibold text-foreground">
                                    {entry.title}
                                  </th>
                                  <td className="px-3 py-3 text-xs">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setSearchQuery(String(entry.requestId));
                                        setExpanded(entry.requestId);
                                      }}
                                      className="font-semibold text-primary hover:underline cursor-pointer text-start"
                                    >
                                      #{entry.requestId} · {entry.mosqueName}
                                    </button>
                                  </td>
                                  <td className="px-3 py-3 text-xs tabular-nums text-muted-foreground">
                                    {entry.quantity} {entry.unit}
                                  </td>
                                  <td className="px-3 py-3">
                                    <Badge variant="outline" className={cn("rounded-full text-[11px]", STATUS_STYLES[st].badge)}>
                                      {seasonalStatusLabels[st]}
                                    </Badge>
                                  </td>
                                  <td className="px-5 py-3 text-xs text-muted-foreground">
                                    {entry.notes || "—"}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })()}

            {byLocation.length > 0 && (
              <Card className="rounded-3xl border-border/60 shadow-xs p-5 sm:p-6">
                <CardHeader className="p-0 mb-5 text-right">
                  <CardTitle className="flex items-center gap-2 text-base sm:text-lg font-bold">
                    <MapPin className="size-5 text-emerald-500 shrink-0" />
                    <span>توزيع طلبات برنامج مواسم</span>
                  </CardTitle>
                  <CardDescription className="text-xs">
                    توزيع الطلبات المسجلة في الموسم المحدد حسب المحافظة والمدينة
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-0 space-y-4">
                  <div className="overflow-x-auto pb-1">
                    <div className="h-72 min-w-[340px]" dir="ltr">
                      <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={byLocation} margin={{ top: 10, right: 16, left: 8, bottom: 24 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                        <XAxis
                          dataKey="name"
                          stroke="#64748b"
                          fontSize={12}
                          tickLine={false}
                          interval={0}
                          height={44}
                        />
                        <YAxis stroke="#64748b" fontSize={12} tickLine={false} allowDecimals={false} />
                        <Tooltip
                          formatter={(value: any) => [`${value} طلب`, "عدد الطلبات"]}
                          contentStyle={{
                            borderRadius: "14px",
                            backgroundColor: "#ffffff",
                            borderColor: "#cbd5e1",
                            boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.15)",
                            color: "#0f172a",
                            padding: "10px 14px",
                            textAlign: "right",
                            direction: "rtl",
                          }}
                          itemStyle={{ color: "#0f172a", fontWeight: "bold", fontSize: "13px" }}
                          labelStyle={{ color: "#475569", fontWeight: "bold", fontSize: "12px", marginBottom: "4px" }}
                        />
                        <Bar dataKey="value" name="عدد الطلبات" fill="#10b981" barSize={46} radius={[10, 10, 0, 0]} />
                      </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 pt-3 border-t border-border/50">
                    {byLocation.map((item) => (
                      <span
                        key={item.name}
                        className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-muted/30 px-3 py-1 text-xs font-medium text-foreground"
                      >
                        <span>{item.name}</span>
                        <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[11px] font-bold text-emerald-700 dark:text-emerald-300 tabular-nums">
                          {item.value}
                        </span>
                      </span>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Season Requests List */}
            {canViewRequests && (
              <section className="space-y-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <h2 className="text-lg font-bold text-foreground">
                      طلبات الموسم
                    </h2>
                    <p className="text-xs text-muted-foreground">
                      {canApproveRequests
                        ? "مراجعة الطلبات الموسمية واعتماد الكميات وحجز السعة"
                        : "عرض الطلبات الموسمية ومتابعة حالاتها"}
                    </p>
                  </div>

                {(requestStats.total > 0 || hasActiveFilters) && (
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="flex flex-wrap items-center gap-1.5">
                      {([
                        ["all", "الكل", requestStats.total],
                        ["submitted", seasonalStatusLabels.submitted, requestStats.submitted],
                        ["scheduled", seasonalStatusLabels.scheduled, requestStats.scheduled ?? 0],
                        ["approved", seasonalStatusLabels.approved, requestStats.approved],
                        ["rejected", seasonalStatusLabels.rejected, requestStats.rejected],
                      ] as const).map(([key, label, count]) => (
                        <button
                          key={key}
                          type="button"
                          onClick={() => setStatusFilter(key)}
                          className={cn(
                            "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold transition-all cursor-pointer",
                            statusFilter === key
                              ? "border-primary bg-primary text-primary-foreground shadow-2xs"
                              : "border-border/70 bg-card text-muted-foreground hover:bg-muted hover:text-foreground"
                          )}
                        >
                          <span>{label}</span>
                          <span
                            className={cn(
                              "rounded-full px-1.5 py-0.2 text-[10px] tabular-nums",
                              statusFilter === key ? "bg-white/20 text-white" : "bg-muted text-foreground"
                            )}
                          >
                            {count}
                          </span>
                        </button>
                      ))}
                    </div>

                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={isExporting || totalFilteredItems === 0}
                      onClick={handleExportExcel}
                      className="h-8 w-full sm:w-auto justify-center gap-1.5 rounded-xl border-[#1a5f4a]/30 bg-transparent px-3 text-xs font-bold text-[#1a5f4a] hover:bg-[#1a5f4a]/5 hover:text-[#1a5f4a] cursor-pointer"
                    >
                      {isExporting ? (
                        <Loader2 className="size-3.5 animate-spin" />
                      ) : (
                        <Download className="size-3.5" />
                      )}
                      <span dir="rtl">تصدير إلى Excel</span>
                    </Button>
                  </div>
                )}
              </div>

              {(requestStats.total > 0 || hasActiveFilters) && (
                <div className="grid gap-2.5 rounded-2xl border border-border/60 bg-card p-3 sm:grid-cols-2 lg:grid-cols-12">
                  <div className="relative sm:col-span-2 lg:col-span-4">
                    <Search className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      value={searchQuery}
                      onChange={event => setSearchQuery(event.target.value)}
                      placeholder="ابحث باسم المسجد أو المحافظة أو المدينة..."
                      className="h-9 rounded-xl bg-background pr-9 text-xs sm:text-sm"
                    />
                  </div>

                  <div className="lg:col-span-3">
                    <Select
                      value={effectiveGovernorate}
                      onValueChange={val => {
                        setGovernorateFilter(val);
                        setCityFilter("all");
                      }}
                    >
                      <SelectTrigger aria-label="تصفية حسب المحافظة" className="h-9 w-full rounded-xl bg-background text-xs">
                        <SelectValue placeholder="كل المحافظات" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">كل المحافظات</SelectItem>
                        {governorateOptions.map(gov => (
                          <SelectItem key={gov} value={gov}>
                            {gov}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="lg:col-span-2">
                    <Select
                      value={effectiveCity}
                      onValueChange={setCityFilter}
                    >
                      <SelectTrigger aria-label="تصفية حسب المدينة" className="h-9 w-full rounded-xl bg-background text-xs">
                        <SelectValue placeholder="كل المدن" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">كل المدن</SelectItem>
                        {cityOptions.map(city => (
                          <SelectItem key={city} value={city}>
                            {city}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className={cn(hasActiveFilters ? "lg:col-span-2" : "lg:col-span-3")}>
                    <Select value={sortBy} onValueChange={val => setSortBy(val as RequestSort)}>
                      <SelectTrigger aria-label="ترتيب الطلبات" className="h-9 w-full rounded-xl bg-background text-xs">
                        <ArrowUpDown className="ml-1.5 size-3.5 shrink-0 text-muted-foreground" />
                        <SelectValue placeholder="الترتيب" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="newest">الأحدث أولاً</SelectItem>
                        <SelectItem value="governorate_asc">المحافظة (أ - ي)</SelectItem>
                        <SelectItem value="governorate_desc">المحافظة (ي - أ)</SelectItem>
                        <SelectItem value="city_asc">المدينة (أ - ي)</SelectItem>
                        <SelectItem value="city_desc">المدينة (ي - أ)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {hasActiveFilters && (
                    <div className="sm:col-span-2 lg:col-span-1 flex items-center justify-end">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setStatusFilter("all");
                          setGovernorateFilter("all");
                          setCityFilter("all");
                          setSearchQuery("");
                          setSortBy("newest");
                        }}
                        className="h-9 w-full gap-1 rounded-xl text-xs font-semibold text-muted-foreground hover:text-foreground cursor-pointer"
                      >
                        <X className="size-3.5" />
                        <span>مسح</span>
                      </Button>
                    </div>
                  )}
                </div>
              )}

              {filteredRequests.length === 0 ? (
                <Card className="border-dashed border-border/80 bg-card/60">
                  <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="mb-3 flex size-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
                      <Inbox className="size-6" />
                    </div>
                    <p className="text-sm font-semibold text-foreground">
                      {requestStats.total === 0 ? "لا توجد طلبات في هذا الموسم بعد" : "لا توجد طلبات تطابق الفلتر المحدد"}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {requestStats.total === 0
                        ? "يمكنك تسجيل طلب موسمي جديد من صفحة إدارة الطلبات عبر زر «طلب موسمي»."
                        : "اختر حالة أخرى أو اضغط على «الكل» لعرض جميع طلبات الموسم."}
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-3">
                  {filteredRequests.map(request => {
                    const isOpen = expanded === request.id;
                    const status = reviewStatus(request.status);
                    const statusStyle = STATUS_STYLES[status];
                    const requestedServices = seasonalServiceIds.filter(service => (request.requested[service] ?? 0) > 0);

                    return (
                      <Card
                        key={request.id}
                        className={cn(
                          "overflow-hidden border-border/60 transition-all",
                          isOpen ? "ring-1 ring-primary/30 shadow-sm" : "hover:border-primary/30 hover:shadow-xs"
                        )}
                      >
                        <CardContent className="p-4 sm:p-5">
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div className="flex items-start gap-3 min-w-0 flex-1">
                              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                                <Building2 className="size-5" />
                              </div>
                              <div className="min-w-0 flex-1 space-y-1">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="rounded-md bg-muted px-2 py-0.5 font-mono text-xs font-bold text-muted-foreground">
                                    #{request.id}
                                  </span>
                                  <h3 className="break-words text-base font-bold text-foreground">
                                    {request.mosqueName}
                                  </h3>
                                  <Badge variant="outline" className={cn("gap-1.5 rounded-full text-xs font-semibold", statusStyle.badge)}>
                                    <span className={cn("size-1.5 rounded-full", statusStyle.dot)} />
                                    {seasonalStatusLabels[status]}
                                  </Badge>
                                </div>
                                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                                  <span className="inline-flex items-center gap-1">
                                    <MapPin className="size-3.5 text-primary/70" />
                                    {[requestGovernorate(request), requestCity(request), request.snapshot.district].filter(Boolean).join(" · ")}
                                  </span>
                                  <span className="inline-flex items-center gap-1">
                                    <Users className="size-3.5 text-primary/70" />
                                    {request.snapshot.worshippers.toLocaleString("ar-SA")} مصلٍ
                                  </span>
                                </div>
                                {(requestedServices.length > 0 || (request.extraServices && request.extraServices.length > 0)) && (
                                  <div className="flex flex-wrap gap-1.5 pt-1">
                                    {requestedServices.map(service => (
                                      <Badge
                                        key={service}
                                        variant="outline"
                                        className={cn("rounded-md text-[11px] font-medium", SERVICE_VISUALS[service].badgeBg)}
                                      >
                                        {seasonalServices[service].label} ({displayQuantity(service, request.requested[service] ?? 0)} {seasonalServices[service].unit})
                                      </Badge>
                                    ))}
                                    {request.extraServices?.map(extra => (
                                      <Badge
                                        key={extra.id}
                                        variant="outline"
                                        className="rounded-md border-amber-200 bg-amber-50/80 text-[11px] font-medium text-amber-800 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300"
                                      >
                                        + {extra.title} ({extra.quantity} {extra.unit})
                                      </Badge>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>

                            <div className="flex w-full sm:w-auto flex-wrap items-center justify-end sm:justify-start gap-2 shrink-0 self-stretch sm:self-center">
                              {request.scheduledFor && (
                                <Button
                                  asChild
                                  size="sm"
                                  variant="outline"
                                  className="gap-1.5 rounded-xl border-[#1a5f4a]/35 font-semibold text-[#1a5f4a] hover:bg-[#1a5f4a]/5 cursor-pointer"
                                >
                                  <Link href={`/mawasim/requests/${request.seasonId}/${request.id}/print`}>
                                    <FileText className="size-4" />
                                    <span>أمر العمل</span>
                                  </Link>
                                </Button>
                              )}
                              <Button
                                variant={isOpen ? "secondary" : "outline"}
                                size="sm"
                                aria-expanded={isOpen}
                                onClick={() => setExpanded(isOpen ? undefined : request.id)}
                                className="gap-1.5 rounded-xl font-semibold cursor-pointer"
                              >
                                <span>{isOpen ? "إخفاء التفاصيل" : "عرض التفاصيل"}</span>
                                <ChevronDown className={cn("size-4 transition-transform duration-200", isOpen && "rotate-180")} />
                              </Button>
                            </div>
                          </div>

                          {isOpen && (
                            <RequestDetails
                              key={request.id + request.status + (request.scheduledFor ?? "")}
                              request={request}
                              season={season}
                              employees={data?.employees ?? []}
                              canApprove={canApproveRequests}
                              refresh={refresh}
                            />
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}

                  <EnhancedPagination
                    page={currentPage}
                    totalPages={totalPages}
                    onPageChange={handlePageChange}
                    totalItems={totalFilteredItems}
                    itemsPerPage={PAGE_SIZE}
                    itemName="طلب"
                    itemNamePlural="طلبات"
                    className="rounded-2xl border border-border/60"
                  />
                </div>
              )}
              </section>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
  iconClass,
  valueClass,
}: {
  label: string;
  value: number;
  icon: typeof Building2;
  iconClass: string;
  valueClass?: string;
}) {
  return (
    <Card className="border-border/60 shadow-xs transition-all hover:shadow-sm">
      <CardContent className="flex items-center justify-between gap-3 p-4">
        <div className="min-w-0">
          <p className="truncate text-xs font-medium text-muted-foreground">{label}</p>
          <p className={cn("mt-1 text-2xl font-extrabold tabular-nums text-foreground", valueClass)}>
            {value.toLocaleString("ar-SA")}
          </p>
        </div>
        <div className={cn("flex size-11 shrink-0 items-center justify-center rounded-xl", iconClass)}>
          <Icon className="size-5" />
        </div>
      </CardContent>
    </Card>
  );
}

export function SeasonEditor({
  season,
  employees = [],
  onSave,
  onCancel,
}: {
  season?: Season;
  employees?: CompanyEmployee[];
  onSave: (id: number) => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState(season?.title ?? "");
  const [year, setYear] = useState(season?.hijriYear ?? 1448);
  const [managerId, setManagerId] = useState<number | null>(season?.managerId ?? null);
  const [open, setOpen] = useState(season?.isOpen ?? false);
  const [settings, setSettings] = useState<SeasonalSettings>(season?.settings ?? defaultSeasonalSettings);

  const managerOptions = useMemo(() => {
    const list = [...employees];
    if (season?.managerId && !list.some(emp => emp.id === season.managerId)) {
      list.unshift({
        id: season.managerId,
        name: season.managerName?.trim() || `موظف #${season.managerId}`,
        email: null,
        role: "",
        roleNameAr: null,
        position: null,
        department: null,
      });
    }
    return list;
  }, [employees, season?.managerId, season?.managerName]);

  const save = trpc.mawasim.saveSeason.useMutation({
    onSuccess: data => {
      toast.success(season ? "تم تحديث إعدادات الموسم بنجاح." : "تم إنشاء الموسم الجديد بنجاح.");
      onSave(data.id);
    },
    onError: error => toast.error(error.message),
  });

  const configure = (service: SeasonalService, updates: Partial<SeasonalSettings["services"][SeasonalService]>) =>
    setSettings(current => ({
      ...current,
      services: {
        ...current.services,
        [service]: { ...current.services[service], ...updates },
      },
    }));

  const enabledCount = seasonalServiceIds.filter(service => settings.services[service].enabled).length;

  return (
    <Card className="overflow-hidden border-primary/25 shadow-md">
      <CardHeader className="border-b border-border/60 bg-gradient-to-l from-primary/10 via-primary/5 to-transparent px-5 py-4 sm:px-6">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-xs">
              {season ? <Settings2 className="size-5" /> : <MoonStar className="size-5" />}
            </div>
            <div>
              <CardTitle className="text-lg font-bold text-foreground">
                {season ? "إعدادات الموسم" : "إنشاء موسم جديد"}
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                {season
                  ? "تعديل بيانات الموسم وحالة التسجيل وسعات الخدمات والميزانية المخصصة"
                  : "أدخل البيانات الأساسية للموسم وحدد الخدمات المفعّلة والسعات المتاحة لكل خدمة"}
              </CardDescription>
            </div>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onCancel}
            className="size-8 rounded-lg text-muted-foreground hover:text-foreground cursor-pointer"
            aria-label="إغلاق"
          >
            <X className="size-4" />
          </Button>
        </div>
      </CardHeader>

      <form
        onSubmit={event => {
          event.preventDefault();
          save.mutate({ id: season?.id, title, hijriYear: year, managerId, isOpen: open, settings });
        }}
      >
        <CardContent className="space-y-6 p-5 sm:p-6">
          {/* Step 1: Basic Info & Registration Toggle */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-bold text-foreground">
              <span className="flex size-6 items-center justify-center rounded-full bg-primary/15 text-xs font-extrabold text-primary">
                1
              </span>
              <span>البيانات الأساسية وحالة التسجيل</span>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <MawasimField label="اسم الموسم">
                <Input
                  required
                  minLength={3}
                  maxLength={160}
                  placeholder="مثال: موسم رمضان المبارك 1448 هـ"
                  className="h-10 rounded-xl bg-background"
                  value={title}
                  onChange={event => setTitle(event.target.value)}
                />
              </MawasimField>
              <MawasimField label="العام الهجري">
                <div className="relative">
                  <Input
                    required
                    type="number"
                    min="1400"
                    max="1600"
                    className="h-10 rounded-xl bg-background pl-10 tabular-nums"
                    value={year}
                    onChange={event => setYear(Number(event.target.value))}
                  />
                  <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-xs font-semibold text-muted-foreground">
                    هـ
                  </span>
                </div>
              </MawasimField>
              <MawasimField label="تعيين مدير للموسم">
                <Select
                  value={managerId ? String(managerId) : ""}
                  onValueChange={val => setManagerId(val === "none" || !val ? null : Number(val))}
                >
                  <SelectTrigger aria-label="تعيين مدير للموسم" className="h-10 w-full rounded-xl bg-background">
                    <SelectValue placeholder="اختر مدير الموسم" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">بدون مدير محدد</SelectItem>
                    {managerOptions.map(emp => {
                      const detail = emp.position?.trim() || emp.roleNameAr?.trim() || emp.email?.trim() || "";
                      return (
                        <SelectItem key={emp.id} value={String(emp.id)}>
                          {detail ? `${emp.name} — ${detail}` : emp.name}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </MawasimField>
            </div>

            <div
              className={cn(
                "flex flex-wrap sm:flex-nowrap items-center justify-between gap-4 rounded-xl border p-4 transition-colors",
                open
                  ? "border-emerald-300 bg-emerald-50/70 dark:border-emerald-800 dark:bg-emerald-950/30"
                  : "border-border/70 bg-muted/30"
              )}
            >
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-foreground">فتح التسجيل للموسم</span>
                  <Badge
                    variant="outline"
                    className={cn(
                      "rounded-full text-[11px] font-semibold",
                      open
                        ? "border-emerald-300 bg-emerald-100 text-emerald-800 dark:border-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-200"
                        : "border-border bg-background text-muted-foreground"
                    )}
                  >
                    {open ? "مفتوح الآن" : "مغلق"}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  {open
                    ? "يمكن تسجيل الطلبات الموسمية للمساجد ضمن الخدمات المفعّلة أدناه."
                    : "عند إغلاق التسجيل يُحفظ الموسم وإعداداته دون استقبال طلبات جديدة."}
                </p>
              </div>
              <Switch
                checked={open}
                onCheckedChange={setOpen}
                aria-label="فتح التسجيل"
                className="cursor-pointer"
              />
            </div>
          </div>

          {/* Step 2: Seasonal Services Configuration */}
          <div className="space-y-3.5 border-t border-border/60 pt-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-sm font-bold text-foreground">
                <span className="flex size-6 items-center justify-center rounded-full bg-primary/15 text-xs font-extrabold text-primary">
                  2
                </span>
                <span>الخدمات الموسمية والسعات والميزانية</span>
              </div>
              <Badge variant="outline" className="rounded-full text-xs font-semibold">
                {enabledCount} من {seasonalServiceIds.length} خدمات مفعّلة
              </Badge>
            </div>

            <div className="space-y-3">
              {seasonalServiceIds.map(service => {
                const limits = settings.services[service];
                const meta = seasonalServices[service];
                const visual = SERVICE_VISUALS[service];
                const Icon = visual.icon;
                const computed = seasonalCapacity(service, limits);
                const needsCapacity = limits.enabled && computed === 0;

                return (
                  <div
                    key={service}
                    className={cn(
                      "rounded-2xl border transition-all",
                      limits.enabled
                        ? cn(visual.activeBorder, visual.activeBg, "shadow-2xs")
                        : "border-border/60 bg-muted/15 hover:bg-muted/30"
                    )}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3 p-4">
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={cn(
                            "flex size-10 shrink-0 items-center justify-center rounded-xl transition-opacity",
                            visual.iconBg,
                            !limits.enabled && "opacity-60"
                          )}
                        >
                          <Icon className="size-5" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-sm font-bold text-foreground">{meta.label}</span>
                            <Badge variant="outline" className="rounded-md bg-background/80 text-[11px] font-medium">
                              {meta.unit}
                            </Badge>
                          </div>
                          <p className="mt-0.5 text-xs text-muted-foreground">{visual.description}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        {limits.enabled && (
                          <Badge
                            variant="outline"
                            className={cn(
                              "rounded-lg px-2.5 py-1 text-xs font-bold tabular-nums",
                              needsCapacity
                                ? "border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300"
                                : visual.badgeBg
                            )}
                          >
                            السعة المحسوبة: {displayQuantity(service, computed)} {meta.unit}
                          </Badge>
                        )}
                        <Switch
                          checked={limits.enabled}
                          onCheckedChange={checked => configure(service, { enabled: checked })}
                          aria-label={`تفعيل ${meta.label}`}
                          className="cursor-pointer"
                        />
                      </div>
                    </div>

                    {limits.enabled && (
                      <div className="border-t border-border/50 bg-background/70 px-4 pb-4 pt-3.5 rounded-b-2xl">
                        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                          {([
                            ["capacity", `السعة (${meta.unit})`, meta.scale, "الحد الأقصى للخدمة"],
                            ["perMosqueLimit", `سقف المسجد (${meta.unit})`, meta.scale, "0 = بدون سقف"],
                            ["budgetHalalas", "الميزانية (ريال)", 100, "اختياري"],
                            ["unitPriceHalalas", "تكلفة الوحدة (ريال)", 100, "مطلوب مع الميزانية"],
                          ] as const).map(([key, label, scale, hint]) => (
                            <MawasimField key={key} label={label}>
                              <Input
                                type="number"
                                min="0"
                                step={1 / scale}
                                placeholder={hint}
                                className="h-9 rounded-lg bg-background tabular-nums"
                                value={limits[key] / scale}
                                onChange={event =>
                                  configure(service, { [key]: Math.round(Number(event.target.value) * scale) })
                                }
                              />
                            </MawasimField>
                          ))}
                        </div>
                        <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 text-xs">
                          <span className="text-muted-foreground">
                            السعة المحسوبة تلقائياً وفق السعة المباشرة والميزانية:{" "}
                            <strong className="text-foreground tabular-nums">
                              {displayQuantity(service, computed)} {meta.unit}
                            </strong>
                          </span>
                          {needsCapacity && (
                            <span className="inline-flex items-center gap-1 font-medium text-amber-700 dark:text-amber-400">
                              <AlertCircle className="size-3.5" />
                              أدخل سعة موجبة أو ميزانية وتكلفة وحدة لتفعيل الخدمة
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/60 pt-4">
            <p className="text-xs text-muted-foreground">
              {enabledCount === 0
                ? "فعّل خدمة واحدة على الأقل قبل فتح التسجيل."
                : `جاهز للحفظ مع ${enabledCount} ${enabledCount === 1 ? "خدمة مفعّلة" : "خدمات مفعّلة"}.`}
            </p>
            <div className="flex w-full sm:w-auto flex-wrap items-center justify-end gap-2 [&>button]:flex-1 sm:[&>button]:flex-initial">
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                className="h-10 rounded-xl px-5 font-semibold cursor-pointer"
              >
                إلغاء
              </Button>
              <Button
                type="submit"
                disabled={save.isPending}
                className="h-10 gap-2 rounded-xl px-6 font-bold shadow-xs cursor-pointer"
              >
                {save.isPending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
                <span>{save.isPending ? "جارٍ الحفظ…" : "حفظ الموسم"}</span>
              </Button>
            </div>
          </div>
        </CardContent>
      </form>
    </Card>
  );
}

function Quantities({
  value,
  onChange,
  services,
}: {
  value: SeasonalQuantities;
  onChange: (value: SeasonalQuantities) => void;
  services: SeasonalService[];
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {services.map(service => {
        const { label, unit, scale } = seasonalServices[service];
        return (
          <MawasimField key={service} label={`${label} (${unit})`}>
            <Input
              type="number"
              min="0"
              step={1 / scale}
              className="h-9 rounded-lg bg-background tabular-nums"
              value={value[service] === undefined ? "" : value[service] / scale}
              onChange={event => onChange({ ...value, [service]: Math.round(Number(event.target.value) * scale) })}
            />
          </MawasimField>
        );
      })}
    </div>
  );
}

export function RequestDetails({
  request,
  season,
  employees = [],
  canApprove,
  refresh,
}: {
  request: SeasonRequest;
  season: Season;
  employees?: CompanyEmployee[];
  canApprove: boolean;
  refresh: () => void;
}) {
  const [showPhotos, setShowPhotos] = useState(false);
  const hasPhotos = Boolean(request.hasPhotos);
  const { men, women } = request.snapshot;
  const defaultAssigneeId = request.assignedTo ?? season.managerId ?? null;
  const [scheduledFor, setScheduledFor] = useState(request.scheduledFor ?? "");
  const [assignedTo, setAssignedTo] = useState<number | null>(defaultAssigneeId);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [approved, setApproved] = useState(request.requested);
  const [note, setNote] = useState("");
  const key = { seasonId: request.seasonId, requestId: request.id };
  const photos = trpc.mawasim.photos.useQuery(key, { enabled: hasPhotos && showPhotos });

  const assigneeOptions = useMemo(() => {
    const list = [...employees];
    if (defaultAssigneeId && !list.some(emp => emp.id === defaultAssigneeId)) {
      const fallbackName =
        (request.assignedTo === defaultAssigneeId ? request.assignee : null) ??
        (season.managerId === defaultAssigneeId ? season.managerName : null) ??
        `موظف #${defaultAssigneeId}`;
      list.unshift({
        id: defaultAssigneeId,
        name: fallbackName,
        email: null,
        role: "",
        roleNameAr: null,
        position: null,
        department: null,
      });
    }
    return list;
  }, [employees, defaultAssigneeId, request.assignedTo, request.assignee, season.managerId, season.managerName]);

  const review = trpc.mawasim.review.useMutation({
    onSuccess: () => {
      toast.success("تم تحديث حالة الطلب بنجاح.");
      setShowScheduleModal(false);
      refresh();
    },
    onError: (error: { message: string }) => toast.error(error.message),
  });

  const activeServices = seasonalServiceIds.filter(
    service => request.requested[service] || request.approved?.[service]
  );

  const openScheduleApproveModal = () => {
    setScheduledFor(request.scheduledFor ?? "");
    setAssignedTo(request.assignedTo ?? season.managerId ?? null);
    setShowScheduleModal(true);
  };

  return (
    <div className="mt-4 space-y-4 border-t border-border/60 pt-4">
      {/* Info Summary Cards */}
      <div className="grid gap-3 md:grid-cols-2">
        <div className="space-y-2 rounded-xl border border-border/60 bg-muted/20 p-3.5 text-sm">
          <div className="flex items-center gap-2 font-bold text-foreground">
            <MapPin className="size-4 text-primary" />
            <span>بيانات الموقع والقياسات</span>
          </div>
          <p className="break-words text-muted-foreground">
            {[requestGovernorate(request), requestCity(request), request.snapshot.district, request.snapshot.address].filter(Boolean).join(" · ")} · {request.snapshot.worshippers.toLocaleString("ar-SA")} مصلٍ
          </p>
          {men && (
            <>
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1 rounded-md bg-background px-2 py-1 border border-border/50">
                  <Ruler className="size-3.5 text-primary" />
                  مصلى الرجال: {men.lengthCm / 100} × {men.widthCm / 100} م
                </span>
                {women && (
                  <span className="inline-flex items-center gap-1 rounded-md bg-background px-2 py-1 border border-border/50">
                    <Ruler className="size-3.5 text-primary" />
                    مصلى النساء: {women.lengthCm / 100} × {women.widthCm / 100} م
                  </span>
                )}
              </div>
              {hasPhotos && (
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => setShowPhotos(!showPhotos)}
                    className="h-8 gap-1.5 rounded-lg text-xs cursor-pointer"
                  >
                    <ImageIcon className="size-3.5" />
                    {showPhotos ? "إخفاء الصور" : "عرض صور المصليات"}
                  </Button>
                </div>
              )}
            </>
          )}
        </div>

        <div className="space-y-2 rounded-xl border border-border/60 bg-muted/20 p-3.5 text-sm">
          <div className="flex items-center gap-2 font-bold text-foreground">
            <User className="size-4 text-primary" />
            <span>بيانات مقدم الطلب والمتابعة</span>
          </div>
          <p className="text-foreground font-medium">{request.contact.name}</p>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            {request.contact.phone && (
              <span className="inline-flex items-center gap-1">
                <Phone className="size-3.5" />
                {request.contact.phone}
              </span>
            )}
            {request.contact.email && <span className="break-all">{request.contact.email}</span>}
          </div>
          {request.contact.reason && (
            <p className="text-xs text-muted-foreground">
              <strong className="text-foreground">ملاحظة التسجيل:</strong> {request.contact.reason}
            </p>
          )}
          {request.specialRequest && (
            <p className="rounded-lg border border-amber-200/70 bg-amber-50/50 p-2 text-xs text-amber-900 dark:border-amber-800/50 dark:bg-amber-950/30 dark:text-amber-200">
              <strong>طلب خاص:</strong> {request.specialRequest}
            </p>
          )}
          {request.reviewNote && (
            <p className="text-xs text-muted-foreground">
              <strong className="text-foreground">ملاحظة المراجعة:</strong> {request.reviewNote}
            </p>
          )}
          {request.scheduledFor && (
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-indigo-200/70 bg-indigo-50/50 px-2.5 py-2 text-xs text-indigo-800 dark:border-indigo-800/60 dark:bg-indigo-950/30 dark:text-indigo-200">
              <span>
                <strong>موعد التنفيذ المجدول:</strong> {request.scheduledFor}
                {request.assignee ? ` · المكلّف: ${request.assignee}` : ""}
              </span>
              <Button
                asChild
                size="sm"
                variant="outline"
                className="h-7 gap-1.5 rounded-lg border-[#1a5f4a]/35 bg-background px-2.5 text-[11px] font-bold text-[#1a5f4a] hover:bg-[#1a5f4a]/5 cursor-pointer"
              >
                <Link href={`/mawasim/requests/${request.seasonId}/${request.id}/print`}>
                  <FileText className="size-3.5" />
                  <span>أمر العمل</span>
                </Link>
              </Button>
            </div>
          )}
          {request.execution && (
            <p className="text-xs text-emerald-700 dark:text-emerald-300">
              قياسات التنفيذ المحفوظة سابقًا: الرجال {request.execution.men.lengthCm / 100} × {request.execution.men.widthCm / 100} م
              {request.execution.women &&
                ` · النساء ${request.execution.women.lengthCm / 100} × ${request.execution.women.widthCm / 100} م`}
              {request.execution.notes && ` · ${request.execution.notes}`}
            </p>
          )}
        </div>
      </div>

      {/* Photos Viewer */}
      {hasPhotos && showPhotos && photos.isLoading && (
        <p role="status" className="flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          جارٍ تحميل الصور…
        </p>
      )}
      {hasPhotos && showPhotos && photos.error && (
        <p role="alert" className="text-xs text-destructive">{photos.error.message}</p>
      )}
      {hasPhotos && showPhotos && photos.data && (
        <div className="grid gap-3 sm:grid-cols-2">
          {photos.data.menPhoto && (
            <div className="overflow-hidden rounded-xl border bg-muted/20 p-2">
              <p className="mb-1.5 text-xs font-semibold text-muted-foreground">صورة مصلى الرجال</p>
              <img className="max-h-64 w-full rounded-lg object-contain" src={photos.data.menPhoto} alt="مصلى الرجال" />
            </div>
          )}
          {photos.data.womenPhoto && (
            <div className="overflow-hidden rounded-xl border bg-muted/20 p-2">
              <p className="mb-1.5 text-xs font-semibold text-muted-foreground">صورة مصلى النساء</p>
              <img className="max-h-64 w-full rounded-lg object-contain" src={photos.data.womenPhoto} alt="مصلى النساء" />
            </div>
          )}
        </div>
      )}

      {/* Services Quantities Summary */}
      {activeServices.length > 0 && (
        <div className="rounded-xl border border-border/60 bg-background p-3.5">
          <h4 className="mb-2.5 text-xs font-bold text-foreground">ملخص الخدمات والكميات</h4>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {activeServices.map(service => {
              const meta = seasonalServices[service];
              const requestedAmount = request.requested[service] ?? 0;
              const ceiling = seasonalMosqueLimit(service, season.settings, request.snapshot.worshippers);
              const exceedsCeiling = Number.isFinite(ceiling) && requestedAmount > ceiling;
              return (
                <div key={service} className="rounded-lg border border-border/50 bg-muted/20 p-2.5 text-xs">
                  <div className="flex flex-wrap items-center justify-between gap-1.5">
                    <p className="font-bold text-foreground">{meta.label}</p>
                    {exceedsCeiling && (
                      <Badge variant="outline" className="border-amber-300 bg-amber-50 text-[10px] text-amber-800 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
                        يتجاوز سقف المسجد
                      </Badge>
                    )}
                  </div>
                  <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-muted-foreground">
                    <span>
                      المطلوب: <strong className="text-foreground">{displayQuantity(service, requestedAmount)}</strong> {meta.unit}
                    </span>
                    {Number.isFinite(ceiling) && (
                      <span>
                        سقف المسجد: <strong className="text-foreground">{displayQuantity(service, ceiling)}</strong> {meta.unit}
                      </span>
                    )}
                    {request.approved && (
                      <span>
                        المعتمد: <strong className="text-sky-700 dark:text-sky-400">{displayQuantity(service, request.approved[service] ?? 0)}</strong>
                      </span>
                    )}
                    {request.execution && (
                      <span>
                        المنفّذ: <strong className="text-emerald-700 dark:text-emerald-400">{displayQuantity(service, request.execution.performed[service] ?? 0)}</strong>
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Extra Services & Season Expense Summary */}
      {request.extraServices && request.extraServices.length > 0 && (
        <div className="rounded-xl border border-amber-200/80 bg-amber-50/40 p-3.5 dark:border-amber-900/50 dark:bg-amber-950/20">
          <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
            <h4 className="flex items-center gap-1.5 text-xs font-bold text-foreground">
              <Wallet className="size-3.5 text-amber-600 dark:text-amber-400" />
              <span>خدمات إضافية مرفقة (مصرف على الموسم)</span>
            </h4>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {request.extraServices.map(item => (
              <div key={item.id} className="rounded-lg border border-amber-200/70 bg-background p-2.5 text-xs dark:border-amber-900/50">
                <p className="font-bold text-foreground">{item.title}</p>
                <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-muted-foreground">
                  <span>
                    الكمية: <strong className="text-foreground tabular-nums">{item.quantity} {item.unit}</strong>
                  </span>
                </div>
                {item.notes && <p className="mt-1 text-[11px] text-muted-foreground">{item.notes}</p>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Review Actions */}
      {canApprove && !["approved", "completed", "rejected"].includes(request.status) && (
        <section className="space-y-3 rounded-xl border border-border/70 bg-muted/15 p-4">
          <h4 className="text-sm font-bold text-foreground">مراجعة الطلب والاعتماد وحجز السعة</h4>
          <Quantities
            value={approved}
            onChange={setApproved}
            services={seasonalServiceIds.filter(service => (service !== "carpet" || men) &&
              (request.requested[service] || request.specialRequest))}
          />
          <MawasimField label="ملاحظة المراجعة أو سبب الاعتذار">
            <Textarea
              maxLength={2000}
              className="rounded-xl bg-background"
              placeholder="اكتب ملاحظة الاعتماد أو سبب الاعتذار عن الطلب..."
              value={note}
              onChange={event => setNote(event.target.value)}
            />
          </MawasimField>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              disabled={review.isPending}
              onClick={openScheduleApproveModal}
              className="gap-1.5 rounded-xl cursor-pointer"
            >
              <CheckCircle2 className="size-4" />
              اعتماد الكميات
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={!note.trim() || review.isPending}
              onClick={() => review.mutate({ ...key, approved: null, note })}
              className="gap-1.5 rounded-xl border-rose-200 text-rose-700 hover:bg-rose-50 dark:border-rose-900 dark:text-rose-300 cursor-pointer"
            >
              <XCircle className="size-4" />
              الاعتذار عن الطلب
            </Button>
          </div>
        </section>
      )}

      {/* Modal جدولة موعد التنفيذ عند الضغط على اعتماد الكميات */}
      <Dialog open={showScheduleModal} onOpenChange={setShowScheduleModal}>
        <DialogContent dir="rtl" className="sm:max-w-lg max-h-[calc(100dvh-2rem)] overflow-y-auto rounded-2xl p-4 sm:p-6">
          <DialogHeader className="ps-8 text-right">
            <DialogTitle className="flex items-center gap-2 text-base font-bold text-foreground">
              <Calendar className="size-4 text-primary" />
              <span>1. جدولة موعد التنفيذ (مطلوبة قبل الاعتماد)</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              حدد تاريخ موعد التنفيذ والموظف المكلّف بالتنفيذ لاستكمال اعتماد طلب {request.mosqueName}.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <MawasimField label="تاريخ موعد التنفيذ">
              <Input
                type="date"
                required
                value={scheduledFor}
                onChange={event => setScheduledFor(event.target.value)}
                className="h-10 rounded-xl bg-background tabular-nums"
              />
            </MawasimField>

            <MawasimField label="المكلّف بالتنفيذ (اختياري)">
              <Select
                value={assignedTo ? String(assignedTo) : ""}
                onValueChange={val => setAssignedTo(val === "none" || !val ? null : Number(val))}
              >
                <SelectTrigger aria-label="المكلّف بالتنفيذ" className="h-10 w-full rounded-xl bg-background">
                  <SelectValue placeholder="اختر الموظف المكلّف بالتنفيذ" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">بدون تكليف محدد</SelectItem>
                  {assigneeOptions.map(emp => (
                    <SelectItem key={emp.id} value={String(emp.id)}>
                      {emp.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </MawasimField>
          </div>

          <DialogFooter className="flex-col-reverse sm:flex-row gap-2 sm:justify-start [&>button]:w-full sm:[&>button]:w-auto">
            <Button
              type="button"
              disabled={!scheduledFor || review.isPending}
              onClick={() => review.mutate({
                ...key,
                approved,
                note,
                scheduledFor,
                assignedTo,
              })}
              className="gap-1.5 rounded-xl cursor-pointer"
            >
              {review.isPending ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />}
              <span>تأكيد الجدولة واعتماد الطلب</span>
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowScheduleModal(false)}
              className="rounded-xl cursor-pointer"
            >
              إلغاء
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
