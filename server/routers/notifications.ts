import { z } from "zod";
import { router, protectedProcedure, adminProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { notifications, users } from "../../drizzle/schema";
import { eq, desc, and, sql, inArray } from "drizzle-orm";
import { notifyOwner } from "../_core/notification";
import { TRPCError } from "@trpc/server";

// أنواع الإشعارات (مطابقة للـ schema)
export const NOTIFICATION_TYPES = {
  info: "إشعار",
  success: "نجاح",
  warning: "تحذير",
  error: "خطأ",
  request_update: "تحديث طلب",
  system: "نظام",
} as const;

export type NotificationType = "info" | "success" | "warning" | "error" | "request_update" | "system";

// دالة مساعدة لإنشاء إشعار
export async function createNotification(data: {
  userId: number;
  type: NotificationType;
  title: string;
  message: string;
  relatedType?: string;
  relatedId?: number;
}) {
  const db = await getDb();
  if (!db) return null;

  try {
    const result = await db.insert(notifications).values({
      userId: data.userId,
      type: data.type as any,
      title: data.title,
      message: data.message,
      relatedType: data.relatedType,
      relatedId: data.relatedId,
      isRead: false,
    });

    return result;
  } catch (error) {
    console.error("Error creating notification:", error);
    return null;
  }
}

// دالة لإرسال إشعار لمجموعة من المستخدمين حسب الدور
export async function notifyUsersByRole(
  roles: string[],
  type: NotificationType,
  title: string,
  message: string,
  relatedType?: string,
  relatedId?: number
) {
  const db = await getDb();
  if (!db) return;

  try {
    // جلب المستخدمين حسب الأدوار
    const targetUsers = await db
      .select({ id: users.id })
      .from(users)
      .where(inArray(users.role, roles as any));

    // إنشاء إشعارات لجميع المستخدمين
    for (const user of targetUsers) {
      await createNotification({
        userId: user.id,
        type,
        title,
        message,
        relatedType,
        relatedId,
      });
    }

    // إرسال إشعار للمالك أيضاً
    await notifyOwner({
      title,
      content: message,
    });
  } catch (error) {
    console.error("Error notifying users by role:", error);
  }
}

// دالة لإرسال إشعار عند تقديم طلب جديد
export async function notifyNewRequest(
  requestId: number,
  requestNumber: string,
  programName: string,
  mosqueName: string
) {
  await notifyUsersByRole(
    ["super_admin", "system_admin", "projects_office"],
    "request_update",
    "طلب جديد",
    `تم تقديم طلب جديد رقم ${requestNumber} لبرنامج ${programName} - ${mosqueName}`,
    "request",
    requestId
  );
}

// دالة لإرسال إشعار عند تغيير حالة الطلب
export async function notifyRequestStatusChange(
  requestId: number,
  requestNumber: string,
  newStatus: string,
  statusLabel: string,
  requesterId: number
) {
  // إشعار مقدم الطلب
  await createNotification({
    userId: requesterId,
    type: "request_update",
    title: "تحديث حالة الطلب",
    message: `تم تحديث حالة طلبك رقم ${requestNumber} إلى: ${statusLabel}`,
    relatedType: "request",
    relatedId: requestId,
  });
}

// دالة لإرسال إشعار عند إضافة تعليق
export async function notifyNewComment(
  requestId: number,
  requestNumber: string,
  commenterName: string,
  requesterId: number
) {
  await createNotification({
    userId: requesterId,
    type: "info",
    title: "تعليق جديد",
    message: `أضاف ${commenterName} تعليقاً على طلبك رقم ${requestNumber}`,
    relatedType: "request",
    relatedId: requestId,
  });
}

// دالة لإرسال إشعار عند جدولة زيارة ميدانية
export async function notifyFieldVisitScheduled(
  requestId: number,
  requestNumber: string,
  visitDate: Date,
  assignedUserId: number
) {
  await createNotification({
    userId: assignedUserId,
    type: "info",
    title: "زيارة ميدانية مجدولة",
    message: `تم جدولة زيارة ميدانية للطلب رقم ${requestNumber} بتاريخ ${visitDate.toLocaleDateString("ar-SA")}`,
    relatedType: "request",
    relatedId: requestId,
  });
}

export const notificationsRouter = router({
  // جلب إشعارات المستخدم الحالي
  getMyNotifications: protectedProcedure
    .input(
      z.object({
        page: z.number().default(1),
        limit: z.number().default(20),
        unreadOnly: z.boolean().default(false),
      })
    )
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      }

      const offset = (input.page - 1) * input.limit;

      const conditions = [eq(notifications.userId, ctx.user.id)];
      if (input.unreadOnly) {
        conditions.push(eq(notifications.isRead, false));
      }

      const [notificationsList, countResult] = await Promise.all([
        db
          .select()
          .from(notifications)
          .where(and(...conditions))
          .orderBy(desc(notifications.createdAt))
          .limit(input.limit)
          .offset(offset),
        db
          .select({ count: sql<number>`count(*)` })
          .from(notifications)
          .where(and(...conditions)),
      ]);

      return {
        notifications: notificationsList,
        total: countResult[0]?.count || 0,
        page: input.page,
        totalPages: Math.ceil((countResult[0]?.count || 0) / input.limit),
      };
    }),

  // عدد الإشعارات غير المقروءة
  getUnreadCount: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return 0;

    const result = await db
      .select({ count: sql<number>`count(*)` })
      .from(notifications)
      .where(and(eq(notifications.userId, ctx.user.id), eq(notifications.isRead, false)));

    return result[0]?.count || 0;
  }),

  // تحديد إشعار كمقروء
  markAsRead: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      }

      await db
        .update(notifications)
        .set({ isRead: true, readAt: new Date() })
        .where(and(eq(notifications.id, input.id), eq(notifications.userId, ctx.user.id)));

      return { success: true };
    }),

  // تحديد جميع الإشعارات كمقروءة
  markAllAsRead: protectedProcedure.mutation(async ({ ctx }) => {
    const db = await getDb();
    if (!db) {
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
    }

    await db
      .update(notifications)
      .set({ isRead: true, readAt: new Date() })
      .where(and(eq(notifications.userId, ctx.user.id), eq(notifications.isRead, false)));

    return { success: true };
  }),

  // إرسال إشعار (للمدراء فقط)
  send: adminProcedure
    .input(
      z.object({
        userId: z.number().optional(),
        roles: z.array(z.string()).optional(),
        type: z.string().default("general"),
        title: z.string().min(1),
        message: z.string().min(1),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      }

      if (input.userId) {
        // إرسال لمستخدم محدد
        await createNotification({
          userId: input.userId,
          type: input.type as NotificationType,
          title: input.title,
          message: input.message,
        });
      } else if (input.roles && input.roles.length > 0) {
        // إرسال لمجموعة أدوار
        await notifyUsersByRole(
          input.roles,
          input.type as NotificationType,
          input.title,
          input.message
        );
      } else {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "يجب تحديد مستخدم أو أدوار لإرسال الإشعار",
        });
      }

      return { success: true };
    }),

  // حذف إشعار
  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      }

      await db
        .delete(notifications)
        .where(and(eq(notifications.id, input.id), eq(notifications.userId, ctx.user.id)));

      return { success: true };
    }),
});
