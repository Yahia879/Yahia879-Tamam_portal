import { useState } from "react";
import BeneficiaryLayout from "@/components/BeneficiaryLayout";
import MawasimRequestForm, { MawasimField, displayQuantity } from "@/components/MawasimRequestForm";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { seasonalServiceIds, seasonalServices, seasonalStatusLabels } from "@shared/mawasim";

export default function MawasimPortal() {
  const [seasonId, setSeasonId] = useState<number>();
  const [mosqueId, setMosqueId] = useState<number>();
  const portal = trpc.mawasim.portal.useQuery(seasonId ? { seasonId } : undefined);
  const data = portal.data;
  const season = data?.season;
  const availableMosques = data?.eligible.filter(mosque => !data.requests.some(request => request.mosqueId === mosque.id)) ?? [];
  const mosque = availableMosques.find(item => item.id === mosqueId) ?? availableMosques[0];
  const hasCapacity = data?.capacity.some(row => row.available > 0 && season?.settings.services[row.service].enabled);
  return (
    <BeneficiaryLayout title="برنامج مواسم" subtitle="تأهيل المساجد لاستقبال رمضان" backUrl="/requester">
      <div dir="rtl" className="mx-auto max-w-4xl space-y-5">
        {portal.isLoading && <p role="status">جارٍ تحميل الموسم…</p>}
        {portal.error && <p role="alert" className="text-destructive">{portal.error.message}</p>}
        {data && !season && <p className="rounded-xl border p-4">لا يوجد موسم متاح للعرض حاليًا.</p>}
        {data && season && <>
          <div className="grid gap-4 rounded-xl border bg-card p-4 sm:grid-cols-2">
            <MawasimField label="الموسم">
              <select className="w-full rounded-md border bg-background p-2" value={season.id} onChange={event => {
                setSeasonId(Number(event.target.value)); setMosqueId(undefined);
              }}>
                {data.seasons.map(item => <option key={item.id} value={item.id}>{item.title}</option>)}
              </select>
            </MawasimField>
            <div className="self-end text-sm text-muted-foreground">
              {season.isOpen ? hasCapacity ? "التسجيل مفتوح للخدمات المتاحة." : "استُنفدت السعة المتاحة لهذا الموسم." : "التسجيل مغلق لهذا الموسم."}
            </div>
            {season.isOpen && hasCapacity && mosque && <MawasimField label="المسجد">
              <select className="w-full rounded-md border bg-background p-2" value={mosque.id} onChange={event => setMosqueId(Number(event.target.value))}>
                {availableMosques.map(item => <option key={item.id} value={item.id}>{item.name} · {item.city}</option>)}
              </select>
            </MawasimField>}
          </div>
          {season.isOpen && hasCapacity && !mosque && data.requests.length === 0 && <p className="rounded-xl border p-4 text-sm">
            التسجيل للإمام أو المؤذن المرتبط بمسجد معتمد، أو لمن لديه استثناء لهذا الموسم. راجع الجمعية إذا كان ارتباطك بالمسجد غير ظاهر.
          </p>}
          {season.isOpen && hasCapacity && mosque && <MawasimRequestForm key={season.id + "-" + mosque.id}
            season={season} mosque={mosque} capacity={data.capacity} onSubmitted={() => { void portal.refetch(); }} />}
          {data.requests.length > 0 && <section className="space-y-3">
            <h2 className="text-lg font-semibold">طلباتي في هذا الموسم</h2>
            {data.requests.map(request => <article key={request.id} className="space-y-2 rounded-xl border bg-card p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="font-semibold">طلب {request.id} · {request.mosqueName}</h3>
                <Badge variant="outline">{seasonalStatusLabels[request.status]}</Badge>
              </div>
              {seasonalServiceIds.filter(service => request.requested[service]).map(service => <p key={service} className="text-sm">
                {seasonalServices[service].label} · المطلوب {displayQuantity(service, request.requested[service] ?? 0)} {seasonalServices[service].unit}
                {request.approved && " · المعتمد " + displayQuantity(service, request.approved[service] ?? 0)}
                {request.execution && " · المنفّذ " + displayQuantity(service, request.execution.performed[service] ?? 0)}
              </p>)}
              {request.scheduledFor && <p className="text-sm">موعد التنفيذ <time>{request.scheduledFor}</time></p>}
              {request.reviewNote && <p className="text-sm text-muted-foreground">{request.reviewNote}</p>}
            </article>)}
          </section>}
        </>}
      </div>
    </BeneficiaryLayout>
  );
}
