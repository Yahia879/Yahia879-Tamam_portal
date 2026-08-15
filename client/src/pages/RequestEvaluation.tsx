import { useState, useEffect } from "react";
import { useParams, Link } from "wouter";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Star, 
  CheckCircle2, 
  Building2, 
  FileText, 
  ShieldAlert, 
  Loader2, 
  ArrowRight,
  Sparkles,
  Calendar
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { useAuth } from "@/_core/hooks/useAuth";

const RATING_LABELS: Record<number, { label: string; description: string; emoji: string; color: string }> = {
  1: { label: "غير راضي جداً", description: "تجربة غير مرضية ولم نتمكن من تلبيتها بالشكل المطلوب", emoji: "😞", color: "text-red-500 border-red-200 bg-red-50 dark:bg-red-950/30 dark:border-red-900/50" },
  2: { label: "غير راضي", description: "هناك عدة ملاحظات على جودة الخدمة أو زمن التنفيذ", emoji: "🙁", color: "text-amber-600 border-amber-200 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-900/50" },
  3: { label: "محايد", description: "الخدمة مقبولة بوجه عام ولكن تحتاج لتحسينات", emoji: "😐", color: "text-yellow-600 border-yellow-200 bg-yellow-50 dark:bg-yellow-950/30 dark:border-yellow-900/50" },
  4: { label: "راضي", description: "خدمة ممتازة وتم إنجاز العمل بالشكل المناسب", emoji: "🙂", color: "text-emerald-600 border-emerald-200 bg-emerald-50 dark:bg-emerald-950/30 dark:border-emerald-900/50" },
  5: { label: "راضي جداً", description: "تجربة استثنائية وجودة عالية تفوق التوقعات", emoji: "😍", color: "text-teal-600 border-teal-200 bg-teal-50 dark:bg-teal-950/30 dark:border-teal-900/50" },
};

