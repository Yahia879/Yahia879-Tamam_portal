import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { ArrowRight, Printer, Loader2, AlertCircle } from "lucide-react";
import { numberToArabicText as baseNumberToArabicText } from "@shared/tafqeet";

function numberToArabicText(num: number): string {
  return baseNumberToArabicText(num, { prefix: "", suffix: " فقط لا غير", currency: "ريال" });
}

function toHijriDate(dateObj: Date): string {
  let formatted = "";
  try {
    formatted = new Intl.DateTimeFormat("ar-SA-u-ca-islamic", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric"
    }).format(dateObj);
  } catch (e) {
    const gregorianYear = dateObj.getFullYear();
    const hijriYear = Math.floor((gregorianYear - 622) * (33 / 32));
    const d = String(dateObj.getDate()).padStart(2, "0");
    const m = String(dateObj.getMonth() + 1).padStart(2, "0");
    formatted = `${hijriYear} / ${m} / ${d}`;
  }
  formatted = formatted.replace(/هـ/g, "").replace(/ه/g, "").trim();
  return `${formatted} هـ`;
}

function formatGregorianDate(dateObj: Date): string {
  const d = String(dateObj.getDate()).padStart(2, "0");
  const m = String(dateObj.getMonth() + 1).padStart(2, "0");
  const y = dateObj.getFullYear();
  return `${y} / ${m} / ${d} م`;
}

function getCleanVoucherNotes(notes: string | null | undefined): string {
  if (!notes) return "";
  if (notes.includes(" | ")) {
    const parts = notes.split(" | ");
    return parts[0].trim();
  }
  if (notes.startsWith("تم إلغاء الاعتماد:") || notes.startsWith("مبررات إلغاء الاعتماد:") || notes.startsWith("مرفوض")) {
    return "";
  }
  return notes;
}

