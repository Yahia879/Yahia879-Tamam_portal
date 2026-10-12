import * as React from "react";
import { useState, useMemo, useRef, useEffect } from "react";
import { Check, ChevronsUpDown, Search, Building2, X, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";

export interface MosqueOption {
  id: number | string;
  name: string;
  city?: string | null;
  district?: string | null;
  approvalStatus?: string | null;
  capacity?: number | null;
  area?: number | string | null;
  [key: string]: any;
}

export interface MosqueSearchSelectProps {
  mosques?: MosqueOption[];
  value?: string | number | null;
  onValueChange: (value: number) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  triggerClassName?: string;
  id?: string;
  allowClear?: boolean;
  error?: string;
}

// دالة تطبيع الحروف العربية لتوفير بحث مرن وفوري
export function normalizeArabic(text: string | null | undefined): string {
  if (!text) return "";
  return text
    .toString()
    .replace(/[\u064B-\u065F\u0670]/g, "") // إزالة حركات التشكيل والتنوين
    .replace(/[أإآء]/g, "ا") // توحيد الهمزات
    .replace(/ة/g, "ه") // توحيد التاء المربوطة
    .replace(/[ىي]/g, "ي") // توحيد الألف المقصورة والياء
    .replace(/ـ/g, "") // إزالة التطويل والكشيدة
    .toLowerCase()
    .trim();
}

export function MosqueSearchSelect({
  mosques = [],
  value,
  onValueChange,
  placeholder = "ابحث واختر المسجد...",
  disabled = false,
  className,
  triggerClassName,
  id,
  allowClear = false,
  error,
}: MosqueSearchSelectProps) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);

  // العثور على المسجد المختار حالياً
  const selectedMosque = useMemo(() => {
    if (!value || value === "0" || value === 0) return null;
    return mosques.find((m) => m.id.toString() === value.toString()) || null;
  }, [mosques, value]);

  // تصفية المساجد بالبحث الذكي (الاسم، المدينة، الحي)
  const filteredMosques = useMemo(() => {
    if (!searchQuery.trim()) return mosques;

    const queryWords = normalizeArabic(searchQuery).split(/\s+/).filter(Boolean);
    if (!queryWords.length) return mosques;

    return mosques.filter((mosque) => {
      const mName = mosque.name || "";
      const mCity = mosque.city || "";
      const mDistrict = mosque.district || "";

      const combinedText = normalizeArabic(`${mName} ${mCity} ${mDistrict}`);
      return queryWords.every((word) => combinedText.includes(word));
    });
  }, [mosques, searchQuery]);

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

  const handleSelect = (mosqueId: string | number) => {
    onValueChange(parseInt(mosqueId.toString(), 10));
    setOpen(false);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onValueChange(0);
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
              "w-full h-11 px-3 py-2 text-right justify-between font-normal bg-background border-border/80 rounded-xl hover:bg-accent/40 focus:ring-2 focus:ring-primary/20 transition-all",
              error && "border-red-500",
              !selectedMosque && "text-muted-foreground",
              triggerClassName
            )}
          >
            <div className="flex items-center gap-2 overflow-hidden flex-1 text-right min-w-0">
              {selectedMosque ? (
                <div className="flex items-center gap-2 truncate max-w-full">
                  <div className="w-6 h-6 rounded-md bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    <Building2 className="h-3.5 w-3.5" />
                  </div>
                  <span className="font-bold text-foreground text-xs sm:text-sm truncate">
                    {selectedMosque.name}
                  </span>
                  {selectedMosque.city && (
                    <span className="text-[11px] text-muted-foreground font-normal shrink-0">
                      ({selectedMosque.city})
                    </span>
                  )}
                  {selectedMosque.approvalStatus === "approved" && (
                    <span className="text-[10px] bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 font-semibold px-2 py-0.5 rounded-md shrink-0">
                      معتمد
                    </span>
                  )}
                  {selectedMosque.approvalStatus === "pending" && (
                    <span className="text-[10px] bg-amber-500/15 text-amber-700 dark:text-amber-300 font-semibold px-2 py-0.5 rounded-md shrink-0">
                      قيد المراجعة
                    </span>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-2 text-muted-foreground text-xs sm:text-sm">
                  <Building2 className="h-4 w-4 text-muted-foreground/60 shrink-0" />
                  <span className="truncate">{placeholder}</span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-1 shrink-0 mr-2">
              {allowClear && selectedMosque && !disabled && (
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
                placeholder="بحث باسم المسجد، المدينة، أو الحي..."
                className="w-full h-10 pr-9 pl-8 text-xs sm:text-sm bg-background border border-input focus:border-primary focus:ring-2 focus:ring-primary/20 rounded-lg outline-none transition-all placeholder:text-muted-foreground/70"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute left-2 p-1 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* شريط الإحصائية السريع */}
          <div className="px-3 py-1.5 bg-muted/40 border-b border-border/40 text-[11px] text-muted-foreground flex items-center justify-between font-medium">
            <span>المساجد المتاحة: {filteredMosques.length}</span>
            {searchQuery && (
              <span className="text-primary font-bold">تصفية نشطة</span>
            )}
          </div>

          {/* قائمة المساجد */}
          <div className="max-h-[280px] sm:max-h-[320px] overflow-y-auto p-1.5 space-y-1">
            {filteredMosques.length === 0 ? (
              <div className="py-7 text-center px-4">
                <Building2 className="h-8 w-8 mx-auto text-muted-foreground/40 mb-2" />
                <p className="text-xs sm:text-sm font-semibold text-foreground">
                  لم يتم العثور على أي مسجد مطابق
                </p>
                <p className="text-[11px] text-muted-foreground mt-1">
                  جرب البحث بكلمات أخرى أو تحقق من كتابة الاسم
                </p>
              </div>
            ) : (
              filteredMosques.map((mosque) => {
                const isSelected = selectedMosque?.id.toString() === mosque.id.toString();
                return (
                  <div
                    key={mosque.id}
                    onClick={() => handleSelect(mosque.id)}
                    className={cn(
                      "flex items-center justify-between p-2.5 rounded-lg cursor-pointer transition-all text-right border",
                      isSelected
                        ? "bg-primary/10 border-primary/30 text-primary font-semibold"
                        : "border-transparent hover:bg-muted/70 hover:border-border/50 text-foreground"
                    )}
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1 pl-2">
                      <div className={cn(
                        "w-7 h-7 rounded-md flex items-center justify-center shrink-0",
                        isSelected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                      )}>
                        <Building2 className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-xs sm:text-sm font-bold leading-snug truncate">
                            {mosque.name}
                          </span>
                          {mosque.city && (
                            <span className="text-[11px] text-muted-foreground font-normal shrink-0">
                              ({mosque.city})
                            </span>
                          )}
                        </div>
                        {mosque.district && (
                          <div className="flex items-center gap-1 text-[10px] text-muted-foreground mt-0.5">
                            <MapPin className="h-3 w-3 shrink-0 opacity-70" />
                            <span className="truncate">{mosque.district}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 mr-auto">
                      {mosque.approvalStatus === "approved" ? (
                        <span className="text-[10px] bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 font-semibold px-2 py-0.5 rounded-md">
                          معتمد
                        </span>
                      ) : mosque.approvalStatus === "pending" ? (
                        <span className="text-[10px] bg-amber-500/15 text-amber-700 dark:text-amber-300 font-semibold px-2 py-0.5 rounded-md">
                          قيد المراجعة
                        </span>
                      ) : mosque.approvalStatus === "rejected" ? (
                        <span className="text-[10px] bg-red-500/15 text-red-700 dark:text-red-300 font-semibold px-2 py-0.5 rounded-md">
                          مرفوض
                        </span>
                      ) : null}

                      {isSelected && (
                        <div className="p-1 bg-primary text-primary-foreground rounded-full shrink-0 mr-1">
                          <Check className="h-3.5 w-3.5" />
                        </div>
                      )}
                    </div>
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
