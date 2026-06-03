import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import * as schema from "../drizzle/schema.ts";
import { eq } from "drizzle-orm";
import * as dotenv from "dotenv";

dotenv.config();

const connection = await mysql.createConnection(process.env.DATABASE_URL);
const db = drizzle(connection, { schema, mode: 'default' });

async function updateDates() {
  console.log("🔄 Updating visit dates to June 2026...");
  
  await db.update(schema.fieldVisits).set({
    scheduledDate: new Date("2026-06-06T00:00:00.000Z")
  }).where(eq(schema.fieldVisits.id, 1));
  
  await db.update(schema.fieldVisits).set({
    scheduledDate: new Date("2026-06-09T00:00:00.000Z")
  }).where(eq(schema.fieldVisits.id, 2));
  
  await db.update(schema.fieldVisits).set({
    scheduledDate: new Date("2026-06-10T00:00:00.000Z")
  }).where(eq(schema.fieldVisits.id, 3));
  
  console.log("✅ Visit dates updated to June 2026!");
  
  await connection.end();
}

updateDates().catch(console.error);
