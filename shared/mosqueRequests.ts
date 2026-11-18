export type RequestLifecycleCategory = "active" | "closed" | "rejected";

export interface MinimalMosqueRequestState {
  id?: number;
  mosqueId?: number | null;
  status?: string | null;
  currentStage?: string | null;
  closureStatus?: string | null;
  technicalEvalDecision?: string | null;
  requestTrack?: string | null;
}

/**
 * تحديد ما إذا كان الطلب لا يزال نشطاً أم انتهى (مغلق/مكتمل/مرفوض/معتذر عنه).
 */
export function getRequestLifecycleCategory(req: MinimalMosqueRequestState): RequestLifecycleCategory {
  if (
    req.status === "rejected" ||
    req.technicalEvalDecision === "apologize" ||
    req.requestTrack === "rejected"
  ) {
    return "rejected";
  }

  if (
    req.currentStage === "closed" ||
    req.status === "completed" ||
    req.closureStatus === "confirmed"
  ) {
    return "closed";
  }

  return "active";
}

export function isRequestActive(req: MinimalMosqueRequestState): boolean {
  return getRequestLifecycleCategory(req) === "active";
}

/**
 * التحقق من إمكانية ترحيل رصيد فرصة تبرع بين طلبين لنفس المسجد.
 */
export function canTransferDonationBetweenRequests(
  sourceReq: MinimalMosqueRequestState,
  targetReq: MinimalMosqueRequestState
): { allowed: boolean; reason?: string } {
  if (!sourceReq.id || !targetReq.id) {
    return { allowed: false, reason: "بيانات الطلب غير مكتملة" };
  }
  if (sourceReq.id === targetReq.id) {
    return { allowed: false, reason: "لا يمكن الترحيل إلى نفس الطلب" };
  }
  if (!sourceReq.mosqueId || !targetReq.mosqueId || sourceReq.mosqueId !== targetReq.mosqueId) {
    return { allowed: false, reason: "يجب أن يرتبط الطلبان بنفس المسجد" };
  }
  if (!isRequestActive(targetReq)) {
    return { allowed: false, reason: "لا يمكن الترحيل إلى طلب مغلق أو مرفوض" };
  }
  return { allowed: true };
}
