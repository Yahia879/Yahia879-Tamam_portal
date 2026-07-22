import "dotenv/config";
import { getDb } from "./server/db";
import { permissions, roles, rolePermissions, users, userPermissions } from "./drizzle/schema";
import { eq, and, or } from "drizzle-orm";

async function main() {
  console.log("Starting seed script for contracts.edit_approved permission...");
  
  const db = await getDb();
  if (!db) {
    console.error("Database connection failed. Make sure DATABASE_URL is set in .env");
    process.exit(1);
  }

  // 1. Ensure permission 'contracts.edit_approved' exists in permissions table
  const existingPerm = await db
    .select({ id: permissions.id })
    .from(permissions)
    .where(eq(permissions.id, "contracts.edit_approved"))
    .limit(1);

  if (existingPerm.length === 0) {
    await db.insert(permissions).values({
      id: "contracts.edit_approved",
      moduleId: "contracts",
      action: "edit_approved",
      nameAr: "تعديل العقود المعتمدة",
      nameEn: "Edit Approved Contracts",
      description: "صلاحية تعديل بيانات وبنود العقود المعتمدة",
    });
    console.log("✓ Inserted permission 'contracts.edit_approved' into permissions table.");
  } else {
    console.log("ℹ Permission 'contracts.edit_approved' already exists in permissions table.");
  }

  // 2. Grant to super_admin and system_admin roles in role_permissions table
  const adminRoleIds = ["super_admin", "system_admin"];
  for (const roleId of adminRoleIds) {
    // Check if role exists in roles table
    const [existingRole] = await db
      .select({ id: roles.id })
      .from(roles)
      .where(eq(roles.id, roleId))
      .limit(1);

    if (existingRole) {
      const existingRolePerm = await db
        .select({ id: rolePermissions.id })
        .from(rolePermissions)
        .where(
          and(
            eq(rolePermissions.roleId, roleId),
            eq(rolePermissions.permissionId, "contracts.edit_approved")
          )
        )
        .limit(1);

      if (existingRolePerm.length === 0) {
        await db.insert(rolePermissions).values({
          roleId,
          permissionId: "contracts.edit_approved",
        });
        console.log(`✓ Granted 'contracts.edit_approved' to role '${roleId}' in role_permissions.`);
      } else {
        console.log(`ℹ Role '${roleId}' already has 'contracts.edit_approved'.`);
      }
    }
  }

  // 3. Grant to all super_admin and system_admin users in user_permissions table
  const adminUsers = await db
    .select({ id: users.id, name: users.name, role: users.role })
    .from(users)
    .where(or(eq(users.role, "super_admin"), eq(users.role, "system_admin")));

  console.log(`Found ${adminUsers.length} admin user(s). Processing user permissions...`);

  for (const adminUser of adminUsers) {
    const existingUserPerm = await db
      .select({ id: userPermissions.id })
      .from(userPermissions)
      .where(
        and(
          eq(userPermissions.userId, adminUser.id),
          eq(userPermissions.permissionId, "contracts.edit_approved")
        )
      )
      .limit(1);

    if (existingUserPerm.length === 0) {
      await db.insert(userPermissions).values({
        userId: adminUser.id,
        permissionId: "contracts.edit_approved",
        granted: true,
        grantedBy: adminUser.id,
        reason: "إضافة صلاحية تعديل العقود المعتمدة تلقائياً للمدراء",
      });
      console.log(`✓ Granted 'contracts.edit_approved' to user #${adminUser.id} (${adminUser.name}).`);
    } else {
      // Ensure it is granted: true if it was revoked or false
      await db
        .update(userPermissions)
        .set({ granted: true })
        .where(
          and(
            eq(userPermissions.userId, adminUser.id),
            eq(userPermissions.permissionId, "contracts.edit_approved")
          )
        );
      console.log(`ℹ User #${adminUser.id} (${adminUser.name}) updated with granted: true.`);
    }
  }

  console.log("\n=======================================================");
  console.log("🎉 Seed process completed successfully!");
  console.log("Permission 'contracts.edit_approved' is ready and active for super_admin & system_admin.");
  console.log("=======================================================\n");

  process.exit(0);
}

main().catch((err) => {
  console.error("❌ Error running seed script:", err);
  process.exit(1);
});
