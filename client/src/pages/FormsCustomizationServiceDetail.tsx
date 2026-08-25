import { useState, useEffect } from "react";
import { Link, useRoute } from "wouter";
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
import {
  ArrowRight,
  Plus,
  Trash2,
  Save,
  RotateCcw,
  Eye,
  FileText,
  AlignLeft,
  Hash,
  List,
  CheckSquare,
  Mail,
  Phone,
  Radio,
  Calendar,
  Paperclip,
  ChevronUp,
  ChevronDown,
  Loader2,
  X,
  Package,
  Building2,
  Hammer,
  Wrench,
  Receipt,
  Sparkles,
  Sun,
  Droplets,
  GlassWater,
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

const FIELD_TYPES: Array<{ type: ServiceFieldType; label: string; icon: any }> = [
  { type: "text", label: "نص قصير 📝", icon: FileText },
  { type: "textarea", label: "نص طويل / وصف 📄", icon: AlignLeft },
  { type: "number", label: "رقمي 🔢", icon: Hash },
  { type: "select", label: "قائمة منسدلة 🔽", icon: List },
  { type: "radio", label: "خيارات متعددة 🔘", icon: Radio },
  { type: "checkbox", label: "مربع اختيار ☑️", icon: CheckSquare },
  { type: "date", label: "تاريخ 📅", icon: Calendar },
  { type: "file", label: "مرفق / ملف 📎", icon: Paperclip },
  { type: "phone", label: "رقم جوال 📱", icon: Phone },
  { type: "email", label: "بريد إلكتروني ✉️", icon: Mail },
];

const ICON_MAP: Record<string, any> = {
  Building2,
  Hammer,
  Wrench,
  Package,
  Receipt,
  Sparkles,
  Sun,
  Droplets,
  GlassWater,
};

export default function FormsCustomizationServiceDetail() {
  const [, params] = useRoute("/forms-customization/services/:serviceId");
  const serviceId = params?.serviceId || "";

  const utils = trpc.useUtils();

  // الحصول على بيانات البرنامج
  const { data: allPrograms = [] } = trpc.programs.getAll.useQuery();
  const currentProgram = allPrograms.find((p) => p.id === serviceId);

  // الحصول على حقول النموذج للخدمة
  const { data: serverConfig, isLoading } = trpc.forms.getServiceFormConfig.useQuery(
    { serviceId },
    { enabled: !!serviceId }
  );

  const [fields, setFields] = useState<ServiceField[]>([]);
  const [hasChanges, setHasChanges] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);
  const [newOptionInputs, setNewOptionInputs] = useState<Record<string, string>>({});

  useEffect(() => {
    if (serverConfig?.fields) {
      setFields([...serverConfig.fields].sort((a, b) => a.order - b.order));
      setHasChanges(false);
    }
  }, [serverConfig]);

  const saveMutation = trpc.forms.saveServiceFormConfig.useMutation({
    onSuccess: (res) => {
      toast.success(res.message);
      setHasChanges(false);
      utils.forms.getServiceFormConfig.invalidate({ serviceId });
    },
    onError: (err) => {
      toast.error(err.message || "حدث خطأ أثناء الحفظ");
    },
  });

  const resetMutation = trpc.forms.resetServiceFormConfig.useMutation({
    onSuccess: (res) => {
      toast.success(res.message);
      setIsResetConfirmOpen(false);
      utils.forms.getServiceFormConfig.invalidate({ serviceId });
    },
    onError: (err) => {
      toast.error(err.message || "حدث خطأ أثناء استعادة الافتراضي");
    },
  });

  const handleSave = () => {
    if (fields.length === 0) {
      toast.error("يجب أن يحتوي النموذج على حقل واحد على الأقل");
      return;
    }

    saveMutation.mutate({
      serviceId,
      serviceName: currentProgram?.name || serviceId,
      fields,
    });
  };

  // إضافة حقل جديد
  const handleAddField = () => {
    const nextOrder = fields.length > 0 ? Math.max(...fields.map((f) => f.order)) + 1 : 1;

    const newField: ServiceField = {
      id: `field_${Date.now()}`,
      type: "text",
      label: "حقل جديد",
      placeholder: "",
      helpText: "",
      required: false,
      isActive: true,
      order: nextOrder,
      options: [],
    };

    setFields((prev) => [...prev, newField]);
    setHasChanges(true);
    toast.success("تمت إضافة حقل جديد للنموذج");
  };

  // تحديث حقل
  const handleUpdateField = (fieldId: string, updates: Partial<ServiceField>) => {
    setFields((prev) =>
      prev.map((f) => (f.id === fieldId ? { ...f, ...updates } : f))
    );
    setHasChanges(true);
  };

  // حذف حقل
  const handleDeleteField = (fieldId: string) => {
    setFields((prev) => prev.filter((f) => f.id !== fieldId));
    setHasChanges(true);
  };

  // تحريك حقل
  const handleMoveField = (index: number, direction: "up" | "down") => {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= fields.length) return;

    const newFields = [...fields];
    const temp = newFields[index];
    newFields[index] = newFields[targetIndex];
    newFields[targetIndex] = temp;

    const updated = newFields.map((f, i) => ({ ...f, order: i + 1 }));
    setFields(updated);
    setHasChanges(true);
  };

  // إضافة خيار للقوائم
  const handleAddOption = (fieldId: string) => {
    const text = (newOptionInputs[fieldId] || "").trim();
    if (!text) return;

    const field = fields.find((f) => f.id === fieldId);
    if (!field) return;

    const updatedOptions = [...(field.options || []), { label: text, value: text }];
    handleUpdateField(fieldId, { options: updatedOptions });
    setNewOptionInputs((prev) => ({ ...prev, [fieldId]: "" }));
  };

  const handleRemoveOption = (fieldId: string, optIndex: number) => {
    const field = fields.find((f) => f.id === fieldId);
    if (!field || !field.options) return;

    const updatedOptions = field.options.filter((_, i) => i !== optIndex);
    handleUpdateField(fieldId, { options: updatedOptions });
  };

  const IconComponent = ICON_MAP[currentProgram?.icon || "Package"] || Package;

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[300px]">
          <div className="text-center space-y-2">
            <Loader2 className="w-6 h-6 animate-spin mx-auto text-primary" />
            <p className="text-xs text-muted-foreground">جاري تحميل حقول الخدمة...</p>
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
            <Link href="/forms-customization/services">
              <Button variant="ghost" size="icon" type="button" className="shrink-0">
                <ArrowRight className="w-5 h-5" />
              </Button>
            </Link>
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                currentProgram?.color || "bg-indigo-600"
              } text-white shadow-2xs`}
            >
              <IconComponent className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-foreground">
                  تخصيص نموذج: {currentProgram?.name || serviceId}
                </h1>
                {hasChanges && (
                  <Badge variant="outline" className="text-[10px] text-amber-600 border-amber-300">
                    تعديلات غير محفوظة
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                تعديل حقول واستمارة طلب الخدمة التي يملؤها المستفيد
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

        {/* قائمة الحقول البسيطة والواضحة */}
        <div className="space-y-3">
          {fields.map((field, index) => (
            <div
              key={field.id}
              className={`p-3.5 sm:p-4 rounded-xl border bg-card text-right transition-all ${
                !field.isActive ? "opacity-50 bg-muted/20" : "border-border shadow-2xs"
              }`}
            >
              <div className="flex flex-col md:flex-row md:items-center gap-3">
                {/* الترتيب ورقم الحقل */}
                <div className="flex items-center gap-2 shrink-0">
                  <div className="flex flex-col gap-0.5">
                    <button
                      type="button"
                      disabled={index === 0}
                      onClick={() => handleMoveField(index, "up")}
                      className="p-0.5 rounded hover:bg-muted text-muted-foreground disabled:opacity-20"
                    >
                      <ChevronUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      disabled={index === fields.length - 1}
                      onClick={() => handleMoveField(index, "down")}
                      className="p-0.5 rounded hover:bg-muted text-muted-foreground disabled:opacity-20"
                    >
                      <ChevronDown className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <span className="text-xs font-bold text-muted-foreground w-6 text-center">
                    #{index + 1}
                  </span>
                </div>

                {/* نص السؤال / التسمية المباشرة */}
                <div className="flex-1 min-w-0">
                  <Input
                    value={field.label}
                    onChange={(e) => handleUpdateField(field.id, { label: e.target.value })}
                    placeholder="اسم الحقل / السؤال..."
                    className="h-9 text-xs sm:text-sm font-semibold text-right"
                  />
                </div>

                {/* نوع الحقل */}
                <div className="w-full sm:w-44 shrink-0">
                  <Select
                    value={field.type}
                    onValueChange={(val: ServiceFieldType) =>
                      handleUpdateField(field.id, { type: val })
                    }
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
                <div className="mt-3 pt-3 border-t border-border/40 space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs text-muted-foreground">الخيارات:</span>
                    {field.options?.map((opt, oIdx) => (
                      <span
                        key={oIdx}
                        className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-muted text-xs font-medium"
                      >
                        <span>{opt.label}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveOption(field.id, oIdx)}
                          className="text-muted-foreground hover:text-destructive"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>

                  <div className="flex items-center gap-2 max-w-sm">
                    <Input
                      value={newOptionInputs[field.id] || ""}
                      onChange={(e) =>
                        setNewOptionInputs((prev) => ({ ...prev, [field.id]: e.target.value }))
                      }
                      placeholder="أدخل خياراً جديداً..."
                      className="h-8 text-xs text-right"
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
                      className="h-8 px-3 text-xs"
                    >
                      إضافة
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* زر إضافة حقل جديد */}
        <div className="pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={handleAddField}
            className="w-full h-11 border-dashed border-2 hover:border-primary text-xs font-bold gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>إضافة حقل / سؤال جديد لهذا النموذج</span>
          </Button>
        </div>
      </div>

      {/* نافذة المعاينة البسيطة */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto text-right" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-center">
              معاينة نموذج: {currentProgram?.name}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-3">
            {fields
              .filter((f) => f.isActive)
              .map((field) => (
                <div key={field.id} className="space-y-1">
                  <label className="text-xs font-bold text-foreground block">
                    {field.label} {field.required && <span className="text-destructive">*</span>}
                  </label>

                  {["text", "phone", "email", "number", "date"].includes(field.type) && (
                    <Input
                      disabled
                      placeholder={field.placeholder || "..."}
                      type={field.type === "date" ? "date" : "text"}
                      className="h-9 text-xs"
                    />
                  )}

                  {field.type === "textarea" && (
                    <Input disabled placeholder="اكتب التفاصيل..." className="h-16 text-xs" />
                  )}

                  {field.type === "file" && (
                    <div className="p-4 rounded-xl border border-dashed text-center text-xs text-muted-foreground">
                      اسحب الملف هنا أو انقر للإرفاق (معاينة)
                    </div>
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
                      <span className="text-xs text-muted-foreground">{field.placeholder || "نعم / أوافق"}</span>
                    </div>
                  )}
                </div>
              ))}
          </div>

          <DialogFooter>
            <Button type="button" onClick={() => setIsPreviewOpen(false)} className="text-xs w-full">
              إغلاق المعاينة
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* نافذة تأكيد إعادة التعيين */}
      <Dialog open={isResetConfirmOpen} onOpenChange={setIsResetConfirmOpen}>
        <DialogContent className="max-w-sm text-right" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold text-center">
              استعادة الحقول الافتراضية للخدمة؟
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
              className="text-xs"
            >
              إلغاء
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              disabled={resetMutation.isPending}
              onClick={() => resetMutation.mutate({ serviceId })}
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
