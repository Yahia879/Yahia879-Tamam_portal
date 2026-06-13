import { useState, useMemo } from "react";
import { Link } from "wouter";
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
  boq_category: "تصنيفات جداول الكميات",
  bank: "البنوك",
  city: "المدن",
  boq_unit: "الوحدات",
};

import { useAuth } from "@/_core/hooks/useAuth";

export default function CategoriesManagement() {
  const { user } = useAuth();
  const isAdmin = ["super_admin", "system_admin"].includes(user?.role || "");
  const userPermissions = (user as any)?.permissions ?? [];
  const canAdd = isAdmin || userPermissions.includes("settings_categories.add");
  const canEdit = isAdmin || userPermissions.includes("settings_categories.edit");
  const canDelete = isAdmin || userPermissions.includes("settings_categories.delete");

  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [isAddValueOpen, setIsAddValueOpen] = useState(false);
  const [isEditValueOpen, setIsEditValueOpen] = useState(false);
  const [editingValue, setEditingValue] = useState<Category | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

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
  const categoryTypes = ["boq_category", "bank", "city", "boq_unit"];

  // الحصول على قيم التصنيف المحدد
  const selectedCategoryValues = useMemo(() => {
    if (!selectedType) return [];
    return groupedCategories[selectedType] || [];
  }, [selectedType, groupedCategories]);

  // Mutations
  const createCategoryMutation = trpc.categories.createCategory.useMutation({
    onSuccess: () => {
      toast.success("تم الإجراء بنجاح");
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

  const handleAddValue = () => {
    if (!valueForm.nameAr || !selectedType) {
      toast.error("جميع الحقول مطلوبة");
      return;
    }
    // Generate a unique English identifier for the database
    const randomSuffix = Math.random().toString(36).substring(2, 8);
    const generatedName = `${selectedType}_${Date.now()}_${randomSuffix}`;
    createCategoryMutation.mutate({
      name: generatedName,
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
      name: editingValue.name,
      nameAr: valueForm.nameAr,
      type: editingValue.type,
    });
  };

  const openAddValue = () => {
    setValueForm({
      name: "",
      nameAr: "",
    });
    setIsAddValueOpen(true);
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
          <div className="flex items-center gap-4">
            <Link href="/settings">
              <Button variant="ghost" size="icon" type="button">
                <ArrowRight className="w-5 h-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900">إدارة التصنيفات</h1>
              <p className="text-sm text-gray-500">إدارة المدن والجهات والبنوك والوحدات المستخدمة في البوابة</p>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="relative w-full sm:max-w-md">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder={selectedType ? "بحث في القيم..." : "بحث في التصنيفات..."}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pr-10 h-9 text-sm w-full"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          {/* Categories Types List */}
          <div className={`lg:col-span-1 ${selectedType ? "hidden lg:block" : "block"}`}>
            <Card className="border-0 shadow-sm">
              <CardHeader className="p-4 sm:p-6 pb-2 sm:pb-3">
                <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                  <FolderOpen className="w-5 h-5 text-emerald-600" />
                  أنواع التصنيفات
                </CardTitle>
                <CardDescription className="text-xs sm:text-sm">اختر نوع التصنيف لعرض قيمه</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y max-h-[400px] sm:max-h-[500px] overflow-y-auto">
                  {filteredTypes.length === 0 ? (
                    <div className="p-6 text-center text-gray-500">
                      <FolderOpen className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-3 text-gray-300" />
                      <p className="text-sm">لا توجد تصنيفات</p>
                    </div>
                  ) : (
                    filteredTypes.map((type) => (
                      <div
                        key={type}
                        className={`flex items-center justify-between p-3 sm:p-4 cursor-pointer hover:bg-gray-50 transition-colors ${
                          selectedType === type ? "bg-emerald-50 border-r-4 border-emerald-600" : ""
                        }`}
                        onClick={() => {
                          setSelectedType(type);
                          setSearchTerm("");
                        }}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center shrink-0 ${
                            selectedType === type ? "bg-emerald-100" : "bg-gray-100"
                          }`}>
                            <Tag className={`w-4 h-4 sm:w-5 sm:h-5 ${
                              selectedType === type ? "text-emerald-600" : "text-gray-500"
                            }`} />
                          </div>
                          <div className="min-w-0">
                            <h3 className="font-medium text-sm sm:text-base text-gray-900 truncate">{categoryTypeNames[type] || type}</h3>
                            <p className="text-[10px] sm:text-xs text-gray-500">{groupedCategories[type]?.length || 0} قيمة</p>
                          </div>
                        </div>
                        <ChevronRight className={`w-4 h-4 sm:w-5 sm:h-5 transition-transform shrink-0 ${
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
          <div className={`lg:col-span-2 ${!selectedType ? "hidden lg:block" : "block"}`}>
            {selectedType ? (
              <Card className="border-0 shadow-sm overflow-hidden">
                <CardHeader className="p-4 sm:p-6 border-b">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="min-w-0">
                      <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                        <Settings2 className="w-5 h-5 text-emerald-600 shrink-0" />
                        <span className="truncate">{categoryTypeNames[selectedType] || selectedType}</span>
                      </CardTitle>
                      <CardDescription className="mt-1 text-xs sm:text-sm flex flex-wrap items-center gap-x-2">
                        المعرّف: <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{selectedType}</Badge>
                        <span>•</span>
                        {filteredValues.length} قيمة
                      </CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedType(null)}
                        className="flex-1 sm:flex-none h-8 text-xs sm:text-sm"
                      >
                        رجوع
                      </Button>
                      {canAdd && (
                        <Button 
                          size="sm" 
                          onClick={openAddValue}
                          className="flex-1 sm:flex-none bg-emerald-600 hover:bg-emerald-700 h-8 text-xs sm:text-sm"
                        >
                          <Plus className="w-4 h-4 ml-1" />
                          إضافة قيمة
                        </Button>
                      )}
                      <Dialog open={isAddValueOpen} onOpenChange={setIsAddValueOpen}>
                        <DialogContent className="w-[95vw] max-w-md p-4 sm:p-6">
                          <DialogHeader>
                            <DialogTitle className="text-lg sm:text-xl">إضافة قيمة جديدة</DialogTitle>
                            <DialogDescription className="text-xs sm:text-sm">إضافة قيمة إلى {categoryTypeNames[selectedType] || selectedType}</DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4 py-4">
                            <div>
                              <label className="block text-sm font-medium mb-2">القيمة بالعربية *</label>
                              <Input
                                placeholder="مثال: الرياض"
                                value={valueForm.nameAr}
                                onChange={(e) => setValueForm({ ...valueForm, nameAr: e.target.value })}
                                className="h-9"
                              />
                            </div>
                          </div>
                          <DialogFooter className="flex flex-col sm:flex-row gap-2">
                            <Button variant="outline" onClick={() => setIsAddValueOpen(false)} className="w-full sm:w-auto h-9 text-sm">إلغاء</Button>
                            <Button onClick={handleAddValue} disabled={createCategoryMutation.isPending} className="w-full sm:w-auto h-9 text-sm">
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
                    <div className="p-8 sm:p-12 text-center text-gray-500">
                      <Tag className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-3 text-gray-300" />
                      <p className="font-medium text-sm sm:text-base">لا توجد قيم لهذا التصنيف</p>
                      <p className="text-xs sm:text-sm mt-1">أضف قيماً جديدة باستخدام زر "إضافة قيمة"</p>
                    </div>
                  ) : (
                    <>
                      {/* Desktop View Table */}
                      <div className="hidden md:block overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="text-right w-12">#</TableHead>
                              <TableHead className="text-right">القيمة بالعربية</TableHead>
                              <TableHead className="w-24 text-center">الإجراءات</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {filteredValues.map((value: Category, index: number) => (
                              <TableRow key={value.id}>
                                <TableCell className="text-gray-500">{index + 1}</TableCell>
                                <TableCell className="font-medium">{value.nameAr}</TableCell>
                                <TableCell>
                                  <div className="flex items-center justify-center gap-1">
                                    {canEdit && (
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => openEditValue(value)}
                                        className="h-8 w-8 p-0"
                                      >
                                        <Edit2 className="w-4 h-4 text-blue-500" />
                                      </Button>
                                    )}
                                    {canDelete && (
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => {
                                          if (confirm("هل أنت متأكد من حذف هذه القيمة؟")) {
                                            deleteCategoryMutation.mutate({ id: value.id });
                                          }
                                        }}
                                        disabled={deleteCategoryMutation.isPending}
                                        className="h-8 w-8 p-0"
                                      >
                                        <Trash2 className="w-4 h-4 text-red-500" />
                                      </Button>
                                    )}
                                  </div>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>

                      {/* Mobile View Cards */}
                      <div className="md:hidden divide-y">
                        {filteredValues.map((value: Category, index: number) => (
                          <div key={value.id} className="p-4 space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] text-gray-400 font-mono">#{index + 1}</span>
                              <div className="flex items-center gap-2">
                                {canEdit && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => openEditValue(value)}
                                    className="h-8 w-8 p-0"
                                  >
                                    <Edit2 className="w-4 h-4 text-blue-500" />
                                  </Button>
                                )}
                                {canDelete && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                      if (confirm("هل أنت متأكد من حذف هذه القيمة؟")) {
                                        deleteCategoryMutation.mutate({ id: value.id });
                                      }
                                    }}
                                    disabled={deleteCategoryMutation.isPending}
                                    className="h-8 w-8 p-0 border-red-100 hover:bg-red-50"
                                  >
                                    <Trash2 className="w-4 h-4 text-red-500" />
                                  </Button>
                                )}
                              </div>
                            </div>
                            <div>
                              <p className="text-[10px] text-gray-500 mb-0.5">بالعربية</p>
                              <p className="text-sm font-bold">{value.nameAr}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            ) : (
              <Card className="border-0 shadow-sm h-full">
                <CardContent className="flex flex-col items-center justify-center h-full min-h-[300px] sm:min-h-[400px] text-center text-gray-500 p-6">
                  <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                    <ArrowRight className="w-8 h-8 sm:w-10 sm:h-10 text-gray-400" />
                  </div>
                  <h3 className="font-medium text-base sm:text-lg mb-2">اختر نوع تصنيف</h3>
                  <p className="text-xs sm:text-sm">اختر نوع تصنيف من القائمة لعرض قيمه وإدارتها</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Edit Value Dialog */}
        <Dialog open={isEditValueOpen} onOpenChange={setIsEditValueOpen}>
          <DialogContent className="w-[95vw] max-w-md p-4 sm:p-6">
            <DialogHeader>
              <DialogTitle className="text-lg sm:text-xl">تعديل القيمة</DialogTitle>
              <DialogDescription className="text-xs sm:text-sm">تعديل بيانات القيمة</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <label className="block text-sm font-medium mb-2">القيمة بالعربية *</label>
                <Input
                  value={valueForm.nameAr}
                  onChange={(e) => setValueForm({ ...valueForm, nameAr: e.target.value })}
                  className="h-9"
                />
              </div>
            </div>
            <DialogFooter className="flex flex-col sm:flex-row gap-2">
              <Button variant="outline" onClick={() => setIsEditValueOpen(false)} className="w-full sm:w-auto h-9 text-sm">إلغاء</Button>
              <Button onClick={handleUpdateValue} disabled={updateCategoryMutation.isPending} className="w-full sm:w-auto h-9 text-sm">
                {updateCategoryMutation.isPending ? "جاري الحفظ..." : "حفظ"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
