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
    const canAdd = userPermissions.includes("boq.add") || userPermissions.includes("quotations") || hasViewDetails;
    const canEdit = userPermissions.includes("boq.edit") || userPermissions.includes("quotations") || hasViewDetails;
    const canDelete = userPermissions.includes("boq.delete") || userPermissions.includes("quotations") || hasViewDetails;

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

    const { data: quotationsData } = trpc.projects.getQuotationsByRequest.useQuery(
      { requestId: requestId! },
      { enabled: !!requestId }
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

    // التحقق مما إذا كان هناك عرض سعر معتمد
    const hasAcceptedQuotation = Boolean(
      (request as any)?.hasAcceptedQuotation ||
      quotationsData?.quotations?.some((q: any) => q.status === "accepted" || q.status === "approved")
    );

    // يتوقف التعديل والحذف عند اعتماد عرض سعر، أو عند تجاوز مرحلة التقييم المالي واعتماد العرض
    const isLocked =
      externalIsLocked !== undefined
         ? externalIsLocked
        : Boolean(
            hasAcceptedQuotation ||
            (request?.currentStage &&
              getStageOrder(request.currentStage) > getStageOrder("financial_eval_and_approval"))
          );

    const lockMessage = hasAcceptedQuotation
      ? "لا يمكن تعديل أو حذف جدول الكميات بعد اعتماد عرض السعر"
      : "لا يمكن تعديل جدول الكميات في هذه المرحلة";

    useImperativeHandle(ref, () => ({
      openAddDialog: () => {
        if (isLocked) {
          toast.error(lockMessage);
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
        toast.error(lockMessage);
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
        toast.error(lockMessage);
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
        toast.error(lockMessage);
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
      <div className="space-y-6 text-right" dir="rtl">
        {/* شريط الإجراءات والتحكم */}
        {!hideAddButton && !isLocked && canAdd && (
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-border bg-muted/40 p-4 shadow-xs">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-teal-500/10 text-teal-600 dark:text-teal-400">
                <Calculator className="h-5 w-5" />
              </div>
              <div>
                <span className="font-bold text-sm sm:text-base text-foreground block">
                  إدارة بنود جدول الكميات
                </span>
                {isMultiMosque && selectedMosqueTab !== "all" && (
                  <span className="text-xs text-teal-600 dark:text-teal-400 font-medium">
                    (المسجد المحدد: {mosquesList.find(m => String(m.id) === selectedMosqueTab)?.name || ""})
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
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
                className="border-teal-600/40 text-teal-700 dark:text-teal-300 hover:bg-teal-50 text-xs sm:text-sm font-semibold rounded-lg"
                size="sm"
              >
                <Download className="h-4 w-4 ml-1.5" />
                تحميل القالب
              </Button>
              <Button
                onClick={() => document.getElementById("boq-excel-upload")?.click()}
                variant="outline"
                className="border-teal-600/40 text-teal-700 dark:text-teal-300 hover:bg-teal-50 text-xs sm:text-sm font-semibold rounded-lg"
                size="sm"
                disabled={bulkMutation.isPending}
              >
                {bulkMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin ml-1.5" />
                ) : (
                  <Upload className="h-4 w-4 ml-1.5" />
                )}
                استيراد بنود (Excel)
              </Button>
              <Button
                onClick={() => setShowAddDialog(true)}
                className="bg-teal-600 text-white text-xs hover:bg-teal-700 sm:text-sm font-bold rounded-lg shadow-sm"
                size="sm"
              >
                <Plus className="h-4 w-4 ml-1.5" />
                إضافة بند جديد
              </Button>
            </div>
          </div>
        )}

        {/* 🌟 تبويبات المساجد (فقط للمشروع متعدد المساجد المباشر) */}
        {isMultiMosque && mosquesList.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <Building2 className="w-5 h-5 text-teal-600" />
              <h3 className="font-bold text-base text-foreground">جداول كميات مساجد المشروع ({mosquesList.length} مساجد)</h3>
            </div>

            <Tabs value={selectedMosqueTab} onValueChange={setSelectedMosqueTab} className="w-full">
              <TabsList className="w-full flex flex-wrap h-auto p-1.5 bg-muted/60 rounded-xl gap-1.5 justify-start">
                <TabsTrigger
                  value="all"
                  className="rounded-lg px-4 py-2 text-xs sm:text-sm font-bold data-[state=active]:bg-teal-600 data-[state=active]:text-white transition-all"
                >
                  <Layers className="w-4 h-4 ml-1.5" />
                  <span>جميع المساجد (الإجمالي)</span>
                  <Badge variant="secondary" className="mr-2 text-[10px] bg-background/80 py-0">
                    {boqData.length} بند
                  </Badge>
                </TabsTrigger>

                {mosquesList.map((mosque) => {
                  const mItems = boqData.filter((i: any) => i.mosqueId === mosque.id);
                  const mTotal = mItems.reduce((sum: number, i: any) => sum + (i.totalPrice ? parseFloat(i.totalPrice) : 0), 0);
                  return (
                    <TabsTrigger
                      key={mosque.id}
                      value={String(mosque.id)}
                      className="rounded-lg px-4 py-2 text-xs sm:text-sm font-bold data-[state=active]:bg-teal-600 data-[state=active]:text-white transition-all"
                    >
                      <Building2 className="w-4 h-4 ml-1.5" />
                      <span>{mosque.name}</span>
                      <span className="mr-2 text-[10px] opacity-85">
                        ({mItems.length} بند • {mTotal.toLocaleString("en-US")} ر.س)
                      </span>
                    </TabsTrigger>
                  );
                })}
              </TabsList>
            </Tabs>

            {/* بطاقات ملخص المساجد عند اختيار تبويب "الكل" */}
            {selectedMosqueTab === "all" && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
                {mosqueStats.map((m) => (
                  <Card 
                    key={m.id}
                    onClick={() => setSelectedMosqueTab(String(m.id))}
                    className="cursor-pointer hover:border-teal-400 hover:shadow-md transition-all border-border/80 bg-card group"
                  >
                    <CardHeader className="p-4 pb-2">
                      <div className="flex items-center justify-between gap-2">
                        <CardTitle className="text-sm sm:text-base font-bold text-foreground group-hover:text-teal-600 transition-colors flex items-center gap-1.5">
                          <Building2 className="w-4 h-4 text-teal-600" />
                          <span className="truncate">{m.name}</span>
                        </CardTitle>
                        <Badge variant="outline" className="text-[10px] bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300 border-teal-200">
                          {m.itemCount} بند
                        </Badge>
                      </div>
                      {m.city && (
                        <CardDescription className="text-xs text-muted-foreground truncate">
                          {m.city} {m.district ? `• ${m.district}` : ""}
                        </CardDescription>
                      )}
                    </CardHeader>
                    <CardContent className="p-4 pt-0">
                      <div className="flex items-baseline justify-between mt-2 pt-2 border-t border-border/50 text-xs">
                        <span className="text-muted-foreground font-medium">إجمالي الجدول:</span>
                        <span className="font-bold text-sm text-teal-600 dark:text-teal-400">
                          {m.totalAmount.toLocaleString("en-US")} ريال
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* بطاقة ملخص جدول الكميات المعروض */}
        {filteredItems.length > 0 && (
          <Card className="border-teal-200 bg-gradient-to-br from-teal-500/10 via-teal-500/5 to-transparent dark:border-teal-800 shadow-sm">
            <CardHeader className="p-4 pb-2">
              <CardTitle className="flex items-center justify-between text-sm sm:text-base text-teal-950 dark:text-teal-100">
                <div className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-teal-600" />
                  <span>
                    {isMultiMosque && selectedMosqueTab !== "all"
                      ? `ملخص جدول كميات (${mosquesList.find(m => String(m.id) === selectedMosqueTab)?.name || ""})`
                      : isMultiMosque
                      ? "الملخص الإجمالي لجداول كميات كافة المساجد"
                      : "ملخص جدول الكميات"}
                  </span>
                </div>
                {isMultiMosque && selectedMosqueTab !== "all" && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => setSelectedMosqueTab("all")} 
                    className="text-xs text-teal-700 dark:text-teal-300 hover:text-teal-900 h-7"
                  >
                    عرض إجمالي كل المساجد
                  </Button>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-2">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="rounded-xl bg-background/80 p-3.5 border border-border/60 shadow-2xs">
                  <p className="text-xs text-muted-foreground font-medium mb-1">عدد البنود</p>
                  <p className="text-xl sm:text-2xl font-bold text-teal-600 dark:text-teal-400">
                    {filteredItems.length}
                  </p>
                </div>
                <div className="rounded-xl bg-background/80 p-3.5 border border-border/60 shadow-2xs">
                  <p className="text-xs text-muted-foreground font-medium mb-1">
                    {isMultiMosque && selectedMosqueTab === "all" ? "الإجمالي الكلي للمشروع" : "إجمالي الجدول"}
                  </p>
                  <p className="text-xl sm:text-2xl font-bold text-teal-600 dark:text-teal-400">
                    {filteredTotalAmount.toLocaleString("en-US")} ريال
                  </p>
                </div>
                <div className="rounded-xl bg-background/80 p-3.5 border border-border/60 shadow-2xs">
                  <p className="text-xs text-muted-foreground font-medium mb-1">التصنيفات المشمولة</p>
                  <p className="text-xl sm:text-2xl font-bold text-teal-600 dark:text-teal-400">
                    {Object.keys(groupedItems).length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* عرض جدول البنود */}
        {filteredItems.length === 0 ? (
          <Card className="border-dashed border-2">
            <CardContent className="py-12 text-center">
              <div className="text-muted-foreground">
                <Calculator className="mx-auto mb-3 h-14 w-14 opacity-40 text-teal-600" />
                <p className="text-base font-bold text-foreground mb-1">
                  {isMultiMosque && selectedMosqueTab !== "all"
                    ? `لا توجد بنود مدخلة لجدول كميات (${mosquesList.find(m => String(m.id) === selectedMosqueTab)?.name || ""})`
                    : "لا توجد بنود في جدول الكميات"}
                </p>
                {!isLocked && (
                  <p className="text-xs text-muted-foreground max-w-sm mx-auto mb-4">
                    {isMultiMosque && selectedMosqueTab !== "all"
                      ? "يمكنك إضافة البنود الخاصة بهذا المسجد أو استيرادها عبر ملف Excel."
                      : "ابدأ بإضافة بنود جديدة باستخدام زر إضافة بند أعلاه."}
                  </p>
                )}
                {!isLocked && canAdd && (
                  <Button
                    onClick={() => setShowAddDialog(true)}
                    className="bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs gap-1.5 rounded-lg"
                    size="sm"
                  >
                    <Plus className="w-4 h-4" />
                    إضافة بند {isMultiMosque && selectedMosqueTab !== "all" ? `لـ ${mosquesList.find(m => String(m.id) === selectedMosqueTab)?.name || ""}` : ""}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-border shadow-xs overflow-hidden">
            <CardContent className="p-0 divide-y divide-border">
              {Object.entries(groupedItems).map(([category, items]: [string, any]) => (
                <div key={category} className="p-4 sm:p-6 space-y-3">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs sm:text-sm font-bold bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-400 border-teal-200">
                        {categoriesMap[category] || category}
                      </Badge>
                      <span className="text-xs text-muted-foreground">({items.length} بند)</span>
                    </div>

                    <span className="text-xs font-semibold text-muted-foreground">
                      مجموع الفئة: {items.reduce((s: number, i: any) => s + (i.totalPrice ? parseFloat(i.totalPrice) : 0), 0).toLocaleString("en-US")} ر.س
                    </span>
                  </div>

                  <div className="border rounded-xl overflow-hidden bg-background shadow-2xs">
                    <Table>
                      <TableHeader className="bg-muted/40">
                        <TableRow>
                          {isMultiMosque && selectedMosqueTab === "all" && (
                            <TableHead className="font-bold text-right text-xs">المسجد</TableHead>
                          )}
                          <TableHead className="font-bold text-right text-xs">اسم البند</TableHead>
                          <TableHead className="font-bold text-right text-xs">الوحدة</TableHead>
                          <TableHead className="font-bold text-right text-xs">الكمية</TableHead>
                          <TableHead className="font-bold text-right text-xs">سعر الوحدة</TableHead>
                          <TableHead className="font-bold text-right text-xs">الإجمالي</TableHead>
                          {!isLocked && (canEdit || canDelete) && <TableHead className="font-bold text-center text-xs">الإجراءات</TableHead>}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {items.map((item: any) => {
                          const itemMosque = mosquesList.find(m => m.id === item.mosqueId);
                          return (
                            <TableRow key={item.id} className="hover:bg-muted/30">
                              {isMultiMosque && selectedMosqueTab === "all" && (
                                <TableCell className="text-xs font-semibold text-teal-700 dark:text-teal-300">
                                  {item.mosqueName || itemMosque?.name || (
                                    <span className="text-muted-foreground font-normal">عام / غير محدد</span>
                                  )}
                                </TableCell>
                              )}
                              <TableCell className="font-medium text-xs sm:text-sm">
                                <div>
                                  <span>{item.itemName}</span>
                                  {item.itemDescription && (
                                    <p className="text-[11px] text-muted-foreground mt-0.5">{item.itemDescription}</p>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell className="text-xs">{item.unit}</TableCell>
                              <TableCell className="text-xs font-bold">{item.quantity}</TableCell>
                              <TableCell className="text-xs">
                                {item.unitPrice ? `${parseFloat(item.unitPrice).toLocaleString("en-US")} ر.س` : "-"}
                              </TableCell>
                              <TableCell className="font-bold text-xs sm:text-sm text-teal-600 dark:text-teal-400">
                                {item.totalPrice ? `${parseFloat(item.totalPrice).toLocaleString("en-US")} ريال` : "-"}
                              </TableCell>
                              {!isLocked && (canEdit || canDelete) && (
                                <TableCell>
                                  <div className="flex items-center justify-center gap-1">
                                    {canEdit && (
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 hover:bg-muted"
                                        onClick={() => openEditDialog(item)}
                                      >
                                        <Edit className="h-3.5 w-3.5 text-muted-foreground" />
                                      </Button>
                                    )}
                                    {canDelete && (
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 hover:bg-destructive/10 text-destructive"
                                        onClick={() => handleDeleteItem(item.id)}
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
            </CardContent>
          </Card>
        )}

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
