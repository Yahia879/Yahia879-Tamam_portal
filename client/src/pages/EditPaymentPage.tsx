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
  Loader2,
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

export default function EditPaymentPage() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const params = useParams<{ id?: string }>();
  const utils = trpc.useUtils();
  
  const paymentId = params.id || "";
  
  // بيانات النموذج
  const [formData, setFormData] = useState<{
    projectId: number;
    contractId: number;
    title: string;
    description: string;
    completionPercentage: number | "";
    dateMiladi: string;
  }>({
    projectId: 0,
    contractId: 0,
    title: "",
    description: "",
    completionPercentage: "",
    dateMiladi: "",
  });
  
  // قائمة الموردين
  const [suppliers, setSuppliers] = useState<SupplierEntry[]>([]);

  // جلب تفاصيل الدفعة الموحدة الحالية
  const { data: payment, isLoading: isPaymentLoading } = trpc.projects.getUnifiedPayment.useQuery(
    { id: paymentId },
    { 
      enabled: !!paymentId,
      refetchOnWindowFocus: false,
    }
  );
  
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

  // تعبئة البيانات الأساسية للدفعة
  useEffect(() => {
    if (payment) {
      setFormData({
        projectId: payment.projectId || 0,
        contractId: payment.contractId || 0,
        title: payment.title || "",
        description: payment.description || "",
        completionPercentage: payment.completionPercentage === 0 ? "" : (payment.completionPercentage || ""),
        dateMiladi: payment.dateMiladi || "",
      });
    }
  }, [payment]);
  
  // تحديث بيانات المورد من العقد أو تهيئة القائمة بالدفعة الحالية
  useEffect(() => {
    if (payment) {
      if (contractDetails) {
        const supplierFromContract: SupplierEntry = {
          id: crypto.randomUUID(),
          name: contractDetails.contract.secondPartyName || "",
          work: contractDetails.contract.contractTitle || "",
          amount: payment.amount,
          iban: contractDetails.contract.secondPartyIban || "",
          bank: contractDetails.contract.secondPartyBankName || "",
        };
        setSuppliers([supplierFromContract]);
      } else if (!formData.contractId) {
        // دفعات بدون عقد
        setSuppliers([
          { 
            id: crypto.randomUUID(), 
            name: "", 
            work: "", 
            amount: payment.amount, 
            iban: "", 
            bank: "" 
          }
        ]);
      }
    }
  }, [contractDetails, payment, formData.contractId]);
  
  // حساب الإجمالي
  const totalAmount = suppliers.reduce((sum, s) => sum + (s.amount || 0), 0);
  
  // حساب المتبقي للصرف (نستثني الدفعة الحالية لتجنب مضاعفتها في المعادلة)
  const totalPaymentsSum = projectDetails?.payments?.reduce((sum, p) => {
    if (p.id === paymentId) return sum;
    if (payment?.contractPaymentId && p.contractPaymentId === payment.contractPaymentId) return sum;
    if (paymentId.startsWith("disb-") && p.id === `cp-${payment?.contractPaymentId}`) return sum;
    return sum + parseFloat(p.amount || "0");
  }, 0) || 0;

  const contractAmount = parseFloat(contractDetails?.contract?.contractAmount || "0");
  const remainingAmount = contractAmount - totalPaymentsSum;

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
  
  // mutation لتحديث الدفعة
  const updateMutation = trpc.projects.updateUnifiedPayment.useMutation({
    onSuccess: () => {
      toast.success("تم تحديث الدفعة بنجاح");
      if (formData.projectId) {
        utils.projects.getById.invalidate({ id: formData.projectId });
        navigate(`/projects/${formData.projectId}`);
      } else {
        navigate("/disbursements");
      }
    },
    onError: (error) => {
      toast.error(`خطأ: ${error.message}`);
    },
  });
  
  // حفظ التغييرات
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
    if (formData.completionPercentage === "" || formData.completionPercentage <= 0) {
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
    
    updateMutation.mutate({
      id: paymentId,
      title: formData.title,
      description: formData.description,
      amount: totalAmount,
      dateMiladi: formData.dateMiladi,
      completionPercentage: Number(formData.completionPercentage),
    });
  };
  
  if (isPaymentLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-full min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 pb-20" dir="rtl">
        {/* Header - التحسين للشاشات الصغيرة لتجنب التصادم */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-border/40 pb-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => window.history.back()} className="h-9 w-9">
              <ArrowRight className="h-5 w-5" />
            </Button>
            <div className="text-right">
              <h1 className="text-xl sm:text-2xl font-bold text-right text-foreground">تعديل الدفعة</h1>
              <p className="text-xs sm:text-sm text-muted-foreground text-right">تعديل تفاصيل طلب الصرف / الدفعة المحددة</p>
            </div>
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            <Button onClick={handleSubmit} disabled={updateMutation.isPending} className="w-full sm:w-auto shadow-sm">
              {updateMutation.isPending ? <Loader2 className="h-4 w-4 ml-2 animate-spin" /> : <Send className="h-4 w-4 ml-2" />}
              حفظ التعديلات
            </Button>
          </div>
        </div>
        
        {/* Form Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Form */}
          <div className="lg:col-span-2 space-y-6 text-right">
            {/* بيانات الترويسة */}
            <Card className="text-right border-border/60 shadow-sm">
              <CardHeader className="bg-muted/30 border-b border-border/40 py-4 text-right">
                <CardTitle className="flex items-center gap-2 justify-start flex-row-reverse text-right text-base font-bold text-foreground">
                  <FileText className="h-5 w-5 text-primary" />
                  بيانات طلب الصرف
                </CardTitle>
                <CardDescription className="text-right">معلومات أساسية عن طلب الصرف الحالي</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 pt-6 text-right">
                <div className="space-y-2 text-right">
                  <Label className="text-right font-semibold">التاريخ الميلادي *</Label>
                  <Input
                    type="date"
                    value={formData.dateMiladi}
                    onChange={(e) => setFormData({ ...formData, dateMiladi: e.target.value })}
                    required
                    className="text-right rounded-xl h-10 border-border/60"
                  />
                </div>
                
                <div className="space-y-2 text-right">
                  <Label className="text-right font-semibold">المشروع</Label>
                  <Select
                    value={formData.projectId.toString()}
                    onValueChange={(value) => setFormData({ ...formData, projectId: parseInt(value), contractId: 0 })}
                    disabled={true}
                  >
                    <SelectTrigger className="text-right bg-muted/30 border-border/40 rounded-xl h-10" dir="rtl">
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
                    <Label className="text-right font-semibold">العقد</Label>
                    <Select
                      value={formData.contractId.toString()}
                      onValueChange={(value) => setFormData({ ...formData, contractId: parseInt(value) })}
                      disabled={true}
                    >
                      <SelectTrigger className="text-right bg-muted/30 border-border/40 rounded-xl h-10" dir="rtl">
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
                  <Label className="text-right font-semibold">عنوان طلب الصرف *</Label>
                  <Input
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="مثال: صرف الدفعة الأولى لمشروع ترميم مسجد..."
                    required
                    className="text-right rounded-xl h-10 border-border/60"
                  />
                </div>
                
                <div className="space-y-2 text-right">
                  <Label className="text-right font-semibold">وصف الأعمال التي سوف تنفذ *</Label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="وصف تفصيلي للأعمال التي سوف تنفذ..."
                    rows={3}
                    required
                    className="text-right rounded-xl border-border/60"
                  />
                </div>
                
                <div className="space-y-2 text-right">
                  <Label className="text-right font-semibold">نسبة الإنجاز (%) *</Label>
                  <Input
                    type="number"
                    min="1"
                    max="100"
                    required
                    value={formData.completionPercentage}
                    onChange={(e) => setFormData({ ...formData, completionPercentage: e.target.value === "" ? "" : parseInt(e.target.value) || 0 })}
                    className="text-right rounded-xl h-10 border-border/60"
                  />
                </div>
              </CardContent>
            </Card>
            
            {/* الموردون المستفيدون */}
            <Card className="text-right border-border/60 shadow-sm">
              <CardHeader className="bg-muted/30 border-b border-border/40 py-4 text-right">
                <div className="flex items-center justify-between flex-row-reverse">
                  <div className="text-right">
                    <CardTitle className="flex items-center gap-2 justify-start flex-row-reverse text-right text-base font-bold text-foreground">
                      <Building2 className="h-5 w-5 text-primary" />
                      معلومات المورد المستفيد
                    </CardTitle>
                    <CardDescription className="text-right">بيانات المستفيد من الصرف</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="text-right pt-6 space-y-6">
                {suppliers.map((supplier) => (
                  <div key={supplier.id} className="grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-4 p-4 rounded-xl bg-muted/5 border border-border/40" dir="rtl">
                    {/* Row 1 */}
                    {/* اسم المورد */}
                    <div className="space-y-2 text-right">
                      <Label className="font-semibold text-foreground flex items-center gap-1.5">
                        اسم المورد <span className="text-red-500">*</span>
                      </Label>
                      <Select
                        value={supplier.name}
                        onValueChange={(value) => handleSelectSupplier(supplier.id, value)}
                        disabled={formData.contractId > 0}
                      >
                        <SelectTrigger className="text-right bg-background border-border/60 rounded-xl" dir="rtl">
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
                      <Label className="font-semibold text-foreground">الأعمال</Label>
                      <Input
                        value={supplier.work}
                        onChange={(e) => updateSupplier(supplier.id, "work", e.target.value)}
                        placeholder="وصف الأعمال"
                        readOnly
                        className="bg-muted/50 border-border/40 text-right rounded-xl h-10"
                      />
                    </div>

                    {/* البنك */}
                    <div className="space-y-2 text-right">
                      <Label className="font-semibold text-foreground">البنك</Label>
                      <Input
                        value={supplier.bank}
                        onChange={(e) => updateSupplier(supplier.id, "bank", e.target.value)}
                        placeholder="اسم البنك"
                        readOnly
                        className="bg-muted/50 border-border/40 text-right rounded-xl h-10"
                      />
                    </div>

                    {/* Row 2 */}
                    {/* الآيبان */}
                    <div className="space-y-2 text-right">
                      <Label className="font-semibold text-foreground">الآيبان</Label>
                      <Input
                        value={supplier.iban}
                        onChange={(e) => updateSupplier(supplier.id, "iban", e.target.value)}
                        placeholder="SA..."
                        dir="ltr"
                        readOnly
                        className="bg-muted/50 border-border/40 text-right font-mono text-xs rounded-xl h-10"
                      />
                    </div>

                    {/* النسبة (%) */}
                    <div className="space-y-2 text-right">
                      <Label className="font-semibold text-foreground text-center block">النسبة (%)</Label>
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
                        className="text-center font-bold text-primary border-border/60 rounded-xl h-10 bg-background"
                      />
                    </div>

                    {/* المبلغ */}
                    <div className="space-y-2 text-right">
                      <Label className="font-semibold text-foreground text-center block">المبلغ *</Label>
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
                        className="text-center font-bold text-foreground border-border/60 rounded-xl h-10 bg-background"
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
                          {remainingAmount.toLocaleString()} ريال
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
