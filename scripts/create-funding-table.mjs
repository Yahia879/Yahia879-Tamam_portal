import mysql from 'mysql2/promise';

const conn = await mysql.createConnection(process.env.DATABASE_URL);

// إنشاء جدول مصادر الدعم للمشاريع
const createTableSQL = `
CREATE TABLE IF NOT EXISTS project_funding_sources (
  id INT AUTO_INCREMENT PRIMARY KEY,
  projectId INT NOT NULL,
  fundingSourceType VARCHAR(50) NOT NULL COMMENT 'نوع مصدر الدعم (من التصنيفات)',
  fundingSourceName VARCHAR(255) COMMENT 'اسم الجهة الداعمة',
  amount DECIMAL(15, 2) NOT NULL COMMENT 'مبلغ الدعم',
  amountSpent DECIMAL(15, 2) DEFAULT 0 COMMENT 'المبلغ المصروف',
  notes TEXT COMMENT 'ملاحظات',
  isActive BOOLEAN DEFAULT TRUE,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (projectId) REFERENCES projects(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
`;

try {
  await conn.execute(createTableSQL);
  console.log('✅ تم إنشاء جدول project_funding_sources بنجاح');
} catch (error) {
  if (error.code === 'ER_TABLE_EXISTS_ERROR') {
    console.log('⏭️ الجدول موجود مسبقاً');
  } else {
    throw error;
  }
}

// إضافة أعمدة جديدة لجدول طلبات الصرف
const alterDisbursementRequestsSQL = [
  `ALTER TABLE disbursement_requests ADD COLUMN IF NOT EXISTS sequenceNumber INT COMMENT 'رقم التسلسل'`,
  `ALTER TABLE disbursement_requests ADD COLUMN IF NOT EXISTS dateHijri VARCHAR(20) COMMENT 'التاريخ الهجري'`,
  `ALTER TABLE disbursement_requests ADD COLUMN IF NOT EXISTS projectOwnerDepartment VARCHAR(100) COMMENT 'الجهة المالكة للمشروع'`,
  `ALTER TABLE disbursement_requests ADD COLUMN IF NOT EXISTS fundingSourceId INT COMMENT 'مصدر الدعم'`,
  `ALTER TABLE disbursement_requests ADD COLUMN IF NOT EXISTS actualCost DECIMAL(15, 2) COMMENT 'تكلفة المشروع الفعلية'`,
  `ALTER TABLE disbursement_requests ADD COLUMN IF NOT EXISTS adminFees DECIMAL(15, 2) DEFAULT 0 COMMENT 'الأجور الإدارية'`,
  `ALTER TABLE disbursement_requests ADD COLUMN IF NOT EXISTS supplierName VARCHAR(255) COMMENT 'اسم المورد'`,
  `ALTER TABLE disbursement_requests ADD COLUMN IF NOT EXISTS supplierWork VARCHAR(255) COMMENT 'الأعمال المنفذة'`,
  `ALTER TABLE disbursement_requests ADD COLUMN IF NOT EXISTS supplierIban VARCHAR(50) COMMENT 'آيبان المورد'`,
  `ALTER TABLE disbursement_requests ADD COLUMN IF NOT EXISTS supplierBank VARCHAR(100) COMMENT 'بنك المورد'`,
  `ALTER TABLE disbursement_requests ADD COLUMN IF NOT EXISTS projectManagerSignature TEXT COMMENT 'توقيع مدير المشروع'`,
  `ALTER TABLE disbursement_requests ADD COLUMN IF NOT EXISTS projectManagerSignedAt TIMESTAMP COMMENT 'تاريخ توقيع مدير المشروع'`,
  `ALTER TABLE disbursement_requests ADD COLUMN IF NOT EXISTS executiveDirectorSignature TEXT COMMENT 'توقيع المدير التنفيذي'`,
  `ALTER TABLE disbursement_requests ADD COLUMN IF NOT EXISTS executiveDirectorSignedAt TIMESTAMP COMMENT 'تاريخ توقيع المدير التنفيذي'`,
];

