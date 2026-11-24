import { useState, type FormEvent, type ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import {
  carpetArea, seasonalMosqueLimit, seasonalServiceIds, seasonalServices, type SeasonalMosqueSnapshot,
  type SeasonalQuantities, type SeasonalService, type SeasonalRequestLimits,
} from "@shared/mawasim";
import {
  Building2,
  Camera,
  CheckCircle2,
  Droplets,
  Loader2,
  MapPin,
  Ruler,
  Send,
  Sparkles,
  UserCheck,
  Volume2,
  Wind,
  Wrench,
} from "lucide-react";

export type MawasimMosque = {
  id: number; name: string; city: string; district: string | null; address: string | null;
  capacity: number | null; latitude: string | null; longitude: string | null; previous?: SeasonalMosqueSnapshot;
};

export function MawasimField({ label, children }: { label: string; children: ReactNode }) {
  return <label className="block space-y-1.5 text-sm font-medium text-foreground">{label}{children}</label>;
}

export function displayQuantity(service: SeasonalService, quantity: number) {
  return (quantity / seasonalServices[service].scale).toLocaleString("ar-SA", { maximumFractionDigits: 2 });
}

const SERVICE_ICONS: Record<SeasonalService, typeof Sparkles> = {
  carpet: Sparkles,
  water: Droplets,
  maintenance: Wrench,
  audio: Volume2,
  fragrance: Wind,
};

export function PrayerMeasurements({ label, value, onChange }: {
  label: string;
  value: SeasonalMosqueSnapshot["men"];
  onChange: (value: SeasonalMosqueSnapshot["men"]) => void;
}) {
  const areaSqM = value.lengthCm && value.widthCm ? ((value.lengthCm * value.widthCm) / 10000).toLocaleString("ar-SA", { maximumFractionDigits: 2 }) : null;
  return (
    <fieldset className="rounded-xl border border-border/60 bg-muted/20 p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <legend className="flex items-center gap-1.5 text-sm font-bold text-foreground">
          <Ruler className="size-4 text-primary" />
          {label}
        </legend>
        {areaSqM && (
          <Badge variant="outline" className="rounded-md bg-background text-xs font-semibold text-primary">
            المساحة: {areaSqM} م²
          </Badge>
        )}
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <MawasimField label="الطول بالمتر">
          <Input
            required
            type="number"
            min="0.01"
            max="1000"
            step="0.01"
            placeholder="مثال: 20"
            className="h-9 rounded-lg bg-background tabular-nums"
            value={value.lengthCm ? value.lengthCm / 100 : ""}
            onChange={event => onChange({ ...value, lengthCm: Math.round(Number(event.target.value) * 100) })}
          />
        </MawasimField>
        <MawasimField label="العرض بالمتر">
          <Input
            required
            type="number"
            min="0.01"
            max="1000"
            step="0.01"
            placeholder="مثال: 15"
            className="h-9 rounded-lg bg-background tabular-nums"
            value={value.widthCm ? value.widthCm / 100 : ""}
            onChange={event => onChange({ ...value, widthCm: Math.round(Number(event.target.value) * 100) })}
          />
        </MawasimField>
      </div>
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
    city: previous?.city ?? mosque.city,
    district: previous?.district ?? mosque.district ?? "",
    address: previous?.address ?? mosque.address ?? "",
    mapsUrl: previous?.mapsUrl ?? (mosque.latitude && mosque.longitude
      ? "https://www.google.com/maps?q=" + mosque.latitude + "," + mosque.longitude : ""),
    worshippers: previous?.worshippers ?? mosque.capacity ?? 0,
    men: previous?.men ?? emptyMeasurements,
    women: previous?.women ?? null,
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
    onSuccess: result => { toast.success("تم تسجيل الطلب الموسمي رقم " + result.id); onSubmitted(); },
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

  const enabledServices = seasonalServiceIds.filter(service => season.settings.services[service].enabled);

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Section 1: Mosque Details */}
      <Card className="border-border/60 shadow-xs">
        <CardHeader className="border-b border-border/50 bg-muted/20 px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Building2 className="size-5" />
            </div>
            <div>
              <CardTitle className="text-base font-bold">بيانات مسجد {mosque.name}</CardTitle>
              <CardDescription className="text-xs">
                راجع بيانات الموقع والقياسات التي سيستند إليها الطلب الموسمي
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 p-5">
          <div className="grid gap-4 sm:grid-cols-2">
            {([
              ["city", "المدينة", "مثال: أبها"],
              ["district", "الحي", "مثال: المنسك"],
              ["address", "العنوان والشارع", "وصف مختصر لموقع المسجد"],
              ["mapsUrl", "رابط خرائط Google", "https://maps.google.com/..."],
            ] as const).map(([key, label, placeholder]) => (
              <MawasimField key={key} label={label}>
                <Input
                  required
                  value={snapshot[key]}
                  placeholder={placeholder}
                  className="h-10 rounded-xl bg-background"
                  type={key === "mapsUrl" ? "url" : "text"}
                  maxLength={key === "city" || key === "district" ? 100 : 500}
                  onChange={event => setSnapshotValue(key, event.target.value)}
                />
              </MawasimField>
            ))}
            <MawasimField label="عدد المصلين التقريبي">
              <Input
                required
                type="number"
                min="1"
                max="100000"
                placeholder="مثال: 250"
                className="h-10 rounded-xl bg-background tabular-nums"
                value={snapshot.worshippers || ""}
                onChange={event => setSnapshotValue("worshippers", Number(event.target.value))}
              />
            </MawasimField>
          </div>
        </CardContent>
      </Card>

      {/* Section 2: Measurements & Photos */}
      <Card className="border-border/60 shadow-xs">
        <CardHeader className="border-b border-border/50 bg-muted/20 px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Camera className="size-5" />
            </div>
            <div>
              <CardTitle className="text-base font-bold">قياسات وصور المصليات</CardTitle>
              <CardDescription className="text-xs">
                أدخل أبعاد المصليات بدقة وأرفق صورة واضحة للفرش (JPG / PNG / WebP حتى 3 ميجابايت)
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 p-5">
          <PrayerMeasurements label="مصلى الرجال" value={snapshot.men} onChange={value => setSnapshotValue("men", value)} />
          <MawasimField label="صورة مصلى الرجال توضح الفرش">
            <Input
              required
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="h-10 cursor-pointer rounded-xl bg-background pt-2"
              onChange={event => setMenPhoto(event.target.files?.[0])}
            />
          </MawasimField>

          <div className="flex items-center justify-between rounded-xl border border-border/60 bg-muted/20 px-4 py-3">
            <div>
              <p className="text-sm font-semibold text-foreground">يوجد مصلى نساء</p>
              <p className="text-xs text-muted-foreground">فعّل هذا الخيار لإدخال أبعاد وصورة مصلى النساء</p>
            </div>
            <Switch
              checked={Boolean(snapshot.women)}
              onCheckedChange={checked => setSnapshotValue("women", checked ? previous?.women ?? emptyMeasurements : null)}
              aria-label="يوجد مصلى نساء"
              className="cursor-pointer"
            />
          </div>

          {snapshot.women && (
            <div className="space-y-4">
              <PrayerMeasurements label="مصلى النساء" value={snapshot.women} onChange={value => setSnapshotValue("women", value)} />
              <MawasimField label="صورة مصلى النساء (اختيارية)">
                <Input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="h-10 cursor-pointer rounded-xl bg-background pt-2"
                  onChange={event => setWomenPhoto(event.target.files?.[0])}
                />
              </MawasimField>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Section 3: Requested Services */}
      <Card className="border-border/60 shadow-xs">
        <CardHeader className="border-b border-border/50 bg-muted/20 px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Sparkles className="size-5" />
            </div>
            <div>
              <CardTitle className="text-base font-bold">الخدمات المطلوبة</CardTitle>
              <CardDescription className="text-xs">
                اختر الخدمات المطلوبة للمسجد ضمن السعة المتاحة في هذا الموسم
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 p-5">
          {enabledServices.length === 0 ? (
            <p className="rounded-xl border border-dashed p-4 text-center text-sm text-muted-foreground">
              لا توجد خدمات مفعّلة في هذا الموسم حالياً.
            </p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {enabledServices.map(service => {
                const meta = seasonalServices[service];
                const Icon = SERVICE_ICONS[service];
                const limit = Math.min(
                  capacity.find(row => row.service === service)?.available ?? 0,
                  seasonalMosqueLimit(service, season.settings, snapshot.worshippers),
                );
                const selected = Boolean(requested[service]);
                const disabled = limit === 0 || (service === "carpet" && (area === 0 || area > limit));

                return (
                  <div
                    key={service}
                    className={cn(
                      "space-y-2.5 rounded-xl border p-4 transition-all",
                      selected
                        ? "border-primary/50 bg-primary/5 shadow-2xs"
                        : "border-border/60 bg-background hover:border-border"
                    )}
                  >
                    {service === "water" ? (
                      <MawasimField label="سقيا الماء (كرتون)">
                        <div className="flex items-center gap-2">
                          <Icon className="size-4 text-sky-600 shrink-0" />
                          <Input
                            type="number"
                            min="0"
                            step="1"
                            max={limit}
                            disabled={limit === 0}
                            placeholder="عدد الكراتين"
                            className="h-9 rounded-lg bg-background tabular-nums"
                            value={requested.water || ""}
                            onChange={event => setRequested(current => ({ ...current, water: Number(event.target.value) }))}
                          />
                        </div>
                      </MawasimField>
                    ) : (
                      <label className={cn("flex items-center justify-between gap-2 text-sm font-semibold", disabled ? "opacity-60 cursor-not-allowed" : "cursor-pointer")}>
                        <span className="flex items-center gap-2">
                          <Icon className="size-4 text-primary shrink-0" />
                          <span>
                            {meta.label}
                            {service === "carpet" && ` · ${displayQuantity(service, area)} ${meta.unit}`}
                          </span>
                        </span>
                        <input
                          type="checkbox"
                          className="size-4 rounded accent-primary"
                          checked={selected}
                          disabled={disabled}
                          onChange={event => setRequested(current => ({ ...current, [service]: Number(event.target.checked) }))}
                        />
                      </label>
                    )}
                    <p className="text-xs text-muted-foreground">
                      {limit > 0
                        ? `الحد المتاح لهذا الطلب: ${displayQuantity(service, limit)} ${meta.unit}`
                        : "السعة غير متاحة حاليًا"}
                    </p>
                  </div>
                );
              })}
            </div>
          )}

          <MawasimField label="طلب خاص أو ملاحظات إضافية (اختياري)">
            <Textarea
              value={specialRequest}
              maxLength={2000}
              placeholder="أي ملاحظات إضافية أو احتياج خاص بالمسجد..."
              className="rounded-xl bg-background"
              onChange={event => setSpecialRequest(event.target.value)}
            />
          </MawasimField>
        </CardContent>
      </Card>

      {/* Section 4: On-behalf applicant details */}
      {staff && (
        <Card className="border-border/60 shadow-xs">
          <CardHeader className="border-b border-border/50 bg-muted/20 px-5 py-4">
            <div className="flex items-center gap-3">
              <div className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <UserCheck className="size-5" />
              </div>
              <div>
                <CardTitle className="text-base font-bold">بيانات مقدم الطلب (التسجيل بالنيابة)</CardTitle>
                <CardDescription className="text-xs">
                  بيانات التواصل مع إمام أو مسؤول المسجد ومبرر التسجيل
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="grid gap-4 p-5 sm:grid-cols-2">
            {([
              ["name", "اسم مقدم الطلب", "text", 150, "مثال: الشيخ عبدالله بن محمد"],
              ["phone", "رقم الجوال", "tel", 16, "مثال: 0551234567"],
              ["reason", "سبب أو ملاحظة التسجيل", "text", 500, "مثال: تسجيل عبر مكتب المشاريع بناءً على تواصل هاتفي"],
              ["email", "بريد حساب المستفيد (اختياري)", "email", 320, "example@domain.com"],
            ] as const).map(([key, label, type, maxLength, placeholder]) => (
              <MawasimField key={key} label={label}>
                <Input
                  required={key !== "email"}
                  type={type}
                  maxLength={maxLength}
                  placeholder={placeholder}
                  className="h-10 rounded-xl bg-background"
                  value={onBehalf[key]}
                  onChange={event => setOnBehalf(current => ({ ...current, [key]: event.target.value }))}
                />
              </MawasimField>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Section 5: Pledges & Submit */}
      <Card className="border-border/60 shadow-xs">
        <CardContent className="space-y-4 p-5">
          <div className="space-y-3 text-sm">
            <label className="flex items-start gap-2.5 cursor-pointer">
              <input
                className="mt-1 size-4 rounded accent-primary"
                required
                type="checkbox"
                checked={volunteers}
                onChange={event => setVolunteers(event.target.checked)}
              />
              <span>ألتزم بتوفير فريق من خمسة متطوعين على الأقل وتسجيلهم في المنصة الوطنية للتطوع.</span>
            </label>
            <label className="flex items-start gap-2.5 cursor-pointer">
              <input
                className="mt-1 size-4 rounded accent-primary"
                required
                type="checkbox"
                checked={pledge}
                onChange={event => setPledge(event.target.checked)}
              />
              <span>أتعهد بصحة البيانات والالتزام بالإجراءات والتصاريح بالتنسيق مع الجمعية.</span>
            </label>
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <CheckCircle2 className="size-3.5 text-primary" />
              يخضع تقديم الخدمة للمراجعة وتوفر الدعم والسعة المتاحة.
            </p>
          </div>

          <div className="flex justify-end border-t border-border/60 pt-4">
            <Button
              type="submit"
              disabled={reading || submit.isPending}
              className="h-11 gap-2 rounded-xl px-6 font-bold shadow-sm cursor-pointer"
            >
              {reading || submit.isPending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
              <span>{reading || submit.isPending ? "جارٍ الإرسال…" : "إرسال الطلب الموسمي"}</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </form>
  );
}
