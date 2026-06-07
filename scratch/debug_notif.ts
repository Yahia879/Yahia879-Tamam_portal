import "dotenv/config";
import { getDb } from "../server/db";
import { users, roles as rolesTable } from "../drizzle/schema";
import { eq, and, or, isNull } from "drizzle-orm";

async function main() {
  const db = await getDb();
  if (!db) return;

  const candidateUsers = await db
    .select({ 
      id: users.id, 
      name: users.name, 
      role: users.role, 
      userSetting: users.receiveBeneficiaryNotifications,
      roleSetting: rolesTable.receiveBeneficiaryNotifications
    })
    .from(users)
    .leftJoin(rolesTable, eq(users.role, rolesTable.id))
    .where(
      and(
        isNull(users.deletedAt),
        or(
          eq(users.receiveBeneficiaryNotifications, true),
          eq(rolesTable.receiveBeneficiaryNotifications, true)
        )
      )
    );

  console.log("Candidate Users for Beneficiary Notifications:", candidateUsers);
}

main().catch(console.error);
