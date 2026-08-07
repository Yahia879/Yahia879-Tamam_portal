import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { trpc } from "@/lib/trpc";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  FileText, Building2, User, Calendar, MapPin, 
  ClipboardCheck, Table, DollarSign, FileSignature, 
  Cog, ClipboardList, CheckCircle, Download, Printer,
  X, AlertCircle
} from "lucide-react";
import { STAGE_LABELS, PROGRAM_LABELS, STATUS_LABELS, PROGRAM_DATA_LABELS } from "../../../shared/constants";
import { format } from "date-fns";
import { ar } from "date-fns/locale";

interface FinalReportModalProps {
  requestId: number;
  isOpen: boolean;
  onClose: () => void;
}

export function FinalReportModal({ requestId, isOpen, onClose }: FinalReportModalProps) {
  const { data: report, isLoading, error } = (trpc.requests as any).getSummaryReport.useQuery(
    { id: requestId },
    { enabled: isOpen }
  );

  const formatCurrency = (amount: string | number | null) => {
    if (amount === null || amount === undefined) return "---";
    return new Intl.NumberFormat("ar-SA", {
      style: "currency",
      currency: "SAR",
    }).format(Number(amount));
  };

  const formatDate = (date: Date | string | null) => {
    if (!date) return "---";
    return format(new Date(date), "PPP", { locale: ar });
  };

  const renderSection = (title: string, icon: any, children: React.ReactNode) => (
    <div className="mb-8 last:mb-0">
      <div className="flex items-center gap-2 mb-4">
        <div className="p-2 rounded-lg bg-primary/10 text-primary">
          {icon}
        </div>
        <h3 className="text-xl font-bold">{title}</h3>
      </div>
      <Card className="p-6 bg-muted/30 border-none shadow-none">
        {children}
      </Card>
    </div>
  );

  const renderInfoRow = (label: string, value: React.ReactNode) => (
    <div className="flex justify-between py-2 border-b border-muted last:border-0 items-center">
      <span className="text-muted-foreground font-medium">{label}</span>
      <span className="font-bold text-right">{value || "---"}</span>
    </div>
  );

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-0 gap-0">
        <DialogHeader className="p-6 bg-primary text-primary-foreground sticky top-0 z-10 rounded-t-lg">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-2xl font-bold flex items-center gap-2">
                <FileText className="w-6 h-6" />
                التقرير الختامي الشامل
              </DialogTitle>
              <DialogDescription className="text-primary-foreground/80 mt-1">
                ملخص متكامل لجميع مراحل سير عمل الطلب رقم {report?.request?.requestNumber}
              </DialogDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" onClick={() => window.print()} className="hidden sm:flex">
                <Printer className="w-4 h-4 ml-2" />
                طباعة التقرير
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="p-8">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
              <p className="text-muted-foreground">جاري توليد التقرير الشامل...</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4 text-destructive">
              <AlertCircle className="w-12 h-12" />
              <p className="font-bold">حدث خطأ أثناء تحميل بيانات التقرير</p>
              <p className="text-sm">{error.message}</p>
            </div>
          ) : report ? (
            <div className="space-y-10 rtl print:space-y-6">
              {/* 1. معلومات عامة */}
              {renderSection("معلومات عامة", <Building2 className="w-5 h-5" />, (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-2">
                  {renderInfoRow("رقم الطلب", <span className="font-mono text-primary">{report.request.requestNumber}</span>)}
                  {renderInfoRow("نوع البرنامج", PROGRAM_LABELS[report.request.programType as keyof typeof PROGRAM_LABELS])}
                  {renderInfoRow("اسم المسجد", report.mosque?.name)}
                  {renderInfoRow("مقدم الطلب", report.requester?.name)}
                  {renderInfoRow("المدينة / الحي", `${report.mosque?.city || "---"} / ${report.mosque?.district || "---"}`)}
                  {renderInfoRow("تاريخ التقديم", formatDate(report.request.createdAt))}
                  {renderInfoRow("الأولوية", (
                    <Badge variant={report.request.priority === "urgent" ? "destructive" : "secondary"}>
                      {report.request.priority === "urgent" ? "عاجل" : report.request.priority === "medium" ? "متوسط" : "عادي"}
                    </Badge>
                  ))}
                  {renderInfoRow("الحالة النهائية", <Badge className="bg-emerald-500">{STATUS_LABELS[report.request.status as keyof typeof STATUS_LABELS] || "مكتمل"}</Badge>)}
                </div>
              ))}

              {/* 2. تقديم الطلب */}
              {renderSection("تقديم الطلب", <FileText className="w-5 h-5" />, (
                <div className="space-y-4">
                  <div>
                    <h4 className="text-sm font-bold text-muted-foreground mb-2">وصف الطلب:</h4>
                    <p className="bg-background p-3 rounded border text-sm italic">
                      {report.request.description || "لا يوجد وصف إضافي"}
                    </p>
                  </div>
                  {report.request.programData && Object.keys(report.request.programData).length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2">
                      {Object.entries(report.request.programData).map(([key, value]: [string, any]) => (
                        <div key={key} className="flex justify-between py-1 border-b border-dashed text-sm">
                          <span className="text-muted-foreground">{PROGRAM_DATA_LABELS[key] || key}:</span>
                          <span className="font-medium">{typeof value === 'boolean' ? (value ? 'نعم' : 'لا') : value}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}

              {/* 3. المراجعة الأولية */}
              {renderSection("المراجعة الأولية", <ClipboardCheck className="w-5 h-5" />, (
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className={report.request.reviewCompleted ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-amber-50 text-amber-700 border-amber-200"}>
                      {report.request.reviewCompleted ? "تمت المراجعة بنجاح" : "قيد المراجعة"}
                    </Badge>
                    <span className="text-sm text-muted-foreground">بتاريخ: {formatDate(report.request.reviewedAt)}</span>
                  </div>
                  {report.request.reviewNotes && (
                    <div>
                      <h4 className="text-sm font-bold text-muted-foreground mb-1">ملاحظات المراجعة:</h4>
                      <p className="text-sm">{report.request.reviewNotes}</p>
                    </div>
                  )}
                </div>
              ))}

              {/* 4. الزيارة الميدانية */}
              {renderSection("الزيارة الميدانية", <MapPin className="w-5 h-5" />, (
                <div className="space-y-4">
                  {report.fieldReports.length > 0 ? (
                    report.fieldReports.map((fr: any, idx: number) => (
                      <div key={idx} className="bg-background p-4 rounded border">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                          {renderInfoRow("تاريخ الزيارة", formatDate(fr.visitDate))}
                          {renderInfoRow("حالة المسجد", fr.mosqueCondition)}
                          {renderInfoRow("تقييم الحالة", (
                            <Badge variant="outline" className="bg-primary/5 capitalize">{fr.conditionRating || "---"}</Badge>
                          ))}
                          {renderInfoRow("التكلفة التقديرية", formatCurrency(fr.estimatedCost))}
                        </div>
                        <Separator className="my-3" />
                        <div className="space-y-3">
                          <div>
                            <h4 className="text-sm font-bold text-muted-foreground mb-1">أهم النتائج:</h4>
                            <p className="text-sm">{fr.findings || "لا توجد بيانات"}</p>
                          </div>
                          <div>
                            <h4 className="text-sm font-bold text-muted-foreground mb-1">التوصيات الفنية:</h4>
                            <p className="text-sm">{fr.recommendations || "لا توجد بيانات"}</p>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-center text-muted-foreground py-4">لا توجد بيانات للزيارة الميدانية</p>
                  )}
                </div>
              ))}

              {/* 5. التقييم الفني */}
              {renderSection("التقييم الفني", <ClipboardCheck className="w-5 h-5" />, (
                <div className="space-y-4">
                  {report.request.technicalEvalDecision ? (
                    <div className="bg-background p-4 rounded border">
                      <div className="flex items-center gap-4 mb-4">
                        <Badge className="bg-primary text-lg py-1 px-4">
                          {report.request.technicalEvalDecision === 'convert_to_project' ? "تحويل إلى مشروع" : 
                           report.request.technicalEvalDecision === 'quick_response' ? "استجابة سريعة" : 
                           report.request.technicalEvalDecision === 'apologize' ? "اعتذار" : "تعليق"}
                        </Badge>
                      </div>
                      {report.request.technicalEvalJustification && (
                        <div>
                          <h4 className="text-sm font-bold text-muted-foreground mb-1">مبررات القرار:</h4>
                          <p className="text-sm italic">{report.request.technicalEvalJustification}</p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-center text-muted-foreground py-4">لا توجد بيانات للتقييم الفني</p>
                  )}
                </div>
              ))}

              {/* 6. جدول الكميات */}
              {renderSection("جدول الكميات", <Table className="w-5 h-5" />, (
                <div className="overflow-x-auto">
                  {report.boqItems.length > 0 ? (
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b text-muted-foreground">
                          <th className="text-right py-2 px-1">#</th>
                          <th className="text-right py-2 px-1">البند</th>
                          <th className="text-center py-2 px-1">الوحدة</th>
                          <th className="text-center py-2 px-1">الكمية</th>
                          <th className="text-center py-2 px-1">السعر التقديري</th>
                          <th className="text-left py-2 px-1">الإجمالي</th>
                        </tr>
                      </thead>
                      <tbody>
                        {report.boqItems.map((item: any, idx: number) => (
                          <tr key={idx} className="border-b last:border-0">
                            <td className="py-2 px-1">{idx + 1}</td>
                            <td className="py-2 px-1">{item.itemName}</td>
                            <td className="py-2 px-1 text-center">{item.unit}</td>
                            <td className="py-2 px-1 text-center">{item.quantity}</td>
                            <td className="py-2 px-1 text-center">{formatCurrency(item.estimatedUnitPrice)}</td>
                            <td className="py-2 px-1 text-left font-bold">{formatCurrency(Number(item.quantity) * Number(item.estimatedUnitPrice || 0))}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <p className="text-center text-muted-foreground py-4">لا توجد بنود في جدول الكميات</p>
                  )}
                </div>
              ))}

              {/* 7. التقييم المالي واعتماد العرض */}
              {renderSection("التقييم المالي", <DollarSign className="w-5 h-5" />, (
                <div className="space-y-4">
                  {report.selectedQuotation ? (
                    <div className="bg-emerald-50 dark:bg-emerald-950/20 p-4 rounded border border-emerald-200">
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="font-bold text-emerald-800">العرض الفائز والمُعتمد</h4>
                        <Badge className="bg-emerald-500">مقبول</Badge>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {renderInfoRow("رقم العرض", <span className="font-mono">{report.selectedQuotation.quotationNumber}</span>)}
                        {renderInfoRow("المورد / المقاول", report.selectedQuotation.supplierName)}
                        {renderInfoRow("تاريخ العرض", formatDate(report.selectedQuotation.createdAt))}
                        {renderInfoRow("المبلغ الإجمالي", <span className="text-emerald-700 text-lg font-black">{formatCurrency(report.selectedQuotation.finalAmount)}</span>)}
                      </div>
                    </div>
                  ) : (
                    <p className="text-center text-muted-foreground py-4">لا توجد بيانات لعروض الأسعار المعتمدة</p>
                  )}
                </div>
              ))}

              {/* 8. التعاقد */}
              {renderSection("التعاقد", <FileSignature className="w-5 h-5" />, (
                <div className="space-y-4">
                  {report.contract ? (
                    <div className="bg-background p-4 rounded border">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {renderInfoRow("رقم العقد", <span className="font-mono text-primary">{report.contract.contractNumber}</span>)}
                        {renderInfoRow("تاريخ التوقيع", formatDate(report.contract.signedAt || report.contract.createdAt))}
                        {renderInfoRow("تاريخ البدء", formatDate(report.contract.startDate))}
                        {renderInfoRow("تاريخ الانتهاء المتوقع", formatDate(report.contract.endDate))}
                        {renderInfoRow("مدة التنفيذ", `${report.contract.durationDays || "---"} يوم`)}
                        {renderInfoRow("حالة العقد", <Badge variant="outline" className="bg-blue-50 text-blue-700">{report.contract.status}</Badge>)}
                      </div>
                    </div>
                  ) : (
                    <p className="text-center text-muted-foreground py-4">لا توجد بيانات للعقد</p>
                  )}
                </div>
              ))}

              {/* 9. التنفيذ */}
              {renderSection("التنفيذ", <Cog className="w-5 h-5" />, (
                <div className="space-y-6">
                  {report.project && (
                    <div className="bg-primary/5 p-4 rounded border border-primary/20">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-bold">بيانات المشروع المرتبط</h4>
                        <span className="font-mono text-sm">{report.project.projectNumber}</span>
                      </div>
                      <p className="text-sm font-medium mb-1">{report.project.name}</p>
                      <Badge variant="outline">{report.project.status}</Badge>
                    </div>
                  )}

                  <div>
                    <h4 className="text-sm font-bold text-muted-foreground mb-3">تقارير الإنجاز الدورية:</h4>
                    {report.progressReports.length > 0 ? (
                      <div className="space-y-3">
                        {report.progressReports.map((pr: any, idx: number) => (
                          <div key={idx} className="bg-background p-3 rounded border flex items-center justify-between">
                            <div>
                              <p className="text-sm font-bold">{pr.reportTitle || `تقرير إنجاز رقم ${idx + 1}`}</p>
                              <p className="text-xs text-muted-foreground">{formatDate(pr.createdAt)}</p>
                            </div>
                            <div className="text-right">
                              <Badge variant="secondary" className="text-lg">%{pr.completionPercentage}</Badge>
                              <p className="text-[10px] text-muted-foreground mt-1">نسبة الإنجاز</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-center text-muted-foreground py-2 text-sm italic">لا توجد تقارير إنجاز مرفوعة</p>
                    )}
                  </div>
                </div>
              ))}

              {/* 10. الاستلام والتسليم */}
              {renderSection("الاستلام والتسليم", <ClipboardList className="w-5 h-5" />, (
                <div className="space-y-4">
                  {report.handovers.length > 0 ? (
                    report.handovers.map((h: any, idx: number) => (
                      <div key={idx} className="bg-background p-4 rounded border">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {renderInfoRow("نوع الاستلام", h.handoverType === 'preliminary' ? "استلام ابتدائي" : "استلام نهائي")}
                          {renderInfoRow("تاريخ الاستلام", formatDate(h.handoverDate))}
                          {renderInfoRow("حالة الاستلام", h.status)}
                        </div>
                        {h.notes && (
                          <div className="mt-3">
                            <h4 className="text-sm font-bold text-muted-foreground mb-1">الملاحظات:</h4>
                            <p className="text-sm italic">{h.notes}</p>
                          </div>
                        )}
                      </div>
                    ))
                  ) : (
                    <p className="text-center text-muted-foreground py-4">لا توجد بيانات للاستلام والتسليم</p>
                  )}
                </div>
              ))}

              {/* 11. الإغلاق والتقرير الختامي */}
              {renderSection("الإغلاق والتقرير الختامي", <CheckCircle className="w-5 h-5" />, (
                <div className="space-y-6">
                  {report.finalReports.length > 0 ? (
                    report.finalReports.map((fr: any, idx: number) => (
                      <div key={idx} className="bg-emerald-50 dark:bg-emerald-950/20 p-6 rounded-lg border-2 border-emerald-200">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                          {renderInfoRow("تاريخ الإغلاق", formatDate(fr.completionDate || fr.createdAt))}
                          {renderInfoRow("قيمة العقد", <span className="font-bold text-slate-800">{formatCurrency(fr.contractAmount)}</span>)}
                          {renderInfoRow("تكلفة التنفيذ الفعلية", <span className="text-xl font-black text-emerald-700">{formatCurrency(fr.totalCost)}</span>)}
                          {renderInfoRow("تقييم الرضا العام", `${fr.satisfactionRating || "---"} / 5`)}
                          {fr.linkUrl && renderInfoRow("رابط التقرير الختامي", (
                            <a 
                              href={fr.linkUrl} 
                              target="_blank" 
                              rel="noopener noreferrer" 
                              className="text-blue-600 hover:text-blue-800 hover:underline font-semibold"
                            >
                              {fr.linkName || "رابط خارجي"}
                            </a>
                          ))}
                        </div>
                        <div className="space-y-4">
                          <div>
                            <h4 className="font-bold text-emerald-800 mb-2">ملخص الختام:</h4>
                            <p className="text-sm leading-relaxed">{fr.summary || "لا توجد بيانات"}</p>
                          </div>
                          <div>
                            <h4 className="font-bold text-emerald-800 mb-2">أبرز الإنجازات:</h4>
                            <p className="text-sm leading-relaxed">{fr.achievements || "لا توجد بيانات"}</p>
                          </div>
                          {fr.challenges && (
                            <div>
                              <h4 className="font-bold text-amber-800 mb-2">التحديات والمعوقات:</h4>
                              <p className="text-sm leading-relaxed">{fr.challenges}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-center text-muted-foreground py-4">لا توجد بيانات للتقرير الختامي</p>
                  )}

                  {report.surveys.length > 0 && (
                    <div>
                      <h4 className="text-sm font-bold text-muted-foreground mb-3">نتائج استبيانات الرضا:</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {report.surveys.map((s: any, idx: number) => (
                          <div key={idx} className="bg-background p-3 rounded border flex items-center justify-between">
                            <span className="text-sm">{s.surveyType === 'stakeholder' ? "رضا أصحاب المصلحة" : "رضا المستفيد"}</span>
                            <div className="flex gap-1">
                              {[1, 2, 3, 4, 5].map(star => (
                                <div key={star} className={`w-3 h-3 rounded-full ${star <= (s.rating || 0) ? "bg-amber-400" : "bg-muted"}`} />
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : null}
        </div>
        
        <div className="p-4 bg-muted border-t flex justify-end gap-3 sticky bottom-0 z-10 print:hidden">
          <Button variant="outline" onClick={onClose}>
            إغلاق النافذة
          </Button>
          <Button onClick={() => window.print()}>
            <Printer className="w-4 h-4 ml-2" />
            طباعة / حفظ PDF
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
