import { useState, useEffect, useMemo } from "react";
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
  ArrowRightLeft,
  FileCheck,
  ShieldAlert,
  Layers,
  PenLine,
} from "lucide-react";
import { usePermission } from "@/hooks/usePermission";
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

  // Categories for Funding / Support (التمويل / الدعم) from /categories
  const { data: fundingSupportData } = trpc.categories.getCategoryByType.useQuery({ type: "funding_support" });
  const fundingSupportCategoryList: string[] = useMemo(() => {
    return (fundingSupportData?.values || []).map((v: any) => v.valueAr || v.value).filter(Boolean);
  }, [fundingSupportData]);

  // Categories for Donation Purposes (مصارف التبرعات) from /categories
  const { data: donationPurposesData } = trpc.categories.getCategoryByType.useQuery({ type: "donation_purposes" });
  const donationPurposes: string[] = useMemo(() => {
    return (donationPurposesData?.values || []).map((v: any) => v.valueAr || v.value).filter(Boolean);
  }, [donationPurposesData]);

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



const getCleanJustificationText = (text?: string | null): string => {
  if (!text) return "لا يوجد مبرر مسجل";
  let cleaned = text.trim();
  const prefixes = [
    "مبررات إلغاء الاعتماد:",
    "سبب الرفض:",
    "تم إلغاء الاعتماد:",
  ];
  for (const prefix of prefixes) {
    if (cleaned.startsWith(prefix)) {
      cleaned = cleaned.substring(prefix.length).trim();
    }
  }
  return cleaned || "لا يوجد مبرر مسجل";
};

const isGeneralAccountName = (name?: string | null) => {
  if (!name) return false;
  const norm = normalizeArabicText(name);
  return norm.includes("الحساب العام") || norm.includes("حساب عام");
};

