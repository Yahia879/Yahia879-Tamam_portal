import { useId, useState, type ComponentProps, type FormEvent, type ReactNode } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import {
  carpetArea, seasonalMosqueLimit, seasonalServiceIds, seasonalServices,
  type SeasonalExtraServiceItem, type SeasonalMosqueSnapshot, type SeasonalQuantities,
  type SeasonalService, type SeasonalRequestLimits,
} from "@shared/mawasim";
import {
  AlertTriangle,
  Building2,
  CheckCircle2,
  Droplets,
  Loader2,
  MapPin,
  Plus,
  Ruler,
  Send,
  Sparkles,
  Trash2,
  Volume2,
  Wallet,
  Wind,
  Wrench,
} from "lucide-react";

export type MawasimMosque = {
  id: number; name: string; city: string; district: string | null; address: string | null;
  capacity: number | null; area?: string | number | null; hasPrayerHall?: boolean | null;
  menLengthCm?: number | null; menWidthCm?: number | null;
  womenLengthCm?: number | null; womenWidthCm?: number | null;
  previous?: SeasonalMosqueSnapshot;
  linkedRequester?: { id: number; name: string; email: string | null; phone: string | null; requesterType: string | null } | null;
};

export function MawasimField({ label, children }: { label: string; children: ReactNode }) {
  return <label className="block space-y-1.5 text-sm font-medium text-foreground">{label}{children}</label>;
}

export function displayQuantity(service: SeasonalService, quantity: number) {
  return (quantity / seasonalServices[service].scale).toLocaleString("ar-SA", { maximumFractionDigits: 2 });
}

export const SEASONAL_PRE_SUBMIT_NOTICE =
  "نؤكد على أن التسجيل الحالي لحصر الاحتياج فقط، وسيتم التواصل معكم بعد اكتمال الدعم واكتمال الشروط والمعايير.";

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

export function PrayerMeasurements({ label, value, fallbackArea, errors, onChange }: {
  label: string;
  value: Measurements;
  fallbackArea?: string | number | null;
  errors?: ReturnType<typeof measurementErrors>;
  onChange: (value: Measurements) => void;
}) {
  const numericFallback = fallbackArea !== null && fallbackArea !== undefined ? Number(fallbackArea) : 0;
  const areaSqM = value.lengthCm && value.widthCm
    ? ((value.lengthCm * value.widthCm) / 10000).toLocaleString("ar-SA", { maximumFractionDigits: 2 })
    : numericFallback > 0
      ? numericFallback.toLocaleString("ar-SA", { maximumFractionDigits: 2 })
      : "";
  const isMissingDimensions = !value.lengthCm || !value.widthCm;
  return (
    <fieldset className="rounded-xl border border-border/60 bg-muted/20 p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <legend className="flex items-center gap-1.5 text-sm font-bold text-foreground">
          <Ruler className="size-4 text-primary" />
          {label}
        </legend>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
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
        <MawasimField label="المساحة (م²)">
          <Input
            type="text"
            readOnly
            tabIndex={-1}
            placeholder="تُحسب تلقائياً"
            className="h-9 rounded-lg bg-muted/50 font-semibold text-primary tabular-nums cursor-default"
            value={areaSqM ? `${areaSqM} م²` : ""}
          />
        </MawasimField>
      </div>
      {isMissingDimensions && (
        <p className="mt-2 text-xs font-medium text-amber-700 dark:text-amber-400">
          يرجى تعبئة الطول بالمتر والعرض بالمتر لحساب المساحة تلقائياً.
        </p>
      )}
    </fieldset>
  );
}

const emptyMeasurements = { lengthCm: 0, widthCm: 0 };

type ExtraServiceDraft = {
  id: string;
  category: SeasonalService;
  quantity: number;
  notes: string;
};

