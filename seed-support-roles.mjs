import mysql from 'mysql2/promise';
import * as dotenv from 'dotenv';
dotenv.config();

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("❌ Error: DATABASE_URL is not defined in the environment.");
    process.exit(1);
  }

  console.log("🚀 Connecting to database to seed support permissions safely...");
  const conn = await mysql.createConnection(process.env.DATABASE_URL);

  try {
    // 1. Ensure the 'technical_support' module exists
    const [existingModule] = await conn.execute(
      "SELECT id FROM modules WHERE id = ?",
      ["technical_support"]
    );
    if (existingModule.length === 0) {
      await conn.execute(
        "INSERT INTO modules (id, name_ar, name_en, icon, display_order, is_active) VALUES ('technical_support', 'الدعم الفني', 'Technical Support', 'LifeBuoy', 12, true)"
      );
      console.log("✅ Created 'technical_support' module.");
    } else {
      console.log("ℹ️ Module 'technical_support' already exists.");
    }

    // 2. Ensure the 'Create_Ticket' permission exists
    const [existingCreatePerm] = await conn.execute(
      "SELECT id FROM permissions WHERE id = ?",
      ["Create_Ticket"]
    );
    if (existingCreatePerm.length === 0) {
      await conn.execute(
        "INSERT INTO permissions (id, module_id, action, name_ar, name_en) VALUES (?, ?, ?, ?, ?)",
        ["Create_Ticket", "technical_support", "create", "إنشاء تذكرة دعم فني", "Create Support Ticket"]
      );
      console.log("✅ Created permission: Create_Ticket");
    } else {
      console.log("ℹ️ Permission 'Create_Ticket' already exists.");
    }

    // 3. Ensure the 'View_Tickets' permission exists
    const [existingViewPerm] = await conn.execute(
      "SELECT id FROM permissions WHERE id = ?",
      ["View_Tickets"]
    );
    if (existingViewPerm.length === 0) {
      await conn.execute(
        "INSERT INTO permissions (id, module_id, action, name_ar, name_en) VALUES (?, ?, ?, ?, ?)",
        ["View_Tickets", "technical_support", "view", "عرض تذاكر الدعم الفني", "View Support Tickets"]
      );
      console.log("✅ Created permission: View_Tickets");
    } else {
      console.log("ℹ️ Permission 'View_Tickets' already exists.");
    }

    // 4. Fetch all active roles in the system
    const [roles] = await conn.execute(
      "SELECT id FROM roles WHERE is_active = true"
    );
    const roleIds = roles.map(r => r.id);
    console.log(`ℹ️ Active roles found in DB: ${roleIds.join(', ')}`);

    // 5. Assign permissions safely without affecting other data
    for (const roleId of roleIds) {
      if (roleId === 'service_requester') {
        console.log(`ℹ️ Skipping role 'service_requester' as requested.`);
        continue;
      }

      // Every main role gets 'Create_Ticket'
      console.log(`🔑 Assigning 'Create_Ticket' to role '${roleId}'...`);
      await conn.execute(
        "INSERT IGNORE INTO role_permissions (role_id, permission_id) VALUES (?, ?)",
        [roleId, "Create_Ticket"]
      );

      // Only super_admin and system_admin get 'View_Tickets'
      if (roleId === 'super_admin' || roleId === 'system_admin') {
        console.log(`🔑 Assigning 'View_Tickets' to admin role '${roleId}'...`);
        await conn.execute(
          "INSERT IGNORE INTO role_permissions (role_id, permission_id) VALUES (?, ?)",
          [roleId, "View_Tickets"]
        );
      }
    }

    console.log("\n🎉 Seeding completed successfully! All other permissions and system data remain unaffected.");

  } catch (error) {
    console.error("❌ Seeding failed with error:", error);
  } finally {
    await conn.end();
  }
}

main();
