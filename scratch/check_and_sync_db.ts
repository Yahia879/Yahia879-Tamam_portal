import { getDb } from "../server/db";
import { modules, permissions, rolePermissions } from "../drizzle/schema";
import { sql } from "drizzle-orm";
import * as dotenv from "dotenv";
dotenv.config();

async function main() {
  console.log("Checking DB connection and schema status...");
  const db = await getDb();
  if (!db) {
    console.error("❌ Could not connect to database with DATABASE_URL.");
    process.exit(1);
  }

  console.log("✅ Successfully connected to database.");

  // Check columns on disbursement_orders
  const [cols] = await (db as any).execute(sql`SHOW COLUMNS FROM disbursement_orders`) as any[];
  const colNames = Array.isArray(cols) ? cols.map((c: any) => c.Field) : [];
  console.log("disbursement_orders columns count:", colNames.length);

  // Check modules
  const mods = await db.select().from(modules);
  console.log("Modules in DB:", mods.map((m: any) => m.id));

  // Check permissions count
  const perms = await db.select().from(permissions);
  console.log("Total permissions in DB:", perms.length);

  // Check specific new permissions
  const newPermIds = [
    "purchase_orders.view",
    "purchase_orders.add",
    "purchase_orders.approve",
    "purchase_orders.create_disbursement",
    "purchase_orders.export",
    "csr_letters.view",
    "csr_letters.add",
    "csr_letters.approve",
    "csr_letters.create_disbursement",
    "csr_letters.export",
    "sedana_warehouse.view",
    "sedana_warehouse.inward",
    "sedana_warehouse.outbound",
    "sedana_warehouse.confirm_receipt",
    "sedana_warehouse.print",
    "sedana_warehouse.export",
    "disbursement_orders.remind",
    "board_leadership.remind"
  ];

  const existingNewPerms = perms.filter((p: any) => newPermIds.includes(p.id));
  console.log(`Found ${existingNewPerms.length} / ${newPermIds.length} of the newly added permissions.`);

  const missing = newPermIds.filter(id => !perms.some((p: any) => p.id === id));
  if (missing.length > 0) {
    console.log("Missing permissions in DB:", missing);
  } else {
    console.log("All new permissions are already present in DB.");
  }
}

main().catch(err => {
  console.error("Error:", err);
  process.exit(1);
});
