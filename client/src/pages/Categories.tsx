import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Plus, Trash2, Edit, Tag } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// التصنيفات الافتراضية
const DEFAULT_UNITS = [
  { id: 1, name: "متر", code: "m" },
  { id: 2, name: "كيلو", code: "kg" },
  { id: 3, name: "عدد", code: "pcs" },
  { id: 4, name: "لتر", code: "l" },
  { id: 5, name: "ساعة", code: "h" },
  { id: 6, name: "يوم", code: "day" },
];

const DEFAULT_CATEGORIES = [
  { id: 1, name: "أعمال إنشائية", code: "construction" },
  { id: 2, name: "أعمال كهربائية", code: "electrical" },
  { id: 3, name: "أعمال سباكة", code: "plumbing" },
  { id: 4, name: "تجهيزات", code: "equipment" },
  { id: 5, name: "مواد", code: "materials" },
];

const DEFAULT_ITEM_CATEGORIES = [
  { id: 1, name: "مواد خام", code: "raw_materials" },
  { id: 2, name: "عمالة", code: "labor" },
  { id: 3, name: "معدات", code: "equipment_items" },
  { id: 4, name: "خدمات", code: "services" },
];

export default function Categories() {
  const [units, setUnits] = useState(DEFAULT_UNITS);
  const [categories, setCategories] = useState(DEFAULT_CATEGORIES);
  const [itemCategories, setItemCategories] = useState(DEFAULT_ITEM_CATEGORIES);
  
  const [showAddUnitDialog, setShowAddUnitDialog] = useState(false);
  const [showAddCategoryDialog, setShowAddCategoryDialog] = useState(false);
  const [showAddItemCategoryDialog, setShowAddItemCategoryDialog] = useState(false);
  
  const [newUnit, setNewUnit] = useState({ name: "", code: "" });
  const [newCategory, setNewCategory] = useState({ name: "", code: "" });
  const [newItemCategory, setNewItemCategory] = useState({ name: "", code: "" });

  // إضافة وحدة جديدة
  const handleAddUnit = () => {
    if (!newUnit.name || !newUnit.code) {
      toast.error("يرجى ملء جميع الحقول");
      return;
    }
    const unit = {
      id: Math.max(...units.map(u => u.id), 0) + 1,
      name: newUnit.name,
      code: newUnit.code,
    };
    setUnits([...units, unit]);
    setNewUnit({ name: "", code: "" });
    setShowAddUnitDialog(false);
    toast.success("تم إضافة الوحدة بنجاح");
  };

  // إضافة فئة جديدة
  const handleAddCategory = () => {
    if (!newCategory.name || !newCategory.code) {
      toast.error("يرجى ملء جميع الحقول");
      return;
    }
    const category = {
      id: Math.max(...categories.map(c => c.id), 0) + 1,
      name: newCategory.name,
      code: newCategory.code,
    };
    setCategories([...categories, category]);
    setNewCategory({ name: "", code: "" });
    setShowAddCategoryDialog(false);
    toast.success("تم إضافة الفئة بنجاح");
  };

  // إضافة تصنيف بند جديد
  const handleAddItemCategory = () => {
    if (!newItemCategory.name || !newItemCategory.code) {
      toast.error("يرجى ملء جميع الحقول");
      return;
    }
    const itemCat = {
      id: Math.max(...itemCategories.map(ic => ic.id), 0) + 1,
      name: newItemCategory.name,
      code: newItemCategory.code,
    };
    setItemCategories([...itemCategories, itemCat]);
    setNewItemCategory({ name: "", code: "" });
    setShowAddItemCategoryDialog(false);
    toast.success("تم إضافة التصنيف بنجاح");
  };

  // حذف وحدة
  const handleDeleteUnit = (id: number) => {
    setUnits(units.filter(u => u.id !== id));
    toast.success("تم حذف الوحدة بنجاح");
  };

  // حذف فئة
  const handleDeleteCategory = (id: number) => {
    setCategories(categories.filter(c => c.id !== id));
    toast.success("تم حذف الفئة بنجاح");
  };

  // حذف تصنيف بند
  const handleDeleteItemCategory = (id: number) => {
    setItemCategories(itemCategories.filter(ic => ic.id !== id));
    toast.success("تم حذف التصنيف بنجاح");
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* العنوان */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">إدارة التصنيفات</h1>
            <p className="text-muted-foreground">إدارة الوحدات والفئات وتصنيفات البنود</p>
          </div>
        </div>

        {/* التبويبات */}
        <Tabs defaultValue="units" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="units">الوحدات</TabsTrigger>
            <TabsTrigger value="categories">الفئات</TabsTrigger>
            <TabsTrigger value="itemCategories">تصنيفات البنود</TabsTrigger>
          </TabsList>

          {/* تبويب الوحدات */}
          <TabsContent value="units">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Tag className="h-5 w-5" />
                    الوحدات
                  </CardTitle>
                  <CardDescription>إدارة وحدات القياس المستخدمة في جداول الكميات</CardDescription>
                </div>
                <Button onClick={() => setShowAddUnitDialog(true)}>
                  <Plus className="h-4 w-4 ml-2" />
                  إضافة وحدة
                </Button>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>الاسم</TableHead>
                      <TableHead>الرمز</TableHead>
                      <TableHead>الإجراءات</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {units.map((unit) => (
                      <TableRow key={unit.id}>
                        <TableCell>{unit.name}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{unit.code}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteUnit(unit.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* تبويب الفئات */}
          <TabsContent value="categories">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Tag className="h-5 w-5" />
                    الفئات
                  </CardTitle>
                  <CardDescription>إدارة فئات المشاريع والأعمال</CardDescription>
                </div>
                <Button onClick={() => setShowAddCategoryDialog(true)}>
                  <Plus className="h-4 w-4 ml-2" />
                  إضافة فئة
                </Button>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>الاسم</TableHead>
                      <TableHead>الرمز</TableHead>
                      <TableHead>الإجراءات</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {categories.map((category) => (
                      <TableRow key={category.id}>
                        <TableCell>{category.name}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{category.code}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteCategory(category.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* تبويب تصنيفات البنود */}
          <TabsContent value="itemCategories">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Tag className="h-5 w-5" />
                    تصنيفات البنود
                  </CardTitle>
                  <CardDescription>إدارة تصنيفات عناصر جداول الكميات</CardDescription>
                </div>
                <Button onClick={() => setShowAddItemCategoryDialog(true)}>
                  <Plus className="h-4 w-4 ml-2" />
                  إضافة تصنيف
                </Button>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>الاسم</TableHead>
                      <TableHead>الرمز</TableHead>
                      <TableHead>الإجراءات</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {itemCategories.map((itemCat) => (
                      <TableRow key={itemCat.id}>
                        <TableCell>{itemCat.name}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{itemCat.code}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteItemCategory(itemCat.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Dialog إضافة وحدة */}
      <Dialog open={showAddUnitDialog} onOpenChange={setShowAddUnitDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>إضافة وحدة جديدة</DialogTitle>
            <DialogDescription>أدخل بيانات الوحدة الجديدة</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>اسم الوحدة</Label>
              <Input
                placeholder="مثال: متر"
                value={newUnit.name}
                onChange={(e) => setNewUnit({ ...newUnit, name: e.target.value })}
              />
            </div>
            <div>
              <Label>الرمز</Label>
              <Input
                placeholder="مثال: m"
                value={newUnit.code}
                onChange={(e) => setNewUnit({ ...newUnit, code: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddUnitDialog(false)}>إلغاء</Button>
            <Button onClick={handleAddUnit}>إضافة</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog إضافة فئة */}
      <Dialog open={showAddCategoryDialog} onOpenChange={setShowAddCategoryDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>إضافة فئة جديدة</DialogTitle>
            <DialogDescription>أدخل بيانات الفئة الجديدة</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>اسم الفئة</Label>
              <Input
                placeholder="مثال: أعمال إنشائية"
                value={newCategory.name}
                onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })}
              />
            </div>
            <div>
              <Label>الرمز</Label>
              <Input
                placeholder="مثال: construction"
                value={newCategory.code}
                onChange={(e) => setNewCategory({ ...newCategory, code: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddCategoryDialog(false)}>إلغاء</Button>
            <Button onClick={handleAddCategory}>إضافة</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog إضافة تصنيف بند */}
      <Dialog open={showAddItemCategoryDialog} onOpenChange={setShowAddItemCategoryDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>إضافة تصنيف بند جديد</DialogTitle>
            <DialogDescription>أدخل بيانات تصنيف البند الجديد</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>اسم التصنيف</Label>
              <Input
                placeholder="مثال: مواد خام"
                value={newItemCategory.name}
                onChange={(e) => setNewItemCategory({ ...newItemCategory, name: e.target.value })}
              />
            </div>
            <div>
              <Label>الرمز</Label>
              <Input
                placeholder="مثال: raw_materials"
                value={newItemCategory.code}
                onChange={(e) => setNewItemCategory({ ...newItemCategory, code: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddItemCategoryDialog(false)}>إلغاء</Button>
            <Button onClick={handleAddItemCategory}>إضافة</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
