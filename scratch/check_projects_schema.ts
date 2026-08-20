import * as dotenv from "dotenv";
dotenv.config();
import mysql from "mysql2/promise";

async function main() {
  const connection = await mysql.createConnection(process.env.DATABASE_URL!);

  const [cols] = await connection.query<any[]>("DESCRIBE projects");
  console.log("Projects columns:");
  console.table(cols.map((c: any) => ({ Field: c.Field, Type: c.Type, Null: c.Null, Key: c.Key, Default: c.Default })));

  const [mCols] = await connection.query<any[]>("DESCRIBE project_mosques");
  console.log("Project_mosques columns:");
  console.table(mCols.map((c: any) => ({ Field: c.Field, Type: c.Type, Null: c.Null, Key: c.Key, Default: c.Default })));

  await connection.end();
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
