import 'dotenv/config';
import { getDb } from '../server/db';
import { permissionsAuditLog } from '../drizzle/schema';
import { eq, desc } from 'drizzle-orm';

(async () => {
  const db = await getDb();
  if (!db) { console.log("No DB"); process.exit(1); }

  console.log("=== Checking Permissions Audit Log for quick_response role ===");
  const auditLogsList = await db
    .select()
    .from(permissionsAuditLog)
    .where(eq(permissionsAuditLog.targetRoleId, 'quick_response'))
    .orderBy(desc(permissionsAuditLog.createdAt));
  
  console.log(JSON.stringify(auditLogsList, null, 2));

  process.exit(0);
})();
