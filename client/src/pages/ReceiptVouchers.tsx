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
import {
  Coins,
  Receipt,
  Building2,
  Search,
  Eye,
  CheckCircle,
  Clock,
  RotateCcw,
  XCircle,
  FolderOpen,
  ArrowRight,
  Loader2,
  Printer,
  Filter,
  Plus,
} from "lucide-react";
import { toast } from "sonner";
import ProjectFinancialsTab from "@/components/ProjectFinancialsTab";

export default function ReceiptVouchers() {
  const [, navigate] = useLocation();
  const utils = trpc.useUtils();

  // الحصول على البارامترات من URL إن وجدت
  const urlParams = new URLSearchParams(window.location.search);
  const initialProjectId = urlParams.get("projectId") || "all";

  const [selectedProjectId, setSelectedProjectId] = useState<string>(initialProjectId);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // حالة مودال تسجيل سند قبض جديد المباشر
  const [isAddVoucherModalOpen, setIsAddVoucherModalOpen] = useState<boolean>(false);
  const [modalProjectId, setModalProjectId] = useState<string>("");
  const [modalAmount, setModalAmount] = useState<string>("");
  const [modalDate, setModalDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [modalPayerName, setModalPayerName] = useState<string>("");
  const [customPayerName, setCustomPayerName] = useState<string>("");
  const [modalPaymentMethod, setModalPaymentMethod] = useState<string>("bank_transfer");
  const [modalRefNumber, setModalRefNumber] = useState<string>("");
  const [modalNotes, setModalNotes] = useState<string>("");

  // تحديث حالة المشروع عند تغير البارامتر بالرابط
  useEffect(() => {
    const pId = urlParams.get("projectId");
    if (pId) {
      setSelectedProjectId(pId);
    }
  }, [window.location.search]);

  // جلب قائمة المشاريع للاختيار من القائمة المنسدلة
  const { data: projectsList = [] } = trpc.projects.getAll.useQuery({
    limit: 200,
  });

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
            const name = item.entity === "اخرى" ? item.customEntity : item.entity;
            if (name && name.trim() && !projectSupporters.includes(name.trim())) {
              projectSupporters.push(name.trim());
            }
          });
        }
      } catch (e) {
        // ignore
      }
    }
    if (projectSupporters.length === 0 && projectFinancialData.financialDetail.supportEntity) {
      projectSupporters.push(projectFinancialData.financialDetail.supportEntity);
    }
  }

  // طفرة إضافة سند القبض
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

  const resetModalForm = () => {
    setModalAmount("");
    setModalDate(new Date().toISOString().split("T")[0]);
    setModalPayerName("");
    setCustomPayerName("");
    setModalPaymentMethod("bank_transfer");
    setModalRefNumber("");
    setModalNotes("");
  };

  const openAddVoucherModal = () => {
    const initialPrj = selectedProjectId !== "all" ? selectedProjectId : (projectsList[0]?.id.toString() || "");
    setModalProjectId(initialPrj);
    resetModalForm();
    setIsAddVoucherModalOpen(true);
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
    const finalPayerName = modalPayerName === "اخرى" ? customPayerName.trim() : modalPayerName.trim();
    if (!finalPayerName) {
      toast.error("يرجى اختيار أو كتابة اسم الجهة الداعمة / القابض منه");
      return;
    }

    createVoucherMutation.mutate({
      projectId: prjId,
      amount: amountNum,
      receiptDate: modalDate,
      payerName: finalPayerName,
      paymentMethod: modalPaymentMethod,
      referenceNumber: modalRefNumber,
      notes: modalNotes,
    });
  };

  // حساب الإحصائيات السريعة
  const totalAmountReceived = allVouchers
    .filter(v => v.status === "approved" || v.status === "pending_approval")
    .reduce((sum, v) => sum + parseFloat((v.amount || "0").toString()), 0);
  const totalApprovedCount = allVouchers.filter(v => v.status === "approved").length;
  const totalPendingCount = allVouchers.filter(v => v.status === "pending_approval").length;

  const currentProject = projectsList.find(p => p.id.toString() === selectedProjectId);

  const handleSelectProject = (val: string) => {
    setSelectedProjectId(val);
    const newUrl = val === "all" ? "/receipt-vouchers" : `/receipt-vouchers?projectId=${val}`;
    window.history.replaceState(null, "", newUrl);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 dir-rtl text-right p-4 sm:p-6">
        
        {/* هيدر الصفحة القياسي والمبسط مع زر تسجيل سند جديد */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              <Coins className="h-6 w-6 text-primary" />
              سندات القبض
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              إدارة وتوثيق سندات القبض والدفعات المقبوضة فعلياً من الجهات الداعمة
            </p>
          </div>

          <Button
            onClick={openAddVoucherModal}
            className="bg-primary hover:bg-primary/90 text-white font-bold gap-2 text-xs shadow-xs"
          >
            <Plus className="h-4 w-4" />
            تسجيل سند قبض جديد
          </Button>
        </div>

        {/* شريط البحث والفلترة القياسي */}
        <Card className="border-slate-200 shadow-2xs">
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row items-center gap-3">
              
              {/* حقل البحث */}
              <div className="relative flex-1 w-full">
                <Search className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="بحث برقم السند، الجهة الداعمة، اسم المشروع..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pr-9 h-10 text-xs bg-white"
                />
              </div>

              {/* منسدلة اختيار المشروع */}
              <div className="w-full md:w-72">
                <Select value={selectedProjectId} onValueChange={handleSelectProject}>
                  <SelectTrigger className="h-10 text-xs bg-white border-slate-200">
                    <div className="flex items-center gap-2 truncate">
                      <FolderOpen className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <SelectValue placeholder="اختر المشروع..." />
                    </div>
                  </SelectTrigger>
                  <SelectContent dir="rtl" className="max-h-72">
                    <SelectItem value="all" className="font-bold">
                      🌐 جميع المشاريع
                    </SelectItem>
                    {projectsList.map((p) => (
                      <SelectItem key={p.id} value={p.id.toString()}>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[11px] text-muted-foreground">{p.projectNumber}</span>
                          <span className="font-medium truncate">{p.name}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* منسدلة فلترة الحالة */}
              <div className="w-full md:w-44">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="h-10 text-xs bg-white border-slate-200">
                    <div className="flex items-center gap-2">
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

            </div>
          </CardContent>
        </Card>

        {/* إحصائيات سريعة ملخصة */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between">
            <div>
              <span className="text-xs text-muted-foreground block font-medium">إجمالي المقبوضات المعروضة</span>
              <span className="text-xl font-bold text-emerald-700 mt-0.5 block">
                {totalAmountReceived.toLocaleString("ar-SA", { minimumFractionDigits: 2 })} <span className="text-xs font-normal text-muted-foreground">ريال</span>
              </span>
            </div>
            <div className="p-2.5 bg-emerald-50 rounded-lg text-emerald-600">
              <Coins className="h-5 w-5" />
            </div>
          </div>

          <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between">
            <div>
              <span className="text-xs text-muted-foreground block font-medium">سندات معتمدة</span>
              <span className="text-xl font-bold text-blue-700 mt-0.5 block">
                {totalApprovedCount} <span className="text-xs font-normal text-muted-foreground">سند</span>
              </span>
            </div>
            <div className="p-2.5 bg-blue-50 rounded-lg text-blue-600">
              <CheckCircle className="h-5 w-5" />
            </div>
          </div>

          <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between">
            <div>
              <span className="text-xs text-muted-foreground block font-medium">سندات قيد الاعتماد</span>
              <span className="text-xl font-bold text-amber-700 mt-0.5 block">
                {totalPendingCount} <span className="text-xs font-normal text-muted-foreground">سند</span>
              </span>
            </div>
            <div className="p-2.5 bg-amber-50 rounded-lg text-amber-600">
              <Clock className="h-5 w-5" />
            </div>
          </div>
        </div>

        {/* عرض المحتوى: عند اختيار مشروع محدد */}
        {selectedProjectId !== "all" ? (
          <div className="space-y-6">
            
            {/* شريط معلومات المشروع المحدد */}
            <Card className="border-emerald-200 bg-emerald-50/40">
              <CardContent className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleSelectProject("all")}
                    className="gap-1.5 text-xs font-bold border-emerald-300 hover:bg-emerald-100"
                  >
                    <ArrowRight className="h-4 w-4" />
                    عرض جميع المشاريع
                  </Button>
                  <div>
                    <h2 className="text-base font-bold text-emerald-950 flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-emerald-700" />
                      مشروع: {currentProject?.name || `مشروع #${selectedProjectId}`}
                    </h2>
                    <p className="text-xs text-muted-foreground font-mono">
                      رقم المشروع: {currentProject?.projectNumber || selectedProjectId}
                    </p>
                  </div>
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

            {/* عرض التاب المالي وسندات القبض الخاصة بالمشروع */}
            <ProjectFinancialsTab projectId={parseInt(selectedProjectId)} />

          </div>
        ) : (
          /* عرض كشف سندات القبض لجميع المشاريع عند عدم اختيار مشروع */
          <Card className="border-slate-200 shadow-2xs">
            <CardHeader className="pb-3 border-b bg-slate-50/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Receipt className="h-5 w-5 text-emerald-600" />
                  سجل كافة سندات القبض ({allVouchers.length})
                </CardTitle>
                <CardDescription className="text-xs mt-0.5">
                  جدول مجمع لجميع سندات القبض المسجلة في النظام. اضغط "تسجيل سند قبض جديد" لإضافة دفعة لأي مشروع.
                </CardDescription>
              </div>

              <Button
                onClick={openAddVoucherModal}
                size="sm"
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-1.5 text-xs"
              >
                <Plus className="h-4 w-4" />
                تسجيل سند قبض جديد
              </Button>
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
                          <TableCell className="font-bold text-primary text-xs font-mono">
                            {voucher.voucherNumber}
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

                          <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate" title={voucher.notes || "-"}>
                            {voucher.notes || "-"}
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
                                size="sm"
                                onClick={() => handleSelectProject(voucher.projectId.toString())}
                                className="h-7 px-2 text-[11px] text-emerald-700 hover:bg-emerald-50 font-bold gap-1"
                                title="إدارة وتفاصيل سندات المشروع"
                              >
                                <Eye className="h-3.5 w-3.5" />
                                إدارة السندات
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => navigate(`/receipt-vouchers/${voucher.id}/print`)}
                                className="h-7 w-7 text-slate-600 hover:text-emerald-800 hover:bg-emerald-50"
                                title="معاينة وطباعة سند القبض"
                              >
                                <Printer className="h-3.5 w-3.5" />
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
        )}

        {/* نافذة المودال المباشرة لتسجيل سند قبض جديد لجهة داعمة ومشروع محدد */}
        <Dialog open={isAddVoucherModalOpen} onOpenChange={setIsAddVoucherModalOpen}>
          <DialogContent className="dir-rtl text-right max-w-md">
            <DialogHeader className="text-right">
              <DialogTitle className="text-base font-bold flex items-center gap-2 text-right">
                <Receipt className="h-5 w-5 text-emerald-600" />
                تسجيل سند قبض جديد
              </DialogTitle>
              <DialogDescription className="text-xs text-right mt-1">
                اختر المشروع والجهة الداعمة وأدخل تفاصيل الدفعة المقبوضة
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2 text-xs text-right">
              
              {/* اختيار المشروع */}
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-800">المشروع المطلوب *</Label>
                <Select value={modalProjectId} onValueChange={setModalProjectId}>
                  <SelectTrigger className="h-10 text-xs">
                    <SelectValue placeholder="اختر المشروع..." />
                  </SelectTrigger>
                  <SelectContent dir="rtl" className="max-h-60">
                    {projectsList.map((p) => (
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

              {/* اختيار الداعم للمشروع */}
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-800">الجهة الداعمة / المسدد *</Label>
                {projectSupporters.length > 0 ? (
                  <Select
                    value={modalPayerName}
                    onValueChange={(val) => {
                      setModalPayerName(val);
                      if (val !== "اخرى") setCustomPayerName("");
                    }}
                  >
                    <SelectTrigger className="h-10 text-xs">
                      <SelectValue placeholder="اختر الداعم المسجل أو أدخل جهة أخرى..." />
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
                    placeholder="اسم الجهة الداعمة / القابض منه..."
                    className="h-10 text-xs"
                  />
                )}
              </div>

              {/* إدخال اسم داعم مخصص عند اختيار اخرى */}
              {modalPayerName === "اخرى" && (
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-blue-900">اسم الجهة الداعمة المخصصة *</Label>
                  <Input
                    value={customPayerName}
                    onChange={(e) => setCustomPayerName(e.target.value)}
                    placeholder="أدخل اسم الداعم..."
                    className="h-10 text-xs"
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
                  className="h-10 font-bold text-emerald-800 text-left [direction:ltr]"
                />
              </div>

              {/* تاريخ القبض */}
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-800">تاريخ القبض *</Label>
                <Input
                  type="date"
                  value={modalDate}
                  onChange={(e) => setModalDate(e.target.value)}
                  className="h-10 text-xs"
                />
              </div>

              {/* البيان / الملاحظات */}
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-800">وذلك مقابل (سبب المقبوض / البيان) *</Label>
                <Textarea
                  value={modalNotes}
                  onChange={(e) => setModalNotes(e.target.value)}
                  placeholder="أدخل البيان أو سبب القبض..."
                  rows={2}
                />
              </div>

              {/* طريقة الدفع والرقم المرجعي (اختياري) */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                <div className="space-y-1.5">
                  <Label className="text-[11px] text-muted-foreground">طريقة الدفع</Label>
                  <Select value={modalPaymentMethod} onValueChange={setModalPaymentMethod}>
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent dir="rtl">
                      <SelectItem value="bank_transfer">تحويل بنكي</SelectItem>
                      <SelectItem value="check">شيك</SelectItem>
                      <SelectItem value="cash">نقداً</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[11px] text-muted-foreground">الرقم المرجعي (اختياري)</Label>
                  <Input
                    value={modalRefNumber}
                    onChange={(e) => setModalRefNumber(e.target.value)}
                    placeholder="رقم العملية / الحوالة"
                    className="h-9 text-xs"
                  />
                </div>
              </div>

            </div>

            <DialogFooter className="flex justify-between items-center gap-2 sm:justify-start pt-2 border-t">
              <Button
                type="button"
                onClick={handleSaveVoucher}
                disabled={createVoucherMutation.isPending}
                className="bg-emerald-600 hover:bg-emerald-700 font-bold text-xs"
              >
                {createVoucherMutation.isPending && (
                  <Loader2 className="h-3.5 w-3.5 ml-2 animate-spin" />
                )}
                تسجيل سند القبض
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

      </div>
    </DashboardLayout>
  );
}
