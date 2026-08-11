import dotenv from "dotenv";
dotenv.config();
import mysql from "mysql2/promise";

async function inspectReq21() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) return;
  const conn = await mysql.createConnection(dbUrl);
  const [rows] = await conn.query("SELECT id, requestNumber, currentStage, status, programType FROM mosque_requests WHERE id = 21");
  console.log("Request 21 data:", rows);
  await conn.end();
}

inspectReq21().catch(console.error);
