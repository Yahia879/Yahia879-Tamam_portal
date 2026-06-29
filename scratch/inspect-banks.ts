import mysql from 'mysql2';
import dotenv from 'dotenv';
dotenv.config();

async function run() {
  const dbUrl = process.env.DATABASE_URL || "mysql://root:root@localhost:3306/tamam_portal";
  const connection = mysql.createConnection(dbUrl).promise();
  try {
    const [rows]: any = await connection.query(`
      SELECT id, name, nameAr, type, sortOrder, isActive
      FROM categories
      WHERE isActive = 1 AND type = 'bank'
      ORDER BY sortOrder ASC, id ASC
    `);
    
    console.log("Current Bank Categories in DB:", JSON.stringify(rows, null, 2));
  } catch (err) {
    console.error("Error executing query:", err);
  } finally {
    await connection.end();
  }
}

run();
