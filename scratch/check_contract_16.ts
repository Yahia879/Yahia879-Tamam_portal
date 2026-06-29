import "dotenv/config";
import { getDb } from "../server/db";
import { contractClauses } from "../drizzle/schema";
import { eq } from "drizzle-orm";

async function main() {
  const db = await getDb();
  if (!db) {
    console.error("Database connection failed");
    return;
  }
  const clauses = await db
    .select()
    .from(contractClauses)
    .where(eq(contractClauses.templateId, 4));
  console.log("Clauses for Template 4:", JSON.stringify(clauses, null, 2));
}

main().catch(console.error);
