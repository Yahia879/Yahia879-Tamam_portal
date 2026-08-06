import { useState, useEffect } from "react";
import { useLocation } from "wouter";
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
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import {
  Coins,
  Receipt,
  Building2,
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
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

export default function ReceiptVouchers() {
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const isFaaa8User = user?.email === "solayani@manarah.org.sa";
  const utils = trpc.useUtils();

  // الحصول على البارامترات من URL إن وجدت
  const urlParams = new URLSearchParams(window.location.search);
  const initialProjectId = urlParams.get("projectId") || "all";

  const [selectedProjectId, setSelectedProjectId] = useState<string>(initialProjectId);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // حالة مودال تسجيل/تعديل سند القبض
  const [isAddVoucherModalOpen, setIsAddVoucherModalOpen] = useState<boolean>(false);
  const [editingVoucherId, setEditingVoucherId] = useState<number | null>(null);
  const [modalProjectId, setModalProjectId] = useState<string>("");
  const [modalHonorificTitle, setModalHonorificTitle] = useState<string>("السادة");
  const [modalAmount, setModalAmount] = useState<string>("");
  const [modalDate, setModalDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [modalPayerName, setModalPayerName] = useState<string>("");
  const [customPayerName, setCustomPayerName] = useState<string>("");
  const [modalNotes, setModalNotes] = useState<string>("");

  // حالات مودالات المبررات والاعتماد/الرفض
  const [justificationModalNote, setJustificationModalNote] = useState<string | null>(null);
  const [actionModal, setActionModal] = useState<{
    isOpen: boolean;
    type: "revoke" | "reject";
    voucherId: number | null;
    voucherNumber?: string;
  }>({
    isOpen: false,
    type: "revoke",
    voucherId: null,
  });
  const [actionReason, setActionReason] = useState<string>("");
  const [actionError, setActionError] = useState<string>("");

  // تحديث حالة المشروع عند تغير البارامتر بالرابط
  useEffect(() => {
    const pId = urlParams.get("projectId");
    if (pId) {
      setSelectedProjectId(pId);
    }
  }, [window.location.search]);

  // جلب قائمة المشاريع للاختيار من القائمة المنسدلة
  const { data: rawProjectsData } = trpc.projects.getAll.useQuery({
    limit: 200,
  });
  const projectsList: any[] = Array.isArray(rawProjectsData) ? rawProjectsData : (rawProjectsData as any)?.projects || [];

  // جلب سندات القبض مع الفلترة
  const { data: allVouchers = [], isLoading: isLoadingVouchers, refetch: refetchVouchers } = trpc.projects.getAllReceiptVouchers.useQuery({
    projectId: selectedProjectId !== "all" ? parseInt(selectedProjectId) : undefined,
    status: statusFilter !== "all" ? statusFilter : undefined,
    search: searchQuery,
  });

  // جلب البيانات المالية للمشروع المختار داخل المودال لمعرفة الداعمين
  const activeModalProjectId = parseInt(modalProjectId) || 0;
  const { data: projectFinancialData } = trpc.projects.getFinancialData.useQuery(
    { projectId: activeModalProjectId },
    { enabled: activeModalProjectId > 0 }
  );

  // استخراج قائمة الداعمين للمشروع المختار في المودال
  const projectSupporters: string[] = [];
  if (projectFinancialData?.financialDetail) {
    if (projectFinancialData.financialDetail.supportSourcesJson) {
      try {
        const parsed = JSON.parse(projectFinancialData.financialDetail.supportSourcesJson);
        if (Array.isArray(parsed)) {
          parsed.forEach((item: any) => {
            let name = item.entity === "اخرى" ? item.customEntity : item.entity;
            if (name && name.trim()) {
              // تنظيف الألقاب السابقة لمنع التكرار
              name = name.replace(/^(السيد|السيدة|السادة)\s*\/\s*/, "").trim();
              if (name && !projectSupporters.includes(name)) {
                projectSupporters.push(name);
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
      if (cleanEntity) projectSupporters.push(cleanEntity);
    }
  }

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
    },
    onError: (err) => {
      toast.error(err.message || "حدث خطأ أثناء تحديث سند القبض");
    },
  });

  const deleteVoucherMutation = trpc.projects.deleteReceiptVoucher.useMutation({
    onSuccess: () => {
      toast.success("تم حذف سند القبض");
      refetchVouchers();
      utils.projects.getFinancialData.invalidate();
    },
    onError: (err) => {
      toast.error(err.message || "حدث خطأ أثناء حذف السند");
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

  const resetModalForm = () => {
    setEditingVoucherId(null);
    setModalHonorificTitle("السادة");
    setModalAmount("");
    setModalDate(new Date().toISOString().split("T")[0]);
    setModalPayerName("");
    setCustomPayerName("");
    setModalNotes("");
  };

  const openAddVoucherModal = () => {
    const initialPrj = selectedProjectId !== "all" ? selectedProjectId : (projectsList[0]?.id.toString() || "");
    setModalProjectId(initialPrj);
    resetModalForm();
    setIsAddVoucherModalOpen(true);
  };

  const openEditVoucherModal = (voucher: any) => {
    setEditingVoucherId(voucher.id);
    setModalProjectId(voucher.projectId.toString());
    setModalAmount(voucher.amount.toString());
    setModalDate(voucher.receiptDate ? new Date(voucher.receiptDate).toISOString().split("T")[0] : new Date().toISOString().split("T")[0]);
    
    const rawPayer = voucher.payerName || "";
    if (rawPayer.startsWith("السيد / ")) {
      setModalHonorificTitle("السيد");
      setModalPayerName(rawPayer.replace("السيد / ", ""));
    } else if (rawPayer.startsWith("السيدة / ")) {
      setModalHonorificTitle("السيدة");
      setModalPayerName(rawPayer.replace("السيدة / ", ""));
    } else if (rawPayer.startsWith("السادة / ")) {
      setModalHonorificTitle("السادة");
      setModalPayerName(rawPayer.replace("السادة / ", ""));
    } else {
      setModalHonorificTitle("السادة");
      setModalPayerName(rawPayer);
    }

    setCustomPayerName("");
    setModalNotes(voucher.notes || "");
    setIsAddVoucherModalOpen(true);
  };

  const handleDeleteVoucher = (id: number) => {
    if (confirm("هل أنت تأكد من رغبتك في حذف سند القبض هذا؟")) {
      deleteVoucherMutation.mutate({ id });
    }
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

  const handleConfirmAction = () => {
    if (!actionReason.trim()) {
      setActionError(
        actionModal.type === "revoke"
          ? "يرجى إدخال مبررات إلغاء الاعتماد أولاً"
          : "يرجى إدخال سبب الرفض أولاً"
      );
      return;
    }

    if (actionModal.type === "revoke" && actionModal.voucherId) {
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
    if (!modalProjectId || isNaN(prjId) || prjId <= 0) {
      toast.error("يرجى اختيار المشروع أولاً");
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
    const cleanPayer = modalPayerName === "اخرى" ? customPayerName.trim() : modalPayerName.trim();
    if (!cleanPayer) {
      toast.error("يرجى اختيار أو كتابة اسم الجهة الداعمة / القابض منه");
      return;
    }

    // تجهيز الاسم النهائي بسبق اللقب (السيد / السيدة / السادة)
    let finalPayerName = cleanPayer;
    if (
      !cleanPayer.startsWith("السيد /") &&
      !cleanPayer.startsWith("السيدة /") &&
      !cleanPayer.startsWith("السادة /")
    ) {
      finalPayerName = `${modalHonorificTitle} / ${cleanPayer}`;
    }

    if (editingVoucherId) {
      updateVoucherMutation.mutate({
        id: editingVoucherId,
        amount: amountNum,
        receiptDate: modalDate,
        payerName: finalPayerName,
        notes: modalNotes,
      });
    } else {
      createVoucherMutation.mutate({
        projectId: prjId,
        amount: amountNum,
        receiptDate: modalDate,
        payerName: finalPayerName,
        notes: modalNotes,
      });
    }
  };

  const getCleanVoucherNotes = (notes?: string | null): string => {
    if (!notes) return "-";
    if (notes.includes(" | ")) {
      const parts = notes.split(" | ");
      return parts[0].trim() || "-";
    }
    if (notes.startsWith("تم إلغاء الاعتماد:") || notes.startsWith("مبررات إلغاء الاعتماد:") || notes.startsWith("مرفوض")) {
      return "-";
    }
    return notes;
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

  return (
    <DashboardLayout>
      <div className="space-y-6 dir-rtl text-right p-4 sm:p-6">
        
        {/* 1. هيدر الصفحة الرئيسي ورأس العمليات */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b">
          <div className="space-y-1">
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              <Coins className="h-6 w-6 text-primary" />
              سندات القبض
            </h1>
            <p className="text-sm text-muted-foreground">
              إدارة وتوثيق سندات القبض والدفعات المقبوضة فعلياً من الجهات الداعمة للمشاريع
            </p>
          </div>

          <Button
            onClick={openAddVoucherModal}
            className="bg-primary hover:bg-primary/90 text-white font-bold gap-2 text-xs shadow-xs h-10 px-4"
          >
            <Plus className="h-4 w-4" />
            تسجيل سند قبض جديد
          </Button>
        </div>

        {/* 2. كروت الإحصائيات بأعلى الصفحة */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          
          {/* إجمالي المقبوضات */}
          <div className="p-4 bg-gradient-to-br from-emerald-50/80 to-white rounded-xl border border-emerald-200/80 shadow-2xs flex items-center justify-between transition-all hover:border-emerald-300">
            <div className="space-y-1">
              <span className="text-xs text-emerald-800 font-semibold block">إجمالي المقبوضات</span>
              <span className="text-2xl font-extrabold text-emerald-950 block">
                {totalAmountReceived.toLocaleString("ar-SA", { minimumFractionDigits: 2 })}
                <span className="text-xs font-semibold text-emerald-700 mr-1">ريال</span>
              </span>
            </div>
            <div className="p-3 bg-emerald-100/70 text-emerald-700 rounded-xl">
              <Coins className="h-6 w-6" />
            </div>
          </div>

          {/* سندات معتمدة */}
          <div className="p-4 bg-gradient-to-br from-blue-50/80 to-white rounded-xl border border-blue-200/80 shadow-2xs flex items-center justify-between transition-all hover:border-blue-300">
            <div className="space-y-1">
              <span className="text-xs text-blue-800 font-semibold block">سندات معتمدة</span>
              <span className="text-2xl font-extrabold text-blue-950 block">
                {totalApprovedCount}
                <span className="text-xs font-semibold text-blue-700 mr-1">سند</span>
              </span>
            </div>
            <div className="p-3 bg-blue-100/70 text-blue-700 rounded-xl">
              <CheckCircle2 className="h-6 w-6" />
            </div>
          </div>

          {/* سندات قيد الاعتماد */}
          <div className="p-4 bg-gradient-to-br from-amber-50/80 to-white rounded-xl border border-amber-200/80 shadow-2xs flex items-center justify-between transition-all hover:border-amber-300">
            <div className="space-y-1">
              <span className="text-xs text-amber-800 font-semibold block">قيد الاعتماد</span>
              <span className="text-2xl font-extrabold text-amber-950 block">
                {totalPendingCount}
                <span className="text-xs font-semibold text-amber-700 mr-1">سند</span>
              </span>
            </div>
            <div className="p-3 bg-amber-100/70 text-amber-700 rounded-xl">
              <Clock className="h-6 w-6" />
            </div>
          </div>

          {/* إجمالي عدد السندات */}
          <div className="p-4 bg-gradient-to-br from-slate-50 to-white rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between transition-all hover:border-slate-300">
            <div className="space-y-1">
              <span className="text-xs text-slate-600 font-semibold block">إجمالي عدد السندات</span>
              <span className="text-2xl font-extrabold text-slate-900 block">
                {totalVouchersCount}
                <span className="text-xs font-semibold text-slate-500 mr-1">سند مسجل</span>
              </span>
            </div>
            <div className="p-3 bg-slate-100 text-slate-700 rounded-xl">
              <FileText className="h-6 w-6" />
            </div>
          </div>

        </div>

        {/* 3. شريط البحث والفلترة تضبيط المسافات والترتيب */}
        <Card className="border-slate-200 shadow-2xs">
          <CardContent className="p-3.5">
            <div className="flex flex-col md:flex-row items-center justify-between gap-3">
              
              {/* حقل البحث */}
              <div className="relative flex-1 w-full">
                <Search className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="بحث برقم السند، اسم المشروع، أو الداعم..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pr-9 h-10 text-xs bg-white border-slate-200"
                />
              </div>

              {/* المنسدلات متجاورة ومضمومة بخطوة واحدة بدون تباعد كبير */}
              <div className="flex items-center gap-2 w-full md:w-auto shrink-0">
                
                {/* 1. منسدلة فلترة الحالة */}
                <div className="w-36 sm:w-40 shrink-0">
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="h-10 text-xs bg-white border-slate-200">
                      <div className="flex items-center gap-1.5">
                        <Filter className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        <SelectValue placeholder="الحالة" />
                      </div>
                    </SelectTrigger>
                    <SelectContent dir="rtl">
                      <SelectItem value="all">جميع الحالات</SelectItem>
                      <SelectItem value="approved">معتمد</SelectItem>
                      <SelectItem value="pending_approval">قيد الاعتماد</SelectItem>
                      <SelectItem value="approval_revoked">ملغى الاعتماد</SelectItem>
                      <SelectItem value="rejected">مرفوض</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* 2. اختيار وتصفية حسب المشروع بعرض ثابت وتقطيع بالنقط */}
                <div className="w-56 sm:w-64 max-w-[260px] shrink-0">
                  <Select value={selectedProjectId} onValueChange={handleSelectProject}>
                    <SelectTrigger className="h-10 text-xs bg-white border-slate-200 w-full overflow-hidden">
                      <div className="flex items-center gap-2 truncate w-full overflow-hidden">
                        <FolderOpen className="h-4 w-4 text-emerald-600 shrink-0" />
                        <span className="truncate block text-ellipsis overflow-hidden font-medium max-w-[190px]">
                          <SelectValue placeholder="اختر المشروع..." />
                        </span>
                      </div>
                    </SelectTrigger>
                    <SelectContent dir="rtl" className="max-h-72 max-w-sm">
                      <SelectItem value="all" className="font-bold text-slate-900 border-b pb-1 mb-1">
                        جميع المشاريع
                      </SelectItem>
                      {projectsList.map((p: any) => (
                        <SelectItem key={p.id} value={p.id.toString()}>
                          <div className="flex items-center gap-2 max-w-[260px]">
                            <span className="font-mono text-[11px] text-muted-foreground shrink-0">{p.projectNumber}</span>
                            <span className="font-medium truncate block">{p.name}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

              </div>

            </div>
          </CardContent>
        </Card>

        {/* 4. عرض المحتوى: عند اختيار مشروع محدد */}
        {selectedProjectId !== "all" && (
          <Card className="border-emerald-200 bg-emerald-50/40">
            <CardContent className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-bold text-emerald-950 flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-emerald-700" />
                  تصفية المشاريع: {currentProject?.name || `مشروع #${selectedProjectId}`}
                </h2>
                <p className="text-xs text-muted-foreground font-mono">
                  رقم المشروع: {currentProject?.projectNumber || selectedProjectId}
                </p>
              </div>

              {currentProject && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate(`/projects/${selectedProjectId}`)}
                  className="text-xs text-primary font-bold hover:bg-white border gap-1"
                >
                  <Eye className="h-3.5 w-3.5" />
                  تفاصيل المشروع
                </Button>
              )}
            </CardContent>
          </Card>
        )}

        {/* 5. عرض كشف جدول سندات القبض المنظم والخفيف */}
        <Card className="border-slate-200 shadow-2xs">
          <CardHeader className="pb-3 border-b bg-slate-50/50">
            <div>
              <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Receipt className="h-5 w-5 text-emerald-600" />
                سجل كافة سندات القبض ({allVouchers.length})
              </CardTitle>
              <CardDescription className="text-xs">
                {selectedProjectId !== "all"
                  ? `عرض سندات القبض الخاصة بالمشروع (${currentProject?.name || selectedProjectId})`
                  : "جدول مجمع لجميع سندات القبض المسجلة في النظام."}
              </CardDescription>
            </div>
          </CardHeader>

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
                <Button onClick={openAddVoucherModal} size="sm" className="gap-1.5 font-bold text-xs bg-primary">
                  <Plus className="h-4 w-4" />
                  تسجيل أول سند قبض
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table dir="rtl">
                  <TableHeader className="bg-slate-50">
                    <TableRow>
                      <TableHead className="text-right text-xs font-bold">رقم السند</TableHead>
                      <TableHead className="text-right text-xs font-bold">المشروع</TableHead>
                      <TableHead className="text-right text-xs font-bold">تاريخ القبض</TableHead>
                      <TableHead className="text-right text-xs font-bold">الجهة الداعمة (المسدد)</TableHead>
                      <TableHead className="text-right text-xs font-bold">المبلغ المقبوض</TableHead>
                      <TableHead className="text-right text-xs font-bold">البيان / ملاحظات</TableHead>
                      <TableHead className="text-center text-xs font-bold">الحالة</TableHead>
                      <TableHead className="text-center text-xs font-bold">الإجراءات</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {allVouchers.map((voucher) => (
                      <TableRow key={voucher.id} className="hover:bg-slate-50/70">
                        <TableCell className="font-bold text-xs font-mono">
                          {voucher.status === "approved" ? (
                            <span className="text-primary">{voucher.voucherNumber}</span>
                          ) : (
                            <span className="text-slate-400 font-normal italic">ينشأ بعد الاعتماد</span>
                          )}
                        </TableCell>

                        <TableCell className="text-xs">
                          <button
                            onClick={() => handleSelectProject(voucher.projectId.toString())}
                            className="text-right hover:text-emerald-700 transition-colors font-medium group cursor-pointer block"
                          >
                            <span className="font-bold text-slate-800 block line-clamp-1 group-hover:underline">
                              {voucher.projectName || `مشروع #${voucher.projectId}`}
                            </span>
                            {voucher.projectNumber && (
                              <span className="text-[10px] text-muted-foreground font-mono block">
                                {voucher.projectNumber}
                              </span>
                            )}
                          </button>
                        </TableCell>

                        <TableCell className="text-xs font-mono">
                          {voucher.receiptDate
                            ? new Date(voucher.receiptDate).toLocaleDateString("ar-SA")
                            : "-"}
                        </TableCell>

                        <TableCell className="text-xs font-semibold text-slate-800">
                          <Badge variant="outline" className="bg-blue-50 text-blue-900 border-blue-200 text-[11px] font-semibold">
                            {voucher.payerName || "جهة غير محددة"}
                          </Badge>
                        </TableCell>

                        <TableCell className="font-bold text-emerald-700 text-xs">
                          {parseFloat(voucher.amount.toString()).toLocaleString("ar-SA", { minimumFractionDigits: 2 })} ريال
                        </TableCell>

                        <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate" title={getCleanVoucherNotes(voucher.notes)}>
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
                            {/* زر المعاينة والطباعة بأيقونة العين Eye */}
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

                            {/* أزرار الاعتماد والرفض وإلغاء الاعتماد مخصصة حصرياً للمسؤول المالي faaa8@gmail.com */}
                            {isFaaa8User && (
                              voucher.status === "approved" ? (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleOpenRevokeModal(voucher)}
                                  disabled={revokeVoucherApprovalMutation.isPending}
                                  className="h-7 px-2 text-[11px] font-bold text-amber-700 hover:text-amber-900 hover:bg-amber-100/70 border border-amber-300 rounded-md gap-1"
                                  title="إلغاء الاعتماد لإتاحة التعديل"
                                >
                                  <RotateCcw className="h-3.5 w-3.5" />
                                  إلغاء الاعتماد
                                </Button>
                              ) : voucher.status === "pending_approval" ? (
                                <>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => approveVoucherMutation.mutate({ id: voucher.id })}
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
                                    onClick={() => handleOpenRejectModal(voucher)}
                                    disabled={rejectVoucherMutation.isPending}
                                    className="h-7 px-2 text-[11px] font-bold text-rose-700 hover:text-rose-900 hover:bg-rose-100/70 border border-rose-200 rounded-md gap-1"
                                    title="رفض سند القبض"
                                  >
                                    <XCircle className="h-3.5 w-3.5" />
                                    رفض
                                  </Button>
                                </>
                              ) : null
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

        {/* نافذة المودال المباشرة لتسجيل/تعديل سند قبض */}
        <Dialog open={isAddVoucherModalOpen} onOpenChange={setIsAddVoucherModalOpen}>
          <DialogContent className="dir-rtl text-right max-w-md">
            <DialogHeader className="text-right">
              <DialogTitle className="text-base font-bold flex items-center gap-2 text-right">
                <Receipt className="h-5 w-5 text-emerald-600" />
                {editingVoucherId ? "تعديل سند القبض" : "تسجيل سند قبض جديد"}
              </DialogTitle>
              <DialogDescription className="text-xs text-right mt-1">
                اختر المشروع والجهة الداعمة وأدخل تفاصيل الدفعة المقبوضة
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2 text-xs text-right">
              
              {/* اختيار المشروع */}
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-800">المشروع المطلوب *</Label>
                <Select value={modalProjectId} onValueChange={setModalProjectId} disabled={!!editingVoucherId}>
                  <SelectTrigger className="h-10 text-xs bg-white">
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
                    <SelectTrigger className="h-10 text-xs bg-white">
                      <SelectValue placeholder="اللقب..." />
                    </SelectTrigger>
                    <SelectContent dir="rtl">
                      <SelectItem value="السادة">السادة /</SelectItem>
                      <SelectItem value="السيد">السيد /</SelectItem>
                      <SelectItem value="السيدة">السيدة /</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="col-span-2 space-y-1.5">
                  <Label className="text-xs font-bold text-slate-800">الجهة الداعمة / المسدد *</Label>
                  {projectSupporters.length > 0 ? (
                    <Select
                      value={modalPayerName}
                      onValueChange={(val) => {
                        setModalPayerName(val);
                        if (val !== "اخرى") setCustomPayerName("");
                      }}
                    >
                      <SelectTrigger className="h-10 text-xs bg-white">
                        <SelectValue placeholder="اختر الداعم المسجل..." />
                      </SelectTrigger>
                      <SelectContent dir="rtl">
                        {projectSupporters.map((sup, idx) => (
                          <SelectItem key={idx} value={sup}>
                            {sup}
                          </SelectItem>
                        ))}
                        <SelectItem value="اخرى" className="font-bold text-blue-700">
                          + جهة أخرى (إدخال يدوي)
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input
                      value={modalPayerName}
                      onChange={(e) => setModalPayerName(e.target.value)}
                      placeholder="اسم الداعم..."
                      className="h-10 text-xs bg-white"
                    />
                  )}
                </div>
              </div>

              {/* إدخال اسم داعم مخصص عند اختيار اخرى */}
              {modalPayerName === "اخرى" && (
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-blue-900">اسم الجهة الداعمة المخصصة *</Label>
                  <Input
                    value={customPayerName}
                    onChange={(e) => setCustomPayerName(e.target.value)}
                    placeholder="أدخل اسم الداعم..."
                    className="h-10 text-xs bg-white"
                  />
                </div>
              )}

              {/* مبلغ الدفعة المقبوضة */}
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-800">مبلغ الدفعة المقبوضة (ريال) *</Label>
                <Input
                  type="number"
                  min={0.01}
                  step={0.01}
                  value={modalAmount}
                  onChange={(e) => setModalAmount(e.target.value)}
                  placeholder="مثال: 50000"
                  className="h-10 font-bold text-emerald-800 text-left [direction:ltr] bg-white"
                />
              </div>

              {/* تاريخ القبض */}
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-800">تاريخ القبض *</Label>
                <Input
                  type="date"
                  value={modalDate}
                  onChange={(e) => setModalDate(e.target.value)}
                  className="h-10 text-xs bg-white"
                />
              </div>

              {/* البيان / الملاحظات */}
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-800">وذلك مقابل (سبب المقبوض / البيان) *</Label>
                <Textarea
                  value={modalNotes}
                  onChange={(e) => setModalNotes(e.target.value)}
                  placeholder="أدخل البيان أو سبب القبض..."
                  rows={3}
                  className="bg-white"
                />
              </div>

            </div>

            <DialogFooter className="flex justify-between items-center gap-2 sm:justify-start pt-2 border-t">
              <Button
                type="button"
                onClick={handleSaveVoucher}
                disabled={createVoucherMutation.isPending || updateVoucherMutation.isPending}
                className="bg-emerald-600 hover:bg-emerald-700 font-bold text-xs"
              >
                {(createVoucherMutation.isPending || updateVoucherMutation.isPending) && (
                  <Loader2 className="h-3.5 w-3.5 ml-2 animate-spin" />
                )}
                {editingVoucherId ? "حفظ التعديلات" : "تسجيل سند القبض"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsAddVoucherModalOpen(false)}
                className="text-xs"
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
                {actionModal.type === "revoke" ? (
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
                {actionModal.type === "revoke"
                  ? `عند إلغاء اعتماد السند (${actionModal.voucherNumber || ""})، سيتم سحب التوقيع المالي وإعادة إتاحة التعديل والحذف.`
                  : `عند رفض السند (${actionModal.voucherNumber || ""})، سيتم تسجيل حالة الرفض وحفظ السبب.`}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700">
                  {actionModal.type === "revoke" ? "مبررات إلغاء الاعتماد *" : "سبب الرفض *"}
                </Label>
                <Textarea
                  value={actionReason}
                  onChange={(e) => {
                    setActionReason(e.target.value);
                    if (actionError) setActionError("");
                  }}
                  placeholder={
                    actionModal.type === "revoke"
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
                disabled={revokeVoucherApprovalMutation.isPending || rejectVoucherMutation.isPending}
                className={
                  actionModal.type === "revoke"
                    ? "bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs"
                    : "bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs"
                }
              >
                {(revokeVoucherApprovalMutation.isPending || rejectVoucherMutation.isPending) && (
                  <Loader2 className="h-3.5 w-3.5 ml-2 animate-spin" />
                )}
                {actionModal.type === "revoke" ? "تأكيد إلغاء الاعتماد" : "تأكيد الرفض"}
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
