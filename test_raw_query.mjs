import mysql from 'mysql2/promise';
import 'dotenv/config';

async function testRawQuery() {
  const connection = await mysql.createConnection(process.env.DATABASE_URL);
  try {
    const query = 'select id, openId, email, passwordHash, name, phone, nationalId, role, status, loginMethod, city, requesterType, proofDocument, mosqueExemptions, createdAt, updatedAt, lastSignedIn from users where email = ? limit 1';
    console.log('Executing raw query...');
    const [rows] = await connection.execute(query, ['admin@tamam.sa']);
    console.log('Rows found:', rows.length);
  } catch (error) {
    console.error('RAW QUERY FAILED:', error);
  } finally {
    await connection.end();
  }
}

testRawQuery();