for (const sql of alterDisbursementRequestsSQL) {
  try {
    await conn.execute(sql);
    console.log(`✅ ${sql.split(' ')[5] || 'تم التنفيذ'}`);
  } catch (error) {
    if (error.code === 'ER_DUP_FIELDNAME') {
      console.log(`⏭️ العمود موجود مسبقاً`);
    } else {
      console.log(`⚠️ خطأ: ${error.message}`);
    }
  }
}

// إضافة أعمدة جديدة لجدول أوامر الصرف
const alterDisbursementOrdersSQL = [
  `ALTER TABLE disbursement_orders ADD COLUMN IF NOT EXISTS dateHijri VARCHAR(20) COMMENT 'التاريخ الهجري'`,
  `ALTER TABLE disbursement_orders ADD COLUMN IF NOT EXISTS amountInWords VARCHAR(500) COMMENT 'المبلغ كتابة'`,
  `ALTER TABLE disbursement_orders ADD COLUMN IF NOT EXISTS purpose TEXT COMMENT 'الغرض من الصرف'`,
  `ALTER TABLE disbursement_orders ADD COLUMN IF NOT EXISTS projectName VARCHAR(255) COMMENT 'اسم المشروع'`,
  `ALTER TABLE disbursement_orders ADD COLUMN IF NOT EXISTS fundingSourceName VARCHAR(255) COMMENT 'الجهة الداعمة'`,
  `ALTER TABLE disbursement_orders ADD COLUMN IF NOT EXISTS totalFundingAmount DECIMAL(15, 2) COMMENT 'إجمالي قيمة الدعم'`,
  `ALTER TABLE disbursement_orders ADD COLUMN IF NOT EXISTS totalContractAmount DECIMAL(15, 2) COMMENT 'إجمالي قيمة العقد'`,
  `ALTER TABLE disbursement_orders ADD COLUMN IF NOT EXISTS totalPaidAmount DECIMAL(15, 2) COMMENT 'إجمالي ما تم دفعه'`,
  `ALTER TABLE disbursement_orders ADD COLUMN IF NOT EXISTS remainingAmount DECIMAL(15, 2) COMMENT 'المبلغ المتبقي'`,
  `ALTER TABLE disbursement_orders ADD COLUMN IF NOT EXISTS accountantName VARCHAR(255) COMMENT 'اسم المحاسب'`,
  `ALTER TABLE disbursement_orders ADD COLUMN IF NOT EXISTS accountantSignature TEXT COMMENT 'توقيع المحاسب'`,
  `ALTER TABLE disbursement_orders ADD COLUMN IF NOT EXISTS accountantSignedAt TIMESTAMP COMMENT 'تاريخ توقيع المحاسب'`,
  `ALTER TABLE disbursement_orders ADD COLUMN IF NOT EXISTS financialDirectorName VARCHAR(255) COMMENT 'اسم المدير المالي'`,
  `ALTER TABLE disbursement_orders ADD COLUMN IF NOT EXISTS financialDirectorSignature TEXT COMMENT 'توقيع المدير المالي'`,
  `ALTER TABLE disbursement_orders ADD COLUMN IF NOT EXISTS financialDirectorSignedAt TIMESTAMP COMMENT 'تاريخ توقيع المدير المالي'`,
];

for (const sql of alterDisbursementOrdersSQL) {
  try {
    await conn.execute(sql);
    console.log(`✅ ${sql.split(' ')[5] || 'تم التنفيذ'}`);
  } catch (error) {
    if (error.code === 'ER_DUP_FIELDNAME') {
      console.log(`⏭️ العمود موجود مسبقاً`);
    } else {
      console.log(`⚠️ خطأ: ${error.message}`);
    }
  }
}

console.log('\n✅ تم تحديث قاعدة البيانات بنجاح!');

await conn.end();
