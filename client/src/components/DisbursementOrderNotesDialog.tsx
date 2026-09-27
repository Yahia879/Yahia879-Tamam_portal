import React, { useState, useEffect, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import {
  MessageSquare,
  Send,
  Loader2,
  CheckCircle2,
  Calendar,
  Clock,
  User,
  ShieldAlert,
  Info,
  History,
} from "lucide-react";

const ARABIC_MONTHS = [
  "يناير",
  "فبراير",
  "مارس",
  "أبريل",
  "مايو",
  "يونيو",
  "يوليو",
  "أغسطس",
  "سبتمبر",
  "أكتوبر",
  "نوفمبر",
  "ديسمبر",
];

function formatDateEnglishNums(dateInput: string | Date | null | undefined): string {
  if (!dateInput) return "—";
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return "—";
  const day = d.getDate();
  const monthName = ARABIC_MONTHS[d.getMonth()];
  const year = d.getFullYear();
  return `${day} ${monthName} ${year}`;
}

function formatTimeEnglishNums(dateInput: string | Date | null | undefined): string {
  if (!dateInput) return "—";
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return "—";
  let hours = d.getHours();
  const minutes = String(d.getMinutes()).padStart(2, "0");
  const period = hours >= 12 ? "م" : "ص";
  hours = hours % 12;
  hours = hours ? hours : 12;
  const hoursStr = String(hours).padStart(2, "0");
  return `${hoursStr}:${minutes} ${period}`;
}

interface DisbursementOrderNotesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderId: number;
  orderNumber: string;
  orderStatus?: string;
  side: "board" | "finance";
  onSuccess?: () => void;
}

