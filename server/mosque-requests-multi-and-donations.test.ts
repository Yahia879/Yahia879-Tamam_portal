import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import {
  canTransferDonationBetweenRequests,
  getRequestLifecycleCategory,
  isRequestActive,
} from "../shared/mosqueRequests";

describe("shared/mosqueRequests helpers", () => {
  it("classifies active, closed, and rejected requests accurately", () => {
    expect(
      getRequestLifecycleCategory({
        status: "in_progress",
        currentStage: "execution",
        closureStatus: null,
      })
    ).toBe("active");
    expect(isRequestActive({ status: "pending", currentStage: "submitted" })).toBe(true);

    expect(
      getRequestLifecycleCategory({
        status: "completed",
        currentStage: "closed",
        closureStatus: "confirmed",
      })
    ).toBe("closed");
    expect(isRequestActive({ status: "in_progress", currentStage: "execution", closureStatus: "confirmed" })).toBe(false);

    expect(
      getRequestLifecycleCategory({
        status: "rejected",
        currentStage: "technical_eval",
      })
    ).toBe("rejected");
    expect(
      getRequestLifecycleCategory({
        status: "in_progress",
        currentStage: "technical_eval",
        technicalEvalDecision: "apologize",
      })
    ).toBe("rejected");
  });

  it("allows donation balance transfers only between distinct active target requests of the same mosque", () => {
    const source = { id: 10, mosqueId: 5, status: "in_progress", currentStage: "execution" };
    const validTarget = { id: 11, mosqueId: 5, status: "in_progress", currentStage: "technical_eval" };
    const otherMosqueTarget = { id: 12, mosqueId: 6, status: "in_progress", currentStage: "technical_eval" };
    const closedTarget = { id: 13, mosqueId: 5, status: "completed", currentStage: "closed" };
    const rejectedTarget = { id: 14, mosqueId: 5, status: "rejected", currentStage: "technical_eval" };

    expect(canTransferDonationBetweenRequests(source, validTarget)).toEqual({ allowed: true });
    expect(canTransferDonationBetweenRequests(source, source).allowed).toBe(false);
    expect(canTransferDonationBetweenRequests(source, otherMosqueTarget).allowed).toBe(false);
    expect(canTransferDonationBetweenRequests(source, closedTarget).allowed).toBe(false);
    expect(canTransferDonationBetweenRequests(source, rejectedTarget).allowed).toBe(false);
  });
});

describe("multi-request, administrative closure, imam evaluation, and internal comments integration", () => {
  it("closes open donation opportunities automatically on confirmClose and filters internal comments for requesters", () => {
    const requestsRouterSrc = fs.readFileSync(
      path.resolve(process.cwd(), "server/routers/requests.ts"),
      "utf8"
    );
    expect(requestsRouterSrc).toContain("siblingMosqueRequests");
    expect(requestsRouterSrc).toContain("transferDonationBalance");
    expect(requestsRouterSrc).toContain("updateDonationCollectedAmount");
    expect(requestsRouterSrc).toContain('eq(donationOpportunities.status, "active")');
    expect(requestsRouterSrc).toContain('status: "closed"');
    expect(requestsRouterSrc).toContain("eq(requestComments.isInternal, false)");
  });

  it("marks field visit scheduling comments as internal so they do not leak to service_requester", () => {
    const fieldVisitsSrc = fs.readFileSync(
      path.resolve(process.cwd(), "server/routers/fieldVisits.ts"),
      "utf8"
    );
    expect(fieldVisitsSrc).toContain("isInternal: true");
  });

  it("returns imam evaluations and active/previous summary in getRequesterRelatedActivity", () => {
    const usersRouterSrc = fs.readFileSync(
      path.resolve(process.cwd(), "server/routers/users.ts"),
      "utf8"
    );
    expect(usersRouterSrc).toContain("imamEvaluations");
    expect(usersRouterSrc).toContain("imamRatingSummary");
    expect(usersRouterSrc).toContain("beneficiaryInfoAccuracyRating");
    expect(usersRouterSrc).toContain("activeRequestsCount");
    expect(usersRouterSrc).toContain("previousRequestsCount");
  });
});
