import { useParams, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { ArrowRight, Printer, AlertCircle } from "lucide-react";
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

export default function ReceiptVoucherPrint() {
  const params = useParams<{ id: string }>();
  const voucherId = parseInt(params.id || "0");
  const [, navigate] = useLocation();

  // Fetch Voucher Data
  const { data: voucher, isLoading, error } = trpc.projects.getReceiptVoucherById.useQuery(
    { id: voucherId },
    { enabled: voucherId > 0 }
  );

  // Fetch Branding & Organization Settings (Logo, Stamp, License Number)
  const { data: orgSettings } = trpc.organization.getSettings.useQuery();

  const handlePrint = () => {
    window.print();
  };

  const handleBack = () => {
    if (voucher?.projectId) {
      navigate(`/projects/${voucher.projectId}`);
    } else if (window.history.length > 1) {
      window.history.back();
    } else {
      navigate("/projects");
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-100 dark:bg-slate-950 flex items-center justify-center p-4 dir-rtl" dir="rtl">
        <div className="flex flex-col items-center gap-3 text-slate-600 dark:text-slate-300">
          <div className="w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm font-semibold">جاري تحميل بيانات سند القبض...</p>
        </div>
      </div>
    );
  }

  if (error || !voucher) {
    return (
      <div className="min-h-screen bg-slate-100 dark:bg-slate-950 flex items-center justify-center p-4 dir-rtl" dir="rtl">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 text-center space-y-4 max-w-md shadow-lg">
          <div className="w-12 h-12 rounded-full bg-rose-100 dark:bg-rose-950/60 text-rose-600 flex items-center justify-center mx-auto">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">سند القبض غير موجود</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
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

  // Formatting Voucher Number (extract numerical part or full code)
  const voucherNumDisplay = voucher.voucherNumber ? voucher.voucherNumber.replace(/^(REC-\d+-\d+-)/i, "") : voucher.id.toString();

  // License number from Branding/Org settings with fallback to 2238
  const licenseNo = orgSettings?.licenseNumber || "2238";

  // Main Logo & Stamp from Branding (/branding)
  const mainLogoUrl = orgSettings?.logoUrl;
  const officialStampUrl = orgSettings?.stampUrl;
  const secondaryLogoUrl = orgSettings?.secondaryLogoUrl;
  const technicalSupervisorLogoUrl = (orgSettings as any)?.technicalSupervisorLogoUrl;

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
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 py-6 sm:py-10 px-3 sm:px-6 dir-rtl select-none" dir="rtl">
      {/* Dynamic CSS for Print Mode */}
      <style>{`
        @media print {
          body {
            background-color: white !important;
            color: black !important;
            padding: 0 !important;
            margin: 0 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .no-print {
            display: none !important;
          }
          .print-card {
            box-shadow: none !important;
            border: none !important;
            margin: 0 auto !important;
            padding: 30px 40px !important;
            width: 100% !important;
            max-width: 100% !important;
          }
        }
      `}</style>

      {/* Floating Action Bar (hidden on print) */}
      <div className="max-w-4xl mx-auto mb-6 flex items-center justify-between no-print bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
        <Button
          variant="outline"
          onClick={handleBack}
          className="font-bold text-xs border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
        >
          <ArrowRight className="ml-2 h-4 w-4" />
          رجوع لصفحة المشروع
        </Button>
        <div className="flex items-center gap-3">
          <Button
            onClick={handlePrint}
            className="gradient-primary font-bold text-xs text-white rounded-xl shadow-xs px-5"
          >
            <Printer className="ml-2 h-4 w-4" />
            طباعة سند القبض
          </Button>
        </div>
      </div>

      {/* Main A4 Document Canvas */}
      <div className="max-w-[235mm] mx-auto bg-white text-slate-900 border border-slate-300 shadow-2xl rounded-2xl p-8 sm:p-12 relative overflow-hidden print-card">
        
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

        {/* Solid Gold Top Header Band with License Number on the Left & Ornament on Right */}
        <div className="relative border-b-2 border-[#978457] pb-2 mb-6 flex justify-between items-center">
          {/* Islamic Geometric Lattice Ornament (Top Right under gold bar) */}
          <div className="w-64 sm:w-80 h-10 relative overflow-hidden opacity-90">
            <svg className="w-full h-full" viewBox="0 0 320 40" fill="none" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <pattern id="islamic-header-pattern" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
                  <path d="M 10 0 L 20 10 L 10 20 L 0 10 Z" stroke="#978457" strokeWidth="1" fill="none" />
                  <path d="M 10 3 L 17 10 L 10 17 L 3 10 Z" stroke="#c2a76d" strokeWidth="0.7" fill="none" />
                  <circle cx="10" cy="10" r="1.5" fill="#978457" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#islamic-header-pattern)" />
            </svg>
          </div>

          {/* License Number (Top Left) */}
          <div className="text-left">
            <span className="text-sm sm:text-base font-black text-[#978457]">رقم الترخيص {licenseNo}</span>
          </div>
        </div>

        {/* Top Header Logos Row:
            - RIGHT: National Center Logo & Secondary Logo / Vision 2030 (if uploaded)
            - LEFT: Main Logo (منارة)
        */}
        <div className="flex justify-between items-center mb-8 relative z-10">
          
          {/* Top Right: Partner Logos (National Center Logo + Secondary Logo / Vision 2030 if uploaded) */}
          <div className="flex items-center gap-4">
            {/* Technical Supervision Logo from /branding (Default fallback to National Center Logo) */}
            {technicalSupervisorLogoUrl ? (
              <img
                src={technicalSupervisorLogoUrl}
                alt="جهة الإشراف الفني"
                className="max-h-12 max-w-[150px] object-contain"
              />
            ) : (
              <div className="flex items-center gap-2 text-slate-800 leading-tight">
                <svg className="w-7 h-7 text-[#088362] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                  <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                </svg>
                <div className="text-right">
                  <span className="block font-black text-slate-900 text-[10px]">المركز الوطني لتنمية</span>
                  <span className="block font-bold text-[#088362] text-[10px]">القطاع غير الربحي</span>
                </div>
              </div>
            )}

            {secondaryLogoUrl && (
              <>
                <div className="h-7 w-px bg-slate-300"></div>
                <img
                  src={secondaryLogoUrl}
                  alt="الشعار الثانوي / رؤية 2030"
                  className="max-h-10 max-w-[130px] object-contain"
                />
              </>
            )}
          </div>

          {/* Top Left: Main Logo from /branding (Positioned lower) */}
          <div className="flex justify-end items-center pt-4 mt-2">
            {mainLogoUrl ? (
              <img
                src={mainLogoUrl}
                alt={orgSettings?.organizationName || "الشعار الرئيسي"}
                className="max-h-24 max-w-[210px] object-contain translate-y-2"
              />
            ) : (
              <div className="h-20 w-44"></div>
            )}
          </div>
        </div>

        {/* Title & Dates Block:
            - RIGHT: Hijri & Gregorian Dates (in teal #1f7a63)
            - CENTER: "سند قبض 240124"
        */}
        <div className="relative flex items-center justify-between mb-10 pb-4 border-b border-slate-200 z-10">
          
          {/* Right Side: Hijri & Gregorian Dates */}
          <div className="flex flex-col items-start space-y-1.5 text-sm sm:text-base font-bold">
            <div className="flex items-center gap-3">
              <span className="text-[#1f7a63] font-black">التاريخ</span>
              <span className="font-extrabold text-slate-900">{toHijriDate(receiptDateObj)}</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-[#1f7a63] font-black">الموافق</span>
              <span className="font-extrabold text-slate-900">{formatGregorianDate(receiptDateObj)}</span>
            </div>
          </div>

          {/* Center Side: Title "سند قبض" (Gold) & Voucher Number (Red) */}
          <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-3">
            <h1 className="text-3xl sm:text-4xl font-black text-[#978457] tracking-tight">
              سند قبض
            </h1>
            <span className="text-2xl sm:text-3xl font-extrabold text-[#c5221f] tracking-wide">
              {voucherNumDisplay}
            </span>
          </div>

          {/* Left Side Spacer */}
          <div className="w-24"></div>
        </div>

        {/* Main Document Content Body (Right-Aligned Arabic Text) */}
        <div className="space-y-7 text-base sm:text-lg text-slate-900 font-bold leading-relaxed mb-12 relative z-10">
          
          {/* Field 1: Received From (استلمنا من) */}
          <div className="flex items-baseline gap-3 text-right">
            <span className="text-[#1f7a63] font-black shrink-0 min-w-[120px] text-base sm:text-lg">
              استلمنا من
            </span>
            <div className="grow border-b-2 border-dotted border-slate-400 pb-1 text-slate-900 font-black text-lg sm:text-xl">
              السادة/ {voucher.payerName || "المتبرع الكريم"}
            </div>
          </div>

          {/* Field 2: Amount in figures & words (مبلغ وقدره) */}
          <div className="flex items-baseline gap-3 text-right">
            <span className="text-[#1f7a63] font-black shrink-0 min-w-[120px] text-base sm:text-lg">
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

          {/* Field 3: Payment details (حوالة بنكية / شيك / نقدي) */}
          <div className="flex items-baseline gap-3 text-right">
            <div className="w-[120px] shrink-0"></div>
            <div className="grow border-b-2 border-dotted border-slate-400 pb-1 text-slate-900 font-black text-base sm:text-lg">
              {getPaymentMethodDetails()}
            </div>
          </div>

          {/* Field 4: Description / For (وذلك مقابل) */}
          <div className="flex items-baseline gap-3 text-right">
            <span className="text-[#1f7a63] font-black shrink-0 min-w-[120px] text-base sm:text-lg">
              وذلك مقابل
            </span>
            <div className="grow border-b-2 border-dotted border-slate-400 pb-1 text-slate-900 font-black text-base sm:text-lg">
              {voucher.notes || voucher.project?.name || "تأمين احتياجات المشاريع المعتمدة"}
            </div>
          </div>
        </div>

        {/* Bottom Section (Signatures & Stamp):
            - RIGHT (RTL First Col): Official Stamp from /branding (Shifted left and down overlapping footer line)
            - LEFT (RTL Second Col): Financial Department الإدارة المالية + Blank space for future signature
        */}
        <div className="grid grid-cols-12 items-end pt-4 mb-4 relative z-20">
          
          {/* Right Side Column: Official Stamp (Shifted further left and down onto the footer) */}
          <div className="col-span-6 flex justify-start items-center min-h-[100px] relative z-30">
            {officialStampUrl && (
              <div className="relative select-none pr-8 sm:pr-14 translate-y-8 sm:translate-y-11 opacity-95 pointer-events-none">
                <img
                  src={officialStampUrl}
                  alt="الختم الرسمي"
                  className="w-48 sm:w-52 h-auto max-h-38 object-contain"
                />
              </div>
            )}
          </div>

          {/* Left Side Column (In RTL HTML: Second Col): Financial Department الإدارة المالية (Blank space for signature) */}
          <div className="col-span-6 flex flex-col items-center justify-end space-y-2">
            <span className="text-base font-black text-[#978457]">الإدارة المالية</span>
            
            {/* Blank Space for Future Signature */}
            <div className="w-40 h-16"></div>
          </div>
        </div>

        {/* Page Footer Section */}
        <div className="border-t-2 border-[#978457] pt-3 mt-auto relative z-10">
          <div className="flex flex-row items-end justify-between text-xs text-slate-700 gap-4">
            
            {/* Right Side: Main Center Title & Address */}
            <div className="text-right space-y-0.5">
              <span className="block font-black text-[#978457] text-xs">المركز الرئيسي</span>
              <span className="block font-bold text-slate-600 text-[11px] leading-tight">
                {orgSettings?.address || "المملكة العربية السعودية - أبها - طريق الملك فهد العزيزية"}
              </span>
            </div>

            {/* Center Side: Website */}
            <div className="text-center pb-0.5">
              <span className="font-sans font-bold text-slate-700 text-xs sm:text-sm tracking-wide dir-ltr inline-block">
                {orgSettings?.website || "www.manarah.org.sa"}
              </span>
            </div>

            {/* Left Side: Email */}
            <div className="text-left pb-0.5">
              <span className="font-sans font-bold text-slate-700 text-xs sm:text-sm tracking-wide dir-ltr inline-block">
                E: {orgSettings?.email || "info@manarah.org.sa"}
              </span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
