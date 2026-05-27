import mysql from 'mysql2/promise';

async function main() {
  const connection = await mysql.createConnection({
    uri: 'mysql://root:@localhost:3306/temam',
  });
  try {
    console.log('Adding customClausesJson column to contracts_enhanced...');
    await connection.execute('ALTER TABLE contracts_enhanced ADD COLUMN customClausesJson json');
    console.log('Successfully added customClausesJson');
  } catch(e: any) {
    console.error('Error adding column:', e.message);
  }
  await connection.end();
}

main();
