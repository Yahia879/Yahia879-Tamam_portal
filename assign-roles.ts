import { getDb } from "./server/db";
import { sql } from "drizzle-orm";

async function main() {
  const db = await getDb();
  
  // 1. التحقق من الجداول الموجودة
  console.log("=== التحقق من الجداول ===");
  const tables = await db.execute(sql`
    SELECT TABLE_NAME 
    FROM information_schema.TABLES 
    WHERE TABLE_SCHEMA = DATABASE() 
    AND (TABLE_NAME LIKE '%role%' OR TABLE_NAME LIKE '%permission%')
  `);
  console.log("الجداول الموجودة:", tables.rows);
  
  // 2. عرض المستخدمين التجريبيين
  console.log("\n=== المستخدمون التجريبيون ===");
  const users = await db.execute(sql`
    SELECT id, name, email, role 
    FROM users 
    WHERE name IN ('أحمد محمد', 'خالد عبدالله', 'فاطمة أحمد', 'محمد سعيد')
  `);
  console.log("المستخدمون:", users.rows);
  
  // 3. عرض الأدوار المتاحة
  console.log("\n=== الأدوار المتاحة ===");
  const roles = await db.execute(sql`SELECT id, code, nameAr FROM roles`);
  console.log("الأدوار:", roles.rows);
  
  process.exit(0);
}

main().catch(console.error);
