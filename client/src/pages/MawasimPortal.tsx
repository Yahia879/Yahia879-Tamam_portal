import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "wouter";
import BeneficiaryLayout from "@/components/BeneficiaryLayout";
import MawasimRequestForm, { displayQuantity, type MawasimMosque } from "@/components/MawasimRequestForm";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { seasonalServiceIds, seasonalServices, seasonalStatusLabels } from "@shared/mawasim";
import {
  AlertCircle,
  Building2,
  CalendarDays,
  CheckCircle2,
  Clock,
  FileText,
  Loader2,
  MapPin,
  MoonStar,
  Users,
  XCircle,
} from "lucide-react";

const STATUS_BADGE: Record<string, string> = {
  submitted: "bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800",
  approved: "bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800",
  scheduled: "bg-sky-50 text-sky-800 border-sky-200 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-800",
  completed: "bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800",
  rejected: "bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800",
};

export default function MawasimPortal() {
  const [, navigate] = useLocation();
  const utils = trpc.useUtils();
  const [seasonId, setSeasonId] = useState<number>();
  const [mosqueId, setMosqueId] = useState<number>();

  const portal = trpc.mawasim.portal.useQuery(seasonId ? { seasonId } : undefined);
  const data = portal.data;
  const season = data?.season;
  const openSeasons = useMemo(
    () => (data?.seasons ?? []).filter(item => item.isOpen),
    [data?.seasons],
  );

  useEffect(() => {
    if (!data) return;
    if (seasonId && data.seasons.some(item => item.id === seasonId)) return;
    if (openSeasons.length > 0 && data.season?.id !== openSeasons[0].id) {
      setSeasonId(openSeasons[0].id);
    }
  }, [data, openSeasons, seasonId]);

  const eligible = (data?.eligible ?? []) as MawasimMosque[];
  const availableMosques = useMemo(
    () => eligible.filter(item => !data?.requests.some(req => req.mosqueId === item.id)),
    [eligible, data?.requests],
  );
  const selectedMosque = useMemo(
    () => availableMosques.find(item => item.id === mosqueId) ?? availableMosques[0],
    [availableMosques, mosqueId],
  );
  const hasCapacity = Boolean(
    season && data?.capacity.some(row => row.available > 0 && season.settings.services[row.service]?.enabled),
  );
  const allRequests = data?.allRequests ?? data?.requests ?? [];

  return (
    <BeneficiaryLayout
      activeTab="mawasim"
      title="برنامج مواسم"
      subtitle="تقديم ومتابعة طلبات برنامج مواسم للخدمات الرمضانية"
      backUrl="/requester"
      backLabel="العودة للوحة التحكم"
    >
      <div dir="rtl" className="mx-auto max-w-5xl space-y-6">
        {portal.isLoading && (
          <Card className="border-border/60 shadow-xs">
            <CardContent className="flex items-center justify-center gap-3 py-12 text-muted-foreground" role="status">
              <Loader2 className="size-5 animate-spin text-primary" />
              <span className="text-sm font-medium">جارٍ تحميل بيانات برنامج مواسم…</span>
            </CardContent>
          </Card>
        )}

        {portal.error && (
          <Card className="border-destructive/40 bg-destructive/5" role="alert">
            <CardContent className="flex items-center gap-3 p-4 text-sm text-destructive">
              <AlertCircle className="size-5 shrink-0" />
              <span>{portal.error.message}</span>
            </CardContent>
          </Card>
        )}

        {data && !season && (
          <Card className="border-amber-200 bg-amber-50/50 dark:border-amber-900/50 dark:bg-amber-950/20">
            <CardContent className="flex flex-col items-center justify-center py-10 text-center">
              <div className="mb-3 flex size-12 items-center justify-center rounded-2xl bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300">
                <CalendarDays className="size-6" />
              </div>
              <h2 className="text-base font-bold text-foreground">لا يوجد موسم متاح للتسجيل حالياً</h2>
              <p className="mt-1 max-w-md text-xs text-muted-foreground sm:text-sm">
                سيظهر نموذج التقديم فور إتاحة موسم جديد للتسجيل من قِبل الإدارة.
              </p>
            </CardContent>
          </Card>
        )}

        {data && season && (
          <>
            {/* Season & Auto-Bound Mosque Summary */}
            <Card className="border-border/60 shadow-xs">
              <CardHeader className="border-b border-border/50 bg-muted/20 px-5 py-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex size-10 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-xs">
                      <MoonStar className="size-5" />
                    </div>
                    <div>
                      <CardTitle className="text-base font-bold">بيانات الموسم والمسجد</CardTitle>
                      <CardDescription className="text-xs">
                        {season.isOpen
                          ? hasCapacity
                            ? "التسجيل متاح حالياً للخدمات المفعّلة في هذا الموسم"
                            : "استُنفدت السعة المتاحة لهذا الموسم"
                          : "التسجيل مغلق لهذا الموسم حالياً"}
                      </CardDescription>
                    </div>
                  </div>
                  <Badge
                    variant="outline"
                    className={
                      season.isOpen
                        ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"
                        : "border-slate-200 bg-slate-100 text-slate-700 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-300"
                    }
                  >
                    {season.isOpen ? "متاح للتسجيل" : "التسجيل مغلق"}
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="grid gap-4 p-5 sm:grid-cols-2">
                {/* Season Picker */}
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-foreground">الموسم</label>
                  {data.seasons.length > 1 ? (
                    <Select
                      value={String(season.id)}
                      onValueChange={val => {
                        setSeasonId(Number(val));
                        setMosqueId(undefined);
                      }}
                    >
                      <SelectTrigger className="h-10 w-full rounded-xl bg-background font-semibold">
                        <SelectValue placeholder="اختر الموسم" />
                      </SelectTrigger>
                      <SelectContent>
                        {data.seasons.map(item => (
                          <SelectItem key={item.id} value={String(item.id)}>
                            {item.title} ({item.hijriYear} هـ) {item.isOpen ? "· متاح" : "· مغلق"}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <div className="flex h-10 items-center rounded-xl border border-border/60 bg-muted/30 px-3 text-sm font-semibold text-foreground">
                      {season.title} ({season.hijriYear} هـ)
                    </div>
                  )}
                </div>

                {/* Auto-bound Mosque Field */}
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-foreground">المسجد المرتبط بالحساب</label>
                  {availableMosques.length > 1 ? (
                    <Select
                      value={String(selectedMosque?.id ?? "")}
                      onValueChange={val => setMosqueId(Number(val))}
                    >
                      <SelectTrigger className="h-10 w-full rounded-xl bg-background font-semibold">
                        <SelectValue placeholder="اختر المسجد" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableMosques.map(item => (
                          <SelectItem key={item.id} value={String(item.id)}>
                            {item.name} · {item.city}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : selectedMosque ? (
                    <div className="flex h-10 items-center gap-2 rounded-xl border border-primary/25 bg-primary/5 px-3 text-sm font-semibold text-foreground">
                      <Building2 className="size-4 shrink-0 text-primary" />
                      <span className="truncate">{selectedMosque.name} · {selectedMosque.city}</span>
                    </div>
                  ) : (
                    <div className="flex h-10 items-center rounded-xl border border-border/60 bg-muted/30 px-3 text-xs text-muted-foreground">
                      {eligible.length > 0 ? "تم تقديم طلب مسبقاً لهذا المسجد في هذا الموسم" : "لا يوجد مسجد معتمد مرتبط"}
                    </div>
                  )}
                </div>

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

            {/* Eligibility / Already Submitted Messages */}
            {season.isOpen && hasCapacity && eligible.length === 0 && (
              <Card className="border-amber-200 bg-amber-50/50 dark:border-amber-900/50 dark:bg-amber-950/20">
                <CardContent className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="mt-0.5 size-5 shrink-0 text-amber-600 dark:text-amber-400" />
                    <div className="space-y-1 text-sm">
                      <p className="font-bold text-foreground">حسابك غير مرتبط بمسجد معتمد للتقديم</p>
                      <p className="text-xs text-muted-foreground">
                        يرجى إضافة مسجد واعتماده أولاً لتتمكن من إرسال الطلب فيه، حيث يتاح التقديم للإمام أو المؤذن النشط المرتبط بمسجد معتمد في المنصة، أو عند وجود استثناء مفعّل من الجمعية.
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <Link href="/requester/mosques/new">
                      <Button size="sm" className="rounded-xl font-bold cursor-pointer">
                        إضافة مسجد
                      </Button>
                    </Link>
                    <Link href="/my-mosques">
                      <Button variant="outline" size="sm" className="rounded-xl font-bold cursor-pointer">
                        عرض مساجدي
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            )}

            {season.isOpen && hasCapacity && eligible.length > 0 && !selectedMosque && data.requests.length > 0 && (
              <Card className="border-emerald-200 bg-emerald-50/50 dark:border-emerald-900/50 dark:bg-emerald-950/20">
                <CardContent className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                    <div className="space-y-1 text-sm">
                      <p className="font-bold text-foreground">تم استلام طلبك لهذا الموسم</p>
                      <p className="text-xs text-muted-foreground">
                        تم تسجيل طلب مسجدك في هذا الموسم بنجاح ويمكنك متابعة حالته من قائمة الطلبات أدناه.
                      </p>
                    </div>
                  </div>
                  <Link href="/my-requests">
                    <Button variant="outline" size="sm" className="rounded-xl font-bold cursor-pointer">
                      الذهاب إلى طلباتي
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            )}

            {/* Seasonal Request Form */}
            {season.isOpen && hasCapacity && selectedMosque && (
              <MawasimRequestForm
                key={`${season.id}-${selectedMosque.id}`}
                season={season}
                mosque={selectedMosque}
                capacity={data.capacity}
                onSubmitted={() => {
                  void utils.mawasim.portal.invalidate();
                  navigate("/my-requests?seasonal=submitted");
                }}
              />
            )}
          </>
        )}

        {/* User's Submitted Seasonal Requests */}
        {allRequests.length > 0 && (
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-lg font-bold text-foreground">
                <FileText className="size-5 text-primary" />
                <span>طلباتي في برنامج مواسم</span>
              </h2>
              <Link href="/my-requests">
                <Button variant="ghost" size="sm" className="rounded-xl text-xs font-semibold cursor-pointer">
                  عرض جميع طلباتي
                </Button>
              </Link>
            </div>
            <div className="space-y-3">
              {allRequests.map(request => (
                <Card key={request.id} className="border-border/60 shadow-xs">
                  <CardContent className="space-y-3 p-4 sm:p-5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-md bg-muted px-2 py-0.5 font-mono text-xs font-bold text-muted-foreground">
                          #{request.id}
                        </span>
                        <h3 className="text-base font-bold text-foreground">{request.mosqueName}</h3>
                        {"seasonTitle" in request && request.seasonTitle && (
                          <span className="text-xs text-muted-foreground">· {request.seasonTitle}</span>
                        )}
                      </div>
                      <Badge variant="outline" className={STATUS_BADGE[request.status] ?? ""}>
                        {seasonalStatusLabels[request.status]}
                      </Badge>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {seasonalServiceIds
                        .filter(service => (request.requested[service] ?? 0) > 0)
                        .map(service => (
                          <Badge key={service} variant="outline" className="rounded-lg bg-muted/30 text-xs font-medium">
                            {seasonalServices[service].label}: المطلوب {displayQuantity(service, request.requested[service] ?? 0)} {seasonalServices[service].unit}
                            {request.approved ? ` · المعتمد ${displayQuantity(service, request.approved[service] ?? 0)}` : ""}
                          </Badge>
                        ))}
                    </div>
                    {request.reviewNote && (
                      <div className="flex items-start gap-2 rounded-xl border border-border/60 bg-muted/30 p-3 text-xs text-muted-foreground">
                        {request.status === "rejected" ? (
                          <XCircle className="mt-0.5 size-4 shrink-0 text-rose-600" />
                        ) : (
                          <Clock className="mt-0.5 size-4 shrink-0 text-primary" />
                        )}
                        <span>{request.reviewNote}</span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        )}
      </div>
    </BeneficiaryLayout>
  );
}
