import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Printer, X, Download, FileText, CheckCircle2, AlertTriangle, XCircle, Building2, User, Calendar, Tag } from "lucide-react";

interface ReportPrintPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  reportType: "semi-monthly" | "monthly" | "quarterly" | "visit";
  reportTitle: string;
  data: Record<string, any>;
}

export function ReportPrintPreviewModal({
  isOpen,
  onClose,
  reportType,
  reportTitle,
  data,
}: ReportPrintPreviewModalProps) {
  const handlePrint = () => {
    window.print();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-0 rounded-2xl border-border">
        <DialogHeader className="p-4 border-b border-border flex flex-row items-center justify-between bg-muted/30">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-teal-600" />
            <DialogTitle className="text-base font-bold text-foreground">
              معاينة وطباعة {reportTitle}
            </DialogTitle>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={handlePrint} className="gap-1.5 bg-teal-600 hover:bg-teal-700 text-white h-8 text-xs">
              <Printer className="w-3.5 h-3.5" />
              طباعة
            </Button>
          </div>
        </DialogHeader>

        {/* Printable Area */}
        <div className="p-6 md:p-8 space-y-6 bg-background dir-rtl font-sans print:p-0">
          {/* Header */}
          <div className="border-b-2 border-primary/20 pb-4 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-teal-600" />
                <h1 className="text-xl font-black text-foreground">{reportTitle}</h1>
              </div>
              <p className="text-xs text-muted-foreground mt-1">بوابة تمام لتطوير وعناية المساجد — إدارة المشاريع والهندسة</p>
            </div>
            <div className="text-left text-xs space-y-1">
              <div><span className="text-muted-foreground">تاريخ التقرير: </span><span className="font-bold">{data.reportDate || "اليوم"}</span></div>
              <div><span className="text-muted-foreground">حالة التقرير: </span><Badge variant="outline" className="font-bold text-teal-600">{data.status || "مسودة"}</Badge></div>
            </div>
          </div>

          {/* Key Info Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-4 rounded-xl bg-muted/40 border border-border/60 text-xs">
            <div>
              <div className="text-muted-foreground font-medium mb-1">اسم المشروع:</div>
              <div className="font-bold text-foreground">{data.projectName || "غير محدد"}</div>
            </div>
            <div>
              <div className="text-muted-foreground font-medium mb-1">مدير المشروع:</div>
              <div className="font-bold text-foreground">{data.projectManager || "غير محدد"}</div>
            </div>
            <div>
              <div className="text-muted-foreground font-medium mb-1">الإدارة المالكة:</div>
              <div className="font-bold text-foreground">{data.ownerDepartment || "غير محدد"}</div>
            </div>
            <div>
              <div className="text-muted-foreground font-medium mb-1">
                {reportType === "semi-monthly" ? "فترة التقرير:" : reportType === "monthly" ? "الشهر/السنة:" : reportType === "quarterly" ? "الربع/السنة:" : "تاريخ الزيارة:"}
              </div>
              <div className="font-bold text-foreground">
                {reportType === "semi-monthly"
                  ? `${data.periodFrom || "—"} إلى ${data.periodTo || "—"}`
                  : reportType === "monthly"
                  ? data.monthYear || "—"
                  : reportType === "quarterly"
                  ? `${data.quarter || "Q1"} / ${data.year || "2026"}`
                  : data.visitDate || "—"}
              </div>
            </div>
          </div>

          {/* Details Sections */}
          <div className="space-y-4 text-xs">
            {data.plannedProgress !== undefined && (
              <div className="border border-border/80 rounded-xl p-4 bg-card space-y-3">
                <h3 className="font-bold text-sm border-b pb-2 text-foreground">حالة التقدم والأداء</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <span className="text-muted-foreground">نسبة الإنجاز المخطط: </span>
                    <span className="font-bold text-base text-foreground">{data.plannedProgress}%</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">نسبة الإنجاز الفعلي: </span>
                    <span className="font-bold text-base text-foreground">{data.actualProgress}%</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">الفجوة الحالية: </span>
                    <span className={`font-bold text-base ${data.gap > 5 ? "text-destructive" : "text-emerald-600"}`}>
                      {data.gap}%
                    </span>
                  </div>
                </div>
                {data.ragStatus && (
                  <div className="pt-2 flex items-center gap-2">
                    <span className="text-muted-foreground">الحالة العامة (RAG): </span>
                    <Badge className={
                      data.ragStatus === "أخضر" ? "bg-emerald-500 text-white" : data.ragStatus === "أصفر" ? "bg-amber-500 text-white" : "bg-rose-500 text-white"
                    }>
                      {data.ragStatus}
                    </Badge>
                  </div>
                )}
              </div>
            )}

            {/* Visit Report Specific */}
            {reportType === "visit" && (
              <div className="space-y-3">
                <div className="border border-border/80 rounded-xl p-4 bg-card space-y-2">
                  <h3 className="font-bold text-sm text-foreground">الملاحظات المرصودة أثناء الزيارة</h3>
                  <p className="whitespace-pre-wrap text-muted-foreground leading-relaxed">{data.notes || "لا توجد ملاحظات مدونة."}</p>
                </div>
                <div className="border border-border/80 rounded-xl p-4 bg-card grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-muted-foreground">غرض الرفع: </span>
                    <span className="font-bold text-foreground">{data.purpose || "للاطلاع"}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">يُرفع إلى: </span>
                    <span className="font-bold text-foreground">{data.submittedTo || "إدارة المشاريع"}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Text details if present */}
            {data.recommendations && (
              <div className="border border-border/80 rounded-xl p-4 bg-card space-y-2">
                <h3 className="font-bold text-sm text-foreground">التوصيات والإجراءات</h3>
                <p className="whitespace-pre-wrap text-muted-foreground leading-relaxed">{data.recommendations}</p>
              </div>
            )}

            {data.valueImpact && (
              <div className="border border-border/80 rounded-xl p-4 bg-card space-y-2">
                <h3 className="font-bold text-sm text-foreground">القيمة والأثر المتحقق</h3>
                <p className="whitespace-pre-wrap text-muted-foreground leading-relaxed">{data.valueImpact}</p>
              </div>
            )}

            {data.needEscalation !== undefined && (
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between">
                <span className="font-bold text-amber-800 dark:text-amber-300">هل يحتاج التقرير إلى تصعيد قيادي؟</span>
                <Badge variant={data.needEscalation === "نعم" ? "destructive" : "outline"} className="text-xs px-3">
                  {data.needEscalation}
                </Badge>
              </div>
            )}
          </div>

          {/* Signatures */}
          <div className="pt-8 border-t border-border grid grid-cols-3 gap-6 text-center text-xs">
            <div>
              <div className="font-bold text-foreground mb-6">مُعدّ التقرير</div>
              <div className="border-b border-dashed border-border w-2/3 mx-auto mb-1" />
              <div className="text-muted-foreground">{data.projectManager || "مدير المشروع"}</div>
            </div>
            <div>
              <div className="font-bold text-foreground mb-6">الجهة المالكة</div>
              <div className="border-b border-dashed border-border w-2/3 mx-auto mb-1" />
              <div className="text-muted-foreground">{data.ownerDepartment || "الإدارة المعنية"}</div>
            </div>
            <div>
              <div className="font-bold text-foreground mb-6">اعتماد إدارة المشاريع</div>
              <div className="border-b border-dashed border-border w-2/3 mx-auto mb-1" />
              <div className="text-muted-foreground">مدير مكتب إدارة المشاريع</div>
            </div>
          </div>
        </div>

        <DialogFooter className="p-4 border-t border-border bg-muted/20">
          <Button variant="outline" size="sm" onClick={onClose} className="h-8 text-xs">
            إغلاق المعاينة
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
