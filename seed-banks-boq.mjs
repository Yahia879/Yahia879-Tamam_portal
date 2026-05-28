import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import * as schema from "./drizzle/schema.ts";
import { and, eq } from "drizzle-orm";
import * as dotenv from "dotenv";

dotenv.config();

const connection = await mysql.createConnection(process.env.DATABASE_URL);
const db = drizzle(connection, { schema, mode: 'default' });

async function seedBanksAndBOQ() {
  console.log("🚀 بدء حقن البنوك وتصنيفات ووحدات جداول الكميات والمدن...");

  try {
    // 1. البنوك
    console.log("🏦 حقن البنوك الأساسية...");
    const banksList = [
      { name: "Al Ahli Bank", nameAr: "البنك الأهلي السعودي", type: "bank", isActive: true },
      { name: "Al Rajhi Bank", nameAr: "مصرف الراجحي", type: "bank", isActive: true },
      { name: "Riyad Bank", nameAr: "بنك الرياض", type: "bank", isActive: true },
      { name: "Banque Saudi Fransi", nameAr: "البنك السعودي الفرنسي", type: "bank", isActive: true },
      { name: "SABB", nameAr: "البنك السعودي البريطاني (ساب)", type: "bank", isActive: true },
      { name: "Bank Albilad", nameAr: "بنك البلاد", type: "bank", isActive: true },
      { name: "Bank AlJazira", nameAr: "بنك الجزيرة", type: "bank", isActive: true },
      { name: "Arab National Bank", nameAr: "البنك العربي الوطني", type: "bank", isActive: true },
      { name: "Alinma Bank", nameAr: "بنك الإنماء", type: "bank", isActive: true },
      { name: "Alinma Bank (Masraf)", nameAr: "مصرف الإنماء", type: "bank", isActive: true },
      { name: "Gulf International Bank", nameAr: "بنك الخليج الدولي", type: "bank", isActive: true },
      { name: "The Saudi Investment Bank", nameAr: "بنك الاستثمار السعودي", type: "bank", isActive: true }
    ];

    for (const bank of banksList) {
      const [existing] = await db
        .select()
        .from(schema.categories)
        .where(
          and(
            eq(schema.categories.type, "bank"),
            eq(schema.categories.name, bank.name)
          )
        )
        .limit(1);

      if (!existing) {
        await db.insert(schema.categories).values(bank);
      } else {
        await db
          .update(schema.categories)
          .set({ nameAr: bank.nameAr, isActive: true })
          .where(eq(schema.categories.id, existing.id));
      }
    }

    // 2. تصنيفات جداول الكميات
    console.log("📋 حقن تصنيفات جداول الكميات الأساسية...");
    const boqCategoriesList = [
      { name: "Construction Works", nameAr: "أعمال إنشائية", type: "boq_category", isActive: true },
      { name: "Electrical Works", nameAr: "أعمال كهربائية", type: "boq_category", isActive: true },
      { name: "Plumbing Works", nameAr: "أعمال سباكة", type: "boq_category", isActive: true },
      { name: "HVAC", nameAr: "تكييف وتبريد", type: "boq_category", isActive: true },
      { name: "Finishing Works", nameAr: "تشطيبات", type: "boq_category", isActive: true },
      { name: "Carpentry Works", nameAr: "نجارة", type: "boq_category", isActive: true },
      { name: "Painting Works", nameAr: "دهانات", type: "boq_category", isActive: true },
      { name: "Flooring Works", nameAr: "أرضيات", type: "boq_category", isActive: true }
    ];

    for (const boq of boqCategoriesList) {
      const [existing] = await db
        .select()
        .from(schema.categories)
        .where(
          and(
            eq(schema.categories.type, "boq_category"),
            eq(schema.categories.name, boq.name)
          )
        )
        .limit(1);

      if (!existing) {
        await db.insert(schema.categories).values(boq);
      } else {
        await db
          .update(schema.categories)
          .set({ nameAr: boq.nameAr, isActive: true })
          .where(eq(schema.categories.id, existing.id));
      }
    }

    // 3. المدن (20 مدينة سعودية)
    console.log("🏙️ حقن المدن (20 مدينة سعودية)...");
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
      } else {
        await db
          .update(schema.categoryValues)
          .set({ valueAr: city.valueAr, isActive: true })
          .where(eq(schema.categoryValues.id, existing.id));
      }
    }

    // 4. وحدات جداول الكميات (10 وحدات)
    console.log("📏 حقن وحدات جداول الكميات (10 وحدات)...");
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
      } else {
        await db
          .update(schema.categoryValues)
          .set({ valueAr: unit.valueAr, isActive: true })
          .where(eq(schema.categoryValues.id, existing.id));
      }
    }

    console.log("✅ تمت عملية الحقن بنجاح!");

  } catch (error) {
    console.error("❌ حدث خطأ أثناء الحقن:", error);
  } finally {
    await connection.end();
  }
}

seedBanksAndBOQ();
