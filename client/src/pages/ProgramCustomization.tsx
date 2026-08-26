import React, { useState } from 'react';
import { Link } from 'wouter';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import DashboardLayout from '@/components/DashboardLayout';
import { Badge } from "@/components/ui/badge";
import { AlertCircle, Plus, Trash2, Edit2, Save, X, CheckCircle, Loader2, Shield, ArrowRight, GripVertical, ChevronDown, ChevronUp, SlidersHorizontal } from 'lucide-react';
import { usePermission } from "@/hooks/usePermission";
import { PermissionGuard } from "@/components/PermissionGuard";
import { useAuth } from "@/_core/hooks/useAuth";

interface ProgramCustomization {
  id: string;
  name: string;
  description: string;
  color: string;
  icon: any;
  requiresMosque: boolean;
  isActive: boolean;
  conditions?: string[] | any;
}

const parseConditions = (conditions: any): string[] => {
  if (!conditions) return [];
  if (Array.isArray(conditions)) return conditions;
  if (typeof conditions === 'string') {
    try {
      const parsed = JSON.parse(conditions);
      if (Array.isArray(parsed)) return parsed as string[];
    } catch (e) {
      if (conditions.trim()) return [conditions.trim()];
    }
  }
  return [];
};

export default function ProgramCustomization() {
  const { user } = useAuth();
  const { isLoading: permissionsLoading } = trpc.permissions.getUserPermissions.useQuery(
    { userId: user?.id ?? 0 },
    { enabled: !!user, staleTime: 5 * 60 * 1000 }
  );

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
  const updateOrderMutation = trpc.programs.updateOrder.useMutation({
    onSuccess: () => {
      utils.programs.getAll.invalidate();
    },
  });

  const [localPrograms, setLocalPrograms] = useState<any[]>([]);

  React.useEffect(() => {
    if (programs) {
      setLocalPrograms((prev) => {
        const isSame = prev.length === programs.length && 
          prev.every((p, i) => 
            p.id === programs[i].id && 
            p.sortOrder === programs[i].sortOrder && 
            p.name === programs[i].name && 
            p.isActive === programs[i].isActive && 
            p.description === programs[i].description && 
            p.color === programs[i].color
          );
        if (isSame) return prev;
        return programs;
      });
    }
  }, [programs]);

  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    const items = [...localPrograms];
    const draggedItem = items[draggedIndex];
    items.splice(draggedIndex, 1);
    items.splice(index, 0, draggedItem);

    setDraggedIndex(index);
    setLocalPrograms(items);
  };

  const handleDragEnd = async () => {
    setDraggedIndex(null);
    const orders = localPrograms.map((p, idx) => ({
      id: p.id,
      sortOrder: idx + 1,
    }));
    try {
      await updateOrderMutation.mutateAsync({ orders });
    } catch (err) {
      console.error('Failed to update programs sort order:', err);
    }
  };

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<Partial<ProgramCustomization>>({});
  const [showAddNew, setShowAddNew] = useState(false);
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({});

  const toggleExpand = (id: string) => {
    setExpandedIds(prev => ({ ...prev, [id]: !prev[id] }));
  };
  const [newProgram, setNewProgram] = useState<Partial<ProgramCustomization>>({
    name: '',
    description: '',
    color: 'bg-gray-500',
    icon: 'Package',
    requiresMosque: false,
    isActive: true,
    conditions: [],
  });

  const handleEdit = (program: any) => {
    setEditingId(program.id);
    setEditData({ ...program, conditions: parseConditions(program.conditions) });
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
      conditions: newProgram.conditions || [],
    });

    setNewProgram({
      name: '',
      description: '',
      color: 'bg-gray-500',
      icon: 'Package',
      requiresMosque: false,
      isActive: true,
      conditions: [],
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

  if (permissionsLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

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
          <div className="flex items-center gap-4">
            <Link href="/settings">
              <Button variant="ghost" size="icon" type="button">
                <ArrowRight className="w-5 h-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground">البرامج والخدمات</h1>
              <p className="text-sm sm:text-base text-muted-foreground mt-1">
                إدارة برامج الجمعية وأنواع الخدمات المقدمة في البوابة
              </p>
            </div>
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

              <div className="space-y-2 pt-2 border-t">
                <label className="block text-sm font-medium text-foreground">
                  الشروط والأحكام الخاصة بالبرنامج
                </label>
                <div className="space-y-2">
                  {(newProgram.conditions || []).map((cond: string, index: number) => (
                    <div key={index} className="flex gap-2 items-center">
                      <Input
                        value={cond}
                        onChange={(e) => {
                          const updated = [...(newProgram.conditions || [])];
                          updated[index] = e.target.value;
                          setNewProgram({ ...newProgram, conditions: updated });
                        }}
                        placeholder={`الشرط رقم ${index + 1}`}
                        className="flex-1 h-9 text-sm"
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        type="button"
                        onClick={() => {
                          setNewProgram({
                            ...newProgram,
                            conditions: (newProgram.conditions || []).filter((_: any, i: number) => i !== index)
                          });
                        }}
                        className="text-red-500 hover:bg-red-50 h-9 w-9 flex-shrink-0"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setNewProgram({
                        ...newProgram,
                        conditions: [...(newProgram.conditions || []), ""]
                      });
                    }}
                    className="h-8 text-xs"
                  >
                    <Plus className="w-3.5 h-3.5 ml-1" />
                    إضافة شرط
                  </Button>
                </div>
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
            {localPrograms.map((program: any, index: number) => {
              const isDragging = draggedIndex === index;
              return (
                <Card 
                  key={program.id} 
                  draggable={canEdit && editingId !== program.id}
                  onDragStart={(e) => handleDragStart(e, index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDragEnd={handleDragEnd}
                  className={`transition-all overflow-hidden ${
                    canEdit && editingId !== program.id ? 'cursor-grab' : ''
                  } ${
                    isDragging ? 'opacity-40 border-dashed border-2 border-primary' : ''
                  } ${
                    !program.isActive ? 'bg-muted/30 opacity-70 grayscale-[0.5]' : 'hover:shadow-sm'
                  }`}
                >
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

                        <div className="space-y-2 pt-2 border-t">
                          <label className="block text-sm font-medium text-foreground">
                            الشروط والأحكام الخاصة بالبرنامج
                          </label>
                          <div className="space-y-2">
                            {(editData.conditions || []).map((cond: string, index: number) => (
                              <div key={index} className="flex gap-2 items-center">
                                <Input
                                  value={cond}
                                  onChange={(e) => {
                                    const updated = [...(editData.conditions || [])];
                                    updated[index] = e.target.value;
                                    setEditData({ ...editData, conditions: updated });
                                  }}
                                  placeholder={`الشرط رقم ${index + 1}`}
                                  className="flex-1 h-9 text-sm"
                                />
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  type="button"
                                  onClick={() => {
                                    setEditData({
                                      ...editData,
                                      conditions: (editData.conditions || []).filter((_: any, i: number) => i !== index)
                                    });
                                  }}
                                  className="text-red-500 hover:bg-red-50 h-9 w-9 flex-shrink-0"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            ))}
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                  setEditData({
                                    ...editData,
                                    conditions: [...(editData.conditions || []), ""]
                                  });
                              }}
                              className="h-8 text-xs"
                            >
                              <Plus className="w-3.5 h-3.5 ml-1" />
                              إضافة شرط
                            </Button>
                          </div>
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
                          {canEdit && (
                            <div className="text-muted-foreground/40 hover:text-foreground cursor-grab active:cursor-grabbing self-center p-1">
                              <GripVertical className="w-5 h-5" />
                            </div>
                          )}
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

                          <div className="mt-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleExpand(program.id);
                              }}
                              className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 bg-muted hover:bg-muted/80 rounded-md"
                            >
                              <span>تفاصيل البرنامج (الوصف والشروط)</span>
                              {expandedIds[program.id] ? (
                                <ChevronUp className="w-3.5 h-3.5" />
                              ) : (
                                <ChevronDown className="w-3.5 h-3.5" />
                              )}
                            </Button>
                          </div>

                          {expandedIds[program.id] && (
                            <div className="mt-3 bg-primary/5 p-4 rounded-xl border border-primary/10 space-y-3 transition-all text-right" dir="rtl">
                              {program.description && (
                                <div>
                                  <h4 className="text-xs font-bold text-primary mb-1">الوصف:</h4>
                                  <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                                    {program.description}
                                  </p>
                                </div>
                              )}
                              {(() => {
                                const conds = parseConditions(program.conditions);
                                if (conds.filter(Boolean).length === 0) return null;
                                return (
                                  <div className={program.description ? "pt-2.5 border-t border-primary/10" : ""}>
                                    <h4 className="text-xs font-bold text-primary mb-1.5">شروط التقديم:</h4>
                                    <div className="space-y-1">
                                      {conds.filter(Boolean).map((cond: string, index: number) => (
                                        <div key={index} className="text-xs text-muted-foreground flex items-start gap-1.5">
                                          <span className="text-primary font-bold">•</span>
                                          <span>{cond}</span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                );
                              })()}
                            </div>
                          )}

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

                      <div className="flex items-center gap-2 sm:gap-3 self-end sm:self-center flex-wrap">
                        <Link href={`/forms-customization/services/${program.id}`}>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-8 px-2.5 sm:px-3 text-xs font-bold text-cyan-700 dark:text-cyan-400 border-cyan-300 dark:border-cyan-800 bg-cyan-50/70 dark:bg-cyan-950/30 hover:bg-cyan-100 dark:hover:bg-cyan-900/50 hover:text-cyan-900 dark:hover:text-cyan-200 transition-all gap-1.5 rounded-lg shadow-2xs"
                            title="تخصيص وترتيب حقول استمارة تقديم هذا البرنامج"
                          >
                            <SlidersHorizontal className="w-3.5 h-3.5" />
                            <span>تخصيص الفورم</span>
                          </Button>
                        </Link>

                        <div className="flex items-center gap-3 bg-muted/50 p-1 rounded-lg">
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
                    </div>
                  )}
                </CardContent>
              </Card>
              );
            })}
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
