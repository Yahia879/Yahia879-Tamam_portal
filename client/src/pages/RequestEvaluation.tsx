import { useState } from "react";
import { useParams, useLocation, Link } from "wouter";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { 
  Star, 
  CheckCircle2, 
  Building2, 
  FileText, 
  MessageSquare, 
  Send, 
  ShieldAlert, 
  Loader2, 
  ArrowRight,
  HeartHandshake,
  Sparkles,
  Award,
  Calendar
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { format } from "date-fns";
import { ar } from "date-fns/locale";

const RATING_LABELS: Record<number, { label: string; description: string; emoji: string; color: string }> = {
  1: { label: "غير راضي جداً", description: "تجربة غير مرضية ولم نتمكن من تلبيتها بالشكل المطلوب", emoji: "😞", color: "text-red-500 border-red-200 bg-red-50 dark:bg-red-950/30 dark:border-red-900/50" },
  2: { label: "غير راضي", description: "هناك عدة ملاحظات على جودة الخدمة أو زمن التنفيذ", emoji: "🙁", color: "text-amber-600 border-amber-200 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-900/50" },
  3: { label: "محايد", description: "الخدمة مقبولة بوجه عام ولكن تحتاج لتحسينات", emoji: "😐", color: "text-yellow-600 border-yellow-200 bg-yellow-50 dark:bg-yellow-950/30 dark:border-yellow-900/50" },
  4: { label: "راضي", description: "خدمة ممتازة وتم إنجاز العمل بالشكل المناسب", emoji: "🙂", color: "text-emerald-600 border-emerald-200 bg-emerald-50 dark:bg-emerald-950/30 dark:border-emerald-900/50" },
  5: { label: "راضي جداً", description: "تجربة استثنائية وجودة عالية يفوق التوقعات", emoji: "😍", color: "text-teal-600 border-teal-200 bg-teal-50 dark:bg-teal-950/30 dark:border-teal-900/50" },
};

export default function RequestEvaluation() {
  const params = useParams<{ requestId: string }>();
  const requestId = parseInt(params.requestId || "0", 10);
  const [, setLocation] = useLocation();

  const [rating, setRating] = useState<number>(0);
  const [hoveredRating, setHoveredRating] = useState<number>(0);
  const [notes, setNotes] = useState<string>("");

  const utils = trpc.useUtils();

  const { data, isLoading, error } = trpc.requests.getBeneficiaryEvaluation.useQuery(
    { requestId },
    { enabled: !!requestId && !isNaN(requestId) }
  );

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
    if (rating === 0) {
      toast.error("يرجى تحديد تقييم النجوم (1 إلى 5)");
      return;
    }
    submitMutation.mutate({
      requestId,
      rating,
      notes: notes.trim() || undefined,
    });
  };

  const activeRating = hoveredRating || rating;
  const ratingDetail = RATING_LABELS[activeRating];

  return (
    <DashboardLayout>
      <div className="container max-w-4xl mx-auto py-8 px-4 sm:px-6" dir="rtl">
        {/* العودة للوحة التحكم أو الطلبات */}
        <div className="mb-6">
          <Link href="/requester">
            <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground hover:text-foreground">
              <ArrowRight className="w-4 h-4" />
              العودة لوحة طلباتي
            </Button>
          </Link>
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
                    شكراً لجهودكم ومشاركتكم القيمة. تم تسجيل تقييمكم لطلب الخدمة بنجاح ومراجعته من قبل إدارة الجمعية.
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

                  {/* عرض التقييم المسجل */}
                  <div className="text-center space-y-3 p-6 rounded-2xl bg-amber-500/5 border border-amber-500/20">
                    <span className="text-xs font-semibold text-muted-foreground block">تقييمك المسجل:</span>
                    <div className="flex items-center justify-center gap-1.5 dir-ltr">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          className={`w-8 h-8 ${
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

                    {data.existingEvaluation?.notes && (
                      <div className="mt-4 pt-4 border-t border-amber-500/20 text-right">
                        <span className="text-xs font-semibold text-muted-foreground block mb-1">ملاحظاتك ومقترحاتك:</span>
                        <p className="text-sm bg-background/80 p-3 rounded-lg border border-border/40 text-foreground leading-relaxed">
                          "{data.existingEvaluation.notes}"
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
              /* نموذج تقديم التقييم المباشر */
              <Card className="border-primary/20 shadow-2xl overflow-hidden bg-card">
                {/* الرأس البصري الجذاب */}
                <div className="bg-gradient-to-r from-primary/10 via-emerald-500/10 to-teal-500/10 p-6 sm:p-8 border-b border-border/40">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-primary/15 text-primary border border-primary/20 mb-2">
                        <Award className="w-3.5 h-3.5" />
                        استبيان قياس رضا المستفيد
                      </div>
                      <h1 className="text-xl sm:text-2xl font-bold text-foreground flex items-center gap-2">
                        تقييم الخدمة المقدمة للطلب #{data.request.requestNumber}
                      </h1>
                      {data.request.descriptiveName && (
                        <p className="text-sm text-muted-foreground font-medium">
                          {data.request.descriptiveName}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-2 bg-background/80 backdrop-blur px-3.5 py-2 rounded-xl border border-border/60 shrink-0">
                      <HeartHandshake className="w-5 h-5 text-primary" />
                      <div className="text-xs">
                        <span className="text-muted-foreground block">جمعية عمارة المساجد</span>
                        <span className="font-bold text-foreground">منارة</span>
                      </div>
                    </div>
                  </div>
                </div>

                <form onSubmit={handleSubmit}>
                  <CardContent className="p-6 sm:p-8 space-y-8">
                    {/* معلومات المسجد والطلب */}
                    {data.request.mosqueName && (
                      <div className="flex items-center gap-3 p-3.5 rounded-xl bg-muted/40 border border-border/50 text-sm">
                        <Building2 className="w-4 h-4 text-primary shrink-0" />
                        <div>
                          <span className="text-muted-foreground text-xs block">المسجد المستفيد:</span>
                          <span className="font-semibold text-foreground">{data.request.mosqueName}</span>
                        </div>
                      </div>
                    )}

                    {/* مقياس النجوم التفاعلي */}
                    <div className="space-y-4 text-center">
                      <Label className="text-base font-bold text-foreground block">
                        كيف تقيم مستوى رضاك عن الخدمة وتنفيذ الطلب؟ <span className="text-destructive">*</span>
                      </Label>

                      {/* أزرار النجوم 1-5 */}
                      <div className="flex items-center justify-center gap-2 sm:gap-4 py-4 dir-ltr">
                        {[1, 2, 3, 4, 5].map((star) => {
                          const isFilled = star <= activeRating;
                          return (
                            <button
                              key={star}
                              type="button"
                              onClick={() => setRating(star)}
                              onMouseEnter={() => setHoveredRating(star)}
                              onMouseLeave={() => setHoveredRating(0)}
                              className={`group relative p-2 sm:p-3 rounded-2xl transition-all duration-200 transform hover:scale-110 focus:outline-none ${
                                isFilled
                                  ? "bg-amber-500/10 border-2 border-amber-400 shadow-md"
                                  : "bg-muted/40 border-2 border-transparent hover:bg-muted"
                              }`}
                            >
                              <Star
                                className={`w-8 h-8 sm:w-10 sm:h-10 transition-colors duration-200 ${
                                  isFilled
                                    ? "fill-amber-400 text-amber-400 filter drop-shadow-md"
                                    : "text-muted-foreground/40 group-hover:text-amber-400/60"
                                }`}
                              />
                              <span className="text-xs font-bold text-muted-foreground mt-1 block dir-rtl">
                                {star}
                              </span>
                            </button>
                          );
                        })}
                      </div>

                      {/* عرض اسم التقييم والوصف الديناميكي */}
                      {ratingDetail ? (
                        <div className={`p-4 rounded-xl border text-center transition-all duration-300 ${ratingDetail.color}`}>
                          <div className="text-2xl mb-1">{ratingDetail.emoji}</div>
                          <h4 className="font-bold text-base">{ratingDetail.label}</h4>
                          <p className="text-xs opacity-90 mt-0.5">{ratingDetail.description}</p>
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground italic">
                          انقر على النجوم أعلاه لاختيار التقييم المناسب من 1 إلى 5
                        </p>
                      )}
                    </div>

                    {/* حقل ملاحظات ومقترحات */}
                    <div className="space-y-2">
                      <Label htmlFor="notes" className="text-sm font-semibold flex items-center gap-2">
                        <MessageSquare className="w-4 h-4 text-primary" />
                        ملاحظات ومقترحات لتحسين الخدمة (اختياري)
                      </Label>
                      <Textarea
                        id="notes"
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="فضلاً اكتب أي ملاحظات أو مقترحات تساهم في تطوير جودة خدماتنا مستقبلاً..."
                        rows={4}
                        className="resize-none focus-visible:ring-primary text-sm leading-relaxed"
                      />
                    </div>
                  </CardContent>

                  {/* شريط الإرسال */}
                  <CardFooter className="bg-muted/30 p-6 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-border/40">
                    <p className="text-xs text-muted-foreground text-center sm:text-right">
                      ملاحظاتكم محل اهتمامنا وتساهم بشكل مباشر في رفع جودة الخدمات بالجمعية.
                    </p>
                    <Button
                      type="submit"
                      disabled={submitMutation.isPending || rating === 0}
                      size="lg"
                      className="w-full sm:w-auto gap-2 min-w-[180px] font-bold shadow-lg shadow-primary/20"
                    >
                      {submitMutation.isPending ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          جاري حفظ التقييم...
                        </>
                      ) : (
                        <>
                          <Send className="w-4 h-4" />
                          إرسال التقييم
                        </>
                      )}
                    </Button>
                  </CardFooter>
                </form>
              </Card>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
