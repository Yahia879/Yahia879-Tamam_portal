import mysql from 'mysql2/promise';
import 'dotenv/config';

async function checkSchema() {
  const connection = await mysql.createConnection(process.env.DATABASE_URL);
  try {
    const [rows] = await connection.execute('DESCRIBE mosque_requests');
    console.log(JSON.stringify(rows, null, 2));
  } catch (error) {
    console.error('Error describing table:', error);
  } finally {
    await connection.end();
  }
}

checkSchema();
