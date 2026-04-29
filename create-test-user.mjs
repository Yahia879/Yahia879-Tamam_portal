import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';

const connection = await mysql.createConnection(process.env.DATABASE_URL);
const db = drizzle(connection);

const passwordHash = bcrypt.hashSync('test123', 10);

await connection.query(`
  INSERT INTO users (openId, email, passwordHash, name, phone, role, status, loginMethod)
  VALUES ('test_manager_001', 'test@tamam.org', ?, 'مدير اختبار', '0501234567', 'projects_office', 'active', 'password')
  ON DUPLICATE KEY UPDATE passwordHash = VALUES(passwordHash), status = 'active'
`, [passwordHash]);

console.log('✅ تم إنشاء/تحديث المستخدم: test@tamam.org / test123');
await connection.end();
