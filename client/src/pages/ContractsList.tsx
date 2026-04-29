import { useState } from "react";
import { useLocation } from "wouter";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
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
} from "lucide-react";

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
  const [activeTab, setActiveTab] = useState("contracts");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // جلب قائمة العقود
  const { data: contractsData, isLoading: contractsLoading, refetch } = trpc.contracts.list.useQuery({
    status: statusFilter !== "all" ? statusFilter as any : undefined,
    contractType: typeFilter !== "all" ? typeFilter as any : undefined,
    page: currentPage,
    limit: pageSize,
  });

  // جلب قوالب العقود
  const { data: templatesData, isLoading: templatesLoading } = trpc.contracts.getTemplates.useQuery();

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
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">إدارة العقود</h1>
            <p className="text-muted-foreground">
              إدارة العقود المبرمة وقوالب العقود
            </p>
          </div>
          <Button onClick={() => navigate("/contracts/new")}>
            <Plus className="h-4 w-4 ml-2" />
            إنشاء عقد جديد
          </Button>
        </div>

        {/* التبويبات */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="contracts" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              العقود المبرمة
            </TabsTrigger>
            <TabsTrigger value="templates" className="flex items-center gap-2">
              <LayoutTemplate className="h-4 w-4" />
              قوالب العقود
            </TabsTrigger>
          </TabsList>

          {/* تبويب العقود المبرمة */}
          <TabsContent value="contracts" className="space-y-4">
            {/* أدوات الفلترة والبحث */}
            <Card>
              <CardContent className="pt-4">
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="flex-1 relative">
                    <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="بحث برقم العقد أو العنوان أو اسم المورد..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pr-10"
                    />
                  </div>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-full md:w-48">
                      <SelectValue placeholder="حالة العقد" />
                    </SelectTrigger>
                    <SelectContent>
                      {CONTRACT_STATUSES.map((status) => (
                        <SelectItem key={status.value} value={status.value}>
                          {status.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={typeFilter} onValueChange={setTypeFilter}>
                    <SelectTrigger className="w-full md:w-48">
                      <SelectValue placeholder="نوع العقد" />
                    </SelectTrigger>
                    <SelectContent>
                      {CONTRACT_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
                <CardContent className="py-12 text-center">
                  <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <h3 className="text-lg font-medium mb-2">لا توجد عقود</h3>
                  <p className="text-muted-foreground mb-4">
                    لم يتم العثور على عقود مطابقة لمعايير البحث
                  </p>
                  <Button onClick={() => navigate("/contracts/new")}>
                    <Plus className="h-4 w-4 ml-2" />
                    إنشاء عقد جديد
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {filteredContracts.map((contract: any) => (
                  <Card key={contract.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-4 flex-1">
                          <div className="p-3 rounded-lg bg-primary/10">
                            <FileText className="h-6 w-6 text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-semibold truncate">
                                {contract.contractTitle}
                              </h3>
                              {getStatusBadge(contract.status)}
                            </div>
                            <p className="text-sm text-muted-foreground mb-2">
                              رقم العقد: {contract.contractNumber}
                            </p>
                            <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Building2 className="h-4 w-4" />
                                {contract.secondPartyName || "غير محدد"}
                              </span>
                              <span className="flex items-center gap-1">
                                <DollarSign className="h-4 w-4" />
                                {formatCurrency(contract.contractAmount)} ريال
                              </span>
                              <span className="flex items-center gap-1">
                                <Calendar className="h-4 w-4" />
                                {formatDate(contract.contractDate)}
                              </span>
                              <Badge variant="outline">
                                {getContractTypeLabel(contract.contractType)}
                              </Badge>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => navigate(`/contracts/${contract.id}/preview`)}
                          >
                            <Eye className="h-4 w-4 ml-1" />
                            عرض
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              navigate(`/contracts/${contract.id}/preview`);
                              setTimeout(() => window.print(), 500);
                            }}
                          >
                            <Printer className="h-4 w-4 ml-1" />
                            طباعة
                          </Button>

                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}

                {/* التصفح */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">
                      عرض {((currentPage - 1) * pageSize) + 1} - {Math.min(currentPage * pageSize, totalContracts)} من {totalContracts} عقد
                    </p>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                      <span className="text-sm">
                        صفحة {currentPage} من {totalPages}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
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
          <TabsContent value="templates" className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-muted-foreground">
                قوالب العقود الجاهزة للاستخدام
              </p>
              <Button onClick={() => navigate("/contract-templates")}>
                <Plus className="h-4 w-4 ml-2" />
                إدارة القوالب
              </Button>
            </div>

            {templatesLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : templates.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <LayoutTemplate className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <h3 className="text-lg font-medium mb-2">لا توجد قوالب</h3>
                  <p className="text-muted-foreground mb-4">
                    لم يتم إنشاء أي قوالب عقود بعد
                  </p>
                  <Button onClick={() => navigate("/contract-templates")}>
                    <Plus className="h-4 w-4 ml-2" />
                    إنشاء قالب جديد
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {templates.map((template: any) => (
                  <Card key={template.id} className="hover:shadow-md transition-shadow">
                    <CardHeader className="pb-2">
                      <div className="flex items-start gap-3">
                        <div className="p-2 rounded-lg bg-primary/10">
                          <LayoutTemplate className="h-5 w-5 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <CardTitle className="text-base truncate">
                            {template.name}
                          </CardTitle>
                          <CardDescription className="line-clamp-2">
                            {template.description}
                          </CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between">
                        <Badge variant="outline">
                          {getContractTypeLabel(template.type)}
                        </Badge>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigate(`/contract-templates?edit=${template.id}`)}
                          >
                            <FileEdit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigate(`/contracts/new?templateId=${template.id}`)}
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
