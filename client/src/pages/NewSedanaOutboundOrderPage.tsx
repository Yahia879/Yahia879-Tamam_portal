import { useState, useMemo, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ArrowRight,
  Boxes,
  Building2,
  Calendar,
  User,
  Phone,
  MapPin,
  Truck,
  Sparkles,
  Loader2,
  CheckCircle2,
  Package,
  Layers,
  FileSpreadsheet,
  AlertTriangle,
  Info,
  Clock,
  Check,
  CalendarDays,
} from "lucide-react";
import { toast } from "sonner";
import { useDocumentTitle } from "@/contexts/DocumentTitleContext";

export default function NewSedanaOutboundOrderPage() {
  const params = useParams<{ id?: string }>();
  const [, setLocation] = useLocation();
  const { user } = useAuth();

  // جلب قائمة طلبات سدانة للاختيار
  const { data: sedanaRequests = [] } = trpc.sedanaExecution.listSedanaRequests.useQuery();

  const activeRequestId = useMemo(() => {
    const fromParam = parseInt(params.id || "0");
    if (fromParam > 0) return fromParam;
    const urlParams = new URLSearchParams(window.location.search);
    const fromQuery = parseInt(urlParams.get("requestId") || "0");
    if (fromQuery > 0) return fromQuery;
    if (sedanaRequests.length > 0) return sedanaRequests[0].id;
    return 0;
  }, [params.id, sedanaRequests]);

  const requestId = activeRequestId;

  useDocumentTitle(requestId > 0 ? `أمر إخراج مستودعي #${requestId} - سدانة` : "أمر إخراج مستودعي جديد - سدانة");

  const utils = trpc.useUtils();

  // جلب بيانات المستودع الافتراضي
  const { data, isLoading } = trpc.sedanaExecution.getVirtualInventory.useQuery(
    { requestId },
    { enabled: requestId > 0 }
  );

  const req = data?.request;
  const mosque = data?.mosque;
  const inventoryItems = data?.inventoryItems || [];

  // بيانات المستلم وصاحب الطلب الثابتة (للقراءة فقط ولا تتعدل)
  const recipientName = mosque?.imamName || (req as any)?.requesterName || "إمام المسجد";
  const recipientRole = mosque?.imamName ? "إمام المسجد" : "صاحب الطلب";
  const recipientPhone = mosque?.imamPhone || (req as any)?.requesterPhone || "";
  const deliveryLocation = [mosque?.name, mosque?.district, mosque?.city].filter(Boolean).join(" - ") || "مقر المسجد المعتمد";

  // حالة تحديد البنود والكميات
  const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(new Set());
  const [outboundItems, setOutboundItems] = useState<Record<string, number>>({});
  const [showAllItems, setShowAllItems] = useState(false);

  // البنود المستحقة للصرف بعد مرور الوقت ويتوفر لها رصيد
  const dueItems = useMemo(() => {
    return inventoryItems.filter((it: any) => {
      const isDueTime = it.isDue || (it.nextDueDate && new Date(it.nextDueDate).getTime() <= Date.now());
      const hasStock = Number(it.availableStock || 0) > 0;
      const notCompleted = Number(it.remainingToDisburse || 0) > 0;
      return isDueTime && hasStock && notCompleted;
    });
  }, [inventoryItems]);

  // البنود المتاحة بالمستودع عموماً
  const allAvailableItems = useMemo(() => {
    return inventoryItems.filter(
      (it: any) => Number(it.availableStock || 0) > 0 && Number(it.remainingToDisburse || 0) > 0
    );
  }, [inventoryItems]);

  const itemsToDisplay = showAllItems ? allAvailableItems : (dueItems.length > 0 ? dueItems : allAvailableItems);

  // تهيئة الاختيارات والكميات الأولية تلقائياً
  useEffect(() => {
    if (inventoryItems.length > 0 && selectedItemIds.size === 0) {
      const initialSelected = new Set<string>();
      const initialQtys: Record<string, number> = {};

      const targetList = dueItems.length > 0 ? dueItems : allAvailableItems;
      targetList.forEach((it: any) => {
        initialSelected.add(String(it.id));
        const maxAllowed = Math.min(Number(it.availableStock || 0), Number(it.remainingToDisburse || 0));
        const suggested = Math.min(Number(it.cycleQuantity || 1), maxAllowed);
        initialQtys[String(it.id)] = suggested > 0 ? suggested : maxAllowed;
      });

      setSelectedItemIds(initialSelected);
      setOutboundItems(initialQtys);
    }
  }, [inventoryItems, dueItems, allAvailableItems]);

  const toggleItemSelection = (id: string, it: any) => {
    setSelectedItemIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
        if (!outboundItems[id]) {
          const maxAllowed = Math.min(Number(it.availableStock || 0), Number(it.remainingToDisburse || 0));
          const suggested = Math.min(Number(it.cycleQuantity || 1), maxAllowed);
          setOutboundItems((q) => ({ ...q, [id]: suggested > 0 ? suggested : maxAllowed }));
        }
      }
      return next;
    });
  };

  const handleQuantityChange = (id: string, val: number, maxAllowed: number) => {
    const clamped = Math.max(0.1, Math.min(val, maxAllowed));
    setOutboundItems((prev) => ({ ...prev, [id]: clamped }));
  };

  // طفرة إنشاء أمر الإخراج
  const createOutboundMutation = trpc.sedanaExecution.createOutboundOrder.useMutation({
    onSuccess: () => {
      toast.success("تم إصدار واعتماد أمر الإخراج وتوليد مسوغ الصرف بنجاح");
      utils.sedanaExecution.getVirtualInventory.invalidate({ requestId });
      setLocation(`/requests/${requestId}/sedana-execution`);
    },
    onError: (err) => {
      toast.error(err.message || "حدث خطأ أثناء إصدار أمر الإخراج");
    },
  });

  const handleSubmit = () => {
    const items = Array.from(selectedItemIds)
      .map((id) => {
        const found = inventoryItems.find((i: any) => String(i.id) === String(id));
        const qty = Number(outboundItems[id] || 0);
        if (!found || qty <= 0) return null;
        return {
          id: String(found.id),
          itemName: found.itemName || found.name,
          quantity: qty,
          unit: found.unit || "وحدة",
        };
      })
      .filter(Boolean) as any[];

    if (items.length === 0) {
      toast.error("يرجى اختيار صنف واحد على الأقل وتحديد كمية الإخراج");
      return;
    }

    // حساب رقم الدفعة وتاريخ اليوم تلقائياً
    const maxCycle = Math.max(...inventoryItems.map((it: any) => Number(it.currentCycleNumber || 0)), 0);
    const today = new Intl.DateTimeFormat('en-CA', { year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());

    createOutboundMutation.mutate({
      requestId,
      scheduledDate: today,
      periodLabel: `الدفعة الدورية - دفعة رقم ${maxCycle + 1}`,
      outboundMethod: "direct_imam",
      recipientName: recipientName || "إمام المسجد",
      recipientRole: recipientRole || "إمام المسجد",
      recipientPhone: recipientPhone || "",
      deliveryLocation: deliveryLocation || "",
      items,
    });
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="p-16 flex flex-col items-center justify-center gap-4 text-center" dir="rtl">
          <Loader2 className="w-10 h-10 animate-spin text-primary" />
          <p className="text-sm font-semibold text-muted-foreground">جاري تحميل بيانات المستودع الافتراضي والبنود المتاحة للصرف...</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-5xl mx-auto px-4 sm:px-0 text-right font-sans" dir="rtl">
        {/* رأس الصفحة */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border/60 pb-4">
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setLocation(requestId > 0 ? `/requests/${requestId}/sedana-execution` : "/sedana-warehouse")}
              className="rounded-xl shrink-0 cursor-pointer hover:bg-muted"
              title="العودة لصفحة التنفيذ"
            >
              <ArrowRight className="h-4 w-4" />
            </Button>
            <div className="text-right">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-primary/10 text-primary border border-primary/20">
                  <Truck className="w-5 h-5" />
                </div>
                <h1 className="text-xl sm:text-2xl font-bold text-foreground">
                  إصدار أمر إخراج مستودعي ومسوغ صرف
                </h1>
                <Badge variant="outline" className="text-primary bg-primary/10 border-primary/30 text-xs font-bold">
                  سدانة
                </Badge>
              </div>
              <p className="text-muted-foreground text-xs sm:text-sm mt-1">
                صرف البنود المستحقة للمسجد <span className="font-bold text-foreground">{mosque?.name || "المسجد"}</span> {req?.requestNumber ? `(#${req.requestNumber})` : ""}
              </p>
            </div>
          </div>

          {/* محدد طلب سدانة في حال كان هناك أكثر من طلب */}
          {sedanaRequests.length > 1 && (
            <div className="flex items-center gap-2 shrink-0">
              <Label className="text-xs font-bold text-muted-foreground whitespace-nowrap">الطلب:</Label>
              <span className="font-mono text-xs font-bold bg-muted px-3 py-1.5 rounded-lg border border-border">
                #{req?.requestNumber || requestId}
              </span>
            </div>
          )}
        </div>

        {/* شريط معلومات صاحب الطلب والمستلم بالمسجد (للقراءة فقط - لا تتعدل) */}
        <Card className="border border-border/80 shadow-2xs rounded-xl overflow-hidden bg-white dark:bg-slate-900">
          <CardHeader className="bg-muted/20 border-b border-border/50 py-3 px-4">
            <CardTitle className="text-xs font-bold flex items-center gap-1.5 text-foreground">
              <Building2 className="w-4 h-4 text-primary" />
              <span>معلومات صاحب الطلب والمستلم بالمسجد (ثابتة وفق بيانات الطلب)</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div className="space-y-1">
                <span className="text-[11px] font-bold text-muted-foreground flex items-center gap-1">
                  <User className="w-3.5 h-3.5 text-primary" />
                  <span>اسم المستلم</span>
                </span>
                <div className="font-bold text-xs text-foreground bg-muted/40 p-2.5 rounded-lg border border-border/60">
                  {recipientName}
                </div>
              </div>

              <div className="space-y-1">
                <span className="text-[11px] font-bold text-muted-foreground flex items-center gap-1">
                  <Building2 className="w-3.5 h-3.5 text-primary" />
                  <span>الصفة</span>
                </span>
                <div className="font-bold text-xs text-foreground bg-muted/40 p-2.5 rounded-lg border border-border/60">
                  {recipientRole}
                </div>
              </div>

              <div className="space-y-1">
                <span className="text-[11px] font-bold text-muted-foreground flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5 text-primary" />
                  <span>رقم الجوال</span>
                </span>
                <div className="font-bold font-mono text-xs text-foreground bg-muted/40 p-2.5 rounded-lg border border-border/60" dir="ltr">
                  {recipientPhone || "—"}
                </div>
              </div>

              <div className="space-y-1">
                <span className="text-[11px] font-bold text-muted-foreground flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-primary" />
                  <span>موقع التسليم</span>
                </span>
                <div className="font-bold text-xs text-foreground bg-muted/40 p-2.5 rounded-lg border border-border/60 truncate" title={deliveryLocation}>
                  {deliveryLocation}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* شريط حالة استحقاق البنود */}
        {dueItems.length > 0 ? (
          <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300 font-bold">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>يوجد {dueItems.length} صنف حان موعد إخراجها الدوري وتتوفر كمياتها بالمستودع.</span>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowAllItems(!showAllItems)}
              className="text-xs font-semibold h-7 border-emerald-300 text-emerald-900 hover:bg-emerald-100"
            >
              {showAllItems ? "عرض البنود المستحقة فقط" : "عرض كافة البنود المتوفرة"}
            </Button>
          </div>
        ) : (
          <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 flex items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2 text-amber-900 dark:text-amber-200 font-bold">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>تنبيه: لا توجد بنود حان موعد إخراجها الدوري حالياً (يتم عرض الأصناف التي بها رصيد متاح للإخراج المباشر).</span>
            </div>
          </div>
        )}

        {/* جدول البنود المشمولة وتحديد الكميات */}
        <Card className="border-border/80 shadow-xs rounded-xl overflow-hidden bg-white dark:bg-slate-900">
          <CardHeader className="bg-muted/20 border-b border-border/50 py-3.5 px-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-right">
            <div>
              <CardTitle className="text-sm font-bold flex items-center gap-2 text-foreground">
                <Package className="w-4 h-4 text-primary" />
                <span>البنود المشمولة بأمر الإخراج وتحديد الكميات</span>
              </CardTitle>
              <CardDescription className="text-xs">
                حدد البنود والكميات المراد صرفها للمسجد بناءً على الرصيد المتوفر بالمستودع
              </CardDescription>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  const allIds = new Set((itemsToDisplay || []).map((it: any) => String(it.id)));
                  setSelectedItemIds(allIds);
                }}
                className="text-xs h-7 px-2.5 cursor-pointer font-semibold"
              >
                تحديد الكل
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setSelectedItemIds(new Set())}
                className="text-xs h-7 px-2.5 cursor-pointer font-semibold"
              >
                إلغاء التحديد
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto" dir="rtl">
              <Table className="text-xs text-right" dir="rtl">
                <TableHeader className="bg-muted/30">
                  <TableRow className="border-b border-border/60">
                    <TableHead className="w-12 text-center font-bold">اختيار</TableHead>
                    <TableHead className="font-bold min-w-[180px]">اسم الصنف والتصنيف</TableHead>
                    <TableHead className="text-center font-bold">الدورية</TableHead>
                    <TableHead className="text-center font-bold">الموجود بالمستودع</TableHead>
                    <TableHead className="text-center font-bold">حصة الدورة</TableHead>
                    <TableHead className="text-center font-bold">حالة الموعد</TableHead>
                    <TableHead className="text-center font-bold min-w-[160px]">الكمية للإخراج</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-border/60">
                  {(itemsToDisplay || []).length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="p-8 text-center text-muted-foreground">
                        لا توجد بنود متاحة للصرف بالمستودع حالياً.
                      </TableCell>
                    </TableRow>
                  ) : (
                    itemsToDisplay.map((it: any) => {
                      const isSelected = selectedItemIds.has(String(it.id));
                      const maxAllowed = Math.min(Number(it.availableStock || 0), Number(it.remainingToDisburse || 0));
                      const currentVal = outboundItems[String(it.id)] ?? Math.min(Number(it.cycleQuantity || 1), maxAllowed);
                      const isDueTime = it.isDue || (it.nextDueDate && new Date(it.nextDueDate).getTime() <= Date.now());

                      return (
                        <TableRow
                          key={it.id}
                          className={`transition-colors ${
                            isSelected ? "bg-primary/5 hover:bg-primary/10" : "opacity-60 hover:opacity-100"
                          }`}
                        >
                          <TableCell className="p-3 text-center">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleItemSelection(String(it.id), it)}
                              className="w-4 h-4 rounded text-primary focus:ring-primary cursor-pointer"
                            />
                          </TableCell>
                          <TableCell className="p-3">
                            <div className="font-bold text-foreground text-xs sm:text-sm">{it.itemName || it.name}</div>
                            {it.category && (
                              <div className="text-[10px] text-muted-foreground mt-0.5">{it.category}</div>
                            )}
                          </TableCell>
                          <TableCell className="p-3 text-center">
                            <Badge variant="outline" className="text-[10px] px-2 py-0.5">
                              {it.frequency || "شهري"}
                            </Badge>
                          </TableCell>
                          <TableCell className="p-3 text-center">
                            <div className="inline-flex items-center justify-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 font-mono font-bold">
                              <span>{it.availableStock}</span>
                              <span className="text-[10px] font-normal">{it.unit}</span>
                            </div>
                          </TableCell>
                          <TableCell className="p-3 text-center font-mono font-semibold text-muted-foreground">
                            {it.cycleQuantity || 1} {it.unit}
                          </TableCell>
                          <TableCell className="p-3 text-center">
                            {isDueTime ? (
                              <Badge className="bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 text-[10px] font-bold gap-1">
                                <CheckCircle2 className="w-2.5 h-2.5" />
                                <span>حان الموعد</span>
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-[10px] border-amber-300 text-amber-800 bg-amber-50">
                                <span>متبقي {it.daysUntilNextDue ?? 0} يوم</span>
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="p-3 text-center">
                            <div className="inline-flex items-center gap-1.5">
                              <Input
                                type="number"
                                step="any"
                                min="0.1"
                                max={maxAllowed}
                                disabled={!isSelected}
                                value={currentVal}
                                onChange={(e) => {
                                  const val = parseFloat(e.target.value) || 0;
                                  handleQuantityChange(String(it.id), val, maxAllowed);
                                }}
                                className="w-24 h-8 text-xs font-mono font-bold text-center bg-background"
                              />
                              <span className="text-[11px] text-muted-foreground font-semibold">{it.unit}</span>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* شريط الإجراءات والتقديم */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-3 pb-8 border-t border-border/60">
          <Button
            type="button"
            variant="outline"
            onClick={() => setLocation(requestId > 0 ? `/requests/${requestId}/sedana-execution` : "/sedana-warehouse")}
            className="h-10 px-6 rounded-xl text-xs font-bold border-border cursor-pointer hover:bg-muted"
          >
            إلغاء والعودة للمستودع
          </Button>

          <Button
            type="button"
            onClick={handleSubmit}
            disabled={createOutboundMutation.isPending || selectedItemIds.size === 0}
            className="h-10 px-8 rounded-xl text-xs sm:text-sm font-bold gap-2 shadow-sm transition-all cursor-pointer bg-primary text-primary-foreground hover:bg-primary/90"
          >
            {createOutboundMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>جاري إصدار واعتماد أمر الإخراج...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>إصدار واعتماد أمر الإخراج الآن ({selectedItemIds.size} بنود)</span>
              </>
            )}
          </Button>
        </div>
      </div>
    </DashboardLayout>
  );
}
