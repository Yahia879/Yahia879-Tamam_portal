import { useState, useMemo, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
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
  Sparkles,
  Loader2,
  Check,
} from "lucide-react";
import { toast } from "sonner";
import { useDocumentTitle } from "@/contexts/DocumentTitleContext";

export default function NewSedanaInwardOrderPage() {
  const params = useParams<{ id?: string }>();
  const [, setLocation] = useLocation();
  const { user } = useAuth();

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

  // بيانات النموذج
  const [inwardRefType, setInwardRefType] = useState<string>("purchase_order");
  const [inwardRefNumber, setInwardRefNumber] = useState<string>("");
  const [inwardSupplierName, setInwardSupplierName] = useState<string>("");
  const [inwardSupplierInvoice, setInwardSupplierInvoice] = useState<string>("");
  const [inwardReceivedBy, setInwardReceivedBy] = useState<string>("");
  const [inwardDate, setInwardDate] = useState<string>(
    new Intl.DateTimeFormat('en-CA', { year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())
  );
  const [inwardItems, setInwardItems] = useState<Record<string, number>>({});
  const [inwardNotes, setInwardNotes] = useState<string>("");

  // تعيين البيانات الافتراضية عند تحميل بيانات المستودع
  useEffect(() => {
    if (availableReferences.length > 0) {
      const firstRef = availableReferences[0];
      setInwardRefType(firstRef.type);
      setInwardRefNumber(firstRef.documentNumber);
      setInwardSupplierName(firstRef.partnerOrSupplier || "");
    } else if (requestId > 0) {
      setInwardRefType("purchase_order");
      setInwardRefNumber(`PO-${requestId}-${new Date().getFullYear()}`);
    }

    if (user?.name && !inwardReceivedBy) {
      setInwardReceivedBy(user.name);
    }
  }, [availableReferences, requestId, user]);

  // تهيئة الكميات الافتراضية للبنود (المتبقي للإدخال)
  useEffect(() => {
    if (inventoryItems.length > 0 && Object.keys(inwardItems).length === 0) {
      const initial: Record<string, number> = {};
      inventoryItems.forEach((i) => {
        if (i.pendingInward > 0) {
          initial[i.id] = i.pendingInward;
        }
      });
      setInwardItems(initial);
    }
  }, [inventoryItems]);

  // المستند المرجعي المختار والتحقق من حالة أمر الصرف
  const currentInwardRef = availableReferences.find((r: any) => r.type === inwardRefType) || availableReferences[0];
  const isInwardBlocked = currentInwardRef && currentInwardRef.canCreateInward === false;

  // تغيير نوع المستند المرجعي
  const handleRefTypeChange = (val: string) => {
    setInwardRefType(val);
    const found = availableReferences.find((r: any) => r.type === val);
    if (found) {
      setInwardRefNumber(found.documentNumber);
      if (found.partnerOrSupplier) setInwardSupplierName(found.partnerOrSupplier);
    }
  };

  // تعبئة كامل الكميات المتبقية لكافة البنود
  const handleFillAllRemaining = () => {
    const updated: Record<string, number> = {};
    inventoryItems.forEach((i) => {
      if (i.pendingInward > 0) {
        updated[i.id] = i.pendingInward;
      }
    });
    setInwardItems(updated);
    toast.success("تمت تعبئة كافة الكميات المتبقية تلقائياً");
  };

  // تعيين الكمية لبند محدد بالمتبقي
  const handleFillSingleRemaining = (itemId: string, maxQty: number) => {
    setInwardItems((prev) => ({
      ...prev,
      [itemId]: maxQty,
    }));
  };

  // إحصائيات الإدخال الحالي
  const totalItemsToInwardCount = Object.keys(inwardItems).filter((k) => (inwardItems[k] || 0) > 0).length;
  const totalUnitsToInward = Object.keys(inwardItems).reduce((sum, k) => sum + (inwardItems[k] || 0), 0);

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
    const items = Object.keys(inwardItems)
      .filter((k) => (inwardItems[k] || 0) > 0)
      .map((k) => {
        const found = inventoryItems.find((i) => i.id === k);
        return {
          id: k,
          itemName: found?.name || `بند ${k}`,
          quantity: inwardItems[k],
          unit: found?.unit || "وحدة",
        };
      });

    if (items.length === 0) {
      toast.error("يرجى إدخال كمية موجبة لصنف واحد على الأقل للمتابعة");
      return;
    }

    if (!inwardRefNumber.trim()) {
      toast.error("يرجى إدخال رقم المستند المرجعي (أمر الشراء أو الخطاب أو العقد)");
      return;
    }

    if (isInwardBlocked) {
      toast.error(currentInwardRef?.blockedReason || "لا يمكن إتمام أمر الإدخال حتى يتم تنفيذ أمر الصرف المرتبط أولاً وتحول حالته إلى 'منفّذ'");
      return;
    }

    createInwardMutation.mutate({
      requestId,
      receivedBy: inwardReceivedBy || user?.name || "أمين المستودع",
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
          <p className="text-sm font-semibold text-muted-foreground">جاري تحميل بيانات المستودع الافتراضي والبنود المعتمدة...</p>
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

          {/* محدد طلب سدانة في حال كان هناك أكثر من طلب */}
          {sedanaRequests.length > 1 && (
            <div className="flex items-center gap-2 shrink-0">
              <Label className="text-xs font-bold text-muted-foreground whitespace-nowrap">الطلب:</Label>
              <Select
                value={String(requestId)}
                onValueChange={(val) => setLocation(`/requests/${val}/sedana-inward/new`)}
              >
                <SelectTrigger className="h-9 w-52 text-xs font-semibold bg-background" dir="rtl">
                  <SelectValue placeholder="اختر طلب سدانة..." />
                </SelectTrigger>
                <SelectContent dir="rtl" className="max-h-64">
                  {sedanaRequests.map((r) => (
                    <SelectItem key={r.id} value={String(r.id)} className="text-xs">
                      #{r.requestNumber} - {r.mosqueName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        {/* بطاقة تنبيه حالة أمر الصرف المرتبط */}
        {isInwardBlocked && (
          <Card className="border-2 border-amber-500/40 bg-amber-500/5 shadow-sm rounded-xl overflow-hidden">
            <CardContent className="p-4 sm:p-5 space-y-3 text-right" dir="rtl">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-xl bg-amber-500/15 text-amber-700 dark:text-amber-400 shrink-0">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div className="space-y-1 text-right flex-1">
                  <h3 className="font-bold text-sm text-amber-900 dark:text-amber-300">
                    أمر الإدخال معلّق بانتظار تنفيذ أمر الصرف المالي
                  </h3>
                  <p className="text-xs text-amber-800/90 dark:text-amber-300/80 leading-relaxed">
                    {currentInwardRef?.blockedReason || "وفق تدفق المشتريات المعتمد، لا يمكن إتمام أمر الإدخال المستودعي إلا بعد تنفيذ أمر الصرف المالي وتحول حالته إلى 'منفّذ'."}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-amber-500/20">
                {currentInwardRef?.hasDisbursementOrder ? (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setLocation("/disbursement-orders")}
                    className="text-xs font-bold gap-1.5 text-amber-900 dark:text-amber-200 border-amber-400 dark:border-amber-700 bg-amber-100/50 dark:bg-amber-950/40 hover:bg-amber-100 cursor-pointer"
                  >
                    <Coins className="w-4 h-4 text-amber-600" />
                    <span>متابعة أمر الصرف المرتبط (#{currentInwardRef.disbursementOrderNumber})</span>
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    onClick={() => setLocation(`/disbursement-orders/new-direct?source=${inwardRefType}&orderNumber=${encodeURIComponent(inwardRefNumber || currentInwardRef?.documentNumber || "")}&requestId=${requestId}`)}
                    className="text-xs font-bold gap-1.5 bg-amber-600 hover:bg-amber-700 text-white cursor-pointer shadow-xs"
                  >
                    <Coins className="w-4 h-4" />
                    <span>إنشاء أمر صرف مالي الآن</span>
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {currentInwardRef?.isExecuted && (
          <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-900 dark:text-emerald-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-700 dark:text-emerald-300">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <span className="font-bold text-sm block">أمر الصرف المالي منفّذ ومكتمل</span>
                <span className="text-[11px] text-muted-foreground">
                  رقم أمر الصرف: <strong className="font-mono text-foreground font-bold">{currentInwardRef.disbursementOrderNumber}</strong> • المبلغ المصروف: <strong className="font-mono text-emerald-700 dark:text-emerald-400 font-bold">{currentInwardRef.disbursementAmount} ر.س</strong>
                </span>
              </div>
            </div>
            <Badge variant="outline" className="text-xs font-bold border-emerald-500 text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 self-start sm:self-auto px-3 py-1">
              جاهز للإدخال المستودعي
            </Badge>
          </div>
        )}

        {/* القسم الأول: بيانات المستند المرجعي والتوريد */}
        <Card className="border-border/80 shadow-xs rounded-xl overflow-hidden bg-white dark:bg-slate-900">
          <CardHeader className="bg-muted/30 border-b border-border/50 py-3.5 px-5 text-right">
            <CardTitle className="text-sm font-bold flex items-center gap-2 text-foreground">
              <FileText className="w-4 h-4 text-primary" />
              <span>بيانات المستند المرجعي والتوريد</span>
            </CardTitle>
            <CardDescription className="text-xs">
              تحديد مستند التأمين (أمر شراء، خطاب مسؤولية، عقد) وبيانات المورد والمستلم
            </CardDescription>
          </CardHeader>
          <CardContent className="p-5 space-y-4 text-right" dir="rtl">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* نوع مستند التأمين */}
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">نوع مستند التأمين *</Label>
                <Select value={inwardRefType} onValueChange={handleRefTypeChange}>
                  <SelectTrigger className="h-10 text-xs rounded-xl bg-background" dir="rtl">
                    <SelectValue placeholder="اختر نوع المستند..." />
                  </SelectTrigger>
                  <SelectContent dir="rtl">
                    {availableReferences.length > 0 ? (
                      availableReferences.map((ref: any) => (
                        <SelectItem key={ref.type} value={ref.type} className="text-xs">
                          {ref.label}
                        </SelectItem>
                      ))
                    ) : (
                      <>
                        <SelectItem value="purchase_order" className="text-xs">أمر شراء معتمد (سدانة)</SelectItem>
                        <SelectItem value="csr_letter" className="text-xs">خطاب مسؤولية مجتمعية معتمد</SelectItem>
                        <SelectItem value="supplier_contract" className="text-xs">عقد مورد</SelectItem>
                        <SelectItem value="direct_purchase" className="text-xs">شراء مباشر</SelectItem>
                        <SelectItem value="in_kind_donation" className="text-xs">تبرع عيني</SelectItem>
                      </>
                    )}
                  </SelectContent>
                </Select>
              </div>

              {/* رقم المستند المرجعي */}
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">رقم المستند المرجعي *</Label>
                <Input
                  value={inwardRefNumber}
                  onChange={(e) => setInwardRefNumber(e.target.value)}
                  placeholder="مثال: PO-98-2026 أو CSR-98-2026"
                  className="h-10 text-xs font-mono rounded-xl bg-background"
                />
              </div>

              {/* اسم المورد أو الشريك المانح */}
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">اسم المورد / الشريك المانح</Label>
                <Input
                  value={inwardSupplierName}
                  onChange={(e) => setInwardSupplierName(e.target.value)}
                  placeholder="اسم المورد المعتمد..."
                  className="h-10 text-xs rounded-xl bg-background"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 border-t border-border/50">
              {/* رقم فاتورة المورد أو بوليصة الشحن */}
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                  <Receipt className="w-3.5 h-3.5 text-muted-foreground" />
                  <span>رقم فاتورة المورد / بوليصة الشحن (إن وجدت)</span>
                </Label>
                <Input
                  value={inwardSupplierInvoice}
                  onChange={(e) => setInwardSupplierInvoice(e.target.value)}
                  placeholder="مثال: INV-2026-0042 أو رقم بوليصة الشحن"
                  className="h-10 text-xs font-mono rounded-xl bg-background"
                />
              </div>

              {/* اسم المستلم */}
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                  <User className="w-3.5 h-3.5 text-muted-foreground" />
                  <span>اسم المستلم (أمين المستودع / المنسق) *</span>
                </Label>
                <Input
                  value={inwardReceivedBy}
                  onChange={(e) => setInwardReceivedBy(e.target.value)}
                  placeholder="أمين المستودع"
                  className="h-10 text-xs rounded-xl bg-background"
                />
              </div>

              {/* تاريخ الإدخال */}
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                  <span>تاريخ أمر الإدخال *</span>
                </Label>
                <Input
                  type="date"
                  value={inwardDate}
                  onChange={(e) => setInwardDate(e.target.value)}
                  className="h-10 text-xs rounded-xl bg-background text-right"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* القسم الثاني: جدول الأصناف والكميات الموردة */}
        <Card className="border-border/80 shadow-xs rounded-xl overflow-hidden bg-white dark:bg-slate-900">
          <CardHeader className="bg-muted/30 border-b border-border/50 py-3.5 px-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-right">
            <div>
              <CardTitle className="text-sm font-bold flex items-center gap-2 text-foreground">
                <Package className="w-4 h-4 text-emerald-600" />
                <span>أصناف وكميات أمر الإدخال ({inventoryItems.length} أصناف مسجلة)</span>
              </CardTitle>
              <CardDescription className="text-xs">
                حدد الكميات الموردة فعلياً والمطابقة للمواصفات لإدخالها إلى رصيد المستودع
              </CardDescription>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleFillAllRemaining}
                className="text-xs font-bold gap-1 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 cursor-pointer h-8 rounded-lg"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>تعبئة كافة الكميات المتبقية</span>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto" dir="rtl">
              <Table className="text-xs text-right" dir="rtl">
                <TableHeader className="bg-muted/40">
                  <TableRow className="border-b border-border/60">
                    <TableHead className="w-12 text-center font-bold">#</TableHead>
                    <TableHead className="font-bold min-w-[200px]">الصنف والوصف</TableHead>
                    <TableHead className="text-center font-bold w-28">طريقة التأمين</TableHead>
                    <TableHead className="text-center font-bold w-24">الكمية المعتمدة</TableHead>
                    <TableHead className="text-center font-bold w-24 text-slate-600 dark:text-slate-400">المدخل سابقاً</TableHead>
                    <TableHead className="text-center font-bold w-24 text-amber-700 dark:text-amber-400">المتبقي</TableHead>
                    <TableHead className="text-center font-bold w-40 text-emerald-700 dark:text-emerald-400">الكمية الموردة الآن</TableHead>
                    <TableHead className="w-20 text-center font-bold">إجراء</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-border">
                  {inventoryItems.map((it, idx) => {
                    const currentVal = inwardItems[it.id] ?? 0;
                    return (
                      <TableRow key={it.id} className="hover:bg-muted/10 transition-colors">
                        <TableCell className="text-center font-mono text-muted-foreground font-bold">
                          {idx + 1}
                        </TableCell>
                        <TableCell>
                          <div className="font-bold text-foreground text-xs sm:text-sm">{it.name}</div>
                          {it.description && (
                            <div className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">{it.description}</div>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline" className="text-[10px]">
                            {it.allocationMethod === "purchase_order" && "أمر شراء"}
                            {it.allocationMethod === "csr_letter" && "مسؤولية مجتمعية"}
                            {it.allocationMethod === "supplier_contract" && "عقد مورد"}
                            {it.allocationMethod === "direct_purchase" && "شراء مباشر"}
                            {it.allocationMethod === "in_kind_donation" && "تبرع عيني"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center font-mono font-bold">
                          {it.approvedQty} <span className="text-[10px] font-normal text-muted-foreground">{it.unit}</span>
                        </TableCell>
                        <TableCell className="text-center font-mono font-bold text-slate-600 dark:text-slate-400">
                          {it.totalInward} <span className="text-[10px] font-normal">{it.unit}</span>
                        </TableCell>
                        <TableCell className="text-center font-mono font-bold text-amber-700 dark:text-amber-400">
                          {it.pendingInward} <span className="text-[10px] font-normal">{it.unit}</span>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <Input
                              type="number"
                              step="any"
                              min="0"
                              value={currentVal || ""}
                              onChange={(e) => {
                                const val = parseFloat(e.target.value) || 0;
                                setInwardItems((prev) => ({
                                  ...prev,
                                  [it.id]: val,
                                }));
                              }}
                              placeholder="0"
                              className="h-9 w-24 text-center font-mono font-bold text-xs bg-slate-50 dark:bg-slate-900 border-emerald-300 dark:border-emerald-800 focus:ring-emerald-500 rounded-lg"
                            />
                            <span className="text-[10px] text-muted-foreground font-semibold shrink-0">{it.unit}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          {it.pendingInward > 0 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => handleFillSingleRemaining(it.id, it.pendingInward)}
                              className="h-7 text-[11px] px-2 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 cursor-pointer"
                              title="تعبئة المتبقي لهذا الصنف"
                            >
                              المتبقي
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
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
                  إجمالي الوحدات الموردة: <strong className="font-mono text-emerald-700 dark:text-emerald-400 font-bold">{totalUnitsToInward}</strong> وحدة
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* القسم الثالث: ملاحظات التوريد والفحص */}
        <Card className="border-border/80 shadow-xs rounded-xl overflow-hidden bg-white dark:bg-slate-900">
          <CardHeader className="bg-muted/30 border-b border-border/50 py-3.5 px-5 text-right">
            <CardTitle className="text-sm font-bold text-foreground">
              ملاحظات الفحص والاستلام التوريدي
            </CardTitle>
            <CardDescription className="text-xs">
              توثيق حالة الأصناف المستلمة ومطابقتها للمواصفات المعتمدة وأي ملاحظات فنية
            </CardDescription>
          </CardHeader>
          <CardContent className="p-5 text-right" dir="rtl">
            <Textarea
              value={inwardNotes}
              onChange={(e) => setInwardNotes(e.target.value)}
              placeholder="مثال: تم فحص الأصناف ومطابقتها لعرض السعر وأمر الشراء المعتمد، وحالة المواد سليمة وجاهزة للتوزيع المجدول..."
              rows={3}
              className="text-xs leading-relaxed bg-background rounded-xl border-border focus:ring-primary text-right"
            />
          </CardContent>
        </Card>

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

          <Button
            type="button"
            onClick={handleSubmit}
            disabled={createInwardMutation.isPending || isInwardBlocked || totalItemsToInwardCount === 0}
            className={`h-11 px-8 rounded-xl text-xs sm:text-sm font-bold gap-2 shadow-sm transition-all cursor-pointer ${
              isInwardBlocked
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
            ) : (
              <>
                <Check className="w-4 h-4" />
                <span>تأكيد وتوثيق أمر الإدخال بالمستودع</span>
              </>
            )}
          </Button>
        </div>
      </div>
    </DashboardLayout>
  );
}
