import mysql from "mysql2/promise";
import * as dotenv from "dotenv";

dotenv.config();

const MODULES = [
  { id: "information_dashboard", nameAr: "لوحة المعلومات", nameEn: "Information Dashboard" },
  { id: "requester_accounts", nameAr: "حسابات المستفيدين", nameEn: "Requester Accounts" },
  { id: "requester_exceptions", nameAr: "استثناءات المستفيدين", nameEn: "Requester Exceptions" },
  { id: "requester_donations", nameAr: "تبرعات المستفيدين", nameEn: "Requester Donations" },
  { id: "requester_inquiries", nameAr: "استفسارات المستفيدين", nameEn: "Requester Inquiries" },
  { id: "requester_sedana", nameAr: "طلبات سدانة", nameEn: "Sedana Requests" },
];

const PERMISSIONS = [
  { id: "information_dashboard.view", nameAr: "عرض لوحة المعلومات", nameEn: "View Information Dashboard", moduleId: "information_dashboard", action: "view" },
  { id: "requester_accounts.view", nameAr: "عرض حسابات المستفيدين", nameEn: "View Requester Accounts", moduleId: "requester_accounts", action: "view" },
  { id: "requester_accounts.create", nameAr: "إضافة حساب مستفيد", nameEn: "Create Requester Account", moduleId: "requester_accounts", action: "create" },
  { id: "requester_accounts.edit", nameAr: "تعديل حساب مستفيد", nameEn: "Edit Requester Account", moduleId: "requester_accounts", action: "edit" },
  { id: "requester_accounts.delete", nameAr: "حذف حساب مستفيد", nameEn: "Delete Requester Account", moduleId: "requester_accounts", action: "delete" },
  { id: "requester_exceptions.view", nameAr: "عرض استثناءات المستفيدين", nameEn: "View Requester Exceptions", moduleId: "requester_exceptions", action: "view" },
  { id: "requester_exceptions.create", nameAr: "إضافة استثناء مستفيد", nameEn: "Create Requester Exception", moduleId: "requester_exceptions", action: "create" },
  { id: "requester_exceptions.edit", nameAr: "تعديل استثناء مستفيد", nameEn: "Edit Requester Exception", moduleId: "requester_exceptions", action: "edit" },
  { id: "requester_exceptions.delete", nameAr: "حذف استثناء مستفيد", nameEn: "Delete Requester Exception", moduleId: "requester_exceptions", action: "delete" },
  { id: "requester_exceptions.approve", nameAr: "اعتماد استثناء مستفيد", nameEn: "Approve Requester Exception", moduleId: "requester_exceptions", action: "approve" },
  { id: "requester_donations.view", nameAr: "عرض تبرعات المستفيدين", nameEn: "View Requester Donations", moduleId: "requester_donations", action: "view" },
  { id: "requester_donations.create", nameAr: "إضافة تبرع مستفيد", nameEn: "Create Requester Donation", moduleId: "requester_donations", action: "create" },
  { id: "requester_donations.edit", nameAr: "تعديل تبرع مستفيد", nameEn: "Edit Requester Donation", moduleId: "requester_donations", action: "edit" },
  { id: "requester_donations.delete", nameAr: "حذف تبرع مستفيد", nameEn: "Delete Requester Donation", moduleId: "requester_donations", action: "delete" },
  { id: "requester_inquiries.view", nameAr: "عرض استفسارات المستفيدين", nameEn: "View Requester Inquiries", moduleId: "requester_inquiries", action: "view" },
  { id: "requester_inquiries.create", nameAr: "إضافة استفسار مستفيد", nameEn: "Create Requester Inquiry", moduleId: "requester_inquiries", action: "create" },
  { id: "requester_inquiries.edit", nameAr: "تعديل استفسار مستفيد", nameEn: "Edit Requester Inquiry", moduleId: "requester_inquiries", action: "edit" },
  { id: "requester_inquiries.delete", nameAr: "حذف استفسار مستفيد", nameEn: "Delete Requester Inquiry", moduleId: "requester_inquiries", action: "delete" },
  { id: "requester_sedana.view", nameAr: "عرض طلبات سدانة", nameEn: "View Sedana Requests", moduleId: "requester_sedana", action: "view" },
  { id: "requester_sedana.create", nameAr: "إضافة طلب سدانة", nameEn: "Create Sedana Request", moduleId: "requester_sedana", action: "create" },
  { id: "requester_sedana.edit", nameAr: "تعديل طلب سدانة", nameEn: "Edit Sedana Request", moduleId: "requester_sedana", action: "edit" },
  { id: "requester_sedana.delete", nameAr: "حذف طلب سدانة", nameEn: "Delete Sedana Request", moduleId: "requester_sedana", action: "delete" },
  { id: "staff_users.customize", nameAr: "تخصيص صلاحيات المستخدمين", nameEn: "Customize Staff User Permissions", moduleId: "staff_users", action: "customize" },
  { id: "staff_users.suspend", nameAr: "تعطيل حساب مستخدم", nameEn: "Suspend Staff User", moduleId: "staff_users", action: "suspend" },
  { id: "staff_users.activate", nameAr: "تنشيط حساب مستخدم", nameEn: "Activate Staff User", moduleId: "staff_users", action: "activate" },
];

