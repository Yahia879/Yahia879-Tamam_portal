import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Building2, MapPin, Save, Sparkles, Check, Users, Ruler } from "lucide-react";
import { Link } from "wouter";
import { LocationPicker } from "@/components/LocationPicker";

export const MOSQUE_TYPES = [
  { value: "jami", label: "جامع" },
  { value: "masjid", label: "مسجد" },
  { value: "musalla", label: "مصلى" },
];

export const CITY_COORDINATES: Record<string, { lat: number; lng: number; region: string }> = {
  "أبها": { lat: 18.2164, lng: 42.5053, region: "عسير" },
  "خميس مشيط": { lat: 18.3012, lng: 42.7308, region: "عسير" },
  "الرياض": { lat: 24.7136, lng: 46.6753, region: "الرياض" },
  "جدة": { lat: 21.5433, lng: 39.1728, region: "مكة المكرمة" },
  "مكة المكرمة": { lat: 21.4225, lng: 39.8262, region: "مكة المكرمة" },
  "المدينة المنورة": { lat: 24.4672, lng: 39.6111, region: "المدينة المنورة" },
  "الدمام": { lat: 26.4207, lng: 50.0888, region: "المنطقة الشرقية" },
  "الخبر": { lat: 26.2172, lng: 50.1971, region: "المنطقة الشرقية" },
  "الجبيل": { lat: 27.0112, lng: 49.6582, region: "المنطقة الشرقية" },
  "الهفوف": { lat: 25.3789, lng: 49.5878, region: "المنطقة الشرقية" },
  "الطائف": { lat: 21.2854, lng: 40.4164, region: "مكة المكرمة" },
  "تبوك": { lat: 28.3835, lng: 36.5662, region: "تبوك" },
  "بريدة": { lat: 26.3260, lng: 43.9750, region: "القصيم" },
  "حائل": { lat: 27.5219, lng: 41.6961, region: "حائل" },
  "نجران": { lat: 17.5656, lng: 44.2289, region: "نجران" },
  "جازان": { lat: 16.8892, lng: 42.5511, region: "جازان" },
  "الباحة": { lat: 20.0129, lng: 41.4677, region: "الباحة" },
  "عرعر": { lat: 30.9753, lng: 41.0381, region: "الحدود الشمالية" },
  "الجوف": { lat: 29.9539, lng: 40.2064, region: "الجوف" },
  "ينبع": { lat: 24.0891, lng: 38.0637, region: "المدينة المنورة" },
};

export interface MosqueFormState {
  name: string;
  mosqueType: string;
  city: string;
  governorate: string;
  center: string;
  district: string;
  address: string;
  latitude: string;
  longitude: string;
  area: string;
  menLengthM: string;
  menWidthM: string;
  capacity: string;
  hasPrayerHall: boolean;
  womenPrayerCapacity: string;
  womenPrayerArea: string;
  womenLengthM: string;
  womenWidthM: string;
  womenPrayerNotes: string;
  mosqueAge: string;
  description: string;
}

export const INITIAL_MOSQUE_FORM_STATE: MosqueFormState = {
  name: "",
  mosqueType: "",
  city: "أبها",
  governorate: "عسير",
  center: "",
  district: "",
  address: "",
  latitude: "",
  longitude: "",
  area: "",
  menLengthM: "",
  menWidthM: "",
  capacity: "",
  hasPrayerHall: false,
  womenPrayerCapacity: "",
  womenPrayerArea: "",
  womenLengthM: "",
  womenWidthM: "",
  womenPrayerNotes: "",
  mosqueAge: "",
  description: "",
};

/**
 * Computes auto-calculated area strings from length and width inputs in meters.
 */
export function applyMosqueFormChange(
  prev: MosqueFormState,
  field: keyof MosqueFormState,
  value: string | boolean
): MosqueFormState {
  // Area fields are derived exclusively from length × width.
  if (field === "area" || field === "womenPrayerArea") {
    return prev;
  }

  const next = { ...prev, [field]: value };

  if (field === "menLengthM" || field === "menWidthM") {
    const l = parseFloat(field === "menLengthM" ? String(value) : prev.menLengthM);
    const w = parseFloat(field === "menWidthM" ? String(value) : prev.menWidthM);
    next.area =
      Number.isFinite(l) && l > 0 && Number.isFinite(w) && w > 0
        ? Number((l * w).toFixed(2)).toString()
        : "";
  }

  if (field === "womenLengthM" || field === "womenWidthM") {
    const l = parseFloat(field === "womenLengthM" ? String(value) : prev.womenLengthM);
    const w = parseFloat(field === "womenWidthM" ? String(value) : prev.womenWidthM);
    next.womenPrayerArea =
      Number.isFinite(l) && l > 0 && Number.isFinite(w) && w > 0
        ? Number((l * w).toFixed(2)).toString()
        : "";
  }

  return next;
}

