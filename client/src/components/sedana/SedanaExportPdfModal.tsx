import React, { useState, useMemo, useRef, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  FileDown,
  Search,
  CheckSquare,
  Square,
  X,
  Loader2,
  Building2,
  Layers,
  FileSpreadsheet,
  AlertCircle,
  Printer,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";
import { trpc } from "@/lib/trpc";

export interface SedanaExportPdfModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  request: any;
  items?: any[];
}

interface NormalizedItem {
  id: string | number;
  name: string;
  description: string;
  category: string;
  unit: string;
  quantity: number | string;
  frequency: string;
}

export const SedanaExportPdfModal: React.FC<SedanaExportPdfModalProps> = ({
  open,
  onOpenChange,
  request,
  items = [],
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [selectedIds, setSelectedIds] = useState<Set<string | number>>(new Set());
  const [isExporting, setIsExporting] = useState(false);

  const printRef = useRef<HTMLDivElement>(null);

  // جلب إعدادات وشعار الجمعية بصيغة Base64 لتفادي مشاكل Tainted Canvas تماماً
  const { data: logoData } = trpc.organization.getLogoBase64.useQuery();
  const logoBase64 = logoData?.logoBase64 || "";
  const orgName = logoData?.organizationName || "جمعية منارة للعناية بالمساجد";

  // استخراج وتطبيع بيانات الطلب
  const requestInfo = useMemo(() => {
    let programData: Record<string, any> = {};
    try {
      if (typeof request?.programData === "string") {
        programData = JSON.parse(request.programData);
      } else {
        programData = request?.programData || {};
      }
    } catch {
      programData = {};
    }

    const mosque = request?.mosque;
    const mosqueName =
      request?.mosqueName ||
      mosque?.name ||
      programData?.mosqueName ||
      "مسجد سدانة المعتمد";
    const mosqueCity =
      request?.city ||
      mosque?.city ||
      programData?.mosqueCity ||
      "المملكة العربية السعودية";
    const mosqueDistrict = mosque?.district || programData?.mosqueDistrict || "";
    const requestNumber = request?.requestNumber || `REQ-${request?.id || "---"}`;

    return {
      id: request?.id,
      requestNumber,
      mosqueName,
      mosqueCity,
      mosqueDistrict,
      programData,
      date: new Date().toLocaleDateString("ar-SA"),
    };
  }, [request]);

  // تطبيع قائمة البنود سواء جاءت من جدول الكميات (boqData) أو من سلة احتياجات سدانة (basketItems)
  const normalizedItems = useMemo<NormalizedItem[]>(() => {
    const programData = requestInfo.programData;
    const approvedItemsMap = programData?.approvedPlan?.approvedItems || {};
    const basketItems: any[] = Array.isArray(programData?.basketItems)
      ? programData.basketItems
      : [];

    const basketMap = new Map<string, any>();
    basketItems.forEach((bi) => {
      if (bi?.id) basketMap.set(String(bi.id), bi);
      if (bi?.name) basketMap.set(String(bi.name).trim(), bi);
    });

    if (Array.isArray(items) && items.length > 0) {
      return items.map((item, index) => {
        const basketMatch =
          basketMap.get(String(item.id)) ||
          basketMap.get(String(item.itemName || "").trim());

        let frequency = basketMatch?.frequency || "";
        if (!frequency && item.itemDescription) {
          const match = item.itemDescription.match(/دورية التوريد:\s*([^\s,]+)/);
          if (match) frequency = match[1];
        }
        if (!frequency) frequency = "سنوي";

        return {
          id: item.id || `boq-${index}`,
          name: item.itemName || basketMatch?.name || `بند رقم ${index + 1}`,
          description: item.itemDescription || basketMatch?.description || "",
          category: item.category || basketMatch?.category || "بنود تشغيلية",
          unit: item.unit || basketMatch?.unit || "عدد",
          quantity: item.quantity ?? basketMatch?.quantity ?? 1,
          frequency,
        };
      });
    }

    if (basketItems.length > 0) {
      return basketItems.map((bi, index) => {
        const qty =
          approvedItemsMap[bi.id] !== undefined
            ? approvedItemsMap[bi.id]
            : bi.quantity ?? 1;
        return {
          id: bi.id || `basket-${index}`,
          name: bi.name || `بند رقم ${index + 1}`,
          description: bi.description || "",
          category: bi.category || "بنود تشغيلية",
          unit: bi.unit || "عدد",
          quantity: qty,
          frequency: bi.frequency || "سنوي",
        };
      });
    }

    return [];
  }, [items, requestInfo]);

  // عند فتح النافذة، نقوم بتحديد جميع البنود افتراضياً لتسهيل الاستخدام
  useEffect(() => {
    if (open && normalizedItems.length > 0) {
      setSelectedIds(new Set(normalizedItems.map((item) => item.id)));
    }
  }, [open, normalizedItems]);

  // قائمة التصنيفات الفريدة للفلترة
  const categories = useMemo(() => {
    const set = new Set<string>();
    normalizedItems.forEach((i) => {
      if (i.category) set.add(i.category);
    });
    return Array.from(set);
  }, [normalizedItems]);

  // تصفية البنود وفق البحث والتصنيف
  const filteredItems = useMemo(() => {
    return normalizedItems.filter((item) => {
      const matchesSearch =
        searchQuery.trim() === "" ||
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.category.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesCat =
        selectedCategory === "ALL" || item.category === selectedCategory;

      return matchesSearch && matchesCat;
    });
  }, [normalizedItems, searchQuery, selectedCategory]);

  // قائمة البنود المحددة فقط للتصدير
  const selectedItemsList = useMemo(() => {
    return normalizedItems.filter((item) => selectedIds.has(item.id));
  }, [normalizedItems, selectedIds]);

  // دوال التحكم بالاختيار
  const toggleItem = (id: string | number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const selectAll = () => {
    setSelectedIds(new Set(normalizedItems.map((i) => i.id)));
  };

  const deselectAll = () => {
    setSelectedIds(new Set());
  };

  const toggleSelectFiltered = () => {
    const allFilteredSelected = filteredItems.every((item) =>
      selectedIds.has(item.id)
    );
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allFilteredSelected) {
        filteredItems.forEach((item) => next.delete(item.id));
      } else {
        filteredItems.forEach((item) => next.add(item.id));
      }
      return next;
    });
  };

  // توليد وتنزيل ملف الـ PDF النظيف والبسيط
  const handleExportPdf = async () => {
    if (selectedItemsList.length === 0) {
      toast.error("يرجى تحديد بند واحد على الأقل للتصدير");
      return;
    }

    if (!printRef.current) {
      toast.error("حدث خطأ في تحميل قالب المستند");
      return;
    }

    setIsExporting(true);
    const toastId = toast.loading("جارٍ تجهيز ملف PDF للبنود المحددة...");

    try {
      await new Promise((resolve) => setTimeout(resolve, 150));

      const element = printRef.current;

      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: "#ffffff",
        logging: false,
        width: element.offsetWidth,
        height: element.offsetHeight,
        onclone: (clonedDoc) => {
          const styleTags = clonedDoc.getElementsByTagName("style");
          for (let i = 0; i < styleTags.length; i++) {
            let css = styleTags[i].innerHTML;
            css = css.replace(/--primary:\s*oklch\([^)]+\)/g, "--primary: #059669");
            css = css.replace(/--foreground:\s*oklch\([^)]+\)/g, "--foreground: #0f172a");
            css = css.replace(/--background:\s*oklch\([^)]+\)/g, "--background: #ffffff");
            css = css.replace(/--border:\s*oklch\([^)]+\)/g, "--border: #e2e8f0");
            css = css.replace(/oklch\([^)]+\)/g, "#059669");
            styleTags[i].innerHTML = css;
          }
        },
      });

      const imgData = canvas.toDataURL("image/jpeg", 0.96);
      const pdf = new jsPDF("p", "mm", "a4");

      const imgProps = pdf.getImageProperties(imgData);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

      const pageHeight = pdf.internal.pageSize.getHeight();
      let heightLeft = pdfHeight;
      let position = 0;

      // إضافة الصفحة الأولى
      pdf.addImage(imgData, "JPEG", 0, position, pdfWidth, pdfHeight);
      heightLeft -= pageHeight;

      // إضافة باقي الصفحات إن وجد
      while (heightLeft > 0) {
        position = heightLeft - pdfHeight;
        pdf.addPage();
        pdf.addImage(imgData, "JPEG", 0, position, pdfWidth, pdfHeight);
        heightLeft -= pageHeight;
      }

      const safeFileName = `بنود_تسعير_سدانة_${requestInfo.requestNumber || requestInfo.id}`.replace(
        /[/\\?%*:|"<>]/g,
        "_"
      );
      pdf.save(`${safeFileName}.pdf`);

      toast.success(`تم تحميل ملف PDF بنجاح (${selectedItemsList.length} بند)`, {
        id: toastId,
      });
      onOpenChange(false);
    } catch (error: any) {
      console.error("Error generating PDF:", error);
      toast.error(`حدث خطأ أثناء إنشاء ملف PDF: ${error.message || "خطأ غير معروف"}`, {
        id: toastId,
      });
    } finally {
      setIsExporting(false);
    }
  };

  const isAllFilteredSelected =
    filteredItems.length > 0 &&
    filteredItems.every((item) => selectedIds.has(item.id));

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl w-[95vw] md:max-w-5xl max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden border-emerald-300 dark:border-emerald-800 shadow-2xl">
          {/* Header */}
          <DialogHeader className="p-5 pb-4 bg-gradient-to-r from-emerald-50 via-emerald-50/60 to-white dark:from-emerald-950/40 dark:via-emerald-900/20 dark:to-slate-900 border-b border-emerald-200 dark:border-emerald-800/80">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-600/20 shrink-0">
                  <FileSpreadsheet className="w-6 h-6" />
                </div>
                <div>
                  <DialogTitle className="text-lg md:text-xl font-extrabold text-foreground flex items-center gap-2">
                    <span>تصدير بنود التسعير كملف PDF للموردين</span>
                    <Badge className="bg-emerald-600 text-white text-[11px] font-bold py-0.5 px-2">
                      برنامج سدانة
                    </Badge>
                  </DialogTitle>
                  <DialogDescription className="text-xs text-muted-foreground mt-1">
                    حدد البنود المطلوبة لتوليد ملف PDF نظيف ومباشر موجه للموردين
                  </DialogDescription>
                </div>
              </div>

              {/* بطاقة معلومات سريعة */}
              <div className="hidden sm:flex flex-col items-end text-xs text-muted-foreground bg-white/80 dark:bg-slate-900/80 p-2 rounded-lg border border-emerald-200/60 dark:border-emerald-800/40 shadow-xs">
                <div className="flex items-center gap-1.5 font-bold text-foreground">
                  <Building2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>{requestInfo.mosqueName}</span>
                </div>
                <div className="text-[11px] mt-0.5">
                  رقم الطلب: <span className="font-mono font-bold text-emerald-700 dark:text-emerald-400">{requestInfo.requestNumber}</span>
                </div>
              </div>
            </div>
          </DialogHeader>

          {/* Controls Bar */}
          <div className="p-4 bg-slate-50/70 dark:bg-slate-900/40 border-b border-border space-y-3">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              {/* شريط البحث */}
              <div className="relative flex-1">
                <Search className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="ابحث باسم البند، التصنيف، أو المواصفات..."
                  className="pr-9 h-9 text-xs bg-background border-emerald-200/70 focus-visible:ring-emerald-500"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute left-2.5 top-2.5 text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              {/* أزرار التحديد السريع */}
              <div className="flex items-center gap-2 shrink-0">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={selectAll}
                  className="h-8 text-xs font-semibold border-emerald-300 text-emerald-800 hover:bg-emerald-50 dark:border-emerald-700 dark:text-emerald-300"
                >
                  <CheckSquare className="w-3.5 h-3.5 ml-1.5 text-emerald-600" />
                  تحديد الكل ({normalizedItems.length})
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={deselectAll}
                  className="h-8 text-xs font-semibold text-muted-foreground hover:text-red-600 hover:border-red-300"
                >
                  <Square className="w-3.5 h-3.5 ml-1.5" />
                  إلغاء التحديد
                </Button>
              </div>
            </div>

            {/* تصنيفات سدانة للفلترة السريعة */}
            {categories.length > 0 && (
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs scrollbar-none">
                <span className="text-muted-foreground font-semibold text-[11px] ml-1 shrink-0 flex items-center gap-1">
                  <Layers className="w-3 h-3 text-emerald-600" /> التصنيف:
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedCategory("ALL")}
                  className={cn(
                    "px-2.5 py-1 rounded-full text-[11px] font-bold transition-colors shrink-0",
                    selectedCategory === "ALL"
                      ? "bg-emerald-600 text-white shadow-xs"
                      : "bg-background text-muted-foreground border border-border hover:bg-muted"
                  )}
                >
                  الكل ({normalizedItems.length})
                </button>
                {categories.map((cat) => {
                  const count = normalizedItems.filter((i) => i.category === cat).length;
                  const isSelected = selectedCategory === cat;
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setSelectedCategory(cat)}
                      className={cn(
                        "px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors shrink-0 flex items-center gap-1",
                        isSelected
                          ? "bg-emerald-600 text-white font-bold shadow-xs"
                          : "bg-background text-muted-foreground border border-border hover:bg-muted"
                      )}
                    >
                      <span>{cat}</span>
                      <span className={cn("text-[10px]", isSelected ? "text-emerald-100" : "text-muted-foreground")}>
                        ({count})
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Table List Area */}
          <div className="flex-1 overflow-y-auto max-h-[52vh] p-4">
            {filteredItems.length === 0 ? (
              <div className="text-center py-12 border border-dashed rounded-xl p-8 bg-muted/10">
                <AlertCircle className="h-10 w-10 mx-auto mb-2 text-muted-foreground/60" />
                <p className="font-bold text-sm text-foreground">لا توجد بنود مطابقة لخيارات البحث</p>
                <p className="text-xs text-muted-foreground mt-1">
                  جرّب مسح نص البحث أو اختيار تصنيف آخر لعرض البنود
                </p>
              </div>
            ) : (
              <div className="border border-border rounded-xl overflow-hidden shadow-xs bg-card">
                <Table>
                  <TableHeader className="bg-muted/50 sticky top-0 z-10 border-b">
                    <TableRow>
                      <TableHead className="w-12 text-center">
                        <Checkbox
                          checked={isAllFilteredSelected}
                          onCheckedChange={toggleSelectFiltered}
                          aria-label="تحديد كافة البنود المعروضة"
                          className="data-[state=checked]:bg-emerald-600 data-[state=checked]:border-emerald-600"
                        />
                      </TableHead>
                      <TableHead className="w-12 text-center font-bold">#</TableHead>
                      <TableHead className="font-bold min-w-[200px]">البند والمواصفات</TableHead>
                      <TableHead className="font-bold text-center min-w-[120px]">التصنيف</TableHead>
                      <TableHead className="font-bold text-center min-w-[110px]">دورية التوريد</TableHead>
                      <TableHead className="font-bold text-center min-w-[90px]">الكمية</TableHead>
                      <TableHead className="font-bold text-center min-w-[90px]">الوحدة</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="divide-y divide-border">
                    {filteredItems.map((item, index) => {
                      const isSelected = selectedIds.has(item.id);
                      return (
                        <TableRow
                          key={item.id}
                          onClick={() => toggleItem(item.id)}
                          className={cn(
                            "cursor-pointer transition-colors",
                            isSelected
                              ? "bg-emerald-50/70 dark:bg-emerald-950/20 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
                              : "hover:bg-muted/40"
                          )}
                        >
                          <TableCell className="text-center" onClick={(e) => e.stopPropagation()}>
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={() => toggleItem(item.id)}
                              aria-label={`تحديد بند ${item.name}`}
                              className="data-[state=checked]:bg-emerald-600 data-[state=checked]:border-emerald-600"
                            />
                          </TableCell>
                          <TableCell className="text-center font-mono text-xs text-muted-foreground">
                            {index + 1}
                          </TableCell>
                          <TableCell>
                            <div className="font-bold text-xs text-foreground">{item.name}</div>
                            {item.description && (
                              <div className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">
                                {item.description}
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge
                              variant="outline"
                              className="text-[10px] py-0 px-2 font-medium bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700"
                            >
                              {item.category}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge
                              variant="outline"
                              className={cn(
                                "text-[10px] py-0 px-2 font-semibold",
                                item.frequency === "مرة واحدة"
                                  ? "bg-purple-50 text-purple-700 border-purple-200"
                                  : item.frequency === "شهري"
                                  ? "bg-blue-50 text-blue-700 border-blue-200"
                                  : item.frequency === "ربع سنوي"
                                  ? "bg-amber-50 text-amber-700 border-amber-200"
                                  : "bg-emerald-50 text-emerald-700 border-emerald-200"
                              )}
                            >
                              {item.frequency}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center font-extrabold text-xs text-emerald-800 dark:text-emerald-300">
                            {typeof item.quantity === "number"
                              ? item.quantity.toLocaleString("ar-SA")
                              : item.quantity}
                          </TableCell>
                          <TableCell className="text-center text-xs text-muted-foreground">
                            {item.unit}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>

          {/* Footer */}
          <DialogFooter className="p-4 bg-slate-50 dark:bg-slate-900 border-t border-border flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-2">
              <Badge
                variant="outline"
                className={cn(
                  "font-bold text-xs py-1 px-3 gap-1.5",
                  selectedItemsList.length > 0
                    ? "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-200 border-emerald-300"
                    : "bg-red-50 text-red-700 border-red-200"
                )}
              >
                <span>تم تحديد</span>
                <span className="text-sm font-extrabold">{selectedItemsList.length}</span>
                <span>من أصل {normalizedItems.length} بند</span>
              </Badge>
              {selectedItemsList.length === 0 && (
                <span className="text-[11px] text-red-600 font-medium">
                  * يرجى اختيار بند واحد على الأقل لتفعيل التصدير
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isExporting}
                className="h-9 text-xs"
              >
                إلغاء
              </Button>
              <Button
                type="button"
                onClick={handleExportPdf}
                disabled={isExporting || selectedItemsList.length === 0}
                className="h-9 px-4 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/20 gap-2"
              >
                {isExporting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>جارٍ إنشاء الـ PDF...</span>
                  </>
                ) : (
                  <>
                    <FileDown className="w-4 h-4" />
                    <span>تحميل ملف PDF ({selectedItemsList.length} بند)</span>
                  </>
                )}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* قالب المستند المخصص للتصدير (بسيط، غير معجوق، مع شعار الجمعية والبنود فقط) */}
      <div
        style={{
          position: "fixed",
          left: "-9999px",
          top: 0,
          width: "820px",
          backgroundColor: "#ffffff",
          color: "#0f172a",
          zIndex: -100,
        }}
      >
        <div
          ref={printRef}
          dir="rtl"
          style={{
            width: "820px",
            backgroundColor: "#ffffff",
            padding: "36px 40px",
            fontFamily: "Arial, 'Cairo', 'Segoe UI', Tahoma, sans-serif",
            color: "#0f172a",
            lineHeight: "1.4",
          }}
        >
          {/* Header البسيط: شعار الجمعية على اليمين، عنوان الوثيقة بالوسط، بيانات المسجد والطلب على اليسار */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              paddingBottom: "16px",
              borderBottom: "2px solid #059669",
              marginBottom: "20px",
            }}
          >
            {/* الشعار واسم الجمعية */}
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <img
                src={logoUrl}
                alt="شعار الجمعية"
                crossOrigin="anonymous"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = "/logo.png";
                }}
                style={{ height: "60px", maxHeight: "60px", objectFit: "contain" }}
              />
              <div>
                <div style={{ fontSize: "16px", fontWeight: "bold", color: "#065f46" }}>
                  {orgName}
                </div>
                <div style={{ fontSize: "11px", color: "#64748b", marginTop: "2px" }}>
                  برنامج سدانة للعناية بالمساجد
                </div>
              </div>
            </div>

            {/* عنوان المستند بالوسط */}
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: "18px", fontWeight: "bold", color: "#0f172a" }}>
                جدول بنود التسعير
              </div>
              <div style={{ fontSize: "11px", color: "#059669", fontWeight: "bold", marginTop: "2px" }}>
                استدراج عروض أسعار للموردين
              </div>
            </div>

            {/* بيانات الطلب والمسجد */}
            <div style={{ textAlign: "left", fontSize: "11px", color: "#475569" }}>
              <div><strong>رقم الطلب:</strong> <span style={{ direction: "ltr", display: "inline-block", fontWeight: "bold", color: "#0f172a" }}>{requestInfo.requestNumber}</span></div>
              <div style={{ marginTop: "3px" }}><strong>المسجد:</strong> <span style={{ color: "#0f172a", fontWeight: "bold" }}>{requestInfo.mosqueName}</span></div>
              <div style={{ marginTop: "3px" }}><strong>المدينة:</strong> {requestInfo.mosqueCity}</div>
              <div style={{ marginTop: "3px" }}><strong>التاريخ:</strong> {requestInfo.date}</div>
            </div>
          </div>

          {/* جدول البنود المباشر والبسيط */}
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              marginBottom: "24px",
              fontSize: "11px",
            }}
          >
            <thead>
              <tr style={{ backgroundColor: "#059669", color: "#ffffff", textAlign: "center" }}>
                <th style={{ border: "1px solid #047857", padding: "8px 4px", width: "35px" }}>#</th>
                <th style={{ border: "1px solid #047857", padding: "8px 8px", textAlign: "right" }}>البند والمواصفات</th>
                <th style={{ border: "1px solid #047857", padding: "8px 6px", width: "100px" }}>التصنيف</th>
                <th style={{ border: "1px solid #047857", padding: "8px 4px", width: "80px" }}>دورية التوريد</th>
                <th style={{ border: "1px solid #047857", padding: "8px 4px", width: "55px" }}>الكمية</th>
                <th style={{ border: "1px solid #047857", padding: "8px 4px", width: "55px" }}>الوحدة</th>
                <th style={{ border: "1px solid #047857", padding: "8px 6px", width: "95px" }}>سعر الوحدة (ر.س)</th>
                <th style={{ border: "1px solid #047857", padding: "8px 6px", width: "95px" }}>الإجمالي (ر.س)</th>
                <th style={{ border: "1px solid #047857", padding: "8px 6px", width: "100px" }}>ملاحظات المورد</th>
              </tr>
            </thead>
            <tbody>
              {selectedItemsList.map((item, idx) => (
                <tr
                  key={item.id}
                  style={{
                    backgroundColor: idx % 2 === 0 ? "#ffffff" : "#f8fafc",
                    borderBottom: "1px solid #e2e8f0",
                  }}
                >
                  <td style={{ border: "1px solid #cbd5e1", padding: "7px 4px", textAlign: "center", fontWeight: "bold" }}>
                    {idx + 1}
                  </td>
                  <td style={{ border: "1px solid #cbd5e1", padding: "7px 8px", textAlign: "right" }}>
                    <div style={{ fontWeight: "bold", color: "#0f172a" }}>{item.name}</div>
                    {item.description && (
                      <div style={{ fontSize: "9.5px", color: "#64748b", marginTop: "2px" }}>
                        {item.description}
                      </div>
                    )}
                  </td>
                  <td style={{ border: "1px solid #cbd5e1", padding: "7px 4px", textAlign: "center", color: "#334155" }}>
                    {item.category}
                  </td>
                  <td style={{ border: "1px solid #cbd5e1", padding: "7px 4px", textAlign: "center", color: "#047857", fontWeight: "bold" }}>
                    {item.frequency}
                  </td>
                  <td style={{ border: "1px solid #cbd5e1", padding: "7px 4px", textAlign: "center", fontWeight: "bold" }}>
                    {typeof item.quantity === "number" ? item.quantity.toLocaleString("ar-SA") : item.quantity}
                  </td>
                  <td style={{ border: "1px solid #cbd5e1", padding: "7px 4px", textAlign: "center", color: "#64748b" }}>
                    {item.unit}
                  </td>
                  <td style={{ border: "1px solid #cbd5e1", padding: "7px 4px", textAlign: "center" }}>
                    <div style={{ minHeight: "16px" }}></div>
                  </td>
                  <td style={{ border: "1px solid #cbd5e1", padding: "7px 4px", textAlign: "center" }}>
                    <div style={{ minHeight: "16px" }}></div>
                  </td>
                  <td style={{ border: "1px solid #cbd5e1", padding: "7px 4px", textAlign: "center" }}>
                    <div style={{ minHeight: "16px" }}></div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* تذييل بسيط جداً وأنيق للإجمالي وختم المورد */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "14px 20px",
              border: "1px solid #cbd5e1",
              borderRadius: "6px",
              backgroundColor: "#f8fafc",
              fontSize: "12px",
            }}
          >
            <div>
              <span style={{ color: "#475569" }}>إجمالي العرض (شامل الضريبة): </span>
              <strong style={{ color: "#0f172a" }}>................................................ ر.س</strong>
            </div>

            <div>
              <span style={{ color: "#475569" }}>اسم وتوقيع وختم المورد: </span>
              <strong style={{ color: "#0f172a" }}>................................................</strong>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};
