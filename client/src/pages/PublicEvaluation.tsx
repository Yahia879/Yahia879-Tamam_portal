import React, { useState, useEffect, useMemo } from "react";
import { Link, useLocation, useSearch } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Star,
  CheckCircle2,
  Building2,
  FileText,
  Loader2,
  ArrowRight,
  Sparkles,
  HeartHandshake,
  User,
  Phone,
  Mail,
  HelpCircle,
  MessageSquare,
  Check,
  Send,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { useAuth } from "@/_core/hooks/useAuth";

const RATING_LABELS: Record<number, { label: string; description: string; color: string }> = {
  1: { label: "غير راضي جداً", description: "تجربة غير مرضية", color: "text-red-500 border-red-200 bg-red-50" },
  2: { label: "غير راضي", description: "هناك ملاحظات على جودة الخدمة", color: "text-amber-600 border-amber-200 bg-amber-50" },
  3: { label: "محايد", description: "الخدمة مقبولة بوجه عام", color: "text-yellow-600 border-yellow-200 bg-yellow-50" },
  4: { label: "راضي", description: "خدمة ممتازة وتم إنجاز العمل بالشكل المناسب", color: "text-emerald-600 border-emerald-200 bg-emerald-50" },
  5: { label: "راضي جداً", description: "تجربة استثنائية وجودة تفوق التوقعات", color: "text-teal-600 border-teal-200 bg-teal-50" },
};

