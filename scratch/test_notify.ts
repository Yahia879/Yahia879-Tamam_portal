import 'dotenv/config';
import { getDb } from '../server/db';
import { notifyRequestCreation } from '../server/routers/notifications';
import { notifications } from '../drizzle/schema';
import { like } from 'drizzle-orm';

(async () => {
  const db = await getDb();
  if (!db) { console.log("No DB"); process.exit(1); }

  console.log("=== Calling notifyRequestCreation ===");
  await notifyRequestCreation(152, 'REQ-2026-DAA-0140-TEST', 1);

  console.log("=== Checking notifications created with '-TEST' ===");
  const testNotifications = await db
    .select()
    .from(notifications)
    .where(like(notifications.message, '%-TEST%'));
  
  console.log("Notified User IDs:");
  console.log(testNotifications.map(n => ({ id: n.id, userId: n.userId, title: n.title, message: n.message })));

  // Clean up
  await db.delete(notifications).where(like(notifications.message, '%-TEST%'));
  console.log("Cleaned up test notifications.");

  process.exit(0);
})();
