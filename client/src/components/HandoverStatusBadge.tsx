import { Badge } from "@/components/ui/badge";
import { Clock, CheckCircle2, XCircle, FileCheck } from "lucide-react";

type HandoverStatus = "pending" | "approved" | "rejected" | "completed";

interface HandoverStatusBadgeProps {
  status: HandoverStatus;
  className?: string;
}

const statusConfig = {
  pending: {
    label: "قيد المراجعة",
    variant: "secondary" as const,
    icon: Clock,
    className: "bg-yellow-100 text-yellow-800 hover:bg-yellow-100",
  },
  approved: {
    label: "معتمد",
    variant: "default" as const,
    icon: CheckCircle2,
    className: "bg-green-100 text-green-800 hover:bg-green-100",
  },
  rejected: {
    label: "مرفوض",
    variant: "destructive" as const,
    icon: XCircle,
    className: "bg-red-100 text-red-800 hover:bg-red-100",
  },
  completed: {
    label: "مكتمل",
    variant: "default" as const,
    icon: FileCheck,
    className: "bg-blue-100 text-blue-800 hover:bg-blue-100",
  },
};

export function HandoverStatusBadge({ status, className }: HandoverStatusBadgeProps) {
  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <Badge variant={config.variant} className={`${config.className} ${className || ""}`}>
      <Icon className="ml-1 h-3 w-3" />
      {config.label}
    </Badge>
  );
}
