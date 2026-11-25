import { useId, useState, type ComponentProps, type FormEvent, type ReactNode } from "react";
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
  Volume2,
  Wind,
  Wrench,
} from "lucide-react";

export type MawasimMosque = {
  id: number; name: string; city: string; district: string | null; address: string | null;
  capacity: number | null; previous?: SeasonalMosqueSnapshot;
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

function FieldError({ id, message }: { id?: string; message?: string }) {
  return message ? <span id={id} role="alert" className="block text-xs font-medium text-destructive">{message}</span> : null;
}

function RequestInput({ label, error, ...props }: ComponentProps<typeof Input> & { label: string; error?: string }) {
  const errorId = useId();
  return (
    <MawasimField label={label}>
      <Input {...props} aria-invalid={error ? true : undefined} aria-describedby={error ? errorId : undefined} />
      <FieldError id={errorId} message={error} />
    </MawasimField>
  );
}

type Measurements = NonNullable<SeasonalMosqueSnapshot["men"]>;

function measurementErrors({ lengthCm, widthCm }: Measurements) {
  return {
    lengthCm: lengthCm === 0 ? "أدخل طول المصلى." : lengthCm < 1 || lengthCm > 100_000 ? "أدخل طولًا بين ٠٫٠١ و١٬٠٠٠ متر." : undefined,
    widthCm: widthCm === 0 ? "أدخل عرض المصلى." : widthCm < 1 || widthCm > 100_000 ? "أدخل عرضًا بين ٠٫٠١ و١٬٠٠٠ متر." : undefined,
  };
}

function PrayerMeasurements({ label, value, errors, onChange }: {
  label: string;
  value: Measurements;
  errors?: ReturnType<typeof measurementErrors>;
  onChange: (value: Measurements) => void;
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
        <RequestInput
          label="الطول بالمتر"
          error={errors?.lengthCm}
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
        <RequestInput
          label="العرض بالمتر"
          error={errors?.widthCm}
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
      </div>
    </fieldset>
  );
}

const emptyMeasurements = { lengthCm: 0, widthCm: 0 };
const allowedPhotoTypes = ["image/jpeg", "image/png", "image/webp"];

function photoError(file: File) {
  return file.size === 0 || file.size > 3 * 1024 * 1024 || !allowedPhotoTypes.includes(file.type)
    ? "اختر صورة JPG أو PNG أو WebP بحجم لا يتجاوز 3 ميجابايت." : undefined;
}

function photoData(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("تعذّرت قراءة الصورة."));
    reader.readAsDataURL(file);
  });
}

