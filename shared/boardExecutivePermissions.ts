export const BOARD_EXECUTIVE_PERMISSION_IDS = {
  view: "board_chairman",
  viewOrderReport: "board_leadership.bank_transfers_view_order_report",
  viewRequest: "board_leadership.bank_transfers_view_request",
  notes: "board_leadership.bank_transfers_notes",
  approve: "board_leadership.bank_transfers_approve",
  reject: "board_leadership.bank_transfers_reject",
} as const;

export function isBoardExecutivePermission(permission: string) {
  return permission === "board_chairman" || permission === "board_chairman_view" || permission.startsWith("board_leadership.");
}

export function boardExecutiveAccess(permissions: string[]) {
  const canView = permissions.includes(BOARD_EXECUTIVE_PERMISSION_IDS.view);
  return {
    canView,
    canViewOrderReport: canView && permissions.includes(BOARD_EXECUTIVE_PERMISSION_IDS.viewOrderReport),
    canViewRequest: canView && permissions.includes(BOARD_EXECUTIVE_PERMISSION_IDS.viewRequest),
    canAddNotes: canView && permissions.includes(BOARD_EXECUTIVE_PERMISSION_IDS.notes),
    canApprove: canView && permissions.includes(BOARD_EXECUTIVE_PERMISSION_IDS.approve),
    canReject: canView && permissions.includes(BOARD_EXECUTIVE_PERMISSION_IDS.reject),
  };
}
