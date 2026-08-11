import dotenv from "dotenv";
dotenv.config();
import mysql from "mysql2/promise";

async function testSearchReq21() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) return;
  const conn = await mysql.createConnection(dbUrl);

  const [rows] = await conn.query(`
    SELECT r.id, r.requestNumber, r.programType, r.mosqueId, r.userId, r.descriptiveName, u.name as requesterName
    FROM mosque_requests r
    LEFT JOIN users u ON r.userId = u.id
    WHERE r.id = 21
  `);

  console.log("Req 21 DB query result:", rows);
  await conn.end();
}

testSearchReq21().catch(console.error);
