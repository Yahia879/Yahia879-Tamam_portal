import "dotenv/config";
import { getDb } from "../server/db";
import { users, userRoleAssignments, userPermissions, rolePermissions, roles } from "../drizzle/schema";
import { calculateUserPermissions } from "../server/permissions";
import { eq } from "drizzle-orm";

async function main() {
  const db = await getDb();
  if (!db) {
    console.error("Database connection failed");
    return;
  }
  
  const userId = 8;
  
  // Find user details
  const [userData] = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
    
  if (!userData) {
    console.error(`User with ID ${userId} not found`);
    return;
  }
  
  console.log("User 8 Details:");
  console.log(" - Name:", userData.name);
  console.log(" - Email:", userData.email);
  console.log(" - Primary Role in users table:", userData.role);
  console.log(" - Status:", userData.status);
  
  // Custom role assignments
  const rolesAssigned = await db
    .select()
    .from(userRoleAssignments)
    .where(eq(userRoleAssignments.userId, userId));
  console.log("\nAssigned Roles (userRoleAssignments):", rolesAssigned);
  
  // Direct user permissions
  const directPerms = await db
    .select()
    .from(userPermissions)
    .where(eq(userPermissions.userId, userId));
  console.log("\nDirect Permissions (userPermissions):", directPerms);
  
  // Let's run the logic of getUserRolePermissions for User 8 manually to see the exact role IDs and set
  const roleIds = rolesAssigned.map(r => r.roleId);
  const hasCustomRole = roleIds.some(r => r.startsWith("custom_role_"));
  if (userData.role && !hasCustomRole && !roleIds.includes(userData.role)) {
    roleIds.push(userData.role);
  }
  console.log("\nEffective Role IDs:", roleIds);
  
  // Query rolePermissions for these roles
  if (roleIds.length > 0) {
    const rolePermsResult = await db
      .select()
      .from(rolePermissions)
      .where(eq(rolePermissions.roleId, userData.role));
    console.log("\nrolePermissions rows for primary role:", rolePermsResult);
    
    const [roleMeta] = await db
      .select()
      .from(roles)
      .where(eq(roles.id, userData.role));
    console.log("\nRole metadata (roles table):", roleMeta);
  }
  
  // Calculated permissions
  const calculated = await calculateUserPermissions(userId);
  console.log("\nCalculated final permissions contains requests.upload_final_report?", calculated.includes("requests.upload_final_report"));
  console.log("Calculated final permissions contains requests.manage_as_field_team?", calculated.includes("requests.manage_as_field_team"));
  console.log("Calculated final permissions contains requests.manage_as_quick_response?", calculated.includes("requests.manage_as_quick_response"));
}

main().catch(console.error);
