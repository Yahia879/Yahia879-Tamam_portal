import React from "react";
import { trpc } from "@/lib/trpc";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
  TrendingUp,
  Download,
  Building2,
  Package,
  Layers,
  Sparkles,
  Loader2,
  Percent,
} from "lucide-react";
import { toast } from "sonner";
import { exportStyledExcel } from "@/lib/excelExportHelper";
import { useDocumentTitle } from "@/contexts/DocumentTitleContext";

export default function SedanaBulkPurchasingPage() {
  useDocumentTitle("القوة التفاوضية والشراء المجمع - سدانة");

  const { data, isLoading } = trpc.sedanaExecution.getBulkPurchasingAnalytics.useQuery();

  const items = data?.items || [];
  const totalMosques = data?.totalMosques || 0;
  const totalRequests = data?.totalRequests || 0;

  const handleExportExcel = async () => {
    try {
      if (items.length === 0) {
        toast.info("لا توجد بيانات للتصدير");
        return;
      }

      const columns = [
        { header: "اسم الصنف", align: "right" as const, minWidth: 26 },
        { header: "التصنيف", align: "center" as const, minWidth: 18 },
        { header: "إجمالي الكمية المطلوبة", align: "center" as const, minWidth: 20 },
        { header: "الوحدة", align: "center" as const, minWidth: 14 },
        { header: "عدد المساجد المستفيدة", align: "center" as const, minWidth: 18 },
        { header: "نسبة التوفير المتوقعة", align: "center" as const, minWidth: 18 },
      ];

      const rows = items.map((it) => [
        it.name,
        it.category,
        it.totalQuantity,
        it.unit,
        it.mosquesCount,
        `${it.estimatedBulkSavingsPercent}%`,
      ]);

      await exportStyledExcel({
        sheetName: "الشراء المجمع والتفاوض",
        columns,
        rows,
        fileName: `Sedana_Bulk_Purchasing_${new Date().toISOString().split("T")[0]}.xlsx`,
      });

      toast.success("تم تصدير تقرير الشراء المجمع بنجاح");
    } catch (e) {
      toast.error("حدث خطأ أثناء تصدير الإكسيل");
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 text-right font-sans" dir="rtl">
        {/* الترويسة */}
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between border-b pb-4">
          <div>
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300">
                <TrendingUp className="w-5 h-5" />
              </div>
              <h1 className="text-xl sm:text-2xl font-bold text-foreground">
                القوة التفاوضية والشراء المجمع
              </h1>
              <Badge variant="outline" className="text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-xs">
                برنامج سدانة
              </Badge>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">
              استناداً لوثيقة سدانة (البند 6): تحليل الاحتياجات التراكمية عبر المساجد للتعاقد والشراء المباشر بالجملة من المصنعين
            </p>
          </div>

          <Button
            size="sm"
            onClick={handleExportExcel}
            className="text-xs font-bold gap-1.5 bg-emerald-700 hover:bg-emerald-800 text-white shadow-xs"
          >
            <Download className="w-3.5 h-3.5" />
            <span>تصدير قائمة الشراء المجمع (Excel)</span>
          </Button>
        </div>

        {/* بطاقات الإحصاء */}
        <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
          <Card className="border border-border/80 shadow-2xs">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-[11px] font-semibold text-muted-foreground">المساجد المشمولة</p>
                <p className="text-xl font-extrabold text-foreground mt-0.5">{totalMosques} <span className="text-xs font-normal text-muted-foreground">مسجد</span></p>
              </div>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600">
                <Building2 className="w-5 h-5" />
              </div>
            </CardContent>
          </Card>

          <Card className="border border-border/80 shadow-2xs">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-[11px] font-semibold text-muted-foreground">الطلبات التشغيلية</p>
                <p className="text-xl font-extrabold text-foreground mt-0.5">{totalRequests} <span className="text-xs font-normal text-muted-foreground">طلب</span></p>
              </div>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-sky-50 dark:bg-sky-950/40 text-sky-600">
                <Layers className="w-5 h-5" />
              </div>
            </CardContent>
          </Card>

          <Card className="border border-border/80 shadow-2xs">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-[11px] font-semibold text-muted-foreground">أصناف الشراء المجمع</p>
                <p className="text-xl font-extrabold text-foreground mt-0.5">{items.length} <span className="text-xs font-normal text-muted-foreground">صنف</span></p>
              </div>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-purple-50 dark:bg-purple-950/40 text-purple-600">
                <Package className="w-5 h-5" />
              </div>
            </CardContent>
          </Card>

          <Card className="border border-border/80 shadow-2xs">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-[11px] font-semibold text-muted-foreground">متوسط الوفر المالي المتوقع</p>
                <p className="text-xl font-extrabold text-emerald-700 dark:text-emerald-400 mt-0.5">20% <span className="text-xs font-normal text-muted-foreground">وفورات جملة</span></p>
              </div>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-amber-50 dark:bg-amber-950/40 text-amber-600">
                <Percent className="w-5 h-5" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* تنبيه القيمة المضافة من الوثيقة */}
        <div className="p-4 rounded-xl bg-gradient-to-l from-emerald-50/80 to-sky-50/60 dark:from-emerald-950/30 dark:to-sky-950/20 border border-emerald-200 dark:border-emerald-800 text-xs flex items-start gap-3">
          <Sparkles className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-bold text-emerald-900 dark:text-emerald-200">
              القيمة الاستراتيجية للتفاوض المباشر مع المصانع:
            </p>
            <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
              إن تجميع احتياج مئات المساجد لبنود مثل صابون الرغوة، المناديل، عبوات المياه، وأكياس النفايات يمكّن الجمعية من الشراء مباشرة من المصنعين بتخفيضات تصل إلى 20%، مما يضاعف أثر التبرعات ويرفع كفاءة الإنفاق للحد الأقصى.
            </p>
          </div>
        </div>

        {/* جدول البنود المجمعة */}
        <Card className="border border-border/80 shadow-2xs">
          <CardHeader className="p-4 border-b">
            <CardTitle className="text-sm font-bold text-foreground">
              قائمة الاحتياجات التراكمية المجمعة عبر كافة المساجد
            </CardTitle>
            <CardDescription className="text-xs mt-0.5">
              الأصناف مرتبة حسب إجمالي حجم الطلب للاستفادة منها في عروض الأسعار والمناقصات الجماعية
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-12 flex flex-col items-center justify-center gap-3 text-center">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                <p className="text-xs text-muted-foreground">جاري تجميع وتحليل البيانات...</p>
              </div>
            ) : items.length === 0 ? (
              <div className="p-12 text-center text-muted-foreground">
                <Package className="w-8 h-8 mx-auto text-muted-foreground/40 stroke-1 mb-2" />
                <p className="text-sm font-bold">لا توجد أصناف كافية للتحليل بعد</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table className="text-xs text-right">
                  <TableHeader className="bg-muted/30">
                    <TableRow className="border-b">
                      <th className="p-3 w-10 text-center font-bold">#</th>
                      <th className="p-3 font-bold">الصنف</th>
                      <th className="p-3 font-bold">التصنيف</th>
                      <th className="p-3 font-bold text-center">إجمالي الكمية المطلوبة</th>
                      <th className="p-3 font-bold text-center">عدد المساجد المستفيدة</th>
                      <th className="p-3 font-bold text-center text-emerald-700">نسبة التوفير المتوقعة</th>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="divide-y divide-border">
                    {items.map((it, idx) => (
                      <TableRow key={idx} className="hover:bg-muted/10">
                        <td className="p-3 text-center font-mono text-muted-foreground">{idx + 1}</td>
                        <td className="p-3 font-bold text-foreground">{it.name}</td>
                        <td className="p-3 text-muted-foreground">{it.category}</td>
                        <td className="p-3 text-center font-mono font-bold text-base text-slate-900 dark:text-slate-100">
                          {it.totalQuantity} <span className="text-xs font-normal text-muted-foreground">{it.unit}</span>
                        </td>
                        <td className="p-3 text-center font-mono font-bold text-sky-700">
                          {it.mosquesCount} مسجد
                        </td>
                        <td className="p-3 text-center">
                          <span className="font-mono font-bold text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 px-2 py-0.5 rounded">
                            {it.estimatedBulkSavingsPercent}%
                          </span>
                        </td>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
