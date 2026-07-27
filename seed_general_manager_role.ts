import "dotenv/config";
import { getDb } from "./server/db";
import { roles, rolePermissions, permissions } from "./drizzle/schema";
import { eq } from "drizzle-orm";

const GM_UI_PERMISSIONS = [
  "mosques.view",
  "mosques.create",
  "mosques.edit",
  "mosques.delete",
  "mosques.approve",
  "mosque_map.view",
  "requests.view",
  "requests.create",
  "requests.view_details",
  "appointments.view_all",
  "projects.view",
  "projects.view_details",
  "progress_reports.view",
  "progress_reports.add",
  "progress_reports.edit",
  "progress_reports.approve",
  "reports.view_stats",
  "reports.export_data",
  "suppliers.view",
  "suppliers.view_details",
  "suppliers.approve",
  "quotations.view",
  "quotations.approve",
  "financial_approval.view",
  "financial_approval.approve",
  "contracts.view",
  "disbursements.view",
  "disbursements.approve",
  "disbursements.sign",
  "signing.disbursements_sign",
  "disbursement_orders.view",
  "disbursement_orders.approve",
  "disbursement_orders.reject",
  "Create_Ticket",
  "requesters.view",
  "requesters.approve"
];

const PERMISSION_EXPANSION: Record<string, string[]> = {
  "mosques.view": ["mosques.view"],
  "mosques.create": ["mosques.create"],
  "mosques.edit": ["mosques.edit"],
  "mosques.delete": ["mosques.delete"],
  "mosques.approve": ["mosques.approve"],
  "mosque_map.view": ["mosque_map.view"],
  "requests.view": ["requests.view"],
  "requests.create": ["requests.create"],
  "requests.view_details": ["requests.view", "requests.edit", "requests.delete", "requests.view_details"],
  "appointments.view_all": ["field_visits.view"],
  "projects.view": ["projects.view"],
  "projects.view_details": ["projects.view", "projects.view_details"],
  "progress_reports.view": ["progress_reports.view"],
  "progress_reports.add": ["progress_reports.add"],
  "progress_reports.edit": ["progress_reports.edit"],
  "progress_reports.approve": ["progress_reports.approve"],
  "reports.view_stats": ["reports.view_stats", "reports.view"],
  "reports.export_data": ["reports.export_data", "reports.view"],
  "suppliers.view": ["suppliers.view"],
  "suppliers.view_details": ["suppliers.view"],
  "suppliers.approve": ["suppliers.approve", "suppliers.reject"],
  "quotations.view": ["quotations.view"],
  "quotations.approve": ["quotations.approve"],
  "financial_approval.view": ["financial.view"],
  "financial_approval.approve": ["financial.approve"],
  "contracts.view": ["contracts.view"],
  "disbursements.view": ["disbursements.view"],
  "disbursements.approve": ["disbursements.approve"],
  "disbursements.sign": ["disbursements.sign"],
  "signing.disbursements_sign": ["disbursements.sign"],
  "disbursement_orders.view": ["disbursement_orders.view_details"],
  "disbursement_orders.approve": ["financial.approve"],
  "disbursement_orders.reject": ["financial.approve"],
  "Create_Ticket": ["Create_Ticket"],
  "requesters.view": ["users.view"],
  "requesters.approve": ["users.edit"]
};

async function seedGeneralManagerRole() {
  const db = await getDb();
  if (!db) {
    console.error("No database connection");
    process.exit(1);
  }

  console.log("Seeding General Manager role...");

  const roleId = "general_manager";
  const [existingRole] = await db.select().from(roles).where(eq(roles.id, roleId)).limit(1);

  const roleData = {
    id: roleId,
    nameAr: "المدير التنفيذي",
    nameEn: "Executive Director",
    description: JSON.stringify(GM_UI_PERMISSIONS),
    isSystem: true,
    isActive: true,
  };

  if (!existingRole) {
    await db.insert(roles).values(roleData);
    console.log("Created base role 'general_manager' (المدير التنفيذي)");
  } else {
    await db.update(roles).set(roleData).where(eq(roles.id, roleId));
    console.log("Updated base role 'general_manager' (المدير التنفيذي)");
  }

  // Also upsert 'executive_director' for backwards compatibility if needed
  const [execRole] = await db.select().from(roles).where(eq(roles.id, "executive_director")).limit(1);
  const execRoleData = {
    id: "executive_director",
    nameAr: "المدير التنفيذي",
    nameEn: "Executive Director",
    description: JSON.stringify(GM_UI_PERMISSIONS),
    isSystem: true,
    isActive: true,
  };
  if (!execRole) {
    await db.insert(roles).values(execRoleData);
  } else {
    await db.update(roles).set(execRoleData).where(eq(roles.id, "executive_director"));
  }

  // Clear existing role_permissions for general_manager and executive_director
  await db.delete(rolePermissions).where(eq(rolePermissions.roleId, roleId));
  await db.delete(rolePermissions).where(eq(rolePermissions.roleId, "executive_director"));

  // Calculate expanded permissions
  const granularPerms = new Set<string>();
  for (const uiKey of GM_UI_PERMISSIONS) {
    const expanded = PERMISSION_EXPANSION[uiKey] || [uiKey];
    for (const p of expanded) {
      granularPerms.add(p);
    }
  }

  // Ensure all granular permissions exist in DB and assign to role_permissions
  const allExistingPerms = await db.select({ id: permissions.id }).from(permissions);
  const existingPermIds = new Set(allExistingPerms.map(p => p.id));

  for (const permId of Array.from(granularPerms)) {
    if (existingPermIds.has(permId)) {
      await db.insert(rolePermissions).values({
        roleId: roleId,
        permissionId: permId
      }).catch(() => {});

      await db.insert(rolePermissions).values({
        roleId: "executive_director",
        permissionId: permId
      }).catch(() => {});
    }
  }

  console.log("Role permissions assigned successfully for General Manager!");
  process.exit(0);
}

seedGeneralManagerRole();
