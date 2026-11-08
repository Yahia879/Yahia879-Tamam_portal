export const MOSQUE_PERMISSIONS = [
  { action: "view", nameAr: "عرض قائمة المساجد" },
  { action: "create", nameAr: "إضافة مسجد جديد" },
  { action: "view_details", nameAr: "عرض تفاصيل المسجد" },
  { action: "add_imam", nameAr: "إضافة إمام للمسجد" },
  { action: "edit", nameAr: "تعديل بيانات المسجد" },
  { action: "delete", nameAr: "حذف مسجد" },
  { action: "reject", nameAr: "رفض المسجد" },
  { action: "approve", nameAr: "اعتماد المساجد" },
] as const;
export const MOSQUE_PERMISSION_IDS = MOSQUE_PERMISSIONS.map(p => `mosques.${p.action}`);
export function mosqueHasImam(mosque: { imamName?: string | null; registeredByUser?: { requesterType?: string | null } | null }) {
  return Boolean(mosque.imamName?.trim() || mosque.registeredByUser?.requesterType === "imam");
}
