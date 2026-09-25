import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
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
 * دالة مساعدة لحساب توزيع أرقام الصفحات مع علامات الاختصار (...)
 * smart pagination range with ellipsis
 */
function getPaginationRange(
  currentPage: number,
  totalPages: number,
  siblingCount = 1
): (number | string)[] {
  const totalPageNumbers = siblingCount * 2 + 5;

  if (totalPages <= totalPageNumbers) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  const leftSiblingIndex = Math.max(currentPage - siblingCount, 1);
  const rightSiblingIndex = Math.min(currentPage + siblingCount, totalPages);

  const shouldShowLeftDots = leftSiblingIndex > 2;
  const shouldShowRightDots = rightSiblingIndex < totalPages - 2;

  const firstPageIndex = 1;
  const lastPageIndex = totalPages;

  // الحالة 1: لا توجد نقاط يسار، ولكن توجد نقاط يمين (1 2 3 4 5 ... 14)
  if (!shouldShowLeftDots && shouldShowRightDots) {
    const leftItemCount = 3 + 2 * siblingCount;
    const leftRange = Array.from({ length: leftItemCount }, (_, i) => i + 1);
    return [...leftRange, "...", totalPages];
  }

  // الحالة 2: توجد نقاط يسار، ولكن لا توجد نقاط يمين (1 ... 10 11 12 13 14)
  if (shouldShowLeftDots && !shouldShowRightDots) {
    const rightItemCount = 3 + 2 * siblingCount;
    const rightRange = Array.from(
      { length: rightItemCount },
      (_, i) => totalPages - rightItemCount + i + 1
    );
    return [firstPageIndex, "...", ...rightRange];
  }

  // الحالة 3: نقاط في كلا الجانبين (1 ... 4 5 6 ... 14)
  if (shouldShowLeftDots && shouldShowRightDots) {
    const middleRange = Array.from(
      { length: rightSiblingIndex - leftSiblingIndex + 1 },
      (_, i) => leftSiblingIndex + i
    );
    return [firstPageIndex, "...", ...middleRange, "...", lastPageIndex];
  }

  return Array.from({ length: totalPages }, (_, i) => i + 1);
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
 * مكوّن الترقيم الشامل والمحسن لجميع جداول النظام
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
  siblingCount = 1,
}: EnhancedPaginationProps) {
  const page = propPage ?? propCurrentPage ?? 1;
  const [jumpInput, setJumpInput] = useState<string>("");

  // في اتجاه RTL العربي:
  // البداية (صفحة 1) على اليمين => ChevronsRight
  // السابق على اليمين => ChevronRight
  // التالي على اليسار => ChevronLeft
  // النهاية (آخر صفحة) على اليسار => ChevronsLeft
  const FirstIcon = isEn ? ChevronsLeft : ChevronsRight;
  const PrevIcon = isEn ? ChevronLeft : ChevronRight;
  const NextIcon = isEn ? ChevronRight : ChevronLeft;
  const LastIcon = isEn ? ChevronsRight : ChevronsLeft;

  // التحقق من صلاحية الصفحة الحالية نسبة لعدد الصفحات
  useEffect(() => {
    if (totalPages > 0 && page > totalPages) {
      onPageChange(totalPages);
    }
  }, [page, totalPages, onPageChange]);

  const paginationRange = useMemo(() => {
    return getPaginationRange(page, totalPages, siblingCount);
  }, [page, totalPages, siblingCount]);

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
        "px-4 py-3 bg-muted/20 border-t flex flex-col md:flex-row items-center justify-between gap-3 text-xs",
        className
      )}
      dir={isEn ? "ltr" : "rtl"}
    >
      {/* 1. نص عدد العناصر الحالي */}
      <div className="text-[11px] md:text-xs text-muted-foreground font-medium text-center md:text-right whitespace-nowrap">
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

      {/* 2. أزرار التنقل الذكية وأزرار البداية/النهاية */}
      {totalPages > 1 && (
        <div className="flex flex-wrap items-center justify-center gap-1.5 max-w-full">
          {/* زر الانتقال المباشر للبداية (<<) */}
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-8 w-8 shrink-0 hover:bg-muted"
            onClick={() => onPageChange(1)}
            disabled={page === 1}
            title={isEn ? "First page" : "الصفحة الأولى"}
          >
            <FirstIcon className="h-4 w-4" />
          </Button>

          {/* زر الصفحة السابقة (<) */}
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-8 w-8 shrink-0 hover:bg-muted"
            onClick={() => onPageChange(Math.max(1, page - 1))}
            disabled={page === 1}
            title={isEn ? "Previous page" : "الصفحة السابقة"}
          >
            <PrevIcon className="h-4 w-4" />
          </Button>

          {/* أرقام الصفحات مع الاختصار الذكي */}
          <div className="flex items-center gap-1">
            {paginationRange.map((item, idx) => {
              if (item === "...") {
                const isLeftDots = idx === 1;
                const jumpTarget = isLeftDots
                  ? Math.max(1, page - 5)
                  : Math.min(totalPages, page + 5);

                return (
                  <Button
                    key={`ellipsis-${idx}`}
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 px-0 text-xs text-muted-foreground hover:text-foreground hover:bg-muted font-mono tracking-widest group"
                    onClick={() => onPageChange(jumpTarget)}
                    title={
                      isEn
                        ? `Jump 5 pages to page ${jumpTarget}`
                        : `تخطي 5 صفحات إلى صفحة ${jumpTarget}`
                    }
                  >
                    <span className="group-hover:hidden">...</span>
                    <span className="hidden group-hover:inline text-[10px] font-bold text-primary">
                      {isLeftDots ? (isEn ? "-5" : "5-") : (isEn ? "+5" : "5+")}
                    </span>
                  </Button>
                );
              }

              const pageNum = item as number;
              const isActive = pageNum === page;

              return (
                <Button
                  key={pageNum}
                  type="button"
                  variant={isActive ? "default" : "outline"}
                  size="sm"
                  className={cn(
                    "h-8 min-w-[32px] px-2 text-xs font-mono font-medium shrink-0 transition-all",
                    isActive
                      ? "gradient-primary text-white font-bold shadow-xs border-0 hover:opacity-95"
                      : "hover:bg-muted"
                  )}
                  onClick={() => onPageChange(pageNum)}
                >
                  {pageNum}
                </Button>
              );
            })}
          </div>

          {/* زر الصفحة التالية (>) */}
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-8 w-8 shrink-0 hover:bg-muted"
            onClick={() => onPageChange(Math.min(totalPages, page + 1))}
            disabled={page === totalPages}
            title={isEn ? "Next page" : "الصفحة التالية"}
          >
            <NextIcon className="h-4 w-4" />
          </Button>

          {/* زر الانتقال المباشر للنهاية (>>) */}
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-8 w-8 shrink-0 hover:bg-muted"
            onClick={() => onPageChange(totalPages)}
            disabled={page === totalPages}
            title={isEn ? "Last page" : "الصفحة الأخيرة"}
          >
            <LastIcon className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* 3. حقل إدخال رقم الصفحة المباشر (Go to Page Input) */}
      {totalPages > 2 && showGoToPage && (
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
            className="h-8 w-14 px-1.5 text-center text-xs font-mono font-bold bg-background shadow-xs focus-visible:ring-1"
            aria-label={isEn ? "Go to page number" : "الانتقال إلى رقم الصفحة"}
          />
          <Button
            type="submit"
            variant="outline"
            size="sm"
            className="h-8 px-2.5 text-xs font-medium hover:bg-muted shrink-0"
            disabled={!jumpInput.trim() || parseInt(jumpInput, 10) === page}
          >
            {isEn ? "Go" : "انتقال"}
          </Button>
          <span className="text-[11px] text-muted-foreground font-mono whitespace-nowrap">
            {isEn ? `of ${totalPages}` : `من ${totalPages}`}
          </span>
        </form>
      )}
    </div>
  );
}
