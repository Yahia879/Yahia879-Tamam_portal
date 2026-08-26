import { useState, useEffect, useMemo } from "react";
import { Link } from "wouter";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useUserPermissions } from "@/hooks/usePermission";
import {
  ArrowRight,
  Plus,
  Trash2,
  Save,
  RotateCcw,
  Eye,
  Star,
  FileText,
  AlignLeft,
  Hash,
  List,
  CheckSquare,
  Mail,
  Phone,
  Radio,
  Loader2,
  AlertCircle,
  X,
  GripVertical,
  Monitor,
  Smartphone,
  Check,
  Sparkles,
  Palette,
  CheckCircle2,
  Sliders,
  Send,
  Building2,
  Calendar,
  Wifi,
  Battery,
  Signal,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

export type FieldType =
  | "rating"
  | "text"
  | "textarea"
  | "number"
  | "select"
  | "radio"
  | "checkbox"
  | "email"
  | "phone"
  | "date"
  | "file";

export interface FormFieldOption {
  label: string;
  value: string;
}

export interface FormField {
  id: string;
  type: FieldType;
  label: string;
  placeholder?: string;
  helpText?: string;
  required: boolean;
  isActive: boolean;
  order: number;
  options?: FormFieldOption[];
  maxRating?: number;
  showLabels?: boolean;
  isSystem?: boolean;
}

export interface EvaluationFormSettings {
  title: string;
  description: string;
  headerBgColor?: string;
  submitButtonText?: string;
  successTitle?: string;
  successMessage?: string;
  fields: FormField[];
}

const FIELD_TYPES: Array<{ type: FieldType; label: string; icon: any }> = [
  { type: "rating", label: "تقييم بالنجوم ⭐", icon: Star },
  { type: "text", label: "نص قصير 📝", icon: FileText },
  { type: "textarea", label: "نص طويل / ملاحظات 📄", icon: AlignLeft },
  { type: "number", label: "رقمي 🔢", icon: Hash },
  { type: "select", label: "قائمة منسدلة 🔽", icon: List },
  { type: "radio", label: "خيارات متعددة 🔘", icon: Radio },
  { type: "checkbox", label: "مربع اختيار ☑️", icon: CheckSquare },
  { type: "phone", label: "رقم جوال 📱", icon: Phone },
  { type: "email", label: "بريد إلكتروني ✉️", icon: Mail },
];

const RATING_EMOJIS: Record<number, { label: string; emoji: string; color: string }> = {
  1: { label: "غير راضي جداً", emoji: "😞", color: "text-red-500 bg-red-50 dark:bg-red-950/30 border-red-200" },
  2: { label: "غير راضي", emoji: "🙁", color: "text-amber-600 bg-amber-50 dark:bg-amber-950/30 border-amber-200" },
  3: { label: "محايد", emoji: "😐", color: "text-yellow-600 bg-yellow-50 dark:bg-yellow-950/30 border-yellow-200" },
  4: { label: "راضي", emoji: "🙂", color: "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200" },
  5: { label: "راضي جداً", emoji: "😍", color: "text-teal-600 bg-teal-50 dark:bg-teal-950/30 border-teal-200" },
};

const COLOR_PRESETS = [
  { label: "أخضر تركوازي (الافتراضي)", hex: "#14707a" },
  { label: "أزرق كلاسيكي", hex: "#1e3a8a" },
  { label: "زمردي إسلامي", hex: "#047857" },
  { label: "كحلي داكن", hex: "#0f172a" },
  { label: "عنابي ملكي", hex: "#881337" },
  { label: "بنفسجي أنيق", hex: "#581c87" },
];

export default function FormsCustomizationEvaluation() {
  const utils = trpc.useUtils();
  const { data: serverConfig, isLoading } = trpc.forms.getEvaluationFormConfig.useQuery();
  const { data: orgSettings } = trpc.organization.getSettings.useQuery();

  const mainLogoSrc = orgSettings?.logoUrl || "/logo.svg";

  const [formConfig, setFormConfig] = useState<EvaluationFormSettings>({
    title: "قياس رضا المستفيدين من خدمات الجمعية",
    description: "",
    headerBgColor: "#14707a",
    submitButtonText: "إرسال التقييم",
    successTitle: "تم تقييم الخدمة بنجاح",
    successMessage: "شكراً لجهودكم ومشاركتكم القيمة. تم تسجيل استبيان تقييمكم لطلب الخدمة بنجاح.",
    fields: [],
  });

  const [hasChanges, setHasChanges] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);
  const [showSettingsSection, setShowSettingsSection] = useState(false);
  const [newOptionInputs, setNewOptionInputs] = useState<Record<string, string>>({});
  const [expandedPlaceholder, setExpandedPlaceholder] = useState<Record<string, boolean>>({});

  // حالة المعاينة التفاعلية
  const [previewDevice, setPreviewDevice] = useState<"desktop" | "mobile">("desktop");
  const [previewTab, setPreviewTab] = useState<"form" | "success">("form");
  const [previewValues, setPreviewValues] = useState<Record<string, any>>({
    beneficiaryName: "عبدالله السعدي",
    beneficiaryPhone: "0501234567",
    serviceName: "مسجد الهدى (ترميم وصيانة)",
  });
  const [hoverRating, setHoverRating] = useState<Record<string, number>>({});

  useEffect(() => {
    if (serverConfig) {
      setFormConfig({
        title: serverConfig.title || "قياس رضا المستفيدين من خدمات الجمعية",
        description: serverConfig.description || "",
        headerBgColor: serverConfig.headerBgColor || "#14707a",
        submitButtonText: serverConfig.submitButtonText || "إرسال التقييم",
        successTitle: serverConfig.successTitle || "تم تقييم الخدمة بنجاح",
        successMessage: serverConfig.successMessage || "شكراً لجهودكم ومشاركتكم القيمة. تم تسجيل استبيان تقييمكم لطلب الخدمة بنجاح.",
        fields: [...serverConfig.fields].sort((a, b) => a.order - b.order),
      });
      setHasChanges(false);
    }
  }, [serverConfig]);

  const saveMutation = trpc.forms.saveEvaluationFormConfig.useMutation({
    onSuccess: (res) => {
      toast.success(res.message);
      setHasChanges(false);
      utils.forms.getEvaluationFormConfig.invalidate();
    },
    onError: (err) => {
      toast.error(err.message || "حدث خطأ أثناء الحفظ");
    },
  });

  const resetMutation = trpc.forms.resetEvaluationFormConfig.useMutation({
    onSuccess: (res) => {
      toast.success(res.message);
      setIsResetConfirmOpen(false);
      utils.forms.getEvaluationFormConfig.invalidate();
    },
    onError: (err) => {
      toast.error(err.message || "حدث خطأ أثناء إعادة التعيين");
    },
  });

  const handleSave = () => {
    if (formConfig.fields.length === 0) {
      toast.error("يجب أن تحتوي الاستمارة على حقل واحد على الأقل");
      return;
    }
    saveMutation.mutate(formConfig);
  };

  // إضافة حقل جديد
  const handleAddField = (type: FieldType = "rating", customLabel = "سؤال جديد") => {
    const nextOrder = formConfig.fields.length > 0
      ? Math.max(...formConfig.fields.map((f) => f.order)) + 1
      : 1;

    const newField: FormField = {
      id: `field_${Date.now()}`,
      type,
      label: customLabel,
      placeholder: "",
      helpText: "",
      required: false,
      isActive: true,
      order: nextOrder,
      options:
        type === "radio" || type === "select"
          ? [
              { label: "نعم", value: "yes" },
              { label: "لا", value: "no" },
            ]
          : [],
      maxRating: 5,
      showLabels: true,
    };

    setFormConfig((prev) => ({
      ...prev,
      fields: [...prev.fields, newField],
    }));
    setHasChanges(true);
    toast.success("تمت إضافة حقل جديد");
  };

  // تحديث حقل
  const handleUpdateField = (fieldId: string, updates: Partial<FormField>) => {
    setFormConfig((prev) => ({
      ...prev,
      fields: prev.fields.map((f) => (f.id === fieldId ? { ...f, ...updates } : f)),
    }));
    setHasChanges(true);
  };

  // حذف حقل
  const handleDeleteField = (fieldId: string) => {
    setFormConfig((prev) => ({
      ...prev,
      fields: prev.fields.filter((f) => f.id !== fieldId),
    }));
    setHasChanges(true);
  };

  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragEnabledIndex, setDragEnabledIndex] = useState<number | null>(null);

  // سحب وإفلات لترتيب الأسئلة
  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    const newFields = [...formConfig.fields];
    const draggedItem = newFields[draggedIndex];
    newFields.splice(draggedIndex, 1);
    newFields.splice(index, 0, draggedItem);

    const updated = newFields.map((f, i) => ({ ...f, order: i + 1 }));
    setDraggedIndex(index);
    setFormConfig((prev) => ({ ...prev, fields: updated }));
    setHasChanges(true);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragEnabledIndex(null);
  };

  // إضافة خيار للقوائم
  const handleAddOption = (fieldId: string) => {
    const text = (newOptionInputs[fieldId] || "").trim();
    if (!text) return;

    const field = formConfig.fields.find((f) => f.id === fieldId);
    if (!field) return;

    const updatedOptions = [...(field.options || []), { label: text, value: text }];
    handleUpdateField(fieldId, { options: updatedOptions });
    setNewOptionInputs((prev) => ({ ...prev, [fieldId]: "" }));
  };

  const handleRemoveOption = (fieldId: string, optIndex: number) => {
    const field = formConfig.fields.find((f) => f.id === fieldId);
    if (!field || !field.options) return;

    const updatedOptions = field.options.filter((_, i) => i !== optIndex);
    handleUpdateField(fieldId, { options: updatedOptions });
  };

  const activeFieldsCount = useMemo(() => formConfig.fields.filter((f) => f.isActive).length, [formConfig.fields]);
  const requiredFieldsCount = useMemo(() => formConfig.fields.filter((f) => f.isActive && f.required).length, [formConfig.fields]);

  const userPermissions = useUserPermissions();
  const hasPermission = userPermissions.includes("forms_customization.evaluation");

  if (!hasPermission) {
    return (
      <DashboardLayout>
        <div className="max-w-md mx-auto my-16 p-8 rounded-2xl border border-border bg-card text-center space-y-3 shadow-sm">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center mx-auto">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-foreground">غير مصرح بالوصول</h3>
          <p className="text-xs text-muted-foreground leading-relaxed">
            لا تملك الصلاحية اللازمة لتخصيص استمارة تقييم رضا المستفيد.
          </p>
          <Link href="/forms-customization">
            <Button variant="outline" size="sm" className="mt-2 text-xs font-semibold">
              العودة لقائمة النماذج
            </Button>
          </Link>
        </div>
      </DashboardLayout>
    );
  }

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[300px]">
          <div className="text-center space-y-2">
            <Loader2 className="w-6 h-6 animate-spin mx-auto text-primary" />
            <p className="text-xs text-muted-foreground">جاري التحميل...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-5xl mx-auto pb-12">
        {/* شريط العنوان والإجراءات */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 sm:p-6 rounded-2xl border border-border bg-card shadow-xs">
          <div className="flex items-center gap-3.5">
            <Link href="/forms-customization">
              <Button variant="ghost" size="icon" type="button" className="shrink-0 rounded-xl hover:bg-muted">
                <ArrowRight className="w-5 h-5" />
              </Button>
            </Link>
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 text-white shadow-md transition-colors"
              style={{ backgroundColor: formConfig.headerBgColor || "#14707a" }}
            >
              <Star className="w-6 h-6 fill-white" />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-lg sm:text-xl font-bold text-foreground">
                  تخصيص استمارة تقييم رضا المستفيد
                </h1>
                {hasChanges && (
                  <Badge variant="outline" className="text-[11px] font-bold text-amber-600 border-amber-300 bg-amber-50 dark:bg-amber-950/30">
                    تعديلات غير محفوظة
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                تخصيص الأسئلة والمظهر العام لاستبيان قياس رضا المستفيدين من خدمات الجمعية
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowSettingsSection(!showSettingsSection)}
              className="text-xs font-semibold gap-1.5 h-9 px-3 rounded-xl border-border/80"
            >
              <Sliders className="w-3.5 h-3.5 text-primary" />
              <span>إعدادات المظهر والنصوص</span>
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsResetConfirmOpen(true)}
              className="text-xs text-muted-foreground hover:text-foreground h-9 px-3 rounded-xl"
            >
              <RotateCcw className="w-3.5 h-3.5 mr-1" />
              الافتراضي
            </Button>

            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setIsPreviewOpen(true)}
              className="text-xs font-bold gap-1.5 h-9 px-4 rounded-xl shadow-2xs"
            >
              <Eye className="w-4 h-4 text-primary" />
              <span>معاينة حية للاستمارة</span>
            </Button>

            <Button
              type="button"
              onClick={handleSave}
              disabled={saveMutation.isPending}
              className="text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white px-5 h-9 rounded-xl shadow-sm gap-1.5"
            >
              {saveMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-0.5" />
              )}
              حفظ الاستمارة
            </Button>
          </div>
        </div>

        {/* قسم إعدادات المظهر والنصوص (قابل للفتح والإغلاق) */}
        {showSettingsSection && (
          <div className="p-5 sm:p-6 rounded-2xl border border-primary/20 bg-card shadow-sm space-y-5 animate-in fade-in slide-in-from-top-3 duration-200">
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                <Palette className="w-4 h-4 text-primary" />
                <span>إعدادات النصوص ولون الهيدر</span>
              </h3>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowSettingsSection(false)}
                className="h-7 text-xs text-muted-foreground"
              >
                إخفاء
              </Button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">عنوان الاستمارة الرئيسي:</Label>
                <Input
                  value={formConfig.title}
                  onChange={(e) => {
                    setFormConfig((p) => ({ ...p, title: e.target.value }));
                    setHasChanges(true);
                  }}
                  className="h-10 text-xs sm:text-sm rounded-xl"
                  placeholder="مثال: قياس رضا المستفيدين..."
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold">نص زر الإرسال:</Label>
                <Input
                  value={formConfig.submitButtonText || "إرسال التقييم"}
                  onChange={(e) => {
                    setFormConfig((p) => ({ ...p, submitButtonText: e.target.value }));
                    setHasChanges(true);
                  }}
                  className="h-10 text-xs sm:text-sm rounded-xl"
                  placeholder="مثال: إرسال التقييم"
                />
              </div>

              <div className="col-span-1 sm:col-span-2 space-y-1.5">
                <Label className="text-xs font-bold">النص الترحيبي / الوصف:</Label>
                <Textarea
                  value={formConfig.description}
                  onChange={(e) => {
                    setFormConfig((p) => ({ ...p, description: e.target.value }));
                    setHasChanges(true);
                  }}
                  rows={3}
                  className="text-xs sm:text-sm rounded-xl leading-relaxed"
                  placeholder="اكتب مقدمة ترحيبية للمستفيد..."
                />
              </div>

              <div className="col-span-1 sm:col-span-2 space-y-2">
                <Label className="text-xs font-bold flex items-center gap-1.5">
                  <Palette className="w-3.5 h-3.5 text-primary" />
                  <span>لون خلفية الهيدر (Header Background Color):</span>
                </Label>
                <div className="flex items-center gap-2 flex-wrap">
                  {COLOR_PRESETS.map((c) => (
                    <button
                      key={c.hex}
                      type="button"
                      onClick={() => {
                        setFormConfig((p) => ({ ...p, headerBgColor: c.hex }));
                        setHasChanges(true);
                      }}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all ${
                        formConfig.headerBgColor === c.hex
                          ? "ring-2 ring-primary border-primary shadow-xs"
                          : "border-border hover:border-primary/40 bg-background"
                      }`}
                    >
                      <span className="w-3.5 h-3.5 rounded-full" style={{ backgroundColor: c.hex }} />
                      <span>{c.label}</span>
                    </button>
                  ))}
                  <div className="flex items-center gap-1.5 mr-auto">
                    <span className="text-xs text-muted-foreground">كود اللون:</span>
                    <Input
                      value={formConfig.headerBgColor || "#14707a"}
                      onChange={(e) => {
                        setFormConfig((p) => ({ ...p, headerBgColor: e.target.value }));
                        setHasChanges(true);
                      }}
                      className="h-8 w-28 text-xs font-mono rounded-lg text-left"
                      dir="ltr"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* شريط الإحصائيات والأدوات السريعة */}
        <div className="flex items-center justify-between gap-3 p-3.5 px-5 rounded-2xl bg-muted/40 border border-border/80 text-xs">
          <div className="flex items-center gap-4 text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <Star className="w-4 h-4 text-primary fill-primary/20" />
              <span>إجمالي الأسئلة: <strong className="text-foreground">{formConfig.fields.length}</strong></span>
            </div>
            <div className="hidden sm:flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>أسئلة نشطة: <strong className="text-foreground">{activeFieldsCount}</strong></span>
            </div>
            <div className="hidden sm:flex items-center gap-1.5">
              <span className="text-red-500 font-bold">*</span>
              <span>أسئلة إلزامية: <strong className="text-foreground">{requiredFieldsCount}</strong></span>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-muted-foreground hidden md:inline text-[11px]">إضافة سريعة:</span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => handleAddField("rating", "ما مدى تقييمك لـ...")}
              className="h-7 text-[11px] px-2 rounded-lg font-medium text-primary hover:bg-primary/10"
            >
              + تقييم نجوم ⭐
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => handleAddField("text", "سؤال نصي")}
              className="h-7 text-[11px] px-2 rounded-lg font-medium text-primary hover:bg-primary/10"
            >
              + نص
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => handleAddField("textarea", "مساحة حرة للملاحظات")}
              className="h-7 text-[11px] px-2 rounded-lg font-medium text-primary hover:bg-primary/10"
            >
              + ملاحظات
            </Button>
          </div>
        </div>

        {/* قائمة الأسئلة بسحب وإفلات */}
        <div className="space-y-3">
          {formConfig.fields.map((field, index) => {
            const isDragging = draggedIndex === index;
            const isDragEnabled = dragEnabledIndex === index;

            return (
              <div
                key={field.id}
                draggable={isDragEnabled}
                onDragStart={(e) => handleDragStart(e, index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragEnd={handleDragEnd}
                className={`p-4 rounded-2xl border bg-card text-right transition-all duration-200 ${
                  isDragging
                    ? "opacity-30 border-dashed border-2 border-primary scale-[0.99]"
                    : "border-border shadow-xs hover:border-primary/40 hover:shadow-md"
                } ${!field.isActive ? "opacity-50 bg-muted/20" : ""}`}
              >
                <div className="flex flex-col md:flex-row md:items-center gap-3">
                  {/* مقبض السحب والإفلات + رقم الترتيب */}
                  <div className="flex items-center gap-2 shrink-0">
                    <div
                      onMouseDown={() => setDragEnabledIndex(index)}
                      onMouseUp={() => setDragEnabledIndex(null)}
                      onTouchStart={() => setDragEnabledIndex(index)}
                      onTouchEnd={() => setDragEnabledIndex(null)}
                      className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted cursor-grab active:cursor-grabbing transition-colors select-none"
                      title="اضغط واسحب لتغيير ترتيب السؤال"
                    >
                      <GripVertical className="w-5 h-5 text-muted-foreground/70 pointer-events-none" />
                    </div>
                    <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary font-black text-xs sm:text-sm flex items-center justify-center border border-primary/20 shrink-0 shadow-2xs select-none">
                      #{index + 1}
                    </div>
                  </div>

                  {/* نص السؤال المباشر */}
                  <div className="flex-1 min-w-0 space-y-1.5">
                    <Input
                      value={field.label}
                      onChange={(e) => handleUpdateField(field.id, { label: e.target.value })}
                      placeholder="اكتب نص السؤال هنا..."
                      className="h-10 text-xs sm:text-sm font-bold text-right rounded-xl bg-background border-border/80 focus-visible:border-primary"
                    />

                    {/* محرر تلميح الحقل (Placeholder) المصغر */}
                    {field.type !== "rating" &&
                      (((field.placeholder !== undefined && field.placeholder !== "") ||
                        expandedPlaceholder[field.id]) ? (
                        <div className="flex items-center gap-1.5 pt-0.5">
                          <Input
                            value={field.placeholder || ""}
                            onChange={(e) =>
                              handleUpdateField(field.id, { placeholder: e.target.value })
                            }
                            placeholder="نص توضيحي داخلي (Placeholder)..."
                            className="h-7 text-[11px] text-muted-foreground placeholder:text-muted-foreground/40 bg-muted/30 border-dashed border-border/80 focus-visible:bg-background rounded-lg text-right px-2.5"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              handleUpdateField(field.id, { placeholder: "" });
                              setExpandedPlaceholder((p) => ({ ...p, [field.id]: false }));
                            }}
                            className="p-1 rounded-md text-muted-foreground/50 hover:text-destructive hover:bg-destructive/10 transition-colors shrink-0"
                            title="إزالة التلميح"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setExpandedPlaceholder((p) => ({ ...p, [field.id]: true }))}
                          className="text-[11px] text-muted-foreground/70 hover:text-primary transition-colors flex items-center gap-1 font-medium select-none"
                        >
                          <Plus className="w-3 h-3" />
                          <span>إضافة نص تلميح داخلي (Placeholder)</span>
                        </button>
                      ))}
                  </div>

                  {/* نوع الحقل */}
                  <div className="w-full sm:w-44 shrink-0">
                    <Select
                      value={field.type}
                      onValueChange={(val: FieldType) => handleUpdateField(field.id, { type: val })}
                    >
                      <SelectTrigger className="h-10 text-xs font-semibold text-right rounded-xl border-border/80 bg-background">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent align="end" className="rounded-xl shadow-lg border-border">
                        {FIELD_TYPES.map((ft) => (
                          <SelectItem key={ft.type} value={ft.type} className="text-xs py-2 font-medium">
                            {ft.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* مفتاح الإلزامية */}
                  <div className="flex items-center gap-2 shrink-0 bg-muted/30 px-3 py-1.5 rounded-xl border border-border/50">
                    <span className="text-xs text-muted-foreground font-semibold">إجباري:</span>
                    <Switch
                      checked={field.required}
                      onCheckedChange={(c) => handleUpdateField(field.id, { required: c })}
                    />
                  </div>

                  {/* مفتاح التفعيل */}
                  <div className="flex items-center gap-2 shrink-0 bg-muted/30 px-3 py-1.5 rounded-xl border border-border/50">
                    <span className="text-xs text-muted-foreground font-semibold">مفعل:</span>
                    <Switch
                      checked={field.isActive}
                      onCheckedChange={(c) => handleUpdateField(field.id, { isActive: c })}
                    />
                  </div>

                  {/* زر الحذف */}
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDeleteField(field.id)}
                    className="h-9 w-9 rounded-xl text-muted-foreground hover:text-destructive hover:bg-destructive/10 shrink-0"
                    title="حذف السؤال"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>

                {/* خيارات القوائم والـ Radio */}
                {["select", "radio"].includes(field.type) && (
                  <div className="mt-4 pt-4 border-t border-border/60 bg-muted/20 -mx-4 -mb-4 p-4 rounded-b-2xl space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                        <List className="w-4 h-4 text-primary" />
                        <span>خيارات الإجابة:</span>
                      </span>
                      <span className="text-[11px] text-muted-foreground font-medium">
                        {field.options?.length ? `${field.options.length} خيارات مضافة` : "لا توجد خيارات بعد"}
                      </span>
                    </div>

                    {/* قائمة الخيارات المضافة */}
                    {field.options && field.options.length > 0 && (
                      <div className="flex items-center gap-2 flex-wrap">
                        {field.options.map((opt, oIdx) => (
                          <div
                            key={oIdx}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-background border border-border text-xs font-bold text-foreground shadow-2xs hover:border-primary/40 transition-colors"
                          >
                            <span className="w-2 h-2 rounded-full bg-primary/70" />
                            <span>{opt.label}</span>
                            <button
                              type="button"
                              onClick={() => handleRemoveOption(field.id, oIdx)}
                              className="p-0.5 rounded-md text-muted-foreground/60 hover:text-destructive hover:bg-destructive/10 transition-colors mr-1"
                              title="حذف هذا الخيار"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* حقل إضافة خيار جديد */}
                    <div className="flex items-center gap-2 max-w-md pt-0.5">
                      <Input
                        value={newOptionInputs[field.id] || ""}
                        onChange={(e) =>
                          setNewOptionInputs((prev) => ({ ...prev, [field.id]: e.target.value }))
                        }
                        placeholder="اكتب اسم الخيار ثم اضغط إضافة..."
                        className="h-9 text-xs bg-background rounded-xl text-right border-border/80"
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleAddOption(field.id);
                          }
                        }}
                      />
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => handleAddOption(field.id)}
                        className="h-9 px-4 text-xs font-bold gap-1 rounded-xl shrink-0"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>إضافة</span>
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* زر إضافة سؤال جديد */}
        <div className="pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => handleAddField()}
            className="w-full h-12 border-dashed border-2 hover:border-primary hover:bg-primary/5 text-xs font-bold gap-2 rounded-2xl transition-all shadow-2xs"
          >
            <Plus className="w-4 h-4 text-primary" />
            <span>إضافة سؤال / حقل جديد للاستمارة</span>
          </Button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* نافذة المعاينة الحية بصفحة كاملة المطابقة لصفحة التقييم الواقعية */}
      {/* ========================================================================= */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent
          showCloseButton={false}
          className="fixed inset-0 top-0 left-0 w-screen h-[100dvh] max-w-none max-h-none sm:max-w-none translate-x-0 translate-y-0 rounded-none border-0 p-0 overflow-hidden flex flex-col text-right shadow-none bg-slate-100 dark:bg-zinc-950 duration-200"
          dir="rtl"
        >
          {/* شريط أدوات المعاينة الصلب والأنيق بدون بلور */}
          <div className="p-3.5 sm:p-4 border-b border-border/80 bg-card flex items-center justify-between gap-3 shrink-0 shadow-xs">
            <div className="flex items-center gap-3 min-w-0">
              <div
                className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center text-white shrink-0 shadow-xs"
                style={{ backgroundColor: formConfig.headerBgColor || "#14707a" }}
              >
                <Star className="w-5 h-5 fill-white" />
              </div>
              <div className="min-w-0">
                <DialogTitle className="text-sm sm:text-base font-bold text-foreground flex items-center gap-2">
                  <span className="truncate">معاينة حية: استمارة تقييم رضا المستفيد</span>
                  <Badge variant="outline" className="text-[10px] h-5 bg-primary/10 text-primary border-primary/20 hidden md:inline-flex shrink-0">
                    صفحة تفاعلية
                  </Badge>
                </DialogTitle>
                <p className="text-[11px] text-muted-foreground line-clamp-1">
                  تظهر هذه المعاينة التفاعلية تماماً كما سيراها المستفيد في صفحة التقييم
                </p>
              </div>
            </div>

            {/* أدوات التبديل */}
            <div className="flex items-center gap-2 shrink-0">
              {/* تبديل التبويب */}
              <div className="flex items-center gap-1 bg-muted/70 p-1 rounded-xl border border-border/60">
                <button
                  type="button"
                  onClick={() => setPreviewTab("form")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    previewTab === "form" ? "bg-card text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  الاستمارة
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewTab("success")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    previewTab === "success" ? "bg-card text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  شاشة النجاح
                </button>
              </div>

              {/* تبديل الجهاز */}
              <div className="flex items-center gap-1 bg-muted/70 p-1 rounded-xl border border-border/60">
                <button
                  type="button"
                  onClick={() => setPreviewDevice("desktop")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    previewDevice === "desktop" ? "bg-card text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
                  }`}
                  title="عرض كمبيوتر"
                >
                  <Monitor className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">كمبيوتر</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewDevice("mobile")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    previewDevice === "mobile" ? "bg-card text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
                  }`}
                  title="عرض جوال"
                >
                  <Smartphone className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">جوال</span>
                </button>
              </div>

              {/* زر الإغلاق */}
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => setIsPreviewOpen(false)}
                className="w-8.5 h-8.5 rounded-xl text-muted-foreground hover:text-foreground hover:bg-destructive/10 hover:text-destructive transition-colors shrink-0"
                title="إغلاق المعاينة"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* محتوى المعاينة الواقعي */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 sm:py-8 flex justify-center items-start bg-slate-100/90 dark:bg-zinc-950">
            <div
              className={`w-full transition-all duration-300 ${
                previewDevice === "mobile"
                  ? "relative max-w-[395px] h-[780px] max-h-[82vh] bg-background rounded-[48px] border-[10px] border-slate-900 dark:border-zinc-800 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.5),0_0_0_2px_rgba(255,255,255,0.08)] flex flex-col overflow-hidden select-none my-auto ring-1 ring-black/20 shrink-0"
                  : "max-w-2xl space-y-6"
              }`}
            >
              {/* شريط حالة هاتف iPhone 14 Pro Max مع الجزيرة التفاعلية (Dynamic Island) */}
              {previewDevice === "mobile" && (
                <div className="pt-3 px-5 pb-2 shrink-0 bg-background/95 backdrop-blur z-20 select-none border-b border-border/30">
                  <div className="flex items-center justify-between text-xs font-semibold text-foreground">
                    <span className="font-semibold tracking-tight text-xs">9:41</span>
                    {/* Dynamic Island */}
                    <div className="w-24 h-5.5 bg-black dark:bg-zinc-900 rounded-full flex items-center justify-end px-2.5 gap-1.5 shadow-inner">
                      <div className="w-2 h-2 rounded-full bg-slate-900/90 border border-slate-800" />
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500/80 animate-pulse" />
                    </div>
                    <div className="flex items-center gap-1.5 text-foreground/80">
                      <Signal className="w-3.5 h-3.5" />
                      <Wifi className="w-3.5 h-3.5" />
                      <Battery className="w-4 h-4" />
                    </div>
                  </div>
                </div>
              )}

              {/* مساحة محتوى شاشة الهاتف القابلة للتمرير والتفاعل */}
              <div className={previewDevice === "mobile" ? "flex-1 overflow-y-auto p-3.5 space-y-4 text-right" : "space-y-6"}>
                {previewTab === "form" ? (
                /* استمارة التقييم التفاعلية */
                <div className="rounded-3xl border border-slate-200/90 shadow-2xl bg-white dark:bg-card text-slate-900 dark:text-foreground overflow-hidden font-sans">
                  {/* Header Banner مع الشعار واللون المخصص */}
                  <div
                    className="text-white p-6 sm:p-8 flex flex-col items-center justify-center relative shadow-inner transition-colors"
                    style={{ backgroundColor: formConfig.headerBgColor || "#14707a" }}
                  >
                    <img
                      src={mainLogoSrc}
                      alt="شعار الجمعية"
                      className="h-14 sm:h-16 w-auto object-contain brightness-0 invert"
                    />
                  </div>

                  <div className="p-6 sm:p-8 space-y-6">
                    {/* العنوان والوصف */}
                    <div className="text-center space-y-2">
                      <h2 className="text-lg sm:text-xl font-bold text-slate-800 dark:text-foreground">
                        {formConfig.title || "قياس رضا المستفيدين من خدمات الجمعية"}
                      </h2>
                      {formConfig.description && (
                        <p className="text-xs sm:text-[13px] text-slate-600 dark:text-muted-foreground leading-relaxed max-w-xl mx-auto">
                          {formConfig.description}
                        </p>
                      )}
                    </div>

                    <hr className="border-t border-dotted border-slate-300 dark:border-border" />

                    {/* الحقول والأسئلة النشطة */}
                    <div className="space-y-6">
                      {formConfig.fields
                        .filter((f) => f.isActive)
                        .map((field) => {
                          const value = previewValues[field.id];
                          const currentHover = hoverRating[field.id] || 0;

                          return (
                            <div key={field.id} className="space-y-2 text-right">
                              <Label className="text-xs sm:text-sm font-bold text-slate-800 dark:text-foreground block">
                                {field.label}
                                {field.required && <span className="text-rose-600 mr-1">*</span>}
                              </Label>

                              {field.helpText && (
                                <p className="text-[11px] text-slate-500 dark:text-muted-foreground leading-normal">
                                  {field.helpText}
                                </p>
                              )}

                              {/* 1. تقييم النجوم ⭐ التفاعلي الحقيقي */}
                              {field.type === "rating" && (
                                <div className="space-y-2">
                                  <div className="flex items-center gap-1.5 py-1 justify-end" dir="ltr">
                                    {Array.from({ length: field.maxRating || 5 }).map((_, sIdx) => {
                                      const starVal = sIdx + 1;
                                      const active = (currentHover || value || 0) >= starVal;

                                      return (
                                        <button
                                          key={starVal}
                                          type="button"
                                          onClick={() =>
                                            setPreviewValues((prev) => ({
                                              ...prev,
                                              [field.id]: starVal,
                                            }))
                                          }
                                          onMouseEnter={() =>
                                            setHoverRating((prev) => ({
                                              ...prev,
                                              [field.id]: starVal,
                                            }))
                                          }
                                          onMouseLeave={() =>
                                            setHoverRating((prev) => ({
                                              ...prev,
                                              [field.id]: 0,
                                            }))
                                          }
                                          className="p-1 transition-transform hover:scale-125 focus:outline-none cursor-pointer"
                                        >
                                          <Star
                                            className={`w-7 h-7 sm:w-8 sm:h-8 transition-all ${
                                              active
                                                ? "text-amber-400 fill-amber-400 drop-shadow-[0_1px_3px_rgba(251,191,36,0.5)]"
                                                : "text-slate-300 dark:text-slate-600 fill-none stroke-[1.2]"
                                            }`}
                                          />
                                        </button>
                                      );
                                    })}
                                  </div>

                                  {/* وصف النتيجة المحدد مع الإيموجي */}
                                  {(currentHover || value) && RATING_EMOJIS[currentHover || value] && (
                                    <div className="flex justify-end animate-in fade-in duration-200">
                                      <div
                                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${
                                          RATING_EMOJIS[currentHover || value].color
                                        }`}
                                      >
                                        <span>{RATING_EMOJIS[currentHover || value].emoji}</span>
                                        <span>{RATING_EMOJIS[currentHover || value].label}</span>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              )}

                              {/* 2. حقول النصوص والأرقام */}
                              {["text", "email", "phone", "number"].includes(field.type) && (
                                <Input
                                  type={field.type === "number" ? "number" : field.type === "email" ? "email" : field.type === "phone" ? "tel" : "text"}
                                  value={value || ""}
                                  onChange={(e) =>
                                    setPreviewValues((prev) => ({ ...prev, [field.id]: e.target.value }))
                                  }
                                  placeholder={field.placeholder || "..."}
                                  className="h-11 rounded-xl text-xs sm:text-sm bg-slate-50/50 dark:bg-background border-slate-300 dark:border-border text-right"
                                />
                              )}

                              {/* 3. حقل النص الطويل / الملاحظات */}
                              {field.type === "textarea" && (
                                <Textarea
                                  value={value || ""}
                                  onChange={(e) =>
                                    setPreviewValues((prev) => ({ ...prev, [field.id]: e.target.value }))
                                  }
                                  placeholder={field.placeholder || "اكتب ملاحظاتك أو مقترحاتك هنا..."}
                                  rows={3}
                                  className="rounded-xl text-xs sm:text-sm bg-slate-50/50 dark:bg-background border-slate-300 dark:border-border leading-relaxed p-3.5 text-right"
                                />
                              )}

                              {/* 4. خيارات الراديو والقوائم */}
                              {field.type === "radio" && (
                                <RadioGroup
                                  value={value || ""}
                                  onValueChange={(val) =>
                                    setPreviewValues((prev) => ({ ...prev, [field.id]: val }))
                                  }
                                  className="grid grid-cols-2 gap-2.5"
                                  dir="rtl"
                                >
                                  {(field.options && field.options.length > 0
                                    ? field.options
                                    : [
                                        { label: "نعم", value: "yes" },
                                        { label: "لا", value: "no" },
                                      ]
                                  ).map((opt) => (
                                    <label
                                      key={opt.value}
                                      className={`flex items-center justify-between p-3 rounded-xl border-2 cursor-pointer text-xs font-bold transition-all ${
                                        value === opt.value
                                          ? "border-primary bg-primary/10 text-primary"
                                          : "border-slate-200 dark:border-border hover:bg-slate-50"
                                      }`}
                                    >
                                      <div className="flex items-center gap-2">
                                        <RadioGroupItem value={opt.value} />
                                        <span>{opt.label}</span>
                                      </div>
                                    </label>
                                  ))}
                                </RadioGroup>
                              )}

                              {field.type === "select" && (
                                <Select
                                  value={value || ""}
                                  onValueChange={(val) =>
                                    setPreviewValues((prev) => ({ ...prev, [field.id]: val }))
                                  }
                                >
                                  <SelectTrigger className="h-11 rounded-xl text-xs sm:text-sm bg-slate-50/50 dark:bg-background border-slate-300 dark:border-border text-right">
                                    <SelectValue placeholder={field.placeholder || "اختر..."} />
                                  </SelectTrigger>
                                  <SelectContent className="rounded-xl border-border">
                                    {field.options?.map((opt) => (
                                      <SelectItem key={opt.value} value={opt.value} className="text-xs sm:text-sm font-medium">
                                        {opt.label}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              )}
                            </div>
                          );
                        })}
                    </div>

                    {/* زر الإرسال التجريبي */}
                    <div className="pt-4 border-t border-slate-200 dark:border-border">
                      <Button
                        type="button"
                        onClick={() => setPreviewTab("success")}
                        className="w-full h-12 rounded-2xl font-bold text-xs sm:text-sm gap-2 shadow-md"
                        style={{ backgroundColor: formConfig.headerBgColor || "#14707a" }}
                      >
                        <Send className="w-4 h-4" />
                        <span>{formConfig.submitButtonText || "إرسال التقييم"}</span>
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                /* شاشة نجاح التقييم */
                <div className="rounded-3xl border border-emerald-500/20 bg-gradient-to-b from-emerald-500/5 to-transparent shadow-xl overflow-hidden bg-card text-center p-8 space-y-6">
                  <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto mb-3 shadow-inner">
                    <CheckCircle2 className="w-10 h-10" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-2xl font-bold text-foreground flex items-center justify-center gap-2">
                      {formConfig.successTitle || "تم تقييم الخدمة بنجاح"}
                      <Sparkles className="w-5 h-5 text-amber-500 animate-pulse" />
                    </h3>
                    <p className="text-sm text-muted-foreground max-w-md mx-auto leading-relaxed">
                      {formConfig.successMessage || "شكراً لجهودكم ومشاركتكم القيمة. تم تسجيل استبيان تقييمكم لطلب الخدمة بنجاح."}
                    </p>
                  </div>

                  {/* ملخص وهمي أنيق */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 rounded-2xl bg-muted/40 border border-border/50 text-xs text-right">
                    <div className="space-y-0.5">
                      <span className="text-muted-foreground text-[10px] block">رقم الطلب:</span>
                      <strong className="text-foreground">REQ-2026-0042</strong>
                    </div>
                    <div className="space-y-0.5">
                      <span className="text-muted-foreground text-[10px] block">المسجد:</span>
                      <strong className="text-foreground">جامع الهدى</strong>
                    </div>
                    <div className="space-y-0.5">
                      <span className="text-muted-foreground text-[10px] block">الحالة:</span>
                      <span className="text-emerald-600 font-bold">مكتمل وتم التقييم</span>
                    </div>
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setPreviewTab("form")}
                    className="rounded-xl text-xs font-bold"
                  >
                    العودة لمعاينة الاستمارة
                  </Button>
                </div>
              )}

              </div>

              {/* شريط السحب السفلي لهواتف iPhone (Home Indicator) */}
              {previewDevice === "mobile" && (
                <div className="pb-2.5 pt-1.5 bg-background/95 backdrop-blur shrink-0 flex justify-center border-t border-border/30">
                  <div className="w-32 h-1 bg-foreground/20 rounded-full mx-auto" />
                </div>
              )}
            </div>
          </div>

          {/* تذييل نافذة المعاينة الصلب والأنيق */}
          <div className="p-3.5 sm:p-4 border-t border-border/80 bg-card flex items-center justify-between gap-3 shrink-0 shadow-xs">
            <span className="text-xs text-muted-foreground flex items-center gap-1.5 font-medium">
              <Sparkles className="w-3.5 h-3.5 text-primary" />
              <span>معاينة حية ومباشرة • أي تعديل على الأسئلة أو الألوان ينعكس هنا فوراً</span>
            </span>
            <Button
              type="button"
              variant="default"
              size="sm"
              onClick={() => setIsPreviewOpen(false)}
              className="text-xs font-bold px-5 rounded-xl bg-primary text-primary-foreground shadow-sm hover:opacity-95"
            >
              إغلاق المعاينة
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* نافذة تأكيد إعادة التعيين */}
      <Dialog open={isResetConfirmOpen} onOpenChange={setIsResetConfirmOpen}>
        <DialogContent className="max-w-sm text-right rounded-2xl" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold text-center">
              استعادة الأسئلة الافتراضية؟
            </DialogTitle>
          </DialogHeader>
          <p className="text-xs text-muted-foreground text-center">
            سيتم استعادة الأسئلة القياسية لتقييم رضا المستفيد وحذف أي تعديلات مخصصة.
          </p>
          <DialogFooter className="gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsResetConfirmOpen(false)}
              className="text-xs rounded-xl"
            >
              إلغاء
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              disabled={resetMutation.isPending}
              onClick={() => resetMutation.mutate()}
              className="text-xs font-bold rounded-xl"
            >
              {resetMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : null}
              نعم، استعادة
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}

