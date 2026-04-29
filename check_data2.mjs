import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

const pool = mysql.createPool(process.env.DATABASE_URL);

async function checkData() {
  try {
    // التحقق من الطلبات
    const [requests] = await pool.query('SELECT COUNT(*) as total FROM mosque_requests');
    console.log('عدد الطلبات:', requests[0].total);
    
    // التحقق من عروض الأسعار
    const [quotations] = await pool.query('SELECT COUNT(*) as total FROM quotations');
    console.log('عدد عروض الأسعار:', quotations[0].total);
    
    // التحقق من جداول الكميات (الاسم الصحيح)
    const [qs] = await pool.query('SELECT COUNT(*) as total FROM quantity_schedules');
    console.log('عدد جداول الكميات:', qs[0].total);
    
    // عرض آخر 5 طلبات
    const [lastRequests] = await pool.query('SELECT id, requestNumber, status, currentStage FROM mosque_requests ORDER BY id DESC LIMIT 5');
    console.log('\nآخر 5 طلبات:');
    console.table(lastRequests);
    
    // عرض آخر 5 عروض أسعار
    const [lastQuotations] = await pool.query('SELECT id, quotationNumber, status, totalAmount FROM quotations ORDER BY id DESC LIMIT 5');
    console.log('\nآخر 5 عروض أسعار:');
    console.table(lastQuotations);
    
    await pool.end();
  } catch (error) {
    console.error('خطأ:', error.message);
  }
}

checkData();
