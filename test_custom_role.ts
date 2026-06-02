import 'dotenv/config';
import { getDb } from './server/db';
import { roles, rolePermissions, permissions } from './drizzle/schema';
import { eq, inArray } from 'drizzle-orm';

(async () => {
  const db = await getDb();
  if (!db) { console.log("No DB"); process.exit(1); }
  
  const testRoleId = `custom_role_test_${Date.now()}`;
  console.log("Creating test custom role:", testRoleId);
  
  // Create role
  const testPerms = ["staff_users.view", "staff_users.add", "staff_custom_roles.view", "staff_custom_roles.add"];
  await db.insert(roles).values({
    id: testRoleId,
    nameAr: "دور مخصص تجريبي",
    nameEn: "Test Custom Role",
    description: JSON.stringify(testPerms),
    isSystem: false
  });
  
  // Link permissions
  const existingPerms = await db.select({ id: permissions.id }).from(permissions)
    .where(inArray(permissions.id, testPerms));
  const validPermIds = existingPerms.map(p => p.id);
  console.log("Valid permissions found in DB permissions table:", validPermIds);
  
  if (validPermIds.length > 0) {
    await db.insert(rolePermissions).values(
      validPermIds.map(permId => ({
        roleId: testRoleId,
        permissionId: permId
      }))
    );
  }
  
  console.log("\n=== Verifying saved permissions for custom role via query ===");
  // Query role permissions
  const rolePerms = await db
    .select({ permissionId: rolePermissions.permissionId })
    .from(rolePermissions)
    .where(eq(rolePermissions.roleId, testRoleId));

  const permsSet = new Set(rolePerms.map(rp => rp.permissionId));

  const [roleData] = await db
    .select({ description: roles.description })
    .from(roles)
    .where(eq(roles.id, testRoleId))
    .limit(1);

  if (roleData?.description) {
    try {
      const parsed = JSON.parse(roleData.description);
      if (Array.isArray(parsed)) {
        parsed.forEach(p => permsSet.add(p));
      }
    } catch (e) {
      console.error("JSON parsing error:", e);
    }
  }

  const finalResult = Array.from(permsSet);
  console.log("Retrieved permissions for custom role:", finalResult);

  // Clean up
  console.log("\nCleaning up test custom role...");
  await db.delete(rolePermissions).where(eq(rolePermissions.roleId, testRoleId));
  await db.delete(roles).where(eq(roles.id, testRoleId));
  console.log("Cleanup complete.");
  process.exit(0);
})();
