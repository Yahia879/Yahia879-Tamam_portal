import mysql from 'mysql2/promise';
import * as dotenv from 'dotenv';

dotenv.config();

const ALL_ROLES_ENUM = [
  'super_admin',
  'system_admin',
  'board_chairman',
  'board_member',
  'general_manager',
  'executive_director',
  'projects_office',
  'project_manager',
  'field_team',
  'financial',
  'financial_manager',
  'quick_response',
  'corporate_comm',
  'service_requester',
  'partner',
];

const MODULES_TO_SEED = [
  { id: 'board', nameAr: 'مجلس الإدارة', nameEn: 'Board of Directors', icon: 'LayoutDashboard', displayOrder: 13, isActive: 1 },
  { id: 'boq', nameAr: 'إعداد جداول الكميات', nameEn: 'BOQ Preparation', icon: 'FileSpreadsheet', displayOrder: 10, isActive: 1 },
  { id: 'pending_reports', nameAr: 'تقارير الطلبات', nameEn: 'Request Reports', icon: 'FileText', displayOrder: 11, isActive: 1 },
  { id: 'technical_support', nameAr: 'الدعم الفني', nameEn: 'Technical Support', icon: 'LifeBuoy', displayOrder: 12, isActive: 1 },
];

const PERMISSIONS_TO_SEED = [
  {
    id: 'board_chairman',
    moduleId: 'board',
    action: 'board_chairman',
    nameAr: 'صلاحية رئيس مجلس الإدارة (عرض لوحة الإحصائيات القيادية و اعتماد التحويل البنكي والاعتمادات العليا)',
    nameEn: 'Board Chairman Permission',
    targetRoles: ['super_admin', 'system_admin', 'board_chairman'],
  },
  {
    id: 'board_chairman_view',
    moduleId: 'board',
    action: 'board_chairman_view',
    nameAr: 'عرض لوحة رئيس مجلس الإدارة',
    nameEn: 'View Board Chairman Dashboard',
    targetRoles: ['super_admin', 'system_admin'],
  },
  {
    id: 'board_member',
    moduleId: 'board',
    action: 'board_member',
    nameAr: 'صلاحية عضو مجلس الإدارة (عرض لوحة الإحصائيات القيادية)',
    nameEn: 'Board Member Permission',
    targetRoles: ['super_admin', 'system_admin', 'board_member'],
  },
  {
    id: 'contracts.approve',
    moduleId: 'contracts',
    action: 'approve',
    nameAr: 'اعتماد العقود',
    nameEn: 'Approve Contracts',
    targetRoles: ['super_admin', 'system_admin', 'financial', 'projects_office'],
  },
  {
    id: 'disbursements.sign',
    moduleId: 'disbursements',
    action: 'sign',
    nameAr: 'توقيع طلبات الصرف',
    nameEn: 'Sign Disbursement Requests',
    targetRoles: ['super_admin', 'system_admin', 'financial', 'projects_office'],
  },
  {
    id: 'final_reports.sign',
    moduleId: 'requests',
    action: 'final_reports_sign',
    nameAr: 'توقيع التقارير الختامية',
    nameEn: 'Sign Final Reports',
    targetRoles: ['super_admin', 'system_admin', 'corporate_comm'],
  },
];

const ROLES_TO_SEED = [
  { id: 'board_chairman', nameAr: 'رئيس مجلس الإدارة', nameEn: 'Board Chairman' },
  { id: 'board_member', nameAr: 'عضو مجلس الإدارة', nameEn: 'Board Member' },
  { id: 'general_manager', nameAr: 'المدير التنفيذي', nameEn: 'Executive Director' },
  { id: 'executive_director', nameAr: 'المدير التنفيذي', nameEn: 'Executive Director' },
  { id: 'financial_manager', nameAr: 'المدير المالي', nameEn: 'Financial Manager' },
  { id: 'financial', nameAr: 'الإدارة المالية', nameEn: 'Financial' },
  { id: 'projects_office', nameAr: 'مكتب المشاريع', nameEn: 'Projects Office' },
  { id: 'project_manager', nameAr: 'مدير المشاريع', nameEn: 'Project Manager' },
  { id: 'field_team', nameAr: 'فريق ميداني', nameEn: 'Field Team' },
  { id: 'quick_response', nameAr: 'فريق الاستجابة السريعة', nameEn: 'Quick Response Team' },
  { id: 'corporate_comm', nameAr: 'الاتصال المؤسسي', nameEn: 'Corporate Communication' },
  { id: 'super_admin', nameAr: 'المدير العام', nameEn: 'Super Admin' },
  { id: 'system_admin', nameAr: 'مدير نظام', nameEn: 'System Admin' },
  { id: 'service_requester', nameAr: 'طالب خدمة', nameEn: 'Service Requester' },
];

