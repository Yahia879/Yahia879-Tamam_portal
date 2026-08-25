import { useState, useEffect } from "react";
import { Link } from "wouter";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
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
import { useAuth } from "@/_core/hooks/useAuth";
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
  ChevronUp,
  ChevronDown,
  Loader2,
  AlertCircle,
  X,
  GripVertical,
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

export default function FormsCustomizationEvaluation() {
  const utils = trpc.useUtils();
  const { data: serverConfig, isLoading } = trpc.forms.getEvaluationFormConfig.useQuery();

  const [formConfig, setFormConfig] = useState<EvaluationFormSettings>({
    title: "قياس رضا المستفيدين من خدمات الجمعية",
    description: "",
    headerBgColor: "#14707a",
    submitButtonText: "إرسال التقييم",
    successTitle: "تم تقييم الخدمة بنجاح",
    successMessage: "شكراً لجهودكم ومشاركتكم القيمة.",
    fields: [],
  });

  const [hasChanges, setHasChanges] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);
  const [newOptionInputs, setNewOptionInputs] = useState<Record<string, string>>({});
  const [expandedPlaceholder, setExpandedPlaceholder] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (serverConfig) {
      setFormConfig({
        title: serverConfig.title || "قياس رضا المستفيدين من خدمات الجمعية",
        description: serverConfig.description || "",
        headerBgColor: serverConfig.headerBgColor || "#14707a",
        submitButtonText: serverConfig.submitButtonText || "إرسال التقييم",
        successTitle: serverConfig.successTitle || "تم تقييم الخدمة بنجاح",
        successMessage: serverConfig.successMessage || "شكراً لجهودكم ومشاركتكم القيمة.",
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

  // إضافة حقل جديد في الأسفل
  const handleAddField = () => {
    const nextOrder = formConfig.fields.length > 0
      ? Math.max(...formConfig.fields.map((f) => f.order)) + 1
      : 1;

    const newField: FormField = {
      id: `field_${Date.now()}`,
      type: "rating",
      label: "سؤال جديد",
      placeholder: "",
      helpText: "",
      required: false,
      isActive: true,
      order: nextOrder,
      options: [],
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

  const { user } = useAuth();
  const isAdmin = ["super_admin", "system_admin"].includes(user?.role || "");
  const userPermissions: string[] = (user as any)?.permissions ?? [];
  const hasPermission = isAdmin || userPermissions.includes("forms_customization.evaluation");

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
      <div className="space-y-6 max-w-4xl mx-auto">
        {/* شريط العنوان والإجراءات البسيط */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border/60">
          <div className="flex items-center gap-3">
            <Link href="/forms-customization">
              <Button variant="ghost" size="icon" type="button" className="shrink-0">
                <ArrowRight className="w-5 h-5" />
              </Button>
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-foreground">
                  تخصيص استمارة تقييم رضا المستفيد
                </h1>
                {hasChanges && (
                  <Badge variant="outline" className="text-[10px] text-amber-600 border-amber-300">
                    تعديلات غير محفوظة
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                أضف أو عدل الأسئلة وحدد نوعها وإلزاميتها مباشرة
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsResetConfirmOpen(true)}
              className="text-xs text-muted-foreground"
            >
              <RotateCcw className="w-3.5 h-3.5 mr-1" />
              الافتراضي
            </Button>

            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setIsPreviewOpen(true)}
              className="text-xs font-semibold"
            >
              <Eye className="w-3.5 h-3.5 mr-1" />
              معاينة
            </Button>

            <Button
              type="button"
              onClick={handleSave}
              disabled={saveMutation.isPending}
              className="text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white px-4"
              size="sm"
            >
              {saveMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-1" />
              )}
              حفظ التغييرات
            </Button>
          </div>
        </div>

        {/* قائمة الأسئلة البسيطة والواضحة */}
        <div className="space-y-2.5">
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
                className={`p-3.5 sm:p-4 rounded-xl border bg-card text-right transition-all ${
                  isDragging
                    ? "opacity-30 border-dashed border-2 border-primary scale-[0.99]"
                    : "border-border shadow-2xs hover:border-primary/40"
                } ${!field.isActive ? "opacity-50 bg-muted/20" : ""}`}
              >
                <div className="flex flex-col md:flex-row md:items-center gap-3">
                  {/* مقبض السحب والإفلات (Grip Handle) + الترتيب البارز */}
                  <div className="flex items-center gap-2 shrink-0">
                    <div
                      onMouseDown={() => setDragEnabledIndex(index)}
                      onMouseUp={() => setDragEnabledIndex(null)}
                      onTouchStart={() => setDragEnabledIndex(index)}
                      onTouchEnd={() => setDragEnabledIndex(null)}
                      className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted cursor-grab active:cursor-grabbing transition-colors select-none"
                      title="اضغط واسحب لتغيير الترتيب"
                    >
                      <GripVertical className="w-5 h-5 text-muted-foreground/70 pointer-events-none" />
                    </div>
                    <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary font-black text-xs sm:text-sm flex items-center justify-center border border-primary/20 shrink-0 shadow-2xs select-none">
                      #{index + 1}
                    </div>
                  </div>

                  {/* نص السؤال المباشر مع محرر تلميح مصغر */}
                  <div className="flex-1 min-w-0 space-y-1">
                    <Input
                      value={field.label}
                      onChange={(e) => handleUpdateField(field.id, { label: e.target.value })}
                      placeholder="اكتب السؤال هنا..."
                      className="h-9 text-xs sm:text-sm font-semibold text-right"
                    />

                    {/* محرر تلميح الحقل (Placeholder) المصغر والخفيف */}
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
                            className="h-7 text-[11px] text-muted-foreground placeholder:text-muted-foreground/40 bg-muted/30 border-dashed border-border/80 focus-visible:bg-background rounded-md text-right px-2"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              handleUpdateField(field.id, { placeholder: "" });
                              setExpandedPlaceholder((p) => ({ ...p, [field.id]: false }));
                            }}
                            className="p-1 rounded text-muted-foreground/50 hover:text-destructive transition-colors shrink-0"
                            title="إزالة التلميح"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setExpandedPlaceholder((p) => ({ ...p, [field.id]: true }))}
                          className="text-[11px] text-muted-foreground/60 hover:text-primary transition-colors flex items-center gap-1 font-medium select-none"
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
                    <SelectTrigger className="h-9 text-xs font-medium text-right">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent align="end">
                      {FIELD_TYPES.map((ft) => (
                        <SelectItem key={ft.type} value={ft.type} className="text-xs">
                          {ft.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* مفتاح الإلزامية */}
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs text-muted-foreground font-medium">إجباري:</span>
                  <Switch
                    checked={field.required}
                    onCheckedChange={(c) => handleUpdateField(field.id, { required: c })}
                  />
                </div>

                {/* مفتاح التفعيل */}
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs text-muted-foreground font-medium">مفعل:</span>
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
                  className="h-8 w-8 text-muted-foreground hover:text-destructive shrink-0"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>

              {/* إذا كان نوع الحقل قائمة منسدلة أو خيارات متعددة */}
              {["select", "radio"].includes(field.type) && (
                <div className="mt-3.5 pt-3.5 border-t border-border/60 bg-muted/20 -mx-3.5 -mb-3.5 p-3.5 sm:p-4 rounded-b-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                      <List className="w-3.5 h-3.5 text-primary" />
                      <span>خيارات الإجابة:</span>
                    </span>
                    <span className="text-[11px] text-muted-foreground font-medium">
                      {field.options?.length ? `${field.options.length} خيارات مضافة` : "لا توجد خيارات مضافة بعد"}
                    </span>
                  </div>

                  {/* قائمة الخيارات المضافة */}
                  {field.options && field.options.length > 0 ? (
                    <div className="flex items-center gap-2 flex-wrap">
                      {field.options.map((opt, oIdx) => (
                        <div
                          key={oIdx}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-background border border-border/80 text-xs font-semibold text-foreground shadow-2xs group/opt hover:border-primary/40 transition-colors"
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-primary/70" />
                          <span>{opt.label}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveOption(field.id, oIdx)}
                            className="p-0.5 rounded-md text-muted-foreground/60 hover:text-destructive hover:bg-destructive/10 transition-colors mr-0.5"
                            title="حذف هذا الخيار"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[11px] text-muted-foreground italic">
                      يرجى إضافة خيارات الإجابة التي ستظهر للمستخدم في هذا السؤال
                    </p>
                  )}

                  {/* حقل إضافة خيار جديد */}
                  <div className="flex items-center gap-2 max-w-md pt-0.5">
                    <Input
                      value={newOptionInputs[field.id] || ""}
                      onChange={(e) =>
                        setNewOptionInputs((prev) => ({ ...prev, [field.id]: e.target.value }))
                      }
                      placeholder="اكتب اسم الخيار ثم اضغط إضافة أو Enter..."
                      className="h-9 text-xs bg-background rounded-lg text-right"
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
                      className="h-9 px-3.5 text-xs font-bold gap-1 rounded-lg shrink-0"
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

        {/* زر إضافة حقل جديد البسيط */}
        <div className="pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={handleAddField}
            className="w-full h-11 border-dashed border-2 hover:border-primary text-xs font-bold gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>إضافة حقل / سؤال جديد</span>
          </Button>
        </div>
      </div>

      {/* نافذة المعاينة البسيطة */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto text-right" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-center">
              معاينة الاستمارة كما تظهر للمستفيد
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-3">
            {formConfig.fields
              .filter((f) => f.isActive)
              .map((field) => (
                <div key={field.id} className="space-y-1">
                  <label className="text-xs font-bold text-foreground block">
                    {field.label} {field.required && <span className="text-destructive">*</span>}
                  </label>

                  {field.type === "rating" && (
                    <div className="flex items-center gap-1 justify-end py-1" dir="ltr">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star key={s} className="w-6 h-6 text-amber-400 fill-amber-400/20" />
                      ))}
                    </div>
                  )}

                  {["text", "phone", "email", "number"].includes(field.type) && (
                    <Input disabled placeholder={field.placeholder || "..."} className="h-9 text-xs" />
                  )}

                  {field.type === "textarea" && (
                    <Input disabled placeholder="اكتب الملاحظات..." className="h-16 text-xs" />
                  )}

                  {field.type === "select" && (
                    <Select disabled>
                      <SelectTrigger className="h-9 text-xs">
                        <SelectValue placeholder="اختر من القائمة..." />
                      </SelectTrigger>
                    </Select>
                  )}

                  {field.type === "radio" && (
                    <div className="space-y-1">
                      {field.options?.map((opt, oIdx) => (
                        <div key={oIdx} className="flex items-center gap-2 text-xs text-muted-foreground">
                          <div className="w-3 h-3 rounded-full border" />
                          <span>{opt.label}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {field.type === "checkbox" && (
                    <div className="flex items-center gap-2">
                      <input type="checkbox" disabled className="rounded" />
                      <span className="text-xs text-muted-foreground">{field.placeholder || "أوافق"}</span>
                    </div>
                  )}
                </div>
              ))}
          </div>

          <DialogFooter>
            <Button type="button" onClick={() => setIsPreviewOpen(false)} className="text-xs w-full">
              إغلاق
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* نافذة تأكيد إعادة التعيين */}
      <Dialog open={isResetConfirmOpen} onOpenChange={setIsResetConfirmOpen}>
        <DialogContent className="max-w-sm text-right" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold text-center">
              استعادة الأسئلة الافتراضية؟
            </DialogTitle>
          </DialogHeader>
          <p className="text-xs text-muted-foreground text-center">
            سيتم استعادة الأسئلة القياسية لتقييم رضا المستفيد.
          </p>
          <DialogFooter className="gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsResetConfirmOpen(false)}
              className="text-xs"
            >
              إلغاء
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              disabled={resetMutation.isPending}
              onClick={() => resetMutation.mutate()}
              className="text-xs font-bold"
            >
              نعم، استعادة
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
