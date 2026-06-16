import { useState, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowRight, Building2, MapPin, Save, User, AlertCircle, Send } from "lucide-react";
import { Link, useLocation, useParams } from "wouter";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { LocationPicker } from "@/components/LocationPicker";
import { useAuth } from "@/_core/hooks/useAuth";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";

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
  "ينبع": { lat: 24.0891, lng: 38.0637, region: "المدينة المنورة" }
};



// ترجمة صفة طالب الخدمة
const getRequesterTypeLabel = (type: string | null | undefined) => {
  const types: Record<string, string> = {
    imam: "إمام المسجد",
    muezzin: "مؤذن المسجد",
    board_member: "عضو مجلس إدارة",
    committee_member: "عضو لجنة",
    volunteer: "متطوع",
    donor: "متبرع",
  };
  return types[type || ""] || type || "غير محدد";
};

export default function MosqueForm() {
  const params = useParams<{ id: string }>();
  const mosqueId = params.id ? parseInt(params.id) : null;
  const isEdit = !!mosqueId;
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    name: "",
    mosqueType: "",
    city: "أبها",
    governorate: "عسير", // Default to Asir region
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

  const [errors, setErrors] = useState<Record<string, string>>({});

  const { data: allCategories = [] } = trpc.categories.getAllCategories.useQuery();
  const availableCities = allCategories.filter((c: any) => c.type === "city").map((c: any) => c.nameAr);

  // جلب بيانات المسجد في حالة التعديل
  const { data: mosque, isLoading: loadingMosque } = trpc.mosques.getById.useQuery(
    { id: mosqueId as number },
    { enabled: isEdit }
  );

  useEffect(() => {
    if (mosque) {
      let wCapacity = "";
      let wArea = "";
      let wNotes = "";
      let mainDescription = mosque.notes || "";
      
      if (mosque.notes && mosque.notes.includes("[معلومات مصلى النساء]:")) {
        const parts = mosque.notes.split("[معلومات مصلى النساء]:");
        mainDescription = parts[0].trim();
        const details = parts[1];
        
        const capacityMatch = details.match(/- السعة:\s*([^\n]+)/);
        const areaMatch = details.match(/- المساحة:\s*([^\n]+)/);
        const notesMatch = details.match(/- ملاحظات إضافية:\s*([^\n]+)/);
        
        if (capacityMatch) {
          wCapacity = capacityMatch[1].replace(" مصلية", "").replace("غير حدد", "").replace("غير محدد", "").trim();
        }
        if (areaMatch) {
          wArea = areaMatch[1].replace(" م²", "").replace("غير حدد", "").replace("غير محدد", "").trim();
        }
        if (notesMatch) {
          wNotes = notesMatch[1].replace("لا يوجد", "").trim();
        }
      }

      setFormData({
        name: mosque.name || "",
        mosqueType: (mosque as any).mosqueType || "",
        city: mosque.city || "",
        governorate: mosque.governorate || "",
        center: mosque.center || "",
        district: mosque.district || "",
        address: mosque.address || "",
        latitude: mosque.latitude || "",
        longitude: mosque.longitude || "",
        area: mosque.area || "",
        capacity: mosque.capacity?.toString() || "",
        hasPrayerHall: mosque.hasPrayerHall || false,
        womenPrayerCapacity: wCapacity,
        womenPrayerArea: wArea,
        womenPrayerNotes: wNotes,
        mosqueAge: mosque.mosqueAge?.toString() || "",
        description: mainDescription,
      });
    }
  }, [mosque]);

  // التحقق من وجود طلب مسجد سابق
  const { data: existingMosques, isLoading: checkingMosques } = trpc.mosques.getMyMosques.useQuery(
    undefined,
    { enabled: !!user?.id && user?.role === "service_requester" && !isEdit }
  );

  const hasExistingMosque = existingMosques && existingMosques.length > 0;
  // التحقق من الاستثناءات الممنوحة
  const exemptionsGranted = user?.mosqueExemptions || 0;
  const pendingMosquesCount = existingMosques?.filter(m => m.approvalStatus === 'pending').length || 0;
  // يمكن للمستخدم تسجيل مسجد واحد مجاناً + عدد الاستثناءات
  const canRegisterMore = pendingMosquesCount < (1 + exemptionsGranted);

  const createMutation = trpc.mosques.create.useMutation({
    onSuccess: () => {
      toast.success("تم إرسال طلب تسجيل المسجد بنجاح. سيتم مراجعته من قبل الإدارة.");
      navigate("/mosques");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const updateMutation = trpc.mosques.update.useMutation({
    onSuccess: () => {
      toast.success("تم تحديث بيانات المسجد بنجاح");
      navigate(user?.role === "service_requester" ? "/my-mosques" : "/mosques");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleChange = (field: string, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (field === "area") {
      const val = value as string;
      if (!val) {
        setErrors((prev) => {
          const updated = { ...prev };
          delete updated.area;
          return updated;
        });
      } else {
        const areaNum = parseFloat(val);
        if (!isNaN(areaNum) && areaNum >= 10 && areaNum <= 10000) {
          setErrors((prev) => {
            const updated = { ...prev };
            delete updated.area;
            return updated;
          });
        }
      }
    }
  };

  const handleLocationChange = (location: { lat: number; lng: number; address?: string; region?: string; city?: string }) => {
    const detectedCity = location.city || "";
    const cityExists = availableCities.includes(detectedCity);

    setFormData((prev) => ({
      ...prev,
      latitude: location.lat.toString(),
      longitude: location.lng.toString(),
      address: location.address || prev.address,
      governorate: location.region || prev.governorate,
      city: cityExists ? detectedCity : prev.city,
    }));

    if (detectedCity && !cityExists) {
      toast.warning(`الموقع المحدد يتبع لـ "${detectedCity}"، وهي ليست ضمن القائمة المتاحة. يرجى اختيار المدينة يدوياً.`);
    }
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
    } else {
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?format=jsonv2&q=${encodeURIComponent(
            value + " السعودية"
          )}&accept-language=ar&addressdetails=1`
        );
        const data = await response.json();
        if (data && data.length > 0) {
          const firstResult = data[0];
          const addr = firstResult.address || {};
          const region = addr.state || addr.province || addr.region || "عسير";
          
          setFormData((prev) => ({
            ...prev,
            latitude: firstResult.lat,
            longitude: firstResult.lon,
            governorate: region,
          }));
        }
      } catch (error) {
        console.error("City search error:", error);
      }
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

    if (formData.hasPrayerHall && (!formData.womenPrayerCapacity || !formData.womenPrayerArea)) {
      toast.error("يرجى ملء الحقول المطلوبة لمصلى النساء (السعة والمساحة)");
      return;
    }

    const newErrors: Record<string, string> = {};
    if (formData.area) {
      const areaNum = parseFloat(formData.area);
      if (isNaN(areaNum) || areaNum < 10 || areaNum > 10000) {
        newErrors.area = "المساحة يجب أن تكون بين 10 و 10000 متر مربع";
      }
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      toast.error("يرجى تصحيح الأخطاء في النموذج");
      return;
    }

    setErrors({});

    // التحقق من عدم وجود طلب سابق (مع مراعاة الاستثناءات) - فقط عند الإضافة
    if (!isEdit && user?.role === "service_requester" && !canRegisterMore) {
      toast.error("لا يمكنك تقديم أكثر من طلب تسجيل مسجد واحد. يرجى التواصل مع الإدارة للحصول على استثناء.");
      return;
    }

    let finalNotes = formData.description || "";
    if (formData.hasPrayerHall) {
      const womenDetails = `\n\n[معلومات مصلى النساء]:\n- السعة: ${formData.womenPrayerCapacity ? formData.womenPrayerCapacity + " مصلية" : "غير محدد"}\n- المساحة: ${formData.womenPrayerArea ? formData.womenPrayerArea + " م²" : "غير محدد"}\n- ملاحظات إضافية: ${formData.womenPrayerNotes || "لا يوجد"}`;
      finalNotes += womenDetails;
    }

    const payload = {
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
    };

    if (isEdit) {
      updateMutation.mutate({ ...payload, id: mosqueId as number });
    } else {
      createMutation.mutate(payload);
    }
  };

  // إذا كان لديه طلب سابق ولا يملك استثناءات، عرض رسالة تنبيه - فقط عند الإضافة
  if (!isEdit && hasExistingMosque && user?.role === "service_requester" && !canRegisterMore) {
    return (
      <DashboardLayout>
        <div className="space-y-6 max-w-4xl mx-auto">
          <div className="flex items-center gap-4">
            <Link href="/requester/mosques">
              <Button variant="ghost" size="icon">
                <ArrowRight className="w-5 h-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-foreground">إضافة مسجد جديد</h1>
              <p className="text-muted-foreground">أدخل بيانات المسجد المراد إضافته</p>
            </div>
          </div>

          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>لا يمكن تقديم طلب جديد</AlertTitle>
            <AlertDescription>
              لديك طلب تسجيل مسجد سابق. لا يمكنك تقديم أكثر من طلب واحد إلا بعد الحصول على استثناء من الإدارة.
              <br />
              يرجى التواصل مع الإدارة إذا كنت بحاجة لتسجيل مسجد إضافي.
            </AlertDescription>
          </Alert>

          <div className="flex justify-end">
            <Link href="/requester/mosques">
              <Button variant="outline">العودة لقائمة المساجد</Button>
            </Link>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (loadingMosque || (isEdit && !mosque)) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-4xl mx-auto">
        {/* العنوان */}
        <div className="flex items-center gap-4">
          <Link href={user?.role === "service_requester" ? "/my-mosques" : "/mosques"}>
            <Button variant="ghost" size="icon">
              <ArrowRight className="w-5 h-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              {isEdit ? "تعديل بيانات المسجد" : "إضافة مسجد جديد"}
            </h1>
            <p className="text-muted-foreground">
              {isEdit ? "قم بتعديل بيانات المسجد الحالية" : "أدخل بيانات المسجد المراد إضافته"}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* بيانات مقدم الطلب - للقراءة فقط - تظهر فقط عند الإضافة للمستفيد */}
          {!isEdit && user?.role === "service_requester" && (
            <Card className="border-0 shadow-sm bg-muted/30">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="w-5 h-5" />
                  بيانات مقدم الطلب
                </CardTitle>
                <CardDescription>بياناتك كمقدم للطلب (غير قابلة للتعديل)</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <Label className="text-muted-foreground text-sm">الاسم</Label>
                    <p className="font-medium">{user?.name || "غير محدد"}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-sm">الصفة</Label>
                    <p className="font-medium">{getRequesterTypeLabel(user?.requesterType)}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-sm">رقم الجوال</Label>
                    <p className="font-medium" dir="ltr">{user?.phone || "غير محدد"}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-sm">البريد الإلكتروني</Label>
                    <p className="font-medium text-sm" dir="ltr">{user?.email || "غير محدد"}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* المعلومات الأساسية */}
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="w-5 h-5" />
                المعلومات الأساسية
              </CardTitle>
              <CardDescription>البيانات الرئيسية للمسجد</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>اسم المسجد *</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => handleChange("name", e.target.value)}
                    placeholder="مثال: مسجد الرحمة"
                    required
                  />
                </div>
                <div>
                  <Label>نوع المسجد *</Label>
                  <Select key={formData.mosqueType} value={formData.mosqueType || undefined} onValueChange={(v) => handleChange("mosqueType", v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="اختر النوع" />
                    </SelectTrigger>
                    <SelectContent>
                      {mosqueTypes.map((type) => (
                        <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="area">مساحة المسجد (م²) *</Label>
                  <Input
                    id="area"
                    type="number"
                    value={formData.area}
                    onChange={(e) => handleChange("area", e.target.value)}
                    placeholder="مثال: 500"
                    className={errors.area ? "border-red-500 focus-visible:ring-red-500" : ""}
                    required
                  />
                  {errors.area && (
                    <p className="text-[11px] sm:text-xs text-red-500">{errors.area}</p>
                  )}
                </div>
                <div>
                  <Label>عدد المصلين *</Label>
                  <Input
                    type="number"
                    value={formData.capacity}
                    onChange={(e) => handleChange("capacity", e.target.value)}
                    placeholder="مثال: 300"
                    required
                  />
                </div>
                <div>
                  <Label>عمر المسجد (بالسنوات)</Label>
                  <Input
                    type="number"
                    value={formData.mosqueAge}
                    onChange={(e) => handleChange("mosqueAge", e.target.value)}
                    placeholder="مثال: 15"
                  />
                </div>
                <div className="flex items-center gap-3 pt-6">
                  <Checkbox
                    id="hasPrayerHall"
                    checked={formData.hasPrayerHall}
                    onCheckedChange={(checked) => {
                      const isChecked = checked === true;
                      handleChange("hasPrayerHall", isChecked);
                      if (!isChecked) {
                        setFormData((prev) => ({
                          ...prev,
                          womenPrayerCapacity: "",
                          womenPrayerArea: "",
                          womenPrayerNotes: "",
                        }));
                      }
                    }}
                  />
                  <Label htmlFor="hasPrayerHall" className="cursor-pointer">هل يوجد مصلى نساء؟</Label>
                </div>
              </div>

              {formData.hasPrayerHall && (
                <div className="mt-4 p-4 border rounded-lg bg-muted/30 space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
                  <h4 className="font-semibold text-xs sm:text-sm text-primary flex items-center gap-1.5 border-b pb-2">
                    <Building2 className="w-4 h-4" />
                    معلومات مصلى النساء
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="womenPrayerCapacity" className="text-[11px] sm:text-xs">سعة مصلى النساء (مصلي) *</Label>
                      <Input
                        id="womenPrayerCapacity"
                        type="number"
                        value={formData.womenPrayerCapacity}
                        onChange={(e) => handleChange("womenPrayerCapacity", e.target.value)}
                        placeholder="مثال: 50"
                        className="h-9 sm:h-10 text-xs sm:text-sm bg-white"
                        required={formData.hasPrayerHall}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="womenPrayerArea" className="text-[11px] sm:text-xs">المساحة (م²) *</Label>
                      <Input
                        id="womenPrayerArea"
                        type="number"
                        value={formData.womenPrayerArea}
                        onChange={(e) => handleChange("womenPrayerArea", e.target.value)}
                        placeholder="مثال: 80"
                        className="h-9 sm:h-10 text-xs sm:text-sm bg-white"
                        required={formData.hasPrayerHall}
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="womenPrayerNotes" className="text-[11px] sm:text-xs">ملاحظات مصلى النساء</Label>
                    <Input
                      id="womenPrayerNotes"
                      type="text"
                      value={formData.womenPrayerNotes}
                      onChange={(e) => handleChange("womenPrayerNotes", e.target.value)}
                      placeholder="مثال: منفصل وله مدخل خاص ودورة مياه..."
                      className="h-9 sm:h-10 text-xs sm:text-sm bg-white"
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* الموقع على الخريطة */}
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="w-5 h-5" />
                الموقع الجغرافي
              </CardTitle>
              <CardDescription>حدد موقع المسجد على الخريطة بالنقر أو البحث</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* مكون اختيار الموقع */}
              <LocationPicker
                value={formData.latitude && formData.longitude ? {
                  lat: parseFloat(formData.latitude),
                  lng: parseFloat(formData.longitude)
                } : undefined}
                onChange={handleLocationChange}
              />

              {/* معلومات الموقع من الخريطة */}
              {(formData.latitude || formData.longitude || formData.address) && (
                <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg space-y-3">
                  <h4 className="font-semibold text-primary flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    معلومات الموقع من الخريطة
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-xs text-muted-foreground">خط العرض (Latitude)</Label>
                      <p className="font-mono text-sm bg-background px-3 py-2 rounded border">{formData.latitude || "-"}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">خط الطول (Longitude)</Label>
                      <p className="font-mono text-sm bg-background px-3 py-2 rounded border">{formData.longitude || "-"}</p>
                    </div>
                  </div>
                  {formData.address && (
                    <div>
                      <Label className="text-xs text-muted-foreground">العنوان من خرائط جوجل</Label>
                      <p className="text-sm bg-background px-3 py-2 rounded border">{formData.address}</p>
                    </div>
                  )}
                </div>
              )}

              {/* حقول الموقع اليدوية */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t">
                <div>
                  <Label>المدينة / المركز *</Label>
                  <Select key={formData.city} value={formData.city} onValueChange={handleCityChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="اختر المدينة أو المركز" />
                    </SelectTrigger>
                    <SelectContent className="max-h-[300px]">
                      {availableCities.map((location: string) => (
                        <SelectItem key={location} value={location}>{location}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>المنطقة</Label>
                  <Input
                    value={formData.governorate}
                    readOnly
                    className="bg-muted"
                  />
                </div>
                <div>
                  <Label>الحي</Label>
                  <Input
                    value={formData.district}
                    onChange={(e) => handleChange("district", e.target.value)}
                    placeholder="مثال: النسيم"
                  />
                </div>
              </div>
              <div>
                <Label>العنوان التفصيلي</Label>
                <Textarea
                  value={formData.address}
                  onChange={(e) => handleChange("address", e.target.value)}
                  placeholder="العنوان التفصيلي للمسجد..."
                  rows={2}
                />
              </div>
            </CardContent>
          </Card>

          {/* ملاحظة للموافقة */}
          {!isEdit && user?.role === "service_requester" && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>ملاحظة هامة</AlertTitle>
              <AlertDescription>
                سيتم مراجعة طلب تسجيل المسجد من قبل الإدارة قبل اعتماده. ستصلك إشعار عند الموافقة على الطلب.
              </AlertDescription>
            </Alert>
          )}

          {/* زر الحفظ */}
          <div className="flex justify-end gap-4">
            <Link href={user?.role === "service_requester" ? "/my-mosques" : "/mosques"}>
              <Button type="button" variant="outline">إلغاء</Button>
            </Link>
            <Button 
              type="submit" 
              className="gradient-primary text-white"
              disabled={createMutation.isPending || updateMutation.isPending || checkingMosques}
            >
              {createMutation.isPending || updateMutation.isPending ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin ml-2" />
                  جاري الحفظ...
                </>
              ) : isEdit ? (
                <>
                  <Save className="w-4 h-4 ml-2" />
                  حفظ التعديلات
                </>
              ) : user?.role === "service_requester" ? (
                <>
                  <Send className="w-4 h-4 ml-2" />
                  إرسال للموافقة
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 ml-2" />
                  حفظ المسجد
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
}
