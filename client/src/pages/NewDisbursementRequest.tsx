import { useState, useEffect } from "react";
import { useLocation, useParams } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ArrowRight,
  Save,
  Send,
  Plus,
  Trash2,
  Building2,
  Banknote,
  FileText,
  AlertCircle,
  CheckCircle,
} from "lucide-react";
import { toast } from "sonner";

// دالة تحويل التاريخ الميلادي إلى هجري (تقريبي)
function toHijriDate(date: Date): string {
  const gregorianYear = date.getFullYear();
  const gregorianMonth = date.getMonth() + 1;
  const gregorianDay = date.getDate();
  
  // تحويل تقريبي
  const hijriYear = Math.floor((gregorianYear - 622) * (33 / 32));
  const hijriMonth = ((gregorianMonth + 9) % 12) + 1;
  const hijriDay = gregorianDay;
  
  return `${hijriDay}/${hijriMonth}/${hijriYear}`;
}

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
    else if (thousands <= 10) result = `${ones[thousands]} آلاف`;
    else result = `${convertHundreds(thousands)} ألف`;
    return rest ? `${result} و${convertHundreds(rest)}` : result;
  }

  const intPart = Math.floor(num);
  return `${convertThousands(intPart)} ريال سعودي فقط لا غير`;
}

interface SupplierEntry {
  id: string;
  name: string;
  work: string;
  amount: number;
  iban: string;
  bank: string;
}

