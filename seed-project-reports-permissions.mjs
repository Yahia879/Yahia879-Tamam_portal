import mysql from 'mysql2/promise';
import * as dotenv from 'dotenv';
dotenv.config();

async function run() {
  console.log("=================================================================");
  console.log("🚀 بدء تطبيق Seed الشامل لجميع الصلاحيات والأدوار المحدثة...");
  console.log("=================================================================");

  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error("❌ خطأ: لم يتم العثور على متغير DATABASE_URL في ملف .env");
    process.exit(1);
  }

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

    // 2. إدراج وتحديث الصلاحيات في جدول permissions
    console.log("⏳ 2. إدراج وتحديث الصلاحيات في جدول permissions...");
    const perms = [
      {
        id: "projects.create_multi_mosque",
        module_id: "projects",
        action: "create_multi_mosque",
        name_ar: "إضافة مشروع لعدة مساجد",
        name_en: "Create Multi-Mosque Project",
        description: "صلاحية إنشاء مشروع واحد مخصص لأكثر من مسجد في نفس الوقت",
      },
      {
        id: "project_reports.view",
        module_id: "reports",
        action: "view",
        name_ar: "عرض تقارير المشاريع",
        name_en: "View Project Reports",
        description: "صلاحية عرض مركز تقارير المشاريع والإحصائيات والاطلاع على التقارير وطباعتها",
      },
      {
        id: "project_reports.create",
        module_id: "reports",
        action: "create",
        name_ar: "إنشاء تقارير مشاريع",
        name_en: "Create Project Reports",
        description: "صلاحية إنشاء تقارير جديدة وتعديلها وإكمال المسودات وتغيير حالة تقارير المشاريع",
      },
      {
        id: "progress_reports.view",
        module_id: "reports",
        action: "view",
        name_ar: "عرض تقارير الإنجاز",
        name_en: "View Progress Reports",
        description: "عرض تقارير الإنجاز للمشاريع",
      },
      {
        id: "progress_reports.add",
        module_id: "reports",
        action: "add",
        name_ar: "إضافة تقرير إنجاز",
        name_en: "Add Progress Report",
        description: "إضافة تقرير إنجاز جديد للمشاريع",
      },
      {
        id: "progress_reports.edit",
        module_id: "reports",
        action: "edit",
        name_ar: "تعديل تقرير إنجاز",
        name_en: "Edit Progress Report",
        description: "تعديل تقارير الإنجاز القائمة",
      },
      {
        id: "progress_reports.approve",
        module_id: "reports",
        action: "approve",
        name_ar: "اعتماد تقرير إنجاز",
        name_en: "Approve Progress Report",
        description: "اعتماد ومراجعة تقارير الإنجاز",
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
      console.log(`   ✅ تم إدراج/تحديث الصلاحية: ${p.name_ar} (${p.id})`);
    }

    // 3. تحديث مسمى صلاحية مركز الاعتماد المالي
    console.log("\n⏳ 3. تحديث مسمى صلاحية مركز الاعتماد المالي (board_chairman)...");
    await conn.query(`
      UPDATE \`permissions\`
      SET 
        \`name_ar\` = 'عرض مركز الاعتماد المالي',
        \`name_en\` = 'View Financial Approval Center',
        \`description\` = 'صلاحية مركز الاعتماد المالي (عرض لوحة الإحصائيات القيادية واعتماد أوامر الصرف)'
      WHERE \`id\` = 'board_chairman'
    `);
    console.log("   ✅ تم تحديث مسمى board_chairman بنجاح.");

    // 4. إسناد الصلاحيات للأدوار المستهدفة
    console.log("\n⏳ 4. إسناد الصلاحيات للأدوار (super_admin, system_admin, projects_office)...");
    const targetRoles = ["super_admin", "system_admin", "projects_office"];
    const targetPerms = [
      "projects.create_multi_mosque",
      "project_reports.view",
      "project_reports.create",
    ];

    const [existingRoles] = await conn.query("SELECT id FROM \`roles\`");
    const existingRoleIds = existingRoles.map(r => r.id);

    const validTargetRoles = targetRoles.filter(roleId => {
      if (!existingRoleIds.includes(roleId)) {
        console.warn(`⚠️ تحذير: الرول '${roleId}' غير موجود في جدول roles، سيتم تجاوزه.`);
        return false;
      }
      return true;
    });

    for (const roleId of validTargetRoles) {
      for (const permId of targetPerms) {
        await conn.query(`
          INSERT INTO \`role_permissions\` (\`role_id\`, \`permission_id\`)
          VALUES (?, ?)
          ON DUPLICATE KEY UPDATE \`permission_id\` = VALUES(\`permission_id\`);
        `, [roleId, permId]);
      }
      console.log(`   ✅ تم إسناد الصلاحيات للرول: [${roleId}]`);
    }

    // 5. مزامنة مصفوفة JSON للرول projects_office
    console.log("\n⏳ 5. مزامنة مصفوفة الصلاحيات لرول projects_office...");
    const [allPoPerms] = await conn.query(
      "SELECT DISTINCT \`permission_id\` FROM \`role_permissions\` WHERE \`role_id\` = 'projects_office'"
    );
    if (allPoPerms && allPoPerms.length > 0) {
      const permsList = allPoPerms.map(r => r.permission_id);
      await conn.query(
        "UPDATE \`roles\` SET \`description\` = ? WHERE \`id\` = 'projects_office' AND \`description\` IS NOT NULL",
        [JSON.stringify(permsList)]
      );
      console.log("   ✅ تم تحديث مصفوفة صلاحيات projects_office.");
    }

    console.log("\n=================================================================");
    console.log("🎉 اكتمل الـ Seed بنجاح تام! قاعدة البيانات أصبحت محدثة 100%.");
    console.log("=================================================================");
  } catch (error) {
    console.error("❌ حدث خطأ أثناء تنفيذ الـ Seed:", error);
    process.exit(1);
  } finally {
    if (conn) await conn.end();
  }
}

run();
