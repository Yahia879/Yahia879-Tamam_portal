import { getDb } from "./server/db.ts";

const db = await getDb();
const [rows] = await db.execute("DESCRIBE contracts");
console.log(rows);
process.exit(0);
