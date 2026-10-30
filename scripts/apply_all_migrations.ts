import mysql from "mysql2/promise";
import mysqlCallback from "mysql2";
import { drizzle } from "drizzle-orm/mysql2";
import * as dotenv from "dotenv";
import { ensureSchemaUpdated } from "../server/db";
import { syncAllPermissionsToDatabase } from "../server/permissions";

dotenv.config();

async function syncTargetDb(dbUrl: string, label: string) {
  console.log(`\n===============================================================`);
  console.log(`🚀 Starting Database & Permissions Sync on: ${label}`);
  console.log(`URL: ${dbUrl.replace(/:[^:@]+@/, ":***@")}`);
  console.log(`===============================================================`);

  // 1. Create callback pool for ensureSchemaUpdated
  const pool = mysqlCallback.createPool({
    uri: dbUrl,
    timezone: "Z",
  });

  try {
    console.log(`\n1️⃣  Running schema updates (ensureSchemaUpdated)...`);
    await ensureSchemaUpdated(pool);
    console.log(`   ✅ Schema updates applied successfully.`);

    // 2. Wrap pool with drizzle
    const db = drizzle(pool);

    console.log(`\n2️⃣  Syncing modules, permissions, and role mappings (syncAllPermissionsToDatabase)...`);
    await syncAllPermissionsToDatabase(db);
    console.log(`   ✅ Permissions and roles synced successfully.`);

    // 3. Verify counts using promise connection
    const promiseConn = await mysql.createConnection(dbUrl);
    try {
      const [tableRows]: any = await promiseConn.query("SHOW TABLES");
      const [moduleRows]: any = await promiseConn.query("SELECT COUNT(*) as count FROM modules");
      const [permRows]: any = await promiseConn.query("SELECT COUNT(*) as count FROM permissions");
      const [rolePermRows]: any = await promiseConn.query("SELECT COUNT(*) as count FROM role_permissions");

      console.log(`\n📊 Final DB Status for [${label}]:`);
      console.log(`   - Tables in DB: ${tableRows.length}`);
      console.log(`   - Modules in DB: ${moduleRows[0].count}`);
      console.log(`   - Permissions in DB: ${permRows[0].count}`);
      console.log(`   - Role-Permission Mappings in DB: ${rolePermRows[0].count}`);

      // Verify the 7 recent orders_and_letters permissions specifically
      const checkPerms = [
        'orders_and_letters.disbursement_orders',
        'orders_and_letters.disbursement_orders_create_direct',
        'orders_and_letters.disbursement_orders_exception_approve',
        'orders_and_letters.disbursement_orders_remind',
        'orders_and_letters.disbursement_orders_cancel_executed',
        'orders_and_letters.csr_letters',
        'orders_and_letters.csr_letters_add',
        'orders_and_letters.purchase_orders',
        'orders_and_letters.purchase_orders_add',
        'orders_and_letters.purchase_orders_create_disbursement'
      ];
      const [recentPerms]: any = await promiseConn.query(
        "SELECT id, name_ar FROM permissions WHERE id IN (?)",
        [checkPerms]
      );
      console.log(`\n🔐 Verified orders_and_letters permissions in DB (${recentPerms.length}/${checkPerms.length}):`);
      for (const p of recentPerms) {
        console.log(`   ✓ [${p.id}] -> ${p.name_ar}`);
      }
    } finally {
      await promiseConn.end();
    }
  } finally {
    pool.end();
  }
}

async function main() {
  const primaryUrl = process.env.DATABASE_URL;
  if (!primaryUrl) {
    console.error("❌ DATABASE_URL is not defined in .env!");
    process.exit(1);
  }

  // 1. Sync primary database
  await syncTargetDb(primaryUrl, "Primary Database (test_temam)");

  // 2. Sync secondary database if it exists
  const secondaryUrl = primaryUrl.includes("test_temam")
    ? primaryUrl.replace("test_temam", "tamamgatemanarah_portal")
    : null;

  if (secondaryUrl) {
    try {
      await syncTargetDb(secondaryUrl, "Secondary Database (tamamgatemanarah_portal)");
    } catch (e: any) {
      console.warn(`\n⚠️ Note: Could not sync secondary database: ${e.message}`);
    }
  }

  console.log(`\n🎉 All database updates and permissions applied successfully!`);
}

main().catch((err) => {
  console.error("❌ Error running migration script:", err);
  process.exit(1);
});
