import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

const pool = mysql.createPool(process.env.DATABASE_URL);

async function check() {
  try {
    const [users] = await pool.query('SELECT * FROM users WHERE role = "super_admin"');
    console.log('Super Admin Users:');
    console.table(users);
    await pool.end();
  } catch (error) {
    console.error('Error:', error.message);
  }
}

check();
