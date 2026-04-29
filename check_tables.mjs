import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

const pool = mysql.createPool(process.env.DATABASE_URL);

async function checkTables() {
  try {
    const [tables] = await pool.query('SHOW TABLES');
    console.log('الجداول الموجودة:');
    tables.forEach(t => console.log('-', Object.values(t)[0]));
    await pool.end();
  } catch (error) {
    console.error('خطأ:', error.message);
  }
}

checkTables();
