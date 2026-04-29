import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import { users } from './drizzle/schema.ts';
import { eq } from 'drizzle-orm';
import { pbkdf2Sync, randomBytes } from 'crypto';

const connection = await mysql.createConnection(process.env.DATABASE_URL);
const db = drizzle(connection);

// تشفير كلمة المرور
const password = 'Admin@123456';
const salt = randomBytes(16).toString('hex');
const hash = pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
const passwordHash = `${salt}:${hash}`;

// تحديث كلمة المرور
await db.update(users)
  .set({ passwordHash, status: 'active' })
  .where(eq(users.email, 'admin@tamam.sa'));

console.log('✅ تم إعادة تعيين كلمة مرور حساب المدير بنجاح!');
console.log('البريد: admin@tamam.sa');
console.log('كلمة المرور: Admin@123456');

await connection.end();
