import React, { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  PackageCheck,
  Building2,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  Layers,
  FileText,
  Boxes,
} from "lucide-react";

export default function RequesterPendingOutboundModal() {
  const { user } = useAuth();
  const utils = trpc.useUtils();
  const isServiceRequester = user?.role === "service_requester";

  const { data: pendingOutbounds = [], isLoading } = trpc.sedanaExecution.getMyPendingOutbounds.useQuery(undefined, {
    enabled: isServiceRequester,
    refetchOnWindowFocus: true,
  });

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isRejecting, setIsRejecting] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [notes, setNotes] = useState("");

  const currentItem = pendingOutbounds[currentIndex] || null;

  // طفرة تأكيد الاستلام
  const confirmMutation = trpc.sedanaExecution.confirmOutboundReceipt.useMutation({
    onSuccess: (data) => {
      toast.success(data.message || "تم تأكيد استلام المواد بنجاح");
      utils.sedanaExecution.getMyPendingOutbounds.invalidate();
      utils.requests.getMyRequests.invalidate();
      setIsRejecting(false);
      setRejectionReason("");
      setNotes("");
    },
    onError: (err) => {
      toast.error(err.message || "حدث خطأ أثناء تأكيد الاستلام");
    },
  });

  // طفرة رفض الاستلام
  const rejectMutation = trpc.sedanaExecution.rejectOutboundReceipt.useMutation({
    onSuccess: (data) => {
      toast.warning(data.message || "تم تسجيل رفض الاستلام وإرسال السبب للمسؤولين");
      utils.sedanaExecution.getMyPendingOutbounds.invalidate();
      utils.requests.getMyRequests.invalidate();
      setIsRejecting(false);
      setRejectionReason("");
      setNotes("");
    },
    onError: (err) => {
      toast.error(err.message || "حدث خطأ أثناء تسجيل رفض الاستلام");
    },
  });

  if (!isServiceRequester || isLoading || pendingOutbounds.length === 0 || !currentItem) {
    return null;
  }

  const outbound = currentItem.outbound;
  const items = outbound.items || [];

  const handleConfirm = () => {
    confirmMutation.mutate({
      requestId: currentItem.requestId,
      outboundOrderId: outbound.id || outbound.orderNumber,
      notes,
    });
  };

  const handleReject = () => {
    if (!rejectionReason || rejectionReason.trim().length < 3) {
      toast.error("يرجى كتابة سبب رفض الاستلام بالتفصيل");
      return;
    }

    rejectMutation.mutate({
      requestId: currentItem.requestId,
      outboundOrderId: outbound.id || outbound.orderNumber,
      reason: rejectionReason.trim(),
    });
  };

  return (
    <Dialog open={true} onOpenChange={() => {}}>
      <DialogContent 
        className="max-w-xl text-right font-sans p-0 overflow-hidden border-2 border-primary/20 shadow-2xl" 
        dir="rtl"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        {/* شريط الرأس */}
        <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 text-white p-5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-white/15 backdrop-blur-md border border-white/20">
              <PackageCheck className="w-6 h-6 text-white" />
            </div>
            <div>
              <DialogTitle className="text-lg font-black text-white flex items-center gap-2">
                <span>إشعار وصول مواد وتجهيزات للمسجد</span>
                {pendingOutbounds.length > 1 && (
                  <Badge variant="secondary" className="bg-white/20 text-white border-0 text-xs px-2 py-0.5">
                    {currentIndex + 1} من {pendingOutbounds.length}
                  </Badge>
                )}
              </DialogTitle>
              <DialogDescription className="text-xs text-white/90 mt-0.5 font-medium">
                برنامج سدانة لعمارة وصيانة المساجد
              </DialogDescription>
            </div>
          </div>
        </div>

        <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* كارت معلومات المسجد والطلب */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 p-3 rounded-xl bg-muted/40 border border-border/80 text-xs">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-primary shrink-0" />
              <div>
                <span className="text-muted-foreground block text-[10px]">المسجد:</span>
                <span className="font-bold text-foreground text-xs">{currentItem.mosqueName}</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-primary shrink-0" />
              <div>
                <span className="text-muted-foreground block text-[10px]">رقم أمر الإخراج / المسوغ:</span>
                <span className="font-mono font-bold text-foreground text-xs">
                  {outbound.orderNumber}
                  {outbound.disbursementVoucherCode ? ` (${outbound.disbursementVoucherCode})` : ""}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-muted-foreground shrink-0" />
              <div>
                <span className="text-muted-foreground block text-[10px]">تاريخ الإخراج:</span>
                <span className="font-mono font-semibold text-foreground text-xs">
                  {outbound.scheduledDate || outbound.createdAt?.split("T")[0]}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-muted-foreground shrink-0" />
              <div>
                <span className="text-muted-foreground block text-[10px]">فترة الدفعة:</span>
                <span className="font-semibold text-foreground text-xs">{outbound.periodLabel || "الدفعة الدورية"}</span>
              </div>
            </div>
          </div>

          {/* تنبيه إرشادي */}
          <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 text-amber-900 dark:text-amber-200 text-xs flex items-start gap-2.5 leading-relaxed">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <p>
              يرجى التحقق من استلام الأصناف والكميات المحددة أدناه لمسجدكم بحالة سليمة قبل تأكيد الاستلام، أو تحديد سبب الرفض في حال عدم الاستلام.
            </p>
          </div>

          {/* جدول الأصناف */}
          <div className="border border-border/80 rounded-xl overflow-hidden shadow-2xs">
            <div className="bg-muted/60 px-3.5 py-2 border-b border-border/80 flex items-center justify-between">
              <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <Boxes className="w-3.5 h-3.5 text-primary" />
                <span>قائمة الأصناف والكميات المخرجة:</span>
              </span>
              <Badge variant="outline" className="text-[10px] font-bold bg-background">
                {items.length} أصناف
              </Badge>
            </div>
            <div className="divide-y divide-border/60 max-h-48 overflow-y-auto">
              {items.map((it: any, idx: number) => (
                <div key={idx} className="p-3 flex items-center justify-between hover:bg-muted/10 transition-colors text-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-primary/10 text-primary font-bold text-[10px] flex items-center justify-center shrink-0">
                      {idx + 1}
                    </span>
                    <div>
                      <span className="font-bold text-foreground block">{it.itemName || it.name}</span>
                      {it.unit && <span className="text-[10px] text-muted-foreground">الوحدة: {it.unit}</span>}
                    </div>
                  </div>
                  <div className="text-left font-mono font-black text-sm text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-2.5 py-1 rounded-lg border border-emerald-200/60 dark:border-emerald-800">
                    {it.quantity} {it.unit || "وحدة"}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* نموذج الرفض إن تم اختياره */}
          {isRejecting ? (
            <div className="p-3.5 rounded-xl bg-red-50/80 dark:bg-red-950/30 border-2 border-red-300 dark:border-red-800 space-y-2 animate-in fade-in-50">
              <Label className="text-xs font-bold text-red-900 dark:text-red-200 flex items-center gap-1.5">
                <XCircle className="w-4 h-4 text-red-600" />
                <span>سبب رفض الاستلام (إلزامي):</span>
              </Label>
              <Textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="مثال: لم تصل المواد بعد للمسجد / المواد ناقصة عن الكمية المذكورة / وجود تلف في العبوات..."
                rows={3}
                className="text-xs bg-white dark:bg-background border-red-300 focus-visible:ring-red-400"
              />
              <div className="flex items-center gap-2 justify-end pt-1">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setIsRejecting(false);
                    setRejectionReason("");
                  }}
                  className="text-xs h-8"
                  disabled={rejectMutation.isPending}
                >
                  إلغاء والتراجع
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={handleReject}
                  className="text-xs font-bold gap-1.5 h-8 bg-red-600 hover:bg-red-700 shadow-2xs"
                  disabled={rejectMutation.isPending || !rejectionReason.trim()}
                >
                  <XCircle className="w-3.5 h-3.5" />
                  <span>{rejectMutation.isPending ? "جاري تسجيل الرفض..." : "تأكيد رفض الاستلام"}</span>
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground">ملاحظات إضافية (اختياري):</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="أي ملاحظات حول جودة المواد أو التسليم..."
                rows={2}
                className="text-xs"
              />
            </div>
          )}
        </div>

        {/* أزرار الإجراءات */}
        {!isRejecting && (
          <div className="p-4 bg-muted/20 border-t border-border/80 flex flex-col-reverse sm:flex-row items-center justify-between gap-2.5">
            <Button
              variant="outline"
              onClick={() => setIsRejecting(true)}
              className="w-full sm:w-auto text-xs font-bold text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200 dark:border-red-900"
              disabled={confirmMutation.isPending}
            >
              <XCircle className="w-3.5 h-3.5 ml-1.5 text-red-600" />
              <span>رفض الاستلام مع ذكر السبب</span>
            </Button>

            <Button
              onClick={handleConfirm}
              className="w-full sm:w-auto text-xs font-bold gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white shadow-md px-6 h-9"
              disabled={confirmMutation.isPending}
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{confirmMutation.isPending ? "جاري التأكيد..." : "أقر باستلام المواد واعتماد الصرف ✓"}</span>
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
