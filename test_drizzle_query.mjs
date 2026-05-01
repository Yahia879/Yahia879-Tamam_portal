import 'dotenv/config';
import { drizzle } from 'drizzle-orm/mysql2';
import { users } from './drizzle/schema.js';
import { eq } from 'drizzle-orm';

async function testQuery() {
  try {
    const db = drizzle(process.env.DATABASE_URL);
    console.log('Testing query for admin@tamam.sa...');
    const result = await db.select().from(users).where(eq(users.email, 'admin@tamam.sa')).limit(1);
    console.log('Result:', result);
  } catch (error) {
    console.error('Query failed:', error);
  }
}

testQuery();
