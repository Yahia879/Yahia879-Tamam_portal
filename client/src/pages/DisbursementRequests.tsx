import { useState, useEffect, useMemo } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DisbursementStatusBadge } from "@/components/DisbursementStatusBadge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Plus,
  Eye,
  CheckCircle,
  XCircle,
  Clock,
  Banknote,
  FileText,
  AlertCircle,
  Search,
  Filter,
  Building2,
  CreditCard,
  Printer,
  Download,
  ChevronLeft,
} from "lucide-react";
import { toast } from "sonner";

const STATUS_MAP: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  draft: { label: "مسودة", variant: "secondary" },
  pending: { label: "قيد المراجعة", variant: "default" },
  approved: { label: "معتمد", variant: "outline" },
  rejected: { label: "مرفوض", variant: "destructive" },
  paid: { label: "مصروف", variant: "outline" },
};

const PAYMENT_TYPE_MAP: Record<string, string> = {
  advance: "دفعة مقدمة",
  progress: "دفعة مرحلية",
  final: "دفعة نهائية",
  retention: "ضمان حسن التنفيذ",
};

const PAYMENT_METHOD_MAP: Record<string, string> = {
  bank_transfer: "تحويل بنكي",
  check: "إصدار شيك",
  custody: "صرف من العهدة",
};

// دالة تحويل الأرقام إلى نص عربي
function numberToArabicText(num: number): string {
  if (num === 0) return "صفر ريال";
  
  const ones = ["", "واحد", "اثنان", "ثلاثة", "أربعة", "خمسة", "ستة", "سبعة", "ثمانية", "تسعة"];
  const tens = ["", "عشر", "عشرون", "ثلاثون", "أربعون", "خمسون", "ستون", "سبعون", "ثمانون", "تسعون"];
  const teens = ["عشرة", "أحد عشر", "اثنا عشر", "ثلاثة عشر", "أربعة عشر", "خمسة عشر", "ستة عشر", "سبعة عشر", "ثمانية عشر", "تسعة عشر"];
  const hundreds = ["", "مائة", "مائتان", "ثلاثمائة", "أربعمائة", "خمسمائة", "ستمائة", "سبعمائة", "ثمانمائة", "تسعمائة"];

  function convertHundreds(n: number): string {
    if (n === 0) return "";
    if (n < 10) return ones[n];
    if (n < 20) return teens[n - 10];
    if (n < 100) {
      const t = Math.floor(n / 10);
      const o = n % 10;
      return o ? `${ones[o]} و${tens[t]}` : tens[t];
    }
    const h = Math.floor(n / 100);
    const rest = n % 100;
    return rest ? `${hundreds[h]} و${convertHundreds(rest)}` : hundreds[h];
  }

  function convertThousands(n: number): string {
    if (n < 1000) return convertHundreds(n);
    const thousands = Math.floor(n / 1000);
    const rest = n % 1000;
    let result = "";
    if (thousands === 1) result = "ألف";
    else if (thousands === 2) result = "ألفان";
    else if (thousands >= 3 && thousands <= 10) result = `${ones[thousands]} آلاف`;
    else result = `${convertHundreds(thousands)} ألف`;
    return rest ? `${result} و${convertHundreds(rest)}` : result;
  }

  function convertMillions(n: number): string {
    if (n < 1000000) return convertThousands(n);
    const millions = Math.floor(n / 1000000);
    const rest = n % 1000000;
    let result = "";
    if (millions === 1) result = "مليون";
    else if (millions === 2) result = "مليونان";
    else if (millions >= 3 && millions <= 10) result = `${ones[millions]} ملايين`;
    else result = `${convertThousands(millions)} مليون`;
    return rest ? `${result} و${convertThousands(rest)}` : result;
  }

  return `فقط ${convertMillions(Math.floor(num))} ريال`;
}

