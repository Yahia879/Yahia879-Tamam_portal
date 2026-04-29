import { Badge } from "@/components/ui/badge";
import { Clock, CheckCircle2, XCircle, Banknote, FileCheck, AlertCircle } from "lucide-react";

type DisbursementRequestStatus = "pending" | "approved" | "rejected" | "paid";
type DisbursementOrderStatus = "pending" | "approved" | "executed" | "cancelled";

interface DisbursementStatusBadgeProps {
  status: DisbursementRequestStatus | DisbursementOrderStatus;
  type: "request" | "order";
}

const REQUEST_STATUS_CONFIG: Record<
  DisbursementRequestStatus,
  { label: string; variant: "default" | "secondary" | "destructive" | "outline"; className: string; icon: React.ReactNode }
> = {
  pending: {
    label: "قيد المراجعة",
    variant: "outline",
    className: "border-yellow-500 text-yellow-700 bg-yellow-50",
    icon: <Clock className="h-3 w-3" />,
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
    label: "مدفوع",
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