export function DisbursementOrderNotesDialog({
  open,
  onOpenChange,
  orderId,
  orderNumber,
  orderStatus,
  side,
  onSuccess,
}: DisbursementOrderNotesDialogProps) {
  const [inputText, setInputText] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const utils = trpc.useUtils();

  const { data, isLoading, refetch } = trpc.disbursements.getOrderNotes.useQuery(
    { orderId },
    {
      enabled: open && orderId > 0,
      staleTime: 5000,
    }
  );

  const addNoteMutation = trpc.disbursements.addOrderNote.useMutation({
    onSuccess: (res) => {
      toast.success(res.message || "تم إرسال الرسالة بنجاح");
      setInputText("");
      refetch();
      utils.disbursements.getOrderNotes.invalidate({ orderId });
      utils.disbursements.listOrders.invalidate();
      utils.disbursements.getOrderById.invalidate({ id: orderId });
      utils.board.getExecutiveStats.invalidate();
      if (onSuccess) onSuccess();
    },
    onError: (err) => {
      toast.error(err.message || "حدث خطأ أثناء إرسال الملاحظة أو الرد");
    },
  });

  const notes = data?.notes || [];
  const currentOrderStatus = orderStatus || data?.order?.status;
  const isClosed = currentOrderStatus === "executed" || currentOrderStatus === "rejected";

  const scrollToBottom = (behavior: ScrollBehavior = "smooth") => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({
        top: scrollContainerRef.current.scrollHeight,
        behavior,
      });
    }
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior });
    }
  };

  // التمرير التلقائي لأسفل المحادثة لنقل المستخدم مباشرة إلى آخر رسالة
  useEffect(() => {
    if (open && !isLoading && notes.length > 0) {
      scrollToBottom("auto");
      const t = setTimeout(() => {
        scrollToBottom("smooth");
      }, 100);
      return () => clearTimeout(t);
    }
  }, [open, isLoading, notes.length]);

  const handleSend = () => {
    if (!inputText.trim()) {
      toast.warning("يرجى كتابة نص الملاحظة أو الرد أولاً");
      return;
    }
    addNoteMutation.mutate({
      orderId,
      content: inputText.trim(),
      side,
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      handleSend();
    }
  };

  const isBoardView = side === "board";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        dir="rtl"
        className="w-[96vw] sm:w-full sm:max-w-[780px] md:max-w-[840px] max-h-[92vh] flex flex-col rounded-2xl sm:rounded-3xl p-4 sm:p-6 md:p-7 text-right overflow-hidden shadow-2xl border border-border/80 bg-background/95 backdrop-blur-md"
      >
        {/* رأس النافذة */}
        <DialogHeader className="text-right sm:text-right border-b pb-3 sm:pb-4 shrink-0 pl-6 sm:pl-0">
          <div className="flex items-center justify-between gap-2.5 sm:gap-3">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              {/* شعار الرسالة الموحد في كلتا الصفحتين */}
              <div
                className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl flex items-center justify-center shrink-0 shadow-xs ${
                  isBoardView
                    ? "bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30"
                    : "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30"
                }`}
              >
                <MessageSquare className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <div className="text-right min-w-0">
                <DialogTitle className="text-sm sm:text-base md:text-lg font-bold text-foreground flex flex-wrap items-center gap-1.5 sm:gap-2">
                  <span>سجل الملاحظات والتوجيهات المتبادلة</span>
                  <Badge
                    variant="outline"
                    className="font-mono text-[10px] sm:text-[11px] font-bold px-1.5 sm:px-2 py-0.5 bg-muted/70 text-foreground border-border/60 shrink-0"
                  >
                    {orderNumber}
                  </Badge>
                </DialogTitle>
                <DialogDescription className="text-[11px] sm:text-xs text-muted-foreground mt-0.5 line-clamp-1 sm:line-clamp-none">
                  {isBoardView
                    ? "تدوين ومتابعة توجيهات صاحب الصلاحية والاطلاع على ردود الإدارة المالية"
                    : "الاطلاع على ملاحظات صاحب الصلاحية وتدوين الردود والإفادات المالية"}
                </DialogDescription>
              </div>
            </div>
          </div>
        </DialogHeader>

        {/* جسم النافذة (سجل المحادثة الزمني المتبادل) - متناسق مع شاشات الموبايل */}
        <div
          ref={scrollContainerRef}
          className="flex-1 overflow-y-auto px-0.5 sm:px-1 py-3 sm:py-4 space-y-3 sm:space-y-3.5 min-h-[200px] max-h-[48vh] sm:max-h-[500px] text-right"
        >
          {isLoading ? (
            <div className="h-40 sm:h-44 flex flex-col items-center justify-center gap-2 text-muted-foreground">
              <Loader2 className="w-6 h-6 sm:w-7 sm:h-7 animate-spin text-primary" />
              <span className="text-xs font-medium">جاري تحميل سجل الملاحظات...</span>
            </div>
          ) : notes.length === 0 ? (
            <div className="h-40 sm:h-48 flex flex-col items-center justify-center text-center p-4 sm:p-6 rounded-2xl border border-dashed border-border/70 bg-muted/20">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-2">
                <History className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <p className="text-xs sm:text-sm font-bold text-foreground">لا توجد ملاحظات أو ردود سابقة</p>
              <p className="text-[10px] sm:text-[11px] text-muted-foreground mt-1 max-w-sm leading-relaxed">
                يمكن تدوين الملاحظات والردود بشكل مستمر ومتبادل بين رئيس المجلس والإدارة المالية دون أي حد للمرات.
              </p>
            </div>
          ) : (
            notes.map((item, idx) => {
              const isItemBoard = item.side === "board";
              return (
                <div
                  key={item.id || idx}
                  className={`p-3 sm:p-4 rounded-xl sm:rounded-2xl border transition-all text-right shadow-2xs ${
                    isItemBoard
                      ? "bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent border-amber-500/30 dark:from-amber-950/40 dark:via-amber-950/20 dark:border-amber-900/50"
                      : "bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-transparent border-emerald-500/30 dark:from-emerald-950/40 dark:via-emerald-950/20 dark:border-emerald-900/50"
                  }`}
                >
                  {/* ترويسة الرسالة مع الاسم وتاريخ ووقت الإرسال بوضوح ومرونة للشاشات الصغيرة */}
                  <div className="flex flex-wrap items-center justify-between gap-1.5 sm:gap-2 border-b pb-2 sm:pb-2.5 mb-2 sm:mb-2.5 border-border/40">
                    <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                      <div
                        className={`w-6 h-6 sm:w-7 sm:h-7 rounded-full flex items-center justify-center shrink-0 ${
                          isItemBoard
                            ? "bg-amber-500/20 text-amber-700 dark:text-amber-400"
                            : "bg-emerald-500/20 text-emerald-700 dark:text-emerald-400"
                        }`}
                      >
                        <User className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                      </div>
                      <span className="text-xs font-bold text-foreground truncate">
                        {item.userName || (isItemBoard ? "صاحب الصلاحية" : "المسؤول")}
                      </span>
                    </div>

                    {/* تاريخ الإرسال والوقت بوضوح تام وبأرقام إنكليزية */}
                    <div className="flex items-center gap-1.5 sm:gap-2 bg-background/80 dark:bg-background/40 px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-lg border border-border/50 text-[10px] sm:text-[11px] font-semibold text-foreground/90 shadow-2xs">
                      <span className="flex items-center gap-1 text-slate-700 dark:text-slate-300">
                        <Calendar className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-primary shrink-0" />
                        <span className="font-mono">
                          {formatDateEnglishNums(item.createdAt)}
                        </span>
                      </span>
                      <span className="text-muted-foreground/40">•</span>
                      <span className="flex items-center gap-1 text-slate-700 dark:text-slate-300">
                        <Clock className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-primary shrink-0" />
                        <span className="font-mono font-bold">
                          {formatTimeEnglishNums(item.createdAt)}
                        </span>
                      </span>
                    </div>
                  </div>

                  {/* نص الملاحظة أو الرد */}
                  <div className="text-xs sm:text-sm text-foreground leading-relaxed whitespace-pre-wrap font-medium break-words">
                    {item.content}
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* قسم الإدخال في الأسفل */}
        <div className="shrink-0 pt-2.5 sm:pt-3 border-t border-border/70 space-y-2.5 sm:space-y-3">
          {isClosed ? (
            <div className="p-2.5 sm:p-3 bg-muted/50 rounded-xl sm:rounded-2xl border text-xs text-muted-foreground flex items-center gap-2 font-medium">
              <Info className="w-4 h-4 text-muted-foreground shrink-0" />
              <span>
                أمر الصرف بحالة ({currentOrderStatus === "executed" ? "منفذ" : "مرفوض"})، وسجل الملاحظات والردود محفوظ
                للقراءة والمراجعة فقط.
              </span>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5 text-primary shrink-0" />
                  <span>
                    {isBoardView ? "إضافة ملاحظة : " : "إضافة رد : "}
                  </span>
                </label>
              </div>

              <Textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={addNoteMutation.isPending}
                placeholder={
                  isBoardView
                    ? "اكتب ملاحظتك وتوجيهك لأمر الصرف هنا ليظهر للإدارة المالية..."
                    : "اكتب ردك أو إفادتك الخاصة بالملاحظات هنا لتظهر لصاحب الصلاحية..."
                }
                rows={3}
                className="rounded-xl sm:rounded-2xl text-xs sm:text-sm p-3 sm:p-3.5 border-border/80 resize-none leading-relaxed text-right shadow-2xs focus-visible:ring-1 disabled:opacity-60"
                dir="rtl"
              />

              <div className="flex items-center justify-between gap-2 sm:gap-3 pt-1">
                <Button
                  onClick={handleSend}
                  disabled={!inputText.trim() || addNoteMutation.isPending}
                  className={`rounded-xl font-bold text-xs sm:text-sm px-4 sm:px-6 py-2 sm:py-2.5 gap-2 text-white shadow-xs cursor-pointer transition-all flex-1 sm:flex-none justify-center ${
                    isBoardView
                      ? "bg-amber-600 hover:bg-amber-700 disabled:opacity-75 disabled:cursor-not-allowed"
                      : "bg-emerald-600 hover:bg-emerald-700 disabled:opacity-75 disabled:cursor-not-allowed"
                  }`}
                >
                  {addNoteMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                      <span>{isBoardView ? "جاري إرسال الملاحظة..." : "جاري إرسال الرد..."}</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4 shrink-0" />
                      <span>{isBoardView ? "إرسال الملاحظة" : "إرسال الرد"}</span>
                    </>
                  )}
                </Button>

                <Button
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  disabled={addNoteMutation.isPending}
                  className="rounded-xl font-bold text-xs sm:text-sm px-4 sm:px-6 py-2 sm:py-2.5 cursor-pointer shrink-0"
                >
                  إغلاق
                </Button>
              </div>
            </div>
          )}

          {isClosed && (
            <DialogFooter className="flex flex-row justify-start items-center gap-3">
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="rounded-xl font-bold text-xs sm:text-sm px-5 py-2 cursor-pointer"
              >
                إغلاق
              </Button>
            </DialogFooter>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
