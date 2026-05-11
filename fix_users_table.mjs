import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

const pool = mysql.createPool(process.env.DATABASE_URL);

async function addDeletedAt() {
  try {
    await pool.query('ALTER TABLE users ADD COLUMN deletedAt timestamp NULL DEFAULT NULL');
    console.log('✅ Successfully added deletedAt column to users table');
    await pool.end();
  } catch (error) {
    console.error('❌ Failed to add column:', error.message);
    process.exit(1);
  }
}

addDeletedAt();
