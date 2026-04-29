import mysql from 'mysql2/promise';

async function testConnection() {
  const url = 'mysql://root:@localhost:3306/temam';
  console.log(`Attempting to connect to: ${url}`);
  
  try {
    const connection = await mysql.createConnection(url);
    console.log('✅ Connection successful!');
    await connection.end();
  } catch (error) {
    console.error('❌ Connection failed:');
    console.error(error.message);
    if (error.code === 'ECONNREFUSED') {
      console.error('\nHint: It looks like no MySQL server is running on localhost:3306.');
    } else if (error.code === 'ER_BAD_DB_ERROR') {
      console.error('\nHint: The server is running, but the database "temam" does not exist.');
    }
  }
}

testConnection();
