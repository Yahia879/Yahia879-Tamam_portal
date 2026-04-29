import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowRight, Building2, MapPin, Save, User, AlertCircle, Send } from "lucide-react";
import { Link, useLocation } from "wouter";
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

// مدن ومراكز منطقة عسير (47 موقع)
const asirLocations = [
  "أبها",
  "خميس مشيط",
  "بيشة",
  "محايل عسير",
  "النماص",
  "تثليث",
  "ظهران الجنوب",
  "سراة عبيدة",
  "رجال ألمع",
  "بلقرن",
  "أحد رفيدة",
  "تنومة",
  "بارق",
  "المجاردة",
  "طريب",
  "البرك",
  "الحرجة",
  "الأمواه",
  "السودة",
  "بللحمر",
  "بللسمر",
  "طبب",
  "مربة",
  "القحمة",
  "وادي بن هشبل",
  "تمنية",
  "ثلوث المنظر",
  "بحر أبو سكينة",
  "خاط",
  "ثربان",
  "البشائر",
  "خثعم",
  "باشوت",
  "الجوة",
  "الفرشة",
  "وادي الحيا",
  "المضة",
  "الصبيخة",
  "العرين",
  "الخنقة",
  "ذهبان",
  "العمائر",
  "علب",
  "منصبة",
  "الحمضة",
  "جاش",
  "الزرق",
];

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
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    name: "",
    mosqueType: "",
    city: "",
    governorate: "عسير", // منطقة عسير ثابتة
    center: "",
    district: "",
    address: "",
    latitude: "",
    longitude: "",
    area: "",
    capacity: "",
    hasPrayerHall: false,
    mosqueAge: "",
    description: "",
  });

  // التحقق من وجود طلب مسجد سابق
  const { data: existingMosques, isLoading: checkingMosques } = trpc.mosques.getMyMosques.useQuery(
    undefined,
    { enabled: !!user?.id && user?.role === "service_requester" }
  );

  const hasExistingMosque = existingMosques && existingMosques.length > 0;
  // التحقق من الاستثناءات الممنوحة
  const exemptionsGranted = user?.mosqueExemptions || 0;
  const mosquesRegistered = existingMosques?.length || 0;
  // يمكن للمستخدم تسجيل مسجد واحد مجاناً + عدد الاستثناءات
  const canRegisterMore = mosquesRegistered < (1 + exemptionsGranted);

  const createMutation = trpc.mosques.create.useMutation({
    onSuccess: () => {
      toast.success("تم إرسال طلب تسجيل المسجد بنجاح. سيتم مراجعته من قبل الإدارة.");
      navigate("/mosques");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleChange = (field: string, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleLocationChange = (location: { lat: number; lng: number; address?: string }) => {
    setFormData((prev) => ({
      ...prev,
      latitude: location.lat.toString(),
      longitude: location.lng.toString(),
      address: location.address || prev.address,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.city || !formData.mosqueType) {
      toast.error("يرجى ملء الحقول المطلوبة");
      return;
    }

    // التحقق من عدم وجود طلب سابق (مع مراعاة الاستثناءات)
    if (user?.role === "service_requester" && !canRegisterMore) {
      toast.error("لا يمكنك تقديم أكثر من طلب تسجيل مسجد واحد. يرجى التواصل مع الإدارة للحصول على استثناء.");
      return;
    }

    createMutation.mutate({
      name: formData.name,
      city: formData.city,
      governorate: formData.governorate || undefined,
      center: formData.center || undefined,
      district: formData.district || undefined,
      area: formData.area ? parseInt(formData.area) : undefined,
      address: formData.address || undefined,
      latitude: formData.latitude ? parseFloat(formData.latitude) : undefined,
      longitude: formData.longitude ? parseFloat(formData.longitude) : undefined,
      capacity: formData.capacity ? parseInt(formData.capacity) : undefined,
      hasPrayerHall: formData.hasPrayerHall,
      mosqueAge: formData.mosqueAge ? parseInt(formData.mosqueAge) : undefined,
      // بيانات مقدم الطلب تُضاف تلقائياً من الخادم
    });
  };

  // إذا كان لديه طلب سابق ولا يملك استثناءات، عرض رسالة تنبيه
  if (hasExistingMosque && user?.role === "service_requester" && !canRegisterMore) {
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

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-4xl mx-auto">
        {/* العنوان */}
        <div className="flex items-center gap-4">
          <Link href="/mosques">
            <Button variant="ghost" size="icon">
              <ArrowRight className="w-5 h-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-foreground">إضافة مسجد جديد</h1>
            <p className="text-muted-foreground">أدخل بيانات المسجد المراد إضافته</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* بيانات مقدم الطلب - للقراءة فقط */}
          {user?.role === "service_requester" && (
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
                  <Select value={formData.mosqueType} onValueChange={(v) => handleChange("mosqueType", v)}>
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
                <div>
                  <Label>مساحة المسجد (م²)</Label>
                  <Input
                    type="number"
                    value={formData.area}
                    onChange={(e) => handleChange("area", e.target.value)}
                    placeholder="مثال: 500"
                  />
                </div>
                <div>
                  <Label>عدد المصلين</Label>
                  <Input
                    type="number"
                    value={formData.capacity}
                    onChange={(e) => handleChange("capacity", e.target.value)}
                    placeholder="مثال: 300"
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
                    onCheckedChange={(checked) => handleChange("hasPrayerHall", checked === true)}
                  />
                  <Label htmlFor="hasPrayerHall" className="cursor-pointer">هل يوجد مصلى نساء؟</Label>
                </div>
              </div>
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
                  <Select value={formData.city} onValueChange={(v) => handleChange("city", v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="اختر المدينة أو المركز" />
                    </SelectTrigger>
                    <SelectContent className="max-h-[300px]">
                      {asirLocations.map((location) => (
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
          {user?.role === "service_requester" && (
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
            <Link href="/mosques">
              <Button type="button" variant="outline">إلغاء</Button>
            </Link>
            <Button 
              type="submit" 
              className="gradient-primary text-white"
              disabled={createMutation.isPending || checkingMosques}
            >
              {createMutation.isPending ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin ml-2" />
                  جاري الإرسال...
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
