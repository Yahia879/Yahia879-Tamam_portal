import dotenv from "dotenv";
dotenv.config();

import { getDb } from "../server/db";
import { notifications, users } from "../drizzle/schema";
import { eq } from "drizzle-orm";

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
        type: notifications.type,
        createdAt: notifications.createdAt,
      })
      .from(notifications)
      .leftJoin(users, eq(notifications.userId, users.id))
      .limit(100);

    console.log("Found notifications count:", list.length);
    for (const item of list) {
      console.log(`\nID: ${item.id} | UserID: ${item.userId} | Role: ${item.userRole} | Name: ${item.userName}`);
      console.log(`Title: ${item.title}`);
      console.log(`Message: ${item.message}`);
    }
  } catch (err) {
    console.error("DB error:", err);
  }
  process.exit(0);
}

main();
