export const CONTRACT_PERMISSIONS = [
  { action: "view", nameAr: "عرض قسم العقود" },
  { action: "create", nameAr: "إنشاء عقد جديد" },
  { action: "edit", nameAr: "تعديل بيانات العقد" },
  { action: "approve", nameAr: "اعتماد العقد" },
  { action: "edit_approved", nameAr: "تعديل العقود المعتمدة" },
  { action: "export", nameAr: "تصدير وطباعة العقود" },
  { action: "template_view", nameAr: "عرض قوالب العقود" },
  { action: "template_add", nameAr: "إضافة قالب جديد" },
  { action: "template_edit", nameAr: "تعديل القالب" },
  { action: "template_delete", nameAr: "حذف القالب" },
  { action: "preamble_add", nameAr: "إضافة تمهيد" },
  { action: "preamble_edit", nameAr: "تعديل التمهيد" },
  { action: "clause_add", nameAr: "إضافة بند جديد للقالب" },
  { action: "clause_edit", nameAr: "تعديل بنود القالب" },
  { action: "clause_delete", nameAr: "حذف بنود القالب" },
] as const;

export const CONTRACT_PERMISSION_IDS = CONTRACT_PERMISSIONS.map(p => `contracts.${p.action}`);

// Active/completed contracts and previously approved contracts retain their protection.
export function isApprovedContract(contract: { status?: string | null; approvedAt?: unknown }): boolean {
  return !!contract.approvedAt || ["approved", "active", "completed"].includes(contract.status ?? "");
}

export function contractEditPermission(contract: { status?: string | null; approvedAt?: unknown }): string {
  return isApprovedContract(contract) ? "contracts.edit_approved" : "contracts.edit";
}

// Navigation summaries must not restore actions unchecked in the permission editor.
export function contractPermissionSelection(permissions: string[]): string[] {
  return permissions.filter(p => p !== "contracts" &&
    (!p.startsWith("contracts.") || CONTRACT_PERMISSION_IDS.includes(p)));
}

export function contractPermissionOptions(permissions: string[]): string[] {
  const legacySection = permissions.includes("contracts") &&
    !permissions.some(p => CONTRACT_PERMISSION_IDS.includes(p));
  return contractPermissionSelection(legacySection ? [...permissions, ...CONTRACT_PERMISSION_IDS] : permissions);
}
