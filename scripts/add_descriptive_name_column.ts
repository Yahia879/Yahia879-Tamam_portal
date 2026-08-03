import mysql from 'mysql2/promise';

async function main() {
  const connection = await mysql.createConnection(process.env.DATABASE_URL || 'mysql://root:@localhost:3306/temam');
  console.log('Connected to MySQL DB');

  try {
    await connection.execute(`ALTER TABLE mosque_requests ADD COLUMN descriptiveName VARCHAR(255) NULL AFTER programData;`);
    console.log('Successfully added descriptiveName column to mosque_requests table.');
  } catch (err: any) {
    if (err.code === 'ER_DUP_FIELDNAME') {
      console.log('Column descriptiveName already exists in mosque_requests table.');
    } else {
      console.error('Error adding column:', err);
    }
  }

  await connection.end();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
