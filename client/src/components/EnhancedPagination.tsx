import React, { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  ChevronLeft,
  ChevronRight,
  ChevronDown,
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
 * مكوّن الترقيم الشامل والمحسن لجميع جداول النظام:
 * نمط الكبسولة الذكية العائمة مع نافذة التنقل السريع (Smart Popover Capsule)
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
}: EnhancedPaginationProps) {
  const page = propPage ?? propCurrentPage ?? 1;
  const [isOpen, setIsOpen] = useState(false);
  const [jumpInput, setJumpInput] = useState("");

  // مزامنة حقل الإدخال مع الصفحة الحالية
  useEffect(() => {
    setJumpInput(String(page));
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

  const handleJumpSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const parsed = parseInt(jumpInput.trim(), 10);
    if (isNaN(parsed)) return;
    const target = Math.max(1, Math.min(parsed, totalPages));
    if (target !== page) {
      onPageChange(target);
    }
    setIsOpen(false);
  };

  if (totalPages <= 0 && (!totalItems || totalItems <= 0)) {
    return null;
  }

  const startItem = totalItems && totalItems > 0 ? (page - 1) * itemsPerPage + 1 : 0;
  const endItem = totalItems && totalItems > 0 ? Math.min(page * itemsPerPage, totalItems) : 0;

  return (
    <div
      className={cn(
        "py-3.5 px-4 bg-muted/15 border-t flex flex-col items-center justify-center gap-2 select-none",
        className
      )}
      dir={isEn ? "ltr" : "rtl"}
    >
      {/* 1. الكبسولة العائمة الذكية في المنتصف (Floating Smart Capsule) */}
      {totalPages > 1 && (
        <div className="inline-flex items-center gap-1.5 p-1 rounded-full bg-background/95 backdrop-blur-md border border-border/80 shadow-xs transition-shadow hover:shadow-sm">
          {/* زر السابق */}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className={cn(
              "h-8 px-3 gap-1 text-xs font-medium rounded-full transition-all active:scale-95",
              page <= 1 ? "opacity-35 cursor-not-allowed" : "hover:bg-muted text-foreground"
            )}
            onClick={() => onPageChange(Math.max(1, page - 1))}
            disabled={page <= 1}
            title={isEn ? "Previous page" : "الصفحة السابقة"}
          >
            <PrevIcon className="h-4 w-4" />
            <span className="font-normal">{isEn ? "Previous" : "السابق"}</span>
          </Button>

          {/* زر النافذة المنبثقة لاختيار الصفحة */}
          <Popover open={isOpen} onOpenChange={setIsOpen}>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className={cn(
                  "h-8 px-3.5 gap-2 text-xs font-medium rounded-full border-border/70 hover:border-primary/50 hover:bg-muted/40 transition-all shadow-2xs group",
                  isOpen && "border-primary ring-2 ring-primary/20 bg-muted/40"
                )}
                title={isEn ? "Click for fast jump" : "انقر للانتقال السريع للصفحات"}
              >
                <span className="text-muted-foreground font-normal">{isEn ? "Page" : "صفحة"}</span>
                <span className="font-bold text-primary font-mono text-sm px-0.5">{page}</span>
                <span className="text-muted-foreground font-normal">{isEn ? "of" : "من"}</span>
                <span className="font-semibold text-foreground font-mono">{totalPages}</span>
                <ChevronDown
                  className={cn(
                    "h-3.5 w-3.5 text-muted-foreground transition-transform duration-200 group-hover:text-foreground",
                    isOpen && "rotate-180 text-primary"
                  )}
                />
              </Button>
            </PopoverTrigger>

            <PopoverContent
              align="center"
              side="top"
              sideOffset={10}
              className="w-56 p-3 rounded-2xl shadow-xl border bg-background/98 backdrop-blur-md space-y-2 z-50 animate-in fade-in zoom-in-95 duration-150"
              dir={isEn ? "ltr" : "rtl"}
            >
              <div className="text-[11px] font-medium text-muted-foreground text-center">
                {isEn ? `Go to page (1 - ${totalPages}):` : `الانتقال لصفحة (1 - ${totalPages}):`}
              </div>

              <form onSubmit={handleJumpSubmit} className="flex items-center gap-1.5">
                <Input
                  type="number"
                  min={1}
                  max={totalPages}
                  value={jumpInput}
                  onChange={(e) => setJumpInput(e.target.value)}
                  onFocus={(e) => e.target.select()}
                  placeholder={String(page)}
                  className="h-8 text-center text-xs font-mono font-bold bg-muted/40 focus-visible:ring-1 focus-visible:ring-primary rounded-lg"
                  autoFocus
                />
                <Button
                  type="submit"
                  size="sm"
                  className="h-8 px-3 text-xs gradient-primary text-white shrink-0 hover:opacity-90 rounded-lg font-medium shadow-2xs cursor-pointer"
                  disabled={!jumpInput.trim() || parseInt(jumpInput, 10) === page}
                >
                  {isEn ? "Go" : "انتقال"}
                </Button>
              </form>
            </PopoverContent>
          </Popover>

          {/* زر التالي */}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className={cn(
              "h-8 px-3 gap-1 text-xs font-medium rounded-full transition-all active:scale-95",
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

      {/* 2. ملخص عدد العناصر المعروضة في المنتصف أسفل الكبسولة بتناسق تام */}
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
