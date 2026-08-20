import * as dotenv from "dotenv";
dotenv.config();
import mysql from "mysql2/promise";

async function main() {
  const connection = await mysql.createConnection(process.env.DATABASE_URL!);

  // Update existing requests linked to multi-mosque projects to set descriptiveName = NULL
  const [res] = await connection.query<any>(
    `UPDATE mosque_requests mr 
     JOIN projects p ON mr.id = p.requestId 
     SET mr.descriptiveName = NULL 
     WHERE p.isMultiMosque = 1`
  );
  console.log("Updated multi-mosque requests descriptiveName to NULL, changed rows:", res.changedRows);

  await connection.end();
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
