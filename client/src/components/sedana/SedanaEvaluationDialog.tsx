import React from 'react';
import { ColoredDialog } from '@/components/ColoredDialog';
import { SedanaOfficeEvaluation } from './SedanaOfficeEvaluation';
import {
  Building2,
  MapPin,
  Ruler,
  Users,
  Droplets,
  Image as ImageIcon,
  Sparkles,
  PauseCircle,
  XCircle,
  FileSpreadsheet,
  User,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface SedanaEvaluationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  request: any;
  onEvaluationComplete?: () => void;
  canEvaluate?: boolean;
  onSuspend?: () => void;
  onApologize?: () => void;
  isActionPending?: boolean;
}

export const SedanaEvaluationDialog: React.FC<SedanaEvaluationDialogProps> = ({
  open,
  onOpenChange,
  request,
  onEvaluationComplete,
  canEvaluate = true,
  onSuspend,
  onApologize,
  isActionPending = false,
}) => {
  let programData: Record<string, any> = {};
  try {
    if (typeof request?.programData === 'string') {
      programData = JSON.parse(request.programData);
    } else {
      programData = request?.programData || {};
    }
  } catch (e) {
    programData = {};
  }

  const mosque = request?.mosque;
  const mosqueName = mosque?.name || request?.mosqueName || 'غير محدد';
  const mosqueCity = mosque?.city || 'غير محدد';
  const mosqueDistrict = mosque?.district ? `حي ${mosque.district}` : '';
  const mosqueArea = Number(programData.mosqueArea ?? mosque?.area ?? 250);
  const worshippers = Number(programData.actualWorshippers ?? mosque?.capacity ?? 150);
  const isConnectedToDesalination: boolean =
    programData.isConnectedToDesalination !== undefined
      ? Boolean(programData.isConnectedToDesalination)
      : true;

  const womenArea = programData.womenPrayerArea;
  const womenCapacity = programData.womenPrayerCapacity;
  const hasWomenHall = Boolean(womenArea || womenCapacity || mosque?.hasPrayerHall);

  const mosqueType = mosque?.mosqueType || 'جامع';
  const ownershipMap: Record<string, string> = {
    government: 'حكومي',
    waqf: 'وقف',
    private: 'أهلي',
  };
  const ownership = ownershipMap[mosque?.ownership] || mosque?.ownership || 'حكومي';

  const warehousePhoto = programData.warehousePhoto;
  const requesterName = request?.requester?.name || request?.requesterName;
  const requesterPhone = request?.requester?.phone || request?.requesterPhone;

  return (
    <ColoredDialog
      open={open}
      onOpenChange={onOpenChange}
      title="تفاصيل طلب سدانة وإحصائيات المسجد"
      color="cyan"
      wide={true}
      icon={<Sparkles className="w-6 h-6 text-cyan-600" />}
    >
      <div className="space-y-5 text-right p-1" dir="rtl">
        {/* 1. بطاقة كافة معلومات المسجد المسجلة */}
        <div className="rounded-xl border border-cyan-200/80 dark:border-cyan-900/60 bg-cyan-50/30 dark:bg-cyan-950/20 p-4 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-cyan-200/60 dark:border-cyan-900/40">
            <h4 className="font-bold text-sm sm:text-base text-cyan-950 dark:text-cyan-100 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
              <span>كافة معلومات وبيانات المسجد المسجلة</span>
            </h4>
            <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-cyan-100 dark:bg-cyan-900/60 text-cyan-800 dark:text-cyan-300">
              {request?.requestNumber || `#${request?.id}`}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5 sm:gap-3 text-xs">
            {/* اسم المسجد */}
            <div className="bg-white/80 dark:bg-slate-900/70 p-2.5 rounded-lg border border-border/60 shadow-2xs">
              <span className="text-[11px] text-muted-foreground block mb-0.5">اسم المسجد</span>
              <strong className="text-foreground font-bold truncate block">{mosqueName}</strong>
            </div>

            {/* المدينة والحي */}
            <div className="bg-white/80 dark:bg-slate-900/70 p-2.5 rounded-lg border border-border/60 shadow-2xs">
              <span className="text-[11px] text-muted-foreground block mb-0.5">المدينة والحي</span>
              <strong className="text-foreground font-bold truncate block">
                {mosqueCity} {mosqueDistrict ? `• ${mosqueDistrict}` : ''}
              </strong>
            </div>

            {/* مساحة المسجد */}
            <div className="bg-white/80 dark:bg-slate-900/70 p-2.5 rounded-lg border border-border/60 shadow-2xs">
              <span className="text-[11px] text-muted-foreground block mb-0.5 flex items-center gap-1">
                <Ruler className="w-3 h-3 text-cyan-600" />
                <span>مساحة المسجد</span>
              </span>
              <strong className="text-foreground font-bold font-mono">{mosqueArea} م²</strong>
            </div>

            {/* سعة المصلين */}
            <div className="bg-white/80 dark:bg-slate-900/70 p-2.5 rounded-lg border border-border/60 shadow-2xs">
              <span className="text-[11px] text-muted-foreground block mb-0.5 flex items-center gap-1">
                <Users className="w-3 h-3 text-cyan-600" />
                <span>سعة المصلين التقديرية</span>
              </span>
              <strong className="text-foreground font-bold font-mono">{worshippers} مصلٍ</strong>
            </div>

            {/* مصلى النساء */}
            <div className="bg-white/80 dark:bg-slate-900/70 p-2.5 rounded-lg border border-border/60 shadow-2xs">
              <span className="text-[11px] text-muted-foreground block mb-0.5">مصلى النساء</span>
              <strong className="text-foreground font-bold truncate block">
                {hasWomenHall
                  ? `${womenArea ? `${womenArea} م²` : 'متوفر'}${
                      womenCapacity ? ` (${womenCapacity} مصلية)` : ''
                    }`
                  : 'غير متوفر'}
              </strong>
            </div>
          </div>

          {/* بيانات مقدم الطلب إن وجدت */}
          {requesterName && (
            <div className="pt-2 text-[11px] text-muted-foreground flex flex-wrap items-center gap-3 border-t border-cyan-200/40 dark:border-cyan-900/30">
              <span className="flex items-center gap-1">
                <User className="w-3 h-3 text-cyan-600" />
                <span>مقدم الطلب:</span>
                <strong className="text-foreground font-semibold">{requesterName}</strong>
              </span>
              {requesterPhone && (
                <span>
                  الجوال: <span className="font-mono">{requesterPhone}</span>
                </span>
              )}
            </div>
          )}
        </div>

        {/* 2. جدول الإحصائيات ودراسة وتدقيق الاحتياج السنوي */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 pb-1 border-b border-border/60">
            <FileSpreadsheet className="w-4 h-4 text-cyan-600" />
            <h4 className="font-bold text-sm sm:text-base text-foreground">
              جدول إحصائيات دراسة وتدقيق الاحتياج السنوي
            </h4>
          </div>

          <SedanaOfficeEvaluation
            request={request}
            onEvaluationComplete={() => {
              if (onEvaluationComplete) onEvaluationComplete();
              onOpenChange(false);
            }}
            canEvaluate={canEvaluate}
          />
        </div>

        {/* 3. خيارات إدارية بديلة */}
        {canEvaluate && (onSuspend || onApologize) && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-border/70 bg-muted/20 p-3 rounded-xl">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <AlertCircle className="w-4 h-4 text-amber-500" />
              <span>خيارات إدارية بديلة عند تعثر الاعتماد:</span>
            </div>
            <div className="flex items-center gap-2">
              {onSuspend && (
                <button
                  type="button"
                  className="px-3 py-1.5 rounded-lg border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-800 text-xs font-semibold flex items-center gap-1.5 transition-colors dark:bg-amber-950/40 dark:border-amber-900 dark:text-amber-300 cursor-pointer disabled:opacity-50"
                  onClick={() => {
                    onOpenChange(false);
                    onSuspend();
                  }}
                  disabled={isActionPending}
                >
                  <PauseCircle className="w-3.5 h-3.5" />
                  <span>التعليق المؤقت</span>
                </button>
              )}
              {onApologize && (
                <button
                  type="button"
                  className="px-3 py-1.5 rounded-lg border border-red-300 bg-red-50 hover:bg-red-100 text-red-800 text-xs font-semibold flex items-center gap-1.5 transition-colors dark:bg-red-950/40 dark:border-red-900 dark:text-red-300 cursor-pointer disabled:opacity-50"
                  onClick={() => {
                    onOpenChange(false);
                    onApologize();
                  }}
                  disabled={isActionPending}
                >
                  <XCircle className="w-3.5 h-3.5" />
                  <span>إغلاق الطلب</span>
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </ColoredDialog>
  );
};
