import React, { useMemo } from "react";
import { useParams, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { ArrowRight, Printer, Loader2, AlertCircle, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { useDocumentTitle } from "@/contexts/DocumentTitleContext";

export default function SedanaPurchaseOrderPrint() {
  const params = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const requestId = parseInt(params.id || "0");

  useDocumentTitle(`أمر شراء داخلي #${requestId} - سدانة`);

  const utils = trpc.useUtils();

  // 1. جلب بيانات الطلب
  const {
    data: request,
    isLoading: isRequestLoading,
    error,
  } = trpc.requests.getById.useQuery(
    { id: requestId },
    { enabled: !!requestId && requestId > 0 }
  );

  // اعتماد أمر الشراء فورياً
  const approveMutation = trpc.procurement.approvePurchaseOrder.useMutation({
    onSuccess: (res) => {
      toast.success(res.message || "تم اعتماد أمر الشراء بنجاح");
      utils.requests.getById.invalidate({ id: requestId });
      utils.procurement.listPurchaseOrders.invalidate();
    },
    onError: (err) => {
      toast.error(err.message || "حدث خطأ أثناء اعتماد أمر الشراء");
    },
  });

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

  // البحث عن أمر الشراء المحدد برقم الأمر إن وجد، أو الاعتماد على أمر الشراء النشط
  const searchParams = new URLSearchParams(window.location.search);
  const targetOrderNumber = searchParams.get("orderNumber");

  const activePo = useMemo(() => {
    const poList: any[] = Array.isArray(savedProc?.purchaseOrders) ? savedProc.purchaseOrders : [];
    if (targetOrderNumber && poList.length > 0) {
      const match = poList.find((p: any) => p.orderNumber === targetOrderNumber);
      if (match) return match;
    }
    return savedProc?.activePurchaseOrder || (poList.length > 0 ? poList[0] : {});
  }, [savedProc, targetOrderNumber]);

  // استخراج البنود المخصصة لأمر الشراء
  const poItems = useMemo(() => {
    if (activePo?.items && Array.isArray(activePo.items) && activePo.items.length > 0) {
      return activePo.items;
    }

    const itemsAllocation = savedProc?.itemsAllocation || {};
    const filtered = allItems.filter((it: any) => itemsAllocation[it.id] === "purchase_order");
    if (filtered.length > 0) return filtered;

    // فحص تخصيص الموردين إن وجد
    const suppliersAllocation = savedProc?.suppliersAllocation || {};
    const itemSupplierMap = savedProc?.itemSupplierMap || {};
    const fromSupplierAlloc = allItems.filter((it: any) => {
      const sup = itemSupplierMap[it.id];
      if (!sup?.supplierName) return false;
      return suppliersAllocation[sup.supplierName] === "purchase_order";
    });
    if (fromSupplierAlloc.length > 0) return fromSupplierAlloc;

    // في حال لم يتم التوزيع بعد، عرض البنود المسجلة
    return allItems;
  }, [allItems, savedProc, activePo]);

  // اسم المورد الموجه إليه أمر الشراء
  const poSupplierName = useMemo(() => {
    if (activePo?.directedTo && activePo.directedTo.trim() !== "") {
      return activePo.directedTo;
    }
    if (activePo?.supplierName && activePo.supplierName.trim() !== "") {
      return activePo.supplierName;
    }

    const suppliersAllocation = savedProc?.suppliersAllocation || {};
    const itemSupplierMap = savedProc?.itemSupplierMap || {};
    const poSupplierNames = new Set<string>();

    poItems.forEach((it: any) => {
      const sup = itemSupplierMap[it.id];
      if (sup?.supplierName) {
        poSupplierNames.add(sup.supplierName);
      }
    });

    Object.entries(suppliersAllocation).forEach(([supName, method]) => {
      if (method === "purchase_order" && supName !== "لم يحدد بعد") {
        poSupplierNames.add(supName);
      }
    });

    if (poSupplierNames.size > 0) {
      return Array.from(poSupplierNames).join("، ");
    }

    return "المورد المعتمد";
  }, [poItems, savedProc, activePo]);

  // إعداد بيانات أمر الشراء
  const execSignatory = signatoriesData.find((s: any) => s.roleTitle?.includes("تنفيذي") || s.roleTitle?.includes("مدير")) || signatoriesData[0];

  const orderNum = activePo?.orderNumber || `PO-${requestId}-${new Date().getFullYear()}`;

  const poData = {
    orderNumber: orderNum,
    orderDate: activePo?.orderDate || new Date().toISOString().split("T")[0],
    requesterRole: activePo?.requesterRole || "طالب الشراء / إدارة المشاريع",
    requesterName: activePo?.requesterName || user?.name || "طالب الشراء",
    approverRole: activePo?.approverRole || execSignatory?.roleTitle || "المدير التنفيذي",
    approverName: activePo?.approverName || execSignatory?.name || "م. عبدالهادي آل فائق",
    approverSignatureUrl: activePo?.approverSignatureUrl || execSignatory?.signatureUrl || "",
  };

  const handlePrint = () => {
    window.print();
  };

  const handleBack = () => {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      setLocation("/purchase-orders");
    }
  };

  if (isRequestLoading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-6" dir="rtl">
        <div className="bg-card p-6 rounded-xl border border-border shadow-xs flex flex-col items-center gap-3 text-center max-w-sm">
          <Loader2 className="w-8 h-8 animate-spin text-sky-600" />
          <p className="text-sm font-bold text-foreground">جاري تحميل أمر الشراء الداخلي...</p>
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

          {activePo?.status !== "approved" && (
            <Button
              size="sm"
              onClick={() => approveMutation.mutate({ requestId, orderNumber: activePo?.orderNumber })}
              disabled={approveMutation.isPending}
              className="h-8 sm:h-9 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs sm:text-sm gap-1.5 shadow-md cursor-pointer"
            >
              <CheckCircle className="w-4 h-4" />
              <span>{approveMutation.isPending ? "جاري الاعتماد..." : "اعتماد أمر الشراء الآن"}</span>
            </Button>
          )}

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

      {/* ورقة أمر الشراء A4 المتموضعة في منتصف الشاشة */}
      <div className="print-container w-full max-w-full sm:max-w-[210mm] mx-auto bg-white shadow-xl print:shadow-none p-6 sm:p-10 print:p-0 min-h-auto sm:min-h-[297mm] print:min-h-0 relative flex flex-col justify-between overflow-hidden print:overflow-visible">
        <div className="print-inner p-4 sm:p-8 print:p-0 relative bg-white h-full flex-1 flex flex-col justify-between min-h-auto sm:min-h-[285mm] print:min-h-0 leading-relaxed">
          <div className="relative z-10 space-y-4 sm:space-y-6 print:space-y-3 flex-1">
            {/* الترويسة العلوية الرسمية */}
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
                  <p className="text-xs text-slate-500 font-medium">إدارة المشاريع والمشتريات • برنامج سدانة</p>
                </div>
              </div>

              <div className="text-xs space-y-1 text-left font-mono">
                <div><span className="text-slate-500">رقم الأمر: </span><strong>{poData.orderNumber}</strong></div>
                <div><span className="text-slate-500">التاريخ: </span><strong>{poData.orderDate}</strong></div>
                <div><span className="text-slate-500">رقم الطلب: </span><strong>#{request?.requestNumber || requestId}</strong></div>
              </div>
            </div>

            {/* شريط العنوان السماوي */}
            <div className="bg-[#0284c7] text-white font-bold text-center py-2 px-4 rounded text-sm sm:text-base shadow-2xs">
              أمر شراء داخلي (نموذج طلب شراء)
            </div>

            {/* سطر الموجه إليه والمسجد */}
            <div className="bg-slate-50 border border-slate-200 p-2.5 rounded text-xs flex items-center justify-between">
              <div>
                <span className="text-slate-500">موجه إلى: </span>
                <strong className="text-slate-900">{poSupplierName}</strong>
              </div>
              <div>
                <span className="text-slate-500">المشروع / المسجد: </span>
                <strong className="text-slate-900">{mosqueName} {request?.mosque?.city ? `(${request.mosque.city})` : ""}</strong>
              </div>
            </div>

            {/* جدول الأصناف */}
            <div className="space-y-1">
              <p className="text-[11px] font-bold text-slate-700">
                نأمل تأمين الأصناف والبنود الموضحة أدناه لصالح المشروع المذكور:
              </p>

              <table className="w-full border-collapse border border-slate-300 text-xs text-right">
                <thead className="bg-slate-100 text-slate-800 font-bold border-b border-slate-300">
                  <tr>
                    <th className="p-2 border-l border-slate-300 text-center w-12">م</th>
                    <th className="p-2 border-l border-slate-300 w-1/3">الصنف المطلوب</th>
                    <th className="p-2 border-l border-slate-300">الوصف والمواصفات</th>
                    <th className="p-2 border-l border-slate-300 text-center w-20">الكمية</th>
                    <th className="p-2 text-center w-20">الوحدة</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-300">
                  {poItems.length > 0 ? (
                    poItems.map((it: any, idx: number) => (
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
                        لم يتم تخصيص أي بنود لأمر الشراء الداخلي حتى الآن. يرجى الرجوع لجدول التأمين وتحديد البنود المطلوبة.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* جدول التوقيعات والاعتماد */}
            <div className="pt-3 sm:pt-4 break-inside-avoid">
              <table className="w-full border-collapse border border-slate-300 text-xs text-center">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-300 font-bold text-slate-800">
                    <th className="p-2 border-l border-slate-300 w-1/4">الوظيفة</th>
                    <th className="p-2 border-l border-slate-300 w-1/4">الاسم</th>
                    <th className="p-2 border-l border-slate-300 w-1/4">التوقيع</th>
                    <th className="p-2 w-1/4">التاريخ</th>
                  </tr>
                </thead>
                <tbody>
                  {/* طالب الشراء */}
                  <tr className="border-b border-slate-300 h-12 sm:h-16 print:h-12">
                    <td className="p-2 border-l border-slate-300 font-bold text-slate-700">{poData.requesterRole}</td>
                    <td className="p-2 border-l border-slate-300 font-bold text-slate-900">{poData.requesterName || "طالب الشراء"}</td>
                    <td className="p-2 border-l border-slate-300">
                      <div className="h-7 sm:h-8 border-b border-dashed border-gray-300 mx-auto w-24 sm:w-32"></div>
                    </td>
                    <td className="p-2 text-slate-600 font-medium text-[11px]">{poData.orderDate}</td>
                  </tr>

                  {/* صاحب الصلاحية (المدير التنفيذي) */}
                  <tr className="h-12 sm:h-16 print:h-12">
                    <td className="p-2 border-l border-slate-300 font-bold text-slate-700">{poData.approverRole}</td>
                    <td className="p-2 border-l border-slate-300 font-bold text-slate-900">{poData.approverName || "المدير التنفيذي"}</td>
                    <td className="p-2 border-l border-slate-300">
                      {poData.approverSignatureUrl ? (
                        <img src={poData.approverSignatureUrl} alt="التوقيع" className="max-h-10 mx-auto object-contain" />
                      ) : (
                        <div className="h-7 sm:h-8 border-b border-dashed border-gray-300 mx-auto w-24 sm:w-32"></div>
                      )}
                    </td>
                    <td className="p-2 text-slate-600 font-medium text-[11px]">{poData.orderDate}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* تذييل أمر الشراء */}
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
            box-sizing: border-box !important;
          }
          html, body {
            background-color: white !important;
            color: #0f172a !important;
            margin: 0 !important;
            padding: 0 !important;
            width: 100% !important;
            height: 100% !important;
            overflow: visible !important;
          }
          .print\\:hidden, header, nav, aside {
            display: none !important;
          }
          .min-h-screen {
            background-color: white !important;
            padding: 0 !important;
            min-height: 0 !important;
            height: auto !important;
          }
          .print-container {
            width: 100% !important;
            max-width: 100% !important;
            box-shadow: none !important;
            padding: 0 !important;
            margin: 0 !important;
            min-height: auto !important;
            height: 100% !important;
            overflow: visible !important;
            page-break-after: avoid !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          .print-inner {
            padding: 0 !important;
            min-height: auto !important;
            height: 100% !important;
          }
          tr, table, .break-inside-avoid {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
        }
      `}</style>
    </div>
  );
}
