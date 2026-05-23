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
  Send,
  Plus,
  Trash2,
  Building2,
  FileText,
  AlertCircle,
  CheckCircle,
} from "lucide-react";
import { toast } from "sonner";

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
    completionPercentage: 0,
    dateMiladi: new Date().toISOString().split('T')[0],
  });
  
  // قائمة الموردين
  const [suppliers, setSuppliers] = useState<SupplierEntry[]>([
    { id: crypto.randomUUID(), name: "", work: "", amount: 0, iban: "", bank: "" }
  ]);
  
  // جلب المشاريع
  const { data: projects } = trpc.projects.getAll.useQuery({});
  
  // جلب الموردين النشطين
  const { data: allSuppliers } = trpc.suppliers.getActiveSuppliers.useQuery({ includeUnapproved: true });

  // جلب التصنيفات
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
      navigate(`/projects/${formData.projectId}`);
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
    }
  }, [contractDetails]);

  // اختيار العقد تلقائياً إذا كان هناك عقد واحد فقط للمشروع
  useEffect(() => {
    if (projectContracts && projectContracts.contracts && projectContracts.contracts.length === 1) {
      if (formData.contractId === 0) {
        setFormData(prev => ({ ...prev, contractId: projectContracts.contracts[0].id }));
      }
    }
  }, [projectContracts]);
  
  // حساب الإجمالي
  const totalAmount = suppliers.reduce((sum, s) => sum + (s.amount || 0), 0);
  
  // حساب المتبقي للصرف
  const totalPaymentsSum = projectDetails?.payments?.reduce((sum, p) => sum + parseFloat(p.amount || "0"), 0) || 0;
  const contractAmount = parseFloat(contractDetails?.contract?.contractAmount || "0");
  const remainingAmount = contractAmount - totalPaymentsSum;

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

  // اختيار مورد من القائمة
  const handleSelectSupplier = (id: string, supplierName: string) => {
    const selectedSupplier = allSuppliers?.find(s => s.name === supplierName);
    if (selectedSupplier) {
      setSuppliers(suppliers.map(s => s.id === id ? { 
        ...s, 
        name: selectedSupplier.name,
        iban: selectedSupplier.iban || s.iban,
        bank: selectedSupplier.bankName || s.bank
      } : s));
    } else {
      updateSupplier(id, "name", supplierName);
    }
  };
  
  // إرسال للاعتماد
  const handleSubmit = () => {
    if (!formData.projectId) {
      toast.error("يرجى اختيار المشروع");
      return;
    }
    if (!formData.dateMiladi) {
      toast.error("يرجى تحديد التاريخ الميلادي");
      return;
    }
    if (!formData.title) {
      toast.error("يرجى إدخال عنوان طلب الصرف");
      return;
    }
    if (!formData.description) {
      toast.error("يرجى إدخال وصف الأعمال التي سوف تنفذ");
      return;
    }
    if (formData.completionPercentage <= 0) {
      toast.error("يرجى إدخال نسبة الإنجاز");
      return;
    }
    if (totalAmount <= 0) {
      toast.error("يرجى إدخال مبلغ صحيح");
      return;
    }
    if (suppliers.some(s => !s.name)) {
      toast.error("يرجى اختيار المورد المستفيد");
      return;
    }

    // التحقق من تجاوز قيمة العقد أو المبلغ المتبقي
    if (contractDetails && totalAmount > contractAmount) {
      toast.error(`المبلغ لا يمكن أن يتجاوز قيمة العقد (${contractAmount.toLocaleString()} ريال)`);
      return;
    }

    if (contractDetails && totalAmount > remainingAmount) {
      toast.error(`المبلغ لا يمكن أن يتجاوز الإجمالي المتبقي للصرف (${remainingAmount.toLocaleString()} ريال)`);
      return;
    }
    
    createMutation.mutate({
      projectId: formData.projectId,
      contractId: formData.contractId || undefined,
      title: formData.title,
      description: formData.description,
      amount: totalAmount,
      paymentType: "progress",
      dateMiladi: formData.dateMiladi,
      completionPercentage: formData.completionPercentage,
    });
  };
  
  return (
    <DashboardLayout>
      <div className="space-y-6" dir="rtl">
        {/* Header */}
        <div className="flex items-center justify-between flex-row-reverse">
          <div className="flex items-center gap-4 flex-row-reverse">
            <Button variant="ghost" size="icon" onClick={() => navigate("/disbursements")}>
              <ArrowRight className="h-5 w-5 rotate-180" />
            </Button>
            <div className="text-right">
              <h1 className="text-2xl font-bold text-right">طلب صرف جديد</h1>
              <p className="text-muted-foreground text-right">إنشاء طلب صرف للمشروع</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleSubmit} disabled={createMutation.isPending}>
              <Send className="h-4 w-4 ml-2" />
              إرسال للاعتماد
            </Button>
          </div>
        </div>
        
        {/* Form */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Form */}
          <div className="lg:col-span-2 space-y-6 text-right">
            {/* بيانات الترويسة */}
            <Card className="text-right">
              <CardHeader className="text-right">
                <CardTitle className="flex items-center gap-2 justify-start flex-row-reverse text-right">
                  <FileText className="h-5 w-5" />
                  بيانات طلب الصرف
                </CardTitle>
                <CardDescription className="text-right">معلومات أساسية عن طلب الصرف</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 text-right">
                <div className="space-y-2 text-right">
                  <Label className="text-right">التاريخ الميلادي *</Label>
                  <Input
                    type="date"
                    value={formData.dateMiladi}
                    onChange={(e) => setFormData({ ...formData, dateMiladi: e.target.value })}
                    required
                    className="text-right"
                  />
                </div>
                
                <div className="space-y-2 text-right">
                  <Label className="text-right">المشروع</Label>
                  <Select
                    value={formData.projectId.toString()}
                    onValueChange={(value) => setFormData({ ...formData, projectId: parseInt(value), contractId: 0 })}
                    disabled={formData.projectId > 0}
                  >
                    <SelectTrigger className="text-right" dir="rtl">
                      <SelectValue placeholder="اختر المشروع" />
                    </SelectTrigger>
                    <SelectContent dir="rtl">
                      {projects?.map((project: { id: number; name: string; projectNumber: string }) => (
                        <SelectItem key={project.id} value={project.id.toString()} className="text-right">
                          {project.name} - {project.projectNumber}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                {formData.projectId > 0 && projectContracts && projectContracts.contracts && projectContracts.contracts.length > 0 && (
                  <div className="space-y-2 text-right">
                    <Label className="text-right">العقد</Label>
                    <Select
                      value={formData.contractId.toString()}
                      onValueChange={(value) => setFormData({ ...formData, contractId: parseInt(value) })}
                      disabled={formData.contractId > 0}
                    >
                      <SelectTrigger className="text-right" dir="rtl">
                        <SelectValue placeholder="اختر العقد" />
                      </SelectTrigger>
                      <SelectContent dir="rtl">
                        <SelectItem value="0" className="text-right">بدون عقد</SelectItem>
                        {projectContracts.contracts.map((contract) => (
                          <SelectItem key={contract.id} value={contract.id.toString()} className="text-right">
                            {contract.contractNumber} - {(contract as any).subject || contract.contractType}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                
                <div className="space-y-2 text-right">
                  <Label className="text-right">عنوان طلب الصرف *</Label>
                  <Input
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="مثال: صرف الدفعة الأولى لمشروع ترميم مسجد..."
                    required
                    className="text-right"
                  />
                </div>
                
                <div className="space-y-2 text-right">
                  <Label className="text-right">وصف الأعمال التي سوف تنفذ *</Label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="وصف تفصيلي للأعمال التي سوف تنفذ..."
                    rows={3}
                    required
                    className="text-right"
                  />
                </div>
                
                <div className="space-y-2 text-right">
                  <Label className="text-right">نسبة الإنجاز (%) *</Label>
                  <Input
                    type="number"
                    min="1"
                    max="100"
                    required
                    value={formData.completionPercentage}
                    onChange={(e) => setFormData({ ...formData, completionPercentage: parseInt(e.target.value) || 0 })}
                    className="text-right"
                  />
                </div>
              </CardContent>
            </Card>
            
            {/* الموردون */}
            <Card className="text-right">
              <CardHeader className="text-right">
                <div className="flex items-center justify-between flex-row-reverse">
                  <div className="text-right">
                    <CardTitle className="flex items-center gap-2 justify-start flex-row-reverse text-right">
                      <Building2 className="h-5 w-5" />
                      معلومات المورد المستفيد
                    </CardTitle>
                    <CardDescription className="text-right">بيانات المستفيد من الصرف</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="text-right space-y-6">
                {suppliers.map((supplier) => (
                  <div key={supplier.id} className="grid grid-cols-1 md:grid-cols-3 gap-4" dir="rtl">
                    {/* اسم المورد */}
                    <div className="space-y-2 text-right">
                      <Label className="text-right">اسم المورد *</Label>
                      <Select
                        value={supplier.name}
                        onValueChange={(value) => handleSelectSupplier(supplier.id, value)}
                        disabled={formData.contractId > 0}
                      >
                        <SelectTrigger className="text-right" dir="rtl">
                          <SelectValue placeholder="اسم المورد" />
                        </SelectTrigger>
                        <SelectContent dir="rtl">
                          {allSuppliers?.map((s) => (
                            <SelectItem key={s.id} value={s.name} className="text-right">
                              {s.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* الأعمال */}
                    <div className="space-y-2 text-right">
                      <Label className="text-right">الأعمال</Label>
                      <Input
                        value={supplier.work}
                        onChange={(e) => updateSupplier(supplier.id, "work", e.target.value)}
                        placeholder="وصف الأعمال"
                        readOnly
                        className="bg-muted text-right"
                      />
                    </div>

                    {/* البنك */}
                    <div className="space-y-2 text-right">
                      <Label className="text-right">البنك</Label>
                      <Input
                        value={supplier.bank}
                        onChange={(e) => updateSupplier(supplier.id, "bank", e.target.value)}
                        placeholder="اسم البنك"
                        readOnly
                        className="bg-muted text-right"
                      />
                    </div>

                    {/* الآيبان */}
                    <div className="space-y-2 text-right">
                      <Label className="text-right">الآيبان</Label>
                      <Input
                        value={supplier.iban}
                        onChange={(e) => updateSupplier(supplier.id, "iban", e.target.value)}
                        placeholder="SA..."
                        dir="ltr"
                        readOnly
                        className="bg-muted text-right"
                      />
                    </div>

                    {/* النسبة (%) */}
                    <div className="space-y-2 text-right">
                      <Label className="text-right">النسبة (%)</Label>
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        step="0.01"
                        value={contractAmount ? Number(((supplier.amount / contractAmount) * 100).toFixed(2)) : ""}
                        onChange={(e) => {
                          const pct = parseFloat(e.target.value) || 0;
                          const calculatedAmount = contractAmount ? (contractAmount * pct) / 100 : 0;
                          updateSupplier(supplier.id, "amount", Number(calculatedAmount.toFixed(2)));
                        }}
                        placeholder="0"
                        className="text-right"
                      />
                    </div>

                    {/* المبلغ */}
                    <div className="space-y-2 text-right">
                      <Label className="text-right">المبلغ *</Label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        required
                        value={supplier.amount || ""}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value) || 0;
                          updateSupplier(supplier.id, "amount", val);
                        }}
                        placeholder="0.00"
                        className="text-right"
                      />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
          
          {/* Sidebar */}
          <div className="space-y-6 text-right">
            {/* ملخص الطلب */}
            <Card className="text-right">
              <CardHeader className="text-right">
                <CardTitle className="text-right">ملخص طلب الصرف</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-right">
                {projectDetails && (
                  <div className="space-y-2 text-right">
                    <div className="flex justify-between text-sm flex-row-reverse">
                      <span className="text-muted-foreground">المشروع:</span>
                      <span className="font-medium">{projectDetails.name}</span>
                    </div>
                    <div className="flex justify-between text-sm flex-row-reverse">
                      <span className="text-muted-foreground">رقم المشروع:</span>
                      <span className="font-medium">{projectDetails.projectNumber}</span>
                    </div>
                  </div>
                )}
                
                {contractDetails && (
                  <>
                    <Separator />
                    <div className="space-y-2 text-right">
                      <div className="flex justify-between text-sm flex-row-reverse">
                        <span className="text-muted-foreground">العقد:</span>
                        <span className="font-medium">{contractDetails.contract.contractNumber}</span>
                      </div>
                      <div className="flex justify-between text-sm flex-row-reverse">
                        <span className="text-muted-foreground">قيمة العقد:</span>
                        <span className="font-medium">{parseFloat(contractDetails.contract.contractAmount || "0").toLocaleString()} ريال</span>
                      </div>
                      <div className="flex justify-between text-sm flex-row-reverse">
                        <span className="text-muted-foreground font-medium">الإجمالي المتبقي للصرف:</span>
                        <span className="font-bold text-emerald-600">
                          {(parseFloat(contractDetails.contract.contractAmount || "0") - (projectDetails?.payments?.reduce((sum, p) => sum + parseFloat(p.amount || "0"), 0) || 0)).toLocaleString()} ريال
                        </span>
                      </div>
                    </div>
                  </>
                )}
                
                <Separator />
                
                <div className="space-y-2 text-right">
                  <div className="flex justify-between flex-row-reverse">
                    <span className="font-medium">إجمالي الدفعة:</span>
                    <span className={`font-bold text-lg ${contractDetails && (totalAmount > contractAmount || totalAmount > remainingAmount) ? 'text-destructive' : 'text-primary'}`}>
                      {totalAmount.toLocaleString()} ريال
                    </span>
                  </div>
                </div>
                
                <div className="p-3 bg-muted rounded-lg text-sm text-right">
                  <p className="text-muted-foreground text-right">{numberToArabicText(totalAmount)}</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
