import mysql from 'mysql2/promise';
import * as dotenv from 'dotenv';
dotenv.config();

// Function to sanitize strings from invisible Unicode markers/formatting characters
function sanitizeText(text) {
  return text.replace(/[\u200B-\u200D\uFEFF\u202A-\u202E]/g, '').trim();
}

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("❌ Error: DATABASE_URL is not defined in the environment.");
    process.exit(1);
  }

  console.log("Connecting to database to seed SADAD billers...");
  const conn = await mysql.createConnection(process.env.DATABASE_URL);

  // 1. Get or create the 'sadad_billers' category
  const categoryType = 'sadad_billers';
  const categoryName = 'sadad_billers';
  const categoryNameAr = 'معلومات المفوتر';
  const sortOrder = 7;

  const [existingCategory] = await conn.execute(
    'SELECT id FROM categories WHERE type = ?',
    [categoryType]
  );

  let categoryId;
  if (existingCategory.length === 0) {
    const [insertResult] = await conn.execute(
      'INSERT INTO categories (name, nameAr, type, sortOrder, isActive) VALUES (?, ?, ?, ?, true)',
      [categoryName, categoryNameAr, categoryType, sortOrder]
    );
    categoryId = insertResult.insertId;
    console.log(`✅ Created category: ${categoryNameAr}`);
  } else {
    categoryId = existingCategory[0].id;
    console.log(`⏭️ Category already exists: ${categoryNameAr}`);
  }

  // 2. Extracted values from 'رموز_المفوتر_المعتمدة.docx'
  const billers = [
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

  console.log(`Processing ${billers.length} billers...`);

  for (let i = 0; i < billers.length; i++) {
    const item = billers[i];
    const billerCode = sanitizeText(item.value);
    const billerName = sanitizeText(item.valueAr);
    const itemSortOrder = i + 1;

    // Check if value already exists for this category
    const [existingValue] = await conn.execute(
      'SELECT id FROM category_values WHERE categoryId = ? AND value = ?',
      [categoryId, billerCode]
    );

    if (existingValue.length === 0) {
      await conn.execute(
        'INSERT INTO category_values (categoryId, value, valueAr, sortOrder, isActive) VALUES (?, ?, ?, ?, true)',
        [categoryId, billerCode, billerName, itemSortOrder]
      );
      console.log(`  ➕ Added: ${billerName} (${billerCode})`);
    } else {
      // Update Biller Name if it already exists to ensure it has the correct name
      await conn.execute(
        'UPDATE category_values SET valueAr = ?, sortOrder = ? WHERE id = ?',
        [billerName, itemSortOrder, existingValue[0].id]
      );
      console.log(`  🔄 Updated: ${billerName} (${billerCode})`);
    }
  }

  await conn.end();
  console.log("🎉 Seeding completed successfully!");
}

main().catch(console.error);
