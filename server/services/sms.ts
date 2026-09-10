/**
 * خدمة إرسال الرسائل النصية القصيرة (SMS) عبر بوابة 4jawaly (فور جوالي)
 * الجمعية الأهلية لعمارة المساجد (منارة) - بوابة تمام
 */

import dotenv from "dotenv";
dotenv.config();

export interface SendSmsResult {
  success: boolean;
  messageId?: string;
  code?: number;
  error?: string;
  phone?: string;
}

/**
 * تحويل الأرقام العربية والفارسية إلى أرقام إنجليزية وتنسيق رقم الجوال السعودي
 * يدعم الصيغ:
 * - 05xxxxxxxx (10 أرقام) -> 9665xxxxxxxx
 * - 5xxxxxxxx (9 أرقام) -> 9665xxxxxxxx
 * - 9665xxxxxxxx (12 رقم) -> 9665xxxxxxxx
 * - +9665xxxxxxxx -> 9665xxxxxxxx
 * - 009665xxxxxxxx -> 9665xxxxxxxx
 * - الأرقام التي تحوي مسافات أو شرطات أو رموز
 * - الأرقام المكتوبة بالأرقام العربية (٠١٢٣٤٥٦٧٨٩)
 */
export function normalizeSaudiPhone(phone: string | null | undefined): string | null {
  if (!phone || typeof phone !== "string") return null;

  // 1. تحويل الأرقام المكتوبة بالمحارف العربية/الفارسية إلى أرقام لاتينية قياسية
  const arabicDigits = ["٠", "١", "٢", "٣", "٤", "٥", "٦", "٧", "٨", "٩"];
  const persianDigits = ["۰", "۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹"];
  
  let cleaned = phone.trim();
  for (let i = 0; i < 10; i++) {
    cleaned = cleaned.split(arabicDigits[i]).join(i.toString());
    cleaned = cleaned.split(persianDigits[i]).join(i.toString());
  }

  // 2. إزالة كافة الرموز والمسافات والحروف والإبقاء على الأرقام فقط
  cleaned = cleaned.replace(/[^\d]/g, "");

  if (!cleaned) return null;

  // 3. إزالة البادئة الدولية 00 إذا وجدت
  if (cleaned.startsWith("00")) {
    cleaned = cleaned.substring(2);
  }

  // 4. معالجة البادئات السعودية المختلفة
  if (cleaned.startsWith("9665") && cleaned.length === 12) {
    return cleaned;
  }

  if (cleaned.startsWith("05") && cleaned.length === 10) {
    return "966" + cleaned.substring(1);
  }

  if (cleaned.startsWith("5") && cleaned.length === 9) {
    return "966" + cleaned;
  }

  // في حال كان الرقم 96605xxxxxxxx بالخطأ
  if (cleaned.startsWith("96605") && cleaned.length === 13) {
    return "966" + cleaned.substring(4);
  }

  // إذا كان رقماً دولياً آخر يبدأ بكود دولة صحيح
  if (cleaned.length >= 10 && cleaned.length <= 15) {
    return cleaned;
  }

  return null;
}

/**
 * إرسال رسالة SMS واحدة أو متعددة عبر 4jawaly
 */
export async function sendSms(
  phone: string,
  messageText: string,
  senderName?: string
): Promise<SendSmsResult> {
  dotenv.config({ override: true });
  const appKey = process.env.FOUR_JAWALY_APP_KEY;
  const appSecret = process.env.FOUR_JAWALY_APP_SECRET;
  const sender = senderName || process.env.FOUR_JAWALY_SENDER_NAME || "Manarah";
  const apiUrl = process.env.FOUR_JAWALY_API_URL || "https://api-sms.4jawaly.com/api/v1/account/area/sms/send";

  if (!appKey || !appSecret) {
    console.warn("[4jawaly SMS] إرسال SMS متوقف: لم يتم ضبط FOUR_JAWALY_APP_KEY أو FOUR_JAWALY_APP_SECRET في ملف .env");
    return { success: false, error: "SMS credentials not configured" };
  }

  const formattedPhone = normalizeSaudiPhone(phone);
  if (!formattedPhone) {
    console.warn(`[4jawaly SMS] تم تخطي الإرسال: رقم الجوال غير صالح (${phone})`);
    return { success: false, error: `Invalid phone number: ${phone}` };
  }

  const authString = `${appKey}:${appSecret}`;
  const authBase64 = Buffer.from(authString, "utf-8").toString("base64");

  const payload = {
    messages: [
      {
        text: messageText,
        numbers: [formattedPhone],
        sender: sender,
      },
    ],
  };

  try {
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Basic ${authBase64}`,
      },
      body: JSON.stringify(payload),
    });

    const resJson = await response.json().catch(() => null);

    if (!response.ok || (resJson && resJson.code !== 200 && resJson.code !== 201)) {
      const errorMsg = resJson?.message || `HTTP ${response.status} ${response.statusText}`;
      console.error(`[4jawaly SMS Error] فشل إرسال الرسالة إلى (${formattedPhone}):`, errorMsg, resJson);
      return {
        success: false,
        code: resJson?.code || response.status,
        error: errorMsg,
        phone: formattedPhone,
      };
    }

    const jobId = resJson?.job_id || resJson?.messages?.[0]?.job_id;
    console.log(`[4jawaly SMS Success] تم إرسال رسالة SMS بنجاح إلى (${formattedPhone}) - Job ID: ${jobId}`);
    return {
      success: true,
      messageId: jobId,
      code: resJson?.code || 200,
      phone: formattedPhone,
    };
  } catch (err: any) {
    console.error(`[4jawaly SMS Exception] استثناء أثناء إرسال SMS إلى (${formattedPhone}):`, err?.message || err);
    return {
      success: false,
      error: err?.message || "Network exception",
      phone: formattedPhone,
    };
  }
}
