import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import MawasimRequestForm, { displayQuantity, MawasimField, PrayerMeasurements, type MawasimMosque } from "@/components/MawasimRequestForm";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import type { inferRouterOutputs } from "@trpc/server";
import type { AppRouter } from "../../../server/routers";
import {
  defaultSeasonalSettings, seasonalCapacity, seasonalServiceIds, seasonalServices, seasonalStaffAccess, seasonalStatusLabels,
  type SeasonalQuantities, type SeasonalService, type SeasonalSettings,
} from "@shared/mawasim";

type Dashboard = inferRouterOutputs<AppRouter>["mawasim"]["staff"];
type Season = NonNullable<Dashboard["season"]>;
type SeasonRequest = Dashboard["requests"][number];
const selectStyle = "w-full rounded-md border bg-background p-2 text-sm";

export default function MawasimStaff() {
  const { user } = useAuth();
  const access = seasonalStaffAccess(user?.role);
  const [seasonId, setSeasonId] = useState<number>();
  const [edit, setEdit] = useState<"new" | "saved">();
  const [officeAction, setOfficeAction] = useState<"grant" | "submit">();
  const [expanded, setExpanded] = useState<number>();
  const dashboard = trpc.mawasim.staff.useQuery(seasonId ? { seasonId } : undefined, { enabled: access.canEnter });
  const data = dashboard.data;
  const season = data?.season;
  const refresh = () => { void dashboard.refetch(); };
  if (!access.canEnter) return <DashboardLayout><p className="p-5">ليس لديك صلاحية إدارة مواسم.</p></DashboardLayout>;

  const byLocation = new Map<string, number>();
  for (const request of data?.requests ?? []) {
    const location = request.snapshot.city + " · " + request.snapshot.district;
    byLocation.set(location, (byLocation.get(location) ?? 0) + 1);
  }
  return (
    <DashboardLayout tabletNavigation>
      <div dir="rtl" className="mx-auto max-w-7xl space-y-5 p-4 sm:p-6">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">مواسم</h1>
            <p className="text-sm text-muted-foreground">إدارة تأهيل المساجد لاستقبال رمضان</p>
          </div>
          {access.canManage && <Button onClick={() => setEdit(edit === "new" ? undefined : "new")}>إضافة موسم</Button>}
        </header>
        {dashboard.isLoading && <p role="status">جارٍ تحميل المواسم…</p>}
        {dashboard.error && <p role="alert" className="text-destructive">{dashboard.error.message}</p>}
        {edit === "new" && <SeasonEditor onCancel={() => setEdit(undefined)} onSave={id => {
          setSeasonId(id); setEdit(undefined); refresh();
        }} />}
        {data && !season && <p className="rounded-xl border p-4">لا توجد مواسم محفوظة.</p>}
        {data && season && <>
          <section className="flex flex-wrap items-end gap-3 rounded-xl border bg-card p-4">
            <MawasimField label="الموسم"><select className={selectStyle} value={season.id} onChange={event => {
              setSeasonId(Number(event.target.value)); setEdit(undefined); setOfficeAction(undefined); setExpanded(undefined);
            }}>
              {data.seasons.map(item => <option key={item.id} value={item.id}>{item.title}</option>)}
            </select></MawasimField>
            <Badge variant="outline" className="mb-2">{season.isOpen ? "التسجيل مفتوح" : "التسجيل مغلق"}</Badge>
            {access.canManage && <>
              <Button variant="outline" onClick={() => setEdit(edit === "saved" ? undefined : "saved")}>إعدادات الموسم</Button>
              <Button variant="outline" onClick={() => setOfficeAction(officeAction === "grant" ? undefined : "grant")}>منح استثناء</Button>
              <Button variant="outline" disabled={!season.isOpen} onClick={() => setOfficeAction(officeAction === "submit" ? undefined : "submit")}>تسجيل بالنيابة</Button>
            </>}
          </section>
          {edit === "saved" && <SeasonEditor key={season.id} season={season} onCancel={() => setEdit(undefined)} onSave={() => { setEdit(undefined); refresh(); }} />}
          {officeAction && <OfficeAction key={season.id + officeAction} action={officeAction} season={season}
            capacity={data.capacity} onDone={() => { setOfficeAction(undefined); refresh(); }} />}
          {access.canManage && <>
            <section className="space-y-3 rounded-xl border bg-card p-4">
              <h2 className="text-lg font-semibold">السعة والمتابعة</h2>
              <p className="text-sm text-muted-foreground">المساجد المسجّلة {data.requests.length} · الطلبات قيد المراجعة {data.requests.filter(row => row.status === "submitted").length} · المنفّذة {data.requests.filter(row => row.status === "completed").length}</p>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[36rem] text-start text-sm [&_td]:px-2 [&_td]:py-2 [&_th]:px-2 [&_th]:py-2 [&_th]:text-start">
                  <thead><tr className="border-b"><th scope="col">الخدمة</th><th scope="col">السعة</th><th scope="col">المطلوب القائم</th>
                    <th scope="col">المعتمد</th><th scope="col">المنفّذ</th><th scope="col">المتبقي</th></tr></thead>
                  <tbody>{data.capacity.filter(row => row.limit > 0 || row.requested > 0).map(row => <tr key={row.service} className="border-b last:border-b-0">
                    <th scope="row">{seasonalServices[row.service].label} <span className="text-muted-foreground">({seasonalServices[row.service].unit})</span></th>
                    {[row.limit, row.requested, row.approved, row.performed, row.available].map((quantity, index) =>
                      <td key={index}>{displayQuantity(row.service, quantity)}</td>)}
                  </tr>)}</tbody>
                </table>
              </div>
              {byLocation.size > 0 && <div className="border-t pt-3">
                <h3 className="text-sm font-semibold">المساجد حسب المدينة والحي</h3>
                <ul className="mt-2 grid gap-1 text-sm sm:grid-cols-2">
                  {Array.from(byLocation, ([location, count]) => <li key={location}>{location} · {count}</li>)}
                </ul>
              </div>}
            </section>
            {data.grants.length > 0 && <GrantList data={data} seasonId={season.id} refresh={refresh} />}
          </>}
          <section className="space-y-3">
            <h2 className="text-lg font-semibold">{access.canManage ? "طلبات الموسم" : "الطلبات المسندة إليّ"}</h2>
            {data.requests.length === 0 && <p className="rounded-xl border p-4 text-sm">لا توجد طلبات هنا بعد.</p>}
            {data.requests.map(request => <article key={request.id} className="rounded-xl border bg-card p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="font-semibold">طلب {request.id} · {request.mosqueName}</h3>
                  <p className="text-sm text-muted-foreground">{request.snapshot.city} · {request.snapshot.district}</p>
                </div>
                <Badge variant="outline">{seasonalStatusLabels[request.status]}</Badge>
                <Button variant="outline" aria-expanded={expanded === request.id} onClick={() => setExpanded(expanded === request.id ? undefined : request.id)}>
                  {expanded === request.id ? "إخفاء التفاصيل" : "التفاصيل"}
                </Button>
              </div>
              {expanded === request.id && <RequestDetails key={request.id + request.status} request={request}
                canManage={access.canManage} fieldStaff={data.fieldStaff} refresh={refresh} />}
            </article>)}
          </section>
        </>}
      </div>
    </DashboardLayout>
  );
}

