import "dotenv/config";
import { getDb } from "./server/db";
import { modules, permissions, roles, rolePermissions, users, userPermissions } from "./drizzle/schema";
import { eq, and, inArray } from "drizzle-orm";

/**
 * ملف Seed لتأسيس وتوزيع الصلاحيات المطلوبة للأدوار والمستخدمين:
 * 1. صلاحية "اعتماد العقود" (contracts.approve) لـ: super_admin, system_admin, financial, projects_office
 * 2. صلاحية "توقيع طلبات الصرف" (disbursements.sign) لـ: super_admin, system_admin, financial, projects_office
 * 3. صلاحية "توقيع التقرير الختامي" (final_reports.sign) لـ: super_admin, system_admin, corporate_comm
 */

interface PermissionConfig {
  id: string;
  moduleId: string;
  action: string;
  nameAr: string;
  nameEn: string;
  targetRoles: string[];
}

const PERMISSIONS_TO_SEED: PermissionConfig[] = [
  {
    id: "contracts.approve",
    moduleId: "contracts",
    action: "approve",
    nameAr: "اعتماد العقود",
    nameEn: "Approve Contracts",
    targetRoles: ["super_admin", "system_admin", "financial", "projects_office"],
  },
  {
    id: "disbursements.sign",
    moduleId: "disbursements",
    action: "sign",
    nameAr: "توقيع طلبات الصرف",
    nameEn: "Sign Disbursement Requests",
    targetRoles: ["super_admin", "system_admin", "financial", "projects_office"],
  },
  {
    id: "final_reports.sign",
    moduleId: "requests",
    action: "final_reports_sign",
    nameAr: "توقيع التقارير الختامية",
    nameEn: "Sign Final Reports",
    targetRoles: ["super_admin", "system_admin", "corporate_comm"],
  },
  {
    id: "board_chairman",
    moduleId: "board",
    action: "board_chairman",
    nameAr: "صلاحية رئيس مجلس الإدارة (عرض لوحة الإحصائيات القيادية و اعتماد التحويل البنكي والاعتمادات العليا)",
    nameEn: "Board Chairman Permission",
    targetRoles: ["super_admin", "system_admin", "board_chairman"],
  },
  {
    id: "board_member",
    moduleId: "board",
    action: "board_member",
    nameAr: "صلاحية عضو مجلس الإدارة (عرض لوحة الإحصائيات القيادية)",
    nameEn: "Board Member Permission",
    targetRoles: ["super_admin", "system_admin", "board_chairman", "board_member"],
  },
];

