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
      {/* قسم تاريخ البدء الفعلي */}
      <Card className="border-border/80 shadow-xs">
        <CardHeader className="pb-3 border-b border-border/60">
          <div className="flex items-center gap-2">
            <Target className="w-5 h-5 text-teal-600" />
            <div>
              <CardTitle className="text-base font-bold">تاريخ البدأ الفعلي للمشروع</CardTitle>
              <CardDescription className="text-xs">تحديد تاريخ البدأ الفعلي للمشروع لتنعكس التواريخ تلقائياً في حساب فترات التنفيذ والتقارير</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-4 pb-4">
          <div className="flex items-center gap-3">
            <Label className="text-xs font-bold text-foreground whitespace-nowrap">تاريخ البدأ الفعلي:</Label>
            <Input
              type="date"
              value={actualStartDate}
              onChange={(e) => setActualStartDate(e.target.value)}
              className="h-9 w-48 text-xs font-semibold border-border/80 bg-background"
            />
          </div>
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
          حفظ تاريخ البدء الفعلي
        </Button>
      </div>
    </div>
  );
}
