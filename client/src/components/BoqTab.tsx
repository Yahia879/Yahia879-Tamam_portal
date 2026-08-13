import { useState, useImperativeHandle, forwardRef } from "react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/_core/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
} from "lucide-react";
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

    const { data: boqResult, isLoading, refetch } = trpc.projects.getBOQ.useQuery(
      { requestId, projectId },
      { enabled: !!requestId || !!projectId }
    );

    const { data: allCategories = [] } = trpc.categories.getAllCategories.useQuery();

    const boqData = boqResult?.items || [];
    const totalAmount = boqResult?.total || 0;

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

    const downloadTemplate = async () => {
      try {
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet("Template", {
          views: [{ showGridLines: true, rightToLeft: true }]
        });

        // إضافة العناوين والمثال
        worksheet.addRow(["التصنيف", "اسم البند", "الوحدة", "الكمية", "سعر الوحدة"]);
        worksheet.addRow(["أعمال إنشائية", "مثال: أعمال الحفر والتسوية", "متر مكعب", 120, 35]);

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

        // إنشاء ورقة عمل مخفية لوضع التصنيفات بداخلها تفادياً لتلف الملف في Excel بسبب الحروف العربية والرموز
        const catSheet = workbook.addWorksheet("CategoriesData");
        catSheet.state = "hidden";
        categoriesList.forEach((cat, index) => {
          catSheet.getCell(`A${index + 1}`).value = cat;
        });

        // تفعيل القائمة المنسدلة لعمود التصنيف (العامود A) بالإشارة لورقة العمل المخفية من السطر 2 وحتى 100
        const listFormula = `CategoriesData!$A$1:$A$${categoriesList.length}`;
        for (let i = 2; i <= 100; i++) {
          worksheet.getCell(`A${i}`).dataValidation = {
            type: "list",
            allowBlank: true,
            formulae: [listFormula]
          };
        }

        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "BOQ_Template.xlsx";
        a.click();
        window.URL.revokeObjectURL(url);
        toast.success("تم تحميل القالب الاسترشادي بنجاح");
      } catch (error) {
        console.error("Failed to generate Excel template:", error);
        toast.error("حدث خطأ أثناء تحميل القالب");
      }
    };

    const normalizeArabic = (str: string) => {
      return String(str || "")
        .replace(/[أإآء]/g, "ا")
        .replace(/ة/g, "ه")
        .replace(/ى/g, "ي")
        .replace(/ال/g, "")
        .replace(/\s+/g, "")
        .trim()
        .toLowerCase();
    };

    const handleExcelUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
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

          if (rows.length < 2) {
            toast.error("الملف فارغ أو لا يحتوي على بنود");
            return;
          }

          // قراءة العناوين
          const headers = (rows[0] as any[]).map(h => String(h || "").trim().toLowerCase());
          
          const nameIdx = headers.findIndex(h => h.trim() === "اسم البند" || h.includes("item name") || h === "name");
          const descIdx = headers.findIndex(h => h.includes("وصف") || h.includes("description") || h === "desc");
          const categoryIdx = headers.findIndex(h => h.includes("تصنيف") || h.includes("فئة") || h.includes("قسم") || h === "category");
          const unitIdx = headers.findIndex(h => h.trim() === "الوحدة" || h === "unit");
          const qtyIdx = headers.findIndex(h => h.trim() === "الكمية" || h.includes("quantity") || h === "qty");
          const priceIdx = headers.findIndex(h => h.trim() === "سعر الوحدة" || h.includes("unit price") || h === "price");

          if (nameIdx === -1 || unitIdx === -1 || qtyIdx === -1) {
            toast.error("الملف غير مطابق للقالب. يجب وجود أعمدة: اسم البند، الوحدة، والكمية على الأقل.");
            return;
          }

          const itemsToInsert: any[] = [];
          for (let i = 1; i < rows.length; i++) {
            const row = rows[i] as any[];
            if (!row || row.length === 0) continue;

            const itemName = row[nameIdx];
            const unit = row[unitIdx];
            const quantityVal = row[qtyIdx];

            // تخطي السطور الفارغة
            if (!itemName && !unit && !quantityVal) continue;

            if (!itemName) {
              toast.error(`السطر رقم ${i + 1}: اسم البند مطلوب`);
              return;
            }
            if (!unit) {
              toast.error(`السطر رقم ${i + 1}: الوحدة مطلوبة`);
              return;
            }
            
            const quantity = parseFloat(String(quantityVal || ""));
            if (isNaN(quantity) || quantity <= 0) {
              toast.error(`السطر رقم ${i + 1}: الكمية يجب أن تكون رقماً أكبر من صفر`);
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
              // محاولة مطابقة الفئة بالعربية أو الإنجليزية من التصنيفات الديناميكية في الموقع
              const matchedCat = (allCategories || [])
                .filter((cat: any) => cat.type === "boq_category")
                .find((cat: any) => 
                  rawCat === normalizeArabic(cat.name) || rawCat === normalizeArabic(cat.nameAr)
                );
              if (matchedCat) {
                category = matchedCat.name;
              } else {
                // محاولة مطابقة الفئة ضد القائمة الاستاتيكية الاحتياطية
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
              category
            });
          }

          if (itemsToInsert.length === 0) {
            toast.error("لم يتم العثور على أي بنود صالحة للاستيراد");
            return;
          }

          bulkMutation.mutate({
            requestId: requestId || undefined,
            projectId: projectId || undefined,
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

    const groupedItems = boqData.reduce((acc: any, item: any) => {
      const category = item.category || "other";
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(item);
      return acc;
    }, {});

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

    if (isLoading) {
      return (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="mr-3 text-lg">جاري تحميل جداول الكميات...</span>
        </div>
      );
    }

    return (
      <div className="space-y-4">
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
                    إدارة واستيراد بنود وأسعار جداول الكميات التقديرية للمشروع
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

            {/* Integrated Metrics Strip */}
            {boqData.length > 0 && (
              <div className="pt-3 border-t border-border/40 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div className="flex items-center gap-2 bg-background p-2.5 rounded-xl border border-border/40">
                  <span className="text-muted-foreground font-semibold">إجمالي البنود:</span>
                  <span className="font-extrabold text-foreground font-mono">{boqData.length} بند</span>
                </div>
                <div className="flex items-center gap-2 bg-primary/5 p-2.5 rounded-xl border border-primary/20">
                  <span className="text-primary font-semibold">الإجمالي الكلي:</span>
                  <span className="font-extrabold text-primary font-mono text-sm">{totalAmount.toLocaleString("ar-SA")} ريال</span>
                </div>
                <div className="flex items-center gap-2 bg-background p-2.5 rounded-xl border border-border/40">
                  <span className="text-muted-foreground font-semibold">التصنيفات:</span>
                  <span className="font-extrabold text-foreground font-mono">{Object.keys(groupedItems).length} فئات</span>
                </div>
              </div>
            )}
          </CardHeader>

          {/* Table Items View */}
          <CardContent className="p-0">
            {boqData.length === 0 ? (
              <div className="text-center py-12 px-4">
                <Calculator className="mx-auto mb-3 h-12 w-12 text-muted-foreground/30" />
                <p className="text-sm font-bold text-foreground">لا توجد بنود مسجلة في جدول الكميات</p>
                {!isLocked && (
                  <p className="mt-1 text-xs text-muted-foreground">يمكنك إضافة بنود جديدة أو رفع ملف Excel مستعد</p>
                )}
              </div>
            ) : (
              <div className="divide-y divide-border/50">
                {Object.entries(groupedItems).map(([category, items]: [string, any]) => (
                  <div key={category} className="p-4 sm:p-5 space-y-2.5">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs rounded-lg bg-primary/10 text-primary border-primary/20 font-bold px-2.5 py-0.5">
                        {categoriesMap[category] || category}
                      </Badge>
                      <span className="text-xs text-muted-foreground font-medium">({items.length} بند)</span>
                    </div>

                    <div className="border border-border/60 rounded-xl overflow-hidden bg-background">
                      <Table>
                        <TableHeader className="bg-muted/40">
                          <TableRow>
                            <TableHead className="text-right font-bold text-xs">اسم البند</TableHead>
                            <TableHead className="text-right font-bold text-xs">الوحدة</TableHead>
                            <TableHead className="text-right font-bold text-xs">الكمية</TableHead>
                            <TableHead className="text-right font-bold text-xs">سعر الوحدة</TableHead>
                            <TableHead className="text-right font-bold text-xs">الإجمالي</TableHead>
                            {!isLocked && (canEdit || canDelete) && <TableHead className="text-center font-bold text-xs">الإجراءات</TableHead>}
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {items.map((item: any) => (
                            <TableRow key={item.id} className="hover:bg-muted/20">
                              <TableCell className="font-bold text-foreground text-xs">{item.itemName}</TableCell>
                              <TableCell className="text-xs text-muted-foreground">{item.unit}</TableCell>
                              <TableCell className="font-mono font-bold text-xs">{item.quantity}</TableCell>
                              <TableCell className="font-mono text-xs">
                                {parseFloat(item.unitPrice || "0").toLocaleString("ar-SA")} ريال
                              </TableCell>
                              <TableCell className="font-mono font-extrabold text-primary text-xs">
                                {parseFloat(item.totalPrice || "0").toLocaleString("ar-SA")} ريال
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
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {showAddDialog && (
          <BoqFormDialog requestId={requestId} projectId={projectId} open={showAddDialog} onClose={handleDialogClose} />
        )}

        {showEditDialog && selectedItem && (
          <BoqFormDialog
            requestId={requestId}
            projectId={projectId}
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
