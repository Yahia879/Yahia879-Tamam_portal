import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

const pool = mysql.createPool(process.env.DATABASE_URL);

async function test() {
  try {
    // اختبار الاستعلام بدون شروط (للمدير العام)
    const [requests] = await pool.query(`
      SELECT mr.id, mr.requestNumber, mr.status, mr.currentStage, m.name as mosqueName
      FROM mosque_requests mr
      LEFT JOIN mosques m ON mr.mosqueId = m.id
      ORDER BY mr.createdAt DESC
      LIMIT 10
    `);
    
    console.log('عدد الطلبات:', requests.length);
    console.log('الطلبات:');
    requests.forEach(r => {
      console.log(`  - ${r.id}: ${r.requestNumber} | ${r.mosqueName || 'بدون مسجد'} | ${r.status} | ${r.currentStage}`);
    });
    
    // التحقق من العدد الإجمالي
    const [count] = await pool.query('SELECT COUNT(*) as total FROM mosque_requests');
    console.log('\nالعدد الإجمالي:', count[0].total);
    
    await pool.end();
  } catch (error) {
    console.error('خطأ:', error.message);
  }
}

test();
