import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { 
  FileText, 
  Clock, 
  Calendar, 
  BarChart3, 
  MapPin, 
  Printer,
  Save,
  ArrowRight,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ReportHeaderTabsProps {
  title?: string;
  subtitle?: string;
  activeTab: "hub" | "semi-monthly" | "monthly" | "quarterly" | "visit";
  ragStatus?: "green" | "yellow" | "red";
  reportStatus?: string;
  onSaveDraft?: () => void;
  onSubmitReport?: () => void;
  onPrintPreview?: () => void;
  isSubmitting?: boolean;
  onStatusChange?: (newStatus: string) => void;
}

export function ReportHeaderTabs({
  activeTab,
  reportStatus,
  onSaveDraft,
  onPrintPreview,
  isSubmitting = false,
  onStatusChange,
}: ReportHeaderTabsProps) {
  const [, setLocation] = useLocation();

  const isApproved = reportStatus === "معتمد";

  return (
    <div className="mb-6 space-y-3">
      {/* Top Bar with Navigation Tabs and Action Buttons */}
      <div className="bg-card p-2 rounded-2xl border border-border/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Report Tabs Navigation */}
        <div className="flex items-center gap-1.5 overflow-x-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              if (window.history.length > 1) {
                window.history.back();
              } else {
                setLocation("/project-reports");
              }
            }}
            className="h-9 text-xs font-bold gap-1.5 shrink-0 rounded-xl border-border/80 hover:bg-muted text-foreground"
          >
            <ArrowRight className="w-4 h-4" />
            <span>عودة</span>
          </Button>

          <Button
            variant={activeTab === "hub" ? "default" : "ghost"}
            size="sm"
            onClick={() => setLocation("/project-reports")}
            className={`h-9 text-xs gap-2 shrink-0 rounded-xl ${
              activeTab === "hub" ? "bg-primary text-primary-foreground font-bold shadow-xs" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            نظرة عامة
          </Button>

          <Button
            variant={activeTab === "semi-monthly" ? "default" : "ghost"}
            size="sm"
            onClick={() => setLocation("/project-reports/semi-monthly")}
            className={`h-9 text-xs gap-2 shrink-0 rounded-xl ${
              activeTab === "semi-monthly" ? "bg-teal-600 text-white font-bold shadow-xs" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            تقرير نصف شهري
          </Button>

          <Button
            variant={activeTab === "monthly" ? "default" : "ghost"}
            size="sm"
            onClick={() => setLocation("/project-reports/monthly")}
            className={`h-9 text-xs gap-2 shrink-0 rounded-xl ${
              activeTab === "monthly" ? "bg-teal-600 text-white font-bold shadow-xs" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            تقرير شهري
          </Button>

          <Button
            variant={activeTab === "quarterly" ? "default" : "ghost"}
            size="sm"
            onClick={() => setLocation("/project-reports/quarterly")}
            className={`h-9 text-xs gap-2 shrink-0 rounded-xl ${
              activeTab === "quarterly" ? "bg-teal-600 text-white font-bold shadow-xs" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            تقرير ربعي
          </Button>

          <Button
            variant={activeTab === "visit" ? "default" : "ghost"}
            size="sm"
            onClick={() => setLocation("/project-reports/visit")}
            className={`h-9 text-xs gap-2 shrink-0 rounded-xl ${
              activeTab === "visit" ? "bg-teal-600 text-white font-bold shadow-xs" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <MapPin className="w-3.5 h-3.5" />
            تقرير زيارة
          </Button>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 shrink-0 justify-end">
          {reportStatus && onStatusChange && (
            <div className="flex items-center gap-1.5 ml-2">
              <span className="text-[11px] font-bold text-muted-foreground whitespace-nowrap">حالة التقرير:</span>
              <Select value={reportStatus} onValueChange={onStatusChange}>
                <SelectTrigger className="h-9 border-border/80 w-32 text-xs font-semibold bg-background">
                  <SelectValue placeholder="حالة التقرير" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="مسودة" className="text-xs font-semibold">مسودة</SelectItem>
                  <SelectItem value="تم الاطلاع" className="text-xs font-semibold text-teal-600">تم الاطلاع</SelectItem>
                  <SelectItem value="معتمد" className="text-xs font-semibold text-emerald-600">معتمد</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {onPrintPreview && isApproved && (
            <Button
              variant="outline"
              size="sm"
              onClick={onPrintPreview}
              className="gap-1.5 h-9 text-xs font-medium border-border/80"
            >
              <Printer className="w-3.5 h-3.5 text-muted-foreground" />
              معاينة وطباعة
            </Button>
          )}

          {onSaveDraft && !isApproved && (
            <Button
              variant="default"
              size="sm"
              onClick={onSaveDraft}
              disabled={isSubmitting}
              className="gap-1.5 h-9 text-xs font-semibold bg-teal-600 hover:bg-teal-700 text-white shadow-xs"
            >
              <Save className="w-3.5 h-3.5 text-white" />
              حفظ كمسودة
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
