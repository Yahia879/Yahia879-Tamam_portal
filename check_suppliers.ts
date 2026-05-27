import mysql from 'mysql2/promise';

async function main() {
  const connection = await mysql.createConnection({
    uri: 'mysql://root:@localhost:3306/temam',
  });
  try {
    const [rows]: any = await connection.execute('SELECT * FROM suppliers');
    console.log('Suppliers:', JSON.stringify(rows, null, 2));
  } catch(e: any) {
    console.error(e.message);
  }
  await connection.end();
}

main();
