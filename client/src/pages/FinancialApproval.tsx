import { useState } from "react";
import { useLocation } from "wouter";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { usePermission } from "@/hooks/usePermission";
import {
  CheckSquare,
  Eye,
  CheckCircle2,
  Loader2,
  FileText,
  Calculator,
  Receipt,
  ClipboardList,
  TrendingDown,
  DollarSign,
  Building2,
} from "lucide-react";

export default function FinancialApproval() {
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const [selectedRequestId, setSelectedRequestId] = useState<string>("");
  const [selectedQuotationId, setSelectedQuotationId] = useState<number | null>(null);
  const [showApprovalDialog, setShowApprovalDialog] = useState(false);
  const [approvalNotes, setApprovalNotes] = useState("");

  const utils = trpc.useUtils();

  // جلب الطلبات في مرحلة التقييم المالي
  const { data: requests } = trpc.requests.search.useQuery({
    currentStage: "financial_eval_and_approval",
  });

  // جلب جدول الكميات للطلب
  const { data: boqData, isLoading: boqLoading } = trpc.projects.getBOQ.useQuery(
    { requestId: parseInt(selectedRequestId) || 0 },
    { enabled: !!selectedRequestId }
  );

  // جلب عروض الأسعار للطلب
  const { data: quotationsData, isLoading: quotationsLoading, refetch: refetchQuotations } = trpc.projects.getQuotationsByRequest.useQuery(
    { requestId: parseInt(selectedRequestId) || 0 },
    { enabled: !!selectedRequestId }
  );

  // جلب تفاصيل الطلب لمعرفة العرض المختار
  const { data: requestDetails } = trpc.requests.getById.useQuery(
    { id: parseInt(selectedRequestId) || 0 },
    { enabled: !!selectedRequestId }
  );

  // اختيار عرض السعر الفائز
  const selectWinningMutation = trpc.requests.selectWinningQuotation.useMutation({
    onSuccess: () => {
      toast.success("تم اختيار العرض الفائز بنجاح");
      refetchQuotations();
      utils.requests.getById.invalidate({ id: parseInt(selectedRequestId) });
    },
    onError: (error: any) => {
      toast.error(error.message || "حدث خطأ أثناء اختيار العرض");
    },
  });

  // الاعتماد المالي النهائي
  const approveMutation = trpc.requests.approveFinancially.useMutation({
    onSuccess: () => {
      const approvedQuotation = selectedQuotation;
      const supplierName = approvedQuotation?.supplierName || "غير محدد";
      const finalAmount = parseFloat(approvedQuotation?.finalAmount || approvedQuotation?.totalAmount || "0").toLocaleString("ar-SA");
      const quotationNumber = approvedQuotation?.quotationNumber || "";
      
      toast.success(
        `✅ تم الاعتماد المالي بنجاح!\n\n` +
        `📄 رقم العرض: ${quotationNumber}\n` +
        `🏭 المورد: ${supplierName}\n` +
        `💰 المبلغ النهائي: ${finalAmount} ريال\n\n` +
        `➡️ تم الانتقال إلى مرحلة التعاقد`,
        { duration: 5000 }
      );
      
      // تأخير قصير قبل إغلاق الـ dialog
      setTimeout(() => {
        setShowApprovalDialog(false);
        setSelectedRequestId("");
        setSelectedQuotationId(null);
        utils.requests.search.invalidate();
      }, 1500);
    },
    onError: (error: any) => {
      toast.error(error.message || "حدث خطأ أثناء الاعتماد المالي");
    },
  });

  const handleSelectWinning = () => {
    if (!selectedQuotationId) {
      toast.error("يرجى اختيار عرض سعر");
      return;
    }

    selectWinningMutation.mutate({
      requestId: parseInt(selectedRequestId),
      quotationId: selectedQuotationId,
    });
  };

  const handleApprove = () => {
    if (!selectedRequestId) return;

    approveMutation.mutate({
      requestId: parseInt(selectedRequestId),
      approvalNotes,
    });
  };

  // حساب التكاليف
  const boqTotal = boqData?.total || 0;
  const selectedQuotation = quotationsData?.quotations?.find((q: any) => 
    requestDetails?.selectedQuotationId ? q.quotationNumber === requestDetails.selectedQuotationId : q.id === selectedQuotationId
  );
  const finalAmount = selectedQuotation ? parseFloat(selectedQuotation.finalAmount || selectedQuotation.totalAmount) : 0;

  const isLoading = boqLoading || quotationsLoading;

  // التحقق من جاهزية الاعتماد
  const hasBoq = boqData?.items && boqData.items.length > 0;
  const hasQuotations = quotationsData?.quotations && quotationsData.quotations.length > 0;
  const hasSelectedQuotation = !!requestDetails?.selectedQuotationId || !!selectedQuotationId;

  // التحقق من الصلاحيات
  const hasApprove = usePermission("financial_approval.approve");
  const isSuperOrSystem = ["super_admin", "system_admin"].includes(user?.role || "");
  const canSelectWinning = hasApprove || isSuperOrSystem;
  const canApprove = hasApprove || isSuperOrSystem;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* العنوان */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">الاعتماد المالي</h1>
            <p className="text-muted-foreground">مقارنة عروض الأسعار واختيار العرض الأفضل واعتماد التكلفة النهائية</p>
          </div>
        </div>

        {/* اختيار الطلب */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              اختيار الطلب
            </CardTitle>
            <CardDescription>اختر الطلب لمراجعة عروض الأسعار واعتماد التكلفة النهائية</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4 items-end">
              <div className="flex-1">
                <Label>الطلب</Label>
                <Select value={selectedRequestId} onValueChange={(value) => {
                  setSelectedRequestId(value);
                  setSelectedQuotationId(null);
                }}>
                  <SelectTrigger>
                    <SelectValue placeholder="اختر الطلب..." />
                  </SelectTrigger>
                  <SelectContent>
                    {requests?.requests?.map((request: any) => (
                      <SelectItem key={request.id} value={request.id.toString()}>
                        {request.requestNumber} - {request.mosqueName || "طلب جديد"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* محتوى الصفحة */}
        {selectedRequestId && (
          <>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : (
              <>
                {/* التحقق من المتطلبات */}
                {!hasBoq && (
                  <Card className="border-red-500">
                    <CardContent className="pt-6">
                      <div className="flex items-center gap-4 text-red-600">
                        <ClipboardList className="h-8 w-8" />
                        <div>
                          <p className="font-medium">لا يوجد جدول كميات</p>
                          <p className="text-sm">يجب إعداد جدول الكميات أولاً قبل الاعتماد المالي</p>
                          <Button
                            variant="outline"
                            size="sm"
                            className="mt-2"
                            onClick={() => navigate(`/projects/boq?requestId=${selectedRequestId}`)}
                          >
                            إعداد جدول الكميات
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {hasBoq && !hasQuotations && (
                  <Card className="border-yellow-500">
                    <CardContent className="pt-6">
                      <div className="flex items-center gap-4 text-yellow-600">
                        <Receipt className="h-8 w-8" />
                        <div>
                          <p className="font-medium">لا توجد عروض أسعار</p>
                          <p className="text-sm">يجب إضافة عروض أسعار من الموردين قبل الاعتماد المالي</p>
                          <Button
                            variant="outline"
                            size="sm"
                            className="mt-2"
                            onClick={() => navigate(`/quotations?requestId=${selectedRequestId}`)}
                          >
                            إضافة عروض أسعار
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* جدول مقارنة عروض الأسعار */}
                {hasQuotations && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Receipt className="h-5 w-5" />
                        مقارنة عروض الأسعار
                      </CardTitle>
                      <CardDescription>
                        {requestDetails?.selectedQuotationId 
                          ? "تم اختيار العرض الفائز - يمكنك المتابعة للاعتماد المالي"
                          : "اختر أفضل عرض سعر من القائمة أدناه"}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="w-12">اختيار</TableHead>
                              <TableHead>رقم العرض</TableHead>
                              <TableHead>المورد</TableHead>
                              <TableHead>المبلغ الأصلي</TableHead>
                              <TableHead>الضريبة</TableHead>
                              <TableHead>الخصم</TableHead>
                              <TableHead>المبلغ النهائي</TableHead>
                              <TableHead>تاريخ الانتهاء</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {quotationsData.quotations.map((quotation: any) => {
                              const isSelected = requestDetails?.selectedQuotationId 
                                ? quotation.id === requestDetails.selectedQuotationId 
                                : quotation.id === selectedQuotationId;
                              const totalAmount = parseFloat(quotation.totalAmount);
                              const taxAmount = parseFloat(quotation.taxAmount || "0");
                              const discountAmount = parseFloat(quotation.discountAmount || "0");
                              const finalAmt = parseFloat(quotation.finalAmount || quotation.totalAmount);
                              
                              return (
                                <TableRow 
                                  key={quotation.id} 
                                  className={isSelected ? "bg-green-50 border-green-200" : ""}
                                >
                                  <TableCell>
                                    <RadioGroup
                                      value={requestDetails?.selectedQuotationId?.toString() || selectedQuotationId?.toString() || ""}
                                      onValueChange={(value) => setSelectedQuotationId(parseInt(value))}
                                      disabled={!!requestDetails?.selectedQuotationId || !canSelectWinning}
                                    >
                                      <RadioGroupItem value={quotation.id.toString()} />
                                    </RadioGroup>
                                  </TableCell>
                                  <TableCell className="font-medium">{quotation.quotationNumber}</TableCell>
                                  <TableCell>
                                    <div className="flex items-center gap-2">
                                      <Building2 className="h-4 w-4 text-muted-foreground" />
                                      {quotation.supplierName || "غير محدد"}
                                    </div>
                                  </TableCell>
                                  <TableCell>{totalAmount.toLocaleString("ar-SA")} ريال</TableCell>
                                  <TableCell>
                                    {taxAmount > 0 ? (
                                      <span className="text-green-600">+{parseFloat(quotation.taxAmount || "0").toLocaleString("ar-SA")} ريال</span>
                                    ) : (
                                      <span className="text-muted-foreground">-</span>
                                    )}
                                  </TableCell>
                                  <TableCell>
                                    {discountAmount > 0 ? (
                                      <span className="text-red-600 flex items-center gap-1">
                                        <TrendingDown className="h-3 w-3" />
                                        -{parseFloat(quotation.discountAmount || "0").toLocaleString("ar-SA")} ريال
                                      </span>
                                    ) : (
                                      <span className="text-muted-foreground">-</span>
                                    )}
                                  </TableCell>
                                  <TableCell>
                                    <span className={`font-bold ${isSelected ? "text-green-600" : ""}`}>
                                      {finalAmt.toLocaleString("ar-SA")} ريال
                                    </span>
                                  </TableCell>
                                  <TableCell>
                                    {quotation.validUntil 
                                      ? new Date(quotation.validUntil).toLocaleDateString("ar-SA")
                                      : "-"}
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>

                        {/* زر اختيار العرض الفائز */}
                        {!requestDetails?.selectedQuotationId && canSelectWinning && (
                          <div className="flex justify-end">
                            <Button 
                              onClick={handleSelectWinning}
                              disabled={!selectedQuotationId || selectWinningMutation.isPending}
                            >
                              {selectWinningMutation.isPending && <Loader2 className="h-4 w-4 ml-2 animate-spin" />}
                              <CheckCircle2 className="h-4 w-4 ml-2" />
                              تأكيد اختيار العرض الفائز
                            </Button>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* ملخص الاعتماد المالي */}
                {hasSelectedQuotation && selectedQuotation && (
                  <Card className="border-primary">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <CheckSquare className="h-5 w-5 text-primary" />
                        ملخص الاعتماد المالي
                      </CardTitle>
                      <CardDescription>مراجعة التكلفة النهائية قبل الاعتماد والانتقال لمرحلة التعاقد</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-6">
                        {/* تفاصيل التكلفة */}
                        <div className="grid gap-4 md:grid-cols-2">
                          {/* جدول الكميات */}
                          <div className="p-4 bg-muted rounded-lg">
                            <div className="flex items-center gap-2 text-muted-foreground mb-2">
                              <Calculator className="h-4 w-4" />
                              <span>إجمالي جدول الكميات</span>
                            </div>
                            <p className="text-2xl font-bold">{boqTotal.toLocaleString("ar-SA")} ريال</p>
                            <p className="text-xs text-muted-foreground mt-2">للمرجعية فقط</p>
                          </div>

                          {/* التكلفة المعتمدة */}
                          <div className="p-4 bg-primary/10 rounded-lg border border-primary">
                            <div className="flex items-center gap-2 text-primary mb-2">
                              <DollarSign className="h-4 w-4" />
                              <span>التكلفة المعتمدة (عرض السعر الفائز)</span>
                            </div>
                            <p className="text-2xl font-bold text-primary">{finalAmount.toLocaleString("ar-SA")} ريال</p>
                            <p className="text-xs text-muted-foreground mt-2">
                              المورد: {selectedQuotation.supplierName || "غير محدد"}
                            </p>
                          </div>
                        </div>

                        {/* معلومات العرض المختار */}
                        <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                          <h4 className="font-medium mb-2 flex items-center gap-2">
                            <Receipt className="h-4 w-4" />
                            تفاصيل العرض المختار
                          </h4>
                          <div className="grid grid-cols-2 gap-2 text-sm">
                            <span>رقم العرض:</span>
                            <span className="font-medium">{selectedQuotation.quotationNumber}</span>
                            <span>المبلغ الأصلي:</span>
                            <span className="font-medium">{parseFloat(selectedQuotation.totalAmount).toLocaleString("ar-SA")} ريال</span>
                            {parseFloat(selectedQuotation.taxAmount || "0") > 0 && (
                              <>
                                <span>الضريبة:</span>
                                <span className="font-medium text-green-600">+{parseFloat(selectedQuotation.taxAmount || "0").toLocaleString("ar-SA")} ريال</span>
                              </>
                            )}
                            {parseFloat(selectedQuotation.discountAmount || "0") > 0 && (
                              <>
                                <span>الخصم:</span>
                                <span className="font-medium text-red-600">-{parseFloat(selectedQuotation.discountAmount || "0").toLocaleString("ar-SA")} ريال</span>
                              </>
                            )}
                            <span className="font-bold">المبلغ النهائي:</span>
                            <span className="font-bold text-primary">{finalAmount.toLocaleString("ar-SA")} ريال</span>
                          </div>
                        </div>

                        {/* أزرار الإجراءات */}
                        <div className="flex flex-col sm:flex-row justify-end gap-3 sm:gap-4">
                          <Button 
                            variant="outline" 
                            onClick={() => navigate("/requests/" + selectedRequestId)}
                            className="w-full sm:w-auto order-2 sm:order-1"
                          >
                            <Eye className="h-4 w-4 ml-2" />
                            عرض تفاصيل الطلب
                          </Button>
                          {canApprove && (
                            <Button 
                              onClick={() => setShowApprovalDialog(true)}
                              className="w-full sm:w-auto order-1 sm:order-2"
                            >
                              <CheckCircle2 className="h-4 w-4 ml-2" />
                              اعتماد مالياً وانتقال للتعاقد
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </>
            )}
          </>
        )}

        {/* Dialog تأكيد الاعتماد */}
        <Dialog open={showApprovalDialog} onOpenChange={setShowApprovalDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>تأكيد الاعتماد المالي</DialogTitle>
              <DialogDescription>
                سيتم اعتماد الطلب مالياً بتكلفة {finalAmount.toLocaleString("ar-SA")} ريال وتحويله لمرحلة التعاقد
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="p-4 bg-muted rounded-lg">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <span>رقم العرض:</span>
                  <span className="font-medium">{selectedQuotation?.quotationNumber}</span>
                  <span>المورد:</span>
                  <span className="font-medium">{selectedQuotation?.supplierName || "غير محدد"}</span>
                  <span className="font-bold">التكلفة المعتمدة:</span>
                  <span className="font-bold text-primary">{finalAmount.toLocaleString("ar-SA")} ريال</span>
                </div>
              </div>
              <div>
                <Label>ملاحظات (اختياري)</Label>
                <Textarea
                  value={approvalNotes}
                  onChange={(e) => setApprovalNotes(e.target.value)}
                  placeholder="أي ملاحظات إضافية على الاعتماد..."
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowApprovalDialog(false)}>
                إلغاء
              </Button>
              <Button onClick={handleApprove} disabled={approveMutation.isPending}>
                {approveMutation.isPending && <Loader2 className="h-4 w-4 ml-2 animate-spin" />}
                تأكيد الاعتماد
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