export default function DisbursementRequests() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [activeTab, setActiveTab] = useState("requests");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("pending");
  const [projectFilter, setProjectFilter] = useState<string>("all");
  const [paymentTypeFilter, setPaymentTypeFilter] = useState<string>("all");
  
  const [page, setPage] = useState(1);
  const limit = 10;
  
  // نوافذ الحوار
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [showApproveDialog, setShowApproveDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [showCreateOrderDialog, setShowCreateOrderDialog] = useState(false);
  const [showOrderPreviewDialog, setShowOrderPreviewDialog] = useState(false);
  
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [approvalNotes, setApprovalNotes] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");
  
  // بيانات المشروع المختار
  const [selectedProjectData, setSelectedProjectData] = useState<any>(null);
  
  // بيانات طلب صرف جديد
  const [newRequest, setNewRequest] = useState({
    projectId: 0,
    contractId: 0,
    title: "",
    description: "",
    amount: "",
    paymentType: "progress" as "advance" | "progress" | "final" | "retention",
    completionPercentage: "",
  });
  
  // بيانات أمر صرف جديد
  const [newOrder, setNewOrder] = useState({
    beneficiaryName: "",
    beneficiaryBank: "",
    beneficiaryIban: "",
    beneficiaryAccountName: "",
    sadadNumber: "",
    billerCode: "",
    paymentMethod: "bank_transfer" as "bank_transfer" | "check" | "custody",
  });

  // استعلامات البيانات
  const { data: requestsData, refetch: refetchRequests } = trpc.disbursements.listRequests.useQuery({
    status: statusFilter !== "all" ? statusFilter as any : undefined,
    search: searchTerm || undefined,
    page,
    limit,
  });
  
  const { data: ordersData, refetch: refetchOrders } = trpc.disbursements.listOrders.useQuery({});
  
  const { data: statsData } = trpc.disbursements.getStats.useQuery();
  
  // استخدام endpoint جديد للمشاريع مع بيانات العقد
  const { data: projectsWithContractsData } = trpc.disbursements.getProjectsWithContractDetails.useQuery();

  const { data: allReports } = trpc.progressReports.list.useQuery();

  // Mutations
  const createRequestMutation = trpc.disbursements.createRequest.useMutation({
    onSuccess: () => {
      toast.success("تم إنشاء طلب الصرف بنجاح");
      setShowCreateDialog(false);
      resetNewRequest();
      refetchRequests();
    },
    onError: (error) => {
      toast.error(error.message || "حدث خطأ أثناء إنشاء طلب الصرف");
    },
  });

  const approveRequestMutation = trpc.disbursements.approveRequest.useMutation({
    onSuccess: () => {
      toast.success("تم اعتماد طلب الصرف بنجاح");
      setShowApproveDialog(false);
      setApprovalNotes("");
      refetchRequests();
    },
    onError: (error) => {
      toast.error(error.message || "حدث خطأ أثناء اعتماد طلب الصرف");
    },
  });

  const rejectRequestMutation = trpc.disbursements.rejectRequest.useMutation({
    onSuccess: () => {
      toast.success("تم رفض طلب الصرف");
      setShowRejectDialog(false);
      setRejectionReason("");
      refetchRequests();
    },
    onError: (error) => {
      toast.error(error.message || "حدث خطأ أثناء رفض طلب الصرف");
    },
  });

  const createOrderMutation = trpc.disbursements.createOrder.useMutation({
    onSuccess: () => {
      toast.success("تم إنشاء أمر الصرف بنجاح وتم توجيهك لقسم أوامر الصرف");
      setShowCreateOrderDialog(false);
      resetNewOrder();
      refetchOrders();
      refetchRequests();
      navigate("/disbursement-orders");
    },
    onError: (error) => {
      toast.error(error.message || "حدث خطأ أثناء إنشاء أمر الصرف");
    },
  });

  const approveOrderMutation = trpc.disbursements.approveOrder.useMutation({
    onSuccess: () => {
      toast.success("تم اعتماد أمر الصرف بنجاح");
      refetchOrders();
    },
    onError: (error) => {
      toast.error(error.message || "حدث خطأ أثناء اعتماد أمر الصرف");
    },
  });

  const executeOrderMutation = trpc.disbursements.executeOrder.useMutation({
    onSuccess: () => {
      toast.success("تم تنفيذ أمر الصرف بنجاح");
      refetchOrders();
      refetchRequests();
    },
    onError: (error) => {
      toast.error(error.message || "حدث خطأ أثناء تنفيذ أمر الصرف");
    },
  });

  // إعادة تعيين نموذج طلب الصرف
  const resetNewRequest = () => {
    setNewRequest({
      projectId: 0,
      contractId: 0,
      title: "",
      description: "",
      amount: "",
      paymentType: "progress",
      completionPercentage: "",
    });
    setSelectedProjectData(null);
  };

  // إعادة تعيين نموذج أمر الصرف
  const resetNewOrder = () => {
    setNewOrder({
      beneficiaryName: "",
      beneficiaryBank: "",
      beneficiaryIban: "",
      beneficiaryAccountName: "",
      sadadNumber: "",
      billerCode: "",
      paymentMethod: "bank_transfer",
    });
  };

  // عند اختيار مشروع، تعبئة البيانات تلقائياً
  const handleProjectSelect = (projectId: string) => {
    const project = projectsWithContractsData?.projects?.find(
      (p: any) => p.projectId.toString() === projectId
    );
    
    if (project) {
      setSelectedProjectData(project);
      setNewRequest({
        ...newRequest,
        projectId: project.projectId,
        contractId: project.contractId,
        description: project.contractTitle || "",
      });
      
      // تعبئة بيانات المورد في أمر الصرف
      setNewOrder({
        ...newOrder,
        beneficiaryName: project.supplierName || "",
        beneficiaryBank: project.supplierBank || "",
        beneficiaryIban: project.supplierIban || "",
        beneficiaryAccountName: project.supplierAccountName || "",
      });
    }
  };

  // التحقق من الصلاحيات
  const canCreateRequest = ["super_admin", "system_admin", "projects_office", "project_manager"].includes(user?.role || "");
  const canApproveRequest = ["super_admin", "system_admin", "general_manager", "financial"].includes(user?.role || "");
  const canCreateOrder = ["super_admin", "system_admin", "financial"].includes(user?.role || "");
  const canApproveOrder = ["super_admin", "system_admin", "general_manager"].includes(user?.role || "");
  const canExecuteOrder = ["super_admin", "system_admin", "financial"].includes(user?.role || "");

  const handleCreateRequest = () => {
    if (!newRequest.projectId || !newRequest.title || !newRequest.amount) {
      toast.error("يرجى ملء جميع الحقول المطلوبة");
      return;
    }
    createRequestMutation.mutate({
      projectId: newRequest.projectId,
      contractId: newRequest.contractId || undefined,
      title: newRequest.title,
      description: newRequest.description,
      amount: parseFloat(newRequest.amount),
      paymentType: newRequest.paymentType,
      completionPercentage: newRequest.completionPercentage ? parseInt(newRequest.completionPercentage) : undefined,
    });
  };

  const handleCreateOrder = () => {
    if (!selectedRequest || !newOrder.beneficiaryName) {
      toast.error("يرجى ملء جميع الحقول المطلوبة");
      return;
    }
    createOrderMutation.mutate({
      disbursementRequestId: selectedRequest.id,
      ...newOrder,
    });
  };

  // فتح نافذة إنشاء أمر صرف مع تعبئة البيانات
  const openCreateOrderDialog = (request: any) => {
    setSelectedRequest(request);
    
    // البحث عن بيانات المشروع والمورد
    const project = projectsWithContractsData?.projects?.find(
      (p: any) => p.projectId === request.projectId
    );
    
    if (project) {
      setSelectedProjectData(project);
      setNewOrder({
        beneficiaryName: project.supplierName || "",
        beneficiaryBank: project.supplierBank || "",
        beneficiaryIban: project.supplierIban || "",
        beneficiaryAccountName: project.supplierAccountName || "",
        sadadNumber: "",
        billerCode: "",
        paymentMethod: "bank_transfer",
      });
    }
    
    setShowCreateOrderDialog(true);
  };

  // تحويل مباشر في الخلفية إلى أمر صرف وتوجيه المستخدم إلى قسم أوامر الصرف
  const handleDirectCreateOrder = async (request: any) => {
    try {
      if (request.status === "pending") {
        await approveRequestMutation.mutateAsync({ id: request.id });
      }

      // البحث عن بيانات المشروع والمورد
      const project = projectsWithContractsData?.projects?.find(
        (p: any) => p.projectId === request.projectId
      );
      
      const beneficiaryName = project?.supplierName || request.projectName || "مستفيد غير محدد";
      const beneficiaryBank = project?.supplierBank || "";
      const beneficiaryIban = project?.supplierIban || "";
      const beneficiaryAccountName = project?.supplierAccountName || "";

      createOrderMutation.mutate({
        disbursementRequestId: request.id,
        beneficiaryName,
        beneficiaryBank,
        beneficiaryIban,
        beneficiaryAccountName,
        paymentMethod: "bank_transfer",
      });
    } catch (err: any) {
      toast.error(err.message || "حدث خطأ أثناء اعتماد أو تحويل الطلب");
    }
  };

  // إعادة تعيين الصفحة الأولى عند تغيير الفلاتر أو البحث
  useEffect(() => {
    setPage(1);
  }, [searchTerm, statusFilter, paymentTypeFilter]);

  const total = requestsData?.total || 0;
  const totalPages = Math.ceil(total / limit);
  const paginatedRequests = requestsData?.requests || [];

  // تحويل الرقم إلى نص عربي
  const numberToArabicText = (num: number): string => {
    // تبسيط - يمكن استخدام مكتبة متخصصة
    return `فقط ${num.toLocaleString("ar-SA")} ريال سعودي لا غير`;
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* العنوان والإحصائيات */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold">طلبات الصرف</h1>
            <p className="text-muted-foreground">إدارة طلبات الصرف المالية للمشاريع</p>
          </div>
        </div>

        {/* بطاقات الإحصائيات */}
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
          <Card className="border-0 shadow-sm overflow-hidden bg-background hover:shadow-md transition-shadow">
            <CardContent className="p-3 sm:p-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 bg-blue-50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/50 text-blue-600 dark:text-blue-400">
                  <CheckCircle className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground font-semibold">طلبات معتمدة</p>
                  <p className="text-lg sm:text-2xl font-black text-foreground mt-0.5">{statsData?.approvedRequests || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm overflow-hidden bg-background hover:shadow-md transition-shadow">
            <CardContent className="p-3 sm:p-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 bg-purple-50 dark:bg-purple-950/30 border border-purple-100 dark:border-purple-900/50 text-purple-600 dark:text-purple-400">
                  <FileText className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground font-semibold">أوامر قيد الاعتماد</p>
                  <p className="text-lg sm:text-2xl font-black text-foreground mt-0.5">{statsData?.pendingOrders || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm overflow-hidden bg-background hover:shadow-md transition-shadow">
            <CardContent className="p-3 sm:p-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/50 text-emerald-600 dark:text-emerald-400">
                  <Banknote className="w-5 h-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-muted-foreground font-semibold">إجمالي المصروف</p>
                  <p className="text-lg sm:text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-0.5 truncate leading-none">
                    {Number(statsData?.totalPaid || 0).toLocaleString()} <span className="text-[10px] sm:text-xs font-normal text-muted-foreground">ريال</span>
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* طلبات الصرف */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="hidden">
            <TabsTrigger value="requests">طلبات الصرف</TabsTrigger>
          </TabsList>

          {/* طلبات الصرف */}
          <TabsContent value="requests" className="space-y-4 pt-4">
            {/* الفلاتر */}
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
              <div className="relative flex-1">
                <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="بحث برقم الطلب أو العنوان أو المشروع..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pr-10 text-right font-medium"
                  dir="rtl"
                />
              </div>
              <div className="flex w-full lg:w-auto">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full lg:w-[180px]">
                    <Filter className="ml-2 h-4 w-4" />
                    <SelectValue placeholder="الحالة" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">قيد الاعتماد</SelectItem>
                    <SelectItem value="approved">معتمد</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* جدول طلبات الصرف - Desktop & Card View - Mobile */}
            <Card className="border-0 shadow-sm overflow-hidden">
              <CardContent className="p-0">
                {/* Desktop View Table */}
                <div className="hidden md:block overflow-x-auto">
                  <Table dir="rtl">
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-right">رقم الطلب</TableHead>
                        <TableHead className="text-right">العنوان</TableHead>
                        <TableHead className="text-right">المشروع</TableHead>
                        <TableHead className="text-right">المبلغ</TableHead>
                        <TableHead className="text-right">الحالة</TableHead>
                        <TableHead className="text-right">التاريخ</TableHead>
                        <TableHead className="text-right">الإجراءات</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedRequests.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                            لا توجد طلبات صرف
                          </TableCell>
                        </TableRow>
                      ) : (
                        paginatedRequests.map((request) => {
                          const correspondingReport = allReports?.find((report: any) => 
                            report.projectId === request.projectId && 
                            (request.contractPaymentId ? (
                              (() => {
                                const paymentIdMatch = (report.workSummary || "").match(/\[معرف الدفعة:\s*([^\]]+)\]/);
                                const parsedId = paymentIdMatch ? parseInt(paymentIdMatch[1]) : NaN;
                                return parsedId === request.contractPaymentId;
                              })()
                            ) : false)
                          );

                          return (
                            <TableRow key={request.id}>
                              <TableCell className="font-mono text-xs text-right">{request.requestNumber}</TableCell>
                              <TableCell className="max-w-[200px] truncate text-right">{request.title}</TableCell>
                              <TableCell className="max-w-[200px] truncate text-right">{request.projectName}</TableCell>
                              <TableCell className="whitespace-nowrap text-right">{Number(request.amount).toLocaleString()} ريال</TableCell>
                              <TableCell className="text-right">
                                <DisbursementStatusBadge 
                                  status={request.status as any} 
                                  type="request" 
                                />
                              </TableCell>
                              <TableCell className="whitespace-nowrap text-right">
                                {request.requestedAt
                                  ? new Date(request.requestedAt).toLocaleDateString("ar-SA")
                                  : "-"}
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex flex-wrap gap-2 justify-start items-center">
                                  {correspondingReport && (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="h-8 px-2 text-xs text-blue-600 border-blue-200 hover:bg-blue-50 dark:border-blue-900/50 dark:text-blue-400 font-semibold"
                                      onClick={() => navigate(`/progress-reports/${correspondingReport.id}/print`)}
                                    >
                                      <FileText className="ml-1 h-3.5 w-3.5" />
                                      عرض تقرير الإنجاز
                                    </Button>
                                  )}

                                  {canCreateOrder && (request.status === "approved" || request.status === "pending") && (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="h-8 px-2 text-xs text-emerald-600 border-emerald-200 hover:bg-emerald-50 dark:border-emerald-900/50 dark:text-emerald-400 font-semibold"
                                      onClick={() => handleDirectCreateOrder(request)}
                                    >
                                      <Banknote className="ml-1 h-3.5 w-3.5" />
                                      تحويل إلى أمر صرف
                                    </Button>
                                  )}
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })
                      )}
                    </TableBody>
                  </Table>
                </div>

                {/* Mobile View Cards */}
                <div className="md:hidden divide-y divide-border">
                  {paginatedRequests.length === 0 ? (
                    <div className="p-8 text-center text-muted-foreground">لا توجد طلبات صرف</div>
                  ) : (
                    paginatedRequests.map((request) => {
                      const correspondingReport = allReports?.find((report: any) => 
                        report.projectId === request.projectId && 
                        (request.contractPaymentId ? (
                          (() => {
                            const paymentIdMatch = (report.workSummary || "").match(/\[معرف الدفعة:\s*([^\]]+)\]/);
                            const parsedId = paymentIdMatch ? parseInt(paymentIdMatch[1]) : NaN;
                            return parsedId === request.contractPaymentId;
                          })()
                        ) : false)
                      );

                      return (
                        <div key={request.id} className="p-4 space-y-4">
                          <div className="flex items-start justify-between">
                            <div className="min-w-0">
                              <p className="font-mono text-[10px] text-muted-foreground">{request.requestNumber}</p>
                              <p className="font-bold text-sm truncate">{request.title}</p>
                              <p className="text-xs text-muted-foreground truncate">{request.projectName}</p>
                            </div>
                            <DisbursementStatusBadge 
                              status={request.status as any} 
                              type="request" 
                            />
                          </div>

                          <div>
                            <p className="text-[10px] text-muted-foreground mb-1">المبلغ</p>
                            <p className="text-sm font-semibold">{Number(request.amount).toLocaleString()} ريال</p>
                          </div>

                          <div className="pt-2 border-t border-border/50 space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] text-muted-foreground">
                                {request.requestedAt ? new Date(request.requestedAt).toLocaleDateString("ar-SA") : "-"}
                              </span>
                            </div>

                            <div className="flex flex-wrap gap-2 w-full">


                              {correspondingReport && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-8 px-2 text-xs text-blue-600 border-blue-200 hover:bg-blue-50 dark:border-blue-900/50 dark:text-blue-400 font-semibold flex-1"
                                  onClick={() => navigate(`/progress-reports/${correspondingReport.id}/print`)}
                                >
                                  <FileText className="ml-1 h-3.5 w-3.5" />
                                  عرض تقرير الإنجاز
                                </Button>
                              )}

                              {canCreateOrder && (request.status === "approved" || request.status === "pending") && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-8 px-2 text-xs text-emerald-600 border-emerald-200 hover:bg-emerald-50 dark:border-emerald-900/50 dark:text-emerald-400 font-semibold flex-1"
                                  onClick={() => handleDirectCreateOrder(request)}
                                >
                                  <Banknote className="ml-1 h-3.5 w-3.5" />
                                  تحويل إلى أمر صرف
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Footer with Pagination */}
                <div className="px-4 py-4 bg-muted/20 border-t flex flex-col items-center justify-center gap-4">
                  <div className="text-[11px] md:text-xs text-muted-foreground text-center">
                    يعرض {total > 0 ? (page - 1) * limit + 1 : 0} - {Math.min(page * limit, total)} من أصل {total} طلب صرف
                  </div>
                  
                  {totalPages > 1 && (
                    <div className="flex items-center gap-1.5 overflow-x-auto max-w-full py-1">
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8 shrink-0"
                        onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
                        disabled={page === 1}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => {
                        if (
                          totalPages <= 5 ||
                          p === 1 ||
                          p === totalPages ||
                          (p >= page - 1 && p <= page + 1)
                        ) {
                          return (
                            <Button
                              key={p}
                              variant={page === p ? "default" : "outline"}
                              size="sm"
                              className={`h-8 min-w-[32px] px-2 text-[11px] shrink-0 ${page === p ? 'gradient-primary text-white border-0' : ''}`}
                              onClick={() => setPage(p)}
                            >
                              {p}
                            </Button>
                          );
                        }
                        
                        if (p === 2 || p === totalPages - 1) {
                          return (
                            <span key={p} className="text-muted-foreground text-xs px-1">
                              ...
                            </span>
                          );
                        }
                        
                        return null;
                      })}
                      
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8 shrink-0"
                        onClick={() => setPage((prev) => Math.min(prev + 1, totalPages))}
                        disabled={page === totalPages}
                      >
                        <ChevronLeft className="h-4 w-4 rotate-180" />
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* أوامر الصرف */}
          <TabsContent value="orders" className="space-y-4">
            <Card className="border-0 shadow-sm overflow-hidden">
              <CardContent className="p-0">
                {/* Desktop View Table */}
                <div className="hidden md:block overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>رقم الأمر</TableHead>
                        <TableHead>طلب الصرف</TableHead>
                        <TableHead>المشروع</TableHead>
                        <TableHead>المستفيد</TableHead>
                        <TableHead>المبلغ</TableHead>
                        <TableHead>طريقة الدفع</TableHead>
                        <TableHead>الحالة</TableHead>
                        <TableHead>الإجراءات</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {ordersData?.orders?.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                            لا توجد أوامر صرف
                          </TableCell>
                        </TableRow>
                      ) : (
                        ordersData?.orders?.map((order) => (
                          <TableRow key={order.id}>
                            <TableCell className="font-mono text-xs">{order.orderNumber}</TableCell>
                            <TableCell className="text-xs">{order.requestNumber}</TableCell>
                            <TableCell className="max-w-[150px] truncate">{order.projectName}</TableCell>
                            <TableCell className="max-w-[150px] truncate">{order.beneficiaryName}</TableCell>
                            <TableCell className="whitespace-nowrap">{Number(order.amount).toLocaleString()} ريال</TableCell>
                            <TableCell className="whitespace-nowrap">
                              {PAYMENT_METHOD_MAP[order.paymentMethod || "bank_transfer"]}
                            </TableCell>
                            <TableCell>
                              <DisbursementStatusBadge 
                                status={order.status as any} 
                                type="order" 
                              />
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    setSelectedOrder(order);
                                    setShowOrderPreviewDialog(true);
                                  }}
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                                {canApproveOrder && order.status === "pending" && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-green-600"
                                    onClick={() => approveOrderMutation.mutate({ id: order.id })}
                                  >
                                    <CheckCircle className="h-4 w-4" />
                                  </Button>
                                )}
                                {canExecuteOrder && order.status === "approved" && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-blue-600"
                                    onClick={() => executeOrderMutation.mutate({ id: order.id })}
                                    title="تنفيذ الصرف"
                                  >
                                    <Banknote className="h-4 w-4" />
                                  </Button>
                                )}
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => navigate(`/disbursements/orders/${order.id}/print`)}
                                  title="طباعة أمر الصرف"
                                >
                                  <Printer className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>

                {/* Mobile View Cards */}
                <div className="md:hidden divide-y divide-border">
                  {ordersData?.orders?.length === 0 ? (
                    <div className="p-8 text-center text-muted-foreground">لا توجد أوامر صرف</div>
                  ) : (
                    ordersData?.orders?.map((order) => (
                      <div key={order.id} className="p-4 space-y-4">
                        <div className="flex items-start justify-between">
                          <div className="min-w-0">
                            <p className="font-mono text-[10px] text-muted-foreground">{order.orderNumber}</p>
                            <p className="font-bold text-sm truncate">{order.beneficiaryName}</p>
                            <p className="text-[10px] text-muted-foreground truncate">لطلب: {order.requestNumber}</p>
                          </div>
                          <DisbursementStatusBadge 
                            status={order.status as any} 
                            type="order" 
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-[10px] text-muted-foreground mb-1">المبلغ</p>
                            <p className="text-sm font-semibold">{Number(order.amount).toLocaleString()} ريال</p>
                          </div>
                          <div>
                            <p className="text-[10px] text-muted-foreground mb-1">طريقة الدفع</p>
                            <p className="text-xs">{PAYMENT_METHOD_MAP[order.paymentMethod || "bank_transfer"]}</p>
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-2 border-t border-border/50">
                          <p className="text-[10px] text-muted-foreground truncate max-w-[150px]">{order.projectName}</p>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 w-8 p-0"
                              onClick={() => {
                                setSelectedOrder(order);
                                setShowOrderPreviewDialog(true);
                              }}
                            >
                              <Eye className="h-3.5 w-3.5" />
                            </Button>
                            {canApproveOrder && order.status === "pending" && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-8 w-8 p-0 text-green-600 border-green-200"
                                onClick={() => approveOrderMutation.mutate({ id: order.id })}
                              >
                                <CheckCircle className="h-3.5 w-3.5" />
                              </Button>
                            )}
                            {canExecuteOrder && order.status === "approved" && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-8 w-8 p-0 text-blue-600 border-blue-200"
                                onClick={() => executeOrderMutation.mutate({ id: order.id })}
                              >
                                <Banknote className="h-3.5 w-3.5" />
                              </Button>
                            )}
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 w-8 p-0"
                              onClick={() => navigate(`/disbursements/orders/${order.id}/print`)}
                            >
                              <Printer className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* نافذة إنشاء طلب صرف - محسنة */}
        <Dialog open={showCreateDialog} onOpenChange={(open) => {
          setShowCreateDialog(open);
          if (!open) resetNewRequest();
        }}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>طلب صرف جديد</DialogTitle>
              <DialogDescription>اختر المشروع وسيتم تعبئة البيانات تلقائياً</DialogDescription>
            </DialogHeader>
            
            <div className="space-y-6">
              {/* اختيار المشروع */}
              <div className="space-y-2">
                <Label className="text-base font-semibold">المشروع *</Label>
                <Select
                  value={newRequest.projectId ? newRequest.projectId.toString() : ""}
                  onValueChange={handleProjectSelect}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="اختر المشروع" />
                  </SelectTrigger>
                  <SelectContent>
                    {projectsWithContractsData?.projects?.map((project: any) => (
                      <SelectItem key={project.projectId} value={project.projectId.toString()}>
                        {project.projectNumber} - {project.projectName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* بيانات المشروع المختار */}
              {selectedProjectData && (
                <Card className="bg-muted/50">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Building2 className="h-4 w-4" />
                      بيانات المشروع والعقد
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">اسم المشروع:</span>
                        <p className="font-medium">{selectedProjectData.projectName}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">رقم المشروع:</span>
                        <p className="font-medium">{selectedProjectData.projectNumber}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">وصف الأعمال:</span>
                        <p className="font-medium">{selectedProjectData.contractTitle || "-"}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">إجمالي قيمة العقد:</span>
                        <p className="font-medium text-primary">
                          {Number(selectedProjectData.contractAmount || 0).toLocaleString()} ريال
                        </p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">إجمالي ما تم دفعه:</span>
                        <p className="font-medium text-green-600">
                          {Number(selectedProjectData.totalPaid || 0).toLocaleString()} ريال
                        </p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">المبلغ المتبقي:</span>
                        <p className="font-medium text-orange-600">
                          {Number(selectedProjectData.remainingAmount || 0).toLocaleString()} ريال
                        </p>
                      </div>
                    </div>
                    
                    <Separator />
                    
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">اسم المورد:</span>
                        <p className="font-medium">{selectedProjectData.supplierName || "-"}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">البنك:</span>
                        <p className="font-medium">{selectedProjectData.supplierBank || "-"}</p>
                      </div>
                      <div className="col-span-2">
                        <span className="text-muted-foreground">رقم الآيبان:</span>
                        <p className="font-medium font-mono" dir="ltr">
                          {selectedProjectData.supplierIban || "-"}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              <Separator />

              {/* بيانات طلب الصرف */}
              <div className="space-y-4">
                <Label className="text-base font-semibold">بيانات طلب الصرف</Label>
                
                <div className="space-y-2">
                  <Label>عنوان الطلب *</Label>
                  <Input
                    value={newRequest.title}
                    onChange={(e) => setNewRequest({ ...newRequest, title: e.target.value })}
                    placeholder="مثال: دفعة مرحلية للأعمال الإنشائية"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>الوصف</Label>
                  <Textarea
                    value={newRequest.description}
                    onChange={(e) => setNewRequest({ ...newRequest, description: e.target.value })}
                    placeholder="تفاصيل إضافية عن طلب الصرف..."
                    rows={3}
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>الدفعة المطلوبة (ريال) *</Label>
                    <Input
                      type="number"
                      value={newRequest.amount}
                      onChange={(e) => setNewRequest({ ...newRequest, amount: e.target.value })}
                      placeholder="0"
                    />
                    {selectedProjectData && newRequest.amount && (
                      <p className="text-xs text-muted-foreground">
                        المتبقي بعد هذه الدفعة: {(Number(selectedProjectData.remainingAmount || 0) - Number(newRequest.amount || 0)).toLocaleString()} ريال
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>نوع الدفعة</Label>
                    <Select
                      value={newRequest.paymentType}
                      onValueChange={(v: any) => setNewRequest({ ...newRequest, paymentType: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="advance">دفعة مقدمة</SelectItem>
                        <SelectItem value="progress">دفعة مرحلية</SelectItem>
                        <SelectItem value="final">دفعة نهائية</SelectItem>
                        <SelectItem value="retention">ضمان حسن التنفيذ</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label>نسبة الإنجاز المرتبطة (%)</Label>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    value={newRequest.completionPercentage}
                    onChange={(e) => setNewRequest({ ...newRequest, completionPercentage: e.target.value })}
                    placeholder="مثال: 30"
                  />
                </div>
              </div>
            </div>
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                إلغاء
              </Button>
              <Button 
                onClick={handleCreateRequest} 
                disabled={createRequestMutation.isPending || !newRequest.projectId}
              >
                {createRequestMutation.isPending ? "جاري الإنشاء..." : "إنشاء الطلب"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* نافذة تفاصيل طلب الصرف */}
        <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>تفاصيل طلب الصرف</DialogTitle>
              <DialogDescription>
                طلب رقم {selectedRequest?.requestNumber}
              </DialogDescription>
            </DialogHeader>
            {selectedRequest && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground">العنوان</Label>
                    <p className="font-medium">{selectedRequest.title}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">المشروع</Label>
                    <p className="font-medium">{selectedRequest.projectName}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">المبلغ</Label>
                    <p className="font-medium text-primary">
                      {Number(selectedRequest.amount).toLocaleString()} ريال
                    </p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">نوع الدفعة</Label>
                    <p className="font-medium">
                      {PAYMENT_TYPE_MAP[selectedRequest.paymentType || "progress"]}
                    </p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">الحالة</Label>
                    <Badge variant={STATUS_MAP[selectedRequest.status || "pending"]?.variant}>
                      {STATUS_MAP[selectedRequest.status || "pending"]?.label}
                    </Badge>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">تاريخ الطلب</Label>
                    <p className="font-medium">
                      {selectedRequest.requestedAt
                        ? new Date(selectedRequest.requestedAt).toLocaleDateString("ar-SA")
                        : "-"}
                    </p>
                  </div>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowDetailsDialog(false)}>
                إغلاق
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* نافذة اعتماد طلب الصرف */}
        <Dialog open={showApproveDialog} onOpenChange={setShowApproveDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>اعتماد طلب الصرف</DialogTitle>
              <DialogDescription>
                هل تريد اعتماد طلب الصرف رقم {selectedRequest?.requestNumber}؟
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="rounded-lg bg-muted p-4">
                <p className="font-medium">{selectedRequest?.title}</p>
                <p className="text-sm text-muted-foreground">
                  المبلغ: {Number(selectedRequest?.amount || 0).toLocaleString()} ريال
                </p>
              </div>
              <div className="space-y-2">
                <Label>ملاحظات (اختياري)</Label>
                <Textarea
                  value={approvalNotes}
                  onChange={(e) => setApprovalNotes(e.target.value)}
                  placeholder="أي ملاحظات على الاعتماد..."
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowApproveDialog(false)}>
                إلغاء
              </Button>
              <Button
                onClick={() =>
                  approveRequestMutation.mutate({
                    id: selectedRequest?.id,
                    notes: approvalNotes,
                  })
                }
                disabled={approveRequestMutation.isPending}
              >
                {approveRequestMutation.isPending ? "جاري الاعتماد..." : "اعتماد"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* نافذة رفض طلب الصرف */}
        <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>رفض طلب الصرف</DialogTitle>
              <DialogDescription>
                هل تريد رفض طلب الصرف رقم {selectedRequest?.requestNumber}؟
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>سبب الرفض *</Label>
                <Textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="يرجى توضيح سبب رفض الطلب..."
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowRejectDialog(false)}>
                إلغاء
              </Button>
              <Button
                variant="destructive"
                onClick={() =>
                  rejectRequestMutation.mutate({
                    id: selectedRequest?.id,
                    reason: rejectionReason,
                  })
                }
                disabled={!rejectionReason || rejectRequestMutation.isPending}
              >
                {rejectRequestMutation.isPending ? "جاري الرفض..." : "رفض"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* نافذة إنشاء أمر صرف - محسنة */}
        <Dialog open={showCreateOrderDialog} onOpenChange={(open) => {
          setShowCreateOrderDialog(open);
          if (!open) resetNewOrder();
        }}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>إنشاء أمر صرف</DialogTitle>
              <DialogDescription>
                إنشاء أمر صرف لطلب رقم {selectedRequest?.requestNumber}
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-6">
              {/* معلومات الطلب */}
              <Card className="bg-muted/50">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">بيانات طلب الصرف</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">العنوان:</span>
                      <p className="font-medium">{selectedRequest?.title}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">المبلغ:</span>
                      <p className="font-medium text-primary">
                        {Number(selectedRequest?.amount || 0).toLocaleString()} ريال
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* خاص بالمشاريع */}
              {selectedProjectData && (
                <Card className="bg-blue-50/50 border-blue-200">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm text-blue-800">خاص بالمشاريع</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">اسم المشروع:</span>
                        <p className="font-medium">{selectedProjectData.projectName}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">الجهة الداعمة:</span>
                        <p className="font-medium">لا يوجد</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">إجمالي قيمة الدعم:</span>
                        <p className="font-medium">0 ريال</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">إجمالي قيمة العقد:</span>
                        <p className="font-medium">
                          {Number(selectedProjectData.contractAmount || 0).toLocaleString()} ريال
                        </p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">إجمالي ما تم دفعه:</span>
                        <p className="font-medium text-green-600">
                          {Number(selectedProjectData.totalPaid || 0).toLocaleString()} ريال
                        </p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">المبلغ المتبقي بعد صرف المبلغ أعلاه:</span>
                        <p className="font-medium text-orange-600">
                          {(Number(selectedProjectData.remainingAmount || 0) - Number(selectedRequest?.amount || 0)).toLocaleString()} ريال
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              <Separator />

              {/* طريقة الدفع */}
              <div className="space-y-4">
                <Label className="text-base font-semibold">طريقة الدفع</Label>
                <Select
                  value={newOrder.paymentMethod}
                  onValueChange={(v: any) => setNewOrder({ ...newOrder, paymentMethod: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bank_transfer">تحويل بنكي</SelectItem>
                    <SelectItem value="check">إصدار شيك</SelectItem>
                    <SelectItem value="custody">صرف من العهدة</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* بيانات التحويل البنكي */}
              {newOrder.paymentMethod === "bank_transfer" && (
                <Card className="bg-green-50/50 border-green-200">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm text-green-800 flex items-center gap-2">
                      <CreditCard className="h-4 w-4" />
                      تحويل بنكي من حساب الجمعية إلى
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>اسم الحساب *</Label>
                        <Input
                          value={newOrder.beneficiaryAccountName || newOrder.beneficiaryName}
                          onChange={(e) => setNewOrder({ ...newOrder, beneficiaryAccountName: e.target.value })}
                          placeholder="اسم صاحب الحساب"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>اسم البنك</Label>
                        <Input
                          value={newOrder.beneficiaryBank}
                          onChange={(e) => setNewOrder({ ...newOrder, beneficiaryBank: e.target.value })}
                          placeholder="مثال: مصرف الراجحي"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>رقم الآيبان</Label>
                      <Input
                        value={newOrder.beneficiaryIban}
                        onChange={(e) => setNewOrder({ ...newOrder, beneficiaryIban: e.target.value })}
                        placeholder="SA..."
                        dir="ltr"
                        className="font-mono"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>رقم سداد</Label>
                        <Input
                          value={newOrder.sadadNumber}
                          onChange={(e) => setNewOrder({ ...newOrder, sadadNumber: e.target.value })}
                          placeholder="رقم سداد (اختياري)"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>رمز المفوتر</Label>
                        <Input
                          value={newOrder.billerCode}
                          onChange={(e) => setNewOrder({ ...newOrder, billerCode: e.target.value })}
                          placeholder="رمز المفوتر (اختياري)"
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* بيانات الشيك */}
              {newOrder.paymentMethod === "check" && (
                <Card className="bg-purple-50/50 border-purple-200">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm text-purple-800">بيانات الشيك</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label>اسم المستفيد *</Label>
                      <Input
                        value={newOrder.beneficiaryName}
                        onChange={(e) => setNewOrder({ ...newOrder, beneficiaryName: e.target.value })}
                        placeholder="اسم المستفيد من الشيك"
                      />
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* صرف من العهدة */}
              {newOrder.paymentMethod === "custody" && (
                <Card className="bg-orange-50/50 border-orange-200">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm text-orange-800">صرف من العهدة</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label>اسم المستلم *</Label>
                      <Input
                        value={newOrder.beneficiaryName}
                        onChange={(e) => setNewOrder({ ...newOrder, beneficiaryName: e.target.value })}
                        placeholder="اسم مستلم المبلغ"
                      />
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCreateOrderDialog(false)}>
                إلغاء
              </Button>
              <Button onClick={handleCreateOrder} disabled={createOrderMutation.isPending}>
                {createOrderMutation.isPending ? "جاري الإنشاء..." : "إنشاء أمر الصرف"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* نافذة معاينة أمر الصرف - حسب القالب */}
        <Dialog open={showOrderPreviewDialog} onOpenChange={setShowOrderPreviewDialog}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto print:max-w-full print:max-h-full print:overflow-visible">
            <DialogHeader className="print:hidden">
              <DialogTitle>معاينة أمر الصرف</DialogTitle>
              <DialogDescription>
                أمر صرف رقم {selectedOrder?.orderNumber}
              </DialogDescription>
            </DialogHeader>
            
            {selectedOrder && (
              <div className="space-y-4 p-6 border rounded-lg bg-white print:border-none print:p-0" id="disbursement-order-print">
                {/* رأس أمر الصرف */}
                <div className="flex justify-between items-start border-b pb-4">
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">رقم أمر الصرف</p>
                    <p className="font-bold text-lg">{selectedOrder.orderNumber}</p>
                  </div>
                  <div className="text-center flex-1">
                    <h2 className="text-2xl font-bold text-primary">
                      أمر صرف | {PAYMENT_METHOD_MAP[selectedOrder.paymentMethod || "bank_transfer"]}
                    </h2>
                  </div>
                  <div className="text-left">
                    <p className="text-xs text-muted-foreground">التاريخ</p>
                    <p className="font-medium">{new Date().toLocaleDateString("ar-SA")}</p>
                  </div>
                </div>

                {/* بيانات الصرف الأساسية */}
                <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="col-span-2">
                      <span className="text-muted-foreground text-sm">اصرفوا للمكرم/</span>
                      <p className="font-bold text-lg">{selectedOrder.beneficiaryName}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground text-sm">رقم طلب الصرف/</span>
                      <p className="font-bold">{selectedOrder.requestNumber}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-muted-foreground text-sm">مبلغ وقدره/ (رقماً)</span>
                      <p className="font-bold text-xl text-primary">
                        {Number(selectedOrder.amount).toLocaleString()} ريال
                      </p>
                    </div>
                    <div>
                      <span className="text-muted-foreground text-sm">(كتابة)</span>
                      <p className="font-medium text-sm">
                        {numberToArabicText(Number(selectedOrder.amount))}
                      </p>
                    </div>
                  </div>
                  <div>
                    <span className="text-muted-foreground text-sm">وذلك مقابل/</span>
                    <p className="font-medium">{selectedOrder.requestTitle || selectedOrder.projectName}</p>
                  </div>
                </div>

                {/* خاص بالمشاريع */}
                <div className="border rounded-lg overflow-hidden">
                  <div className="bg-blue-600 text-white px-4 py-2 font-bold">
                    خاص بالمشاريع
                  </div>
                  <div className="p-4">
                    <table className="w-full text-sm">
                      <tbody>
                        <tr className="border-b">
                          <td className="py-2 text-muted-foreground w-1/3">اسم المشروع</td>
                          <td className="py-2 font-medium">{selectedOrder.projectName}</td>
                        </tr>
                        <tr className="border-b">
                          <td className="py-2 text-muted-foreground">الجهة الداعمة</td>
                          <td className="py-2 font-medium">لا يوجد</td>
                        </tr>
                        <tr className="border-b">
                          <td className="py-2 text-muted-foreground">إجمالي قيمة الدعم</td>
                          <td className="py-2 font-medium">0 ريال</td>
                        </tr>
                        <tr className="border-b">
                          <td className="py-2 text-muted-foreground">إجمالي قيمة العقد</td>
                          <td className="py-2 font-medium">
                            {Number(selectedOrder.contractAmount || 0).toLocaleString()} ريال
                          </td>
                        </tr>
                        <tr className="border-b">
                          <td className="py-2 text-muted-foreground">إجمالي ما تم دفعه</td>
                          <td className="py-2 font-medium text-green-600">
                            {Number(selectedOrder.totalPaid || 0).toLocaleString()} ريال
                          </td>
                        </tr>
                        <tr>
                          <td className="py-2 text-muted-foreground">المبلغ المتبقي بعد صرف المبلغ أعلاه</td>
                          <td className="py-2 font-medium text-orange-600">
                            {Number(selectedOrder.remainingAmount || 0).toLocaleString()} ريال
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* تحويل بنكي */}
                {selectedOrder.paymentMethod === "bank_transfer" && (
                  <div className="border rounded-lg overflow-hidden">
                    <div className="bg-green-600 text-white px-4 py-2 font-bold">
                      تحويل بنكي من حساب الجمعية إلى
                    </div>
                    <div className="p-4">
                      <table className="w-full text-sm">
                        <tbody>
                          <tr className="border-b">
                            <td className="py-2 text-muted-foreground w-1/3">اسم الحساب</td>
                            <td className="py-2 font-medium">{selectedOrder.beneficiaryAccountName || selectedOrder.beneficiaryName}</td>
                          </tr>
                          <tr className="border-b">
                            <td className="py-2 text-muted-foreground">اسم البنك</td>
                            <td className="py-2 font-medium">{selectedOrder.beneficiaryBank || "-"}</td>
                          </tr>
                          <tr className="border-b">
                            <td className="py-2 text-muted-foreground">رقم الآيبان</td>
                            <td className="py-2 font-medium font-mono" dir="ltr">{selectedOrder.beneficiaryIban || "-"}</td>
                          </tr>
                          <tr className="border-b">
                            <td className="py-2 text-muted-foreground">رقم سداد</td>
                            <td className="py-2 font-medium">{selectedOrder.sadadNumber || "-"}</td>
                          </tr>
                          <tr>
                            <td className="py-2 text-muted-foreground">رمز المفوتر</td>
                            <td className="py-2 font-medium">{selectedOrder.billerCode || "-"}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* إصدار شيك */}
                {selectedOrder.paymentMethod === "check" && (
                  <div className="border rounded-lg overflow-hidden">
                    <div className="bg-purple-600 text-white px-4 py-2 font-bold">
                      بيانات الشيك
                    </div>
                    <div className="p-4">
                      <table className="w-full text-sm">
                        <tbody>
                          <tr>
                            <td className="py-2 text-muted-foreground w-1/3">اسم المستفيد</td>
                            <td className="py-2 font-medium">{selectedOrder.beneficiaryName}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* صرف من العهدة */}
                {selectedOrder.paymentMethod === "custody" && (
                  <div className="border rounded-lg overflow-hidden">
                    <div className="bg-orange-600 text-white px-4 py-2 font-bold">
                      صرف من العهدة
                    </div>
                    <div className="p-4">
                      <table className="w-full text-sm">
                        <tbody>
                          <tr>
                            <td className="py-2 text-muted-foreground w-1/3">اسم المستلم</td>
                            <td className="py-2 font-medium">{selectedOrder.beneficiaryName}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* جدول التوقيعات */}
                <div className="border rounded-lg overflow-hidden mt-6">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-100">
                        <th className="py-3 px-4 text-right border-l">الوظيفة</th>
                        <th className="py-3 px-4 text-right border-l">الاسم</th>
                        <th className="py-3 px-4 text-right border-l">التوقيع</th>
                        <th className="py-3 px-4 text-right">التاريخ</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-t">
                        <td className="py-4 px-4 border-l">المحاسب</td>
                        <td className="py-4 px-4 border-l">{selectedOrder.createdByName || "-"}</td>
                        <td className="py-4 px-4 border-l h-16"></td>
                        <td className="py-4 px-4"></td>
                      </tr>
                      <tr className="border-t">
                        <td className="py-4 px-4 border-l">المدير التنفيذي</td>
                        <td className="py-4 px-4 border-l">{selectedOrder.approvedByName || "-"}</td>
                        <td className="py-4 px-4 border-l h-16"></td>
                        <td className="py-4 px-4">
                          {selectedOrder.approvedAt
                            ? new Date(selectedOrder.approvedAt).toLocaleDateString("ar-SA")
                            : ""}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* الحالة */}
                <div className="flex justify-center mt-4">
                  <Badge
                    variant={
                      selectedOrder.status === "executed"
                        ? "outline"
                        : selectedOrder.status === "approved"
                        ? "default"
                        : selectedOrder.status === "rejected"
                        ? "destructive"
                        : "secondary"
                    }
                    className="text-base px-6 py-2"
                  >
                    {selectedOrder.status === "draft"
                      ? "مسودة"
                      : selectedOrder.status === "pending"
                      ? "قيد الاعتماد"
                      : selectedOrder.status === "approved"
                      ? "معتمد"
                      : selectedOrder.status === "rejected"
                      ? "مرفوض"
                      : "منفذ"}
                  </Badge>
                </div>
              </div>
            )}
            
            <DialogFooter className="print:hidden">
              <Button variant="outline" onClick={() => setShowOrderPreviewDialog(false)}>
                إغلاق
              </Button>
              <Button variant="outline" onClick={() => window.print()}>
                <Printer className="h-4 w-4 ml-2" />
                طباعة
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
