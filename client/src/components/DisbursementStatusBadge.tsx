import { Badge } from "@/components/ui/badge";
import { Clock, CheckCircle2, XCircle, Banknote, FileCheck, AlertCircle } from "lucide-react";

type DisbursementRequestStatus = "draft" | "pending" | "pending_executive" | "approved" | "rejected" | "paid";
type DisbursementOrderStatus = "pending" | "approved" | "executed" | "cancelled" | "rejected" | "edited";

interface DisbursementStatusBadgeProps {
  status: string;
  type: "request" | "order";
}

const REQUEST_STATUS_CONFIG: Record<
  DisbursementRequestStatus,
  { label: string; variant: "default" | "secondary" | "destructive" | "outline"; className: string; icon: React.ReactNode }
> = {
  draft: {
    label: "مسودة",
    variant: "secondary",
    className: "border-gray-300 text-gray-700 bg-gray-100",
    icon: <Clock className="h-3 w-3" />,
  },
  pending: {
    label: "بانتظار اعتماد مُعد الطلب",
    variant: "outline",
    className: "border-amber-500 text-amber-700 bg-amber-50",
    icon: <Clock className="h-3 w-3" />,
  },
  pending_executive: {
    label: "بانتظار اعتماد المدير التنفيذي",
    variant: "outline",
    className: "border-orange-500 text-orange-700 bg-orange-50 font-bold",
    icon: <Clock className="h-3 w-3 animate-pulse" />,
  },
  approved: {
    label: "معتمد",
    variant: "outline",
    className: "border-green-500 text-green-700 bg-green-50",
    icon: <CheckCircle2 className="h-3 w-3" />,
  },
  rejected: {
    label: "مرفوض",
    variant: "destructive",
    className: "border-red-500 text-red-700 bg-red-50",
    icon: <XCircle className="h-3 w-3" />,
  },
  paid: {
    label: "مصروف",
    variant: "outline",
    className: "border-blue-500 text-blue-700 bg-blue-50",
    icon: <Banknote className="h-3 w-3" />,
  },
};

const ORDER_STATUS_CONFIG: Record<
  DisbursementOrderStatus,
  { label: string; variant: "default" | "secondary" | "destructive" | "outline"; className: string; icon: React.ReactNode }
> = {
  pending: {
    label: "قيد الاعتماد",
    variant: "outline",
    className: "border-yellow-500 text-yellow-700 bg-yellow-50",
    icon: <Clock className="h-3 w-3" />,
  },
  approved: {
    label: "معتمد",
    variant: "outline",
    className: "border-green-500 text-green-700 bg-green-50",
    icon: <FileCheck className="h-3 w-3" />,
  },
  executed: {
    label: "منفذ",
    variant: "outline",
    className: "border-blue-500 text-blue-700 bg-blue-50",
    icon: <Banknote className="h-3 w-3" />,
  },
  cancelled: {
    label: "ملغي",
    variant: "destructive",
    className: "border-gray-500 text-gray-700 bg-gray-50",
    icon: <AlertCircle className="h-3 w-3" />,
  },
  rejected: {
    label: "مرفوض",
    variant: "destructive",
    className: "border-red-500 text-red-700 bg-red-50",
    icon: <XCircle className="h-3 w-3" />,
  },
  edited: {
    label: "تم التعديل",
    variant: "outline",
    className: "border-purple-500 text-purple-700 bg-purple-50",
    icon: <FileCheck className="h-3 w-3" />,
  },
};

export function DisbursementStatusBadge({ status, type }: DisbursementStatusBadgeProps) {
  const config = type === "request" 
    ? REQUEST_STATUS_CONFIG[status as DisbursementRequestStatus]
    : ORDER_STATUS_CONFIG[status as DisbursementOrderStatus];

  if (!config) {
    return <Badge variant="outline">غير محدد</Badge>;
  }

  return (
    <Badge variant={config.variant} className={`gap-1 ${config.className}`}>
      {config.icon}
      {config.label}
    </Badge>
  );
}
