import { useState } from "react";
import { useLocation, useSearch } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
  ClipboardCheck,
  CheckCircle2,
  Star,
  ArrowRight,
  FileText,
  Calendar,
  DollarSign,
  AlertCircle,
  Loader2,
} from "lucide-react";

export default function FinalReportForm() {
  const search = useSearch();
  const params = new URLSearchParams(search);
  const requestIdStr = params.get("requestId");
  const requestId = requestIdStr ? parseInt(requestIdStr) : null;
  const [, setLocation] = useLocation();

  const [summary, setSummary] = useState("");
  const [achievements, setAchievements] = useState("");
  const [challenges, setChallenges] = useState("");
  const [totalCost, setTotalCost] = useState("");
  const [completionDate, setCompletionDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [satisfactionRating, setSatisfactionRating] = useState<number>(5);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // جلب بيانات الطلب
  const { data: request, isLoading: requestLoading } = trpc.requests.getById.useQuery(
    { id: requestId! },
    { enabled: !!requestId }
  );

  // mutation لإنشاء التقرير الختامي
  const createFinalReportMutation = trpc.finalReports.create.useMutation({
    onSuccess: () => {
      toast.success("تم رفع التقرير الختامي بنجاح!");
      if (requestId) {
        setLocation(`/requests/${requestId}`);
      } else {
        setLocation("/requests");
      }
    },
    onError: (error: { message: string }) => {
      toast.error(`خطأ في رفع التقرير: ${error.message}`);
      setIsSubmitting(false);
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!requestId) {
      toast.error("معرّف الطلب مفقود");
      return;
    }
    if (!summary.trim()) {
      toast.error("يرجى إدخال ملخص التقرير");
      return;
    }
    setIsSubmitting(true);
    createFinalReportMutation.mutate({
      requestId,
      summary: summary.trim(),
      achievements: achievements.trim() || undefined,
      challenges: challenges.trim() || undefined,
      totalCost: totalCost ? totalCost : undefined,
      completionDate: completionDate || undefined,
      satisfactionRating,
    });
  };

  if (!requestId) {
    return (
      <div className="container mx-auto py-12 text-center">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-red-600">معرّف الطلب مفقود</h2>
        <p className="text-muted-foreground mt-2">يرجى الوصول لهذه الصفحة من خلال صفحة تفاصيل الطلب.</p>
        <Button className="mt-4" onClick={() => setLocation("/requests")}>
          العودة للطلبات
        </Button>
      </div>
    );
  }

  if (requestLoading) {
    return (
      <div className="container mx-auto py-12 text-center">
        <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
        <p className="mt-2 text-muted-foreground">جاري تحميل بيانات الطلب...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 max-w-3xl">
      {/* رأس الصفحة */}
      <div className="flex items-center gap-3 mb-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setLocation(`/requests/${requestId}`)}
          className="gap-2"
        >
          <ArrowRight className="w-4 h-4" />
          العودة للطلب
        </Button>
      </div>

      <div className="flex items-center gap-3 mb-8">
        <div className="p-3 rounded-full bg-purple-100 dark:bg-purple-900/30">
          <ClipboardCheck className="w-7 h-7 text-purple-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">رفع التقرير الختامي</h1>
          <p className="text-muted-foreground text-sm mt-1">
            توثيق إنجازات المشروع وإغلاق الطلب رسمياً
          </p>
        </div>
      </div>

      {/* بيانات الطلب */}
      {request && (
        <Card className="mb-6 border-purple-200 bg-purple-50/50 dark:bg-purple-950/10">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-3">
                <FileText className="w-5 h-5 text-purple-600" />
                <div>
                  <p className="font-semibold text-sm">{request.requestNumber}</p>
                  <p className="text-xs text-muted-foreground">{request.mosque?.name || request.requestNumber}</p>
                </div>
              </div>
              <Badge variant="outline" className="border-purple-300 text-purple-700">
                مرحلة الاستلام
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}

      {/* نموذج التقرير */}
      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">تفاصيل التقرير الختامي</CardTitle>
            <CardDescription>
              يُستخدم هذا التقرير لتوثيق إنجازات المشروع والانتقال لمرحلة الإغلاق
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* ملخص التقرير */}
            <div className="space-y-2">
              <Label htmlFor="summary" className="font-semibold">
                ملخص التقرير <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="summary"
                placeholder="اكتب ملخصاً شاملاً لما تم إنجازه في المشروع..."
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                rows={4}
                required
              />
            </div>

            <Separator />

            {/* الإنجازات */}
            <div className="space-y-2">
              <Label htmlFor="achievements" className="font-semibold">
                الإنجازات الرئيسية
              </Label>
              <Textarea
                id="achievements"
                placeholder="اذكر أبرز الإنجازات والنتائج المحققة..."
                value={achievements}
                onChange={(e) => setAchievements(e.target.value)}
                rows={3}
              />
            </div>

            {/* التحديات */}
            <div className="space-y-2">
              <Label htmlFor="challenges" className="font-semibold">
                التحديات والدروس المستفادة
              </Label>
              <Textarea
                id="challenges"
                placeholder="اذكر التحديات التي واجهتها والدروس المستفادة..."
                value={challenges}
                onChange={(e) => setChallenges(e.target.value)}
                rows={3}
              />
            </div>

            <Separator />

            {/* التكلفة الإجمالية وتاريخ الإتمام */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="totalCost" className="font-semibold flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-green-600" />
                  التكلفة الإجمالية الفعلية (ريال)
                </Label>
                <Input
                  id="totalCost"
                  type="number"
                  placeholder="مثال: 50000"
                  value={totalCost}
                  onChange={(e) => setTotalCost(e.target.value)}
                  min="0"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="completionDate" className="font-semibold flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-blue-600" />
                  تاريخ الإتمام الفعلي
                </Label>
                <Input
                  id="completionDate"
                  type="date"
                  value={completionDate}
                  onChange={(e) => setCompletionDate(e.target.value)}
                />
              </div>
            </div>

            <Separator />

            {/* تقييم الرضا */}
            <div className="space-y-3">
              <Label className="font-semibold flex items-center gap-2">
                <Star className="w-4 h-4 text-yellow-500" />
                تقييم جودة التنفيذ (1-5)
              </Label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((rating) => (
                  <button
                    key={rating}
                    type="button"
                    onClick={() => setSatisfactionRating(rating)}
                    className={`p-2 rounded-lg transition-all ${
                      satisfactionRating >= rating
                        ? "text-yellow-500 scale-110"
                        : "text-gray-300 hover:text-yellow-400"
                    }`}
                  >
                    <Star
                      className="w-8 h-8"
                      fill={satisfactionRating >= rating ? "currentColor" : "none"}
                    />
                  </button>
                ))}
                <span className="mr-2 text-sm text-muted-foreground self-center">
                  {satisfactionRating === 1 && "ضعيف"}
                  {satisfactionRating === 2 && "مقبول"}
                  {satisfactionRating === 3 && "جيد"}
                  {satisfactionRating === 4 && "جيد جداً"}
                  {satisfactionRating === 5 && "ممتاز"}
                </span>
              </div>
            </div>

            {/* تنبيه */}
            <div className="flex items-start gap-3 p-4 bg-amber-50 dark:bg-amber-950/20 rounded-lg border border-amber-200">
              <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">
                  تنبيه مهم
                </p>
                <p className="text-xs text-amber-700 dark:text-amber-400 mt-1">
                  بعد رفع هذا التقرير، سيتمكن مكتب المشاريع من إغلاق الطلب رسمياً.
                  تأكد من اكتمال جميع الأعمال قبل المتابعة.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* أزرار الإجراءات */}
        <div className="flex justify-between items-center mt-6">
          <Button
            type="button"
            variant="outline"
            onClick={() => setLocation(`/requests/${requestId}`)}
          >
            إلغاء
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting || !summary.trim()}
            className="gap-2 bg-purple-600 hover:bg-purple-700"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                جاري الرفع...
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                رفع التقرير الختامي
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
