import dotenv from "dotenv";
dotenv.config();

import { getDb } from "../server/db";
import { users, userRoleAssignments, rolePermissions, roles, permissions } from "../drizzle/schema";
import { eq, inArray } from "drizzle-orm";

const PERMISSION_EXPANSION: Record<string, string[]> = {
  staff_management: [
    "permissions.view", "permissions.create", "permissions.edit", "permissions.delete",
    "users.view", "users.edit", "users.create", "users.delete",
  ],
  mosques: ["mosques.view", "mosques.create", "mosques.edit", "mosques.delete", "mosques.approve"],
  mosques_map: ["mosque_map.view"],
  requests: ["requests.view", "requests.create", "requests.edit", "requests.delete", "requests.view_details"],
  "requests.view": ["requests.view"],
  "requests.create": ["requests.create"],
  "requests.view_details": ["requests.view", "requests.edit", "requests.delete", "requests.view_details"],
  appointments_calendar: ["field_visits.view", "appointments.view"],
  projects: ["projects.view", "projects.view_details"],
  "projects.view": ["projects.view"],
  "projects.view_details": ["projects.view", "projects.view_details"],
  service_requester_accounts: ["users.view", "users.edit"],
  suppliers: [
    "suppliers.view", "suppliers.create", "suppliers.edit", "suppliers.delete", 
    "suppliers.approve", "suppliers.reject", "suppliers.suspend"
  ],
  quotations: ["quotations.view", "quotations.create", "quotations.edit", "quotations.approve"],
  financial_approval: ["financial.view", "financial.approve", "financial.reject"],
  contracts: ["contracts.view", "contracts.create", "contracts.edit", "contracts.delete", "contracts.approve"],
  disbursement_requests: ["disbursements.view", "disbursements.create", "disbursements.edit", "disbursements.approve"],
  disbursement_orders: ["disbursements.view", "disbursements.create", "disbursements.approve"],
  progress_reports: ["reports.view", "reports.create"],
  financial_report: ["reports.view"],
  settings_center: ["settings.view", "settings.edit"],
  programs_services: ["settings.view", "settings.edit"],
  corporate_comm: ["requests.view", "reports.view", "settings.view"],
  field_visits: ["field_visits.view", "field_visits.create", "field_visits.edit", "field_visits.delete"],
};

async function main() {
  const db = await getDb();
  if (!db) {
    console.error("Database not available");
    process.exit(1);
  }

  const userId = 56;
  console.log(`=== Tracing permissions for User ${userId} ===`);

  // Step 1: Base Role
  const [userData] = await db
    .select({ role: users.role })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  console.log("Base Role:", userData?.role);

  // Step 2: Role IDs
  const userRolesData = await db
    .select({ roleId: userRoleAssignments.roleId })
    .from(userRoleAssignments)
    .where(eq(userRoleAssignments.userId, userId));
  const roleIds = userRolesData.map(r => r.roleId);
  if (userData?.role) {
    roleIds.push(userData.role);
  }
  console.log("All Role IDs for User:", roleIds);

  // Step 3: Role Permissions from DB
  let rolePermissionsData: string[] = [];
  if (roleIds.length > 0) {
    const rolePermsResult = await db
      .select({ permissionId: rolePermissions.permissionId })
      .from(rolePermissions)
      .where(inArray(rolePermissions.roleId, roleIds));
    console.log("Direct role permissions from rolePermissions table:", rolePermsResult.map(p => p.permissionId));
    rolePermissionsData.push(...rolePermsResult.map(rp => rp.permissionId));

    const rolesData = await db
      .select({ id: roles.id, description: roles.description })
      .from(roles)
      .where(inArray(roles.id, roleIds));
    for (const r of rolesData) {
      console.log(`Role ${r.id} description:`, r.description);
      if (r.description) {
        try {
          const parsed = JSON.parse(r.description);
          if (Array.isArray(parsed)) {
            console.log(`- Adding from description JSON:`, parsed);
            rolePermissionsData.push(...parsed);
          }
        } catch {}
      }
    }
  }

  // Step 4: Expand
  const allPermissions = new Set<string>();
  rolePermissionsData.forEach(p => allPermissions.add(p));
  
  console.log("Unique permissions set before expansion:", Array.from(allPermissions));

  const permissionsToExpand = Array.from(allPermissions);
  for (const perm of permissionsToExpand) {
    const expanded = PERMISSION_EXPANSION[perm];
    if (expanded) {
      console.log(`-> Expanding "${perm}" to:`, expanded);
      expanded.forEach((sub: string) => allPermissions.add(sub));
    }
  }

  console.log("Unique permissions set after expansion:", Array.from(allPermissions));

  // Step 5: Compat flags
  if (allPermissions.has("mosques.view")) allPermissions.add("mosques");
  if (allPermissions.has("disbursement_orders.view")) allPermissions.add("disbursement_orders.view_details");
  if (allPermissions.has("mosque_map.view")) {
    allPermissions.add("mosque_map");
    allPermissions.add("mosques_map");
  }
  if (allPermissions.has("appointments.view") || allPermissions.has("appointments.view_all") || allPermissions.has("appointments.view_own")) {
    allPermissions.add("appointments");
    allPermissions.add("appointments_calendar");
  }
  if (allPermissions.has("projects.view")) allPermissions.add("projects");
  if (allPermissions.has("users.view") || allPermissions.has("requesters.view") || allPermissions.has("requesters.approve")) {
    allPermissions.add("requesters");
    allPermissions.add("service_requester_accounts");
  }
  if (
    allPermissions.has("users.view") ||
    allPermissions.has("staff_users.view") ||
    allPermissions.has("staff_roles.view") ||
    allPermissions.has("staff_custom_roles.view")
  ) {
    allPermissions.add("staff");
    allPermissions.add("staff_management");
  }
  if (allPermissions.has("suppliers.view") || allPermissions.has("suppliers.view_details") || allPermissions.has("suppliers.add") || allPermissions.has("suppliers.edit") || allPermissions.has("suppliers.approve")) {
    allPermissions.add("suppliers");
  }
  if (allPermissions.has("quotations.view")) allPermissions.add("quotations");
  if (allPermissions.has("financial.view")) allPermissions.add("financial_approval");

  console.log("Compat additions check. Has requests.view?", allPermissions.has("requests.view"));
  
  process.exit(0);
}

main().catch(console.error);
