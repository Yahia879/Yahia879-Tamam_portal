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

  const [t_tamam]: any = await connection.query('SHOW TABLES FROM `tamamgatemanarah_portal`');
  const [t_test]: any = await connection.query('SHOW TABLES FROM `test_temam`');
  console.log(`tamamgatemanarah_portal has ${t_tamam.length} tables.`);
  console.log(`test_temam has ${t_test.length} tables:`, t_test.map((t: any) => Object.values(t)[0]));

  process.exit(0);
}
main();
