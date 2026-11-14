export const PROGRESS_INVOICE_ACTIONS = ["view", "add", "edit", "approve", "revoke_approval", "exception_approve"] as const;
export const PROGRESS_INVOICE_PERMISSION_IDS = PROGRESS_INVOICE_ACTIONS.map(action => `progress_invoices.${action}`);

export function isProgressInvoicePermission(permission: string): boolean {
  return permission === "progress_invoices" || permission.startsWith("progress_invoices.");
}

export function isProgressInvoice(report: { title?: string | null; workSummary?: string | null }): boolean {
  return !!(report.workSummary?.includes("[نوع: مستخلص") || report.workSummary?.includes("[معرف المستخلص:") || report.title?.includes("مستخلص"));
}

export function progressInvoicePermissionSelection(permissions: string[]): string[] {
  const selected = permissions.includes("progress_invoices") && !permissions.some(permission => permission.startsWith("progress_invoices."))
    ? [...permissions, ...PROGRESS_INVOICE_PERMISSION_IDS] : permissions;
  return selected.filter(permission => permission !== "progress_invoices");
}

export function progressInvoiceAccess(permissions: readonly string[]) {
  const canView = permissions.includes("progress_invoices.view");
  const canAdd = canView && permissions.includes("progress_invoices.add");
  const canEdit = canView && permissions.includes("progress_invoices.edit");
  const canApprove = canView && permissions.includes("progress_invoices.approve");
  const canRevoke = canView && permissions.includes("progress_invoices.revoke_approval");
  const canExceptionApprove = canView && permissions.includes("progress_invoices.exception_approve");
  return { canView, canAdd, canEdit, canApprove, canRevoke, canExceptionApprove,
    hasActions: canEdit || canApprove || canRevoke || canExceptionApprove };
}
