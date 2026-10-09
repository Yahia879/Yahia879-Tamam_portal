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
      "";
    const mosqueDistrict = mosque?.district || programData?.mosqueDistrict || "";
    const requestNumber = request?.requestNumber || `REQ-${request?.id || "---"}`;

    const today = new Date();
    const englishDate = `${today.getFullYear()}/${today.getMonth() + 1}/${today.getDate()}`;

    return {
      id: request?.id,
      requestNumber,
      mosqueName,
      mosqueCity,
      mosqueDistrict,
      programData,
      date: new Date().toLocaleDateString("ar-SA"),
      englishDate,
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

        const approvedQty = basketMatch && approvedItemsMap[basketMatch.id] !== undefined
          ? approvedItemsMap[basketMatch.id]
          : (item.quantity ?? basketMatch?.quantity ?? 1);

        return {
          id: item.id || `boq-${index}`,
          name: item.itemName || basketMatch?.name || `بند رقم ${index + 1}`,
          description: item.itemDescription || basketMatch?.description || "",
          category: item.category || basketMatch?.category || "بنود تشغيلية",
          unit: item.unit || basketMatch?.unit || "عدد",
          quantity: approvedQty,
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

  // توليد وتنزيل ملف الـ PDF عالي الدقة وبخط Cairo
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
    const toastId = toast.loading("جارٍ تجهيز ملف PDF عالي الدقة للبنود المحددة...");

    try {
      // انتظار تحميل الخطوط لضمان رسم خط Cairo بدقة
      if (document.fonts) {
        await document.fonts.ready;
      }
      await new Promise((resolve) => setTimeout(resolve, 300));

      const element = printRef.current;

      const canvas = await html2canvas(element, {
        scale: 3, // دقة فائقة (High DPI) لوضوح كامل للنصوص والجدول
        useCORS: true,
        allowTaint: false,
        backgroundColor: "#ffffff",
        logging: false,
        width: element.offsetWidth,
        height: element.offsetHeight,
        windowWidth: element.offsetWidth,
        windowHeight: element.offsetHeight,
        onclone: (clonedDoc) => {
          // حقن خط Cairo وتطبيقه على كل عناصر المستند
          const style = clonedDoc.createElement("style");
          style.innerHTML = `
            @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700;800;900&display=swap');
            * {
              font-family: 'Cairo', system-ui, -apple-system, sans-serif !important;
              -webkit-font-smoothing: antialiased;
              -moz-osx-font-smoothing: grayscale;
              text-rendering: optimizeLegibility;
            }
          `;
          clonedDoc.head.appendChild(style);

          const styleTags = clonedDoc.getElementsByTagName("style");
          for (let i = 0; i < styleTags.length; i++) {
            let css = styleTags[i].innerHTML;
            css = css.replace(/--primary:\s*oklch\([^)]+\)/g, "--primary: #0891B2");
            css = css.replace(/--foreground:\s*oklch\([^)]+\)/g, "--foreground: #0f172a");
            css = css.replace(/--background:\s*oklch\([^)]+\)/g, "--background: #ffffff");
            css = css.replace(/--border:\s*oklch\([^)]+\)/g, "--border: #e2e8f0");
            css = css.replace(/oklch\([^)]+\)/g, "#0891B2");
            styleTags[i].innerHTML = css;
          }
        },
      });

      const imgData = canvas.toDataURL("image/jpeg", 1.0);
      const pdf = new jsPDF("p", "mm", "a4");

      const imgProps = pdf.getImageProperties(imgData);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

      const pageHeight = pdf.internal.pageSize.getHeight();
      let heightLeft = pdfHeight;
      let position = 0;

      // إضافة الصفحة الأولى
      pdf.addImage(imgData, "JPEG", 0, position, pdfWidth, pdfHeight, undefined, "FAST");
      heightLeft -= pageHeight;

      // إضافة باقي الصفحات إن وجد
      while (heightLeft > 0) {
        position = heightLeft - pdfHeight;
        pdf.addPage();
        pdf.addImage(imgData, "JPEG", 0, position, pdfWidth, pdfHeight, undefined, "FAST");
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
        <DialogContent className="max-w-4xl w-[95vw] md:max-w-5xl max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden border-border shadow-2xl bg-card">
          {/* Header */}
          <DialogHeader className="p-5 pb-4 bg-muted/30 dark:bg-slate-900/40 border-b border-border">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-cyan-50 dark:bg-cyan-950/40 text-cyan-600 dark:text-cyan-400 flex items-center justify-center shadow-xs shrink-0">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div>
                  <DialogTitle className="text-lg md:text-xl font-extrabold text-foreground flex items-center gap-2">
                    <span>تصدير بنود التسعير كملف PDF للموردين</span>
                    <Badge variant="outline" className="text-[11px] font-bold py-0.5 px-2 bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-950/40 dark:text-cyan-300 dark:border-cyan-800">
                      برنامج سدانة
                    </Badge>
                  </DialogTitle>
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
                  className="pr-9 h-9 text-xs bg-background border-cyan-200/70 focus-visible:ring-cyan-500"
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
                  className="h-8 text-xs font-semibold border-cyan-300 text-cyan-800 hover:bg-cyan-50 dark:border-cyan-700 dark:text-cyan-300"
                >
                  <CheckSquare className="w-3.5 h-3.5 ml-1.5 text-cyan-600" />
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
                  <Layers className="w-3 h-3 text-cyan-600" /> التصنيف:
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedCategory("ALL")}
                  className={cn(
                    "px-2.5 py-1 rounded-full text-[11px] font-bold transition-colors shrink-0",
                    selectedCategory === "ALL"
                      ? "bg-cyan-600 text-white shadow-xs"
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
                          ? "bg-cyan-600 text-white font-bold shadow-xs"
                          : "bg-background text-muted-foreground border border-border hover:bg-muted"
                      )}
                    >
                      <span>{cat}</span>
                      <span className={cn("text-[10px]", isSelected ? "text-cyan-100" : "text-muted-foreground")}>
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
                          className="data-[state=checked]:bg-cyan-600 data-[state=checked]:border-cyan-600"
                        />
                      </TableHead>
                      <TableHead className="w-12 text-center font-bold">#</TableHead>
                      <TableHead className="font-bold min-w-[200px]">البند والمواصفات</TableHead>
                      <TableHead className="font-bold text-center min-w-[120px]">التصنيف</TableHead>
                      <TableHead className="font-bold text-center min-w-[110px]">دورية التوريد</TableHead>
                      <TableHead className="font-bold text-center min-w-[90px]">الكمية المعتمدة</TableHead>
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
                              ? "bg-cyan-50/70 dark:bg-cyan-950/20 hover:bg-cyan-50 dark:hover:bg-cyan-950/30"
                              : "hover:bg-muted/40"
                          )}
                        >
                          <TableCell className="text-center" onClick={(e) => e.stopPropagation()}>
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={() => toggleItem(item.id)}
                              aria-label={`تحديد بند ${item.name}`}
                              className="data-[state=checked]:bg-cyan-600 data-[state=checked]:border-cyan-600"
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
                                  : "bg-cyan-50 text-cyan-700 border-cyan-200"
                              )}
                            >
                              {item.frequency}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center font-extrabold text-xs text-cyan-800 dark:text-cyan-300">
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
                    ? "bg-cyan-100 dark:bg-cyan-950/60 text-cyan-800 dark:text-cyan-200 border-cyan-300"
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
                className="h-9 px-4 text-xs font-bold bg-cyan-600 hover:bg-cyan-700 text-white shadow-md shadow-cyan-600/20 gap-2"
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

      {/* قالب المستند المخصص للتصدير (بسيط، غير معجوق، مع التركيز على شعار الجمعية والبنود) */}
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
            fontFamily: "'Cairo', system-ui, -apple-system, sans-serif",
            color: "#0f172a",
            lineHeight: "1.4",
          }}
        >
          {/* ترويسة بسيطة وواضحة: شعار الجمعية مع الاسم وعنوان جدول الأسعار والتاريخ بألوان الهوية */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              paddingBottom: "16px",
              borderBottom: "2px solid #0891B2",
              marginBottom: "22px",
            }}
          >
            {/* الشعار واسم الجمعية */}
            <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
              {logoBase64 ? (
                <img
                  src={logoBase64}
                  alt="شعار الجمعية"
                  style={{
                    height: "65px",
                    maxHeight: "65px",
                    maxWidth: "180px",
                    objectFit: "contain",
                  }}
                />
              ) : null}
              <div>
                <div style={{ fontSize: "17px", fontWeight: "bold", color: "#0e7490", fontFamily: "'Cairo', sans-serif" }}>
                  {orgName}
                </div>
                <div style={{ fontSize: "12px", color: "#64748b", marginTop: "2px", fontFamily: "'Cairo', sans-serif" }}>
                  برنامج سدانة للعناية بالمساجد
                </div>
              </div>
            </div>

            {/* عنوان الوثيقة مع التاريخ أسفل استدراج عروض الأسعار بالأرقام الإنجليزية */}
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: "20px", fontWeight: "800", color: "#0f172a", fontFamily: "'Cairo', sans-serif" }}>
                جدول بنود التسعير
              </div>
              <div style={{ fontSize: "12px", color: "#0891B2", fontWeight: "bold", marginTop: "3px", fontFamily: "'Cairo', sans-serif" }}>
                استدراج عروض أسعار للموردين
              </div>
              <div style={{ fontSize: "11px", color: "#64748b", fontWeight: "600", marginTop: "4px", fontFamily: "'Cairo', sans-serif" }}>
                <span>التاريخ: </span>
                <span style={{ direction: "ltr", display: "inline-block" }}>
                  {requestInfo.englishDate}
                </span>
              </div>
            </div>
          </div>

          {/* جدول البنود المباشر والمريح بصرياً باللون الأزرق المعتمد لبرنامج سدانة */}
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              marginBottom: "24px",
              fontSize: "12px",
              fontFamily: "'Cairo', sans-serif",
            }}
          >
            <thead>
              <tr style={{ backgroundColor: "#0891B2", color: "#ffffff", textAlign: "center" }}>
                <th style={{ border: "1px solid #0e7490", padding: "10px 6px", width: "40px" }}>م</th>
                <th style={{ border: "1px solid #0e7490", padding: "10px 12px", textAlign: "right" }}>
                  بيان البند والمواصفات
                </th>
                <th style={{ border: "1px solid #0e7490", padding: "10px 8px", width: "85px" }}>الكمية المعتمدة</th>
                <th style={{ border: "1px solid #0e7490", padding: "10px 8px", width: "65px" }}>الوحدة</th>
                <th style={{ border: "1px solid #0e7490", padding: "10px 8px", width: "120px" }}>
                  سعر الوحدة (ر.س)
                </th>
                <th style={{ border: "1px solid #0e7490", padding: "10px 8px", width: "120px" }}>
                  الإجمالي (ر.س)
                </th>
              </tr>
            </thead>
            <tbody>
              {selectedItemsList.map((item, idx) => (
                <tr
                  key={item.id}
                  style={{
                    backgroundColor: idx % 2 === 0 ? "#ffffff" : "#f8fafc",
                    borderBottom: "1px solid #cbd5e1",
                  }}
                >
                  <td
                    style={{
                      border: "1px solid #cbd5e1",
                      padding: "10px 6px",
                      textAlign: "center",
                      fontWeight: "bold",
                      color: "#475569",
                    }}
                  >
                    {idx + 1}
                  </td>
                  <td style={{ border: "1px solid #cbd5e1", padding: "10px 12px", textAlign: "right" }}>
                    <div style={{ fontWeight: "bold", color: "#0f172a", fontSize: "12.5px" }}>
                      <span>{item.name}</span>
                      {item.frequency && (
                        <span
                          style={{
                            fontSize: "11px",
                            fontWeight: "normal",
                            color: "#0e7490",
                            marginRight: "6px",
                          }}
                        >
                          ({item.frequency})
                        </span>
                      )}
                    </div>
                    {item.description && (
                      <div style={{ fontSize: "10.5px", color: "#64748b", marginTop: "3px", lineHeight: "1.35" }}>
                        {item.description}
                      </div>
                    )}
                  </td>
                  <td
                    style={{
                      border: "1px solid #cbd5e1",
                      padding: "10px 6px",
                      textAlign: "center",
                      fontWeight: "bold",
                      fontSize: "13px",
                      color: "#0f172a",
                    }}
                  >
                    {typeof item.quantity === "number"
                      ? item.quantity.toLocaleString("ar-SA")
                      : item.quantity}
                  </td>
                  <td
                    style={{
                      border: "1px solid #cbd5e1",
                      padding: "10px 6px",
                      textAlign: "center",
                      color: "#475569",
                    }}
                  >
                    {item.unit}
                  </td>
                  <td
                    style={{
                      border: "1px solid #cbd5e1",
                      padding: "10px 6px",
                      textAlign: "center",
                      backgroundColor: "#fafbfc",
                    }}
                  >
                    {/* خانة فارغة لكتابة سعر الوحدة */}
                  </td>
                  <td
                    style={{
                      border: "1px solid #cbd5e1",
                      padding: "10px 6px",
                      textAlign: "center",
                      backgroundColor: "#fafbfc",
                    }}
                  >
                    {/* خانة فارغة لكتابة الإجمالي */}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* تذييل بسيط وأنيق للإجمالي وختم المورد */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "16px 24px",
              border: "1px solid #cbd5e1",
              borderRight: "4px solid #0891B2",
              borderRadius: "6px",
              backgroundColor: "#f8fafc",
              fontSize: "12.5px",
              fontFamily: "'Cairo', sans-serif",
            }}
          >
            <div>
              <span style={{ color: "#475569" }}>إجمالي العرض (شامل ضريبة القيمة المضافة): </span>
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