const getCleanVoucherNotes = (notes?: string | null): string => {
  if (!notes) return "-";
  let clean = notes.trim();

  if (clean.includes(" | تم إلغاء الاعتماد:") || clean.includes(" | مبررات إلغاء الاعتماد:") || clean.includes(" | مرفوض")) {
    clean = clean.split(/\s*\|\s*(?:تم إلغاء الاعتماد|مبررات إلغاء الاعتماد|مرفوض):/)[0].trim();
  }

  if (clean.startsWith("تم إلغاء الاعتماد:") || clean.startsWith("مبررات إلغاء الاعتماد:") || clean.startsWith("مرفوض")) {
    return "-";
  }

  if (clean.startsWith("مصرف التبرع:") && clean.includes(" | ")) {
    const parts = clean.split(" | ");
    const userNote = parts.slice(1).join(" | ").trim();
    if (userNote) {
      return userNote;
    }
  }

  return clean || "-";
};


  // Form States for Financial & Support Details
  const [approvedQuotationId, setApprovedQuotationId] = useState<number | null>(null);
  const [supportEntity, setSupportEntity] = useState<string>("");
  const [customSupportEntity, setCustomSupportEntity] = useState<string>("");
  const { user } = useAuth();
  const isFaaa8User = user?.email === "solayani@manarah.org.sa";
  const hasExceptionApprove = usePermission("receipt_vouchers.exception_approve");

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
  const [voucherHonorificTitle, setVoucherHonorificTitle] = useState<string>("السادة");
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
      setActionModal(prev => ({ ...prev, isOpen: false }));
      refetch();
    },
    onError: (err) => {
      toast.error(err.message || "حدث خطأ أثناء رفض السند");
    },
  });

  const revokeVoucherApprovalMutation = trpc.projects.revokeReceiptVoucherApproval.useMutation({
    onSuccess: () => {
      toast.success("تم إلغاء اعتماد سند القبض ويمكن تعديله الآن");
      setActionModal(prev => ({ ...prev, isOpen: false }));
      refetch();
    },
    onError: (err) => {
      toast.error(err.message || "حدث خطأ أثناء إلغاء الاعتماد");
    },
  });

  const exceptionApproveVoucherMutation = trpc.projects.exceptionApproveReceiptVoucher.useMutation({
    onSuccess: (data) => {
      toast.success(data?.message || "تم اعتماد سند القبض بالاستثناء بنجاح");
      setActionModal(prev => ({ ...prev, isOpen: false }));
      setActionReason("");
      setActionError("");
      refetch();
      utils.projects.getAllReceiptVouchers.invalidate();
      utils.projects.getReceiptVoucherById.invalidate();
      utils.projects.getFinancialData.invalidate();
    },
    onError: (err) => {
      toast.error(err.message || "حدث خطأ أثناء اعتماد السند بالاستثناء");
    },
  });

  // Modal State for Revoking Approval & Rejection & Exception
  const [actionModal, setActionModal] = useState<{
    isOpen: boolean;
    type: "revoke" | "reject" | "exception_approve";
    voucherId: number | null;
    voucherNumber?: string;
  }>({
    isOpen: false,
    type: "revoke",
    voucherId: null,
  });
  // Transfer Surplus Dialog States
  const [isTransferSurplusOpen, setIsTransferSurplusOpen] = useState<boolean>(false);
  const [transferType, setTransferType] = useState<"restricted" | "unrestricted">("restricted");
  const [transferHonorificTitle, setTransferHonorificTitle] = useState<string>("السادة");
  const [transferPayerSelect, setTransferPayerSelect] = useState<string>("__custom__");
  const [transferCustomPayer, setTransferCustomPayer] = useState<string>("");
  const [transferPayerName, setTransferPayerName] = useState<string>("");
  const [transferPurpose, setTransferPurpose] = useState<string>("");
  const [transferAmount, setTransferAmount] = useState<string>("");
  const [transferDate, setTransferDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [transferBankName, setTransferBankName] = useState<string>("مصرف الراجحي");
  const [transferNotes, setTransferNotes] = useState<string>("");

  const transferSurplusMutation = trpc.projects.transferProjectSurplusToReceiptVoucher.useMutation({
    onSuccess: () => {
      toast.success("تم تحويل الفائض بنجاح إلى سند قبض جديد يظهر في صفحة سندات القبض");
      setIsTransferSurplusOpen(false);
      refetch();
      utils.projects.getAllReceiptVouchers.invalidate();
      utils.projects.getFinancialData.invalidate();
      utils.projects.getById.invalidate();
    },
    onError: (err) => {
      toast.error(err.message || "حدث خطأ أثناء تحويل الفائض");
    },
  });

  const [actionReason, setActionReason] = useState<string>("");
  const [actionError, setActionError] = useState<string>("");
  const [justificationModalNote, setJustificationModalNote] = useState<string | null>(null);

  const handleOpenRevokeModal = (voucher: { id: number; voucherNumber: string }) => {
    setActionModal({
      isOpen: true,
      type: "revoke",
      voucherId: voucher.id,
      voucherNumber: voucher.voucherNumber,
    });
    setActionReason("");
    setActionError("");
  };

  const handleOpenRejectModal = (voucher: { id: number; voucherNumber: string }) => {
    setActionModal({
      isOpen: true,
      type: "reject",
      voucherId: voucher.id,
      voucherNumber: voucher.voucherNumber,
    });
    setActionReason("");
    setActionError("");
  };

  const handleOpenExceptionModal = (voucher: { id: number; voucherNumber: string }) => {
    setActionModal({
      isOpen: true,
      type: "exception_approve",
      voucherId: voucher.id,
      voucherNumber: voucher.voucherNumber,
    });
    setActionReason("");
    setActionError("");
  };

  const handleConfirmAction = () => {
    if (!actionReason.trim()) {
      setActionError(
        actionModal.type === "revoke"
          ? "يرجى إدخال مبررات إلغاء الاعتماد أولاً"
          : actionModal.type === "exception_approve"
          ? "يرجى إدخال سبب ومبررات استثناء الاعتماد أولاً"
          : "يرجى إدخال سبب الرفض أولاً"
      );
      return;
    }

    if (actionModal.type === "exception_approve" && actionModal.voucherId) {
      exceptionApproveVoucherMutation.mutate({
        id: actionModal.voucherId,
        reason: actionReason.trim(),
      });
    } else if (actionModal.type === "revoke" && actionModal.voucherId) {
      revokeVoucherApprovalMutation.mutate({
        id: actionModal.voucherId,
        revocationReason: actionReason.trim(),
      });
    } else if (actionModal.type === "reject" && actionModal.voucherId) {
      rejectVoucherMutation.mutate({
        id: actionModal.voucherId,
        rejectionReason: actionReason.trim(),
      });
    }
  };

  // Populate state when data arrives
  useEffect(() => {
    const contract = (data as any)?.contract || null;
    const contractAdminPct = contract?.managementPercentage ? parseFloat(contract.managementPercentage.toString()) : 0;
    const contractAmount = contract?.contractAmount ? parseFloat(contract.contractAmount.toString()) : 0;

    if (data?.financialDetail) {
      setApprovedQuotationId(data.financialDetail.approvedQuotationId || data.approvedQuotation?.id || null);
      setSupportEntity(data.financialDetail.supportEntity || "");
      setCustomSupportEntity(data.financialDetail.customSupportEntity || "");
      setSupportAmount(parseFloat(data.financialDetail.supportAmount || "0"));
      setAdminFeeType((data.financialDetail.adminFeeType as any) || "percentage");
      const savedFeeVal = parseFloat(data.financialDetail.adminFeeValue || "0");
      setAdminFeeValue(savedFeeVal > 0 ? savedFeeVal : (contractAdminPct > 0 ? contractAdminPct : 0));
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
      } else if (contract?.supportingEntity) {
        try {
          const parsedContractSources = JSON.parse(contract.supportingEntity);
          if (Array.isArray(parsedContractSources) && parsedContractSources.length > 0) {
            setSupportSources(parsedContractSources);
          }
        } catch (e) {
          // fallback
        }
      } else {
        setSupportSources([]);
      }
    } else {
      if (data?.approvedQuotation) {
        setApprovedQuotationId(data.approvedQuotation.id);
      }
      if (contractAdminPct > 0) {
        setAdminFeeType("percentage");
        setAdminFeeValue(contractAdminPct);
      }
      if (contract?.supportingEntity) {
        try {
          const parsedContractSources = JSON.parse(contract.supportingEntity);
          if (Array.isArray(parsedContractSources) && parsedContractSources.length > 0) {
            setSupportSources(parsedContractSources);
          }
        } catch (e) {
          if (typeof contract.supportingEntity === "string" && contract.supportingEntity.trim()) {
            setSupportSources([{
              entity: contract.supportingEntity,
              amount: parseFloat(contract.supportedAmount?.toString() || "0") || contractAmount,
            }]);
          }
        }
      }
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
  const contract = (data as any)?.contract || null;
  const contractAdminPct = contract?.managementPercentage ? parseFloat(contract.managementPercentage.toString()) : 0;
  const contractAmount = contract?.contractAmount ? parseFloat(contract.contractAmount.toString()) : 0;

  // Base supplier amount: total agreed value (from contract if available, otherwise from approved quotation)
  const supplierBaseAmount = contractAmount > 0 
    ? contractAmount 
    : (approvedQuotation 
        ? parseFloat((approvedQuotation.approvedAmount || approvedQuotation.negotiatedAmount || approvedQuotation.finalAmount || approvedQuotation.totalAmount || "0").toString())
        : 0);

  // Admin fee percentage: priority from contract, or from financialDetail / user state
  const effectiveAdminPct = contractAdminPct > 0 
    ? contractAdminPct 
    : (adminFeeType === "percentage" ? (adminFeeValue || 0) : (supplierBaseAmount > 0 ? ((adminFeeValue || 0) / supplierBaseAmount) * 100 : 0));

  // Calculated admin fee amount (حصة الجمعية المستقطعة من قيمة العقد)
  const calculatedAdminFeeAmount = contractAdminPct > 0
    ? (supplierBaseAmount * contractAdminPct) / 100
    : (adminFeeType === "percentage"
        ? (supplierBaseAmount * (adminFeeValue || 0)) / 100
        : (adminFeeValue || 0));

  // صافي حصة المورد بعد استقطاع حصة الجمعية (لا تنجمع مع قيمة المورد بل تستقطع منها)
  const supplierNetShare = Math.max(0, supplierBaseAmount - calculatedAdminFeeAmount);
  // إجمالي التكلفة الكلية للمشروع يطابق دائماً القيمة المتفق عليها
  const totalRequiredCost = supplierBaseAmount;

  const currentSupportAmount = validSupportSources.reduce((sum, s) => sum + (s.amount || 0), 0) || supportAmount || 0;
  const coverageDifference = currentSupportAmount - totalRequiredCost;
  const isFullyCovered = coverageDifference >= -0.01;

  // Receipts Calculations
  const receiptVouchers = data?.receiptVouchers || [];
  const validReceiptVouchers = receiptVouchers.filter((v: any) => v.status === "approved");
  const vouchersTotalReceived = validReceiptVouchers.reduce((sum, v) => sum + parseFloat((v as any).amount || "0"), 0);

  const generalAccountReceivedAmount = validSupportSources
    .filter(s => {
      const name = s.entity === "اخرى" ? s.customEntity : s.entity;
      return isGeneralAccountName(name);
    })
    .reduce((sum, s) => sum + (s.amount || 0), 0);

  const totalReceivedAmount = vouchersTotalReceived + generalAccountReceivedAmount;
  const targetRequiredAmount = totalRequiredCost > 0 ? totalRequiredCost : currentSupportAmount;
  const remainingSupportToCollect = Math.max(0, targetRequiredAmount - totalReceivedAmount);
  const surplusAmount = targetRequiredAmount > 0 ? Math.max(0, totalReceivedAmount - targetRequiredAmount) : 0;
  const collectionRawPct = targetRequiredAmount > 0 ? (totalReceivedAmount / targetRequiredAmount) * 100 : 0;
  const collectionPercentage = collectionRawPct > 0 && collectionRawPct < 1
    ? parseFloat(collectionRawPct.toFixed(2))
    : Math.min(100, Math.round(collectionRawPct));

  // Financial breakdown and surplus per supporter
  const supportersFinancials = useMemo(() => {
    const totalCommittedSupport = validSupportSources.reduce((sum, s) => sum + (s.amount || 0), 0);

    // 1. First pass: compute received amount and target required share for each supporter
    const rawBreakdown = validSupportSources.map((source) => {
      const sName = source.entity === "اخرى" ? (source.customEntity || "جهة أخرى") : (source.entity || "داعم غير محدد");
      const committedAmt = source.amount || 0;
      const isGenAcc = isGeneralAccountName(sName);
      
      const normSName = normalizeArabicText(sName);
      const normEntity = normalizeArabicText(source.entity);
      const normCustom = normalizeArabicText(source.customEntity);

      const sVouchers = receiptVouchers.filter((v: any) => {
        const normPayer = normalizeArabicText(v.payerName);
        if (!normPayer) return false;
        return (
          normPayer === normSName ||
          normPayer === normEntity ||
          (normCustom && normPayer === normCustom) ||
          (normSName && (normPayer.includes(normSName) || normSName.includes(normPayer)))
        );
      });

      const validSVouchers = sVouchers.filter((v: any) => v.status === "approved");
      const receivedAmt = isGenAcc ? committedAmt : validSVouchers.reduce((sum, v) => sum + parseFloat(v.amount?.toString() || "0"), 0);

      // What is this supporter's assigned share of the project required cost?
      let requiredShare = 0;
      if (validSupportSources.length === 1) {
        requiredShare = targetRequiredAmount;
      } else if (totalCommittedSupport > 0) {
        requiredShare = (targetRequiredAmount * committedAmt) / totalCommittedSupport;
      } else if (totalReceivedAmount > 0) {
        requiredShare = (targetRequiredAmount * receivedAmt) / totalReceivedAmount;
      } else {
        requiredShare = targetRequiredAmount / (validSupportSources.length || 1);
      }

      const rawSurplus = isGenAcc ? 0 : Math.max(0, receivedAmt - requiredShare);
      const cleanName = sName.replace(/^(السيد|السيدة|السادة)\s*(\/|-)?\s*/, "").trim();

      return {
        name: sName,
        cleanName,
        committedAmount: committedAmt,
        receivedAmount: receivedAmt,
        requiredShare,
        rawSurplus,
        isGeneralAccount: isGenAcc,
        vouchersCount: validSVouchers.length,
      };
    });

    // 2. Second pass: distribute project surplusAmount accurately
    const totalRawSurplus = rawBreakdown.reduce((sum, s) => sum + s.rawSurplus, 0);

    return rawBreakdown.map((s) => {
      let finalSurplus = 0;
      if (surplusAmount > 0) {
        if (rawBreakdown.length === 1) {
          finalSurplus = surplusAmount;
        } else if (totalRawSurplus > 0) {
          finalSurplus = (surplusAmount * s.rawSurplus) / totalRawSurplus;
        } else if (totalReceivedAmount > 0 && !s.isGeneralAccount) {
          finalSurplus = (surplusAmount * s.receivedAmount) / totalReceivedAmount;
        }
      }
      
      const remainingAmt = s.isGeneralAccount ? 0 : Math.max(0, s.requiredShare - s.receivedAmount);

      return {
        ...s,
        surplusAmount: finalSurplus > 0 ? parseFloat(finalSurplus.toFixed(2)) : 0,
        remainingAmount: remainingAmt > 0 ? parseFloat(remainingAmt.toFixed(2)) : 0,
      };
    });
  }, [validSupportSources, receiptVouchers, targetRequiredAmount, totalReceivedAmount, surplusAmount]);

  // Supporters who actually have a surplus
  const supportersWithSurplus = useMemo(() => {
    return supportersFinancials.filter(s => s.surplusAmount > 0);
  }, [supportersFinancials]);

  // List of distinct supporters registered for this project
  const projectRegisteredSupporters: string[] = useMemo(() => {
    const list: string[] = [];
    validSupportSources.forEach((src) => {
      let name = src.entity === "اخرى" ? src.customEntity : src.entity;
      if (name && name.trim()) {
        name = name.replace(/^(السيد|السيدة|السادة)\s*(\/|-)?\s*/, "").trim();
        const isGenAcc = isGeneralAccountName(name);
        if (name && !isGenAcc && !list.includes(name)) {
          list.push(name);
        }
      }
    });

    // Fallback if validSupportSources is empty but supportEntity or donorName exists
    if (list.length === 0 && (data as any)?.financialDetail?.supportEntity) {
      let clean = ((data as any).financialDetail.supportEntity || "").replace(/^(السيد|السيدة|السادة)\s*(\/|-)?\s*/, "").trim();
      if (clean && !isGeneralAccountName(clean) && !list.includes(clean)) {
        list.push(clean);
      }
    }
    if (list.length === 0 && (data as any)?.project?.donorName) {
      let clean = ((data as any).project.donorName || "").replace(/^(السيد|السيدة|السادة)\s*(\/|-)?\s*/, "").trim();
      if (clean && !isGeneralAccountName(clean) && !list.includes(clean)) {
        list.push(clean);
      }
    }
    return list;
  }, [validSupportSources, data]);

  // Selected supporter details inside modal
  const selectedSupporterInfo = useMemo(() => {
    const cleanSelect = (transferPayerSelect || transferPayerName).replace(/^(السيد|السيدة|السادة)\s*(\/|-)?\s*/, "").trim();
    return supportersFinancials.find(s => s.cleanName === cleanSelect || normalizeArabicText(s.name) === normalizeArabicText(cleanSelect));
  }, [supportersFinancials, transferPayerSelect, transferPayerName]);

  // Effective max surplus for the selected supporter (or project surplus fallback)
  const activeSupporterMaxSurplus = selectedSupporterInfo && selectedSupporterInfo.surplusAmount > 0
    ? selectedSupporterInfo.surplusAmount
    : (supportersWithSurplus.length > 0 ? supportersWithSurplus[0].surplusAmount : surplusAmount);

  const openTransferSurplusModal = (targetSupporterName?: string) => {
    const defaultSupporter = targetSupporterName || (supportersWithSurplus.length > 0 ? supportersWithSurplus[0].cleanName : (projectRegisteredSupporters[0] || ""));
    let cleanPayer = defaultSupporter.trim();
    let detectedHonorific = "السادة";

    if (!cleanPayer) {
      const rawPayer = validSupportSources[0]?.entity === "اخرى" ? validSupportSources[0]?.customEntity : validSupportSources[0]?.entity;
      cleanPayer = (rawPayer || (data as any)?.project?.donorName || "").trim();
    }

    if (cleanPayer.startsWith("السادة")) {
      detectedHonorific = "السادة";
      cleanPayer = cleanPayer.replace(/^السادة\s*(\/|-)?\s*/, "").trim();
    } else if (cleanPayer.startsWith("السيد")) {
      detectedHonorific = "السيد";
      cleanPayer = cleanPayer.replace(/^السيد\s*(\/|-)?\s*/, "").trim();
    } else if (cleanPayer.startsWith("السيدة")) {
      detectedHonorific = "السيدة";
      cleanPayer = cleanPayer.replace(/^السيدة\s*(\/|-)?\s*/, "").trim();
    }

    setTransferHonorificTitle(detectedHonorific);
    setTransferPayerSelect(cleanPayer);
    setTransferCustomPayer("");
    setTransferPayerName(cleanPayer);

    const supInfo = supportersFinancials.find(s => s.cleanName === cleanPayer || normalizeArabicText(s.name) === normalizeArabicText(cleanPayer));
    const targetSurplus = supInfo && supInfo.surplusAmount > 0 ? supInfo.surplusAmount : surplusAmount;

    setTransferType("restricted");
    if (donationPurposes.length > 0) {
      setTransferPurpose(donationPurposes[0]);
    } else {
      setTransferPurpose("");
    }
    setTransferAmount(targetSurplus > 0 ? targetSurplus.toString() : "");
    setTransferDate(new Date().toISOString().split("T")[0]);
    setTransferBankName("مصرف الراجحي");
    setTransferNotes(`تم تحويله من فائض مقبوضات المشروع ${(data as any)?.project?.projectNumber || `#${projectId}`}`);
    setIsTransferSurplusOpen(true);
  };

  const handleConfirmTransferSurplus = () => {
    const amt = parseFloat(transferAmount);
    if (!transferAmount || isNaN(amt) || amt <= 0) {
      toast.error("يرجى إدخال مبلغ تحويل صحيح أكبر من صفر");
      return;
    }
    if (amt > activeSupporterMaxSurplus + 0.01) {
      toast.error(`المبلغ المطلوب تحويله (${amt.toLocaleString()} ريال) يتجاوز مبلغ الفائض المتاح لهذا الداعم (${activeSupporterMaxSurplus.toLocaleString()} ريال)`);
      return;
    }
    if (!transferDate) {
      toast.error("يرجى تحديد تاريخ القبض");
      return;
    }

    const currentPayer = (transferPayerSelect || transferPayerName).trim();
    if (!currentPayer) {
      toast.error("يرجى تحديد اسم الجهة الداعمة / المسدد");
      return;
    }

    if (transferType === "restricted" && !transferPurpose.trim()) {
      toast.error("يرجى اختيار أو تحديد مصرف التبرع المقيد");
      return;
    }

    if (!transferNotes.trim()) {
      toast.error("يرجى إدخال البيان أو سبب القبض");
      return;
    }

    const fullPayerName = transferHonorificTitle ? `${transferHonorificTitle} / ${currentPayer}` : currentPayer;

    transferSurplusMutation.mutate({
      projectId,
      targetType: transferType,
      donationPurpose: transferType === "restricted" ? transferPurpose.trim() : undefined,
      amount: amt,
      receiptDate: transferDate,
      payerName: fullPayerName,
      paymentMethod: "bank_transfer",
      referenceNumber: "",
      bankName: transferBankName.trim() || "مصرف الراجحي",
      notes: transferNotes.trim(),
    });
  };

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
    setVoucherHonorificTitle("السادة");
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
    setVoucherBankName("مصرف الراجحي");
    setVoucherAttachmentUrl("");
    setVoucherNotes((data as any)?.project?.name || "");
    setIsVoucherModalOpen(true);
  };

  const openEditVoucherModal = (voucher: any) => {
    setEditingVoucherId(voucher.id);
    setVoucherAmount(voucher.amount.toString());
    setVoucherDate(voucher.receiptDate ? new Date(voucher.receiptDate).toISOString().split("T")[0] : new Date().toISOString().split("T")[0]);
    
    let rawPayer = voucher.payerName || "";
    if (rawPayer.startsWith("السيد / ")) {
      setVoucherHonorificTitle("السيد");
      rawPayer = rawPayer.replace("السيد / ", "");
    } else if (rawPayer.startsWith("السيدة / ")) {
      setVoucherHonorificTitle("السيدة");
      rawPayer = rawPayer.replace("السيدة / ", "");
    } else if (rawPayer.startsWith("السادة / ")) {
      setVoucherHonorificTitle("السادة");
      rawPayer = rawPayer.replace("السادة / ", "");
    } else {
      setVoucherHonorificTitle("السادة");
    }

    const matchedSource = supportSources.find(s => {
      const name = s.entity === "اخرى" ? s.customEntity : s.entity;
      return (name || "").trim().toLowerCase() === rawPayer.trim().toLowerCase();
    });
    if (matchedSource) {
      const name = matchedSource.entity === "اخرى" ? matchedSource.customEntity : matchedSource.entity;
      setVoucherPayerName(name || "");
      setCustomVoucherPayerName("");
    } else {
      setVoucherPayerName("اخرى");
      setCustomVoucherPayerName(rawPayer);
    }
    setVoucherPaymentMethod(voucher.paymentMethod || "bank_transfer");
    setVoucherRefNumber(voucher.referenceNumber || "");
    setVoucherBankName(voucher.bankName || "مصرف الراجحي");
    setVoucherAttachmentUrl(voucher.attachmentUrl || "");
    const cleanNote = getCleanVoucherNotes(voucher.notes);
    setVoucherNotes(cleanNote && cleanNote !== "-" ? cleanNote : (voucher.notes && voucher.notes !== "-" ? voucher.notes : ((data as any)?.project?.name || "")));
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
    const cleanPayer = voucherPayerName === "اخرى" ? customVoucherPayerName.trim() : voucherPayerName.trim();
    if (!cleanPayer) {
      toast.error("يرجى اختيار الجهة الداعمة / القابض منه");
      return;
    }

    let finalPayerName = cleanPayer;
    if (!cleanPayer.startsWith("السيد /") && !cleanPayer.startsWith("السيدة /") && !cleanPayer.startsWith("السادة /")) {
      finalPayerName = `${voucherHonorificTitle} / ${cleanPayer}`;
    }

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
                  ? "إجمالي مبلغ الدعم المقدم من الجهة كافٍ لتغطية التكلفة الكلية للمشروع (شاملة حصة المورد والأجور الإدارية للجمعية)."
                  : `تنبيه: يوجد عجز مالي بمقدار (${Math.abs(coverageDifference).toLocaleString("en-US", { minimumFractionDigits: 2 })} ريال). مبلغ الدعم المقدم لا يكفي لتغطية التكلفة الكلية للمشروع.`
                }
              </p>
            </div>

            {/* Visual Formula summary */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-white/80 p-3 rounded-lg border text-xs shadow-xs w-full md:w-auto">
              <div className="text-center p-2 border-r last:border-r-0">
                <span className="text-muted-foreground block">مبلغ المورد (الصافي)</span>
                <span className="font-bold text-gray-900 text-sm mt-0.5 inline-block font-sans">
                  {supplierNetShare.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="text-center p-2 border-r last:border-r-0">
                <span className="text-muted-foreground block">الأجور الإدارية (الجمعية)</span>
                <span className="font-bold text-orange-700 text-sm mt-0.5 inline-block font-sans">
                  {calculatedAdminFeeAmount.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="text-center p-2 border-r last:border-r-0 bg-slate-50 rounded-sm">
                <span className="text-muted-foreground block">= إجمالي التكلفة الكلية</span>
                <span className="font-bold text-primary text-sm mt-0.5 inline-block font-sans">
                  {totalRequiredCost.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="text-center p-2">
                <span className="text-muted-foreground block">مبلغ الدعم المقدم</span>
                <span className={`font-bold text-sm mt-0.5 inline-block font-sans ${isFullyCovered ? "text-green-700" : "text-red-600"}`}>
                  {currentSupportAmount.toLocaleString("en-US", { minimumFractionDigits: 2 })}
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
                      {approvedQuotation.createdAt ? new Date(approvedQuotation.createdAt).toLocaleDateString("en-CA") : "-"}
                    </span>
                  </div>
                  <div className="p-3 bg-emerald-50/60 border border-emerald-200 rounded-lg col-span-2 flex justify-between items-center">
                    <div>
                      <span className="text-emerald-800 block text-xs font-medium">المبلغ المعتمد المتفق عليه مع المورد:</span>
                      <span className="font-bold text-emerald-900 text-base mt-0.5 block">
                        {supplierBaseAmount.toLocaleString("en-US", { minimumFractionDigits: 2 })} ريال
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
                      {currentSupportAmount.toLocaleString("en-US", { minimumFractionDigits: 2 })} ريال
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
                        {calculatedAdminFeeAmount.toLocaleString("en-US", { minimumFractionDigits: 2 })} ريال
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
                              {(source.amount || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })} ريال
                            </span>
                          </div>
                        );
                      })
                    )}
                  </div>

                  <div className="flex items-center justify-between border-t border-gray-200 pt-2 font-bold">
                    <span className="text-muted-foreground">إجمالي الدعم المقدم:</span>
                    <span className="font-black text-green-700 text-sm">
                      {currentSupportAmount.toLocaleString("en-US", { minimumFractionDigits: 2 })} ريال
                    </span>
                  </div>
                </div>

                <div className="p-3 bg-amber-50/60 rounded-lg border border-amber-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-amber-900 font-medium">بند الأجور الإدارية (الجمعية):</span>
                    <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-300 font-sans">
                      {effectiveAdminPct > 0 ? `${effectiveAdminPct}% نسبة مئوية مستقطعة` : (adminFeeType === "percentage" ? `${adminFeeValue}% نسبة مستقطعة` : "مبلغ ثابت")}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between border-t border-amber-200 pt-2">
                    <span className="text-muted-foreground">قيمة الأجور الإدارية (حصة الجمعية):</span>
                    <span className="font-bold text-orange-700 text-sm font-sans">
                      {calculatedAdminFeeAmount.toLocaleString("en-US", { minimumFractionDigits: 2 })} ريال
                    </span>
                  </div>
                  <div className="flex items-center justify-between border-t border-amber-200/60 pt-2 text-[11px]">
                    <span className="text-muted-foreground">صافي حصة المورد بعد الاستقطاع:</span>
                    <span className="font-bold text-slate-800 font-sans">
                      {supplierNetShare.toLocaleString("en-US", { minimumFractionDigits: 2 })} ريال
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

          {/* تنبيه الفائض المالي مع زر التحويل المباشر */}
          {surplusAmount > 0 && (
            <div className="p-4 rounded-xl bg-gradient-to-r from-indigo-50 via-sky-50/40 to-slate-50 border border-indigo-200/90 text-indigo-950 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-2xs">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-700 text-white flex items-center justify-center shrink-0 shadow-xs">
                  <Sparkles className="w-5 h-5 text-indigo-200" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-black text-sm text-indigo-950">
                      يوجد فائض في المقبوضات بمقدار ({surplusAmount.toLocaleString("en-US", { minimumFractionDigits: 2 })} ريال)
                    </h4>
                    <Badge className="bg-indigo-700 text-white text-[10px] font-bold">فائض قابل للتحويل</Badge>
                  </div>
                  <p className="text-xs text-indigo-900/80 mt-1 leading-relaxed">
                    إجمالي سندات القبض المعتمدة يتجاوز تكلفة المشروع المقررة. يمكنك تحويل هذا الفائض إلى سند قبض مستقل (مقيد لمصرف آخر أو غير مقيد) ليظهر في صفحة سندات القبض العامة.
                  </p>
                </div>
              </div>
              <Button
                onClick={() => openTransferSurplusModal()}
                className="bg-indigo-700 hover:bg-indigo-800 text-white font-bold text-xs h-9 px-4 rounded-xl shadow-xs shrink-0 flex items-center gap-1.5"
              >
                <ArrowRightLeft className="w-4 h-4" />
                <span>تحويل الفائض إلى سند قبض</span>
              </Button>
            </div>
          )}

          {/* Cards metrics for Collection */}
          <div className={`grid gap-4 ${surplusAmount > 0 ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4" : "grid-cols-1 sm:grid-cols-3"}`}>
            <div className="p-4 bg-blue-50/60 rounded-xl border border-blue-100 text-right">
              <span className="text-xs text-muted-foreground block">إجمالي مبلغ الدعم المطلوب</span>
              <span className="text-lg font-bold text-blue-900 mt-1 block font-sans">
                {targetRequiredAmount.toLocaleString("en-US", { minimumFractionDigits: 2 })} ريال
              </span>
            </div>

            <div className="p-4 bg-emerald-50/60 rounded-xl border border-emerald-100 text-right">
              <span className="text-xs text-muted-foreground block">إجمالي المقبوض فعلياً (سندات القبض)</span>
              <span className="text-lg font-bold text-emerald-900 mt-1 block font-sans">
                {totalReceivedAmount.toLocaleString("en-US", { minimumFractionDigits: 2 })} ريال
              </span>
            </div>

            <div className="p-4 bg-amber-50/60 rounded-xl border border-amber-100 text-right">
              <span className="text-xs text-muted-foreground block">المبلغ المتبقي للقبض</span>
              <span className="text-lg font-bold text-amber-900 mt-1 block font-sans">
                {remainingSupportToCollect.toLocaleString("en-US", { minimumFractionDigits: 2 })} ريال
              </span>
            </div>

            {surplusAmount > 0 && (
              <div className="p-4 bg-indigo-50/80 rounded-xl border border-indigo-200 text-right relative overflow-hidden">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-indigo-900 font-bold block">فائض المقبوضات</span>
                  <Badge className="bg-indigo-700 text-white text-[9px] font-bold px-1.5 py-0.2">فائض</Badge>
                </div>
                <span className="text-lg font-black text-indigo-950 mt-1 block font-sans">
                  {surplusAmount.toLocaleString("en-US", { minimumFractionDigits: 2 })} ريال
                </span>
                {supportersWithSurplus.length > 0 && (
                  <p className="text-[11px] text-indigo-800 font-semibold mt-1">
                    الفائض ناتج من: {supportersWithSurplus.map(s => `${s.name} (${s.surplusAmount.toLocaleString("en-US", { minimumFractionDigits: 2 })} ريال)`).join("، ")}
                  </p>
                )}
                <Button
                  variant="link"
                  size="sm"
                  onClick={() => openTransferSurplusModal()}
                  className="p-0 h-auto text-[11px] text-indigo-700 hover:text-indigo-900 font-bold mt-1.5 flex items-center gap-1 cursor-pointer"
                >
                  <ArrowRightLeft className="w-3 h-3" />
                  <span>تحويل الفائض الآن</span>
                </Button>
              </div>
            )}
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

                  const validSVouchers = sVouchers.filter(v => v.status === "approved");
                  const receivedAmt = isGenAcc ? targetAmt : validSVouchers.reduce((sum, v) => sum + parseFloat(v.amount.toString() || "0"), 0);
                  const remainingAmt = isGenAcc ? 0 : Math.max(0, targetAmt - receivedAmt);
                  const sSurplusAmt = isGenAcc ? 0 : Math.max(0, receivedAmt - targetAmt);
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
                            {receivedAmt.toLocaleString("en-US", { minimumFractionDigits: 2 })} <span className="text-[10px]">ريال</span>
                          </span>
                        </div>

                        <div className="bg-amber-50/80 p-2 rounded-lg border border-amber-100/90 text-right">
                          <span className="text-[10px] text-amber-800 block font-semibold">المبلغ المتبقي للقبض</span>
                          <span className="text-sm font-bold text-amber-950 block mt-0.5">
                            {remainingAmt.toLocaleString("en-US", { minimumFractionDigits: 2 })} <span className="text-[10px]">ريال</span>
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-slate-500 pt-0.5">
                        <span>إجمالي الدعم المقرر:</span>
                        <span className="font-bold text-slate-800">{targetAmt.toLocaleString("en-US")} ريال</span>
                      </div>

                      {sSurplusAmt > 0 && (
                        <div className="p-2 bg-indigo-50/90 rounded-lg border border-indigo-200 flex items-center justify-between text-xs mt-1">
                          <span className="text-indigo-900 font-bold text-[11px]">
                            فائض للداعم: {sSurplusAmt.toLocaleString("en-US", { minimumFractionDigits: 2 })} ريال
                          </span>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() => openTransferSurplusModal(sName)}
                            className="h-6 px-2 text-[10px] font-bold text-indigo-700 hover:bg-indigo-100 hover:text-indigo-900 flex items-center gap-1 cursor-pointer"
                          >
                            <ArrowRightLeft className="w-3 h-3" />
                            <span>تحويل الفائض</span>
                          </Button>
                        </div>
                      )}

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

                const validSVouchers = sVouchers.filter(v => v.status === "approved");
                const receivedAmt = isGenAcc ? targetAmt : validSVouchers.reduce((sum, v) => sum + parseFloat(v.amount.toString() || "0"), 0);
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
                        <span className="text-gray-600">المطلوب: <span className="font-bold text-blue-900">{targetAmt.toLocaleString("en-US", { minimumFractionDigits: 2 })} ريال</span></span>
                        <div className="text-emerald-700">
                          المقبوض: <span className="font-bold text-emerald-800">{receivedAmt.toLocaleString("en-US", { minimumFractionDigits: 2 })} ريال</span>
                        </div>
                        <div className="text-amber-700">
                          المتبقي: <span className="font-bold text-amber-800">{remainingAmt.toLocaleString("en-US", { minimumFractionDigits: 2 })} ريال</span>
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
                                <TableHead className="text-right text-xs">وذلك مقابل</TableHead>
                                <TableHead className="text-center text-xs">الحالة</TableHead>
                                <TableHead className="text-center text-xs">إجراءات</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {sVouchers.map((voucher) => (
                                <TableRow 
                                  key={voucher.id} 
                                  className={
                                    voucher.status === "approval_revoked"
                                      ? "bg-amber-50/40 hover:bg-amber-50/60"
                                      : voucher.status === "rejected"
                                      ? "bg-rose-50/30 hover:bg-rose-50/50"
                                      : "hover:bg-slate-50/60"
                                  }
                                >
                                   <TableCell className="font-bold text-xs font-sans">
                                     {voucher.status === "approved" ? (
                                       <span className="text-primary">{voucher.voucherNumber}</span>
                                     ) : (
                                       <span className="text-primary">{voucher.voucherNumber}</span>
                                     )}
                                   </TableCell>
                                  <TableCell className="text-xs">
                                    {voucher.receiptDate ? new Date(voucher.receiptDate).toLocaleDateString("en-CA") : "-"}
                                  </TableCell>
                                  <TableCell className={`font-bold text-xs ${
                                    voucher.status === "approval_revoked" || voucher.status === "rejected"
                                      ? "text-slate-400 line-through"
                                      : "text-emerald-700"
                                  }`}>
                                    {parseFloat(voucher.amount.toString()).toLocaleString("en-US", { minimumFractionDigits: 2 })} ريال
                                    {voucher.status === "approval_revoked" && (
                                      <span className="text-[10px] text-amber-700 font-normal mr-1 block">(ملغى الاعتماد - غير محتسب)</span>
                                    )}
                                  </TableCell>
                                  <TableCell className="text-xs text-muted-foreground font-medium max-w-[250px] truncate" title={getCleanVoucherNotes(voucher.notes)}>
                                     {getCleanVoucherNotes(voucher.notes)}
                                   </TableCell>
                                  <TableCell className="text-center text-xs">
                                    {voucher.status === "approved" ? (
                                      <Badge variant="outline" className="bg-emerald-50 text-emerald-800 border-emerald-300 font-bold text-[10px] px-2 py-0.5">
                                        معتمد
                                      </Badge>
                                    ) : voucher.status === "approval_revoked" ? (
                                      <Badge variant="outline" className="bg-amber-50 text-amber-900 border-amber-300 font-bold text-[10px] px-2 py-0.5 gap-1 inline-flex items-center">
                                        <RotateCcw className="h-3 w-3 text-amber-600" />
                                        ملغى الاعتماد
                                      </Badge>
                                    ) : voucher.status === "rejected" ? (
                                      <Badge variant="outline" className="bg-rose-50 text-rose-800 border-rose-300 font-bold text-[10px] px-2 py-0.5">
                                        مرفوض
                                      </Badge>
                                    ) : (
                                      <Badge variant="outline" className="bg-blue-50 text-blue-800 border-blue-300 font-bold text-[10px] px-2 py-0.5">
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

                                      {/* زر لعرض مبررات إلغاء الاعتماد أو سبب الرفض إن وجدت */}
                                      {((voucher as any).rejectionReason || (voucher.notes && (voucher.notes.includes("إلغاء الاعتماد") || voucher.notes.includes("مرفوض")))) && (
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => setJustificationModalNote((voucher as any).rejectionReason || voucher.notes || "لا يوجد مبرر مسجل")}
                                          className="h-7 px-2 text-[10px] font-bold text-amber-800 hover:text-amber-950 hover:bg-amber-100/80 border border-amber-300 rounded-md gap-1"
                                          title="عرض مبررات إلغاء الاعتماد / السبب"
                                        >
                                          <Info className="h-3.5 w-3.5 text-amber-700" />
                                          المبررات
                                        </Button>
                                      )}

                                       {/* زر إلغاء الاعتماد */}
                                       {(isFaaa8User || hasExceptionApprove) && voucher.status === "approved" && (
                                         <Button
                                           variant="ghost"
                                           size="sm"
                                           onClick={() => handleOpenRevokeModal(voucher)}
                                           disabled={revokeVoucherApprovalMutation.isPending}
                                           className="h-7 px-2 text-[11px] font-bold text-amber-700 hover:text-amber-900 hover:bg-amber-100/70 border border-amber-300 rounded-md gap-1"
                                           title="إلغاء الاعتماد لإتاحة التعديل"
                                         >
                                           <RotateCcw className="h-3.5 w-3.5" />
                                           <span>إلغاء الاعتماد</span>
                                         </Button>
                                       )}

                                       {/* زر الاعتماد العادي للمسؤول المالي */}
                                       {isFaaa8User && voucher.status === "pending_approval" && (
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
                                           <span>اعتماد</span>
                                         </Button>
                                       )}

                                       {/* زر استثناء الاعتماد لمن يملك صلاحية استثناء اعتماد السند */}
                                       {hasExceptionApprove && voucher.status === "pending_approval" && (
                                         <Button
                                           variant="ghost"
                                           size="sm"
                                           onClick={() => handleOpenExceptionModal(voucher)}
                                           disabled={exceptionApproveVoucherMutation.isPending}
                                           className="h-7 px-2 text-[11px] font-bold text-amber-800 hover:text-amber-950 hover:bg-amber-100/80 border border-amber-300 rounded-md gap-1"
                                           title="استثناء اعتماد سند القبض مع ذكر السبب"
                                         >
                                           <ShieldAlert className="h-3.5 w-3.5 text-amber-600" />
                                           <span>استثناء الاعتماد</span>
                                         </Button>
                                       )}

                                       {/* زر الرفض للمسؤول المالي أو صاحب صلاحية استثناء الاعتماد */}
                                       {(isFaaa8User || hasExceptionApprove) && voucher.status === "pending_approval" && (
                                         <Button
                                           variant="ghost"
                                           size="sm"
                                           onClick={() => handleOpenRejectModal(voucher)}
                                           disabled={rejectVoucherMutation.isPending}
                                           className="h-7 px-2 text-[11px] font-bold text-rose-700 hover:text-rose-900 hover:bg-rose-100/70 border border-rose-200 rounded-md gap-1"
                                           title="رفض سند القبض"
                                         >
                                           <XCircle className="h-3.5 w-3.5" />
                                           <span>رفض</span>
                                         </Button>
                                       )}

                                      {/* زر التعديل يظهر فقط إذا لم يكن السند معتمداً */}
                                      {voucher.status !== "approved" && (
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => openEditVoucherModal(voucher)}
                                            className="h-7 w-7 text-blue-600 hover:text-blue-800 hover:bg-blue-50"
                                            title="تعديل سند القبض"
                                          >
                                            <Edit3 className="h-3.5 w-3.5" />
                                          </Button>
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
                              <TableHead className="text-right text-xs">وذلك مقابل</TableHead>
                              <TableHead className="text-center text-xs">إجراءات</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {unassigned.map((voucher) => (
                              <TableRow key={voucher.id}>
                                <TableCell className="text-xs font-semibold">{voucher.payerName || "-"}</TableCell>
                                <TableCell className="font-bold text-primary text-xs">{voucher.voucherNumber}</TableCell>
                                <TableCell className="text-xs">{voucher.receiptDate ? new Date(voucher.receiptDate).toLocaleDateString("en-CA") : "-"}</TableCell>
                                <TableCell className="font-bold text-emerald-700 text-xs">{parseFloat(voucher.amount.toString()).toLocaleString("en-US", { minimumFractionDigits: 2 })} ريال</TableCell>
                                <TableCell className="text-xs text-muted-foreground font-medium max-w-[250px] truncate" title={getCleanVoucherNotes(voucher.notes)}>
                                     {getCleanVoucherNotes(voucher.notes)}
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

                                    {/* زر إلغاء الاعتماد */}
                                    {(isFaaa8User || hasExceptionApprove) && voucher.status === "approved" && (
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleOpenRevokeModal(voucher)}
                                        disabled={revokeVoucherApprovalMutation.isPending}
                                        className="h-7 px-2 text-[11px] font-bold text-amber-700 hover:text-amber-900 hover:bg-amber-100/70 border border-amber-300 rounded-md gap-1"
                                        title="إلغاء الاعتماد لإتاحة التعديل"
                                      >
                                        <RotateCcw className="h-3.5 w-3.5" />
                                        <span>إلغاء الاعتماد</span>
                                      </Button>
                                    )}

                                    {/* زر الاعتماد العادي للمسؤول المالي */}
                                    {isFaaa8User && voucher.status === "pending_approval" && (
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
                                        <span>اعتماد</span>
                                      </Button>
                                    )}

                                    {/* زر استثناء الاعتماد لمن يملك صلاحية استثناء اعتماد السند */}
                                    {hasExceptionApprove && voucher.status === "pending_approval" && (
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleOpenExceptionModal(voucher)}
                                        disabled={exceptionApproveVoucherMutation.isPending}
                                        className="h-7 px-2 text-[11px] font-bold text-amber-800 hover:text-amber-950 hover:bg-amber-100/80 border border-amber-300 rounded-md gap-1"
                                        title="استثناء اعتماد سند القبض مع ذكر السبب"
                                      >
                                        <ShieldAlert className="h-3.5 w-3.5 text-amber-600" />
                                        <span>استثناء الاعتماد</span>
                                      </Button>
                                    )}

                                    {/* زر الرفض للمسؤول المالي أو صاحب صلاحية استثناء الاعتماد */}
                                    {(isFaaa8User || hasExceptionApprove) && voucher.status === "pending_approval" && (
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleOpenRejectModal(voucher)}
                                        disabled={rejectVoucherMutation.isPending}
                                        className="h-7 px-2 text-[11px] font-bold text-rose-700 hover:text-rose-900 hover:bg-rose-100/70 border border-rose-200 rounded-md gap-1"
                                        title="رفض سند القبض"
                                      >
                                        <XCircle className="h-3.5 w-3.5" />
                                        <span>رفض</span>
                                      </Button>
                                    )}

                                    {voucher.status !== "approved" && (
                                      <Button variant="ghost" size="icon" onClick={() => openEditVoucherModal(voucher)} className="h-7 w-7 text-blue-600">
                                        <Edit3 className="h-3.5 w-3.5" />
                                      </Button>
                                    )}
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
        <DialogContent className="dir-rtl text-right max-w-2xl sm:max-w-3xl w-[92vw] max-h-[90vh] overflow-y-auto">
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

            <div className="grid grid-cols-3 gap-2">
              <div className="col-span-1 space-y-1.5">
                <Label className="text-xs font-bold text-slate-800">اللقب / الصفة *</Label>
                <Select value={voucherHonorificTitle} onValueChange={setVoucherHonorificTitle}>
                  <SelectTrigger className="h-10 text-xs bg-white">
                    <SelectValue placeholder="اللقب..." />
                  </SelectTrigger>
                  <SelectContent dir="rtl">
                    <SelectItem value="السادة">السادة</SelectItem>
                    <SelectItem value="السيد">السيد</SelectItem>
                    <SelectItem value="السيدة">السيدة</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="col-span-2 space-y-1.5">
                <Label className="text-xs font-bold text-slate-800">الجهة الداعمة / المسدد *</Label>
                <Select 
                  value={voucherPayerName} 
                  onValueChange={(val) => {
                    setVoucherPayerName(val);
                    if (val !== "اخرى") setCustomVoucherPayerName("");
                  }}
                >
                  <SelectTrigger className="h-10 text-xs bg-white">
                    <SelectValue placeholder="اختر الداعم..." />
                  </SelectTrigger>
                  <SelectContent dir="rtl">
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

            {/* تفاصيل طريقة القبض والحساب البنكي - خانة واحدة سطرية */}
            <div className="space-y-1.5 pt-2 border-t border-slate-100">
              <Label className="text-xs font-bold text-slate-800 dark:text-slate-200">تفاصيل طريقة القبض والحساب البنكي</Label>
              <Input
                type="text"
                value={voucherBankName}
                onChange={(e) => setVoucherBankName(e.target.value)}
                placeholder="مثال: مصرف الراجحي"
                className="h-10 text-xs bg-white border-slate-200 font-medium"
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

      {/* Pop-up Dialog for Revoking Approval or Rejecting Receipt Voucher */}
      <Dialog open={actionModal.isOpen} onOpenChange={(open) => setActionModal(prev => ({ ...prev, isOpen: open }))}>
        <DialogContent className="dir-rtl text-right max-w-md bg-white rounded-xl shadow-xl border border-slate-200">
          <DialogHeader className="text-right border-b pb-3">
            <DialogTitle className="text-base font-bold flex items-center gap-2 text-slate-800 text-right">
              {actionModal.type === "exception_approve" ? (
                <>
                  <ShieldAlert className="h-5 w-5 text-amber-600" />
                  <span>استثناء اعتماد سند القبض</span>
                </>
              ) : actionModal.type === "revoke" ? (
                <>
                  <RotateCcw className="h-5 w-5 text-amber-600" />
                  <span>إلغاء اعتماد سند القبض</span>
                </>
              ) : (
                <>
                  <XCircle className="h-5 w-5 text-rose-600" />
                  <span>رفض سند القبض</span>
                </>
              )}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500 mt-1 text-right">
              {actionModal.type === "exception_approve"
                ? `أنت على وشك اعتماد سند القبض (${actionModal.voucherNumber || ""}) استثنائياً. سيتم تسجيل توقيعك واسمك على السند مع توثيق مبررات الاستثناء.`
                : actionModal.type === "revoke"
                ? `عند إلغاء اعتماد السند (${actionModal.voucherNumber || ""})، سيتم سحب التوقيع المالي من التقرير الرسمي وإعادة إتاحة خياري التعديل والحذف.`
                : `عند رفض السند (${actionModal.voucherNumber || ""})، سيتم تسجيل حالة الرفض وحفظ السبب.`}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700">
                {actionModal.type === "exception_approve"
                  ? "مبررات وسبب الاستثناء *"
                  : actionModal.type === "revoke"
                  ? "مبررات إلغاء الاعتماد *"
                  : "سبب الرفض *"}
              </Label>
              <Textarea
                value={actionReason}
                onChange={(e) => {
                  setActionReason(e.target.value);
                  if (actionError) setActionError("");
                }}
                placeholder={
                  actionModal.type === "exception_approve"
                    ? "أدخل مبررات وسبب استثناء اعتماد سند القبض بالتفصيل..."
                    : actionModal.type === "revoke"
                    ? "أدخل مبررات إلغاء الاعتماد بالتفصيل..."
                    : "أدخل سبب رفض سند القبض..."
                }
                rows={3}
                className="text-xs border-slate-300 focus:border-amber-500 focus:ring-amber-500 rounded-lg"
              />
              {actionError && (
                <p className="text-[11px] font-bold text-rose-600 flex items-center gap-1 mt-1">
                  <AlertTriangle className="h-3 w-3" />
                  {actionError}
                </p>
              )}
            </div>
          </div>

          <DialogFooter className="flex items-center justify-end gap-2 border-t pt-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setActionModal(prev => ({ ...prev, isOpen: false }))}
              className="text-xs font-medium border-slate-300"
            >
              إلغاء
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleConfirmAction}
              disabled={exceptionApproveVoucherMutation.isPending || revokeVoucherApprovalMutation.isPending || rejectVoucherMutation.isPending}
              className={`text-xs font-bold px-4 gap-1.5 ${
                actionModal.type === "exception_approve" || actionModal.type === "revoke"
                  ? "bg-amber-600 hover:bg-amber-700 text-white"
                  : "bg-rose-600 hover:bg-rose-700 text-white"
              }`}
            >
              {(exceptionApproveVoucherMutation.isPending || revokeVoucherApprovalMutation.isPending || rejectVoucherMutation.isPending) && (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              )}
              {actionModal.type === "exception_approve"
                ? "تأكيد استثناء الاعتماد"
                : actionModal.type === "revoke"
                ? "تأكيد إلغاء الاعتماد"
                : "تأكيد الرفض"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog for Viewing Revocation / Rejection Justification */}
      <Dialog open={!!justificationModalNote} onOpenChange={(open) => !open && setJustificationModalNote(null)}>
        <DialogContent className="dir-rtl text-right max-w-md bg-white rounded-xl shadow-xl border border-amber-200">
          <DialogHeader className="text-right border-b pb-3">
            <DialogTitle className="text-base font-bold flex items-center gap-2 text-amber-900 text-right">
              <Info className="h-5 w-5 text-amber-600" />
              <span>تفاصيل ومبررات القرار</span>
            </DialogTitle>
          </DialogHeader>
          <div className="p-4 bg-amber-50/60 rounded-lg border border-amber-200/80 text-xs text-amber-950 leading-relaxed font-semibold whitespace-pre-wrap mt-2">
            {getCleanJustificationText(justificationModalNote)}
          </div>
          <DialogFooter className="justify-start border-t pt-3">
            <Button type="button" variant="outline" size="sm" onClick={() => setJustificationModalNote(null)} className="text-xs font-bold border-amber-300">
              إغلاق
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog for Transferring Project Surplus */}
      <Dialog open={isTransferSurplusOpen} onOpenChange={setIsTransferSurplusOpen}>
        <DialogContent className="dir-rtl text-right max-w-3xl sm:max-w-3xl w-[94vw] max-h-[90vh] overflow-y-auto bg-white rounded-2xl shadow-2xl border border-indigo-200/90 p-6">
          <DialogHeader className="text-right border-b border-slate-100 pb-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-700 flex items-center justify-center shrink-0 shadow-xs">
                  <ArrowRightLeft className="w-5 h-5 text-indigo-700" />
                </div>
                <div>
                  <DialogTitle className="text-lg font-bold text-slate-900">
                    تحويل فائض المقبوضات إلى سند قبض
                  </DialogTitle>
                  <DialogDescription className="text-xs text-slate-500 mt-0.5">
                    تحويل الفائض المالي المحصل من الداعم إلى سند قبض مقيد أو غير مقيد
                  </DialogDescription>
                </div>
              </div>
              <Badge className="bg-indigo-50 text-indigo-800 border border-indigo-300 text-xs font-black px-3 py-1 self-start sm:self-center">
                فائض الداعم المتاح للتحويل: {activeSupporterMaxSurplus.toLocaleString("en-US", { minimumFractionDigits: 2 })} ريال
              </Badge>
            </div>
          </DialogHeader>

          <div className="space-y-4 py-3 text-xs">
            {/* بطاقة توضيح مصادر الفائض في المشروع والداعمين أصحاب الفائض */}
            {surplusAmount > 0 && (
              <div className="p-3.5 bg-indigo-50/80 rounded-xl border border-indigo-200 text-xs space-y-2.5 animate-in fade-in duration-200">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-indigo-100/80 pb-2">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-indigo-600 text-white shrink-0 shadow-2xs">
                      <Sparkles className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="font-black text-xs text-indigo-950 block">
                        {supportersWithSurplus.length > 1
                          ? `مصادر الفائض في المشروع (${supportersWithSurplus.length} داعمين)`
                          : `مصدر الفائض في المشروع: ${supportersWithSurplus[0]?.name || "الداعم المسجل"}`}
                      </span>
                      <span className="text-[11px] text-indigo-800/80">
                        {supportersWithSurplus.length > 1
                          ? "يوجد مبالغ فائضة متحققة من أكثر من داعم، انقر على الداعم المراد تحويل فائضه:"
                          : "تم تحديد الداعم صاحب الفائض المسدد للمشروع تلقائياً ويصدر السند باسمه:"}
                      </span>
                    </div>
                  </div>
                  <Badge className="bg-indigo-700 text-white text-xs font-black px-2.5 py-0.5 self-start sm:self-center">
                    إجمالي الفائض: {surplusAmount.toLocaleString("en-US", { minimumFractionDigits: 2 })} ريال
                  </Badge>
                </div>

                {/* عرض كروت الفائض لكل داعم في حال وجود داعم أو أكثر */}
                <div className={`grid gap-2 pt-0.5 ${supportersWithSurplus.length > 1 ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1"}`}>
                  {supportersWithSurplus.map((sup, idx) => {
                    const isSelected = transferPayerSelect === sup.cleanName || normalizeArabicText(transferPayerName) === normalizeArabicText(sup.name);
                    return (
                      <div
                        key={idx}
                        onClick={() => {
                          setTransferPayerSelect(sup.cleanName);
                          setTransferPayerName(sup.cleanName);
                          setTransferAmount(sup.surplusAmount.toString());
                        }}
                        className={`p-3 rounded-xl border text-right transition-all cursor-pointer flex flex-col justify-between ${
                          isSelected
                            ? "bg-white border-indigo-600 ring-2 ring-indigo-600/20 shadow-xs"
                            : "bg-white/60 border-indigo-100 hover:bg-white hover:border-indigo-300"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <Building2 className="w-3.5 h-3.5 text-indigo-700 shrink-0" />
                            <span className="font-bold text-xs text-slate-900 truncate">{sup.name}</span>
                          </div>
                          <Badge className="bg-emerald-600 text-white text-[10px] font-bold px-2 py-0.5 shrink-0">
                            فائض: {sup.surplusAmount.toLocaleString("en-US", { minimumFractionDigits: 2 })} ريال
                          </Badge>
                        </div>
                        
                        <div className="grid grid-cols-3 gap-2 text-[10px] text-slate-600 mt-2.5 pt-2 border-t border-slate-100">
                          <div>
                            <span className="text-slate-400 block text-[9px]">المقرر التزامه:</span>
                            <span className="font-bold text-slate-800">{sup.committedAmount.toLocaleString("en-US")} ريال</span>
                          </div>
                          <div>
                            <span className="text-slate-400 block text-[9px]">المسدد فعلياً:</span>
                            <span className="font-bold text-emerald-700">{sup.receivedAmount.toLocaleString("en-US")} ريال</span>
                          </div>
                          <div>
                            <span className="text-slate-400 block text-[9px]">الحصة التكليفية:</span>
                            <span className="font-bold text-indigo-900">{sup.requiredShare.toLocaleString("en-US", { minimumFractionDigits: 2 })} ريال</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* اختيار نوع السند */}
            <div className="space-y-2">
              <Label className="text-xs font-bold text-slate-800">نوع سند القبض المحول إليه *</Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setTransferType("restricted")}
                  className={`p-3.5 rounded-xl border text-right transition-all cursor-pointer flex items-center gap-3 ${
                    transferType === "restricted"
                      ? "bg-indigo-50/80 border-indigo-600 ring-2 ring-indigo-600/20 text-indigo-950 shadow-xs"
                      : "bg-slate-50/70 border-slate-200 hover:bg-slate-100 text-slate-700"
                  }`}
                >
                  <div className={`p-2.5 rounded-lg shrink-0 ${transferType === "restricted" ? "bg-indigo-700 text-white" : "bg-slate-200 text-slate-700"}`}>
                    <FileCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-bold block text-xs text-slate-900">سند قبض مقيد</span>
                    <span className="text-[11px] text-slate-500">مقيد بمصرف تبرع محدد</span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setTransferType("unrestricted")}
                  className={`p-3.5 rounded-xl border text-right transition-all cursor-pointer flex items-center gap-3 ${
                    transferType === "unrestricted"
                      ? "bg-sky-50/80 border-sky-600 ring-2 ring-sky-600/20 text-sky-950 shadow-xs"
                      : "bg-slate-50/70 border-slate-200 hover:bg-slate-100 text-slate-700"
                  }`}
                >
                  <div className={`p-2.5 rounded-lg shrink-0 ${transferType === "unrestricted" ? "bg-sky-700 text-white" : "bg-slate-200 text-slate-700"}`}>
                    <Coins className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-bold block text-xs text-slate-900">سند قبض غير مقيد</span>
                    <span className="text-[11px] text-slate-500">تبرع عام غير مقيد بمشروع</span>
                  </div>
                </button>
              </div>
            </div>

            {/* في حال اختيار مقيد: تحديد المصرف */}
            {transferType === "restricted" && (
              <div className="p-3.5 bg-indigo-50/40 rounded-xl border border-indigo-200/90 space-y-2.5">
                <Label className="text-xs font-bold text-indigo-950 flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-indigo-700" />
                  <span>مصارف التبرعات *</span>
                </Label>
                <Select
                  value={transferPurpose}
                  onValueChange={setTransferPurpose}
                  disabled={donationPurposes.length === 0}
                >
                  <SelectTrigger className="h-10 text-xs bg-white border-indigo-200 focus:ring-indigo-600 text-right w-full" dir="rtl">
                    <SelectValue placeholder={donationPurposes.length > 0 ? "اختر مصرف التبرع..." : "لا توجد مصارف تبرعات مسجلة في التصنيفات"} />
                  </SelectTrigger>
                  <SelectContent dir="rtl" className="max-h-60">
                    {donationPurposes.map((p, idx) => (
                      <SelectItem key={idx} value={p} className="text-right">
                        {p}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* اللقب والجهة الداعمة / المسدد */}
            <div className="space-y-3 border-t border-slate-100 pt-3">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="col-span-1 space-y-1.5 text-right">
                  <Label className="text-xs font-bold text-slate-800">اللقب / الصفة *</Label>
                  <Select value={transferHonorificTitle} onValueChange={setTransferHonorificTitle}>
                    <SelectTrigger className="h-10 text-xs bg-white border-slate-200 focus:ring-indigo-600 text-right" dir="rtl">
                      <SelectValue placeholder="اللقب..." />
                    </SelectTrigger>
                    <SelectContent dir="rtl">
                      <SelectItem value="السادة" className="text-right">السادة</SelectItem>
                      <SelectItem value="السيد" className="text-right">السيد</SelectItem>
                      <SelectItem value="السيدة" className="text-right">السيدة</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="col-span-2 space-y-1.5 text-right">
                  <Label className="text-xs font-bold text-slate-800">الجهة الداعمة / المسدد *</Label>
                  <Select
                    value={transferPayerSelect}
                    onValueChange={(val) => {
                      setTransferPayerSelect(val);
                      setTransferPayerName(val);
                      const sup = supportersFinancials.find(s => s.cleanName === val || normalizeArabicText(s.name) === normalizeArabicText(val));
                      if (sup && sup.surplusAmount > 0) {
                        setTransferAmount(sup.surplusAmount.toString());
                      }
                    }}
                    disabled={projectRegisteredSupporters.length === 0}
                  >
                    <SelectTrigger className="h-10 text-xs bg-white border-slate-200 focus:ring-indigo-600 text-right w-full" dir="rtl">
                      <SelectValue placeholder={projectRegisteredSupporters.length > 0 ? "اختر الداعم المسجل للمشروع..." : "لا يوجد داعمين مسجلين للمشروع"} />
                    </SelectTrigger>
                    <SelectContent dir="rtl" className="max-h-60">
                      {projectRegisteredSupporters.map((sup, idx) => {
                        const supInfo = supportersFinancials.find(s => s.cleanName === sup || normalizeArabicText(s.name) === normalizeArabicText(sup));
                        const hasSurplus = supInfo && supInfo.surplusAmount > 0;
                        return (
                          <SelectItem key={idx} value={sup} className="text-right">
                            <span className="font-medium">{sup}</span>
                            {hasSurplus && (
                              <span className="text-emerald-700 font-bold mr-2 text-[10px]">
                                (فائض متاح: {supInfo.surplusAmount.toLocaleString("en-US", { minimumFractionDigits: 2 })} ريال)
                              </span>
                            )}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* تفاصيل سند القبض: المبلغ والتاريخ */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 border-t border-slate-100 pt-3">
              {/* مبلغ الدفعة المقبوضة */}
              <div className="space-y-1.5 text-right">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-bold text-slate-800">مبلغ الدفعة المقبوضة (ريال) *</Label>
                  {activeSupporterMaxSurplus > 0 && (
                    <button
                      type="button"
                      onClick={() => setTransferAmount(activeSupporterMaxSurplus.toString())}
                      className="text-[11px] font-bold text-indigo-700 hover:underline cursor-pointer"
                    >
                      تعبئة كامل فائض الداعم ({activeSupporterMaxSurplus.toLocaleString("en-US", { minimumFractionDigits: 2 })} ريال)
                    </button>
                  )}
                </div>
                <Input
                  type="number"
                  min={0.01}
                  max={activeSupporterMaxSurplus}
                  step="0.01"
                  value={transferAmount}
                  onChange={(e) => setTransferAmount(e.target.value)}
                  placeholder="مثال: 50000"
                  className="h-10 text-xs font-bold text-indigo-950 font-sans text-left [direction:ltr] border-slate-200 focus:border-indigo-600"
                />
              </div>

              {/* تاريخ القبض */}
              <div className="space-y-1.5 text-right">
                <Label className="text-xs font-bold text-slate-800">تاريخ القبض *</Label>
                <Input
                  type="date"
                  value={transferDate}
                  onChange={(e) => setTransferDate(e.target.value)}
                  className="h-10 text-xs font-sans border-slate-200 focus:border-indigo-600 text-right"
                />
              </div>
            </div>

            {/* البيان والملاحظات */}
            <div className="space-y-1.5 text-right border-t border-slate-100 pt-3">
              <Label className="text-xs font-bold text-slate-800">وذلك مقابل (سبب المقبوض / البيان) *</Label>
              <Textarea
                value={transferNotes}
                onChange={(e) => setTransferNotes(e.target.value)}
                placeholder={
                  transferType === "restricted"
                    ? (transferPurpose ? `أدخل البيان أو سبب القبض (مثال: تبرع مقيد لمصرف ${transferPurpose}... تم تحويله من فائض مقبوضات المشروع #${projectId})` : "أدخل البيان أو سبب القبض...")
                    : `أدخل البيان أو سبب القبض (مثال: تبرع عام للجمعية / تم تحويله من فائض مقبوضات المشروع #${projectId})`
                }
                rows={3}
                className="text-xs border-slate-200 focus:border-indigo-600 leading-relaxed text-right"
              />
            </div>

            {/* تفاصيل طريقة القبض والحساب البنكي */}
            <div className="space-y-1.5 text-right border-t border-slate-100 pt-3">
              <Label className="text-xs font-bold text-slate-800">تفاصيل طريقة القبض والحساب البنكي</Label>
              <Input
                type="text"
                value={transferBankName}
                onChange={(e) => setTransferBankName(e.target.value)}
                placeholder="مثال: مصرف الراجحي"
                className="h-10 text-xs border-slate-200 focus:border-indigo-600 font-medium text-right"
              />
            </div>
          </div>

          <DialogFooter className="flex items-center justify-end gap-2 border-t border-slate-100 pt-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsTransferSurplusOpen(false)}
              className="text-xs font-medium border-slate-300"
            >
              إلغاء
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleConfirmTransferSurplus}
              disabled={
                transferSurplusMutation.isPending ||
                !transferPayerSelect.trim() ||
                (transferType === "restricted" && !transferPurpose) ||
                !transferAmount ||
                parseFloat(transferAmount) <= 0 ||
                !transferNotes.trim()
              }
              className="bg-indigo-700 hover:bg-indigo-800 text-white font-bold text-xs px-6 h-9 gap-1.5 shadow-xs"
            >
              {transferSurplusMutation.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              <span>تأكيد التحويل وإنشاء سند القبض</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
