import "dotenv/config";
import { getDb } from "./server/db";
import { users, userPermissions, rolePermissions, permissions, modules } from "./drizzle/schema";
import { eq, and } from "drizzle-orm";
import { pbkdf2Sync, randomBytes } from "crypto";

function generatePasswordHash(password: string) {
  const salt = randomBytes(16).toString("hex");
  const hash = pbkdf2Sync(password, salt, 1000, 64, "sha512").toString("hex");
  return `${salt}:${hash}`;
}

async function seedUserAndPermissions() {
  console.log("🚀 Starting seed script for user faaa8@gmail.com and receipt_vouchers.sign permission...");
  const db = await getDb();
  if (!db) {
    console.error("❌ Failed to connect to database");
    process.exit(1);
  }

  // 1. Ensure permission 'receipt_vouchers.sign' exists in database
  const targetPermIds = ["receipt_vouchers.sign", "signing.receipt_vouchers_sign", "vouchers.sign_receipt"];
  
  for (const permId of targetPermIds) {
    try {
      const existing = await db.select().from(permissions).where(eq(permissions.id, permId));
      if (existing.length === 0) {
        await db.insert(permissions).values({
          id: permId,
          nameAr: "توقيع سندات القبض",
          nameEn: "Sign Receipt Vouchers",
          moduleId: "disbursements",
          action: "sign",
        });
        console.log(`✅ Created permission: ${permId}`);
      }
    } catch (err) {
      console.warn(`Warning inserting permission ${permId}:`, err);
    }
  }

  // 2. Ensure user solayani@manarah.org.sa exists
  const targetEmail = "solayani@manarah.org.sa";
  let userList = await db.select().from(users).where(eq(users.email, targetEmail));
  let userId: number;

  if (userList.length === 0) {
    const pwdHash = generatePasswordHash("12345678");
    const [result] = await db.insert(users).values({
      email: targetEmail,
      name: "المسؤول المالي (faaa8)",
      phone: "0500000000",
      role: "financial",
      passwordHash: pwdHash,
      status: "active",
      showSignatureInDocuments: true,
    });
    userId = result.insertId;
    console.log(`✅ Created user faaa8@gmail.com with ID: ${userId}`);
  } else {
    userId = userList[0].id;
    const pwdHash = generatePasswordHash("12345678");
    await db
      .update(users)
      .set({
        passwordHash: pwdHash,
        status: "active",
        showSignatureInDocuments: true,
      })
      .where(eq(users.id, userId));
    console.log(`✅ Updated existing user faaa8@gmail.com (ID: ${userId}) with password 12345678`);
  }

  // 3. Grant permissions to user faaa8@gmail.com
  for (const permId of targetPermIds) {
    try {
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
    } catch (err) {
      console.warn(`Warning granting user perm ${permId}:`, err);
    }
  }

  // 4. Grant permissions to roles
  const rolesToGrant: ("financial" | "super_admin" | "system_admin" | "general_manager")[] = [
    "financial",
    "super_admin",
    "system_admin",
    "general_manager",
  ];
  for (const r of rolesToGrant) {
    for (const permId of targetPermIds) {
      try {
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
      } catch (err) {
        console.warn(`Warning granting role perm ${permId}:`, err);
      }
    }
  }

  console.log("🎉 Seed finished successfully!");
  process.exit(0);
}

seedUserAndPermissions().catch((err) => {
  console.error("❌ Seed failed:", err);
  process.exit(1);
});
