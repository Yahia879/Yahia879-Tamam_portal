import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { supportTickets, users } from "../../drizzle/schema";
import { eq, desc } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { permissionProcedure, checkPermission } from "../permissions";
import { nanoid } from "nanoid";

// Executable files blacklist validation regex (blocks exe, bat, cmd, sh, msi, dll, scr, vbs, com, bin, jar, app, dmg, elf)
const executableRegex = /\.(exe|bat|cmd|sh|msi|dll|scr|vbs|com|bin|jar|app|dmg|elf)(\?.*)?$/i;
const attachmentSchema = z.string().url().refine((url) => !executableRegex.test(url), {
  message: "الملف المرفق غير مدعوم أو غير آمن (يُمنع رفع الملفات البرمجية والتنفيذية)",
});

export const supportTicketsRouter = router({
  // إنشاء تذكرة جديدة (للمستخدمين العاديين الذين يملكون صلاحية Create_Ticket)
  createTicket: permissionProcedure("Create_Ticket")
    .input(
      z.object({
        ticketType: z.enum(["technical_issue", "suggestion"]),
        description: z.string().min(10, "وصف المشكلة يجب ألا يقل عن 10 أحرف"),
        attachments: z.array(attachmentSchema).optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = (await getDb())!;
      
      const newTicket = {
        userId: ctx.user.id,
        ticketType: input.ticketType,
        description: input.description,
        attachments: input.attachments || [],
        status: "pending" as const,
        replies: [],
      };

      await db.insert(supportTickets).values(newTicket);
      return { success: true };
    }),

  // جلب التذاكر الخاصة بالمستخدم الحالي
  getMyTickets: protectedProcedure.query(async ({ ctx }) => {
    const db = (await getDb())!;
    
    // تأكيد امتلاك صلاحية إنشاء التذاكر لرؤيتها
    const hasCreate = await checkPermission(ctx.user.id, "Create_Ticket");
    if (!hasCreate) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "ليس لديك صلاحية الوصول للدعم الفني",
      });
    }

    return await db
      .select()
      .from(supportTickets)
      .where(eq(supportTickets.userId, ctx.user.id))
      .orderBy(desc(supportTickets.createdAt));
  }),

  // جلب جميع التذاكر (للمسؤولين)
  getAllTickets: permissionProcedure("View_Tickets").query(async () => {
    const db = (await getDb())!;
    
    // جلب التذاكر مع اسم وعنوان البريد الإلكتروني للمستخدم
    const tickets = await db
      .select({
        id: supportTickets.id,
        userId: supportTickets.userId,
        ticketType: supportTickets.ticketType,
        description: supportTickets.description,
        attachments: supportTickets.attachments,
        status: supportTickets.status,
        replies: supportTickets.replies,
        createdAt: supportTickets.createdAt,
        updatedAt: supportTickets.updatedAt,
        userName: users.name,
        userEmail: users.email,
      })
      .from(supportTickets)
      .leftJoin(users, eq(supportTickets.userId, users.id))
      .orderBy(desc(supportTickets.createdAt));

    return tickets;
  }),

  // الحصول على تذكرة محددة مع التحقق من الهوية والصلاحيات
  getTicketById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input, ctx }) => {
      const db = (await getDb())!;
      
      const tickets = await db
        .select({
          id: supportTickets.id,
          userId: supportTickets.userId,
          ticketType: supportTickets.ticketType,
          description: supportTickets.description,
          attachments: supportTickets.attachments,
          status: supportTickets.status,
          replies: supportTickets.replies,
          createdAt: supportTickets.createdAt,
          updatedAt: supportTickets.updatedAt,
          userName: users.name,
          userEmail: users.email,
        })
        .from(supportTickets)
        .leftJoin(users, eq(supportTickets.userId, users.id))
        .where(eq(supportTickets.id, input.id))
        .limit(1);

      if (tickets.length === 0) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "التذكرة المطلوبة غير موجودة",
        });
      }

      const ticket = tickets[0];
      const hasViewAll = await checkPermission(ctx.user.id, "View_Tickets");

      // إذا لم يكن مسؤولاً، يجب أن يكون هو صاحب التذكرة ويملك صلاحية Create_Ticket
      if (!hasViewAll) {
        const hasCreate = await checkPermission(ctx.user.id, "Create_Ticket");
        if (!hasCreate || ticket.userId !== ctx.user.id) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "غير مصرح لك بعرض هذه التذكرة",
          });
        }
      }

      return ticket;
    }),

  // إضافة رد على تذكرة
  addReply: protectedProcedure
    .input(
      z.object({
        ticketId: z.number(),
        message: z.string().min(1, "الرد لا يمكن أن يكون فارغاً"),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = (await getDb())!;
      
      const ticketResult = await db
        .select()
        .from(supportTickets)
        .where(eq(supportTickets.id, input.ticketId))
        .limit(1);

      if (ticketResult.length === 0) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "التذكرة غير موجودة",
        });
      }

      const ticket = ticketResult[0];
      const hasViewAll = await checkPermission(ctx.user.id, "View_Tickets");
      const hasCreate = await checkPermission(ctx.user.id, "Create_Ticket");

      // التحقق من الهوية والصلاحيات للرد
      if (!hasViewAll) {
        if (!hasCreate || ticket.userId !== ctx.user.id) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "غير مصرح لك بالرد على هذه التذكرة",
          });
        }
      }

      // جلب معلومات المرسل لضمان الاسم الصحيح
      const sender = await db
        .select({ name: users.name })
        .from(users)
        .where(eq(users.id, ctx.user.id))
        .limit(1);

      const senderName = sender[0]?.name || "مستخدم";
      const currentReplies = (ticket.replies as any[]) || [];
      
      const newReply = {
        id: nanoid(),
        senderId: ctx.user.id,
        senderName: senderName,
        message: input.message,
        createdAt: new Date().toISOString(),
      };

      const updatedReplies = [...currentReplies, newReply];

      await db
        .update(supportTickets)
        .set({ replies: updatedReplies })
        .where(eq(supportTickets.id, input.ticketId));

      return { success: true, reply: newReply };
    }),

  // تحديث حالة التذكرة (للمسؤولين فقط)
  updateStatus: permissionProcedure("View_Tickets")
    .input(
      z.object({
        ticketId: z.number(),
        status: z.enum(["pending", "resolved", "needs_clarification"]),
      })
    )
    .mutation(async ({ input }) => {
      const db = (await getDb())!;
      
      await db
        .update(supportTickets)
        .set({ status: input.status })
        .where(eq(supportTickets.id, input.ticketId));

      return { success: true };
    }),
});
