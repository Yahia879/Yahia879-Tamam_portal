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

  const [dbs]: any = await connection.query('SHOW DATABASES');
  console.log('All MySQL Databases:', dbs.map((d: any) => d.Database));

  for (const d of dbs) {
    const dbName = d.Database;
    if (['information_schema', 'performance_schema', 'mysql', 'sys'].includes(dbName)) continue;
    const [tables]: any = await connection.query(`SHOW TABLES FROM \`${dbName}\``);
    console.log(`DB [${dbName}] has ${tables.length} tables:`, tables.slice(0, 10).map((t: any) => Object.values(t)[0]));
  }

  process.exit(0);
}

main().catch(console.error);
