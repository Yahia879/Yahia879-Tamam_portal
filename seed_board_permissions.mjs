import mysql from 'mysql2/promise';
import * as dotenv from 'dotenv';
dotenv.config();

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("❌ خطأ: لم يتم العثور على متغير DATABASE_URL في ملف .env أو بيئة التشغيل.");
    process.exit(1);
  }

  console.log("=================================================================");
  console.log("🚀 بدء تطبيق بذر صلاحيات مجلس الإدارة (Board Permissions Seed)...");
  console.log("=================================================================");

  let conn;
  try {
    conn = await mysql.createConnection(process.env.DATABASE_URL);
    console.log("✅ تم الاتصال بقاعدة البيانات بنجاح.\n");

    // 1. تحديث نوع عمود role في جدول users لضمان دعم رول board_chairman و board_member
    try {
      console.log("⏳ 1. التحقق من عمود role في جدول users...");
      await conn.execute(`
        ALTER TABLE \`users\` MODIFY COLUMN \`role\` enum(
          'super_admin',
          'system_admin',
          'board_chairman',
          'board_member',
          'general_manager',
          'executive_director',
          'projects_office',
          'field_team',
          'quick_response',
          'financial',
          'financial_manager',
          'project_manager',
          'corporate_comm',
          'service_requester'
        ) NOT NULL DEFAULT 'service_requester'
      `);
      console.log("   ✅ تم التحقق وتحديث ENUM الأدوار في جدول users بنجاح.");
    } catch (err) {
      console.log("   ℹ️ تنبيه أثناء تعديل ENUM الأدوار (ربما محدث مسبقاً):", err.message);
    }

    // 2. التأكد من وجود موديول 'board' في جدول modules
    console.log("\n⏳ 2. التحقق من وجود موديول 'مجلس الإدارة' (board)...");
    const [existingMod] = await conn.execute("SELECT id FROM `modules` WHERE `id` = 'board'");
    if (existingMod.length === 0) {
      await conn.execute(`
        INSERT INTO \`modules\` (\`id\`, \`name_ar\`, \`name_en\`, \`description\`, \`icon\`, \`display_order\`, \`is_active\`)
        VALUES ('board', 'مجلس الإدارة', 'Board of Directors', 'إدارة ومتابعة قرارات وإحصائيات مجلس الإدارة', 'Crown', 1, 1)
      `);
      console.log("   ✅ تم إنشاء موديول 'board' في جدول modules.");
    } else {
      await conn.execute(`
        UPDATE \`modules\`
        SET \`name_ar\` = 'مجلس الإدارة', \`name_en\` = 'Board of Directors', \`is_active\` = 1
        WHERE \`id\` = 'board'
      `);
      console.log("   ✅ موديول 'board' موجود وتم تحديثه.");
    }

    // 3. التأكد من وجود الأدوار في جدول roles
    console.log("\n⏳ 3. التحقق من الأدوار في جدول roles...");
    const rolesToEnsure = [
      { id: 'super_admin', nameAr: 'المدير العام', nameEn: 'Super Admin' },
      { id: 'system_admin', nameAr: 'مدير النظام', nameEn: 'System Admin' },
      { id: 'board_chairman', nameAr: 'رئيس مجلس الإدارة', nameEn: 'Board Chairman' },
      { id: 'board_member', nameAr: 'عضو مجلس الإدارة', nameEn: 'Board Member' }
    ];

    for (const r of rolesToEnsure) {
      const [existingRole] = await conn.execute("SELECT id FROM `roles` WHERE `id` = ?", [r.id]);
      if (existingRole.length === 0) {
        await conn.execute(`
          INSERT INTO \`roles\` (\`id\`, \`name_ar\`, \`name_en\`, \`is_system\`, \`is_active\`)
          VALUES (?, ?, ?, 1, 1)
        `, [r.id, r.nameAr, r.nameEn]);
        console.log(`   ✅ تم إنشاء الدور '${r.id}' (${r.nameAr}).`);
      } else {
        console.log(`   ℹ️ الدور '${r.id}' (${r.nameAr}) موجود مسبقاً.`);
      }
    }

    // 4. التأكد من وجود الصلاحيتين في جدول permissions
    console.log("\n⏳ 4. التحقق من صلاحيات لوحات مجلس الإدارة في جدول permissions...");
    const permsToEnsure = [
      {
        id: 'board_chairman',
        action: 'board_chairman',
        nameAr: 'عرض لوحة رئيس مجلس الإدارة',
        nameEn: 'View Board Chairman Dashboard',
        description: 'صلاحية رئيس مجلس الإدارة (عرض لوحة الإحصائيات القيادية واعتماد أوامر الصرف)'
      },
      {
        id: 'board_member',
        action: 'board_member',
        nameAr: 'عرض لوحة عضو مجلس الإدارة',
        nameEn: 'View Board Member Dashboard',
        description: 'صلاحية عضو مجلس الإدارة (عرض لوحة الإحصائيات القيادية)'
      }
    ];

    for (const p of permsToEnsure) {
      const [existingPerm] = await conn.execute("SELECT id FROM `permissions` WHERE `id` = ?", [p.id]);
      if (existingPerm.length === 0) {
        await conn.execute(`
          INSERT INTO \`permissions\` (\`id\`, \`module_id\`, \`action\`, \`name_ar\`, \`name_en\`, \`description\`)
          VALUES (?, 'board', ?, ?, ?, ?)
        `, [p.id, p.action, p.nameAr, p.nameEn, p.description]);
        console.log(`   ✅ تم إنشاء الصلاحية '${p.id}' (${p.nameAr}).`);
      } else {
        await conn.execute(`
          UPDATE \`permissions\`
          SET \`module_id\` = 'board', \`name_ar\` = ?, \`name_en\` = ?, \`description\` = ?
          WHERE \`id\` = ?
        `, [p.nameAr, p.nameEn, p.description, p.id]);
        console.log(`   ✅ تم تحديث بيانات الصلاحية '${p.id}' (${p.nameAr}).`);
      }
    }

    // 5. إسناد الصلاحيات في جدول role_permissions للأدوار المستهدفة
    console.log("\n⏳ 5. إسناد الصلاحيات للأدوار في جدول role_permissions...");
    const rolePermissionMappings = [
      { roleId: 'super_admin', permId: 'board_chairman' },
      { roleId: 'super_admin', permId: 'board_member' },
      { roleId: 'system_admin', permId: 'board_chairman' },
      { roleId: 'system_admin', permId: 'board_member' },
      { roleId: 'board_chairman', permId: 'board_chairman' },
      { roleId: 'board_member', permId: 'board_member' }
    ];

    for (const mapping of rolePermissionMappings) {
      const [existing] = await conn.execute(`
        SELECT id FROM \`role_permissions\`
        WHERE \`role_id\` = ? AND \`permission_id\` = ?
      `, [mapping.roleId, mapping.permId]);

      if (existing.length === 0) {
        await conn.execute(`
          INSERT INTO \`role_permissions\` (\`role_id\`, \`permission_id\`)
          VALUES (?, ?)
        `, [mapping.roleId, mapping.permId]);
        console.log(`   ✅ تم إسناد الصلاحية '${mapping.permId}' للدور '${mapping.roleId}'.`);
      } else {
        console.log(`   ℹ️ الصلاحية '${mapping.permId}' مسندة بالفعل للدور '${mapping.roleId}'.`);
      }
    }

    // 6. إسناد الصلاحيات كـ "منح خاص" (granted = 1) في جدول user_permissions لمستخدمي super_admin و system_admin
    console.log("\n⏳ 6. إسناد الصلاحيات كـ 'منح خاص' لمستخدمي system_admin و super_admin الحاليين...");
    const [adminUsers] = await conn.execute(`
      SELECT id, name, email, role FROM \`users\`
      WHERE \`role\` IN ('super_admin', 'system_admin')
    `);

    console.log(`   ℹ️ تم العثور على ${(adminUsers).length} مستخدم بدور المدير العام ومدير النظام.`);

    for (const user of adminUsers) {
      for (const perm of ['board_chairman', 'board_member']) {
        const [existingUserPerm] = await conn.execute(`
          SELECT id, granted FROM \`user_permissions\`
          WHERE \`user_id\` = ? AND \`permission_id\` = ?
        `, [user.id, perm]);

        if (existingUserPerm.length === 0) {
          await conn.execute(`
            INSERT INTO \`user_permissions\` (\`user_id\`, \`permission_id\`, \`granted\`, \`reason\`)
            VALUES (?, ?, 1, 'إسناد تلقائي عبر seed الصلاحيات')
          `, [user.id, perm]);
          console.log(`   ✅ تم منح الصلاحية '${perm}' للمستخدم #${user.id} (${user.name || user.email}).`);
        } else if (!existingUserPerm[0].granted) {
          await conn.execute(`
            UPDATE \`user_permissions\`
            SET \`granted\` = 1, \`reason\` = 'تحديث المنح عبر seed الصلاحيات'
            WHERE \`id\` = ?
          `, [existingUserPerm[0].id]);
          console.log(`   ✅ تم تفعيل الصلاحية '${perm}' للمستخدم #${user.id} (${user.name || user.email}).`);
        } else {
          console.log(`   ℹ️ الصلاحية '${perm}' ممنوحة مسبقاً للمستخدم #${user.id} (${user.name || user.email}).`);
        }
      }
    }

    console.log("\n=================================================================");
    console.log("🎉 اكتمل بنجاح إسناد وضبط صلاحيات مجلس الإدارة لجميع مدراء النظام!");
    console.log("=================================================================");

  } catch (error) {
    console.error("❌ حدث خطأ أثناء تنفيذ عملية البذر:", error);
    process.exit(1);
  } finally {
    if (conn) await conn.end();
  }
}

main();
