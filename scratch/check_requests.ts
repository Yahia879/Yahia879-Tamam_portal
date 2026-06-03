import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import * as schema from "../drizzle/schema.ts";
import * as dotenv from "dotenv";

dotenv.config();

const connection = await mysql.createConnection(process.env.DATABASE_URL);
const db = drizzle(connection, { schema, mode: 'default' });

async function checkRequests() {
  console.log("=== Mosque Requests in Database ===");
  const requests = await db.select({ id: schema.mosqueRequests.id, requestNumber: schema.mosqueRequests.requestNumber }).from(schema.mosqueRequests);
  console.table(requests);
  
  await connection.end();
}

checkRequests().catch(console.error);