function createExtraServiceDraft(category: SeasonalService): ExtraServiceDraft {
  return {
    id: `extra_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    category,
    quantity: 1,
    notes: "",
  };
}

export default function MawasimRequestForm({ season, mosque, capacity, allowExtraServices = false, onSubmitted }: {
  season: { id: number; settings: SeasonalRequestLimits };
  mosque: MawasimMosque;
  capacity: { service: SeasonalService; available: number }[];
  allowExtraServices?: boolean;
  onSubmitted: () => void;
}) {
  const previous = mosque.previous;
  const savedMen = mosque.menLengthCm && mosque.menWidthCm
    ? { lengthCm: mosque.menLengthCm, widthCm: mosque.menWidthCm }
    : null;
  const savedWomen = mosque.womenLengthCm && mosque.womenWidthCm
    ? { lengthCm: mosque.womenLengthCm, widthCm: mosque.womenWidthCm }
    : null;
  const [snapshot, setSnapshot] = useState<SeasonalMosqueSnapshot>({
    city: previous?.city?.trim() || mosque.city || "",
    district: previous?.district?.trim() || mosque.district || "",
    address: previous?.address?.trim() || mosque.address || "",
    worshippers: previous?.worshippers || mosque.capacity || 0,
    men: previous?.men ?? savedMen ?? emptyMeasurements,
    women: previous?.women ?? savedWomen ?? (mosque.hasPrayerHall ? emptyMeasurements : null),
  });
  const [requested, setRequested] = useState<SeasonalQuantities>({});
  const [extraServices, setExtraServices] = useState<ExtraServiceDraft[]>([]);
  const [specialRequest, setSpecialRequest] = useState("");
  const [pledge, setPledge] = useState(false);
  const [showErrors, setShowErrors] = useState(false);
  const [pendingConfirm, setPendingConfirm] = useState<{
    payload: {
      seasonId: number;
      mosqueId: number;
      snapshot: SeasonalMosqueSnapshot;
      requested: SeasonalQuantities;
      extraServices?: SeasonalExtraServiceItem[];
      specialRequest: string;
      pledge: true;
    };
    selectedItems: { service: SeasonalService; label: string; unit: string; requested: number }[];
    extraItems: SeasonalExtraServiceItem[];
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
  const enabledServices = seasonalServiceIds.filter(service => season.settings.services[service].enabled);
  const disabledServices = seasonalServiceIds.filter(service => !season.settings.services[service].enabled);
  const canAttachExtraServices = allowExtraServices && disabledServices.length > 0;
  const menErrors = carpetRequested ? measurementErrors(men) : undefined;
  const womenErrors = carpetRequested && snapshot.women ? measurementErrors(snapshot.women) : undefined;
  const extraServicesErrors = canAttachExtraServices
    ? extraServices.map(item => ({
        quantity: Number.isFinite(item.quantity) && item.quantity > 0 ? undefined : "أدخل كمية موجبة.",
      }))
    : [];
  const hasAnyExtraServiceError = extraServicesErrors.some(err => Object.values(err).some(Boolean));
  const hasSelectedService =
    Object.values(requested).some(amount => amount > 0) ||
    (canAttachExtraServices && extraServices.length > 0);
  const errors = {
    city: snapshot.city.trim() ? undefined : "أدخل اسم المدينة.",
    district: snapshot.district.trim() ? undefined : "أدخل اسم الحي.",
    address: snapshot.address.trim() ? undefined : "أدخل عنوان المسجد.",
    worshippers: snapshot.worshippers === 0 ? "أدخل عدد المصلين التقريبي."
      : !Number.isInteger(snapshot.worshippers) || snapshot.worshippers < 1 || snapshot.worshippers > 100_000
        ? "أدخل عددًا صحيحًا بين ١ و١٠٠٬٠٠٠." : undefined,
    services: hasSelectedService
      ? undefined
      : canAttachExtraServices
        ? "اختر خدمة واحدة على الأقل أو أضف خدمة إضافية للطلب."
        : "اختر خدمة واحدة على الأقل.",
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
    if (
      hasAnyExtraServiceError ||
      [...Object.values(errors), ...Object.values(menErrors ?? {}), ...Object.values(womenErrors ?? {})].some(Boolean)
    ) {
      const form = event.currentTarget;
      requestAnimationFrame(() => form.querySelector<HTMLElement>("[aria-invalid=true], [data-service-error]")?.focus());
      return;
    }
    const selectedItems = enabledServices
      .filter(service => serviceCurrentAmount(service) > 0)
      .map(service => ({
        service,
        label: seasonalServices[service].label,
        unit: seasonalServices[service].unit,
        requested: serviceCurrentAmount(service),
      }));
    const normalizedExtraServices: SeasonalExtraServiceItem[] = canAttachExtraServices
      ? extraServices.map(item => {
          const meta = seasonalServices[item.category];
          return {
            id: item.id,
            category: item.category,
            title: meta.label,
            quantity: Number(item.quantity),
            unit: meta.unit,
            costHalalas: 0,
            ...(item.notes.trim() ? { notes: item.notes.trim() } : {}),
          };
        })
      : [];
    const exceeded = enabledServices
      .filter(isExceedingCeiling)
      .map(service => ({
        service,
        label: seasonalServices[service].label,
        unit: seasonalServices[service].unit,
        requested: serviceCurrentAmount(service),
        ceiling: mosqueCeiling(service),
      }));

    // Defer backend submission until the user confirms inside the pre-submit alert dialog.
    setPendingConfirm({
      payload: {
        seasonId: season.id,
        mosqueId: mosque.id,
        snapshot: carpetRequested ? snapshot : { ...snapshot, men: null, women: null },
        requested: { ...requested, carpet: carpetRequested ? area : 0 },
        ...(normalizedExtraServices.length > 0 ? { extraServices: normalizedExtraServices } : {}),
        specialRequest,
        pledge: true,
      },
      selectedItems,
      extraItems: normalizedExtraServices,
      exceeded,
    });
  }

  async function handleConfirmSubmit() {
    if (!pendingConfirm || submit.isPending) return;
    try {
      const result = await submit.mutateAsync(pendingConfirm.payload);
      await Promise.all([utils.mawasim.invalidate(), utils.mosques.invalidate()]);
      toast.success("تم تسجيل طلب برنامج مواسم رقم " + result.id, {
        description: SEASONAL_SUBMISSION_NOTICE,
        duration: 8000,
        classNames: {
          title: "!text-sm !font-bold !text-foreground",
          description: "!mt-1 !text-xs sm:!text-sm !font-medium !leading-relaxed !text-foreground !opacity-100",
        },
      });
      setPendingConfirm(null);
      onSubmitted();
    } catch {
      /* Mutation onError displays the server error. */
    }
  }

  return (
    <form noValidate onSubmit={handleSubmit} className="space-y-6">
      {/* Section 1: Mosque Details */}
      <Card className="border-border/60 shadow-xs">
        <CardHeader className="border-b border-border/50 bg-muted/20 px-4 py-4 sm:px-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
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
                          className="size-4 shrink-0 rounded accent-primary"
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
                    {service === "carpet" && <FieldError id={carpetErrorId} message={showErrors ? errors.carpet : undefined} />}
                  </div>
                );
              })}
            </div>
          )}

          {showErrors && errors.services && (
            <p data-service-error tabIndex={-1}><FieldError message={errors.services} /></p>
          )}

          {canAttachExtraServices && (
            <div className="space-y-3 rounded-2xl border border-dashed border-primary/35 bg-primary/[0.03] p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Wallet className="size-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-foreground">إضافة خدمة أخرى للطلب (مصرف على الموسم)</h3>
                    <p className="text-xs text-muted-foreground">
                      لإرفاق خدمة غير مفعّلة في الموسم (مثل الصوتيات أو الفرش أو احتياج إضافي للمسجد) وتُسجّل كمصرف على الموسم
                    </p>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const defaultCat = disabledServices[0];
                    if (defaultCat) {
                      setExtraServices(current => [...current, createExtraServiceDraft(defaultCat)]);
                    }
                  }}
                  className="w-full sm:w-auto justify-center gap-1.5 rounded-xl border-primary/40 bg-background text-primary hover:bg-primary/5 cursor-pointer"
                >
                  <Plus className="size-4" />
                  <span>إضافة خدمة أخرى</span>
                </Button>
              </div>

              {extraServices.length > 0 && (
                <div className="space-y-3">
                  {extraServices.map((item, idx) => {
                    const itemErrors = extraServicesErrors[idx];
                    const selectedMeta = seasonalServices[item.category];
                    return (
                      <div key={item.id} className="space-y-3 rounded-xl border border-border/70 bg-background p-3.5 shadow-2xs">
                        <div className="flex items-center justify-between gap-2 border-b border-border/50 pb-2">
                          <span className="text-xs font-bold text-primary">خدمة إضافية #{idx + 1}</span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => setExtraServices(current => current.filter(row => row.id !== item.id))}
                            className="h-7 gap-1 px-2 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive cursor-pointer"
                          >
                            <Trash2 className="size-3.5" />
                            <span>إزالة</span>
                          </Button>
                        </div>

                        <div className="grid gap-3 sm:grid-cols-2 [&>*]:min-w-0">
                          <MawasimField label="نوع الخدمة">
                            <Select
                              value={item.category}
                              onValueChange={val => {
                                const nextCategory = val as SeasonalService;
                                setExtraServices(current =>
                                  current.map(row => (row.id === item.id ? { ...row, category: nextCategory } : row)),
                                );
                              }}
                            >
                              <SelectTrigger className="h-9 w-full rounded-lg bg-background">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {disabledServices.map(cat => (
                                  <SelectItem key={cat} value={cat}>
                                    {seasonalServices[cat].label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </MawasimField>

                          <RequestInput
                            label={`الكمية (${selectedMeta.unit})`}
                            error={showErrors ? itemErrors?.quantity : undefined}
                            required
                            type="number"
                            min="0.01"
                            step="any"
                            className="h-9 rounded-lg bg-background tabular-nums"
                            value={item.quantity || ""}
                            onChange={event => {
                              const value = Number(event.target.value);
                              setExtraServices(current =>
                                current.map(row => (row.id === item.id ? { ...row, quantity: value } : row)),
                              );
                            }}
                          />
                        </div>

                        <MawasimField label="ملاحظات البند (اختياري)">
                          <Input
                            value={item.notes}
                            maxLength={500}
                            placeholder="تفاصيل إضافية حول هذه الخدمة أو المبرر..."
                            className="h-9 rounded-lg bg-background"
                            onChange={event => {
                              const value = event.target.value;
                              setExtraServices(current =>
                                current.map(row => (row.id === item.id ? { ...row, notes: value } : row)),
                              );
                            }}
                          />
                        </MawasimField>
                      </div>
                    );
                  })}
                </div>
              )}
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
            <PrayerMeasurements
              label="مصلى الرجال"
              value={men}
              fallbackArea={mosque.area}
              errors={showErrors ? menErrors : undefined}
              onChange={value => setSnapshotValue("men", value)}
            />

            <div className="flex items-center justify-between gap-3 rounded-xl border border-border/60 bg-muted/20 px-4 py-3">
              <div>
                <p className="text-sm font-semibold text-foreground">يوجد مصلى نساء</p>
                <p className="text-xs text-muted-foreground">فعّل هذا الخيار لإدخال أبعاد مصلى النساء</p>
              </div>
              <Switch
                checked={Boolean(snapshot.women)}
                onCheckedChange={checked => {
                  setSnapshotValue("women", checked ? previous?.women ?? savedWomen ?? emptyMeasurements : null);
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
              className="h-11 w-full sm:w-auto justify-center gap-2 rounded-xl px-6 font-bold shadow-sm cursor-pointer"
            >
              {submit.isPending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
              <span>{submit.isPending ? "جارٍ الإرسال…" : "إرسال طلب برنامج مواسم"}</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      <Dialog
        open={Boolean(pendingConfirm)}
        onOpenChange={open => {
          if (!open && !submit.isPending) {
            setPendingConfirm(null);
          }
        }}
      >
        <DialogContent dir="rtl" className="sm:max-w-lg max-h-[calc(100dvh-2rem)] overflow-y-auto rounded-2xl border-2 border-border bg-card p-4 sm:p-6 text-right shadow-2xl">
          <DialogHeader className="items-start space-y-2 ps-8 text-right sm:text-right">
            <DialogTitle className="flex w-full items-center justify-start gap-2.5 text-right text-base sm:text-lg font-extrabold text-foreground">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700 dark:bg-amber-900/60 dark:text-amber-300">
                <AlertTriangle className="size-5" />
              </span>
              <span>تنبيه وتأكيد قبل إرسال الطلب</span>
            </DialogTitle>
            <DialogDescription className="w-full text-right text-xs sm:text-sm font-medium text-foreground/90 leading-relaxed">
              يرجى قراءة التنبيه ومراجعة بيانات طلب مسجد <strong className="font-bold text-foreground">{mosque.name}</strong> قبل التأكيد النهائي.
            </DialogDescription>
          </DialogHeader>

          <Alert className="rounded-xl border-2 border-amber-400 bg-amber-50 text-right text-amber-950 shadow-xs dark:border-amber-600 dark:bg-amber-950/80 dark:text-amber-50">
            <AlertTriangle className="size-4 text-amber-700 dark:text-amber-300" />
            <AlertTitle className="text-right text-sm font-extrabold text-amber-950 dark:text-amber-100">
              تنبيه هام حول التسجيل
            </AlertTitle>
            <AlertDescription className="text-right text-xs sm:text-sm font-semibold leading-relaxed !text-amber-950 dark:!text-amber-100">
              {SEASONAL_PRE_SUBMIT_NOTICE}
            </AlertDescription>
          </Alert>

          {pendingConfirm && (pendingConfirm.selectedItems.length > 0 || pendingConfirm.extraItems.length > 0) && (
            <div className="space-y-2 rounded-xl border border-border bg-muted/50 p-3.5 text-right text-xs">
              <p className="font-bold text-foreground">ملخص الخدمات المطلوبة:</p>
              <div className="space-y-1.5">
                {pendingConfirm.selectedItems.map(item => (
                  <div key={item.service} className="flex flex-wrap items-center justify-start gap-2 text-right text-foreground">
                    <span className="font-semibold text-foreground">{item.label}:</span>
                    <span className="font-bold text-primary tabular-nums">
                      {displayQuantity(item.service, item.requested)} {item.unit}
                    </span>
                  </div>
                ))}
                {pendingConfirm.extraItems.map(item => (
                  <div key={item.id} className="flex flex-wrap items-center justify-start gap-2 text-right text-foreground">
                    <span className="font-semibold text-foreground">خدمة إضافية ({item.title}):</span>
                    <span className="font-bold text-primary tabular-nums">
                      {item.quantity} {item.unit}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {pendingConfirm && pendingConfirm.exceeded.length > 0 && (
            <div className="space-y-2 rounded-xl border-2 border-amber-300 bg-amber-50 p-3.5 text-right text-xs text-amber-950 dark:border-amber-700 dark:bg-amber-950/70 dark:text-amber-100">
              <p className="font-semibold">
                علمًا أن الحد الأقصى المسموح به للمسجد للخدمات التالية هو:
              </p>
              {pendingConfirm.exceeded.map(item => (
                <div key={item.service} className="flex flex-wrap items-center justify-start gap-x-2 gap-y-1 text-right">
                  <span className="font-bold">{item.label}:</span>
                  <span>
                    المطلوب: <strong className="tabular-nums">{displayQuantity(item.service, item.requested)} {item.unit}</strong> · الحد الأقصى للمسجد:{" "}
                    <strong className="tabular-nums">{displayQuantity(item.service, item.ceiling)} {item.unit}</strong>
                  </span>
                </div>
              ))}
            </div>
          )}

          <DialogFooter className="flex-col-reverse sm:flex-row sm:flex-wrap items-stretch sm:items-center justify-start sm:justify-start gap-2 pt-2 [&>button]:w-full sm:[&>button]:w-auto">
            <Button
              type="button"
              disabled={submit.isPending}
              onClick={() => void handleConfirmSubmit()}
              className="gap-2 rounded-xl font-bold shadow-sm cursor-pointer"
            >
              {submit.isPending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
              <span>{submit.isPending ? "جارٍ إرسال الطلب…" : "تأكيد وإرسال الطلب"}</span>
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={submit.isPending}
              onClick={() => setPendingConfirm(null)}
              className="rounded-xl font-semibold cursor-pointer"
            >
              مراجعة وتعديل
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </form>
  );
}
