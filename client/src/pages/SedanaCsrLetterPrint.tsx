import React, { useMemo } from "react";
import { useParams, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { ArrowRight, Printer, Loader2, AlertCircle } from "lucide-react";
import { useDocumentTitle } from "@/contexts/DocumentTitleContext";

export default function SedanaCsrLetterPrint() {
  const params = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const requestId = parseInt(params.id || "0");

  useDocumentTitle(`خطاب مسؤولية مجتمعية #${requestId} - سدانة`);

  // 1. جلب بيانات الطلب
  const {
    data: request,
    isLoading: isRequestLoading,
    error,
  } = trpc.requests.getById.useQuery(
    { id: requestId },
    { enabled: !!requestId && requestId > 0 }
  );

  // 2. جلب إعدادات الجمعية والشعار
  const { data: orgSettings } = trpc.organization.getSettings.useQuery();

  // 3. جلب جدول الكميات BOQ
  const { data: boqResult } = trpc.projects.getBOQ.useQuery(
    { requestId },
    { enabled: !!requestId && requestId > 0 }
  );

  // 4. جلب المفوضين بالتوقيع
  const { data: signatoriesData = [] } = trpc.organization.getSignatories.useQuery(undefined, {
    staleTime: 10 * 60 * 1000,
  });

  // معالجة بيانات البرنامج
  let programData: Record<string, any> = {};
  try {
    if (typeof request?.programData === "string") {
      programData = JSON.parse(request.programData);
    } else {
      programData = (request?.programData as Record<string, any>) || {};
    }
  } catch (e) {
    programData = {};
  }

  const savedProc = programData?.sedanaProcurement;
  const mosqueName = request?.mosque?.name || "المسجد";
  const orgName = orgSettings?.officialReportsName || orgSettings?.organizationName || "جمعية عمارة المساجد (منارة)";

  // استخراج بنود المسجد والطلب
  const allItems = useMemo(() => {
    const bItems: any[] = Array.isArray(programData?.basketItems) ? programData.basketItems : [];
    const evalItems: any[] = Array.isArray(programData?.evaluation?.items) ? programData.evaluation.items : [];

    if (boqResult?.items && boqResult.items.length > 0) {
      return boqResult.items.map((it: any, idx: number) => {
        let desc = it.itemDescription || it.description || it.spec || "";

        if (!desc || desc.trim() === "") {
          const matchBasket = bItems.find((b: any) => 
            String(b.id) === String(it.id) || 
            (b.name && it.itemName && b.name.trim().toLowerCase() === it.itemName.trim().toLowerCase())
          );
          if (matchBasket) {
            desc = matchBasket.description || matchBasket.spec || matchBasket.notes || "";
          }
        }

        if (!desc || desc.trim() === "") {
          const matchEval = evalItems.find((e: any) => 
            String(e.key) === String(it.id) || 
            (e.name && it.itemName && e.name.trim().toLowerCase() === it.itemName.trim().toLowerCase())
          );
          if (matchEval) {
            desc = matchEval.description || matchEval.spec || matchEval.notes || "";
          }
        }

        return {
          id: String(it.id || idx + 1),
          itemName: it.itemName || it.name || `بند رقم ${idx + 1}`,
          description: desc,
          quantity: parseFloat(it.quantity || "1"),
          unit: it.unit || "وحدة",
        };
      });
    }

    if (evalItems.length > 0) {
      return evalItems.map((it: any, idx: number) => ({
        id: String(it.key || idx + 1),
        itemName: it.name || it.itemName || `بند ${idx + 1}`,
        description: it.description || it.itemDescription || it.spec || it.notes || "",
        quantity: parseFloat(it.approvedQty || it.requestedQty || "1"),
        unit: it.unit || "وحدة",
      }));
    }

    if (bItems.length > 0) {
      return bItems.map((it: any, idx: number) => ({
        id: String(it.id || idx + 1),
        itemName: it.name || `بند ${idx + 1}`,
        description: it.description || it.itemDescription || it.spec || it.notes || "",
        quantity: parseFloat(it.quantity || "1"),
        unit: it.unit || "وحدة",
      }));
    }

    return [];
  }, [boqResult, programData]);

  // البحث عن الخطاب المحدد برقم الخطاب إن وجد
  const searchParams = new URLSearchParams(window.location.search);
  const targetLetterNumber = searchParams.get("letterNumber");

  const targetCsr = useMemo(() => {
    const list: any[] = Array.isArray(savedProc?.csrLetters) ? savedProc.csrLetters : [];
    if (targetLetterNumber && list.length > 0) {
      const match = list.find((c: any) => c.letterNumber === targetLetterNumber);
      if (match) return match;
    }
    return savedProc?.activeCsrLetter || (list.length > 0 ? list[0] : {});
  }, [savedProc, targetLetterNumber]);

  // استخراج البنود المخصصة للمسؤولية المجتمعية
  const csrItems = useMemo(() => {
    if (targetCsr?.items && Array.isArray(targetCsr.items) && targetCsr.items.length > 0) {
      return targetCsr.items;
    }

    const itemsAllocation = savedProc?.itemsAllocation || {};
    const filtered = allItems.filter((it: any) => itemsAllocation[it.id] === "csr_letter");
    if (filtered.length > 0) return filtered;

    // فحص تخصيص الموردين إن وجد
    const suppliersAllocation = savedProc?.suppliersAllocation || {};
    const itemSupplierMap = savedProc?.itemSupplierMap || {};
    const fromSupplierAlloc = allItems.filter((it: any) => {
      const sup = itemSupplierMap[it.id];
      if (!sup?.supplierName) return false;
      return suppliersAllocation[sup.supplierName] === "csr_letter";
    });
    if (fromSupplierAlloc.length > 0) return fromSupplierAlloc;

    // في حال لم يتم التوزيع بعد، عرض البنود المسجلة
    return allItems;
  }, [allItems, savedProc, targetCsr]);

  // إعداد بيانات الخطاب
  const execSignatory = signatoriesData.find((s: any) => s.roleTitle?.includes("تنفيذي") || s.roleTitle?.includes("مدير")) || signatoriesData[0];

  const csrData = {
    letterNumber: targetCsr.letterNumber || `CSR-${requestId}-${new Date().getFullYear()}`,
    letterDate: targetCsr.letterDate || new Date().toISOString().split("T")[0],
    salutation: targetCsr.salutation || "السادة",
    recipientName: targetCsr.recipientName || "الجهة المانحة / الشريك المجتمعي",
    honorific: targetCsr.honorific || "المحترمون",
    projectName: targetCsr.projectName || `مشروع جامع ${mosqueName}`,
    signatoryTitle: targetCsr.signatoryTitle || "المدير التنفيذي",
    signatoryName: targetCsr.signatoryName || execSignatory?.name || "م. عبدالهادي آل فائق",
  };

  const handlePrint = () => {
    window.print();
  };

  const handleBack = () => {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      setLocation(`/requests/${requestId}/procurement`);
    }
  };

  if (isRequestLoading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-6" dir="rtl">
        <div className="bg-card p-6 rounded-xl border border-border shadow-xs flex flex-col items-center gap-3 text-center max-w-sm">
          <Loader2 className="w-8 h-8 animate-spin text-sky-600" />
          <p className="text-sm font-bold text-foreground">جاري تحميل خطاب المسؤولية المجتمعية...</p>
        </div>
      </div>
    );
  }

  if (error || !request) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-6" dir="rtl">
        <div className="bg-card p-8 max-w-md text-center space-y-4 rounded-xl border">
          <AlertCircle className="w-12 h-12 text-destructive mx-auto" />
          <h3 className="text-xl font-bold text-foreground">تعذر العثور على الطلب</h3>
          <p className="text-sm text-muted-foreground">
            {error?.message || "لم يتم العثور على بيانات الطلب المطلوب أو لا تملك صلاحية الوصول إليه."}
          </p>
          <Button onClick={() => setLocation("/requests")} className="w-full">
            العودة إلى قائمة الطلبات
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-slate-950 py-3 sm:py-8 print:py-0 print:bg-white text-right font-sans" dir="rtl">
      {/* شريط التحكم العلوي المقاوم للطباعة */}
      <div className="print:hidden w-full bg-white/95 dark:bg-slate-900/95 backdrop-blur border-b border-border p-3 sticky top-0 z-50 shadow-xs sm:fixed sm:top-4 sm:right-4 sm:w-auto sm:bg-transparent sm:backdrop-blur-none sm:border-0 sm:p-0 sm:shadow-none">
        <div className="flex flex-wrap items-center justify-between sm:justify-end gap-2 max-w-6xl mx-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={handleBack}
            className="h-8 sm:h-9 bg-white dark:bg-slate-800 border shadow-xs font-bold text-xs sm:text-sm gap-1.5 cursor-pointer"
          >
            <ArrowRight className="h-4 w-4" />
            <span>رجوع إلى جدول التأمين</span>
          </Button>

          <Button
            size="sm"
            onClick={handlePrint}
            className="h-8 sm:h-9 bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs sm:text-sm gap-1.5 shadow-md cursor-pointer"
          >
            <Printer className="h-4 w-4" />
            <span>تنزيل PDF / طباعة</span>
          </Button>
        </div>
      </div>

      {/* ورقة الخطاب الرسمي A4 المتموضعة في منتصف الشاشة */}
      <div className="print-container w-full max-w-full sm:max-w-[210mm] mx-auto bg-white shadow-xl print:shadow-none p-6 sm:p-10 print:p-0 min-h-auto sm:min-h-[297mm] print:min-h-0 relative flex flex-col justify-between overflow-hidden print:overflow-visible">
        <div className="print-inner p-4 sm:p-8 print:p-0 relative bg-white h-full flex-1 flex flex-col justify-between min-h-auto sm:min-h-[285mm] print:min-h-0 leading-relaxed">
          <div className="relative z-10 space-y-4 sm:space-y-6 print:space-y-3 flex-1">
            {/* ترويسة الخطاب الرسمية */}
            <div className="flex justify-between items-start border-b border-slate-300 pb-3 sm:pb-4 print:pb-2">
              <div className="flex items-center gap-3">
                {orgSettings?.logoUrl ? (
                  <img src={orgSettings.logoUrl} alt="شعار الجمعية" className="h-14 sm:h-20 print:h-14 w-auto object-contain" />
                ) : (
                  <div className="w-14 h-14 bg-sky-50 border border-sky-200 rounded-lg flex items-center justify-center text-sky-700 font-bold text-xl">
                    سدانة
                  </div>
                )}
                <div>
                  <h3 className="font-bold text-base sm:text-lg text-sky-900">{orgName}</h3>
                  <p className="text-xs text-slate-500 font-medium">إدارة المسؤولية المجتمعية والشراكات • برنامج سدانة</p>
                </div>
              </div>

              <div className="text-xs space-y-1 text-left font-mono">
                <div><span className="text-slate-500">الرقم: </span><strong>{csrData.letterNumber}</strong></div>
                <div><span className="text-slate-500">التاريخ: </span><strong>{csrData.letterDate}</strong></div>
                <div><span className="text-slate-500">رقم الطلب: </span><strong>#{request?.requestNumber || requestId}</strong></div>
              </div>
            </div>

            {/* المخاطبة: السادة / ... المحترمون */}
            <div className="pt-2 text-sm sm:text-base font-bold text-slate-900">
              <span>{csrData.salutation} / </span>
              <span className="border-b-2 border-dotted border-slate-400 px-2 text-sky-900 font-bold">
                {csrData.recipientName || "الجهة المانحة / الشريك المجتمعية"}
              </span>
              <span className="mr-3">{csrData.honorific}</span>
            </div>

            {/* الديباجة الحرفية المعتمدة */}
            <div className="text-xs sm:text-sm text-slate-800 leading-loose space-y-2">
              <p className="font-bold text-slate-900">السلام عليكم ورحمة الله وبركاته،،،</p>
              <p>
                تجدون برفقه البنود المراد تأمينها لمشروع <strong>({csrData.projectName || `مشروع جامع ${mosqueName}`})</strong>، وحيث إنكم من الجهات الحريصة على بذل الخير وخدمة المجتمع، عليه نرفع لكم المتطلبات التي يحتاجها المشروع:
              </p>
            </div>

            {/* جدول الأصناف المرفقة */}
            <div>
              <table className="w-full border-collapse border border-slate-300 text-xs text-right">
                <thead className="bg-slate-100 text-slate-800 font-bold border-b border-slate-300">
                  <tr>
                    <th className="p-2 border-l border-slate-300 text-center w-12">م</th>
                    <th className="p-2 border-l border-slate-300">الصنف والبيان</th>
                    <th className="p-2 border-l border-slate-300">الوصف والمواصفات</th>
                    <th className="p-2 border-l border-slate-300 text-center w-20">الكمية</th>
                    <th className="p-2 text-center w-20">الوحدة</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-300">
                  {csrItems.length > 0 ? (
                    csrItems.map((it: any, idx: number) => (
                      <tr key={it.id} className="h-9">
                        <td className="p-2 border-l border-slate-300 text-center font-mono text-slate-600">{idx + 1}</td>
                        <td className="p-2 border-l border-slate-300 font-bold text-slate-900">{it.itemName}</td>
                        <td className="p-2 border-l border-slate-300 text-slate-700">{it.description || "-"}</td>
                        <td className="p-2 border-l border-slate-300 text-center font-bold text-slate-900">{it.quantity}</td>
                        <td className="p-2 text-center text-slate-700">{it.unit}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-slate-500 font-medium">
                        لم يتم تخصيص أي بنود للمسؤولية المجتمعية حتى الآن. يرجى الرجوع لجدول التأمين وتحديد البنود المطلوبة.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* عبارة الختام */}
            <div className="pt-2 sm:pt-3 text-xs sm:text-sm font-bold text-slate-900">
              <p>وتقبلوا وافر التحية والتقدير،،،</p>
            </div>

            {/* خانة التوقيع والاعتماد الرسمي */}
            <div className="pt-6 sm:pt-8 flex justify-center break-inside-avoid">
              <div className="w-64 text-center space-y-2">
                <p className="font-bold text-xs sm:text-sm text-slate-800">{csrData.signatoryTitle || "المدير التنفيذي"}</p>
                <div className="h-12 sm:h-14 flex items-center justify-center">
                  <div className="border-b border-dashed border-slate-400 w-40 mx-auto" />
                </div>
                <p className="font-bold text-xs sm:text-sm text-slate-900">{csrData.signatoryName || "المهندس المفوض بالتوقيع"}</p>
              </div>
            </div>
          </div>

          {/* تذييل الخطاب */}
          <div className="mt-4 sm:mt-8 pt-3 sm:pt-4 border-t border-slate-200 text-center text-slate-400 text-[10px] flex justify-between items-center px-1">
            <span>{orgName} - سدانة</span>
            <span>صفحة 1 من 1</span>
          </div>
        </div>
      </div>

      <style>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 8mm 10mm !important;
          }
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          html, body {
            background-color: white !important;
            padding: 0 !important;
            margin: 0 !important;
            font-size: 11pt !important;
          }
          .print-container {
            width: 100% !important;
            max-width: 100% !important;
            min-height: auto !important;
            height: auto !important;
            box-shadow: none !important;
            border: none !important;
            padding: 0 !important;
            margin: 0 !important;
            overflow: visible !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          .print-inner {
            padding: 0 !important;
            min-height: auto !important;
            height: auto !important;
          }
          .break-inside-avoid {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
        }
      `}</style>
    </div>
  );
}
