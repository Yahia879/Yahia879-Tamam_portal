import mysql from 'mysql2/promise';

async function main() {
  const connection = await mysql.createConnection({
    uri: 'mysql://root:@localhost:3306/temam',
  });
  try {
    console.log('Adding customClausesJson column...');
    await connection.execute(`ALTER TABLE contracts_enhanced ADD COLUMN customClausesJson JSON;`);
    console.log('Column customClausesJson added successfully.');
  } catch (err: any) {
    if (err.code === 'ER_DUP_FIELDNAME') {
      console.log('Column already exists!');
      
      // Let's modify it to JSON if it was TEXT
      try {
        await connection.execute(`ALTER TABLE contracts_enhanced MODIFY COLUMN customClausesJson JSON;`);
        console.log('Column modified to JSON.');
      } catch (e: any) {
        console.log('Error modifying column:', e.message);
      }
    } else {
      console.error('Error adding column:', err.message);
    }
  }
  await connection.end();
}

main();
