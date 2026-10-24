type TransferableRequest = {
  programType: string;
  requestTrack?: string | null;
  technicalEvalDecision?: string | null;
  programData?: unknown;
};

export function canTransferRequestToBeneficiary(request: TransferableRequest, ownerRole?: string | null, hasDonationOpportunity = false) {
  if (!ownerRole || ["service_requester", "imam", "muezzin", "donor", "supplier"].includes(ownerRole)) return false;
  if (hasDonationOpportunity || request.programType === "donation") return false;
  if (request.requestTrack === "quick_response" || ["quick_response", "convert_to_donation"].includes(request.technicalEvalDecision || "")) return false;
  let data: any = request.programData;
  while (typeof data === "string") {
    try { data = JSON.parse(data); } catch { return false; }
  }
  return !data?.isQuickCreate && data?.source !== "quick_create";
}
