import "dotenv/config";
import { getDb } from "./server/db";
import { rolePermissions } from "./drizzle/schema";
import { and, eq, inArray, like, ne } from "drizzle-orm";

async function main() {
  const db = await getDb();
  if (!db) {
    console.error("DB connection failed");
    process.exit(1);
  }

  // Delete all orders_and_letters permissions from any role other than 'financial'
  const result = await db.delete(rolePermissions).where(
    and(
      like(rolePermissions.permissionId, "orders_and_letters%"),
      ne(rolePermissions.roleId, "financial")
    )
  );

  console.log("Deleted orders_and_letters permissions from all roles except 'financial'");

  // Verify what remains
  const remaining = await db.select().from(rolePermissions).where(
    like(rolePermissions.permissionId, "orders_and_letters%")
  );
  console.log("Remaining orders_and_letters rolePermissions:", remaining);

  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
