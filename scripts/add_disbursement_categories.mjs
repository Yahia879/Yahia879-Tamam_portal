import mysql from 'mysql2/promise';
import * as dotenv from 'dotenv';
dotenv.config();

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("❌ Error: DATABASE_URL is not defined.");
    process.exit(1);
  }

  console.log("Connecting to database to add categories...");
  const conn = await mysql.createConnection(process.env.DATABASE_URL);

  // 1. Add categories if not existing
  const newCategories = [
    { name: 'funding_support', nameAr: 'التمويل / الدعم', type: 'funding_support', sortOrder: 5 },
    { name: 'main_projects', nameAr: 'اسم المشروع الرئيسي', type: 'main_projects', sortOrder: 6 }
  ];

  for (const cat of newCategories) {
    const [existing] = await conn.execute('SELECT id FROM categories WHERE type = ?', [cat.type]);
    if (existing.length === 0) {
      await conn.execute(
        'INSERT INTO categories (name, nameAr, type, sortOrder, isActive) VALUES (?, ?, ?, ?, true)',
        [cat.name, cat.nameAr, cat.type, cat.sortOrder]
      );
      console.log(`✅ Added category: ${cat.nameAr}`);
    } else {
      console.log(`⏭️ Category already exists: ${cat.nameAr}`);
    }
  }

  // 2. Get category IDs
  const [fundingSupportCat] = await conn.execute('SELECT id FROM categories WHERE type = ?', ['funding_support']);
  const [mainProjectsCat] = await conn.execute('SELECT id FROM categories WHERE type = ?', ['main_projects']);

  // 3. Add values for funding_support
  if (fundingSupportCat.length > 0) {
    const categoryId = fundingSupportCat[0].id;
    const values = [
      { value: 'donor_institutions', valueAr: 'المؤسسات المانحة', sortOrder: 1 },
      { value: 'esnad', valueAr: 'إسناد', sortOrder: 2 },
      { value: 'government_support', valueAr: 'الدعم الحكومي', sortOrder: 3 },
      { value: 'donor', valueAr: 'متبرع', sortOrder: 4 },
      { value: 'general_account', valueAr: 'الحساب العام', sortOrder: 5 }
    ];

    for (const item of values) {
      const [existing] = await conn.execute(
        'SELECT id FROM category_values WHERE categoryId = ? AND value = ?',
        [categoryId, item.value]
      );
      if (existing.length === 0) {
        await conn.execute(
          'INSERT INTO category_values (categoryId, value, valueAr, sortOrder, isActive) VALUES (?, ?, ?, ?, true)',
          [categoryId, item.value, item.valueAr, item.sortOrder]
        );
        console.log(`  ✅ Added funding support value: ${item.valueAr}`);
      } else {
        console.log(`  ⏭️ Funding support value already exists: ${item.valueAr}`);
      }
    }
  }

  // 4. Add values for main_projects
  if (mainProjectsCat.length > 0) {
    const categoryId = mainProjectsCat[0].id;
    const values = [
      { value: 'purchases', valueAr: 'مشتريات', sortOrder: 1 },
      { value: 'insurance_contracts', valueAr: 'عقود تأمين', sortOrder: 2 },
      { value: 'custodies', valueAr: 'العهد', sortOrder: 3 },
      { value: 'rents', valueAr: 'الإيجارات', sortOrder: 4 },
      { value: 'salaries_bonuses', valueAr: 'رواتب ومكافآت', sortOrder: 5 },
      { value: 'admin_expenses', valueAr: 'مصاريف إدارية', sortOrder: 6 },
      { value: 'government_fees', valueAr: 'رسوم حكومية', sortOrder: 7 }
    ];

    for (const item of values) {
      const [existing] = await conn.execute(
        'SELECT id FROM category_values WHERE categoryId = ? AND value = ?',
        [categoryId, item.value]
      );
      if (existing.length === 0) {
        await conn.execute(
          'INSERT INTO category_values (categoryId, value, valueAr, sortOrder, isActive) VALUES (?, ?, ?, ?, true)',
          [categoryId, item.value, item.valueAr, item.sortOrder]
        );
        console.log(`  ✅ Added main project value: ${item.valueAr}`);
      } else {
        console.log(`  ⏭️ Main project value already exists: ${item.valueAr}`);
      }
    }
  }

  await conn.end();
  console.log("🎉 Done inserting categories successfully!");
}

main().catch(console.error);
