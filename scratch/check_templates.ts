import "dotenv/config";
import { getDb } from "../server/db";
import { contractTemplates, contractClauses } from "../drizzle/schema";
import { sql } from "drizzle-orm";

async function main() {
  const db = await getDb();
  if (!db) {
    console.error("Database connection failed");
    return;
  }
  const templates = await db.select().from(contractTemplates);
  console.log("Templates:");
  for (const t of templates) {
    const [countRes] = await db
      .select({ count: sql<number>`count(*)` })
      .from(contractClauses)
      .where(eq(contractClauses.templateId, t.id));
    console.log(`- Template ID ${t.id}: "${t.name}" (Type: ${t.type}) - Clauses count: ${countRes.count}`);
  }
}

import { eq } from "drizzle-orm";
main().catch(console.error);
