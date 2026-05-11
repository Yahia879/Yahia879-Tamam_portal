import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

const pool = mysql.createPool(process.env.DATABASE_URL);

async function checkUsersColumns() {
  try {
    const [columns] = await pool.query(`SHOW COLUMNS FROM users`);
    
    console.log('Columns in users table:');
    columns.forEach(c => {
      console.log(`  - ${c.Field}: ${c.Type}`);
    });
    
    await pool.end();
  } catch (error) {
    console.error('Error:', error.message);
  }
}

checkUsersColumns();
