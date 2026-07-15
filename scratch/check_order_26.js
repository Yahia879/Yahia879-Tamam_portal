import mysql from "mysql2/promise";
import * as dotenv from "dotenv";
dotenv.config();

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is not defined");
    return;
  }
  const connection = await mysql.createConnection(process.env.DATABASE_URL);
  const [orders] = await connection.query("SELECT * FROM disbursement_orders WHERE id = 26");
  console.log("Order 26:", orders[0]);
  if (orders[0]) {
    const [requests] = await connection.query("SELECT * FROM disbursement_requests WHERE id = ?", [orders[0].disbursementRequestId]);
    console.log("Request of Order 26:", requests[0]);
  }
  await connection.end();
}
main().catch(console.error);
