import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

const pool = mysql.createPool(process.env.DATABASE_URL);

async function checkAdmin() {
  try {
    const [rows] = await pool.query('SELECT * FROM users WHERE email = ?', ['admin@tamam.org']);
    console.log('Admin user:', rows);
    await pool.end();
  } catch (error) {
    console.error('Error:', error.message);
  }
}

checkAdmin();
