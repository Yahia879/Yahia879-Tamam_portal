import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

const pool = mysql.createPool(process.env.DATABASE_URL);

async function test() {
  try {
    // اختبار الاستعلام الأساسي
    const [requests] = await pool.query(`
      SELECT mr.*, m.name as mosqueName, m.city as mosqueCity, u.name as requesterName
      FROM mosque_requests mr
      LEFT JOIN mosques m ON mr.mosqueId = m.id
      LEFT JOIN users u ON mr.userId = u.id
      ORDER BY mr.createdAt DESC
      LIMIT 10
    `);
    
    console.log('عدد الطلبات:', requests.length);
    console.log('الطلبات:');
    requests.forEach(r => {
      console.log(`- ${r.requestNumber} | ${r.mosqueName} | ${r.status}`);
    });
    
    await pool.end();
  } catch (error) {
    console.error('خطأ:', error.message);
  }
}

test();
