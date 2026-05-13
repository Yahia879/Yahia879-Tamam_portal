import { eq, and, sql, inArray } from "drizzle-orm";
import { getDb } from "./db";
import {
  modules,
  permissions,
  roles,
  rolePermissions,
  userRoleAssignments,
  userPermissions,
  permissionsAuditLog,
  users
} from "../drizzle/schema";
import { TRPCError } from "@trpc/server";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";

// ==================== دوال مساعدة ====================

/**
 * حساب الصلاحيات النهائية للمستخدم
 * تدمج صلاحيات الأدوار + الصلاحيات الفردية
 */
export async function calculateUserPermissions(userId: number): Promise<string[]> {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

  // 1. الحصول على الدور الأساسي للمستخدم من جدول المستخدمين
  const [userData] = await db
    .select({ role: users.role })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  // إذا كان المستخدم super_admin، نمنحه جميع الصلاحيات مباشرة
  if (userData?.role === 'super_admin') {
    const allPerms = await db.select({ id: permissions.id }).from(permissions);
    return allPerms.map(p => p.id);
  }

  // 2. جمع صلاحيات جميع الأدوار المسندة للمستخدم (الدور الأساسي + الأدوار الإضافية)
  const userRolesData = await db
    .select({ roleId: userRoleAssignments.roleId })
    .from(userRoleAssignments)
    .where(
      and(
        eq(userRoleAssignments.userId, userId),
        sql`(${userRoleAssignments.expiresAt} IS NULL OR ${userRoleAssignments.expiresAt} > NOW())`
      )
    );

  const roleIds = userRolesData.map(r => r.roleId);
  if (userData?.role) {
    roleIds.push(userData.role);
  }
  
  let rolePermissionsData: string[] = [];
  if (roleIds.length > 0) {
    const rolePermsResult = await db
      .select({ permissionId: rolePermissions.permissionId })
      .from(rolePermissions)
      .where(inArray(rolePermissions.roleId, roleIds));
    
    rolePermissionsData = rolePermsResult.map(rp => rp.permissionId);
  }

  // 2. جمع الصلاحيات الفردية
  const userPermsData = await db
    .select({
      permissionId: userPermissions.permissionId,
      granted: userPermissions.granted
    })
    .from(userPermissions)
    .where(
      and(
        eq(userPermissions.userId, userId),
        sql`(${userPermissions.expiresAt} IS NULL OR ${userPermissions.expiresAt} > NOW())`
      )
    );

  // 3. دمج الصلاحيات
  const allPermissions = new Set(rolePermissionsData);

  // 4. تطبيق الصلاحيات الفردية (منح أو سحب)
  userPermsData.forEach(perm => {
    if (perm.granted) {
      allPermissions.add(perm.permissionId);
    } else {
      allPermissions.delete(perm.permissionId); // سحب الصلاحية
    }
  });

  return Array.from(allPermissions);
}

/**
 * التحقق من صلاحية واحدة
 */
export async function checkPermission(userId: number, permission: string): Promise<boolean> {
  const userPermissions = await calculateUserPermissions(userId);
  return userPermissions.includes(permission);
}

/**
 * التحقق من عدة صلاحيات (يجب أن يملك جميعها)
 */
export async function checkPermissions(userId: number, requiredPermissions: string[]): Promise<boolean> {
  const userPermissions = await calculateUserPermissions(userId);
  return requiredPermissions.every(p => userPermissions.includes(p));
}

/**
 * Middleware للتحقق من الصلاحية
 */
export const permissionProcedure = (permission: string) =>
  protectedProcedure.use(async ({ ctx, next }) => {
    const hasPermission = await checkPermission(ctx.user.id, permission);
    if (!hasPermission) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: `ليس لديك صلاحية: ${permission}`
      });
    }
    return next({ ctx });
  });

/**
 * تسجيل إجراء في سجل التدقيق
 */
async function logAudit(data: {
  actionType: string;
  targetUserId: number;
  targetRoleId?: string;
  permissionId?: string;
  performedBy: number;
  reason?: string;
  oldValue?: string;
  newValue?: string;
}) {
  const db = await getDb();
  if (!db) return;

  await db.insert(permissionsAuditLog).values(data);
}

