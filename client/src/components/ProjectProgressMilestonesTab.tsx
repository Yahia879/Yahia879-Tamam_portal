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
      {/* قسم تاريخ البدء الفعلي والإنجاز المخطط */}
      <Card className="border border-border/70 shadow-xs rounded-2xl bg-card overflow-hidden">
        <CardHeader className="p-5 border-b border-border/50 bg-muted/20">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <Target className="w-5 h-5" />
            </div>
            <div>
              <CardTitle className="text-base font-bold text-foreground">تاريخ البدء الفعلي للمشروع والإنجاز</CardTitle>
              <CardDescription className="text-xs text-muted-foreground mt-0.5">
                تحديد تاريخ البدء الفعلي للمشروع وتتبع مؤشرات الأداء والجدول الزمني التقديري
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-muted/30 border border-border/40 space-y-2">
              <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-primary" />
                <span>تاريخ البدء الفعلي:</span>
              </Label>
              <Input
                type="date"
                value={actualStartDate}
                onChange={(e) => setActualStartDate(e.target.value)}
                className="h-10 text-xs font-semibold border-border/70 bg-background rounded-xl focus-visible:ring-primary"
              />
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                يُستخدم تاريخ البدء الفعلي لحساب مدة التنفيذ ومقارنتها بالخطة المستهدفة تلقائياً.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-muted/30 border border-border/40 space-y-2">
              <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>نسبة الإنجاز الفعلي الحالية:</span>
              </Label>
              <div className="h-10 px-3.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300">مقرونة بالتقارير الميدانية</span>
                <span className="font-extrabold text-emerald-700 dark:text-emerald-300 font-mono text-sm">{actualProgress || 0}%</span>
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                يتم تحديث نسبة الإنجاز الفعلي تلقائياً بناءً على تقارير متابعة مراحل وحالات التنفيذ.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* زر الحفظ السفلي */}
      <div className="flex justify-end pt-2">
        <Button
          type="button"
          onClick={handleSave}
          disabled={updateMutation.isPending}
          className="gap-2 gradient-primary text-white font-bold px-6 h-11 rounded-xl shadow-md hover:shadow-lg transition-all text-xs"
        >
          {updateMutation.isPending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          <span>حفظ التغييرات والمعلومات</span>
        </Button>
      </div>
    </div>
  );
}
