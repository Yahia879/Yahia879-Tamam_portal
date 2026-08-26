import { useState, useEffect, useMemo } from "react";
import { useParams, Link, useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  ShieldAlert, 
  Loader2, 
  ArrowRight,
  Sparkles,
  Calendar,
  LogOut,
  User,
  HelpCircle,
  MessageSquare,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { useAuth } from "@/_core/hooks/useAuth";
import { useTheme } from "@/contexts/ThemeContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

const RATING_LABELS: Record<number, { label: string; description: string; color: string }> = {
  1: { label: "غير راضي جداً", description: "تجربة غير مرضية ولم نتمكن من تلبيتها بالشكل المطلوب", color: "text-red-500 border-red-200 bg-red-50 dark:bg-red-950/30 dark:border-red-900/50" },
  2: { label: "غير راضي", description: "هناك عدة ملاحظات على جودة الخدمة أو زمن التنفيذ", color: "text-amber-600 border-amber-200 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-900/50" },
  3: { label: "محايد", description: "الخدمة مقبولة بوجه عام ولكن تحتاج لتحسينات", color: "text-yellow-600 border-yellow-200 bg-yellow-50 dark:bg-yellow-950/30 dark:border-yellow-900/50" },
  4: { label: "راضي", description: "خدمة ممتازة وتم إنجاز العمل بالشكل المناسب", color: "text-emerald-600 border-emerald-200 bg-emerald-50 dark:bg-emerald-950/30 dark:border-emerald-900/50" },
  5: { label: "راضي جداً", description: "تجربة استثنائية وجودة عالية تفوق التوقعات", color: "text-teal-600 border-teal-200 bg-teal-50 dark:bg-teal-950/30 dark:border-teal-900/50" },
};

export default function RequestEvaluation() {
  const params = useParams<{ requestId: string }>();
  const requestId = parseInt(params.requestId || "0", 10);
  const { user, logout } = useAuth();
  const [, setLocation] = useLocation();
  const { theme, toggleTheme, switchable } = useTheme();

  const utils = trpc.useUtils();

  const { data, isLoading, error } = trpc.requests.getBeneficiaryEvaluation.useQuery(
    { requestId },
    { enabled: !!requestId && !isNaN(requestId) }
  );

  const { data: formConfig, isLoading: isConfigLoading } = trpc.forms.getEvaluationFormConfig.useQuery();

  const { data: orgSettings } = trpc.organization.getSettings.useQuery();
  const mainLogoSrc = orgSettings?.logoUrl || '/logo.svg';
  const orgName = orgSettings?.organizationName || 'بوابة تمام';
  const orgNameShort = orgSettings?.organizationNameShort || 'للعناية بالمساجد';

  // القيم المدخلة للنموذج الديناميكي
  const [formValues, setFormValues] = useState<Record<string, any>>({});
  const [hoverRating, setHoverRating] = useState<Record<string, number>>({});

  // التهيأة التلقائية لقيم الحقول الافتراضية
  useEffect(() => {
    if (data?.request) {
      const initialServiceName = data.request.mosqueName 
        ? `مسجد ${data.request.mosqueName}` 
        : (data.request.descriptiveName || data.request.programType || `طلب خدمة رقم #${data.request.requestNumber || data.request.id}`);

      setFormValues((prev) => ({
        ...prev,
        beneficiaryName: prev.beneficiaryName || user?.name || "",
        beneficiaryPhone: prev.beneficiaryPhone || user?.phone || (user as any)?.mobileNumber || "",
        beneficiaryEmail: prev.beneficiaryEmail || user?.email || "",
        serviceName: prev.serviceName || initialServiceName,
      }));
    }
  }, [data, user]);

  const activeFields = useMemo(() => {
    if (!formConfig?.fields) return [];
    return [...formConfig.fields]
      .filter((f) => f.isActive)
      .sort((a, b) => a.order - b.order);
  }, [formConfig]);

  const submitMutation = trpc.requests.submitBeneficiaryEvaluation.useMutation({
    onSuccess: (res) => {
      toast.success(res.message);
      utils.requests.getBeneficiaryEvaluation.invalidate({ requestId });
    },
    onError: (err) => {
      toast.error(err.message || "حدث خطأ أثناء إرسال التقييم");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // التحقق من الحقول الإجبارية
    for (const field of activeFields) {
      if (field.required) {
        const val = formValues[field.id];
        if (val === undefined || val === null || val === "" || (field.type === "rating" && Number(val) === 0)) {
          toast.error(`يرجى الإجابة على الحقل الإجباري: "${field.label}"`);
          return;
        }
      }
    }

    submitMutation.mutate({
      requestId,
      beneficiaryName: formValues.beneficiaryName ? String(formValues.beneficiaryName).trim() : undefined,
      beneficiaryPhone: formValues.beneficiaryPhone ? String(formValues.beneficiaryPhone).trim() : undefined,
      serviceName: formValues.serviceName ? String(formValues.serviceName).trim() : (data?.request?.mosqueName || "طلب خدمة"),
      beneficiaryEmail: formValues.beneficiaryEmail ? String(formValues.beneficiaryEmail).trim() : undefined,
      servicesRating: typeof formValues.servicesRating === "number" && formValues.servicesRating > 0 ? formValues.servicesRating : undefined,
      speedRating: typeof formValues.speedRating === "number" && formValues.speedRating > 0 ? formValues.speedRating : undefined,
      communicationRating: typeof formValues.communicationRating === "number" && formValues.communicationRating > 0 ? formValues.communicationRating : undefined,
      overallSatisfaction: typeof formValues.overallSatisfaction === "number" && formValues.overallSatisfaction > 0 ? formValues.overallSatisfaction : undefined,
      comments: formValues.comments ? String(formValues.comments).trim() : undefined,
      answers: formValues,
    });
  };

  const parsedSurvey = useMemo(() => {
    if (!data?.existingEvaluation?.notes) return null;
    try {
      return JSON.parse(data.existingEvaluation.notes);
    } catch {
      return { comments: data.existingEvaluation.notes };
    }
  }, [data?.existingEvaluation?.notes]);

  const existingAnswers = parsedSurvey?.answers || parsedSurvey || {};

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-background text-foreground flex flex-col justify-between">
      {/* شريط التنقل العلوي */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b border-border shadow-xs">
        <div className="container max-w-5xl mx-auto px-4">
          <div className="flex items-center justify-between h-14 sm:h-16">
            <Link href="/" className="flex items-center gap-2 sm:gap-3 min-w-0">
              <img 
                src={mainLogoSrc} 
                alt="شعار الجمعية" 
                className="h-8 w-8 sm:h-10 sm:w-auto shrink-0 object-contain"
              />
              <div className="min-w-0">
                <h1 className="font-bold text-sm sm:text-lg text-foreground truncate">{orgName}</h1>
                <p className="hidden sm:block text-[10px] text-muted-foreground truncate">{orgNameShort}</p>
              </div>
            </Link>

            <div className="flex items-center gap-2 sm:gap-3">
              {user?.role === "service_requester" ? (
                <Link href="/requester">
                  <Button variant="outline" size="sm" className="gap-2 text-xs font-bold rounded-lg h-9">
                    <ArrowRight className="w-4 h-4" />
                    لوحة طلباتي
                  </Button>
                </Link>
              ) : (
                <Link href={`/requests/${requestId}`}>
                  <Button variant="outline" size="sm" className="gap-2 text-xs font-bold rounded-lg h-9">
                    <ArrowRight className="w-4 h-4" />
                    العودة للطلب
                  </Button>
                </Link>
              )}

              {/* القائمة المنسدلة لحساب المستخدم */}
              {user ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="rounded-full h-8 w-8 sm:h-9 sm:w-9">
                      <Avatar className="h-8 w-8 sm:h-9 sm:w-9 border border-border">
                        <AvatarFallback className="bg-primary/10 text-primary font-bold text-xs">
                          {user.name ? user.name.charAt(0) : <User className="w-4 h-4" />}
                        </AvatarFallback>
                      </Avatar>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56 text-right">
                    <div className="p-2 border-b border-border">
                      <p className="font-bold text-xs text-foreground truncate">{user.name}</p>
                      <p className="text-[10px] text-muted-foreground truncate">{user.email || user.phone}</p>
                    </div>
                    <DropdownMenuItem asChild>
                      <Link href="/profile" className="cursor-pointer flex items-center gap-2 text-xs">
                        <User className="w-4 h-4" />
                        <span>الملف الشخصي</span>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem 
                      onClick={() => logout()}
                      className="cursor-pointer text-destructive focus:text-destructive flex items-center gap-2 text-xs"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>تسجيل الخروج</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : null}
            </div>
          </div>
        </div>
      </header>

      {/* المحتوى الرئيسي */}
      <main className="container max-w-3xl mx-auto px-4 py-8 flex-1">
        {isLoading || isConfigLoading ? (
          <div className="flex flex-col items-center justify-center min-h-[300px] gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">جاري تحميل استبيان التقييم...</p>
          </div>
        ) : error ? (
          <Card className="border-destructive/20 bg-destructive/5 shadow-md">
            <CardHeader className="text-center pb-2">
              <div className="w-12 h-12 rounded-full bg-destructive/10 text-destructive flex items-center justify-center mx-auto mb-2">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <CardTitle className="text-lg text-destructive font-bold">تعذر عرض التقييم</CardTitle>
              <CardDescription className="text-xs">{error.message}</CardDescription>
            </CardHeader>
            <CardFooter className="flex justify-center pb-6">
              <Link href={user?.role === "service_requester" ? "/requester" : "/requests"}>
                <Button variant="outline" size="sm">
                  العودة للرئيسية
                </Button>
              </Link>
            </CardFooter>
          </Card>
        ) : data && data.request && (
          <>
            {/* في حال تم التقييم سابقاً */}
            {data.request.isEvaluated || data.existingEvaluation ? (
              <div className="rounded-2xl border border-slate-200/90 shadow-2xl bg-white dark:bg-card text-slate-900 dark:text-foreground overflow-hidden font-sans">
                {/* 1. Header Banner مع الشعار */}
                <div
                  className="text-white p-6 sm:p-8 flex flex-col items-center justify-center relative shadow-inner"
                  style={{ backgroundColor: formConfig?.headerBgColor || "#14707a" }}
                >
                  <img 
                    src={mainLogoSrc} 
                    alt="شعار الجمعية" 
                    className="h-16 sm:h-20 w-auto object-contain brightness-0 invert"
                  />
                  <div className="absolute left-4 top-4">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs sm:text-sm font-bold bg-white/20 backdrop-blur-md text-white border border-white/30">
                      <Star className="w-4 h-4 fill-amber-300 text-amber-300" />
                      <span>{data.existingEvaluation?.rating || data.request.satisfactionRating || 5} من 5 نجوم</span>
                    </span>
                  </div>
                </div>

                <div className="p-6 sm:p-8 space-y-6">
                  {/* 2. العنوان والنص الترحيبي والتأكيد */}
                  <div className="text-center space-y-2">
                    <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20 text-xs font-bold mb-1">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      <span>{formConfig?.successTitle || "تم تسجيل استبيان التقييم بنجاح"}</span>
                    </div>
                    <h2 className="text-xl sm:text-2xl font-bold text-slate-800 dark:text-foreground">
                      {formConfig?.title || "قياس رضا المستفيدين من خدمات الجمعية"}
                    </h2>
                    {formConfig?.description && (
                      <p className="text-xs sm:text-[13px] text-slate-600 dark:text-muted-foreground leading-relaxed max-w-xl mx-auto">
                        {formConfig.description}
                      </p>
                    )}
                    <div className="pt-2 flex items-center justify-center gap-2.5 flex-wrap text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-muted border border-border font-mono font-bold text-foreground">
                        <FileText className="w-3.5 h-3.5 text-primary" />
                        {data.request.requestNumber}
                      </span>
                      {data.request.mosqueName && (
                        <span className="inline-flex items-center gap-1 font-medium">
                          <Building2 className="w-3.5 h-3.5 text-primary" />
                          {data.request.mosqueName}
                        </span>
                      )}
                      <span className="inline-flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-primary" />
                        {data.existingEvaluation?.createdAt
                          ? format(new Date(data.existingEvaluation.createdAt), "dd MMMM yyyy", { locale: ar })
                          : data.request.evaluatedAt
                          ? format(new Date(data.request.evaluatedAt), "dd MMMM yyyy", { locale: ar })
                          : "مسجل"}
                      </span>
                    </div>
                  </div>

                  <hr className="border-t border-dotted border-slate-300 dark:border-border" />

                  {/* 3. عرض جميع أسئلة الاستبيان وإجاباتها المسجلة */}
                  <div className="space-y-4">
                    {activeFields.map((field) => {
                      let ans = existingAnswers[field.id];
                      if (ans === undefined) {
                        if (field.id === "beneficiaryName") ans = parsedSurvey?.beneficiaryName || data.request.userId;
                        else if (field.id === "beneficiaryPhone") ans = parsedSurvey?.beneficiaryPhone;
                        else if (field.id === "beneficiaryEmail") ans = parsedSurvey?.beneficiaryEmail;
                        else if (field.id === "serviceName") ans = parsedSurvey?.serviceName || data.request.mosqueName || data.request.descriptiveName;
                        else if (field.id === "servicesRating") ans = parsedSurvey?.servicesRating;
                        else if (field.id === "speedRating") ans = parsedSurvey?.speedRating;
                        else if (field.id === "communicationRating") ans = parsedSurvey?.communicationRating;
                        else if (field.id === "overallSatisfaction") ans = parsedSurvey?.overallSatisfaction || data.existingEvaluation?.rating || data.request.satisfactionRating;
                        else if (field.id === "comments") ans = parsedSurvey?.comments;
                      }

                      if (ans === undefined || ans === null || ans === "") return null;

                      return (
                        <div key={field.id} className="p-3.5 sm:p-4 rounded-xl bg-slate-50 dark:bg-muted/30 border border-slate-200/80 dark:border-border/70 space-y-1.5 text-right">
                          <span className="text-xs sm:text-sm font-bold text-slate-800 dark:text-foreground block">
                            {field.label}
                          </span>

                          {/* تقييم بالنجوم */}
                          {field.type === "rating" && (
                            <div className="flex items-center gap-1.5 py-1 justify-end" dir="ltr">
                              {Array.from({ length: field.maxRating || 5 }).map((_, sIdx) => {
                                const starVal = sIdx + 1;
                                const active = Number(ans) >= starVal;
                                return (
                                  <Star
                                    key={starVal}
                                    className={`w-7 h-7 ${
                                      active
                                        ? "text-amber-400 fill-amber-400 drop-shadow-[0_1px_2px_rgba(251,191,36,0.5)]"
                                        : "text-slate-300 dark:text-slate-700 fill-none stroke-[1.2]"
                                    }`}
                                  />
                                );
                              })}
                              <span className="text-xs sm:text-sm font-bold text-amber-700 dark:text-amber-300 mr-2">
                                {ans} من {field.maxRating || 5}
                              </span>
                            </div>
                          )}

                          {/* خيارات أو قوائم */}
                          {["select", "radio"].includes(field.type) && (
                            <div className="font-bold text-xs sm:text-sm text-foreground bg-white dark:bg-card p-2.5 rounded-lg border border-border/60">
                              {field.options?.find((o) => o.value === ans)?.label || String(ans)}
                            </div>
                          )}

                          {/* نصوص / هاتف / بريد / رقم */}
                          {["text", "phone", "email", "number"].includes(field.type) && (
                            <div className="font-bold text-xs sm:text-sm text-foreground bg-white dark:bg-card p-2.5 rounded-lg border border-border/60" dir={field.type === "phone" || field.type === "email" ? "ltr" : "rtl"}>
                              {String(ans)}
                            </div>
                          )}

                          {/* نص طويل / ملاحظات */}
                          {field.type === "textarea" && (
                            <div className="p-3 rounded-lg bg-amber-500/5 border border-amber-500/20 text-xs sm:text-sm italic text-foreground leading-relaxed">
                              "{String(ans)}"
                            </div>
                          )}

                          {/* مربع اختيار */}
                          {field.type === "checkbox" && (
                            <div className="font-bold text-xs sm:text-sm text-foreground bg-white dark:bg-card p-2.5 rounded-lg border border-border/60">
                              {ans ? "نعم / أوافق" : "لا"}
                            </div>
                          )}
                        </div>
                      );
                    })}

                    {/* في حال وجود تعليقات إضافية غير مدرجة بالحقول */}
                    {parsedSurvey?.comments && !activeFields.some((f) => f.id === "comments") && (
                      <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 space-y-1 text-right">
                        <span className="text-xs font-bold text-amber-800 dark:text-amber-300 block flex items-center gap-1.5">
                          <MessageSquare className="w-3.5 h-3.5" />
                          <span>آراء ومقترحات المستفيد:</span>
                        </span>
                        <p className="text-xs sm:text-sm text-foreground italic leading-relaxed">
                          "{parsedSurvey.comments}"
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="pt-4 flex justify-center border-t border-border">
                    <Link href={user?.role === "service_requester" ? "/requester" : `/requests/${requestId}`}>
                      <Button variant="outline" className="gap-2 font-bold rounded-xl px-6">
                        <ArrowRight className="w-4 h-4" />
                        {user?.role === "service_requester" ? "العودة للوحة التحكم" : "العودة لصفحة الطلب"}
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            ) : (
              /* نموذج تقديم استبيان التقييم الديناميكي المباشر */
              <div className="rounded-2xl border border-slate-200/90 shadow-2xl bg-white dark:bg-card text-slate-900 dark:text-foreground overflow-hidden font-sans">
                {/* 1. Header Banner مع الشعار */}
                <div
                  className="text-white p-6 sm:p-8 flex flex-col items-center justify-center relative shadow-inner"
                  style={{ backgroundColor: formConfig?.headerBgColor || "#14707a" }}
                >
                  <img 
                    src={mainLogoSrc} 
                    alt="شعار الجمعية" 
                    className="h-16 sm:h-20 w-auto object-contain brightness-0 invert"
                  />
                </div>

                <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-6">
                  {/* 2. العنوان والنص الترحيبي */}
                  <div className="text-center space-y-2">
                    <h2 className="text-xl sm:text-2xl font-bold text-slate-800 dark:text-foreground">
                      {formConfig?.title || "قياس رضا المستفيدين من خدمات الجمعية"}
                    </h2>
                    {formConfig?.description && (
                      <p className="text-xs sm:text-[13px] text-slate-600 dark:text-muted-foreground leading-relaxed max-w-xl mx-auto">
                        {formConfig.description}
                      </p>
                    )}
                  </div>

                  <hr className="border-t border-dotted border-slate-300 dark:border-border" />

                  {/* 3. عرض جميع الحقول المخصصة والنشطة */}
                  <div className="space-y-5">
                    {activeFields.map((field) => {
                      const value = formValues[field.id];
                      const currentHover = hoverRating[field.id] || 0;

                      return (
                        <div key={field.id} className="space-y-1.5 text-right">
                          <Label className="text-xs sm:text-sm font-bold text-slate-800 dark:text-foreground block">
                            {field.label}
                            {field.required && <span className="text-rose-600 mr-1">*</span>}
                          </Label>

                          {field.helpText && (
                            <p className="text-[11px] text-slate-500 dark:text-muted-foreground leading-normal">
                              {field.helpText}
                            </p>
                          )}

                          {/* 1. حقل تقييم بالنجوم */}
                          {field.type === "rating" && (
                            <div className="space-y-1">
                              <div className="flex items-center gap-1.5 py-1 justify-end" dir="ltr">
                                {Array.from({ length: field.maxRating || 5 }).map((_, sIdx) => {
                                  const starVal = sIdx + 1;
                                  const active = (currentHover || value || 0) >= starVal;

                                  return (
                                    <button
                                      key={starVal}
                                      type="button"
                                      onClick={() =>
                                        setFormValues((prev) => ({
                                          ...prev,
                                          [field.id]: starVal,
                                        }))
                                      }
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
                                        className={`w-8 h-8 transition-all ${
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

                          {/* 2. حقل نصي / رقم / بريد / هاتف */}
                          {["text", "phone", "email", "number"].includes(field.type) && (
                            <Input
                              type={
                                field.type === "number"
                                  ? "number"
                                  : field.type === "email"
                                  ? "email"
                                  : field.type === "phone"
                                  ? "tel"
                                  : "text"
                              }
                              value={value || ""}
                              onChange={(e) =>
                                setFormValues((prev) => ({
                                  ...prev,
                                  [field.id]: e.target.value,
                                }))
                              }
                              placeholder={field.placeholder || ""}
                              required={field.required}
                              dir={["phone", "email", "number"].includes(field.type) ? "ltr" : "rtl"}
                              className="bg-[#fcfbf7] dark:bg-muted/40 border-slate-200 dark:border-border focus:border-[#14707a] rounded-md h-10 text-right"
                            />
                          )}

                          {/* 3. حقل نص طويل / مساحة حرة */}
                          {field.type === "textarea" && (
                            <Textarea
                              value={value || ""}
                              onChange={(e) =>
                                setFormValues((prev) => ({
                                  ...prev,
                                  [field.id]: e.target.value,
                                }))
                              }
                              rows={4}
                              placeholder={field.placeholder || ""}
                              required={field.required}
                              className="bg-[#fcfbf7] dark:bg-muted/40 border-slate-200 dark:border-border focus:border-[#14707a] rounded-md text-sm text-right leading-relaxed"
                            />
                          )}

                          {/* 4. قائمة منسدلة Select */}
                          {field.type === "select" && (
                            <Select
                              value={value || ""}
                              onValueChange={(val) =>
                                setFormValues((prev) => ({ ...prev, [field.id]: val }))
                              }
                            >
                              <SelectTrigger className="bg-[#fcfbf7] dark:bg-muted/40 border-slate-200 dark:border-border rounded-md h-10 text-right">
                                <SelectValue placeholder={field.placeholder || "اختر من القائمة..."} />
                              </SelectTrigger>
                              <SelectContent>
                                {field.options?.map((opt, oIdx) => (
                                  <SelectItem key={oIdx} value={opt.value}>
                                    {opt.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}

                          {/* 5. اختيار أحادي Radio */}
                          {field.type === "radio" && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                              {field.options?.map((opt, oIdx) => {
                                const selected = value === opt.value;
                                return (
                                  <button
                                    key={oIdx}
                                    type="button"
                                    onClick={() =>
                                      setFormValues((prev) => ({
                                        ...prev,
                                        [field.id]: opt.value,
                                      }))
                                    }
                                    className={`flex items-center gap-2 p-3 rounded-lg border text-right transition-all ${
                                      selected
                                        ? "border-[#14707a] bg-[#14707a]/10 text-[#14707a] dark:text-cyan-400 font-bold shadow-xs"
                                        : "border-slate-200 dark:border-border bg-[#fcfbf7] dark:bg-muted/40 hover:bg-slate-100 text-slate-800 dark:text-foreground"
                                    }`}
                                  >
                                    <div
                                      className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                                        selected ? "border-[#14707a]" : "border-slate-400"
                                      }`}
                                    >
                                      {selected && <div className="w-2 h-2 rounded-full bg-[#14707a]" />}
                                    </div>
                                    <span className="text-xs sm:text-sm">{opt.label}</span>
                                  </button>
                                );
                              })}
                            </div>
                          )}

                          {/* 6. مربع اختيار Checkbox */}
                          {field.type === "checkbox" && (
                            <div className="flex items-center gap-2 pt-1">
                              <input
                                type="checkbox"
                                id={`input_${field.id}`}
                                checked={Boolean(value)}
                                onChange={(e) =>
                                  setFormValues((prev) => ({
                                    ...prev,
                                    [field.id]: e.target.checked,
                                  }))
                                }
                                className="w-4 h-4 rounded border-slate-300 text-[#14707a] focus:ring-[#14707a]"
                              />
                              <label
                                htmlFor={`input_${field.id}`}
                                className="text-xs sm:text-sm text-slate-800 dark:text-foreground font-medium cursor-pointer"
                              >
                                {field.placeholder || "أوافق / نعم"}
                              </label>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* 4. زر إرسال */}
                  <div className="flex items-center justify-end pt-4 border-t border-slate-100 dark:border-border">
                    <Button
                      type="submit"
                      disabled={submitMutation.isPending}
                      className="bg-[#2a68a5] hover:bg-[#205386] text-white font-bold text-sm px-8 py-2.5 rounded-md shadow-sm transition-all"
                    >
                      {submitMutation.isPending ? (
                        <div className="flex items-center gap-2">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>جاري الإرسال...</span>
                        </div>
                      ) : (
                        formConfig?.submitButtonText || "إرسال التقييم"
                      )}
                    </Button>
                  </div>
                </form>
              </div>
            )}
          </>
        )}
      </main>

      {/* تذييل الصفحة */}
      <footer className="py-6 border-t bg-white/50 dark:bg-card/50">
        <div className="container mx-auto px-4 text-center">
          <p className="text-xs sm:text-sm text-muted-foreground">
            جمعية عمارة المساجد بمنطقة عسير (منارة) - بوابة تمام للعناية بالمساجد
          </p>
        </div>
      </footer>
    </div>
  );
}
