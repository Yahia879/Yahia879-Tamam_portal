import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowRight, Building2, MapPin, Save, User, AlertCircle, ArrowLeft, LogOut } from "lucide-react";
import { Link, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { LocationPicker } from "@/components/LocationPicker";
import { useAuth } from "@/_core/hooks/useAuth";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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

export default function RequesterMosqueForm() {
  const [, navigate] = useLocation();
  const { user, logout } = useAuth();
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

  const { data: allCategories = [] } = trpc.categories.getAllCategories.useQuery();
  const availableCities = allCategories.filter((c: any) => c.type === "city").map((c: any) => c.nameAr);

  // التحقق من وجود طلب مسجد سابق
  const { data: existingMosques, isLoading: checkingMosques } = trpc.mosques.getMyMosques.useQuery(
    undefined,
    { enabled: !!user?.id }
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
      navigate("/requester");
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

    // التحقق من عدم وجود طلب سابق (مع مراعاة الاستثناءات)
    if (!canRegisterMore) {
      toast.error("لا يمكنك تقديم أكثر من طلب تسجيل مسجد واحد. يرجى التواصل مع الإدارة للحصول على استثناء.");
      return;
    }

    let finalNotes = formData.description || "";
    if (formData.hasPrayerHall) {
      const womenDetails = `\n\n[معلومات مصلى النساء]:\n- السعة: ${formData.womenPrayerCapacity ? formData.womenPrayerCapacity + " مصلية" : "غير محدد"}\n- المساحة: ${formData.womenPrayerArea ? formData.womenPrayerArea + " م²" : "غير محدد"}\n- ملاحظات إضافية: ${formData.womenPrayerNotes || "لا يوجد"}`;
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
      <div className="min-h-screen bg-muted/30">
        {/* شريط التنقل */}
        <header className="sticky top-0 z-50 bg-white/95 backdrop-blur border-b border-border shadow-sm">
          <div className="container mx-auto px-4">
            <div className="flex items-center justify-between h-16">
              <Link href="/" className="flex items-center gap-2 sm:gap-3">
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg gradient-primary flex items-center justify-center">
                  <Building2 className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                </div>
                <span className="font-bold text-base sm:text-lg text-foreground">بوابة تمام</span>
              </Link>

              <div className="flex items-center gap-2 sm:gap-4">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="flex items-center gap-2 px-2 sm:px-4">
                      <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <User className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary" />
                      </div>
                      <span className="text-xs sm:text-sm font-medium truncate max-w-[80px] sm:max-w-none">{user?.name}</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuItem onClick={() => navigate("/requester")}>
                      لوحة التحكم
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={logout} className="text-red-600">
                      <LogOut className="w-4 h-4 ml-2" />
                      تسجيل الخروج
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </div>
        </header>

        <main className="container mx-auto px-4 py-6 sm:py-8">
          <div className="max-w-4xl mx-auto space-y-6">
            <div className="flex items-center gap-3 sm:gap-4">
              <Link href="/requester">
                <Button variant="ghost" size="icon" className="flex-shrink-0">
                  <ArrowRight className="w-5 h-5" />
                </Button>
              </Link>
              <div className="min-w-0">
                <h1 className="text-xl sm:text-2xl font-bold text-foreground truncate">إضافة مسجد جديد</h1>
                <p className="text-xs sm:text-sm text-muted-foreground truncate">أدخل بيانات المسجد المراد إضافته</p>
              </div>
            </div>

            <Alert variant="destructive" className="border-destructive/50 bg-destructive/5">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle className="text-base sm:text-lg">لا يمكن تقديم طلب جديد</AlertTitle>
              <AlertDescription className="text-xs sm:text-sm leading-relaxed">
                لديك طلب تسجيل مسجد سابق. لا يمكنك تقديم أكثر من طلب واحد إلا بعد الحصول على استثناء من الإدارة.
                <br className="hidden sm:block" />
                يرجى التواصل مع الإدارة إذا كنت بحاجة لتسجيل مسجد إضافي.
              </AlertDescription>
            </Alert>

            <div className="flex justify-end">
              <Link href="/requester" className="w-full sm:w-auto">
                <Button variant="outline" className="w-full sm:w-auto h-10">العودة للوحة التحكم</Button>
              </Link>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30">
      {/* شريط التنقل */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur border-b border-border shadow-sm">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="flex items-center gap-2 sm:gap-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg gradient-primary flex items-center justify-center">
                <Building2 className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </div>
              <span className="font-bold text-base sm:text-lg text-foreground">بوابة تمام</span>
            </Link>

            <div className="flex items-center gap-2 sm:gap-4">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="flex items-center gap-2 px-2 sm:px-4">
                    <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <User className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary" />
                    </div>
                    <span className="text-xs sm:text-sm font-medium truncate max-w-[80px] sm:max-w-none">{user?.name}</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuItem onClick={() => navigate("/requester")}>
                    لوحة التحكم
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={logout} className="text-red-600">
                    <LogOut className="w-4 h-4 ml-2" />
                    تسجيل الخروج
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 sm:py-8">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* العنوان */}
          <div className="flex items-center gap-3 sm:gap-4">
            <Link href="/requester">
              <Button variant="ghost" size="icon" className="flex-shrink-0">
                <ArrowRight className="w-5 h-5" />
              </Button>
            </Link>
            <div className="min-w-0">
              <h1 className="text-xl sm:text-2xl font-bold text-foreground truncate">إضافة مسجد جديد</h1>
              <p className="text-xs sm:text-sm text-muted-foreground truncate">أدخل بيانات المسجد المراد إضافته</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* بيانات مقدم الطلب - للقراءة فقط */}
            <Card className="border-0 shadow-sm">
              <CardHeader className="p-4 sm:p-6 pb-2 sm:pb-3">
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                  <User className="w-5 h-5 text-primary" />
                  بيانات مقدم الطلب
                </CardTitle>
                <CardDescription className="text-xs sm:text-sm">البيانات التالية مأخوذة من حسابك</CardDescription>
              </CardHeader>
              <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs sm:text-sm">الاسم الكامل</Label>
                    <Input value={user?.name || ""} disabled className="bg-muted h-9 sm:h-10 text-xs sm:text-sm" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs sm:text-sm">البريد الإلكتروني</Label>
                    <Input value={user?.email || ""} disabled className="bg-muted h-9 sm:h-10 text-xs sm:text-sm" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs sm:text-sm">رقم الجوال</Label>
                    <Input value={user?.phone || ""} disabled className="bg-muted h-9 sm:h-10 text-xs sm:text-sm" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs sm:text-sm">الصفة</Label>
                    <Input value={getRequesterTypeLabel((user as any)?.capacity)} disabled className="bg-muted h-9 sm:h-10 text-xs sm:text-sm" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* المعلومات الأساسية */}
            <Card className="border-0 shadow-sm">
              <CardHeader className="p-4 sm:p-6 pb-2 sm:pb-3">
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                  <Building2 className="w-5 h-5 text-primary" />
                  المعلومات الأساسية
                </CardTitle>
                <CardDescription className="text-xs sm:text-sm">أدخل البيانات الأساسية للمسجد</CardDescription>
              </CardHeader>
              <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0 space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="name" className="text-xs sm:text-sm">اسم المسجد *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => handleChange("name", e.target.value)}
                    placeholder="مثال: مسجد الرحمة"
                    className="h-9 sm:h-10 text-xs sm:text-sm"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="mosqueType" className="text-xs sm:text-sm">نوع المسجد *</Label>
                  <Select value={formData.mosqueType || undefined} onValueChange={(value) => handleChange("mosqueType", value)}>
                    <SelectTrigger className="h-9 sm:h-10 text-xs sm:text-sm">
                      <SelectValue placeholder="اختر النوع" />
                    </SelectTrigger>
                    <SelectContent>
                      {mosqueTypes.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="area" className="text-xs sm:text-sm">المساحة (م²) *</Label>
                    <Input
                      id="area"
                      type="number"
                      value={formData.area}
                      onChange={(e) => handleChange("area", e.target.value)}
                      placeholder="مثال: 500"
                      className="h-9 sm:h-10 text-xs sm:text-sm"
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="capacity" className="text-xs sm:text-sm">السعة (مصلى) *</Label>
                    <Input
                      id="capacity"
                      type="number"
                      value={formData.capacity}
                      onChange={(e) => handleChange("capacity", e.target.value)}
                      placeholder="مثال: 300"
                      className="h-9 sm:h-10 text-xs sm:text-sm"
                      required
                    />
                  </div>
                  <div className="space-y-1.5 col-span-2 sm:col-span-1">
                    <Label htmlFor="mosqueAge" className="text-xs sm:text-sm">عمر المسجد (سنة)</Label>
                    <Input
                      id="mosqueAge"
                      type="number"
                      value={formData.mosqueAge}
                      onChange={(e) => handleChange("mosqueAge", e.target.value)}
                      placeholder="مثال: 15"
                      className="h-9 sm:h-10 text-xs sm:text-sm"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2 py-2">
                  <Checkbox
                    id="hasPrayerHall"
                    checked={formData.hasPrayerHall}
                    onCheckedChange={(checked) => {
                      const isChecked = checked as boolean;
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
                  <Label htmlFor="hasPrayerHall" className="cursor-pointer text-xs sm:text-sm">
                    هل يوجد مصلى نساء؟
                  </Label>
                </div>

                {formData.hasPrayerHall && (
                  <div className="mt-4 p-4 border rounded-lg bg-muted/30 space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
                    <h4 className="font-semibold text-xs sm:text-sm text-primary flex items-center gap-1.5 border-b pb-2">
                      <Building2 className="w-4 h-4" />
                      معلومات مصلى النساء
                    </h4>
                    <div className="grid grid-cols-2 gap-3 sm:gap-4">
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

            {/* الموقع الجغرافي */}
            <Card className="border-0 shadow-sm">
              <CardHeader className="p-4 sm:p-6 pb-2 sm:pb-3">
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                  <MapPin className="w-5 h-5 text-primary" />
                  الموقع الجغرافي
                </CardTitle>
                <CardDescription className="text-xs sm:text-sm">حدد موقع المسجد على الخريطة</CardDescription>
              </CardHeader>
              <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0 space-y-4">
                <div className="rounded-lg overflow-hidden border">
                  <LocationPicker
                    onChange={handleLocationChange}
                    value={
                      formData.latitude && formData.longitude
                        ? {
                            lat: parseFloat(formData.latitude),
                            lng: parseFloat(formData.longitude),
                          }
                        : undefined
                    }
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="city" className="text-xs sm:text-sm">المدينة أو المركز *</Label>
                    <Select value={formData.city} onValueChange={handleCityChange}>
                      <SelectTrigger id="city" className="h-9 sm:h-10 text-xs sm:text-sm">
                        <SelectValue placeholder="اختر المدينة أو المركز" />
                      </SelectTrigger>
                      <SelectContent className="max-h-[300px]">
                        {availableCities.map((location: string) => (
                          <SelectItem key={location} value={location}>
                            {location}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="governorate" className="text-xs sm:text-sm">المنطقة</Label>
                    <Input id="governorate" value={formData.governorate} disabled className="bg-muted h-9 sm:h-10 text-xs sm:text-sm" />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="district" className="text-xs sm:text-sm">الحي</Label>
                  <Input
                    id="district"
                    value={formData.district}
                    onChange={(e) => handleChange("district", e.target.value)}
                    placeholder="مثال: النسيم"
                    className="h-9 sm:h-10 text-xs sm:text-sm"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="address" className="text-xs sm:text-sm">العنوان التفصيلي</Label>
                  <Textarea
                    id="address"
                    value={formData.address}
                    onChange={(e) => handleChange("address", e.target.value)}
                    placeholder="العنوان التفصيلي للمسجد..."
                    rows={3}
                    className="text-xs sm:text-sm"
                  />
                </div>
              </CardContent>
            </Card>

            {/* ملاحظات إضافية */}
            <Card className="border-0 shadow-sm">
              <CardHeader className="p-4 sm:p-6 pb-2 sm:pb-3">
                <CardTitle className="text-base sm:text-lg">ملاحظات إضافية</CardTitle>
                <CardDescription className="text-xs sm:text-sm">أي معلومات إضافية عن المسجد</CardDescription>
              </CardHeader>
              <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0">
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => handleChange("description", e.target.value)}
                  placeholder="أضف أي ملاحظات أو معلومات إضافية..."
                  rows={4}
                  className="text-xs sm:text-sm"
                />
              </CardContent>
            </Card>

            {/* الأزرار */}
            <div className="flex flex-col-reverse sm:flex-row gap-3 sm:gap-4 justify-end">
              <Link href="/requester">
                <Button type="button" variant="outline" className="w-full sm:w-auto h-10">
                  إلغاء
                </Button>
              </Link>
              <Button type="submit" disabled={createMutation.isPending} className="gap-2 w-full sm:w-auto h-10">
                <Save className="w-4 h-4" />
                {createMutation.isPending ? "جاري الحفظ..." : "حفظ المسجد"}
              </Button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
