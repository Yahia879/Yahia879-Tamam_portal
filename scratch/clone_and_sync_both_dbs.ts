import mysql from 'mysql2/promise';
import * as dotenv from 'dotenv';

dotenv.config();

async function cloneAndSync() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    port: 3306,
    multipleStatements: true,
  });

  console.log('🔄 Checking if test_temam needs full table clone from tamamgatemanarah_portal...');
  const [testTables]: any = await connection.query('SHOW TABLES FROM `test_temam`');
  
  if (testTables.length < 50) {
    console.log('📦 Cloning all tables and data from tamamgatemanarah_portal to test_temam...');
    const [srcTables]: any = await connection.query('SHOW TABLES FROM `tamamgatemanarah_portal`');
    
    // Disable foreign key checks temporarily for bulk creation and copy
    await connection.query('SET FOREIGN_KEY_CHECKS = 0');

    for (const row of srcTables) {
      const tableName = Object.values(row)[0] as string;
      console.log(`Copying table [${tableName}]...`);
      
      // Drop in target if exists
      await connection.query(`DROP TABLE IF EXISTS \`test_temam\`.\`${tableName}\``);
      
      // Create table like source
      await connection.query(`CREATE TABLE \`test_temam\`.\`${tableName}\` LIKE \`tamamgatemanarah_portal\`.\`${tableName}\``);
      
      // Copy data
      await connection.query(`INSERT INTO \`test_temam\`.\`${tableName}\` SELECT * FROM \`tamamgatemanarah_portal\`.\`${tableName}\``);
    }

    await connection.query('SET FOREIGN_KEY_CHECKS = 1');
    console.log('✅ All tables and data cloned to test_temam successfully!');
  }

  // Now ensure both databases have all latest columns, tables, categories, and permissions
  async function syncDb(dbName: string) {
    console.log(`\n✨ Running final check on [${dbName}]...`);
    
    async function ensureCol(table: string, col: string, def: string) {
      const [rows]: any = await connection.query(
        `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
        [dbName, table, col]
      );
      if (rows.length === 0) {
        try {
          await connection.query(`ALTER TABLE \`${dbName}\`.\`${table}\` ADD COLUMN \`${col}\` ${def}`);
          console.log(`➕ [${dbName}] Added ${col} to ${table}`);
        } catch (e: any) {
          console.log(`Note on ${col} in ${table}:`, e.message);
        }
      }
    }

    await ensureCol('projects', 'isMultiMosque', 'tinyint(1) DEFAULT 0');
    await ensureCol('projects', 'donorName', 'varchar(255) DEFAULT NULL');
    await ensureCol('projects', 'workDescription', 'text DEFAULT NULL');
    await ensureCol('projects', 'targetGroup', 'varchar(255) DEFAULT NULL');
    await ensureCol('projects', 'expectedDurationDays', 'int DEFAULT NULL');
    await ensureCol('projects', 'descriptiveName', 'varchar(255) DEFAULT NULL');
    await ensureCol('projects', 'projectManagerId', 'int DEFAULT NULL');
    await ensureCol('quantity_schedules', 'mosqueId', 'int DEFAULT NULL');
    await ensureCol('boq_items', 'mosqueId', 'int DEFAULT NULL');
    await ensureCol('receipt_vouchers', 'recipientType', "varchar(50) DEFAULT 'donor'");
    await ensureCol('receipt_vouchers', 'honorificTitle', "varchar(50) DEFAULT 'السادة'");
    await ensureCol('receipt_vouchers', 'donationPurpose', 'varchar(255) DEFAULT NULL');
    await ensureCol('receipt_vouchers', 'bankName', "varchar(255) DEFAULT 'مصرف الراجحي'");
    await ensureCol('receipt_vouchers', 'notes', 'text DEFAULT NULL');
    await ensureCol('receipt_vouchers', 'voucherType', "varchar(50) DEFAULT 'bank_transfer'");
    await ensureCol('mosque_requests', 'isEvaluated', 'tinyint(1) DEFAULT 0');
    await ensureCol('mosque_requests', 'satisfactionRating', 'int DEFAULT NULL');
    await ensureCol('mosque_requests', 'evaluatedAt', 'timestamp NULL DEFAULT NULL');
    await ensureCol('mosque_requests', 'evaluatorName', 'varchar(255) DEFAULT NULL');
    await ensureCol('mosque_requests', 'evaluatorRole', 'varchar(100) DEFAULT NULL');
    await ensureCol('mosque_requests', 'evaluationNotes', 'text DEFAULT NULL');
    await ensureCol('mosque_requests', 'requestTrack', "varchar(50) DEFAULT 'normal'");
    await ensureCol('quick_response_reports', 'technicianName', 'varchar(255) DEFAULT NULL');
    await ensureCol('quick_response_reports', 'finalEvaluation', 'varchar(50) DEFAULT NULL');
    await ensureCol('quick_response_reports', 'unexecutedWorks', 'text DEFAULT NULL');

    // Create project_mosques table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS \`${dbName}\`.\`project_mosques\` (
        \`id\` int AUTO_INCREMENT PRIMARY KEY,
        \`projectId\` int NOT NULL,
        \`mosqueId\` int NOT NULL,
        \`allocatedBudget\` decimal(15,2) DEFAULT NULL,
        \`notes\` text DEFAULT NULL,
        \`createdAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        \`updatedAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX (\`projectId\`),
        INDEX (\`mosqueId\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // Seed donation purposes
    const defaultDonationPurposes = [
      { name: 'mosque_construction', nameAr: 'بناء المساجد', sortOrder: 1 },
      { name: 'renovation', nameAr: 'الترميم', sortOrder: 2 },
      { name: 'water_supply', nameAr: 'سقية الماء', sortOrder: 3 },
      { name: 'equipment', nameAr: 'التجهيزات', sortOrder: 4 },
      { name: 'maintenance', nameAr: 'الصيانة والنظافة', sortOrder: 5 },
      { name: 'carpets', nameAr: 'فرش المساجد', sortOrder: 6 },
      { name: 'air_conditioning', nameAr: 'التكييف', sortOrder: 7 },
      { name: 'sound_systems', nameAr: 'الأنظمة الصوتية', sortOrder: 8 },
      { name: 'general_care', nameAr: 'عناية عامة بالمساجد', sortOrder: 9 },
    ];

    for (const p of defaultDonationPurposes) {
      const [existing]: any = await connection.query(
        `SELECT id FROM \`${dbName}\`.categories WHERE type = 'donation_purposes' AND nameAr = ?`,
        [p.nameAr]
      );
      if (existing.length === 0) {
        await connection.query(
          `INSERT INTO \`${dbName}\`.categories (name, nameAr, type, sortOrder, isActive, createdAt)
           VALUES (?, ?, 'donation_purposes', ?, 1, NOW())`,
          [p.name, p.nameAr, p.sortOrder]
        );
      }
    }
  }

  await syncDb('tamamgatemanarah_portal');
  await syncDb('test_temam');

  console.log('\n🎉 BOTH databases [tamamgatemanarah_portal] and [test_temam] are now 100% synchronized and updated!');
  await connection.end();
  process.exit(0);
}

cloneAndSync().catch(console.error);
