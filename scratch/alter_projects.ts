import * as dotenv from "dotenv";
dotenv.config();
import mysql from "mysql2/promise";

async function main() {
  const connection = await mysql.createConnection(process.env.DATABASE_URL!);

  console.log("Modifying projects.requestId to NULL...");
  await connection.query("ALTER TABLE projects MODIFY COLUMN requestId int(11) NULL DEFAULT NULL");
  console.log("Successfully modified projects.requestId to NULL");

  const [cols] = await connection.query<any[]>("DESCRIBE projects");
  console.log("Updated projects columns:");
  console.table(cols.map((c: any) => ({ Field: c.Field, Type: c.Type, Null: c.Null, Key: c.Key, Default: c.Default })));

  const [phaseCols] = await connection.query<any[]>("DESCRIBE project_phases");
  console.log("Project_phases columns:");
  console.table(phaseCols.map((c: any) => ({ Field: c.Field, Type: c.Type, Null: c.Null, Key: c.Key, Default: c.Default })));

  await connection.end();
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
