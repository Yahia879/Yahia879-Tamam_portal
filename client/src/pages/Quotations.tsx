import { useState, useEffect, useMemo } from "react";
import { useLocation } from "wouter";
import { jsPDF } from "jspdf";
import "jspdf-autotable";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import {
  Receipt,
  Search,
  Plus,
  Eye,
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  Building2,
  Send,
  FileText,
  Calendar,
  ClipboardList,
  AlertCircle,
  Upload,
  Download,
  FileSpreadsheet,
  FileDown,
} from "lucide-react";

import { Handshake } from "lucide-react";

// حالات عروض الأسعار
const QUOTATION_STATUS: Record<string, { label: string; color: string; icon: any }> = {
  pending: { label: "قيد المراجعة", color: "bg-yellow-100 text-yellow-800", icon: Clock },
  negotiating: { label: "قيد التفاوض", color: "bg-blue-100 text-blue-800", icon: Handshake },
  accepted: { label: "معتمد", color: "bg-green-100 text-green-800", icon: CheckCircle2 },
  rejected: { label: "مرفوض", color: "bg-red-100 text-red-800", icon: XCircle },
  expired: { label: "منتهي", color: "bg-gray-100 text-gray-800", icon: Clock },
};

// نوع بند التسعير
interface QuotationItem {
  boqItemId: number;
  itemName: string;
  quantity: number;
  unit: string;
  unitPrice: string;
  totalPrice: number;
}

