import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
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
import { seasonalStaffAccess } from "@shared/mawasim";
import {
  AlertCircle,
  ArrowRight,
  Building2,
  CalendarDays,
  Check,
  ChevronsUpDown,
  Loader2,
  MapPin,
  MoonStar,
  Users,
} from "lucide-react";

export default function SeasonalRequestCreate() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const access = seasonalStaffAccess(user?.role);
  const canCreate = user?.role !== "service_requester" && access.canManage;

  const [seasonId, setSeasonId] = useState<number>();
  const [mosqueOpen, setMosqueOpen] = useState(false);
  const [selectedMosqueId, setSelectedMosqueId] = useState<number>();

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
              <p className="text-sm font-medium">ليس لديك صلاحية إنشاء طلب موسمي.</p>
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
                  طلب موسمي
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

          <Link href="/mawasim">
            <Button variant="outline" className="h-9 gap-2 rounded-xl text-xs font-semibold cursor-pointer">
              <CalendarDays className="size-4 text-primary" />
              إدارة مواسم
            </Button>
          </Link>
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
                يجب إنشاء موسم وتفعيل خيار «فتح التسجيل» من صفحة إدارة مواسم قبل تقديم طلب موسمي.
              </p>
              <Link href="/mawasim" className="mt-4">
                <Button className="gap-2 rounded-xl cursor-pointer">
                  <MoonStar className="size-4" />
                  الانتقال إلى إعدادات مواسم
                </Button>
              </Link>
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
                </div>

                {/* Selected Mosque Preview Strip */}
                {selectedMosque && (
                  <div className="sm:col-span-2 flex flex-wrap items-center gap-3 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 text-xs">
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
                staff
                onSubmitted={() => navigate("/mawasim")}
              />
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
