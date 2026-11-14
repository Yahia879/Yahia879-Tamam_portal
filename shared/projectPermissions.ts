export const PROJECT_ACTIONS = ["view", "view_details", "create_multi_mosque", "assign_as_manager", "financials", "edit_support_and_fees", "add_receipt_voucher"] as const;
export const PROJECT_PERMISSION_IDS = PROJECT_ACTIONS.map(action => `projects.${action}`);

export function isProjectPermission(permission: string): boolean {
  return permission === "projects" || permission.startsWith("projects.");
}

export function projectPermissionSelection(permissions: string[]): string[] {
  const selected = permissions.includes("projects") && !permissions.some(permission => permission.startsWith("projects."))
    ? [...permissions, ...PROJECT_PERMISSION_IDS] : permissions;
  return selected.filter(permission => permission !== "projects");
}

export function projectAccess(permissions: readonly string[]) {
  const canView = permissions.includes("projects.view");
  const canViewDetails = canView && permissions.includes("projects.view_details");
  const canCreate = canView && permissions.includes("projects.create_multi_mosque");
  const canAssignAsManager = canView && permissions.includes("projects.assign_as_manager");
  const canViewFinancials = canView && permissions.includes("projects.financials");
  const canEditSupportAndFees = canViewFinancials && permissions.includes("projects.edit_support_and_fees");
  const canAddReceiptVoucher = canViewFinancials && permissions.includes("projects.add_receipt_voucher");
  return { canView, canViewDetails, canCreate, canAssignAsManager, canViewFinancials, canEditSupportAndFees, canAddReceiptVoucher,
    canOpenProject: canViewDetails || canViewFinancials };
}
