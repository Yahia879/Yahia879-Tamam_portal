import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

const pool = mysql.createPool(process.env.DATABASE_URL);

async function check() {
  try {
    // عرض جميع المستخدمين وأدوارهم
    const [users] = await pool.query('SELECT id, name, role, openId FROM users LIMIT 10');
    console.log('المستخدمين:');
    console.table(users);
    
    // عرض الطلبات مع userId
    const [requests] = await pool.query('SELECT id, requestNumber, userId, status FROM mosque_requests');
    console.log('\nالطلبات:');
    console.table(requests);
    
    await pool.end();
  } catch (error) {
    console.error('خطأ:', error.message);
  }
}

check();
