import { Link, useParams } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Building2,
  MapPin,
  Users,
  Ruler,
  Calendar,
  CheckCircle2,
  Clock,
  XCircle,
  AlertCircle,
  Sparkles,
  Send,
} from "lucide-react";
import BeneficiaryLayout from "@/components/BeneficiaryLayout";
import { MapView } from "@/components/Map";
import { Marker } from "react-leaflet";

const mosqueTypeLabels: Record<string, string> = {
  jami: "جامع",
  masjid: "مسجد",
  musalla: "مصلى",
};

export default function RequesterMosqueDetails() {
  const params = useParams<{ id: string }>();
  const mosqueId = parseInt(params.id || "0", 10);

  // جلب بيانات المسجد
  const { data: mosque, isLoading, error } = trpc.mosques.getById.useQuery(
    { id: mosqueId },
    { enabled: !!mosqueId }
  );

  if (isLoading) {
    return (
      <BeneficiaryLayout
        activeTab="mosques"
        title="تفاصيل المسجد"
        backUrl="/my-mosques"
        backLabel="العودة لمساجدي"
      >
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="h-36 bg-muted/40 animate-pulse rounded-3xl" />
          <div className="h-64 bg-muted/40 animate-pulse rounded-3xl" />
          <div className="h-64 bg-muted/40 animate-pulse rounded-3xl" />
        </div>
      </BeneficiaryLayout>
    );
  }

  if (error || !mosque) {
    return (
      <BeneficiaryLayout
        activeTab="mosques"
        title="تفاصيل المسجد"
        backUrl="/my-mosques"
        backLabel="العودة لمساجدي"
      >
        <Card className="max-w-xl mx-auto p-8 sm:p-12 text-center rounded-3xl border-border/60 bg-card">
          <div className="w-16 h-16 rounded-full bg-rose-500/10 text-rose-600 flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8" />
          </div>
          <h3 className="font-bold text-lg text-foreground mb-1">المسجد غير موجود</h3>
          <p className="text-xs text-muted-foreground mb-6">
            تعذر العثور على بيانات المسجد المطلوب أو ليس لديك صلاحية للوصول إليه.
          </p>
          <Link href="/my-mosques">
            <Button className="gradient-primary text-white font-bold rounded-2xl shadow-md gap-2 px-6">
              العودة لقائمة المساجد
            </Button>
          </Link>
        </Card>
      </BeneficiaryLayout>
    );
  }

  const isApproved = mosque.approvalStatus === "approved";
  const isPending = mosque.approvalStatus === "pending";
  const isRejected = mosque.approvalStatus === "rejected";

  const mosqueLat = mosque.latitude ? parseFloat(mosque.latitude) : 18.2164;
  const mosqueLng = mosque.longitude ? parseFloat(mosque.longitude) : 42.5053;
  const hasValidCoords = !!mosque.latitude && !!mosque.longitude;

  // استخراج معلومات مصلى النساء إن وجدت في الملاحظات أو الحقول
  let cleanNotes = mosque.notes || "";
  let extractedWomenCapacity = "";
  let extractedWomenArea = "";

  if (cleanNotes.includes("[معلومات مصلى النساء]:")) {
    const parts = cleanNotes.split("[معلومات مصلى النساء]:");
    cleanNotes = parts[0].trim();
    const womenSection = parts[1] || "";
    const capMatch = womenSection.match(/السعة:\s*([^\n]+)/);
    const areaMatch = womenSection.match(/المساحة:\s*([^\n]+)/);
    if (capMatch) extractedWomenCapacity = capMatch[1].replace("مصلية", "").replace("غير محدد", "").trim();
    if (areaMatch) extractedWomenArea = areaMatch[1].replace("م²", "").replace("غير محدد", "").trim();
  }

  const hasPrayerHall = mosque.hasPrayerHall || !!extractedWomenCapacity || !!extractedWomenArea;

  const registrationDate = mosque.createdAt
    ? new Date(mosque.createdAt).toLocaleDateString("ar-SA", { year: "numeric", month: "short", day: "numeric" })
    : null;

  return (
    <BeneficiaryLayout
      activeTab="mosques"
      title={mosque.name}
      subtitle={`مسجل بتاريخ ${registrationDate || "سابقاً"} • ${mosque.city || "أبها"}`}
      backUrl="/my-mosques"
      backLabel="العودة لمساجدي"
      headerActions={
        isApproved ? (
          <Link href={`/request-form-dynamic`}>
            <Button className="rounded-xl sm:rounded-2xl gradient-primary text-white font-bold gap-1.5 sm:gap-2 shadow-sm hover:opacity-95 cursor-pointer text-[11px] sm:text-xs h-8 sm:h-10 px-3 sm:px-4 shrink-0">
              <Send className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span>طلب خدمة لهذا المسجد</span>
            </Button>
          </Link>
        ) : null
      }
    >
      <div className="max-w-4xl mx-auto space-y-6 sm:space-y-8">
        {/* Top Status & Rejection Banner */}
        {isRejected ? (
          <div className="p-4 sm:p-5 rounded-2xl sm:rounded-3xl bg-rose-100/70 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-rose-950 dark:text-rose-200 flex items-start gap-3.5 shadow-xs">
            <XCircle className="w-6 h-6 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
            <div className="space-y-1 flex-1">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h4 className="font-bold text-sm sm:text-base text-rose-950 dark:text-rose-200">
                  طلب تسجيل المسجد مرفوض
                </h4>
                <Badge variant="outline" className="bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30 text-xs font-bold px-2.5 py-0.5">
                  مرفوض
                </Badge>
              </div>
              <p className="text-xs sm:text-sm text-rose-800 dark:text-rose-300 leading-relaxed font-medium">
                {(mosque as any).rejectionReason || "تمت مراجعة طلب التسجيل والاعتذار عنه لعدم استيفاء الشروط المحددة."}
              </p>
            </div>
          </div>
        ) : isPending ? (
          <div className="p-4 sm:p-5 rounded-2xl sm:rounded-3xl bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-200 flex items-start gap-3.5 shadow-xs">
            <Clock className="w-6 h-6 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-1 flex-1">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h4 className="font-bold text-sm sm:text-base text-amber-900 dark:text-amber-200">
                  طلب تسجيل المسجد قيد المراجعة
                </h4>
                <Badge variant="outline" className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30 text-xs font-bold px-2.5 py-0.5">
                  قيد المراجعة
                </Badge>
              </div>
              <p className="text-xs sm:text-sm text-amber-800 dark:text-amber-300 leading-relaxed font-medium">
                يجري تدقيق ومراجعة بيانات المسجد من قبل فريق الجمعية. ستتمكن من تقديم طلبات الخدمات فور اعتماد المسجد.
              </p>
            </div>
          </div>
        ) : (
          <div className="p-4 sm:p-5 rounded-2xl sm:rounded-3xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-900 dark:text-emerald-200 flex items-center justify-between gap-3.5 shadow-xs">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-6 h-6 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <div>
                <h4 className="font-bold text-sm sm:text-base text-emerald-950 dark:text-emerald-200">
                  المسجد معتمد ونشط
                </h4>
                <p className="text-xs text-emerald-800 dark:text-emerald-300 font-medium">
                  تم اعتماد المسجد رسمياً ويمكنك تقديم ومتابعة كافة خدمات بيوت الله عليه.
                </p>
              </div>
            </div>
            <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-xs font-bold px-3 py-1 shrink-0">
              معتمد
            </Badge>
          </div>
        )}

        {/* Step 1: Basic Mosque Info (Read-Only) */}
        <Card className="border border-border/60 shadow-xs rounded-2xl sm:rounded-3xl overflow-hidden bg-card">
          <CardHeader className="p-4 sm:p-6 border-b border-border/40 bg-muted/30">
            <CardTitle className="flex items-center gap-2 text-sm sm:text-lg font-bold text-foreground">
              <Building2 className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
              <span>1. البيانات الأساسية للمسجد</span>
            </CardTitle>
            <CardDescription className="text-[11px] sm:text-xs">
              الاسم المسجل ونوع المسجد وسعته التقديرية
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 space-y-4 sm:space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
              <div className="space-y-1.5 sm:space-y-2">
                <Label className="text-xs font-bold text-muted-foreground">اسم المسجد</Label>
                <Input
                  value={mosque.name || ""}
                  readOnly
                  disabled
                  className="rounded-xl sm:rounded-2xl h-10 sm:h-11 border-border/60 text-xs sm:text-sm bg-muted/40 dark:bg-muted/20 font-bold text-foreground cursor-default"
                />
              </div>

              <div className="space-y-1.5 sm:space-y-2">
                <Label className="text-xs font-bold text-muted-foreground">نوع المسجد</Label>
                <Input
                  value={mosqueTypeLabels[mosque.mosqueType || ""] || mosque.mosqueType || "مسجد"}
                  readOnly
                  disabled
                  className="rounded-xl sm:rounded-2xl h-10 sm:h-11 border-border/60 text-xs sm:text-sm bg-muted/40 dark:bg-muted/20 font-bold text-foreground cursor-default"
                />
              </div>

              <div className="space-y-1.5 sm:space-y-2">
                <Label className="text-xs font-bold text-muted-foreground">مساحة المسجد الإجمالية (م²)</Label>
                <Input
                  value={mosque.area ? `${mosque.area} م²` : "غير محدد"}
                  readOnly
                  disabled
                  className="rounded-xl sm:rounded-2xl h-10 sm:h-11 border-border/60 text-xs sm:text-sm bg-muted/40 dark:bg-muted/20 font-bold text-foreground cursor-default"
                />
              </div>

              <div className="space-y-1.5 sm:space-y-2">
                <Label className="text-xs font-bold text-muted-foreground">سعة المصلين التقريبية (عدد الأشخاص)</Label>
                <Input
                  value={mosque.capacity ? `${mosque.capacity} مصلٍ` : "غير محدد"}
                  readOnly
                  disabled
                  className="rounded-xl sm:rounded-2xl h-10 sm:h-11 border-border/60 text-xs sm:text-sm bg-muted/40 dark:bg-muted/20 font-bold text-foreground cursor-default"
                />
              </div>

              {mosque.mosqueAge && (
                <div className="space-y-1.5 sm:space-y-2">
                  <Label className="text-xs font-bold text-muted-foreground">عمر المسجد التقريبي</Label>
                  <Input
                    value={`${mosque.mosqueAge} سنة`}
                    readOnly
                    disabled
                    className="rounded-xl sm:rounded-2xl h-10 sm:h-11 border-border/60 text-xs sm:text-sm bg-muted/40 dark:bg-muted/20 font-bold text-foreground cursor-default"
                  />
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Step 2: Location & Map (Read-Only) */}
        <Card className="border border-border/60 shadow-xs rounded-2xl sm:rounded-3xl overflow-hidden bg-card">
          <CardHeader className="p-4 sm:p-6 border-b border-border/40 bg-muted/30">
            <CardTitle className="flex items-center gap-2 text-sm sm:text-lg font-bold text-foreground">
              <MapPin className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
              <span>2. الموقع الجغرافي والعنوان</span>
            </CardTitle>
            <CardDescription className="text-[11px] sm:text-xs">
              المدينة والحي والموقع التفاعلي المحدد على الخريطة
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 space-y-4 sm:space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
              <div className="space-y-1.5 sm:space-y-2">
                <Label className="text-xs font-bold text-muted-foreground">المدينة</Label>
                <Input
                  value={mosque.city || "أبها"}
                  readOnly
                  disabled
                  className="rounded-xl sm:rounded-2xl h-10 sm:h-11 border-border/60 text-xs sm:text-sm bg-muted/40 dark:bg-muted/20 font-bold text-foreground cursor-default"
                />
              </div>

              <div className="space-y-1.5 sm:space-y-2">
                <Label className="text-xs font-bold text-muted-foreground">الحي</Label>
                <Input
                  value={mosque.district || "غير محدد"}
                  readOnly
                  disabled
                  className="rounded-xl sm:rounded-2xl h-10 sm:h-11 border-border/60 text-xs sm:text-sm bg-muted/40 dark:bg-muted/20 font-bold text-foreground cursor-default"
                />
              </div>

              <div className="space-y-1.5 sm:space-y-2">
                <Label className="text-xs font-bold text-muted-foreground">العنوان أو الوصف المباشر</Label>
                <Input
                  value={mosque.address || "غير محدد"}
                  readOnly
                  disabled
                  className="rounded-xl sm:rounded-2xl h-10 sm:h-11 border-border/60 text-xs sm:text-sm bg-muted/40 dark:bg-muted/20 font-bold text-foreground cursor-default"
                />
              </div>
            </div>

            {/* Map Preview */}
            <div className="space-y-2 pt-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold text-foreground">
                  الموقع الإحداثي على الخريطة
                </Label>
                {hasValidCoords && (
                  <span className="text-[11px] sm:text-xs text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                    ✓ تم التحديد على الخريطة
                  </span>
                )}
              </div>

              {hasValidCoords ? (
                <div className="rounded-2xl sm:rounded-3xl border border-border/60 overflow-hidden shadow-xs h-[280px] sm:h-[350px] relative">
                  <MapView
                    className="h-full w-full"
                    initialCenter={{ lat: mosqueLat, lng: mosqueLng }}
                    initialZoom={16}
                  >
                    <Marker position={[mosqueLat, mosqueLng]} />
                  </MapView>
                </div>
              ) : (
                <div className="p-8 rounded-2xl sm:rounded-3xl bg-muted/30 border border-border/60 text-center text-xs text-muted-foreground">
                  لم يتم حفظ إحداثيات مكانية دقيقة لهذا المسجد.
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Step 3: Women Prayer Hall & Additional Specs (Read-Only) */}
        <Card className="border border-border/60 shadow-xs rounded-2xl sm:rounded-3xl overflow-hidden bg-card">
          <CardHeader className="p-4 sm:p-6 border-b border-border/40 bg-muted/30">
            <CardTitle className="flex items-center gap-2 text-sm sm:text-lg font-bold text-foreground">
              <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
              <span>3. مصلى النساء والتفاصيل الإضافية</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 space-y-4 sm:space-y-6">
            {hasPrayerHall ? (
              <div className="p-4 sm:p-5 border border-primary/20 rounded-2xl bg-primary/5 space-y-4">
                <div className="flex items-center justify-between border-b border-primary/10 pb-2.5">
                  <h4 className="font-bold text-xs sm:text-sm text-primary flex items-center gap-2">
                    <Building2 className="w-4 h-4" />
                    <span>يوجد مصلى مخصص للنساء</span>
                  </h4>
                  <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 text-xs font-bold">
                    متوفر
                  </Badge>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5 sm:space-y-2">
                    <label className="text-xs sm:text-sm font-bold text-foreground flex items-center gap-1.5">
                      <Users className="w-4 h-4 text-primary/70" />
                      <span>سعة مصلى النساء (مصلي)</span>
                    </label>
                    <Input
                      value={extractedWomenCapacity ? `${extractedWomenCapacity} مصلية` : "غير محدد"}
                      readOnly
                      disabled
                      className="h-11 rounded-xl text-xs sm:text-sm bg-background border-border/80 font-bold text-foreground cursor-default"
                    />
                  </div>

                  <div className="space-y-1.5 sm:space-y-2">
                    <label className="text-xs sm:text-sm font-bold text-foreground flex items-center gap-1.5">
                      <Ruler className="w-4 h-4 text-primary/70" />
                      <span>المساحة (م²)</span>
                    </label>
                    <Input
                      value={extractedWomenArea ? `${extractedWomenArea} م²` : "غير محدد"}
                      readOnly
                      disabled
                      className="h-11 rounded-xl text-xs sm:text-sm bg-background border-border/80 font-bold text-foreground cursor-default"
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-4 sm:p-5 rounded-2xl border border-border/60 bg-muted/20 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-muted text-muted-foreground shrink-0">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-bold text-xs sm:text-sm text-foreground">مصلى النساء</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">لا يوجد مصلى للنساء مسجل لهذا المسجد</p>
                </div>
              </div>
            )}

            {cleanNotes && (
              <div className="space-y-1.5 sm:space-y-2">
                <Label className="text-xs font-bold text-muted-foreground">ملاحظات أو مواصفات خاصة للمسجد</Label>
                <Textarea
                  value={cleanNotes}
                  readOnly
                  disabled
                  className="rounded-2xl border-border/60 text-xs min-h-[90px] bg-muted/40 dark:bg-muted/20 font-medium text-foreground cursor-default"
                />
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </BeneficiaryLayout>
  );
}
