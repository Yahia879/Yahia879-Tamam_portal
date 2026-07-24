import { useState } from "react";
import { useLocation, useSearch } from "wouter";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { usePermission } from "@/hooks/usePermission";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  FileText,
  Search,
  Plus,
  Eye,
  Printer,
  Copy,
  Filter,
  Building2,
  Calendar,
  DollarSign,
  CheckCircle2,
  Clock,
  FileEdit,
  XCircle,
  Loader2,
  LayoutTemplate,
  ChevronLeft,
  ChevronRight,
  Trash2,
  ListOrdered,
  ChevronDown,
  ChevronUp,
  Edit,
} from "lucide-react";

import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

// أنواع العقود لقوالب العقد
const TEMPLATE_CONTRACT_TYPES = {
  supervision: { label: "إشراف هندسي", color: "bg-blue-100 text-blue-800" },
  construction: { label: "مقاولات", color: "bg-orange-100 text-orange-800" },
  supply: { label: "توريد", color: "bg-green-100 text-green-800" },
  maintenance: { label: "صيانة", color: "bg-purple-100 text-purple-800" },
  services: { label: "خدمات", color: "bg-cyan-100 text-cyan-800" },
  equipment: { label: "تجهيزات", color: "bg-pink-100 text-pink-800" },
  consulting: { label: "استشارات", color: "bg-indigo-100 text-indigo-800" },
  other: { label: "أخرى", color: "bg-gray-100 text-gray-800" },
};

// فئات البنود لقوالب العقد
const CLAUSE_CATEGORIES = {
  obligations_first_party: "التزامات الطرف الأول",
  obligations_second_party: "التزامات الطرف الثاني",
  financial: "الأحكام المالية",
  duration: "مدة العقد",
  modifications: "تعديل العقد",
  notifications: "الإشعارات والمراسلات",
  general: "أحكام عامة",
  confidentiality: "سرية المعلومات",
  intellectual_property: "حقوق الملكية الفكرية",
  disputes: "حل المنازعات",
  termination: "فسخ العقد",
  penalties: "الغرامات والجزاءات",
  warranty: "الضمان",
  force_majeure: "القوة القاهرة",
  copies: "نسخ الاتفاقية",
  custom: "بند مخصص",
};

// حالات العقد
const CONTRACT_STATUSES = [
  { value: "all", label: "جميع الحالات" },
  { value: "draft", label: "مسودة" },
  { value: "pending_approval", label: "قيد الاعتماد" },
  { value: "approved", label: "معتمد" },
  { value: "active", label: "ساري" },
  { value: "completed", label: "مكتمل" },
  { value: "cancelled", label: "ملغي" },
];

// أنواع العقود
const CONTRACT_TYPES = [
  { value: "all", label: "جميع الأنواع" },
  { value: "supply", label: "توريد" },
  { value: "construction", label: "مقاولات" },
  { value: "supervision", label: "إشراف هندسي" },
  { value: "maintenance", label: "صيانة" },
  { value: "services", label: "خدمات" },
];

// دالة الحصول على لون الحالة
function getStatusBadge(status: string) {
  switch (status) {
    case "draft":
      return <Badge variant="secondary"><FileEdit className="h-3 w-3 ml-1" />مسودة</Badge>;
    case "pending_approval":
      return <Badge variant="outline" className="border-yellow-500 text-yellow-600"><Clock className="h-3 w-3 ml-1" />قيد الاعتماد</Badge>;
    case "approved":
      return <Badge className="bg-green-500"><CheckCircle2 className="h-3 w-3 ml-1" />معتمد</Badge>;
    case "active":
      return <Badge className="bg-blue-500"><CheckCircle2 className="h-3 w-3 ml-1" />ساري</Badge>;
    case "completed":
      return <Badge variant="outline" className="border-green-500 text-green-600"><CheckCircle2 className="h-3 w-3 ml-1" />مكتمل</Badge>;
    case "cancelled":
      return <Badge variant="destructive"><XCircle className="h-3 w-3 ml-1" />ملغي</Badge>;
    default:
      return <Badge variant="secondary">{status}</Badge>;
  }
}

// دالة الحصول على نوع العقد بالعربي
function getContractTypeLabel(type: string) {
  const types: Record<string, string> = {
    supply: "توريد",
    construction: "مقاولات",
    supervision: "إشراف هندسي",
    maintenance: "صيانة",
    services: "خدمات",
  };
  return types[type] || type;
}

