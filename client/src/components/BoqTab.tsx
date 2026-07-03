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
import * as XLSX from "xlsx";

interface BoqTabProps {
  requestId: number;
  isLocked?: boolean;
  hideAddButton?: boolean;
}

export interface BoqTabHandle {
  openAddDialog: () => void;
}

const BoqTab = forwardRef<BoqTabHandle, BoqTabProps>(
  ({ requestId, isLocked: externalIsLocked, hideAddButton }, ref) => {
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

    const { data: request } = trpc.requests.getById.useQuery({ id: requestId });

    const { data: boqResult, isLoading, refetch } = trpc.projects.getBOQ.useQuery(
      { requestId },
      { enabled: !!requestId }
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

    const downloadTemplate = () => {
      const headers = [
        ["اسم البند / Item Name", "الفئة (القسم) / Category", "الوحدة / Unit", "الكمية / Quantity", "سعر الوحدة / Unit Price"],
        ["مثال: أعمال الحفر والتسوية", "الأعمال الإنشائية", "متر مكعب", 120, 35]
      ];
      const worksheet = XLSX.utils.aoa_to_sheet(headers);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Template");
      XLSX.writeFile(workbook, "BOQ_Template.xlsx");
      toast.success("تم تحميل القالب الاسترشادي بنجاح");
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
          
          const nameIdx = headers.findIndex(h => h.includes("اسم البند") || h.includes("item name") || h === "name");
          const descIdx = headers.findIndex(h => h.includes("وصف") || h.includes("description") || h === "desc");
          const categoryIdx = headers.findIndex(h => h.includes("فئة") || h.includes("قسم") || h === "category");
          const unitIdx = headers.findIndex(h => h.includes("وحدة") || h.includes("unit"));
          const qtyIdx = headers.findIndex(h => h.includes("كمية") || h.includes("quantity") || h === "qty");
          const priceIdx = headers.findIndex(h => h.includes("سعر الوحدة") || h.includes("unit price") || h === "price");

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
              // محاولة مطابقة الفئة بالعربية أو الإنجليزية
              const matchedCat = Object.entries(ITEM_CATEGORIES).find(([key, val]) => 
                rawCat === normalizeArabic(key) || rawCat === normalizeArabic(val)
              );
              category = matchedCat ? matchedCat[0] : "other";
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
            requestId,
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
      <div className="space-y-6">
        {!hideAddButton && !isLocked && canAdd && (
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-border bg-muted/40 p-4">
            <div className="flex items-center gap-2">
              <Calculator className="h-5 w-5 text-teal-600" />
              <span className="font-semibold text-sm">إدارة بنود جدول الكميات</span>
            </div>
            <div className="flex items-center gap-2">
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
                className="border-teal-600 text-teal-600 hover:bg-teal-50 text-xs sm:text-sm"
                size="sm"
              >
                <Download className="h-4 w-4 ml-2" />
                تحميل القالب
              </Button>
              <Button
                onClick={() => document.getElementById("boq-excel-upload")?.click()}
                variant="outline"
                className="border-teal-600 text-teal-600 hover:bg-teal-50 text-xs sm:text-sm"
                size="sm"
                disabled={bulkMutation.isPending}
              >
                {bulkMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin ml-2" />
                ) : (
                  <Upload className="h-4 w-4 ml-2" />
                )}
                استيراد بنود (Excel)
              </Button>
              <Button
                onClick={() => setShowAddDialog(true)}
                className="bg-teal-600 text-white text-xs hover:bg-teal-700 sm:text-sm"
                size="sm"
              >
                <Plus className="h-4 w-4 ml-2" />
                إضافة بند
              </Button>
            </div>
          </div>
        )}

        {boqData.length > 0 && (
          <Card className="border-teal-200 bg-gradient-to-br from-teal-50 to-teal-100 dark:border-teal-800 dark:from-teal-950 dark:to-teal-900">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-teal-900 dark:text-teal-100">
                <FileText className="h-5 w-5" />
                ملخص جدول الكميات
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div className="rounded-lg bg-white p-4 dark:bg-gray-800">
                  <p className="text-sm text-muted-foreground">عدد البنود</p>
                  <p className="text-2xl font-bold text-teal-600 dark:text-teal-400">
                    {boqData.length}
                  </p>
                </div>
                <div className="rounded-lg bg-white p-4 dark:bg-gray-800">
                  <p className="text-sm text-muted-foreground">الإجمالي الكلي</p>
                  <p className="text-2xl font-bold text-teal-600 dark:text-teal-400">
                    {totalAmount.toLocaleString("ar-SA")} ريال
                  </p>
                </div>
                <div className="rounded-lg bg-white p-4 dark:bg-gray-800">
                  <p className="text-sm text-muted-foreground">التصنيفات</p>
                  <p className="text-2xl font-bold text-teal-600 dark:text-teal-400">
                    {Object.keys(groupedItems).length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {boqData.length === 0 ? (
          <Card>
            <CardContent className="py-12">
              <div className="text-center text-muted-foreground">
                <Calculator className="mx-auto mb-4 h-16 w-16 opacity-50" />
                <p className="text-lg font-medium">لا توجد بنود في جدول الكميات</p>
                {!isLocked && (
                  <p className="mt-2 text-sm">ابدأ بإضافة بنود جديدة باستخدام الزر أعلاه</p>
                )}
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-border">
            <CardContent className="p-0 divide-y divide-border">
              {Object.entries(groupedItems).map(([category, items]: [string, any]) => (
                <div key={category} className="p-6 space-y-4">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-base bg-teal-50 dark:bg-teal-950/30 text-teal-700 dark:text-teal-400 border-teal-200">
                      {categoriesMap[category] || category}
                    </Badge>
                    <span className="text-sm text-muted-foreground">({items.length} بند)</span>
                  </div>
                  <div className="border rounded-md overflow-hidden bg-background">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>اسم البند</TableHead>
                          <TableHead>الوحدة</TableHead>
                          <TableHead>الكمية</TableHead>
                          <TableHead>سعر الوحدة</TableHead>
                          <TableHead>الإجمالي</TableHead>
                          {!isLocked && (canEdit || canDelete) && <TableHead>الإجراءات</TableHead>}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {items.map((item: any) => (
                          <TableRow key={item.id}>
                            <TableCell className="font-medium">{item.itemName}</TableCell>
                            <TableCell>{item.unit}</TableCell>
                            <TableCell>{item.quantity}</TableCell>
                            <TableCell>
                              {parseFloat(item.unitPrice || "0").toLocaleString("ar-SA")} ريال
                            </TableCell>
                            <TableCell className="font-bold text-teal-600">
                              {parseFloat(item.totalPrice || "0").toLocaleString("ar-SA")} ريال
                            </TableCell>
                            {!isLocked && (canEdit || canDelete) && (
                              <TableCell>
                                <div className="flex gap-2">
                                  {canEdit && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => openEditDialog(item)}
                                    >
                                      <Edit className="h-4 w-4" />
                                    </Button>
                                  )}
                                  {canDelete && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleDeleteItem(item.id)}
                                    >
                                      <Trash2 className="h-4 w-4 text-red-500" />
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
            </CardContent>
          </Card>
        )}

        {showAddDialog && (
          <BoqFormDialog requestId={requestId} open={showAddDialog} onClose={handleDialogClose} />
        )}

        {showEditDialog && selectedItem && (
          <BoqFormDialog
            requestId={requestId}
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
