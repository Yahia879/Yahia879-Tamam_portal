import React, { useState, useEffect, useMemo, Fragment } from "react";
import { Link } from "wouter";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { useUserPermissions } from "@/hooks/usePermission";
import {
  ArrowRight,
  Plus,
  Trash2,
  Save,
  RotateCcw,
  Eye,
  FileText,
  AlertCircle,
  AlignLeft,
  Hash,
  List,
  CheckSquare,
  Mail,
  Phone,
  Radio,
  Calendar,
  Loader2,
  X,
  Sparkles,
  GripVertical,
  Monitor,
  Smartphone,
  Check,
  ChevronUp,
  ChevronDown,
  Layers,
  Wifi,
  Battery,
  Signal,
  Search,
  Copy,
  Settings2,
  HelpCircle,
  ChevronsUpDown,
  Star,
  Palette,
  Send,
  CheckCircle2,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

export type EvaluationFieldType =
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
  type: EvaluationFieldType;
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

const FIELD_TYPES: Array<{
  type: EvaluationFieldType;
  label: string;
  description: string;
  icon: any;
  category: "rating" | "text" | "choice" | "contact";
}> = [
  { type: "rating", label: "تقييم بالنجوم", description: "مقياس رضى من 1 إلى 5 نجوم مع مسميات وإيموجي", icon: Star, category: "rating" },
  { type: "text", label: "نص قصير", description: "اسم، عنوان، مدخل بسيط", icon: FileText, category: "text" },
  { type: "textarea", label: "نص طويل / وصف", description: "تفاصيل، شرح، ملاحظات ومقترحات", icon: AlignLeft, category: "text" },
  { type: "radio", label: "خيارات متعددة", description: "نعم/لا أو خيارات واضحة", icon: Radio, category: "choice" },
  { type: "select", label: "قائمة منسدلة", description: "اختيار واحد من قائمة", icon: List, category: "choice" },
  { type: "checkbox", label: "مربع اختيار", description: "إقرار، موافقة", icon: CheckSquare, category: "choice" },
  { type: "number", label: "رقمي", description: "أعداد، درجات، مبالغ", icon: Hash, category: "text" },
  { type: "phone", label: "رقم جوال", description: "رقم هاتف محمول", icon: Phone, category: "contact" },
  { type: "email", label: "بريد إلكتروني", description: "عنوان بريد إلكتروني", icon: Mail, category: "contact" },
];

const PRESET_OPTIONS = [
  {
    name: "تقييم (4 مستويات)",
    options: [
      { label: "ممتاز", value: "excellent" },
      { label: "جيد جداً", value: "very_good" },
      { label: "جيد", value: "good" },
      { label: "مقبول", value: "acceptable" },
    ],
  },
  {
    name: "نعم / لا",
    options: [
      { label: "نعم", value: "yes" },
      { label: "لا", value: "no" },
    ],
  },
  {
    name: "مستوى الموافقة",
    options: [
      { label: "أوافق بشدة", value: "strongly_agree" },
      { label: "أوافق", value: "agree" },
      { label: "محايد", value: "neutral" },
      { label: "لا أوافق", value: "disagree" },
    ],
  },
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

const getFieldTypeBadge = (type: EvaluationFieldType) => {
  switch (type) {
    case "rating":
      return "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border-amber-200 dark:border-amber-800";
    case "text":
    case "textarea":
      return "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border-blue-200 dark:border-blue-800";
    case "radio":
    case "select":
    case "checkbox":
      return "bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 border-purple-200 dark:border-purple-800";
    case "number":
    case "phone":
    case "email":
      return "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800";
    default:
      return "bg-gray-50 text-gray-700 dark:bg-gray-800 dark:text-gray-300 border-gray-200 dark:border-gray-700";
  }
};

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
  const [expandedFields, setExpandedFields] = useState<Record<string, boolean>>({});
  const [newOptionInputs, setNewOptionInputs] = useState<Record<string, string>>({});
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<"all" | "active" | "required" | "inactive" | "options">("all");

  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragEnabledIndex, setDragEnabledIndex] = useState<number | null>(null);

  // حالة المعاينة التفاعلية
  const [previewDevice, setPreviewDevice] = useState<"desktop" | "mobile">("desktop");
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

  const isCustomizedFromDefault = Boolean((serverConfig as any)?.isCustomized) || hasChanges;

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
    if (!hasChanges) {
      toast.info("لا توجد أي تعديلات جديدة لحفظها");
      return;
    }
    if (formConfig.fields.length === 0) {
      toast.error("يجب أن تحتوي الاستمارة على حقل واحد على الأقل");
      return;
    }
    saveMutation.mutate(formConfig);
  };

  const handleRevertChanges = () => {
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
      toast.info("تم التراجع عن التعديلات غير المحفوظة");
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        if (hasChanges && !saveMutation.isPending) {
          handleSave();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [hasChanges, saveMutation.isPending, formConfig]);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasChanges) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasChanges]);

  // إضافة حقل جديد
  const handleAddField = (type: EvaluationFieldType = "rating", customLabel = "سؤال جديد") => {
    const nextOrder = formConfig.fields.length > 0
      ? Math.max(...formConfig.fields.map((f) => f.order)) + 1
      : 1;

    const newField: FormField = {
      id: "eval_field_" + Date.now(),
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
              { label: "ممتاز", value: "excellent" },
              { label: "جيد جداً", value: "very_good" },
              { label: "جيد", value: "good" },
              { label: "مقبول", value: "acceptable" },
            ]
          : [],
      maxRating: 5,
      showLabels: true,
    };

    setFormConfig((prev) => ({
      ...prev,
      fields: [...prev.fields, newField],
    }));
    setExpandedFields((prev) => ({ ...prev, [newField.id]: true }));
    setHasChanges(true);
    toast.success("تمت إضافة حقل جديد");
  };

  // تكرار سؤال (Duplicate)
  const handleDuplicateField = (fieldId: string) => {
    const field = formConfig.fields.find((f) => f.id === fieldId);
    if (!field) return;

    const nextOrder = formConfig.fields.length > 0
      ? Math.max(...formConfig.fields.map((f) => f.order)) + 1
      : 1;

    const duplicated: FormField = {
      ...field,
      id: "eval_field_" + Date.now(),
      label: field.label + " (نسخة)",
      order: nextOrder,
      isSystem: false,
    };

    setFormConfig((prev) => ({
      ...prev,
      fields: [...prev.fields, duplicated],
    }));
    setExpandedFields((prev) => ({ ...prev, [duplicated.id]: true }));
    setHasChanges(true);
    toast.success("تم نسخ الحقل بنجاح");
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
    toast.info("تم حذف الحقل");
  };

  // تحريك حقل لأعلى أو لأسفل
  const handleMoveField = (index: number, direction: "up" | "down") => {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= formConfig.fields.length) return;

    const newFields = [...formConfig.fields];
    const item = newFields[index];
    newFields.splice(index, 1);
    newFields.splice(targetIndex, 0, item);

    const reordered = newFields.map((f, i) => ({ ...f, order: i + 1 }));
    setFormConfig((prev) => ({ ...prev, fields: reordered }));
    setHasChanges(true);
  };

  // سحب وإفلات
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

  const handleApplyPreset = (fieldId: string, options: FormFieldOption[]) => {
    handleUpdateField(fieldId, { options });
    toast.success("تم تطبيق القالب بنجاح");
  };

  const toggleFieldExpand = (fieldId: string) => {
    setExpandedFields((prev) => ({ ...prev, [fieldId]: !prev[fieldId] }));
  };

  const handleToggleExpandAll = () => {
    const allExpanded = formConfig.fields.every((f) => expandedFields[f.id]);
    const newState: Record<string, boolean> = {};
    formConfig.fields.forEach((f) => {
      newState[f.id] = !allExpanded;
    });
    setExpandedFields(newState);
  };

  // تصفية وبحث الأسئلة
  const filteredFields = useMemo(() => {
    return formConfig.fields.filter((field) => {
      const matchesSearch =
        searchQuery.trim() === "" ||
        field.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (field.helpText && field.helpText.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (field.placeholder && field.placeholder.toLowerCase().includes(searchQuery.toLowerCase()));

      let matchesFilter = true;
      if (activeFilter === "active") matchesFilter = field.isActive;
      else if (activeFilter === "required") matchesFilter = field.isActive && field.required;
      else if (activeFilter === "inactive") matchesFilter = !field.isActive;
      else if (activeFilter === "options") matchesFilter = ["select", "radio", "checkbox"].includes(field.type);

      return matchesSearch && matchesFilter;
    });
  }, [formConfig.fields, searchQuery, activeFilter]);

  const activeFieldsCount = useMemo(() => formConfig.fields.filter((f) => f.isActive).length, [formConfig.fields]);
  const requiredFieldsCount = useMemo(() => formConfig.fields.filter((f) => f.isActive && f.required).length, [formConfig.fields]);
  const inactiveFieldsCount = useMemo(() => formConfig.fields.filter((f) => !f.isActive).length, [formConfig.fields]);
  const optionsFieldsCount = useMemo(() => formConfig.fields.filter((f) => ["select", "radio", "checkbox"].includes(f.type)).length, [formConfig.fields]);

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
      <div className="space-y-6 max-w-5xl mx-auto pb-16">
        {/* ========================================================================= */}
        {/* شريط رأس الصفحة (مطابق تماماً لصفحة تخصيص بنيان وعناية) */}
        {/* ========================================================================= */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 sm:p-6 rounded-3xl border border-border/80 bg-card shadow-sm">
          <div className="flex items-center gap-3.5 min-w-0">
            <Link href="/forms-customization">
              <Button variant="ghost" size="icon" type="button" className="shrink-0 rounded-2xl hover:bg-muted">
                <ArrowRight className="w-5 h-5" />
              </Button>
            </Link>
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center shrink-0 bg-primary text-white shadow-md transition-transform hover:scale-105">
              <Star className="w-6 h-6 sm:w-7 sm:h-7 fill-white" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-lg sm:text-2xl font-black text-foreground tracking-tight">
                  تخصيص استمارة: قياس رضا المستفيدين
                </h1>
                {hasChanges && (
                  <Badge variant="outline" className="text-[11px] font-bold text-amber-600 border-amber-300 bg-amber-50 dark:bg-amber-950/30 animate-pulse flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                    <span>تعديلات غير محفوظة</span>
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                تخصيص وترتيب أسئلة واستبيان قياس رضا المستفيدين بعد إغلاق الخدمات
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap shrink-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsResetConfirmOpen(true)}
              disabled={resetMutation.isPending || !isCustomizedFromDefault}
              className={`text-xs h-10 px-3.5 rounded-xl border-border/80 shadow-2xs transition-all ${
                isCustomizedFromDefault
                  ? "text-muted-foreground hover:text-foreground hover:bg-muted/60 cursor-pointer"
                  : "text-muted-foreground/40 opacity-50 cursor-not-allowed hover:bg-transparent"
              }`}
              title={
                isCustomizedFromDefault
                  ? "استعادة الاستمارة والأسئلة الافتراضية الأصلية"
                  : "النموذج مضبوط على الإعدادات الافتراضية الأصلية بالفعل"
              }
            >
              <RotateCcw className="w-3.5 h-3.5 mr-1" />
              الافتراضي
            </Button>

            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setIsPreviewOpen(true)}
              className="text-xs font-bold gap-2 h-10 px-4 rounded-xl shadow-2xs hover:bg-muted/80"
            >
              <Eye className="w-4 h-4 text-primary" />
              <span>معاينة حية</span>
            </Button>

            <Button
              type="button"
              onClick={handleSave}
              disabled={saveMutation.isPending || !hasChanges}
              className={`text-xs font-bold px-5 h-10 rounded-xl shadow-md gap-2 transition-all ${
                hasChanges
                  ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-500/20 hover:shadow-lg cursor-pointer"
                  : "bg-muted text-muted-foreground opacity-50 cursor-not-allowed shadow-none hover:bg-muted"
              }`}
              title={hasChanges ? "حفظ التعديلات (Ctrl+S)" : "لا توجد تعديلات غير محفوظة"}
            >
              {saveMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              <span>حفظ النموذج</span>
              <span className="hidden lg:inline text-[10px] opacity-75 font-mono">(Ctrl+S)</span>
            </Button>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* شريط الإحصائيات والإضافة السريعة (مطابق لبنيان) */}
        {/* ========================================================================= */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 sm:p-4 px-5 rounded-2xl bg-muted/40 border border-border/80 text-xs">
          <div className="flex items-center gap-3 sm:gap-5 text-muted-foreground flex-wrap">
            <div className="flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-primary" />
              <span>إجمالي الحقول: <strong className="text-foreground">{formConfig.fields.length}</strong></span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>نشطة: <strong className="text-foreground">{activeFieldsCount}</strong></span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-red-500 font-bold">*</span>
              <span>إلزامية: <strong className="text-foreground">{requiredFieldsCount}</strong></span>
            </div>
            {inactiveFieldsCount > 0 && (
              <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                <span>معطلة: <strong>{inactiveFieldsCount}</strong></span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* القائمة السريعة لإضافة حقل حسب النوع */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  variant="default"
                  size="sm"
                  className="h-8 px-3 text-xs font-bold gap-1.5 rounded-xl bg-primary text-primary-foreground shadow-xs hover:opacity-95"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>إضافة حقل جديد</span>
                  <ChevronDown className="w-3 h-3 opacity-70" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64 rounded-2xl p-1.5 shadow-xl border-border">
                <DropdownMenuLabel className="text-xs font-bold text-muted-foreground px-2 py-1.5">
                  اختر نوع الحقل:
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {FIELD_TYPES.map((ft) => {
                  const Icon = ft.icon;
                  return (
                    <DropdownMenuItem
                      key={ft.type}
                      onClick={() => handleAddField(ft.type, `حقل ${ft.label}`)}
                      className="flex items-center gap-2.5 p-2 rounded-xl cursor-pointer hover:bg-muted transition-colors"
                    >
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${getFieldTypeBadge(ft.type)}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-foreground leading-tight">{ft.label}</p>
                        <p className="text-[10px] text-muted-foreground truncate">{ft.description}</p>
                      </div>
                    </DropdownMenuItem>
                  );
                })}
              </DropdownMenuContent>
            </DropdownMenu>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleToggleExpandAll}
              className="h-8 px-2.5 text-xs text-muted-foreground hover:text-foreground rounded-xl border-border/80"
              title="توسيع أو طي جميع الإعدادات التفصيلية للحقول"
            >
              <ChevronsUpDown className="w-3.5 h-3.5 mr-1" />
              <span>{formConfig.fields.every((f) => expandedFields[f.id]) ? "طي الكل" : "توسيع الكل"}</span>
            </Button>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* شريط البحث وتصفية الحقول (مطابق تماماً لبنيان) */}
        {/* ========================================================================= */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-card p-3 rounded-2xl border border-border/70 shadow-2xs">
          {/* حقل البحث */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="بحث في الحقول والتسميات..."
              className="h-9 pr-9 pl-8 text-xs rounded-xl bg-background border-border/70 focus-visible:border-primary"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground rounded-md"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* تبويبات التصفية السريعة */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0 hide-scrollbar">
            <Button
              type="button"
              variant={activeFilter === "all" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setActiveFilter("all")}
              className={`h-8 text-xs font-semibold px-2.5 rounded-lg shrink-0 ${activeFilter === "all" ? "bg-muted font-bold text-foreground" : "text-muted-foreground"}`}
            >
              الكل ({formConfig.fields.length})
            </Button>
            <Button
              type="button"
              variant={activeFilter === "active" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setActiveFilter("active")}
              className={`h-8 text-xs font-semibold px-2.5 rounded-lg shrink-0 ${activeFilter === "active" ? "bg-muted font-bold text-foreground" : "text-muted-foreground"}`}
            >
              النشطة ({activeFieldsCount})
            </Button>
            <Button
              type="button"
              variant={activeFilter === "required" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setActiveFilter("required")}
              className={`h-8 text-xs font-semibold px-2.5 rounded-lg shrink-0 ${activeFilter === "required" ? "bg-muted font-bold text-foreground" : "text-muted-foreground"}`}
            >
              الإلزامية ({requiredFieldsCount})
            </Button>
            {inactiveFieldsCount > 0 && (
              <Button
                type="button"
                variant={activeFilter === "inactive" ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setActiveFilter("inactive")}
                className={`h-8 text-xs font-semibold px-2.5 rounded-lg shrink-0 ${activeFilter === "inactive" ? "bg-muted font-bold text-foreground" : "text-muted-foreground"}`}
              >
                المعطلة ({inactiveFieldsCount})
              </Button>
            )}
            {optionsFieldsCount > 0 && (
              <Button
                type="button"
                variant={activeFilter === "options" ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setActiveFilter("options")}
                className={`h-8 text-xs font-semibold px-2.5 rounded-lg shrink-0 ${activeFilter === "options" ? "bg-muted font-bold text-foreground" : "text-muted-foreground"}`}
              >
                الخيارات ({optionsFieldsCount})
              </Button>
            )}
          </div>
        </div>

        {/* ========================================================================= */}
        {/* قائمة بطاقات الحقول بتصميم راقي وتفاعلي (مطابق تماماً لبنيان) */}
        {/* ========================================================================= */}
        {filteredFields.length === 0 ? (
          <div className="p-12 text-center rounded-3xl border-2 border-dashed border-border bg-card/50 space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-muted text-muted-foreground flex items-center justify-center mx-auto">
              <Search className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-foreground text-sm">لا توجد حقول مطابقة</h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              {searchQuery ? "لم يتم العثور على أي حقل يطابق كلمة البحث الحالية" : "لا توجد حقول في هذه التصفية"}
            </p>
            {searchQuery && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setSearchQuery("")}
                className="text-xs rounded-xl"
              >
                مسح البحث
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredFields.map((field) => {
              const actualIndex = formConfig.fields.findIndex((f) => f.id === field.id);
              const isDragging = draggedIndex === actualIndex;
              const isDragEnabled = dragEnabledIndex === actualIndex;
              const isExpanded = !!expandedFields[field.id];
              const FieldIcon = FIELD_TYPES.find((ft) => ft.type === field.type)?.icon || Star;

              return (
                <Fragment key={field.id}>
                  <div
                    draggable={isDragEnabled}
                    onDragStart={(e) => handleDragStart(e, actualIndex)}
                    onDragOver={(e) => handleDragOver(e, actualIndex)}
                    onDragEnd={handleDragEnd}
                    className={`rounded-2xl border bg-card text-right transition-all duration-200 overflow-hidden ${
                      isDragging
                        ? "opacity-30 border-dashed border-2 border-primary scale-[0.99]"
                        : "border-border/80 shadow-xs hover:border-primary/40 hover:shadow-md"
                    } ${!field.isActive ? "opacity-60 bg-muted/20 border-dashed" : ""}`}
                  >
                    {/* الشريط الأساسي للحقل */}
                    <div className="p-3.5 sm:p-4 flex flex-col md:flex-row md:items-center gap-3">
                      
                      {/* مقبض السحب والإفلات + أزرار الترتيب السريع + رقم الترتيب */}
                      <div className="flex items-center gap-1.5 shrink-0 select-none">
                        {/* مقبض السحب */}
                        <div
                          onMouseDown={() => setDragEnabledIndex(actualIndex)}
                          onMouseUp={() => setDragEnabledIndex(null)}
                          onTouchStart={() => setDragEnabledIndex(actualIndex)}
                          onTouchEnd={() => setDragEnabledIndex(null)}
                          className="p-1 rounded-lg text-muted-foreground/60 hover:text-foreground hover:bg-muted cursor-grab active:cursor-grabbing transition-colors"
                          title="اسحب لترتيب الحقل"
                        >
                          <GripVertical className="w-4 h-4 pointer-events-none" />
                        </div>

                        {/* أزرار التحريك السريع (Up/Down) */}
                        <div className="flex flex-col gap-0.5">
                          <button
                            type="button"
                            disabled={actualIndex === 0}
                            onClick={() => handleMoveField(actualIndex, "up")}
                            className="p-0.5 rounded text-muted-foreground hover:text-primary hover:bg-primary/10 disabled:opacity-20 disabled:hover:bg-transparent transition-colors"
                            title="تحريك لأعلى"
                          >
                            <ChevronUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            disabled={actualIndex === formConfig.fields.length - 1}
                            onClick={() => handleMoveField(actualIndex, "down")}
                            className="p-0.5 rounded text-muted-foreground hover:text-primary hover:bg-primary/10 disabled:opacity-20 disabled:hover:bg-transparent transition-colors"
                            title="تحريك لأسفل"
                          >
                            <ChevronDown className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* رقم الترتيب */}
                        <div className="w-7 h-7 rounded-xl bg-muted/60 text-muted-foreground font-black text-xs flex items-center justify-center border border-border/80 shrink-0">
                          #{actualIndex + 1}
                        </div>

                        {/* أيقونة نوع الحقل */}
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center border shrink-0 ${getFieldTypeBadge(field.type)}`}>
                          <FieldIcon className="w-4 h-4" />
                        </div>
                      </div>

                      {/* عنوان الحقل (تعديل مباشر) */}
                      <div className="flex-1 min-w-0">
                        <Input
                          value={field.label}
                          onChange={(e) => handleUpdateField(field.id, { label: e.target.value })}
                          placeholder="اسم الحقل / السؤال المطلوب..."
                          className="h-10 text-xs sm:text-sm font-bold text-right rounded-xl bg-background border-border/80 focus-visible:border-primary"
                        />
                      </div>

                      {/* نوع الحقل */}
                      <div className="w-full sm:w-40 shrink-0">
                        <Select
                          value={field.type}
                          onValueChange={(val: EvaluationFieldType) =>
                            handleUpdateField(field.id, {
                              type: val,
                              options:
                                ["radio", "select"].includes(val) && (!field.options || field.options.length === 0)
                                  ? [
                                      { label: "ممتاز", value: "excellent" },
                                      { label: "جيد جداً", value: "very_good" },
                                      { label: "جيد", value: "good" },
                                      { label: "مقبول", value: "acceptable" },
                                    ]
                                  : field.options,
                            })
                          }
                        >
                          <SelectTrigger className="h-10 text-xs font-semibold text-right rounded-xl border-border/80 bg-background">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent align="end" className="rounded-xl shadow-xl border-border">
                            {FIELD_TYPES.map((ft) => (
                              <SelectItem key={ft.type} value={ft.type} className="text-xs py-2 font-medium">
                                {ft.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* مفاتيح التحكم السريعة (إجباري + مفعل) */}
                      <div className="flex items-center gap-2 shrink-0">
                        {/* مفتاح الإلزامية */}
                        <div className="flex items-center gap-1.5 bg-muted/40 px-2.5 py-1.5 rounded-xl border border-border/60">
                          <span className="text-[11px] text-muted-foreground font-semibold">إجباري:</span>
                          <Switch
                            checked={field.required}
                            onCheckedChange={(c) => handleUpdateField(field.id, { required: c })}
                          />
                        </div>

                        {/* مفتاح التفعيل */}
                        <div className="flex items-center gap-1.5 bg-muted/40 px-2.5 py-1.5 rounded-xl border border-border/60">
                          <span className="text-[11px] text-muted-foreground font-semibold">مفعل:</span>
                          <Switch
                            checked={field.isActive}
                            onCheckedChange={(c) => handleUpdateField(field.id, { isActive: c })}
                          />
                        </div>
                      </div>

                      {/* أزرار الإجراءات الإضافية (توسيع Settings2، نسخ Copy، حذف Trash2) */}
                      <div className="flex items-center gap-1 shrink-0">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => toggleFieldExpand(field.id)}
                          className={`h-9 w-9 rounded-xl transition-colors ${
                            isExpanded ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted"
                          }`}
                          title="إعدادات وتفاصيل إضافية"
                        >
                          <Settings2 className="w-4 h-4" />
                        </Button>

                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDuplicateField(field.id)}
                          className="h-9 w-9 rounded-xl text-muted-foreground hover:text-primary hover:bg-primary/10"
                          title="نسخ هذا الحقل"
                        >
                          <Copy className="w-4 h-4" />
                        </Button>

                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteField(field.id)}
                          className="h-9 w-9 rounded-xl text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                          title="حذف الحقل"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>

                    {/* لوحة الإعدادات الموسعة والتفصيلية للحقل */}
                    {isExpanded && (
                      <div className="p-4 pt-3 border-t border-border/70 bg-muted/15 space-y-4 animate-in fade-in duration-200">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {/* النص التلميحي (Placeholder) */}
                          {field.type !== "rating" && (
                            <div className="space-y-1.5">
                              <Label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                                <FileText className="w-3.5 h-3.5 text-primary/70" />
                                <span>نص التلميح الداخلي (Placeholder):</span>
                              </Label>
                              <Input
                                value={field.placeholder || ""}
                                onChange={(e) => handleUpdateField(field.id, { placeholder: e.target.value })}
                                placeholder="مثال: اكتب التفاصيل هنا..."
                                className="h-9 text-xs bg-background rounded-xl text-right border-border/80"
                              />
                            </div>
                          )}

                          {/* النص المساعد التوضيحي (Help Text) */}
                          <div className="space-y-1.5">
                            <Label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                              <HelpCircle className="w-3.5 h-3.5 text-primary/70" />
                              <span>الوصف الإرشادي للمستخدم (Help Text):</span>
                            </Label>
                            <Input
                              value={field.helpText || ""}
                              onChange={(e) => handleUpdateField(field.id, { helpText: e.target.value })}
                              placeholder="يظهر بخط أصغر أسفل الحقل لإرشاد مقدم الطلب..."
                              className="h-9 text-xs bg-background rounded-xl text-right border-border/80"
                            />
                          </div>
                        </div>

                        {/* تخصيص خاص بأسئلة التقييم بالنجوم ⭐ */}
                        {field.type === "rating" && (
                          <div className="p-3.5 rounded-2xl bg-card border border-border/80 space-y-2">
                            <div className="flex items-center justify-between text-xs font-bold text-foreground">
                              <span className="flex items-center gap-1.5">
                                <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                                <span>مقياس النجوم والإيموجي التفاعلي:</span>
                              </span>
                              <span className="text-[11px] text-muted-foreground font-normal">
                                مقياس الرضا التفاعلي (من 1 إلى 5 نجوم)
                              </span>
                            </div>
                            <div className="flex items-center gap-2 flex-wrap pt-1 text-xs">
                              {Object.entries(RATING_EMOJIS).map(([star, data]) => (
                                <div key={star} className={`px-2.5 py-1 rounded-xl border text-[11px] font-bold ${data.color} flex items-center gap-1`}>
                                  <span>{data.emoji}</span>
                                  <span>{star}★ {data.label}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* محرر خيارات القوائم وأسئلة الاختيار (Radio / Select) */}
                        {["select", "radio"].includes(field.type) && (
                          <div className="p-3.5 rounded-2xl bg-card border border-border/80 space-y-3">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                              <div className="flex items-center gap-2">
                                <List className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                                <span className="text-xs font-bold text-foreground">خيارات الإجابة المتوفرة:</span>
                                <Badge variant="secondary" className="text-[10px] px-2 py-0.2 rounded-md">
                                  {field.options?.length || 0} خيار
                                </Badge>
                              </div>

                              {/* قوالب خيارات سريعة */}
                              <div className="flex items-center gap-1 flex-wrap">
                                <span className="text-[11px] text-muted-foreground ml-1">قوالب جاهزة:</span>
                                {PRESET_OPTIONS.map((preset, pIdx) => (
                                  <button
                                    key={pIdx}
                                    type="button"
                                    onClick={() => handleApplyPreset(field.id, preset.options)}
                                    className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-muted hover:bg-primary/10 hover:text-primary transition-colors border border-border/60"
                                  >
                                    {preset.name}
                                  </button>
                                ))}
                              </div>
                            </div>

                            {/* قائمة الخيارات المضافة كرقاقات تفاعلية */}
                            {field.options && field.options.length > 0 && (
                              <div className="flex items-center gap-2 flex-wrap pt-1">
                                {field.options.map((opt, oIdx) => (
                                  <div
                                    key={oIdx}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-background border border-border/80 text-xs font-bold text-foreground shadow-2xs hover:border-purple-400 transition-colors"
                                  >
                                    <span className="w-2 h-2 rounded-full bg-purple-500" />
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
                            <div className="flex items-center gap-2 max-w-md pt-1">
                              <Input
                                value={newOptionInputs[field.id] || ""}
                                onChange={(e) =>
                                  setNewOptionInputs((prev) => ({ ...prev, [field.id]: e.target.value }))
                                }
                                placeholder="اكتب خياراً جديداً واضغط إضافة..."
                                className="h-8 text-xs bg-muted/20 rounded-xl text-right border-border/80"
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
                                className="h-8 px-3.5 text-xs font-bold gap-1 rounded-xl bg-primary text-primary-foreground shadow-2xs hover:opacity-95 shrink-0"
                              >
                                <Plus className="w-3.5 h-3.5" />
                                <span>إضافة</span>
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </Fragment>
              );
            })}
          </div>
        )}

        {/* ========================================================================= */}
        {/* زر إضافة حقل جديد أسفل القائمة (مطابق لبنيان) */}
        {/* ========================================================================= */}
        <div className="pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => handleAddField()}
            className="w-full h-12 border-dashed border-2 hover:border-primary hover:bg-primary/5 text-xs font-bold gap-2 rounded-2xl transition-all shadow-2xs text-muted-foreground hover:text-primary"
          >
            <Plus className="w-4 h-4" />
            <span>إضافة حقل جديد للاستمارة</span>
          </Button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* الشريط العائم لحفظ التعديلات في الأسفل عند وجود تغييرات (مطابق لبنيان) */}
      {/* ========================================================================= */}
      {hasChanges && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 max-w-lg w-[92%] bg-slate-900 text-white dark:bg-zinc-900 border border-slate-700/80 p-3 sm:p-3.5 px-5 rounded-2xl shadow-2xl flex items-center justify-between gap-3 animate-in slide-in-from-bottom-5 duration-200">
          <div className="flex items-center gap-2 min-w-0">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse shrink-0" />
            <span className="text-xs font-bold truncate">تعديلات غير محفوظة (Ctrl+S)</span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleRevertChanges}
              className="h-8 px-2.5 text-xs text-slate-300 hover:text-white hover:bg-slate-800 rounded-xl"
            >
              تراجع
            </Button>
            <Button
              type="button"
              onClick={handleSave}
              disabled={saveMutation.isPending}
              className="h-8 px-4 text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl shadow-sm gap-1.5"
            >
              {saveMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              <span>حفظ التعديلات</span>
            </Button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* نافذة المعاينة الحية بصفحة كاملة المطابقة لصفحة التقييم الواقعية */}
      {/* ========================================================================= */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent
          showCloseButton={false}
          className="fixed inset-0 top-0 left-0 w-screen h-[100dvh] max-w-none max-h-none sm:max-w-none translate-x-0 translate-y-0 rounded-none border-0 p-0 overflow-hidden flex flex-col text-right shadow-none bg-slate-100 dark:bg-zinc-950 duration-200"
          dir="rtl"
        >
          {/* شريط أدوات المعاينة */}
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
                  ? "relative w-[395px] max-w-[395px] h-[820px] max-h-[88vh] bg-background rounded-[50px] border-[10px] border-slate-900 dark:border-zinc-800 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.5),0_0_0_2px_rgba(255,255,255,0.08)] flex flex-col overflow-hidden select-none my-auto ring-1 ring-black/20 shrink-0"
                  : "max-w-2xl mx-auto space-y-6"
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
                {/* استمارة التقييم التفاعلية */}
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
                                        { label: "ممتاز", value: "excellent" },
                                        { label: "جيد جداً", value: "very_good" },
                                        { label: "جيد", value: "good" },
                                        { label: "مقبول", value: "acceptable" },
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
                        onClick={() => toast.success("تم إرسال استبيان التقييم تجريبياً")}
                        className="w-full h-12 rounded-2xl font-bold text-xs sm:text-sm gap-2 shadow-md text-white"
                        style={{ backgroundColor: formConfig.headerBgColor || "#14707a" }}
                      >
                        <Send className="w-4 h-4" />
                        <span>{formConfig.submitButtonText || "إرسال التقييم"}</span>
                      </Button>
                    </div>
                  </div>
                </div>


              </div>

              {/* شريط السحب السفلي لهواتف iPhone (Home Indicator) */}
              {previewDevice === "mobile" && (
                <div className="pb-2.5 pt-1.5 bg-background/95 backdrop-blur shrink-0 flex justify-center border-t border-border/30">
                  <div className="w-32 h-1 bg-foreground/20 rounded-full mx-auto" />
                </div>
              )}
            </div>
          </div>

          {/* تذييل نافذة المعاينة */}
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
              className="text-xs font-bold px-5 rounded-xl bg-primary text-primary-foreground shadow-sm"
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