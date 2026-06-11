import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Palette, Upload, Eye, Save, X, Loader2, FileText, Building2, Star } from "lucide-react";
import { toast } from "sonner";
import { useState, useRef, useEffect } from "react";
import { trpc } from "@/lib/trpc";

// دالة مساعدة لتطبيق الألوان على متغيرات CSS
function applyColorsToDOM(colors: {
  colorPrimary1: string;
  colorPrimary2: string;
  colorSecondary1: string;
  colorSecondary2: string;
  colorSecondary3: string;
  colorSecondary4: string;
  colorSecondary5: string;
}) {
  const root = document.documentElement;
  // تحويل hex إلى oklch تقريبي (نستخدم CSS color-mix كبديل)
  // نضع الألوان مباشرة كـ hex في متغيرات مخصصة
  root.style.setProperty("--brand-primary-1", colors.colorPrimary1);
  root.style.setProperty("--brand-primary-2", colors.colorPrimary2);
  root.style.setProperty("--brand-secondary-1", colors.colorSecondary1);
  root.style.setProperty("--brand-secondary-2", colors.colorSecondary2);
  root.style.setProperty("--brand-secondary-3", colors.colorSecondary3);
  root.style.setProperty("--brand-secondary-4", colors.colorSecondary4);
  root.style.setProperty("--brand-secondary-5", colors.colorSecondary5);
  // تطبيق اللون الرئيسي الأول على --primary
  root.style.setProperty("--sidebar-primary", colors.colorPrimary1);
}

