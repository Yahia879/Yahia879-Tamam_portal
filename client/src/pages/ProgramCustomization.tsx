import React, { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import DashboardLayout from '@/components/DashboardLayout';
import { Badge } from "@/components/ui/badge";
import { AlertCircle, Plus, Trash2, Edit2, Save, X, CheckCircle, Loader2, Shield } from 'lucide-react';
import { usePermission } from "@/hooks/usePermission";
import { PermissionGuard } from "@/components/PermissionGuard";

interface ProgramCustomization {
  id: string;
  name: string;
  description: string;
  color: string;
  icon: any;
  requiresMosque: boolean;
  isActive: boolean;
}

export default function ProgramCustomization() {
  const canView = usePermission("services.view");
  const canAdd = usePermission("services.add");
  const canEdit = usePermission("services.edit");
  const canDelete = usePermission("services.delete");

  const utils = trpc.useUtils();
  const { data: programs = [], isLoading } = trpc.programs.getAll.useQuery();
  const createMutation = trpc.programs.create.useMutation({
    onSuccess: () => {
      utils.programs.getAll.invalidate();
    },
  });
  const updateMutation = trpc.programs.update.useMutation({
    onSuccess: () => {
      utils.programs.getAll.invalidate();
    },
  });
  const deleteMutation = trpc.programs.delete.useMutation({
    onSuccess: () => {
      utils.programs.getAll.invalidate();
    },
  });

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<Partial<ProgramCustomization>>({});
  const [showAddNew, setShowAddNew] = useState(false);
  const [newProgram, setNewProgram] = useState<Partial<ProgramCustomization>>({
    name: '',
    description: '',
    color: 'bg-gray-500',
    icon: 'Package',
    requiresMosque: false,
    isActive: true,
  });

  const handleEdit = (program: any) => {
    setEditingId(program.id);
    setEditData({ ...program });
  };

  const handleSaveEdit = async (id: string) => {
    await updateMutation.mutateAsync({
      id,
      ...editData,
    });
    setEditingId(null);
    setEditData({});
  };

  const handleDelete = async (id: string) => {
    if (confirm('هل تريد حذف هذا البرنامج؟')) {
      await deleteMutation.mutateAsync({ id });
    }
  };

  const handleAddNew = async () => {
    if (!newProgram.name || !newProgram.description) {
      alert('يرجى ملء جميع الحقول المطلوبة');
      return;
    }

    const newId = `custom_${Date.now()}`;
    await createMutation.mutateAsync({
      id: newId,
      name: newProgram.name!,
      description: newProgram.description!,
      color: newProgram.color || 'bg-gray-500',
      icon: newProgram.icon || 'Package',
      requiresMosque: newProgram.requiresMosque || false,
    });

    setNewProgram({
      name: '',
      description: '',
      color: 'bg-gray-500',
      icon: 'Package',
      requiresMosque: false,
      isActive: true,
    });
    setShowAddNew(false);
  };

  const toggleActive = async (id: string, currentActive: boolean) => {
    await updateMutation.mutateAsync({
      id,
      isActive: !currentActive,
    });
  };

  const colors = [
    'bg-red-500',
    'bg-blue-500',
    'bg-green-500',
    'bg-yellow-500',
    'bg-purple-500',
    'bg-pink-500',
    'bg-cyan-500',
    'bg-orange-500',
    'bg-teal-500',
    'bg-gray-500',
  ];

  if (!canView) {
    return (
      <DashboardLayout>
        <div className="container py-20 text-center flex flex-col items-center justify-center">
          <Shield className="w-16 h-16 text-destructive mb-4" />
          <h2 className="text-2xl font-bold text-destructive">عذراً، لا تملك صلاحية لعرض البرامج</h2>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* رأس الصفحة */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">البرامج والخدمات</h1>
            <p className="text-sm sm:text-base text-muted-foreground mt-1">
              إدارة برامج الجمعية وأنواع الخدمات المقدمة في البوابة
            </p>
          </div>
          <PermissionGuard permission="services.add">
            <Button
              onClick={() => setShowAddNew(true)}
              className="gradient-primary text-white w-full sm:w-auto h-10"
            >
              <Plus className="w-4 h-4 ml-2" />
              إضافة برنامج جديد
            </Button>
          </PermissionGuard>
        </div>

        {/* تنبيه */}
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="flex items-start gap-3 sm:gap-4 pt-4 sm:pt-6 p-4 sm:p-6">
            <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-amber-900 text-sm sm:text-base">ملاحظة مهمة</h3>
              <p className="text-xs sm:text-sm text-amber-800 mt-1 leading-relaxed">
                التغييرات التي تجريها هنا ستؤثر على نموذج تقديم الطلبات الديناميكي.
                يمكنك تفعيل أو تعطيل البرامج دون حذفها نهائياً.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* نموذج إضافة برنامج جديد */}
        {showAddNew && (
          <Card className="border-primary/20 shadow-md">
            <CardHeader className="p-4 sm:p-6 pb-2">
              <CardTitle className="text-lg sm:text-xl">إضافة برنامج جديد</CardTitle>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-foreground">
                    اسم البرنامج *
                  </label>
                  <Input
                    value={newProgram.name || ''}
                    onChange={(e) =>
                      setNewProgram({ ...newProgram, name: e.target.value })
                    }
                    placeholder="مثال: برنامج السقيا"
                    className="h-10"
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-foreground">
                    اللون
                  </label>
                  <div className="flex gap-2 flex-wrap max-w-full">
                    {colors.map((color) => (
                      <button
                        key={color}
                        type="button"
                        onClick={() =>
                          setNewProgram({ ...newProgram, color })
                        }
                        className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg ${color} transition-all ${
                          newProgram.color === color ? 'ring-2 ring-offset-2 ring-primary scale-110' : 'hover:scale-105'
                        }`}
                      />
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-foreground">
                  الوصف *
                </label>
                <Textarea
                  value={newProgram.description || ''}
                  onChange={(e) =>
                    setNewProgram({ ...newProgram, description: e.target.value })
                  }
                  placeholder="وصف تفصيلي للخدمات المقدمة ضمن هذا البرنامج"
                  rows={3}
                  className="text-sm"
                />
              </div>

              <div className="flex items-center gap-2 py-2">
                <label className="flex items-center gap-2 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={newProgram.requiresMosque || false}
                    onChange={(e) =>
                      setNewProgram({
                        ...newProgram,
                        requiresMosque: e.target.checked,
                      })
                    }
                    className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
                  />
                  <span className="text-sm text-foreground group-hover:text-primary transition-colors">
                    يتطلب اختيار مسجد من قبل مقدم الطلب
                  </span>
                </label>
              </div>

              <div className="flex flex-col-reverse sm:flex-row gap-2 justify-end pt-2 border-t">
                <Button
                  variant="outline"
                  onClick={() => setShowAddNew(false)}
                  className="w-full sm:w-auto h-10"
                >
                  إلغاء
                </Button>
                <Button
                  onClick={handleAddNew}
                  className="gradient-primary text-white w-full sm:w-auto h-10"
                  disabled={createMutation.isPending}
                >
                  {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin ml-2" /> : <Plus className="w-4 h-4 ml-2" />}
                  إضافة البرنامج
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* قائمة البرامج */}
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {programs.map((program: any) => (
              <Card key={program.id} className={`transition-all overflow-hidden ${!program.isActive ? 'bg-muted/30 opacity-70 grayscale-[0.5]' : 'hover:shadow-sm'}`}>
                <CardContent className="p-4 sm:p-6">
                  {editingId === program.id ? (
                    // وضع التحرير
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="block text-sm font-medium text-foreground">
                            اسم البرنامج
                          </label>
                          <Input
                            value={editData.name || ''}
                            onChange={(e) =>
                              setEditData({ ...editData, name: e.target.value })
                            }
                            className="h-10"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="block text-sm font-medium text-foreground">
                            اللون
                          </label>
                          <div className="flex gap-2 flex-wrap">
                            {colors.map((color) => (
                              <button
                                key={color}
                                type="button"
                                onClick={() =>
                                  setEditData({ ...editData, color })
                                }
                                className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg ${color} transition-all ${
                                  editData.color === color
                                    ? 'ring-2 ring-offset-2 ring-primary scale-110'
                                    : 'hover:scale-105'
                                }`}
                              />
                            ))}
                          </div>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-foreground">
                          الوصف
                        </label>
                        <Textarea
                          value={editData.description || ''}
                          onChange={(e) =>
                            setEditData({
                              ...editData,
                              description: e.target.value,
                            })
                          }
                          rows={3}
                          className="text-sm"
                        />
                      </div>

                      <div className="flex flex-col-reverse sm:flex-row gap-2 justify-end pt-2 border-t">
                        <Button
                          variant="outline"
                          onClick={() => setEditingId(null)}
                          className="w-full sm:w-auto h-9"
                        >
                          <X className="w-4 h-4 ml-2" />
                          إلغاء
                        </Button>
                        <Button
                          onClick={() => handleSaveEdit(program.id)}
                          className="gradient-primary text-white w-full sm:w-auto h-9"
                          disabled={updateMutation.isPending}
                        >
                          {updateMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin ml-2" /> : <Save className="w-4 h-4 ml-2" />}
                          حفظ التعديلات
                        </Button>
                      </div>
                    </div>
                  ) : (
                    // وضع العرض
                    <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
                      <div className="flex items-start gap-3 sm:gap-4 flex-1 min-w-0">
                        <div
                          className={`w-12 h-12 rounded-xl ${program.color} flex items-center justify-center flex-shrink-0 shadow-sm`}
                        >
                          <span className="text-white text-xl">📦</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="text-base sm:text-lg font-bold text-foreground truncate">
                              {program.name}
                            </h3>
                            {!program.isActive && (
                              <Badge variant="outline" className="text-[10px] sm:text-xs text-gray-500 border-gray-300">
                                معطّل
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs sm:text-sm text-muted-foreground mt-1 leading-relaxed line-clamp-2 sm:line-clamp-none">
                            {program.description}
                          </p>
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-3 text-[10px] sm:text-xs text-muted-foreground">
                            {program.requiresMosque && (
                              <span className="flex items-center gap-1 text-emerald-600 font-medium">
                                <CheckCircle className="w-3 h-3" />
                                يتطلب اختيار مسجد
                              </span>
                            )}
                            <span className="font-mono bg-muted px-1.5 py-0.5 rounded">ID: {program.id}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 self-end sm:self-center bg-muted/50 p-1 rounded-lg">
                        <label className={`flex items-center gap-2 px-2 ${canEdit ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'}`}>
                          <input
                            type="checkbox"
                            checked={program.isActive}
                            disabled={!canEdit}
                            onChange={() => canEdit && toggleActive(program.id, program.isActive)}
                            className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
                          />
                          <span className="text-xs font-medium text-foreground whitespace-nowrap">فعّال</span>
                        </label>
                        {(canEdit || canDelete) && <div className="w-[1px] h-6 bg-border mx-1 hidden sm:block" />}
                        <div className="flex items-center">
                          <PermissionGuard permission="services.edit">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEdit(program)}
                              className="h-8 w-8 text-blue-600 hover:bg-blue-50"
                            >
                              <Edit2 className="w-4 h-4" />
                            </Button>
                          </PermissionGuard>
                          <PermissionGuard permission="services.delete">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete(program.id)}
                              className="h-8 w-8 text-red-500 hover:bg-red-50"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </PermissionGuard>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* ملخص */}
        <Card className="bg-primary/5 border-primary/10">
          <CardContent className="p-4 sm:p-6">
            <div className="grid grid-cols-3 gap-2 sm:gap-4 text-center">
              <div className="space-y-1">
                <div className="text-xl sm:text-3xl font-black text-primary">
                  {programs.length}
                </div>
                <div className="text-[10px] sm:text-sm text-muted-foreground font-medium">
                  إجمالي البرامج
                </div>
              </div>
              <div className="space-y-1 border-x border-primary/10">
                <div className="text-xl sm:text-3xl font-black text-emerald-600">
                  {programs.filter((p: any) => p.isActive).length}
                </div>
                <div className="text-[10px] sm:text-sm text-muted-foreground font-medium">
                  برامج فعّالة
                </div>
              </div>
              <div className="space-y-1">
                <div className="text-xl sm:text-3xl font-black text-orange-600">
                  {programs.filter((p: any) => !p.isActive).length}
                </div>
                <div className="text-[10px] sm:text-sm text-muted-foreground font-medium">
                  برامج معطّلة
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
