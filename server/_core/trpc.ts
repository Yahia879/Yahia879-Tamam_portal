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

    if (!ctx.user || !internalRoles.includes(ctx.user.role as UserRole)) {
      throw new TRPCError({ code: "FORBIDDEN", message: "هذا الإجراء متاح للموظفين فقط" });
    }

    return next({
      ctx: {
        ...ctx,
        user: ctx.user,
      },
    });
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
