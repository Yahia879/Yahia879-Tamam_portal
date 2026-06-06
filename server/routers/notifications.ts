import { z } from "zod";
import { router, protectedProcedure, adminProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { notifications, users } from "../../drizzle/schema";
import { eq, desc, and, sql, inArray, ne, or, like, isNull } from "drizzle-orm";
import { notifyOwner } from "../_core/notification";
import { TRPCError } from "@trpc/server";
import { calculateUserPermissions } from "../permissions";

// أنواع الإشعارات (مطابقة للـ schema)
export const NOTIFICATION_TYPES = {
  info: "إشعار",
  success: "نجاح",
  warning: "تحذير",
  error: "خطأ",
  request_update: "تحديث طلب",
  system: "نظام",
  mosque: "مسجد",
  request: "طلب",
} as const;

export type NotificationType = "info" | "success" | "warning" | "error" | "request_update" | "system" | "mosque" | "request";

async function sendWhatsApp(phone: string, title: string, message: string) {
  const token = process.env.MOTTASL_API_TOKEN;
  const baseUrl = process.env.MOTTASL_API_URL || "https://api.mottasl.ai/v1";

  if (!token) {
    console.warn("WhatsApp notification skipped: MOTTASL_API_TOKEN is not configured in .env");
    return;
  }

  // Format phone number: strip '+', '00', spaces, and make sure it has the country code.
  let formattedPhone = phone.replace(/[\s+-]/g, "");
  if (formattedPhone.startsWith("00")) {
    formattedPhone = formattedPhone.substring(2);
  }
  // If phone starts with '05' (Saudi mobile without country code), prepend '966'
  if (formattedPhone.startsWith("05") && formattedPhone.length === 10) {
    formattedPhone = "966" + formattedPhone.substring(1);
  }

  const url = `${baseUrl}/message/send?create=true`;
  const body = JSON.stringify({
    to: formattedPhone,
    type: "text",
    text: {
      body: `${title}\n\n${message}`
    }
  });

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body
    });

    const resText = await response.text();
    if (!response.ok) {
      console.error(`Failed to send WhatsApp message. Status: ${response.status}, Response: ${resText}`);
    } else {
      console.log(`WhatsApp message sent successfully to ${formattedPhone}. Response: ${resText}`);
    }
  } catch (error) {
    console.error("Error sending WhatsApp message:", error);
  }
}

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

    // Fetch user role and phone to send WhatsApp message to service_requesters
    const [user] = await db
      .select({ role: users.role, phone: users.phone })
      .from(users)
      .where(eq(users.id, data.userId))
      .limit(1);

    if (user && user.role === "service_requester" && user.phone) {
      sendWhatsApp(user.phone, data.title, data.message).catch((err) => {
        console.error("Async WhatsApp error:", err);
      });
    }

    return result;
  } catch (error) {
    console.error("Error creating notification:", error);
    return null;
  }
}

