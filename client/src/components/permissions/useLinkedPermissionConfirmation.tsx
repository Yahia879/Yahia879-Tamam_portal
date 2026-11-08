import React, { useState } from "react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { linkedPermissionGrantPlan, linkedPermissionLabel, LINKED_PERMISSION_TARGETS } from "@shared/linkedPermissionDependencies";

export function useLinkedPermissionConfirmation() {
  const [pending, setPending] = useState<{ missing: string[]; apply: () => void } | null>(null);
  const confirmLinkedPermissions = (requested: string[], has: (permission: string) => boolean, apply: (permissions: string[]) => void) => {
    if (!requested.some(permission => LINKED_PERMISSION_TARGETS.includes(permission))) return false;
    const plan = linkedPermissionGrantPlan(requested, has);
    if (plan.missing.length) setPending({ missing: plan.missing, apply: () => apply(plan.permissions) });
    else apply(plan.permissions);
    return true;
  };
  const dependencyConfirmationDialog = (
    <AlertDialog open={pending !== null} onOpenChange={open => { if (!open) setPending(null); }}>
      <AlertDialogContent className="max-w-lg text-right" dir="rtl">
        <AlertDialogHeader className="text-right">
          <AlertDialogTitle>تأكيد تفعيل الصلاحيات المرتبطة</AlertDialogTitle>
          <AlertDialogDescription>
            تتطلب الصلاحيات المحددة تفعيل الصلاحيات التالية أيضاً. لن يُفعّل أي منها قبل تأكيدك.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <ul className="max-h-64 overflow-y-auto list-disc space-y-2 pr-5 text-sm">
          {pending?.missing.map(permission => <li key={permission}>{linkedPermissionLabel(permission)}</li>)}
        </ul>
        <AlertDialogFooter className="gap-2">
          <AlertDialogAction onClick={() => { pending?.apply(); setPending(null); }}>تأكيد وتفعيل الصلاحيات</AlertDialogAction>
          <AlertDialogCancel onClick={() => setPending(null)}>إلغاء</AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
  return { confirmLinkedPermissions, dependencyConfirmationDialog };
}
