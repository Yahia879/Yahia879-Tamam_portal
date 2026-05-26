const mysql = require('mysql2/promise');
require('dotenv').config();
async function run() {
  const connection = await mysql.createConnection(process.env.DATABASE_URL);
  const [rows] = await connection.execute('SHOW VARIABLES LIKE "max_allowed_packet"');
  console.log('max_allowed_packet:', rows);
  const [cols] = await connection.execute('SHOW COLUMNS FROM progress_reports');
  console.log('Columns:', cols.filter(c => c.Field === 'photos' || c.Field === 'attachments'));
  process.exit(0);
}
run().catch(console.error);