import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAdminContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "admin-user",
    email: "admin@tamam.sa",
    name: "مدير النظام",
    loginMethod: "local",
    role: "super_admin",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };
  return {
    user,
    req: {} as any,
    res: {
      cookie: () => {},
      clearCookie: () => {},
    } as any,
  };
}

function createNonAdminContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 999999,
    openId: "regular-user",
    email: "user@tamam.sa",
    name: "مستخدم عادي",
    loginMethod: "local",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };
  return {
    user,
    req: {} as any,
    res: {
      cookie: () => {},
      clearCookie: () => {},
    } as any,
  };
}

describe("users.create", () => {
  it("يجب أن يرفض إنشاء مستخدم من قِبل مستخدم غير مدير", async () => {
    const caller = appRouter.createCaller(createNonAdminContext());
    await expect(
      caller.users.create({
        name: "مستخدم جديد",
        email: "new@tamam.sa",
        password: "Test@123456",
        role: "projects_office",
      })
    ).rejects.toThrow("ليس لديك صلاحية");
  });

  it("يجب أن يتحقق من صحة البريد الإلكتروني", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    await expect(
      caller.users.create({
        name: "مستخدم جديد",
        email: "invalid-email",
        password: "Test@123456",
        role: "projects_office",
      })
    ).rejects.toThrow();
  });

  it("يجب أن يتحقق من طول كلمة المرور", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    await expect(
      caller.users.create({
        name: "مستخدم جديد",
        email: "new@tamam.sa",
        password: "123",
        role: "projects_office",
      })
    ).rejects.toThrow();
  });
});
