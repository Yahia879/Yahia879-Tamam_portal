const mysql = require('mysql2/promise');
require('dotenv').config();
async function run() {
  const connection = await mysql.createConnection(process.env.DATABASE_URL);
  try {
    await connection.query('SET GLOBAL max_allowed_packet=67108864');
    console.log('Successfully set max_allowed_packet to 64MB');
  } catch (e) {
    console.error('Failed to set GLOBAL max_allowed_packet:', e.message);
  }
  process.exit(0);
}
run().catch(console.error);