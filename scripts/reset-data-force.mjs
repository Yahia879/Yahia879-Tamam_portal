import mysql from "mysql2/promise";

const connection = await mysql.createConnection(process.env.DATABASE_URL);

console.log("🗑️ بدء حذف البيانات (مع تعطيل القيود)...\n");

// تعطيل قيود المفاتيح الأجنبية
await connection.execute("SET FOREIGN_KEY_CHECKS = 0");

// حذف البيانات من جميع الجداول
const tables = [
  "progress_reports",
  "disbursement_orders",
  "disbursement_requests",
  "contract_payments",
  "contract_clause_values",
  "contracts_enhanced",
  "contracts",
  "quotation_items",
  "quotations",
  "quantity_schedule_items",
  "quantity_schedules",
  "project_phases",
  "projects",
  "quick_response_reports",
  "field_visit_reports",
  "final_reports",
  "request_attachments",
  "request_comments",
  "request_history",
  "mosque_requests",
  "mosques",
  "supplier_attachments",
  "supplier_work_areas",
  "suppliers",
  "notifications",
];

for (const table of tables) {
  try {
    const [result] = await connection.execute(`DELETE FROM ${table}`);
    console.log(`✅ ${table}: تم حذف ${result.affectedRows} سجل`);
    // إعادة تعيين AUTO_INCREMENT
    await connection.execute(`ALTER TABLE ${table} AUTO_INCREMENT = 1`);
  } catch (error) {
    if (error.code === 'ER_NO_SUCH_TABLE') {
      console.log(`⚠️ ${table}: الجدول غير موجود`);
    } else {
      console.log(`❌ ${table}: ${error.message}`);
    }
  }
}

// إعادة تفعيل قيود المفاتيح الأجنبية
await connection.execute("SET FOREIGN_KEY_CHECKS = 1");

console.log("\n✅ تم حذف جميع البيانات بنجاح!");

await connection.end();
