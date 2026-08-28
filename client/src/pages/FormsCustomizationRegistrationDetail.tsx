import React, { useState, useEffect, useMemo, Fragment } from "react";
import { Link, useRoute } from "wouter";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
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
  Paperclip,
  Loader2,
  X,
  Building2,
  GripVertical,
  Monitor,
  Smartphone,
  Check,
  Ruler,
  Users,
  MapPin,
  Coins,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  CloudUpload,
  Layers,
  Sparkles,
  Wifi,
  Battery,
  Signal,
  Search,
  Copy,
  SlidersHorizontal,
  Settings2,
  HelpCircle,
  ChevronsUpDown,
  LandPlot,
  Package,
  CreditCard,
  HeartHandshake,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

export type ServiceFieldType =
  | "text"
  | "textarea"
  | "number"
  | "select"
  | "radio"
  | "checkbox"
  | "date"
  | "file"
  | "phone"
  | "email";

export interface FormFieldOption {
  label: string;
  value: string;
}

export interface ServiceField {
  id: string;
  type: ServiceFieldType;
  label: string;
  placeholder?: string;
  helpText?: string;
  required: boolean;
  isActive: boolean;
  order: number;
  options?: FormFieldOption[];
  isSystem?: boolean;
}

const FIELD_TYPES: Array<{
  type: ServiceFieldType;
  label: string;
  description: string;
  icon: any;
  category: "text" | "choice" | "data" | "contact";
}> = [
  { type: "text", label: "نص قصير", description: "اسم، عنوان، مدخل بسيط", icon: FileText, category: "text" },
  { type: "textarea", label: "نص طويل / وصف", description: "تفاصيل، شرح، ملاحظات", icon: AlignLeft, category: "text" },
  { type: "number", label: "رقمي", description: "أعداد، مساحات، مبالغ", icon: Hash, category: "data" },
  { type: "date", label: "تاريخ", description: "تاريخ معين من التقويم", icon: Calendar, category: "data" },
  { type: "select", label: "قائمة منسدلة", description: "اختيار واحد من قائمة", icon: List, category: "choice" },
  { type: "radio", label: "خيارات متعددة", description: "نعم/لا أو خيارات واضحة", icon: Radio, category: "choice" },
  { type: "checkbox", label: "مربع اختيار", description: "إقرار، موافقة", icon: CheckSquare, category: "choice" },
  { type: "file", label: "مرفق / مستند", description: "رفع PDF، صور، مستندات", icon: Paperclip, category: "contact" },
  { type: "phone", label: "رقم جوال", description: "رقم هاتف محمول", icon: Phone, category: "contact" },
  { type: "email", label: "بريد إلكتروني", description: "عنوان بريد إلكتروني", icon: Mail, category: "contact" },
];

const PRESET_OPTIONS = [
  {
    name: "نعم / لا",
    options: [
      { label: "نعم", value: "yes" },
      { label: "لا", value: "no" },
    ],
  },
  {
    name: "متاح / غير متاح",
    options: [
      { label: "متاح", value: "available" },
      { label: "غير متاح", value: "not_available" },
    ],
  },
  {
    name: "حالة المواد (جديدة / ممتازة / جيدة)",
    options: [
      { label: "جديدة بالكرتون", value: "new" },
      { label: "مستعملة بحالة ممتازة", value: "excellent" },
      { label: "مستعملة بحالة جيدة", value: "good" },
    ],
  },
  {
    name: "فترات التواصل المفضلة",
    options: [
      { label: "صباحاً (9ص - 12ظ)", value: "morning" },
      { label: "مساءً (4ع - 9م)", value: "evening" },
      { label: "طوال اليوم", value: "anytime" },
    ],
  },
];

const FORM_META_MAP: Record<string, { icon: any; color: string; label: string; trackName: string; stepTitle: string }> = {
  donor_land: {
    icon: LandPlot,
    color: "bg-emerald-600",
    label: "مسار المتبرع بأرض",
    trackName: "متبرع بأرض",
    stepTitle: "تفاصيل الأرض المتبرع بها",
  },
  donor_inkind: {
    icon: Package,
    color: "bg-teal-600",
    label: "مسار المتبرع بتبرع عيني",
    trackName: "تبرع عيني",
    stepTitle: "تفاصيل التبرع العيني والمواد",
  },
  donor_financial: {
    icon: CreditCard,
    color: "bg-amber-600",
    label: "مسار المتبرع بتبرع مالي",
    trackName: "تبرع مالي",
    stepTitle: "تفاصيل التبرع المالي والحوالة",
  },
  donor_other: {
    icon: Sparkles,
    color: "bg-blue-600",
    label: "مسار متبرع (شراكة / وقفية / أخرى)",
    trackName: "شراكة / وقفية / أخرى",
    stepTitle: "تفاصيل مقترح التبرع أو الشراكة",
  },
  other: {
    icon: HelpCircle,
    color: "bg-sky-600",
    label: "مسار أخرى (استفسارات وطلبات عامة)",
    trackName: "استفسارات وطلبات عامة",
    stepTitle: "تفاصيل الصفة والطلب العام",
  },
};

