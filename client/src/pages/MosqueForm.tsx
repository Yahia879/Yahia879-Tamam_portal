import React, { useState, useEffect, useMemo, useCallback } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { ArrowRight, AlertCircle } from "lucide-react";
import { Link, useLocation, useParams } from "wouter";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { useAuth } from "@/_core/hooks/useAuth";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  CITY_COORDINATES,
  INITIAL_MOSQUE_FORM_STATE,
  MosqueFormFields,
  MosqueFormState,
  MosqueLocationValue,
  applyMosqueFormChange,
} from "@/components/MosqueFormFields";

export default function MosqueForm() {
  const params = useParams<{ id: string }>();
  const mosqueId = params.id ? parseInt(params.id) : null;
  const isEdit = !!mosqueId;
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const [formData, setFormData] = useState<MosqueFormState>(INITIAL_MOSQUE_FORM_STATE);
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
        const notesMatch = details.match(/- ملاحظات(?: إضافية)?:\s*([^\n]+)/);

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

      const dims = (mosque as any).prayerHallDimensions as {
        men?: { lengthCm: number; widthCm: number } | null;
        women?: { lengthCm: number; widthCm: number } | null;
      } | null | undefined;
      const menL = (mosque as any).menLengthCm ?? dims?.men?.lengthCm ?? null;
      const menW = (mosque as any).menWidthCm ?? dims?.men?.widthCm ?? null;
      const womenL = (mosque as any).womenLengthCm ?? dims?.women?.lengthCm ?? null;
      const womenW = (mosque as any).womenWidthCm ?? dims?.women?.widthCm ?? null;

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
        area:
          menL && menW
            ? Number(((menL * menW) / 10000).toFixed(2)).toString()
            : mosque.area || "",
        menLengthM: menL ? String(menL / 100) : "",
        menWidthM: menW ? String(menW / 100) : "",
        capacity: mosque.capacity?.toString() || "",
        hasPrayerHall: mosque.hasPrayerHall || false,
        womenPrayerCapacity: wCapacity,
        womenPrayerArea:
          womenL && womenW
            ? Number(((womenL * womenW) / 10000).toFixed(2)).toString()
            : wArea,
        womenLengthM: womenL ? String(womenL / 100) : "",
        womenWidthM: womenW ? String(womenW / 100) : "",
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

  const mosqueList = Array.isArray(existingMosques)
    ? existingMosques
    : (Array.isArray(existingMosques?.mosques) ? existingMosques.mosques : []);
  const hasExistingMosque = mosqueList.length > 0;
  const exemptionsGranted = user?.mosqueExemptions || 0;
  const pendingMosquesCount = mosqueList.filter((m: any) => m.approvalStatus === 'pending').length;
  const canRegisterMore = pendingMosquesCount < (1 + exemptionsGranted);

  const listHref = user?.role === "service_requester" ? "/my-mosques" : "/mosques";

  const createMutation = trpc.mosques.create.useMutation({
    onSuccess: () => {
      toast.success(
        user?.role === "service_requester"
          ? "تم إرسال طلب تسجيل المسجد بنجاح. سيتم مراجعته من قبل الجمعية."
          : "تم إرسال طلب تسجيل المسجد بنجاح. سيتم مراجعته من قبل الإدارة."
      );
      navigate(listHref);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const updateMutation = trpc.mosques.update.useMutation({
    onSuccess: () => {
      toast.success("تم تحديث بيانات المسجد بنجاح");
      navigate(listHref);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleChange = (field: keyof MosqueFormState, value: string | boolean) => {
    setFormData((prev) => applyMosqueFormChange(prev, field, value));

    if (field === "menLengthM" || field === "menWidthM") {
      const nextArea = applyMosqueFormChange(formData, field, value).area;
      if (!nextArea) {
        setErrors((prev) => {
          const updated = { ...prev };
          delete updated.area;
          return updated;
        });
      } else {
        const areaNum = parseFloat(nextArea);
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

    if (detectedCity && !cityExists) {
      toast.warning(`الموقع المحدد يتبع لـ "${detectedCity}"، وهي ليست ضمن القائمة المتاحة. يرجى اختيار المدينة يدوياً.`);
    }
  }, [availableCities]);

  const locationValue = useMemo(() => ({
    lat: formData.latitude ? parseFloat(formData.latitude) : 18.2164,
    lng: formData.longitude ? parseFloat(formData.longitude) : 42.5053,
  }), [formData.latitude, formData.longitude]);

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

  const handleTogglePrayerHall = () => {
    setFormData((prev) => {
      const isChecked = !prev.hasPrayerHall;
      return {
        ...prev,
        hasPrayerHall: isChecked,
        ...(isChecked
          ? {}
          : {
              womenPrayerArea: "",
              womenPrayerCapacity: "",
              womenLengthM: "",
              womenWidthM: "",
              womenPrayerNotes: "",
            }),
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
    if (
      formData.hasPrayerHall &&
      (!Number.isFinite(womenLengthVal) || womenLengthVal <= 0 || !Number.isFinite(womenWidthVal) || womenWidthVal <= 0)
    ) {
      toast.error("يرجى إدخال الطول بالمتر والعرض بالمتر لمصلى النساء");
      return;
    }

    const computedWomenArea = formData.hasPrayerHall
      ? Number((womenLengthVal * womenWidthVal).toFixed(2))
      : undefined;

    if (formData.hasPrayerHall && (!formData.womenPrayerCapacity || !computedWomenArea)) {
      toast.error("يرجى ملء الحقول المطلوبة لمصلى النساء (السعة والمساحة)");
      return;
    }

    const newErrors: Record<string, string> = {};
    if (isNaN(computedArea) || computedArea < 10 || computedArea > 10000) {
      newErrors.area = "المساحة يجب أن تكون بين 10 و 10000 متر مربع";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      toast.error("يرجى تصحيح الأخطاء في النموذج");
      return;
    }

    setErrors({});

    if (!isEdit && user?.role === "service_requester" && !canRegisterMore) {
      toast.error("لا يمكنك تقديم أكثر من طلب تسجيل مسجد واحد. يرجى التواصل مع الإدارة للحصول على استثناء.");
      return;
    }

    let finalNotes = formData.description || "";
    if (formData.hasPrayerHall) {
      const womenDetails = `\n\n[معلومات مصلى النساء]:\n- السعة: ${formData.womenPrayerCapacity ? formData.womenPrayerCapacity + " مصلية" : "غير محدد"}\n- المساحة: ${computedWomenArea ? computedWomenArea + " م²" : "غير محدد"}\n- ملاحظات إضافية: ${formData.womenPrayerNotes || "لا يوجد"}`;
      finalNotes += womenDetails;
    }

    const payload = {
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
    };

    if (isEdit) {
      updateMutation.mutate({ ...payload, id: mosqueId as number });
    } else {
      createMutation.mutate(payload);
    }
  };

  if (!isEdit && hasExistingMosque && user?.role === "service_requester" && !canRegisterMore) {
    return (
      <DashboardLayout>
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

          <Link href={listHref}>
            <Button className="rounded-2xl gradient-primary text-white font-bold px-8 h-11 shadow-md">
              العودة لقائمة المساجد
            </Button>
          </Link>
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

  const submitLabel = isEdit
    ? "حفظ التعديلات"
    : user?.role === "service_requester"
      ? "إرسال طلب تسجيل المسجد"
      : "حفظ المسجد";

  const submittingLabel = isEdit ? "جاري حفظ التعديلات..." : "جاري إرسال الطلب...";

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto">
        <div className="print:hidden flex items-center justify-between gap-2 sm:gap-4 mb-4 sm:mb-8 pb-3 sm:pb-4 border-b border-border/40">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
            <Link href={listHref}>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 sm:h-10 sm:w-10 rounded-xl hover:bg-muted shrink-0 text-foreground cursor-pointer"
                title="العودة لقائمة المساجد"
              >
                <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5" />
              </Button>
            </Link>
            <div className="min-w-0 flex-1">
              <h1 className="text-sm sm:text-2xl font-black text-foreground tracking-tight truncate">
                {isEdit ? "تعديل بيانات المسجد" : "تسجيل مسجد جديد"}
              </h1>
              <p className="text-[11px] sm:text-sm text-muted-foreground mt-0.5 hidden sm:block">
                {isEdit
                  ? "تعديل البيانات الأساسية والمكانية للمسجد"
                  : "إدخال البيانات الأساسية والمكانية للمسجد المراد تسجيله في المنصة"}
              </p>
            </div>
          </div>
        </div>

        <MosqueFormFields
          formData={formData}
          errors={errors}
          availableCities={availableCities}
          locationValue={locationValue}
          onFieldChange={handleChange}
          onCityChange={handleCityChange}
          onLocationChange={handleLocationChange}
          onTogglePrayerHall={handleTogglePrayerHall}
          onSubmit={handleSubmit}
          cancelHref={listHref}
          submitLabel={submitLabel}
          submittingLabel={submittingLabel}
          isSubmitting={createMutation.isPending || updateMutation.isPending}
          disableSubmit={checkingMosques}
        />
      </div>
    </DashboardLayout>
  );
}
