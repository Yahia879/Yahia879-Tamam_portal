import { useState, useImperativeHandle, forwardRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
  Eye,
  Edit,
  Trash2,
  Loader2,
  FileText,
  Clock,
} from "lucide-react";
import BoqFormDialog from "./BoqFormDialog";
import { getStageOrder } from "../../../shared/constants";

interface BoqTabProps {
  requestId: number;
  isLocked?: boolean;
}

export interface BoqTabHandle {
  openAddDialog: () => void;
}

const BoqTab = forwardRef<BoqTabHandle, BoqTabProps>(({ requestId, isLocked: externalIsLocked }, ref) => {
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);

  const utils = trpc.useUtils();

  // جلب تفاصيل الطلب للتحقق من المرحلة
  const { data: request } = trpc.requests.getById.useQuery({ id: requestId });

  // جلب جداول الكميات المرتبطة بالطلب
  const { data: boqResult, isLoading, refetch } = trpc.projects.getBOQ.useQuery(
    { requestId },
    { enabled: !!requestId }
  );
  const boqData = boqResult?.items || [];
  const totalAmount = boqResult?.total || 0;

  // التحقق مما إذا كان الجدول مقفلاً (إذا تجاوز مرحلة إعداد جدول الكميات)
  const isLocked = externalIsLocked !== undefined 
    ? externalIsLocked 
    : (request?.currentStage && getStageOrder(request.currentStage) > getStageOrder('boq_preparation'));

  useImperativeHandle(ref, () => ({
    openAddDialog: () => {
      if (isLocked) {
        toast.error("لا يمكن تعديل جدول الكميات في هذه المرحلة");
        return;
      }
      setShowAddDialog(true);
    }
  }));

  // حذف بند
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
    if (confirm("هل أنت متأكد من حذف هذا البند؟")) {
      deleteItemMutation.mutate({ id });
    }
  };

  const openEditDialog = (item: any) => {
    if (isLocked) {
      toast.error("لا يمكن تعديل جدول الكميات في هذه المرحلة");
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

  // تجميع البنود حسب التصنيف
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
      {/* ملخص الإجمالي */}
      {boqData.length > 0 && (
        <Card className="bg-gradient-to-br from-teal-50 to-teal-100 dark:from-teal-950 dark:to-teal-900 border-teal-200 dark:border-teal-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-teal-900 dark:text-teal-100">
              <FileText className="h-5 w-5" />
              ملخص جدول الكميات
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white dark:bg-gray-800 p-4 rounded-lg">
                <p className="text-sm text-muted-foreground">عدد البنود</p>
                <p className="text-2xl font-bold text-teal-600 dark:text-teal-400">
                  {boqData.length}
                </p>
              </div>
              <div className="bg-white dark:bg-gray-800 p-4 rounded-lg">
                <p className="text-sm text-muted-foreground">الإجمالي الكلي</p>
                <p className="text-2xl font-bold text-teal-600 dark:text-teal-400">
                  {totalAmount.toLocaleString("ar-SA")} ريال
                </p>
              </div>
              <div className="bg-white dark:bg-gray-800 p-4 rounded-lg">
                <p className="text-sm text-muted-foreground">التصنيفات</p>
                <p className="text-2xl font-bold text-teal-600 dark:text-teal-400">
                  {Object.keys(groupedItems).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* جداول الكميات حسب التصنيف */}
      {boqData.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center text-muted-foreground">
              <Calculator className="h-16 w-16 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">لا توجد بنود في جدول الكميات</p>
              {!isLocked && <p className="text-sm mt-2">ابدأ بإضافة بنود جديدة باستخدام الزر أعلاه</p>}
            </div>
          </CardContent>
        </Card>
      ) : (
        Object.entries(groupedItems).map(([category, items]: [string, any]) => (
          <Card key={category}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {ITEM_CATEGORIES[category] ? (
                  <Badge variant="outline" className="text-base">
                    {ITEM_CATEGORIES[category]}
                  </Badge>
                ) : !category.startsWith('boq_category_') && category !== "other" && (
                  <Badge variant="outline" className="text-base">
                    {category}
                  </Badge>
                )}
                <span className="text-sm text-muted-foreground">
                  ({items.length} بند)
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>اسم البند</TableHead>
                    <TableHead>الوصف</TableHead>
                    <TableHead>الوحدة</TableHead>
                    <TableHead>الكمية</TableHead>
                    <TableHead>سعر الوحدة</TableHead>
                    <TableHead>الإجمالي</TableHead>
                    {!isLocked && <TableHead>الإجراءات</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item: any) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.itemName}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {item.description || "-"}
                      </TableCell>
                      <TableCell>{item.unit}</TableCell>
                      <TableCell>{item.quantity}</TableCell>
                      <TableCell>
                        {parseFloat(item.unitPrice || "0").toLocaleString("ar-SA")} ريال
                      </TableCell>
                      <TableCell className="font-bold text-teal-600">
                        {parseFloat(item.totalPrice || "0").toLocaleString("ar-SA")} ريال
                      </TableCell>
                      {!isLocked && (
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openEditDialog(item)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteItem(item.id)}
                            >
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        ))
      )}

      {/* Dialogs */}
      {showAddDialog && (
        <BoqFormDialog
          requestId={requestId}
          open={showAddDialog}
          onClose={handleDialogClose}
        />
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
});

BoqTab.displayName = "BoqTab";

export default BoqTab;
