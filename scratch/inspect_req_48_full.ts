import mysql from 'mysql2/promise';
import * as dotenv from 'dotenv';

dotenv.config();

async function inspectReq48() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    port: 3306,
  });

  for (const dbName of ['tamamgatemanarah_portal', 'test_temam']) {
    console.log(`\n================= DB [${dbName}] Request 48 =================`);
    const [rows]: any = await connection.query(`
      SELECT * FROM \`${dbName}\`.mosque_requests WHERE id = 48
    `);
    console.log(rows[0]);

    if (rows[0]) {
      const [tracking]: any = await connection.query(`
        SELECT * FROM \`${dbName}\`.request_stage_tracking WHERE requestId = 48
      `);
      console.log('Stage tracking:', tracking);

      const [projs]: any = await connection.query(`
        SELECT * FROM \`${dbName}\`.projects WHERE requestId = 48
      `);
      console.log('Projects:', projs);
    }
  }

  process.exit(0);
}

inspectReq48().catch(console.error);
