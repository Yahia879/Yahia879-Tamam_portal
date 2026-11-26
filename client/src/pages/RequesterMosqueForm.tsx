import React, { useState, useMemo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";
import { Link, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { useAuth } from "@/_core/hooks/useAuth";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import BeneficiaryLayout from "@/components/BeneficiaryLayout";
import {
  CITY_COORDINATES,
  INITIAL_MOSQUE_FORM_STATE,
  MosqueFormFields,
  MosqueFormState,
  MosqueLocationValue,
  applyMosqueFormChange,
} from "@/components/MosqueFormFields";

export default function RequesterMosqueForm() {
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const [formData, setFormData] = useState<MosqueFormState>(INITIAL_MOSQUE_FORM_STATE);

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

  const handleChange = (field: keyof MosqueFormState, value: string | boolean) => {
    setFormData((prev) => applyMosqueFormChange(prev, field, value));
  };

  const handleLocationChange = useCallback((location: MosqueLocationValue) => {
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
  }, [availableCities]);

  const locationValue = useMemo(() => ({
    lat: formData.latitude ? parseFloat(formData.latitude) : 18.2164,
    lng: formData.longitude ? parseFloat(formData.longitude) : 42.5053,
  }), [formData.latitude, formData.longitude]);

  const handleCityChange = (value: string) => {
    const coords = CITY_COORDINATES[value];
    setFormData((prev) => ({
      ...prev,
      city: value,
      ...(coords
        ? {
            latitude: coords.lat.toString(),
            longitude: coords.lng.toString(),
            governorate: coords.region,
          }
        : {}),
    }));
  };

  const handleTogglePrayerHall = () => {
    setFormData((prev) => {
      const isChecked = !prev.hasPrayerHall;
      return {
        ...prev,
        hasPrayerHall: isChecked,
        ...(isChecked ? {} : { womenPrayerArea: "", womenPrayerCapacity: "", womenLengthM: "", womenWidthM: "", womenPrayerNotes: "" }),
      };
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const menLengthVal = parseFloat(formData.menLengthM);
    const menWidthVal = parseFloat(formData.menWidthM);
    if (!Number.isFinite(menLengthVal) || menLengthVal <= 0 || !Number.isFinite(menWidthVal) || menWidthVal <= 0) {
      toast.error("يرجى إدخال الطول بالمتر والعرض بالمتر للمسجد");
      return;
    }

    const computedArea = Number((menLengthVal * menWidthVal).toFixed(2));
    if (!formData.name || !formData.city || !formData.mosqueType || !formData.capacity) {
      toast.error("يرجى ملء كافة الحقول المطلوبة للمسجد (الاسم، المدينة، النوع، المساحة، السعة)");
      return;
    }

    if (!formData.latitude || !formData.longitude) {
      toast.error("يرجى تحديد موقع المسجد على الخريطة");
      return;
    }

    const womenLengthVal = parseFloat(formData.womenLengthM);
    const womenWidthVal = parseFloat(formData.womenWidthM);
    if (formData.hasPrayerHall && (!Number.isFinite(womenLengthVal) || womenLengthVal <= 0 || !Number.isFinite(womenWidthVal) || womenWidthVal <= 0)) {
      toast.error("يرجى إدخال الطول بالمتر والعرض بالمتر لمصلى النساء");
      return;
    }

    if (!canRegisterMore) {
      toast.error("لا يمكنك تقديم أكثر من طلب تسجيل مسجد واحد. يرجى التواصل مع الإدارة للحصول على استثناء.");
      return;
    }

    const computedWomenArea = formData.hasPrayerHall
      ? Number((womenLengthVal * womenWidthVal).toFixed(2))
      : undefined;

    let finalNotes = formData.description || "";
    if (formData.hasPrayerHall) {
      const womenDetails = `\n\n[معلومات مصلى النساء]:\n- السعة: ${formData.womenPrayerCapacity ? formData.womenPrayerCapacity + " مصلية" : "غير محدد"}\n- المساحة: ${computedWomenArea ? computedWomenArea + " م²" : "غير محدد"}\n- ملاحظات: ${formData.womenPrayerNotes || "لا يوجد"}`;
      finalNotes += womenDetails;
    }

    createMutation.mutate({
      name: formData.name,
      mosqueType: formData.mosqueType || undefined,
      city: formData.city,
      governorate: formData.governorate || undefined,
      center: formData.center || undefined,
      district: formData.district || undefined,
      area: computedArea,
      menLengthCm: Math.round(menLengthVal * 100),
      menWidthCm: Math.round(menWidthVal * 100),
      address: formData.address || undefined,
      latitude: formData.latitude ? parseFloat(formData.latitude) : undefined,
      longitude: formData.longitude ? parseFloat(formData.longitude) : undefined,
      capacity: formData.capacity ? parseInt(formData.capacity) : undefined,
      hasPrayerHall: formData.hasPrayerHall,
      womenLengthCm: formData.hasPrayerHall ? Math.round(womenLengthVal * 100) : undefined,
      womenWidthCm: formData.hasPrayerHall ? Math.round(womenWidthVal * 100) : undefined,
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
                لديك طلب تسجيل مسجد سابق. لا يمكنك تقديم أكثر من طلب واحد إلا بعد الحصول على استثناء من الإدارة.
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
      <MosqueFormFields
        formData={formData}
        availableCities={availableCities}
        locationValue={locationValue}
        onFieldChange={handleChange}
        onCityChange={handleCityChange}
        onLocationChange={handleLocationChange}
        onTogglePrayerHall={handleTogglePrayerHall}
        onSubmit={handleSubmit}
        cancelHref="/my-mosques"
        submitLabel="إرسال طلب تسجيل المسجد"
        submittingLabel="جاري إرسال الطلب..."
        isSubmitting={createMutation.isPending}
      />
    </BeneficiaryLayout>
  );
}
