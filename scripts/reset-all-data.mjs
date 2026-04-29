import mysql from "mysql2/promise";

const connection = await mysql.createConnection(process.env.DATABASE_URL);

console.log("🗑️ بدء حذف جميع البيانات...\n");

// تعطيل قيود المفاتيح الأجنبية مؤقتاً
await connection.execute("SET FOREIGN_KEY_CHECKS = 0");

// حذف البيانات من جميع الجداول بالترتيب الصحيح
const tables = [
  // جداول القيم المرتبطة بالعقود
  "contract_clause_values",
  "contract_payments",
  "contracts_enhanced",
  "contracts",
  // عروض الأسعار
  "quotation_items",
  "quotations",
  // جداول الكميات
  "quantity_schedule_items",
  "quantity_schedules",
  // المشاريع
  "project_phases",
  "projects",
  // تقارير
  "progress_reports",
  "quick_response_reports",
  "field_visit_reports",
  "final_reports",
  // الطلبات
  "request_attachments",
  "request_comments",
  "request_history",
  "mosque_requests",
  // المساجد
  "mosques",
  // الموردين
  "supplier_attachments",
  "supplier_work_areas",
  "suppliers",
  // الإشعارات
  "notifications",
  // طلبات وأوامر الصرف
  "disbursement_orders",
  "disbursement_requests",
];

for (const table of tables) {
  try {
    await connection.execute(`TRUNCATE TABLE ${table}`);
    console.log(`✅ ${table}: تم حذف البيانات`);
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
