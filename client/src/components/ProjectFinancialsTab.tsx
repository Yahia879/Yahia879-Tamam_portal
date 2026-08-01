import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DollarSign,
  Building2,
  FileText,
  Plus,
  Edit3,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Receipt,
  Check,
  Loader2,
  Info,
  Calendar,
  UserCheck,
  Sparkles,
  Download,
  Paperclip,
} from "lucide-react";
import { toast } from "sonner";

interface ProjectFinancialsTabProps {
  projectId: number;
}

export default function ProjectFinancialsTab({ projectId }: ProjectFinancialsTabProps) {
  const utils = trpc.useUtils();

  // 1. Fetch Financial Data
  const { data, isLoading, refetch } = trpc.projects.getFinancialData.useQuery({ projectId });

  // 2. Fetch Support Categories
  const { data: allCategories = [] } = trpc.categories.getAllCategories.useQuery(undefined, {
    staleTime: 10 * 60 * 1000,
  });
  const fundingSupportCategories = (allCategories || []).filter((cat: any) => cat.type === "funding_support" && cat.isActive !== false);

  // Form States for Financial & Support Details
  const [approvedQuotationId, setApprovedQuotationId] = useState<number | null>(null);
  const [supportEntity, setSupportEntity] = useState<string>("");
  const [customSupportEntity, setCustomSupportEntity] = useState<string>("");
  const [supportAmount, setSupportAmount] = useState<number>(0);
  const [adminFeeType, setAdminFeeType] = useState<"percentage" | "fixed">("percentage");
  const [adminFeeValue, setAdminFeeValue] = useState<number>(0);
  const [financialNotes, setFinancialNotes] = useState<string>("");

  const [isEditingFinancials, setIsEditingFinancials] = useState<boolean>(false);

  // Receipt Voucher Dialog States
  const [isVoucherModalOpen, setIsVoucherModalOpen] = useState<boolean>(false);
  const [editingVoucherId, setEditingVoucherId] = useState<number | null>(null);
  const [voucherAmount, setVoucherAmount] = useState<string>("");
  const [voucherDate, setVoucherDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [voucherPayerName, setVoucherPayerName] = useState<string>("");
  const [voucherPaymentMethod, setVoucherPaymentMethod] = useState<string>("bank_transfer");
  const [voucherRefNumber, setVoucherRefNumber] = useState<string>("");
  const [voucherBankName, setVoucherBankName] = useState<string>("");
  const [voucherAttachmentUrl, setVoucherAttachmentUrl] = useState<string>("");
  const [voucherNotes, setVoucherNotes] = useState<string>("");

  // Mutations
  const upsertFinancialsMutation = trpc.projects.upsertFinancialDetails.useMutation({
    onSuccess: () => {
      toast.success("تم حفظ البيانات المالية والدعم بنجاح");
      setIsEditingFinancials(false);
      refetch();
    },
    onError: (err) => {
      toast.error(err.message || "حدث خطأ أثناء حفظ البيانات المالية");
    },
  });

  const createVoucherMutation = trpc.projects.createReceiptVoucher.useMutation({
    onSuccess: () => {
      toast.success("تم تسجيل سند القبض بنجاح");
      closeVoucherModal();
      refetch();
    },
    onError: (err) => {
      toast.error(err.message || "حدث خطأ أثناء تسجيل سند القبض");
    },
  });

  const updateVoucherMutation = trpc.projects.updateReceiptVoucher.useMutation({
    onSuccess: () => {
      toast.success("تم تحديث سند القبض بنجاح");
      closeVoucherModal();
      refetch();
    },
    onError: (err) => {
      toast.error(err.message || "حدث خطأ أثناء تحديث سند القبض");
    },
  });

  const deleteVoucherMutation = trpc.projects.deleteReceiptVoucher.useMutation({
    onSuccess: () => {
      toast.success("تم حذف سند القبض");
      refetch();
    },
    onError: (err) => {
      toast.error(err.message || "حدث خطأ أثناء حذف السند");
    },
  });

  // Populate state when data arrives
  useEffect(() => {
    if (data?.financialDetail) {
      setApprovedQuotationId(data.financialDetail.approvedQuotationId || data.approvedQuotation?.id || null);
      setSupportEntity(data.financialDetail.supportEntity || "");
      setCustomSupportEntity(data.financialDetail.customSupportEntity || "");
      setSupportAmount(parseFloat(data.financialDetail.supportAmount || "0"));
      setAdminFeeType((data.financialDetail.adminFeeType as any) || "percentage");
      setAdminFeeValue(parseFloat(data.financialDetail.adminFeeValue || "0"));
      setFinancialNotes(data.financialDetail.notes || "");
    } else if (data?.approvedQuotation) {
      setApprovedQuotationId(data.approvedQuotation.id);
    }
  }, [data]);

  // Calculations
  const approvedQuotation = data?.approvedQuotation || null;
  const supplierBaseAmount = approvedQuotation 
    ? parseFloat((approvedQuotation.approvedAmount || approvedQuotation.negotiatedAmount || approvedQuotation.finalAmount || approvedQuotation.totalAmount || "0").toString())
    : 0;

  // Calculated admin fee
  const calculatedAdminFeeAmount = adminFeeType === "percentage"
    ? (supplierBaseAmount * (adminFeeValue || 0)) / 100
    : (adminFeeValue || 0);

  const totalRequiredCost = supplierBaseAmount + calculatedAdminFeeAmount;
  const currentSupportAmount = supportAmount || 0;
  const coverageDifference = currentSupportAmount - totalRequiredCost;
  const isFullyCovered = coverageDifference >= -0.01;

  // Receipts Calculations
  const receiptVouchers = data?.receiptVouchers || [];
  const totalReceivedAmount = receiptVouchers.reduce((sum, v) => sum + parseFloat(v.amount || "0"), 0);
  const remainingSupportToCollect = Math.max(0, currentSupportAmount - totalReceivedAmount);
  const collectionPercentage = currentSupportAmount > 0 
    ? Math.min(100, Math.round((totalReceivedAmount / currentSupportAmount) * 100))
    : 0;

  // Handlers
  const handleSaveFinancials = () => {
    upsertFinancialsMutation.mutate({
      projectId,
      approvedQuotationId,
      supportEntity,
      customSupportEntity,
      supportAmount: currentSupportAmount,
      adminFeeType,
      adminFeeValue,
      adminFeeAmount: calculatedAdminFeeAmount,
      notes: financialNotes,
    });
  };

  const openAddVoucherModal = () => {
    setEditingVoucherId(null);
    setVoucherAmount("");
    setVoucherDate(new Date().toISOString().split("T")[0]);
    setVoucherPayerName(supportEntity === "اخرى" ? customSupportEntity : supportEntity || "");
    setVoucherPaymentMethod("bank_transfer");
    setVoucherRefNumber("");
    setVoucherBankName("");
    setVoucherAttachmentUrl("");
    setVoucherNotes("");
    setIsVoucherModalOpen(true);
  };

  const openEditVoucherModal = (voucher: any) => {
    setEditingVoucherId(voucher.id);
    setVoucherAmount(voucher.amount.toString());
    setVoucherDate(voucher.receiptDate ? new Date(voucher.receiptDate).toISOString().split("T")[0] : "");
    setVoucherPayerName(voucher.payerName || "");
    setVoucherPaymentMethod(voucher.paymentMethod || "bank_transfer");
    setVoucherRefNumber(voucher.referenceNumber || "");
    setVoucherBankName(voucher.bankName || "");
    setVoucherAttachmentUrl(voucher.attachmentUrl || "");
    setVoucherNotes(voucher.notes || "");
    setIsVoucherModalOpen(true);
  };

  const closeVoucherModal = () => {
    setIsVoucherModalOpen(false);
    setEditingVoucherId(null);
  };

  const handleSaveVoucher = () => {
    const amountNum = parseFloat(voucherAmount);
    if (!amountNum || amountNum <= 0) {
      toast.error("يرجى إدخال مبلغ قبض صحيح أكبر من صفر");
      return;
    }
    if (!voucherDate) {
      toast.error("يرجى تحديد تاريخ القبض");
      return;
    }

    if (editingVoucherId) {
      updateVoucherMutation.mutate({
        id: editingVoucherId,
        amount: amountNum,
        receiptDate: voucherDate,
        payerName: voucherPayerName,
        paymentMethod: voucherPaymentMethod,
        referenceNumber: voucherRefNumber,
        bankName: voucherBankName,
        attachmentUrl: voucherAttachmentUrl,
        notes: voucherNotes,
      });
    } else {
      createVoucherMutation.mutate({
        projectId,
        amount: amountNum,
        receiptDate: voucherDate,
        payerName: voucherPayerName,
        paymentMethod: voucherPaymentMethod,
        referenceNumber: voucherRefNumber,
        bankName: voucherBankName,
        attachmentUrl: voucherAttachmentUrl,
        notes: voucherNotes,
      });
    }
  };

  const handleDeleteVoucher = (id: number) => {
    if (confirm("هل أنت تأكد من رغبتك في حذف سند القبض هذا؟")) {
      deleteVoucherMutation.mutate({ id });
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 space-y-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">جاري تحميل البيانات المالية وسندات القبض...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 dir-rtl text-right">

      {/* 1. معادلة التغطية المالية التجميعية (Combined Formula Status Banner) */}
      <Card className={`border-2 shadow-sm ${isFullyCovered ? "border-green-300 bg-green-50/40" : "border-amber-300 bg-amber-50/40"}`}>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                {isFullyCovered ? (
                  <Badge className="bg-green-600 hover:bg-green-700 text-white gap-1 px-3 py-1 text-sm font-semibold">
                    <CheckCircle2 className="h-4 w-4" />
                    الدعم كافٍ ومغطى بالكامل (100%)
                  </Badge>
                ) : (
                  <Badge className="bg-amber-600 hover:bg-amber-700 text-white gap-1 px-3 py-1 text-sm font-semibold">
                    <AlertTriangle className="h-4 w-4" />
                    عجز في تغطية المبلغ الكلي للمشروع
                  </Badge>
                )}
                <span className="text-xs text-muted-foreground font-medium">المعادلة المجمعة</span>
              </div>
              <p className="text-sm text-gray-700 mt-2">
                {isFullyCovered 
                  ? "إجمالي مبلغ الدعم المقدم من الجهة كافٍ لتغطية (المبلغ المتفق عليه مع المورد + الأجور الإدارية)."
                  : `تنبيه: يوجد عجز مالي بمقدار (${Math.abs(coverageDifference).toLocaleString("ar-SA", { minimumFractionDigits: 2 })} ريال). مبلغ الدعم المقدم لا يكفي لتغطية التكاليف والأجور الإدارية.`
                }
              </p>
            </div>

            {/* Visual Formula summary */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-white/80 p-3 rounded-lg border text-xs shadow-xs w-full md:w-auto">
              <div className="text-center p-2 border-r last:border-r-0">
                <span className="text-muted-foreground block">مبلغ المورد</span>
                <span className="font-bold text-gray-900 text-sm mt-0.5 inline-block">
                  {supplierBaseAmount.toLocaleString("ar-SA", { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="text-center p-2 border-r last:border-r-0">
                <span className="text-muted-foreground block">+ الأجور الإدارية</span>
                <span className="font-bold text-orange-700 text-sm mt-0.5 inline-block">
                  {calculatedAdminFeeAmount.toLocaleString("ar-SA", { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="text-center p-2 border-r last:border-r-0 bg-slate-50 rounded-sm">
                <span className="text-muted-foreground block">= إجمالي التكلفة</span>
                <span className="font-bold text-primary text-sm mt-0.5 inline-block">
                  {totalRequiredCost.toLocaleString("ar-SA", { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="text-center p-2">
                <span className="text-muted-foreground block">مبلغ الدعم المقدم</span>
                <span className={`font-bold text-sm mt-0.5 inline-block ${isFullyCovered ? "text-green-700" : "text-red-600"}`}>
                  {currentSupportAmount.toLocaleString("ar-SA", { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 2. تفاصيل عرض السعر المعتمد والمورد + جهة الدعم والأجور الإدارية */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* عرض السعر المعتمد والمورد */}
        <Card className="shadow-xs border-slate-200">
          <CardHeader className="bg-slate-50/50 pb-3 border-b flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base font-bold flex items-center gap-2 text-primary">
                <Building2 className="h-5 w-5 text-primary" />
                عرض السعر المعتمد مع المورد
              </CardTitle>
              <CardDescription className="text-xs mt-0.5">
                بيانات المورد وعرض السعر المعتمد للمشروع
              </CardDescription>
            </div>
            {approvedQuotation && (
              <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 font-semibold">
                معتمد
              </Badge>
            )}
          </CardHeader>

          <CardContent className="pt-4 space-y-4 text-sm">
            {approvedQuotation ? (
              <>
                {/* بيانات المورد */}
                <div className="bg-blue-50/50 p-4 rounded-lg border border-blue-100 space-y-3">
                  <div className="flex items-center justify-between border-b border-blue-100 pb-2">
                    <span className="font-bold text-blue-900 text-base">{approvedQuotation.supplierName || "اسم المورد غير محدد"}</span>
                    <Badge variant="secondary" className="text-xs">المورد / المقاول</Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-muted-foreground block">رقم السجل التجاري:</span>
                      <span className="font-semibold text-gray-800">{approvedQuotation.supplierCommercialRegister || "غير مدخل"}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block">الهاتف / التواصـل:</span>
                      <span className="font-semibold text-gray-800">{approvedQuotation.supplierPhone || "غير مدخل"}</span>
                    </div>
                    <div className="col-span-2">
                      <span className="text-muted-foreground block">البريد الإلكتروني:</span>
                      <span className="font-semibold text-gray-800">{approvedQuotation.supplierEmail || "غير مدخل"}</span>
                    </div>
                  </div>
                </div>

                {/* تفاصيل عرض السعر */}
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="p-3 bg-gray-50 rounded-lg border">
                    <span className="text-muted-foreground block">رقم عرض السعر:</span>
                    <span className="font-bold text-gray-900 text-sm mt-1 inline-block">{approvedQuotation.quotationNumber}</span>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-lg border">
                    <span className="text-muted-foreground block">التاريخ:</span>
                    <span className="font-bold text-gray-900 text-sm mt-1 inline-block">
                      {approvedQuotation.createdAt ? new Date(approvedQuotation.createdAt).toLocaleDateString("ar-SA") : "-"}
                    </span>
                  </div>
                  <div className="p-3 bg-emerald-50/60 border border-emerald-200 rounded-lg col-span-2 flex justify-between items-center">
                    <div>
                      <span className="text-emerald-800 block text-xs font-medium">المبلغ المعتمد المتفق عليه مع المورد:</span>
                      <span className="font-bold text-emerald-900 text-base mt-0.5 block">
                        {supplierBaseAmount.toLocaleString("ar-SA", { minimumFractionDigits: 2 })} ريال
                      </span>
                    </div>
                    <CheckCircle2 className="h-6 w-6 text-emerald-600" />
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-lg">
                <FileText className="h-10 w-10 mx-auto mb-2 opacity-40 text-muted-foreground" />
                <p className="font-medium">لم يتم ربط أو اختيار عرض سعر معتمد للمشروع بعد</p>
                <p className="text-xs text-muted-foreground mt-1">
                  يمكنك اعتماد عرض سعر من تبويب "العقود" أو إدخال القيمة المالية مباشرة عند التحديث.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* جهة الدعم والأجور الإدارية */}
        <Card className="shadow-xs border-slate-200">
          <CardHeader className="bg-slate-50/50 pb-3 border-b flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base font-bold flex items-center gap-2 text-primary">
                <DollarSign className="h-5 w-5 text-primary" />
                جهة الدعم والأجور الإدارية
              </CardTitle>
              <CardDescription className="text-xs mt-0.5">
                توثيق الجهة الداعمة والمبلغ والأجور الإدارية لفريق المهندسين والجمعية
              </CardDescription>
            </div>
            <Button
              variant={isEditingFinancials ? "default" : "outline"}
              size="sm"
              onClick={() => {
                if (isEditingFinancials) {
                  handleSaveFinancials();
                } else {
                  setIsEditingFinancials(true);
                }
              }}
              disabled={upsertFinancialsMutation.isPending}
              className="gap-1 text-xs"
            >
              {upsertFinancialsMutation.isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : isEditingFinancials ? (
                <>
                  <Check className="h-3.5 w-3.5" />
                  حفظ البيانات
                </>
              ) : (
                <>
                  <Edit3 className="h-3.5 w-3.5" />
                  تعديل البيانات
                </>
              )}
            </Button>
          </CardHeader>

          <CardContent className="pt-4 space-y-4">
            {isEditingFinancials ? (
              <div className="space-y-4 text-xs">
                {/* اختيار جهة الدعم */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">جهة الدعم المعتمدة *</Label>
                  <Select
                    value={supportEntity}
                    onValueChange={(val) => {
                      setSupportEntity(val);
                      if (val !== "اخرى") setCustomSupportEntity("");
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="اختر جهة الدعم" />
                    </SelectTrigger>
                    <SelectContent>
                      {fundingSupportCategories.map((cat: any) => (
                        <SelectItem key={cat.id} value={cat.nameAr}>
                          {cat.nameAr}
                        </SelectItem>
                      ))}
                      {fundingSupportCategories.length === 0 && (
                        <>
                          <SelectItem value="متجر التبرعات">متجر التبرعات</SelectItem>
                          <SelectItem value="منصة احسان">منصة احسان</SelectItem>
                          <SelectItem value="تبرع مباشر">تبرع مباشر</SelectItem>
                        </>
                      )}
                      <SelectItem value="اخرى">جهة أخرى</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {supportEntity === "اخرى" && (
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">اسم جهة الدعم الأخرى *</Label>
                    <Input
                      type="text"
                      value={customSupportEntity}
                      onChange={(e) => setCustomSupportEntity(e.target.value)}
                      placeholder="أدخل اسم الجهة الداعمة"
                    />
                  </div>
                )}

                {/* مبلغ الدعم المقدم */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">مبلغ الدعم المقدم من الداعم (ريال) *</Label>
                  <Input
                    type="number"
                    min={0}
                    value={supportAmount || ""}
                    onChange={(e) => setSupportAmount(parseFloat(e.target.value) || 0)}
                    placeholder="0.00"
                    className="font-bold text-blue-800 text-left [direction:ltr]"
                  />
                </div>

                {/* الأجور الإدارية */}
                <div className="p-3 bg-amber-50/50 rounded-lg border border-amber-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-bold text-amber-900">الأجور الإدارية (المهندسين والجمعية)</Label>
                    <Select
                      value={adminFeeType}
                      onValueChange={(val: "percentage" | "fixed") => setAdminFeeType(val)}
                    >
                      <SelectTrigger className="h-8 w-32 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="percentage">نسبة مئوية (%)</SelectItem>
                        <SelectItem value="fixed">مبلغ ثابت (ريال)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-2 gap-3 items-center">
                    <div>
                      <Label className="text-[11px] text-muted-foreground">
                        {adminFeeType === "percentage" ? "نسبة الأجور (%)" : "قيمة الأجور (ريال)"}
                      </Label>
                      <Input
                        type="number"
                        min={0}
                        value={adminFeeValue || ""}
                        onChange={(e) => setAdminFeeValue(parseFloat(e.target.value) || 0)}
                        placeholder="0"
                        className="h-8 text-xs font-bold text-left [direction:ltr]"
                      />
                    </div>
                    <div>
                      <Label className="text-[11px] text-muted-foreground">المبلغ المحسوب للأجور</Label>
                      <div className="h-8 flex items-center px-3 rounded-md bg-white border font-bold text-orange-800 text-xs [direction:ltr]">
                        {calculatedAdminFeeAmount.toLocaleString("ar-SA", { minimumFractionDigits: 2 })} ريال
                      </div>
                    </div>
                  </div>
                </div>

                {/* ملاحظات */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">ملاحظات إضافية</Label>
                  <Textarea
                    value={financialNotes}
                    onChange={(e) => setFinancialNotes(e.target.value)}
                    placeholder="أي ملاحظات تخص المالية والدعم..."
                    rows={2}
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-3 text-xs">
                {/* عرض البيانات الحالية */}
                <div className="p-3 bg-gray-50 rounded-lg border space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">جهة الدعم المعتمدة:</span>
                    <span className="font-bold text-blue-900 text-sm">
                      {supportEntity === "اخرى" ? customSupportEntity || "جهة أخرى" : supportEntity || "لم تدرج بعد"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between border-t pt-2">
                    <span className="text-muted-foreground">مبلغ الدعم المقدم:</span>
                    <span className="font-bold text-green-700 text-sm">
                      {currentSupportAmount.toLocaleString("ar-SA", { minimumFractionDigits: 2 })} ريال
                    </span>
                  </div>
                </div>

                <div className="p-3 bg-amber-50/60 rounded-lg border border-amber-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-amber-900 font-medium">بند الأجور الإدارية:</span>
                    <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-300">
                      {adminFeeType === "percentage" ? `${adminFeeValue}% نسبة` : "مبلغ ثابت"}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between border-t border-amber-200 pt-2">
                    <span className="text-muted-foreground">قيمة الأجور الإدارية المحسوبة:</span>
                    <span className="font-bold text-orange-700 text-sm">
                      {calculatedAdminFeeAmount.toLocaleString("ar-SA", { minimumFractionDigits: 2 })} ريال
                    </span>
                  </div>
                </div>

                {financialNotes && (
                  <div className="p-2.5 bg-slate-50 rounded-md border text-muted-foreground text-xs">
                    <span className="font-semibold text-gray-700 block mb-0.5">الملاحظات:</span>
                    {financialNotes}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

      </div>

      {/* 3. قسم سندات القبض (Receipt Vouchers Section) */}
      <Card className="shadow-xs border-slate-200">
        <CardHeader className="bg-slate-50/50 pb-3 border-b flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <CardTitle className="text-base font-bold flex items-center gap-2 text-primary">
              <Receipt className="h-5 w-5 text-primary" />
              سندات القبض (الدفعات المقبوضة فعلياً من الداعم)
            </CardTitle>
            <CardDescription className="text-xs mt-0.5">
              تسجيل وتوثيق جميع الدفعات المقبوضة فعلياً وتحديد تاريخ القبض لكل دفعة
            </CardDescription>
          </div>
          <Button onClick={openAddVoucherModal} size="sm" className="gap-1.5 font-bold text-xs bg-primary">
            <Plus className="h-4 w-4" />
            تسجيل سند قبض جديد
          </Button>
        </CardHeader>

        <CardContent className="pt-6 space-y-6">

          {/* Cards metrics for Collection */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 bg-blue-50/60 rounded-xl border border-blue-100 text-right">
              <span className="text-xs text-muted-foreground block">إجمالي مبلغ الدعم المعتمد</span>
              <span className="text-lg font-bold text-blue-900 mt-1 block">
                {currentSupportAmount.toLocaleString("ar-SA", { minimumFractionDigits: 2 })} ريال
              </span>
            </div>

            <div className="p-4 bg-emerald-50/60 rounded-xl border border-emerald-100 text-right">
              <span className="text-xs text-muted-foreground block">إجمالي المقبوض فعلياً (سندات القبض)</span>
              <span className="text-lg font-bold text-emerald-900 mt-1 block">
                {totalReceivedAmount.toLocaleString("ar-SA", { minimumFractionDigits: 2 })} ريال
              </span>
            </div>

            <div className="p-4 bg-amber-50/60 rounded-xl border border-amber-100 text-right">
              <span className="text-xs text-muted-foreground block">المبلغ المتبقي للقبض</span>
              <span className="text-lg font-bold text-amber-900 mt-1 block">
                {remainingSupportToCollect.toLocaleString("ar-SA", { minimumFractionDigits: 2 })} ريال
              </span>
            </div>
          </div>

          {/* Progress Bar of Collection */}
          <div className="space-y-1.5 bg-slate-50 p-3 rounded-lg border">
            <div className="flex items-center justify-between text-xs font-semibold">
              <span className="text-gray-700">نسبة التحصيل والقبض الفعلي</span>
              <span className="text-emerald-700 font-bold">{collectionPercentage}%</span>
            </div>
            <Progress value={collectionPercentage} className="h-2.5 bg-gray-200" />
          </div>

          {/* Table of Receipt Vouchers */}
          {receiptVouchers.length === 0 ? (
            <div className="text-center py-10 border-2 border-dashed rounded-lg bg-gray-50/40">
              <Receipt className="h-12 w-12 mx-auto mb-2 text-muted-foreground/40" />
              <p className="font-semibold text-gray-700 text-sm">لم يتم تسجيل أي سندات قبض بعد</p>
              <p className="text-xs text-muted-foreground mt-1">
                انقر على "تسجيل سند قبض جديد" لإضافة الدفعات المستلمة جزئياً أو كلياً من الداعم.
              </p>
            </div>
          ) : (
            <div className="border rounded-lg overflow-x-auto">
              <Table dir="rtl">
                <TableHeader className="bg-slate-50">
                  <TableRow>
                    <TableHead className="text-right">رقم السند</TableHead>
                    <TableHead className="text-right">تاريخ القبض</TableHead>
                    <TableHead className="text-right">المبلغ المقبوض</TableHead>
                    <TableHead className="text-right">طريقة الدفع</TableHead>
                    <TableHead className="text-right">المرجع / الحوالة</TableHead>
                    <TableHead className="text-right">الملاحظات والمرفق</TableHead>
                    <TableHead className="text-center">إجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {receiptVouchers.map((voucher) => (
                    <TableRow key={voucher.id} className="hover:bg-slate-50/60">
                      <TableCell className="font-bold text-primary text-xs">
                        {voucher.voucherNumber}
                      </TableCell>
                      <TableCell className="text-xs">
                        {voucher.receiptDate ? new Date(voucher.receiptDate).toLocaleDateString("ar-SA") : "-"}
                      </TableCell>
                      <TableCell className="font-bold text-emerald-700 text-xs">
                        {parseFloat(voucher.amount.toString()).toLocaleString("ar-SA", { minimumFractionDigits: 2 })} ريال
                      </TableCell>
                      <TableCell className="text-xs">
                        <Badge variant="outline" className="bg-slate-100 text-slate-800">
                          {voucher.paymentMethod === "bank_transfer" ? "تحويل بنكي" :
                           voucher.paymentMethod === "cash" ? "نقداً" :
                           voucher.paymentMethod === "cheque" ? "شيك بنكي" :
                           voucher.paymentMethod === "platform" ? "منصة إلكترونية" : voucher.paymentMethod}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-gray-650">
                        {voucher.referenceNumber || "-"}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <span>{voucher.notes || "-"}</span>
                          {voucher.attachmentUrl && (
                            <a 
                              href={voucher.attachmentUrl} 
                              target="_blank" 
                              rel="noreferrer"
                              className="text-blue-600 hover:underline flex items-center gap-0.5"
                            >
                              <Paperclip className="h-3.5 w-3.5" />
                              <span className="text-[11px]">مرفق</span>
                            </a>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEditVoucherModal(voucher)}
                            className="h-8 w-8 text-blue-600 hover:text-blue-800 hover:bg-blue-50"
                          >
                            <Edit3 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteVoucher(voucher.id)}
                            className="h-8 w-8 text-red-600 hover:text-red-800 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

        </CardContent>
      </Card>

      {/* Dialog to Add/Edit Receipt Voucher */}
      <Dialog open={isVoucherModalOpen} onOpenChange={setIsVoucherModalOpen}>
        <DialogContent className="dir-rtl text-right max-w-md">
          <DialogHeader className="text-right">
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Receipt className="h-5 w-5 text-primary" />
              {editingVoucherId ? "تعديل سند القبض" : "تسجيل سند قبض جديد"}
            </DialogTitle>
            <DialogDescription className="text-xs">
              أدخل تفاصيل الدفعة المقبوضة فعلياً من الجهة الداعمة
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">مبلغ الدفعة المقبوضة (ريال) *</Label>
              <Input
                type="number"
                min={0.01}
                step={0.01}
                value={voucherAmount}
                onChange={(e) => setVoucherAmount(e.target.value)}
                placeholder="مثال: 1000"
                className="font-bold text-emerald-800 text-left [direction:ltr]"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">تاريخ القبض *</Label>
              <Input
                type="date"
                value={voucherDate}
                onChange={(e) => setVoucherDate(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">اسم الداعم / القابض</Label>
              <Input
                type="text"
                value={voucherPayerName}
                onChange={(e) => setVoucherPayerName(e.target.value)}
                placeholder="اسم الجهة الداعمة"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">طريقة الدفع</Label>
                <Select value={voucherPaymentMethod} onValueChange={setVoucherPaymentMethod}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bank_transfer">تحويل بنكي</SelectItem>
                    <SelectItem value="cash">نقداً</SelectItem>
                    <SelectItem value="cheque">شيك بنكي</SelectItem>
                    <SelectItem value="platform">منصة إلكترونية</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">رقم المرجع / الحوالة</Label>
                <Input
                  type="text"
                  value={voucherRefNumber}
                  onChange={(e) => setVoucherRefNumber(e.target.value)}
                  placeholder="رقم الحوالة أو الشيك"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">رابط مرفق السند (اختياري)</Label>
              <Input
                type="text"
                value={voucherAttachmentUrl}
                onChange={(e) => setVoucherAttachmentUrl(e.target.value)}
                placeholder="رابط الصورة أو مستند السند"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">ملاحظات السند</Label>
              <Textarea
                value={voucherNotes}
                onChange={(e) => setVoucherNotes(e.target.value)}
                placeholder="أي ملاحظات إضافية حول هذه الدفعة..."
                rows={2}
              />
            </div>
          </div>

          <DialogFooter className="flex justify-between items-center gap-2 sm:justify-start">
            <Button
              type="button"
              onClick={handleSaveVoucher}
              disabled={createVoucherMutation.isPending || updateVoucherMutation.isPending}
              className="bg-primary hover:bg-primary/90 font-bold text-xs"
            >
              {(createVoucherMutation.isPending || updateVoucherMutation.isPending) && (
                <Loader2 className="h-3.5 w-3.5 ml-2 animate-spin" />
              )}
              {editingVoucherId ? "حفظ التعديلات" : "إضافة السند"}
            </Button>
            <Button type="button" variant="outline" onClick={closeVoucherModal} className="text-xs">
              إلغاء
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
