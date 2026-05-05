import React, { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import DashboardLayout from '@/components/DashboardLayout';
import { AlertCircle, Plus, Trash2, Edit2, Save, X } from 'lucide-react';
import { PROGRAM_CONFIGS } from '@/lib/programFields';

interface ProgramCustomization {
  id: string;
  name: string;
  description: string;
  color: string;
  icon: any;
  requiresMosque: boolean;
  active: boolean;
}

export default function ProgramCustomization() {
  const [programs, setPrograms] = useState<ProgramCustomization[]>(
    Object.entries(PROGRAM_CONFIGS).map(([id, config]) => ({
      id,
      name: config.name,
      description: config.description,
      color: config.color,
      icon: 'Package' as any,
      requiresMosque: config.requiresMosque,
      active: true,
    }))
  );

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<Partial<ProgramCustomization>>({});
  const [showAddNew, setShowAddNew] = useState(false);
  const [newProgram, setNewProgram] = useState<Partial<ProgramCustomization>>({
    name: '',
    description: '',
    color: 'bg-gray-500',
    icon: 'Package',
    requiresMosque: false,
    active: true,
  });

  const handleEdit = (program: ProgramCustomization) => {
    setEditingId(program.id);
    setEditData({ ...program });
  };

  const handleSaveEdit = (id: string) => {
    const updatedPrograms = programs.map((p) =>
      p.id === id ? { ...p, ...editData } : p
    );
    setPrograms(updatedPrograms);
    setEditingId(null);
    setEditData({});
  };

  const handleDelete = (id: string) => {
    if (confirm('هل تريد حذف هذا البرنامج؟')) {
      setPrograms(programs.filter((p) => p.id !== id));
    }
  };

  const handleAddNew = () => {
    if (!newProgram.name || !newProgram.description) {
      alert('يرجى ملء جميع الحقول المطلوبة');
      return;
    }

    const newId = `custom_${Date.now()}`;
    setPrograms([
      ...programs,
      {
        id: newId,
        name: newProgram.name!,
        description: newProgram.description!,
        color: newProgram.color || 'bg-gray-500',
        icon: newProgram.icon || 'Package',
        requiresMosque: newProgram.requiresMosque || false,
        active: true,
      },
    ]);

    setNewProgram({
      name: '',
      description: '',
      color: 'bg-gray-500',
      icon: 'Package',
      requiresMosque: false,
      active: true,
    });
    setShowAddNew(false);
  };

  const toggleActive = (id: string) => {
    setPrograms(
      programs.map((p) =>
        p.id === id ? { ...p, active: !p.active } : p
      )
    );
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

  const icons = [
    'Building2',
    'Hammer',
    'Wrench',
    'Package',
    'Receipt',
    'Sparkles',
    'Sun',
    'Droplets',
    'GlassWater',
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* رأس الصفحة */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">البرامج والخدمات</h1>
            <p className="text-muted-foreground mt-2">
              إدارة برامج الجمعية وأنواع الخدمات المقدمة في البوابة
            </p>
          </div>
          <Button
            onClick={() => setShowAddNew(true)}
            className="gradient-primary text-white"
          >
            <Plus className="w-4 h-4 ml-2" />
            إضافة برنامج جديد
          </Button>
        </div>

        {/* تنبيه */}
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="flex items-start gap-4 pt-6">
            <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-amber-900">ملاحظة مهمة</h3>
              <p className="text-sm text-amber-800 mt-1">
                التغييرات التي تجريها هنا ستؤثر على نموذج تقديم الطلبات الديناميكي.
                يمكنك تفعيل أو تعطيل البرامج دون حذفها نهائياً.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* نموذج إضافة برنامج جديد */}
        {showAddNew && (
          <Card>
            <CardHeader>
              <CardTitle>إضافة برنامج جديد</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    اسم البرنامج
                  </label>
                  <Input
                    value={newProgram.name || ''}
                    onChange={(e) =>
                      setNewProgram({ ...newProgram, name: e.target.value })
                    }
                    placeholder="مثال: برنامج جديد"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    اللون
                  </label>
                  <div className="flex gap-2 flex-wrap">
                    {colors.map((color) => (
                      <button
                        key={color}
                        onClick={() =>
                          setNewProgram({ ...newProgram, color })
                        }
                        className={`w-8 h-8 rounded-lg ${color} ${
                          newProgram.color === color ? 'ring-2 ring-offset-2 ring-primary' : ''
                        }`}
                      />
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  الوصف
                </label>
                <Textarea
                  value={newProgram.description || ''}
                  onChange={(e) =>
                    setNewProgram({ ...newProgram, description: e.target.value })
                  }
                  placeholder="وصف البرنامج"
                  rows={3}
                />
              </div>

              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newProgram.requiresMosque || false}
                    onChange={(e) =>
                      setNewProgram({
                        ...newProgram,
                        requiresMosque: e.target.checked,
                      })
                    }
                    className="w-4 h-4"
                  />
                  <span className="text-sm text-foreground">
                    يتطلب اختيار مسجد
                  </span>
                </label>
              </div>

              <div className="flex gap-2 justify-end">
                <Button
                  variant="outline"
                  onClick={() => setShowAddNew(false)}
                >
                  إلغاء
                </Button>
                <Button
                  onClick={handleAddNew}
                  className="gradient-primary text-white"
                >
                  إضافة
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* قائمة البرامج */}
        <div className="grid grid-cols-1 gap-4">
          {programs.map((program) => (
            <Card key={program.id} className={!program.active ? 'opacity-50' : ''}>
              <CardContent className="pt-6">
                {editingId === program.id ? (
                  // وضع التحرير
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-2">
                          اسم البرنامج
                        </label>
                        <Input
                          value={editData.name || ''}
                          onChange={(e) =>
                            setEditData({ ...editData, name: e.target.value })
                          }
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-2">
                          اللون
                        </label>
                        <div className="flex gap-2 flex-wrap">
                          {colors.map((color) => (
                            <button
                              key={color}
                              onClick={() =>
                                setEditData({ ...editData, color })
                              }
                              className={`w-8 h-8 rounded-lg ${color} ${
                                editData.color === color
                                  ? 'ring-2 ring-offset-2 ring-primary'
                                  : ''
                              }`}
                            />
                          ))}
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
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
                      />
                    </div>

                    <div className="flex gap-2 justify-end">
                      <Button
                        variant="outline"
                        onClick={() => setEditingId(null)}
                      >
                        <X className="w-4 h-4 ml-2" />
                        إلغاء
                      </Button>
                      <Button
                        onClick={() => handleSaveEdit(program.id)}
                        className="gradient-primary text-white"
                      >
                        <Save className="w-4 h-4 ml-2" />
                        حفظ
                      </Button>
                    </div>
                  </div>
                ) : (
                  // وضع العرض
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4 flex-1">
                      <div
                        className={`w-12 h-12 rounded-lg ${program.color} flex items-center justify-center flex-shrink-0`}
                      >
                        <span className="text-white text-lg">📦</span>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="text-lg font-semibold text-foreground">
                            {program.name}
                          </h3>
                          {!program.active && (
                            <span className="px-2 py-1 bg-gray-200 text-gray-700 text-xs rounded">
                              معطّل
                            </span>
                          )}
                        </div>
                        <p className="text-muted-foreground mt-1">
                          {program.description}
                        </p>
                        <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground">
                          {program.requiresMosque && (
                            <span>✓ يتطلب اختيار مسجد</span>
                          )}
                          <span>المعرّف: {program.id}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={program.active}
                          onChange={() => toggleActive(program.id)}
                          className="w-4 h-4"
                        />
                        <span className="text-sm text-foreground">فعّال</span>
                      </label>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(program)}
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(program.id)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* ملخص */}
        <Card className="bg-muted/50">
          <CardContent className="pt-6">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <div className="text-2xl font-bold text-foreground">
                  {programs.length}
                </div>
                <div className="text-sm text-muted-foreground">
                  إجمالي البرامج
                </div>
              </div>
              <div>
                <div className="text-2xl font-bold text-green-600">
                  {programs.filter((p) => p.active).length}
                </div>
                <div className="text-sm text-muted-foreground">
                  برامج فعّالة
                </div>
              </div>
              <div>
                <div className="text-2xl font-bold text-orange-600">
                  {programs.filter((p) => !p.active).length}
                </div>
                <div className="text-sm text-muted-foreground">
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
