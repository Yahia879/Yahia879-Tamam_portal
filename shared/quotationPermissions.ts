export const GENERAL_QUOTATION_PERMISSIONS = [
  { action: "view", nameAr: "عرض قائمة عروض الأسعار العامة" },
  { action: "add", nameAr: "إضافة عرض سعر" },
  { action: "approve", nameAr: "اعتماد ورفض عرض السعر" },
  { action: "template_download", nameAr: "تحميل قالب عروض الأسعار" },
  { action: "template_upload", nameAr: "رفع قالب عروض الاسعار" },
  { action: "link_add", nameAr: "إضافة رابط" },
  { action: "boq_add", nameAr: "إضافة بند لجدول الكميات" },
  { action: "boq_edit", nameAr: "تعديل بنود جدول الكميات" },
  { action: "boq_delete", nameAr: "حذف بنود جدول الكميات" },
] as const;

export const GENERAL_QUOTATION_PERMISSION_IDS = GENERAL_QUOTATION_PERMISSIONS.map(p => `quotations.${p.action}`);
export const GENERAL_QUOTATION_LABELS: Record<string, string> = Object.fromEntries(
  GENERAL_QUOTATION_PERMISSIONS.map(p => [p.action, p.nameAr]),
);
export const SEDANA_QUOTATION_ACTIONS = ["view", "export_pdf", "add", "recommend", "approve"];

export function isSedanaQuotationRequest(request: { programType?: string | null; isSedana?: boolean; requestNumber?: string | null }): boolean {
  return request.programType === "sedana" || !!request.isSedana || !!request.requestNumber?.includes("-SED-");
}

export function quotationPermissionSelection(permissions: string[]): string[] {
  return permissions.filter(p => p !== "quotations" &&
    (!p.startsWith("quotations.") || GENERAL_QUOTATION_PERMISSION_IDS.includes(p)));
}

export function quotationPermissionOptions(permissions: string[]): string[] {
  const legacySection = permissions.includes("quotations") &&
    !permissions.some(p => GENERAL_QUOTATION_PERMISSION_IDS.includes(p));
  const options = legacySection ? [...permissions, ...GENERAL_QUOTATION_PERMISSION_IDS] : [...permissions];
  if (options.includes("quotations.create") && !options.includes("quotations.add")) options.push("quotations.add");
  return quotationPermissionSelection(options);
}

export function canViewQuotationRequest(permissions: string[], request: Parameters<typeof isSedanaQuotationRequest>[0]): boolean {
  return permissions.includes(isSedanaQuotationRequest(request) ? "sedana_quotations.view" : "quotations.view");
}
