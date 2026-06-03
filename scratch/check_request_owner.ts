import dotenv from "dotenv";
dotenv.config();

import { getDb } from "../server/db";
import { mosqueRequests, users } from "../drizzle/schema";
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
        id: mosqueRequests.id,
        requestNumber: mosqueRequests.requestNumber,
        userId: mosqueRequests.userId,
        userName: users.name,
        userRole: users.role,
      })
      .from(mosqueRequests)
      .leftJoin(users, eq(mosqueRequests.userId, users.id))
      .limit(100);

    console.log("Found requests:");
    for (const item of list) {
      console.log(`Request ID: ${item.id} | Number: ${item.requestNumber} | Owner UserID: ${item.userId} | Name: ${item.userName} | Role: ${item.userRole}`);
    }
  } catch (err) {
    console.error("DB error:", err);
  }
  process.exit(0);
}

main();
