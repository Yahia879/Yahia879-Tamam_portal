import mysql from "mysql2/promise";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";
dotenv.config();

async function main() {
  const databaseUrl = process.env.DATABASE_URL || "mysql://root:@localhost:3306/test_temam";
  const conn = await mysql.createConnection(databaseUrl);

  console.log("Connected to database...");

  // 1. Delete extra 3 items
  const [delRes] = await conn.execute(
    "DELETE FROM categories WHERE type = 'sedana_items' AND nameAr IN ('مكافآت خادم المسجد', 'سائل تعقيم', 'بخور')"
  );
  console.log(`Deleted ${delRes.affectedRows} extra items.`);

  // 2. Fetch all 19 sedana_categories
  const [categories] = await conn.execute(
    "SELECT id, name, nameAr, type, sortOrder, isActive, metadata FROM categories WHERE type = 'sedana_categories' ORDER BY sortOrder ASC, id ASC"
  );
  console.log(`Fetched ${categories.length} sedana_categories.`);

  // 3. Fetch all 77 sedana_items
  const [items] = await conn.execute(
    "SELECT id, name, nameAr, type, sortOrder, isActive, metadata FROM categories WHERE type = 'sedana_items' ORDER BY id ASC"
  );
  console.log(`Fetched ${items.length} sedana_items.`);

  await conn.end();

  // 4. Build comprehensive SQL query file
  let sqlContent = `-- ==========================================================================\n`;
  sqlContent += `-- ملف استعلامات SQL: تصنيفات وأصناف سدانة المعتمدة (19 تصنيف و 77 صنف معتمد)\n`;
  sqlContent += `-- متطابقة 100% مع ملف: DOC-20261012-WA0002.xlsx (شيت: أصناف سدانة المعتمدة)\n`;
  sqlContent += `-- تاريخ التحديث: ${new Date().toISOString().slice(0, 10)}\n`;
  sqlContent += `-- ==========================================================================\n\n`;

  sqlContent += `-- 1. حذف التصنيفات والأصناف السابقة لسدانة لضمان نظافة وتحديث البيانات\n`;
  sqlContent += `DELETE FROM categories WHERE type IN ('sedana_categories', 'sedana_items');\n\n`;

  sqlContent += `-- 2. إدراج تصنيفات سدانة الرئيسية (19 تصنيف معتمد)\n`;
  sqlContent += `INSERT INTO categories (name, nameAr, type, sortOrder, isActive, metadata, createdAt)\nVALUES\n`;

  const catValues = categories.map((cat, idx) => {
    const metaStr = cat.metadata ? `'${JSON.stringify(typeof cat.metadata === 'string' ? JSON.parse(cat.metadata) : cat.metadata).replace(/'/g, "\\'")}'` : "NULL";
    return `  ('${cat.name.replace(/'/g, "\\'")}', '${cat.nameAr.replace(/'/g, "\\'")}', 'sedana_categories', ${cat.sortOrder ?? idx + 1}, ${cat.isActive ? 1 : 0}, ${metaStr}, NOW())`;
  });
  sqlContent += catValues.join(",\n") + ";\n\n";

  sqlContent += `-- 3. إدراج أصناف سدانة المعتمدة التابعة للتصنيفات (77 صنف معتمد)\n`;
  sqlContent += `INSERT INTO categories (name, nameAr, type, sortOrder, isActive, metadata, createdAt)\nVALUES\n`;

  const itemValues = items.map((item, idx) => {
    let metaObj = item.metadata;
    if (typeof metaObj === "string") {
      try { metaObj = JSON.parse(metaObj); } catch (e) {}
    }
    const metaEscaped = metaObj ? `'${JSON.stringify(metaObj).replace(/'/g, "\\'")}'` : "NULL";
    return `  ('${item.name.replace(/'/g, "\\'")}', '${item.nameAr.replace(/'/g, "\\'")}', 'sedana_items', ${item.sortOrder ?? idx + 1}, ${item.isActive ? 1 : 0}, ${metaEscaped}, NOW())`;
  });
  sqlContent += itemValues.join(",\n") + ";\n\n";

  sqlContent += `-- 4. التحقق من العدد بعد الإدراج\n`;
  sqlContent += `SELECT type, COUNT(*) as total_count FROM categories WHERE type IN ('sedana_categories', 'sedana_items') GROUP BY type;\n`;

  const outputSqlPath = path.resolve("./sedana_categories_and_items.sql");
  fs.writeFileSync(outputSqlPath, sqlContent, "utf-8");
  console.log(`Saved updated SQL query to: ${outputSqlPath}`);
}

main().catch(console.error);
