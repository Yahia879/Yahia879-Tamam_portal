import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
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
import { useLocation } from "wouter";
import {
  DollarSign,
  Building2,
  FileText,
  Plus,
  Edit3,
  Trash2,
  CheckCircle2,
  CheckCircle,
  XCircle,
  RotateCcw,
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
  Coins,
  Eye,
  Printer,
} from "lucide-react";
import { toast } from "sonner";

interface ProjectFinancialsTabProps {
  projectId: number;
}

export default function ProjectFinancialsTab({ projectId }: ProjectFinancialsTabProps) {
  const utils = trpc.useUtils();
  const [, navigate] = useLocation();

  // 1. Fetch Financial Data
  const { data, isLoading, refetch } = trpc.projects.getFinancialData.useQuery({ projectId });

  // 2. Fetch Support Categories
  const { data: allCategories = [] } = trpc.categories.getAllCategories.useQuery(undefined, {
    staleTime: 10 * 60 * 1000,
  });
  const fundingSupportCategories = (allCategories || []).filter((cat: any) => cat.type === "funding_support" && cat.isActive !== false);

interface SupportSourceItem {
  entity: string;
  customEntity?: string;
  amount: number;
  notes?: string;
}

const normalizeArabicText = (str?: string | null) => {
  if (!str) return "";
  return str
    .trim()
    .replace(/[\u064B-\u0652]/g, "") // tashkeel
    .replace(/[أإآ]/g, "ا") // Alif
    .replace(/ى/g, "ي") // Ya
    .replace(/ة/g, "ه") // Ta Marbouta
    .toLowerCase();
};

const isGeneralAccountName = (name?: string | null) => {
  if (!name) return false;
  const norm = normalizeArabicText(name);
  return norm.includes("الحساب العام") || norm.includes("حساب عام");
};


  // Form States for Financial & Support Details
  const [approvedQuotationId, setApprovedQuotationId] = useState<number | null>(null);
  const [supportEntity, setSupportEntity] = useState<string>("");
  const [customSupportEntity, setCustomSupportEntity] = useState<string>("");
  const { user } = useAuth();
  const isFaaa8User = user?.email === "faaa8@gmail.com";

  const [activeSupporterTab, setActiveSupporterTab] = useState<string>("all");
  const [supportAmount, setSupportAmount] = useState<number>(0);
  const [supportSources, setSupportSources] = useState<SupportSourceItem[]>([]);
  const [adminFeeType, setAdminFeeType] = useState<"percentage" | "fixed">("percentage");
  const [adminFeeValue, setAdminFeeValue] = useState<number>(0);
  const [associationFundingAmount, setAssociationFundingAmount] = useState<number>(0);
  const [associationFundingNotes, setAssociationFundingNotes] = useState<string>("");
  const [financialNotes, setFinancialNotes] = useState<string>("");

  const [isEditingFinancials, setIsEditingFinancials] = useState<boolean>(false);

  // Receipt Voucher Dialog States
  const [isVoucherModalOpen, setIsVoucherModalOpen] = useState<boolean>(false);
  const [editingVoucherId, setEditingVoucherId] = useState<number | null>(null);
  const [voucherAmount, setVoucherAmount] = useState<string>("");
  const [voucherDate, setVoucherDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [voucherPayerName, setVoucherPayerName] = useState<string>("");
  const [customVoucherPayerName, setCustomVoucherPayerName] = useState<string>("");
  const [voucherPaymentMethod, setVoucherPaymentMethod] = useState<string>("bank_transfer");
  const [voucherRefNumber, setVoucherRefNumber] = useState<string>("");
  const [voucherBankName, setVoucherBankName] = useState<string>("");
  const [voucherAttachmentUrl, setVoucherAttachmentUrl] = useState<string>("");
  const [voucherNotes, setVoucherNotes] = useState<string>("");
  const [selectedNote, setSelectedNote] = useState<string | null>(null);

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

  const approveVoucherMutation = trpc.projects.approveReceiptVoucher.useMutation({
    onSuccess: () => {
      toast.success("تم اعتماد سند القبض بنجاح");
      refetch();
    },
    onError: (err) => {
      toast.error(err.message || "حدث خطأ أثناء اعتماد السند");
    },
  });

  const rejectVoucherMutation = trpc.projects.rejectReceiptVoucher.useMutation({
    onSuccess: () => {
      toast.success("تم رفض سند القبض");
      refetch();
    },
    onError: (err) => {
      toast.error(err.message || "حدث خطأ أثناء رفض السند");
    },
  });

  const revokeVoucherApprovalMutation = trpc.projects.revokeReceiptVoucherApproval.useMutation({
    onSuccess: () => {
      toast.success("تم إلغاء اعتماد سند القبض ويمكن تعديله الآن");
      refetch();
    },
    onError: (err) => {
      toast.error(err.message || "حدث خطأ أثناء إلغاء الاعتماد");
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
      setAssociationFundingAmount(parseFloat(data.financialDetail.associationFundingAmount || "0"));
      setAssociationFundingNotes(data.financialDetail.associationFundingNotes || "");
      setFinancialNotes(data.financialDetail.notes || "");

      let parsedSources: SupportSourceItem[] = [];
      if (data.financialDetail.supportSourcesJson) {
        try {
          const parsed = JSON.parse(data.financialDetail.supportSourcesJson);
          if (Array.isArray(parsed) && parsed.length > 0) {
            parsedSources = parsed;
          }
        } catch (e) {
          console.error("Failed to parse supportSourcesJson", e);
        }
      }

      const validParsed = parsedSources.filter(s => (s.entity && s.entity.trim() !== "") || (s.amount && s.amount > 0) || (s.customEntity && s.customEntity.trim() !== ""));

      if (validParsed.length > 0) {
        setSupportSources(validParsed);
      } else if (data.financialDetail.supportEntity && data.financialDetail.supportEntity.trim() !== "") {
        setSupportSources([
          {
            entity: data.financialDetail.supportEntity,
            customEntity: data.financialDetail.customSupportEntity || "",
            amount: parseFloat(data.financialDetail.supportAmount || "0"),
          }
        ]);
      } else {
        setSupportSources([]);
      }
    } else if (data?.approvedQuotation) {
      setApprovedQuotationId(data.approvedQuotation.id);
    }
  }, [data]);

  const addSupportSource = () => {
    setSupportSources(prev => [...prev, { entity: "", customEntity: "", amount: 0 }]);
  };

  const removeSupportSource = (index: number) => {
    setSupportSources(prev => {
      const updated = prev.filter((_, i) => i !== index);
      return updated.length > 0 ? updated : [{ entity: "", customEntity: "", amount: 0 }];
    });
  };

  const updateSupportSource = (index: number, updates: Partial<SupportSourceItem>) => {
    setSupportSources(prev => prev.map((src, i) => i === index ? { ...src, ...updates } : src));
  };

  // Calculations
  const validSupportSources = supportSources.filter(
    (s) => (s.entity && s.entity.trim() !== "") || (s.amount && s.amount > 0) || (s.customEntity && s.customEntity.trim() !== "")
  );

  const approvedQuotation = data?.approvedQuotation || null;
  const supplierBaseAmount = approvedQuotation 
    ? parseFloat((approvedQuotation.approvedAmount || approvedQuotation.negotiatedAmount || approvedQuotation.finalAmount || approvedQuotation.totalAmount || "0").toString())
    : 0;

  // Calculated admin fee
  const calculatedAdminFeeAmount = adminFeeType === "percentage"
    ? (supplierBaseAmount * (adminFeeValue || 0)) / 100
    : (adminFeeValue || 0);

  const totalRequiredCost = supplierBaseAmount + calculatedAdminFeeAmount;
  const currentSupportAmount = validSupportSources.reduce((sum, s) => sum + (s.amount || 0), 0) || supportAmount || 0;
  const coverageDifference = currentSupportAmount - totalRequiredCost;
  const isFullyCovered = coverageDifference >= -0.01;

  // Receipts Calculations
  const receiptVouchers = data?.receiptVouchers || [];
  const vouchersTotalReceived = receiptVouchers.reduce((sum, v) => sum + parseFloat(v.amount || "0"), 0);

  const generalAccountReceivedAmount = validSupportSources
    .filter(s => {
      const name = s.entity === "اخرى" ? s.customEntity : s.entity;
      return isGeneralAccountName(name);
    })
    .reduce((sum, s) => sum + (s.amount || 0), 0);

  const totalReceivedAmount = vouchersTotalReceived + generalAccountReceivedAmount;
  const remainingSupportToCollect = Math.max(0, currentSupportAmount - totalReceivedAmount);
  const collectionRawPct = currentSupportAmount > 0 ? (totalReceivedAmount / currentSupportAmount) * 100 : 0;
  const collectionPercentage = collectionRawPct > 0 && collectionRawPct < 1
    ? parseFloat(collectionRawPct.toFixed(2))
    : Math.min(100, Math.round(collectionRawPct));

  // Handlers
  const handleSaveFinancials = () => {
    const validSources = supportSources.filter(s => (s.entity && s.entity.trim() !== "") || s.amount > 0);
    const finalSources = validSources.length > 0 ? validSources : supportSources;
    const totalSupport = finalSources.reduce((sum, s) => sum + (s.amount || 0), 0);

    upsertFinancialsMutation.mutate({
      projectId,
      approvedQuotationId,
      supportEntity: finalSources.length === 1 ? finalSources[0].entity : "عدة داعمين",
      customSupportEntity: finalSources.length === 1 ? (finalSources[0].customEntity || "") : "",
      supportAmount: totalSupport,
      supportSources: finalSources,
      adminFeeType,
      adminFeeValue,
      adminFeeAmount: calculatedAdminFeeAmount,
      associationFundingAmount,
      associationFundingNotes,
      notes: financialNotes,
    });
  };

  const openAddVoucherModal = () => {
    setEditingVoucherId(null);
    setVoucherAmount("");
    setVoucherDate(new Date().toISOString().split("T")[0]);
    const validSupporters = supportSources.filter(src => {
      const name = src.entity === "اخرى" ? src.customEntity : src.entity;
      return name && !isGeneralAccountName(name);
    });
    const firstSupporter = validSupporters[0]?.entity === "اخرى" ? validSupporters[0]?.customEntity : validSupporters[0]?.entity;
    setVoucherPayerName(firstSupporter || "");
    setCustomVoucherPayerName("");
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
    setVoucherDate(voucher.receiptDate ? new Date(voucher.receiptDate).toISOString().split("T")[0] : new Date().toISOString().split("T")[0]);
    const pName = voucher.payerName || "";
    const matchedSource = supportSources.find(s => {
      const name = s.entity === "اخرى" ? s.customEntity : s.entity;
      return (name || "").trim().toLowerCase() === pName.trim().toLowerCase();
    });
    if (matchedSource) {
      const name = matchedSource.entity === "اخرى" ? matchedSource.customEntity : matchedSource.entity;
      setVoucherPayerName(name || "");
      setCustomVoucherPayerName("");
    } else {
      setVoucherPayerName("اخرى");
      setCustomVoucherPayerName(pName);
    }
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
    if (!voucherAmount || isNaN(amountNum) || amountNum <= 0) {
      toast.error("يرجى إدخال مبلغ الدفعة المقبوضة بشكل صحيح أكبر من صفر");
      return;
    }
    if (!voucherDate || !voucherDate.trim()) {
      toast.error("يرجى تحديد تاريخ القبض");
      return;
    }
    if (!voucherPayerName || !voucherPayerName.trim()) {
      toast.error("يرجى اختيار الجهة الداعمة / القابض منه");
      return;
    }

    const finalPayerName = voucherPayerName.trim();

    if (editingVoucherId) {
      updateVoucherMutation.mutate({
        id: editingVoucherId,
        amount: amountNum,
        receiptDate: voucherDate,
        payerName: finalPayerName,
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
        payerName: finalPayerName,
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
                  if (supportSources.length === 0) {
                    setSupportSources([{ entity: "", customEntity: "", amount: 0 }]);
                  }
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
                {/* قائمة الجهات الداعمة */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-bold text-gray-800">الجهات الداعمة المعتمدة للتمويل *</Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addSupportSource}
                      className="h-7 text-xs gap-1 text-blue-700 border-blue-200 hover:bg-blue-50"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      إضافة داعم آخر
                    </Button>
                  </div>

                  {supportSources.map((source, index) => (
                    <div key={index} className="p-3 bg-blue-50/40 rounded-lg border border-blue-100 space-y-2.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[11px] font-bold text-blue-900">الداعم #{index + 1}</span>
                        {supportSources.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeSupportSource(index)}
                            className="h-6 w-6 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <div>
                          <Label className="text-[11px] text-muted-foreground mb-1 block">جهة الدعم</Label>
                          <Select
                            value={source.entity}
                            onValueChange={(val) => {
                              updateSupportSource(index, {
                                entity: val,
                                customEntity: val !== "اخرى" ? "" : source.customEntity
                              });
                            }}
                          >
                            <SelectTrigger className="h-8 text-xs">
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

                        <div>
                          <Label className="text-[11px] text-muted-foreground mb-1 block">مبلغ الدعم المقدم (ريال)</Label>
                          <Input
                            type="number"
                            min={0}
                            value={source.amount || ""}
                            onChange={(e) => updateSupportSource(index, { amount: parseFloat(e.target.value) || 0 })}
                            placeholder="0.00"
                            className="h-8 text-xs font-bold text-blue-900 text-left [direction:ltr]"
                          />
                        </div>
                      </div>

                      {source.entity === "اخرى" && (
                        <div>
                          <Label className="text-[11px] text-muted-foreground mb-1 block">اسم جهة الدعم الأخرى *</Label>
                          <Input
                            type="text"
                            value={source.customEntity || ""}
                            onChange={(e) => updateSupportSource(index, { customEntity: e.target.value })}
                            placeholder="أدخل اسم الجهة الداعمة"
                            className="h-8 text-xs"
                          />
                        </div>
                      )}
                    </div>
                  ))}

                  {/* إجمالي مبالغ الدعم من كل الداعمين */}
                  <div className="p-2.5 bg-blue-100/60 rounded-md border border-blue-200 flex items-center justify-between">
                    <span className="font-semibold text-blue-950 text-xs">إجمالي التمويل من كافة الداعمين:</span>
                    <span className="font-bold text-blue-900 text-sm">
                      {currentSupportAmount.toLocaleString("ar-SA", { minimumFractionDigits: 2 })} ريال
                    </span>
                  </div>
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
                  <div className="flex items-center justify-between font-semibold text-xs text-gray-700 border-b pb-1.5">
                    <span>الجهات الداعمة للتمويل:</span>
                    <Badge variant="outline" className="bg-blue-50 text-blue-800 border-blue-200">
                      {validSupportSources.length} {validSupportSources.length === 1 ? "داعم" : "داعمين"}
                    </Badge>
                  </div>

                  <div className="space-y-1.5 pt-1">
                    {validSupportSources.length === 0 ? (
                      <div className="text-center py-2 text-xs text-muted-foreground">
                        لم يتم إضافة أي داعم لهذا المشروع بعد (0 داعم).
                      </div>
                    ) : (
                      validSupportSources.map((source, idx) => {
                        const name = source.entity === "اخرى" ? source.customEntity || "جهة أخرى" : source.entity || "غير محدد";
                        return (
                          <div key={idx} className="flex items-center justify-between text-xs py-1 border-b last:border-b-0 border-gray-100">
                            <span className="text-gray-700 font-medium">{idx + 1}. {name}</span>
                            <span className="font-bold text-blue-900">
                              {(source.amount || 0).toLocaleString("ar-SA", { minimumFractionDigits: 2 })} ريال
                            </span>
                          </div>
                        );
                      })
                    )}
                  </div>

                  <div className="flex items-center justify-between border-t border-gray-200 pt-2 font-bold">
                    <span className="text-muted-foreground">إجمالي الدعم المقدم:</span>
                    <span className="font-black text-green-700 text-sm">
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

      {/* 2.5 قسم التمويل الذاتي الممدود من حساب الجمعية (دين / مستحق على الداعم) */}
      {((data?.associationFunding?.totalAmount || 0) > 0 || (data?.associationFunding?.requests?.length || 0) > 0 || associationFundingAmount > 0 || isEditingFinancials) && (() => {
        const assocData = data?.associationFunding || { totalAmount: 0, requests: [] };
        const effectiveAssocAmount = associationFundingAmount > 0 ? associationFundingAmount : (assocData.totalAmount || 0);

        return (
          <Card className="border-amber-300/80 dark:border-amber-900/60 shadow-sm bg-gradient-to-br from-amber-50/70 via-white to-amber-50/20 dark:from-amber-950/20 dark:via-slate-900 dark:to-slate-900 overflow-hidden">
            <CardHeader className="bg-amber-100/40 dark:bg-amber-950/30 border-b border-amber-200/60 dark:border-amber-900/40 pb-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-right">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-400/30">
                  <Coins className="w-5 h-5" />
                </div>
                <div>
                  <CardTitle className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    التمويل الذاتي الممدود من حساب الجمعية
                    <Badge variant="outline" className="bg-amber-100 text-amber-900 border-amber-300 font-bold text-[10px]">
                      دين / مستحق على الداعم
                    </Badge>
                  </CardTitle>
                  <CardDescription className="text-xs text-amber-800/80 dark:text-slate-300">
                    توثيق المبالغ الممدودة مؤقتاً من الحساب العام للجمعية بسبب نقص دفعات الداعم
                  </CardDescription>
                </div>
              </div>
              <div className="text-right sm:text-left bg-white/80 dark:bg-slate-900/80 px-3.5 py-1.5 rounded-xl border border-amber-200 shadow-2xs">
                <span className="text-[10px] text-muted-foreground block font-semibold">إجمالي الدين المستحق للجمعية</span>
                <span className="text-lg font-black text-amber-800 dark:text-amber-400">
                  {effectiveAssocAmount.toLocaleString("ar-SA", { minimumFractionDigits: 2 })} <span className="text-xs font-semibold">ريال</span>
                </span>
              </div>
            </CardHeader>

            <CardContent className="pt-4 space-y-4 text-right">
              {/* التنبيه والإشارة الخاصة بحالة الدين */}
              <div className="p-4 bg-amber-100/60 dark:bg-amber-950/40 rounded-xl border border-amber-300 dark:border-amber-800/60 flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h4 className="font-bold text-xs text-amber-950 dark:text-amber-300">
                    إشارة وحالة الدين المالي: يُعد ديناً مستحقاً على المتبرع / الداعم
                  </h4>
                  <p className="text-xs text-amber-900/90 dark:text-amber-200/90 leading-relaxed font-medium">
                    تم صرف مبلغ قدره <strong>{effectiveAssocAmount.toLocaleString("ar-SA")} ريال</strong> من "الحساب العام للجمعية" لتغطية عجز مدفوعات الداعم ومتابعة تنفيذ أعمال المشروع بدون توقف. هذا المبلغ يُعد <strong>ديناً ثابتاً ومستحقاً لصالح الجمعية على جهة الدعم/المتبرع</strong>، ويجب سداده وإعادة إيداعه في الحساب العام للجمعية عند تحصيل باقي الدعم وسندات القبض القادمة.
                  </p>
                </div>
              </div>

              {/* تعديل يدوي في حال كان نموذج التعديل مفتاحاً */}
              {isEditingFinancials && (
                <div className="p-3.5 bg-background rounded-xl border space-y-3 text-xs">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">المبلغ الممدود من حساب الجمعية (يدوي / تعديل)</Label>
                    <Input
                      type="number"
                      value={associationFundingAmount || ""}
                      onChange={(e) => setAssociationFundingAmount(parseFloat(e.target.value) || 0)}
                      placeholder="0.00"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">ملاحظات التمويل الذاتي والدين</Label>
                    <Input
                      type="text"
                      value={associationFundingNotes}
                      onChange={(e) => setAssociationFundingNotes(e.target.value)}
                      placeholder="أدخل ملاحظات توثيق الدين..."
                    />
                  </div>
                </div>
              )}

              {/* جدول تفاصيل طلبات الصرف الممولة من حساب الجمعية إن وجدت */}
              {assocData.requests && assocData.requests.length > 0 && (
                <div className="space-y-2 pt-1">
                  <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">طلبات الصرف الممولة جزئياً أو كلياً من حساب الجمعية:</h4>
                  <div className="border rounded-xl overflow-hidden bg-background">
                    <Table dir="rtl">
                      <TableHeader className="bg-muted/40">
                        <TableRow>
                          <TableHead className="text-right text-xs">رقم الطلب</TableHead>
                          <TableHead className="text-right text-xs">عنوان طلب الصرف</TableHead>
                          <TableHead className="text-right text-xs">إجمالي الطلب</TableHead>
                          <TableHead className="text-right text-xs">المبلغ الممدود من الجمعية (الدين)</TableHead>
                          <TableHead className="text-center text-xs">حالة الدين</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {assocData.requests.map((req: any) => (
                          <TableRow key={req.id}>
                            <TableCell className="font-mono text-xs font-bold">{req.requestNumber}</TableCell>
                            <TableCell className="text-xs font-medium">{req.title || "طلب صرف مرتبط"}</TableCell>
                            <TableCell className="text-xs">{req.amount.toLocaleString()} ريال</TableCell>
                            <TableCell className="text-xs font-bold text-amber-700 dark:text-amber-400">
                              {req.coveredAmount.toLocaleString()} ريال
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge variant="outline" className="bg-amber-50 text-amber-800 border-amber-300 text-[10px] font-bold">
                                دين مستحق على الداعم
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })()}

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
              <span className="text-gray-700">نسبة التحصيل والقبض الفعلي الإجمالية</span>
              <span className="text-emerald-700 font-bold">{collectionPercentage}%</span>
            </div>
            <Progress value={collectionPercentage} className="h-2.5 bg-gray-200" />
          </div>

          {/* 3.1 كروت التحصيل والقبض تفصيلياً حسب كل داعم */}
          {validSupportSources.length > 0 && (
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Building2 className="h-4 w-4 text-blue-600" />
                  مباشر: المبالغ المدفوعة والمتبقية تفصيلياً لكل داعم ({validSupportSources.length} داعم)
                </h4>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {validSupportSources.map((source, sIdx) => {
                  const sName = source.entity === "اخرى" ? (source.customEntity || "جهة أخرى") : (source.entity || "داعم غير محدد");
                  const targetAmt = source.amount || 0;
                  const isGenAcc = isGeneralAccountName(sName);
                  
                  // Filter receipt vouchers for this supporter with Arabic normalization
                  const normSName = normalizeArabicText(sName);
                  const normEntity = normalizeArabicText(source.entity);
                  const normCustom = normalizeArabicText(source.customEntity);

                  const sVouchers = receiptVouchers.filter(v => {
                    const normPayer = normalizeArabicText(v.payerName);
                    if (!normPayer) return false;
                    return (
                      normPayer === normSName ||
                      normPayer === normEntity ||
                      (normCustom && normPayer === normCustom) ||
                      (normSName && (normPayer.includes(normSName) || normSName.includes(normPayer)))
                    );
                  });

                  const receivedAmt = isGenAcc ? targetAmt : sVouchers.reduce((sum, v) => sum + parseFloat(v.amount.toString() || "0"), 0);
                  const remainingAmt = isGenAcc ? 0 : Math.max(0, targetAmt - receivedAmt);
                  const sRawPct = isGenAcc ? 100 : (targetAmt > 0 ? (receivedAmt / targetAmt) * 100 : (receivedAmt > 0 ? 100 : 0));
                  const sPct = sRawPct > 0 && sRawPct < 1
                    ? parseFloat(sRawPct.toFixed(2))
                    : Math.min(100, Math.round(sRawPct));

                  return (
                    <div key={sIdx} className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-2.5 hover:border-blue-300 transition-colors">
                      <div className="flex items-center justify-between">
                        <Badge variant="outline" className="bg-blue-50 text-blue-900 border-blue-200 font-bold text-xs px-2.5 py-0.5">
                          {sName}
                        </Badge>
                        <Badge variant="outline" className={`text-[10px] font-bold ${sPct >= 100 ? 'bg-emerald-50 text-emerald-800 border-emerald-300' : 'bg-amber-50 text-amber-800 border-amber-300'}`}>
                          {sPct >= 100 ? 'مكتمل التحصيل 100%' : `مكتمل ${sPct}%`}
                        </Badge>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-slate-100">
                        <div className="bg-emerald-50/80 p-2 rounded-lg border border-emerald-100/90 text-right">
                          <span className="text-[10px] text-emerald-800 block font-semibold">المقبوض فعلياً (المدفوع)</span>
                          <span className="text-sm font-bold text-emerald-950 block mt-0.5">
                            {receivedAmt.toLocaleString("ar-SA", { minimumFractionDigits: 2 })} <span className="text-[10px]">ريال</span>
                          </span>
                        </div>

                        <div className="bg-amber-50/80 p-2 rounded-lg border border-amber-100/90 text-right">
                          <span className="text-[10px] text-amber-800 block font-semibold">المبلغ المتبقي للقبض</span>
                          <span className="text-sm font-bold text-amber-950 block mt-0.5">
                            {remainingAmt.toLocaleString("ar-SA", { minimumFractionDigits: 2 })} <span className="text-[10px]">ريال</span>
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-slate-500 pt-0.5">
                        <span>إجمالي الدعم المقرر:</span>
                        <span className="font-bold text-slate-800">{targetAmt.toLocaleString("ar-SA")} ريال</span>
                      </div>

                      <Progress value={sPct} className="h-1.5 bg-slate-100" />
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Categorized Receipt Vouchers by Supporter */}
          {receiptVouchers.length === 0 ? (
            <div className="text-center py-10 border-2 border-dashed rounded-lg bg-gray-50/40">
              <Receipt className="h-12 w-12 mx-auto mb-2 text-muted-foreground/40" />
              <p className="font-semibold text-gray-700 text-sm">لم يتم تسجيل أي سندات قبض بعد</p>
              <p className="text-xs text-muted-foreground mt-1">
                انقر على "تسجيل سند قبض جديد" لإضافة الدفعات المستلمة جزئياً أو كلياً من الداعم.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {validSupportSources.map((source, sIdx) => {
                const sName = source.entity === "اخرى" ? (source.customEntity || "جهة أخرى") : (source.entity || "داعم غير محدد");
                const targetAmt = source.amount || 0;
                const isGenAcc = isGeneralAccountName(sName);
                
                // Filter receipt vouchers for this supporter with Arabic normalization
                const normSName = normalizeArabicText(sName);
                const normEntity = normalizeArabicText(source.entity);
                const normCustom = normalizeArabicText(source.customEntity);

                const sVouchers = receiptVouchers.filter(v => {
                  const normPayer = normalizeArabicText(v.payerName);
                  if (!normPayer) return false;
                  return (
                    normPayer === normSName ||
                    normPayer === normEntity ||
                    (normCustom && normPayer === normCustom) ||
                    (normSName && (normPayer.includes(normSName) || normSName.includes(normPayer)))
                  );
                });

                const receivedAmt = isGenAcc ? targetAmt : sVouchers.reduce((sum, v) => sum + parseFloat(v.amount.toString() || "0"), 0);
                const remainingAmt = isGenAcc ? 0 : Math.max(0, targetAmt - receivedAmt);
                const sRawPct = isGenAcc ? 100 : (targetAmt > 0 ? (receivedAmt / targetAmt) * 100 : (receivedAmt > 0 ? 100 : 0));
                const sPct = sRawPct > 0 && sRawPct < 1
                  ? parseFloat(sRawPct.toFixed(2))
                  : Math.min(100, Math.round(sRawPct));

                return (
                  <Card key={sIdx} className="border border-slate-200 bg-slate-50/30 overflow-hidden shadow-2xs">
                    <CardHeader className="bg-slate-100/60 pb-3 border-b py-3 px-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="bg-blue-50 text-blue-900 border-blue-200 font-bold text-xs px-2.5 py-0.5">
                          {sName}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          ({sVouchers.length} {sVouchers.length === 1 ? "سند" : "سندات"})
                        </span>
                      </div>

                      <div className="flex items-center gap-4 text-xs font-semibold">
                        <div className="text-gray-600">
                          المطلوب: <span className="font-bold text-blue-900">{targetAmt.toLocaleString("ar-SA", { minimumFractionDigits: 2 })} ريال</span>
                        </div>
                        <div className="text-emerald-700">
                          المقبوض: <span className="font-bold text-emerald-800">{receivedAmt.toLocaleString("ar-SA", { minimumFractionDigits: 2 })} ريال</span>
                        </div>
                        <div className="text-amber-700">
                          المتبقي: <span className="font-bold text-amber-800">{remainingAmt.toLocaleString("ar-SA", { minimumFractionDigits: 2 })} ريال</span>
                        </div>
                      </div>
                    </CardHeader>

                    <CardContent className="p-3 space-y-3">
                      {/* Supporter mini progress */}
                      {(targetAmt > 0 || isGenAcc) && (
                        <div className="space-y-1 bg-white p-2 rounded-md border text-[11px]">
                          <div className="flex justify-between items-center font-medium">
                            <span className="text-gray-600">نسبة تحصيل دفعات {sName}:</span>
                            <span className="font-bold text-emerald-700">{sPct}%</span>
                          </div>
                          <Progress value={sPct} className="h-1.5 bg-gray-100" />
                        </div>
                      )}

                      {/* Supporter Vouchers Table */}
                      {sVouchers.length === 0 ? (
                        <div className="text-center py-4 text-xs text-muted-foreground bg-white rounded-md border border-dashed">
                          {isGenAcc 
                            ? `تم توفير تمويل (${sName}) بالكامل من الحساب العام للجمعية بنسبة 100%. لا يلزم تسجيل سندات قبض لهذا الداعم.`
                            : `لم يتم تسجيل أي سندات قبض خاصة بـ (${sName}) حتى الآن.`
                          }
                        </div>
                      ) : (
                        <div className="border rounded-md overflow-x-auto bg-white">
                          <Table dir="rtl">
                            <TableHeader className="bg-slate-50/80">
                              <TableRow>
                                <TableHead className="text-right text-xs">رقم السند</TableHead>
                                <TableHead className="text-right text-xs">تاريخ القبض</TableHead>
                                <TableHead className="text-right text-xs">المبلغ المقبوض</TableHead>
                                <TableHead className="text-right text-xs">وذلك مقابل / السبب</TableHead>
                                <TableHead className="text-center text-xs">الحالة</TableHead>
                                <TableHead className="text-center text-xs">إجراءات</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {sVouchers.map((voucher) => (
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
                                  <TableCell className="text-xs text-muted-foreground">
                                    {voucher.notes ? (
                                      voucher.notes.length > 20 ? (
                                        <div className="flex items-center gap-1">
                                          <span title={voucher.notes}>
                                            {voucher.notes.slice(0, 20)}...
                                          </span>
                                          <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => setSelectedNote(voucher.notes)}
                                            className="h-5 w-5 p-0 shrink-0 text-blue-600 hover:text-blue-800 hover:bg-blue-50 inline-flex items-center justify-center"
                                            title="عرض الملاحظة كاملة"
                                          >
                                            <Eye className="h-3.5 w-3.5" />
                                          </Button>
                                        </div>
                                      ) : (
                                        <span>{voucher.notes}</span>
                                      )
                                    ) : (
                                      <span>-</span>
                                    )}
                                  </TableCell>
                                  <TableCell className="text-center text-xs">
                                    {voucher.status === "approved" ? (
                                      <Badge variant="outline" className="bg-emerald-50 text-emerald-800 border-emerald-300 font-bold text-[10px] px-2 py-0.5">
                                        معتمد
                                      </Badge>
                                    ) : voucher.status === "rejected" ? (
                                      <Badge variant="outline" className="bg-rose-50 text-rose-800 border-rose-300 font-bold text-[10px] px-2 py-0.5">
                                        مرفوض
                                      </Badge>
                                    ) : (
                                      <Badge variant="outline" className="bg-amber-50 text-amber-800 border-amber-300 font-bold text-[10px] px-2 py-0.5">
                                        قيد الاعتماد
                                      </Badge>
                                    )}
                                  </TableCell>
                                  <TableCell className="text-center">
                                    <div className="flex items-center justify-center gap-1">
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => navigate(`/receipt-vouchers/${voucher.id}/print`)}
                                        className="h-7 w-7 text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50"
                                        title="معاينة وطباعة سند القبض"
                                      >
                                        <Eye className="h-3.5 w-3.5" />
                                      </Button>

                                      {/* أزرار الاعتماد والرفض وإلغاء الاعتماد مخصصة حصرياً للمسؤول المالي faaa8@gmail.com */}
                                      {isFaaa8User && (
                                        voucher.status === "approved" ? (
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => {
                                              const reason = prompt("يرجى إدخال مبررات إلغاء الاعتماد لتتمكن من التعديل (إجباري):");
                                              if (reason && reason.trim().length > 0) {
                                                revokeVoucherApprovalMutation.mutate({ id: voucher.id, revocationReason: reason.trim() });
                                              } else if (reason !== null) {
                                                toast.error("مبررات إلغاء الاعتماد مطلوبة إلزامياً");
                                              }
                                            }}
                                            disabled={revokeVoucherApprovalMutation.isPending}
                                            className="h-7 px-2 text-[11px] font-bold text-amber-700 hover:text-amber-900 hover:bg-amber-100/70 border border-amber-300 rounded-md gap-1"
                                            title="إلغاء الاعتماد لإتاحة التعديل"
                                          >
                                            <RotateCcw className="h-3.5 w-3.5" />
                                            إلغاء الاعتماد
                                          </Button>
                                        ) : (
                                          <>
                                            <Button
                                              variant="ghost"
                                              size="sm"
                                              onClick={() => {
                                                approveVoucherMutation.mutate({ id: voucher.id });
                                              }}
                                              disabled={approveVoucherMutation.isPending}
                                              className="h-7 px-2 text-[11px] font-bold text-emerald-700 hover:text-emerald-900 hover:bg-emerald-100/70 border border-emerald-200 rounded-md gap-1"
                                              title="اعتماد سند القبض"
                                            >
                                              <CheckCircle className="h-3.5 w-3.5" />
                                              اعتماد
                                            </Button>
                                            <Button
                                              variant="ghost"
                                              size="sm"
                                              onClick={() => {
                                                const reason = prompt("يرجى إدخال سبب الرفض (اختياري):");
                                                if (reason !== null) {
                                                  rejectVoucherMutation.mutate({ id: voucher.id, rejectionReason: reason });
                                                }
                                              }}
                                              disabled={rejectVoucherMutation.isPending}
                                              className="h-7 px-2 text-[11px] font-bold text-rose-700 hover:text-rose-900 hover:bg-rose-100/70 border border-rose-200 rounded-md gap-1"
                                              title="رفض سند القبض"
                                            >
                                              <XCircle className="h-3.5 w-3.5" />
                                              رفض
                                            </Button>
                                          </>
                                        )
                                      )}

                                      {/* أزرار التعديل والحذف تظهر فقط إذا لم يكن السند معتمداً */}
                                      {voucher.status !== "approved" && (
                                        <>
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => openEditVoucherModal(voucher)}
                                            className="h-7 w-7 text-blue-600 hover:text-blue-800 hover:bg-blue-50"
                                            title="تعديل سند القبض"
                                          >
                                            <Edit3 className="h-3.5 w-3.5" />
                                          </Button>
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => handleDeleteVoucher(voucher.id)}
                                            className="h-7 w-7 text-red-600 hover:text-red-800 hover:bg-red-50"
                                            title="حذف سند القبض"
                                          >
                                            <Trash2 className="h-3.5 w-3.5" />
                                          </Button>
                                        </>
                                      )}
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
                );
              })}

              {/* Unassigned vouchers if any */}
              {(() => {
                const unassigned = receiptVouchers.filter(v => {
                  const pName = (v.payerName || "").trim().toLowerCase();
                  return !supportSources.some(src => {
                    const sName = (src.entity === "اخرى" ? src.customEntity : src.entity) || "";
                    return sName.trim().toLowerCase() === pName || (src.entity !== "اخرى" && src.entity.trim().toLowerCase() === pName);
                  });
                });

                if (unassigned.length === 0) return null;

                return (
                  <Card className="border border-slate-200 bg-slate-50/30 overflow-hidden shadow-2xs">
                    <CardHeader className="bg-slate-100/60 pb-3 border-b py-3 px-4 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="bg-slate-200 text-slate-800 font-bold text-xs">
                          سندات قبض أخرى / غير مصنفة
                        </Badge>
                        <span className="text-xs text-muted-foreground">({unassigned.length} سندات)</span>
                      </div>
                    </CardHeader>
                    <CardContent className="p-3">
                      <div className="border rounded-md overflow-x-auto bg-white">
                        <Table dir="rtl">
                          <TableHeader className="bg-slate-50/80">
                            <TableRow>
                              <TableHead className="text-right text-xs">اسم القابض / الداعم</TableHead>
                              <TableHead className="text-right text-xs">رقم السند</TableHead>
                              <TableHead className="text-right text-xs">تاريخ القبض</TableHead>
                              <TableHead className="text-right text-xs">المبلغ المقبوض</TableHead>
                              <TableHead className="text-right text-xs">الملاحظات</TableHead>
                              <TableHead className="text-center text-xs">إجراءات</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {unassigned.map((voucher) => (
                              <TableRow key={voucher.id}>
                                <TableCell className="text-xs font-semibold">{voucher.payerName || "-"}</TableCell>
                                <TableCell className="font-bold text-primary text-xs">{voucher.voucherNumber}</TableCell>
                                <TableCell className="text-xs">{voucher.receiptDate ? new Date(voucher.receiptDate).toLocaleDateString("ar-SA") : "-"}</TableCell>
                                <TableCell className="font-bold text-emerald-700 text-xs">{parseFloat(voucher.amount.toString()).toLocaleString("ar-SA", { minimumFractionDigits: 2 })} ريال</TableCell>
                                <TableCell className="text-xs text-muted-foreground">
                                  {voucher.notes ? (
                                    voucher.notes.length > 20 ? (
                                      <div className="flex items-center gap-1">
                                        <span title={voucher.notes}>
                                          {voucher.notes.slice(0, 20)}...
                                        </span>
                                        <Button
                                          type="button"
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => setSelectedNote(voucher.notes)}
                                          className="h-5 w-5 p-0 shrink-0 text-blue-600 hover:text-blue-800 hover:bg-blue-50 inline-flex items-center justify-center"
                                          title="عرض الملاحظة كاملة"
                                        >
                                          <Eye className="h-3.5 w-3.5" />
                                        </Button>
                                      </div>
                                    ) : (
                                      <span>{voucher.notes}</span>
                                    )
                                  ) : (
                                    <span>-</span>
                                  )}
                                </TableCell>
                                <TableCell className="text-center">
                                  <div className="flex items-center justify-center gap-1">
                                     <Button
                                       variant="ghost"
                                       size="icon"
                                       onClick={() => navigate(`/receipt-vouchers/${voucher.id}/print`)}
                                       className="h-7 w-7 text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50"
                                       title="معاينة وطباعة سند القبض"
                                     >
                                       <Eye className="h-3.5 w-3.5" />
                                     </Button>
                                    <Button variant="ghost" size="icon" onClick={() => openEditVoucherModal(voucher)} className="h-7 w-7 text-blue-600">
                                      <Edit3 className="h-3.5 w-3.5" />
                                    </Button>
                                    <Button variant="ghost" size="icon" onClick={() => handleDeleteVoucher(voucher.id)} className="h-7 w-7 text-red-600">
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </Button>
                                  </div>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </CardContent>
                  </Card>
                );
              })()}
            </div>
          )}

        </CardContent>
      </Card>

      {/* Dialog to Add/Edit Receipt Voucher */}
      <Dialog open={isVoucherModalOpen} onOpenChange={setIsVoucherModalOpen}>
        <DialogContent className="dir-rtl text-right max-w-md">
          <DialogHeader className="text-right">
            <DialogTitle className="text-base font-bold flex items-center gap-2 text-right">
              <Receipt className="h-5 w-5 text-primary" />
              {editingVoucherId ? "تعديل سند القبض" : "تسجيل سند قبض جديد"}
            </DialogTitle>
            <DialogDescription className="text-xs text-right mt-1">
              أدخل تفاصيل الدفعة المقبوضة فعلياً من الجهة الداعمة
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs text-right">
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
              <Label className="text-xs font-semibold">اختيار الداعم / القابض منه *</Label>
              <Select 
                value={voucherPayerName} 
                onValueChange={(val) => {
                  setVoucherPayerName(val);
                  if (val !== "اخرى") setCustomVoucherPayerName("");
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="اختر الداعم" />
                </SelectTrigger>
                <SelectContent>
                  {supportSources
                    .filter((src) => {
                      const name = src.entity === "اخرى" ? src.customEntity : src.entity;
                      if (editingVoucherId && name === voucherPayerName) return true;
                      return !isGeneralAccountName(name);
                    })
                    .map((src, idx) => {
                      const name = src.entity === "اخرى" ? src.customEntity : src.entity;
                      return name ? (
                        <SelectItem key={idx} value={name}>
                          {name}
                        </SelectItem>
                      ) : null;
                    })}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-800 dark:text-slate-200">وذلك مقابل (سبب المقبوض / الغرض) *</Label>
              <Textarea
                value={voucherNotes}
                onChange={(e) => setVoucherNotes(e.target.value)}
                placeholder="أدخل سبب القبض أو الغرض (مثال: تأمين احتياجات جامع ابن حمران بالمنسك)..."
                rows={2}
                required
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

      {/* Dialog for Full Note View */}
      <Dialog open={!!selectedNote} onOpenChange={(open) => !open && setSelectedNote(null)}>
        <DialogContent className="dir-rtl text-right max-w-sm">
          <DialogHeader className="text-right">
            <DialogTitle className="text-sm font-bold flex items-center gap-2 text-primary">
              <FileText className="h-4 w-4 text-primary" />
              الملاحظة الكاملة لسند القبض
            </DialogTitle>
          </DialogHeader>
          <div className="p-3.5 bg-slate-50 rounded-lg border text-xs text-slate-800 leading-relaxed font-medium whitespace-pre-wrap">
            {selectedNote}
          </div>
          <DialogFooter className="justify-start">
            <Button type="button" variant="outline" size="sm" onClick={() => setSelectedNote(null)} className="text-xs font-bold">
              إغلاق
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
