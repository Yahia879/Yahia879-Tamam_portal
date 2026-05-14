import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { permissionProcedure } from "../permissions";
import { getDb } from "../db";
import { users, employees, userRoleAssignments, passwordResetTokens, roles } from "../../drizzle/schema";
import { eq, count, and, notInArray, desc, like, or, sql, isNull } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { randomBytes, pbkdf2Sync } from "crypto";

function hashPassword(password: string, salt: string): string {
  return pbkdf2Sync(password, salt, 1000, 64, "sha512").toString("hex");
}

const STAFF_ROLES = [
  "super_admin",
  "system_admin",
  "projects_office",
  "field_team",
  "quick_response",
  "financial",
  "financial_manager",
  "project_manager",
  "corporate_comm",
] as const;

export const usersRouter = router({
  // Get paginated users (staff only)
  getAll: permissionProcedure("users.view")
    .input(z.object({
      page: z.number().default(1),
      limit: z.number().default(20),
      search: z.string().optional(),
    }))
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database connection failed");

      const { page, limit, search } = input;
      const offset = (page - 1) * limit;

      // تصفية المستخدمين لاستبعاد أدوار طالب الخدمة والمستخدمين المحذوفين
      const excludedRoles = ["service_requester", "imam", "muezzin"] as any[];
      
      let whereClause = and(
        notInArray(users.role, excludedRoles)
      );
      
      if (search) {
        whereClause = and(
          whereClause,
          or(
            like(users.name, `%${search}%`),
            like(users.email, `%${search}%`)
          )
        ) as any;
      }

      // جلب العدد الإجمالي
      const [countResult] = await db
        .select({ value: count() })
        .from(users)
        .where(whereClause);
      
      // جلب عدد الحسابات النشطة والموقوفة للإحصائيات
      const [activeResult] = await db
        .select({ value: count() })
        .from(users)
        .where(and(whereClause, eq(users.status, "active")));

      const [suspendedResult] = await db
        .select({ value: count() })
        .from(users)
        .where(and(whereClause, eq(users.status, "suspended")));
      
      const totalCount = countResult.value;

      // جلب البيانات مع الترتيب والتقسيم
      const items = await db
        .select()
        .from(users)
        .where(whereClause)
        .orderBy(
          sql`CASE 
            WHEN ${users.role} = 'super_admin' THEN 0
            WHEN ${users.role} = 'system_admin' THEN 1
            WHEN ${users.id} = ${ctx.user.id} THEN 2 
            ELSE 3 
          END ASC`,
          desc(users.createdAt)
        )
        .limit(limit)
        .offset(offset);

      // جلب الأدوار المخصصة لكل مستخدم (من جدول user_roles مربوطاً بجدول roles)
      const userIds = items.map((u) => u.id);
      let customRoleMap: Record<number, { id: string; nameAr: string }> = {};

      if (userIds.length > 0) {
        const assignments = await db
          .select({
            userId: userRoleAssignments.userId,
            roleId: roles.id,
            roleNameAr: roles.nameAr,
          })
          .from(userRoleAssignments)
          .innerJoin(roles, eq(userRoleAssignments.roleId, roles.id))
          .where(
            sql`${userRoleAssignments.userId} IN (${sql.join(userIds.map((id) => sql`${id}`), sql`, `)})`
          );

        for (const a of assignments) {
          if (a.userId !== null) {
            customRoleMap[a.userId] = { id: a.roleId, nameAr: a.roleNameAr };
          }
        }
      }

      // إثراء كل مستخدم ببيانات الدور المخصص إن وُجد
      const enrichedItems = items.map((user) => ({
        ...user,
        customRole: customRoleMap[user.id] ?? null,
      }));

      return {
        items: enrichedItems,
        totalCount,
        activeCount: activeResult.value,
        suspendedCount: suspendedResult.value,
        totalPages: Math.ceil(totalCount / limit),
      };
    }),

  // Get user by ID
  getById: permissionProcedure("users.view")
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database connection failed");
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, input.id))
        .limit(1);
      return user;
    }),

  // Get user with employee info
  getWithEmployee: permissionProcedure("users.view")
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database connection failed");
      const [user] = await db.select().from(users).where(eq(users.id, input.id)).limit(1);
      if (!user) return null;
      const [emp] = await db.select().from(employees).where(eq(employees.userId, input.id)).limit(1);
      return { ...user, employee: emp || null };
    }),

  // Create new user (staff)
  create: permissionProcedure("users.create")
    .input(
      z.object({
        name: z.string().min(2, "الاسم يجب أن يكون حرفين على الأقل").max(60, "الاسم يجب ألا يتجاوز 60 حرف"),
        email: z.string().email("البريد الإلكتروني غير صحيح"),
        password: z.string().min(6, "كلمة المرور يجب أن تكون 6 أحرف على الأقل"),
        phone: z.string().optional(),
        // role is optional when the user is assigned exclusively via a custom role (roleIds)
        role: z.enum([...STAFF_ROLES, "service_requester"]).optional(),
        status: z.enum(["active", "pending", "suspended"]).default("active"),
        department: z.string().optional(),
        position: z.string().optional(),
        roleIds: z.array(z.string()).optional(), // أدوار مخصصة لتعيينها فوراً
      }).refine(
        (data) => !!data.role || (data.roleIds && data.roleIds.length > 0),
        { message: "يجب تحديد الدور الوظيفي أو دور مخصص على الأقل" }
      )
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database connection failed");

      // التحقق من عدم تكرار البريد الإلكتروني
      const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.email, input.email)).limit(1);
      if (existing) {
        throw new TRPCError({ code: "CONFLICT", message: "هذا المستخدم مسجل مسبقاً" });
      }

      // تشفير كلمة المرور
      const salt = randomBytes(16).toString("hex");
      const hashedPwd = hashPassword(input.password, salt);
      const passwordHash = `${salt}:${hashedPwd}`;

      // عند اختيار دور مخصص فقط (بدون دور أساسي)، نستخدم "projects_office" كقيمة محايدة
      // للحقل role في جدول users (المطلوب من DB)، ويُعدّ الدور الفعلي هو roleIds
      const effectiveRole = input.role ?? "projects_office";

      // إنشاء المستخدم
      const [result] = await db.insert(users).values({
        name: input.name,
        email: input.email,
        passwordHash,
        phone: input.phone || null,
        role: effectiveRole as any,
        status: input.status as any,
        loginMethod: "local",
      });

      const newUserId = Number(result.insertId);

      // إنشاء سجل موظف دائماً للكادر (بغض النظر عن نوع الدور)
      const isStaff = input.role ? STAFF_ROLES.includes(input.role as any) : true;
      if (isStaff || input.department || input.position) {
        // توليد رقم وظيفي: EMP-YYYY-ID
        const currentYear = new Date().getFullYear();
        const employeeNumber = `EMP-${currentYear}-${String(newUserId).padStart(4, "0")}`;

        await db.insert(employees).values({
          userId: newUserId,
          employeeNumber,
          department: input.department || "الإدارة",
          position: input.position || "موظف",
          hireDate: new Date(),
        });
      }

      // تعيين الأدوار المخصصة إذا وُجدت
      if (input.roleIds && input.roleIds.length > 0) {
        for (const roleId of input.roleIds) {
          await db.insert(userRoleAssignments).values({
            userId: newUserId,
            roleId,
            assignedBy: ctx.user.id,
          }).catch(() => {}); // تجاهل التكرار
        }
      }

      return { success: true, userId: newUserId };
    }),

  // Toggle user status
  toggleStatus: permissionProcedure("users.edit")
    .input(
      z.object({
        userId: z.number(),
        status: z.enum(["active", "pending", "suspended", "blocked"]),
      })
    )
    .mutation(async ({ input, ctx }) => {
      if (input.userId === ctx.user.id) {
        throw new TRPCError({ 
          code: "FORBIDDEN", 
          message: "لا يمكنك تغيير حالة حسابك الخاص من هنا" 
        });
      }

      const db = await getDb();
      if (!db) throw new Error("Database connection failed");
      await db
        .update(users)
        .set({ status: input.status })
        .where(eq(users.id, input.userId));
      return { success: true };
    }),

  // Update user basic info (including role and status)
  update: permissionProcedure("users.edit")
    .input(
      z.object({
        id: z.number(),
        name: z.string().min(2, "الاسم يجب أن يكون حرفين على الأقل").max(60, "الاسم يجب ألا يتجاوز 60 حرف").optional(),
        email: z.string().email().optional(),
        phone: z.string().optional(),
        role: z.enum([...STAFF_ROLES, "service_requester"]).optional(),
        status: z.enum(["active", "pending", "suspended", "blocked"]).optional(),
        department: z.string().optional(),
        position: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database connection failed");
      const { id, department, position, ...updateData } = input;
      await db.update(users).set(updateData as any).where(eq(users.id, id));

      // تحديث بيانات الموظف إذا وُجدت
      if (department !== undefined || position !== undefined) {
        const [emp] = await db.select().from(employees).where(eq(employees.userId, id)).limit(1);
        if (emp) {
          await db.update(employees).set({
            ...(department !== undefined ? { department } : {}),
            ...(position !== undefined ? { position } : {}),
          }).where(eq(employees.userId, id));
        } else {
          await db.insert(employees).values({
            userId: id,
            department: department || null,
            position: position || null,
          });
        }
      }

      return { success: true };
    }),

  // Update user role
  updateRole: permissionProcedure("users.edit")
    .input(
      z.object({
        userId: z.number(),
        role: z.enum([...STAFF_ROLES, "service_requester"]),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database connection failed");
      await db.update(users).set({ role: input.role as any }).where(eq(users.id, input.userId));
      return { success: true };
    }),

  // Delete user
  delete: permissionProcedure("users.delete")
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      if (input.id === ctx.user.id) {
        throw new TRPCError({ 
          code: "FORBIDDEN", 
          message: "لا يمكنك حذف حسابك الخاص" 
        });
      }

      const db = await getDb();
      if (!db) throw new Error("Database connection failed");
      
      // تنفيذ الحذف النهائي (Hard Delete)
      // بفضل قيود SET NULL في قاعدة البيانات، سيتم تصفير حقول المستخدم في السجلات المرتبطة تلقائياً
      await db.delete(users).where(eq(users.id, input.id));
      
      return { success: true };
    }),

  // Get staff users (employees only, excluding service requesters)
  getStaffUsers: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new Error("Database connection failed");
    const staffUsers = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        status: users.status,
      })
      .from(users)
      .where(eq(users.status, "active"));
    return staffUsers.filter(user => user.role !== "service_requester");
  }),
});
