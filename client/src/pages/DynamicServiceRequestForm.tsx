import React, { useState, useMemo } from 'react';
import { useLocation, Link } from 'wouter';
import { useAuth } from '@/_core/hooks/useAuth';
import { trpc } from '@/lib/trpc';
import { ROLE_LABELS } from '@shared/constants';
import BeneficiaryLayout from '@/components/BeneficiaryLayout';
import { 
  getAllFieldsForProgram,
  getVisibleFieldsForProgram,
  shouldShowField,
  SHARED_FIELDS,
  FormField,
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
  Eye,
  ExternalLink,
  Download,
  FileText,
  X,
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
  const { data: myRequestsData, isLoading: myRequestsLoading } = trpc.requests.getMyRequests.useQuery(undefined, {
    enabled: !!user && user.role === "service_requester" && user.requesterType === "imam"
  });
  const myRequests = myRequestsData?.requests || [];

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

  // حالة معاينة المستندات والصور (Lightbox) تماماً كما في صفحة الموردين
  const [previewDoc, setPreviewDoc] = useState<{ title: string; contentType?: string } | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>("");

  const handleViewFile = (file: File, title: string = file.name) => {
    if (previewUrl && previewUrl.startsWith("blob:")) {
      URL.revokeObjectURL(previewUrl);
    }
    const objectUrl = URL.createObjectURL(file);
    const ext = file.name.split('.').pop()?.toLowerCase() || '';
    let contentType = file.type;
    if (!contentType) {
      if (ext === 'pdf') contentType = 'application/pdf';
      else if (['jpg', 'jpeg'].includes(ext)) contentType = 'image/jpeg';
      else if (ext === 'png') contentType = 'image/png';
      else if (ext === 'webp') contentType = 'image/webp';
      else if (ext === 'gif') contentType = 'image/gif';
      else if (ext === 'docx') contentType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
      else if (ext === 'doc') contentType = 'application/msword';
      else contentType = 'application/octet-stream';
    }
    setPreviewUrl(objectUrl);
    setPreviewDoc({ title, contentType });
  };

  const handleClosePreview = () => {
    if (previewUrl && previewUrl.startsWith("blob:")) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl("");
    setPreviewDoc(null);
  };

  const handleDownloadPreview = () => {
    if (!previewDoc || !selectedFile) return;
    const link = document.createElement("a");
    link.href = previewUrl;
    link.download = previewDoc.title || selectedFile.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

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
    { enabled: !!user }
  );
  // undefined = جاري التحميل، [] = لا توجد مساجد، [...] = توجد مساجد
  const userMosques: Array<{ id: number; name: string; city?: string; district?: string; address?: string; mosqueType?: string; area?: any; capacity?: any; hasPrayerHall?: boolean; notes?: string; approvalStatus?: string }> | undefined =
    mosquesLoading ? undefined : ((mosquesResult?.mosques as any) ?? []);

  // الحصول على المسجد المختار حالياً
  const currentMosque = useMemo(() => {
    if (!formData.mosqueId) return null;
    return userMosques?.find((m: any) => m.id === Number(formData.mosqueId)) || null;
  }, [formData.mosqueId, userMosques]);

  // التحقق مما إذا كان المسجد المختار غير معتمد (قيد المراجعة أو مرفوض)
  const isCurrentMosqueUnapproved = useMemo(() => {
    if (selectedService === 'bunyan' || !currentMosque) return false;
    return currentMosque.approvalStatus && currentMosque.approvalStatus !== 'approved';
  }, [selectedService, currentMosque]);

  // الحصول على إعدادات البرنامج المختار
  const selectedProgramConfig = useMemo(() => {
    if (!selectedService) return null;
    return activePrograms.find(p => p.id === selectedService);
  }, [selectedService, activePrograms]);

  // الحصول على إعدادات النموذج المخصصة للخدمة من مركز التخصيص
  const { data: customFormConfig } = trpc.forms.getServiceFormConfig.useQuery(
    { serviceId: selectedService || "" },
    { enabled: !!selectedService }
  );

  // الحصول على جميع الحقول المرئية (إما المخصصة من النظام أو الافتراضية)
  const visibleFields = useMemo(() => {
    if (!selectedService) return [];

    // إذا كان هناك تخصيص محفوظ للحقول من خلال لوحة تخصيص النماذج
    if (customFormConfig && customFormConfig.fields && customFormConfig.fields.length > 0) {
      // تطبيق الشروط المنطقية للحقول المعتمدة على إجابات سابقة (مثل وجود أرض أو متبرع في بنيان)
      const CONDITIONAL_RULES: Record<string, { dependsOn: string; condition: (val: any) => boolean }> = {
        landOwnership: { dependsOn: 'hasLand', condition: (val) => val === 'yes' },
        landArea: { dependsOn: 'hasLand', condition: (val) => val === 'yes' },
        landProposal: { dependsOn: 'hasLand', condition: (val) => val === 'yes' },
        donationAmount: { dependsOn: 'hasDonor', condition: (val) => val === 'yes' },
      };

      const activeCustomFields: FormField[] = customFormConfig.fields
        .filter((f) => f.isActive)
        .sort((a, b) => a.order - b.order)
        .map((f) => ({
          name: f.id,
          type: f.type as any,
          label: f.label,
          placeholder: f.placeholder,
          help: f.helpText,
          required: f.required,
          options: f.options,
          validation: f.required ? { minLength: 1 } : undefined,
          conditional: CONDITIONAL_RULES[f.id],
        }))
        .filter((f) => shouldShowField(f, formData));

      // إضافة حقول مصلى النساء إذا تم تحديد ذلك
      if (formData && formData.hasPrayerHall) {
        const womenFields = [SHARED_FIELDS['womenPrayerArea'], SHARED_FIELDS['womenPrayerCapacity']].filter(Boolean);
        const insertIndex = activeCustomFields.findIndex(f => f.name === 'actualWorshippers');
        if (insertIndex !== -1) {
          activeCustomFields.splice(insertIndex + 1, 0, ...womenFields);
        } else {
          const mosqueIdIndex = activeCustomFields.findIndex(f => f.name === 'mosqueId');
          if (mosqueIdIndex !== -1) {
            activeCustomFields.splice(mosqueIdIndex + 1, 0, ...womenFields);
          } else {
            activeCustomFields.push(...womenFields);
          }
        }
      }

      return activeCustomFields;
    }

    return getVisibleFieldsForProgram(selectedService, formData);
  }, [selectedService, formData, customFormConfig]);

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
          if (selectedMosque.district) {
            updated.district = selectedMosque.district;
          }
          if (selectedMosque.city) {
            updated.city = selectedMosque.city;
          }
          if (selectedMosque.address) {
            updated.address = selectedMosque.address;
          }
          if (selectedMosque.mosqueType) {
            updated.mosqueType = selectedMosque.mosqueType;
          }
          if (selectedMosque.name) {
            updated.mosqueName = selectedMosque.name;
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
          delete updated.district;
          delete updated.city;
          delete updated.address;
          delete updated.mosqueType;
          delete updated.mosqueName;
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
      if (isCurrentMosqueUnapproved) {
        alert(`عذراً، المسجد المختار (${currentMosque?.name}) غير معتمد بعد. لا يمكن تقديم طلب خدمة إلا للمساجد المعتمدة.`);
        return;
      }

      if (customFormConfig && customFormConfig.fields && customFormConfig.fields.length > 0) {
        const customErrors: Record<string, string> = {};
        for (const field of visibleFields) {
          const val = formData[field.name];
          if (field.required && (val === undefined || val === null || val === "" || (Array.isArray(val) && val.length === 0))) {
            customErrors[field.name] = `${field.label} مطلوب`;
          }
          if (field.name === 'willingToVolunteer' && val === 'no') {
            customErrors[field.name] = "عذراً، لا يمكن إكمال إنشاء الطلب دون وجود فريق تطوعي. يرجى تأمين الفريق للمتابعة.";
          }
        }
        if (hasErrors(customErrors)) {
          setErrors(customErrors);
          alert('يرجى ملء جميع الحقول المطلوبة');
          return;
        }
      } else {
        const newErrors = validateAllFields(selectedService!, formData);
        if (hasErrors(newErrors)) {
          setErrors(newErrors);
          alert('يرجى ملء جميع الحقول المطلوبة');
          return;
        }
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

  const handlePrint = () => {
    const isDark = document.documentElement.classList.contains("dark");
    if (isDark) {
      document.documentElement.classList.remove("dark");
    }

    const prevTitle = document.title;
    if (selectedProgramConfig?.name) {
      document.title = `استمارة طلب خدمة - ${selectedProgramConfig.name}`;
    }

    window.print();

    setTimeout(() => {
      if (isDark) {
        document.documentElement.classList.add("dark");
      }
      document.title = prevTitle;
    }, 600);
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
    <>
      <div className="max-w-4xl mx-auto px-0 sm:px-4 print:hidden">
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
        <div className="flex items-center justify-between min-w-[320px] sm:min-w-0 px-1">
          {STEPS.map((step, index) => (
            <React.Fragment key={step.key}>
              <div className={`flex flex-col items-center justify-start self-start shrink-0 min-h-[64px] sm:min-h-[88px] ${index <= currentStepIndex ? 'opacity-100' : 'opacity-40'}`}>
                <div
                  className={`w-7 h-7 sm:w-10 sm:h-10 rounded-full flex items-center justify-center font-bold text-[10px] sm:text-sm transition-all duration-300 ${
                    index < currentStepIndex
                      ? 'bg-primary text-primary-foreground'
                      : index === currentStepIndex
                      ? 'bg-primary text-primary-foreground ring-2 sm:ring-4 ring-primary/20 scale-105 sm:scale-110'
                      : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {index < currentStepIndex ? '✓' : step.order}
                </div>
                <p className={`text-[9px] sm:text-xs mt-1 text-center max-w-[55px] sm:max-w-[80px] leading-tight ${index === currentStepIndex ? 'text-primary font-bold' : 'text-muted-foreground font-medium'}`}>
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
      <Card className="p-4 sm:p-8 lg:p-10 shadow-xl border border-border/60 rounded-2xl sm:rounded-3xl bg-background overflow-hidden">
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
                  <p className="text-sm sm:text-base font-bold text-foreground">
                    {currentUser?.role ? (ROLE_LABELS[currentUser.role] || (currentUser.role === 'service_requester' ? 'طالب الخدمة' : currentUser.role)) : '-'}
                  </p>
                </div>
              </div>
            </div>
            <Alert className="bg-primary/5 dark:bg-primary/10 border border-primary/20 dark:border-primary/30 text-foreground p-3.5 rounded-2xl flex items-center gap-3">
              <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
              <AlertDescription className="text-xs sm:text-sm text-foreground/90 font-medium leading-relaxed">
                إذا كنت تريد تعديل بيانات حسابك، يرجى الذهاب إلى{" "}
                <Link href="/profile" className="text-primary font-bold underline underline-offset-4 hover:opacity-80">
                  صفحة المعلومات الشخصية
                </Link>
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

                const isFileField = field.name === 'attachment' || field.type === 'file';

                if (isFileField) {
                  return (
                    <React.Fragment key={field.name}>
                      <div className="col-span-1 sm:col-span-2 pt-2">
                        <label className="flex items-center gap-2 text-xs sm:text-sm font-bold mb-3 text-foreground">
                          <Paperclip className="w-4 h-4 text-primary" />
                          <span>{field.label || 'المرفقات والوثائق الداعمة'}</span>
                          {field.required && <span className="text-red-500 font-bold">*</span>}
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
                              handleFieldChange(field.name, file ? file.name : '');
                            }}
                          />

                          {selectedFile ? (
                            <div className="p-4 rounded-2xl border-2 border-emerald-500/40 bg-emerald-50/50 dark:bg-emerald-950/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
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
                              <div className="flex items-center gap-2 w-full sm:w-auto justify-end shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-emerald-200/40">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleViewFile(selectedFile, selectedFile.name)}
                                  className="h-8 text-xs text-primary hover:text-primary/80 font-semibold gap-1 shrink-0 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-lg"
                                >
                                  <Eye className="h-3.5 w-3.5" />
                                  معاينة
                                </Button>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    setSelectedFile(null);
                                    handleFieldChange(field.name, '');
                                  }}
                                  className="rounded-lg text-destructive hover:bg-destructive/10 text-xs font-semibold gap-1 h-8 px-2.5"
                                >
                                  <Trash2 className="w-4 h-4" />
                                  <span>إزالة</span>
                                </Button>
                              </div>
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
                                {field.placeholder || "اضغط لرفع ملف أو اسحبه إلى هنا"}
                              </p>
                              <p className="text-[11px] text-muted-foreground mt-1">
                                يدعم ملفات PDF، الصور، ومستندات Word (الحد الأقصى 10 ميجابايت)
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    </React.Fragment>
                  );
                }

                if (selectedService === 'bunyan' && field.name === 'hasPrayerHall') {
                  return (
                    <React.Fragment key={field.name}>
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
                              <p className="font-bold text-xs sm:text-sm text-foreground">{field.label || 'هل يتضمن المشروع مصلى للنساء؟'}</p>
                              <p className="text-[11px] text-muted-foreground mt-0.5">{field.help || (field as any).helpText || 'حدد إذا المسجد يشمل قسماً مخصصاً لمصلى النساء'}</p>
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
                    </React.Fragment>
                  );
                }

                const hasDedicatedPrayerHall = visibleFields.some(f => f.name === 'hasPrayerHall');

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

                    {field.name === 'mosqueId' && isCurrentMosqueUnapproved && (
                      <div className="col-span-1 sm:col-span-2 animate-in fade-in-50 duration-200">
                        <Alert className="border-amber-500/40 bg-amber-500/10 dark:bg-amber-950/20 text-amber-900 dark:text-amber-200 p-4 rounded-2xl shadow-xs">
                          <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0" />
                          <div className="space-y-1 text-right">
                            <AlertTitle className="text-sm sm:text-base font-bold">لا يمكن تقديم طلب خدمة لمسجد غير معتمد</AlertTitle>
                            <AlertDescription className="text-xs sm:text-sm leading-relaxed text-amber-800 dark:text-amber-300">
                              المسجد المختار (<span className="font-bold">{currentMosque?.name}</span>) حالته الحالية:{" "}
                              <span className="font-bold underline underline-offset-4">
                                {currentMosque?.approvalStatus === 'pending' ? 'قيد المراجعة والتدقيق' : currentMosque?.approvalStatus === 'rejected' ? 'مرفوض' : 'غير معتمد'}
                              </span>
                              . لا يُسمح بإكمال أو إرسال طلبات الخدمات إلا للمساجد المعتمدة رسمياً من قِبل إدارة الجمعية.
                            </AlertDescription>
                          </div>
                        </Alert>
                      </div>
                    )}

                    {!hasDedicatedPrayerHall && selectedService === 'bunyan' && field.name === 'actualWorshippers' && (
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
                onClick={handlePrint}
                className="gap-2 font-bold rounded-2xl h-11 px-5 border-primary/30 text-primary hover:bg-primary/5 shadow-xs self-start sm:self-center"
              >
                <Printer className="w-4 h-4" />
                <span>طباعة مسودة الطلب</span>
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
                    <p className="font-bold text-foreground">{user?.name || '-'}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground mb-0.5 font-medium">البريد الإلكتروني</p>
                    <p className="font-bold text-foreground truncate">{user?.email || '-'}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground mb-0.5 font-medium">رقم الجوال</p>
                    <p className="font-bold text-foreground font-mono" dir="ltr">{user?.phone || '-'}</p>
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
                    <div className="pt-2 border-t border-border/60">
                      <p className="text-[11px] sm:text-xs text-muted-foreground mb-2 font-medium">المرفقات والوثائق الداعمة</p>
                      <div className="p-3 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-150 dark:border-slate-800 shadow-2xs flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                            <FileText className="h-5 w-5 text-primary" />
                          </div>
                          <div className="min-w-0 text-right">
                            <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">{selectedFile.name}</p>
                            <p className="text-[10px] text-muted-foreground font-mono">
                              {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
                            </p>
                          </div>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewFile(selectedFile, selectedFile.name)}
                          className="h-8 text-xs text-primary hover:text-primary/80 font-semibold gap-1 shrink-0 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-lg"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          معاينة
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}



        {/* أزرار التنقل */}
        <div className="flex flex-row items-center justify-between gap-2.5 sm:gap-3 mt-6 sm:mt-8 pt-4 sm:pt-6 border-t border-border/60">
          {currentStep !== 'service-selection' ? (
            <Button
              variant="outline"
              size="lg"
              onClick={handlePreviousStep}
              className="rounded-xl sm:rounded-2xl font-bold h-10 sm:h-12 px-4 sm:px-6 gap-1.5 sm:gap-2 text-xs sm:text-sm shadow-xs hover:bg-muted"
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
              disabled={Boolean(currentStep === 'details' && isCurrentMosqueUnapproved)}
              className="rounded-xl sm:rounded-2xl font-bold h-10 sm:h-12 px-5 sm:px-8 gap-1.5 sm:gap-2 text-xs sm:text-sm gradient-primary text-white shadow-md hover:opacity-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span>التالي</span>
              <ChevronLeft className="w-4 h-4" />
            </Button>
          ) : (
            <Button
              size="lg"
              onClick={handleSubmit}
              disabled={isSubmitting || createRequestMutation.isPending || uploadAttachmentMutation.isPending}
              className="rounded-xl sm:rounded-2xl font-bold h-10 sm:h-12 px-5 sm:px-8 gap-1.5 sm:gap-2 text-xs sm:text-sm gradient-primary text-white shadow-md hover:opacity-95 transition-all"
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

      {/* نافذة معاينة الصور الفاخرة (Lightbox Modal) تماماً كما في صفحة الموردين */}
      {previewDoc && (() => {
        const contentType = previewDoc.contentType || "";
        const isImage = contentType.startsWith("image/") || !!previewDoc.title.match(/\.(jpg|jpeg|png|webp|gif|svg)$/i);
        const isPdf = contentType === "application/pdf" || previewDoc.title.toLowerCase().endsWith(".pdf");
        const isDocx = contentType.includes("wordprocessingml.document") || previewDoc.title.toLowerCase().endsWith(".docx");

        return (
          <div 
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 backdrop-blur-md p-4 animate-in fade-in duration-200"
            onClick={handleClosePreview}
          >
            <div 
              className="relative max-w-5xl w-full h-[90vh] flex flex-col items-center bg-slate-900/95 border border-slate-800 rounded-2xl p-2 sm:p-4 shadow-2xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close button */}
              <button 
                onClick={handleClosePreview}
                className="absolute top-4 right-4 bg-slate-800/80 hover:bg-red-600/80 text-white rounded-full p-2.5 transition-all z-10 shadow-lg cursor-pointer"
                title="إغلاق"
              >
                <X className="w-5 h-5" />
              </button>
 
              {/* Download button */}
              <button 
                onClick={handleDownloadPreview}
                className="absolute top-4 left-4 bg-slate-800/80 hover:bg-primary/80 text-white rounded-full p-2.5 transition-all flex items-center gap-1.5 px-4 z-10 shadow-lg cursor-pointer"
                title="تحميل"
              >
                <Download className="w-4 h-4" />
                <span className="text-xs font-bold hidden sm:inline">تحميل</span>
              </button>

              {/* Document/Image container */}
              <div className="w-full flex-1 flex items-center justify-center p-2 overflow-hidden mt-12 mb-2 min-h-[50vh]">
                {isImage ? (
                  <div className="w-full h-full flex items-center justify-center overflow-auto">
                    <img 
                      src={previewUrl} 
                      alt={previewDoc.title} 
                      className="max-w-full max-h-[70vh] object-contain rounded-lg shadow-md border border-slate-800 bg-white"
                    />
                  </div>
                ) : isPdf ? (
                  <iframe 
                    src={previewUrl} 
                    title={previewDoc.title} 
                    className="w-full h-full border border-slate-800 rounded-lg bg-white shadow-lg"
                  />
                ) : isDocx ? (
                  <div 
                    id="docx-preview-container" 
                    className="w-full h-full overflow-y-auto bg-white rounded-lg p-6 border shadow-inner flex justify-center text-black"
                    dir="ltr"
                  >
                    <div className="flex flex-col items-center justify-center py-20 gap-3">
                      <Loader2 className="w-8 h-8 animate-spin text-primary" />
                      <span className="text-sm text-slate-500 font-medium font-sans">جاري معالجة مستند Word...</span>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center p-8 bg-slate-850 border border-slate-700/60 rounded-2xl max-w-md w-full text-center shadow-lg">
                    <div className="p-4 bg-slate-800 rounded-full mb-4">
                      {contentType.includes("spreadsheet") || contentType.includes("excel") ? (
                        <FileText className="w-12 h-12 text-emerald-400" />
                      ) : contentType.includes("word") || contentType.includes("msword") ? (
                        <FileText className="w-12 h-12 text-blue-400" />
                      ) : (
                        <FileText className="w-12 h-12 text-amber-400" />
                      )}
                    </div>
                    <h3 className="text-base font-bold text-slate-100 mb-2">{previewDoc.title}</h3>
                    <p className="text-xs text-slate-400 mb-6 max-w-xs leading-relaxed">
                      هذا الملف لا يمكن معاينته مباشرة في المتصفح. يرجى تحميله لفتحه واستعراض محتواه.
                    </p>
                    <Button 
                      onClick={handleDownloadPreview}
                      className="w-full flex items-center justify-center gap-2"
                    >
                      <Download className="w-4 h-4" />
                      تحميل المستند
                    </Button>
                  </div>
                )}
              </div>

              {/* Caption/Name */}
              <div className="mt-2 text-center px-4 py-2.5 w-full border-t border-slate-800/80 bg-slate-950/20 flex justify-between items-center text-slate-300">
                <p className="text-xs font-medium flex items-center gap-1.5">
                  <Info className="h-4 w-4 text-slate-400" />
                  معاينة مستند - {previewDoc.title}
                </p>
                <p className="text-xs font-bold">{previewDoc.title}</p>
              </div>
            </div>
          </div>
        );
      })()}

      {/* تقرير الطباعة الرسمي A4 الذي يظهر داخل نفس الصفحة عند أمر الطباعة */}
      <div className="hidden print:block printable-report-container w-full max-w-[210mm] mx-auto p-0 bg-white font-sans text-slate-900" dir="rtl">
        {/* ترويسة التقرير: الشعار، اسم الجمعية، والتاريخ */}
        <div className="flex justify-between items-center pb-3 mb-4 border-b border-slate-300">
          <div className="flex items-center gap-3">
            {orgSettings?.logoUrl ? (
              <img src={orgSettings.logoUrl} alt="شعار الجمعية" className="h-14 w-auto object-contain" />
            ) : (
              <div className="w-12 h-12 bg-emerald-50 rounded-lg flex items-center justify-center border border-emerald-200">
                <span className="text-[#1a5f4a] font-bold text-lg">منارة</span>
              </div>
            )}
            <div>
              <h2 className="text-base font-extrabold text-[#1a5f4a]">
                {orgSettings?.officialReportsName || "جمعية عمارة المساجد (منارة)"}
              </h2>
            </div>
          </div>

          <div className="text-xs space-y-1 text-left pl-1">
            <div className="flex items-center justify-end gap-2">
              <span className="font-bold text-slate-600">التاريخ:</span>
              <span className="font-bold text-slate-900">{formatGregorianDate(new Date())}</span>
            </div>
          </div>
        </div>

        {/* بانر العنوان الرئيسي */}
        <div className="text-center py-2.5 px-4 mb-4 rounded-lg bg-[#1a5f4a] text-white">
          <h1 className="text-base font-bold">
            استمارة طلب خدمة: {selectedProgramConfig?.name || 'خدمة مساجد'}
          </h1>
        </div>

        {/* أولاً: بيانات مقدم الطلب */}
        <div className="mb-4 border border-slate-300 rounded-lg overflow-hidden bg-white">
          <div className="bg-slate-100/90 px-3 py-1.5 font-bold text-xs text-[#1a5f4a] border-b border-slate-300">
            أولاً: بيانات مقدم الطلب
          </div>
          <table className="w-full text-xs border-collapse">
            <tbody>
              <tr className="border-b border-slate-200">
                <td className="p-2.5 bg-slate-50 font-bold text-slate-600 w-1/4 border-l border-slate-200">الاسم الكامل:</td>
                <td className="p-2.5 font-bold text-slate-900 w-1/4 border-l border-slate-200">{user?.name || '—'}</td>
                <td className="p-2.5 bg-slate-50 font-bold text-slate-600 w-1/4 border-l border-slate-200">الصفة / نوع الحساب:</td>
                <td className="p-2.5 text-slate-900 w-1/4">{user?.requesterType === 'imam' ? 'إمام / مؤذن مسجد' : 'طالب خدمة مساجد'}</td>
              </tr>
              <tr>
                <td className="p-2.5 bg-slate-50 font-bold text-slate-600 border-l border-slate-200">البريد الإلكتروني:</td>
                <td className="p-2.5 text-slate-900 border-l border-slate-200">{user?.email || '—'}</td>
                <td className="p-2.5 bg-slate-50 font-bold text-slate-600 border-l border-slate-200">رقم الجوال:</td>
                <td className="p-2.5 text-slate-900" dir="ltr" style={{ textAlign: 'right' }}>{user?.phone || '—'}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* ثانياً: بيانات المسجد والموقع */}
        <div className="mb-4 border border-slate-300 rounded-lg overflow-hidden bg-white">
          <div className="bg-slate-100/90 px-3 py-1.5 font-bold text-xs text-[#1a5f4a] border-b border-slate-300">
            {selectedService === 'bunyan' ? 'ثانياً: بيانات الموقع والأرض المقترحة للمسجد' : 'ثانياً: بيانات المسجد والموقع'}
          </div>
          <table className="w-full text-xs border-collapse">
            <tbody>
              {selectedService === 'bunyan' ? (
                <>
                  <tr className="border-b border-slate-200">
                    <td className="p-2.5 bg-slate-50 font-bold text-slate-600 w-1/4 border-l border-slate-200">نوع المشروع:</td>
                    <td className="p-2.5 font-bold text-slate-900 w-1/4 border-l border-slate-200">
                      {formData.buildingType === 'new' ? 'بناء جديد' : formData.buildingType === 'stalled' ? 'استكمال متعثر' : 'بناء وتشييد مسجد جديد'}
                    </td>
                    <td className="p-2.5 bg-slate-50 font-bold text-slate-600 w-1/4 border-l border-slate-200">المدينة / المنطقة:</td>
                    <td className="p-2.5 text-slate-900 w-1/4">{formData.city || orgSettings?.city || '—'}</td>
                  </tr>
                  <tr className="border-b border-slate-200">
                    <td className="p-2.5 bg-slate-50 font-bold text-slate-600 border-l border-slate-200">اسم الحي / الموقع:</td>
                    <td className="p-2.5 text-slate-900 border-l border-slate-200 font-medium">{formData.neighborhoodName || formData.district || '—'}</td>
                    <td className="p-2.5 bg-slate-50 font-bold text-slate-600 border-l border-slate-200">أقرب مسجد موجود:</td>
                    <td className="p-2.5 text-slate-900">{formData.nearestMosque || '—'}</td>
                  </tr>
                  <tr className="border-b border-slate-200">
                    <td className="p-2.5 bg-slate-50 font-bold text-slate-600 border-l border-slate-200">المسافة من أقرب مسجد:</td>
                    <td className="p-2.5 text-slate-900 border-l border-slate-200">{formData.distanceToMosque ? `${formData.distanceToMosque} كم` : (formData.distanceToNearestMosque ? `${formData.distanceToNearestMosque} كم` : '—')}</td>
                    <td className="p-2.5 bg-slate-50 font-bold text-slate-600 border-l border-slate-200">توفر أرض للبناء:</td>
                    <td className="p-2.5 text-slate-900">{formData.hasLand === 'yes' ? 'نعم (متوفرة)' : formData.hasLand === 'no' ? 'لا (غير متوفرة)' : (formData.hasLand || '—')}</td>
                  </tr>
                  <tr>
                    <td className="p-2.5 bg-slate-50 font-bold text-slate-600 border-l border-slate-200">مساحة الأرض المقترحة:</td>
                    <td className="p-2.5 text-slate-900 border-l border-slate-200">{formData.landArea ? `${formData.landArea} م²` : '—'}</td>
                    <td className="p-2.5 bg-slate-50 font-bold text-slate-600 border-l border-slate-200">ملكية الأرض:</td>
                    <td className="p-2.5 text-slate-900">
                      {formData.landOwnership === 'owned' || formData.landOwnership === 'private'
                        ? 'ملك خاص'
                        : formData.landOwnership === 'waqf'
                        ? 'وقف'
                        : formData.landOwnership === 'government'
                        ? 'حكومية'
                        : formData.landOwnership === 'other'
                        ? 'أخرى'
                        : (formData.landOwnership || '—')}
                    </td>
                  </tr>
                </>
              ) : (
                <>
                  <tr className="border-b border-slate-200">
                    <td className="p-2.5 bg-slate-50 font-bold text-slate-600 w-1/4 border-l border-slate-200">اسم المسجد:</td>
                    <td className="p-2.5 font-bold text-slate-900 w-1/4 border-l border-slate-200">
                      {currentMosque?.name || formData.mosqueName || (formData.mosqueId ? `مسجد #${formData.mosqueId}` : '—')}
                    </td>
                    <td className="p-2.5 bg-slate-50 font-bold text-slate-600 w-1/4 border-l border-slate-200">نوع المسجد:</td>
                    <td className="p-2.5 text-slate-900 w-1/4">
                      {currentMosque?.mosqueType === 'jami' ? 'جامع' : currentMosque?.mosqueType === 'masjid' ? 'مسجد' : (currentMosque?.mosqueType || formData.mosqueType || 'مسجد')}
                    </td>
                  </tr>
                  <tr className="border-b border-slate-200">
                    <td className="p-2.5 bg-slate-50 font-bold text-slate-600 w-1/4 border-l border-slate-200">المدينة / المنطقة:</td>
                    <td className="p-2.5 text-slate-900 w-1/4 border-l border-slate-200">
                      {currentMosque?.city || formData.city || orgSettings?.city || '—'}
                    </td>
                    <td className="p-2.5 bg-slate-50 font-bold text-slate-600 w-1/4 border-l border-slate-200">اسم الحي / المنطقة:</td>
                    <td className="p-2.5 text-slate-900 w-1/4 font-medium">
                      {currentMosque?.district || formData.district || '—'}
                    </td>
                  </tr>
                  <tr>
                    <td className="p-2.5 bg-slate-50 font-bold text-slate-600 w-1/4 border-l border-slate-200">العنوان / الوصف:</td>
                    <td className="p-2.5 text-slate-900 w-1/4 border-l border-slate-200">
                      {currentMosque?.address || formData.address || ((currentMosque as any)?.governorate ? `محافظة ${(currentMosque as any).governorate}` : '—')}
                    </td>
                    <td className="p-2.5 bg-slate-50 font-bold text-slate-600 w-1/4 border-l border-slate-200">المساحة والسعة:</td>
                    <td className="p-2.5 text-slate-900 w-1/4">
                      {currentMosque?.area ? `${currentMosque.area} م²` : (formData.mosqueArea ? `${formData.mosqueArea} م²` : '—')}
                      {currentMosque?.capacity ? ` • ${currentMosque.capacity} مصلٍ` : (formData.actualWorshippers ? ` • ${formData.actualWorshippers} مصلٍ` : '')}
                    </td>
                  </tr>
                </>
              )}
            </tbody>
          </table>
        </div>

        {/* ثالثاً: تفاصيل ونطاق الطلب */}
        <div className="mb-4 border border-slate-300 rounded-lg overflow-hidden bg-white">
          <div className="bg-slate-100/90 px-3 py-1.5 font-bold text-xs text-[#1a5f4a] border-b border-slate-300">
            ثالثاً: تفاصيل ونطاق الطلب
          </div>
          <table className="w-full text-xs border-collapse">
            <tbody>
              {visibleFields.map((field) => {
                if (field.name === 'mosqueId') return null;
                if (selectedService === 'bunyan' && ['neighborhoodName', 'nearestMosque', 'distanceToMosque', 'distanceToNearestMosque', 'hasLand', 'landArea', 'landOwnership'].includes(field.name)) {
                  return null;
                }
                const val = formData[field.name];
                let displayVal = val ? String(val) : '—';
                if (val === 'yes') displayVal = 'نعم';
                if (val === 'no') displayVal = 'لا';
                if (field.name === 'landOwnership') {
                  displayVal = val === 'owned' || val === 'private' ? 'ملك خاص' : val === 'waqf' ? 'وقف' : val === 'government' ? 'حكومي' : val === 'other' ? 'أخرى' : (val || '—');
                }
                if (field.name === 'mosqueArea' && val) displayVal = `${val} م²`;
                if (field.name === 'landArea' && val) displayVal = `${val} م²`;
                if (field.name === 'actualWorshippers' && val) displayVal = `${val} مصلي`;
                if (field.name === 'donationAmount' && val) displayVal = `${Number(val).toLocaleString()} ريال`;
                if (field.name === 'distanceToMosque' && val) displayVal = `${val} كم`;
                if (field.name === 'distanceToNearestMosque' && val) displayVal = `${val} كم`;

                return (
                  <tr key={field.name} className="border-b border-slate-200 last:border-0">
                    <td className="p-2.5 bg-slate-50 font-bold text-slate-600 w-1/3 border-l border-slate-200 align-top">{field.label}:</td>
                    <td className="p-2.5 text-slate-900 whitespace-pre-wrap leading-relaxed">{displayVal}</td>
                  </tr>
                );
              })}
              {(formData.hasPrayerHall !== undefined && formData.hasPrayerHall !== null) && (
                <tr className="border-b border-slate-200 last:border-0">
                  <td className="p-2.5 bg-slate-50 font-bold text-slate-600 w-1/3 border-l border-slate-200">مصلى النساء:</td>
                  <td className="p-2.5 text-slate-900">
                    {formData.hasPrayerHall
                      ? `يتضمن مصلى للنساء (السعة: ${formData.womenPrayerCapacity || (currentMosque as any)?.womenPrayerCapacity || '—'} مصلي | المساحة: ${formData.womenPrayerArea || (currentMosque as any)?.womenPrayerArea || '—'} م²)`
                      : 'لا يتضمن مصلى للنساء'}
                  </td>
                </tr>
              )}
              {selectedFile && (
                <tr className="border-b border-slate-200 last:border-0">
                  <td className="p-2.5 bg-slate-50 font-bold text-slate-600 w-1/3 border-l border-slate-200">المرفقات المرفوعة:</td>
                  <td className="p-2.5 text-slate-900 font-semibold">
                    {selectedFile.name} ({(selectedFile.size / (1024 * 1024)).toFixed(2)} MB)
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* أنماط الطباعة المتقدمة داخل نفس الصفحة */}
      <style>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 10mm 8mm !important;
          }
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            box-sizing: border-box !important;
            font-family: 'Cairo', system-ui, -apple-system, sans-serif !important;
          }
          html, html.dark, body, body.dark, #root, main, .min-h-screen {
            background-color: #ffffff !important;
            background: #ffffff !important;
            color: #0f172a !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          .print\\:hidden, header, nav, aside, footer, [role="navigation"] {
            display: none !important;
          }
          .printable-report-container {
            display: block !important;
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 auto !important;
            padding: 0 !important;
            background: white !important;
            color: #0f172a !important;
          }
          .printable-report-container table {
            width: 100% !important;
            border-collapse: collapse !important;
          }
          .printable-report-container td,
          .printable-report-container th {
            border-color: #cbd5e1 !important;
          }
          tr, .break-inside-avoid {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
        }
      `}</style>
    </>
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
