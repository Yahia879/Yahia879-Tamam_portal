import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import * as schema from "./drizzle/schema.ts";
import { and, eq, inArray } from "drizzle-orm";
import * as dotenv from "dotenv";

dotenv.config();

async function run() {
  console.log("=================================================================");
  console.log("🚀 بدء تطبيق Seed الشامل لجميع الصلاحيات والأدوار المحدثة...");
  console.log("=================================================================");

  if (!process.env.DATABASE_URL) {
    console.error("❌ خطأ: لم يتم العثور على متغير DATABASE_URL في ملف .env");
    process.exit(1);
  }

  const connection = await mysql.createConnection(process.env.DATABASE_URL);
  const db = drizzle(connection, { schema, mode: "default" });

  try {
    // 1. التأكد من وجود الموديولات
    console.log("⏳ 1. التحقق من وجود موديولات 'projects' و 'reports'...");
    await db
      .insert(schema.modules)
      .values([
        {
          id: "projects",
          nameAr: "المشاريع",
          nameEn: "Projects",
          icon: "FolderKanban",
          displayOrder: 2,
        },
        {
          id: "reports",
          nameAr: "التقارير",
          nameEn: "Reports",
          icon: "BarChart3",
          displayOrder: 5,
        }
      ])
      .onDuplicateKeyUpdate({
        set: {
          nameAr: schema.modules.nameAr,
          nameEn: schema.modules.nameEn,
          icon: schema.modules.icon,
          displayOrder: schema.modules.displayOrder,
        },
      });
    console.log("   ✅ تم التحقق من الموديولات.");

    // 2. إدراج وتحديث الصلاحيات في جدول permissions
    console.log("\n⏳ 2. إدراج وتحديث الصلاحيات في جدول permissions...");
    const perms = [
      {
        id: "projects.create_multi_mosque",
        moduleId: "projects",
        action: "create_multi_mosque",
        nameAr: "إضافة مشروع لعدة مساجد",
        nameEn: "Create Multi-Mosque Project",
        description: "صلاحية إنشاء مشروع واحد مخصص لأكثر من مسجد في نفس الوقت",
      },
      {
        id: "project_reports.view",
        moduleId: "reports",
        action: "view",
        nameAr: "عرض تقارير المشاريع",
        nameEn: "View Project Reports",
        description: "صلاحية عرض مركز تقارير المشاريع والإحصائيات والاطلاع على التقارير وطباعتها",
      },
      {
        id: "project_reports.create",
        moduleId: "reports",
        action: "create",
        nameAr: "إنشاء تقارير مشاريع",
        nameEn: "Create Project Reports",
        description: "صلاحية إنشاء تقارير جديدة وتعديلها وإكمال المسودات وتغيير حالة تقارير المشاريع",
      },
      {
        id: "progress_reports.view",
        moduleId: "reports",
        action: "view",
        nameAr: "عرض تقارير الإنجاز",
        nameEn: "View Progress Reports",
        description: "عرض تقارير الإنجاز للمشاريع",
      },
      {
        id: "progress_reports.add",
        moduleId: "reports",
        action: "add",
        nameAr: "إضافة تقرير إنجاز",
        nameEn: "Add Progress Report",
        description: "إضافة تقرير إنجاز جديد للمشاريع",
      },
      {
        id: "progress_reports.edit",
        moduleId: "reports",
        action: "edit",
        nameAr: "تعديل تقرير إنجاز",
        nameEn: "Edit Progress Report",
        description: "تعديل تقارير الإنجاز القائمة",
      },
      {
        id: "progress_reports.approve",
        moduleId: "reports",
        action: "approve",
        nameAr: "اعتماد تقرير إنجاز",
        nameEn: "Approve Progress Report",
        description: "اعتماد ومراجعة تقارير الإنجاز",
      }
    ];

    for (const p of perms) {
      await db
        .insert(schema.permissions)
        .values(p)
        .onDuplicateKeyUpdate({
          set: {
            nameAr: p.nameAr,
            nameEn: p.nameEn,
            description: p.description,
            moduleId: p.moduleId,
            action: p.action,
          },
        });
      console.log(`   ✅ تم إدراج/تحديث الصلاحية: ${p.nameAr} (${p.id})`);
    }

    // 3. تحديث مسمى صلاحية مركز الاعتماد المالي
    console.log("\n⏳ 3. تحديث مسمى صلاحية مركز الاعتماد المالي (board_chairman)...");
    await connection.query(`
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
    const targetRoles = [
      "super_admin",
      "system_admin",
      "projects_office",
    ];

    const existingRoles = await db.select().from(schema.roles);
    const existingRoleIds = existingRoles.map(r => r.id);

    const validTargetRoles = targetRoles.filter(roleId => {
      if (!existingRoleIds.includes(roleId)) {
        console.warn(`⚠️ تحذير: الرول '${roleId}' غير موجود في جدول roles، سيتم تجاوزه.`);
        return false;
      }
      return true;
    });

    const newPermIds = [
      "projects.create_multi_mosque",
      "project_reports.view",
      "project_reports.create",
    ];

    for (const permId of newPermIds) {
      const existingMappings = await db
        .select()
        .from(schema.rolePermissions)
        .where(
          and(
            eq(schema.rolePermissions.permissionId, permId),
            inArray(schema.rolePermissions.roleId, validTargetRoles)
          )
        );

      const existingMappedRoles = new Set(existingMappings.map(m => m.roleId));

      const toInsert = validTargetRoles
        .filter(roleId => !existingMappedRoles.has(roleId))
        .map(roleId => ({
          roleId,
          permissionId: permId,
        }));

      if (toInsert.length > 0) {
        console.log(
          `   إسناد '${permId}' للأدوار: ${toInsert.map(item => item.roleId).join(", ")}`
        );
        await db.insert(schema.rolePermissions).values(toInsert);
      } else {
        console.log(`   ✨ الصلاحية '${permId}' مسندة مسبقاً للأدوار المستهدفة.`);
      }
    }

    // 5. تحديث مصفوفة JSON للرول projects_office
    console.log("\n⏳ 5. مزامنة مصفوفة الصلاحيات لرول projects_office...");
    const [allPoPerms] = await connection.query(
      "SELECT DISTINCT `permission_id` FROM `role_permissions` WHERE `role_id` = 'projects_office'"
    );
    if (allPoPerms && allPoPerms.length > 0) {
      const permsList = allPoPerms.map(r => r.permission_id);
      await connection.query(
        "UPDATE `roles` SET `description` = ? WHERE `id` = 'projects_office' AND `description` IS NOT NULL",
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
    await connection.end();
  }
}

run();
