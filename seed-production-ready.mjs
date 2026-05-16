import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import * as schema from "./drizzle/schema.ts";
import { sql } from "drizzle-orm";
import * as dotenv from "dotenv";
import crypto from "crypto";

dotenv.config();

// دالة تشفير كلمة المرور (PBKDF2)
function hashPassword(password, salt) {
  return crypto.pbkdf2Sync(password, salt, 1000, 64, "sha512").toString("hex");
}

function generateSalt() {
  return crypto.randomBytes(16).toString("hex");
}

const connection = await mysql.createConnection(process.env.DATABASE_URL);
const db = drizzle(connection, { schema, mode: 'default' });

async function seed() {
  console.log("🚀 بدء حقن البيانات الإنتاجية...");

  try {
    // 1. الأدوار (10 أدوار)
    console.log("👥 حقن الأدوار (10 أدوار)...");
    const rolesData = [
      { id: "super_admin", nameAr: "المدير العام", nameEn: "Super Admin", isSystem: true },
      { id: "system_admin", nameAr: "مدير نظام", nameEn: "System Admin", isSystem: true },
      { id: "financial_manager", nameAr: "المدير المالي", nameEn: "Financial Manager", isSystem: true },
      { id: "projects_office", nameAr: "مكتب المشاريع", nameEn: "Projects Office", isSystem: true },
      { id: "field_team", nameAr: "الفريق الميداني", nameEn: "Field Team", isSystem: true },
      { id: "quick_response", nameAr: "فريق الاستجابة السريعة", nameEn: "Quick Response Team", isSystem: true },
      { id: "financial", nameAr: "الإدارة المالية", nameEn: "Financial Management", isSystem: true },
      { id: "project_manager", nameAr: "مدير المشروع", nameEn: "Project Manager", isSystem: true },
      { id: "corporate_comm", nameAr: "الاتصال المؤسسي", nameEn: "Corporate Communications", isSystem: true },
      { id: "service_requester", nameAr: "طالب الخدمة", nameEn: "Service Requester", isSystem: true },
    ];

    for (const r of rolesData) {
      await db.insert(schema.roles).values(r).onDuplicateKeyUpdate({
        set: { nameAr: r.nameAr, nameEn: r.nameEn, isSystem: true }
      });
    }

    // 2. الوحدات (Modules)
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

    // 3. الصلاحيات (Permissions)
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

    // 4. إعدادات الجمعية الافتراضية
    console.log("🏢 حقن إعدادات الجمعية...");
    const orgSettings = {
      organizationName: "جمعية تمام للعناية بالمساجد",
      organizationNameShort: "تمام",
      licenseNumber: "1234",
      administrativeSupervisor: "وزارة الموارد البشرية والتنمية الاجتماعية",
      technicalSupervisor: "وزارة الشؤون الإسلامية والدعوة والإرشاد",
      boardChairmanName: "فهد بن محمد",
      executiveDirectorName: "أحمد بن علي",
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

    // 5. مفوض التوقيع
    console.log("✍️ حقن مفوض التوقيع...");
    const signatory = {
      name: "أحمد بن علي",
      title: "المدير التنفيذي",
      isDefault: true,
      isActive: true
    };
    await db.insert(schema.signatories).values(signatory).onDuplicateKeyUpdate({
      set: signatory
    });

    // 6. المدن (أبها وخميس مشيط)
    console.log("🏙️ حقن المدن...");
    const cityCategory = {
      name: "City",
      nameAr: "المدن",
      type: "city",
      isActive: true
    };
    
    // إدخال التصنيف أولاً أو تحديثه
    const [insertedCategory] = await db.insert(schema.categories).values(cityCategory).onDuplicateKeyUpdate({
      set: { isActive: true }
    });
    
    // للحصول على ID التصنيف (نحتاج لاستعلام لأن onDuplicateKeyUpdate لا يعيد ID دائماً في Drizzle)
    const categoryResult = await db.select().from(schema.categories).where(sql`${schema.categories.type} = 'city'`).limit(1);
    const categoryId = categoryResult[0].id;

    const cities = [
      { categoryId, value: "Abha", valueAr: "أبها", isActive: true },
      { categoryId, value: "Khamis Mushait", valueAr: "خميس مشيط", isActive: true }
    ];

    for (const city of cities) {
      await db.insert(schema.categoryValues).values(city).onDuplicateKeyUpdate({
        set: { isActive: true }
      });
    }

    // 7. قوالب العقود
    console.log("📜 حقن قوالب العقود...");
    const templates = [
      { name: "Supervision Contract", nameAr: "عقد إشراف هندسي", type: "supervision", isActive: true, isDefault: true },
      { name: "Construction Contract", nameAr: "عقد مقاولات إنشائية", type: "construction", isActive: true, isDefault: true },
      { name: "Supply Contract", nameAr: "عقد توريد", type: "supply", isActive: true, isDefault: true },
      { name: "Maintenance Contract", nameAr: "عقد صيانة", type: "maintenance", isActive: true, isDefault: true },
      { name: "Consulting Contract", nameAr: "عقد استشارات", type: "consulting", isActive: true, isDefault: true }
    ];

    for (const t of templates) {
      await db.insert(schema.contractTemplates).values(t).onDuplicateKeyUpdate({
        set: { isActive: true, isDefault: true }
      });
    }

    // 8. حساب المدير الافتراضي (Admin)
    console.log("🔑 إنشاء حساب المدير الافتراضي...");
    const adminEmail = "admin@tamam.sa";
    const adminPassword = "admin123";
    const salt = generateSalt();
    const passwordHash = `${salt}:${hashPassword(adminPassword, salt)}`;

    const adminUser = {
      email: adminEmail,
      passwordHash: passwordHash,
      name: "مدير النظام",
      role: "super_admin",
      status: "active",
      loginMethod: "local"
    };

    await db.insert(schema.users).values(adminUser).onDuplicateKeyUpdate({
      set: { passwordHash: passwordHash, role: "super_admin", status: "active" }
    });

    console.log("\n✅ تمت عملية حقن البيانات بنجاح!");
    console.log("-----------------------------------");
    console.log(`📧 البريد الإلكتروني: ${adminEmail}`);
    console.log(`🔑 كلمة المرور: ${adminPassword}`);
    console.log("-----------------------------------");

  } catch (error) {
    console.error("❌ حدث خطأ أثناء حقن البيانات:", error);
  } finally {
    await connection.end();
  }
}

seed();
