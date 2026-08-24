import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { usePermission } from "@/hooks/usePermission";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import {
  Coins,
  Receipt,
  Search,
  Eye,
  CheckCircle,
  CheckCircle2,
  Clock,
  RotateCcw,
  XCircle,
  FolderOpen,
  Loader2,
  Filter,
  Plus,
  FileText,
  Info,
  Edit3,
  Download,
  MoreVertical,
  AlertCircle,
  ShieldAlert,
  Printer,
} from "lucide-react";
import { toast } from "sonner";
import ExcelJS from "exceljs";

export default function ReceiptVouchers() {
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const isFaaa8User = user?.email === "solayani@manarah.org.sa";
  const utils = trpc.useUtils();
  const userPermissions: string[] = (user as any)?.permissions ?? [];
  const isAdmin = ["super_admin", "system_admin"].includes(user?.role || "") || userPermissions.includes("*");
  const canView = isAdmin || userPermissions.includes("receipt_vouchers.view") || userPermissions.includes("receipt_vouchers.edit") || userPermissions.some(p => p.startsWith("receipt_vouchers"));
  const canEdit = userPermissions.includes("receipt_vouchers.edit");
  const hasExceptionApprove = usePermission("receipt_vouchers.exception_approve");

  // الحصول على البارامترات من URL إن وجدت
  const urlParams = new URLSearchParams(window.location.search);
  const initialProjectId = urlParams.get("projectId") || "all";

  const [selectedProjectId, setSelectedProjectId] = useState<string>(initialProjectId);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isExporting, setIsExporting] = useState(false);

  // حالة مودال تسجيل/تعديل سند القبض
  const [isAddVoucherModalOpen, setIsAddVoucherModalOpen] = useState<boolean>(false);
  const [editingVoucherId, setEditingVoucherId] = useState<number | null>(null);
  const [modalProjectId, setModalProjectId] = useState<string>("");
  const [modalHonorificTitle, setModalHonorificTitle] = useState<string>("السادة");
  const [modalAmount, setModalAmount] = useState<string>("");
  const [modalDate, setModalDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [modalPayerName, setModalPayerName] = useState<string>("");
  const [modalNotes, setModalNotes] = useState<string>("");
  const [modalPaymentMethod, setModalPaymentMethod] = useState<string>("bank_transfer");
  const [modalBankName, setModalBankName] = useState<string>("مصرف الراجحي");
  const [modalReferenceNumber, setModalReferenceNumber] = useState<string>("");

  // حالات مودالات المبررات والاعتماد/الرفض
  const [justificationModalNote, setJustificationModalNote] = useState<string | null>(null);
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
  const [actionReason, setActionReason] = useState<string>("");
  const [actionError, setActionError] = useState<string>("");

  // جلب قائمة المشاريع للاختيار من القائمة المنسدلة
  const { data: rawProjectsData } = trpc.projects.getAll.useQuery({
    limit: 200,
  });
  const projectsList: any[] = Array.isArray(rawProjectsData) ? rawProjectsData : (rawProjectsData as any)?.projects || [];

  // تحديث حالة المشروع عند تغير البارامتر بالرابط
  useEffect(() => {
    const pId = urlParams.get("projectId");
    if (pId) {
      setSelectedProjectId(pId);
    }
  }, [window.location.search]);

  // جلب سندات القبض مع الفلترة
  const { data: allVouchers = [], isLoading: isLoadingVouchers, refetch: refetchVouchers } = trpc.projects.getAllReceiptVouchers.useQuery({
    status: statusFilter !== "all" ? statusFilter : undefined,
    search: searchQuery,
  });

  // جلب البيانات المالية للمشروع المختار داخل المودال لمعرفة الداعمين
  const activeModalProjectId = parseInt(modalProjectId) || 0;
  const { data: projectFinancialData } = trpc.projects.getFinancialData.useQuery(
    { projectId: activeModalProjectId },
    { enabled: activeModalProjectId > 0 }
  );

  // استخراج قائمة الداعمين والتفاصيل المالية للمشروع المختار داخل المودال
  const supporterDetailsList: Array<{ name: string; amount: number }> = [];
  const projectSupporters: string[] = [];

  if (projectFinancialData?.financialDetail) {
    if (projectFinancialData.financialDetail.supportSourcesJson) {
      try {
        const parsed = JSON.parse(projectFinancialData.financialDetail.supportSourcesJson);
        if (Array.isArray(parsed)) {
          parsed.forEach((item: any) => {
            let name = item.entity === "اخرى" ? item.customEntity : item.entity;
            if (name && name.trim()) {
              name = name.replace(/^(السيد|السيدة|السادة)\s*\/\s*/, "").trim();
              const isGenAcc = name.includes("الحساب العام");
              const amount = parseFloat((item.amount || "0").toString());
              if (name && !isGenAcc && !projectSupporters.includes(name)) {
                projectSupporters.push(name);
                supporterDetailsList.push({ name, amount });
              }
            }
          });
        }
      } catch (e) {
        // ignore
      }
    }
    if (projectSupporters.length === 0 && projectFinancialData.financialDetail.supportEntity) {
      const cleanEntity = projectFinancialData.financialDetail.supportEntity.replace(/^(السيد|السيدة|السادة)\s*\/\s*/, "").trim();
      const isGenAcc = cleanEntity.includes("الحساب العام");
      const amount = parseFloat((projectFinancialData.financialDetail.supportAmount || "0").toString());
      if (cleanEntity && !isGenAcc) {
        projectSupporters.push(cleanEntity);
        supporterDetailsList.push({ name: cleanEntity, amount });
      }
    }
  }

  // تحديد اسم الداعم المختار (نظيف)
  const selectedSupporterCleanName = modalPayerName.replace(/^(السيد|السيدة|السادة)\s*\/\s*/, "").trim();

  // جلب المبلغ الملتزم به للداعم المختار
  const matchedSupporterItem = supporterDetailsList.find(s => s.name === selectedSupporterCleanName);
  const finDetail = (projectFinancialData as any)?.financialDetail;
  const projectApprovedBudget = parseFloat(((finDetail?.supportAmount || finDetail?.approvedCost || finDetail?.estimatedCost) || "0").toString());
  
  const supporterCommittedAmount = matchedSupporterItem 
    ? matchedSupporterItem.amount 
    : (supporterDetailsList.length === 1 ? supporterDetailsList[0].amount : projectApprovedBudget);

  const projectVouchersList: any[] = (projectFinancialData as any)?.receiptVouchers || (projectFinancialData as any)?.vouchers || [];
  const validProjectVouchers = projectVouchersList.filter((v: any) => v.status === "approved");

  const previouslyPaidBySupporter = validProjectVouchers
    .filter((v: any) => {
      if (!selectedSupporterCleanName) return true;
      const cleanPayerInVoucher = (v.payerName || "").replace(/^(السيد|السيدة|السادة)\s*\/\s*/, "").trim();
      return cleanPayerInVoucher.includes(selectedSupporterCleanName) || selectedSupporterCleanName.includes(cleanPayerInVoucher);
    })
    .reduce((sum: number, v: any) => sum + parseFloat((v.amount || "0").toString()), 0);

  // حساب المتبقي غير المسدد على الداعم
  const remainingUnpaidForSupporter = Math.max(0, supporterCommittedAmount - previouslyPaidBySupporter);

  // تلقائياً: تحديد الداعم الأول عند فتح المودال أو اختيار مشروع يحتوي داعمين مسجلين
  useEffect(() => {
    if (isAddVoucherModalOpen && projectSupporters.length > 0) {
      if (!modalPayerName || !projectSupporters.includes(modalPayerName)) {
        setModalPayerName(projectSupporters[0]);
      }
    }
  }, [modalProjectId, projectSupporters.length, isAddVoucherModalOpen]);

  // الطفرات (Mutations)
  const createVoucherMutation = trpc.projects.createReceiptVoucher.useMutation({
    onSuccess: () => {
      toast.success("تم تسجيل سند القبض بنجاح");
      setIsAddVoucherModalOpen(false);
      resetModalForm();
      refetchVouchers();
      utils.projects.getFinancialData.invalidate();
    },
    onError: (err) => {
      toast.error(err.message || "حدث خطأ أثناء تسجيل سند القبض");
    },
  });

  const updateVoucherMutation = trpc.projects.updateReceiptVoucher.useMutation({
    onSuccess: () => {
      toast.success("تم تحديث سند القبض بنجاح");
      setIsAddVoucherModalOpen(false);
      resetModalForm();
      refetchVouchers();
      utils.projects.getFinancialData.invalidate();
      utils.projects.getReceiptVoucherById.invalidate();
      utils.projects.getAllReceiptVouchers.invalidate();
    },
    onError: (err) => {
      toast.error(err.message || "حدث خطأ أثناء تحديث سند القبض");
    },
  });

  const approveVoucherMutation = trpc.projects.approveReceiptVoucher.useMutation({
    onSuccess: () => {
      toast.success("تم اعتماد سند القبض بنجاح");
      refetchVouchers();
      utils.projects.getFinancialData.invalidate();
    },
    onError: (err) => {
      toast.error(err.message || "حدث خطأ أثناء اعتماد السند");
    },
  });

  const rejectVoucherMutation = trpc.projects.rejectReceiptVoucher.useMutation({
    onSuccess: () => {
      toast.success("تم رفض سند القبض");
      setActionModal(prev => ({ ...prev, isOpen: false }));
      refetchVouchers();
      utils.projects.getFinancialData.invalidate();
    },
    onError: (err) => {
      toast.error(err.message || "حدث خطأ أثناء رفض السند");
    },
  });

  const revokeVoucherApprovalMutation = trpc.projects.revokeReceiptVoucherApproval.useMutation({
    onSuccess: () => {
      toast.success("تم إلغاء اعتماد سند القبض ويمكن تعديله الآن");
      setActionModal(prev => ({ ...prev, isOpen: false }));
      refetchVouchers();
      utils.projects.getFinancialData.invalidate();
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
      refetchVouchers();
      utils.projects.getAllReceiptVouchers.invalidate();
      utils.projects.getReceiptVoucherById.invalidate();
      utils.projects.getFinancialData.invalidate();
    },
    onError: (err) => {
      toast.error(err.message || "حدث خطأ أثناء اعتماد السند بالاستثناء");
    },
  });

  const resetModalForm = () => {
    setEditingVoucherId(null);
    setModalHonorificTitle("السادة");
    setModalAmount("");
    setModalDate(new Date().toISOString().split("T")[0]);
    setModalPayerName("");
    setModalNotes("");
    setModalPaymentMethod("bank_transfer");
    setModalBankName("مصرف الراجحي");
    setModalReferenceNumber("");
  };

  const openAddVoucherModal = () => {
    const initialPrj = selectedProjectId !== "all" ? selectedProjectId : (projectsList[0]?.id.toString() || "");
    setModalProjectId(initialPrj);
    resetModalForm();
    const matchedProject = projectsList.find((p: any) => p.id.toString() === initialPrj);
    if (matchedProject?.name) {
      setModalNotes(matchedProject.name);
    }
    setIsAddVoucherModalOpen(true);
  };

  const stripPayerTitle = (payerName?: string | null) => {
    if (!payerName || !payerName.trim()) return "جهة غير محددة";
    return payerName.replace(/^(السيد|السيدة|السادة)\s*(\/)?\s*/, "").trim() || "جهة غير محددة";
  };

  const openEditVoucherModal = (voucher: any) => {
    setEditingVoucherId(voucher.id);
    setModalProjectId(voucher.projectId ? voucher.projectId.toString() : "");
    setModalAmount(voucher.amount ? voucher.amount.toString() : "");
    setModalDate(voucher.receiptDate ? new Date(voucher.receiptDate).toISOString().split("T")[0] : new Date().toISOString().split("T")[0]);
    
    const rawPayer = voucher.payerName || "";
    if (rawPayer.startsWith("السيد / ") || rawPayer.startsWith("السيد ")) {
      setModalHonorificTitle("السيد");
      setModalPayerName(rawPayer.replace(/^السيد\s*(\/)?\s*/, ""));
    } else if (rawPayer.startsWith("السيدة / ") || rawPayer.startsWith("السيدة ")) {
      setModalHonorificTitle("السيدة");
      setModalPayerName(rawPayer.replace(/^السيدة\s*(\/)?\s*/, ""));
    } else if (rawPayer.startsWith("السادة / ") || rawPayer.startsWith("السادة ")) {
      setModalHonorificTitle("السادة");
      setModalPayerName(rawPayer.replace(/^السادة\s*(\/)?\s*/, ""));
    } else {
      setModalHonorificTitle("السادة");
      setModalPayerName(rawPayer);
    }

    const rawCleanNote = getCleanVoucherNotes(voucher.notes);
    const matchedProject = projectsList.find((p: any) => p.id === voucher.projectId);
    const loadedNote = (rawCleanNote && rawCleanNote !== "-")
      ? rawCleanNote
      : ((voucher.notes && voucher.notes !== "-") ? voucher.notes : (matchedProject?.name || ""));

    setModalNotes(loadedNote);
    setModalPaymentMethod(voucher.paymentMethod || "bank_transfer");
    setModalBankName(voucher.bankName || "مصرف الراجحي");
    setModalReferenceNumber(voucher.referenceNumber || "");
    setIsAddVoucherModalOpen(true);
  };
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

  const handleSaveVoucher = () => {
    const prjId = parseInt(modalProjectId);
    if (!editingVoucherId && (!modalProjectId || isNaN(prjId) || prjId <= 0)) {
      toast.error("يرجى اختيار المشروع أولاً");
      return;
    }
    if (!editingVoucherId && projectSupporters.length === 0) {
      toast.error("يجب تحديد الداعمين ومبلغ الدعم للمشروع أولاً قبل تسجيل سند القبض");
      return;
    }
    const amountNum = parseFloat(modalAmount);
    if (!modalAmount || isNaN(amountNum) || amountNum <= 0) {
      toast.error("يرجى إدخال مبلغ الدفعة المقبوضة بشكل صحيح أكبر من صفر");
      return;
    }
    if (!modalDate || !modalDate.trim()) {
      toast.error("يرجى تحديد تاريخ القبض");
      return;
    }
    const cleanPayer = modalPayerName.trim();
    if (!cleanPayer) {
      toast.error("يرجى اختيار أو إدخال اسم الجهة الداعمة");
      return;
    }

    if (!editingVoucherId && remainingUnpaidForSupporter <= 0 && supporterCommittedAmount > 0) {
      toast.error("عذراً، هذا الداعم قد سدد كامل المبلغ الملتزم به سابقاً ولا يوجد متبقي غير مسدد لتسجيل سند قبض جديد");
      return;
    }

    const cleanPayerWithoutTitle = cleanPayer.replace(/^(السيد|السيدة|السادة)\s*(\/)?\s*/, "").trim();
    const finalPayerName = `${modalHonorificTitle} / ${cleanPayerWithoutTitle}`;

    if (editingVoucherId) {
      updateVoucherMutation.mutate({
        id: editingVoucherId,
        amount: amountNum,
        receiptDate: modalDate,
        payerName: finalPayerName,
        paymentMethod: modalPaymentMethod,
        bankName: modalBankName,
        referenceNumber: modalReferenceNumber,
        notes: modalNotes,
      });
    } else {
      createVoucherMutation.mutate({
        projectId: prjId,
        amount: amountNum,
        receiptDate: modalDate,
        payerName: finalPayerName,
        paymentMethod: modalPaymentMethod,
        bankName: modalBankName,
        referenceNumber: modalReferenceNumber,
        notes: modalNotes,
      });
    }
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

  const handleExportExcel = async () => {
    try {
      setIsExporting(true);
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("سندات القبض", {
        views: [{ showGridLines: true, rightToLeft: true }]
      });

      worksheet.addRow(["رقم السند", "المشروع", "رقم المشروع", "تاريخ الإنشاء", "الجهة الداعمة (المسدد)", "المبلغ المقبوض (ريال)", "الحالة", "البيان / ملاحظات"]);

      allVouchers.forEach((v: any) => {
        const statusText = v.status === "approved" ? "معتمد" :
                           v.status === "approval_revoked" ? "ملغى الاعتماد" :
                           v.status === "rejected" ? "مرفوض" : "قيد الاعتماد";

        const projectOrType = v.projectId 
          ? (v.projectName || `مشروع #${v.projectId}`)
          : v.notes?.startsWith("مصرف التبرع:")
          ? v.notes.split(" | ")[0].replace("مصرف التبرع:", "سند مقيد:").trim()
          : "سند قبض غير مقيد";

        worksheet.addRow([
          v.voucherNumber || "-",
          projectOrType,
          v.projectNumber || "-",
          v.receiptDate ? new Date(v.receiptDate).toLocaleDateString("en-CA") : "-",
          stripPayerTitle(v.payerName),
          Number(v.amount) || 0,
          statusText,
          getCleanVoucherNotes(v.notes),
        ]);
      });

      ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'].forEach(col => {
        worksheet.getColumn(col).width = 25;
      });

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `تقرير_سندات_القبض_${new Intl.DateTimeFormat('en-CA').format(new Date())}.xlsx`;
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success("تم تصدير ملف Excel بنجاح");
    } catch (error) {
      console.error("Failed to export excel:", error);
      toast.error("حدث خطأ أثناء تصدير ملف Excel");
    } finally {
      setIsExporting(false);
    }
  };

  // حساب الإحصائيات
  const totalAmountReceived = allVouchers
    .filter(v => v.status === "approved" || v.status === "pending_approval")
    .reduce((sum, v) => sum + parseFloat((v.amount || "0").toString()), 0);
  const totalApprovedCount = allVouchers.filter(v => v.status === "approved").length;
  const totalPendingCount = allVouchers.filter(v => v.status === "pending_approval").length;
  const totalVouchersCount = allVouchers.length;

  const currentProject = projectsList.find((p: any) => p.id.toString() === selectedProjectId);

  const handleSelectProject = (val: string) => {
    setSelectedProjectId(val);
    const newUrl = val === "all" ? "/receipt-vouchers" : `/receipt-vouchers?projectId=${val}`;
    window.history.replaceState(null, "", newUrl);
  };

  if (!canView) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center min-h-[50vh] text-center p-6 space-y-4 font-sans" dir="rtl">
          <div className="p-4 rounded-full bg-rose-50 text-rose-600 border border-rose-100 dark:bg-rose-950/30 dark:border-rose-900">
            <AlertCircle className="h-10 w-10 text-rose-600" />
          </div>
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200">عذراً، ليس لديك صلاحية لعرض صفحة سندات القبض</h2>
          <p className="text-xs text-muted-foreground max-w-md">يرجى التواصل مع مسؤول النظام لمنحك صلاحية "عرض سندات القبض" أو "تعديل سند القبض".</p>
          <Button onClick={() => navigate("/dashboard")} className="mt-2 bg-[#1a5f4a] hover:bg-[#154d3c] text-white font-bold text-xs">
            العودة للوحة التحكم
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 px-4 md:px-0 font-sans">
        
        {/* 1. هيدر الصفحة الرئيسي وزر الإضافة */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between" dir="rtl">
          <div className="text-right">
            <h1 className="text-2xl font-bold">سندات القبض</h1>
            <p className="text-muted-foreground">إدارة وتوثيق سندات القبض والدفعات المقبوضة فعلياً من الجهات الداعمة للمشاريع</p>
          </div>
          {canEdit && (
            <div className="w-full sm:w-auto flex justify-end">
              <Button 
                onClick={() => navigate("/receipt-vouchers/new")}
                className="w-full sm:w-auto gradient-primary text-white font-bold"
              >
                <Plus className="ml-2 h-4 w-4" />
                تسجيل سند قبض جديد
              </Button>
            </div>
          )}
        </div>

        {/* 2. بطاقات الإحصائيات */}
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
          
          {/* إجمالي المقبوضات */}
          <Card className="border-0 shadow-sm overflow-hidden bg-background hover:shadow-md transition-shadow">
            <CardContent className="p-3 sm:p-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/50 text-emerald-600 dark:text-emerald-400">
                  <Coins className="w-5 h-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-muted-foreground font-semibold">إجمالي المقبوضات</p>
                  <p className="text-lg sm:text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-0.5 truncate leading-none font-sans">
                    {totalAmountReceived.toLocaleString("en-US", { minimumFractionDigits: 2 })} <span className="text-[10px] sm:text-xs font-normal text-muted-foreground">ريال</span>
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* سندات معتمدة */}
          <Card className="border-0 shadow-sm overflow-hidden bg-background hover:shadow-md transition-shadow">
            <CardContent className="p-3 sm:p-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 bg-blue-50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/50 text-blue-600 dark:text-blue-400">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground font-semibold">سندات معتمدة</p>
                  <p className="text-lg sm:text-2xl font-black text-foreground mt-0.5">{totalApprovedCount}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* سندات قيد الاعتماد */}
          <Card className="border-0 shadow-sm overflow-hidden bg-background hover:shadow-md transition-shadow">
            <CardContent className="p-3 sm:p-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 bg-amber-50 dark:bg-amber-950/30 border border-amber-100 dark:border-amber-900/50 text-amber-600 dark:text-amber-400">
                  <Clock className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground font-semibold">سندات قيد الاعتماد</p>
                  <p className="text-lg sm:text-2xl font-black text-foreground mt-0.5">{totalPendingCount}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 3. الفلاتر وشريط البحث */}
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="بحث برقم السند أو اسم المسدد أو المشروع..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pr-10 text-right font-medium"
              dir="rtl"
            />
          </div>

          <div className="flex flex-wrap gap-2 w-full lg:w-auto">
            {/* فلترة الحالة */}
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full lg:w-[180px]">
                <Filter className="ml-2 h-4 w-4" />
                <SelectValue placeholder="الحالة" />
              </SelectTrigger>
              <SelectContent dir="rtl">
                <SelectItem value="all">جميع الحالات</SelectItem>
                <SelectItem value="approved">معتمد</SelectItem>
                <SelectItem value="pending_approval">قيد الاعتماد</SelectItem>
                <SelectItem value="approval_revoked">ملغى الاعتماد</SelectItem>
                <SelectItem value="rejected">مرفوض</SelectItem>
              </SelectContent>
            </Select>

            {/* تصدير إلى إكسل */}
            <Button 
              onClick={handleExportExcel} 
              disabled={isExporting}
              variant="outline"
              className="w-full lg:w-auto h-10 border-[#1a5f4a]/30 text-[#1a5f4a] bg-transparent hover:bg-[#1a5f4a]/5 hover:text-[#1a5f4a] font-bold rounded-lg shrink-0 flex items-center justify-center gap-1.5 transition-colors"
            >
              {isExporting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              <span dir="rtl">تصدير إلى Excel</span>
            </Button>
          </div>
        </div>

        {/* 4. جدول سندات القبض */}
        <Card className="border-0 shadow-sm overflow-hidden">
          <CardContent className="p-0">
            {isLoadingVouchers ? (
              <div className="flex items-center justify-center py-12 gap-2 text-muted-foreground text-sm">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                جاري تحميل سندات القبض...
              </div>
            ) : allVouchers.length === 0 ? (
              <div className="text-center py-12 space-y-3">
                <Receipt className="h-10 w-10 mx-auto text-muted-foreground/30" />
                <p className="text-sm font-semibold text-slate-700">لم يتم العثور على أي سندات قبض</p>
                <Button onClick={openAddVoucherModal} size="sm" className="gap-1.5 font-bold text-xs gradient-primary text-white">
                  <Plus className="h-4 w-4" />
                  تسجيل أول سند قبض
                </Button>
              </div>
            ) : (
              <div className="hidden md:block w-full overflow-x-auto">
                <Table dir="rtl" className="w-full min-w-[950px]">
                  <TableHeader className="bg-slate-50/70 dark:bg-slate-900/70 border-b border-border">
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="py-3.5 px-4 text-right min-w-[140px] font-bold text-slate-700 dark:text-slate-200">رقم السند</TableHead>
                      <TableHead className="py-3.5 px-4 text-right min-w-[180px] font-bold text-slate-700 dark:text-slate-200">المشروع</TableHead>
                      <TableHead className="py-3.5 px-4 text-right min-w-[160px] font-bold text-slate-700 dark:text-slate-200">الجهة الداعمة (المسدد)</TableHead>
                      <TableHead className="py-3.5 px-4 text-right min-w-[130px] font-bold text-slate-700 dark:text-slate-200">المبلغ المقبوض</TableHead>
                      <TableHead className="py-3.5 px-4 text-right min-w-[120px] font-bold text-slate-700 dark:text-slate-200">تاريخ الإنشاء</TableHead>
                      <TableHead className="py-3.5 px-4 text-right min-w-[150px] font-bold text-slate-700 dark:text-slate-200">الحالة</TableHead>
                      <TableHead className="py-3.5 px-4 text-center min-w-[140px] font-bold text-slate-700 dark:text-slate-200">الإجراءات</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {allVouchers.map((voucher) => {
                      const isPendingMyApproval = isFaaa8User && voucher.status === "pending_approval";

                      return (
                        <TableRow 
                          key={voucher.id} 
                          className={isPendingMyApproval ? "bg-gradient-to-l from-emerald-50/70 via-teal-50/20 to-transparent dark:from-emerald-950/40 dark:via-teal-950/10 dark:to-transparent hover:from-emerald-50/90 border-r-4 border-r-[#1a5f4a] transition-all shadow-xs" : ""}
                        >
                          {/* رقم السند */}
                          <TableCell className="py-3.5 px-4 font-mono text-xs text-right font-bold whitespace-nowrap">
                            <div className="flex items-center gap-2 justify-start">
                              {isPendingMyApproval && (
                                <TooltipProvider>
                                  <Tooltip delayDuration={50}>
                                    <TooltipTrigger asChild>
                                      <div className="relative inline-flex items-center justify-center shrink-0 cursor-pointer">
                                        <div className="relative flex items-center justify-center w-6 h-6 rounded-full bg-gradient-to-tr from-[#1a5f4a] via-emerald-600 to-teal-500 text-white shadow-sm border border-emerald-400/40 transition-transform duration-200 hover:scale-110">
                                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60"></span>
                                          <Clock className="w-3.5 h-3.5 text-amber-200 animate-spin relative z-10" style={{ animationDuration: '4s' }} />
                                        </div>
                                      </div>
                                    </TooltipTrigger>
                                    <TooltipContent side="top" className="bg-slate-900 text-white text-[11px] font-bold px-2.5 py-1 rounded-md shadow-xl border border-slate-700/60 flex items-center gap-1.5 z-50">
                                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></span>
                                      <span>بانتظار اعتمادك</span>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              )}
                              <span>{voucher.voucherNumber}</span>
                            </div>
                          </TableCell>

                          {/* اسم المشروع / نوع السند */}
                          <TableCell className="py-3.5 px-4 text-right">
                            {voucher.projectId ? (
                              <button
                                onClick={() => handleSelectProject(voucher.projectId!.toString())}
                                className="text-right hover:text-emerald-700 transition-colors font-medium group cursor-pointer block"
                              >
                                <span className="font-bold text-slate-800 dark:text-slate-200 block line-clamp-1 group-hover:underline">
                                  {voucher.projectName || `مشروع #${voucher.projectId}`}
                                </span>
                                {voucher.projectNumber && (
                                  <span className="text-[10px] text-muted-foreground font-mono block">
                                    {voucher.projectNumber}
                                  </span>
                                )}
                              </button>
                            ) : voucher.notes?.startsWith("مصرف التبرع:") ? (
                              <Badge variant="outline" className="bg-blue-50 text-blue-900 border-blue-200 text-[11px] font-semibold">
                                {voucher.notes.split(" | ")[0].replace("مصرف التبرع:", "سند مقيد:").trim()}
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="bg-amber-50 text-amber-900 border-amber-200 text-[11px] font-semibold">
                                سند قبض غير مقيد
                              </Badge>
                            )}
                          </TableCell>

                          {/* الجهة الداعمة */}
                          <TableCell className="py-3.5 px-4 text-right">
                            <Badge variant="outline" className="bg-blue-50/80 text-blue-900 border-blue-200 text-[11px] font-semibold">
                              {stripPayerTitle(voucher.payerName)}
                            </Badge>
                          </TableCell>

                          {/* المبلغ المقبوض */}
                          <TableCell className="py-3.5 px-4 text-right font-bold text-emerald-600 dark:text-emerald-400 text-xs whitespace-nowrap font-sans">
                            {parseFloat(voucher.amount.toString()).toLocaleString("en-US", { minimumFractionDigits: 2 })} <span className="text-[10px] font-normal text-muted-foreground font-sans">ريال</span>
                          </TableCell>

                          {/* تاريخ الإنشاء */}
                          <TableCell className="py-3.5 px-4 whitespace-nowrap text-right text-xs text-muted-foreground font-sans">
                            {voucher.receiptDate
                              ? new Date(voucher.receiptDate).toLocaleDateString("en-CA")
                              : "-"}
                          </TableCell>

                          {/* الحالة */}
                          <TableCell className="py-3.5 px-4 text-right">
                            {voucher.status === "approved" ? (
                              <div className="flex flex-col gap-1 items-start">
                                <Badge variant="outline" className="bg-emerald-50/80 text-emerald-800 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800 font-bold text-[11px] px-2.5 py-1 gap-1 inline-flex items-center">
                                  <CheckCircle2 className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
                                  <span>معتمد</span>
                                </Badge>
                                {(voucher.isException || voucher.exceptionApprovedBy) && (
                                  <Badge variant="outline" className="bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300 font-bold text-[10px] px-1.5 py-0.5 gap-1 inline-flex items-center">
                                    <ShieldAlert className="h-2.5 w-2.5 text-amber-600" />
                                    <span>معتمد باستثناء</span>
                                  </Badge>
                                )}
                              </div>
                            ) : voucher.status === "approval_revoked" ? (
                              <Badge variant="outline" className="bg-amber-50/80 text-amber-900 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800 font-bold text-[11px] px-2.5 py-1 gap-1 inline-flex items-center">
                                <RotateCcw className="h-3 w-3 text-amber-600 dark:text-amber-400" />
                                <span>ملغى الاعتماد</span>
                              </Badge>
                            ) : voucher.status === "rejected" ? (
                              <Badge variant="outline" className="bg-rose-50/80 text-rose-800 border-rose-300 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800 font-bold text-[11px] px-2.5 py-1 gap-1 inline-flex items-center">
                                <XCircle className="h-3 w-3 text-rose-600 dark:text-rose-400" />
                                <span>مرفوض</span>
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="bg-amber-50/90 text-amber-800 border-amber-300/80 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800 font-bold text-[11px] px-2.5 py-1 gap-1 inline-flex items-center shadow-2xs">
                                <Clock className="h-3 w-3 text-amber-600 dark:text-amber-400 animate-pulse" />
                                <span>قيد الاعتماد</span>
                              </Badge>
                            )}
                          </TableCell>

                          {/* الإجراءات */}
                          <TableCell className="py-3.5 px-4 text-center">
                            <DropdownMenu dir="rtl">
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-muted">
                                  <MoreVertical className="h-4 w-4 text-muted-foreground" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-56 text-right font-medium">
                                {/* 1. عرض سند القبض والطباعة */}
                                <DropdownMenuItem
                                  onClick={() => navigate(`/receipt-vouchers/${voucher.id}/print`)}
                                  className="flex items-center gap-2 cursor-pointer text-[#1a5f4a] hover:text-[#1a5f4a] focus:text-[#1a5f4a] focus:bg-[#1a5f4a]/5 dark:focus:bg-[#1a5f4a]/10"
                                >
                                  <Eye className="h-4 w-4 text-[#1a5f4a]" />
                                  <span>عرض وسند القبض والطباعة</span>
                                </DropdownMenuItem>

                                {/* 2. اعتماد سند القبض */}
                                {isFaaa8User && voucher.status === "pending_approval" && (
                                  <DropdownMenuItem
                                    onClick={() => approveVoucherMutation.mutate({ id: voucher.id })}
                                    disabled={approveVoucherMutation.isPending}
                                    className="flex items-center gap-2 cursor-pointer text-emerald-600 hover:text-emerald-700 focus:text-emerald-600 focus:bg-emerald-50 dark:focus:bg-emerald-950/30"
                                  >
                                    <CheckCircle className="h-4 w-4 text-emerald-500" />
                                    <span>اعتماد سند القبض</span>
                                  </DropdownMenuItem>
                                )}

                                {/* 2.1 استثناء اعتماد سند القبض */}
                                {hasExceptionApprove && voucher.status === "pending_approval" && (
                                  <DropdownMenuItem
                                    onClick={() => handleOpenExceptionModal(voucher)}
                                    disabled={exceptionApproveVoucherMutation.isPending}
                                    className="flex items-center gap-2 cursor-pointer text-amber-700 hover:text-amber-800 focus:bg-amber-50 font-bold"
                                  >
                                    <ShieldAlert className="h-4 w-4 text-amber-600" />
                                    <span>استثناء اعتماد السند</span>
                                  </DropdownMenuItem>
                                )}

                                {/* 3. رفض سند القبض */}
                                {(isFaaa8User || hasExceptionApprove) && voucher.status === "pending_approval" && (
                                  <DropdownMenuItem
                                    onClick={() => handleOpenRejectModal(voucher)}
                                    disabled={rejectVoucherMutation.isPending}
                                    className="flex items-center gap-2 cursor-pointer text-rose-600 hover:text-rose-700 focus:bg-rose-50"
                                  >
                                    <XCircle className="h-4 w-4 text-rose-600" />
                                    <span>رفض سند القبض</span>
                                  </DropdownMenuItem>
                                )}

                                {/* 4. تعديل سند القبض */}
                                {canEdit && voucher.status !== "approved" && (
                                  <DropdownMenuItem
                                    onClick={() => openEditVoucherModal(voucher)}
                                    className="flex items-center gap-2 cursor-pointer text-slate-700 hover:text-[#1a5f4a] focus:text-[#1a5f4a] focus:bg-[#1a5f4a]/5 dark:focus:bg-[#1a5f4a]/10"
                                  >
                                    <Edit3 className="h-4 w-4 text-gray-500" />
                                    <span>تعديل سند القبض</span>
                                  </DropdownMenuItem>
                                )}

                                {/* 5. إلغاء الاعتماد */}
                                {(isFaaa8User || hasExceptionApprove) && voucher.status === "approved" && (
                                  <DropdownMenuItem
                                    onClick={() => handleOpenRevokeModal(voucher)}
                                    disabled={revokeVoucherApprovalMutation.isPending}
                                    className="flex items-center gap-2 cursor-pointer text-amber-700 hover:text-amber-800 focus:bg-amber-50"
                                  >
                                    <RotateCcw className="h-4 w-4 text-amber-600" />
                                    <span>إلغاء الاعتماد</span>
                                  </DropdownMenuItem>
                                )}

                                {/* 6. عرض المبررات / السبب */}
                                {((voucher as any).exceptionReason || (voucher as any).rejectionReason || (voucher.notes && (voucher.notes.includes("إلغاء الاعتماد") || voucher.notes.includes("مرفوض")))) && (
                                  <DropdownMenuItem
                                    onClick={() => setJustificationModalNote((voucher as any).exceptionReason ? `[مبرر استثناء الاعتماد]: ${(voucher as any).exceptionReason}` : ((voucher as any).rejectionReason || voucher.notes || "لا يوجد مبرر مسجل"))}
                                    className="flex items-center gap-2 cursor-pointer text-amber-700 hover:text-amber-800 focus:text-amber-800 focus:bg-amber-50"
                                  >
                                    <Info className="h-4 w-4 text-amber-600" />
                                    <span>عرض مبررات الاستثناء / الرفض</span>
                                  </DropdownMenuItem>
                                )}

                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* مودال تسجيل/تعديل سند قبض ممتد مع إحصائيات الدفعات */}
        <Dialog open={isAddVoucherModalOpen} onOpenChange={setIsAddVoucherModalOpen}>
          <DialogContent className="dir-rtl text-right max-w-3xl sm:max-w-4xl w-[92vw] font-sans bg-white rounded-xl shadow-2xl p-6 border-0 max-h-[90vh] overflow-y-auto">
            <DialogHeader className="text-right border-b pb-4">
              <DialogTitle className="text-lg font-bold flex items-center gap-2.5 text-slate-800">
                <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-100">
                  <Receipt className="h-5 w-5" />
                </div>
                <span>{editingVoucherId ? "تعديل سند القبض" : "تسجيل سند قبض جديد"}</span>
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-5 py-3">
              {/* 1. اختيار المشروع والجهة الداعمة */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* اختيار المشروع */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-800">المشروع المطلوب *</Label>
                  <Select
                    value={modalProjectId}
                    onValueChange={(val) => {
                      setModalProjectId(val);
                      if (!editingVoucherId) {
                        const matched = projectsList.find((p: any) => p.id.toString() === val);
                        if (matched?.name) {
                          setModalNotes(matched.name);
                        }
                      }
                    }}
                    disabled={!!editingVoucherId}
                  >
                    <SelectTrigger className="h-10 text-xs bg-white border-slate-200">
                      <SelectValue placeholder="اختر المشروع..." />
                    </SelectTrigger>
                    <SelectContent dir="rtl" className="max-h-60">
                      {projectsList.map((p: any) => (
                        <SelectItem key={p.id} value={p.id.toString()}>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-[11px] text-muted-foreground">{p.projectNumber}</span>
                            <span className="font-medium">{p.name}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* اختيار اللقب والجهة الداعمة / المسدد */}
                <div className="grid grid-cols-3 gap-2">
                  <div className="col-span-1 space-y-1.5">
                    <Label className="text-xs font-bold text-slate-800">اللقب / الصفة *</Label>
                    <Select value={modalHonorificTitle} onValueChange={setModalHonorificTitle}>
                      <SelectTrigger className="h-10 text-xs bg-white border-slate-200">
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
                      value={modalPayerName}
                      onValueChange={(val) => setModalPayerName(val)}
                      disabled={projectSupporters.length === 0 && !modalPayerName}
                    >
                      <SelectTrigger className="h-10 text-xs bg-white border-slate-200 w-full">
                        <SelectValue placeholder={projectSupporters.length > 0 || modalPayerName ? "اختر الداعم المسجل..." : "لا يوجد داعمين مسجلين للمشروع"} />
                      </SelectTrigger>
                      <SelectContent dir="rtl" className="max-h-60">
                        {Array.from(new Set([...projectSupporters, ...(modalPayerName ? [modalPayerName] : [])])).map((sup, idx) => (
                          <SelectItem key={idx} value={sup}>
                            {sup}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* تنبيه عدم وجود داعمين مسجلين للمشروع */}
              {activeModalProjectId > 0 && projectSupporters.length === 0 && (
                <div className="p-4 bg-amber-50/90 border border-amber-200 rounded-xl text-amber-900 flex items-start gap-3 shadow-2xs">
                  <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-amber-900">
                      تنبيه: يجب تحديد الداعمين ومبلغ الدعم للمشروع أولاً لتتمكن من تسجيل سند القبض.
                    </p>
                    <p className="text-[11px] text-amber-700 font-medium leading-relaxed">
                      لم يتم تسجيل أي جهة داعمة لهذا المشروع في تفاصيله المالية. يرجى الانتقال إلى التفاصيل المالية الخاصة بالمشروع وتحديد الجهات الداعمة ومبالغ الدعم المخصصة أولاً.
                    </p>
                  </div>
                </div>
              )}

              {/* 2. كروت الإحصائيات المالية المباشرة للمشروع والداعم داخل المودال */}
              {activeModalProjectId > 0 && projectSupporters.length > 0 && (
                <div className="p-4 bg-slate-50/80 dark:bg-slate-900/50 rounded-xl border border-slate-200/80 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                      <Coins className="h-4 w-4 text-emerald-600" />
                      <span>الموقف المالي للداعم والمشروع</span>
                    </span>
                    {selectedSupporterCleanName && (
                      <Badge variant="outline" className="bg-emerald-50 text-emerald-800 border-emerald-300 font-bold text-[11px]">
                        الداعم: {selectedSupporterCleanName}
                      </Badge>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {/* المبلغ الملتزم به للداعم */}
                    <div className="p-3 bg-white dark:bg-slate-800 rounded-lg border border-slate-200/80 shadow-2xs">
                      <span className="text-[11px] text-muted-foreground font-semibold block">المبلغ الملتزم به للداعم</span>
                      <span className="text-base font-extrabold text-slate-900 dark:text-slate-100 block mt-0.5 font-sans">
                        {supporterCommittedAmount.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                        <span className="text-[10px] font-normal text-muted-foreground mr-1">ريال</span>
                      </span>
                    </div>

                    {/* المبلغ الذي سدده الداعم سابقاً */}
                    <div className="p-3 bg-emerald-50/60 dark:bg-emerald-950/30 rounded-lg border border-emerald-200/80 shadow-2xs">
                      <span className="text-[11px] text-emerald-800 dark:text-emerald-300 font-semibold block">سدده الداعم سابقاً</span>
                      <span className="text-base font-extrabold text-emerald-700 dark:text-emerald-400 block mt-0.5 font-sans">
                        {previouslyPaidBySupporter.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                        <span className="text-[10px] font-normal text-emerald-600 mr-1">ريال</span>
                      </span>
                    </div>

                    {/* المتبقي غير المسدد علي الداعم */}
                    <div className="p-3 bg-amber-50/60 dark:bg-amber-950/30 rounded-lg border border-amber-200/80 shadow-2xs">
                      <span className="text-[11px] text-amber-800 dark:text-amber-300 font-semibold block">المتبقي غير المسدد</span>
                      <span className={`text-base font-extrabold block mt-0.5 font-sans ${remainingUnpaidForSupporter <= 0 ? "text-emerald-700 dark:text-emerald-400" : "text-amber-700 dark:text-amber-400"}`}>
                        {remainingUnpaidForSupporter.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                        <span className="text-[10px] font-normal text-muted-foreground mr-1">ريال</span>
                      </span>
                    </div>
                  </div>

                  {/* تنبيه عند اكتمال سداد الداعم */}
                  {remainingUnpaidForSupporter <= 0 && supporterCommittedAmount > 0 && !editingVoucherId && (
                    <div className="p-3 bg-emerald-50/90 border border-emerald-200 rounded-lg text-emerald-900 flex items-center gap-2 text-xs font-bold mt-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                      <span>تم سداد كامل المبلغ الملتزم به من قبل هذا الداعم بنجاح ({supporterCommittedAmount.toLocaleString("en-US", { minimumFractionDigits: 2 })} ريال)، ولا يوجد متبقي غير مسدد لتسجيل سند قبض جديد.</span>
                    </div>
                  )}
                </div>
              )}

              {/* 3. تفاصيل سند القبض: المبلغ والتاريخ والبيان */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* مبلغ الدفعة المقبوضة */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-bold text-slate-800">مبلغ الدفعة المقبوضة (ريال) *</Label>
                    {remainingUnpaidForSupporter > 0 && (
                      <button
                        type="button"
                        onClick={() => setModalAmount(remainingUnpaidForSupporter.toString())}
                        className="text-[11px] font-bold text-emerald-700 hover:underline cursor-pointer font-sans"
                      >
                        تعبئة المتبقي ({remainingUnpaidForSupporter.toLocaleString("en-US", { minimumFractionDigits: 2 })} ريال)
                      </button>
                    )}
                  </div>
                  <Input
                    type="number"
                    min={0.01}
                    step={0.01}
                    value={modalAmount}
                    onChange={(e) => setModalAmount(e.target.value)}
                    placeholder="مثال: 50000"
                    disabled={remainingUnpaidForSupporter <= 0 && !editingVoucherId}
                    className="h-10 font-bold text-emerald-800 text-left [direction:ltr] bg-white border-slate-200"
                  />
                </div>

                {/* تاريخ القبض */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-800">تاريخ القبض *</Label>
                  <Input
                    type="date"
                    value={modalDate}
                    onChange={(e) => setModalDate(e.target.value)}
                    className="h-10 text-xs bg-white border-slate-200"
                  />
                </div>
              </div>

              {/* البيان / الملاحظات */}
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-800">وذلك مقابل (سبب المقبوض / البيان) *</Label>
                <Textarea
                  value={modalNotes}
                  onChange={(e) => setModalNotes(e.target.value)}
                  placeholder="أدخل البيان أو سبب القبض..."
                  rows={3}
                  className="bg-white border-slate-200 text-xs"
                />
              </div>

              {/* تفاصيل طريقة القبض والحساب البنكي - خانة واحدة سطرية */}
              <div className="space-y-1.5 pt-2 border-t border-slate-100">
                <Label className="text-xs font-bold text-slate-800">تفاصيل طريقة القبض والحساب البنكي</Label>
                <Input
                  type="text"
                  value={modalBankName}
                  onChange={(e) => setModalBankName(e.target.value)}
                  placeholder="مثال: مصرف الراجحي"
                  className="h-10 text-xs bg-white border-slate-200 font-medium"
                />
              </div>

            </div>

            <DialogFooter className="flex justify-between items-center gap-2 sm:justify-start pt-4 border-t mt-2">
              <Button
                type="button"
                onClick={handleSaveVoucher}
                disabled={createVoucherMutation.isPending || updateVoucherMutation.isPending || (activeModalProjectId > 0 && projectSupporters.length === 0 && !editingVoucherId) || (remainingUnpaidForSupporter <= 0 && supporterCommittedAmount > 0 && !editingVoucherId)}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-5 h-10 rounded-lg shadow-2xs"
              >
                {(createVoucherMutation.isPending || updateVoucherMutation.isPending) && (
                  <Loader2 className="h-4 w-4 ml-2 animate-spin" />
                )}
                {editingVoucherId ? "حفظ التعديلات" : "تسجيل سند القبض"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsAddVoucherModalOpen(false)}
                className="text-xs h-10 px-5 rounded-lg border-slate-200"
              >
                إلغاء
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* مودال عرض الملاحظات والمبررات الكاملة */}
        <Dialog open={!!justificationModalNote} onOpenChange={(open) => !open && setJustificationModalNote(null)}>
          <DialogContent className="dir-rtl text-right max-w-sm">
            <DialogHeader className="text-right">
              <DialogTitle className="text-sm font-bold flex items-center gap-2 text-primary">
                <Info className="h-4 w-4 text-amber-600" />
                المبررات / السبب المسجل
              </DialogTitle>
            </DialogHeader>
            <div className="p-3.5 bg-amber-50/50 rounded-lg border border-amber-200 text-xs text-amber-950 leading-relaxed font-medium whitespace-pre-wrap">
              {justificationModalNote}
            </div>
            <DialogFooter className="justify-start">
              <Button type="button" variant="outline" size="sm" onClick={() => setJustificationModalNote(null)} className="text-xs font-bold">
                إغلاق
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* مودال الاعتماد والرفض وإلغاء الاعتماد بمبررات */}
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
                  ? `عند إلغاء اعتماد السند (${actionModal.voucherNumber || ""})، سيتم سحب التوقيع المالي وإعادة إتاحة التعديل والحذف.`
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
                  className="text-xs"
                />
                {actionError && (
                  <p className="text-xs text-rose-600 font-semibold">{actionError}</p>
                )}
              </div>
            </div>

            <DialogFooter className="flex justify-between items-center gap-2 sm:justify-start pt-2 border-t">
              <Button
                type="button"
                onClick={handleConfirmAction}
                disabled={exceptionApproveVoucherMutation.isPending || revokeVoucherApprovalMutation.isPending || rejectVoucherMutation.isPending}
                className={
                  actionModal.type === "exception_approve" || actionModal.type === "revoke"
                    ? "bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs"
                    : "bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs"
                }
              >
                {(exceptionApproveVoucherMutation.isPending || revokeVoucherApprovalMutation.isPending || rejectVoucherMutation.isPending) && (
                  <Loader2 className="h-3.5 w-3.5 ml-2 animate-spin" />
                )}
                {actionModal.type === "exception_approve"
                  ? "تأكيد اعتماد السند بالاستثناء"
                  : actionModal.type === "revoke"
                  ? "تأكيد إلغاء الاعتماد"
                  : "تأكيد الرفض"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setActionModal(prev => ({ ...prev, isOpen: false }))}
                className="text-xs"
              >
                إلغاء
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

      </div>
    </DashboardLayout>
  );
}
