import { Link } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import BeneficiaryLayout from "@/components/BeneficiaryLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Building2, Calendar, ChevronLeft, FileText, Loader2, Star } from "lucide-react";
import { PROGRAM_LABELS } from "@shared/constants";

const RATING_LABELS: Record<number, string> = {
  1: "ضعيف جداً",
  2: "ضعيف",
  3: "متوسط",
  4: "جيد جداً",
  5: "ممتاز",
};

export default function RequesterEvaluations() {
  const { user } = useAuth();
  const { data: activityData, isLoading } = trpc.users.getRequesterRelatedActivity.useQuery(
    { userId: user?.id ?? 0 },
    { enabled: !!user?.id }
  );

  const evaluations = (activityData as any)?.imamEvaluations || [];
  const summary = (activityData as any)?.imamRatingSummary || { averageRating: null, totalRatings: 0 };

  return (
    <BeneficiaryLayout
      activeTab="evaluations"
      title="تقييمات الفريق الميداني"
      subtitle="سجل تقييمات الفريق الميداني لصحة البيانات والتعاون عبر جميع طلباتك"
      backUrl="/requester"
      backLabel="العودة للرئيسية"
    >
      <div className="max-w-4xl mx-auto space-y-6" dir="rtl">
        {/* ملخص التقييم العام */}
        <Card className="rounded-3xl border border-amber-200/70 dark:border-amber-800/50 bg-gradient-to-l from-amber-50/70 via-card to-amber-50/20 dark:from-amber-950/20 dark:via-card dark:to-amber-950/10 shadow-xs">
          <CardContent className="p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                <Star className="w-6 h-6 fill-amber-500 text-amber-500" />
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-extrabold text-foreground">متوسط تقييم الفريق الميداني</h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  إجمالي التقييمات المسجلة على طلباتك: {summary.totalRatings || 0}
                </p>
              </div>
            </div>
            {summary.averageRating !== null && summary.averageRating !== undefined ? (
              <div className="inline-flex items-center gap-2.5 bg-white dark:bg-slate-900 px-4 py-2 rounded-2xl border border-amber-200 dark:border-amber-800 shadow-2xs self-start sm:self-center">
                <div className="flex items-center gap-0.5">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={`w-4 h-4 ${
                        star <= Math.round(summary.averageRating)
                          ? "fill-amber-400 text-amber-500"
                          : "text-slate-300 dark:text-slate-700"
                      }`}
                    />
                  ))}
                </div>
                <span className="text-sm sm:text-base font-black text-amber-700 dark:text-amber-300">
                  {summary.averageRating} / 5
                </span>
              </div>
            ) : (
              <Badge variant="outline" className="text-xs self-start sm:self-center">
                لا توجد تقييمات مسجلة بعد
              </Badge>
            )}
          </CardContent>
        </Card>

        {/* قائمة التقييمات */}
        <Card className="rounded-3xl border border-border/60 shadow-xs overflow-hidden bg-card">
          <CardHeader className="p-5 sm:p-6 border-b border-border/40">
            <div className="flex items-center justify-between gap-2">
              <div>
                <CardTitle className="text-base sm:text-lg font-bold flex items-center gap-2">
                  <FileText className="w-5 h-5 text-primary" />
                  <span>سجل التقييمات حسب الطلبات</span>
                </CardTitle>
                <CardDescription className="text-xs mt-0.5">
                  جميع التقييمات والملاحظات الواردة من تقارير الزيارات الميدانية
                </CardDescription>
              </div>
              <Badge variant="secondary" className="font-bold">
                {evaluations.length} تقييمات
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-5 sm:p-6">
            {isLoading ? (
              <div className="py-12 flex items-center justify-center gap-2 text-muted-foreground text-sm">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>جاري تحميل التقييمات...</span>
              </div>
            ) : evaluations.length === 0 ? (
              <div className="py-12 text-center space-y-2">
                <Star className="w-10 h-10 text-muted-foreground/30 mx-auto" />
                <p className="text-sm font-bold text-foreground">لا توجد تقييمات مسجلة حتى الآن</p>
                <p className="text-xs text-muted-foreground">
                  ستظهر هنا تقييمات الفريق الميداني فور رفع تقارير الزيارات الميدانية لطلباتك.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {evaluations.map((ev: any) => (
                  <div
                    key={ev.reportId}
                    className="p-4 sm:p-5 rounded-2xl border border-border/60 bg-muted/20 hover:bg-muted/35 transition-all flex flex-col sm:flex-row sm:items-start justify-between gap-4"
                  >
                    <div className="space-y-2 min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-xs font-bold bg-background px-2.5 py-0.5 rounded-lg border">
                          {ev.requestNumber}
                        </span>
                        <span className="font-bold text-sm text-foreground">
                          {PROGRAM_LABELS[ev.programType as keyof typeof PROGRAM_LABELS] || ev.programType}
                        </span>
                        {typeof ev.rating === "number" && ev.rating > 0 && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                            <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                            <span>
                              {ev.rating} / 5 ({RATING_LABELS[ev.rating] || `${ev.rating} من 5`})
                            </span>
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                        {ev.mosqueName && (
                          <span className="inline-flex items-center gap-1 font-medium text-foreground/80">
                            <Building2 className="w-3.5 h-3.5 text-teal-600" />
                            <span>{ev.mosqueName}</span>
                          </span>
                        )}
                        {ev.visitDate && (
                          <span className="inline-flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5" />
                            <span>تاريخ الزيارة: {new Date(ev.visitDate).toLocaleDateString("ar-SA")}</span>
                          </span>
                        )}
                      </div>

                      {ev.notes && (
                        <p className="text-xs sm:text-sm text-foreground/90 bg-background p-3 rounded-xl border border-border/60 whitespace-pre-wrap leading-relaxed">
                          {ev.notes}
                        </p>
                      )}
                    </div>

                    <Link href={`/requests/${ev.requestId}`}>
                      <Button variant="outline" size="sm" className="rounded-xl text-xs font-bold gap-1 shrink-0 cursor-pointer">
                        <span>عرض الطلب</span>
                        <ChevronLeft className="w-3.5 h-3.5" />
                      </Button>
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </BeneficiaryLayout>
  );
}