export default function NewDisbursementRequest() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const params = useParams<{ projectId?: string; contractId?: string }>();
  
  // بيانات النموذج
  const [formData, setFormData] = useState({
    projectId: params.projectId ? parseInt(params.projectId) : 0,
    contractId: params.contractId ? parseInt(params.contractId) : 0,
    title: "",
    description: "",
    fundingSourceType: "",
    fundingSourceName: "",
    projectOwnerDepartment: "",
    actualCost: 0,
    adminFees: 0,
    completionPercentage: 0,
    dateHijri: toHijriDate(new Date()),
    dateMiladi: new Date().toISOString().split('T')[0],
  });
  
  // قائمة الموردين
  const [suppliers, setSuppliers] = useState<SupplierEntry[]>([
    { id: crypto.randomUUID(), name: "", work: "", amount: 0, iban: "", bank: "" }
  ]);
  
  // جلب المشاريع
  const { data: projects } = trpc.projects.getAll.useQuery({});
  
  // جلب التصنيفات
  const { data: fundingSourcesData } = trpc.categories.getCategoryByType.useQuery({ type: "funding_sources" });
  const fundingSources = fundingSourcesData?.values;
  const { data: projectOwnersData } = trpc.categories.getCategoryByType.useQuery({ type: "project_owners" });
  const projectOwners = projectOwnersData?.values;
  const { data: banksData } = trpc.categories.getCategoryByType.useQuery({ type: "banks" });
  const banks = banksData?.values;
  
  // جلب العقود للمشروع المحدد
  const { data: projectContracts } = trpc.contracts.list.useQuery(
    { projectId: formData.projectId },
    { enabled: formData.projectId > 0 }
  );
  
  // جلب تفاصيل المشروع
  const { data: projectDetails } = trpc.projects.getById.useQuery(
    { id: formData.projectId },
    { enabled: formData.projectId > 0 }
  );
  
  // جلب تفاصيل العقد
  const { data: contractDetails } = trpc.contracts.getById.useQuery(
    { id: formData.contractId },
    { enabled: formData.contractId > 0 }
  );
  
  // mutation لإنشاء طلب الصرف
  const createMutation = trpc.disbursements.createRequest.useMutation({
    onSuccess: (data) => {
      toast.success("تم إنشاء طلب الصرف بنجاح");
      navigate(`/disbursements/${data.id}`);
    },
    onError: (error) => {
      toast.error(`خطأ: ${error.message}`);
    },
  });
  
  // تحديث بيانات المورد من العقد
  useEffect(() => {
    if (contractDetails) {
      const supplierFromContract: SupplierEntry = {
        id: crypto.randomUUID(),
        name: contractDetails.contract.secondPartyName || "",
        work: contractDetails.contract.contractTitle || "",
        amount: parseFloat(String(contractDetails.contract.contractAmount || "0")),
        iban: contractDetails.contract.secondPartyIban || "",
        bank: contractDetails.contract.secondPartyBankName || "",
      };
      setSuppliers([supplierFromContract]);
      setFormData(prev => ({
        ...prev,
        actualCost: parseFloat(String(contractDetails.contract.contractAmount || "0")),
      }));
    }
  }, [contractDetails]);
  
  // حساب الإجمالي
  const totalSupplierAmount = suppliers.reduce((sum, s) => sum + (s.amount || 0), 0);
  const totalAmount = formData.actualCost + formData.adminFees;
  
  // إضافة مورد جديد
  const addSupplier = () => {
    setSuppliers([...suppliers, { id: crypto.randomUUID(), name: "", work: "", amount: 0, iban: "", bank: "" }]);
  };
  
  // حذف مورد
  const removeSupplier = (id: string) => {
    if (suppliers.length > 1) {
      setSuppliers(suppliers.filter(s => s.id !== id));
    }
  };
  
  // تحديث بيانات المورد
  const updateSupplier = (id: string, field: keyof SupplierEntry, value: string | number) => {
    setSuppliers(suppliers.map(s => s.id === id ? { ...s, [field]: value } : s));
  };
  
  // حفظ كمسودة
  const handleSaveDraft = () => {
    if (!formData.projectId) {
      toast.error("يرجى اختيار المشروع");
      return;
    }
    
    createMutation.mutate({
      projectId: formData.projectId,
      contractId: formData.contractId || undefined,
      title: formData.title || `طلب صرف - ${projectDetails?.name || ""}`,
      description: formData.description,
      amount: totalAmount,
      paymentType: "progress",
      completionPercentage: formData.completionPercentage,
      
    });
  };
  
  // إرسال للاعتماد
  const handleSubmit = () => {
    if (!formData.projectId) {
      toast.error("يرجى اختيار المشروع");
      return;
    }
    if (!formData.fundingSourceType) {
      toast.error("يرجى اختيار مصدر الدعم");
      return;
    }
    if (!formData.projectOwnerDepartment) {
      toast.error("يرجى اختيار الجهة المالكة للمشروع");
      return;
    }
    if (suppliers.some(s => !s.name || !s.amount)) {
      toast.error("يرجى إكمال بيانات الموردين");
      return;
    }
    
    createMutation.mutate({
      projectId: formData.projectId,
      contractId: formData.contractId || undefined,
      title: formData.title || `طلب صرف - ${projectDetails?.name || ""}`,
      description: formData.description,
      amount: totalAmount,
      paymentType: "progress",
      completionPercentage: formData.completionPercentage,
      
    });
  };
  
  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/disbursements")}>
              <ArrowRight className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">طلب صرف جديد</h1>
              <p className="text-muted-foreground">إنشاء طلب صرف للمشروع</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleSaveDraft} disabled={createMutation.isPending}>
              <Save className="h-4 w-4 ml-2" />
              حفظ كمسودة
            </Button>
            <Button onClick={handleSubmit} disabled={createMutation.isPending}>
              <Send className="h-4 w-4 ml-2" />
              إرسال للاعتماد
            </Button>
          </div>
        </div>
        
        {/* Form */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Form */}
          <div className="lg:col-span-2 space-y-6">
            {/* بيانات الترويسة */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  بيانات طلب الصرف
                </CardTitle>
                <CardDescription>معلومات أساسية عن طلب الصرف</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>التاريخ الهجري</Label>
                    <Input
                      value={formData.dateHijri}
                      onChange={(e) => setFormData({ ...formData, dateHijri: e.target.value })}
                      placeholder="1446/06/07"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>التاريخ الميلادي</Label>
                    <Input
                      type="date"
                      value={formData.dateMiladi}
                      onChange={(e) => setFormData({ ...formData, dateMiladi: e.target.value })}
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label>المشروع *</Label>
                  <Select
                    value={formData.projectId.toString()}
                    onValueChange={(value) => setFormData({ ...formData, projectId: parseInt(value), contractId: 0 })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="اختر المشروع" />
                    </SelectTrigger>
                    <SelectContent>
                      {projects?.map((project: { id: number; name: string; projectNumber: string }) => (
                        <SelectItem key={project.id} value={project.id.toString()}>
                          {project.name} - {project.projectNumber}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                {formData.projectId > 0 && projectContracts && projectContracts.contracts && projectContracts.contracts.length > 0 && (
                  <div className="space-y-2">
                    <Label>العقد (اختياري)</Label>
                    <Select
                      value={formData.contractId.toString()}
                      onValueChange={(value) => setFormData({ ...formData, contractId: parseInt(value) })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="اختر العقد" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0">بدون عقد</SelectItem>
                        {projectContracts.contracts.map((contract) => (
                          <SelectItem key={contract.id} value={contract.id.toString()}>
                            {contract.contractNumber} - {(contract as any).subject || contract.contractType}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                
                <div className="space-y-2">
                  <Label>عنوان طلب الصرف</Label>
                  <Input
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="مثال: صرف الدفعة الأولى لمشروع ترميم مسجد..."
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>وصف الأعمال المنفذة</Label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="وصف تفصيلي للأعمال المنفذة..."
                    rows={3}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>نسبة الإنجاز (%)</Label>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    value={formData.completionPercentage}
                    onChange={(e) => setFormData({ ...formData, completionPercentage: parseInt(e.target.value) || 0 })}
                  />
                </div>
              </CardContent>
            </Card>
            
            {/* مصدر الدعم */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Banknote className="h-5 w-5" />
                  مصدر الدعم
                </CardTitle>
                <CardDescription>تحديد مصدر تمويل المشروع</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>نوع مصدر الدعم *</Label>
                    <Select
                      value={formData.fundingSourceType}
                      onValueChange={(value) => setFormData({ ...formData, fundingSourceType: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="اختر مصدر الدعم" />
                      </SelectTrigger>
                      <SelectContent>
                        {fundingSources?.map((source: { id: number; value: string; valueAr: string }) => (
                          <SelectItem key={source.id} value={source.value}>
                            {source.valueAr}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>اسم الجهة الداعمة</Label>
                    <Input
                      value={formData.fundingSourceName}
                      onChange={(e) => setFormData({ ...formData, fundingSourceName: e.target.value })}
                      placeholder="اسم الجهة أو المتبرع..."
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label>الجهة المالكة للمشروع *</Label>
                  <Select
                    value={formData.projectOwnerDepartment}
                    onValueChange={(value) => setFormData({ ...formData, projectOwnerDepartment: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="اختر الجهة المالكة" />
                    </SelectTrigger>
                    <SelectContent>
                      {projectOwners?.map((owner: { id: number; value: string; valueAr: string }) => (
                        <SelectItem key={owner.id} value={owner.value}>
                          {owner.valueAr}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
            
            {/* التكاليف */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  التكاليف
                </CardTitle>
                <CardDescription>تفاصيل تكاليف المشروع</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>تكلفة المشروع الفعلية</Label>
                    <Input
                      type="number"
                      value={formData.actualCost}
                      onChange={(e) => setFormData({ ...formData, actualCost: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>الأجور الإدارية</Label>
                    <Input
                      type="number"
                      value={formData.adminFees}
                      onChange={(e) => setFormData({ ...formData, adminFees: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>الإجمالي</Label>
                    <Input
                      type="number"
                      value={totalAmount}
                      readOnly
                      className="bg-muted font-bold"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
            
            {/* الموردون */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Building2 className="h-5 w-5" />
                      الموردون / المقاولون
                    </CardTitle>
                    <CardDescription>بيانات المستفيدين من الصرف</CardDescription>
                  </div>
                  <Button variant="outline" size="sm" onClick={addSupplier}>
                    <Plus className="h-4 w-4 ml-2" />
                    إضافة مورد
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>اسم المورد</TableHead>
                      <TableHead>الأعمال</TableHead>
                      <TableHead>المبلغ</TableHead>
                      <TableHead>البنك</TableHead>
                      <TableHead>الآيبان</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {suppliers.map((supplier) => (
                      <TableRow key={supplier.id}>
                        <TableCell>
                          <Input
                            value={supplier.name}
                            onChange={(e) => updateSupplier(supplier.id, "name", e.target.value)}
                            placeholder="اسم المورد"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            value={supplier.work}
                            onChange={(e) => updateSupplier(supplier.id, "work", e.target.value)}
                            placeholder="وصف الأعمال"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            value={supplier.amount}
                            onChange={(e) => updateSupplier(supplier.id, "amount", parseFloat(e.target.value) || 0)}
                          />
                        </TableCell>
                        <TableCell>
                          <Select
                            value={supplier.bank}
                            onValueChange={(value) => updateSupplier(supplier.id, "bank", value)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="البنك" />
                            </SelectTrigger>
                            <SelectContent>
                              {banks?.map((bank: { id: number; value: string; valueAr: string }) => (
                                <SelectItem key={bank.id} value={bank.value}>
                                  {bank.valueAr}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Input
                            value={supplier.iban}
                            onChange={(e) => updateSupplier(supplier.id, "iban", e.target.value)}
                            placeholder="SA..."
                            dir="ltr"
                          />
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => removeSupplier(supplier.id)}
                            disabled={suppliers.length === 1}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                
                <div className="mt-4 p-4 bg-muted rounded-lg">
                  <div className="flex justify-between items-center">
                    <span className="font-medium">إجمالي مبالغ الموردين:</span>
                    <span className="font-bold text-lg">{totalSupplierAmount.toLocaleString()} ريال</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
          
          {/* Sidebar */}
          <div className="space-y-6">
            {/* ملخص الطلب */}
            <Card>
              <CardHeader>
                <CardTitle>ملخص طلب الصرف</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {projectDetails && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">المشروع:</span>
                      <span className="font-medium">{projectDetails.name}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">رقم المشروع:</span>
                      <span className="font-medium">{projectDetails.projectNumber}</span>
                    </div>
                  </div>
                )}
                
                {contractDetails && (
                  <>
                    <Separator />
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">العقد:</span>
                        <span className="font-medium">{contractDetails.contract.contractNumber}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">قيمة العقد:</span>
                        <span className="font-medium">{parseFloat((contractDetails.contract as any).totalValue || "0").toLocaleString()} ريال</span>
                      </div>
                    </div>
                  </>
                )}
                
                <Separator />
                
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">تكلفة المشروع:</span>
                    <span className="font-medium">{formData.actualCost.toLocaleString()} ريال</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">الأجور الإدارية:</span>
                    <span className="font-medium">{formData.adminFees.toLocaleString()} ريال</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between">
                    <span className="font-medium">الإجمالي:</span>
                    <span className="font-bold text-lg text-primary">{totalAmount.toLocaleString()} ريال</span>
                  </div>
                </div>
                
                <div className="p-3 bg-muted rounded-lg text-sm">
                  <p className="text-muted-foreground">{numberToArabicText(totalAmount)}</p>
                </div>
              </CardContent>
            </Card>
            
            {/* تنبيهات */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5" />
                  تنبيهات
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {!formData.projectId && (
                  <div className="flex items-start gap-2 text-sm text-amber-600">
                    <AlertCircle className="h-4 w-4 mt-0.5" />
                    <span>يرجى اختيار المشروع</span>
                  </div>
                )}
                {!formData.fundingSourceType && (
                  <div className="flex items-start gap-2 text-sm text-amber-600">
                    <AlertCircle className="h-4 w-4 mt-0.5" />
                    <span>يرجى اختيار مصدر الدعم</span>
                  </div>
                )}
                {!formData.projectOwnerDepartment && (
                  <div className="flex items-start gap-2 text-sm text-amber-600">
                    <AlertCircle className="h-4 w-4 mt-0.5" />
                    <span>يرجى اختيار الجهة المالكة</span>
                  </div>
                )}
                {suppliers.some(s => !s.name) && (
                  <div className="flex items-start gap-2 text-sm text-amber-600">
                    <AlertCircle className="h-4 w-4 mt-0.5" />
                    <span>يرجى إدخال اسم المورد</span>
                  </div>
                )}
                {formData.projectId > 0 && formData.fundingSourceType && formData.projectOwnerDepartment && suppliers.every(s => s.name) && (
                  <div className="flex items-start gap-2 text-sm text-green-600">
                    <CheckCircle className="h-4 w-4 mt-0.5" />
                    <span>جميع البيانات المطلوبة مكتملة</span>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
