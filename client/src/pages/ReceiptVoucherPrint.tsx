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

        {/* Top License Bar & Line (License on LEFT side) */}
        <div className="flex justify-between items-center border-b-2 border-[#a18952]/60 pb-2 mb-6">
          <div></div>
          <div className="text-left">
            <span className="text-sm font-black text-[#a18952]">رقم الترخيص {licenseNo}</span>
          </div>
        </div>

        {/* Top Header Grid (RTL layout):
            - First column in RTL HTML = RIGHT side (Authentic Islamic Geometric Lattice + Secondary Logo)
            - Last column in RTL HTML = LEFT side (Main Logo from /branding)
        */}
        <div className="grid grid-cols-12 gap-4 items-center mb-8 relative z-10">
          
          {/* Right Side Column (In RTL HTML: First Col): Authentic Islamic Geometric Lattice Ornament & Secondary Logo */}
          <div className="col-span-6 flex flex-col items-start gap-2 text-right">
            
            {/* Seamless Islamic Geometric Lattice Pattern (Top Right) */}
            <div className="w-64 sm:w-72 h-12 relative overflow-hidden bg-transparent opacity-90">
              <svg className="w-full h-full" viewBox="0 0 280 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <pattern id="islamic-header-pattern" x="0" y="0" width="24" height="24" patternUnits="userSpaceOnUse">
                    {/* Outer Diamond Grid */}
                    <path d="M 12 0 L 24 12 L 12 24 L 0 12 Z" stroke="#978457" strokeWidth="1" fill="none" />
                    {/* Inner Octagonal Lines */}
                    <path d="M 12 4 L 20 12 L 12 20 L 4 12 Z" stroke="#c2a76d" strokeWidth="0.7" fill="none" />
                    <path d="M 0 0 L 24 24 M 24 0 L 0 24" stroke="#a18952" strokeWidth="0.5" opacity="0.6" fill="none" />
                    {/* Intersecting Dots */}
                    <circle cx="12" cy="12" r="1.8" fill="#978457" />
                    <circle cx="0" cy="0" r="1.2" fill="#a18952" />
                    <circle cx="24" cy="0" r="1.2" fill="#a18952" />
                    <circle cx="0" cy="24" r="1.2" fill="#a18952" />
                    <circle cx="24" cy="24" r="1.2" fill="#a18952" />
                  </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#islamic-header-pattern)" />
              </svg>
            </div>

            {/* Secondary Logo / Vision 2030 (Rendered ONLY if uploaded in /branding) */}
            {secondaryLogoUrl && (
              <div className="flex items-center gap-3 mt-1">
                <img
                  src={secondaryLogoUrl}
                  alt="الشعار الثانوي / رؤية 2030"
                  className="max-h-10 max-w-[140px] object-contain"
                />
              </div>
            )}
          </div>

          {/* Middle Spacer */}
          <div className="col-span-1"></div>

          {/* Left Side Column (In RTL HTML: Third Col): Main Logo from /branding (Rendered ONLY if uploaded) */}
          <div className="col-span-5 flex justify-end items-center">
            {mainLogoUrl ? (
              <img
                src={mainLogoUrl}
                alt={orgSettings?.organizationName || "الشعار الرئيسي"}
                className="max-h-24 max-w-[210px] object-contain"
              />
            ) : (
              <div className="h-24 w-full"></div>
            )}
          </div>
        </div>

        {/* Title & Dates Banner Line:
            - First column in RTL HTML (col-span-5) = RIGHT side (Hijri & Gregorian Dates)
            - Second column in RTL HTML (col-span-7) = LEFT side (سند قبض 240124)
        */}
        <div className="grid grid-cols-12 items-center mb-10 border-b-2 border-slate-200 pb-4 relative z-10">
          
          {/* Right Side Column (In RTL HTML: First Col): Hijri & Gregorian Dates */}
          <div className="col-span-5 flex flex-col items-start justify-center space-y-1.5 text-xs sm:text-sm font-bold text-slate-800">
            <div className="flex items-center gap-2">
              <span className="text-[#1f7a63] font-black">التاريخ</span>
              <span className="font-extrabold text-slate-900 text-sm sm:text-base">{toHijriDate(receiptDateObj)}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[#1f7a63] font-black">الموافق</span>
              <span className="font-extrabold text-slate-900 text-sm sm:text-base">{formatGregorianDate(receiptDateObj)}</span>
            </div>
          </div>

          {/* Left/Center Side Column (In RTL HTML: Second Col): Title "سند قبض" & Number */}
          <div className="col-span-7 flex items-center justify-end gap-3">
            <h1 className="text-3xl sm:text-4xl font-black text-[#978457] tracking-tight">
              سند قبض
            </h1>
            <span className="text-2xl sm:text-3xl font-extrabold text-[#c5221f] tracking-wide">
              {voucherNumDisplay}
            </span>
          </div>
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
            - First column in RTL HTML (col-span-6) = RIGHT side (Official Stamp from /branding - ONLY rendered if uploaded)
            - Second column in RTL HTML (col-span-6) = LEFT side (Financial Department الإدارة المالية + Blank space for future signature)
        */}
        <div className="grid grid-cols-12 items-end pt-6 mb-10 relative z-10">
          
          {/* Right Side Column (In RTL HTML: First Col): Official Stamp from /branding (Rendered ONLY if uploaded) */}
          <div className="col-span-6 flex justify-start items-center min-h-[100px]">
            {officialStampUrl && (
              <div className="relative select-none">
                <img
                  src={officialStampUrl}
                  alt="الختم الرسمي"
                  className="w-48 h-auto max-h-36 object-contain"
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
        <div className="border-t-2 border-[#a18952]/50 pt-4 mt-auto relative z-10">
          <div className="flex flex-col sm:flex-row items-center justify-between text-xs font-black text-slate-700 gap-2">
            <div>
              <span>المركز الرئيسي : {orgSettings?.address || "المملكة العربية السعودية - أبها - طريق الملك فهد العزيزية"}</span>
            </div>
            <div>
              <span className="font-sans font-bold text-slate-800">{orgSettings?.website || "www.manarah.org.sa"}</span>
            </div>
            <div>
              <span className="font-sans font-bold text-slate-800">E: {orgSettings?.email || "info@manarah.org.sa"}</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
