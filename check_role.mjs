import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

const pool = mysql.createPool(process.env.DATABASE_URL);

async function check() {
  try {
    // عرض المستخدم الأول (المدير)
    const [users] = await pool.query(`SELECT id, name, role, openId FROM users WHERE role = 'super_admin' LIMIT 5`);
    console.log('المدراء:');
    console.table(users);
    
    // التحقق من openId
    const [owner] = await pool.query(`SELECT id, name, role, openId FROM users WHERE openId = 'FcMdF5FEVvzcpdNgEXXMqy'`);
    console.log('\nالمستخدم بـ openId المحدد:');
    console.table(owner);
    
    await pool.end();
  } catch (error) {
    console.error('خطأ:', error.message);
  }
}

check();
