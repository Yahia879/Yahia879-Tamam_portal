import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

const pool = mysql.createPool(process.env.DATABASE_URL);

async function check() {
  try {
    const [qs] = await pool.query('SELECT COUNT(*) as total FROM quantity_schedules');
    console.log('عدد جداول الكميات:', qs[0].total);
    
    const [items] = await pool.query('SELECT * FROM quantity_schedules LIMIT 5');
    console.log('\nبنود جداول الكميات:');
    console.table(items);
    
    await pool.end();
  } catch (error) {
    console.error('خطأ:', error.message);
  }
}

check();
