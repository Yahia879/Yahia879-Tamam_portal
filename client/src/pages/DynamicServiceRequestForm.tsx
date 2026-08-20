import React, { useState, useMemo } from 'react';
import { useLocation, Link } from 'wouter';
import { useAuth } from '@/_core/hooks/useAuth';
import { trpc } from '@/lib/trpc';
import BeneficiaryLayout from '@/components/BeneficiaryLayout';
import { 
  getAllFieldsForProgram,
  getVisibleFieldsForProgram,
} from '@/lib/programFields';
import { 
  validateAllFields, 
  hasErrors,
} from '@/lib/formValidation';
import { ConditionalField } from '@/components/DynamicForm/ConditionalField';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { 
  CheckCircle2, 
  AlertCircle, 
  ChevronRight, 
  ChevronLeft, 
  Plus, 
  Loader2, 
  Paperclip,
  Building2,
  Tag, 
  Hammer, 
  Wrench, 
  Package, 
  Receipt, 
  Sparkles, 
  Sun, 
  Droplets, 
  GlassWater,
  Info,
  ArrowRight,
  Users,
  Ruler,
  Trash2,
  UploadCloud,
  Printer,
} from 'lucide-react';

function toHijriDate(date: Date): string {
  const gregorianYear = date.getFullYear();
  const gregorianMonth = date.getMonth() + 1;
  const gregorianDay = date.getDate();
  
  const hijriYear = Math.floor((gregorianYear - 622) * (33 / 32));
  const hijriMonth = ((gregorianMonth + 9) % 12) + 1;
  const hijriDay = gregorianDay;
  
  return `${hijriDay}/${hijriMonth}/${hijriYear} هـ`;
}

function formatGregorianDate(date: Date): string {
  return `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()} م`;
}

const ICON_MAP: Record<string, any> = {
  Building2, Hammer, Wrench, Package, Receipt, Sparkles, Sun, Droplets, GlassWater,
};

type Step = 'service-selection' | 'terms' | 'requester-info' | 'details' | 'review';

const STEPS: { key: Step; label: string; order: number }[] = [
  { key: 'service-selection', label: 'اختيار الخدمة', order: 1 },
  { key: 'terms', label: 'الشروط والأحكام', order: 2 },
  { key: 'requester-info', label: 'بيانات مقدم الطلب', order: 3 },
  { key: 'details', label: 'تفاصيل الطلب', order: 4 },
  { key: 'review', label: 'المراجعة والإرسال', order: 5 },
];

const parseConditions = (conditions: any): string[] => {
  if (!conditions) return [];
  if (Array.isArray(conditions)) return conditions;
  if (typeof conditions === 'string') {
    try {
      const parsed = JSON.parse(conditions);
      if (Array.isArray(parsed)) return parsed as string[];
    } catch (e) {
      if (conditions.trim()) return [conditions.trim()];
    }
  }
  return [];
};

