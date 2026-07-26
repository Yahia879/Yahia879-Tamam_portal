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
  actualStartDate?: string;
  dueDate: string;
  status: string;
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
      toast.success("تم حفظ نسبة الإنجاز المخطط وتاريخ البدء الفعلي ومعالم المشروع بنجاح");
      if (onSaveSuccess) onSaveSuccess();
    },
    onError: (err) => {
      toast.error(`حدث خطأ أثناء الحفظ: ${err.message}`);
    },
  });

  const handleAddMilestone = () => {
    setMilestones([
      ...milestones,
      {
        title: "",
        actualStartDate: new Date().toISOString().split("T")[0],
        dueDate: new Date().toISOString().split("T")[0],
        status: "لم يبدأ",
      },
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

  const handleSave = () => {
    updateMutation.mutate({
      id: projectId,
      plannedProgress: Number(plannedProgress) || 0,
      actualStartDate: actualStartDate || undefined,
      milestones: milestones,
    });
  };

  return (
    <div className="space-y-6" dir="rtl">
      {/* قسم الإنجاز المخطط وتاريخ البدء الفعلي */}
      <Card className="border-border/80 shadow-xs">
        <CardHeader className="pb-3 border-b border-border/60">
          <div className="flex items-center gap-2">
            <Target className="w-5 h-5 text-teal-600" />
            <div>
              <CardTitle className="text-base font-bold">خطّة الإنجاز وتاريخ البدأ الفعلي للمشروع</CardTitle>
              <CardDescription className="text-xs">تحديد نسبة الإنجاز المخططة وتاريخ البدأ الفعلي للمشروع لتنعكس تلقائياً في التقارير والبطاقات</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-4 pb-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 items-center">
            <div className="flex items-center gap-3">
              <Label className="text-xs font-bold text-foreground whitespace-nowrap">نسبة الإنجاز المخطط (%):</Label>
              <div className="flex items-center gap-1.5">
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={plannedProgress === 0 ? "" : plannedProgress}
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => setPlannedProgress(e.target.value === "" ? 0 : Math.min(100, Math.max(0, Number(e.target.value))))}
                  placeholder="0"
                  className="h-9 w-24 text-center text-sm font-bold border-border/80 text-teal-700 bg-background"
                />
                <span className="text-sm font-extrabold text-teal-700">%</span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Label className="text-xs font-bold text-foreground whitespace-nowrap">تاريخ البدأ الفعلي:</Label>
              <Input
                type="date"
                value={actualStartDate}
                onChange={(e) => setActualStartDate(e.target.value)}
                className="h-9 w-44 text-xs font-semibold border-border/80 bg-background"
              />
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
                  <TableHead className="text-xs font-bold text-right min-w-[200px]">اسم المعلم الرئيسية</TableHead>
                  <TableHead className="text-xs font-bold text-right min-w-[140px]">تاريخ البدأ الفعلي</TableHead>
                  <TableHead className="text-xs font-bold text-right min-w-[140px]">التاريخ المستهدف (الإنجاز)</TableHead>
                  <TableHead className="text-xs font-bold text-right min-w-[130px]">حالة المعلم</TableHead>
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
                        value={m.actualStartDate ? String(m.actualStartDate).substring(0, 10) : ""}
                        onChange={(e) => handleMilestoneChange(idx, "actualStartDate", e.target.value)}
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
