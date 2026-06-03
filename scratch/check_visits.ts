import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import * as schema from "../drizzle/schema.ts";
import * as dotenv from "dotenv";

dotenv.config();

const connection = await mysql.createConnection(process.env.DATABASE_URL);
const db = drizzle(connection, { schema, mode: 'default' });

async function checkVisits() {
  console.log("=== Users in Database ===");
  const users = await db.select({ id: schema.users.id, email: schema.users.email, name: schema.users.name, role: schema.users.role }).from(schema.users);
  console.table(users);

  console.log("=== Field Visits in Database ===");
  const visits = await db.select({
    id: schema.fieldVisits.id,
    requestId: schema.fieldVisits.requestId,
    scheduledDate: schema.fieldVisits.scheduledDate,
    assignedTo: schema.fieldVisits.assignedTo,
    status: schema.fieldVisits.status
  }).from(schema.fieldVisits);
  console.table(visits);
  
  await connection.end();
}

checkVisits().catch(console.error);
