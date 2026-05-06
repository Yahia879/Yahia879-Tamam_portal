import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

const pool = mysql.createPool(process.env.DATABASE_URL);

async function check() {
  try {
    const [users] = await pool.query('SELECT id, email, name, role, passwordHash, status FROM users WHERE email = ?', ['admin@tamam.org']);
    console.log('Admin User:');
    console.table(users);
    
    if (users.length === 0) {
      console.log('User admin@tamam.org not found.');
    } else {
      console.log('Password hash present:', !!users[0].passwordHash);
      if (users[0].passwordHash) {
        console.log('Hash starts with:', users[0].passwordHash.substring(0, 10));
      }
    }
    
    await pool.end();
  } catch (error) {
    console.error('Error:', error.message);
  }
}

check();
