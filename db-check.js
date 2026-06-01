import { getDb } from "./server/db.js";
import { modules, permissions } from "./drizzle/schema.js";

async function main() {
  // Mock ENV variables or set them
  process.env.DATABASE_URL = "mysql://root:root@127.0.0.1:3306/tamam_portal"; // fallback
  // Wait, let's read it from .env or .env.development if it exists
  const db = await getDb();
  if (!db) {
    console.error("No DB connection");
    process.exit(1);
  }
  
  try {
    const modulesData = await db.select().from(modules);
    console.log("MODULES IN DB:", modulesData.map(m => m.id));
    
    const permissionsData = await db.select().from(permissions);
    console.log("PERMISSIONS IN DB:", permissionsData.map(p => p.id));
  } catch (err) {
    console.error("DB error:", err);
  }
  process.exit(0);
}

main();
