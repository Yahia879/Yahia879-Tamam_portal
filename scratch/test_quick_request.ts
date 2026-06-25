import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import * as schema from "../drizzle/schema.ts";
import * as dotenv from "dotenv";

dotenv.config();

async function main() {
  const connection = await mysql.createConnection(process.env.DATABASE_URL!);
  const db = drizzle(connection, { schema, mode: 'default' });

  console.log("=== Querying Mosque Requests ===");
  const requests = await db
    .select({
      id: schema.mosqueRequests.id,
      requestNumber: schema.mosqueRequests.requestNumber,
      mosqueId: schema.mosqueRequests.mosqueId,
      programData: schema.mosqueRequests.programData,
    })
    .from(schema.mosqueRequests)
    .orderBy(schema.mosqueRequests.createdAt);

  console.log("All Requests:");
  console.log(JSON.stringify(requests, null, 2));

  await connection.end();
}

main().catch(console.error);