export const DynamicServiceRequestForm: React.FC<{ showLayout?: boolean }> = ({ showLayout = true }) => {
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const { data: orgSettings } = trpc.organization.getSettings.useQuery();

  // الحصول على طلبات المستخدم للتحقق من الإمام
  const { data: myRequests = [], isLoading: myRequestsLoading } = trpc.requests.getMyRequests.useQuery(undefined, {
    enabled: !!user && user.role === "service_requester" && user.requesterType === "imam"
  });

  // الحصول على أحدث طلب استثناء للمستخدم
  const { data: exceptionStatus, isLoading: exceptionStatusLoading, refetch: refetchException } = trpc.requests.getLatestException.useQuery(undefined, {
    enabled: !!user && user.role === "service_requester" && user.requesterType === "imam"
  });

  const isImamBlocked = useMemo(() => {
    if (user?.role !== "service_requester" || user?.requesterType !== "imam") return false;
    if (myRequests.length === 0) return false;
    const latestRequest = myRequests[0];
    if (latestRequest.status === "completed" || latestRequest.status === "rejected") return false;

    // التحقق من وجود استثناء معتمد تم إنشاؤه بعد الطلب الأخير
    if (exceptionStatus && exceptionStatus.status === "approved") {
      const exceptionDate = new Date(exceptionStatus.createdAt);
      const requestDate = new Date(latestRequest.createdAt);
      if (exceptionDate > requestDate) {
        return false; // ليس محظوراً!
      }
    }

    return true;
  }, [user, myRequests, exceptionStatus]);

  const [currentStep, setCurrentStep] = useState<Step>('service-selection');
  const [selectedService, setSelectedService] = useState<string | null>(null);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [isExceptionModalOpen, setIsExceptionModalOpen] = useState(false);
  const [exceptionReason, setExceptionReason] = useState("");
  const [exceptionFile, setExceptionFile] = useState<File | null>(null);
  const [isSubmittingException, setIsSubmittingException] = useState(false);

  const submitExceptionMutation = trpc.requests.submitException.useMutation();

  // الحصول على البرامج الفعالة من قاعدة البيانات
  const { data: activePrograms = [], isLoading: programsLoading } = trpc.programs.getActive.useQuery();

  // الحصول على بيانات المساجد
  const { data: mosquesResult, isLoading: mosquesLoading } = trpc.mosques.search.useQuery(
    { page: 1, limit: 100 },
    { enabled: currentStep === 'details' }
  );
  // undefined = جاري التحميل، [] = لا توجد مساجد، [...] = توجد مساجد
  const userMosques: Array<{ id: number; name: string; city?: string }> | undefined =
    mosquesLoading ? undefined : (mosquesResult?.mosques ?? []);

  // الحصول على إعدادات البرنامج المختار
  const selectedProgramConfig = useMemo(() => {
    if (!selectedService) return null;
    return activePrograms.find(p => p.id === selectedService);
  }, [selectedService, activePrograms]);

  // الحصول على جميع الحقول المرئية
  const visibleFields = useMemo(() => {
    if (!selectedService) return [];
    return getVisibleFieldsForProgram(selectedService, formData);
  }, [selectedService, formData]);

  // معالج تغيير الحقول
  const handleFieldChange = (fieldName: string, value: any) => {
    setFormData((prev) => {
      const updated = { ...prev, [fieldName]: value };
      
      // إذا كان التغيير لحقل mosqueId والبرنامج ليس بنيان
      if (fieldName === 'mosqueId' && selectedService !== 'bunyan') {
        const selectedMosqueId = Number(value);
        const selectedMosque = mosquesResult?.mosques?.find((m: any) => m.id === selectedMosqueId) as any;
        if (selectedMosque) {
          if (selectedMosque.area) {
            updated.mosqueArea = selectedMosque.area.toString();
          }
          if (selectedMosque.capacity) {
            updated.actualWorshippers = selectedMosque.capacity.toString();
          }

          if (selectedMosque.hasPrayerHall) {
            updated.hasPrayerHall = true;
            
            let womenPrayerArea = "";
            let womenPrayerCapacity = "";
            
            if (selectedMosque.notes && selectedMosque.notes.includes("[معلومات مصلى النساء]")) {
              const parts = selectedMosque.notes.split("[معلومات مصلى النساء]:");
              if (parts.length > 1) {
                const details = parts[1];
                
                // Extract capacity
                const capMatch = details.match(/- السعة:\s*([0-9]+)/);
                if (capMatch) {
                  womenPrayerCapacity = capMatch[1];
                }
                
                // Extract area
                const areaMatch = details.match(/- المساحة:\s*([0-9.]+)/);
                if (areaMatch) {
                  womenPrayerArea = areaMatch[1];
                }
              }
            }
            
            updated.womenPrayerArea = womenPrayerArea;
            updated.womenPrayerCapacity = womenPrayerCapacity;
          } else {
            updated.hasPrayerHall = false;
            delete updated.womenPrayerArea;
            delete updated.womenPrayerCapacity;
          }
        } else {
          updated.hasPrayerHall = false;
          delete updated.mosqueArea;
          delete updated.actualWorshippers;
          delete updated.womenPrayerArea;
          delete updated.womenPrayerCapacity;
        }
      }
      
      return updated;
    });

    if (errors[fieldName]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[fieldName];
        // تنظيف أخطاء الحقول المعبأة تلقائياً أيضاً
        if (fieldName === 'mosqueId') {
          delete newErrors['mosqueArea'];
          delete newErrors['actualWorshippers'];
          delete newErrors['womenPrayerArea'];
          delete newErrors['womenPrayerCapacity'];
        }
        return newErrors;
      });
    } else if (fieldName === 'mosqueId') {
      // إذا تم تغيير المسجد، نمسح أخطاء الحقول التابعة حتى لو لم يكن هناك خطأ في المسجد نفسه
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors['mosqueArea'];
        delete newErrors['actualWorshippers'];
        delete newErrors['womenPrayerArea'];
        delete newErrors['womenPrayerCapacity'];
        return newErrors;
      });
    }
  };

  // معالج الخطوة التالية
  const handleNextStep = () => {
    if (currentStep === 'service-selection') {
      if (!selectedService) { alert('يرجى اختيار خدمة'); return; }
      setCurrentStep('terms');
    } else if (currentStep === 'terms') {
      if (!agreedToTerms) { alert('يرجى الموافقة على الشروط والأحكام'); return; }
      setCurrentStep('requester-info');
    } else if (currentStep === 'requester-info') {
      setCurrentStep('details');
    } else if (currentStep === 'details') {
      const newErrors = validateAllFields(selectedService!, formData);
      if (hasErrors(newErrors)) {
        setErrors(newErrors);
        alert('يرجى ملء جميع الحقول المطلوبة');
        return;
      }
      setCurrentStep('review');
    }
  };

  // معالج الخطوة السابقة
  const handlePreviousStep = () => {
    const currentIndex = STEPS.findIndex((s) => s.key === currentStep);
    if (currentIndex > 0) setCurrentStep(STEPS[currentIndex - 1].key);
  };

  // الحصول على بيانات المستخدم الحالي
  const { data: currentUser } = trpc.auth.me.useQuery();

  // معالج الإرسال
  const createRequestMutation = trpc.requests.create.useMutation();
  const uploadAttachmentMutation = trpc.storage.uploadRequestAttachment.useMutation();

  const handleSubmit = async () => {
    if (!selectedService || !currentUser) return;
    setIsSubmitting(true);
    try {
      const programData: Record<string, any> = {};
      let mosqueId: number | undefined = undefined;

      for (const field of visibleFields) {
        if (formData[field.name] !== undefined) {
          if (field.name === 'mosqueId') {
            mosqueId = Number(formData[field.name]);
          } else {
            programData[field.name] = formData[field.name];
          }
        }
      }

      if (selectedService === 'bunyan' && formData.hasPrayerHall !== undefined) {
        programData.hasPrayerHall = formData.hasPrayerHall;
      }

      const result = await createRequestMutation.mutateAsync({
        programType: selectedService as any,
        mosqueId,
        programData,
        priority: 'normal',
        description: formData.workDescription || '',
        descriptiveName: formData.descriptiveName || null,
      });

      // إذا كان هناك ملف مختار، قم برفعه وربطه بالطلب
      if (selectedFile && result.requestId) {
        const reader = new FileReader();
        const uploadPromise = new Promise((resolve, reject) => {
          reader.onload = async () => {
            try {
              const base64String = (reader.result as string).split(',')[1];
              await uploadAttachmentMutation.mutateAsync({
                requestId: result.requestId,
                fileName: selectedFile.name,
                fileData: base64String,
                mimeType: selectedFile.type,
                category: 'other',
              });
              resolve(true);
            } catch (err) {
              reject(err);
            }
          };
          reader.onerror = () => reject(new Error("Failed to read file"));
          reader.readAsDataURL(selectedFile);
        });
        
        await uploadPromise;
      }

      alert('تم إرسال الطلب بنجاح');
      navigate(user?.role === 'service_requester' ? '/my-requests' : '/requests');
    } catch (error: any) {
      alert(error?.message || 'حدث خطأ أثناء إرسال الطلب');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleExceptionSubmit = async () => {
    if (!exceptionReason.trim()) {
      alert("يرجى كتابة سبب طلب الاستثناء");
      return;
    }

    setIsSubmittingException(true);
    try {
      let fileUrl: string | null = null;
      if (exceptionFile) {
        const formDataForUpload = new FormData();
        formDataForUpload.append('file', exceptionFile);

        const response = await fetch('/api/upload', {
          method: 'POST',
          body: formDataForUpload,
        });

        if (!response.ok) {
          throw new Error('فشل رفع الملف المرفق');
        }

        const data = await response.json();
        fileUrl = data.url;
      }

      await submitExceptionMutation.mutateAsync({
        reason: exceptionReason,
        attachment: fileUrl,
      });

      alert("تم تقديم طلب الاستثناء بنجاح وهو قيد المراجعة حالياً");
      setIsExceptionModalOpen(false);
      setExceptionReason("");
      setExceptionFile(null);
      refetchException();
    } catch (err: any) {
      alert(err?.message || "حدث خطأ أثناء إرسال طلب الاستثناء");
    } finally {
      setIsSubmittingException(false);
    }
  };

  const currentStepIndex = STEPS.findIndex((s) => s.key === currentStep);
  const progressPercentage = ((currentStepIndex + 1) / STEPS.length) * 100;

  const content = (
    <div className="max-w-4xl mx-auto px-4">
      {/* رأس الصفحة مع زر الرجوع للإداريين */}
      {showLayout && user?.role !== 'service_requester' && (
        <div className="flex items-center gap-3 sm:gap-4 mb-6 sm:mb-8 pb-4 border-b border-border/40">
          <Link href="/dashboard">
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 sm:h-10 sm:w-10 rounded-xl hover:bg-muted shrink-0 text-foreground"
              title="العودة للوحة التحكم"
            >
              <ArrowRight className="w-5 h-5" />
            </Button>
          </Link>
          <div className="min-w-0 flex-1">
            <h1 className="text-xl sm:text-2xl font-bold text-foreground truncate">تقديم طلب خدمة</h1>
          </div>
        </div>
      )}

      {/* شريط التقدم */}
      <div className="mb-6 sm:mb-8 overflow-x-auto pt-2 sm:pt-4 pb-2 hide-scrollbar">
        <div className="flex items-center justify-between min-w-[360px] sm:min-w-0">
          {STEPS.map((step, index) => (
            <React.Fragment key={step.key}>
              <div className={`flex flex-col items-center justify-start self-start shrink-0 min-h-[72px] sm:min-h-[88px] ${index <= currentStepIndex ? 'opacity-100' : 'opacity-40'}`}>
                <div
                  className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center font-bold text-xs sm:text-sm transition-all duration-300 ${
                    index < currentStepIndex
                      ? 'bg-primary text-primary-foreground'
                      : index === currentStepIndex
                      ? 'bg-primary text-primary-foreground ring-2 sm:ring-4 ring-primary/20 scale-110'
                      : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {index < currentStepIndex ? '✓' : step.order}
                </div>
                <p className={`text-[10px] sm:text-xs mt-1 text-center max-w-[60px] sm:max-w-[80px] leading-tight ${index === currentStepIndex ? 'text-primary font-bold' : 'text-muted-foreground font-medium'}`}>
                  {step.label}
                </p>
              </div>
              {index < STEPS.length - 1 && (
                <div className={`flex-1 h-0.5 sm:h-1 mx-1 sm:mx-2 rounded-full transition-colors duration-300 ${index < currentStepIndex ? 'bg-primary' : 'bg-muted'}`} />
              )}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* محتوى الخطوات */}
      <Card className="p-5 sm:p-8 lg:p-10 shadow-xl border border-border/60 rounded-3xl bg-background overflow-hidden">
        {/* الخطوة 1: اختيار الخدمة */}
        {currentStep === 'service-selection' && (
          <div className="space-y-5 sm:space-y-6">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-foreground mb-1 sm:mb-2">اختر نوع الخدمة</h2>
              <p className="text-sm sm:text-base text-muted-foreground">اختر البرنامج الذي تريد تقديم طلب خدمة له</p>
            </div>

            {programsLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-4">
                {activePrograms.map((program) => {
                  const Icon = ICON_MAP[program.icon || 'Package'] || Package;
                  return (
                    <Card
                      key={program.id}
                      className={`p-3 sm:p-4 cursor-pointer transition-all hover:shadow-lg border-2 overflow-hidden break-words ${
                        selectedService === program.id
                          ? 'border-primary bg-primary/5 shadow-md scale-[1.02]'
                          : 'border-transparent hover:border-primary/20 bg-muted/20'
                      }`}
                      onClick={() => setSelectedService(program.id)}
                    >
                      <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-lg ${program.color || 'bg-indigo-600'} flex items-center justify-center mb-2 sm:mb-3 shadow-sm flex-shrink-0`}>
                        <Icon className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                      </div>
                      <h3 className="font-bold text-foreground text-xs sm:text-sm leading-tight break-words">{program.name}</h3>
                      <p className="text-[9px] sm:text-xs text-muted-foreground mt-1 line-clamp-2 sm:line-clamp-3 leading-relaxed break-words">{program.description}</p>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* الخطوة 2: الشروط والأحكام */}
        {currentStep === 'terms' && (
          <div className="space-y-5 sm:space-y-6">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-foreground mb-1 sm:mb-2">الشروط والأحكام</h2>
            </div>
            <Alert className="bg-primary/5 border-primary/20">
              <AlertCircle className="h-4 w-4 text-primary" />
              <AlertDescription className="text-xs sm:text-sm">يرجى قراءة الشروط والأحكام بعناية قبل المتابعة</AlertDescription>
            </Alert>
            <div className="bg-muted/40 p-4 sm:p-6 rounded-xl max-h-72 sm:max-h-96 overflow-y-auto space-y-3 sm:space-y-4 border border-border" dir="rtl">
              <h3 className="font-bold text-foreground text-sm sm:text-base">شروط تقديم الطلب:</h3>
              {(() => {
                const conds = parseConditions(selectedProgramConfig?.conditions);
                if (conds.filter(Boolean).length > 0) {
                  return (
                    <div className="space-y-3">
                      {conds.filter(Boolean).map((condition, index) => (
                        <div key={index} className="text-xs sm:text-sm text-muted-foreground flex items-start gap-2 leading-relaxed">
                          <span className="text-primary font-bold">•</span>
                          <span>{condition}</span>
                        </div>
                      ))}
                    </div>
                  );
                }
                return <p className="text-xs sm:text-sm text-muted-foreground italic">لا توجد شروط خاصة لهذا البرنامج.</p>;
              })()}
            </div>
            <div className="flex items-center gap-3 p-3 sm:p-4 bg-muted/20 rounded-xl border border-border">
              <Checkbox
                id="terms"
                checked={agreedToTerms}
                onCheckedChange={(checked) => setAgreedToTerms(checked as boolean)}
              />
              <label htmlFor="terms" className="text-xs sm:text-sm font-medium text-foreground cursor-pointer">
                أوافق على الشروط والأحكام
              </label>
            </div>
          </div>
        )}

        {/* الخطوة 3: بيانات مقدم الطلب */}
        {currentStep === 'requester-info' && (
          <div className="space-y-5 sm:space-y-6">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-foreground mb-1 sm:mb-2">بيانات مقدم الطلب</h2>
              <p className="text-sm sm:text-base text-muted-foreground">البيانات التالية مأخوذة من حسابك</p>
            </div>
            <div className="bg-muted/20 p-4 sm:p-6 rounded-xl space-y-4 border border-border">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                <div className="bg-background p-3 rounded-lg border border-border shadow-sm">
                  <p className="text-[10px] sm:text-xs text-muted-foreground mb-1">الاسم</p>
                  <p className="text-sm sm:text-base font-bold text-foreground">{currentUser?.name || '-'}</p>
                </div>
                <div className="bg-background p-3 rounded-lg border border-border shadow-sm">
                  <p className="text-[10px] sm:text-xs text-muted-foreground mb-1">البريد الإلكتروني</p>
                  <p className="text-sm sm:text-base font-bold text-foreground truncate">{currentUser?.email || '-'}</p>
                </div>
                <div className="bg-background p-3 rounded-lg border border-border shadow-sm">
                  <p className="text-[10px] sm:text-xs text-muted-foreground mb-1">رقم الجوال</p>
                  <p className="text-sm sm:text-base font-bold text-foreground" dir="ltr">{(currentUser as any)?.phone || '-'}</p>
                </div>
                <div className="bg-background p-3 rounded-lg border border-border shadow-sm">
                  <p className="text-[10px] sm:text-xs text-muted-foreground mb-1">الدور</p>
                  <p className="text-sm sm:text-base font-bold text-foreground">{currentUser?.role || '-'}</p>
                </div>
              </div>
            </div>
            <Alert className="bg-blue-50 border-blue-100 text-blue-800 p-3">
              <CheckCircle2 className="h-4 w-4" />
              <AlertDescription className="text-xs sm:text-sm">
                إذا كنت تريد تعديل بيانات حسابك، يرجى الذهاب إلى صفحة الإعدادات
              </AlertDescription>
            </Alert>
          </div>
        )}

        {/* الخطوة 4: تفاصيل الطلب */}
        {currentStep === 'details' && (
          <div className="space-y-6 sm:space-y-8">

            {/* حالة تحميل المساجد */}
            {mosquesLoading && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-muted/40 text-muted-foreground text-xs sm:text-sm">
                <Loader2 className="w-4 h-4 animate-spin text-primary" />
                جاري تحميل بيانات المساجد...
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 sm:gap-6">
              {/* حقل التسمية التوضيحية الاختياري (يظهر للموظفين فقط وليس للمستفيد) */}
              {currentUser?.role !== "service_requester" && (
                <div className="col-span-1 sm:col-span-2 space-y-1.5 bg-muted/20 p-4 sm:p-5 rounded-2xl border border-border">
                  <label htmlFor="descriptiveName" className="text-xs sm:text-sm font-bold text-foreground flex items-center gap-1.5">
                    <Tag className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                    التسمية التوضيحية (اختياري)
                  </label>
                  <Input
                    id="descriptiveName"
                    type="text"
                    value={formData.descriptiveName || ''}
                    onChange={(e) => handleFieldChange("descriptiveName", e.target.value)}
                    placeholder="مثال: ترميم المصلى الرئيسي، صيانة التكييف، مظلات الخارجية..."
                    className="h-11 rounded-xl text-xs sm:text-sm bg-background border-border/80"
                  />
                  <p className="text-[11px] text-muted-foreground">اسم توضيحي يسهل التمييز والتنظيم في جدول الطلبات والمشاريع.</p>
                </div>
              )}

              {(selectedService === 'bunyan'
                ? visibleFields.filter(f => f.name !== 'womenPrayerArea' && f.name !== 'womenPrayerCapacity')
                : visibleFields
              ).map((field) => {
                const isFullWidth =
                  field.type === 'textarea' ||
                  field.type === 'radio' ||
                  field.name === 'mosqueId' ||
                  field.name === 'workDescription' ||
                  field.name === 'fundingProposals' ||
                  field.name === 'willingToVolunteer';

                return (
                  <React.Fragment key={field.name}>
                    <div className={isFullWidth ? 'col-span-1 sm:col-span-2' : 'col-span-1'}>
                      <ConditionalField
                        field={field}
                        formData={formData}
                        value={formData[field.name]}
                        onChange={(value) => handleFieldChange(field.name, value)}
                        error={errors[field.name]}
                        mosqueOptions={userMosques}
                        onAddMosque={() => navigate('/requester/mosques/new')}
                        disabled={selectedService !== 'bunyan' && ['mosqueArea', 'actualWorshippers', 'womenPrayerArea', 'womenPrayerCapacity'].includes(field.name)}
                      />
                    </div>

                    {selectedService === 'bunyan' && field.name === 'actualWorshippers' && (
                      <div className="col-span-1 sm:col-span-2 space-y-4">
                        <div
                          onClick={() => {
                            const isChecked = !formData.hasPrayerHall;
                            setFormData((prev) => {
                              const updated = { ...prev, hasPrayerHall: isChecked } as any;
                              if (!isChecked) {
                                delete updated.womenPrayerArea;
                                delete updated.womenPrayerCapacity;
                              }
                              return updated;
                            });
                            if (!isChecked) {
                              setErrors((prev) => {
                                const newErrors = { ...prev };
                                delete newErrors.womenPrayerArea;
                                delete newErrors.womenPrayerCapacity;
                                return newErrors;
                              });
                            }
                          }}
                          className={`p-4 sm:p-5 rounded-2xl border-2 transition-all cursor-pointer flex items-center justify-between gap-4 select-none ${
                            formData.hasPrayerHall
                              ? 'border-primary bg-primary/5 dark:bg-primary/10 shadow-xs ring-2 ring-primary/20'
                              : 'border-border/60 bg-muted/20 hover:bg-muted/40'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${
                              formData.hasPrayerHall ? 'bg-primary text-white' : 'bg-muted text-muted-foreground'
                            }`}>
                              <Building2 className="w-5 h-5" />
                            </div>
                            <div>
                              <p className="font-bold text-xs sm:text-sm text-foreground">هل يتضمن المشروع مصلى للنساء؟</p>
                              <p className="text-[11px] text-muted-foreground mt-0.5">حدد إذا المسجد يشمل قسماً مخصصاً لمصلى النساء</p>
                            </div>
                          </div>
                          <Checkbox
                            id="hasPrayerHall"
                            checked={!!formData.hasPrayerHall}
                            className="h-5 w-5 rounded-md data-[state=checked]:bg-primary"
                          />
                        </div>

                        {formData.hasPrayerHall && (
                          <div className="p-4 sm:p-5 border border-primary/20 rounded-2xl bg-primary/5 space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
                            <h4 className="font-bold text-xs sm:text-sm text-primary flex items-center gap-2 border-b border-primary/10 pb-2.5">
                              <Building2 className="w-4 h-4" />
                              بيانات مصلى النساء
                            </h4>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <label htmlFor="womenPrayerCapacity" className="text-xs sm:text-sm font-bold text-foreground flex items-center gap-1.5">
                                  <Users className="w-4 h-4 text-primary/70" />
                                  <span>سعة مصلى النساء (مصلي)</span>
                                  <span className="text-red-500 font-bold">*</span>
                                </label>
                                <Input
                                  id="womenPrayerCapacity"
                                  type="number"
                                  value={formData.womenPrayerCapacity || ''}
                                  onChange={(e) => handleFieldChange("womenPrayerCapacity", e.target.value)}
                                  placeholder="مثال: 50"
                                  className={`h-11 rounded-xl text-xs sm:text-sm bg-background border-border/80 ${errors.womenPrayerCapacity ? 'border-red-500' : ''}`}
                                />
                                {errors.womenPrayerCapacity && (
                                  <p className="text-xs text-red-500 font-medium">{errors.womenPrayerCapacity}</p>
                                )}
                              </div>
                              <div className="space-y-2">
                                <label htmlFor="womenPrayerArea" className="text-xs sm:text-sm font-bold text-foreground flex items-center gap-1.5">
                                  <Ruler className="w-4 h-4 text-primary/70" />
                                  <span>المساحة (م²)</span>
                                  <span className="text-red-500 font-bold">*</span>
                                </label>
                                <Input
                                  id="womenPrayerArea"
                                  type="number"
                                  value={formData.womenPrayerArea || ''}
                                  onChange={(e) => handleFieldChange("womenPrayerArea", e.target.value)}
                                  placeholder="مثال: 50"
                                  className={`h-11 rounded-xl text-xs sm:text-sm bg-background border-border/80 ${errors.womenPrayerArea ? 'border-red-500' : ''}`}
                                />
                                {errors.womenPrayerArea && (
                                  <p className="text-xs text-red-500 font-medium">{errors.womenPrayerArea}</p>
                                )}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </React.Fragment>
                );
              })}

              {/* حقل رفع المرفق الاختياري */}
              <div className="col-span-1 sm:col-span-2 pt-4 border-t border-border/60">
                <label className="flex items-center gap-2 text-xs sm:text-sm font-bold mb-3 text-foreground">
                  <Paperclip className="w-4 h-4 text-primary" />
                  <span>المرفقات والوثائق الداعمة (اختياري)</span>
                </label>
                <div className="flex flex-col gap-3">
                  <input
                    type="file"
                    id="request-attachment"
                    className="hidden"
                    accept=".pdf,.jpg,.jpeg,.png,.webp,.gif,.heic,.heif,.doc,.docx,image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0] || null;
                      if (file) {
                        const allowedExtensions = ['pdf', 'jpg', 'jpeg', 'png', 'webp', 'gif', 'heic', 'heif', 'doc', 'docx'];
                        const extension = file.name.split('.').pop()?.toLowerCase();
                        if (!extension || !allowedExtensions.includes(extension)) {
                          alert('نوع الملف غير مسموح. يرجى اختيار ملف PDF أو صور أو مستندات Word.');
                          e.target.value = '';
                          return;
                        }
                        if (file.size > 10 * 1024 * 1024) {
                          alert('حجم الملف كبير جداً. الحد الأقصى هو 10 ميجابايت.');
                          e.target.value = '';
                          return;
                        }
                      }
                      setSelectedFile(file);
                    }}
                  />

                  {selectedFile ? (
                    <div className="p-4 rounded-2xl border-2 border-emerald-500/40 bg-emerald-50/50 dark:bg-emerald-950/20 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                          <CheckCircle2 className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-xs sm:text-sm text-foreground truncate">{selectedFile.name}</p>
                          <p className="text-[11px] text-muted-foreground font-mono">
                            {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
                          </p>
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedFile(null)}
                        className="rounded-xl text-destructive hover:bg-destructive/10 text-xs font-semibold gap-1"
                      >
                        <Trash2 className="w-4 h-4" />
                        <span>إزالة</span>
                      </Button>
                    </div>
                  ) : (
                    <div
                      onClick={() => document.getElementById('request-attachment')?.click()}
                      className="p-6 sm:p-8 border-2 border-dashed border-border/80 hover:border-primary hover:bg-primary/5 transition-all rounded-2xl cursor-pointer text-center group"
                    >
                      <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
                        <UploadCloud className="w-6 h-6" />
                      </div>
                      <p className="font-bold text-xs sm:text-sm text-foreground">
                        اضغط لرفع ملف أو اسحبه إلى هنا
                      </p>
                      <p className="text-[11px] text-muted-foreground mt-1">
                        يدعم ملفات PDF، الصور، ومستندات Word (الحد الأقصى 10 ميجابايت)
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* الخطوة 5: المراجعة والإرسال */}
        {currentStep === 'review' && (
          <div className="space-y-5 sm:space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-foreground mb-1 sm:mb-2">المراجعة والإرسال</h2>
                <p className="text-sm sm:text-base text-muted-foreground">يرجى مراجعة البيانات قبل إرسال الطلب</p>
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={() => window.print()}
                className="gap-2 font-bold rounded-2xl h-11 px-5 border-primary/30 text-primary hover:bg-primary/5 shadow-xs self-start sm:self-center"
              >
                <Printer className="w-4 h-4" />
                <span>طباعة مسودة الطلب / PDF</span>
              </Button>
            </div>

            <Alert className="bg-emerald-50/80 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900 text-emerald-900 dark:text-emerald-200 p-4 rounded-2xl">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              <AlertDescription className="text-xs sm:text-sm font-medium">
                جميع البيانات صحيحة ومكتملة. يمكنك طباعة مسودة للطلب أو المتابعة لإرساله مباشرة.
              </AlertDescription>
            </Alert>

            <div className="bg-muted/20 p-4 sm:p-6 rounded-2xl space-y-6 border border-border/80 shadow-inner">
              {/* ملخص البرنامج */}
              <div className="bg-background p-4 sm:p-5 rounded-2xl border border-border/70 shadow-xs">
                <p className="text-[10px] sm:text-xs text-muted-foreground mb-2 uppercase tracking-wider font-bold">نوع الخدمة والبرنامج</p>
                <div className="flex items-center gap-3.5">
                  {selectedProgramConfig && (
                    <>
                      <div className={`w-11 h-11 sm:w-12 sm:h-12 rounded-2xl ${selectedProgramConfig.color || 'bg-primary'} text-white flex items-center justify-center shadow-md shrink-0`}>
                        {React.createElement(ICON_MAP[selectedProgramConfig.icon || 'Package'] || Package, { className: "w-6 h-6" })}
                      </div>
                      <div>
                        <p className="font-extrabold text-foreground text-sm sm:text-base">{selectedProgramConfig.name}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{selectedProgramConfig.description}</p>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* بيانات مقدم الطلب */}
              <div className="bg-background p-4 sm:p-5 rounded-2xl border border-border/70 shadow-xs">
                <p className="text-[10px] sm:text-xs text-muted-foreground mb-3 uppercase tracking-wider font-bold">بيانات مقدم الطلب</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs sm:text-sm">
                  <div>
                    <p className="text-muted-foreground mb-0.5 font-medium">الاسم</p>
                    <p className="font-bold text-foreground">{currentUser?.name || '-'}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground mb-0.5 font-medium">البريد الإلكتروني</p>
                    <p className="font-bold text-foreground truncate">{currentUser?.email || '-'}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground mb-0.5 font-medium">رقم الجوال</p>
                    <p className="font-bold text-foreground font-mono" dir="ltr">{currentUser?.phone || '-'}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground mb-0.5 font-medium">نوع الحساب / الصفة</p>
                    <p className="font-bold text-foreground">طالب خدمة مساجد</p>
                  </div>
                </div>
              </div>

              {/* تفاصيل الطلب */}
              <div className="bg-background p-4 sm:p-5 rounded-2xl border border-border/70 shadow-xs">
                <p className="text-[10px] sm:text-xs text-muted-foreground mb-4 uppercase tracking-wider font-bold">تفاصيل ونطاق الطلب</p>
                <div className="space-y-4">
                  {visibleFields.map((field) => {
                    const val = formData[field.name];
                    let displayVal = val ? String(val) : '-';
                    if (val === 'yes') displayVal = 'نعم';
                    if (val === 'no') displayVal = 'لا';
                    if (field.name === 'landOwnership') {
                      displayVal = val === 'private' ? 'ملك خاص' : val === 'waqf' ? 'وقف' : val === 'government' ? 'حكومي' : (val || '-');
                    }
                    if (field.name === 'mosqueId' && (userMosques?.length ?? 0) > 0) {
                      const m = userMosques?.find((item: any) => item.id === val);
                      if (m) displayVal = `${m.name} ${m.city ? `(${m.city})` : ''}`;
                    }

                    return (
                      <React.Fragment key={field.name}>
                        <div className="border-b border-border/60 last:border-0 pb-3 last:pb-0">
                          <p className="text-[11px] sm:text-xs text-muted-foreground mb-1 font-medium">{field.label}</p>
                          <p className="font-bold text-foreground text-xs sm:text-sm whitespace-pre-wrap break-words leading-relaxed">
                            {displayVal}
                          </p>
                        </div>
                        {selectedService === 'bunyan' && field.name === 'actualWorshippers' && (
                          <div className="border-b border-border/60 pb-3 last:border-0">
                            <p className="text-[11px] sm:text-xs text-muted-foreground mb-1 font-medium">مصلى النساء</p>
                            <p className="font-bold text-foreground text-xs sm:text-sm">
                              {formData.hasPrayerHall
                                ? `يتضمن مصلى للنساء (السعة: ${formData.womenPrayerCapacity || '-'} مصلي | المساحة: ${formData.womenPrayerArea || '-'} م²)`
                                : 'لا يتضمن مصلى للنساء'}
                            </p>
                          </div>
                        )}
                      </React.Fragment>
                    );
                  })}
                  {selectedFile && (
                    <div className="pt-1">
                      <p className="text-[11px] sm:text-xs text-muted-foreground mb-1 font-medium">المرفقات</p>
                      <p className="font-bold text-primary flex items-center gap-1.5 text-xs sm:text-sm">
                        <Paperclip className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                        <span>{selectedFile.name}</span>
                        <span className="text-muted-foreground font-mono text-xs">({(selectedFile.size / (1024 * 1024)).toFixed(2)} MB)</span>
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* تنسيقات الطباعة المتوافقة مع تقارير المنصة الرسمية */}
        <style>{`
          @media print {
            @page {
              size: A4 portrait;
              margin: 8mm 6mm !important;
            }
            * {
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
              box-sizing: border-box !important;
            }
            html, body {
              width: 100% !important;
              height: auto !important;
              background-color: white !important;
              color: black !important;
              margin: 0 !important;
              padding: 0 !important;
              overflow: visible !important;
            }
            header, nav, footer, .print\\:hidden {
              display: none !important;
            }
            .printable-report-container {
              display: block !important;
              width: 100% !important;
              max-width: 100% !important;
              margin: 0 !important;
              padding: 0 !important;
            }
            .section-block, tr, .break-inside-avoid {
              page-break-inside: avoid !important;
              break-inside: avoid !important;
            }
          }
        `}</style>

        {/* قالب التقرير الرسمي المخصص للطباعة A4 */}
        <div className="hidden print:block printable-report-container font-sans text-black" dir="rtl">
          <div className="w-full border-[3px] border-[#1a5f4a] p-6 rounded-lg relative overflow-hidden bg-white">
            {/* خط ذهبي داخلي رفيع للإطار مثل تقارير العقود والإنجاز */}
            <div className="absolute inset-1.5 border border-[#d4a574] rounded pointer-events-none"></div>

            <div className="relative z-10">
              {/* ترويسة التقرير: الشعار، اسم الجمعية، وتاريخ الطلب */}
              <div className="flex justify-between items-start gap-4 mb-5 pb-4 border-b border-gray-200">
                <div className="flex items-center gap-3">
                  {orgSettings?.logoUrl ? (
                    <img src={orgSettings.logoUrl} alt="شعار الجمعية" className="h-16 w-auto object-contain" />
                  ) : (
                    <div className="w-16 h-16 bg-[#1a5f4a]/10 rounded-lg flex items-center justify-center border border-[#1a5f4a]/20">
                      <span className="text-[#1a5f4a] font-bold text-xl">منارة</span>
                    </div>
                  )}
                  <div>
                    <h3 className="text-base font-extrabold text-[#1a5f4a]">
                      {orgSettings?.officialReportsName || "بوابة منارة - للعناية بالمساجد"}
                    </h3>
                    <p className="text-xs text-gray-500 font-medium">إدارة شؤون وخدمات المساجد والمشاريع</p>
                    <p className="text-[11px] text-gray-400">منصة تمام لخدمة ورعاية بيوت الله</p>
                  </div>
                </div>

                <div className="text-xs space-y-1.5 text-left pl-2">
                  <div className="flex items-center justify-end gap-2">
                    <span className="font-bold text-gray-700">التاريخ:</span>
                    <span className="font-semibold text-gray-900">{formatGregorianDate(new Date())}</span>
                  </div>
                  <div className="flex items-center justify-end gap-2">
                    <span className="font-bold text-gray-700">الموافق:</span>
                    <span className="font-semibold text-gray-900">{toHijriDate(new Date())}</span>
                  </div>
                  <div className="flex items-center justify-end gap-2">
                    <span className="font-bold text-gray-700">نوع الوثيقة:</span>
                    <span className="bg-emerald-50 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded border border-emerald-200">
                      مسودة طلب خدمة إلكتروني
                    </span>
                  </div>
                </div>
              </div>

              {/* البانر الرئيسي للتقرير */}
              <div className="text-center py-3.5 px-4 mb-5 rounded-lg bg-[#1a5f4a] text-white shadow-xs">
                <h1 className="text-xl font-bold">
                  استمارة تقديم طلب خدمة مساجد - {selectedProgramConfig?.name}
                </h1>
                <p className="text-xs text-emerald-100 mt-1">
                  {selectedProgramConfig?.description}
                </p>
              </div>

              {/* القسم 1: بيانات مقدم الطلب */}
              <div className="mb-4 section-block">
                <div className="bg-[#1a5f4a]/10 border-r-4 border-[#1a5f4a] px-3 py-1.5 mb-2 font-bold text-xs text-[#1a5f4a] rounded-l">
                  أولاً: بيانات مقدم الطلب
                </div>
                <table className="w-full text-xs border border-gray-300 rounded overflow-hidden">
                  <tbody>
                    <tr className="border-b border-gray-200 bg-gray-50/50">
                      <td className="p-2 font-bold text-gray-600 w-1/4 border-l border-gray-200">الاسم الكامل:</td>
                      <td className="p-2 text-gray-900 font-bold w-1/4 border-l border-gray-200">{currentUser?.name || '-'}</td>
                      <td className="p-2 font-bold text-gray-600 w-1/4 border-l border-gray-200">الصفة / نوع الحساب:</td>
                      <td className="p-2 text-gray-900 w-1/4">طالب خدمة مساجد</td>
                    </tr>
                    <tr className="bg-white">
                      <td className="p-2 font-bold text-gray-600 border-l border-gray-200">البريد الإلكتروني:</td>
                      <td className="p-2 text-gray-900 border-l border-gray-200">{currentUser?.email || '-'}</td>
                      <td className="p-2 font-bold text-gray-600 border-l border-gray-200">رقم الجوال:</td>
                      <td className="p-2 text-gray-900" dir="ltr">{currentUser?.phone || '-'}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* القسم 2: بيانات المسجد والموقع */}
              <div className="mb-4 section-block">
                <div className="bg-[#1a5f4a]/10 border-r-4 border-[#1a5f4a] px-3 py-1.5 mb-2 font-bold text-xs text-[#1a5f4a] rounded-l">
                  ثانياً: بيانات المسجد والموقع
                </div>
                <table className="w-full text-xs border border-gray-300 rounded overflow-hidden">
                  <tbody>
                    {selectedService === 'bunyan' ? (
                      <>
                        <tr className="border-b border-gray-200 bg-gray-50/50">
                          <td className="p-2 font-bold text-gray-600 w-1/4 border-l border-gray-200">حالة المسجد:</td>
                          <td className="p-2 text-gray-900 font-bold w-1/4 border-l border-gray-200">بناء جديد / استكمال متعثر</td>
                          <td className="p-2 font-bold text-gray-600 w-1/4 border-l border-gray-200">اسم الحي:</td>
                          <td className="p-2 text-gray-900 w-1/4">{formData.district || '-'}</td>
                        </tr>
                        <tr className="bg-white">
                          <td className="p-2 font-bold text-gray-600 border-l border-gray-200">أقرب مسجد موجود:</td>
                          <td className="p-2 text-gray-900 border-l border-gray-200">{formData.nearestMosque || '-'}</td>
                          <td className="p-2 font-bold text-gray-600 border-l border-gray-200">المسافة من أقرب مسجد:</td>
                          <td className="p-2 text-gray-900">{formData.distanceToNearestMosque ? `${formData.distanceToNearestMosque} كم` : '-'}</td>
                        </tr>
                      </>
                    ) : (
                      <tr className="bg-white">
                        <td className="p-2 font-bold text-gray-600 w-1/4 border-l border-gray-200">اسم المسجد:</td>
                        <td className="p-2 text-gray-900 font-bold w-1/4 border-l border-gray-200">
                          {(() => {
                            const found = userMosques?.find((m: any) => m.id === formData.mosqueId);
                            return found ? found.name : `مسجد #${formData.mosqueId || '-'}`;
                          })()}
                        </td>
                        <td className="p-2 font-bold text-gray-600 w-1/4 border-l border-gray-200">المدينة / المنطقة:</td>
                        <td className="p-2 text-gray-900 w-1/4">
                          {(() => {
                            const found = userMosques?.find((m: any) => m.id === formData.mosqueId);
                            return found ? (found.city || orgSettings?.city || '-') : (orgSettings?.city || '-');
                          })()}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* القسم 3: التفاصيل الفنية ونطاق الأعمال */}
              <div className="mb-4 section-block">
                <div className="bg-[#1a5f4a]/10 border-r-4 border-[#1a5f4a] px-3 py-1.5 mb-2 font-bold text-xs text-[#1a5f4a] rounded-l">
                  ثالثاً: تفاصيل ونطاق الطلب
                </div>
                <table className="w-full text-xs border border-gray-300 rounded overflow-hidden">
                  <tbody>
                    {visibleFields.map((field, idx) => {
                      const val = formData[field.name];
                      let displayVal = val ? String(val) : '-';
                      if (val === 'yes') displayVal = 'نعم';
                      if (val === 'no') displayVal = 'لا';
                      if (field.name === 'landOwnership') {
                        displayVal = val === 'private' ? 'ملك خاص' : val === 'waqf' ? 'وقف' : val === 'government' ? 'حكومي' : (val || '-');
                      }
                      if (field.name === 'mosqueId' && (userMosques?.length ?? 0) > 0) {
                        const m = userMosques?.find((item: any) => item.id === val);
                        if (m) displayVal = `${m.name} ${m.city ? `(${m.city})` : ''}`;
                      }

                      return (
                        <tr key={field.name} className={`border-b border-gray-200 ${idx % 2 === 0 ? 'bg-gray-50/50' : 'bg-white'}`}>
                          <td className="p-2 font-bold text-gray-600 w-1/3 border-l border-gray-200">{field.label}:</td>
                          <td className="p-2 text-gray-900 whitespace-pre-wrap leading-relaxed">{displayVal}</td>
                        </tr>
                      );
                    })}
                    {selectedService === 'bunyan' && (
                      <tr className="border-b border-gray-200 bg-white">
                        <td className="p-2 font-bold text-gray-600 w-1/3 border-l border-gray-200">مصلى النساء:</td>
                        <td className="p-2 text-gray-900">
                          {formData.hasPrayerHall
                            ? `يتضمن مصلى للنساء (السعة: ${formData.womenPrayerCapacity || '-'} مصلي | المساحة: ${formData.womenPrayerArea || '-'} م²)`
                            : 'لا يتضمن مصلى للنساء'}
                        </td>
                      </tr>
                    )}
                    <tr className="bg-gray-50/50">
                      <td className="p-2 font-bold text-gray-600 w-1/3 border-l border-gray-200">المرفقات المرفوعة:</td>
                      <td className="p-2 text-gray-900 font-semibold">
                        {selectedFile ? `${selectedFile.name} (${(selectedFile.size / (1024 * 1024)).toFixed(2)} MB)` : 'لا يوجد مرفقات'}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* القسم 4: الإقرار والتعهد */}
              <div className="mb-5 p-3 border border-emerald-200 bg-emerald-50/50 rounded-lg text-xs leading-relaxed section-block">
                <p className="font-bold text-emerald-900 mb-1">إقرار وتعهد مقدم الطلب:</p>
                <p className="text-emerald-800 text-[11px]">
                  أقر أنا مقدم الطلب الموضحة بياناتي أعلاه بصحة ودقة كافة البيانات والمعلومات والمرفقات الواردة في هذه الاستمارة، وأوافق على خضوع الطلب للضوابط والمعايير والتقييم الميداني والفني المعتمد لدى جمعية عمارة المساجد (منارة).
                </p>
              </div>

              {/* القسم 5: التواقيع والاعتماد */}
              <div className="grid grid-cols-3 gap-4 pt-3 border-t border-gray-300 text-center text-xs section-block">
                <div>
                  <p className="font-bold text-gray-700 mb-1">مقدم الطلب</p>
                  <p className="text-gray-900 font-bold">{currentUser?.name || '-'}</p>
                  <p className="text-[10px] text-gray-400 mt-6">التوقيع: ...........................</p>
                </div>

                <div>
                  <p className="font-bold text-gray-700 mb-1">تاريخ إعداد الاستمارة</p>
                  <p className="font-mono text-gray-900">{formatGregorianDate(new Date())}</p>
                  <p className="text-[10px] text-gray-400 mt-6">{toHijriDate(new Date())}</p>
                </div>

                <div>
                  <p className="font-bold text-gray-700 mb-1">اعتماد البوابة الإلكترونية</p>
                  <div className="inline-block px-3 py-1 border-2 border-dashed border-[#1a5f4a]/40 text-[#1a5f4a] rounded font-bold text-[11px] mt-1">
                    منارة - تم الإنشاء إلكترونياً
                  </div>
                </div>
              </div>

              {/* التذييل الرسمي */}
              <div className="mt-6 pt-3 border-t border-gray-200 flex justify-between items-center text-[10px] text-gray-500">
                <span>{orgSettings?.address || "المملكة العربية السعودية"}</span>
                <span>{orgSettings?.website || "www.manarah.org.sa"} | {orgSettings?.email || "info@manarah.org.sa"}</span>
                <span>صفحة 1 من 1</span>
              </div>
            </div>
          </div>
        </div>

        {/* أزرار التنقل */}
        <div className="flex flex-row items-center justify-between gap-3 mt-8 pt-6 border-t border-border/60">
          {currentStep !== 'service-selection' ? (
            <Button
              variant="outline"
              size="lg"
              onClick={handlePreviousStep}
              className="rounded-2xl font-bold h-11 sm:h-12 px-4 sm:px-6 gap-2 text-xs sm:text-sm shadow-xs hover:bg-muted"
            >
              <ChevronRight className="w-4 h-4" />
              <span>السابق</span>
            </Button>
          ) : (
            <div /> // Placeholder to keep Next button on the left (RTL)
          )}
          
          {currentStep !== 'review' ? (
            <Button
              size="lg"
              onClick={handleNextStep}
              className="rounded-2xl font-bold h-11 sm:h-12 px-6 sm:px-8 gap-2 text-xs sm:text-sm gradient-primary text-white shadow-md hover:opacity-95 transition-all"
            >
              <span>التالي</span>
              <ChevronLeft className="w-4 h-4" />
            </Button>
          ) : (
            <Button
              size="lg"
              onClick={handleSubmit}
              disabled={isSubmitting || createRequestMutation.isPending || uploadAttachmentMutation.isPending}
              className="rounded-2xl font-bold h-11 sm:h-12 px-6 sm:px-8 gap-2 text-xs sm:text-sm gradient-primary text-white shadow-md hover:opacity-95 transition-all"
            >
              {isSubmitting || createRequestMutation.isPending || uploadAttachmentMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>جاري الإرسال...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>إرسال الطلب</span>
                </>
              )}
            </Button>
          )}
        </div>
      </Card>
    </div>
  );

  if (myRequestsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background/50 backdrop-blur-sm">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (isImamBlocked) {
    const blockContent = (
      <div className="max-w-4xl mx-auto px-4">
        {/* رأس الصفحة مع زر الرجوع للإداريين */}
        {showLayout && user?.role !== 'service_requester' && (
          <div className="flex items-center gap-3 sm:gap-4 mb-6 sm:mb-8 pb-4 border-b border-border/40">
            <Link href="/dashboard">
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 sm:h-10 sm:w-10 rounded-xl hover:bg-muted shrink-0 text-foreground"
                title="العودة للوحة التحكم"
              >
                <ArrowRight className="w-5 h-5" />
              </Button>
            </Link>
            <div className="min-w-0 flex-1">
              <h1 className="text-xl sm:text-2xl font-bold text-foreground truncate">تقديم طلب خدمة</h1>
            </div>
          </div>
        )}

        <div className="space-y-6">
          <Alert variant="destructive" className="border-destructive/50 bg-destructive/5">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle className="text-base sm:text-lg font-bold">لا يمكن تقديم طلب جديد حالياً</AlertTitle>
            <AlertDescription className="text-xs sm:text-sm leading-relaxed mt-1">
              عذراً، بصفتك إمام مسجد، لا يمكنك تقديم طلب جديد لوجود طلب سابق لك قيد المعالجة ولم يكتمل بعد.
              {myRequests[0] && (
                <div className="mt-4 p-4 rounded-xl border border-red-200/20 bg-red-500/5 text-right space-y-1.5 max-w-md">
                  <div>
                    <span className="font-bold text-red-700 dark:text-red-400">رقم الطلب السابق: </span>
                    <span className="font-semibold text-slate-700 dark:text-slate-300">{myRequests[0].requestNumber}</span>
                  </div>
                  <div>
                    <span className="font-bold text-red-700 dark:text-red-400">تاريخ التقديم: </span>
                    <span className="font-semibold text-slate-700 dark:text-slate-300 font-mono">
                      {new Date(myRequests[0].createdAt).toLocaleDateString('ar-SA')}
                    </span>
                  </div>
                  <div>
                    <span className="font-bold text-red-700 dark:text-red-400">حالة الطلب: </span>
                    <span className="font-bold text-amber-600 dark:text-amber-500">تحت المعالجة</span>
                  </div>
                </div>
              )}
            </AlertDescription>
          </Alert>

          <div className="flex justify-end gap-3 pt-2">
            <Link href="/my-requests">
              <Button className="h-10 px-5 rounded-xl font-bold bg-primary hover:bg-primary/95 text-white transition-all">
                متابعة طلباتي السابقة
              </Button>
            </Link>

            {exceptionStatus && exceptionStatus.status === "pending" ? (
              <Button disabled variant="outline" className="h-10 px-5 rounded-xl font-bold bg-slate-100 text-slate-500">
                طلب الاستثناء قيد المراجعة حالياً
              </Button>
            ) : exceptionStatus && exceptionStatus.status === "rejected" ? (
              <Button disabled variant="outline" className="h-10 px-5 rounded-xl font-bold bg-red-50 text-red-600 border border-red-200/50">
                تم رفض طلب الاستثناء السابق
              </Button>
            ) : (
              <Button 
                onClick={() => setIsExceptionModalOpen(true)} 
                className="h-10 px-5 rounded-xl font-bold bg-amber-600 hover:bg-amber-700 text-white transition-all"
              >
                طلب استثناء
              </Button>
            )}

            <Link href="/requester">
              <Button variant="outline" className="h-10 px-5 rounded-xl font-bold transition-all">
                العودة للوحة التحكم
              </Button>
            </Link>
          </div>
        </div>

        <Dialog open={isExceptionModalOpen} onOpenChange={setIsExceptionModalOpen}>
          <DialogContent className="sm:max-w-lg" dir="rtl">
            <DialogHeader className="text-right">
              <DialogTitle className="text-lg font-bold">تقديم طلب استثناء لإنشاء طلب جديد</DialogTitle>
            </DialogHeader>

            <div className="space-y-4 py-4 text-right">
              <div className="space-y-2">
                <Label htmlFor="reason" className="text-sm font-bold text-slate-700 dark:text-slate-300">سبب طلب الاستثناء / مبررات التقديم <span className="text-destructive">*</span></Label>
                <Textarea 
                  id="reason" 
                  value={exceptionReason} 
                  onChange={(e) => setExceptionReason(e.target.value)} 
                  placeholder="يرجى كتابة سبب طلب الاستثناء بالتفصيل هنا..." 
                  className="min-h-[120px] rounded-xl text-xs sm:text-sm leading-relaxed"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="attachment" className="text-sm font-bold text-slate-700 dark:text-slate-300">مرفق إثبات (اختياري)</Label>
                <div className="flex items-center gap-3">
                  <Input 
                    type="file" 
                    id="attachment" 
                    accept="image/*,.heic,.heif,.pdf,.doc,.docx,.jpg,.jpeg,.png"
                    onChange={(e) => {
                      if (e.target.files && e.target.files.length > 0) {
                        setExceptionFile(e.target.files[0]);
                      }
                    }} 
                    className="h-10 text-xs sm:text-sm rounded-xl cursor-pointer"
                  />
                </div>
                {exceptionFile && (
                  <p className="text-xs text-muted-foreground mt-1">الملف المختار: {exceptionFile.name}</p>
                )}
              </div>
            </div>

            <DialogFooter className="flex flex-row gap-2 justify-end pt-4 border-t border-border">
              <Button 
                onClick={handleExceptionSubmit} 
                disabled={isSubmittingException || submitExceptionMutation.isPending}
                className="h-10 px-6 rounded-xl font-bold bg-primary hover:bg-primary/95 text-white"
              >
                {isSubmittingException || submitExceptionMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  "تقديم طلب الاستثناء"
                )}
              </Button>
              <Button 
                variant="outline" 
                onClick={() => {
                  setIsExceptionModalOpen(false);
                  setExceptionReason("");
                  setExceptionFile(null);
                }} 
                className="h-10 px-5 rounded-xl font-bold"
              >
                إلغاء
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );

    if (!showLayout) {
      return (
        <div dir="rtl" className="w-full">
          {blockContent}
        </div>
      );
    }

    if (user?.role === "service_requester") {
      return (
        <BeneficiaryLayout
          activeTab="new-request"
          title="تقديم طلب خدمة جديد"
          subtitle="قم باختيار نوع الخدمة وتعبئة البيانات المطلوبة لتقديم طلبك للجمعية"
          backUrl="/requester"
          backLabel="العودة للرئيسية"
        >
          {blockContent}
        </BeneficiaryLayout>
      );
    }

    return (
      <div className="min-h-screen bg-background py-4 sm:py-8" dir="rtl">
        {blockContent}
      </div>
    );
  }

  if (!showLayout) {
    return (
      <div dir="rtl" className="w-full">
        {content}
      </div>
    );
  }

  if (user?.role === "service_requester") {
    return (
      <BeneficiaryLayout
        activeTab="new-request"
        title="تقديم طلب خدمة جديد"
        subtitle="قم باختيار نوع الخدمة وتعبئة البيانات المطلوبة لتقديم طلبك للجمعية"
        backUrl="/requester"
        backLabel="العودة للرئيسية"
      >
        {content}
      </BeneficiaryLayout>
    );
  }

  return (
    <div className="min-h-screen bg-background py-4 sm:py-8" dir="rtl">
      {content}
    </div>
  );
};

export default DynamicServiceRequestForm;