export default function ReceiptVoucherPrint() {
  const params = useParams<{ id: string }>();
  const voucherId = parseInt(params.id || "0");
  const [, navigate] = useLocation();

  const [isPreparingPrint, setIsPreparingPrint] = useState<boolean>(false);

  // Fetch Voucher Data
  const { data: voucher, isLoading, error } = trpc.projects.getReceiptVoucherById.useQuery(
    { id: voucherId },
    { enabled: voucherId > 0 }
  );

  // Fetch Branding & Organization Settings (Logo, Stamp, License Number)
  const { data: orgSettings } = trpc.organization.getSettings.useQuery();

  // Reset print loading on afterprint event
  useEffect(() => {
    const handleAfterPrint = () => {
      setIsPreparingPrint(false);
    };
    window.addEventListener("afterprint", handleAfterPrint);
    return () => window.removeEventListener("afterprint", handleAfterPrint);
  }, []);


  // عرض الرقم الصافي للسند في خانة "رقم السند" بالتقرير (مثل 5 بدلاً من REC-5)
  const voucherNumDisplay = (voucher?.status === "approved" && voucher?.voucherNumber)
    ? voucher.voucherNumber.split("-").pop() || ""
    : "";

  useEffect(() => {
    if (voucher) {
      const originalTitle = document.title;
      document.title = voucher.status === "approved" ? `سند قبض رقم ${voucherNumDisplay}` : `معاينة سند قبض (غير معتمد)`;
      return () => {
        document.title = originalTitle;
      };
    }
  }, [voucher, voucherNumDisplay]);

  // Main Logo, Stamp & Signature URLs
  const mainLogoUrl = orgSettings?.logoUrl;
  const officialStampUrl = orgSettings?.stampUrl;
  const signerUser = (voucher as any)?.signerUser;
  const signatureUrl =
    signerUser?.showSignatureInDocuments !== false ? signerUser?.signatureUrl : null;

  // Print function with full image preloading (stamp, signature, logos) before window.print()
  const handlePrint = async () => {
    if (isPreparingPrint) return;
    setIsPreparingPrint(true);

    if (voucher) {
      document.title = `سند قبض رقم ${voucherNumDisplay}`;
    }

    try {
      // 1. Preload image URLs in memory
      const imageUrls: string[] = [];
      if (mainLogoUrl) imageUrls.push(mainLogoUrl);
      if (officialStampUrl) imageUrls.push(officialStampUrl);
      if (signatureUrl) imageUrls.push(signatureUrl);

      const preloadPromises = imageUrls.map((url) => {
        return new Promise<void>((resolve) => {
          const img = new Image();
          const timer = setTimeout(() => resolve(), 3500);
          img.onload = () => { clearTimeout(timer); resolve(); };
          img.onerror = () => { clearTimeout(timer); resolve(); };
          img.src = url;
          if (img.complete) { clearTimeout(timer); resolve(); }
        });
      });

      // 2. Preload DOM <img> elements
      const domImgPromises = Array.from(
        document.querySelectorAll<HTMLImageElement>('.print-card img, .print-container img')
      ).map((img) => {
        return new Promise<void>((resolve) => {
          if (img.complete && img.naturalWidth !== 0) return resolve();
          const timer = setTimeout(() => resolve(), 3500);
          img.onload = () => { clearTimeout(timer); resolve(); };
          img.onerror = () => { clearTimeout(timer); resolve(); };
        });
      });

      await Promise.all([...preloadPromises, ...domImgPromises]);
    } catch (e) {
      console.error("Print preload error:", e);
    } finally {
      setIsPreparingPrint(false);
    }

    setTimeout(() => {
      window.print();
    }, 50);
  };

  const handleBack = () => {
    if (window.history.length > 1) {
      window.history.back();
    } else if (voucher?.projectId) {
      navigate(`/projects/${voucher.projectId}`);
    } else {
      navigate("/receipt-vouchers");
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen" dir="rtl">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error || !voucher) {
    return (
      <div className="flex items-center justify-center min-h-screen" dir="rtl">
        <div className="bg-white border border-slate-200 rounded-2xl p-6 text-center space-y-4 max-w-md shadow-lg">
          <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-slate-900">سند القبض غير موجود</h3>
            <p className="text-xs text-slate-500">
              لم نتمكن من العثور على بيانات سند القبض المطلوب.
            </p>
          </div>
          <Button onClick={() => navigate("/projects")} className="font-bold text-xs bg-slate-900 text-white rounded-xl">
            العودة للمشاريع
          </Button>
        </div>
      </div>
    );
  }

  const receiptDateObj = new Date(voucher.receiptDate);
  const amountVal = parseFloat(voucher.amount.toString()) || 0;
  const tafqeetStr = numberToArabicText(amountVal);

  // License number from Branding/Org settings with fallback to 2238
  const licenseNo = orgSettings?.licenseNumber || "2238";

  // Payment Method details string
  const getPaymentMethodDetails = () => {
    const pMethod = voucher.paymentMethod;
    const bank = voucher.bankName ? `في ${voucher.bankName}` : "في بنك البلاد";
    const refDateStr = formatGregorianDate(receiptDateObj);

    if (pMethod === "cash") {
      return "استلام نقدي بالحساب المالي للجمعية";
    }
    if (pMethod === "check") {
      return `شيك مسحوب ${bank} ${voucher.referenceNumber ? `برقم (${voucher.referenceNumber})` : ""} بتاريخ ${refDateStr}`;
    }
    // Default bank transfer
    return `حوالة بنكية على حساب الجمعية ${bank} ${voucher.referenceNumber ? `بتاريخ ${refDateStr}` : ""}`;
  };

  return (
    <div className="min-h-screen bg-gray-100 py-8 print:py-0 print:bg-white" dir="rtl">
      {/* Dynamic CSS for Print Mode */}
      <style>{`
        @media print {
          @page {
            size: A4;
            margin: 0 !important;
          }
          body {
            background-color: white !important;
            color: black !important;
            padding: 0 !important;
            margin: 0 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .print\\:hidden, .no-print {
            display: none !important;
          }
          .min-h-screen {
            background-color: white !important;
            padding: 0 !important;
          }
                 .print-card {
            box-shadow: none !important;
            border: none !important;
            margin: 0 auto !important;
            padding: 20px 35px !important;
            width: 100% !important;
            max-width: 100% !important;
          }
        }
        .voucher-fixed-two-lines {
          background-image: 
            linear-gradient(to right, #94a3b8 50%, transparent 0%),
            linear-gradient(to right, #94a3b8 50%, transparent 0%);
          background-position: 0 2.1rem, 0 4.4rem;
          background-size: 8px 2px, 8px 2px;
          background-repeat: repeat-x, repeat-x;
        }
      `}</style>

      {/* Floating Action Bar (hidden on print) matching DisbursementRequestPrint layout */}
      <div className="print:hidden w-full bg-white/90 backdrop-blur border-b p-3 sticky top-0 z-50 flex flex-wrap justify-between items-center gap-2 sm:fixed sm:top-4 sm:right-4 sm:w-auto sm:bg-transparent sm:backdrop-blur-none sm:border-0 sm:p-0 sm:justify-end">
        <Button variant="outline" onClick={handleBack} className="bg-white border shadow-sm sm:bg-white/90">
          <ArrowRight className="ml-2 h-4 w-4" />
          رجوع
        </Button>

        <Button
          onClick={handlePrint}
          disabled={isPreparingPrint}
          className="shadow-md gradient-primary text-white font-semibold"
        >
          {isPreparingPrint ? (
            <>
              <Loader2 className="ml-2 h-4 w-4 animate-spin" />
              جاري تجهيز الطباعة...
            </>
          ) : (
            <>
              <Printer className="ml-2 h-4 w-4" />
              تنزيل PDF / طباعة
            </>
          )}
        </Button>
      </div>

      {/* Main Container wrapping original receipt report */}
      <div className="print-container w-full max-w-[210mm] sm:max-w-[235mm] mx-auto">
        
        {/* Main A4 Document Canvas - Original Receipt Voucher Design */}
        <div className="bg-white text-slate-900 border border-slate-300 shadow-2xl rounded-2xl p-6 sm:p-8 relative overflow-hidden print-card">
          
          {/* Subtle Islamic Geometric Watermark Overlay Background */}
          <div className="absolute inset-0 pointer-events-none opacity-[0.035] overflow-hidden flex items-center justify-center">
            <svg className="w-full h-full" viewBox="0 0 600 600" fill="none" xmlns="http://www.w3.org/2000/svg">
              <pattern id="bg-islamic-watermark" x="0" y="0" width="80" height="80" patternUnits="userSpaceOnUse">
                <path d="M40 0 L80 40 L40 80 L0 40 Z" stroke="#978457" strokeWidth="1.5" fill="none" />
                <path d="M40 10 L70 40 L40 70 L10 40 Z" stroke="#c2a76d" strokeWidth="1" fill="none" />
                <circle cx="40" cy="40" r="10" stroke="#978457" strokeWidth="1" fill="none" />
              </pattern>
              <rect width="100%" height="100%" fill="url(#bg-islamic-watermark)" />
            </svg>
          </div>

          {/* Top Header Line with License Number */}
          <div className="relative border-b-2 border-[#978457] pb-1 mb-4 flex justify-between items-center">
            <div></div>
            <div className="text-left">
              <span className="text-sm font-black text-[#978457]">رقم الترخيص {licenseNo}</span>
            </div>
          </div>

          {/* Top Header Row: Rectangular Box "سند قبض" & Main Logo */}
          <div className="flex justify-between items-center mb-5 relative z-10">
            <div className="flex items-center justify-start pt-1">
              <div className="border-2 border-[#978457] bg-[#faf8f3] text-[#978457] min-w-[170px] h-[58px] rounded-xl shadow-xs flex items-center justify-center px-5">
                <h1 className="text-2xl font-black tracking-tight leading-none text-center">
                  سند قبض
                </h1>
              </div>
            </div>

            <div className="flex justify-end items-center pt-1">
              {mainLogoUrl ? (
                <img
                  src={mainLogoUrl}
                  alt={orgSettings?.organizationName || "الشعار الرئيسي"}
                  className="max-h-20 max-w-[190px] object-contain"
                />
              ) : (
                <div className="h-16 w-36"></div>
              )}
            </div>
          </div>

          {/* Title & Dates Block */}
          <div className="relative flex items-center justify-between mb-5 pb-3 border-b border-slate-200 z-10">
            <div className="flex items-center gap-3 text-sm sm:text-base font-bold">
              <span className="text-[#1f7a63] font-black">التاريخ:</span>
              <span className="font-extrabold text-slate-900">{formatGregorianDate(receiptDateObj)}</span>
            </div>

            <div className="flex items-center gap-2">
              {voucher.status === "approved" ? (
                <>
                  <span className="text-sm sm:text-base font-black text-[#1f7a63]">رقم السند:</span>
                  <span className="text-2xl sm:text-3xl font-extrabold text-[#c5221f] tracking-wide">
                    {voucherNumDisplay}
                  </span>
                </>
              ) : (
                <div className="px-3 py-1 bg-amber-50 border border-amber-300 rounded-lg text-amber-900 text-xs sm:text-sm font-bold">
                  سند قيد الاعتماد (ينشأ رقم السند بعد الاعتماد)
                </div>
              )}
            </div>
          </div>

          {/* Main Document Content Body */}
          <div className="space-y-4 text-base sm:text-lg text-slate-900 font-bold leading-relaxed mb-6 relative z-10">
            <div className="flex items-baseline gap-3 text-right">
              <span className="text-[#1f7a63] font-black shrink-0 min-w-[110px] text-base sm:text-lg">
                استلمنا من
              </span>
              <div className="grow border-b-2 border-dotted border-slate-400 pb-1 text-slate-900 font-black text-lg sm:text-xl">
                السادة/ {voucher.payerName || "المتبرع الكريم"}
              </div>
            </div>

            <div className="flex items-baseline gap-3 text-right">
              <span className="text-[#1f7a63] font-black shrink-0 min-w-[110px] text-base sm:text-lg">
                مبلغ وقدره
              </span>
              <div className="grow border-b-2 border-dotted border-slate-400 pb-1 text-slate-900 font-extrabold text-base sm:text-lg">
                <span className="text-emerald-800 font-black text-lg sm:text-xl ml-2">
                  {amountVal.toLocaleString("ar-SA", { minimumFractionDigits: 2 })} ريال
                </span>
                <span className="text-slate-400 font-semibold px-2">|</span>
                <span className="text-slate-900 font-black">{tafqeetStr}</span>
              </div>
            </div>

            <div className="flex items-baseline gap-3 text-right">
              <div className="w-[110px] shrink-0"></div>
              <div className="grow border-b-2 border-dotted border-slate-400 pb-1 text-slate-900 font-black text-base sm:text-lg">
                {getPaymentMethodDetails()}
              </div>
            </div>

            <div className="flex items-start gap-3 text-right">
              <span className="text-[#1f7a63] font-black shrink-0 min-w-[110px] text-base sm:text-lg pt-0.5">
                وذلك مقابل
              </span>
              <div className="grow text-slate-900 font-black text-base sm:text-lg leading-[2.3rem] h-[4.6rem] overflow-hidden voucher-fixed-two-lines">
                {getCleanVoucherNotes(voucher.notes) || voucher.project?.name || "تأمين احتياجات المشاريع المعتمدة"}
              </div>
            </div>
          </div>

          {/* Bottom Section: Signatures & Stamp */}
          <div className="grid grid-cols-12 items-end pt-2 mb-2 relative z-20">
            <div className="col-span-6 flex justify-start items-center min-h-[75px] relative z-30">
              {officialStampUrl && (
                <div className="relative select-none pr-6 sm:pr-10 opacity-95 pointer-events-none">
                  <img
                    src={officialStampUrl}
                    alt="الختم الرسمي"
                    className="w-40 sm:w-44 h-auto max-h-32 object-contain"
                  />
                </div>
              )}
            </div>

            <div className="col-span-6 flex flex-col items-center justify-end space-y-0.5">
              <span className="text-base font-black text-[#978457]">الإدارة المالية</span>
              <div className="w-40 h-14 flex items-center justify-center relative">
                {signatureUrl ? (
                  <img
                    src={signatureUrl}
                    alt="توقيع الإدارة المالية"
                    className="max-h-14 max-w-full object-contain"
                  />
                ) : (
                  <div className="w-36 h-14"></div>
                )}
              </div>
            </div>
          </div>

          {/* Page Footer Section */}
          <div className="border-t-2 border-[#978457] pt-2 mt-auto relative z-10">
            <div className="flex flex-row items-end justify-between text-xs text-slate-700 gap-4">
              <div className="text-right space-y-0.5">
                <span className="block font-black text-[#978457] text-xs">المركز الرئيسي</span>
                <span className="block font-bold text-slate-600 text-[11px] leading-tight">
                  {orgSettings?.address || "المملكة العربية السعودية - أبها - طريق الملك فهد العزيزية"}
                </span>
              </div>

              <div className="text-center pb-0.5">
                <span className="font-sans font-bold text-slate-700 text-xs sm:text-sm tracking-wide dir-ltr inline-block">
                  {orgSettings?.website || "www.manarah.org.sa"}
                </span>
              </div>

              <div className="text-left pb-0.5">
                <span className="font-sans font-bold text-slate-700 text-xs sm:text-sm tracking-wide dir-ltr inline-block">
                  E: {orgSettings?.email || "info@manarah.org.sa"}
                </span>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
