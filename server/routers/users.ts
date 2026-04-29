import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { users, employees, userRoleAssignments } from "../../drizzle/schema";
import { eq } from "drizzle-orm";
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
  "project_manager",
  "corporate_comm",
] as const;

export const usersRouter = router({
  // Get all users
  getAll: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new Error("Database connection failed");
    return db.select().from(users).orderBy(users.createdAt);
  }),

  // Get user by ID
  getById: protectedProcedure
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
  getWithEmployee: protectedProcedure
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
  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(2, "الاسم مطلوب"),
        email: z.string().email("البريد الإلكتروني غير صحيح"),
        password: z.string().min(6, "كلمة المرور يجب أن تكون 6 أحرف على الأقل"),
        phone: z.string().optional(),
        role: z.enum([...STAFF_ROLES, "service_requester"]).default("projects_office"),
        status: z.enum(["active", "pending", "suspended"]).default("active"),
        department: z.string().optional(),
        position: z.string().optional(),
        roleIds: z.array(z.string()).optional(), // أدوار مخصصة لتعيينها فوراً
      })
    )
    .mutation(async ({ input, ctx }) => {
      if (!(["super_admin", "system_admin"] as string[]).includes(ctx.user.role)) {
        throw new TRPCError({ code: "FORBIDDEN", message: "ليس لديك صلاحية لإضافة مستخدمين" });
      }
      const db = await getDb();
      if (!db) throw new Error("Database connection failed");

      // التحقق من عدم تكرار البريد الإلكتروني
      const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.email, input.email)).limit(1);
      if (existing) {
        throw new TRPCError({ code: "CONFLICT", message: "البريد الإلكتروني مستخدم بالفعل" });
      }

      // تشفير كلمة المرور
      const salt = randomBytes(16).toString("hex");
      const hashedPwd = hashPassword(input.password, salt);
      const passwordHash = `${salt}:${hashedPwd}`;

      // إنشاء المستخدم
      const result = await db.insert(users).values({
        name: input.name,
        email: input.email,
        passwordHash,
        phone: input.phone || null,
        role: input.role as any,
        status: input.status as any,
        loginMethod: "local",
      });

      const newUserId = (result as any).insertId as number;

      // إنشاء سجل موظف إذا كانت هناك بيانات وظيفية
      if (input.department || input.position) {
        await db.insert(employees).values({
          userId: newUserId,
          department: input.department || null,
          position: input.position || null,
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
  toggleStatus: protectedProcedure
    .input(
      z.object({
        userId: z.number(),
        status: z.enum(["active", "pending", "suspended", "blocked"]),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database connection failed");
      await db
        .update(users)
        .set({ status: input.status })
        .where(eq(users.id, input.userId));
      return { success: true };
    }),

  // Update user basic info (including role and status)
  update: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        name: z.string().optional(),
        email: z.string().email().optional(),
        phone: z.string().optional(),
        role: z.enum([...STAFF_ROLES, "service_requester"]).optional(),
        status: z.enum(["active", "pending", "suspended", "blocked"]).optional(),
        department: z.string().optional(),
        position: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      if (!(["super_admin", "system_admin"] as string[]).includes(ctx.user.role)) {
        throw new TRPCError({ code: "FORBIDDEN", message: "ليس لديك صلاحية لتعديل المستخدمين" });
      }
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
  updateRole: protectedProcedure
    .input(
      z.object({
        userId: z.number(),
        role: z.enum([...STAFF_ROLES, "service_requester"]),
      })
    )
    .mutation(async ({ input, ctx }) => {
      if (!(["super_admin", "system_admin"] as string[]).includes(ctx.user.role)) {
        throw new TRPCError({ code: "FORBIDDEN", message: "ليس لديك صلاحية لتغيير الأدوار" });
      }
      const db = await getDb();
      if (!db) throw new Error("Database connection failed");
      await db.update(users).set({ role: input.role as any }).where(eq(users.id, input.userId));
      return { success: true };
    }),

  // Delete user
  delete: protectedProcedure
    .input(z.object({ userId: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database connection failed");
      await db.delete(users).where(eq(users.id, input.userId));
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
