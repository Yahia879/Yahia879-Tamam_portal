import { useId, useState, type ComponentProps, type FormEvent, type ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  AlertTriangle,
  Building2,
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
  capacity: number | null; area?: string | number | null; hasPrayerHall?: boolean | null;
  previous?: SeasonalMosqueSnapshot;
  linkedRequester?: { id: number; name: string; email: string | null; phone: string | null; requesterType: string | null } | null;
};

export function MawasimField({ label, children }: { label: string; children: ReactNode }) {
  return <label className="block space-y-1.5 text-sm font-medium text-foreground">{label}{children}</label>;
}

export function displayQuantity(service: SeasonalService, quantity: number) {
  return (quantity / seasonalServices[service].scale).toLocaleString("ar-SA", { maximumFractionDigits: 2 });
}

export const SEASONAL_SUBMISSION_NOTICE =
  "تم تسجيل طلبكم ونؤكد على أن التسجيل الحالي لحصر الاحتياج فقط وسيتم التواصل معكم بعد اكتمال الدعم واكتمال الشروط والمعايير";

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

export default function MawasimRequestForm({ season, mosque, capacity, onSubmitted }: {
  season: { id: number; settings: SeasonalRequestLimits };
  mosque: MawasimMosque;
  capacity: { service: SeasonalService; available: number }[];
  onSubmitted: () => void;
}) {
  const previous = mosque.previous;
  const [snapshot, setSnapshot] = useState<SeasonalMosqueSnapshot>({
    city: previous?.city?.trim() || mosque.city || "",
    district: previous?.district?.trim() || mosque.district || "",
    address: previous?.address?.trim() || mosque.address || "",
    worshippers: previous?.worshippers || mosque.capacity || 0,
    men: previous?.men ?? emptyMeasurements,
    women: previous?.women ?? (mosque.hasPrayerHall ? emptyMeasurements : null),
  });
  const [requested, setRequested] = useState<SeasonalQuantities>({});
  const [specialRequest, setSpecialRequest] = useState("");
  const [pledge, setPledge] = useState(false);
  const [showErrors, setShowErrors] = useState(false);
  const [ceilingConfirm, setCeilingConfirm] = useState<{
    requestId: number;
    exceeded: { service: SeasonalService; label: string; unit: string; requested: number; ceiling: number }[];
  } | null>(null);
  const waterErrorId = useId();
  const carpetErrorId = useId();
  const pledgeErrorId = useId();
  const utils = trpc.useUtils();
  const submit = trpc.mawasim.submit.useMutation({
    onError: error => toast.error(error.message),
  });

  const carpetRequested = Boolean(requested.carpet);
  const men = snapshot.men ?? emptyMeasurements;
  const area = carpetArea(men, snapshot.women);
  const water = requested.water ?? 0;
  const availableCapacity = (service: SeasonalService) =>
    capacity.find(row => row.service === service)?.available ?? 0;
  const mosqueCeiling = (service: SeasonalService) =>
    seasonalMosqueLimit(service, season.settings, snapshot.worshippers);
  const serviceCurrentAmount = (service: SeasonalService) =>
    service === "carpet" ? (carpetRequested ? area : 0) : (requested[service] ?? 0);
  const isExceedingCeiling = (service: SeasonalService) => {
    const ceiling = mosqueCeiling(service);
    const amount = serviceCurrentAmount(service);
    return amount > 0 && Number.isFinite(ceiling) && amount > ceiling;
  };
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
    water: !Number.isInteger(water) || water < 0 ? "أدخل عددًا صحيحًا غير سالب من الكراتين." : undefined,
    carpet: carpetRequested && area === 0 && !menErrors?.lengthCm && !menErrors?.widthCm
      ? "مساحة غسيل الفرش يجب أن تكون ٠٫٠١ متر مربع على الأقل." : undefined,
    pledge: pledge ? undefined : "أكّد التعهّد بصحة البيانات قبل الإرسال.",
  };
  const setSnapshotValue = <K extends keyof SeasonalMosqueSnapshot,>(key: K, value: SeasonalMosqueSnapshot[K]) =>
    setSnapshot(current => ({ ...current, [key]: value }));

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submit.isPending) return;
    setShowErrors(true);
    if ([...Object.values(errors), ...Object.values(menErrors ?? {}), ...Object.values(womenErrors ?? {})].some(Boolean)) {
      const form = event.currentTarget;
      requestAnimationFrame(() => form.querySelector<HTMLElement>("[aria-invalid=true], [data-service-error]")?.focus());
      return;
    }
    const exceeded = enabledServices
      .filter(isExceedingCeiling)
      .map(service => ({
        service,
        label: seasonalServices[service].label,
        unit: seasonalServices[service].unit,
        requested: serviceCurrentAmount(service),
        ceiling: mosqueCeiling(service),
      }));
    try {
      const result = await submit.mutateAsync({
        seasonId: season.id, mosqueId: mosque.id,
        snapshot: carpetRequested ? snapshot : { ...snapshot, men: null, women: null },
        requested: { ...requested, carpet: carpetRequested ? area : 0 },
        specialRequest, pledge: true,
      });
      void utils.mawasim.invalidate();
      void utils.mosques.invalidate();
      toast.success("تم تسجيل طلب برنامج مواسم رقم " + result.id);
      setCeilingConfirm({ requestId: result.id, exceeded });
    } catch {
      /* Mutation onError displays the server error. */
    }
  }

  const enabledServices = seasonalServiceIds.filter(service => season.settings.services[service].enabled);

  return (
    <form noValidate onSubmit={handleSubmit} className="space-y-6">
      {/* Section 1: Mosque Details */}
      <Card className="border-border/60 shadow-xs">
        <CardHeader className="border-b border-border/50 bg-muted/20 px-5 py-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Building2 className="size-5" />
              </div>
              <div>
                <CardTitle className="text-base font-bold">بيانات مسجد {mosque.name}</CardTitle>
                <CardDescription className="text-xs">
                  راجع بيانات المسجد أو عدّلها؛ تُحدَّث بيانات المسجد المسجلة تلقائيًا عند الإرسال
                </CardDescription>
              </div>
            </div>
            {mosque.area && Number(mosque.area) > 0 ? (
              <Badge variant="outline" className="rounded-lg bg-background text-xs font-semibold text-primary">
                المساحة المسجلة: {Number(mosque.area).toLocaleString("ar-SA")} م²
              </Badge>
            ) : null}
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
                const available = availableCapacity(service);
                const ceiling = mosqueCeiling(service);
                const selected = Boolean(requested[service]);
                const disabled = available === 0 && !selected;
                const exceedsCeiling = isExceedingCeiling(service);

                return (
                  <div
                    key={service}
                    className={cn(
                      "space-y-2.5 rounded-xl border p-4 transition-all",
                      exceedsCeiling
                        ? "border-amber-300 bg-amber-50/40 dark:border-amber-800/60 dark:bg-amber-950/15"
                        : selected
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
                          }}
                        />
                      </label>
                    )}
                    <p className="text-xs text-muted-foreground">
                      {available > 0 ? (
                        <>
                          {Number.isFinite(ceiling)
                            ? `سقف المسجد: ${displayQuantity(service, ceiling)} ${meta.unit}`
                            : `متاح في الموسم: ${displayQuantity(service, available)} ${meta.unit}`}
                        </>
                      ) : (
                        "السعة غير متاحة حاليًا"
                      )}
                    </p>
                    {exceedsCeiling && (
                      <div
                        role="status"
                        className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50/90 px-3 py-2 text-xs text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200"
                      >
                        <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-amber-600 dark:text-amber-400" />
                        <span>
                          سيتم تسجيل طلبكم بالكمية المطلوبة، علمًا أن الحد الأقصى المسموح به للمسجد هو {displayQuantity(service, ceiling)} {meta.unit}.
                        </span>
                      </div>
                    )}
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
                <Ruler className="size-5" />
              </div>
              <div>
                <CardTitle className="text-base font-bold">قياسات المصليات</CardTitle>
                <CardDescription className="text-xs">
                  أدخل أبعاد المصليات بدقة لحساب المساحة المطلوبة تلقائيًا
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 p-5">
            {isExceedingCeiling("carpet") && (
              <div
                role="status"
                className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50/90 px-4 py-3 text-xs text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200"
              >
                <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-400" />
                <span>
                  سيتم تسجيل طلبكم بالمساحة الفعلية ({displayQuantity("carpet", area)} م²)، علمًا أن الحد الأقصى المسموح به للمسجد هو {displayQuantity("carpet", mosqueCeiling("carpet"))} م².
                </span>
              </div>
            )}
            <PrayerMeasurements
              label="مصلى الرجال"
              value={men}
              errors={showErrors ? menErrors : undefined}
              onChange={value => setSnapshotValue("men", value)}
            />

            <div className="flex items-center justify-between rounded-xl border border-border/60 bg-muted/20 px-4 py-3">
              <div>
                <p className="text-sm font-semibold text-foreground">يوجد مصلى نساء</p>
                <p className="text-xs text-muted-foreground">فعّل هذا الخيار لإدخال أبعاد مصلى النساء</p>
              </div>
              <Switch
                checked={Boolean(snapshot.women)}
                onCheckedChange={checked => {
                  setSnapshotValue("women", checked ? previous?.women ?? emptyMeasurements : null);
                }}
                aria-label="يوجد مصلى نساء"
                className="cursor-pointer"
              />
            </div>

            {snapshot.women && (
              <PrayerMeasurements
                label="مصلى النساء"
                value={snapshot.women}
                errors={showErrors ? womenErrors : undefined}
                onChange={value => setSnapshotValue("women", value)}
              />
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
              disabled={submit.isPending}
              className="h-11 gap-2 rounded-xl px-6 font-bold shadow-sm cursor-pointer"
            >
              {submit.isPending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
              <span>{submit.isPending ? "جارٍ الإرسال…" : "إرسال طلب برنامج مواسم"}</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      <Dialog
        open={Boolean(ceilingConfirm)}
        onOpenChange={open => {
          if (!open && ceilingConfirm) {
            setCeilingConfirm(null);
            onSubmitted();
          }
        }}
      >
        <DialogContent dir="rtl" className="sm:max-w-lg rounded-2xl">
          <DialogHeader className="text-right space-y-2">
            <DialogTitle className="flex items-center gap-2 text-base font-extrabold text-foreground">
              <CheckCircle2 className="size-5 shrink-0 text-emerald-600" />
              <span>تم تسجيل طلبكم بنجاح {ceilingConfirm ? `(#${ceilingConfirm.requestId})` : ""}</span>
            </DialogTitle>
            <DialogDescription className="text-sm text-foreground/90 font-medium leading-relaxed">
              {SEASONAL_SUBMISSION_NOTICE}
            </DialogDescription>
          </DialogHeader>

          {ceilingConfirm && ceilingConfirm.exceeded.length > 0 && (
            <div className="space-y-2 rounded-xl border border-amber-200 bg-amber-50/70 p-3.5 text-xs text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200">
              <p className="font-semibold">
                علمًا أن الحد الأقصى المسموح به للمسجد للخدمات التالية هو:
              </p>
              {ceilingConfirm.exceeded.map(item => (
                <div key={item.service} className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-bold">{item.label}</span>
                  <span>
                    المطلوب: <strong>{displayQuantity(item.service, item.requested)} {item.unit}</strong> · الحد الأقصى للمسجد:{" "}
                    <strong>{displayQuantity(item.service, item.ceiling)} {item.unit}</strong>
                  </span>
                </div>
              ))}
            </div>
          )}

          <DialogFooter className="sm:justify-end">
            <Button
              type="button"
              onClick={() => {
                setCeilingConfirm(null);
                onSubmitted();
              }}
              className="rounded-xl font-bold cursor-pointer"
            >
              حسناً، المتابعة
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </form>
  );
}
