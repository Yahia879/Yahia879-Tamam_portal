import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { usePermission } from "@/hooks/usePermission";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

export default function CustodyExceptionRequestDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const allowed = usePermission("custody_requests.request_exception");
  const [reason, setReason] = useState("");
  const utils = trpc.useUtils();
  const { data: check, isLoading } = trpc.custody.checkActiveCustody.useQuery(undefined, { enabled: open && allowed });
  const mutation = trpc.custody.requestException.useMutation({
    onSuccess: data => {
      toast.success(data.message);
      setReason("");
      onOpenChange(false);
      utils.custody.getExceptions.invalidate();
      utils.custody.getStats.invalidate();
      utils.custody.checkActiveCustody.invalidate();
      utils.custody.getPendingActionCounts.invalidate();
    },
    onError: error => toast.error(error.message),
  });
  const active = check?.activeCustody;
  const blocked = isLoading || !active || check?.hasPendingException || check?.hasApprovedException || check?.hasRejectedException;
  return (
    <Dialog open={open && allowed} onOpenChange={onOpenChange}>
      <DialogContent dir="rtl">
        <DialogHeader>
          <DialogTitle>طلب استثناء</DialogTitle>
          <DialogDescription>تقديم طلب استثناء لصرف عهدة جديدة لوجود عهدة سابقة قائمة.</DialogDescription>
        </DialogHeader>
        {isLoading ? <p>جاري فحص العهدة القائمة...</p> : !active ? <p>لا توجد عهدة قائمة تحتاج إلى طلب استثناء.</p> : (
          <div className="space-y-4">
            <p>العهدة القائمة: {active.requestNumber} — {active.title}</p>
            {check?.hasPendingException ? <p>لديك طلب استثناء قيد المراجعة.</p> : check?.hasApprovedException ? <p>لديك استثناء معتمد لم يُستخدم بعد.</p> : check?.hasRejectedException ? <p>تم رفض طلب الاستثناء لهذه العهدة مسبقًا.</p> : (
              <div className="space-y-2">
                <Label htmlFor="custody-exception-reason">مبررات طلب الاستثناء</Label>
                <Textarea id="custody-exception-reason" value={reason} onChange={event => setReason(event.target.value)} rows={4} />
              </div>
            )}
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>إلغاء</Button>
          <Button disabled={!!blocked || reason.trim().length < 5 || mutation.isPending} onClick={() => {
            if (!allowed || blocked || !active || reason.trim().length < 5) return;
            mutation.mutate({ activeCustodyId: active.id, reason: reason.trim() });
          }}>{mutation.isPending ? "جاري الإرسال..." : "إرسال طلب الاستثناء"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
