import { NOT_ADMIN_ERR_MSG, UNAUTHED_ERR_MSG } from '@shared/const';
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import type { TrpcContext } from "./context";
import { UserRole } from "../../drizzle/schema";

const t = initTRPC.context<TrpcContext>().create({
  transformer: superjson,
});

export const router = t.router;
export const publicProcedure = t.procedure;

const requireUser = t.middleware(async opts => {
  const { ctx, next } = opts;

  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
  }

  // التحقق من حالة الدور (إبطال الجلسات النشطة للأدوار الموقوفة)
  if (ctx.user.id) {
    const { getDb } = await import("../db");
    const { roles, userRoleAssignments } = await import("../../drizzle/schema");
    const { eq, or, and, sql } = await import("drizzle-orm");
    const db = await getDb();
    if (db) {
      // جلب جميع الأدوار المرتبطة بالمستخدم (الأساسي والمخصص)
      const userRoles = await db
        .select({ 
          id: roles.id, 
          isActive: roles.isActive 
        })
        .from(roles)
        .leftJoin(userRoleAssignments, eq(roles.id, userRoleAssignments.roleId))
        .where(
          or(
            eq(roles.id, ctx.user.role || ""),
            and(
              eq(userRoleAssignments.userId, ctx.user.id),
              sql`(${userRoleAssignments.expiresAt} IS NULL OR ${userRoleAssignments.expiresAt} > NOW())`
            )
          )
        );

      // إذا كان هناك أي دور موقوف، والمستخدم لا يملك أي دور نشط آخر
      // ملاحظة: الأدوار غير الموجودة في جدول roles تُعتبر نشطة تلقائياً (مثل super_admin الافتراضي)
      const hasSuspendedRole = userRoles.some(r => !r.isActive);
      const hasActiveRole = userRoles.some(r => r.isActive);
      
      // إذا كان الدور الأساسي موجوداً في الجدول وموقوفاً، ولم يكن هناك دور مخصص نشط
      if (hasSuspendedRole && !hasActiveRole) {
         // نتحقق مما إذا كان هناك دور أساسي "نشط" (غير موجود في الجدول أو موجود ونشط)
         const primaryRoleInTable = userRoles.find(r => r.id === ctx.user.role);
         const isPrimaryActive = !primaryRoleInTable || primaryRoleInTable.isActive;
         
         if (!isPrimaryActive && !hasActiveRole) {
           throw new TRPCError({ code: "UNAUTHORIZED", message: "هذا الدور موقوف حالياً، يرجى مراجعة الإدارة" });
         }
      }
    }
  }

  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
    },
  });
});

export const protectedProcedure = t.procedure.use(requireUser);

// الأدوار الإدارية التي لها صلاحيات واسعة
const adminRoles: UserRole[] = ['super_admin', 'system_admin'];

// الأدوار التي يمكنها إدارة الطلبات
const requestManagementRoles: UserRole[] = [
  'super_admin', 
  'system_admin', 
  'projects_office', 
  'field_team', 
  'quick_response',
  'financial',
  'project_manager'
];

// الأدوار الداخلية (الموظفين)
const internalRoles: UserRole[] = [
  'super_admin', 
  'system_admin', 
  'projects_office', 
  'field_team', 
  'quick_response',
  'financial',
  'project_manager',
  'corporate_comm'
];

export const adminProcedure = t.procedure.use(
  t.middleware(async opts => {
    const { ctx, next } = opts;

    if (!ctx.user || !adminRoles.includes(ctx.user.role as UserRole)) {
      throw new TRPCError({ code: "FORBIDDEN", message: NOT_ADMIN_ERR_MSG });
    }

    return next({
      ctx: {
        ...ctx,
        user: ctx.user,
      },
    });
  }),
);

// إجراء للموظفين الداخليين فقط
export const internalProcedure = t.procedure.use(
  t.middleware(async opts => {
    const { ctx, next } = opts;

    if (!ctx.user) {
      throw new TRPCError({ code: "FORBIDDEN", message: "هذا الإجراء متاح للموظفين فقط" });
    }

    // السماح لحاملي الأدوار الأساسية مباشرة
    if (internalRoles.includes(ctx.user.role as UserRole)) {
      return next({ ctx: { ...ctx, user: ctx.user } });
    }

    // السماح لأي مستخدم لديه دور مخصص نشط في جدول user_roles
    const { getDb } = await import("../db");
    const { userRoleAssignments, roles } = await import("../../drizzle/schema");
    const { eq, and, sql } = await import("drizzle-orm");
    const db = await getDb();
    if (db) {
      const [customRole] = await db
        .select({ roleId: userRoleAssignments.roleId })
        .from(userRoleAssignments)
        .innerJoin(roles, eq(userRoleAssignments.roleId, roles.id))
        .where(
          and(
            eq(userRoleAssignments.userId, ctx.user.id),
            eq(roles.isActive, true),
            sql`(${userRoleAssignments.expiresAt} IS NULL OR ${userRoleAssignments.expiresAt} > NOW())`
          )
        )
        .limit(1);

      if (customRole) {
        return next({ ctx: { ...ctx, user: ctx.user } });
      }
    }

    throw new TRPCError({ code: "FORBIDDEN", message: "هذا الإجراء متاح للموظفين فقط" });
  }),
);

// إجراء لإدارة الطلبات
export const requestManagementProcedure = t.procedure.use(
  t.middleware(async opts => {
    const { ctx, next } = opts;

    if (!ctx.user || !requestManagementRoles.includes(ctx.user.role as UserRole)) {
      throw new TRPCError({ code: "FORBIDDEN", message: "ليس لديك صلاحية لإدارة الطلبات" });
    }

    return next({
      ctx: {
        ...ctx,
        user: ctx.user,
      },
    });
  }),
);

// دالة مساعدة للتحقق من الدور
export function hasRole(userRole: string | undefined, allowedRoles: UserRole[]): boolean {
  if (!userRole) return false;
  return allowedRoles.includes(userRole as UserRole);
}

// دالة للتحقق من صلاحية المدير العام
export function isSuperAdmin(userRole: string | undefined): boolean {
  return userRole === 'super_admin';
}

// دالة للتحقق من صلاحية مدير النظام
export function isSystemAdmin(userRole: string | undefined): boolean {
  return userRole === 'super_admin' || userRole === 'system_admin';
}

// دالة للتحقق من صلاحية الموظف الداخلي
export function isInternalUser(userRole: string | undefined): boolean {
  if (!userRole) return false;
  return internalRoles.includes(userRole as UserRole);
}
