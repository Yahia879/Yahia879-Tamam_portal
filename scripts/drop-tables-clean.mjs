import mysql from 'mysql2/promise';
import * as dotenv from 'dotenv';
dotenv.config();

async function dropAllTables() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error("DATABASE_URL is not set");
    process.exit(1);
  }

  const connection = await mysql.createConnection(connectionString);
  const [tables] = await connection.query('SHOW TABLES');
  
  await connection.query('SET FOREIGN_KEY_CHECKS = 0');
  for (const table of tables) {
    const tableName = table[Object.keys(table)[0]];
    console.log(`Dropping table ${tableName}`);
    await connection.query(`DROP TABLE IF EXISTS \`${tableName}\``);
  }
  await connection.query('SET FOREIGN_KEY_CHECKS = 1');
  
  await connection.end();
  console.log('Database cleared.');
}

dropAllTables().catch(console.error);
