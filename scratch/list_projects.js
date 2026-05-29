import "dotenv/config";
import { getDb } from "../server/db.ts";
import { projects } from "../drizzle/schema.ts";

async function run() {
  const db = await getDb();
  if (!db) {
    console.error("DB not available");
    return;
  }
  const allProjects = await db.select().from(projects);
  console.log("Projects:", JSON.stringify(allProjects, null, 2));
  process.exit(0);
}

run().catch(console.error);