export default function PublicEvaluation() {
  const { user } = useAuth();
  const searchString = useSearch();
  const searchParams = useMemo(() => new URLSearchParams(searchString), [searchString]);
  
  const rawRequestId = searchParams.get("requestId") || searchParams.get("req") || searchParams.get("id");
  const requestId = rawRequestId ? parseInt(rawRequestId, 10) : null;
  const prefilledService = searchParams.get("service") || searchParams.get("program") || "";
  const prefilledMosque = searchParams.get("mosque") || "";

  const { data: formConfig, isLoading: isConfigLoading } = trpc.forms.getEvaluationFormConfig.useQuery();
  const { data: orgSettings } = trpc.organization.getSettings.useQuery();

  const [formValues, setFormValues] = useState<Record<string, any>>({});
  const [hoverRating, setHoverRating] = useState<Record<string, number>>({});
  const [isSubmitted, setIsSubmitted] = useState(false);

  // تهيئة القيم الافتراضية
  useEffect(() => {
    setFormValues((prev) => ({
      ...prev,
      beneficiaryName: prev.beneficiaryName || user?.name || "",
      beneficiaryPhone: prev.beneficiaryPhone || user?.phone || (user as any)?.mobileNumber || "",
      beneficiaryEmail: prev.beneficiaryEmail || user?.email || "",
      serviceName: prev.serviceName || prefilledService || (prefilledMosque ? `مسجد ${prefilledMosque}` : ""),
    }));
  }, [user, prefilledService, prefilledMosque]);

  const activeFields = useMemo(() => {
    if (!formConfig?.fields) return [];
    return [...formConfig.fields]
      .filter((f) => f.isActive)
      .sort((a, b) => a.order - b.order);
  }, [formConfig]);

  const submitMutation = trpc.requests.submitPublicBeneficiaryEvaluation.useMutation({
    onSuccess: (res) => {
      setIsSubmitted(true);
      toast.success(res.message || "تم استلام تقييمكم بنجاح!");
      window.scrollTo({ top: 0, behavior: "smooth" });
    },
    onError: (err) => {
      toast.error(err.message || "حدث خطأ أثناء إرسال التقييم، يرجى المحاولة مرة أخرى.");
    },
  });

  const handleInputChange = (fieldId: string, value: any) => {
    setFormValues((prev) => ({
      ...prev,
      [fieldId]: value,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // التحقق من الحقول الإلزامية
    for (const field of activeFields) {
      if (field.required) {
        const val = formValues[field.id];
        if (
          val === undefined ||
          val === null ||
          val === "" ||
          (field.type === "rating" && Number(val) === 0)
        ) {
          toast.error(`يرجى الإجابة على الحقل المطلوب: "${field.label}"`);
          return;
        }
      }
    }

    submitMutation.mutate({
      requestId: requestId && !isNaN(requestId) ? requestId : null,
      beneficiaryName: formValues.beneficiaryName ? String(formValues.beneficiaryName).trim() : undefined,
      beneficiaryPhone: formValues.beneficiaryPhone ? String(formValues.beneficiaryPhone).trim() : undefined,
      serviceName: formValues.serviceName ? String(formValues.serviceName).trim() : (prefilledMosque || undefined),
      beneficiaryEmail: formValues.beneficiaryEmail ? String(formValues.beneficiaryEmail).trim() : undefined,
      servicesRating: typeof formValues.servicesRating === "number" && formValues.servicesRating > 0 ? formValues.servicesRating : undefined,
      speedRating: typeof formValues.speedRating === "number" && formValues.speedRating > 0 ? formValues.speedRating : undefined,
      communicationRating: typeof formValues.communicationRating === "number" && formValues.communicationRating > 0 ? formValues.communicationRating : undefined,
      overallSatisfaction: typeof formValues.overallSatisfaction === "number" && formValues.overallSatisfaction > 0 ? formValues.overallSatisfaction : undefined,
      comments: formValues.comments ? String(formValues.comments).trim() : undefined,
      answers: formValues,
    });
  };

  const renderField = (field: any) => {
    const value = formValues[field.id];

    if (field.type === "rating") {
      const currentRating = Number(value) || 0;
      const hovered = hoverRating[field.id] || 0;
      const displayRating = hovered || currentRating;
      const ratingInfo = RATING_LABELS[displayRating];

      return (
        <div key={field.id} className="p-4 sm:p-5 rounded-2xl bg-card border border-border shadow-2xs space-y-3 sm:col-span-2">
          <div className="flex items-start justify-between gap-2">
            <Label className="text-sm sm:text-base font-bold text-foreground flex items-center gap-1.5">
              <span>{field.label}</span>
              {field.required && <span className="text-destructive font-bold">*</span>}
            </Label>
          </div>
          {field.helpText && (
            <p className="text-xs text-muted-foreground">{field.helpText}</p>
          )}

          {/* النجوم التفاعلية */}
          <div className="flex items-center justify-center gap-2 sm:gap-3 py-2" dir="ltr">
            {[1, 2, 3, 4, 5].map((star) => {
              const isFilled = (hoverRating[field.id] || currentRating) >= star;
              return (
                <button
                  key={star}
                  type="button"
                  onClick={() => handleInputChange(field.id, star)}
                  onMouseEnter={() => setHoverRating((prev) => ({ ...prev, [field.id]: star }))}
                  onMouseLeave={() => setHoverRating((prev) => ({ ...prev, [field.id]: 0 }))}
                  className="p-1 sm:p-2 rounded-xl transition-all duration-150 transform hover:scale-125 active:scale-95 cursor-pointer focus:outline-none"
                  title={`${star} من 5`}
                >
                  <Star
                    className={`w-8 h-8 sm:w-10 sm:h-10 transition-colors duration-150 ${
                      isFilled
                        ? "fill-amber-400 text-amber-400 drop-shadow-sm"
                        : "text-slate-300 dark:text-slate-700 hover:text-amber-200"
                    }`}
                  />
                </button>
              );
            })}
          </div>

          {/* التسمية التوضيحية للتقييم */}
          {ratingInfo && (
            <div className="text-center animate-in fade-in duration-200">
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${ratingInfo.color}`}>
                <span>{ratingInfo.label}</span>
                <span className="opacity-75 font-normal">({ratingInfo.description})</span>
              </span>
            </div>
          )}
        </div>
      );
    }

    if (field.type === "textarea") {
      return (
        <div key={field.id} className="space-y-1.5 sm:col-span-2">
          <Label htmlFor={field.id} className="text-xs sm:text-sm font-bold text-foreground flex items-center gap-1">
            <span>{field.label}</span>
            {field.required && <span className="text-destructive font-bold">*</span>}
          </Label>
          <Textarea
            id={field.id}
            rows={4}
            placeholder={field.placeholder || "اكتب ملاحظاتك ومقترحاتك هنا..."}
            value={value || ""}
            onChange={(e) => handleInputChange(field.id, e.target.value)}
            required={field.required}
            className="min-h-[100px] rounded-xl border-border focus:border-primary focus:ring-2 focus:ring-primary/20 bg-background transition-all text-right leading-relaxed p-3.5 text-xs sm:text-sm"
          />
          {field.helpText && (
            <p className="text-[11px] text-muted-foreground">{field.helpText}</p>
          )}
        </div>
      );
    }

    if (field.type === "radio") {
      return (
        <div key={field.id} className="space-y-2 sm:col-span-2 p-4 rounded-2xl bg-card border border-border">
          <Label className="text-xs sm:text-sm font-bold text-foreground flex items-center gap-1">
            <span>{field.label}</span>
            {field.required && <span className="text-destructive font-bold">*</span>}
          </Label>
          {field.helpText && (
            <p className="text-[11px] text-muted-foreground">{field.helpText}</p>
          )}
          <RadioGroup
            value={value || ""}
            onValueChange={(val) => handleInputChange(field.id, val)}
            className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1"
            dir="rtl"
          >
            {field.options?.map((opt: any, idx: number) => (
              <div
                key={idx}
                onClick={() => handleInputChange(field.id, opt.value)}
                className={`flex items-center gap-2.5 p-3 rounded-xl border transition-all cursor-pointer select-none active:scale-[0.99] ${
                  value === opt.value
                    ? "bg-primary/10 border-primary font-bold shadow-xs text-primary"
                    : "border-border hover:bg-muted/40 text-foreground"
                }`}
              >
                <RadioGroupItem value={opt.value} id={`${field.id}_${idx}`} />
                <Label htmlFor={`${field.id}_${idx}`} className="text-xs sm:text-sm cursor-pointer select-none">
                  {opt.label}
                </Label>
              </div>
            ))}
          </RadioGroup>
        </div>
      );
    }

    if (field.type === "select") {
      return (
        <div key={field.id} className="space-y-1.5">
          <Label htmlFor={field.id} className="text-xs sm:text-sm font-bold text-foreground flex items-center gap-1">
            <span>{field.label}</span>
            {field.required && <span className="text-destructive font-bold">*</span>}
          </Label>
          <Select value={value || ""} onValueChange={(val) => handleInputChange(field.id, val)}>
            <SelectTrigger className="h-11 rounded-xl text-right border-border bg-background focus:border-primary text-xs sm:text-sm px-3.5">
              <SelectValue placeholder={field.placeholder || "اختر من القائمة..."} />
            </SelectTrigger>
            <SelectContent dir="rtl">
              {field.options?.map((opt: any, idx: number) => (
                <SelectItem key={idx} value={opt.value} className="text-xs sm:text-sm">
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {field.helpText && (
            <p className="text-[11px] text-muted-foreground">{field.helpText}</p>
          )}
        </div>
      );
    }

    if (field.type === "checkbox") {
      return (
        <div key={field.id} className="sm:col-span-2">
          <div
            onClick={() => handleInputChange(field.id, !value)}
            className={`p-3.5 sm:p-4 rounded-xl border-2 transition-all cursor-pointer select-none flex items-center justify-between gap-3 active:scale-[0.99] ${
              value
                ? "bg-primary/5 border-primary shadow-xs"
                : "border-border hover:bg-muted/40"
            }`}
          >
            <div className="min-w-0">
              <p className="text-xs sm:text-sm font-bold text-foreground leading-tight">
                {field.label}
              </p>
              {field.helpText && (
                <p className="text-[11px] text-muted-foreground mt-0.5">{field.helpText}</p>
              )}
            </div>
            <div
              className={`w-5 h-5 rounded-lg border-2 flex items-center justify-center shrink-0 transition-all ${
                value ? "bg-primary border-primary text-white" : "border-slate-300 dark:border-slate-600"
              }`}
            >
              {value && <Check className="w-3.5 h-3.5 stroke-[3]" />}
            </div>
          </div>
        </div>
      );
    }

    if (field.type === "phone") {
      return (
        <div key={field.id} className="space-y-1.5">
          <Label htmlFor={field.id} className="text-xs sm:text-sm font-bold text-foreground flex items-center gap-1">
            <Phone className="w-3.5 h-3.5 text-muted-foreground" />
            <span>{field.label}</span>
            {field.required && <span className="text-destructive font-bold">*</span>}
          </Label>
          <Input
            id={field.id}
            type="tel"
            dir="ltr"
            maxLength={10}
            placeholder={field.placeholder || "05XXXXXXXX"}
            value={value || ""}
            onChange={(e) => handleInputChange(field.id, e.target.value)}
            required={field.required}
            className="h-11 rounded-xl text-left border-border bg-background focus:border-primary font-mono text-xs sm:text-sm px-3.5"
          />
          <p className="text-[10.5px] sm:text-[11px] text-muted-foreground">
            {field.helpText || "صيغة: 05XXXXXXXX (10 أرقام)"}
          </p>
        </div>
      );
    }

    if (field.type === "email") {
      return (
        <div key={field.id} className="space-y-1.5">
          <Label htmlFor={field.id} className="text-xs sm:text-sm font-bold text-foreground flex items-center gap-1">
            <Mail className="w-3.5 h-3.5 text-muted-foreground" />
            <span>{field.label}</span>
            {field.required && <span className="text-destructive font-bold">*</span>}
          </Label>
          <Input
            id={field.id}
            type="email"
            dir="ltr"
            placeholder={field.placeholder || "name@example.com"}
            value={value || ""}
            onChange={(e) => handleInputChange(field.id, e.target.value)}
            required={field.required}
            className="h-11 rounded-xl text-left border-border bg-background focus:border-primary font-mono text-xs sm:text-sm px-3.5"
          />
          {field.helpText && (
            <p className="text-[11px] text-muted-foreground">{field.helpText}</p>
          )}
        </div>
      );
    }

    return (
      <div key={field.id} className="space-y-1.5">
        <Label htmlFor={field.id} className="text-xs sm:text-sm font-bold text-foreground flex items-center gap-1">
          <span>{field.label}</span>
          {field.required && <span className="text-destructive font-bold">*</span>}
        </Label>
        <Input
          id={field.id}
          type={field.type === "number" ? "number" : field.type === "date" ? "date" : "text"}
          placeholder={field.placeholder || ""}
          value={value || ""}
          onChange={(e) => handleInputChange(field.id, e.target.value)}
          required={field.required}
          className="h-11 rounded-xl text-right border-border bg-background focus:border-primary text-xs sm:text-sm px-3.5"
        />
        {field.helpText && (
          <p className="text-[11px] text-muted-foreground">{field.helpText}</p>
        )}
      </div>
    );
  };

  const mainLogoSrc = orgSettings?.logoUrl || "/logo.svg";
  const orgName = orgSettings?.organizationName || "بوابة منارة";
  const headerBg = formConfig?.headerBgColor || "#14707a";

  if (isConfigLoading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-zinc-950 flex items-center justify-center p-4">
        <div className="text-center space-y-3">
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
          <p className="text-sm font-bold text-muted-foreground">جاري تحميل الاستبيان...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100/70 dark:bg-zinc-950 text-foreground flex flex-col justify-between py-6 px-3 sm:px-6">
      <div className="max-w-2xl w-full mx-auto space-y-5">
        {/* الترويسة وشعار المنظمة */}
        <div className="text-center space-y-2 pt-2">
          <Link href="/">
            <img
              src={mainLogoSrc}
              alt={orgName}
              className="h-16 sm:h-20 mx-auto object-contain transition-transform hover:scale-105"
            />
          </Link>
          <h1 className="text-base sm:text-xl font-black text-foreground">
            {orgName}
          </h1>
          <p className="text-xs text-muted-foreground">
            استبيان قياس رضا المستفيدين وتقييم جودة الخدمات
          </p>
        </div>

        {/* شاشة النجاح عند إتمام التقييم */}
        {isSubmitted ? (
          <Card className="border border-border shadow-xl rounded-3xl overflow-hidden bg-card text-center p-6 sm:p-10 space-y-5 animate-in zoom-in-95 duration-300">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center mx-auto ring-8 ring-emerald-500/5">
              <CheckCircle2 className="w-10 h-10 sm:w-12 sm:h-12" />
            </div>

            <div className="space-y-2">
              <h2 className="text-xl sm:text-2xl font-black text-foreground">
                {formConfig?.successTitle || "تم تقييم الخدمة بنجاح"}
              </h2>
              <p className="text-xs sm:text-sm text-muted-foreground max-w-md mx-auto leading-relaxed">
                {formConfig?.successMessage ||
                  "شكراً لجهودكم ومشاركتكم القيمة. تم تسجيل استبيان تقييمكم لطلب الخدمة بنجاح."}
              </p>
            </div>

            <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setFormValues({});
                  setIsSubmitted(false);
                }}
                className="w-full sm:w-auto text-xs font-bold rounded-xl h-10 px-5"
              >
                تعبئة استبيان آخر
              </Button>
              <Link href="/">
                <Button
                  type="button"
                  className="w-full sm:w-auto text-xs font-bold rounded-xl h-10 px-6 bg-primary text-primary-foreground"
                >
                  الرئيسية
                </Button>
              </Link>
            </div>
          </Card>
        ) : (
          /* كرت الاستبيان الرئيسي */
          <Card className="border border-border/80 shadow-xl rounded-3xl overflow-hidden bg-card text-right">
            {/* الشريط اللوني الترحيبي للاستبيان */}
            <div
              className="p-6 sm:p-8 text-white relative overflow-hidden"
              style={{ backgroundColor: headerBg }}
            >
              <div className="relative z-10 space-y-2 text-right">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 backdrop-blur text-white text-xs font-bold border border-white/20">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>رأيكم يهمنا ويصنع الفارق</span>
                </div>
                <h2 className="text-lg sm:text-2xl font-black text-white leading-tight">
                  {formConfig?.title || "قياس رضا المستفيدين من خدمات الجمعية"}
                </h2>
                {formConfig?.description && (
                  <p className="text-xs sm:text-sm text-white/90 leading-relaxed max-w-xl">
                    {formConfig.description}
                  </p>
                )}
              </div>
            </div>

            <CardContent className="p-4 sm:p-7 space-y-6">
              <form onSubmit={handleSubmit} className="space-y-5">
                {/* الحقول والأسئلة النشطة */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {activeFields.map(renderField)}
                </div>

                {/* زر الإرسال */}
                <Button
                  type="submit"
                  disabled={submitMutation.isPending}
                  className="w-full text-white font-bold h-12 rounded-xl shadow-md hover:shadow-lg transition-all text-sm sm:text-base flex items-center justify-center gap-2 cursor-pointer mt-4"
                  style={{ backgroundColor: headerBg }}
                >
                  {submitMutation.isPending ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>جاري إرسال التقييم...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>{formConfig?.submitButtonText || "إرسال التقييم"}</span>
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {/* تذييل الصفحة */}
        <div className="text-center pt-2 pb-4 text-xs text-muted-foreground">
          <p>© {new Date().getFullYear()} {orgName} - جميع الحقوق محفوظة</p>
        </div>
      </div>
    </div>
  );
}
