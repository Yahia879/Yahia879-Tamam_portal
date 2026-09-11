import * as React from "react";
import { useState, useMemo, useRef, useEffect } from "react";
import { Check, ChevronsUpDown, Search, FileText, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { normalizeArabic } from "@/components/ProjectSearchSelect";

export interface ProgressReportItem {
  id: number | string;
  reportNumber?: string | null;
  title?: string | null;
  actualProgress?: number | null;
  plannedProgress?: number | null;
  budgetSpent?: string | number | null;
  agreedPaymentAmount?: string | number | null;
  status?: string | null;
  workSummary?: string | null;
  actualWorkDone?: string | null;
  isAdvance?: boolean;
  hint?: string;
  [key: string]: any;
}

export interface ProgressReportSearchSelectProps {
  reports?: ProgressReportItem[];
  value?: string | number | null;
  onValueChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  triggerClassName?: string;
  id?: string;
  allowClear?: boolean;
  allowNone?: boolean;
  noneLabel?: string;
  isReportDisabled?: (report: ProgressReportItem) => boolean;
  getReportDisabledReason?: (report: ProgressReportItem) => string | null;
}

export function getReportLabel(report: ProgressReportItem): string {
  if (report.isAdvance) {
    const amountStr = report.budgetSpent ? ` (${parseFloat(String(report.budgetSpent)).toLocaleString()} ر.س)` : "";
    return `${report.title || "الدفعة الأولى"} - دفعة مقدمة${amountStr}`;
  }
  let progressPart = "";
  if (report.actualProgress !== undefined && report.actualProgress !== null) {
    progressPart = ` (${report.actualProgress}%)`;
  } else if (report.plannedProgress !== undefined && report.plannedProgress !== null) {
    progressPart = ` (مطلوب: ${report.plannedProgress}%)`;
  }
  const prefix = report.reportNumber ? `${report.reportNumber} - ` : "";
  return `${prefix}${report.title || ""}${progressPart}`;
}

export function ProgressReportSearchSelect({
  reports = [],
  value,
  onValueChange,
  placeholder = "ابحث واختر تقرير إنجاز الدفعة لمراجعته...",
  disabled = false,
  className,
  triggerClassName,
  id,
  allowClear = false,
  allowNone = false,
  noneLabel = "بدون تقرير إنجاز مرتبط",
  isReportDisabled,
  getReportDisabledReason,
}: ProgressReportSearchSelectProps) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);

  const isNoneSelected = allowNone && (value === "0" || value === 0);

  // العثور على التقرير المختار حالياً
  const selectedReport = useMemo(() => {
    if (!value || value === "0" || value === 0) return null;
    return reports.find((r) => r.id.toString() === value.toString()) || null;
  }, [reports, value]);

  // تصفية تقارير الإنجاز بالبحث الذكي (فقط برقم التقرير أو العنوان/الاسم)
  const filteredReports = useMemo(() => {
    if (!searchQuery.trim()) return reports;

    const queryWords = normalizeArabic(searchQuery).split(/\s+/).filter(Boolean);
    if (!queryWords.length) return reports;

    return reports.filter((report) => {
      const rNumber = report.reportNumber || "";
      const rTitle = report.title || "";
      const rHint = report.hint || (report.isAdvance ? "دفعة مقدمة بدون تقرير إنجاز" : "");

      // نص البحث الموحد لتقرير الإنجاز (فقط رقم التقرير واسم/عنوان التقرير والتلميح)
      const combinedText = normalizeArabic(`${rNumber} ${rTitle} ${rHint}`);

      // التأكد من وجود كل كلمة من كلمات البحث
      return queryWords.every((word) => combinedText.includes(word));
    });
  }, [reports, searchQuery]);

  // التركيز التلقائي على حقل البحث عند فتح القائمة
  useEffect(() => {
    if (open) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    } else {
      setSearchQuery("");
    }
  }, [open]);

  const handleSelect = (reportId: string | number) => {
    onValueChange(reportId.toString());
    setOpen(false);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onValueChange(allowNone ? "0" : "");
  };

  return (
    <div className={cn("relative w-full", className)} id={id} dir="rtl">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            disabled={disabled}
            className={cn(
              "w-full h-11 px-3 py-2 text-right justify-between font-normal bg-background border-input rounded-xl hover:bg-accent/50 focus:ring-2 focus:ring-primary/20 transition-all",
              !selectedReport && !isNoneSelected && "text-muted-foreground",
              triggerClassName
            )}
          >
            <div className="flex items-center gap-2 overflow-hidden flex-1 text-right min-w-0">
              {isNoneSelected ? (
                <span className="font-semibold text-foreground text-xs sm:text-sm truncate">
                  {noneLabel}
                </span>
              ) : selectedReport ? (
                <span className="font-semibold text-foreground text-xs sm:text-sm truncate">
                  {getReportLabel(selectedReport)}
                </span>
              ) : (
                <span className="text-muted-foreground text-xs sm:text-sm truncate">
                  {placeholder}
                </span>
              )}
            </div>

            <div className="flex items-center gap-1 shrink-0 mr-2">
              {allowClear && (selectedReport || isNoneSelected) && !disabled && (
                <span
                  role="button"
                  tabIndex={0}
                  onClick={handleClear}
                  className="p-1 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                  title="مسح الاختيار"
                >
                  <X className="h-3.5 w-3.5" />
                </span>
              )}
              <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
            </div>
          </Button>
        </PopoverTrigger>

        <PopoverContent
          className="w-[var(--radix-popover-trigger-width)] min-w-[320px] max-w-[95vw] p-0 shadow-xl border-border rounded-xl overflow-hidden z-50 bg-popover"
          align="start"
          sideOffset={5}
          dir="rtl"
        >
          {/* حقل البحث الذكي */}
          <div className="p-2 border-b border-border/60 bg-muted/20">
            <div className="relative flex items-center">
              <Search className="absolute right-3 h-4 w-4 text-muted-foreground pointer-events-none" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="بحث برقم التقرير أو الاسم..."
                className="w-full h-10 pr-9 pl-8 text-xs sm:text-sm bg-background border border-input focus:border-primary focus:ring-2 focus:ring-primary/20 rounded-lg outline-none transition-all placeholder:text-muted-foreground/70"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute left-2 p-1 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* شريط الإحصائية السريع */}
          <div className="px-3 py-1.5 bg-muted/40 border-b border-border/40 text-[11px] text-muted-foreground flex items-center justify-between font-medium">
            <span>التقارير المتاحة: {filteredReports.length}</span>
            {searchQuery && (
              <span className="text-primary font-bold">تصفية نشطة</span>
            )}
          </div>

          {/* قائمة تقارير الإنجاز */}
          <div className="max-h-[300px] sm:max-h-[340px] overflow-y-auto p-1.5 space-y-1">
            {/* خيار "بدون تقرير إنجاز مرتبط" إن وُجد */}
            {allowNone && (
              <div
                onClick={() => handleSelect("0")}
                className={cn(
                  "flex items-center justify-between p-2.5 rounded-lg cursor-pointer transition-all text-right border text-xs sm:text-sm",
                  isNoneSelected
                    ? "bg-primary/10 border-primary/30 text-primary font-semibold"
                    : "border-transparent hover:bg-muted/70 hover:border-border/50 text-foreground"
                )}
              >
                <span className="font-semibold truncate">{noneLabel}</span>
                {isNoneSelected && (
                  <div className="p-1 bg-primary text-primary-foreground rounded-full shrink-0 mr-2">
                    <Check className="h-3.5 w-3.5" />
                  </div>
                )}
              </div>
            )}

            {reports.length === 0 ? (
              <div className="py-8 text-center px-4">
                <FileText className="h-8 w-8 mx-auto text-muted-foreground/40 mb-2" />
                <p className="text-xs sm:text-sm font-semibold text-foreground">
                  لا توجد تقارير إنجاز معتمدة لهذا المشروع
                </p>
                <p className="text-[11px] text-muted-foreground mt-1">
                  تأكد من اعتماد تقرير إنجاز للمشروع من صفحة تقارير الإنجاز أولاً
                </p>
              </div>
            ) : filteredReports.length === 0 ? (
              <div className="py-8 text-center px-4">
                <Search className="h-8 w-8 mx-auto text-muted-foreground/40 mb-2" />
                <p className="text-xs sm:text-sm font-semibold text-foreground">
                  لم يتم العثور على أي تقرير إنجاز مطابق
                </p>
                <p className="text-[11px] text-muted-foreground mt-1">
                  جرب البحث برقم أو عنوان مختلف
                </p>
              </div>
            ) : (
              filteredReports.map((report) => {
                const isSelected = selectedReport?.id.toString() === report.id.toString();
                const isItemDisabled = isReportDisabled ? isReportDisabled(report) : false;
                const disabledReason = getReportDisabledReason
                  ? getReportDisabledReason(report)
                  : isItemDisabled
                  ? "تم إنشاء طلب صرف له سابقاً"
                  : null;

                const labelText = getReportLabel(report);

                return (
                  <div
                    key={report.id}
                    onClick={() => {
                      if (!isItemDisabled) {
                        handleSelect(report.id);
                      }
                    }}
                    className={cn(
                      "flex items-center justify-between p-2.5 rounded-lg transition-all text-right border text-xs sm:text-sm",
                      isItemDisabled
                        ? "opacity-60 bg-muted/30 border-dashed border-border/60 cursor-not-allowed text-muted-foreground"
                        : isSelected
                        ? "bg-primary/10 border-primary/30 text-primary font-semibold cursor-pointer"
                        : report.isAdvance
                        ? "border-teal-200/80 bg-teal-50/40 hover:bg-teal-50/70 dark:bg-teal-950/20 text-foreground cursor-pointer"
                        : "border-transparent hover:bg-muted/70 hover:border-border/50 text-foreground cursor-pointer"
                    )}
                  >
                    <div className="flex-1 truncate min-w-0 pl-2">
                      <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                        <span className={cn("truncate", isSelected && "font-bold")}>
                          {labelText}
                        </span>
                        {report.isAdvance && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-teal-100 text-teal-800 dark:bg-teal-950/70 dark:text-teal-300 border border-teal-300 shrink-0">
                            دفعة مقدمة من دون تقرير إنجاز
                          </span>
                        )}
                      </div>
                      {disabledReason && (
                        <span className="text-amber-600 dark:text-amber-400 font-medium mr-1.5 text-xs">
                          ({disabledReason})
                        </span>
                      )}
                    </div>

                    {isSelected && (
                      <div className="p-1 bg-primary text-primary-foreground rounded-full shrink-0 mr-2">
                        <Check className="h-3.5 w-3.5" />
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
