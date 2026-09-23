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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  CheckCircle2,
  AlertTriangle,
  FileText,
  Package,
  Calendar,
  User,
  Coins,
  Receipt,
  Loader2,
  Check,
  Clock,
  Layers,
  ShieldCheck,
  Info,
  Lock,
} from "lucide-react";
import { toast } from "sonner";
import { useDocumentTitle } from "@/contexts/DocumentTitleContext";
import { usePermission } from "@/hooks/usePermission";

export default function NewSedanaInwardOrderPage() {
  const params = useParams<{ id?: string }>();
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const canInward = usePermission("sedana_warehouse.inward");

  // جلب قائمة كافة طلبات سدانة للاختيار في حال لم يتم تمرير id
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

  useDocumentTitle(requestId > 0 ? `أمر إدخال مستودعي #${requestId} - سدانة` : "أمر إدخال مستودعي جديد - سدانة");

  const utils = trpc.useUtils();

  // جلب بيانات المستودع الافتراضي والتنفيذ للطلب المحدد
  const { data, isLoading } = trpc.sedanaExecution.getVirtualInventory.useQuery(
    { requestId },
    { enabled: requestId > 0 }
  );

  const req = data?.request;
  const mosque = data?.mosque;
  const inventoryItems = data?.inventoryItems || [];
  const availableReferences = (data as any)?.availableReferences || [];
  const disbursementOrders: any[] = useMemo(() => {
    const list: any[] = (data as any)?.disbursementOrders || [];
    return list.filter((d: any) => d.status === "executed" || d.isExecuted);
  }, [data]);

  // أمر الصرف المحدد
  const [selectedDisbOrderId, setSelectedDisbOrderId] = useState<number | null>(null);

  // بيانات النموذج
  const [inwardRefType, setInwardRefType] = useState<string>("purchase_order");
  const [inwardRefNumber, setInwardRefNumber] = useState<string>("");
  const [inwardSupplierName, setInwardSupplierName] = useState<string>("");
  const [inwardSupplierInvoice, setInwardSupplierInvoice] = useState<string>("");
  const [inwardReceivedBy, setInwardReceivedBy] = useState<string>("");
  const [inwardDate, setInwardDate] = useState<string>(
    new Intl.DateTimeFormat("en-CA", { year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date())
  );
  const [inwardItems, setInwardItems] = useState<Record<string, number>>({});
  const [inwardNotes, setInwardNotes] = useState<string>("");

  // استخراج أمر الصرف من الـ URL إن وُجد
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const disbParam = urlParams.get("disbursementOrderId");
    if (disbParam) {
      const parsedId = parseInt(disbParam);
      if (parsedId > 0) {
        setSelectedDisbOrderId(parsedId);
      }
    }
  }, [window.location.search]);

  // تعيين اسم المستلم الافتراضي
  useEffect(() => {
    if (user?.name && !inwardReceivedBy) {
      setInwardReceivedBy(user.name);
    }
  }, [user, inwardReceivedBy]);

  // أمر الصرف النشط المختار حالياً (فقط بعد تحديده صراحة)
  const activeDisb = useMemo(() => {
    if (!selectedDisbOrderId) return null;
    return disbursementOrders.find((d: any) => d.id === selectedDisbOrderId) || null;
  }, [disbursementOrders, selectedDisbOrderId]);

  // قائمة الأصناف المعروضة للإدخال، مأخوذة حصراً من أمر الصرف المختار
  const displayItems = useMemo(() => {
    if (activeDisb && Array.isArray(activeDisb.items) && activeDisb.items.length > 0) {
      return activeDisb.items;
    }
    return [];
  }, [activeDisb]);

  // عند تغيير أمر الصرف المختار: تحديث المرجع وتعبئة الكميات المتبقية تلقائياً
  useEffect(() => {
    if (activeDisb) {
      setInwardRefType(activeDisb.referenceType || "purchase_order");
      setInwardRefNumber(activeDisb.referenceNumber || activeDisb.orderNumber || "");
      if (activeDisb.beneficiaryName) setInwardSupplierName(activeDisb.beneficiaryName);

      // تعيين الكميات الافتراضية بالمتبقي المسموح بأمر الصرف
      const initial: Record<string, number> = {};
      if (Array.isArray(activeDisb.items)) {
        activeDisb.items.forEach((it: any) => {
          const qty = it.remainingAllowedQty !== undefined ? it.remainingAllowedQty : (it.maxDisbursedQty ?? it.quantity ?? 0);
          if (qty > 0) {
            initial[it.id] = qty;
          }
        });
      }
      setInwardItems(initial);
    }
  }, [activeDisb]);

  // التحقق من تعليق أو حظر أمر الإدخال
  const isInwardBlocked = !activeDisb || !activeDisb.canCreateInward;
  const blockedReason = !activeDisb ? "لا يوجد أمر صرف مالي منفّذ لهذا الطلب حتى الآن" : (activeDisb?.blockedReason || null);


  // إحصائيات الإدخال الحالي
  const totalItemsToInwardCount = Object.keys(inwardItems).filter((k) => (inwardItems[k] || 0) > 0).length;
  const totalUnitsToInward = Object.keys(inwardItems).reduce((sum, k) => sum + (inwardItems[k] || 0), 0);

  // هل يوجد أي تجاوز للحد الأقصى في أي صنف؟
  const hasExceededItems = displayItems.some((it: any) => {
    const entered = inwardItems[it.id] || 0;
    const maxAllowed = it.remainingAllowedQty !== undefined ? it.remainingAllowedQty : 999999;
    return entered > maxAllowed + 0.0001;
  });

  // طفرة إنشاء أمر الإدخال
  const createInwardMutation = trpc.sedanaExecution.createInwardOrder.useMutation({
    onSuccess: () => {
      toast.success("تم تسجيل وتوثيق أمر الإدخال في المستودع الافتراضي بنجاح");
      utils.sedanaExecution.getVirtualInventory.invalidate({ requestId });
      setLocation(`/requests/${requestId}/sedana-execution`);
    },
    onError: (err) => {
      toast.error(err.message || "حدث خطأ أثناء حفظ أمر الإدخال");
    },
  });

  const handleSubmit = () => {
    if (isInwardBlocked) {
      toast.error(blockedReason || "لا يمكن إتمام أمر الإدخال حتى يتم تنفيذ أمر الصرف المرتبط أولاً وتحول حالته إلى 'منفّذ'");
      return;
    }

    const items = Object.keys(inwardItems)
      .filter((k) => (inwardItems[k] || 0) > 0)
      .map((k) => {
        const found = displayItems.find((i: any) => String(i.id) === String(k));
        return {
          id: k,
          itemName: found?.itemName || found?.name || `بند ${k}`,
          quantity: inwardItems[k],
          unit: found?.unit || "وحدة",
        };
      });

    if (items.length === 0) {
      toast.error("يرجى إدخال كمية موجبة لصنف واحد على الأقل للمتابعة");
      return;
    }

    // التحقق المسبق من عدم تجاوز الحد الأقصى المتبقي من أمر الصرف
    for (const item of items) {
      const target = displayItems.find((di: any) => String(di.id) === String(item.id));
      if (target && target.remainingAllowedQty !== undefined) {
        if (item.quantity > target.remainingAllowedQty + 0.0001) {
          toast.error(
            `الكمية المدخلة للصنف (${item.itemName}) وقدرها ${item.quantity} تتجاوز الحد الأقصى المتبقي من أمر الصرف (الحد الأقصى المسموح الآن: ${target.remainingAllowedQty} ${item.unit})`
          );
          return;
        }
      }
    }

    createInwardMutation.mutate({
      requestId,
      receivedBy: inwardReceivedBy || user?.name || "أمين المستودع",
      disbursementOrderId: activeDisb?.id,
      disbursementOrderNumber: activeDisb?.orderNumber,
      referenceType: inwardRefType,
      referenceNumber: inwardRefNumber.trim(),
      supplierInvoiceNumber: inwardSupplierInvoice.trim() || undefined,
      supplierName: inwardSupplierName.trim() || undefined,
      notes: inwardNotes.trim() || undefined,
      items,
    });
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="p-16 flex flex-col items-center justify-center gap-4 text-center" dir="rtl">
          <Loader2 className="w-10 h-10 animate-spin text-primary" />
          <p className="text-sm font-semibold text-muted-foreground">جاري تحميل بيانات المستودع وأوامر الصرف المنفذة...</p>
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
              title="العودة للمستودع الافتراضي"
            >
              <ArrowRight className="h-4 w-4" />
            </Button>
            <div className="text-right">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300">
                  <Boxes className="w-5 h-5" />
                </div>
                <h1 className="text-xl sm:text-2xl font-bold text-foreground">
                  إصدار أمر إدخال مستودعي جديد
                </h1>
                <Badge variant="outline" className="text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-xs">
                  سدانة
                </Badge>
              </div>
              <p className="text-muted-foreground text-xs sm:text-sm mt-1">
                تسجيل المواد والبضائع الموردة في المستودع الافتراضي لمسجد <span className="font-bold text-foreground">{mosque?.name || "المسجد"}</span> {req?.requestNumber ? `(#${req.requestNumber})` : ""}
              </p>
            </div>
          </div>

        </div>

        {/* القسم الأول: اختيار أمر الصرف المالي المنفّذ (المصدر المالي للتوريد والحد الأقصى) */}
        <Card className="border-border/80 shadow-xs rounded-xl overflow-hidden bg-white dark:bg-slate-900">
          <CardHeader className="bg-muted/30 border-b border-border/50 py-3.5 px-5 text-right">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div>
                <CardTitle className="text-sm font-bold flex items-center gap-2 text-foreground">
                  <Coins className="w-4 h-4 text-emerald-600" />
                  <span>أمر الصرف المالي المنفّذ (المصدر المالي وسقف الكميات)</span>
                </CardTitle>
                <CardDescription className="text-xs mt-0.5">
                  حدد أمر الصرف الذي تود توريد وإدخال بضائعه؛ كميات أمر الصرف تمثل الحد الأقصى (الماكسيموم) المسموح بإدخاله
                </CardDescription>
              </div>

              {disbursementOrders.length > 0 && (
                <Badge variant="outline" className="text-xs bg-muted/60 self-start sm:self-auto text-emerald-700 dark:text-emerald-400 border-emerald-300 font-bold">
                  {disbursementOrders.length === 1 ? "أمر صرف منفّذ واحد مسجل لهذا الطلب" : `${disbursementOrders.length} أوامر صرف منفّذة مسجلة لهذا الطلب`}
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-5 space-y-4 text-right" dir="rtl">
            {disbursementOrders.length === 0 ? (
              <div className="p-6 rounded-xl border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 text-center space-y-3">
                <AlertTriangle className="w-8 h-8 text-amber-600 mx-auto" />
                <div>
                  <h4 className="font-bold text-sm text-amber-900 dark:text-amber-200">لا توجد أوامر صرف مالية منفّذة بالتحويل البنكي لهذا الطلب</h4>
                  <p className="text-xs text-amber-800/90 dark:text-amber-300/80 mt-1 max-w-md mx-auto">
                    وفق مسار العمل المعتمد، لا يمكن توريد وإدخال بضائع إلى المستودع إلا بموجب أمر صرف مالي منفّذ (حالة: منفّذ بالتحويل البنكي) ومرتبط بأمر شراء أو خطاب مجتمعي أو طلب صرف خاص بهذا الطلب.
                  </p>
                </div>
              </div>
            ) : (
              <div className="max-w-xl">
                <Select
                  value={selectedDisbOrderId ? String(selectedDisbOrderId) : ""}
                  onValueChange={(val) => setSelectedDisbOrderId(Number(val))}
                >
                  <SelectTrigger className="h-11 text-xs font-semibold bg-background border-border/80" dir="rtl">
                    <SelectValue placeholder="-- اختر أمر الصرف المالي المنفّذ للمتابعة --" />
                  </SelectTrigger>
                  <SelectContent dir="rtl">
                    {disbursementOrders.map((d: any) => (
                      <SelectItem key={d.id} value={String(d.id)} className="text-xs">
                        <span className="font-mono font-bold">{d.orderNumber}</span>
                        {" - "}
                        <span>{d.referenceNumber || (d.referenceType === "purchase_order" ? "أمر شراء" : "خطاب مسؤولية")}</span>
                        {" - المستفيد: "}
                        <span>{d.beneficiaryName}</span>
                        {" ("}
                        <span className="font-mono text-emerald-700 dark:text-emerald-400 font-semibold">{Number(d.amount).toLocaleString()} ر.س</span>
                        {")"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* تنبيه حالة أمر الصرف المختار */}
            {activeDisb && (
              <div className="mt-2">
                {isInwardBlocked ? (
                  <div className="p-3.5 rounded-xl border border-amber-300 dark:border-amber-800 bg-amber-50/80 dark:bg-amber-950/30 flex items-start gap-3 text-xs">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <div className="flex-1 space-y-1">
                      <p className="font-bold text-amber-900 dark:text-amber-200">
                        لا يمكن عمل أمر إدخال لهذا الصرف حالياً:
                      </p>
                      <p className="text-amber-800 dark:text-amber-300 leading-relaxed">
                        {blockedReason}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="p-3 rounded-xl border border-emerald-300 dark:border-emerald-800 bg-emerald-50/60 dark:bg-emerald-950/20 flex items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2">
                      <Info className="w-4 h-4 text-emerald-700 dark:text-emerald-400 shrink-0" />
                      <span className="text-emerald-900 dark:text-emerald-200 leading-relaxed">
                        أمر الصرف <strong>#{activeDisb.orderNumber}</strong> منفّذ بالكامل. يمكنك الآن إدخال الأصناف دفعة واحدة أو على دفعات جزئية حتى استيفاء كامل الكمية المعتمدة.
                      </span>
                    </div>
                    <Badge variant="outline" className="border-emerald-500 text-emerald-700 bg-emerald-50 text-[11px] shrink-0 font-bold">
                      جاهز للإدخال المستودعي
                    </Badge>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>


        {/* القسم الثاني: جدول الأصناف والكميات (يظهر فقط بعد تحديد أمر الصرف) */}
        {activeDisb && (
          <Card className="border-border/80 shadow-xs rounded-xl overflow-hidden bg-white dark:bg-slate-900">
            <CardHeader className="bg-muted/30 border-b border-border/50 py-3.5 px-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-right">
              <div>
                <CardTitle className="text-sm font-bold flex items-center gap-2 text-foreground">
                  <Package className="w-4 h-4 text-emerald-600" />
                  <span>
                    أصناف وكميات أمر الصرف المعتمد
                    {activeDisb ? ` (${activeDisb.orderNumber})` : ""}
                  </span>
                </CardTitle>
                <CardDescription className="text-xs mt-0.5">
                  أصناف وكميات أمر الصرف المعتمد المحددة للإدخال المستودعي
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent className="p-0 text-right" dir="rtl">
              <div className="overflow-x-auto">
                <Table className="w-full text-right text-xs">
                  <TableHeader className="bg-muted/40">
                    <TableRow className="border-b border-border/60 hover:bg-transparent">
                      <TableHead className="w-12 text-center font-bold">#</TableHead>
                      <TableHead className="min-w-[200px] font-bold text-foreground">الصنف والوصف</TableHead>
                      <TableHead className="w-32 text-center font-bold text-foreground">الكمية بأمر الصرف</TableHead>
                      <TableHead className="w-36 text-center font-bold text-primary">الكمية</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {displayItems.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="h-28 text-center text-muted-foreground text-xs">
                          لا توجد أصناف مسجلة في هذا الصرف
                        </TableCell>
                      </TableRow>
                    ) : (
                      displayItems.map((it: any, idx: number) => {
                        const enteredQty = inwardItems[it.id] !== undefined ? inwardItems[it.id] : (it.remainingAllowedQty ?? it.maxDisbursedQty ?? 0);

                        return (
                          <TableRow
                            key={it.id || idx}
                            className="border-b border-border/40 transition-colors hover:bg-muted/20"
                          >
                            {/* رقم البند */}
                            <TableCell className="text-center font-mono text-muted-foreground font-bold">
                              {idx + 1}
                            </TableCell>

                            {/* اسم الصنف والوصف */}
                            <TableCell>
                              <div className="space-y-0.5">
                                <div className="font-bold text-foreground text-xs sm:text-sm">
                                  {it.itemName || it.name}
                                </div>
                                {it.description && (
                                  <div className="text-[11px] text-muted-foreground line-clamp-1">
                                    {it.description}
                                  </div>
                                )}
                              </div>
                            </TableCell>

                            {/* الكمية بأمر الصرف */}
                            <TableCell className="text-center font-mono text-xs font-semibold">
                              <span className="text-foreground">{it.maxDisbursedQty}</span>
                              <span className="text-muted-foreground mr-1 text-[11px]">{it.unit}</span>
                            </TableCell>

                            {/* خانة الكمية (غير قابلة للتعديل) */}
                            <TableCell className="text-center">
                              <div className="flex items-center justify-center gap-1.5 max-w-[130px] mx-auto">
                                <Input
                                  type="number"
                                  readOnly
                                  disabled
                                  value={enteredQty}
                                  className="h-9 text-center font-mono font-bold text-xs rounded-lg bg-muted/40 cursor-not-allowed text-foreground border-border"
                                />
                                <span className="text-[11px] text-muted-foreground whitespace-nowrap">
                                  {it.unit}
                                </span>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* شريط ملخص الكميات */}
              <div className="p-4 bg-muted/20 border-t border-border/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-4 flex-wrap">
                  <span className="text-muted-foreground">
                    الأصناف المشمولة بالإدخال: <strong className="font-mono text-foreground font-bold">{totalItemsToInwardCount}</strong> صنف
                  </span>
                  <span>•</span>
                  <span className="text-muted-foreground">
                    إجمالي الوحدات الموردة في هذا الأمر: <strong className="font-mono text-emerald-700 dark:text-emerald-400 font-bold">{totalUnitsToInward}</strong> وحدة
                  </span>
                </div>

                {activeDisb && (
                  <div className="text-muted-foreground text-[11px]">
                    أمر الصرف: <strong className="font-mono text-foreground">{activeDisb.orderNumber}</strong> ({activeDisb.referenceNumber || activeDisb.referenceType})
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}


        {/* شريط أزرار الإجراءات */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2 pb-8 border-t border-border/60">
          <Button
            type="button"
            variant="outline"
            onClick={() => setLocation(requestId > 0 ? `/requests/${requestId}/sedana-execution` : "/sedana-warehouse")}
            className="h-11 px-6 rounded-xl text-xs font-bold border-border cursor-pointer hover:bg-muted"
          >
            إلغاء والعودة للمستودع
          </Button>

          {activeDisb && (
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={createInwardMutation.isPending || isInwardBlocked || totalItemsToInwardCount === 0 || hasExceededItems}
              className={`h-11 px-8 rounded-xl text-xs sm:text-sm font-bold gap-2 shadow-sm transition-all cursor-pointer ${
                isInwardBlocked || hasExceededItems || totalItemsToInwardCount === 0
                  ? "bg-muted text-muted-foreground cursor-not-allowed border border-border"
                  : "bg-emerald-700 hover:bg-emerald-800 text-white"
              }`}
            >
              {createInwardMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>جاري حفظ وتوثيق أمر الإدخال...</span>
                </>
              ) : isInwardBlocked ? (
                <>
                  <AlertTriangle className="w-4 h-4 text-amber-500" />
                  <span>بانتظار تنفيذ أمر الصرف للمتابعة</span>
                </>
              ) : hasExceededItems ? (
                <>
                  <AlertTriangle className="w-4 h-4 text-rose-500" />
                  <span>توجد كميات تتجاوز الحد الأقصى المسموح</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>تأكيد وتوثيق أمر الإدخال بالمستودع</span>
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