export default function Quotations() {
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");

  // قراءة requestId من query parameter
  const urlParams = new URLSearchParams(window.location.search);
  const requestIdFromUrl = urlParams.get('requestId');

  // حماية الصفحة - منع طالب الخدمة من الوصول
  if (user?.role === "service_requester") {
    navigate("/requester");
    return null;
  }
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [selectedRequestId, setSelectedRequestId] = useState<string>(requestIdFromUrl || "");
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>("");
  const [includeUnapproved, setIncludeUnapproved] = useState(true);
  
  // حالة نافذة الاعتماد المتقدمة
  const [showApproveDialog, setShowApproveDialog] = useState(false);
  const [selectedQuotationForApproval, setSelectedQuotationForApproval] = useState<any>(null);
  const [approvedAmount, setApprovedAmount] = useState("");
  const [approvalNotes, setApprovalNotes] = useState("");
  
  // حالة نافذة التفاوض
  const [showNegotiationDialog, setShowNegotiationDialog] = useState(false);
  const [selectedQuotationForNegotiation, setSelectedQuotationForNegotiation] = useState<any>(null);
  const [negotiatedAmount, setNegotiatedAmount] = useState("");
  const [negotiationNotes, setNegotiationNotes] = useState("");
  
  // حالة نموذج إضافة عرض سعر
  const [formData, setFormData] = useState({
    quotationNumber: "",
    validUntil: "",
    notes: "",
    // حقول الضريبة
    includesTax: false, // هل السعر شامل الضريبة
    taxRate: "15.00", // نسبة الضريبة (افتراضي 15%)
    // حقول الخصم
    discountType: "" as "" | "none" | "percentage" | "fixed", // نوع الخصم
    discountValue: "", // قيمة الخصم
  });

  // حالة تسعير البنود
  const [quotationItems, setQuotationItems] = useState<QuotationItem[]>([]);

  // جلب الطلبات في مرحلة التقييم المالي
  const { data: requests } = trpc.requests.search.useQuery({
    currentStage: "financial_eval_and_approval",
  });

  // جلب الموردين النشطين (مع خيار إظهار غير المعتمدين)
  const { data: suppliers } = trpc.suppliers.getActiveSuppliers.useQuery({
    includeUnapproved: includeUnapproved,
  });

  // جلب عروض الأسعار للطلب المحدد
  const { data: quotationsData, isLoading: quotationsLoading, refetch: refetchQuotations } = trpc.projects.getQuotationsByRequest.useQuery(
    { requestId: parseInt(selectedRequestId) || 0 },
    { enabled: !!selectedRequestId }
  );

  // جلب جدول الكميات للطلب المحدد
  const { data: boqData, isLoading: boqLoading } = trpc.projects.getBOQ.useQuery(
    { requestId: parseInt(selectedRequestId) || 0 },
    { enabled: !!selectedRequestId }
  );

  // تهيئة بنود التسعير عند فتح نافذة الإضافة
  useEffect(() => {
    if (showAddDialog && boqData?.items) {
      setQuotationItems(
        boqData.items.map((item: any) => ({
          boqItemId: item.id,
          itemName: item.itemName,
          quantity: parseFloat(item.quantity),
          unit: item.unit,
          unitPrice: "",
          totalPrice: 0,
        }))
      );
    }
  }, [showAddDialog, boqData]);

  // إضافة عرض سعر
  const addQuotationMutation = trpc.projects.createQuotation.useMutation({
    onSuccess: () => {
      toast.success("تم إضافة عرض السعر بنجاح");
      setShowAddDialog(false);
      resetForm();
      refetchQuotations();
    },
    onError: (error: any) => {
      const errorMessage = error.message?.substring(0, 200) || "حدث خطأ أثناء إضافة عرض السعر";
      toast.error(errorMessage);
    },
  });

  // اعتماد عرض سعر
  const approveQuotationMutation = trpc.projects.updateQuotationStatus.useMutation({
    onSuccess: () => {
      toast.success("تم تحديث حالة عرض السعر بنجاح");
      refetchQuotations();
      setShowApproveDialog(false);
      setSelectedQuotationForApproval(null);
    },
    onError: (error: any) => {
      toast.error(error.message || "حدث خطأ أثناء تحديث حالة عرض السعر");
    },
  });

  // بدء التفاوض
  const startNegotiationMutation = trpc.projects.startNegotiation.useMutation({
    onSuccess: () => {
      toast.success("تم بدء التفاوض بنجاح");
      refetchQuotations();
    },
    onError: (error: any) => {
      toast.error(error.message || "حدث خطأ أثناء بدء التفاوض");
    },
  });

  // حفظ نتيجة التفاوض
  const saveNegotiationMutation = trpc.projects.saveNegotiationResult.useMutation({
    onSuccess: () => {
      toast.success("تم حفظ نتيجة التفاوض بنجاح");
      setShowNegotiationDialog(false);
      setSelectedQuotationForNegotiation(null);
      setNegotiatedAmount("");
      setNegotiationNotes("");
      refetchQuotations();
    },
    onError: (error: any) => {
      toast.error(error.message || "حدث خطأ أثناء حفظ نتيجة التفاوض");
    },
  });

  // اعتماد بعد التفاوض
  const approveAfterNegotiationMutation = trpc.projects.approveQuotationAfterNegotiation.useMutation({
    onSuccess: (data) => {
      toast.success(`تم اعتماد العرض بمبلغ ${data.approvedAmount?.toLocaleString()} ريال`);
      refetchQuotations();
    },
    onError: (error: any) => {
      toast.error(error.message || "حدث خطأ أثناء اعتماد العرض");
    },
  });

  const resetForm = () => {
    setFormData({
      quotationNumber: "",
      validUntil: "",
      notes: "",
      includesTax: false,
      taxRate: "15.00",
      discountType: "" as "" | "none" | "percentage" | "fixed",
      discountValue: "",
    });
    setSelectedSupplierId("");
    setQuotationItems([]);
  };

  // تحديث سعر بند
  const updateItemPrice = (index: number, unitPrice: string) => {
    setQuotationItems((prev) => {
      const updated = [...prev];
      const price = parseFloat(unitPrice) || 0;
      updated[index] = {
        ...updated[index],
        unitPrice,
        totalPrice: price * updated[index].quantity,
      };
      return updated;
    });
  };

  // حساب الإجمالي
  const totalAmount = useMemo(() => {
    return quotationItems.reduce((sum, item) => sum + item.totalPrice, 0);
  }, [quotationItems]);

  const handleAddQuotation = () => {
    if (!selectedRequestId) {
      toast.error("يرجى اختيار الطلب أولاً");
      return;
    }
    if (!selectedSupplierId) {
      toast.error("يرجى اختيار المورد");
      return;
    }
    
    // التحقق من تسعير جميع البنود
    const unpriced = quotationItems.filter((item) => !item.unitPrice || parseFloat(item.unitPrice) <= 0);
    if (unpriced.length > 0) {
      toast.error(`يرجى تسعير جميع البنود (${unpriced.length} بند غير مسعر)`);
      return;
    }

    if (totalAmount <= 0) {
      toast.error("يرجى إدخال أسعار صحيحة للبنود");
      return;
    }

    // حساب المبلغ النهائي بعد الخصم والضريبة
    let finalAmount = totalAmount;
    let discountAmount = 0;
    let taxAmount = 0;
    
    // حساب الخصم
    if (formData.discountType && formData.discountType !== "none" && formData.discountValue) {
      discountAmount = formData.discountType === "percentage" 
        ? (totalAmount * parseFloat(formData.discountValue) / 100)
        : parseFloat(formData.discountValue);
      finalAmount -= discountAmount;
    }
    
    // حساب الضريبة
    if (formData.includesTax) {
      taxAmount = finalAmount * parseFloat(formData.taxRate || "15") / 100;
      finalAmount += taxAmount;
    }

    addQuotationMutation.mutate({
      requestId: parseInt(selectedRequestId),
      supplierId: parseInt(selectedSupplierId),
      totalAmount: totalAmount,
      finalAmount: finalAmount,
      validUntil: formData.validUntil ? new Date(formData.validUntil) : undefined,
      notes: formData.notes,
      // حقول الضريبة
      includesTax: formData.includesTax,
      taxRate: formData.includesTax ? parseFloat(formData.taxRate || "15") : null,
      taxAmount: formData.includesTax ? taxAmount : null,
      // حقول الخصم
      discountType: formData.discountType && formData.discountType !== "none" ? formData.discountType : null,
      discountValue: formData.discountType && formData.discountType !== "none" && formData.discountValue ? parseFloat(formData.discountValue) : null,
      discountAmount: discountAmount > 0 ? discountAmount : null,
      items: quotationItems.map((item) => ({
        boqItemId: item.boqItemId,
        itemName: item.itemName,
        quantity: item.quantity,
        unit: item.unit,
        unitPrice: parseFloat(item.unitPrice),
        totalPrice: item.totalPrice,
      })),
    });
  };

  // فتح نافذة الاعتماد المتقدمة
  const openApproveDialog = (quotation: any) => {
    setSelectedQuotationForApproval(quotation);
    setApprovedAmount(quotation.totalAmount?.toString() || "");
    setApprovalNotes("");
    setShowApproveDialog(true);
  };

  // تنفيذ الاعتماد مع المبلغ المعدل والمبرر
  const handleConfirmApproval = () => {
    if (!selectedQuotationForApproval) return;
    // استخدام approveAfterNegotiationMutation للاعتماد مع المبلغ
    approveAfterNegotiationMutation.mutate({
      id: selectedQuotationForApproval.id,
      useNegotiatedAmount: true,
      notes: approvalNotes || undefined,
    });
    setShowApproveDialog(false);
    setSelectedQuotationForApproval(null);
    setApprovedAmount("");
    setApprovalNotes("");
  };

  const handleRejectQuotation = (id: number) => {
    approveQuotationMutation.mutate({ id, status: "rejected" });
  };

  // إلغاء اعتماد عرض السعر (إعادته لحالة قيد المراجعة)
  const handleCancelApproval = (id: number) => {
    approveQuotationMutation.mutate({ id, status: "pending" });
  };

  // إعادة عرض مرفوض للمراجعة
  const handleReactivateQuotation = (id: number) => {
    approveQuotationMutation.mutate({ id, status: "pending" });
  };

  // بدء التفاوض على عرض
  const handleStartNegotiation = (quotation: any) => {
    startNegotiationMutation.mutate({ id: quotation.id });
  };

  // فتح نافذة التفاوض
  const openNegotiationDialog = (quotation: any) => {
    setSelectedQuotationForNegotiation(quotation);
    setNegotiatedAmount(quotation.negotiatedAmount?.toString() || quotation.totalAmount?.toString() || "");
    setNegotiationNotes(quotation.negotiationNotes || "");
    setShowNegotiationDialog(true);
  };

  // حفظ نتيجة التفاوض
  const handleSaveNegotiation = () => {
    if (!selectedQuotationForNegotiation) return;
    if (!negotiatedAmount || parseFloat(negotiatedAmount) <= 0) {
      toast.error("يرجى إدخال المبلغ بعد التفاوض");
      return;
    }
    saveNegotiationMutation.mutate({
      id: selectedQuotationForNegotiation.id,
      negotiatedAmount: parseFloat(negotiatedAmount),
      negotiationNotes: negotiationNotes || undefined,
    });
  };

  // اعتماد العرض بعد التفاوض
  const handleApproveAfterNegotiation = (quotation: any, useNegotiatedAmount: boolean = true) => {
    approveAfterNegotiationMutation.mutate({
      id: quotation.id,
      useNegotiatedAmount,
      notes: `تم الاعتماد بعد التفاوض`,
    });
  };

  // حساب إجمالي جدول الكميات
  const boqTotal = boqData?.items?.reduce((sum: number, item: any) => {
    return sum + (parseFloat(item.totalPrice) || 0);
  }, 0) || 0;

  // دالة تصدير عرض السعر كـ PDF
  const handleExportPDF = (quotation: any) => {
    try {
      const doc = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      // إعداد الخط العربي
      doc.setFont("helvetica");
      doc.setR2L(true);

      // العنوان الرئيسي
      doc.setFontSize(20);
      doc.setTextColor(0, 100, 80);
      doc.text("عرض سعر", 105, 20, { align: "center" });
      
      // خط فاصل
      doc.setDrawColor(0, 100, 80);
      doc.setLineWidth(0.5);
      doc.line(20, 25, 190, 25);

      // معلومات العرض
      doc.setFontSize(12);
      doc.setTextColor(0, 0, 0);
      
      let yPos = 35;
      const lineHeight = 8;

      // رقم العرض
      doc.text(`Quotation Number: ${quotation.quotationNumber}`, 190, yPos, { align: "right" });
      yPos += lineHeight;

      // اسم المورد
      doc.text(`Supplier: ${quotation.supplierName || "N/A"}`, 190, yPos, { align: "right" });
      yPos += lineHeight;

      // تاريخ التقديم
      const submitDate = quotation.submittedAt ? new Date(quotation.submittedAt).toLocaleDateString("ar-SA") : "N/A";
      doc.text(`Submission Date: ${submitDate}`, 190, yPos, { align: "right" });
      yPos += lineHeight;

      // تاريخ الصلاحية
      const validUntil = quotation.validUntil ? new Date(quotation.validUntil).toLocaleDateString("ar-SA") : "N/A";
      doc.text(`Valid Until: ${validUntil}`, 190, yPos, { align: "right" });
      yPos += lineHeight;

      // الحالة
      const statusLabels: Record<string, string> = {
        pending: "Pending Review",
        negotiating: "Under Negotiation",
        accepted: "Approved",
        rejected: "Rejected",
      };
      doc.text(`Status: ${statusLabels[quotation.status] || quotation.status}`, 190, yPos, { align: "right" });
      yPos += lineHeight * 2;

      // جدول البنود
      doc.setFontSize(14);
      doc.setTextColor(0, 100, 80);
      doc.text("Pricing Details", 105, yPos, { align: "center" });
      yPos += 10;

      // إعداد بيانات الجدول
      const items = quotation.items || [];
      const tableData = items.map((item: any, index: number) => [
        (index + 1).toString(),
        item.itemName || "N/A",
        item.unit || "N/A",
        parseFloat(item.quantity || 0).toLocaleString("en"),
        parseFloat(item.unitPrice || 0).toLocaleString("en") + " SAR",
        parseFloat(item.totalPrice || 0).toLocaleString("en") + " SAR",
      ]);

      // إضافة الجدول
      (doc as any).autoTable({
        startY: yPos,
        head: [["#", "Item", "Unit", "Quantity", "Unit Price", "Total"]],
        body: tableData,
        theme: "grid",
        headStyles: {
          fillColor: [0, 100, 80],
          textColor: 255,
          fontSize: 10,
          halign: "center",
        },
        bodyStyles: {
          fontSize: 9,
          halign: "center",
        },
        columnStyles: {
          0: { cellWidth: 15 },
          1: { cellWidth: 50, halign: "right" },
          2: { cellWidth: 25 },
          3: { cellWidth: 25 },
          4: { cellWidth: 30 },
          5: { cellWidth: 35 },
        },
        margin: { left: 20, right: 20 },
      });

      // الإجمالي
      const finalY = (doc as any).lastAutoTable.finalY + 10;
      doc.setFontSize(14);
      doc.setTextColor(0, 100, 80);
      doc.text(`Total: ${parseFloat(quotation.totalAmount || 0).toLocaleString("en")} SAR`, 190, finalY, { align: "right" });

      // إذا كان هناك مبلغ بعد التفاوض
      if (quotation.negotiatedAmount) {
        doc.text(`After Negotiation: ${parseFloat(quotation.negotiatedAmount).toLocaleString("en")} SAR`, 190, finalY + 8, { align: "right" });
      }

      // الملاحظات
      if (quotation.notes) {
        doc.setFontSize(10);
        doc.setTextColor(100, 100, 100);
        doc.text(`Notes: ${quotation.notes}`, 190, finalY + 20, { align: "right", maxWidth: 170 });
      }

      // التذييل
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text("Tamam Portal - Mosque Care", 105, 285, { align: "center" });
      doc.text(`Generated: ${new Date().toLocaleDateString("en")}`, 105, 290, { align: "center" });

      // حفظ الملف
      doc.save(`quotation_${quotation.quotationNumber}.pdf`);
      toast.success("تم تصدير عرض السعر بنجاح");
    } catch (error) {
      console.error("PDF export error:", error);
      toast.error("حدث خطأ أثناء تصدير PDF");
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* العنوان */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">عروض الأسعار</h1>
            <p className="text-muted-foreground">إدارة عروض الأسعار من الموردين</p>
          </div>
        </div>

        {/* قائمة الطلبات في مرحلة التقييم المالي */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              الطلبات في مرحلة التقييم المالي
            </CardTitle>
            <CardDescription>اختر الطلب لعرض جدول الكميات وعروض الأسعار</CardDescription>
          </CardHeader>
          <CardContent>
            {requests?.requests && requests.requests.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>رقم الطلب</TableHead>
                    <TableHead>المسجد</TableHead>
                    <TableHead>البرنامج</TableHead>
                    <TableHead>تاريخ التقديم</TableHead>
                    <TableHead>الإجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {requests.requests.map((request: any) => (
                    <TableRow 
                      key={request.id} 
                      className={selectedRequestId === request.id.toString() ? "bg-primary/10" : "cursor-pointer hover:bg-muted/50"}
                      onClick={() => setSelectedRequestId(request.id.toString())}
                    >
                      <TableCell className="font-mono text-sm">{request.requestNumber}</TableCell>
                      <TableCell className="font-medium">{request.mosqueName || "غير محدد"}</TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {request.programType === 'construction' ? 'بناء' :
                           request.programType === 'renovation' ? 'ترميم' :
                           request.programType === 'expansion' ? 'توسعة' :
                           request.programType === 'maintenance' ? 'صيانة' : request.programType}
                        </Badge>
                      </TableCell>
                      <TableCell>{new Date(request.createdAt).toLocaleDateString('ar-SA')}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            variant={selectedRequestId === request.id.toString() ? "default" : "outline"}
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedRequestId(request.id.toString());
                            }}
                          >
                            <Eye className="h-4 w-4 ml-1" />
                            {selectedRequestId === request.id.toString() ? "محدد" : "عرض"}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/requests/${request.id}`);
                            }}
                          >
                            <FileText className="h-4 w-4 ml-1" />
                            تفاصيل الطلب
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>لا توجد طلبات في مرحلة التقييم المالي</p>
              </div>
            )}
            {selectedRequestId && (
              <div className="mt-4 flex justify-end">
                <Button onClick={() => setShowAddDialog(true)}>
                  <Plus className="h-4 w-4 ml-2" />
                  إضافة عرض سعر للطلب المحدد
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* عرض جدول الكميات للطلب المحدد */}
        {selectedRequestId && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ClipboardList className="h-5 w-5" />
                جدول الكميات للطلب
              </CardTitle>
              <CardDescription>
                البنود المطلوب تسعيرها من الموردين
              </CardDescription>
            </CardHeader>
            <CardContent>
              {boqLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : boqData?.items && boqData.items.length > 0 ? (
                <div className="space-y-4">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">#</TableHead>
                        <TableHead>البند</TableHead>
                        <TableHead>الوصف</TableHead>
                        <TableHead>الوحدة</TableHead>
                        <TableHead className="text-center">الكمية</TableHead>
                        <TableHead className="text-center">سعر الوحدة</TableHead>
                        <TableHead className="text-center">الإجمالي</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {boqData.items.map((item: any, index: number) => (
                        <TableRow key={item.id}>
                          <TableCell>{index + 1}</TableCell>
                          <TableCell className="font-medium">{item.itemName}</TableCell>
                          <TableCell className="text-muted-foreground text-sm">
                            {item.itemDescription || "-"}
                          </TableCell>
                          <TableCell>{item.unit}</TableCell>
                          <TableCell className="text-center">{parseFloat(item.quantity).toLocaleString("ar-SA")}</TableCell>
                          <TableCell className="text-center">
                            {item.unitPrice ? `${parseFloat(item.unitPrice).toLocaleString("ar-SA")} ريال` : "-"}
                          </TableCell>
                          <TableCell className="text-center font-medium">
                            {item.totalPrice ? `${parseFloat(item.totalPrice).toLocaleString("ar-SA")} ريال` : "-"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  <div className="flex justify-end">
                    <div className="bg-primary/10 text-primary px-4 py-2 rounded-lg font-bold">
                      إجمالي جدول الكميات: {boqTotal.toLocaleString("ar-SA")} ريال
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <ClipboardList className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>لا يوجد جدول كميات لهذا الطلب</p>
                  <p className="text-sm mt-2">يجب إعداد جدول الكميات أولاً قبل طلب عروض الأسعار</p>
                  <Button
                    variant="outline"
                    className="mt-4"
                    onClick={() => navigate(`/projects/boq?requestId=${selectedRequestId}`)}
                  >
                    <Plus className="h-4 w-4 ml-2" />
                    إعداد جدول الكميات
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* جدول عروض الأسعار */}
        {selectedRequestId && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Receipt className="h-5 w-5" />
                عروض الأسعار المقدمة
              </CardTitle>
            </CardHeader>
            <CardContent>
              {quotationsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : quotationsData?.quotations && quotationsData.quotations.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>رقم العرض</TableHead>
                      <TableHead>المورد</TableHead>
                      <TableHead>المبلغ الأصلي</TableHead>
                      <TableHead>المبلغ النهائي</TableHead>
                      <TableHead>بعد التفاوض</TableHead>
                      <TableHead>صالح حتى</TableHead>
                      <TableHead>الحالة</TableHead>
                      <TableHead>الإجراءات</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {quotationsData.quotations.map((quotation: any) => {
                      const statusConfig = QUOTATION_STATUS[quotation.status as keyof typeof QUOTATION_STATUS] || QUOTATION_STATUS.pending;
                      return (
                        <TableRow key={quotation.id}>
                          <TableCell className="font-medium">{quotation.quotationNumber}</TableCell>
                          <TableCell>{quotation.supplierName || "غير محدد"}</TableCell>
                          <TableCell>{parseFloat(quotation.totalAmount).toLocaleString("ar-SA")} ريال</TableCell>
                          <TableCell className="font-medium text-primary">
                            {parseFloat(quotation.finalAmount || quotation.totalAmount).toLocaleString("ar-SA")} ريال
                          </TableCell>
                          <TableCell>
                            {quotation.negotiatedAmount ? (
                              <div className="flex flex-col">
                                <span className="font-medium text-green-600">
                                  {parseFloat(quotation.negotiatedAmount).toLocaleString("ar-SA")} ريال
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  وفر {((1 - parseFloat(quotation.negotiatedAmount) / parseFloat(quotation.totalAmount)) * 100).toFixed(1)}%
                                </span>
                              </div>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {quotation.validUntil ? new Date(quotation.validUntil).toLocaleDateString("ar-SA") : "-"}
                          </TableCell>
                          <TableCell>
                            <Badge className={statusConfig.color}>
                              {statusConfig.label}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              {/* حالة قيد المراجعة */}
                              {quotation.status === "pending" && (
                                <>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-blue-600"
                                    onClick={() => handleStartNegotiation(quotation)}
                                  >
                                    <Handshake className="h-4 w-4 ml-1" />
                                    تفاوض
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-green-600"
                                    onClick={() => openApproveDialog(quotation)}
                                  >
                                    <CheckCircle2 className="h-4 w-4 ml-1" />
                                    اعتماد
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-red-600"
                                    onClick={() => handleRejectQuotation(quotation.id)}
                                  >
                                    <XCircle className="h-4 w-4 ml-1" />
                                    رفض
                                  </Button>
                                </>
                              )}
                              {/* حالة قيد التفاوض */}
                              {quotation.status === "negotiating" && (
                                <>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-blue-600"
                                    onClick={() => openNegotiationDialog(quotation)}
                                  >
                                    <Handshake className="h-4 w-4 ml-1" />
                                    تسجيل النتيجة
                                  </Button>
                                  {quotation.negotiatedAmount && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="text-green-600"
                                      onClick={() => handleApproveAfterNegotiation(quotation, true)}
                                    >
                                      <CheckCircle2 className="h-4 w-4 ml-1" />
                                      اعتماد
                                    </Button>
                                  )}
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-red-600"
                                    onClick={() => handleRejectQuotation(quotation.id)}
                                  >
                                    <XCircle className="h-4 w-4 ml-1" />
                                    رفض
                                  </Button>
                                </>
                              )}
                              {/* حالة معتمد */}
                              {quotation.status === "accepted" && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-orange-600"
                                  onClick={() => handleCancelApproval(quotation.id)}
                                >
                                  <XCircle className="h-4 w-4 ml-1" />
                                  إلغاء الاعتماد
                                </Button>
                              )}
                              {/* حالة مرفوض */}
                              {quotation.status === "rejected" && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-blue-600"
                                  onClick={() => handleReactivateQuotation(quotation.id)}
                                >
                                  <Clock className="h-4 w-4 ml-1" />
                                  إعادة للمراجعة
                                </Button>
                              )}
                              {/* زر تصدير PDF */}
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-purple-600"
                                onClick={() => handleExportPDF(quotation)}
                              >
                                <FileDown className="h-4 w-4 ml-1" />
                                PDF
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Receipt className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>لا توجد عروض أسعار لهذا الطلب</p>
                  <Button
                    variant="outline"
                    className="mt-4"
                    onClick={() => setShowAddDialog(true)}
                  >
                    <Plus className="h-4 w-4 ml-2" />
                    إضافة أول عرض سعر
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Dialog إضافة عرض سعر مع تسعير البنود */}
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogContent className="!max-w-[98vw] !w-[98vw] max-h-[95vh] overflow-y-auto">
            <DialogHeader className="pb-4 border-b">
              <DialogTitle className="text-2xl flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Receipt className="h-7 w-7 text-primary" />
                </div>
                إضافة عرض سعر جديد
              </DialogTitle>
              <DialogDescription className="text-base">أدخل تفاصيل عرض السعر من المورد مع تسعير كل بند</DialogDescription>
            </DialogHeader>
            <div className="space-y-6 py-4">
              {/* معلومات المورد - في الأعلى */}
              <div className="p-5 bg-gradient-to-r from-primary/5 to-primary/10 rounded-xl border-2 border-primary/20">
                <div className="flex items-center gap-3 mb-4">
                  <Building2 className="h-6 w-6 text-primary" />
                  <h3 className="text-lg font-bold text-primary">بيانات المورد</h3>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div>
                    <Label className="text-base font-semibold mb-2 block">اسم المورد *</Label>
                    <Select value={selectedSupplierId} onValueChange={setSelectedSupplierId}>
                      <SelectTrigger className="h-12 text-base bg-white">
                        <SelectValue placeholder="اختر المورد..." />
                      </SelectTrigger>
                      <SelectContent>
                        {suppliers?.map((supplier: any) => (
                          <SelectItem key={supplier.id} value={supplier.id.toString()}>
                            <div className="flex items-center gap-2">
                              <Building2 className="h-4 w-4 text-muted-foreground" />
                              <span className="font-medium">{supplier.name}</span>
                              {supplier.approvalStatus !== "approved" && (
                                <Badge variant="outline" className="text-xs bg-yellow-50 text-yellow-700 border-yellow-300">غير معتمد</Badge>
                              )}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <div className="flex items-center gap-2 mt-3">
                      <Checkbox
                        id="includeUnapproved"
                        checked={includeUnapproved}
                        onCheckedChange={(checked) => setIncludeUnapproved(checked as boolean)}
                      />
                      <label htmlFor="includeUnapproved" className="text-sm text-muted-foreground">
                        إظهار الموردين غير المعتمدين
                      </label>
                    </div>
                  </div>
                  <div>
                    <Label className="text-base font-semibold mb-2 flex items-center gap-2">
                      <Calendar className="h-5 w-5 text-orange-500" />
                      تاريخ انتهاء صلاحية العرض
                    </Label>
                    <Input
                      type="date"
                      value={formData.validUntil}
                      onChange={(e) => setFormData({ ...formData, validUntil: e.target.value })}
                      className="h-12 text-base bg-white border-orange-200 focus:border-orange-400"
                    />
                    {formData.validUntil && (
                      <div className="mt-2 p-2 bg-orange-50 rounded-lg border border-orange-200">
                        <p className="text-sm text-orange-700 font-medium flex items-center gap-2">
                          <Calendar className="h-4 w-4" />
                          ينتهي في: {new Date(formData.validUntil).toLocaleDateString('ar-SA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* جدول تسعير البنود */}
              {quotationItems.length > 0 ? (
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <Label className="text-lg font-semibold flex items-center gap-2">
                        <ClipboardList className="h-5 w-5 text-primary" />
                        تسعير البنود ({quotationItems.length} بند)
                      </Label>
                      <Badge variant="outline" className="text-sm">
                        المسعر: {quotationItems.filter(i => parseFloat(i.unitPrice) > 0).length} / {quotationItems.length}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      {/* زر تحميل قالب Excel */}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          // إنشاء قالب Excel للتحميل
                          const headers = ["رقم البند", "اسم البند", "الوحدة", "الكمية", "سعر الوحدة"];
                          const rows = quotationItems.map((item, idx) => [
                            idx + 1,
                            item.itemName,
                            item.unit,
                            item.quantity,
                            ""
                          ]);
                          const csvContent = [headers, ...rows]
                            .map(row => row.join("\t"))
                            .join("\n");
                          const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
                          const url = URL.createObjectURL(blob);
                          const link = document.createElement("a");
                          link.href = url;
                          link.download = "قالب_تسعير_البنود.csv";
                          link.click();
                          URL.revokeObjectURL(url);
                          toast.success("تم تحميل القالب - أدخل الأسعار في عمود 'سعر الوحدة' ثم ارفع الملف");
                        }}
                        className="gap-2"
                      >
                        <Download className="h-4 w-4" />
                        تحميل قالب
                      </Button>
                      {/* زر استيراد من Excel */}
                      <div className="relative">
                        <input
                          type="file"
                          accept=".csv,.xlsx,.xls"
                          className="absolute inset-0 opacity-0 cursor-pointer"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            
                            const reader = new FileReader();
                            reader.onload = (event) => {
                              try {
                                const text = event.target?.result as string;
                                const lines = text.split("\n").filter(line => line.trim());
                                if (lines.length < 2) {
                                  toast.error("الملف فارغ أو لا يحتوي على بيانات");
                                  return;
                                }
                                
                                // تخطي السطر الأول (العناوين)
                                const dataLines = lines.slice(1);
                                let updatedCount = 0;
                                
                                setQuotationItems(prev => {
                                  const updated = [...prev];
                                  dataLines.forEach((line, idx) => {
                                    const cols = line.split(/[\t,]/);
                                    const priceCol = cols[4]?.trim(); // عمود سعر الوحدة
                                    if (priceCol && idx < updated.length) {
                                      const price = parseFloat(priceCol.replace(/[^\d.]/g, ""));
                                      if (!isNaN(price) && price > 0) {
                                        updated[idx] = {
                                          ...updated[idx],
                                          unitPrice: price.toString(),
                                          totalPrice: price * updated[idx].quantity
                                        };
                                        updatedCount++;
                                      }
                                    }
                                  });
                                  return updated;
                                });
                                
                                toast.success(`تم استيراد ${updatedCount} سعر بنجاح`);
                              } catch (err) {
                                toast.error("حدث خطأ أثناء قراءة الملف");
                              }
                            };
                            reader.readAsText(file);
                            e.target.value = ""; // إعادة تعيين الحقل
                          }}
                        />
                        <Button variant="default" size="sm" className="gap-2">
                          <Upload className="h-4 w-4" />
                          استيراد من Excel
                        </Button>
                      </div>
                    </div>
                  </div>
                  <div className="border rounded-lg overflow-hidden shadow-sm">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-gradient-to-r from-primary/10 to-primary/5">
                          <TableHead className="w-14 text-center font-bold">#</TableHead>
                          <TableHead className="min-w-[250px] font-bold">البند</TableHead>
                          <TableHead className="w-24 text-center font-bold">الوحدة</TableHead>
                          <TableHead className="w-28 text-center font-bold">الكمية</TableHead>
                          <TableHead className="w-40 text-center font-bold">سعر الوحدة (ريال)</TableHead>
                          <TableHead className="w-36 text-center font-bold">الإجمالي</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {quotationItems.map((item, index) => (
                          <TableRow key={item.boqItemId} className="hover:bg-muted/30">
                            <TableCell className="text-center text-muted-foreground font-medium">{index + 1}</TableCell>
                            <TableCell className="font-medium">
                              <div className="max-w-[300px]">
                                {item.itemName}
                              </div>
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge variant="secondary" className="font-normal">{item.unit}</Badge>
                            </TableCell>
                            <TableCell className="text-center font-medium">{item.quantity.toLocaleString("ar-SA")}</TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                value={item.unitPrice}
                                onChange={(e) => updateItemPrice(index, e.target.value)}
                                placeholder="0.00"
                                className="text-center h-10 font-medium"
                                min="0"
                                step="0.01"
                              />
                            </TableCell>
                            <TableCell className="text-center">
                              <span className={`font-bold ${item.totalPrice > 0 ? 'text-green-700' : 'text-muted-foreground'}`}>
                                {item.totalPrice > 0 ? `${item.totalPrice.toLocaleString("ar-SA")}` : "-"}
                              </span>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  {/* الإجمالي الكلي */}
                  <div className="flex justify-end mt-4">
                    <div className="bg-gradient-to-r from-primary to-primary/90 text-primary-foreground px-8 py-4 rounded-xl shadow-lg">
                      <div className="flex items-center gap-4">
                        <Receipt className="h-6 w-6" />
                        <div>
                          <span className="text-sm opacity-90">الإجمالي الكلي</span>
                          <p className="text-2xl font-bold">{totalAmount.toLocaleString("ar-SA")} <span className="text-base font-normal">ريال</span></p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground border-2 border-dashed rounded-lg bg-muted/10">
                  <AlertCircle className="h-16 w-16 mx-auto mb-4 opacity-40" />
                  <p className="text-lg font-medium">لا توجد بنود في جدول الكميات</p>
                  <p className="text-sm mt-2">يجب إعداد جدول الكميات أولاً قبل إضافة عروض الأسعار</p>
                </div>
              )}

              {/* قسم الضريبة والخصم */}
              <div className="p-5 bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl border-2 border-amber-200">
                <div className="flex items-center gap-3 mb-4">
                  <Receipt className="h-6 w-6 text-amber-600" />
                  <h3 className="text-lg font-bold text-amber-700">الضريبة والخصم</h3>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* قسم الضريبة */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <Checkbox
                        id="includesTax"
                        checked={formData.includesTax}
                        onCheckedChange={(checked) => setFormData({ ...formData, includesTax: checked as boolean })}
                      />
                      <label htmlFor="includesTax" className="text-base font-medium cursor-pointer">
                        السعر شامل ضريبة القيمة المضافة
                      </label>
                    </div>
                    {formData.includesTax && (
                      <div>
                        <Label className="text-sm font-semibold mb-2 block">نسبة الضريبة (%)</Label>
                        <Input
                          type="number"
                          value={formData.taxRate}
                          onChange={(e) => setFormData({ ...formData, taxRate: e.target.value })}
                          placeholder="15.00"
                          className="h-10 w-32 bg-white"
                          min="0"
                          max="100"
                          step="0.01"
                        />
                        <p className="text-xs text-muted-foreground mt-1">النسبة الافتراضية 15%</p>
                      </div>
                    )}
                  </div>
                  
                  {/* قسم الخصم */}
                  <div className="space-y-4">
                    <div>
                      <Label className="text-sm font-semibold mb-2 block">نوع الخصم</Label>
                      <Select 
                        value={formData.discountType} 
                        onValueChange={(value) => setFormData({ ...formData, discountType: value as "" | "none" | "percentage" | "fixed" })}
                      >
                        <SelectTrigger className="h-10 bg-white">
                          <SelectValue placeholder="بدون خصم" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">بدون خصم</SelectItem>
                          <SelectItem value="percentage">نسبة مئوية (%)</SelectItem>
                          <SelectItem value="fixed">مبلغ ثابت (ريال)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {formData.discountType && formData.discountType !== "none" && (
                      <div>
                        <Label className="text-sm font-semibold mb-2 block">
                          {formData.discountType === "percentage" ? "نسبة الخصم (%)" : "مبلغ الخصم (ريال)"}
                        </Label>
                        <Input
                          type="number"
                          value={formData.discountValue}
                          onChange={(e) => setFormData({ ...formData, discountValue: e.target.value })}
                          placeholder={formData.discountType === "percentage" ? "0.00" : "0"}
                          className="h-10 w-40 bg-white"
                          min="0"
                          step={formData.discountType === "percentage" ? "0.01" : "1"}
                        />
                      </div>
                    )}
                  </div>
                </div>
                
                {/* ملخص الحسابات */}
                {(formData.includesTax || (formData.discountType && formData.discountType !== "none" && formData.discountValue)) && (
                  <div className="mt-4 p-4 bg-white rounded-lg border border-amber-200">
                    <h4 className="font-semibold text-amber-700 mb-3">ملخص الحسابات</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>المبلغ الأساسي:</span>
                        <span className="font-medium">{totalAmount.toLocaleString("ar-SA")} ريال</span>
                      </div>
                      {formData.discountType && formData.discountType !== "none" && formData.discountValue && (
                        <div className="flex justify-between text-red-600">
                          <span>الخصم ({formData.discountType === "percentage" ? `${formData.discountValue}%` : `${parseFloat(formData.discountValue).toLocaleString("ar-SA")} ريال`}):</span>
                          <span className="font-medium">-{(() => {
                            const discount = formData.discountType === "percentage" 
                              ? (totalAmount * parseFloat(formData.discountValue || "0") / 100)
                              : parseFloat(formData.discountValue || "0");
                            return discount.toLocaleString("ar-SA");
                          })()} ريال</span>
                        </div>
                      )}
                      {formData.includesTax && (
                        <div className="flex justify-between text-green-600">
                          <span>ضريبة القيمة المضافة ({formData.taxRate}%):</span>
                          <span className="font-medium">+{(() => {
                            let baseAmount = totalAmount;
                            if (formData.discountType && formData.discountType !== "none" && formData.discountValue) {
                              const discount = formData.discountType === "percentage" 
                                ? (totalAmount * parseFloat(formData.discountValue || "0") / 100)
                                : parseFloat(formData.discountValue || "0");
                              baseAmount -= discount;
                            }
                            const tax = baseAmount * parseFloat(formData.taxRate || "15") / 100;
                            return tax.toLocaleString("ar-SA");
                          })()} ريال</span>
                        </div>
                      )}
                      <div className="flex justify-between pt-2 border-t border-amber-200 font-bold text-lg">
                        <span>المبلغ النهائي:</span>
                        <span className="text-primary">{(() => {
                          let finalAmount = totalAmount;
                          // حساب الخصم
                          if (formData.discountType && formData.discountType !== "none" && formData.discountValue) {
                            const discount = formData.discountType === "percentage" 
                              ? (totalAmount * parseFloat(formData.discountValue || "0") / 100)
                              : parseFloat(formData.discountValue || "0");
                            finalAmount -= discount;
                          }
                          // حساب الضريبة
                          if (formData.includesTax) {
                            const tax = finalAmount * parseFloat(formData.taxRate || "15") / 100;
                            finalAmount += tax;
                          }
                          return finalAmount.toLocaleString("ar-SA");
                        })()} ريال</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* ملاحظات */}
              <div>
                <Label>ملاحظات (اختياري)</Label>
                <Textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="أي ملاحظات إضافية على عرض السعر..."
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAddDialog(false)}>
                إلغاء
              </Button>
              <Button 
                onClick={handleAddQuotation} 
                disabled={addQuotationMutation.isPending || quotationItems.length === 0}
              >
                {addQuotationMutation.isPending && <Loader2 className="h-4 w-4 ml-2 animate-spin" />}
                إضافة عرض السعر
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Dialog التفاوض */}
        <Dialog open={showNegotiationDialog} onOpenChange={setShowNegotiationDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Handshake className="h-5 w-5 text-blue-600" />
                التفاوض على عرض السعر
              </DialogTitle>
              <DialogDescription>
                أدخل المبلغ المتفق عليه بعد التفاوض مع المورد
              </DialogDescription>
            </DialogHeader>
            {selectedQuotationForNegotiation && (
              <div className="space-y-4">
                {/* معلومات العرض */}
                <div className="bg-muted/50 p-4 rounded-lg space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">رقم العرض:</span>
                    <span className="font-medium">{selectedQuotationForNegotiation.quotationNumber}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">المورد:</span>
                    <span className="font-medium">{selectedQuotationForNegotiation.supplierName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">المبلغ الأصلي:</span>
                    <span className="font-bold text-primary">
                      {parseFloat(selectedQuotationForNegotiation.totalAmount || 0).toLocaleString("ar-SA")} ريال
                    </span>
                  </div>
                </div>

                {/* المبلغ بعد التفاوض */}
                <div>
                  <Label>المبلغ بعد التفاوض (ريال) *</Label>
                  <Input
                    type="number"
                    value={negotiatedAmount}
                    onChange={(e) => setNegotiatedAmount(e.target.value)}
                    placeholder="أدخل المبلغ بعد التفاوض..."
                    className="mt-1"
                  />
                  {negotiatedAmount && parseFloat(negotiatedAmount) < parseFloat(selectedQuotationForNegotiation.totalAmount || 0) && (
                    <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded text-green-800 text-sm flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4" />
                      <span>
                        وفر: {(parseFloat(selectedQuotationForNegotiation.totalAmount || 0) - parseFloat(negotiatedAmount)).toLocaleString("ar-SA")} ريال
                        ({((1 - parseFloat(negotiatedAmount) / parseFloat(selectedQuotationForNegotiation.totalAmount || 1)) * 100).toFixed(1)}%)
                      </span>
                    </div>
                  )}
                </div>

                {/* ملاحظات التفاوض */}
                <div>
                  <Label>ملاحظات التفاوض</Label>
                  <Textarea
                    value={negotiationNotes}
                    onChange={(e) => setNegotiationNotes(e.target.value)}
                    placeholder="مثال: تم الاتفاق على تخفيض السعر مقابل..."
                    className="mt-1"
                    rows={3}
                  />
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowNegotiationDialog(false)}>
                إلغاء
              </Button>
              <Button 
                onClick={handleSaveNegotiation}
                disabled={!negotiatedAmount || saveNegotiationMutation.isPending}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {saveNegotiationMutation.isPending && <Loader2 className="h-4 w-4 ml-2 animate-spin" />}
                حفظ نتيجة التفاوض
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Dialog اعتماد عرض السعر المتقدمة */}
        <Dialog open={showApproveDialog} onOpenChange={setShowApproveDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>اعتماد عرض السعر</DialogTitle>
              <DialogDescription>
                يمكنك تعديل المبلغ المعتمد بعد التفاوض مع المورد
              </DialogDescription>
            </DialogHeader>
            {selectedQuotationForApproval && (
              <div className="space-y-4">
                {/* معلومات العرض */}
                <div className="bg-muted/50 p-4 rounded-lg space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">رقم العرض:</span>
                    <span className="font-medium">{selectedQuotationForApproval.quotationNumber}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">المورد:</span>
                    <span className="font-medium">{selectedQuotationForApproval.supplierName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">المبلغ الأصلي:</span>
                    <span className="font-bold text-primary">
                      {parseFloat(selectedQuotationForApproval.totalAmount || 0).toLocaleString("ar-SA")} ريال
                    </span>
                  </div>
                </div>

                {/* المبلغ المعتمد */}
                <div>
                  <Label>المبلغ المعتمد (ريال) *</Label>
                  <Input
                    type="number"
                    value={approvedAmount}
                    onChange={(e) => setApprovedAmount(e.target.value)}
                    placeholder="أدخل المبلغ المعتمد..."
                    className="mt-1"
                  />
                  {approvedAmount && parseFloat(approvedAmount) !== parseFloat(selectedQuotationForApproval.totalAmount || 0) && (
                    <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-yellow-800 text-sm flex items-center gap-2">
                      <AlertCircle className="h-4 w-4" />
                      <span>سيتم اعتماد مبلغ مختلف عن العرض الأصلي</span>
                    </div>
                  )}
                </div>

                {/* المبرر/الملاحظات */}
                <div>
                  <Label>مبرر الاعتماد / ملاحظات</Label>
                  <Textarea
                    value={approvalNotes}
                    onChange={(e) => setApprovalNotes(e.target.value)}
                    placeholder="مثال: تم التفاوض مع المورد للوصول إلى هذا المبلغ..."
                    className="mt-1"
                    rows={3}
                  />
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowApproveDialog(false)}>
                إلغاء
              </Button>
              <Button 
                onClick={handleConfirmApproval}
                disabled={!approvedAmount || approveQuotationMutation.isPending}
                className="bg-green-600 hover:bg-green-700"
              >
                {approveQuotationMutation.isPending && <Loader2 className="h-4 w-4 ml-2 animate-spin" />}
                اعتماد العرض
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
