import React, { useState, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2 } from 'lucide-react';
import { evaluateSedanaNeeds } from './sedanaBenchmarks';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';

interface SedanaOfficeEvaluationProps {
  request: {
    id: number;
    requestNumber: string;
    programType: string;
    programData?: any;
    currentStage: string;
    mosque?: {
      id: number;
      name: string;
      city?: string | null;
      capacity?: number | null;
      area?: number | string | null;
    } | null;
  };
  onEvaluationComplete?: () => void;
  canEvaluate?: boolean;
}

export const SedanaOfficeEvaluation: React.FC<SedanaOfficeEvaluationProps> = ({
  request,
  onEvaluationComplete,
  canEvaluate = true,
}) => {
  let programData: Record<string, any> = {};
  try {
    if (typeof request.programData === 'string') {
      programData = JSON.parse(request.programData);
    } else {
      programData = request.programData || {};
    }
  } catch (e) {
    programData = {};
  }

  const existingApprovedPlan = programData.approvedPlan;
  const isAlreadyApproved = Boolean(existingApprovedPlan?.approvedAt);

  const mosqueArea = Number(programData.mosqueArea ?? request.mosque?.area ?? 250);
  const worshippers = Number(programData.actualWorshippers ?? request.mosque?.capacity ?? 150);
  const isConnectedToDesalination =
    programData.isConnectedToDesalination !== undefined
      ? Boolean(programData.isConnectedToDesalination)
      : true;

  const evaluation = useMemo(() => {
    return evaluateSedanaNeeds(
      {
        capacity: worshippers,
        area: mosqueArea,
        actualWorshippers: worshippers,
        isConnectedToDesalination,
      },
      programData
    );
  }, [worshippers, mosqueArea, isConnectedToDesalination, programData]);

  const [approvedQuantities, setApprovedQuantities] = useState<Record<string, number>>(() => {
    if (existingApprovedPlan?.approvedItems) {
      return existingApprovedPlan.approvedItems;
    }
    const initial: Record<string, number> = {};
    evaluation.items.forEach((item) => {
      initial[item.key] = item.requestedQty;
    });
    return initial;
  });

  const [officeNotes, setOfficeNotes] = useState<string>(
    existingApprovedPlan?.notes || 'تمت دراسة ومراجعة الاحتياج السنوي مكتبياً واعتماد البنود والكميات.'
  );

  const handleQuantityChange = (key: string, val: number) => {
    setApprovedQuantities((prev) => ({
      ...prev,
      [key]: Math.max(0, val),
    }));
  };

  const approveMutation = trpc.requests.approveSedanaEvaluation.useMutation({
    onSuccess: () => {
      toast.success('تم اعتماد الاحتياج السنوي بنجاح');
      if (onEvaluationComplete) onEvaluationComplete();
    },
    onError: (err) => {
      toast.error(err.message || 'حدث خطأ أثناء اعتماد الاحتياج');
    },
  });

  const handleApproveAnnualNeed = async () => {
    approveMutation.mutate({
      requestId: request.id,
      approvedItems: approvedQuantities,
      notes: officeNotes,
      shouldAdvanceStage: true,
    });
  };

  const wasteAlerts = evaluation.items.filter((i) => i.status === 'waste' && i.warningMessage);

  return (
    <div className="space-y-3.5 p-4 rounded-xl border border-border/80 bg-card text-right" dir="rtl">
      {/* شريط العنوان والمواصفات */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-2.5 border-b border-border/70 gap-2">
        <div>
          <h4 className="font-bold text-sm text-foreground">
            التقييم الفني المكتبي (سدانة)
          </h4>
          <p className="text-xs text-muted-foreground mt-0.5">
            شبكة المياه (التحلية): <strong className={isConnectedToDesalination ? 'text-foreground' : 'text-amber-600'}>{isConnectedToDesalination ? 'متصل بالتحلية' : 'غير متصل (يتطلب صهاريج مياه)'}</strong>
          </p>
        </div>
      </div>

      {/* تنبيه الهدر إن وجد */}
      {wasteAlerts.length > 0 && (
        <Alert className="border-amber-300 bg-amber-50 dark:bg-amber-950/20 text-amber-900 dark:text-amber-200 py-2 px-3">
          <AlertDescription className="text-xs space-y-1">
            <span className="font-bold block">ملاحظات ضبط الكميات:</span>
            {wasteAlerts.map((item) => (
              <span key={item.key} className="block text-[11px] text-amber-800 dark:text-amber-300">
                • {item.label}: المطلوب ({item.requestedQty} {item.unit}) يتجاوز المعيار القياسي لمسجد بهذا الحجم ({item.standardQty} {item.unit}).
              </span>
            ))}
          </AlertDescription>
        </Alert>
      )}

      {/* جدول المقارنة والضبط */}
      <div className="overflow-x-auto border border-border/70 rounded-md">
        <table className="w-full text-xs text-right">
          <thead className="bg-muted/40 text-muted-foreground border-b border-border/70 font-semibold">
            <tr>
              <th className="p-2">الصنف</th>
              <th className="p-2">التصنيف</th>
              <th className="p-2 text-center">دورية التوريد</th>
              <th className="p-2 text-center">الكمية المطلوبة</th>
              <th className="p-2 text-center">المعيار القياسي</th>
              <th className="p-2 w-28 text-center">الكمية المعتمدة</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {evaluation.items.map((item) => {
              const approvedVal = approvedQuantities[item.key] ?? item.requestedQty;
              const isWaste = item.status === 'waste';

              return (
                <tr key={item.key} className={isWaste ? 'bg-amber-50/25 dark:bg-amber-950/10' : ''}>
                  <td className="p-2">
                    <span className="font-medium text-foreground">{item.label}</span>
                  </td>
                  <td className="p-2 text-[11px] text-muted-foreground">{item.category}</td>
                  <td className="p-2 text-center text-muted-foreground">{item.frequency || 'شهري'}</td>
                  <td className="p-2 text-center font-bold text-foreground">
                    {item.requestedQty} <span className="text-[10px] text-muted-foreground font-normal">{item.unit}</span>
                  </td>
                  <td className="p-2 text-center text-muted-foreground">
                    {item.standardQty} <span className="text-[10px]">{item.unit}</span>
                  </td>
                  <td className="p-2 text-center">
                    {canEvaluate && !isAlreadyApproved ? (
                      <Input
                        type="number"
                        min="0"
                        value={approvedVal}
                        onChange={(e) => handleQuantityChange(item.key, Number(e.target.value))}
                        className="h-7 text-xs text-center w-20 mx-auto"
                      />
                    ) : (
                      <strong className="font-bold text-emerald-600">
                        {approvedVal} {item.unit}
                      </strong>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* ملاحظات الموظف */}
      <div>
        <label className="text-xs font-medium text-foreground mb-1 block">ملاحظات التقييم المكتبي</label>
        <Textarea
          rows={2}
          value={officeNotes}
          onChange={(e) => setOfficeNotes(e.target.value)}
          disabled={!canEvaluate || isAlreadyApproved}
          className="text-xs resize-none"
          placeholder="ملاحظات فنية حول دراسة الاحتياج وضبط الكميات..."
        />
      </div>

      {/* زر الاعتماد */}
      {canEvaluate && !isAlreadyApproved && (
        <div className="flex justify-end pt-1">
          <Button
            type="button"
            onClick={handleApproveAnnualNeed}
            disabled={approveMutation.isPending}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium h-8 px-4 text-xs"
          >
            {approveMutation.isPending ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin ml-1.5" />
                <span>جاري الاعتماد...</span>
              </>
            ) : (
              <span>اعتماد الاحتياج السنوي</span>
            )}
          </Button>
        </div>
      )}

      {isAlreadyApproved && (
        <div className="p-2 rounded-md bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 text-xs text-emerald-800 dark:text-emerald-300 font-medium">
          تم اعتماد الاحتياج السنوي ونقل الطلب لمرحلة جدول الكميات (BOQ).
        </div>
      )}
    </div>
  );
};
