import mysql from 'mysql2/promise';

async function main() {
  const connection = await mysql.createConnection({
    uri: 'mysql://root:@localhost:3306/temam',
  });
  try {
    console.log('Cleaning up test data...');
    await connection.execute('DELETE FROM contracts_enhanced WHERE contractNumber = "CNT-2026-0057" AND contractTitle = "yfsksdjf@gmail.com"');
    console.log('Successfully cleaned up test data');
  } catch(e: any) {
    console.error('Error:', e.message);
  }
  await connection.end();
}

main();
