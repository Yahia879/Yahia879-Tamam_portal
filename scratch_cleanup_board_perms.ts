import "dotenv/config";
import { getDb } from "./server/db";
import { rolePermissions, userPermissions, users } from "./drizzle/schema";
import { eq, and } from "drizzle-orm";

async function main() {
  const db = await getDb();
  if (!db) {
    console.error("DB connection failed");
    process.exit(1);
  }

  // 1. Delete board_member from role_permissions where roleId = 'board_chairman'
  const deletedRolePerms = await db.delete(rolePermissions).where(
    and(
      eq(rolePermissions.roleId, "board_chairman"),
      eq(rolePermissions.permissionId, "board_member")
    )
  );
  console.log("Deleted old board_member role permission for board_chairman");

  // 2. Find all users with role 'board_chairman'
  const chairmanUsers = await db.select({ id: users.id, name: users.name })
    .from(users)
    .where(eq(users.role, "board_chairman" as any));

  console.log(`Found ${chairmanUsers.length} chairman users:`, chairmanUsers);

  for (const u of chairmanUsers) {
    // Delete direct board_member permission if exists
    await db.delete(userPermissions).where(
      and(
        eq(userPermissions.userId, u.id),
        eq(userPermissions.permissionId, "board_member")
      )
    );
  }

  console.log("Cleanup completed successfully!");
  process.exit(0);
}

main().catch(err => {
  console.error("Error in cleanup:", err);
  process.exit(1);
});
