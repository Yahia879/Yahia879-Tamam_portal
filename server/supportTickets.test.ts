import { describe, expect, it, vi, beforeEach } from "vitest";

// Declare mockCheckPermission using hoisted variables
const { mockCheckPermission, mockProcedure } = vi.hoisted(() => {
  const { initTRPC } = require("@trpc/server");
  const t = initTRPC.context().create();
  return {
    mockCheckPermission: vi.fn().mockReturnValue(Promise.resolve(true)),
    mockProcedure: t.procedure,
  };
});

// Mock permissions module using hoisted variables and original imports
vi.mock("./permissions", async importOriginal => {
  const actual = await importOriginal<typeof import("./permissions")>();
  return {
    ...actual,
    checkPermission: (userId: number, perm: string) =>
      mockCheckPermission(userId, perm),
    permissionProcedure: (perm: string) => {
      return mockProcedure.use(async ({ ctx, next }: any) => {
        const has = await mockCheckPermission(ctx.user.id, perm);
        if (!has) {
          throw new Error(`FORBIDDEN: ليس لديك صلاحية: ${perm}`);
        }
        return next({ ctx });
      });
    },
  };
});

import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// Mock database
const mockDb = {
  select: vi.fn().mockReturnThis(),
  from: vi.fn().mockReturnThis(),
  where: vi.fn().mockReturnThis(),
  orderBy: vi.fn().mockReturnThis(),
  limit: vi.fn().mockReturnValue(Promise.resolve([])),
  insert: vi.fn().mockReturnThis(),
  values: vi.fn().mockReturnValue(Promise.resolve([{ insertId: 1 }])),
  update: vi.fn().mockReturnThis(),
  set: vi.fn().mockReturnThis(),
  leftJoin: vi.fn().mockReturnThis(),
};

vi.mock("./db", () => ({
  getDb: vi.fn(() => Promise.resolve(mockDb)),
}));

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createMockContext(role: string = "service_requester"): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-user-123",
    email: "test@example.com",
    name: "Test User",
    loginMethod: "email",
    role: role as any,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  return {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: vi.fn(),
    } as unknown as TrpcContext["res"],
  };
}

