import "dotenv/config";
import { getDb } from "../server/db";
import { users, roles as rolesTable } from "../drizzle/schema";
import { eq } from "drizzle-orm";

async function run() {
  const db = await getDb();
  if (!db) {
    console.error("Failed to connect to DB");
    return;
  }

  const roleSetting = await db
    .select()
    .from(rolesTable)
    .where(eq(rolesTable.id, "corporate_comm"))
    .limit(1);

  console.log("Role settings for 'corporate_comm':", roleSetting[0]);

  const corporateUsers = await db
    .select()
    .from(users)
    .where(eq(users.role, "corporate_comm"));

  console.log("Users with role 'corporate_comm':", corporateUsers.map(u => ({
    id: u.id,
    name: u.name,
    email: u.email,
    receiveRequestNotifications: u.receiveRequestNotifications,
    receiveRequestEmail: u.receiveRequestEmail,
  })));

  process.exit(0);
}

run().catch(console.error);
