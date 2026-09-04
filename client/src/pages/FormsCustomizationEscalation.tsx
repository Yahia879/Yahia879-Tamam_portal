import { useState, useEffect, useMemo } from "react";
import { Link, useLocation } from "wouter";
import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import {
  ArrowRight,
  ChevronLeft,
  Clock,
  Users,
  Layers,
  Save,
  Loader2,
  Plus,
  Minus,
  Calendar,
} from "lucide-react";

export default function FormsCustomizationEscalation() {
  const [, setLocation] = useLocation();

  // الحصول على رابط الصفحة السابقة إن وجد في معاملات الرابط
  const searchParams = new URLSearchParams(window.location.search);
  const fromParam = searchParams.get("from") || searchParams.get("returnUrl") || searchParams.get("backUrl");

  const handleBack = () => {
    if (fromParam) {
      setLocation(decodeURIComponent(fromParam));
      return;
    }

    if (window.history.length > 1) {
      window.history.back();
    } else {
      setLocation("/forms-customization");
    }
  };

  // جلب إعدادات التصعيد الحالية من الخادم
  const { data: slaData, isLoading, refetch } = trpc.escalation.getSettings.useQuery();

  // الحالة المحلية للنموذج
  const [draftBeneficiaryDays, setDraftBeneficiaryDays] = useState<number>(3);
  const [draftStages, setDraftStages] = useState<Array<{ stageCode: string; stageName: string; durationDays: number; warningDays?: number }>>([]);
  const [initialBeneficiaryDays, setInitialBeneficiaryDays] = useState<number>(3);
  const [initialStages, setInitialStages] = useState<Array<{ stageCode: string; stageName: string; durationDays: number }>>([]);

  // مزامنة البيانات عند التحميل من الخادم
  useEffect(() => {
    if (slaData) {
      const benDays = slaData.beneficiarySLA?.durationDays || 3;
      const stgs = slaData.stages.map(s => ({
        stageCode: s.stageCode,
        stageName: s.stageName,
        durationDays: s.durationDays,
        warningDays: s.warningDays,
      }));

      setDraftBeneficiaryDays(benDays);
      setInitialBeneficiaryDays(benDays);
      setDraftStages(stgs);
      setInitialStages(stgs.map(s => ({ stageCode: s.stageCode, stageName: s.stageName, durationDays: s.durationDays })));
    }
  }, [slaData]);

  // التحقق من وجود تعديلات غير محفوظة
  const hasChanges = useMemo(() => {
    if (draftBeneficiaryDays !== initialBeneficiaryDays) return true;
    if (draftStages.length !== initialStages.length) return true;
    for (let i = 0; i < draftStages.length; i++) {
      if (draftStages[i].durationDays !== initialStages[i]?.durationDays) return true;
    }
    return false;
  }, [draftBeneficiaryDays, draftStages, initialBeneficiaryDays, initialStages]);

  // إجمالي عدد أيام الدورة الكاملة
  const totalCycleDays = useMemo(() => {
    return draftStages.reduce((acc, curr) => acc + (curr.durationDays || 0), 0);
  }, [draftStages]);

  // تحديث الإعدادات على الخادم
  const updateSettingsMutation = trpc.escalation.updateSettings.useMutation({
    onSuccess: (res) => {
      toast.success(res.message || "تم حفظ مدة التصعيد بنجاح");
      refetch();
    },
    onError: (err) => {
      toast.error(err.message || "حدث خطأ أثناء حفظ الإعدادات");
    },
  });

  const handleSave = () => {
    updateSettingsMutation.mutate({
      stages: draftStages,
      beneficiaryDays: draftBeneficiaryDays,
    });
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center space-y-3">
            <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
            <p className="text-sm font-semibold text-foreground">جاري تحميل إعدادات التصعيد...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-4xl mx-auto pb-24 text-right" dir="rtl">

        {/* 1. شريط المسار والرجوع (Breadcrumbs) */}
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium select-none">
          <button
            type="button"
            onClick={handleBack}
            className="hover:text-foreground transition-colors cursor-pointer bg-transparent border-0 p-0 text-xs text-muted-foreground font-medium"
          >
            {fromParam === "/escalation" ? "متابعة التأخيرات" : "تخصيص النماذج"}
          </button>
          <ChevronLeft className="w-3.5 h-3.5 text-muted-foreground/50" />
          <span className="text-foreground font-bold">تخصيص مدة التصعيد</span>
        </div>

        {/* 2. رأس الصفحة الرئيسي البسيط والأنيق */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl border border-border bg-card shadow-xs">
          <div className="flex items-center gap-3.5 min-w-0">
            <Button
              variant="ghost"
              size="icon"
              type="button"
              onClick={handleBack}
              className="shrink-0 rounded-xl hover:bg-muted"
              title="الرجوع للصفحة السابقة"
            >
              <ArrowRight className="w-5 h-5" />
            </Button>

            <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 bg-rose-500 text-white shadow-xs">
              <Clock className="w-5 h-5" />
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-lg sm:text-xl font-bold text-foreground">
                  تخصيص مدة التصعيد
                </h1>
                {hasChanges && (
                  <Badge variant="outline" className="text-xs font-semibold text-amber-600 border-amber-300 bg-amber-50 dark:bg-amber-950/30 flex items-center gap-1 px-2 py-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                    <span>تعديلات غير محفوظة</span>
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                تحديد مدة مراحل الطلبات ومهلة قبول المستفيدين
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button
              type="button"
              onClick={handleSave}
              disabled={updateSettingsMutation.isPending || !hasChanges}
              className={`text-xs font-semibold px-5 h-10 rounded-xl shadow-xs gap-2 transition-all ${
                hasChanges
                  ? "gradient-primary text-white shadow-md cursor-pointer"
                  : "bg-muted text-muted-foreground opacity-50 cursor-not-allowed shadow-none"
              }`}
            >
              {updateSettingsMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              <span>حفظ التغييرات</span>
            </Button>
          </div>
        </div>

        {/* 3. شريط الإحصائيات السريع */}
        <div className="flex items-center gap-6 p-4 px-5 rounded-xl bg-muted/40 border border-border text-xs text-muted-foreground flex-wrap">
          <div className="flex items-center gap-1.5">
            <Layers className="w-4 h-4 text-primary" />
            <span>إجمالي المراحل: <strong className="text-foreground">{draftStages.length} مراحل</strong></span>
          </div>
          <div className="flex items-center gap-1.5">
            <Users className="w-4 h-4 text-teal-600" />
            <span>مهلة قبول المستفيد: <strong className="text-foreground">{draftBeneficiaryDays} أيام</strong></span>
          </div>
          <div className="flex items-center gap-1.5">
            <Calendar className="w-4 h-4 text-rose-500" />
            <span>إجمالي مدة الدورة: <strong className="text-foreground">{totalCycleDays} يوم</strong></span>
          </div>
        </div>

        {/* 4. القسم الأول: مهلة قبول تسجيل المستفيد */}
        <div className="space-y-2.5">
          <h3 className="text-xs font-bold text-muted-foreground px-1">مهلة قبول تسجيل المستفيد</h3>

          <Card className="border border-border shadow-xs">
            <CardContent className="p-4 sm:p-5">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-lg bg-teal-50 dark:bg-teal-950/40 text-teal-600 flex items-center justify-center shrink-0">
                    <Users className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-bold text-sm text-foreground">
                      مهلة قبول تسجيل المستفيد
                    </h4>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      عدد الأيام المسموحة قبل اعتبار تسجيل المستفيد متأخراً
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 bg-muted/50 p-1 rounded-xl border border-border shrink-0">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setDraftBeneficiaryDays(prev => Math.max(1, prev - 1))}
                    className="h-8 w-8 p-0 rounded-lg hover:bg-background"
                  >
                    <Minus className="w-4 h-4" />
                  </Button>

                  <Input
                    type="number"
                    min={1}
                    max={60}
                    value={draftBeneficiaryDays}
                    onChange={(e) => setDraftBeneficiaryDays(parseInt(e.target.value) || 1)}
                    className="w-12 text-center font-bold text-sm h-8 bg-background border border-border/80 focus-visible:ring-1 focus-visible:ring-primary p-0"
                  />

                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setDraftBeneficiaryDays(prev => Math.min(60, prev + 1))}
                    className="h-8 w-8 p-0 rounded-lg hover:bg-background"
                  >
                    <Plus className="w-4 h-4" />
                  </Button>

                  <span className="text-xs font-medium text-muted-foreground px-2">أيام</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 5. القسم الثاني: مدة مراحل الطلبات العشر */}
        <div className="space-y-2.5">
          <h3 className="text-xs font-bold text-muted-foreground px-1">مدة مراحل الطلبات</h3>

          <div className="space-y-2">
            {draftStages.map((stg, index) => (
              <Card 
                key={stg.stageCode} 
                className="border border-border shadow-xs hover:border-primary/40 transition-all"
              >
                <CardContent className="p-3.5 sm:p-4">
                  <div className="flex items-center justify-between gap-4">
                    {/* رقم واسم المرحلة */}
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="w-8 h-8 rounded-lg bg-primary/10 text-primary font-bold text-xs flex items-center justify-center shrink-0">
                        {index + 1}
                      </span>
                      <span className="font-bold text-sm text-foreground truncate">
                        {stg.stageName}
                      </span>
                    </div>

                    {/* عداد الأيام */}
                    <div className="flex items-center gap-1.5 bg-muted/50 p-1 rounded-xl border border-border shrink-0">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setDraftStages(prev => prev.map((item, idx) => 
                            idx === index ? { ...item, durationDays: Math.max(0, item.durationDays - 1) } : item
                          ));
                        }}
                        className="h-8 w-8 p-0 rounded-lg hover:bg-background"
                      >
                        <Minus className="w-4 h-4" />
                      </Button>

                      <Input
                        type="number"
                        min={0}
                        max={180}
                        value={stg.durationDays}
                        onChange={(e) => {
                          const val = parseInt(e.target.value) || 0;
                          setDraftStages(prev => prev.map((item, idx) => idx === index ? { ...item, durationDays: val } : item));
                        }}
                        className="w-12 text-center font-bold text-sm h-8 bg-background border border-border/80 focus-visible:ring-1 focus-visible:ring-primary p-0"
                      />

                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setDraftStages(prev => prev.map((item, idx) => 
                            idx === index ? { ...item, durationDays: Math.min(180, item.durationDays + 1) } : item
                          ));
                        }}
                        className="h-8 w-8 p-0 rounded-lg hover:bg-background"
                      >
                        <Plus className="w-4 h-4" />
                      </Button>

                      <span className="text-xs font-medium text-muted-foreground px-2">يوم</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* زر الحفظ العائم في الأسفل عند وجود تعديلات */}
        {hasChanges && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-card border border-border shadow-xl rounded-2xl p-3 px-6 flex items-center gap-4 animate-in fade-in slide-in-from-bottom-3">
            <div className="flex items-center gap-2 text-xs">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
              <span className="font-semibold text-foreground">توجد تعديلات غير محفوظة</span>
            </div>

            <Button
              size="sm"
              onClick={handleSave}
              disabled={updateSettingsMutation.isPending}
              className="gradient-primary text-white font-semibold text-xs px-5 h-9 rounded-xl shadow-xs gap-1.5"
            >
              {updateSettingsMutation.isPending ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Save className="w-3.5 h-3.5" />
              )}
              <span>حفظ التغييرات</span>
            </Button>
          </div>
        )}

      </div>
    </DashboardLayout>
  );
}
