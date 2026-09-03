import React, { useState, useEffect, useMemo } from "react";
import { Link, useSearch } from "wouter";
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
  Loader2,
  Send,
  Check,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { useAuth } from "@/_core/hooks/useAuth";

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

  const mainLogoSrc = orgSettings?.logoUrl || "/logo.svg";

  const queryName = searchParams.get("name") || "";
  const queryPhone = searchParams.get("phone") || "";
  const queryEmail = searchParams.get("email") || "";
  const queryType = searchParams.get("type") || "";

  // تهيئة القيم التلقائية
  useEffect(() => {
    let defaultService = prefilledService || (prefilledMosque ? `مسجد ${prefilledMosque}` : "");
    if (!defaultService) {
      if (queryType === "donor") defaultService = "خدمات التبرع والدعم";
      else if (queryType === "inquiry") defaultService = "خدمات الاستفسار والتواصل";
      else if (queryType === "approved_beneficiary") defaultService = "خدمات المستفيدين وعمارة المساجد";
    }

    setFormValues((prev) => ({
      ...prev,
      beneficiaryName: prev.beneficiaryName || user?.name || queryName || "",
      beneficiaryPhone: prev.beneficiaryPhone || user?.phone || (user as any)?.mobileNumber || queryPhone || "",
      beneficiaryEmail: prev.beneficiaryEmail || user?.email || queryEmail || "",
      serviceName: prev.serviceName || defaultService,
    }));
  }, [user, prefilledService, prefilledMosque, queryName, queryPhone, queryEmail, queryType]);

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

  if (isConfigLoading) {
    return (
      <div className="min-h-screen bg-slate-100/70 dark:bg-zinc-950 flex items-center justify-center p-4">
        <div className="text-center space-y-3">
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
          <p className="text-sm font-bold text-muted-foreground">جاري تحميل الاستبيان...</p>
        </div>
      </div>
    );
  }

  const headerBgColor = formConfig?.headerBgColor || "#14707a";

  return (
    <div className="min-h-screen bg-slate-100/70 dark:bg-zinc-950 text-slate-900 dark:text-foreground py-8 px-3 sm:px-6 flex flex-col justify-between">
      <div className="max-w-2xl w-full mx-auto space-y-6">
        {/* شاشة النجاح عند إتمام التقييم */}
        {isSubmitted ? (
          <div className="rounded-3xl border border-slate-200/90 shadow-2xl bg-white dark:bg-card text-slate-900 dark:text-foreground overflow-hidden font-sans animate-in zoom-in-95 duration-300">
            {/* Header Banner مع الشعار واللون المخصص */}
            <div
              className="text-white p-6 sm:p-8 flex flex-col items-center justify-center relative shadow-inner transition-colors"
              style={{ backgroundColor: headerBgColor }}
            >
              <img
                src={mainLogoSrc}
                alt="شعار الجمعية"
                className="h-14 sm:h-16 w-auto object-contain brightness-0 invert"
              />
            </div>

            <div className="p-6 sm:p-10 text-center space-y-5">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center mx-auto ring-8 ring-emerald-500/5">
                <CheckCircle2 className="w-10 h-10 sm:w-12 sm:h-12" />
              </div>

              <div className="space-y-2">
                <h2 className="text-xl sm:text-2xl font-bold text-slate-800 dark:text-foreground">
                  {formConfig?.successTitle || "تم تقييم الخدمة بنجاح"}
                </h2>
                <p className="text-xs sm:text-[13px] text-slate-600 dark:text-muted-foreground leading-relaxed max-w-md mx-auto">
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
                    className="w-full sm:w-auto text-xs font-bold rounded-xl h-10 px-6 text-white"
                    style={{ backgroundColor: headerBgColor }}
                  >
                    الرئيسية
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        ) : (
          /* استمارة التقييم الرئيسية المطابقة تماماً للمعاينة الحية */
          <div className="rounded-3xl border border-slate-200/90 shadow-2xl bg-white dark:bg-card text-slate-900 dark:text-foreground overflow-hidden font-sans">
            {/* Header Banner مع الشعار واللون المخصص */}
            <div
              className="text-white p-6 sm:p-8 flex flex-col items-center justify-center relative shadow-inner transition-colors"
              style={{ backgroundColor: headerBgColor }}
            >
              <img
                src={mainLogoSrc}
                alt="شعار الجمعية"
                className="h-14 sm:h-16 w-auto object-contain brightness-0 invert"
              />
            </div>

            <div className="p-6 sm:p-8 space-y-6">
              {/* العنوان والوصف */}
              <div className="text-center space-y-2">
                <h2 className="text-lg sm:text-xl font-bold text-slate-800 dark:text-foreground">
                  {formConfig?.title || "قياس رضا المستفيدين من خدمات الجمعية"}
                </h2>
                {formConfig?.description && (
                  <p className="text-xs sm:text-[13px] text-slate-600 dark:text-muted-foreground leading-relaxed max-w-xl mx-auto">
                    {formConfig.description}
                  </p>
                )}
              </div>

              <hr className="border-t border-dotted border-slate-300 dark:border-border" />

              {/* الحقول والأسئلة النشطة */}
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-6">
                  {activeFields.map((field) => {
                    const value = formValues[field.id];
                    const currentHover = hoverRating[field.id] || 0;

                    return (
                      <div key={field.id} className="space-y-2 text-right">
                        <Label className="text-xs sm:text-sm font-bold text-slate-800 dark:text-foreground block">
                          {field.label}
                          {field.required && <span className="text-rose-600 mr-1">*</span>}
                        </Label>

                        {field.helpText && (
                          <p className="text-[11px] text-slate-500 dark:text-muted-foreground leading-normal">
                            {field.helpText}
                          </p>
                        )}

                        {/* 1. تقييم النجوم ⭐ التفاعلي */}
                        {field.type === "rating" && (
                          <div className="space-y-2">
                            <div className="flex items-center gap-1.5 py-1 justify-end" dir="ltr">
                              {Array.from({ length: field.maxRating || 5 }).map((_, sIdx) => {
                                const starVal = sIdx + 1;
                                const active = (currentHover || value || 0) >= starVal;

                                return (
                                  <button
                                    key={starVal}
                                    type="button"
                                    onClick={() => handleInputChange(field.id, starVal)}
                                    onMouseEnter={() =>
                                      setHoverRating((prev) => ({
                                        ...prev,
                                        [field.id]: starVal,
                                      }))
                                    }
                                    onMouseLeave={() =>
                                      setHoverRating((prev) => ({
                                        ...prev,
                                        [field.id]: 0,
                                      }))
                                    }
                                    className="p-1 transition-transform hover:scale-125 focus:outline-none cursor-pointer"
                                  >
                                    <Star
                                      className={`w-7 h-7 sm:w-8 sm:h-8 transition-all ${
                                        active
                                          ? "text-amber-400 fill-amber-400 drop-shadow-[0_1px_3px_rgba(251,191,36,0.5)]"
                                          : "text-slate-300 dark:text-slate-600 fill-none stroke-[1.2]"
                                      }`}
                                    />
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {/* 2. حقول النصوص والأرقام والبريد والهاتف */}
                        {["text", "email", "phone", "number", "date"].includes(field.type) && (
                          <Input
                            type={
                              field.type === "number"
                                ? "number"
                                : field.type === "email"
                                ? "email"
                                : field.type === "phone"
                                ? "tel"
                                : field.type === "date"
                                ? "date"
                                : "text"
                            }
                            value={value || ""}
                            onChange={(e) => handleInputChange(field.id, e.target.value)}
                            placeholder={field.placeholder || "..."}
                            required={field.required}
                            className="h-11 rounded-xl text-xs sm:text-sm bg-slate-50/50 dark:bg-background border-slate-300 dark:border-border text-right"
                          />
                        )}

                        {/* 3. حقل النص الطويل / الملاحظات */}
                        {field.type === "textarea" && (
                          <Textarea
                            value={value || ""}
                            onChange={(e) => handleInputChange(field.id, e.target.value)}
                            placeholder={field.placeholder || "اكتب ملاحظاتك أو مقترحاتك هنا..."}
                            rows={3}
                            required={field.required}
                            className="rounded-xl text-xs sm:text-sm bg-slate-50/50 dark:bg-background border-slate-300 dark:border-border leading-relaxed p-3.5 text-right"
                          />
                        )}

                        {/* 4. خيارات الراديو */}
                        {field.type === "radio" && (
                          <RadioGroup
                            value={value || ""}
                            onValueChange={(val) => handleInputChange(field.id, val)}
                            className="grid grid-cols-2 gap-2.5"
                            dir="rtl"
                          >
                            {(field.options && field.options.length > 0
                              ? field.options
                              : [
                                  { label: "ممتاز", value: "excellent" },
                                  { label: "جيد جداً", value: "very_good" },
                                  { label: "جيد", value: "good" },
                                  { label: "مقبول", value: "acceptable" },
                                ]
                            ).map((opt: any) => (
                              <label
                                key={opt.value}
                                className={`flex items-center justify-between p-3 rounded-xl border-2 cursor-pointer text-xs font-bold transition-all ${
                                  value === opt.value
                                    ? "border-primary bg-primary/10 text-primary"
                                    : "border-slate-200 dark:border-border hover:bg-slate-50"
                                }`}
                              >
                                <div className="flex items-center gap-2">
                                  <RadioGroupItem value={opt.value} />
                                  <span>{opt.label}</span>
                                </div>
                              </label>
                            ))}
                          </RadioGroup>
                        )}

                        {/* 5. القائمة المنسدلة Select */}
                        {field.type === "select" && (
                          <Select value={value || ""} onValueChange={(val) => handleInputChange(field.id, val)}>
                            <SelectTrigger className="h-11 rounded-xl text-xs sm:text-sm bg-slate-50/50 dark:bg-background border-slate-300 dark:border-border text-right">
                              <SelectValue placeholder={field.placeholder || "اختر..."} />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl border-border" dir="rtl">
                              {field.options?.map((opt: any) => (
                                <SelectItem key={opt.value} value={opt.value} className="text-xs sm:text-sm font-medium">
                                  {opt.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}

                        {/* 6. مربع الاختيار Checkbox */}
                        {field.type === "checkbox" && (
                          <div
                            onClick={() => handleInputChange(field.id, !value)}
                            className={`p-3.5 rounded-xl border-2 transition-all cursor-pointer select-none flex items-center justify-between gap-3 ${
                              value
                                ? "bg-primary/5 border-primary shadow-xs"
                                : "border-slate-200 dark:border-border hover:bg-slate-50"
                            }`}
                          >
                            <span className="text-xs sm:text-sm font-bold text-slate-800 dark:text-foreground">
                              {field.label}
                            </span>
                            <div
                              className={`w-5 h-5 rounded-lg border-2 flex items-center justify-center shrink-0 transition-all ${
                                value ? "bg-primary border-primary text-white" : "border-slate-300 dark:border-slate-600"
                              }`}
                            >
                              {value && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* زر الإرسال */}
                <div className="pt-4 border-t border-slate-200 dark:border-border">
                  <Button
                    type="submit"
                    disabled={submitMutation.isPending}
                    className="w-full h-12 rounded-2xl font-bold text-xs sm:text-sm gap-2 shadow-md text-white cursor-pointer"
                    style={{ backgroundColor: headerBgColor }}
                  >
                    {submitMutation.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>جاري إرسال التقييم...</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        <span>{formConfig?.submitButtonText || "إرسال التقييم"}</span>
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* تذييل الصفحة */}
        <div className="text-center pb-4 text-xs text-muted-foreground">
          <p>© {new Date().getFullYear()} {orgSettings?.organizationName || "بوابة منارة"} - جميع الحقوق محفوظة</p>
        </div>
      </div>
    </div>
  );
}
