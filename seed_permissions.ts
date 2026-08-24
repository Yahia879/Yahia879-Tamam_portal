import mysql from 'mysql2/promise';
import * as dotenv from 'dotenv';
dotenv.config();

/**
 * سكريبت شامل وآمن للتشغيل على السيرفر:
 * 1. تحديث بنية الجداول (Columns & ENUMs) لتقارير الإنجاز وسندات القبض إن لم تكن موجودة.
 * 2. إضافة الموديولات والصلاحيات الجديدة لجدول permissions.
 * 3. إسناد الصلاحيات تلقائياً للأدوار المحددة في جدول role_permissions.
 */
async function runAllInOneMigrationAndSeed() {
  const url = process.env.DATABASE_URL;
  let activeDbName = 'temam';

  let connectionConfig: any = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    port: Number(process.env.DB_PORT) || 3306,
  };

  if (url) {
    try {
      const parsed = new URL(url);
      activeDbName = parsed.pathname.replace(/^\//, '');
      connectionConfig = {
        host: parsed.hostname,
        user: parsed.username,
        password: parsed.password,
        port: Number(parsed.port) || 3306,
        database: activeDbName,
      };
    } catch (e) {
      console.warn("Could not parse DATABASE_URL, using default DB env config.");
    }
  }

  console.log("================================================================================");
  console.log(`🚀 بدء تشغيل التحديث الشامل لقاعدة البيانات والصلاحيات على [${activeDbName}]...`);
  console.log("================================================================================");

  const connection = await mysql.createConnection(connectionConfig);

  try {
    // -------------------------------------------------------------------------
    // 1. تحديث بنية جدول تقارير الإنجاز (progress_reports)
    // -------------------------------------------------------------------------
    console.log("\n🛠️  1. التحقق من بنية جدول تقارير الإنجاز (progress_reports)...");
    
    // تعديل الـ ENUM الخاص بالحالة
    try {
      await connection.query(`
        ALTER TABLE \`progress_reports\` 
        MODIFY COLUMN \`status\` ENUM('draft', 'submitted', 'pending', 'pending_executive', 'reviewed', 'approved', 'rejected', 'revoked') DEFAULT 'draft'
      `);
      console.log("  ✓ تم تحديث قيم status ENUM في جدول progress_reports بنجاح.");
    } catch (err: any) {
      console.warn("  ⚠️ تنبيه أثناء تعديل ENUM:", err.message);
    }

    const progressReportColumns = [
      ['managerApprovedBy', 'INT NULL'],
      ['managerApprovedAt', 'DATETIME NULL'],
      ['approvedBy', 'INT NULL'],
      ['approvedAt', 'DATETIME NULL'],
      ['approvalNotes', 'TEXT NULL'],
      ['rejectedBy', 'INT NULL'],
      ['rejectedAt', 'DATETIME NULL'],
      ['rejectionReason', 'TEXT NULL'],
      ['isException', 'TINYINT(1) DEFAULT 0'],
      ['exceptionApprovedBy', 'INT NULL'],
      ['creatorSignatureName', 'TEXT NULL'],
      ['creatorSignatureDepartment', 'TEXT NULL'],
      ['creatorSignatureUrl', 'TEXT NULL'],
      ['approvedBySignatureName', 'TEXT NULL'],
      ['approvedBySignatureDepartment', 'TEXT NULL'],
      ['approvedBySignatureUrl', 'TEXT NULL'],
      ['showCreatorSignature', 'TINYINT(1) DEFAULT 1'],
      ['showExecutiveDirectorSignature', 'TINYINT(1) DEFAULT 1']
    ];

    for (const [colName, colDef] of progressReportColumns) {
      const [rows]: any = await connection.query(
        `SELECT COLUMN_NAME 
         FROM INFORMATION_SCHEMA.COLUMNS 
         WHERE TABLE_SCHEMA = ? 
           AND TABLE_NAME = 'progress_reports' 
           AND COLUMN_NAME = ?`,
        [activeDbName, colName]
      );

      if (rows.length === 0) {
        await connection.query(`ALTER TABLE \`progress_reports\` ADD COLUMN \`${colName}\` ${colDef}`);
        console.log(`  ✓ إضافة الحقل الجديد: progress_reports.${colName}`);
      } else {
        console.log(`  - الحقل موجود مسبقاً: progress_reports.${colName}`);
      }
    }

    // -------------------------------------------------------------------------
    // 2. تحديث بنية جدول سندات القبض (receipt_vouchers)
    // -------------------------------------------------------------------------
    console.log("\n🛠️  2. التحقق من بنية جدول سندات القبض (receipt_vouchers)...");
    const receiptVoucherColumns = [
      ['isException', 'INT DEFAULT 0'],
      ['exceptionApprovedBy', 'INT NULL'],
      ['exceptionApprovedAt', 'DATETIME NULL'],
      ['exceptionReason', 'TEXT NULL'],
      ['approvedBy', 'INT NULL'],
      ['approvedAt', 'DATETIME NULL']
    ];

    for (const [colName, colDef] of receiptVoucherColumns) {
      const [rows]: any = await connection.query(
        `SELECT COLUMN_NAME 
         FROM INFORMATION_SCHEMA.COLUMNS 
         WHERE TABLE_SCHEMA = ? 
           AND TABLE_NAME = 'receipt_vouchers' 
           AND COLUMN_NAME = ?`,
        [activeDbName, colName]
      );

      if (rows.length === 0) {
        await connection.query(`ALTER TABLE \`receipt_vouchers\` ADD COLUMN \`${colName}\` ${colDef}`);
        console.log(`  ✓ إضافة الحقل الجديد: receipt_vouchers.${colName}`);
      } else {
        console.log(`  - الحقل موجود مسبقاً: receipt_vouchers.${colName}`);
      }
    }

    // -------------------------------------------------------------------------
    // 3. التأكد من وجود الموديولات الأساسية (Modules)
    // -------------------------------------------------------------------------
    console.log("\n📦 3. التحقق من وجود الموديولات الأساسية (Modules)...");
    const requiredModules = [
      { id: 'reports', nameAr: 'التقارير والمتابعة', nameEn: 'Reports & Monitoring', icon: 'FileText', displayOrder: 8 },
      { id: 'disbursements', nameAr: 'الصرف والمالية', nameEn: 'Disbursements & Financials', icon: 'Coins', displayOrder: 7 },
      { id: 'signing', nameAr: 'التوقيعات والاعتمادات', nameEn: 'Signatures & Approvals', icon: 'FileSignature', displayOrder: 15 },
    ];

    for (const mod of requiredModules) {
      await connection.query(
        `INSERT IGNORE INTO \`modules\` (\`id\`, \`name_ar\`, \`name_en\`, \`icon\`, \`display_order\`, \`is_active\`)
         VALUES (?, ?, ?, ?, ?, 1)`,
        [mod.id, mod.nameAr, mod.nameEn, mod.icon, mod.displayOrder]
      );
      console.log(`  ✓ الموديول: ${mod.nameAr} (${mod.id})`);
    }

    // -------------------------------------------------------------------------
    // 4. إدراج وتأكيد الصلاحيات المطلوبة في جدول permissions
    // -------------------------------------------------------------------------
    console.log("\n🔑 4. إدراج وتحديث الصلاحيات في جدول الصلاحيات (Permissions)...");
    const requiredPermissions = [
      {
        id: 'progress_reports.edit',
        moduleId: 'reports',
        action: 'edit',
        nameAr: 'تعديل التقرير',
        nameEn: 'Edit Progress Report',
      },
      {
        id: 'progress_reports.exception_approve',
        moduleId: 'reports',
        action: 'exception_approve',
        nameAr: 'استثناء اعتماد مدير المشروع',
        nameEn: 'Exception Approve Progress Reports',
      },
      {
        id: 'receipt_vouchers.exception_approve',
        moduleId: 'disbursements',
        action: 'exception_approve',
        nameAr: 'استثناء اعتماد السند',
        nameEn: 'Exception Approve Receipt Voucher',
      },
      {
        id: 'signing.progress_reports_sign',
        moduleId: 'signing',
        action: 'sign',
        nameAr: 'توقيع تقارير الإنجاز',
        nameEn: 'Sign Progress Reports',
      },
    ];

    for (const perm of requiredPermissions) {
      await connection.query(
        `INSERT INTO \`permissions\` (\`id\`, \`module_id\`, \`action\`, \`name_ar\`, \`name_en\`)
         VALUES (?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE \`name_ar\` = VALUES(\`name_ar\`), \`name_en\` = VALUES(\`name_en\`)`,
        [perm.id, perm.moduleId, perm.action, perm.nameAr, perm.nameEn]
      );
      console.log(`  ✓ الصلاحية: ${perm.nameAr} (${perm.id})`);
    }

    // -------------------------------------------------------------------------
    // 5. إسناد الصلاحيات للأدوار المحددة في جدول role_permissions
    // -------------------------------------------------------------------------
    console.log("\n👥 5. إسناد الصلاحيات للأدوار في جدول role_permissions...");

    const roleAssignments: Array<{ permissionId: string; permName: string; roles: string[] }> = [
      {
        permissionId: 'progress_reports.edit',
        permName: 'تعديل التقرير',
        roles: ['super_admin', 'system_admin', 'projects_office', 'general_manager'],
      },
      {
        permissionId: 'progress_reports.exception_approve',
        permName: 'استثناء اعتماد مدير المشروع',
        roles: ['super_admin', 'system_admin'],
      },
      {
        permissionId: 'receipt_vouchers.exception_approve',
        permName: 'استثناء اعتماد السند',
        roles: ['super_admin', 'system_admin'],
      },
      {
        permissionId: 'signing.progress_reports_sign',
        permName: 'توقيع تقارير الإنجاز',
        roles: ['super_admin', 'system_admin', 'projects_office', 'project_manager', 'general_manager'],
      },
    ];

    for (const assignment of roleAssignments) {
      console.log(`\n  📌 إسناد صلاحية [${assignment.permName}] (${assignment.permissionId}) للأدوار:`);
      for (const roleId of assignment.roles) {
        const [existingRole]: any = await connection.query(
          `SELECT \`id\` FROM \`roles\` WHERE \`id\` = ?`,
          [roleId]
        );

        if (existingRole && existingRole.length > 0) {
          await connection.query(
            `INSERT IGNORE INTO \`role_permissions\` (\`role_id\`, \`permission_id\`)
             VALUES (?, ?)`,
            [roleId, assignment.permissionId]
          );
          console.log(`     ✓ تم الإسناد للدور: ${roleId}`);
        } else {
          console.log(`     ⚠️ تنبيه: الدور (${roleId}) غير موجود في جدول roles، تم تجاوزه بأمان.`);
        }
      }
    }

    console.log("\n================================================================================");
    console.log("🎉 اكتمل تحديث قاعدة البيانات وبنيتها وإسناد الصلاحيات بنجاح تام!");
    console.log("================================================================================\n");

  } catch (error: any) {
    console.error("❌ حدث خطأ أثناء تنفيذ التحديث:", error.message);
  } finally {
    await connection.end();
  }
}

runAllInOneMigrationAndSeed();
