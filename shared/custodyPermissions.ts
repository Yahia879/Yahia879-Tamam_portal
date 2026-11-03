export type CustodyUser = {
  role?: string | null;
  name?: string | null;
  email?: string | null;
  customRole?: { nameAr?: string | null; nameEn?: string | null } | null;
};

export const CUSTODY_PERMISSION_ACTIONS = ["view", "create", "request_exception", "edit", "delete", "approve", "settle", "print"];
export const CUSTODY_PERSONAL_PERMISSIONS = ["custody_requests.create", "custody_requests.request_exception"];

export function custodyStaffReviewer(user?: CustodyUser | null): boolean {
  if (!user) return false;
  return ["super_admin", "system_admin", "executive_director", "general_manager"].includes(user.role ?? "") ||
    ["المدير التنفيذي", "الرئيس التنفيذي"].includes(user.customRole?.nameAr ?? "") ||
    user.customRole?.nameEn?.toLowerCase() === "executive director" ||
    user.name === "المدير التنفيذي" || user.email === "ceo@manarah.org.sa";
}

export function custodyAccess(user: CustodyUser | null | undefined, permissions: string[]) {
  const canSeeStaff = custodyStaffReviewer(user);
  const canCreate = permissions.includes("custody_requests.create");
  const canRequestException = permissions.includes("custody_requests.request_exception");
  return {
    canSeeStaff,
    canCreate,
    canSeeMy: canCreate,
    canRequestException,
    canSeeExceptions: canSeeStaff || canRequestException,
    canEnter: canSeeStaff || canCreate || canRequestException || permissions.includes("custody_requests.view"),
  };
}

export function custodyPermissionSelection(permissions: string[]): string[] {
  return permissions.filter(p => p !== "custody_requests");
}

export function custodyPermissionOptions(permissions: string[]): string[] {
  const legacySection = permissions.includes("custody_requests") && !permissions.some(p => p.startsWith("custody_requests."));
  return custodyPermissionSelection(legacySection ? [...permissions, ...CUSTODY_PERMISSION_ACTIONS.map(p => `custody_requests.${p}`)] : permissions);
}