async function seed() {
  console.log("🚀 بداية تشغيل ملف الـ Seed لتأكيد الصلاحيات المطلوبة...");

  const db = await getDb();
  if (!db) {
    console.error("❌ فشل الاتصال بقاعدة البيانات. تحقّق من متغيرات البيئة DATABASE_URL.");
    process.exit(1);
  }

  for (const perm of PERMISSIONS_TO_SEED) {
    console.log(`\n----------------------------------------`);
    console.log(`📌 معالجة صلاحية: [${perm.id}] - ${perm.nameAr}`);

    // 0. التأكد من وجود الموديول في جدول modules
    const [existingModule] = await db
      .select({ id: modules.id })
      .from(modules)
      .where(eq(modules.id, perm.moduleId))
      .limit(1);

    if (!existingModule) {
      await db.insert(modules).values({
        id: perm.moduleId,
        nameAr: perm.moduleId === "requests" ? "الطلبات والتقارير" : (perm.moduleId === "contracts" ? "العقود" : "طلبات الصرف"),
        nameEn: perm.moduleId,
        displayOrder: 1,
        isActive: true,
      });
      console.log(`  ✓ تم إنشاء الموديول [${perm.moduleId}] في جدول modules.`);
    }

    // 1. التأكد من وجود الصلاحية في جدول permissions
    const existingPerm = await db
      .select({ id: permissions.id })
      .from(permissions)
      .where(eq(permissions.id, perm.id))
      .limit(1);

    if (existingPerm.length === 0) {
      await db.insert(permissions).values({
        id: perm.id,
        moduleId: perm.moduleId,
        action: perm.action,
        nameAr: perm.nameAr,
        nameEn: perm.nameEn,
        description: `صلاحية ${perm.nameAr}`,
      });
      console.log(`  ✓ تم إضافة الصلاحية [${perm.id}] لجدول permissions.`);
    } else {
      console.log(`  ℹ الصلاحية [${perm.id}] موجودة مسبقاً في جدول permissions.`);
    }

    // 2. منح الصلاحية للأدوار المستهدفة في جدول role_permissions
    for (const roleId of perm.targetRoles) {
      // التأكد أولاً من وجود الدور في جدول roles
      const [existingRole] = await db
        .select({ id: roles.id })
        .from(roles)
        .where(eq(roles.id, roleId))
        .limit(1);

      if (!existingRole) {
        const roleNamesAr: Record<string, string> = {
          board_chairman: "رئيس مجلس الإدارة",
          board_member: "عضو مجلس الإدارة",
        };
        const roleNamesEn: Record<string, string> = {
          board_chairman: "Board Chairman",
          board_member: "Board Member",
        };
        // إنشاء الدور الافتراضي إن لم يكن موجوداً
        await db.insert(roles).values({
          id: roleId,
          nameAr: roleNamesAr[roleId] || roleId,
          nameEn: roleNamesEn[roleId] || roleId,
          isSystem: true,
          isActive: true,
        });
        console.log(`  ✓ تم إنشاء الدور [${roleId}] في جدول roles.`);
      }

      // الربط في جدول role_permissions
      const existingRolePerm = await db
        .select({ id: rolePermissions.id })
        .from(rolePermissions)
        .where(
          and(
            eq(rolePermissions.roleId, roleId),
            eq(rolePermissions.permissionId, perm.id)
          )
        )
        .limit(1);

      if (existingRolePerm.length === 0) {
        await db.insert(rolePermissions).values({
          roleId,
          permissionId: perm.id,
        });
        console.log(`  ✓ تم منح الصلاحية [${perm.id}] للدور [${roleId}].`);
      } else {
        console.log(`  ℹ الدور [${roleId}] يملك الصلاحية [${perm.id}] مسبقاً.`);
      }
    }

    // 3. منح الصلاحية بشكل مباشر للمستخدمين أصحاب هذه الأدوار لضمان الفاعلية الفورية
    const targetUsers = await db
      .select({ id: users.id, name: users.name, role: users.role })
      .from(users)
      .where(inArray(users.role, perm.targetRoles as any));

    console.log(`  👥 جاري مزامنة الصلاحية مع (${targetUsers.length}) مستخدم تنطبق عليهم الأدوار...`);

    for (const u of targetUsers) {
      const existingUserPerm = await db
        .select({ id: userPermissions.id })
        .from(userPermissions)
        .where(
          and(
            eq(userPermissions.userId, u.id),
            eq(userPermissions.permissionId, perm.id)
          )
        )
        .limit(1);

      if (existingUserPerm.length === 0) {
        await db.insert(userPermissions).values({
          userId: u.id,
          permissionId: perm.id,
          granted: true,
          reason: `تأصيل وتفعيل تلقائي لصلاحية ${perm.nameAr}`,
        });
        console.log(`    + تم منح الصلاحية للمستخدم: ${u.name} (ID: ${u.id})`);
      }
    }
  }

  console.log(`\n========================================`);
  console.log("🎉 اكمل ملف الـ Seed عمله بنجاح وتم تثبيت كافة الصلاحيات على السيرفر!");
  console.log("========================================\n");
  process.exit(0);
}

seed().catch((err) => {
  console.error("❌ حدث خطأ غير متوقع أثناء تنفيذ الـ Seed:", err);
  process.exit(1);
});
