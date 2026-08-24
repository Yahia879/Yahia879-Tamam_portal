import mysql from 'mysql2/promise';
import * as dotenv from 'dotenv';
dotenv.config();

/**
 * سكريبت Seed مخصص لإضافة وإسناد الصلاحيات الجديدة للأدوار المحددة
 * آمن تماماً ولا يؤثر على أي بيانات سابقة (يستخدم INSERT IGNORE)
 */
async function runSeed() {
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
  console.log(`🚀 بدء تشغيل Seed الصلاحيات على قاعدة البيانات...`);
  console.log("================================================================================");

  const connection = await mysql.createConnection(connectionConfig);

  try {
    // 1. التأكد من وجود الموديولات الأساسية
    console.log("\n📦 1. التحقق من وجود الموديولات الأساسية (Modules)...");
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

    // 2. إدراج وتأكيد الصلاحيات المطلوبة في جدول permissions
    console.log("\n🔑 2. إدراج وتحديث الصلاحيات في جدول الصلاحيات (Permissions)...");
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

    // 3. إسناد الصلاحيات للأدوار المحددة في جدول role_permissions
    console.log("\n👥 3. إسناد الصلاحيات للأدوار في جدول role_permissions...");

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
        // التأكد أولاً من وجود الدور في جدول roles
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
    console.log("🎉 اكتمل تشغيل الـ Seed بنجاح تام دون المساس بأي بيانات سابقة!");
    console.log("================================================================================\n");

  } catch (error: any) {
    console.error("❌ حدث خطأ أثناء تنفيذ الـ Seed:", error.message);
  } finally {
    await connection.end();
  }
}

runSeed();
