import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Plus, Edit2, Trash2, ChevronRight, FolderOpen, Tag, ArrowRight, Search, Settings2 } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import DashboardLayout from "@/components/DashboardLayout";
import { Badge } from "@/components/ui/badge";

interface Category {
  id: number;
  name: string;
  nameAr: string;
  type: string;
  sortOrder: number | null;
  isActive: boolean | null;
}

// تعريف أسماء التصنيفات بالعربية
const categoryTypeNames: Record<string, string> = {
  city: "المدن",
  nationality: "الجنسيات",
  work_field: "مجالات العمل",
  unit: "الوحدات",
  boq_unit: "وحدات جدول الكميات (BOQ)",
  item_category: "فئات البنود",
  item_type: "أنواع البنود",
  bank: "البنوك",
  entity_type: "أنواع الكيانات",
};

export default function CategoriesManagement() {
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [isAddCategoryOpen, setIsAddCategoryOpen] = useState(false);
  const [isAddValueOpen, setIsAddValueOpen] = useState(false);
  const [isEditValueOpen, setIsEditValueOpen] = useState(false);
  const [editingValue, setEditingValue] = useState<Category | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  // Form states
  const [categoryForm, setCategoryForm] = useState({
    name: "",
    nameAr: "",
    type: "",
  });

  const [valueForm, setValueForm] = useState({
    name: "",
    nameAr: "",
  });

  // Queries
  const { data: allCategories = [], refetch: refetchCategories } = trpc.categories.getAllCategories.useQuery();

  // تجميع التصنيفات حسب النوع
  const groupedCategories = useMemo(() => {
    const groups: Record<string, Category[]> = {};
    allCategories.forEach((cat: Category) => {
      if (!groups[cat.type]) {
        groups[cat.type] = [];
      }
      groups[cat.type].push(cat);
    });
    return groups;
  }, [allCategories]);

  // الحصول على أنواع التصنيفات الفريدة
  const categoryTypes = useMemo(() => {
    return Object.keys(groupedCategories).sort();
  }, [groupedCategories]);

  // الحصول على قيم التصنيف المحدد
  const selectedCategoryValues = useMemo(() => {
    if (!selectedType) return [];
    return groupedCategories[selectedType] || [];
  }, [selectedType, groupedCategories]);

  // Mutations
  const createCategoryMutation = trpc.categories.createCategory.useMutation({
    onSuccess: () => {
      toast.success("تم إنشاء التصنيف بنجاح");
      setCategoryForm({ name: "", nameAr: "", type: "" });
      setIsAddCategoryOpen(false);
      refetchCategories();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const updateCategoryMutation = trpc.categories.updateCategory.useMutation({
    onSuccess: () => {
      toast.success("تم تحديث القيمة بنجاح");
      setIsEditValueOpen(false);
      setEditingValue(null);
      refetchCategories();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const deleteCategoryMutation = trpc.categories.deleteCategory.useMutation({
    onSuccess: () => {
      toast.success("تم حذف القيمة بنجاح");
      refetchCategories();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleAddCategory = () => {
    if (!categoryForm.type) {
      toast.error("يرجى اختيار نوع التصنيف");
      return;
    }
    createCategoryMutation.mutate(categoryForm);
  };

  const handleAddValue = () => {
    if (!valueForm.name || !valueForm.nameAr || !selectedType) {
      toast.error("جميع الحقول مطلوبة");
      return;
    }
    createCategoryMutation.mutate({
      name: valueForm.name,
      nameAr: valueForm.nameAr,
      type: selectedType,
    });
    setValueForm({ name: "", nameAr: "" });
    setIsAddValueOpen(false);
  };

  const handleUpdateValue = () => {
    if (!editingValue) return;
    updateCategoryMutation.mutate({
      id: editingValue.id,
      name: valueForm.name,
      nameAr: valueForm.nameAr,
      type: editingValue.type,
    });
  };

  const openEditValue = (value: Category) => {
    setEditingValue(value);
    setValueForm({
      name: value.name,
      nameAr: value.nameAr,
    });
    setIsEditValueOpen(true);
  };

  // Filter values based on search
  const filteredValues = selectedCategoryValues.filter((val: Category) =>
    val.nameAr.toLowerCase().includes(searchTerm.toLowerCase()) ||
    val.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Filter types based on search when no type is selected
  const filteredTypes = categoryTypes.filter((type) =>
    (categoryTypeNames[type] || type).toLowerCase().includes(searchTerm.toLowerCase()) ||
    type.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">إدارة التصنيفات</h1>
            <p className="text-gray-600 mt-1">إدارة التصنيفات العامة للنظام (مدن، جنسيات، مجالات عمل، وحدات، فئات، بنود)</p>
          </div>
          <Dialog open={isAddCategoryOpen} onOpenChange={setIsAddCategoryOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2 bg-emerald-600 hover:bg-emerald-700">
                <Plus className="w-4 h-4" />
                إضافة تصنيف جديد
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>إضافة نوع تصنيف جديد</DialogTitle>
                <DialogDescription>أدخل بيانات نوع التصنيف الجديد (مثل: مدن، جنسيات، إلخ)</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div>
                  <label className="block text-sm font-medium mb-2">الاسم بالعربية *</label>
                  <Input
                    placeholder="مثال: المدن"
                    value={categoryForm.nameAr}
                    onChange={(e) => setCategoryForm({ ...categoryForm, nameAr: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">الاسم بالإنجليزية *</label>
                  <Input
                    placeholder="مثال: cities"
                    value={categoryForm.name}
                    onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">المعرّف (النوع) *</label>
                  <Input
                    placeholder="مثال: city"
                    value={categoryForm.type}
                    onChange={(e) => setCategoryForm({ ...categoryForm, type: e.target.value })}
                  />
                  <p className="text-xs text-gray-500 mt-1">يستخدم للربط البرمجي (بدون مسافات)</p>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddCategoryOpen(false)}>إلغاء</Button>
                <Button onClick={handleAddCategory} disabled={createCategoryMutation.isPending}>
                  {createCategoryMutation.isPending ? "جاري الإضافة..." : "إضافة"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder={selectedType ? "بحث في القيم..." : "بحث في التصنيفات..."}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pr-10"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Categories Types List */}
          <div className="lg:col-span-1">
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <FolderOpen className="w-5 h-5 text-emerald-600" />
                  أنواع التصنيفات
                </CardTitle>
                <CardDescription>اختر نوع التصنيف لعرض قيمه</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y max-h-[500px] overflow-y-auto">
                  {filteredTypes.length === 0 ? (
                    <div className="p-6 text-center text-gray-500">
                      <FolderOpen className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                      <p>لا توجد تصنيفات</p>
                    </div>
                  ) : (
                    filteredTypes.map((type) => (
                      <div
                        key={type}
                        className={`flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 transition-colors ${
                          selectedType === type ? "bg-emerald-50 border-r-4 border-emerald-600" : ""
                        }`}
                        onClick={() => {
                          setSelectedType(type);
                          setSearchTerm("");
                        }}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                            selectedType === type ? "bg-emerald-100" : "bg-gray-100"
                          }`}>
                            <Tag className={`w-5 h-5 ${
                              selectedType === type ? "text-emerald-600" : "text-gray-500"
                            }`} />
                          </div>
                          <div>
                            <h3 className="font-medium text-gray-900">{categoryTypeNames[type] || type}</h3>
                            <p className="text-sm text-gray-500">{groupedCategories[type]?.length || 0} قيمة</p>
                          </div>
                        </div>
                        <ChevronRight className={`w-5 h-5 transition-transform ${
                          selectedType === type ? "text-emerald-600 rotate-180" : "text-gray-400"
                        }`} />
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Category Values */}
          <div className="lg:col-span-2">
            {selectedType ? (
              <Card className="border-0 shadow-sm">
                <CardHeader className="border-b">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Settings2 className="w-5 h-5 text-emerald-600" />
                        {categoryTypeNames[selectedType] || selectedType}
                      </CardTitle>
                      <CardDescription className="mt-1">
                        المعرّف: <Badge variant="secondary">{selectedType}</Badge>
                        <span className="mx-2">•</span>
                        {filteredValues.length} قيمة
                      </CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedType(null)}
                      >
                        رجوع
                      </Button>
                      <Dialog open={isAddValueOpen} onOpenChange={setIsAddValueOpen}>
                        <DialogTrigger asChild>
                          <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700">
                            <Plus className="w-4 h-4 ml-1" />
                            إضافة قيمة
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-md">
                          <DialogHeader>
                            <DialogTitle>إضافة قيمة جديدة</DialogTitle>
                            <DialogDescription>إضافة قيمة إلى {categoryTypeNames[selectedType] || selectedType}</DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4 py-4">
                            <div>
                              <label className="block text-sm font-medium mb-2">القيمة بالعربية *</label>
                              <Input
                                placeholder="مثال: الرياض"
                                value={valueForm.nameAr}
                                onChange={(e) => setValueForm({ ...valueForm, nameAr: e.target.value })}
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium mb-2">القيمة بالإنجليزية *</label>
                              <Input
                                placeholder="مثال: riyadh"
                                value={valueForm.name}
                                onChange={(e) => setValueForm({ ...valueForm, name: e.target.value })}
                              />
                            </div>
                          </div>
                          <DialogFooter>
                            <Button variant="outline" onClick={() => setIsAddValueOpen(false)}>إلغاء</Button>
                            <Button onClick={handleAddValue} disabled={createCategoryMutation.isPending}>
                              {createCategoryMutation.isPending ? "جاري الإضافة..." : "إضافة"}
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  {filteredValues.length === 0 ? (
                    <div className="p-12 text-center text-gray-500">
                      <Tag className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                      <p className="font-medium">لا توجد قيم لهذا التصنيف</p>
                      <p className="text-sm mt-1">أضف قيماً جديدة باستخدام زر "إضافة قيمة"</p>
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-right w-12">#</TableHead>
                          <TableHead className="text-right">القيمة بالعربية</TableHead>
                          <TableHead className="text-right">القيمة بالإنجليزية</TableHead>
                          <TableHead className="w-24 text-center">الإجراءات</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredValues.map((value: Category, index: number) => (
                          <TableRow key={value.id}>
                            <TableCell className="text-gray-500">{index + 1}</TableCell>
                            <TableCell className="font-medium">{value.nameAr}</TableCell>
                            <TableCell className="text-gray-600">{value.name}</TableCell>
                            <TableCell>
                              <div className="flex items-center justify-center gap-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => openEditValue(value)}
                                >
                                  <Edit2 className="w-4 h-4 text-blue-500" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    if (confirm("هل أنت متأكد من حذف هذه القيمة؟")) {
                                      deleteCategoryMutation.mutate({ id: value.id });
                                    }
                                  }}
                                  disabled={deleteCategoryMutation.isPending}
                                >
                                  <Trash2 className="w-4 h-4 text-red-500" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            ) : (
              <Card className="border-0 shadow-sm h-full">
                <CardContent className="flex flex-col items-center justify-center h-full min-h-[400px] text-center text-gray-500">
                  <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                    <ArrowRight className="w-10 h-10 text-gray-400" />
                  </div>
                  <h3 className="font-medium text-lg mb-2">اختر نوع تصنيف</h3>
                  <p className="text-sm">اختر نوع تصنيف من القائمة لعرض قيمه وإدارتها</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Edit Value Dialog */}
        <Dialog open={isEditValueOpen} onOpenChange={setIsEditValueOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>تعديل القيمة</DialogTitle>
              <DialogDescription>تعديل بيانات القيمة</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <label className="block text-sm font-medium mb-2">القيمة بالعربية *</label>
                <Input
                  value={valueForm.nameAr}
                  onChange={(e) => setValueForm({ ...valueForm, nameAr: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">القيمة بالإنجليزية *</label>
                <Input
                  value={valueForm.name}
                  onChange={(e) => setValueForm({ ...valueForm, name: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditValueOpen(false)}>إلغاء</Button>
              <Button onClick={handleUpdateValue} disabled={updateCategoryMutation.isPending}>
                {updateCategoryMutation.isPending ? "جاري الحفظ..." : "حفظ"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
