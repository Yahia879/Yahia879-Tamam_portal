import { getDb } from "./server/db.ts";

const db = await getDb();
const [rows] = await db.execute("DESCRIBE disbursement_requests");
console.log(rows.map(r => r.Field).join(", "));
process.exit(0);
