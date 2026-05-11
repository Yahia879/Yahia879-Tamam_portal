import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

const pool = mysql.createPool(process.env.DATABASE_URL);

async function checkNotifications() {
  try {
    const [columns] = await pool.query('SHOW COLUMNS FROM notifications');
    console.log('Notifications columns:', columns);
    await pool.end();
  } catch (error) {
    console.error('Error:', error.message);
  }
}

checkNotifications();
