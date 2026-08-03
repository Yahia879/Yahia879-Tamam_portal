import React, { useState, useMemo } from 'react';
import { useLocation, Link } from 'wouter';
import { useAuth } from '@/_core/hooks/useAuth';
import { trpc } from '@/lib/trpc';
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
  Hammer, 
  Wrench, 
  Package, 
  Receipt, 
  Sparkles, 
  Sun, 
  Droplets, 
  GlassWater,
  Info,
  ArrowRight
} from 'lucide-react';

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
      {/* رأس الصفحة مع زر الرجوع */}
      {showLayout && (
        <div className="flex items-center gap-3 sm:gap-4 mb-6 sm:mb-8">
          <Link href={user?.role === 'service_requester' ? '/requester' : '/dashboard'}>
            <Button variant="ghost" size="icon" className="flex-shrink-0">
              <ArrowRight className="w-5 h-5" />
            </Button>
          </Link>
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold text-foreground truncate">طلبات خدمات المساجد</h1>
            <p className="text-xs sm:text-sm text-muted-foreground truncate">قدم طلبك للاستفادة من خدمات جمعية عمارة المساجد</p>
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
      <Card className="p-4 sm:p-8 shadow-xl border-0 sm:border rounded-2xl sm:rounded-3xl">
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
          <div className="space-y-5 sm:space-y-6">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-foreground mb-1 sm:mb-2">
                تفاصيل الطلب - {selectedProgramConfig?.name}
              </h2>
              <p className="text-sm sm:text-base text-muted-foreground">{selectedProgramConfig?.description}</p>
            </div>

            {/* حالة تحميل المساجد */}
            {mosquesLoading && (
              <div className="flex items-center gap-2 text-muted-foreground text-xs sm:text-sm">
                <Loader2 className="w-4 h-4 animate-spin text-primary" />
                جاري تحميل بيانات المساجد...
              </div>
            )}

            <div className="space-y-4 sm:space-y-6">
              {(selectedService === 'bunyan'
                ? visibleFields.filter(f => f.name !== 'womenPrayerArea' && f.name !== 'womenPrayerCapacity')
                : visibleFields
              ).map((field) => (
                <React.Fragment key={field.name}>
                  <div className="space-y-4">
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
                    <>
                      <div className="flex items-center gap-2 py-2 mt-2 mb-4 animate-in fade-in duration-200">
                        <Checkbox
                          id="hasPrayerHall"
                          checked={!!formData.hasPrayerHall}
                          onCheckedChange={(checked) => {
                            const isChecked = checked as boolean;
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
                        />
                        <label htmlFor="hasPrayerHall" className="cursor-pointer text-xs sm:text-sm select-none font-medium text-foreground">
                          هل يوجد مصلى نساء؟
                        </label>
                      </div>

                      {formData.hasPrayerHall && (
                        <div className="mt-4 p-4 border rounded-lg bg-muted/30 space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
                          <h4 className="font-semibold text-xs sm:text-sm text-primary flex items-center gap-1.5 border-b pb-2">
                            <Building2 className="w-4 h-4" />
                            معلومات مصلى النساء
                          </h4>
                          <div className="grid grid-cols-2 gap-3 sm:gap-4">
                            <div className="space-y-1.5">
                              <label htmlFor="womenPrayerCapacity" className="text-[11px] sm:text-xs font-medium text-foreground">سعة مصلى النساء (مصلي) *</label>
                              <Input
                                id="womenPrayerCapacity"
                                type="number"
                                value={formData.womenPrayerCapacity || ''}
                                onChange={(e) => handleFieldChange("womenPrayerCapacity", e.target.value)}
                                placeholder="مثال: 50"
                                className={`h-9 sm:h-10 text-xs sm:text-sm bg-white ${errors.womenPrayerCapacity ? 'border-red-500' : ''}`}
                              />
                              {errors.womenPrayerCapacity && (
                                <p className="text-[11px] sm:text-xs text-red-500">{errors.womenPrayerCapacity}</p>
                              )}
                            </div>
                            <div className="space-y-1.5">
                              <label htmlFor="womenPrayerArea" className="text-[11px] sm:text-xs font-medium text-foreground">المساحة (م²) *</label>
                              <Input
                                id="womenPrayerArea"
                                type="number"
                                value={formData.womenPrayerArea || ''}
                                onChange={(e) => handleFieldChange("womenPrayerArea", e.target.value)}
                                placeholder="مثال: 50"
                                className={`h-9 sm:h-10 text-xs sm:text-sm bg-white ${errors.womenPrayerArea ? 'border-red-500' : ''}`}
                              />
                              {errors.womenPrayerArea && (
                                <p className="text-[11px] sm:text-xs text-red-500">{errors.womenPrayerArea}</p>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </React.Fragment>
              ))}

              {/* حقل رفع المرفق الاختياري */}
              <div className="pt-5 sm:pt-6 border-t border-border">
                <label className="flex items-center gap-2 text-sm sm:text-base font-bold mb-3 text-foreground">
                  <Paperclip className="w-4 h-4 text-primary" />
                  رفع مرفق (اختياري)
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
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full h-12 sm:h-14 border-2 border-dashed hover:border-primary/50 hover:bg-primary/5 transition-all rounded-xl"
                    onClick={() => document.getElementById('request-attachment')?.click()}
                  >
                    {selectedFile ? (
                      <span className="flex items-center gap-2 text-primary font-bold">
                        <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5" />
                        <span className="truncate max-w-[200px] sm:max-w-none">{selectedFile.name}</span>
                      </span>
                    ) : (
                      <span className="flex items-center gap-2 text-muted-foreground font-medium">
                        <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
                        اضغط لاختيار ملف (PDF, Image, Word)
                      </span>
                    )}
                  </Button>
                  {selectedFile && (
                    <button 
                      onClick={() => setSelectedFile(null)}
                      className="text-xs sm:text-sm text-destructive hover:underline self-start font-medium px-1"
                    >
                      إزالة الملف
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* الخطوة 5: المراجعة والإرسال */}
        {currentStep === 'review' && (
          <div className="space-y-5 sm:space-y-6">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-foreground mb-1 sm:mb-2">المراجعة والإرسال</h2>
              <p className="text-sm sm:text-base text-muted-foreground">يرجى مراجعة البيانات قبل إرسال الطلب</p>
            </div>
            <Alert className="bg-green-50 border-green-100 text-green-800 p-3">
              <CheckCircle2 className="h-4 w-4" />
              <AlertDescription className="text-xs sm:text-sm font-medium">جميع البيانات صحيحة وكاملة. يمكنك الآن إرسال الطلب</AlertDescription>
            </Alert>
            <div className="bg-muted/20 p-4 sm:p-6 rounded-xl space-y-6 border border-border shadow-inner">
              {/* ملخص البرنامج */}
              <div className="bg-background p-4 rounded-xl border border-border shadow-sm">
                <p className="text-[10px] sm:text-xs text-muted-foreground mb-2 uppercase tracking-wider font-bold">نوع الخدمة</p>
                <div className="flex items-center gap-3">
                  {selectedProgramConfig && (
                    <>
                      <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl ${selectedProgramConfig.color || 'bg-indigo-600'} flex items-center justify-center shadow-md`}>
                        {React.createElement(ICON_MAP[selectedProgramConfig.icon || 'Package'] || Package, { className: "w-5 h-5 sm:w-6 sm:h-6 text-white" })}
                      </div>
                      <div>
                        <p className="font-bold text-foreground text-sm sm:text-base">{selectedProgramConfig.name}</p>
                        <p className="text-xs sm:text-sm text-muted-foreground">{selectedProgramConfig.description}</p>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* بيانات مقدم الطلب */}
              <div className="bg-background p-4 rounded-xl border border-border shadow-sm">
                <p className="text-[10px] sm:text-xs text-muted-foreground mb-3 uppercase tracking-wider font-bold">بيانات مقدم الطلب</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs sm:text-sm">
                  <div>
                    <p className="text-muted-foreground mb-0.5">الاسم</p>
                    <p className="font-bold text-foreground">{currentUser?.name}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground mb-0.5">البريد</p>
                    <p className="font-bold text-foreground truncate">{currentUser?.email}</p>
                  </div>
                </div>
              </div>

              {/* تفاصيل الطلب */}
              <div className="bg-background p-4 rounded-xl border border-border shadow-sm">
                <p className="text-[10px] sm:text-xs text-muted-foreground mb-4 uppercase tracking-wider font-bold">تفاصيل الطلب</p>
                <div className="space-y-4">
                  {visibleFields.map((field) => (
                    <React.Fragment key={field.name}>
                      <div className="border-b border-border last:border-0 pb-3 last:pb-0">
                        <p className="text-[10px] sm:text-xs text-muted-foreground mb-1">{field.label}</p>
                        <p className="font-medium text-foreground text-xs sm:text-sm whitespace-pre-wrap break-words leading-relaxed">
                          {formData[field.name] ? String(formData[field.name]) : '-'}
                        </p>
                      </div>
                      {selectedService === 'bunyan' && field.name === 'actualWorshippers' && (
                        <div className="border-b border-border pb-3 last:border-0 animate-fade-in">
                          <p className="text-[10px] sm:text-xs text-muted-foreground mb-1">مصلى النساء</p>
                          <p className="font-medium text-foreground text-xs sm:text-sm">
                            {formData.hasPrayerHall ? 'يوجد مصلى للنساء' : 'لا يوجد مصلى للنساء'}
                          </p>
                        </div>
                      )}
                    </React.Fragment>
                  ))}
                  {selectedFile && (
                    <div className="pt-1">
                      <p className="text-[10px] sm:text-xs text-muted-foreground mb-1">المرفق</p>
                      <p className="font-bold text-primary flex items-center gap-1.5 text-xs sm:text-sm">
                        <Paperclip className="w-3 h-3 sm:w-4 sm:h-4" />
                        {selectedFile.name}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* أزرار التنقل */}
        <div className="flex flex-row items-center justify-between gap-3 mt-8 pt-6 border-t border-border">
          {currentStep !== 'service-selection' ? (
            <Button variant="outline" onClick={handlePreviousStep} className="flex items-center gap-1 sm:gap-2 h-10 sm:h-11 px-3 sm:px-5 rounded-xl font-bold">
              <ChevronRight className="w-4 h-4" />
              <span className="text-xs sm:text-sm">السابق</span>
            </Button>
          ) : (
            <div /> // Placeholder to keep Next button on the left (RTL)
          )}
          
          {currentStep !== 'review' ? (
            <Button onClick={handleNextStep} className="flex items-center gap-1 sm:gap-2 h-10 sm:h-11 px-6 sm:px-8 rounded-xl font-bold bg-primary hover:bg-primary/90">
              <span className="text-xs sm:text-sm">التالي</span>
              <ChevronLeft className="w-4 h-4" />
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting || createRequestMutation.isPending || uploadAttachmentMutation.isPending}
              className="flex items-center gap-2 h-10 sm:h-11 px-5 sm:px-8 rounded-xl font-bold bg-primary hover:bg-primary/90 shadow-md shadow-primary/20"
            >
              {isSubmitting || createRequestMutation.isPending || uploadAttachmentMutation.isPending ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> <span className="text-xs sm:text-sm">جاري الإرسال...</span></>
              ) : (
                <><CheckCircle2 className="w-4 h-4" /> <span className="text-xs sm:text-sm">إرسال الطلب</span></>
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
        {/* رأس الصفحة مع زر الرجوع */}
        {showLayout && (
          <div className="flex items-center gap-3 sm:gap-4 mb-6 sm:mb-8">
            <Link href={user?.role === 'service_requester' ? '/requester' : '/dashboard'}>
              <Button variant="ghost" size="icon" className="flex-shrink-0">
                <ArrowRight className="w-5 h-5" />
              </Button>
            </Link>
            <div className="min-w-0">
              <h1 className="text-xl sm:text-2xl font-bold text-foreground truncate">طلبات خدمات المساجد</h1>
              <p className="text-xs sm:text-sm text-muted-foreground truncate">قدم طلبك للاستفادة من خدمات جمعية عمارة المساجد</p>
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

  return (
    <div className="min-h-screen bg-background py-4 sm:py-8" dir="rtl">
      {content}
    </div>
  );
};

export default DynamicServiceRequestForm;