function SeasonEditor({ season, onSave, onCancel }: { season?: Season; onSave: (id: number) => void; onCancel: () => void }) {
  const [title, setTitle] = useState(season?.title ?? "");
  const [year, setYear] = useState(season?.hijriYear ?? 1448);
  const [open, setOpen] = useState(season?.isOpen ?? false);
  const [settings, setSettings] = useState(season?.settings ?? defaultSeasonalSettings);
  const save = trpc.mawasim.saveSeason.useMutation({
    onSuccess: data => { toast.success("تم حفظ إعدادات الموسم."); onSave(data.id); },
    onError: error => toast.error(error.message),
  });
  const configure = (service: SeasonalService, updates: Partial<SeasonalSettings["services"][SeasonalService]>) =>
    setSettings(current => ({ ...current, services: { ...current.services, [service]: { ...current.services[service], ...updates } } }));
  return <form className="space-y-4 rounded-xl border bg-card p-4" onSubmit={event => {
    event.preventDefault(); save.mutate({ id: season?.id, title, hijriYear: year, isOpen: open, settings });
  }}>
    <h2 className="text-lg font-semibold">{season ? "إعدادات الموسم" : "موسم جديد"}</h2>
    <div className="grid gap-3 sm:grid-cols-2">
      <MawasimField label="اسم الموسم"><Input required minLength={3} maxLength={160} value={title} onChange={event => setTitle(event.target.value)} /></MawasimField>
      <MawasimField label="العام الهجري"><Input required type="number" min="1400" max="1600" value={year} onChange={event => setYear(Number(event.target.value))} /></MawasimField>
    </div>
    <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={open} onChange={event => setOpen(event.target.checked)} /> فتح التسجيل</label>
    {seasonalServiceIds.map(service => {
      const limits = settings.services[service];
      const meta = seasonalServices[service];
      return <fieldset key={service} className="space-y-3 rounded-lg border p-3">
        <legend className="px-2 text-sm font-semibold"><label className="flex items-center gap-2">
          <input type="checkbox" checked={limits.enabled} onChange={event => configure(service, { enabled: event.target.checked })} /> {meta.label}
        </label></legend>
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
          {([["capacity", "السعة (" + meta.unit + ")", meta.scale], ["perMosqueLimit", "سقف المسجد", meta.scale],
            ["budgetHalalas", "الميزانية (ريال)", 100], ["unitPriceHalalas", "تكلفة الوحدة (ريال)", 100]] as const)
            .map(([key, label, scale]) => <MawasimField key={key} label={label}>
              <Input type="number" min="0" step={1 / scale} value={limits[key] / scale}
                onChange={event => configure(service, { [key]: Math.round(Number(event.target.value) * scale) })} />
            </MawasimField>)}
        </div>
        <p className="text-xs text-muted-foreground">السعة المحسوبة {displayQuantity(service, seasonalCapacity(service, limits))} {meta.unit}</p>
      </fieldset>;
    })}
    <div className="grid gap-3 sm:grid-cols-2">
      <MawasimField label="عدد المصلين لتصنيف المسجد الكبير (اختياري)">
        <Input type="number" min="0" value={settings.largeMosqueWorshippers}
          onChange={event => setSettings({ ...settings, largeMosqueWorshippers: Number(event.target.value) })} />
      </MawasimField>
      <MawasimField label="سقف الكراتين للمسجد الكبير (اختياري)">
        <Input type="number" min="0" value={settings.largeMosqueWaterLimit}
          onChange={event => setSettings({ ...settings, largeMosqueWaterLimit: Number(event.target.value) })} />
      </MawasimField>
    </div>
    <div className="flex gap-2"><Button type="submit" disabled={save.isPending}>حفظ الموسم</Button><Button type="button" variant="outline" onClick={onCancel}>إلغاء</Button></div>
  </form>;
}