// ==================== tRPC Router ====================

export const permissionsRouter = router({
  // ==================== الهيكل الهرمي ====================
  
  /**
   * عرض الهيكل الهرمي الكامل (الوحدات + الصلاحيات)
   */
  getStructure: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

    const modulesData = await db.select().from(modules).where(eq(modules.isActive, true)).orderBy(modules.displayOrder);
    const permissionsData = await db.select().from(permissions);

    return modulesData.map(module => ({
      ...module,
      permissions: permissionsData.filter(p => p.moduleId === module.id)
    }));
  }),

  /**
   * إضافة وحدة جديدة
   */
  createModule: permissionProcedure("permissions.create")
    .input(z.object({
      id: z.string(),
      nameAr: z.string(),
      nameEn: z.string(),
      description: z.string().optional(),
      icon: z.string().optional(),
      displayOrder: z.number().optional()
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      await db.insert(modules).values(input);
      return { success: true };
    }),

  /**
   * إضافة صلاحية جديدة
   */
  createPermission: permissionProcedure("permissions.create")
    .input(z.object({
      moduleId: z.string(),
      action: z.string(),
      nameAr: z.string(),
      nameEn: z.string(),
      description: z.string().optional()
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const permissionId = `${input.moduleId}.${input.action}`;
      await db.insert(permissions).values({
        id: permissionId,
        ...input
      });
      return { success: true, permissionId };
    }),

  // ==================== إدارة الأدوار ====================

  /**
   * عرض جميع الأدوار
   */
  getRoles: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

    return await db.select().from(roles);
  }),

  /**
   * عرض صلاحيات دور محدد
   */
  getRolePermissions: protectedProcedure
    .input(z.object({ roleId: z.string() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const rolePerms = await db
        .select({ permissionId: rolePermissions.permissionId })
        .from(rolePermissions)
        .where(eq(rolePermissions.roleId, input.roleId));

      return rolePerms.map(rp => rp.permissionId);
    }),

  /**
   * إنشاء دور جديد
   */
  createRole: permissionProcedure("permissions.create")
    .input(z.object({
      id: z.string(),
      nameAr: z.string(),
      nameEn: z.string(),
      description: z.string().optional(),
      permissions: z.array(z.string())
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      // إنشاء الدور مع تخزين الصلاحيات المخصصة في حقل الوصف كـ JSON
      await db.insert(roles).values({
        id: input.id,
        nameAr: input.nameAr,
        nameEn: input.nameEn,
        description: JSON.stringify(input.permissions),
        isSystem: false
      });

      // التحقق من الصلاحيات الموجودة فعلياً في قاعدة البيانات قبل الربط
      if (input.permissions.length > 0) {
        const existingPerms = await db.select({ id: permissions.id }).from(permissions)
          .where(inArray(permissions.id, input.permissions));
        const validPermIds = existingPerms.map(p => p.id);

        if (validPermIds.length > 0) {
          await db.insert(rolePermissions).values(
            validPermIds.map(permId => ({
              roleId: input.id,
              permissionId: permId
            }))
          );
        }
      }

      await logAudit({
        actionType: "create_role",
        targetUserId: ctx.user.id,
        targetRoleId: input.id,
        performedBy: ctx.user.id,
        newValue: JSON.stringify(input)
      });

      return { success: true };
    }),

  /**
   * تفعيل / إيقاف دور
   */
  toggleRoleStatus: permissionProcedure("permissions.edit")
    .input(z.object({
      roleId: z.string(),
      isActive: z.boolean()
    }))
    .mutation(async ({ input, ctx }) => {
      // التحقق من الصلاحية: فقط المدير العام أو مدير النظام
      if (ctx.user.role !== 'super_admin' && ctx.user.role !== 'system_admin') {
        throw new TRPCError({ code: "FORBIDDEN", message: "ليس لديك صلاحية لتعديل حالة الأدوار" });
      }

      // منع إيقاف أدوار الإدارة العليا (حماية النظام)
      if ((input.roleId === 'super_admin' || input.roleId === 'system_admin') && !input.isActive) {
        throw new TRPCError({ code: "FORBIDDEN", message: "لا يمكن إيقاف هذا الدور الإداري الأساسي (حماية النظام)" });
      }

      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const [role] = await db.select().from(roles).where(eq(roles.id, input.roleId)).limit(1);
      if (!role) {
        throw new TRPCError({ code: "NOT_FOUND", message: "الدور غير موجود" });
      }

      await db.update(roles).set({ isActive: input.isActive }).where(eq(roles.id, input.roleId));

      await logAudit({
        actionType: "toggle_role_status",
        targetUserId: ctx.user.id,
        targetRoleId: input.roleId,
        performedBy: ctx.user.id,
        reason: input.isActive ? "تفعيل الدور" : "إيقاف الدور (Kill Switch)"
      });

      return { success: true };
    }),

  /**
   * تحديث صلاحيات دور
   */
  updateRolePermissions: permissionProcedure("permissions.edit")
    .input(z.object({
      roleId: z.string(),
      permissions: z.array(z.string())
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      // حذف الصلاحيات القديمة
      await db.delete(rolePermissions).where(eq(rolePermissions.roleId, input.roleId));

      // إضافة الصلاحيات الجديدة
      if (input.permissions.length > 0) {
        await db.insert(rolePermissions).values(
          input.permissions.map(permId => ({
            roleId: input.roleId,
            permissionId: permId
          }))
        );
      }

      await logAudit({
        actionType: "update_role_permissions",
        targetUserId: ctx.user.id,
        targetRoleId: input.roleId,
        performedBy: ctx.user.id,
        newValue: JSON.stringify(input.permissions)
      });

      return { success: true };
    }),

  /**
   * حذف دور (الأدوار الافتراضية لا يمكن حذفها)
   */
  deleteRole: permissionProcedure("permissions.delete")
    .input(z.object({ roleId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      // التحقق من صلاحية المنفذ
      if (ctx.user.role !== 'super_admin' && ctx.user.role !== 'system_admin') {
        throw new TRPCError({ code: "FORBIDDEN", message: "ليس لديك صلاحية لحذف الأدوار" });
      }

      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      // قائمة الأدوار المحمية تماماً
      const protectedRoleIds = ['super_admin', 'system_admin', 'service_requester'];
      if (protectedRoleIds.includes(input.roleId)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "لا يمكن حذف الأدوار الأساسية للنظام (المدير العام، مدير النظام، طالب الخدمة)"
        });
      }

      // التحقق من أن الدور موجود وليس افتراضياً (isSystem)
      const [role] = await db.select().from(roles).where(eq(roles.id, input.roleId)).limit(1);
      if (!role) {
        throw new TRPCError({ code: "NOT_FOUND", message: "الدور غير موجود" });
      }
      
      if (role.isSystem) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "لا يمكن حذف الأدوار الافتراضية للنظام"
        });
      }

      // التحقق مما إذا كان هناك مستخدمون مسند إليهم هذا الدور
      const [assignedUser] = await db
        .select({ id: userRoleAssignments.id })
        .from(userRoleAssignments)
        .where(eq(userRoleAssignments.roleId, input.roleId))
        .limit(1);

      if (assignedUser) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "لا يمكن حذف هذا الدور لأنه مرتبط بمستخدمين حاليين. يرجى إزالة الدور من جميع المستخدمين أولاً."
        });
      }

      // تنفيذ الحذف داخل عملية واحدة (Transaction) لضمان سلامة البيانات
      try {
        await db.transaction(async (tx) => {
          console.log(`[Permissions] Starting deletion of role: ${input.roleId}`);
          
          // 1. تنظيف مراجع سجلات التدقيق (Permissions Audit Log)
          const auditUpdateResult = await tx.update(permissionsAuditLog)
            .set({ targetRoleId: null })
            .where(eq(permissionsAuditLog.targetRoleId, input.roleId));
          console.log(`[Permissions] Audit log nullified:`, auditUpdateResult);

          // 2. حذف مراجع الصلاحيات (Role Permissions)
          const permsDeleteResult = await tx.delete(rolePermissions)
            .where(eq(rolePermissions.roleId, input.roleId));
          console.log(`[Permissions] Role permissions deleted:`, permsDeleteResult);

          // 3. حذف مراجع المستخدمين (User Roles) - احتياطاً رغم وجود cascade
          const userRolesDeleteResult = await tx.delete(userRoleAssignments)
            .where(eq(userRoleAssignments.roleId, input.roleId));
          console.log(`[Permissions] User role assignments deleted:`, userRolesDeleteResult);

          // 4. حذف الدور نفسه
          const roleDeleteResult = await tx.delete(roles)
            .where(eq(roles.id, input.roleId));
          console.log(`[Permissions] Role deleted successfully:`, roleDeleteResult);

          // 5. تسجيل الإجراء في سجل التدقيق الجديد
          await tx.insert(permissionsAuditLog).values({
            actionType: "delete_role",
            targetUserId: ctx.user.id,
            targetRoleId: null,
            performedBy: ctx.user.id,
            reason: "حذف دور مخصص (تم تنظيف المراجع برمجياً)",
            oldValue: JSON.stringify(role)
          });
        });
      } catch (error: any) {
        console.error(`[Permissions] Failed to delete role ${input.roleId}:`, error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `فشل حذف الدور: ${error.message || "خطأ في قاعدة البيانات"}`
        });
      }

      return { success: true };
    }),

  // ==================== إدارة صلاحيات المستخدمين ====================

  /**
   * عرض أدوار مستخدم
   */
  getUserRoles: protectedProcedure
    .input(z.object({ userId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      return await db
        .select({
          id: userRoleAssignments.id,
          roleId: userRoleAssignments.roleId,
          roleName: roles.nameAr,
          assignedAt: userRoleAssignments.assignedAt,
          expiresAt: userRoleAssignments.expiresAt
        })
        .from(userRoleAssignments)
        .innerJoin(roles, eq(userRoleAssignments.roleId, roles.id))
        .where(eq(userRoleAssignments.userId, input.userId));
    }),

  /**
   * عرض صلاحيات مستخدم الفردية
   */
  getUserDirectPermissions: protectedProcedure
    .input(z.object({ userId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      return await db
        .select()
        .from(userPermissions)
        .where(eq(userPermissions.userId, input.userId));
    }),

  /**
   * عرض الصلاحيات النهائية للمستخدم
   */
  getUserPermissions: protectedProcedure
    .input(z.object({ userId: z.number() }))
    .query(async ({ input }) => {
      return await calculateUserPermissions(input.userId);
    }),

  /**
   * إسناد دور لمستخدم
   */
  assignRole: permissionProcedure("users.edit")
    .input(z.object({
      userId: z.number(),
      roleId: z.string(),
      expiresAt: z.date().optional()
    }))
    .mutation(async ({ input, ctx }) => {
      // التحقق من صلاحية المنفذ (يجب أن يكون مدير نظام أو مدير عام)
      if (ctx.user.role !== 'super_admin' && ctx.user.role !== 'system_admin') {
        throw new TRPCError({ code: "FORBIDDEN", message: "ليس لديك صلاحية لإسناد الأدوار" });
      }

      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      // منع إضافة أدوار إضافية للمدير العام (لديه كل الصلاحيات أصلاً)
      const [targetUser] = await db.select({ role: users.role }).from(users).where(eq(users.id, input.userId)).limit(1);
      if (targetUser?.role === 'super_admin') {
        throw new TRPCError({ code: "BAD_REQUEST", message: "لا يمكن إضافة أدوار إضافية للمدير العام" });
      }

      await db.insert(userRoleAssignments).values({
        userId: input.userId,
        roleId: input.roleId,
        assignedBy: ctx.user.id,
        expiresAt: input.expiresAt
      });

      await logAudit({
        actionType: "assign_role",
        targetUserId: input.userId,
        targetRoleId: input.roleId,
        performedBy: ctx.user.id
      });

      return { success: true };
    }),

  /**
   * إزالة دور من مستخدم
   */
  removeRole: permissionProcedure("users.edit")
    .input(z.object({
      userId: z.number(),
      roleId: z.string()
    }))
    .mutation(async ({ input, ctx }) => {
      // التحقق من صلاحية المنفذ
      if (ctx.user.role !== 'super_admin' && ctx.user.role !== 'system_admin') {
        throw new TRPCError({ code: "FORBIDDEN", message: "ليس لديك صلاحية لإزالة الأدوار" });
      }

      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      await db.delete(userRoleAssignments).where(
        and(
          eq(userRoleAssignments.userId, input.userId),
          eq(userRoleAssignments.roleId, input.roleId)
        )
      );

      await logAudit({
        actionType: "remove_role",
        targetUserId: input.userId,
        targetRoleId: input.roleId,
        performedBy: ctx.user.id
      });

      return { success: true };
    }),

  /**
   * منح صلاحية فردية لمستخدم
   */
  grantPermission: permissionProcedure("users.edit")
    .input(z.object({
      userId: z.number(),
      permissionId: z.string(),
      reason: z.string(),
      expiresAt: z.date().optional()
    }))
    .mutation(async ({ input, ctx }) => {
      // التحقق من صلاحية المنفذ
      if (ctx.user.role !== 'super_admin' && ctx.user.role !== 'system_admin') {
        throw new TRPCError({ code: "FORBIDDEN", message: "ليس لديك صلاحية لتعديل الصلاحيات" });
      }

      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      // منع منح صلاحيات للمدير العام (لديه كل شيء)
      const [targetUser] = await db.select({ role: users.role }).from(users).where(eq(users.id, input.userId)).limit(1);
      if (targetUser?.role === 'super_admin') {
        throw new TRPCError({ code: "BAD_REQUEST", message: "المدير العام لديه كافة الصلاحيات بالفعل" });
      }

      await db.insert(userPermissions).values({
        userId: input.userId,
        permissionId: input.permissionId,
        granted: true,
        grantedBy: ctx.user.id,
        reason: input.reason,
        expiresAt: input.expiresAt
      });

      await logAudit({
        actionType: "grant_permission",
        targetUserId: input.userId,
        permissionId: input.permissionId,
        performedBy: ctx.user.id,
        reason: input.reason
      });

      return { success: true };
    }),

  /**
   * سحب صلاحية من مستخدم
   */
  revokePermission: permissionProcedure("users.edit")
    .input(z.object({
      userId: z.number(),
      permissionId: z.string(),
      reason: z.string()
    }))
    .mutation(async ({ input, ctx }) => {
      // التحقق من صلاحية المنفذ
      if (ctx.user.role !== 'super_admin' && ctx.user.role !== 'system_admin') {
        throw new TRPCError({ code: "FORBIDDEN", message: "ليس لديك صلاحية لسحب الصلاحيات" });
      }

      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      // التحقق من أن المستخدم الهدف ليس super_admin
      const [targetUser] = await db.select({ role: users.role }).from(users).where(eq(users.id, input.userId)).limit(1);
      if (targetUser?.role === 'super_admin') {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "لا يمكن سحب صلاحيات من المدير العام"
        });
      }

      await db.insert(userPermissions).values({
        userId: input.userId,
        permissionId: input.permissionId,
        granted: false,
        grantedBy: ctx.user.id,
        reason: input.reason
      });

      await logAudit({
        actionType: "revoke_permission",
        targetUserId: input.userId,
        permissionId: input.permissionId,
        performedBy: ctx.user.id,
        reason: input.reason
      });

      return { success: true };
    }),

  /**
   * عرض سجل التدقيق
   */
  getAuditLog: permissionProcedure("permissions.view")
    .input(z.object({
      targetUserId: z.number().optional(),
      limit: z.number().default(50)
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      let query = db.select().from(permissionsAuditLog);

      if (input.targetUserId) {
        query = query.where(eq(permissionsAuditLog.targetUserId, input.targetUserId)) as any;
      }

      return await query.limit(input.limit).orderBy(sql`${permissionsAuditLog.createdAt} DESC`);
    }),
});
