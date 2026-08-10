import { useState, useEffect, useMemo } from "react";
import { useLocation } from "wouter";
import { jsPDF } from "jspdf";
import "jspdf-autotable";
import DashboardLayout from "@/components/DashboardLayout";
import { PermissionGuard } from "@/components/PermissionGuard";
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
import { PROGRAM_LABELS } from "@shared/constants";
import { useAuth } from "@/_core/hooks/useAuth";
import ExcelJS from "exceljs";
import * as XLSX from "xlsx";
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
  Link2,
  ExternalLink,
  RotateCcw,
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
  const [showAddLinkDialog, setShowAddLinkDialog] = useState(false);
  const [linkName, setLinkName] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [selectedRequestId, setSelectedRequestId] = useState<string>(requestIdFromUrl || "");
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>("");
  const [includeUnapproved, setIncludeUnapproved] = useState(true);
  
  // حالة نافذة اختيار المورد لتحميل قالب التسعير
  const [showDownloadTemplateDialog, setShowDownloadTemplateDialog] = useState(false);
  const [templateSupplierId, setTemplateSupplierId] = useState<string>("");

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

  // جلب تفاصيل الطلب المحدد برقم ID إذا تم تمريره عبر الرابط
  const { data: singleRequestData } = trpc.requests.getById.useQuery(
    { id: parseInt(selectedRequestId) },
    { enabled: !!selectedRequestId && !isNaN(parseInt(selectedRequestId)) }
  );

  const getMosqueDisplayName = (request: any) => {
    if (!request) return "غير محدد";

    // 1. إذا كان اسم المسجد موجود وصريح ولا يساوي "غير محدد"
    if (request.mosqueName && request.mosqueName !== "غير محدد" && request.mosqueName.trim()) {
      const mName = request.mosqueName.trim();
      return mName.startsWith("مسجد") ? mName : `مسجد ${mName}`;
    }

    // 2. إذا كان الطلب من برنامج بنيان أو أي طلب بدون مسجد محدد، نأخذ اسم مقدم الطلب
    const reqName = request.requesterName || request.requester?.name || request.userName || request.user?.name || request.applicantName || "";
    if (reqName && reqName.trim()) {
      const trimmed = reqName.trim();
      return trimmed.startsWith("مسجد") ? trimmed : `مسجد ${trimmed}`;
    }

    // 3. إذا كان برنامج بنيان بدون اسم مقدم طلب، يظهر "مسجد بنيان"
    if (request.programType === "bunyan" || request.programType === "bonyan") {
      return "مسجد بنيان";
    }

    return "غير محدد";
  };

  const allRequestsList = requests?.requests || [];

  const displayedRequestsList = useMemo(() => {
    if (!selectedRequestId) return allRequestsList;
    const foundInList = allRequestsList.filter((r: any) => r.id.toString() === selectedRequestId);
    if (foundInList.length > 0) return foundInList;
    if (singleRequestData) {
      const targetReq = (singleRequestData as any).request || singleRequestData;
      if (targetReq && targetReq.id) {
        const reqUser = (singleRequestData as any).requester || (singleRequestData as any).user;
        const reqName = reqUser?.name || targetReq.requesterName || (singleRequestData as any).requesterName;
        return [{
          ...targetReq,
          id: targetReq.id,
          requestNumber: targetReq.requestNumber || `REQ-${targetReq.id}`,
          mosqueName: targetReq.mosqueName || targetReq.mosqueId || "غير محدد",
          programType: targetReq.programType || "other",
          createdAt: targetReq.createdAt || new Date().toISOString(),
          requesterName: reqName,
          user: reqUser,
          requester: reqUser,
        }];
      }
    }
    return allRequestsList;
  }, [allRequestsList, selectedRequestId, singleRequestData]);

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
      if (showAddLinkDialog) {
        toast.success("تم إضافة الرابط بنجاح");
        setShowAddLinkDialog(false);
        setLinkName("");
        setLinkUrl("");
      } else {
        toast.success("تم إضافة عرض السعر بنجاح");
        setShowAddDialog(false);
        resetForm();
      }
      refetchQuotations();
    },
    onError: (error: any) => {
      const errorMessage = error.message?.substring(0, 200) || "حدث خطأ أثناء إضافة عرض السعر";
      toast.error(errorMessage);
    },
  });

  const downloadQuotationTemplate = async (supplierIdToUse?: string) => {
    const targetSupplierId = supplierIdToUse || templateSupplierId;
    const selectedSupplier = (suppliers || []).find((s: any) => s.id.toString() === targetSupplierId);
    const supplierNameToUse = selectedSupplier?.name || "";

    if (!targetSupplierId || !supplierNameToUse) {
      toast.error("يرجى اختيار المورد من القائمة أولاً");
      return;
    }

    if (!boqData?.items || boqData.items.length === 0) {
      toast.error("لا توجد بنود في جدول الكميات لتسعيرها");
      return;
    }

    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("QuotationTemplate", {
        views: [{ showGridLines: true, rightToLeft: true }]
      });

      // 1. تفعيل حماية ورقة العمل لمنع تعديل الخلايا المقفلة (اسم المورد والبنود)
      await worksheet.protect("Tamam2026", {
        selectLockedCells: true,
        selectUnlockedCells: true,
        formatCells: false,
        formatColumns: false,
        formatRows: false,
        insertColumns: false,
        insertRows: false,
        insertHyperlinks: false,
        deleteColumns: false,
        deleteRows: false,
        sort: false,
        autoFilter: false,
        pivotTables: false
      });

      // 2. ورقة عمل مخفية للموردين
      const supplierSheet = workbook.addWorksheet("SuppliersData");
      supplierSheet.state = "hidden";
      supplierSheet.getCell("A1").value = supplierNameToUse;

      // 3. تصميم الواجهة الرئيسية لعرض السعر
      const a1Cell = worksheet.getCell("A1");
      a1Cell.value = "المورد *";
      a1Cell.font = { bold: true };
      a1Cell.protection = { locked: true };

      const b1Cell = worksheet.getCell("B1");
      b1Cell.value = supplierNameToUse; // كتابة اسم المورد المختار
      b1Cell.font = { bold: true, color: { argb: "FF1E3A8A" } };
      b1Cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFE0F2FE" }
      };
      b1Cell.protection = { locked: true }; // قفل الخلية كلياً لمنع التعديل

      const a2Cell = worksheet.getCell("A2");
      a2Cell.value = "تاريخ انتهاء صلاحية العرض";
      a2Cell.font = { bold: true };
      a2Cell.protection = { locked: true };

      const b2Cell = worksheet.getCell("B2");
      b2Cell.value = ""; // خلية التاريخ
      b2Cell.note = "يرجى كتابة التاريخ بصيغة السنة-الشهر-اليوم YYYY-MM-DD";
      b2Cell.protection = { locked: false }; // السماح بإدخال التاريخ

      // صف فارغ
      worksheet.addRow([]);

      // صف العناوين للبنود
      const headerRow = worksheet.addRow(["اسم البند", "الوحدة", "الكمية", "سعر الوحدة *"]);
      headerRow.font = { bold: true };
      headerRow.eachCell((cell) => {
        cell.protection = { locked: true };
      });

      // إدراج بنود جدول الكميات
      boqData.items.forEach((item: any) => {
        const row = worksheet.addRow([
          item.itemName,
          item.unit,
          parseFloat(item.quantity),
          "" // حقل سعر الوحدة فارغ للتعبئة
        ]);
        row.getCell(1).protection = { locked: true };
        row.getCell(2).protection = { locked: true };
        row.getCell(3).protection = { locked: true };
        row.getCell(4).protection = { locked: false }; // السماح بإدخال السعر
      });

      // تنسيقات الأعمدة
      worksheet.getColumn(1).width = 40;
      worksheet.getColumn(2).width = 15;
      worksheet.getColumn(3).width = 15;
      worksheet.getColumn(4).width = 20;

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      const url = window.URL.createObjectURL(blob);
      const currentReq = (singleRequestData as any)?.request || allRequestsList.find((r: any) => r.id.toString() === selectedRequestId);
      const projectNameStr = currentReq?.projectName || currentReq?.mosqueName || currentReq?.title || currentReq?.requestNumber || "";

      let projectPart = "";
      if (projectNameStr) {
        const clean = projectNameStr.replace(/[\/\\?%*:|"<>]/g, "_").trim();
        projectPart = clean.startsWith("مشروع") ? clean : `مشروع_${clean}`;
      }
      const cleanSupplierName = supplierNameToUse.replace(/[\/\\?%*:|"<>]/g, "_").trim();
      const fileName = projectPart
        ? `قالب_عرض_سعر_${projectPart}_${cleanSupplierName}.xlsx`
        : `قالب_عرض_سعر_${cleanSupplierName}.xlsx`;

      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success(`تم تحميل قالب عرض السعر للمورد (${supplierNameToUse}) بنجاح`);
      setShowDownloadTemplateDialog(false);
    } catch (error) {
      console.error("Failed to generate Quotation template:", error);
      toast.error("حدث خطأ أثناء تحميل القالب");
    }
  };

  const handleQuotationExcelUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const buffer = evt.target?.result as ArrayBuffer;
        const workbook = XLSX.read(new Uint8Array(buffer), { type: "array" });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const rows = XLSX.utils.sheet_to_json<any[]>(worksheet, { header: 1 });

        if (rows.length < 4) {
          toast.error("الملف فارغ أو لا يحتوي على بنود التسعير");
          return;
        }

        // 1. قراءة المورد من خلية B1
        const row0 = rows[0] as any[];
        const supplierName = row0 && row0.length > 1 ? String(row0[1]).trim() : "";
        if (supplierName) {
          const matchedSupplier = (suppliers || []).find((s: any) => s.name.trim() === supplierName);
          if (matchedSupplier) {
            setSelectedSupplierId(matchedSupplier.id.toString());
            toast.info(`تم تحديد المورد: ${matchedSupplier.name}`);
          } else {
            toast.warning(`لم يتم العثور على مورد مطابق لـ "${supplierName}" في النظام`);
          }
        }

        // 2. قراءة تاريخ الانتهاء من خلية B2
        const row1 = rows[1] as any[];
        let validUntilStr = row1 && row1.length > 1 ? String(row1[1]).trim() : "";
        if (validUntilStr) {
          if (/^\d+(\.\d+)?$/.test(validUntilStr)) {
            const dateNum = parseFloat(validUntilStr);
            const dateObj = new Date(Math.round((dateNum - 25569) * 86400 * 1000));
            validUntilStr = dateObj.toISOString().split("T")[0];
          } else {
            const parsedDate = new Date(validUntilStr);
            if (!isNaN(parsedDate.getTime())) {
              validUntilStr = parsedDate.toISOString().split("T")[0];
            }
          }
          setFormData(prev => ({ ...prev, validUntil: validUntilStr }));
        }

        // 3. قراءة البنود والأسعار بدءاً من السطر الخامس
        const headers = (rows[3] as any[]).map(h => String(h || "").trim().toLowerCase());
        const nameIdx = headers.findIndex(h => h.includes("اسم البند") || h === "name");
        const priceIdx = headers.findIndex(h => h.includes("سعر الوحدة") || h === "price");

        if (nameIdx === -1 || priceIdx === -1) {
          toast.error("الملف غير مطابق للقالب. يجب وجود أعمدة: اسم البند وسعر الوحدة.");
          return;
        }

        const priceMap: Record<string, string> = {};
        for (let i = 4; i < rows.length; i++) {
          const row = rows[i] as any[];
          if (!row || row.length === 0) continue;

          const itemName = row[nameIdx];
          const priceVal = row[priceIdx];

          if (itemName && priceVal !== undefined && priceVal !== null && String(priceVal).trim() !== "") {
            const priceNum = parseFloat(String(priceVal));
            if (!isNaN(priceNum) && priceNum >= 0) {
              priceMap[String(itemName).trim()] = priceNum.toString();
            }
          }
        }

        setQuotationItems(prev => {
          let updatedCount = 0;
          const updated = prev.map(item => {
            const importedPrice = priceMap[item.itemName.trim()];
            if (importedPrice !== undefined) {
              updatedCount++;
              const price = parseFloat(importedPrice);
              return {
                ...item,
                unitPrice: importedPrice,
                totalPrice: price * item.quantity
              };
            }
            return item;
          });

          if (updatedCount > 0) {
            toast.success(`تم استيراد أسعار لـ ${updatedCount} بنود من ملف Excel بنجاح`);
          } else {
            toast.warning("لم يتم العثور على أي أسعار مطابقة لبنود جدول الكميات");
          }
          return updated;
        });

      } catch (error) {
        console.error("Failed to parse Excel file:", error);
        toast.error("فشل قراءة ملف Excel، يرجى التأكد من صيغة الملف وجودته");
      }
    };

    reader.readAsArrayBuffer(file);
    e.target.value = "";
  };

  const downloadBulkQuotationTemplate = async () => {
    if (!boqData?.items || boqData.items.length === 0) {
      toast.error("لا توجد بنود في جدول الكميات لتسعيرها");
      return;
    }

    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("QuotationsTemplate", {
        views: [{ showGridLines: true, rightToLeft: true }]
      });

      // 1. إضافة ورقة عمل مخفية للموردين
      const supplierSheet = workbook.addWorksheet("SuppliersData");
      supplierSheet.state = "hidden";
      
      const supplierNames = (suppliers || []).map((s: any) => s.name);
      if (supplierNames.length === 0) {
        supplierNames.push("لا يوجد موردين نشطين");
      }

      supplierNames.forEach((name, index) => {
        supplierSheet.getCell(`A${index + 1}`).value = name;
      });

      // 2. تصميم الواجهة الرئيسية لعروض الأسعار المتعددة
      const borderThin = {
        top: { style: "thin" as const, color: { argb: "FFD1D5DB" } },
        bottom: { style: "thin" as const, color: { argb: "FFD1D5DB" } },
        left: { style: "thin" as const, color: { argb: "FFD1D5DB" } },
        right: { style: "thin" as const, color: { argb: "FFD1D5DB" } }
      };

      // دالة لتوليد اسم العمود من الرقم (1 = A, 2 = B, 3 = C, 4 = D...)
      const getColLetter = (n: number): string => {
        let letter = "";
        while (n > 0) {
          let temp = (n - 1) % 26;
          letter = String.fromCharCode(65 + temp) + letter;
          n = Math.floor((n - temp) / 26);
        }
        return letter;
      };

      // عناوين الجنب
      const cellA1 = worksheet.getCell("A1");
      cellA1.value = "اسم المورد *";
      cellA1.font = { name: "Arial", size: 10, bold: true };
      cellA1.alignment = { horizontal: "right", vertical: "middle" };
      cellA1.border = borderThin;

      const cellA2 = worksheet.getCell("A2");
      cellA2.value = "تاريخ صلاحية العرض (YYYY-MM-DD)";
      cellA2.font = { name: "Arial", size: 10, bold: true };
      cellA2.alignment = { horizontal: "right", vertical: "middle" };
      cellA2.border = borderThin;

      // خلايا التوضيح للأعمدة B, C
      ["B1", "C1", "B2", "C2"].forEach(cellId => {
        const cell = worksheet.getCell(cellId);
        cell.border = borderThin;
      });

      // تحديد عدد الأعمدة للموردين: نمنحهم 50 عموداً كاملاً لتسعير عدد غير محدود من الموردين
      const activeSupplierCount = suppliers ? suppliers.length : 0;
      const totalSupplierCols = Math.max(activeSupplierCount + 30, 50); // إتاحة 50 عموداً على الأقل
      
      const supplierCols: string[] = [];
      for (let i = 0; i < totalSupplierCols; i++) {
        supplierCols.push(getColLetter(i + 4));
      }
      
      supplierCols.forEach((col, idx) => {
        const cellSupplier = worksheet.getCell(`${col}1`);
        if (suppliers && idx < suppliers.length) {
          cellSupplier.value = suppliers[idx].name;
        } else {
          // تركه فارغاً تماماً بدلاً من الكلمات الإرشادية ليكون الملف نظيفاً
          cellSupplier.value = "";
        }
        cellSupplier.font = { name: "Arial", size: 10, bold: true };
        cellSupplier.alignment = { horizontal: "center", vertical: "middle" };
        cellSupplier.border = borderThin;

        // القائمة المنسدلة متاحة للجميع
        cellSupplier.dataValidation = {
          type: "list",
          allowBlank: true,
          formulae: [`SuppliersData!$A$1:$A$${supplierNames.length}`],
          showErrorMessage: true,
          errorTitle: "خطأ في اختيار المورد",
          error: "يرجى اختيار المورد من القائمة المنسدلة المتاحة"
        };
        
        const cellDate = worksheet.getCell(`${col}2`);
        cellDate.value = "";
        cellDate.alignment = { horizontal: "center", vertical: "middle" };
        cellDate.border = borderThin;
        cellDate.note = "يرجى كتابة التاريخ بصيغة السنة-الشهر-اليوم YYYY-MM-DD";
      });

      worksheet.addRow([]);

      const headers = ["اسم البند", "الوحدة", "الكمية"];
      supplierCols.forEach((col, idx) => {
        if (suppliers && idx < suppliers.length) {
          headers.push(`سعر ${suppliers[idx].name} (ريال)`);
        } else {
          headers.push(`سعر المورد (ريال)`);
        }
      });

      const headerRow = worksheet.addRow(headers);
      headerRow.height = 28;
      headerRow.eachCell((cell) => {
        cell.font = { name: "Arial", size: 10, bold: true };
        cell.alignment = { horizontal: "center", vertical: "middle" };
        cell.border = borderThin;
      });

      boqData.items.forEach((item: any) => {
        const rowData = [
          item.itemName,
          item.unit,
          parseFloat(item.quantity)
        ];
        for (let i = 0; i < totalSupplierCols; i++) {
          rowData.push("");
        }

        const row = worksheet.addRow(rowData);
        row.height = 24;
        row.eachCell((cell, colNum) => {
          cell.font = { name: "Arial", size: 10 };
          cell.border = borderThin;
          if (colNum === 1) {
            cell.alignment = { horizontal: "right", vertical: "middle" };
          } else if (colNum === 2 || colNum === 3) {
            cell.alignment = { horizontal: "center", vertical: "middle" };
          } else {
            cell.alignment = { horizontal: "center", vertical: "middle" };
            cell.numFmt = "#,##0.00";
          }
        });
      });

      worksheet.getColumn(1).width = 45;
      worksheet.getColumn(2).width = 15;
      worksheet.getColumn(3).width = 15;
      supplierCols.forEach((col, idx) => {
        const colNum = idx + 4;
        worksheet.getColumn(colNum).width = 25;
      });

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      const url = window.URL.createObjectURL(blob);
      const currentReq = (singleRequestData as any)?.request || allRequestsList.find((r: any) => r.id.toString() === selectedRequestId);
      const projectNameStr = currentReq?.projectName || currentReq?.mosqueName || currentReq?.title || currentReq?.requestNumber || "";

      let projectPart = "";
      if (projectNameStr) {
        const clean = projectNameStr.replace(/[\/\\?%*:|"<>]/g, "_").trim();
        projectPart = clean.startsWith("مشروع") ? clean : `مشروع_${clean}`;
      }
      const fileName = projectPart ? `قالب_عروض_أسعار_متعددة_${projectPart}.xlsx` : "قالب_عروض_أسعار_متعددة.xlsx";
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success("تم تحميل قالب عروض الأسعار المتعددة بنجاح");
    } catch (error) {
      console.error("Failed to generate bulk quotation template:", error);
      toast.error("حدث خطأ أثناء تحميل القالب");
    }
  };

  const handleBulkQuotationExcelUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!selectedRequestId) {
      toast.error("يرجى تحديد الطلب أولاً");
      return;
    }
    if (!boqData?.items || boqData.items.length === 0) {
      toast.error("لا توجد بنود في جدول الكميات لتسعيرها");
      return;
    }

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const buffer = evt.target?.result as ArrayBuffer;
        const workbook = XLSX.read(new Uint8Array(buffer), { type: "array" });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const rows = XLSX.utils.sheet_to_json<any[]>(worksheet, { header: 1 });

        if (rows.length < 4) {
          toast.error("الملف فارغ أو لا يحتوي على بنود التسعير");
          return;
        }

        const row0 = rows[0] as any[];
        const row1 = rows[1] as any[];
        const headers = (rows[3] as any[]).map(h => String(h || "").trim().toLowerCase());

        const nameIdx = headers.findIndex(h => h.includes("اسم البند") || h === "name");

        if (nameIdx === -1) {
          toast.error("الملف غير مطابق للقالب. يجب وجود عمود اسم البند.");
          return;
        }

        const supplierColsIndices: number[] = [];
        for (let colIdx = 3; colIdx < row0.length; colIdx++) {
          const sName = row0[colIdx] ? String(row0[colIdx]).trim() : "";
          if (sName && !sName.includes("اختر المورد")) {
            supplierColsIndices.push(colIdx);
          }
        }

        if (supplierColsIndices.length === 0) {
          toast.error("لم يتم العثور على أي أسماء موردين في الصف الأول من الملف المرفوع");
          return;
        }

        toast.info(`جاري معالجة ${supplierColsIndices.length} عروض أسعار...`);
        let importedCount = 0;
        let failedCount = 0;
        const processedSupplierIds = new Set<number>();

        for (const colIdx of supplierColsIndices) {
          const supplierName = String(row0[colIdx]).trim();
          const matchedSupplier = (suppliers || []).find((s: any) => s.name.trim() === supplierName);

          if (!matchedSupplier) {
            toast.error(`المورد "${supplierName}" غير مسجل في النظام، تم تخطي هذا العمود`);
            failedCount++;
            continue;
          }

          // 1. التحقق مما إذا كان المورد لديه عرض سعر مسبق في النظام
          const alreadyInDb = quotationsData?.quotations?.some((q: any) => q.supplierId === matchedSupplier.id);
          if (alreadyInDb) {
            toast.error(`المورد "${supplierName}" لديه عرض سعر مسجل مسبقاً، تم تخطي هذا العمود`);
            failedCount++;
            continue;
          }

          // 2. التحقق من التكرار داخل نفس ملف الإكسل المرفوع (نأخذ أول عمود فقط)
          if (processedSupplierIds.has(matchedSupplier.id)) {
            toast.warning(`المورد "${supplierName}" مكرر في ملف Excel، تم أخذ عرض السعر الأول وتخطي المكرر`);
            continue;
          }

          processedSupplierIds.add(matchedSupplier.id);

          let validUntil: Date | undefined = undefined;
          let validUntilStr = row1 && row1.length > colIdx ? String(row1[colIdx]).trim() : "";
          if (validUntilStr) {
            if (/^\d+(\.\d+)?$/.test(validUntilStr)) {
              const dateNum = parseFloat(validUntilStr);
              validUntil = new Date(Math.round((dateNum - 25569) * 86400 * 1000));
            } else {
              const parsedDate = new Date(validUntilStr);
              if (!isNaN(parsedDate.getTime())) {
                validUntil = parsedDate;
              }
            }
          }

          const items: any[] = [];
          let totalAmount = 0;

          for (let i = 4; i < rows.length; i++) {
            const row = rows[i] as any[];
            if (!row || row.length === 0) continue;

            const itemName = row[nameIdx] ? String(row[nameIdx]).trim() : "";
            if (!itemName) continue;

            const boqItem = boqData.items.find((item: any) => item.itemName.trim() === itemName);
            if (!boqItem) continue;

            const priceVal = row[colIdx];
            const priceNum = priceVal !== undefined && priceVal !== null && String(priceVal).trim() !== "" 
              ? parseFloat(String(priceVal)) 
              : 0;

            const quantity = parseFloat(boqItem.quantity);
            const itemTotalPrice = (priceNum || 0) * quantity;
            totalAmount += itemTotalPrice;

            items.push({
              boqItemId: boqItem.id,
              itemName: boqItem.itemName,
              quantity,
              unit: boqItem.unit,
              unitPrice: priceNum || 0,
              totalPrice: itemTotalPrice
            });
          }

          if (items.length === 0) {
            toast.error(`لا توجد أسعار صالحة لعرض سعر المورد: ${supplierName}`);
            failedCount++;
            continue;
          }

          try {
            await addQuotationMutation.mutateAsync({
              requestId: parseInt(selectedRequestId),
              supplierId: matchedSupplier.id,
              totalAmount,
              finalAmount: totalAmount,
              validUntil,
              items,
              includesTax: false,
              notes: "تم الاستيراد تلقائياً من ملف Excel متعدد"
            });
            importedCount++;
          } catch (error: any) {
            console.error(`Failed to create quotation for ${supplierName}:`, error);
            toast.error(`فشل حفظ عرض سعر المورد: ${supplierName}`);
            failedCount++;
          }
        }

        if (importedCount > 0) {
          toast.success(`تم بنجاح استيراد وحفظ ${importedCount} عروض أسعار للموردين`);
          refetchQuotations();
        }
        if (failedCount > 0) {
          toast.warning(`فشل استيراد ${failedCount} عروض أسعار`);
        }

      } catch (error) {
        console.error("Failed to parse bulk Excel file:", error);
        toast.error("فشل قراءة ملف Excel، يرجى التأكد من صيغة الملف وجودته");
      }
    };

    reader.readAsArrayBuffer(file);
    e.target.value = "";
  };

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

  const handleAddLinkQuotation = () => {
    if (!selectedRequestId) {
      toast.error("يرجى اختيار الطلب أولاً");
      return;
    }
    if (!linkName.trim()) {
      toast.error("يرجى إدخال اسم الرابط");
      return;
    }
    if (!linkUrl.trim()) {
      toast.error("يرجى إدخال الرابط");
      return;
    }

    try {
      if (!linkUrl.startsWith("http://") && !linkUrl.startsWith("https://")) {
        throw new Error();
      }
      new URL(linkUrl);
    } catch (_) {
      toast.error("يرجى إدخال رابط صحيح (يجب أن يبدأ بـ http:// أو https://)");
      return;
    }

    const supplierId = suppliers && suppliers.length > 0 ? suppliers[0].id : 1;

    addQuotationMutation.mutate({
      requestId: parseInt(selectedRequestId),
      supplierId: supplierId,
      totalAmount: 0,
      finalAmount: 0,
      notes: linkName,
      documentUrl: linkUrl,
      includesTax: true,
      items: [],
    });
  };

  const handleAddQuotation = () => {
    if (!selectedRequestId) {
      toast.error("يرجى اختيار الطلب أولاً");
      return;
    }
    if (!selectedSupplierId) {
      toast.error("يرجى اختيار المورد");
      return;
    }

    const hasExistingQuotation = quotationsData?.quotations?.some(
      (q: any) => q.supplierId === parseInt(selectedSupplierId)
    );
    if (hasExistingQuotation) {
      toast.error("تم إضافة عرض سعر لهذا المورد مسبقاً");
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

    // التحقق من نسبة الضريبة إذا لم يكن السعر شامل الضريبة
    if (!formData.includesTax && !formData.taxRate) {
      toast.error("يرجى إدخال نسبة الضريبة");
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
    if (!formData.includesTax) {
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
      taxRate: !formData.includesTax ? parseFloat(formData.taxRate || "15") : null,
      taxAmount: !formData.includesTax ? taxAmount : null,
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
    setApprovedAmount(quotation.approvedAmount?.toString() || quotation.negotiatedAmount?.toString() || quotation.finalAmount?.toString() || quotation.totalAmount?.toString() || "");
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
      approvedAmount: approvedAmount || undefined,
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
            {selectedRequestId && (
              <div className="flex items-center justify-between bg-muted/40 p-2.5 rounded-lg border border-border/50 mb-4 transition-all">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-[11px] font-medium px-2 py-0.5 bg-background border border-gray-200 text-muted-foreground">
                    تصفية محددة
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    عرض عروض أسعار الطلب رقم <strong className="font-semibold text-foreground">#{selectedRequestId}</strong>
                  </span>
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="h-7 text-xs gap-1.5 px-3 bg-background hover:bg-muted text-gray-700 border-gray-200 rounded-md font-medium shadow-2xs"
                  onClick={() => {
                    setSelectedRequestId("");
                    navigate("/quotations");
                  }}
                >
                  <RotateCcw className="h-3.5 w-3.5 text-gray-500" />
                  إظهار كافة الطلبات
                </Button>
              </div>
            )}
            {displayedRequestsList && displayedRequestsList.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-right">رقم الطلب</TableHead>
                    <TableHead className="text-right">المسجد</TableHead>
                    <TableHead className="text-right">البرنامج</TableHead>
                    <TableHead className="text-right">تاريخ التقديم</TableHead>
                    <TableHead className="text-right">الإجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {displayedRequestsList.map((request: any) => (
                    <TableRow 
                      key={request.id} 
                      className={selectedRequestId === request.id.toString() ? "bg-primary/10" : "cursor-pointer hover:bg-muted/50"}
                      onClick={() => setSelectedRequestId(request.id.toString())}
                    >
                      <TableCell className="font-mono text-sm text-right">{request.requestNumber}</TableCell>
                      <TableCell className="font-medium text-right">{getMosqueDisplayName(request)}</TableCell>
                      <TableCell className="text-right">
                        <Badge variant="outline">
                          {PROGRAM_LABELS[request.programType as keyof typeof PROGRAM_LABELS] || request.programType}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">{new Date(request.createdAt).toLocaleDateString('ar-SA')}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-2 justify-start">
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
                <p>لا توجد طلبات مطابقة للبحث</p>
              </div>
            )}
            {selectedRequestId && (
              <div className="mt-4 flex justify-end gap-3">
                <Button onClick={() => setShowAddDialog(true)}>
                  <Plus className="h-4 w-4 ml-2" />
                  إضافة عرض سعر للطلب المحدد
                </Button>
                <Button variant="outline" onClick={() => setShowAddLinkDialog(true)}>
                  <Link2 className="h-4 w-4 ml-2" />
                  إضافة رابط
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
                      <TableRow className="border-b-2 border-slate-300 dark:border-slate-700">
                        <TableHead className="w-12 text-center font-bold">#</TableHead>
                        <TableHead className="font-bold">البند</TableHead>
                        <TableHead className="font-bold">الوصف</TableHead>
                        <TableHead className="font-bold">الوحدة</TableHead>
                        <TableHead className="text-center font-bold">الكمية</TableHead>
                        <TableHead className="text-center font-bold">سعر الوحدة</TableHead>
                        <TableHead className="text-center font-bold">الإجمالي</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody className="divide-y divide-slate-300 dark:divide-slate-700">
                      {boqData.items.map((item: any, index: number) => (
                        <TableRow key={item.id} className="border-b border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                          <TableCell className="text-center">{index + 1}</TableCell>
                          <TableCell className="font-medium align-middle max-w-[400px] min-w-[180px]">
                            <div className="whitespace-normal break-words leading-relaxed [overflow-wrap:anywhere]" title={item.itemName}>
                              {item.itemName}
                            </div>
                          </TableCell>
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
            <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-4">
              <CardTitle className="flex items-center gap-2">
                <Receipt className="h-5 w-5" />
                عروض الأسعار المقدمة
              </CardTitle>
              <div className="flex items-center gap-2">
                <input
                  type="file"
                  id="bulk-quotation-excel-upload"
                  className="hidden"
                  accept=".xlsx,.xls,.csv"
                  onChange={handleBulkQuotationExcelUpload}
                />
                <Button
                  onClick={downloadBulkQuotationTemplate}
                  variant="outline"
                  className="border-green-600 text-green-600 hover:bg-green-50 text-xs sm:text-sm"
                  size="sm"
                >
                  <Download className="h-4 w-4 ml-2" />
                  تحميل قالب عروض الأسعار
                </Button>
                <Button
                  onClick={() => document.getElementById("bulk-quotation-excel-upload")?.click()}
                  variant="outline"
                  className="border-green-600 text-green-600 hover:bg-green-50 text-xs sm:text-sm"
                  size="sm"
                >
                  <Upload className="h-4 w-4 ml-2" />
                  رفع قالب عروض الاسعار
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {quotationsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : (() => {
                const allQuotations = quotationsData?.quotations ?? [];
                const linkQuotations = allQuotations.filter((q: any) => q.documentUrl && parseFloat(q.totalAmount) === 0);
                const normalQuotations = allQuotations.filter((q: any) => !q.documentUrl || parseFloat(q.totalAmount) > 0);
                const hasAcceptedQuotation = normalQuotations.some((q: any) => q.status === "accepted");

                return (
                  <div className="space-y-6">
                    {/* روابط عروض الأسعار الخارجية المضافة */}
                    {linkQuotations.length > 0 && (
                      <div className="p-5 bg-indigo-50/40 dark:bg-indigo-950/10 border border-indigo-100 dark:border-indigo-900/40 rounded-xl">
                        <h3 className="text-sm font-bold text-indigo-900 dark:text-indigo-200 mb-3 flex items-center gap-2 justify-start">
                          <Link2 className="h-4.5 w-4.5 text-indigo-600 dark:text-indigo-400" />
                          روابط مراجعة عروض الأسعار الخارجية المرفقة
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                          {linkQuotations.map((link: any) => (
                            <div 
                              key={link.id} 
                              className="bg-white dark:bg-slate-900/60 p-3.5 rounded-lg border border-indigo-100/80 dark:border-indigo-900/30 flex items-center justify-between gap-3 shadow-xs hover:shadow-md transition-all duration-300"
                            >
                              <div className="min-w-0 text-right">
                                <p className="text-xs font-bold text-slate-700 dark:text-slate-200 truncate">{link.notes || "رابط خارجي"}</p>
                                <span className="text-[10px] text-muted-foreground block mt-1">تمت الإضافة: {new Date(link.createdAt).toLocaleDateString("ar-SA")}</span>
                              </div>
                              <Button variant="outline" size="sm" className="shrink-0 h-8 text-indigo-600 hover:text-indigo-700 border-indigo-200 hover:bg-indigo-50/50" asChild>
                                <a href={link.documentUrl} target="_blank" rel="noopener noreferrer">
                                  <ExternalLink className="h-3.5 w-3.5 ml-1" />
                                  فتح الرابط
                                </a>
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {normalQuotations.length > 0 ? (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>رقم العرض</TableHead>
                            <TableHead>المورد</TableHead>
                            <TableHead>المبلغ الأصلي</TableHead>
                            <TableHead>المبلغ النهائي</TableHead>
                            <TableHead>تاريخ الصلاحية</TableHead>
                            <TableHead className="text-right">الحالة</TableHead>
                            <TableHead className="text-right">الإجراءات</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {normalQuotations.map((quotation: any) => {
                            const statusConfig = QUOTATION_STATUS[quotation.status as keyof typeof QUOTATION_STATUS] || QUOTATION_STATUS.pending;
                            return (
                              <TableRow key={quotation.id}>
                                <TableCell className="font-medium">
                                  <div className="flex flex-col">
                                    <div className="flex items-center gap-2 justify-start">
                                      <span>{quotation.quotationNumber}</span>
                                      {quotation.documentUrl && (
                                        <Badge variant="outline" className="text-[10px] py-0 px-1 bg-blue-50 text-blue-700 border-blue-200">
                                          مرفق العرض
                                        </Badge>
                                      )}
                                    </div>
                                    {quotation.documentUrl && (
                                      <a
                                        href={quotation.documentUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-blue-600 hover:text-blue-800 hover:underline text-xs flex items-center gap-1 mt-1 justify-start font-normal"
                                      >
                                        <ExternalLink className="h-3 w-3" />
                                        فتح الملف المرفق
                                      </a>
                                    )}
                                  </div>
                                </TableCell>
                                <TableCell>{quotation.supplierName || "غير محدد"}</TableCell>
                                <TableCell>{parseFloat(quotation.totalAmount).toLocaleString("ar-SA")} ريال</TableCell>
                                <TableCell className="font-medium text-primary">
                                  {parseFloat(quotation.approvedAmount || quotation.negotiatedAmount || quotation.finalAmount || quotation.totalAmount).toLocaleString("ar-SA")} ريال
                                </TableCell>
                                <TableCell>
                                  {quotation.validUntil ? (
                                    <div className="flex flex-col text-right">
                                      <span>{new Date(quotation.validUntil).toLocaleDateString("ar-SA")}</span>
                                      {new Date(quotation.validUntil) < new Date() && (
                                        <span className="text-xs text-red-500 font-medium">منتهي</span>
                                      )}
                                    </div>
                                  ) : (
                                    <span className="text-muted-foreground">-</span>
                                  )}
                                </TableCell>
                                <TableCell className="text-right">
                                  <Badge className={statusConfig.color}>
                                    {statusConfig.label}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  <div className="flex gap-2 justify-start">
                                    <PermissionGuard permission="quotations.approve">
                                      {(quotation.status === "pending" || quotation.status === "negotiating") && (
                                        <>
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            className="text-green-600"
                                            onClick={() => openApproveDialog(quotation)}
                                            disabled={hasAcceptedQuotation}
                                          >
                                            <CheckCircle2 className="h-4 w-4 ml-1" />
                                            اعتماد
                                          </Button>
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            className="text-red-600"
                                            onClick={() => handleRejectQuotation(quotation.id)}
                                            disabled={hasAcceptedQuotation}
                                          >
                                            <XCircle className="h-4 w-4 ml-1" />
                                            رفض
                                          </Button>
                                        </>
                                      )}
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
                                      {quotation.status === "rejected" && (
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          className="text-blue-600"
                                          onClick={() => handleReactivateQuotation(quotation.id)}
                                          disabled={hasAcceptedQuotation}
                                        >
                                          <Clock className="h-4 w-4 ml-1" />
                                          إعادة للمراجعة
                                        </Button>
                                      )}
                                    </PermissionGuard>
                                  </div>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-12 text-center">
                        <Receipt className="h-12 w-12 text-muted-foreground mb-4" />
                        <h3 className="text-lg font-semibold mb-2">لا توجد عروض أسعار مسجلة</h3>
                        <p className="text-muted-foreground mb-6">يرجى إضافة عروض الأسعار أو مراجعة روابط عروض الأسعار الخارجية المرفقة أعلاه.</p>
                          <div className="flex gap-3 justify-center">
                            <Button onClick={() => setShowAddDialog(true)}>
                              <Plus className="h-4 w-4 ml-2" />
                              إضافة أول عرض سعر
                            </Button>
                            {linkQuotations.length === 0 && (
                              <Button
                                variant="outline"
                                onClick={() => setShowAddLinkDialog(true)}
                              >
                                <Link2 className="h-4 w-4 ml-2" />
                                إضافة رابط
                              </Button>
                            )}
                          </div>
                      </div>
                    )}
                  </div>
                );
              })()}
            </CardContent>
          </Card>
        )}

        {/* Dialog إضافة عرض سعر مع تسعير البنود */}
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogContent className="!max-w-[98vw] !w-[98vw] max-h-[95vh] overflow-y-auto" dir="rtl">
            <DialogHeader className="pb-4 border-b text-right sm:text-right">
              <DialogTitle className="text-2xl flex items-center gap-3 justify-start">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Receipt className="h-7 w-7 text-primary" />
                </div>
                إضافة عرض سعر جديد
              </DialogTitle>
              <DialogDescription className="text-base text-right sm:text-right">أدخل تفاصيل عرض السعر من المورد مع تسعير كل بند</DialogDescription>
            </DialogHeader>
            <div className="space-y-6 py-4 text-right">
              {/* خيارات الاستيراد والتصدير عبر Excel */}
              <div className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-border bg-muted/40 p-4">
                <div className="flex items-center gap-2">
                  <FileSpreadsheet className="h-5 w-5 text-primary" />
                  <span className="font-semibold text-sm">تعبئة عرض السعر عبر Excel</span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="file"
                    id="quotation-excel-upload"
                    className="hidden"
                    accept=".xlsx,.xls,.csv"
                    onChange={handleQuotationExcelUpload}
                  />
                  <Button
                    onClick={() => {
                      setTemplateSupplierId(selectedSupplierId || "");
                      setShowDownloadTemplateDialog(true);
                    }}
                    variant="outline"
                    className="border-primary text-primary hover:bg-primary/10 text-xs sm:text-sm"
                    size="sm"
                  >
                    <Download className="h-4 w-4 ml-2" />
                    تحميل قالب التسعير (Excel)
                  </Button>
                  <Button
                    onClick={() => document.getElementById("quotation-excel-upload")?.click()}
                    variant="outline"
                    className="border-primary text-primary hover:bg-primary/10 text-xs sm:text-sm"
                    size="sm"
                  >
                    <Upload className="h-4 w-4 ml-2" />
                    رفع عرض السعر المسعر (Excel)
                  </Button>
                </div>
              </div>

              {/* معلومات المورد - في الأعلى */}
              <div className="p-5 bg-gradient-to-r from-primary/5 to-primary/10 rounded-xl border-2 border-primary/20">
                <div className="flex items-center gap-3 mb-4 justify-start">
                  <Building2 className="h-6 w-6 text-primary" />
                  <h3 className="text-lg font-bold text-primary">بيانات المورد</h3>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="text-right">
                    <Label className="text-base font-semibold mb-2 block text-right">اسم المورد *</Label>
                    <Select value={selectedSupplierId} onValueChange={setSelectedSupplierId}>
                      <SelectTrigger className="h-12 text-base bg-white text-right" dir="rtl">
                        <SelectValue placeholder="اختر المورد..." />
                      </SelectTrigger>
                      <SelectContent dir="rtl">
                        {suppliers?.map((supplier: any) => (
                          <SelectItem key={supplier.id} value={supplier.id.toString()} className="text-right">
                            <div className="flex items-center gap-2 justify-start">
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
                    {selectedSupplierId && quotationsData?.quotations?.some((q: any) => q.supplierId === parseInt(selectedSupplierId)) && (
                      <p className="text-red-500 text-sm mt-2 font-medium">تم إضافة عرض سعر لهذا المورد مسبقاً</p>
                    )}
                    <div className="flex items-center gap-2 mt-3 justify-start">
                      <Checkbox
                        id="includeUnapproved"
                        checked={includeUnapproved}
                        onCheckedChange={(checked) => setIncludeUnapproved(checked as boolean)}
                      />
                      <label htmlFor="includeUnapproved" className="text-sm text-muted-foreground cursor-pointer">
                        إظهار الموردين غير المعتمدين
                      </label>
                    </div>
                  </div>
                  <div className="text-right">
                    <Label className="text-base font-semibold mb-2 flex items-center gap-2 justify-start">
                      <Calendar className="h-5 w-5 text-orange-500" />
                      تاريخ انتهاء صلاحية العرض
                    </Label>
                    <Input
                      type="date"
                      value={formData.validUntil}
                      onChange={(e) => setFormData({ ...formData, validUntil: e.target.value })}
                      className="h-12 text-base bg-white border-orange-200 focus:border-orange-400 text-right"
                      dir="rtl"
                    />
                    {formData.validUntil && (
                      <div className="mt-2 p-2 bg-orange-50 rounded-lg border border-orange-200">
                        <p className="text-sm text-orange-700 font-medium flex items-center gap-2 justify-start">
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
                    </div>
                  </div>
                  <div className="border rounded-lg overflow-x-auto shadow-sm">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-gradient-to-r from-primary/10 to-primary/5">
                          <TableHead className="w-14 text-center font-bold">#</TableHead>
                          <TableHead className="min-w-[220px] max-w-[450px] font-bold text-right">البند</TableHead>
                          <TableHead className="w-24 text-center font-bold">الوحدة</TableHead>
                          <TableHead className="w-28 text-center font-bold">الكمية</TableHead>
                          <TableHead className="w-40 text-center font-bold">سعر الوحدة (ريال)</TableHead>
                          <TableHead className="w-36 text-center font-bold">الإجمالي</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {quotationItems.map((item, index) => (
                          <TableRow key={item.boqItemId} className="hover:bg-muted/30">
                            <TableCell className="text-center text-muted-foreground font-medium align-middle">{index + 1}</TableCell>
                            <TableCell className="font-medium align-middle max-w-[450px] min-w-[200px]">
                              <div
                                className="text-sm font-semibold text-foreground whitespace-normal break-words leading-relaxed text-right [overflow-wrap:anywhere]"
                                title={item.itemName}
                              >
                                {item.itemName}
                              </div>
                            </TableCell>
                            <TableCell className="text-center align-middle">
                              <Badge variant="secondary" className="font-normal">{item.unit}</Badge>
                            </TableCell>
                            <TableCell className="text-center font-medium align-middle">{item.quantity.toLocaleString("ar-SA")}</TableCell>
                            <TableCell className="align-middle">
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
                            <TableCell className="text-center align-middle">
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
                        onCheckedChange={(checked) => setFormData({ 
                          ...formData, 
                          includesTax: checked as boolean,
                          taxRate: checked ? "" : "15.00"
                        })}
                      />
                      <label htmlFor="includesTax" className="text-base font-medium cursor-pointer">
                        السعر شامل ضريبة القيمة المضافة
                      </label>
                    </div>
                    {!formData.includesTax && (
                      <div>
                        <Label className="text-sm font-semibold mb-2 block">نسبة الضريبة (%) *</Label>
                        <Input
                          type="number"
                          value={formData.taxRate}
                          onChange={(e) => setFormData({ ...formData, taxRate: e.target.value })}
                          placeholder="15.00"
                          className={`h-10 w-32 bg-white ${!formData.taxRate ? 'border-destructive focus-visible:ring-destructive' : ''}`}
                          min="0"
                          max="100"
                          step="0.01"
                        />
                        {!formData.taxRate && (
                          <p className="text-xs text-destructive mt-1">نسبة الضريبة مطلوبة عند عدم شمول السعر للضريبة</p>
                        )}
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
                {(!formData.includesTax || (formData.discountType && formData.discountType !== "none" && formData.discountValue)) && (
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
                      {!formData.includesTax && (
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
                          if (!formData.includesTax) {
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

        {/* Dialog إضافة رابط */}
        <Dialog open={showAddLinkDialog} onOpenChange={setShowAddLinkDialog}>
          <DialogContent className="max-w-md" dir="rtl">
            <DialogHeader className="text-right sm:text-right">
              <DialogTitle className="text-xl flex items-center gap-2 justify-start">
                <Link2 className="h-5 w-5 text-primary" />
                <span>إضافة رابط جديد</span>
              </DialogTitle>
              <DialogDescription className="text-right sm:text-right">
                أدخل اسم الرابط والعنوان الإلكتروني لإضافته لعروض الأسعار
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4 text-right">
              <div className="space-y-2">
                <Label htmlFor="linkName" className="block text-sm font-semibold">اسم الرابط *</Label>
                <Input
                  id="linkName"
                  value={linkName}
                  onChange={(e) => setLinkName(e.target.value)}
                  placeholder="مثال: عرض شركة التقنية الحديثة"
                  className="text-right"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="linkUrl" className="block text-sm font-semibold">الرابط *</Label>
                <Input
                  id="linkUrl"
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  placeholder="https://example.com/quotation-pdf"
                  className="text-left"
                  dir="ltr"
                />
              </div>
            </div>
            <DialogFooter className="flex gap-2 justify-start">
              <Button 
                onClick={handleAddLinkQuotation} 
                disabled={addQuotationMutation.isPending}
              >
                {addQuotationMutation.isPending && <Loader2 className="h-4 w-4 ml-2 animate-spin" />}
                إضافة الرابط
              </Button>
              <Button variant="outline" onClick={() => setShowAddLinkDialog(false)}>
                إلغاء
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Dialog التفاوض */}
        <Dialog open={showNegotiationDialog} onOpenChange={setShowNegotiationDialog}>
          <DialogContent className="max-w-md" dir="rtl">
            <DialogHeader className="text-right sm:text-right">
              <DialogTitle className="flex items-center gap-2 justify-start text-right w-full">
                <Handshake className="h-5 w-5 text-blue-600" />
                <span>التفاوض على عرض السعر</span>
              </DialogTitle>
              <DialogDescription className="text-right sm:text-right">
                أدخل المبلغ المتفق عليه بعد التفاوض مع المورد
              </DialogDescription>
            </DialogHeader>
            {selectedQuotationForNegotiation && (
              <div className="space-y-4">
                {/* معلومات العرض */}
                <div className="bg-muted/50 p-4 rounded-lg space-y-2 text-right">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground text-right">رقم العرض:</span>
                    <span className="font-medium text-left">{selectedQuotationForNegotiation.quotationNumber}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground text-right">المورد:</span>
                    <span className="font-medium text-left">{selectedQuotationForNegotiation.supplierName}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground text-right">المبلغ الأصلي:</span>
                    <span className="font-bold text-primary text-left">
                      {parseFloat(selectedQuotationForNegotiation.totalAmount || 0).toLocaleString("ar-SA")} ريال
                    </span>
                  </div>
                </div>

                {/* المبلغ بعد التفاوض */}
                <div className="text-right">
                  <Label className="block mb-2">المبلغ بعد التفاوض (ريال) *</Label>
                  <Input
                    type="number"
                    value={negotiatedAmount}
                    onChange={(e) => setNegotiatedAmount(e.target.value)}
                    placeholder="أدخل المبلغ بعد التفاوض..."
                    className="mt-1 text-right"
                  />
                  {negotiatedAmount && parseFloat(negotiatedAmount) < parseFloat(selectedQuotationForNegotiation.totalAmount || 0) && (
                    <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded text-green-800 text-sm flex items-center gap-2 justify-start">
                      <CheckCircle2 className="h-4 w-4" />
                      <span>
                        وفر: {(parseFloat(selectedQuotationForNegotiation.totalAmount || 0) - parseFloat(negotiatedAmount)).toLocaleString("ar-SA")} ريال
                        ({((1 - parseFloat(negotiatedAmount) / parseFloat(selectedQuotationForNegotiation.totalAmount || 1)) * 100).toFixed(1)}%)
                      </span>
                    </div>
                  )}
                </div>

                {/* ملاحظات التفاوض */}
                <div className="text-right">
                  <Label className="block mb-2">ملاحظات التفاوض</Label>
                  <Textarea
                    value={negotiationNotes}
                    onChange={(e) => setNegotiationNotes(e.target.value)}
                    placeholder="مثال: تم الاتفاق على تخفيض السعر مقابل..."
                    className="mt-1 text-right"
                    rows={3}
                  />
                </div>
              </div>
            )}
            <DialogFooter className="flex gap-2 justify-start">
              <Button 
                onClick={handleSaveNegotiation}
                disabled={!negotiatedAmount || saveNegotiationMutation.isPending}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {saveNegotiationMutation.isPending && <Loader2 className="h-4 w-4 ml-2 animate-spin" />}
                حفظ نتيجة التفاوض
              </Button>
              <Button variant="outline" onClick={() => setShowNegotiationDialog(false)}>
                إلغاء
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Dialog اعتماد عرض السعر المتقدمة */}
        <Dialog open={showApproveDialog} onOpenChange={setShowApproveDialog}>
          <DialogContent className="max-w-md" dir="rtl">
            <DialogHeader className="text-right sm:text-right">
              <DialogTitle className="text-right">اعتماد عرض السعر</DialogTitle>
              <DialogDescription className="text-right sm:text-right">
                يمكنك تعديل المبلغ المعتمد بعد التفاوض مع المورد
              </DialogDescription>
            </DialogHeader>
            {selectedQuotationForApproval && (
              <div className="space-y-4">
                {/* معلومات العرض */}
                <div className="bg-muted/50 p-4 rounded-lg space-y-2 text-right">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground text-right">رقم العرض:</span>
                    <span className="font-medium text-left">{selectedQuotationForApproval.quotationNumber}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground text-right">المورد:</span>
                    <span className="font-medium text-left">{selectedQuotationForApproval.supplierName}</span>
                  </div>
                  {selectedQuotationForApproval.finalAmount && parseFloat(selectedQuotationForApproval.finalAmount) !== parseFloat(selectedQuotationForApproval.totalAmount) ? (
                    <>
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground text-right">المبلغ الأصلي:</span>
                        <span className="font-medium text-left">
                          {parseFloat(selectedQuotationForApproval.totalAmount || 0).toLocaleString("ar-SA")} ريال
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground text-right">المبلغ النهائي:</span>
                        <span className="font-bold text-primary text-left">
                          {parseFloat(selectedQuotationForApproval.finalAmount).toLocaleString("ar-SA")} ريال
                        </span>
                      </div>
                    </>
                  ) : (
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground text-right">المبلغ النهائي:</span>
                      <span className="font-bold text-primary text-left">
                        {parseFloat(selectedQuotationForApproval.finalAmount || selectedQuotationForApproval.totalAmount || 0).toLocaleString("ar-SA")} ريال
                      </span>
                    </div>
                  )}
                  {selectedQuotationForApproval.negotiatedAmount && (
                    <div className="flex justify-between items-center text-blue-700 bg-blue-50 px-2 py-1 rounded">
                      <span className="font-semibold text-right">المبلغ بعد التفاوض:</span>
                      <span className="font-bold text-left">
                        {parseFloat(selectedQuotationForApproval.negotiatedAmount).toLocaleString("ar-SA")} ريال
                      </span>
                    </div>
                  )}
                </div>

                {/* المبلغ المعتمد */}
                <div className="text-right">
                  <Label className="block mb-2">المبلغ المعتمد (ريال) *</Label>
                  <Input
                    type="number"
                    value={approvedAmount}
                    onChange={(e) => setApprovedAmount(e.target.value)}
                    placeholder="أدخل المبلغ المعتمد..."
                    className="mt-1 text-right"
                  />
                  {approvedAmount && parseFloat(approvedAmount) !== parseFloat(selectedQuotationForApproval.finalAmount || selectedQuotationForApproval.totalAmount || 0) && (
                    <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-yellow-800 text-sm flex items-center gap-2 justify-start">
                      <AlertCircle className="h-4 w-4" />
                      <span>سيتم اعتماد مبلغ مختلف عن العرض النهائي</span>
                    </div>
                  )}
                </div>
              </div>
            )}
            <DialogFooter className="flex gap-2 justify-start">
              <Button 
                onClick={handleConfirmApproval}
                disabled={!approvedAmount || approveQuotationMutation.isPending}
                className="bg-green-600 hover:bg-green-700"
              >
                {approveQuotationMutation.isPending && <Loader2 className="h-4 w-4 ml-2 animate-spin" />}
                اعتماد العرض
              </Button>
              <Button variant="outline" onClick={() => setShowApproveDialog(false)}>
                إلغاء
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Dialog اختيار المورد لتحميل قالب التسعير */}
        <Dialog open={showDownloadTemplateDialog} onOpenChange={setShowDownloadTemplateDialog}>
          <DialogContent className="sm:max-w-[450px]" dir="rtl">
            <DialogHeader className="text-right sm:text-right">
              <DialogTitle className="flex items-center gap-2 text-xl font-bold">
                <FileSpreadsheet className="h-6 w-6 text-primary" />
                تحميل قالب التسعير (Excel)
              </DialogTitle>
              <DialogDescription className="text-sm text-slate-600 dark:text-slate-400 mt-1.5">
                اختر المورد لإنشاء قالب عرض السعر الخاص به. سيكون اسم المورد ثابتاً ومكتوباً ولا يمكن تعديله داخل ملف الـ Excel.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-3 text-right">
              <div className="space-y-2">
                <Label htmlFor="template-supplier-select" className="text-sm font-bold">
                  اختر المورد <span className="text-red-500">*</span>
                </Label>
                <Select value={templateSupplierId} onValueChange={setTemplateSupplierId}>
                  <SelectTrigger id="template-supplier-select" className="w-full text-right bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700">
                    <SelectValue placeholder="-- اختر المورد من القائمة --" />
                  </SelectTrigger>
                  <SelectContent className="max-h-[250px] z-[9999]">
                    {suppliers && suppliers.length > 0 ? (
                      suppliers.map((s: any) => (
                        <SelectItem key={s.id} value={s.id.toString()}>
                          {s.name}
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value="none" disabled>
                        لا يوجد موردين نشطين
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter className="flex items-center justify-end gap-2 pt-2 border-t">
              <Button
                variant="outline"
                onClick={() => setShowDownloadTemplateDialog(false)}
                type="button"
              >
                إلغاء
              </Button>
              <Button
                onClick={() => downloadQuotationTemplate(templateSupplierId)}
                className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold gap-2"
                disabled={!templateSupplierId}
                type="button"
              >
                <Download className="h-4 w-4" />
                تحميل الملف (Excel)
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
