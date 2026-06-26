import { useParams, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { ArrowRight, Printer, CheckCircle2, Building, Landmark, Receipt, FileText } from "lucide-react";
import { usePermission } from "@/hooks/usePermission";

// ╪»╪º┘ä╪⌐ ╪¬╪¡┘ê┘è┘ä ╪º┘ä╪ú╪▒┘é╪º┘à ╪Ñ┘ä┘ë ┘å╪╡ ╪╣╪▒╪¿┘è
function numberToArabicText(num: number): string {
  if (num === 0) return "╪╡┘ü╪▒";
  
  const ones = ["", "┘ê╪º╪¡╪»", "╪º╪½┘å╪º┘å", "╪½┘ä╪º╪½╪⌐", "╪ú╪▒╪¿╪╣╪⌐", "╪«┘à╪│╪⌐", "╪│╪¬╪⌐", "╪│╪¿╪╣╪⌐", "╪½┘à╪º┘å┘è╪⌐", "╪¬╪│╪╣╪⌐"];
  const tens = ["", "╪╣╪┤╪▒", "╪╣╪┤╪▒┘ê┘å", "╪½┘ä╪º╪½┘ê┘å", "╪ú╪▒╪¿╪╣┘ê┘å", "╪«┘à╪│┘ê┘å", "╪│╪¬┘ê┘å", "╪│╪¿╪╣┘ê┘å", "╪½┘à╪º┘å┘ê┘å", "╪¬╪│╪╣┘ê┘å"];
  const teens = ["╪╣╪┤╪▒╪⌐", "╪ú╪¡╪» ╪╣╪┤╪▒", "╪º╪½┘å╪º ╪╣╪┤╪▒", "╪½┘ä╪º╪½╪⌐ ╪╣╪┤╪▒", "╪ú╪▒╪¿╪╣╪⌐ ╪╣╪┤╪▒", "╪«┘à╪│╪⌐ ╪╣╪┤╪▒", "╪│╪¬╪⌐ ╪╣╪┤╪▒", "╪│╪¿╪╣╪⌐ ╪╣╪┤╪▒", "╪½┘à╪º┘å┘è╪⌐ ╪╣╪┤╪▒", "╪¬╪│╪╣╪⌐ ╪╣╪┤╪▒"];
  const hundreds = ["", "┘à╪º╪ª╪⌐", "┘à╪º╪ª╪¬╪º┘å", "╪½┘ä╪º╪½┘à╪º╪ª╪⌐", "╪ú╪▒╪¿╪╣┘à╪º╪ª╪⌐", "╪«┘à╪│┘à╪º╪ª╪⌐", "╪│╪¬┘à╪º╪ª╪⌐", "╪│╪¿╪╣┘à╪º╪ª╪⌐", "╪½┘à╪º┘å┘à╪º╪ª╪⌐", "╪¬╪│╪╣┘à╪º╪ª╪⌐"];

  function convertHundreds(n: number): string {
    if (n === 0) return "";
    if (n < 10) return ones[n];
    if (n < 20) return teens[n - 10];
    if (n < 100) {
      const t = Math.floor(n / 10);
      const o = n % 10;
      return o ? `${ones[o]} ┘ê${tens[t]}` : tens[t];
    }
    const h = Math.floor(n / 100);
    const rest = n % 100;
    return rest ? `${hundreds[h]} ┘ê${convertHundreds(rest)}` : hundreds[h];
  }

  function convertThousands(n: number): string {
    if (n < 1000) return convertHundreds(n);
    const thousands = Math.floor(n / 1000);
    const rest = n % 1000;
    let result = "";
    if (thousands === 1) result = "╪ú┘ä┘ü";
    else if (thousands === 2) result = "╪ú┘ä┘ü╪º┘å";
    else if (thousands >= 3 && thousands <= 10) result = `${ones[thousands]} ╪ó┘ä╪º┘ü`;
    else result = `${convertHundreds(thousands)} ╪ú┘ä┘ü`;
    return rest ? `${result} ┘ê${convertHundreds(rest)}` : result;
  }

  function convertMillions(n: number): string {
    if (n < 1000000) return convertThousands(n);
    const millions = Math.floor(n / 1000000);
    const rest = n % 1000000;
    let result = "";
    if (millions === 1) result = "┘à┘ä┘è┘ê┘å";
    else if (millions === 2) result = "┘à┘ä┘è┘ê┘å╪º┘å";
    else if (millions >= 3 && millions <= 10) result = `${ones[millions]} ┘à┘ä╪º┘è┘è┘å`;
    else result = `${convertThousands(millions)} ┘à┘ä┘è┘ê┘å`;
    return rest ? `${result} ┘ê${convertThousands(rest)}` : result;
  }

  return `┘ü┘é╪╖ ${convertMillions(Math.floor(num))} ╪▒┘è╪º┘ä`;
}

// ╪»╪º┘ä╪⌐ ╪¬╪¡┘ê┘è┘ä ╪º┘ä╪¬╪º╪▒┘è╪« ╪º┘ä┘à┘è┘ä╪º╪»┘è ╪Ñ┘ä┘ë ┘ç╪¼╪▒┘è (╪¬┘é╪▒┘è╪¿┘è)
function toHijriDate(date: Date): string {
  const gregorianYear = date.getFullYear();
  const gregorianMonth = date.getMonth() + 1;
  const gregorianDay = date.getDate();
  
  const hijriYear = Math.floor((gregorianYear - 622) * (33 / 32));
  const hijriMonth = ((gregorianMonth + 9) % 12) + 1;
  const hijriDay = gregorianDay;
  
  return `${hijriDay} / ${hijriMonth} / ${hijriYear} ┘ç┘Ç`;
}

function formatGregorianDate(date: Date): string {
  return `${date.getFullYear()} / ${date.getMonth() + 1} / ${date.getDate()} ┘à`;
}

const PAYMENT_METHOD_MAP: Record<string, string> = {
  bank_transfer: "╪¬╪¡┘ê┘è┘ä ╪¿┘å┘â┘è",
  check: "╪Ñ╪╡╪»╪º╪▒ ╪┤┘è┘â",
  custody: "╪╡╪▒┘ü ┘à┘å ╪º┘ä╪╣┘ç╪»╪⌐",
  sadad: "╪│╪»╪º╪»",
};

export default function DisbursementOrderPrint() {
  const params = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const hasOrderViewPermission = usePermission("disbursement_orders.view");

  const { data: order, isLoading } = trpc.disbursements.getOrderById.useQuery(
    { id: parseInt(params.id || "0") },
    { enabled: !!params.id }
  );

  const { data: orgSettings } = trpc.organization.getSettings.useQuery();

  const handlePrint = () => {
    window.print();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!hasOrderViewPermission) {
    return (
      <div className="flex items-center justify-center min-h-screen text-red-500 font-bold" dir="rtl">
        ╪╣╪░╪▒╪º┘ï╪î ┘ä╪º ╪¬┘à┘ä┘â ╪╡┘ä╪º╪¡┘è╪⌐ ╪╣╪▒╪╢ ╪ú┘à╪▒ ╪º┘ä╪╡╪▒┘ü.
      </div>
    );
  }

  if (!order) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-xl font-bold mb-2">╪ú┘à╪▒ ╪º┘ä╪╡╪▒┘ü ╪║┘è╪▒ ┘à┘ê╪¼┘ê╪»</h2>
          <Button onClick={() => navigate("/disbursements")}>
            ╪º┘ä╪╣┘ê╪»╪⌐ ┘ä╪╖┘ä╪¿╪º╪¬ ╪º┘ä╪╡╪▒┘ü
          </Button>
        </div>
      </div>
    );
  }
  const amount = parseFloat(order.amount?.toString() || "0");
  const request = order.disbursementRequest;
  const project = order.project;
  const orderDate = new Date(order.createdAt || new Date());

  // ╪¬╪¡┘ä┘è┘ä ╪¬┘ü╪º╪╡┘è┘ä ╪º┘ä┘à╪▒┘ü┘é╪º╪¬ ╪º┘ä┘à╪«╪╡╪╡╪⌐
  let customSupplier: any = null;
  let linkedRequestInfo: any = null;
  if (request?.attachmentsJson) {
    try {
      const attachments = JSON.parse(request.attachmentsJson);
      if (Array.isArray(attachments)) {
        const infoAttachment = attachments.find((a: any) => a.name === "custom_supplier_info");
        if (infoAttachment && infoAttachment.url) {
          customSupplier = JSON.parse(infoAttachment.url);
        }
        const linkedAttachment = attachments.find((a: any) => a.name === "linked_request_info");
        if (linkedAttachment && linkedAttachment.url) {
          linkedRequestInfo = JSON.parse(linkedAttachment.url);
        }
      }
    } catch (e) {
      console.error("Error parsing supplier/linked print metadata:", e);
    }
  }

  // ╪¡╪│╪º╪¿ ╪¼┘ç╪⌐ ╪º┘ä╪¬┘à┘ê┘è┘ä/╪º┘ä╪»╪╣┘à
  const resolvedSupportingEntity = customSupplier?.fundingSupport || linkedRequestInfo?.fundingSupport || project?.fundingSource || "ΓÇö";

  return (
    <div className="min-h-screen bg-gray-100 py-8 print:py-0 print:bg-white" dir="rtl">
      {/* ╪ú╪▓╪▒╪º╪▒ ╪º┘ä╪¬╪¡┘â┘à */}
      <div className="print:hidden w-full bg-white/90 backdrop-blur border-b p-3 sticky top-0 z-50 flex justify-between items-center sm:fixed sm:top-4 sm:right-4 sm:w-auto sm:bg-transparent sm:backdrop-blur-none sm:border-0 sm:p-0 sm:justify-end sm:gap-2">
        <Button 
          variant="outline" 
          onClick={() => {
            if (window.history.length > 1) {
              window.history.back();
            } else {
              navigate("/disbursements");
            }
          }} 
          className="bg-white border shadow-sm sm:bg-white/90"
        >
          <ArrowRight className="ml-2 h-4 w-4" />
          ╪▒╪¼┘ê╪╣
        </Button>
        <Button onClick={handlePrint} className="shadow-md gradient-primary text-white font-semibold">
          <Printer className="ml-2 h-4 w-4" />
          ╪¬┘å╪▓┘è┘ä PDF / ╪╖╪¿╪º╪╣╪⌐
        </Button>
      </div>

      {/* ╪╡┘ü╪¡╪⌐ ╪º┘ä╪╖╪¿╪º╪╣╪⌐ - ╪¬╪╡┘à┘è┘à ┘à╪¬┘ê╪º╪▓┘å ┘ä╪╡┘ü╪¡╪⌐ A4 */}
      <div className="print-container w-full max-w-[210mm] mx-auto bg-white shadow-lg print:shadow-none p-4 sm:p-8 print:p-0 min-h-[297mm] relative flex flex-col justify-start">
        {/* ╪Ñ╪╖╪º╪▒ ┘à╪▓╪»┘ê╪¼ ┘ü╪º╪«╪▒ ┘ä┘ä┘à╪│╪¬┘å╪» ┘è╪┤╪¿┘ç ┘é╪º┘ä╪¿ ╪º┘ä╪╣┘é┘ê╪» */}
        <div className="print-inner border-[3px] border-[#1a5f4a] p-4 sm:p-6 rounded-lg relative overflow-hidden bg-white print:border-[2px] print:p-5 h-full flex-1 flex flex-col justify-start min-h-[277mm]">
          {/* ╪«╪╖ ╪░┘ç╪¿┘è ╪»╪º╪«┘ä┘è ╪▒┘ü┘è╪╣ ┘ä┘ä╪Ñ╪╖╪º╪▒ */}
          <div className="absolute inset-1.5 border border-[#d4a574] rounded pointer-events-none"></div>

          {/* ┘à╪¡╪¬┘ê┘ë ╪º┘ä┘à╪│╪¬┘å╪» */}
          <div className="relative z-10 flex-1 flex flex-col justify-start space-y-4">
            <div>
              {/* ╪º┘ä╪¬╪▒┘ê┘è╪│╪⌐ - ╪º┘ä╪┤╪╣╪º╪▒ ┘ê╪º┘ä╪¬╪º╪▒┘è╪« ┘à╪½┘ä ┘é╪º┘ä╪¿ ╪º┘ä╪╣┘é╪» */}
              <div className="flex flex-col gap-4 sm:flex-row sm:justify-between sm:items-start mb-6">
                <div className="flex items-center gap-3">
                  {orgSettings?.logoUrl ? (
                    <img src={orgSettings.logoUrl} alt="╪┤╪╣╪º╪▒ ╪º┘ä╪¼┘à╪╣┘è╪⌐" className="h-16 w-auto print:h-14" />
                  ) : (
                    <div className="w-16 h-16 bg-primary/10 rounded-lg flex items-center justify-center print:w-14 print:h-14">
                      <span className="text-primary font-bold text-2xl">╪¬┘à╪º┘à</span>
                    </div>
                  )}
                  <div>
                    <div className="text-base font-bold text-[#1a5f4a] print:text-sm">
                      {orgSettings?.organizationName || "╪¼┘à╪╣┘è╪⌐ ╪¬┘à╪º┘à ┘ä┘ä╪╣┘å╪º┘è╪⌐ ╪¿╪º┘ä┘à╪│╪º╪¼╪»"}
                    </div>
                    <div className="text-xs text-gray-550 font-medium">┘à┘â╪¬╪¿ ╪Ñ╪»╪º╪▒╪⌐ ╪º┘ä┘à╪┤╪º╪▒┘è╪╣ PMO</div>
                  </div>
                </div>
              </div>

              {/* ╪º┘ä╪¬╪▒┘ê┘è╪│╪⌐ ╪º┘ä╪╣┘ä┘ê┘è╪⌐ - ╪┤╪▒┘è╪╖ ╪º┘ä╪╣┘å┘ê╪º┘å ╪º┘ä╪▒┘à╪º╪»┘è ╪º┘ä╪»╪º┘â┘å */}
              <div className="flex bg-slate-700 text-white font-bold text-base sm:text-lg mb-4 rounded overflow-hidden">
                <div className="w-20 sm:w-28 bg-slate-600/50 flex items-center justify-center border-l border-slate-600 text-center py-2 px-3 font-mono">
                  {order.orderNumber}
                </div>
                <div className="flex-1 text-center py-2 font-display">
                  ╪ú┘à╪▒ ╪╡╪▒┘ü | {PAYMENT_METHOD_MAP[order.paymentMethod || "bank_transfer"]}
                </div>
              </div>

              {/* ╪º┘ä╪¬╪º╪▒┘è╪« ┘ê╪º┘ä┘à┘ê╪º┘ü┘é */}
              <div className="grid grid-cols-2 gap-4 mb-4 text-xs sm:text-sm">
                <div className="flex border border-slate-300 rounded overflow-hidden">
                  <span className="p-2.5 bg-slate-100 font-bold border-l border-slate-300 text-slate-700 w-24 shrink-0 text-center">╪º┘ä╪¬╪º╪▒┘è╪«</span>
                  <span className="p-2.5 text-slate-800 font-medium flex-1 text-center" dir="rtl">{toHijriDate(orderDate)}</span>
                </div>
                <div className="flex border border-slate-300 rounded overflow-hidden">
                  <span className="p-2.5 bg-slate-100 font-bold border-l border-slate-300 text-slate-700 w-24 shrink-0 text-center">╪º┘ä┘à┘ê╪º┘ü┘é</span>
                  <span className="p-2.5 text-slate-800 font-medium flex-1 text-center">{formatGregorianDate(orderDate)}</span>
                </div>
              </div>

              {/* ╪¼╪»┘ê┘ä ╪º┘ä┘à╪╣┘ä┘ê┘à╪º╪¬ ╪º┘ä╪ú╪│╪º╪│┘è ┘ä╪ú┘à╪▒ ╪º┘ä╪╡╪▒┘ü */}
              <div className="mb-4">
                <table className="w-full border-collapse border border-slate-300 text-xs sm:text-sm">
                  <tbody>
                    <tr className="border-b border-slate-300">
                      <td className="p-2.5 text-slate-800 font-bold text-right" colSpan={2}>
                        {order.beneficiaryName}
                      </td>
                      <td className="p-2.5 bg-slate-100 font-bold w-36 border-r border-slate-300 text-slate-700 text-right">
                        ╪º╪╡╪▒┘ü┘ê╪º ┘ä┘ä┘à┘â╪▒┘à/
                      </td>
                    </tr>
                    
                    <tr className="border-b border-slate-300">
                      <td className="p-2.5 text-slate-800 font-black font-mono text-right">
                        {amount.toLocaleString()} ╪▒┘è╪º┘ä
                      </td>
                      <td className="p-2.5 bg-slate-50 font-bold w-20 border-r border-slate-300 text-slate-600 text-center">
                        ╪▒┘é┘à╪º┘ï
                      </td>
                      <td className="p-2.5 bg-slate-100 font-bold w-36 border-r border-slate-300 text-slate-700 text-right" rowSpan={2}>
                        ┘à╪¿┘ä╪║ ┘ê┘é╪»╪▒┘ç/
                      </td>
                    </tr>
                    
                    <tr className="border-b border-slate-300">
                      <td className="p-2.5 text-slate-700 font-semibold text-right">
                        {numberToArabicText(amount)} ┘ä╪º ╪║┘è╪▒
                      </td>
                      <td className="p-2.5 bg-slate-50 font-bold w-20 border-r border-slate-300 text-slate-600 text-center">
                        ┘â╪¬╪º╪¿╪⌐
                      </td>
                    </tr>

                    <tr className="border-b border-slate-300">
                      <td className="p-2.5 text-slate-800 font-mono font-bold text-right" colSpan={2}>
                        {request?.requestNumber || "ΓÇö"}
                      </td>
                      <td className="p-2.5 bg-slate-100 font-bold w-36 border-r border-slate-300 text-slate-700 text-right">
                        ╪▒┘é┘à ╪╖┘ä╪¿ ╪º┘ä╪╡╪▒┘ü/
                      </td>
                    </tr>

                    <tr>
                      <td className="p-2.5 text-slate-600 font-semibold text-right" colSpan={2}>
                        {customSupplier?.customProjectName || request?.description || request?.title || "ΓÇö"}
                      </td>
                      <td className="p-2.5 bg-slate-100 font-bold w-36 border-r border-slate-300 text-slate-700 text-right">
                        ┘ê╪░┘ä┘â ┘à┘é╪º╪¿┘ä/
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* ┘é╪│┘à ╪«╪º╪╡ ╪¿╪º┘ä┘à╪┤╪º╪▒┘è╪╣ */}
              <div className="mb-4">
                <div className="text-right font-bold text-xs sm:text-sm mb-1.5 text-slate-800">
                  ╪«╪º╪╡ ╪¿╪º┘ä┘à╪┤╪º╪▒┘è╪╣:
                </div>
                <table className="w-full border-collapse border border-slate-300 text-xs sm:text-sm">
                  <tbody>
                    <tr className="border-b border-slate-300">
                      <td className="p-2.5 text-slate-800 font-bold text-right" colSpan={3}>
                        {project?.name || customSupplier?.customProjectName || "ΓÇö"}
                      </td>
                      <td className="p-2.5 bg-slate-100 font-bold w-40 border-r border-slate-300 text-slate-700 text-right">
                        ╪º╪│┘à ╪º┘ä┘à╪┤╪▒┘ê╪╣
                      </td>
                    </tr>
                    
                    <tr className="border-b border-slate-300">
                      <td className="p-2.5 text-slate-800 font-bold text-right" colSpan={3}>
                        {resolvedSupportingEntity}
                      </td>
                      <td className="p-2.5 bg-slate-100 font-bold w-40 border-r border-slate-300 text-slate-700 text-right">
                        ╪º┘ä╪¼┘ç╪⌐ ╪º┘ä╪»╪º╪╣┘à╪⌐
                      </td>
                    </tr>
                    
                    <tr className="border-b border-slate-300">
                      <td className="p-2.5 bg-slate-100 font-bold text-slate-700 text-center w-1/4">
                        ╪Ñ╪¼┘à╪º┘ä┘è ┘é┘è┘à╪⌐ ╪º┘ä╪»╪╣┘à
                      </td>
                      <td className="p-2.5 text-slate-800 font-mono text-center w-1/4 border-l border-slate-300">
                        {project ? `${project.fundingAmount.toLocaleString()} ╪▒┘è╪º┘ä` : "ΓÇö"}
                      </td>
                      <td className="p-2.5 bg-slate-100 font-bold border-r border-slate-300 text-slate-700 text-center w-1/4">
                        ╪Ñ╪¼┘à╪º┘ä┘è ┘é┘è┘à╪⌐ ╪º┘ä╪╣┘é╪»
                      </td>
                      <td className="p-2.5 text-slate-800 font-mono text-center w-1/4">
                        {project ? `${project.contractAmount.toLocaleString()} ╪▒┘è╪º┘ä` : "ΓÇö"}
                      </td>
                    </tr>

                    <tr>
                      <td className="p-2.5 bg-slate-100 font-bold text-slate-700 text-center w-1/4">
                        ╪Ñ╪¼┘à╪º┘ä┘è ┘à╪º ╪¬┘à ╪»┘ü╪╣┘ç
                      </td>
                      <td className="p-2.5 text-slate-800 font-mono text-center w-1/4 border-l border-slate-300">
                        {project ? `${project.totalPaid.toLocaleString()} ╪▒┘è╪º┘ä` : "ΓÇö"}
                      </td>
                      <td className="p-2.5 bg-slate-100 font-bold border-r border-slate-300 text-slate-700 text-center w-1/4">
                        ╪º┘ä┘à╪¿┘ä╪║ ╪º┘ä┘à╪¬╪¿┘é┘è ╪¿╪╣╪» ╪╡╪▒┘ü ╪º┘ä┘à╪¿┘ä╪║ ╪ú╪╣┘ä╪º┘ç
                      </td>
                      <td className="p-2.5 text-slate-800 font-mono text-center w-1/4">
                        {project ? `${project.remainingAmount.toLocaleString()} ╪▒┘è╪º┘ä` : "ΓÇö"}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* ╪¬╪¡┘ê┘è┘ä ╪¿┘å┘â┘è ┘à┘å ╪¡╪│╪º╪¿ ╪º┘ä╪¼┘à╪╣┘è╪⌐ ╪Ñ┘ä┘ë */}
              <div className="mb-4">
                <div className="text-right font-bold text-xs sm:text-sm mb-1.5 text-slate-800">
                  ╪¬╪¡┘ê┘è┘ä ╪¿┘å┘â┘è ┘à┘å ╪¡╪│╪º╪¿ ╪º┘ä╪¼┘à╪╣┘è╪⌐ ╪Ñ┘ä┘ë:
                </div>
                <table className="w-full border-collapse border border-slate-300 text-xs sm:text-sm">
                  <tbody>
                    <tr className="border-b border-slate-300">
                      <td className="p-2.5 text-slate-800 font-bold text-right">
                        {order.beneficiaryAccountName || order.beneficiaryName || "ΓÇö"}
                      </td>
                      <td className="p-2.5 bg-slate-100 font-bold w-48 border-r border-slate-300 text-slate-700 text-right">
                        ╪º╪│┘à ╪º┘ä╪¡╪│╪º╪¿
                      </td>
                    </tr>
                    
                    <tr className="border-b border-slate-300">
                      <td className="p-2.5 text-slate-800 font-semibold text-right">
                        {order.beneficiaryBank || "ΓÇö"}
                      </td>
                      <td className="p-2.5 bg-slate-100 font-bold w-48 border-r border-slate-300 text-slate-700 text-right">
                        ╪º╪│┘à ╪º┘ä╪¿┘å┘â
                      </td>
                    </tr>

                    <tr className="border-b border-slate-300">
                      <td className="p-2.5 text-slate-800 font-mono font-bold text-right tracking-wider" dir="ltr">
                        {order.beneficiaryIban || "ΓÇö"}
                      </td>
                      <td className="p-2.5 bg-slate-100 font-bold w-48 border-r border-slate-300 text-slate-700 text-right">
                        ╪▒┘é┘à ╪º┘ä╪ó┘è╪¿╪º┘å
                      </td>
                    </tr>

                    <tr className="border-b border-slate-300">
                      <td className="p-2.5 text-slate-800 font-mono font-bold text-right">
                        {order.sadadNumber || "ΓÇö"}
                      </td>
                      <td className="p-2.5 bg-slate-100 font-bold w-48 border-r border-slate-300 text-slate-700 text-right">
                        ╪▒┘é┘à ╪│╪»╪º╪»
                      </td>
                    </tr>

                    <tr>
                      <td className="p-2.5 text-slate-800 font-mono font-bold text-right">
                        {order.billerCode || "ΓÇö"}
                      </td>
                      <td className="p-2.5 bg-slate-100 font-bold w-48 border-r border-slate-300 text-slate-700 text-right">
                        ╪▒┘à╪▓ ╪º┘ä┘à┘ü┘ê╪¬╪▒
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* ╪¼╪»┘ê┘ä ╪º┘ä╪¬┘ê┘é┘è╪╣╪º╪¬ ┘ê╪º┘ä╪º╪╣╪¬┘à╪º╪» ╪º┘ä┘ü╪º╪«╪▒ ┘ä╪º┘à╪▒ ╪º┘ä╪╡╪▒┘ü */}
            <div className="mt-6 break-inside-avoid">
              <table className="w-full border-collapse border border-slate-300 text-xs sm:text-sm text-center">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-300 font-bold text-slate-750">
                    <th className="p-2 border-l border-slate-300 w-1/4">╪º┘ä┘ê╪╕┘è┘ü╪⌐</th>
                    <th className="p-2 border-l border-slate-300 w-1/4">╪º┘ä╪º╪│┘à</th>
                    <th className="p-2 border-l border-slate-300 w-1/4">╪º┘ä╪¬┘ê┘é┘è╪╣</th>
                    <th className="p-2 w-1/4">╪º┘ä╪¬╪º╪▒┘è╪«</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-slate-300 h-14">
                    <td className="p-2 border-l border-slate-300 font-bold text-slate-700">╪º┘ä┘à╪¡╪º╪│╪¿</td>
                    <td className="p-2 border-l border-slate-300 font-bold text-slate-900">{orgSettings?.accountantName || "ΓÇö"}</td>
                    <td className="p-2 border-l border-slate-300"></td>
                    <td className="p-2 text-slate-700 font-semibold">{formatGregorianDate(orderDate)}</td>
                  </tr>
                  <tr className="h-14">
                    <td className="p-2 border-l border-slate-300 font-bold text-slate-700">╪º┘ä┘à╪»┘è╪▒ ╪º┘ä╪¬┘å┘ü┘è╪░┘è</td>
                    <td className="p-2 border-l border-slate-300 font-bold text-slate-900">{orgSettings?.executiveDirectorName || "ΓÇö"}</td>
                    <td className="p-2 border-l border-slate-300"></td>
                    <td className="p-2 text-slate-700 font-semibold">{formatGregorianDate(orderDate)}</td>
                  </tr>
                </tbody>
              </table>

              {/* ╪¬╪░┘è┘è┘ä ╪º┘ä┘à╪│╪¬┘å╪» ╪º┘ä┘ü╪º╪«╪▒ */}
              <div className="mt-6 pt-3 border-t border-gray-100 text-center text-slate-400 text-[10px] flex justify-between items-center px-2">
                <span className="font-medium">╪¬┘à ╪Ñ┘å╪┤╪º╪í ┘ç╪░╪º ╪º┘ä┘à╪│╪¬┘å╪» ╪ó┘ä┘è╪º┘ï ┘à┘å ┘å╪╕╪º┘à ╪¿┘ê╪º╪¿╪⌐ ╪¬┘à╪º┘à ┘ä┘ä╪╣┘å╪º┘è╪⌐ ╪¿╪º┘ä┘à╪│╪º╪¼╪»</span>
                <span className="font-mono text-gray-500">╪¬╪º╪▒┘è╪« ╪º┘ä╪╖╪¿╪º╪╣╪⌐: {new Date().toLocaleDateString("ar-SA")} - ╪╡┘ü╪¡╪⌐ 1 ┘à┘å 1</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ╪ú┘å┘à╪º╪╖ ╪º┘ä╪╖╪¿╪º╪╣╪⌐ ╪º┘ä┘à╪¬┘é╪»┘à╪⌐ ┘ä┘ä╪¼┘à╪╣┘è╪⌐ */}
      <style>{`
        @media print {
          @page {
            size: A4;
            margin: 0 !important;
          }
          body {
            background-color: white !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .print\\:hidden {
            display: none !important;
          }
          .min-h-screen {
            background-color: white !important;
            padding: 0 !important;
          }
          .print-container {
            max-width: 100% !important;
            width: 100% !important;
            box-shadow: none !important;
            padding: 12mm !important;
            margin: 0 !important;
            min-height: 0 !important;
            height: auto !important;
          }
          .print-inner {
            min-height: 0 !important;
            height: auto !important;
          }
        }
      `}</style>
    </div>
  );
}
