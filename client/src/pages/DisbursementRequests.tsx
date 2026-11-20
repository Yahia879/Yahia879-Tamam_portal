import { useState, useEffect, useMemo, useRef } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { usePermission } from "@/hooks/usePermission";
import { numberToArabicText } from "@shared/tafqeet";
import DashboardLayout from "@/components/DashboardLayout";
import EnhancedPagination, { usePersistedPage } from "@/components/EnhancedPagination";
import { SaudiRiyal } from "@/components/SaudiRiyal";
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
  ShieldAlert,
  Info,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";
import { exportStyledExcel } from "@/lib/excelExportHelper";

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

      if (activeTab === "requests") {
        const allData = await utils.disbursements.listRequests.fetch({
          status: statusFilter !== "all" ? statusFilter as any : undefined,
          requestType: requestTypeFilter !== "all" ? requestTypeFilter : undefined,
          search: searchTerm || undefined,
          page: 1,
          limit: 5000,
        });

        const columns = [
          { header: "رقم الطلب", align: "center" as const, minWidth: 16 },
          { header: "العنوان", align: "right" as const, minWidth: 28 },
          { header: "المشروع", align: "right" as const, minWidth: 26 },
          { header: "المبلغ (ريال)", align: "center" as const, isAmount: true, numFmt: "#,##0.00", minWidth: 18 },
          { header: "الحالة", align: "center" as const, minWidth: 18 },
          { header: "تاريخ الطلب", align: "center" as const, minWidth: 18 },
        ];

        const rows = (allData?.requests || []).map((req: any) => {
          const statusText = req.status === "draft" ? "مسودة" :
                             req.status === "pending" ? "بانتظار اعتماد مُعد الطلب" :
                             req.status === "pending_executive" ? "بانتظار اعتماد المدير التنفيذي" :
                             req.status === "approved" ? "معتمد" :
                             req.status === "rejected" ? "مرفوض" :
                             req.status === "paid" ? "مصروف" : req.status || "-";

          return [
            req.requestNumber || "-",
            req.title || req.description || "-",
            req.projectName || "-",
            Number(req.amount) || 0,
            statusText,
            req.requestedAt ? new Intl.DateTimeFormat('en-CA').format(new Date(req.requestedAt)) : "-",
          ];
        });

        await exportStyledExcel({
          sheetName: "طلبات الصرف",
          fileName: `تقرير_طلبات_الصرف_${new Intl.DateTimeFormat('en-CA').format(new Date())}.xlsx`,
          columns,
          rows,
          includeIndex: true,
          showTotalRow: true,
        });
      } else {
        const allData = await utils.disbursements.listOrders.fetch({
          status: statusFilter !== "all" ? statusFilter as any : undefined,
          search: searchTerm || undefined,
          page: 1,
          limit: 5000,
        });

        const columns = [
          { header: "رقم الأمر", align: "center" as const, minWidth: 16 },
          { header: "رقم طلب الصرف", align: "center" as const, minWidth: 20 },
          { header: "المشروع", align: "right" as const, minWidth: 26 },
          { header: "المستفيد", align: "right" as const, minWidth: 24 },
          { header: "المبلغ (ريال)", align: "center" as const, isAmount: true, numFmt: "#,##0.00", minWidth: 18 },
          { header: "طريقة الدفع", align: "center" as const, minWidth: 16 },
          { header: "الحالة", align: "center" as const, minWidth: 16 },
          { header: "البنك / رقم السداد", align: "center" as const, minWidth: 20 },
          { header: "الآيبان / رقم المفوتر", align: "center" as const, minWidth: 26 },
        ];

        const rows = (allData?.orders || []).map((order: any) => {
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

          return [
            order.orderNumber || "-",
            order.requestNumber || "-",
            order.projectName || "-",
            order.beneficiaryName || "-",
            Number(order.amount) || 0,
            paymentMethodText,
            statusText,
            bankOrSadad,
            ibanOrBiller,
          ];
        });

        await exportStyledExcel({
          sheetName: "أوامر الصرف",
          fileName: `تقرير_أوامر_الصرف_${new Intl.DateTimeFormat('en-CA').format(new Date())}.xlsx`,
          columns,
          rows,
          includeIndex: true,
          showTotalRow: true,
        });
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
  
  const [page, setPage, resetPage] = usePersistedPage("disbursement_requests_page");
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
  
  const [showExceptionDialog, setShowExceptionDialog] = useState(false);
  const [showViewExceptionDialog, setShowViewExceptionDialog] = useState(false);
  const [exceptionNotes, setExceptionNotes] = useState("");
  
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
      refetchOrders();
    },
    onError: (error) => {
      toast.error(error.message || "حدث خطأ أثناء اعتماد طلب الصرف");
    },
  });

  const rejectRequestMutation = trpc.disbursements.rejectRequest.useMutation({
    onSuccess: () => {
      toast.success("تم إلغاء طلب الصرف");
      setShowRejectDialog(false);
      setRejectionReason("");
      refetchRequests();
    },
    onError: (error) => {
      toast.error(error.message || "حدث خطأ أثناء إلغاء طلب الصرف");
    },
  });

  const exceptionApproveRequestMutation = trpc.disbursements.exceptionApproveRequest.useMutation({
    onSuccess: (data: any) => {
      toast.success(data?.message || "تم تنفيذ استثناء الاعتماد بنجاح وتوثيق بياناتك بدلاً من منشئ الطلب");
      setShowExceptionDialog(false);
      setExceptionNotes("");
      refetchRequests();
    },
    onError: (error) => {
      toast.error(error.message || "حدث خطأ أثناء تنفيذ استثناء الاعتماد");
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

  // التحقق من الصلاحيات (استدعاء جميع الـ Hooks بشكل ثابت لمنع الـ short-circuit)
  const permDisbursementsApprove = usePermission("disbursements.approve");
  const permDisbursementsSign = usePermission("disbursements.sign");
  const permOrdersSign = usePermission("disbursement_orders.sign");
  const permOrdersApprove = usePermission("disbursement_orders.approve");
  const permDisbursementsEdit = usePermission("disbursements.edit");
  const permExceptionApprove = usePermission("disbursements.exception_approve");
  const permDisbursementsView = usePermission("disbursements.view") || usePermission("disbursements") || usePermission("disbursement_requests");
  const permDisbursementsExport = usePermission("disbursements.export");

  const permCreateProjectLinked = usePermission("disbursements.create_project_linked");
  const permCreateFromFund = usePermission("disbursements.create_from_fund");
  const permCreateDonation = usePermission("disbursements.create_donation");
  const permCreateTamamPlatform = usePermission("disbursements.create_tamam_platform");
  const permCreateCustom = usePermission("disbursements.create_custom");

  const canCreateDisbursement = 
    permCreateProjectLinked || 
    permCreateFromFund || 
    permCreateDonation || 
    permCreateTamamPlatform || 
    permCreateCustom;

  const canEditRequest = permDisbursementsEdit;
  const canCreateRequest = permDisbursementsEdit;
  const canApproveRequest = permDisbursementsApprove;
  const canExceptionApprove = permExceptionApprove;
  const hasAnyRowAction = canApproveRequest || canEditRequest || canExceptionApprove;
  const hasApprovePermission = permDisbursementsApprove || permDisbursementsSign || permOrdersSign;
  const canCreateOrder = hasApprovePermission;
  const canApproveOrder = permOrdersApprove || permOrdersSign || hasApprovePermission;
  const canExecuteOrder = ["super_admin", "system_admin", "financial"].includes(user?.role || "");
  const isSuperAdmin = ["super_admin", "system_admin"].includes(user?.role || "");
  const isExecutiveDirector = 
    ["general_manager", "executive_director"].includes(user?.role || "") ||
    (user as any)?.customRole?.nameAr === "المدير التنفيذي" ||
    (user as any)?.customRole?.nameEn?.toLowerCase() === "executive director" ||
    user?.email === "ceo@manarah.org.sa";

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
  const isFirstMount = useRef(true);
  useEffect(() => {
    if (isFirstMount.current) {
      isFirstMount.current = false;
      return;
    }
    resetPage();
  }, [searchTerm, statusFilter, paymentTypeFilter, requestTypeFilter, resetPage]);

  const total = requestsData?.total || 0;
  const totalPages = Math.ceil(total / limit);

  // فرز الطلبات: وضع الطلبات التي بانتظار اعتماد المستخدم في البداية
  const sortedRequests = useMemo(() => {
    if (!requestsData?.requests) return [];
    const list = [...requestsData.requests];

    return list.sort((a, b) => {
      const checkPendingMyAction = (req: any) => {
        if ((req.status === "pending" || req.status === "draft") && (req.requestedBy === user?.id || isSuperAdmin)) {
          return true;
        }
        if (req.status === "pending_executive" && (isExecutiveDirector || isSuperAdmin)) {
          return true;
        }
        return false;
      };

      const aPendingAction = checkPendingMyAction(a);
      const bPendingAction = checkPendingMyAction(b);

      if (aPendingAction && !bPendingAction) return -1;
      if (!aPendingAction && bPendingAction) return 1;

      // الترتيب التلقائي المتبع لحسب تاريخ النشاء/المعرف نزولياً
      const dateA = a.requestedAt ? new Date(a.requestedAt).getTime() : a.id;
      const dateB = b.requestedAt ? new Date(b.requestedAt).getTime() : b.id;
      return dateB - dateA;
    });
  }, [requestsData?.requests, user?.id, isExecutiveDirector, isSuperAdmin, canApproveRequest]);

  const paginatedRequests = sortedRequests;



  if (!permDisbursementsView) {
    return (
      <DashboardLayout tabletNavigation>
        <div className="flex flex-col items-center justify-center min-h-[50vh] text-center p-4 sm:p-6 space-y-4 font-sans" dir="rtl">
          <div className="p-4 rounded-full bg-rose-50 text-rose-600 border border-rose-100 dark:bg-rose-950/30 dark:border-rose-900">
            <AlertCircle className="h-10 w-10 text-rose-600" />
          </div>
          <h2 className="text-lg sm:text-xl font-bold text-slate-800 dark:text-slate-200">عذراً، ليس لديك صلاحية لعرض صفحة طلبات الصرف</h2>
          <p className="text-xs sm:text-sm text-muted-foreground max-w-md">يرجى التواصل مع مسؤول النظام لمنحك صلاحية "عرض طلبات الصرف".</p>
          <Button onClick={() => navigate("/dashboard")} className="mt-2 min-h-10 max-lg:min-h-11 bg-[#1a5f4a] hover:bg-[#154d3c] text-white font-bold text-xs sm:text-sm">
            العودة للوحة التحكم
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout tabletNavigation>
      <div className="w-full min-w-0 max-w-full overflow-x-hidden space-y-4 sm:space-y-6" dir="rtl">
        {/* العنوان والإحصائيات */}
        <div className="flex flex-col gap-3 sm:gap-4 sm:flex-row sm:items-center sm:justify-between" dir="rtl">
          <div className="text-right min-w-0">
            <h1 className="text-lg sm:text-2xl font-bold">طلبات الصرف</h1>
            <p className="text-xs sm:text-sm text-muted-foreground">إدارة طلبات الصرف المالية للمشاريع</p>
          </div>
          {canCreateDisbursement && (
            <div className="w-full sm:w-auto flex justify-end shrink-0">
              <Button 
                onClick={() => navigate("/disbursements/new-linked")}
                className="w-full sm:w-auto min-h-10 max-lg:min-h-11 gradient-primary text-white font-bold"
              >
                <Plus className="ml-2 h-4 w-4 shrink-0" />
                إضافة طلب صرف
              </Button>
            </div>
          )}
        </div>

        {/* بطاقات الإحصائيات */}
        <div className="grid gap-2.5 sm:gap-4 grid-cols-2 sm:grid-cols-3">
          <Card className="border-0 shadow-sm overflow-hidden bg-background hover:shadow-md transition-shadow py-0 gap-0">
            <CardContent className="p-3.5 sm:p-5">
              <div className="flex items-center gap-2.5 sm:gap-3">
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center shrink-0 bg-blue-50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/50 text-blue-600 dark:text-blue-400">
                  <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] sm:text-xs text-muted-foreground font-semibold truncate">طلبات معتمدة</p>
                  <p className="text-lg sm:text-2xl font-black text-foreground mt-0.5">{statsData?.approvedRequests || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm overflow-hidden bg-background hover:shadow-md transition-shadow py-0 gap-0">
            <CardContent className="p-3.5 sm:p-5">
              <div className="flex items-center gap-2.5 sm:gap-3">
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center shrink-0 bg-purple-50 dark:bg-purple-950/30 border border-purple-100 dark:border-purple-900/50 text-purple-600 dark:text-purple-400">
                  <FileText className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] sm:text-xs text-muted-foreground font-semibold truncate">أوامر قيد الاعتماد</p>
                  <p className="text-lg sm:text-2xl font-black text-foreground mt-0.5">{statsData?.pendingOrders || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="col-span-2 sm:col-span-1 border-0 shadow-sm overflow-hidden bg-background hover:shadow-md transition-shadow py-0 gap-0">
            <CardContent className="p-3.5 sm:p-5">
              <div className="flex items-center gap-2.5 sm:gap-3">
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center shrink-0 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/50 text-emerald-600 dark:text-emerald-400">
                  <Banknote className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] sm:text-xs text-muted-foreground font-semibold">إجمالي المصروف</p>
                  <p className="text-lg sm:text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-0.5 truncate leading-none inline-flex items-center gap-1">
                    {Number(statsData?.totalPaid || 0).toLocaleString()} <SaudiRiyal className="w-4 h-4 inline shrink-0" />
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
          <TabsContent value="requests" className="space-y-4 pt-2 sm:pt-4">
            {/* الفلاتر */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:flex lg:items-center gap-2.5 sm:gap-3">
              <div className="relative sm:col-span-2 lg:flex-1">
                <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                <Input
                  placeholder="بحث برقم الطلب أو العنوان أو المشروع..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pr-10 h-10 max-lg:min-h-11 max-md:text-base text-right font-medium"
                  dir="rtl"
                />
              </div>
              <Select value={requestTypeFilter} onValueChange={setRequestTypeFilter}>
                <SelectTrigger className="w-full lg:w-[190px] h-10 max-lg:min-h-11 pointer-coarse:min-h-11">
                  <Filter className="ml-2 h-4 w-4 shrink-0" />
                  <SelectValue placeholder="نوع الطلب" />
                </SelectTrigger>
                <SelectContent dir="rtl">
                  <SelectItem value="all">جميع الطلبات</SelectItem>
                  <SelectItem value="linked">طلب مرتبط بمشروع</SelectItem>
                  <SelectItem value="custom">طلب صرف مخصص</SelectItem>
                </SelectContent>
              </Select>

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full lg:w-[220px] h-10 max-lg:min-h-11 pointer-coarse:min-h-11">
                  <Filter className="ml-2 h-4 w-4 shrink-0" />
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

              {permDisbursementsExport && (
                <Button 
                  onClick={handleExportExcel} 
                  disabled={isExporting}
                  variant="outline"
                  className="w-full sm:col-span-2 lg:w-auto h-10 max-lg:min-h-11 border-[#1a5f4a]/30 text-[#1a5f4a] bg-transparent hover:bg-[#1a5f4a]/5 hover:text-[#1a5f4a] font-bold rounded-lg shrink-0 flex items-center justify-center gap-1.5 transition-colors"
                >
                  {isExporting ? (
                    <Loader2 className="h-4 w-4 animate-spin shrink-0" />
                  ) : (
                    <Download className="h-4 w-4 shrink-0" />
                  )}
                  <span dir="rtl">تصدير إلى Excel</span>
                </Button>
              )}
            </div>

            {/* جدول طلبات الصرف - Desktop & Card View - Mobile/iPad */}
            <Card className="border-0 shadow-sm overflow-hidden py-0 gap-0">
              <CardContent className="p-0">
                {/* Desktop View Table */}
                <div className="hidden xl:block w-full overflow-x-auto">
                  <Table dir="rtl" className="w-full min-w-[950px]">
                    <TableHeader className="bg-slate-50/70 dark:bg-slate-900/70 border-b border-border">
                      <TableRow className="hover:bg-transparent">
                        <TableHead className="py-3.5 px-4 text-right min-w-[150px] font-bold text-slate-700 dark:text-slate-200">رقم الطلب</TableHead>
                        <TableHead className="py-3.5 px-4 text-right min-w-[200px] font-bold text-slate-700 dark:text-slate-200">العنوان</TableHead>
                        <TableHead className="py-3.5 px-4 text-right min-w-[180px] font-bold text-slate-700 dark:text-slate-200">المشروع</TableHead>
                        <TableHead className="py-3.5 px-4 text-right min-w-[130px] font-bold text-slate-700 dark:text-slate-200">المبلغ</TableHead>
                        <TableHead className="py-3.5 px-4 text-right min-w-[210px] font-bold text-slate-700 dark:text-slate-200">الحالة</TableHead>
                        <TableHead className="py-3.5 px-4 text-right min-w-[110px] font-bold text-slate-700 dark:text-slate-200">التاريخ</TableHead>
                        {hasAnyRowAction && (
                        <TableHead className="py-3.5 px-4 text-center min-w-[100px] font-bold text-slate-700 dark:text-slate-200">الإجراءات</TableHead>
                      )}
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

                          const isConverted = !!request.orderId || request.status === "paid" || request.status === "approved";
                          const isPendingMyAction = 
                            ((request.status === "pending" || request.status === "draft") && (request.requestedBy === user?.id || isSuperAdmin)) ||
                            (request.status === "pending_executive" && (isExecutiveDirector || isSuperAdmin));

                          return (
                            <TableRow 
                              key={request.id} 
                              className={isPendingMyAction ? "bg-emerald-100/75 dark:bg-emerald-950/60 hover:bg-emerald-200/70 dark:hover:bg-emerald-900/70 border-r-4 border-r-emerald-700 dark:border-r-emerald-400 transition-all shadow-xs" : ""}
                            >
                              <TableCell className="py-3.5 px-4 font-sans text-xs text-right font-bold whitespace-nowrap">
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
                                          <span>
                                            {request.status === "pending_executive" 
                                              ? (isExecutiveDirector ? "بانتظار اعتمادك (المدير التنفيذي)" : "بانتظار اعتماد المدير التنفيذي") 
                                              : (request.requestedBy === user?.id ? "بانتظار اعتمادك (مُعد الطلب)" : "بانتظار اعتماد مُعد الطلب")}
                                          </span>
                                        </TooltipContent>
                                      </Tooltip>
                                    </TooltipProvider>
                                  )}
                                  <span>{request.requestNumber}</span>
                                </div>
                              </TableCell>
                              <TableCell className="py-3.5 px-4 max-w-[240px] text-right text-xs">
                                <div className="flex items-center gap-1.5 justify-start">
                                  <span className="truncate">{request.title || request.description}</span>
                                  {request.isException && (
                                    <TooltipProvider>
                                      <Tooltip delayDuration={100}>
                                        <TooltipTrigger asChild>
                                          <span className="inline-flex items-center justify-center p-0.5 rounded bg-amber-100/80 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400 shrink-0 cursor-help">
                                            <ShieldAlert className="w-3.5 h-3.5 text-amber-600" />
                                          </span>
                                        </TooltipTrigger>
                                        <TooltipContent side="top" className="bg-amber-900 text-amber-50 text-[11px] font-medium px-2.5 py-1 rounded-md shadow-lg border border-amber-700 z-50">
                                          تم اعتماد المرحلة الأولى باستثناء اعتماد مُعد الطلب
                                        </TooltipContent>
                                      </Tooltip>
                                    </TooltipProvider>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell className="py-3.5 px-4 max-w-[200px] text-right">
                                {request.projectId ? (
                                  <span className="font-semibold text-slate-700 dark:text-slate-300 text-xs block truncate">
                                    {request.projectName}
                                  </span>
                                ) : (
                                  <span className="text-muted-foreground text-xs font-medium">-</span>
                                )}
                              </TableCell>
                              <TableCell className="py-3.5 px-4 whitespace-nowrap text-right font-semibold text-xs">
                                <span className="inline-flex items-center gap-1">
                                  {Number(request.amount).toLocaleString()} <SaudiRiyal className="w-3.5 h-3.5" />
                                </span>
                              </TableCell>
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
                              {hasAnyRowAction && (
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
                                        <span>عرض سبب إلغاء طلب الصرف</span>
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
                                      {canApproveRequest && (
                                        <DropdownMenuItem
                                          onClick={() => navigate(`/disbursements/requests/${request.id}/print`)}
                                          className="flex items-center gap-2 cursor-pointer text-slate-700 hover:text-blue-600 focus:text-blue-600 focus:bg-blue-50 dark:focus:bg-blue-950/30"
                                        >
                                          <Printer className="h-4 w-4 text-blue-500" />
                                          <span>عرض تقرير طلب الصرف</span>
                                        </DropdownMenuItem>
                                      )}

                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                ) : isConverted ? (
                                  canApproveRequest ? (
                                    <div className="flex flex-wrap justify-center gap-1.5">
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => navigate(`/disbursements/requests/${request.id}/print`)}
                                        className="flex items-center gap-1.5 text-xs text-[#1a5f4a] border-[#1a5f4a]/20 hover:bg-[#1a5f4a]/5 hover:text-[#1a5f4a] font-bold"
                                      >
                                        <FileText className="h-3.5 w-3.5" />
                                        عرض تقرير طلب الصرف
                                      </Button>
                                    </div>
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
                                      {canApproveRequest && (
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
                                          <span>تعديل طلب الصرف</span>
                                        </DropdownMenuItem>
                                      )}
                                      {request.fundRestrictionType !== "project" && correspondingReport && (
                                        <DropdownMenuItem
                                          onClick={() => navigate(`/progress-reports/${correspondingReport.id}/print`)}
                                          className="flex items-center gap-2 cursor-pointer text-slate-700 hover:text-blue-600 focus:text-blue-600 focus:bg-blue-50 dark:focus:bg-blue-950/30"
                                        >
                                          <FileText className="h-4 w-4 text-blue-500" />
                                          <span>عرض تقرير الإنجاز</span>
                                        </DropdownMenuItem>
                                      )}
                                      
                                      {/* Super Admin ONLY: Approval Exception (استثناء اعتماد) */}
                                      {canExceptionApprove && request.requestedBy !== user?.id && (request.status === "pending" || request.status === "draft") && (
                                        <DropdownMenuItem
                                          onClick={() => {
                                            setSelectedRequest(request);
                                            setExceptionNotes("");
                                            setShowExceptionDialog(true);
                                          }}
                                          className="flex items-center gap-2 cursor-pointer font-bold text-amber-700 hover:text-amber-800 focus:text-amber-800 focus:bg-amber-50 dark:focus:bg-amber-950/30"
                                        >
                                          <ShieldAlert className="h-4 w-4 text-amber-600" />
                                          <span>استثناء اعتماد مُعد الطلب</span>
                                        </DropdownMenuItem>
                                      )}

                                      {/* عرض مبررات استثناء الاعتماد */}
                                      {request.isException && (
                                        <DropdownMenuItem
                                          onClick={() => {
                                            setSelectedRequest(request);
                                            setShowViewExceptionDialog(true);
                                          }}
                                          className="flex items-center gap-2 cursor-pointer text-amber-800 dark:text-amber-400 hover:text-amber-900 focus:text-amber-900 focus:bg-amber-50 dark:focus:bg-amber-950/30 font-medium"
                                        >
                                          <Info className="h-4 w-4 text-amber-600" />
                                          <span>عرض مبررات استثناء الاعتماد</span>
                                        </DropdownMenuItem>
                                      )}

                                      {/* Stage 1 Approval: Preparer */}
                                      {(request.status === "pending" || request.status === "draft") && (request.requestedBy === user?.id) && canApproveRequest && (
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
                                            <span>إلغاء طلب الصرف</span>
                                          </DropdownMenuItem>
                                        </>
                                      )}

                                      {/* Stage 2 Approval: Executive Director ONLY */}
                                      {request.status === "pending_executive" && isExecutiveDirector && canApproveRequest && (
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
                                            <span>إلغاء طلب الصرف</span>
                                          </DropdownMenuItem>
                                        </>
                                      )}

                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                )}
                              </TableCell>
                              )}
                            </TableRow>
                          );
                        })
                      )}
                    </TableBody>
                  </Table>
                </div>

                {/* Mobile & iPad View Cards */}
                <div className="xl:hidden p-3 sm:p-4 bg-muted/15 grid grid-cols-1 md:grid-cols-2 gap-3">
                  {paginatedRequests.length === 0 ? (
                    <div className="md:col-span-2 p-8 text-center text-muted-foreground">لا توجد طلبات صرف</div>
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

                        const isConverted = !!request.orderId || request.status === "paid" || request.status === "approved";
                        const isPendingMyAction = 
                          ((request.status === "pending" || request.status === "draft") && (request.requestedBy === user?.id || isSuperAdmin)) ||
                          (request.status === "pending_executive" && (isExecutiveDirector || isSuperAdmin));

                        return (
                          <Card
                            key={request.id}
                            className={`border shadow-sm overflow-hidden bg-background hover:shadow-md transition-all rounded-xl py-0 gap-0 flex flex-col justify-between ${
                              isPendingMyAction
                                ? "bg-emerald-100/75 dark:bg-emerald-950/60 border-2 border-emerald-700 dark:border-emerald-400 shadow-md"
                                : "border-border/80"
                            }`}
                          >
                            <div className="p-3.5 sm:p-4 space-y-3.5 flex-1 flex flex-col justify-between">
                              <div className="space-y-3">
                                {/* Card Header (matches /disbursement-orders) */}
                                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/50 pb-3">
                                  <div className="flex items-center gap-1.5 min-w-0">
                                    {isPendingMyAction && (
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
                                            <span>
                                              {request.status === "pending_executive"
                                                ? (isExecutiveDirector ? "بانتظار اعتمادك (المدير التنفيذي)" : "بانتظار اعتماد المدير التنفيذي")
                                                : (request.requestedBy === user?.id ? "بانتظار اعتمادك (مُعد الطلب)" : "بانتظار اعتماد مُعد الطلب")}
                                            </span>
                                          </TooltipContent>
                                        </Tooltip>
                                      </TooltipProvider>
                                    )}
                                    <span className="font-mono text-xs font-bold text-amber-700 bg-amber-50 dark:bg-amber-950/20 px-2.5 py-1 rounded-md truncate">
                                      {request.requestNumber}
                                    </span>
                                    {request.isException && (
                                      <TooltipProvider>
                                        <Tooltip delayDuration={100}>
                                          <TooltipTrigger asChild>
                                            <span className="inline-flex items-center justify-center p-0.5 rounded bg-amber-100/80 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400 shrink-0 cursor-help">
                                              <ShieldAlert className="w-3.5 h-3.5 text-amber-600" />
                                            </span>
                                          </TooltipTrigger>
                                          <TooltipContent side="top" className="bg-amber-900 text-amber-50 text-[11px] font-medium px-2.5 py-1 rounded-md shadow-lg border border-amber-700 z-50">
                                            تم اعتماد المرحلة الأولى باستثناء اعتماد مُعد الطلب
                                          </TooltipContent>
                                        </Tooltip>
                                      </TooltipProvider>
                                    )}
                                  </div>

                                  <div className="flex items-center gap-1.5 shrink-0">
                                    <DisbursementStatusBadge
                                      status={request.status as any}
                                      type="request"
                                    />
                                  </div>
                                </div>

                                {/* Card Body */}
                                <div className="space-y-2.5">
                                  <div className="flex items-start gap-2 bg-muted/30 p-2 rounded-lg">
                                    <span className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-1.5 shrink-0" />
                                    <div className="min-w-0 text-right flex-1">
                                      <p className="text-[9px] text-muted-foreground font-medium">العنوان</p>
                                      <p className="text-xs text-foreground font-bold leading-snug break-words">
                                        {request.title || request.description || "—"}
                                      </p>
                                    </div>
                                  </div>

                                  <div className="flex items-start gap-2 bg-muted/30 p-2 rounded-lg">
                                    <span className="w-1.5 h-1.5 bg-amber-500 rounded-full mt-1.5 shrink-0" />
                                    <div className="min-w-0 text-right flex-1">
                                      <p className="text-[9px] text-muted-foreground font-medium">المشروع</p>
                                      <p className="text-xs text-foreground font-semibold truncate">
                                        {request.projectId ? (request.projectName || "—") : "طلب صرف مخصص"}
                                      </p>
                                    </div>
                                  </div>

                                  <div className="grid grid-cols-2 gap-3 text-right">
                                    <div className="bg-emerald-50/20 dark:bg-emerald-950/10 border border-emerald-100/50 dark:border-emerald-900/30 p-2 rounded-lg min-w-0">
                                      <p className="text-[9px] text-emerald-800 dark:text-emerald-400 font-semibold mb-0.5">المبلغ</p>
                                      <div className="text-xs sm:text-sm font-semibold text-emerald-600 dark:text-emerald-400 flex flex-wrap items-center gap-1 tabular-nums break-all">
                                        <span>{Number(request.amount).toLocaleString()}</span>
                                        <SaudiRiyal className="w-3.5 h-3.5 shrink-0" />
                                      </div>
                                    </div>
                                    <div className="bg-muted/40 p-2 rounded-lg min-w-0">
                                      <p className="text-[9px] text-muted-foreground font-medium mb-0.5">نوع الدفعة</p>
                                      <p className="text-xs font-semibold text-foreground truncate">
                                        {PAYMENT_TYPE_MAP[request.paymentType || "progress"] || "—"}
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              </div>

                              {/* Card Actions Footer */}
                              <div className="flex items-center justify-between pt-3 border-t border-border/50" onClick={(e) => e.stopPropagation()}>
                                <span className="text-[10px] text-muted-foreground font-medium">
                                  {request.requestedAt ? new Date(request.requestedAt).toLocaleDateString("ar-SA") : "—"}
                                </span>

                                {hasAnyRowAction && (
                                  <div className="flex gap-1.5">
                                    <DropdownMenu>
                                      <DropdownMenuTrigger asChild>
                                        <Button variant="outline" size="sm" className="h-9 w-9 p-0 hover:bg-muted rounded-full">
                                          <MoreVertical className="h-3.5 w-3.5 text-muted-foreground" />
                                        </Button>
                                      </DropdownMenuTrigger>
                                      <DropdownMenuContent align="start" className="w-56 text-right font-medium">
                                        {/* 1. Print/View Report */}
                                        {canApproveRequest && (
                                          <DropdownMenuItem
                                            onClick={() => navigate(`/disbursements/requests/${request.id}/print`)}
                                            className="flex items-center gap-2 cursor-pointer text-slate-700 hover:text-blue-600 focus:text-blue-600 focus:bg-blue-50 dark:focus:bg-blue-950/30"
                                          >
                                            <Printer className="h-4 w-4 text-blue-500" />
                                            <span>عرض تقرير طلب الصرف</span>
                                          </DropdownMenuItem>
                                        )}

                                        {/* Approval Exception */}
                                        {canExceptionApprove && request.requestedBy !== user?.id && (request.status === "pending" || request.status === "draft") && (
                                          <DropdownMenuItem
                                            onClick={() => {
                                              setSelectedRequest(request);
                                              setExceptionNotes("");
                                              setShowExceptionDialog(true);
                                            }}
                                            className="flex items-center gap-2 cursor-pointer font-bold text-amber-700 hover:text-amber-800 focus:text-amber-800 focus:bg-amber-50 dark:focus:bg-amber-950/30"
                                          >
                                            <ShieldAlert className="h-4 w-4 text-amber-600" />
                                            <span>استثناء اعتماد مُعد الطلب</span>
                                          </DropdownMenuItem>
                                        )}

                                        {/* Rejection Reason */}
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
                                            <span>عرض سبب الإلغاء</span>
                                          </DropdownMenuItem>
                                        )}

                                        {/* Edit Request */}
                                        {canEditRequest && (request.status === "draft" || request.status === "rejected" || request.status === "pending") && (
                                          <DropdownMenuItem
                                            onClick={() => navigate(`/disbursements/requests/${request.id}/edit`)}
                                            className="flex items-center gap-2 cursor-pointer text-slate-700 hover:text-[#1a5f4a] focus:text-[#1a5f4a] focus:bg-[#1a5f4a]/5 dark:focus:bg-[#1a5f4a]/10"
                                          >
                                            <FileText className="h-4 w-4 text-gray-500" />
                                            <span>تعديل طلب الصرف</span>
                                          </DropdownMenuItem>
                                        )}

                                        {/* Stage 1 Approval: Preparer */}
                                        {(request.status === "pending" || request.status === "draft") && (request.requestedBy === user?.id) && canApproveRequest && (
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
                                              <span>إلغاء طلب الصرف</span>
                                            </DropdownMenuItem>
                                          </>
                                        )}

                                        {/* Stage 2 Approval: Executive Director */}
                                        {request.status === "pending_executive" && isExecutiveDirector && canApproveRequest && (
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
                                              <span>إلغاء طلب الصرف</span>
                                            </DropdownMenuItem>
                                          </>
                                        )}

                                        {/* Progress Report */}
                                        {request.fundRestrictionType !== "project" && correspondingReport && (
                                          <DropdownMenuItem
                                            onClick={() => navigate(`/progress-reports/${correspondingReport.id}/print`)}
                                            className="flex items-center gap-2 cursor-pointer text-slate-700 hover:text-purple-600 focus:text-purple-600 focus:bg-purple-50 dark:focus:bg-purple-950/30"
                                          >
                                            <FileText className="h-4 w-4 text-purple-500" />
                                            <span>عرض تقرير الإنجاز</span>
                                          </DropdownMenuItem>
                                        )}
                                      </DropdownMenuContent>
                                    </DropdownMenu>
                                  </div>
                                )}
                              </div>
                            </div>
                          </Card>
                        );
                    })
                  )}
                </div>

                {/* Footer with Pagination */}
                <EnhancedPagination
                  page={page}
                  totalPages={totalPages}
                  onPageChange={(newPage) => {
                    setPage(newPage);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  totalItems={total}
                  itemsPerPage={limit}
                  itemName="طلب صرف"
                  itemNamePlural="طلبات صرف"
                  className="max-sm:px-2 max-sm:[&_button]:px-2 pointer-coarse:[&_button]:min-h-11"
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* أوامر الصرف */}
          <TabsContent value="orders" className="space-y-4">
            <Card className="border-0 shadow-sm overflow-hidden py-0 gap-0">
              <CardContent className="p-0">
                {/* Desktop View Table */}
                <div className="hidden xl:block overflow-x-auto">
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
                            <TableCell className="whitespace-nowrap">
                              <span className="inline-flex items-center gap-1">
                                {Number(order.amount).toLocaleString()} <SaudiRiyal className="w-3.5 h-3.5" />
                              </span>
                            </TableCell>
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

                {/* Mobile & iPad View Cards */}
                <div className="xl:hidden p-3 sm:p-4 bg-muted/15 grid grid-cols-1 md:grid-cols-2 gap-3">
                  {ordersData?.orders?.length === 0 ? (
                    <div className="col-span-full p-8 text-center text-muted-foreground">لا توجد أوامر صرف</div>
                  ) : (
                    ordersData?.orders?.map((order) => (
                      <div key={order.id} className="p-3.5 sm:p-4 space-y-3 rounded-xl border border-border/80 bg-card shadow-2xs hover:bg-muted/10 transition-colors flex flex-col justify-between">
                        <div className="space-y-3">
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
                                <Button variant="ghost" size="icon" className="h-9 w-9 max-lg:min-h-10 max-lg:min-w-10 rounded-full hover:bg-muted">
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

                        <div className="grid grid-cols-2 gap-3 pt-1">
                          <div>
                            <p className="text-[10px] text-muted-foreground mb-0.5">المبلغ</p>
                            <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 inline-flex items-center gap-1">
                              {Number(order.amount).toLocaleString()} <SaudiRiyal className="w-3.5 h-3.5" />
                            </p>
                          </div>
                          <div>
                            <p className="text-[10px] text-muted-foreground mb-0.5">طريقة الدفع</p>
                            <p className="text-xs font-medium">{PAYMENT_METHOD_MAP[order.paymentMethod || "bank_transfer"]}</p>
                          </div>
                        </div>
                        </div>

                        <div className="flex items-center justify-between pt-2 border-t border-border/50">
                          <p className="text-[11px] text-muted-foreground truncate">{order.projectName || "أمر صرف مخصص"}</p>
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
          <DialogContent className="w-[calc(100vw-1rem)] sm:w-[95vw] sm:max-w-3xl max-h-[calc(100dvh-2rem)] overflow-y-auto p-4 sm:p-6">
            <DialogHeader className="text-right">
              <DialogTitle>طلب صرف جديد</DialogTitle>
              <DialogDescription>اختر المشروع وسيتم تعبئة البيانات تلقائياً</DialogDescription>
            </DialogHeader>
            
            <div className="space-y-5">
              {/* اختيار المشروع */}
              <div className="space-y-2">
                <Label className="text-base font-semibold">المشروع *</Label>
                <Select
                  value={newRequest.projectId ? newRequest.projectId.toString() : ""}
                  onValueChange={handleProjectSelect}
                >
                  <SelectTrigger className="h-10 max-lg:min-h-11">
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
                <Card className="bg-muted/50 py-0 gap-0">
                  <CardHeader className="p-4 pb-2.5">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Building2 className="h-4 w-4" />
                      بيانات المشروع والعقد
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 pt-2 space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">اسم المشروع:</span>
                        <p className="font-medium break-words">{selectedProjectData.projectName}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">رقم المشروع:</span>
                        <p className="font-medium">{selectedProjectData.projectNumber}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">وصف الأعمال:</span>
                        <p className="font-medium break-words">{selectedProjectData.contractTitle || "-"}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">إجمالي قيمة العقد:</span>
                        <p className="font-medium text-primary inline-flex items-center gap-1">
                          {Number(selectedProjectData.contractAmount || 0).toLocaleString()} <SaudiRiyal className="w-3.5 h-3.5" />
                        </p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">إجمالي ما تم دفعه:</span>
                        <p className="font-medium text-green-600 inline-flex items-center gap-1">
                          {Number(selectedProjectData.totalPaid || 0).toLocaleString()} <SaudiRiyal className="w-3.5 h-3.5" />
                        </p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">المبلغ المتبقي:</span>
                        <p className="font-medium text-orange-600 inline-flex items-center gap-1">
                          {Number(selectedProjectData.remainingAmount || 0).toLocaleString()} <SaudiRiyal className="w-3.5 h-3.5" />
                        </p>
                      </div>
                    </div>
                    
                    <Separator />
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">اسم المورد:</span>
                        <p className="font-medium break-words">{selectedProjectData.supplierName || "-"}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">البنك:</span>
                        <p className="font-medium">{selectedProjectData.supplierBank || "-"}</p>
                      </div>
                      <div className="sm:col-span-2">
                        <span className="text-muted-foreground">رقم الآيبان:</span>
                        <p className="font-medium font-mono break-all" dir="ltr">
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
                    className="max-md:text-base h-10 max-lg:min-h-11"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>الوصف</Label>
                  <Textarea
                    value={newRequest.description}
                    onChange={(e) => setNewRequest({ ...newRequest, description: e.target.value })}
                    placeholder="تفاصيل إضافية عن طلب الصرف..."
                    rows={3}
                    className="max-md:text-base"
                  />
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="flex items-center gap-1">الدفعة المطلوبة (<SaudiRiyal className="w-3.5 h-3.5" />) *</Label>
                    <Input
                      type="number"
                      value={newRequest.amount}
                      onChange={(e) => setNewRequest({ ...newRequest, amount: e.target.value })}
                      placeholder="0"
                      className="max-md:text-base h-10 max-lg:min-h-11"
                    />
                    {selectedProjectData && newRequest.amount && (
                      <p className="text-xs text-muted-foreground inline-flex items-center gap-1">
                        المتبقي بعد هذه الدفعة: {(Number(selectedProjectData.remainingAmount || 0) - Number(newRequest.amount || 0)).toLocaleString()} <SaudiRiyal className="w-3 h-3" />
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>نوع الدفعة</Label>
                    <Select
                      value={newRequest.paymentType}
                      onValueChange={(v: any) => setNewRequest({ ...newRequest, paymentType: v })}
                    >
                      <SelectTrigger className="h-10 max-lg:min-h-11">
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
                    className="max-md:text-base h-10 max-lg:min-h-11"
                  />
                </div>
              </div>
            </div>
            
            <DialogFooter className="flex-col-reverse sm:flex-row gap-2">
              <Button variant="outline" className="w-full sm:w-auto min-h-10 max-lg:min-h-11" onClick={() => setShowCreateDialog(false)}>
                إلغاء
              </Button>
              <Button 
                className="w-full sm:w-auto min-h-10 max-lg:min-h-11"
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
          <DialogContent className="w-[calc(100vw-1rem)] sm:w-[95vw] sm:max-w-2xl max-h-[calc(100dvh-2rem)] overflow-y-auto p-4 sm:p-6">
            <DialogHeader className="text-right">
              <DialogTitle>تفاصيل طلب الصرف</DialogTitle>
              <DialogDescription>
                طلب رقم {selectedRequest?.requestNumber}
              </DialogDescription>
            </DialogHeader>
            {selectedRequest && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div>
                    <Label className="text-muted-foreground">العنوان</Label>
                    <p className="font-medium break-words">{selectedRequest.title}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">المشروع</Label>
                    <p className="font-medium break-words">{selectedRequest.projectName}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">المبلغ</Label>
                    <p className="font-medium text-primary inline-flex items-center gap-1">
                      {Number(selectedRequest.amount).toLocaleString()} <SaudiRiyal className="w-3.5 h-3.5" />
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
                        <div className="mt-4 p-3.5 sm:p-4 border rounded-xl bg-primary/[0.02] border-primary/10 space-y-3 text-right" dir="rtl">
                          <h4 className="font-bold text-xs text-primary border-b pb-2">بيانات التمويل والمشروع</h4>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 text-xs">
                            {metadata.fundingSupport && (
                              <div>
                                <span className="text-muted-foreground">التمويل / الدعم:</span>
                                <p className="font-bold text-slate-800 dark:text-slate-200 mt-0.5 break-words">{metadata.fundingSupport}</p>
                              </div>
                            )}
                            {metadata.mainProjectName && (
                              <div>
                                <span className="text-muted-foreground">اسم المشروع الرئيسي:</span>
                                <p className="font-bold text-slate-800 dark:text-slate-200 mt-0.5 break-words">{metadata.mainProjectName}</p>
                              </div>
                            )}
                            {metadata.customProjectName && (
                              <div>
                                <span className="text-muted-foreground">اسم المشروع المخصص:</span>
                                <p className="font-bold text-slate-800 dark:text-slate-200 mt-0.5 break-words">{metadata.customProjectName}</p>
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

                      {/* توصية إدارة المشاريع وتقرير الإنجاز المرتبط */}
                      {(metadata?.recommendations || metadata?.reportId || metadata?.requestType === "project_linked") && (
                        <div className="p-3.5 sm:p-4 border border-emerald-200 dark:border-emerald-800 rounded-xl bg-emerald-50/40 dark:bg-emerald-950/20 space-y-3 text-right" dir="rtl">
                          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-emerald-200 dark:border-emerald-800 pb-2">
                            <h4 className="font-bold text-xs text-emerald-900 dark:text-emerald-300 flex items-center gap-1.5">
                              <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                              توصية إدارة المشاريع المعتمدة
                            </h4>
                            {metadata?.reportId && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => window.open(`/progress-reports/${metadata.reportId}/print`, "_blank")}
                                className="h-8 text-[11px] gap-1 font-bold text-emerald-700 border-emerald-300 bg-white hover:bg-emerald-50 dark:bg-slate-900 dark:text-emerald-400 dark:border-emerald-700 shadow-xs"
                              >
                                <FileText className="h-3 w-3 ml-1" />
                                معاينة تقرير الإنجاز (PDF)
                              </Button>
                            )}
                          </div>
                          {metadata?.recommendations ? (
                            <p className="text-xs text-foreground/90 whitespace-pre-wrap leading-relaxed bg-white/70 dark:bg-slate-900/50 p-2.5 rounded-lg border border-emerald-100 dark:border-emerald-900">
                              {metadata.recommendations}
                            </p>
                          ) : (
                            <p className="text-xs text-muted-foreground italic">
                              تم ربط الطلب بتقرير الإنجاز رقم {metadata?.reportNumber || `#${metadata?.reportId}`}
                            </p>
                          )}
                        </div>
                      )}

                      {metadata && metadata.requestType && metadata.requestType !== "project_linked" && metadata.requestType !== "custom_standard" && (
                        <div className="p-3.5 sm:p-4 border rounded-xl bg-slate-50 dark:bg-slate-900/50 space-y-3 text-right" dir="rtl">
                          <h4 className="font-bold text-xs text-primary border-b pb-2">تفاصيل الطلب والبيانات المالية</h4>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 text-xs">
                            {isSadad ? (
                              <>
                                <div>
                                  <span className="text-muted-foreground">اسم المفوتر:</span>
                                  <p className="font-bold text-slate-800 dark:text-slate-200 mt-0.5 break-words">{metadata.billerName || metadata.name}</p>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">رمز المفوتر:</span>
                                  <p className="font-medium text-slate-700 dark:text-slate-300 mt-0.5">{metadata.billerCode || metadata.bank}</p>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">رقم سداد:</span>
                                  <p className="font-mono font-medium text-slate-700 dark:text-slate-300 mt-0.5 break-all">{metadata.sadadNumber || metadata.iban}</p>
                                </div>
                              </>
                            ) : (
                              <>
                                <div>
                                  <span className="text-muted-foreground">اسم المستفيد:</span>
                                  <p className="font-bold text-slate-800 dark:text-slate-200 mt-0.5 break-words">{metadata.beneficiaryName || metadata.name}</p>
                                </div>
                                {metadata.bankAccountName && (
                                  <div>
                                    <span className="text-muted-foreground">اسم الحساب البنكي:</span>
                                    <p className="font-medium text-slate-700 dark:text-slate-300 mt-0.5 break-words">{metadata.bankAccountName}</p>
                                  </div>
                                )}
                                <div>
                                  <span className="text-muted-foreground">البنك:</span>
                                  <p className="font-medium text-slate-700 dark:text-slate-300 mt-0.5">{metadata.bankName || metadata.bank}</p>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">رقم الآيبان (IBAN):</span>
                                  <p className="font-mono font-medium text-slate-700 dark:text-slate-300 mt-0.5 break-all" dir="ltr">{metadata.iban}</p>
                                </div>
                              </>
                            )}
                            <div>
                              <span className="text-muted-foreground">المبلغ:</span>
                              <p className="font-bold text-primary mt-0.5 inline-flex items-center gap-1">{Number(metadata.agreedAmount || selectedRequest.amount).toLocaleString()} <SaudiRiyal className="w-3.5 h-3.5" /></p>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* دعم النوع القديم للمورد المخصص */}
                      {metadata && (metadata.requestType === "custom_standard" || (!metadata.requestType && metadata.name)) && (
                        <div className="p-3.5 sm:p-4 border rounded-xl bg-slate-50 dark:bg-slate-900/50 space-y-3 text-right" dir="rtl">
                          <h4 className="font-bold text-xs text-primary border-b pb-2">تفاصيل المستفيد والبيانات البنكية</h4>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 text-xs">
                            <div>
                              <span className="text-muted-foreground">اسم المستفيد:</span>
                              <p className="font-bold text-slate-800 dark:text-slate-200 mt-0.5 break-words">{metadata.name}</p>
                            </div>
                            <div>
                              <span className="text-muted-foreground">بيان الأعمال:</span>
                              <p className="font-medium text-slate-700 dark:text-slate-300 mt-0.5 break-words">{metadata.work}</p>
                            </div>
                            <div>
                              <span className="text-muted-foreground">البنك:</span>
                              <p className="font-medium text-slate-700 dark:text-slate-300 mt-0.5">{metadata.bank}</p>
                            </div>
                            <div>
                              <span className="text-muted-foreground">رقم الآيبان (IBAN):</span>
                              <p className="font-mono font-medium text-slate-700 dark:text-slate-300 mt-0.5 break-all" dir="ltr">{metadata.iban}</p>
                            </div>
                            {metadata.agreedAmount > 0 && (
                              <div>
                                <span className="text-muted-foreground">المبلغ المتفق عليه:</span>
                                <p className="font-medium text-slate-700 dark:text-slate-300 mt-0.5 inline-flex items-center gap-1">{metadata.agreedAmount.toLocaleString()} <SaudiRiyal className="w-3.5 h-3.5" /></p>
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
            <DialogFooter className="flex-col-reverse sm:flex-row gap-2">
              <Button variant="outline" className="w-full sm:w-auto min-h-10 max-lg:min-h-11" onClick={() => setShowDetailsDialog(false)}>
                إغلاق
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* نافذة اعتماد طلب الصرف */}
        <Dialog open={showApproveDialog} onOpenChange={setShowApproveDialog}>
          <DialogContent dir="rtl" className="w-[calc(100vw-1rem)] sm:w-[95vw] sm:max-w-lg max-h-[calc(100dvh-2rem)] overflow-y-auto p-4 sm:p-6">
            <DialogHeader className="text-right">
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
              <div className="rounded-lg bg-muted p-3.5 sm:p-4 space-y-1">
                <p className="font-bold text-slate-800 break-words">{selectedRequest?.title}</p>
                <p className="text-sm text-slate-600 inline-flex items-center gap-1">
                  المبلغ: <span className="font-bold text-[#1a5f4a] inline-flex items-center gap-1">{Number(selectedRequest?.amount || 0).toLocaleString()} <SaudiRiyal className="w-3.5 h-3.5" /></span>
                </p>
                {selectedRequest?.projectName && (
                  <p className="text-xs text-slate-500 break-words">المشروع: {selectedRequest.projectName}</p>
                )}
              </div>


              <div className="space-y-2">
                <Label>ملاحظات الاعتماد (اختياري)</Label>
                <Textarea
                  value={approvalNotes}
                  onChange={(e) => setApprovalNotes(e.target.value)}
                  placeholder="أدخل أي ملاحظات..."
                  className="max-md:text-base"
                />
              </div>
            </div>
            <DialogFooter className="flex-col-reverse sm:flex-row gap-2">
              <Button variant="outline" className="w-full sm:w-auto min-h-10 max-lg:min-h-11" onClick={() => setShowApproveDialog(false)}>
                إلغاء
              </Button>
              <Button
                className="w-full sm:w-auto min-h-10 max-lg:min-h-11 bg-[#1a5f4a] hover:bg-[#154d3c] text-white font-bold"
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

        {/* نافذة إلغاء طلب الصرف */}
        <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
          <DialogContent className="w-[calc(100vw-1rem)] sm:w-[95vw] sm:max-w-lg max-h-[calc(100dvh-2rem)] overflow-y-auto p-4 sm:p-6">
            <DialogHeader className="text-right">
              <DialogTitle>إلغاء طلب الصرف</DialogTitle>
              <DialogDescription>
                هل تريد إلغاء طلب الصرف رقم {selectedRequest?.requestNumber}؟
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>سبب الإلغاء *</Label>
                <Textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="يرجى توضيح سبب إلغاء الطلب..."
                  className="max-md:text-base"
                />
              </div>
            </div>
            <DialogFooter className="flex-col-reverse sm:flex-row gap-2">
              <Button variant="outline" className="w-full sm:w-auto min-h-10 max-lg:min-h-11" onClick={() => setShowRejectDialog(false)}>
                إلغاء
              </Button>
              <Button
                variant="destructive"
                className="w-full sm:w-auto min-h-10 max-lg:min-h-11"
                onClick={() =>
                  rejectRequestMutation.mutate({
                    id: selectedRequest?.id,
                    reason: rejectionReason,
                  })
                }
                disabled={!rejectionReason || rejectRequestMutation.isPending}
              >
                {rejectRequestMutation.isPending ? "جاري الإلغاء..." : "إلغاء طلب الصرف"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* نافذة استثناء اعتماد طلب الصرف */}
        <Dialog open={showExceptionDialog} onOpenChange={setShowExceptionDialog}>
          <DialogContent dir="rtl" className="w-[calc(100vw-1rem)] sm:w-[95vw] sm:max-w-lg max-h-[calc(100dvh-2rem)] overflow-y-auto p-4 sm:p-6">
            <DialogHeader className="text-right">
              <DialogTitle className="flex items-center gap-2 text-amber-700 dark:text-amber-500">
                <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0" />
                <span>استثناء اعتماد طلب الصرف</span>
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="font-bold text-slate-800">سبب / مبرر الاستثناء *</Label>
                <Textarea
                  value={exceptionNotes}
                  onChange={(e) => setExceptionNotes(e.target.value)}
                  placeholder="اكتب سبب أو مبرر استثناء اعتماد مُعد الطلب (إجباري)..."
                  className="min-h-[100px] max-md:text-base"
                />
              </div>
            </div>
            <DialogFooter className="flex-col-reverse sm:flex-row gap-2">
              <Button variant="outline" className="w-full sm:w-auto min-h-10 max-lg:min-h-11" onClick={() => setShowExceptionDialog(false)}>
                إلغاء
              </Button>
              <Button
                className="w-full sm:w-auto min-h-10 max-lg:min-h-11 bg-amber-600 hover:bg-amber-700 text-white font-bold"
                onClick={() => {
                  if (selectedRequest?.id && exceptionNotes.trim()) {
                    exceptionApproveRequestMutation.mutate({
                      id: selectedRequest.id,
                      notes: exceptionNotes.trim(),
                    });
                  }
                }}
                disabled={!exceptionNotes || !exceptionNotes.trim() || exceptionApproveRequestMutation.isPending}
              >
                {exceptionApproveRequestMutation.isPending
                  ? "جاري تنفيذ الاستثناء..."
                  : "تأكيد استثناء الاعتماد"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* نافذة عرض مبررات استثناء الاعتماد */}
        <Dialog open={showViewExceptionDialog} onOpenChange={setShowViewExceptionDialog}>
          <DialogContent dir="rtl" className="w-[calc(100vw-1rem)] sm:w-[95vw] sm:max-w-md max-h-[calc(100dvh-2rem)] overflow-y-auto p-4 sm:p-6">
            <DialogHeader className="text-right">
              <DialogTitle className="flex items-center gap-2 text-amber-800 dark:text-amber-400">
                <Info className="w-5 h-5 text-amber-600 shrink-0" />
                <span>مبررات استثناء اعتماد مُعد الطلب</span>
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div className="rounded-lg bg-amber-50/80 border border-amber-200 p-3.5 space-y-1 text-xs text-amber-900 dark:bg-amber-950/40 dark:border-amber-900 dark:text-amber-200">
                <p className="font-bold text-slate-800 dark:text-slate-100 text-sm">
                  طلب صرف رقم: <span className="font-mono">{selectedRequest?.requestNumber}</span>
                </p>
                {selectedRequest?.creatorSignatureName && (
                  <p className="text-slate-700 dark:text-slate-300">
                    منفذ الاستثناء: <span className="font-semibold">{selectedRequest.creatorSignatureName}</span>
                  </p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label className="font-bold text-slate-800 dark:text-slate-200 text-xs">سبب / مبرر الاستثناء:</Label>
                <div className="p-3 bg-slate-50 dark:bg-slate-900 border rounded-md text-xs text-slate-800 dark:text-slate-200 whitespace-pre-wrap min-h-[70px] font-sans leading-relaxed">
                  {selectedRequest?.approvalNotes ? (
                    selectedRequest.approvalNotes.replace(/^\[مبرر استثناء اعتماد مُعد الطلب\]:\s*/, "")
                  ) : (
                    "لا يوجد مبرر مسجل"
                  )}
                </div>
              </div>
            </div>
            <DialogFooter className="flex-col-reverse sm:flex-row gap-2">
              <Button variant="outline" className="w-full sm:w-auto min-h-10 max-lg:min-h-11" onClick={() => setShowViewExceptionDialog(false)}>
                إغلاق
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* نافذة عرض سبب إلغاء طلب الصرف */}
        <Dialog open={showViewRejectionDialog} onOpenChange={setShowViewRejectionDialog}>
          <DialogContent className="w-[calc(100vw-1rem)] sm:w-[95vw] sm:max-w-[500px] max-h-[calc(100dvh-2rem)] overflow-y-auto p-4 sm:p-6">
            <DialogHeader className="text-right">
              <DialogTitle className="flex items-center gap-2 text-red-600 dark:text-red-400">
                <AlertCircle className="h-5 w-5 shrink-0" />
                <span>سبب إلغاء طلب الصرف</span>
              </DialogTitle>
              <DialogDescription className="text-right">
                تفاصيل سبب إلغاء طلب الصرف رقم {selectedRequest?.requestNumber}
              </DialogDescription>
            </DialogHeader>
            <div className="py-2 sm:py-4">
              <div className="bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/30 rounded-lg p-3.5 sm:p-4 text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed text-right">
                {viewRejectionReasonText || "لا يوجد سبب محدد."}
              </div>
            </div>
            <DialogFooter className="sm:justify-start">
              <Button variant="outline" onClick={() => setShowViewRejectionDialog(false)} className="w-full sm:w-auto min-h-10 max-lg:min-h-11">
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
          <DialogContent className="w-[calc(100vw-1rem)] sm:w-[95vw] sm:max-w-3xl max-h-[calc(100dvh-2rem)] overflow-y-auto p-4 sm:p-6">
            <DialogHeader className="text-right">
              <DialogTitle>إنشاء أمر صرف</DialogTitle>
              <DialogDescription>
                إنشاء أمر صرف لطلب رقم {selectedRequest?.requestNumber}
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-5">
              {/* معلومات الطلب */}
              <Card className="bg-muted/50 py-0 gap-0">
                <CardHeader className="p-4 pb-2.5">
                  <CardTitle className="text-sm">بيانات طلب الصرف</CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-2">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">العنوان:</span>
                      <p className="font-medium break-words">{selectedRequest?.title}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">المبلغ:</span>
                      <p className="font-medium text-primary inline-flex items-center gap-1">
                        {Number(selectedRequest?.amount || 0).toLocaleString()} <SaudiRiyal className="w-3.5 h-3.5" />
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* خاص بالمشاريع */}
              {selectedProjectData && (
                <Card className="bg-blue-50/50 border-blue-200 py-0 gap-0">
                  <CardHeader className="p-4 pb-2.5">
                    <CardTitle className="text-sm text-blue-800">خاص بالمشاريع</CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 pt-2">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">اسم المشروع:</span>
                        <p className="font-medium break-words">{selectedProjectData.projectName}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">الجهة الداعمة:</span>
                        <p className="font-medium">لا يوجد</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">إجمالي قيمة الدعم:</span>
                        <p className="font-medium inline-flex items-center gap-1">0 <SaudiRiyal className="w-3.5 h-3.5" /></p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">إجمالي قيمة العقد:</span>
                        <p className="font-medium inline-flex items-center gap-1">
                          {Number(selectedProjectData.contractAmount || 0).toLocaleString()} <SaudiRiyal className="w-3.5 h-3.5" />
                        </p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">إجمالي ما تم دفعه:</span>
                        <p className="font-medium text-green-600 inline-flex items-center gap-1">
                          {Number(selectedProjectData.totalPaid || 0).toLocaleString()} <SaudiRiyal className="w-3.5 h-3.5" />
                        </p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">المبلغ المتبقي بعد صرف المبلغ أعلاه:</span>
                        <p className="font-medium text-orange-600 inline-flex items-center gap-1">
                          {(Number(selectedProjectData.remainingAmount || 0) - Number(selectedRequest?.amount || 0)).toLocaleString()} <SaudiRiyal className="w-3.5 h-3.5" />
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              <Separator />

              {/* طريقة الدفع */}
              <div className="space-y-3">
                <Label className="text-base font-semibold">طريقة الدفع</Label>
                <Select
                  value={newOrder.paymentMethod}
                  onValueChange={(v: any) => setNewOrder({ ...newOrder, paymentMethod: v })}
                >
                  <SelectTrigger className="h-10 max-lg:min-h-11">
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
                <Card className="bg-green-50/50 border-green-200 py-0 gap-0">
                  <CardHeader className="p-4 pb-2.5">
                    <CardTitle className="text-sm text-green-800 flex items-center gap-2">
                      <CreditCard className="h-4 w-4" />
                      تحويل بنكي من حساب الجمعية إلى
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 pt-2 space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>اسم الحساب *</Label>
                        <Input
                          value={newOrder.beneficiaryAccountName || newOrder.beneficiaryName}
                          onChange={(e) => setNewOrder({ ...newOrder, beneficiaryAccountName: e.target.value })}
                          placeholder="اسم صاحب الحساب"
                          className="max-md:text-base h-10 max-lg:min-h-11"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>اسم البنك</Label>
                        <Input
                          value={newOrder.beneficiaryBank}
                          onChange={(e) => setNewOrder({ ...newOrder, beneficiaryBank: e.target.value })}
                          placeholder="مثال: مصرف الراجحي"
                          className="max-md:text-base h-10 max-lg:min-h-11"
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
                        className="font-mono max-md:text-base h-10 max-lg:min-h-11"
                      />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>رقم سداد</Label>
                        <Input
                          value={newOrder.sadadNumber}
                          onChange={(e) => setNewOrder({ ...newOrder, sadadNumber: e.target.value })}
                          placeholder="رقم سداد (اختياري)"
                          className="max-md:text-base h-10 max-lg:min-h-11"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>رمز المفوتر</Label>
                        <Input
                          value={newOrder.billerCode}
                          onChange={(e) => setNewOrder({ ...newOrder, billerCode: e.target.value })}
                          placeholder="رمز المفوتر (اختياري)"
                          className="max-md:text-base h-10 max-lg:min-h-11"
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* بيانات الشيك */}
              {newOrder.paymentMethod === "check" && (
                <Card className="bg-purple-50/50 border-purple-200 py-0 gap-0">
                  <CardHeader className="p-4 pb-2.5">
                    <CardTitle className="text-sm text-purple-800">بيانات الشيك</CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 pt-2 space-y-4">
                    <div className="space-y-2">
                      <Label>اسم المستفيد *</Label>
                      <Input
                        value={newOrder.beneficiaryName}
                        onChange={(e) => setNewOrder({ ...newOrder, beneficiaryName: e.target.value })}
                        placeholder="اسم المستفيد من الشيك"
                        className="max-md:text-base h-10 max-lg:min-h-11"
                      />
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* صرف من العهدة */}
              {newOrder.paymentMethod === "custody" && (
                <Card className="bg-orange-50/50 border-orange-200 py-0 gap-0">
                  <CardHeader className="p-4 pb-2.5">
                    <CardTitle className="text-sm text-orange-800">صرف من العهدة</CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 pt-2 space-y-4">
                    <div className="space-y-2">
                      <Label>اسم المستلم *</Label>
                      <Input
                        value={newOrder.beneficiaryName}
                        onChange={(e) => setNewOrder({ ...newOrder, beneficiaryName: e.target.value })}
                        placeholder="اسم مستلم المبلغ"
                        className="max-md:text-base h-10 max-lg:min-h-11"
                      />
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
            
            <DialogFooter className="flex-col-reverse sm:flex-row gap-2">
              <Button variant="outline" className="w-full sm:w-auto min-h-10 max-lg:min-h-11" onClick={() => setShowCreateOrderDialog(false)}>
                إلغاء
              </Button>
              <Button className="w-full sm:w-auto min-h-10 max-lg:min-h-11" onClick={handleCreateOrder} disabled={createOrderMutation.isPending}>
                {createOrderMutation.isPending ? "جاري الإنشاء..." : "إنشاء أمر الصرف"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* نافذة معاينة أمر الصرف - حسب القالب */}
        <Dialog open={showOrderPreviewDialog} onOpenChange={setShowOrderPreviewDialog}>
          <DialogContent className="w-[calc(100vw-1rem)] sm:w-[95vw] sm:max-w-4xl max-h-[calc(100dvh-2rem)] overflow-y-auto p-4 sm:p-6 print:max-w-full print:max-h-full print:overflow-visible">
            <DialogHeader className="print:hidden text-right">
              <DialogTitle>معاينة أمر الصرف</DialogTitle>
              <DialogDescription>
                أمر صرف رقم {selectedOrder?.orderNumber}
              </DialogDescription>
            </DialogHeader>
            
            {selectedOrder && (
              <div className="space-y-4 p-3.5 sm:p-6 border rounded-lg bg-white print:border-none print:p-0" id="disbursement-order-print">
                {/* رأس أمر الصرف */}
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3 border-b pb-4">
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">رقم أمر الصرف</p>
                    <p className="font-bold text-base sm:text-lg">{selectedOrder.orderNumber}</p>
                  </div>
                  <div className="text-right sm:text-center flex-1">
                    <h2 className="text-lg sm:text-2xl font-bold text-primary">
                      أمر صرف | {PAYMENT_METHOD_MAP[selectedOrder.paymentMethod || "bank_transfer"]}
                    </h2>
                  </div>
                  <div className="text-right sm:text-left">
                    <p className="text-xs text-muted-foreground">التاريخ</p>
                    <p className="font-medium text-sm">{new Date().toLocaleDateString("ar-SA")}</p>
                  </div>
                </div>

                {/* بيانات الصرف الأساسية */}
                <div className="bg-gray-50 rounded-lg p-3.5 sm:p-4 space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                    <div className="sm:col-span-2">
                      <span className="text-muted-foreground text-xs sm:text-sm">اصرفوا للمكرم/</span>
                      <p className="font-bold text-base sm:text-lg break-words">{selectedOrder.beneficiaryName}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground text-xs sm:text-sm">رقم طلب الصرف/</span>
                      <p className="font-bold font-mono text-sm sm:text-base">{selectedOrder.requestNumber}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <div>
                      <span className="text-muted-foreground text-xs sm:text-sm">مبلغ وقدره/ (رقماً)</span>
                      <p className="font-bold text-lg sm:text-xl text-primary inline-flex items-center gap-1">
                        {Number(selectedOrder.amount).toLocaleString()} <SaudiRiyal className="w-4 h-4" />
                      </p>
                    </div>
                    <div>
                      <span className="text-muted-foreground text-xs sm:text-sm">(كتابة)</span>
                      <p className="font-medium text-sm">
                        {numberToArabicText(Number(selectedOrder.amount))}
                      </p>
                    </div>
                  </div>
                  <div>
                    <span className="text-muted-foreground text-xs sm:text-sm">وذلك مقابل/</span>
                    <p className="font-medium whitespace-pre-wrap break-words text-sm sm:text-base">
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
                  <div className="bg-blue-600 text-white px-4 py-2 font-bold text-sm sm:text-base">
                    خاص بالمشاريع
                  </div>
                  <div className="p-3 sm:p-4 overflow-x-auto">
                    <table className="w-full text-xs sm:text-sm">
                      <tbody>
                        <tr className="border-b">
                          <td className="py-2 pl-2 text-muted-foreground w-2/5 sm:w-1/3">اسم المشروع</td>
                          <td className="py-2 font-medium break-words">{selectedOrder.projectName}</td>
                        </tr>
                        <tr className="border-b">
                          <td className="py-2 pl-2 text-muted-foreground">الجهة الداعمة</td>
                          <td className="py-2 font-medium">لا يوجد</td>
                        </tr>
                        <tr className="border-b">
                          <td className="py-2 pl-2 text-muted-foreground">إجمالي قيمة الدعم</td>
                          <td className="py-2 font-medium"><span className="inline-flex items-center gap-1">0 <SaudiRiyal className="w-3.5 h-3.5" /></span></td>
                        </tr>
                        <tr className="border-b">
                          <td className="py-2 pl-2 text-muted-foreground">إجمالي قيمة العقد</td>
                          <td className="py-2 font-medium">
                            <span className="inline-flex items-center gap-1">{Number(selectedOrder.contractAmount || 0).toLocaleString()} <SaudiRiyal className="w-3.5 h-3.5" /></span>
                          </td>
                        </tr>
                        <tr className="border-b">
                          <td className="py-2 pl-2 text-muted-foreground">إجمالي ما تم دفعه</td>
                          <td className="py-2 font-medium text-green-600">
                            <span className="inline-flex items-center gap-1">{Number(selectedOrder.totalPaid || 0).toLocaleString()} <SaudiRiyal className="w-3.5 h-3.5" /></span>
                          </td>
                        </tr>
                        <tr>
                          <td className="py-2 pl-2 text-muted-foreground">المبلغ المتبقي بعد صرف المبلغ أعلاه</td>
                          <td className="py-2 font-medium text-orange-600">
                            <span className="inline-flex items-center gap-1">{Number(selectedOrder.remainingAmount || 0).toLocaleString()} <SaudiRiyal className="w-3.5 h-3.5" /></span>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* تحويل بنكي */}
                {selectedOrder.paymentMethod === "bank_transfer" && (
                  <div className="border rounded-lg overflow-hidden">
                    <div className="bg-green-600 text-white px-4 py-2 font-bold text-sm sm:text-base">
                      تحويل بنكي من حساب الجمعية إلى
                    </div>
                    <div className="p-3 sm:p-4 overflow-x-auto">
                      <table className="w-full text-xs sm:text-sm">
                        <tbody>
                          <tr className="border-b">
                            <td className="py-2 pl-2 text-muted-foreground w-2/5 sm:w-1/3">اسم الحساب</td>
                            <td className="py-2 font-medium break-words">{selectedOrder.beneficiaryAccountName || selectedOrder.beneficiaryName}</td>
                          </tr>
                          <tr className="border-b">
                            <td className="py-2 pl-2 text-muted-foreground">اسم البنك</td>
                            <td className="py-2 font-medium">{selectedOrder.beneficiaryBank || "-"}</td>
                          </tr>
                          <tr className="border-b">
                            <td className="py-2 pl-2 text-muted-foreground">رقم الآيبان</td>
                            <td className="py-2 font-medium font-mono break-all" dir="ltr">{selectedOrder.beneficiaryIban || "-"}</td>
                          </tr>
                          <tr className="border-b">
                            <td className="py-2 pl-2 text-muted-foreground">رقم سداد</td>
                            <td className="py-2 font-medium">{selectedOrder.sadadNumber || "-"}</td>
                          </tr>
                          <tr>
                            <td className="py-2 pl-2 text-muted-foreground">رمز المفوتر</td>
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
                    <div className="bg-purple-600 text-white px-4 py-2 font-bold text-sm sm:text-base">
                      بيانات الشيك
                    </div>
                    <div className="p-3 sm:p-4">
                      <table className="w-full text-xs sm:text-sm">
                        <tbody>
                          <tr>
                            <td className="py-2 pl-2 text-muted-foreground w-2/5 sm:w-1/3">اسم المستفيد</td>
                            <td className="py-2 font-medium break-words">{selectedOrder.beneficiaryName}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* صرف من العهدة */}
                {selectedOrder.paymentMethod === "custody" && (
                  <div className="border rounded-lg overflow-hidden">
                    <div className="bg-orange-600 text-white px-4 py-2 font-bold text-sm sm:text-base">
                      صرف من العهدة
                    </div>
                    <div className="p-3 sm:p-4">
                      <table className="w-full text-xs sm:text-sm">
                        <tbody>
                          <tr>
                            <td className="py-2 pl-2 text-muted-foreground w-2/5 sm:w-1/3">اسم المستلم</td>
                            <td className="py-2 font-medium break-words">{selectedOrder.beneficiaryName}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* جدول التوقيعات */}
                <div className="border rounded-lg overflow-x-auto mt-6">
                  <table className="w-full min-w-[420px] text-xs sm:text-sm">
                    <thead>
                      <tr className="bg-gray-100">
                        <th className="py-2.5 sm:py-3 px-3 sm:px-4 text-right border-l">الوظيفة</th>
                        <th className="py-2.5 sm:py-3 px-3 sm:px-4 text-right border-l">الاسم</th>
                        <th className="py-2.5 sm:py-3 px-3 sm:px-4 text-right border-l">التوقيع</th>
                        <th className="py-2.5 sm:py-3 px-3 sm:px-4 text-right">التاريخ</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-t">
                        <td className="py-3 sm:py-4 px-3 sm:px-4 border-l">المحاسب</td>
                        <td className="py-3 sm:py-4 px-3 sm:px-4 border-l">{selectedOrder.createdByName || "-"}</td>
                        <td className="py-3 sm:py-4 px-3 sm:px-4 border-l h-14 sm:h-16"></td>
                        <td className="py-3 sm:py-4 px-3 sm:px-4"></td>
                      </tr>
                      <tr className="border-t">
                        <td className="py-3 sm:py-4 px-3 sm:px-4 border-l">المدير التنفيذي</td>
                        <td className="py-3 sm:py-4 px-3 sm:px-4 border-l">{selectedOrder.approvedByName || "-"}</td>
                        <td className="py-3 sm:py-4 px-3 sm:px-4 border-l h-14 sm:h-16"></td>
                        <td className="py-3 sm:py-4 px-3 sm:px-4">
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
                    className="text-sm sm:text-base px-5 sm:px-6 py-1.5 sm:py-2"
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
            
            <DialogFooter className="print:hidden flex-col-reverse sm:flex-row gap-2">
              <Button variant="outline" className="w-full sm:w-auto min-h-10 max-lg:min-h-11" onClick={() => setShowOrderPreviewDialog(false)}>
                إغلاق
              </Button>
              <Button variant="outline" className="w-full sm:w-auto min-h-10 max-lg:min-h-11" onClick={() => window.print()}>
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
