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

  // Main Logo & Stamp from Branding (/branding) with Fallbacks
  const mainLogoUrl = orgSettings?.logoUrl;
  const officialStampUrl = orgSettings?.stampUrl;

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
              <path d="M40 10 L70 40 L40 70 L10 40 Z" stroke="#1f7a63" strokeWidth="1" fill="none" />
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
            - First column in RTL HTML = RIGHT side (Islamic Star Rosette Ornament + Partner Logos Vision 2030)
            - Last column in RTL HTML = LEFT side (Main Logo from /branding)
        */}
        <div className="grid grid-cols-12 gap-4 items-center mb-8 relative z-10">
          
          {/* Right Side Column (In RTL HTML: First Col): High-Quality Islamic Star Rosette Ornament & Partner Logos */}
          <div className="col-span-6 flex flex-col items-start gap-2 text-right">
            
            {/* Clean Islamic Geometric Star Rosette Ribbon (Top Right) */}
            <div className="w-72 sm:w-80 h-14 relative overflow-hidden bg-transparent">
              <svg className="w-full h-full" viewBox="0 0 320 60" fill="none" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <linearGradient id="gold-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#c5a059" />
                    <stop offset="50%" stopColor="#9a7b3e" />
                    <stop offset="100%" stopColor="#7a5f2b" />
                  </linearGradient>
                  <linearGradient id="gold-light-grad" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#faf6ee" />
                    <stop offset="100%" stopColor="#f3ebda" />
                  </linearGradient>
                </defs>

                {/* Rosette 1 (Right) */}
                <g transform="translate(280, 30)">
                  <polygon points="0,-22 6,-8 20,-8 10,2 14,16 0,8 -14,16 -10,2 -20,-8 -6,-8" fill="url(#gold-light-grad)" stroke="url(#gold-grad)" strokeWidth="1.5" />
                  <polygon points="0,-16 16,0 0,16 -16,0" fill="none" stroke="url(#gold-grad)" strokeWidth="1" />
                  <circle cx="0" cy="0" r="4" fill="#9a7b3e" />
                </g>

                {/* Rosette 2 (Middle-Right) */}
                <g transform="translate(210, 30)">
                  <polygon points="0,-22 6,-8 20,-8 10,2 14,16 0,8 -14,16 -10,2 -20,-8 -6,-8" fill="url(#gold-light-grad)" stroke="url(#gold-grad)" strokeWidth="1.5" />
                  <polygon points="0,-16 16,0 0,16 -16,0" fill="none" stroke="url(#gold-grad)" strokeWidth="1" />
                  <circle cx="0" cy="0" r="4" fill="#9a7b3e" />
                </g>

                {/* Rosette 3 (Middle-Left) */}
                <g transform="translate(140, 30)">
                  <polygon points="0,-22 6,-8 20,-8 10,2 14,16 0,8 -14,16 -10,2 -20,-8 -6,-8" fill="url(#gold-light-grad)" stroke="url(#gold-grad)" strokeWidth="1.5" />
                  <polygon points="0,-16 16,0 0,16 -16,0" fill="none" stroke="url(#gold-grad)" strokeWidth="1" />
                  <circle cx="0" cy="0" r="4" fill="#9a7b3e" />
                </g>

                {/* Rosette 4 (Left Fade) */}
                <g transform="translate(70, 30)" opacity="0.6">
                  <polygon points="0,-22 6,-8 20,-8 10,2 14,16 0,8 -14,16 -10,2 -20,-8 -6,-8" fill="url(#gold-light-grad)" stroke="url(#gold-grad)" strokeWidth="1.2" />
                  <polygon points="0,-16 16,0 0,16 -16,0" fill="none" stroke="url(#gold-grad)" strokeWidth="0.8" />
                  <circle cx="0" cy="0" r="3" fill="#9a7b3e" />
                </g>

                {/* Interconnecting Geometric Lines */}
                <path d="M 50 30 L 300 30" stroke="url(#gold-grad)" strokeWidth="1.2" strokeDasharray="5 3" />
                <path d="M 50 8 L 300 8" stroke="url(#gold-grad)" strokeWidth="1" opacity="0.7" />
                <path d="M 50 52 L 300 52" stroke="url(#gold-grad)" strokeWidth="1" opacity="0.7" />
              </svg>
            </div>

            {/* National Center for Non-Profit Sector & Vision 2030 Badges */}
            <div className="flex items-center gap-3 mt-1">
              {/* National Center Logo Representation */}
              <div className="flex items-center gap-1.5 text-slate-800 leading-tight">
                <svg className="w-6 h-6 text-emerald-700 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                  <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                </svg>
                <div className="text-right">
                  <span className="block font-black text-slate-900 text-[9px]">المركز الوطني لتنمية</span>
                  <span className="block font-bold text-emerald-800 text-[9px]">القطاع غير الربحي</span>
                </div>
              </div>

              <div className="h-7 w-px bg-slate-300"></div>

              {/* Vision 2030 Logo Representation */}
              <div className="flex items-center gap-0.5 text-slate-800 font-black tracking-tighter">
                <span className="text-[11px] text-slate-600 font-bold">رؤيــــــــة</span>
                <span className="text-base font-black text-slate-900">2030</span>
              </div>
            </div>
          </div>

          {/* Middle Spacer */}
          <div className="col-span-1"></div>

          {/* Left Side Column (In RTL HTML: Third Col): Main Logo from /branding */}
          <div className="col-span-5 flex justify-end items-center">
            {mainLogoUrl ? (
              <img
                src={mainLogoUrl}
                alt={orgSettings?.organizationName || "الشعار الرئيسي"}
                className="max-h-24 max-w-[210px] object-contain"
              />
            ) : (
              <div className="flex flex-col items-center">
                {/* Modern Islamic Dome Emblem Fallback */}
                <div className="relative w-16 h-18 flex items-center justify-center">
                  <svg className="w-full h-full text-[#1f7a63]" viewBox="0 0 100 120" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M50 5 C30 25 20 45 20 80 L80 80 C80 45 70 25 50 5 Z" fill="none" stroke="#1f7a63" strokeWidth="4.5" />
                    <path d="M50 20 C38 35 30 50 30 80 L70 80 C70 50 62 35 50 20 Z" fill="none" stroke="#978457" strokeWidth="3.5" />
                    <path d="M50 35 C42 45 38 55 38 80 L62 80 C62 55 58 45 50 35 Z" fill="none" stroke="#1f7a63" strokeWidth="3" />
                    <circle cx="50" cy="5" r="3.5" fill="#978457" />
                  </svg>
                </div>
                <div className="text-center mt-1">
                  <span className="block font-black text-2xl text-[#978457] tracking-tight leading-none">
                    {orgSettings?.organizationNameShort || "منارة"}
                  </span>
                  <span className="block font-bold text-xs text-[#1f7a63] mt-0.5">
                    {orgSettings?.organizationName || "جمعية عمارة المساجد"}
                  </span>
                </div>
              </div>
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
            - First column in RTL HTML (col-span-6) = RIGHT side (Official Stamp from /branding - Straight without CSS tilt)
            - Second column in RTL HTML (col-span-6) = LEFT side (Financial Department الإدارة المالية + Blank space for future signature)
        */}
        <div className="grid grid-cols-12 items-end pt-6 mb-10 relative z-10">
          
          {/* Right Side Column (In RTL HTML: First Col): Official Stamp from /branding (Straight / Unrotated) */}
          <div className="col-span-6 flex justify-start items-center">
            {officialStampUrl ? (
              <div className="relative select-none">
                <img
                  src={officialStampUrl}
                  alt="الختم الرسمي"
                  className="w-48 h-auto max-h-36 object-contain"
                />
              </div>
            ) : (
              <div className="relative select-none">
                <div className="border-2 border-dashed border-[#1a4b8c] rounded-2xl p-2.5 text-center bg-blue-50/20 backdrop-blur-2xs shadow-xs w-52 text-[#1a4b8c] font-bold">
                  <div className="border border-[#1a4b8c] rounded-xl p-2.5 space-y-1">
                    <div className="flex items-center justify-center gap-1.5 text-xs font-black">
                      <svg className="w-4 h-4 text-[#1a4b8c]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                        <path d="M12 2L3 7v10l9 5 9-5V7l-9-5z" />
                        <path d="M12 6a4 4 0 0 1 4 4v4a4 4 0 0 1-8 0v-4a4 4 0 0 1 4-4z" />
                      </svg>
                      <span>{orgSettings?.organizationName || "جمعية عمارة المساجد"}</span>
                    </div>
                    <div className="text-[10px] font-bold opacity-90 border-t border-b border-[#1a4b8c]/40 py-0.5">
                      ترخيص المركز الوطني لتنمية القطاع غير الربحي
                    </div>
                    <div className="text-[11px] font-black">
                      رقم الترخيص: {licenseNo}
                    </div>
                  </div>
                </div>
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
