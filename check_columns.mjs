import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

const pool = mysql.createPool(process.env.DATABASE_URL);

async function test() {
  try {
    const [columns] = await pool.query(`
      SHOW COLUMNS FROM mosque_requests WHERE Field LIKE 'fieldVisit%'
    `);
    
    console.log('الأعمدة الموجودة للزيارة الميدانية:');
    columns.forEach(c => {
      console.log(`  - ${c.Field}: ${c.Type}`);
    });
    
    await pool.end();
  } catch (error) {
    console.error('خطأ:', error.message);
  }
}

test();
