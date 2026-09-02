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
  SlidersHorizontal,
  Users,
  Layers,
  Save,
  Loader2,
  Plus,
  Minus,
  CheckCircle,
  AlertTriangle,
  Flame,
  ShieldCheck,
  Calendar,
  Sparkles,
} from "lucide-react";

// معلومات وأقسام المراحل التوضيحية
const STAGE_META: Record<string, { department: string; badgeColor: string }> = {
  submitted: { department: "استقبال الطلبات", badgeColor: "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border-blue-200" },
  initial_review: { department: "المراجعة والتدقيق", badgeColor: "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300 border-indigo-200" },
  field_visit: { department: "الفريق الهندسي الميداني", badgeColor: "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border-amber-200" },
  technical_eval: { department: "الإدارة الهندسية", badgeColor: "bg-cyan-50 text-cyan-700 dark:bg-cyan-950/40 dark:text-cyan-300 border-cyan-200" },
  boq_preparation: { department: "حساب الكميات والتسعير", badgeColor: "bg-teal-50 text-teal-700 dark:bg-teal-950/40 dark:text-teal-300 border-teal-200" },
  financial_eval_and_approval: { department: "الإدارة المالية والاعتمادات", badgeColor: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200" },
  contracting: { department: "الشؤون القانونية والعقود", badgeColor: "bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 border-purple-200" },
  execution: { department: "إدارة المشاريع والتنفيذ", badgeColor: "bg-orange-50 text-orange-700 dark:bg-orange-950/40 dark:text-orange-300 border-orange-200" },
  handover: { department: "لجنة الاستلام والجودة", badgeColor: "bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300 border-sky-200" },
  closed: { department: "الأرشفة والإغلاق", badgeColor: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200" },
};

export default function FormsCustomizationEscalation() {
  const [, navigate] = useLocation();

  // جلب إعدادات الـ SLA الحالية من الخادم
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
      toast.success(res.message || "تم حفظ مدد التصعيد ومهل الـ SLA بنجاح");
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

  // اختصار الحفظ عبر لوحة المفاتيح (Ctrl+S / Cmd+S)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        if (hasChanges && !updateSettingsMutation.isPending) {
          handleSave();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [hasChanges, updateSettingsMutation.isPending, draftStages, draftBeneficiaryDays]);

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center space-y-3">
            <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
            <p className="text-sm font-semibold text-foreground">جاري تحميل إعدادات التصعيد والـ SLA...</p>
            <p className="text-xs text-muted-foreground">يتم جلب مدد المراحل من الخادم</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-5xl mx-auto pb-24 text-right" dir="rtl">

        {/* 1. شريط المسار والرجوع (Breadcrumbs) */}
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium select-none">
          <Link href="/forms-customization" className="hover:text-foreground transition-colors">
            تخصيص النماذج
          </Link>
          <ChevronLeft className="w-3.5 h-3.5 text-muted-foreground/50" />
          <span className="text-foreground font-bold">تخصيص مدة التصعيد ومُهل الـ SLA</span>
        </div>

        {/* 2. رأس الصفحة الرئيسي المتقدم والتفاعلي */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 sm:p-6 rounded-3xl border border-border/80 bg-card shadow-xs">
          <div className="flex items-center gap-3.5 min-w-0">
            <Link href="/forms-customization">
              <Button variant="ghost" size="icon" type="button" className="shrink-0 rounded-2xl hover:bg-muted">
                <ArrowRight className="w-5 h-5" />
              </Button>
            </Link>

            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center shrink-0 bg-rose-500 text-white shadow-md transition-transform hover:scale-105">
              <Clock className="w-6 h-6 sm:w-7 sm:h-7" />
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-lg sm:text-2xl font-black text-foreground tracking-tight">
                  تخصيص مدة التصعيد ومُهل الـ SLA
                </h1>
                {hasChanges && (
                  <Badge variant="outline" className="text-[11px] font-bold text-amber-600 border-amber-300 bg-amber-50 dark:bg-amber-950/30 animate-pulse flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                    <span>تعديلات غير محفوظة</span>
                  </Badge>
                )}
                {!hasChanges && (
                  <Badge variant="outline" className="text-[11px] font-bold text-emerald-600 border-emerald-300 bg-emerald-50 dark:bg-emerald-950/30 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    <span>محفوظ ومطبق</span>
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                تحديد وضبط الحد الأقصى للمدد الزمنية لكل مرحلة من مراحل تنفيذ ومتابعة الطلبات وتنبيهات التأخير
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap shrink-0">
            <Link href="/escalation">
              <Button
                variant="outline"
                size="sm"
                className="text-xs font-medium gap-1.5 h-10 px-4 rounded-xl shadow-2xs hover:bg-muted"
              >
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <span>صفحة التصعيد الإداري</span>
              </Button>
            </Link>

            <Button
              type="button"
              onClick={handleSave}
              disabled={updateSettingsMutation.isPending || !hasChanges}
              className={`text-xs font-bold px-5 h-10 rounded-xl shadow-md gap-2 transition-all ${
                hasChanges
                  ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-500/20 hover:shadow-lg cursor-pointer"
                  : "bg-muted text-muted-foreground opacity-50 cursor-not-allowed shadow-none hover:bg-muted"
              }`}
              title={hasChanges ? "حفظ التعديلات (Ctrl+S)" : "لا توجد تعديلات غير محفوظة"}
            >
              {updateSettingsMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              <span>حفظ الإعدادات</span>
              <span className="hidden lg:inline text-[10px] opacity-75 font-mono">(Ctrl+S)</span>
            </Button>
          </div>
        </div>

        {/* 3. شريط الإحصائيات السريع */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 sm:p-4 px-5 rounded-2xl bg-muted/40 border border-border/80 text-xs">
          <div className="flex items-center gap-4 sm:gap-6 text-muted-foreground flex-wrap">
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
              <span>إجمالي مدة الدورة الكاملة: <strong className="text-foreground">{totalCycleDays} يوم</strong></span>
            </div>
          </div>

          <div className="text-2xs text-muted-foreground">
            أي طلب يتجاوز المدة المحددة لمرحلته سيظهر مباشرة في شاشة التصعيد الإداري
          </div>
        </div>

        {/* 4. القسم الأول: مهلة قبول تسجيل المستفيد */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-teal-600" />
            <h3 className="text-sm font-bold text-foreground">مهلة قبول وتسجيل المستفيدين</h3>
          </div>

          <Card className="border border-border/80 shadow-xs hover:border-border transition-all">
            <CardContent className="p-4 sm:p-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-foreground">
                      مهلة اعتماد حساب طالب الخدمة
                    </span>
                    <Badge variant="outline" className="bg-teal-50 text-teal-700 dark:bg-teal-950/40 dark:text-teal-300 border-teal-200 text-2xs font-semibold">
                      تسجيل المستفيدين
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    الحد الأقصى للأيام المسموحة لمراجعة واعتماد حساب طالب الخدمة الجديد بعد تسجيله، قبل إدراجه في قوائم التصعيد الإداري المعلقة.
                  </p>
                </div>

                <div className="flex items-center gap-2 bg-muted/50 p-1.5 rounded-xl border border-border shrink-0 self-start sm:self-center">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setDraftBeneficiaryDays(prev => Math.max(1, prev - 1))}
                    className="h-8 w-8 p-0 rounded-lg hover:bg-background shadow-xs"
                  >
                    <Minus className="w-4 h-4" />
                  </Button>

                  <Input
                    type="number"
                    min={1}
                    max={60}
                    value={draftBeneficiaryDays}
                    onChange={(e) => setDraftBeneficiaryDays(parseInt(e.target.value) || 1)}
                    className="w-14 text-center font-bold text-sm h-8 bg-background border border-border/80 focus-visible:ring-1 focus-visible:ring-primary p-0"
                  />

                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setDraftBeneficiaryDays(prev => Math.min(60, prev + 1))}
                    className="h-8 w-8 p-0 rounded-lg hover:bg-background shadow-xs"
                  >
                    <Plus className="w-4 h-4" />
                  </Button>

                  <span className="text-xs font-semibold text-muted-foreground px-2">أيام</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 5. القسم الثاني: مدد مراحل الطلبات العشر */}
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-primary" />
              <h3 className="text-sm font-bold text-foreground">مدد مراحل معالجة وتنفيذ الطلبات</h3>
            </div>
            <span className="text-xs text-muted-foreground">
              حدد عدد الأيام المسموحة لكل مرحلة قبل أن يُعتبر الطلب متأخراً
            </span>
          </div>

          <div className="space-y-3">
            {draftStages.map((stg, index) => {
              const meta = STAGE_META[stg.stageCode] || { department: "إدارة العمليات", badgeColor: "bg-muted text-muted-foreground border-border" };

              return (
                <Card 
                  key={stg.stageCode} 
                  className="border border-border/80 shadow-xs hover:border-primary/40 hover:shadow-sm transition-all"
                >
                  <CardContent className="p-4 sm:p-5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      {/* معلومات المرحلة */}
                      <div className="flex items-center gap-3.5 min-w-0">
                        <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary font-bold text-sm flex items-center justify-center shrink-0 border border-primary/20">
                          {index + 1}
                        </div>

                        <div className="min-w-0 space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="font-bold text-sm text-foreground">
                              {stg.stageName}
                            </h4>
                            <Badge variant="outline" className={`text-2xs font-semibold ${meta.badgeColor}`}>
                              {meta.department}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            المرحلة رقم ({index + 1}) في المسار الإجرائي للطلب
                          </p>
                        </div>
                      </div>

                      {/* وحدة تحديد الأيام */}
                      <div className="flex items-center gap-2 bg-muted/50 p-1.5 rounded-xl border border-border shrink-0 self-start sm:self-center">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setDraftStages(prev => prev.map((item, idx) => 
                              idx === index ? { ...item, durationDays: Math.max(0, item.durationDays - 1) } : item
                            ));
                          }}
                          className="h-8 w-8 p-0 rounded-lg hover:bg-background shadow-xs"
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
                          className="w-14 text-center font-bold text-sm h-8 bg-background border border-border/80 focus-visible:ring-1 focus-visible:ring-primary p-0"
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
                          className="h-8 w-8 p-0 rounded-lg hover:bg-background shadow-xs"
                        >
                          <Plus className="w-4 h-4" />
                        </Button>

                        <span className="text-xs font-semibold text-muted-foreground px-2">يوم</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* زر الحفظ العائم في الأسفل عند وجود تعديلات */}
        {hasChanges && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-card/95 backdrop-blur-md border border-border shadow-xl rounded-2xl p-3 px-6 flex items-center gap-4 animate-in fade-in slide-in-from-bottom-4">
            <div className="flex items-center gap-2 text-xs">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
              <span className="font-semibold text-foreground">لديك تعديلات غير محفوظة على مدد الـ SLA</span>
            </div>

            <div className="flex items-center gap-2">
              <Button
                size="sm"
                onClick={handleSave}
                disabled={updateSettingsMutation.isPending}
                className="gradient-primary text-white font-bold text-xs px-5 h-9 rounded-xl shadow-md gap-1.5"
              >
                {updateSettingsMutation.isPending ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Save className="w-3.5 h-3.5" />
                )}
                <span>حفظ التغييرات</span>
              </Button>
            </div>
          </div>
        )}

      </div>
    </DashboardLayout>
  );
}
