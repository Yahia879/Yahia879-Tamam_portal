import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Trash2 } from 'lucide-react';

export interface SedanaCustomItem {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  notes?: string;
}

interface SedanaRequestFormProps {
  formData: Record<string, any>;
  onFieldChange: (fieldName: string, value: any) => void;
  selectedMosque?: {
    id: number;
    name: string;
    city?: string | null;
    capacity?: number | null;
    area?: number | string | null;
  } | null;
  errors?: Record<string, string>;
}

export const SedanaRequestForm: React.FC<SedanaRequestFormProps> = ({
  formData,
  onFieldChange,
  selectedMosque,
}) => {
  const mosqueCapacity = Number(selectedMosque?.capacity) || Number(formData.actualWorshippers) || 150;
  const mosqueArea = Number(selectedMosque?.area) || Number(formData.mosqueArea) || 250;

  // 1. القوى العاملة
  const workforce = formData.workforce || {
    hasFullTimeCleaner: false,
    cleanerSalary: 1500,
    hasPeriodicMaintenanceReward: false,
    maintenanceRewardAmount: 500,
  };

  // 2. مواد النظافة
  const cleaning = formData.cleaningMaterials || {
    liquidSoapQty: 12,
    foamSoapQty: 24,
    floorDisinfectantQty: 24,
    trashBagsQty: 24,
    tissuesQty: 120,
  };

  // 3. سقيا المياه
  const drinkingWater = formData.drinkingWater || {
    cartonsQty: 240,
    schedule: 'monthly',
  };

  // 4. صهاريج المياه
  const waterTankers = formData.waterTankers || {
    isConnectedToNetwork: true,
    tankersQtyPerYear: 0,
    tankerSize: 'وايت عادي (19 طن)',
  };

  // 5. البيئة العطرية
  const aromatic = formData.aromaticEnvironment || {
    enabled: true,
    diffusersCount: Math.max(1, Math.round(mosqueArea / 100)),
    refillsPerYear: Math.max(2, Math.round(mosqueArea / 100) * 2),
    schedule: 'every_6_months',
  };

  // 6. بنود مخصصة
  const customItems: SedanaCustomItem[] = formData.customItems || [];

  const updateWorkforce = (patch: Partial<typeof workforce>) => {
    onFieldChange('workforce', { ...workforce, ...patch });
  };

  const updateCleaning = (patch: Partial<typeof cleaning>) => {
    const updated = { ...cleaning, ...patch };
    onFieldChange('cleaningMaterials', updated);
    if (patch.tissuesQty !== undefined) onFieldChange('tissuesQty', patch.tissuesQty);
  };

  const updateDrinkingWater = (patch: Partial<typeof drinkingWater>) => {
    const updated = { ...drinkingWater, ...patch };
    onFieldChange('drinkingWater', updated);
    if (patch.cartonsQty !== undefined) onFieldChange('cartonsNeeded', patch.cartonsQty);
  };

  const updateWaterTankers = (patch: Partial<typeof waterTankers>) => {
    const updated = { ...waterTankers, ...patch };
    onFieldChange('waterTankers', updated);
    onFieldChange('isConnectedToWaterNetwork', updated.isConnectedToNetwork);
  };

  const updateAromatic = (patch: Partial<typeof aromatic>) => {
    onFieldChange('aromaticEnvironment', { ...aromatic, ...patch });
  };

  // بنود مخصصة
  const [newCustomName, setNewCustomName] = useState('');
  const [newCustomQty, setNewCustomQty] = useState(1);
  const [newCustomUnit, setNewCustomUnit] = useState('قطعة');
  const [showAddCustom, setShowAddCustom] = useState(false);

  const handleAddCustomItem = () => {
    if (!newCustomName.trim()) return;
    const updated = [
      ...customItems,
      {
        id: Date.now().toString(),
        name: newCustomName.trim(),
        quantity: Number(newCustomQty) || 1,
        unit: newCustomUnit.trim() || 'قطعة',
      },
    ];
    onFieldChange('customItems', updated);
    setNewCustomName('');
    setNewCustomQty(1);
    setShowAddCustom(false);
  };

  const handleRemoveCustomItem = (id: string) => {
    onFieldChange('customItems', customItems.filter((i) => i.id !== id));
  };

  // تعبئة تقديرية سريعة بناءً على حجم المسجد
  const handleAutoFill = () => {
    const cap = mosqueCapacity;
    const ar = mosqueArea;
    updateCleaning({
      tissuesQty: Math.round(cap * 0.85),
      liquidSoapQty: Math.max(8, Math.round(cap * 0.12)),
      foamSoapQty: Math.max(16, Math.round(cap * 0.2)),
      floorDisinfectantQty: Math.max(16, Math.round(ar * 0.1)),
      trashBagsQty: Math.max(16, Math.round(cap * 0.2 + ar * 0.04)),
    });
    updateDrinkingWater({ cartonsQty: Math.round(cap * 1.8) });
    const diffs = Math.max(1, Math.round(ar / 100));
    updateAromatic({ diffusersCount: diffs, refillsPerYear: diffs * 2 });
  };

  return (
    <div className="space-y-4 pt-1" dir="rtl">
      {/* شريط العنوان والزر القياسي */}
      <div className="flex items-center justify-between pb-2 border-b border-border/70">
        <div>
          <h3 className="font-bold text-sm sm:text-base text-foreground">
            احتياجات التشغيل السنوي (سدانة)
          </h3>
          <p className="text-xs text-muted-foreground">
            حدد الكميات المطلوبة للمسجد لمدة سنة كاملة
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleAutoFill}
          className="h-8 text-xs font-normal"
        >
          اقتراح كميات قياسية
        </Button>
      </div>

      {/* 1. القوى العاملة */}
      <div className="p-3.5 rounded-lg border border-border/70 bg-card space-y-3">
        <h4 className="font-bold text-xs sm:text-sm text-foreground">1. القوى العاملة</h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-2 p-2.5 rounded-md bg-muted/20 border border-border/40">
            <label className="flex items-center gap-2 cursor-pointer">
              <Checkbox
                checked={workforce.hasFullTimeCleaner}
                onCheckedChange={(checked) => updateWorkforce({ hasFullTimeCleaner: !!checked })}
              />
              <span className="text-xs font-medium text-foreground">عامل نظافة للمسجد</span>
            </label>
            {workforce.hasFullTimeCleaner && (
              <div className="pt-1.5">
                <Label className="text-[11px] text-muted-foreground block mb-1">المكافأة الشهرية (ريال)</Label>
                <Input
                  type="number"
                  min="0"
                  step="100"
                  value={workforce.cleanerSalary || ''}
                  onChange={(e) => updateWorkforce({ cleanerSalary: Number(e.target.value) })}
                  className="h-8 text-xs"
                  placeholder="1500"
                />
              </div>
            )}
          </div>

          <div className="space-y-2 p-2.5 rounded-md bg-muted/20 border border-border/40">
            <label className="flex items-center gap-2 cursor-pointer">
              <Checkbox
                checked={workforce.hasPeriodicMaintenanceReward}
                onCheckedChange={(checked) => updateWorkforce({ hasPeriodicMaintenanceReward: !!checked })}
              />
              <span className="text-xs font-medium text-foreground">مكافأة صيانة دورية</span>
            </label>
            {workforce.hasPeriodicMaintenanceReward && (
              <div className="pt-1.5">
                <Label className="text-[11px] text-muted-foreground block mb-1">المكافأة الشهرية (ريال)</Label>
                <Input
                  type="number"
                  min="0"
                  step="50"
                  value={workforce.maintenanceRewardAmount || ''}
                  onChange={(e) => updateWorkforce({ maintenanceRewardAmount: Number(e.target.value) })}
                  className="h-8 text-xs"
                  placeholder="500"
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 2. مواد النظافة والتعقيم */}
      <div className="p-3.5 rounded-lg border border-border/70 bg-card space-y-3">
        <h4 className="font-bold text-xs sm:text-sm text-foreground">2. مواد النظافة والتعقيم (سنوياً)</h4>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
          <div>
            <Label className="text-[11px] mb-1 block text-muted-foreground">مناديل ورقية (كرتون)</Label>
            <Input
              type="number"
              min="0"
              value={cleaning.tissuesQty ?? ''}
              onChange={(e) => updateCleaning({ tissuesQty: Number(e.target.value) })}
              className="h-8 text-xs"
            />
          </div>
          <div>
            <Label className="text-[11px] mb-1 block text-muted-foreground">صابون سائل (جالون)</Label>
            <Input
              type="number"
              min="0"
              value={cleaning.liquidSoapQty ?? ''}
              onChange={(e) => updateCleaning({ liquidSoapQty: Number(e.target.value) })}
              className="h-8 text-xs"
            />
          </div>
          <div>
            <Label className="text-[11px] mb-1 block text-muted-foreground">صابون رغوة (عبوة)</Label>
            <Input
              type="number"
              min="0"
              value={cleaning.foamSoapQty ?? ''}
              onChange={(e) => updateCleaning({ foamSoapQty: Number(e.target.value) })}
              className="h-8 text-xs"
            />
          </div>
          <div>
            <Label className="text-[11px] mb-1 block text-muted-foreground">مطهر أرضيات (جالون)</Label>
            <Input
              type="number"
              min="0"
              value={cleaning.floorDisinfectantQty ?? ''}
              onChange={(e) => updateCleaning({ floorDisinfectantQty: Number(e.target.value) })}
              className="h-8 text-xs"
            />
          </div>
          <div>
            <Label className="text-[11px] mb-1 block text-muted-foreground">أكياس نفايات (كرتون)</Label>
            <Input
              type="number"
              min="0"
              value={cleaning.trashBagsQty ?? ''}
              onChange={(e) => updateCleaning({ trashBagsQty: Number(e.target.value) })}
              className="h-8 text-xs"
            />
          </div>
        </div>
      </div>

      {/* 3. سقيا المياه */}
      <div className="p-3.5 rounded-lg border border-border/70 bg-card space-y-3">
        <h4 className="font-bold text-xs sm:text-sm text-foreground">3. سقيا المياه</h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <Label className="text-[11px] mb-1 block text-muted-foreground">كراتين مياه الشرب (سنوياً)</Label>
            <Input
              type="number"
              min="0"
              value={drinkingWater.cartonsQty ?? ''}
              onChange={(e) => updateDrinkingWater({ cartonsQty: Number(e.target.value) })}
              className="h-8 text-xs"
            />
          </div>
          <div>
            <Label className="text-[11px] mb-1 block text-muted-foreground">جدول التوريد</Label>
            <select
              value={drinkingWater.schedule || 'monthly'}
              onChange={(e) => updateDrinkingWater({ schedule: e.target.value })}
              className="w-full h-8 rounded-md border border-input bg-background px-2.5 text-xs"
            >
              <option value="monthly">توريد شهري منتظم</option>
              <option value="bimonthly">توريد كل شهرين</option>
              <option value="seasons">حسب المواسم (رمضان والأعياد)</option>
            </select>
          </div>
        </div>
      </div>

      {/* 4. صهاريج المياه (مشروط) */}
      <div className="p-3.5 rounded-lg border border-border/70 bg-card space-y-2.5">
        <h4 className="font-bold text-xs sm:text-sm text-foreground">4. صهاريج المياه</h4>
        <label className="flex items-center gap-2 cursor-pointer">
          <Checkbox
            checked={!waterTankers.isConnectedToNetwork}
            onCheckedChange={(checked) => updateWaterTankers({ isConnectedToNetwork: !checked })}
          />
          <span className="text-xs text-foreground">المسجد غير متصل بالشبكة ويحتاج صهاريج مياه</span>
        </label>

        {!waterTankers.isConnectedToNetwork && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1.5">
            <div>
              <Label className="text-[11px] mb-1 block text-muted-foreground">عدد الصهاريج (سنوياً)</Label>
              <Input
                type="number"
                min="1"
                value={waterTankers.tankersQtyPerYear || ''}
                onChange={(e) => updateWaterTankers({ tankersQtyPerYear: Number(e.target.value) })}
                className="h-8 text-xs"
              />
            </div>
            <div>
              <Label className="text-[11px] mb-1 block text-muted-foreground">سعة الصهريج</Label>
              <select
                value={waterTankers.tankerSize || 'وايت عادي (19 طن)'}
                onChange={(e) => updateWaterTankers({ tankerSize: e.target.value })}
                className="w-full h-8 rounded-md border border-input bg-background px-2.5 text-xs"
              >
                <option value="وايت عادي (19 طن)">وايت عادي (19 طن)</option>
                <option value="وايت كبير (32 طن)">وايت كبير (32 طن)</option>
                <option value="وايت صغير (10 طن)">وايت صغير (10 طن)</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* 5. البيئة العطرية */}
      <div className="p-3.5 rounded-lg border border-border/70 bg-card space-y-3">
        <h4 className="font-bold text-xs sm:text-sm text-foreground">5. البيئة العطرية</h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <Label className="text-[11px] mb-1 block text-muted-foreground">عدد أجهزة التعطير</Label>
            <Input
              type="number"
              min="0"
              value={aromatic.diffusersCount ?? ''}
              onChange={(e) => updateAromatic({ diffusersCount: Number(e.target.value) })}
              className="h-8 text-xs"
            />
          </div>
          <div>
            <Label className="text-[11px] mb-1 block text-muted-foreground">عبوات الزيت العطري (سنوياً)</Label>
            <Input
              type="number"
              min="0"
              value={aromatic.refillsPerYear ?? ''}
              onChange={(e) => updateAromatic({ refillsPerYear: Number(e.target.value) })}
              className="h-8 text-xs"
            />
          </div>
        </div>
      </div>

      {/* 6. بنود إضافية مخصصة */}
      <div className="p-3.5 rounded-lg border border-border/70 bg-card space-y-2.5">
        <div className="flex items-center justify-between">
          <h4 className="font-bold text-xs sm:text-sm text-foreground">6. بنود إضافية (اختياري)</h4>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setShowAddCustom(!showAddCustom)}
            className="h-7 text-xs"
          >
            + إضافة بند
          </Button>
        </div>

        {showAddCustom && (
          <div className="p-2.5 rounded-md bg-muted/20 border border-border/50 space-y-2">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <div className="sm:col-span-2">
                <Label className="text-[11px] mb-1 block text-muted-foreground">اسم البند</Label>
                <Input
                  value={newCustomName}
                  onChange={(e) => setNewCustomName(e.target.value)}
                  placeholder="مثال: سجاد إضافي، كراسي كبار السن..."
                  className="h-8 text-xs"
                />
              </div>
              <div>
                <Label className="text-[11px] mb-1 block text-muted-foreground">الكمية والوحدة</Label>
                <div className="flex gap-1">
                  <Input
                    type="number"
                    min="1"
                    value={newCustomQty}
                    onChange={(e) => setNewCustomQty(Number(e.target.value))}
                    className="h-8 text-xs w-16"
                  />
                  <Input
                    value={newCustomUnit}
                    onChange={(e) => setNewCustomUnit(e.target.value)}
                    placeholder="قطعة"
                    className="h-8 text-xs flex-1"
                  />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <Button type="button" variant="ghost" size="sm" onClick={() => setShowAddCustom(false)} className="h-7 text-xs">
                إلغاء
              </Button>
              <Button type="button" size="sm" onClick={handleAddCustomItem} className="h-7 text-xs">
                إضافة
              </Button>
            </div>
          </div>
        )}

        {customItems.length > 0 ? (
          <div className="divide-y divide-border/60 border border-border/60 rounded-md overflow-hidden bg-background">
            {customItems.map((item) => (
              <div key={item.id} className="p-2 flex items-center justify-between text-xs">
                <span className="font-medium text-foreground">
                  {item.name} ({item.quantity} {item.unit})
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => handleRemoveCustomItem(item.id)}
                  className="h-6 w-6 text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
};
