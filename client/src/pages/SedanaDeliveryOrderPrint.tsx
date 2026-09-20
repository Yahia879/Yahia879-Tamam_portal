import React, { useMemo } from "react";
import { useParams, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { ArrowRight, Printer, Loader2, AlertCircle, CheckCircle2, Building2 } from "lucide-react";
import { useDocumentTitle } from "@/contexts/DocumentTitleContext";

export default function SedanaDeliveryOrderPrint() {
  const params = useParams<{ id: string; deliveryId?: string }>();
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const requestId = parseInt(params.id || "0");

  useDocumentTitle(`أمر تسليم مستودعي #${requestId} - سدانة`);

  // 1. جلب بيانات المستودع الافتراضي والطلب
  const {
    data: inventoryData,
    isLoading,
    error,
  } = trpc.sedanaExecution.getVirtualInventory.useQuery(
    { requestId },
    { enabled: !!requestId && requestId > 0 }
  );

  // 2. جلب إعدادات الجمعية والشعار
  const { data: orgSettings } = trpc.organization.getSettings.useQuery();

  const req = inventoryData?.request;
  const mosque = inventoryData?.mosque;
  const deliveryOrders = inventoryData?.deliveryOrders || [];

  // تحديد أمر التسليم المطلوب عرضه (إما المعطى في المعامل أو الأحدث)
  const currentDelivery = useMemo(() => {
    if (params.deliveryId) {
      return deliveryOrders.find((d: any) => d.id === params.deliveryId || d.deliveryNumber === params.deliveryId);
    }
    return deliveryOrders[deliveryOrders.length - 1] || null;
  }, [deliveryOrders, params.deliveryId]);

  const orgName = orgSettings?.officialReportsName || orgSettings?.organizationName || "جمعية عمارة المساجد (منارة)";
  const logoUrl = orgSettings?.logoUrl || "/logo.png";

  const items = currentDelivery?.items || inventoryData?.inventoryItems || [];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center gap-3" dir="rtl">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">جاري تحميل أمر التسليم...</p>
      </div>
    );
  }

  if (error || !req) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center gap-3 text-center p-4" dir="rtl">
        <AlertCircle className="w-10 h-10 text-destructive" />
        <h2 className="text-lg font-bold">تعذر عرض أمر التسليم</h2>
        <p className="text-sm text-muted-foreground max-w-md">
          {error?.message || "لم يتم العثور على بيانات الطلب أو المستودع."}
        </p>
        <Button variant="outline" onClick={() => window.history.back()} className="mt-2">
          العودة
        </Button>
      </div>
    );
  }

  const deliveryNumber = currentDelivery?.deliveryNumber || `DEL-${req.id}-01`;
  const disbursementCode = currentDelivery?.disbursementVoucherCode || `DV-SED-${req.id}-01`;
  const scheduledDate = currentDelivery?.scheduledDate || new Date().toISOString().split("T")[0];
  const recipientName = currentDelivery?.recipientName || "إمام المسجد";
  const recipientRole = currentDelivery?.recipientRole || "إمام المسجد";

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 py-6 print:py-0 print:bg-white text-slate-800" dir="rtl">
      {/* شريط الإجراءات العلوي غير المطبوع */}
      <div className="max-w-[210mm] mx-auto mb-4 px-4 flex items-center justify-between print:hidden">
        <Button
          variant="outline"
          size="sm"
          onClick={() => window.history.back()}
          className="gap-1.5 text-xs font-semibold"
        >
          <ArrowRight className="w-4 h-4" />
          العودة
        </Button>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={() => window.print()}
            className="gap-1.5 text-xs font-bold bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm"
          >
            <Printer className="w-4 h-4" />
            طباعة أمر التسليم (A4)
          </Button>
        </div>
      </div>

      {/* ورقة التقرير الرسمية A4 */}
      <div className="w-full max-w-[210mm] mx-auto bg-white shadow-xl print:shadow-none p-8 sm:p-12 print:p-8 min-h-[297mm] print:min-h-0 relative flex flex-col justify-between border border-slate-200 print:border-none">
        <div className="space-y-6">
          {/* الترويسة الرسمية */}
          <div className="flex justify-between items-start border-b-2 border-slate-300 pb-4">
            <div className="flex items-center gap-3">
              {logoUrl ? (
                <img
                  src={logoUrl}
                  alt={orgName}
                  className="h-16 w-auto object-contain max-w-[120px]"
                />
              ) : (
                <div className="w-14 h-14 rounded-lg bg-emerald-50 text-emerald-800 flex items-center justify-center font-bold text-xl border border-emerald-200">
                  سدانة
                </div>
              )}
              <div>
                <h1 className="font-extrabold text-sm sm:text-base text-slate-900 leading-tight">
                  {orgName}
                </h1>
                <p className="text-xs text-slate-600 font-semibold mt-0.5">
                  برنامج سدانة لتشغيل وصيانة بيوت الله
                </p>
                <p className="text-[11px] text-slate-500 font-mono">
                  إدارة المستودع الافتراضي والتشغيل
                </p>
              </div>
            </div>

            <div className="text-left font-mono text-xs space-y-1">
              <div className="font-bold text-sm text-slate-900 bg-slate-100 px-2.5 py-1 rounded border border-slate-200 inline-block">
                أمر تسليم مستودعي
              </div>
              <p className="text-slate-600 pt-1">
                رقم الأمر: <span className="font-bold text-slate-800">{deliveryNumber}</span>
              </p>
              <p className="text-slate-600">
                مسوغ الصرف: <span className="font-bold text-slate-800">{disbursementCode}</span>
              </p>
              <p className="text-slate-600">
                رقم الطلب: <span className="font-bold text-slate-800">#{req.requestNumber || req.id}</span>
              </p>
              <p className="text-slate-600">
                تاريخ التسليم: <span className="font-bold text-slate-800">{scheduledDate}</span>
              </p>
            </div>
          </div>

          {/* مربعات المعلومات الأساسية */}
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-3 rounded-lg border border-slate-200 bg-slate-50/70 space-y-1">
              <p className="text-[11px] font-bold text-slate-500">بيانات المسجد المستفيد:</p>
              <p className="font-bold text-slate-900 text-sm">{mosque?.name || "المسجد"}</p>
              <p className="text-slate-600">
                المدينة: <span className="font-semibold text-slate-800">{mosque?.city || "-"}</span> | الحي: <span className="font-semibold text-slate-800">{mosque?.district || "-"}</span>
              </p>
            </div>

            <div className="p-3 rounded-lg border border-slate-200 bg-slate-50/70 space-y-1">
              <p className="text-[11px] font-bold text-slate-500">المستلم المعتمد بالمسجد:</p>
              <p className="font-bold text-slate-900 text-sm">{recipientName}</p>
              <p className="text-slate-600">
                الصفة: <span className="font-semibold text-slate-800">{recipientRole}</span>
                {currentDelivery?.recipientPhone && (
                  <span> | الجوال: <span className="font-semibold text-slate-800 font-mono">{currentDelivery.recipientPhone}</span></span>
                )}
              </p>
            </div>
          </div>

          {/* جدول البنود والكميات الموردة */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold text-slate-900">
                بيانات المواد والبنود المسلّمة للمسجد:
              </h2>
              <span className="text-[11px] text-slate-500 font-semibold">
                إجمالي البنود: ({items.length}) صنف
              </span>
            </div>

            <div className="border border-slate-300 rounded overflow-hidden">
              <table className="w-full text-xs text-right">
                <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-300">
                  <tr>
                    <th className="p-2 w-10 text-center">#</th>
                    <th className="p-2">الصنف والمواصفات</th>
                    <th className="p-2 text-center w-20">الوحدة</th>
                    <th className="p-2 text-center w-24">الكمية المسلّمة</th>
                    <th className="p-2 text-center w-32">المطابقة والفحص</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {items.map((it: any, idx: number) => {
                    const itemName = it.itemName || it.name || `بند رقم ${idx + 1}`;
                    const qty = it.quantity || it.approvedQty || 1;
                    const unit = it.unit || "وحدة";
                    return (
                      <tr key={it.id || idx} className="hover:bg-slate-50/50">
                        <td className="p-2 text-center font-mono text-slate-600">{idx + 1}</td>
                        <td className="p-2 font-medium text-slate-900">
                          <div>{itemName}</div>
                          {it.description && (
                            <div className="text-[10px] text-slate-500 mt-0.5">{it.description}</div>
                          )}
                        </td>
                        <td className="p-2 text-center text-slate-600">{unit}</td>
                        <td className="p-2 text-center font-bold text-slate-900 font-mono">
                          {qty}
                        </td>
                        <td className="p-2 text-center text-[11px] text-emerald-700 font-semibold">
                          مطابق وسليم ✓
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* شروط وتعليمات الاستلام */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-[11px] text-slate-600 space-y-1">
            <p className="font-bold text-slate-800">إقرار وتعهد الاستلام:</p>
            <p>
              يقر المستلم الموضح اسمه وبياناته أعلاه باستلام البنود والأصناف المبينة بهذا النموذج بحالة ممتازة ومطابقة للمواصفات والكميات المعتمدة، وتدخل في عهدة المسجد التشغيلية للغرض المخصص لها تحت مظلة برنامج سدانة.
            </p>
            {currentDelivery?.confirmation?.confirmedAt && (
              <p className="text-emerald-700 font-bold flex items-center gap-1 pt-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                تم تأكيد الاستلام رقمياً عبر النظام بتاريخ {new Date(currentDelivery.confirmation.confirmedAt).toLocaleDateString("ar-SA")}.
              </p>
            )}
          </div>
        </div>

        {/* قسم التوقيعات والاعتماد */}
        <div className="pt-8 border-t border-slate-300 grid grid-cols-2 gap-8 text-xs text-center">
          <div className="space-y-2">
            <p className="font-bold text-slate-700">مسلِّم العهدة (مندوب الجمعية / أمين المستودع)</p>
            <p className="text-slate-500">الاسم: .....................................................</p>
            <p className="text-slate-500">التوقيع: .....................................................</p>
            <p className="text-slate-500">التاريخ: ........ / ........ / ................</p>
          </div>

          <div className="space-y-2">
            <p className="font-bold text-slate-700">مستلم العهدة بالمسجد (الإمام / المؤذن)</p>
            <p className="text-slate-500">الاسم: {recipientName || "....................................................."}</p>
            <p className="text-slate-500">
              التوقيع: {currentDelivery?.confirmation?.signatureUrl ? (
                <span className="font-bold text-emerald-700">توقيع رقمي موثق ✓</span>
              ) : "....................................................."}
            </p>
            <p className="text-slate-500">التاريخ: {currentDelivery?.deliveredDate || "........ / ........ / ................"}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
