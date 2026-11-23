import { useState, type FormEvent, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import {
  carpetArea, seasonalMosqueLimit, seasonalServiceIds, seasonalServices, type SeasonalMosqueSnapshot,
  type SeasonalQuantities, type SeasonalService, type SeasonalRequestLimits,
} from "@shared/mawasim";

export type MawasimMosque = {
  id: number; name: string; city: string; district: string | null; address: string | null;
  capacity: number | null; latitude: string | null; longitude: string | null; previous?: SeasonalMosqueSnapshot;
};

export function MawasimField({ label, children }: { label: string; children: ReactNode }) {
  return <label className="block space-y-1.5 text-sm font-medium">{label}{children}</label>;
}

export function displayQuantity(service: SeasonalService, quantity: number) {
  return (quantity / seasonalServices[service].scale).toLocaleString("ar-SA", { maximumFractionDigits: 2 });
}

export function PrayerMeasurements({ label, value, onChange }: {
  label: string;
  value: SeasonalMosqueSnapshot["men"];
  onChange: (value: SeasonalMosqueSnapshot["men"]) => void;
}) {
  return (
    <fieldset className="grid grid-cols-2 gap-3">
      <legend className="mb-2 text-sm font-semibold">{label}</legend>
      <MawasimField label="الطول بالمتر">
        <Input required type="number" min="0.01" max="1000" step="0.01" value={value.lengthCm ? value.lengthCm / 100 : ""}
          onChange={event => onChange({ ...value, lengthCm: Math.round(Number(event.target.value) * 100) })} />
      </MawasimField>
      <MawasimField label="العرض بالمتر">
        <Input required type="number" min="0.01" max="1000" step="0.01" value={value.widthCm ? value.widthCm / 100 : ""}
          onChange={event => onChange({ ...value, widthCm: Math.round(Number(event.target.value) * 100) })} />
      </MawasimField>
    </fieldset>
  );
}

const emptyMeasurements = { lengthCm: 0, widthCm: 0 };

function photoData(file: File) {
  if (file.size > 3 * 1024 * 1024 || !["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
    return Promise.reject(new Error("اختر صورة JPG أو PNG أو WebP بحجم لا يتجاوز 3 ميجابايت."));
  }
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("تعذّرت قراءة الصورة."));
    reader.readAsDataURL(file);
  });
}

