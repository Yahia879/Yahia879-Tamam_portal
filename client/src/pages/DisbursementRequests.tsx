import { useState, useEffect, useMemo } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { usePermission } from "@/hooks/usePermission";
import { numberToArabicText } from "@shared/tafqeet";
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
  MoreVertical,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import ExcelJS from "exceljs";

const STATUS_MAP: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  draft: { label: "مسودة", variant: "secondary" },
  pending: { label: "بانتظار اعتماد مُعد الطلب", variant: "default" },
  pending_executive: { label: "بانتظار اعتماد المدير التنفيذي", variant: "default" },
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



export default function DisbursementRequests() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const utils = trpc.useUtils();
  const [isExporting, setIsExporting] = useState(false);
  const [activeTab, setActiveTab] = useState("requests");
  const [searchTerm, setSearchTerm] = useState("");

  const handleExportExcel = async () => {
    try {
      setIsExporting(true);
      const workbook = new ExcelJS.Workbook();

      if (activeTab === "requests") {
        const allData = await utils.disbursements.listRequests.fetch({
          status: statusFilter !== "all" ? statusFilter as any : undefined,
          requestType: requestTypeFilter !== "all" ? requestTypeFilter : undefined,
          search: searchTerm || undefined,
          page: 1,
          limit: 5000,
        });

        const worksheet = workbook.addWorksheet("طلبات الصرف", {
          views: [{ showGridLines: true, rightToLeft: true }]
        });

        // Add headers
        worksheet.addRow(["رقم الطلب", "العنوان", "المشروع", "المبلغ (ريال)", "الحالة", "تاريخ الطلب"]);

        // Add rows
        (allData?.requests || []).forEach((req: any) => {
          const statusText = req.status === "draft" ? "مسودة" :
                             req.status === "pending" ? "قيد الاعتماد" :
                             req.status === "approved" ? "معتمد" :
                             req.status === "rejected" ? "مرفوض" :
                             req.status === "paid" ? "مدفوع" : req.status || "-";

          worksheet.addRow([
            req.requestNumber || "-",
            req.title || req.description || "-",
            req.projectName || "-",
            Number(req.amount) || 0,
            statusText,
            req.requestedAt ? new Date(req.requestedAt).toLocaleDateString("ar-SA") : "-",
          ]);
        });

        // Set column widths
        ['A', 'B', 'C', 'D', 'E', 'F'].forEach(col => {
          worksheet.getColumn(col).width = 30;
        });

        // Write buffer and download
        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `تقرير_طلبات_الصرف_${new Intl.DateTimeFormat('en-CA').format(new Date())}.xlsx`;
        a.click();
        window.URL.revokeObjectURL(url);
      } else {
        const allData = await utils.disbursements.listOrders.fetch({
          status: statusFilter !== "all" ? statusFilter as any : undefined,
          search: searchTerm || undefined,
          page: 1,
          limit: 5000,
        });

        const worksheet = workbook.addWorksheet("أوامر الصرف", {
          views: [{ showGridLines: true, rightToLeft: true }]
        });

        // Add headers
        worksheet.addRow(["رقم الأمر", "رقم طلب الصرف", "المشروع", "المستفيد", "المبلغ (ريال)", "طريقة الدفع", "الحالة", "البنك / رقم السداد", "الآيبان / رقم المفوتر"]);

        // Add rows
        (allData?.orders || []).forEach((order: any) => {
          const paymentMethodText = order.paymentMethod === "bank_transfer" ? "تحويل بنكي" :
                                    order.paymentMethod === "check" ? "شيك" :
                                    order.paymentMethod === "custody" ? "عهدة" : 
                                    order.paymentMethod === "sadad" ? "سداد" : order.paymentMethod || "-";

          const statusText = order.status === "pending" ? "قيد الاعتماد" :
                             order.status === "approved" ? "معتمد" :
                             order.status === "executed" ? "منفذ" :
                             order.status === "rejected" ? "مرفوض" : order.status || "-";

          const bankOrSadad = order.paymentMethod === "sadad" ? (order.sadadNumber || "-") : (order.beneficiaryBank || "-");
          const ibanOrBiller = order.paymentMethod === "sadad" ? (order.billerCode || "-") : (order.beneficiaryIban || "-");

          worksheet.addRow([
            order.orderNumber || "-",
            order.requestNumber || "-",
            order.projectName || "-",
            order.beneficiaryName || "-",
            Number(order.amount) || 0,
            paymentMethodText,
            statusText,
            bankOrSadad,
            ibanOrBiller,
          ]);
        });

        // Set column widths
        ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I'].forEach(col => {
          worksheet.getColumn(col).width = 30;
        });

        // Write buffer and download
        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `تقرير_أوامر_الصرف_${new Intl.DateTimeFormat('en-CA').format(new Date())}.xlsx`;
        a.click();
        window.URL.revokeObjectURL(url);
      }
      toast.success("تم تصدير ملف Excel بنجاح");
    } catch (error) {
      console.error("Failed to export excel:", error);
      toast.error("حدث خطأ أثناء تصدير ملف Excel");
    } finally {
      setIsExporting(false);
    }
  };
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [projectFilter, setProjectFilter] = useState<string>("all");
  const [paymentTypeFilter, setPaymentTypeFilter] = useState<string>("all");
  const [requestTypeFilter, setRequestTypeFilter] = useState<string>("all");
  
  const [page, setPage] = useState(1);
  const limit = 10;
  
  // نوافذ الحوار
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [showApproveDialog, setShowApproveDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [showCreateOrderDialog, setShowCreateOrderDialog] = useState(false);
  const [showOrderPreviewDialog, setShowOrderPreviewDialog] = useState(false);
  const [showViewRejectionDialog, setShowViewRejectionDialog] = useState(false);
  const [viewRejectionReasonText, setViewRejectionReasonText] = useState("");
  
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
    requestType: requestTypeFilter !== "all" ? requestTypeFilter : undefined,
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
    onSuccess: (data: any) => {
      toast.success(data?.message || "تم اعتماد طلب الصرف بنجاح");
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
  const hasApprovePermission = usePermission("disbursements.approve") || usePermission("disbursements.sign") || usePermission("disbursement_orders.sign");
  const hasEditPermission = usePermission("disbursements.edit");
  const hasAddPermission = usePermission("disbursements.add");
  const hasCreateCustomPermission = usePermission("disbursements.create_custom");
  const canCreateRequest = hasEditPermission;
  const canCreateDisbursement = usePermission("disbursements.create");
  const canApproveRequest = hasApprovePermission;
  const canCreateOrder = hasApprovePermission;
  const canApproveOrder = usePermission("disbursement_orders.approve") || usePermission("disbursement_orders.sign") || hasApprovePermission;
  const canExecuteOrder = ["super_admin", "system_admin", "financial"].includes(user?.role || "");
  const isExecutiveDirector = 
    ["super_admin", "system_admin", "admin", "general_manager", "executive_director"].includes(user?.role || "") ||
    (user as any)?.customRole?.nameAr === "المدير التنفيذي" ||
    canApproveRequest ||
    canApproveOrder;

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
    
    let customSupplier: any = null;
    if (request.attachmentsJson) {
      try {
        const attachments = JSON.parse(request.attachmentsJson);
        if (Array.isArray(attachments)) {
          const infoAttachment = attachments.find((a: any) => a.name === "custom_supplier_info");
          if (infoAttachment && infoAttachment.url) {
            customSupplier = JSON.parse(infoAttachment.url);
          }
        }
      } catch (e) {
        console.error("Error parsing custom supplier:", e);
      }
    }

    if (customSupplier) {
      setSelectedProjectData({
        projectName: "طلب صرف مخصص / عام",
        contractAmount: customSupplier.agreedAmount || 0,
        remainingAmount: 0,
        projectId: request.projectId,
      });
      setNewOrder({
        beneficiaryName: customSupplier.name || "",
        beneficiaryBank: customSupplier.bank || "",
        beneficiaryIban: customSupplier.iban || "",
        beneficiaryAccountName: customSupplier.name || "",
        sadadNumber: "",
        billerCode: "",
        paymentMethod: "bank_transfer",
      });
    } else if (request.supplierName || project) {
      setSelectedProjectData(project || {
        projectName: request.projectName || "مشروع مرتبط",
        contractAmount: request.amount || 0,
        remainingAmount: 0,
        projectId: request.projectId,
      });
      setNewOrder({
        beneficiaryName: request.supplierName || project?.supplierName || "",
        beneficiaryBank: request.supplierBank || project?.supplierBank || "",
        beneficiaryIban: request.supplierIban || project?.supplierIban || "",
        beneficiaryAccountName: request.supplierAccountName || project?.supplierAccountName || request.supplierName || "",
        sadadNumber: "",
        billerCode: "",
        paymentMethod: "bank_transfer",
      });
    } else {
      setSelectedProjectData(null);
      setNewOrder({
        beneficiaryName: "",
        beneficiaryBank: "",
        beneficiaryIban: "",
        beneficiaryAccountName: "",
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
      
      let customSupplier: any = null;
      if (request.attachmentsJson) {
        try {
          const attachments = JSON.parse(request.attachmentsJson);
          if (Array.isArray(attachments)) {
            const infoAttachment = attachments.find((a: any) => a.name === "custom_supplier_info");
            if (infoAttachment && infoAttachment.url) {
              customSupplier = JSON.parse(infoAttachment.url);
            }
          }
        } catch (e) {
          console.error("Error parsing custom supplier:", e);
        }
      }
      
      const beneficiaryName = customSupplier?.name || request.supplierName || project?.supplierName || request.projectName || "مستفيد غير محدد";
      const beneficiaryBank = customSupplier?.bank || request.supplierBank || project?.supplierBank || "";
      const beneficiaryIban = customSupplier?.iban || request.supplierIban || project?.supplierIban || "";
      const beneficiaryAccountName = customSupplier?.name || request.supplierAccountName || project?.supplierAccountName || beneficiaryName;

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
  }, [searchTerm, statusFilter, paymentTypeFilter, requestTypeFilter]);

  const total = requestsData?.total || 0;
  const totalPages = Math.ceil(total / limit);

  // فرز الطلبات: وضع الطلبات التي بانتظار اعتماد المستخدم في البداية
  const sortedRequests = useMemo(() => {
    if (!requestsData?.requests) return [];
    const list = [...requestsData.requests];

    return list.sort((a, b) => {
      let aPendingAction = false;
      let bPendingAction = false;

      if (isExecutiveDirector) {
        aPendingAction = a.status === "pending_executive";
        bPendingAction = b.status === "pending_executive";
      } else {
        aPendingAction = (a.status === "pending" || a.status === "draft") && (a.requestedBy === user?.id || canApproveRequest);
        bPendingAction = (b.status === "pending" || b.status === "draft") && (b.requestedBy === user?.id || canApproveRequest);
      }

      if (aPendingAction && !bPendingAction) return -1;
      if (!aPendingAction && bPendingAction) return 1;

      // الترتيب التلقائي المتبع لحسب تاريخ النشاء/المعرف نزولياً
      const dateA = a.requestedAt ? new Date(a.requestedAt).getTime() : a.id;
      const dateB = b.requestedAt ? new Date(b.requestedAt).getTime() : b.id;
      return dateB - dateA;
    });
  }, [requestsData?.requests, user?.id, isExecutiveDirector, canApproveRequest]);

  const paginatedRequests = sortedRequests;



  return (
    <DashboardLayout>
      <div className="space-y-6 px-4 md:px-0">
        {/* العنوان والإحصائيات */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between" dir="rtl">
          <div className="text-right">
            <h1 className="text-2xl font-bold">طلبات الصرف</h1>
            <p className="text-muted-foreground">إدارة طلبات الصرف المالية للمشاريع</p>
          </div>
          {canCreateDisbursement && (
            <div className="w-full sm:w-auto flex justify-end">
              <Button 
                onClick={() => navigate("/disbursements/new-linked")}
                className="w-full sm:w-auto gradient-primary text-white font-bold"
              >
                <Plus className="ml-2 h-4 w-4" />
                إضافة طلب صرف
              </Button>
            </div>
          )}
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
              <div className="flex flex-wrap gap-2 w-full lg:w-auto">
                <Select value={requestTypeFilter} onValueChange={setRequestTypeFilter}>
                  <SelectTrigger className="w-full lg:w-[180px]">
                    <Filter className="ml-2 h-4 w-4" />
                    <SelectValue placeholder="نوع الطلب" />
                  </SelectTrigger>
                  <SelectContent dir="rtl">
                    <SelectItem value="all">جميع الطلبات</SelectItem>
                    <SelectItem value="linked">طلب مرتبط بمشروع</SelectItem>
                    <SelectItem value="custom">طلب صرف مخصص</SelectItem>
                  </SelectContent>
                </Select>

                 <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full lg:w-[220px]">
                    <Filter className="ml-2 h-4 w-4" />
                    <SelectValue placeholder="الحالة" />
                  </SelectTrigger>
                  <SelectContent dir="rtl">
                    <SelectItem value="all">جميع الحالات</SelectItem>
                    <SelectItem value="pending">بانتظار اعتماد مُعد الطلب</SelectItem>
                    <SelectItem value="pending_executive">بانتظار اعتماد المدير التنفيذي</SelectItem>
                    <SelectItem value="approved">معتمد</SelectItem>
                    <SelectItem value="rejected">مرفوض</SelectItem>
                  </SelectContent>
                </Select>

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

            {/* جدول طلبات الصرف - Desktop & Card View - Mobile */}
            <Card className="border-0 shadow-sm overflow-hidden">
              <CardContent className="p-0">
                {/* Desktop View Table */}
                <div className="hidden md:block w-full overflow-x-auto">
                  <Table dir="rtl" className="w-full min-w-[950px]">
                    <TableHeader className="bg-slate-50/70 dark:bg-slate-900/70 border-b border-border">
                      <TableRow className="hover:bg-transparent">
                        <TableHead className="py-3.5 px-4 text-right min-w-[150px] font-bold text-slate-700 dark:text-slate-200">رقم الطلب</TableHead>
                        <TableHead className="py-3.5 px-4 text-right min-w-[200px] font-bold text-slate-700 dark:text-slate-200">العنوان</TableHead>
                        <TableHead className="py-3.5 px-4 text-right min-w-[180px] font-bold text-slate-700 dark:text-slate-200">المشروع</TableHead>
                        <TableHead className="py-3.5 px-4 text-right min-w-[130px] font-bold text-slate-700 dark:text-slate-200">المبلغ</TableHead>
                        <TableHead className="py-3.5 px-4 text-right min-w-[210px] font-bold text-slate-700 dark:text-slate-200">الحالة</TableHead>
                        <TableHead className="py-3.5 px-4 text-right min-w-[110px] font-bold text-slate-700 dark:text-slate-200">التاريخ</TableHead>
                        <TableHead className="py-3.5 px-4 text-center min-w-[100px] font-bold text-slate-700 dark:text-slate-200">الإجراءات</TableHead>
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
                          ) || allReports?.find((report: any) => report.projectId === request.projectId);

                          const isConverted = !!request.orderId || request.status === "paid";
                          const isPendingMyAction = isExecutiveDirector
                            ? request.status === "pending_executive"
                            : (request.status === "pending" || request.status === "draft") && (request.requestedBy === user?.id || canApproveRequest);

                          return (
                            <TableRow 
                              key={request.id} 
                              className={isPendingMyAction ? "bg-gradient-to-l from-emerald-50/70 via-teal-50/20 to-transparent dark:from-emerald-950/40 dark:via-teal-950/10 dark:to-transparent hover:from-emerald-50/90 border-r-4 border-r-[#1a5f4a] transition-all shadow-xs" : ""}
                            >
                              <TableCell className="py-3.5 px-4 font-mono text-xs text-right font-bold whitespace-nowrap">
                                <div className="flex items-center gap-2 justify-start">
                                  {isPendingMyAction && (
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
                                  <span>{request.requestNumber}</span>
                                </div>
                              </TableCell>
                              <TableCell className="py-3.5 px-4 max-w-[220px] truncate text-right text-xs">{request.title || request.description}</TableCell>
                              <TableCell className="py-3.5 px-4 max-w-[200px] text-right">
                                {request.projectId ? (
                                  <span className="font-semibold text-slate-700 dark:text-slate-300 text-xs block truncate">
                                    {request.projectName}
                                  </span>
                                ) : (
                                  <span className="text-muted-foreground text-xs font-medium">-</span>
                                )}
                              </TableCell>
                              <TableCell className="py-3.5 px-4 whitespace-nowrap text-right font-semibold text-xs">{Number(request.amount).toLocaleString()} ريال</TableCell>
                              <TableCell className="py-3.5 px-4 text-right">
                                <div className="flex flex-col gap-1 items-start justify-start">
                                  <DisbursementStatusBadge 
                                    status={request.status as any} 
                                    type="request" 
                                  />
                                </div>
                              </TableCell>
                              <TableCell className="py-3.5 px-4 whitespace-nowrap text-right text-xs text-muted-foreground">
                                {request.requestedAt
                                  ? new Date(request.requestedAt).toLocaleDateString("ar-SA")
                                  : "-"}
                              </TableCell>
                              <TableCell className="py-3.5 px-4 text-center">
                                {request.status === "rejected" ? (
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-muted">
                                        <MoreVertical className="h-4 w-4 text-muted-foreground" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="w-56 text-right font-medium">
                                      <DropdownMenuItem
                                        onClick={() => {
                                          setSelectedRequest(request);
                                          setViewRejectionReasonText(request.rejectionReason || "");
                                          setShowViewRejectionDialog(true);
                                        }}
                                        className="flex items-center gap-2 cursor-pointer text-slate-700 hover:text-red-600 focus:text-red-600 focus:bg-red-50 dark:focus:bg-red-950/30"
                                      >
                                        <AlertCircle className="h-4 w-4 text-red-500" />
                                        <span>عرض سبب رفض طلب الصرف</span>
                                      </DropdownMenuItem>
                                      {canCreateRequest && (
                                        <DropdownMenuItem
                                          onClick={() => navigate(`/disbursements/requests/${request.id}/edit`)}
                                          className="flex items-center gap-2 cursor-pointer text-slate-700 hover:text-[#1a5f4a] focus:text-[#1a5f4a] focus:bg-[#1a5f4a]/5 dark:focus:bg-[#1a5f4a]/10"
                                        >
                                          <FileText className="h-4 w-4 text-gray-500" />
                                          <span>تعديل طلب الصرف</span>
                                        </DropdownMenuItem>
                                      )}
                                      {hasApprovePermission && (
                                        <DropdownMenuItem
                                          onClick={() => navigate(`/disbursements/requests/${request.id}/print`)}
                                          className="flex items-center gap-2 cursor-pointer text-slate-700 hover:text-blue-600 focus:text-blue-600 focus:bg-blue-50 dark:focus:bg-blue-950/30"
                                        >
                                          <Printer className="h-4 w-4 text-blue-500" />
                                          <span>عرض تقرير طلب الصرف</span>
                                        </DropdownMenuItem>
                                      )}
                                      <DropdownMenuItem
                                        disabled={!!request.rejectionReason}
                                        onClick={() => handleDirectCreateOrder(request)}
                                        className={`flex items-center gap-2 cursor-pointer ${
                                          request.rejectionReason
                                            ? "text-slate-400 dark:text-slate-500 opacity-50 cursor-not-allowed"
                                            : "text-slate-700 hover:text-emerald-600 focus:text-emerald-600 focus:bg-emerald-50 dark:focus:bg-emerald-950/30"
                                        }`}
                                      >
                                        <Banknote className={`h-4 w-4 ${request.rejectionReason ? "text-slate-400" : "text-emerald-500"}`} />
                                        <span>التحويل الى طلب صرف</span>
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                ) : isConverted ? (
                                  hasApprovePermission ? (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => navigate(`/disbursements/requests/${request.id}/print`)}
                                      className="flex items-center gap-1.5 text-xs text-[#1a5f4a] border-[#1a5f4a]/20 hover:bg-[#1a5f4a]/5 hover:text-[#1a5f4a] font-bold"
                                    >
                                      <FileText className="h-3.5 w-3.5" />
                                      عرض تقرير طلب الصرف
                                    </Button>
                                  ) : (
                                    <span className="text-muted-foreground text-xs font-medium">—</span>
                                  )
                                ) : (
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-muted">
                                        <MoreVertical className="h-4 w-4 text-muted-foreground" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="w-56 text-right font-medium">
                                      {hasApprovePermission && (
                                        <DropdownMenuItem
                                          onClick={() => navigate(`/disbursements/requests/${request.id}/print`)}
                                          className="flex items-center gap-2 cursor-pointer text-[#1a5f4a] hover:text-[#1a5f4a] focus:text-[#1a5f4a] focus:bg-[#1a5f4a]/5 dark:focus:bg-[#1a5f4a]/10"
                                        >
                                          <Printer className="h-4 w-4 text-[#1a5f4a]" />
                                          <span>عرض تقرير طلب الصرف</span>
                                        </DropdownMenuItem>
                                      )}
                                      {canCreateRequest && (
                                        <DropdownMenuItem
                                          onClick={() => navigate(`/disbursements/requests/${request.id}/edit`)}
                                          className="flex items-center gap-2 cursor-pointer text-slate-700 hover:text-[#1a5f4a] focus:text-[#1a5f4a] focus:bg-[#1a5f4a]/5 dark:focus:bg-[#1a5f4a]/10"
                                        >
                                          <FileText className="h-4 w-4 text-gray-500" />
                                          <span>تعديل طلب الدفعة</span>
                                        </DropdownMenuItem>
                                      )}
                                      {correspondingReport && (
                                        <DropdownMenuItem
                                          onClick={() => navigate(`/progress-reports/${correspondingReport.id}/print`)}
                                          className="flex items-center gap-2 cursor-pointer text-slate-700 hover:text-blue-600 focus:text-blue-600 focus:bg-blue-50 dark:focus:bg-blue-950/30"
                                        >
                                          <FileText className="h-4 w-4 text-blue-500" />
                                          <span>عرض تقرير الإنجاز</span>
                                        </DropdownMenuItem>
                                      )}
                                      
                                      {/* Stage 1 Approval: Preparer */}
                                      {(request.status === "pending" || request.status === "draft") && (request.requestedBy === user?.id || isExecutiveDirector) && (
                                        <>
                                          <DropdownMenuItem
                                            onClick={() => {
                                              setSelectedRequest(request);
                                              setApprovalNotes("");
                                              setShowApproveDialog(true);
                                            }}
                                            className="flex items-center gap-2 cursor-pointer text-slate-700 hover:text-emerald-600 focus:text-emerald-600 focus:bg-emerald-50 dark:focus:bg-emerald-950/30"
                                          >
                                            <CheckCircle className="h-4 w-4 text-emerald-500" />
                                            <span>اعتماد طلب الصرف</span>
                                          </DropdownMenuItem>
                                          <DropdownMenuItem
                                            onClick={() => {
                                              setSelectedRequest(request);
                                              setRejectionReason("");
                                              setShowRejectDialog(true);
                                            }}
                                            className="flex items-center gap-2 cursor-pointer text-slate-700 hover:text-rose-600 focus:text-rose-600 focus:bg-rose-50 dark:focus:bg-rose-950/30"
                                          >
                                            <XCircle className="h-4 w-4 text-rose-500" />
                                            <span>رفض طلب الصرف</span>
                                          </DropdownMenuItem>
                                        </>
                                      )}

                                      {/* Stage 2 Approval: Executive Director ONLY */}
                                      {request.status === "pending_executive" && isExecutiveDirector && (
                                        <>
                                          <DropdownMenuItem
                                            onClick={() => {
                                              setSelectedRequest(request);
                                              setApprovalNotes("");
                                              setShowApproveDialog(true);
                                            }}
                                            className="flex items-center gap-2 cursor-pointer font-bold text-[#1a5f4a] hover:text-emerald-700 focus:text-emerald-700 focus:bg-emerald-50 dark:focus:bg-emerald-950/30"
                                          >
                                            <CheckCircle className="h-4 w-4 text-emerald-600 animate-pulse" />
                                            <span>اعتماد طلب الصرف</span>
                                          </DropdownMenuItem>
                                          <DropdownMenuItem
                                            onClick={() => {
                                              setSelectedRequest(request);
                                              setRejectionReason("");
                                              setShowRejectDialog(true);
                                            }}
                                            className="flex items-center gap-2 cursor-pointer text-slate-700 hover:text-rose-600 focus:text-rose-600 focus:bg-rose-50 dark:focus:bg-rose-950/30"
                                          >
                                            <XCircle className="h-4 w-4 text-rose-500" />
                                            <span>رفض طلب الصرف</span>
                                          </DropdownMenuItem>
                                        </>
                                      )}
                                      {canCreateOrder && request.status === "approved" && (
                                        <DropdownMenuItem
                                          onClick={() => handleDirectCreateOrder(request)}
                                          className="flex items-center gap-2 cursor-pointer text-slate-700 hover:text-emerald-600 focus:text-emerald-600 focus:bg-emerald-50 dark:focus:bg-emerald-950/30"
                                        >
                                          <Banknote className="h-4 w-4 text-emerald-500" />
                                          <span>تحويل إلى أمر صرف</span>
                                        </DropdownMenuItem>
                                      )}
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                )}
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
                      ) || allReports?.find((report: any) => report.projectId === request.projectId);

                        const isConverted = !!request.orderId || request.status === "paid";
                        const isPendingMyAction = isExecutiveDirector
                          ? request.status === "pending_executive"
                          : (request.status === "pending" || request.status === "draft") && (request.requestedBy === user?.id || canApproveRequest);

                        return (
                          <div 
                            key={request.id} 
                            className={`p-4 space-y-3 transition-all rounded-xl border ${
                              isPendingMyAction 
                                ? "bg-gradient-to-br from-emerald-50/80 via-teal-50/30 to-background dark:from-emerald-950/40 dark:via-teal-950/10 dark:to-background border-2 border-[#1a5f4a]/60 shadow-md my-3" 
                                : "hover:bg-muted/10 border-border"
                            }`}
                          >
                            {isPendingMyAction && (
                              <div className="flex items-center justify-between border-b pb-2 border-[#1a5f4a]/20">
                                <span className="font-mono text-xs font-bold text-slate-800 dark:text-slate-200">{request.requestNumber}</span>
                                <TooltipProvider>
                                  <Tooltip delayDuration={50}>
                                    <TooltipTrigger asChild>
                                      <div className="relative inline-flex items-center justify-center shrink-0 cursor-pointer">
                                        <div className="relative flex items-center justify-center w-6 h-6 rounded-full bg-gradient-to-tr from-[#1a5f4a] via-emerald-600 to-teal-500 text-white shadow-sm border border-emerald-400/40">
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
                              </div>
                            )}
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0 flex-1 text-right">
                                <p className="font-mono text-[10px] text-muted-foreground">{request.requestNumber}</p>
                                <p className="font-bold text-sm truncate">{request.title || request.description}</p>
                                {request.projectId ? (
                                  <div className="mt-0.5 flex justify-end">
                                    <span className="text-xs text-muted-foreground truncate max-w-[150px]">{request.projectName}</span>
                                  </div>
                                ) : (
                                  <div className="mt-0.5 flex justify-end">
                                    <span className="text-muted-foreground text-xs font-medium">-</span>
                                  </div>
                                )}
                              </div>
                              <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                                <DisbursementStatusBadge 
                                  status={request.status as any} 
                                  type="request" 
                                />
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-muted shrink-0">
                                      <MoreVertical className="h-4 w-4 text-muted-foreground" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end" className="w-56 text-right font-medium">
                                    {/* 1. Print/View Report - Available if has approve permission */}
                                    {hasApprovePermission && (
                                      <DropdownMenuItem
                                        onClick={() => navigate(`/disbursements/requests/${request.id}/print`)}
                                        className="flex items-center gap-2 cursor-pointer text-slate-700 hover:text-blue-600 focus:text-blue-600 focus:bg-blue-50 dark:focus:bg-blue-950/30"
                                      >
                                        <Printer className="h-4 w-4 text-blue-500" />
                                        <span>عرض تقرير طلب الصرف</span>
                                      </DropdownMenuItem>
                                    )}

                                    {/* 2. View Rejection Reason - If rejected */}
                                    {request.status === "rejected" && request.rejectionReason && (
                                      <DropdownMenuItem
                                        onClick={() => {
                                          setSelectedRequest(request);
                                          setViewRejectionReasonText(request.rejectionReason || "");
                                          setShowViewRejectionDialog(true);
                                        }}
                                        className="flex items-center gap-2 cursor-pointer text-slate-700 hover:text-red-600 focus:text-red-600 focus:bg-red-50 dark:focus:bg-red-950/30"
                                      >
                                        <AlertCircle className="h-4 w-4 text-red-500" />
                                        <span>عرض سبب الرفض</span>
                                      </DropdownMenuItem>
                                    )}

                                    {/* 3. Edit Request - If editable */}
                                    {canCreateRequest && (request.status === "draft" || request.status === "rejected") && (
                                      <DropdownMenuItem
                                        onClick={() => navigate(`/disbursements/requests/${request.id}/edit`)}
                                        className="flex items-center gap-2 cursor-pointer text-slate-700 hover:text-[#1a5f4a] focus:text-[#1a5f4a] focus:bg-[#1a5f4a]/5 dark:focus:bg-[#1a5f4a]/10"
                                      >
                                        <FileText className="h-4 w-4 text-gray-500" />
                                        <span>تعديل طلب الصرف</span>
                                      </DropdownMenuItem>
                                    )}

                                    {/* 4. Progress Report - If exists */}
                                    {correspondingReport && (
                                      <DropdownMenuItem
                                        onClick={() => navigate(`/progress-reports/${correspondingReport.id}/print`)}
                                        className="flex items-center gap-2 cursor-pointer text-slate-700 hover:text-purple-600 focus:text-purple-600 focus:bg-purple-50 dark:focus:bg-purple-950/30"
                                      >
                                        <FileText className="h-4 w-4 text-purple-500" />
                                        <span>عرض تقرير الإنجاز</span>
                                      </DropdownMenuItem>
                                    )}

                                    {/* 5. Convert to Order - If allowed */}
                                     {/* 5. Approve & Reject buttons - If allowed and pending */}
                                     {canApproveRequest && request.status === "pending" && (
                                       <>
                                         <DropdownMenuItem
                                           onClick={() => {
                                             setSelectedRequest(request);
                                             setApprovalNotes("");
                                             setShowApproveDialog(true);
                                           }}
                                           className="flex items-center gap-2 cursor-pointer text-slate-700 hover:text-emerald-600 focus:text-emerald-600 focus:bg-emerald-50 dark:focus:bg-emerald-950/30"
                                         >
                                           <CheckCircle className="h-4 w-4 text-emerald-500" />
                                           <span>اعتماد طلب الصرف</span>
                                         </DropdownMenuItem>
                                         <DropdownMenuItem
                                           onClick={() => {
                                             setSelectedRequest(request);
                                             setRejectionReason("");
                                             setShowRejectDialog(true);
                                           }}
                                           className="flex items-center gap-2 cursor-pointer text-slate-700 hover:text-rose-600 focus:text-rose-600 focus:bg-rose-50 dark:focus:bg-rose-950/30"
                                         >
                                           <XCircle className="h-4 w-4 text-rose-500" />
                                           <span>رفض طلب الصرف</span>
                                         </DropdownMenuItem>
                                       </>
                                     )}

                                     {/* 6. Convert to Order - If allowed and approved */}
                                     {canCreateOrder && request.status === "approved" && !isConverted && (
                                      <DropdownMenuItem
                                        onClick={() => handleDirectCreateOrder(request)}
                                        className="flex items-center gap-2 cursor-pointer text-slate-700 hover:text-emerald-600 focus:text-emerald-600 focus:bg-emerald-50 dark:focus:bg-emerald-950/30"
                                      >
                                        <Banknote className="h-4 w-4 text-emerald-500" />
                                        <span>تحويل إلى أمر صرف</span>
                                      </DropdownMenuItem>
                                    )}
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            </div>

                          <div className="flex justify-between items-end pt-1">
                            <div>
                              <p className="text-[10px] text-muted-foreground mb-0.5">المبلغ</p>
                              <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">{Number(request.amount).toLocaleString()} ريال</p>
                            </div>
                            <span className="text-[10px] text-muted-foreground">
                              {request.requestedAt ? new Date(request.requestedAt).toLocaleDateString("ar-SA") : "-"}
                            </span>
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
                            <TableCell className="max-w-[150px] text-right">
                              {order.projectId ? (
                                <div className="flex flex-col items-start gap-1 justify-center">
                                  <span className="font-semibold text-slate-700 dark:text-slate-300 text-xs block truncate max-w-[140px]">
                                    {order.projectName}
                                  </span>
                                  <Badge variant="outline" className="text-[10px] py-0 px-2 bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/20 dark:text-blue-300 dark:border-blue-900/50">
                                    مرتبط بمشروع
                                  </Badge>
                                </div>
                              ) : (
                                <Badge variant="outline" className="text-[10px] py-0.5 px-2 bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/20 dark:text-purple-300 dark:border-purple-900/50 font-bold">
                                  أمر صرف مخصص
                                </Badge>
                              )}
                            </TableCell>
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
                            <TableCell className="text-right">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-muted">
                                    <MoreVertical className="h-4 w-4 text-muted-foreground" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-48 text-right font-medium">
                                  <DropdownMenuItem
                                    onClick={() => {
                                      setSelectedOrder(order);
                                      setShowOrderPreviewDialog(true);
                                    }}
                                    className="flex items-center gap-2 cursor-pointer text-slate-700 hover:text-slate-900 focus:bg-muted/50"
                                  >
                                    <Eye className="h-4 w-4 text-blue-500" />
                                    <span>معاينة أمر الصرف</span>
                                  </DropdownMenuItem>

                                  {canApproveOrder && order.status === "pending" && (
                                    <DropdownMenuItem
                                      onClick={() => approveOrderMutation.mutate({ id: order.id })}
                                      className="flex items-center gap-2 cursor-pointer text-slate-700 hover:text-green-600 focus:text-green-600 focus:bg-green-50 dark:focus:bg-green-950/30"
                                    >
                                      <CheckCircle className="h-4 w-4 text-green-500" />
                                      <span>اعتماد أمر الصرف</span>
                                    </DropdownMenuItem>
                                  )}

                                  {canExecuteOrder && order.status === "approved" && (
                                    <DropdownMenuItem
                                      onClick={() => executeOrderMutation.mutate({ id: order.id })}
                                      className="flex items-center gap-2 cursor-pointer text-slate-700 hover:text-emerald-600 focus:text-emerald-600 focus:bg-emerald-50 dark:focus:bg-emerald-950/30"
                                    >
                                      <Banknote className="h-4 w-4 text-emerald-500" />
                                      <span>تنفيذ الصرف</span>
                                    </DropdownMenuItem>
                                  )}

                                  <DropdownMenuItem
                                    onClick={() => navigate(`/disbursements/orders/${order.id}/print`)}
                                    className="flex items-center gap-2 cursor-pointer text-slate-700 hover:text-slate-900 focus:bg-muted/50"
                                  >
                                    <Printer className="h-4 w-4 text-slate-500" />
                                    <span>طباعة أمر الصرف</span>
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
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
                      <div key={order.id} className="p-4 space-y-3 hover:bg-muted/10 transition-colors">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <p className="font-mono text-[10px] text-muted-foreground">{order.orderNumber}</p>
                            <p className="font-bold text-sm truncate">{order.beneficiaryName}</p>
                            <p className="text-[10px] text-muted-foreground truncate">لطلب: {order.requestNumber}</p>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                            <DisbursementStatusBadge 
                              status={order.status as any} 
                              type="order" 
                            />
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-muted">
                                  <MoreVertical className="h-4 w-4 text-muted-foreground" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-48 text-right font-medium">
                                <DropdownMenuItem
                                  onClick={() => {
                                    setSelectedOrder(order);
                                    setShowOrderPreviewDialog(true);
                                  }}
                                  className="flex items-center gap-2 cursor-pointer text-slate-700 hover:text-slate-900 focus:bg-muted/50"
                                >
                                  <Eye className="h-4 w-4 text-blue-500" />
                                  <span>معاينة أمر الصرف</span>
                                </DropdownMenuItem>

                                {canApproveOrder && order.status === "pending" && (
                                  <DropdownMenuItem
                                    onClick={() => approveOrderMutation.mutate({ id: order.id })}
                                    className="flex items-center gap-2 cursor-pointer text-slate-700 hover:text-green-600 focus:text-green-600 focus:bg-green-50 dark:focus:bg-green-950/30"
                                  >
                                    <CheckCircle className="h-4 w-4 text-green-500" />
                                    <span>اعتماد أمر الصرف</span>
                                  </DropdownMenuItem>
                                )}

                                {canExecuteOrder && order.status === "approved" && (
                                  <DropdownMenuItem
                                    onClick={() => executeOrderMutation.mutate({ id: order.id })}
                                    className="flex items-center gap-2 cursor-pointer text-slate-700 hover:text-emerald-600 focus:text-emerald-600 focus:bg-emerald-50 dark:focus:bg-emerald-950/30"
                                  >
                                    <Banknote className="h-4 w-4 text-emerald-500" />
                                    <span>تنفيذ الصرف</span>
                                  </DropdownMenuItem>
                                )}

                                <DropdownMenuItem
                                  onClick={() => navigate(`/disbursements/orders/${order.id}/print`)}
                                  className="flex items-center gap-2 cursor-pointer text-slate-700 hover:text-slate-900 focus:bg-muted/50"
                                >
                                  <Printer className="h-4 w-4 text-slate-500" />
                                  <span>طباعة أمر الصرف</span>
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 pt-1">
                          <div>
                            <p className="text-[10px] text-muted-foreground mb-0.5">المبلغ</p>
                            <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">{Number(order.amount).toLocaleString()} ريال</p>
                          </div>
                          <div>
                            <p className="text-[10px] text-muted-foreground mb-0.5">طريقة الدفع</p>
                            <p className="text-xs font-medium">{PAYMENT_METHOD_MAP[order.paymentMethod || "bank_transfer"]}</p>
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-2 border-t border-border/50">
                          <p className="text-[10px] text-muted-foreground truncate max-w-[200px]">{order.projectName}</p>
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
                {(() => {
                  let metadata: any = null;
                  if (selectedRequest.attachmentsJson) {
                    try {
                      const attachments = JSON.parse(selectedRequest.attachmentsJson);
                      if (Array.isArray(attachments)) {
                        const infoAttachment = attachments.find((a: any) => a.name === "custom_supplier_info" || a.name === "linked_request_info");
                        if (infoAttachment && infoAttachment.url) {
                          metadata = JSON.parse(infoAttachment.url);
                        }
                      }
                    } catch (e) {}
                  }
                  
                  const showFundingInfo = metadata && (metadata.fundingSupport || metadata.mainProjectName);
                  const isSadad = metadata?.requestType === "sadad_invoice";

                  return (
                    <div className="space-y-4">
                      {showFundingInfo && (
                        <div className="mt-4 p-4 border rounded-xl bg-primary/[0.02] border-primary/10 space-y-3 text-right" dir="rtl">
                          <h4 className="font-bold text-xs text-primary border-b pb-2">بيانات التمويل والمشروع</h4>
                          <div className="grid grid-cols-2 gap-4 text-xs">
                            {metadata.fundingSupport && (
                              <div>
                                <span className="text-muted-foreground">التمويل / الدعم:</span>
                                <p className="font-bold text-slate-800 dark:text-slate-200 mt-0.5">{metadata.fundingSupport}</p>
                              </div>
                            )}
                            {metadata.mainProjectName && (
                              <div>
                                <span className="text-muted-foreground">اسم المشروع الرئيسي:</span>
                                <p className="font-bold text-slate-800 dark:text-slate-200 mt-0.5">{metadata.mainProjectName}</p>
                              </div>
                            )}
                            {metadata.customProjectName && (
                              <div>
                                <span className="text-muted-foreground">اسم المشروع المخصص:</span>
                                <p className="font-bold text-slate-800 dark:text-slate-200 mt-0.5">{metadata.customProjectName}</p>
                              </div>
                            )}
                            {metadata.requestType && (
                              <div>
                                <span className="text-muted-foreground">نوع طلب الصرف:</span>
                                <p className="font-bold text-slate-800 dark:text-slate-200 mt-0.5">
                                  {metadata.requestType === "supplier_one_time" && "سداد مورد لمرة واحدة بفاتورة"}
                                  {metadata.requestType === "sadad_invoice" && "فواتير نظام سداد"}
                                  {metadata.requestType === "misc_expenses" && "مصروفات منوعة"}
                                  {metadata.requestType === "project_linked" && "طلب صرف مرتبط بتقرير إنجاز"}
                                  {metadata.requestType === "custom_standard" && "طلب صرف مخصص عام"}
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {metadata && metadata.requestType && metadata.requestType !== "project_linked" && metadata.requestType !== "custom_standard" && (
                        <div className="p-4 border rounded-xl bg-slate-50 dark:bg-slate-900/50 space-y-3 text-right" dir="rtl">
                          <h4 className="font-bold text-xs text-primary border-b pb-2">تفاصيل الطلب والبيانات المالية</h4>
                          <div className="grid grid-cols-2 gap-4 text-xs">
                            {isSadad ? (
                              <>
                                <div>
                                  <span className="text-muted-foreground">اسم المفوتر:</span>
                                  <p className="font-bold text-slate-800 dark:text-slate-200 mt-0.5">{metadata.billerName || metadata.name}</p>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">رمز المفوتر:</span>
                                  <p className="font-medium text-slate-700 dark:text-slate-300 mt-0.5">{metadata.billerCode || metadata.bank}</p>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">رقم سداد:</span>
                                  <p className="font-mono font-medium text-slate-700 dark:text-slate-300 mt-0.5">{metadata.sadadNumber || metadata.iban}</p>
                                </div>
                              </>
                            ) : (
                              <>
                                <div>
                                  <span className="text-muted-foreground">اسم المستفيد:</span>
                                  <p className="font-bold text-slate-800 dark:text-slate-200 mt-0.5">{metadata.beneficiaryName || metadata.name}</p>
                                </div>
                                {metadata.bankAccountName && (
                                  <div>
                                    <span className="text-muted-foreground">اسم الحساب البنكي:</span>
                                    <p className="font-medium text-slate-700 dark:text-slate-300 mt-0.5">{metadata.bankAccountName}</p>
                                  </div>
                                )}
                                <div>
                                  <span className="text-muted-foreground">البنك:</span>
                                  <p className="font-medium text-slate-700 dark:text-slate-300 mt-0.5">{metadata.bankName || metadata.bank}</p>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">رقم الآيبان (IBAN):</span>
                                  <p className="font-mono font-medium text-slate-700 dark:text-slate-300 mt-0.5" dir="ltr">{metadata.iban}</p>
                                </div>
                              </>
                            )}
                            <div>
                              <span className="text-muted-foreground">المبلغ:</span>
                              <p className="font-bold text-primary mt-0.5">{Number(metadata.agreedAmount || selectedRequest.amount).toLocaleString()} ريال</p>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* دعم النوع القديم للمورد المخصص */}
                      {metadata && (metadata.requestType === "custom_standard" || (!metadata.requestType && metadata.name)) && (
                        <div className="p-4 border rounded-xl bg-slate-50 dark:bg-slate-900/50 space-y-3 text-right" dir="rtl">
                          <h4 className="font-bold text-xs text-primary border-b pb-2">تفاصيل المستفيد والبيانات البنكية</h4>
                          <div className="grid grid-cols-2 gap-4 text-xs">
                            <div>
                              <span className="text-muted-foreground">اسم المستفيد:</span>
                              <p className="font-bold text-slate-800 dark:text-slate-200 mt-0.5">{metadata.name}</p>
                            </div>
                            <div>
                              <span className="text-muted-foreground">بيان الأعمال:</span>
                              <p className="font-medium text-slate-700 dark:text-slate-300 mt-0.5">{metadata.work}</p>
                            </div>
                            <div>
                              <span className="text-muted-foreground">البنك:</span>
                              <p className="font-medium text-slate-700 dark:text-slate-300 mt-0.5">{metadata.bank}</p>
                            </div>
                            <div>
                              <span className="text-muted-foreground">رقم الآيبان (IBAN):</span>
                              <p className="font-mono font-medium text-slate-700 dark:text-slate-300 mt-0.5" dir="ltr">{metadata.iban}</p>
                            </div>
                            {metadata.agreedAmount > 0 && (
                              <div>
                                <span className="text-muted-foreground">المبلغ المتفق عليه:</span>
                                <p className="font-medium text-slate-700 dark:text-slate-300 mt-0.5">{metadata.agreedAmount.toLocaleString()} ريال</p>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}
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
          <DialogContent dir="rtl">
            <DialogHeader>
              <DialogTitle>
                {selectedRequest?.status === "pending"
                  ? "اعتماد طلب الصرف (اعتماد مُعد الطلب - المرحلة الأولى)"
                  : "اعتماد طلب الصرف (اعتماد المدير التنفيذي - المرحلة الثانية)"}
              </DialogTitle>
              <DialogDescription>
                {selectedRequest?.status === "pending"
                  ? `هل تريد اعتماد طلب الصرف رقم ${selectedRequest?.requestNumber} وتحويله لتكويطه إلى (بانتظار اعتماد المدير التنفيذي)؟`
                  : `هل تريد الاعتماد النهائي لطلب الصرف رقم ${selectedRequest?.requestNumber} من قِبَل المدير التنفيذي؟`}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="rounded-lg bg-muted p-4 space-y-1">
                <p className="font-bold text-slate-800">{selectedRequest?.title}</p>
                <p className="text-sm text-slate-600">
                  المبلغ: <span className="font-bold text-[#1a5f4a]">{Number(selectedRequest?.amount || 0).toLocaleString()} ريال</span>
                </p>
                {selectedRequest?.projectName && (
                  <p className="text-xs text-slate-500">المشروع: {selectedRequest.projectName}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label>ملاحظات الاعتماد (اختياري)</Label>
                <Textarea
                  value={approvalNotes}
                  onChange={(e) => setApprovalNotes(e.target.value)}
                  placeholder="أدخل أي ملاحظات..."
                />
              </div>
            </div>
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setShowApproveDialog(false)}>
                إلغاء
              </Button>
              <Button
                className="bg-[#1a5f4a] hover:bg-[#154d3c] text-white font-bold"
                onClick={() =>
                  approveRequestMutation.mutate({
                    id: selectedRequest?.id,
                    notes: approvalNotes,
                  })
                }
                disabled={approveRequestMutation.isPending}
              >
                {approveRequestMutation.isPending
                  ? "جاري الاعتماد..."
                  : "اعتماد طلب الصرف"}
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

        {/* نافذة عرض سبب رفض طلب الصرف */}
        <Dialog open={showViewRejectionDialog} onOpenChange={setShowViewRejectionDialog}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-red-600 dark:text-red-400">
                <AlertCircle className="h-5 w-5" />
                <span>سبب رفض طلب الصرف</span>
              </DialogTitle>
              <DialogDescription className="text-right">
                تفاصيل سبب رفض طلب الصرف رقم {selectedRequest?.requestNumber}
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <div className="bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/30 rounded-lg p-4 text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed text-right">
                {viewRejectionReasonText || "لا يوجد سبب محدد."}
              </div>
            </div>
            <DialogFooter className="sm:justify-start">
              <Button variant="outline" onClick={() => setShowViewRejectionDialog(false)} className="w-full sm:w-auto">
                إغلاق
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
                    <p className="font-medium whitespace-pre-wrap break-words">
                      {(() => {
                        try {
                          if (selectedOrder.attachmentsJson) {
                            const attachments = JSON.parse(selectedOrder.attachmentsJson);
                            if (Array.isArray(attachments)) {
                              const infoAttachment = attachments.find((a: any) => a.name === "custom_supplier_info" || a.name === "linked_request_info");
                              if (infoAttachment && infoAttachment.url) {
                                const metadata = JSON.parse(infoAttachment.url);
                                if (["supplier_one_time", "sadad_invoice", "misc_expenses"].includes(metadata.requestType) && metadata.requiredWorksDesc) {
                                  return metadata.requiredWorksDesc;
                                }
                              }
                            }
                          }
                        } catch (e) {
                          console.error(e);
                        }
                        return selectedOrder.requestTitle || selectedOrder.projectName || "—";
                      })()}
                    </p>
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
