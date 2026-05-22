import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import * as schema from "./drizzle/schema.ts";
import * as dotenv from "dotenv";

dotenv.config();

const connection = await mysql.createConnection(process.env.DATABASE_URL);
const db = drizzle(connection, { schema, mode: 'default' });

async function seedBanksAndBOQ() {
  console.log("🚀 بدء حقن البنوك وتصنيفات جداول الكميات...");

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
      await db.insert(schema.categories).values(bank).onDuplicateKeyUpdate({
        set: { isActive: true }
      });
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
      await db.insert(schema.categories).values(boq).onDuplicateKeyUpdate({
        set: { isActive: true }
      });
    }

    console.log("✅ تمت عملية الحقن بنجاح!");

  } catch (error) {
    console.error("❌ حدث خطأ أثناء الحقن:", error);
  } finally {
    await connection.end();
  }
}

seedBanksAndBOQ();
