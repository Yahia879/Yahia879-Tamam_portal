import React, { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export interface EnhancedPaginationProps {
  page?: number;
  currentPage?: number;
  totalPages: number;
  onPageChange: (newPage: number) => void;
  totalItems?: number;
  itemsPerPage?: number;
  itemName?: string;
  itemNamePlural?: string;
  isEn?: boolean;
  className?: string;
  showGoToPage?: boolean;
  siblingCount?: number;
}

/**
 * Hook لحفظ واستعادة الصفحة الحالية عبر sessionStorage و URL Search Params
 * يضمن بقاء المستخدم في نفس الصفحة عند الدخول لتفاصيل عنصر والرجوع للخلف
 */
export function usePersistedPage(storageKey: string, defaultPage = 1) {
  const getInitialPage = (): number => {
    try {
      if (typeof window !== "undefined") {
        // 1. الأولوية الأولى: المعامل من الـ URL (?page=X)
        const urlParams = new URLSearchParams(window.location.search);
        const urlPage = urlParams.get("page");
        if (urlPage) {
          const parsed = parseInt(urlPage, 10);
          if (!isNaN(parsed) && parsed >= 1) {
            return parsed;
          }
        }

        // 2. الأولوية الثانية: المخزن في sessionStorage
        const saved = sessionStorage.getItem(storageKey);
        if (saved) {
          const parsed = parseInt(saved, 10);
          if (!isNaN(parsed) && parsed >= 1) {
            return parsed;
          }
        }
      }
    } catch {}
    return defaultPage;
  };

  const [page, setPageState] = useState<number>(getInitialPage);

  const setPage = useCallback(
    (updater: number | ((prev: number) => number)) => {
      setPageState((prev) => {
        const next = typeof updater === "function" ? updater(prev) : updater;
        const validNext = Math.max(1, next);
        try {
          if (typeof window !== "undefined") {
            sessionStorage.setItem(storageKey, String(validNext));
            const url = new URL(window.location.href);
            if (validNext > 1) {
              url.searchParams.set("page", String(validNext));
            } else {
              url.searchParams.delete("page");
            }
            window.history.replaceState(window.history.state, "", url.toString());
          }
        } catch {}
        return validNext;
      });
    },
    [storageKey]
  );

  const resetPage = useCallback(() => {
    setPage(1);
  }, [setPage]);

  // مزامنة حالة الصفحة عند استخدام أزرار التنقل في المتصفح (Back / Forward)
  useEffect(() => {
    const handlePopState = () => {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const urlPage = urlParams.get("page");
        if (urlPage) {
          const parsed = parseInt(urlPage, 10);
          if (!isNaN(parsed) && parsed >= 1) {
            setPageState(parsed);
            sessionStorage.setItem(storageKey, String(parsed));
            return;
          }
        }
        const saved = sessionStorage.getItem(storageKey);
        if (saved) {
          const parsed = parseInt(saved, 10);
          if (!isNaN(parsed) && parsed >= 1) {
            setPageState(parsed);
          }
        }
      } catch {}
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [storageKey]);

  return [page, setPage, resetPage] as const;
}

/**
 * مكوّن الترقيم الشامل والمحسن لجميع جداول النظام (تصميم عصري وموحد فاخر)
 */
export default function EnhancedPagination({
  page: propPage,
  currentPage: propCurrentPage,
  totalPages,
  onPageChange,
  totalItems,
  itemsPerPage = 10,
  itemName = "عنصر",
  itemNamePlural = "عناصر",
  isEn = false,
  className,
  showGoToPage = true,
}: EnhancedPaginationProps) {
  const page = propPage ?? propCurrentPage ?? 1;
  const [inputVal, setInputVal] = useState<string>(String(page));

  // مزامنة القيمة المدخلة مع رقم الصفحة الفعلي
  useEffect(() => {
    setInputVal(String(page));
  }, [page]);

  // في اتجاه RTL العربي:
  // السابق على اليمين => ChevronRight
  // التالي على اليسار => ChevronLeft
  const PrevIcon = isEn ? ChevronLeft : ChevronRight;
  const NextIcon = isEn ? ChevronRight : ChevronLeft;

  // التحقق من صلاحية الصفحة الحالية نسبة لعدد الصفحات
  useEffect(() => {
    if (totalPages > 0 && page > totalPages) {
      onPageChange(totalPages);
    }
  }, [page, totalPages, onPageChange]);

  const commitPage = () => {
    const parsed = parseInt(inputVal.trim(), 10);
    if (isNaN(parsed)) {
      setInputVal(String(page));
      return;
    }
    const clamped = Math.max(1, Math.min(parsed, totalPages));
    setInputVal(String(clamped));
    if (clamped !== page) {
      onPageChange(clamped);
    }
  };

  if (totalPages <= 0 && (!totalItems || totalItems <= 0)) {
    return null;
  }

  const startItem = totalItems && totalItems > 0 ? (page - 1) * itemsPerPage + 1 : 0;
  const endItem = totalItems && totalItems > 0 ? Math.min(page * itemsPerPage, totalItems) : 0;
  const hasPendingChange = inputVal.trim() !== "" && inputVal.trim() !== String(page);

  return (
    <div
      className={cn(
        "py-3 px-4 bg-muted/15 border-t flex flex-col items-center justify-center gap-2 text-xs select-none",
        className
      )}
      dir={isEn ? "ltr" : "rtl"}
    >
      {/* 1. شريط تحكم موحد فاخر في المنتصف تماماً (السابق | صفحة [ 1 ] من 10 | التالي) */}
      {totalPages > 1 && (
        <div className="inline-flex items-center gap-1 p-1 rounded-xl bg-background border border-border/80 shadow-2xs">
          {/* زر الصفحة السابقة */}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className={cn(
              "h-8 px-3 gap-1.5 text-xs font-medium rounded-lg transition-all active:scale-95",
              page <= 1 ? "opacity-35 cursor-not-allowed" : "hover:bg-muted text-foreground"
            )}
            onClick={() => onPageChange(Math.max(1, page - 1))}
            disabled={page <= 1}
            title={isEn ? "Previous page" : "الصفحة السابقة"}
          >
            <PrevIcon className="h-4 w-4" />
            <span className="font-normal">{isEn ? "Previous" : "السابق"}</span>
          </Button>

          {/* فاصل */}
          <div className="h-4 w-px bg-border/60 mx-0.5" />

          {/* حقل الصفحة التفاعلي الأنيق في المنتصف */}
          <div className="flex items-center gap-1.5 px-2.5 text-xs font-medium">
            <span className="text-muted-foreground font-normal">{isEn ? "Page" : "صفحة"}</span>
            {showGoToPage ? (
              <div className="relative inline-flex items-center">
                <input
                  type="number"
                  min={1}
                  max={totalPages}
                  value={inputVal}
                  onChange={(e) => setInputVal(e.target.value)}
                  onFocus={(e) => e.target.select()}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      commitPage();
                      (e.target as HTMLInputElement).blur();
                    }
                  }}
                  onBlur={commitPage}
                  className={cn(
                    "h-7 w-11 text-center text-xs font-mono font-bold rounded-md bg-muted/40 hover:bg-muted/70 focus:bg-background border transition-all outline-none",
                    "focus:border-primary focus:ring-1 focus:ring-primary/40 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none",
                    hasPendingChange
                      ? "border-primary text-primary bg-primary/5 ring-1 ring-primary/30"
                      : "border-border/60 text-primary"
                  )}
                  title={isEn ? "Click to change page, press Enter" : "انقر لتغيير الصفحة واضغط Enter"}
                  aria-label={isEn ? "Current page" : "رقم الصفحة"}
                />
                {hasPendingChange && (
                  <button
                    type="button"
                    onClick={commitPage}
                    className="absolute -top-1.5 -start-1.5 bg-primary text-white rounded-full w-4 h-4 flex items-center justify-center text-[9px] font-bold shadow-xs hover:bg-primary/90 animate-in fade-in zoom-in duration-150 cursor-pointer"
                    title={isEn ? "Go" : "انتقال"}
                  >
                    ✓
                  </button>
                )}
              </div>
            ) : (
              <span className="font-bold text-primary font-mono px-1">{page}</span>
            )}
            <span className="text-muted-foreground font-normal">{isEn ? "of" : "من"}</span>
            <span className="font-semibold text-foreground font-mono">{totalPages}</span>
          </div>

          {/* فاصل */}
          <div className="h-4 w-px bg-border/60 mx-0.5" />

          {/* زر الصفحة التالية */}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className={cn(
              "h-8 px-3 gap-1.5 text-xs font-medium rounded-lg transition-all active:scale-95",
              page >= totalPages ? "opacity-35 cursor-not-allowed" : "hover:bg-muted text-foreground"
            )}
            onClick={() => onPageChange(Math.min(totalPages, page + 1))}
            disabled={page >= totalPages}
            title={isEn ? "Next page" : "الصفحة التالية"}
          >
            <span className="font-normal">{isEn ? "Next" : "التالي"}</span>
            <NextIcon className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* 2. ملخص عدد العناصر المعروضة في المنتصف أسفل شريط التنقل بتناسق تام */}
      {totalItems !== undefined && totalItems > 0 && (
        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground font-medium whitespace-nowrap">
          <span className="w-1.5 h-1.5 rounded-full bg-primary/70 shrink-0" />
          {isEn ? (
            <span>
              Showing <strong className="text-foreground font-semibold font-mono">{startItem}–{endItem}</strong> of{" "}
              <strong className="text-foreground font-semibold font-mono">{totalItems}</strong>{" "}
              {totalItems === 1 ? itemName : itemNamePlural}
            </span>
          ) : (
            <span>
              عرض <strong className="text-foreground font-semibold font-mono">{startItem}–{endItem}</strong> من أصل{" "}
              <strong className="text-foreground font-semibold font-mono">{totalItems}</strong>{" "}
              {itemName}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
