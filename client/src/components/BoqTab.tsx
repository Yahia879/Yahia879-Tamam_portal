import { useState, useImperativeHandle, forwardRef, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/_core/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import {
  Calculator,
  Plus,
  Edit,
  Trash2,
  Loader2,
  FileText,
  Download,
  Upload,
  Building2,
  Layers,
  Sparkles,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import BoqFormDialog from "./BoqFormDialog";
import { getStageOrder } from "../../../shared/constants";
import ExcelJS from "exceljs";
import * as XLSX from "xlsx";

interface BoqTabProps {
  requestId?: number;
  projectId?: number;
  isLocked?: boolean;
  hideAddButton?: boolean;
}

export interface BoqTabHandle {
  openAddDialog: () => void;
}

const BoqTab = forwardRef<BoqTabHandle, BoqTabProps>(
  ({ requestId, projectId, isLocked: externalIsLocked, hideAddButton }, ref) => {
    const { user } = useAuth();
    const userPermissions = (user as any)?.permissions ?? [];
    const hasViewDetails = userPermissions.includes("requests.view_details") || ["super_admin", "system_admin", "projects_office"].includes(user?.role || "");
    const canAdd = userPermissions.includes("boq.add") || hasViewDetails;
    const canEdit = userPermissions.includes("boq.edit") || hasViewDetails;
    const canDelete = userPermissions.includes("boq.delete") || hasViewDetails;

    const [showAddDialog, setShowAddDialog] = useState(false);
    const [showEditDialog, setShowEditDialog] = useState(false);
    const [selectedItem, setSelectedItem] = useState<any>(null);

    const utils = trpc.useUtils();

    const { data: request } = trpc.requests.getById.useQuery(
      { id: requestId! },
      { enabled: !!requestId }
    );

    const { data: projectData } = trpc.projects.getById.useQuery(
      { id: projectId! },
      { enabled: !!projectId && !requestId }
    );

    const { data: boqResult, isLoading, refetch } = trpc.projects.getBOQ.useQuery(
      { requestId, projectId },
      { enabled: !!requestId || !!projectId }
    );

    const { data: allCategories = [] } = trpc.categories.getAllCategories.useQuery();

    const boqData = boqResult?.items || [];
    const totalAmount = boqResult?.total || 0;

    const isMultiMosque = Boolean(
      request?.isMultiMosque || 
      (projectData as any)?.project?.isMultiMosque ||
      (projectData as any)?.isMultiMosque ||
      (request?.multiMosques && request.multiMosques.length > 1) ||
      ((projectData as any)?.mosques && (projectData as any).mosques.length > 1) ||
      (typeof request?.programData === "object" && (request?.programData as any)?.isMultiMosque)
    );

    const mosquesList: Array<{ id: number; name: string; city?: string; district?: string }> = useMemo(() => {
      if (request?.multiMosques && request.multiMosques.length > 0) {
        return request.multiMosques;
      }
      if ((projectData as any)?.mosques && (projectData as any).mosques.length > 0) {
        return (projectData as any).mosques;
      }
      if (request?.mosque) {
        return [request.mosque];
      }
      return [];
    }, [request, projectData]);

    const [selectedMosqueTab, setSelectedMosqueTab] = useState<string>("all");

    const isLocked =
      externalIsLocked !== undefined
         ? externalIsLocked
        : !!(
            request?.currentStage &&
            getStageOrder(request.currentStage) > getStageOrder("boq_preparation")
          );

    useImperativeHandle(ref, () => ({
      openAddDialog: () => {
        if (isLocked) {
          toast.error("لا يمكن تعديل جدول الكميات في هذه المرحلة");
          return;
        }
        if (!canAdd) {
          toast.error("لا تملك صلاحية إضافة بند جديد");
          return;
        }
        setShowAddDialog(true);
      },
    }));

    const deleteItemMutation = trpc.projects.deleteBOQItem.useMutation({
      onSuccess: () => {
        toast.success("تم حذف البند بنجاح");
        utils.projects.getBOQ.invalidate();
        refetch();
      },
      onError: (error: any) => {
        toast.error(error.message || "حدث خطأ أثناء حذف البند");
      },
    });

    const bulkMutation = trpc.projects.bulkAddBOQItems.useMutation({
      onSuccess: (data) => {
        toast.success(`تم استيراد ${data.count} بنود بنجاح`);
        utils.projects.getBOQ.invalidate();
        refetch();
      },
      onError: (err) => {
        toast.error(err.message || "حدث خطأ أثناء استيراد البنود");
      }
    });

    const currentTargetMosqueId = useMemo(() => {
      if (selectedMosqueTab !== "all") {
        const parsed = parseInt(selectedMosqueTab, 10);
        return isNaN(parsed) ? undefined : parsed;
      }
      return mosquesList.length === 1 ? mosquesList[0].id : undefined;
    }, [selectedMosqueTab, mosquesList]);

    const downloadTemplate = async () => {
      try {
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet("Template", {
          views: [{ showGridLines: true, rightToLeft: true }]
        });

        // إضافة العناوين والمثال
        worksheet.addRow(["التصنيف", "اسم البند", "الوحدة", "الكمية", "سعر الوحدة"]);
        worksheet.addRow(["أعمال إنشائية", "مثال: أعمال صيانة وسباكة", "متر مكعب", 10, 50]);

        // قائمة التصنيفات المعتمدة ديناميكياً من الموقع
        const cleanCategories = allCategories
          .filter((cat: any) => cat.type === "boq_category")
          .map((cat: any) => (cat.nameAr || cat.name || "").trim())
          .filter(Boolean);

        const categoriesList = cleanCategories.length > 0
          ? cleanCategories
          : [
              "أعمال إنشائية",
              "أعمال كهربائية",
              "أعمال سباكة",
              "تكييف وتبريد",
              "تشطيبات",
              "نجارة",
              "دهانات",
              "أرضيات",
              "أخرى"
            ];

        // إنشاء ورقة عمل مخفية لوضع التصنيفات بداخلها
        const catSheet = workbook.addWorksheet("CategoriesData");
        catSheet.state = "hidden";
        categoriesList.forEach((cat, index) => {
          catSheet.getCell(`A${index + 1}`).value = cat;
        });

        const listFormula = `CategoriesData!$A$1:$A$${categoriesList.length}`;
        for (let i = 2; i <= 100; i++) {
          worksheet.getCell(`A${i}`).dataValidation = {
            type: "list",
            allowBlank: true,
            formulae: [listFormula]
          };
        }

        worksheet.columns = [
          { width: 25 },
          { width: 35 },
          { width: 18 },
          { width: 15 },
          { width: 18 }
        ];

        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], {
          type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        const mosqueSuffix = currentTargetMosqueId 
          ? `_${mosquesList.find(m => m.id === currentTargetMosqueId)?.name || currentTargetMosqueId}` 
          : "";
        a.download = `قالب_جدول_الكميات${mosqueSuffix}.xlsx`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        toast.success("تم تنزيل قالب جدول الكميات بنجاح");
      } catch (error) {
        console.error("Failed to generate Excel template:", error);
        toast.error("حدث خطأ أثناء تنزيل القالب");
      }
    };

    const normalizeArabic = (text: string) => {
      if (!text) return "";
      return text
        .trim()
        .toLowerCase()
        .replace(/[إأآا]/g, "ا")
        .replace(/ة/g, "ه")
        .replace(/ى/g, "ي")
        .replace(/[\u064B-\u065F]/g, "");
    };

    const handleExcelUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      if (isLocked) {
        toast.error("لا يمكن تعديل جدول الكميات في هذه المرحلة");
        e.target.value = "";
        return;
      }

      if (!canAdd) {
        toast.error("لا تملك صلاحية إضافة بنود");
        e.target.value = "";
        return;
      }

      const reader = new FileReader();
      reader.onload = (evt) => {
        try {
          const data = new Uint8Array(evt.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: "array" });
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];

          if (jsonData.length < 2) {
            toast.error("الملف فارغ أو لا يحتوي على صفوف بيانات صالحة");
            return;
          }

          const headerRow = jsonData[0].map(h => normalizeArabic(String(h || "")));

          let categoryIdx = headerRow.findIndex(h => h.includes("تصنيف") || h.includes("فئه"));
          let nameIdx = headerRow.findIndex(h => h.includes("اسم") || h.includes("بند") || h.includes("وصف"));
          let descIdx = headerRow.findIndex(h => h.includes("تفاصيل") || h.includes("ملاحظات") || (h.includes("وصف") && nameIdx !== -1 && nameIdx !== headerRow.indexOf(h)));
          let unitIdx = headerRow.findIndex(h => h.includes("وحده"));
          let qtyIdx = headerRow.findIndex(h => h.includes("كميه") || h.includes("عدد"));
          let priceIdx = headerRow.findIndex(h => h.includes("سعر") || h.includes("تكلفه"));

          if (nameIdx === -1) nameIdx = 1;
          if (unitIdx === -1) unitIdx = 2;
          if (qtyIdx === -1) qtyIdx = 3;

          const itemsToInsert: any[] = [];

          for (let i = 1; i < jsonData.length; i++) {
            const row = jsonData[i];
            if (!row || row.length === 0 || row.every(cell => cell === undefined || cell === null || String(cell).trim() === "")) {
              continue;
            }

            const itemName = row[nameIdx];
            const unit = row[unitIdx];
            const rawQty = row[qtyIdx];

            if (!itemName || !unit || rawQty === undefined || rawQty === null || String(rawQty).trim() === "") {
              continue;
            }

            const quantity = parseFloat(String(rawQty));
            if (isNaN(quantity) || quantity <= 0) {
              toast.error(`السطر رقم ${i + 1}: الكمية غير صالحة، يجب أن تكون رقماً أكبر من صفر`);
              return;
            }

            let unitPrice: number | undefined = undefined;
            if (priceIdx !== -1 && row[priceIdx] !== undefined && row[priceIdx] !== null && String(row[priceIdx]).trim() !== "") {
              unitPrice = parseFloat(String(row[priceIdx]));
              if (isNaN(unitPrice) || unitPrice < 0) {
                toast.error(`السطر رقم ${i + 1}: سعر الوحدة يجب أن يكون رقماً أكبر من أو يساوي صفر`);
                return;
              }
            }

            let category = "other";
            if (categoryIdx !== -1 && row[categoryIdx]) {
              const rawCat = normalizeArabic(String(row[categoryIdx]));
              const matchedCat = (allCategories || [])
                .filter((cat: any) => cat.type === "boq_category")
                .find((cat: any) => 
                  rawCat === normalizeArabic(cat.name) || rawCat === normalizeArabic(cat.nameAr)
                );
              if (matchedCat) {
                category = matchedCat.name;
              } else {
                const matchedStatic = Object.entries(ITEM_CATEGORIES).find(([key, val]) => 
                  rawCat === normalizeArabic(key) || rawCat === normalizeArabic(val)
                );
                category = matchedStatic ? matchedStatic[0] : "other";
              }
            }

            itemsToInsert.push({
              itemName: String(itemName).trim(),
              itemDescription: descIdx !== -1 && row[descIdx] ? String(row[descIdx]).trim() : "",
              unit: String(unit).trim(),
              quantity,
              unitPrice,
              category,
              mosqueId: currentTargetMosqueId,
            });
          }

          if (itemsToInsert.length === 0) {
            toast.error("لم يتم العثور على أي بنود صالحة للاستيراد");
            return;
          }

          bulkMutation.mutate({
            requestId: requestId || undefined,
            projectId: projectId || undefined,
            mosqueId: currentTargetMosqueId,
            items: itemsToInsert
          });

        } catch (error) {
          console.error("Failed to parse Excel file:", error);
          toast.error("فشل قراءة ملف Excel، يرجى التأكد من صيغة الملف وجودته");
        }
      };

      reader.readAsArrayBuffer(file);
      e.target.value = "";
    };

    const handleDeleteItem = (id: number) => {
      if (isLocked) {
        toast.error("لا يمكن تعديل جدول الكميات في هذه المرحلة");
        return;
      }
      if (!canDelete) {
        toast.error("لا تملك صلاحية حذف البنود");
        return;
      }
      if (confirm("هل أنت متأكد من حذف هذا البند؟")) {
        deleteItemMutation.mutate({ id });
      }
    };

    const openEditDialog = (item: any) => {
      if (isLocked) {
        toast.error("لا يمكن تعديل جدول الكميات في هذه المرحلة");
        return;
      }
      if (!canEdit) {
        toast.error("لا تملك صلاحية تعديل البنود");
        return;
      }
      setSelectedItem(item);
      setShowEditDialog(true);
    };

    const handleDialogClose = () => {
      setShowAddDialog(false);
      setShowEditDialog(false);
      setSelectedItem(null);
      utils.projects.getBOQ.invalidate();
      refetch();
    };

    const ITEM_CATEGORIES: Record<string, string> = {
      construction: "أعمال إنشائية",
      electrical: "أعمال كهربائية",
      plumbing: "أعمال سباكة",
      hvac: "تكييف وتبريد",
      finishing: "تشطيبات",
      carpentry: "نجارة",
      painting: "دهانات",
      flooring: "أرضيات",
      other: "أخرى",
    };

    const categoriesMap = (allCategories || []).reduce((acc: Record<string, string>, cat: any) => {
      acc[cat.name] = cat.nameAr || cat.name;
      return acc;
    }, { ...ITEM_CATEGORIES });

    // الفلترة بحسب التبويب النشط
    const filteredItems = useMemo(() => {
      if (!isMultiMosque || selectedMosqueTab === "all") {
        return boqData;
      }
      const targetId = parseInt(selectedMosqueTab, 10);
      return boqData.filter((item: any) => item.mosqueId === targetId);
    }, [boqData, isMultiMosque, selectedMosqueTab]);

    const filteredTotalAmount = useMemo(() => {
      return filteredItems.reduce((sum: number, item: any) => {
        return sum + (item.totalPrice ? parseFloat(item.totalPrice) : 0);
      }, 0);
    }, [filteredItems]);

    const groupedItems = useMemo(() => {
      return filteredItems.reduce((acc: any, item: any) => {
        const category = item.category || "other";
        if (!acc[category]) {
          acc[category] = [];
        }
        acc[category].push(item);
        return acc;
      }, {});
    }, [filteredItems]);

    // إحصائيات كل مسجد في المشروع المتعدد
    const mosqueStats = useMemo(() => {
      if (!isMultiMosque || mosquesList.length === 0) return [];
      return mosquesList.map(mosque => {
        const mItems = boqData.filter((i: any) => i.mosqueId === mosque.id);
        const mTotal = mItems.reduce((sum: number, i: any) => sum + (i.totalPrice ? parseFloat(i.totalPrice) : 0), 0);
        return {
          ...mosque,
          itemCount: mItems.length,
          totalAmount: mTotal,
        };
      });
    }, [isMultiMosque, mosquesList, boqData]);

    if (isLoading) {
      return (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="mr-3 text-lg font-medium">جاري تحميل جداول الكميات...</span>
        </div>
      );
    }

    return (
      <div className="space-y-4 text-right" dir="rtl">
        {/* Single Unified BOQ Card */}
        <Card className="border border-border/70 shadow-xs rounded-2xl bg-card overflow-hidden">
          {/* Integrated Header Toolbar & Summary Bar */}
          <CardHeader className="p-5 border-b border-border/50 bg-muted/20 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <Calculator className="w-5 h-5" />
                </div>
                <div>
                  <CardTitle className="text-base font-bold text-foreground">جدول الكميات التفصيلي (BOQ)</CardTitle>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {isMultiMosque && selectedMosqueTab !== "all" ? (
                      <span className="text-primary font-semibold">
                        (المسجد المحدد: {mosquesList.find((m) => String(m.id) === selectedMosqueTab)?.name || ""})
                      </span>
                    ) : (
                      "إدارة واستيراد بنود وأسعار جداول الكميات التقديرية للمشروع"
                    )}
                  </p>
                </div>
              </div>

              {!hideAddButton && !isLocked && canAdd && (
                <div className="flex items-center gap-2 flex-wrap shrink-0">
                  <input
                    type="file"
                    id="boq-excel-upload"
                    className="hidden"
                    accept=".xlsx,.xls,.csv"
                    onChange={handleExcelUpload}
                  />
                  <Button
                    onClick={downloadTemplate}
                    variant="outline"
                    className="rounded-xl border-border/70 text-foreground hover:bg-muted text-xs font-bold h-9 px-3"
                    size="sm"
                  >
                    <Download className="h-3.5 w-3.5 ml-1 text-primary" />
                    تحميل القالب
                  </Button>
                  <Button
                    onClick={() => document.getElementById("boq-excel-upload")?.click()}
                    variant="outline"
                    className="rounded-xl border-border/70 text-foreground hover:bg-muted text-xs font-bold h-9 px-3"
                    size="sm"
                    disabled={bulkMutation.isPending}
                  >
                    {bulkMutation.isPending ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin ml-1" />
                    ) : (
                      <Upload className="h-3.5 w-3.5 ml-1 text-primary" />
                    )}
                    استيراد (Excel)
                  </Button>
                  <Button
                    onClick={() => setShowAddDialog(true)}
                    className="rounded-xl gradient-primary text-white text-xs font-bold shadow-md hover:shadow-lg transition-all h-9 px-3.5"
                    size="sm"
                  >
                    <Plus className="h-3.5 w-3.5 ml-1" />
                    إضافة بند
                  </Button>
                </div>
              )}
            </div>

            {/* تبويبات المساجد (في حالة المشاريع ذات المساجد المتعددة) */}
            {isMultiMosque && mosquesList.length > 0 && (
              <div className="pt-2 border-t border-border/40">
                <Tabs value={selectedMosqueTab} onValueChange={setSelectedMosqueTab} className="w-full">
                  <TabsList className="w-full flex flex-wrap h-auto p-1.5 bg-muted/60 rounded-xl gap-1.5 justify-start">
                    <TabsTrigger
                      value="all"
                      className="rounded-lg px-3.5 py-1.5 text-xs font-bold data-[state=active]:bg-primary data-[state=active]:text-white transition-all"
                    >
                      <Layers className="w-3.5 h-3.5 ml-1.5" />
                      <span>جميع المساجد (الإجمالي)</span>
                      <Badge variant="secondary" className="mr-2 text-[10px] bg-background/80 py-0">
                        {boqData.length} بند
                      </Badge>
                    </TabsTrigger>

                    {mosquesList.map((mosque) => {
                      const mItems = boqData.filter((i: any) => i.mosqueId === mosque.id);
                      const mTotal = mItems.reduce(
                        (sum: number, i: any) => sum + (i.totalPrice ? parseFloat(i.totalPrice) : 0),
                        0
                      );
                      return (
                        <TabsTrigger
                          key={mosque.id}
                          value={String(mosque.id)}
                          className="rounded-lg px-3.5 py-1.5 text-xs font-bold data-[state=active]:bg-primary data-[state=active]:text-white transition-all"
                        >
                          <Building2 className="w-3.5 h-3.5 ml-1.5" />
                          <span>{mosque.name}</span>
                          <span className="mr-2 text-[10px] opacity-85">
                            ({mItems.length} بند • {mTotal.toLocaleString("ar-SA")} ر.س)
                          </span>
                        </TabsTrigger>
                      );
                    })}
                  </TabsList>
                </Tabs>
              </div>
            )}

            {/* Integrated Metrics Strip */}
            {filteredItems.length > 0 && (
              <div className="pt-3 border-t border-border/40 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-muted/50 border border-border/60">
                  <span className="text-muted-foreground font-bold">إجمالي البنود:</span>
                  <span className="font-black text-foreground font-mono">{filteredItems.length} بند</span>
                </div>
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-primary/10 border border-primary/20">
                  <span className="text-primary font-bold">
                    {isMultiMosque && selectedMosqueTab === "all" ? "الإجمالي الكلي للمشروع:" : "إجمالي الجدول:"}
                  </span>
                  <span className="font-black text-primary font-mono text-sm">
                    {filteredTotalAmount.toLocaleString("ar-SA")} ريال
                  </span>
                </div>
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-muted/50 border border-border/60">
                  <span className="text-muted-foreground font-bold">التصنيفات:</span>
                  <span className="font-black text-foreground font-mono">{Object.keys(groupedItems).length} فئات</span>
                </div>
              </div>
            )}
          </CardHeader>

          {/* Table Items View */}
          <CardContent className="p-0">
            {filteredItems.length === 0 ? (
              <div className="text-center py-12 px-4">
                <Calculator className="mx-auto mb-3 h-12 w-12 text-muted-foreground/30" />
                <p className="text-sm font-bold text-foreground">
                  {isMultiMosque && selectedMosqueTab !== "all"
                    ? `لا توجد بنود مدخلة لجدول كميات (${mosquesList.find((m) => String(m.id) === selectedMosqueTab)?.name || ""})`
                    : "لا توجد بنود مسجلة في جدول الكميات"}
                </p>
                {!isLocked && (
                  <p className="mt-1 text-xs text-muted-foreground">يمكنك إضافة بنود جديدة أو رفع ملف Excel مستعد</p>
                )}
                {!isLocked && canAdd && (
                  <Button
                    onClick={() => setShowAddDialog(true)}
                    className="mt-4 rounded-xl gradient-primary text-white text-xs font-bold shadow-md hover:shadow-lg transition-all h-9 px-3.5"
                    size="sm"
                  >
                    <Plus className="h-3.5 w-3.5 ml-1" />
                    إضافة بند {isMultiMosque && selectedMosqueTab !== "all" ? `لـ ${mosquesList.find((m) => String(m.id) === selectedMosqueTab)?.name || ""}` : ""}
                  </Button>
                )}
              </div>
            ) : (
              <div className="divide-y divide-border/50">
                {Object.entries(groupedItems).map(([category, items]: [string, any]) => (
                  <div key={category} className="p-4 sm:p-5 space-y-2.5">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs rounded-lg bg-primary/10 text-primary border-primary/20 font-bold px-2.5 py-0.5">
                          {categoriesMap[category] || category}
                        </Badge>
                        <span className="text-xs text-muted-foreground font-medium">({items.length} بند)</span>
                      </div>
                      <span className="text-xs font-semibold text-muted-foreground">
                        مجموع الفئة: {items.reduce((s: number, i: any) => s + (i.totalPrice ? parseFloat(i.totalPrice) : 0), 0).toLocaleString("ar-SA")} ر.س
                      </span>
                    </div>

                    <div className="border border-border/60 rounded-xl overflow-hidden bg-background">
                      <Table>
                        <TableHeader className="bg-muted/40">
                          <TableRow>
                            {isMultiMosque && selectedMosqueTab === "all" && (
                              <TableHead className="text-right font-bold text-xs">المسجد</TableHead>
                            )}
                            <TableHead className="text-right font-bold text-xs">اسم البند</TableHead>
                            <TableHead className="text-right font-bold text-xs">الوحدة</TableHead>
                            <TableHead className="text-right font-bold text-xs">الكمية</TableHead>
                            <TableHead className="text-right font-bold text-xs">سعر الوحدة</TableHead>
                            <TableHead className="text-right font-bold text-xs">الإجمالي</TableHead>
                            {!isLocked && (canEdit || canDelete) && (
                              <TableHead className="text-center font-bold text-xs">الإجراءات</TableHead>
                            )}
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {items.map((item: any) => {
                            const itemMosque = mosquesList.find((m) => m.id === item.mosqueId);
                            return (
                              <TableRow key={item.id} className="hover:bg-muted/20">
                                {isMultiMosque && selectedMosqueTab === "all" && (
                                  <TableCell className="text-xs font-semibold text-primary">
                                    {item.mosqueName || itemMosque?.name || (
                                      <span className="text-muted-foreground font-normal">عام / غير محدد</span>
                                    )}
                                  </TableCell>
                                )}
                                <TableCell className="font-bold text-foreground text-xs">
                                  <div>
                                    <span>{item.itemName}</span>
                                    {item.itemDescription && (
                                      <p className="text-[11px] text-muted-foreground mt-0.5">{item.itemDescription}</p>
                                    )}
                                  </div>
                                </TableCell>
                                <TableCell className="text-xs text-muted-foreground">{item.unit}</TableCell>
                                <TableCell className="font-mono font-bold text-xs">{item.quantity}</TableCell>
                                <TableCell className="font-mono text-xs">
                                  {item.unitPrice ? `${parseFloat(item.unitPrice).toLocaleString("ar-SA")} ريال` : "-"}
                                </TableCell>
                                <TableCell className="font-mono font-extrabold text-primary text-xs">
                                  {item.totalPrice ? `${parseFloat(item.totalPrice).toLocaleString("ar-SA")} ريال` : "-"}
                                </TableCell>
                                {!isLocked && (canEdit || canDelete) && (
                                  <TableCell className="text-center">
                                    <div className="flex items-center gap-1 justify-center">
                                      {canEdit && (
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="rounded-lg h-7 w-7 text-blue-600 hover:bg-blue-50"
                                          onClick={() => openEditDialog(item)}
                                          title="تعديل البند"
                                        >
                                          <Edit className="h-3.5 w-3.5" />
                                        </Button>
                                      )}
                                      {canDelete && (
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="rounded-lg h-7 w-7 text-red-500 hover:bg-red-50"
                                          onClick={() => handleDeleteItem(item.id)}
                                          title="حذف البند"
                                        >
                                          <Trash2 className="h-3.5 w-3.5" />
                                        </Button>
                                      )}
                                    </div>
                                  </TableCell>
                                )}
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* نوافذ إضافة وتعديل البند */}
        {showAddDialog && (
          <BoqFormDialog 
            requestId={requestId} 
            projectId={projectId}
            mosquesList={isMultiMosque ? mosquesList : undefined}
            defaultMosqueId={currentTargetMosqueId}
            open={showAddDialog} 
            onClose={handleDialogClose} 
          />
        )}

        {showEditDialog && selectedItem && (
          <BoqFormDialog
            requestId={requestId}
            projectId={projectId}
            mosquesList={isMultiMosque ? mosquesList : undefined}
            defaultMosqueId={selectedItem.mosqueId || currentTargetMosqueId}
            open={showEditDialog}
            onClose={handleDialogClose}
            item={selectedItem}
          />
        )}
      </div>
    );
  }
);

BoqTab.displayName = "BoqTab";

export default BoqTab;
