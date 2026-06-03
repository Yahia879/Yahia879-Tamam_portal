import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import * as schema from "../drizzle/schema.ts";
import { eq } from "drizzle-orm";
import * as dotenv from "dotenv";

dotenv.config();

async function checkUserPerms() {
  const connection = await mysql.createConnection(process.env.DATABASE_URL);
  const db = drizzle(connection, { schema, mode: 'default' });

    const pmUsers = await db.select({
      id: schema.users.id,
      name: schema.users.name,
      role: schema.users.role,
    }).from(schema.users).where(eq(schema.users.role, "project_manager"));

    console.log("Project Manager Users in DB:", pmUsers);
    
    for (const u of pmUsers) {
      console.log(`\n=========================================`);
      console.log(`User: ${u.name} (ID: ${u.id}, Role: ${u.role})`);
      const userPerms = await calculateUserPermissions(u.id);
      console.log("Has reports:", userPerms.includes("reports"));
      console.log("Has reports.view:", userPerms.includes("reports.view"));
      console.log("Has progress_reports:", userPerms.includes("progress_reports"));
    }
  } catch (err) {
    console.error(err);
  } finally {
    await connection.end();
  }
}

checkUserPerms().catch(console.error);
