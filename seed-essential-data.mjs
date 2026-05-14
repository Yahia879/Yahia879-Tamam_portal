import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import * as schema from "./drizzle/schema.ts";
import { USER_ROLES } from "./shared/constants.ts";
import { STAGE_ACTION_CONFIG } from "./shared/stageActionConfig.ts";
import { sql } from "drizzle-orm";
import * as dotenv from "dotenv";

dotenv.config();

const connection = await mysql.createConnection(process.env.DATABASE_URL);
const db = drizzle(connection, { schema, mode: 'default' });

async function seed() {
  console.log("🌱 بدء حقن البيانات الأساسية...");

  try {
    // 1. حقن الوحدات (Modules)
    console.log("📦 حقن الوحدات...");
    const modulesData = [
      { id: "requests", nameAr: "الطلبات", nameEn: "Requests", icon: "FileText", displayOrder: 1 },
      { id: "mosques", nameAr: "المساجد", nameEn: "Mosques", icon: "Building2", displayOrder: 2 },
      { id: "projects", nameAr: "المشاريع", nameEn: "Projects", icon: "FolderKanban", displayOrder: 3 },
      { id: "users", nameAr: "المستخدمين", nameEn: "Users", icon: "Users", displayOrder: 4 },
      { id: "permissions", nameAr: "الصلاحيات", nameEn: "Permissions", icon: "Shield", displayOrder: 5 },
      { id: "finance", nameAr: "المالية", nameEn: "Finance", icon: "DollarSign", displayOrder: 6 },
      { id: "settings", nameAr: "الإعدادات", nameEn: "Settings", icon: "Settings", displayOrder: 7 },
      { id: "suppliers", nameAr: "الموردين", nameEn: "Suppliers", icon: "Truck", displayOrder: 8 },
      { id: "reports", nameAr: "التقارير", nameEn: "Reports", icon: "BarChart", displayOrder: 9 },
    ];

    for (const m of modulesData) {
      await db.insert(schema.modules).values(m).onDuplicateKeyUpdate({ 
        set: { nameAr: m.nameAr, nameEn: m.nameEn, icon: m.icon, displayOrder: m.displayOrder } 
      });
    }

    // 2. حقن الصلاحيات الأساسية (Permissions)
    console.log("🔐 حقن الصلاحيات...");
    const perms = [];
    modulesData.forEach(m => {
      ['view', 'create', 'edit', 'delete', 'approve'].forEach(action => {
        perms.push({
          id: `${m.id}.${action}`,
          moduleId: m.id,
          action,
          nameAr: `${action === 'view' ? 'عرض' : action === 'create' ? 'إضافة' : action === 'edit' ? 'تعديل' : action === 'delete' ? 'حذف' : 'اعتماد'} ${m.nameAr}`,
          nameEn: `${action} ${m.nameEn}`
        });
      });
    });

    for (const p of perms) {
      await db.insert(schema.permissions).values(p).onDuplicateKeyUpdate({ 
        set: { nameAr: p.nameAr, nameEn: p.nameEn, moduleId: p.moduleId, action: p.action } 
      });
    }

    // 3. حقن الأدوار في نظام الصلاحيات (Roles Table)
    console.log("👥 حقن الأدوار...");
    const rolesToInsert = Object.values(USER_ROLES).map(r => ({
      id: r.key,
      nameAr: r.label,
      nameEn: r.labelEn,
      isSystem: true,
      isActive: true
    }));

    for (const r of rolesToInsert) {
      await db.insert(schema.roles).values(r).onDuplicateKeyUpdate({ 
        set: { nameAr: r.nameAr, nameEn: r.nameEn, isSystem: true, isActive: true } 
      });
    }

    // 4. حقن إعدادات الإجراءات (Action Settings)
    console.log("⚙️ حقن إعدادات الإجراءات...");
    const actions = [];
    STAGE_ACTION_CONFIG.forEach(stage => {
      stage.actions.forEach((act, index) => {
        actions.push({
          actionCode: act.key,
          actionLabel: act.label,
          actionDescription: act.description,
          parentStage: stage.stage,
          order: index,
          route: act.route || null,
          requiredRoles: act.requiredRoles,
          isActive: true
        });
      });
    });

    for (const a of actions) {
      await db.insert(schema.actionSettings).values(a).onDuplicateKeyUpdate({ 
        set: { 
          actionLabel: a.actionLabel, 
          actionDescription: a.actionDescription, 
          parentStage: a.parentStage, 
          order: a.order, 
          route: a.route, 
          requiredRoles: a.requiredRoles 
        } 
      });
    }

    // 5. إعدادات الجمعية الافتراضية
    console.log("🏢 حقن إعدادات الجمعية...");
    const orgSettings = {
      organizationName: "جمعية تمام للعناية بالمساجد",
      organizationNameShort: "تمام",
      licenseNumber: "1234",
      city: "أبها",
      phone: "920000000",
      email: "info@tamam.sa",
      website: "https://tamam.sa",
      colorPrimary1: "#09707e",
      colorPrimary2: "#0891b2",
    };

    await db.insert(schema.organizationSettings).values(orgSettings).onDuplicateKeyUpdate({ 
      set: orgSettings 
    });

    console.log("✅ تم حقن البيانات الأساسية بنجاح!");
  } catch (error) {
    console.error("❌ حدث خطأ أثناء حقن البيانات:", error);
  } finally {
    await connection.end();
  }
}

seed();
