import dotenv from "dotenv";
dotenv.config();

import { getDb } from "../server/db";
import { notifications, users } from "../drizzle/schema";
import { desc } from "drizzle-orm";

async function main() {
  const db = await getDb();
  if (!db) {
    console.error("No DB connection");
    process.exit(1);
  }

  try {
    const list = await db
      .select({
        id: notifications.id,
        userId: notifications.userId,
        userName: users.name,
        userRole: users.role,
        title: notifications.title,
        message: notifications.message,
        createdAt: notifications.createdAt,
      })
      .from(notifications)
      .leftJoin(users, eq(notifications.userId, users.id))
      .orderBy(desc(notifications.id))
      .limit(30);

    console.log("LAST 30 NOTIFICATIONS:");
    console.log(JSON.stringify(list, null, 2));
  } catch (err) {
    console.error("Error querying notifications:", err);
  }
  process.exit(0);
}

import { eq } from "drizzle-orm";
main();
