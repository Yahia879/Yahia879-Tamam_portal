import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { REQUEST_STAGES } from "../../../shared/constants";

interface StatusBadgeProps {
  stage: string;
  className?: string;
  showProgress?: boolean;
  requestTrack?: 'standard' | 'fast_track';
}

// حساب نسبة التقدم بناءً على المرحلة
const calculateProgress = (stage: string, track: 'standard' | 'fast_track' = 'standard'): number => {
  const stages = Object.values(REQUEST_STAGES);
  const stageIndex = stages.findIndex((s: any) => s.key === stage);
  if (stageIndex === -1) return 0;
  
  const totalStages = track === 'fast_track' ? 9 : 11;
  return Math.round(((stageIndex + 1) / totalStages) * 100);
};

// الحصول على لون المرحلة
const getStageColor = (stage: string): string => {
  const stageColors: Record<string, string> = {
    submitted: "bg-blue-100 text-blue-800 border-blue-200",
    initial_review: "bg-indigo-100 text-indigo-800 border-indigo-200",
    field_visit: "bg-purple-100 text-purple-800 border-purple-200",
    technical_eval: "bg-amber-100 text-amber-800 border-amber-200",
    boq_preparation: "bg-orange-100 text-orange-800 border-orange-200",
    financial_eval: "bg-cyan-100 text-cyan-800 border-cyan-200",
    quotation_approval: "bg-teal-100 text-teal-800 border-teal-200",
    contracting: "bg-emerald-100 text-emerald-800 border-emerald-200",
    execution: "bg-green-100 text-green-800 border-green-200",
    handover: "bg-lime-100 text-lime-800 border-lime-200",
    closure: "bg-gray-100 text-gray-800 border-gray-200",
  };
  
  return stageColors[stage] || "bg-gray-100 text-gray-800 border-gray-200";
};

export default function StatusBadge({ 
  stage, 
  className, 
  showProgress = false,
  requestTrack = 'standard' 
}: StatusBadgeProps) {
  const stages = Object.values(REQUEST_STAGES);
  const stageInfo = stages.find((s: any) => s.key === stage);
  const progress = calculateProgress(stage, requestTrack);
  const colorClass = getStageColor(stage);
  
  if (!stageInfo) {
    return (
      <Badge variant="outline" className={cn("border", className)}>
        غير محدد
      </Badge>
    );
  }
  
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Badge 
        variant="outline" 
        className={cn("border font-medium", colorClass)}
      >
        {stageInfo.name}
      </Badge>
      {showProgress && (
        <span className="text-sm text-muted-foreground">
          {progress}%
        </span>
      )}
    </div>
  );
}
