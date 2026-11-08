export const REQUEST_SECTION_PERMISSION_IDS = [
  "requests.view", "requests.create", "requests.edit", "requests.delete", "requests.view_details",
  "requests.add_review_note", "requests.transfer_to_beneficiary", "requests.manage_as_field_team",
  "requests.manage_as_quick_response", "requests.upload_final_report", "requests.create_quick_request",
  "sedana_requests.view", "sedana_requests.desk_review", "sedana_requests.manage",
];
export const REQUEST_LIST_ENTRY_PERMISSIONS = ["requests.view", "sedana_requests.view", "sedana_requests.manage"];
export function isRequestSectionPermission(permission: string) {
  return permission === "requests" || permission.startsWith("requests.") ||
    permission === "sedana_requests" || permission.startsWith("sedana_requests.");
}
export function requestListAccess(permissions: readonly string[]) {
  const has = (id: string) => permissions.includes(id);
  const canViewGeneral = has("requests.view");
  const canViewSedana = has("sedana_requests.view");
  return {
    canViewGeneral, canViewSedana, canRead: canViewGeneral || canViewSedana,
    canEnter: REQUEST_LIST_ENTRY_PERMISSIONS.some(has),
    canViewDetails: (programType: unknown) => programType === "sedana"
      ? canViewSedana && (has("sedana_requests.desk_review") || has("sedana_requests.manage"))
      : canViewGeneral && has("requests.view_details"),
  };
}
