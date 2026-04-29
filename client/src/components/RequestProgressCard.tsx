import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, Circle, Clock } from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface ChecklistItem {
  id: string;
  label: string;
  completed: boolean;
  required: boolean;
}

interface RequestProgressCardProps {
  stage: string;
  checklist: ChecklistItem[];
}

export function RequestProgressCard({ stage, checklist }: RequestProgressCardProps) {
  const completedCount = checklist.filter(item => item.completed).length;
  const totalCount = checklist.length;
  const progress = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  const stageLabels: Record<string, string> = {
    submitted: "تقديم الطلب",
    initial_review: "المراجعة الأولية",
    field_visit: "الزيارة الميدانية",
    technical_eval: "التقييم الفني",
    financial_eval: "التقييم المالي",
    contracting: "التعاقد",
    execution: "التنفيذ",
    closed: "مغلق",
  };

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Clock className="w-5 h-5 text-primary" />
            تقدم المرحلة: {stageLabels[stage] || stage}
          </CardTitle>
          <span className="text-sm font-medium text-muted-foreground">
            {completedCount} من {totalCount} مكتمل
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <Progress value={progress} className="h-2" />
        
        <div className="space-y-2">
          {checklist.map((item) => (
            <div
              key={item.id}
              className={`flex items-start gap-3 p-2 rounded-lg transition-colors ${
                item.completed ? "bg-green-50 dark:bg-green-950/20" : "bg-background"
              }`}
            >
              {item.completed ? (
                <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
              ) : (
                <Circle className="w-5 h-5 text-muted-foreground shrink-0 mt-0.5" />
              )}
              <div className="flex-1">
                <p className={`text-sm ${item.completed ? "text-green-700 dark:text-green-400 line-through" : "text-foreground"}`}>
                  {item.label}
                  {item.required && !item.completed && (
                    <span className="text-red-500 mr-1">*</span>
                  )}
                </p>
              </div>
            </div>
          ))}
        </div>

        {completedCount === totalCount && (
          <div className="p-3 bg-green-100 dark:bg-green-950/30 rounded-lg text-center">
            <p className="text-sm font-medium text-green-700 dark:text-green-400">
              ✓ تم إكمال جميع الإجراءات المطلوبة في هذه المرحلة
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
