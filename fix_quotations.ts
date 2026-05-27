import mysql from 'mysql2/promise';

async function main() {
  const connection = await mysql.createConnection({
    uri: 'mysql://root:@localhost:3306/temam',
  });
  try {
    console.log('Disabling FK checks and dropping suppliers...');
    await connection.execute('SET FOREIGN_KEY_CHECKS=0');
    await connection.execute('DROP TABLE IF EXISTS suppliers');
    await connection.execute('SET FOREIGN_KEY_CHECKS=1');
    console.log('Successfully dropped suppliers');
  } catch(e: any) {
    console.error(e.message);
  }
  await connection.end();
}

main();
