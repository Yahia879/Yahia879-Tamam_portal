import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { supportTickets, users } from "../../drizzle/schema";
import { eq, desc, isNull } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { permissionProcedure, checkPermission } from "../permissions";
import { nanoid } from "nanoid";
import { createNotification } from "./notifications";

// Executable files blacklist validation regex (blocks exe, bat, cmd, sh, msi, dll, scr, vbs, com, bin, jar, app, dmg, elf)
const executableRegex =
  /\.(exe|bat|cmd|sh|msi|dll|scr|vbs|com|bin|jar|app|dmg|elf)(\?.*)?$/i;
const attachmentSchema = z
  .string()
  .refine(url => url.startsWith("/") || /^(https?:\/\/)/i.test(url), {
    message: "رابط الملف غير صالح",
  })
  .refine(url => !executableRegex.test(url), {
    message:
      "الملف المرفق غير مدعوم أو غير آمن (يُمنع رفع الملفات البرمجية والتنفيذية)",
  });

async function notifyUsersWithPermission(
  permission: string,
  title: string,
  message: string,
  relatedType: string,
  relatedId: number,
  excludeUserId?: number
) {
  try {
    const db = (await getDb())!;
    const candidateUsers = await db
      .select({ id: users.id })
      .from(users)
      .where(isNull(users.deletedAt));

    for (const u of candidateUsers) {
      if (excludeUserId && u.id === excludeUserId) continue;
      const hasPerm = await checkPermission(u.id, permission);
      if (hasPerm) {
        await createNotification({
          userId: u.id,
          type: "info",
          title,
          message,
          relatedType,
          relatedId,
        });
      }
    }
  } catch (error) {
    console.error("Error in notifyUsersWithPermission:", error);
  }
}

