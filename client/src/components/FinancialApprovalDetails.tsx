import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, Building2, DollarSign, Calendar, User } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface FinancialApprovalDetailsProps {
  quotationNumber: string;
  supplierName: string;
  totalAmount: string;
  finalAmount: string;
  approvedAt?: string;
  approvedBy?: string;
  includesTax?: boolean;
  taxRate?: string;
  taxAmount?: string;
  discountType?: string;
  discountValue?: string;
  discountAmount?: string;
}

export function FinancialApprovalDetails({
  quotationNumber,
  supplierName,
  totalAmount,
  finalAmount,
  approvedAt,
  approvedBy,
  includesTax,
  taxRate,
  taxAmount,
  discountType,
  discountValue,
  discountAmount,
}: FinancialApprovalDetailsProps) {
  const formatDate = (dateString?: string) => {
    if (!dateString) return "غير محدد";
    return new Date(dateString).toLocaleDateString("ar-SA", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <Card className="border-green-200 bg-green-50/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-green-700">
          <CheckCircle2 className="h-5 w-5" />
          تفاصيل الاعتماد المالي
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* معلومات العرض المعتمد */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <DollarSign className="h-4 w-4 text-green-700" />
            </div>
            <div className="flex-1">
              <p className="text-sm text-muted-foreground">رقم العرض المعتمد</p>
              <p className="font-medium">{quotationNumber}</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <Building2 className="h-4 w-4 text-green-700" />
            </div>
            <div className="flex-1">
              <p className="text-sm text-muted-foreground">المورد</p>
              <p className="font-medium">{supplierName}</p>
            </div>
          </div>
        </div>

        {/* تفاصيل المبلغ */}
        <div className="border-t pt-4">
          <h4 className="text-sm font-medium mb-3">تفاصيل المبلغ</h4>
          <div className="space-y-2 bg-white p-4 rounded-lg">
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">المبلغ الأصلي</span>
              <span className="font-medium">{parseFloat(totalAmount).toLocaleString("ar-SA")} ريال</span>
            </div>

            {includesTax && taxAmount && parseFloat(taxAmount) > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">
                  الضريبة ({taxRate}%)
                </span>
                <span className="text-green-600">+{parseFloat(taxAmount).toLocaleString("ar-SA")} ريال</span>
              </div>
            )}

            {discountAmount && parseFloat(discountAmount) > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">
                  الخصم ({discountType === "percentage" ? `${discountValue}%` : "ثابت"})
                </span>
                <span className="text-red-600">-{parseFloat(discountAmount).toLocaleString("ar-SA")} ريال</span>
              </div>
            )}

            <div className="flex justify-between pt-2 border-t">
              <span className="font-medium">المبلغ النهائي المعتمد</span>
              <span className="font-bold text-green-700 text-lg">
                {parseFloat(finalAmount).toLocaleString("ar-SA")} ريال
              </span>
            </div>
          </div>
        </div>

        {/* معلومات الاعتماد */}
        <div className="border-t pt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {approvedAt && (
              <div className="flex items-start gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Calendar className="h-4 w-4 text-green-700" />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground">تاريخ الاعتماد</p>
                  <p className="font-medium text-sm">{formatDate(approvedAt)}</p>
                </div>
              </div>
            )}

            {approvedBy && (
              <div className="flex items-start gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <User className="h-4 w-4 text-green-700" />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground">المعتمد من</p>
                  <p className="font-medium">{approvedBy}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="pt-2">
          <Badge variant="outline" className="bg-green-100 text-green-700 border-green-300">
            ✓ تم الاعتماد المالي
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}
