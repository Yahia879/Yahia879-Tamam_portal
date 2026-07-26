import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Plus, Trash2, Save, Target, CheckCircle2, AlertTriangle, Calendar, Loader2 } from "lucide-react";

interface MilestoneItem {
  title: string;
  dueDate: string;
  status: string;
}

interface Props {
  projectId: number;
  initialPlannedProgress?: number | null;
  actualProgress?: number | null;
  initialMilestones?: string | null; // JSON string or raw array
  onSaveSuccess?: () => void;
}

export default function ProjectProgressMilestonesTab({
  projectId,
  initialPlannedProgress = 0,
  actualProgress = 0,
  initialMilestones,
  onSaveSuccess,
}: Props) {
  const [plannedProgress, setPlannedProgress] = useState<number>(initialPlannedProgress || 0);

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
    setMilestones(parsedMilestones);
  }, [parsedMilestones]);

  const updateMutation = trpc.projects.updateProgressAndMilestones.useMutation({
    onSuccess: () => {
      toast.success("تم حفظ نسبة الإنجاز المخطط ومعالم المشروع بنجاح");
      if (onSaveSuccess) onSaveSuccess();
    },
    onError: (err) => {
      toast.error(`حدث خطأ أثناء الحفظ: ${err.message}`);
    },
  });

  const handleAddMilestone = () => {
    setMilestones([
      ...milestones,
      { title: "", dueDate: new Date().toISOString().split("T")[0], status: "لم يبدأ" },
    ]);
  };

  const handleRemoveMilestone = (index: number) => {
    setMilestones(milestones.filter((_, i) => i !== index));
  };

  const handleMilestoneChange = (index: number, field: keyof MilestoneItem, value: string) => {
    const updated = [...milestones];
    updated[index][field] = value;
    setMilestones(updated);
  };

  const gap = (plannedProgress || 0) - (actualProgress || 0);
  let ragBadge = { text: "أخضر (مطابق)", color: "bg-emerald-500 text-white" };
  if (gap > 25) {
    ragBadge = { text: "أحمر (تأخير كبير)", color: "bg-rose-500 text-white" };
  } else if (gap > 5) {
    ragBadge = { text: "أصفر (تأخير بسيط)", color: "bg-amber-500 text-white" };
  }

  const handleSave = () => {
    updateMutation.mutate({
      id: projectId,
      plannedProgress: Number(plannedProgress) || 0,
      milestones: milestones,
    });
  };

  return (
    <div className="space-y-6" dir="rtl">
      {/* قسم الإنجاز المخطط vs الفعلي */}
      <Card className="border-border/80 shadow-xs">
        <CardHeader className="pb-3 border-b border-border/60">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Target className="w-5 h-5 text-teal-600" />
              <div>
                <CardTitle className="text-base font-bold">خطة نسبة الإنجاز المخطط</CardTitle>
                <CardDescription className="text-xs">تحديد نسبة الإنجاز المخططة للمشروع ومقارنتها بالإنجاز الفعلي</CardDescription>
              </div>
            </div>
            <Badge className={`${ragBadge.color} text-xs px-3 py-1 font-semibold`}>
              {ragBadge.text}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="pt-5">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
            <div className="space-y-2">
              <Label className="text-xs font-bold text-foreground">نسبة الإنجاز المخطط (%)</Label>
              <Input
                type="number"
                min={0}
                max={100}
                value={plannedProgress}
                onChange={(e) => setPlannedProgress(Math.min(100, Math.max(0, Number(e.target.value))))}
                placeholder="أدخل نسبة الإنجاز المخطط"
                className="h-10 text-sm font-semibold border-border/80"
              />
              <p className="text-[11px] text-muted-foreground">النسبة المخططة من الجدول الزمني الإجمالي للمشروع</p>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold text-foreground">نسبة الإنجاز الفعلية الحالية (%)</Label>
              <Input
                type="number"
                disabled
                value={actualProgress || 0}
                className="h-10 text-sm font-semibold bg-muted/50 border-border/60 text-muted-foreground"
              />
              <p className="text-[11px] text-muted-foreground">تُحسب تلقائياً من نسبة تقدم المشروع</p>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold text-foreground">الفارق / الانحراف</Label>
              <div className="h-10 px-3 rounded-md border border-border/60 bg-muted/20 flex items-center justify-between font-bold text-sm">
                <span>فارق التقدّم:</span>
                <span className={gap > 5 ? "text-rose-600 font-extrabold" : "text-emerald-600 font-extrabold"}>
                  {gap > 0 ? `تأخير ${gap}%` : gap < 0 ? `متقدم ${Math.abs(gap)}%` : "مطابق 0%"}
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground">الانحراف الموجب يعني تأخراً عن الجدول الزمني</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* قسم جدول المعالم الرئيسية */}
      <Card className="border-border/80 shadow-xs">
        <CardHeader className="pb-3 border-b border-border/60">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-teal-600" />
              <div>
                <CardTitle className="text-base font-bold">جدول التقدم مقابل المعالم الرئيسية للمشروع</CardTitle>
                <CardDescription className="text-xs">إضافة المعالم الرئيسية والتواريخ المستهدفة لتنعكس تلقائياً في التقارير الدوريّة</CardDescription>
              </div>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleAddMilestone}
              className="gap-2 text-xs font-bold border-teal-600/30 text-teal-700 bg-teal-50 hover:bg-teal-100"
            >
              <Plus className="w-4 h-4" />
              إضافة معلم رئيسي جديد
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {milestones.length === 0 ? (
            <div className="p-8 text-center space-y-3">
              <p className="text-xs text-muted-foreground">لا توجد معالم رئيسية مضافة للمشروع حالياً.</p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddMilestone}
                className="gap-2 text-xs font-bold mx-auto"
              >
                <Plus className="w-4 h-4" />
                إضافة أوّل معلم رئيسي
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader className="bg-muted/40">
                <TableRow>
                  <TableHead className="text-xs font-bold text-right">#</TableHead>
                  <TableHead className="text-xs font-bold text-right min-w-[220px]">اسم المعلم الرئيسية</TableHead>
                  <TableHead className="text-xs font-bold text-right min-w-[150px]">التاريخ المستهدف</TableHead>
                  <TableHead className="text-xs font-bold text-right min-w-[140px]">حالة المعلم</TableHead>
                  <TableHead className="text-xs font-bold text-center w-20">حذف</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {milestones.map((m, idx) => (
                  <TableRow key={idx} className="hover:bg-muted/30">
                    <TableCell className="font-mono text-xs font-bold text-muted-foreground text-right">{idx + 1}</TableCell>
                    <TableCell>
                      <Input
                        value={m.title}
                        onChange={(e) => handleMilestoneChange(idx, "title", e.target.value)}
                        placeholder="أدخل اسم المعلم الرئيسي (مثال: الانتهاء من صب الهيكل)"
                        className="h-9 text-xs border-border/80"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="date"
                        value={m.dueDate ? String(m.dueDate).substring(0, 10) : ""}
                        onChange={(e) => handleMilestoneChange(idx, "dueDate", e.target.value)}
                        className="h-9 text-xs border-border/80"
                      />
                    </TableCell>
                    <TableCell>
                      <Select
                        value={m.status || "لم يبدأ"}
                        onValueChange={(val) => handleMilestoneChange(idx, "status", val)}
                      >
                        <SelectTrigger className="h-9 text-xs border-border/80 bg-background">
                          <SelectValue placeholder="حالة المعلم" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="لم يبدأ" className="text-xs">لم يبدأ</SelectItem>
                          <SelectItem value="جارٍ" className="text-xs text-blue-600 font-semibold">جارٍ التنفيذ</SelectItem>
                          <SelectItem value="منجز" className="text-xs text-emerald-600 font-semibold">منجز</SelectItem>
                          <SelectItem value="متأخر" className="text-xs text-rose-600 font-semibold">متأخر</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="text-center">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveMilestone(idx)}
                        className="h-8 w-8 text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* زر الحفظ السفلي */}
      <div className="flex justify-end pt-2">
        <Button
          type="button"
          onClick={handleSave}
          disabled={updateMutation.isPending}
          className="gap-2 bg-teal-600 hover:bg-teal-700 text-white font-bold px-6 shadow-md"
        >
          {updateMutation.isPending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          حفظ نسبة الإنجاز والمعالم
        </Button>
      </div>
    </div>
  );
}
