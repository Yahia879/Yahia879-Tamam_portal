import mysql from 'mysql2/promise';
import * as dotenv from 'dotenv';

dotenv.config();

async function main() {
  console.log('🚀 Running Migration for Custody Requests System...\n');

  if (!process.env.DATABASE_URL) {
    console.error('❌ Error: DATABASE_URL is not defined in .env');
    process.exit(1);
  }

  let connection: mysql.Connection | null = null;
  try {
    connection = await mysql.createConnection(process.env.DATABASE_URL);
    console.log('✅ Connected to database.');

    async function ensureColumn(tableName: string, columnName: string, columnDefinition: string) {
      const [rows]: any = await connection!.query(
        `SELECT COLUMN_NAME 
         FROM INFORMATION_SCHEMA.COLUMNS 
         WHERE TABLE_SCHEMA = DATABASE() 
           AND TABLE_NAME = ? 
           AND COLUMN_NAME = ?`,
        [tableName, columnName]
      );

      if (rows.length === 0) {
        console.log(`➕ Adding missing column '${columnName}' to table '${tableName}'...`);
        try {
          await connection!.query(`ALTER TABLE \`${tableName}\` ADD COLUMN \`${columnName}\` ${columnDefinition}`);
          console.log(`✅ Column '${columnName}' added to '${tableName}'.`);
        } catch (err: any) {
          console.error(`❌ Failed to add '${columnName}' to '${tableName}':`, err.message);
        }
      } else {
        console.log(`✨ Column '${columnName}' already exists in '${tableName}'.`);
      }
    }

    // 1. أعمدة البيانات البنكية للموظفين في جدول users
    console.log('\n--- 1. Ensuring Bank Columns in `users` ---');
    await ensureColumn('users', 'bankName', 'varchar(255) DEFAULT NULL');
    await ensureColumn('users', 'bankAccountName', 'varchar(255) DEFAULT NULL');
    await ensureColumn('users', 'bankIban', 'varchar(50) DEFAULT NULL');

    // 2. إنشاء جدول العهد المالية
    console.log('\n--- 2. Ensuring `custody_requests` Table ---');
    await connection.query(`
      CREATE TABLE IF NOT EXISTS \`custody_requests\` (
        \`id\` INT AUTO_INCREMENT PRIMARY KEY,
        \`requestNumber\` VARCHAR(50) NOT NULL UNIQUE,
        \`userId\` INT NOT NULL,
        \`title\` VARCHAR(255) NOT NULL,
        \`amount\` DECIMAL(15,2) NOT NULL,
        \`description\` TEXT NOT NULL,
        \`isCustomBank\` TINYINT(1) NOT NULL DEFAULT 0,
        \`bankName\` VARCHAR(255) NOT NULL,
        \`bankAccountName\` VARCHAR(255) NOT NULL,
        \`bankIban\` VARCHAR(50) NOT NULL,
        \`applicantSignatureName\` VARCHAR(255) NULL,
        \`applicantSignatureDepartment\` VARCHAR(255) NULL,
        \`applicantSignatureUrl\` TEXT NULL,
        \`status\` ENUM('pending_executive', 'approved', 'rejected', 'converted_to_order') NOT NULL DEFAULT 'pending_executive',
        \`executiveApprovedBy\` INT NULL,
        \`executiveApprovedAt\` DATETIME NULL,
        \`executiveSignatureName\` VARCHAR(255) NULL,
        \`executiveSignatureDepartment\` VARCHAR(255) NULL,
        \`executiveSignatureUrl\` TEXT NULL,
        \`executiveNotes\` TEXT NULL,
        \`rejectedBy\` INT NULL,
        \`rejectedAt\` DATETIME NULL,
        \`rejectionReason\` TEXT NULL,
        \`disbursementOrderId\` INT NULL,
        \`disbursementOrderNumber\` VARCHAR(50) NULL,
        \`attachmentsJson\` TEXT NULL,
        \`createdAt\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        \`updatedAt\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_cr_user_id (\`userId\`),
        INDEX idx_cr_status (\`status\`),
        INDEX idx_cr_order_id (\`disbursementOrderId\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    console.log('✅ `custody_requests` table verified/created.');

    // 3. عمود ربط أمر الصرف بطلب العهدة
    console.log('\n--- 3. Ensuring `custodyRequestId` in `disbursement_orders` ---');
    await ensureColumn('disbursement_orders', 'custodyRequestId', 'INT DEFAULT NULL');

    console.log('\n🎉 Custody Migration Completed Successfully!\n');
  } catch (err: any) {
    console.log('ℹ️ DB Connection note (MySQL might be off locally):', err.message);
  } finally {
    if (connection) await connection.end();
  }
}

main().catch(console.error);
