import "dotenv/config";
import { getDb } from "./server/db";
import { notifications } from "./drizzle/schema";
import { eq, desc } from "drizzle-orm";

async function run() {
  const db = await getDb();
  if (!db) return;
  const notifs = await db.select().from(notifications).where(eq(notifications.userId, 68)).orderBy(desc(notifications.createdAt)).limit(10);
  console.log('Notifications for 68:', notifs);
  process.exit(0);
}
run();
