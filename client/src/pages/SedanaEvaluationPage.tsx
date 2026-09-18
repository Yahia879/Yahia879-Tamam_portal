import React from 'react';
import { useParams, useLocation } from 'wouter';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { SedanaOfficeEvaluation } from '@/components/sedana/SedanaOfficeEvaluation';
import {
  Building2,
  Ruler,
  Users,
  Sparkles,
  FileSpreadsheet,
  ArrowRight,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';

export default function SedanaEvaluationPage() {
  const params = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const requestId = parseInt(params.id || '0');

  const {
    data: request,
    isLoading,
    error,
    refetch,
  } = trpc.requests.getById.useQuery(
    { id: requestId },
    { enabled: !!requestId && requestId > 0 }
  );

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-6" dir="rtl">
        <div className="bg-card p-8 rounded-2xl border shadow-lg flex flex-col items-center gap-4 text-center max-w-sm">
          <Loader2 className="w-10 h-10 animate-spin text-cyan-600" />
          <h3 className="font-bold text-lg text-foreground">جاري تحميل تفاصيل دراسة الاحتياج...</h3>
          <p className="text-xs text-muted-foreground">يتم استرجاع بيانات المسجد وبنود سدانة المسجلة</p>
        </div>
      </div>
    );
  }

  if (error || !request) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-6" dir="rtl">
        <Card className="p-8 max-w-md text-center space-y-4">
          <AlertCircle className="w-12 h-12 text-destructive mx-auto" />
          <h3 className="text-xl font-bold text-foreground">تعذر العثور على الطلب</h3>
          <p className="text-sm text-muted-foreground">
            {error?.message || 'لم يتم العثور على بيانات الطلب المطلوب أو لا تملك صلاحية الوصول إليه.'}
          </p>
          <Button onClick={() => setLocation('/requests')} className="w-full">
            العودة إلى قائمة الطلبات
          </Button>
        </Card>
      </div>
    );
  }

  // Parse program data
  let programData: Record<string, any> = {};
  try {
    if (typeof request.programData === 'string') {
      programData = JSON.parse(request.programData);
    } else {
      programData = (request.programData as Record<string, any>) || {};
    }
  } catch (e) {
    programData = {};
  }

  const mosque = request.mosque;
  const mosqueName = mosque?.name || (request as any).mosqueName || 'غير محدد';
  const mosqueCity = mosque?.city || 'غير محدد';
  const mosqueDistrict = mosque?.district ? `حي ${mosque.district}` : '';
  const mosqueArea = Number(programData.mosqueArea ?? mosque?.area ?? 250);
  const worshippers = Number(programData.actualWorshippers ?? mosque?.capacity ?? 150);

  const womenArea = programData.womenPrayerArea;
  const womenCapacity = programData.womenPrayerCapacity;
  const hasWomenHall = Boolean(womenArea || womenCapacity || mosque?.hasPrayerHall);

  return (
    <div className="min-h-screen bg-slate-50/70 dark:bg-slate-950 text-right pb-16" dir="rtl">
      {/* Top Header / Navigation Bar */}
      <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-md border-b border-border/80 shadow-2xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setLocation(`/requests/${requestId}`)}
              className="gap-2 text-xs font-semibold cursor-pointer border-cyan-200 dark:border-cyan-900 hover:bg-cyan-50 dark:hover:bg-cyan-950/40 text-cyan-800 dark:text-cyan-300"
            >
              <ArrowRight className="w-4 h-4" />
              <span>العودة إلى تفاصيل الطلب</span>
            </Button>
            <div className="h-5 w-px bg-border/80 hidden sm:block" />
            <div>
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
                <h1 className="text-lg sm:text-xl font-bold text-foreground">
                  تفاصيل طلب سدانة وإحصائيات المسجد
                </h1>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                مسجد {mosqueName} • {mosqueCity} {mosqueDistrict ? `• ${mosqueDistrict}` : ''}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Badge variant="outline" className="bg-cyan-50 dark:bg-cyan-950/40 border-cyan-200 dark:border-cyan-800 text-cyan-800 dark:text-cyan-300 font-mono text-xs px-2.5 py-1">
              {request.requestNumber || `#${request.id}`}
            </Badge>
            <Badge variant="secondary" className="text-xs px-2.5 py-1">
              خدمات التشغيل (سدانة)
            </Badge>
          </div>
        </div>
      </header>

      {/* Main Full-Screen Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* 1. بطاقة كافة معلومات المسجد المسجلة */}
        <div className="rounded-2xl border border-cyan-200/80 dark:border-cyan-900/60 bg-cyan-50/20 dark:bg-cyan-950/15 p-5 sm:p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-cyan-200/60 dark:border-cyan-900/40">
            <h2 className="font-bold text-base sm:text-lg text-cyan-950 dark:text-cyan-100 flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-cyan-100 dark:bg-cyan-900/40 text-cyan-700 dark:text-cyan-300">
                <Building2 className="w-5 h-5" />
              </div>
              <span>معلومات وبيانات المسجد المسجلة</span>
            </h2>
            <span className="text-xs font-mono font-bold px-3 py-1 rounded-full bg-cyan-100 dark:bg-cyan-900/60 text-cyan-800 dark:text-cyan-300">
              {request.requestNumber || `#${request.id}`}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 text-xs">
            {/* اسم المسجد */}
            <div className="bg-card p-3 rounded-xl border border-border/70 shadow-2xs">
              <span className="text-[11px] text-muted-foreground block mb-1">اسم المسجد</span>
              <strong className="text-foreground font-bold text-sm truncate block">{mosqueName}</strong>
            </div>

            {/* المدينة والحي */}
            <div className="bg-card p-3 rounded-xl border border-border/70 shadow-2xs">
              <span className="text-[11px] text-muted-foreground block mb-1">المدينة والحي</span>
              <strong className="text-foreground font-bold text-sm truncate block">
                {mosqueCity} {mosqueDistrict ? `• ${mosqueDistrict}` : ''}
              </strong>
            </div>

            {/* مساحة المسجد */}
            <div className="bg-card p-3 rounded-xl border border-border/70 shadow-2xs">
              <span className="text-[11px] text-muted-foreground block mb-1 flex items-center gap-1">
                <Ruler className="w-3.5 h-3.5 text-cyan-600" />
                <span>مساحة المسجد</span>
              </span>
              <strong className="text-foreground font-bold text-sm font-mono">{mosqueArea} م²</strong>
            </div>

            {/* سعة المصلين */}
            <div className="bg-card p-3 rounded-xl border border-border/70 shadow-2xs">
              <span className="text-[11px] text-muted-foreground block mb-1 flex items-center gap-1">
                <Users className="w-3.5 h-3.5 text-cyan-600" />
                <span>سعة المصلين التقديرية</span>
              </span>
              <strong className="text-foreground font-bold text-sm font-mono">{worshippers} مصلٍ</strong>
            </div>

            {/* مصلى النساء */}
            <div className="bg-card p-3 rounded-xl border border-border/70 shadow-2xs">
              <span className="text-[11px] text-muted-foreground block mb-1">مصلى النساء</span>
              <strong className="text-foreground font-bold text-sm truncate block">
                {hasWomenHall
                  ? `${womenArea ? `${womenArea} م²` : 'متوفر'}${
                      womenCapacity ? ` (${womenCapacity} مصلية)` : ''
                    }`
                  : 'غير متوفر'}
              </strong>
            </div>
          </div>
        </div>

        {/* 2. قسم جدول الإحصائيات ودراسة الاحتياج السنوي */}
        <div className="space-y-4">
          <div className="flex items-center gap-2.5 pb-2 border-b border-border/70">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base sm:text-lg text-foreground">
                جدول إحصائيات دراسة وتدقيق الاحتياج السنوي
              </h3>
              <p className="text-xs text-muted-foreground">
                تدقيق الكميات المطلوبة ومقارنتها بالمعيار القياسي المعتمد لمسجد بمساحة {mosqueArea} م² وسعة {worshippers} مصلٍ
              </p>
            </div>
          </div>

          {/* استدعاء المكون المكتبي لاعتماد البنود والكميات */}
          <SedanaOfficeEvaluation
            request={request as any}
            onEvaluationComplete={() => {
              refetch();
              toast.success('تم تحديث دراسة الاحتياج بنجاح');
            }}
            canEvaluate={true}
          />
        </div>
      </main>
    </div>
  );
}