function OfficeAction({ action, season, capacity, onDone }: {
  action: "grant" | "submit"; season: Season; capacity: Dashboard["capacity"]; onDone: () => void;
}) {
  const [search, setSearch] = useState("");
  const [mosque, setMosque] = useState<MawasimMosque>();
  const [email, setEmail] = useState("");
  const [reason, setReason] = useState("");
  const results = trpc.mawasim.searchMosques.useQuery({ search }, { enabled: search.trim().length >= 2 });
  const grant = trpc.mawasim.grant.useMutation({
    onSuccess: () => { toast.success("تم منح الاستثناء للموسم والمسجد المحددين."); onDone(); },
    onError: error => toast.error(error.message),
  });
  return <section className="space-y-4 rounded-xl border bg-card p-4">
    <h2 className="text-lg font-semibold">{action === "grant" ? "منح استثناء لمستفيد" : "تسجيل طلب بالنيابة"}</h2>
    <MawasimField label="البحث عن مسجد معتمد بالاسم أو المدينة"><Input value={search} maxLength={80}
      onChange={event => { setSearch(event.target.value); setMosque(undefined); }} /></MawasimField>
    <MawasimField label="المسجد"><select className={selectStyle} value={mosque?.id ?? ""} onChange={event =>
      setMosque(results.data?.find(item => item.id === Number(event.target.value)))}>
      <option value="">اختر مسجدًا</option>
      {results.data?.map(item => <option key={item.id} value={item.id}>{item.name} · {item.city}</option>)}
    </select></MawasimField>
    {results.error && <p role="alert" className="text-destructive">{results.error.message}</p>}
    {mosque && (action === "submit"
      ? <MawasimRequestForm key={mosque.id} season={season} mosque={mosque} capacity={capacity} staff onSubmitted={onDone} />
      : <form className="space-y-3" onSubmit={event => {
        event.preventDefault(); grant.mutate({ seasonId: season.id, mosqueId: mosque.id, email, reason });
      }}>
        <MawasimField label="بريد حساب المستفيد"><Input required type="email" value={email} onChange={event => setEmail(event.target.value)} /></MawasimField>
        <MawasimField label="سبب الاستثناء"><Textarea required minLength={3} maxLength={500} value={reason} onChange={event => setReason(event.target.value)} /></MawasimField>
        <Button type="submit" disabled={grant.isPending}>منح الاستثناء</Button>
      </form>)}
  </section>;
}

