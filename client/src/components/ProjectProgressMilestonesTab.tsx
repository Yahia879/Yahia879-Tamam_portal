import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { 
  Plus, 
  Trash2, 
  Save, 
  Target, 
  CheckCircle2, 
  AlertTriangle, 
  Calendar, 
  Loader2, 
  Clock, 
  Layers,
  TrendingUp,
  Percent
} from "lucide-react";

export interface MilestoneItem {
  title: string;
  targetProgress?: number;
  actualStartDate?: string;
  dueDate: string;
  status: string;
  notes?: string;
}

interface Props {
  projectId: number;
  initialPlannedProgress?: number | null;
  actualProgress?: number | null;
  initialStartDate?: any;
  initialMilestones?: string | null; // JSON string or raw array
  onSaveSuccess?: () => void;
}

export default function ProjectProgressMilestonesTab({
  projectId,
  initialPlannedProgress = 0,
  actualProgress = 0,
  initialStartDate,
  initialMilestones,
  onSaveSuccess,
}: Props) {
  const [plannedProgress, setPlannedProgress] = useState<number>(initialPlannedProgress || 0);

  const formatStartDate = (val: any) => {
    if (!val) return "";
    try {
      const d = new Date(val);
      if (isNaN(d.getTime())) return "";
      return d.toISOString().split("T")[0];
    } catch {
      return "";
    }
  };

  const [actualStartDate, setActualStartDate] = useState<string>(formatStartDate(initialStartDate));

  const parsedMilestones = useMemo<MilestoneItem[]>(() => {
    if (!initialMilestones) return [];
    if (Array.isArray(initialMilestones)) return initialMilestones;
    try {
      const parsed = JSON.parse(initialMilestones);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }, [initialMilestones]);

  const [milestones, setMilestones] = useState<MilestoneItem[]>(parsedMilestones);

  useEffect(() => {
    if (initialPlannedProgress !== undefined && initialPlannedProgress !== null) {
      setPlannedProgress(initialPlannedProgress);
    }
  }, [initialPlannedProgress]);

  useEffect(() => {
    if (initialStartDate) {
      setActualStartDate(formatStartDate(initialStartDate));
    }
  }, [initialStartDate]);

  useEffect(() => {
    setMilestones(parsedMilestones);
  }, [parsedMilestones]);

  const updateMutation = trpc.projects.updateProgressAndMilestones.useMutation({
    onSuccess: () => {
      toast.success("تم حفظ الجدول الزمني والمراحل ونسبة الإنجاز المخطط بنجاح");
      if (onSaveSuccess) onSaveSuccess();
    },
    onError: (err) => {
      toast.error(`حدث خطأ أثناء الحفظ: ${err.message}`);
    },
  });

  const handleAddMilestone = () => {
    const today = new Date().toISOString().split("T")[0];
    setMilestones([
      ...milestones,
      {
        title: `المرحلة ${milestones.length + 1}`,
        targetProgress: milestones.length === 0 ? 30 : Math.min(100, (milestones[milestones.length - 1]?.targetProgress || 0) + 20),
        actualStartDate: today,
        dueDate: today,
        status: "لم يبدأ",
        notes: "",
      },
    ]);
  };

  const handleRemoveMilestone = (index: number) => {
    setMilestones(milestones.filter((_, i) => i !== index));
  };

  const handleMilestoneChange = (index: number, field: keyof MilestoneItem, value: any) => {
    const updated = [...milestones];
    updated[index] = {
      ...updated[index],
      [field]: value,
    };
    setMilestones(updated);
  };

  const handleSave = () => {
    updateMutation.mutate({
      id: projectId,
      plannedProgress: Number(plannedProgress) || 0,
      actualStartDate: actualStartDate || undefined,
      milestones: milestones.map(m => ({
        ...m,
        targetProgress: m.targetProgress !== undefined ? Number(m.targetProgress) : undefined,
      })),
    });
  };

  const effectiveActualProgress = Number(actualProgress) || 0;
  const effectivePlannedProgress = Number(plannedProgress) || 0;

  return (
    <div className="space-y-6" dir="rtl">
      {/* 1. كروت المؤشرات السريعة لمتابعة الإنجاز والجدول الزمني */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* نسبة الإنجاز الفعلي */}
        <Card className="border border-emerald-200/80 bg-emerald-50/30 shadow-2xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs text-muted-foreground font-semibold flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                نسبة الإنجاز الفعلي (المعتمدة)
              </span>
              <div className="text-2xl font-black text-emerald-800 font-sans">
                {effectiveActualProgress}%
              </div>
              <Progress value={effectiveActualProgress} className="h-1.5 w-32 bg-emerald-200/60" />
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-700">
              <TrendingUp className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        {/* نسبة الإنجاز المخطط */}
        <Card className="border border-blue-200/80 bg-blue-50/30 shadow-2xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs text-muted-foreground font-semibold flex items-center gap-1.5">
                <Target className="w-4 h-4 text-blue-600" />
                نسبة الإنجاز المخطط الإجمالية
              </span>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={plannedProgress}
                  onChange={(e) => setPlannedProgress(Number(e.target.value))}
                  className="w-20 h-8 font-black text-blue-800 text-lg font-sans border-blue-300 bg-white"
                />
                <span className="text-base font-bold text-blue-900">%</span>
              </div>
              <Progress value={effectivePlannedProgress} className="h-1.5 w-32 bg-blue-200/60" />
            </div>
            <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center text-blue-700">
              <Percent className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        {/* تاريخ البدء الفعلي للمشروع */}
        <Card className="border border-border/80 bg-card shadow-2xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs text-muted-foreground font-semibold flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-teal-600" />
                تاريخ البدء الفعلي للمشروع
              </span>
              <Input
                type="date"
                value={actualStartDate}
                onChange={(e) => setActualStartDate(e.target.value)}
                className="h-8 text-xs font-bold border-border/80 bg-background w-36 font-sans"
              />
              <span className="text-[11px] text-muted-foreground">تُحسب منه فترات التنفيذ والتقارير</span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-teal-100 dark:bg-teal-950 flex items-center justify-center text-teal-700">
              <Clock className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 2. قسم جدول المراحل الزمنية للتنفيذ */}
      <Card className="border border-border/80 shadow-xs">
        <CardHeader className="pb-3 border-b border-border/60 bg-muted/20">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Layers className="w-5 h-5 text-primary" />
              <div>
                <CardTitle className="text-base font-bold text-foreground">
                  الجدول الزمني ومراحل المشروع (Milestones)
                </CardTitle>
                <CardDescription className="text-xs">
                  تقسيم مدة المشروع إلى مراحل تنفيذية بمسمياتها، وتحديد تاريخ الاستحقاق ونسبة الإنجاز المستهدفة لكل مرحلة
                </CardDescription>
              </div>
            </div>
            <Button
              type="button"
              onClick={handleAddMilestone}
              size="sm"
              className="gap-1.5 text-xs font-bold bg-primary hover:bg-primary/90 text-white shadow-xs"
            >
              <Plus className="w-4 h-4" />
              إضافة مرحلة تنفيذية
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-4 sm:p-5 space-y-4">
          {milestones.length === 0 ? (
            <div className="text-center py-10 border border-dashed border-border/70 rounded-xl bg-muted/10 space-y-3">
              <Layers className="w-10 h-10 text-muted-foreground/40 mx-auto" />
              <div className="space-y-1">
                <p className="text-sm font-bold text-foreground">لم يتم تحديد مراحل تنفيذية لهذا المشروع بعد</p>
                <p className="text-xs text-muted-foreground">
                  يمكنك تقسيم مدة المشروع إلى مراحل (مثل: مرحلة الحفر والأساسات 30%، مرحلة العظم 70%، التشطيبات 100%)
                </p>
              </div>
              <Button
                type="button"
                onClick={handleAddMilestone}
                variant="outline"
                size="sm"
                className="gap-1.5 text-xs font-bold mt-2"
              >
                <Plus className="w-4 h-4" />
                إضافة أول مرحلة
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-border/60">
              <Table>
                <TableHeader className="bg-muted/40">
                  <TableRow>
                    <TableHead className="text-right font-bold w-12">#</TableHead>
                    <TableHead className="text-right font-bold min-w-[200px]">مسمى المرحلة التنفيذية *</TableHead>
                    <TableHead className="text-right font-bold min-w-[130px]">نسبة الإنجاز المستهدفة (%)</TableHead>
                    <TableHead className="text-right font-bold min-w-[140px]">تاريخ الاستحقاق المستهدف</TableHead>
                    <TableHead className="text-right font-bold min-w-[130px]">حالة المرحلة</TableHead>
                    <TableHead className="text-right font-bold min-w-[160px]">ملاحظات</TableHead>
                    <TableHead className="text-center font-bold w-16">إجراء</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {milestones.map((milestone, idx) => (
                    <TableRow key={idx} className="hover:bg-muted/10">
                      <TableCell className="font-bold text-muted-foreground font-sans text-center">
                        {idx + 1}
                      </TableCell>
                      <TableCell>
                        <Input
                          type="text"
                          value={milestone.title}
                          onChange={(e) => handleMilestoneChange(idx, "title", e.target.value)}
                          placeholder="مثال: المرحلة الأولى (الحفر وتأسيس القواعد)"
                          className="h-9 text-xs font-semibold bg-background"
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <Input
                            type="number"
                            min={0}
                            max={100}
                            value={milestone.targetProgress !== undefined ? milestone.targetProgress : ""}
                            onChange={(e) => handleMilestoneChange(idx, "targetProgress", e.target.value ? Number(e.target.value) : "")}
                            placeholder="30"
                            className="h-9 w-20 text-xs font-bold text-center font-sans bg-background"
                          />
                          <span className="text-xs font-bold text-muted-foreground">%</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Input
                          type="date"
                          value={milestone.dueDate || ""}
                          onChange={(e) => handleMilestoneChange(idx, "dueDate", e.target.value)}
                          className="h-9 text-xs font-medium font-sans bg-background"
                        />
                      </TableCell>
                      <TableCell>
                        <Select
                          value={milestone.status || "لم يبدأ"}
                          onValueChange={(val) => handleMilestoneChange(idx, "status", val)}
                        >
                          <SelectTrigger className="h-9 text-xs font-semibold bg-background">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="لم يبدأ">لم يبدأ</SelectItem>
                            <SelectItem value="قيد التنفيذ">قيد التنفيذ</SelectItem>
                            <SelectItem value="مكتمل">مكتمل</SelectItem>
                            <SelectItem value="متأخر">متأخر</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Input
                          type="text"
                          value={milestone.notes || ""}
                          onChange={(e) => handleMilestoneChange(idx, "notes", e.target.value)}
                          placeholder="ملاحظات تفصيلية..."
                          className="h-9 text-xs bg-background"
                        />
                      </TableCell>
                      <TableCell className="text-center">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveMilestone(idx)}
                          className="h-8 w-8 text-destructive hover:bg-destructive/10 rounded-lg"
                          title="حذف المرحلة"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {/* تلميح وتوضيح منطق المستخلصات */}
          <div className="p-3.5 rounded-xl bg-amber-50/70 border border-amber-200/80 text-amber-900 text-xs space-y-1">
            <div className="flex items-center gap-1.5 font-bold text-amber-800">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>ملاحظة عن آلية ربط المستخلصات بالمراحل:</span>
            </div>
            <p className="leading-relaxed text-amber-900/90 pr-5">
              تحديد المراحل ونسب الإنجاز المستهدفة هنا يُعتبر المرجع للجدول الزمني. عند إصدار أي مستخلص مالي، يتم مقارنة الدفعة بنسبة الإنجاز الفعلي المعتمدة للمشروع، ويتم إشعارك تلقائياً إذا كانت الدفعة أعلى من نسبة الإنجاز المسجلة في تقرير الإنجاز للتحقق والتأكيد.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* زر الحفظ السفلي */}
      <div className="flex justify-end pt-2">
        <Button
          type="button"
          onClick={handleSave}
          disabled={updateMutation.isPending}
          className="gap-2 bg-teal-600 hover:bg-teal-700 text-white font-bold px-6 shadow-md h-10"
        >
          {updateMutation.isPending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          حفظ الجدول الزمني ومراحل المشروع
        </Button>
      </div>
    </div>
  );
}
