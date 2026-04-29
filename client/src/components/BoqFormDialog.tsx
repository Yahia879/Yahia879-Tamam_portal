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
import { Check, ChevronsUpDown, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface BoqFormDialogProps {
  requestId: number;
  open: boolean;
  onClose: () => void;
  item?: any; // إذا كان موجوداً، يكون في وضع التعديل
}

const ITEM_CATEGORIES = [
  { value: "construction", label: "أعمال إنشائية" },
  { value: "electrical", label: "أعمال كهربائية" },
  { value: "plumbing", label: "أعمال سباكة" },
  { value: "hvac", label: "تكييف وتبريد" },
  { value: "finishing", label: "تشطيبات" },
  { value: "carpentry", label: "نجارة" },
  { value: "painting", label: "دهانات" },
  { value: "flooring", label: "أرضيات" },
  { value: "other", label: "أخرى" },
];

export default function BoqFormDialog({
  requestId,
  open,
  onClose,
  item,
}: BoqFormDialogProps) {
  const isEditMode = !!item;
  const [unitPopoverOpen, setUnitPopoverOpen] = useState(false);
  const [unitSearch, setUnitSearch] = useState("");

  const [formData, setFormData] = useState({
    category: "",
    itemName: "",
    description: "",
    unit: "",
    quantity: "",
    unitPrice: "",
  });

  // جلب الوحدات من قاعدة البيانات
  const { data: boqUnits = [] } = trpc.categories.getBoqUnits.useQuery();

  // تعبئة البيانات في حالة التعديل
  useEffect(() => {
    if (item) {
      setFormData({
        category: item.category || "",
        itemName: item.itemName || "",
        description: item.description || "",
        unit: item.unit || "",
        quantity: item.quantity?.toString() || "",
        unitPrice: item.unitPrice?.toString() || "",
      });
    } else {
      setFormData({ category: "", itemName: "", description: "", unit: "", quantity: "", unitPrice: "" });
    }
  }, [item, open]);

  // فلترة الوحدات بناءً على البحث
  const filteredUnits = boqUnits.filter((u: any) =>
    u.nameAr.toLowerCase().includes(unitSearch.toLowerCase()) ||
    u.name.toLowerCase().includes(unitSearch.toLowerCase())
  );

  // الوحدة المختارة
  const selectedUnit = boqUnits.find((u: any) => u.nameAr === formData.unit);

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
    if (!formData.itemName || !formData.unit || !formData.quantity) {
      toast.error("يرجى ملء جميع الحقول المطلوبة");
      return;
    }

    if (isEditMode) {
      updateItemMutation.mutate({
        id: item.id,
        category: formData.category,
        itemName: formData.itemName,
        itemDescription: formData.description,
        unit: formData.unit,
        quantity: parseFloat(formData.quantity),
        unitPrice: parseFloat(formData.unitPrice || "0"),
      });
    } else {
      addItemMutation.mutate({
        requestId,
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
      <DialogContent className="sm:max-w-[640px]">
        <DialogHeader>
          <DialogTitle>
            {isEditMode ? "تعديل بند في جدول الكميات" : "إضافة بند جديد"}
          </DialogTitle>
          <DialogDescription>
            {isEditMode
              ? "قم بتعديل تفاصيل البند في جدول الكميات"
              : "أضف بنداً جديداً إلى جدول الكميات المرتبط بهذا الطلب"}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {/* التصنيف */}
          <div className="grid gap-2">
            <Label htmlFor="category">التصنيف</Label>
            <Select
              value={formData.category}
              onValueChange={(value) => setFormData({ ...formData, category: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="اختر التصنيف" />
              </SelectTrigger>
              <SelectContent>
                {ITEM_CATEGORIES.map((cat) => (
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
              placeholder="مثال: أعمال حفر وردم"
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
                    className="justify-between font-normal"
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
                            key={u.id}
                            value={u.nameAr}
                            onSelect={(currentValue) => {
                              setFormData({ ...formData, unit: currentValue });
                              setUnitSearch("");
                              setUnitPopoverOpen(false);
                            }}
                          >
                            <Check
                              className={cn(
                                "ml-2 h-4 w-4",
                                formData.unit === u.nameAr ? "opacity-100" : "opacity-0"
                              )}
                            />
                            {u.nameAr}
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
            />
          </div>

          {/* عرض الإجمالي */}
          {formData.quantity && formData.unitPrice && (
            <div className="bg-teal-50 dark:bg-teal-950 p-4 rounded-lg border border-teal-200 dark:border-teal-800">
              <p className="text-sm text-muted-foreground">الإجمالي</p>
              <p className="text-2xl font-bold text-teal-600 dark:text-teal-400">
                {(
                  parseFloat(formData.quantity) *
                  parseFloat(formData.unitPrice)
                ).toLocaleString("ar-SA")}{" "}
                ريال
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            إلغاء
          </Button>
          <Button onClick={handleSubmit} disabled={isLoading}>
            {isLoading && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
            {isEditMode ? "حفظ التعديلات" : "إضافة البند"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
