import React, { useState, useEffect, useMemo } from "react";
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
  GripVertical,
  Monitor,
  Smartphone,
  Check,
  ChevronLeft,
  ChevronUp,
  ChevronDown,
  Sparkles,
  SlidersHorizontal,
  LandPlot,
  Package,
  CreditCard,
  HelpCircle,
  ExternalLink,
  Layers,
  Search,
  Copy,
  FolderPlus,
  Settings2,
  Ruler,
  Users,
  MapPin,
  Coins,
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
    name: "نوع التبرع العيني",
    options: [
      { label: "مواد بناء وتشطيب", value: "building_materials" },
      { label: "مكيفات وأجهزة تبريد", value: "ac_units" },
      { label: "فرش وسجاد مساجد", value: "carpet" },
      { label: "أنظمة صوتيات", value: "sound_systems" },
      { label: "أجهزة ومعدات مياه", value: "water_equipment" },
      { label: "أخرى", value: "other" },
    ],
  },
];

const FORM_META_MAP: Record<string, { icon: any; color: string; label: string; track: string }> = {
  donor_land: { icon: LandPlot, color: "bg-emerald-600", label: "مسار المتبرع بأرض", track: "land" },
  donor_inkind: { icon: Package, color: "bg-teal-600", label: "مسار المتبرع بتبرع عيني", track: "in_kind" },
  donor_financial: { icon: CreditCard, color: "bg-amber-600", label: "مسار المتبرع بتبرع مالي", track: "financial" },
  donor_other: { icon: Sparkles, color: "bg-blue-600", label: "مسار متبرع (شراكة / وقفية / أخرى)", track: "other" },
  other: { icon: HelpCircle, color: "bg-sky-600", label: "مسار أخرى (استفسارات وطلبات عامة)", track: "other" },
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
    track: "general",
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
              <div className="flex items-center gap-1.5 text-muted-foreground/80">
                <span className="w-2 h-2 rounded-full bg-muted-foreground/40" />
                <span>معطلة: <strong className="text-foreground">{inactiveFieldsCount}</strong></span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" className="h-9 rounded-xl text-xs font-bold gap-1.5 bg-primary text-primary-foreground shadow-xs">
                  <Plus className="w-4 h-4" />
                  <span>إضافة حقل جديد</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64 p-2 rounded-2xl" dir="rtl">
                <DropdownMenuLabel className="text-xs font-bold text-muted-foreground px-2 py-1.5">
                  اختر نوع الحقل المطلوب:
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                
                <div className="text-[10px] font-bold text-muted-foreground/70 px-2 py-1">نصوص وإدخالات</div>
                <DropdownMenuItem onClick={() => handleAddField("text", "حقل نص قصير")} className="rounded-xl text-xs gap-2 py-2 cursor-pointer">
                  <FileText className="w-4 h-4 text-blue-500" />
                  <div>
                    <span className="font-bold block">نص قصير</span>
                    <span className="text-[10px] text-muted-foreground">اسم، عنوان، قيمة محددة</span>
                  </div>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleAddField("textarea", "حقل وصف وتفاصيل")} className="rounded-xl text-xs gap-2 py-2 cursor-pointer">
                  <AlignLeft className="w-4 h-4 text-blue-500" />
                  <div>
                    <span className="font-bold block">نص طويل / وصف</span>
                    <span className="text-[10px] text-muted-foreground">تفاصيل، شرح، ملاحظات</span>
                  </div>
                </DropdownMenuItem>

                <DropdownMenuSeparator />
                <div className="text-[10px] font-bold text-muted-foreground/70 px-2 py-1">خيارات وقوائم</div>
                <DropdownMenuItem onClick={() => handleAddField("select", "حقل قائمة منسدلة")} className="rounded-xl text-xs gap-2 py-2 cursor-pointer">
                  <List className="w-4 h-4 text-purple-500" />
                  <div>
                    <span className="font-bold block">قائمة منسدلة (Dropdown)</span>
                    <span className="text-[10px] text-muted-foreground">اختيار واحد من قائمة منسدلة</span>
                  </div>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleAddField("radio", "حقل خيارات متعددة")} className="rounded-xl text-xs gap-2 py-2 cursor-pointer">
                  <Radio className="w-4 h-4 text-purple-500" />
                  <div>
                    <span className="font-bold block">خيارات متعددة (Radio)</span>
                    <span className="text-[10px] text-muted-foreground">نعم/لا أو خيارات مباشرة</span>
                  </div>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleAddField("checkbox", "حقل إقرار / موافقة")} className="rounded-xl text-xs gap-2 py-2 cursor-pointer">
                  <CheckSquare className="w-4 h-4 text-teal-500" />
                  <div>
                    <span className="font-bold block">مربع اختيار (Checkbox)</span>
                    <span className="text-[10px] text-muted-foreground">إقرار، موافقة، شرط</span>
                  </div>
                </DropdownMenuItem>

                <DropdownMenuSeparator />
                <div className="text-[10px] font-bold text-muted-foreground/70 px-2 py-1">أرقام وتواريخ ومرفقات</div>
                <DropdownMenuItem onClick={() => handleAddField("number", "حقل رقمي")} className="rounded-xl text-xs gap-2 py-2 cursor-pointer">
                  <Hash className="w-4 h-4 text-emerald-500" />
                  <div>
                    <span className="font-bold block">رقمي (Number)</span>
                    <span className="text-[10px] text-muted-foreground">مساحة، أعداد، مبالغ</span>
                  </div>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleAddField("date", "حقل تاريخ")} className="rounded-xl text-xs gap-2 py-2 cursor-pointer">
                  <Calendar className="w-4 h-4 text-amber-500" />
                  <div>
                    <span className="font-bold block">تاريخ (Date)</span>
                    <span className="text-[10px] text-muted-foreground">تاريخ من التقويم</span>
                  </div>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleAddField("file", "حقل مرفقات")} className="rounded-xl text-xs gap-2 py-2 cursor-pointer">
                  <Paperclip className="w-4 h-4 text-rose-500" />
                  <div>
                    <span className="font-bold block">مرفق / مستند (File)</span>
                    <span className="text-[10px] text-muted-foreground">رفع وثائق وصور وPDF</span>
                  </div>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* شريط البحث والتصفية */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-muted-foreground absolute right-3.5 top-1/2 -translate-y-1/2" />
            <Input
              type="text"
              placeholder="ابحث عن حقل بالاسم أو النص التوضيحي..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-10 pr-10 text-xs rounded-2xl bg-card border-border/80 focus:border-primary/50"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
            <button
              type="button"
              onClick={() => setActiveFilter("all")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                activeFilter === "all"
                  ? "bg-primary text-primary-foreground shadow-2xs"
                  : "bg-card text-muted-foreground border border-border/80 hover:bg-muted"
              }`}
            >
              الكل ({fields.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveFilter("active")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                activeFilter === "active"
                  ? "bg-emerald-600 text-white shadow-2xs"
                  : "bg-card text-muted-foreground border border-border/80 hover:bg-muted"
              }`}
            >
              نشطة ({activeFieldsCount})
            </button>
            <button
              type="button"
              onClick={() => setActiveFilter("required")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                activeFilter === "required"
                  ? "bg-red-600 text-white shadow-2xs"
                  : "bg-card text-muted-foreground border border-border/80 hover:bg-muted"
              }`}
            >
              إلزامية ({requiredFieldsCount})
            </button>
            <button
              type="button"
              onClick={() => setActiveFilter("options")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                activeFilter === "options"
                  ? "bg-purple-600 text-white shadow-2xs"
                  : "bg-card text-muted-foreground border border-border/80 hover:bg-muted"
              }`}
            >
              قوائم ({optionsFieldsCount})
            </button>

            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleToggleExpandAll}
              className="text-xs h-8 px-2.5 rounded-xl text-muted-foreground hover:text-foreground shrink-0 mr-1"
            >
              {fields.every((f) => expandedFields[f.id]) ? "طي الكل" : "توسيع الكل"}
            </Button>
          </div>
        </div>

        {/* قائمة الحقول */}
        {filteredFields.length === 0 ? (
          <div className="p-12 text-center rounded-3xl border border-dashed border-border bg-card/50 space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-muted text-muted-foreground flex items-center justify-center mx-auto">
              <Search className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-foreground text-sm">لا توجد حقول مطابقة</h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              لم نتمكن من العثور على حقول تطابق البحث أو التصفية الحالية.
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSearchQuery("");
                setActiveFilter("all");
              }}
              className="text-xs rounded-xl"
            >
              إعادة تعيين الفلاتر
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredFields.map((field) => {
              const originalIndex = fields.findIndex((f) => f.id === field.id);
              const isExpanded = expandedFields[field.id];
              const FieldIcon = getFieldIcon(field.id) || FileText;
              const unitSuffix = getUnitSuffix(field.id);

              return (
                <div
                  key={field.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, originalIndex)}
                  onDragOver={(e) => handleDragOver(e, originalIndex)}
                  onDragEnd={handleDragEnd}
                  className={`rounded-2xl border transition-all duration-200 bg-card overflow-hidden ${
                    draggedIndex === originalIndex
                      ? "opacity-40 border-primary scale-[0.99]"
                      : "border-border/80 hover:border-border shadow-2xs hover:shadow-sm"
                  } ${!field.isActive ? "opacity-60 bg-muted/20" : ""}`}
                >
                  {/* شريط رأس الحقل المضغوط */}
                  <div className="p-3.5 sm:p-4 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      {/* مقبض السحب */}
                      <div
                        className="cursor-grab active:cursor-grabbing p-1 text-muted-foreground/50 hover:text-foreground shrink-0 rounded-lg hover:bg-muted transition-colors"
                        title="اسحب لإعادة الترتيب"
                      >
                        <GripVertical className="w-4 h-4" />
                      </div>

                      {/* رقم الترتيب */}
                      <div className="w-7 h-7 rounded-xl bg-muted text-muted-foreground font-mono font-bold text-xs flex items-center justify-center shrink-0 border border-border/60">
                        {originalIndex + 1}
                      </div>

                      {/* أيقونة الحقل المخصصة */}
                      <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                        <FieldIcon className="w-4 h-4" />
                      </div>

                      {/* تفاصيل الحقل ونوعه */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-xs sm:text-sm text-foreground truncate">
                            {field.label}
                          </span>
                          {unitSuffix && (
                            <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.2 rounded font-mono">
                              ({unitSuffix})
                            </span>
                          )}
                          {field.required && (
                            <Badge variant="outline" className="text-[10px] font-bold text-red-600 dark:text-red-400 border-red-200 bg-red-50 dark:bg-red-950/30 px-1.5 py-0">
                              إلزامي
                            </Badge>
                          )}
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border ${getFieldTypeBadge(field.type)}`}>
                            {FIELD_TYPES.find((t) => t.type === field.type)?.label || field.type}
                          </span>
                        </div>
                        {field.helpText && (
                          <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                            {field.helpText}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* إجراءات سريعة ومفتاح التفعيل */}
                    <div className="flex items-center gap-2 shrink-0">
                      <div className="flex items-center gap-1 pl-2 border-l border-border/60">
                        <button
                          type="button"
                          onClick={() => handleMoveField(originalIndex, "up")}
                          disabled={originalIndex === 0}
                          className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground disabled:opacity-30 disabled:hover:bg-transparent transition-colors cursor-pointer"
                          title="تحريك للأعلى"
                        >
                          <ChevronUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleMoveField(originalIndex, "down")}
                          disabled={originalIndex === fields.length - 1}
                          className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground disabled:opacity-30 disabled:hover:bg-transparent transition-colors cursor-pointer"
                          title="تحريك للأسفل"
                        >
                          <ChevronDown className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* مفتاح التفعيل / التعطيل */}
                      <div className="flex items-center gap-1.5 px-2">
                        <Switch
                          checked={field.isActive}
                          onCheckedChange={(checked) => handleUpdateField(field.id, { isActive: checked })}
                          className="scale-90"
                        />
                        <span className="text-[11px] font-medium text-muted-foreground hidden sm:inline">
                          {field.isActive ? "مفعّل" : "معطّل"}
                        </span>
                      </div>

                      {/* زر فتح/إغلاق تفاصيل التعديل */}
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => toggleFieldExpand(field.id)}
                        className="h-8 w-8 rounded-xl hover:bg-muted"
                        title={isExpanded ? "طي التفاصيل" : "تعديل خصائص الحقل"}
                      >
                        <Settings2 className="w-4 h-4 text-muted-foreground" />
                      </Button>
                    </div>
                  </div>

                  {/* لوحة تعديل خصائص الحقل (الأكورديون القابل للتوسيع) */}
                  {isExpanded && (
                    <div className="p-4 sm:p-5 bg-muted/30 border-t border-border/80 space-y-4 text-xs animate-in slide-in-from-top-2 duration-200">
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
                        {/* تسمية الحقل */}
                        <div className="space-y-1 sm:col-span-2">
                          <Label className="text-[11px] font-bold text-foreground">
                            عنوان الحقل (Label) <span className="text-red-500">*</span>
                          </Label>
                          <Input
                            value={field.label}
                            onChange={(e) => handleUpdateField(field.id, { label: e.target.value })}
                            className="h-9 text-xs rounded-xl bg-card"
                            placeholder="اكتب التسمية التي تظهر للمستفيد..."
                          />
                        </div>

                        {/* نوع الحقل */}
                        <div className="space-y-1">
                          <Label className="text-[11px] font-bold text-foreground">نوع الحقل</Label>
                          <Select
                            value={field.type}
                            onValueChange={(val: ServiceFieldType) => handleUpdateField(field.id, { type: val })}
                          >
                            <SelectTrigger className="h-9 text-xs rounded-xl bg-card">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl" dir="rtl">
                              {FIELD_TYPES.map((t) => (
                                <SelectItem key={t.type} value={t.type} className="text-xs">
                                  {t.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        {/* النص التوضيحي داخل الحقل */}
                        <div className="space-y-1">
                          <Label className="text-[11px] font-bold text-foreground">نص توضيحي داخل الحقل (Placeholder)</Label>
                          <Input
                            value={field.placeholder || ""}
                            onChange={(e) => handleUpdateField(field.id, { placeholder: e.target.value })}
                            className="h-9 text-xs rounded-xl bg-card"
                            placeholder="مثال: أدخل القيمة هنا..."
                          />
                        </div>

                        {/* النص الإرشادي التوضيحي أسفل الحقل */}
                        <div className="space-y-1 sm:col-span-2">
                          <Label className="text-[11px] font-bold text-foreground">شرح إرشادي أسفل الحقل (Help Text)</Label>
                          <Input
                            value={field.helpText || ""}
                            onChange={(e) => handleUpdateField(field.id, { helpText: e.target.value })}
                            className="h-9 text-xs rounded-xl bg-card"
                            placeholder="نص مساعد أو تنبيه يظهر تحت الحقل..."
                          />
                        </div>
                      </div>

                      {/* خيارات القوائم المنسدلة والراديو */}
                      {(field.type === "select" || field.type === "radio") && (
                        <div className="p-3.5 rounded-2xl bg-card border border-border/80 space-y-3">
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                              <List className="w-3.5 h-3.5 text-purple-500" />
                              <span>خيارات القائمة ({field.options?.length || 0})</span>
                            </Label>

                            {/* قوالب خيارات جاهزة وسريعة */}
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-[10px] text-muted-foreground font-bold">قوالب جاهزة:</span>
                              {PRESET_OPTIONS.map((preset) => (
                                <button
                                  key={preset.name}
                                  type="button"
                                  onClick={() => handleApplyPreset(field.id, preset.options)}
                                  className="text-[10px] font-semibold px-2 py-0.5 rounded-lg bg-muted hover:bg-muted/80 text-foreground border border-border/60 transition-colors"
                                >
                                  + {preset.name}
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* قائمة الخيارات المضافة */}
                          <div className="space-y-1.5">
                            {field.options?.map((opt, optIdx) => (
                              <div key={optIdx} className="flex items-center gap-2">
                                <span className="text-[10px] font-mono text-muted-foreground w-4 text-center">
                                  {optIdx + 1}
                                </span>
                                <Input
                                  value={opt.label}
                                  onChange={(e) => {
                                    const updated = [...(field.options || [])];
                                    updated[optIdx] = { label: e.target.value, value: e.target.value };
                                    handleUpdateField(field.id, { options: updated });
                                  }}
                                  className="h-8 text-xs rounded-lg bg-muted/20"
                                  placeholder="نص الخيار..."
                                />
                                <button
                                  type="button"
                                  onClick={() => handleRemoveOption(field.id, optIdx)}
                                  className="p-1.5 rounded-lg text-muted-foreground hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                                  title="حذف الخيار"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ))}
                          </div>

                          {/* إضافة خيار جديد */}
                          <div className="flex items-center gap-2 pt-1">
                            <Input
                              value={newOptionInputs[field.id] || ""}
                              onChange={(e) => setNewOptionInputs((prev) => ({ ...prev, [field.id]: e.target.value }))}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  e.preventDefault();
                                  handleAddOption(field.id);
                                }
                              }}
                              className="h-8 text-xs rounded-lg bg-muted/40"
                              placeholder="اكتب خياراً جديداً واضغط إضافة..."
                            />
                            <Button
                              type="button"
                              size="sm"
                              variant="secondary"
                              onClick={() => handleAddOption(field.id)}
                              className="h-8 text-xs px-3 rounded-lg font-bold shrink-0"
                            >
                              <Plus className="w-3 h-3 mr-1" />
                              إضافة خيار
                            </Button>
                          </div>
                        </div>
                      )}

                      {/* شريط الإعدادات السفلية للحقل */}
                      <div className="flex items-center justify-between gap-3 pt-2 border-t border-border/60 flex-wrap">
                        <div className="flex items-center gap-4">
                          <label className="flex items-center gap-2 cursor-pointer select-none text-xs font-semibold">
                            <Checkbox
                              checked={field.required}
                              onCheckedChange={(checked) => handleUpdateField(field.id, { required: !!checked })}
                            />
                            <span>حقل إلزامي (مطلوب من المستخدم)</span>
                          </label>
                        </div>

                        <div className="flex items-center gap-2">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDuplicateField(field.id)}
                            className="h-8 px-2.5 text-xs text-muted-foreground hover:text-foreground rounded-lg"
                          >
                            <Copy className="w-3.5 h-3.5 mr-1" />
                            نسخ الحقل
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteField(field.id)}
                            className="h-8 px-2.5 text-xs text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg"
                          >
                            <Trash2 className="w-3.5 h-3.5 mr-1" />
                            حذف
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* زر الحفظ العائم في أسفل الصفحة عند وجود تغييرات */}
        {hasChanges && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-card/95 backdrop-blur-md border border-border p-3 px-6 rounded-3xl shadow-2xl flex items-center gap-4 animate-in slide-in-from-bottom-5 duration-300 max-w-lg w-[90%] justify-between">
            <div className="flex items-center gap-2 text-xs font-bold text-amber-600">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
              <span>توجد تغييرات غير محفوظة</span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  if (serverConfig?.fields) {
                    setFields([...serverConfig.fields]);
                    setHasChanges(false);
                    toast.info("تم التراجع عن التعديلات غير المحفوظة");
                  }
                }}
                className="h-9 px-3 text-xs rounded-xl text-muted-foreground hover:text-foreground"
              >
                تراجع
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={handleSave}
                disabled={saveMutation.isPending}
                className="h-9 px-4 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-md gap-1.5"
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

        {/* حوار المعاينة الحية والتفاعلية */}
        <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto rounded-3xl p-0" dir="rtl">
            {/* ترويسة نافذة المعاينة */}
            <div className="p-5 sm:p-6 border-b border-border/80 flex items-center justify-between gap-4 sticky top-0 bg-card z-10">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center text-white ${meta.color}`}>
                  <IconComponent className="w-5 h-5" />
                </div>
                <div>
                  <DialogTitle className="text-base font-bold text-foreground flex items-center gap-2">
                    <span>معاينة استمارة: {meta.label}</span>
                  </DialogTitle>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    هذه المحاكاة توضح كيفية ظهور الحقول للمستخدم في صفحة التسجيل
                  </p>
                </div>
              </div>

              {/* محول الجهاز (Desktop / Mobile) */}
              <div className="flex items-center gap-1 p-1 bg-muted rounded-2xl border border-border/60">
                <button
                  type="button"
                  onClick={() => setPreviewDevice("desktop")}
                  className={`px-3 py-1 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                    previewDevice === "desktop"
                      ? "bg-card text-foreground shadow-2xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Monitor className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">سطح المكتب</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewDevice("mobile")}
                  className={`px-3 py-1 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                    previewDevice === "mobile"
                      ? "bg-card text-foreground shadow-2xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Smartphone className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">الجوال</span>
                </button>
              </div>
            </div>

            {/* جسم الاستمارة في نافذة المعاينة */}
            <div className={`p-6 sm:p-8 mx-auto transition-all ${previewDevice === "mobile" ? "max-w-sm" : "w-full"}`}>
              <div className="p-6 rounded-3xl border border-border bg-card shadow-sm space-y-5 text-right">
                <div className="border-b border-border pb-4">
                  <span className="text-[11px] font-bold text-primary uppercase tracking-wider block mb-1">
                    نموذج التقديم
                  </span>
                  <h3 className="font-black text-lg text-foreground">{meta.label}</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">يرجى تعبئة الحقول المطلوبة</p>
                </div>

                <div className="space-y-4">
                  {fields
                    .filter((f) => f.isActive)
                    .map((field) => (
                      <div key={field.id} className="space-y-1.5 text-xs">
                        <Label className="text-xs font-bold text-foreground flex items-center gap-1">
                          <span>{field.label}</span>
                          {field.required && <span className="text-red-500">*</span>}
                        </Label>

                        {field.type === "textarea" ? (
                          <Textarea
                            rows={3}
                            placeholder={field.placeholder || ""}
                            value={previewValues[field.id] || ""}
                            onChange={(e) => setPreviewValues((prev) => ({ ...prev, [field.id]: e.target.value }))}
                            className="rounded-2xl text-xs bg-muted/20"
                          />
                        ) : field.type === "select" ? (
                          <Select
                            value={previewValues[field.id] || ""}
                            onValueChange={(val) => setPreviewValues((prev) => ({ ...prev, [field.id]: val }))}
                          >
                            <SelectTrigger className="h-10 rounded-2xl text-xs bg-muted/20">
                              <SelectValue placeholder={field.placeholder || "اختر من القائمة..."} />
                            </SelectTrigger>
                            <SelectContent className="rounded-2xl" dir="rtl">
                              {field.options?.map((opt, idx) => (
                                <SelectItem key={idx} value={opt.value} className="text-xs">
                                  {opt.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : field.type === "radio" ? (
                          <RadioGroup
                            value={previewValues[field.id] || ""}
                            onValueChange={(val) => setPreviewValues((prev) => ({ ...prev, [field.id]: val }))}
                            className="flex flex-wrap gap-3 pt-1"
                          >
                            {field.options?.map((opt, idx) => (
                              <div key={idx} className="flex items-center gap-2">
                                <RadioGroupItem value={opt.value} id={`prev_${field.id}_${idx}`} />
                                <Label htmlFor={`prev_${field.id}_${idx}`} className="text-xs cursor-pointer">
                                  {opt.label}
                                </Label>
                              </div>
                            ))}
                          </RadioGroup>
                        ) : field.type === "checkbox" ? (
                          <div className="flex items-center gap-2 pt-1">
                            <Checkbox
                              id={`prev_${field.id}`}
                              checked={!!previewValues[field.id]}
                              onCheckedChange={(checked) => setPreviewValues((prev) => ({ ...prev, [field.id]: checked }))}
                            />
                            <Label htmlFor={`prev_${field.id}`} className="text-xs cursor-pointer font-semibold">
                              {field.label}
                            </Label>
                          </div>
                        ) : field.type === "file" ? (
                          <div className="border-2 border-dashed border-border rounded-2xl p-5 text-center text-xs text-muted-foreground bg-muted/10 hover:border-primary transition-colors cursor-pointer">
                            <Paperclip className="w-6 h-6 mx-auto mb-1.5 text-muted-foreground/60" />
                            <p className="font-bold text-foreground">{field.placeholder || "اضغط لرفع ملف أو مستند"}</p>
                            <p className="text-[10px] text-muted-foreground mt-0.5">PDF، صور، مستندات</p>
                          </div>
                        ) : (
                          <Input
                            type={field.type === "number" ? "number" : field.type === "email" ? "email" : field.type === "date" ? "date" : "text"}
                            placeholder={field.placeholder || ""}
                            value={previewValues[field.id] || ""}
                            onChange={(e) => setPreviewValues((prev) => ({ ...prev, [field.id]: e.target.value }))}
                            className="h-10 rounded-2xl text-xs bg-muted/20"
                          />
                        )}

                        {field.helpText && (
                          <p className="text-[11px] text-muted-foreground">{field.helpText}</p>
                        )}
                      </div>
                    ))}
                </div>

                <Button className="w-full h-11 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-md">
                  إرسال الطلب
                </Button>
              </div>
            </div>

            <DialogFooter className="p-4 border-t border-border/80 bg-muted/30">
              <Button variant="outline" onClick={() => setIsPreviewOpen(false)} className="rounded-xl text-xs font-bold">
                إغلاق المعاينة
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* حوار تأكيد الاستعادة للافتراضي */}
        <Dialog open={isResetConfirmOpen} onOpenChange={setIsResetConfirmOpen}>
          <DialogContent className="max-w-md rounded-3xl p-6" dir="rtl">
            <DialogHeader className="space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-red-500/10 text-red-600 flex items-center justify-center mx-auto">
                <AlertCircle className="w-6 h-6" />
              </div>
              <DialogTitle className="text-base font-black text-center text-foreground">
                استعادة الحقول الافتراضية الأصلية
              </DialogTitle>
            </DialogHeader>
            <p className="text-xs text-muted-foreground text-center leading-relaxed">
              هل أنت متأكد من رغبتك في إلغاء كافة التخصيصات والعودة إلى الترتيب والحقول الافتراضية الأصلية لنظام المنصة؟
            </p>
            <DialogFooter className="gap-2 pt-4 border-t border-border/80 flex sm:justify-center">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsResetConfirmOpen(false)}
                className="rounded-xl text-xs font-bold"
              >
                إلغاء
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => resetMutation.mutate({ formId })}
                disabled={resetMutation.isPending}
                className="rounded-xl text-xs font-bold bg-red-600 hover:bg-red-700"
              >
                {resetMutation.isPending ? "جاري الاستعادة..." : "تأكيد الاستعادة"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
