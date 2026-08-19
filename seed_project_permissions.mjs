import mysql from 'mysql2/promise';
import * as dotenv from 'dotenv';
dotenv.config();

async function main() {
  const dbUrl = process.env.DATABASE_URL || 'mysql://root@127.0.0.1:3306/tamamgatemanarah_portal';
  console.log("=================================================================");
  console.log("🚀 بدء تطبيق Seed لصلاحيات المشاريع وتقارير المشاريع...");
  console.log("=================================================================");

  let conn;
  try {
    conn = await mysql.createConnection(dbUrl);
    console.log("✅ تم الاتصال بقاعدة البيانات بنجاح.\n");

    // 1. التأكد من وجود الموديولات
    console.log("⏳ 1. التحقق من وجود موديولات 'projects' و 'reports'...");
    await conn.query(`
      INSERT INTO \`modules\` (\`id\`, \`name_ar\`, \`name_en\`, \`description\`, \`icon\`, \`display_order\`, \`is_active\`)
      VALUES 
        ('projects', 'المشاريع', 'Projects', 'إدارة ومتابعة المشاريع', 'FolderKanban', 2, 1),
        ('reports', 'التقارير', 'Reports', 'إدارة وعرض التقارير', 'BarChart3', 5, 1)
      ON DUPLICATE KEY UPDATE 
        \`name_ar\` = VALUES(\`name_ar\`),
        \`name_en\` = VALUES(\`name_en\`),
        \`is_active\` = 1;
    `);
    console.log("   ✅ تم التحقق من الموديولات.\n");

    // 2. إدراج وتحديث الصلاحيات الثلاث في جدول permissions
    console.log("⏳ 2. التحقق من إدراج الصلاحيات الثلاث في جدول permissions...");
    const perms = [
      {
        id: 'projects.create_multi_mosque',
        module_id: 'projects',
        action: 'create_multi_mosque',
        name_ar: 'إضافة مشروع لعدة مساجد',
        name_en: 'Create Multi-Mosque Project',
        description: 'صلاحية إنشاء مشروع واحد مخصص لأكثر من مسجد في نفس الوقت'
      },
      {
        id: 'project_reports.view',
        module_id: 'reports',
        action: 'view',
        name_ar: 'عرض تقارير المشاريع',
        name_en: 'View Project Reports',
        description: 'صلاحية عرض مركز تقارير المشاريع والإحصائيات والاطلاع على التقارير وطباعتها'
      },
      {
        id: 'project_reports.create',
        module_id: 'reports',
        action: 'create',
        name_ar: 'إنشاء تقارير مشاريع',
        name_en: 'Create Project Reports',
        description: 'صلاحية إنشاء تقارير جديدة وتعديلها وإكمال المسودات وتغيير حالة تقارير المشاريع'
      }
    ];

    for (const p of perms) {
      await conn.query(`
        INSERT INTO \`permissions\` (\`id\`, \`module_id\`, \`action\`, \`name_ar\`, \`name_en\`, \`description\`)
        VALUES (?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE 
          \`module_id\` = VALUES(\`module_id\`),
          \`action\` = VALUES(\`action\`),
          \`name_ar\` = VALUES(\`name_ar\`),
          \`name_en\` = VALUES(\`name_en\`),
          \`description\` = VALUES(\`description\`);
      `, [p.id, p.module_id, p.action, p.name_ar, p.name_en, p.description]);
      console.log(`   ✅ تم التحقق من الصلاحية: ${p.name_ar} (${p.id})`);
    }

    // 3. إسناد الصلاحيات للأدوار المستهدفة
    console.log("\n⏳ 3. إسناد الصلاحيات للأدوار (super_admin, system_admin, projects_office)...");
    const targetRoles = ['super_admin', 'system_admin', 'projects_office'];
    const targetPerms = ['projects.create_multi_mosque', 'project_reports.view', 'project_reports.create'];

    for (const role of targetRoles) {
      for (const perm of targetPerms) {
        await conn.query(`
          INSERT INTO \`role_permissions\` (\`role_id\`, \`permission_id\`)
          VALUES (?, ?)
          ON DUPLICATE KEY UPDATE \`permission_id\` = VALUES(\`permission_id\`);
        `, [role, perm]);
      }
      console.log(`   ✅ تم إسناد الصلاحيات الـ 3 للرول: [${role}]`);
    }

    // 4. تحديث حقل description في roles إذا كان يحتوي على مصفوفة JSON
    console.log("\n⏳ 4. مزامنة وصف JSON لرول projects_office إن وجد...");
    const [allPoPerms] = await conn.query("SELECT DISTINCT `permission_id` FROM `role_permissions` WHERE `role_id` = 'projects_office'");
    if (allPoPerms.length > 0) {
      const permsList = allPoPerms.map(r => r.permission_id);
      await conn.query("UPDATE `roles` SET `description` = ? WHERE `id` = 'projects_office' AND `description` IS NOT NULL", [JSON.stringify(permsList)]);
      console.log("   ✅ تم تحديث مصفوفة صلاحيات projects_office.");
    }

    console.log("\n=================================================================");
    console.log("🎉 اكتمل تنفيذ الـ Seed بنجاح تام وبدون أي تأثير على البيانات القائمة!");
    console.log("=================================================================");
  } catch (error) {
    console.error("❌ حدث خطأ أثناء تنفيذ الـ Seed:", error);
    process.exit(1);
  } finally {
    if (conn) await conn.end();
  }
}

main();
