import "dotenv/config";
import { getDb } from "../server/db";
import { users } from "../drizzle/schema";
import { eq, like } from "drizzle-orm";

async function run() {
  const db = await getDb();
  if (!db) {
    console.error("Failed to connect to DB");
    return;
  }

  const foundUsers = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      receiveRequestNotifications: users.receiveRequestNotifications,
      receiveRequestEmail: users.receiveRequestEmail,
      deletedAt: users.deletedAt
    })
    .from(users)
    .where(like(users.email, "%hamoud%"));

  console.log("Users matching 'hamoud':", foundUsers);
  process.exit(0);
}

run().catch(console.error);
