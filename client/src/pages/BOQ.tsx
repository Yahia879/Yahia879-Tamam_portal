import { useState, useEffect } from "react";
import { useLocation, useParams } from "wouter";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import {
  Calculator,
  Search,
  Plus,
  Eye,
  Edit,
  Trash2,
  FileText,
  Loader2,
  Building2,
  Upload,
  Download,
  FileSpreadsheet,
} from "lucide-react";

// تصنيفات البنود
const ITEM_CATEGORIES = [
  { value: "construction", label: "أعمال إنشائية" },
  { value: "electrical", label: "أعمال كهربائية" },
  { value: "plumbing", label: "أعمال سباكة" },
  { value: "hvac", label: "تكييف وتبريد" },
  { value: "finishing", label: "تشطيبات" },
  { value: "carpentry", label: "نجارة" },
  { value: "painting", label: "دهانات" },
  { value: "flooring", label: "أرضيات" },
  { value: "other", label: "أخرى" },
];

// وحدات القياس
const UNITS = [
  { value: "m2", label: "متر مربع" },
  { value: "m3", label: "متر مكعب" },
  { value: "m", label: "متر طولي" },
  { value: "unit", label: "وحدة" },
  { value: "kg", label: "كيلوجرام" },
  { value: "ton", label: "طن" },
  { value: "lump_sum", label: "مقطوعية" },
];