export interface MosqueLocationValue {
  lat: number;
  lng: number;
  address?: string;
  region?: string;
  city?: string;
  district?: string;
}

interface MosqueFormFieldsProps {
  formData: MosqueFormState;
  errors?: Record<string, string>;
  availableCities: string[];
  locationValue: { lat: number; lng: number };
  onFieldChange: (field: keyof MosqueFormState, value: string | boolean) => void;
  onCityChange: (city: string) => void;
  onLocationChange: (location: MosqueLocationValue) => void;
  onTogglePrayerHall: () => void;
  onSubmit: (e: React.FormEvent) => void;
  cancelHref: string;
  submitLabel: string;
  submittingLabel: string;
  isSubmitting: boolean;
  disableSubmit?: boolean;
}

/**
 * Shared 3-step mosque registration/edit form layout used by both requester and dashboard portals.
 */
export function MosqueFormFields({
  formData,
  errors,
  availableCities,
  locationValue,
  onFieldChange,
  onCityChange,
  onLocationChange,
  onTogglePrayerHall,
  onSubmit,
  cancelHref,
  submitLabel,
  submittingLabel,
  isSubmitting,
  disableSubmit = false,
}: MosqueFormFieldsProps) {
  const cityOptions = availableCities.length > 0 ? availableCities : Object.keys(CITY_COORDINATES);

  return (
    <form onSubmit={onSubmit} className="max-w-4xl mx-auto space-y-8">
      {/* Step 1: Basic Mosque Info */}
      <Card className="border border-border/60 shadow-xs rounded-3xl overflow-hidden bg-background">
        <CardHeader className="p-6 border-b border-border/40 bg-muted/30">
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg font-bold">
            <Building2 className="w-5 h-5 text-primary" />
            <span>1. البيانات الأساسية للمسجد</span>
          </CardTitle>
          <CardDescription className="text-xs">
            حدد اسم المسجد ونوعه وسعته الإجمالية للمصلين
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label className="text-xs font-bold">
                اسم المسجد <span className="text-rose-500 font-bold mr-0.5">*</span>
              </Label>
              <Input
                placeholder="مثال: جامع الملك فهد"
                value={formData.name}
                onChange={(e) => onFieldChange("name", e.target.value)}
                className="rounded-2xl h-11 border-border/60 text-xs"
                required
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold">
                نوع المسجد <span className="text-rose-500 font-bold mr-0.5">*</span>
              </Label>
              <Select
                key={formData.mosqueType}
                value={formData.mosqueType || undefined}
                onValueChange={(val) => onFieldChange("mosqueType", val)}
              >
                <SelectTrigger className="rounded-2xl h-11 border-border/60 text-xs">
                  <SelectValue placeholder="اختر النوع (جامع، مسجد...)" />
                </SelectTrigger>
                <SelectContent className="rounded-2xl">
                  {MOSQUE_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label className="text-xs font-bold">
                سعة المصلين التقريبية (عدد الأشخاص) <span className="text-rose-500 font-bold mr-0.5">*</span>
              </Label>
              <Input
                type="number"
                placeholder="مثال: 400"
                value={formData.capacity}
                onChange={(e) => onFieldChange("capacity", e.target.value)}
                className="rounded-2xl h-11 border-border/60 text-xs"
                required
              />
            </div>

            <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="menLengthM" className="text-xs font-bold">
                  الطول بالمتر <span className="text-rose-500 font-bold mr-0.5">*</span>
                </Label>
                <Input
                  id="menLengthM"
                  type="number"
                  min="0.01"
                  max="1000"
                  step="0.01"
                  placeholder="مثال: 20"
                  value={formData.menLengthM}
                  onChange={(e) => onFieldChange("menLengthM", e.target.value)}
                  className="rounded-2xl h-11 border-border/60 text-xs tabular-nums"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="menWidthM" className="text-xs font-bold">
                  العرض بالمتر <span className="text-rose-500 font-bold mr-0.5">*</span>
                </Label>
                <Input
                  id="menWidthM"
                  type="number"
                  min="0.01"
                  max="1000"
                  step="0.01"
                  placeholder="مثال: 15"
                  value={formData.menWidthM}
                  onChange={(e) => onFieldChange("menWidthM", e.target.value)}
                  className="rounded-2xl h-11 border-border/60 text-xs tabular-nums"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="area" className="text-xs font-bold">
                  مساحة المسجد الإجمالية (م²) <span className="text-rose-500 font-bold mr-0.5">*</span>
                </Label>
                <Input
                  id="area"
                  type="number"
                  step="0.01"
                  readOnly
                  tabIndex={-1}
                  placeholder="تُحسب تلقائياً من الطول × العرض"
                  value={formData.area}
                  className={`rounded-2xl h-11 border-border/60 text-xs tabular-nums bg-muted/50 cursor-not-allowed ${
                    errors?.area ? "border-red-500 focus-visible:ring-red-500" : ""
                  }`}
                />
                {errors?.area && (
                  <p className="text-[11px] sm:text-xs text-red-500">{errors.area}</p>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Step 2: Location & Region */}
      <Card className="border border-border/60 shadow-xs rounded-3xl overflow-hidden bg-background">
        <CardHeader className="p-6 border-b border-border/40 bg-muted/30">
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg font-bold">
            <MapPin className="w-5 h-5 text-primary" />
            <span>2. الموقع الجغرافي والعنوان</span>
          </CardTitle>
          <CardDescription className="text-xs">
            حدد المدينة والحي وموقع المسجد التفاعلي على الخريطة
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <Label className="text-xs font-bold">
                المدينة <span className="text-rose-500 font-bold mr-0.5">*</span>
              </Label>
              <Select key={formData.city} value={formData.city} onValueChange={onCityChange}>
                <SelectTrigger className="rounded-2xl h-11 border-border/60 text-xs">
                  <SelectValue placeholder="اختر المدينة" />
                </SelectTrigger>
                <SelectContent className="rounded-2xl max-h-[300px]">
                  {cityOptions.map((city: string) => (
                    <SelectItem key={city} value={city}>
                      {city}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold">الحي</Label>
              <Input
                placeholder="اسم الحي..."
                value={formData.district}
                onChange={(e) => onFieldChange("district", e.target.value)}
                className="rounded-2xl h-11 border-border/60 text-xs"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold">العنوان أو الوصف المباشر</Label>
              <Input
                placeholder="شارع الملك عبدالعزيز..."
                value={formData.address}
                onChange={(e) => onFieldChange("address", e.target.value)}
                className="rounded-2xl h-11 border-border/60 text-xs"
              />
            </div>
          </div>

          <div className="space-y-2 pt-2">
            <Label className="text-xs font-bold flex items-center justify-between">
              <span>
                تحديد الموقع الإحداثي على الخريطة <span className="text-rose-500 font-bold mr-0.5">*</span>
              </span>
              {formData.latitude && (
                <span className="text-[11px] sm:text-xs text-emerald-600 dark:text-emerald-400 font-bold font-sans flex items-center gap-1">
                  ✓ تم التحديد على الخريطة
                </span>
              )}
            </Label>
            <div className="rounded-3xl border border-border/60 overflow-hidden shadow-xs">
              <LocationPicker value={locationValue} onChange={onLocationChange} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Step 3: Women Prayer Hall & Additional Specs */}
      <Card className="border border-border/60 shadow-xs rounded-3xl overflow-hidden bg-background">
        <CardHeader className="p-6 border-b border-border/40 bg-muted/30">
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg font-bold">
            <Sparkles className="w-5 h-5 text-primary" />
            <span>3. مصلى النساء والتفاصيل الإضافية</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-6">
          <div
            onClick={onTogglePrayerHall}
            className={`p-4 sm:p-5 rounded-2xl border-2 transition-all cursor-pointer flex items-center justify-between gap-4 select-none ${
              formData.hasPrayerHall
                ? "border-primary bg-primary/5 dark:bg-primary/10 shadow-xs ring-2 ring-primary/20"
                : "border-border/60 bg-muted/20 hover:bg-muted/40"
            }`}
          >
            <div className="flex items-center gap-3">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${
                  formData.hasPrayerHall ? "bg-primary text-white" : "bg-muted text-muted-foreground"
                }`}
              >
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <p className="font-bold text-xs sm:text-sm text-foreground">هل يتضمن المشروع مصلى للنساء؟</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  حدد إذا المسجد يشمل قسماً مخصصاً لمصلى النساء
                </p>
              </div>
            </div>
            <div
              className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all shrink-0 ${
                formData.hasPrayerHall
                  ? "bg-primary border-primary text-white shadow-xs"
                  : "border-input bg-background dark:bg-input/30"
              }`}
            >
              {formData.hasPrayerHall && <Check className="w-3.5 h-3.5 stroke-[3]" />}
            </div>
          </div>

          {formData.hasPrayerHall && (
            <div className="p-4 sm:p-5 border border-primary/20 rounded-2xl bg-primary/5 space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
              <h4 className="font-bold text-xs sm:text-sm text-primary flex items-center gap-2 border-b border-primary/10 pb-2.5">
                <Building2 className="w-4 h-4" />
                <span>بيانات مصلى النساء</span>
              </h4>
              <div className="space-y-4">
                <div className="space-y-2">
                  <label
                    htmlFor="womenPrayerCapacity"
                    className="text-xs sm:text-sm font-bold text-foreground flex items-center gap-1.5"
                  >
                    <Users className="w-4 h-4 text-primary/70" />
                    <span>سعة مصلى النساء (مصلي)</span>
                    <span className="text-rose-500 font-bold">*</span>
                  </label>
                  <Input
                    id="womenPrayerCapacity"
                    type="number"
                    placeholder="مثال: 50"
                    value={formData.womenPrayerCapacity}
                    onChange={(e) => onFieldChange("womenPrayerCapacity", e.target.value)}
                    className="h-11 rounded-xl text-xs sm:text-sm bg-background border-border/80"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <label
                      htmlFor="womenLengthM"
                      className="text-xs sm:text-sm font-bold text-foreground flex items-center gap-1.5"
                    >
                      <Ruler className="w-4 h-4 text-primary/70" />
                      <span>الطول بالمتر</span>
                      <span className="text-rose-500 font-bold">*</span>
                    </label>
                    <Input
                      id="womenLengthM"
                      type="number"
                      min="0.01"
                      max="1000"
                      step="0.01"
                      placeholder="مثال: 10"
                      value={formData.womenLengthM}
                      onChange={(e) => onFieldChange("womenLengthM", e.target.value)}
                      className="h-11 rounded-xl text-xs sm:text-sm bg-background border-border/80 tabular-nums"
                    />
                  </div>

                  <div className="space-y-2">
                    <label
                      htmlFor="womenWidthM"
                      className="text-xs sm:text-sm font-bold text-foreground flex items-center gap-1.5"
                    >
                      <Ruler className="w-4 h-4 text-primary/70" />
                      <span>العرض بالمتر</span>
                      <span className="text-rose-500 font-bold">*</span>
                    </label>
                    <Input
                      id="womenWidthM"
                      type="number"
                      min="0.01"
                      max="1000"
                      step="0.01"
                      placeholder="مثال: 8"
                      value={formData.womenWidthM}
                      onChange={(e) => onFieldChange("womenWidthM", e.target.value)}
                      className="h-11 rounded-xl text-xs sm:text-sm bg-background border-border/80 tabular-nums"
                    />
                  </div>

                  <div className="space-y-2">
                    <label
                      htmlFor="womenPrayerArea"
                      className="text-xs sm:text-sm font-bold text-foreground flex items-center gap-1.5"
                    >
                      <Ruler className="w-4 h-4 text-primary/70" />
                      <span>المساحة (م²)</span>
                      <span className="text-rose-500 font-bold">*</span>
                    </label>
                    <Input
                      id="womenPrayerArea"
                      type="number"
                      step="0.01"
                      readOnly
                      tabIndex={-1}
                      placeholder="تُحسب تلقائياً من الطول × العرض"
                      value={formData.womenPrayerArea}
                      className="h-11 rounded-xl text-xs sm:text-sm bg-muted/50 border-border/80 tabular-nums cursor-not-allowed"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label className="text-xs font-bold">ملاحظات أو مواصفات خاصة للمسجد</Label>
            <Textarea
              placeholder="أضف أي تفاصيل أو متطلبات خاصة بالمسجد..."
              value={formData.description}
              onChange={(e) => onFieldChange("description", e.target.value)}
              className="rounded-2xl border-border/60 text-xs min-h-[100px]"
            />
          </div>
        </CardContent>
      </Card>

      {/* Submit Actions */}
      <div className="flex items-center justify-between sm:justify-end gap-2 sm:gap-4 pt-4 px-3 sm:px-0 w-full">
        <Link href={cancelHref}>
          <Button
            type="button"
            variant="outline"
            className="rounded-2xl font-bold px-4 sm:px-6 h-11 sm:h-12 text-xs sm:text-sm cursor-pointer"
          >
            إلغاء
          </Button>
        </Link>

        <Button
          type="submit"
          disabled={isSubmitting || disableSubmit}
          className="rounded-2xl gradient-primary text-white font-bold px-4 sm:px-10 h-11 sm:h-12 shadow-lg gap-1.5 sm:gap-2 text-xs sm:text-sm cursor-pointer"
        >
          {isSubmitting ? (
            <span>{submittingLabel}</span>
          ) : (
            <>
              <Save className="w-4 h-4 sm:w-5 sm:h-5" />
              <span>{submitLabel}</span>
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
