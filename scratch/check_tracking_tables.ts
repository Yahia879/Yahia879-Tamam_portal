import mysql from 'mysql2/promise';
import * as dotenv from 'dotenv';
dotenv.config();

async function main() {
  const connection = await mysql.createConnection(process.env.DATABASE_URL);
  const [stageTables]: any = await connection.query("SHOW TABLES LIKE '%stage%'");
  const [reqTables]: any = await connection.query("SHOW TABLES LIKE '%request%'");
  console.log('Stage Tables:', stageTables);
  console.log('Request Tables:', reqTables);

  const [hist]: any = await connection.query('SELECT * FROM request_history ORDER BY id DESC LIMIT 10');
  console.log('Recent Request history:', hist);

  process.exit(0);
}
main();
