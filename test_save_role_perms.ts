import 'dotenv/config';
import { getDb } from './server/db';
import { roles, rolePermissions, permissions } from './drizzle/schema';
import { eq, inArray } from 'drizzle-orm';

(async () => {
  const db = await getDb();
  if (!db) { console.log("No DB"); process.exit(1); }
  
  const testRoleId = "projects_office";
  
  // Clear any existing permissions
  console.log("Clearing permissions for role:", testRoleId);
  await db.delete(rolePermissions).where(eq(rolePermissions.roleId, testRoleId));
  
  // Set description
  const testPerms = ["staff_users.view", "staff_users.add", "staff_custom_roles.view", "staff_custom_roles.add"];
  console.log("Updating role description/JSON with perms:", testPerms);
  await db.update(roles).set({ description: JSON.stringify(testPerms) }).where(eq(roles.id, testRoleId));
  
  // Insert into role_permissions table
  console.log("Inserting permissions into role_permissions table...");
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
  
  console.log("\n=== Verifying saved permissions via query ===");
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
  console.log("Retrieved permissions:", finalResult);

  // Restore default projects_office permissions to be safe
  console.log("\nRestoring default permissions for projects_office...");
  const defaultMappings = ["requests", "mosques", "projects", "reports", "suppliers", "quotations", "contracts", "disbursements", "field_visits"];
  const allPermissions = await db.select({ id: permissions.id }).from(permissions);
  const allPermIds = allPermissions.map(p => p.id);
  const targetPermIds = allPermIds.filter(pId =>
    defaultMappings.some((key: string) => pId === key || pId.startsWith(key + "."))
  );
  
  await db.delete(rolePermissions).where(eq(rolePermissions.roleId, testRoleId));
  await db.update(roles).set({ description: null }).where(eq(roles.id, testRoleId));
  if (targetPermIds.length > 0) {
    await db.insert(rolePermissions).values(
      targetPermIds.map(permId => ({
        roleId: testRoleId,
        permissionId: permId
      }))
    );
  }
  console.log("Restoration complete.");
  process.exit(0);
})();
