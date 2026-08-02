const mysql = require('mysql2/promise');
require('dotenv').config();

async function run() {
  const connection = await mysql.createConnection(process.env.DATABASE_URL || 'mysql://root:@localhost:3306/test_temam');
  
  const [vouchers] = await connection.execute('SELECT * FROM receipt_vouchers WHERE projectId = 15');
  console.log('Receipt Vouchers for Project 15:');
  console.log(vouchers);

  await connection.end();
}

run().catch(console.error);