// دالة لجلب معرفات جميع المسؤولين عن الطلبات (الذين لديهم أدوار افتراضية أو صلاحية requests.view_details)
async function getRequestOfficerIds(db: any, excludeUserId?: number): Promise<number[]> {
  try {
    // جلب المرشحين فقط (المستخدمين الذين ليس دورهم هو service_requester أو لديهم أدوار مخصصة أو صلاحيات مباشرة)
    const candidateUsers = await db
      .select({ id: users.id, role: users.role })
      .from(users)
      .where(
        and(
          isNull(users.deletedAt),
          or(
            ne(users.role, "service_requester"),
            sql`exists (select 1 from user_roles where user_roles.user_id = ${users.id})`,
            sql`exists (select 1 from user_permissions where user_permissions.user_id = ${users.id})`
          )
        )
      );

    const officerIds: number[] = [];
    const defaultOfficerRoles = ["super_admin", "system_admin", "projects_office"];

    for (const u of candidateUsers) {
      if (excludeUserId && u.id === excludeUserId) continue;

      if (defaultOfficerRoles.includes(u.role)) {
        officerIds.push(u.id);
        continue;
      }

      // التحقق من صلاحية "عرض تفاصيل الطلب وإدارته" للمستخدم
      const userPerms = await calculateUserPermissions(u.id);
      if (userPerms.includes("requests.view_details")) {
        officerIds.push(u.id);
      }
    }

    return officerIds;
  } catch (error) {
    console.error("Error in getRequestOfficerIds:", error);
    return [];
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
    const userIds = new Set<number>();

    // جلب المستخدمين حسب الأدوار
    const targetUsersByRole = await db
      .select({ id: users.id })
      .from(users)
      .where(and(inArray(users.role, roles as any), isNull(users.deletedAt)));

    targetUsersByRole.forEach(u => userIds.add(u.id));

    // إذا كانت الأدوار المستهدفة تشمل مسؤولي الطلبات الافتراضيين، نقوم بإضافة المسؤولين ذوي الصلاحية المباشرة أيضاً
    const defaultOfficerRoles = ["super_admin", "system_admin", "projects_office"];
    const targetsRequestOfficers = roles.some(r => defaultOfficerRoles.includes(r));
    
    if (targetsRequestOfficers) {
      const extraOfficers = await getRequestOfficerIds(db);
      extraOfficers.forEach(id => userIds.add(id));
    }

    // إنشاء إشعارات لجميع المستخدمين
    for (const userId of userIds) {
      await createNotification({
        userId,
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
  const db = await getDb();
  if (!db) return;

  try {
    const officerIds = await getRequestOfficerIds(db);
    const title = "طلب جديد";
    const message = `تم تقديم طلب جديد رقم ${requestNumber} لبرنامج ${programName} - ${mosqueName}`;

    for (const userId of officerIds) {
      await createNotification({
        userId,
        type: "request_update",
        title,
        message,
        relatedType: "request",
        relatedId: requestId,
      });
    }

    // إرسال إشعار للمالك أيضاً
    await notifyOwner({
      title,
      content: message,
    });
  } catch (error) {
    console.error("Error in notifyNewRequest:", error);
  }
}

// دالة لإرسال إشعار عند إنشاء طلب جديد (للمستفيد والمدراء)
export async function notifyRequestCreation(
  requestId: number,
  requestNumber: string,
  requesterId: number
) {
  const db = await getDb();
  if (!db) return;

  try {
    const [creator] = await db
      .select({ name: users.name, role: users.role })
      .from(users)
      .where(eq(users.id, requesterId))
      .limit(1);

    const creatorPerms = await calculateUserPermissions(requesterId);
    const isCreatorAdmin = creator && (
      ["super_admin", "system_admin", "projects_office"].includes(creator.role) ||
      creatorPerms.includes("requests.view_details")
    );

    if (!isCreatorAdmin) {
      // إشعار لمقدم الطلب
      await createNotification({
        userId: requesterId,
        type: "request",
        title: "طلب جديد",
        message: "تم إنشاء طلب جديد وهو بانتظار المعالجة",
        relatedType: "request",
        relatedId: requestId,
      });

      // إشعار للمدراء والمسؤولين
      const officerIds = await getRequestOfficerIds(db, requesterId);
      const title = "طلب جديد";
      const message = `تم إنشاء طلب جديد رقم ${requestNumber} وهو بانتظار المعالجة`;

      for (const userId of officerIds) {
        await createNotification({
          userId,
          type: "request",
          title,
          message,
          relatedType: "request",
          relatedId: requestId,
        });
      }
    } else {
      // إذا كان مقدم الطلب أحد المسؤولين، لا نرسل له إشعاراً بل نرسل للآخرين فقط
      const officerIds = await getRequestOfficerIds(db, requesterId);

      const roleLabels: Record<string, string> = {
        super_admin: "المدير العام",
        system_admin: "مدير النظام",
        projects_office: "مكتب المشاريع",
      };
      const roleName = creator ? (roleLabels[creator.role] || creator.role) : "المسؤول";
      const creatorName = creator ? creator.name : "";

      for (const userId of officerIds) {
        await createNotification({
          userId,
          type: "request",
          title: "طلب جديد مضاف من مسؤول",
          message: `قام ${roleName} ${creatorName} بإنشاء طلب جديد رقم ${requestNumber}`,
          relatedType: "request",
          relatedId: requestId,
        });
      }
    }
  } catch (error) {
    console.error("Error in notifyRequestCreation:", error);
  }
}

// دالة لإرسال إشعار عند تسجيل مسجد جديد
export async function notifyNewMosque(
  mosqueId: number,
  mosqueName: string,
  requesterId: number
) {
  const db = await getDb();
  if (!db) return;

  try {
    const [creator] = await db
      .select({ name: users.name, role: users.role })
      .from(users)
      .where(eq(users.id, requesterId))
      .limit(1);

    const isCreatorAdmin = creator && ["super_admin", "system_admin", "projects_office"].includes(creator.role);

    if (!isCreatorAdmin) {
      // إشعار للمدراء
      await notifyUsersByRole(
        ["super_admin", "system_admin", "projects_office"],
        "mosque",
        "مسجد جديد",
        `تم تسجيل مسجد جديد "${mosqueName}" وهو بانتظار الاعتماد`,
        "mosque",
        mosqueId
      );

      // إشعار لمقدم الطلب لتأكيد استلام طلبه
      await createNotification({
        userId: requesterId,
        type: "mosque",
        title: "مسجد جديد",
        message: "تم إضافة مسجد جديد وهو بانتظار الموافقة",
        relatedType: "mosque",
        relatedId: mosqueId,
      });
    } else {
      // إذا كان مقدم الطلب مسؤولاً، لا نرسل له إشعاراً بل نرسل للآخرين فقط
      const targetRoles = ["super_admin", "system_admin", "projects_office"];
      const targetUsers = await db
        .select({ id: users.id })
        .from(users)
        .where(and(inArray(users.role, targetRoles as any), ne(users.id, requesterId)));

      const roleLabels: Record<string, string> = {
        super_admin: "المدير العام",
        system_admin: "مدير النظام",
        projects_office: "مكتب المشاريع",
      };
      const roleName = creator ? (roleLabels[creator.role] || creator.role) : "المسؤول";
      const creatorName = creator ? creator.name : "";

      for (const targetUser of targetUsers) {
        await createNotification({
          userId: targetUser.id,
          type: "mosque",
          title: "تسجيل مسجد من قبل مسؤول",
          message: `قام ${roleName} ${creatorName} بتسجيل مسجد جديد "${mosqueName}"`,
          relatedType: "mosque",
          relatedId: mosqueId,
        });
      }
    }
  } catch (error) {
    console.error("Error in notifyNewMosque:", error);
  }
}

// دالة لإرسال إشعار عند اعتماد مسجد
export async function notifyMosqueApproval(
  mosqueId: number,
  mosqueName: string,
  requesterId: number
) {
  await createNotification({
    userId: requesterId,
    type: "mosque",
    title: "تم اعتماد المسجد",
    message: `تم قبول طلب تسجيل المسجد الخاص بك: ${mosqueName}`,
    relatedType: "mosque",
    relatedId: mosqueId,
  });
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

// دالة لإرسال إشعار عند تعيين مدير للمشروع
export async function notifyProjectManagerAssigned(
  projectId: number,
  projectNumber: string,
  projectName: string,
  managerId: number
) {
  await createNotification({
    userId: managerId,
    type: "info",
    title: "تعيينك مديراً للمشروع",
    message: `تم تكليفك كمدير للمشروع: "${projectName}" (رقم المشروع: ${projectNumber})`,
    relatedType: "project",
    relatedId: projectId,
  });
}

// دالة لإرسال إشعار للمسؤولين الآخرين عند تغيير مرحلة الطلب من قبل مسؤول آخر
export async function notifyRequestStageChangeToOfficers(
  requestId: number,
  requestNumber: string,
  fromStage: string,
  toStage: string,
  changerId: number
) {
  const db = await getDb();
  if (!db) return;

  try {
    const [changer] = await db
      .select({ name: users.name, role: users.role })
      .from(users)
      .where(eq(users.id, changerId))
      .limit(1);

    const roleLabels: Record<string, string> = {
      super_admin: "المدير العام",
      system_admin: "مدير النظام",
      projects_office: "مكتب المشاريع",
    };
    const changerRoleLabel = changer ? (roleLabels[changer.role] || changer.role) : "المسؤول";
    const changerName = changer ? changer.name : "";

    const stageLabels: Record<string, string> = {
      submitted: "تقديم الطلب",
      initial_review: "المراجعة الأولية",
      field_visit: "الزيارة الميدانية",
      technical_eval: "التقييم الفني",
      boq_preparation: "إعداد جدول الكميات",
      financial_eval: "التقييم المالي",
      financial_eval_and_approval: "التقييم المالي واعتماد العرض",
      quotation_approval: "اعتماد العرض",
      contracting: "التعاقد",
      execution: "التنفيذ",
      handover: "الاستلام",
      closed: "الإغلاق",
    };

    const newStageLabel = stageLabels[toStage] || toStage;

    const officerIds = await getRequestOfficerIds(db, changerId);

    const title = "تحديث مرحلة الطلب";
    const message = `قام ${changerRoleLabel} ${changerName} بنقل الطلب رقم ${requestNumber} إلى مرحلة: ${newStageLabel}`;

    for (const userId of officerIds) {
      await createNotification({
        userId,
        type: "request_update",
        title,
        message,
        relatedType: "request",
        relatedId: requestId,
      });
    }
  } catch (error) {
    console.error("Error in notifyRequestStageChangeToOfficers:", error);
  }
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

      const userPerms = await calculateUserPermissions(ctx.user.id);
      const isRequestOfficer =
        ["super_admin", "system_admin", "projects_office"].includes(ctx.user.role) ||
        userPerms.includes("requests.view_details");
      if (isRequestOfficer) {
        conditions.push(
          or(
            like(notifications.title, "%تم استلام طلبك%"),
            like(notifications.title, "%طلب جديد%"),
            like(notifications.title, "%تحديث مرحلة الطلب%"),
            like(notifications.title, "%تم رفع تقرير المعاينة الميدانية%"),
            like(notifications.title, "%تم رفع تقرير الاستجابة السريعة%"),
            like(notifications.message, "%تم استلام طلبك%"),
            like(notifications.message, "%طلب جديد%"),
            like(notifications.message, "%بإنشاء طلب%"),
            like(notifications.message, "%بنقل الطلب%"),
            like(notifications.message, "%تم رفع تقرير زيارة ميدانية%"),
            like(notifications.message, "%تم رفع تقرير المعاينة الميدانية%"),
            like(notifications.message, "%تم رفع تقرير الاستجابة السريعة%")
          ) as any
        );
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

    const conditions = [eq(notifications.userId, ctx.user.id), eq(notifications.isRead, false)];
    
    const userPerms = await calculateUserPermissions(ctx.user.id);
    const isRequestOfficer =
      ["super_admin", "system_admin", "projects_office"].includes(ctx.user.role) ||
      userPerms.includes("requests.view_details");
    if (isRequestOfficer) {
      conditions.push(
        or(
          like(notifications.title, "%تم استلام طلبك%"),
          like(notifications.title, "%طلب جديد%"),
          like(notifications.title, "%تحديث مرحلة الطلب%"),
          like(notifications.title, "%تم رفع تقرير المعاينة الميدانية%"),
          like(notifications.title, "%تم رفع تقرير الاستجابة السريعة%"),
          like(notifications.message, "%تم استلام طلبك%"),
          like(notifications.message, "%طلب جديد%"),
          like(notifications.message, "%بإنشاء طلب%"),
          like(notifications.message, "%بنقل الطلب%"),
          like(notifications.message, "%تم رفع تقرير زيارة ميدانية%"),
          like(notifications.message, "%تم رفع تقرير المعاينة الميدانية%"),
          like(notifications.message, "%تم رفع تقرير الاستجابة السريعة%")
        ) as any
      );
    }

    const result = await db
      .select({ count: sql<number>`count(*)` })
      .from(notifications)
      .where(and(...conditions));

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

    const conditions = [eq(notifications.userId, ctx.user.id), eq(notifications.isRead, false)];

    const userPerms = await calculateUserPermissions(ctx.user.id);
    const isRequestOfficer =
      ["super_admin", "system_admin", "projects_office"].includes(ctx.user.role) ||
      userPerms.includes("requests.view_details");
    if (isRequestOfficer) {
      conditions.push(
        or(
          like(notifications.title, "%تم استلام طلبك%"),
          like(notifications.title, "%طلب جديد%"),
          like(notifications.title, "%تحديث مرحلة الطلب%"),
          like(notifications.title, "%تم رفع تقرير المعاينة الميدانية%"),
          like(notifications.title, "%تم رفع تقرير الاستجابة السريعة%"),
          like(notifications.message, "%تم استلام طلبك%"),
          like(notifications.message, "%طلب جديد%"),
          like(notifications.message, "%بإنشاء طلب%"),
          like(notifications.message, "%بنقل الطلب%"),
          like(notifications.message, "%تم رفع تقرير زيارة ميدانية%"),
          like(notifications.message, "%تم رفع تقرير المعاينة الميدانية%"),
          like(notifications.message, "%تم رفع تقرير الاستجابة السريعة%")
        ) as any
      );
    }

    await db
      .update(notifications)
      .set({ isRead: true, readAt: new Date() })
      .where(and(...conditions));

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
