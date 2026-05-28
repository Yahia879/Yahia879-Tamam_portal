import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import * as schema from "./drizzle/schema.ts";
import { and, eq } from "drizzle-orm";
import * as dotenv from "dotenv";

dotenv.config();

const connection = await mysql.createConnection(process.env.DATABASE_URL);
const db = drizzle(connection, { schema, mode: 'default' });

async function seedLatestUpdates() {
  console.log("🚀 بدء حقن التعديلات والإضافات الأخيرة فقط...");

  try {
    // 1. تحديث صلاحيات الأدوار المحددة (Role Permissions Delta Updates)
    console.log("🔗 1. تحديث صلاحيات الأدوار (الفريق الميداني ومدير المشروع)...");
    const rolePermUpdates = [
      { roleId: "field_team", permissionId: "requests.edit" },
      { roleId: "project_manager", permissionId: "disbursements.create" },
      { roleId: "project_manager", permissionId: "disbursements.edit" },
      { roleId: "project_manager", permissionId: "contracts.view" },
      { roleId: "project_manager", permissionId: "contracts.create" },
      { roleId: "project_manager", permissionId: "contracts.edit" },
      { roleId: "project_manager", permissionId: "suppliers.view" }
    ];

    for (const item of rolePermUpdates) {
      // التأكد من وجود الصلاحية في جدول الصلاحيات أولاً لتجنب أي تعارض
      const [permExists] = await db
        .select()
        .from(schema.permissions)
        .where(eq(schema.permissions.id, item.permissionId))
        .limit(1);

      if (permExists) {
        const [existing] = await db
          .select()
          .from(schema.rolePermissions)
          .where(
            and(
              eq(schema.rolePermissions.roleId, item.roleId),
              eq(schema.rolePermissions.permissionId, item.permissionId)
            )
          )
          .limit(1);

        if (!existing) {
          await db.insert(schema.rolePermissions).values(item);
          console.log(`   ✅ تم إسناد الصلاحية: ${item.permissionId} -> للدور: ${item.roleId}`);
        } else {
          console.log(`   ℹ️ الصلاحية ${item.permissionId} مسندة مسبقاً للدور ${item.roleId}`);
        }
      } else {
        console.warn(`   ⚠️ تحذير: الصلاحية ${item.permissionId} غير موجودة بجدول الصلاحيات!`);
      }
    }

    // 2. حقن المدن (20 مدينة سعودية)
    console.log("🏙️ 2. حقن المدن السعودية الـ 20...");
    let cityCatId;
    const [existingCityCat] = await db
      .select()
      .from(schema.categories)
      .where(eq(schema.categories.type, "city"))
      .limit(1);

    if (!existingCityCat) {
      const [res] = await db
        .insert(schema.categories)
        .values({ name: "City", nameAr: "المدن", type: "city", isActive: true });
      cityCatId = res.insertId;
    } else {
      cityCatId = existingCityCat.id;
      await db
        .update(schema.categories)
        .set({ isActive: true })
        .where(eq(schema.categories.id, cityCatId));
    }

    const citiesList = [
      { categoryId: cityCatId, value: "Abha", valueAr: "أبها", isActive: true },
      { categoryId: cityCatId, value: "Khamis Mushait", valueAr: "خميس مشيط", isActive: true },
      { categoryId: cityCatId, value: "Riyadh", valueAr: "الرياض", isActive: true },
      { categoryId: cityCatId, value: "Jeddah", valueAr: "جدة", isActive: true },
      { categoryId: cityCatId, value: "Makkah", valueAr: "مكة المكرمة", isActive: true },
      { categoryId: cityCatId, value: "Madinah", valueAr: "المدينة المنورة", isActive: true },
      { categoryId: cityCatId, value: "Dammam", valueAr: "الدمام", isActive: true },
      { categoryId: cityCatId, value: "Khobar", valueAr: "الخبر", isActive: true },
      { categoryId: cityCatId, value: "Jubail", valueAr: "الجبيل", isActive: true },
      { categoryId: cityCatId, value: "Hofuf", valueAr: "الهفوف", isActive: true },
      { categoryId: cityCatId, value: "Taif", valueAr: "الطائف", isActive: true },
      { categoryId: cityCatId, value: "Tabuk", valueAr: "تبوك", isActive: true },
      { categoryId: cityCatId, value: "Buraydah", valueAr: "بريدة", isActive: true },
      { categoryId: cityCatId, value: "Hail", valueAr: "حائل", isActive: true },
      { categoryId: cityCatId, value: "Najran", valueAr: "نجران", isActive: true },
      { categoryId: cityCatId, value: "Jazan", valueAr: "جازان", isActive: true },
      { categoryId: cityCatId, value: "Al Bahah", valueAr: "الباحة", isActive: true },
      { categoryId: cityCatId, value: "Arar", valueAr: "عرعر", isActive: true },
      { categoryId: cityCatId, value: "Al Jouf", valueAr: "الجوف", isActive: true },
      { categoryId: cityCatId, value: "Yanbu", valueAr: "ينبع", isActive: true }
    ];

    for (const city of citiesList) {
      const [existing] = await db
        .select()
        .from(schema.categoryValues)
        .where(
          and(
            eq(schema.categoryValues.categoryId, city.categoryId),
            eq(schema.categoryValues.value, city.value)
          )
        )
        .limit(1);

      if (!existing) {
        await db.insert(schema.categoryValues).values(city);
        console.log(`   ✅ تم حقن مدينة: ${city.valueAr}`);
      } else {
        await db
          .update(schema.categoryValues)
          .set({ valueAr: city.valueAr, isActive: true })
          .where(eq(schema.categoryValues.id, existing.id));
      }
    }

    // 3. وحدات جداول الكميات (10 وحدات)
    console.log("📏 3. حقن وحدات جداول الكميات الـ 10...");
    let boqUnitCatId;
    const [existingBoqUnitCat] = await db
      .select()
      .from(schema.categories)
      .where(eq(schema.categories.type, "boq_unit"))
      .limit(1);

    if (!existingBoqUnitCat) {
      const [res] = await db
        .insert(schema.categories)
        .values({ name: "BOQ Unit", nameAr: "وحدات جداول الكميات", type: "boq_unit", isActive: true });
      boqUnitCatId = res.insertId;
    } else {
      boqUnitCatId = existingBoqUnitCat.id;
      await db
        .update(schema.categories)
        .set({ isActive: true })
        .where(eq(schema.categories.id, boqUnitCatId));
    }

    const unitsList = [
      { categoryId: boqUnitCatId, value: "Meter", valueAr: "متر", isActive: true },
      { categoryId: boqUnitCatId, value: "Square Meter", valueAr: "متر مربع", isActive: true },
      { categoryId: boqUnitCatId, value: "Cubic Meter", valueAr: "متر مكعب", isActive: true },
      { categoryId: boqUnitCatId, value: "Kilogram", valueAr: "كيلوغرام", isActive: true },
      { categoryId: boqUnitCatId, value: "Ton", valueAr: "طن", isActive: true },
      { categoryId: boqUnitCatId, value: "Piece", valueAr: "حبة", isActive: true },
      { categoryId: boqUnitCatId, value: "Set", valueAr: "طقم", isActive: true },
      { categoryId: boqUnitCatId, value: "Liter", valueAr: "لتر", isActive: true },
      { categoryId: boqUnitCatId, value: "Lump Sum", valueAr: "مقطوعية", isActive: true },
      { categoryId: boqUnitCatId, value: "Box", valueAr: "كرتون", isActive: true }
    ];

    for (const unit of unitsList) {
      const [existing] = await db
        .select()
        .from(schema.categoryValues)
        .where(
          and(
            eq(schema.categoryValues.categoryId, unit.categoryId),
            eq(schema.categoryValues.value, unit.value)
          )
        )
        .limit(1);

      if (!existing) {
        await db.insert(schema.categoryValues).values(unit);
        console.log(`   ✅ تم حقن وحدة قياس: ${unit.valueAr}`);
      } else {
        await db
          .update(schema.categoryValues)
          .set({ valueAr: unit.valueAr, isActive: true })
          .where(eq(schema.categoryValues.id, existing.id));
      }
    }

    console.log("🎉 تم دمج وتحديث التعديلات الأخيرة بنجاح تام!");

  } catch (error) {
    console.error("❌ حدث خطأ أثناء حقن التحديثات الأخيرة:", error);
  } finally {
    await connection.end();
  }
}

seedLatestUpdates();
