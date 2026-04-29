import { useState } from "react";
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
} from "lucide-react";
import BoqFormDialog from "./BoqFormDialog";

interface BoqTabProps {
  requestId: number;
}

export default function BoqTab({ requestId }: BoqTabProps) {
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);

  // جلب جداول الكميات المرتبطة بالطلب
  const { data: boqResult, isLoading, refetch } = trpc.projects.getBOQ.useQuery(
    { requestId },
    { enabled: !!requestId }
  );
  const boqData = boqResult?.items || [];
  const totalAmount = boqResult?.total || 0;

  // حذف بند
  const deleteItemMutation = trpc.projects.deleteBOQItem.useMutation({
    onSuccess: () => {
      toast.success("تم حذف البند بنجاح");
      refetch();
    },
    onError: (error: any) => {
      toast.error(error.message || "حدث خطأ أثناء حذف البند");
    },
  });

  const handleDeleteItem = (id: number) => {
    if (confirm("هل أنت متأكد من حذف هذا البند؟")) {
      deleteItemMutation.mutate({ id });
    }
  };

  const openEditDialog = (item: any) => {
    setSelectedItem(item);
    setShowEditDialog(true);
  };

  const handleDialogClose = () => {
    setShowAddDialog(false);
    setShowEditDialog(false);
    setSelectedItem(null);
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
      {/* رأس القسم */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Calculator className="h-6 w-6 text-primary" />
            جداول الكميات (BOQ)
          </h2>
          <p className="text-muted-foreground mt-1">
            إدارة جداول الكميات المرتبطة بهذا الطلب
          </p>
        </div>
        <Button
          onClick={() => setShowAddDialog(true)}
          className="gap-2"
        >
          <Plus className="h-4 w-4" />
          إضافة بند جديد
        </Button>
      </div>

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
              <p className="text-sm mt-2">ابدأ بإضافة بنود جديدة باستخدام الزر أعلاه</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        Object.entries(groupedItems).map(([category, items]: [string, any]) => (
          <Card key={category}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Badge variant="outline" className="text-base">
                  {ITEM_CATEGORIES[category] || category}
                </Badge>
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
                    <TableHead>الإجراءات</TableHead>
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
}
