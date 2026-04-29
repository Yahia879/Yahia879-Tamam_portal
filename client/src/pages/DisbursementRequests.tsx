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
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [projectFilter, setProjectFilter] = useState<string>("all");
  const [paymentTypeFilter, setPaymentTypeFilter] = useState<string>("all");
  
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
  });
  
  const { data: ordersData, refetch: refetchOrders } = trpc.disbursements.listOrders.useQuery({});
  
  const { data: statsData } = trpc.disbursements.getStats.useQuery();
  
  // استخدام endpoint جديد للمشاريع مع بيانات العقد
  const { data: projectsWithContractsData } = trpc.disbursements.getProjectsWithContractDetails.useQuery();

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
      toast.success("تم إنشاء أمر الصرف بنجاح");
      setShowCreateOrderDialog(false);
      resetNewOrder();
      refetchOrders();
      refetchRequests();
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

  const filteredRequests = requestsData?.requests?.filter((req) => {
    // تصفية البحث
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      const matchesSearch = (
        req.requestNumber?.toLowerCase().includes(search) ||
        req.title?.toLowerCase().includes(search) ||
        req.projectName?.toLowerCase().includes(search)
      );
      if (!matchesSearch) return false;
    }
    
    // تصفية نوع الدفعة
    if (paymentTypeFilter !== "all") {
      if ((req as any).paymentType !== paymentTypeFilter) return false;
    }
    
    return true;
  });

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
          {canCreateRequest && (
            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus className="ml-2 h-4 w-4" />
              طلب صرف جديد
            </Button>
          )}
        </div>

        {/* بطاقات الإحصائيات */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">طلبات قيد المراجعة</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{statsData?.pendingRequests || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">طلبات معتمدة</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{statsData?.approvedRequests || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">أوامر قيد الاعتماد</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{statsData?.pendingOrders || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">إجمالي المصروف</CardTitle>
              <Banknote className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {Number(statsData?.totalPaid || 0).toLocaleString()} ريال
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
          <TabsContent value="requests" className="space-y-4">
            {/* الفلاتر */}
            <div className="flex flex-col gap-4 md:flex-row md:items-center">
              <div className="relative flex-1">
                <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="بحث برقم الطلب أو العنوان أو المشروع..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pr-10"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[180px]">
                  <Filter className="ml-2 h-4 w-4" />
                  <SelectValue placeholder="الحالة" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">جميع الحالات</SelectItem>
                  <SelectItem value="pending">قيد المراجعة</SelectItem>
                  <SelectItem value="approved">معتمد</SelectItem>
                  <SelectItem value="rejected">مرفوض</SelectItem>
                  <SelectItem value="paid">مصروف</SelectItem>
                </SelectContent>
              </Select>
              <Select value={paymentTypeFilter} onValueChange={setPaymentTypeFilter}>
                <SelectTrigger className="w-[180px]">
                  <CreditCard className="ml-2 h-4 w-4" />
                  <SelectValue placeholder="نوع الدفعة" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">جميع الأنواع</SelectItem>
                  <SelectItem value="advance">دفعة مقدمة</SelectItem>
                  <SelectItem value="progress">دفعة مرحلية</SelectItem>
                  <SelectItem value="final">دفعة نهائية</SelectItem>
                  <SelectItem value="retention">ضمان حسن التنفيذ</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* جدول طلبات الصرف */}
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>رقم الطلب</TableHead>
                      <TableHead>العنوان</TableHead>
                      <TableHead>المشروع</TableHead>
                      <TableHead>المبلغ</TableHead>
                      <TableHead>نوع الدفعة</TableHead>
                      <TableHead>الحالة</TableHead>
                      <TableHead>التاريخ</TableHead>
                      <TableHead>الإجراءات</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRequests?.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                          لا توجد طلبات صرف
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredRequests?.map((request) => (
                        <TableRow key={request.id}>
                          <TableCell className="font-mono">{request.requestNumber}</TableCell>
                          <TableCell>{request.title}</TableCell>
                          <TableCell>{request.projectName}</TableCell>
                          <TableCell>{Number(request.amount).toLocaleString()} ريال</TableCell>
                          <TableCell>{PAYMENT_TYPE_MAP[(request as any).paymentType || "progress"]}</TableCell>
                          <TableCell>
                            <DisbursementStatusBadge 
                              status={request.status as any} 
                              type="request" 
                            />
                          </TableCell>
                          <TableCell>
                            {request.requestedAt
                              ? new Date(request.requestedAt).toLocaleDateString("ar-SA")
                              : "-"}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setSelectedRequest(request);
                                  setShowDetailsDialog(true);
                                }}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              {canApproveRequest && request.status === "pending" && (
                                <>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-green-600"
                                    onClick={() => {
                                      setSelectedRequest(request);
                                      setShowApproveDialog(true);
                                    }}
                                  >
                                    <CheckCircle className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-red-600"
                                    onClick={() => {
                                      setSelectedRequest(request);
                                      setShowRejectDialog(true);
                                    }}
                                  >
                                    <XCircle className="h-4 w-4" />
                                  </Button>
                                </>
                              )}
                              {canCreateOrder && request.status === "approved" && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-blue-600"
                                  onClick={() => openCreateOrderDialog(request)}
                                  title="إنشاء أمر صرف"
                                >
                                  <FileText className="h-4 w-4" />
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => navigate(`/disbursements/requests/${request.id}/print`)}
                                title="طباعة طلب الصرف"
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
              </CardContent>
            </Card>
          </TabsContent>

          {/* أوامر الصرف */}
          <TabsContent value="orders" className="space-y-4">
            <Card>
              <CardContent className="p-0">
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
                          <TableCell className="font-mono">{order.orderNumber}</TableCell>
                          <TableCell>{order.requestNumber}</TableCell>
                          <TableCell>{order.projectName}</TableCell>
                          <TableCell>{order.beneficiaryName}</TableCell>
                          <TableCell>{Number(order.amount).toLocaleString()} ريال</TableCell>
                          <TableCell>
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
