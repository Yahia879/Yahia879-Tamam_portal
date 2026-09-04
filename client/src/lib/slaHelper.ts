/**
 * مساعد حساب مدد التأخير ومطابقة مؤشرات الـ SLA
 * يضمن تطابق حساب التأخير والمهل الزمنية عبر جميع صفحات النظام (التصعيد الإداري، اعتمادات المستفيدين، تفاصيل الحساب)
 */

export interface BeneficiarySLAInfo {
  isDelayed: boolean;
  delayText: string;
  delayDetailedText: string;
  elapsedText: string;
  delayDaysOnly: number;
  delayHoursOnly: number;
  delayDays: number;
  elapsedDaysOnly: number;
  elapsedHoursOnly: number;
  totalElapsedHours: number;
  totalDelayHours: number;
  allowedDays: number;
}

/**
 * دالة مركزية لحساب حالة تأخير المستفيد بناءً على تاريخ التسجيل ومهلة الـ SLA المعتمدة
 */
export function calculateBeneficiarySLA(
  createdAt: string | Date | null | undefined,
  allowedDays: number = 3
): BeneficiarySLAInfo {
  if (!createdAt) {
    return {
      isDelayed: false,
      delayText: "",
      delayDetailedText: "",
      elapsedText: "—",
      delayDaysOnly: 0,
      delayHoursOnly: 0,
      delayDays: 0,
      elapsedDaysOnly: 0,
      elapsedHoursOnly: 0,
      totalElapsedHours: 0,
      totalDelayHours: 0,
      allowedDays,
    };
  }

  const regDate = new Date(createdAt);
  if (isNaN(regDate.getTime())) {
    return {
      isDelayed: false,
      delayText: "",
      delayDetailedText: "",
      elapsedText: "—",
      delayDaysOnly: 0,
      delayHoursOnly: 0,
      delayDays: 0,
      elapsedDaysOnly: 0,
      elapsedHoursOnly: 0,
      totalElapsedHours: 0,
      totalDelayHours: 0,
      allowedDays,
    };
  }

  const now = new Date();
  const diffMs = Math.max(0, now.getTime() - regDate.getTime());
  const allowedMs = allowedDays * 24 * 60 * 60 * 1000;

  const totalElapsedHours = Math.floor(diffMs / (1000 * 60 * 60));
  const elapsedDaysOnly = Math.floor(totalElapsedHours / 24);
  const elapsedHoursOnly = totalElapsedHours % 24;

  let elapsedText = "";
  if (elapsedDaysOnly > 0 && elapsedHoursOnly > 0) {
    elapsedText = `${elapsedDaysOnly} يوم و ${elapsedHoursOnly} س`;
  } else if (elapsedDaysOnly > 0) {
    elapsedText = `${elapsedDaysOnly} يوم`;
  } else if (elapsedHoursOnly > 0) {
    elapsedText = `${elapsedHoursOnly} ساعة`;
  } else {
    elapsedText = "أقل من ساعة";
  }

  if (diffMs <= allowedMs) {
    return {
      isDelayed: false,
      delayText: "ضمن المهلة",
      delayDetailedText: "ضمن المهلة المحددة",
      elapsedText,
      delayDaysOnly: 0,
      delayHoursOnly: 0,
      delayDays: 0,
      elapsedDaysOnly,
      elapsedHoursOnly,
      totalElapsedHours,
      totalDelayHours: 0,
      allowedDays,
    };
  }

  const delayMs = diffMs - allowedMs;
  const totalDelayHours = Math.floor(delayMs / (1000 * 60 * 60));
  const delayDaysOnly = Math.floor(totalDelayHours / 24);
  const delayHoursOnly = totalDelayHours % 24;
  const delayDays = Math.max(1, Math.ceil(delayMs / (1000 * 60 * 60 * 24)));

  let delayText = "";
  let delayDetailedText = "";
  if (delayDaysOnly > 0 && delayHoursOnly > 0) {
    delayText = `${delayDaysOnly} يوم و ${delayHoursOnly} س`;
    delayDetailedText = `${delayDaysOnly} يوم و ${delayHoursOnly} ساعة`;
  } else if (delayDaysOnly > 0) {
    delayText = `${delayDaysOnly} يوم`;
    delayDetailedText = `${delayDaysOnly} يوم`;
  } else if (delayHoursOnly > 0) {
    delayText = `${delayHoursOnly} ساعة`;
    delayDetailedText = `${delayHoursOnly} ساعة`;
  } else {
    delayText = "ساعة واحدة";
    delayDetailedText = "ساعة واحدة";
  }

  return {
    isDelayed: true,
    delayText,
    delayDetailedText,
    elapsedText,
    delayDaysOnly,
    delayHoursOnly,
    delayDays,
    elapsedDaysOnly,
    elapsedHoursOnly,
    totalElapsedHours,
    totalDelayHours,
    allowedDays,
  };
}

/**
 * دالة لتنسيق نص التأخير بالأيام والساعات
 */
export function formatDelayText(delayDaysOnly?: number, delayHoursOnly?: number, delayDays?: number): string {
  const days = delayDaysOnly ?? 0;
  const hours = delayHoursOnly ?? 0;
  if (days > 0 && hours > 0) {
    return `${days} يوم و ${hours} س`;
  }
  if (days > 0) {
    return `${days} يوم`;
  }
  if (hours > 0) {
    return `${hours} ساعة`;
  }
  if (delayDays && delayDays > 0) {
    return `${delayDays} يوم`;
  }
  return `ساعة واحدة`;
}

/**
 * دالة لتنسيق تاريخ ووقت التسجيل
 */
export function formatRegisteredDateTime(dateInput: string | Date | null | undefined): { date: string; time: string } {
  if (!dateInput) return { date: "—", time: "" };
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return { date: "—", time: "" };

  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  let h = d.getHours();
  const m = String(d.getMinutes()).padStart(2, "0");
  const ampm = h >= 12 ? "م" : "ص";
  h = h % 12 || 12;

  return {
    date: `${yyyy}/${mm}/${dd}`,
    time: `${h}:${m} ${ampm}`,
  };
}
