export type MosqueApprovalStatus = "approved" | "pending" | "rejected";

export const MOSQUE_MARKER_COLORS: Record<MosqueApprovalStatus, string> = {
  approved: "#22c55e",
  pending: "#f59e0b",
  rejected: "#ef4444",
};

export function normalizeMosqueApprovalStatus(status: unknown): MosqueApprovalStatus {
  const value = typeof status === "string" ? status.replace(/\0/g, "").trim().toLowerCase() : "";
  return value === "approved" || value === "rejected" ? value : "pending";
}
