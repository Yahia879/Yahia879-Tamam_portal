import React, { useState, useMemo } from 'react';
import { useLocation } from 'wouter';
import { trpc } from '@/lib/trpc';
import { 
  PROGRAM_CONFIGS, 
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
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { CheckCircle2, AlertCircle, ChevronRight, ChevronLeft, Plus, Loader2 } from 'lucide-react';

type Step = 'service-selection' | 'terms' | 'requester-info' | 'details' | 'review';

const STEPS: { key: Step; label: string; order: number }[] = [
  { key: 'service-selection', label: 'اختيار الخدمة', order: 1 },
  { key: 'terms', label: 'الشروط والأحكام', order: 2 },
  { key: 'requester-info', label: 'بيانات مقدم الطلب', order: 3 },
  { key: 'details', label: 'تفاصيل الطلب', order: 4 },
  { key: 'review', label: 'المراجعة والإرسال', order: 5 },
];

export const DynamicServiceRequestForm: React.FC = () => {
  const [, navigate] = useLocation();
  const [currentStep, setCurrentStep] = useState<Step>('service-selection');
  const [selectedService, setSelectedService] = useState<string | null>(null);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [agreedToTerms, setAgreedToTerms] = useState(false);

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
    return PROGRAM_CONFIGS[selectedService];
  }, [selectedService]);

  // الحصول على جميع الحقول المرئية
  const visibleFields = useMemo(() => {
    if (!selectedService) return [];
    return getVisibleFieldsForProgram(selectedService, formData);
  }, [selectedService, formData]);

  // معالج تغيير الحقول
  const handleFieldChange = (fieldName: string, value: any) => {
    setFormData((prev) => ({ ...prev, [fieldName]: value }));
    if (errors[fieldName]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[fieldName];
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

  const handleSubmit = async () => {
    if (!selectedService || !currentUser) return;
    try {
      const programData: Record<string, any> = {};
      for (const field of visibleFields) {
        if (formData[field.name] !== undefined) programData[field.name] = formData[field.name];
      }
      if (selectedProgramConfig?.requiresMosque && formData.mosqueId) {
        programData.mosqueId = formData.mosqueId;
      }
      await createRequestMutation.mutateAsync({
        programType: selectedService as any,
        programData,
        priority: 'normal',
      });
      alert('تم إرسال الطلب بنجاح');
      navigate('/my-requests');
    } catch (error: any) {
      alert(error?.message || 'حدث خطأ أثناء إرسال الطلب');
    }
  };

  const currentStepIndex = STEPS.findIndex((s) => s.key === currentStep);
  const progressPercentage = ((currentStepIndex + 1) / STEPS.length) * 100;

  return (
    <div className="min-h-screen bg-background py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* رأس الصفحة */}
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-foreground mb-2">طلبات خدمات المساجد</h1>
          <p className="text-muted-foreground">قدم طلبك للاستفادة من خدمات جمعية عمارة المساجد</p>
        </div>

        {/* شريط التقدم */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            {STEPS.map((step, index) => (
              <React.Fragment key={step.key}>
                <div className={`flex flex-col items-center ${index <= currentStepIndex ? 'opacity-100' : 'opacity-40'}`}>
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${
                      index < currentStepIndex
                        ? 'bg-primary text-primary-foreground'
                        : index === currentStepIndex
                        ? 'bg-primary text-primary-foreground ring-4 ring-primary/20'
                        : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {index < currentStepIndex ? '✓' : step.order}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 text-center max-w-[60px]">{step.label}</p>
                </div>
                {index < STEPS.length - 1 && (
                  <div className={`flex-1 h-1 mx-2 rounded-full ${index < currentStepIndex ? 'bg-primary' : 'bg-muted'}`} />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* محتوى الخطوات */}
        <Card className="p-8 shadow-lg">
          {/* الخطوة 1: اختيار الخدمة */}
          {currentStep === 'service-selection' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-foreground mb-2">اختر نوع الخدمة</h2>
                <p className="text-muted-foreground">اختر البرنامج الذي تريد تقديم طلب خدمة له</p>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3">
                {Object.values(PROGRAM_CONFIGS).map((program) => {
                  const Icon = program.icon;
                  return (
                    <Card
                      key={program.id}
                      className={`p-3 cursor-pointer transition-all hover:shadow-md gap-0 ${
                        selectedService === program.id
                          ? 'ring-2 ring-primary bg-primary/10'
                          : 'hover:border-primary/40'
                      }`}
                      onClick={() => setSelectedService(program.id)}
                    >
                      <div className={`w-9 h-9 rounded-lg ${program.color} flex items-center justify-center mb-2`}>
                        <Icon className="w-4 h-4 text-white" />
                      </div>
                      <h3 className="font-bold text-foreground text-xs sm:text-sm">{program.name}</h3>
                      <p className="text-[10px] sm:text-xs text-muted-foreground mt-1 line-clamp-2 sm:line-clamp-1">{program.description}</p>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}

          {/* الخطوة 2: الشروط والأحكام */}
          {currentStep === 'terms' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-foreground mb-2">الشروط والأحكام</h2>
              </div>
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>يرجى قراءة الشروط والأحكام بعناية قبل المتابعة</AlertDescription>
              </Alert>
              <div className="bg-muted/40 p-6 rounded-lg max-h-96 overflow-y-auto space-y-4 border border-border">
                <h3 className="font-bold text-foreground">شروط تقديم الطلب:</h3>
                <ul className="list-disc list-inside space-y-2 text-muted-foreground text-sm">
                  <li>يجب أن تكون البيانات المقدمة صحيحة وكاملة</li>
                  <li>يجب أن يكون المسجد مسجلاً في النظام</li>
                  <li>يجب الالتزام بجميع الشروط والأحكام</li>
                  <li>الجمعية تحتفظ بحق قبول أو رفض الطلب</li>
                  <li>يجب تقديم جميع المستندات المطلوبة</li>
                  <li>الطلب ملزم قانونياً بعد الموافقة عليه</li>
                </ul>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="terms"
                  checked={agreedToTerms}
                  onCheckedChange={(checked) => setAgreedToTerms(checked as boolean)}
                />
                <label htmlFor="terms" className="text-foreground cursor-pointer">
                  أوافق على الشروط والأحكام
                </label>
              </div>
            </div>
          )}

          {/* الخطوة 3: بيانات مقدم الطلب */}
          {currentStep === 'requester-info' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-foreground mb-2">بيانات مقدم الطلب</h2>
                <p className="text-muted-foreground">البيانات التالية مأخوذة من حسابك</p>
              </div>
              <div className="bg-muted/30 p-6 rounded-lg space-y-4 border border-border">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">الاسم</p>
                    <p className="font-medium text-foreground">{currentUser?.name || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">البريد الإلكتروني</p>
                    <p className="font-medium text-foreground">{currentUser?.email || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">رقم الجوال</p>
                    <p className="font-medium text-foreground">{(currentUser as any)?.phone || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">الدور</p>
                    <p className="font-medium text-foreground">{currentUser?.role || '-'}</p>
                  </div>
                </div>
              </div>
              <Alert>
                <CheckCircle2 className="h-4 w-4" />
                <AlertDescription>
                  إذا كنت تريد تعديل بيانات حسابك، يرجى الذهاب إلى صفحة الإعدادات
                </AlertDescription>
              </Alert>
            </div>
          )}

          {/* الخطوة 4: تفاصيل الطلب */}
          {currentStep === 'details' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-foreground mb-2">
                  تفاصيل الطلب - {selectedProgramConfig?.name}
                </h2>
                <p className="text-muted-foreground">{selectedProgramConfig?.description}</p>
              </div>

              {/* حالة تحميل المساجد */}
              {mosquesLoading && (
                <div className="flex items-center gap-2 text-muted-foreground text-sm">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  جاري تحميل بيانات المساجد...
                </div>
              )}

              <div className="space-y-6">
                {visibleFields.map((field) => (
                  <ConditionalField
                    key={field.name}
                    field={field}
                    formData={formData}
                    value={formData[field.name]}
                    onChange={(value) => handleFieldChange(field.name, value)}
                    error={errors[field.name]}
                    mosqueOptions={userMosques}
                    onAddMosque={() => navigate('/requester/mosques/new')}
                  />
                ))}
              </div>
            </div>
          )}

          {/* الخطوة 5: المراجعة والإرسال */}
          {currentStep === 'review' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-foreground mb-2">المراجعة والإرسال</h2>
                <p className="text-muted-foreground">يرجى مراجعة البيانات قبل إرسال الطلب</p>
              </div>
              <Alert>
                <CheckCircle2 className="h-4 w-4" />
                <AlertDescription>جميع البيانات صحيحة وكاملة. يمكنك الآن إرسال الطلب</AlertDescription>
              </Alert>
              <div className="bg-muted/30 p-6 rounded-lg space-y-6 border border-border">
                {/* ملخص البرنامج */}
                <div>
                  <p className="text-sm text-muted-foreground mb-2">نوع الخدمة</p>
                  <div className="flex items-center gap-3">
                    {selectedProgramConfig && (
                      <>
                        <div className={`w-10 h-10 rounded-lg ${selectedProgramConfig.color} flex items-center justify-center`}>
                          <selectedProgramConfig.icon className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <p className="font-bold text-foreground">{selectedProgramConfig.name}</p>
                          <p className="text-sm text-muted-foreground">{selectedProgramConfig.description}</p>
                        </div>
                      </>
                    )}
                  </div>
                </div>
                <hr className="border-border" />
                {/* بيانات مقدم الطلب */}
                <div>
                  <p className="text-sm text-muted-foreground mb-2">بيانات مقدم الطلب</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">الاسم</p>
                      <p className="font-medium text-foreground">{currentUser?.name}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">البريد</p>
                      <p className="font-medium text-foreground">{currentUser?.email}</p>
                    </div>
                  </div>
                </div>
                <hr className="border-border" />
                {/* تفاصيل الطلب */}
                <div>
                  <p className="text-sm text-muted-foreground mb-4">تفاصيل الطلب</p>
                  <div className="space-y-3">
                    {visibleFields.map((field) => (
                      <div key={field.name}>
                        <p className="text-sm text-muted-foreground">{field.label}</p>
                        <p className="font-medium text-foreground">
                          {formData[field.name] ? String(formData[field.name]) : '-'}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* أزرار التنقل */}
          <div className="flex gap-4 mt-8 pt-6 border-t border-border">
            {currentStep !== 'service-selection' && (
              <Button variant="outline" onClick={handlePreviousStep} className="flex items-center gap-2">
                <ChevronRight className="w-4 h-4" />
                السابق
              </Button>
            )}
            <div className="flex-1" />
            {currentStep !== 'review' ? (
              <Button onClick={handleNextStep} className="flex items-center gap-2">
                التالي
                <ChevronLeft className="w-4 h-4" />
              </Button>
            ) : (
              <Button
                onClick={handleSubmit}
                disabled={createRequestMutation.isPending}
                className="flex items-center gap-2 bg-primary hover:bg-primary/90"
              >
                {createRequestMutation.isPending ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> جاري الإرسال...</>
                ) : (
                  <><CheckCircle2 className="w-4 h-4" /> إرسال الطلب</>
                )}
              </Button>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
};

export default DynamicServiceRequestForm;
