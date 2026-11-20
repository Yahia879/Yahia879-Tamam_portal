import DashboardLayout from "@/components/DashboardLayout";
import { ArrowRight } from "lucide-react";
import { Link, useSearch } from "wouter";
import { Button } from "@/components/ui/button";
import { DynamicServiceRequestForm } from "./DynamicServiceRequestForm";

export default function MosqueServiceRequest() {
  const searchString = useSearch();
  const params = new URLSearchParams(searchString);
  const serviceParam = params.get("service") || params.get("program");
  const isSedana = serviceParam === "sedana";

  return (
    <DashboardLayout tabletNavigation>
      <div className="min-w-0 space-y-4 sm:space-y-6 max-w-full overflow-x-hidden">
        {/* العنوان */}
        <div
          className={`flex items-center gap-2.5 sm:gap-4 ${
            isSedana ? "max-w-6xl xl:max-w-7xl" : "max-w-4xl"
          } mx-auto px-0 sm:px-4 print:hidden`}
        >
          <Link href="/requests">
            <Button
              variant="ghost"
              size="icon"
              type="button"
              className="shrink-0 size-11 lg:size-9 pointer-coarse:size-11"
              aria-label="العودة للطلبات"
            >
              <ArrowRight className="w-5 h-5" />
            </Button>
          </Link>
          <div className="min-w-0 flex-1">
            <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-foreground truncate">
              {isSedana ? "طلبات خدمات التشغيل (سدانة)" : "طلبات خدمات المساجد"}
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground break-words">
              {isSedana
                ? "تقديم طلب خدمة التشغيل والرعاية السنوية للمسجد"
                : "قدم طلبك للاستفادة من خدمات جمعية عمارة المساجد"}
            </p>
          </div>
        </div>

        {/* النموذج الديناميكي الموحد */}
        <DynamicServiceRequestForm showLayout={false} />
      </div>
    </DashboardLayout>
  );
}
