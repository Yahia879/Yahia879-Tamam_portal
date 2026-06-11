import "dotenv/config";
import { getDb } from "../server/db.js";
import { users, roles } from "../drizzle/schema.js";
import { isNull } from "drizzle-orm";

async function main() {
  const db = await getDb();
  if (!db) {
    console.error("No database connection");
    process.exit(1);
  }

  try {
    console.log("--- Querying all users with their notification settings ---");
    const allUsers = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        phone: users.phone,
        role: users.role,
        status: users.status,
        receiveRequestNotifications: users.receiveRequestNotifications,
        receiveRequestEmail: users.receiveRequestEmail,
        receiveBeneficiaryNotifications: users.receiveBeneficiaryNotifications,
        receiveBeneficiaryEmail: users.receiveBeneficiaryEmail,
      })
      .from(users)
      .where(isNull(users.deletedAt));

    console.log(`Found ${allUsers.length} active users.`);
    console.log(JSON.stringify(allUsers, null, 2));

    console.log("\n--- Querying all roles and their notification settings ---");
    const allRoles = await db.select().from(roles);
    console.log(JSON.stringify(allRoles, null, 2));
  } catch (err) {
    console.error("Error executing query:", err);
  }
  process.exit(0);
}

main();