export default function MawasimRequestForm({ season, mosque, capacity, onSubmitted }: {
  season: { id: number; settings: SeasonalRequestLimits };
  mosque: MawasimMosque;
  capacity: { service: SeasonalService; available: number }[];
  onSubmitted: () => void;
}) {
  const previous = mosque.previous;
  const [snapshot, setSnapshot] = useState<SeasonalMosqueSnapshot>({
    city: previous?.city ?? mosque.city,
    district: previous?.district ?? mosque.district ?? "",
    address: previous?.address ?? mosque.address ?? "",
    worshippers: previous?.worshippers ?? mosque.capacity ?? 0,
    men: previous?.men ?? emptyMeasurements,
    women: previous?.women ?? null,
  });
  const [requested, setRequested] = useState<SeasonalQuantities>({});
  const [specialRequest, setSpecialRequest] = useState("");
  const [menPhoto, setMenPhoto] = useState<File>();
  const [womenPhoto, setWomenPhoto] = useState<File>();
  const [pledge, setPledge] = useState(false);
  const [reading, setReading] = useState(false);
  const [showErrors, setShowErrors] = useState(false);
  const waterErrorId = useId();
  const carpetErrorId = useId();
  const pledgeErrorId = useId();
  const submit = trpc.mawasim.submit.useMutation({
    onSuccess: result => { toast.success("تم تسجيل طلب برنامج مواسم رقم " + result.id); onSubmitted(); },
    onError: error => toast.error(error.message),
  });

  const carpetRequested = Boolean(requested.carpet);
  const men = snapshot.men ?? emptyMeasurements;
  const area = carpetArea(men, snapshot.women);
  const water = requested.water ?? 0;
  const serviceLimit = (service: SeasonalService) => Math.min(
    capacity.find(row => row.service === service)?.available ?? 0,
    seasonalMosqueLimit(service, season.settings, snapshot.worshippers),
  );
  const menErrors = carpetRequested ? measurementErrors(men) : undefined;
  const womenErrors = carpetRequested && snapshot.women ? measurementErrors(snapshot.women) : undefined;
  const errors = {
    city: snapshot.city.trim() ? undefined : "أدخل اسم المدينة.",
    district: snapshot.district.trim() ? undefined : "أدخل اسم الحي.",
    address: snapshot.address.trim() ? undefined : "أدخل عنوان المسجد.",
    worshippers: snapshot.worshippers === 0 ? "أدخل عدد المصلين التقريبي."
      : !Number.isInteger(snapshot.worshippers) || snapshot.worshippers < 1 || snapshot.worshippers > 100_000
        ? "أدخل عددًا صحيحًا بين ١ و١٠٠٬٠٠٠." : undefined,
    services: Object.values(requested).some(amount => amount > 0) ? undefined : "اختر خدمة واحدة على الأقل.",
    water: !Number.isInteger(water) || water < 0 ? "أدخل عددًا صحيحًا غير سالب من الكراتين."
      : water > serviceLimit("water") ? "عدد الكراتين يتجاوز الحد المتاح للطلب." : undefined,
    carpet: carpetRequested && area > serviceLimit("carpet") ? "مساحة المصليات تتجاوز السعة المتاحة للطلب."
      : carpetRequested && area === 0 && !menErrors?.lengthCm && !menErrors?.widthCm
        ? "مساحة غسيل الفرش يجب أن تكون ٠٫٠١ متر مربع على الأقل." : undefined,
    menPhoto: carpetRequested ? menPhoto ? photoError(menPhoto) : "أرفق صورة مصلى الرجال." : undefined,
    womenPhoto: carpetRequested && snapshot.women && womenPhoto ? photoError(womenPhoto) : undefined,
    pledge: pledge ? undefined : "أكّد التعهّد بصحة البيانات قبل الإرسال.",
  };
  const setSnapshotValue = <K extends keyof SeasonalMosqueSnapshot,>(key: K, value: SeasonalMosqueSnapshot[K]) =>
    setSnapshot(current => ({ ...current, [key]: value }));

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (reading || submit.isPending) return;
    setShowErrors(true);
    if ([...Object.values(errors), ...Object.values(menErrors ?? {}), ...Object.values(womenErrors ?? {})].some(Boolean)) {
      const form = event.currentTarget;
      requestAnimationFrame(() => form.querySelector<HTMLElement>("[aria-invalid=true], [data-service-error]")?.focus());
      return;
    }
    setReading(true);
    try {
      const [menImage, womenImage] = await Promise.all([
        carpetRequested && menPhoto ? photoData(menPhoto) : undefined,
        carpetRequested && snapshot.women && womenPhoto ? photoData(womenPhoto) : undefined,
      ]);
      await submit.mutateAsync({
        seasonId: season.id, mosqueId: mosque.id,
        snapshot: carpetRequested ? snapshot : { ...snapshot, men: null, women: null },
        requested: { ...requested, carpet: carpetRequested ? area : 0 },
        specialRequest, menPhoto: menImage, womenPhoto: womenImage, pledge: true,
      }).catch(() => { /* The mutation displays the server error. */ });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "تعذّر تجهيز الصور.");
    } finally {
      setReading(false);
    }
  }

  const enabledServices = seasonalServiceIds.filter(service => season.settings.services[service].enabled);

  return (
    <form noValidate onSubmit={handleSubmit} className="space-y-6">
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
                راجع بيانات المسجد التي سيستند إليها طلب برنامج مواسم
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
            ] as const).map(([key, label, placeholder]) => (
              <RequestInput
                key={key}
                label={label}
                error={showErrors ? errors[key] : undefined}
                required
                value={snapshot[key]}
                placeholder={placeholder}
                className="h-10 rounded-xl bg-background"
                maxLength={key === "city" || key === "district" ? 100 : 500}
                onChange={event => setSnapshotValue(key, event.target.value)}
              />
            ))}
            <RequestInput
              label="عدد المصلين التقريبي"
              error={showErrors ? errors.worshippers : undefined}
              required
              type="number"
              min="1"
              max="100000"
              placeholder="مثال: 250"
              className="h-10 rounded-xl bg-background tabular-nums"
              value={snapshot.worshippers || ""}
              onChange={event => setSnapshotValue("worshippers", Number(event.target.value))}
            />
          </div>
        </CardContent>
      </Card>

      {/* Section 2: Requested Services */}
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
                const limit = serviceLimit(service);
                const selected = Boolean(requested[service]);
                const disabled = limit === 0 && !selected;

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
                            disabled={disabled}
                            aria-invalid={showErrors && errors.water ? true : undefined}
                            aria-describedby={showErrors && errors.water ? waterErrorId : undefined}
                            placeholder="عدد الكراتين"
                            className="h-9 rounded-lg bg-background tabular-nums"
                            value={requested.water || ""}
                            onChange={event => setRequested(current => ({ ...current, water: Number(event.target.value) }))}
                          />
                        </div>
                        <FieldError id={waterErrorId} message={showErrors ? errors.water : undefined} />
                      </MawasimField>
                    ) : (
                      <label className={cn("flex items-center justify-between gap-2 text-sm font-semibold", disabled ? "opacity-60 cursor-not-allowed" : "cursor-pointer")}>
                        <span className="flex items-center gap-2">
                          <Icon className="size-4 text-primary shrink-0" />
                          <span>
                            {meta.label}
                            {service === "carpet" && area > 0 && ` · ${displayQuantity(service, area)} ${meta.unit}`}
                          </span>
                        </span>
                        <input
                          type="checkbox"
                          className="size-4 rounded accent-primary"
                          checked={selected}
                          disabled={disabled}
                          aria-invalid={service === "carpet" && showErrors && errors.carpet ? true : undefined}
                          aria-describedby={service === "carpet" && showErrors && errors.carpet ? carpetErrorId : undefined}
                          onChange={event => {
                            const checked = event.target.checked;
                            setRequested(current => ({ ...current, [service]: Number(checked) }));
                            if (service === "carpet" && !checked) {
                              setMenPhoto(undefined);
                              setWomenPhoto(undefined);
                            }
                          }}
                        />
                      </label>
                    )}
                    <p className="text-xs text-muted-foreground">
                      {limit > 0
                        ? `الحد المتاح لهذا الطلب: ${displayQuantity(service, limit)} ${meta.unit}`
                        : "السعة غير متاحة حاليًا"}
                    </p>
                    {service === "carpet" && <FieldError id={carpetErrorId} message={showErrors ? errors.carpet : undefined} />}
                  </div>
                );
              })}
            </div>
          )}

          {showErrors && errors.services && (
            <p data-service-error tabIndex={-1}><FieldError message={errors.services} /></p>
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

      {carpetRequested && (
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
            <PrayerMeasurements
              label="مصلى الرجال"
              value={men}
              errors={showErrors ? menErrors : undefined}
              onChange={value => setSnapshotValue("men", value)}
            />
            <RequestInput
              label="صورة مصلى الرجال توضح الفرش"
              error={showErrors || menPhoto ? errors.menPhoto : undefined}
              required
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="h-10 cursor-pointer rounded-xl bg-background pt-2"
              onChange={event => setMenPhoto(event.target.files?.[0])}
            />

            <div className="flex items-center justify-between rounded-xl border border-border/60 bg-muted/20 px-4 py-3">
              <div>
                <p className="text-sm font-semibold text-foreground">يوجد مصلى نساء</p>
                <p className="text-xs text-muted-foreground">فعّل هذا الخيار لإدخال أبعاد وصورة مصلى النساء</p>
              </div>
              <Switch
                checked={Boolean(snapshot.women)}
                onCheckedChange={checked => {
                  setSnapshotValue("women", checked ? previous?.women ?? emptyMeasurements : null);
                  if (!checked) setWomenPhoto(undefined);
                }}
                aria-label="يوجد مصلى نساء"
                className="cursor-pointer"
              />
            </div>

            {snapshot.women && (
              <div className="space-y-4">
                <PrayerMeasurements
                  label="مصلى النساء"
                  value={snapshot.women}
                  errors={showErrors ? womenErrors : undefined}
                  onChange={value => setSnapshotValue("women", value)}
                />
                <RequestInput
                  label="صورة مصلى النساء (اختيارية)"
                  error={errors.womenPhoto}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="h-10 cursor-pointer rounded-xl bg-background pt-2"
                  onChange={event => setWomenPhoto(event.target.files?.[0])}
                />
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Pledge & Submit */}
      <Card className="border-border/60 shadow-xs">
        <CardContent className="space-y-4 p-5">
          <div className="space-y-3 text-sm">
            <label className="flex items-start gap-2.5 cursor-pointer">
              <input
                className="mt-1 size-4 rounded accent-primary"
                required
                type="checkbox"
                checked={pledge}
                aria-invalid={showErrors && errors.pledge ? true : undefined}
                aria-describedby={showErrors && errors.pledge ? pledgeErrorId : undefined}
                onChange={event => setPledge(event.target.checked)}
              />
              <span>أتعهد بصحة البيانات والالتزام بالإجراءات والتصاريح بالتنسيق مع الجمعية.</span>
            </label>
            <FieldError id={pledgeErrorId} message={showErrors ? errors.pledge : undefined} />
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
              <span>{reading || submit.isPending ? "جارٍ الإرسال…" : "إرسال طلب برنامج مواسم"}</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </form>
  );
}
