import { getDb } from "./server/db.js";
import { mosqueRequests } from "./drizzle/schema.js";
import { eq } from "drizzle-orm";

async function checkRequest(id) {
  try {
    const db = await getDb();
    const result = await db.select().from(mosqueRequests).where(eq(mosqueRequests.id, id));
    console.log(JSON.stringify(result[0], null, 2));
  } catch (e) {
    console.error(e);
  }
  process.exit(0);
}

checkRequest(14);
