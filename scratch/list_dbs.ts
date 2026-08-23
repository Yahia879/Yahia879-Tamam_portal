import mysql from 'mysql2/promise';
import * as dotenv from 'dotenv';
dotenv.config();

async function main() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    port: Number(process.env.DB_PORT) || 3306,
  });

  const [dbs]: any = await connection.query('SHOW DATABASES');
  console.log("Databases on MySQL server:", dbs.map((d: any) => Object.values(d)[0]));
  await connection.end();
}

main().catch(console.error);
