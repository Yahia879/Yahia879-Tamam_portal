export interface TafqeetOptions {
  prefix?: string;       // e.g. "فقط " (default) or ""
  suffix?: string;       // e.g. " لا غير" (default) or ""
  currency?: string;     // e.g. "ريال" (default) or "ريال سعودي"
  includeHalala?: boolean; // default true
}

export function numberToArabicText(num: number, options?: TafqeetOptions): string {
  if (num === 0) {
    const currency = options?.currency ?? "ريال";
    const prefix = options?.prefix ?? "فقط ";
    const suffix = options?.suffix ?? "";
    return `${prefix}صفر ${currency}${suffix}`.trim();
  }
  
  const ones = ["", "واحد", "اثنان", "ثلاثة", "أربعة", "خمسة", "ستة", "سبعة", "ثمانية", "تسعة"];
  const tens = ["", "عشر", "عشرون", "ثلاثون", "أربعون", "خمسون", "ستون", "سبعون", "ثمانون", "تسعون"];
  const teens = ["عشرة", "أحد عشر", "اثنا عشر", "ثلاثة عشر", "أربعة عشر", "خمسة عشر", "ستة عشر", "سبعة عشر", "ثمانية عشر", "تسعة عشر"];
  const hundreds = ["", "مائة", "مائتان", "ثلاثمائة", "أربعمائة", "خمسمائة", "ستمائة", "سبعمائة", "ثمانمائة", "تسعمائة"];

  function convertHundreds(n: number): string {
    if (n === 0) return "";
    if (n < 10) return ones[n];
    if (n < 20) return teens[n - 10];
    if (n < 100) {
      const t = Math.floor(n / 10);
      const o = n % 10;
      return o ? `${ones[o]} و${tens[t]}` : tens[t];
    }
    const h = Math.floor(n / 100);
    const rest = n % 100;
    return rest ? `${hundreds[h]} و${convertHundreds(rest)}` : hundreds[h];
  }

  function convertThousands(n: number): string {
    if (n < 1000) return convertHundreds(n);
    const thousands = Math.floor(n / 1000);
    const rest = n % 1000;
    let result = "";
    if (thousands === 1) result = "ألف";
    else if (thousands === 2) result = "ألفان";
    else if (thousands >= 3 && thousands <= 10) {
      const tenOnes = ["", "واحد", "اثنان", "ثلاثة", "أربعة", "خمسة", "ستة", "سبعة", "ثمانية", "تسعة", "عشرة"];
      result = `${tenOnes[thousands]} آلاف`;
    } else result = `${convertHundreds(thousands)} ألف`;
    return rest ? `${result} و${convertHundreds(rest)}` : result;
  }

  function convertMillions(n: number): string {
    if (n < 1000000) return convertThousands(n);
    const millions = Math.floor(n / 1000000);
    const rest = n % 1000000;
    let result = "";
    if (millions === 1) result = "مليون";
    else if (millions === 2) result = "مليونان";
    else if (millions >= 3 && millions <= 10) {
      const tenOnes = ["", "واحد", "اثنان", "ثلاثة", "أربعة", "خمسة", "ستة", "سبعة", "ثمانية", "تسعة", "عشرة"];
      result = `${tenOnes[millions]} ملايين`;
    } else result = `${convertThousands(millions)} مليون`;
    return rest ? `${result} و${convertThousands(rest)}` : result;
  }

  function convertBillions(n: number): string {
    if (n < 1000000000) return convertMillions(n);
    const billions = Math.floor(n / 1000000000);
    const rest = n % 1000000000;
    let result = "";
    if (billions === 1) result = "مليار";
    else if (billions === 2) result = "ملياران";
    else if (billions >= 3 && billions <= 10) {
      const tenOnes = ["", "واحد", "اثنان", "ثلاثة", "أربعة", "خمسة", "ستة", "سبعة", "ثمانية", "تسعة", "عشرة"];
      result = `${tenOnes[billions]} مليارات`;
    } else result = `${convertMillions(billions)} مليار`;
    return rest ? `${result} و${convertMillions(rest)}` : result;
  }

  function getHalalasText(halalas: number): string {
    if (halalas === 1) return "هللة واحدة";
    if (halalas === 2) return "هللتان";
    const masculineOnes = ["", "", "", "ثلاث", "أربع", "خمس", "ست", "سبع", "ثمان", "تسع", "عشر"];
    if (halalas >= 3 && halalas <= 10) {
      return `${masculineOnes[halalas]} هللات`;
    }
    return `${convertHundreds(halalas)} هللة`;
  }

  const integerPart = Math.floor(num);
  const decimalPart = Math.round((num - integerPart) * 100);

  const integerText = convertBillions(integerPart);
  
  const prefix = options?.prefix ?? "فقط ";
  const suffix = options?.suffix ?? "";
  const currency = options?.currency ?? "ريال";
  const includeHalala = options?.includeHalala ?? true;

  if (decimalPart > 0 && includeHalala) {
    const decimalText = getHalalasText(decimalPart);
    return `${prefix}${integerText} ${currency} و${decimalText}${suffix}`.trim();
  }
  
  return `${prefix}${integerText} ${currency}${suffix}`.trim();
}
