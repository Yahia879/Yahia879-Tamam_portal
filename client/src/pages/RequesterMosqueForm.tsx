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
  "الواديين",
  "الفرعة",
  "الفرشة",
  "الحبيل",
  "الربوعة",
  "الشعف",
  "العرين",
  "القرى",
  "المضة",
  "النقيع",
  "بحر أبو سكينة",
  "تندحة",
  "ثلوث المنظر",
  "خاط",
  "رغدان",
  "سبت العلاية",
  "سنامة",
  "صمخ",
  "قنا",
  "كتنة",
  "وادي الجوف",
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

export default function RequesterMosqueForm() {
  const [, navigate] = useLocation();
  const { user, logout } = useAuth();
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
    { enabled: !!user?.id }
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
      navigate("/requester");
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
    if (!canRegisterMore) {
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
      notes: formData.description || undefined,
    });
  };

  if (hasExistingMosque && !canRegisterMore) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        {/* شريط التنقل */}
        <header className="sticky top-0 z-50 bg-white/95 backdrop-blur border-b border-border shadow-sm">
          <div className="container mx-auto px-4">
            <div className="flex items-center justify-between h-16">
              <Link href="/" className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg gradient-primary flex items-center justify-center">
                  <Building2 className="w-6 h-6 text-white" />
                </div>
                <span className="font-bold text-lg text-foreground">بوابة تمام</span>
              </Link>

              <div className="flex items-center gap-4">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <User className="w-4 h-4 text-primary" />
                      </div>
                      <span className="text-sm font-medium">{user?.name}</span>
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

        <main className="container mx-auto px-4 py-8">
          <div className="max-w-4xl mx-auto space-y-6">
            <div className="flex items-center gap-4">
              <Link href="/requester">
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
              <Link href="/requester">
                <Button variant="outline">العودة للوحة التحكم</Button>
              </Link>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* شريط التنقل */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur border-b border-border shadow-sm">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg gradient-primary flex items-center justify-center">
                <Building2 className="w-6 h-6 text-white" />
              </div>
              <span className="font-bold text-lg text-foreground">بوابة تمام</span>
            </Link>

            <div className="flex items-center gap-4">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <User className="w-4 h-4 text-primary" />
                    </div>
                    <span className="text-sm font-medium">{user?.name}</span>
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

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* العنوان */}
          <div className="flex items-center gap-4">
            <Link href="/requester">
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
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="w-5 h-5" />
                  بيانات مقدم الطلب
                </CardTitle>
                <CardDescription>البيانات التالية مأخوذة من حسابك</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>الاسم الكامل</Label>
                    <Input value={user?.name || ""} disabled className="bg-muted" />
                  </div>
                  <div>
                    <Label>البريد الإلكتروني</Label>
                    <Input value={user?.email || ""} disabled className="bg-muted" />
                  </div>
                  <div>
                    <Label>رقم الجوال</Label>
                    <Input value={user?.phone || ""} disabled className="bg-muted" />
                  </div>
                  <div>
                    <Label>الصفة</Label>
                    <Input value={getRequesterTypeLabel((user as any)?.capacity)} disabled className="bg-muted" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* المعلومات الأساسية */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="w-5 h-5" />
                  المعلومات الأساسية
                </CardTitle>
                <CardDescription>أدخل البيانات الأساسية للمسجد</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="name">اسم المسجد *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => handleChange("name", e.target.value)}
                    placeholder="مثال: مسجد الرحمة"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="mosqueType">نوع المسجد *</Label>
                  <Select value={formData.mosqueType} onValueChange={(value) => handleChange("mosqueType", value)}>
                    <SelectTrigger>
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

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="area">المساحة (م²)</Label>
                    <Input
                      id="area"
                      type="number"
                      value={formData.area}
                      onChange={(e) => handleChange("area", e.target.value)}
                      placeholder="مثال: 500"
                    />
                  </div>
                  <div>
                    <Label htmlFor="capacity">السعة (مصلي)</Label>
                    <Input
                      id="capacity"
                      type="number"
                      value={formData.capacity}
                      onChange={(e) => handleChange("capacity", e.target.value)}
                      placeholder="مثال: 300"
                    />
                  </div>
                  <div>
                    <Label htmlFor="mosqueAge">عمر المسجد (سنة)</Label>
                    <Input
                      id="mosqueAge"
                      type="number"
                      value={formData.mosqueAge}
                      onChange={(e) => handleChange("mosqueAge", e.target.value)}
                      placeholder="مثال: 15"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Checkbox
                    id="hasPrayerHall"
                    checked={formData.hasPrayerHall}
                    onCheckedChange={(checked) => handleChange("hasPrayerHall", checked as boolean)}
                  />
                  <Label htmlFor="hasPrayerHall" className="cursor-pointer">
                    هل يوجد مصلى نساء؟
                  </Label>
                </div>
              </CardContent>
            </Card>

            {/* الموقع الجغرافي */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="w-5 h-5" />
                  الموقع الجغرافي
                </CardTitle>
                <CardDescription>حدد موقع المسجد على الخريطة</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
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

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="city">المدينة أو المركز *</Label>
                    <Select value={formData.city} onValueChange={(value) => handleChange("city", value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="اختر المدينة أو المركز" />
                      </SelectTrigger>
                      <SelectContent>
                        {asirLocations.map((location) => (
                          <SelectItem key={location} value={location}>
                            {location}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="governorate">المنطقة</Label>
                    <Input id="governorate" value="عسير" disabled className="bg-muted" />
                  </div>
                </div>

                <div>
                  <Label htmlFor="district">الحي</Label>
                  <Input
                    id="district"
                    value={formData.district}
                    onChange={(e) => handleChange("district", e.target.value)}
                    placeholder="مثال: النسيم"
                  />
                </div>

                <div>
                  <Label htmlFor="address">العنوان التفصيلي</Label>
                  <Textarea
                    id="address"
                    value={formData.address}
                    onChange={(e) => handleChange("address", e.target.value)}
                    placeholder="العنوان التفصيلي للمسجد..."
                    rows={3}
                  />
                </div>
              </CardContent>
            </Card>

            {/* ملاحظات إضافية */}
            <Card>
              <CardHeader>
                <CardTitle>ملاحظات إضافية</CardTitle>
                <CardDescription>أي معلومات إضافية عن المسجد</CardDescription>
              </CardHeader>
              <CardContent>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => handleChange("description", e.target.value)}
                  placeholder="أضف أي ملاحظات أو معلومات إضافية..."
                  rows={4}
                />
              </CardContent>
            </Card>

            {/* الأزرار */}
            <div className="flex gap-4 justify-end">
              <Link href="/requester">
                <Button type="button" variant="outline">
                  إلغاء
                </Button>
              </Link>
              <Button type="submit" disabled={createMutation.isPending} className="gap-2">
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
