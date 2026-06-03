import dotenv from "dotenv";
dotenv.config();

import { getDb } from "../server/db";
import { users } from "../drizzle/schema";

async function main() {
  const db = await getDb();
  if (!db) {
    console.error("No DB connection");
    process.exit(1);
  }

  try {
    const list = await db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        role: users.role,
      })
      .from(users);

    console.log("All users in DB:");
    for (const item of list) {
      console.log(`ID: ${item.id} | Name: ${item.name} | Email: ${item.email} | Role: ${item.role}`);
    }
  } catch (err) {
    console.error("DB error:", err);
  }
  process.exit(0);
}

main();
