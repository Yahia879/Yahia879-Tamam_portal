import dotenv from "dotenv";
dotenv.config();

import { getDb } from "../server/db";
import { users } from "../drizzle/schema";
import { calculateUserPermissions } from "../server/permissions";
import { eq } from "drizzle-orm";

async function main() {
  const db = await getDb();
  if (!db) {
    console.error("❌ No DB connection");
    return;
  }

  // Find a super_admin or system_admin user
  const adminUsers = await db
    .select()
    .from(users)
    .where(eq(users.role, "super_admin"))
    .limit(1);

  if (adminUsers.length === 0) {
    console.log("⚠️ No super_admin user found in DB. Creating a temporary check...");
    // Let's create a temporary admin user to check
    const tempAdminId = 999999;
    await db.insert(users).values({
      id: tempAdminId,
      openId: "temp-verify-admin",
      email: "temp-verify-admin@local.com",
      name: "Temporary Verification Admin",
      role: "super_admin",
      status: "active",
      lastSignedIn: new Date(),
    });

    try {
      const perms = await calculateUserPermissions(tempAdminId);
      console.log("Permissions for temporary super_admin:");
      console.log(" - Has View_Tickets:", perms.includes("View_Tickets"));
      console.log(" - Has Create_Ticket:", perms.includes("Create_Ticket"));
    } finally {
      await db.delete(users).where(eq(users.id, tempAdminId));
    }
  } else {
    const admin = adminUsers[0];
    console.log(`Found super_admin user: ${admin.name} (ID: ${admin.id})`);
    const perms = await calculateUserPermissions(admin.id);
    console.log("Permissions found:");
    console.log(" - Has View_Tickets:", perms.includes("View_Tickets"));
    console.log(" - Has Create_Ticket:", perms.includes("Create_Ticket"));
  }

  process.exit(0);
}

main().catch(console.error);