export default function BOQ() {
  const [, navigate] = useLocation();
  const params = useParams();
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [filterProgram, setFilterProgram] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [selectedRequestId, setSelectedRequestId] = useState<string>(params.requestId || "");
  
  // تعيين requestId من URL عند تحميل الصفحة
  useEffect(() => {
    if (params.requestId) {
      setSelectedRequestId(params.requestId);
    }
  }, [params.requestId]);
  
  // حالة النموذج
  const [formData, setFormData] = useState({
    category: "",
    itemName: "",
    description: "",
    unit: "",
    quantity: "",
    unitPrice: "",
  });

  // جلب الطلبات في مرحلة التقييم المالي
  const { data: requests } = trpc.requests.search.useQuery({
    currentStage: "financial_eval_and_approval",
  });

  // جلب جداول الكميات
  const { data: boqResult, isLoading, refetch } = trpc.projects.getBOQ.useQuery(
    { requestId: parseInt(selectedRequestId) || 0 },
    { enabled: !!selectedRequestId }
  );
  const boqData = boqResult?.items || [];

  // إضافة بند
  const addItemMutation = trpc.projects.addBOQItem.useMutation({
    onSuccess: () => {
      toast.success("تم إضافة البند بنجاح");
      setShowAddDialog(false);
      resetForm();
      refetch();
    },
    onError: (error: any) => {
      toast.error(error.message || "حدث خطأ أثناء إضافة البند");
    },
  });

  // تعديل بند
  const updateItemMutation = trpc.projects.updateBOQItem.useMutation({
    onSuccess: () => {
      toast.success("تم تعديل البند بنجاح");
      setShowEditDialog(false);
      setSelectedItem(null);
      resetForm();
      refetch();
    },
    onError: (error: any) => {
      toast.error(error.message || "حدث خطأ أثناء تعديل البند");
    },
  });

  // حذف بند
  const deleteItemMutation = trpc.projects.deleteBOQItem.useMutation({
    onSuccess: () => {
      toast.success("تم حذف البند بنجاح");
      refetch();
    },
    onError: (error: any) => {
      toast.error(error.message || "حدث خطأ أثناء حذف البند");
    },
  });

  // إنهاء إعداد جدول الكميات والانتقال للمرحلة التالية
  const completeBOQMutation = trpc.requests.updateStage.useMutation({
    onSuccess: () => {
      toast.success("تم إنهاء إعداد جدول الكميات بنجاح");
      navigate(`/requests/${selectedRequestId}`);
    },
    onError: (error: any) => {
      toast.error(error.message || "حدث خطأ أثناء الانتقال للمرحلة التالية");
    },
  });

  const resetForm = () => {
    setFormData({
      category: "",
      itemName: "",
      description: "",
      unit: "",
      quantity: "",
      unitPrice: "",
    });
  };

  const handleAddItem = () => {
    if (!selectedRequestId) {
      toast.error("يرجى اختيار الطلب أولاً");
      return;
    }
    if (!formData.itemName || !formData.unit || !formData.quantity) {
      toast.error("يرجى ملء جميع الحقول المطلوبة");
      return;
    }
    addItemMutation.mutate({
      requestId: parseInt(selectedRequestId),
      itemName: formData.itemName,
      itemDescription: formData.description,
      unit: formData.unit,
      quantity: parseFloat(formData.quantity),
      unitPrice: formData.unitPrice ? parseFloat(formData.unitPrice) : 0,
      category: formData.category,
    });
  };

  const handleEditItem = () => {
    if (!selectedItem) return;
    updateItemMutation.mutate({
      id: selectedItem.id,
      category: formData.category,
      itemName: formData.itemName,
      itemDescription: formData.description,
      unit: formData.unit,
      quantity: parseFloat(formData.quantity),
      unitPrice: parseFloat(formData.unitPrice),
    });
  };

  const handleDeleteItem = (id: number) => {
    deleteItemMutation.mutate({ id });
  };

  const openEditDialog = (item: any) => {
    setSelectedItem(item);
    setFormData({
      category: item.category || "",
      itemName: item.itemName || "",
      description: item.description || "",
      unit: item.unit || "",
      quantity: item.quantity?.toString() || "",
      unitPrice: item.unitPrice?.toString() || "",
    });
    setShowEditDialog(true);
  };

  // حساب الإجمالي
  const totalAmount = boqResult?.total || 0;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* العنوان */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">جداول الكميات (BOQ)</h1>
            <p className="text-muted-foreground">إدارة جداول الكميات للطلبات والمشاريع</p>
          </div>
        </div>

        {/* اختيار الطلب */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              اختيار الطلب
            </CardTitle>
            <CardDescription>اختر الطلب لعرض أو إنشاء جدول الكميات</CardDescription>
          </CardHeader>
          <CardContent>
            {/* فلاتر البحث */}
            <div className="flex flex-wrap gap-4 mb-6">
              <div className="flex-1 min-w-[200px]">
                <Label className="mb-2 block">البحث</Label>
                <Input
                  placeholder="ابحث برقم الطلب أو اسم المسجد..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full"
                />
              </div>
              <div className="w-[180px]">
                <Label className="mb-2 block">البرنامج</Label>
                <Select value={filterProgram} onValueChange={setFilterProgram}>
                  <SelectTrigger>
                    <SelectValue placeholder="جميع البرامج" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">جميع البرامج</SelectItem>
                    <SelectItem value="bunyaan">بنيان</SelectItem>
                    <SelectItem value="suqya">سقيا</SelectItem>
                    <SelectItem value="daaem">دعائم</SelectItem>
                    <SelectItem value="takyeef">تكييف</SelectItem>
                    <SelectItem value="tawasul">تواصل</SelectItem>
                    <SelectItem value="tatweer">تطوير</SelectItem>
                    <SelectItem value="noor">نور</SelectItem>
                    <SelectItem value="itar">إطار</SelectItem>
                    <SelectItem value="amn">أمن</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="w-[180px]">
                <Label className="mb-2 block">الحالة</Label>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger>
                    <SelectValue placeholder="جميع الحالات" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">جميع الحالات</SelectItem>
                    <SelectItem value="pending">قيد الانتظار</SelectItem>
                    <SelectItem value="in_progress">قيد التنفيذ</SelectItem>
                    <SelectItem value="completed">مكتمل</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* قائمة الطلبات كبطاقات */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
              {requests?.requests?.filter((request: any) => {
                // فلتر البحث
                const matchesSearch = !searchQuery || 
                  request.requestNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  request.mosqueName?.toLowerCase().includes(searchQuery.toLowerCase());
                
                // فلتر البرنامج
                const matchesProgram = filterProgram === "all" || request.programType === filterProgram;
                
                // فلتر الحالة
                const matchesStatus = filterStatus === "all" || request.status === filterStatus;
                
                return matchesSearch && matchesProgram && matchesStatus;
              }).map((request: any) => (
                <div
                  key={request.id}
                  onClick={() => setSelectedRequestId(request.id.toString())}
                  className={`p-4 rounded-lg border-2 cursor-pointer transition-all hover:shadow-md ${
                    selectedRequestId === request.id.toString()
                      ? "border-primary bg-primary/5 shadow-md"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="font-semibold text-sm text-primary">{request.requestNumber}</div>
                      <div className="text-base font-medium mt-1">{request.mosqueName || "طلب جديد"}</div>
                      {request.mosqueCity && (
                        <div className="text-sm text-muted-foreground mt-1">{request.mosqueCity}</div>
                      )}
                    </div>
                    {selectedRequestId === request.id.toString() && (
                      <div className="p-1 bg-primary rounded-full">
                        <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
            
            {/* أزرار الإجراءات */}
            <div className="flex gap-4 items-end">
              {selectedRequestId && (
                <div className="flex gap-2">
                  <Button onClick={() => setShowAddDialog(true)}>
                    <Plus className="h-4 w-4 ml-2" />
                    إضافة بند
                  </Button>
                  {/* زر تحميل قالب Excel */}
                  <Button
                    variant="outline"
                    onClick={() => {
                      const headers = ["التصنيف", "اسم البند", "الوصف", "الوحدة", "الكمية", "سعر الوحدة"];
                      const example = [
                        "electrical", "استبدال الإنارة", "استبدال كامل للإنارة الداخلية", "unit", "100", "50"
                      ];
                      const csvContent = [headers, example]
                        .map(row => row.join("\t"))
                        .join("\n");
                      const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
                      const url = URL.createObjectURL(blob);
                      const link = document.createElement("a");
                      link.href = url;
                      link.download = "قالب_جدول_الكميات.csv";
                      link.click();
                      URL.revokeObjectURL(url);
                      toast.success("تم تحميل القالب - التصنيفات: construction, electrical, plumbing, hvac, finishing, carpentry, painting, flooring, other | الوحدات: m2, m3, m, unit, kg, ton, lump_sum");
                    }}
                  >
                    <Download className="h-4 w-4 ml-2" />
                    تحميل قالب
                  </Button>
                  {/* زر استيراد من Excel */}
                  <div className="relative">
                    <input
                      type="file"
                      accept=".csv,.xlsx,.xls"
                      className="absolute inset-0 opacity-0 cursor-pointer"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        
                        const reader = new FileReader();
                        reader.onload = async (event) => {
                          try {
                            const text = event.target?.result as string;
                            const lines = text.split("\n").filter(line => line.trim());
                            if (lines.length < 2) {
                              toast.error("الملف فارغ أو لا يحتوي على بيانات");
                              return;
                            }
                            
                            const dataLines = lines.slice(1);
                            let addedCount = 0;
                            let errorCount = 0;
                            
                            for (const line of dataLines) {
                              const cols = line.split(/[\t,]/);
                              if (cols.length >= 5) {
                                const category = cols[0]?.trim() || "other";
                                const itemName = cols[1]?.trim();
                                const description = cols[2]?.trim() || "";
                                const unit = cols[3]?.trim() || "unit";
                                const quantity = parseFloat(cols[4]?.trim().replace(/[^\d.]/g, "")) || 0;
                                const unitPrice = parseFloat(cols[5]?.trim().replace(/[^\d.]/g, "")) || 0;
                                
                                if (itemName && quantity > 0) {
                                  try {
                                    await addItemMutation.mutateAsync({
                                      requestId: parseInt(selectedRequestId),
                                      itemName,
                                      itemDescription: description,
                                      unit,
                                      quantity,
                                      unitPrice,
                                      category,
                                    });
                                    addedCount++;
                                  } catch {
                                    errorCount++;
                                  }
                                }
                              }
                            }
                            
                            if (addedCount > 0) {
                              toast.success(`تم استيراد ${addedCount} بند بنجاح`);
                              refetch();
                            }
                            if (errorCount > 0) {
                              toast.error(`فشل استيراد ${errorCount} بند`);
                            }
                          } catch (err) {
                            toast.error("حدث خطأ أثناء قراءة الملف");
                          }
                        };
                        reader.readAsText(file);
                        e.target.value = "";
                      }}
                    />
                    <Button variant="default">
                      <Upload className="h-4 w-4 ml-2" />
                      استيراد من Excel
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* جدول الكميات */}
        {selectedRequestId && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calculator className="h-5 w-5" />
                بنود جدول الكميات
              </CardTitle>
              <CardDescription>
                إجمالي التكلفة: {totalAmount.toLocaleString("ar-SA")} ريال
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : boqData && boqData.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>التصنيف</TableHead>
                      <TableHead>البند</TableHead>
                      <TableHead>الوحدة</TableHead>
                      <TableHead>الكمية</TableHead>
                      <TableHead>سعر الوحدة</TableHead>
                      <TableHead>الإجمالي</TableHead>
                      <TableHead>الإجراءات</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {boqData.map((item: any) => (
                      <TableRow key={item.id}>
                        <TableCell>
                          <Badge variant="outline">
                            {ITEM_CATEGORIES.find(c => c.value === item.category)?.label || item.category}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{item.itemName}</p>
                            {item.description && (
                              <p className="text-sm text-muted-foreground">{item.description}</p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {UNITS.find(u => u.value === item.unit)?.label || item.unit}
                        </TableCell>
                        <TableCell>{parseFloat(item.quantity).toLocaleString("ar-SA")}</TableCell>
                        <TableCell>{parseFloat(item.unitPrice).toLocaleString("ar-SA")} ريال</TableCell>
                        <TableCell className="font-medium">
                          {(parseFloat(item.quantity) * parseFloat(item.unitPrice)).toLocaleString("ar-SA")} ريال
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openEditDialog(item)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteItem(item.id)}
                            >
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Calculator className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>لا توجد بنود في جدول الكميات</p>
                  <Button
                    variant="outline"
                    className="mt-4"
                    onClick={() => setShowAddDialog(true)}
                  >
                    <Plus className="h-4 w-4 ml-2" />
                    إضافة أول بند
                  </Button>
                </div>
              )}
              
              {/* زر إنهاء إعداد جدول الكميات */}
              {boqData && boqData.length > 0 && (
                <div className="mt-6 pt-6 border-t flex justify-between items-center">
                  <div>
                    <p className="text-sm text-muted-foreground">
                      عدد البنود: {boqData.length}
                    </p>
                    <p className="text-lg font-bold text-primary">
                      الإجمالي: {totalAmount.toLocaleString("ar-SA")} ريال
                    </p>
                  </div>
                  <Button
                    size="lg"
                    onClick={() => {
                        completeBOQMutation.mutate({
                          requestId: parseInt(selectedRequestId),
                          newStage: "financial_eval_and_approval",
                          notes: "تم إنهاء إعداد جدول الكميات",
                        });
                    }}
                    disabled={completeBOQMutation.isPending}
                    className="gap-2"
                  >
                    {completeBOQMutation.isPending ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <FileText className="h-5 w-5" />
                    )}
                    إنهاء إعداد جدول الكميات
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Dialog إضافة بند */}
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>إضافة بند جديد</DialogTitle>
              <DialogDescription>أدخل تفاصيل البند المراد إضافته لجدول الكميات</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>التصنيف</Label>
                <Select
                  value={formData.category}
                  onValueChange={(value) => setFormData({ ...formData, category: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="اختر التصنيف..." />
                  </SelectTrigger>
                  <SelectContent>
                    {ITEM_CATEGORIES.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>اسم البند</Label>
                <Input
                  value={formData.itemName}
                  onChange={(e) => setFormData({ ...formData, itemName: e.target.value })}
                  placeholder="مثال: بلاط سيراميك"
                />
              </div>
              <div>
                <Label>الوصف (اختياري)</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="وصف تفصيلي للبند..."
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>الوحدة</Label>
                  <Select
                    value={formData.unit}
                    onValueChange={(value) => setFormData({ ...formData, unit: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="اختر..." />
                    </SelectTrigger>
                    <SelectContent>
                      {UNITS.map((unit) => (
                        <SelectItem key={unit.value} value={unit.value}>
                          {unit.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>الكمية</Label>
                  <Input
                    type="number"
                    value={formData.quantity}
                    onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                    placeholder="0"
                  />
                </div>
              </div>
              <div>
                <Label>سعر الوحدة (ريال)</Label>
                <Input
                  type="number"
                  value={formData.unitPrice}
                  onChange={(e) => setFormData({ ...formData, unitPrice: e.target.value })}
                  placeholder="0"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAddDialog(false)}>
                إلغاء
              </Button>
              <Button onClick={handleAddItem} disabled={addItemMutation.isPending}>
                {addItemMutation.isPending && <Loader2 className="h-4 w-4 ml-2 animate-spin" />}
                إضافة
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Dialog تعديل بند */}
        <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>تعديل البند</DialogTitle>
              <DialogDescription>تعديل تفاصيل البند</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>التصنيف</Label>
                <Select
                  value={formData.category}
                  onValueChange={(value) => setFormData({ ...formData, category: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="اختر التصنيف..." />
                  </SelectTrigger>
                  <SelectContent>
                    {ITEM_CATEGORIES.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>اسم البند</Label>
                <Input
                  value={formData.itemName}
                  onChange={(e) => setFormData({ ...formData, itemName: e.target.value })}
                />
              </div>
              <div>
                <Label>الوصف (اختياري)</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>الوحدة</Label>
                  <Select
                    value={formData.unit}
                    onValueChange={(value) => setFormData({ ...formData, unit: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {UNITS.map((unit) => (
                        <SelectItem key={unit.value} value={unit.value}>
                          {unit.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>الكمية</Label>
                  <Input
                    type="number"
                    value={formData.quantity}
                    onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <Label>سعر الوحدة (ريال)</Label>
                <Input
                  type="number"
                  value={formData.unitPrice}
                  onChange={(e) => setFormData({ ...formData, unitPrice: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowEditDialog(false)}>
                إلغاء
              </Button>
              <Button onClick={handleEditItem} disabled={updateItemMutation.isPending}>
                {updateItemMutation.isPending && <Loader2 className="h-4 w-4 ml-2 animate-spin" />}
                حفظ التعديلات
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
