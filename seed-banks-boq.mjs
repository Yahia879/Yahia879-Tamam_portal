import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import * as schema from "./drizzle/schema.ts";
import { and, eq } from "drizzle-orm";
import * as dotenv from "dotenv";

dotenv.config();

const connection = await mysql.createConnection(process.env.DATABASE_URL);
const db = drizzle(connection, { schema, mode: 'default' });

async function seedBanksAndBOQ() {
  console.log("🚀 بدء حقن البنوك وتصنيفات ووحدات جداول الكميات والمدن في جدول categories...");

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

    // 3. المدن (20 مدينة سعودية) في جدول categories
    console.log("🏙️ حقن المدن (20 مدينة سعودية)...");
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
      } else {
        await db
          .update(schema.categories)
          .set({ nameAr: city.nameAr, isActive: true })
          .where(eq(schema.categories.id, existing.id));
      }
    }

    // 4. وحدات جداول الكميات (10 وحدات) في جدول categories
    console.log("📏 حقن وحدات جداول الكميات (10 وحدات)...");
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
      } else {
        await db
          .update(schema.categories)
          .set({ nameAr: unit.nameAr, isActive: true })
          .where(eq(schema.categories.id, existing.id));
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
