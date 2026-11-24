import { useMemo, useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { displayQuantity, MawasimField } from "@/components/MawasimRequestForm";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import type { inferRouterOutputs } from "@trpc/server";
import type { AppRouter } from "../../../server/routers";
import {
  canManageMawasim, defaultSeasonalSettings, seasonalCapacity, seasonalServiceIds, seasonalServices, seasonalStatusLabels,
  type SeasonalQuantities, type SeasonalService, type SeasonalSettings,
} from "@shared/mawasim";
import {
  AlertCircle,
  BarChart3,
  Building2,
  Calendar,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  Clock,
  Droplets,
  Image as ImageIcon,
  Inbox,
  Loader2,
  MapPin,
  MoonStar,
  Phone,
  Plus,
  Ruler,
  Save,
  Settings2,
  Sparkles,
  User,
  Users,
  Volume2,
  Wind,
  Wrench,
  X,
  XCircle,
} from "lucide-react";

type Dashboard = inferRouterOutputs<AppRouter>["mawasim"]["staff"];
type Season = NonNullable<Dashboard["season"]>;
type SeasonRequest = Dashboard["requests"][number];
type RequestStatus = Exclude<SeasonRequest["status"], "scheduled" | "completed">;

function reviewStatus(status: SeasonRequest["status"]): RequestStatus {
  return status === "scheduled" || status === "completed" ? "approved" : status;
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
  const { user } = useAuth();
  const canManage = canManageMawasim(user?.role);
  const [seasonId, setSeasonId] = useState<number>();
  const [edit, setEdit] = useState<"new" | "saved">();
  const [expanded, setExpanded] = useState<number>();
  const [statusFilter, setStatusFilter] = useState<"all" | RequestStatus>("all");

  const dashboard = trpc.mawasim.staff.useQuery(seasonId ? { seasonId } : undefined, { enabled: canManage });
  const data = dashboard.data;
  const season = data?.season;
  const refresh = () => { void dashboard.refetch(); };

  const byLocation = useMemo(() => {
    const map = new Map<string, number>();
    for (const request of data?.requests ?? []) {
      const location = request.snapshot.city + " · " + request.snapshot.district;
      map.set(location, (map.get(location) ?? 0) + 1);
    }
    return map;
  }, [data?.requests]);

  const requestStats = useMemo(() => {
    const list = data?.requests ?? [];
    return {
      total: list.length,
      submitted: list.filter(row => row.status === "submitted").length,
      approved: list.filter(row => reviewStatus(row.status) === "approved").length,
      rejected: list.filter(row => row.status === "rejected").length,
    };
  }, [data?.requests]);

  const filteredRequests = useMemo(() => {
    const list = data?.requests ?? [];
    if (statusFilter === "all") return list;
    return list.filter(row => reviewStatus(row.status) === statusFilter);
  }, [data?.requests, statusFilter]);

  const enabledServicesCount = season
    ? seasonalServiceIds.filter(service => season.settings.services[service].enabled).length
    : 0;

  if (!canManage) {
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
      <div dir="rtl" className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6">
        {/* Hero Header */}
        <header className="relative overflow-hidden rounded-2xl border border-teal-700/20 bg-gradient-to-l from-teal-700 via-teal-600 to-emerald-700 p-5 text-white shadow-md sm:p-7">
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
            <Button
              onClick={() => setEdit(edit === "new" ? undefined : "new")}
              className={cn(
                "h-10 gap-2 rounded-xl px-4 font-bold shadow-sm transition-all cursor-pointer",
                edit === "new"
                  ? "bg-white/20 text-white hover:bg-white/30 border border-white/30"
                  : "bg-white text-teal-900 hover:bg-white/95"
              )}
            >
              {edit === "new" ? <X className="size-4" /> : <Plus className="size-4" />}
              <span>{edit === "new" ? "إغلاق النموذج" : "إضافة موسم"}</span>
            </Button>
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
        {edit === "new" && (
          <SeasonEditor
            onCancel={() => setEdit(undefined)}
            onSave={id => {
              setSeasonId(id);
              setEdit(undefined);
              refresh();
            }}
          />
        )}

        {/* No Seasons Empty State */}
        {data && !season && edit !== "new" && (
          <Card className="border-dashed border-border/80 bg-card/60">
            <CardContent className="flex flex-col items-center justify-center py-14 text-center">
              <div className="mb-4 flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <CalendarDays className="size-7" />
              </div>
              <h2 className="text-base font-bold text-foreground">لا توجد مواسم محفوظة بعد</h2>
              <p className="mt-1 max-w-md text-sm text-muted-foreground">
                ابدأ بإنشاء موسم جديد وتحديد الخدمات والسعات المتاحة لتأهيل المساجد.
              </p>
              <Button className="mt-5 gap-2 rounded-xl" onClick={() => setEdit("new")}>
                <Plus className="size-4" />
                إضافة أول موسم
              </Button>
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
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 border-t pt-3 lg:border-t-0 lg:pt-0">
                  <Button
                    variant={edit === "saved" ? "default" : "outline"}
                    onClick={() => setEdit(edit === "saved" ? undefined : "saved")}
                    className="h-9 gap-2 rounded-xl font-semibold cursor-pointer"
                  >
                    {edit === "saved" ? <X className="size-4" /> : <Settings2 className="size-4" />}
                    <span>{edit === "saved" ? "إغلاق الإعدادات" : "إعدادات الموسم"}</span>
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Saved Season Editor */}
            {edit === "saved" && (
              <SeasonEditor
                key={season.id}
                season={season}
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
                        لم يتم تفعيل سعات للخدمات في هذا الموسم بعد. افتح «إعدادات الموسم» لضبط السعات.
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

                {byLocation.size > 0 && (
                  <div className="border-t border-border/50 bg-muted/15 px-5 py-4">
                    <h3 className="mb-2.5 flex items-center gap-1.5 text-xs font-bold text-foreground">
                      <MapPin className="size-3.5 text-primary" />
                      توزيع المساجد حسب المدينة والحي
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {Array.from(byLocation, ([location, count]) => (
                        <span
                          key={location}
                          className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-background px-3 py-1 text-xs font-medium text-foreground shadow-2xs"
                        >
                          <span>{location}</span>
                          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-bold text-primary">
                            {count}
                          </span>
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Season Requests List */}
            <section className="space-y-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-lg font-bold text-foreground">
                    طلبات الموسم
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    مراجعة الطلبات الموسمية واعتماد الكميات وحجز السعة
                  </p>
                </div>

                {data.requests.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5">
                    {([
                      ["all", "الكل", data.requests.length],
                      ["submitted", seasonalStatusLabels.submitted, requestStats.submitted],
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
                )}
              </div>

              {filteredRequests.length === 0 ? (
                <Card className="border-dashed border-border/80 bg-card/60">
                  <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="mb-3 flex size-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
                      <Inbox className="size-6" />
                    </div>
                    <p className="text-sm font-semibold text-foreground">
                      {data.requests.length === 0 ? "لا توجد طلبات في هذا الموسم بعد" : "لا توجد طلبات تطابق الفلتر المحدد"}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {data.requests.length === 0
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
                            <div className="flex items-start gap-3 min-w-0">
                              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                                <Building2 className="size-5" />
                              </div>
                              <div className="min-w-0 space-y-1">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="rounded-md bg-muted px-2 py-0.5 font-mono text-xs font-bold text-muted-foreground">
                                    #{request.id}
                                  </span>
                                  <h3 className="truncate text-base font-bold text-foreground">
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
                                    {request.snapshot.city} · {request.snapshot.district}
                                  </span>
                                  <span className="inline-flex items-center gap-1">
                                    <Users className="size-3.5 text-primary/70" />
                                    {request.snapshot.worshippers.toLocaleString("ar-SA")} مصلٍ
                                  </span>
                                </div>
                                {requestedServices.length > 0 && (
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
                                  </div>
                                )}
                              </div>
                            </div>

                            <Button
                              variant={isOpen ? "secondary" : "outline"}
                              size="sm"
                              aria-expanded={isOpen}
                              onClick={() => setExpanded(isOpen ? undefined : request.id)}
                              className="shrink-0 gap-1.5 rounded-xl font-semibold cursor-pointer self-start sm:self-center"
                            >
                              <span>{isOpen ? "إخفاء التفاصيل" : "عرض التفاصيل"}</span>
                              <ChevronDown className={cn("size-4 transition-transform duration-200", isOpen && "rotate-180")} />
                            </Button>
                          </div>

                          {isOpen && (
                            <RequestDetails
                              key={request.id + request.status}
                              request={request}
                              refresh={refresh}
                            />
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </section>
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

function SeasonEditor({
  season,
  onSave,
  onCancel,
}: {
  season?: Season;
  onSave: (id: number) => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState(season?.title ?? "");
  const [year, setYear] = useState(season?.hijriYear ?? 1448);
  const [open, setOpen] = useState(season?.isOpen ?? false);
  const [settings, setSettings] = useState<SeasonalSettings>(season?.settings ?? defaultSeasonalSettings);

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
          save.mutate({ id: season?.id, title, hijriYear: year, isOpen: open, settings });
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

            <div className="grid gap-4 sm:grid-cols-2">
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
            </div>

            <div
              className={cn(
                "flex items-center justify-between gap-4 rounded-xl border p-4 transition-colors",
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
            <div className="flex items-center gap-2">
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

function RequestDetails({
  request,
  refresh,
}: {
  request: SeasonRequest;
  refresh: () => void;
}) {
  const [showPhotos, setShowPhotos] = useState(false);
  const { men, women } = request.snapshot;
  const [approved, setApproved] = useState(request.requested);
  const [note, setNote] = useState("");
  const key = { seasonId: request.seasonId, requestId: request.id };
  const photos = trpc.mawasim.photos.useQuery(key, { enabled: showPhotos });
  const options = {
    onSuccess: () => {
      toast.success("تم تحديث حالة الطلب بنجاح.");
      refresh();
    },
    onError: (error: { message: string }) => toast.error(error.message),
  };
  const review = trpc.mawasim.review.useMutation(options);

  const activeServices = seasonalServiceIds.filter(
    service => request.requested[service] || request.approved?.[service]
  );

  return (
    <div className="mt-4 space-y-4 border-t border-border/60 pt-4">
      {/* Info Summary Cards */}
      <div className="grid gap-3 md:grid-cols-2">
        <div className="space-y-2 rounded-xl border border-border/60 bg-muted/20 p-3.5 text-sm">
          <div className="flex items-center gap-2 font-bold text-foreground">
            <MapPin className="size-4 text-primary" />
            <span>بيانات الموقع والقياسات</span>
          </div>
          <p className="text-muted-foreground">
            {request.snapshot.address} · {request.snapshot.worshippers.toLocaleString("ar-SA")} مصلٍ
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
            {request.contact.email && <span>{request.contact.email}</span>}
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
            <p className="text-xs font-medium text-indigo-700 dark:text-indigo-300">
              موعد التنفيذ المحفوظ سابقًا: {request.scheduledFor} · المكلّف: {request.assignee}
            </p>
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
      {showPhotos && photos.isLoading && (
        <p role="status" className="flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          جارٍ تحميل الصور…
        </p>
      )}
      {showPhotos && photos.error && (
        <p role="alert" className="text-xs text-destructive">{photos.error.message}</p>
      )}
      {showPhotos && photos.data && (
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
              return (
                <div key={service} className="rounded-lg border border-border/50 bg-muted/20 p-2.5 text-xs">
                  <p className="font-bold text-foreground">{meta.label}</p>
                  <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-muted-foreground">
                    <span>
                      المطلوب: <strong className="text-foreground">{displayQuantity(service, request.requested[service] ?? 0)}</strong> {meta.unit}
                    </span>
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

      {/* Review Actions */}
      {!["completed", "rejected"].includes(request.status) && (
        <section className="space-y-3 rounded-xl border border-border/70 bg-muted/15 p-4">
          <h4 className="text-sm font-bold text-foreground">مراجعة الطلب والاعتماد وحجز السعة</h4>
          {request.status === "submitted" && (
            <Quantities
              value={approved}
              onChange={setApproved}
              services={seasonalServiceIds.filter(service => (service !== "carpet" || men) &&
                (request.requested[service] || request.specialRequest))}
            />
          )}
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
            {request.status === "submitted" && (
              <Button
                disabled={review.isPending}
                onClick={() => review.mutate({ ...key, approved, note })}
                className="gap-1.5 rounded-xl cursor-pointer"
              >
                <CheckCircle2 className="size-4" />
                اعتماد الكميات
              </Button>
            )}
            <Button
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
    </div>
  );
}