export default function ContractsList() {
  const [, navigate] = useLocation();
  const canCreateContract = usePermission("contracts.create");
  const canViewContract = usePermission("contracts.view");
  const canEditApprovedContract = usePermission("contracts.edit_approved");
  const canTemplateAdd = usePermission("contracts.template_add");
  const canTemplateEdit = usePermission("contracts.template_edit");
  const canTemplateDelete = usePermission("contracts.template_delete");
  const canClauseAdd = usePermission("contracts.clause_add");

  const search = useSearch();
  const searchParams = new URLSearchParams(search || '');
  const tabFromQuery = searchParams.get('tab');

  const [activeTab, setActiveTab] = useState(tabFromQuery === "templates" ? "templates" : "contracts");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;
  const [showProjectSelectionDialog, setShowProjectSelectionDialog] = useState(false);

  // حالات إدارة القوالب والبنود المأخوذة من صفحة إدارة القوالب لتكون مطابقة 100%
  const [showTemplateDialog, setShowTemplateDialog] = useState(false);
  const [showClauseDialog, setShowClauseDialog] = useState(false);
  const [showPreambleDialog, setShowPreambleDialog] = useState(false);
  const [preambleText, setPreambleText] = useState("");
  const [editingTemplate, setEditingTemplate] = useState<any>(null);
  const [editingClause, setEditingClause] = useState<any>(null);
  const [selectedTemplateId, setSelectedTemplateId] = useState<number | null>(null);
  const [expandedTemplates, setExpandedTemplates] = useState<number[]>([]);

  // نموذج القالب
  const [templateForm, setTemplateForm] = useState({
    nameAr: "",
    type: "supply",
  });

  // نموذج البند
  const [clauseForm, setClauseForm] = useState({
    title: "",
    titleAr: "",
    content: "",
    category: "general",
    isRequired: true,
    isEditable: true,
    isGlobal: false,
  });

  const resetTemplateForm = () => {
    setTemplateForm({
      nameAr: "",
      type: "supply",
    });
  };

  const resetClauseForm = () => {
    setClauseForm({
      title: "",
      titleAr: "",
      content: "",
      category: "general",
      isRequired: true,
      isEditable: true,
      isGlobal: false,
    });
  };

  const handleEditTemplate = (template: any) => {
    setEditingTemplate(template);
    setTemplateForm({
      nameAr: template.nameAr || "",
      type: template.type || "supply",
    });
    setShowTemplateDialog(true);
  };

  const handleEditClause = (clause: any) => {
    setEditingClause(clause);
    setClauseForm({
      title: clause.title || "",
      titleAr: clause.titleAr || "",
      content: clause.content || "",
      category: clause.category || "general",
      isRequired: clause.isRequired ?? true,
      isEditable: clause.isEditable ?? true,
      isGlobal: clause.isGlobal ?? false,
    });
    setShowClauseDialog(true);
  };

  // جلب قائمة العقود
  const { data: contractsData, isLoading: contractsLoading, refetch } = trpc.contracts.list.useQuery({
    status: statusFilter !== "all" ? statusFilter as any : undefined,
    contractType: typeFilter !== "all" ? typeFilter as any : undefined,
    page: currentPage,
    limit: pageSize,
  });

  // جلب جميع المشاريع وجميع العقود لفلترة المشاريع التي لا تحتوي على عقد معتمد
  const { data: projectsData, isLoading: projectsLoading } = trpc.projects.getAll.useQuery({});
  const { data: allContractsData, isLoading: allContractsLoading } = trpc.contracts.list.useQuery({
    limit: 1000,
  });

  // جلب قوالب العقود
  const { data: templatesData, isLoading: templatesLoading, refetch: refetchTemplates } = trpc.contracts.getTemplates.useQuery();

  // جلب قالب مع بنوده
  const { data: selectedTemplate, refetch: refetchSelectedTemplate } = trpc.contracts.getTemplate.useQuery(
    { id: selectedTemplateId! },
    { enabled: !!selectedTemplateId }
  );

  // إنشاء قالب
  const createTemplateMutation = trpc.contracts.createTemplate.useMutation({
    onSuccess: (data) => {
      toast.success("تم إنشاء القالب بنجاح");
      setShowTemplateDialog(false);
      resetTemplateForm();
      refetchTemplates();
      if (data?.id) {
        navigate(`/contract-templates/${data.id}/preview`);
      }
    },
    onError: (error) => {
      toast.error(error.message || "حدث خطأ أثناء إنشاء القالب");
    },
  });

  // تحديث قالب
  const updateTemplateMutation = trpc.contracts.updateTemplate.useMutation({
    onSuccess: () => {
      toast.success("تم تحديث القالب بنجاح");
      setShowTemplateDialog(false);
      setEditingTemplate(null);
      resetTemplateForm();
      refetchTemplates();
    },
    onError: (error) => {
      toast.error(error.message || "حدث خطأ أثناء تحديث القالب");
    },
  });

  // حذف قالب
  const deleteTemplateMutation = trpc.contracts.deleteTemplate.useMutation({
    onSuccess: () => {
      toast.success("تم حذف القالب بنجاح");
      refetchTemplates();
    },
    onError: (error) => {
      toast.error(error.message || "حدث خطأ أثناء حذف القالب");
    },
  });

  // إنشاء بند
  const createClauseMutation = trpc.contracts.createClause.useMutation({
    onSuccess: () => {
      toast.success("تم إضافة البند بنجاح");
      setShowClauseDialog(false);
      resetClauseForm();
      if (selectedTemplateId) {
        refetchSelectedTemplate();
      }
    },
    onError: (error) => {
      toast.error(error.message || "حدث خطأ أثناء إضافة البند");
    },
  });

  // تحديث بند
  const updateClauseMutation = trpc.contracts.updateClause.useMutation({
    onSuccess: () => {
      toast.success("تم تحديث البند بنجاح");
      setShowClauseDialog(false);
      setEditingClause(null);
      resetClauseForm();
      if (selectedTemplateId) {
        refetchSelectedTemplate();
      }
    },
    onError: (error) => {
      toast.error(error.message || "حدث خطأ أثناء تحديث البند");
    },
  });

  // حذف بند
  const deleteClauseMutation = trpc.contracts.deleteClause.useMutation({
    onSuccess: () => {
      toast.success("تم حذف البند بنجاح");
      if (selectedTemplateId) {
        refetchSelectedTemplate();
      }
    },
    onError: (error) => {
      toast.error(error.message || "حدث خطأ أثناء حذف البند");
    },
  });

  const handleSubmitTemplate = () => {
    if (!templateForm.nameAr) {
      toast.error("يرجى ملء جميع الحقول المطلوبة");
      return;
    }

    if (editingTemplate) {
      updateTemplateMutation.mutate({
        id: editingTemplate.id,
        ...templateForm,
        name: templateForm.nameAr, // استخدام الاسم العربي للاسم الإنجليزي مؤقتاً
      });
    } else {
      createTemplateMutation.mutate({
        ...templateForm,
        name: templateForm.nameAr,
      });
    }
  };

  const handleSavePreamble = () => {
    if (!selectedTemplateId) return;
    updateTemplateMutation.mutate({
      id: selectedTemplateId,
      introTemplate: preambleText,
    }, {
      onSuccess: () => {
        toast.success("تم حفظ التمهيد بنجاح");
        setShowPreambleDialog(false);
        refetchSelectedTemplate();
      }
    });
  };

  const handleSubmitClause = () => {
    if (!clauseForm.titleAr || !clauseForm.content) {
      toast.error("يرجى إدخال عنوان ونص البند");
      return;
    }

    const submissionData = {
      ...clauseForm,
      title: clauseForm.title || clauseForm.titleAr, // استخدام العنوان العربي للإنجليزي إذا كان فارغاً
    };

    if (editingClause) {
      updateClauseMutation.mutate({
        id: editingClause.id,
        ...submissionData,
      });
    } else {
      createClauseMutation.mutate({
        templateId: selectedTemplateId!,
        ...submissionData,
        orderIndex: selectedTemplate?.clauses?.length || 0,
      });
    }
  };

  const toggleTemplateExpand = (templateId: number) => {
    setExpandedTemplates((prev) =>
      prev.includes(templateId) ? [] : [templateId]
    );
    setSelectedTemplateId(templateId);
  };

  // Mutation لتكرار العقد
  const duplicateMutation = trpc.contracts.duplicate.useMutation({
    onSuccess: (data) => {
      toast.success("تم تكرار العقد بنجاح");
      navigate(`/contracts/${data.id}/preview`);
    },
    onError: (error: any) => {
      toast.error(error.message || "حدث خطأ أثناء تكرار العقد");
    },
  });

  const contracts = contractsData?.contracts || [];
  const totalContracts = contractsData?.total || 0;
  const totalPages = Math.ceil(totalContracts / pageSize);
  const templates = templatesData || [];

  // تصفية المشاريع التي لم يتم إنشاء عقد معتمد أو مسودة أو قيد الاعتماد لها
  const excludedProjectIds = new Set(
    (allContractsData?.contracts || [])
      .filter((c: any) => c.status === 'draft' || c.status === 'pending_approval' || c.status === 'approved' || c.status === 'active' || c.status === 'completed')
      .map((c: any) => c.projectId)
      .filter(Boolean)
  );

  // تصفية المشاريع لتكون في مرحلة التعاقد حصراً وبدون عقد مستبعد
  const eligibleProjects = (projectsData || []).filter(
    (p: any) => p.requestStage === 'contracting' && !excludedProjectIds.has(p.id)
  );

  // فلترة العقود حسب البحث
  const filteredContracts = contracts.filter((contract: any) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      contract.contractNumber?.toLowerCase().includes(query) ||
      contract.contractTitle?.toLowerCase().includes(query) ||
      contract.secondPartyName?.toLowerCase().includes(query)
    );
  });

  const handleDuplicateContract = (contractId: number) => {
    if (confirm("هل تريد تكرار هذا العقد؟")) {
      duplicateMutation.mutate({ id: contractId });
    }
  };

  const formatCurrency = (amount: number | string | null) => {
    if (!amount) return "0";
    const num = typeof amount === "string" ? parseFloat(amount) : amount;
    return new Intl.NumberFormat("ar-SA").format(num);
  };

  const formatDate = (date: string | Date | null) => {
    if (!date) return "-";
    return new Date(date).toLocaleDateString("ar-SA");
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* العنوان */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">إدارة العقود</h1>
            <p className="text-muted-foreground">
              إدارة العقود المبرمة وقوالب العقود
            </p>
          </div>
          {canCreateContract && (
            <Button onClick={() => setShowProjectSelectionDialog(true)} className="w-full sm:w-auto">
              <Plus className="h-4 w-4 ml-2" />
              إنشاء عقد جديد
            </Button>
          )}
        </div>

        {/* التبويبات */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="overflow-x-auto pb-2 -mb-2 flex justify-start" dir="rtl">
            <TabsList className="flex w-max sm:w-full max-w-md sm:grid sm:grid-cols-2">
              <TabsTrigger value="contracts" className="flex items-center gap-2 whitespace-nowrap">
                <FileText className="h-4 w-4" />
                العقود المبرمة
              </TabsTrigger>
              <TabsTrigger value="templates" className="flex items-center gap-2 whitespace-nowrap">
                <LayoutTemplate className="h-4 w-4" />
                قوالب العقود
              </TabsTrigger>
            </TabsList>
          </div>

          {/* تبويب العقود المبرمة */}
          <TabsContent value="contracts" className="space-y-4 pt-4">
            {/* أدوات البحث */}
            <Card>
              <CardContent className="pt-4">
                <div className="relative">
                  <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="بحث برقم العقد أو العنوان أو اسم المورد..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pr-10 text-right"
                    dir="rtl"
                  />
                </div>
              </CardContent>
            </Card>

            {/* قائمة العقود */}
            {contractsLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : filteredContracts.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center px-4">
                  <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <h3 className="text-lg font-medium mb-2">لا توجد عقود</h3>
                  <p className="text-muted-foreground mb-4">
                    لم يتم العثور على عقود مطابقة لمعايير البحث
                  </p>
                  <Button onClick={() => setShowProjectSelectionDialog(true)} className="w-full sm:w-auto">
                    <Plus className="h-4 w-4 ml-2" />
                    إنشاء عقد جديد
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4" dir="rtl">
                {filteredContracts.map((contract: any) => (
                  <Card key={contract.id} className="hover:shadow-md transition-shadow overflow-hidden">
                    <CardContent className="p-4 text-right">
                      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                        <div className="flex items-start gap-3 sm:gap-4 flex-1">
                          <div className="p-2 sm:p-3 rounded-lg bg-primary/10 shrink-0">
                            <FileText className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <h3 className="font-semibold truncate text-sm sm:text-base">
                                {contract.contractTitle}
                              </h3>
                              <div>
                                {getStatusBadge(contract.status)}
                              </div>
                            </div>
                            <p className="text-xs sm:text-sm text-muted-foreground mb-2">
                              رقم العقد: {contract.contractNumber}
                            </p>
                            <div className="flex flex-wrap gap-x-4 gap-y-2 text-[10px] sm:text-xs text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Building2 className="h-3.5 w-3.5" />
                                <span className="truncate max-w-[150px]">{contract.secondPartyName || "غير محدد"}</span>
                              </span>
                              <span className="flex items-center gap-1">
                                <DollarSign className="h-3.5 w-3.5" />
                                {formatCurrency(contract.contractAmount)} ريال
                              </span>
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3.5 w-3.5" />
                                {formatDate(contract.contractDate)}
                              </span>
                              <Badge variant="outline" className="text-[9px] py-0 px-1.5 h-5">
                                {getContractTypeLabel(contract.contractType)}
                              </Badge>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 pt-2 md:pt-0 border-t md:border-t-0 justify-end">
                          {contract.status !== "draft" && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="flex-1 sm:flex-none text-xs sm:text-sm"
                              onClick={() => navigate(`/contracts/${contract.id}/preview`)}
                            >
                              <Eye className="h-3.5 w-3.5 ml-1" />
                              عرض
                            </Button>
                          )}
                          {(contract.status === "draft" || (contract.status === "approved" && canEditApprovedContract)) && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="flex-1 sm:flex-none text-xs sm:text-sm border-amber-600 text-amber-600 hover:bg-amber-50 font-bold"
                              onClick={() => navigate(`/contracts/${contract.id}/edit`)}
                            >
                              <Edit className="h-3.5 w-3.5 ml-1" />
                              {contract.status === "approved" ? "تعديل العقد المعتمد" : "إكمال العقد"}
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}

                {/* التصفح */}
                {totalPages > 1 && (
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      عرض {((currentPage - 1) * pageSize) + 1} - {Math.min(currentPage * pageSize, totalContracts)} من {totalContracts} عقد
                    </p>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                      <span className="text-xs sm:text-sm">
                        صفحة {currentPage} من {totalPages}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </TabsContent>

          {/* تبويب قوالب العقود */}
          <TabsContent value="templates" className="space-y-4 pt-4" dir="rtl">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
              <div>
                <p className="text-muted-foreground text-sm">
                  إدارة قوالب العقود وتخصيص البنود الخاصة بها
                </p>
              </div>
              {canTemplateAdd && (
                <Button
                  onClick={() => {
                    setEditingTemplate(null);
                    resetTemplateForm();
                    setShowTemplateDialog(true);
                  }}
                  className="gap-2 w-full sm:w-auto"
                >
                  <Plus className="h-4 w-4 ml-2" />
                  إضافة قالب جديد
                </Button>
              )}
            </div>

            {templatesLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : templates.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <FileText className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    لا توجد قوالب
                  </h3>
                  <p className="text-gray-500 mb-4">
                    ابدأ بإنشاء قالب عقد جديد
                  </p>
                  {canTemplateAdd && (
                    <Button
                      onClick={() => {
                        setEditingTemplate(null);
                        resetTemplateForm();
                        setShowTemplateDialog(true);
                      }}
                    >
                      <Plus className="h-4 w-4 ml-2" />
                      إضافة قالب
                    </Button>
                  )}
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {templates.map((template: any) => (
                  <Card key={template.id} className="overflow-hidden">
                    <CardHeader
                      className="cursor-pointer hover:bg-gray-50/50 transition-colors"
                      onClick={() => toggleTemplateExpand(template.id)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="p-2 bg-primary/10 rounded-lg">
                            <FileText className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <CardTitle className="text-lg flex items-center gap-2 text-right">
                              {template.nameAr || template.name}
                              {template.isDefault && (
                                <Badge variant="secondary">افتراضي</Badge>
                              )}
                              {template.isSystem && (
                                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">نظامي</Badge>
                              )}
                              {!template.isActive && (
                                <Badge variant="outline" className="text-gray-500">
                                  غير نشط
                                </Badge>
                              )}
                            </CardTitle>
                            <CardDescription className="flex items-center gap-2 mt-1 text-right">
                              <Badge
                                className={
                                  TEMPLATE_CONTRACT_TYPES[template.type as keyof typeof TEMPLATE_CONTRACT_TYPES]?.color ||
                                  "bg-gray-100 text-gray-800"
                                }
                              >
                                {TEMPLATE_CONTRACT_TYPES[template.type as keyof typeof TEMPLATE_CONTRACT_TYPES]?.label ||
                                  template.type}
                              </Badge>
                              <span className="text-gray-400">•</span>
                              <span>{template.description || "بدون وصف"}</span>
                            </CardDescription>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/contract-templates/${template.id}/preview`);
                            }}
                            title="معاينة"
                          >
                            <Eye className="h-4 w-4 text-primary" />
                          </Button>
                          {canTemplateEdit && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEditTemplate(template);
                              }}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          )}
                          {canTemplateDelete && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (confirm("هل أنت متأكد من حذف هذا القالب؟")) {
                                  deleteTemplateMutation.mutate({ id: template.id });
                                }
                              }}
                            >
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          )}
                          {expandedTemplates.includes(template.id) ? (
                            <ChevronUp className="h-5 w-5 text-gray-400" />
                          ) : (
                            <ChevronDown className="h-5 w-5 text-gray-400" />
                          )}
                        </div>
                      </div>
                    </CardHeader>

                    {expandedTemplates.includes(template.id) && (
                      <CardContent className="border-t bg-gray-50/30">
                        <div className="py-4">
                          <div className="flex items-center justify-between mb-4">
                            <h4 className="font-medium flex items-center gap-2 text-right">
                              <ListOrdered className="h-4 w-4" />
                              بنود العقد ({selectedTemplate?.clauses?.length || 0})
                            </h4>
                            {canClauseAdd && (
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    setPreambleText(selectedTemplate?.introTemplate || "");
                                    setShowPreambleDialog(true);
                                  }}
                                >
                                  <FileText className="h-4 w-4 ml-1" />
                                  {selectedTemplate?.introTemplate ? "تعديل التمهيد" : "إضافة تمهيد"}
                                </Button>
                                <Button
                                  size="sm"
                                  onClick={() => {
                                    setEditingClause(null);
                                    resetClauseForm();
                                    setShowClauseDialog(true);
                                  }}
                                >
                                  <Plus className="h-4 w-4 ml-1" />
                                  إضافة بند
                                </Button>
                              </div>
                            )}
                          </div>

                          {selectedTemplate?.introTemplate && (
                            <div className="bg-amber-50/50 border border-amber-200/60 rounded-lg p-4 mb-4 text-right w-full min-w-0 break-words">
                              <h5 className="font-bold text-amber-900 text-sm mb-1 flex items-center gap-1.5 justify-start">
                                <FileText className="h-4 w-4 text-amber-700" />
                                تمهيد العقد:
                              </h5>
                              <p className="text-xs sm:text-sm text-gray-700 whitespace-pre-wrap leading-relaxed break-words [word-break:break-word] w-full min-w-0">
                                {selectedTemplate.introTemplate}
                              </p>
                            </div>
                          )}

                          {selectedTemplate?.clauses?.length === 0 ? (
                            <div className="text-center py-8 text-gray-500">
                              لا توجد بنود في هذا القالب
                            </div>
                          ) : (
                            <div className="overflow-x-auto">
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead className="w-12 text-right">#</TableHead>
                                    <TableHead className="text-right">العنوان</TableHead>
                                    <TableHead className="text-right">الفئة</TableHead>
                                    <TableHead className="text-right">إلزامي</TableHead>
                                    <TableHead className="text-right">قابل للتعديل</TableHead>
                                    <TableHead className="w-24 text-right">الإجراءات</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {selectedTemplate?.clauses?.map((clause: any, index: number) => (
                                    <TableRow key={clause.id}>
                                      <TableCell className="font-medium text-right">
                                        {index + 1}
                                      </TableCell>
                                      <TableCell className="text-right">
                                        <div>
                                          <div className="font-medium">{clause.titleAr}</div>
                                          <div className="text-sm text-gray-500 line-clamp-1">
                                            {clause.content?.substring(0, 100)}...
                                          </div>
                                        </div>
                                      </TableCell>
                                      <TableCell className="text-right">
                                        <Badge variant="outline">
                                          {CLAUSE_CATEGORIES[clause.category as keyof typeof CLAUSE_CATEGORIES] ||
                                            clause.category}
                                        </Badge>
                                      </TableCell>
                                      <TableCell className="text-right">
                                        {clause.isRequired ? (
                                          <Badge className="bg-green-100 text-green-800">نعم</Badge>
                                        ) : (
                                          <Badge variant="outline">لا</Badge>
                                        )}
                                      </TableCell>
                                      <TableCell className="text-right">
                                        {clause.isEditable ? (
                                          <Badge className="bg-blue-100 text-blue-800">نعم</Badge>
                                        ) : (
                                          <Badge variant="outline">لا</Badge>
                                        )}
                                      </TableCell>
                                      <TableCell className="text-right">
                                        <div className="flex items-center gap-1 justify-start">
                                          {canTemplateEdit && (
                                            <Button
                                              variant="ghost"
                                              size="icon"
                                              onClick={() => handleEditClause(clause)}
                                            >
                                              <Edit className="h-4 w-4" />
                                            </Button>
                                          )}
                                          {canTemplateDelete && (
                                            <Button
                                              variant="ghost"
                                              size="icon"
                                              onClick={() => {
                                                if (confirm("هل أنت متأكد من حذف هذا البند؟")) {
                                                  deleteClauseMutation.mutate({ id: clause.id });
                                                }
                                              }}
                                            >
                                              <Trash2 className="h-4 w-4 text-red-500" />
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
                        </div>
                      </CardContent>
                    )}
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* نافذة إضافة/تعديل القالب */}
      <Dialog open={showTemplateDialog} onOpenChange={setShowTemplateDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle dir="rtl" className="text-right font-bold">
              {editingTemplate ? "تعديل قالب العقد" : "إضافة قالب عقد جديد"}
            </DialogTitle>
            <DialogDescription dir="rtl" className="text-right">
              {editingTemplate
                ? "قم بتعديل بيانات قالب العقد"
                : "أدخل بيانات قالب العقد الجديد"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4" dir="rtl">
            <div className="space-y-2 text-right">
              <Label htmlFor="nameAr">اسم القالب (عربي) *</Label>
              <Input
                id="nameAr"
                value={templateForm.nameAr}
                onChange={(e) =>
                  setTemplateForm({ ...templateForm, nameAr: e.target.value })
                }
                placeholder="عقد توريد"
              />
            </div>

            <div className="space-y-2 text-right">
              <Label htmlFor="type">نوع العقد *</Label>
              <Select
                value={templateForm.type}
                onValueChange={(value) =>
                  setTemplateForm({ ...templateForm, type: value })
                }
              >
                <SelectTrigger className="w-full text-right" dir="rtl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent dir="rtl">
                  {Object.entries(TEMPLATE_CONTRACT_TYPES).map(([key, { label }]) => (
                    <SelectItem key={key} value={key}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter className="flex gap-2 justify-end" dir="rtl">
            {editingTemplate && (
              <Button
                variant="outline"
                type="button"
                className="gap-1 border-primary text-primary hover:bg-primary/5"
                onClick={() => {
                  setShowTemplateDialog(false);
                  navigate(`/contract-templates/${editingTemplate.id}/preview`);
                }}
              >
                <Eye className="h-4 w-4 ml-1" />
                معاينة القالب
              </Button>
            )}
            <Button
              variant="outline"
              onClick={() => {
                setShowTemplateDialog(false);
                setEditingTemplate(null);
                resetTemplateForm();
              }}
            >
              إلغاء
            </Button>
            <Button
              onClick={handleSubmitTemplate}
              disabled={createTemplateMutation.isPending || updateTemplateMutation.isPending}
            >
              {editingTemplate ? "حفظ التعديلات" : "إنشاء القالب"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* نافذة إضافة/تعديل البند */}
      <Dialog open={showClauseDialog} onOpenChange={setShowClauseDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle dir="rtl" className="text-right font-bold">
              {editingClause ? "تعديل بند العقد" : "إضافة بند جديد"}
            </DialogTitle>
            <DialogDescription dir="rtl" className="text-right">
              {editingClause
                ? "قم بتعديل بيانات البند"
                : "أدخل بيانات البند الجديد"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4" dir="rtl">
            <div className="space-y-2 text-right">
              <Label htmlFor="titleAr">عنوان البند *</Label>
              <Input
                id="titleAr"
                value={clauseForm.titleAr}
                onChange={(e) =>
                  setClauseForm({ ...clauseForm, titleAr: e.target.value })
                }
                placeholder="المادة الأولى: التعريفات"
              />
            </div>

            <div className="space-y-2 text-right">
              <Label htmlFor="clauseCategory">فئة البند</Label>
              <Select
                value={clauseForm.category}
                onValueChange={(value) =>
                  setClauseForm({ ...clauseForm, category: value })
                }
              >
                <SelectTrigger className="w-full text-right" dir="rtl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent dir="rtl">
                  {Object.entries(CLAUSE_CATEGORIES).map(([key, label]) => (
                    <SelectItem key={key} value={key}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2 text-right">
              <Label htmlFor="clauseContent">نص البند *</Label>
              <Textarea
                id="clauseContent"
                value={clauseForm.content}
                onChange={(e) =>
                  setClauseForm({ ...clauseForm, content: e.target.value })
                }
                placeholder="أدخل نص البند هنا..."
                rows={8}
              />
            </div>
          </div>

          <DialogFooter className="flex gap-2 justify-end" dir="rtl">
            <Button
              variant="outline"
              onClick={() => {
                setShowClauseDialog(false);
                setEditingClause(null);
                resetClauseForm();
              }}
            >
              إلغاء
            </Button>
            <Button
              onClick={handleSubmitClause}
              disabled={createClauseMutation.isPending || updateClauseMutation.isPending}
            >
              {editingClause ? "حفظ التعديلات" : "إضافة البند"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* نافذة إضافة/تعديل التمهيد */}
      <Dialog open={showPreambleDialog} onOpenChange={setShowPreambleDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle dir="rtl" className="text-right font-bold">
              {selectedTemplate?.introTemplate ? "تعديل تمهيد العقد" : "إضافة تمهيد للعقد"}
            </DialogTitle>
            <DialogDescription dir="rtl" className="text-right">
              التمهيد هو نص عام يظهر بعد معلومات الطرف الثاني وقبل البنود.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4" dir="rtl">
            <div className="space-y-2 text-right">
              <Label htmlFor="preambleContent">نص التمهيد *</Label>
              <Textarea
                id="preambleContent"
                value={preambleText}
                onChange={(e) => setPreambleText(e.target.value)}
                placeholder="حيث إن الطرف الأول جمعية مرخصة..."
                rows={8}
                className="min-h-[150px]"
              />
            </div>
          </div>

          <DialogFooter className="flex gap-2 justify-end" dir="rtl">
            <Button
              variant="outline"
              onClick={() => {
                setShowPreambleDialog(false);
                setPreambleText("");
              }}
            >
              إلغاء
            </Button>
            <Button
              onClick={handleSavePreamble}
              disabled={updateTemplateMutation.isPending}
            >
              حفظ
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>


      {/* نافذة اختيار المشروع لإنشاء عقد */}
      <Dialog open={showProjectSelectionDialog} onOpenChange={setShowProjectSelectionDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle dir="rtl" className="text-right font-bold text-xl text-primary">
              تحديد مشروع لإنشاء عقد جديد
            </DialogTitle>
            <DialogDescription dir="rtl" className="text-right text-muted-foreground mt-2">
              يرجى تحديد المشروع الذي ترغب في إنشاء العقد واعتماده له. تظهر هنا فقط المشاريع التي لا تحتوي على عقود معتمدة بالفعل.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4" dir="rtl">
            {projectsLoading || allContractsLoading ? (
              <div className="flex flex-col items-center justify-center py-12 gap-3">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <span className="text-muted-foreground text-sm">جاري تحميل المشاريع المتاحة...</span>
              </div>
            ) : eligibleProjects.length === 0 ? (
              <div className="text-center py-12 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                <Building2 className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">لا توجد مشاريع متاحة</h3>
                <p className="text-gray-500 text-sm max-w-md mx-auto">
                  كافة المشاريع الحالية تحتوي على عقود معتمدة بالفعل أو لا توجد مشاريع في النظام.
                </p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-1">
                {eligibleProjects.map((project: any) => (
                  <div
                    key={project.id}
                    onClick={() => {
                      setShowProjectSelectionDialog(false);
                      navigate(`/contracts/new?projectId=${project.id}`);
                    }}
                    className="flex items-center justify-between p-4 bg-white hover:bg-primary/5 border border-gray-100 hover:border-primary/20 rounded-xl cursor-pointer transition-all shadow-sm group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-primary/10 text-primary rounded-lg group-hover:bg-primary group-hover:text-white transition-colors">
                        <Building2 className="h-5 w-5" />
                      </div>
                      <div className="text-right">
                        <h4 className="font-semibold text-gray-900 group-hover:text-primary transition-colors">
                          {project.name}
                        </h4>
                        <span className="text-xs text-muted-foreground">
                          رقم المشروع: {project.projectNumber}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="bg-gray-50 capitalize">
                        {project.status === "planning" ? "تخطيط" : 
                         project.status === "in_progress" ? "قيد التنفيذ" : 
                         project.status === "on_hold" ? "موقوف مؤقتاً" : 
                         project.status === "completed" ? "مكتمل" : 
                         project.status === "cancelled" ? "ملغي" : project.status}
                      </Badge>
                      <ChevronLeft className="h-5 w-5 text-gray-400 group-hover:translate-x-[-4px] transition-transform" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <DialogFooter className="flex justify-end" dir="rtl">
            <Button
              variant="outline"
              onClick={() => setShowProjectSelectionDialog(false)}
            >
              إلغاء
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
