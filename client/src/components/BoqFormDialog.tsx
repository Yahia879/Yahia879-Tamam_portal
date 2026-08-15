import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Check, ChevronsUpDown, Loader2, Building2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface BoqFormDialogProps {
  requestId?: number;
  projectId?: number;
  mosqueId?: number;
  mosquesList?: Array<{ id: number; name: string; city?: string; district?: string }>;
  defaultMosqueId?: number;
  open: boolean;
  onClose: () => void;
  item?: any; // إذا كان موجوداً، يكون في وضع التعديل
}

export default function BoqFormDialog({
  requestId,
  projectId,
  mosqueId: propMosqueId,
  mosquesList,
  defaultMosqueId,
  open,
  onClose,
  item,
}: BoqFormDialogProps) {
  const isEditMode = !!item;
  const [unitPopoverOpen, setUnitPopoverOpen] = useState(false);
  const [unitSearch, setUnitSearch] = useState("");

  const [selectedMosqueId, setSelectedMosqueId] = useState<number | undefined>(
    item?.mosqueId || defaultMosqueId || propMosqueId || (mosquesList && mosquesList.length === 1 ? mosquesList[0].id : undefined)
  );

  const [formData, setFormData] = useState({
    category: "",
    itemName: "",
    description: "",
    unit: "",
    quantity: "",
    unitPrice: "",
  });

  // جلب التصنيفات من قاعدة البيانات
  const { data: allCategories = [] } = trpc.categories.getAllCategories.useQuery();
  const boqCategoryOptions = allCategories
    .filter((cat: any) => cat.type === "boq_category")
    .map((cat: any) => ({
      value: cat.name,
      label: cat.nameAr || cat.name,
    }));

  const boqUnitOptions = allCategories
    .filter((cat: any) => cat.type === "boq_unit")
    .map((cat: any) => ({
      value: cat.name,
      label: cat.nameAr || cat.name,
    }));

  // تعبئة البيانات في حالة التعديل
  useEffect(() => {
    if (item) {
      setFormData({
        category: item.category || "",
        itemName: item.itemName || "",
        description: item.itemDescription || item.description || "",
        unit: item.unit || "",
        quantity: item.quantity?.toString() || "",
        unitPrice: item.unitPrice?.toString() || "",
      });
      setSelectedMosqueId(item.mosqueId || defaultMosqueId || propMosqueId);
    } else {
      setFormData({ category: "", itemName: "", description: "", unit: "", quantity: "", unitPrice: "" });
      setSelectedMosqueId(defaultMosqueId || propMosqueId || (mosquesList && mosquesList.length === 1 ? mosquesList[0].id : undefined));
    }
  }, [item, open, defaultMosqueId, propMosqueId, mosquesList]);

  // فلترة الوحدات بناءً على البحث
  const filteredUnits = boqUnitOptions.filter((u: any) =>
    u.label.toLowerCase().includes(unitSearch.toLowerCase()) ||
    u.value.toLowerCase().includes(unitSearch.toLowerCase())
  );

  // إضافة بند
  const addItemMutation = trpc.projects.addBOQItem.useMutation({
    onSuccess: () => {
      toast.success("تم إضافة البند بنجاح");
      onClose();
    },
    onError: (error: any) => {
      toast.error(error.message || "حدث خطأ أثناء إضافة البند");
    },
  });

  // تعديل بند
  const updateItemMutation = trpc.projects.updateBOQItem.useMutation({
    onSuccess: () => {
      toast.success("تم تعديل البند بنجاح");
      onClose();
    },
    onError: (error: any) => {
      toast.error(error.message || "حدث خطأ أثناء تعديل البند");
    },
  });

  const handleSubmit = () => {
    if (mosquesList && mosquesList.length > 0 && !selectedMosqueId) {
      toast.error("يرجى تحديد المسجد التابع له هذا البند");
      return;
    }

    if (!formData.itemName || !formData.unit || !formData.quantity) {
      toast.error("يرجى ملء جميع الحقول المطلوبة");
      return;
    }

    const finalMosqueId = selectedMosqueId || propMosqueId || undefined;

    if (isEditMode) {
      updateItemMutation.mutate({
        id: item.id,
        mosqueId: finalMosqueId,
        category: formData.category,
        itemName: formData.itemName,
        itemDescription: formData.description,
        unit: formData.unit,
        quantity: parseFloat(formData.quantity),
        unitPrice: parseFloat(formData.unitPrice || "0"),
      });
    } else {
      addItemMutation.mutate({
        requestId: requestId || undefined,
        projectId: projectId || undefined,
        mosqueId: finalMosqueId,
        itemName: formData.itemName,
        itemDescription: formData.description,
        unit: formData.unit,
        quantity: parseFloat(formData.quantity),
        unitPrice: parseFloat(formData.unitPrice || "0"),
        category: formData.category,
      });
    }
  };

  const isLoading = addItemMutation.isPending || updateItemMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[640px]" dir="rtl">
        <DialogHeader className="text-right">
          <DialogTitle>
            {isEditMode ? "تعديل بند في جدول الكميات" : "إضافة بند جديد لجدول الكميات"}
          </DialogTitle>
          <DialogDescription>
            {isEditMode
              ? "قم بتعديل تفاصيل البند في جدول الكميات"
              : "أضف بنداً جديداً إلى جدول الكميات المرتبط بهذا الطلب"}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4 text-right">
          {/* اختيار المسجد للمشاريع متعددة المساجد */}
          {mosquesList && mosquesList.length > 0 && (
            <div className="grid gap-2">
              <Label htmlFor="mosqueId" className="flex items-center gap-1.5 font-bold text-slate-800 dark:text-slate-200">
                <Building2 className="w-4 h-4 text-teal-600" />
                <span>المسجد <span className="text-red-500">*</span></span>
              </Label>
              <Select
                value={selectedMosqueId ? String(selectedMosqueId) : ""}
                onValueChange={(value) => setSelectedMosqueId(parseInt(value, 10))}
              >
                <SelectTrigger id="mosqueId" className="bg-background">
                  <SelectValue placeholder="اختر المسجد التابع له هذا البند" />
                </SelectTrigger>
                <SelectContent dir="rtl">
                  {mosquesList.map((m) => (
                    <SelectItem key={m.id} value={String(m.id)}>
                      {m.name} {m.city ? `(${m.city})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* التصنيف */}
          <div className="grid gap-2">
            <Label htmlFor="category">التصنيف</Label>
            <Select
              value={formData.category}
              onValueChange={(value) => setFormData({ ...formData, category: value })}
            >
              <SelectTrigger className="bg-background">
                <SelectValue placeholder="اختر التصنيف" />
              </SelectTrigger>
              <SelectContent dir="rtl">
                {boqCategoryOptions.map((cat) => (
                  <SelectItem key={cat.value} value={cat.value}>
                    {cat.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* اسم البند */}
          <div className="grid gap-2">
            <Label htmlFor="itemName">
              اسم البند <span className="text-red-500">*</span>
            </Label>
            <Input
              id="itemName"
              value={formData.itemName}
              onChange={(e) =>
                setFormData({ ...formData, itemName: e.target.value })
              }
              placeholder="مثال: أعمال صيانة وسباكة"
              className="bg-background"
            />
          </div>

          {/* الوصف */}
          <div className="grid gap-2">
            <Label htmlFor="description">الوصف</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              placeholder="وصف تفصيلي للبند (اختياري)"
              rows={2}
              className="bg-background"
            />
          </div>

          {/* الوحدة والكمية في صف واحد */}
          <div className="grid grid-cols-2 gap-4">
            {/* الوحدة - Combobox مع إمكانية الكتابة اليدوية */}
            <div className="grid gap-2">
              <Label>
                الوحدة <span className="text-red-500">*</span>
              </Label>
              <Popover open={unitPopoverOpen} onOpenChange={setUnitPopoverOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={unitPopoverOpen}
                    className="justify-between font-normal bg-background"
                  >
                    {formData.unit || "اختر أو اكتب الوحدة"}
                    <ChevronsUpDown className="mr-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[200px] p-0" align="start">
                  <Command>
                    <CommandInput
                      placeholder="بحث أو كتابة وحدة..."
                      value={unitSearch}
                      onValueChange={setUnitSearch}
                    />
                    <CommandList>
                      <CommandEmpty>
                        <div className="p-2">
                          <p className="text-sm text-muted-foreground mb-2">لا توجد وحدة بهذا الاسم</p>
                          {unitSearch && (
                            <Button
                              size="sm"
                              className="w-full"
                              onClick={() => {
                                setFormData({ ...formData, unit: unitSearch });
                                setUnitSearch("");
                                setUnitPopoverOpen(false);
                              }}
                            >
                              استخدام "{unitSearch}"
                            </Button>
                          )}
                        </div>
                      </CommandEmpty>
                      <CommandGroup>
                        {filteredUnits.map((u: any) => (
                          <CommandItem
                            key={u.value}
                            value={u.label}
                            onSelect={(currentValue) => {
                              setFormData({ ...formData, unit: currentValue });
                              setUnitSearch("");
                              setUnitPopoverOpen(false);
                            }}
                          >
                            <Check
                              className={cn(
                                "ml-2 h-4 w-4",
                                formData.unit === u.label ? "opacity-100" : "opacity-0"
                              )}
                            />
                            {u.label}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="quantity">
                الكمية <span className="text-red-500">*</span>
              </Label>
              <Input
                id="quantity"
                type="number"
                step="0.01"
                value={formData.quantity}
                onChange={(e) =>
                  setFormData({ ...formData, quantity: e.target.value })
                }
                placeholder="0"
                className="bg-background"
              />
            </div>
          </div>

          {/* سعر الوحدة */}
          <div className="grid gap-2">
            <Label htmlFor="unitPrice">سعر الوحدة (ريال)</Label>
            <Input
              id="unitPrice"
              type="number"
              step="0.01"
              value={formData.unitPrice}
              onChange={(e) =>
                setFormData({ ...formData, unitPrice: e.target.value })
              }
              placeholder="0.00"
              className="bg-background"
            />
          </div>

          {/* عرض الإجمالي */}
          {formData.quantity && formData.unitPrice && (
            <div className="bg-teal-50 dark:bg-teal-950/40 p-4 rounded-lg border border-teal-200 dark:border-teal-800">
              <p className="text-xs text-muted-foreground mb-1">إجمالي البند التقديري</p>
              <p className="text-xl font-bold text-teal-600 dark:text-teal-400">
                {(
                  parseFloat(formData.quantity) *
                  parseFloat(formData.unitPrice)
                ).toLocaleString("ar-SA")}{" "}
                ريال
              </p>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            إلغاء
          </Button>
          <Button onClick={handleSubmit} disabled={isLoading} className="bg-teal-600 hover:bg-teal-700 text-white font-bold">
            {isLoading && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
            {isEditMode ? "حفظ التعديلات" : "إضافة البند"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
