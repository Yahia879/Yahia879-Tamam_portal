import * as dotenv from "dotenv";
dotenv.config();
import mysql from "mysql2/promise";

async function main() {
  const connection = await mysql.createConnection(process.env.DATABASE_URL!);

  // Check the last requests and projects
  const [lastReqs] = await connection.query<any[]>(
    "SELECT id, requestNumber, descriptiveName, currentStage, status, createdAt FROM mosque_requests ORDER BY id DESC LIMIT 3"
  );
  console.log("Last 3 requests in DB:", lastReqs);

  await connection.end();
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
