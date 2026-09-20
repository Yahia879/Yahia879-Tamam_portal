import React, { useState, useEffect, useMemo } from 'react';
import { useLocation } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Sparkles, 
  Building2, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  PhoneCall, 
  ArrowRight, 
  Send, 
  Loader2, 
  HelpCircle,
  FileCheck,
  ChevronLeft,
  RefreshCw,
  ExternalLink
} from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';

interface SedanaPreQualificationProps {
  userMosques: Array<{ id: number; name: string; city?: string; district?: string; approvalStatus?: string }> | undefined;
  selectedMosqueId?: number;
  onSelectMosque: (id: number) => void;
  inquiryData: any;
  isLoadingInquiry: boolean;
  onInquirySubmitted: () => void;
  onProceedToFullForm: () => void;
  onBackToServices: () => void;
  userPhone?: string | null;
}

export const SedanaPreQualification: React.FC<SedanaPreQualificationProps> = ({
  userMosques,
  selectedMosqueId,
  onSelectMosque,
  inquiryData,
  isLoadingInquiry,
  onInquirySubmitted,
  onProceedToFullForm,
  onBackToServices,
  userPhone,
}) => {
  const [, setLocation] = useLocation();
  const [specificNeeds, setSpecificNeeds] = useState('');
  const [hasCleaningWarehouse, setHasCleaningWarehouse] = useState<'yes' | 'no' | 'partial'>('yes');
  const [warehouseDetails, setWarehouseDetails] = useState('');
  const [hasOperationalPlan, setHasOperationalPlan] = useState<'yes' | 'no'>('yes');
  const [operationalPlanDetails, setOperationalPlanDetails] = useState('');
  const [additionalNotes, setAdditionalNotes] = useState('');
  const [isEditing, setIsEditing] = useState(false);

  // حصر المساجد المعتمدة فقط
  const approvedMosques = useMemo(() => {
    return (userMosques || []).filter(m => m.approvalStatus === 'approved');
  }, [userMosques]);

  const hasApprovedMosque = approvedMosques.length > 0;

  // اختيار المسجد المعتمد تلقائياً إذا كان هناك مسجد معتمد واحد فقط
  useEffect(() => {
    if (approvedMosques.length === 1 && (!selectedMosqueId || selectedMosqueId !== approvedMosques[0].id)) {
      onSelectMosque(approvedMosques[0].id);
    }
  }, [approvedMosques, selectedMosqueId, onSelectMosque]);

  const submitMutation = trpc.sedanaInquiries.submitInquiry.useMutation({
    onSuccess: (res) => {
      toast.success(res.message || 'تم إرسال الاستبيان بنجاح');
      setIsEditing(false);
      onInquirySubmitted();
    },
    onError: (err) => {
      toast.error(err.message || 'حدث خطأ أثناء إرسال الاستبيان');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMosqueId) {
      toast.error('يرجى اختيار المسجد أولاً للمتابعة');
      return;
    }
    if (!specificNeeds.trim() || specificNeeds.trim().length < 5) {
      toast.error('يرجى توضيح ما يحتاجه المسجد بحد أدنى 5 أحرف');
      return;
    }

    submitMutation.mutate({
      mosqueId: selectedMosqueId,
      specificNeeds: specificNeeds.trim(),
      hasCleaningWarehouse,
      warehouseDetails: warehouseDetails.trim() || null,
      hasOperationalPlan,
      operationalPlanDetails: operationalPlanDetails.trim() || null,
      additionalNotes: additionalNotes.trim() || null,
    });
  };

  const selectedMosque = (userMosques || []).find(m => m.id === selectedMosqueId);

  // إذا كانت البيانات أو المساجد قيد التحميل
  if (isLoadingInquiry || userMosques === undefined) {
    return (
      <div className="py-16 flex flex-col items-center justify-center gap-3 text-center">
        <Loader2 className="w-8 h-8 animate-spin text-cyan-600" />
        <p className="text-sm font-bold text-muted-foreground">جاري التحقق من بيانات المساجد وحالة التأهيل لبرنامج سدانة...</p>
      </div>
    );
  }

  // إذا لم يكن لدى مقدم الخدمة أي مسجد معتمد
  if (!hasApprovedMosque) {
    const hasPendingMosques = (userMosques || []).some(m => m.approvalStatus === 'pending');
    return (
      <div className="space-y-6 animate-in fade-in-50 duration-300 max-w-2xl mx-auto">
        <Card className="border-2 border-amber-200 dark:border-amber-900/60 bg-gradient-to-br from-amber-50/70 via-orange-50/30 to-background dark:from-amber-950/20 dark:to-background shadow-md overflow-hidden rounded-2xl">
          <CardHeader className="p-6 sm:p-8 border-b border-amber-100 dark:border-amber-900/40 text-center sm:text-right">
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-amber-500/15 text-amber-700 dark:text-amber-400 flex items-center justify-center shrink-0 shadow-xs ring-4 ring-amber-500/10">
                <Building2 className="w-7 h-7" />
              </div>
              <div className="space-y-1.5 flex-1">
                <div className="flex items-center justify-center sm:justify-start gap-2">
                  <Badge variant="outline" className="bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border-amber-300 text-xs font-bold px-2.5 py-0.5">
                    تنبيه هام
                  </Badge>
                </div>
                <CardTitle className="text-xl sm:text-2xl font-black text-amber-950 dark:text-amber-200">
                  يلزم وجود مسجد معتمد للتقديم على برنامج سدانة
                </CardTitle>
                <CardDescription className="text-xs sm:text-sm leading-relaxed text-amber-900/80 dark:text-amber-300 font-medium">
                  {hasPendingMosques
                    ? 'لديك مساجد مسجلة في حسابك ولكنها ما زالت قيد المراجعة والتدقيق من قِبل إدارة الجمعية.'
                    : 'لا توجد أي مساجد معتمدة مسجلة في حسابك حالياً.'}
                </CardDescription>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-6 sm:p-8 space-y-6">
            <div className="p-4 rounded-xl bg-white/90 dark:bg-slate-900/80 border border-amber-200/80 dark:border-amber-900/50 space-y-2 text-xs sm:text-sm text-foreground leading-relaxed">
              <p className="text-muted-foreground">
                {hasPendingMosques
                  ? 'يشترط أن يكون المسجد معتمداً رسمياً من قِبل الجمعية للبدء في استبيان التأهيل وتوقيع الاتفاقية. يرجى انتظار انتهاء فريق الإدارة من مراجعة واعتماد مسجدكم المسجل أو التواصل مع إدارة الجمعية.'
                  : 'يشترط إضافة بيانات المسجد واعتماده رسمياً أولاً لتتمكن من تعبئة استبيان التأهيل الأولي والتقديم على البرنامج.'}
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
              <Button
                variant="outline"
                onClick={onBackToServices}
                className="w-full sm:w-auto h-11 text-xs font-bold gap-2"
              >
                <ArrowRight className="w-4 h-4" />
                <span>العودة لاختيار خدمة أخرى</span>
              </Button>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                {hasPendingMosques ? (
                  <Button
                    onClick={() => setLocation('/requester/mosques')}
                    className="w-full sm:w-auto h-11 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs gap-2 shadow-xs cursor-pointer px-6"
                  >
                    <Building2 className="w-4 h-4" />
                    <span>متابعة حالة مساجدي</span>
                  </Button>
                ) : (
                  <Button
                    onClick={() => setLocation('/requester/mosques/new')}
                    className="w-full sm:w-auto h-11 bg-cyan-600 hover:bg-cyan-700 text-white font-bold text-xs gap-2 shadow-xs cursor-pointer px-6"
                  >
                    <Building2 className="w-4 h-4" />
                    <span>إضافة مسجد جديد</span>
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // الحالة 1: الاستبيان معتمد ومؤهل للتقديم
  if (inquiryData?.status === 'approved' && !inquiryData?.completedRequestId) {
    return (
      <div className="space-y-6 animate-in fade-in-50 duration-300">
        <Card className="border-2 border-emerald-500/40 bg-gradient-to-br from-emerald-50/90 via-teal-50/50 to-background dark:from-emerald-950/30 dark:to-background overflow-hidden shadow-lg">
          <CardHeader className="p-6 sm:p-8 border-b border-emerald-200/60 dark:border-emerald-900/40">
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 text-center sm:text-right">
              <div className="w-14 h-14 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-md ring-4 ring-emerald-500/20">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div className="space-y-1.5 flex-1">
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                  <Badge className="bg-emerald-600 text-white text-xs font-bold px-2.5 py-0.5">
                    مؤهل ومعتمد للتقديم
                  </Badge>
                  <span className="text-xs text-muted-foreground font-mono">
                    تاريخ الاعتماد: {new Date(inquiryData.reviewedAt || inquiryData.createdAt).toLocaleDateString('ar-SA')}
                  </span>
                </div>
                <CardTitle className="text-xl sm:text-2xl font-black text-emerald-950 dark:text-emerald-300">
                  تم اعتماد تأهيل مسجدكم لبرنامج سدانة بنجاح!
                </CardTitle>
                <CardDescription className="text-sm text-emerald-800/90 dark:text-emerald-400 font-medium">
                  المسجد: <strong>{selectedMosque?.name || inquiryData.mosqueName}</strong>
                </CardDescription>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-6 sm:p-8 space-y-6">
            <div className="p-4 rounded-xl bg-white/80 dark:bg-slate-900/60 border border-emerald-200 dark:border-emerald-900/50 space-y-2 text-xs sm:text-sm leading-relaxed text-foreground">
              <p className="font-bold text-emerald-900 dark:text-emerald-300 flex items-center gap-2">
                <FileCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                تم فتح صلاحية إكمال الطلب وتوقيع الاتفاقية:
              </p>
              <p className="text-muted-foreground">
                بناءً على مراجعة الاستبيان والتواصل الهاتفي، أصبح بإمكانكم الآن الدخول وتوقيع الاتفاقية الرسمية وتحديد سلة الاحتياجات السنوية لمسجدكم لرفع الطلب النهائي.
              </p>
              {inquiryData.actionNotes && (
                <div className="mt-3 p-3 rounded-lg bg-emerald-100/60 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 text-xs">
                  <span className="font-bold text-emerald-900 dark:text-emerald-300">ملاحظات فريق المشاريع: </span>
                  <span className="text-emerald-950 dark:text-emerald-200">{inquiryData.actionNotes}</span>
                </div>
              )}
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
              <Button
                variant="outline"
                onClick={onBackToServices}
                className="w-full sm:w-auto h-11 text-xs font-bold gap-2"
              >
                <ArrowRight className="w-4 h-4" />
                <span>العودة لقائمة الخدمات</span>
              </Button>

              <Button
                onClick={onProceedToFullForm}
                className="w-full sm:w-auto h-11 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-sm gap-2 shadow-md hover:shadow-lg transition-all cursor-pointer px-8"
              >
                <span>المتابعة لتوقيع الاتفاقية وسلة الاحتياجات</span>
                <ChevronLeft className="w-5 h-5" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // الحالة 2: الاستبيان معلق وقيد التواصل والمراجعة
  if (inquiryData?.status === 'pending' && !isEditing) {
    return (
      <div className="space-y-6 animate-in fade-in-50 duration-300">
        <Card className="border-2 border-cyan-200 dark:border-cyan-900 bg-gradient-to-br from-cyan-50/80 via-sky-50/30 to-background dark:from-cyan-950/30 dark:to-background overflow-hidden shadow-sm">
          <CardHeader className="p-6 sm:p-8 border-b border-cyan-100 dark:border-cyan-900/60">
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 text-center sm:text-right">
              <div className="w-14 h-14 rounded-2xl bg-cyan-600 text-white flex items-center justify-center shrink-0 shadow-md ring-4 ring-cyan-500/20">
                <Clock className="w-8 h-8" />
              </div>
              <div className="space-y-1.5 flex-1">
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                  <Badge className="bg-cyan-600 text-white text-xs font-bold px-2.5 py-0.5">
                    قيد التواصل والمراجعة
                  </Badge>
                  <span className="text-xs text-muted-foreground font-mono">
                    تاريخ الإرسال: {new Date(inquiryData.createdAt).toLocaleDateString('ar-SA')}
                  </span>
                </div>
                <CardTitle className="text-xl sm:text-2xl font-black text-cyan-950 dark:text-cyan-200">
                  استبيان برنامج سدانة قيد المراجعة والتواصل
                </CardTitle>
                <CardDescription className="text-sm text-cyan-900/80 dark:text-cyan-300 font-medium">
                  المسجد: <strong>{selectedMosque?.name || inquiryData.mosqueName}</strong>
                </CardDescription>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-6 sm:p-8 space-y-6">
            <div className="p-4 rounded-xl bg-white/90 dark:bg-slate-900/60 border border-cyan-200 dark:border-cyan-900/50 space-y-3 text-xs sm:text-sm text-foreground">
              <div className="flex items-center gap-2 text-cyan-900 dark:text-cyan-300 font-bold text-sm">
                <PhoneCall className="w-4 h-4 text-cyan-600 shrink-0" />
                <span>سيقوم فريق مشاريع الجمعية بالتواصل معكم هاتفياً</span>
              </div>
              <p className="text-muted-foreground leading-relaxed">
                تم استلام استبيانكم بنجاح وهو الآن تحت دراسة فريق المشاريع. سيتواصل معكم أحد ممثلي الجمعية هاتفياً على رقم جوالكم ({userPhone || 'المسجل بالنظام'}) لمناقشة تفاصيل الاحتياج والتأكد من ملاءمة البرنامج للمسجد.
              </p>
            </div>

            {/* ملخص إجابات الاستبيان المرسل */}
            <div className="space-y-3 pt-2">
              <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <HelpCircle className="w-4 h-4 text-cyan-600" />
                إجابات الاستبيان التي تم إرسالها:
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-lg bg-muted/40 border border-border space-y-1">
                  <span className="text-muted-foreground text-[11px] block">الاحتياج المحدد للمسجد:</span>
                  <p className="font-semibold text-foreground">{inquiryData.specificNeeds}</p>
                </div>

                <div className="p-3 rounded-lg bg-muted/40 border border-border space-y-1">
                  <span className="text-muted-foreground text-[11px] block">جاهزية مستودع النظافة:</span>
                  <p className="font-semibold text-foreground">
                    {inquiryData.hasCleaningWarehouse === 'yes' ? 'متوفر مستودع مخصص' :
                     inquiryData.hasCleaningWarehouse === 'partial' ? 'متوفر جزئياً (غرفة/خزانة)' : 'غير متوفر حالياً'}
                  </p>
                  {inquiryData.warehouseDetails && (
                    <p className="text-[11px] text-muted-foreground">{inquiryData.warehouseDetails}</p>
                  )}
                </div>

                <div className="p-3 rounded-lg bg-muted/40 border border-border space-y-1">
                  <span className="text-muted-foreground text-[11px] block">الخطة التشغيلية للمسجد:</span>
                  <p className="font-semibold text-foreground">
                    {inquiryData.hasOperationalPlan === 'yes' ? 'توجد خطة وجدول دوري' : 'لا توجد خطة محددة حالياً'}
                  </p>
                  {inquiryData.operationalPlanDetails && (
                    <p className="text-[11px] text-muted-foreground">{inquiryData.operationalPlanDetails}</p>
                  )}
                </div>

                {inquiryData.additionalNotes && (
                  <div className="p-3 rounded-lg bg-muted/40 border border-border space-y-1">
                    <span className="text-muted-foreground text-[11px] block">ملاحظات إضافية:</span>
                    <p className="font-semibold text-foreground">{inquiryData.additionalNotes}</p>
                  </div>
                )}
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-border">
              <Button
                variant="outline"
                onClick={onBackToServices}
                className="h-10 text-xs font-bold gap-2"
              >
                <ArrowRight className="w-4 h-4" />
                <span>العودة لقائمة الخدمات</span>
              </Button>

              <Button
                variant="ghost"
                onClick={() => {
                  setSpecificNeeds(inquiryData.specificNeeds || '');
                  setHasCleaningWarehouse(inquiryData.hasCleaningWarehouse || 'yes');
                  setWarehouseDetails(inquiryData.warehouseDetails || '');
                  setHasOperationalPlan(inquiryData.hasOperationalPlan || 'yes');
                  setOperationalPlanDetails(inquiryData.operationalPlanDetails || '');
                  setAdditionalNotes(inquiryData.additionalNotes || '');
                  setIsEditing(true);
                }}
                className="h-10 text-xs font-bold text-cyan-700 hover:text-cyan-800 hover:bg-cyan-50 dark:text-cyan-400 dark:hover:bg-cyan-950/50 gap-1.5 cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>تعديل الإجابات وإعادة الإرسال</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // الحالة 3: تم الرفض أو التوجيه لبديل
  if (inquiryData?.status === 'rejected' && !isEditing) {
    return (
      <div className="space-y-6 animate-in fade-in-50 duration-300">
        <Card className="border-2 border-slate-200 dark:border-slate-800 bg-gradient-to-br from-slate-50/80 via-cyan-50/20 to-background dark:from-slate-950 dark:to-background overflow-hidden shadow-sm">
          <CardHeader className="p-6 sm:p-8 border-b border-slate-200/60 dark:border-slate-800">
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 text-center sm:text-right">
              <div className="w-14 h-14 rounded-2xl bg-cyan-700 text-white flex items-center justify-center shrink-0 shadow-md">
                <AlertCircle className="w-8 h-8" />
              </div>
              <div className="space-y-1.5 flex-1">
                <Badge variant="outline" className="bg-cyan-50 text-cyan-800 border-cyan-200 text-xs font-bold px-2.5 py-0.5">
                  توجيه فريق المشاريع
                </Badge>
                <CardTitle className="text-xl sm:text-2xl font-black text-foreground">
                  توجيه الإدارة بخصوص طلب سدانة
                </CardTitle>
                <CardDescription className="text-sm text-muted-foreground font-medium">
                  المسجد: <strong>{selectedMosque?.name || inquiryData.mosqueName}</strong>
                </CardDescription>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-6 sm:p-8 space-y-6">
            <div className="p-4 rounded-xl bg-white/80 dark:bg-slate-900/60 border border-border space-y-2 text-xs sm:text-sm text-foreground">
              <p className="font-bold text-foreground">ملاحظات وتوجيه فريق المشاريع:</p>
              <p className="text-muted-foreground leading-relaxed">
                {inquiryData.actionNotes || 'بعد دراسة الاستبيان والتواصل، تبين أن احتياج المسجد لا يتطابق حالياً مع متطلبات برنامج سدانة السنوي.'}
              </p>
              {inquiryData.redirectProgram && (
                <div className="mt-3 p-3 rounded-lg bg-cyan-50 dark:bg-cyan-950/60 border border-cyan-200 dark:border-cyan-800 text-xs text-cyan-900 dark:text-cyan-300 flex items-center justify-between gap-2">
                  <span>تم توجيهكم لتقديم طلب ضمن البرنامج البديل: <strong>{inquiryData.redirectProgram}</strong></span>
                </div>
              )}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-border">
              <Button
                variant="outline"
                onClick={onBackToServices}
                className="h-10 text-xs font-bold gap-2"
              >
                <ArrowRight className="w-4 h-4" />
                <span>العودة لقائمة الخدمات</span>
              </Button>

              <Button
                variant="outline"
                onClick={() => {
                  setSpecificNeeds('');
                  setWarehouseDetails('');
                  setOperationalPlanDetails('');
                  setAdditionalNotes('');
                  setIsEditing(true);
                }}
                className="h-10 text-xs font-bold text-foreground border-border hover:bg-muted gap-1.5 cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>تقديم استبيان جديد</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // الحالة 4: تعبئة استبيان أولي جديد
  return (
    <div className="space-y-6 animate-in fade-in-50 duration-300">
      {/* البطاقة الترحيبية والتوضيحية */}
      <Card className="border border-cyan-200 dark:border-cyan-900/60 bg-gradient-to-r from-cyan-50/70 via-sky-50/30 to-background dark:from-cyan-950/30 dark:to-background shadow-xs overflow-hidden">
        <CardHeader className="p-6 pb-4">
          <div className="flex items-start gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-cyan-600 text-white flex items-center justify-center shrink-0 shadow-md">
              <Sparkles className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <CardTitle className="text-lg sm:text-xl font-black text-foreground">
                  استبيان التأهيل الأولي لبرنامج «سدانة»
                </CardTitle>
                <Badge variant="outline" className="bg-cyan-100 text-cyan-800 dark:bg-cyan-950 dark:text-cyan-300 border-cyan-300 text-[11px] font-bold">
                  مرحلة ما قبل التقديم
                </Badge>
              </div>
              <CardDescription className="text-xs sm:text-sm leading-relaxed text-muted-foreground">
                نظراً لخصوصية برنامج «سدانة» (التشغيل والنظافة السنوية الشاملة)، يرجى الإجابة عن هذه الأسئلة التمهيدية السريعة، حيث سيقوم فريق الجمعية بمراجعتها والتواصل معكم هاتفياً لتمكينكم من رفع الطلب وتوقيع الاتفاقية.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* نموذج الاستبيان الأولي */}
      <Card className="border border-border shadow-md rounded-2xl overflow-hidden bg-background">
        <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-6">
          {/* اختيار المسجد المستهدف */}
          <div className="space-y-2">
            <Label className="text-xs sm:text-sm font-bold flex items-center gap-1.5 text-foreground">
              <Building2 className="w-4 h-4 text-cyan-600" />
              <span>المسجد المراد تقديم الطلب له *</span>
            </Label>

            {approvedMosques.length > 1 ? (
              <Select
                value={selectedMosqueId ? String(selectedMosqueId) : ''}
                onValueChange={(val) => onSelectMosque(Number(val))}
              >
                <SelectTrigger className="h-10 text-xs sm:text-sm bg-background font-medium">
                  <SelectValue placeholder="اختر المسجد من مساجدك المعتمدة..." />
                </SelectTrigger>
                <SelectContent dir="rtl">
                  {approvedMosques.map((m) => (
                    <SelectItem key={m.id} value={String(m.id)} className="text-xs sm:text-sm cursor-pointer">
                      <span>{m.name}</span>
                      {m.city && <span className="text-muted-foreground mr-2 font-normal">({m.city} - {m.district || ''})</span>}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : approvedMosques.length === 1 ? (
              <div className="p-3 rounded-xl bg-muted/40 border border-border flex items-center justify-between text-xs sm:text-sm">
                <span className="font-bold text-foreground">{approvedMosques[0].name}</span>
                <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-300 text-[11px] font-bold">
                  المسجد المعتمد
                </Badge>
              </div>
            ) : null}
          </div>

          {/* السؤال 1: الاحتياج المحدد */}
          <div className="space-y-2">
            <Label htmlFor="specificNeeds" className="text-xs sm:text-sm font-bold flex items-center gap-1.5 text-foreground">
              <span className="w-5 h-5 rounded-full bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200 text-xs flex items-center justify-center font-bold">1</span>
              <span>ما الذي تحتاجونه تحديداً في المسجد من البرنامج؟ *</span>
            </Label>
            <p className="text-[11px] text-muted-foreground">
              وضح بالتفصيل الخدمات والمواد المطلوبة (مثال: عمالة، مواد ومطهرات نظافة شهرية، صيانة مكيفات وفلاتر مياه، معطرات وبخور...).
            </p>
            <Textarea
              id="specificNeeds"
              value={specificNeeds}
              onChange={(e) => setSpecificNeeds(e.target.value)}
              placeholder="اكتب تفاصيل الاحتياج الفعلي للمسجد هنا..."
              rows={3}
              className="text-xs sm:text-sm leading-relaxed"
              required
            />
          </div>

          {/* السؤال 2: جاهزية المستودع */}
          <div className="space-y-3">
            <Label className="text-xs sm:text-sm font-bold flex items-center gap-1.5 text-foreground">
              <span className="w-5 h-5 rounded-full bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200 text-xs flex items-center justify-center font-bold">2</span>
              <span>هل يتوفر مستودع أو مكان مخصص لحفظ وتخزين مواد وأدوات النظافة بالمسجد؟ *</span>
            </Label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {[
                { value: 'yes' as const, label: 'نعم، متوفر مستودع مخصص' },
                { value: 'partial' as const, label: 'جزئياً (غرفة أو خزانة مغلقة)' },
                { value: 'no' as const, label: 'لا يتوفر مستودع حالياً' },
              ].map((opt) => {
                const isSelected = hasCleaningWarehouse === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setHasCleaningWarehouse(opt.value)}
                    className={`p-3.5 rounded-xl border-2 transition-all cursor-pointer flex items-center gap-2.5 select-none text-right w-full ${
                      isSelected
                        ? 'border-cyan-600 bg-cyan-50/70 dark:bg-cyan-950/40 shadow-xs ring-1 ring-cyan-500/20'
                        : 'border-border hover:border-cyan-300 dark:hover:border-cyan-700 hover:bg-muted/40'
                    }`}
                  >
                    <div
                      className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 transition-colors ${
                        isSelected
                          ? 'border-cyan-600 bg-background'
                          : 'border-muted-foreground/40 bg-background'
                      }`}
                    >
                      {isSelected && <div className="w-2 h-2 rounded-full bg-cyan-600" />}
                    </div>
                    <span className="text-xs font-bold text-foreground flex-1">
                      {opt.label}
                    </span>
                  </button>
                );
              })}
            </div>

            {hasCleaningWarehouse !== 'yes' && (
              <div className="pt-1">
                <Textarea
                  value={warehouseDetails}
                  onChange={(e) => setWarehouseDetails(e.target.value)}
                  placeholder="ملاحظات حول طريقة التخزين أو المكان البديل المتاح لحفظ الأدوات..."
                  rows={2}
                  className="text-xs"
                />
              </div>
            )}
          </div>

          {/* السؤال 3: الخطة التشغيلية */}
          <div className="space-y-3">
            <Label className="text-xs sm:text-sm font-bold flex items-center gap-1.5 text-foreground">
              <span className="w-5 h-5 rounded-full bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200 text-xs flex items-center justify-center font-bold">3</span>
              <span>هل توجد خطة تشغيلية أو جدول دوري لنظافة وصيانة المسجد (سنوية/شهرية)؟ *</span>
            </Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {[
                { value: 'yes' as const, label: 'نعم، توجد خطة وجدول دوري معتمد' },
                { value: 'no' as const, label: 'لا توجد خطة محددة حالياً' },
              ].map((opt) => {
                const isSelected = hasOperationalPlan === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setHasOperationalPlan(opt.value)}
                    className={`p-3.5 rounded-xl border-2 transition-all cursor-pointer flex items-center gap-2.5 select-none text-right w-full ${
                      isSelected
                        ? 'border-cyan-600 bg-cyan-50/70 dark:bg-cyan-950/40 shadow-xs ring-1 ring-cyan-500/20'
                        : 'border-border hover:border-cyan-300 dark:hover:border-cyan-700 hover:bg-muted/40'
                    }`}
                  >
                    <div
                      className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 transition-colors ${
                        isSelected
                          ? 'border-cyan-600 bg-background'
                          : 'border-muted-foreground/40 bg-background'
                      }`}
                    >
                      {isSelected && <div className="w-2 h-2 rounded-full bg-cyan-600" />}
                    </div>
                    <span className="text-xs font-bold text-foreground flex-1">
                      {opt.label}
                    </span>
                  </button>
                );
              })}
            </div>

            {hasOperationalPlan === 'yes' && (
              <div className="pt-1">
                <Textarea
                  value={operationalPlanDetails}
                  onChange={(e) => setOperationalPlanDetails(e.target.value)}
                  placeholder="ملاحظات أو نبذة مختصرة عن الخطة التشغيلية الحالية للمسجد (اختياري)..."
                  rows={2}
                  className="text-xs"
                />
              </div>
            )}
          </div>

          {/* السؤال 4: ملاحظات إضافية */}
          <div className="space-y-2">
            <Label htmlFor="additionalNotes" className="text-xs sm:text-sm font-bold flex items-center gap-1.5 text-foreground">
              <span className="w-5 h-5 rounded-full bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200 text-xs flex items-center justify-center font-bold">4</span>
              <span>أي ملاحظات أو مقترحات إضافية من فضيلتكم (اختياري)</span>
            </Label>
            <Textarea
              id="additionalNotes"
              value={additionalNotes}
              onChange={(e) => setAdditionalNotes(e.target.value)}
              placeholder="اكتب أي ملاحظة تود مشاركتها مع فريق الجمعية..."
              rows={2}
              className="text-xs"
            />
          </div>

          {/* أزرار الإجراء */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-6 border-t border-border">
            <Button
              type="button"
              variant="outline"
              onClick={onBackToServices}
              className="w-full sm:w-auto h-11 text-xs font-bold gap-2"
            >
              <ArrowRight className="w-4 h-4" />
              <span>العودة لقائمة الخدمات</span>
            </Button>

            <Button
              type="submit"
              disabled={submitMutation.isPending || !selectedMosqueId}
              className="w-full sm:w-auto h-11 bg-cyan-600 hover:bg-cyan-700 text-white font-extrabold text-xs sm:text-sm gap-2 shadow-md hover:shadow-lg transition-all cursor-pointer px-8"
            >
              {submitMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>جاري إرسال الاستبيان...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>إرسال الاستبيان لفريق الجمعية</span>
                </>
              )}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
};
