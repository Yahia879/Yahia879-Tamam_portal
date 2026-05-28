import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import * as schema from "./drizzle/schema.ts";
import { and, eq } from "drizzle-orm";
import * as dotenv from "dotenv";

dotenv.config();

const connection = await mysql.createConnection(process.env.DATABASE_URL);
const db = drizzle(connection, { schema, mode: 'default' });

async function seedCitiesAndUnits() {
  console.log("🚀 بدء حقن المدن السعودية الـ 20 ووحدات القياس الـ 10 في جدول categories...");

  try {
    // 1. حقن المدن (20 مدينة سعودية) في جدول categories
    console.log("🏙️ 1. حقن المدن السعودية الـ 20...");
    const citiesList = [
      { name: "Abha", nameAr: "أبها", type: "city", isActive: true },
      { name: "Khamis Mushait", nameAr: "خميس مشيط", type: "city", isActive: true },
      { name: "Riyadh", nameAr: "الرياض", type: "city", isActive: true },
      { name: "Jeddah", nameAr: "جدة", type: "city", isActive: true },
      { name: "Makkah", nameAr: "مكة المكرمة", type: "city", isActive: true },
      { name: "Madinah", nameAr: "المدينة المنورة", type: "city", isActive: true },
      { name: "Dammam", nameAr: "الدمام", type: "city", isActive: true },
      { name: "Khobar", nameAr: "الخبر", type: "city", isActive: true },
      { name: "Jubail", nameAr: "الجبيل", type: "city", isActive: true },
      { name: "Hofuf", nameAr: "الهفوف", type: "city", isActive: true },
      { name: "Taif", nameAr: "الطائف", type: "city", isActive: true },
      { name: "Tabuk", nameAr: "تبوك", type: "city", isActive: true },
      { name: "Buraydah", nameAr: "بريدة", type: "city", isActive: true },
      { name: "Hail", nameAr: "حائل", type: "city", isActive: true },
      { name: "Najran", nameAr: "نجران", type: "city", isActive: true },
      { name: "Jazan", nameAr: "جازان", type: "city", isActive: true },
      { name: "Al Bahah", nameAr: "الباحة", type: "city", isActive: true },
      { name: "Arar", nameAr: "عرعر", type: "city", isActive: true },
      { name: "Al Jouf", nameAr: "الجوف", type: "city", isActive: true },
      { name: "Yanbu", nameAr: "ينبع", type: "city", isActive: true }
    ];

    for (const city of citiesList) {
      const [existing] = await db
        .select()
        .from(schema.categories)
        .where(
          and(
            eq(schema.categories.type, "city"),
            eq(schema.categories.name, city.name)
          )
        )
        .limit(1);

      if (!existing) {
        await db.insert(schema.categories).values(city);
        console.log(`   ✅ تم حقن مدينة: ${city.nameAr}`);
      } else {
        await db
          .update(schema.categories)
          .set({ nameAr: city.nameAr, isActive: true })
          .where(eq(schema.categories.id, existing.id));
      }
    }

    // 2. وحدات جداول الكميات (10 وحدات) في جدول categories
    console.log("📏 2. حقن وحدات جداول الكميات الـ 10...");
    const unitsList = [
      { name: "Meter", nameAr: "متر", type: "boq_unit", isActive: true },
      { name: "Square Meter", nameAr: "متر مربع", type: "boq_unit", isActive: true },
      { name: "Cubic Meter", nameAr: "متر مكعب", type: "boq_unit", isActive: true },
      { name: "Kilogram", nameAr: "كيلوغرام", type: "boq_unit", isActive: true },
      { name: "Ton", nameAr: "طن", type: "boq_unit", isActive: true },
      { name: "Piece", nameAr: "حبة", type: "boq_unit", isActive: true },
      { name: "Set", nameAr: "طقم", type: "boq_unit", isActive: true },
      { name: "Liter", nameAr: "لتر", type: "boq_unit", isActive: true },
      { name: "Lump Sum", nameAr: "مقطوعية", type: "boq_unit", isActive: true },
      { name: "Box", nameAr: "كرتون", type: "boq_unit", isActive: true }
    ];

    for (const unit of unitsList) {
      const [existing] = await db
        .select()
        .from(schema.categories)
        .where(
          and(
            eq(schema.categories.type, "boq_unit"),
            eq(schema.categories.name, unit.name)
          )
        )
        .limit(1);

      if (!existing) {
        await db.insert(schema.categories).values(unit);
        console.log(`   ✅ تم حقن وحدة قياس: ${unit.nameAr}`);
      } else {
        await db
          .update(schema.categories)
          .set({ nameAr: unit.nameAr, isActive: true })
          .where(eq(schema.categories.id, existing.id));
      }
    }

    console.log("🎉 تم حقن المدن والوحدات في جدول categories بنجاح تام!");

  } catch (error) {
    console.error("❌ حدث خطأ أثناء حقن المدن والوحدات:", error);
  } finally {
    await connection.end();
  }
}

seedCitiesAndUnits();