const ROLES_TO_ASSIGN = [
  { roleId: "projects_office", permPrefixes: ["requester_"] },
];

async function sync(dbUrl) {
  const connection = await mysql.createConnection(dbUrl);
  try {
    const [dbNameRows] = await connection.query("SELECT DATABASE() as db");
    const dbName = dbNameRows[0]?.db;
    console.log(`\n🔄 Syncing database: ${dbName}...`);

    for (const mod of MODULES) {
      const [rows] = await connection.query("SELECT id FROM modules WHERE id = ?", [mod.id]);
      if (rows.length === 0) {
        await connection.query(
          "INSERT INTO modules (id, name_ar, name_en) VALUES (?, ?, ?)",
          [mod.id, mod.nameAr, mod.nameEn]
        );
        console.log(`  ➕ Module '${mod.id}' inserted.`);
      } else {
        await connection.query(
          "UPDATE modules SET name_ar = ?, name_en = ? WHERE id = ?",
          [mod.nameAr, mod.nameEn, mod.id]
        );
      }
    }

    for (const perm of PERMISSIONS) {
      const [rows] = await connection.query("SELECT id FROM permissions WHERE id = ?", [perm.id]);
      if (rows.length === 0) {
        await connection.query(
          "INSERT INTO permissions (id, name_ar, name_en, module_id, action) VALUES (?, ?, ?, ?, ?)",
          [perm.id, perm.nameAr, perm.nameEn, perm.moduleId, perm.action]
        );
        console.log(`  ➕ Permission '${perm.id}' inserted.`);
      } else {
        await connection.query(
          "UPDATE permissions SET name_ar = ?, name_en = ?, module_id = ?, action = ? WHERE id = ?",
          [perm.nameAr, perm.nameEn, perm.moduleId, perm.action, perm.id]
        );
      }
    }

    for (const assign of ROLES_TO_ASSIGN) {
      for (const perm of PERMISSIONS) {
        const matches = assign.permPrefixes.some(prefix => perm.id.startsWith(prefix));
        if (!matches) continue;

        const [rows] = await connection.query(
          "SELECT id FROM role_permissions WHERE role_id = ? AND permission_id = ?",
          [assign.roleId, perm.id]
        );
        if (rows.length === 0) {
          await connection.query(
            "INSERT INTO role_permissions (role_id, permission_id) VALUES (?, ?)",
            [assign.roleId, perm.id]
          );
          console.log(`  🔗 Assigned '${perm.id}' to role '${assign.roleId}'.`);
        }
      }
    }

    console.log(`✅ Finished syncing ${dbName}`);
  } finally {
    await connection.end();
  }
}

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("❌ DATABASE_URL is not defined in .env");
    process.exit(1);
  }

  const primaryUrl = process.env.DATABASE_URL;
  await sync(primaryUrl);

  const fallbackUrl = primaryUrl.includes("test_temam")
    ? primaryUrl.replace("test_temam", "tamamgatemanarah_portal")
    : null;

  if (fallbackUrl) {
    try {
      await sync(fallbackUrl);
    } catch (e) {
      console.warn("⚠️ Could not sync secondary database:", e.message);
    }
  }
}

main().catch(err => {
  console.error("❌ Sync error:", err);
  process.exit(1);
});
