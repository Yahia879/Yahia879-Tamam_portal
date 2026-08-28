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
  ChevronRight,
  ChevronUp,
  ChevronDown,
  Sparkles,
  SlidersHorizontal,
  LandPlot,
  Package,
  CreditCard,
  HelpCircle,
  ExternalLink,
  CheckCircle2,
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
];

const ICON_MAP: Record<string, any> = {
  donor_land: LandPlot,
  donor_inkind: Package,
  donor_financial: CreditCard,
  donor_other: Sparkles,
  other: HelpCircle,
};

export default function FormsCustomizationRegistrationDetail() {
  const [, params] = useRoute("/forms-customization/registration/:formId");
  const formId = params?.formId || "";

  const utils = trpc.useUtils();

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

  // حالة المعاينة التفاعلية
  const [previewDevice, setPreviewDevice] = useState<"desktop" | "mobile">("desktop");
  const [previewValues, setPreviewValues] = useState<Record<string, any>>({});

  // استرجاع الحقول عند تحميل الصفحة من الخادم
  useEffect(() => {
    if (serverConfig?.fields) {
      const loaded = [...serverConfig.fields].sort((a, b) => a.order - b.order);
      setFields(loaded);
      setHasChanges(false);
    }
  }, [serverConfig, formId]);

  // طفرة حفظ الحقول
  const saveMutation = trpc.forms.saveRegistrationFormConfig.useMutation({
    onSuccess: (res) => {
      toast.success(res.message);
      setHasChanges(false);
      utils.forms.getRegistrationFormConfig.invalidate({ formId });
    },
    onError: (err) => {
      toast.error(err.message || "حدث خطأ أثناء الحفظ");
    },
  });

  // طفرة استعادة الافتراضي
  const resetMutation = trpc.forms.resetRegistrationFormConfig.useMutation({
    onSuccess: (res) => {
      toast.success(res.message);
      if (res.data?.fields) {
        setFields([...res.data.fields].sort((a, b) => a.order - b.order));
      }
      setHasChanges(false);
      setIsResetConfirmOpen(false);
      utils.forms.getRegistrationFormConfig.invalidate({ formId });
    },
    onError: (err) => {
      toast.error(err.message || "حدث خطأ أثناء الاستعادة");
    },
  });

  // إضافة حقل جديد
  const handleAddField = (type: ServiceFieldType) => {
    const typeObj = FIELD_TYPES.find((t) => t.type === type);
    const newField: ServiceField = {
      id: `custom_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      type,
      label: `حقل ${typeObj?.label || type} جديد`,
      placeholder: "",
      helpText: "",
      required: false,
      isActive: true,
      order: fields.length + 1,
      options:
        type === "select" || type === "radio"
          ? [
              { label: "الخيار الأول", value: "opt_1" },
              { label: "الخيار الثاني", value: "opt_2" },
            ]
          : undefined,
      isSystem: false,
    };

    setFields((prev) => [...prev, newField]);
    setHasChanges(true);
    toast.success(`تمت إضافة حقل "${newField.label}"`);
  };

  // تحديث بيانات حقل
  const updateField = (id: string, updates: Partial<ServiceField>) => {
    setFields((prev) =>
      prev.map((f) => (f.id === id ? { ...f, ...updates } : f))
    );
    setHasChanges(true);
  };

  // حذف حقل
  const deleteField = (id: string) => {
    setFields((prev) =>
      prev
        .filter((f) => f.id !== id)
        .map((f, idx) => ({ ...f, order: idx + 1 }))
    );
    setHasChanges(true);
    toast.info("تم حذف الحقل");
  };

  // تحريك الحقل لأعلى أو لأسفل
  const moveField = (index: number, direction: "up" | "down") => {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= fields.length) return;

    const newFields = [...fields];
    const [moved] = newFields.splice(index, 1);
    newFields.splice(targetIndex, 0, moved);

    const reordered = newFields.map((f, i) => ({ ...f, order: i + 1 }));
    setFields(reordered);
    setHasChanges(true);
  };

  // خيارات القوائم المنسدلة والراديو
  const addOptionToField = (fieldId: string) => {
    const text = newOptionInputs[fieldId]?.trim();
    if (!text) return;

    setFields((prev) =>
      prev.map((f) => {
        if (f.id !== fieldId) return f;
        const currentOptions = f.options || [];
        const nextVal = `val_${currentOptions.length + 1}_${Date.now() % 1000}`;
        return {
          ...f,
          options: [...currentOptions, { label: text, value: nextVal }],
        };
      })
    );

    setNewOptionInputs((prev) => ({ ...prev, [fieldId]: "" }));
    setHasChanges(true);
  };

  const removeOptionFromField = (fieldId: string, optIndex: number) => {
    setFields((prev) =>
      prev.map((f) => {
        if (f.id !== fieldId || !f.options) return f;
        return {
          ...f,
          options: f.options.filter((_, idx) => idx !== optIndex),
        };
      })
    );
    setHasChanges(true);
  };

  const applyPresetOptions = (fieldId: string, options: FormFieldOption[]) => {
    setFields((prev) =>
      prev.map((f) => (f.id === fieldId ? { ...f, options } : f))
    );
    setHasChanges(true);
  };

  // حفظ التعديلات
  const handleSave = () => {
    saveMutation.mutate({
      formId,
      formName: serverConfig?.formName || formId,
      fields: fields.map((f, i) => ({ ...f, order: i + 1 })),
    });
  };

  const FormIcon = ICON_MAP[formId] || HeartHandshake;

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-6xl mx-auto">
        {/* رأس الصفحة والشريط العلوي */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-border/70">
          <div className="flex items-center gap-3">
            <Link href="/forms-customization/registration">
              <Button variant="ghost" size="icon" type="button" className="h-9 w-9 rounded-xl hover:bg-muted/80 shrink-0">
                <ArrowRight className="w-5 h-5 text-foreground" />
              </Button>
            </Link>
            <div className="w-11 h-11 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/20">
              <FormIcon className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg sm:text-xl font-bold text-foreground">
                  {serverConfig?.formName || "تخصيص النموذج"}
                </h1>
                {hasChanges && (
                  <Badge variant="outline" className="text-[11px] bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300">
                    تغييرات غير محفوظة
                  </Badge>
                )}
                {serverConfig?.isCustomized && !hasChanges && (
                  <Badge variant="outline" className="text-[11px] bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300">
                    مخصص ومحفوظ
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                تعديل، إضافة، وإعادة ترتيب حقول النموذج الذي يظهر للمستخدمين في صفحة التسجيل
              </p>
            </div>
          </div>

          {/* أزرار الإجراءات العلوية */}
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsPreviewOpen(true)}
              className="gap-1.5 text-xs font-semibold h-9 rounded-xl"
            >
              <Eye className="w-4 h-4" />
              <span>معاينة حية</span>
            </Button>

            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setIsResetConfirmOpen(true)}
              disabled={resetMutation.isPending}
              className="gap-1.5 text-xs font-semibold text-muted-foreground hover:text-destructive h-9 rounded-xl"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>استعادة الافتراضي</span>
            </Button>

            <Button
              type="button"
              size="sm"
              onClick={handleSave}
              disabled={saveMutation.isPending || (!hasChanges && !serverConfig?.isCustomized)}
              className="gap-1.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white h-9 px-4 rounded-xl shadow-xs"
            >
              {saveMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>جاري الحفظ...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>حفظ التعديلات</span>
                </>
              )}
            </Button>
          </div>
        </div>

        {/* جسم الصفحة: قائمة الحقول + زر إضافة حقل */}
        {isLoading ? (
          <div className="flex items-center justify-center min-h-[300px]">
            <div className="text-center space-y-2">
              <Loader2 className="w-6 h-6 animate-spin mx-auto text-primary" />
              <p className="text-xs text-muted-foreground">جاري تحميل حقول النموذج...</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* العمود الأيمن: قائمة الحقول الحالية للنموذج (3 أعمدة) */}
            <div className="lg:col-span-3 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-muted-foreground">
                  إجمالي الحقول: {fields.length} (المفعلة: {fields.filter((f) => f.isActive).length})
                </span>
                <span className="text-[11px] text-muted-foreground">
                  استخدم الأسهم لإعادة الترتيب أو اضغط لتعديل الخصائص
                </span>
              </div>

              <div className="space-y-3">
                {fields.map((field, index) => {
                  const fieldTypeMeta = FIELD_TYPES.find((t) => t.type === field.type);
                  const Icon = fieldTypeMeta?.icon || FileText;

                  return (
                    <div
                      key={field.id}
                      className={`p-4 sm:p-5 rounded-2xl border transition-all text-right ${
                        field.isActive
                          ? "bg-card border-border/90 shadow-2xs"
                          : "bg-muted/30 border-dashed border-border/60 opacity-60"
                      }`}
                    >
                      {/* رأس بطاقة الحقل */}
                      <div className="flex items-start justify-between gap-3 pb-3 border-b border-border/50">
                        <div className="flex items-center gap-3">
                          <div className="flex flex-col gap-1">
                            <button
                              type="button"
                              onClick={() => moveField(index, "up")}
                              disabled={index === 0}
                              className="p-1 rounded hover:bg-muted text-muted-foreground disabled:opacity-30 cursor-pointer"
                              title="تحريك لأعلى"
                            >
                              <ChevronUp className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => moveField(index, "down")}
                              disabled={index === fields.length - 1}
                              className="p-1 rounded hover:bg-muted text-muted-foreground disabled:opacity-30 cursor-pointer"
                              title="تحريك لأسفل"
                            >
                              <ChevronDown className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shrink-0">
                            {index + 1}
                          </div>

                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-bold text-sm text-foreground">
                                {field.label || "بدون عنوان"}
                              </span>
                              {field.required && (
                                <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                                  إلزامي
                                </Badge>
                              )}
                              <Badge variant="outline" className="text-[10px] gap-1 px-1.5 py-0 text-muted-foreground">
                                <Icon className="w-3 h-3" />
                                {fieldTypeMeta?.label || field.type}
                              </Badge>
                            </div>
                            {field.helpText && (
                              <p className="text-[11px] text-muted-foreground mt-0.5">
                                {field.helpText}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* مفتاح التفعيل والحذف */}
                        <div className="flex items-center gap-3 shrink-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[11px] text-muted-foreground">
                              {field.isActive ? "مفعّل" : "معطّل"}
                            </span>
                            <Switch
                              checked={field.isActive}
                              onCheckedChange={(checked) => updateField(field.id, { isActive: checked })}
                            />
                          </div>

                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => deleteField(field.id)}
                            className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg"
                            title="حذف الحقل"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>

                      {/* تفاصيل وتعديل خصائص الحقل */}
                      <div className="pt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <Label className="text-[11px] text-muted-foreground">عنوان الحقل (Label)</Label>
                          <Input
                            value={field.label}
                            onChange={(e) => updateField(field.id, { label: e.target.value })}
                            className="h-9 text-xs rounded-xl"
                          />
                        </div>

                        <div className="space-y-1">
                          <Label className="text-[11px] text-muted-foreground">نص توضيحي داخل الحقل (Placeholder)</Label>
                          <Input
                            value={field.placeholder || ""}
                            onChange={(e) => updateField(field.id, { placeholder: e.target.value })}
                            placeholder="مثال: أدخل القيمة هنا..."
                            className="h-9 text-xs rounded-xl"
                          />
                        </div>

                        <div className="space-y-1 sm:col-span-2">
                          <Label className="text-[11px] text-muted-foreground">نص إرشادي أسفل الحقل (Help Text)</Label>
                          <Input
                            value={field.helpText || ""}
                            onChange={(e) => updateField(field.id, { helpText: e.target.value })}
                            placeholder="شرح إضافي يظهر للمستخدم أسفل الحقل..."
                            className="h-9 text-xs rounded-xl"
                          />
                        </div>

                        {/* خيارات الحقل في حال كان select أو radio */}
                        {(field.type === "select" || field.type === "radio") && (
                          <div className="sm:col-span-2 p-3 bg-muted/40 rounded-xl border border-border/60 space-y-2 mt-1">
                            <div className="flex items-center justify-between">
                              <Label className="text-xs font-bold text-foreground">
                                خيارات الحقل ({field.options?.length || 0})
                              </Label>
                              {/* القوالب الجاهزة */}
                              <div className="flex items-center gap-1">
                                {PRESET_OPTIONS.map((preset) => (
                                  <button
                                    key={preset.name}
                                    type="button"
                                    onClick={() => applyPresetOptions(field.id, preset.options)}
                                    className="text-[10px] px-2 py-0.5 rounded bg-card hover:bg-muted text-muted-foreground border border-border cursor-pointer transition-colors"
                                  >
                                    + {preset.name}
                                  </button>
                                ))}
                              </div>
                            </div>

                            {/* قائمة الخيارات الحالية */}
                            <div className="space-y-1.5">
                              {field.options?.map((opt, optIdx) => (
                                <div key={optIdx} className="flex items-center gap-2">
                                  <Input
                                    value={opt.label}
                                    onChange={(e) => {
                                      const newOpts = [...(field.options || [])];
                                      newOpts[optIdx] = { ...newOpts[optIdx], label: e.target.value };
                                      updateField(field.id, { options: newOpts });
                                    }}
                                    className="h-8 text-xs bg-card"
                                    placeholder="نص الخيار"
                                  />
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => removeOptionFromField(field.id, optIdx)}
                                    className="h-8 w-8 text-destructive hover:bg-destructive/10 shrink-0"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                  </Button>
                                </div>
                              ))}
                            </div>

                            {/* إضافة خيار جديد */}
                            <div className="flex items-center gap-2 pt-1">
                              <Input
                                value={newOptionInputs[field.id] || ""}
                                onChange={(e) =>
                                  setNewOptionInputs((prev) => ({ ...prev, [field.id]: e.target.value }))
                                }
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") {
                                    e.preventDefault();
                                    addOptionToField(field.id);
                                  }
                                }}
                                placeholder="اكتب خياراً جديداً واضغط إضافة..."
                                className="h-8 text-xs bg-card"
                              />
                              <Button
                                type="button"
                                size="sm"
                                variant="secondary"
                                onClick={() => addOptionToField(field.id)}
                                className="h-8 px-3 text-xs font-semibold shrink-0"
                              >
                                <Plus className="w-3.5 h-3.5 mr-1" />
                                إضافة
                              </Button>
                            </div>
                          </div>
                        )}

                        {/* إعدادات إضافية */}
                        <div className="sm:col-span-2 flex items-center gap-4 pt-1">
                          <label className="flex items-center gap-2 cursor-pointer select-none text-xs">
                            <Checkbox
                              checked={field.required}
                              onCheckedChange={(checked) => updateField(field.id, { required: !!checked })}
                            />
                            <span className="font-semibold text-foreground">حقل إلزامي (مطلوب)</span>
                          </label>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* العمود الأيسر: لوحة إضافة حقول جديدة (عمود 1) */}
            <div className="space-y-4">
              <div className="p-4 sm:p-5 rounded-2xl border border-border bg-card shadow-2xs space-y-3 sticky top-4">
                <div className="flex items-center gap-2 pb-2 border-b border-border/60">
                  <Plus className="w-4 h-4 text-emerald-600" />
                  <h3 className="font-bold text-sm text-foreground">إضافة حقل جديد</h3>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  اختر نوع الحقل لإضافته إلى النموذج، ثم قم بتعديل اسمه وخصائصه:
                </p>

                <div className="space-y-1.5 pt-1">
                  {FIELD_TYPES.map((ft) => {
                    const Icon = ft.icon;
                    return (
                      <button
                        key={ft.type}
                        type="button"
                        onClick={() => handleAddField(ft.type)}
                        className="w-full flex items-center justify-between p-2.5 rounded-xl border border-border/70 hover:border-emerald-500 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/20 text-right transition-all group cursor-pointer"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-7 h-7 rounded-lg bg-muted group-hover:bg-emerald-100 dark:group-hover:bg-emerald-900/50 text-foreground group-hover:text-emerald-700 dark:group-hover:text-emerald-300 flex items-center justify-center shrink-0 transition-colors">
                            <Icon className="w-3.5 h-3.5" />
                          </div>
                          <div>
                            <span className="font-semibold text-xs text-foreground block">
                              {ft.label}
                            </span>
                            <span className="text-[10px] text-muted-foreground block truncate">
                              {ft.description}
                            </span>
                          </div>
                        </div>
                        <Plus className="w-3.5 h-3.5 text-muted-foreground group-hover:text-emerald-600 transition-colors shrink-0" />
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* شاشة المعاينة الحية التفاعلية */}
        <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto" dir="rtl">
            <DialogHeader className="border-b pb-3">
              <div className="flex items-center justify-between w-full">
                <DialogTitle className="text-base sm:text-lg font-bold flex items-center gap-2">
                  <Eye className="w-5 h-5 text-emerald-600" />
                  <span>معاينة حية: {serverConfig?.formName}</span>
                </DialogTitle>

                {/* زر التبديل بين سطح المكتب والموبايل */}
                <div className="flex items-center gap-1 p-1 bg-muted rounded-xl border">
                  <button
                    type="button"
                    onClick={() => setPreviewDevice("desktop")}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                      previewDevice === "desktop"
                        ? "bg-card text-foreground shadow-xs"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <Monitor className="w-3.5 h-3.5" />
                    <span>سطح المكتب</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewDevice("mobile")}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                      previewDevice === "mobile"
                        ? "bg-card text-foreground shadow-xs"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <Smartphone className="w-3.5 h-3.5" />
                    <span>الجوال</span>
                  </button>
                </div>
              </div>
            </DialogHeader>

            {/* محتوى المعاينة التفاعلي */}
            <div className={`py-4 mx-auto ${previewDevice === "mobile" ? "max-w-sm" : "w-full"}`}>
              <div className="p-6 rounded-2xl border-2 border-slate-200 bg-white shadow-sm space-y-5 text-right">
                <div className="border-b pb-3">
                  <h3 className="font-bold text-base text-slate-900">{serverConfig?.formName}</h3>
                  <p className="text-xs text-slate-500 mt-0.5">معاينة استمارة التقديم كما ستظهر للمستخدم</p>
                </div>

                <div className="space-y-4">
                  {fields
                    .filter((f) => f.isActive)
                    .map((field) => (
                      <div key={field.id} className="space-y-1.5">
                        <Label className="text-xs font-semibold text-slate-800 flex items-center gap-1">
                          <span>{field.label}</span>
                          {field.required && <span className="text-destructive">*</span>}
                        </Label>

                        {field.type === "textarea" ? (
                          <Textarea
                            rows={3}
                            placeholder={field.placeholder || ""}
                            value={previewValues[field.id] || ""}
                            onChange={(e) =>
                              setPreviewValues((prev) => ({ ...prev, [field.id]: e.target.value }))
                            }
                            className="rounded-xl text-xs"
                          />
                        ) : field.type === "select" ? (
                          <Select
                            value={previewValues[field.id] || ""}
                            onValueChange={(val) =>
                              setPreviewValues((prev) => ({ ...prev, [field.id]: val }))
                            }
                          >
                            <SelectTrigger className="h-10 rounded-xl text-xs">
                              <SelectValue placeholder={field.placeholder || "اختر من القائمة..."} />
                            </SelectTrigger>
                            <SelectContent>
                              {field.options?.map((opt, idx) => (
                                <SelectItem key={idx} value={opt.value}>
                                  {opt.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : field.type === "radio" ? (
                          <RadioGroup
                            value={previewValues[field.id] || ""}
                            onValueChange={(val) =>
                              setPreviewValues((prev) => ({ ...prev, [field.id]: val }))
                            }
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
                              onCheckedChange={(checked) =>
                                setPreviewValues((prev) => ({ ...prev, [field.id]: checked }))
                              }
                            />
                            <Label htmlFor={`prev_${field.id}`} className="text-xs cursor-pointer">
                              {field.label}
                            </Label>
                          </div>
                        ) : field.type === "file" ? (
                          <div className="border-2 border-dashed border-slate-200 rounded-xl p-4 text-center text-xs text-slate-500 bg-slate-50">
                            <Paperclip className="w-5 h-5 mx-auto mb-1 text-slate-400" />
                            <span>{field.placeholder || "اضغط لرفع ملف أو صورة"}</span>
                          </div>
                        ) : (
                          <Input
                            type={field.type === "number" ? "number" : field.type === "email" ? "email" : field.type === "date" ? "date" : "text"}
                            placeholder={field.placeholder || ""}
                            value={previewValues[field.id] || ""}
                            onChange={(e) =>
                              setPreviewValues((prev) => ({ ...prev, [field.id]: e.target.value }))
                            }
                            className="h-10 rounded-xl text-xs"
                          />
                        )}

                        {field.helpText && (
                          <p className="text-[11px] text-slate-500">{field.helpText}</p>
                        )}
                      </div>
                    ))}
                </div>

                <Button className="w-full h-11 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm">
                  إرسال الطلب (معاينة)
                </Button>
              </div>
            </div>

            <DialogFooter className="border-t pt-3">
              <Button variant="outline" onClick={() => setIsPreviewOpen(false)} className="rounded-xl">
                إغلاق المعاينة
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* حوار تأكيد الاستعادة للافتراضي */}
        <Dialog open={isResetConfirmOpen} onOpenChange={setIsResetConfirmOpen}>
          <DialogContent className="max-w-md" dir="rtl">
            <DialogHeader>
              <DialogTitle className="text-base font-bold text-destructive flex items-center gap-2">
                <AlertCircle className="w-5 h-5" />
                <span>تأكيد استعادة الحقول الافتراضية</span>
              </DialogTitle>
            </DialogHeader>
            <p className="text-xs text-muted-foreground leading-relaxed">
              هل أنت متأكد من رغبتك في إلغاء كافة التخصيصات المخصصة لهذا النموذج والعودة إلى الحقول الافتراضية الأصلية للنظام؟
            </p>
            <DialogFooter className="gap-2 pt-3 border-t">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsResetConfirmOpen(false)}
                className="rounded-xl"
              >
                إلغاء
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => resetMutation.mutate({ formId })}
                disabled={resetMutation.isPending}
                className="rounded-xl"
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
