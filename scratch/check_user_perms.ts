import dotenv from "dotenv";
dotenv.config();

import { getDb } from "../server/db";
import { users } from "../drizzle/schema";
import { calculateUserPermissions } from "../server/permissions";

async function main() {
  const db = await getDb();
  if (!db) {
    console.error("Database not available");
    process.exit(1);
  }

  const allUsers = await db.select().from(users);
  console.log(`Found ${allUsers.length} users:`);
  for (const u of allUsers) {
    const perms = await calculateUserPermissions(u.id);
    const hasAdd = perms.includes("disbursements.add");
    const hasCustom = perms.includes("disbursements.create_custom");
    const hasCreate = perms.includes("disbursements.create");
    console.log(`User ID: ${u.id} | Name: ${u.name} | Role: ${u.role} | hasAdd: ${hasAdd} | hasCustom: ${hasCustom} | hasCreate: ${hasCreate}`);
  }
  process.exit(0);
}

main().catch(console.error);
