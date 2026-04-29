import { useParams, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ArrowRight, Printer, Download, Star, Building2, Calendar, DollarSign, CheckCircle, AlertTriangle, FileText, User } from "lucide-react";

// مكوّن نجوم التقييم
function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`w-5 h-5 ${star <= rating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"}`}
        />
      ))}
    </div>
  );
}

// تسميات المراحل
const STAGE_LABELS: Record<string, string> = {
  initial_review: "المراجعة الأولية",
  field_inspection: "الزيارة الميدانية",
  boq_preparation: "إعداد جدول الكميات",
  financial_eval_and_approval: "التقييم المالي واعتماد العرض",
  contracting: "التعاقد",
  execution: "التنفيذ",
  handover: "الاستلام",
  closed: "مغلق",
};

export default function FinalReportView() {
  const params = useParams<{ reportId: string }>();
  const reportId = parseInt(params.reportId || "0");
  const [, navigate] = useLocation();

  const { data, isLoading, error } = trpc.finalReports.getWithDetails.useQuery(
    { reportId },
    { enabled: reportId > 0 }
  );

  const handlePrint = () => {
    window.print();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center" dir="rtl">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">جاري تحميل التقرير...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center" dir="rtl">
        <div className="text-center">
          <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <p className="text-gray-600">لم يتم العثور على التقرير</p>
          <Button variant="outline" onClick={() => navigate(-1 as any)} className="mt-4">
            العودة
          </Button>
        </div>
      </div>
    );
  }

  const { report, request, mosque, project, preparedBy } = data;

  const formatDate = (date: Date | string | null | undefined) => {
    if (!date) return "—";
    return new Date(date).toLocaleDateString("ar-SA", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const formatCurrency = (amount: string | number | null | undefined) => {
    if (!amount) return "—";
    return new Intl.NumberFormat("ar-SA", {
      style: "currency",
      currency: "SAR",
      minimumFractionDigits: 0,
    }).format(Number(amount));
  };

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      {/* شريط الأدوات - يُخفى عند الطباعة */}
      <div className="bg-white border-b border-gray-200 print:hidden">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={() => navigate(-1 as any)}
            className="flex items-center gap-2 text-gray-600"
          >
            <ArrowRight className="w-4 h-4" />
            العودة
          </Button>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              onClick={handlePrint}
              className="flex items-center gap-2"
            >
              <Printer className="w-4 h-4" />
              طباعة
            </Button>
          </div>
        </div>
      </div>

      {/* محتوى التقرير */}
      <div className="max-w-4xl mx-auto px-6 py-8 print:px-0 print:py-0">
        {/* رأس التقرير */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-6 print:rounded-none print:shadow-none print:border-0">
          {/* شريط العنوان الأخضر */}
          <div className="bg-gradient-to-l from-emerald-600 to-emerald-700 px-8 py-6 text-white print:bg-emerald-700">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <FileText className="w-6 h-6 opacity-80" />
                  <span className="text-emerald-100 text-sm">التقرير الختامي</span>
                </div>
                <h1 className="text-2xl font-bold mb-1">
                  {mosque?.name || "مسجد غير محدد"}
                </h1>
                <p className="text-emerald-100 text-sm">
                  طلب رقم: {request?.requestNumber || `#${report.requestId}`}
                </p>
              </div>
              <div className="text-left">
                <Badge className="bg-white/20 text-white border-white/30 text-sm px-3 py-1">
                  {STAGE_LABELS[request?.currentStage || "closed"] || "مغلق"}
                </Badge>
                <p className="text-emerald-100 text-xs mt-2">
                  تاريخ التقرير: {formatDate(report.createdAt)}
                </p>
              </div>
            </div>
          </div>

          {/* معلومات أساسية */}
          <div className="px-8 py-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div className="text-center">
                <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center mx-auto mb-2">
                  <Building2 className="w-5 h-5 text-emerald-600" />
                </div>
                <p className="text-xs text-gray-500 mb-1">المسجد</p>
                <p className="font-semibold text-gray-800 text-sm">{mosque?.name || "—"}</p>
              </div>
              <div className="text-center">
                <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center mx-auto mb-2">
                  <Calendar className="w-5 h-5 text-blue-600" />
                </div>
                <p className="text-xs text-gray-500 mb-1">تاريخ الإنجاز</p>
                <p className="font-semibold text-gray-800 text-sm">{formatDate(report.completionDate)}</p>
              </div>
              <div className="text-center">
                <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center mx-auto mb-2">
                  <DollarSign className="w-5 h-5 text-amber-600" />
                </div>
                <p className="text-xs text-gray-500 mb-1">التكلفة الإجمالية</p>
                <p className="font-semibold text-gray-800 text-sm">{formatCurrency(report.totalCost)}</p>
              </div>
              <div className="text-center">
                <div className="w-10 h-10 bg-yellow-50 rounded-xl flex items-center justify-center mx-auto mb-2">
                  <Star className="w-5 h-5 text-yellow-500" />
                </div>
                <p className="text-xs text-gray-500 mb-1">تقييم الجودة</p>
                {report.satisfactionRating ? (
                  <div className="flex justify-center">
                    <StarRating rating={report.satisfactionRating} />
                  </div>
                ) : (
                  <p className="font-semibold text-gray-800 text-sm">—</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ملخص المشروع */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 mb-6 print:rounded-none print:shadow-none print:border-0 print:border-b print:border-gray-200">
          <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
            <div className="w-1 h-6 bg-emerald-500 rounded-full" />
            ملخص المشروع
          </h2>
          <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
            {report.summary || "لا يوجد ملخص"}
          </p>
        </div>

        {/* الإنجازات والتحديات */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {/* الإنجازات */}
          {report.achievements && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 print:rounded-none print:shadow-none">
              <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-emerald-500" />
                الإنجازات
              </h2>
              <p className="text-gray-700 leading-relaxed whitespace-pre-wrap text-sm">
                {report.achievements}
              </p>
            </div>
          )}

          {/* التحديات */}
          {report.challenges && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 print:rounded-none print:shadow-none">
              <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-500" />
                التحديات والملاحظات
              </h2>
              <p className="text-gray-700 leading-relaxed whitespace-pre-wrap text-sm">
                {report.challenges}
              </p>
            </div>
          )}
        </div>

        {/* تفاصيل المشروع */}
        {project && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 mb-6 print:rounded-none print:shadow-none">
            <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
              <div className="w-1 h-6 bg-blue-500 rounded-full" />
              تفاصيل المشروع
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-xs text-gray-500 mb-1">رقم المشروع</p>
                <p className="font-semibold text-gray-800">{project.projectNumber}</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-xs text-gray-500 mb-1">اسم المشروع</p>
                <p className="font-semibold text-gray-800">{project.name}</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-xs text-gray-500 mb-1">الميزانية المعتمدة</p>
                <p className="font-semibold text-gray-800">{formatCurrency(project.budget)}</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-xs text-gray-500 mb-1">التكلفة الفعلية</p>
                <p className="font-semibold text-gray-800">{formatCurrency(project.actualCost)}</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-xs text-gray-500 mb-1">تاريخ البدء</p>
                <p className="font-semibold text-gray-800">{formatDate(project.startDate)}</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-xs text-gray-500 mb-1">تاريخ الإنجاز الفعلي</p>
                <p className="font-semibold text-gray-800">{formatDate(project.actualEndDate)}</p>
              </div>
            </div>
          </div>
        )}

        {/* معلومات الطلب */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 mb-6 print:rounded-none print:shadow-none">
          <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
            <div className="w-1 h-6 bg-purple-500 rounded-full" />
            معلومات الطلب
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {request && (
              <>
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-xs text-gray-500 mb-1">رقم الطلب</p>
                  <p className="font-semibold text-gray-800">{request.requestNumber}</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-xs text-gray-500 mb-1">نوع البرنامج</p>
                  <p className="font-semibold text-gray-800">{request.programType || "—"}</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-xs text-gray-500 mb-1">الأولوية</p>
                  <p className="font-semibold text-gray-800">
                    {request.priority === "urgent" ? "عاجل" :
                     request.priority === "medium" ? "متوسطة" : "عادية"}
                  </p>
                </div>
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-xs text-gray-500 mb-1">تاريخ تقديم الطلب</p>
                  <p className="font-semibold text-gray-800">{formatDate(request.createdAt)}</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-xs text-gray-500 mb-1">الحالة الحالية</p>
                  <p className="font-semibold text-gray-800">
                    {STAGE_LABELS[request.currentStage] || request.currentStage}
                  </p>
                </div>
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-xs text-gray-500 mb-1">الجهة المسؤولة</p>
                  <p className="font-semibold text-gray-800">{request.currentResponsibleDepartment || "—"}</p>
                </div>
              </>
            )}
          </div>
        </div>

        {/* معلومات المُعِد */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6 print:rounded-none print:shadow-none">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center">
              <User className="w-6 h-6 text-emerald-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">أعدّ هذا التقرير</p>
              <p className="font-semibold text-gray-800">{preparedBy?.name || "غير محدد"}</p>
              <p className="text-sm text-gray-500">{preparedBy?.email || ""}</p>
            </div>
            <div className="mr-auto text-left">
              <p className="text-xs text-gray-500">تاريخ إعداد التقرير</p>
              <p className="font-semibold text-gray-800">{formatDate(report.createdAt)}</p>
            </div>
          </div>
        </div>

        {/* تذييل الطباعة */}
        <div className="hidden print:block text-center text-gray-400 text-sm mt-8 pt-4 border-t border-gray-200">
          <p>بوابة تمام للعناية بالمساجد — تقرير ختامي رسمي</p>
          <p>تاريخ الطباعة: {new Date().toLocaleDateString("ar-SA")}</p>
        </div>
      </div>

      {/* أنماط CSS للطباعة */}
      <style>{`
        @media print {
          body { background: white !important; }
          .print\\:hidden { display: none !important; }
          .print\\:block { display: block !important; }
          @page { margin: 2cm; }
        }
      `}</style>
    </div>
  );
}
