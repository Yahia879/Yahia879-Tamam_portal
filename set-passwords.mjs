import 'dotenv/config';
import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import { users } from './drizzle/schema.ts';
import { eq } from 'drizzle-orm';
import { pbkdf2Sync, randomBytes } from 'crypto';

async function run() {
    const connection = await mysql.createConnection(process.env.DATABASE_URL);
    const db = drizzle(connection);

    // تشفير كلمة المرور
    const password = 'Admin@123456';
    const salt = randomBytes(16).toString('hex');
    const hash = pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
    const passwordHash = `${salt}:${hash}`;

    // تحديث كلمة المرور لجميع مستخدمي seed
    const emails = [
        'admin@tamam.org',
        'projects@tamam.org',
        'field@tamam.org',
        'finance@tamam.org',
        'requester1@test.com'
    ];

    for (const email of emails) {
        await db.update(users)
            .set({ passwordHash, status: 'active' })
            .where(eq(users.email, email));
        console.log(`✅ Set password for: ${email}`);
    }

    console.log('\nPassword for all accounts: Admin@123456');
    await connection.end();
}

run().catch(console.error);
