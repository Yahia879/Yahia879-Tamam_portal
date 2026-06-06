import 'dotenv/config';
import { getDb } from '../server/db';
import { mosqueRequests, notifications } from '../drizzle/schema';
import { desc, eq, and } from 'drizzle-orm';

(async () => {
  const db = await getDb();
  if (!db) { console.log("No DB"); process.exit(1); }

  console.log("=== Checking recent requests ===");
  const recentReqs = await db
    .select({ id: mosqueRequests.id, requestNumber: mosqueRequests.requestNumber, createdAt: mosqueRequests.createdAt })
    .from(mosqueRequests)
    .orderBy(desc(mosqueRequests.createdAt))
    .limit(10);
  
  console.log("Recent requests:");
  console.log(JSON.stringify(recentReqs, null, 2));

  for (const req of recentReqs) {
    const reqNotifs = await db
      .select({ id: notifications.id, userId: notifications.userId, title: notifications.title, message: notifications.message })
      .from(notifications)
      .where(and(eq(notifications.relatedId, req.id), eq(notifications.userId, 68)));
    
    console.log(`Notifications for user 68 for request ${req.requestNumber} (ID: ${req.id}):`, reqNotifs);
  }

  process.exit(0);
})();
