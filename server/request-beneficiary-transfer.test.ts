import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";
import { canTransferRequestToBeneficiary } from "../shared/requestBeneficiaryTransfer";

const state = vi.hoisted(() => ({ allowed: false, rows: [] as any[][], writes: [] as any[], transactions: 0 }));
vi.mock("./db", () => ({ getDb: async () => {
  const db: any = {
    select: () => ({ from: () => ({ where: () => ({ limit: () => {
      const result = Promise.resolve(state.rows.shift() || []);
      return Object.assign(result, { for: () => result });
    } }) }) }),
    update: (table: unknown) => ({ set: (values: unknown) => ({ where: async () => { state.writes.push({ kind: "update", table, values }); } }) }),
    insert: (table: unknown) => ({ values: async (values: unknown) => { state.writes.push({ kind: "insert", table, values }); } }),
    transaction: async (callback: (tx: any) => unknown) => { state.transactions++; return callback(db); },
  };
  return db;
} }));
vi.mock("./permissions", async () => {
  const { protectedProcedure } = await import("./_core/trpc");
  const { TRPCError } = await import("@trpc/server");
  return {
    checkPermission: vi.fn(async () => false),
    permissionProcedure: (permission: string) => protectedProcedure.use(({ next }) => {
      if (!state.allowed || permission !== "requests.transfer_to_beneficiary") throw new TRPCError({ code: "FORBIDDEN" });
      return next();
    }),
  };
});

import { requestsRouter } from "./routers/requests";
import { auditLogs, mosqueRequests, requestHistory } from "../drizzle/schema";

const generalRequest = { id: 132, userId: 1, programType: "enaya", requestTrack: "standard", technicalEvalDecision: "convert_to_project", programData: {} };
const caller = () => requestsRouter.createCaller({ user: { id: 0 }, req: {}, res: {} } as TrpcContext);

describe("beneficiary transfer eligibility", () => {
  it("allows a general staff request, including a request converted to a project", () => {
    expect(canTransferRequestToBeneficiary(generalRequest, "super_admin")).toBe(true);
  });
  it("allows staff-owned Sedana requests but excludes beneficiary-owned and donation-linked Sedana requests", () => {
    const sedanaRequest = { ...generalRequest, programType: "sedana" };
    expect(canTransferRequestToBeneficiary(sedanaRequest, "projects_office")).toBe(true);
    expect(canTransferRequestToBeneficiary(sedanaRequest, "service_requester")).toBe(false);
    expect(canTransferRequestToBeneficiary(sedanaRequest, "projects_office", true)).toBe(false);
  });
  it.each([
    { ...generalRequest, requestTrack: "quick_response" },
    { ...generalRequest, technicalEvalDecision: "quick_response" },
    { ...generalRequest, technicalEvalDecision: "convert_to_donation" },
    { ...generalRequest, programData: JSON.stringify({ isQuickCreate: true }) },
    { ...generalRequest, programData: { source: "quick_create" } },
    { ...generalRequest, programType: "donation" },
  ])("rejects requests outside the general track: %o", (request) => {
    expect(canTransferRequestToBeneficiary(request, "super_admin")).toBe(false);
  });
  it("rejects donation opportunities and requests already owned by beneficiaries", () => {
    expect(canTransferRequestToBeneficiary(generalRequest, "super_admin", true)).toBe(false);
    expect(canTransferRequestToBeneficiary(generalRequest, "service_requester")).toBe(false);
  });
});

describe("request ownership transfer", () => {
  beforeEach(() => { state.allowed = true; state.rows = []; state.writes = []; state.transactions = 0; });
  it("requires its dedicated permission", async () => {
    state.allowed = false;
    await expect(caller().transferToBeneficiary({ requestId: 132, beneficiaryId: 42 })).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(state.transactions).toBe(0);
  });
  it.each(["enaya", "sedana"])("changes the owner and records both audit histories for %s", async (programType) => {
    state.rows = [[{ ...generalRequest, programType }], [{ role: "super_admin" }], [], [{ id: 42, name: "مستفيد" }]];
    await expect(caller().transferToBeneficiary({ requestId: 132, beneficiaryId: 42 })).resolves.toMatchObject({ success: true });
    expect(state.transactions).toBe(1);
    expect(state.writes).toEqual([
      { kind: "update", table: mosqueRequests, values: { userId: 42 } },
      { kind: "insert", table: requestHistory, values: expect.objectContaining({ requestId: 132, action: "transferred_to_beneficiary" }) },
      { kind: "insert", table: auditLogs, values: expect.objectContaining({ oldValues: { userId: 1 }, newValues: { userId: 42 } }) },
    ]);
  });
  it("rejects donation and quick requests on the server without changing ownership", async () => {
    state.rows = [[{ ...generalRequest, requestTrack: "quick_response" }], [{ role: "super_admin" }], []];
    await expect(caller().transferToBeneficiary({ requestId: 132, beneficiaryId: 42 })).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(state.writes).toHaveLength(0);
  });
  it("rejects a beneficiary who is deleted, suspended, or missing", async () => {
    state.rows = [[generalRequest], [{ role: "super_admin" }], [], []];
    await expect(caller().transferToBeneficiary({ requestId: 132, beneficiaryId: 42 })).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(state.writes).toHaveLength(0);
  });
});