async function syncDatabase(dbName: string) {
  console.log(`\n======================================================`);
  console.log(`🚀 Syncing Database: [${dbName}]`);
  console.log(`======================================================\n`);

  let connection;
  try {
    connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '',
      database: dbName,
    });
  } catch (err: any) {
    console.error(`❌ Could not connect to [${dbName}]:`, err.message);
    return;
  }

  try {
    // 1. Update users.role column enum to include board_chairman and board_member
    console.log('1️⃣ Updating users.role column enum...');
    const enumSql = ALL_ROLES_ENUM.map((r) => `'${r}'`).join(',');
    try {
      await connection.query(
        `ALTER TABLE \`users\` MODIFY COLUMN \`role\` ENUM(${enumSql}) NOT NULL DEFAULT 'service_requester'`
      );
      console.log('   ✅ users.role ENUM updated successfully.');
    } catch (e: any) {
      console.log('   ℹ️ Note on users.role:', e.message);
    }

    // 2. Ensure Modules
    console.log('2️⃣ Checking and inserting missing modules...');
    for (const m of MODULES_TO_SEED) {
      const [existing]: any = await connection.query(`SELECT id FROM modules WHERE id = ?`, [m.id]);
      if (existing.length === 0) {
        console.log(`   ➕ Inserting module: ${m.id} (${m.nameAr})`);
        await connection.query(
          `INSERT INTO modules (id, name_ar, name_en, icon, display_order, is_active)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [m.id, m.nameAr, m.nameEn, m.icon, m.displayOrder, m.isActive]
        );
      } else {
        console.log(`   ℹ️ Module ${m.id} exists.`);
      }
    }

    // 3. Ensure Roles
    console.log('3️⃣ Checking and inserting missing roles...');
    for (const r of ROLES_TO_SEED) {
      const [existing]: any = await connection.query(`SELECT id FROM roles WHERE id = ?`, [r.id]);
      if (existing.length === 0) {
        console.log(`   ➕ Inserting role: ${r.id} (${r.nameAr})`);
        await connection.query(
          `INSERT INTO roles (id, name_ar, name_en, is_system, is_active)
           VALUES (?, ?, ?, 1, 1)`,
          [r.id, r.nameAr, r.nameEn]
        );
      } else {
        await connection.query(
          `UPDATE roles SET name_ar = ?, name_en = ? WHERE id = ?`,
          [r.nameAr, r.nameEn, r.id]
        );
        console.log(`   ℹ️ Role ${r.id} updated/verified.`);
      }
    }

    // 4. Ensure Permissions
    console.log('4️⃣ Checking and inserting permissions...');
    for (const p of PERMISSIONS_TO_SEED) {
      const [existing]: any = await connection.query(`SELECT id FROM permissions WHERE id = ?`, [p.id]);
      if (existing.length === 0) {
        console.log(`   ➕ Inserting permission: ${p.id} (${p.nameAr})`);
        await connection.query(
          `INSERT INTO permissions (id, module_id, action, name_ar, name_en, description)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [p.id, p.moduleId, p.action, p.nameAr, p.nameEn, `صلاحية ${p.nameAr}`]
        );
      } else {
        await connection.query(
          `UPDATE permissions SET module_id = ?, action = ?, name_ar = ?, name_en = ? WHERE id = ?`,
          [p.moduleId, p.action, p.nameAr, p.nameEn, p.id]
        );
        console.log(`   ℹ️ Permission ${p.id} updated/verified.`);
      }

      // Link to target roles in role_permissions
      for (const roleId of p.targetRoles) {
        const [existingRolePerm]: any = await connection.query(
          `SELECT id FROM role_permissions WHERE role_id = ? AND permission_id = ?`,
          [roleId, p.id]
        );
        if (existingRolePerm.length === 0) {
          console.log(`   🔗 Linking permission [${p.id}] -> role [${roleId}]`);
          await connection.query(
            `INSERT INTO role_permissions (role_id, permission_id) VALUES (?, ?)`,
            [roleId, p.id]
          );
        }
      }

      // Direct sync to existing users with targetRoles
      const [targetUsers]: any = await connection.query(
        `SELECT id, name, role FROM users WHERE role IN (${p.targetRoles.map((r) => `'${r}'`).join(',')})`
      );
      for (const u of targetUsers) {
        const [existingUserPerm]: any = await connection.query(
          `SELECT id FROM user_permissions WHERE user_id = ? AND permission_id = ?`,
          [u.id, p.id]
        );
        if (existingUserPerm.length === 0) {
          console.log(`   👤 Granting perm [${p.id}] to user: ${u.name} (ID: ${u.id})`);
          await connection.query(
            `INSERT INTO user_permissions (user_id, permission_id, granted, reason)
             VALUES (?, ?, 1, ?)`,
            [u.id, p.id, `تأصيل وتفعيل تلقائي لصلاحية ${p.nameAr}`]
          );
        }
      }
    }

    // 5. Cleanup conflicting permissions if any
    console.log('5️⃣ Cleaning up redundant/conflicting permissions...');
    await connection.query(
      `DELETE FROM role_permissions WHERE role_id = 'board_chairman' AND permission_id = 'board_member'`
    );

    const [chairmanUsers]: any = await connection.query(
      `SELECT id FROM users WHERE role = 'board_chairman'`
    );
    for (const u of chairmanUsers) {
      await connection.query(
        `DELETE FROM user_permissions WHERE user_id = ? AND permission_id = 'board_member'`,
        [u.id]
      );
    }

    console.log(`\n🎉 [${dbName}] Synchronized successfully!`);
  } catch (err: any) {
    console.error(`❌ Error syncing [${dbName}]:`, err);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

async function run() {
  await syncDatabase('tamamgatemanarah_portal');
  await syncDatabase('test_temam');
}

run();
