import mysql from "mysql2/promise";

const connection = await mysql.createConnection(process.env.DATABASE_URL);

console.log("🗑️ بدء حذف البيانات...\n");

// حذف البيانات بالترتيب الصحيح (من الجداول الفرعية للرئيسية)
const tables = [
  // تقارير الإنجاز
  "progress_reports",
  // أوامر وطلبات الصرف
  "disbursement_orders",
  "disbursement_requests",
  // العقود والدفعات
  "contract_payments",
  "contracts_enhanced",
  "contracts",
  // عروض الأسعار وجداول الكميات
  "quotation_items",
  "quotations",
  "quantity_schedule_items",
  "quantity_schedules",
  // المشاريع ومراحلها
  "project_phases",
  "projects",
  // تقارير الطلبات
  "quick_response_reports",
  "field_visit_reports",
  "final_reports",
  // مرفقات وتعليقات وسجل الطلبات
  "request_attachments",
  "request_comments",
  "request_history",
  // الطلبات
  "mosque_requests",
  // المساجد
  "mosques",
  // الموردين
  "supplier_attachments",
  "supplier_work_areas",
  "suppliers",
  // الإشعارات
  "notifications",
];

for (const table of tables) {
  try {
    const [result] = await connection.execute(`DELETE FROM ${table}`);
    console.log(`✅ ${table}: تم حذف ${result.affectedRows} سجل`);
  } catch (error) {
    if (error.code === 'ER_NO_SUCH_TABLE') {
      console.log(`⚠️ ${table}: الجدول غير موجود`);
    } else {
      console.log(`❌ ${table}: ${error.message}`);
    }
  }
}

// إعادة تعيين AUTO_INCREMENT
console.log("\n🔄 إعادة تعيين العدادات...");
for (const table of tables) {
  try {
    await connection.execute(`ALTER TABLE ${table} AUTO_INCREMENT = 1`);
  } catch (error) {
    // تجاهل الأخطاء
  }
}

console.log("\n✅ تم حذف جميع البيانات بنجاح!");

await connection.end();
