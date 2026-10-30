import React from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ArrowRightLeft, Info, CheckCircle2 } from "lucide-react";

interface DisbursementPermConfirmationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  onCancel?: () => void;
}

export function DisbursementPermConfirmationModal({
  open,
  onOpenChange,
  onConfirm,
  onCancel,
}: DisbursementPermConfirmationModalProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md font-sans text-right" dir="rtl">
        <AlertDialogHeader className="text-right space-y-2.5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold shrink-0">
              <ArrowRightLeft className="w-5 h-5" />
            </div>
            <div>
              <AlertDialogTitle className="text-base sm:text-lg font-bold text-foreground">
                تأكيد تفعيل صلاحيات أوامر الصرف المرتبطة
              </AlertDialogTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                ربط صلاحية أمر الشراء بأوامر الصرف
              </p>
            </div>
          </div>
          <AlertDialogDescription className="text-xs sm:text-sm text-foreground/80 leading-relaxed pt-2">
            عند تفعيل صلاحية <strong className="text-primary font-bold">"إنشاء أمر صرف لأمر الشراء"</strong>، يتطلب النظام تفعيل الصلاحيات التالية تلقائياً لتمكين المستخدم أو الدور من إنشاء ومتابعة أمر الصرف المرتبط:
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="my-2 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-border/80 space-y-2">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-200">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>عرض أوامر الصرف (disbursement_orders.view)</span>
          </div>
          <div className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-200">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>إنشاء أمر صرف مباشر (disbursement_orders.create_direct)</span>
          </div>
          <div className="pt-2 border-t border-border/60 text-[11px] text-amber-700 dark:text-amber-400 flex items-start gap-1.5 font-medium">
            <Info className="w-3.5 h-3.5 shrink-0 mt-0.5 text-amber-600" />
            <span>ملاحظة: تفعيل هذه الصلاحيات سيؤدي إلى ظهور قسم <strong>"أوامر الصرف"</strong> في القائمة الجانبية (Sidebar).</span>
          </div>
        </div>

        <AlertDialogFooter className="gap-2 sm:gap-0 flex-row-reverse justify-start pt-2">
          <AlertDialogAction
            onClick={() => {
              onConfirm();
              onOpenChange(false);
            }}
            className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs h-9 px-4 rounded-xl cursor-pointer"
          >
            تأكيد وتفعيل الصلاحيات
          </AlertDialogAction>
          <AlertDialogCancel
            onClick={() => {
              if (onCancel) onCancel();
              onOpenChange(false);
            }}
            className="text-xs h-9 px-4 rounded-xl cursor-pointer border-border/80"
          >
            إلغاء
          </AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