export const supportTicketsRouter = router({
  // إنشاء تذكرة جديدة (للمستخدمين العاديين الذين يملكون صلاحية Create_Ticket)
  createTicket: permissionProcedure("Create_Ticket")
    .input(
      z.object({
        ticketType: z.enum(["technical_issue", "suggestion"]),
        description: z.string().min(10, "وصف المشكلة يجب ألا يقل عن 10 أحرف"),
        attachments: z.array(attachmentSchema).optional(),
        createdAt: z.date().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = (await getDb())!;

      const autoReply = {
        id: nanoid(),
        senderId: 0,
        senderName: "فريق الدعم الفني",
        message:
          "شكرًا للتواصل معنا،\nتم استلام التذكرة بنجاح، وسيتم الرد من قبل فريق الدعم الفني في أقرب وقت ممكن.\n\nفريق الدعم الفني",
        attachments: [],
        createdAt: new Date().toISOString(),
      };

      const newTicket = {
        userId: ctx.user.id,
        ticketType: input.ticketType,
        description: input.description,
        attachments: input.attachments || [],
        status: "pending" as const,
        replies: [autoReply],
        createdAt: input.createdAt || new Date(),
      };

      const result = await db.insert(supportTickets).values(newTicket);
      const insertedId = result[0].insertId;

      try {
        const [creator] = await db
          .select({ name: users.name })
          .from(users)
          .where(eq(users.id, ctx.user.id))
          .limit(1);
        const creatorName = creator?.name || "مستخدم";

        await notifyUsersWithPermission(
          "View_Tickets",
          "تذكرة دعم فني جديدة",
          `قام مقدم الطلب ${creatorName} بتقديم تذكرة دعم فني جديدة رقم #${insertedId}`,
          "support_ticket",
          insertedId,
          ctx.user.id
        );
      } catch (err) {
        console.error(
          "Failed to send support ticket creation notification:",
          err
        );
      }

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
        attachments: z.array(attachmentSchema).optional(),
        createdAt: z.date().optional(),
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

      // معالجة آمنة للردود: التأكد من أنها مصفوفة صحيحة وليست نص JSON
      let currentReplies: any[] = [];
      const rawReplies = ticket.replies;
      if (Array.isArray(rawReplies)) {
        // تصفية العناصر الصحيحة فقط (كائنات تحتوي على id و message)
        currentReplies = rawReplies.filter(
          (r: any) => r && typeof r === "object" && r.id && r.message
        );
      } else if (typeof rawReplies === "string" && rawReplies.trim()) {
        try {
          const parsed = JSON.parse(rawReplies);
          if (Array.isArray(parsed)) {
            currentReplies = parsed.filter(
              (r: any) => r && typeof r === "object" && r.id && r.message
            );
          }
        } catch {
          currentReplies = [];
        }
      }

      const newReply = {
        id: nanoid(),
        senderId: ctx.user.id,
        senderName: senderName,
        message: input.message,
        attachments: input.attachments || [],
        createdAt: input.createdAt
          ? input.createdAt.toISOString()
          : new Date().toISOString(),
      };

      const updatedReplies = [...currentReplies, newReply];

      await db
        .update(supportTickets)
        .set({ replies: updatedReplies })
        .where(eq(supportTickets.id, input.ticketId));

      try {
        const title = "رد جديد على التذكرة";
        const isOwner = ctx.user.id === ticket.userId;
        const hasViewTickets = await checkPermission(
          ctx.user.id,
          "View_Tickets"
        );

        if (isOwner) {
          await notifyUsersWithPermission(
            "View_Tickets",
            title,
            `قام مقدم الطلب ${senderName} بإضافة رد جديد على تذكرة الدعم رقم #${ticket.id}`,
            "support_ticket",
            ticket.id,
            ctx.user.id
          );
        } else if (hasViewTickets) {
          await createNotification({
            userId: ticket.userId,
            type: "info",
            title,
            message: `قام المسؤول ${senderName} بإضافة رد جديد على تذكرة الدعم الخاصة بك رقم #${ticket.id}`,
            relatedType: "support_ticket",
            relatedId: ticket.id,
          });
        }
      } catch (err) {
        console.error("Failed to send support ticket reply notification:", err);
      }

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
    .mutation(async ({ input, ctx }) => {
      const db = (await getDb())!;
      let modifierName = "مسؤول الدعم";

      const ticketResult = await db
        .select({
          id: supportTickets.id,
          userId: supportTickets.userId,
          status: supportTickets.status,
          ticketType: supportTickets.ticketType,
          replies: supportTickets.replies,
        })
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

      const updateData: any = { status: input.status };
      const isResolvedTransition =
        input.status === "resolved" && ticket.status !== "resolved";
      const isNeedsClarificationTransition =
        input.status === "needs_clarification" &&
        ticket.status !== "needs_clarification";

      if (isResolvedTransition || isNeedsClarificationTransition) {
        // جلب اسم الشخص الذي قام بتغيير حالة التذكرة
        const modifier = await db
          .select({ name: users.name })
          .from(users)
          .where(eq(users.id, ctx.user.id))
          .limit(1);
        modifierName = modifier[0]?.name || "مسؤول الدعم";

        let autoReplyMessage = "";
        if (isResolvedTransition) {
          if (ticket.ticketType === "technical_issue") {
            autoReplyMessage = `تم حل المشكلة المُبلغ عنها بنجاح، في حال وجود اي ملاحظات إضافية، يسعدنا استقبالها في اي وقت \n\n${modifierName} - فريق الدعم الفني`;
          } else if (ticket.ticketType === "suggestion") {
            autoReplyMessage = `تمت مراجعة المقترح وتنفيذه بشكل كامل، في حال وجود اي ملاحظات او تحسينات إضافية، نسعد ب استقبالها في اي وقت\n\n${modifierName} - فريق الدعم الفني`;
          }
        } else if (isNeedsClarificationTransition) {
          autoReplyMessage = `شكرا للتواصل معنا،\nنرجو توضيح الطلب بشكل أدق لنتمكن من تقديم الدعم المطلوب ب أفضل صورة ممكنة\n\n${modifierName} - فريق الدعم الفني`;
        }

        if (autoReplyMessage) {
          const autoReply = {
            id: nanoid(),
            senderId: ctx.user.id,
            senderName: modifierName,
            message: autoReplyMessage,
            attachments: [],
            createdAt: new Date().toISOString(),
          };

          let currentReplies: any[] = [];
          const rawReplies = ticket.replies;
          if (Array.isArray(rawReplies)) {
            currentReplies = rawReplies.filter(
              (r: any) => r && typeof r === "object" && r.id && r.message
            );
          } else if (typeof rawReplies === "string" && rawReplies.trim()) {
            try {
              const parsed = JSON.parse(rawReplies);
              if (Array.isArray(parsed)) {
                currentReplies = parsed.filter(
                  (r: any) => r && typeof r === "object" && r.id && r.message
                );
              }
            } catch {
              currentReplies = [];
            }
          }

          updateData.replies = [...currentReplies, autoReply];
        }
      }

      await db
        .update(supportTickets)
        .set(updateData)
        .where(eq(supportTickets.id, input.ticketId));

      try {
        const statusNamesAr = {
          pending: "قيد الانتظار",
          resolved: "تم الحل",
          needs_clarification: "تحتاج توضيح",
        };

        const title = "تحديث حالة التذكرة";
        const message = `تم تغيير حالة تذكرة الدعم رقم #${ticket.id} إلى: ${statusNamesAr[input.status]}`;

        // Notify the owner directly about status change
        await createNotification({
          userId: ticket.userId,
          type: "info",
          title,
          message,
          relatedType: "support_ticket",
          relatedId: ticket.id,
        });

        // Also notify about the new reply if status was resolved or needs_clarification
        if (isResolvedTransition || isNeedsClarificationTransition) {
          await createNotification({
            userId: ticket.userId,
            type: "info",
            title: "رد جديد على التذكرة",
            message: `قام المسؤول ${modifierName} بإضافة رد جديد على تذكرة الدعم الخاصة بك رقم #${ticket.id}`,
            relatedType: "support_ticket",
            relatedId: ticket.id,
          });
        }
      } catch (err) {
        console.error(
          "Failed to send support ticket status update notification:",
          err
        );
      }

      return { success: true };
    }),

  // تنظيف الردود التالفة في جميع التذاكر (للمسؤولين)
  cleanupReplies: permissionProcedure("View_Tickets").mutation(async () => {
    const db = (await getDb())!;

    const allTicketsData = await db.select().from(supportTickets);
    let fixedCount = 0;

    for (const ticket of allTicketsData) {
      let rawReplies = ticket.replies;
      let cleanReplies: any[] = [];
      let needsFix = false;

      if (typeof rawReplies === "string") {
        try {
          rawReplies = JSON.parse(rawReplies);
        } catch {
          rawReplies = [];
          needsFix = true;
        }
      }

      if (Array.isArray(rawReplies)) {
        cleanReplies = rawReplies.filter(
          (r: any) => r && typeof r === "object" && r.id && r.message
        );
        if (cleanReplies.length !== (rawReplies as any[]).length) {
          needsFix = true;
        }
      } else {
        needsFix = true;
      }

      if (needsFix) {
        await db
          .update(supportTickets)
          .set({ replies: cleanReplies })
          .where(eq(supportTickets.id, ticket.id));
        fixedCount++;
      }
    }

    return { success: true, fixedCount, totalChecked: allTicketsData.length };
  }),
});
