import { z } from "zod";
import { router, publicProcedure, protectedProcedure } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { getDb } from "../db";
import { users, employees, auditLogs, InsertUser, userRoleAssignments, roles, rolePermissions, passwordResetTokens } from "../../drizzle/schema";
import { calculateUserPermissions, checkPermission } from "../permissions";
import { eq, and, isNull, inArray, sql, or, ne, gt } from "drizzle-orm";
import { createHash, randomBytes } from "crypto";
import { SignJWT, jwtVerify } from "jose";
import { COOKIE_NAME } from "../../shared/const";
import { getSessionCookieOptions } from "../_core/cookies";

// دالة تشفير كلمة المرور
import { pbkdf2Sync } from "crypto";

function hashPassword(password: string, salt: string): string {
  return pbkdf2Sync(password, salt, 1000, 64, "sha512").toString("hex");
}

// دالة إنشاء salt عشوائي
function generateSalt(): string {
  return randomBytes(16).toString("hex");
}

// دالة إنشاء رقم طلب فريد
function generateRequestNumber(): string {
  const timestamp = Date.now().toString(36);
  const random = randomBytes(4).toString("hex");
  return `REQ-${timestamp}-${random}`.toUpperCase();
}

// مخطط التحقق من بيانات التسجيل
const registerSchema = z.object({
  email: z.string().email("البريد الإلكتروني غير صالح"),
  password: z.string().min(8, "كلمة المرور يجب أن تكون 8 أحرف على الأقل"),
  name: z.string().min(2, "الاسم يجب أن يكون حرفين على الأقل").max(60, "الاسم يجب ألا يتجاوز 60 حرف"),
  phone: z.string().regex(/^05[0-9]{8}$/, "رقم الجوال يجب أن يكون بصيغة 05XXXXXXXX"),
  nationalId: z.string().optional(),
  city: z.string().optional(),
  requesterType: z.string().optional(),
  proofDocument: z.string().optional(),
});

// مخطط التحقق من بيانات تسجيل الدخول
const loginSchema = z.object({
  email: z.string().email("البريد الإلكتروني غير صالح").optional(),
  phone: z.string().regex(/^05[0-9]{8}$/, "رقم الجوال يجب أن يكون بصيغة 05XXXXXXXX").optional(),
  password: z.string().min(1, "كلمة المرور مطلوبة"),
}).refine((data) => data.email || data.phone, {
  message: "يجب إدخال البريد الإلكتروني أو رقم الجوال",
});

// مخطط إنشاء موظف جديد
const createEmployeeSchema = z.object({
  email: z.string().email("البريد الإلكتروني غير صالح"),
  password: z.string().min(8, "كلمة المرور يجب أن تكون 8 أحرف على الأقل"),
  name: z.string().min(2, "الاسم يجب أن يكون حرفين على الأقل").max(60, "الاسم يجب ألا يتجاوز 60 حرف"),
  phone: z.string().optional(),
  nationalId: z.string().optional(),
  role: z.enum([
    "super_admin",
    "system_admin",
    "projects_office",
    "field_team",
    "quick_response",
    "financial",
    "project_manager",
    "corporate_comm",
  ]),
  employeeNumber: z.string().optional(),
  department: z.string().optional(),
  position: z.string().optional(),
});

