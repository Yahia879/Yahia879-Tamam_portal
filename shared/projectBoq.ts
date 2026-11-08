export function isProjectBoqApproved(project: {
  isMultiMosque?: boolean | null;
  request?: { currentStage?: string | null } | null;
  phases?: { phaseName?: string | null; phaseOrder?: number; status?: string | null; completionPercentage?: number | null }[];
} | null | undefined): boolean {
  if (!project) return false;
  if (["financial_eval_and_approval", "contracting", "execution", "handover", "closed"].includes(project.request?.currentStage || "")) return true;
  return !!project.phases?.some(phase =>
    (phase.phaseName?.includes("جدول الكميات") || phase.phaseOrder === (project.isMultiMosque ? 1 : 2)) &&
    (phase.status === "completed" || Number(phase.completionPercentage || 0) >= 100)
  );
}
