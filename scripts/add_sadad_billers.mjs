import mysql from 'mysql2/promise';
import * as dotenv from 'dotenv';
dotenv.config();

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("❌ Error: DATABASE_URL is not defined.");
    process.exit(1);
  }

  console.log("Connecting to database to add SADAD billers category...");
  const conn = await mysql.createConnection(process.env.DATABASE_URL);

  // 1. Add categories if not existing
  const cat = { name: 'sadad_billers', nameAr: 'معلومات المفوتر', type: 'sadad_billers', sortOrder: 7 };

  const [existing] = await conn.execute('SELECT id FROM categories WHERE type = ?', [cat.type]);
  let categoryId;
  if (existing.length === 0) {
    const [result] = await conn.execute(
      'INSERT INTO categories (name, nameAr, type, sortOrder, isActive) VALUES (?, ?, ?, ?, true)',
      [cat.name, cat.nameAr, cat.type, cat.sortOrder]
    );
    categoryId = result.insertId;
    console.log(`✅ Added category: ${cat.nameAr}`);
  } else {
    categoryId = existing[0].id;
    console.log(`⏭️ Category already exists: ${cat.nameAr}`);
  }

  // 2. Add values for sadad_billers
  const values = [
    { value: '001', valueAr: 'شركة الاتصالات السعودية (STC)', sortOrder: 1 },
    { value: '002', valueAr: 'الشركة السعودية للكهرباء', sortOrder: 2 },
    { value: '003', valueAr: 'شركة المياه الوطنية', sortOrder: 3 },
    { value: '050', valueAr: 'وزارة الداخلية - المرور', sortOrder: 4 },
    { value: '085', valueAr: 'وزارة الموارد البشرية والتنمية الاجتماعية', sortOrder: 5 },
    { value: '101', valueAr: 'وزارة التجارة', sortOrder: 6 },
    { value: '144', valueAr: 'الهيئة السعودية للمواصفات والمقاييس والجودة', sortOrder: 7 },
    { value: '166', valueAr: 'المؤسسة العامة للتأمينات الاجتماعية', sortOrder: 8 },
    { value: '017', valueAr: 'موبايلي', sortOrder: 9 },
    { value: '044', valueAr: 'زين', sortOrder: 10 },
    { value: '022', valueAr: 'الخطوط السعودية', sortOrder: 11 },
    { value: '090', valueAr: 'الشركة الوطنية للغاز والتصنيع (غازكو)', sortOrder: 12 }
  ];

  for (const item of values) {
    const [existingVal] = await conn.execute(
      'SELECT id FROM category_values WHERE categoryId = ? AND value = ?',
      [categoryId, item.value]
    );
    if (existingVal.length === 0) {
      await conn.execute(
        'INSERT INTO category_values (categoryId, value, valueAr, sortOrder, isActive) VALUES (?, ?, ?, ?, true)',
        [categoryId, item.value, item.valueAr, item.sortOrder]
      );
      console.log(`  ✅ Added SADAD biller: ${item.valueAr} (${item.value})`);
    } else {
      console.log(`  ⏭️ SADAD biller already exists: ${item.valueAr} (${item.value})`);
    }
  }

  await conn.end();
  console.log("🎉 Done inserting SADAD billers successfully!");
}

main().catch(console.error);
