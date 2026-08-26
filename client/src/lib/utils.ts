import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * تنسيق ومعالجة رسائل الأخطاء القادمة من السيرفر أو الشبكة
 * لتحويل الأخطاء التقنية المعقدة (مثل JSON parse errors أو HTML responses أو انقطاع الاتصال)
 * إلى رسائل واضحة ومفهومة باللغة العربية للمستخدم.
 */
export function formatErrorMessage(error: unknown, fallbackMessage: string = "حدث خطأ، يرجى المحاولة مرة أخرى بعد قليل"): string {
  if (!error) return fallbackMessage;

  let rawMessage = "";
  if (typeof error === "string") {
    rawMessage = error;
  } else if (typeof error === "object" && error !== null) {
    const err = error as any;
    rawMessage = err.message || err.data?.message || err.error || "";
  }

  if (!rawMessage || typeof rawMessage !== "string") {
    return fallbackMessage;
  }

  const lower = rawMessage.toLowerCase();

  // 1. أخطاء عدم توافق JSON / استلام HTML بدلاً من JSON
  if (
    lower.includes("unexpected token") ||
    lower.includes("is not valid json") ||
    lower.includes("<!doctype") ||
    lower.includes("<html") ||
    lower.includes("failed to parse") ||
    lower.includes("syntaxerror")
  ) {
    return fallbackMessage || "حدث خطأ أثناء الاتصال بالخادم، يرجى المحاولة مرة أخرى بعد قليل.";
  }

  // 2. أخطاء انقطاع الشبكة أو تعذر الاتصال
  if (
    lower.includes("failed to fetch") ||
    lower.includes("networkerror") ||
    lower.includes("network request failed") ||
    lower.includes("connection refused") ||
    lower.includes("timeout") ||
    lower.includes("econnrefused")
  ) {
    return "تعذر الاتصال بالخادم، يرجى التحقق من اتصال الإنترنت والمحاولة مرة أخرى.";
  }

  // 3. أخطاء الصلاحيات
  if (
    lower.includes("forbidden") ||
    lower.includes("unauthorized") ||
    lower.includes("ليس لديك صلاحية") ||
    lower.includes("غير مصرح")
  ) {
    if (rawMessage.includes("ليس لديك صلاحية")) {
      return rawMessage;
    }
    return "عذراً، ليس لديك الصلاحية الكافية لإتمام هذا الإجراء.";
  }

  // 4. أخطاء التحقق من المدخلات (Zod validation error array)
  try {
    if (rawMessage.startsWith("[") && rawMessage.endsWith("]")) {
      const parsed = JSON.parse(rawMessage);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map((item: any) => item.message || "بيانات غير صالحة").join(" \n");
      }
    }
  } catch {
    // ignore
  }

  return rawMessage || fallbackMessage;
}

