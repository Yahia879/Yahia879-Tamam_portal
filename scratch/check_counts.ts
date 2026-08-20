import mysql from 'mysql2/promise';
import * as dotenv from 'dotenv';
dotenv.config();

async function main() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    port: 3306
  });

  const [t1]: any = await connection.query('SELECT count(*) as count FROM `tamamgatemanarah_portal`.`mosque_requests`');
  console.log('tamamgatemanarah_portal mosque_requests count:', t1[0].count);

  const [t2]: any = await connection.query('SELECT count(*) as count FROM `tamamgatemanarah_portal`.`users`');
  console.log('tamamgatemanarah_portal users count:', t2[0].count);

  process.exit(0);
}

main().catch(console.error);
