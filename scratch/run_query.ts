import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import * as schema from "../drizzle/schema.ts";
import { and, eq, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/mysql-core";
import * as dotenv from "dotenv";

dotenv.config();

const connection = await mysql.createConnection(process.env.DATABASE_URL);
const db = drizzle(connection, { schema, mode: 'default' });

async function runQuery() {
  const userId = 3;
  const conditions = [sql`${schema.fieldVisits.scheduledDate} IS NOT NULL`];
  
  // Filter for view_own (User ID 3 has view_own)
  conditions.push(eq(schema.fieldVisits.assignedTo, userId));
  
  const assignedUser = alias(schema.users, 'assignedUser');
  const visits = await db.select({
    id: schema.mosqueRequests.id,
    requestNumber: schema.mosqueRequests.requestNumber,
    programType: schema.mosqueRequests.programType,
    currentStage: schema.mosqueRequests.currentStage,
    scheduledDate: schema.fieldVisits.scheduledDate,
    scheduledTime: schema.fieldVisits.scheduledTime,
    notes: schema.fieldVisits.scheduleNotes,
    assignedToId: schema.fieldVisits.assignedTo,
    fieldVisitId: schema.fieldVisits.id,
    fieldVisitStatus: schema.fieldVisits.status,
    mosqueId: schema.mosqueRequests.mosqueId,
    assignedToName: assignedUser.name,
  })
    .from(schema.fieldVisits)
    .innerJoin(schema.mosqueRequests, eq(schema.fieldVisits.requestId, schema.mosqueRequests.id))
    .leftJoin(assignedUser, eq(schema.fieldVisits.assignedTo, assignedUser.id))
    .where(and(...conditions))
    .orderBy(schema.fieldVisits.scheduledDate);

  console.log("Visits returned:", visits);
  
  await connection.end();
}

runQuery().catch(console.error);
