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
  Paperclip,
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
  CloudUpload,
  Layers,
  Sparkle,
  Wifi,
  Battery,
  Signal,
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

const getFieldIcon = (fieldId: string) => {
  switch (fieldId) {
    case "workDescription":
    case "fundingProposal":
    case "landProposal":
    case "notes":
      return FileText;
    case "mosqueArea":
    case "landArea":
    case "womenPrayerArea":
      return Ruler;
    case "actualWorshippers":
    case "womenPrayerCapacity":
      return Users;
    case "neighborhoodName":
    case "district":
    case "city":
    case "address":
      return MapPin;
    case "mosqueId":
    case "nearestMosque":
      return Building2;
    case "hasDonor":
    case "hasDonorForMaintenance":
    case "donationAmount":
    case "hasLand":
    case "landOwnership":
      return Coins;
    case "distanceToMosque":
      return MapPin;
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
    case "mosqueArea":
    case "landArea":
    case "womenPrayerArea":
      return "م²";
    case "actualWorshippers":
    case "womenPrayerCapacity":
      return "مصلي";
    case "distanceToMosque":
      return "كم";
    case "donationAmount":
      return "ريال";
    default:
      return null;
  }
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
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragEnabledIndex, setDragEnabledIndex] = useState<number | null>(null);
  const [expandedPlaceholder, setExpandedPlaceholder] = useState<Record<string, boolean>>({});

  // حالة المعاينة التفاعلية
  const [previewDevice, setPreviewDevice] = useState<"desktop" | "mobile">("desktop");
  const [previewValues, setPreviewValues] = useState<Record<string, any>>({});
  const [previewHasPrayerHall, setPreviewHasPrayerHall] = useState(false);
  const [previewWomenCapacity, setPreviewWomenCapacity] = useState("");
  const [previewWomenArea, setPreviewWomenArea] = useState("");

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
      utils.forms.invalidate();
    },
    onError: (err) => {
      toast.error(err.message || "حدث خطأ أثناء الحفظ");
    },
  });

  const resetMutation = trpc.forms.resetServiceFormConfig.useMutation({
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
              { label: "نعم", value: "yes" },
              { label: "لا", value: "no" },
            ]
          : [],
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
    if (fieldId === "mosqueId" && serviceId !== "bunyan") {
      toast.error("حقل اختيار المسجد مربوط بقاعدة البيانات ولا يمكن حذفه");
      return;
    }
    setFields((prev) => prev.filter((f) => f.id !== fieldId));
    setHasChanges(true);
    toast.info("تم حذف الحقل");
  };

  // سحب وإفلات لترتيب الحقول
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

  const activeFieldsCount = useMemo(() => fields.filter((f) => f.isActive).length, [fields]);
  const requiredFieldsCount = useMemo(() => fields.filter((f) => f.isActive && f.required).length, [fields]);

  const IconComponent = ICON_MAP[currentProgram?.icon || "Package"] || Package;

  const userPermissions = useUserPermissions();
  const hasPermission = userPermissions.includes("forms_customization.services");

  if (!hasPermission) {
    return (
      <DashboardLayout>
        <div className="max-w-md mx-auto my-16 p-8 rounded-2xl border border-border bg-card text-center space-y-3 shadow-sm">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center mx-auto">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-foreground">غير مصرح بالوصول</h3>
          <p className="text-xs text-muted-foreground leading-relaxed">
            لا تملك الصلاحية اللازمة لتخصيص نماذج طلبات الخدمات.
          </p>
          <Link href="/forms-customization/services">
            <Button variant="outline" size="sm" className="mt-2 text-xs font-semibold">
              العودة لقائمة الخدمات
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
            <p className="text-xs text-muted-foreground">جاري تحميل حقول الخدمة...</p>
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
            <Link href="/forms-customization/services">
              <Button variant="ghost" size="icon" type="button" className="shrink-0 rounded-xl hover:bg-muted">
                <ArrowRight className="w-5 h-5" />
              </Button>
            </Link>
            <div
              className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
                currentProgram?.color || "bg-indigo-600"
              } text-white shadow-md`}
            >
              <IconComponent className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-lg sm:text-xl font-bold text-foreground">
                  تخصيص نموذج: {currentProgram?.name || serviceId}
                </h1>
                <Badge variant="secondary" className="text-[11px] font-mono px-2 py-0.5">
                  {serviceId}
                </Badge>
                {hasChanges && (
                  <Badge variant="outline" className="text-[11px] font-bold text-amber-600 border-amber-300 bg-amber-50 dark:bg-amber-950/30">
                    تعديلات غير محفوظة
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                تخصيص الحقول والأسئلة لنموذج تقديم الطلب المباشر للمستفيدين والمسؤولين
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
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
              <span>معاينة حية للمستخدم</span>
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
              حفظ النموذج
            </Button>
          </div>
        </div>

        {/* شريط الإحصائيات والأدوات السريعة */}
        <div className="flex items-center justify-between gap-3 p-3.5 px-5 rounded-2xl bg-muted/40 border border-border/80 text-xs">
          <div className="flex items-center gap-4 text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-primary" />
              <span>إجمالي الحقول: <strong className="text-foreground">{fields.length}</strong></span>
            </div>
            <div className="hidden sm:flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>حقول نشطة: <strong className="text-foreground">{activeFieldsCount}</strong></span>
            </div>
            <div className="hidden sm:flex items-center gap-1.5">
              <span className="text-red-500 font-bold">*</span>
              <span>حقول إلزامية: <strong className="text-foreground">{requiredFieldsCount}</strong></span>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-muted-foreground hidden md:inline text-[11px]">إضافة سريعة:</span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => handleAddField("text", "حقل نصي")}
              className="h-7 text-[11px] px-2 rounded-lg font-medium text-primary hover:bg-primary/10"
            >
              + نص
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => handleAddField("number", "حقل رقمي")}
              className="h-7 text-[11px] px-2 rounded-lg font-medium text-primary hover:bg-primary/10"
            >
              + رقم
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => handleAddField("radio", "سؤال خيارات")}
              className="h-7 text-[11px] px-2 rounded-lg font-medium text-primary hover:bg-primary/10"
            >
              + خيارات
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => handleAddField("textarea", "وصف إضافي")}
              className="h-7 text-[11px] px-2 rounded-lg font-medium text-primary hover:bg-primary/10"
            >
              + نص طويل
            </Button>
          </div>
        </div>

        {/* قائمة الحقول بسحب وإفلات */}
        <div className="space-y-3">
          {fields.map((field, index) => {
            const isMosqueField = field.id === "mosqueId";
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
                      title="اضغط واسحب لتغيير ترتيب الحقل"
                    >
                      <GripVertical className="w-5 h-5 text-muted-foreground/70 pointer-events-none" />
                    </div>
                    <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary font-black text-xs sm:text-sm flex items-center justify-center border border-primary/20 shrink-0 shadow-2xs select-none">
                      #{index + 1}
                    </div>
                  </div>

                  {/* اسم الحقل + تلميح Placeholder */}
                  <div className="flex-1 min-w-0 space-y-1.5">
                    <div className="relative flex items-center">
                      <Input
                        value={field.label}
                        onChange={(e) => handleUpdateField(field.id, { label: e.target.value })}
                        placeholder="اسم الحقل / السؤال المطلوب..."
                        className="h-10 text-xs sm:text-sm font-bold text-right rounded-xl bg-background border-border/80 focus-visible:border-primary"
                      />
                    </div>

                    {/* محرر تلميح الحقل (Placeholder) المصغر */}
                    {(field.placeholder !== undefined && field.placeholder !== "") || expandedPlaceholder[field.id] ? (
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
                    )}
                  </div>

                  {/* نوع الحقل */}
                  <div className="w-full sm:w-44 shrink-0">
                    <Select
                      value={field.type}
                      onValueChange={(val: ServiceFieldType) =>
                        handleUpdateField(field.id, { type: val })
                      }
                      disabled={isMosqueField}
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
                      checked={isMosqueField ? true : field.required}
                      onCheckedChange={(c) => !isMosqueField && handleUpdateField(field.id, { required: c })}
                      disabled={isMosqueField}
                    />
                  </div>

                  {/* مفتاح التفعيل */}
                  <div className="flex items-center gap-2 shrink-0 bg-muted/30 px-3 py-1.5 rounded-xl border border-border/50">
                    <span className="text-xs text-muted-foreground font-semibold">مفعل:</span>
                    <Switch
                      checked={field.isActive}
                      onCheckedChange={(c) => handleUpdateField(field.id, { isActive: c })}
                      disabled={isMosqueField}
                    />
                  </div>

                  {/* زر الحذف */}
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    disabled={isMosqueField}
                    onClick={() => !isMosqueField && handleDeleteField(field.id)}
                    className={`h-9 w-9 rounded-xl shrink-0 ${
                      isMosqueField
                        ? "text-muted-foreground/30 cursor-not-allowed"
                        : "text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                    }`}
                    title={isMosqueField ? "حقل لا يمكن حذفه" : "حذف الحقل"}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>

                {/* خيارات القوائم والـ Radio */}
                {!isMosqueField && ["select", "radio"].includes(field.type) && (
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

        {/* زر إضافة حقل جديد */}
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
      </div>

      {/* ========================================================================= */}
      {/* نافذة المعاينة الحية بصفحة كاملة المطابقة لصفحة التقديم */}
      {/* ========================================================================= */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent
          showCloseButton={false}
          className="fixed inset-0 top-0 left-0 w-screen h-[100dvh] max-w-none max-h-none sm:max-w-none translate-x-0 translate-y-0 rounded-none border-0 p-0 overflow-hidden flex flex-col text-right shadow-none bg-slate-100 dark:bg-zinc-950 duration-200"
          dir="rtl"
        >
          {/* Header المعاينة الصلب والأنيق بدون بلور */}
          <div className="p-3.5 sm:p-4 border-b border-border/80 bg-card flex items-center justify-between gap-3 shrink-0 shadow-xs">
            <div className="flex items-center gap-3 min-w-0">
              <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center ${currentProgram?.color || "bg-primary"} text-white shadow-xs shrink-0`}>
                <IconComponent className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <DialogTitle className="text-sm sm:text-base font-bold text-foreground flex items-center gap-2">
                  <span className="truncate">معاينة حية: استمارة طلب خدمة {currentProgram?.name || serviceId}</span>
                  <Badge variant="outline" className="text-[10px] h-5 bg-primary/10 text-primary border-primary/20 hidden md:inline-flex shrink-0">
                    صفحة تفاعلية
                  </Badge>
                </DialogTitle>
                <p className="text-[11px] text-muted-foreground line-clamp-1">
                  تظهر هذه المعاينة التفاعلية تماماً كما سيراها المستفيد في صفحة تقديم الطلب
                </p>
              </div>
            </div>

            {/* محول الجهاز (Desktop vs Mobile) وزر الإغلاق */}
            <div className="flex items-center gap-2 shrink-0">
              {/* محول الجهاز */}
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
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 flex justify-center items-start bg-slate-100/90 dark:bg-zinc-950">
            <div
              className={`w-full transition-all duration-300 space-y-6 ${
                previewDevice === "mobile"
                  ? "max-w-[420px] border-4 border-slate-700/60 dark:border-zinc-800 rounded-3xl p-3.5 bg-background shadow-2xl my-auto"
                  : "max-w-4xl"
              }`}
            >
              {/* شريط حالة هاتف iPhone 14 Pro Max مع الجزيرة التفاعلية (Dynamic Island) */}
              {previewDevice === "mobile" && (
                <div className="flex items-center justify-between px-2 pt-1 pb-1 text-[11px] font-bold text-foreground/80 select-none border-b border-border/40 mb-2">
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
              )}

              {/* 1. Stepper واقعي لمراحل تقديم الطلب */}
              <div className="p-4 sm:p-5 rounded-2xl bg-card border border-border/80 shadow-xs space-y-3">
                <div className="flex items-center justify-between text-xs font-bold">
                  <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                    <span className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center text-[10px]">✓</span>
                    <span className="hidden sm:inline">بيانات المستفيد</span>
                  </div>
                  <div className="w-8 h-[2px] bg-emerald-500/40" />
                  <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                    <span className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center text-[10px]">✓</span>
                    <span className="hidden sm:inline">اختيار البرنامج</span>
                  </div>
                  <div className="w-8 h-[2px] bg-primary" />
                  <div className="flex items-center gap-1.5 text-primary">
                    <span className="w-5 h-5 rounded-full bg-primary text-white flex items-center justify-center text-[10px]">3</span>
                    <span>تفاصيل الطلب</span>
                  </div>
                  <div className="w-8 h-[2px] bg-border" />
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <span className="w-5 h-5 rounded-full bg-muted flex items-center justify-center text-[10px]">4</span>
                    <span className="hidden sm:inline">المراجعة والإرسال</span>
                  </div>
                </div>
              </div>

              {/* 2. Banner الخدمة والبرنامج */}
              <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border border-primary/20 p-5 sm:p-6 flex items-center gap-4">
                <div className={`w-12 h-12 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center shrink-0 ${currentProgram?.color || "bg-primary"} text-white shadow-lg`}>
                  <IconComponent className="w-7 h-7" />
                </div>
                <div className="min-w-0">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-primary/10 text-primary text-[11px] font-bold mb-1">
                    <Sparkles className="w-3 h-3" />
                    <span>برنامج {currentProgram?.name || serviceId}</span>
                  </div>
                  <h3 className="text-base sm:text-lg font-bold text-foreground truncate">
                    استمارة طلب خدمة {currentProgram?.name || serviceId}
                  </h3>
                  <p className="text-xs text-muted-foreground line-clamp-1">
                    {currentProgram?.description || "يرجى تعبئة الحقول والبيانات المطلوبة لتقديم طلب الخدمة"}
                  </p>
                </div>
              </div>

              {/* 3. كرت الحقول الديناميكية الواقعي */}
              <div className="text-card-foreground flex flex-col gap-6 p-5 sm:p-8 lg:p-10 shadow-xl border border-border/60 rounded-3xl bg-background overflow-hidden">
                <div className="space-y-6 sm:space-y-8">
                  <div className={`grid ${previewDevice === "mobile" ? "grid-cols-1" : "grid-cols-1 sm:grid-cols-2"} gap-5 sm:gap-6`}>
                    {fields
                      .filter((f) => f.isActive)
                      .filter((field) => {
                        // إخفاء الحقول المشروطة في المعاينة التفاعلية حتى يختار المستخدم "نعم"
                        if (["landOwnership", "landArea", "landProposal"].includes(field.id)) {
                          return previewValues["hasLand"] === "yes";
                        }
                        if (field.id === "donationAmount") {
                          return previewValues["hasDonor"] === "yes";
                        }
                        return true;
                      })
                      .map((field) => {
                        const isFullWidth =
                          field.type === "textarea" ||
                          field.type === "radio" ||
                          field.type === "file" ||
                          field.id === "mosqueId" ||
                          field.id === "workDescription" ||
                          field.id === "fundingProposal" ||
                          field.id === "willingToVolunteer" ||
                          field.id === "hasLand" ||
                          field.id === "hasDonor" ||
                          field.id === "hasDonorForMaintenance";

                        const Icon = getFieldIcon(field.id);
                        const unitSuffix = getUnitSuffix(field.id);
                        const value = previewValues[field.id];

                        return (
                          <React.Fragment key={field.id}>
                            <div
                              className={isFullWidth && previewDevice !== "mobile" ? "col-span-1 sm:col-span-2" : "col-span-1"}
                            >
                              <div className="space-y-2">
                                <Label className="select-none flex items-center gap-1.5 text-xs sm:text-sm font-bold text-foreground">
                                  {Icon && <Icon className="w-4 h-4 text-primary/75 shrink-0" />}
                                  <span>{field.label}</span>
                                  {field.required && <span className="text-red-500 font-bold">*</span>}
                                </Label>

                                {/* أنواع الحقول المختلفة بتصميم مطابق تماماً للأصل */}
                                {field.type === "textarea" && (
                                  <div className="space-y-1">
                                    <Textarea
                                      value={value || ""}
                                      onChange={(e) =>
                                        setPreviewValues((prev) => ({ ...prev, [field.id]: e.target.value }))
                                      }
                                      placeholder={field.placeholder || "اكتب التفاصيل المطلوبة هنا..."}
                                      rows={4}
                                      className="placeholder:text-muted-foreground min-h-[110px] rounded-xl text-xs sm:text-sm bg-background border-border/80 hover:border-border focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20 transition-all leading-relaxed p-3.5"
                                    />
                                    {field.helpText && (
                                      <p className="text-[11px] sm:text-xs text-muted-foreground leading-relaxed">
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
                                      className={`h-11 rounded-xl text-xs sm:text-sm bg-background border-border/80 hover:border-border focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20 transition-all ${
                                        unitSuffix ? "pl-12" : ""
                                      }`}
                                    />
                                    {unitSuffix && (
                                      <span className="absolute left-3 text-xs font-semibold text-muted-foreground bg-muted/60 px-2 py-0.5 rounded-md select-none pointer-events-none">
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
                                    className="h-11 rounded-xl text-xs sm:text-sm bg-background border-border/80"
                                  />
                                )}

                                {field.type === "select" && (
                                  <Select
                                    value={value || ""}
                                    onValueChange={(val) =>
                                      setPreviewValues((prev) => ({ ...prev, [field.id]: val }))
                                    }
                                  >
                                    <SelectTrigger className="w-full h-11 rounded-xl text-xs sm:text-sm bg-background border-border/80 hover:border-border focus-visible:border-primary">
                                      <SelectValue placeholder={field.placeholder || "اختر من القائمة..."} />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-xl border-border shadow-lg">
                                      {field.options && field.options.length > 0 ? (
                                        field.options.map((opt) => (
                                          <SelectItem key={opt.value} value={opt.value} className="text-xs sm:text-sm font-medium">
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
                                  <div className="space-y-3">
                                    <RadioGroup
                                      value={value || ""}
                                      onValueChange={(val) =>
                                        setPreviewValues((prev) => ({ ...prev, [field.id]: val }))
                                      }
                                      className={`grid ${
                                        field.options && field.options.length > 2
                                          ? "grid-cols-1 sm:grid-cols-3"
                                          : "grid-cols-2"
                                      } gap-3`}
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
                                            className={`relative flex items-center justify-between p-3.5 sm:p-4 rounded-2xl border-2 cursor-pointer transition-all duration-200 select-none ${
                                              isSelected
                                                ? isYes
                                                  ? "border-emerald-600 bg-emerald-50/70 dark:bg-emerald-950/30 text-emerald-900 dark:text-emerald-200 shadow-xs ring-2 ring-emerald-500/20"
                                                  : isNo
                                                  ? "border-rose-500 bg-rose-50/70 dark:bg-rose-950/30 text-rose-900 dark:text-rose-200 shadow-xs ring-2 ring-rose-500/20"
                                                  : "border-primary bg-primary/10 text-primary shadow-xs ring-2 ring-primary/20"
                                                : "border-border/60 bg-background hover:bg-muted/40 hover:border-border text-foreground"
                                            }`}
                                          >
                                            <div className="flex items-center gap-3">
                                              <RadioGroupItem
                                                value={option.value}
                                                id={`preview-${field.id}-${option.value}`}
                                                className="border-muted-foreground/40 text-primary"
                                              />
                                              <span className="font-bold text-xs sm:text-sm">
                                                {option.label}
                                              </span>
                                            </div>
                                            {isSelected && (
                                              <div
                                                className={`w-5 h-5 rounded-full flex items-center justify-center text-white text-xs ${
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
                                    className={`flex items-center gap-3 p-3.5 rounded-2xl border cursor-pointer select-none transition-all ${
                                      value
                                        ? "border-primary bg-primary/5 text-primary font-bold shadow-2xs ring-2 ring-primary/20"
                                        : "border-border/80 bg-background text-foreground"
                                    }`}
                                  >
                                    <Checkbox checked={!!value} className="h-4 w-4 rounded-md" />
                                    <span className="text-xs sm:text-sm">{field.placeholder || field.label}</span>
                                  </div>
                                )}

                                {field.type === "file" && (
                                  <div className="p-6 sm:p-8 border-2 border-dashed border-border/80 hover:border-primary hover:bg-primary/5 transition-all rounded-2xl cursor-pointer text-center group">
                                    <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
                                      <CloudUpload className="w-6 h-6" />
                                    </div>
                                    <p className="font-bold text-xs sm:text-sm text-foreground">
                                      اضغط لرفع ملف أو اسحبه إلى هنا
                                    </p>
                                    <p className="text-[11px] text-muted-foreground mt-1">
                                      يدعم ملفات PDF، الصور، ومستندات Word (الحد الأقصى 10 ميجابايت)
                                    </p>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* في خدمة بنيان: يظهر قسم مصلى النساء بعد حقل actualWorshippers مباشرة بكامل عرض الشبكة */}
                            {serviceId === "bunyan" && field.id === "actualWorshippers" && (
                              <div className="col-span-1 sm:col-span-2 space-y-4">
                                <div
                                  onClick={() => setPreviewHasPrayerHall(!previewHasPrayerHall)}
                                  className={`p-4 sm:p-5 rounded-2xl border-2 transition-all cursor-pointer flex items-center justify-between gap-4 select-none ${
                                    previewHasPrayerHall
                                      ? "border-primary bg-primary/5 dark:bg-primary/10 shadow-xs ring-2 ring-primary/20"
                                      : "border-border/60 bg-muted/20 hover:bg-muted/40"
                                  }`}
                                >
                                  <div className="flex items-center gap-3">
                                    <div
                                      className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${
                                        previewHasPrayerHall ? "bg-primary text-white" : "bg-muted text-muted-foreground"
                                      }`}
                                    >
                                      <Building2 className="w-5 h-5" />
                                    </div>
                                    <div>
                                      <p className="font-bold text-xs sm:text-sm text-foreground">
                                        هل يتضمن المشروع مصلى للنساء؟
                                      </p>
                                      <p className="text-[11px] text-muted-foreground mt-0.5">
                                        حدد إذا المسجد يشمل قسماً مخصصاً لمصلى النساء
                                      </p>
                                    </div>
                                  </div>
                                  <Checkbox
                                    id="hasPrayerHall"
                                    checked={previewHasPrayerHall}
                                    className="h-5 w-5 rounded-md data-[state=checked]:bg-primary"
                                  />
                                </div>

                                {previewHasPrayerHall && (
                                  <div className="p-4 sm:p-5 border border-primary/20 rounded-2xl bg-primary/5 space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
                                    <h4 className="font-bold text-xs sm:text-sm text-primary flex items-center gap-2 border-b border-primary/10 pb-2.5">
                                      <Building2 className="w-4 h-4" />
                                      بيانات مصلى النساء
                                    </h4>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                      <div className="space-y-2">
                                        <label htmlFor="previewWomenCapacity" className="text-xs sm:text-sm font-bold text-foreground flex items-center gap-1.5">
                                          <Users className="w-4 h-4 text-primary/70" />
                                          <span>سعة مصلى النساء (مصلي)</span>
                                          <span className="text-red-500 font-bold">*</span>
                                        </label>
                                        <Input
                                          id="previewWomenCapacity"
                                          type="number"
                                          value={previewWomenCapacity}
                                          onChange={(e) => setPreviewWomenCapacity(e.target.value)}
                                          placeholder="مثال: 50"
                                          className="h-11 rounded-xl text-xs sm:text-sm bg-background border-border/80"
                                        />
                                      </div>
                                      <div className="space-y-2">
                                        <label htmlFor="previewWomenArea" className="text-xs sm:text-sm font-bold text-foreground flex items-center gap-1.5">
                                          <Ruler className="w-4 h-4 text-primary/70" />
                                          <span>المساحة (م²)</span>
                                          <span className="text-red-500 font-bold">*</span>
                                        </label>
                                        <Input
                                          id="previewWomenArea"
                                          type="number"
                                          value={previewWomenArea}
                                          onChange={(e) => setPreviewWomenArea(e.target.value)}
                                          placeholder="مثال: 50"
                                          className="h-11 rounded-xl text-xs sm:text-sm bg-background border-border/80"
                                        />
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                          </React.Fragment>
                        );
                      })}

                    {/* حقل المرفقات العام إن لم يكن مضافاً كحقل مخصص */}
                    {!fields.some((f) => f.id === "attachment" && f.isActive) && (
                      <div className="col-span-1 sm:col-span-2 pt-4 border-t border-border/60">
                        <Label className="flex items-center gap-2 text-xs sm:text-sm font-bold mb-3 text-foreground">
                          <Paperclip className="w-4 h-4 text-primary" />
                          <span>المرفقات والوثائق الداعمة (اختياري)</span>
                        </Label>
                        <div className="p-6 sm:p-8 border-2 border-dashed border-border/80 hover:border-primary hover:bg-primary/5 transition-all rounded-2xl cursor-pointer text-center group">
                          <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
                            <CloudUpload className="w-6 h-6" />
                          </div>
                          <p className="font-bold text-xs sm:text-sm text-foreground">
                            اضغط لرفع ملف أو اسحبه إلى هنا
                          </p>
                          <p className="text-[11px] text-muted-foreground mt-1">
                            يدعم ملفات PDF، الصور، ومستندات Word (الحد الأقصى 10 ميجابايت)
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* أزرار التنقل السفلية للنموذج */}
                <div className="flex flex-row items-center justify-between gap-3 mt-8 pt-6 border-t border-border/60">
                  <Button
                    type="button"
                    variant="outline"
                    className="rounded-2xl font-bold h-11 sm:h-12 px-4 sm:px-6 gap-2 text-xs sm:text-sm"
                  >
                    <ChevronRight className="w-4 h-4" />
                    <span>السابق</span>
                  </Button>
                  <Button
                    type="button"
                    className="rounded-2xl font-bold h-11 sm:h-12 px-6 sm:px-8 gap-2 text-xs sm:text-sm bg-primary text-primary-foreground shadow-md hover:opacity-95"
                  >
                    <span>التالي</span>
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* شريط السحب السفلي لهواتف iPhone (Home Indicator) */}
              {previewDevice === "mobile" && (
                <div className="w-32 h-1 bg-foreground/20 rounded-full mx-auto mt-4 mb-1" />
              )}
            </div>
          </div>

          {/* تذييل نافذة المعاينة الصلب والأنيق */}
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
              className="text-xs rounded-xl"
            >
              إلغاء
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              disabled={resetMutation.isPending}
              onClick={() => resetMutation.mutate({ serviceId })}
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

