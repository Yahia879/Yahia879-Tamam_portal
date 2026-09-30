import { execSync } from 'child_process';
import mysql from 'mysql2/promise';
import * as dotenv from 'dotenv';
import path from 'path';

const DUMP_PATH = 'C:\\Users\\Loq\\Downloads\\tamamgatemanarah_portal (51).sql';
const MYSQL_BIN = 'C:\\xampp\\mysql\\bin\\mysql.exe';

async function importDatabase(targetDb: string) {
  console.log(`\n======================================================`);
  console.log(`📦 Recreating and importing dump into [${targetDb}]...`);
  console.log(`======================================================\n`);

  // Step 1: Recreate database cleanly
  const conn = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    port: 3306,
  });

  console.log(`🗑️ Dropping existing database ${targetDb} (if exists)...`);
  await conn.query(`DROP DATABASE IF EXISTS \`${targetDb}\``);
  console.log(`✨ Creating fresh database ${targetDb} with utf8mb4...`);
  await conn.query(`CREATE DATABASE \`${targetDb}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
  await conn.end();

  // Step 2: Import SQL file using mysql.exe with UTF-8 encoding
  console.log(`📥 Importing SQL dump file into ${targetDb}...`);
  const startTime = Date.now();
  
  // Note: Using cmd.exe to redirect < file with utf8mb4
  const cmd = `cmd.exe /c ""${MYSQL_BIN}" --default-character-set=utf8mb4 -u root ${targetDb} < "${DUMP_PATH}""`;
  execSync(cmd, { stdio: 'inherit' });

  const duration = ((Date.now() - startTime) / 1000).toFixed(2);
  console.log(`✅ Import into [${targetDb}] completed successfully in ${duration}s!`);
}

async function verifyDb(targetDb: string) {
  const conn = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    port: 3306,
    database: targetDb,
  });

  const [tables]: any = await conn.query('SHOW TABLES');
  console.log(`📊 [${targetDb}] has ${tables.length} tables.`);

  const [users]: any = await conn.query('SELECT count(*) as count FROM users');
  console.log(`👤 [${targetDb}] users count: ${users[0].count}`);

  const [requests]: any = await conn.query('SELECT count(*) as count FROM mosque_requests');
  console.log(`🕌 [${targetDb}] mosque_requests count: ${requests[0].count}`);

  const [latestUser]: any = await conn.query('SELECT id, name, email FROM users ORDER BY id DESC LIMIT 1');
  console.log(`👤 Latest user:`, latestUser[0]);

  await conn.end();
}

async function main() {
  // Import into both databases so whichever one is used will have the exact new data
  await importDatabase('tamamgatemanarah_portal');
  await verifyDb('tamamgatemanarah_portal');

  await importDatabase('test_temam');
  await verifyDb('test_temam');

  console.log('\n🎉 Both databases have been successfully updated with the new SQL dump!');
}

main().catch(err => {
  console.error('❌ Failed:', err);
  process.exit(1);
});
