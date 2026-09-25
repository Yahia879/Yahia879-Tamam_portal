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
 * مكوّن الترقيم الشامل والمحسن لجميع جداول النظام (تصميم عصري ومختصر)
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
  const [jumpInput, setJumpInput] = useState<string>("");

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

  const handleJumpSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const parsed = parseInt(jumpInput.trim(), 10);
    if (isNaN(parsed)) return;
    const target = Math.max(1, Math.min(parsed, totalPages));
    if (target !== page) {
      onPageChange(target);
    }
    setJumpInput("");
  };

  if (totalPages <= 0 && (!totalItems || totalItems <= 0)) {
    return null;
  }

  const startItem = totalItems && totalItems > 0 ? (page - 1) * itemsPerPage + 1 : 0;
  const endItem = totalItems && totalItems > 0 ? Math.min(page * itemsPerPage, totalItems) : 0;

  return (
    <div
      className={cn(
        "px-4 py-3 bg-muted/20 border-t flex flex-col sm:flex-row items-center justify-between gap-3 text-xs",
        className
      )}
      dir={isEn ? "ltr" : "rtl"}
    >
      {/* 1. نص عدد العناصر الحالي */}
      <div className="text-[11px] md:text-xs text-muted-foreground font-medium text-center sm:text-right whitespace-nowrap">
        {totalItems !== undefined ? (
          totalItems > 0 ? (
            isEn ? (
              <span>
                Showing <strong className="text-foreground">{startItem}</strong> -{" "}
                <strong className="text-foreground">{endItem}</strong> of{" "}
                <strong className="text-foreground">{totalItems}</strong>{" "}
                {totalItems === 1 ? itemName : itemNamePlural}
              </span>
            ) : (
              <span>
                يعرض <strong className="text-foreground">{startItem}</strong> -{" "}
                <strong className="text-foreground">{endItem}</strong> من أصل{" "}
                <strong className="text-foreground">{totalItems}</strong>{" "}
                {itemName}
              </span>
            )
          ) : (
            <span>{isEn ? "No items found" : "لا توجد عناصر"}</span>
          )
        ) : (
          <span>
            {isEn ? `Page ${page} of ${totalPages}` : `صفحة ${page} من ${totalPages}`}
          </span>
        )}
      </div>

      {/* 2. أزرار التنقل الذكية والمختصرة (السابق / مؤشر الصفحة / التالي) */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 max-w-full">
          {/* زر الصفحة السابقة */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 px-3 gap-1.5 text-xs font-medium hover:bg-muted shrink-0 transition-colors shadow-2xs"
            onClick={() => onPageChange(Math.max(1, page - 1))}
            disabled={page <= 1}
            title={isEn ? "Previous page" : "الصفحة السابقة"}
          >
            <PrevIcon className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{isEn ? "Previous" : "السابق"}</span>
          </Button>

          {/* مؤشر الصفحة الحالية من إجمالي الصفحات */}
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-md bg-background border border-border/70 shadow-2xs text-xs font-medium">
            <span className="text-muted-foreground">{isEn ? "Page" : "صفحة"}</span>
            <span className="font-bold text-primary font-mono text-sm">{page}</span>
            <span className="text-muted-foreground">{isEn ? "of" : "من"}</span>
            <span className="font-semibold text-foreground font-mono">{totalPages}</span>
          </div>

          {/* زر الصفحة التالية */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 px-3 gap-1.5 text-xs font-medium hover:bg-muted shrink-0 transition-colors shadow-2xs"
            onClick={() => onPageChange(Math.min(totalPages, page + 1))}
            disabled={page >= totalPages}
            title={isEn ? "Next page" : "الصفحة التالية"}
          >
            <span className="hidden sm:inline">{isEn ? "Next" : "التالي"}</span>
            <NextIcon className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}

      {/* 3. حقل إدخال رقم الصفحة المباشر (Go to Page Input) */}
      {totalPages > 1 && showGoToPage && (
        <form
          onSubmit={handleJumpSubmit}
          className="flex items-center gap-1.5 text-xs text-muted-foreground shrink-0"
        >
          <span className="text-[11px] font-medium whitespace-nowrap">
            {isEn ? "Go to:" : "الانتقال إلى:"}
          </span>
          <Input
            type="number"
            min={1}
            max={totalPages}
            value={jumpInput}
            onChange={(e) => setJumpInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                handleJumpSubmit(e);
              }
            }}
            placeholder={String(page)}
            className="h-8 w-14 px-1.5 text-center text-xs font-mono font-bold bg-background shadow-2xs focus-visible:ring-1"
            aria-label={isEn ? "Go to page number" : "الانتقال إلى رقم الصفحة"}
          />
          <Button
            type="submit"
            variant="outline"
            size="sm"
            className="h-8 px-2.5 text-xs font-medium hover:bg-muted shrink-0 transition-colors"
            disabled={
              !jumpInput.trim() ||
              parseInt(jumpInput, 10) === page ||
              parseInt(jumpInput, 10) < 1 ||
              parseInt(jumpInput, 10) > totalPages
            }
          >
            {isEn ? "Go" : "انتقال"}
          </Button>
        </form>
      )}
    </div>
  );
}
