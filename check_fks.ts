import mysql from 'mysql2/promise';

async function main() {
  const connection = await mysql.createConnection({
    uri: 'mysql://root:@localhost:3306/temam',
  });
  try {
    const [rows]: any = await connection.execute(`
      SELECT 
        (SELECT COUNT(*) FROM projects WHERE id = 77) as proj_count,
        (SELECT COUNT(*) FROM mosque_requests WHERE id = 130) as req_count,
        (SELECT COUNT(*) FROM signatories WHERE id = 1) as sig_count,
        (SELECT COUNT(*) FROM suppliers WHERE id = 1) as sup_count
    `);
    console.log(JSON.stringify(rows, null, 2));
  } catch(e: any) {
    console.error(e.message);
  }
  await connection.end();
}

main();