export default function Branding() {
  // الألوان الرئيسية (2) والثانوية (5)
  const [colorPrimary1, setColorPrimary1] = useState("#09707e");
  const [colorPrimary2, setColorPrimary2] = useState("#0891b2");
  const [colorSecondary1, setColorSecondary1] = useState("#6366f1");
  const [colorSecondary2, setColorSecondary2] = useState("#f59e0b");
  const [colorSecondary3, setColorSecondary3] = useState("#ef4444");
  const [colorSecondary4, setColorSecondary4] = useState("#8b5cf6");
  const [colorSecondary5, setColorSecondary5] = useState("#10b981");
  const [isSaving, setIsSaving] = useState(false);

  // حالات الشعارات
  const [mainLogo, setMainLogo] = useState<string | null>(null);
  const [whiteLogo, setWhiteLogo] = useState<string | null>(null);
  const [darkLogo, setDarkLogo] = useState<string | null>(null);
  const [uploading, setUploading] = useState<string | null>(null);

  // مراجع حقول الملفات
  const mainLogoRef = useRef<HTMLInputElement>(null);
  const whiteLogoRef = useRef<HTMLInputElement>(null);
  const darkLogoRef = useRef<HTMLInputElement>(null);

  // جلب إعدادات الجمعية
  const { data: orgSettings, refetch } = trpc.organization.getSettings.useQuery();
  const uploadLogoMutation = trpc.organization.uploadLogo.useMutation();
  const updateSettingsMutation = trpc.organization.updateSettings.useMutation();

  // تحميل الإعدادات الموجودة
  useEffect(() => {
    if (orgSettings) {
      if (orgSettings.logoUrl) setMainLogo(orgSettings.logoUrl);
      if (orgSettings.secondaryLogoUrl) setWhiteLogo(orgSettings.secondaryLogoUrl);
      if (orgSettings.stampUrl) setDarkLogo(orgSettings.stampUrl);
      // تحميل الألوان
      if ((orgSettings as any).colorPrimary1) setColorPrimary1((orgSettings as any).colorPrimary1);
      if ((orgSettings as any).colorPrimary2) setColorPrimary2((orgSettings as any).colorPrimary2);
      if ((orgSettings as any).colorSecondary1) setColorSecondary1((orgSettings as any).colorSecondary1);
      if ((orgSettings as any).colorSecondary2) setColorSecondary2((orgSettings as any).colorSecondary2);
      if ((orgSettings as any).colorSecondary3) setColorSecondary3((orgSettings as any).colorSecondary3);
      if ((orgSettings as any).colorSecondary4) setColorSecondary4((orgSettings as any).colorSecondary4);
      if ((orgSettings as any).colorSecondary5) setColorSecondary5((orgSettings as any).colorSecondary5);
    }
  }, [orgSettings]);

  // تطبيق الألوان على DOM عند تغييرها
  useEffect(() => {
    applyColorsToDOM({ colorPrimary1, colorPrimary2, colorSecondary1, colorSecondary2, colorSecondary3, colorSecondary4, colorSecondary5 });
  }, [colorPrimary1, colorPrimary2, colorSecondary1, colorSecondary2, colorSecondary3, colorSecondary4, colorSecondary5]);

  // دالة حفظ الألوان
  const handleSaveColors = async () => {
    if (!orgSettings) return;
    setIsSaving(true);
    try {
      await updateSettingsMutation.mutateAsync({
        organizationName: orgSettings.organizationName || "بوابة تمام",
        // الحفاظ على الشعارات الموجودة عند حفظ الألوان
        logoUrl: mainLogo || orgSettings.logoUrl || undefined,
        secondaryLogoUrl: whiteLogo || orgSettings.secondaryLogoUrl || undefined,
        stampUrl: darkLogo || orgSettings.stampUrl || undefined,
        colorPrimary1,
        colorPrimary2,
        colorSecondary1,
        colorSecondary2,
        colorSecondary3,
        colorSecondary4,
        colorSecondary5,
      });
      toast.success("تم حفظ الألوان وتطبيقها على البوابة");
      refetch();
    } catch (error) {
      toast.error("فشل في حفظ الألوان");
    } finally {
      setIsSaving(false);
    }
  };

  // دالة رفع الشعار
  const handleLogoUpload = async (
    file: File,
    type: "logo" | "secondaryLogo" | "stamp",
    setLogo: (url: string | null) => void
  ) => {
    const allowedImageMimes = ["image/jpeg", "image/png", "image/webp", "image/jpg"];
    const allowedImageExtensions = ["jpg", "jpeg", "png", "webp"];
    const extension = file.name.split(".").pop()?.toLowerCase() || "";

    if (!allowedImageMimes.includes(file.type) || !allowedImageExtensions.includes(extension)) {
      toast.error("الملف المرفوع ليس صورة صالحة. يسمح فقط بـ JPG, JPEG, PNG, WEBP.");
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast.error("حجم الملف يجب أن يكون أقل من 2MB");
      return;
    }
    setUploading(type);
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          resolve(result.split(",")[1]);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      const result = await uploadLogoMutation.mutateAsync({
        type,
        fileData: base64,
        fileName: file.name,
        mimeType: file.type,
      });
      if (result.success && result.url) {
        setLogo(result.url);
        toast.success("تم رفع الشعار بنجاح");
        refetch();
      }
    } catch (error: any) {
      console.error('[uploadLogo] Error:', error);
      const msg = error?.message || error?.data?.message || JSON.stringify(error);
      toast.error(`فشل في رفع الشعار: ${msg}`);
    } finally {
      setUploading(null);
    }
  };

  // دالة حذف الشعار
  const handleRemoveLogo = (
    type: "logo" | "secondaryLogo" | "stamp",
    setLogo: (url: string | null) => void
  ) => {
    setLogo(null);
    toast.success("تم حذف الشعار");
  };

  // مكوّن حقل اللون
  const ColorField = ({ label, value, onChange, description }: { label: string; value: string; onChange: (v: string) => void; description?: string }) => (
    <div className="space-y-1.5">
      <Label className="text-sm font-medium">{label}</Label>
      {description && <p className="text-xs text-muted-foreground">{description}</p>}
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-10 h-10 rounded-lg border cursor-pointer p-0.5 bg-transparent"
        />
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 font-mono text-sm"
          maxLength={7}
        />
        <div className="w-10 h-10 rounded-lg border shadow-sm flex-shrink-0" style={{ backgroundColor: value }} />
      </div>
    </div>
  );

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-6xl px-4 sm:px-0">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-foreground">الهوية البصرية</h1>
            <p className="text-sm text-muted-foreground">تخصيص الألوان والشعارات للبوابة</p>
          </div>
          <Button className="gradient-primary text-white w-full sm:w-auto order-first sm:order-last" onClick={handleSaveColors} disabled={isSaving}>
            {isSaving ? <Loader2 className="w-4 h-4 ml-2 animate-spin" /> : <Save className="w-4 h-4 ml-2" />}
            حفظ التغييرات
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* الألوان */}
          <Card className="border-0 shadow-sm overflow-hidden">
            <CardHeader className="p-4 sm:p-6 pb-2">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Palette className="w-5 h-5 text-primary" />
                الألوان
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm">لدى الجمعية لونان رئيسيان وخمسة ألوان ثانوية</CardDescription>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 space-y-5 sm:space-y-6">
              {/* الألوان الرئيسية */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 pb-1 border-b">
                  <div className="w-2 h-2 rounded-full bg-primary" />
                  <p className="text-sm font-semibold text-foreground">الألوان الرئيسية</p>
                </div>
                <div className="grid grid-cols-1 gap-4">
                  <ColorField label="اللون الرئيسي الأول" value={colorPrimary1} onChange={setColorPrimary1} description="يُستخدم في القائمة الجانبية والعناصر الأساسية" />
                  <ColorField label="اللون الرئيسي الثاني" value={colorPrimary2} onChange={setColorPrimary2} description="يُستخدم في التدرجات والعناصر التكميلية" />
                </div>
              </div>

              {/* الألوان الثانوية */}
              <div className="space-y-4 pt-2">
                <div className="flex items-center gap-2 pb-1 border-b">
                  <div className="w-2 h-2 rounded-full bg-purple-500" />
                  <p className="text-sm font-semibold text-foreground">الألوان الثانوية</p>
                </div>
                <div className="grid grid-cols-1 gap-4">
                  <ColorField label="اللون الثانوي 1" value={colorSecondary1} onChange={setColorSecondary1} />
                  <ColorField label="اللون الثانوي 2" value={colorSecondary2} onChange={setColorSecondary2} />
                  <ColorField label="اللون الثانوي 3" value={colorSecondary3} onChange={setColorSecondary3} />
                  <ColorField label="اللون الثانوي 4" value={colorSecondary4} onChange={setColorSecondary4} />
                  <ColorField label="اللون الثانوي 5" value={colorSecondary5} onChange={setColorSecondary5} />
                </div>
              </div>

              {/* معاينة الألوان */}
              <div className="p-4 rounded-xl border bg-muted/20">
                <p className="text-xs text-muted-foreground mb-3 font-bold uppercase tracking-wider">معاينة الألوان</p>
                <div className="flex flex-wrap gap-3">
                  {[
                    { color: colorPrimary1, label: "رئيسي 1" },
                    { color: colorPrimary2, label: "رئيسي 2" },
                    { color: colorSecondary1, label: "ثانوي 1" },
                    { color: colorSecondary2, label: "ثانوي 2" },
                    { color: colorSecondary3, label: "ثانوي 3" },
                    { color: colorSecondary4, label: "ثانوي 4" },
                    { color: colorSecondary5, label: "ثانوي 5" },
                  ].map(({ color, label }) => (
                    <div key={label} className="flex flex-col items-center gap-1.5">
                      <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl shadow-sm border-2 border-white dark:border-gray-800" style={{ backgroundColor: color }} />
                      <span className="text-[10px] sm:text-xs text-muted-foreground font-medium">{label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* الشعارات */}
          <Card className="border-0 shadow-sm overflow-hidden">
            <CardHeader className="p-4 sm:p-6 pb-2">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Upload className="w-5 h-5 text-primary" />
                الشعارات
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm">رفع شعارين: شعار رئيسي (ملون) وشعار أبيض (أيقونة)</CardDescription>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 space-y-6 sm:space-y-8">
              {/* الشعار الرئيسي */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-primary" />
                  <Label className="text-sm sm:text-base font-semibold">الشعار الرئيسي</Label>
                  <span className="text-[10px] sm:text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">ملون</span>
                </div>
                {mainLogo ? (
                  <div className="border-2 border-primary/20 rounded-2xl p-6 sm:p-10 relative bg-white shadow-inner group">
                    <img src={mainLogo} alt="الشعار الرئيسي" className="max-h-24 sm:max-h-32 mx-auto object-contain transition-transform group-hover:scale-105" />
                    <Button
                      variant="destructive"
                      size="icon"
                      className="absolute top-3 left-3 h-8 w-8 rounded-full shadow-lg"
                      onClick={() => handleRemoveLogo("logo", setMainLogo)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                    <p className="text-center text-[10px] sm:text-xs text-muted-foreground mt-4 font-medium">الشعار الرئيسي الملون</p>
                  </div>
                ) : (
                  <div
                    className="border-2 border-dashed border-primary/30 rounded-2xl p-8 sm:p-12 text-center hover:border-primary hover:bg-primary/5 transition-all cursor-pointer bg-white group"
                    onClick={() => mainLogoRef.current?.click()}
                  >
                    {uploading === "logo" ? (
                      <>
                        <Loader2 className="w-10 h-10 text-primary mx-auto mb-3 animate-spin" />
                        <p className="text-sm font-bold text-primary">جاري رفع الشعار...</p>
                      </>
                    ) : (
                      <>
                        <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                          <Upload className="w-8 h-8 text-primary" />
                        </div>
                        <p className="text-sm font-bold text-foreground">انقر لرفع الشعار الرئيسي</p>
                        <p className="text-xs text-muted-foreground mt-2">PNG, SVG (حد أقصى 2MB)</p>
                      </>
                    )}
                    <input
                      ref={mainLogoRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleLogoUpload(file, "logo", setMainLogo);
                        e.target.value = "";
                      }}
                    />
                  </div>
                )}
              </div>

              {/* الشعار الأبيض (أيقونة) */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-gray-700" />
                  <Label className="text-sm sm:text-base font-semibold">الشعار الأبيض (أيقونة)</Label>
                  <span className="text-[10px] sm:text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">أبيض</span>
                </div>
                {whiteLogo ? (
                  <div className="border-2 border-white/10 rounded-2xl p-6 sm:p-10 relative shadow-inner group" style={{ backgroundColor: colorPrimary1 }}>
                    <img src={whiteLogo} alt="الشعار الأبيض" className="max-h-24 sm:max-h-32 mx-auto object-contain transition-transform group-hover:scale-105" />
                    <Button
                      variant="destructive"
                      size="icon"
                      className="absolute top-3 left-3 h-8 w-8 rounded-full shadow-lg"
                      onClick={() => handleRemoveLogo("secondaryLogo", setWhiteLogo)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                    <p className="text-center text-[10px] sm:text-xs text-white/70 mt-4 font-medium">الشعار الأبيض للخلفيات الداكنة</p>
                  </div>
                ) : (
                  <div
                    className="border-2 border-dashed border-gray-400 rounded-2xl p-8 sm:p-12 text-center hover:border-gray-600 transition-all cursor-pointer group"
                    style={{ backgroundColor: colorPrimary1 + "15" }}
                    onClick={() => whiteLogoRef.current?.click()}
                  >
                    {uploading === "secondaryLogo" ? (
                      <>
                        <Loader2 className="w-10 h-10 text-gray-600 mx-auto mb-3 animate-spin" />
                        <p className="text-sm font-bold text-gray-600">جاري رفع الشعار...</p>
                      </>
                    ) : (
                      <>
                        <div className="w-16 h-16 rounded-2xl bg-gray-800/10 flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                          <Upload className="w-8 h-8 text-gray-500" />
                        </div>
                        <p className="text-sm font-bold text-foreground">انقر لرفع الشعار الأبيض</p>
                        <p className="text-xs text-muted-foreground mt-2">يفضل PNG بخلفية شفافة</p>
                      </>
                    )}
                    <input
                      ref={whiteLogoRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleLogoUpload(file, "secondaryLogo", setWhiteLogo);
                        e.target.value = "";
                      }}
                    />
                  </div>
                )}
              </div>

              {/* الختم / الطابع */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-amber-600" />
                  <Label className="text-sm sm:text-base font-semibold">الختم / الطابع الرسمي</Label>
                </div>
                {darkLogo ? (
                  <div className="border-2 border-amber-300/30 rounded-2xl p-6 sm:p-10 relative bg-white shadow-inner group">
                    <img src={darkLogo} alt="الختم" className="max-h-24 sm:max-h-32 mx-auto object-contain transition-transform group-hover:scale-105" />
                    <Button
                      variant="destructive"
                      size="icon"
                      className="absolute top-3 left-3 h-8 w-8 rounded-full shadow-lg"
                      onClick={() => handleRemoveLogo("stamp", setDarkLogo)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                    <p className="text-center text-[10px] sm:text-xs text-muted-foreground mt-4 font-medium">الختم الرسمي للوثائق</p>
                  </div>
                ) : (
                  <div
                    className="border-2 border-dashed border-amber-300 rounded-2xl p-8 sm:p-12 text-center hover:border-amber-500 hover:bg-amber-50/50 transition-all cursor-pointer bg-white group"
                    onClick={() => darkLogoRef.current?.click()}
                  >
                    {uploading === "stamp" ? (
                      <>
                        <Loader2 className="w-10 h-10 text-amber-600 mx-auto mb-3 animate-spin" />
                        <p className="text-sm font-bold text-amber-600">جاري رفع الختم...</p>
                      </>
                    ) : (
                      <>
                        <div className="w-16 h-16 rounded-2xl bg-amber-50 flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                          <Upload className="w-8 h-8 text-amber-500" />
                        </div>
                        <p className="text-sm font-bold text-foreground">انقر لرفع الختم الرسمي</p>
                        <p className="text-xs text-muted-foreground mt-2">PNG بخلفية شفافة</p>
                      </>
                    )}
                    <input
                      ref={darkLogoRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleLogoUpload(file, "stamp", setDarkLogo);
                        e.target.value = "";
                      }}
                    />
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* معاينة */}
        <Card className="border-0 shadow-sm overflow-hidden">
          <CardHeader className="p-4 sm:p-6 pb-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Eye className="w-5 h-5 text-primary" />
              معاينة الهوية البصرية
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">كيف ستظهر الهوية البصرية في البوابة</CardDescription>
          </CardHeader>
          <CardContent className="p-4 sm:p-6">
            <div className="rounded-2xl overflow-hidden border-2 shadow-sm">
              {/* معاينة الهيدر بلون رئيسي 1 */}
              <div className="h-16 sm:h-20 flex items-center px-4 sm:px-8" style={{ background: `linear-gradient(135deg, ${colorPrimary1} 0%, ${colorPrimary2} 100%)` }}>
                <div className="flex items-center gap-3 sm:gap-4">
                  {whiteLogo ? (
                    <img src={whiteLogo} alt="الشعار الأبيض" className="h-8 sm:h-10 w-auto" />
                  ) : mainLogo ? (
                    <img src={mainLogo} alt="الشعار" className="h-8 sm:h-10 w-auto opacity-90" />
                  ) : (
                    <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-white/20 flex items-center justify-center backdrop-blur-sm">
                      <span className="text-white font-bold text-lg">ت</span>
                    </div>
                  )}
                  <div className="text-white min-w-0">
                    <p className="font-bold text-xs sm:text-base truncate">{orgSettings?.organizationName || "بوابة تمام"}</p>
                    <p className="text-[10px] sm:text-xs opacity-70 truncate">{orgSettings?.organizationNameShort || "للعناية بالمساجد"}</p>
                  </div>
                </div>
              </div>

              {/* محتوى المعاينة */}
              <div className="p-4 sm:p-8 bg-muted/20">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                  {[
                    { color: colorPrimary1, icon: FileText, label: "اللون الرئيسي 1" },
                    { color: colorPrimary2, icon: Building2, label: "اللون الرئيسي 2" },
                    { color: colorSecondary1, icon: Star, label: "اللون الثانوي 1" },
                  ].map(({ color, icon: Icon, label }) => (
                    <div key={label} className="bg-white dark:bg-gray-900 rounded-xl p-4 shadow-sm border border-white/50">
                      <div className="w-10 h-10 rounded-xl mb-4 flex items-center justify-center" style={{ backgroundColor: color + "15" }}>
                        <Icon className="w-5 h-5" style={{ color }} />
                      </div>
                      <p className="font-bold text-sm sm:text-base mb-1">{label}</p>
                      <p className="text-[10px] sm:text-xs text-muted-foreground font-mono uppercase tracking-tight">{color}</p>
                    </div>
                  ))}
                </div>
                {/* شريط الألوان الثانوية */}
                <div className="space-y-3">
                  <p className="text-[10px] sm:text-xs text-muted-foreground font-bold uppercase tracking-widest px-1">تدرج الألوان الثانوية</p>
                  <div className="flex gap-2 sm:gap-3 h-10 sm:h-12">
                    {[colorSecondary1, colorSecondary2, colorSecondary3, colorSecondary4, colorSecondary5].map((color, i) => (
                      <div key={i} className="flex-1 rounded-lg shadow-sm border-2 border-white dark:border-gray-800 transition-transform hover:scale-105" style={{ backgroundColor: color }} title={`ثانوي ${i + 1}: ${color}`} />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