export default function MawasimRequestForm({ season, mosque, capacity, staff = false, onSubmitted }: {
  season: { id: number; settings: SeasonalRequestLimits };
  mosque: MawasimMosque;
  capacity: { service: SeasonalService; available: number }[];
  staff?: boolean;
  onSubmitted: () => void;
}) {
  const previous = mosque.previous;
  const [snapshot, setSnapshot] = useState<SeasonalMosqueSnapshot>({
    city: previous?.city ?? mosque.city, district: previous?.district ?? mosque.district ?? "",
    address: previous?.address ?? mosque.address ?? "",
    mapsUrl: previous?.mapsUrl ?? (mosque.latitude && mosque.longitude
      ? "https://www.google.com/maps?q=" + mosque.latitude + "," + mosque.longitude : ""),
    worshippers: previous?.worshippers ?? mosque.capacity ?? 0,
    men: previous?.men ?? emptyMeasurements, women: previous?.women ?? null,
  });
  const [requested, setRequested] = useState<SeasonalQuantities>({});
  const [specialRequest, setSpecialRequest] = useState("");
  const [menPhoto, setMenPhoto] = useState<File>();
  const [womenPhoto, setWomenPhoto] = useState<File>();
  const [onBehalf, setOnBehalf] = useState({ name: "", phone: "", reason: "", email: "" });
  const [volunteers, setVolunteers] = useState(false);
  const [pledge, setPledge] = useState(false);
  const [reading, setReading] = useState(false);
  const submit = trpc.mawasim.submit.useMutation({
    onSuccess: result => { toast.success("تم تسجيل طلب مواسم رقم " + result.id); onSubmitted(); },
    onError: error => toast.error(error.message),
  });

  const area = carpetArea(snapshot.men, snapshot.women);
  const setSnapshotValue = <K extends keyof SeasonalMosqueSnapshot,>(key: K, value: SeasonalMosqueSnapshot[K]) =>
    setSnapshot(current => ({ ...current, [key]: value }));

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!menPhoto || !volunteers || !pledge || reading || submit.isPending) return;
    const quantities = { ...requested, carpet: requested.carpet ? area : 0 };
    if (!Object.values(quantities).some(amount => amount > 0)) {
      toast.error("اختر خدمة واحدة على الأقل.");
      return;
    }
    setReading(true);
    try {
      const [men, women] = await Promise.all([
        photoData(menPhoto), snapshot.women && womenPhoto ? photoData(womenPhoto) : undefined,
      ]);
      await submit.mutateAsync({
        seasonId: season.id, mosqueId: mosque.id, snapshot, requested: quantities,
        specialRequest, menPhoto: men, womenPhoto: women, volunteers: true, pledge: true,
        onBehalf: staff ? { ...onBehalf, email: onBehalf.email || undefined } : undefined,
      }).catch(() => { /* The mutation displays the server error. */ });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "تعذّر تجهيز الصور.");
    } finally {
      setReading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 rounded-xl border bg-card p-4 sm:p-6">
      <div>
        <h2 className="text-lg font-semibold">بيانات مسجد {mosque.name}</h2>
        <p className="mt-1 text-sm text-muted-foreground">راجع البيانات وأدخل القياسات التي سيستند إليها طلب هذا الموسم.</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {([["city", "المدينة"], ["district", "الحي"], ["address", "العنوان والشارع"], ["mapsUrl", "رابط خرائط Google"]] as const)
          .map(([key, label]) => <MawasimField key={key} label={label}><Input required value={snapshot[key]}
            type={key === "mapsUrl" ? "url" : "text"} maxLength={key === "city" || key === "district" ? 100 : 500}
            onChange={event => setSnapshotValue(key, event.target.value)} /></MawasimField>)}
        <MawasimField label="عدد المصلين"><Input required type="number" min="1" max="100000"
          value={snapshot.worshippers || ""} onChange={event => setSnapshotValue("worshippers", Number(event.target.value))} /></MawasimField>
      </div>
      <PrayerMeasurements label="مصلى الرجال" value={snapshot.men} onChange={value => setSnapshotValue("men", value)} />
      <MawasimField label="صورة مصلى الرجال توضح الفرش">
        <Input required type="file" accept="image/jpeg,image/png,image/webp" onChange={event => setMenPhoto(event.target.files?.[0])} />
      </MawasimField>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={Boolean(snapshot.women)}
        onChange={event => setSnapshotValue("women", event.target.checked ? previous?.women ?? emptyMeasurements : null)} /> يوجد مصلى نساء</label>
      {snapshot.women && <>
        <PrayerMeasurements label="مصلى النساء" value={snapshot.women} onChange={value => setSnapshotValue("women", value)} />
        <MawasimField label="صورة مصلى النساء (اختيارية)">
          <Input type="file" accept="image/jpeg,image/png,image/webp" onChange={event => setWomenPhoto(event.target.files?.[0])} />
        </MawasimField>
      </>}

      <fieldset className="grid gap-3 sm:grid-cols-2">
        <legend className="mb-2 text-base font-semibold">الخدمات المطلوبة</legend>
        {seasonalServiceIds.filter(service => season.settings.services[service].enabled).map(service => {
          const meta = seasonalServices[service];
          const limit = Math.min(capacity.find(row => row.service === service)?.available ?? 0,
            seasonalMosqueLimit(service, season.settings, snapshot.worshippers));
          return (
            <div key={service} className="space-y-2 rounded-lg border p-3">
              {service === "water" ? <MawasimField label="سقيا الماء (كرتون)">
                <Input type="number" min="0" step="1" max={limit} disabled={limit === 0} value={requested.water || ""}
                  onChange={event => setRequested(current => ({ ...current, water: Number(event.target.value) }))} />
              </MawasimField> : <label className="flex items-center gap-2 text-sm font-medium">
                <input type="checkbox" checked={Boolean(requested[service])} disabled={limit === 0 || (service === "carpet" && (area === 0 || area > limit))}
                  onChange={event => setRequested(current => ({ ...current, [service]: Number(event.target.checked) }))} />
                {meta.label}{service === "carpet" && " · " + displayQuantity(service, area) + " " + meta.unit}
              </label>}
              <p className="text-xs text-muted-foreground">{limit > 0 ? "الحد المتاح لهذا الطلب " + displayQuantity(service, limit) + " " + meta.unit : "السعة غير متاحة حاليًا"}</p>
            </div>
          );
        })}
      </fieldset>
      <MawasimField label="طلب خاص (اختياري)"><Textarea value={specialRequest} maxLength={2000} onChange={event => setSpecialRequest(event.target.value)} /></MawasimField>
      {staff && <fieldset className="grid gap-3 sm:grid-cols-2">
        <legend className="mb-2 text-base font-semibold">بيانات التسجيل بالنيابة</legend>
        {([["name", "اسم مقدم الطلب", "text", 150], ["phone", "الجوال", "tel", 16],
          ["reason", "سبب الاستثناء", "text", 500], ["email", "بريد حساب المستفيد (اختياري)", "email", 320]] as const)
          .map(([key, label, type, maxLength]) => <MawasimField key={key} label={label}>
            <Input required={key !== "email"} type={type} maxLength={maxLength} value={onBehalf[key]}
              onChange={event => setOnBehalf(current => ({ ...current, [key]: event.target.value }))} />
          </MawasimField>)}
      </fieldset>}
      <div className="space-y-3 border-t pt-4 text-sm">
        <label className="flex items-start gap-2"><input className="mt-1" required type="checkbox" checked={volunteers}
          onChange={event => setVolunteers(event.target.checked)} /> ألتزم بتوفير فريق من خمسة متطوعين على الأقل وتسجيلهم في المنصة الوطنية للتطوع.</label>
        <label className="flex items-start gap-2"><input className="mt-1" required type="checkbox" checked={pledge}
          onChange={event => setPledge(event.target.checked)} /> أتعهد بصحة البيانات والالتزام بالإجراءات والتصاريح بالتنسيق مع الجمعية.</label>
        <p className="text-muted-foreground">يخضع تقديم الخدمة للمراجعة وتوفر الدعم.</p>
      </div>
      <Button type="submit" disabled={reading || submit.isPending}>{reading || submit.isPending ? "جارٍ الإرسال…" : "إرسال طلب مواسم"}</Button>
    </form>
  );
}
