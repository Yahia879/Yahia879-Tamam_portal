import mysql from 'mysql2/promise';

async function clearDb() {
  const connection = await mysql.createConnection('mysql://root:@localhost:3306/temam');
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

clearDb().catch(console.error);