function GrantList({ data, seasonId, refresh }: { data: Dashboard; seasonId: number; refresh: () => void }) {
  const revoke = trpc.mawasim.revokeGrant.useMutation({ onSuccess: refresh, onError: error => toast.error(error.message) });
  return <details className="rounded-xl border bg-card p-4">
    <summary className="cursor-pointer font-semibold">استثناءات الموسم ({data.grants.length})</summary>
    <ul className="mt-3 space-y-2">{data.grants.map(grant => <li key={grant.id} className="flex flex-wrap items-center gap-2 text-sm">
      <span>{grant.applicant} · {grant.mosque} · {grant.reason}</span>
      {grant.active ? <Button variant="outline" size="sm" disabled={revoke.isPending}
        onClick={() => revoke.mutate({ seasonId, grantId: grant.id })}>إلغاء الاستثناء</Button> : <Badge variant="outline">ملغي</Badge>}
    </li>)}</ul>
  </details>;
}

function Quantities({ value, onChange, services }: {
  value: SeasonalQuantities; onChange: (value: SeasonalQuantities) => void; services: SeasonalService[];
}) {
  return <div className="grid gap-3 sm:grid-cols-2">
    {services.map(service => {
      const { label, unit, scale } = seasonalServices[service];
      return <MawasimField key={service} label={label + " (" + unit + ")"}>
        <Input type="number" min="0" step={1 / scale} value={value[service] === undefined ? "" : value[service] / scale}
          onChange={event => onChange({ ...value, [service]: Math.round(Number(event.target.value) * scale) })} />
      </MawasimField>;
    })}
  </div>;
}

