import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  FolderKanban, 
  Search, 
  ArrowRight,
  Calendar,
  DollarSign,
  Loader2,
  Plus,
  Trash2,
  Building2,
  CheckCircle2,
  Building,
  User,
  FileText,
  Sparkles,
  Layers,
  AlertTriangle,
  Check,
} from "lucide-react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Progress } from "@/components/ui/progress";

interface SelectedMosqueItem {
  mosqueId: number;
  mosqueName: string;
  city: string;
  district?: string;
  allocatedBudget: string;
  notes: string;
}

export default function NewMultiMosqueProjectPage() {
  const { user } = useAuth();
  const [, navigate] = useLocation();

  // نموذج الخطوات (Step 1 -> Step 2 -> Step 3)
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);

  // البيانات العامة
  const [projectName, setProjectName] = useState("");
  const [projectDescription, setProjectDescription] = useState("");
  const [donorName, setDonorName] = useState("");
  const [managerId, setManagerId] = useState<string>("");
  const [totalBudget, setTotalBudget] = useState("");
  const [startDate, setStartDate] = useState("");
  const [expectedEndDate, setExpectedEndDate] = useState("");

  // اختيارات المساجد
  const [mosqueSearchQuery, setMosqueSearchQuery] = useState("");
  const [selectedMosques, setSelectedMosques] = useState<SelectedMosqueItem[]>([]);

  // جلب الموظفين / مدراء المشاريع
  const { data: usersResponse, isLoading: loadingUsers } = trpc.users.getAll.useQuery({});
  const managersList = (usersResponse as any)?.items || (usersResponse as any)?.users || [];

  // جلب قائمة المساجد
  const { data: mosquesResponse, isLoading: loadingMosques } = trpc.mosques.search.useQuery({
    search: mosqueSearchQuery || undefined,
    limit: 50,
  });
  const mosquesList = mosquesResponse?.mosques || [];

  const utils = trpc.useUtils();

  // الإجراء المالي لإنشاء مشروع عدة مساجد مباشر
  const createMultiProjectMutation = trpc.projects.createMultiMosqueProject.useMutation({
    onSuccess: (res) => {
      toast.success(res.message || "تم إنشاء مشروع لعدة مساجد بنجاح");
      utils.projects.search.invalidate();
      if (res.projectId) {
        navigate(`/projects/${res.projectId}`);
      } else {
        navigate("/projects");
      }
    },
    onError: (err) => {
      toast.error(err.message || "حدث خطأ أثناء إنشاء المشروع");
    },
  });

  const handleAddMosque = (mosque: any) => {
    if (selectedMosques.some(m => m.mosqueId === mosque.id)) {
      toast.warning("هذا المسجد مضاف مسبقاً لقائمة المشروع");
      return;
    }
    setSelectedMosques(prev => [
      ...prev,
      {
        mosqueId: mosque.id,
        mosqueName: mosque.name,
        city: mosque.city || "",
        district: mosque.district || "",
        allocatedBudget: "",
        notes: "",
      }
    ]);
    toast.success(`تمت إضافة ${mosque.name} إلى القائمة`);
  };

  const handleRemoveMosque = (mosqueId: number) => {
    setSelectedMosques(prev => prev.filter(m => m.mosqueId !== mosqueId));
  };

  const handleUpdateMosqueItem = (mosqueId: number, field: "allocatedBudget" | "notes", value: string) => {
    setSelectedMosques(prev => prev.map(m => {
      if (m.mosqueId === mosqueId) {
        return { ...m, [field]: value };
      }
      return m;
    }));
  };

  const totalAllocatedBudgetsSum = selectedMosques.reduce((sum, item) => {
    const val = parseFloat(item.allocatedBudget || "0");
    return sum + (isNaN(val) ? 0 : val);
  }, 0);

  const parsedTotalBudget = parseFloat(totalBudget || "0");
  const budgetAllocationPercentage = parsedTotalBudget > 0 
    ? Math.min(100, Math.round((totalAllocatedBudgetsSum / parsedTotalBudget) * 100))
    : 0;

  const validateStep1 = () => {
    if (!projectName.trim()) {
      toast.error("يرجى إدخال اسم المشروع");
      return false;
    }
    if (!donorName.trim()) {
      toast.error("يرجى إدخال اسم المانح أو الجهة الداعمة");
      return false;
    }
    if (!totalBudget || isNaN(parsedTotalBudget) || parsedTotalBudget <= 0) {
      toast.error("يرجى إدخال ميزانية إجمالية صالحة أكبر من صفر");
      return false;
    }
    return true;
  };

  const validateStep2 = () => {
    if (selectedMosques.length === 0) {
      toast.error("يجب اختيار مسجد واحد على الأقل للمشروع المباشر");
      return false;
    }
    return true;
  };

  const handleSubmit = () => {
    if (!validateStep1() || !validateStep2()) return;

    createMultiProjectMutation.mutate({
      name: projectName.trim(),
      description: projectDescription.trim() || undefined,
      donorName: donorName.trim(),
      managerId: managerId ? parseInt(managerId) : undefined,
      budget: parsedTotalBudget,
      startDate: startDate || undefined,
      expectedEndDate: expectedEndDate || undefined,
      mosques: selectedMosques.map(m => ({
        mosqueId: m.mosqueId,
        allocatedBudget: m.allocatedBudget ? parseFloat(m.allocatedBudget) : undefined,
        notes: m.notes.trim() || undefined,
      })),
    });
  };

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-4 sm:space-y-6 animate-fade-in pb-20 px-3 sm:px-4 md:px-0" dir="rtl">
        {/* Header and Visual Step Timeline (نفس الهيدر والتصميم المعتمد في /disbursements/new-linked) */}
        <div className="flex flex-col gap-6 border-b border-border/40 pb-6">
          <div className="flex items-center justify-between pb-2">
            <div className="flex items-center gap-2 sm:gap-3">
              <Button 
                variant="outline" 
                size="icon" 
                onClick={() => {
                  if (window.history.length > 1) {
                    window.history.back();
                  } else {
                    navigate("/projects");
                  }
                }} 
                className="h-8 w-8 sm:h-9 sm:w-9 rounded-full hover:bg-muted text-muted-foreground shrink-0"
              >
                <ArrowRight className="h-4 w-4 sm:h-5 sm:w-5" />
              </Button>
              <div className="text-right">
                <div className="flex items-center gap-2">
                  <h1 className="text-lg sm:text-2xl font-bold text-foreground font-display">
                    إنشاء مشروع لعدة مساجد
                  </h1>
                  <Badge className="bg-indigo-100 text-indigo-800 border-indigo-200 font-bold px-2.5 py-0.5 text-xs">
                    مشروع مباشر
                  </Badge>
                </div>
                <p className="text-[10px] sm:text-xs text-muted-foreground text-right font-medium mt-0.5 hidden sm:block">
                  إنشاء مشروع جديد لعدة مساجد تحت مظلة مانح واحد يبدأ مباشرة من مرحلة إعداد جدول الكميات
                </p>
              </div>
            </div>
          </div>

          {/* 3-Step Timeline Header */}
          <div className="max-w-xl mx-auto w-full px-2 sm:px-4 py-2" dir="rtl">
            <div className="relative flex items-center justify-between">
              {/* Connecting Line background */}
              <div className="absolute right-0 left-0 top-1/2 -translate-y-1/2 h-0.5 bg-border rounded-full z-0" />
              {/* Connecting Active Line progress */}
              <div 
                className="absolute right-0 top-1/2 -translate-y-1/2 h-0.5 bg-primary rounded-full z-0 transition-all duration-500"
                style={{ width: currentStep === 1 ? '0%' : currentStep === 2 ? '50%' : '100%' }}
              />

              {/* Step 1 Node */}
              <button 
                type="button"
                onClick={() => setCurrentStep(1)}
                className="flex flex-col items-center gap-1.5 z-10 cursor-pointer group focus:outline-none"
              >
                <div 
                  className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs transition-all duration-300 border ${
                    currentStep >= 1 
                      ? 'bg-primary border-primary text-primary-foreground shadow-sm' 
                      : 'bg-background border-border text-muted-foreground'
                  }`}
                >
                  {currentStep > 1 ? <Check className="w-4 h-4" /> : "١"}
                </div>
                <span className={`text-xs font-semibold ${currentStep >= 1 ? 'text-primary' : 'text-muted-foreground'}`}>
                  بيانات المشروع والمانح
                </span>
              </button>

              {/* Step 2 Node */}
              <button 
                type="button"
                onClick={() => { if (validateStep1()) setCurrentStep(2); }}
                className="flex flex-col items-center gap-1.5 z-10 cursor-pointer group focus:outline-none"
              >
                <div 
                  className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs transition-all duration-300 border ${
                    currentStep >= 2 
                      ? 'bg-primary border-primary text-primary-foreground shadow-sm' 
                      : 'bg-background border-border text-muted-foreground'
                  }`}
                >
                  {currentStep > 2 ? <Check className="w-4 h-4" /> : "٢"}
                </div>
                <span className={`text-xs font-semibold ${currentStep >= 2 ? 'text-primary' : 'text-muted-foreground'}`}>
                  المساجد والاشتراطات
                </span>
              </button>

              {/* Step 3 Node */}
              <button 
                type="button"
                onClick={() => { if (validateStep1() && validateStep2()) setCurrentStep(3); }}
                className="flex flex-col items-center gap-1.5 z-10 cursor-pointer group focus:outline-none"
              >
                <div 
                  className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs transition-all duration-300 border ${
                    currentStep === 3 
                      ? 'bg-primary border-primary text-primary-foreground shadow-sm' 
                      : 'bg-background border-border text-muted-foreground'
                  }`}
                >
                  ٣
                </div>
                <span className={`text-xs font-semibold ${currentStep === 3 ? 'text-primary' : 'text-muted-foreground'}`}>
                  المراجعة والاعتماد
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* المحتوى حسب الخطوات بنفس التصميم المعتمد كروت rounded-xl */}
        {currentStep === 1 && (
          <div className="space-y-6">
            <Card className="border-border/60 shadow-sm rounded-xl overflow-hidden bg-white dark:bg-slate-900">
              <CardHeader className="bg-muted/30 border-b border-border/40 py-4 text-right">
                <CardTitle className="flex items-center gap-2 text-foreground text-base font-bold">
                  <FolderKanban className="h-4.5 w-4.5 text-primary" />
                  الخطوة 1: البيانات العامة للمشروع والمانح
                </CardTitle>
                <CardDescription className="text-right text-xs text-muted-foreground">
                  أدخل المعلومات الأساسية للمشروع واسم المانح والميزانية الإجمالية التقديرية
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6 pt-6 text-right">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      اسم المشروع *
                    </Label>
                    <Input
                      placeholder="مثال: مشروع صيانة وتكييف مساجد المنطقة الشرقية - الدفعة الأولى"
                      value={projectName}
                      onChange={(e) => setProjectName(e.target.value)}
                      className="h-10 rounded-xl"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      اسم المانح / الجهة الداعمة *
                    </Label>
                    <Input
                      placeholder="مثال: أوقاف الشيخ فهد العتيبي / مؤسسة الراجحي الخيرية"
                      value={donorName}
                      onChange={(e) => setDonorName(e.target.value)}
                      className="h-10 rounded-xl"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      الميزانية الإجمالية للمشروع (ريال) *
                    </Label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        type="number"
                        placeholder="مثال: 500000"
                        value={totalBudget}
                        onChange={(e) => setTotalBudget(e.target.value)}
                        className="h-10 rounded-xl pl-10 font-bold"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      مدير المشروع (اختياري)
                    </Label>
                    <Select value={managerId} onValueChange={setManagerId}>
                      <SelectTrigger className="h-10 rounded-xl">
                        <SelectValue placeholder="اختر مدير المشروع من الموظفين..." />
                      </SelectTrigger>
                      <SelectContent>
                        {managersList.map((m: any) => (
                          <SelectItem key={m.id} value={m.id.toString()}>
                            {m.name} ({m.role || "موظف"})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">تاريخ البدء المخطط</Label>
                    <Input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="h-10 rounded-xl"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">تاريخ الانتهاء المتوقع</Label>
                    <Input
                      type="date"
                      value={expectedEndDate}
                      onChange={(e) => setExpectedEndDate(e.target.value)}
                      className="h-10 rounded-xl"
                    />
                  </div>

                  <div className="col-span-1 md:col-span-2 space-y-2">
                    <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">وصف المشروع ونطاق العمل الإجمالي</Label>
                    <Textarea
                      rows={3}
                      placeholder="ادخل وصفاً شاملاً لنطاق الأعمال المطلوبة وااشتراطات التنفيذ للمساجد المشمولة..."
                      value={projectDescription}
                      onChange={(e) => setProjectDescription(e.target.value)}
                      className="rounded-xl"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-4 border-t border-border/40">
                  <Button
                    onClick={() => {
                      if (validateStep1()) setCurrentStep(2);
                    }}
                    className="gradient-primary text-white font-bold px-8 h-10 rounded-xl gap-2"
                  >
                    <span>التالي: اختيار المساجد والاشتراطات</span>
                    <ArrowRight className="w-4 h-4 rotate-180" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {currentStep === 2 && (
          <div className="space-y-6">
            <Card className="border-border/60 shadow-sm rounded-xl overflow-hidden bg-white dark:bg-slate-900">
              <CardHeader className="bg-muted/30 border-b border-border/40 py-4 text-right flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2 text-foreground text-base font-bold">
                    <Building2 className="h-4.5 w-4.5 text-primary" />
                    الخطوة 2: المساجد المشمولة بالمشروع
                  </CardTitle>
                  <CardDescription className="text-right text-xs text-muted-foreground">
                    ابحث عن المساجد بالنظام وقم بتحديد الميزانية المخصصة والاشتراطات الخاصة لكل مسجد
                  </CardDescription>
                </div>
                <Badge className="bg-primary/10 text-primary border-primary/20 font-bold px-3 py-1 text-xs">
                  {selectedMosques.length} مساجد محددة
                </Badge>
              </CardHeader>
              <CardContent className="space-y-6 pt-6 text-right">
                {/* شريط توزيع الميزانية */}
                <div className="p-4 rounded-xl bg-primary/5 border border-primary/20 space-y-2">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs sm:text-sm gap-2">
                    <div>
                      <span className="text-muted-foreground">الميزانية الإجمالية للمشروع: </span>
                      <span className="font-bold text-foreground mr-1">{parsedTotalBudget.toLocaleString()} ريال</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">إجمالي المخصص للمساجد: </span>
                      <span className="font-bold text-primary text-sm sm:text-base mr-1">{totalAllocatedBudgetsSum.toLocaleString()} ريال</span>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px] text-muted-foreground">
                      <span>نسبة التخصيص للمساجد</span>
                      <span>{budgetAllocationPercentage}%</span>
                    </div>
                    <Progress value={budgetAllocationPercentage} className="h-2" />
                  </div>
                </div>

                {/* البحث عن مساجد */}
                <div className="space-y-3 bg-muted/30 p-4 rounded-xl border border-border/40">
                  <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">ابحث عن مسجد لإضافته لمظلة المشروع:</Label>
                  <div className="relative">
                    <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="ادخل اسم المسجد أو المدينة أو اسم الحي للبحث..."
                      value={mosqueSearchQuery}
                      onChange={(e) => setMosqueSearchQuery(e.target.value)}
                      className="pr-9 h-10 rounded-xl bg-background"
                    />
                  </div>

                  {loadingMosques ? (
                    <div className="text-center py-6">
                      <Loader2 className="w-6 h-6 animate-spin mx-auto text-primary" />
                      <p className="text-xs text-muted-foreground mt-2">جاري البحث في قاعدة بيانات المساجد...</p>
                    </div>
                  ) : mosquesList.length > 0 ? (
                    <div className="max-h-52 overflow-y-auto divide-y border rounded-xl bg-background text-sm">
                      {mosquesList.map((m: any) => {
                        const isAdded = selectedMosques.some(item => item.mosqueId === m.id);
                        return (
                          <div key={m.id} className="p-3 flex items-center justify-between hover:bg-muted/40 transition-colors">
                            <div className="flex items-center gap-3">
                              <Building className="w-5 h-5 text-primary/70 shrink-0" />
                              <div>
                                <span className="font-bold text-foreground">{m.name}</span>
                                <span className="text-muted-foreground text-xs mr-2">
                                  ({m.city || "مدينة غير محددة"}{m.district ? ` - ${m.district}` : ""})
                                </span>
                              </div>
                            </div>
                            <Button
                              size="sm"
                              variant={isAdded ? "outline" : "default"}
                              disabled={isAdded}
                              onClick={() => handleAddMosque(m)}
                              className="h-8 text-xs px-3 rounded-lg font-bold"
                            >
                              {isAdded ? (
                                <span className="text-green-600 flex items-center gap-1">
                                  <CheckCircle2 className="w-3.5 h-3.5" /> مضاف للمشروع
                                </span>
                              ) : (
                                <span className="flex items-center gap-1">
                                  <Plus className="w-3.5 h-3.5" /> إضافة للمشروع
                                </span>
                              )}
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground text-center py-4">لم يتم العثور على مساجد مطابقة للبحث</p>
                  )}
                </div>

                {/* قائمة المساجد المختارة */}
                <div className="space-y-4">
                  <h4 className="font-bold text-sm text-foreground flex items-center gap-2">
                    <Layers className="w-4 h-4 text-primary" />
                    المساجد المضافة ({selectedMosques.length})
                  </h4>

                  {selectedMosques.length > 0 ? (
                    <div className="space-y-3">
                      {selectedMosques.map((item, idx) => (
                        <Card key={item.mosqueId} className="border border-border/60 shadow-xs rounded-xl overflow-hidden">
                          <CardContent className="p-4 space-y-3">
                            <div className="flex items-center justify-between border-b border-border/40 pb-2.5">
                              <div className="flex items-center gap-2.5">
                                <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center">
                                  {idx + 1}
                                </span>
                                <div>
                                  <h5 className="font-bold text-foreground text-sm">{item.mosqueName}</h5>
                                  <p className="text-[11px] text-muted-foreground">{item.city} {item.district ? `- ${item.district}` : ""}</p>
                                </div>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleRemoveMosque(item.mosqueId)}
                                className="text-destructive hover:bg-destructive/10 h-7 px-2.5 rounded-lg text-xs"
                              >
                                <Trash2 className="w-3.5 h-3.5 ml-1" />
                                حذف
                              </Button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                              <div className="space-y-1">
                                <Label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">الميزانية المخصصة لهذا المسجد (ريال):</Label>
                                <Input
                                  type="number"
                                  placeholder="مثال: 120000"
                                  value={item.allocatedBudget}
                                  onChange={(e) => handleUpdateMosqueItem(item.mosqueId, "allocatedBudget", e.target.value)}
                                  className="h-9 rounded-lg font-bold"
                                />
                              </div>
                              <div className="space-y-1">
                                <Label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">اشتراطات وملاحظات الأعمال المخصصة:</Label>
                                <Input
                                  placeholder="مثال: صيانة التكييف المركزي وإصلاح الإنارة..."
                                  value={item.notes}
                                  onChange={(e) => handleUpdateMosqueItem(item.mosqueId, "notes", e.target.value)}
                                  className="h-9 rounded-lg text-xs"
                                />
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 border-2 border-dashed rounded-xl bg-muted/10">
                      <Building className="w-10 h-10 text-muted-foreground/40 mx-auto mb-2" />
                      <p className="font-bold text-xs text-foreground">لم تقم بإضافة أي مسجد بعد</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">استخدم شريط البحث أعلاه لاختيار المساجد وتخصيص الميزانية لها.</p>
                    </div>
                  )}
                </div>

                <div className="flex justify-between pt-4 border-t border-border/40">
                  <Button
                    variant="outline"
                    onClick={() => setCurrentStep(1)}
                    className="h-10 px-6 rounded-xl"
                  >
                    السابق
                  </Button>
                  <Button
                    onClick={() => {
                      if (validateStep2()) setCurrentStep(3);
                    }}
                    className="gradient-primary text-white font-bold px-8 h-10 rounded-xl gap-2"
                  >
                    <span>التالي: المراجعة والاعتماد</span>
                    <ArrowRight className="w-4 h-4 rotate-180" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {currentStep === 3 && (
          <div className="space-y-6">
            <Card className="border-border/60 shadow-sm rounded-xl overflow-hidden bg-white dark:bg-slate-900">
              <CardHeader className="bg-muted/30 border-b border-border/40 py-4 text-right">
                <CardTitle className="flex items-center gap-2 text-foreground text-base font-bold">
                  <Sparkles className="h-4.5 w-4.5 text-primary" />
                  الخطوة 3: مراجعة واعتماد المشروع
                </CardTitle>
                <CardDescription className="text-right text-xs text-muted-foreground">
                  راجع ملخص البيانات المخصصة قبل الإنشاء وبدء مرحلة إعداد جدول الكميات
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-6 pt-6 text-right">
                {/* ملخص البيانات */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl bg-muted/30 border border-border/40 space-y-3">
                    <h4 className="font-bold text-xs text-primary flex items-center gap-2">
                      <FolderKanban className="w-4 h-4" /> البيانات العامة
                    </h4>
                    <div className="space-y-1.5 text-xs">
                      <p><span className="text-muted-foreground">اسم المشروع:</span> <span className="font-bold">{projectName}</span></p>
                      <p><span className="text-muted-foreground">اسم المانح:</span> <span className="font-bold text-primary">{donorName}</span></p>
                      <p><span className="text-muted-foreground">الميزانية الإجمالية:</span> <span className="font-bold text-emerald-700">{parsedTotalBudget.toLocaleString()} ريال</span></p>
                      {projectDescription && <p><span className="text-muted-foreground">الوصف:</span> <span>{projectDescription}</span></p>}
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-muted/30 border border-border/40 space-y-3">
                    <h4 className="font-bold text-xs text-primary flex items-center gap-2">
                      <Building2 className="w-4 h-4" /> ملخص المساجد المشمولة
                    </h4>
                    <div className="space-y-1.5 text-xs">
                      <p><span className="text-muted-foreground">عدد المساجد:</span> <span className="font-bold">{selectedMosques.length} مساجد</span></p>
                      <p><span className="text-muted-foreground">إجمالي المخصص للمساجد:</span> <span className="font-bold">{totalAllocatedBudgetsSum.toLocaleString()} ريال</span></p>
                      <p><span className="text-muted-foreground">المرحلة الابتدائية للمشروع:</span> <Badge className="bg-yellow-100 text-yellow-800 font-bold">إعداد جدول الكميات (مباشر)</Badge></p>
                    </div>
                  </div>
                </div>

                {/* قائمة المساجد للمراجعة */}
                <div className="space-y-2 border border-border/40 rounded-xl overflow-hidden">
                  <div className="bg-muted/40 p-3 font-bold text-xs">قائمة المساجد والميزانيات المخصصة:</div>
                  <div className="divide-y divide-border/40 max-h-60 overflow-y-auto">
                    {selectedMosques.map((item, idx) => (
                      <div key={item.mosqueId} className="p-3 flex items-center justify-between text-xs">
                        <div>
                          <span className="font-bold ml-2">{idx + 1}. {item.mosqueName}</span>
                          <span className="text-muted-foreground">({item.city})</span>
                        </div>
                        <div className="font-bold text-primary">
                          {item.allocatedBudget ? `${parseFloat(item.allocatedBudget).toLocaleString()} ريال` : "غير محددة"}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex justify-between pt-4 border-t border-border/40">
                  <Button
                    variant="outline"
                    onClick={() => setCurrentStep(2)}
                    disabled={createMultiProjectMutation.isPending}
                    className="h-10 px-6 rounded-xl"
                  >
                    السابق
                  </Button>

                  <Button
                    onClick={handleSubmit}
                    disabled={createMultiProjectMutation.isPending}
                    className="gradient-primary text-white font-bold px-8 h-10 rounded-xl gap-2"
                  >
                    {createMultiProjectMutation.isPending ? (
                      <>
                        <Loader2 className="w-4.5 h-4.5 animate-spin" />
                        جاري إنشاء المشروع...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4.5 h-4.5" />
                        تاكيد وإعتماد إنشاء المشروع المباشر
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
