import { useLocation, useParams } from "wouter";
import { MawasimScheduleReportDocument } from "@/components/MawasimScheduleReport";
import { Button } from "@/components/ui/button";
import { useDocumentTitle } from "@/contexts/DocumentTitleContext";
import { usePermission } from "@/hooks/usePermission";
import { trpc } from "@/lib/trpc";
import { AlertTriangle, ArrowRight, Loader2, Printer } from "lucide-react";

export default function MawasimWorkOrderPrint() {
  const params = useParams<{ seasonId: string; requestId: string }>();
  const [, navigate] = useLocation();
  const canViewRequests = usePermission("mawasim.view_requests") || usePermission("mawasim.approve_requests");
  const seasonId = params.seasonId ? parseInt(params.seasonId, 10) : 0;
  const requestId = params.requestId ? parseInt(params.requestId, 10) : 0;

  const { data, isLoading, error } = trpc.mawasim.workOrder.useQuery(
    { seasonId, requestId },
    { enabled: canViewRequests && seasonId > 0 && requestId > 0 },
  );
  const { data: orgSettings } = trpc.organization.getSettings.useQuery();

  const request = data?.request;
  const season = data?.season;

  useDocumentTitle(request ? `أمر العمل - طلب #${request.id} - ${request.mosqueName}` : "أمر العمل - برنامج مواسم");

  const handleBack = () => {
    if (window.opener && !window.opener.closed) {
      try {
        window.close();
      } catch {
        // ignore
      }
    }
    navigate("/mawasim");
  };

  if (!canViewRequests) {
    return (
      <div className="flex items-center justify-center min-h-screen" dir="rtl">
        <div className="text-center space-y-3">
          <AlertTriangle className="h-12 w-12 text-destructive mx-auto" />
          <h2 className="text-xl font-bold">ليس لديك صلاحية عرض أمر العمل</h2>
          <Button onClick={handleBack}>العودة إلى برنامج مواسم</Button>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen" dir="rtl">
        <Loader2 className="size-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !request || !season) {
    return (
      <div className="flex items-center justify-center min-h-screen" dir="rtl">
        <div className="text-center space-y-3">
          <AlertTriangle className="h-12 w-12 text-destructive mx-auto" />
          <h2 className="text-xl font-bold">تعذّر العثور على أمر العمل المطلوب</h2>
          {error?.message && <p className="text-sm text-muted-foreground">{error.message}</p>}
          <Button onClick={handleBack}>العودة إلى برنامج مواسم</Button>
        </div>
      </div>
    );
  }

  const handlePrint = () => {
    const prevTitle = document.title;
    document.title = `أمر العمل - طلب #${request.id} - ${request.mosqueName}`;
    window.print();
    setTimeout(() => {
      document.title = prevTitle;
    }, 1000);
  };

  return (
    <>
      <style>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 8mm 6mm !important;
          }
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            box-sizing: border-box !important;
          }
          html, body {
            width: 100% !important;
            height: auto !important;
            min-height: 100% !important;
            background-color: white !important;
            color: black !important;
            margin: 0 !important;
            padding: 0 !important;
            overflow: visible !important;
          }
          .max-w-\\[210mm\\] {
            width: 100% !important;
            max-width: 100% !important;
            padding: 0 !important;
            margin: 0 auto !important;
          }
          .print\\:hidden {
            display: none !important;
          }
          .print\\:overflow-visible {
            overflow: visible !important;
          }
        }
      `}</style>

      {/* شريط التحكم العلوي مثل صفحة طباعة تقرير الإنجاز */}
      <div className="print:hidden w-full bg-white/95 backdrop-blur-md border-b border-slate-200 sticky top-0 z-50 shadow-xs" dir="rtl">
        <div className="w-full max-w-[210mm] mx-auto px-3 sm:px-6 py-2.5 sm:py-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              onClick={handleBack}
              className="bg-white border shadow-xs font-semibold text-xs sm:text-sm min-h-10 px-3 sm:px-4 cursor-pointer"
            >
              <ArrowRight className="ml-1.5 h-4 w-4 shrink-0" />
              رجوع
            </Button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              onClick={handlePrint}
              className="shadow-sm bg-[#1a5f4a] hover:bg-[#1a5f4a]/90 text-white font-semibold text-xs sm:text-sm min-h-10 px-3 sm:px-4 cursor-pointer"
            >
              <Printer className="ml-1.5 h-4 w-4 shrink-0" />
              <span>طباعة</span>
            </Button>
          </div>
        </div>
      </div>

      {/* صفحة المستند المستقلة */}
      <div className="min-h-screen bg-slate-50/70 print:bg-white print:p-0 font-sans overflow-x-hidden print:overflow-visible" dir="rtl">
        <div className="w-full max-w-[210mm] mx-auto p-2.5 sm:p-6 md:p-8 print:p-0 print:max-w-none">
          <MawasimScheduleReportDocument
            request={request}
            season={season}
            orgSettings={orgSettings}
          />
        </div>
      </div>
    </>
  );
}
