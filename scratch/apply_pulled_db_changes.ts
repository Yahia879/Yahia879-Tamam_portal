import mysql from 'mysql2/promise';
import * as dotenv from 'dotenv';

dotenv.config();

const TARGET_DATABASES = ['test_temam', 'tamamgatemanarah_portal'];

async function main() {
  console.log('🚀 Applying DB Changes from Git Pull (Close Request & Revoke Approval)...\n');

  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    port: 3306,
  });

  for (const dbName of TARGET_DATABASES) {
    console.log(`\n======================================================`);
    console.log(`📦 Updating database: [${dbName}]`);
    console.log(`======================================================`);

    // 1. Add closure columns to mosque_requests
    const [cols]: any = await connection.query(`SHOW COLUMNS FROM \`${dbName}\`.mosque_requests`);
    const colNames = cols.map((c: any) => c.Field);

    const columnsToAdd = [
      { name: 'closureStatus', def: 'VARCHAR(50) DEFAULT NULL' },
      { name: 'closureRequestedBy', def: 'INT DEFAULT NULL' },
      { name: 'closureRequestedAt', def: 'DATETIME DEFAULT NULL' },
      { name: 'closureReason', def: 'TEXT DEFAULT NULL' },
      { name: 'closureConfirmedBy', def: 'INT DEFAULT NULL' },
      { name: 'closureConfirmedAt', def: 'DATETIME DEFAULT NULL' },
      { name: 'closureRejectionReason', def: 'TEXT DEFAULT NULL' },
    ];

    for (const col of columnsToAdd) {
      if (!colNames.includes(col.name)) {
        await connection.query(`ALTER TABLE \`${dbName}\`.mosque_requests ADD COLUMN \`${col.name}\` ${col.def}`);
        console.log(`  ➕ Added column [${col.name}] to mosque_requests`);
      } else {
        console.log(`  ✨ Column [${col.name}] already exists in mosque_requests`);
      }
    }

    // 2. Add progress_reports.revoke_approval permission
    const [existingPerm]: any = await connection.query(
      `SELECT id FROM \`${dbName}\`.permissions WHERE id = 'progress_reports.revoke_approval'`
    );

    if (existingPerm.length === 0) {
      await connection.query(
        `INSERT INTO \`${dbName}\`.permissions (id, module_id, action, name_ar, name_en, description)
         VALUES ('progress_reports.revoke_approval', 'reports', 'revoke_approval', 'إلغاء الاعتماد', 'Revoke Approval of Progress Reports', 'صلاحية إلغاء اعتماد تقارير الإنجاز')`
      );
      console.log(`  ➕ Added permission: progress_reports.revoke_approval`);
    } else {
      console.log(`  ✨ Permission progress_reports.revoke_approval already exists`);
    }

    // 3. Link permission to roles (super_admin, system_admin, general_manager, executive_director)
    const targetRoles = ['super_admin', 'system_admin', 'general_manager', 'executive_director'];
    for (const roleId of targetRoles) {
      const [link]: any = await connection.query(
        `SELECT id FROM \`${dbName}\`.role_permissions WHERE role_id = ? AND permission_id = 'progress_reports.revoke_approval'`,
        [roleId]
      );
      if (link.length === 0) {
        await connection.query(
          `INSERT INTO \`${dbName}\`.role_permissions (role_id, permission_id) VALUES (?, 'progress_reports.revoke_approval')`,
          [roleId]
        );
        console.log(`  🔗 Linked progress_reports.revoke_approval -> role [${roleId}]`);
      }
    }
  }

  await connection.end();
  console.log('\n🎉 All DB changes from the git pull have been successfully applied to both databases!');
}

main().catch((err) => {
  console.error('❌ Error applying DB changes:', err);
  process.exit(1);
});