export default function RequestEvaluation() {
  const params = useParams<{ requestId: string }>();
  const requestId = parseInt(params.requestId || "0", 10);
  const { user } = useAuth();

  const [beneficiaryName, setBeneficiaryName] = useState<string>("");
  const [beneficiaryPhone, setBeneficiaryPhone] = useState<string>("");
  const [serviceName, setServiceName] = useState<string>("");
  const [beneficiaryEmail, setBeneficiaryEmail] = useState<string>("");

  const [servicesRating, setServicesRating] = useState<number>(0);
  const [hoverServicesRating, setHoverServicesRating] = useState<number>(0);

  const [speedRating, setSpeedRating] = useState<number>(0);
  const [hoverSpeedRating, setHoverSpeedRating] = useState<number>(0);

  const [communicationRating, setCommunicationRating] = useState<number>(0);
  const [hoverCommunicationRating, setHoverCommunicationRating] = useState<number>(0);

  const [overallSatisfaction, setOverallSatisfaction] = useState<number>(0);
  const [hoverOverallSatisfaction, setHoverOverallSatisfaction] = useState<number>(0);

  const [comments, setComments] = useState<string>("");

  const utils = trpc.useUtils();

  const { data, isLoading, error } = trpc.requests.getBeneficiaryEvaluation.useQuery(
    { requestId },
    { enabled: !!requestId && !isNaN(requestId) }
  );

  const { data: orgSettings } = trpc.organization.getSettings.useQuery();
  const mainLogoSrc = orgSettings?.logoUrl || '/logo.svg';

  useEffect(() => {
    if (data?.request) {
      setBeneficiaryName(user?.name || "");
      setBeneficiaryPhone(user?.phone || (user as any)?.mobileNumber || "");
      const initialServiceName = data.request.mosqueName 
        ? `مسجد ${data.request.mosqueName}` 
        : (data.request.descriptiveName || data.request.programType || `طلب خدمة رقم #${data.request.requestNumber || data.request.id}`);
      setServiceName(initialServiceName);
      setBeneficiaryEmail(user?.email || "");
    }
  }, [data, user]);

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
    if (!serviceName.trim()) {
      toast.error("يرجى إدخال اسم المسجد/المشروع/الخدمة");
      return;
    }
    if (speedRating === 0) {
      toast.error("يرجى الإجابة على: ما مدى تقييمك لسرعة تلبية طلبك؟");
      return;
    }
    if (communicationRating === 0) {
      toast.error("يرجى الإجابة على: ما مدى سرعة تواصل موظفي الجمعية معك؟");
      return;
    }
    if (overallSatisfaction === 0) {
      toast.error("يرجى الإجابة على: ما مدى رضاك بشكل عام عن الجمعية؟");
      return;
    }

    submitMutation.mutate({
      requestId,
      beneficiaryName: beneficiaryName.trim() || undefined,
      beneficiaryPhone: beneficiaryPhone.trim() || undefined,
      serviceName: serviceName.trim(),
      beneficiaryEmail: beneficiaryEmail.trim() || undefined,
      servicesRating: servicesRating > 0 ? servicesRating : undefined,
      speedRating,
      communicationRating,
      overallSatisfaction,
      comments: comments.trim() || undefined,
    });
  };

  const parsedSurvey = (() => {
    if (!data?.existingEvaluation?.notes) return null;
    try {
      return JSON.parse(data.existingEvaluation.notes);
    } catch {
      return { comments: data.existingEvaluation.notes };
    }
  })();

  return (
    <DashboardLayout>
      <div className="container max-w-2xl mx-auto py-8 px-4 sm:px-6" dir="rtl">
        {/* العودة للوحة التحكم أو الطلبات */}
        <div className="mb-6 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <Link href={`/requests/${requestId}`}>
              <Button variant="outline" size="sm" className="gap-2 text-xs font-semibold rounded-xl">
                <ArrowRight className="w-4 h-4" />
                العودة للطلب #{data?.request?.requestNumber || requestId}
              </Button>
            </Link>

            <Link href="/requester">
              <Button variant="ghost" size="sm" className="gap-2 text-xs text-muted-foreground hover:text-foreground">
                لوحة طلباتي
              </Button>
            </Link>
          </div>
        </div>

        {/* حالة التحميل */}
        {isLoading && (
          <Card className="border-border/60 shadow-lg">
            <CardContent className="p-12 text-center">
              <Loader2 className="w-10 h-10 animate-spin text-primary mx-auto mb-4" />
              <p className="text-muted-foreground font-medium text-sm">جاري تحميل بيانات تقييم الطلب...</p>
            </CardContent>
          </Card>
        )}

        {/* خطأ عدم الصلاحية أو عدم وجود الطلب */}
        {error && (
          <Card className="border-destructive/30 bg-destructive/5 shadow-lg">
            <CardContent className="p-8 text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-destructive/10 text-destructive flex items-center justify-center mx-auto">
                <ShieldAlert className="w-8 h-8" />
              </div>
              <h2 className="text-xl font-bold text-foreground">تعذر فتح صفحة التقييم</h2>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                {error.message || "عفواً، لا يتاح التقييم إلا للمستفيد صاحب الطلب وللطلبات المغلقة فقط."}
              </p>
              <div className="pt-2">
                <Link href="/requester">
                  <Button className="gap-2">
                    العودة لطلباتي
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        )}

        {/* عند النجاح في جلب البيانات */}
        {data && data.request && (
          <>
            {/* في حال تم التقييم سابقاً */}
            {data.request.isEvaluated || data.existingEvaluation ? (
              <Card className="border-emerald-500/20 bg-gradient-to-b from-emerald-500/5 to-transparent shadow-xl overflow-hidden">
                <CardHeader className="text-center pb-4 border-b border-border/40 bg-emerald-500/10">
                  <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto mb-3 shadow-inner">
                    <CheckCircle2 className="w-10 h-10" />
                  </div>
                  <CardTitle className="text-2xl font-bold text-foreground flex items-center justify-center gap-2">
                    تم تقييم الخدمة بنجاح
                    <Sparkles className="w-5 h-5 text-amber-500 animate-pulse" />
                  </CardTitle>
                  <CardDescription className="text-muted-foreground text-sm max-w-lg mx-auto">
                    شكراً لجهودكم ومشاركتكم القيمة. تم تسجيل استبيان تقييمكم لطلب الخدمة بنجاح.
                  </CardDescription>
                </CardHeader>

                <CardContent className="p-6 sm:p-8 space-y-6">
                  {/* ملخص الطلب */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 rounded-xl bg-muted/40 border border-border/50 text-sm">
                    <div className="flex items-center gap-3">
                      <FileText className="w-4 h-4 text-primary shrink-0" />
                      <div>
                        <span className="text-muted-foreground text-xs block">رقم الطلب:</span>
                        <span className="font-semibold">{data.request.requestNumber}</span>
                      </div>
                    </div>

                    {data.request.mosqueName && (
                      <div className="flex items-center gap-3">
                        <Building2 className="w-4 h-4 text-primary shrink-0" />
                        <div>
                          <span className="text-muted-foreground text-xs block">المسجد:</span>
                          <span className="font-semibold">{data.request.mosqueName}</span>
                        </div>
                      </div>
                    )}

                    <div className="flex items-center gap-3">
                      <Calendar className="w-4 h-4 text-primary shrink-0" />
                      <div>
                        <span className="text-muted-foreground text-xs block">تاريخ التقييم:</span>
                        <span className="font-semibold">
                          {data.existingEvaluation?.createdAt
                            ? format(new Date(data.existingEvaluation.createdAt), "dd MMMM yyyy", { locale: ar })
                            : data.request.evaluatedAt
                            ? format(new Date(data.request.evaluatedAt), "dd MMMM yyyy", { locale: ar })
                            : "مسجل"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* تفاصيل التقييم المسجل */}
                  <div className="space-y-4 p-6 rounded-2xl bg-amber-500/5 border border-amber-500/20 text-right">
                    <div className="text-center space-y-2">
                      <span className="text-xs font-semibold text-muted-foreground block">التقييم العام المسجل:</span>
                      <div className="flex items-center justify-center gap-1.5" dir="ltr">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            className={`w-7 h-7 ${
                              star <= (data.existingEvaluation?.rating || data.request.satisfactionRating || 0)
                                ? "fill-amber-400 text-amber-400 filter drop-shadow"
                                : "text-muted-foreground/30"
                            }`}
                          />
                        ))}
                      </div>
                      {data.existingEvaluation?.rating && RATING_LABELS[data.existingEvaluation.rating] && (
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-semibold bg-amber-400/20 text-amber-700 dark:text-amber-300 border border-amber-400/30">
                          <span>{RATING_LABELS[data.existingEvaluation.rating].emoji}</span>
                          <span>{RATING_LABELS[data.existingEvaluation.rating].label}</span>
                        </div>
                      )}
                    </div>

                    {parsedSurvey?.comments && (
                      <div className="mt-4 pt-4 border-t border-amber-500/20 text-right">
                        <span className="text-xs font-semibold text-muted-foreground block mb-1">مساحة حرة (ملاحظات ومقترحات):</span>
                        <p className="text-sm bg-background/80 p-3 rounded-lg border border-border/40 text-foreground leading-relaxed">
                          "{parsedSurvey.comments}"
                        </p>
                      </div>
                    )}
                  </div>
                </CardContent>

                <CardFooter className="bg-muted/20 p-6 flex justify-center border-t border-border/40">
                  <Link href="/requester">
                    <Button variant="outline" className="gap-2">
                      <ArrowRight className="w-4 h-4" />
                      العودة للوحة تحكم المستفيد
                    </Button>
                  </Link>
                </CardFooter>
              </Card>
            ) : (
              /* نموذج تقديم استبيان التقييم المباشر */
              <div className="rounded-2xl border border-slate-200 shadow-2xl bg-white text-slate-900 overflow-hidden">
                {/* 1. Header Banner مع الشعار */}
                <div className="bg-[#14707a] text-white p-6 sm:p-8 flex flex-col items-center justify-center relative">
                  <img 
                    src={mainLogoSrc} 
                    alt="شعار الجمعية" 
                    className="h-16 sm:h-20 w-auto object-contain brightness-0 invert"
                  />
                </div>

                <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-6">
                  {/* 2. العنوان والنص الترحيبي */}
                  <div className="text-center space-y-2">
                    <h2 className="text-xl sm:text-2xl font-bold text-slate-800">
                      قياس رضا المستفيدين من خدمات الجمعية
                    </h2>
                    <p className="text-xs sm:text-[13px] text-slate-600 leading-relaxed max-w-xl mx-auto">
                      نرحب بكم في استبيان قياس رضا المستفيدين لجمعية عمارة المساجد (منارة). نسعى من خلال هذا الاستبيان إلى فهم آرائكم واقتراحاتكم، حيث إن مشاركتكم تساعدنا في تحسين وتطوير خدماتنا لتلبية تطلعاتكم بشكل أفضل. نؤكد لكم أن إكمال الاستبيان لن يستغرق أكثر من دقيقتين من وقتكم. شكرًا لكم على وقتكم وتعاونكم
                    </p>
                  </div>

                  <hr className="border-t border-dotted border-slate-300" />

                  {/* 3. الحقول النصية */}
                  <div className="space-y-4">
                    {/* الاسم (اختياري) */}
                    <div className="space-y-1.5 text-right">
                      <Label className="text-xs sm:text-sm font-bold text-slate-800">الاسم (اختياري)</Label>
                      <Input
                        value={beneficiaryName}
                        onChange={(e) => setBeneficiaryName(e.target.value)}
                        placeholder=""
                        className="bg-[#fcfbf7] border-slate-200 focus:border-[#14707a] rounded-md h-10 text-right"
                      />
                    </div>

                    {/* رقم الجوال (اختياري) */}
                    <div className="space-y-1.5 text-right">
                      <Label className="text-xs sm:text-sm font-bold text-slate-800">رقم الجوال (اختياري)</Label>
                      <Input
                        value={beneficiaryPhone}
                        onChange={(e) => setBeneficiaryPhone(e.target.value)}
                        placeholder=""
                        className="bg-[#fcfbf7] border-slate-200 focus:border-[#14707a] rounded-md h-10 text-right"
                        dir="ltr"
                      />
                    </div>

                    {/* اسم المسجد/المشروع/الخدمة * */}
                    <div className="space-y-1.5 text-right">
                      <Label className="text-xs sm:text-sm font-bold text-slate-800">
                        اسم المسجد/المشروع/الخدمة <span className="text-rose-600">*</span>
                      </Label>
                      <Input
                        value={serviceName}
                        onChange={(e) => setServiceName(e.target.value)}
                        placeholder=""
                        required
                        className="bg-[#fcfbf7] border-slate-200 focus:border-[#14707a] rounded-md h-10 text-right font-medium"
                      />
                    </div>

                    {/* البريد الإلكتروني (اختياري) */}
                    <div className="space-y-1.5 text-right">
                      <Label className="text-xs sm:text-sm font-bold text-slate-800">البريد الإلكتروني (اختياري)</Label>
                      <Input
                        value={beneficiaryEmail}
                        onChange={(e) => setBeneficiaryEmail(e.target.value)}
                        type="email"
                        placeholder=""
                        className="bg-[#fcfbf7] border-slate-200 focus:border-[#14707a] rounded-md h-10 text-right"
                        dir="ltr"
                      />
                    </div>
                  </div>

                  {/* 4. أسئلة التقييم بالنجوم */}
                  <div className="space-y-4 pt-1">
                    {/* ما مدى تقييمك لخدمات الجمعية؟ */}
                    <div className="space-y-1.5 text-right">
                      <Label className="text-xs sm:text-sm font-bold text-slate-800 block">
                        ما مدى تقييمك لخدمات الجمعية؟
                      </Label>
                      <div className="flex items-center gap-1.5 py-1 justify-end" dir="ltr">
                        {[1, 2, 3, 4, 5].map((star) => {
                          const active = (hoverServicesRating || servicesRating) >= star;
                          return (
                            <button
                              key={star}
                              type="button"
                              onClick={() => setServicesRating(star)}
                              onMouseEnter={() => setHoverServicesRating(star)}
                              onMouseLeave={() => setHoverServicesRating(0)}
                              className="p-1 transition-transform hover:scale-125 focus:outline-none cursor-pointer"
                            >
                              <Star
                                className={`w-8 h-8 transition-all ${
                                  active
                                    ? "text-amber-400 fill-amber-400 drop-shadow-[0_1px_3px_rgba(251,191,36,0.5)]"
                                    : "text-slate-300 fill-none stroke-[1.2]"
                                }`}
                              />
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* ما مدى تقييمك لسرعة تلبية طلبك؟ * */}
                    <div className="space-y-1.5 text-right">
                      <Label className="text-xs sm:text-sm font-bold text-slate-800 block">
                        ما مدى تقييمك لسرعة تلبية طلبك؟ <span className="text-rose-600">*</span>
                      </Label>
                      <div className="flex items-center gap-1.5 py-1 justify-end" dir="ltr">
                        {[1, 2, 3, 4, 5].map((star) => {
                          const active = (hoverSpeedRating || speedRating) >= star;
                          return (
                            <button
                              key={star}
                              type="button"
                              onClick={() => setSpeedRating(star)}
                              onMouseEnter={() => setHoverSpeedRating(star)}
                              onMouseLeave={() => setHoverSpeedRating(0)}
                              className="p-1 transition-transform hover:scale-125 focus:outline-none cursor-pointer"
                            >
                              <Star
                                className={`w-8 h-8 transition-all ${
                                  active
                                    ? "text-amber-400 fill-amber-400 drop-shadow-[0_1px_3px_rgba(251,191,36,0.5)]"
                                    : "text-slate-300 fill-none stroke-[1.2]"
                                }`}
                              />
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* ما مدى سرعة تواصل موظفي الجمعية معك؟ * */}
                    <div className="space-y-1.5 text-right">
                      <Label className="text-xs sm:text-sm font-bold text-slate-800 block">
                        ما مدى سرعة تواصل موظفي الجمعية معك؟ <span className="text-rose-600">*</span>
                      </Label>
                      <div className="flex items-center gap-1.5 py-1 justify-end" dir="ltr">
                        {[1, 2, 3, 4, 5].map((star) => {
                          const active = (hoverCommunicationRating || communicationRating) >= star;
                          return (
                            <button
                              key={star}
                              type="button"
                              onClick={() => setCommunicationRating(star)}
                              onMouseEnter={() => setHoverCommunicationRating(star)}
                              onMouseLeave={() => setHoverCommunicationRating(0)}
                              className="p-1 transition-transform hover:scale-125 focus:outline-none cursor-pointer"
                            >
                              <Star
                                className={`w-8 h-8 transition-all ${
                                  active
                                    ? "text-amber-400 fill-amber-400 drop-shadow-[0_1px_3px_rgba(251,191,36,0.5)]"
                                    : "text-slate-300 fill-none stroke-[1.2]"
                                }`}
                              />
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* ما مدى رضاك بشكل عام عن الجمعية؟ * */}
                    <div className="space-y-1.5 text-right">
                      <Label className="text-xs sm:text-sm font-bold text-slate-800 block">
                        ما مدى رضاك بشكل عام عن الجمعية؟ <span className="text-rose-600">*</span>
                      </Label>
                      <div className="flex items-center gap-1.5 py-1 justify-end" dir="ltr">
                        {[1, 2, 3, 4, 5].map((star) => {
                          const active = (hoverOverallSatisfaction || overallSatisfaction) >= star;
                          return (
                            <button
                              key={star}
                              type="button"
                              onClick={() => setOverallSatisfaction(star)}
                              onMouseEnter={() => setHoverOverallSatisfaction(star)}
                              onMouseLeave={() => setHoverOverallSatisfaction(0)}
                              className="p-1 transition-transform hover:scale-125 focus:outline-none cursor-pointer"
                            >
                              <Star
                                className={`w-8 h-8 transition-all ${
                                  active
                                    ? "text-amber-400 fill-amber-400 drop-shadow-[0_1px_3px_rgba(251,191,36,0.5)]"
                                    : "text-slate-300 fill-none stroke-[1.2]"
                                }`}
                              />
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* 5. مساحة حرة */}
                  <div className="space-y-1.5 text-right">
                    <Label className="block text-xs sm:text-sm font-bold text-slate-800">مساحة حرة</Label>
                    <span className="block text-xs font-semibold text-slate-700">
                      (اكتب لنا ما تريد: رأي-نصيحة-اقتراح-أخرى)
                    </span>
                    <Textarea
                      value={comments}
                      onChange={(e) => setComments(e.target.value)}
                      rows={4}
                      placeholder=""
                      className="bg-[#fcfbf7] border-slate-200 focus:border-[#14707a] rounded-md text-sm text-right leading-relaxed"
                    />
                  </div>

                  {/* 6. زر إرسال */}
                  <div className="flex items-center justify-end pt-3 border-t border-slate-100">
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
                        "إرسال"
                      )}
                    </Button>
                  </div>
                </form>
              </div>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
