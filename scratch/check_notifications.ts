import dotenv from "dotenv";
dotenv.config();

import { getDb } from "../server/db";
import { notifications } from "../drizzle/schema";
import { eq } from "drizzle-orm";

async function run() {
  const db = await getDb();
  if (!db) {
    console.error("DB connection failed");
    return;
  }
  const list = await db.select().from(notifications).where(eq(notifications.userId, 68));
  console.log("User 68 Notifications count:", list.length);
  console.log("Notifications:", JSON.stringify(list, null, 2));
}

run().catch(console.error);
