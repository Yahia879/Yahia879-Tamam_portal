import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowRight, Building2, MapPin, Save, User, AlertCircle, Sparkles, CheckCircle2, ChevronLeft } from "lucide-react";
import { Link, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { LocationPicker } from "@/components/LocationPicker";
import { useAuth } from "@/_core/hooks/useAuth";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import BeneficiaryLayout from "@/components/BeneficiaryLayout";

const mosqueTypes = [
  { value: "jami", label: "جامع" },
  { value: "masjid", label: "مسجد" },
  { value: "musalla", label: "مصلى" },
];

const CITY_COORDINATES: Record<string, { lat: number; lng: number; region: string }> = {
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

export default function RequesterMosqueForm() {
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const [formData, setFormData] = useState({
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
    capacity: "",
    hasPrayerHall: false,
    womenPrayerCapacity: "",
    womenPrayerArea: "",
    womenPrayerNotes: "",
    mosqueAge: "",
    description: "",
  });

  const { data: allCategories = [] } = trpc.categories.getAllCategories.useQuery();
  const availableCities = allCategories.filter((c: any) => c.type === "city").map((c: any) => c.nameAr);

  // التحقق من وجود طلب مسجد سابق
  const { data: existingMosques } = trpc.mosques.getMyMosques.useQuery(
    undefined,
    { enabled: !!user?.id }
  );

  const mosqueList = Array.isArray(existingMosques)
    ? existingMosques
    : (Array.isArray(existingMosques?.mosques) ? existingMosques.mosques : []);
  const hasExistingMosque = mosqueList.length > 0;
  const exemptionsGranted = user?.mosqueExemptions || 0;
  const pendingMosquesCount = mosqueList.filter((m: any) => m.approvalStatus === 'pending').length;
  const canRegisterMore = pendingMosquesCount < (1 + exemptionsGranted);

  const createMutation = trpc.mosques.create.useMutation({
    onSuccess: () => {
      toast.success("تم إرسال طلب تسجيل المسجد بنجاح. سيتم مراجعته من قبل الجمعية.");
      navigate("/my-mosques");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleChange = (field: string, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleLocationChange = (location: { lat: number; lng: number; address?: string; region?: string; city?: string; district?: string }) => {
    const detectedCity = location.city || "";
    const cityExists = availableCities.includes(detectedCity);

    setFormData((prev) => ({
      ...prev,
      latitude: location.lat.toString(),
      longitude: location.lng.toString(),
      address: location.address || prev.address,
      governorate: location.region || prev.governorate,
      city: cityExists ? detectedCity : prev.city,
      district: location.district || prev.district,
    }));
  };

  const handleCityChange = async (value: string) => {
    handleChange("city", value);
    const coords = CITY_COORDINATES[value];
    if (coords) {
      setFormData((prev) => ({
        ...prev,
        latitude: coords.lat.toString(),
        longitude: coords.lng.toString(),
        governorate: coords.region,
      }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.city || !formData.mosqueType || !formData.area || !formData.capacity) {
      toast.error("يرجى ملء كافة الحقول المطلوبة للمسجد (الاسم، المدينة، النوع، المساحة، السعة)");
      return;
    }

    if (!formData.latitude || !formData.longitude) {
      toast.error("يرجى تحديد موقع المسجد على الخريطة");
      return;
    }

    if (!canRegisterMore) {
      toast.error("لا يمكنك تقديم أكثر من طلب تسجيل مسجد واحد. يرجى التواصل مع الإدارة للحصول على استثناء.");
      return;
    }

    let finalNotes = formData.description || "";
    if (formData.hasPrayerHall) {
      const womenDetails = `\n\n[معلومات مصلى النساء]:\n- السعة: ${formData.womenPrayerCapacity ? formData.womenPrayerCapacity + " مصلية" : "غير محدد"}\n- المساحة: ${formData.womenPrayerArea ? formData.womenPrayerArea + " م²" : "غير محدد"}\n- ملاحظات: ${formData.womenPrayerNotes || "لا يوجد"}`;
      finalNotes += womenDetails;
    }

    createMutation.mutate({
      name: formData.name,
      mosqueType: formData.mosqueType || undefined,
      city: formData.city,
      governorate: formData.governorate || undefined,
      center: formData.center || undefined,
      district: formData.district || undefined,
      area: formData.area ? parseFloat(formData.area) : undefined,
      address: formData.address || undefined,
      latitude: formData.latitude ? parseFloat(formData.latitude) : undefined,
      longitude: formData.longitude ? parseFloat(formData.longitude) : undefined,
      capacity: formData.capacity ? parseInt(formData.capacity) : undefined,
      hasPrayerHall: formData.hasPrayerHall,
      mosqueAge: formData.mosqueAge ? parseInt(formData.mosqueAge) : undefined,
      notes: finalNotes || undefined,
    });
  };

  if (hasExistingMosque && !canRegisterMore) {
    return (
      <BeneficiaryLayout
        activeTab="mosques"
        title="تسجيل مسجد جديد"
        backUrl="/my-mosques"
        backLabel="العودة لمساجدي"
      >
        <div className="max-w-2xl mx-auto space-y-6 text-center py-8">
          <Alert variant="destructive" className="border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300 rounded-3xl p-6 text-right">
            <AlertCircle className="h-6 w-6 shrink-0 mt-0.5 text-red-600" />
            <div className="mr-3 space-y-1">
              <AlertTitle className="text-base font-bold">لا يمكن تقديم طلب تسجيل مسجد جديد حالياً</AlertTitle>
              <AlertDescription className="text-xs sm:text-sm leading-relaxed">
                لديك طلب تسجيل مسجد قيد المعالجة. يُسمح بتسجيل مسجد واحد فقط بحسابك، إلا إذا تم منحك استثناء خاصاً من إدارة الجمعية.
              </AlertDescription>
            </div>
          </Alert>

          <Link href="/my-mosques">
            <Button className="rounded-2xl gradient-primary text-white font-bold px-8 h-11 shadow-md">
              العودة لقائمة المساجد
            </Button>
          </Link>
        </div>
      </BeneficiaryLayout>
    );
  }

  return (
    <BeneficiaryLayout
      activeTab="mosques"
      title="تسجيل مسجد جديد"
      subtitle="إدخال البيانات الأساسية والمكانية للمسجد المراد تسجيله في المنصة"
      backUrl="/my-mosques"
      backLabel="العودة لمساجدي"
    >
      <form onSubmit={handleSubmit} className="max-w-4xl mx-auto space-y-8">
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
                  onChange={(e) => handleChange("name", e.target.value)}
                  className="rounded-2xl h-11 border-border/60 text-xs"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-bold">
                  نوع المسجد <span className="text-rose-500 font-bold mr-0.5">*</span>
                </Label>
                <Select value={formData.mosqueType} onValueChange={(val) => handleChange("mosqueType", val)}>
                  <SelectTrigger className="rounded-2xl h-11 border-border/60 text-xs">
                    <SelectValue placeholder="اختر النوع (جامع، مسجد...)" />
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl">
                    {mosqueTypes.map((t) => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-bold">
                  مساحة المسجد الإجمالية (م²) <span className="text-rose-500 font-bold mr-0.5">*</span>
                </Label>
                <Input
                  type="number"
                  placeholder="مثال: 500"
                  value={formData.area}
                  onChange={(e) => handleChange("area", e.target.value)}
                  className="rounded-2xl h-11 border-border/60 text-xs"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-bold">
                  سعة المصلين التقريبية (عدد الأشخاص) <span className="text-rose-500 font-bold mr-0.5">*</span>
                </Label>
                <Input
                  type="number"
                  placeholder="مثال: 400"
                  value={formData.capacity}
                  onChange={(e) => handleChange("capacity", e.target.value)}
                  className="rounded-2xl h-11 border-border/60 text-xs"
                  required
                />
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
                <Select value={formData.city} onValueChange={handleCityChange}>
                  <SelectTrigger className="rounded-2xl h-11 border-border/60 text-xs">
                    <SelectValue placeholder="اختر المدينة" />
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl">
                    {(availableCities.length > 0 ? availableCities : Object.keys(CITY_COORDINATES)).map((city: string) => (
                      <SelectItem key={city} value={city}>{city}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-bold">الحي</Label>
                <Input
                  placeholder="اسم الحي..."
                  value={formData.district}
                  onChange={(e) => handleChange("district", e.target.value)}
                  className="rounded-2xl h-11 border-border/60 text-xs"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-bold">العنوان أو الوصف المباشر</Label>
                <Input
                  placeholder="شارع الملك عبدالعزيز..."
                  value={formData.address}
                  onChange={(e) => handleChange("address", e.target.value)}
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
                <LocationPicker
                  value={{
                    lat: formData.latitude ? parseFloat(formData.latitude) : 18.2164,
                    lng: formData.longitude ? parseFloat(formData.longitude) : 42.5053,
                  }}
                  onChange={handleLocationChange}
                />
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
              onClick={() => {
                const isChecked = !formData.hasPrayerHall;
                setFormData((prev) => ({
                  ...prev,
                  hasPrayerHall: isChecked,
                  ...(isChecked ? {} : { womenPrayerArea: "", womenPrayerCapacity: "", womenPrayerNotes: "" }),
                }));
              }}
              className={`p-4 sm:p-5 rounded-2xl border-2 transition-all cursor-pointer flex items-center justify-between gap-4 select-none ${
                formData.hasPrayerHall
                  ? 'border-primary bg-primary/5 dark:bg-primary/10 shadow-xs ring-2 ring-primary/20'
                  : 'border-border/60 bg-muted/20 hover:bg-muted/40'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${
                  formData.hasPrayerHall ? 'bg-primary text-white' : 'bg-muted text-muted-foreground'
                }`}>
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-bold text-xs sm:text-sm text-foreground">هل يتضمن المسجد مصلى للنساء؟</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">حدد إذا كان المسجد يشمل قسماً مخصصاً لمصلى النساء</p>
                </div>
              </div>
              <Checkbox
                id="hasPrayerHall"
                checked={!!formData.hasPrayerHall}
                className="h-5 w-5 rounded-md data-[state=checked]:bg-primary"
              />
            </div>

            {formData.hasPrayerHall && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 rounded-2xl bg-primary/5 border border-primary/20">
                <div className="space-y-2">
                  <Label className="text-xs font-bold">سعة مصلى النساء (عدد المصليات)</Label>
                  <Input
                    type="number"
                    placeholder="مثال: 100"
                    value={formData.womenPrayerCapacity}
                    onChange={(e) => handleChange("womenPrayerCapacity", e.target.value)}
                    className="rounded-2xl h-11 border-border/60 text-xs bg-background"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-bold">مساحة مصلى النساء (م²)</Label>
                  <Input
                    type="number"
                    placeholder="مثال: 120"
                    value={formData.womenPrayerArea}
                    onChange={(e) => handleChange("womenPrayerArea", e.target.value)}
                    className="rounded-2xl h-11 border-border/60 text-xs bg-background"
                  />
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label className="text-xs font-bold">ملاحظات أو مواصفات خاصة للمسجد</Label>
              <Textarea
                placeholder="أضف أي تفاصيل أو متطلبات خاصة بالمسجد..."
                value={formData.description}
                onChange={(e) => handleChange("description", e.target.value)}
                className="rounded-2xl border-border/60 text-xs min-h-[100px]"
              />
            </div>
          </CardContent>
        </Card>

        {/* Submit Actions */}
        <div className="flex items-center justify-end gap-4 pt-4">
          <Link href="/my-mosques">
            <Button type="button" variant="outline" className="rounded-2xl font-bold px-6 h-12">
              إلغاء
            </Button>
          </Link>

          <Button
            type="submit"
            disabled={createMutation.isPending}
            className="rounded-2xl gradient-primary text-white font-bold px-10 h-12 shadow-lg gap-2"
          >
            {createMutation.isPending ? (
              <span>جاري إرسال الطلب...</span>
            ) : (
              <>
                <Save className="w-5 h-5" />
                <span>إرسال طلب تسجيل المسجد</span>
              </>
            )}
          </Button>
        </div>
      </form>
    </BeneficiaryLayout>
  );
}
