import * as React from "react";
import { useState, useMemo, useRef, useEffect } from "react";
import { Check, ChevronsUpDown, Search, Building2, MapPin, X, Loader2, FolderKanban } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";

export interface ProjectItem {
  id: number | string;
  name: string;
  projectNumber?: string | null;
  description?: string | null;
  mosqueName?: string | null;
  city?: string | null;
  district?: string | null;
  status?: string | null;
  budget?: string | number | null;
  [key: string]: any;
}

export interface ProjectSearchSelectProps {
  projects?: ProjectItem[];
  value?: string | number | null;
  onValueChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  triggerClassName?: string;
  id?: string;
  allowClear?: boolean;
  isLoading?: boolean;
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

export function ProjectSearchSelect({
  projects: passedProjects,
  value,
  onValueChange,
  placeholder = "ابحث واختر المشروع...",
  disabled = false,
  className,
  triggerClassName,
  id,
  allowClear = false,
  isLoading: isExternalLoading = false,
}: ProjectSearchSelectProps) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);

  // جلب المشاريع تلقائياً في حال لم يتم تمريرها كمصفوفة
  const shouldFetch = !passedProjects;
  const { data: fetchedProjects, isLoading: isQueryLoading } = trpc.projects.getAll.useQuery(
    {},
    { enabled: shouldFetch }
  );

  const projectsList: ProjectItem[] = useMemo(() => {
    if (passedProjects && Array.isArray(passedProjects)) {
      return passedProjects;
    }
    if (fetchedProjects && Array.isArray(fetchedProjects)) {
      return fetchedProjects;
    }
    return [];
  }, [passedProjects, fetchedProjects]);

  const isLoading = isExternalLoading || (shouldFetch && isQueryLoading);

  // العثور على المشروع المختار حالياً
  const selectedProject = useMemo(() => {
    if (!value || value === "0" || value === 0) return null;
    return projectsList.find((p) => p.id.toString() === value.toString()) || null;
  }, [projectsList, value]);

  // تصفية المشاريع بالبحث الذكي
  const filteredProjects = useMemo(() => {
    if (!searchQuery.trim()) return projectsList;

    const queryWords = normalizeArabic(searchQuery).split(/\s+/).filter(Boolean);
    if (!queryWords.length) return projectsList;

    return projectsList.filter((project) => {
      const pNumber = project.projectNumber || "";
      const pName = project.name || "";
      const pMosque = project.mosqueName || "";
      const pCity = project.city || "";
      const pDistrict = project.district || "";
      const pDesc = project.description || "";

      // نص البحث الموحد للمشروع
      const combinedText = normalizeArabic(
        `${pNumber} ${pName} ${pMosque} ${pCity} ${pDistrict} ${pDesc}`
      );

      // التأكد من وجود كل كلمة من كلمات البحث
      return queryWords.every((word) => combinedText.includes(word));
    });
  }, [projectsList, searchQuery]);

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

  const handleSelect = (projectId: string | number) => {
    onValueChange(projectId.toString());
    setOpen(false);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onValueChange("");
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
            disabled={disabled || isLoading}
            className={cn(
              "w-full h-11 px-3 py-2 text-right justify-between font-normal bg-background border-input rounded-xl hover:bg-accent/50 focus:ring-2 focus:ring-primary/20 transition-all",
              !selectedProject && "text-muted-foreground",
              triggerClassName
            )}
          >
            <div className="flex items-center gap-2 overflow-hidden flex-1 text-right min-w-0">
              {isLoading ? (
                <div className="flex items-center gap-2 text-muted-foreground text-xs">
                  <Loader2 className="h-4 w-4 animate-spin text-primary shrink-0" />
                  <span>جاري تحميل المشاريع...</span>
                </div>
              ) : selectedProject ? (
                <div className="flex items-center gap-2 truncate max-w-full">
                  {selectedProject.projectNumber && (
                    <Badge
                      variant="secondary"
                      className="bg-primary/10 text-primary border-primary/20 text-[11px] font-mono font-bold px-2 py-0.5 rounded-md shrink-0"
                    >
                      {selectedProject.projectNumber}
                    </Badge>
                  )}
                  <span className="font-semibold text-foreground text-xs sm:text-sm truncate">
                    {selectedProject.name}
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-muted-foreground text-xs sm:text-sm">
                  <FolderKanban className="h-4 w-4 text-muted-foreground/60 shrink-0" />
                  <span className="truncate">{placeholder}</span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-1 shrink-0 mr-2">
              {allowClear && selectedProject && !disabled && (
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
                placeholder="بحث برقم المشروع أو الاسم..."
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
            <span>المشاريع المتاحة: {filteredProjects.length}</span>
            {searchQuery && (
              <span className="text-primary font-bold">تصفية نشطة</span>
            )}
          </div>

          {/* قائمة المشاريع */}
          <div className="max-h-[300px] sm:max-h-[340px] overflow-y-auto p-1.5 space-y-1">
            {filteredProjects.length === 0 ? (
              <div className="py-8 text-center px-4">
                <Building2 className="h-8 w-8 mx-auto text-muted-foreground/40 mb-2" />
                <p className="text-xs sm:text-sm font-semibold text-foreground">
                  لم يتم العثور على أي مشروع مطابق
                </p>
                <p className="text-[11px] text-muted-foreground mt-1">
                  جرب البحث برقم أو اسم مختلف
                </p>
              </div>
            ) : (
              filteredProjects.map((project) => {
                const isSelected = selectedProject?.id.toString() === project.id.toString();
                return (
                  <div
                    key={project.id}
                    onClick={() => handleSelect(project.id)}
                    className={cn(
                      "flex items-center justify-between p-2.5 rounded-lg cursor-pointer transition-all text-right border",
                      isSelected
                        ? "bg-primary/10 border-primary/30 text-primary font-semibold"
                        : "border-transparent hover:bg-muted/70 hover:border-border/50 text-foreground"
                    )}
                  >
                    <div className="flex items-center gap-2 flex-wrap min-w-0 flex-1 pl-2">
                      {project.projectNumber && (
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-[10px] font-mono px-1.5 py-0 rounded shrink-0",
                            isSelected
                              ? "bg-primary text-primary-foreground border-primary"
                              : "bg-muted text-muted-foreground border-border"
                          )}
                        >
                          {project.projectNumber}
                        </Badge>
                      )}
                      <span className="text-xs sm:text-sm font-bold leading-snug truncate">
                        {project.name}
                      </span>
                    </div>

                    {isSelected && (
                      <div className="p-1 bg-primary text-primary-foreground rounded-full shrink-0 mr-2 mt-0.5">
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
