import mysql from "mysql2/promise";
import * as dotenv from "dotenv";
import { fileURLToPath } from "url";
import path from "path";

// تحميل متغيرات البيئة من ملف .env في المجلد الجذر
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, ".env") });

// الأدوار المستهدفة
const TARGET_ROLES = [
  { id: "system_admin", nameAr: "مدير النظام" },
  { id: "super_admin", nameAr: "المدير العام" },
  { id: "general_manager", nameAr: "المدير العام / المدير التنفيذي" },
  { id: "financial", nameAr: "الإدارة المالية" },
  { id: "financial_manager", nameAr: "المدير المالي" },
  { id: "projects_office", nameAr: "مكتب المشاريع" },
];

// الصلاحيات المستهدفة
const TARGET_PERMISSIONS = [
  {
    id: "projects.edit_support_and_fees",
    nameAr: "تعديل بيانات الداعمين والأجور الإدارية",
    nameEn: "Edit Sponsors and Admin Fees",
    moduleId: "projects",
    action: "edit_support_and_fees",
  },
  {
    id: "projects.add_receipt_voucher",
    nameAr: "إضافة سند صرف",
    nameEn: "Add Receipt Voucher",
    moduleId: "projects",
    action: "add_receipt_voucher",
  },
];

async function seed() {
  console.log("==================================================================");
  console.log("🌱 بدء تنفيذ سكربت إضافة صلاحيات المشاريع وسندات الصرف للأدوار...");
  console.log("==================================================================\n");

  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error("❌ خطأ: متغير البيئة DATABASE_URL غير موجود في ملف .env!");
    process.exit(1);
  }

  let connection;
  try {
    connection = await mysql.createConnection(dbUrl);
    console.log("✅ تم الاتصال بقاعدة البيانات بنجاح.\n");

    // 1. التأكد من وجود وحدة المشاريع (projects) في جدول modules
    const [existingModule] = await connection.query(
      "SELECT id FROM `modules` WHERE `id` = 'projects' LIMIT 1;"
    );
    if (existingModule.length === 0) {
      await connection.query(
        "INSERT INTO `modules` (`id`, `name_ar`, `name_en`, `description`, `icon`) VALUES ('projects', 'المشاريع', 'Projects', 'إدارة المشاريع ومتابعة التنفيذ', 'FolderKanban');"
      );
      console.log("✅ تم إنشاء وحدة 'projects' في جدول modules.");
    }

    // 2. إدراج أو تحديث الصلاحيات في جدول permissions
    console.log("📌 1) التحقق من وجود الصلاحيات في جدول `permissions`:");
    for (const perm of TARGET_PERMISSIONS) {
      const [existingPerm] = await connection.query(
        "SELECT id FROM `permissions` WHERE `id` = ? LIMIT 1;",
        [perm.id]
      );

      if (existingPerm.length === 0) {
        await connection.query(
          "INSERT INTO `permissions` (`id`, `name_ar`, `name_en`, `module_id`, `action`) VALUES (?, ?, ?, ?, ?);",
          [perm.id, perm.nameAr, perm.nameEn, perm.moduleId, perm.action]
        );
        console.log(`   ➕ تم إنشاء الصلاحية: [${perm.id}] - ${perm.nameAr}`);
      } else {
        await connection.query(
          "UPDATE `permissions` SET `name_ar` = ?, `name_en` = ?, `module_id` = ?, `action` = ? WHERE `id` = ?;",
          [perm.nameAr, perm.nameEn, perm.moduleId, perm.action, perm.id]
        );
        console.log(`   ✔️ الصلاحية موجودة ومحدثة: [${perm.id}] - ${perm.nameAr}`);
      }
    }
    console.log("");

    // 3. إسناد الصلاحيات للأدوار المستهدفة في جدول role_permissions
    console.log("📌 2) إسناد الصلاحيات للأدوار في جدول `role_permissions`:");
    for (const role of TARGET_ROLES) {
      // التحقق من وجود الدور في جدول roles
      const [roleInDb] = await connection.query(
        "SELECT id, name_ar, description FROM `roles` WHERE `id` = ? LIMIT 1;",
        [role.id]
      );

      if (roleInDb.length === 0) {
        console.log(`   ⚠️ الدور [${role.id}] غير مسجل في جدول roles، سيتم تخطيه.`);
        continue;
      }

      console.log(`\n   🔹 الدور: ${role.nameAr} (${role.id})`);

      for (const perm of TARGET_PERMISSIONS) {
        const [existingMapping] = await connection.query(
          "SELECT * FROM `role_permissions` WHERE `role_id` = ? AND `permission_id` = ? LIMIT 1;",
          [role.id, perm.id]
        );

        if (existingMapping.length === 0) {
          await connection.query(
            "INSERT INTO `role_permissions` (`role_id`, `permission_id`) VALUES (?, ?);",
            [role.id, perm.id]
          );
          console.log(`      ✅ تم ربط الصلاحية: ${perm.nameAr}`);
        } else {
          console.log(`      ✔️ الصلاحية مرتبطة مسبقاً: ${perm.nameAr}`);
        }
      }

      // إذا كان الدور يستخدم حقل description كـ JSON array لتخزين الصلاحيات (مثل بعض الأدوار المخصصة)، نقوم بتحديثه أيضاً
      if (roleInDb[0].description) {
        try {
          const parsed = JSON.parse(roleInDb[0].description);
          if (Array.isArray(parsed)) {
            let updated = false;
            for (const perm of TARGET_PERMISSIONS) {
              if (!parsed.includes(perm.id)) {
                parsed.push(perm.id);
                updated = true;
              }
            }
            if (updated) {
              await connection.query(
                "UPDATE `roles` SET `description` = ? WHERE `id` = ?;",
                [JSON.stringify(parsed), role.id]
              );
              console.log(`      📝 تم تحديث قائمة الصلاحيات في حقل description للدور.`);
            }
          }
        } catch (_) {
          // إذا لم يكن JSON صالح نتجاهله
        }
      }
    }

    console.log("\n==================================================================");
    console.log("🎉 اكتمل تنفيذ الـ Seed بنجاح! تم منح الصلاحيات المطلوبة لكافة الأدوار.");
    console.log("==================================================================");
  } catch (error) {
    console.error("❌ حدث خطأ أثناء تنفيذ السكربت:", error);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

seed().catch((err) => {
  console.error("❌ فشل تشغيل السكربت:", err);
  process.exit(1);
});