const getFieldIcon = (fieldId: string) => {
  switch (fieldId) {
    case "landDetails":
    case "inKindDetails":
    case "donorOtherDetails":
    case "requestDetails":
    case "notes":
      return FileText;
    case "landArea":
    case "landDimensions":
      return Ruler;
    case "landLocation":
    case "inKindLocation":
      return MapPin;
    case "landOwner":
    case "customRoleTitle":
    case "name":
      return Users;
    case "financialAmount":
    case "financialBankName":
      return Coins;
    case "phone":
    case "mobile":
      return Phone;
    case "email":
      return Mail;
    default:
      return null;
  }
};

const getUnitSuffix = (fieldId: string) => {
  switch (fieldId) {
    case "landArea":
      return "م²";
    case "financialAmount":
      return "ريال";
    case "distanceToMosque":
      return "كم";
    default:
      return null;
  }
};

export default function FormsCustomizationRegistrationDetail() {
  const [, params] = useRoute("/forms-customization/registration/:formId");
  const formId = params?.formId || "";

  const utils = trpc.useUtils();

  const meta = FORM_META_MAP[formId] || {
    icon: HeartHandshake,
    color: "bg-emerald-600",
    label: "استمارة التسجيل",
    trackName: "استمارة التسجيل",
    stepTitle: "تفاصيل الاستمارة",
  };

  const { data: serverConfig, isLoading } = trpc.forms.getRegistrationFormConfig.useQuery(
    { formId },
    { enabled: !!formId }
  );

  const [fields, setFields] = useState<ServiceField[]>([]);
  const [hasChanges, setHasChanges] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);
  const [newOptionInputs, setNewOptionInputs] = useState<Record<string, string>>({});
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragEnabledIndex, setDragEnabledIndex] = useState<number | null>(null);

  // حالات البحث، التصفية، والتوسيع
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<"all" | "active" | "required" | "inactive" | "options">("all");
  const [expandedFields, setExpandedFields] = useState<Record<string, boolean>>({});

  // حالة المعاينة التفاعلية
  const [previewDevice, setPreviewDevice] = useState<"desktop" | "mobile">("desktop");
  const [previewValues, setPreviewValues] = useState<Record<string, any>>({});

  useEffect(() => {
    if (serverConfig?.fields) {
      const loaded = [...serverConfig.fields].sort((a, b) => a.order - b.order);
      setFields(loaded);
      setHasChanges(false);
    }
  }, [serverConfig, formId]);

  const isCustomizedFromDefault = Boolean((serverConfig as any)?.isCustomized) || hasChanges;

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

  const saveMutation = trpc.forms.saveRegistrationFormConfig.useMutation({
    onSuccess: (res) => {
      toast.success(res.message);
      setHasChanges(false);
      utils.forms.invalidate();
    },
    onError: (err) => {
      toast.error(err.message || "حدث خطأ أثناء الحفظ");
    },
  });

  const resetMutation = trpc.forms.resetRegistrationFormConfig.useMutation({
    onSuccess: (res) => {
      toast.success(res.message);
      setIsResetConfirmOpen(false);
      utils.forms.invalidate();
    },
    onError: (err) => {
      toast.error(err.message || "حدث خطأ أثناء استعادة الافتراضي");
    },
  });

  const handleSave = () => {
    if (!hasChanges) {
      toast.info("لا توجد أي تعديلات جديدة لحفظها");
      return;
    }
    if (fields.length === 0) {
      toast.error("يجب أن يحتوي النموذج على حقل واحد على الأقل");
      return;
    }

    saveMutation.mutate({
      formId,
      formName: meta.label || formId,
      fields,
    });
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
  }, [fields, formId, hasChanges, saveMutation.isPending]);

  const handleAddField = (type: ServiceFieldType = "text", customLabel = "حقل جديد") => {
    const nextOrder = fields.length > 0 ? Math.max(...fields.map((f) => f.order)) + 1 : 1;

    const newField: ServiceField = {
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
              { label: "الخيار الأول", value: "opt_1" },
              { label: "الخيار الثاني", value: "opt_2" },
            ]
          : [],
    };

    setFields((prev) => [...prev, newField]);
    setHasChanges(true);
    setExpandedFields((prev) => ({ ...prev, [newField.id]: true }));
    toast.success("تمت إضافة حقل جديد للنموذج");
  };

  const handleDuplicateField = (fieldId: string) => {
    const fieldIndex = fields.findIndex((f) => f.id === fieldId);
    if (fieldIndex === -1) return;

    const originalField = fields[fieldIndex];
    const newFieldId = `field_${Date.now()}`;
    const newField: ServiceField = {
      ...originalField,
      id: newFieldId,
      label: `${originalField.label} (نسخة)`,
      order: originalField.order + 1,
      options: originalField.options ? originalField.options.map((opt) => ({ ...opt })) : undefined,
    };

    const newFields = [...fields];
    newFields.splice(fieldIndex + 1, 0, newField);
    const updated = newFields.map((f, i) => ({ ...f, order: i + 1 }));

    setFields(updated);
    setHasChanges(true);
    setExpandedFields((prev) => ({ ...prev, [newFieldId]: true }));
    toast.success(`تم نسخ الحقل "${originalField.label}"`);
  };

  const handleMoveField = (index: number, direction: "up" | "down") => {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= fields.length) return;

    const newFields = [...fields];
    const item = newFields[index];
    newFields.splice(index, 1);
    newFields.splice(targetIndex, 0, item);

    const updated = newFields.map((f, i) => ({ ...f, order: i + 1 }));
    setFields(updated);
    setHasChanges(true);
  };

  const handleUpdateField = (fieldId: string, updates: Partial<ServiceField>) => {
    setFields((prev) =>
      prev.map((f) => (f.id === fieldId ? { ...f, ...updates } : f))
    );
    setHasChanges(true);
  };

  const handleDeleteField = (fieldId: string) => {
    setFields((prev) => prev.filter((f) => f.id !== fieldId));
    setHasChanges(true);
    toast.info("تم حذف الحقل");
  };

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    const newFields = [...fields];
    const draggedItem = newFields[draggedIndex];
    newFields.splice(draggedIndex, 1);
    newFields.splice(index, 0, draggedItem);

    const updated = newFields.map((f, i) => ({ ...f, order: i + 1 }));
    setDraggedIndex(index);
    setFields(updated);
    setHasChanges(true);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragEnabledIndex(null);
  };

  const handleAddOption = (fieldId: string) => {
    const text = (newOptionInputs[fieldId] || "").trim();
    if (!text) return;

    const field = fields.find((f) => f.id === fieldId);
    if (!field) return;

    const updatedOptions = [...(field.options || []), { label: text, value: text }];
    handleUpdateField(fieldId, { options: updatedOptions });
    setNewOptionInputs((prev) => ({ ...prev, [fieldId]: "" }));
  };

  const handleApplyPreset = (fieldId: string, options: FormFieldOption[]) => {
    handleUpdateField(fieldId, { options: [...options] });
    toast.success("تم تطبيق القالب الجاهز للخيارات");
  };

  const handleRemoveOption = (fieldId: string, optIndex: number) => {
    const field = fields.find((f) => f.id === fieldId);
    if (!field || !field.options) return;

    const updatedOptions = field.options.filter((_, i) => i !== optIndex);
    handleUpdateField(fieldId, { options: updatedOptions });
  };

  const handleToggleExpandAll = () => {
    const areAllExpanded = fields.every((f) => expandedFields[f.id]);
    if (areAllExpanded) {
      setExpandedFields({});
    } else {
      const all: Record<string, boolean> = {};
      fields.forEach((f) => (all[f.id] = true));
      setExpandedFields(all);
    }
  };

  const toggleFieldExpand = (fieldId: string) => {
    setExpandedFields((prev) => ({ ...prev, [fieldId]: !prev[fieldId] }));
  };

  const filteredFields = useMemo(() => {
    return fields.filter((f) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesLabel = f.label.toLowerCase().includes(q);
        const matchesPlaceholder = f.placeholder && f.placeholder.toLowerCase().includes(q);
        const matchesHelp = f.helpText && f.helpText.toLowerCase().includes(q);
        if (!matchesLabel && !matchesPlaceholder && !matchesHelp) return false;
      }

      if (activeFilter === "active") return f.isActive;
      if (activeFilter === "required") return f.isActive && f.required;
      if (activeFilter === "inactive") return !f.isActive;
      if (activeFilter === "options") return ["select", "radio"].includes(f.type);
      return true;
    });
  }, [fields, searchQuery, activeFilter]);

  const activeFieldsCount = useMemo(() => fields.filter((f) => f.isActive).length, [fields]);
  const requiredFieldsCount = useMemo(() => fields.filter((f) => f.isActive && f.required).length, [fields]);
  const inactiveFieldsCount = useMemo(() => fields.filter((f) => !f.isActive).length, [fields]);
  const optionsFieldsCount = useMemo(() => fields.filter((f) => ["select", "radio"].includes(f.type)).length, [fields]);

  const IconComponent = meta.icon;

  const getFieldTypeBadge = (type: ServiceFieldType) => {
    switch (type) {
      case "text":
      case "textarea":
        return "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800";
      case "number":
        return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800";
      case "select":
      case "radio":
        return "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-800";
      case "checkbox":
        return "bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-200 dark:border-teal-800";
      case "date":
        return "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800";
      case "file":
        return "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-800";
      case "phone":
      case "email":
        return "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800";
      default:
        return "bg-muted text-muted-foreground border-border";
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[350px]">
          <div className="text-center space-y-3">
            <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
            <p className="text-sm font-semibold text-foreground">جاري تحميل حقول النموذج...</p>
            <p className="text-xs text-muted-foreground">يتم جلب الإعدادات المخصصة وحقول الاستمارة</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-5 max-w-5xl mx-auto pb-24">
        
        {/* شريط المسار والرجوع (Breadcrumbs) */}
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium select-none">
          <Link href="/forms-customization" className="hover:text-foreground transition-colors">
            تخصيص النماذج
          </Link>
          <ChevronLeft className="w-3.5 h-3.5 text-muted-foreground/50" />
          <Link href="/forms-customization/registration" className="hover:text-foreground transition-colors">
            نماذج التسجيل والتبرع
          </Link>
          <ChevronLeft className="w-3.5 h-3.5 text-muted-foreground/50" />
          <span className="text-foreground font-bold">{meta.label}</span>
        </div>

        {/* رأس الصفحة الرئيسي والتفاعلي */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 sm:p-6 rounded-3xl border border-border/80 bg-card shadow-sm">
          <div className="flex items-center gap-3.5 min-w-0">
            <Link href="/forms-customization/registration">
              <Button variant="ghost" size="icon" type="button" className="shrink-0 rounded-2xl hover:bg-muted">
                <ArrowRight className="w-5 h-5" />
              </Button>
            </Link>
            <div
              className={`w-12 h-12 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center shrink-0 ${
                meta.color
              } text-white shadow-md transition-transform hover:scale-105`}
            >
              <IconComponent className="w-6 h-6 sm:w-7 sm:h-7" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-lg sm:text-2xl font-black text-foreground tracking-tight">
                  تخصيص استمارة: {meta.label}
                </h1>
                {hasChanges && (
                  <Badge variant="outline" className="text-[11px] font-bold text-amber-600 border-amber-300 bg-amber-50 dark:bg-amber-950/30 animate-pulse flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                    <span>تعديلات غير محفوظة</span>
                  </Badge>
                )}
                {serverConfig?.isCustomized && !hasChanges && (
                  <Badge variant="outline" className="text-[11px] font-bold text-emerald-600 border-emerald-300 bg-emerald-50 dark:bg-emerald-950/30 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    <span>مخصص ومحفوظ</span>
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                تخصيص وترتيب الحقول التي تظهر للمستخدم في صفحة التسجيل
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
                  ? "استعادة الترتيب والحقول الافتراضية الأصلية للاستمارة"
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

        {/* شريط الإحصائيات والإضافة السريعة */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 sm:p-4 px-5 rounded-2xl bg-muted/40 border border-border/80 text-xs">
          <div className="flex items-center gap-3 sm:gap-5 text-muted-foreground flex-wrap">
            <div className="flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-primary" />
              <span>إجمالي الحقول: <strong className="text-foreground">{fields.length}</strong></span>
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
              <DropdownMenuContent align="end" className="w-64 rounded-2xl p-1.5 shadow-xl border-border" dir="rtl">
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
              <span>{fields.every((f) => expandedFields[f.id]) ? "طي الكل" : "توسيع الكل"}</span>
            </Button>
          </div>
        </div>

        {/* شريط البحث وتصفية الحقول */}
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
              الكل ({fields.length})
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

        {/* قائمة بطاقات الحقول بتصميم راقي وتفاعلي */}
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
              const actualIndex = fields.findIndex((f) => f.id === field.id);
              const isDragging = draggedIndex === actualIndex;
              const isDragEnabled = dragEnabledIndex === actualIndex;
              const isExpanded = !!expandedFields[field.id];
              const FieldIcon = getFieldIcon(field.id) || (FIELD_TYPES.find((ft) => ft.type === field.type)?.icon || FileText);

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
                            disabled={actualIndex === fields.length - 1}
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
                          onValueChange={(val: ServiceFieldType) =>
                            handleUpdateField(field.id, {
                              type: val,
                              options:
                                ["radio", "select"].includes(val) && (!field.options || field.options.length === 0)
                                  ? [
                                      { label: "نعم", value: "yes" },
                                      { label: "لا", value: "no" },
                                    ]
                                  : field.options,
                            })
                          }
                        >
                          <SelectTrigger className="h-10 text-xs font-semibold text-right rounded-xl border-border/80 bg-background">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent align="end" className="rounded-xl shadow-xl border-border" dir="rtl">
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

                      {/* أزرار الإجراءات الإضافية (توسيع، نسخ، حذف) */}
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
                                placeholder="اكتب اسم الخيار ثم اضغط Enter أو إضافة..."
                                className="h-9 text-xs bg-background rounded-xl text-right border-border/80 focus-visible:border-purple-500"
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
                                className="h-9 px-4 text-xs font-bold gap-1 rounded-xl shrink-0 bg-purple-600 hover:bg-purple-700 text-white"
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

        {/* زر إضافة حقل جديد في الأسفل */}
        <div className="pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => handleAddField()}
            className="w-full h-12 border-dashed border-2 hover:border-primary hover:bg-primary/5 text-xs font-bold gap-2 rounded-2xl transition-all shadow-2xs"
          >
            <Plus className="w-4 h-4 text-primary" />
            <span>إضافة حقل / سؤال جديد لهذا النموذج</span>
          </Button>
        </div>

        {/* شريط الإجراءات العائم السفلي عند وجود تعديلات غير محفوظة */}
        {hasChanges && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 w-[92%] max-w-2xl bg-card/95 backdrop-blur-md p-3.5 px-5 rounded-2xl border-2 border-primary/30 shadow-[0_10px_35px_-5px_rgba(0,0,0,0.3)] flex items-center justify-between gap-4 animate-in slide-in-from-bottom-4 duration-200">
            <div className="flex items-center gap-2.5 text-xs font-bold text-foreground">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
              <span>لديك تعديلات غير محفوظة في النموذج</span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  if (serverConfig?.fields) {
                    setFields([...serverConfig.fields].sort((a, b) => a.order - b.order));
                    setHasChanges(false);
                    toast.info("تم التراجع عن التعديلات");
                  }
                }}
                className="h-9 px-3 text-xs text-muted-foreground hover:text-foreground rounded-xl"
              >
                تراجع
              </Button>
              <Button
                type="button"
                onClick={handleSave}
                disabled={saveMutation.isPending}
                className="h-9 px-5 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-md gap-1.5"
              >
                {saveMutation.isPending ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Save className="w-3.5 h-3.5" />
                )}
                <span>حفظ التعديلات</span>
              </Button>
            </div>
          </div>
        )}

      </div>

      {/* ========================================================================= */}
      {/* نافذة المعاينة الحية بصفحة كاملة المطابقة لصفحة التسجيل */}
      {/* ========================================================================= */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent
          showCloseButton={false}
          className="fixed inset-0 top-0 left-0 w-screen h-[100dvh] max-w-none max-h-none sm:max-w-none translate-x-0 translate-y-0 rounded-none border-0 p-0 overflow-hidden flex flex-col text-right shadow-none bg-slate-100 dark:bg-zinc-950 duration-200"
          dir="rtl"
        >
          {/* Header المعاينة الصلب والأنيق */}
          <div className="p-3.5 sm:p-4 border-b border-border/80 bg-card flex items-center justify-between gap-3 shrink-0 shadow-xs">
            <div className="flex items-center gap-3 min-w-0">
              <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center ${meta.color} text-white shadow-xs shrink-0`}>
                <IconComponent className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <DialogTitle className="text-sm sm:text-base font-bold text-foreground flex items-center gap-2">
                  <span className="truncate">معاينة حية: استمارة {meta.label}</span>
                  <Badge variant="outline" className="text-[10px] h-5 bg-primary/10 text-primary border-primary/20 hidden md:inline-flex shrink-0">
                    صفحة تفاعلية
                  </Badge>
                </DialogTitle>
                <p className="text-[11px] text-muted-foreground line-clamp-1">
                  تظهر هذه المعاينة التفاعلية تماماً كما سيراها مقدم الطلب في صفحة التسجيل
                </p>
              </div>
            </div>

            {/* محول الجهاز (Desktop vs Mobile) وزر الإغلاق */}
            <div className="flex items-center gap-2 shrink-0">
              <div className="flex items-center gap-1 bg-muted/70 p-1 rounded-xl border border-border/60">
                <button
                  type="button"
                  onClick={() => setPreviewDevice("desktop")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    previewDevice === "desktop"
                      ? "bg-card text-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                  title="عرض بنسخة الكمبيوتر"
                >
                  <Monitor className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">كمبيوتر</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewDevice("mobile")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    previewDevice === "mobile"
                      ? "bg-card text-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                  title="عرض بنسخة الجوال"
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

          {/* محتوى المعاينة التفاعلي الواقعي */}
          <div className="flex-1 overflow-y-auto p-3.5 sm:p-6 lg:p-8 flex justify-center items-start bg-slate-100/90 dark:bg-zinc-950">
            <div
              className={`w-full transition-all duration-300 ${
                previewDevice === "mobile"
                  ? "relative w-[395px] max-w-[395px] h-[820px] max-h-[88vh] bg-background rounded-[50px] border-[10px] border-slate-900 dark:border-zinc-800 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.5),0_0_0_2px_rgba(255,255,255,0.08)] flex flex-col overflow-hidden select-none my-auto ring-1 ring-black/20 shrink-0"
                  : "max-w-4xl mx-auto space-y-6"
              }`}
            >
              {/* شريط حالة هاتف iPhone 14 Pro Max مع الجزيرة التفاعلية */}
              {previewDevice === "mobile" && (
                <div className="pt-3 px-5 pb-2 shrink-0 bg-background/95 backdrop-blur z-20 select-none border-b border-border/30">
                  <div className="flex items-center justify-between text-xs font-semibold text-foreground">
                    <span className="font-semibold tracking-tight text-xs">9:41</span>
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

              {/* مساحة محتوى شاشة الهاتف أو الكمبيوتر */}
              <div className={previewDevice === "mobile" ? "flex-1 overflow-y-auto p-3.5 sm:p-4 space-y-4 text-right bg-background" : "space-y-6"}>
                
                {/* 1. رأس صفحة التسجيل */}
                <div className={`flex items-center justify-between gap-2 sm:gap-4 ${previewDevice === "mobile" ? "mb-3 pb-2.5" : "mb-4 sm:mb-8 pb-3 sm:pb-4"} border-b border-border/40`}>
                  <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className={`${previewDevice === "mobile" ? "h-7 w-7" : "h-8 w-8 sm:h-10 sm:w-10"} rounded-xl hover:bg-muted shrink-0 text-foreground cursor-default`}
                    >
                      <ArrowRight className={`${previewDevice === "mobile" ? "w-3.5 h-3.5" : "w-4 h-4 sm:w-5 sm:h-5"}`} />
                    </Button>
                    <div className="min-w-0 flex-1">
                      <h1 className={`${previewDevice === "mobile" ? "text-xs" : "text-sm sm:text-2xl"} font-black text-foreground tracking-tight truncate`}>
                        طلب تسجيل / مساهمة جديدة
                      </h1>
                      <p className={`${previewDevice === "mobile" ? "text-[10px]" : "text-[11px] sm:text-sm"} text-muted-foreground mt-0.5 hidden sm:block`}>
                        {meta.label} - منصة جمعية المساجد
                      </p>
                    </div>
                  </div>
                </div>

                {/* 2. كرت الحقول الديناميكية الفعلي */}
                <div className={`text-card-foreground flex flex-col ${previewDevice === "mobile" ? "gap-3.5 p-3.5 rounded-2xl shadow-md" : "gap-6 p-5 sm:p-8 lg:p-10 rounded-3xl shadow-xl"} border border-border/60 bg-background overflow-hidden`}>
                  <div className="border-b border-border/60 pb-3">
                    <h3 className={`font-black ${previewDevice === "mobile" ? "text-xs" : "text-base sm:text-lg"} text-foreground`}>
                      {meta.stepTitle}
                    </h3>
                    <p className={`${previewDevice === "mobile" ? "text-[9.5px]" : "text-xs"} text-muted-foreground mt-0.5`}>
                      يرجى إدخال البيانات الموضحة أدناه لمتابعة طلبكم
                    </p>
                  </div>

                  <div className={previewDevice === "mobile" ? "space-y-3.5" : "space-y-6 sm:space-y-8"}>
                    <div className={`grid ${previewDevice === "mobile" ? "grid-cols-1 gap-3.5" : "grid-cols-1 sm:grid-cols-2 gap-5 sm:gap-6"}`}>
                      {fields
                        .filter((f) => f.isActive)
                        .map((field) => {
                          const isFullWidth =
                            field.type === "textarea" ||
                            field.type === "radio" ||
                            field.type === "file" ||
                            field.id === "landDetails" ||
                            field.id === "inKindDetails" ||
                            field.id === "donorOtherDetails" ||
                            field.id === "requestDetails";

                          const Icon = getFieldIcon(field.id);
                          const unitSuffix = getUnitSuffix(field.id);
                          const value = previewValues[field.id];

                          return (
                            <Fragment key={field.id}>
                              <div
                                className={previewDevice === "mobile" ? "col-span-1 w-full" : (isFullWidth ? "col-span-1 sm:col-span-2" : "col-span-1")}
                              >
                                <div className="space-y-1.5 sm:space-y-2">
                                  <Label className={`select-none flex items-center gap-1.5 ${previewDevice === "mobile" ? "text-[11px]" : "text-xs sm:text-sm"} font-bold text-foreground`}>
                                    {Icon && <Icon className={`${previewDevice === "mobile" ? "w-3.5 h-3.5" : "w-4 h-4"} text-primary/75 shrink-0`} />}
                                    <span>{field.label}</span>
                                    {field.required && <span className="text-red-500 font-bold">*</span>}
                                  </Label>

                                  {field.type === "textarea" && (
                                    <div className="space-y-1">
                                      <Textarea
                                        value={value || ""}
                                        onChange={(e) =>
                                          setPreviewValues((prev) => ({ ...prev, [field.id]: e.target.value }))
                                        }
                                        placeholder={field.placeholder || "اكتب التفاصيل المطلوبة هنا..."}
                                        rows={previewDevice === "mobile" ? 3 : 4}
                                        className={`placeholder:text-muted-foreground ${previewDevice === "mobile" ? "min-h-[85px] text-xs p-2.5 rounded-xl" : "min-h-[110px] rounded-xl text-xs sm:text-sm p-3.5"} bg-background border-border/80 hover:border-border focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20 transition-all leading-relaxed`}
                                      />
                                      {field.helpText && (
                                        <p className={`${previewDevice === "mobile" ? "text-[10px]" : "text-[11px] sm:text-xs"} text-muted-foreground leading-relaxed`}>
                                          {field.helpText}
                                        </p>
                                      )}
                                    </div>
                                  )}

                                  {["text", "email", "phone", "number"].includes(field.type) && (
                                    <div className="relative flex items-center">
                                      <Input
                                        type={field.type === "number" ? "number" : field.type === "email" ? "email" : field.type === "phone" ? "tel" : "text"}
                                        value={value || ""}
                                        onChange={(e) =>
                                          setPreviewValues((prev) => ({ ...prev, [field.id]: e.target.value }))
                                        }
                                        placeholder={field.placeholder || (field.type === "phone" ? "05xxxxxxxx" : field.type === "number" ? "0" : "")}
                                        className={`${previewDevice === "mobile" ? "h-9.5 text-xs px-2.5" : "h-11 text-xs sm:text-sm"} rounded-xl bg-background border-border/80 hover:border-border focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20 transition-all ${
                                          unitSuffix ? "pl-11" : ""
                                        }`}
                                      />
                                      {unitSuffix && (
                                        <span className={`absolute left-2.5 ${previewDevice === "mobile" ? "text-[10px] px-1.5 py-0.5" : "text-xs px-2 py-0.5"} font-semibold text-muted-foreground bg-muted/60 rounded-md select-none pointer-events-none`}>
                                          {unitSuffix}
                                        </span>
                                      )}
                                    </div>
                                  )}

                                  {field.type === "date" && (
                                    <Input
                                      type="date"
                                      value={value || ""}
                                      onChange={(e) =>
                                        setPreviewValues((prev) => ({ ...prev, [field.id]: e.target.value }))
                                      }
                                      className={`${previewDevice === "mobile" ? "h-9.5 text-xs" : "h-11 text-xs sm:text-sm"} rounded-xl bg-background border-border/80`}
                                    />
                                  )}

                                  {field.type === "select" && (
                                    <Select
                                      value={value || ""}
                                      onValueChange={(val) =>
                                        setPreviewValues((prev) => ({ ...prev, [field.id]: val }))
                                      }
                                    >
                                      <SelectTrigger className={`w-full ${previewDevice === "mobile" ? "h-9.5 text-xs" : "h-11 text-xs sm:text-sm"} rounded-xl bg-background border-border/80 hover:border-border focus-visible:border-primary`}>
                                        <SelectValue placeholder={field.placeholder || "اختر من القائمة..."} />
                                      </SelectTrigger>
                                      <SelectContent className="rounded-xl border-border shadow-lg" dir="rtl">
                                        {field.options && field.options.length > 0 ? (
                                          field.options.map((opt) => (
                                            <SelectItem key={opt.value} value={opt.value} className={`${previewDevice === "mobile" ? "text-xs" : "text-xs sm:text-sm"} font-medium`}>
                                              {opt.label}
                                            </SelectItem>
                                          ))
                                        ) : (
                                          <SelectItem value="default_opt" className="text-xs">
                                            خيار تجريبي
                                          </SelectItem>
                                        )}
                                      </SelectContent>
                                    </Select>
                                  )}

                                  {field.type === "radio" && (
                                    <div className="space-y-2.5">
                                      <RadioGroup
                                        value={value || ""}
                                        onValueChange={(val) =>
                                          setPreviewValues((prev) => ({ ...prev, [field.id]: val }))
                                        }
                                        className={`grid ${
                                          field.options && field.options.length > 2
                                            ? (previewDevice === "mobile" ? "grid-cols-1" : "grid-cols-1 sm:grid-cols-3")
                                            : "grid-cols-2"
                                        } gap-2.5 sm:gap-3`}
                                        dir="rtl"
                                      >
                                        {(field.options && field.options.length > 0
                                          ? field.options
                                          : [
                                              { label: "نعم", value: "yes" },
                                              { label: "لا", value: "no" },
                                            ]
                                        ).map((option) => {
                                          const isSelected = value === option.value;
                                          const isYes = option.value === "yes";
                                          const isNo = option.value === "no";

                                          return (
                                            <label
                                              key={option.value}
                                              htmlFor={`preview-${field.id}-${option.value}`}
                                              className={`relative flex items-center justify-between ${previewDevice === "mobile" ? "p-2.5 rounded-xl" : "p-3 sm:p-4 rounded-xl sm:rounded-2xl"} border-2 cursor-pointer transition-all duration-200 select-none ${
                                                isSelected
                                                  ? isYes
                                                    ? "border-emerald-600 bg-emerald-50/70 dark:bg-emerald-950/30 text-emerald-900 dark:text-emerald-200 shadow-xs ring-2 ring-emerald-500/20"
                                                    : isNo
                                                    ? "border-rose-500 bg-rose-50/70 dark:bg-rose-950/30 text-rose-900 dark:text-rose-200 shadow-xs ring-2 ring-rose-500/20"
                                                    : "border-primary bg-primary/10 text-primary shadow-xs ring-2 ring-primary/20"
                                                  : "border-border/60 bg-background hover:bg-muted/40 hover:border-border text-foreground"
                                              }`}
                                            >
                                              <div className="flex items-center gap-2 sm:gap-3">
                                                <RadioGroupItem
                                                  value={option.value}
                                                  id={`preview-${field.id}-${option.value}`}
                                                  className="border-muted-foreground/40 text-primary"
                                                />
                                                <span className={`font-bold ${previewDevice === "mobile" ? "text-xs" : "text-xs sm:text-sm"}`}>
                                                  {option.label}
                                                </span>
                                              </div>
                                              {isSelected && (
                                                <div
                                                  className={`w-4.5 h-4.5 rounded-full flex items-center justify-center text-white text-[10px] ${
                                                    isYes ? "bg-emerald-600" : isNo ? "bg-rose-600" : "bg-primary"
                                                  }`}
                                                >
                                                  <Check className="w-3 h-3 stroke-[3]" />
                                                </div>
                                              )}
                                            </label>
                                          );
                                        })}
                                      </RadioGroup>
                                    </div>
                                  )}

                                  {field.type === "checkbox" && (
                                    <div
                                      onClick={() =>
                                        setPreviewValues((prev) => ({ ...prev, [field.id]: !value }))
                                      }
                                      className={`flex items-center gap-2.5 ${previewDevice === "mobile" ? "p-2.5 rounded-xl text-xs" : "p-3.5 rounded-2xl text-xs sm:text-sm"} border cursor-pointer select-none transition-all ${
                                        value
                                          ? "border-primary bg-primary/5 text-primary font-bold shadow-2xs ring-2 ring-primary/20"
                                          : "border-border/80 bg-background text-foreground"
                                      }`}
                                    >
                                      <Checkbox checked={!!value} className="h-4 w-4 rounded-md" />
                                      <span>{field.placeholder || field.label}</span>
                                    </div>
                                  )}

                                  {field.type === "file" && (
                                    <div className={`${previewDevice === "mobile" ? "p-4 rounded-xl" : "p-6 sm:p-8 rounded-2xl"} border-2 border-dashed border-border/80 hover:border-primary hover:bg-primary/5 transition-all cursor-pointer text-center group`}>
                                      <div className={`${previewDevice === "mobile" ? "w-8 h-8 mb-2" : "w-12 h-12 mb-3"} rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto group-hover:scale-110 transition-transform`}>
                                        <CloudUpload className={`${previewDevice === "mobile" ? "w-4 h-4" : "w-6 h-6"}`} />
                                      </div>
                                      <p className={`font-bold ${previewDevice === "mobile" ? "text-[11px]" : "text-xs sm:text-sm"} text-foreground`}>
                                        {field.placeholder || "اضغط لرفع ملف أو اسحبه إلى هنا"}
                                      </p>
                                      <p className={`${previewDevice === "mobile" ? "text-[9.5px]" : "text-[11px]"} text-muted-foreground mt-1`}>
                                        {field.helpText || "يدعم ملفات PDF، الصور، ومستندات Word (الحد الأقصى 10 ميجابايت)"}
                                      </p>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </Fragment>
                          );
                        })}
                    </div>
                  </div>

                  {/* أزرار الإرسال في المعاينة */}
                  <div className={`flex flex-row items-center justify-between ${previewDevice === "mobile" ? "gap-2 mt-3.5 pt-3" : "gap-3 mt-8 pt-6"} border-t border-border/60`}>
                    <Button
                      type="button"
                      variant="outline"
                      className={`${previewDevice === "mobile" ? "rounded-xl h-9 px-3.5 text-[11px]" : "rounded-2xl h-11 sm:h-12 px-4 sm:px-6 text-xs sm:text-sm"} font-bold gap-1.5 shadow-xs hover:bg-muted`}
                    >
                      <ChevronRight className="w-3.5 h-3.5" />
                      <span>رجوع</span>
                    </Button>
                    <Button
                      type="button"
                      className={`${previewDevice === "mobile" ? "rounded-xl h-9 px-4.5 text-[11px]" : "rounded-2xl h-11 sm:h-12 px-6 sm:px-8 text-xs sm:text-sm"} font-bold gap-1.5 gradient-primary bg-emerald-600 hover:bg-emerald-700 text-white shadow-md transition-all`}
                    >
                      <span>إرسال الطلب</span>
                      <Check className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>

              </div>

              {/* شريط السحب السفلي لهواتف iPhone */}
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
              <span>معاينة حية ومباشرة • أي تعديل على الحقول ينعكس هنا فوراً</span>
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

      {/* نافذة تأكيد استعادة الافتراضي */}
      <Dialog open={isResetConfirmOpen} onOpenChange={setIsResetConfirmOpen}>
        <DialogContent className="max-w-sm text-right rounded-2xl" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold text-center">
              استعادة الحقول الافتراضية للاستمارة؟
            </DialogTitle>
          </DialogHeader>
          <p className="text-xs text-muted-foreground text-center">
            سيتم استعادة الحقول القياسية لهذا النموذج وحذف أي تعديلات مخصصة.
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
              onClick={() => resetMutation.mutate({ formId })}
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
