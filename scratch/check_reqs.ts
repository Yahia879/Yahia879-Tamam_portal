import * as dotenv from "dotenv";
dotenv.config();
import mysql from "mysql2/promise";

async function main() {
  const connection = await mysql.createConnection(process.env.DATABASE_URL!);
  
  const [requests] = await connection.query<any[]>(
    "SELECT id, requestNumber, currentStage, status, isEvaluated, satisfactionRating, userId FROM mosque_requests ORDER BY id DESC LIMIT 5"
  );
  
  console.log("Recent requests:", requests);
  await connection.end();
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
