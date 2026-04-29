import mysql from 'mysql2/promise';

async function checkColumns() {
  const connection = await mysql.createConnection(process.env.DATABASE_URL);
  
  try {
    const [columns] = await connection.execute(`DESCRIBE contracts_enhanced`);
    console.log('Columns in contracts_enhanced:');
    columns.forEach(col => console.log(`  - ${col.Field}: ${col.Type} ${col.Null === 'YES' ? '(nullable)' : '(required)'}`));
  } catch (error) {
    console.error('Error:', error.message);
  }
  
  await connection.end();
}

checkColumns();
