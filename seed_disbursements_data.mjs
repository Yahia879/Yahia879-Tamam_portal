import mysql from 'mysql2/promise';
import * as dotenv from 'dotenv';
dotenv.config();

// Function to sanitize strings from invisible Unicode markers/formatting characters
function sanitizeText(text) {
  return text ? text.replace(/[\u200B-\u200D\uFEFF\u202A-\u202E]/g, '').trim() : '';
}

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("❌ Error: DATABASE_URL is not defined in the environment.");
    process.exit(1);
  }

  console.log("🚀 Connecting to database to seed categories directly...");
  const conn = await mysql.createConnection(process.env.DATABASE_URL);

  try {
    // ==========================================
    // 1. قيم التمويل / الدعم (funding_support)
    // ==========================================
    console.log("\nSeeding funding support values...");
    const fundingSupportValues = [
      { value: 'donation_store', valueAr: 'متجر التبرعات', sortOrder: 1 },
      { value: 'ehsan_platform', valueAr: 'منصة إحسان', sortOrder: 2 },
      { value: 'direct_donation', valueAr: 'تبرع مباشر', sortOrder: 3 }
    ];

    for (const item of fundingSupportValues) {
      const valCode = sanitizeText(item.value);
      const valAr = sanitizeText(item.valueAr);
      
      const [existing] = await conn.execute(
        "SELECT id FROM categories WHERE type = 'funding_support' AND (name = ? OR nameAr = ?)",
        [valCode, valAr]
      );

      if (existing.length === 0) {
        await conn.execute(
          "INSERT INTO categories (name, nameAr, type, sortOrder, isActive) VALUES (?, ?, 'funding_support', ?, true)",
          [valCode, valAr, item.sortOrder]
        );
        console.log(`  ➕ Added: ${valAr} (${valCode})`);
      } else {
        await conn.execute(
          "UPDATE categories SET name = ?, nameAr = ?, sortOrder = ?, isActive = true WHERE id = ?",
          [valCode, valAr, item.sortOrder, existing[0].id]
        );
        console.log(`  🔄 Updated/Verified: ${valAr} (${valCode})`);
      }
    }

    // ==========================================
    // 2. مصارف التبرعات (donation_purposes)
    // ==========================================
    console.log("\nSeeding donation purposes values...");
    const donationPurposesValues = [
      { value: 'mosque_construction', valueAr: 'بناء المساجد', sortOrder: 1 },
      { value: 'renovation', valueAr: 'الترميم', sortOrder: 2 },
      { value: 'water_supply', valueAr: 'سقية الماء', sortOrder: 3 },
      { value: 'equipment', valueAr: 'التجهيزات', sortOrder: 4 }
    ];

    for (const item of donationPurposesValues) {
      const valCode = sanitizeText(item.value);
      const valAr = sanitizeText(item.valueAr);
      
      const [existing] = await conn.execute(
        "SELECT id FROM categories WHERE type = 'donation_purposes' AND (name = ? OR nameAr = ?)",
        [valCode, valAr]
      );

      if (existing.length === 0) {
        await conn.execute(
          "INSERT INTO categories (name, nameAr, type, sortOrder, isActive) VALUES (?, ?, 'donation_purposes', ?, true)",
          [valCode, valAr, item.sortOrder]
        );
        console.log(`  ➕ Added: ${valAr} (${valCode})`);
      } else {
        await conn.execute(
          "UPDATE categories SET name = ?, nameAr = ?, sortOrder = ?, isActive = true WHERE id = ?",
          [valCode, valAr, item.sortOrder, existing[0].id]
        );
        console.log(`  🔄 Updated/Verified: ${valAr} (${valCode})`);
      }
    }

    // ==========================================
    // 3. قيم اسم المشروع الرئيسي (main_projects)
    // ==========================================
    console.log("\nSeeding main project values...");
    const mainProjectsValues = [
      { value: 'purchases', valueAr: 'مشتريات', sortOrder: 1 },
      { value: 'insurance_contracts', valueAr: 'عقود تأمين', sortOrder: 2 },
      { value: 'custodies', valueAr: 'العهد', sortOrder: 3 },
      { value: 'rents', valueAr: 'الإيجارات', sortOrder: 4 },
      { value: 'salaries_bonuses', valueAr: 'رواتب ومكافآت', sortOrder: 5 },
      { value: 'admin_expenses', valueAr: 'مصاريف إدارية', sortOrder: 6 },
      { value: 'government_fees', valueAr: 'رسوم حكومية', sortOrder: 7 }
    ];

    for (const item of mainProjectsValues) {
      const valCode = sanitizeText(item.value);
      const valAr = sanitizeText(item.valueAr);
      
      const [existing] = await conn.execute(
        "SELECT id FROM categories WHERE type = 'main_projects' AND name = ?",
        [valCode]
      );

      if (existing.length === 0) {
        await conn.execute(
          "INSERT INTO categories (name, nameAr, type, sortOrder, isActive) VALUES (?, ?, 'main_projects', ?, true)",
          [valCode, valAr, item.sortOrder]
        );
        console.log(`  ➕ Added: ${valAr} (${valCode})`);
      } else {
        await conn.execute(
          "UPDATE categories SET nameAr = ?, sortOrder = ?, isActive = true WHERE id = ?",
          [valAr, item.sortOrder, existing[0].id]
        );
        console.log(`  🔄 Updated/Verified: ${valAr} (${valCode})`);
      }
    }

    // ==========================================
    // 3. قيم معلومات المفوتر (sadad_billers)
    // ==========================================
    console.log("\nSeeding SADAD biller values...");
    const sadadBillersValues = [
      { value: '001', valueAr: 'شركة الاتصالات السعودية (STC)' },
      { value: '004', valueAr: 'موبايلي' },
      { value: '130', valueAr: 'بوبا' },
      { value: '008', valueAr: 'زين السعودية' },
      { value: '002', valueAr: 'الشركة السعودية للطاقة' },
      { value: '013', valueAr: 'وزارة التجارة' },
      { value: '138', valueAr: 'شركة المياه الوطنية' },
      { value: '020', valueAr: 'هيئة الزكاة والضريبة والجمارك' },
      { value: '021', valueAr: 'البريد السعودي (سبل)' },
      { value: '022', valueAr: 'الخطوط الجوية العربية السعودية' },
      { value: '060', valueAr: 'المؤسسة العامة للتأمينات الاجتماعية' },
      { value: '279', valueAr: 'المركز السعودي للأعمال الاقتصادية' },
      { value: '368', valueAr: 'قوى' },
      { value: '903', valueAr: 'منصة تأميني' },
      { value: '040', valueAr: 'صندوق التنمية العقارية' },
      { value: '042', valueAr: 'هيئة الاتصالات وتقنية المعلومات' },
      { value: '085', valueAr: 'شركة علم المملكة العربية السعودية' },
      { value: '049', valueAr: 'الهيئة السعودية للمواصفات والمقاييس والجودة' },
      { value: '050', valueAr: 'وزارة العمل' },
      { value: '051', valueAr: 'وزارة الثقافة والإعلام' },
      { value: '058', valueAr: 'بنك التنمية الاجتماعية' },
      { value: '075', valueAr: 'وزارة النقل' },
      { value: '084', valueAr: 'أمانة منطقة عسير' },
      { value: '090', valueAr: 'وزارة الداخلية – الوافدين' },
      { value: '091', valueAr: 'وزارة الداخلية – رخص القيادة' },
      { value: '092', valueAr: 'وزارة الداخلية – الجوازات السعودية' },
      { value: '093', valueAr: 'وزارة الداخلية – المخالفات المرورية' },
      { value: '094', valueAr: 'وزارة الداخلية – المركبات' },
      { value: '096', valueAr: 'وزارة الداخلية (الأحوال المدنية، خدمات أبشر)' },
      { value: '144', valueAr: 'خدمات أعمالي (وزارة التجارة)' }
    ];

    for (let i = 0; i < sadadBillersValues.length; i++) {
      const item = sadadBillersValues[i];
      const valCode = sanitizeText(item.value);
      const valAr = sanitizeText(item.valueAr);
      const itemSortOrder = i + 1;

      const [existing] = await conn.execute(
        "SELECT id FROM categories WHERE type = 'sadad_billers' AND name = ?",
        [valCode]
      );

      if (existing.length === 0) {
        await conn.execute(
          "INSERT INTO categories (name, nameAr, type, sortOrder, isActive) VALUES (?, ?, 'sadad_billers', ?, true)",
          [valCode, valAr, itemSortOrder]
        );
        console.log(`  ➕ Added: ${valAr} (${valCode})`);
      } else {
        await conn.execute(
          "UPDATE categories SET nameAr = ?, sortOrder = ?, isActive = true WHERE id = ?",
          [valAr, itemSortOrder, existing[0].id]
        );
        console.log(`  🔄 Updated/Verified: ${valAr} (${valCode})`);
      }
    }

    console.log("\n🎉 Seeding completed successfully and safely!");

  } catch (error) {
    console.error("❌ Seeding failed with error:", error);
  } finally {
    await conn.end();
  }
}

main();
