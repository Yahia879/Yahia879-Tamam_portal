import { useState } from "react";
import { useParams, Link, useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { 
  Building2, 
  FileText, 
  Plus,
  Clock,
  CheckCircle2,
  AlertCircle,
  ChevronLeft,
  ArrowRight,
  Calendar,
  DollarSign,
  Users,
  Briefcase,
  BarChart3,
  FolderOpen,
  PauseCircle,
  Edit,
  Trash2,
  Package,
  FileSignature,
  CreditCard,
  ClipboardList,
  Building,
  Copy,
  Eye,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import DashboardLayout from "@/components/DashboardLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const statusColors: Record<string, string> = {
  planning: "bg-yellow-100 text-yellow-800 border-yellow-200",
  in_progress: "bg-blue-100 text-blue-800 border-blue-200",
  on_hold: "bg-orange-100 text-orange-800 border-orange-200",
  completed: "bg-green-100 text-green-800 border-green-200",
  cancelled: "bg-red-100 text-red-800 border-red-200",
};

const statusLabels: Record<string, string> = {
  planning: "تخطيط",
  in_progress: "قيد التنفيذ",
  on_hold: "متوقف",
  completed: "مكتمل",
  cancelled: "ملغي",
};

const phaseStatusColors: Record<string, string> = {
  pending: "bg-gray-100 text-gray-800",
  in_progress: "bg-blue-100 text-blue-800",
  completed: "bg-green-100 text-green-800",
};

const phaseStatusLabels: Record<string, string> = {
  pending: "قيد الانتظار",
  in_progress: "قيد التنفيذ",
  completed: "مكتمل",
};

export default function ProjectDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("overview");
  const [showAddBOQDialog, setShowAddBOQDialog] = useState(false);
  const [boqForm, setBOQForm] = useState({
    itemName: "",
    itemDescription: "",
    unit: "",
    quantity: "",
    unitPrice: "",
    category: "",
  });

  // جلب تفاصيل المشروع
  const { data: project, isLoading, refetch } = trpc.projects.getById.useQuery({ 
    id: parseInt(id || "0") 
  });

  // جلب جدول الكميات
  const { data: boqData, refetch: refetchBOQ } = trpc.projects.getBOQ.useQuery({ 
    projectId: parseInt(id || "0") 
  }, { enabled: !!id });

  // إضافة بند في جدول الكميات
  const addBOQMutation = trpc.projects.addBOQItem.useMutation({
    onSuccess: () => {
      toast.success("تم إضافة البند بنجاح");
      setShowAddBOQDialog(false);
      setBOQForm({
        itemName: "",
        itemDescription: "",
        unit: "",
        quantity: "",
        unitPrice: "",
        category: "",
      });
      refetchBOQ();
    },
    onError: (error) => {
      toast.error(error.message || "حدث خطأ أثناء إضافة البند");
    },
  });

  // حذف بند من جدول الكميات
  const deleteBOQMutation = trpc.projects.deleteBOQItem.useMutation({
    onSuccess: () => {
      toast.success("تم حذف البند بنجاح");
      refetchBOQ();
    },
    onError: (error) => {
      toast.error(error.message || "حدث خطأ أثناء حذف البند");
    },
  });

  // تحديث مرحلة
  const updatePhaseMutation = trpc.projects.updatePhase.useMutation({
    onSuccess: () => {
      toast.success("تم تحديث المرحلة بنجاح");
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || "حدث خطأ أثناء تحديث المرحلة");
    },
  });

  // تكرار عقد
  const duplicateContractMutation = trpc.contracts.duplicate.useMutation({
    onSuccess: (data) => {
      toast.success(`تم تكرار العقد بنجاح - رقم العقد الجديد: ${data.contractNumber}`);
      navigate(`/contracts/${data.id}/preview`);
    },
    onError: (error) => {
      toast.error(error.message || "حدث خطأ أثناء تكرار العقد");
    },
  });

  const handleDuplicateContract = (contractId: number) => {
    if (confirm("هل تريد تكرار هذا العقد؟ \nسيتم إنشاء نسخة جديدة برقم عقد مختلف.")) {
      duplicateContractMutation.mutate({ id: contractId });
    }
  };

  const formatCurrency = (amount: string | null) => {
    if (!amount) return "غير محدد";
    return new Intl.NumberFormat("ar-SA", {
      style: "currency",
      currency: "SAR",
      maximumFractionDigits: 0,
    }).format(parseFloat(amount));
  };

  const handleAddBOQItem = () => {
    if (!boqForm.itemName || !boqForm.unit || !boqForm.quantity) {
      toast.error("يرجى ملء الحقول المطلوبة");
      return;
    }

    addBOQMutation.mutate({
      projectId: parseInt(id || "0"),
      requestId: project?.requestId || 0,
      itemName: boqForm.itemName,
      itemDescription: boqForm.itemDescription || undefined,
      unit: boqForm.unit,
      quantity: parseFloat(boqForm.quantity),
      unitPrice: boqForm.unitPrice ? parseFloat(boqForm.unitPrice) : undefined,
      category: boqForm.category || undefined,
    });
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <div className="h-8 w-48 bg-muted animate-pulse rounded" />
          <div className="h-64 bg-muted animate-pulse rounded-lg" />
        </div>
      </DashboardLayout>
    );
  }

  if (!project) {
    return (
      <DashboardLayout>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-12 text-center">
            <FolderOpen className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">المشروع غير موجود</h3>
            <Link href="/project-management">
              <Button variant="outline">العودة للمشاريع</Button>
            </Link>
          </CardContent>
        </Card>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* العنوان */}
        <div className="flex items-center gap-4">
          <Link href="/project-management">
            <Button variant="ghost" size="icon">
              <ArrowRight className="w-5 h-5" />
            </Button>
          </Link>
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-bold text-foreground">{project.projectNumber}</h1>
              <Badge variant="outline" className={statusColors[project.status || "planning"]}>
                {statusLabels[project.status || "planning"]}
              </Badge>
            </div>
            <p className="text-muted-foreground">{project.name}</p>
          </div>
        </div>

        {/* بطاقات المعلومات الرئيسية */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <DollarSign className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">الميزانية</p>
                  <p className="font-bold text-foreground">{formatCurrency(project.budget)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                  <CreditCard className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">التكلفة الفعلية</p>
                  <p className="font-bold text-foreground">{formatCurrency(project.actualCost)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                  <BarChart3 className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">نسبة الإنجاز</p>
                  <p className="font-bold text-foreground">{project.completionPercentage || 0}%</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                  <Users className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">مدير المشروع</p>
                  <p className="font-bold text-foreground">{project.managerName || "غير محدد"}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* شريط التقدم */}
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">تقدم المشروع</span>
              <span className="text-sm text-muted-foreground">{project.completionPercentage || 0}%</span>
            </div>
            <Progress value={project.completionPercentage || 0} className="h-3" />
          </CardContent>
        </Card>

        {/* التبويبات */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">نظرة عامة</TabsTrigger>
            <TabsTrigger value="phases">المراحل</TabsTrigger>
            <TabsTrigger value="boq">جدول الكميات</TabsTrigger>
            <TabsTrigger value="contracts">العقود</TabsTrigger>
            <TabsTrigger value="payments">الدفعات</TabsTrigger>
          </TabsList>

          {/* نظرة عامة */}
          <TabsContent value="overview" className="space-y-4">
            <div className="grid lg:grid-cols-2 gap-4">
              <Card className="border-0 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-lg">معلومات المشروع</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">رقم المشروع</p>
                      <p className="font-medium">{project.projectNumber}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">الحالة</p>
                      <Badge variant="outline" className={statusColors[project.status || "planning"]}>
                        {statusLabels[project.status || "planning"]}
                      </Badge>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">تاريخ البدء</p>
                      <p className="font-medium">
                        {project.startDate 
                          ? new Date(project.startDate).toLocaleDateString("ar-SA")
                          : "لم يبدأ بعد"
                        }
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">تاريخ الانتهاء المتوقع</p>
                      <p className="font-medium">
                        {project.expectedEndDate 
                          ? new Date(project.expectedEndDate).toLocaleDateString("ar-SA")
                          : "غير محدد"
                        }
                      </p>
                    </div>
                  </div>
                  {project.description && (
                    <div>
                      <p className="text-sm text-muted-foreground">الوصف</p>
                      <p className="font-medium">{project.description}</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {project.request && (
                <Card className="border-0 shadow-sm">
                  <CardHeader>
                    <CardTitle className="text-lg">الطلب المرتبط</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">رقم الطلب</p>
                        <Link href={`/requests/${project.request.id}`}>
                          <p className="font-medium text-primary hover:underline cursor-pointer">
                            {project.request.requestNumber}
                          </p>
                        </Link>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">البرنامج</p>
                        <p className="font-medium">{project.request.programType}</p>
                      </div>
                      {project.request.mosqueName && (
                        <div className="col-span-2">
                          <p className="text-sm text-muted-foreground">المسجد</p>
                          <p className="font-medium">{project.request.mosqueName} - {project.request.mosqueCity}</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          {/* المراحل */}
          <TabsContent value="phases" className="space-y-4">
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg">مراحل المشروع</CardTitle>
                <CardDescription>متابعة تقدم مراحل المشروع</CardDescription>
              </CardHeader>
              <CardContent>
                {project.phases && project.phases.length > 0 ? (
                  <div className="space-y-4">
                    {project.phases.map((phase, index) => (
                      <div key={phase.id} className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          phase.status === "completed" ? "bg-green-500 text-white" :
                          phase.status === "in_progress" ? "bg-blue-500 text-white" :
                          "bg-gray-200 text-gray-600"
                        }`}>
                          {phase.status === "completed" ? (
                            <CheckCircle2 className="w-5 h-5" />
                          ) : (
                            <span className="font-bold">{index + 1}</span>
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium">{phase.phaseName}</h4>
                            <Badge variant="outline" className={phaseStatusColors[phase.status || "pending"]}>
                              {phaseStatusLabels[phase.status || "pending"]}
                            </Badge>
                          </div>
                          {phase.description && (
                            <p className="text-sm text-muted-foreground mt-1">{phase.description}</p>
                          )}
                          <div className="flex items-center gap-4 mt-2">
                            <Progress value={phase.completionPercentage || 0} className="flex-1 h-2" />
                            <span className="text-sm text-muted-foreground">{phase.completionPercentage || 0}%</span>
                          </div>
                        </div>
                        <Select
                          value={phase.status || "pending"}
                          onValueChange={(value) => {
                            updatePhaseMutation.mutate({
                              id: phase.id,
                              status: value as "pending" | "in_progress" | "completed",
                            });
                          }}
                        >
                          <SelectTrigger className="w-[140px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pending">قيد الانتظار</SelectItem>
                            <SelectItem value="in_progress">قيد التنفيذ</SelectItem>
                            <SelectItem value="completed">مكتمل</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Clock className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">لا توجد مراحل محددة</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* جدول الكميات */}
          <TabsContent value="boq" className="space-y-4">
            <Card className="border-0 shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-lg">جدول الكميات (BOQ)</CardTitle>
                  <CardDescription>قائمة البنود والكميات المطلوبة للمشروع</CardDescription>
                </div>
                <Dialog open={showAddBOQDialog} onOpenChange={setShowAddBOQDialog}>
                  <DialogTrigger asChild>
                    <Button className="gradient-primary text-white">
                      <Plus className="w-4 h-4 ml-2" />
                      إضافة بند
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>إضافة بند جديد</DialogTitle>
                      <DialogDescription>أضف بند جديد إلى جدول الكميات</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label>اسم البند *</Label>
                        <Input
                          value={boqForm.itemName}
                          onChange={(e) => setBOQForm({ ...boqForm, itemName: e.target.value })}
                          placeholder="مثال: أعمال الخرسانة"
                        />
                      </div>
                      <div>
                        <Label>الوصف</Label>
                        <Textarea
                          value={boqForm.itemDescription}
                          onChange={(e) => setBOQForm({ ...boqForm, itemDescription: e.target.value })}
                          placeholder="وصف تفصيلي للبند"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>الوحدة *</Label>
                          <Input
                            value={boqForm.unit}
                            onChange={(e) => setBOQForm({ ...boqForm, unit: e.target.value })}
                            placeholder="مثال: م³"
                          />
                        </div>
                        <div>
                          <Label>الكمية *</Label>
                          <Input
                            type="number"
                            value={boqForm.quantity}
                            onChange={(e) => setBOQForm({ ...boqForm, quantity: e.target.value })}
                            placeholder="0"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>سعر الوحدة</Label>
                          <Input
                            type="number"
                            value={boqForm.unitPrice}
                            onChange={(e) => setBOQForm({ ...boqForm, unitPrice: e.target.value })}
                            placeholder="0"
                          />
                        </div>
                        <div>
                          <Label>التصنيف</Label>
                          <Input
                            value={boqForm.category}
                            onChange={(e) => setBOQForm({ ...boqForm, category: e.target.value })}
                            placeholder="مثال: أعمال إنشائية"
                          />
                        </div>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setShowAddBOQDialog(false)}>
                        إلغاء
                      </Button>
                      <Button onClick={handleAddBOQItem} disabled={addBOQMutation.isPending}>
                        {addBOQMutation.isPending ? "جاري الإضافة..." : "إضافة"}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                {boqData && boqData.items.length > 0 ? (
                  <>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-right">البند</TableHead>
                          <TableHead className="text-right">الوحدة</TableHead>
                          <TableHead className="text-right">الكمية</TableHead>
                          <TableHead className="text-right">سعر الوحدة</TableHead>
                          <TableHead className="text-right">الإجمالي</TableHead>
                          <TableHead className="text-right">التصنيف</TableHead>
                          <TableHead className="w-[50px]"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {boqData.items.map((item) => (
                          <TableRow key={item.id}>
                            <TableCell>
                              <div>
                                <p className="font-medium">{item.itemName}</p>
                                {item.itemDescription && (
                                  <p className="text-sm text-muted-foreground">{item.itemDescription}</p>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>{item.unit}</TableCell>
                            <TableCell>{item.quantity}</TableCell>
                            <TableCell>{item.unitPrice ? formatCurrency(item.unitPrice) : "-"}</TableCell>
                            <TableCell>{item.totalPrice ? formatCurrency(item.totalPrice) : "-"}</TableCell>
                            <TableCell>{item.category || "-"}</TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-destructive hover:text-destructive"
                                onClick={() => deleteBOQMutation.mutate({ id: item.id })}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    <div className="mt-4 p-4 bg-muted/50 rounded-lg flex items-center justify-between">
                      <span className="font-medium">الإجمالي الكلي</span>
                      <span className="text-xl font-bold text-primary">{formatCurrency(boqData.total.toString())}</span>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-8">
                    <ClipboardList className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">لا توجد بنود في جدول الكميات</p>
                    <Button 
                      variant="outline" 
                      className="mt-4"
                      onClick={() => setShowAddBOQDialog(true)}
                    >
                      <Plus className="w-4 h-4 ml-2" />
                      إضافة بند
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* العقود */}
          <TabsContent value="contracts" className="space-y-4">
            <Card className="border-0 shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-lg">العقود</CardTitle>
                  <CardDescription>عقود المقاولين والموردين</CardDescription>
                </div>
                <Button className="gradient-primary text-white" onClick={() => toast.info("قريباً - إضافة عقد جديد")}>
                  <Plus className="w-4 h-4 ml-2" />
                  إضافة عقد
                </Button>
              </CardHeader>
              <CardContent>
                {project.contracts && project.contracts.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-right">رقم العقد</TableHead>
                        <TableHead className="text-right">المورد</TableHead>
                        <TableHead className="text-right">نوع العقد</TableHead>
                        <TableHead className="text-right">القيمة</TableHead>
                        <TableHead className="text-right">الحالة</TableHead>
                        <TableHead className="text-right">الإجراءات</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {project.contracts.map((contract) => (
                        <TableRow key={contract.id}>
                          <TableCell className="font-medium">{contract.contractNumber}</TableCell>
                          <TableCell>{contract.supplierName || "غير محدد"}</TableCell>
                          <TableCell>{contract.contractType || "-"}</TableCell>
                          <TableCell>{formatCurrency(contract.amount)}</TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {contract.status === "draft" ? "مسودة" :
                               contract.status === "active" ? "نشط" :
                               contract.status === "completed" ? "مكتمل" : "منتهي"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => navigate(`/contracts/${contract.id}/preview`)}
                                title="معاينة العقد"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>

                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-8">
                    <FileSignature className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">لا توجد عقود مسجلة</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* الدفعات */}
          <TabsContent value="payments" className="space-y-4">
            <Card className="border-0 shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-lg">الدفعات</CardTitle>
                  <CardDescription>سجل الدفعات المالية للمشروع</CardDescription>
                </div>
                <Button className="gradient-primary text-white" onClick={() => toast.info("قريباً - إضافة دفعة جديدة")}>
                  <Plus className="w-4 h-4 ml-2" />
                  إضافة دفعة
                </Button>
              </CardHeader>
              <CardContent>
                {project.payments && project.payments.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-right">رقم الدفعة</TableHead>
                        <TableHead className="text-right">النوع</TableHead>
                        <TableHead className="text-right">المبلغ</TableHead>
                        <TableHead className="text-right">الحالة</TableHead>
                        <TableHead className="text-right">التاريخ</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {project.payments.map((payment) => (
                        <TableRow key={payment.id}>
                          <TableCell className="font-medium">{payment.paymentNumber}</TableCell>
                          <TableCell>
                            {payment.paymentType === "advance" ? "دفعة مقدمة" :
                             payment.paymentType === "progress" ? "دفعة تقدم" :
                             payment.paymentType === "final" ? "دفعة نهائية" : "محتجزات"}
                          </TableCell>
                          <TableCell>{formatCurrency(payment.amount)}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className={
                              payment.status === "paid" ? "bg-green-100 text-green-800" :
                              payment.status === "approved" ? "bg-blue-100 text-blue-800" :
                              payment.status === "rejected" ? "bg-red-100 text-red-800" :
                              "bg-yellow-100 text-yellow-800"
                            }>
                              {payment.status === "pending" ? "قيد الانتظار" :
                               payment.status === "approved" ? "معتمد" :
                               payment.status === "paid" ? "مدفوع" : "مرفوض"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {payment.paidAt 
                              ? new Date(payment.paidAt).toLocaleDateString("ar-SA")
                              : "-"
                            }
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-8">
                    <CreditCard className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">لا توجد دفعات مسجلة</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