describe("Support Tickets Router", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCheckPermission.mockReset();
    mockDb.limit.mockReset().mockReturnValue(Promise.resolve([]));
    mockDb.values
      .mockReset()
      .mockReturnValue(Promise.resolve([{ insertId: 1 }]));
  });

  describe("createTicket - RBAC Validation", () => {
    it("should allow ticket creation if user has Create_Ticket permission", async () => {
      mockCheckPermission.mockResolvedValue(true); // Has permission
      const ctx = createMockContext("service_requester");
      const caller = appRouter.createCaller(ctx);

      const result = await caller.supportTickets.createTicket({
        ticketType: "technical_issue",
        description: "واجهة النظام معطلة تماماً عند الضغط على تسجيل الخروج",
        attachments: ["https://example.com/assets/screenshot.png"],
      });

      expect(result).toEqual({ success: true });
      expect(mockDb.insert).toHaveBeenCalled();
    });

    it("should block ticket creation if user does not have Create_Ticket permission", async () => {
      mockCheckPermission.mockResolvedValue(false); // Doesn't have permission
      const ctx = createMockContext("service_requester");
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.supportTickets.createTicket({
          ticketType: "technical_issue",
          description: "واجهة النظام معطلة تماماً عند الضغط على تسجيل الخروج",
          attachments: ["https://example.com/assets/screenshot.png"],
        })
      ).rejects.toThrow("FORBIDDEN: ليس لديك صلاحية: Create_Ticket");
    });
  });

  describe("createTicket - Input Validation (Zod)", () => {
    beforeEach(() => {
      mockCheckPermission.mockResolvedValue(true);
    });

    it("should reject description if length is less than 10 characters", async () => {
      const ctx = createMockContext("service_requester");
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.supportTickets.createTicket({
          ticketType: "technical_issue",
          description: "عطل",
          attachments: [],
        })
      ).rejects.toThrow();
    });

    it("should reject attachments with unsafe executable file extensions", async () => {
      const ctx = createMockContext("service_requester");
      const caller = appRouter.createCaller(ctx);

      // Executable file is NOT allowed
      await expect(
        caller.supportTickets.createTicket({
          ticketType: "technical_issue",
          description: "واجهة النظام معطلة تماماً عند الضغط على تسجيل الخروج",
          attachments: ["https://example.com/files/malware.exe"],
        })
      ).rejects.toThrow();

      // Shell script is NOT allowed
      await expect(
        caller.supportTickets.createTicket({
          ticketType: "technical_issue",
          description: "واجهة النظام معطلة تماماً عند الضغط على تسجيل الخروج",
          attachments: ["https://example.com/files/exploit.sh"],
        })
      ).rejects.toThrow();
    });

    it("should accept attachments with safe image, video, and document extensions", async () => {
      const ctx = createMockContext("service_requester");
      const caller = appRouter.createCaller(ctx);

      const result = await caller.supportTickets.createTicket({
        ticketType: "technical_issue",
        description: "هناك مشكلة في عرض تفاصيل المسجد عند التكبير",
        attachments: [
          "https://example.com/images/bug1.png",
          "https://example.com/images/bug2.jpg",
          "https://example.com/files/document.pdf",
          "https://example.com/videos/screenrec.mp4",
        ],
      });

      expect(result).toEqual({ success: true });
    });
  });

  describe("getAllTickets - RBAC Validation", () => {
    it("should allow administrators with View_Tickets permission to fetch all tickets", async () => {
      mockCheckPermission.mockResolvedValue(true);
      const ctx = createMockContext("system_admin");
      const caller = appRouter.createCaller(ctx);

      mockDb.limit.mockResolvedValueOnce([
        { id: 1, ticketType: "technical_issue", description: "Test ticket" },
      ]);

      const result = await caller.supportTickets.getAllTickets();
      expect(result).toBeDefined();
      expect(mockDb.select).toHaveBeenCalled();
    });

    it("should block non-privileged users without View_Tickets from fetching all tickets", async () => {
      mockCheckPermission.mockResolvedValue(false);
      const ctx = createMockContext("service_requester");
      const caller = appRouter.createCaller(ctx);

      await expect(caller.supportTickets.getAllTickets()).rejects.toThrow(
        "FORBIDDEN: ليس لديك صلاحية: View_Tickets"
      );
    });
  });

  describe("updateStatus - Auto Reply on Resolved", () => {
    it("should append a technical issue auto-reply when status is changed to resolved", async () => {
      mockCheckPermission.mockResolvedValue(true);
      const ctx = createMockContext("system_admin");
      const caller = appRouter.createCaller(ctx);

      // Mock first select (ticket) and second select (modifier user)
      mockDb.limit
        .mockResolvedValueOnce([
          {
            id: 1,
            userId: 1,
            status: "pending",
            ticketType: "technical_issue",
            replies: [],
          },
        ])
        .mockResolvedValueOnce([
          {
            name: "أحمد المسؤول",
          },
        ]);

      const result = await caller.supportTickets.updateStatus({
        ticketId: 1,
        status: "resolved",
      });

      expect(result).toEqual({ success: true });
      expect(mockDb.update).toHaveBeenCalled();
      expect(mockDb.set).toHaveBeenCalledWith(
        expect.objectContaining({
          status: "resolved",
          replies: expect.arrayContaining([
            expect.objectContaining({
              senderName: "أحمد المسؤول",
              message: expect.stringContaining(
                "تم حل المشكلة المُبلغ عنها بنجاح"
              ),
            }),
          ]),
        })
      );
    });

    it("should append a suggestion auto-reply when status is changed to resolved", async () => {
      mockCheckPermission.mockResolvedValue(true);
      const ctx = createMockContext("system_admin");
      const caller = appRouter.createCaller(ctx);

      // Mock first select (ticket) and second select (modifier user)
      mockDb.limit
        .mockResolvedValueOnce([
          {
            id: 2,
            userId: 1,
            status: "pending",
            ticketType: "suggestion",
            replies: [],
          },
        ])
        .mockResolvedValueOnce([
          {
            name: "سارة المشرفة",
          },
        ]);

      const result = await caller.supportTickets.updateStatus({
        ticketId: 2,
        status: "resolved",
      });

      expect(result).toEqual({ success: true });
      expect(mockDb.update).toHaveBeenCalled();
      expect(mockDb.set).toHaveBeenCalledWith(
        expect.objectContaining({
          status: "resolved",
          replies: expect.arrayContaining([
            expect.objectContaining({
              senderName: "سارة المشرفة",
              message: expect.stringContaining(
                "تمت مراجعة المقترح وتنفيذه بشكل كامل"
              ),
            }),
          ]),
        })
      );
    });

    it("should not append auto-reply if ticket status was already resolved", async () => {
      mockCheckPermission.mockResolvedValue(true);
      const ctx = createMockContext("system_admin");
      const caller = appRouter.createCaller(ctx);

      // Mock select (ticket)
      mockDb.limit.mockResolvedValueOnce([
        {
          id: 1,
          userId: 1,
          status: "resolved",
          ticketType: "technical_issue",
          replies: [],
        },
      ]);

      const result = await caller.supportTickets.updateStatus({
        ticketId: 1,
        status: "resolved",
      });

      expect(result).toEqual({ success: true });
      expect(mockDb.update).toHaveBeenCalled();
      expect(mockDb.set).toHaveBeenCalledWith({ status: "resolved" });
    });
  });
});