export const authRouter = router({
  // التحقق من توفر البريد الإلكتروني ورقم الجوال
  checkCredentialsAvailable: publicProcedure
    .input(z.object({
      email: z.string().email("البريد الإلكتروني غير صالح"),
      phone: z.string().regex(/^05[0-9]{8}$/, "رقم الجوال غير صالح")
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "قاعدة البيانات غير متاحة" });

      const existingUserByEmail = await db.select().from(users).where(eq(users.email, input.email)).limit(1);
      if (existingUserByEmail.length > 0) {
        return { available: false, reason: "email" };
      }

      const existingUserByPhone = await db.select().from(users).where(eq(users.phone, input.phone)).limit(1);
      if (existingUserByPhone.length > 0) {
        return { available: false, reason: "phone" };
      }

      return { available: true };
    }),

  // تسجيل طالب خدمة جديد
  register: publicProcedure
    .input(registerSchema)
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "قاعدة البيانات غير متاحة" });

      // التحقق من عدم وجود المستخدم (بالبريد أو الجوال)
      const existingUserByEmail = await db.select().from(users).where(eq(users.email, input.email)).limit(1);
      if (existingUserByEmail.length > 0) {
        throw new TRPCError({ code: "CONFLICT", message: "البريد الإلكتروني مسجل مسبقاً" });
      }
      
      const existingUserByPhone = await db.select().from(users).where(eq(users.phone, input.phone)).limit(1);
      if (existingUserByPhone.length > 0) {
        throw new TRPCError({ code: "CONFLICT", message: "رقم الجوال مسجل مسبقاً" });
      }

      // التحقق من عدم تكرار رقم الهوية الوطنية
      if (input.nationalId && input.nationalId.trim() !== "") {
        const existingUserByNationalId = await db.select().from(users).where(eq(users.nationalId, input.nationalId.trim())).limit(1);
        if (existingUserByNationalId.length > 0) {
          throw new TRPCError({ code: "CONFLICT", message: "رقم الهوية هذا مسجل مسبقاً" });
        }
      }

      // إنشاء salt وتشفير كلمة المرور
      const salt = generateSalt();
      const passwordHash = hashPassword(input.password, salt);

      // إنشاء المستخدم الجديد
      const newUser: InsertUser = {
        email: input.email,
        passwordHash: `${salt}:${passwordHash}`,
        name: input.name,
        phone: input.phone,
        nationalId: input.nationalId || null,
        city: input.city || null,
        requesterType: input.requesterType || null,
        proofDocument: input.proofDocument || null,
        role: "service_requester",
        status: "pending", // يحتاج اعتماد
        loginMethod: "local",
      };

      await db.insert(users).values(newUser);

      // تسجيل في سجل التدقيق
      await db.insert(auditLogs).values({
        action: "user_registered",
        entityType: "user",
        newValues: { email: input.email, name: input.name, role: "service_requester" },
      });

      return { success: true, message: "تم التسجيل بنجاح. يرجى انتظار اعتماد حسابك." };
    }),

  // تسجيل الدخول
  login: publicProcedure
    .input(loginSchema)
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "قاعدة البيانات غير متاحة" });

      // البحث عن المستخدم (بالبريد أو الجوال) مع استبعاد المحذوفين
      const userResult = input.email 
        ? await db.select().from(users).where(and(eq(users.email, input.email), isNull(users.deletedAt))).limit(1)
        : await db.select().from(users).where(and(eq(users.phone, input.phone!), isNull(users.deletedAt))).limit(1);
      if (userResult.length === 0) {
        const identifier = input.email ? "البريد الإلكتروني" : "رقم الجوال";
        throw new TRPCError({ code: "UNAUTHORIZED", message: `${identifier} أو كلمة المرور غير صحيحة` });
      }

      const user = userResult[0];

      // التحقق من حالة الحساب
      const isRequesterAllowed = user.role === "service_requester" && 
                                 (user.status === "pending" || user.status === "suspended");

      if (!isRequesterAllowed) {
        if (user.status === "pending") {
          throw new TRPCError({ code: "FORBIDDEN", message: "حسابك قيد المراجعة. يرجى انتظار الاعتماد." });
        }
        if (user.status === "suspended") {
          throw new TRPCError({ code: "FORBIDDEN", message: "ROLE_SUSPENDED: عذراً، لا يمكن تسجيل الدخول. هذا الدور موقوف حالياً، يرجى مراجعة الإدارة" });
        }
        if (user.status === "blocked") {
          throw new TRPCError({ code: "FORBIDDEN", message: "حسابك محظور." });
        }
      }

      // التحقق من كلمة المرور
      if (!user.passwordHash) {
        const identifier = input.email ? "البريد الإلكتروني" : "رقم الجوال";
        throw new TRPCError({ code: "UNAUTHORIZED", message: `${identifier} أو كلمة المرور غير صحيحة` });
      }

      const [salt, storedHash] = user.passwordHash.split(":");
      const inputHash = hashPassword(input.password, salt);

      if (inputHash !== storedHash) {
        const identifier = input.email ? "البريد الإلكتروني" : "رقم الجوال";
        throw new TRPCError({ code: "UNAUTHORIZED", message: `${identifier} أو كلمة المرور غير صحيحة` });
      }

      // التحقق من حالة الدور (Kill Switch)
      const userRoles = await db
        .select({ 
          id: roles.id, 
          isActive: roles.isActive 
        })
        .from(roles)
        .leftJoin(userRoleAssignments, eq(roles.id, userRoleAssignments.roleId))
        .where(
          or(
            eq(roles.id, user.role || ""),
            and(
              eq(userRoleAssignments.userId, user.id),
              sql`(${userRoleAssignments.expiresAt} IS NULL OR ${userRoleAssignments.expiresAt} > NOW())`
            )
          )
        );

      // إذا كان للمستخدم أي أدوار مسجلة في جدول الأدوار، يجب أن يكون أحدها على الأقل نشطاً
      if (userRoles.length > 0) {
        const hasActiveRole = userRoles.some(r => r.isActive);
        if (!hasActiveRole) {
          throw new TRPCError({ code: "FORBIDDEN", message: "ROLE_SUSPENDED: عذراً، لا يمكن تسجيل الدخول. هذا الدور موقوف حالياً، يرجى مراجعة الإدارة" });
        }
      }

      // تحديث آخر تسجيل دخول
      await db.update(users).set({ lastSignedIn: new Date() }).where(eq(users.id, user.id));

      // إنشاء JWT token
      const secret = new TextEncoder().encode(process.env.JWT_SECRET || "fallback-secret");
      const token = await new SignJWT({ 
        userId: user.id, 
        email: user.email, 
        role: user.role,
        openId: user.openId || `local-${user.id}`,
      })
        .setProtectedHeader({ alg: "HS256" })
        .setIssuedAt()
        .setExpirationTime("7d")
        .sign(secret);

      // تعيين الكوكي
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.cookie(COOKIE_NAME, token, {
        ...cookieOptions,
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 أيام
      });

      // تسجيل في سجل التدقيق
      await db.insert(auditLogs).values({
        userId: user.id,
        action: "user_login",
        entityType: "user",
        entityId: user.id,
        ipAddress: ctx.req.ip || ctx.req.headers["x-forwarded-for"]?.toString() || null,
      });

      return {
        success: true,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          status: user.status,
        },
      };
    }),

  // تسجيل الخروج
  logout: protectedProcedure.mutation(async ({ ctx }) => {
    const cookieOptions = getSessionCookieOptions(ctx.req);
    ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });

    if (ctx.user) {
      const db = await getDb();
      if (db) {
        await db.insert(auditLogs).values({
          userId: ctx.user.id,
          action: "user_logout",
          entityType: "user",
          entityId: ctx.user.id,
        });
      }
    }

    return { success: true };
  }),

  // الحصول على بيانات المستخدم الحالي (مع حقن الدور المخصص والصلاحيات)
  me: publicProcedure.query(async ({ ctx }) => {
    if (!ctx.user) return null;

    const db = await getDb();
    if (!db) return ctx.user;

    // التحقق من حالة الدور (Kill Switch - إبطال الجلسات النشطة للأدوار الموقوفة)
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

    if (userRoles.length > 0) {
      const hasActiveRole = userRoles.some(r => r.isActive);
      if (!hasActiveRole) {
        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
        throw new TRPCError({ 
          code: "UNAUTHORIZED", 
          message: "ROLE_SUSPENDED: عذراً، لا يمكن تسجيل الدخول. هذا الدور موقوف حالياً، يرجى مراجعة الإدارة" 
        });
      }
    }

    // هل للمستخدم دور مخصص في جدول user_roles؟
    const [customRoleAssignment] = await db
      .select({
        roleId: roles.id,
        roleNameAr: roles.nameAr,
        roleNameEn: roles.nameEn,
        isActive: roles.isActive,
        roleDescription: roles.description,
      })
      .from(userRoleAssignments)
      .innerJoin(roles, eq(userRoleAssignments.roleId, roles.id))
      .where(
        and(
          eq(userRoleAssignments.userId, ctx.user.id),
          sql`(${userRoleAssignments.expiresAt} IS NULL OR ${userRoleAssignments.expiresAt} > NOW())`
        )
      )
      .limit(1);

    // حساب الصلاحيات الموسعة باستخدام الدالة المركزية
    const permissions = await calculateUserPermissions(ctx.user.id);

    return {
      ...ctx.user,
      customRole: customRoleAssignment ? {
        id: customRoleAssignment.roleId,
        nameAr: customRoleAssignment.roleNameAr,
        nameEn: customRoleAssignment.roleNameEn,
        isActive: customRoleAssignment.isActive,
      } : null,
      permissions,
    };
  }),

  // إنشاء موظف جديد (للمدراء فقط)
  createEmployee: protectedProcedure
    .input(createEmployeeSchema)
    .mutation(async ({ input, ctx }) => {
      // التحقق من الصلاحية
      if (!["super_admin", "system_admin"].includes(ctx.user.role)) {
        throw new TRPCError({ code: "FORBIDDEN", message: "ليس لديك صلاحية لإنشاء موظفين" });
      }

      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "قاعدة البيانات غير متاحة" });

      // التحقق من عدم وجود المستخدم
      const existingUser = await db.select().from(users).where(eq(users.email, input.email)).limit(1);
      if (existingUser.length > 0) {
        throw new TRPCError({ code: "CONFLICT", message: "البريد الإلكتروني مسجل مسبقاً" });
      }

      // إنشاء salt وتشفير كلمة المرور
      const salt = generateSalt();
      const passwordHash = hashPassword(input.password, salt);

      // إنشاء المستخدم الجديد
      const result = await db.insert(users).values({
        email: input.email,
        passwordHash: `${salt}:${passwordHash}`,
        name: input.name,
        phone: input.phone || null,
        nationalId: input.nationalId || null,
        role: input.role,
        status: "active", // الموظفون نشطون مباشرة
        loginMethod: "local",
      });

      const userId = Number(result[0].insertId);

      // إنشاء سجل الموظف
      if (input.employeeNumber || input.department || input.position) {
        await db.insert(employees).values({
          userId: userId,
          employeeNumber: input.employeeNumber || null,
          department: input.department || null,
          position: input.position || null,
        });
      }

      // تسجيل في سجل التدقيق
      await db.insert(auditLogs).values({
        userId: ctx.user.id,
        action: "employee_created",
        entityType: "user",
        entityId: userId,
        newValues: { email: input.email, name: input.name, role: input.role },
      });

      return { success: true, message: "تم إنشاء الموظف بنجاح", userId };
    }),

  // اعتماد مستخدم جديد
  approveUser: protectedProcedure
    .input(z.object({ userId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      // التحقق من الصلاحية
      const hasApprovePerm = await checkPermission(ctx.user.id, "requesters.approve");
      const isDefaultAllowedRole = ["super_admin", "system_admin"].includes(ctx.user.role);
      if (!isDefaultAllowedRole && !hasApprovePerm) {
        throw new TRPCError({ code: "FORBIDDEN", message: "ليس لديك صلاحية لاعتماد المستخدمين" });
      }

      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "قاعدة البيانات غير متاحة" });

      const userResult = await db.select().from(users).where(eq(users.id, input.userId)).limit(1);
      if (userResult.length === 0) {
        throw new TRPCError({ code: "NOT_FOUND", message: "المستخدم غير موجود" });
      }

      await db.update(users).set({ status: "active" }).where(eq(users.id, input.userId));

      // تسجيل في سجل التدقيق
      await db.insert(auditLogs).values({
        userId: ctx.user.id,
        action: "user_approved",
        entityType: "user",
        entityId: input.userId,
        oldValues: { status: userResult[0].status },
        newValues: { status: "active" },
      });

      return { success: true, message: "تم اعتماد المستخدم بنجاح" };
    }),

  // رفض مستخدم
  rejectUser: protectedProcedure
    .input(z.object({ userId: z.number(), reason: z.string().optional() }))
    .mutation(async ({ input, ctx }) => {
      const hasApprovePerm = await checkPermission(ctx.user.id, "requesters.approve");
      const isDefaultAllowedRole = ["super_admin", "system_admin"].includes(ctx.user.role);
      if (!isDefaultAllowedRole && !hasApprovePerm) {
        throw new TRPCError({ code: "FORBIDDEN", message: "ليس لديك صلاحية لرفض المستخدمين" });
      }

      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "قاعدة البيانات غير متاحة" });

      await db.update(users).set({ status: "blocked" }).where(eq(users.id, input.userId));

      await db.insert(auditLogs).values({
        userId: ctx.user.id,
        action: "user_rejected",
        entityType: "user",
        entityId: input.userId,
        newValues: { status: "blocked", reason: input.reason },
      });

      return { success: true, message: "تم رفض المستخدم" };
    }),

  // تعليق مستخدم
  suspendUser: protectedProcedure
    .input(z.object({ userId: z.number(), reason: z.string().optional() }))
    .mutation(async ({ input, ctx }) => {
      if (!["super_admin", "system_admin"].includes(ctx.user.role)) {
        throw new TRPCError({ code: "FORBIDDEN", message: "ليس لديك صلاحية لتعليق المستخدمين" });
      }

      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "قاعدة البيانات غير متاحة" });

      await db.update(users).set({ status: "suspended" }).where(eq(users.id, input.userId));

      await db.insert(auditLogs).values({
        userId: ctx.user.id,
        action: "user_suspended",
        entityType: "user",
        entityId: input.userId,
        newValues: { status: "suspended", reason: input.reason },
      });

      return { success: true, message: "تم تعليق المستخدم" };
    }),

  // تغيير دور المستخدم
  changeUserRole: protectedProcedure
    .input(z.object({
      userId: z.number(),
      newRole: z.enum([
        "super_admin",
        "system_admin",
        "projects_office",
        "field_team",
        "quick_response",
        "financial",
        "project_manager",
        "corporate_comm",
        "service_requester",
      ]),
    }))
    .mutation(async ({ input, ctx }) => {
      if (ctx.user.role !== "super_admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "فقط المدير العام يمكنه تغيير الأدوار" });
      }

      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "قاعدة البيانات غير متاحة" });

      const userResult = await db.select().from(users).where(eq(users.id, input.userId)).limit(1);
      if (userResult.length === 0) {
        throw new TRPCError({ code: "NOT_FOUND", message: "المستخدم غير موجود" });
      }

      const oldRole = userResult[0].role;
      await db.update(users).set({ role: input.newRole }).where(eq(users.id, input.userId));

      await db.insert(auditLogs).values({
        userId: ctx.user.id,
        action: "user_role_changed",
        entityType: "user",
        entityId: input.userId,
        oldValues: { role: oldRole },
        newValues: { role: input.newRole },
      });

      return { success: true, message: "تم تغيير دور المستخدم بنجاح" };
    }),

  // الحصول على قائمة المستخدمين قيد الانتظار
  getPendingUsers: protectedProcedure.query(async ({ ctx }) => {
    if (!["super_admin", "system_admin", "projects_office"].includes(ctx.user.role)) {
      throw new TRPCError({ code: "FORBIDDEN", message: "ليس لديك صلاحية لعرض المستخدمين" });
    }

    const db = await getDb();
    if (!db) return [];

    return await db.select().from(users).where(and(eq(users.status, "pending"), isNull(users.deletedAt)));
  }),

  // الحصول على جميع المستخدمين
  getAllUsers: protectedProcedure
    .input(z.object({
      role: z.string().optional(),
      status: z.string().optional(),
    }).optional())
    .query(async ({ ctx, input }) => {
      if (!["super_admin", "system_admin", "projects_office"].includes(ctx.user.role)) {
        throw new TRPCError({ code: "FORBIDDEN", message: "ليس لديك صلاحية لعرض المستخدمين" });
      }

      const db = await getDb();
      if (!db) return [];

      let query = db.select().from(users).where(isNull(users.deletedAt));
      
      // يمكن إضافة فلاتر هنا حسب الحاجة
      return await query;
    }),

  // الحصول على بيانات مستخدم معين
  getUserById: protectedProcedure
    .input(z.object({
      userId: z.number(),
    }))
    .query(async ({ ctx, input }) => {
      // التحقق من الصلاحية
      const hasViewPermission = await checkPermission(ctx.user.id, "users.view");
      if (!['super_admin', 'system_admin', 'projects_office'].includes(ctx.user.role) && !hasViewPermission) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'ليس لديك صلاحية لعرض بيانات المستخدمين' });
      }

      const db = await getDb();
      if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'قاعدة البيانات غير متاحة' });

      const userResult = await db.select().from(users).where(and(eq(users.id, input.userId), isNull(users.deletedAt))).limit(1);
      if (userResult.length === 0) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'المستخدم غير موجود' });
      }

      return userResult[0];
    }),

  // تحديث الملف الشخصي
  updateProfile: protectedProcedure
    .input(z.object({
      name: z.string().min(2, "الاسم يجب أن يكون حرفين على الأقل").max(60, "الاسم يجب ألا يتجاوز 60 حرف").optional(),
      phone: z.string().optional(),
      city: z.string().optional(),
      signatureName: z.string().optional(),
      signatureDepartment: z.string().optional(),
      signatureUrl: z.string().optional(),
      showSignatureInDocuments: z.boolean().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "قاعدة البيانات غير متاحة" });

      const updateData: Record<string, unknown> = {};
      if (input.name) updateData.name = input.name;
      if (input.phone !== undefined) updateData.phone = input.phone;
      if (input.city !== undefined) updateData.city = input.city;
      if (input.signatureName !== undefined) updateData.signatureName = input.signatureName;
      if (input.signatureDepartment !== undefined) updateData.signatureDepartment = input.signatureDepartment;
      if (input.signatureUrl !== undefined) updateData.signatureUrl = input.signatureUrl;
      if (input.showSignatureInDocuments !== undefined) updateData.showSignatureInDocuments = input.showSignatureInDocuments;

      if (Object.keys(updateData).length > 0) {
        await db.update(users).set(updateData).where(eq(users.id, ctx.user.id));
      }

      return { success: true, message: "تم تحديث الملف الشخصي بنجاح" };
    }),

  // رفع التوقيع الرقمي (يتم رفعه لـ OneDrive عند ضبطه أو التخزين المحلي)
  uploadSignature: protectedProcedure
    .input(z.object({
      fileData: z.string(), // Base64 encoded file
      fileName: z.string(),
      mimeType: z.string(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "قاعدة البيانات غير متاحة" });

      const allowedMimes = ["image/jpeg", "image/png", "image/webp", "image/jpg", "image/pjpeg", "image/x-png", "image/svg+xml"];
      const allowedExts = ["jpg", "jpeg", "png", "webp", "svg"];
      const extension = input.fileName.split(".").pop()?.toLowerCase() || "png";

      if (!allowedMimes.includes(input.mimeType) || !allowedExts.includes(extension)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "الملف المرفوع ليس صورة توقيع صالحة. يُسمح فقط بصور (PNG, JPG, WEBP, SVG)."
        });
      }

      const { storagePut } = await import("../storage");

      const base64Data = input.fileData.replace(/^data:[^;]+;base64,/, "");
      const buffer = Buffer.from(base64Data, "base64");

      const timestamp = Date.now();
      const randomSuffix = Math.random().toString(36).substring(2, 8);
      const fileKey = `signatures/user-${ctx.user.id}-${timestamp}-${randomSuffix}.${extension}`;

      let url: string;
      try {
        const result = await storagePut(fileKey, buffer, input.mimeType);
        url = result.url;
      } catch (error: any) {
        console.error('[uploadSignature] Storage error:', error);
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: `فشل رفع التوقيع: ${error?.message || 'خطأ في التخزين'}` });
      }

      // محاولة إضافة العمود لو لم يكن موجهاً مسبقاً
      try {
        await db.execute(sql`ALTER TABLE users ADD COLUMN signatureUrl TEXT;`);
      } catch (e) {
        // Ignored if column already exists
      }

      await db.update(users).set({ signatureUrl: url }).where(eq(users.id, ctx.user.id));

      return { success: true, url, message: "تم رفع التوقيع الرقمي بنجاح" };
    }),

  // حذف التوقيع الرقمي
  removeSignature: protectedProcedure
    .mutation(async ({ ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "قاعدة البيانات غير متاحة" });

      await db.update(users).set({ signatureUrl: null }).where(eq(users.id, ctx.user.id));

      return { success: true, message: "تم حذف التوقيع الرقمي بنجاح" };
    }),


  // تغيير كلمة المرور
  changePassword: protectedProcedure
    .input(z.object({
      currentPassword: z.string(),
      newPassword: z.string().min(8, "كلمة المرور يجب أن تكون 8 أحرف على الأقل"),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "قاعدة البيانات غير متاحة" });

      const userResult = await db.select().from(users).where(eq(users.id, ctx.user.id)).limit(1);
      if (userResult.length === 0) {
        throw new TRPCError({ code: "NOT_FOUND", message: "المستخدم غير موجود" });
      }

      if (!userResult[0].passwordHash) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "هذا الحساب لا يحتوي على كلمة مرور مسجلة (قد يكون مسجلاً عبر نظام خارجي)" });
      }

      const [salt, storedHash] = userResult[0].passwordHash.split(":");
      const inputHash = hashPassword(input.currentPassword, salt);

      if (inputHash !== storedHash) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "كلمة المرور الحالية غير صحيحة" });
      }

      const newSalt = generateSalt();
      const newPasswordHash = hashPassword(input.newPassword, newSalt);

      await db.update(users).set({ passwordHash: `${newSalt}:${newPasswordHash}` }).where(eq(users.id, ctx.user.id));

      await db.insert(auditLogs).values({
        userId: ctx.user.id,
        action: "password_changed",
        entityType: "user",
        entityId: ctx.user.id,
      });

      return { success: true, message: "تم تغيير كلمة المرور بنجاح" };
    }),

  // إعادة تعيين كلمة المرور (للمدراء فقط)
  resetUserPassword: protectedProcedure
    .input(z.object({
      userId: z.number(),
      newPassword: z.string().min(8, "كلمة المرور يجب أن تكون 8 أحرف على الأقل"),
    }))
    .mutation(async ({ input, ctx }) => {
      // التحقق من الصلاحية - فقط المدراء يمكنهم إعادة تعيين كلمات المرور
      if (!["super_admin", "system_admin"].includes(ctx.user.role)) {
        throw new TRPCError({ code: "FORBIDDEN", message: "ليس لديك صلاحية لإعادة تعيين كلمات المرور" });
      }

      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "قاعدة البيانات غير متاحة" });

      // التحقق من وجود المستخدم
      const userResult = await db.select().from(users).where(eq(users.id, input.userId)).limit(1);
      if (userResult.length === 0) {
        throw new TRPCError({ code: "NOT_FOUND", message: "المستخدم غير موجود" });
      }

      const targetUser = userResult[0];

      // إنشاء salt جديد وتشفير كلمة المرور
      const newSalt = generateSalt();
      const newPasswordHash = hashPassword(input.newPassword, newSalt);

      await db.update(users).set({ 
        passwordHash: `${newSalt}:${newPasswordHash}`,
        loginMethod: "local"
      }).where(eq(users.id, input.userId));

      // تسجيل في سجل التدقيق
      await db.insert(auditLogs).values({
        userId: ctx.user.id,
        action: "password_reset_by_admin",
        entityType: "user",
        entityId: input.userId,
        newValues: { resetBy: ctx.user.email, targetUser: targetUser.email },
      });

      return { success: true, message: "تم إعادة تعيين كلمة المرور بنجاح" };
    }),

  // تعيين كلمة مرور للمستخدم (للمستخدمين الذين سجلوا عبر OAuth)
  setPassword: protectedProcedure
    .input(z.object({
      newPassword: z.string().min(8, "كلمة المرور يجب أن تكون 8 أحرف على الأقل"),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "قاعدة البيانات غير متاحة" });

      // إنشاء salt جديد وتشفير كلمة المرور
      const newSalt = generateSalt();
      const newPasswordHash = hashPassword(input.newPassword, newSalt);

      await db.update(users).set({ 
        passwordHash: `${newSalt}:${newPasswordHash}`,
        loginMethod: "local"
      }).where(eq(users.id, ctx.user.id));

      // تسجيل في سجل التدقيق
      await db.insert(auditLogs).values({
        userId: ctx.user.id,
        action: "password_set",
        entityType: "user",
        entityId: ctx.user.id,
      });

      return { success: true, message: "تم تعيين كلمة المرور بنجاح" };
    }),

  // منح استثناء لتسجيل مسجد إضافي (للمدراء فقط)
  grantMosqueExemption: protectedProcedure
    .input(z.object({
      userId: z.number(),
      exemptions: z.number().min(1).max(10).default(1), // عدد الاستثناءات الممنوحة
      reason: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      // التحقق من صلاحية المستخدم (مدراء فقط)
      if (!["super_admin", "system_admin", "projects_office"].includes(ctx.user.role)) {
        throw new TRPCError({ code: "FORBIDDEN", message: "ليس لديك صلاحية لمنح الاستثناءات" });
      }

      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "قاعدة البيانات غير متاحة" });

      // التحقق من وجود المستخدم
      const targetUser = await db.select().from(users).where(eq(users.id, input.userId)).limit(1);
      if (targetUser.length === 0) {
        throw new TRPCError({ code: "NOT_FOUND", message: "المستخدم غير موجود" });
      }

      // التحقق من أن المستخدم طالب خدمة
      if (targetUser[0].role !== "service_requester") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "يمكن منح الاستثناءات لطالبي الخدمة فقط" });
      }

      // تحديث عدد الاستثناءات
      const currentExemptions = targetUser[0].mosqueExemptions || 0;
      const newExemptions = currentExemptions + input.exemptions;

      await db.update(users).set({ mosqueExemptions: newExemptions }).where(eq(users.id, input.userId));

      // تسجيل في سجل التدقيق
      await db.insert(auditLogs).values({
        userId: ctx.user.id,
        action: "mosque_exemption_granted",
        entityType: "user",
        entityId: input.userId,
        newValues: { 
          exemptionsGranted: input.exemptions, 
          totalExemptions: newExemptions,
          reason: input.reason || "لم يتم تحديد سبب",
          grantedBy: ctx.user.email 
        },
      });

      return { 
        success: true, 
        message: `تم منح ${input.exemptions} استثناء للمستخدم. إجمالي الاستثناءات: ${newExemptions}`,
        totalExemptions: newExemptions
      };
    }),

  // إلغاء استثناء (للمدراء فقط)
  revokeMosqueExemption: protectedProcedure
    .input(z.object({
      userId: z.number(),
      exemptions: z.number().min(1).default(1), // عدد الاستثناءات الملغاة
      reason: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      // التحقق من صلاحية المستخدم (مدراء فقط)
      if (!["super_admin", "system_admin", "projects_office"].includes(ctx.user.role)) {
        throw new TRPCError({ code: "FORBIDDEN", message: "ليس لديك صلاحية لإلغاء الاستثناءات" });
      }

      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "قاعدة البيانات غير متاحة" });

      // التحقق من وجود المستخدم
      const targetUser = await db.select().from(users).where(eq(users.id, input.userId)).limit(1);
      if (targetUser.length === 0) {
        throw new TRPCError({ code: "NOT_FOUND", message: "المستخدم غير موجود" });
      }

      const currentExemptions = targetUser[0].mosqueExemptions || 0;
      const newExemptions = Math.max(0, currentExemptions - input.exemptions);

      await db.update(users).set({ mosqueExemptions: newExemptions }).where(eq(users.id, input.userId));

      // تسجيل في سجل التدقيق
      await db.insert(auditLogs).values({
        userId: ctx.user.id,
        action: "mosque_exemption_revoked",
        entityType: "user",
        entityId: input.userId,
        newValues: { 
          exemptionsRevoked: input.exemptions, 
          totalExemptions: newExemptions,
          reason: input.reason || "لم يتم تحديد سبب",
          revokedBy: ctx.user.email 
        },
      });

      return { 
        success: true, 
        message: `تم إلغاء ${input.exemptions} استثناء. الاستثناءات المتبقية: ${newExemptions}`,
        totalExemptions: newExemptions
      };
    }),

  // طلب إعادة تعيين كلمة المرور (إرسال كود 4 أرقام)
  requestPasswordReset: publicProcedure
    .input(z.object({
      email: z.string().email("البريد الإلكتروني غير صالح"),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "قاعدة البيانات غير متاحة" });

      // البحث عن المستخدم بشرط ألا يكون service_requester
      const userResult = await db.select().from(users)
        .where(
          and(
            eq(users.email, input.email),
            ne(users.role, "service_requester"),
            isNull(users.deletedAt)
          )
        )
        .limit(1);

      if (userResult.length === 0) {
        throw new TRPCError({ code: "NOT_FOUND", message: "البريد الإلكتروني غير مسجل كحساب موظف" });
      }

      const userObj = userResult[0];

      // توليد كود مكون من 4 أرقام
      const code = Math.floor(1000 + Math.random() * 9000).toString();
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // صلاحية 15 دقيقة

      // إدراج الكود في جدول رموز إعادة التعيين
      await db.insert(passwordResetTokens).values({
        userId: userObj.id,
        token: code,
        expiresAt,
        used: false,
      });

      // تسجيل الكود في الكونسول للمطورين والتحقق المحلي
      console.log(`[FORGOT PASSWORD OTP] User: ${userObj.email}, Code: ${code}`);

      // إرسال الكود عبر البريد الإلكتروني
      const { sendEmailNotification } = await import("./notifications");
      const emailSent = await sendEmailNotification(
        userObj.email,
        "رمز التحقق لإعادة تعيين كلمة المرور - بوابة تمام",
        `رمز التحقق الخاص بك لإعادة تعيين كلمة المرور هو: ${code}. هذا الرمز صالح لمدة 15 دقيقة.`
      );

      if (!emailSent) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "فشل إرسال رمز التحقق إلى البريد الإلكتروني" });
      }

      return { success: true, message: "تم إرسال رمز التحقق إلى بريدك الإلكتروني بنجاح" };
    }),

  // التحقق من رمز إعادة التعيين
  verifyResetCode: publicProcedure
    .input(z.object({
      email: z.string().email("البريد الإلكتروني غير صالح"),
      code: z.string().length(4, "يجب أن يتكون الرمز من 4 أرقام"),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "قاعدة البيانات غير متاحة" });

      const userResult = await db.select().from(users)
        .where(
          and(
            eq(users.email, input.email),
            ne(users.role, "service_requester"),
            isNull(users.deletedAt)
          )
        )
        .limit(1);

      if (userResult.length === 0) {
        throw new TRPCError({ code: "NOT_FOUND", message: "المستخدم غير موجود" });
      }

      const userObj = userResult[0];

      // البحث عن كود فعال وغير منتهي وغير مستخدم
      const tokenResult = await db.select().from(passwordResetTokens)
        .where(
          and(
            eq(passwordResetTokens.userId, userObj.id),
            eq(passwordResetTokens.token, input.code),
            eq(passwordResetTokens.used, false),
            gt(passwordResetTokens.expiresAt, new Date())
          )
        )
        .limit(1);

      if (tokenResult.length === 0) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "رمز التحقق غير صحيح أو منتهي الصلاحية" });
      }

      return { success: true };
    }),

  // إعادة تعيين كلمة المرور باستخدام الكود
  resetPasswordWithCode: publicProcedure
    .input(z.object({
      email: z.string().email("البريد الإلكتروني غير صالح"),
      code: z.string().length(4, "يجب أن يتكون الرمز من 4 أرقام"),
      newPassword: z.string().min(8, "كلمة المرور يجب أن تكون 8 أحرف على الأقل"),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "قاعدة البيانات غير متاحة" });

      const userResult = await db.select().from(users)
        .where(
          and(
            eq(users.email, input.email),
            ne(users.role, "service_requester"),
            isNull(users.deletedAt)
          )
        )
        .limit(1);

      if (userResult.length === 0) {
        throw new TRPCError({ code: "NOT_FOUND", message: "المستخدم غير موجود" });
      }

      const userObj = userResult[0];

      // التحقق من صلاحية الكود للمرة الأخيرة
      const tokenResult = await db.select().from(passwordResetTokens)
        .where(
          and(
            eq(passwordResetTokens.userId, userObj.id),
            eq(passwordResetTokens.token, input.code),
            eq(passwordResetTokens.used, false),
            gt(passwordResetTokens.expiresAt, new Date())
          )
        )
        .limit(1);

      if (tokenResult.length === 0) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "رمز التحقق غير صحيح أو منتهي الصلاحية" });
      }

      const activeToken = tokenResult[0];

      // تشفير كلمة المرور الجديدة
      const salt = generateSalt();
      const newHash = hashPassword(input.newPassword, salt);
      const passwordHash = `${salt}:${newHash}`;

      // تحديث كلمة المرور في قاعدة البيانات
      await db.update(users).set({ passwordHash }).where(eq(users.id, userObj.id));

      // وسم الرمز كمستخدم
      await db.update(passwordResetTokens)
        .set({ used: true })
        .where(eq(passwordResetTokens.id, activeToken.id));

      // تسجيل في سجل التدقيق
      await db.insert(auditLogs).values({
        userId: userObj.id,
        action: "password_reset_via_code",
        entityType: "user",
        entityId: userObj.id,
      });

      return { success: true, message: "تمت إعادة تعيين كلمة المرور بنجاح" };
    }),
});
