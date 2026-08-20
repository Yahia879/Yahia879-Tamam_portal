import * as dotenv from "dotenv";
dotenv.config();
import mysql from "mysql2/promise";

async function main() {
  const connection = await mysql.createConnection(process.env.DATABASE_URL!);
  const [progs] = await connection.query<any[]>("SELECT id, name, requiresMosque FROM programs");
  console.log("Programs:", progs);
  await connection.end();
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
