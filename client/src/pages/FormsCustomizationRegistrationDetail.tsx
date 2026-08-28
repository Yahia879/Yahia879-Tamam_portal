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
  User,
  Info,
  Truck,
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

  const section1FieldIds = formId === "other" || formId === "donor_other"
    ? ["name", "phone", "email"]
    : ["name", "phone", "email", "customRoleTitle", "landCustomRole", "inKindCustomRole"];

  const activeSection1Fields = useMemo(
    () => fields.filter((f) => f.isActive && section1FieldIds.includes(f.id)),
    [fields, formId]
  );
  const activeSection2Fields = useMemo(
    () => fields.filter((f) => f.isActive && !section1FieldIds.includes(f.id)),
    [fields, formId]
  );

  const renderPreviewField = (field: ServiceField) => {
    const value = previewValues[field.id];
    const unitSuffix = getUnitSuffix(field.id);

    if (field.type === "textarea") {
      return (
        <div key={field.id} className="space-y-1.5 sm:col-span-2">
          <Label htmlFor={`prev-${field.id}`} className="text-xs sm:text-sm font-semibold text-slate-700 dark:text-foreground flex items-center gap-1">
            <span>{field.label}</span>
            {field.required && <span className="text-destructive">*</span>}
          </Label>
          {field.id === "requestDetails" && (
            <div className="p-3 sm:p-3.5 bg-slate-50 dark:bg-muted/40 border border-slate-200/90 dark:border-border rounded-xl text-right flex items-start gap-2.5 mb-2">
              <div className="w-6 h-6 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5">
                <Info className="w-3.5 h-3.5" />
              </div>
              <div className="space-y-0.5">
                <span className="text-[11px] font-bold text-slate-800 dark:text-foreground block">توضيح إرشادي:</span>
                <p className="text-xs text-slate-600 dark:text-muted-foreground leading-relaxed">
                  يرجى توضيح ما ترغبون من الجمعية، وذكر تفاصيل المسجد أو الموقع إن كان الطلب مرتبطاً بمسجد محدد.
                </p>
              </div>
            </div>
          )}
          <Textarea
            id={`prev-${field.id}`}
            rows={field.id === "donorOtherDetails" ? 5 : 3}
            placeholder={field.placeholder || "اكتب التفاصيل هنا..."}
            value={value || ""}
            onChange={(e) => setPreviewValues((prev) => ({ ...prev, [field.id]: e.target.value }))}
            className="rounded-xl border-slate-200 dark:border-border focus:border-primary focus:ring-primary/20 bg-slate-50/40 dark:bg-muted/30 focus:bg-white transition-all text-right leading-relaxed p-3.5 text-xs sm:text-sm"
          />
          {field.helpText && (
            <p className="text-[11px] text-slate-500 dark:text-muted-foreground">{field.helpText}</p>
          )}
        </div>
      );
    }

    if (field.type === "phone") {
      return (
        <div key={field.id} className="space-y-1.5">
          <Label htmlFor={`prev-${field.id}`} className="text-xs sm:text-sm font-semibold text-slate-700 dark:text-foreground flex items-center gap-1">
            <Phone className="w-3.5 h-3.5 text-slate-400" />
            <span>{field.label}</span>
            {field.required && <span className="text-destructive">*</span>}
          </Label>
          <Input
            id={`prev-${field.id}`}
            type="tel"
            dir="ltr"
            maxLength={10}
            placeholder={field.placeholder || "05XXXXXXXX"}
            value={value || ""}
            onChange={(e) => setPreviewValues((prev) => ({ ...prev, [field.id]: e.target.value }))}
            className="h-11 rounded-xl text-left border-slate-200 dark:border-border focus:border-primary focus:ring-primary/20 bg-slate-50/40 dark:bg-muted/30 focus:bg-white transition-all font-mono text-xs sm:text-sm"
          />
          <p className="text-[11px] text-slate-500 dark:text-muted-foreground">{field.helpText || "صيغة: 05XXXXXXXX (10 أرقام)"}</p>
        </div>
      );
    }

    if (field.type === "email") {
      return (
        <div key={field.id} className="space-y-1.5">
          <Label htmlFor={`prev-${field.id}`} className="text-xs sm:text-sm font-semibold text-slate-700 dark:text-foreground flex items-center gap-1">
            <Mail className="w-3.5 h-3.5 text-slate-400" />
            <span>{field.label}</span>
            {field.required && <span className="text-destructive">*</span>}
          </Label>
          <Input
            id={`prev-${field.id}`}
            type="email"
            dir="ltr"
            placeholder={field.placeholder || "name@example.com"}
            value={value || ""}
            onChange={(e) => setPreviewValues((prev) => ({ ...prev, [field.id]: e.target.value }))}
            className="h-11 rounded-xl text-left border-slate-200 dark:border-border focus:border-primary focus:ring-primary/20 bg-slate-50/40 dark:bg-muted/30 focus:bg-white transition-all font-mono text-xs sm:text-sm"
          />
          {field.helpText && (
            <p className="text-[11px] text-slate-500 dark:text-muted-foreground">{field.helpText}</p>
          )}
        </div>
      );
    }

    if (field.type === "select") {
      return (
        <div key={field.id} className="space-y-1.5">
          <Label htmlFor={`prev-${field.id}`} className="text-xs sm:text-sm font-semibold text-slate-700 dark:text-foreground flex items-center gap-1">
            <span>{field.label}</span>
            {field.required && <span className="text-destructive">*</span>}
          </Label>
          <Select
            value={value || ""}
            onValueChange={(val) => setPreviewValues((prev) => ({ ...prev, [field.id]: val }))}
          >
            <SelectTrigger className="h-11 rounded-xl text-right border-slate-200 dark:border-border focus:border-primary focus:ring-primary/20 bg-slate-50/40 dark:bg-muted/30 focus:bg-white transition-all">
              <SelectValue placeholder={field.placeholder || "اختر من القائمة..."} />
            </SelectTrigger>
            <SelectContent dir="rtl">
              {field.options?.map((opt: any, idx: number) => (
                <SelectItem key={idx} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {field.helpText && (
            <p className="text-[11px] text-slate-500 dark:text-muted-foreground">{field.helpText}</p>
          )}
        </div>
      );
    }

    if (field.type === "radio") {
      return (
        <div key={field.id} className="space-y-1.5 sm:col-span-2">
          <Label className="text-xs sm:text-sm font-semibold text-slate-700 dark:text-foreground flex items-center gap-1">
            <span>{field.label}</span>
            {field.required && <span className="text-destructive">*</span>}
          </Label>
          <RadioGroup
            value={value || ""}
            onValueChange={(val) => setPreviewValues((prev) => ({ ...prev, [field.id]: val }))}
            className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1"
            dir="rtl"
          >
            {field.options?.map((opt: any, idx: number) => (
              <div key={idx} className="flex items-center gap-2 p-3 rounded-xl border border-slate-200 dark:border-border bg-slate-50/40 dark:bg-muted/30">
                <RadioGroupItem value={opt.value} id={`prev-${field.id}_${idx}`} />
                <Label htmlFor={`prev-${field.id}_${idx}`} className="text-xs cursor-pointer">
                  {opt.label}
                </Label>
              </div>
            ))}
          </RadioGroup>
          {field.helpText && (
            <p className="text-[11px] text-slate-500 dark:text-muted-foreground">{field.helpText}</p>
          )}
        </div>
      );
    }

    if (field.type === "checkbox") {
      return (
        <div key={field.id} className="sm:col-span-2">
          <div
            onClick={() => setPreviewValues((prev) => ({ ...prev, [field.id]: !value }))}
            className={`p-3.5 sm:p-4 rounded-xl border-2 transition-all cursor-pointer select-none flex items-center justify-between gap-3 ${value
                ? "bg-primary/5 border-primary shadow-xs"
                : "bg-slate-50/60 dark:bg-muted/30 border-slate-200/90 dark:border-border/80 hover:border-slate-300 hover:bg-slate-100/50"
              }`}
          >
            <div className="flex items-center gap-3">
              {field.id === "inKindDeliveryAvailable" && (
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors ${value ? "bg-primary text-primary-foreground shadow-xs" : "bg-slate-200/80 dark:bg-muted text-slate-500"
                  }`}>
                  <Truck className="w-5 h-5" />
                </div>
              )}
              <div>
                <p className="text-xs sm:text-sm font-bold text-slate-900 dark:text-foreground leading-tight">
                  {field.label}
                </p>
                {field.helpText && (
                  <p className="text-[11px] text-slate-500 dark:text-muted-foreground mt-0.5">{field.helpText}</p>
                )}
              </div>
            </div>
            <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center shrink-0 transition-all ${value ? "bg-primary border-primary text-white shadow-xs" : "bg-white dark:bg-background border-slate-300 dark:border-border"
              }`}>
              {value && <Check className="w-4 h-4 stroke-[3]" />}
            </div>
          </div>
        </div>
      );
    }

    if (field.type === "file") {
      return (
        <div key={field.id} className="space-y-1.5 sm:col-span-2">
          <Label className="text-xs sm:text-sm font-semibold text-slate-700 dark:text-foreground flex items-center gap-1">
            <Paperclip className="w-3.5 h-3.5 text-slate-400" />
            <span>{field.label}</span>
            {field.required && <span className="text-destructive">*</span>}
          </Label>
          <div className="p-4 border-2 border-dashed border-slate-200 dark:border-border rounded-xl text-center cursor-pointer hover:border-primary hover:bg-slate-50 dark:hover:bg-muted/30 transition-all">
            <Paperclip className="w-5 h-5 mx-auto mb-1 text-slate-400" />
            <span className="text-xs font-semibold text-slate-700 dark:text-foreground block">
              {field.placeholder || "اضغط لاختيار ملف أو صورة"}
            </span>
            {field.helpText && (
              <span className="text-[10px] text-slate-500 dark:text-muted-foreground mt-0.5 block">{field.helpText}</span>
            )}
          </div>
        </div>
      );
    }

    return (
      <div key={field.id} className="space-y-1.5">
        <Label htmlFor={`prev-${field.id}`} className="text-xs sm:text-sm font-semibold text-slate-700 dark:text-foreground flex items-center gap-1">
          <span>{field.label}</span>
          {field.required && <span className="text-destructive">*</span>}
        </Label>
        <div className="relative flex items-center">
          <Input
            id={`prev-${field.id}`}
            type={field.type === "number" ? "number" : field.type === "date" ? "date" : "text"}
            placeholder={field.placeholder || ""}
            value={value || ""}
            onChange={(e) => setPreviewValues((prev) => ({ ...prev, [field.id]: e.target.value }))}
            className={`h-11 rounded-xl text-right border-slate-200 dark:border-border focus:border-primary focus:ring-primary/20 bg-slate-50/40 dark:bg-muted/30 focus:bg-white transition-all text-xs sm:text-sm ${unitSuffix ? "pl-11" : ""}`}
          />
          {unitSuffix && (
            <span className="absolute left-2.5 text-xs px-2 py-0.5 font-semibold text-slate-500 bg-slate-200/60 rounded-md select-none pointer-events-none">
              {unitSuffix}
            </span>
          )}
        </div>
        {field.id === "customRoleTitle" && formId === "other" && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {["جار المسجد", "أحد جماعة المسجد", "ممثل جهة أو شركة", "صاحب استفسار عام"].map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => setPreviewValues((prev) => ({ ...prev, customRoleTitle: tag }))}
                className={`text-xs px-3 py-1 rounded-lg border transition-all cursor-pointer ${previewValues["customRoleTitle"] === tag
                    ? "bg-primary text-primary-foreground border-primary font-bold shadow-xs"
                    : "bg-slate-50 dark:bg-muted/40 text-slate-700 dark:text-foreground border-slate-200 dark:border-border hover:bg-slate-100"
                  }`}
              >
                {tag}
              </button>
            ))}
          </div>
        )}
        {field.helpText && (
          <p className="text-[11px] text-slate-500 dark:text-muted-foreground">{field.helpText}</p>
        )}
      </div>
    );
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
              className={`w-12 h-12 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center shrink-0 ${meta.color
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
              className={`text-xs h-10 px-3.5 rounded-xl border-border/80 shadow-2xs transition-all ${isCustomizedFromDefault
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
              className={`text-xs font-bold px-5 h-10 rounded-xl shadow-md gap-2 transition-all ${hasChanges
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
                    className={`rounded-2xl border bg-card text-right transition-all duration-200 overflow-hidden ${isDragging
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
                          className={`h-9 w-9 rounded-xl transition-colors ${isExpanded ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted"
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
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${previewDevice === "desktop"
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
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${previewDevice === "mobile"
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
              className={`w-full transition-all duration-300 ${previewDevice === "mobile"
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
              <div className={previewDevice === "mobile" ? "flex-1 overflow-y-auto p-3 sm:p-4 space-y-4 text-right bg-slate-50/70 dark:bg-background" : "space-y-6 max-w-2xl mx-auto py-2"}>
                
                {/* الترويسة والشعار مطابقة لـ Register.tsx */}
                <div className="flex flex-col items-center mb-3 sm:mb-6 text-center select-none">
                  <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-2 border border-emerald-500/20 shadow-xs">
                    <IconComponent className="w-6 h-6 sm:w-8 sm:h-8" />
                  </div>
                  <h1 className="font-bold text-sm sm:text-xl text-gray-900 dark:text-foreground">
                    بوابة منارة
                  </h1>
                  <p className="text-[11px] sm:text-sm text-gray-500 dark:text-muted-foreground mt-0.5">
                    نموذج التسجيل وتقديم الطلبات والتبرعات
                  </p>
                </div>

                {/* كرت النموذج المطابق لـ Register.tsx */}
                <div className="border border-slate-200/80 dark:border-border shadow-xl rounded-2xl sm:rounded-3xl bg-white dark:bg-card overflow-hidden">
                  
                  {/* شريط الإجراء العلوي والرجوع المطابق تماماً لـ Register.tsx */}
                  <div className="bg-slate-100/90 dark:bg-muted/60 border-b border-slate-200 dark:border-border px-4 sm:px-6 py-3 sm:py-3.5 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: "rgb(9, 112, 126)" }} />
                      <span className="text-xs sm:text-sm font-bold text-slate-800 dark:text-foreground truncate">
                        {formId === "donor_land"
                          ? "مسار المتبرع (تبرع بأرض)"
                          : formId === "donor_inkind"
                          ? "مسار المتبرع (تبرع عيني)"
                          : formId === "donor_other"
                          ? "مسار المتبرع (شراكة / وقفية / أخرى)"
                          : "مسار أخرى (استفسارات وطلبات عامة)"}
                      </span>
                    </div>

                    <button
                      type="button"
                      className="h-8 sm:h-9 px-3 sm:px-4 rounded-xl border border-primary/30 bg-white dark:bg-background hover:bg-primary/10 hover:border-primary text-primary text-xs sm:text-sm font-bold flex items-center gap-1.5 cursor-pointer shadow-sm hover:shadow transition-all shrink-0 group"
                    >
                      <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary group-hover:-translate-x-0.5 transition-transform" />
                      <span>تغيير الصفة</span>
                    </button>
                  </div>

                  <div data-slot="card-content" className="p-5 sm:p-8 space-y-6 text-right">
                    <form className="space-y-6" onSubmit={(e) => e.preventDefault()}>
                      {/* القسم الأول: بيانات المتبرع والتواصل / مقدم الطلب */}
                      {activeSection1Fields.length > 0 && (
                        <div className="space-y-4">
                          <div className="flex items-center gap-2 pb-2.5 border-b border-slate-100 dark:border-border/50">
                            <div className="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold text-xs border border-primary/20">
                              <User className="w-4 h-4" />
                            </div>
                            <h3 className="font-bold text-slate-900 dark:text-foreground text-sm sm:text-base">
                              {formId === "other" ? "بيانات مقدم الطلب" : "بيانات المتبرع والتواصل"}
                            </h3>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {activeSection1Fields.map(renderPreviewField)}
                          </div>
                        </div>
                      )}

                      {/* القسم الثاني: تفاصيل التبرع / الطلب */}
                      {activeSection2Fields.length > 0 && (
                        <div className="space-y-4 pt-1">
                          <div className="flex items-center gap-2 pb-2.5 border-b border-slate-100 dark:border-border/50">
                            <div className="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold text-xs border border-primary/20">
                              <IconComponent className="w-4 h-4" />
                            </div>
                            <h3 className="font-bold text-slate-900 dark:text-foreground text-sm sm:text-base">
                              {formId === "other"
                                ? "تفاصيل الصفة والطلب"
                                : formId === "donor_other"
                                ? "تفاصيل الصفة والتبرع"
                                : "اذكر تفاصيل التبرع"}
                            </h3>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {activeSection2Fields.map(renderPreviewField)}
                          </div>
                        </div>
                      )}

                      {/* زر الإرسال المتدرج مطابق لـ Register.tsx */}
                      <Button
                        type="button"
                        className="w-full text-white font-bold h-12 rounded-xl shadow-md hover:shadow-lg transition-all mt-4 text-sm sm:text-base flex items-center justify-center gap-2 cursor-pointer"
                        style={{ background: "linear-gradient(135deg, rgb(9, 112, 126) 0%, rgb(8, 145, 178) 100%)" }}
                      >
                        <IconComponent className="w-5 h-5" />
                        <span>
                          {formId === "donor_land"
                            ? "إرسال بيانات التبرع بالأرض"
                            : formId === "donor_inkind"
                            ? "إرسال بيانات التبرع العيني"
                            : formId === "donor_financial"
                            ? "إرسال إشعار التحويل البنكي"
                            : formId === "donor_other"
                            ? "إرسال بيانات التبرع"
                            : "إرسال الطلب للجمعية"}
                        </span>
                      </Button>
                    </form>

                    {/* الروابط السفلية مطابقة لـ Register.tsx */}
                    <div className="mt-8 pt-5 border-t border-slate-100 dark:border-border/50 text-center space-y-2.5">
                      <p className="text-xs sm:text-sm text-gray-600 dark:text-muted-foreground">
                        لديك حساب إمام أو مؤذن معتمد بالفعل؟{" "}
                        <span className="font-bold text-teal-700 dark:text-teal-400">
                          تسجيل الدخول
                        </span>
                      </p>
                      <span className="block text-xs text-gray-500 dark:text-muted-foreground/80">
                        ← العودة إلى الصفحة الرئيسية
                      </span>
                    </div>
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
