import { useEffect, useId, useMemo, useState } from "react";
import { Link, useLocation } from "wouter";
import { useAnyPermission } from "@/hooks/usePermission";
import DashboardLayout from "@/components/DashboardLayout";
import MawasimRequestForm, { type MawasimMosque } from "@/components/MawasimRequestForm";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc";
import { MAWASIM_PERMISSION_IDS } from "@shared/mawasim";
import {
  AlertCircle,
  ArrowRight,
  Building2,
  CalendarDays,
  Check,
  ChevronsUpDown,
  Loader2,
  Mail,
  MapPin,
  MoonStar,
  Phone,
  User,
  Users,
} from "lucide-react";

const REQUESTER_TYPE_LABELS: Record<string, string> = {
  imam: "إمام",
  muezzin: "مؤذن",
  board_member: "عضو مجلس إدارة",
  committee_member: "عضو لجنة",
  volunteer: "متطوع",
  donor: "متبرع",
  other: "أخرى",
};

export function LinkedRequesterSummary({
  linkedRequester,
}: {
  linkedRequester: MawasimMosque["linkedRequester"];
}) {
  if (!linkedRequester) return null;
  const typeLabel = linkedRequester.requesterType
    ? REQUESTER_TYPE_LABELS[linkedRequester.requesterType] ?? linkedRequester.requesterType
    : null;

  return (
    <div className="rounded-xl border border-emerald-200/80 bg-emerald-50/60 px-4 py-3 text-xs space-y-1.5 dark:border-emerald-900/50 dark:bg-emerald-950/25">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1.5 font-bold text-emerald-900 dark:text-emerald-200">
          <User className="size-4 text-emerald-700 dark:text-emerald-400" />
          بيانات المستفيد المرتبط بالمسجد
        </span>
        {typeLabel && (
          <Badge variant="outline" className="border-emerald-300 bg-background/80 text-[11px] font-semibold text-emerald-800 dark:border-emerald-800 dark:text-emerald-300">
            {typeLabel}
          </Badge>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-foreground">
        <span className="font-semibold">{linkedRequester.name}</span>
        {linkedRequester.phone && (
          <span className="inline-flex items-center gap-1 text-muted-foreground" dir="ltr">
            <Phone className="size-3.5 text-emerald-700/80 dark:text-emerald-400" />
            {linkedRequester.phone}
          </span>
        )}
        {linkedRequester.email && (
          <span className="inline-flex items-center gap-1 text-muted-foreground" dir="ltr">
            <Mail className="size-3.5 text-emerald-700/80 dark:text-emerald-400" />
            {linkedRequester.email}
          </span>
        )}
      </div>
    </div>
  );
}

export default function SeasonalRequestCreate() {
  const [, navigate] = useLocation();
  const canAccessMawasim = useAnyPermission(MAWASIM_PERMISSION_IDS);
  const canCreate = useAnyPermission(["requests.create_seasonal_request", ...MAWASIM_PERMISSION_IDS]);

  const [seasonId, setSeasonId] = useState<number>();
  const [mosqueOpen, setMosqueOpen] = useState(false);
  const [selectedMosqueId, setSelectedMosqueId] = useState<number>();
  const mosqueHintId = useId();

  const staffQuery = trpc.mawasim.staff.useQuery(seasonId ? { seasonId } : undefined, {
    enabled: canCreate,
  });
  const mosquesQuery = trpc.mawasim.searchMosques.useQuery(undefined, {
    enabled: canCreate,
  });

  const data = staffQuery.data;
  const openSeasons = useMemo(
    () => (data?.seasons ?? []).filter(item => item.isOpen),
    [data?.seasons],
  );

  // Auto-select the first open season if current season is closed or unset
  useEffect(() => {
    if (!data) return;
    if (seasonId && openSeasons.some(item => item.id === seasonId)) return;
    if (openSeasons.length > 0 && data.season?.id !== openSeasons[0].id) {
      setSeasonId(openSeasons[0].id);
    }
  }, [data, openSeasons, seasonId]);

  const activeSeason = data?.season && data.season.isOpen ? data.season : undefined;
  const mosques = (mosquesQuery.data ?? []) as MawasimMosque[];
  const selectedMosque = useMemo(
    () => mosques.find(item => item.id === selectedMosqueId),
    [mosques, selectedMosqueId],
  );

  if (!canCreate) {
    return (
      <DashboardLayout tabletNavigation>
        <div dir="rtl" className="mx-auto max-w-2xl p-6">
          <Card className="border-destructive/30 bg-destructive/5">
            <CardContent className="flex items-center gap-3 p-6 text-destructive">
              <AlertCircle className="size-5 shrink-0" />
              <p className="text-sm font-medium">ليس لديك صلاحية الوصول إلى برنامج مواسم.</p>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout tabletNavigation>
      <div dir="rtl" className="mx-auto max-w-5xl space-y-6 p-4 sm:p-6">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <Link href="/requests">
              <Button
                variant="outline"
                size="icon"
                type="button"
                className="size-10 shrink-0 rounded-xl cursor-pointer"
                aria-label="العودة إلى الطلبات"
              >
                <ArrowRight className="size-5" />
              </Button>
            </Link>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="truncate text-xl font-extrabold text-foreground sm:text-2xl">
                  برنامج مواسم
                </h1>
                <Badge className="bg-emerald-600 text-white hover:bg-emerald-600">
                  <MoonStar className="ml-1 size-3" />
                  مواسم
                </Badge>
              </div>
              <p className="mt-0.5 text-xs text-muted-foreground sm:text-sm">
                تسجيل طلب تأهيل مسجد جديد ضمن برنامج مواسم للخدمات الرمضانية
              </p>
            </div>
          </div>
        </div>

        {/* Loading State */}
        {(staffQuery.isLoading || mosquesQuery.isLoading) && (
          <Card className="border-border/60 shadow-xs">
            <CardContent className="flex items-center justify-center gap-3 py-12 text-muted-foreground" role="status">
              <Loader2 className="size-5 animate-spin text-primary" />
              <span className="text-sm font-medium">جارٍ تحميل المواسم وقائمة المساجد المعتمدة…</span>
            </CardContent>
          </Card>
        )}

        {/* Error State */}
        {(staffQuery.error || mosquesQuery.error) && (
          <Card className="border-destructive/40 bg-destructive/5" role="alert">
            <CardContent className="flex items-center gap-3 p-4 text-sm text-destructive">
              <AlertCircle className="size-5 shrink-0" />
              <span>{staffQuery.error?.message || mosquesQuery.error?.message}</span>
            </CardContent>
          </Card>
        )}

        {/* No Open Season State */}
        {!staffQuery.isLoading && data && openSeasons.length === 0 && (
          <Card className="border-amber-200 bg-amber-50/50 dark:border-amber-900/50 dark:bg-amber-950/20">
            <CardContent className="flex flex-col items-center justify-center py-10 text-center">
              <div className="mb-3 flex size-12 items-center justify-center rounded-2xl bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300">
                <CalendarDays className="size-6" />
              </div>
              <h2 className="text-base font-bold text-foreground">لا يوجد موسم مفتوح للتسجيل حالياً</h2>
              <p className="mt-1 max-w-md text-xs text-muted-foreground sm:text-sm">
                يجب إنشاء موسم وتفعيل خيار «فتح التسجيل» من صفحة إدارة مواسم قبل التقديم عبر برنامج مواسم.
              </p>
              {canAccessMawasim && (
                <Link href="/mawasim" className="mt-4">
                  <Button className="gap-2 rounded-xl cursor-pointer">
                    <MoonStar className="size-4" />
                    الانتقال إلى إعدادات مواسم
                  </Button>
                </Link>
              )}
            </CardContent>
          </Card>
        )}

        {/* Season & Mosque Picker Card */}
        {!staffQuery.isLoading && activeSeason && (
          <>
            <Card className="border-border/60 shadow-xs">
              <CardHeader className="border-b border-border/50 bg-muted/20 px-5 py-4">
                <div className="flex items-center gap-3">
                  <div className="flex size-9 items-center justify-center rounded-xl bg-emerald-500/12 text-emerald-700 dark:text-emerald-300">
                    <Building2 className="size-5" />
                  </div>
                  <div>
                    <CardTitle className="text-base font-bold">اختيار الموسم والمسجد</CardTitle>
                    <CardDescription className="text-xs">
                      اختر الموسم المفتوح ثم حدد المسجد المعتمد من القائمة المنسدلة
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="grid gap-4 p-5 sm:grid-cols-2">
                {/* Season Dropdown */}
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-foreground">الموسم</label>
                  <Select
                    value={String(activeSeason.id)}
                    onValueChange={val => {
                      setSeasonId(Number(val));
                      setSelectedMosqueId(undefined);
                    }}
                  >
                    <SelectTrigger className="h-10 w-full rounded-xl bg-background font-semibold">
                      <SelectValue placeholder="اختر الموسم" />
                    </SelectTrigger>
                    <SelectContent>
                      {openSeasons.map(item => (
                        <SelectItem key={item.id} value={String(item.id)}>
                          {item.title} ({item.hijriYear} هـ)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Searchable Mosque Dropdown */}
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-foreground">
                    المسجد المعتمد ({mosques.length.toLocaleString("ar-SA")})
                  </label>
                  <Popover open={mosqueOpen} onOpenChange={setMosqueOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        role="combobox"
                        aria-expanded={mosqueOpen}
                        aria-required="true"
                        aria-describedby={selectedMosque ? undefined : mosqueHintId}
                        className="h-10 w-full justify-between rounded-xl bg-background px-3 font-normal cursor-pointer"
                      >
                        <span className="truncate">
                          {selectedMosque
                            ? `${selectedMosque.name} · ${selectedMosque.city}`
                            : "اختر مسجداً من القائمة…"}
                        </span>
                        <ChevronsUpDown className="mr-2 size-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start" dir="rtl">
                      <Command>
                        <CommandInput placeholder="ابحث باسم المسجد أو المدينة أو الحي..." className="h-10" />
                        <CommandList className="max-h-72">
                          <CommandEmpty>لم يُعثر على مسجد مطابق.</CommandEmpty>
                          <CommandGroup>
                            {mosques.map(item => {
                              const isSelected = item.id === selectedMosque?.id;
                              return (
                                <CommandItem
                                  key={item.id}
                                  value={`${item.name} ${item.city} ${item.district ?? ""}`}
                                  onSelect={() => {
                                    setSelectedMosqueId(item.id);
                                    setMosqueOpen(false);
                                  }}
                                  className="flex items-center justify-between gap-2 py-2.5 cursor-pointer"
                                >
                                  <div className="min-w-0 flex-1">
                                    <p className="truncate text-sm font-semibold text-foreground">{item.name}</p>
                                    <p className="truncate text-xs text-muted-foreground">
                                      {item.city}
                                      {item.district ? ` · ${item.district}` : ""}
                                    </p>
                                  </div>
                                  <Check className={cn("size-4 shrink-0 text-primary", isSelected ? "opacity-100" : "opacity-0")} />
                                </CommandItem>
                              );
                            })}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  {!selectedMosque && (
                    <p id={mosqueHintId} className="text-xs text-muted-foreground">اختر مسجدًا معتمدًا للمتابعة.</p>
                  )}
                </div>

                {/* Selected Mosque Preview Strip */}
                {selectedMosque && (
                  <div className="sm:col-span-2 space-y-2">
                    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 text-xs">
                      <span className="inline-flex items-center gap-1.5 font-bold text-foreground">
                        <Building2 className="size-4 text-primary" />
                        {selectedMosque.name}
                      </span>
                      <span className="inline-flex items-center gap-1 text-muted-foreground">
                        <MapPin className="size-3.5 text-primary/80" />
                        {selectedMosque.city}
                        {selectedMosque.district ? ` · ${selectedMosque.district}` : ""}
                      </span>
                      {selectedMosque.capacity ? (
                        <span className="inline-flex items-center gap-1 text-muted-foreground">
                          <Users className="size-3.5 text-primary/80" />
                          السعة: {selectedMosque.capacity.toLocaleString("ar-SA")} مصلٍ
                        </span>
                      ) : null}
                    </div>

                    {selectedMosque.linkedRequester ? (
                      <LinkedRequesterSummary linkedRequester={selectedMosque.linkedRequester} />
                    ) : selectedMosque.linkedRequester === null ? (
                      <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50/70 px-4 py-2.5 text-xs text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200">
                        <AlertCircle className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-400" />
                        <span>
                          لا يوجد حساب طالب خدمة نشط مرتبط بهذا المسجد حاليًا؛ سيتم حفظ الطلب وربطه برقم المسجد مع الاحتفاظ ببيانات المُدخل للمراجعة.
                        </span>
                      </div>
                    ) : null}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Full Seasonal Request Form */}
            {selectedMosque && data && (
              <MawasimRequestForm
                key={`${activeSeason.id}-${selectedMosque.id}`}
                season={activeSeason}
                mosque={selectedMosque}
                capacity={data.capacity}
                onSubmitted={() => navigate(canAccessMawasim ? "/mawasim" : "/requests")}
              />
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
