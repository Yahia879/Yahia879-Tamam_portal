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
} from "lucide-react";
import BoqFormDialog from "./BoqFormDialog";
import { getStageOrder } from "../../../shared/constants";

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
    const canAdd = userPermissions.includes("boq.add");
    const canEdit = userPermissions.includes("boq.edit");
    const canDelete = userPermissions.includes("boq.delete");

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
            <Button
              onClick={() => setShowAddDialog(true)}
              className="bg-teal-600 text-white text-xs hover:bg-teal-700 sm:text-sm"
              size="sm"
            >
              <Plus className="h-4 w-4 ml-2" />
              إضافة بند
            </Button>
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
