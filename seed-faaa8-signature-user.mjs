import { mysqlTable, varchar, int, timestamp, text, boolean } from "drizzle-orm/mysql-core";
import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import { eq, or, and } from "drizzle-orm";
import { pbkdf2Sync, randomBytes } from "crypto";

function generatePasswordHash(password) {
  const salt = randomBytes(16).toString("hex");
  const hash = pbkdf2Sync(password, salt, 1000, 64, "sha512").toString("hex");
  return `${salt}:${hash}`;
}

import "dotenv/config";

const DATABASE_URL = process.env.DATABASE_URL || "mysql://root:@localhost:3306/temam";

async function runSeed() {
  console.log("🚀 Starting seed script for user faaa8@gmail.com and receipt_vouchers.sign permission...");
  
  const connection = await mysql.createConnection(DATABASE_URL);
  const db = drizzle(connection);

  const permissions = mysqlTable("permissions", {
    id: varchar("id", { length: 100 }).primaryKey(),
    nameAr: varchar("name_ar", { length: 255 }),
    nameEn: varchar("name_en", { length: 255 }),
    moduleId: varchar("module_id", { length: 50 }),
    action: varchar("action", { length: 50 }),
  });

  const users = mysqlTable("users", {
    id: int("id").autoincrement().primaryKey(),
    email: varchar("email", { length: 320 }).notNull().unique(),
    name: varchar("name", { length: 255 }),
    username: varchar("username", { length: 100 }),
    role: varchar("role", { length: 50 }),
    passwordHash: text("password_hash"),
    status: varchar("status", { length: 20 }),
  });

  const userPermissions = mysqlTable("user_permissions", {
    id: int("id").autoincrement().primaryKey(),
    userId: int("user_id").notNull(),
    permissionId: varchar("permission_id", { length: 100 }).notNull(),
    granted: boolean("granted").default(true),
  });

  const rolePermissions = mysqlTable("role_permissions", {
    id: int("id").autoincrement().primaryKey(),
    role: varchar("role", { length: 50 }).notNull(),
    permissionId: varchar("permission_id", { length: 100 }).notNull(),
  });

  // 1. Ensure module 'signing' exists
  const modulesTable = mysqlTable("modules", {
    id: varchar("id", { length: 50 }).primaryKey(),
    nameAr: varchar("name_ar", { length: 255 }),
  });

  const existingModule = await db.select().from(modulesTable).where(eq(modulesTable.id, "signing"));
  if (existingModule.length === 0) {
    const existingDisbursements = await db.select().from(modulesTable).where(eq(modulesTable.id, "disbursements"));
    if (existingDisbursements.length === 0) {
      await db.insert(modulesTable).values({ id: "signing", nameAr: "التوقيعات" });
    }
  }

  // 2. Ensure permission 'receipt_vouchers.sign' exists
  const targetPermIds = [
    { id: "receipt_vouchers.sign", mod: existingModule.length > 0 ? "signing" : "disbursements" },
    { id: "signing.receipt_vouchers_sign", mod: existingModule.length > 0 ? "signing" : "disbursements" },
    { id: "vouchers.sign_receipt", mod: existingModule.length > 0 ? "signing" : "disbursements" }
  ];

  for (const item of targetPermIds) {
    const existing = await db.select().from(permissions).where(eq(permissions.id, item.id));
    if (existing.length === 0) {
      await db.insert(permissions).values({
        id: item.id,
        nameAr: "توقيع سندات القبض",
        nameEn: "Sign Receipt Vouchers",
        moduleId: item.mod,
        action: "sign",
      });
      console.log(`✅ Created permission: ${item.id}`);
    }
  }

  // 2. Ensure user faaa8@gmail.com exists
  const targetEmail = "faaa8@gmail.com";
  let userList = await db.select().from(users).where(eq(users.email, targetEmail));
  let userId;

  if (userList.length === 0) {
    const pwdHash = generatePasswordHash("12345678");
    const [result] = await db.insert(users).values({
      email: targetEmail,
      name: "المسؤول المالي (faaa8)",
      username: "faaa8",
      role: "finance",
      passwordHash: pwdHash,
      status: "active",
    });
    userId = result.insertId;
    console.log(`✅ Created user faaa8@gmail.com with ID: ${userId}`);
  } else {
    userId = userList[0].id;
    // Update password to 12345678 to ensure login works
    const pwdHash = generatePasswordHash("12345678");
    await db.update(users).set({ passwordHash: pwdHash, status: "active" }).where(eq(users.id, userId));
    console.log(`✅ Updated existing user faaa8@gmail.com (ID: ${userId}) with password 12345678`);
  }

  // 3. Grant permission to faaa8@gmail.com user
  for (const permId of targetPermIds) {
    const existingUserPerm = await db
      .select()
      .from(userPermissions)
      .where(and(eq(userPermissions.userId, userId), eq(userPermissions.permissionId, permId)));
    if (existingUserPerm.length === 0) {
      await db.insert(userPermissions).values({
        userId,
        permissionId: permId,
        granted: true,
      });
      console.log(`✅ Granted permission ${permId} to user ID ${userId}`);
    }
  }

  // 4. Grant permission to finance and super_admin roles
  const rolesToGrant = ["finance", "accountant", "super_admin", "system_admin", "general_manager"];
  for (const r of rolesToGrant) {
    for (const permId of targetPermIds) {
      const existingRolePerm = await db
        .select()
        .from(rolePermissions)
        .where(and(eq(rolePermissions.role, r), eq(rolePermissions.permissionId, permId)));
      if (existingRolePerm.length === 0) {
        await db.insert(rolePermissions).values({
          role: r,
          permissionId: permId,
        });
        console.log(`✅ Granted permission ${permId} to role ${r}`);
      }
    }
  }

  console.log("🎉 Seed finished successfully!");
  await connection.end();
}

runSeed().catch(console.error);
