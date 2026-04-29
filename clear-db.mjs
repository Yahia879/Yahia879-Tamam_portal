import mysql from 'mysql2/promise';

async function clearDatabase() {
  const url = 'mysql://root:@localhost:3306/temam';
  console.log(`Clearing database: ${url}`);
  
  try {
    const connection = await mysql.createConnection(url);
    const [rows] = await connection.query('SHOW TABLES');
    
    await connection.query('SET FOREIGN_KEY_CHECKS = 0');
    
    for (const row of rows) {
      const tableName = Object.values(row)[0];
      console.log(`Dropping table: ${tableName}`);
      await connection.query(`DROP TABLE \`${tableName}\``);
    }
    
    await connection.query('SET FOREIGN_KEY_CHECKS = 1');
    console.log('✅ Database cleared!');
    await connection.end();
  } catch (error) {
    console.error('❌ Failed to clear database:', error.message);
  }
}

clearDatabase();
