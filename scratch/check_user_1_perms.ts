import dotenv from "dotenv";
dotenv.config();

import { getDb } from "../server/db";
import { calculateUserPermissions } from "../server/permissions";

async function main() {
  const db = await getDb();
  if (!db) {
    console.error("Database not available");
    process.exit(1);
  }

  const perms = await calculateUserPermissions(1);
  console.log("Total perms:", perms.length);
  console.log("Includes disbursements.add:", perms.includes("disbursements.add"));
  console.log("Includes disbursements.create:", perms.includes("disbursements.create"));
  console.log("Includes disbursements.create_custom:", perms.includes("disbursements.create_custom"));
  process.exit(0);
}

main().catch(console.error);