function RequestDetails({ request, canManage, fieldStaff, refresh }: {
  request: SeasonRequest; canManage: boolean; fieldStaff: Dashboard["fieldStaff"]; refresh: () => void;
}) {
  const [showPhotos, setShowPhotos] = useState(false);
  const [approved, setApproved] = useState(request.requested);
  const [note, setNote] = useState("");
  const [date, setDate] = useState(request.scheduledFor ?? "");
  const [assignee, setAssignee] = useState(request.assignedTo ?? 0);
  const [execution, setExecution] = useState({ men: request.snapshot.men, women: request.snapshot.women, performed: {} as SeasonalQuantities, notes: "" });
  const key = { seasonId: request.seasonId, requestId: request.id };
  const photos = trpc.mawasim.photos.useQuery(key, { enabled: showPhotos });
  const options = { onSuccess: refresh, onError: (error: { message: string }) => toast.error(error.message) };
  const review = trpc.mawasim.review.useMutation(options);
  const schedule = trpc.mawasim.schedule.useMutation(options);
  const complete = trpc.mawasim.complete.useMutation(options);
  return <div className="mt-4 space-y-4 border-t pt-4">
    <p className="text-sm">{request.snapshot.address} · {request.snapshot.worshippers} مصلٍ</p>
    <p className="text-sm">مصلى الرجال {request.snapshot.men.lengthCm / 100} × {request.snapshot.men.widthCm / 100} م
      {request.snapshot.women && " · مصلى النساء " + request.snapshot.women.lengthCm / 100 + " × " + request.snapshot.women.widthCm / 100 + " م"}</p>
    <div className="flex flex-wrap items-center gap-3">
      <a href={request.snapshot.mapsUrl} target="_blank" rel="noreferrer" className="text-sm text-primary underline">موقع المسجد</a>
      <Button type="button" size="sm" variant="outline" onClick={() => setShowPhotos(!showPhotos)}>{showPhotos ? "إخفاء الصور" : "عرض صور المصليات"}</Button>
    </div>
    {showPhotos && photos.isLoading && <p role="status" className="text-sm">جارٍ تحميل الصور…</p>}
    {showPhotos && photos.error && <p role="alert" className="text-sm text-destructive">{photos.error.message}</p>}
    {showPhotos && photos.data && <div className="grid gap-2 sm:grid-cols-2">
      <img className="max-h-64 rounded-lg object-contain" src={photos.data.menPhoto} alt="مصلى الرجال" />
      {photos.data.womenPhoto && <img className="max-h-64 rounded-lg object-contain" src={photos.data.womenPhoto} alt="مصلى النساء" />}
    </div>}
    <p className="text-sm">مقدم الطلب {request.contact.name} {request.contact.phone && "· " + request.contact.phone} {request.contact.email && "· " + request.contact.email}</p>
    {request.contact.reason && <p className="text-sm">سبب التسجيل بالنيابة {request.contact.reason}</p>}
    {request.specialRequest && <p className="text-sm">الطلب الخاص {request.specialRequest}</p>}
    {request.reviewNote && <p className="text-sm text-muted-foreground">{request.reviewNote}</p>}
    {request.scheduledFor && <p className="text-sm">موعد التنفيذ {request.scheduledFor} · {request.assignee}</p>}
    {request.execution && <p className="text-sm">قياس التنفيذ · الرجال {request.execution.men.lengthCm / 100} × {request.execution.men.widthCm / 100} م
      {request.execution.women && " · النساء " + request.execution.women.lengthCm / 100 + " × " + request.execution.women.widthCm / 100 + " م"}
      {request.execution.notes && " · " + request.execution.notes}</p>}
    <ul className="space-y-1 text-sm">{seasonalServiceIds.filter(service => request.requested[service] || request.approved?.[service]).map(service => <li key={service}>
      {seasonalServices[service].label} · المطلوب {displayQuantity(service, request.requested[service] ?? 0)} {seasonalServices[service].unit}
      {request.approved && " · المعتمد " + displayQuantity(service, request.approved[service] ?? 0)}
      {request.execution && " · المنفّذ " + displayQuantity(service, request.execution.performed[service] ?? 0)}
    </li>)}</ul>
    {canManage && !["completed", "rejected"].includes(request.status) && <section className="space-y-3 rounded-lg border p-3">
      {request.status === "submitted" && <Quantities value={approved} onChange={setApproved}
        services={seasonalServiceIds.filter(service => request.requested[service] || request.specialRequest)} />}
      <MawasimField label="ملاحظة المراجعة أو سبب الاعتذار"><Textarea maxLength={2000} value={note} onChange={event => setNote(event.target.value)} /></MawasimField>
      <div className="flex gap-2">
        {request.status === "submitted" && <Button disabled={review.isPending} onClick={() => review.mutate({ ...key, approved, note })}>اعتماد الكميات</Button>}
        <Button variant="outline" disabled={!note.trim() || review.isPending} onClick={() => review.mutate({ ...key, approved: null, note })}>الاعتذار عن الطلب</Button>
      </div>
    </section>}
    {canManage && ["approved", "scheduled"].includes(request.status) && <form className="space-y-3 rounded-lg border p-3" onSubmit={event => {
      event.preventDefault(); schedule.mutate({ ...key, assignedTo: assignee, scheduledFor: date });
    }}>
      <div className="grid gap-2 sm:grid-cols-2">
        <MawasimField label="تاريخ التنفيذ"><Input required type="date" value={date} onChange={event => setDate(event.target.value)} /></MawasimField>
        <MawasimField label="الموظف المكلّف"><select required className={selectStyle} value={assignee || ""} onChange={event => setAssignee(Number(event.target.value))}>
          <option value="">اختر موظفًا</option>{fieldStaff.map(user => <option key={user.id} value={user.id}>{user.name}</option>)}
        </select></MawasimField>
      </div>
      <Button type="submit" disabled={schedule.isPending}>حفظ الجدولة</Button>
    </form>}
    {request.status === "scheduled" && <form className="space-y-3 rounded-lg border p-3" onSubmit={event => {
      event.preventDefault(); complete.mutate({ ...key, execution });
    }}>
      <h4 className="font-semibold">تسجيل التنفيذ الفعلي</h4>
      <PrayerMeasurements label="القياسات الفعلية لمصلى الرجال" value={execution.men} onChange={men => setExecution({ ...execution, men })} />
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={Boolean(execution.women)} onChange={event =>
        setExecution({ ...execution, women: event.target.checked ? request.snapshot.women ?? { lengthCm: 0, widthCm: 0 } : null })} /> يوجد مصلى نساء</label>
      {execution.women && <PrayerMeasurements label="القياسات الفعلية لمصلى النساء" value={execution.women}
        onChange={women => setExecution({ ...execution, women })} />}
      <Quantities value={execution.performed} onChange={performed => setExecution({ ...execution, performed })}
        services={seasonalServiceIds.filter(service => request.approved?.[service])} />
      <MawasimField label="ملاحظات التنفيذ"><Textarea value={execution.notes} maxLength={2000}
        onChange={event => setExecution({ ...execution, notes: event.target.value })} /></MawasimField>
      <Button type="submit" disabled={complete.isPending}>حفظ التنفيذ</Button>
    </form>}
  </div>;
}
